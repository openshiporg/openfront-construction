import { createHash, randomBytes } from "node:crypto";

import { hasCompanyPermission } from "../access";
import { queryById } from "../domain/tenancy";
import { priceLineFromTotal } from "../domain/line-pricing";
import { lockBidSubmissionAdmission } from "../domain/bid-submissions";
import { incidentClassification } from "./safety-private";
import { lockActiveSubmittalReviewStep, lockExecutionAdmission, lockSubmittalRevision } from "../domain/execution-admission";
import { resourceAuthority, validateResourceFact } from "../domain/resource-activity";
import { validateResourceOccurrence } from "../domain/resource-fact";
import { decodeResourceIntent, encodeResourceIntent } from "../domain/resource-intent";
import { assertSettlementCompatibility, deriveClaimPaymentStatus, remainingCapacityMinor } from "../domain/billing-invariants";
import { quantityToUnits, receiptCapacityIsValid } from "../domain/procurement-invariants";
import {
  executeProjectCommand,
  optionalDate,
  requireCommandSession,
  requireCreate,
  requireUpdate,
  requiredText,
  type CommandContext,
  type CommandResult,
} from "./construction";

export type ConstructionWorkflowInput = {
  intentVersion?: number | null;
  intentActorId?: string | null;
  intentPrincipalId?: string | null;
  intentCompanyId?: string | null;
  intentCurrencyCode?: string | null;
  projectId: string;
  reference: string;
  title: string;
  description?: string | null;
  dueAt?: string | null;
  occurredAt?: string | null;
  amountMinor?: string | null;
  relatedId?: string | null;
  secondaryId?: string | null;
  partnerId?: string | null;
  userId?: string | null;
  roleId?: string | null;
  type?: string | null;
  quantity?: string | null;
  unit?: string | null;
  evidenceReference?: string | null;
  evidenceChecksumSha256?: string | null;
  incidentType?: string | null;
  idempotencyKey: string;
};

function amount(value: unknown, label = "Amount", positive = false): string {
  const normalized = requiredText(value, label, 30);
  if (!/^\d+$/.test(normalized) || BigInt(normalized) > BigInt("9223372036854775807") || (positive && BigInt(normalized) === BigInt(0))) {
    throw new Error(`${label} must be ${positive ? "positive" : "non-negative"} integer minor units`);
  }
  return normalized;
}

function signedAmount(value: unknown, label = "Amount"): string {
  const normalized = requiredText(value, label, 30);
  if (!/^-?\d+$/.test(normalized) || BigInt(normalized) === BigInt(0) || BigInt(normalized) < BigInt("-9223372036854775808") || BigInt(normalized) > BigInt("9223372036854775807")) {
    throw new Error(`${label} must be a non-zero signed integer minor-unit value`);
  }
  return normalized;
}

function decimalQuantity(value: unknown, label = "Quantity"): string {
  const normalized = requiredText(value, label, 40);
  if (!/^\d+(?:\.\d{1,4})?$/.test(normalized) || quantityToUnits(normalized) <= BigInt(0) || quantityToUnits(normalized) > BigInt("999999999999999999")) {
    throw new Error(`${label} must be a positive number with at most four decimal places`);
  }
  return normalized;
}

function checksum(value: unknown): string {
  const normalized = requiredText(value, "Evidence checksum", 64).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) throw new Error("Evidence checksum must be SHA-256 hex");
  return normalized;
}

function projectId(input: ConstructionWorkflowInput) {
  return requiredText(input.projectId, "Project id", 200);
}

async function projectCompany(context: CommandContext, id: string) {
  const project = await queryById(context, "Project", id, "id currencyCode company { id }");
  if (!project?.company?.id) throw new Error("Project not found");
  return { companyId: project.company.id, currencyCode: String(project.currencyCode ?? "USD") };
}

export async function registerTradePartner(
  _root: unknown,
  { input }: { input: ConstructionWorkflowInput },
  context: CommandContext,
): Promise<CommandResult> {
  const id = projectId(input);
  const { companyId } = await projectCompany(context, id);
  const partnerType = ["owner", "designer", "subcontractor", "vendor", "consultant", "authority"].includes(String(input.type))
    ? String(input.type) : "subcontractor";
  return executeProjectCommand({
    context, operation: "registerTradePartner", permission: "canManageCompanies", projectId: id,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "TradePartner",
    data: {
      name: requiredText(input.title, "Partner name", 240),
      legalName: input.description?.trim(),
      partnerType,
      status: "prospective",
      email: input.reference?.trim(),
      company: { connect: { id: companyId } },
    },
  });
}

