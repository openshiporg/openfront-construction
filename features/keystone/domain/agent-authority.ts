import { hasProjectPermission, type Session } from "../access";
import type { Permission } from "../models/fields";
import { scopeAllows, scopeGrantMatches } from "./scopes";

/** Identity ownership narrows selection; it never replaces current principal scope. */
export function assertAgentPrincipal(session: Session, companyId: string, projectId: string, permission: Permission, identityOwnerId: string) {
  if (!hasProjectPermission(session, companyId, projectId, permission, true)) throw new Error("Not authorized for this agent action domain and project");
  if (session.authType === "api_key" && !session.apiCredential?.scopes.some(scope => scopeAllows(scope, "agents:execute"))) throw new Error("An explicit agents:execute credential scope is required");
  if (identityOwnerId !== session.itemId && !hasProjectPermission(session, companyId, projectId, "canManageAgents", true)) throw new Error("Not authorized for this agent identity");
}

type SqlPort = { $queryRawUnsafe?<T>(query: string, ...values: unknown[]): Promise<T> };
export type AgentLockContext = { prisma?: SqlPort };
export type AgentActionDescriptor = {
  id: string; status: string; action: string; targetType: string; targetId: string; targetStatus: string;
  requiredScope: string; companyId: string; projectId: string | null;
  identityId: string | null; grantId: string | null; requestedById: string | null; reviewedById: string | null;
};
type Identity = { id: string; ownerId: string; companyId: string; status: string; approvalMode: string };
type Grant = { id: string; identityId: string; companyId: string; projectId: string | null; status: string; scope: string; expiresAt: Date | null };
function sqlPort(context: AgentLockContext) {
  const sql = context.prisma?.$queryRawUnsafe?.bind(context.prisma);
  if (!sql) throw new Error("Transactional agent authority locking is unavailable");
  return sql;
}

/** Parent/current-principal locks precede these locks. Shared grant/identity locks
 * participate with ordinary admin revocation UPDATEs until the domain commits. */
export async function lockAgentIdentityGrant(context: AgentLockContext, input: {
  identityId: string; grantId: string; companyId: string; projectId: string; requiredScope: string;
}, mode: "active" | "restrict" = "active") {
  const sql = sqlPort(context);
  const [discovered] = await sql<Identity[]>('SELECT id, owner AS "ownerId", company AS "companyId", status::text, "approvalMode"::text FROM "AgentIdentity" WHERE id = $1', input.identityId);
  if (!discovered || (mode === "active" && !discovered.ownerId) || discovered.companyId !== input.companyId) throw new Error("Agent identity is unavailable for this company");
  await sql('SELECT id FROM "User" WHERE id = $1 FOR SHARE', discovered.ownerId);
  const companyMemberships = await sql<Array<{ id: string; status: string }>>('SELECT id, status::text FROM "CompanyMembership" WHERE "user" = $1 AND company = $2 AND status = \'active\' ORDER BY id LIMIT 1 FOR SHARE', discovered.ownerId, input.companyId);
  const projectMemberships = companyMemberships.length ? [] : await sql<Array<{ id: string; status: string }>>('SELECT membership.id, membership.status::text FROM "ProjectMembership" membership JOIN "Project" project ON project.id = membership.project WHERE membership."user" = $1 AND project.company = $2 AND membership.status = \'active\' ORDER BY membership.id LIMIT 1 FOR SHARE OF membership', discovered.ownerId, input.companyId);
  const [identity] = await sql<Identity[]>('SELECT id, owner AS "ownerId", company AS "companyId", status::text, "approvalMode"::text FROM "AgentIdentity" WHERE id = $1 FOR SHARE', input.identityId);
  if (!identity || identity.ownerId !== discovered.ownerId || identity.companyId !== input.companyId || (mode === "active" && identity.status !== "active")) throw new Error("Agent identity is inactive or changed");
  const [owner] = await sql<Array<{ id: string }>>('SELECT id FROM "User" WHERE id = $1 AND "isActive" = true', identity.ownerId);
  // Use only affiliations actually locked above, not a newly appearing phantom.
  if (mode === "active" && (!owner || ![...companyMemberships, ...projectMemberships].some(member => member.status === "active"))) throw new Error("Agent owner is no longer active in this company");
  const [grant] = await sql<Grant[]>('SELECT id, "agentIdentity" AS "identityId", company AS "companyId", project AS "projectId", status::text, scope, "expiresAt" FROM "ScopeGrant" WHERE id = $1 FOR SHARE', input.grantId);
  if (!grant || grant.identityId !== identity.id || grant.companyId !== input.companyId || (mode === "active" && !scopeGrantMatches(grant, input))) throw new Error("Agent scope is inactive, expired, revoked or out of scope");
  return { identity, grant };
}

