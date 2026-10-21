import { createHash, randomUUID } from "node:crypto";

import { hasCompanyPermission, hasPermission, hasProjectPermission, type Session } from "../access";
import {
  canAccessCompanyById,
  canAccessProjectById,
  queryById,
  queryOne,
  type KeystoneQueryApi,
} from "../domain/tenancy";
import type { Permission } from "../models/fields";
import { hasNativeAuthorityPort, lockCurrentAuthority } from "../domain/current-authority";

export type CommandInput = {
  projectId: string;
  reference: string;
  title: string;
  description?: string | null;
  dueAt?: string | null;
  amountMinor?: string | null;
  retainageBps?: number | null;
  relatedId?: string | null;
  /** Optional schedule-of-values line for a progress claim. */
  secondaryId?: string | null;
  idempotencyKey: string;
};

type ProjectCommandInput = {
  companyId: string;
  projectNumber: string;
  name: string;
  description?: string | null;
  startDate?: string | null;
  currencyCode?: string | null;
  idempotencyKey: string;
};

type MemberCommandInput = {
  projectId: string;
  userId: string;
  accessLevel: "viewer" | "contributor" | "manager";
  idempotencyKey: string;
};

export type MutationApi = {
  createOne?(args: { data: Record<string, unknown> }): Promise<Record<string, unknown> & { id: string }>;
  updateOne?(args: { where: { id: string }; data: Record<string, unknown> }): Promise<Record<string, unknown> & { id: string }>;
};

export type CommandSudo = {
  query: Record<string, KeystoneQueryApi>;
  db: Record<string, MutationApi>;
};

type AtomicModel = {
  update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>;
  findUnique?(args: { where: { id: string }; select: Record<string, boolean> }): Promise<Record<string, unknown> | null>;
};
type AtomicIdempotencyModel = {
  create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown> & { id: string }>;
};

export type CommandContext = {
  session?: Session;
  sudo(): CommandSudo;
  withSession?(session: Session): CommandContext;
  prisma?: {
    user?: unknown;
    budgetLineItem: AtomicModel;
    budget: AtomicModel;
    progressClaim?: AtomicModel;
    directCost?: AtomicModel;
    safetyIncident?: AtomicModel;
    idempotencyKey?: AtomicIdempotencyModel;
    $queryRawUnsafe?<T>(query: string, ...values: unknown[]): Promise<T>;
    $executeRawUnsafe?(query: string, ...values: unknown[]): Promise<number>;
  };
  transaction?<T>(callback: (context: CommandContext) => Promise<T>, options?: { timeout?: number }): Promise<T>;
};

export class CommandRequestRejected extends Error {
  readonly code = "COMMAND_REQUEST_REJECTED";
  constructor() {
    super("Idempotency key was already used with a different request. This request is rejected; the original outcome is not closed. Preserve the original key/body for authorized review.");
    this.name = "CommandRequestRejected";
  }
}

export class CommandAdmissionClosed extends Error {
  readonly code = "ORIGINAL_ADMISSION_CLOSED";
  constructor() {
    super("Original admission was explicitly closed. Retrieve the SAME owned closed receipt before reviewing NEW; this is not a business rollback.");
    this.name = "CommandAdmissionClosed";
  }
}

export class CommandOutcomeUnknown extends Error {
  readonly code = "COMMAND_OUTCOME_UNKNOWN";
  constructor() {
    super("Original command outcome is unknown or not currently observable. Retrieve/reconcile or retry the SAME key and body when authorized; do not create a replacement request.");
    this.name = "CommandOutcomeUnknown";
  }
}

export type CommandResult = {
  success: true;
  operation: string;
  itemId: string;
  actionId: string;
  replayed: boolean;
};

export function commandDigest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
const digest = commandDigest;
const USD_ONLY_MONEY_LISTS = new Set([
  "BudgetChange", "BudgetChangeLineItem", "BudgetLineItem", "Commitment", "ContractLineItem",
  "ChangeOrder", "ChangeOrderLineItem", "DirectCost", "Estimate", "EstimateLineItem",
  "Payment", "PaymentAllocation", "PrimeContract", "ProgressClaim", "ProgressClaimLineItem",
  "ProcurementRequest", "ProcurementRequestLine", "RetainageRelease", "LienWaiver", "BidSubmission",
]);

export function canonicalJson(value: Record<string, unknown>): string {
  return JSON.stringify(Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right)),
  ));
}

export function requireCommandSession(context: CommandContext): Session {
  if (!context.session?.itemId) throw new Error("Authentication required");
  return context.session;
}
const requireSession = requireCommandSession;

function requirePermission(session: Session, permission: Permission) {
  if (!hasPermission(session, permission)) throw new Error("Not authorized for this construction operation");
}

export function requiredText(value: unknown, label: string, max: number): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required`);
  const normalized = value.trim();
  if (normalized.length > max) throw new Error(`${label} must be at most ${max} characters`);
  return normalized;
}

export function optionalDate(value: string | null | undefined, label: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${label} must be a valid date`);
  return date;
}

export function requireCreate(sudo: CommandSudo, listKey: string) {
  const createOne = sudo.db[listKey]?.createOne;
  if (!createOne) throw new Error(`${listKey} create mutation is unavailable`);
  return createOne;
}

export function requireUpdate(sudo: CommandSudo, listKey: string) {
  const updateOne = sudo.db[listKey]?.updateOne;
  if (!updateOne) throw new Error(`${listKey} update mutation is unavailable`);
  return updateOne;
}

async function runTransaction<T>(context: CommandContext, callback: (tx: CommandContext) => Promise<T>) {
  if (!context.transaction) throw new Error("Transactional construction context is required");
  return context.transaction(callback, { timeout: 30_000 });
}

async function findReplay(
  context: CommandContext,
  fingerprint: string,
  requestHash: string,
): Promise<CommandResult | null> {
  const existing = await queryOne(
    context,
    "IdempotencyKey",
    { fingerprint },
    "id requestHash status errorCode operation resourceId agentAction { id }",
  ) as (Record<string, unknown> & { agentAction?: { id?: string } | null }) | null;
  if (!existing) return null;
  if (existing.requestHash !== requestHash) {
    throw new CommandRequestRejected();
  }
  if (existing.status === "failed" && existing.errorCode === "ORIGINAL_ADMISSION_CLOSED") throw new CommandAdmissionClosed();
  if (existing.status !== "completed" || !existing.resourceId || !existing.agentAction?.id) {
    throw new Error(`Idempotent request is ${String(existing.status)}`);
  }
  return {
    success: true,
    operation: String(existing.operation),
    itemId: String(existing.resourceId),
    actionId: existing.agentAction.id,
    replayed: true,
  };
}

