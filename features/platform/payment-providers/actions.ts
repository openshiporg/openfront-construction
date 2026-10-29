'use server';

import { platformClient, refusal } from "@/features/platform/lib/platform-client";
import type { CommandState } from "@/features/platform/projects/action-state";

const value = (data: FormData, name: string) => String(data.get(name) ?? "").trim();

export async function installStripeProviderAction(_previous: CommandState, data: FormData): Promise<CommandState> {
  const response = await platformClient<{ installStripePaymentProvider: { configured: boolean } }>(`mutation InstallStripe($companyId: ID!) { installStripePaymentProvider(companyId: $companyId) { id isInstalled configured } }`, { companyId: value(data, "companyId") });
  if (!response.success) return { status: "error", message: refusal(response, "Provider not added") };
  return { status: "success", message: response.data.installStripePaymentProvider.configured ? "Stripe added" : "Stripe added. Set the Stripe keys on the server to start taking payments." };
}

export async function toggleProviderAction(_previous: CommandState, data: FormData): Promise<CommandState> {
  const response = await platformClient(`mutation ToggleProvider($providerId: ID!, $isInstalled: Boolean!) { setPaymentProviderInstalled(providerId: $providerId, isInstalled: $isInstalled) { id isInstalled configured } }`, { providerId: value(data, "providerId"), isInstalled: value(data, "isInstalled") === "true" });
  return response.success ? { status: "success", message: "Provider updated" } : { status: "error", message: refusal(response, "Provider not updated") };
}
