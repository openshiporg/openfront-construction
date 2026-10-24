import { scopeAllows, type ConstructionScope } from "./domain/scopes";
import type { Permission } from "./models/fields";
import { permissionsList } from "./models/fields";
import {
  canAccessCompanyById,
  canAccessProjectById,
  companyAccessFilter,
  getConnectedId,
  projectAccessFilter,
  projectRecordAccessFilter,
  queryById,
  writableProjectAccessFilter,
  writableProjectRecordAccessFilter,
  type KeystoneContextLike,
  type TenancySession,
} from "./domain/tenancy";

export type Session = TenancySession & {
  authType?: "session" | "api_key";
  authSessionId?: string;
  apiCredential?: {
    id: string;
    companyId: string;
    projectId: string | null;
    scopes: ConstructionScope[];
  };
  data: TenancySession["data"] & {
    name?: string;
    email?: string;
    isActive?: boolean;
    role?: ({ id: string; name: string } & Partial<Record<Permission, boolean>>) | null;
  };
};

const apiPermissionScopes: Partial<Record<Permission, ConstructionScope>> = {
  canReadCompanies: "companies:read",
  canManageCompanies: "companies:write",
  canReadProjects: "projects:read",
  canManageProjects: "projects:write",
  canReadPreconstruction: "preconstruction:read",
  canManagePreconstruction: "preconstruction:write",
  canReadFinancials: "financials:read",
  canManageFinancials: "financials:write",
  canReadContracts: "contracts:read",
  canManageContracts: "contracts:write",
  canReadProjectExecution: "execution:read",
  canManageProjectExecution: "execution:write",
  canReadDocuments: "documents:read",
  canManageDocuments: "documents:write",
  canReadFieldOperations: "field:read",
  canManageFieldOperations: "field:write",
  canReadSafety: "safety:read",
  canManageSafety: "safety:write",
  canReadBilling: "billing:read",
  canManageBilling: "billing:write",
  canReadAgents: "agents:read",
  canManageAgents: "agents:write",
  canReadAudit: "audit:read",
};

function apiCredentialAllows(session: Session | undefined, permission: Permission): boolean {
  if (session?.authType !== "api_key") return true;
  const requiredScope = apiPermissionScopes[permission];
  return Boolean(requiredScope && session.apiCredential?.scopes.some(scope => scopeAllows(scope, requiredScope)));
}

function apiCredentialAllowsCompany(session: Session | undefined, companyId: string): boolean {
  return session?.authType !== "api_key" || session.apiCredential?.companyId === companyId;
}

function apiCredentialAllowsProject(
  session: Session | undefined,
  companyId: string,
  projectId: string,
): boolean {
  if (session?.authType !== "api_key") return true;
  return session.apiCredential?.companyId === companyId &&
    (!session.apiCredential.projectId || session.apiCredential.projectId === projectId);
}

export type AccessArgs = {
  session?: Session;
  context?: KeystoneContextLike;
  inputData?: Record<string, unknown>;
};

export function isSignedIn({ session }: AccessArgs): boolean {
  return Boolean(session?.itemId && session.data.isActive !== false);
}

export function isHumanSession({ session }: AccessArgs): boolean {
  return isSignedIn({ session }) && session?.authType !== "api_key";
}

export function hasPermission(session: Session | undefined, permission: Permission): boolean {
  if (!session || !apiCredentialAllows(session, permission)) return false;
  if (session.data.role?.[permission]) return true;
  return Boolean(
    session.data.companyMemberships?.some(membership => membership.status === "active" && membership.role?.[permission]) ||
    session.data.projectMemberships?.some(membership => membership.status === "active" && membership.role?.[permission]),
  );
}

export function hasCompanyPermission(
  session: Session | undefined,
  companyId: string,
  permission: Permission,
): boolean {
  if (!session || !apiCredentialAllows(session, permission) || !apiCredentialAllowsCompany(session, companyId)) return false;
  const membership = session.data.companyMemberships?.find(entry =>
    entry.status === "active" && entry.company?.id === companyId,
  );
  if (membership) return Boolean(membership.role?.[permission] ?? session.data.role?.[permission]);
  return Boolean(session.data.role?.[permission]);
}

