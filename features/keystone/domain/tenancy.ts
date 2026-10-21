export type MembershipRoleData = Record<string, unknown> | null;

export type CompanyMembershipSessionData = {
  status: string;
  canAccessAllProjects: boolean;
  company: { id: string; name?: string; brandName?: string; brandMark?: string; brandTagline?: string; brandColor?: string } | null;
  role?: MembershipRoleData;
};

export type ProjectMembershipSessionData = {
  status: string;
  accessLevel?: "viewer" | "contributor" | "manager";
  portalType?: "internal" | "owner" | "designer" | "subcontractor" | "vendor";
  portalOrganization?: { id: string; name?: string; partnerType?: string } | null;
  project: { id: string; company: { id: string } | null } | null;
  role?: MembershipRoleData;
};

export type TenancySession = {
  itemId: string;
  listKey: string;
  authType?: "session" | "api_key";
  apiCredential?: {
    id: string;
    companyId: string;
    projectId: string | null;
    scopes: string[];
  };
  data: {
    companyMemberships?: CompanyMembershipSessionData[];
    projectMemberships?: ProjectMembershipSessionData[];
    role?: Record<string, unknown> | null;
    [key: string]: unknown;
  };
};

export function getConnectedId(value: unknown): string | null {
  return getConnectedIds(value)[0] ?? null;
}

export function getConnectedIds(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const connect = (value as { connect?: unknown }).connect;
  const connections = Array.isArray(connect) ? connect : connect ? [connect] : [];
  return connections.flatMap(connection => {
    if (!connection || typeof connection !== "object") return [];
    const id = (connection as { id?: unknown }).id;
    return typeof id === "string" && id.length > 0 ? [id] : [];
  });
}

function credentialAllowsCompany(session: TenancySession, companyId: string): boolean {
  return session.authType !== "api_key" || session.apiCredential?.companyId === companyId;
}

function credentialAllowsProject(session: TenancySession, companyId: string, projectId: string): boolean {
  if (session.authType !== "api_key") return true;
  return session.apiCredential?.companyId === companyId &&
    (!session.apiCredential.projectId || session.apiCredential.projectId === projectId);
}

function restrictCompanyFilter(session: TenancySession, filter: Record<string, unknown>) {
  if (session.authType !== "api_key") return filter;
  const companyId = session.apiCredential?.companyId;
  return companyId ? { AND: [filter, { id: { equals: companyId } }] } : false;
}

function restrictProjectFilter(session: TenancySession, filter: Record<string, unknown>) {
  if (session.authType !== "api_key") return filter;
  const companyId = session.apiCredential?.companyId;
  if (!companyId) return false;
  return {
    AND: [
      filter,
      { company: { id: { equals: companyId } } },
      ...(session.apiCredential?.projectId
        ? [{ id: { equals: session.apiCredential.projectId } }]
        : []),
    ],
  };
}

function restrictProjectRecordFilter(session: TenancySession, filter: Record<string, unknown>) {
  if (session.authType !== "api_key") return filter;
  const companyId = session.apiCredential?.companyId;
  if (!companyId) return false;
  return {
    AND: [
      filter,
      { company: { id: { equals: companyId } } },
      ...(session.apiCredential?.projectId
        ? [{ project: { id: { equals: session.apiCredential.projectId } } }]
        : []),
    ],
  };
}

export function hasSessionCompanyAccess(session: TenancySession | undefined, companyId: string): boolean {
  if (!session || !credentialAllowsCompany(session, companyId)) return false;
  return Boolean(
    session.data.companyMemberships?.some(
      membership => membership.status === "active" && membership.company?.id === companyId,
    ),
  );
}

export function hasSessionProjectAccess(
  session: TenancySession | undefined,
  companyId: string,
  projectId: string,
  requireWrite = false,
): boolean {
  if (!session || !credentialAllowsProject(session, companyId, projectId)) return false;

  const explicitMembership = session.data.projectMemberships?.find(
    membership =>
      membership.status === "active" &&
      membership.project?.id === projectId &&
      membership.project.company?.id === companyId,
  );
  if (explicitMembership) {
    return !requireWrite || explicitMembership.accessLevel === "contributor" || explicitMembership.accessLevel === "manager";
  }

  return Boolean(session.data.companyMemberships?.some(
    membership =>
      membership.status === "active" &&
      membership.canAccessAllProjects &&
      membership.company?.id === companyId,
  ));
}

