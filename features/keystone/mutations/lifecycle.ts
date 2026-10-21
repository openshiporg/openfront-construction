import { createHash, randomUUID } from "node:crypto";

import { hasProjectPermission, type Session } from "../access";
import {
  assertAllowedTransition,
  normalizeTransitionReason,
  type LifecycleListKey,
} from "../domain/lifecycle";
import { assertTransitionPrerequisites } from "../domain/lifecycle-prerequisites";
import {
  scopeAllows,
  type ConstructionScope,
} from "../domain/scopes";
import {
  canAccessProjectById,
  queryById,
  queryOne,
  type KeystoneContextLike,
  type KeystoneQueryApi,
  type KeystoneQueryRecord,
} from "../domain/tenancy";
import type { Permission } from "../models/fields";
import { hasNativeAuthorityPort, lockCurrentAuthority } from "../domain/current-authority";
import { assertAgentPrincipal, compareAndSetAgentAction, discoverAgentAction, lockAgentActionChain } from "../domain/agent-authority";

export type LifecycleTransitionInput = {
  id: string;
  toStatus: string;
  reason: string;
  idempotencyKey?: string | null;
  agentActionId?: string | null;
};

type LifecycleConfig = {
  listKey: LifecycleListKey;
  permission: Permission;
  requiredScope: ConstructionScope;
  projectRoot?: boolean;
};

type TransitionResult = {
  success: true;
  itemId: string;
  fromStatus: string;
  toStatus: string;
  actionId: string;
  replayed: boolean;
};

