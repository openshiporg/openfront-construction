import { createHash, randomUUID } from "node:crypto";

import { hasProjectPermission, type Session } from "../access";
import { lockCurrentAuthority } from "../domain/current-authority";
import { canAccessProjectById, queryById, type KeystoneQueryApi } from "../domain/tenancy";
import {
  approvalTargets as targets,
  canonicalApprovalSnapshot,
  digestApprovalSnapshot,
  matchesApprovalSnapshot,
  lockApprovalPolicySnapshot,
  lockApprovalSnapshot,
} from "../domain/approval-snapshots";

type DbApi = {
  createOne(args: { data: Record<string, unknown> }): Promise<{ id: string } & Record<string, unknown>>;
  updateOne(args: { where: { id: string }; data: Record<string, unknown> }): Promise<{ id: string } & Record<string, unknown>>;
};
type ApprovalContext = {
  session?: Session;
  prisma?: { user?: unknown; $queryRawUnsafe?<T = unknown>(query: string, ...values: unknown[]): Promise<T> };
  withSession?(session: Session): ApprovalContext;
  __constructionTransaction?: true;
  sudo(): { query: Record<string, KeystoneQueryApi>; db: Record<string, DbApi> };
  transaction?<T>(callback: (context: ApprovalContext) => Promise<T>, options?: { timeout?: number }): Promise<T>;
};