export function companyAccessFilter(session: TenancySession | undefined) {
  if (!session) return false;
  return restrictCompanyFilter(session, {
    memberships: { some: { user: { id: { equals: session.itemId } }, status: { equals: "active" } } },
  });
}

const readableProjects = (session: TenancySession) => ({
  OR: [
    { company: { memberships: { some: {
      user: { id: { equals: session.itemId } }, status: { equals: "active" }, canAccessAllProjects: { equals: true },
    } } } },
    { memberships: { some: { user: { id: { equals: session.itemId } }, status: { equals: "active" } } } },
  ],
});

const writableProjects = (session: TenancySession) => ({
  OR: [
    { AND: [
      { company: { memberships: { some: {
        user: { id: { equals: session.itemId } }, status: { equals: "active" }, canAccessAllProjects: { equals: true },
      } } } },
      { memberships: { none: {
        user: { id: { equals: session.itemId } }, status: { equals: "active" },
      } } },
    ] },
    { memberships: { some: {
      user: { id: { equals: session.itemId } }, status: { equals: "active" },
      accessLevel: { in: ["contributor", "manager"] }, portalType: { equals: "internal" },
    } } },
  ],
});

const readableProjectRecords = (session: TenancySession) => ({
  OR: [
    { company: { memberships: { some: {
      user: { id: { equals: session.itemId } }, status: { equals: "active" }, canAccessAllProjects: { equals: true },
    } } } },
    { project: { memberships: { some: {
      user: { id: { equals: session.itemId } }, status: { equals: "active" }, portalType: { equals: "internal" },
    } } } },
  ],
});

const writableProjectRecords = (session: TenancySession) => ({
  OR: [
    { AND: [
      { company: { memberships: { some: {
        user: { id: { equals: session.itemId } }, status: { equals: "active" }, canAccessAllProjects: { equals: true },
      } } } },
      { project: { memberships: { none: {
        user: { id: { equals: session.itemId } }, status: { equals: "active" },
      } } } },
    ] },
    { project: { memberships: { some: {
      user: { id: { equals: session.itemId } }, status: { equals: "active" },
      accessLevel: { in: ["contributor", "manager"] }, portalType: { equals: "internal" },
    } } } },
  ],
});

export function projectAccessFilter(session: TenancySession | undefined) {
  return session ? restrictProjectFilter(session, readableProjects(session)) : false;
}

export function writableProjectAccessFilter(session: TenancySession | undefined) {
  return session ? restrictProjectFilter(session, writableProjects(session)) : false;
}

export function projectRecordAccessFilter(session: TenancySession | undefined) {
  return session ? restrictProjectRecordFilter(session, readableProjectRecords(session)) : false;
}

export function writableProjectRecordAccessFilter(session: TenancySession | undefined) {
  return session ? restrictProjectRecordFilter(session, writableProjectRecords(session)) : false;
}

export type KeystoneQueryRecord = Record<string, unknown> & {
  id?: string;
  company?: { id?: string } | null;
  project?: { id?: string; company?: { id?: string } | null } | null;
  companyMemberships?: Array<{ status?: string; company?: { id?: string } | null }>;
  projectMemberships?: Array<{ status?: string; project?: { id?: string; company?: { id?: string } | null } | null }>;
};

export type KeystoneQueryApi = {
  count?(args: { where: Record<string, unknown> }): Promise<number>;
  findOne?(args: { where: Record<string, unknown>; query: string }): Promise<KeystoneQueryRecord | null>;
  findMany?(args: {
    where: Record<string, unknown>;
    take?: number;
    skip?: number;
    orderBy?: Record<string, "asc" | "desc" | null> | readonly Record<string, "asc" | "desc" | null>[];
    query: string;
  }): Promise<readonly KeystoneQueryRecord[]>;
};

export type KeystoneContextLike = {
  sudo(): {
    query: Record<string, KeystoneQueryApi>;
  };
};

export async function queryCount(
  context: KeystoneContextLike,
  listKey: string,
  where: Record<string, unknown>,
): Promise<number> {
  const count = context.sudo().query[listKey]?.count;
  if (!count) throw new Error(`${listKey} count query is unavailable`);
  return count({ where });
}