async function waitForConcurrentReplay(
  context: CommandContext,
  fingerprint: string,
  requestHash: string,
  beforeReplay?: (context: CommandContext) => Promise<void>,
): Promise<CommandResult | null> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, 40 * (attempt + 1)));
    try {
      await beforeReplay?.(context);
      const replay = await findReplay(context, fingerprint, requestHash);
      if (replay) { await beforeReplay?.(context); return replay; }
    } catch (error) {
      if (!(error instanceof Error) || !/request is started/i.test(error.message)) throw error;
    }
  }
  return null;
}

export type ExecuteArgs = {
  context: CommandContext;
  operation: string;
  permission: Permission;
  additionalPermissions?: readonly Permission[];
  projectId: string;
  idempotencyKey: string;
  request: Record<string, unknown>;
  listKey: string;
  data: Record<string, unknown>;
  companyId?: string;
  createsProject?: boolean;
  updateId?: string;
  allowExternalProjectWrite?: boolean;
  externalOrganizationId?: string;
  beforeReplay?: (context: CommandContext) => Promise<void>;
  beforeAdmission?: (context: CommandContext) => Promise<void>;
  beforeCreate?: (context: CommandContext) => Promise<Record<string, unknown> | void>;
  afterCreate?: (context: CommandContext, created: Record<string, unknown> & { id: string }) => Promise<void>;
};