export function hasProjectPermission(
  session: Session | undefined,
  companyId: string,
  projectId: string,
  permission: Permission,
  requireWrite = false,
): boolean {
  if (!session || !apiCredentialAllows(session, permission) || !apiCredentialAllowsProject(session, companyId, projectId)) return false;
  const explicit = session.data.projectMemberships?.find(membership =>
    membership.status === "active" &&
    membership.project?.id === projectId &&
    membership.project.company?.id === companyId,
  );
  if (explicit) {
    if (requireWrite && explicit.accessLevel === "viewer") return false;
    return Boolean(explicit.role?.[permission]);
  }
  const companyMembership = session.data.companyMemberships?.find(membership =>
    membership.status === "active" && membership.canAccessAllProjects && membership.company?.id === companyId,
  );
  return Boolean(companyMembership?.role?.[permission]);
}

export const permissions = Object.fromEntries(
  permissionsList.map(permission => [
    permission,
    ({ session }: AccessArgs) => hasPermission(session, permission),
  ]),
) as Record<Permission, (args: AccessArgs) => boolean>;

function canRead(read: Permission, manage: Permission) {
  return ({ session }: AccessArgs) => hasPermission(session, read) || hasPermission(session, manage);
}

function permissionedCompanyWriteFilter(session: Session | undefined, permission: Permission) {
  const readable = companyAccessFilter(session);
  if (!session || readable === false) return false;
  if (session.data.role?.[permission]) return readable;
  return {
    AND: [
      readable,
      {
        memberships: {
          some: {
            user: { id: { equals: session.itemId } },
            status: { equals: "active" },
            role: { [permission]: { equals: true } },
          },
        },
      },
    ],
  };
}

function permissionedCompanyRecordWriteFilter(session: Session | undefined, permission: Permission) {
  const readable = companyRecordFilter(session);
  if (!session || readable === false) return false;
  if (session.data.role?.[permission]) return readable;
  return {
    AND: [
      readable,
      {
        company: {
          memberships: {
            some: {
              user: { id: { equals: session.itemId } },
              status: { equals: "active" },
              role: { [permission]: { equals: true } },
            },
          },
        },
      },
    ],
  };
}

/** Explicit active project grants take precedence, including denied permissions.
 * Ambient/global roles never fill in a narrower project's missing capability. */
function projectPermissionPredicate(session: Session, required: Permission[], write: boolean, internalOnly: boolean) {
  const allowed = required.filter(permission => apiCredentialAllows(session, permission));
  if (!allowed.length) return false;
  const actor = { user: { id: { equals: session.itemId } }, status: { equals: "active" } };
  const role = { OR: allowed.map(permission => ({ [permission]: { equals: true } })) };
  return { OR: [
    { memberships: { some: { ...actor, role,
      ...(internalOnly ? { portalType: { equals: "internal" } } : {}),
      ...(write ? { accessLevel: { in: ["contributor", "manager"] } } : {}),
    } } },
    { AND: [
      { memberships: { none: actor } },
      { company: { memberships: { some: { ...actor, canAccessAllProjects: { equals: true }, role } } } },
    ] },
  ] };
}

function permissionedProjectRecordWriteFilter(session: Session | undefined, permission: Permission) {
  const writable = writableProjectRecordAccessFilter(session);
  if (!session || writable === false) return false;
  const authority = projectPermissionPredicate(session, [permission], true, true);
  return authority === false ? false : { AND: [writable, { project: authority }] };
}

function permissionedProjectWriteFilter(session: Session | undefined, permission: Permission) {
  const writable = writableProjectAccessFilter(session);
  if (!session || writable === false) return false;
  const authority = projectPermissionPredicate(session, [permission], true, true);
  return authority === false ? false : { AND: [writable, authority] };
}

function rolePermissionFilter(read: Permission, manage: Permission) {
  return { OR: [{ [read]: { equals: true } }, { [manage]: { equals: true } }] };
}

export function permissionedCompanyRecordPermissionFilter(session: Session | undefined, required: Permission[]) {
  const readable = companyRecordFilter(session);
  if (!session || readable === false) return false;
  if (required.some(permission => session.data.role?.[permission])) return readable;
  return {
    AND: [readable, {
      company: { memberships: { some: {
        user: { id: { equals: session.itemId } },
        status: { equals: "active" },
        role: { OR: required.map(permission => ({ [permission]: { equals: true } })) },
      } } },
    }],
  };
}

function permissionedCompanyRecordReadFilter(session: Session | undefined, read: Permission, manage: Permission) {
  return permissionedCompanyRecordPermissionFilter(session, [read, manage]);
}

function permissionedProjectRecordReadFilter(session: Session | undefined, read: Permission, manage: Permission) {
  const readable = projectRecordAccessFilter(session);
  if (!session || readable === false) return false;
  const authority = projectPermissionPredicate(session, [read, manage], false, true);
  return authority === false ? false : { AND: [readable, { project: authority }] };
}