export async function queryOne(
  context: KeystoneContextLike,
  listKey: string,
  where: Record<string, unknown>,
  query: string,
): Promise<KeystoneQueryRecord | null> {
  const findOne = context.sudo().query[listKey]?.findOne;
  if (!findOne) throw new Error(`${listKey} findOne query is unavailable`);
  return findOne({ where, query });
}

export function queryById(
  context: KeystoneContextLike,
  listKey: string,
  id: string,
  query: string,
): Promise<KeystoneQueryRecord | null> {
  return queryOne(context, listKey, { id }, query);
}

type ProjectTenantResolveInputArgs = {
  listKey: string;
  operation: "create" | "update";
  resolvedData: Record<string, unknown>;
  context: KeystoneContextLike;
  item?: { id: { toString(): string } } | null;
};

export async function canAccessCompanyById(
  context: KeystoneContextLike,
  userId: string,
  companyId: string,
  requireAllProjects = false,
): Promise<boolean> {
  const count = await queryCount(context, "CompanyMembership", {
    user: { id: { equals: userId } },
    company: { id: { equals: companyId } },
    status: { equals: "active" },
    ...(requireAllProjects ? { canAccessAllProjects: { equals: true } } : {}),
  });
  return count > 0;
}

export async function canAccessProjectById(
  context: KeystoneContextLike,
  userId: string,
  projectId: string,
  requireWrite = false,
): Promise<boolean> {
  const project = await queryById(context, "Project", projectId, "id company { id }");
  const companyId = project?.company?.id;
  if (!companyId) return false;

  const membershipWhere = {
    user: { id: { equals: userId } },
    project: { id: { equals: projectId } },
    status: { equals: "active" },
  };
  const membershipApi = context.sudo().query.ProjectMembership;
  if (membershipApi?.findMany) {
    const [membership] = await membershipApi.findMany({
      where: membershipWhere,
      take: 1,
      query: "id status accessLevel portalType",
    });
    if (membership) {
      return !requireWrite || (
        membership.portalType === "internal" &&
        (membership.accessLevel === "contributor" || membership.accessLevel === "manager")
      );
    }
  } else if (await queryCount(context, "ProjectMembership", {
    ...membershipWhere,
    ...(requireWrite ? {
      accessLevel: { in: ["contributor", "manager"] },
      portalType: { equals: "internal" },
    } : {}),
  }) > 0) {
    return true;
  }

  return canAccessCompanyById(context, userId, companyId, true);
}

export async function getProjectCompanyId(
  context: KeystoneContextLike,
  projectId: string,
): Promise<string | null> {
  const project = await queryById(context, "Project", projectId, "id company { id }");
  return project?.company?.id ?? null;
}

const requiredProjectRelationships: Record<string, readonly string[]> = {
  BudgetCode: ["costCode"],
  BidInvitation: ["bidPackage", "budgetCode", "tradePartner"],
  BidSubmission: ["bidPackage", "tradePartner"],
  BidLineItem: ["submission", "budgetCode"],
  EstimateVersion: ["estimate"],
  EstimateLineItem: ["version", "budgetCode"],
  BudgetLineItem: ["budget", "budgetCode"],
  BudgetChange: ["budget"],
  BudgetChangeLineItem: ["budgetChange", "budgetCode"],
  DirectCost: ["budgetCode"],
  PrimeContract: ["client"],
  Commitment: ["tradePartner"],
  ContractLineItem: ["budgetCode"],
  ChangeEventLineItem: ["changeEvent", "budgetCode"],
  ChangeQuote: ["changeEvent", "tradePartner"],
  ChangeOrderLineItem: ["changeOrder", "contractLineItem", "budgetCode"],
  RFI: ["raisedBy"],
  RFIResponse: ["rfi", "author"],
  SubmittalReview: ["submittal", "reviewer"],
  DrawingRevision: ["drawing"],
  DocumentVersion: ["document"],
  DailyLog: ["preparedBy"],
  DailyLogEntry: ["dailyLog"],
  ScheduleTask: ["schedule"],
  ScheduleDependency: ["schedule", "predecessor", "successor"],
  PunchItem: ["createdBy"],
  LaborEntry: ["budgetCode"],
  SafetyIncident: ["reportedBy"],
  SafetyObservation: ["observedBy"],
  Inspection: ["inspector"],
  InspectionItem: ["inspection"],
  CorrectiveAction: ["assignedTo"],
  ProgressClaim: ["tradePartner"],
  ProgressClaimLineItem: ["progressClaim", "contractLineItem"],
  Payment: ["tradePartner", "recordedBy"],
  PaymentReversal: ["payment", "reversedBy"],
  PaymentAllocation: ["payment", "progressClaim"],
  RetainageRelease: ["progressClaim"],
  LienWaiver: ["tradePartner"],
  ProcurementRequest: ["requestedBy"],
  ProcurementRequestLine: ["request", "budgetCode"],
  MaterialReceipt: ["request", "receivedBy"],
  MaterialReceiptLine: ["receipt", "requestLine"],
  AccountInvitation: ["invitedBy", "user", "projectMembership"],
  ApprovalRequest: ["requestedBy"],
  ApprovalDecision: ["request", "decidedBy"],
  DocumentDistribution: ["documentVersion", "recipient", "distributedBy"],
  DocumentAcknowledgement: ["distribution", "acknowledgedBy"],
};

