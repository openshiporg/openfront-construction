/** Lifecycle of a trade partner's change quote. Closing is one-way: accepted, rejected and withdrawn quotes never reopen. */
export type ChangeQuoteClose = "withdraw" | "reject";

const closedStatus: Record<ChangeQuoteClose, "withdrawn" | "rejected"> = { withdraw: "withdrawn", reject: "rejected" };

/** States each close may start from. A partner can pull a quote that is still asked for or received; staff can only decline one that was received. */
const closableFrom: Record<ChangeQuoteClose, readonly string[]> = {
  withdraw: ["requested", "received"],
  reject: ["received"],
};

export function changeQuoteCloseStatus(action: ChangeQuoteClose) {
  return closedStatus[action];
}

export function canCloseChangeQuote(action: ChangeQuoteClose, status: string | null | undefined) {
  return closableFrom[action].includes(String(status));
}

/** Throws the user-facing reason a quote cannot be closed from its current state. */
export function assertChangeQuoteClosable(action: ChangeQuoteClose, status: string | null | undefined) {
  if (canCloseChangeQuote(action, status)) return;
  const verb = action === "withdraw" ? "withdrawn" : "rejected";
  throw new Error(`A ${String(status)} change quote cannot be ${verb}; only ${closableFrom[action].join(" or ")} quotes can`);
}

/** The quote scope keeps its original text and gains the close reason, so the record explains itself. */
export function scopeWithCloseReason(scope: string | null | undefined, action: ChangeQuoteClose, reason: string) {
  const note = `${action === "withdraw" ? "Withdrawn" : "Rejected"}: ${reason}`;
  return scope?.trim() ? `${scope.trim()}\n\n${note}` : note;
}