export async function selectAndLockAgentGrant(context: AgentLockContext, input: { identityId: string; companyId: string; projectId: string; requiredScope: string }) {
  const broader = input.requiredScope.endsWith(":read") ? input.requiredScope.replace(/:read$/, ":write") : input.requiredScope;
  const [candidate] = await sqlPort(context)<Array<{ id: string }>>(`SELECT id FROM "ScopeGrant"
    WHERE "agentIdentity" = $1 AND company = $2 AND (project IS NULL OR project = $3)
      AND status = 'active' AND scope IN ($4, $5) AND ("expiresAt" IS NULL OR "expiresAt" > CURRENT_TIMESTAMP)
    ORDER BY (project IS NOT NULL) DESC, id ASC LIMIT 1`, input.identityId, input.companyId, input.projectId, input.requiredScope, broader);
  if (!candidate) throw new Error("Agent identity lacks an active scope grant for this action");
  return lockAgentIdentityGrant(context, { ...input, grantId: candidate.id });
}

export async function discoverAgentAction(context: AgentLockContext, actionId: string) {
  const [action] = await sqlPort(context)<AgentActionDescriptor[]>(`SELECT id, status::text, action, "targetType", "targetId", "targetStatus", "requiredScope",
    company AS "companyId", project AS "projectId", "agentIdentity" AS "identityId", "scopeGrant" AS "grantId", "requestedBy" AS "requestedById", "reviewedBy" AS "reviewedById"
    FROM "AgentAction" WHERE id = $1`, actionId);
  if (!action) throw new Error("Agent action not found");
  return action;
}

export async function lockAgentActionChain(context: AgentLockContext, expected: AgentActionDescriptor, requiredScope: string, mode: "active" | "restrict" = "active") {
  if (!expected.identityId || !expected.grantId || !expected.projectId) throw new Error("Agent action identity, grant and project are required");
  const chain = await lockAgentIdentityGrant(context, { identityId: expected.identityId, grantId: expected.grantId, companyId: expected.companyId, projectId: expected.projectId, requiredScope }, mode);
  const sql = sqlPort(context);
  await sql('SELECT id FROM "AgentAction" WHERE id = $1 FOR UPDATE', expected.id);
  const current = await discoverAgentAction(context, expected.id);
  if (current.identityId !== expected.identityId || current.grantId !== expected.grantId || current.companyId !== expected.companyId || current.projectId !== expected.projectId || current.action !== expected.action || current.targetType !== expected.targetType || current.targetId !== expected.targetId || current.targetStatus !== expected.targetStatus || current.requiredScope !== expected.requiredScope) {
    throw new Error("Agent action binding changed; reload for review");
  }
  return { ...chain, action: current };
}

export async function compareAndSetAgentAction(context: AgentLockContext, id: string, from: "proposed" | "approved" | "running", to: "approved" | "rejected" | "running" | "succeeded" | "failed") {
  const rows = await sqlPort(context)<Array<{ id: string }>>('UPDATE "AgentAction" SET status = $3::"AgentActionStatusType" WHERE id = $1 AND status::text = $2 RETURNING id', id, from, to);
  if (rows.length !== 1) throw new Error("Agent action state changed; no outcome was overwritten");
}
