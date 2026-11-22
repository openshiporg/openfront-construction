/** What a customer pays online to book a quoted job, in minor units.
 * An accepted quote is frozen in its snapshot; before acceptance the live quote applies.
 * Quotes issued before deposits existed have no deposit and the whole quote is due. */
export function depositDueMinor(request: { quoteMinor: string; depositMinor?: string | null; acceptedSnapshot?: Record<string, unknown> | null }): { totalMinor: bigint; depositMinor: bigint } {
  const read = (value: unknown) => { try { return BigInt(String(value ?? "0") || "0"); } catch { return BigInt(0); } };
  const snapshot = request.acceptedSnapshot;
  const totalMinor = snapshot ? read(snapshot.totalMinor) : read(request.quoteMinor);
  const stated = snapshot ? read(snapshot.depositMinor) : read(request.depositMinor);
  return { totalMinor, depositMinor: stated > BigInt(0) && stated <= totalMinor ? stated : totalMinor };
}
