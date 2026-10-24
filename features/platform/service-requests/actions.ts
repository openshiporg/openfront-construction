"use server";

import { revalidatePath } from "next/cache";
import { platformClient } from "@/features/platform/lib/platform-client";
import { amountToMinorUnits } from "@/features/platform/projects/money";

export type OperatorRequestState = { status: "idle" | "success" | "error"; message: string };
const value = (data: FormData, name: string) => String(data.get(name) || "").trim();

/** Operator quote and cancel commands; the same authorized Keystone command the
 * customer account uses, with operator wording and no customer redirects. */
export async function operatorRequestAction(_state: OperatorRequestState, data: FormData): Promise<OperatorRequestState> {
  const operation = value(data, "operation");
  if (operation !== "quote" && operation !== "cancel") return { status: "error", message: "Unsupported action." };
  const input = {
    operation, id: value(data, "id"), serviceSlug: null, scope: null,
    expectedVersion: Number(value(data, "version")), idempotencyKey: value(data, "idempotencyKey"),
    amountMinor: null as string | null, terms: value(data, "terms") || null, expiresAt: null as string | null,
  };
  if (operation === "quote") {
    try {
      input.amountMinor = amountToMinorUnits(value(data, "amount"));
      const expiry = new Date(value(data, "expiresAt"));
      if (Number.isNaN(expiry.getTime())) throw new Error("expiry");
      input.expiresAt = expiry.toISOString();
    } catch { return { status: "error", message: "Enter a valid amount and quote expiry." }; }
  }
  const result = await platformClient<{ commandConstructionRequest: { id: string } }>(`mutation OperatorRequestCommand($input: ServiceRequestInput!) { commandConstructionRequest(input: $input) { id } }`, { input });
  if (!result.success) return { status: "error", message: "The request changed or could not be saved. Reload to see its current status." };
  revalidatePath("/dashboard/platform/service-requests");
  return { status: "success", message: operation === "quote" ? "Quote saved." : "Request cancelled." };
}
