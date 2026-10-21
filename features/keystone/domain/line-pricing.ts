import { quantityToUnits } from "./procurement-invariants";

const SCALE = BigInt(10_000);
const MAX_MINOR = BigInt("9223372036854775807");
const MAX_QUANTITY_UNITS = BigInt("999999999999999999");
const halfUp = (numerator: bigint, denominator: bigint) => (numerator + denominator / BigInt(2)) / denominator;

/** Existing amount inputs mean LINE TOTAL, never unit price.
 * Derive the nearest integer-minor-unit rate (half up) and round its extension
 * half up. Reject totals that cannot be represented coherently at that quantity;
 * never silently change a submitted commercial total or historical record. */
export function priceLineFromTotal(totalMinor: string, quantityInput = "1") {
  if (!/^\d+$/.test(totalMinor)) throw new Error("Line total must be non-negative integer minor units");
  const total = BigInt(totalMinor);
  const quantity = quantityInput.trim();
  const units = quantityToUnits(quantity);
  if (total > MAX_MINOR || units <= BigInt(0) || units > MAX_QUANTITY_UNITS) throw new Error("Line total or quantity exceeds the supported range");
  const unitPrice = halfUp(total * SCALE, units);
  if (unitPrice > MAX_MINOR || halfUp(unitPrice * units, SCALE) !== total) {
    throw new Error("This line total cannot be represented by an integer-minor-unit rate at this quantity; review the quantity and total or submit a quantity-one lump sum");
  }
  return { quantity, unitPriceMinor: unitPrice.toString(), amountMinor: total.toString() };
}