type RelatedTenantTarget = {
  listKey: string;
  scope: "company" | "project" | "user" | "invitedUser" | "projectMembership";
};

const relatedTenantTargets: Record<string, Record<string, RelatedTenantTarget>> = {
  Project: {
    owner: { listKey: "TradePartner", scope: "company" },
    projectManager: { listKey: "User", scope: "user" },
    superintendent: { listKey: "User", scope: "user" },
  },
  ProjectLocation: { parent: { listKey: "ProjectLocation", scope: "project" } },
  BudgetCode: { costCode: { listKey: "CostCode", scope: "company" } },
  BidPackage: {
    bidManager: { listKey: "User", scope: "user" },
    awardedPartner: { listKey: "TradePartner", scope: "company" },
  },
  BidInvitation: {
    bidPackage: { listKey: "BidPackage", scope: "project" },
    budgetCode: { listKey: "BudgetCode", scope: "project" },
    tradePartner: { listKey: "TradePartner", scope: "company" },
    submission: { listKey: "BidSubmission", scope: "project" },
  },
  BidSubmission: {
    bidPackage: { listKey: "BidPackage", scope: "project" },
    invitation: { listKey: "BidInvitation", scope: "project" },
    tradePartner: { listKey: "TradePartner", scope: "company" },
    reviewedBy: { listKey: "User", scope: "user" },
  },
  BidLineItem: {
    submission: { listKey: "BidSubmission", scope: "project" },
    budgetCode: { listKey: "BudgetCode", scope: "project" },
  },
  Estimate: {
    estimator: { listKey: "User", scope: "user" },
    currentVersion: { listKey: "EstimateVersion", scope: "project" },
  },
  EstimateVersion: { estimate: { listKey: "Estimate", scope: "project" } },
  EstimateLineItem: {
    version: { listKey: "EstimateVersion", scope: "project" },
    budgetCode: { listKey: "BudgetCode", scope: "project" },
  },
  BudgetLineItem: {
    budget: { listKey: "Budget", scope: "project" },
    budgetCode: { listKey: "BudgetCode", scope: "project" },
  },
  Budget: { approvedBy: { listKey: "User", scope: "user" } },
  BudgetChange: {
    budget: { listKey: "Budget", scope: "project" },
    requestedBy: { listKey: "User", scope: "user" },
    reviewedBy: { listKey: "User", scope: "user" },
    sourceChangeEvent: { listKey: "ChangeEvent", scope: "project" },
  },
  BudgetChangeLineItem: {
    budgetChange: { listKey: "BudgetChange", scope: "project" },
    budgetLineItem: { listKey: "BudgetLineItem", scope: "project" },
    budgetCode: { listKey: "BudgetCode", scope: "project" },
    changeEventLineItem: { listKey: "ChangeEventLineItem", scope: "project" },
  },
  DirectCost: {
    budgetCode: { listKey: "BudgetCode", scope: "project" },
    tradePartner: { listKey: "TradePartner", scope: "company" },
    commitment: { listKey: "Commitment", scope: "project" },
    approvedBy: { listKey: "User", scope: "user" },
    voidedBy: { listKey: "User", scope: "user" },
  },
  PrimeContract: {
    client: { listKey: "TradePartner", scope: "company" },
    contractManager: { listKey: "User", scope: "user" },
  },
  Commitment: {
    tradePartner: { listKey: "TradePartner", scope: "company" },
    contractManager: { listKey: "User", scope: "user" },
  },
  ContractLineItem: {
    primeContract: { listKey: "PrimeContract", scope: "project" },
    commitment: { listKey: "Commitment", scope: "project" },
    budgetCode: { listKey: "BudgetCode", scope: "project" },
  },
  ChangeEvent: {
    owner: { listKey: "User", scope: "user" },
    sourceRfi: { listKey: "RFI", scope: "project" },
  },
  ChangeEventLineItem: {
    changeEvent: { listKey: "ChangeEvent", scope: "project" },
    budgetCode: { listKey: "BudgetCode", scope: "project" },
  },
  ChangeQuote: {
    changeEvent: { listKey: "ChangeEvent", scope: "project" },
    changeEventLineItem: { listKey: "ChangeEventLineItem", scope: "project" },
    tradePartner: { listKey: "TradePartner", scope: "company" },
  },
  ChangeOrder: {
    requestedBy: { listKey: "User", scope: "user" },
    approvedBy: { listKey: "User", scope: "user" },
    primeContract: { listKey: "PrimeContract", scope: "project" },
    commitment: { listKey: "Commitment", scope: "project" },
    changeEvents: { listKey: "ChangeEvent", scope: "project" },
  },
  ChangeOrderLineItem: {
    changeOrder: { listKey: "ChangeOrder", scope: "project" },
    contractLineItem: { listKey: "ContractLineItem", scope: "project" },
    changeEventLineItem: { listKey: "ChangeEventLineItem", scope: "project" },
    budgetCode: { listKey: "BudgetCode", scope: "project" },
  },
  RFI: {
    raisedBy: { listKey: "User", scope: "user" },
    ballInCourt: { listKey: "User", scope: "user" },
    responsiblePartner: { listKey: "TradePartner", scope: "company" },
    location: { listKey: "ProjectLocation", scope: "project" },
    specificationSection: { listKey: "SpecificationSection", scope: "project" },
    drawingRevision: { listKey: "DrawingRevision", scope: "project" },
  },
  RFIResponse: {
    rfi: { listKey: "RFI", scope: "project" },
    author: { listKey: "User", scope: "user" },
    onBehalfOf: { listKey: "TradePartner", scope: "company" },
  },
  Submittal: {
    specificationSection: { listKey: "SpecificationSection", scope: "project" },
    responsiblePartner: { listKey: "TradePartner", scope: "company" },
    submitter: { listKey: "User", scope: "user" },
    submittalManager: { listKey: "User", scope: "user" },
    ballInCourt: { listKey: "User", scope: "user" },
    documents: { listKey: "Document", scope: "project" },
  },
  SubmittalReview: {
    submittal: { listKey: "Submittal", scope: "project" },
    reviewer: { listKey: "User", scope: "user" },
    reviewerPartner: { listKey: "TradePartner", scope: "company" },
  },
  Drawing: { currentRevision: { listKey: "DrawingRevision", scope: "project" } },
  DrawingRevision: {
    drawing: { listKey: "Drawing", scope: "project" },
    uploadedBy: { listKey: "User", scope: "user" },
  },
  Document: {
    currentVersion: { listKey: "DocumentVersion", scope: "project" },
    submittals: { listKey: "Submittal", scope: "project" },
    dailyLogEntries: { listKey: "DailyLogEntry", scope: "project" },
  },
  DocumentVersion: {
    document: { listKey: "Document", scope: "project" },
    uploadedBy: { listKey: "User", scope: "user" },
  },
  DailyLog: {
    preparedBy: { listKey: "User", scope: "user" },
    approvedBy: { listKey: "User", scope: "user" },
  },
  DailyLogEntry: {
    dailyLog: { listKey: "DailyLog", scope: "project" },
    location: { listKey: "ProjectLocation", scope: "project" },
    tradePartner: { listKey: "TradePartner", scope: "company" },
    equipment: { listKey: "Equipment", scope: "company" },
    material: { listKey: "Material", scope: "company" },
    safetyIncident: { listKey: "SafetyIncident", scope: "project" },
    inspection: { listKey: "Inspection", scope: "project" },
    scheduleTask: { listKey: "ScheduleTask", scope: "project" },
    documents: { listKey: "Document", scope: "project" },
  },
  Schedule: { publishedBy: { listKey: "User", scope: "user" } },
  ScheduleTask: {
    schedule: { listKey: "Schedule", scope: "project" },
    parent: { listKey: "ScheduleTask", scope: "project" },
    location: { listKey: "ProjectLocation", scope: "project" },
    responsiblePartner: { listKey: "TradePartner", scope: "company" },
    assignedTo: { listKey: "User", scope: "user" },
  },
  ScheduleDependency: {
    schedule: { listKey: "Schedule", scope: "project" },
    predecessor: { listKey: "ScheduleTask", scope: "project" },
    successor: { listKey: "ScheduleTask", scope: "project" },
  },
  PunchItem: {
    createdBy: { listKey: "User", scope: "user" },
    assignedTo: { listKey: "User", scope: "user" },
    responsiblePartner: { listKey: "TradePartner", scope: "company" },
    location: { listKey: "ProjectLocation", scope: "project" },
    drawingRevision: { listKey: "DrawingRevision", scope: "project" },
    inspectionItem: { listKey: "InspectionItem", scope: "project" },
  },
  LaborEntry: {
    worker: { listKey: "User", scope: "user" },
    tradePartner: { listKey: "TradePartner", scope: "company" },
    budgetCode: { listKey: "BudgetCode", scope: "project" },
    dailyLog: { listKey: "DailyLog", scope: "project" },
    scheduleTask: { listKey: "ScheduleTask", scope: "project" },
    approvedBy: { listKey: "User", scope: "user" },
  },
  ResourceLog: {
    equipment: { listKey: "Equipment", scope: "company" },
    material: { listKey: "Material", scope: "company" },
    budgetCode: { listKey: "BudgetCode", scope: "project" },
    dailyLog: { listKey: "DailyLog", scope: "project" },
    location: { listKey: "ProjectLocation", scope: "project" },
    operator: { listKey: "User", scope: "user" },
    tradePartner: { listKey: "TradePartner", scope: "company" },
  },
  SafetyIncident: {
    reportedBy: { listKey: "User", scope: "user" },
    investigator: { listKey: "User", scope: "user" },
    responsiblePartner: { listKey: "TradePartner", scope: "company" },
    location: { listKey: "ProjectLocation", scope: "project" },
  },
  SafetyObservation: {
    observedBy: { listKey: "User", scope: "user" },
    assignedTo: { listKey: "User", scope: "user" },
    responsiblePartner: { listKey: "TradePartner", scope: "company" },
    location: { listKey: "ProjectLocation", scope: "project" },
  },
  Inspection: {
    template: { listKey: "InspectionTemplate", scope: "project" },
    inspector: { listKey: "User", scope: "user" },
    responsiblePartner: { listKey: "TradePartner", scope: "company" },
    location: { listKey: "ProjectLocation", scope: "project" },
    specificationSection: { listKey: "SpecificationSection", scope: "project" },
  },
  InspectionItem: {
    inspection: { listKey: "Inspection", scope: "project" },
    assignedTo: { listKey: "User", scope: "user" },
  },
  CorrectiveAction: {
    assignedTo: { listKey: "User", scope: "user" },
    verifiedBy: { listKey: "User", scope: "user" },
    responsiblePartner: { listKey: "TradePartner", scope: "company" },
    safetyIncident: { listKey: "SafetyIncident", scope: "project" },
    safetyObservation: { listKey: "SafetyObservation", scope: "project" },
    inspectionItem: { listKey: "InspectionItem", scope: "project" },
    punchItem: { listKey: "PunchItem", scope: "project" },
  },
  ProgressClaim: {
    tradePartner: { listKey: "TradePartner", scope: "company" },
    primeContract: { listKey: "PrimeContract", scope: "project" },
    commitment: { listKey: "Commitment", scope: "project" },
    submittedBy: { listKey: "User", scope: "user" },
    reviewedBy: { listKey: "User", scope: "user" },
  },
  ProgressClaimLineItem: {
    progressClaim: { listKey: "ProgressClaim", scope: "project" },
    contractLineItem: { listKey: "ContractLineItem", scope: "project" },
  },
  Payment: {
    tradePartner: { listKey: "TradePartner", scope: "company" },
    recordedBy: { listKey: "User", scope: "user" },
  },
  PaymentReversal: {
    payment: { listKey: "Payment", scope: "project" },
    reversedBy: { listKey: "User", scope: "user" },
  },
  PaymentAllocation: {
    payment: { listKey: "Payment", scope: "project" },
    progressClaim: { listKey: "ProgressClaim", scope: "project" },
  },
  RetainageRelease: {
    progressClaim: { listKey: "ProgressClaim", scope: "project" },
    progressClaimLineItem: { listKey: "ProgressClaimLineItem", scope: "project" },
    payment: { listKey: "Payment", scope: "project" },
    approvedBy: { listKey: "User", scope: "user" },
  },
  LienWaiver: {
    tradePartner: { listKey: "TradePartner", scope: "company" },
    commitment: { listKey: "Commitment", scope: "project" },
    progressClaim: { listKey: "ProgressClaim", scope: "project" },
    payment: { listKey: "Payment", scope: "project" },
    reviewedBy: { listKey: "User", scope: "user" },
  },
  ProcurementRequest: {
    requestedBy: { listKey: "User", scope: "user" },
    approvedBy: { listKey: "User", scope: "user" },
    tradePartner: { listKey: "TradePartner", scope: "company" },
    commitment: { listKey: "Commitment", scope: "project" },
  },
  ProcurementRequestLine: {
    request: { listKey: "ProcurementRequest", scope: "project" },
    budgetCode: { listKey: "BudgetCode", scope: "project" },
    material: { listKey: "Material", scope: "company" },
  },
  MaterialReceipt: {
    request: { listKey: "ProcurementRequest", scope: "project" },
    commitment: { listKey: "Commitment", scope: "project" },
    tradePartner: { listKey: "TradePartner", scope: "company" },
    receivedBy: { listKey: "User", scope: "user" },
  },
  MaterialReceiptLine: {
    receipt: { listKey: "MaterialReceipt", scope: "project" },
    requestLine: { listKey: "ProcurementRequestLine", scope: "project" },
    material: { listKey: "Material", scope: "company" },
  },
  AccountInvitation: {
    invitedBy: { listKey: "User", scope: "user" },
    user: { listKey: "User", scope: "invitedUser" },
    projectMembership: { listKey: "ProjectMembership", scope: "projectMembership" },
  },
  ApprovalRequest: {
    policy: { listKey: "ApprovalPolicy", scope: "company" },
    requestedBy: { listKey: "User", scope: "user" },
  },
  ApprovalDecision: {
    request: { listKey: "ApprovalRequest", scope: "project" },
    decidedBy: { listKey: "User", scope: "user" },
  },
  DocumentDistribution: {
    documentVersion: { listKey: "DocumentVersion", scope: "project" },
    distributedBy: { listKey: "User", scope: "user" },
  },
  DocumentAcknowledgement: {
    distribution: { listKey: "DocumentDistribution", scope: "project" },
    acknowledgedBy: { listKey: "User", scope: "user" },
  },
};