export async function executeProjectCommand(args: ExecuteArgs): Promise<CommandResult> {
  const session = requireSession(args.context);
  const actorId = session.itemId;
  const requiredPermissions = [...new Set([args.permission, ...(args.additionalPermissions ?? [])])];
  const actorType = session.authType === "api_key" ? "agent" : "human";
  const correlationId = session.authType === "api_key" ? session.apiCredential?.id : undefined;
  if (args.createsProject) requirePermission(session, args.permission);
  const key = requiredText(args.idempotencyKey, "Idempotency key", 200);
  const externalWriter = args.allowExternalProjectWrite && session.data.projectMemberships?.some(membership =>
    membership.status === "active" && membership.project?.id === args.projectId &&
    membership.portalType !== "internal" && membership.accessLevel !== "viewer" &&
    Boolean(args.externalOrganizationId) && membership.portalOrganization?.id === args.externalOrganizationId,
  );
  if (!args.createsProject && !externalWriter && !(await canAccessProjectById(args.context, session.itemId, args.projectId, true))) {
    throw new Error("Not authorized for this project");
  }
  const project = args.createsProject
    ? null
    : await queryById(args.context, "Project", args.projectId, "id currencyCode company { id }");
  const companyId = args.companyId ?? project?.company?.id;
  if (!companyId) throw new Error("Project not found");
  if (!args.createsProject && !hasProjectPermission(
    session,
    companyId,
    args.projectId,
    args.permission,
    true,
  )) {
    throw new Error("Not authorized for this project operation");
  }

  const requestSnapshot = canonicalJson({ operation: args.operation, ...args.request });
  const requestHash = digest(requestSnapshot);
  const fingerprint = digest(`${companyId}\u001f${args.operation}\u001f${key}`);
  await args.beforeReplay?.(args.context);
  const replay = await findReplay(args.context, fingerprint, requestHash);
  if (replay) {
    if (hasNativeAuthorityPort(args.context)) return runTransaction(args.context, async tx => {
      const fresh = await lockCurrentAuthority(tx, companyId, args.createsProject ? null : args.projectId, requiredPermissions, args.allowExternalProjectWrite ? args.externalOrganizationId : undefined);
      if (tx.withSession) tx = tx.withSession(fresh);
      await args.beforeReplay?.(tx);
      const currentReplay = await findReplay(tx, fingerprint, requestHash);
      if (!currentReplay) throw new Error("Original command receipt is no longer available");
      return currentReplay;
    });
    await args.beforeReplay?.(args.context); return replay;
  }
  // Only NEW admission. Historical accepted replay must not be subjected to
  // unrelated current catalog/currency creation preconditions.
  const assertNewCurrency = async (context: CommandContext) => {
    if (!args.createsProject && USD_ONLY_MONEY_LISTS.has(args.listKey)) {
      const currentProject = await queryById(context, "Project", args.projectId, "id currencyCode company { id }");
      if (currentProject?.company?.id !== companyId || currentProject?.currencyCode !== "USD") {
        throw new Error("Monetary operations are disabled for non-USD projects until currency propagation is complete");
      }
    }
  };
  await assertNewCurrency(args.context);
  await args.beforeAdmission?.(args.context);

  try {
    const result = await runTransaction(args.context, async tx => {
      if (hasNativeAuthorityPort(tx)) {
        const fresh = await lockCurrentAuthority(tx, companyId, args.createsProject ? null : args.projectId, requiredPermissions, args.allowExternalProjectWrite ? args.externalOrganizationId : undefined);
        if (tx.withSession) tx = tx.withSession(fresh);
      }
      const sudo = tx.sudo();
      if (tx.prisma?.$queryRawUnsafe) {
        await tx.prisma.$queryRawUnsafe(`SELECT 1::int AS locked FROM pg_advisory_xact_lock(hashtextextended($1, 0))`, fingerprint);
        await args.beforeReplay?.(tx);
        const lockedReplay = await findReplay(tx, fingerprint, requestHash);
        if (lockedReplay) { await args.beforeReplay?.(tx); return lockedReplay; }
      }
      await args.beforeReplay?.(tx);
      await assertNewCurrency(tx);
      const idempotencyData = {
        fingerprint,
        key,
        operation: args.operation,
        requestHash,
        status: "started",
        resourceType: args.listKey,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };
      const idempotency = tx.prisma?.idempotencyKey?.create
        ? await tx.prisma.idempotencyKey.create({ data: {
            ...idempotencyData,
            companyId,
            ...(!args.createsProject ? { projectId: args.projectId } : {}),
            createdByUserId: actorId,
            updatedByUserId: actorId,
          } })
        : await requireCreate(sudo, "IdempotencyKey")({ data: {
            ...idempotencyData,
            company: { connect: { id: companyId } },
            ...(!args.createsProject ? { project: { connect: { id: args.projectId } } } : {}),
          } });
      const action = await requireCreate(sudo, "AgentAction")({
        data: {
          actionKey: randomUUID(),
          actorType,
          action: args.operation,
          status: "running",
          correlationId,
          targetType: args.listKey,
          targetId: args.updateId ?? "pending",
          targetStatus: args.updateId ? "updated" : "created",
          reason: `${args.updateId ? "Update" : "Create"} ${args.listKey} from the construction workspace`,
          requestDigest: requestHash,
          requestedAt: new Date(),
          startedAt: new Date(),
          company: { connect: { id: companyId } },
          ...(!args.createsProject ? { project: { connect: { id: args.projectId } } } : {}),
          requestedBy: { connect: { id: actorId } },
          actorUser: { connect: { id: actorId } },
          idempotencyKey: { connect: { id: idempotency.id } },
        },
      });
      const lockedData = args.beforeCreate ? await args.beforeCreate(tx) : undefined;
      const created = args.updateId
        ? await requireUpdate(sudo, args.listKey)({ where: { id: args.updateId }, data: lockedData ?? args.data })
        : await requireCreate(sudo, args.listKey)({ data: lockedData ?? args.data });
      if (args.afterCreate) await args.afterCreate(tx, created);
      const eventType = `${args.listKey}.${args.updateId ? "updated" : "created"}`;
      const payload = canonicalJson({
        schemaVersion: 1,
        eventType,
        aggregateType: args.listKey,
        aggregateId: created.id,
        projectId: args.createsProject ? created.id : args.projectId,
        companyId,
        actorId,
        requestHash,
      });
      await requireCreate(sudo, "OutboxMessage")({
        data: {
          messageKey: `${args.operation}:${created.id}:${key}`,
          eventType,
          aggregateType: args.listKey,
          aggregateId: created.id,
          canonicalPayload: payload,
          payloadDigest: digest(payload),
          status: "pending",
          company: { connect: { id: companyId } },
          project: { connect: { id: args.createsProject ? created.id : args.projectId } },
          agentAction: { connect: { id: action.id } },
        },
      });
      await requireUpdate(sudo, "AgentAction")({
        where: { id: action.id },
        data: {
          status: "succeeded",
          targetId: created.id,
          targetStatus: args.updateId ? "updated" : "created",
          ...(args.createsProject ? { project: { connect: { id: created.id } } } : {}),
          resultDigest: digest(`${args.listKey}\u001f${created.id}`),
          completedAt: new Date(),
        },
      });
      await requireUpdate(sudo, "IdempotencyKey")({
        where: { id: idempotency.id },
        data: {
          status: "completed",
          resourceId: created.id,
          toStatus: args.updateId ? "updated" : "created",
          ...(args.createsProject ? { project: { connect: { id: created.id } } } : {}),
          agentAction: { connect: { id: action.id } },
        },
      });
      return { success: true as const, operation: args.operation, itemId: created.id, actionId: action.id, replayed: false };
    });
    await args.beforeReplay?.(args.context);
    return result;
  } catch {
    // A rejected transaction Promise can also mean lost acknowledgement after
    // commit. A denied/unavailable recovery read proves nothing about rollback.
    let recovered: CommandResult | null = null;
    let rejection: CommandRequestRejected | CommandAdmissionClosed | null = null;
    try {
      await args.beforeReplay?.(args.context);
      recovered = await waitForConcurrentReplay(args.context, fingerprint, requestHash, args.beforeReplay);
      if (recovered && hasNativeAuthorityPort(args.context)) {
        // A recovered acknowledgement is not current authority. Revalidate after
        // the wait before exposing its receipt; denial still proves no rollback.
        recovered = null;
        recovered = await runTransaction(args.context, async tx => {
          const fresh = await lockCurrentAuthority(tx, companyId, args.createsProject ? null : args.projectId, requiredPermissions, args.allowExternalProjectWrite ? args.externalOrganizationId : undefined);
          if (tx.withSession) tx = tx.withSession(fresh);
          await args.beforeReplay?.(tx);
          return findReplay(tx, fingerprint, requestHash);
        });
      }
    } catch (recoveryError) {
      if (recoveryError instanceof CommandRequestRejected || recoveryError instanceof CommandAdmissionClosed) rejection = recoveryError;
      // Denied/unavailable recovery is not evidence of rollback.
    }
    if (recovered) return recovered;
    const outcome = rejection ?? new CommandOutcomeUnknown();
    await args.context.sudo().db.AgentAction?.createOne?.({
      data: {
        actionKey: randomUUID(),
        actorType,
        action: "observeConstructionCommandOutcome",
        status: rejection ? "rejected" : "failed", // acknowledgement observation, not a failed business fact
        correlationId,
        targetType: args.listKey,
        targetId: args.updateId ?? "unresolved",
        targetStatus: rejection instanceof CommandAdmissionClosed ? "closed_before_admission" : rejection ? "request_rejected_original_unresolved" : "unknown",
        reason: `${args.operation} acknowledgement/recovery unavailable; original ${args.listKey} outcome unresolved, not rollback; reconcile the original intent`,
        requestDigest: requestHash,
        errorCode: outcome.code,
        errorMessage: outcome.message,
        requestedAt: new Date(),
        startedAt: new Date(),
        completedAt: new Date(),
        company: { connect: { id: companyId } },
        ...(!args.createsProject ? { project: { connect: { id: args.projectId } } } : {}),
        requestedBy: { connect: { id: actorId } },
        actorUser: { connect: { id: actorId } },
      },
    }).catch(() => undefined);
    // Do not leak original driver errors, denied receipt IDs or private bodies.
    throw outcome;
  }
}