/** Evidence is project-owned when attached to a project; company catalogs are not.
 * In particular a project-scoped credential cannot read company-only events. */
export function projectEvidencePermissionFilter(session: Session | undefined) {
  if (!session || !apiCredentialAllows(session, "canReadAudit")) return false;
  const readable = projectRecordAccessFilter(session);
  const authority = projectPermissionPredicate(session, ["canReadAudit"], false, true);
  const projectEvents = readable !== false && authority !== false
    ? { AND: [readable, { project: authority }] } : null;
  const companyEvents = session.authType === "api_key" && session.apiCredential?.projectId
    ? false : permissionedCompanyRecordPermissionFilter(session, ["canReadAudit"]);
  return { OR: [
    ...(projectEvents ? [projectEvents] : []),
    ...(companyEvents !== false ? [{ AND: [companyEvents,
      // Keystone rejects "" as an id, so test the relationship itself for absence.
      { project: null },
    ] }] : []),
  ] };
}

function permissionedCompanyReadFilter(session: Session | undefined, read: Permission, manage: Permission) {
  const readable = companyAccessFilter(session);
  if (!session || readable === false) return false;
  if (session.data.role?.[read] || session.data.role?.[manage]) return readable;
  return { AND: [readable, { memberships: { some: {
    user: { id: { equals: session.itemId } },
    status: { equals: "active" },
    role: rolePermissionFilter(read, manage),
  } } }] };
}

function permissionedProjectReadFilter(session: Session | undefined, read: Permission, manage: Permission) {
  const readable = projectAccessFilter(session);
  if (!session || readable === false) return false;
  const authority = projectPermissionPredicate(session, [read, manage], false, false);
  return authority === false ? false : { AND: [readable, authority] };
}

const deny = () => false;

export function companyModelAccess(
  read: Permission,
  manage: Permission,
  options: { delete?: boolean } = {},
) {
  const readOperation = canRead(read, manage);
  const manageOperation = permissions[manage];
  return {
    operation: {
      query: readOperation,
      create: manageOperation,
      update: manageOperation,
      delete: options.delete === false ? deny : manageOperation,
    },
    filter: {
      query: ({ session }: AccessArgs) => permissionedCompanyRecordReadFilter(session, read, manage),
      update: ({ session }: AccessArgs) => permissionedCompanyRecordWriteFilter(session, manage),
      delete: ({ session }: AccessArgs) => permissionedCompanyRecordWriteFilter(session, manage),
    },
    item: {
      create: async ({ session, inputData, context }: AccessArgs) => {
        const companyId = getConnectedId(inputData?.company);
        if (!companyId || !session?.itemId || !context) return false;
        return hasCompanyPermission(session, companyId, manage) &&
          canAccessCompanyById(context, session.itemId, companyId, true);
      },
    },
  };
}

export function controlledCompanyModelAccess(read: Permission, manage: Permission) {
  const readOperation = canRead(read, manage);
  return {
    operation: { query: readOperation, create: deny, update: deny, delete: deny },
    filter: { query: ({ session }: AccessArgs) => permissionedCompanyRecordReadFilter(session, read, manage) },
  };
}

export function controlledProjectModelAccess(read: Permission, manage: Permission) {
  const readOperation = canRead(read, manage);
  return {
    operation: { query: readOperation, create: deny, update: deny, delete: deny },
    filter: { query: ({ session }: AccessArgs) => permissionedProjectRecordReadFilter(session, read, manage) },
  };
}

export function projectModelAccess(
  read: Permission,
  manage: Permission,
  options: { delete?: boolean } = {},
) {
  const readOperation = canRead(read, manage);
  const manageOperation = permissions[manage];
  return {
    operation: {
      query: readOperation,
      create: manageOperation,
      update: manageOperation,
      delete: options.delete === false ? deny : manageOperation,
    },
    filter: {
      query: ({ session }: AccessArgs) => permissionedProjectRecordReadFilter(session, read, manage),
      update: ({ session }: AccessArgs) => permissionedProjectRecordWriteFilter(session, manage),
      delete: ({ session }: AccessArgs) => permissionedProjectRecordWriteFilter(session, manage),
    },
    item: {
      create: async ({ session, inputData, context }: AccessArgs) => {
        const projectId = getConnectedId(inputData?.project);
        if (!projectId || !session?.itemId || !context) return false;
        const project = await queryById(context, "Project", projectId, "id company { id }");
        const companyId = project?.company?.id;
        return Boolean(companyId) && hasProjectPermission(session, String(companyId), projectId, manage, true) &&
          await canAccessProjectById(context, session.itemId, projectId, true);
      },
    },
  };
}

