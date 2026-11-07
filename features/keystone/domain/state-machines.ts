/**
 * Explicit transition maps for the lifecycles that are not driven through the
 * `transition*` lifecycle mutations (see ./lifecycle.ts for those).
 *
 * Every writer of these fields (Keystone field hook, custom mutation, provider
 * settlement, dashboard action) must go through `assertMachineTransition`.
 */
export type TransitionMap = Record<string, readonly string[]>;

export const stateMachines = {
  // Directory partner. blocked can only return to prospective for re-vetting.
  TradePartner: {
    prospective: ["approved", "blocked"],
    approved: ["inactive", "blocked"],
    inactive: ["approved", "blocked"],
    blocked: ["prospective"],
  },
  Equipment: {
    available: ["in_use", "out_of_service", "retired"],
    in_use: ["available", "out_of_service"],
    out_of_service: ["available", "retired"],
    retired: ["available"],
  },
  Material: {
    active: ["inactive", "discontinued"],
    inactive: ["active", "discontinued"],
    discontinued: ["active"],
  },
  // CRM lead. converted is set by a paid deposit and is final.
  ConstructionLead: {
    new: ["qualified", "nurturing", "converted", "disqualified"],
    qualified: ["nurturing", "converted", "disqualified"],
    nurturing: ["qualified", "converted", "disqualified"],
    converted: [],
    disqualified: ["new"],
  },
  // Pursuit stage. Open stages move freely among themselves; won is final
  // (it is linked to a booked project); lost/declined can be reopened.
  ConstructionOpportunity: {
    qualifying: ["go_no_go", "estimating", "submitted", "negotiating", "lost", "declined"],
    go_no_go: ["qualifying", "estimating", "submitted", "negotiating", "lost", "declined"],
    estimating: ["qualifying", "go_no_go", "submitted", "negotiating", "lost", "declined"],
    submitted: ["qualifying", "go_no_go", "estimating", "negotiating", "won", "lost", "declined"],
    negotiating: ["qualifying", "go_no_go", "estimating", "submitted", "won", "lost", "declined"],
    won: [],
    lost: ["qualifying"],
    declined: ["qualifying"],
  },
  // Company and project membership share the lifecycle.
  Membership: {
    invited: ["active", "revoked"],
    active: ["suspended", "revoked"],
    suspended: ["active", "revoked", "invited"],
    revoked: ["invited"],
  },
  AgentIdentity: {
    active: ["suspended", "revoked"],
    suspended: ["active", "revoked"],
    revoked: [],
  },
  ScopeGrant: {
    active: ["inactive", "revoked"],
    inactive: ["active", "revoked"],
    revoked: [],
  },
  // Customer quote request (quote -> accept -> pay deposit -> booked).
  ServiceRequest: {
    requested: ["quoted", "cancelled"],
    quoted: ["quoted", "payment_pending", "cancelled"],
    payment_pending: ["booked", "cancelled"],
    booked: ["cancelled"],
    cancelled: [],
  },
  // Bid invitation: sent when created; the bidder (or staff on their behalf)
  // views, signals intent, declines or submits. A declined invitation can be re-sent.
  BidInvitation: {
    // draft -> submitted rescues invitations created before inviting sent them.
    draft: ["invited", "submitted"],
    invited: ["viewed", "intent_to_bid", "declined", "submitted"],
    viewed: ["intent_to_bid", "declined", "submitted"],
    intent_to_bid: ["declined", "submitted"],
    declined: ["invited"],
    submitted: [],
  },
  // Bid submission: accepted/rejected/withdrawn are final. Award accepts one
  // bid and rejects every other open bid on the package.
  BidSubmission: {
    draft: ["submitted", "withdrawn"],
    submitted: ["under_review", "accepted", "rejected", "withdrawn"],
    under_review: ["accepted", "rejected", "withdrawn"],
    accepted: [],
    rejected: [],
    withdrawn: [],
  },
  // Transitions made by the system, never by a person: provider settlement,
  // payment reversal and the claim roll-up derived from settled allocations.
  // (The manual map in ./lifecycle.ts deliberately refuses these.)
  PaymentSystem: {
    pending: ["settled", "failed", "voided"],
    authorized: ["settled", "failed", "voided"],
    failed: ["pending"],
    settled: ["reversed"],
    reversed: [],
    voided: [],
  },
  ProgressClaimSystem: {
    approved: ["partially_paid", "paid"],
    partially_paid: ["approved", "paid"],
    paid: ["approved", "partially_paid"],
  },
} as const satisfies Record<string, TransitionMap>;

export type MachineName = keyof typeof stateMachines;

export function canTransition(machine: MachineName, from: string, to: string): boolean {
  const map = stateMachines[machine] as TransitionMap;
  return Boolean(map[from]?.includes(to));
}

/** Throws a clear error for an unknown state, a no-op or an illegal move. */
export function assertMachineTransition(machine: MachineName, from: string, to: string): void {
  const map = stateMachines[machine] as TransitionMap;
  if (!(from in map)) throw new Error(`Unknown ${machine} status ${from}`);
  if (!(to in map)) throw new Error(`Unknown ${machine} status ${to}`);
  if (from === to) throw new Error(`${machine} is already ${to}`);
  if (!map[from].includes(to)) throw new Error(`${machine} cannot move from ${from} to ${to}`);
}

/** Like assertMachineTransition, but a write of the same state is a no-op (roll-ups recompute). */
export function assertMachineMove(machine: MachineName, from: string, to: string): void {
  if (from === to) return;
  assertMachineTransition(machine, from, to);
}

/**
 * Keystone field hooks that refuse an illegal update of a status/stage field.
 * A same-value write (editing other fields with the form's unchanged status) passes.
 * Create is unconstrained here: the field default and the creating command own it.
 */
export function statusGuard(machine: MachineName) {
  return {
    validate: {
      update: ({ item, resolvedData, fieldKey, addValidationError }: {
        item: Record<string, unknown>;
        resolvedData: Record<string, unknown>;
        fieldKey: string;
        addValidationError(message: string): void;
      }) => {
        const to = resolvedData?.[fieldKey];
        const from = item?.[fieldKey];
        if (typeof to !== "string" || typeof from !== "string" || to === from) return;
        try { assertMachineTransition(machine, from, to); }
        catch (error) { addValidationError(error instanceof Error ? error.message : "Illegal status change"); }
      },
    },
  };
}