async function rollUpPostedDirectCost(
  input: CommandInput,
  context: CommandContext,
  created: Record<string, unknown> & { id: string },
) {
  const amount = BigInt(requiredText(input.amountMinor, "Amount", 30));
  const budgetCodeId = requiredText(input.relatedId, "Budget code id", 200);
  if (!context.prisma?.$queryRawUnsafe) throw new Error("Transactional aggregate client is unavailable");
  const [line] = await context.prisma.$queryRawUnsafe<Array<{ id: string; budgetId: string; currencyCode: string }>>(
    `SELECT line.id, line.budget AS "budgetId", budget."currencyCode" AS "currencyCode"
     FROM "BudgetLineItem" line
     JOIN "Budget" budget ON budget.id = line.budget
     WHERE line.project = $1 AND line."budgetCode" = $2 AND budget.status = 'active'
     ORDER BY line."createdAt" ASC
     LIMIT 1
     FOR UPDATE OF line, budget`,
    input.projectId,
    budgetCodeId,
  );
  if (!line?.budgetId) throw new Error("An active budget line is required for this budget code");
  if (!context.prisma.directCost?.update) throw new Error("Transactional direct cost currency update is unavailable");
  await context.prisma.directCost.update({
    where: { id: created.id },
    data: { currencyCode: line.currencyCode || "USD" },
  });
  await context.prisma.budgetLineItem.update({
    where: { id: line.id },
    data: {
      actualCostMinor: { increment: amount },
      projectedFinalCostMinor: { increment: amount },
      projectedOverUnderMinor: { decrement: amount },
    },
  });
  await context.prisma.budget.update({
    where: { id: line.budgetId },
    data: { totalActualMinor: { increment: amount } },
  });
}

function commandResolver(config: {
  operation: string;
  permission: Permission;
  listKey: string;
  build(input: CommandInput, session: Session): Record<string, unknown>;
  afterCreate?: (input: CommandInput, context: CommandContext, created: Record<string, unknown> & { id: string }) => Promise<void>;
}) {
  return async (_root: unknown, { input }: { input: CommandInput }, context: CommandContext) => {
    const session = requireSession(context);
    const reference = requiredText(input.reference, "Reference", 100);
    const title = requiredText(input.title, "Title", 500);
    const description = typeof input.description === "string" ? input.description.trim() : "";
    return executeProjectCommand({
      context,
      operation: config.operation,
      permission: config.permission,
      projectId: requiredText(input.projectId, "Project id", 200),
      idempotencyKey: input.idempotencyKey,
      request: { ...input, reference, title, description },
      listKey: config.listKey,
      data: config.build({ ...input, reference, title, description }, session),
      afterCreate: config.afterCreate
        ? (tx, created) => config.afterCreate!({ ...input, reference, title, description }, tx, created)
        : undefined,
    });
  };
}

export const startBidPackage = commandResolver({
  operation: "startBidPackage",
  permission: "canManagePreconstruction",
  listKey: "BidPackage",
  build: (input, session) => ({
    number: input.reference,
    title: input.title,
    description: input.description,
    dueAt: optionalDate(input.dueAt, "Due date"),
    bidManager: { connect: { id: session.itemId } },
    project: { connect: { id: input.projectId } },
  }),
});

export const openChangeEvent = commandResolver({
  operation: "openChangeEvent",
  permission: "canManageContracts",
  listKey: "ChangeEvent",
  build: (input, session) => ({
    number: input.reference,
    title: input.title,
    description: input.description,
    dueAt: optionalDate(input.dueAt, "Due date"),
    owner: { connect: { id: session.itemId } },
    project: { connect: { id: input.projectId } },
  }),
});

export const raiseRfi = commandResolver({
  operation: "raiseRfi",
  permission: "canManageProjectExecution",
  listKey: "RFI",
  build: (input, session) => ({
    number: input.reference,
    subject: input.title,
    question: requiredText(input.description, "Question", 10_000),
    dueAt: optionalDate(input.dueAt, "Due date"),
    raisedBy: { connect: { id: session.itemId } },
    ballInCourt: { connect: { id: session.itemId } },
    project: { connect: { id: input.projectId } },
  }),
});

export const registerSubmittal = commandResolver({
  operation: "registerSubmittal",
  permission: "canManageProjectExecution",
  listKey: "Submittal",
  build: (input, session) => ({
    number: input.reference,
    title: input.title,
    description: input.description,
    dueAt: optionalDate(input.dueAt, "Due date"),
    submitter: { connect: { id: session.itemId } },
    submittalManager: { connect: { id: session.itemId } },
    ballInCourt: { connect: { id: session.itemId } },
    project: { connect: { id: input.projectId } },
  }),
});

export const startDailyLog = commandResolver({
  operation: "startDailyLog",
  permission: "canManageFieldOperations",
  listKey: "DailyLog",
  build: (input, session) => ({
    logDate: optionalDate(input.reference, "Log date"),
    weatherSummary: input.title,
    generalNotes: input.description,
    preparedBy: { connect: { id: session.itemId } },
    project: { connect: { id: input.projectId } },
  }),
});

export const recordSafetyObservation = commandResolver({
  operation: "recordSafetyObservation",
  permission: "canManageSafety",
  listKey: "SafetyObservation",
  build: (input, session) => ({
    observationNumber: input.reference,
    title: input.title,
    description: requiredText(input.description, "Description", 10_000),
    dueAt: optionalDate(input.dueAt, "Due date"),
    observedBy: { connect: { id: session.itemId } },
    assignedTo: { connect: { id: session.itemId } },
    project: { connect: { id: input.projectId } },
  }),
});

export const recordPunchItem = commandResolver({
  operation: "recordPunchItem",
  permission: "canManageFieldOperations",
  listKey: "PunchItem",
  build: (input, session) => ({
    number: input.reference,
    title: input.title,
    description: requiredText(input.description, "Description", 10_000),
    dueAt: optionalDate(input.dueAt, "Due date"),
    createdBy: { connect: { id: session.itemId } },
    assignedTo: { connect: { id: session.itemId } },
    project: { connect: { id: input.projectId } },
  }),
});

export const registerDocument = commandResolver({
  operation: "registerDocument",
  permission: "canManageDocuments",
  listKey: "Document",
  build: input => ({
    documentNumber: input.reference,
    title: input.title,
    description: input.description,
    project: { connect: { id: input.projectId } },
  }),
});