export async function addBudgetLine(
  _root: unknown,
  { input }: { input: ConstructionWorkflowInput },
  context: CommandContext,
): Promise<CommandResult> {
  const id = projectId(input);
  const budgetCodeId = requiredText(input.relatedId, "Budget code id", 200);
  const original = amount(input.amountMinor, "Original budget amount");
  const active = await context.sudo().query.Budget.findMany!({
    where: { project: { id: { equals: id } }, status: { equals: "active" } }, take: 2,
    query: "id currencyCode",
  });
  const budgetId = String(active[0]?.id ?? "");
  const singleActiveBudget = active.length === 1 && Boolean(budgetId);
  const existingLines = await context.sudo().query.BudgetLineItem.findMany!({
    where: { project: { id: { equals: id } }, budget: { id: { equals: budgetId } }, budgetCode: { id: { equals: budgetCodeId } } },
    take: 2,
    query: "id originalAmountMinor revisedAmountMinor committedAmountMinor actualCostMinor projectedFinalCostMinor",
  });
  const existing = existingLines[0] as Record<string, unknown> | undefined;
  const existingLineId = existing?.id ? String(existing.id) : undefined;
  return executeProjectCommand({
    context, operation: "addBudgetLine", permission: "canManageFinancials", projectId: id,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "BudgetLineItem", ...(existingLineId ? { updateId: existingLineId } : {}),
    beforeAdmission: async () => {
      if (!singleActiveBudget) throw new Error("Exactly one active project budget is required");
      if (existingLines.length > 1) throw new Error("Duplicate budget-code lines require operator reconciliation before funding");
    },
    data: {
      description: requiredText(input.title, "Budget line description", 300),
      originalAmountMinor: original,
      revisedAmountMinor: original,
      projectedOverUnderMinor: original,
      budget: { connect: { id: budgetId } },
      budgetCode: { connect: { id: budgetCodeId } },
      project: { connect: { id } },
    },
    beforeCreate: async tx => {
      if (!tx.prisma?.$queryRawUnsafe) throw new Error("Budget-line establishment lock is unavailable");
      const [lockedBudget] = await tx.prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM "Budget" WHERE id = $1 AND project = $2 AND status = 'active' FOR UPDATE`, budgetId, id,
      );
      if (!lockedBudget) throw new Error("Active budget changed before baseline funding");
      if (existingLineId) {
        const [lockedLine] = await tx.prisma.$queryRawUnsafe<Array<{
          originalAmountMinor: bigint; revisedAmountMinor: bigint; committedAmountMinor: bigint; actualCostMinor: bigint; projectedFinalCostMinor: bigint;
        }>>(
          `SELECT "originalAmountMinor", "revisedAmountMinor", "committedAmountMinor", "actualCostMinor", "projectedFinalCostMinor"
           FROM "BudgetLineItem" WHERE id = $1 AND project = $2 AND budget = $3 AND "budgetCode" = $4 FOR UPDATE`,
          existingLineId, id, budgetId, budgetCodeId,
        );
        if (!lockedLine || Object.values(lockedLine).some(value => BigInt(value) !== BigInt(0))) {
          throw new Error("Only an untouched zero-value baseline line can be established once");
        }
      } else {
        const duplicate = await tx.prisma.$queryRawUnsafe<Array<{ id: string }>>(
          `SELECT id FROM "BudgetLineItem" WHERE project = $1 AND budget = $2 AND "budgetCode" = $3 FOR UPDATE`, id, budgetId, budgetCodeId,
        );
        if (duplicate.length) throw new Error("A budget-code line was concurrently established; reload and review its baseline");
      }
      return {
        description: requiredText(input.title, "Budget line description", 300),
        originalAmountMinor: original, revisedAmountMinor: original, projectedOverUnderMinor: original,
        budget: { connect: { id: budgetId } }, budgetCode: { connect: { id: budgetCodeId } }, project: { connect: { id } },
      };
    },
    afterCreate: async tx => {
      if (!tx.prisma?.budget?.update) throw new Error("Transactional budget rollup is unavailable");
      await tx.prisma.budget.update({ where: { id: budgetId }, data: {
        totalOriginalMinor: { increment: BigInt(original) },
        totalRevisedMinor: { increment: BigInt(original) },
      } });
    },
  });
}

/** A budget revision is distinct from establishing an untouched baseline. */
export async function createBudgetChangeWithLine(_root: unknown, { input }: { input: ConstructionWorkflowInput }, context: CommandContext): Promise<CommandResult> {
  const id = projectId(input);
  const code = requiredText(input.relatedId, "Budget code", 200);
  const change = signedAmount(input.amountMinor, "Budget change");
  let lineId = "";
  return executeProjectCommand({
    context, operation: "createBudgetChangeWithLine", permission: "canManageFinancials", projectId: id,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "BudgetChange", data: {},
    beforeCreate: async tx => {
      if (!tx.prisma?.$queryRawUnsafe) throw new Error("Budget revision locks are unavailable");
      const budgets = await tx.prisma.$queryRawUnsafe<Array<{ id: string; currencyCode: string }>>(
        'SELECT id, "currencyCode" FROM "Budget" WHERE project = $1 AND status = \'active\' ORDER BY id LIMIT 2 FOR UPDATE', id,
      );
      if (budgets.length !== 1 || budgets[0].currencyCode !== "USD") throw new Error("Exactly one active USD budget is required");
      const lines = await tx.prisma.$queryRawUnsafe<Array<{ id: string }>>(
        'SELECT line.id FROM "BudgetLineItem" line JOIN "BudgetCode" code ON code.id = line."budgetCode" WHERE line.budget = $1 AND line.project = $2 AND line."budgetCode" = $3 AND code.project = $2 ORDER BY line.id LIMIT 2 FOR UPDATE OF line, code', budgets[0].id, id, code,
      );
      if (lines.length !== 1) throw new Error("Establish one baseline line for this budget code before revising it");
      lineId = lines[0].id;
      return {
        number: requiredText(input.reference, "Budget change number", 80), title: requiredText(input.title, "Budget change title", 240),
        reason: requiredText(input.description, "Budget change reason", 4000), status: "draft", totalAmountMinor: change, currencyCode: "USD",
        requestedBy: { connect: { id: requireCommandSession(tx).itemId } }, budget: { connect: { id: budgets[0].id } }, project: { connect: { id } },
      };
    },
    afterCreate: async (tx, created) => {
      await requireCreate(tx.sudo(), "BudgetChangeLineItem")({ data: {
        description: requiredText(input.description, "Budget change reason", 500), amountMinor: change,
        budgetChange: { connect: { id: created.id } }, budgetLineItem: { connect: { id: lineId } }, budgetCode: { connect: { id: code } }, project: { connect: { id } },
      } });
    },
  });
}

export async function reversePostedDirectCost(_root: unknown, { input }: { input: ConstructionWorkflowInput }, context: CommandContext) {
  const id = projectId(input);
  const directCostId = requiredText(input.relatedId, "Direct cost id", 200);
  return executeProjectCommand({
    context, operation: "reversePostedDirectCost", permission: "canManageFinancials", projectId: id,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "DirectCost", updateId: directCostId, data: {},
    beforeCreate: async tx => {
      if (!tx.prisma?.$queryRawUnsafe || !tx.prisma.budgetLineItem?.update || !tx.prisma.budget?.update) throw new Error("Transactional cost reversal is unavailable");
      const [cost] = await tx.prisma.$queryRawUnsafe<Array<{ status: string; amountMinor: bigint; projectId: string; budgetCodeId: string }>>(
        `SELECT status::text, "amountMinor", project AS "projectId", "budgetCode" AS "budgetCodeId" FROM "DirectCost" WHERE id = $1 FOR UPDATE`, directCostId,
      );
      if (!cost || cost.projectId !== id || cost.status !== "posted") throw new Error("Only a posted project cost can be reversed");
      const [line] = await tx.prisma.$queryRawUnsafe<Array<{ id: string; budgetId: string }>>(
        `SELECT line.id, line.budget AS "budgetId" FROM "BudgetLineItem" line JOIN "Budget" budget ON budget.id = line.budget
         WHERE line.project = $1 AND line."budgetCode" = $2 AND budget.status = 'active' ORDER BY line."createdAt" ASC LIMIT 1 FOR UPDATE OF line, budget`,
        id, cost.budgetCodeId,
      );
      if (!line) throw new Error("Active budget line for the posted cost is unavailable");
      await tx.prisma.budgetLineItem.update({ where: { id: line.id }, data: {
        actualCostMinor: { decrement: cost.amountMinor }, projectedFinalCostMinor: { decrement: cost.amountMinor }, projectedOverUnderMinor: { increment: cost.amountMinor },
      } });
      await tx.prisma.budget.update({ where: { id: line.budgetId }, data: { totalActualMinor: { decrement: cost.amountMinor } } });
      return {
        status: "voided", voidedAt: optionalDate(input.occurredAt, "Reversal effective date") ?? new Date(),
        voidReason: requiredText(input.description, "Reversal reason", 2000),
        voidedBy: { connect: { id: requireCommandSession(context).itemId } },
      };
    },
  });
}

export async function createEstimateWithLine(
  _root: unknown,
  { input }: { input: ConstructionWorkflowInput },
  context: CommandContext,
): Promise<CommandResult> {
  const id = projectId(input);
  const total = amount(input.amountMinor, "Estimate line amount");
  const budgetCodeId = requiredText(input.relatedId, "Budget code id", 200);
  let versionId = "";
  return executeProjectCommand({
    context, operation: "createEstimateWithLine", permission: "canManagePreconstruction", projectId: id,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "Estimate",
    data: {
      number: requiredText(input.reference, "Estimate number", 80),
      title: requiredText(input.title, "Estimate title", 240),
      description: input.description?.trim(),
      estimator: { connect: { id: requireCommandSession(context).itemId } },
      project: { connect: { id } },
    },
    afterCreate: async (tx, estimate) => {
      const version = await requireCreate(tx.sudo(), "EstimateVersion")({ data: {
        versionNumber: 1,
        status: "draft",
        subtotalMinor: total,
        totalMinor: total,
        scopeSummary: input.description?.trim(),
        estimate: { connect: { id: estimate.id } },
        project: { connect: { id } },
      } });
      versionId = version.id;
      await requireCreate(tx.sudo(), "EstimateLineItem")({ data: {
        lineNumber: 1,
        description: requiredText(input.description || input.title, "Estimate line description", 500),
        quantity: decimalQuantity(input.quantity || "1"),
        unit: input.unit?.trim() || "LS",
        subcontractCostMinor: total,
        totalCostMinor: total,
        version: { connect: { id: version.id } },
        budgetCode: { connect: { id: budgetCodeId } },
        project: { connect: { id } },
      } });
      await requireUpdate(tx.sudo(), "Estimate")({ where: { id: estimate.id }, data: { currentVersion: { connect: { id: version.id } } } });
    },
  }).finally(() => { void versionId; });
}

type EstimateVersionRow = {
  estimateStatus: string; versionId: string | null; versionNumber: number | null; versionStatus: string | null;
  subtotalMinor: bigint | null; overheadMinor: bigint | null; profitMinor: bigint | null; contingencyMinor: bigint | null; totalMinor: bigint | null;
  currencyCode: string | null; scopeSummary: string | null; assumptions: string | null; exclusions: string | null; maxVersion: number | null;
};

/** Start the next draft version of a rejected estimate. The issued version stays
 * locked as history; its lines are copied into the new draft for revision. */
export async function reviseEstimate(
  _root: unknown,
  { input }: { input: ConstructionWorkflowInput },
  context: CommandContext,
): Promise<CommandResult> {
  const id = projectId(input);
  const estimateId = requiredText(input.relatedId, "Estimate id", 200);
  let previousVersionId = "";
  return executeProjectCommand({
    context, operation: "reviseEstimate", permission: "canManagePreconstruction", projectId: id,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "EstimateVersion",
    beforeCreate: async tx => {
      if (!tx.prisma?.$queryRawUnsafe) throw new Error("Estimate revision locking is unavailable");
      const [row] = await tx.prisma.$queryRawUnsafe<EstimateVersionRow[]>(
        `SELECT e.status::text AS "estimateStatus", v.id AS "versionId", v."versionNumber", v.status::text AS "versionStatus",
                v."subtotalMinor", v."overheadMinor", v."profitMinor", v."contingencyMinor", v."totalMinor", v."currencyCode",
                v."scopeSummary", v.assumptions, v.exclusions,
                (SELECT MAX("versionNumber") FROM "EstimateVersion" WHERE estimate = e.id) AS "maxVersion"
         FROM "Estimate" e LEFT JOIN "EstimateVersion" v ON v.id = e."currentVersion"
         WHERE e.id = $1 AND e.project = $2 FOR UPDATE OF e`,
        estimateId, id,
      );
      if (!row) throw new Error("Estimate not found on this project");
      if (row.estimateStatus !== "rejected") throw new Error("Only a rejected estimate can be revised into a new draft version");
      if (!row.versionId || row.versionStatus !== "issued") throw new Error("The estimate has no issued version to revise");
      previousVersionId = row.versionId;
      return {
        versionNumber: Number(row.maxVersion ?? row.versionNumber ?? 0) + 1,
        status: "draft",
        subtotalMinor: row.subtotalMinor, overheadMinor: row.overheadMinor, profitMinor: row.profitMinor,
        contingencyMinor: row.contingencyMinor, totalMinor: row.totalMinor,
        ...(row.currencyCode ? { currencyCode: row.currencyCode } : {}),
        scopeSummary: input.description?.trim() || row.scopeSummary, assumptions: row.assumptions, exclusions: row.exclusions,
        estimate: { connect: { id: estimateId } },
        project: { connect: { id } },
      };
    },
    data: { estimate: { connect: { id: estimateId } }, project: { connect: { id } } },
    afterCreate: async (tx, version) => {
      const sudo = tx.sudo();
      const lines = await sudo.query.EstimateLineItem.findMany!({
        where: { version: { id: { equals: previousVersionId } } }, take: 501, orderBy: [{ lineNumber: "asc" }],
        query: "lineNumber description quantity unit laborCostMinor materialCostMinor equipmentCostMinor subcontractCostMinor otherCostMinor totalCostMinor budgetCode { id }",
      });
      if (lines.length > 500) throw new Error("Estimate has more lines than a revision can copy");
      for (const line of lines) {
        const budgetCode = line.budgetCode as { id?: string } | null | undefined;
        await requireCreate(sudo, "EstimateLineItem")({ data: {
          lineNumber: line.lineNumber, description: line.description, quantity: line.quantity, unit: line.unit,
          laborCostMinor: line.laborCostMinor, materialCostMinor: line.materialCostMinor, equipmentCostMinor: line.equipmentCostMinor,
          subcontractCostMinor: line.subcontractCostMinor, otherCostMinor: line.otherCostMinor, totalCostMinor: line.totalCostMinor,
          version: { connect: { id: version.id } },
          ...(budgetCode?.id ? { budgetCode: { connect: { id: budgetCode.id } } } : {}),
          project: { connect: { id } },
        } });
      }
      if (!tx.prisma?.$executeRawUnsafe) throw new Error("Estimate revision is unavailable");
      const updated = await tx.prisma.$executeRawUnsafe(
        `UPDATE "Estimate" SET status = 'draft', "currentVersion" = $1 WHERE id = $2 AND status = 'rejected'`,
        version.id, estimateId,
      );
      if (updated !== 1) throw new Error("Estimate changed concurrently; reload before revising");
    },
  });
}

export async function inviteBidder(
  _root: unknown,
  { input }: { input: ConstructionWorkflowInput },
  context: CommandContext,
): Promise<CommandResult> {
  const id = projectId(input);
  const bidPackageId = requiredText(input.relatedId, "Bid package id", 200);
  const budgetCodeId = requiredText(input.secondaryId, "Budget code id", 200);
  const partnerId = requiredText(input.partnerId, "Trade partner id", 200);
  return executeProjectCommand({
    context, operation: "inviteBidder", permission: "canManagePreconstruction", projectId: id,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "BidInvitation",
    data: {
      status: "draft",
      recipientName: requiredText(input.title, "Recipient name", 200),
      recipientEmail: requiredText(input.reference, "Recipient email", 320),
      bidPackage: { connect: { id: bidPackageId } },
      budgetCode: { connect: { id: budgetCodeId } },
      tradePartner: { connect: { id: partnerId } },
      project: { connect: { id } },
    },
  });
}

export async function recordBidSubmission(
  _root: unknown,
  { input }: { input: ConstructionWorkflowInput },
  context: CommandContext,
): Promise<CommandResult> {
  const id = projectId(input);
  const invitationId = requiredText(input.relatedId, "Bid invitation id", 200);
  const budgetCodeId = requiredText(input.secondaryId, "Budget code id", 200);
  const total = amount(input.amountMinor, "Submitted total");
  let price: ReturnType<typeof priceLineFromTotal> | null = null;
  return executeProjectCommand({
    context, operation: "recordBidSubmission", permission: "canManagePreconstruction", projectId: id,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "BidSubmission",
    data: {},
    beforeCreate: async tx => {
      const admission = await lockBidSubmissionAdmission(tx, id, invitationId);
      price = priceLineFromTotal(total, decimalQuantity(input.quantity || "1"));
      return {
        submissionNumber: requiredText(input.reference, "Submission number", 80), status: "submitted", totalMinor: total,
        exclusions: input.description?.trim(), submittedAt: optionalDate(input.occurredAt, "Submission date") ?? new Date(),
        invitation: { connect: { id: invitationId } }, bidPackage: { connect: { id: admission.packageId } },
        tradePartner: { connect: { id: admission.partnerId } }, project: { connect: { id } },
      };
    },
    afterCreate: async (tx, submission) => {
      if (!price) throw new Error("Bid pricing admission is unavailable");
      await requireCreate(tx.sudo(), "BidLineItem")({ data: {
        lineNumber: 1,
        description: requiredText(input.title, "Bid scope", 500),
        quantity: price.quantity,
        unit: input.unit?.trim() || "LS",
        unitPriceMinor: price.unitPriceMinor,
        amountMinor: price.amountMinor,
        submission: { connect: { id: submission.id } },
        budgetCode: { connect: { id: budgetCodeId } },
        project: { connect: { id } },
      } });
      await requireUpdate(tx.sudo(), "BidInvitation")({ where: { id: invitationId }, data: {
        status: "submitted", respondedAt: new Date(),
      } });
    },
  });
}

async function createContractWithLine(
  input: ConstructionWorkflowInput,
  context: CommandContext,
  listKey: "PrimeContract" | "Commitment",
): Promise<CommandResult> {
  const id = projectId(input);
  const total = amount(input.amountMinor, "Contract value");
  const budgetCodeId = requiredText(input.secondaryId, "Budget code id", 200);
  const partnerId = requiredText(input.partnerId, "Trade partner id", 200);
  const isPrime = listKey === "PrimeContract";
  return executeProjectCommand({
    context,
    operation: isPrime ? "createPrimeContractWithLine" : "createCommitmentWithLine",
    permission: "canManageContracts", projectId: id, idempotencyKey: input.idempotencyKey,
    request: input, listKey,
    data: {
      number: requiredText(input.reference, `${isPrime ? "Prime contract" : "Commitment"} number`, 80),
      title: requiredText(input.title, "Contract title", 240),
      description: input.description?.trim(),
      ...(isPrime ? { contractType: input.type || "lump_sum", client: { connect: { id: partnerId } } } : {
        commitmentType: input.type === "purchase_order" ? "purchase_order" : "subcontract",
        tradePartner: { connect: { id: partnerId } },
      }),
      originalContractMinor: total,
      revisedContractMinor: total,
      contractManager: { connect: { id: requireCommandSession(context).itemId } },
      project: { connect: { id } },
    },
    afterCreate: async (tx, contract) => {
      await requireCreate(tx.sudo(), "ContractLineItem")({ data: {
        lineNumber: 1,
        description: requiredText(input.description || input.title, "Schedule-of-values description", 500),
        scheduledValueMinor: total,
        revisedValueMinor: total,
        ...(isPrime ? { primeContract: { connect: { id: contract.id } } } : { commitment: { connect: { id: contract.id } } }),
        budgetCode: { connect: { id: budgetCodeId } },
        project: { connect: { id } },
      } });
      if (!isPrime && tx.prisma?.$queryRawUnsafe && tx.prisma.budgetLineItem?.update && tx.prisma.budget?.update) {
        const [line] = await tx.prisma.$queryRawUnsafe<Array<{ id: string; budgetId: string }>>(
          `SELECT line.id, line.budget AS "budgetId" FROM "BudgetLineItem" line
           JOIN "Budget" budget ON budget.id = line.budget
           WHERE line.project = $1 AND line."budgetCode" = $2 AND budget.status = 'active'
           ORDER BY line."createdAt" ASC LIMIT 1 FOR UPDATE OF line, budget`, id, budgetCodeId,
        );
        if (!line) throw new Error("A matching active budget line is required for commitment rollup");
        await tx.prisma.budgetLineItem.update({ where: { id: line.id }, data: {
          committedAmountMinor: { increment: BigInt(total) }, projectedFinalCostMinor: { increment: BigInt(total) },
          projectedOverUnderMinor: { decrement: BigInt(total) },
        } });
        await tx.prisma.budget.update({ where: { id: line.budgetId }, data: { totalCommittedMinor: { increment: BigInt(total) } } });
      }
    },
  });
}

export const createPrimeContractWithLine = (_root: unknown, { input }: { input: ConstructionWorkflowInput }, context: CommandContext) =>
  createContractWithLine(input, context, "PrimeContract");
export const createCommitmentWithLine = (_root: unknown, { input }: { input: ConstructionWorkflowInput }, context: CommandContext) =>
  createContractWithLine(input, context, "Commitment");

export async function createChangeOrderWithLine(
  _root: unknown,
  { input }: { input: ConstructionWorkflowInput },
  context: CommandContext,
): Promise<CommandResult> {
  const id = projectId(input);
  const total = signedAmount(input.amountMinor, "Change order value");
  const contractId = requiredText(input.relatedId, "Contract id", 200);
  const budgetCodeId = requiredText(input.secondaryId, "Budget code id", 200);
  const ownerDirection = input.type !== "commitment";
  const parentList = ownerDirection ? "PrimeContract" : "Commitment";
  const parent = await queryById(context, parentList, contractId, "id project { id } lineItems(take: 200) { id budgetCode { id } }");
  const contractLine = Array.isArray(parent?.lineItems)
    ? (parent.lineItems as Array<Record<string, unknown>>).find(line => (line.budgetCode as { id?: string } | null)?.id === budgetCodeId)
    : undefined;
  if (parent?.project?.id !== id || !contractLine?.id) throw new Error("Contract and matching schedule-of-values line are required in this project");
  return executeProjectCommand({
    context, operation: "createChangeOrderWithLine", permission: "canManageContracts", projectId: id,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "ChangeOrder",
    data: {
      number: requiredText(input.reference, "Change order number", 80), title: requiredText(input.title, "Change order title", 240),
      description: input.description?.trim(), direction: ownerDirection ? "owner" : "commitment", totalMinor: total,
      requestedBy: { connect: { id: requireCommandSession(context).itemId } },
      ...(ownerDirection ? { primeContract: { connect: { id: contractId } } } : { commitment: { connect: { id: contractId } } }),
      project: { connect: { id } },
    },
    afterCreate: async (tx, order) => {
      await requireCreate(tx.sudo(), "ChangeOrderLineItem")({ data: {
        lineNumber: 1, description: requiredText(input.description || input.title, "Change order line description", 500),
        amountMinor: total, changeOrder: { connect: { id: order.id } }, budgetCode: { connect: { id: budgetCodeId } },
        contractLineItem: { connect: { id: String(contractLine.id) } },
        project: { connect: { id } },
      } });
    },
  });
}

export async function routeRfi(_root: unknown, { input }: { input: ConstructionWorkflowInput }, context: CommandContext) {
  const id = projectId(input);
  const rfiId = requiredText(input.relatedId, "RFI id", 200);
  const assigneeId = requiredText(input.userId, "RFI assignee id", 200);
  return executeProjectCommand({
    context, operation: "routeRfi", permission: "canManageProjectExecution", projectId: id,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "RFI", updateId: rfiId,
    beforeCreate: async tx => { await lockExecutionAdmission(tx, "RFI", rfiId, id, ["draft", "open", "answered"]); },
    data: {
      ballInCourt: { connect: { id: assigneeId } }, dueAt: optionalDate(input.dueAt, "RFI due date"),
      ...(input.partnerId ? { responsiblePartner: { connect: { id: input.partnerId } } } : {}),
    },
  });
}

export async function respondToRfi(_root: unknown, { input }: { input: ConstructionWorkflowInput }, context: CommandContext) {
  const id = projectId(input);
  const rfiId = requiredText(input.relatedId, "RFI id", 200);
  return executeProjectCommand({
    context, operation: "respondToRfi", permission: "canManageProjectExecution", projectId: id,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "RFIResponse",
    beforeCreate: async tx => { await lockExecutionAdmission(tx, "RFI", rfiId, id, ["open", "answered"]); },
    data: {
      response: requiredText(input.description, "RFI response", 10_000),
      isOfficial: input.type === "official",
      respondedAt: optionalDate(input.occurredAt, "Response date") ?? new Date(),
      rfi: { connect: { id: rfiId } }, author: { connect: { id: requireCommandSession(context).itemId } },
      project: { connect: { id } },
    },
  });
}

export async function routeSubmittalReview(_root: unknown, { input }: { input: ConstructionWorkflowInput }, context: CommandContext) {
  const id = projectId(input);
  const submittalId = requiredText(input.relatedId, "Submittal id", 200);
  const reviewerId = requiredText(input.userId, "Reviewer id", 200);
  const sequence = Number(input.quantity || 1);
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 100) throw new Error("Review sequence must be from 1 to 100");
  const reviewData = {
    sequence, status: "pending", response: input.description?.trim(), dueAt: optionalDate(input.dueAt, "Review due date"),
    submittal: { connect: { id: submittalId } }, reviewer: { connect: { id: reviewerId } },
    ...(input.partnerId ? { reviewerPartner: { connect: { id: input.partnerId } } } : {}), project: { connect: { id } },
  };
  return executeProjectCommand({
    context, operation: "routeSubmittalReview", permission: "canManageProjectExecution", projectId: id,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "SubmittalReview",
    beforeCreate: async tx => ({
      ...reviewData,
      submittalRevision: await lockSubmittalRevision(tx, submittalId, id, ["draft", "submitted", "under_review", "revise_resubmit"]),
    }),
    data: reviewData,
    afterCreate: async tx => {
      await requireUpdate(tx.sudo(), "Submittal")({ where: { id: submittalId }, data: { ballInCourt: { connect: { id: reviewerId } } } });
    },
  });
}

export async function recordSubmittalReview(_root: unknown, { input }: { input: ConstructionWorkflowInput }, context: CommandContext) {
  const id = projectId(input);
  const submittalId = requiredText(input.relatedId, "Submittal id", 200);
  const decision = ["approved", "approved_as_noted", "revise_resubmit", "rejected"].includes(String(input.type)) ? String(input.type) : null;
  if (!decision) throw new Error("A supported submittal review decision is required");
  const reviewerId = requireCommandSession(context).itemId;
  const pending = await context.sudo().query.SubmittalReview.findMany!({
    where: {
      submittal: { id: { equals: submittalId } }, project: { id: { equals: id } },
      reviewer: { id: { equals: reviewerId } }, status: { equals: "pending" },
    },
    take: 100, query: "id sequence submittalRevision",
  });
  const submittal = await queryById(context, "Submittal", submittalId, "id revision");
  const review = [...pending]
    .filter(entry => Number(entry.submittalRevision ?? 0) === Number(submittal?.revision ?? 0))
    .sort((left, right) => Number(left.sequence ?? 0) - Number(right.sequence ?? 0))[0];
  if (!review?.id) throw new Error("No pending review assignment is available to this reviewer");
  return executeProjectCommand({
    context, operation: "recordSubmittalReview", permission: "canManageProjectExecution", projectId: id,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "SubmittalReview", updateId: String(review.id),
    beforeCreate: async tx => { await lockActiveSubmittalReviewStep(tx, String(review.id), submittalId, id); },
    data: {
      status: decision, response: requiredText(input.description, "Review response", 10_000),
      completedAt: optionalDate(input.occurredAt, "Review date") ?? new Date(),
    },
  });
}

async function lockDraftDailyLog(context: CommandContext, logId: string, project: string) {
  if (!context.prisma?.$queryRawUnsafe) throw new Error("Daily log admission locking is unavailable");
  const [log] = await context.prisma.$queryRawUnsafe<Array<{ id: string; status: string; projectId: string }>>('SELECT id, status::text, project AS "projectId" FROM "DailyLog" WHERE id = $1 FOR UPDATE', logId);
  if (!log || log.projectId !== project || log.status !== "draft") throw new Error("Only a draft daily log accepts new entries or photo links; submitted history cannot be changed");
}

export async function addDailyLogEntry(_root: unknown, { input }: { input: ConstructionWorkflowInput }, context: CommandContext) {
  const id = projectId(input);
  const dailyLogId = requiredText(input.relatedId, "Daily log id", 200);
  const entryType = ["weather", "manpower", "equipment", "delivery", "material", "safety", "inspection", "delay", "progress", "visitor", "note"].includes(String(input.type)) ? String(input.type) : "note";
  return executeProjectCommand({
    context, operation: "addDailyLogEntry", permission: "canManageFieldOperations", projectId: id,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "DailyLogEntry",
    beforeCreate: async tx => { await lockDraftDailyLog(tx, dailyLogId, id); },
    data: {
      entryType, title: requiredText(input.title, "Entry title", 240), details: input.description?.trim(),
      startedAt: optionalDate(input.occurredAt, "Entry start"), quantity: input.quantity || undefined, unit: input.unit?.trim(),
      delayDays: entryType === "delay" ? Number(input.quantity || 0) : undefined,
      dailyLog: { connect: { id: dailyLogId } }, project: { connect: { id } },
    },
  });
}

export async function registerFieldPhoto(_root: unknown, { input }: { input: ConstructionWorkflowInput }, context: CommandContext) {
  const id = projectId(input);
  const entryId = requiredText(input.relatedId, "Daily log entry id", 200);
  return executeProjectCommand({
    context, operation: "registerFieldPhoto", permission: "canManageFieldOperations", projectId: id,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "Document",
    beforeCreate: async tx => {
      const sql = tx.prisma?.$queryRawUnsafe?.bind(tx.prisma);
      if (!sql) throw new Error("Photo parent admission locking is unavailable");
      const [entry] = await sql<Array<{ dailyLogId: string; projectId: string }>>('SELECT "dailyLog" AS "dailyLogId", project AS "projectId" FROM "DailyLogEntry" WHERE id = $1', entryId);
      if (!entry?.dailyLogId || entry.projectId !== id) throw new Error("Daily log entry not found in this project");
      await lockDraftDailyLog(tx, entry.dailyLogId, id);
      const linked = await sql<Array<{ id: string }>>('SELECT id FROM "DailyLogEntry" WHERE id = $1 AND "dailyLog" = $2 AND project = $3 FOR SHARE', entryId, entry.dailyLogId, id);
      if (linked.length !== 1) throw new Error("Photo parent changed; reload before linking");
    },
    data: {
      documentNumber: requiredText(input.reference, "Photo reference", 100), title: requiredText(input.title, "Photo caption", 300),
      documentType: "photo", description: input.description?.trim(), dailyLogEntries: { connect: [{ id: entryId }] },
      project: { connect: { id } },
    },
  });
}

export async function recordLaborTime(_root: unknown, { input }: { input: ConstructionWorkflowInput }, context: CommandContext) {
  const id = projectId(input);
  const budgetCodeId = requiredText(input.relatedId, "Budget code id", 200);
  const hours = decimalQuantity(input.quantity, "Hours");
  const cost = amount(input.amountMinor, "Labor cost");
  return executeProjectCommand({
    context, operation: "recordLaborTime", permission: "canManageFieldOperations", projectId: id,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "LaborEntry",
    data: {
      workDate: optionalDate(input.occurredAt, "Work date") ?? new Date(), workerName: requiredText(input.title, "Worker or crew", 200),
      laborType: input.type === "subcontractor" ? "subcontractor" : "employee", regularHours: hours,
      totalCostMinor: cost, notes: input.description?.trim(), budgetCode: { connect: { id: budgetCodeId } },
      ...(input.partnerId ? { tradePartner: { connect: { id: input.partnerId } } } : {}),
      project: { connect: { id } },
    },
  });
}

export async function registerScheduleTask(_root: unknown, { input }: { input: ConstructionWorkflowInput }, context: CommandContext) {
  const id = projectId(input);
  const scheduleId = requiredText(input.relatedId, "Schedule id", 200);
  return executeProjectCommand({
    context, operation: "registerScheduleTask", permission: "canManageProjectExecution", projectId: id,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "ScheduleTask",
    data: {
      taskCode: requiredText(input.reference, "Task code", 80), name: requiredText(input.title, "Task name", 300),
      description: input.description?.trim(), plannedStart: optionalDate(input.occurredAt, "Planned start"),
      plannedFinish: optionalDate(input.dueAt, "Planned finish"), schedule: { connect: { id: scheduleId } },
      ...(input.userId ? { assignedTo: { connect: { id: input.userId } } } : {}), project: { connect: { id } },
    },
  });
}

export async function linkScheduleDependency(_root: unknown, { input }: { input: ConstructionWorkflowInput }, context: CommandContext) {
  const id = projectId(input);
  const predecessorId = requiredText(input.relatedId, "Predecessor task id", 200);
  const successorId = requiredText(input.secondaryId, "Successor task id", 200);
  if (predecessorId === successorId) throw new Error("A schedule task cannot depend on itself");
  const [predecessor, successor] = await Promise.all([
    queryById(context, "ScheduleTask", predecessorId, "id schedule { id } project { id }"),
    queryById(context, "ScheduleTask", successorId, "id schedule { id } project { id }"),
  ]);
  const predecessorScheduleId = (predecessor?.schedule as { id?: string } | null | undefined)?.id;
  const successorScheduleId = (successor?.schedule as { id?: string } | null | undefined)?.id;
  if (predecessor?.project?.id !== id || successor?.project?.id !== id || !predecessorScheduleId || predecessorScheduleId !== successorScheduleId) {
    throw new Error("Schedule dependency tasks must belong to the same project schedule");
  }
  const dependencyType = ["finish_to_start", "start_to_start", "finish_to_finish", "start_to_finish"].includes(String(input.type)) ? String(input.type) : "finish_to_start";
  const lagDays = Number(input.quantity || 0);
  if (!Number.isInteger(lagDays) || lagDays < -3650 || lagDays > 3650) throw new Error("Dependency lag must be a whole number of days from -3650 to 3650");
  return executeProjectCommand({
    context, operation: "linkScheduleDependency", permission: "canManageProjectExecution", projectId: id,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "ScheduleDependency",
    data: {
      dependencyType, lagDays, schedule: { connect: { id: predecessorScheduleId } },
      predecessor: { connect: { id: predecessorId } }, successor: { connect: { id: successorId } }, project: { connect: { id } },
    },
    beforeCreate: async tx => {
      if (!tx.prisma?.$queryRawUnsafe) throw new Error("Schedule dependency locking is unavailable");
      const [schedule] = await tx.prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM "Schedule" WHERE id = $1 AND project = $2 FOR UPDATE`, predecessorScheduleId, id,
      );
      if (!schedule) throw new Error("Schedule changed before dependency validation");
      const [duplicate] = await tx.prisma.$queryRawUnsafe<Array<{ duplicateExists: boolean }>>(
        `SELECT EXISTS(SELECT 1 FROM "ScheduleDependency" WHERE schedule = $1 AND predecessor = $2 AND successor = $3) AS "duplicateExists"`,
        predecessorScheduleId, predecessorId, successorId,
      );
      if (duplicate?.duplicateExists) throw new Error("This dependency already exists in the schedule");
      const [cycle] = await tx.prisma.$queryRawUnsafe<Array<{ createsCycle: boolean }>>(
        `WITH RECURSIVE reachable(id) AS (
           SELECT successor FROM "ScheduleDependency" WHERE schedule = $1 AND predecessor = $2
           UNION
           SELECT edge.successor FROM "ScheduleDependency" edge JOIN reachable path ON edge.predecessor = path.id
           WHERE edge.schedule = $1
         )
         SELECT EXISTS(SELECT 1 FROM reachable WHERE id = $3) AS "createsCycle"`,
        predecessorScheduleId, successorId, predecessorId,
      );
      if (cycle?.createsCycle) throw new Error("Schedule dependencies must remain acyclic");
    },
  });
}

