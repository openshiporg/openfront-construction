import { createHash, randomUUID } from "node:crypto";

import { hasProjectPermission, type Session } from "../access";
import { lockCurrentAuthority } from "../domain/current-authority";
import type { Permission } from "../models/fields";
import { assertAgentPrincipal, compareAndSetAgentAction, discoverAgentAction, lockAgentActionChain, selectAndLockAgentGrant, type AgentActionDescriptor } from "../domain/agent-authority";
import { normalizeScope, scopeAllows } from "../domain/scopes";
import { assertAllowedTransition, normalizeTransitionReason } from "../domain/lifecycle";
import { queryById, type KeystoneQueryApi, type KeystoneQueryRecord } from "../domain/tenancy";
import { getLifecycleActionPolicy } from "./lifecycle";

type MutationApi = {
  createOne?(args: { data: Record<string, unknown> }): Promise<KeystoneQueryRecord>;
  updateOne?(args: { where: { id: string }; data: Record<string, unknown> }): Promise<KeystoneQueryRecord>;
  findOne?(args: { where: { id: string } }): Promise<KeystoneQueryRecord | null>;
};
type AgentMutationContext = {
  session?: Session;
  prisma?: { user?: unknown; $queryRawUnsafe?<T>(query: string, ...values: unknown[]): Promise<T> };
  sudo(): { query: Record<string, KeystoneQueryApi>; db: Record<string, MutationApi> };
  withSession?(session: Session): AgentMutationContext;
  __constructionTransaction?: true;
  transaction?<T>(callback: (context: AgentMutationContext) => Promise<T>, options?: { timeout?: number }): Promise<T>;
};
export type AgentActionRequestInput = {
  agentIdentityId: string; action: string; requiredScope: string; targetType: string; targetId: string; toStatus: string;
  companyId: string; projectId?: string | null; reason: string; correlationId?: string | null; causationId?: string | null;
};
type OutcomeInput = { id: string; outcome: string; resultSummary?: string | null; errorCode?: string | null; errorMessage?: string | null };
export type AgentObservationReceipt = { actionId: string; observationId: string; authoritative: false; reportedOutcome: string; observedActionStatus: string; replayed: boolean };
function requireSession(context: AgentMutationContext): Session {
  if (!context.session?.itemId) throw new Error("Authentication required");
  return context.session;
}
function boundedString(value: unknown, label: string, max: number): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required`);
  const normalized = value.trim();
  if (normalized.length > max) throw new Error(`${label} must be at most ${max} characters`);
  return normalized;
}
function optionalBoundedString(value: unknown, label: string, max: number): string | null {
  return value === null || value === undefined || value === "" ? null : boundedString(value, label, max);
}
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
async function withAgentAuthority<T>(context: AgentMutationContext, companyId: string, projectId: string, permission: Permission | readonly Permission[], callback: (tx: AgentMutationContext) => Promise<T>): Promise<T> {
  if (!context.transaction) throw new Error("Transactional agent context is required");
  return context.transaction(async tx => {
    const fresh = await lockCurrentAuthority(tx, companyId, projectId, permission);
    const current = tx.withSession ? tx.withSession(fresh) : tx;
    return callback({ ...current, session: fresh, __constructionTransaction: true });
  }, { timeout: 30_000 });
}
function actionPolicy(action: AgentActionDescriptor) {
  const policy = getLifecycleActionPolicy(action.action);
  if (!policy || !action.projectId || action.targetType !== policy.listKey || !scopeAllows(action.requiredScope, policy.requiredScope)) throw new Error("Agent action has no valid bounded domain operation");
  return policy;
}
async function assertCurrentTarget(context: AgentMutationContext, action: Pick<AgentActionDescriptor, "targetId" | "targetStatus" | "companyId" | "projectId">, policy: NonNullable<ReturnType<typeof getLifecycleActionPolicy>>) {
  const record = await queryById(context, policy.listKey, action.targetId, policy.projectRoot ? "id status company { id }" : "id status company { id } project { id }");
  if (!record || record.company?.id !== action.companyId || (policy.projectRoot ? record.id : record.project?.id) !== action.projectId || typeof record.status !== "string") throw new Error("Agent action target is unavailable for this project");
  assertAllowedTransition(policy.listKey, record.status, action.targetStatus);
}

export async function requestAgentAction(_root: unknown, { input }: { input: AgentActionRequestInput }, context: AgentMutationContext): Promise<KeystoneQueryRecord> {
  const session = requireSession(context);
  const identityId = boundedString(input.agentIdentityId, "Agent identity", 200);
  const actionName = boundedString(input.action, "Action", 200);
  const targetType = boundedString(input.targetType, "Target type", 120);
  const targetId = boundedString(input.targetId, "Target id", 200);
  const targetStatus = boundedString(input.toStatus, "Target status", 80);
  const companyId = boundedString(input.companyId, "Company id", 200);
  const projectId = boundedString(input.projectId, "Project id", 200);
  const reason = normalizeTransitionReason(input.reason);
  const requiredScope = normalizeScope(input.requiredScope);
  const correlationId = optionalBoundedString(input.correlationId, "Correlation id", 200);
  const causationId = optionalBoundedString(input.causationId, "Causation id", 200);
  const policy = getLifecycleActionPolicy(actionName);
  if (!policy) throw new Error("Unsupported agent action");
  if (targetType !== policy.listKey) throw new Error("Agent action target type does not match the requested operation");
  if (!scopeAllows(requiredScope, policy.requiredScope)) throw new Error("Agent action scope does not satisfy the requested operation");
  if (!hasProjectPermission(session, companyId, projectId, policy.permission, true)) throw new Error("Not authorized for this agent action domain and project");
  if (!context.__constructionTransaction) return withAgentAuthority(context, companyId, projectId, policy.permission, tx => requestAgentAction(_root, { input }, tx));
  const { identity, grant } = await selectAndLockAgentGrant(context, { identityId, companyId, projectId, requiredScope });
  assertAgentPrincipal(session, companyId, projectId, policy.permission, identity.ownerId);
  await assertCurrentTarget(context, { targetId, targetStatus, companyId, projectId }, policy);
  const create = context.sudo().db.AgentAction?.createOne;
  if (!create) throw new Error("AgentAction create mutation is unavailable");
  return create({ data: {
    actionKey: randomUUID(), actorType: "agent", action: actionName, requiredScope,
    status: identity.approvalMode === "none" ? "approved" : "proposed", targetType, targetId, targetStatus, reason,
    ...(correlationId ? { correlationId } : {}), ...(causationId ? { causationId } : {}),
    requestDigest: digest([identityId, actionName, requiredScope, targetType, targetId, targetStatus, companyId, projectId, reason, correlationId ?? "", causationId ?? ""].join("\u001f")),
    requestedAt: new Date(), ...(identity.approvalMode === "none" ? { reviewedAt: new Date(), reviewNotes: "Auto-approved by identity policy", reviewedBy: { connect: { id: session.itemId } } } : {}),
    company: { connect: { id: companyId } }, project: { connect: { id: projectId } }, agentIdentity: { connect: { id: identityId } },
    scopeGrant: { connect: { id: grant.id } }, requestedBy: { connect: { id: session.itemId } },
  } });
}

export async function reviewAgentAction(_root: unknown, { input }: { input: { id: string; decision: string; notes: string } }, context: AgentMutationContext): Promise<KeystoneQueryRecord> {
  const session = requireSession(context);
  if (session.authType === "api_key") throw new Error("Agent reviews require a live independent human session");
  const id = boundedString(input.id, "Agent action id", 200);
  const decision = boundedString(input.decision, "Decision", 20).toLowerCase();
  const notes = normalizeTransitionReason(input.notes);
  if (!["approve", "reject"].includes(decision)) throw new Error("Decision must be approve or reject");
  const discovered = await discoverAgentAction(context, id);
  const policy = actionPolicy(discovered);
  const projectId = discovered.projectId;
  if (!projectId || !hasProjectPermission(session, discovered.companyId, projectId, "canManageAgents", true) || !hasProjectPermission(session, discovered.companyId, projectId, policy.permission, true)) throw new Error("Not authorized to review this agent action");
  if (!context.__constructionTransaction) return withAgentAuthority(context, discovered.companyId, projectId, ["canManageAgents", policy.permission], tx => reviewAgentAction(_root, { input }, tx));
  const { action } = await lockAgentActionChain(context, discovered, policy.requiredScope, decision === "reject" ? "restrict" : "active");
  if (action.status !== "proposed") throw new Error("Only proposed actions can be reviewed");
  if (decision === "approve") {
    if (action.requestedById === session.itemId) throw new Error("A different authorized human must approve this action");
    await assertCurrentTarget(context, action, policy);
  }
  const update = context.sudo().db.AgentAction?.updateOne;
  if (!update) throw new Error("AgentAction update mutation is unavailable");
  await compareAndSetAgentAction(context, id, "proposed", decision === "approve" ? "approved" : "rejected");
  return update({ where: { id }, data: {
    reviewedBy: { connect: { id: session.itemId } }, reviewedAt: new Date(), reviewNotes: notes,
    ...(decision === "reject" ? { completedAt: new Date() } : {}),
  } });
}

async function captureObservation(_root: unknown, { input }: { input: OutcomeInput }, context: AgentMutationContext): Promise<{ receipt: AgentObservationReceipt; action: KeystoneQueryRecord }> {
  const session = requireSession(context);
  const id = boundedString(input.id, "Agent action id", 200);
  const outcome = boundedString(input.outcome, "Outcome", 20).toLowerCase();
  if (!["unknown", "running", "succeeded", "failed"].includes(outcome)) throw new Error("Reported outcome must be unknown, running, succeeded or failed");
  const resultSummary = optionalBoundedString(input.resultSummary, "Result summary", 2000);
  const errorCode = optionalBoundedString(input.errorCode, "Error code", 100);
  const errorMessage = optionalBoundedString(input.errorMessage, "Error message", 1000);
  if (outcome === "failed" && !errorMessage) throw new Error("A reported failure requires an error message");
  const discovered = await discoverAgentAction(context, id);
  const policy = actionPolicy(discovered);
  const projectId = discovered.projectId;
  if (!projectId || !hasProjectPermission(session, discovered.companyId, projectId, policy.permission, true)) throw new Error("Not authorized to observe this agent action");
  if (!context.__constructionTransaction) return withAgentAuthority(context, discovered.companyId, projectId, policy.permission, tx => captureObservation(_root, { input }, tx));
  const locked = await lockAgentActionChain(context, discovered, policy.requiredScope);
  assertAgentPrincipal(session, locked.action.companyId, projectId, policy.permission, locked.identity.ownerId);
  const canonicalPayload = JSON.stringify({ schemaVersion: 1, authoritative: false, actionId: id, reportedOutcome: outcome,
    observedActionStatus: locked.action.status, actorUserId: session.itemId,
    actorCredentialId: session.authType === "api_key" ? session.apiCredential?.id : null,
    resultSummary, errorCode, errorMessage });
  const messageKey = `AgentAction.observation:${id}:${digest(canonicalPayload)}`;
  const sudo = context.sudo();
  const [existing] = await sudo.query.OutboxMessage.findMany!({ where: { messageKey: { equals: messageKey } }, take: 1, query: "id canonicalPayload" });
  if (existing && existing.canonicalPayload !== canonicalPayload) throw new Error("Observation replay does not match its original payload");
  const create = sudo.db.OutboxMessage?.createOne;
  if (!existing && !create) throw new Error("Observation evidence persistence is unavailable");
  const observation = existing ?? await create!({ data: {
    messageKey, eventType: "AgentAction.external_observation", aggregateType: "AgentAction", aggregateId: id,
    canonicalPayload, payloadDigest: digest(canonicalPayload), status: "pending",
    company: { connect: { id: locked.action.companyId } }, project: { connect: { id: projectId } }, agentAction: { connect: { id } },
  } });
  if (!observation.id) throw new Error("Observation receipt is unavailable");
  const findAction = sudo.db.AgentAction?.findOne;
  if (!findAction) throw new Error("AgentAction receipt lookup is unavailable");
  const original = await findAction({ where: { id } });
  if (!original || original.id !== id || original.status !== locked.action.status) throw new Error("Action changed while capturing the observation");
  return { receipt: { actionId: id, observationId: observation.id, authoritative: false, reportedOutcome: outcome, observedActionStatus: locked.action.status, replayed: Boolean(existing) }, action: original };
}

/** Explicit observation receipt; no lifecycle or financial effect is claimed. */
export async function recordAgentActionObservation(root: unknown, args: { input: OutcomeInput }, context: AgentMutationContext) {
  return (await captureObservation(root, args, context)).receipt;
}
/** Compatibility endpoint returns the UNCHANGED action, never caller-asserted status. */
export async function recordAgentActionOutcome(root: unknown, args: { input: OutcomeInput }, context: AgentMutationContext) {
  return (await captureObservation(root, args, context)).action;
}
