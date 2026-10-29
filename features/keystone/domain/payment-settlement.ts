/** Pure payment-settlement rules shared by the customer return, the staff
 * "Check status" action and the provider webhook. No I/O here: callers pass ports. */

export type ProviderPaymentResult = {
  status: string;
  amount: number;
  currency: string;
  paymentIntentId?: string | null;
  paymentMethodType?: string | null;
  metadata?: Record<string, string> | null;
};

export type LocalPayment = { id: string; amountMinor: bigint; currencyCode: string };

/** Fail closed: amount, currency and the correlated local payment must all match. */
export function assertProviderResult(payment: LocalPayment, result: ProviderPaymentResult): void {
  if (!Number.isSafeInteger(result.amount) || BigInt(result.amount) !== payment.amountMinor) throw new Error("Provider amount does not match the payment");
  if (String(result.currency).toUpperCase() !== payment.currencyCode.toUpperCase()) throw new Error("Provider currency does not match the payment");
  if (result.metadata && result.metadata.paymentId !== payment.id) throw new Error("Provider payment does not belong to this payment");
}

export const requestPaymentKey = (requestId: string, actorId: string) => `construction-request:${requestId}:${actorId}`;
export const claimPaymentKey = (claimId: string, remainingMinor: bigint | string) => `construction-claim:${claimId}:${remainingMinor}`;
export function claimIdFromPaymentKey(key: string | null | undefined): string | null {
  const match = /^construction-claim:([^:]+):\d+$/.exec(key || "");
  return match ? match[1] : null;
}

export function assertRequestOwner(request: { customerId?: string | null; status: string } | null, actorId: string | undefined): void {
  if (!actorId) throw new Error("Sign in to pay");
  if (!request || request.customerId !== actorId || request.status !== "payment_pending") throw new Error("Request not payable");
}

export type SettlementPorts = {
  /** Atomically move pending/authorized to settled; true only for the caller that won. */
  markSettled(): Promise<boolean>;
  /** Run under a payment row lock, in one transaction; returns false if an allocation already exists. */
  allocateOnce(): Promise<boolean>;
};

/** Settle then allocate. Safe to call any number of times (return, webhook, retries). */
export async function applySettlement(ports: SettlementPorts, claimId: string | null) {
  const settledNow = await ports.markSettled();
  const allocated = claimId ? await ports.allocateOnce() : false;
  return { settledNow, allocated };
}

export type WebhookClaim = "new" | "done" | "retry";
/** Process each provider event id at most once to completion. */
export async function processWebhookOnce(ports: {
  claim(): Promise<WebhookClaim>;
  handle(): Promise<void>;
  complete(): Promise<void>;
  fail(): Promise<void>;
}): Promise<"processed" | "duplicate"> {
  const state = await ports.claim();
  if (state === "done") return "duplicate";
  try { await ports.handle(); } catch (error) { await ports.fail(); throw error; }
  await ports.complete();
  return "processed";
}