export async function updateScheduleTaskProgress(_root: unknown, { input }: { input: ConstructionWorkflowInput }, context: CommandContext) {
  const id = projectId(input);
  const taskId = requiredText(input.relatedId, "Schedule task id", 200);
  const percent = Number(input.quantity);
  if (!Number.isInteger(percent) || percent < 0 || percent > 100) throw new Error("Percent complete must be an integer from 0 to 100");
  const task = await queryById(context, "ScheduleTask", taskId, "id status percentComplete project { id }");
  if (task?.project?.id !== id) throw new Error("Schedule task not found in this project");
  if (task.status === "completed") throw new Error("Completed schedule progress is immutable; reopen through an approved correction process");
  return executeProjectCommand({
    context, operation: "updateScheduleTaskProgress", permission: "canManageProjectExecution", projectId: id,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "ScheduleTask", updateId: taskId,
    data: { percentComplete: percent },
    beforeCreate: async tx => {
      if (!tx.prisma?.$queryRawUnsafe) throw new Error("Schedule-task progress locking is unavailable");
      const [lockedTask] = await tx.prisma.$queryRawUnsafe<Array<{ status: string }>>(
        `SELECT status::text FROM "ScheduleTask" WHERE id = $1 AND project = $2 FOR UPDATE`, taskId, id,
      );
      if (!lockedTask) throw new Error("Schedule task changed before progress was recorded");
      if (lockedTask.status === "completed") throw new Error("Completed schedule progress is immutable; reopen through an approved correction process");
      return { percentComplete: percent };
    },
  });
}