function assertRequiredRelationships(
  listKey: string,
  operation: "create" | "update",
  resolvedData: Record<string, unknown>,
) {
  for (const field of requiredProjectRelationships[listKey] ?? []) {
    const value = resolvedData[field];
    if (operation === "create" && !getConnectedId(value)) {
      throw new Error(`${listKey}.${field} is required`);
    }
    if (operation === "update" && value && typeof value === "object" && (value as { disconnect?: boolean }).disconnect) {
      throw new Error(`${listKey}.${field} cannot be disconnected`);
    }
  }
}

async function validateRelatedTenantTargets(args: {
  listKey: string;
  resolvedData: Record<string, unknown>;
  context: KeystoneContextLike;
  projectId: string;
  companyId: string;
}) {
  for (const [field, target] of Object.entries(relatedTenantTargets[args.listKey] ?? {})) {
    const relatedIds = getConnectedIds(args.resolvedData[field]);
    for (const relatedId of relatedIds) {
      const query = target.scope === "project"
        ? "id company { id } project { id }"
        : target.scope === "user" || target.scope === "invitedUser"
          ? "id companyMemberships { status company { id } } projectMemberships { status project { id company { id } } }"
          : target.scope === "projectMembership"
            ? "id status project { id company { id } }"
            : "id company { id }";
      const related = await queryById(args.context, target.listKey, relatedId, query);
      if (!related) throw new Error(`${args.listKey}.${field} does not exist`);

      if (target.scope === "user" || target.scope === "invitedUser") {
        const allowedStatuses = target.scope === "invitedUser" ? ["active", "invited"] : ["active"];
        const companyMember = related.companyMemberships?.some(
          membership => allowedStatuses.includes(String(membership.status)) && membership.company?.id === args.companyId,
        );
        const projectMember = related.projectMemberships?.some(
          membership => allowedStatuses.includes(String(membership.status)) && membership.project?.id === args.projectId,
        );
        if (!companyMember && !projectMember) {
          throw new Error(`${args.listKey}.${field} must be an active member of the selected tenant`);
        }
        continue;
      }
      if (target.scope === "projectMembership") {
        if (!["active", "invited"].includes(String(related.status)) || related.project?.id !== args.projectId || related.project?.company?.id !== args.companyId) {
          throw new Error(`${args.listKey}.${field} must be an active or invited membership in the selected project`);
        }
        continue;
      }

      if (related.company?.id !== args.companyId) {
        throw new Error(`${args.listKey}.${field} must belong to the selected company`);
      }
      if (target.scope === "project" && related.project?.id !== args.projectId) {
        throw new Error(`${args.listKey}.${field} must belong to the selected project`);
      }
    }
  }
}

