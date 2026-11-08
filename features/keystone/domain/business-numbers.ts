/**
 * Business numbers the operator types (RFI-014, CO-003, PO-0021…) identify one record within a project; a project
 * number identifies one project within a company. Commands check availability inside the command transaction under an
 * advisory lock, and the normalised unique indexes in migration 20261108160000_construction_record_invariants are the
 * backstop. Numbers compare trimmed and case-insensitively, the way an operator reads them.
 */
type Sql = { $queryRawUnsafe?<T>(query: string, ...values: unknown[]): Promise<T> };
type NumberRule = { field: string; label: string; scope: "project" | "company" | "schedule"; index: string };

export const BUSINESS_NUMBERS: Record<string, NumberRule> = {
  Project: { field: "projectNumber", label: "Project number", scope: "company", index: "Project_company_projectNumber_key" },
  BidPackage: { field: "number", label: "Bid package number", scope: "project", index: "BidPackage_project_number_key" },
  ChangeEvent: { field: "number", label: "Change event number", scope: "project", index: "ChangeEvent_project_number_key" },
  RFI: { field: "number", label: "RFI number", scope: "project", index: "RFI_project_number_key" },
  Submittal: { field: "number", label: "Submittal number", scope: "project", index: "Submittal_project_number_key" },
  PunchItem: { field: "number", label: "Punch item number", scope: "project", index: "PunchItem_project_number_key" },
  SafetyObservation: { field: "observationNumber", label: "Observation number", scope: "project", index: "SafetyObservation_project_number_key" },
  BudgetChange: { field: "number", label: "Budget change number", scope: "project", index: "BudgetChange_project_number_key" },
  Estimate: { field: "number", label: "Estimate number", scope: "project", index: "Estimate_project_number_key" },
  PrimeContract: { field: "number", label: "Prime contract number", scope: "project", index: "PrimeContract_project_number_key" },
  Commitment: { field: "number", label: "Commitment number", scope: "project", index: "Commitment_project_number_key" },
  ChangeOrder: { field: "number", label: "Change order number", scope: "project", index: "ChangeOrder_project_number_key" },
  ProgressClaim: { field: "claimNumber", label: "Claim number", scope: "project", index: "ProgressClaim_project_number_key" },
  SafetyIncident: { field: "incidentNumber", label: "Incident number", scope: "project", index: "SafetyIncident_project_number_key" },
  Inspection: { field: "inspectionNumber", label: "Inspection number", scope: "project", index: "Inspection_project_number_key" },
  CorrectiveAction: { field: "actionNumber", label: "Action number", scope: "project", index: "CorrectiveAction_project_number_key" },
  ProcurementRequest: { field: "requestNumber", label: "Request number", scope: "project", index: "ProcurementRequest_project_number_key" },
  MaterialReceipt: { field: "receiptNumber", label: "Receipt number", scope: "project", index: "MaterialReceipt_project_number_key" },
  LienWaiver: { field: "waiverNumber", label: "Waiver number", scope: "project", index: "LienWaiver_project_number_key" },
  RetainageRelease: { field: "releaseNumber", label: "Release number", scope: "project", index: "RetainageRelease_project_number_key" },
  Drawing: { field: "drawingNumber", label: "Drawing number", scope: "project", index: "Drawing_project_number_key" },
  ScheduleTask: { field: "taskCode", label: "Task code", scope: "schedule", index: "ScheduleTask_schedule_taskCode_key" },
  SpecificationSection: { field: "sectionNumber", label: "Section number", scope: "project", index: "SpecificationSection_project_number_key" },
};

export const DAILY_LOG_DAY_INDEX = "DailyLog_project_logDay_key";

export function normalizeBusinessNumber(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function quoted(identifier: string) {
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(identifier)) throw new Error("Unsupported identifier");
  return `"${identifier}"`;
}

function scopeText(scope: NumberRule["scope"]) {
  return scope === "company" ? "by another project in this company" : scope === "schedule" ? "in this schedule" : "on this project";
}

function dayLabel(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date, 12)).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" });
}

/** Refuses a create whose business number (or daily-log day) is already used in its scope. */
export async function assertBusinessNumberAvailable(context: { prisma?: Sql }, listKey: string, data: Record<string, unknown>, scopeId: string) {
  const sql = context.prisma?.$queryRawUnsafe?.bind(context.prisma);
  if (!sql) return;
  if (listKey === "DailyLog") {
    const logDate = data.logDate instanceof Date ? data.logDate : data.logDate ? new Date(String(data.logDate)) : null;
    if (!logDate || Number.isNaN(logDate.getTime())) return;
    const day = logDate.toISOString().slice(0, 10);
    await sql(`SELECT 1::int AS locked FROM pg_advisory_xact_lock(hashtextextended($1, 0))`, `DailyLog\u001f${scopeId}\u001f${day}`);
    const [row] = await sql<Array<{ taken: boolean }>>(
      `SELECT EXISTS(SELECT 1 FROM "DailyLog" WHERE project = $1 AND "logDate"::date = $2::date) AS taken`, scopeId, day,
    );
    if (row?.taken) throw new Error(`A daily log for ${dayLabel(day)} already exists on this project; add entries to it instead`);
    return;
  }
  const rule = BUSINESS_NUMBERS[listKey];
  if (!rule) return;
  if (rule.scope === "schedule") {
    const schedule = (data.schedule as { connect?: { id?: unknown } } | undefined)?.connect?.id;
    if (typeof schedule !== "string" || !schedule) return;
    scopeId = schedule;
  }
  const shown = String(data[rule.field] ?? "").trim();
  const value = normalizeBusinessNumber(shown);
  if (!value) return;
  await sql(`SELECT 1::int AS locked FROM pg_advisory_xact_lock(hashtextextended($1, 0))`, `${listKey}\u001f${scopeId}\u001f${value}`);
  const [row] = await sql<Array<{ taken: boolean }>>(
    `SELECT EXISTS(SELECT 1 FROM ${quoted(listKey)} WHERE ${quoted(rule.scope)} = $1 AND lower(btrim(${quoted(rule.field)})) = $2) AS taken`,
    scopeId, value,
  );
  if (row?.taken) {
    throw new Error(`${rule.label} ${shown} is already used ${scopeText(rule.scope)}`);
  }
}

/** Readable message for a unique-index backstop hit (two concurrent creates both passed the pre-check). */
export function businessNumberConflictMessage(error: unknown): string | null {
  const seen = new Set<unknown>();
  const parts: string[] = [];
  let current: any = error;
  while (current && typeof current === "object" && !seen.has(current) && parts.length < 8) {
    seen.add(current);
    parts.push(String(current.message ?? ""));
    try { parts.push(JSON.stringify(current.meta ?? {}), JSON.stringify(current.extensions?.prisma ?? {})); } catch { /* circular */ }
    current = current.originalError ?? current.cause;
  }
  const text = parts.join(" ");
  if (text.includes(DAILY_LOG_DAY_INDEX)) return "A daily log for that day already exists on this project; add entries to it instead";
  for (const rule of Object.values(BUSINESS_NUMBERS)) {
    if (text.includes(rule.index)) return `${rule.label} is already used ${scopeText(rule.scope)}`;
  }
  return null;
}