export async function recordSafetyIncident(_root: unknown, { input }: { input: ConstructionWorkflowInput }, context: CommandContext) {
  const id = projectId(input);
  const severity = ["low", "moderate", "serious", "critical", "fatal"].includes(String(input.type)) ? String(input.type) : null;
  if (!severity) throw new Error("Select the incident severity");
  const classification = incidentClassification(input.incidentType);
  return executeProjectCommand({
    context, operation: "recordSafetyIncident", permission: "canManageSafety", projectId: id,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "SafetyIncident",
    data: {
      incidentNumber: requiredText(input.reference, "Incident number", 80), title: requiredText(input.title, "Incident title", 240),
      description: requiredText(input.description, "Incident description", 10_000), severity, ...classification,
      occurredAt: optionalDate(input.occurredAt, "Occurred at") ?? new Date(),
      reportedBy: { connect: { id: requireCommandSession(context).itemId } },
      investigator: input.userId ? { connect: { id: input.userId } } : { connect: { id: requireCommandSession(context).itemId } },
      project: { connect: { id } },
    },
  });
}

export async function createInspectionWithItem(_root: unknown, { input }: { input: ConstructionWorkflowInput }, context: CommandContext) {
  const id = projectId(input);
  return executeProjectCommand({
    context, operation: "createInspectionWithItem", permission: "canManageSafety", projectId: id,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "Inspection",
    data: {
      inspectionNumber: requiredText(input.reference, "Inspection number", 80), title: requiredText(input.title, "Inspection title", 240),
      description: input.description?.trim(), scheduledAt: optionalDate(input.dueAt, "Scheduled date"),
      inspector: { connect: { id: input.userId || requireCommandSession(context).itemId } }, project: { connect: { id } },
    },
    afterCreate: async (tx, inspection) => {
      await requireCreate(tx.sudo(), "InspectionItem")({ data: {
        sequence: 1, prompt: requiredText(input.description || input.title, "Inspection requirement", 500),
        inspection: { connect: { id: inspection.id } }, project: { connect: { id } },
      } });
    },
  });
}

export async function recordInspectionItemResult(_root: unknown, { input }: { input: ConstructionWorkflowInput }, context: CommandContext) {
  const id = projectId(input);
  const itemId = requiredText(input.relatedId, "Inspection item id", 200);
  const result = ["pass", "fail", "not_applicable"].includes(String(input.type)) ? String(input.type) : null;
  if (!result) throw new Error("Inspection result must be pass, fail, or not applicable");
  const item = await queryById(context, "InspectionItem", itemId, "id project { id }");
  if (item?.project?.id !== id) throw new Error("Inspection item not found in this project");
  return executeProjectCommand({
    context, operation: "recordInspectionItemResult", permission: "canManageSafety", projectId: id,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "InspectionItem", updateId: itemId,
    data: { result, response: requiredText(input.description, "Inspection response", 10_000), completedAt: optionalDate(input.occurredAt, "Completion date") ?? new Date() },
    beforeCreate: async tx => {
      if (!tx.prisma?.$queryRawUnsafe) throw new Error("Inspection evidence lock is unavailable");
      const [inspection] = await tx.prisma.$queryRawUnsafe<Array<{ projectId: string; status: string }>>(
        `SELECT inspection.project AS "projectId", inspection.status::text AS status
         FROM "InspectionItem" item JOIN "Inspection" inspection ON inspection.id = item.inspection
         WHERE item.id = $1 FOR UPDATE OF inspection`, itemId,
      );
      if (inspection?.projectId !== id || inspection.status !== "in_progress") {
        throw new Error("Inspection results may be recorded only while the parent inspection is in progress");
      }
    },
  });
}

export async function registerCorrectiveAction(_root: unknown, { input }: { input: ConstructionWorkflowInput }, context: CommandContext) {
  const id = projectId(input);
  const sourceId = requiredText(input.relatedId, "Source finding id", 200);
  const sourceField = ["safetyIncident", "safetyObservation", "inspectionItem", "punchItem"].includes(String(input.type)) ? String(input.type) : null;
  if (!sourceField) throw new Error("Corrective action source type is invalid");
  return executeProjectCommand({
    context, operation: "registerCorrectiveAction", permission: "canManageSafety", projectId: id,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "CorrectiveAction",
    data: {
      actionNumber: requiredText(input.reference, "Action number", 80), title: requiredText(input.title, "Action title", 240),
      description: requiredText(input.description, "Corrective action", 10_000), dueAt: optionalDate(input.dueAt, "Due date"),
      assignedTo: { connect: { id: input.userId || requireCommandSession(context).itemId } },
      [sourceField]: { connect: { id: sourceId } }, project: { connect: { id } },
    },
  });
}

export async function recordCorrectiveActionEvidence(_root: unknown, { input }: { input: ConstructionWorkflowInput }, context: CommandContext) {
  const id = projectId(input);
  const actionId = requiredText(input.relatedId, "Corrective action id", 200);
  const action = await queryById(context, "CorrectiveAction", actionId, "id project { id }");
  if (action?.project?.id !== id) throw new Error("Corrective action is not ready for completion evidence");
  return executeProjectCommand({
    context, operation: "recordCorrectiveActionEvidence", permission: "canManageSafety", projectId: id,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "CorrectiveAction", updateId: actionId,
    beforeCreate: async tx => {
      if (!tx.prisma?.$queryRawUnsafe) throw new Error("Corrective action evidence lock is unavailable");
      const [locked] = await tx.prisma.$queryRawUnsafe<Array<{ status: string; projectId: string }>>(
        'SELECT status::text AS status, project AS "projectId" FROM "CorrectiveAction" WHERE id = $1 FOR UPDATE', actionId,
      );
      if (locked?.projectId !== id || !["in_progress", "ready_for_verification"].includes(locked.status)) {
        throw new Error("Corrective action is not ready for completion evidence");
      }
    },
    data: {
      completionNotes: requiredText(input.description, "Completion notes", 10_000),
      evidenceReference: requiredText(input.evidenceReference, "Evidence reference", 240),
      evidenceChecksumSha256: checksum(input.evidenceChecksumSha256),
      completedAt: optionalDate(input.occurredAt, "Completion date") ?? new Date(),
    },
  });
}

