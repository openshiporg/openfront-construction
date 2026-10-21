"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { keystoneClient } from "@/features/dashboard/lib/keystoneClient";
import { resetPassword, signIn } from "@/features/dashboard/actions/auth";
import { removeAuthToken } from "@/features/dashboard/lib/cookies";
import { amountToMinorUnits } from "@/features/platform/projects/money";
import { customerContinuation } from "./continuation";

export type AccountState = { message: string };
export type ResetState = { message: string; success: boolean };
const value = (data: FormData, name: string) => String(data.get(name) || "").trim();
const canonicalEmail = (data: FormData) => value(data, "email").toLowerCase();

export async function customerAuthAction(_state: AccountState, data: FormData): Promise<AccountState> {
  const slug = value(data, "service");
  const fallback = slug && /^[a-z0-9-]+$/.test(slug) ? `/account?service=${encodeURIComponent(slug)}` : "/account";
  // Registration persists the canonical identity; immediate sign-in must use it too.
  data.set("email", canonicalEmail(data));
  data.set("from", customerContinuation(value(data, "from"), fallback));
  if (value(data, "mode") === "signup") {
    const registered = await keystoneClient<{ registerConstructionCustomer: { success: boolean } }>(`mutation RegisterCustomer($name: String!, $email: String!, $password: String!) { registerConstructionCustomer(name: $name, email: $email, password: $password) { success } }`,
      { name: value(data, "name"), email: value(data, "email"), password: String(data.get("password") || "") });
    if (!registered.success) return { message: "Account could not be created. Check your details or sign in to an existing account." };
  }
  // Redirect is outside any catch: successful Next redirects are not errors.
  const signed = await signIn({ message: null, formData: { email: "", password: "" } }, data);
  return { message: signed?.message || "Sign in failed" };
}

export async function customerSignOut(data?: FormData) {
  await keystoneClient("mutation { endSession }");
  await removeAuthToken();
  revalidatePath("/", "layout");
  const from = data ? customerContinuation(value(data, "from"), "") : "";
  redirect(from ? `/account?from=${encodeURIComponent(from)}` : "/account");
}

export async function customerResetRequestAction(_state: ResetState, data: FormData): Promise<ResetState> {
  data.set("email", canonicalEmail(data));
  const result = await resetPassword({ message: null, success: null, formData: { email: "" } }, data, "request");
  // The same answer for known and unknown addresses.
  return "success" in result && result.success
    ? { success: true, message: "If an account uses that email, a reset link is on its way." }
    : { success: false, message: "Reset email could not be sent. Try again or contact the contractor." };
}

export async function customerResetAction(_state: ResetState, data: FormData): Promise<ResetState> {
  data.set("email", canonicalEmail(data));
  if (String(data.get("password") || "") !== String(data.get("confirmPassword") || "")) return { success: false, message: "Passwords do not match." };
  const result = await resetPassword({ message: null, success: null, formData: { email: "" } }, data, "reset");
  return "success" in result && result.success
    ? { success: true, message: "Password updated. Sign in with your new password." }
    : { success: false, message: "This reset link is invalid or has expired. Request a new one." };
}

export async function customerProfileAction(_state: AccountState, data: FormData): Promise<AccountState> {
  const user = await keystoneClient<{ authenticatedItem: { id: string } | null }>(`query CustomerSession { authenticatedItem { ... on User { id } } }`);
  const id = user.success ? user.data.authenticatedItem?.id : null;
  if (!id) return { message: "Sign in to update your details." };
  const name = value(data, "name");
  const email = canonicalEmail(data);
  const phone = value(data, "phone");
  if (!name || name.length > 200) return { message: "Enter your name (up to 200 characters)." };
  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { message: "Enter a valid email address." };
  if (phone.length > 50) return { message: "Phone must be 50 characters or fewer." };
  // Only these personal fields are sent; the subject is the signed-in account.
  const result = await keystoneClient(`mutation UpdateCustomerProfile($id: ID!, $data: UserUpdateInput!) { updateUser(where: { id: $id }, data: $data) { id } }`,
    { id, data: { name, email, phone } });
  if (!result.success) return { message: "Details could not be saved. That email may already be in use." };
  revalidatePath("/account", "layout");
  return { message: "Details saved" };
}

export async function customerRequestAction(_state: AccountState, data: FormData): Promise<AccountState> {
  const operation = value(data, "operation");
  const input = {
    operation, id: value(data, "id") || null, serviceSlug: value(data, "serviceSlug") || null,
    scope: value(data, "scope") || null, expectedVersion: data.has("version") ? Number(value(data, "version")) : null,
    idempotencyKey: value(data, "idempotencyKey"), amountMinor: null as string | null,
    terms: value(data, "terms") || null, expiresAt: null as string | null,
  };
  if (operation === "quote") {
    try {
      input.amountMinor = amountToMinorUnits(value(data, "amount"));
      const expiry = value(data, "expiresAt");
      input.expiresAt = new Date(`${expiry}Z`).toISOString();
    } catch { return { message: "Enter a valid amount and quote expiry." }; }
  }
  const result = await keystoneClient<{ commandConstructionRequest: { id: string } }>(`mutation RequestCommand($input: ServiceRequestInput!) { commandConstructionRequest(input: $input) { id } }`, { input });
  if (!result.success) {
    return { message: operation === "accept"
      ? "This quote can no longer be accepted. Reload to see its current status, or contact the contractor for an updated quote."
      : "Request could not be saved. Reload to review its current status and terms." };
  }
  revalidatePath("/account", "layout");
  revalidatePath("/dashboard/platform/service-requests");
  if (operation === "request" || operation === "accept") redirect(`/account/requests/${result.data.commandConstructionRequest.id}`);
  return { message: "Saved" };
}
