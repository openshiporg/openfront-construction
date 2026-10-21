import type { ConstructionOption } from "../data";

/** The viewer's IANA time zone, shown beside date-time inputs. */
export function userTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Converts a datetime-local value (wall-clock time in the viewer's zone) into
 * an unambiguous UTC instant, so the server never reinterprets it in its own
 * zone. Returns null for empty or invalid input. */
export function localDateTimeToInstant(local: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(local)) return null;
  const date = new Date(local);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export type NumberRule = { step: string; min?: string; max?: string; inputMode: "decimal" | "numeric" };

export type Field = {
  name: string;
  label: string;
  type?: "text" | "date" | "datetime-local" | "number" | "textarea" | "select" | "evidence";
  required?: boolean;
  optionKinds?: string[];
  values?: Array<{ value: string; label: string }>;
  placeholder?: string;
  number?: NumberRule;
  /** Only records in these lifecycle states are offered. */
  statuses?: string[];
  /** Only records whose parent is the value chosen in this field. */
  parentField?: string;
  /** Only records of the kind chosen in this field (e.g. a source type). */
  kindField?: string;
  /** Submitted as a hidden value derived from the kind chosen in another field. */
  derivedFrom?: { field: string; byKind: Record<string, string> };
  /** Evidence only: also submit the chosen file's name under this field. */
  fileNameField?: string;
};
/** Options offered for one select field, after its dependency and state rules. */
export function eligibleOptions(field: Field, options: readonly ConstructionOption[], chosen: Record<string, string>, chosenKinds: Record<string, string>): ConstructionOption[] {
  return options.filter(option => {
    if (!(field.optionKinds ?? []).includes(option.kind)) return false;
    if (field.statuses && option.status && !field.statuses.includes(option.status)) return false;
    if (field.parentField && option.parentId !== (chosen[field.parentField] || undefined)) return false;
    if (field.kindField && option.kind !== (chosen[field.kindField] || chosenKinds[field.kindField])) return false;
    return true;
  });
}


/** The record each quick-capture operation acts on, so the related selector
 * offers only that entity type (and only eligible states). */
export const commandRelatedRecords: Record<string, { label: string; kinds: string[]; statuses?: string[] }> = {
  recordDirectCost: { label: "Budget code", kinds: ["budgetCode"] },
  awardBidSubmission: { label: "Bid submission", kinds: ["bidSubmission"] },
  prepareProgressClaim: { label: "Contract", kinds: ["commitment", "primeContract"], statuses: ["executed", "complete"] },
  recordProgressPayment: { label: "Approved claim", kinds: ["progressClaim"], statuses: ["approved", "partially_paid"] },
};

export function relatedOptionsFor(operation: string, options: readonly ConstructionOption[]): ConstructionOption[] {
  const related = commandRelatedRecords[operation];
  if (!related) return [];
  return options.filter(option => related.kinds.includes(option.kind) && (!related.statuses || !option.status || related.statuses.includes(option.status)));
}