export async function createProcurementRequestWithLine(_root: unknown, { input }: { input: ConstructionWorkflowInput }, context: CommandContext) {
  const id = projectId(input);
  const budgetCodeId = requiredText(input.relatedId, "Budget code id", 200);
  const estimated = amount(input.amountMinor, "Estimated amount");
  const quantity = decimalQuantity(input.quantity || "1");
  let price: ReturnType<typeof priceLineFromTotal> | null = null;
  return executeProjectCommand({
    context, operation: "createProcurementRequestWithLine", permission: "canManageContracts", projectId: id,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "ProcurementRequest",
    beforeCreate: async () => { price = priceLineFromTotal(estimated, quantity); },
    data: {
      requestNumber: requiredText(input.reference, "Request number", 100), title: requiredText(input.title, "Request title", 240),
      description: input.description?.trim(), neededBy: optionalDate(input.dueAt, "Needed-by date"), totalEstimatedMinor: estimated,
      requestedBy: { connect: { id: requireCommandSession(context).itemId } },
      ...(input.partnerId ? { tradePartner: { connect: { id: input.partnerId } } } : {}), project: { connect: { id } },
    },
    afterCreate: async (tx, request) => {
      if (!price) throw new Error("Procurement pricing admission is unavailable");
      await requireCreate(tx.sudo(), "ProcurementRequestLine")({ data: {
        lineNumber: 1, description: requiredText(input.description || input.title, "Requested item", 500),
        quantity: price.quantity, unit: input.unit?.trim() || "EA", estimatedUnitCostMinor: price.unitPriceMinor, estimatedAmountMinor: price.amountMinor,
        request: { connect: { id: request.id } }, budgetCode: { connect: { id: budgetCodeId } }, project: { connect: { id } },
      } });
    },
  });
}

export async function placeProcurementOrder(_root: unknown, { input }: { input: ConstructionWorkflowInput }, context: CommandContext) {
  const id = projectId(input);
  const requestId = requiredText(input.relatedId, "Procurement request id", 200);
  const request = await queryById(context, "ProcurementRequest", requestId, `
    id status totalEstimatedMinor tradePartner { id } commitment { id }
    lines(take: 200, orderBy: { lineNumber: asc }) { id lineNumber description estimatedAmountMinor budgetCode { id } }
    project { id }
  `) as Record<string, unknown> & { tradePartner?: { id?: string } | null; commitment?: { id?: string } | null; project?: { id?: string } | null } | null;
  let lines = Array.isArray(request?.lines) ? request.lines as Array<Record<string, unknown>> : [];
  const partnerId = input.partnerId || request?.tradePartner?.id;
  if (request?.project?.id !== id || !partnerId || lines.length === 0) {
    throw new Error("Approved procurement request, vendor, and request lines are required");
  }
  const total = lines.reduce((sum, line) => sum + BigInt(String(line.estimatedAmountMinor ?? 0)), BigInt(0));
  // State checks apply to new orders only; a retry of an order already placed
  // must still return its original receipt after the request has moved on.
  const admissionError = request.status !== "approved"
    ? "Approved procurement request, vendor, and request lines are required"
    : total <= BigInt(0) || total !== BigInt(String(request.totalEstimatedMinor ?? 0))
      ? "Procurement request header and line totals must match before ordering"
      : null;
  return executeProjectCommand({
    context, operation: "placeProcurementOrder", permission: "canManageContracts", projectId: id,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "Commitment",
    beforeAdmission: async () => { if (admissionError) throw new Error(admissionError); },
    data: {
      number: requiredText(input.reference, "Purchase order number", 80), title: requiredText(input.title, "Purchase order title", 240),
      description: input.description?.trim(), commitmentType: "purchase_order", status: "draft",
      originalContractMinor: total.toString(), revisedContractMinor: total.toString(),
      tradePartner: { connect: { id: partnerId } }, contractManager: { connect: { id: requireCommandSession(context).itemId } },
      project: { connect: { id } },
    },
    beforeCreate: async tx => {
      if (!tx.prisma?.$queryRawUnsafe) throw new Error("Procurement request conversion lock is unavailable");
      const [lockedRequest] = await tx.prisma.$queryRawUnsafe<Array<{
        status: string; projectId: string; commitmentId: string | null; partnerId: string | null; totalEstimatedMinor: bigint;
      }>>(
        `SELECT status::text AS status, project AS "projectId", commitment AS "commitmentId",
                "tradePartner" AS "partnerId", "totalEstimatedMinor"
         FROM "ProcurementRequest" WHERE id = $1 FOR UPDATE`, requestId,
      );
      if (!lockedRequest || lockedRequest.projectId !== id || lockedRequest.status !== "approved" || lockedRequest.commitmentId) {
        throw new Error("This procurement request is no longer eligible for one-time order conversion");
      }
      if (lockedRequest.partnerId && lockedRequest.partnerId !== partnerId) {
        throw new Error("Purchase order vendor must match the approved request vendor");
      }
      const lockedLines = await tx.prisma.$queryRawUnsafe<Array<{
        id: string; lineNumber: number; description: string; estimatedAmountMinor: bigint; budgetCodeId: string | null;
      }>>(
        `SELECT id, "lineNumber", description, "estimatedAmountMinor", "budgetCode" AS "budgetCodeId"
         FROM "ProcurementRequestLine" WHERE request = $1 ORDER BY "lineNumber" ASC FOR UPDATE`, requestId,
      );
      const lockedTotal = lockedLines.reduce((sum, line) => sum + BigInt(line.estimatedAmountMinor), BigInt(0));
      if (lockedLines.length === 0 || lockedTotal <= BigInt(0) || lockedTotal !== lockedRequest.totalEstimatedMinor || lockedTotal !== total) {
        throw new Error("Approved request header and locked line totals must match before ordering");
      }
      lines = lockedLines as unknown as Array<Record<string, unknown>>;
    },
    afterCreate: async (tx, commitment) => {
      if (!tx.prisma?.$queryRawUnsafe || !tx.prisma.budgetLineItem?.update || !tx.prisma.budget?.update) throw new Error("Procurement budget rollup is unavailable");
      for (const line of lines) {
        const budgetCodeId = (line.budgetCode as { id?: string } | null)?.id ?? (line.budgetCodeId ? String(line.budgetCodeId) : null);
        const lineAmount = BigInt(String(line.estimatedAmountMinor ?? 0));
        if (!budgetCodeId || lineAmount <= BigInt(0)) throw new Error("Every procurement line requires a positive amount and budget code");
        await requireCreate(tx.sudo(), "ContractLineItem")({ data: {
          lineNumber: Number(line.lineNumber ?? 1), description: requiredText(line.description, "Procurement line description", 500),
          scheduledValueMinor: lineAmount.toString(), revisedValueMinor: lineAmount.toString(), commitment: { connect: { id: commitment.id } },
          budgetCode: { connect: { id: budgetCodeId } }, project: { connect: { id } },
        } });
        const [budgetLine] = await tx.prisma.$queryRawUnsafe<Array<{ id: string; budgetId: string }>>(
          `SELECT line.id, line.budget AS "budgetId" FROM "BudgetLineItem" line JOIN "Budget" budget ON budget.id = line.budget
           WHERE line.project = $1 AND line."budgetCode" = $2 AND budget.status = 'active' ORDER BY line."createdAt" ASC LIMIT 1 FOR UPDATE OF line, budget`, id, budgetCodeId,
        );
        if (!budgetLine) throw new Error("Procurement order requires a matching active budget line");
        await tx.prisma.budgetLineItem.update({ where: { id: budgetLine.id }, data: {
          committedAmountMinor: { increment: lineAmount }, projectedFinalCostMinor: { increment: lineAmount }, projectedOverUnderMinor: { decrement: lineAmount },
        } });
        await tx.prisma.budget.update({ where: { id: budgetLine.budgetId }, data: { totalCommittedMinor: { increment: lineAmount } } });
      }
      await requireUpdate(tx.sudo(), "ProcurementRequest")({ where: { id: requestId }, data: {
        status: "ordered", orderedAt: new Date(),
        commitment: { connect: { id: commitment.id } }, tradePartner: { connect: { id: partnerId } },
      } });
    },
  });
}

export async function recordMaterialReceipt(_root: unknown, { input }: { input: ConstructionWorkflowInput }, context: CommandContext) {
  const id = projectId(input);
  const requestId = requiredText(input.relatedId, "Procurement request id", 200);
  const requestLineId = requiredText(input.secondaryId, "Procurement line id", 200);
  const evidenceReference = requiredText(input.evidenceReference, "Packing slip/evidence reference", 160);
  const evidenceHash = checksum(input.evidenceChecksumSha256);
  const received = decimalQuantity(input.quantity, "Received quantity");
  const accepted = input.type === "rejected" ? "0" : received;
  const rejected = input.type === "rejected" ? received : "0";
  const request = await queryById(context, "ProcurementRequest", requestId, "id status tradePartner { id } commitment { id } project { id }") as Record<string, unknown> & {
    status?: string; tradePartner?: { id?: string } | null; commitment?: { id?: string } | null; project?: { id?: string } | null;
  } | null;
  const requestPartnerId = request?.tradePartner?.id ?? null;
  if (request?.project?.id !== id) throw new Error("Receiving requires an ordered request linked to its purchase order");
  if (input.partnerId && input.partnerId !== requestPartnerId) throw new Error("Receipt vendor must match the approved procurement request");
  const receivable = ["ordered", "partially_received"].includes(String(request.status)) && Boolean(request.commitment?.id);
  return executeProjectCommand({
    context, operation: "recordMaterialReceipt", permission: "canManageContracts", projectId: id,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "MaterialReceipt",
    beforeAdmission: async () => { if (!receivable) throw new Error("Receiving requires an ordered request linked to its purchase order"); },
    data: {},
    beforeCreate: async tx => {
      if (!tx.prisma?.$queryRawUnsafe) throw new Error("Receipt quantity lock is unavailable");
      const [locked] = await tx.prisma.$queryRawUnsafe<Array<{
        requestId: string; projectId: string; requestStatus: string; commitmentId: string | null;
        partnerId: string | null; orderedQuantity: string;
      }>>(
        `SELECT request.id AS "requestId", request.project AS "projectId", request.status::text AS "requestStatus",
                request.commitment AS "commitmentId", request."tradePartner" AS "partnerId", line.quantity::text AS "orderedQuantity"
         FROM "ProcurementRequestLine" line JOIN "ProcurementRequest" request ON request.id = line.request
         WHERE line.id = $1 FOR UPDATE OF request, line`, requestLineId,
      );
      if (!locked || locked.requestId !== requestId || locked.projectId !== id ||
          !["ordered", "partially_received"].includes(locked.requestStatus) || !locked.commitmentId) {
        throw new Error("Receipt line must belong to this ordered request and purchase order");
      }
      if (input.partnerId && locked.partnerId !== input.partnerId) throw new Error("Receipt vendor no longer matches the request vendor");
      const [totals] = await tx.prisma.$queryRawUnsafe<Array<{ accepted: string; received: string }>>(
        `SELECT COALESCE(SUM(receiptLine."quantityAccepted"), 0)::text AS accepted,
                COALESCE(SUM(receiptLine."quantityReceived"), 0)::text AS received
         FROM "MaterialReceiptLine" receiptLine JOIN "MaterialReceipt" receipt ON receipt.id = receiptLine.receipt
         WHERE receiptLine."requestLine" = $1 AND receipt.status <> 'voided'`, requestLineId,
      );
      const acceptedUnits = quantityToUnits(String(totals?.accepted ?? "0"));
      const receivedUnits = quantityToUnits(String(totals?.received ?? "0"));
      const orderedUnits = quantityToUnits(locked.orderedQuantity);
      if (!receiptCapacityIsValid({
        orderedUnits,
        receivedToDateUnits: receivedUnits,
        acceptedToDateUnits: acceptedUnits,
        additionalReceivedUnits: quantityToUnits(received),
        additionalAcceptedUnits: quantityToUnits(accepted),
      })) {
        throw new Error("This delivery exceeds the quantity still outstanding on the order line");
      }
      return {
        receiptNumber: requiredText(input.reference, "Receipt number", 100), status: input.type === "rejected" ? "rejected" : "recorded",
        receivedAt: optionalDate(input.occurredAt, "Received date") ?? new Date(), packingSlipReference: evidenceReference,
        evidenceFileName: requiredText(input.title, "Evidence file name", 240), evidenceStorageKey: `external:${evidenceReference}`,
        evidenceChecksumSha256: evidenceHash, notes: input.description?.trim(), request: { connect: { id: requestId } },
        commitment: { connect: { id: locked.commitmentId } },
        ...(locked.partnerId ? { tradePartner: { connect: { id: locked.partnerId } } } : {}),
        receivedBy: { connect: { id: requireCommandSession(context).itemId } }, project: { connect: { id } },
      };
    },
    afterCreate: async (tx, receipt) => {
      await requireCreate(tx.sudo(), "MaterialReceiptLine")({ data: {
        lineNumber: 1, quantityReceived: received, quantityAccepted: accepted, quantityRejected: rejected,
        exceptionReason: input.type === "rejected" ? requiredText(input.description, "Rejection reason", 2000) : undefined,
        receipt: { connect: { id: receipt.id } }, requestLine: { connect: { id: requestLineId } }, project: { connect: { id } },
      } });
    },
  });
}

