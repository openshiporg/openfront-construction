import { createHash, randomBytes, randomUUID } from "node:crypto";

import { hasProjectPermission } from "../access";
import { canAccessProjectById, queryById } from "../domain/tenancy";
import { resolveInvitationAcceptanceMode } from "../domain/invitation-acceptance";
import { executeProjectCommand, requiredText, requireUpdate, requireCreate, requireCommandSession, type CommandContext } from "./construction";

type InvitedProjectMembership = {
  id: string;
  status: string;
  portalType: string;
  project: { id: string; company: { id: string; status: string } | null } | null;
  user: { id: string } | null;
  role: { id: string; company: { id: string } | null } | null;
  portalOrganization: { id: string; company: { id: string } | null } | null;
};

type InvitedCompanyMembership = {
  id: string;
  status: string;
  role: { id: string; company: { id: string } | null } | null;
};

export async function revokeProjectInvitation(
  _root: unknown,
  { invitationId, reason }: { invitationId: string; reason: string },
  context: CommandContext,
) {
  const session = requireCommandSession(context);
  if (session.authType === "api_key") throw new Error("A live administrator session is required");
  const invitation = await queryById(context, "AccountInvitation", requiredText(invitationId, "Invitation id", 200), "id status projectMembership { id } project { id company { id } }");
  const projectId = invitation?.project?.id;
  const companyId = invitation?.project?.company?.id;
  if (!invitation?.id || !projectId || !companyId ||
      !hasProjectPermission(session, companyId, projectId, "canManagePeople", true) ||
      !(await canAccessProjectById(context, session.itemId, projectId, true))) {
    throw new Error("Pending invitation not found for this project");
  }
  if (invitation.status === "revoked") return { success: true, operation: "revokeProjectInvitation", itemId: String(invitation.id), actionId: "already-revoked", replayed: true };
  if (invitation.status !== "pending") throw new Error("Only a pending invitation can be revoked");
  return executeProjectCommand({
    context, operation: "revokeProjectInvitation", permission: "canManagePeople", projectId,
    idempotencyKey: `revoke:${invitation.id}`,
    request: { invitationId: invitation.id, reason: requiredText(reason, "Revocation reason", 500) },
    listKey: "AccountInvitation", updateId: String(invitation.id), data: { status: "revoked" },
    afterCreate: async tx => {
      const membershipId = (invitation.projectMembership as { id?: string } | null | undefined)?.id;
      if (membershipId) await requireUpdate(tx.sudo(), "ProjectMembership")({ where: { id: membershipId }, data: { status: "revoked" } });
    },
  });
}

/** Replaces a lost or expired activation link for a still-invited member. The
 * previous token stops working; raw tokens are never stored for replay. */
export async function reissueProjectInvitation(
  _root: unknown,
  { invitationId, reason, idempotencyKey }: { invitationId: string; reason: string; idempotencyKey: string },
  context: CommandContext,
) {
  const session = requireCommandSession(context);
  if (session.authType === "api_key") throw new Error("A live administrator session is required");
  const invitation = await queryById(context, "AccountInvitation", requiredText(invitationId, "Invitation id", 200), "id status email project { id company { id } }");
  const projectId = invitation?.project?.id;
  const companyId = invitation?.project?.company?.id;
  if (!invitation?.id || !projectId || !companyId ||
      !hasProjectPermission(session, companyId, projectId, "canManagePeople", true) ||
      !(await canAccessProjectById(context, session.itemId, projectId, true))) {
    throw new Error("Invitation not found for this project");
  }
  const activationToken = `ofc_inv_${randomBytes(32).toString("base64url")}`;
  const tokenHash = createHash("sha256").update(activationToken).digest("hex");
  let previous: { userId: string; membershipId: string; email: string; status: string } | null = null;
  const result = await executeProjectCommand({
    context, operation: "reissueProjectInvitation", permission: "canManagePeople", projectId,
    idempotencyKey,
    request: { invitationId: invitation.id, reason: requiredText(reason, "Reason", 500) },
    listKey: "AccountInvitation", updateId: String(invitation.id), data: {},
    beforeCreate: async tx => {
      if (!tx.prisma?.$queryRawUnsafe) throw new Error("Transactional invitation lock is unavailable");
      const [locked] = await tx.prisma.$queryRawUnsafe<Array<{ status: string; userId: string; membershipId: string; email: string; projectId: string }>>(
        `SELECT status::text, "user" AS "userId", "projectMembership" AS "membershipId", email, project AS "projectId"
         FROM "AccountInvitation" WHERE id = $1 FOR UPDATE`, String(invitation.id),
      );
      if (!locked || locked.projectId !== projectId || !locked.userId || !locked.membershipId) throw new Error("Invitation not found for this project");
      if (!["pending", "expired"].includes(locked.status)) throw new Error("Only a pending or expired invitation can be resent");
      const [membership] = await tx.prisma.$queryRawUnsafe<Array<{ status: string }>>('SELECT status::text FROM "ProjectMembership" WHERE id = $1 FOR UPDATE', locked.membershipId);
      if (membership?.status !== "invited") throw new Error("This membership is no longer awaiting acceptance; send a new invitation");
      previous = locked;
      return { status: locked.status === "pending" ? "revoked" : "expired" };
    },
    afterCreate: async tx => {
      if (!previous || !tx.prisma?.$queryRawUnsafe) throw new Error("Invitation is unavailable");
      const [user] = await tx.prisma.$queryRawUnsafe<Array<{ isActive: boolean; neverSignedIn: boolean }>>(
        'SELECT u."isActive", NOT EXISTS (SELECT 1 FROM "AuthSession" s WHERE s."user" = u.id) AS "neverSignedIn" FROM "User" u WHERE u.id = $1 FOR UPDATE OF u', previous.userId,
      );
      if (!user) throw new Error("Invitee identity is unavailable");
      await requireCreate(tx.sudo(), "AccountInvitation")({ data: {
        tokenHash,
        tokenPrefix: activationToken.slice(0, 16),
        email: previous.email,
        status: "pending",
        accountSetupRequired: !user.isActive && user.neverSignedIn,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        invitedBy: { connect: { id: requireCommandSession(tx).itemId } },
        user: { connect: { id: previous.userId } },
        projectMembership: { connect: { id: previous.membershipId } },
        project: { connect: { id: projectId } },
      } });
    },
  });
  return { ...result, activationToken: result.replayed ? null : activationToken };
}

