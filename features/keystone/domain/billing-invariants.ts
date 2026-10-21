export type ClaimSide = "owner" | "commitment";
export type PaymentDirection = "receipt" | "disbursement";

export function assertSettlementCompatibility(input: {
  claimSide: ClaimSide;
  claimPartnerId: string | null;
  claimCurrencyCode: string;
  paymentDirection: PaymentDirection;
  paymentPartnerId: string | null;
  paymentCurrencyCode: string;
}): void {
  const expectedDirection: PaymentDirection = input.claimSide === "owner" ? "receipt" : "disbursement";
  if (input.paymentDirection !== expectedDirection) {
    throw new Error(`A ${input.claimSide} claim requires a ${expectedDirection} payment`);
  }
  if (input.paymentCurrencyCode.toUpperCase() !== input.claimCurrencyCode.toUpperCase()) {
    throw new Error("Payment and claim currencies must match");
  }
  if (input.paymentPartnerId !== input.claimPartnerId) {
    throw new Error("Payment counterparty must match the progress claim");
  }
}

export function deriveClaimPaymentStatus(dueMinor: bigint, settledAllocatedMinor: bigint): "approved" | "partially_paid" | "paid" {
  if (dueMinor <= BigInt(0) || settledAllocatedMinor < BigInt(0)) throw new Error("Claim due and settlement totals must be positive/non-negative");
  if (settledAllocatedMinor > dueMinor) throw new Error("Settled allocations exceed claim payment due");
  if (settledAllocatedMinor === BigInt(0)) return "approved";
  if (settledAllocatedMinor === dueMinor) return "paid";
  return "partially_paid";
}

export function remainingCapacityMinor(capacityMinor: bigint, consumedMinor: bigint): bigint {
  if (capacityMinor < BigInt(0) || consumedMinor < BigInt(0)) throw new Error("Financial capacity values cannot be negative");
  return capacityMinor > consumedMinor ? capacityMinor - consumedMinor : BigInt(0);
}