export async function recordLienWaiverEvidence(_root: unknown, { input }: { input: ConstructionWorkflowInput }, context: CommandContext) {
  const id = projectId(input);
  const commitmentId = requiredText(input.relatedId, "Commitment id", 200);
  const partnerId = requiredText(input.partnerId, "Trade partner id", 200);
  const evidenceReference = requiredText(input.evidenceReference, "External evidence reference", 160);
  return executeProjectCommand({
    context, operation: "recordLienWaiverEvidence", permission: "canManageBilling", projectId: id,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "LienWaiver",
    data: {
      waiverNumber: requiredText(input.reference, "Waiver number", 100), waiverType: input.type || "conditional_progress",
      status: "received", throughDate: optionalDate(input.dueAt, "Through date") ?? new Date(),
      amountMinor: amount(input.amountMinor, "Waiver amount"), requestedAt: new Date(), receivedAt: new Date(),
      signedAt: optionalDate(input.occurredAt, "Signed date") ?? new Date(), signerName: requiredText(input.title, "Signer name", 200),
      fileName: `${evidenceReference}.external`, storageKey: `external:${evidenceReference}`, checksumSha256: checksum(input.evidenceChecksumSha256),
      tradePartner: { connect: { id: partnerId } }, commitment: { connect: { id: commitmentId } },
      reviewedBy: { connect: { id: requireCommandSession(context).itemId } }, project: { connect: { id } },
    },
  });
}

export async function requestRetainageRelease(_root: unknown, { input }: { input: ConstructionWorkflowInput }, context: CommandContext) {
  const id = projectId(input);
  const claimId = requiredText(input.relatedId, "Progress claim id", 200);
  const paymentId = requiredText(input.secondaryId, "Covering settled payment id", 200);
  const releaseAmount = amount(input.amountMinor, "Retainage amount", true);
  return executeProjectCommand({
    context, operation: "requestRetainageRelease", permission: "canManageBilling", projectId: id,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "RetainageRelease", data: {},
    beforeCreate: async tx => {
      if (!tx.prisma?.$queryRawUnsafe) throw new Error("Retainage capacity lock is unavailable");
      const [payment] = await tx.prisma.$queryRawUnsafe<Array<{
        status: string; amountMinor: bigint; projectId: string; direction: string; currencyCode: string; partnerId: string | null;
      }>>(
        `SELECT status::text, "amountMinor", project AS "projectId", direction::text AS direction,
                "currencyCode", "tradePartner" AS "partnerId"
         FROM "Payment" WHERE id = $1 FOR UPDATE`, paymentId,
      );
      const [claim] = await tx.prisma.$queryRawUnsafe<Array<{
        status: string; retainageMinor: bigint; projectId: string; claimType: string; currencyCode: string; partnerId: string | null;
      }>>(
        `SELECT status::text, "retainageMinor", project AS "projectId", "claimType"::text AS "claimType",
                "currencyCode", "tradePartner" AS "partnerId"
         FROM "ProgressClaim" WHERE id = $1 FOR UPDATE`, claimId,
      );
      if (!payment || payment.status !== "settled" || payment.projectId !== id ||
          !claim || claim.projectId !== id || !["approved", "partially_paid", "paid", "closed"].includes(claim.status)) {
        throw new Error("Retainage requires an approved claim and a settled payment in the same project");
      }
      assertSettlementCompatibility({
        claimSide: claim.claimType === "owner" ? "owner" : "commitment",
        claimPartnerId: claim.partnerId,
        claimCurrencyCode: claim.currencyCode,
        paymentDirection: payment.direction as "receipt" | "disbursement",
        paymentPartnerId: payment.partnerId,
        paymentCurrencyCode: payment.currencyCode,
      });
      const [claimReserved] = await tx.prisma.$queryRawUnsafe<Array<{ total: bigint }>>(
        `SELECT COALESCE(SUM("amountMinor"), 0)::bigint AS total FROM "RetainageRelease"
         WHERE "progressClaim" = $1 AND status IN ('requested', 'approved', 'released')`, claimId,
      );
      const [paymentAllocated] = await tx.prisma.$queryRawUnsafe<Array<{ total: bigint }>>(
        `SELECT COALESCE(SUM(allocation."amountMinor"), 0)::bigint AS total
         FROM "PaymentAllocation" allocation JOIN "Payment" p ON p.id = allocation.payment
         WHERE allocation.payment = $1 AND p.status = 'settled'`, paymentId,
      );
      const [paymentReserved] = await tx.prisma.$queryRawUnsafe<Array<{ total: bigint }>>(
        `SELECT COALESCE(SUM("amountMinor"), 0)::bigint AS total FROM "RetainageRelease"
         WHERE payment = $1 AND status IN ('requested', 'approved', 'released')`, paymentId,
      );
      const requested = BigInt(releaseAmount);
      if (requested > remainingCapacityMinor(claim.retainageMinor, claimReserved?.total ?? BigInt(0))) {
        throw new Error("Retainage release exceeds the claim's remaining held retainage");
      }
      if (requested > remainingCapacityMinor(payment.amountMinor, (paymentAllocated?.total ?? BigInt(0)) + (paymentReserved?.total ?? BigInt(0)))) {
        throw new Error("Retainage release exceeds the payment's unallocated settlement capacity");
      }
      return {
        releaseNumber: requiredText(input.reference, "Release number", 100), status: "requested",
        amountMinor: releaseAmount, currencyCode: claim.currencyCode,
        reason: requiredText(input.description, "Release reason", 2000),
        progressClaim: { connect: { id: claimId } }, payment: { connect: { id: paymentId } }, project: { connect: { id } },
      };
    },
  });
}

export async function registerDrawing(_root: unknown, { input }: { input: ConstructionWorkflowInput }, context: CommandContext) {
  const id = projectId(input);
  return executeProjectCommand({
    context, operation: "registerDrawing", permission: "canManageDocuments", projectId: id,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "Drawing",
    data: { drawingNumber: requiredText(input.reference, "Drawing number", 100), title: requiredText(input.title, "Drawing title", 300), discipline: input.description?.trim(), project: { connect: { id } } },
  });
}

export async function registerSchedule(_root: unknown, { input }: { input: ConstructionWorkflowInput }, context: CommandContext) {
  const id = projectId(input);
  return executeProjectCommand({
    context, operation: "registerSchedule", permission: "canManageProjectExecution", projectId: id,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "Schedule",
    data: { name: requiredText(input.title, "Schedule name", 240), scheduleType: input.type || "current", status: "draft", dataDate: optionalDate(input.occurredAt, "Data date"), project: { connect: { id } } },
  });
}

export async function createResourceCatalogItem(_root: unknown, { input }: { input: ConstructionWorkflowInput }, context: CommandContext) {
  const id = projectId(input);
  const { companyId } = await projectCompany(context, id);
  const equipment = input.type === "equipment";
  return executeProjectCommand({
    context, operation: "createResourceCatalogItem", permission: "canManageFieldOperations", projectId: id,
    idempotencyKey: input.idempotencyKey, request: input, listKey: equipment ? "Equipment" : "Material",
    data: equipment ? {
      equipmentNumber: requiredText(input.reference, "Equipment number", 100), name: requiredText(input.title, "Equipment name", 240),
      description: input.description?.trim(), status: "available", company: { connect: { id: companyId } },
    } : {
      sku: requiredText(input.reference, "Material SKU", 100), name: requiredText(input.title, "Material name", 240),
      description: input.description?.trim(), unit: requiredText(input.unit, "Material unit", 40), isActive: "active",
      company: { connect: { id: companyId } },
    },
  });
}

export async function recordResourceActivity(_root: unknown, { input }: { input: ConstructionWorkflowInput }, context: CommandContext) {
  const id = projectId(input);
  const fact = validateResourceFact(input.type, input.reference, input.quantity, input.unit);
  const resourceId = requiredText(input.relatedId, `${fact.resourceType} id`, 200);
  const occurredAt = validateResourceOccurrence(input.occurredAt);
  const actor = requireCommandSession(context);
  const authority = await resourceAuthority(context, id, true);
  const actorId = actor.itemId;
  const principalId = actor.authType === "api_key" ? `api:${actor.apiCredential?.id ?? ""}` : "human";
  if (input.intentVersion != null && (input.intentVersion !== 2 || input.intentActorId !== actor.itemId || input.intentPrincipalId !== principalId || input.intentCompanyId !== authority.companyId || !input.intentCurrencyCode)) throw new Error("Original resource intent does not match the current actor/purpose/company/project");
  if (input.intentVersion === 2) decodeResourceIntent(encodeResourceIntent({ scope: { version: 2, purpose: "recordResourceActivity", actorId, principalId, companyId: authority.companyId, projectId: id, currencyCode: input.intentCurrencyCode! }, input }));
  const totalCostMinor = input.amountMinor ? amount(input.amountMinor, "Resource cost") : "0";
  const authorizeOriginal = async (tx: CommandContext) => {
    const next = await resourceAuthority(tx, id, true);
    const nextPrincipal = next.session.authType === "api_key" ? `api:${next.session.apiCredential?.id ?? ""}` : "human";
    if (next.companyId !== authority.companyId || next.session.itemId !== actorId || nextPrincipal !== principalId) throw new Error("Original resource recovery scope changed; not authorized");
    return next;
  };
  return executeProjectCommand({
    context, operation: "recordResourceActivity", permission: "canManageFieldOperations", projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: { ...input, actorId: actor.itemId, principalId: actor.authType === "api_key" ? `api:${actor.apiCredential?.id ?? ""}` : "human" }, listKey: "ResourceLog", data: {},
    beforeReplay: async tx => { await authorizeOriginal(tx); },
    beforeAdmission: async tx => {
      const current = await authorizeOriginal(tx);
      if (input.intentVersion === 2 && input.intentCurrencyCode !== current.currencyCode) throw new Error("Original currency changed; reconcile before NEW admission");
      if (current.currencyCode !== "USD" && totalCostMinor !== "0") throw new Error("Resource monetary recording requires a USD project until currency propagation is verified");
    },
    beforeCreate: async tx => {
      const current = await authorizeOriginal(tx);
      if (current.companyId !== authority.companyId || current.currencyCode !== authority.currencyCode || (input.intentVersion === 2 && input.intentCurrencyCode !== current.currencyCode)) throw new Error("Project scope or currency changed; reconcile the original intent before NEW admission");
      if (current.currencyCode !== "USD" && totalCostMinor !== "0") throw new Error("Resource monetary recording requires a USD project until currency propagation is verified");
      const resource = await queryById(tx, fact.resourceType === "equipment" ? "Equipment" : "Material", resourceId,
        fact.resourceType === "equipment" ? "id status company { id }" : "id isActive company { id }");
      if (resource?.company?.id !== current.companyId || (fact.resourceType === "equipment" ? resource.status === "retired" : resource.isActive !== "active")) {
        throw new Error("Resource is unavailable in this company");
      }
      if (input.secondaryId) {
        const code = await queryById(tx, "BudgetCode", input.secondaryId, "id company { id } project { id }");
        if (code?.company?.id !== current.companyId || code?.project?.id !== id) throw new Error("Budget code is unavailable in this project");
      }
      return {
        ...fact, occurredAt, totalCostMinor, currencyCode: current.currencyCode,
        notes: input.description ? requiredText(input.description, "Resource notes", 4000) : "", [fact.resourceType]: { connect: { id: resourceId } },
        ...(input.secondaryId ? { budgetCode: { connect: { id: input.secondaryId } } } : {}),
        operator: { connect: { id: actorId } }, project: { connect: { id } },
      };
    },
  });
}