async function approvalTransaction<T>(context: ApprovalContext, callback: (tx: ApprovalContext) => Promise<T>, options?: { timeout?: number }): Promise<T> {
  if (context.__constructionTransaction) return callback(context);
  if (!context.transaction) throw new Error("Transactional approval context is required");
  return context.transaction(callback, options);
}
type ApprovalRequestResult = { success: boolean; requestId: string; actionId: string; replayed: boolean };
type ApprovalDecisionResult = { success: boolean; requestId: string; decisionId: string; actionId: string };

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
function required(value: unknown, label: string, max: number) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required`);
  const normalized = value.trim();
  if (normalized.length > max) throw new Error(`${label} must be at most ${max} characters`);
  return normalized;
}
function requireSession(context: ApprovalContext) {
  if (!context.session?.itemId) throw new Error("Authentication required");
  return context.session;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function actorHasPolicyRole(session: Session, companyId: string, projectId: string, roleId: string | null) {
  if (!roleId) return true;
  const explicit = session.data.projectMemberships?.find(entry => entry.status === "active" && entry.project?.id === projectId && entry.project?.company?.id === companyId);
  if (explicit) return explicit.role?.id === roleId;
  return Boolean(session.data.companyMemberships?.some(entry => entry.status === "active" && entry.canAccessAllProjects && entry.company?.id === companyId && entry.role?.id === roleId));
}

export async function requestConstructionApproval(
  _root: unknown,
  { input }: { input: { targetType: string; targetId: string; targetStatus: string; requestNumber: string; reason: string; assigneeMembershipId?: string | null } },
  context: ApprovalContext,
): Promise<ApprovalRequestResult> {
  const session = requireSession(context);
  const targetId = required(input.targetId, "Target id", 200);
  const targetStatus = required(input.targetStatus, "Target status", 80);
  const requestNumber = required(input.requestNumber, "Approval request number", 100);
  const reason = required(input.reason, "Approval reason", 500);
  if (targetStatus !== "approved") throw new Error("The bounded initial approval workflow supports exact approval-state requests only");
  const config = Object.hasOwn(targets, input.targetType) ? targets[input.targetType] : undefined;
  if (!config) throw new Error("This resource does not support bounded approvals");
  const target = await queryById(context, config.listKey, targetId, "id company { id } project { id }");
  const companyId = target?.company?.id;
  const projectId = target?.project?.id;
  if (!companyId || !projectId) throw new Error("Approval target not found");
  if (!hasProjectPermission(session, companyId, projectId, config.permission, true) || !(await canAccessProjectById(context, session.itemId, projectId, true))) throw new Error("Not authorized to request approval for this project");
  if (!context.__constructionTransaction) {
    if (!context.transaction) throw new Error("Transactional approval context is required");
    return context.transaction(async tx => {
      const fresh = await lockCurrentAuthority(tx, companyId, projectId, config.permission);
      const current = tx.withSession ? tx.withSession(fresh) : tx;
      return requestConstructionApproval(_root, { input }, { ...current, session: fresh, __constructionTransaction: true });
    }, { timeout: 30_000 });
  }
  let assigneeMembershipId = input.assigneeMembershipId ? required(input.assigneeMembershipId, "Assignee membership id", 200) : null;
  const resourceWhere = { project: { id: { equals: projectId } }, targetType: { equals: config.listKey }, targetId: { equals: targetId }, targetStatus: { equals: targetStatus } };
  // The business request number identifies one attempt, including its original
  // captured configuration. Recover it before re-evaluating NEW admission.
  const existing = await context.sudo().query.ApprovalRequest.findMany!({
    where: { ...resourceWhere, requestNumber: { equals: requestNumber }, requestedBy: { id: { equals: session.itemId } } },
    take: 2, query: "id status assignedTo { id }",
  });
  if (existing.length > 1) throw new Error("This number identifies multiple prior attempts; review their receipts before starting a new request");
  if (existing[0]?.id) {
    const assigned = isRecord(existing[0].assignedTo) ? existing[0].assignedTo.id : null;
    const [receipt] = await context.sudo().query.AgentAction.findMany!({ where: { action: { equals: "requestConstructionApproval" }, targetId: { equals: String(existing[0].id) }, requestedBy: { id: { equals: session.itemId } } }, take: 1, query: "id reason" });
    if (!receipt?.id || receipt.reason !== reason || assigned !== assigneeMembershipId) throw new Error("Approval replay must match the original request payload and receipt");
    if (existing[0].status !== "pending") throw new Error(`This approval attempt is already ${String(existing[0].status)}; use a new request number for a new review`);
    return { success: true, requestId: String(existing[0].id), actionId: String(receipt.id), replayed: true };
  }
  const loaded = await lockApprovalSnapshot(context, input.targetType, targetId);
  const targetCurrency = required(loaded.record.currencyCode, "Recorded currency", 3);
  if (targetCurrency !== "USD") throw new Error("Approval workflows are disabled for non-USD projects until currency propagation is complete");
  const amountMinor = String(loaded.record[loaded.config.amountField] ?? "");
  if (!/^-?\d+$/.test(amountMinor)) throw new Error("The recorded approval amount is unavailable");
  const amountMagnitude = (BigInt(amountMinor) < BigInt(0) ? -BigInt(amountMinor) : BigInt(amountMinor)).toString();
  const policies = await context.sudo().query.ApprovalPolicy.findMany!({
    where: {
      domain: { equals: loaded.config.domain },
      isActive: { equals: true },
      company: { id: { equals: loaded.companyId } },
      OR: [
        { project: { id: { equals: loaded.projectId } } },
        { project: null },
      ],
      minimumAmountMinor: { lte: amountMagnitude },
      currencyCode: { equals: targetCurrency },
    },
    take: 101,
    query: "id domain minimumAmountMinor currencyCode isActive approverRole { id } company { id } project { id }",
  });
  if (policies.length > 100) throw new Error("Approval policy set exceeds the bounded selection limit; contact an administrator");
  const policy = [...policies].sort((a, b) => {
    const aSpecific = a.project?.id === loaded.projectId ? 1 : 0;
    const bSpecific = b.project?.id === loaded.projectId ? 1 : 0;
    if (aSpecific !== bSpecific) return bSpecific - aSpecific;
    const aMinimum = BigInt(String(a.minimumAmountMinor ?? 0));
    const bMinimum = BigInt(String(b.minimumAmountMinor ?? 0));
    return aMinimum === bMinimum ? String(a.id).localeCompare(String(b.id)) : aMinimum > bMinimum ? -1 : 1;
  })[0];
  if (!policy?.id) throw new Error("No active approval policy covers this operation, amount, and currency");
  const policySnapshot = canonicalApprovalSnapshot(policy);
  const policyDigest = digestApprovalSnapshot(policySnapshot);
  let assignmentSnapshot: Record<string, unknown> | null = null;
  if (input.assigneeMembershipId) {
    assigneeMembershipId = required(input.assigneeMembershipId, "Assignee membership id", 200);
    if (context.prisma?.$queryRawUnsafe) {
      await context.prisma.$queryRawUnsafe('SELECT id FROM "ProjectMembership" WHERE id = $1 FOR SHARE', assigneeMembershipId);
      await context.prisma.$queryRawUnsafe('SELECT id FROM "User" WHERE id = (SELECT "user" FROM "ProjectMembership" WHERE id = $1) FOR SHARE', assigneeMembershipId);
      await context.prisma.$queryRawUnsafe('SELECT id FROM "Role" WHERE id = (SELECT role FROM "ProjectMembership" WHERE id = $1) FOR SHARE', assigneeMembershipId);
    }
    const assignee = await context.sudo().query.ProjectMembership.findOne!({ where: { id: assigneeMembershipId }, query: `id status portalType accessLevel project { id company { id } } user { id isActive } role { id ${loaded.config.permission} company { id } } portalOrganization { id company { id } }` });
    const policyRole = isRecord(policy.approverRole) ? policy.approverRole : null;
    const assigneeRole = isRecord(assignee?.role) ? assignee.role : null;
    const roleCompany = isRecord(assigneeRole?.company) ? assigneeRole.company : null;
    const assigneeUser = isRecord(assignee?.user) ? assignee.user : null;
    const organization = isRecord(assignee?.portalOrganization) ? assignee.portalOrganization : null;
    const organizationCompany = isRecord(organization?.company) ? organization.company : null;
    const owner = assignee?.portalType === "owner" && organizationCompany?.id === loaded.companyId;
    const internal = assignee?.portalType === "internal" && assigneeRole?.[loaded.config.permission] === true && (!policyRole?.id || assigneeRole?.id === policyRole.id);
    if (assignee?.status !== "active" || assignee.accessLevel === "viewer" || assignee.project?.id !== loaded.projectId || assignee.project?.company?.id !== loaded.companyId || assigneeUser?.isActive !== true || typeof assigneeUser.id !== "string" || typeof assigneeRole?.id !== "string" || roleCompany?.id !== loaded.companyId || (!owner && !internal)) {
      throw new Error("Approval assignee must be a current eligible reviewer for this project and policy");
    }
    if (assigneeUser.id === session.itemId) throw new Error("Choose a different eligible person for independent approval");
    assignmentSnapshot = { membershipId: assigneeMembershipId, userId: assigneeUser.id, roleId: assigneeRole.id, portalType: assignee.portalType, organizationId: organization?.id ?? null, accessLevel: assignee.accessLevel };
  }
  const snapshot = canonicalApprovalSnapshot({ ...loaded.record, snapshotVersion: 2, approvalTarget: loaded.config.listKey, _approvalAssignment: assignmentSnapshot });
  if (Buffer.byteLength(snapshot, "utf8") > 512_000) throw new Error("Approval snapshot exceeds the supported review size");
  const snapshotDigest = digestApprovalSnapshot(snapshot);
  // A new business request number is an explicit new review attempt. Keep every
  // prior rejection/decision intact, while replaying only the original actor's
  // identical attempt (including legacy keys that omitted the attempt number).
  const requestKey = digest([companyId, projectId, config.listKey, targetId, targetStatus, session.itemId, requestNumber].join(String.fromCharCode(31)));
  const pending = await context.sudo().query.ApprovalRequest.findMany!({ where: { ...resourceWhere, status: { equals: "pending" }, policyDigest: { equals: policyDigest } }, take: 101, query: "id canonicalSnapshot snapshotDigest" });
  if (pending.length > 100) throw new Error("Pending approval history exceeds the supported review limit");
  if (pending.some(request => matchesApprovalSnapshot(loaded, request.canonicalSnapshot, request.snapshotDigest))) throw new Error("A review of these exact terms is already pending; finish or supersede it before requesting another");
  if (!context.transaction) throw new Error("Transactional approval context is required");
  try {
    return await approvalTransaction(context, async tx => {
    const sudo = tx.sudo();
    const lockedPolicy = await lockApprovalPolicySnapshot(tx, String(policy.id));
    if (lockedPolicy.snapshotDigest !== policyDigest) throw new Error("Approval policy changed while the request was being prepared");
    const policyRole = isRecord(lockedPolicy.record.approverRole) ? lockedPolicy.record.approverRole : null;
    const request = await sudo.db.ApprovalRequest.createOne({ data: {
      requestKey,
      requestNumber,
      operation: `transition${loaded.config.listKey}Status`,
      targetType: loaded.config.listKey,
      targetId,
      targetStatus,
      canonicalSnapshot: snapshot,
      snapshotDigest,
      policySnapshot,
      policyDigest,
      approverRoleIdSnapshot: policyRole?.id ? String(policyRole.id) : "",
      amountMinor,
      currencyCode: targetCurrency,
      status: "pending",
      policy: { connect: { id: String(policy.id) } },
      requestedBy: { connect: { id: session.itemId } },
      ...(assigneeMembershipId ? { assignedTo: { connect: { id: assigneeMembershipId } } } : {}),
      project: { connect: { id: loaded.projectId } },
    } });
    const action = await sudo.db.AgentAction.createOne({ data: {
      actionKey: randomUUID(), actorType: session.authType === "api_key" ? "agent" : "human",
      action: "requestConstructionApproval", status: "succeeded", targetType: "ApprovalRequest",
      targetId: request.id, targetStatus: "pending", reason,
      correlationId: session.apiCredential?.id, requestDigest: snapshotDigest,
      requestedAt: new Date(), startedAt: new Date(), completedAt: new Date(),
      company: { connect: { id: loaded.companyId } }, project: { connect: { id: loaded.projectId } },
      requestedBy: { connect: { id: session.itemId } }, actorUser: { connect: { id: session.itemId } },
    } });
    const payload = JSON.stringify({ schemaVersion: 1, requestId: request.id, targetType: loaded.config.listKey, targetId, targetStatus, snapshotDigest, assigneeMembershipId });
    await sudo.db.OutboxMessage.createOne({ data: {
      messageKey: `ApprovalRequest:${request.id}:requested`, eventType: "ApprovalRequest.requested",
      aggregateType: "ApprovalRequest", aggregateId: request.id, canonicalPayload: payload, payloadDigest: digest(payload), status: "pending",
      company: { connect: { id: loaded.companyId } }, project: { connect: { id: loaded.projectId } }, agentAction: { connect: { id: action.id } },
    } });
    return { success: true, requestId: request.id, actionId: action.id, replayed: false };
    }, { timeout: 30_000 });
  } catch (error) {
    const concurrent = await context.sudo().query.ApprovalRequest.findMany!({ where: { requestKey: { equals: requestKey }, status: { equals: "pending" } }, take: 1, query: "id" });
    if (concurrent[0]?.id) {
      const [receipt] = await context.sudo().query.AgentAction.findMany!({ where: { action: { equals: "requestConstructionApproval" }, targetId: { equals: String(concurrent[0].id) }, requestedBy: { id: { equals: session.itemId } } }, take: 1, query: "id reason" });
      if (receipt?.id && receipt.reason === reason) return { success: true, requestId: String(concurrent[0].id), actionId: String(receipt.id), replayed: true };
    }
    throw error;
  }
}

export async function decideConstructionApproval(
  _root: unknown,
  { input }: { input: { requestId: string; decision: string; comment: string } },
  context: ApprovalContext,
): Promise<ApprovalDecisionResult> {
  const session = requireSession(context);
  if (session.authType === "api_key") throw new Error("Approval decisions require a live human session");
  const request = await queryById(context, "ApprovalRequest", required(input.requestId, "Approval request id", 200), `
    id status targetType targetId targetStatus canonicalSnapshot snapshotDigest policySnapshot policyDigest approverRoleIdSnapshot amountMinor
    company { id } project { id }
    policy { id }
    requestedBy { id }
    assignedTo { id status portalType accessLevel role { id } portalOrganization { id } user { id } }
  `) as Record<string, unknown> & {
    company?: { id?: string } | null;
    project?: { id?: string } | null;
    policy?: { id?: string } | null;
    policySnapshot?: string;
    policyDigest?: string;
    approverRoleIdSnapshot?: string;
    requestedBy?: { id?: string } | null;
    assignedTo?: { id?: string; status?: string; portalType?: string; accessLevel?: string; role?: { id?: string } | null; portalOrganization?: { id?: string } | null; user?: { id?: string } | null } | null;
  } | null;
  if (!request?.id || request.status !== "pending" || !request.company?.id || !request.project?.id) {
    throw new Error("Pending approval request not found");
  }
  if (!context.__constructionTransaction) {
    if (!context.transaction) throw new Error("Transactional approval context is required");
    const target = targets[String(request.targetType)];
    if (!target) throw new Error("Approval target is unavailable");
    const externalOrganizationId = request.assignedTo?.user?.id === session.itemId && request.assignedTo.portalType === "owner" && request.assignedTo.accessLevel !== "viewer" ? request.assignedTo.portalOrganization?.id : undefined;
    return context.transaction(async tx => {
      const authority = externalOrganizationId
        ? { kind: "assigned-owner-approval" as const, requestId: String(request.id) }
        : target.permission;
      const fresh = await lockCurrentAuthority(tx, request.company!.id!, request.project!.id!, authority, externalOrganizationId);
      const current = tx.withSession ? tx.withSession(fresh) : tx;
      return decideConstructionApproval(_root, { input }, { ...current, session: fresh, __constructionTransaction: true });
    }, { timeout: 30_000 });
  }
  if (request.requestedBy?.id === session.itemId) throw new Error("A different authorized person must decide this approval request");
  const decision = input.decision === "approved" || input.decision === "rejected" ? input.decision : null;
  if (!decision) throw new Error("Approval decision must be approved or rejected");
  const target = targets[String(request.targetType)];
  if (request.assignedTo && (request.assignedTo.status !== "active" || request.assignedTo.user?.id !== session.itemId || request.assignedTo.accessLevel === "viewer")) {
    throw new Error("Only the current assigned approver may decide this request");
  }
  const assignedExternal = request.assignedTo?.status === "active" &&
    request.assignedTo.user?.id === session.itemId && request.assignedTo.portalType === "owner" && request.assignedTo.accessLevel !== "viewer";
  const internalApprover = Boolean(target) &&
    hasProjectPermission(session, request.company.id, request.project.id, target!.permission, true) &&
    actorHasPolicyRole(session, request.company.id, request.project.id, request.approverRoleIdSnapshot || null) &&
    await canAccessProjectById(context, session.itemId, request.project.id, true);
  if (!target || (!assignedExternal && !internalApprover)) {
    throw new Error("Not authorized to decide this approval request");
  }
  if (!context.transaction) throw new Error("Transactional approval context is required");
  return approvalTransaction(context, async tx => {
    if (!tx.prisma?.$queryRawUnsafe) throw new Error("Transactional approval decision lock is unavailable");
    const [locked] = await tx.prisma.$queryRawUnsafe<Array<{ status: string; snapshotDigest: string }>>(
      `SELECT status::text, "snapshotDigest" FROM "ApprovalRequest" WHERE id = $1 FOR UPDATE`, String(request.id),
    );
    if (!locked || locked.status !== "pending" || locked.snapshotDigest !== request.snapshotDigest) {
      throw new Error("Approval request was already decided or superseded");
    }
    if (decision === "approved") {
      const currentSnapshot = await lockApprovalSnapshot(tx, String(request.targetType), String(request.targetId));
      if (!matchesApprovalSnapshot(currentSnapshot, request.canonicalSnapshot, request.snapshotDigest)) throw new Error("The commercial terms or snapshot version changed; request a new value-bound review");
      const captured: unknown = JSON.parse(String(request.canonicalSnapshot));
      const assignment = isRecord(captured) ? captured._approvalAssignment : undefined;
      if (request.assignedTo) {
        if (!isRecord(assignment) || assignment.membershipId !== request.assignedTo.id || assignment.userId !== session.itemId || assignment.portalType !== request.assignedTo.portalType || assignment.organizationId !== (request.assignedTo.portalOrganization?.id ?? null) || assignment.accessLevel !== request.assignedTo.accessLevel || assignment.roleId !== request.assignedTo.role?.id) throw new Error("The assigned reviewer authority changed; request a new review");
      } else if (assignment !== null) throw new Error("Approval assignment evidence is incomplete");
      if (!request.policy?.id || !request.policyDigest || digest(String(request.policySnapshot ?? "")) !== request.policyDigest) throw new Error("Approval policy evidence is incomplete; request a new value-bound approval");
      const currentPolicy = await lockApprovalPolicySnapshot(tx, String(request.policy.id));
      if (currentPolicy.snapshotDigest !== request.policyDigest) throw new Error("Approval policy changed after request; issue a new approval request");
    }
    // Declining a stale/legacy request must not approve money or rewrite it, and
    // must not require the now-invalid target terms to become valid again.
    const sudo = tx.sudo();
    const decisionRecord = await sudo.db.ApprovalDecision.createOne({ data: {
      decision,
      comment: required(input.comment, "Decision comment", 2000),
      request: { connect: { id: String(request.id) } },
      decidedBy: { connect: { id: session.itemId } },
      project: { connect: { id: request.project!.id! } },
    } });
    await sudo.db.ApprovalRequest.updateOne({ where: { id: String(request.id) }, data: { status: decision, decidedAt: new Date() } });
    const action = await sudo.db.AgentAction.createOne({ data: {
      actionKey: randomUUID(), actorType: session.authType === "api_key" ? "agent" : "human",
      action: "decideConstructionApproval", status: "succeeded", targetType: "ApprovalRequest",
      targetId: String(request.id), targetStatus: decision, reason: `Approval ${decision}; decision ${decisionRecord.id}`,
      correlationId: session.apiCredential?.id, requestDigest: String(request.snapshotDigest),
      requestedAt: new Date(), startedAt: new Date(), completedAt: new Date(),
      company: { connect: { id: request.company!.id! } }, project: { connect: { id: request.project!.id! } },
      requestedBy: { connect: { id: session.itemId } }, actorUser: { connect: { id: session.itemId } },
    } });
    const payload = JSON.stringify({ schemaVersion: 1, requestId: request.id, decision, decisionId: decisionRecord.id, targetType: request.targetType, targetId: request.targetId });
    await sudo.db.OutboxMessage.createOne({ data: {
      messageKey: `ApprovalRequest:${request.id}:${decisionRecord.id}`,
      eventType: "ApprovalRequest.decided", aggregateType: "ApprovalRequest", aggregateId: String(request.id),
      canonicalPayload: payload, payloadDigest: digest(payload), status: "pending",
      company: { connect: { id: request.company!.id! } }, project: { connect: { id: request.project!.id! } },
      agentAction: { connect: { id: action.id } },
    } });
    return { success: true, requestId: String(request.id), decisionId: decisionRecord.id, actionId: action.id };
  }, { timeout: 30_000 });
}