export const recordDirectCost = commandResolver({
  operation: "recordDirectCost",
  permission: "canManageFinancials",
  listKey: "DirectCost",
  afterCreate: rollUpPostedDirectCost,
  build: (input, session) => {
    const amount = requiredText(input.amountMinor, "Amount", 30);
    if (!/^-?\d+$/.test(amount) || BigInt(amount) < BigInt(0)) throw new Error("Amount must be a non-negative integer in minor units");
    const budgetCodeId = requiredText(input.relatedId, "Budget code id", 200);
    return {
      referenceNumber: input.reference,
      description: input.title,
      amountMinor: amount,
      status: "posted",
      costDate: optionalDate(input.dueAt, "Cost date") ?? new Date(),
      budgetCode: { connect: { id: budgetCodeId } },
      approvedBy: { connect: { id: session.itemId } },
      project: { connect: { id: input.projectId } },
    };
  },
});

export async function awardBidSubmission(
  _root: unknown,
  { input }: { input: CommandInput },
  context: CommandContext,
): Promise<CommandResult> {
  const submissionId = requiredText(input.relatedId, "Bid submission id", 200);
  const submission = await queryById(
    context,
    "BidSubmission",
    submissionId,
    "id submissionNumber status totalMinor currencyCode tradePartner { id } bidPackage { id number title status } project { id company { id } }",
  );
  const projectId = submission?.project?.id;
  const packageRecord = submission?.bidPackage as Record<string, unknown> | null | undefined;
  const tradePartner = submission?.tradePartner as Record<string, unknown> | null | undefined;
  if (!projectId || !packageRecord?.id || !tradePartner?.id) throw new Error("Bid submission is incomplete");
  const projectCompanyId = submission.project?.company?.id;
  if (!projectCompanyId || !hasProjectPermission(requireSession(context), projectCompanyId, projectId, "canManageContracts", true)) {
    throw new Error("Awarding a bid also requires contract management permission");
  }
  requiredText(submission.totalMinor, "Bid total", 30);
  const retainageBps = input.retainageBps ?? 0;
  if (!Number.isInteger(retainageBps) || retainageBps < 0 || retainageBps > 10000) throw new Error("Retainage must be between 0 and 10000 basis points");
  let awardedPackageId = String(packageRecord.id);
  let awardedLines: Array<{ lineNumber: number; description: string; amountMinor: bigint; budgetCodeId: string }> = [];
  return executeProjectCommand({
    context,
    operation: "awardBidSubmission",
    permission: "canManagePreconstruction",
    projectId,
    idempotencyKey: input.idempotencyKey,
    request: { ...input, submissionId },
    listKey: "Commitment",
    beforeReplay: async current => {
      if (!hasProjectPermission(requireSession(current), projectCompanyId, projectId, "canManageContracts", true)) throw new Error("Awarding a bid also requires current contract management permission");
    },
    beforeCreate: async transaction => {
      const prisma = transaction.prisma;
      if (!prisma?.$queryRawUnsafe) throw new Error("Transactional bid award lock is unavailable");
      const [locked] = await prisma.$queryRawUnsafe<Array<{
        status: string;
        totalMinor: bigint;
        currencyCode: string;
        partnerId: string | null;
        packageId: string | null;
        packageStatus: string;
        packageTitle: string;
      }>>(
        `SELECT submission.status::text AS status,
                submission."totalMinor" AS "totalMinor",
                submission."currencyCode" AS "currencyCode",
                submission."tradePartner" AS "partnerId",
                submission."bidPackage" AS "packageId",
                package.status::text AS "packageStatus",
                package.title AS "packageTitle"
         FROM "BidSubmission" submission
         JOIN "BidPackage" package ON package.id = submission."bidPackage"
         WHERE submission.id = $1
         FOR UPDATE OF submission, package`,
        submissionId,
      );
      if (!locked || !["submitted", "under_review"].includes(locked.status)) {
        throw new Error("Bid submission was already awarded or is no longer eligible");
      }
      if (locked.packageStatus !== "closed" || !locked.packageId || !locked.partnerId) {
        throw new Error("Bid package was already awarded or the submission is incomplete");
      }
      const lockedAmount = requiredText(String(locked.totalMinor), "Bid total", 30);
      awardedLines = await prisma.$queryRawUnsafe<Array<{ lineNumber: number; description: string; amountMinor: bigint; budgetCodeId: string }>>(
        `SELECT "lineNumber", description, "amountMinor", "budgetCode" AS "budgetCodeId"
         FROM "BidLineItem" WHERE submission = $1 ORDER BY "lineNumber" ASC FOR UPDATE`,
        submissionId,
      );
      if (awardedLines.length === 0 || awardedLines.some(line => !line.budgetCodeId) ||
          awardedLines.reduce((sum, line) => sum + line.amountMinor, BigInt(0)) !== locked.totalMinor) {
        throw new Error("Bid award requires budget-coded lines matching the submitted total");
      }
      awardedPackageId = locked.packageId;
      return {
        number: requiredText(input.reference, "Commitment number", 80),
        title: requiredText(input.title || locked.packageTitle, "Commitment title", 240),
        description: input.description?.trim(),
        commitmentType: "subcontract",
        originalContractMinor: lockedAmount,
        revisedContractMinor: lockedAmount,
        currencyCode: locked.currencyCode || "USD",
        tradePartner: { connect: { id: locked.partnerId } },
        contractManager: { connect: { id: requireSession(context).itemId } },
        project: { connect: { id: projectId } },
      };
    },
    data: {},
    afterCreate: async (transaction, commitment) => {
      const sudo = transaction.sudo();
      const prisma = transaction.prisma;
      if (!prisma?.$queryRawUnsafe || !prisma.budgetLineItem?.update || !prisma.budget?.update) throw new Error("Transactional bid budget rollup is unavailable");
      for (const line of awardedLines) {
        await requireCreate(sudo, "ContractLineItem")({ data: {
          lineNumber: line.lineNumber,
          description: line.description,
          scheduledValueMinor: line.amountMinor.toString(),
          revisedValueMinor: line.amountMinor.toString(),
          retainageBps,
          commitment: { connect: { id: commitment.id } },
          budgetCode: { connect: { id: line.budgetCodeId } },
          project: { connect: { id: projectId } },
        } });
        const [budgetLine] = await prisma.$queryRawUnsafe<Array<{ id: string; budgetId: string }>>(
          `SELECT line.id, line.budget AS "budgetId" FROM "BudgetLineItem" line
           JOIN "Budget" budget ON budget.id = line.budget
           WHERE line.project = $1 AND line."budgetCode" = $2 AND budget.status = 'active'
           ORDER BY line."createdAt" ASC LIMIT 1 FOR UPDATE OF line, budget`,
          projectId, line.budgetCodeId,
        );
        if (!budgetLine) throw new Error("Bid award requires a matching active budget line");
        await prisma.budgetLineItem.update({ where: { id: budgetLine.id }, data: {
          committedAmountMinor: { increment: line.amountMinor }, projectedFinalCostMinor: { increment: line.amountMinor },
          projectedOverUnderMinor: { decrement: line.amountMinor },
        } });
        await prisma.budget.update({ where: { id: budgetLine.budgetId }, data: { totalCommittedMinor: { increment: line.amountMinor } } });
      }
      await requireUpdate(sudo, "BidSubmission")({
        where: { id: submissionId },
        data: { status: "accepted", reviewedAt: new Date(), reviewedBy: { connect: { id: requireSession(context).itemId } } },
      });
      await requireUpdate(sudo, "BidPackage")({
        where: { id: awardedPackageId },
        data: { status: "awarded" },
      });
    },
  });
}