export async function inviteProjectMember(_root: unknown, { input }: { input: ConstructionWorkflowInput }, context: CommandContext) {
  const id = projectId(input);
  const roleId = requiredText(input.roleId, "Membership role id", 200);
  const email = requiredText(input.reference, "Invitee email", 320).toLowerCase();
  const name = requiredText(input.title, "Invitee name", 200);
  const accessLevel = ["viewer", "contributor", "manager"].includes(String(input.type)) ? String(input.type) : "viewer";
  const requestedPortalType = ["internal", "owner", "designer", "subcontractor", "vendor"].includes(String(input.unit)) ? String(input.unit) : "internal";
  if ((requestedPortalType === "internal") === Boolean(input.partnerId)) {
    throw new Error("Internal members cannot have a portal organization, and external members require one");
  }
  const portalType = requestedPortalType;
  const { companyId } = await projectCompany(context, id);
  if (input.partnerId) {
    const partner = await queryById(context, "TradePartner", input.partnerId, "id partnerType company { id }");
    if (partner?.company?.id !== companyId || partner.partnerType !== portalType) {
      throw new Error("Portal organization must belong to the company and match the selected portal type");
    }
  }
  const activationToken = `ofc_inv_${randomBytes(32).toString("base64url")}`;
  const tokenHash = createHash("sha256").update(activationToken).digest("hex");
  let inviteeUserId = "";
  let accountSetupRequired = false;
  const result = await executeProjectCommand({
    context, operation: "inviteProjectMember", permission: "canManagePeople", projectId: id,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "ProjectMembership", data: {},
    beforeCreate: async tx => {
      const sudo = tx.sudo();
      const role = await sudo.query.Role.findOne!({ where: { id: roleId }, query: "id name canAccessDashboard canManageCompanies canManagePeople canManageAgents canManageOnboarding company { id }" });
      if (role?.company?.id !== companyId) throw new Error("Membership role must belong to the project company");
      if (portalType !== "internal" && [role.canAccessDashboard, role.canManageCompanies, role.canManagePeople, role.canManageAgents, role.canManageOnboarding].some(Boolean)) {
        throw new Error("External participants require a portal-safe role without internal administration authority");
      }
      const users = await sudo.query.User.findMany!({ where: { email: { equals: email } }, take: 1, query: "id isActive authSessionsCount" });
      let userId = String(users[0]?.id ?? "");
      if (!userId) {
        accountSetupRequired = true;
        const user = await requireCreate(sudo, "User")({ data: {
          name, email, password: randomBytes(32).toString("base64url"), isActive: false, onboardingStatus: "not_started",
        } });
        userId = user.id;
      } else if (users[0]?.isActive !== true && Number(users[0]?.authSessionsCount ?? 0) === 0) {
        // An earlier invitation created this account and it was never set up.
        accountSetupRequired = true;
      }
      inviteeUserId = userId;
      const [existingMembership] = await sudo.query.ProjectMembership.findMany!({
        where: { membershipKey: { equals: `${id}:${userId}` } }, take: 1, query: "id status",
      });
      if (existingMembership?.status === "active") throw new Error("This person is already an active member of the project");
      if (existingMembership?.status === "invited") throw new Error("This person already has a pending invitation; resend it instead");
      if (existingMembership?.id) {
        // Retire the suspended/revoked grant under its own key so its history is
        // kept and the new invitation is an explicit, separate grant.
        await requireUpdate(sudo, "ProjectMembership")({ where: { id: String(existingMembership.id) }, data: {
          membershipKey: `${id}:${userId}:retired:${existingMembership.id}`,
        } });
      }
      const companyMemberships = await sudo.query.CompanyMembership.findMany!({
        where: { membershipKey: { equals: `${companyId}:${userId}` } }, take: 1, query: "id status",
      });
      const companyMembership = companyMemberships[0];
      if (companyMembership?.id && !["active", "invited"].includes(String(companyMembership.status))) {
        if (!hasCompanyPermission(requireCommandSession(tx), companyId, "canManagePeople")) {
          throw new Error("This person's company access is suspended; a company administrator must restore it");
        }
        await requireUpdate(sudo, "CompanyMembership")({ where: { id: String(companyMembership.id) }, data: { status: "invited" } });
      }
      if (!companyMembership?.id) {
        await requireCreate(sudo, "CompanyMembership")({ data: {
          membershipKey: `${companyId}:${userId}`, status: "invited", canAccessAllProjects: false,
          role: { connect: { id: roleId } }, invitedBy: { connect: { id: requireCommandSession(context).itemId } },
          company: { connect: { id: companyId } }, user: { connect: { id: userId } },
        } });
      }
      return {
        membershipKey: `${id}:${userId}`, status: "invited", accessLevel, portalType,
        role: { connect: { id: roleId } }, ...(input.partnerId ? { portalOrganization: { connect: { id: input.partnerId } } } : {}),
        project: { connect: { id } }, user: { connect: { id: userId } },
      };
    },
    afterCreate: async (tx, membership) => {
      if (!inviteeUserId) throw new Error("Invitee identity is unavailable");
      await requireCreate(tx.sudo(), "AccountInvitation")({ data: {
        tokenHash,
        tokenPrefix: activationToken.slice(0, 16),
        email,
        status: "pending",
        accountSetupRequired,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        invitedBy: { connect: { id: requireCommandSession(context).itemId } },
        user: { connect: { id: inviteeUserId } },
        projectMembership: { connect: { id: membership.id } },
        project: { connect: { id } },
      } });
    },
  });
  return { ...result, activationToken: result.replayed ? null : activationToken };
}