export function companyRecordFilter(session: Session | undefined) {
  if (!session) return false;
  const membership = {
    company: {
      memberships: {
        some: {
          user: { id: { equals: session.itemId } },
          status: { equals: "active" },
        },
      },
    },
  };
  return session.authType === "api_key"
    ? { AND: [membership, { company: { id: { equals: session.apiCredential?.companyId ?? "" } } }] }
    : membership;
}

export const rules = {
  canReadCompanies: ({ session }: AccessArgs) => permissionedCompanyReadFilter(session, "canReadCompanies", "canManageCompanies"),
  canManageCompanies: ({ session }: AccessArgs) => permissionedCompanyWriteFilter(session, "canManageCompanies"),
  canReadProjects: ({ session }: AccessArgs) => permissionedProjectReadFilter(session, "canReadProjects", "canManageProjects"),
  canManageProjects: ({ session }: AccessArgs) => permissionedProjectWriteFilter(session, "canManageProjects"),

  canReadPeople: ({ session }: AccessArgs) => {
    if (!session) return false;
    if (!hasPermission(session, "canReadPeople") && !hasPermission(session, "canManagePeople")) {
      return { id: { equals: session.itemId } };
    }
    return {
      OR: [
        { id: { equals: session.itemId } },
        {
          companyMemberships: {
            some: {
              company: {
                memberships: {
                  some: {
                    user: { id: { equals: session.itemId } },
                    status: { equals: "active" },
                    role: rolePermissionFilter("canReadPeople", "canManagePeople"),
                  },
                },
              },
            },
          },
        },
      ],
    };
  },

  canUpdatePeople: ({ session }: AccessArgs) => {
    if (!session || session.authType === "api_key") return false;
    if (session.data.role?.canManagePeople) return rules.canReadPeople({ session });
    return { id: { equals: session.itemId } };
  },

  canDeletePeople: ({ session }: AccessArgs) => {
    if (!session?.data.role?.canManagePeople) return false;
    return { AND: [rules.canReadPeople({ session }), { id: { not: { equals: session.itemId } } }] };
  },

  canManageRoles: ({ session }: AccessArgs) =>
    permissionedCompanyRecordWriteFilter(session, "canManageRoles"),

  canReadRoles: ({ session }: AccessArgs) => {
    if (!session) return false;
    return {
      OR: [
        { assignedTo: { some: { id: { equals: session.itemId } } } },
        {
          company: {
            memberships: {
              some: {
                user: { id: { equals: session.itemId } },
                status: { equals: "active" },
              },
            },
          },
        },
      ],
    };
  },

  canManageCompanyMemberships: ({ session }: AccessArgs) => {
    const scoped = permissionedCompanyRecordWriteFilter(session, "canManagePeople");
    if (!session || scoped === false) return false;
    return { AND: [scoped, { user: { id: { not: { equals: session.itemId } } } }] };
  },

  canReadCompanyMemberships: ({ session }: AccessArgs) => {
    if (!session) return false;
    return {
      OR: [
        { user: { id: { equals: session.itemId } } },
        {
          company: {
            memberships: {
              some: {
                user: { id: { equals: session.itemId } },
                status: { equals: "active" },
                canAccessAllProjects: { equals: true },
                role: rolePermissionFilter("canReadPeople", "canManagePeople"),
              },
            },
          },
        },
      ],
    };
  },

  canManageProjectMemberships: ({ session }: AccessArgs) => {
    if (!session) return false;
    const project = permissionedProjectWriteFilter(session, "canManagePeople");
    if (project === false) return false;
    return {
      AND: [
        { project },
        { user: { id: { not: { equals: session.itemId } } } },
      ],
    };
  },

  canReadProjectMemberships: ({ session }: AccessArgs) => {
    if (!session) return false;
    return {
      OR: [
        { user: { id: { equals: session.itemId } } },
        {
          project: {
            company: {
              memberships: {
                some: {
                  user: { id: { equals: session.itemId } },
                  status: { equals: "active" },
                  canAccessAllProjects: { equals: true },
                  role: rolePermissionFilter("canReadPeople", "canManagePeople"),
                },
              },
            },
          },
        },
      ],
    };
  },
};
