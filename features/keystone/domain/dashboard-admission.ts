import { permissionsList } from "../models/fields";

/**
 * The shared dashboard middleware (identical across the family) admits a user
 * only through `User.role.canAccessDashboard`. Construction grants authority
 * through company/project memberships, so an internal member whose membership
 * role allows the dashboard is given one platform-wide, company-less role that
 * carries ONLY dashboard admission. It confers no data permission: every list
 * still scopes reads and writes through the member's own memberships.
 * The role is removed again once no qualifying membership remains.
 */
export const DASHBOARD_ADMISSION_ROLE_NAME = "Dashboard access";

type RoleRecord = Record<string, unknown> & { id?: string };

type AdmissionQueryApi = {
  findOne(args: { where: Record<string, unknown>; query: string }): Promise<RoleRecord | null>;
  findMany(args: { where: Record<string, unknown>; take?: number; orderBy?: Record<string, "asc" | "desc">; query: string }): Promise<readonly RoleRecord[]>;
  createOne(args: { data: Record<string, unknown>; query?: string }): Promise<RoleRecord>;
  updateOne(args: { where: { id: string }; data: Record<string, unknown>; query?: string }): Promise<RoleRecord>;
};

export type DashboardAdmissionContext = {
  sudo(): { query: Record<string, unknown> };
};

const otherPermissions = permissionsList.filter(permission => permission !== "canAccessDashboard");

export function isDashboardAdmissionRole(role: RoleRecord | null | undefined): boolean {
  return Boolean(role?.id) && role?.canAccessDashboard === true &&
    otherPermissions.every(permission => role[permission] !== true);
}

const admissionRoleWhere = {
  canAccessDashboard: { equals: true },
  ...Object.fromEntries(otherPermissions.map(permission => [permission, { equals: false }])),
  // Company-less: never counted or managed as a company's role.
  company: null,
};

async function hasQualifyingMembership(query: Record<string, AdmissionQueryApi>, userId: string): Promise<boolean> {
  const user = { user: { id: { equals: userId } }, status: { equals: "active" }, role: { canAccessDashboard: { equals: true } } };
  const [projectMemberships, companyMemberships] = await Promise.all([
    query.ProjectMembership.findMany({ where: { ...user, portalType: { equals: "internal" } }, take: 1, query: "id" }),
    query.CompanyMembership.findMany({ where: { ...user, canAccessAllProjects: { equals: true } }, take: 1, query: "id" }),
  ]);
  return projectMemberships.length > 0 || companyMemberships.length > 0;
}

/** Reconciles dashboard admission after a membership changes. Never replaces or
 * removes a real platform role; only manages the admission-only role. */
export async function syncDashboardAdmission(context: DashboardAdmissionContext, userId: string | null | undefined): Promise<void> {
  if (!userId) return;
  const query = context.sudo().query as Record<string, AdmissionQueryApi>;
  const user = await query.User.findOne({
    where: { id: userId },
    query: `id isActive role { id ${permissionsList.join(" ")} }`,
  });
  if (!user?.id) return;
  const currentRole = user.role as RoleRecord | null | undefined;
  if (currentRole?.id && !isDashboardAdmissionRole(currentRole)) return;
  const qualifies = user.isActive === true && await hasQualifyingMembership(query, userId);
  if (qualifies && !currentRole?.id) {
    const [existing] = await query.Role.findMany({ where: admissionRoleWhere, take: 1, orderBy: { id: "asc" }, query: "id" });
    const roleId = existing?.id ?? (await query.Role.createOne({
      data: { name: DASHBOARD_ADMISSION_ROLE_NAME, canAccessDashboard: true },
      query: "id",
    })).id;
    if (!roleId) throw new Error("Dashboard access could not be granted");
    await query.User.updateOne({ where: { id: userId }, data: { role: { connect: { id: roleId } } }, query: "id" });
  } else if (!qualifies && currentRole?.id) {
    await query.User.updateOne({ where: { id: userId }, data: { role: { disconnect: true } }, query: "id" });
  }
}
