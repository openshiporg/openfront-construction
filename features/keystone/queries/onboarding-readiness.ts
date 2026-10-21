import { hasCompanyPermission, type Session } from "../access";
import { companyReadiness, projectReadiness, type ReadinessCheck } from "../domain/onboarding-seed";
import type { KeystoneQueryApi } from "../domain/tenancy";

type ReadinessContext = {
  session?: Session;
  sudo(): { query: Record<string, KeystoneQueryApi> };
};

export type ConstructionOnboardingReadiness = {
  canStartFirstCompany: boolean;
  sampleWorkspaceAvailable: boolean;
  projectOnly: boolean;
  companies: Array<{
    companyId: string;
    name: string;
    checks: ReadinessCheck[];
    projects: Array<{ projectId: string; name: string; checks: ReadinessCheck[] }>;
  }>;
};

const MAX_READINESS_COMPANIES = 10;
const MAX_READINESS_PROJECTS = 10;
const setupPermissions = ["canManageOnboarding", "canManageSettings", "canManageCompanies"] as const;

/** Actor-scoped readiness from stored memberships and persisted setup rows.
 * Only companies where the actor can manage setup are reported. */
export async function constructionOnboardingReadiness(
  _root: unknown,
  _args: unknown,
  context: ReadinessContext,
): Promise<ConstructionOnboardingReadiness> {
  const session = context.session;
  if (!session?.itemId || session.authType === "api_key") throw new Error("Sign in to continue");
  const actorId = session.itemId;
  const query = context.sudo().query;
  const findMany = (listKey: string) => {
    const api = query[listKey]?.findMany;
    if (!api) throw new Error(`${listKey} query is unavailable`);
    return api;
  };
  const [companyMemberships, projectMembershipCount] = await Promise.all([
    findMany("CompanyMembership")({
      where: { user: { id: { equals: actorId } }, status: { equals: "active" } },
      take: MAX_READINESS_COMPANIES, orderBy: { createdAt: "asc" }, query: "company { id name status }",
    }),
    query.ProjectMembership?.count?.({ where: { user: { id: { equals: actorId } }, status: { equals: "active" } } }) ?? Promise.resolve(0),
  ]);
  // First-company setup follows the mutation's own admission: the initial
  // platform administrator's global role, with no stored membership yet.
  const globalRole = session.data.role;
  const canStartFirstCompany = companyMemberships.length === 0 && projectMembershipCount === 0 &&
    globalRole?.canManageOnboarding === true && globalRole?.canManageCompanies === true;

  const companies: ConstructionOnboardingReadiness["companies"] = [];
  for (const membership of companyMemberships) {
    const company = membership.company as { id?: string; name?: string; status?: string } | null;
    if (!company?.id || company.status !== "active") continue;
    if (!setupPermissions.some(permission => hasCompanyPermission(session, company.id!, permission))) continue;
    const projects = await findMany("Project")({
      where: { company: { id: { equals: company.id } }, status: { notIn: ["completed", "archived"] } },
      take: MAX_READINESS_PROJECTS, orderBy: { createdAt: "asc" }, query: "id name",
    });
    const firstProjectId = projects[0]?.id ?? null;
    companies.push({
      companyId: company.id,
      name: String(company.name ?? ""),
      checks: await companyReadiness(query, { companyId: company.id, actorId, firstProjectId }),
      projects: await Promise.all(projects.map(async project => ({
        projectId: String(project.id),
        name: String(project.name ?? ""),
        checks: await projectReadiness(query, { projectId: String(project.id) }),
      }))),
    });
  }
  return {
    canStartFirstCompany,
    // Like E-commerce's full store template, the sample workspace is offered to
    // every first-company setup; its records are drafts flagged as fictional.
    sampleWorkspaceAvailable: canStartFirstCompany,
    projectOnly: companyMemberships.length === 0 && projectMembershipCount > 0,
    companies,
  };
}
