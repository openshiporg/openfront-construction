export function amountToMinorUnits(raw: string, allowNegative = false): string | null {
  if (!raw) return null;
  const match = raw.match(/^(-?)(?:(\d+)|(\d{1,3}(?:,\d{3})+))(?:\.(\d{1,2}))?$/);
  if (!match || (!allowNegative && match[1] === "-")) {
    throw new Error(`Amount must be a ${allowNegative ? "signed or non-negative" : "non-negative"} monetary value with at most two decimal places`);
  }
  const whole = String(match[2] ?? match[3]).replaceAll(",", "");
  const magnitude = `${whole}${(match[4] || "").padEnd(2, "0")}`.replace(/^0+(?=\d)/, "");
  return match[1] === "-" && magnitude !== "0" ? `-${magnitude}` : magnitude;
}
