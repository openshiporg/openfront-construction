import { list } from "@keystone-6/core";
import { denyAll } from "@keystone-6/core/access";
import {
  checkbox,
  relationship,
  select,
  text,
  timestamp,
} from "@keystone-6/core/fields";

import {
  companyModelAccess,
  hasCompanyPermission,
  hasProjectPermission,
  isSignedIn,
  permissions,
  projectModelAccess,
  rules,
  type Session,
} from "../access";
import type { ValidationHookArgs } from "../domain/hooks";
import {
  canAccessCompanyById,
  canAccessProjectById,
  getConnectedId,
  projectTenantHooks,
  projectTenantKeyHooks,
  queryById,
  validateProjectRootRelationships,
} from "../domain/tenancy";
import {
  companyTenantField,
  lifecycleStatus,
  ownedCompanyField,
  projectTenantField,
  readOnlyRelationshipMany,
} from "./fields";
import { trackingFields } from "./trackingFields";
import { syncDashboardAdmission } from "../domain/dashboard-admission";
import { sanitizeStoreLogoSvg } from "../../lib/sanitize-store-logo";
import { DEFAULT_STORE_LOGO_ICON, DEFAULT_STORE_LOGO_COLOR, normalizeStoreLogoColor } from "../../lib/store-logo";

const membershipStatuses = [
  { label: "Invited", value: "invited" },
  { label: "Active", value: "active" },
  { label: "Suspended", value: "suspended" },
  { label: "Revoked", value: "revoked" },
];