export async function reverseSettledPayment(_root: unknown, { input }: { input: ConstructionWorkflowInput }, context: CommandContext) {
  const id = projectId(input);
  const paymentId = requiredText(input.relatedId, "Payment id", 200);
  let amountMinor = "0";
  let allocations: Array<{ id: string; amountMinor: bigint; claimId: string }> = [];
  return executeProjectCommand({
    context, operation: "reverseSettledPayment", permission: "canManageBilling", projectId: id,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "Payment", updateId: paymentId, data: {},
    beforeCreate: async tx => {
      if (!tx.prisma?.$queryRawUnsafe) throw new Error("Transactional payment reversal lock is unavailable");
      const [payment] = await tx.prisma.$queryRawUnsafe<Array<{ status: string; amountMinor: bigint; projectId: string }>>(
        `SELECT status::text, "amountMinor", project AS "projectId" FROM "Payment" WHERE id = $1 FOR UPDATE`, paymentId,
      );
      if (!payment || payment.projectId !== id || payment.status !== "settled") throw new Error("Only a settled project payment can be reversed");
      const [retainage] = await tx.prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count FROM "RetainageRelease" WHERE payment = $1 AND status = 'released'`, paymentId,
      );
      if ((retainage?.count ?? BigInt(0)) > BigInt(0)) throw new Error("Reverse released retainage through a reviewed accounting correction before reversing this payment");
      allocations = await tx.prisma.$queryRawUnsafe<Array<{ id: string; amountMinor: bigint; claimId: string }>>(
        `SELECT id, "amountMinor", "progressClaim" AS "claimId" FROM "PaymentAllocation" WHERE payment = $1 ORDER BY "progressClaim" FOR UPDATE`, paymentId,
      );
      for (const claimId of [...new Set(allocations.map(entry => entry.claimId))].sort()) {
        await tx.prisma.$queryRawUnsafe(`SELECT id FROM "ProgressClaim" WHERE id = $1 FOR UPDATE`, claimId);
      }
      amountMinor = payment.amountMinor.toString();
      return { status: "reversed" };
    },
    afterCreate: async tx => {
      const sudo = tx.sudo();
      await requireCreate(sudo, "PaymentReversal")({ data: {
        reversalNumber: requiredText(input.reference, "Reversal number", 100), amountMinor,
        reason: requiredText(input.description, "Reversal reason", 2000),
        externalReference: requiredText(input.title, "External reversal reference", 200),
        effectiveAt: optionalDate(input.occurredAt, "Reversal effective date") ?? new Date(),
        allocationSnapshot: JSON.stringify(allocations.map(entry => ({ allocationId: entry.id, claimId: entry.claimId, amountMinor: entry.amountMinor.toString() }))),
        payment: { connect: { id: paymentId } }, reversedBy: { connect: { id: requireCommandSession(context).itemId } },
        project: { connect: { id } },
      } });
      if (!tx.prisma?.$queryRawUnsafe || !tx.prisma.$executeRawUnsafe || !tx.prisma.progressClaim?.update) throw new Error("Claim correction client is unavailable");
      for (const claimId of [...new Set(allocations.map(entry => entry.claimId))]) {
        const [totals] = await tx.prisma.$queryRawUnsafe<Array<{ allocated: bigint; due: bigint }>>(
          `SELECT COALESCE(SUM(allocation."amountMinor") FILTER (WHERE payment.status = 'settled'), 0)::bigint AS allocated,
                  claim."currentPaymentDueMinor" AS due
           FROM "ProgressClaim" claim
           LEFT JOIN "PaymentAllocation" allocation ON allocation."progressClaim" = claim.id
           LEFT JOIN "Payment" payment ON payment.id = allocation.payment
           WHERE claim.id = $1 GROUP BY claim.id`, claimId,
        );
        if (!totals) throw new Error("Reversed claim settlement total is unavailable");
        const status = deriveClaimPaymentStatus(totals.due, totals.allocated);
        await tx.prisma.progressClaim.update({ where: { id: claimId }, data: { status } });
        const [parent] = await tx.prisma.$queryRawUnsafe<Array<{ commitmentId: string | null; primeContractId: string | null }>>(
          `SELECT commitment AS "commitmentId", "primeContract" AS "primeContractId" FROM "ProgressClaim" WHERE id = $1`, claimId,
        );
        if (parent?.commitmentId) {
          await tx.prisma.$executeRawUnsafe(
            `UPDATE "Commitment" SET "paidToDateMinor" = (
              SELECT COALESCE(SUM(allocation."amountMinor"), 0)::bigint FROM "PaymentAllocation" allocation
              JOIN "Payment" payment ON payment.id = allocation.payment JOIN "ProgressClaim" claim ON claim.id = allocation."progressClaim"
              WHERE claim.commitment = $1 AND payment.status = 'settled'
            ) WHERE id = $1`, parent.commitmentId,
          );
        } else if (parent?.primeContractId) {
          await tx.prisma.$executeRawUnsafe(
            `UPDATE "PrimeContract" SET "paidToDateMinor" = (
              SELECT COALESCE(SUM(allocation."amountMinor"), 0)::bigint FROM "PaymentAllocation" allocation
              JOIN "Payment" payment ON payment.id = allocation.payment JOIN "ProgressClaim" claim ON claim.id = allocation."progressClaim"
              WHERE claim."primeContract" = $1 AND payment.status = 'settled'
            ) WHERE id = $1`, parent.primeContractId,
          );
        }
      }
    },
  });
}

export async function allocateSettledPayment(_root: unknown, { input }: { input: ConstructionWorkflowInput }, context: CommandContext) {
  const id = projectId(input);
  const paymentId = requiredText(input.relatedId, "Settled payment id", 200);
  const claimId = requiredText(input.secondaryId, "Progress claim id", 200);
  const allocation = amount(input.amountMinor, "Allocation amount", true);
  return executeProjectCommand({
    context, operation: "allocateSettledPayment", permission: "canManageBilling", projectId: id,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "PaymentAllocation", data: {},
    beforeCreate: async tx => {
      if (!tx.prisma?.$queryRawUnsafe) throw new Error("Transactional settlement allocation is unavailable");
      const [payment] = await tx.prisma.$queryRawUnsafe<Array<{
        status: string; amountMinor: bigint; projectId: string; direction: string; currencyCode: string; partnerId: string | null;
      }>>(
        `SELECT status::text, "amountMinor", project AS "projectId", direction::text AS direction,
                "currencyCode", "tradePartner" AS "partnerId"
         FROM "Payment" WHERE id = $1 FOR UPDATE`, paymentId,
      );
      const [claim] = await tx.prisma.$queryRawUnsafe<Array<{
        status: string; currentPaymentDueMinor: bigint; projectId: string; claimType: string; currencyCode: string; partnerId: string | null;
      }>>(
        `SELECT status::text, "currentPaymentDueMinor", project AS "projectId", "claimType"::text AS "claimType",
                "currencyCode", "tradePartner" AS "partnerId"
         FROM "ProgressClaim" WHERE id = $1 FOR UPDATE`, claimId,
      );
      if (!payment || payment.status !== "settled" || payment.projectId !== id) throw new Error("Only a settled payment in this project can be allocated");
      if (!claim || !["approved", "partially_paid"].includes(claim.status) || claim.projectId !== id) throw new Error("Claim is not eligible for allocation");
      assertSettlementCompatibility({
        claimSide: claim.claimType === "owner" ? "owner" : "commitment",
        claimPartnerId: claim.partnerId,
        claimCurrencyCode: claim.currencyCode,
        paymentDirection: payment.direction as "receipt" | "disbursement",
        paymentPartnerId: payment.partnerId,
        paymentCurrencyCode: payment.currencyCode,
      });
      const [paymentTotal] = await tx.prisma.$queryRawUnsafe<Array<{ total: bigint }>>(
        `SELECT COALESCE(SUM(allocation."amountMinor"), 0)::bigint AS total
         FROM "PaymentAllocation" allocation JOIN "Payment" payment ON payment.id = allocation.payment
         WHERE allocation.payment = $1 AND payment.status = 'settled'`, paymentId,
      );
      const [claimTotal] = await tx.prisma.$queryRawUnsafe<Array<{ total: bigint }>>(
        `SELECT COALESCE(SUM(allocation."amountMinor"), 0)::bigint AS total
         FROM "PaymentAllocation" allocation JOIN "Payment" payment ON payment.id = allocation.payment
         WHERE allocation."progressClaim" = $1 AND payment.status = 'settled'`, claimId,
      );
      const [reservedRetainage] = await tx.prisma.$queryRawUnsafe<Array<{ total: bigint }>>(
        `SELECT COALESCE(SUM("amountMinor"), 0)::bigint AS total FROM "RetainageRelease"
         WHERE payment = $1 AND status IN ('requested', 'approved', 'released')`, paymentId,
      );
      const paymentUsed = (paymentTotal?.total ?? BigInt(0)) + (reservedRetainage?.total ?? BigInt(0));
      const claimUsed = claimTotal?.total ?? BigInt(0);
      if (BigInt(allocation) > remainingCapacityMinor(payment.amountMinor, paymentUsed)) {
        throw new Error("Allocation exceeds settled payment capacity reserved for claims and retainage");
      }
      if (BigInt(allocation) > remainingCapacityMinor(claim.currentPaymentDueMinor, claimUsed)) {
        throw new Error("Allocation exceeds remaining claim payment due after effective settlements");
      }
      return {
        amountMinor: allocation, payment: { connect: { id: paymentId } }, progressClaim: { connect: { id: claimId } },
        project: { connect: { id } },
      };
    },
    afterCreate: async tx => {
      if (!tx.prisma?.$queryRawUnsafe || !tx.prisma.$executeRawUnsafe || !tx.prisma.progressClaim?.update) throw new Error("Transactional claim update is unavailable");
      const [totals] = await tx.prisma.$queryRawUnsafe<Array<{ allocated: bigint; due: bigint }>>(
        `SELECT COALESCE(SUM(allocation."amountMinor") FILTER (WHERE payment.status = 'settled'), 0)::bigint AS allocated,
                claim."currentPaymentDueMinor" AS due
         FROM "ProgressClaim" claim LEFT JOIN "PaymentAllocation" allocation ON allocation."progressClaim" = claim.id
         LEFT JOIN "Payment" payment ON payment.id = allocation.payment
         WHERE claim.id = $1 GROUP BY claim.id`, claimId,
      );
      if (!totals) throw new Error("Claim settlement total is unavailable");
      const status = deriveClaimPaymentStatus(totals.due, totals.allocated);
      if (status === "approved") throw new Error("Settled allocation did not change the claim balance");
      await tx.prisma.progressClaim.update({ where: { id: claimId }, data: { status } });
      const [parent] = await tx.prisma.$queryRawUnsafe<Array<{ commitmentId: string | null; primeContractId: string | null }>>(
        `SELECT commitment AS "commitmentId", "primeContract" AS "primeContractId" FROM "ProgressClaim" WHERE id = $1`, claimId,
      );
      if (parent?.commitmentId) {
        await tx.prisma.$executeRawUnsafe(
          `UPDATE "Commitment" SET "paidToDateMinor" = (
            SELECT COALESCE(SUM(allocation."amountMinor"), 0)::bigint FROM "PaymentAllocation" allocation
            JOIN "Payment" payment ON payment.id = allocation.payment
            JOIN "ProgressClaim" claim ON claim.id = allocation."progressClaim"
            WHERE claim.commitment = $1 AND payment.status = 'settled'
          ) WHERE id = $1`, parent.commitmentId,
        );
      } else if (parent?.primeContractId) {
        await tx.prisma.$executeRawUnsafe(
          `UPDATE "PrimeContract" SET "paidToDateMinor" = (
            SELECT COALESCE(SUM(allocation."amountMinor"), 0)::bigint FROM "PaymentAllocation" allocation
            JOIN "Payment" payment ON payment.id = allocation.payment
            JOIN "ProgressClaim" claim ON claim.id = allocation."progressClaim"
            WHERE claim."primeContract" = $1 AND payment.status = 'settled'
          ) WHERE id = $1`, parent.primeContractId,
        );
      }
    },
  });
}

/** Add a specification section that submittals, RFIs and inspections can reference. */
export async function registerSpecificationSection(_root: unknown, { input }: { input: ConstructionWorkflowInput }, context: CommandContext) {
  const id = projectId(input);
  const division = input.type?.trim();
  if (division && division.length > 120) throw new Error("Division must be at most 120 characters");
  return executeProjectCommand({
    context, operation: "registerSpecificationSection", permission: "canManageDocuments", projectId: id,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "SpecificationSection",
    data: {
      sectionNumber: requiredText(input.reference, "Section number", 40), title: requiredText(input.title, "Section title", 240),
      division: division || undefined, description: input.description?.trim(), project: { connect: { id } },
    },
  });
}

const INSPECTION_TYPES = ["safety", "quality", "pre_installation", "commissioning", "regulatory", "equipment"];

/** Create an inspection checklist template. Reusing a template name issues its next version. */
export async function registerInspectionTemplate(_root: unknown, { input }: { input: ConstructionWorkflowInput }, context: CommandContext) {
  const id = projectId(input);
  const inspectionType = INSPECTION_TYPES.includes(String(input.type)) ? String(input.type) : null;
  if (!inspectionType) throw new Error("Select the inspection type");
  const name = requiredText(input.title, "Template name", 240);
  const data = { name, inspectionType, instructions: input.description?.trim(), isActive: true, project: { connect: { id } } };
  return executeProjectCommand({
    context, operation: "registerInspectionTemplate", permission: "canManageSafety", projectId: id,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "InspectionTemplate",
    data,
    beforeCreate: async tx => {
      if (!tx.prisma?.$queryRawUnsafe) throw new Error("Inspection template versioning is unavailable");
      await tx.prisma.$queryRawUnsafe('SELECT id FROM "Project" WHERE id = $1 FOR UPDATE', id);
      const [latest] = await tx.prisma.$queryRawUnsafe<Array<{ version: number | null }>>(
        'SELECT MAX(version)::int AS version FROM "InspectionTemplate" WHERE project = $1 AND lower(name) = lower($2)', id, name,
      );
      return { ...data, version: Number(latest?.version ?? 0) + 1 };
    },
  });
}

type LockedChangeEvent = { status: string; projectId: string };

async function lockOpenChangeEvent(context: CommandContext, changeEventId: string, project: string) {
  if (!context.prisma?.$queryRawUnsafe) throw new Error("Change event locking is unavailable");
  const [event] = await context.prisma.$queryRawUnsafe<LockedChangeEvent[]>(
    'SELECT status::text AS status, project AS "projectId" FROM "ChangeEvent" WHERE id = $1 FOR UPDATE', changeEventId,
  );
  if (!event || event.projectId !== project) throw new Error("Change event not found in this project");
  if (!["open", "pricing"].includes(event.status)) throw new Error("Only an open change event can be priced");
  return event;
}

/** Add a priced line to an open change event and roll its estimated exposure up to the event. */
export async function addChangeEventLine(_root: unknown, { input }: { input: ConstructionWorkflowInput }, context: CommandContext) {
  const id = projectId(input);
  const changeEventId = requiredText(input.relatedId, "Change event id", 200);
  const estimatedCost = amount(input.amountMinor, "Estimated cost");
  const description = requiredText(input.title, "Line description", 500);
  const budgetCodeId = requiredText(input.secondaryId, "Budget code id", 200);
  return executeProjectCommand({
    context, operation: "addChangeEventLine", permission: "canManageContracts", projectId: id,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "ChangeEventLineItem",
    data: {},
    beforeCreate: async tx => {
      await lockOpenChangeEvent(tx, changeEventId, id);
      const [latest] = await tx.prisma!.$queryRawUnsafe!<Array<{ lineNumber: number | null }>>(
        'SELECT MAX("lineNumber")::int AS "lineNumber" FROM "ChangeEventLineItem" WHERE "changeEvent" = $1', changeEventId,
      );
      return {
        lineNumber: Number(latest?.lineNumber ?? 0) + 1, description, estimatedCostMinor: estimatedCost,
        changeEvent: { connect: { id: changeEventId } }, budgetCode: { connect: { id: budgetCodeId } },
        project: { connect: { id } },
      };
    },
    afterCreate: async tx => {
      await tx.prisma!.$executeRawUnsafe!(
        `UPDATE "ChangeEvent" SET
           "estimatedCostMinor" = (SELECT COALESCE(SUM("estimatedCostMinor"), 0) FROM "ChangeEventLineItem" WHERE "changeEvent" = $1),
           status = CASE WHEN status::text = 'open' THEN 'pricing' ELSE status END
         WHERE id = $1`,
        changeEventId,
      );
    },
  });
}

/** Record a trade partner's priced quote for an open change event. */
export async function recordChangeQuote(_root: unknown, { input }: { input: ConstructionWorkflowInput }, context: CommandContext) {
  const id = projectId(input);
  const changeEventId = requiredText(input.relatedId, "Change event id", 200);
  const partnerId = requiredText(input.partnerId, "Trade partner", 200);
  const quoted = amount(input.amountMinor, "Quoted amount");
  const lineId = input.secondaryId?.trim() || null;
  return executeProjectCommand({
    context, operation: "recordChangeQuote", permission: "canManageContracts", projectId: id,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "ChangeQuote",
    data: {},
    beforeCreate: async tx => {
      await lockOpenChangeEvent(tx, changeEventId, id);
      if (lineId) {
        const lines = await tx.prisma!.$queryRawUnsafe!<Array<{ id: string }>>(
          'SELECT id FROM "ChangeEventLineItem" WHERE id = $1 AND "changeEvent" = $2', lineId, changeEventId,
        );
        if (lines.length !== 1) throw new Error("The selected line does not belong to this change event");
      }
      return {
        quoteNumber: requiredText(input.reference, "Quote number", 80), status: "received",
        scope: input.description?.trim(), amountMinor: quoted,
        receivedAt: optionalDate(input.occurredAt, "Received date") ?? new Date(),
        validUntil: optionalDate(input.dueAt, "Valid until"),
        changeEvent: { connect: { id: changeEventId } },
        ...(lineId ? { changeEventLineItem: { connect: { id: lineId } } } : {}),
        tradePartner: { connect: { id: partnerId } }, project: { connect: { id } },
      };
    },
  });
}
