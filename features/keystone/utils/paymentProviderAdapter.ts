import { paymentProviderAdapters } from "../../integrations/payment";
const OPERATIONS = new Set(["createPaymentFunction", "capturePaymentFunction", "refundPaymentFunction", "getPaymentStatusFunction", "generatePaymentLinkFunction", "handleWebhookFunction"]);
const REGISTRY = new Set(Object.keys(paymentProviderAdapters));

export async function executeAdapterFunction({ provider, functionName, args }: { provider: any; functionName: string; args: any }) {
  if (!OPERATIONS.has(functionName)) throw new Error("Unknown payment adapter operation");
  const key = provider?.[functionName];
  if (typeof key !== "string") throw new Error("Payment adapter is not configured");
  const input = { ...args, provider: { id: provider.id, code: provider.code, credentials: provider.credentials || {} } };
  if (/^https:/i.test(key)) {
    const response = await fetch(key, { method: "POST", redirect: "error", signal: AbortSignal.timeout(30_000), headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
    if (!response.ok) throw new Error("Payment adapter request failed; reconcile before retrying");
    return response.json();
  }
  if (!REGISTRY.has(key)) throw new Error("Unknown registered payment adapter");
  try { const adapter = await paymentProviderAdapters[key as keyof typeof paymentProviderAdapters](); return (adapter as any)[functionName](input); }
  catch { throw new Error("Payment adapter failed; reconcile before retrying"); }
}
export const createPayment = (provider: any, args: any) => executeAdapterFunction({ provider, functionName: "createPaymentFunction", args });
export const getPaymentStatus = (provider: any, paymentId: string) => executeAdapterFunction({ provider, functionName: "getPaymentStatusFunction", args: { paymentId } });
export const handleWebhook = (provider: any, args: any) => executeAdapterFunction({ provider, functionName: "handleWebhookFunction", args });
export const refundPayment = (provider: any, args: any) => executeAdapterFunction({ provider, functionName: "refundPaymentFunction", args });