type LockedClaimLine = { id: string; lineNumber: number; description: string; scheduledValueMinor: bigint; revisedValueMinor: bigint; retainageBps: number };

/** Prepare a progress claim against one schedule-of-values line of either an
 * executed commitment (subcontractor claim, paid by disbursement) or an executed
 * prime contract (owner claim, settled by receipt). */
export async function prepareProgressClaim(
  _root: unknown,
  { input }: { input: CommandInput },
  context: CommandContext,
): Promise<CommandResult> {
  const amount = requiredText(input.amountMinor, "Current work", 30);
  if (!/^\d+$/.test(amount) || BigInt(amount) === BigInt(0)) throw new Error("Current work must be a positive amount in minor units");
  const contractId = requiredText(input.relatedId, "Contract id", 200);
  const requestedLineId = input.secondaryId?.trim() || null;
  const contractQuery = "id status originalContractMinor revisedContractMinor currencyCode project { id company { id } }";
  const commitment = await queryById(context, "Commitment", contractId, `${contractQuery} tradePartner { id }`);
  const primeContract = commitment ? null : await queryById(context, "PrimeContract", contractId, `${contractQuery} client { id }`);
  const side: "commitment" | "owner" = commitment ? "commitment" : "owner";
  const contract = commitment ?? primeContract;
  const table = side === "commitment" ? "Commitment" : "PrimeContract";
  const lineColumn = side === "commitment" ? "commitment" : '"primeContract"';
  const partnerColumn = side === "commitment" ? '"tradePartner"' : "client";
  const billableStatuses = side === "commitment" ? ["executed", "complete"] : ["executed"];
  const projectId = contract?.project?.id;
  const counterparty = (side === "commitment" ? contract?.tradePartner : contract?.client) as Record<string, unknown> | null | undefined;
  if (!contract || !projectId || projectId !== input.projectId || !counterparty?.id) throw new Error("Contract is not valid for this project");
  const claimSession = requireSession(context);
  const externalSubmitter = side === "commitment" && (claimSession.data.projectMemberships?.some(membership =>
    membership.status === "active" && membership.project?.id === projectId && membership.portalType !== "internal" &&
    membership.accessLevel !== "viewer" && membership.portalOrganization?.id === String(counterparty.id),
  ) ?? false);
  const hasExternalGrant = claimSession.data.projectMemberships?.some(membership =>
    membership.status === "active" && membership.project?.id === projectId && membership.portalType !== "internal",
  ) ?? false;
  if (hasExternalGrant && !externalSubmitter) throw new Error("Contract is not assigned to this portal organization");
  if (!billableStatuses.includes(String(contract.status))) throw new Error("Only executed contracts can be billed");
  const periodEnd = optionalDate(input.dueAt, "Period end") ?? new Date();
  const periodStart = new Date(Date.UTC(periodEnd.getUTCFullYear(), periodEnd.getUTCMonth(), 1));
  let lockedLine: LockedClaimLine | null = null;
  let previousWorkMinor = BigInt(0);
  return executeProjectCommand({
    context,
    operation: "prepareProgressClaim",
    permission: "canManageBilling",
    projectId,
    idempotencyKey: input.idempotencyKey,
    request: side === "commitment" ? { ...input, commitmentId: contractId } : { ...input, primeContractId: contractId },
    listKey: "ProgressClaim",
    allowExternalProjectWrite: externalSubmitter,
    externalOrganizationId: externalSubmitter ? String(counterparty.id) : undefined,
    beforeCreate: async transaction => {
      const prisma = transaction.prisma;
      if (!prisma?.$queryRawUnsafe) throw new Error("Transactional claim capacity lock is unavailable");
      const [lockedContract] = await prisma.$queryRawUnsafe<Array<{ originalContractMinor: bigint; approvedChangesMinor: bigint; revisedContractMinor: bigint; currencyCode: string; partnerId: string | null; projectId: string; companyId: string; status: string }>>(
        `SELECT "originalContractMinor", "approvedChangesMinor", "revisedContractMinor", "currencyCode", ${partnerColumn} AS "partnerId", project AS "projectId", company AS "companyId", status::text FROM "${table}" WHERE id = $1 FOR UPDATE`,
        contractId,
      );
      if (!lockedContract || !billableStatuses.includes(lockedContract.status) || lockedContract.projectId !== projectId || lockedContract.companyId !== contract.project?.company?.id || lockedContract.partnerId !== String(counterparty.id)) {
        throw new Error("Contract is no longer billable for this project and counterparty; reload for review");
      }
      if (lockedContract.currencyCode !== "USD") throw new Error("Claim currency is not supported by this USD workflow");
      // Lock the whole schedule of values in a stable order, then bill the selected
      // line, or the first line with enough remaining value for this claim.
      const lines = await prisma.$queryRawUnsafe<LockedClaimLine[]>(
        `SELECT id, "lineNumber", description, "scheduledValueMinor", "revisedValueMinor", "retainageBps"
         FROM "ContractLineItem" WHERE ${lineColumn} = $1 ORDER BY "lineNumber" ASC, id ASC FOR UPDATE`,
        contractId,
      );
      if (lines.length === 0) throw new Error("The contract requires a schedule-of-values line before billing");
      const previousByLine = new Map<string, bigint>();
      const previousRows = await prisma.$queryRawUnsafe<Array<{ lineId: string; previousWorkMinor: bigint }>>(
        `SELECT item."contractLineItem" AS "lineId", COALESCE(SUM(item."currentWorkMinor" + item."storedMaterialsMinor"), 0)::bigint AS "previousWorkMinor"
         FROM "ProgressClaimLineItem" item
         JOIN "ProgressClaim" claim ON claim.id = item."progressClaim"
         WHERE item."contractLineItem" = ANY($1::text[]) AND claim.status <> 'voided'
         GROUP BY item."contractLineItem"`,
        lines.map(line => line.id),
      );
      for (const row of previousRows) previousByLine.set(row.lineId, BigInt(row.previousWorkMinor ?? 0));
      const remaining = (line: LockedClaimLine) => (line.revisedValueMinor || line.scheduledValueMinor) - (previousByLine.get(line.id) ?? BigInt(0));
      const line = requestedLineId
        ? lines.find(entry => entry.id === requestedLineId)
        : lines.find(entry => remaining(entry) >= BigInt(amount));
      if (requestedLineId && !line) throw new Error("The selected schedule-of-values line does not belong to this contract");
      if (!line || remaining(line) < BigInt(amount)) throw new Error("Claimed work cannot exceed the remaining value of the schedule-of-values line");
      lockedLine = line;
      previousWorkMinor = previousByLine.get(line.id) ?? BigInt(0);
      const [claimTotal] = await prisma.$queryRawUnsafe<Array<{ claimedMinor: bigint }>>(
        `SELECT COALESCE(SUM("currentPaymentDueMinor" + "retainageMinor"), 0)::bigint AS "claimedMinor"
         FROM "ProgressClaim" WHERE ${lineColumn} = $1 AND status <> 'voided'`,
        contractId,
      );
      const claimedMinor = claimTotal?.claimedMinor ?? BigInt(0);
      if (claimedMinor + BigInt(amount) > lockedContract.revisedContractMinor) {
        throw new Error("Progress claims cannot exceed the contract revised value");
      }
      const current = BigInt(amount);
      const scheduled = line.revisedValueMinor || line.scheduledValueMinor;
      const retainage = current * BigInt(line.retainageBps ?? 0) / BigInt(10_000);
      const earned = current - retainage;
      const balance = scheduled - previousWorkMinor - current;
      return {
        claimNumber: requiredText(input.reference, "Claim number", 100),
        invoiceNumber: requiredText(input.title, "Invoice number", 100),
        claimType: side, periodStart, periodEnd, dueAt: periodEnd,
        originalContractMinor: lockedContract.originalContractMinor.toString(),
        approvedChangesMinor: lockedContract.approvedChangesMinor.toString(),
        revisedContractMinor: lockedContract.revisedContractMinor.toString(),
        workCompletedToDateMinor: (previousWorkMinor + current).toString(),
        retainageMinor: retainage.toString(),
        earnedLessRetainageMinor: earned.toString(),
        currentPaymentDueMinor: earned.toString(),
        balanceToFinishMinor: (balance < BigInt(0) ? BigInt(0) : balance).toString(),
        currencyCode: lockedContract.currencyCode,
        submittedBy: { connect: { id: requireSession(transaction).itemId } },
        tradePartner: { connect: { id: lockedContract.partnerId } },
        ...(side === "commitment" ? { commitment: { connect: { id: contractId } } } : { primeContract: { connect: { id: contractId } } }),
        project: { connect: { id: projectId } },
      };
    },
    data: {},
    afterCreate: async (transaction, claim) => {
      if (!lockedLine) throw new Error("The locked schedule-of-values line is unavailable");
      const scheduled = lockedLine.revisedValueMinor || lockedLine.scheduledValueMinor;
      const current = BigInt(amount);
      const retainage = current * BigInt(lockedLine.retainageBps ?? 0) / BigInt(10_000);
      const earned = current - retainage;
      const balance = scheduled - previousWorkMinor - current;
      await requireCreate(transaction.sudo(), "ProgressClaimLineItem")({ data: {
        lineNumber: lockedLine.lineNumber,
        description: lockedLine.description,
        scheduledValueMinor: scheduled.toString(),
        previousWorkMinor: previousWorkMinor.toString(),
        currentWorkMinor: current.toString(),
        storedMaterialsMinor: "0",
        completedStoredToDateMinor: (previousWorkMinor + current).toString(),
        percentComplete: scheduled > BigInt(0) ? Number(((previousWorkMinor + current) * BigInt(100)) / scheduled) : 0,
        retainageBps: lockedLine.retainageBps ?? 0,
        retainageMinor: retainage.toString(),
        earnedLessRetainageMinor: earned.toString(),
        balanceToFinishMinor: (balance < BigInt(0) ? BigInt(0) : balance).toString(),
        progressClaim: { connect: { id: claim.id } },
        contractLineItem: { connect: { id: lockedLine.id } },
        project: { connect: { id: projectId } },
      } });
    },
  });
}