export async function validateProjectRootRelationships(args: {
  operation: "create" | "update";
  resolvedData: Record<string, unknown>;
  item?: { id: { toString(): string } } | null;
  context: KeystoneContextLike;
  addValidationError(message: string): void;
}) {
  let companyId = getConnectedId(args.resolvedData.company);
  let projectId = args.item?.id.toString() ?? "new-project";
  if (!companyId && args.operation === "update" && args.item?.id) {
    const current = await queryById(args.context, "Project", args.item.id.toString(), "id company { id }");
    companyId = current?.company?.id ?? null;
    projectId = current?.id ?? projectId;
  }
  if (!companyId) {
    args.addValidationError("Project company is required");
    return;
  }
  try {
    await validateRelatedTenantTargets({
      listKey: "Project",
      resolvedData: args.resolvedData,
      context: args.context,
      projectId,
      companyId,
    });
  } catch (error) {
    args.addValidationError(error instanceof Error ? error.message : "Project relationship is outside the selected tenant");
  }
}

export function projectTenantHooks() {
  return {
    resolveInput: async ({
      listKey,
      operation,
      resolvedData,
      context,
      item,
    }: ProjectTenantResolveInputArgs) => {
      assertRequiredRelationships(listKey, operation, resolvedData);
      const connectedProjectId = getConnectedId(resolvedData.project);
      if (!connectedProjectId && operation === "create") {
        throw new Error("A project relationship is required");
      }

      let projectId = connectedProjectId;
      let companyId = projectId ? await getProjectCompanyId(context, projectId) : null;
      const hasRelatedChange = Object.keys(relatedTenantTargets[listKey] ?? {})
        .some(field => getConnectedId(resolvedData[field]));

      if (!projectId && hasRelatedChange && item?.id) {
        const current = await queryById(
          context,
          listKey,
          item.id.toString(),
          "id company { id } project { id }",
        );
        projectId = current?.project?.id ?? null;
        companyId = current?.company?.id ?? null;
      }

      if (!projectId || !companyId) {
        if (connectedProjectId) throw new Error("The selected project does not exist");
        if (hasRelatedChange) throw new Error(`${listKey} is missing tenant relationships`);
        return resolvedData;
      }

      await validateRelatedTenantTargets({
        listKey,
        resolvedData,
        context,
        projectId,
        companyId,
      });

      return connectedProjectId
        ? { ...resolvedData, company: { connect: { id: companyId } } }
        : resolvedData;
    },
  };
}

export function projectTenantKeyHooks(options: {
  parentField: string;
  valueField: string;
  keyField: string;
}) {
  const tenantHooks = projectTenantHooks();
  return {
    resolveInput: async (args: ProjectTenantResolveInputArgs) => {
      const resolvedData = await tenantHooks.resolveInput(args);
      if (args.operation !== "create") return resolvedData;

      const parentId = getConnectedId(resolvedData[options.parentField]);
      const rawValue = resolvedData[options.valueField];
      if (!parentId || rawValue === null || rawValue === undefined || String(rawValue).trim() === "") {
        throw new Error(`${args.listKey} requires ${options.parentField} and ${options.valueField}`);
      }
      return {
        ...resolvedData,
        [options.keyField]: `${parentId}:${String(rawValue).trim().toLowerCase()}`,
      };
    },
  };
}