type MutationRecord = KeystoneQueryRecord & { id: string };
type LifecycleMutationApi = {
  createOne?(args: { data: Record<string, unknown> }): Promise<MutationRecord>;
  updateOne?(args: { where: { id: string }; data: Record<string, unknown> }): Promise<MutationRecord>;
};
type LifecyclePrismaModel = {
  updateMany?(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<{ count: number }>;
};
type LifecyclePrisma = Record<string, LifecyclePrismaModel> & {
  $queryRawUnsafe?<T>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe?(query: string, ...values: unknown[]): Promise<number>;
};
type LifecycleSudo = {
  query: Record<string, KeystoneQueryApi>;
  db: Record<string, LifecycleMutationApi>;
  prisma?: LifecyclePrisma;
};
export type LifecycleContext = {
  session?: Session;
  prisma?: LifecyclePrisma;
  withSession?(session: Session): LifecycleContext;
  __constructionTransaction?: true;
  sudo(): LifecycleSudo;
  transaction?<T>(callback: (context: LifecycleContext) => Promise<T>, options?: { timeout?: number }): Promise<T>;
};
type LifecycleResourceRecord = KeystoneQueryRecord & { status?: string };
type IdempotencyRecord = KeystoneQueryRecord & {
  key?: string;
  requestHash?: string;
  status?: string;
  resourceId?: string;
  fromStatus?: string;
  toStatus?: string;
  agentAction?: { id?: string } | null;
  lockedAt?: string | Date | null;
};

function requireCreate(sudo: LifecycleSudo, listKey: string) {
  const createOne = sudo.db[listKey]?.createOne;
  if (!createOne) throw new Error(`${listKey} create mutation is unavailable`);
  return createOne;
}

function requireUpdate(sudo: LifecycleSudo, listKey: string) {
  const updateOne = sudo.db[listKey]?.updateOne;
  if (!updateOne) throw new Error(`${listKey} update mutation is unavailable`);
  return updateOne;
}

async function runLifecycleTransaction<T>(
  context: LifecycleContext,
  callback: (transactionContext: LifecycleContext) => Promise<T>,
): Promise<T> {
  if (context.__constructionTransaction) return callback(context);
  if (!context.transaction) throw new Error("Transactional lifecycle context is required");
  return context.transaction(callback, { timeout: 30_000 });
}

async function compareAndSetStatus(
  sudo: LifecycleSudo,
  listKey: LifecycleListKey,
  id: string,
  fromStatus: string,
  toStatus: string,
  metadata: Record<string, unknown>,
) {
  const prismaKey = `${listKey[0].toLowerCase()}${listKey.slice(1)}`;
  const updateMany = sudo.prisma?.[prismaKey]?.updateMany;
  if (updateMany) {
    const updated = await updateMany({ where: { id, status: fromStatus }, data: { status: toStatus, ...metadata } });
    if (updated.count !== 1) throw new Error(`${listKey} changed concurrently; reload before retrying`);
    return;
  }
  await requireUpdate(sudo, listKey)({ where: { id }, data: { status: toStatus, ...metadata } });
}

async function applyFinancialTransitionEffects(
  sudo: LifecycleSudo,
  listKey: LifecycleListKey,
  id: string,
  toStatus: string,
) {
  const prisma = sudo.prisma;
  if (listKey === "BudgetChange" && toStatus === "posted") {
    if (!prisma?.$queryRawUnsafe || !prisma.$executeRawUnsafe) throw new Error("Transactional budget revision is unavailable");
    const [change] = await prisma.$queryRawUnsafe<Array<{ total: bigint; budgetId: string; projectId: string; currency: string; budgetCurrency: string; budgetStatus: string }>>(
      `SELECT change."totalAmountMinor" AS total, change.budget AS "budgetId", change.project AS "projectId", change."currencyCode" AS currency,
              budget."currencyCode" AS "budgetCurrency", budget.status::text AS "budgetStatus"
       FROM "BudgetChange" change JOIN "Budget" budget ON budget.id = change.budget
       WHERE change.id = $1 FOR UPDATE OF change, budget`, id,
    );
    if (!change || change.budgetStatus !== "active" || change.currency !== "USD" || change.budgetCurrency !== change.currency) throw new Error("Budget revision requires its active same-currency budget");
    const lines = await prisma.$queryRawUnsafe<Array<{ amount: bigint; lineId: string; codeId: string; sourceCodeId: string; budgetId: string; projectId: string }>>(
      `SELECT entry."amountMinor" AS amount, line.id AS "lineId", line."budgetCode" AS "codeId", entry."budgetCode" AS "sourceCodeId", line.budget AS "budgetId", line.project AS "projectId"
       FROM "BudgetChangeLineItem" entry JOIN "BudgetLineItem" line ON line.id = entry."budgetLineItem"
       WHERE entry."budgetChange" = $1 ORDER BY line.id FOR UPDATE OF entry, line`, id,
    );
    const [count] = await prisma.$queryRawUnsafe<Array<{ count: number }>>('SELECT COUNT(*)::int AS count FROM "BudgetChangeLineItem" WHERE "budgetChange" = $1', id);
    if (!lines.length || count.count !== lines.length || lines.reduce((total, line) => total + line.amount, BigInt(0)) !== change.total ||
        lines.some(line => line.budgetId !== change.budgetId || line.projectId !== change.projectId || line.codeId !== line.sourceCodeId)) throw new Error("Budget revision lines must exactly match the approved budget and total");
    for (const line of lines) {
      const updated = await prisma.$executeRawUnsafe(
        `UPDATE "BudgetLineItem" SET "approvedChangesMinor" = "approvedChangesMinor" + $1,
          "revisedAmountMinor" = "revisedAmountMinor" + $1, "projectedOverUnderMinor" = "projectedOverUnderMinor" + $1, "updatedAt" = CURRENT_TIMESTAMP
         WHERE id = $2 AND "revisedAmountMinor" + $1 >= 0`, line.amount, line.lineId,
      );
      if (updated !== 1) throw new Error("Budget revision would make a line negative");
    }
    const updated = await prisma.$executeRawUnsafe('UPDATE "Budget" SET "totalRevisedMinor" = "totalRevisedMinor" + $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2 AND "totalRevisedMinor" + $1 >= 0', change.total, change.budgetId);
    if (updated !== 1) throw new Error("Budget revision would make the budget negative");
    return;
  }
  if (listKey === "Commitment" && toStatus === "cancelled") {
    if (!prisma?.$queryRawUnsafe || !prisma.$executeRawUnsafe) throw new Error("Transactional commitment cancellation is unavailable");
    const [commitment] = await prisma.$queryRawUnsafe<Array<{ projectId: string }>>('SELECT project AS "projectId" FROM "Commitment" WHERE id = $1 FOR UPDATE', id);
    if (!commitment) throw new Error("Commitment not found");
    const [claims] = await prisma.$queryRawUnsafe<Array<{ count: number }>>('SELECT COUNT(*)::int AS count FROM "ProgressClaim" WHERE commitment = $1', id);
    if (claims.count) throw new Error("A commitment with claim evidence cannot be cancelled as an unperformed draft");
    const lines = await prisma.$queryRawUnsafe<Array<{ codeId: string; amount: bigint }>>('SELECT "budgetCode" AS "codeId", "revisedValueMinor" AS amount FROM "ContractLineItem" WHERE commitment = $1 ORDER BY "budgetCode", id FOR UPDATE', id);
    const byCode = new Map<string, bigint>();
    for (const line of lines) {
      if (!line.codeId || line.amount < BigInt(0)) throw new Error("Commitment cancellation requires valid budget-coded lines");
      byCode.set(line.codeId, (byCode.get(line.codeId) || BigInt(0)) + line.amount);
    }
    for (const [codeId, amount] of byCode) {
      const [line] = await prisma.$queryRawUnsafe<Array<{ id: string; budgetId: string }>>(
        `SELECT line.id, line.budget AS "budgetId" FROM "BudgetLineItem" line JOIN "Budget" budget ON budget.id = line.budget
         WHERE line.project = $1 AND line."budgetCode" = $2 AND budget.status = 'active' FOR UPDATE OF line, budget`, commitment.projectId, codeId,
      );
      if (!line) throw new Error("Active budget line for commitment cancellation is unavailable");
      const updated = await prisma.$executeRawUnsafe(
        `UPDATE "BudgetLineItem" SET "committedAmountMinor" = "committedAmountMinor" - $1,
          "projectedFinalCostMinor" = "projectedFinalCostMinor" - $1, "projectedOverUnderMinor" = "projectedOverUnderMinor" + $1, "updatedAt" = CURRENT_TIMESTAMP
         WHERE id = $2 AND "committedAmountMinor" >= $1 AND "projectedFinalCostMinor" >= $1`, amount, line.id,
      );
      const header = await prisma.$executeRawUnsafe('UPDATE "Budget" SET "totalCommittedMinor" = "totalCommittedMinor" - $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2 AND "totalCommittedMinor" >= $1', amount, line.budgetId);
      if (updated !== 1 || header !== 1) throw new Error("Commitment cancellation would violate budget conservation");
    }
    return;
  }
  if (listKey === "ProgressClaim" && toStatus === "approved") {
    if (!prisma?.$queryRawUnsafe || !prisma.$executeRawUnsafe) throw new Error("Transactional claim rollup is unavailable");
    const [claim] = await prisma.$queryRawUnsafe<Array<{ commitmentId: string | null; primeContractId: string | null }>>(
      `SELECT commitment AS "commitmentId", "primeContract" AS "primeContractId" FROM "ProgressClaim" WHERE id = $1 FOR UPDATE`, id,
    );
    if (!claim || Boolean(claim.commitmentId) === Boolean(claim.primeContractId)) throw new Error("Approved claim must reference exactly one contract");
    if (claim.commitmentId) {
      await prisma.$executeRawUnsafe(
        `UPDATE "Commitment" SET "invoicedToDateMinor" = (
          SELECT COALESCE(SUM("currentPaymentDueMinor"), 0)::bigint FROM "ProgressClaim"
          WHERE commitment = $1 AND status IN ('approved','partially_paid','paid','closed')
        ) WHERE id = $1`, claim.commitmentId,
      );
    } else if (claim.primeContractId) {
      await prisma.$executeRawUnsafe(
        `UPDATE "PrimeContract" SET "billedToDateMinor" = (
          SELECT COALESCE(SUM("currentPaymentDueMinor"), 0)::bigint FROM "ProgressClaim"
          WHERE "primeContract" = $1 AND status IN ('approved','partially_paid','paid','closed')
        ) WHERE id = $1`, claim.primeContractId,
      );
    }
    return;
  }
  if (listKey !== "ChangeOrder" || toStatus !== "posted") return;
  if (!prisma?.$queryRawUnsafe || !prisma.$executeRawUnsafe) throw new Error("Transactional change-order rollup is unavailable");
  const [order] = await prisma.$queryRawUnsafe<Array<{
    direction: string;
    totalMinor: bigint;
    primeContractId: string | null;
    commitmentId: string | null;
    projectId: string;
  }>>(
    `SELECT direction::text, "totalMinor", "primeContract" AS "primeContractId", commitment AS "commitmentId", project AS "projectId"
     FROM "ChangeOrder" WHERE id = $1 FOR UPDATE`,
    id,
  );
  if (!order) throw new Error("Posted change order is unavailable for rollup");
  const lines = await prisma.$queryRawUnsafe<Array<{
    amountMinor: bigint;
    budgetCodeId: string | null;
    contractLineItemId: string | null;
  }>>(
    `SELECT "amountMinor", "budgetCode" AS "budgetCodeId", "contractLineItem" AS "contractLineItemId"
     FROM "ChangeOrderLineItem" WHERE "changeOrder" = $1 ORDER BY "lineNumber" ASC FOR UPDATE`,
    id,
  );
  if (lines.length === 0) throw new Error("Posted change order requires line items for rollup");
  const lineTotal = lines.reduce((total, line) => total + line.amountMinor, BigInt(0));
  if (lineTotal !== order.totalMinor) throw new Error("Change-order header and line totals must match before posting");
  if (order.direction === "owner") {
    if (!order.primeContractId || order.commitmentId) throw new Error("Owner change order requires exactly one prime contract");
    const updated = await prisma.$executeRawUnsafe(
      `UPDATE "PrimeContract" SET "approvedChangesMinor" = "approvedChangesMinor" + $1,
       "revisedContractMinor" = "revisedContractMinor" + $1 WHERE id = $2 AND "revisedContractMinor" + $1 >= 0`,
      order.totalMinor, order.primeContractId,
    );
    if (updated !== 1) throw new Error("Prime-contract change rollup failed");
  } else {
    if (!order.commitmentId || order.primeContractId) throw new Error("Commitment change order requires exactly one commitment");
    const updated = await prisma.$executeRawUnsafe(
      `UPDATE "Commitment" SET "approvedChangesMinor" = "approvedChangesMinor" + $1,
       "revisedContractMinor" = "revisedContractMinor" + $1 WHERE id = $2 AND "revisedContractMinor" + $1 >= 0`,
      order.totalMinor, order.commitmentId,
    );
    if (updated !== 1) throw new Error("Commitment change rollup failed");
  }
  for (const line of lines) {
    if (line.contractLineItemId) {
      const updated = await prisma.$executeRawUnsafe(
        `UPDATE "ContractLineItem" SET "approvedChangesMinor" = "approvedChangesMinor" + $1,
         "revisedValueMinor" = "revisedValueMinor" + $1 WHERE id = $2 AND "revisedValueMinor" + $1 >= 0`,
        line.amountMinor, line.contractLineItemId,
      );
      if (updated !== 1) throw new Error("Contract schedule-of-values rollup failed");
    }
    if (order.direction === "commitment") {
      if (!line.budgetCodeId) throw new Error("Commitment change lines require a budget code for project cost rollup");
      const [budgetLine] = await prisma.$queryRawUnsafe<Array<{ id: string; budgetId: string }>>(
        `SELECT line.id, line.budget AS "budgetId" FROM "BudgetLineItem" line
         JOIN "Budget" budget ON budget.id = line.budget
         WHERE line.project = $1 AND line."budgetCode" = $2 AND budget.status = 'active'
         ORDER BY line."createdAt" ASC LIMIT 1 FOR UPDATE OF line, budget`,
        order.projectId, line.budgetCodeId,
      );
      if (!budgetLine) throw new Error("Commitment change requires a matching active budget line");
      const budgetUpdated = await prisma.$executeRawUnsafe(
        `UPDATE "BudgetLineItem" SET "committedAmountMinor" = "committedAmountMinor" + $1,
         "projectedFinalCostMinor" = "projectedFinalCostMinor" + $1,
         "projectedOverUnderMinor" = "projectedOverUnderMinor" - $1
         WHERE id = $2 AND "committedAmountMinor" + $1 >= 0 AND "projectedFinalCostMinor" + $1 >= 0`,
        line.amountMinor, budgetLine.id,
      );
      if (budgetUpdated !== 1) throw new Error("Deductive change would make budget commitment or forecast negative");
      const budgetHeaderUpdated = await prisma.$executeRawUnsafe(
        `UPDATE "Budget" SET "totalCommittedMinor" = "totalCommittedMinor" + $1
         WHERE id = $2 AND "totalCommittedMinor" + $1 >= 0`,
        line.amountMinor, budgetLine.budgetId,
      );
      if (budgetHeaderUpdated !== 1) throw new Error("Deductive change would make the budget commitment total negative");
    }
  }
}

async function applyWorkflowTransitionEffects(
  sudo: LifecycleSudo,
  listKey: LifecycleListKey,
  id: string,
  fromStatus: string,
  toStatus: string,
) {
  const prisma = sudo.prisma;
  if (listKey === "Estimate" && toStatus === "issued") {
    if (!prisma?.$executeRawUnsafe) throw new Error("Transactional estimate issue is unavailable");
    // Issuing the estimate issues and locks exactly its current version.
    const issued = await prisma.$executeRawUnsafe(
      `UPDATE "EstimateVersion" SET status = 'issued', "issuedAt" = CURRENT_TIMESTAMP, "lockedAt" = CURRENT_TIMESTAMP
       WHERE id = (SELECT "currentVersion" FROM "Estimate" WHERE id = $1) AND status = 'draft' AND "lockedAt" IS NULL`,
      id,
    );
    if (issued !== 1) throw new Error("The estimate's current version must be an unissued draft before it can be issued");
  }
  if (listKey === "Submittal" && fromStatus === "revise_resubmit" && toStatus === "submitted") {
    if (!prisma?.$executeRawUnsafe) throw new Error("Transactional submittal resubmission is unavailable");
    // A resubmission starts a new review round; earlier review decisions stay as history.
    await prisma.$executeRawUnsafe(`UPDATE "Submittal" SET revision = COALESCE(revision, 0) + 1 WHERE id = $1`, id);
  }
}

function transitionMetadata(listKey: LifecycleListKey, toStatus: string, now: Date) {
  const atomic: Record<string, unknown> = {};
  const actor: Record<string, unknown> = {};
  if (listKey === "Project" && toStatus === "completed") atomic.actualCompletionDate = now;
  if (listKey === "BidPackage" && toStatus === "open") atomic.issuedAt = now;
  if (listKey === "BidPackage" && toStatus === "closed") atomic.closedAt = now;
  if (listKey === "BudgetChange" && toStatus === "approved") atomic.reviewedAt = now;
  if (listKey === "BudgetChange" && toStatus === "posted") atomic.postedAt = now;
  if (listKey === "PrimeContract" && toStatus === "executed") atomic.executedAt = now;
  if (listKey === "Commitment" && toStatus === "executed") atomic.executedAt = now;
  if (listKey === "ChangeOrder" && toStatus === "approved") atomic.approvedAt = now;
  if (listKey === "ChangeOrder" && toStatus === "executed") atomic.executedAt = now;
  if (listKey === "RFI" && toStatus === "open") atomic.openedAt = now;
  if (listKey === "RFI" && toStatus === "answered") atomic.answeredAt = now;
  if (listKey === "RFI" && toStatus === "closed") atomic.closedAt = now;
  if (listKey === "Submittal" && toStatus === "submitted") atomic.submittedAt = now;
  if (listKey === "Submittal" && toStatus === "closed") atomic.closedAt = now;
  if (listKey === "ProgressClaim" && toStatus === "submitted") atomic.submittedAt = now;
  if (listKey === "ProgressClaim" && toStatus === "approved") atomic.approvedAt = now;
  if (listKey === "SafetyIncident" && toStatus === "closed") atomic.closedAt = now;
  if (listKey === "Inspection" && toStatus === "in_progress") atomic.startedAt = now;
  if (listKey === "Inspection" && ["passed", "failed"].includes(toStatus)) atomic.completedAt = now;
  if (listKey === "Schedule" && toStatus === "published") atomic.publishedAt = now;
  if (listKey === "ScheduleTask" && toStatus === "in_progress") atomic.actualStart = now;
  if (listKey === "ScheduleTask" && toStatus === "completed") atomic.actualFinish = now;
  if (listKey === "DailyLog" && toStatus === "submitted") atomic.submittedAt = now;
  if (listKey === "DailyLog" && toStatus === "approved") atomic.approvedAt = now;
  if (listKey === "PunchItem" && toStatus === "ready_for_review") atomic.completedAt = now;
  if (listKey === "PunchItem" && toStatus === "closed") atomic.closedAt = now;
  if (listKey === "SafetyObservation" && toStatus === "resolved") atomic.resolvedAt = now;
  if (listKey === "CorrectiveAction" && toStatus === "ready_for_verification") atomic.completedAt = now;
  if (listKey === "CorrectiveAction" && toStatus === "verified") atomic.verifiedAt = now;
  if (listKey === "Payment" && toStatus === "settled") atomic.settledAt = now;
  if (listKey === "RetainageRelease" && toStatus === "approved") atomic.approvedAt = now;
  if (listKey === "RetainageRelease" && toStatus === "released") atomic.releasedAt = now;
  if (listKey === "LienWaiver" && toStatus === "received") atomic.receivedAt = now;
  if (listKey === "ProcurementRequest" && toStatus === "submitted") atomic.submittedAt = now;
  if (listKey === "ProcurementRequest" && toStatus === "approved") atomic.approvedAt = now;
  if (listKey === "ProcurementRequest" && toStatus === "ordered") atomic.orderedAt = now;
  if (listKey === "ProcurementRequest" && toStatus === "closed") atomic.closedAt = now;

  if (listKey === "BudgetChange" && toStatus === "approved") actor.reviewedBy = true;
  if (listKey === "ChangeOrder" && toStatus === "approved") actor.approvedBy = true;
  if (listKey === "ProgressClaim" && toStatus === "approved") actor.reviewedBy = true;
  if (listKey === "DailyLog" && toStatus === "approved") actor.approvedBy = true;
  if (listKey === "CorrectiveAction" && toStatus === "verified") actor.verifiedBy = true;
  if (listKey === "Schedule" && toStatus === "published") actor.publishedBy = true;
  if (listKey === "RetainageRelease" && toStatus === "approved") actor.approvedBy = true;
  if (listKey === "ProcurementRequest" && toStatus === "approved") actor.approvedBy = true;
  return { atomic, actor };
}

const lifecycleConfigs = {
  transitionProjectStatus: { listKey: "Project", permission: "canManageProjects", requiredScope: "projects:write", projectRoot: true },
  transitionBidPackageStatus: { listKey: "BidPackage", permission: "canManagePreconstruction", requiredScope: "preconstruction:write" },
  transitionEstimateStatus: { listKey: "Estimate", permission: "canManagePreconstruction", requiredScope: "preconstruction:write" },
  transitionBudgetChangeStatus: { listKey: "BudgetChange", permission: "canManageFinancials", requiredScope: "financials:write" },
  transitionPrimeContractStatus: { listKey: "PrimeContract", permission: "canManageContracts", requiredScope: "contracts:write" },
  transitionCommitmentStatus: { listKey: "Commitment", permission: "canManageContracts", requiredScope: "contracts:write" },
  transitionChangeEventStatus: { listKey: "ChangeEvent", permission: "canManageContracts", requiredScope: "contracts:write" },
  transitionChangeOrderStatus: { listKey: "ChangeOrder", permission: "canManageContracts", requiredScope: "contracts:write" },
  transitionRfiStatus: { listKey: "RFI", permission: "canManageProjectExecution", requiredScope: "execution:write" },
  transitionSubmittalStatus: { listKey: "Submittal", permission: "canManageProjectExecution", requiredScope: "execution:write" },
  transitionProgressClaimStatus: { listKey: "ProgressClaim", permission: "canManageBilling", requiredScope: "billing:write" },
  transitionSafetyIncidentStatus: { listKey: "SafetyIncident", permission: "canManageSafety", requiredScope: "safety:write" },
  transitionInspectionStatus: { listKey: "Inspection", permission: "canManageSafety", requiredScope: "safety:write" },
  transitionScheduleStatus: { listKey: "Schedule", permission: "canManageProjectExecution", requiredScope: "execution:write" },
  transitionScheduleTaskStatus: { listKey: "ScheduleTask", permission: "canManageProjectExecution", requiredScope: "execution:write" },
  transitionDailyLogStatus: { listKey: "DailyLog", permission: "canManageFieldOperations", requiredScope: "field:write" },
  transitionPunchItemStatus: { listKey: "PunchItem", permission: "canManageFieldOperations", requiredScope: "field:write" },
  transitionSafetyObservationStatus: { listKey: "SafetyObservation", permission: "canManageSafety", requiredScope: "safety:write" },
  transitionCorrectiveActionStatus: { listKey: "CorrectiveAction", permission: "canManageSafety", requiredScope: "safety:write" },
  transitionPaymentStatus: { listKey: "Payment", permission: "canManageBilling", requiredScope: "billing:write" },
  transitionRetainageReleaseStatus: { listKey: "RetainageRelease", permission: "canManageBilling", requiredScope: "billing:write" },
  transitionLienWaiverStatus: { listKey: "LienWaiver", permission: "canManageBilling", requiredScope: "billing:write" },
  transitionProcurementRequestStatus: { listKey: "ProcurementRequest", permission: "canManageContracts", requiredScope: "contracts:write" },
} as const satisfies Record<string, LifecycleConfig>;

export type LifecycleMutationName = keyof typeof lifecycleConfigs;

export function getLifecycleActionPolicy(action: string): LifecycleConfig | null {
  return Object.prototype.hasOwnProperty.call(lifecycleConfigs, action)
    ? lifecycleConfigs[action as LifecycleMutationName]
    : null;
}

function requireSession(context: LifecycleContext): Session {
  const session = context.session as Session | undefined;
  if (!session?.itemId) throw new Error("Authentication required");
  return session;
}

function normalizeIdempotencyKey(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const normalized = value.trim();
  if (!normalized) throw new Error("Idempotency key cannot be empty");
  if (normalized.length > 200) throw new Error("Idempotency key must be at most 200 characters");
  return normalized;
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function lifecycleRequestHash(
  operation: string,
  input: Pick<LifecycleTransitionInput, "id" | "toStatus" | "reason" | "agentActionId">,
): string {
  return digest([operation, input.id, input.toStatus, input.reason, input.agentActionId ?? ""].join("\u001f"));
}

async function loadResource(
  context: LifecycleContext,
  config: LifecycleConfig,
  id: string,
): Promise<LifecycleResourceRecord | null> {
  return queryById(
    context,
    config.listKey,
    id,
    config.projectRoot
      ? "id status company { id }"
      : "id status company { id } project { id }",
  ) as Promise<LifecycleResourceRecord | null>;
}

async function validateApprovedAgentAction(args: {
  context: LifecycleContext;
  session: Session;
  actionId: string;
  expectedAction: LifecycleMutationName;
  config: LifecycleConfig;
  resourceId: string;
  toStatus: string;
  companyId: string;
  projectId: string;
}) {
  // Reject mismatched IDs before acquiring another tenant's grant locks. This
  // preview is not authority: every binding/state is read again under locks.
  const preview = await queryById(args.context, "AgentAction", args.actionId, "id status action targetType targetId targetStatus company { id } project { id }");
  if (!preview || preview.company?.id !== args.companyId || preview.project?.id !== args.projectId) throw new Error("Agent action tenant scope does not match this transition");
  if (preview.action !== args.expectedAction) throw new Error("Agent action operation does not match this transition");
  if (preview.targetType !== args.config.listKey || preview.targetId !== args.resourceId) throw new Error("Agent action target does not match this transition");
  if (preview.targetStatus !== args.toStatus) throw new Error("Agent action target status does not match this transition");
  const discovered = await discoverAgentAction(args.context, args.actionId);
  if (discovered.companyId !== args.companyId || discovered.projectId !== args.projectId) throw new Error("Agent action tenant scope does not match this transition");
  const { action, identity } = await lockAgentActionChain(args.context, discovered, args.config.requiredScope);
  if (action.status !== "approved") throw new Error("Agent action must be approved before execution");
  if (!action.requestedById) throw new Error("Agent action requester attribution is unavailable");
  if (action.action !== args.expectedAction) throw new Error("Agent action operation does not match this transition");
  if (action.targetType !== args.config.listKey || action.targetId !== args.resourceId) throw new Error("Agent action target does not match this transition");
  if (action.targetStatus !== args.toStatus) throw new Error("Agent action target status does not match this transition");
  if (identity.approvalMode !== "none" && (!action.reviewedById || action.reviewedById === action.requestedById)) throw new Error("The current identity policy requires independent human review");
  if (!scopeAllows(action.requiredScope, args.config.requiredScope)) throw new Error("Agent action does not grant the required scope");
  assertAgentPrincipal(args.session, args.companyId, args.projectId, args.config.permission, identity.ownerId);
  return action;
}

async function prepareIdempotency(args: {
  context: LifecycleContext;
  key: string | null;
  operation: string;
  requestHash: string;
  companyId: string;
  projectId: string;
  resourceType: string;
  resourceId: string;
}) {
  if (!args.key) return { record: null, replay: null };
  const fingerprint = digest(`${args.companyId}\u001f${args.operation}\u001f${args.key}`);
  const existing = await queryOne(
    args.context,
    "IdempotencyKey",
    { fingerprint },
    "id key requestHash status resourceId fromStatus toStatus lockedAt agentAction { id }",
  ) as IdempotencyRecord | null;
  if (existing) {
    if (existing.requestHash !== args.requestHash) {
      throw new Error("Idempotency key was already used with a different request");
    }
    if (existing.status === "completed" && existing.resourceId && existing.fromStatus && existing.toStatus && existing.agentAction?.id) {
      return {
        record: existing,
        replay: {
          success: true,
          itemId: existing.resourceId,
          fromStatus: existing.fromStatus,
          toStatus: existing.toStatus,
          actionId: existing.agentAction.id,
          replayed: true,
        } satisfies TransitionResult,
      };
    }
    const lockedAt = existing.lockedAt ? new Date(existing.lockedAt).getTime() : 0;
    const stale = !Number.isFinite(lockedAt) || lockedAt < Date.now() - 2 * 60_000;
    if (existing.status === "started" && !stale) {
      throw new Error("Idempotent request is already in progress");
    }
    if (typeof existing.id !== "string") throw new Error("Idempotency record is missing its id");
    const sudo = args.context.sudo();
    const claimLease = sudo.prisma?.idempotencyKey?.updateMany;
    if (!claimLease) throw new Error("Atomic idempotency lease recovery is unavailable");
    const now = new Date();
    const claimed = await claimLease({
      where: {
        id: existing.id,
        requestHash: args.requestHash,
        OR: [
          { status: "failed" },
          { status: "started", lockedAt: { lt: new Date(now.getTime() - 2 * 60_000) } },
        ],
      },
      data: {
        status: "started",
        errorCode: "",
        lockedAt: now,
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      },
    });
    if (claimed.count !== 1) throw new Error("Idempotent request lease was acquired by another worker");
    const record = await queryById(args.context, "IdempotencyKey", existing.id, "id key requestHash status resourceId fromStatus toStatus lockedAt agentAction { id }") as IdempotencyRecord | null;
    if (!record) throw new Error("Recovered idempotency record is unavailable");
    return { record, replay: null };
  }

  const record = await requireCreate(args.context.sudo(), "IdempotencyKey")({
    data: {
      fingerprint,
      key: args.key,
      operation: args.operation,
      requestHash: args.requestHash,
      status: "started",
      resourceType: args.resourceType,
      resourceId: args.resourceId,
      company: { connect: { id: args.companyId } },
      project: { connect: { id: args.projectId } },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  return { record, replay: null };
}

async function completeLifecycleTransition(args: {
  context: LifecycleContext;
  config: LifecycleConfig;
  mutationName: LifecycleMutationName;
  input: LifecycleTransitionInput;
  resource: LifecycleResourceRecord & { status: string };
  action: MutationRecord;
  idempotency: { record: MutationRecord | IdempotencyRecord | null };
  companyId: string;
  projectId: string;
}) {
  return runLifecycleTransaction(args.context, async transactionContext => {
    const sudo = transactionContext.sudo();
    if (args.config.listKey === "Inspection") {
      if (!sudo.prisma?.$queryRawUnsafe) throw new Error("Inspection lifecycle lock is unavailable");
      await sudo.prisma.$queryRawUnsafe(`SELECT id FROM "Inspection" WHERE id = $1 FOR UPDATE`, args.input.id);
    }
    await assertTransitionPrerequisites(
      transactionContext as unknown as KeystoneContextLike,
      args.config.listKey,
      args.input.id,
      args.input.toStatus,
    );
    const metadata = transitionMetadata(args.config.listKey, args.input.toStatus, new Date());
    await compareAndSetStatus(
      sudo,
      args.config.listKey,
      args.input.id,
      args.resource.status,
      args.input.toStatus,
      metadata.atomic,
    );
    await applyFinancialTransitionEffects(sudo, args.config.listKey, args.input.id, args.input.toStatus);
    await applyWorkflowTransitionEffects(sudo, args.config.listKey, args.input.id, args.resource.status, args.input.toStatus);
    if (Object.keys(metadata.actor).length > 0) {
      await requireUpdate(sudo, args.config.listKey)({
        where: { id: args.input.id },
        data: Object.fromEntries(Object.keys(metadata.actor).map(field => [field, { connect: { id: transactionContext.session!.itemId } }])),
      });
    }
    if (args.input.agentActionId) await compareAndSetAgentAction(transactionContext, args.action.id, "running", "succeeded");
    await requireUpdate(sudo, "AgentAction")({
      where: { id: args.action.id },
      data: {
        ...(!args.input.agentActionId ? { status: "succeeded" } : {}),
        resultDigest: digest(`${args.input.id}\u001f${args.resource.status}\u001f${args.input.toStatus}`),
        completedAt: new Date(),
      },
    });
    const payload = JSON.stringify({
      schemaVersion: 1,
      eventType: `${args.config.listKey}.status_changed`,
      aggregateType: args.config.listKey,
      aggregateId: args.input.id,
      fromStatus: args.resource.status,
      toStatus: args.input.toStatus,
      companyId: args.companyId,
      projectId: args.projectId,
      actionId: args.action.id,
    });
    const createOutbox = sudo.db.OutboxMessage?.createOne;
    if (createOutbox) {
      await createOutbox({
        data: {
          messageKey: `${args.mutationName}:${args.action.id}`,
          eventType: `${args.config.listKey}.status_changed`,
          aggregateType: args.config.listKey,
          aggregateId: args.input.id,
          canonicalPayload: payload,
          payloadDigest: digest(payload),
          status: "pending",
          company: { connect: { id: args.companyId } },
          project: { connect: { id: args.projectId } },
          agentAction: { connect: { id: args.action.id } },
        },
      });
    }
    if (args.idempotency.record?.id) {
      await requireUpdate(sudo, "IdempotencyKey")({
        where: { id: args.idempotency.record.id },
        data: {
          status: "completed",
          fromStatus: args.resource.status,
          toStatus: args.input.toStatus,
          agentAction: { connect: { id: args.action.id } },
        },
      });
    }
  });
}

export function createLifecycleResolver(mutationName: LifecycleMutationName) {
  const config: LifecycleConfig = lifecycleConfigs[mutationName];

  return async function resolveLifecycle(
    _root: unknown,
    { input }: { input: LifecycleTransitionInput },
    context: LifecycleContext,
  ): Promise<TransitionResult> {
    const session = requireSession(context);
    if (!input?.id || typeof input.id !== "string") throw new Error("A resource id is required");
    if (!input.toStatus || typeof input.toStatus !== "string") throw new Error("A target status is required");

    if (hasNativeAuthorityPort(context) && !context.__constructionTransaction) {
      if (!context.transaction) throw new Error("Transactional lifecycle context is required");
      return context.transaction(async tx => {
        const record = await loadResource(tx, config, input.id);
        const companyId = record?.company?.id;
        const projectId = config.projectRoot ? record?.id : record?.project?.id;
        if (!companyId || !projectId) throw new Error(`${config.listKey} not found`);
        const fresh = await lockCurrentAuthority(tx, companyId, projectId, config.permission);
        const current = tx.withSession ? tx.withSession(fresh) : tx;
        // All key/action/status/ledger/outbox writes now share this native transaction.
        return resolveLifecycle(_root, { input }, { ...current, __constructionTransaction: true });
      }, { timeout: 30_000 });
    }

    const reason = normalizeTransitionReason(input.reason);
    const idempotencyKey = normalizeIdempotencyKey(input.idempotencyKey);
    const sudo = context.sudo();
    const resource = await loadResource(context, config, input.id);
    if (!resource) throw new Error(`${config.listKey} not found`);
    if (typeof resource.status !== "string") throw new Error(`${config.listKey} is missing lifecycle status`);

    const companyId = resource.company?.id;
    const projectId = config.projectRoot ? resource.id : resource.project?.id;
    if (!companyId || !projectId) throw new Error(`${config.listKey} is missing tenant relationships`);
    if (!hasProjectPermission(session, companyId, projectId, config.permission, true)) {
      throw new Error("Not authorized for this transition");
    }
    if (!(await canAccessProjectById(context, session.itemId, projectId, true))) {
      throw new Error("Not authorized for this project");
    }

    const requestHash = lifecycleRequestHash(mutationName, {
      id: input.id,
      toStatus: input.toStatus,
      reason,
      agentActionId: input.agentActionId,
    });
    const idempotency = await prepareIdempotency({
      context,
      key: idempotencyKey,
      operation: mutationName,
      requestHash,
      companyId,
      projectId,
      resourceType: config.listKey,
      resourceId: input.id,
    });
    if (idempotency.replay) return idempotency.replay;

    let action: MutationRecord;
    try {
      if (input.agentActionId) {
        const approvedAction = await validateApprovedAgentAction({
          context,
          session,
          actionId: input.agentActionId,
          expectedAction: mutationName,
          config,
          resourceId: input.id,
          toStatus: input.toStatus,
          companyId,
          projectId,
        });
        await compareAndSetAgentAction(context, approvedAction.id, "approved", "running");
        action = await requireUpdate(sudo, "AgentAction")({
          where: { id: approvedAction.id },
          data: {
            actorUser: { connect: { id: session.itemId } },
            startedAt: new Date(),
            ...(idempotency.record ? { idempotencyKey: { connect: { id: idempotency.record.id } } } : {}),
          },
        });
      } else {
        action = await requireCreate(sudo, "AgentAction")({
          data: {
            actionKey: randomUUID(),
            actorType: session.authType === "api_key" ? "agent" : "human",
            action: mutationName,
            requiredScope: config.requiredScope,
            status: "running",
            targetType: config.listKey,
            targetId: input.id,
            targetStatus: input.toStatus,
            reason,
            requestDigest: requestHash,
            requestedAt: new Date(),
            startedAt: new Date(),
            company: { connect: { id: companyId } },
            project: { connect: { id: projectId } },
            requestedBy: { connect: { id: session.itemId } },
            actorUser: { connect: { id: session.itemId } },
            ...(idempotency.record ? { idempotencyKey: { connect: { id: idempotency.record.id } } } : {}),
          },
        });
      }
    } catch (error) {
      if (idempotency.record?.id) {
        await requireUpdate(sudo, "IdempotencyKey")({
          where: { id: idempotency.record.id },
          data: { status: "failed", errorCode: "ACTION_VALIDATION_FAILED" },
        }).catch(() => undefined);
      }
      throw error;
    }

    try {
      assertAllowedTransition(config.listKey, resource.status, input.toStatus);
      await completeLifecycleTransition({
        context,
        config,
        mutationName,
        input,
        resource: resource as LifecycleResourceRecord & { status: string },
        action,
        idempotency,
        companyId,
        projectId,
      });
      return {
        success: true,
        itemId: input.id,
        fromStatus: resource.status,
        toStatus: input.toStatus,
        actionId: action.id,
        replayed: false,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Transition failed";
      await requireUpdate(sudo, "AgentAction")({
        where: { id: action.id },
        data: { status: "failed", errorCode: "TRANSITION_FAILED", errorMessage: message, completedAt: new Date() },
      }).catch(() => undefined);
      if (idempotency.record?.id) {
        await requireUpdate(sudo, "IdempotencyKey")({
          where: { id: idempotency.record.id },
          data: { status: "failed", errorCode: "TRANSITION_FAILED", agentAction: { connect: { id: action.id } } },
        }).catch(() => undefined);
      }
      throw error;
    }
  };
}

export const lifecycleResolvers = Object.fromEntries(
  (Object.keys(lifecycleConfigs) as LifecycleMutationName[]).map(name => [name, createLifecycleResolver(name)]),
) as Record<LifecycleMutationName, ReturnType<typeof createLifecycleResolver>>;