export async function recordProgressPayment(
  _root: unknown,
  { input }: { input: CommandInput },
  context: CommandContext,
): Promise<CommandResult> {
  const claimId = requiredText(input.relatedId, "Progress claim id", 200);
  const claim = await queryById(
    context,
    "ProgressClaim",
    claimId,
    "id status claimType currentPaymentDueMinor currencyCode tradePartner { id } project { id company { id } }",
  );
  const projectId = claim?.project?.id;
  if (!projectId || !["approved", "partially_paid"].includes(String(claim.status))) {
    throw new Error("Only an approved claim can receive a payment");
  }
  const amount = requiredText(input.amountMinor, "Payment amount", 30);
  if (!/^\d+$/.test(amount) || BigInt(amount) === BigInt(0)) throw new Error("Payment amount must be positive minor units");
  if (BigInt(amount) > BigInt(String(claim.currentPaymentDueMinor ?? "0"))) {
    throw new Error("Payment cannot exceed the claim payment due");
  }
  const claimTradePartner = claim.tradePartner as Record<string, unknown> | null | undefined;
  const externalReference = requiredText(input.title, "External payment reference", 200);
  const effectiveAt = optionalDate(input.dueAt, "External payment effective date");
  if (!effectiveAt) throw new Error("External payment effective date is required");
  return executeProjectCommand({
    context,
    operation: "recordProgressPayment",
    permission: "canManageBilling",
    projectId,
    idempotencyKey: input.idempotencyKey,
    request: { ...input, claimId },
    listKey: "Payment",
    data: {
      paymentNumber: requiredText(input.reference, "Payment number", 100),
      // Owner claims are settled by money received; commitment claims by money paid out.
      direction: claim.claimType === "owner" ? "receipt" : "disbursement",
      amountMinor: amount,
      currencyCode: claim.currencyCode || "USD",
      reference: externalReference,
      paidAt: effectiveAt,
      paymentMethod: "other",
      tradePartner: claimTradePartner?.id ? { connect: { id: String(claimTradePartner.id) } } : undefined,
      recordedBy: { connect: { id: requireSession(context).itemId } },
      project: { connect: { id: projectId } },
    },
  });
}

