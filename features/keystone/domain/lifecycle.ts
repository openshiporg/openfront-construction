export const lifecyclePolicies = {
  Project: {
    planning: ["active", "archived"],
    active: ["on_hold", "completed"],
    on_hold: ["active", "completed"],
    completed: ["archived"],
    archived: [],
  },
  BidPackage: {
    draft: ["open", "archived"],
    open: ["closed"],
    closed: ["awarded", "archived"],
    awarded: ["archived"],
    archived: [],
  },
  Estimate: {
    draft: ["internal_review"],
    internal_review: ["draft", "issued"],
    issued: ["accepted", "rejected", "superseded"],
    accepted: ["superseded"],
    rejected: ["draft", "superseded"],
    superseded: [],
  },
  BudgetChange: {
    draft: ["pending_approval"],
    pending_approval: ["approved", "rejected"],
    approved: ["posted"],
    rejected: ["draft"],
    posted: [],
  },
  PrimeContract: {
    draft: ["pending_approval"],
    pending_approval: ["draft", "approved", "rejected"],
    approved: ["executed"],
    rejected: ["draft"],
    executed: ["closed"],
    closed: [],
  },
  Commitment: {
    draft: ["out_for_signature", "cancelled"],
    out_for_signature: ["draft", "executed", "cancelled"],
    executed: ["complete", "terminated"],
    complete: ["closed"],
    closed: [],
    cancelled: [],
    terminated: [],
  },
  ChangeEvent: {
    open: ["pricing", "voided"],
    pricing: ["open", "pending_approval", "voided"],
    pending_approval: ["pricing", "approved", "rejected"],
    approved: ["incorporated"],
    rejected: ["pricing", "voided"],
    incorporated: [],
    voided: [],
  },
  ChangeOrder: {
    draft: ["pending_approval"],
    pending_approval: ["draft", "approved", "rejected"],
    approved: ["executed"],
    rejected: ["draft"],
    executed: ["posted"],
    posted: [],
  },
  RFI: {
    draft: ["open", "voided"],
    open: ["answered", "voided"],
    answered: ["open", "closed"],
    closed: [],
    voided: [],
  },
  Submittal: {
    draft: ["submitted", "voided"],
    submitted: ["under_review", "voided"],
    under_review: ["approved", "revise_resubmit", "rejected"],
    revise_resubmit: ["submitted"],
    approved: ["closed"],
    rejected: ["revise_resubmit", "closed"],
    closed: [],
    voided: [],
  },
  ProgressClaim: {
    draft: ["submitted", "voided"],
    submitted: ["under_review", "voided"],
    under_review: ["approved", "rejected"],
    approved: ["closed"],
    partially_paid: [],
    paid: ["closed"],
    rejected: ["draft"],
    closed: [],
    voided: [],
  },
  SafetyIncident: {
    reported: ["investigating"],
    investigating: ["corrective_action", "closed"],
    corrective_action: ["investigating", "closed"],
    closed: [],
  },
  Inspection: {
    scheduled: ["in_progress", "cancelled"],
    in_progress: ["passed", "failed"],
    passed: ["closed"],
    failed: ["in_progress", "closed"],
    closed: [],
    cancelled: [],
  },
  Schedule: {
    draft: ["published", "archived"],
    published: ["archived"],
    archived: [],
  },
  ScheduleTask: {
    not_started: ["in_progress", "on_hold", "delayed"],
    in_progress: ["completed", "on_hold", "delayed"],
    delayed: ["in_progress", "on_hold"],
    on_hold: ["in_progress", "delayed"],
    completed: [],
  },
  DailyLog: {
    draft: ["submitted"],
    submitted: ["draft", "approved"],
    approved: [],
  },
  PunchItem: {
    open: ["in_progress", "voided"],
    in_progress: ["ready_for_review", "voided"],
    ready_for_review: ["in_progress", "closed"],
    closed: [],
    voided: [],
  },
  SafetyObservation: {
    open: ["assigned", "resolved"],
    assigned: ["open", "resolved"],
    resolved: ["assigned", "closed"],
    closed: [],
  },
  CorrectiveAction: {
    open: ["in_progress"],
    in_progress: ["ready_for_verification"],
    ready_for_verification: ["in_progress", "verified"],
    verified: ["closed"],
    closed: [],
  },
  Payment: {
    pending: ["authorized", "failed", "voided"],
    authorized: ["settled", "failed", "voided"],
    settled: [],
    reversed: [],
    failed: ["pending", "voided"],
    voided: [],
  },
  RetainageRelease: {
    requested: ["approved", "rejected", "voided"],
    approved: ["released", "voided"],
    released: [],
    rejected: ["requested", "voided"],
    voided: [],
  },
  LienWaiver: {
    requested: ["received", "expired"],
    received: ["accepted", "rejected", "expired"],
    accepted: [],
    rejected: ["requested"],
    expired: [],
  },
  ProcurementRequest: {
    draft: ["submitted", "cancelled"],
    submitted: ["draft", "approved", "rejected", "cancelled"],
    approved: ["ordered", "cancelled"],
    ordered: ["partially_received", "received", "cancelled"],
    partially_received: ["received", "cancelled"],
    received: ["closed"],
    rejected: ["draft", "cancelled"],
    closed: [],
    cancelled: [],
  },
} as const;

export type LifecycleListKey = keyof typeof lifecyclePolicies;

export function normalizeTransitionReason(reason: unknown): string {
  if (typeof reason !== "string" || reason.trim().length === 0) {
    throw new Error("A transition reason is required");
  }

  const normalized = reason.trim();
  if (normalized.length < 3) {
    throw new Error("A transition reason must be at least 3 characters");
  }
  if (normalized.length > 500) {
    throw new Error("A transition reason must be at most 500 characters");
  }
  return normalized;
}

export function assertAllowedTransition(
  listKey: LifecycleListKey,
  fromStatus: string,
  toStatus: string,
): void {
  const policy = lifecyclePolicies[listKey] as Record<string, readonly string[]>;
  if (!(fromStatus in policy)) {
    throw new Error(`Unknown ${listKey} status ${fromStatus}`);
  }
  if (!(toStatus in policy)) {
    throw new Error(`Unknown ${listKey} status ${toStatus}`);
  }
  if (fromStatus === toStatus) {
    throw new Error(`${listKey} is already in status ${toStatus}`);
  }
  if (!policy[fromStatus].includes(toStatus)) {
    throw new Error(`Invalid ${listKey} transition from ${fromStatus} to ${toStatus}`);
  }
}
