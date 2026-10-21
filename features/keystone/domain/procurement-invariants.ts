export function quantityToUnits(value: string): bigint {
  if (!/^\d+(?:\.\d{1,4})?$/.test(value)) throw new Error("Quantity must be a positive decimal with at most four places");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * BigInt(10_000) + BigInt((fraction + "0000").slice(0, 4));
}

export function deriveProcurementReceiptStatus(
  orderedUnits: bigint,
  acceptedUnits: bigint,
): "ordered" | "partially_received" | "received" {
  if (orderedUnits <= BigInt(0) || acceptedUnits < BigInt(0)) throw new Error("Ordered quantity must be positive and accepted quantity non-negative");
  if (acceptedUnits > orderedUnits) throw new Error("Accepted receipts exceed ordered quantity");
  if (acceptedUnits === BigInt(0)) return "ordered";
  if (acceptedUnits === orderedUnits) return "received";
  return "partially_received";
}

export function receiptTotalsAreValid(input: {
  receivedUnits: bigint;
  acceptedUnits: bigint;
  rejectedUnits: bigint;
}): boolean {
  return input.receivedUnits > BigInt(0) && input.acceptedUnits >= BigInt(0) && input.rejectedUnits >= BigInt(0) &&
    input.acceptedUnits + input.rejectedUnits === input.receivedUnits;
}

/** A delivery may cover only the quantity still outstanding on the order line.
 * Rejected deliveries stay on record but do not fulfil the order, so a
 * replacement delivery for rejected goods is accepted. */
export function receiptCapacityIsValid(input: {
  orderedUnits: bigint;
  receivedToDateUnits: bigint;
  acceptedToDateUnits: bigint;
  additionalReceivedUnits: bigint;
  additionalAcceptedUnits: bigint;
}): boolean {
  const outstandingUnits = input.orderedUnits - input.acceptedToDateUnits;
  return input.orderedUnits > BigInt(0) && input.receivedToDateUnits >= BigInt(0) &&
    input.acceptedToDateUnits >= BigInt(0) && input.additionalReceivedUnits > BigInt(0) &&
    input.additionalAcceptedUnits >= BigInt(0) && input.additionalAcceptedUnits <= input.additionalReceivedUnits &&
    input.additionalReceivedUnits <= outstandingUnits;
}