export async function createConstructionProject(
  _root: unknown,
  { input }: { input: ProjectCommandInput },
  context: CommandContext,
): Promise<CommandResult> {
  const session = requireSession(context);
  requirePermission(session, "canManageProjects");
  const companyId = requiredText(input.companyId, "Company id", 200);
  if (!(await canAccessCompanyById(context, session.itemId, companyId, true)) ||
      !hasCompanyPermission(session, companyId, "canManageProjects")) {
    throw new Error("Not authorized for this company");
  }
  if (!hasCompanyPermission(session, companyId, "canManageFinancials")) {
    throw new Error("Financial-management permission is required to initialize a project budget");
  }
  const projectNumber = requiredText(input.projectNumber, "Project number", 80);
  const name = requiredText(input.name, "Project name", 240);
  const currencyCode = String(input.currencyCode ?? "USD").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currencyCode)) throw new Error("Currency code must be a three-letter ISO code");
  if (currencyCode !== "USD") throw new Error("Only USD is currently supported for new projects until end-to-end currency propagation is complete");
  return executeProjectCommand({
    context,
    operation: "createConstructionProject",
    permission: "canManageProjects",
    additionalPermissions: ["canManageFinancials"],
    projectId: companyId,
    idempotencyKey: input.idempotencyKey,
    request: { ...input, projectNumber, name, currencyCode },
    listKey: "Project",
    companyId,
    createsProject: true,
    data: {
      projectNumber,
      name,
      description: input.description?.trim(),
      startDate: optionalDate(input.startDate, "Start date"),
      currencyCode,
      company: { connect: { id: companyId } },
    },
    afterCreate: async (transaction, project) => {
      const sudo = transaction.sudo();
      const companyMemberships = await sudo.query.CompanyMembership.findMany!({
        where: { company: { id: { equals: companyId } }, user: { id: { equals: session.itemId } }, status: { equals: "active" } },
        take: 2,
        query: "id role { id }",
      });
      if (companyMemberships.length !== 1) throw new Error("An unambiguous active company membership is required to initialize this project");
      const companyRole = companyMemberships[0]?.role as { id?: string } | null | undefined;
      const roleId = companyRole?.id;
      await requireCreate(sudo, "ProjectMembership")({
        data: {
          membershipKey: `${project.id}:${session.itemId}`,
          status: "active",
          accessLevel: "manager",
          portalType: "internal",
          joinedAt: new Date(),
          ...(roleId ? { role: { connect: { id: String(roleId) } } } : {}),
          project: { connect: { id: project.id } },
          user: { connect: { id: session.itemId } },
        },
      });

      const costCodes = await sudo.query.CostCode.findMany!({
        where: { costCodeKey: { equals: `${companyId}:gen` } },
        take: 2,
        query: "id",
      });
      if (costCodes.length > 1) throw new Error("Duplicate general cost codes require operator reconciliation");
      const costCode = costCodes[0]?.id
        ? costCodes[0]
        : await requireCreate(sudo, "CostCode")({ data: { code: "GEN", name: "General", company: { connect: { id: companyId } } } });
      const budgetCode = await requireCreate(sudo, "BudgetCode")({ data: {
        code: "GEN", description: "General project costs", costType: "other", isActive: true,
        costCode: { connect: { id: String(costCode.id) } },
        company: { connect: { id: companyId } }, project: { connect: { id: project.id } },
      } });
      const budget = await requireCreate(sudo, "Budget")({ data: {
        name: "Initial project budget", version: 1, status: "active", currencyCode,
        approvedAt: new Date(), approvedBy: { connect: { id: session.itemId } },
        project: { connect: { id: project.id } },
      } });
      await requireCreate(sudo, "BudgetLineItem")({ data: {
        description: "General project costs", budget: { connect: { id: budget.id } },
        budgetCode: { connect: { id: budgetCode.id } }, project: { connect: { id: project.id } },
      } });
      for (const domain of ["budget_change", "prime_contract", "change_order", "progress_claim", "retainage_release"]) {
        await requireCreate(sudo, "ApprovalPolicy")({ data: {
          policyKey: `${companyId}:${project.id}:${domain}:default`,
          name: `Default ${domain.replaceAll("_", " ")} approval`, domain,
          minimumAmountMinor: "0", currencyCode, isActive: true,
          ...(roleId ? { approverRole: { connect: { id: String(roleId) } } } : {}),
          company: { connect: { id: companyId } }, project: { connect: { id: project.id } },
        } });
      }
    },
  });
}

export async function addProjectMember(
  _root: unknown,
  { input }: { input: MemberCommandInput },
  context: CommandContext,
): Promise<CommandResult> {
  const accessLevel = ["viewer", "contributor", "manager"].includes(input.accessLevel)
    ? input.accessLevel
    : null;
  if (!accessLevel) throw new Error("Access level is invalid");
  return executeProjectCommand({
    context,
    operation: "addProjectMember",
    permission: "canManagePeople",
    projectId: input.projectId,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "ProjectMembership",
    data: {
      membershipKey: `${input.projectId}:${requiredText(input.userId, "User id", 200)}`,
      status: "active",
      accessLevel,
      joinedAt: new Date(),
      project: { connect: { id: input.projectId } },
      user: { connect: { id: input.userId } },
    },
  });
}
