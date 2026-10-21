import { createHash } from "node:crypto";

import { queryById, type KeystoneContextLike } from "./tenancy";

export type ApprovalTarget = {
  listKey: "BudgetChange" | "PrimeContract" | "ChangeOrder" | "ProgressClaim" | "RetainageRelease";
  domain: "budget_change" | "prime_contract" | "change_order" | "progress_claim" | "retainage_release";
  permission: "canManageFinancials" | "canManageContracts" | "canManageBilling";
  amountField: string;
  query: string;
  table: string;
  child?: { table: string; parentColumn: string };
};

export const approvalTargets: Record<string, ApprovalTarget> = {
  BudgetChange: {
    listKey: "BudgetChange", domain: "budget_change", permission: "canManageFinancials", amountField: "totalAmountMinor",
    table: "BudgetChange", child: { table: "BudgetChangeLineItem", parentColumn: "budgetChange" },
    query: "id number title reason status totalAmountMinor currencyCode budget { id name currencyCode } sourceChangeEvent { id number title } company { id name } project { id name projectNumber } lineItems(take: 501, orderBy: { id: asc }) { id description amountMinor budgetLineItem { id budget { id } } budgetCode { id code description } changeEventLineItem { id description } }",
  },
  PrimeContract: {
    listKey: "PrimeContract", domain: "prime_contract", permission: "canManageContracts", amountField: "revisedContractMinor",
    table: "PrimeContract", child: { table: "ContractLineItem", parentColumn: "primeContract" },
    query: "id number title description contractType status originalContractMinor approvedChangesMinor revisedContractMinor defaultRetainageBps startDate completionDate currencyCode client { id name } company { id name } project { id name projectNumber } lineItems(take: 501, orderBy: [{ lineNumber: asc }, { id: asc }]) { id lineNumber description scheduledValueMinor approvedChangesMinor revisedValueMinor retainageBps budgetCode { id code description } }",
  },
  ChangeOrder: {
    listKey: "ChangeOrder", domain: "change_order", permission: "canManageContracts", amountField: "totalMinor",
    table: "ChangeOrder", child: { table: "ChangeOrderLineItem", parentColumn: "changeOrder" },
    query: "id number title description direction status totalMinor scheduleImpactDays currencyCode primeContract { id number title currencyCode client { id name } } commitment { id number title currencyCode tradePartner { id name } } company { id name } project { id name projectNumber } lineItems(take: 501, orderBy: [{ lineNumber: asc }, { id: asc }]) { id lineNumber description amountMinor contractLineItem { id lineNumber description scheduledValueMinor revisedValueMinor retainageBps budgetCode { id code description } } changeEventLineItem { id description } budgetCode { id code description } }",
  },
  ProgressClaim: {
    listKey: "ProgressClaim", domain: "progress_claim", permission: "canManageBilling", amountField: "currentPaymentDueMinor",
    table: "ProgressClaim", child: { table: "ProgressClaimLineItem", parentColumn: "progressClaim" },
    query: "id claimNumber invoiceNumber claimType status periodStart periodEnd dueAt certification originalContractMinor approvedChangesMinor revisedContractMinor workCompletedToDateMinor storedMaterialsMinor retainageMinor earnedLessRetainageMinor previousPaymentsMinor currentPaymentDueMinor balanceToFinishMinor currencyCode primeContract { id number title client { id name } } commitment { id number title tradePartner { id name } } tradePartner { id name } company { id name } project { id name projectNumber } lineItems(take: 501, orderBy: [{ lineNumber: asc }, { id: asc }]) { id lineNumber description scheduledValueMinor previousWorkMinor currentWorkMinor storedMaterialsMinor completedStoredToDateMinor percentComplete retainageBps retainageMinor earnedLessRetainageMinor balanceToFinishMinor contractLineItem { id } }",
  },
  RetainageRelease: {
    listKey: "RetainageRelease", domain: "retainage_release", permission: "canManageBilling", amountField: "amountMinor",
    table: "RetainageRelease",
    query: "id releaseNumber status amountMinor currencyCode reason company { id name } project { id name projectNumber } progressClaim { id claimNumber claimType tradePartner { id name } } progressClaimLineItem { id lineNumber description retainageMinor } payment { id paymentNumber direction status amountMinor currencyCode reference paidAt settledAt tradePartner { id name } }",
  },
};

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (!object(value)) return value;
  return Object.fromEntries(Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => [key, stable(entry)]));
}

