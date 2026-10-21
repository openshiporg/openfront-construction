import { hasProjectPermission, type Session } from "../access";
import { activeApiSessionFromRecord, type ApiCredentialRecord } from "./session-strategy";
import { scopeAllows } from "./scopes";
import type { CommandContext } from "../mutations/construction";

type ResourceUser = { id: string; isActive: boolean; role?: Session["data"]["role"] };

export { resourceEvents, validateResourceFact } from "./resource-fact";

// Additional live filter for ordinary and nested generated ResourceLog reads.
export async function resourceReadFilter(context: CommandContext) {
  const session = context.session;
  if (!session?.itemId) return false;
  const query = context.sudo().query;
  const user = await query.User.findOne!({ where: { id: session.itemId }, query: "id isActive role { canReadFieldOperations canManageFieldOperations }" }) as ResourceUser | null;
  if (user?.isActive !== true || user.id !== session.itemId) return false;
  if (session.authType === "api_key") {
    const credential = await query.ApiCredential.findOne!({ where: { id: session.apiCredential?.id ?? "" }, query: "id status scopes expiresAt revokedAt owner { id isActive } company { id } project { id company { id } }" });
    const active = activeApiSessionFromRecord(credential as ApiCredentialRecord | null);
    if (!active || active.itemId !== session.itemId || active.apiCredential?.companyId !== session.apiCredential?.companyId || active.apiCredential?.projectId !== session.apiCredential?.projectId) return false;
    // Intersect live credential scope with the live membership predicates below.
    if (!active.apiCredential?.scopes.some(scope => scopeAllows(scope, "field:read") || scopeAllows(scope, "field:write"))) return false;
  }
  const role = { OR: [{ canReadFieldOperations: { equals: true } }, { canManageFieldOperations: { equals: true } }] };
  const grant = user.role?.canReadFieldOperations || user.role?.canManageFieldOperations ? { OR: [{ role }, { role: null }] } : { role };
  const member = { user: { id: { equals: session.itemId } }, status: { equals: "active" } };
  return { OR: [
    { project: { memberships: { some: { ...member, portalType: { equals: "internal" }, ...grant } } } },
    { project: { memberships: { none: member }, company: { memberships: { some: { ...member, canAccessAllProjects: { equals: true }, ...grant } } } } },
  ] };
}

// Re-read bounded, exact identity/grants before execute AND every replay path.
// sudo is used only to establish authority; evidence is read through session-aware Lists.
export async function resourceAuthority(context: CommandContext, projectId: string, write = false) {
  const session = context.session;
  if (!session?.itemId) throw new Error("Resource activity not found for this project role");
  const query = context.sudo().query;
  const project = await query.Project.findOne!({ where: { id: projectId }, query: "id currencyCode company { id }" });
  const companyId = project?.company?.id as string | undefined;
  const user = await query.User.findOne!({ where: { id: session.itemId }, query: "id isActive role { id name canReadFieldOperations canManageFieldOperations canReadAudit }" }) as ResourceUser | null;
  if (!project?.id || !companyId || user?.isActive !== true || user.id !== session.itemId) throw new Error("Resource activity not found for this project role");
  const [membership] = await query.ProjectMembership.findMany!({
    where: { user: { id: { equals: session.itemId } }, project: { id: { equals: projectId } }, status: { equals: "active" } },
    take: 1, query: "id status portalType accessLevel role { id name canReadFieldOperations canManageFieldOperations canReadAudit }",
  });
  const [companyMembership] = membership ? [] : await query.CompanyMembership.findMany!({
    where: { user: { id: { equals: session.itemId } }, company: { id: { equals: companyId } }, status: { equals: "active" }, canAccessAllProjects: { equals: true } },
    take: 1, query: "id status canAccessAllProjects role { id name canReadFieldOperations canManageFieldOperations canReadAudit }",
  });
  if ((membership && (membership.portalType !== "internal" || (write && !["contributor", "manager"].includes(String(membership.accessLevel))))) || (!membership && !companyMembership)) {
    throw new Error("Resource activity not found for this project role");
  }
  let principal = session;
  if (session.authType === "api_key") {
    const credential = await query.ApiCredential.findOne!({ where: { id: session.apiCredential?.id ?? "" }, query: "id status scopes expiresAt revokedAt owner { id isActive } company { id } project { id company { id } }" });
    const active = activeApiSessionFromRecord(credential as ApiCredentialRecord | null);
    if (!active || active.itemId !== session.itemId) throw new Error("Resource activity not found for this project role");
    principal = { ...session, ...active };
  }
  const fresh = {
    ...principal,
    data: {
      isActive: true, role: user.role,
      projectMemberships: membership ? [{ ...membership, project: { id: projectId, company: { id: companyId } } }] : [],
      companyMemberships: companyMembership ? [{ ...companyMembership, company: { id: companyId } }] : [],
    },
  } as Session;
  const allowed = write ? hasProjectPermission(fresh, companyId, projectId, "canManageFieldOperations", true)
    : hasProjectPermission(fresh, companyId, projectId, "canReadFieldOperations") || hasProjectPermission(fresh, companyId, projectId, "canManageFieldOperations");
  if (!allowed) throw new Error("Resource activity not found for this project role");
  return { companyId, currencyCode: String(project.currencyCode ?? "USD"), session: fresh };
}
