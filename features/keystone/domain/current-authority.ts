import { hasCompanyPermission, hasProjectPermission, hasPermission, type Session } from "../access";
import type { Permission } from "../models/fields";
import { permissionsList } from "../models/fields";
import { activeApiSessionFromRecord, type ApiCredentialRecord } from "./session-strategy";
import type { KeystoneQueryApi } from "./tenancy";

type AuthorityContext = {
  session?: Session;
  prisma?: { user?: unknown; $queryRawUnsafe?<T = unknown>(sql: string, ...values: unknown[]): Promise<T> };
  sudo(): { query: Record<string, KeystoneQueryApi> };
};

/** Distinguish the real generated Prisma port from explicitly injected unit ports.
 * This is a server Context capability, never caller input or an environment flag.
 * Native acceptance tests must use the generated client, not the injected port.
 */
export function hasNativeAuthorityPort(context: AuthorityContext): boolean {
  return Boolean(context.prisma?.user && context.prisma.$queryRawUnsafe);
}

/** First-company setup has no tenant yet. Serialize per actor and re-read the
 * stored human session and global role under locks before replay or creation. */
export async function lockInitialOnboardingAuthority(context: AuthorityContext): Promise<void> {
  const actor = context.session;
  const sql = context.prisma?.$queryRawUnsafe?.bind(context.prisma);
  if (!actor?.itemId || actor.authType === "api_key" || !actor.authSessionId || !sql) throw new Error("A live user session is required for first-company onboarding");
  await sql("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))::text AS held", "onboard:" + actor.itemId);
  const rows = await sql<Array<{ id: string }>>(`SELECT u.id FROM "User" u JOIN "AuthSession" s ON s."user" = u.id
    WHERE u.id = $1 AND s.id = $2 AND u."isActive" = true AND s."revokedAt" IS NULL AND s."expiresAt" > CURRENT_TIMESTAMP
    FOR SHARE OF u, s`, actor.itemId, actor.authSessionId);
  if (rows.length !== 1) throw new Error("A live user session is required for first-company onboarding");
  await sql('SELECT id FROM "Role" WHERE id = (SELECT role FROM "User" WHERE id = $1) FOR SHARE', actor.itemId);
  const user = await context.sudo().query.User.findOne!({ where: { id: actor.itemId }, query: `id isActive role { id name ${permissionsList.join(" ")} }` });
  const fresh = { ...actor, data: { ...actor.data, role: user?.role, companyMemberships: [], projectMemberships: [] } } as Session;
  if (!user?.isActive || !hasPermission(fresh, "canManageOnboarding") || !hasPermission(fresh, "canManageCompanies")) throw new Error("Only the initial platform administrator can onboard a company");
}

/** Serialize project commands and lock all current authority rows through commit.
 * Adapted from Construction's resourceAuthority rehydration + C19/C25. Locks
 * participate with generic Keystone/Prisma UPDATE/DELETE revocations too.
 */
export type AssignedOwnerApprovalAuthority = { kind: "assigned-owner-approval"; requestId: string };