export function canonicalApprovalSnapshot(value: Record<string, unknown>) {
  return JSON.stringify(stable(value));
}

export function digestApprovalSnapshot(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

const referenceTables: Record<string, { table: string; scope: "root-company" | "company" | "project" }> = {
  company: { table: "Company", scope: "root-company" }, project: { table: "Project", scope: "company" },
  client: { table: "TradePartner", scope: "company" }, tradePartner: { table: "TradePartner", scope: "company" },
  budget: { table: "Budget", scope: "project" }, budgetLineItem: { table: "BudgetLineItem", scope: "project" },
  budgetCode: { table: "BudgetCode", scope: "project" }, sourceChangeEvent: { table: "ChangeEvent", scope: "project" },
  changeEventLineItem: { table: "ChangeEventLineItem", scope: "project" }, primeContract: { table: "PrimeContract", scope: "project" },
  commitment: { table: "Commitment", scope: "project" }, contractLineItem: { table: "ContractLineItem", scope: "project" },
  progressClaim: { table: "ProgressClaim", scope: "project" }, progressClaimLineItem: { table: "ProgressClaimLineItem", scope: "project" },
  payment: { table: "Payment", scope: "project" },
};
const displayLabels = new Set(["name", "title", "number", "code", "projectNumber", "claimNumber", "paymentNumber", "releaseNumber"]);
const auditMetadata = new Set(["createdAt", "updatedAt", "createdBy", "updatedBy", "_approvalAssignment"]);
/** Frozen labels remain in the full integrity digest and review. Their live
 * renames do not change the commercial authority bound to stable identities. */
export function commercialApprovalProjection(record: Record<string, unknown>): Record<string, unknown> {
  const project = (value: unknown, parent: string): unknown => {
    if (Array.isArray(value)) return value.map(item => project(item, parent));
    if (!object(value)) return value;
    return Object.fromEntries(Object.entries(value)
      .filter(([key]) => !auditMetadata.has(key) && !(Object.hasOwn(referenceTables, parent) && (displayLabels.has(key) || (parent === "budgetCode" && key === "description"))))
      .map(([key, child]) => [key, project(child, key)]));
  };
  return Object.fromEntries(Object.entries(record).filter(([key]) => !auditMetadata.has(key)).map(([key, value]) => [key, project(value, key)]));
}

export function matchesApprovalSnapshot(loaded: { commercialDigest: string; config: ApprovalTarget }, raw: unknown, expectedDigest: unknown): boolean {
  if (typeof raw !== "string" || typeof expectedDigest !== "string" || Buffer.byteLength(raw, "utf8") > 512_000 || digestApprovalSnapshot(raw) !== expectedDigest) return false;
  try {
    const snapshot: unknown = JSON.parse(raw);
    if (!object(snapshot) || snapshot.snapshotVersion !== 2 || snapshot.approvalTarget !== loaded.config.listKey) return false;
    return digestApprovalSnapshot(canonicalApprovalSnapshot(commercialApprovalProjection(snapshot))) === loaded.commercialDigest;
  } catch { return false; }
}

export async function loadApprovalSnapshot(context: KeystoneContextLike, targetType: string, targetId: string) {
  const config = Object.hasOwn(approvalTargets, targetType) ? approvalTargets[targetType] : undefined;
  if (!config) throw new Error("This resource does not support bounded approvals");
  const record = await queryById(context, config.listKey, targetId, config.query);
  const companyId = record?.company?.id;
  const projectId = record?.project?.id;
  if (!record?.id || !companyId || !projectId) throw new Error(`${config.listKey} not found`);
  if (Array.isArray(record.lineItems) && record.lineItems.length > 500) {
    throw new Error("Approval snapshot exceeds the 500-line review limit");
  }
  const versioned = { ...record, snapshotVersion: 2, approvalTarget: config.listKey };
  const snapshot = canonicalApprovalSnapshot(versioned);
  if (Buffer.byteLength(snapshot, "utf8") > 512_000) throw new Error("Approval snapshot exceeds the supported review size");
  return { config, record, companyId, projectId, snapshot, snapshotDigest: digestApprovalSnapshot(snapshot), commercialDigest: digestApprovalSnapshot(canonicalApprovalSnapshot(commercialApprovalProjection(versioned))) }; 
}

export async function loadApprovalPolicySnapshot(context: KeystoneContextLike, policyId: string) {
  const record = await queryById(context, "ApprovalPolicy", policyId,
    "id domain minimumAmountMinor currencyCode isActive approverRole { id } company { id } project { id }");
  if (!record?.id) throw new Error("Approval policy is unavailable");
  const snapshot = canonicalApprovalSnapshot(record);
  return { record, snapshot, snapshotDigest: digestApprovalSnapshot(snapshot) };
}

export type ApprovalSnapshotLockContext = KeystoneContextLike & {
  prisma?: { $queryRawUnsafe?<T>(query: string, ...values: unknown[]): Promise<T> };
};

export async function lockApprovalPolicySnapshot(context: ApprovalSnapshotLockContext, policyId: string) {
  if (!context.prisma?.$queryRawUnsafe) throw new Error("Transactional approval-policy locking is unavailable");
  const [policy] = await context.prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM "ApprovalPolicy" WHERE id = $1 FOR UPDATE`, policyId,
  );
  if (!policy) throw new Error("Approval policy is unavailable");
  return loadApprovalPolicySnapshot(context, policyId);
}

function references(value: unknown, parent = "", found = new Map<string, { scope: "root-company" | "company" | "project"; ids: Set<string> }>()) {
  if (Array.isArray(value)) { for (const item of value) references(item, parent, found); return found; }
  if (!object(value)) return found;
  const reference = Object.hasOwn(referenceTables, parent) ? referenceTables[parent] : undefined;
  if (reference && typeof value.id === "string") {
    const group = found.get(reference.table) ?? { scope: reference.scope, ids: new Set<string>() };
    group.ids.add(value.id); found.set(reference.table, group);
  }
  for (const [key, child] of Object.entries(value)) references(child, key, found);
  return found;
}
function referenceKey(value: unknown) {
  return JSON.stringify([...references(value)].sort(([a], [b]) => a.localeCompare(b)).map(([table, group]) => [table, [...group.ids].sort()]));
}

export async function lockApprovalSnapshot(context: ApprovalSnapshotLockContext, targetType: string, targetId: string) {
  const config = Object.hasOwn(approvalTargets, targetType) ? approvalTargets[targetType] : undefined;
  const sql = context.prisma?.$queryRawUnsafe?.bind(context.prisma);
  if (!config || !sql) throw new Error("Transactional approval snapshot locking is unavailable");
  const [target] = await sql<Array<{ id: string }>>(
    `SELECT id FROM "${config.table}" WHERE id = $1 FOR UPDATE`, targetId);
  if (!target) throw new Error(`${config.listKey} not found`);
  if (config.child) {
    const children = await sql<Array<{ id: string }>>(
      `SELECT id FROM "${config.child.table}" WHERE "${config.child.parentColumn}" = $1 ORDER BY id LIMIT 501 FOR UPDATE`, targetId);
    if (children.length > 500) throw new Error("Approval snapshot exceeds the 500-line review limit");
  }
  const before = await loadApprovalSnapshot(context, targetType, targetId);
  // Batch parameterized locks by a server-owned table registry, in stable order.
  for (const [table, group] of [...references(before.record)].sort(([a], [b]) => a.localeCompare(b))) {
    const ids = [...group.ids].sort();
    const values: unknown[] = [...ids];
    const slots = ids.map((_, index) => "$" + (index + 1)).join(", ");
    values.push(before.companyId);
    const tenant = group.scope === "root-company" ? `id = $${values.length}` : `company = $${values.length}`;
    let project = "";
    if (group.scope === "project") { values.push(before.projectId); project = ` AND project = $${values.length}`; }
    const locked = await sql<Array<{ id: string }>>(`SELECT id FROM "${table}" WHERE id IN (${slots}) AND ${tenant}${project} ORDER BY id FOR SHARE`, ...values);
    if (locked.length !== ids.length) throw new Error("Approval dependency is unavailable in this tenant/project");
  }
  const current = await loadApprovalSnapshot(context, targetType, targetId);
  if (referenceKey(current.record) !== referenceKey(before.record)) throw new Error("Approval dependencies changed while being locked; reload for review");
  return current;
}
