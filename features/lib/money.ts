/** Exact minor-unit display; never route BIGINT money through a float. */
export function formatUsdMinor(value: string | bigint): string {
  const amount = BigInt(value);
  const negative = amount < BigInt(0);
  const magnitude = negative ? -amount : amount;
  return `${negative ? "-" : ""}$${(magnitude / BigInt(100)).toLocaleString("en-US")}.${(magnitude % BigInt(100)).toString().padStart(2, "0")}`;
}
