export function isPaymentProviderConfigured(code: string): boolean {
  if (code.startsWith("pp_stripe")) return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
  if (code.startsWith("pp_paypal")) return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
  return false;
}
export function getPublicPaymentProviderConfig(code: string) {
  if (code.startsWith("pp_stripe")) return { provider: "stripe" as const, publishableKey: process.env.NEXT_PUBLIC_STRIPE_KEY || "" };
  return null;
}