export const Company = list({
  hooks: {
    validate: async ({ operation, resolvedData, item, addValidationError }) => {
      if (operation === "delete") return;
      if (operation === "update" && resolvedData.isDemo !== undefined && resolvedData.isDemo !== item?.isDemo) {
        addValidationError("Fictional workspace provenance cannot be changed");
      }
    },
  },
  access: {
    operation: {
      query: args => permissions.canReadCompanies(args) || permissions.canManageCompanies(args),
      create: () => false,
      update: () => false, // audited/current-authority Store Settings command only
      delete: () => false,
    },
    filter: {
      query: rules.canReadCompanies,
      update: rules.canManageCompanies,
    },
  },
  ui: { listView: { initialColumns: ["name", "slug", "status"] } },
  fields: {
    name: text({ validation: { isRequired: true, length: { min: 1, max: 200 } } }),
    slug: text({
      isIndexed: "unique",
      validation: { isRequired: true, length: { min: 2, max: 120 }, match: { regex: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ } },
    }),
    isDemo: checkbox({ defaultValue: false, access: { create: denyAll, update: denyAll } }),
    legalName: text({ validation: { length: { max: 240 } } }),
    brandName: text({ validation: { isRequired: true, length: { min: 2, max: 120 } }, defaultValue: "Northstar Builders" }),
    brandMark: text({ validation: { isRequired: true, length: { min: 1, max: 4 }, match: { regex: /^[A-Z0-9]+$/ } }, defaultValue: "NB" }),
    brandTagline: text({ validation: { length: { max: 240 } }, defaultValue: "Built on accountable work." }),
    logoIcon: text({
      defaultValue: DEFAULT_STORE_LOGO_ICON,
      hooks: {
        resolveInput: ({ resolvedData, fieldKey }) => {
          const value = resolvedData[fieldKey];
          if (value === undefined || value === null || value === "") return value;
          return typeof value === "string" ? sanitizeStoreLogoSvg(value) : "";
        },
        validate: ({ inputData, resolvedData, fieldKey, addValidationError }) => {
          const submitted = inputData?.[fieldKey];
          if (typeof submitted === "string" && submitted.trim() && !resolvedData?.[fieldKey]) {
            addValidationError("Logo must be a valid, safe SVG document");
          }
        },
      },
    }),
    logoColor: text({
      defaultValue: DEFAULT_STORE_LOGO_COLOR,
      hooks: {
        resolveInput: ({ resolvedData, fieldKey }) => {
          const value = resolvedData[fieldKey];
          return value === undefined ? value : normalizeStoreLogoColor(value);
        },
      },
    }),
    brandColor: text({ validation: { isRequired: true, match: { regex: /^#[0-9a-fA-F]{6}$/ } }, defaultValue: "#1D4ED8" }),
    status: select({  
      type: "enum",
      options: [
        { label: "Active", value: "active" },
        { label: "Suspended", value: "suspended" },
        { label: "Archived", value: "archived" },
      ],
      defaultValue: "active",
      validation: { isRequired: true },
    }),
    email: text({ validation: { length: { max: 320 } } }),
    phone: text({ validation: { length: { max: 50 } } }),
    website: text({ validation: { length: { max: 500 } } }),
    addressLine1: text(),
    addressLine2: text(),
    city: text(),
    stateProvince: text(),
    postalCode: text(),
    countryCode: text({ defaultValue: "US", validation: { length: { min: 2, max: 2 } } }),
    memberships: relationship({ ref: "CompanyMembership.company", many: true, access: { create: denyAll, update: denyAll } }),
    projects: relationship({ ref: "Project.company", many: true, access: { create: denyAll, update: denyAll } }),
    roles: relationship({ ref: "Role.company", many: true, access: { create: denyAll, update: denyAll } }),
    constructionLeads: readOnlyRelationshipMany("ConstructionLead.company"),
    constructionOpportunities: readOnlyRelationshipMany("ConstructionOpportunity.company"),
    publicSiteProfile: relationship({ ref: "PublicSiteProfile.company", access: { create: denyAll, update: denyAll } }),
    serviceRequests: readOnlyRelationshipMany("ServiceRequest.company"),
    publicServices: readOnlyRelationshipMany("PublicService.company"),
    publicProjects: readOnlyRelationshipMany("PublicProject.company"),
    intakeSubmissions: readOnlyRelationshipMany("IntakeSubmission.company"),
    tradePartners: readOnlyRelationshipMany("TradePartner.company"),
    costCodes: readOnlyRelationshipMany("CostCode.company"),
    equipment: readOnlyRelationshipMany("Equipment.company"),
    materials: readOnlyRelationshipMany("Material.company"),
    agentIdentities: readOnlyRelationshipMany("AgentIdentity.company"),
    scopeGrants: readOnlyRelationshipMany("ScopeGrant.company"),
    agentActions: readOnlyRelationshipMany("AgentAction.company"),
    idempotencyKeys: readOnlyRelationshipMany("IdempotencyKey.company"),
    outboxMessages: readOnlyRelationshipMany("OutboxMessage.company"),
    apiCredentials: readOnlyRelationshipMany("ApiCredential.company"),
    approvalPolicies: readOnlyRelationshipMany("ApprovalPolicy.company"),
    ...trackingFields,
  },
});

async function syncMembershipDashboardAdmission({ item, originalItem, context }: {
  item?: Record<string, unknown> | null;
  originalItem?: Record<string, unknown> | null;
  context: Parameters<typeof syncDashboardAdmission>[0];
}) {
  const userId = (item?.userId ?? originalItem?.userId) as string | null | undefined;
  await syncDashboardAdmission(context, userId);
}

export const CompanyMembership = list({
  access: {
    operation: {
      query: isSignedIn,
      create: permissions.canManagePeople,
      update: permissions.canManagePeople,
      delete: permissions.canManagePeople,
    },
    filter: {
      query: rules.canReadCompanyMemberships,
      update: rules.canManageCompanyMemberships,
      delete: rules.canManageCompanyMemberships,
    },
    item: {
      create: async ({ session, inputData, context }) => {
        const companyId = getConnectedId(inputData.company);
        if (!companyId || !session?.itemId) return false;
        return hasCompanyPermission(session, companyId, "canManagePeople") &&
          canAccessCompanyById(context, session.itemId, companyId, true);
      },
    },
  },
  hooks: {
    resolveInput: {
      create: ({ resolvedData }) => {
        const companyId = getConnectedId(resolvedData.company);
        const userId = getConnectedId(resolvedData.user);
        if (!companyId || !userId) throw new Error("Company and user are required");
        return { ...resolvedData, membershipKey: `${companyId}:${userId}` };
      },
    },
    validate: { create: validateCompanyMembershipRole, update: validateCompanyMembershipRole },
    afterOperation: syncMembershipDashboardAdmission,
  },
  ui: { listView: { initialColumns: ["user", "company", "status", "canAccessAllProjects"] } },
  fields: {
    membershipKey: text({
      isIndexed: "unique",
      access: { create: denyAll, update: denyAll },
      ui: { createView: { fieldMode: "hidden" }, itemView: { fieldMode: "read" } },
    }),
    user: relationship({ ref: "User.companyMemberships", access: { update: denyAll } }),
    company: relationship({ ref: "Company.memberships", access: { update: denyAll } }),
    status: select({ type: "enum", options: membershipStatuses, defaultValue: "invited", validation: { isRequired: true } }),
    title: text({ validation: { length: { max: 160 } } }),
    role: relationship({ ref: "Role.companyMemberships" }),
    canAccessAllProjects: checkbox({ defaultValue: false }),
    invitedBy: relationship({ ref: "User" }),
    joinedAt: timestamp(),
    ...trackingFields,
  },
});

export const Project = list({
  access: {
    operation: {
      query: args => permissions.canReadProjects(args) || permissions.canManageProjects(args),
      create: () => false,
      update: permissions.canManageProjects,
      delete: () => false,
    },
    filter: {
      query: rules.canReadProjects,
      update: rules.canManageProjects,
    },
    item: {
      create: async ({ session, inputData, context }) => {
        const companyId = getConnectedId(inputData.company);
        if (!companyId || !session?.itemId) return false;
        return canAccessCompanyById(context, session.itemId, companyId, true);
      },
    },
  },
  hooks: {
    resolveInput: {
      create: ({ resolvedData }) => {
        const companyId = getConnectedId(resolvedData.company);
        const projectNumber = String(resolvedData.projectNumber ?? "").trim();
        if (!companyId || !projectNumber) throw new Error("Company and project number are required");
        return { ...resolvedData, projectKey: `${companyId}:${projectNumber.toLowerCase()}` };
      },
    },
    validate: {
      create: validateProjectRootRelationships,
      update: validateProjectRootRelationships,
    },
  },
  ui: { listView: { initialColumns: ["projectNumber", "name", "company", "status"] } },
  fields: {
    projectKey: text({
      isIndexed: "unique",
      access: { create: denyAll, update: denyAll },
      ui: { createView: { fieldMode: "hidden" }, itemView: { fieldMode: "read" } },
    }),
    projectNumber: text({
      validation: { isRequired: true, length: { min: 1, max: 80 } },
      access: { update: denyAll },
      ui: { itemView: { fieldMode: "read" } },
    }),
    name: text({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    description: text({ ui: { displayMode: "textarea" } }),
    status: lifecycleStatus([
      { label: "Planning", value: "planning" },
      { label: "Active", value: "active" },
      { label: "On Hold", value: "on_hold" },
      { label: "Completed", value: "completed" },
      { label: "Archived", value: "archived" },
    ], "planning"),
    company: ownedCompanyField("Company.projects"),
    owner: relationship({ ref: "TradePartner.ownedProjects" }),
    projectManager: relationship({ ref: "User" }),
    superintendent: relationship({ ref: "User" }),
    startDate: timestamp(),
    substantialCompletionDate: timestamp(),
    actualCompletionDate: timestamp(),
    timezone: text({ defaultValue: "America/New_York" }),
    currencyCode: text({ defaultValue: "USD", validation: { isRequired: true, length: { min: 3, max: 3 } }, access: { update: denyAll }, ui: { itemView: { fieldMode: "read" } } }),
    addressLine1: text(),
    addressLine2: text(),
    city: text(),
    stateProvince: text(),
    postalCode: text(),
    countryCode: text({ defaultValue: "US", validation: { length: { min: 2, max: 2 } } }),
    memberships: relationship({ ref: "ProjectMembership.project", many: true, access: { create: denyAll, update: denyAll } }),
    locations: readOnlyRelationshipMany("ProjectLocation.project"),
    budgetCodes: readOnlyRelationshipMany("BudgetCode.project"),
    bidPackages: readOnlyRelationshipMany("BidPackage.project"),
    bidInvitations: readOnlyRelationshipMany("BidInvitation.project"),
    bidSubmissions: readOnlyRelationshipMany("BidSubmission.project"),
    bidLineItems: readOnlyRelationshipMany("BidLineItem.project"),
    estimates: readOnlyRelationshipMany("Estimate.project"),
    estimateVersions: readOnlyRelationshipMany("EstimateVersion.project"),
    estimateLineItems: readOnlyRelationshipMany("EstimateLineItem.project"),
    budgets: readOnlyRelationshipMany("Budget.project"),
    budgetLineItems: readOnlyRelationshipMany("BudgetLineItem.project"),
    budgetChanges: readOnlyRelationshipMany("BudgetChange.project"),
    budgetChangeLineItems: readOnlyRelationshipMany("BudgetChangeLineItem.project"),
    directCosts: readOnlyRelationshipMany("DirectCost.project"),
    primeContracts: readOnlyRelationshipMany("PrimeContract.project"),
    commitments: readOnlyRelationshipMany("Commitment.project"),
    contractLineItems: readOnlyRelationshipMany("ContractLineItem.project"),
    changeEvents: readOnlyRelationshipMany("ChangeEvent.project"),
    changeEventLineItems: readOnlyRelationshipMany("ChangeEventLineItem.project"),
    changeQuotes: readOnlyRelationshipMany("ChangeQuote.project"),
    changeOrders: readOnlyRelationshipMany("ChangeOrder.project"),
    changeOrderLineItems: readOnlyRelationshipMany("ChangeOrderLineItem.project"),
    rfis: readOnlyRelationshipMany("RFI.project"),
    rfiResponses: readOnlyRelationshipMany("RFIResponse.project"),
    specificationSections: readOnlyRelationshipMany("SpecificationSection.project"),
    submittals: readOnlyRelationshipMany("Submittal.project"),
    submittalReviews: readOnlyRelationshipMany("SubmittalReview.project"),
    drawings: readOnlyRelationshipMany("Drawing.project"),
    drawingRevisions: readOnlyRelationshipMany("DrawingRevision.project"),
    documents: readOnlyRelationshipMany("Document.project"),
    documentVersions: readOnlyRelationshipMany("DocumentVersion.project"),
    dailyLogs: readOnlyRelationshipMany("DailyLog.project"),
    dailyLogEntries: readOnlyRelationshipMany("DailyLogEntry.project"),
    schedules: readOnlyRelationshipMany("Schedule.project"),
    scheduleTasks: readOnlyRelationshipMany("ScheduleTask.project"),
    scheduleDependencies: readOnlyRelationshipMany("ScheduleDependency.project"),
    punchItems: readOnlyRelationshipMany("PunchItem.project"),
    laborEntries: readOnlyRelationshipMany("LaborEntry.project"),
    resourceLogs: readOnlyRelationshipMany("ResourceLog.project"),
    safetyIncidents: readOnlyRelationshipMany("SafetyIncident.project"),
    safetyObservations: readOnlyRelationshipMany("SafetyObservation.project"),
    inspectionTemplates: readOnlyRelationshipMany("InspectionTemplate.project"),
    inspections: readOnlyRelationshipMany("Inspection.project"),
    inspectionItems: readOnlyRelationshipMany("InspectionItem.project"),
    correctiveActions: readOnlyRelationshipMany("CorrectiveAction.project"),
    progressClaims: readOnlyRelationshipMany("ProgressClaim.project"),
    progressClaimLineItems: readOnlyRelationshipMany("ProgressClaimLineItem.project"),
    payments: readOnlyRelationshipMany("Payment.project"),
    paymentReversals: readOnlyRelationshipMany("PaymentReversal.project"),
    paymentAllocations: readOnlyRelationshipMany("PaymentAllocation.project"),
    retainageReleases: readOnlyRelationshipMany("RetainageRelease.project"),
    lienWaivers: readOnlyRelationshipMany("LienWaiver.project"),
    scopeGrants: readOnlyRelationshipMany("ScopeGrant.project"),
    agentActions: readOnlyRelationshipMany("AgentAction.project"),
    idempotencyKeys: readOnlyRelationshipMany("IdempotencyKey.project"),
    outboxMessages: readOnlyRelationshipMany("OutboxMessage.project"),
    apiCredentials: readOnlyRelationshipMany("ApiCredential.project"),
    accountInvitations: readOnlyRelationshipMany("AccountInvitation.project"),
    publications: readOnlyRelationshipMany("PublicProject.sourceProject"),
    approvalPolicies: readOnlyRelationshipMany("ApprovalPolicy.project"),
    approvalRequests: readOnlyRelationshipMany("ApprovalRequest.project"),
    approvalDecisions: readOnlyRelationshipMany("ApprovalDecision.project"),
    documentDistributions: readOnlyRelationshipMany("DocumentDistribution.project"),
    documentAcknowledgements: readOnlyRelationshipMany("DocumentAcknowledgement.project"),
    procurementRequests: readOnlyRelationshipMany("ProcurementRequest.project"),
    procurementRequestLines: readOnlyRelationshipMany("ProcurementRequestLine.project"),
    materialReceipts: readOnlyRelationshipMany("MaterialReceipt.project"),
    materialReceiptLines: readOnlyRelationshipMany("MaterialReceiptLine.project"),
    ...trackingFields,
  },
});

async function validateCompanyMembershipRole({ resolvedData, context, item, addValidationError }: {
  resolvedData: Record<string, unknown>;
  context: Parameters<typeof queryById>[0];
  item?: { id: { toString(): string } } | null;
  addValidationError(message: string): void;
}) {
  let companyId = getConnectedId(resolvedData.company);
  const roleId = getConnectedId(resolvedData.role);
  if (!companyId && item?.id) companyId = (await queryById(context, "CompanyMembership", item.id.toString(), "company { id }"))?.company?.id ?? null;
  if (!companyId || !roleId) return;
  const role = await queryById(context, "Role", roleId, "company { id }");
  if (role?.company?.id !== companyId) addValidationError("Membership role must belong to the selected company");
  const actor = (context as unknown as { session?: Session }).session;
  if (actor && !hasCompanyPermission(actor, companyId, "canManageRoles")) {
    addValidationError("Changing a company membership role requires role administration permission in that company");
  }
}

async function validatePortalOrganization({ resolvedData, context, item, addValidationError }: {
  resolvedData: Record<string, unknown>;
  context: Parameters<typeof queryById>[0];
  item?: { id: { toString(): string } } | null;
  addValidationError(message: string): void;
}) {
  let projectId = getConnectedId(resolvedData.project);
  if (!projectId && item?.id) projectId = (await queryById(context, "ProjectMembership", item.id.toString(), "project { id }"))?.project?.id ?? null;
  const partnerId = getConnectedId(resolvedData.portalOrganization);
  const roleId = getConnectedId(resolvedData.role);
  if (!projectId || (!partnerId && !roleId)) return;
  const [project, partner, role] = await Promise.all([
    queryById(context, "Project", projectId, "company { id }"),
    partnerId ? queryById(context, "TradePartner", partnerId, "company { id }") : null,
    roleId ? queryById(context, "Role", roleId, "company { id }") : null,
  ]);
  if (!project?.company?.id) return addValidationError("Project company is required");
  if (partnerId && project.company.id !== partner?.company?.id) {
    addValidationError("Portal organization must belong to the project company");
  }
  if (roleId && project.company.id !== role?.company?.id) {
    addValidationError("Membership role must belong to the project company");
  }
  const actor = (context as unknown as { session?: Session }).session;
  if (actor && roleId && !hasProjectPermission(actor, project.company.id, projectId, "canManageRoles", true)) {
    addValidationError("Changing a project membership role requires role administration permission in that project");
  }
}

export const ProjectMembership = list({
  access: {
    operation: {
      query: isSignedIn,
      create: permissions.canManagePeople,
      update: permissions.canManagePeople,
      delete: permissions.canManagePeople,
    },
    filter: {
      query: rules.canReadProjectMemberships,
      update: rules.canManageProjectMemberships,
      delete: rules.canManageProjectMemberships,
    },
    item: {
      create: async ({ session, inputData, context }) => {
        const projectId = getConnectedId(inputData.project);
        if (!projectId || !session?.itemId) return false;
        const project = await queryById(context, "Project", projectId, "company { id }");
        const companyId = project?.company?.id;
        return Boolean(companyId) &&
          hasProjectPermission(session, companyId!, projectId, "canManagePeople", true) &&
          canAccessProjectById(context, session.itemId, projectId, true);
      },
    },
  },
  hooks: {
    resolveInput: {
      create: ({ resolvedData }) => {
        const projectId = getConnectedId(resolvedData.project);
        const userId = getConnectedId(resolvedData.user);
        if (!projectId || !userId) throw new Error("Project and user are required");
        return { ...resolvedData, membershipKey: `${projectId}:${userId}` };
      },
    },
    validate: { create: validatePortalOrganization, update: validatePortalOrganization },
    afterOperation: syncMembershipDashboardAdmission,
  },
  ui: { listView: { initialColumns: ["user", "project", "accessLevel", "portalType", "status"] } },
  fields: {
    membershipKey: text({
      isIndexed: "unique",
      access: { create: denyAll, update: denyAll },
      ui: { createView: { fieldMode: "hidden" }, itemView: { fieldMode: "read" } },
    }),
    user: relationship({ ref: "User.projectMemberships", access: { update: denyAll } }),
    project: relationship({ ref: "Project.memberships", access: { update: denyAll } }),
    status: select({ type: "enum", options: membershipStatuses, defaultValue: "invited", validation: { isRequired: true } }),
    accessLevel: select({
      type: "enum",
      options: [
        { label: "Viewer", value: "viewer" },
        { label: "Contributor", value: "contributor" },
        { label: "Manager", value: "manager" },
      ],
      defaultValue: "viewer",
      validation: { isRequired: true },
    }),
    role: relationship({ ref: "Role.projectMemberships" }),
    portalOrganization: relationship({ ref: "TradePartner.projectMembers" }),
    portalType: select({
      type: "enum",
      options: [
        { label: "Internal", value: "internal" },
        { label: "Owner / client", value: "owner" },
        { label: "Designer", value: "designer" },
        { label: "Subcontractor", value: "subcontractor" },
        { label: "Vendor", value: "vendor" },
      ],
      defaultValue: "internal",
      validation: { isRequired: true },
    }),
    joinedAt: timestamp(),
    documentDistributions: readOnlyRelationshipMany("DocumentDistribution.recipient"),
    approvalRequests: readOnlyRelationshipMany("ApprovalRequest.assignedTo"),
    ...trackingFields,
  },
});

export const TradePartner = list({
  access: companyModelAccess("canReadCompanies", "canManageCompanies", { delete: false }),
  ui: { listView: { initialColumns: ["name", "partnerType", "status", "company"] } },
  fields: {
    name: text({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    legalName: text(),
    partnerType: select({
      type: "enum",
      options: [
        { label: "Owner", value: "owner" },
        { label: "Architect/Engineer", value: "designer" },
        { label: "Subcontractor", value: "subcontractor" },
        { label: "Vendor", value: "vendor" },
        { label: "Consultant", value: "consultant" },
        { label: "Authority", value: "authority" },
      ],
      defaultValue: "subcontractor",
      validation: { isRequired: true },
    }),
    status: select({
      type: "enum",
      options: [
        { label: "Prospective", value: "prospective" },
        { label: "Approved", value: "approved" },
        { label: "Inactive", value: "inactive" },
        { label: "Blocked", value: "blocked" },
      ],
      defaultValue: "prospective",
      validation: { isRequired: true },
    }),
    taxIdLast4: text({ access: { read: denyAll } }),
    email: text(),
    phone: text(),
    website: text(),
    addressLine1: text(),
    addressLine2: text(),
    city: text(),
    stateProvince: text(),
    postalCode: text(),
    countryCode: text({ defaultValue: "US" }),
    company: ownedCompanyField("Company.tradePartners"),
    ownedProjects: readOnlyRelationshipMany("Project.owner"),
    projectMembers: relationship({ ref: "ProjectMembership.portalOrganization", many: true, access: { create: denyAll, update: denyAll } }),
    bidInvitations: readOnlyRelationshipMany("BidInvitation.tradePartner"),
    bidSubmissions: readOnlyRelationshipMany("BidSubmission.tradePartner"),
    commitments: readOnlyRelationshipMany("Commitment.tradePartner"),
    opportunities: readOnlyRelationshipMany("ConstructionOpportunity.client"),
    changeQuotes: readOnlyRelationshipMany("ChangeQuote.tradePartner"),
    primeContracts: readOnlyRelationshipMany("PrimeContract.client"),
    progressClaims: readOnlyRelationshipMany("ProgressClaim.tradePartner"),
    payments: readOnlyRelationshipMany("Payment.tradePartner"),
    lienWaivers: readOnlyRelationshipMany("LienWaiver.tradePartner"),
    procurementRequests: readOnlyRelationshipMany("ProcurementRequest.tradePartner"),
    materialReceipts: readOnlyRelationshipMany("MaterialReceipt.tradePartner"),
    ...trackingFields,
  },
});

const MAX_LOCATION_DEPTH = 50;

async function validateLocationHierarchy(args: ValidationHookArgs) {
  const parentId = getConnectedId(args.resolvedData.parent);
  if (!parentId) return;
  const itemId = args.item?.id?.toString();
  if (itemId && parentId === itemId) {
    args.addValidationError("A location cannot be its own parent");
    return;
  }
  if (!itemId) return;
  let currentId: string | undefined = parentId;
  for (let depth = 0; currentId; depth += 1) {
    if (depth >= MAX_LOCATION_DEPTH) {
      args.addValidationError(`Locations can be nested at most ${MAX_LOCATION_DEPTH} levels deep`);
      return;
    }
    const current = await queryById(args.context, "ProjectLocation", currentId, "id parent { id }") as { parent?: { id?: string } | null } | null;
    currentId = current?.parent?.id ?? undefined;
    if (currentId === itemId) {
      args.addValidationError("A location cannot be placed inside one of its own sub-locations");
      return;
    }
  }
}

export const ProjectLocation = list({
  access: projectModelAccess("canReadProjects", "canManageProjects"),
  hooks: {
    ...projectTenantHooks(),
    validate: { create: validateLocationHierarchy, update: validateLocationHierarchy },
  },
  ui: { listView: { initialColumns: ["code", "name", "parent", "project"] } },
  fields: {
    code: text({ validation: { isRequired: true, length: { min: 1, max: 80 } } }),
    name: text({ validation: { isRequired: true, length: { min: 1, max: 200 } } }),
    locationType: select({
      type: "enum",
      options: [
        { label: "Site", value: "site" },
        { label: "Building", value: "building" },
        { label: "Floor", value: "floor" },
        { label: "Area", value: "area" },
        { label: "Room", value: "room" },
        { label: "Zone", value: "zone" },
      ],
      defaultValue: "area",
    }),
    parent: relationship({ ref: "ProjectLocation.children" }),
    children: readOnlyRelationshipMany("ProjectLocation.parent"),
    company: companyTenantField(),
    project: projectTenantField("Project.locations"),
    ...trackingFields,
  },
});

export const CostCode = list({
  access: companyModelAccess("canReadFinancials", "canManageFinancials", { delete: false }),
  hooks: {
    resolveInput: {
      create: ({ resolvedData }) => {
        const companyId = getConnectedId(resolvedData.company);
        const code = String(resolvedData.code ?? "").trim();
        if (!companyId || !code) throw new Error("Cost code requires company and code");
        return { ...resolvedData, costCodeKey: `${companyId}:${code.toLowerCase()}` };
      },
    },
  },
  ui: { listView: { initialColumns: ["code", "name", "division", "company"] } },
  fields: {
    costCodeKey: text({ isIndexed: "unique", access: { create: denyAll, update: denyAll }, ui: { createView: { fieldMode: "hidden" }, itemView: { fieldMode: "read" } } }),
    code: text({ validation: { isRequired: true, length: { min: 1, max: 40 } }, access: { update: denyAll } }),
    name: text({ validation: { isRequired: true, length: { min: 1, max: 200 } } }),
    division: text({ validation: { length: { max: 120 } } }),
    description: text({ ui: { displayMode: "textarea" } }),
    isActive: checkbox({ defaultValue: true }),
    company: ownedCompanyField("Company.costCodes"),
    budgetCodes: readOnlyRelationshipMany("BudgetCode.costCode"),
    ...trackingFields,
  },
});

export const BudgetCode = list({
  access: projectModelAccess("canReadFinancials", "canManageFinancials", { delete: false }),
  hooks: projectTenantKeyHooks({ parentField: "project", valueField: "code", keyField: "budgetCodeKey" }),
  ui: { listView: { initialColumns: ["code", "costType", "costCode", "project"] } },
  fields: {
    budgetCodeKey: text({ isIndexed: "unique", access: { create: denyAll, update: denyAll }, ui: { createView: { fieldMode: "hidden" }, itemView: { fieldMode: "read" } } }),
    code: text({ validation: { isRequired: true, length: { min: 1, max: 80 } }, access: { update: denyAll } }),
    description: text({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    costType: select({
      type: "enum",
      options: [
        { label: "Labor", value: "labor" },
        { label: "Material", value: "material" },
        { label: "Subcontract", value: "subcontract" },
        { label: "Equipment", value: "equipment" },
        { label: "Other", value: "other" },
      ],
      defaultValue: "other",
      validation: { isRequired: true },
    }),
    isActive: checkbox({ defaultValue: true }),
    costCode: relationship({ ref: "CostCode.budgetCodes" }),
    company: companyTenantField(),
    project: projectTenantField("Project.budgetCodes"),
    budgetLineItems: readOnlyRelationshipMany("BudgetLineItem.budgetCode"),
    budgetChangeLineItems: readOnlyRelationshipMany("BudgetChangeLineItem.budgetCode"),
    directCosts: readOnlyRelationshipMany("DirectCost.budgetCode"),
    bidLineItems: readOnlyRelationshipMany("BidLineItem.budgetCode"),
    estimateLineItems: readOnlyRelationshipMany("EstimateLineItem.budgetCode"),
    contractLineItems: readOnlyRelationshipMany("ContractLineItem.budgetCode"),
    changeEventLineItems: readOnlyRelationshipMany("ChangeEventLineItem.budgetCode"),
    changeOrderLineItems: readOnlyRelationshipMany("ChangeOrderLineItem.budgetCode"),
    laborEntries: readOnlyRelationshipMany("LaborEntry.budgetCode"),
    resourceLogs: readOnlyRelationshipMany("ResourceLog.budgetCode"),
    procurementRequestLines: readOnlyRelationshipMany("ProcurementRequestLine.budgetCode"),
    ...trackingFields,
  },
});