export async function acceptProjectInvitation(
  _root: unknown,
  { input }: { input: { token: string; password?: string | null; name?: string | null } },
  context: CommandContext,
) {
  const token = requiredText(input.token, "Invitation token", 200);
  if (!/^ofc_inv_[A-Za-z0-9_-]{32,}$/.test(token)) throw new Error("Invitation token is invalid");
  const password = typeof input.password === "string" ? input.password : "";
  const tokenHash = createHash("sha256").update(token).digest("hex");
  if (!context.transaction) throw new Error("Transactional invitation context is required");
  const outcome = await context.transaction(async tx => {
    if (!tx.prisma?.$queryRawUnsafe) throw new Error("Transactional invitation lock is unavailable");
    // Discover only the parent IDs, then use the same project→company lock order
    // as commands/revocation before locking the invitation itself.
    const [parent] = await tx.prisma.$queryRawUnsafe<Array<{ project: string; company: string }>>('SELECT project, company FROM "AccountInvitation" WHERE "tokenHash" = $1', tokenHash);
    if (!parent?.project || !parent.company) throw new Error("Invitation is invalid or already used");
    await tx.prisma.$queryRawUnsafe('SELECT id FROM "Project" WHERE id = $1 AND company = $2 FOR UPDATE', parent.project, parent.company);
    await tx.prisma.$queryRawUnsafe('SELECT id FROM "Company" WHERE id = $1 FOR SHARE', parent.company);
    const [locked] = await tx.prisma.$queryRawUnsafe<Array<{
      id: string;
      status: string;
      expiresAt: Date;
      userId: string;
      accountSetupRequired: boolean;
      membershipId: string;
      companyId: string;
      projectId: string;
    }>>(
      `SELECT invitation.id, invitation.status::text, invitation."expiresAt", invitation."user" AS "userId",
              invitation."projectMembership" AS "membershipId", invitation.company AS "companyId", invitation.project AS "projectId",
              invitation."accountSetupRequired"
       FROM "AccountInvitation" invitation WHERE invitation."tokenHash" = $1 FOR UPDATE`,
      tokenHash,
    );
    if (!locked || locked.status !== "pending" || !locked.userId || !locked.membershipId || !locked.companyId || !locked.projectId) {
      throw new Error("Invitation is invalid or already used");
    }
    if (new Date(locked.expiresAt) <= new Date()) {
      await requireUpdate(tx.sudo(), "AccountInvitation")({ where: { id: locked.id }, data: { status: "expired" } });
      return { expired: true as const };
    }
    // Invitation-created accounts hold an unknown random password and have never
    // signed in; only such an account may be activated by an invitation token.
    const [user] = await tx.prisma.$queryRawUnsafe<Array<{ id: string; isActive: boolean; neverSignedIn: boolean; email: string }>>('SELECT u.id, u."isActive", NOT EXISTS (SELECT 1 FROM "AuthSession" s WHERE s."user" = u.id) AS "neverSignedIn", u.email FROM "User" u WHERE u.id = $1 FOR UPDATE OF u', locked.userId);
    await tx.prisma.$queryRawUnsafe('SELECT id FROM "CompanyMembership" WHERE company = $1 AND "user" = $2 ORDER BY id FOR UPDATE', locked.companyId, locked.userId);
    await tx.prisma.$queryRawUnsafe('SELECT id FROM "ProjectMembership" WHERE id = $1 FOR UPDATE', locked.membershipId);
    await tx.prisma.$queryRawUnsafe('SELECT r.id FROM "Role" r WHERE r.id IN (SELECT role FROM "ProjectMembership" WHERE id = $1 UNION SELECT role FROM "CompanyMembership" WHERE company = $2 AND "user" = $3) ORDER BY r.id FOR SHARE', locked.membershipId, locked.companyId, locked.userId);
    const sudo = tx.sudo();
    const membership = await sudo.query.ProjectMembership.findOne!({ where: { id: locked.membershipId }, query: "id status portalType project { id company { id status } } user { id } role { id company { id } } portalOrganization { id company { id } }" }) as InvitedProjectMembership | null;
    const companyMemberships = await sudo.query.CompanyMembership.findMany!({ where: { user: { id: { equals: locked.userId } }, company: { id: { equals: locked.companyId } } }, take: 2, query: "id status role { id company { id } }" }) as InvitedCompanyMembership[];
    const companyMembership = companyMemberships[0];
    if (!user || membership?.status !== "invited" || membership.user?.id !== locked.userId ||
        membership.project?.id !== locked.projectId || locked.projectId !== parent.project || locked.companyId !== parent.company ||
        membership.project?.company?.id !== locked.companyId || membership.project.company.status !== "active" ||
        !membership.role?.id || membership.role.company?.id !== locked.companyId ||
        companyMemberships.length !== 1 || !companyMembership || !["active", "invited"].includes(String(companyMembership.status)) ||
        companyMembership.role?.company?.id !== locked.companyId ||
        (membership.portalType !== "internal" && (!membership.portalOrganization?.id || membership.portalOrganization.company?.id !== locked.companyId))) {
      throw new Error("Invitation grant is no longer eligible; request a new invitation");
    }
    if (locked.accountSetupRequired && (user.isActive || !user.neverSignedIn)) throw new Error("An invitation cannot replace an existing account credential");
    if (!locked.accountSetupRequired) {
      if (!user.isActive || !context.session?.authSessionId) throw new Error("A current invited account session is required");
      const sessions = await tx.prisma.$queryRawUnsafe<Array<{ id: string }>>('SELECT id FROM "AuthSession" WHERE id = $1 AND "user" = $2 AND "revokedAt" IS NULL AND "expiresAt" > CURRENT_TIMESTAMP FOR SHARE', context.session.authSessionId, locked.userId);
      if (sessions.length !== 1) throw new Error("A current invited account session is required");
    }
    const acceptanceMode = resolveInvitationAcceptanceMode({
      accountSetupRequired: locked.accountSetupRequired,
      sessionAuthType: context.session?.authType,
      sessionUserId: context.session?.itemId,
      invitedUserId: locked.userId,
      password,
    });
    if (acceptanceMode === "activate-new-account") {
      await requireUpdate(sudo, "User")({ where: { id: locked.userId }, data: {
        password,
        isActive: true,
        onboardingStatus: "in_progress",
        ...(input.name?.trim() ? { name: input.name.trim() } : {}),
      } });
    }
    if (companyMembership.status === "invited") await requireUpdate(sudo, "CompanyMembership")({ where: { id: String(companyMembership.id) }, data: {
      status: "active", joinedAt: new Date(),
    } });
    await requireUpdate(sudo, "ProjectMembership")({ where: { id: locked.membershipId }, data: {
      status: "active", joinedAt: new Date(),
    } });
    await requireUpdate(sudo, "AccountInvitation")({ where: { id: locked.id }, data: {
      status: "accepted", acceptedAt: new Date(),
    } });
    const action = await requireCreate(sudo, "AgentAction")({ data: {
      actionKey: randomUUID(), actorType: "human", action: "acceptProjectInvitation", status: "succeeded",
      targetType: "ProjectMembership", targetId: locked.membershipId, targetStatus: "active",
      reason: "Accept project invitation and activate the invited account",
      requestDigest: tokenHash,
      requestedAt: new Date(), startedAt: new Date(), completedAt: new Date(),
      company: { connect: { id: locked.companyId } }, project: { connect: { id: locked.projectId } },
      requestedBy: { connect: { id: locked.userId } }, actorUser: { connect: { id: locked.userId } },
    } });
    const payload = JSON.stringify({ schemaVersion: 1, invitationId: locked.id, userId: locked.userId, membershipId: locked.membershipId });
    await requireCreate(sudo, "OutboxMessage")({ data: {
      messageKey: `acceptProjectInvitation:${locked.id}`,
      eventType: "AccountInvitation.accepted", aggregateType: "AccountInvitation", aggregateId: locked.id,
      canonicalPayload: payload, payloadDigest: createHash("sha256").update(payload).digest("hex"), status: "pending",
      company: { connect: { id: locked.companyId } }, project: { connect: { id: locked.projectId } },
      agentAction: { connect: { id: action.id } },
    } });
    return { success: true, userId: locked.userId, projectId: locked.projectId, portalType: String(membership.portalType) };
  }, { timeout: 30_000 });
  // The expiry transition must commit; throwing inside the transaction erases it.
  if ("expired" in outcome) throw new Error("Invitation has expired");
  return outcome;
}