export async function lockCurrentAuthority(context: AuthorityContext, companyId: string, projectId: string | null, permission: Permission | readonly Permission[] | AssignedOwnerApprovalAuthority, externalOrganizationId?: string): Promise<Session> {
  const original = context.session;
  const sql = context.prisma?.$queryRawUnsafe?.bind(context.prisma);
  if (!original?.itemId || !sql) throw new Error("Current transactional authority is unavailable");
  const actorId = original.itemId;
  if (projectId) {
    const projects = await sql<Array<{ id: string }>>('SELECT id FROM "Project" WHERE id = $1 AND company = $2 FOR UPDATE', projectId, companyId);
    if (projects.length !== 1) throw new Error("Project is not available in this company");
    await sql('SELECT id FROM "Company" WHERE id = $1 FOR SHARE', companyId);
  } else await sql('SELECT id FROM "Company" WHERE id = $1 FOR UPDATE', companyId);
  await sql('SELECT id FROM "User" WHERE id = $1 FOR SHARE', actorId);
  if (original.authType === "api_key") {
    await sql('SELECT id FROM "ApiCredential" WHERE id = $1 FOR SHARE', original.apiCredential?.id || "");
  } else {
    if (!original.authSessionId) throw new Error("A current stored human session is required");
    const sessions = await sql<Array<{ id: string }>>('SELECT id FROM "AuthSession" WHERE id = $1 AND "user" = $2 AND "revokedAt" IS NULL AND "expiresAt" > CURRENT_TIMESTAMP FOR SHARE', original.authSessionId, actorId);
    if (sessions.length !== 1) throw new Error("A current stored human session is required");
  }
  await sql('SELECT id FROM "CompanyMembership" WHERE company = $1 AND "user" = $2 ORDER BY id FOR SHARE', companyId, actorId);
  if (projectId) await sql('SELECT id FROM "ProjectMembership" WHERE project = $1 AND "user" = $2 ORDER BY id FOR SHARE', projectId, actorId);
  await sql(`SELECT r.id FROM "Role" r WHERE r.id IN (
    SELECT role FROM "User" WHERE id = $1 UNION SELECT role FROM "CompanyMembership" WHERE company = $2 AND "user" = $1
    UNION SELECT role FROM "ProjectMembership" WHERE project = $3 AND "user" = $1
  ) ORDER BY r.id FOR SHARE`, actorId, companyId, projectId || "");
  const query = context.sudo().query;
  const roleFields = `id name ${permissionsList.join(" ")}`;
  const [user, company, companyMemberships, projectMemberships] = await Promise.all([
    query.User.findOne!({ where: { id: actorId }, query: `id isActive role { ${roleFields} }` }),
    query.Company.findOne!({ where: { id: companyId }, query: "id status" }),
    query.CompanyMembership.findMany!({ where: { user: { id: { equals: actorId } }, company: { id: { equals: companyId } }, status: { equals: "active" } }, take: 2, query: `id status canAccessAllProjects company { id } role { ${roleFields} }` }),
    projectId ? query.ProjectMembership.findMany!({ where: { user: { id: { equals: actorId } }, project: { id: { equals: projectId } }, status: { equals: "active" } }, take: 2, query: `id status portalType accessLevel portalOrganization { id } project { id company { id } } role { ${roleFields} }` }) : [],
  ]);
  if (!user || user.id !== actorId || user.isActive !== true || company?.status !== "active") throw new Error("Not authorized for this current company");
  let principal = original;
  if (original.authType === "api_key") {
    const record = await query.ApiCredential.findOne!({ where: { id: original.apiCredential?.id || "" }, query: "id status scopes expiresAt revokedAt owner { id isActive } company { id } project { id company { id } }" });
    const active = activeApiSessionFromRecord(record as ApiCredentialRecord | null);
    if (!active || active.itemId !== actorId) throw new Error("Credential is no longer authorized");
    principal = { ...original, ...active };
  }
  const fresh = { ...principal, data: { ...original.data, isActive: true, role: user.role, companyMemberships, projectMemberships } } as Session;
  const explicit = fresh.data.projectMemberships?.[0];
  const companyGrant = fresh.data.companyMemberships?.[0];
  if (typeof permission === "object" && "kind" in permission) {
    // This is authority for ONE assigned decision, not permission to manage the
    // underlying financial record. No role flags are synthesized or granted.
    if (fresh.authType !== "session" || !projectId || !explicit || explicit.portalType !== "owner" ||
        explicit.accessLevel === "viewer" || !explicit.portalOrganization?.id || explicit.portalOrganization.id !== externalOrganizationId) {
      throw new Error("Not authorized for this assigned owner approval");
    }
    const assignment = await sql<Array<{ id: string }>>(`SELECT request.id FROM "ApprovalRequest" request
      JOIN "ProjectMembership" membership ON membership.id = request."assignedTo"
      WHERE request.id = $1 AND request.company = $2 AND request.project = $3 AND request.status = 'pending'
        AND request."requestedBy" <> $4 AND membership."user" = $4 AND membership.project = $3
        AND membership.status = 'active' AND membership."portalType" = 'owner' AND membership."accessLevel" <> 'viewer'
        AND membership."portalOrganization" = $5 FOR UPDATE OF request`, permission.requestId, companyId, projectId, actorId, externalOrganizationId);
    if (assignment.length !== 1) throw new Error("Not authorized for this assigned owner approval");
    return fresh;
  }
  const required = typeof permission === "string" ? [permission] : permission;
  if (!required.length) throw new Error("An explicit operation permission is required");
  if (projectId) {
    if (explicit) {
      if (explicit.accessLevel === "viewer" || (explicit.portalType !== "internal" && (!externalOrganizationId || explicit.portalOrganization?.id !== externalOrganizationId))) throw new Error("Not authorized for this current project");
    } else if (!companyGrant?.canAccessAllProjects) throw new Error("Not authorized for this current project");
    if (!required.every(capability => hasProjectPermission(fresh, companyId, projectId, capability, true))) throw new Error("Not authorized for this current project operation");
  } else if (!companyGrant || !required.every(capability => hasCompanyPermission(fresh, companyId, capability))) throw new Error("Not authorized for this current company operation");
  return fresh;
}
