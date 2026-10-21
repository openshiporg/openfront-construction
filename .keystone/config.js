"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// keystone.ts
var keystone_exports = {};
__export(keystone_exports, {
  default: () => keystone_default2
});
module.exports = __toCommonJS(keystone_exports);

// features/keystone/index.ts
var import_auth = require("@keystone-6/auth");
var import_core18 = require("@keystone-6/core");
var import_config = require("dotenv/config");

// features/keystone/domain/scopes.ts
var CONSTRUCTION_SCOPES = [
  "companies:read",
  "companies:write",
  "projects:read",
  "projects:write",
  "preconstruction:read",
  "preconstruction:write",
  "financials:read",
  "financials:write",
  "contracts:read",
  "contracts:write",
  "execution:read",
  "execution:write",
  "documents:read",
  "documents:write",
  "field:read",
  "field:write",
  "safety:read",
  "safety:write",
  "billing:read",
  "billing:write",
  "agents:read",
  "agents:write",
  "agents:execute",
  "audit:read"
];
var scopeSet = new Set(CONSTRUCTION_SCOPES);
function normalizeScope(scope) {
  if (typeof scope !== "string" || scope.trim().length === 0) {
    throw new Error("Scope is required");
  }
  const normalized = scope.trim().toLowerCase();
  if (!scopeSet.has(normalized)) {
    throw new Error(`Unknown scope ${normalized}`);
  }
  return normalized;
}
function scopeAllows(granted, required3) {
  const normalizedGrant = normalizeScope(granted);
  const normalizedRequired = normalizeScope(required3);
  if (normalizedGrant === normalizedRequired) return true;
  const [grantDomain, grantVerb] = normalizedGrant.split(":");
  const [requiredDomain, requiredVerb] = normalizedRequired.split(":");
  return grantDomain === requiredDomain && grantVerb === "write" && requiredVerb === "read";
}
function scopeGrantMatches(grant, target) {
  if (grant.status !== "active") return false;
  if (grant.companyId !== target.companyId) return false;
  if (grant.projectId !== null && grant.projectId !== target.projectId) return false;
  if (!scopeAllows(grant.scope, target.requiredScope)) return false;
  if (grant.expiresAt) {
    const expiresAt = new Date(grant.expiresAt);
    const now = target.now ?? /* @__PURE__ */ new Date();
    if (!Number.isFinite(expiresAt.getTime()) || expiresAt <= now) return false;
  }
  return true;
}

// features/keystone/models/fields.ts
var import_access = require("@keystone-6/core/access");
var import_fields = require("@keystone-6/core/fields");

// features/keystone/domain/tenancy.ts
function getConnectedId(value) {
  return getConnectedIds(value)[0] ?? null;
}
function getConnectedIds(value) {
  if (!value || typeof value !== "object") return [];
  const connect2 = value.connect;
  const connections = Array.isArray(connect2) ? connect2 : connect2 ? [connect2] : [];
  return connections.flatMap((connection) => {
    if (!connection || typeof connection !== "object") return [];
    const id = connection.id;
    return typeof id === "string" && id.length > 0 ? [id] : [];
  });
}
function credentialAllowsProject(session, companyId, projectId2) {
  if (session.authType !== "api_key") return true;
  return session.apiCredential?.companyId === companyId && (!session.apiCredential.projectId || session.apiCredential.projectId === projectId2);
}
function restrictCompanyFilter(session, filter) {
  if (session.authType !== "api_key") return filter;
  const companyId = session.apiCredential?.companyId;
  return companyId ? { AND: [filter, { id: { equals: companyId } }] } : false;
}
function restrictProjectFilter(session, filter) {
  if (session.authType !== "api_key") return filter;
  const companyId = session.apiCredential?.companyId;
  if (!companyId) return false;
  return {
    AND: [
      filter,
      { company: { id: { equals: companyId } } },
      ...session.apiCredential?.projectId ? [{ id: { equals: session.apiCredential.projectId } }] : []
    ]
  };
}
function restrictProjectRecordFilter(session, filter) {
  if (session.authType !== "api_key") return filter;
  const companyId = session.apiCredential?.companyId;
  if (!companyId) return false;
  return {
    AND: [
      filter,
      { company: { id: { equals: companyId } } },
      ...session.apiCredential?.projectId ? [{ project: { id: { equals: session.apiCredential.projectId } } }] : []
    ]
  };
}
function hasSessionProjectAccess(session, companyId, projectId2, requireWrite = false) {
  if (!session || !credentialAllowsProject(session, companyId, projectId2)) return false;
  const explicitMembership = session.data.projectMemberships?.find(
    (membership) => membership.status === "active" && membership.project?.id === projectId2 && membership.project.company?.id === companyId
  );
  if (explicitMembership) {
    return !requireWrite || explicitMembership.accessLevel === "contributor" || explicitMembership.accessLevel === "manager";
  }
  return Boolean(session.data.companyMemberships?.some(
    (membership) => membership.status === "active" && membership.canAccessAllProjects && membership.company?.id === companyId
  ));
}
function companyAccessFilter(session) {
  if (!session) return false;
  return restrictCompanyFilter(session, {
    memberships: { some: { user: { id: { equals: session.itemId } }, status: { equals: "active" } } }
  });
}
var readableProjects = (session) => ({
  OR: [
    { company: { memberships: { some: {
      user: { id: { equals: session.itemId } },
      status: { equals: "active" },
      canAccessAllProjects: { equals: true }
    } } } },
    { memberships: { some: { user: { id: { equals: session.itemId } }, status: { equals: "active" } } } }
  ]
});
var writableProjects = (session) => ({
  OR: [
    { AND: [
      { company: { memberships: { some: {
        user: { id: { equals: session.itemId } },
        status: { equals: "active" },
        canAccessAllProjects: { equals: true }
      } } } },
      { memberships: { none: {
        user: { id: { equals: session.itemId } },
        status: { equals: "active" }
      } } }
    ] },
    { memberships: { some: {
      user: { id: { equals: session.itemId } },
      status: { equals: "active" },
      accessLevel: { in: ["contributor", "manager"] },
      portalType: { equals: "internal" }
    } } }
  ]
});
var readableProjectRecords = (session) => ({
  OR: [
    { company: { memberships: { some: {
      user: { id: { equals: session.itemId } },
      status: { equals: "active" },
      canAccessAllProjects: { equals: true }
    } } } },
    { project: { memberships: { some: {
      user: { id: { equals: session.itemId } },
      status: { equals: "active" },
      portalType: { equals: "internal" }
    } } } }
  ]
});
var writableProjectRecords = (session) => ({
  OR: [
    { AND: [
      { company: { memberships: { some: {
        user: { id: { equals: session.itemId } },
        status: { equals: "active" },
        canAccessAllProjects: { equals: true }
      } } } },
      { project: { memberships: { none: {
        user: { id: { equals: session.itemId } },
        status: { equals: "active" }
      } } } }
    ] },
    { project: { memberships: { some: {
      user: { id: { equals: session.itemId } },
      status: { equals: "active" },
      accessLevel: { in: ["contributor", "manager"] },
      portalType: { equals: "internal" }
    } } } }
  ]
});
function projectAccessFilter(session) {
  return session ? restrictProjectFilter(session, readableProjects(session)) : false;
}
function writableProjectAccessFilter(session) {
  return session ? restrictProjectFilter(session, writableProjects(session)) : false;
}
function projectRecordAccessFilter(session) {
  return session ? restrictProjectRecordFilter(session, readableProjectRecords(session)) : false;
}
function writableProjectRecordAccessFilter(session) {
  return session ? restrictProjectRecordFilter(session, writableProjectRecords(session)) : false;
}
async function queryCount(context, listKey, where) {
  const count2 = context.sudo().query[listKey]?.count;
  if (!count2) throw new Error(`${listKey} count query is unavailable`);
  return count2({ where });
}
async function queryOne(context, listKey, where, query) {
  const findOne = context.sudo().query[listKey]?.findOne;
  if (!findOne) throw new Error(`${listKey} findOne query is unavailable`);
  return findOne({ where, query });
}
function queryById(context, listKey, id, query) {
  return queryOne(context, listKey, { id }, query);
}
async function canAccessCompanyById(context, userId, companyId, requireAllProjects = false) {
  const count2 = await queryCount(context, "CompanyMembership", {
    user: { id: { equals: userId } },
    company: { id: { equals: companyId } },
    status: { equals: "active" },
    ...requireAllProjects ? { canAccessAllProjects: { equals: true } } : {}
  });
  return count2 > 0;
}
async function canAccessProjectById(context, userId, projectId2, requireWrite = false) {
  const project = await queryById(context, "Project", projectId2, "id company { id }");
  const companyId = project?.company?.id;
  if (!companyId) return false;
  const membershipWhere = {
    user: { id: { equals: userId } },
    project: { id: { equals: projectId2 } },
    status: { equals: "active" }
  };
  const membershipApi = context.sudo().query.ProjectMembership;
  if (membershipApi?.findMany) {
    const [membership] = await membershipApi.findMany({
      where: membershipWhere,
      take: 1,
      query: "id status accessLevel portalType"
    });
    if (membership) {
      return !requireWrite || membership.portalType === "internal" && (membership.accessLevel === "contributor" || membership.accessLevel === "manager");
    }
  } else if (await queryCount(context, "ProjectMembership", {
    ...membershipWhere,
    ...requireWrite ? {
      accessLevel: { in: ["contributor", "manager"] },
      portalType: { equals: "internal" }
    } : {}
  }) > 0) {
    return true;
  }
  return canAccessCompanyById(context, userId, companyId, true);
}
async function getProjectCompanyId(context, projectId2) {
  const project = await queryById(context, "Project", projectId2, "id company { id }");
  return project?.company?.id ?? null;
}
var requiredProjectRelationships = {
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
  DocumentAcknowledgement: ["distribution", "acknowledgedBy"]
};
var relatedTenantTargets = {
  Project: {
    owner: { listKey: "TradePartner", scope: "company" },
    projectManager: { listKey: "User", scope: "user" },
    superintendent: { listKey: "User", scope: "user" }
  },
  ProjectLocation: { parent: { listKey: "ProjectLocation", scope: "project" } },
  BudgetCode: { costCode: { listKey: "CostCode", scope: "company" } },
  BidPackage: {
    bidManager: { listKey: "User", scope: "user" },
    awardedPartner: { listKey: "TradePartner", scope: "company" }
  },
  BidInvitation: {
    bidPackage: { listKey: "BidPackage", scope: "project" },
    budgetCode: { listKey: "BudgetCode", scope: "project" },
    tradePartner: { listKey: "TradePartner", scope: "company" },
    submission: { listKey: "BidSubmission", scope: "project" }
  },
  BidSubmission: {
    bidPackage: { listKey: "BidPackage", scope: "project" },
    invitation: { listKey: "BidInvitation", scope: "project" },
    tradePartner: { listKey: "TradePartner", scope: "company" },
    reviewedBy: { listKey: "User", scope: "user" }
  },
  BidLineItem: {
    submission: { listKey: "BidSubmission", scope: "project" },
    budgetCode: { listKey: "BudgetCode", scope: "project" }
  },
  Estimate: {
    estimator: { listKey: "User", scope: "user" },
    currentVersion: { listKey: "EstimateVersion", scope: "project" }
  },
  EstimateVersion: { estimate: { listKey: "Estimate", scope: "project" } },
  EstimateLineItem: {
    version: { listKey: "EstimateVersion", scope: "project" },
    budgetCode: { listKey: "BudgetCode", scope: "project" }
  },
  BudgetLineItem: {
    budget: { listKey: "Budget", scope: "project" },
    budgetCode: { listKey: "BudgetCode", scope: "project" }
  },
  Budget: { approvedBy: { listKey: "User", scope: "user" } },
  BudgetChange: {
    budget: { listKey: "Budget", scope: "project" },
    requestedBy: { listKey: "User", scope: "user" },
    reviewedBy: { listKey: "User", scope: "user" },
    sourceChangeEvent: { listKey: "ChangeEvent", scope: "project" }
  },
  BudgetChangeLineItem: {
    budgetChange: { listKey: "BudgetChange", scope: "project" },
    budgetLineItem: { listKey: "BudgetLineItem", scope: "project" },
    budgetCode: { listKey: "BudgetCode", scope: "project" },
    changeEventLineItem: { listKey: "ChangeEventLineItem", scope: "project" }
  },
  DirectCost: {
    budgetCode: { listKey: "BudgetCode", scope: "project" },
    tradePartner: { listKey: "TradePartner", scope: "company" },
    commitment: { listKey: "Commitment", scope: "project" },
    approvedBy: { listKey: "User", scope: "user" },
    voidedBy: { listKey: "User", scope: "user" }
  },
  PrimeContract: {
    client: { listKey: "TradePartner", scope: "company" },
    contractManager: { listKey: "User", scope: "user" }
  },
  Commitment: {
    tradePartner: { listKey: "TradePartner", scope: "company" },
    contractManager: { listKey: "User", scope: "user" }
  },
  ContractLineItem: {
    primeContract: { listKey: "PrimeContract", scope: "project" },
    commitment: { listKey: "Commitment", scope: "project" },
    budgetCode: { listKey: "BudgetCode", scope: "project" }
  },
  ChangeEvent: {
    owner: { listKey: "User", scope: "user" },
    sourceRfi: { listKey: "RFI", scope: "project" }
  },
  ChangeEventLineItem: {
    changeEvent: { listKey: "ChangeEvent", scope: "project" },
    budgetCode: { listKey: "BudgetCode", scope: "project" }
  },
  ChangeQuote: {
    changeEvent: { listKey: "ChangeEvent", scope: "project" },
    changeEventLineItem: { listKey: "ChangeEventLineItem", scope: "project" },
    tradePartner: { listKey: "TradePartner", scope: "company" }
  },
  ChangeOrder: {
    requestedBy: { listKey: "User", scope: "user" },
    approvedBy: { listKey: "User", scope: "user" },
    primeContract: { listKey: "PrimeContract", scope: "project" },
    commitment: { listKey: "Commitment", scope: "project" },
    changeEvents: { listKey: "ChangeEvent", scope: "project" }
  },
  ChangeOrderLineItem: {
    changeOrder: { listKey: "ChangeOrder", scope: "project" },
    contractLineItem: { listKey: "ContractLineItem", scope: "project" },
    changeEventLineItem: { listKey: "ChangeEventLineItem", scope: "project" },
    budgetCode: { listKey: "BudgetCode", scope: "project" }
  },
  RFI: {
    raisedBy: { listKey: "User", scope: "user" },
    ballInCourt: { listKey: "User", scope: "user" },
    responsiblePartner: { listKey: "TradePartner", scope: "company" },
    location: { listKey: "ProjectLocation", scope: "project" },
    specificationSection: { listKey: "SpecificationSection", scope: "project" },
    drawingRevision: { listKey: "DrawingRevision", scope: "project" }
  },
  RFIResponse: {
    rfi: { listKey: "RFI", scope: "project" },
    author: { listKey: "User", scope: "user" },
    onBehalfOf: { listKey: "TradePartner", scope: "company" }
  },
  Submittal: {
    specificationSection: { listKey: "SpecificationSection", scope: "project" },
    responsiblePartner: { listKey: "TradePartner", scope: "company" },
    submitter: { listKey: "User", scope: "user" },
    submittalManager: { listKey: "User", scope: "user" },
    ballInCourt: { listKey: "User", scope: "user" },
    documents: { listKey: "Document", scope: "project" }
  },
  SubmittalReview: {
    submittal: { listKey: "Submittal", scope: "project" },
    reviewer: { listKey: "User", scope: "user" },
    reviewerPartner: { listKey: "TradePartner", scope: "company" }
  },
  Drawing: { currentRevision: { listKey: "DrawingRevision", scope: "project" } },
  DrawingRevision: {
    drawing: { listKey: "Drawing", scope: "project" },
    uploadedBy: { listKey: "User", scope: "user" }
  },
  Document: {
    currentVersion: { listKey: "DocumentVersion", scope: "project" },
    submittals: { listKey: "Submittal", scope: "project" },
    dailyLogEntries: { listKey: "DailyLogEntry", scope: "project" }
  },
  DocumentVersion: {
    document: { listKey: "Document", scope: "project" },
    uploadedBy: { listKey: "User", scope: "user" }
  },
  DailyLog: {
    preparedBy: { listKey: "User", scope: "user" },
    approvedBy: { listKey: "User", scope: "user" }
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
    documents: { listKey: "Document", scope: "project" }
  },
  Schedule: { publishedBy: { listKey: "User", scope: "user" } },
  ScheduleTask: {
    schedule: { listKey: "Schedule", scope: "project" },
    parent: { listKey: "ScheduleTask", scope: "project" },
    location: { listKey: "ProjectLocation", scope: "project" },
    responsiblePartner: { listKey: "TradePartner", scope: "company" },
    assignedTo: { listKey: "User", scope: "user" }
  },
  ScheduleDependency: {
    schedule: { listKey: "Schedule", scope: "project" },
    predecessor: { listKey: "ScheduleTask", scope: "project" },
    successor: { listKey: "ScheduleTask", scope: "project" }
  },
  PunchItem: {
    createdBy: { listKey: "User", scope: "user" },
    assignedTo: { listKey: "User", scope: "user" },
    responsiblePartner: { listKey: "TradePartner", scope: "company" },
    location: { listKey: "ProjectLocation", scope: "project" },
    drawingRevision: { listKey: "DrawingRevision", scope: "project" },
    inspectionItem: { listKey: "InspectionItem", scope: "project" }
  },
  LaborEntry: {
    worker: { listKey: "User", scope: "user" },
    tradePartner: { listKey: "TradePartner", scope: "company" },
    budgetCode: { listKey: "BudgetCode", scope: "project" },
    dailyLog: { listKey: "DailyLog", scope: "project" },
    scheduleTask: { listKey: "ScheduleTask", scope: "project" },
    approvedBy: { listKey: "User", scope: "user" }
  },
  ResourceLog: {
    equipment: { listKey: "Equipment", scope: "company" },
    material: { listKey: "Material", scope: "company" },
    budgetCode: { listKey: "BudgetCode", scope: "project" },
    dailyLog: { listKey: "DailyLog", scope: "project" },
    location: { listKey: "ProjectLocation", scope: "project" },
    operator: { listKey: "User", scope: "user" },
    tradePartner: { listKey: "TradePartner", scope: "company" }
  },
  SafetyIncident: {
    reportedBy: { listKey: "User", scope: "user" },
    investigator: { listKey: "User", scope: "user" },
    responsiblePartner: { listKey: "TradePartner", scope: "company" },
    location: { listKey: "ProjectLocation", scope: "project" }
  },
  SafetyObservation: {
    observedBy: { listKey: "User", scope: "user" },
    assignedTo: { listKey: "User", scope: "user" },
    responsiblePartner: { listKey: "TradePartner", scope: "company" },
    location: { listKey: "ProjectLocation", scope: "project" }
  },
  Inspection: {
    template: { listKey: "InspectionTemplate", scope: "project" },
    inspector: { listKey: "User", scope: "user" },
    responsiblePartner: { listKey: "TradePartner", scope: "company" },
    location: { listKey: "ProjectLocation", scope: "project" },
    specificationSection: { listKey: "SpecificationSection", scope: "project" }
  },
  InspectionItem: {
    inspection: { listKey: "Inspection", scope: "project" },
    assignedTo: { listKey: "User", scope: "user" }
  },
  CorrectiveAction: {
    assignedTo: { listKey: "User", scope: "user" },
    verifiedBy: { listKey: "User", scope: "user" },
    responsiblePartner: { listKey: "TradePartner", scope: "company" },
    safetyIncident: { listKey: "SafetyIncident", scope: "project" },
    safetyObservation: { listKey: "SafetyObservation", scope: "project" },
    inspectionItem: { listKey: "InspectionItem", scope: "project" },
    punchItem: { listKey: "PunchItem", scope: "project" }
  },
  ProgressClaim: {
    tradePartner: { listKey: "TradePartner", scope: "company" },
    primeContract: { listKey: "PrimeContract", scope: "project" },
    commitment: { listKey: "Commitment", scope: "project" },
    submittedBy: { listKey: "User", scope: "user" },
    reviewedBy: { listKey: "User", scope: "user" }
  },
  ProgressClaimLineItem: {
    progressClaim: { listKey: "ProgressClaim", scope: "project" },
    contractLineItem: { listKey: "ContractLineItem", scope: "project" }
  },
  Payment: {
    tradePartner: { listKey: "TradePartner", scope: "company" },
    recordedBy: { listKey: "User", scope: "user" }
  },
  PaymentReversal: {
    payment: { listKey: "Payment", scope: "project" },
    reversedBy: { listKey: "User", scope: "user" }
  },
  PaymentAllocation: {
    payment: { listKey: "Payment", scope: "project" },
    progressClaim: { listKey: "ProgressClaim", scope: "project" }
  },
  RetainageRelease: {
    progressClaim: { listKey: "ProgressClaim", scope: "project" },
    progressClaimLineItem: { listKey: "ProgressClaimLineItem", scope: "project" },
    payment: { listKey: "Payment", scope: "project" },
    approvedBy: { listKey: "User", scope: "user" }
  },
  LienWaiver: {
    tradePartner: { listKey: "TradePartner", scope: "company" },
    commitment: { listKey: "Commitment", scope: "project" },
    progressClaim: { listKey: "ProgressClaim", scope: "project" },
    payment: { listKey: "Payment", scope: "project" },
    reviewedBy: { listKey: "User", scope: "user" }
  },
  ProcurementRequest: {
    requestedBy: { listKey: "User", scope: "user" },
    approvedBy: { listKey: "User", scope: "user" },
    tradePartner: { listKey: "TradePartner", scope: "company" },
    commitment: { listKey: "Commitment", scope: "project" }
  },
  ProcurementRequestLine: {
    request: { listKey: "ProcurementRequest", scope: "project" },
    budgetCode: { listKey: "BudgetCode", scope: "project" },
    material: { listKey: "Material", scope: "company" }
  },
  MaterialReceipt: {
    request: { listKey: "ProcurementRequest", scope: "project" },
    commitment: { listKey: "Commitment", scope: "project" },
    tradePartner: { listKey: "TradePartner", scope: "company" },
    receivedBy: { listKey: "User", scope: "user" }
  },
  MaterialReceiptLine: {
    receipt: { listKey: "MaterialReceipt", scope: "project" },
    requestLine: { listKey: "ProcurementRequestLine", scope: "project" },
    material: { listKey: "Material", scope: "company" }
  },
  AccountInvitation: {
    invitedBy: { listKey: "User", scope: "user" },
    user: { listKey: "User", scope: "invitedUser" },
    projectMembership: { listKey: "ProjectMembership", scope: "projectMembership" }
  },
  ApprovalRequest: {
    policy: { listKey: "ApprovalPolicy", scope: "company" },
    requestedBy: { listKey: "User", scope: "user" }
  },
  ApprovalDecision: {
    request: { listKey: "ApprovalRequest", scope: "project" },
    decidedBy: { listKey: "User", scope: "user" }
  },
  DocumentDistribution: {
    documentVersion: { listKey: "DocumentVersion", scope: "project" },
    distributedBy: { listKey: "User", scope: "user" }
  },
  DocumentAcknowledgement: {
    distribution: { listKey: "DocumentDistribution", scope: "project" },
    acknowledgedBy: { listKey: "User", scope: "user" }
  }
};
function assertRequiredRelationships(listKey, operation, resolvedData) {
  for (const field of requiredProjectRelationships[listKey] ?? []) {
    const value = resolvedData[field];
    if (operation === "create" && !getConnectedId(value)) {
      throw new Error(`${listKey}.${field} is required`);
    }
    if (operation === "update" && value && typeof value === "object" && value.disconnect) {
      throw new Error(`${listKey}.${field} cannot be disconnected`);
    }
  }
}
async function validateRelatedTenantTargets(args) {
  for (const [field, target] of Object.entries(relatedTenantTargets[args.listKey] ?? {})) {
    const relatedIds = getConnectedIds(args.resolvedData[field]);
    for (const relatedId of relatedIds) {
      const query = target.scope === "project" ? "id company { id } project { id }" : target.scope === "user" || target.scope === "invitedUser" ? "id companyMemberships { status company { id } } projectMemberships { status project { id company { id } } }" : target.scope === "projectMembership" ? "id status project { id company { id } }" : "id company { id }";
      const related3 = await queryById(args.context, target.listKey, relatedId, query);
      if (!related3) throw new Error(`${args.listKey}.${field} does not exist`);
      if (target.scope === "user" || target.scope === "invitedUser") {
        const allowedStatuses = target.scope === "invitedUser" ? ["active", "invited"] : ["active"];
        const companyMember = related3.companyMemberships?.some(
          (membership) => allowedStatuses.includes(String(membership.status)) && membership.company?.id === args.companyId
        );
        const projectMember = related3.projectMemberships?.some(
          (membership) => allowedStatuses.includes(String(membership.status)) && membership.project?.id === args.projectId
        );
        if (!companyMember && !projectMember) {
          throw new Error(`${args.listKey}.${field} must be an active member of the selected tenant`);
        }
        continue;
      }
      if (target.scope === "projectMembership") {
        if (!["active", "invited"].includes(String(related3.status)) || related3.project?.id !== args.projectId || related3.project?.company?.id !== args.companyId) {
          throw new Error(`${args.listKey}.${field} must be an active or invited membership in the selected project`);
        }
        continue;
      }
      if (related3.company?.id !== args.companyId) {
        throw new Error(`${args.listKey}.${field} must belong to the selected company`);
      }
      if (target.scope === "project" && related3.project?.id !== args.projectId) {
        throw new Error(`${args.listKey}.${field} must belong to the selected project`);
      }
    }
  }
}
async function validateProjectRootRelationships(args) {
  let companyId = getConnectedId(args.resolvedData.company);
  let projectId2 = args.item?.id.toString() ?? "new-project";
  if (!companyId && args.operation === "update" && args.item?.id) {
    const current = await queryById(args.context, "Project", args.item.id.toString(), "id company { id }");
    companyId = current?.company?.id ?? null;
    projectId2 = current?.id ?? projectId2;
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
      projectId: projectId2,
      companyId
    });
  } catch (error) {
    args.addValidationError(error instanceof Error ? error.message : "Project relationship is outside the selected tenant");
  }
}
function projectTenantHooks() {
  return {
    resolveInput: async ({
      listKey,
      operation,
      resolvedData,
      context,
      item: item3
    }) => {
      assertRequiredRelationships(listKey, operation, resolvedData);
      const connectedProjectId = getConnectedId(resolvedData.project);
      if (!connectedProjectId && operation === "create") {
        throw new Error("A project relationship is required");
      }
      let projectId2 = connectedProjectId;
      let companyId = projectId2 ? await getProjectCompanyId(context, projectId2) : null;
      const hasRelatedChange = Object.keys(relatedTenantTargets[listKey] ?? {}).some((field) => getConnectedId(resolvedData[field]));
      if (!projectId2 && hasRelatedChange && item3?.id) {
        const current = await queryById(
          context,
          listKey,
          item3.id.toString(),
          "id company { id } project { id }"
        );
        projectId2 = current?.project?.id ?? null;
        companyId = current?.company?.id ?? null;
      }
      if (!projectId2 || !companyId) {
        if (connectedProjectId) throw new Error("The selected project does not exist");
        if (hasRelatedChange) throw new Error(`${listKey} is missing tenant relationships`);
        return resolvedData;
      }
      await validateRelatedTenantTargets({
        listKey,
        resolvedData,
        context,
        projectId: projectId2,
        companyId
      });
      return connectedProjectId ? { ...resolvedData, company: { connect: { id: companyId } } } : resolvedData;
    }
  };
}
function projectTenantKeyHooks(options) {
  const tenantHooks = projectTenantHooks();
  return {
    resolveInput: async (args) => {
      const resolvedData = await tenantHooks.resolveInput(args);
      if (args.operation !== "create") return resolvedData;
      const parentId = getConnectedId(resolvedData[options.parentField]);
      const rawValue = resolvedData[options.valueField];
      if (!parentId || rawValue === null || rawValue === void 0 || String(rawValue).trim() === "") {
        throw new Error(`${args.listKey} requires ${options.parentField} and ${options.valueField}`);
      }
      return {
        ...resolvedData,
        [options.keyField]: `${parentId}:${String(rawValue).trim().toLowerCase()}`
      };
    }
  };
}

// features/keystone/models/fields.ts
var permissionFields = {
  canAccessDashboard: (0, import_fields.checkbox)({ defaultValue: false }),
  canReadCompanies: (0, import_fields.checkbox)({ defaultValue: false }),
  canManageCompanies: (0, import_fields.checkbox)({ defaultValue: false }),
  canReadPeople: (0, import_fields.checkbox)({ defaultValue: false }),
  canManagePeople: (0, import_fields.checkbox)({ defaultValue: false }),
  canReadProjects: (0, import_fields.checkbox)({ defaultValue: false }),
  canManageProjects: (0, import_fields.checkbox)({ defaultValue: false }),
  canReadPreconstruction: (0, import_fields.checkbox)({ defaultValue: false }),
  canManagePreconstruction: (0, import_fields.checkbox)({ defaultValue: false }),
  canReadFinancials: (0, import_fields.checkbox)({ defaultValue: false }),
  canManageFinancials: (0, import_fields.checkbox)({ defaultValue: false }),
  canReadContracts: (0, import_fields.checkbox)({ defaultValue: false }),
  canManageContracts: (0, import_fields.checkbox)({ defaultValue: false }),
  canReadProjectExecution: (0, import_fields.checkbox)({ defaultValue: false }),
  canManageProjectExecution: (0, import_fields.checkbox)({ defaultValue: false }),
  canReadDocuments: (0, import_fields.checkbox)({ defaultValue: false }),
  canManageDocuments: (0, import_fields.checkbox)({ defaultValue: false }),
  canReadFieldOperations: (0, import_fields.checkbox)({ defaultValue: false }),
  canManageFieldOperations: (0, import_fields.checkbox)({ defaultValue: false }),
  canReadSafety: (0, import_fields.checkbox)({ defaultValue: false }),
  canManageSafety: (0, import_fields.checkbox)({ defaultValue: false }),
  canReadBilling: (0, import_fields.checkbox)({ defaultValue: false }),
  canManageBilling: (0, import_fields.checkbox)({ defaultValue: false }),
  canReadAgents: (0, import_fields.checkbox)({ defaultValue: false }),
  canManageAgents: (0, import_fields.checkbox)({ defaultValue: false }),
  canReadAudit: (0, import_fields.checkbox)({ defaultValue: false }),
  canManageRoles: (0, import_fields.checkbox)({ defaultValue: false }),
  canManageSettings: (0, import_fields.checkbox)({ defaultValue: false }),
  canManageOnboarding: (0, import_fields.checkbox)({ defaultValue: false })
};
var permissionsList = Object.keys(permissionFields);
function lifecycleStatus(options, defaultValue) {
  return (0, import_fields.select)({
    type: "enum",
    options: [...options],
    defaultValue,
    validation: { isRequired: true },
    access: { update: import_access.denyAll },
    ui: {
      itemView: { fieldMode: "read" },
      createView: { fieldMode: "hidden" }
    }
  });
}
function currencyCodeField() {
  return (0, import_fields.text)({
    defaultValue: "USD",
    validation: { isRequired: true, length: { min: 3, max: 3 } }
  });
}
function basisPointsField(defaultValue = 0) {
  return (0, import_fields.integer)({
    defaultValue,
    validation: { min: 0, max: 1e4 }
  });
}
function moneyField(options = {}) {
  return (0, import_fields.bigInt)({
    defaultValue: options.positive ? void 0 : BigInt(0),
    validation: { isRequired: options.positive },
    ...options.positive || options.nonNegative ? {
      hooks: {
        validate: ({ resolvedData, fieldKey, addValidationError }) => {
          const value = resolvedData?.[fieldKey];
          if (value === null || value === void 0) return;
          const minimum = options.positive ? BigInt(1) : BigInt(0);
          if (value < minimum) {
            addValidationError(options.positive ? "Amount must be greater than zero" : "Amount cannot be negative");
          }
        }
      }
    } : {},
    ...options.immutable ? { access: { update: import_access.denyAll }, ui: { itemView: { fieldMode: "read" } } } : {}
  });
}
function companyTenantField(ref = "Company") {
  return (0, import_fields.relationship)({
    ref,
    access: { create: import_access.denyAll, update: import_access.denyAll },
    ui: {
      createView: { fieldMode: "hidden" },
      itemView: { fieldMode: "read" }
    }
  });
}
function readOnlyRelationshipMany(ref) {
  return (0, import_fields.relationship)({
    ref,
    many: true,
    access: { create: import_access.denyAll, update: import_access.denyAll },
    ui: { createView: { fieldMode: "hidden" }, itemView: { fieldMode: "read" } }
  });
}
function projectTenantField(ref) {
  return (0, import_fields.relationship)({
    ref,
    access: { update: import_access.denyAll },
    ui: { itemView: { fieldMode: "read" } }
  });
}
function ownedCompanyField(ref) {
  return (0, import_fields.relationship)({
    ref,
    ui: { itemView: { fieldMode: "read" } },
    access: {
      update: import_access.denyAll,
      create: async ({ session, inputData, context }) => {
        const companyId = getConnectedId(inputData.company);
        if (!companyId || !session?.itemId) return false;
        return canAccessCompanyById(context, session.itemId, companyId, true);
      }
    }
  });
}
var scopeOptions = CONSTRUCTION_SCOPES.map((scope) => ({
  label: scope,
  value: scope
}));

// features/keystone/access.ts
var apiPermissionScopes = {
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
  canReadAudit: "audit:read"
};
function apiCredentialAllows(session, permission) {
  if (session?.authType !== "api_key") return true;
  const requiredScope = apiPermissionScopes[permission];
  return Boolean(requiredScope && session.apiCredential?.scopes.some((scope) => scopeAllows(scope, requiredScope)));
}
function apiCredentialAllowsCompany(session, companyId) {
  return session?.authType !== "api_key" || session.apiCredential?.companyId === companyId;
}
function apiCredentialAllowsProject(session, companyId, projectId2) {
  if (session?.authType !== "api_key") return true;
  return session.apiCredential?.companyId === companyId && (!session.apiCredential.projectId || session.apiCredential.projectId === projectId2);
}
function isSignedIn({ session }) {
  return Boolean(session?.itemId && session.data.isActive !== false);
}
function isHumanSession({ session }) {
  return isSignedIn({ session }) && session?.authType !== "api_key";
}
function hasPermission(session, permission) {
  if (!session || !apiCredentialAllows(session, permission)) return false;
  if (session.data.role?.[permission]) return true;
  return Boolean(
    session.data.companyMemberships?.some((membership) => membership.status === "active" && membership.role?.[permission]) || session.data.projectMemberships?.some((membership) => membership.status === "active" && membership.role?.[permission])
  );
}
function hasCompanyPermission(session, companyId, permission) {
  if (!session || !apiCredentialAllows(session, permission) || !apiCredentialAllowsCompany(session, companyId)) return false;
  const membership = session.data.companyMemberships?.find(
    (entry) => entry.status === "active" && entry.company?.id === companyId
  );
  if (membership) return Boolean(membership.role?.[permission] ?? session.data.role?.[permission]);
  return Boolean(session.data.role?.[permission]);
}
function hasProjectPermission(session, companyId, projectId2, permission, requireWrite = false) {
  if (!session || !apiCredentialAllows(session, permission) || !apiCredentialAllowsProject(session, companyId, projectId2)) return false;
  const explicit = session.data.projectMemberships?.find(
    (membership) => membership.status === "active" && membership.project?.id === projectId2 && membership.project.company?.id === companyId
  );
  if (explicit) {
    if (requireWrite && explicit.accessLevel === "viewer") return false;
    return Boolean(explicit.role?.[permission]);
  }
  const companyMembership = session.data.companyMemberships?.find(
    (membership) => membership.status === "active" && membership.canAccessAllProjects && membership.company?.id === companyId
  );
  return Boolean(companyMembership?.role?.[permission]);
}
var permissions = Object.fromEntries(
  permissionsList.map((permission) => [
    permission,
    ({ session }) => hasPermission(session, permission)
  ])
);
function canRead(read, manage) {
  return ({ session }) => hasPermission(session, read) || hasPermission(session, manage);
}
function permissionedCompanyWriteFilter(session, permission) {
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
            role: { [permission]: { equals: true } }
          }
        }
      }
    ]
  };
}
function permissionedCompanyRecordWriteFilter(session, permission) {
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
              role: { [permission]: { equals: true } }
            }
          }
        }
      }
    ]
  };
}
function projectPermissionPredicate(session, required3, write, internalOnly) {
  const allowed = required3.filter((permission) => apiCredentialAllows(session, permission));
  if (!allowed.length) return false;
  const actor2 = { user: { id: { equals: session.itemId } }, status: { equals: "active" } };
  const role = { OR: allowed.map((permission) => ({ [permission]: { equals: true } })) };
  return { OR: [
    { memberships: { some: {
      ...actor2,
      role,
      ...internalOnly ? { portalType: { equals: "internal" } } : {},
      ...write ? { accessLevel: { in: ["contributor", "manager"] } } : {}
    } } },
    { AND: [
      { memberships: { none: actor2 } },
      { company: { memberships: { some: { ...actor2, canAccessAllProjects: { equals: true }, role } } } }
    ] }
  ] };
}
function permissionedProjectRecordWriteFilter(session, permission) {
  const writable = writableProjectRecordAccessFilter(session);
  if (!session || writable === false) return false;
  const authority = projectPermissionPredicate(session, [permission], true, true);
  return authority === false ? false : { AND: [writable, { project: authority }] };
}
function permissionedProjectWriteFilter(session, permission) {
  const writable = writableProjectAccessFilter(session);
  if (!session || writable === false) return false;
  const authority = projectPermissionPredicate(session, [permission], true, true);
  return authority === false ? false : { AND: [writable, authority] };
}
function rolePermissionFilter(read, manage) {
  return { OR: [{ [read]: { equals: true } }, { [manage]: { equals: true } }] };
}
function permissionedCompanyRecordPermissionFilter(session, required3) {
  const readable = companyRecordFilter(session);
  if (!session || readable === false) return false;
  if (required3.some((permission) => session.data.role?.[permission])) return readable;
  return {
    AND: [readable, {
      company: { memberships: { some: {
        user: { id: { equals: session.itemId } },
        status: { equals: "active" },
        role: { OR: required3.map((permission) => ({ [permission]: { equals: true } })) }
      } } }
    }]
  };
}
function permissionedCompanyRecordReadFilter(session, read, manage) {
  return permissionedCompanyRecordPermissionFilter(session, [read, manage]);
}
function permissionedProjectRecordReadFilter(session, read, manage) {
  const readable = projectRecordAccessFilter(session);
  if (!session || readable === false) return false;
  const authority = projectPermissionPredicate(session, [read, manage], false, true);
  return authority === false ? false : { AND: [readable, { project: authority }] };
}
function projectEvidencePermissionFilter(session) {
  if (!session || !apiCredentialAllows(session, "canReadAudit")) return false;
  const readable = projectRecordAccessFilter(session);
  const authority = projectPermissionPredicate(session, ["canReadAudit"], false, true);
  const projectEvents = readable !== false && authority !== false ? { AND: [readable, { project: authority }] } : null;
  const companyEvents = session.authType === "api_key" && session.apiCredential?.projectId ? false : permissionedCompanyRecordPermissionFilter(session, ["canReadAudit"]);
  return { OR: [
    ...projectEvents ? [projectEvents] : [],
    ...companyEvents !== false ? [{ AND: [
      companyEvents,
      // IDs are nonempty CUIDs. This is the generated WhereInput's supported
      // relation-absence predicate; do not send an invalid id.equals:null.
      { NOT: { project: { id: { not: { equals: "" } } } } }
    ] }] : []
  ] };
}
function permissionedCompanyReadFilter(session, read, manage) {
  const readable = companyAccessFilter(session);
  if (!session || readable === false) return false;
  if (session.data.role?.[read] || session.data.role?.[manage]) return readable;
  return { AND: [readable, { memberships: { some: {
    user: { id: { equals: session.itemId } },
    status: { equals: "active" },
    role: rolePermissionFilter(read, manage)
  } } }] };
}
function permissionedProjectReadFilter(session, read, manage) {
  const readable = projectAccessFilter(session);
  if (!session || readable === false) return false;
  const authority = projectPermissionPredicate(session, [read, manage], false, false);
  return authority === false ? false : { AND: [readable, authority] };
}
var deny = () => false;
function companyModelAccess(read, manage, options = {}) {
  const readOperation = canRead(read, manage);
  const manageOperation = permissions[manage];
  return {
    operation: {
      query: readOperation,
      create: manageOperation,
      update: manageOperation,
      delete: options.delete === false ? deny : manageOperation
    },
    filter: {
      query: ({ session }) => permissionedCompanyRecordReadFilter(session, read, manage),
      update: ({ session }) => permissionedCompanyRecordWriteFilter(session, manage),
      delete: ({ session }) => permissionedCompanyRecordWriteFilter(session, manage)
    },
    item: {
      create: async ({ session, inputData, context }) => {
        const companyId = getConnectedId(inputData?.company);
        if (!companyId || !session?.itemId || !context) return false;
        return hasCompanyPermission(session, companyId, manage) && canAccessCompanyById(context, session.itemId, companyId, true);
      }
    }
  };
}
function controlledCompanyModelAccess(read, manage) {
  const readOperation = canRead(read, manage);
  return {
    operation: { query: readOperation, create: deny, update: deny, delete: deny },
    filter: { query: ({ session }) => permissionedCompanyRecordReadFilter(session, read, manage) }
  };
}
function controlledProjectModelAccess(read, manage) {
  const readOperation = canRead(read, manage);
  return {
    operation: { query: readOperation, create: deny, update: deny, delete: deny },
    filter: { query: ({ session }) => permissionedProjectRecordReadFilter(session, read, manage) }
  };
}
function projectModelAccess(read, manage, options = {}) {
  const readOperation = canRead(read, manage);
  const manageOperation = permissions[manage];
  return {
    operation: {
      query: readOperation,
      create: manageOperation,
      update: manageOperation,
      delete: options.delete === false ? deny : manageOperation
    },
    filter: {
      query: ({ session }) => permissionedProjectRecordReadFilter(session, read, manage),
      update: ({ session }) => permissionedProjectRecordWriteFilter(session, manage),
      delete: ({ session }) => permissionedProjectRecordWriteFilter(session, manage)
    },
    item: {
      create: async ({ session, inputData, context }) => {
        const projectId2 = getConnectedId(inputData?.project);
        if (!projectId2 || !session?.itemId || !context) return false;
        const project = await queryById(context, "Project", projectId2, "id company { id }");
        const companyId = project?.company?.id;
        return Boolean(companyId) && hasProjectPermission(session, String(companyId), projectId2, manage, true) && await canAccessProjectById(context, session.itemId, projectId2, true);
      }
    }
  };
}
function companyRecordFilter(session) {
  if (!session) return false;
  const membership = {
    company: {
      memberships: {
        some: {
          user: { id: { equals: session.itemId } },
          status: { equals: "active" }
        }
      }
    }
  };
  return session.authType === "api_key" ? { AND: [membership, { company: { id: { equals: session.apiCredential?.companyId ?? "" } } }] } : membership;
}
var rules = {
  canReadCompanies: ({ session }) => permissionedCompanyReadFilter(session, "canReadCompanies", "canManageCompanies"),
  canManageCompanies: ({ session }) => permissionedCompanyWriteFilter(session, "canManageCompanies"),
  canReadProjects: ({ session }) => permissionedProjectReadFilter(session, "canReadProjects", "canManageProjects"),
  canManageProjects: ({ session }) => permissionedProjectWriteFilter(session, "canManageProjects"),
  canReadPeople: ({ session }) => {
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
                    role: rolePermissionFilter("canReadPeople", "canManagePeople")
                  }
                }
              }
            }
          }
        }
      ]
    };
  },
  canUpdatePeople: ({ session }) => {
    if (!session || session.authType === "api_key") return false;
    if (session.data.role?.canManagePeople) return rules.canReadPeople({ session });
    return { id: { equals: session.itemId } };
  },
  canDeletePeople: ({ session }) => {
    if (!session?.data.role?.canManagePeople) return false;
    return { AND: [rules.canReadPeople({ session }), { id: { not: { equals: session.itemId } } }] };
  },
  canManageRoles: ({ session }) => permissionedCompanyRecordWriteFilter(session, "canManageRoles"),
  canReadRoles: ({ session }) => {
    if (!session) return false;
    return {
      OR: [
        { assignedTo: { some: { id: { equals: session.itemId } } } },
        {
          company: {
            memberships: {
              some: {
                user: { id: { equals: session.itemId } },
                status: { equals: "active" }
              }
            }
          }
        }
      ]
    };
  },
  canManageCompanyMemberships: ({ session }) => {
    const scoped2 = permissionedCompanyRecordWriteFilter(session, "canManagePeople");
    if (!session || scoped2 === false) return false;
    return { AND: [scoped2, { user: { id: { not: { equals: session.itemId } } } }] };
  },
  canReadCompanyMemberships: ({ session }) => {
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
                role: rolePermissionFilter("canReadPeople", "canManagePeople")
              }
            }
          }
        }
      ]
    };
  },
  canManageProjectMemberships: ({ session }) => {
    if (!session) return false;
    const project = permissionedProjectWriteFilter(session, "canManagePeople");
    if (project === false) return false;
    return {
      AND: [
        { project },
        { user: { id: { not: { equals: session.itemId } } } }
      ]
    };
  },
  canReadProjectMemberships: ({ session }) => {
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
                  role: rolePermissionFilter("canReadPeople", "canManagePeople")
                }
              }
            }
          }
        }
      ]
    };
  }
};

// features/keystone/domain/database-url.ts
function requirePostgresDatabaseUrl(value) {
  const raw = value?.trim();
  const fail = () => {
    throw new Error("DATABASE_URL must be a configured PostgreSQL connection URL");
  };
  if (!raw) return fail();
  try {
    const parsed = new URL(raw);
    if (!["postgres:", "postgresql:"].includes(parsed.protocol) || !parsed.hostname || parsed.pathname.length < 2) return fail();
  } catch {
    return fail();
  }
  return raw;
}

// features/keystone/domain/session-secret.ts
var unsafeSecretPattern = /replace-with|testing|change-?me/i;
function requireSessionSecret(environment = process.env) {
  const secret = environment.SESSION_SECRET?.trim();
  if (environment.NODE_ENV === "test" && !secret) {
    return "test-only-session-secret-not-valid-for-production";
  }
  if (!secret) throw new Error("SESSION_SECRET is required");
  if (secret.length < 32 || new Set(secret).size < 12 || unsafeSecretPattern.test(secret)) {
    throw new Error("SESSION_SECRET must be a non-placeholder secret with at least 32 characters and 12 distinct characters");
  }
  return secret;
}

// features/keystone/domain/session-strategy.ts
var import_node_crypto = require("node:crypto");
var import_session = require("@keystone-6/core/session");
var allowedScopes = new Set(CONSTRUCTION_SCOPES);
function activeApiSessionFromRecord(record, now = /* @__PURE__ */ new Date()) {
  const expiresAt = record?.expiresAt ? new Date(record.expiresAt) : null;
  const companyId = record?.company?.id;
  const ownerId = record?.owner?.id;
  const projectCompanyId = record?.project?.company?.id;
  const scopes = record?.scopes?.filter((scope) => allowedScopes.has(scope)) ?? [];
  if (!record || record.status !== "active" || record.revokedAt || expiresAt && (!Number.isFinite(expiresAt.getTime()) || expiresAt <= now) || !ownerId || record.owner?.isActive === false || !companyId || scopes.length === 0 || record.project && projectCompanyId !== companyId) return void 0;
  return {
    itemId: ownerId,
    listKey: "User",
    authType: "api_key",
    apiCredential: {
      id: record.id,
      companyId,
      projectId: record.project?.id ?? null,
      scopes
    }
  };
}
function bearerToken(context) {
  const req = context.req;
  const raw = req?.headers?.authorization;
  const header = Array.isArray(raw) ? raw[0] : raw;
  if (!header) return null;
  const match = /^Bearer\s+(ofc_live_[A-Za-z0-9_-]{32,})$/i.exec(header.trim());
  return match?.[1] ?? "";
}
function activeSessionFromRecord(record, now = /* @__PURE__ */ new Date()) {
  const expiresAt = record?.expiresAt ? new Date(record.expiresAt) : null;
  const user = record?.user;
  if (!record || record.revokedAt || !expiresAt || expiresAt <= now || !user?.id || user.isActive === false) {
    return void 0;
  }
  return { itemId: user.id, listKey: "User" };
}
function databaseSessions(options) {
  const cookie = (0, import_session.statelessSessions)({ secret: options.secret, maxAge: options.maxAge });
  return {
    async get({ context }) {
      const sessionContext = context;
      const bearer = bearerToken(context);
      if (bearer !== null) {
        if (!bearer) return void 0;
        const tokenHash = (0, import_node_crypto.createHash)("sha256").update(bearer).digest("hex");
        const credential = await sessionContext.sudo().query.ApiCredential.findOne({
          where: { tokenHash },
          query: "id status scopes expiresAt revokedAt owner { id isActive } company { id } project { id company { id } }"
        });
        const active2 = activeApiSessionFromRecord(credential);
        if (active2 && credential?.id) {
          await sessionContext.sudo().db.ApiCredential.updateOne({ where: { id: credential.id }, data: { lastUsedAt: /* @__PURE__ */ new Date() } });
        }
        return active2;
      }
      const sessionKey = await cookie.get({ context });
      if (!sessionKey) return void 0;
      const record = await sessionContext.sudo().query.AuthSession.findOne({
        where: { sessionKey },
        query: "id expiresAt revokedAt user { id isActive }"
      });
      const active = activeSessionFromRecord(record);
      return active ? { ...active, authType: "session", authSessionId: record.id } : void 0;
    },
    async start({ context, data }) {
      const sessionContext = context;
      const user = await sessionContext.sudo().query.User.findOne({ where: { id: data.itemId }, query: "id isActive" });
      if (!user?.isActive) throw new Error("Inactive accounts cannot start a session");
      const sessionKey = (0, import_node_crypto.randomBytes)(32).toString("base64url");
      await sessionContext.sudo().db.AuthSession.createOne({
        data: {
          sessionKey,
          expiresAt: new Date(Date.now() + options.maxAge * 1e3),
          user: { connect: { id: data.itemId } }
        }
      });
      return String(await cookie.start({ context, data: sessionKey }));
    },
    async end({ context }) {
      const sessionContext = context;
      const sessionKey = await cookie.get({ context });
      if (sessionKey) {
        const record = await sessionContext.sudo().query.AuthSession.findOne({
          where: { sessionKey },
          query: "id expiresAt revokedAt"
        });
        if (record && !record.revokedAt) {
          await sessionContext.sudo().db.AuthSession.updateOne({
            where: { id: record.id },
            data: { revokedAt: /* @__PURE__ */ new Date() }
          });
        }
      }
      await cookie.end({ context });
    }
  };
}

// features/keystone/lib/mail.ts
var import_nodemailer = require("nodemailer");

// features/keystone/lib/smtp-address.ts
function smtpAddress(value) {
  if (value.length > 254 || !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9.-]{0,187}[A-Za-z0-9])?\.[A-Za-z]{2,63}$/.test(value)) {
    throw new Error("A single valid email address is required");
  }
  return value;
}

// features/keystone/lib/mail.ts
function getBaseUrlForEmails() {
  if (process.env.SMTP_STORE_LINK) {
    return process.env.SMTP_STORE_LINK;
  }
  console.warn("SMTP_STORE_LINK not set. Please add SMTP_STORE_LINK to your environment variables for email links to work properly.");
  return "";
}
var smtpPort = process.env.SMTP_PORT ? Number.parseInt(process.env.SMTP_PORT, 10) : void 0;
if (smtpPort !== void 0 && !Number.isFinite(smtpPort)) {
  throw new Error("SMTP_PORT must be a valid integer");
}
var transport = (0, import_nodemailer.createTransport)({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});
function passwordResetEmail({ url }) {
  const backgroundColor = "#f9f9f9";
  const textColor = "#444444";
  const mainBackgroundColor = "#ffffff";
  const buttonBackgroundColor = "#346df1";
  const buttonBorderColor = "#346df1";
  const buttonTextColor = "#ffffff";
  return `
    <body style="background: ${backgroundColor};">
      <table width="100%" border="0" cellspacing="20" cellpadding="0" style="background: ${mainBackgroundColor}; max-width: 600px; margin: auto; border-radius: 10px;">
        <tr>
          <td align="center" style="padding: 10px 0px 0px 0px; font-size: 18px; font-family: Helvetica, Arial, sans-serif; color: ${textColor};">
            Please click below to reset your password
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 20px 0;">
            <table border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center" style="border-radius: 5px;" bgcolor="${buttonBackgroundColor}"><a href="${url}" target="_blank" style="font-size: 18px; font-family: Helvetica, Arial, sans-serif; color: ${buttonTextColor}; text-decoration: none; border-radius: 5px; padding: 10px 20px; border: 1px solid ${buttonBorderColor}; display: inline-block; font-weight: bold;">Reset Password</a></td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 0px 0px 10px 0px; font-size: 16px; line-height: 22px; font-family: Helvetica, Arial, sans-serif; color: ${textColor};">
            If you did not request this email you can safely ignore it.
          </td>
        </tr>
      </table>
    </body>
  `;
}
async function sendPasswordResetEmail(resetToken, to, baseUrl, resetPath = "/dashboard/reset") {
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) throw new Error("Password reset email is not configured");
  const recipient = smtpAddress(to);
  const sender = smtpAddress(process.env.SMTP_FROM);
  const frontendUrl = baseUrl || getBaseUrlForEmails();
  await transport.sendMail({
    to: { name: "", address: recipient },
    from: { name: "", address: sender },
    disableFileAccess: true,
    disableUrlAccess: true,
    subject: "Your password reset token!",
    html: passwordResetEmail({
      url: `${frontendUrl}${resetPath}?token=${encodeURIComponent(resetToken)}`
    })
  });
}

// features/keystone/models/User.ts
var import_core = require("@keystone-6/core");
var import_access3 = require("@keystone-6/core/access");
var import_fields4 = require("@keystone-6/core/fields");

// features/keystone/models/trackingFields.ts
var import_access2 = require("@keystone-6/core/access");
var import_fields3 = require("@keystone-6/core/fields");
var systemManaged = {
  read: () => true,
  create: () => false,
  update: () => false
};
var actor = ({ context }) => context.session?.itemId ? { connect: { id: context.session.itemId } } : void 0;
var creator = (args) => args.operation === "create" ? actor(args) : void 0;
var trackingFields = {
  createdByUser: (0, import_fields3.relationship)({
    ref: "User",
    access: { create: import_access2.denyAll, update: import_access2.denyAll },
    hooks: { resolveInput: creator },
    ui: { createView: { fieldMode: "hidden" }, itemView: { fieldMode: "read" } }
  }),
  updatedByUser: (0, import_fields3.relationship)({
    ref: "User",
    access: { create: import_access2.denyAll, update: import_access2.denyAll },
    hooks: { resolveInput: actor },
    ui: { createView: { fieldMode: "hidden" }, itemView: { fieldMode: "read" } }
  }),
  createdAt: (0, import_fields3.timestamp)({
    access: systemManaged,
    validation: { isRequired: true },
    defaultValue: { kind: "now" },
    ui: {
      createView: { fieldMode: "hidden" },
      itemView: { fieldMode: "read" }
    }
  }),
  updatedAt: (0, import_fields3.timestamp)({
    access: systemManaged,
    db: { updatedAt: true },
    validation: { isRequired: true },
    defaultValue: { kind: "now" },
    ui: {
      createView: { fieldMode: "hidden" },
      itemView: { fieldMode: "read" }
    }
  })
};

// features/keystone/models/User.ts
function shouldRevokeUserSessions(operation, resolvedData) {
  return operation === "update" && (resolvedData.password !== void 0 || resolvedData.isActive === false);
}
function isPlatformAdministrator(session) {
  return Boolean(session?.data.role && permissionsList.every((permission) => session.data.role?.[permission] === true));
}
var User = (0, import_core.list)({
  hooks: {
    afterOperation: async ({ operation, resolvedData, item: item3, context }) => {
      if (!resolvedData || !item3 || !shouldRevokeUserSessions(operation, resolvedData)) return;
      await context.sudo().prisma.authSession.updateMany({
        where: { userId: item3.id.toString(), revokedAt: null },
        data: { revokedAt: /* @__PURE__ */ new Date() }
      });
    }
  },
  access: {
    operation: {
      query: isSignedIn,
      create: (args) => process.env.PUBLIC_SIGNUPS_ALLOWED === "true" || permissions.canManagePeople(args),
      update: isHumanSession,
      delete: permissions.canManagePeople
    },
    filter: {
      query: rules.canReadPeople,
      update: rules.canUpdatePeople,
      delete: rules.canDeletePeople
    }
  },
  ui: {
    hideCreate: (args) => !permissions.canManagePeople(args),
    hideDelete: (args) => !permissions.canManagePeople(args),
    listView: { initialColumns: ["name", "email", "role", "isActive"] }
  },
  fields: {
    name: (0, import_fields4.text)({ validation: { isRequired: true, length: { min: 1, max: 200 } } }),
    email: (0, import_fields4.text)({
      isIndexed: "unique",
      validation: { isRequired: true, length: { min: 3, max: 320 } }
    }),
    password: (0, import_fields4.password)({
      access: {
        read: import_access3.denyAll,
        update: ({ session, item: item3 }) => isHumanSession({ session }) && (permissions.canManagePeople({ session }) || session?.itemId === item3.id)
      },
      validation: {
        isRequired: true,
        length: { min: 10, max: 1e3 },
        rejectCommon: true
      }
    }),
    role: (0, import_fields4.relationship)({
      ref: "Role.assignedTo",
      access: {
        create: ({ session }) => isPlatformAdministrator(session),
        update: ({ session }) => isPlatformAdministrator(session)
      }
    }),
    phone: (0, import_fields4.text)({ validation: { length: { max: 50 } } }),
    jobTitle: (0, import_fields4.text)({ validation: { length: { max: 160 } } }),
    isActive: (0, import_fields4.checkbox)({ defaultValue: true }),
    onboardingStatus: (0, import_fields4.select)({
      type: "enum",
      options: [
        { label: "Not Started", value: "not_started" },
        { label: "In Progress", value: "in_progress" },
        { label: "Completed", value: "completed" },
        { label: "Dismissed", value: "dismissed" }
      ],
      defaultValue: "not_started",
      validation: { isRequired: true }
    }),
    authSessions: (0, import_fields4.relationship)({ ref: "AuthSession.user", many: true, access: { read: import_access3.denyAll, create: import_access3.denyAll, update: import_access3.denyAll } }),
    companyMemberships: readOnlyRelationshipMany("CompanyMembership.user"),
    projectMemberships: readOnlyRelationshipMany("ProjectMembership.user"),
    serviceRequests: readOnlyRelationshipMany("ServiceRequest.customer"),
    serviceRequestEvents: readOnlyRelationshipMany("ServiceRequestEvent.actor"),
    agentIdentities: readOnlyRelationshipMany("AgentIdentity.owner"),
    requestedAgentActions: readOnlyRelationshipMany("AgentAction.requestedBy"),
    reviewedAgentActions: readOnlyRelationshipMany("AgentAction.reviewedBy"),
    performedAgentActions: readOnlyRelationshipMany("AgentAction.actorUser"),
    ...trackingFields
  }
});

// features/keystone/models/service-requests.ts
var import_core2 = require("@keystone-6/core");
var import_access5 = require("@keystone-6/core/access");
var import_fields6 = require("@keystone-6/core/fields");
var ServiceRequest = (0, import_core2.list)({
  access: {
    operation: { query: isHumanSession, create: import_access5.denyAll, update: import_access5.denyAll, delete: import_access5.denyAll },
    filter: {
      query: (args) => {
        if (!args.session?.itemId || args.session.authType === "api_key") return false;
        return { OR: [
          { customer: { id: { equals: args.session.itemId } } },
          { company: { status: { equals: "active" }, memberships: { some: { user: { id: { equals: args.session.itemId } }, status: { equals: "active" }, role: { canManagePreconstruction: { equals: true } } } } } }
        ] };
      }
    }
  },
  ui: { listView: { initialColumns: ["reference", "serviceTitle", "status", "quoteMinor"] } },
  fields: {
    reference: (0, import_fields6.text)({ isIndexed: "unique" }),
    requestKey: (0, import_fields6.text)({ isIndexed: "unique", access: { read: import_access5.denyAll } }),
    requestDigest: (0, import_fields6.text)({ access: { read: import_access5.denyAll } }),
    serviceTitle: (0, import_fields6.text)({ validation: { isRequired: true } }),
    serviceSlug: (0, import_fields6.text)(),
    scope: (0, import_fields6.text)({ validation: { isRequired: true }, ui: { displayMode: "textarea" } }),
    status: (0, import_fields6.select)({ type: "enum", options: ["requested", "quoted", "payment_pending", "cancelled"], defaultValue: "requested", validation: { isRequired: true } }),
    version: (0, import_fields6.integer)({ defaultValue: 0, validation: { isRequired: true } }),
    currencyCode: (0, import_fields6.text)({ defaultValue: "USD" }),
    quoteMinor: (0, import_fields6.bigInt)({ defaultValue: BigInt(0), validation: { isRequired: true } }),
    quoteTerms: (0, import_fields6.text)({ ui: { displayMode: "textarea" } }),
    expiresAt: (0, import_fields6.timestamp)(),
    acceptedAt: (0, import_fields6.timestamp)(),
    acceptedSnapshot: (0, import_fields6.json)(),
    customer: (0, import_fields6.relationship)({ ref: "User.serviceRequests" }),
    company: (0, import_fields6.relationship)({ ref: "Company.serviceRequests" }),
    service: (0, import_fields6.relationship)({ ref: "PublicService.serviceRequests" }),
    events: readOnlyRelationshipMany("ServiceRequestEvent.request"),
    ...trackingFields
  }
});
var ServiceRequestEvent = (0, import_core2.list)({
  access: {
    operation: { query: isHumanSession, create: import_access5.denyAll, update: import_access5.denyAll, delete: import_access5.denyAll },
    filter: { query: (args) => {
      if (!args.session?.itemId || args.session.authType === "api_key") return false;
      return { request: { OR: [
        { customer: { id: { equals: args.session.itemId } } },
        { company: { status: { equals: "active" }, memberships: { some: { user: { id: { equals: args.session.itemId } }, status: { equals: "active" }, role: { canManagePreconstruction: { equals: true } } } } } }
      ] } };
    } }
  },
  fields: {
    eventKey: (0, import_fields6.text)({ isIndexed: "unique", access: { read: import_access5.denyAll } }),
    commandDigest: (0, import_fields6.text)({ access: { read: import_access5.denyAll } }),
    action: (0, import_fields6.text)(),
    fromStatus: (0, import_fields6.text)(),
    toStatus: (0, import_fields6.text)(),
    version: (0, import_fields6.integer)(),
    snapshot: (0, import_fields6.json)(),
    actor: (0, import_fields6.relationship)({ ref: "User.serviceRequestEvents" }),
    request: (0, import_fields6.relationship)({ ref: "ServiceRequest.events" }),
    ...trackingFields
  }
});

// features/keystone/models/Role.ts
var import_core3 = require("@keystone-6/core");
var import_access7 = require("@keystone-6/core/access");
var import_fields9 = require("@keystone-6/core/fields");

// features/keystone/domain/dashboard-admission.ts
var DASHBOARD_ADMISSION_ROLE_NAME = "Dashboard access";
var otherPermissions = permissionsList.filter((permission) => permission !== "canAccessDashboard");
function isDashboardAdmissionRole(role) {
  return Boolean(role?.id) && role?.canAccessDashboard === true && otherPermissions.every((permission) => role[permission] !== true);
}
var admissionRoleWhere = {
  canAccessDashboard: { equals: true },
  ...Object.fromEntries(otherPermissions.map((permission) => [permission, { equals: false }])),
  // Company-less: never counted or managed as a company's role.
  NOT: { company: { id: { not: { equals: "" } } } }
};
async function hasQualifyingMembership(query, userId) {
  const user = { user: { id: { equals: userId } }, status: { equals: "active" }, role: { canAccessDashboard: { equals: true } } };
  const [projectMemberships, companyMemberships] = await Promise.all([
    query.ProjectMembership.findMany({ where: { ...user, portalType: { equals: "internal" } }, take: 1, query: "id" }),
    query.CompanyMembership.findMany({ where: { ...user, canAccessAllProjects: { equals: true } }, take: 1, query: "id" })
  ]);
  return projectMemberships.length > 0 || companyMemberships.length > 0;
}
async function syncDashboardAdmission(context, userId) {
  if (!userId) return;
  const query = context.sudo().query;
  const user = await query.User.findOne({
    where: { id: userId },
    query: `id isActive role { id ${permissionsList.join(" ")} }`
  });
  if (!user?.id) return;
  const currentRole = user.role;
  if (currentRole?.id && !isDashboardAdmissionRole(currentRole)) return;
  const qualifies = user.isActive === true && await hasQualifyingMembership(query, userId);
  if (qualifies && !currentRole?.id) {
    const [existing] = await query.Role.findMany({ where: admissionRoleWhere, take: 1, orderBy: { id: "asc" }, query: "id" });
    const roleId = existing?.id ?? (await query.Role.createOne({
      data: { name: DASHBOARD_ADMISSION_ROLE_NAME, canAccessDashboard: true },
      query: "id"
    })).id;
    if (!roleId) throw new Error("Dashboard access could not be granted");
    await query.User.updateOne({ where: { id: userId }, data: { role: { connect: { id: roleId } } }, query: "id" });
  } else if (!qualifies && currentRole?.id) {
    await query.User.updateOne({ where: { id: userId }, data: { role: { disconnect: true } }, query: "id" });
  }
}

// features/keystone/models/Role.ts
var Role = (0, import_core3.list)({
  hooks: {
    // Dashboard admission follows membership roles; re-evaluate members when
    // a role's dashboard permission changes.
    afterOperation: async ({ operation, resolvedData, item: item3, context }) => {
      if (operation !== "update" || !item3 || resolvedData?.canAccessDashboard === void 0) return;
      const roleId = item3.id.toString();
      const where = { role: { id: { equals: roleId } } };
      const [companyMembers, projectMembers] = await Promise.all([
        context.sudo().query.CompanyMembership.findMany({ where, take: 500, query: "user { id }" }),
        context.sudo().query.ProjectMembership.findMany({ where, take: 500, query: "user { id }" })
      ]);
      const userIds = new Set([...companyMembers, ...projectMembers].map((member) => member.user?.id).filter(Boolean));
      for (const userId of userIds) await syncDashboardAdmission(context, userId);
    }
  },
  access: {
    operation: {
      query: isSignedIn,
      create: permissions.canManageRoles,
      update: permissions.canManageRoles,
      delete: permissions.canManageRoles
    },
    filter: {
      query: rules.canReadRoles,
      update: rules.canManageRoles,
      delete: rules.canManageRoles
    },
    item: {
      create: async ({ session, inputData, context }) => {
        const companyId = getConnectedId(inputData.company);
        if (!companyId || !session?.itemId) return false;
        return hasCompanyPermission(session, companyId, "canManageRoles") && canAccessCompanyById(context, session.itemId, companyId, true);
      }
    }
  },
  ui: {
    hideCreate: (args) => !permissions.canManageRoles(args),
    hideDelete: (args) => !permissions.canManageRoles(args),
    listView: { initialColumns: ["name", "company", "assignedTo"] }
  },
  fields: {
    name: (0, import_fields9.text)({ validation: { isRequired: true, length: { min: 1, max: 120 } } }),
    company: (0, import_fields9.relationship)({
      ref: "Company.roles",
      access: {
        update: import_access7.denyAll,
        create: async ({ session, inputData, context }) => {
          const companyId = getConnectedId(inputData.company);
          if (!companyId || !session?.itemId) return false;
          return hasCompanyPermission(session, companyId, "canManageRoles") && canAccessCompanyById(context, session.itemId, companyId, true);
        }
      }
    }),
    ...permissionFields,
    assignedTo: (0, import_fields9.relationship)({ ref: "User.role", many: true, access: { create: import_access7.denyAll, update: import_access7.denyAll } }),
    companyMemberships: (0, import_fields9.relationship)({ ref: "CompanyMembership.role", many: true, access: { create: import_access7.denyAll, update: import_access7.denyAll } }),
    projectMemberships: (0, import_fields9.relationship)({ ref: "ProjectMembership.role", many: true, access: { create: import_access7.denyAll, update: import_access7.denyAll } }),
    ...trackingFields
  }
});

// features/keystone/models/core.ts
var import_core4 = require("@keystone-6/core");
var import_access9 = require("@keystone-6/core/access");
var import_fields11 = require("@keystone-6/core/fields");

// features/lib/sanitize-store-logo.ts
var ALLOWED_ELEMENTS = /* @__PURE__ */ new Set([
  "svg",
  "g",
  "path",
  "defs",
  "lineargradient",
  "radialgradient",
  "stop",
  "clippath",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "title",
  "desc"
]);
var ALLOWED_ATTRIBUTES = /* @__PURE__ */ new Set([
  "xmlns",
  "fill",
  "fill-rule",
  "clip-rule",
  "height",
  "width",
  "viewbox",
  "d",
  "clip-path",
  "id",
  "x1",
  "x2",
  "y1",
  "y2",
  "gradientunits",
  "gradienttransform",
  "offset",
  "stop-color",
  "stop-opacity",
  "opacity",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "x",
  "y",
  "transform",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "points",
  "role",
  "aria-hidden",
  "aria-label",
  "preserveaspectratio"
]);
var ATTRIBUTE_PATTERN = /\s+([A-Za-z_:][\w:.-]*)\s*=\s*("[^"]*"|'[^']*')/g;
var TAG_PATTERN = /<\/?\s*([A-Za-z][\w:-]*)([^<>]*)>/g;
function sanitizeStoreLogoSvg(svg) {
  const source = svg.trim();
  if (!source.startsWith("<svg") || !source.endsWith("</svg>") || source.length > 1e5) return "";
  if (/<!|<\?|\b(?:javascript|data|vbscript):|\bon[a-z]+\s*=|\b(?:href|src|style)\s*=/i.test(source)) return "";
  let tagCount = 0;
  let match;
  TAG_PATTERN.lastIndex = 0;
  while (match = TAG_PATTERN.exec(source)) {
    tagCount += 1;
    const element = match[1].toLowerCase();
    if (!ALLOWED_ELEMENTS.has(element)) return "";
    if (match[0].startsWith("</")) continue;
    const attributes = match[2];
    let consumed = "";
    ATTRIBUTE_PATTERN.lastIndex = 0;
    let attributeMatch;
    while (attributeMatch = ATTRIBUTE_PATTERN.exec(attributes)) {
      consumed += attributeMatch[0];
      const attribute = attributeMatch[1].toLowerCase();
      const value = attributeMatch[2].slice(1, -1);
      if (!ALLOWED_ATTRIBUTES.has(attribute)) return "";
      if (attribute === "id" && !/^[A-Za-z_][\w:.-]*$/.test(value)) return "";
      if (/url\(/i.test(value) && !/^url\(#[A-Za-z_][\w:.-]*\)$/.test(value)) return "";
    }
    const remainder = attributes.replace(consumed, "").replace(/\//g, "").trim();
    if (remainder) return "";
  }
  TAG_PATTERN.lastIndex = 0;
  if (tagCount === 0 || source.replace(TAG_PATTERN, "").trim()) return "";
  return source;
}

// features/lib/store-logo.ts
var DEFAULT_STORE_LOGO_ICON = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" height="100%" width="100%" viewBox="0 0 200 200"><g clip-path="url(#restaurant-logo-clip)"><path fill-rule="evenodd" clip-rule="evenodd" d="M107.143 0H92.8571V63.2531L69.1621 4.60582L55.9166 9.95735L80.2255 70.1239L34.3401 24.2385L24.2386 34.3401L68.2177 78.3191L11.2241 53.4181L5.50459 66.5089L65.8105 92.8571H0V107.143H65.8104L5.50461 133.491L11.2241 146.582L68.2176 121.681L24.2386 165.66L34.3401 175.761L80.2255 129.876L55.9166 190.043L69.1621 195.394L92.8571 136.747V200H107.143V136.747L130.838 195.394L144.083 190.043L119.775 129.876L165.66 175.761L175.761 165.66L131.782 121.681L188.776 146.582L194.495 133.491L134.19 107.143H200V92.8571H134.189L194.495 66.5089L188.776 53.4181L131.782 78.3191L175.761 34.34L165.66 24.2385L119.775 70.1238L144.083 9.95735L130.838 4.60582L107.143 63.2531V0Z" fill="url(#restaurant-logo-gradient)"/></g><defs><linearGradient id="restaurant-logo-gradient" x1="14" y1="26" x2="179" y2="179.5" gradientUnits="userSpaceOnUse"><stop stop-color="#5c6bc0"/><stop offset="1" stop-color="#4f39f6"/></linearGradient><clipPath id="restaurant-logo-clip"><rect width="200" height="200" fill="white"/></clipPath></defs></svg>';
var DEFAULT_STORE_LOGO_COLOR = "0";
function normalizeStoreLogoColor(value) {
  const numeric = Number.parseFloat(String(value ?? DEFAULT_STORE_LOGO_COLOR));
  if (!Number.isFinite(numeric)) return DEFAULT_STORE_LOGO_COLOR;
  return String((numeric % 360 + 360) % 360);
}

// features/keystone/models/core.ts
var membershipStatuses = [
  { label: "Invited", value: "invited" },
  { label: "Active", value: "active" },
  { label: "Suspended", value: "suspended" },
  { label: "Revoked", value: "revoked" }
];
var Company = (0, import_core4.list)({
  hooks: {
    validate: async ({ operation, resolvedData, item: item3, addValidationError }) => {
      if (operation === "delete") return;
      if (operation === "update" && resolvedData.isDemo !== void 0 && resolvedData.isDemo !== item3?.isDemo) {
        addValidationError("Fictional workspace provenance cannot be changed");
      }
    }
  },
  access: {
    operation: {
      query: (args) => permissions.canReadCompanies(args) || permissions.canManageCompanies(args),
      create: () => false,
      update: () => false,
      // audited/current-authority Store Settings command only
      delete: () => false
    },
    filter: {
      query: rules.canReadCompanies,
      update: rules.canManageCompanies
    }
  },
  ui: { listView: { initialColumns: ["name", "slug", "status"] } },
  fields: {
    name: (0, import_fields11.text)({ validation: { isRequired: true, length: { min: 1, max: 200 } } }),
    slug: (0, import_fields11.text)({
      isIndexed: "unique",
      validation: { isRequired: true, length: { min: 2, max: 120 }, match: { regex: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ } }
    }),
    isDemo: (0, import_fields11.checkbox)({ defaultValue: false, access: { create: import_access9.denyAll, update: import_access9.denyAll } }),
    legalName: (0, import_fields11.text)({ validation: { length: { max: 240 } } }),
    brandName: (0, import_fields11.text)({ validation: { isRequired: true, length: { min: 2, max: 120 } }, defaultValue: "Northstar Builders" }),
    brandMark: (0, import_fields11.text)({ validation: { isRequired: true, length: { min: 1, max: 4 }, match: { regex: /^[A-Z0-9]+$/ } }, defaultValue: "NB" }),
    brandTagline: (0, import_fields11.text)({ validation: { length: { max: 240 } }, defaultValue: "Built on accountable work." }),
    logoIcon: (0, import_fields11.text)({
      defaultValue: DEFAULT_STORE_LOGO_ICON,
      hooks: {
        resolveInput: ({ resolvedData, fieldKey }) => {
          const value = resolvedData[fieldKey];
          if (value === void 0 || value === null || value === "") return value;
          return typeof value === "string" ? sanitizeStoreLogoSvg(value) : "";
        },
        validate: ({ inputData, resolvedData, fieldKey, addValidationError }) => {
          const submitted = inputData?.[fieldKey];
          if (typeof submitted === "string" && submitted.trim() && !resolvedData?.[fieldKey]) {
            addValidationError("Logo must be a valid, safe SVG document");
          }
        }
      }
    }),
    logoColor: (0, import_fields11.text)({
      defaultValue: DEFAULT_STORE_LOGO_COLOR,
      hooks: {
        resolveInput: ({ resolvedData, fieldKey }) => {
          const value = resolvedData[fieldKey];
          return value === void 0 ? value : normalizeStoreLogoColor(value);
        }
      }
    }),
    brandColor: (0, import_fields11.text)({ validation: { isRequired: true, match: { regex: /^#[0-9a-fA-F]{6}$/ } }, defaultValue: "#1D4ED8" }),
    status: (0, import_fields11.select)({
      type: "enum",
      options: [
        { label: "Active", value: "active" },
        { label: "Suspended", value: "suspended" },
        { label: "Archived", value: "archived" }
      ],
      defaultValue: "active",
      validation: { isRequired: true }
    }),
    email: (0, import_fields11.text)({ validation: { length: { max: 320 } } }),
    phone: (0, import_fields11.text)({ validation: { length: { max: 50 } } }),
    website: (0, import_fields11.text)({ validation: { length: { max: 500 } } }),
    addressLine1: (0, import_fields11.text)(),
    addressLine2: (0, import_fields11.text)(),
    city: (0, import_fields11.text)(),
    stateProvince: (0, import_fields11.text)(),
    postalCode: (0, import_fields11.text)(),
    countryCode: (0, import_fields11.text)({ defaultValue: "US", validation: { length: { min: 2, max: 2 } } }),
    memberships: (0, import_fields11.relationship)({ ref: "CompanyMembership.company", many: true, access: { create: import_access9.denyAll, update: import_access9.denyAll } }),
    projects: (0, import_fields11.relationship)({ ref: "Project.company", many: true, access: { create: import_access9.denyAll, update: import_access9.denyAll } }),
    roles: (0, import_fields11.relationship)({ ref: "Role.company", many: true, access: { create: import_access9.denyAll, update: import_access9.denyAll } }),
    constructionLeads: readOnlyRelationshipMany("ConstructionLead.company"),
    constructionOpportunities: readOnlyRelationshipMany("ConstructionOpportunity.company"),
    publicSiteProfile: (0, import_fields11.relationship)({ ref: "PublicSiteProfile.company", access: { create: import_access9.denyAll, update: import_access9.denyAll } }),
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
    ...trackingFields
  }
});
async function syncMembershipDashboardAdmission({ item: item3, originalItem, context }) {
  const userId = item3?.userId ?? originalItem?.userId;
  await syncDashboardAdmission(context, userId);
}
var CompanyMembership = (0, import_core4.list)({
  access: {
    operation: {
      query: isSignedIn,
      create: permissions.canManagePeople,
      update: permissions.canManagePeople,
      delete: permissions.canManagePeople
    },
    filter: {
      query: rules.canReadCompanyMemberships,
      update: rules.canManageCompanyMemberships,
      delete: rules.canManageCompanyMemberships
    },
    item: {
      create: async ({ session, inputData, context }) => {
        const companyId = getConnectedId(inputData.company);
        if (!companyId || !session?.itemId) return false;
        return hasCompanyPermission(session, companyId, "canManagePeople") && canAccessCompanyById(context, session.itemId, companyId, true);
      }
    }
  },
  hooks: {
    resolveInput: {
      create: ({ resolvedData }) => {
        const companyId = getConnectedId(resolvedData.company);
        const userId = getConnectedId(resolvedData.user);
        if (!companyId || !userId) throw new Error("Company and user are required");
        return { ...resolvedData, membershipKey: `${companyId}:${userId}` };
      }
    },
    validate: { create: validateCompanyMembershipRole, update: validateCompanyMembershipRole },
    afterOperation: syncMembershipDashboardAdmission
  },
  ui: { listView: { initialColumns: ["user", "company", "status", "canAccessAllProjects"] } },
  fields: {
    membershipKey: (0, import_fields11.text)({
      isIndexed: "unique",
      access: { create: import_access9.denyAll, update: import_access9.denyAll },
      ui: { createView: { fieldMode: "hidden" }, itemView: { fieldMode: "read" } }
    }),
    user: (0, import_fields11.relationship)({ ref: "User.companyMemberships", access: { update: import_access9.denyAll } }),
    company: (0, import_fields11.relationship)({ ref: "Company.memberships", access: { update: import_access9.denyAll } }),
    status: (0, import_fields11.select)({ type: "enum", options: membershipStatuses, defaultValue: "invited", validation: { isRequired: true } }),
    title: (0, import_fields11.text)({ validation: { length: { max: 160 } } }),
    role: (0, import_fields11.relationship)({ ref: "Role.companyMemberships" }),
    canAccessAllProjects: (0, import_fields11.checkbox)({ defaultValue: false }),
    invitedBy: (0, import_fields11.relationship)({ ref: "User" }),
    joinedAt: (0, import_fields11.timestamp)(),
    ...trackingFields
  }
});
var Project = (0, import_core4.list)({
  access: {
    operation: {
      query: (args) => permissions.canReadProjects(args) || permissions.canManageProjects(args),
      create: () => false,
      update: permissions.canManageProjects,
      delete: () => false
    },
    filter: {
      query: rules.canReadProjects,
      update: rules.canManageProjects
    },
    item: {
      create: async ({ session, inputData, context }) => {
        const companyId = getConnectedId(inputData.company);
        if (!companyId || !session?.itemId) return false;
        return canAccessCompanyById(context, session.itemId, companyId, true);
      }
    }
  },
  hooks: {
    resolveInput: {
      create: ({ resolvedData }) => {
        const companyId = getConnectedId(resolvedData.company);
        const projectNumber = String(resolvedData.projectNumber ?? "").trim();
        if (!companyId || !projectNumber) throw new Error("Company and project number are required");
        return { ...resolvedData, projectKey: `${companyId}:${projectNumber.toLowerCase()}` };
      }
    },
    validate: {
      create: validateProjectRootRelationships,
      update: validateProjectRootRelationships
    }
  },
  ui: { listView: { initialColumns: ["projectNumber", "name", "company", "status"] } },
  fields: {
    projectKey: (0, import_fields11.text)({
      isIndexed: "unique",
      access: { create: import_access9.denyAll, update: import_access9.denyAll },
      ui: { createView: { fieldMode: "hidden" }, itemView: { fieldMode: "read" } }
    }),
    projectNumber: (0, import_fields11.text)({
      validation: { isRequired: true, length: { min: 1, max: 80 } },
      access: { update: import_access9.denyAll },
      ui: { itemView: { fieldMode: "read" } }
    }),
    name: (0, import_fields11.text)({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    description: (0, import_fields11.text)({ ui: { displayMode: "textarea" } }),
    status: lifecycleStatus([
      { label: "Planning", value: "planning" },
      { label: "Active", value: "active" },
      { label: "On Hold", value: "on_hold" },
      { label: "Completed", value: "completed" },
      { label: "Archived", value: "archived" }
    ], "planning"),
    company: ownedCompanyField("Company.projects"),
    owner: (0, import_fields11.relationship)({ ref: "TradePartner.ownedProjects" }),
    projectManager: (0, import_fields11.relationship)({ ref: "User" }),
    superintendent: (0, import_fields11.relationship)({ ref: "User" }),
    startDate: (0, import_fields11.timestamp)(),
    substantialCompletionDate: (0, import_fields11.timestamp)(),
    actualCompletionDate: (0, import_fields11.timestamp)(),
    timezone: (0, import_fields11.text)({ defaultValue: "America/New_York" }),
    currencyCode: (0, import_fields11.text)({ defaultValue: "USD", validation: { isRequired: true, length: { min: 3, max: 3 } }, access: { update: import_access9.denyAll }, ui: { itemView: { fieldMode: "read" } } }),
    addressLine1: (0, import_fields11.text)(),
    addressLine2: (0, import_fields11.text)(),
    city: (0, import_fields11.text)(),
    stateProvince: (0, import_fields11.text)(),
    postalCode: (0, import_fields11.text)(),
    countryCode: (0, import_fields11.text)({ defaultValue: "US", validation: { length: { min: 2, max: 2 } } }),
    memberships: (0, import_fields11.relationship)({ ref: "ProjectMembership.project", many: true, access: { create: import_access9.denyAll, update: import_access9.denyAll } }),
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
    ...trackingFields
  }
});
async function validateCompanyMembershipRole({ resolvedData, context, item: item3, addValidationError }) {
  let companyId = getConnectedId(resolvedData.company);
  const roleId = getConnectedId(resolvedData.role);
  if (!companyId && item3?.id) companyId = (await queryById(context, "CompanyMembership", item3.id.toString(), "company { id }"))?.company?.id ?? null;
  if (!companyId || !roleId) return;
  const role = await queryById(context, "Role", roleId, "company { id }");
  if (role?.company?.id !== companyId) addValidationError("Membership role must belong to the selected company");
  const actor2 = context.session;
  if (actor2 && !hasCompanyPermission(actor2, companyId, "canManageRoles")) {
    addValidationError("Changing a company membership role requires role administration permission in that company");
  }
}
async function validatePortalOrganization({ resolvedData, context, item: item3, addValidationError }) {
  let projectId2 = getConnectedId(resolvedData.project);
  if (!projectId2 && item3?.id) projectId2 = (await queryById(context, "ProjectMembership", item3.id.toString(), "project { id }"))?.project?.id ?? null;
  const partnerId = getConnectedId(resolvedData.portalOrganization);
  const roleId = getConnectedId(resolvedData.role);
  if (!projectId2 || !partnerId && !roleId) return;
  const [project, partner, role] = await Promise.all([
    queryById(context, "Project", projectId2, "company { id }"),
    partnerId ? queryById(context, "TradePartner", partnerId, "company { id }") : null,
    roleId ? queryById(context, "Role", roleId, "company { id }") : null
  ]);
  if (!project?.company?.id) return addValidationError("Project company is required");
  if (partnerId && project.company.id !== partner?.company?.id) {
    addValidationError("Portal organization must belong to the project company");
  }
  if (roleId && project.company.id !== role?.company?.id) {
    addValidationError("Membership role must belong to the project company");
  }
  const actor2 = context.session;
  if (actor2 && roleId && !hasProjectPermission(actor2, project.company.id, projectId2, "canManageRoles", true)) {
    addValidationError("Changing a project membership role requires role administration permission in that project");
  }
}
var ProjectMembership = (0, import_core4.list)({
  access: {
    operation: {
      query: isSignedIn,
      create: permissions.canManagePeople,
      update: permissions.canManagePeople,
      delete: permissions.canManagePeople
    },
    filter: {
      query: rules.canReadProjectMemberships,
      update: rules.canManageProjectMemberships,
      delete: rules.canManageProjectMemberships
    },
    item: {
      create: async ({ session, inputData, context }) => {
        const projectId2 = getConnectedId(inputData.project);
        if (!projectId2 || !session?.itemId) return false;
        const project = await queryById(context, "Project", projectId2, "company { id }");
        const companyId = project?.company?.id;
        return Boolean(companyId) && hasProjectPermission(session, companyId, projectId2, "canManagePeople", true) && canAccessProjectById(context, session.itemId, projectId2, true);
      }
    }
  },
  hooks: {
    resolveInput: {
      create: ({ resolvedData }) => {
        const projectId2 = getConnectedId(resolvedData.project);
        const userId = getConnectedId(resolvedData.user);
        if (!projectId2 || !userId) throw new Error("Project and user are required");
        return { ...resolvedData, membershipKey: `${projectId2}:${userId}` };
      }
    },
    validate: { create: validatePortalOrganization, update: validatePortalOrganization },
    afterOperation: syncMembershipDashboardAdmission
  },
  ui: { listView: { initialColumns: ["user", "project", "accessLevel", "portalType", "status"] } },
  fields: {
    membershipKey: (0, import_fields11.text)({
      isIndexed: "unique",
      access: { create: import_access9.denyAll, update: import_access9.denyAll },
      ui: { createView: { fieldMode: "hidden" }, itemView: { fieldMode: "read" } }
    }),
    user: (0, import_fields11.relationship)({ ref: "User.projectMemberships", access: { update: import_access9.denyAll } }),
    project: (0, import_fields11.relationship)({ ref: "Project.memberships", access: { update: import_access9.denyAll } }),
    status: (0, import_fields11.select)({ type: "enum", options: membershipStatuses, defaultValue: "invited", validation: { isRequired: true } }),
    accessLevel: (0, import_fields11.select)({
      type: "enum",
      options: [
        { label: "Viewer", value: "viewer" },
        { label: "Contributor", value: "contributor" },
        { label: "Manager", value: "manager" }
      ],
      defaultValue: "viewer",
      validation: { isRequired: true }
    }),
    role: (0, import_fields11.relationship)({ ref: "Role.projectMemberships" }),
    portalOrganization: (0, import_fields11.relationship)({ ref: "TradePartner.projectMembers" }),
    portalType: (0, import_fields11.select)({
      type: "enum",
      options: [
        { label: "Internal", value: "internal" },
        { label: "Owner / client", value: "owner" },
        { label: "Designer", value: "designer" },
        { label: "Subcontractor", value: "subcontractor" },
        { label: "Vendor", value: "vendor" }
      ],
      defaultValue: "internal",
      validation: { isRequired: true }
    }),
    joinedAt: (0, import_fields11.timestamp)(),
    documentDistributions: readOnlyRelationshipMany("DocumentDistribution.recipient"),
    approvalRequests: readOnlyRelationshipMany("ApprovalRequest.assignedTo"),
    ...trackingFields
  }
});
var TradePartner = (0, import_core4.list)({
  access: companyModelAccess("canReadCompanies", "canManageCompanies", { delete: false }),
  ui: { listView: { initialColumns: ["name", "partnerType", "status", "company"] } },
  fields: {
    name: (0, import_fields11.text)({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    legalName: (0, import_fields11.text)(),
    partnerType: (0, import_fields11.select)({
      type: "enum",
      options: [
        { label: "Owner", value: "owner" },
        { label: "Architect/Engineer", value: "designer" },
        { label: "Subcontractor", value: "subcontractor" },
        { label: "Vendor", value: "vendor" },
        { label: "Consultant", value: "consultant" },
        { label: "Authority", value: "authority" }
      ],
      defaultValue: "subcontractor",
      validation: { isRequired: true }
    }),
    status: (0, import_fields11.select)({
      type: "enum",
      options: [
        { label: "Prospective", value: "prospective" },
        { label: "Approved", value: "approved" },
        { label: "Inactive", value: "inactive" },
        { label: "Blocked", value: "blocked" }
      ],
      defaultValue: "prospective",
      validation: { isRequired: true }
    }),
    taxIdLast4: (0, import_fields11.text)({ access: { read: import_access9.denyAll } }),
    email: (0, import_fields11.text)(),
    phone: (0, import_fields11.text)(),
    website: (0, import_fields11.text)(),
    addressLine1: (0, import_fields11.text)(),
    addressLine2: (0, import_fields11.text)(),
    city: (0, import_fields11.text)(),
    stateProvince: (0, import_fields11.text)(),
    postalCode: (0, import_fields11.text)(),
    countryCode: (0, import_fields11.text)({ defaultValue: "US" }),
    company: ownedCompanyField("Company.tradePartners"),
    ownedProjects: readOnlyRelationshipMany("Project.owner"),
    projectMembers: (0, import_fields11.relationship)({ ref: "ProjectMembership.portalOrganization", many: true, access: { create: import_access9.denyAll, update: import_access9.denyAll } }),
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
    ...trackingFields
  }
});
var MAX_LOCATION_DEPTH = 50;
async function validateLocationHierarchy(args) {
  const parentId = getConnectedId(args.resolvedData.parent);
  if (!parentId) return;
  const itemId = args.item?.id?.toString();
  if (itemId && parentId === itemId) {
    args.addValidationError("A location cannot be its own parent");
    return;
  }
  if (!itemId) return;
  let currentId = parentId;
  for (let depth = 0; currentId; depth += 1) {
    if (depth >= MAX_LOCATION_DEPTH) {
      args.addValidationError(`Locations can be nested at most ${MAX_LOCATION_DEPTH} levels deep`);
      return;
    }
    const current = await queryById(args.context, "ProjectLocation", currentId, "id parent { id }");
    currentId = current?.parent?.id ?? void 0;
    if (currentId === itemId) {
      args.addValidationError("A location cannot be placed inside one of its own sub-locations");
      return;
    }
  }
}
var ProjectLocation = (0, import_core4.list)({
  access: projectModelAccess("canReadProjects", "canManageProjects"),
  hooks: {
    ...projectTenantHooks(),
    validate: { create: validateLocationHierarchy, update: validateLocationHierarchy }
  },
  ui: { listView: { initialColumns: ["code", "name", "parent", "project"] } },
  fields: {
    code: (0, import_fields11.text)({ validation: { isRequired: true, length: { min: 1, max: 80 } } }),
    name: (0, import_fields11.text)({ validation: { isRequired: true, length: { min: 1, max: 200 } } }),
    locationType: (0, import_fields11.select)({
      type: "enum",
      options: [
        { label: "Site", value: "site" },
        { label: "Building", value: "building" },
        { label: "Floor", value: "floor" },
        { label: "Area", value: "area" },
        { label: "Room", value: "room" },
        { label: "Zone", value: "zone" }
      ],
      defaultValue: "area"
    }),
    parent: (0, import_fields11.relationship)({ ref: "ProjectLocation.children" }),
    children: readOnlyRelationshipMany("ProjectLocation.parent"),
    company: companyTenantField(),
    project: projectTenantField("Project.locations"),
    ...trackingFields
  }
});
var CostCode = (0, import_core4.list)({
  access: companyModelAccess("canReadFinancials", "canManageFinancials", { delete: false }),
  hooks: {
    resolveInput: {
      create: ({ resolvedData }) => {
        const companyId = getConnectedId(resolvedData.company);
        const code = String(resolvedData.code ?? "").trim();
        if (!companyId || !code) throw new Error("Cost code requires company and code");
        return { ...resolvedData, costCodeKey: `${companyId}:${code.toLowerCase()}` };
      }
    }
  },
  ui: { listView: { initialColumns: ["code", "name", "division", "company"] } },
  fields: {
    costCodeKey: (0, import_fields11.text)({ isIndexed: "unique", access: { create: import_access9.denyAll, update: import_access9.denyAll }, ui: { createView: { fieldMode: "hidden" }, itemView: { fieldMode: "read" } } }),
    code: (0, import_fields11.text)({ validation: { isRequired: true, length: { min: 1, max: 40 } }, access: { update: import_access9.denyAll } }),
    name: (0, import_fields11.text)({ validation: { isRequired: true, length: { min: 1, max: 200 } } }),
    division: (0, import_fields11.text)({ validation: { length: { max: 120 } } }),
    description: (0, import_fields11.text)({ ui: { displayMode: "textarea" } }),
    isActive: (0, import_fields11.checkbox)({ defaultValue: true }),
    company: ownedCompanyField("Company.costCodes"),
    budgetCodes: readOnlyRelationshipMany("BudgetCode.costCode"),
    ...trackingFields
  }
});
var BudgetCode = (0, import_core4.list)({
  access: projectModelAccess("canReadFinancials", "canManageFinancials", { delete: false }),
  hooks: projectTenantKeyHooks({ parentField: "project", valueField: "code", keyField: "budgetCodeKey" }),
  ui: { listView: { initialColumns: ["code", "costType", "costCode", "project"] } },
  fields: {
    budgetCodeKey: (0, import_fields11.text)({ isIndexed: "unique", access: { create: import_access9.denyAll, update: import_access9.denyAll }, ui: { createView: { fieldMode: "hidden" }, itemView: { fieldMode: "read" } } }),
    code: (0, import_fields11.text)({ validation: { isRequired: true, length: { min: 1, max: 80 } }, access: { update: import_access9.denyAll } }),
    description: (0, import_fields11.text)({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    costType: (0, import_fields11.select)({
      type: "enum",
      options: [
        { label: "Labor", value: "labor" },
        { label: "Material", value: "material" },
        { label: "Subcontract", value: "subcontract" },
        { label: "Equipment", value: "equipment" },
        { label: "Other", value: "other" }
      ],
      defaultValue: "other",
      validation: { isRequired: true }
    }),
    isActive: (0, import_fields11.checkbox)({ defaultValue: true }),
    costCode: (0, import_fields11.relationship)({ ref: "CostCode.budgetCodes" }),
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
    ...trackingFields
  }
});

// features/keystone/models/crm.ts
var import_node_crypto2 = require("node:crypto");
var import_core5 = require("@keystone-6/core");
var import_access11 = require("@keystone-6/core/access");
var import_fields13 = require("@keystone-6/core/fields");

// features/keystone/domain/company-owners.ts
function storedOwnerId(record) {
  const owner = record?.owner;
  if (owner === void 0 || owner === null) return null;
  if (typeof owner !== "object" || !("id" in owner) || typeof owner.id !== "string") throw new Error("Owner lookup is incomplete");
  return owner.id;
}
async function validateCompanyOwner(args) {
  const query = args.context.sudo().query;
  const current = args.item?.id ? await query[args.listKey].findOne({ where: { id: args.item.id.toString() }, query: "id company { id } owner { id }" }) : null;
  const companyConnections = getConnectedIds(args.resolvedData.company);
  if (args.resolvedData.company !== void 0 && companyConnections.length !== 1) {
    args.addValidationError("Company must resolve to one existing tenant and cannot be disconnected");
    return;
  }
  if (companyConnections.length > 1) {
    args.addValidationError("Company must resolve to one tenant");
    return;
  }
  const companyId = companyConnections[0] ?? current?.company?.id;
  if (current?.company?.id && companyId !== current.company.id) {
    args.addValidationError("The record company cannot be changed");
    return;
  }
  if (!companyId) {
    args.addValidationError("A company is required to validate the owner");
    return;
  }
  const originalOwnerId = storedOwnerId(current);
  let ownerId = originalOwnerId;
  const change = args.resolvedData.owner;
  if (change === null) ownerId = null;
  else if (change !== void 0) {
    const disconnected = typeof change === "object" && "disconnect" in change && change.disconnect === true;
    const connections = getConnectedIds(change);
    if (disconnected && connections.length === 0) ownerId = null;
    else if (!disconnected && connections.length === 1) ownerId = connections[0];
    else {
      args.addValidationError("Owner must resolve to one existing user or an explicit disconnect");
      return;
    }
  }
  if (args.immutable && current && ownerId !== originalOwnerId) {
    args.addValidationError("Agent identity owner cannot be changed");
    return;
  }
  if (args.listKey === "AgentIdentity" && current && ownerId === originalOwnerId && ["revoked", "suspended"].includes(String(args.resolvedData.status))) return;
  if (!ownerId) {
    if (args.required) args.addValidationError("Agent identity owner is required");
    return;
  }
  const user = await query.User.findOne({ where: { id: ownerId }, query: "id isActive companyMemberships(where: { status: { equals: active } }) { status company { id } } projectMemberships(where: { status: { equals: active } }) { status project { id company { id } } }" });
  const affiliated = user?.companyMemberships?.some((member) => member.status === "active" && member.company?.id === companyId) || user?.projectMemberships?.some((member) => member.status === "active" && member.project?.company?.id === companyId);
  if (user?.isActive !== true || !affiliated) args.addValidationError("Owner must be an active user affiliated with the selected company");
}

// features/keystone/models/crm.ts
function validateLeadOwner(args) {
  return validateCompanyOwner({ ...args, listKey: "ConstructionLead" });
}
var crmAccess = () => companyModelAccess("canReadPreconstruction", "canManagePreconstruction", { delete: false });
function leadKey(companyId, email) {
  return (0, import_node_crypto2.createHash)("sha256").update(`${companyId}${email.trim().toLowerCase()}`).digest("hex");
}
async function resolveLeadIdentity({ resolvedData, context, item: item3 }) {
  let companyId = getConnectedId(resolvedData.company);
  let email = typeof resolvedData.email === "string" ? resolvedData.email.trim().toLowerCase() : "";
  if (item3?.id && (!companyId || !email)) {
    const current = await queryById(context, "ConstructionLead", item3.id.toString(), "company { id } email");
    companyId ||= current?.company?.id ?? null;
    email ||= String(current?.email ?? "").trim().toLowerCase();
  }
  return {
    ...resolvedData,
    ...typeof resolvedData.email === "string" ? { email } : {},
    ...companyId && email ? { leadKey: leadKey(companyId, email) } : {}
  };
}
async function validateOpportunityTenant({ resolvedData, context, item: item3, addValidationError }) {
  await validateCompanyOwner({ listKey: "ConstructionOpportunity", resolvedData, context, item: item3, addValidationError });
  let companyId = getConnectedId(resolvedData.company);
  if (!companyId && item3?.id) {
    companyId = (await queryById(context, "ConstructionOpportunity", item3.id.toString(), "company { id }"))?.company?.id ?? null;
  }
  if (!companyId) return;
  for (const [field, listKey] of [["lead", "ConstructionLead"], ["client", "TradePartner"]]) {
    const id = getConnectedId(resolvedData[field]);
    if (!id) continue;
    const record = await queryById(context, listKey, id, "company { id }");
    if (record?.company?.id !== companyId) addValidationError(`${field} must belong to the opportunity company`);
  }
}
var ConstructionLead = (0, import_core5.list)({
  access: crmAccess(),
  hooks: {
    resolveInput: { create: resolveLeadIdentity, update: resolveLeadIdentity },
    validate: { create: validateLeadOwner, update: validateLeadOwner }
  },
  ui: { listView: { initialColumns: ["name", "organization", "status", "owner", "nextActionAt"] } },
  fields: {
    leadKey: (0, import_fields13.text)({ isIndexed: "unique", access: { create: import_access11.denyAll, update: import_access11.denyAll }, ui: { createView: { fieldMode: "hidden" }, itemView: { fieldMode: "read" } } }),
    name: (0, import_fields13.text)({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    organization: (0, import_fields13.text)({ validation: { length: { max: 240 } } }),
    email: (0, import_fields13.text)({ validation: { length: { max: 320 } } }),
    phone: (0, import_fields13.text)({ validation: { length: { max: 50 } } }),
    source: (0, import_fields13.select)({
      type: "enum",
      options: [
        { label: "Referral", value: "referral" },
        { label: "Invitation", value: "invitation" },
        { label: "Public opportunity", value: "public_opportunity" },
        { label: "Existing client", value: "existing_client" },
        { label: "Direct", value: "direct" },
        { label: "Other", value: "other" }
      ],
      defaultValue: "other",
      validation: { isRequired: true }
    }),
    status: (0, import_fields13.select)({
      type: "enum",
      options: [
        { label: "New", value: "new" },
        { label: "Qualified", value: "qualified" },
        { label: "Nurturing", value: "nurturing" },
        { label: "Converted", value: "converted" },
        { label: "Disqualified", value: "disqualified" }
      ],
      defaultValue: "new",
      validation: { isRequired: true }
    }),
    notes: (0, import_fields13.text)({ ui: { displayMode: "textarea" } }),
    nextActionAt: (0, import_fields13.timestamp)(),
    owner: (0, import_fields13.relationship)({ ref: "User" }),
    opportunities: (0, import_fields13.relationship)({ ref: "ConstructionOpportunity.lead", many: true, access: { create: import_access11.denyAll, update: import_access11.denyAll } }),
    company: ownedCompanyField("Company.constructionLeads"),
    ...trackingFields
  }
});
var ConstructionOpportunity = (0, import_core5.list)({
  access: crmAccess(),
  hooks: { validate: { create: validateOpportunityTenant, update: validateOpportunityTenant } },
  ui: { listView: { initialColumns: ["number", "name", "stage", "estimatedValueMinor", "targetBidDate", "owner"] } },
  fields: {
    number: (0, import_fields13.text)({ validation: { isRequired: true, length: { min: 1, max: 80 } } }),
    name: (0, import_fields13.text)({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    organization: (0, import_fields13.text)({ validation: { length: { max: 240 } } }),
    deliveryMethod: (0, import_fields13.text)({ validation: { length: { max: 120 } } }),
    locationSummary: (0, import_fields13.text)({ validation: { length: { max: 500 } } }),
    stage: (0, import_fields13.select)({
      type: "enum",
      options: [
        { label: "Qualifying", value: "qualifying" },
        { label: "Go / no-go", value: "go_no_go" },
        { label: "Estimating", value: "estimating" },
        { label: "Submitted", value: "submitted" },
        { label: "Negotiating", value: "negotiating" },
        { label: "Won", value: "won" },
        { label: "Lost", value: "lost" },
        { label: "Declined", value: "declined" }
      ],
      defaultValue: "qualifying",
      validation: { isRequired: true }
    }),
    estimatedValueMinor: moneyField(),
    currencyCode: currencyCodeField(),
    probabilityBps: (0, import_fields13.integer)({ defaultValue: 0, validation: { min: 0, max: 1e4 } }),
    targetBidDate: (0, import_fields13.timestamp)(),
    expectedAwardDate: (0, import_fields13.timestamp)(),
    nextActionAt: (0, import_fields13.timestamp)(),
    notes: (0, import_fields13.text)({ ui: { displayMode: "textarea" } }),
    owner: (0, import_fields13.relationship)({ ref: "User" }),
    lead: (0, import_fields13.relationship)({ ref: "ConstructionLead.opportunities" }),
    client: (0, import_fields13.relationship)({ ref: "TradePartner.opportunities" }),
    company: ownedCompanyField("Company.constructionOpportunities"),
    ...trackingFields
  }
});

// features/keystone/models/public.ts
var import_core6 = require("@keystone-6/core");
var import_access13 = require("@keystone-6/core/access");
var import_fields15 = require("@keystone-6/core/fields");
var controlledPublicContentAccess = () => controlledCompanyModelAccess("canReadCompanies", "canManageSettings");
var controlledIntakeAccess = () => controlledCompanyModelAccess("canReadPreconstruction", "canManagePreconstruction");
var immutable = { update: import_access13.denyAll };
var publicationStatus = () => (0, import_fields15.select)({
  type: "enum",
  options: [
    { label: "Draft", value: "draft" },
    { label: "Published", value: "published" },
    { label: "Archived", value: "archived" }
  ],
  defaultValue: "draft",
  validation: { isRequired: true },
  access: immutable
});
var PublicSiteProfile = (0, import_core6.list)({
  access: controlledPublicContentAccess(),
  graphql: { omit: { create: true, update: true, delete: true } },
  ui: { hideCreate: true, hideDelete: true, listView: { initialColumns: ["company", "siteKey", "status", "acceptingInquiries"] } },
  fields: {
    siteKey: (0, import_fields15.text)({ isIndexed: "unique", validation: { isRequired: true, length: { min: 1, max: 80 } }, access: immutable }),
    status: publicationStatus(),
    serviceArea: (0, import_fields15.text)({ validation: { isRequired: true, length: { min: 2, max: 240 } }, access: immutable }),
    capabilitySummary: (0, import_fields15.text)({ validation: { isRequired: true, length: { min: 20, max: 1200 } }, ui: { displayMode: "textarea" }, access: immutable }),
    inquiryEmail: (0, import_fields15.text)({ validation: { isRequired: true, length: { min: 3, max: 320 } }, access: immutable }),
    inquiryPhone: (0, import_fields15.text)({ validation: { length: { max: 50 } }, access: immutable }),
    privacyNotice: (0, import_fields15.text)({ validation: { isRequired: true, length: { min: 20, max: 1200 } }, ui: { displayMode: "textarea" }, access: immutable }),
    acceptingInquiries: (0, import_fields15.checkbox)({ defaultValue: true, access: immutable }),
    company: companyTenantField("Company.publicSiteProfile"),
    services: readOnlyRelationshipMany("PublicService.site"),
    projects: readOnlyRelationshipMany("PublicProject.site"),
    submissions: readOnlyRelationshipMany("IntakeSubmission.site"),
    ...trackingFields
  }
});
var PublicService = (0, import_core6.list)({
  access: controlledPublicContentAccess(),
  graphql: { omit: { create: true, update: true, delete: true } },
  ui: { hideCreate: true, hideDelete: true, listView: { initialColumns: ["title", "slug", "status", "sortOrder", "company"] } },
  fields: {
    serviceRequests: (0, import_fields15.relationship)({ ref: "ServiceRequest.service", many: true, access: { create: import_access13.denyAll, update: import_access13.denyAll } }),
    serviceKey: (0, import_fields15.text)({ isIndexed: "unique", validation: { isRequired: true }, access: immutable }),
    slug: (0, import_fields15.text)({ validation: { isRequired: true, length: { min: 1, max: 100 }, match: { regex: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ } }, access: immutable }),
    title: (0, import_fields15.text)({ validation: { isRequired: true, length: { min: 2, max: 160 } }, access: immutable }),
    summary: (0, import_fields15.text)({ validation: { isRequired: true, length: { min: 20, max: 500 } }, ui: { displayMode: "textarea" }, access: immutable }),
    details: (0, import_fields15.text)({ validation: { length: { max: 4e3 } }, ui: { displayMode: "textarea" }, access: immutable }),
    market: (0, import_fields15.text)({ validation: { length: { max: 160 } }, access: immutable }),
    sortOrder: (0, import_fields15.integer)({ defaultValue: 0, validation: { min: 0, max: 1e4 }, access: immutable }),
    status: publicationStatus(),
    site: (0, import_fields15.relationship)({ ref: "PublicSiteProfile.services", access: { create: import_access13.denyAll, update: import_access13.denyAll } }),
    company: companyTenantField("Company.publicServices"),
    ...trackingFields
  }
});
var PublicProject = (0, import_core6.list)({
  access: controlledPublicContentAccess(),
  graphql: { omit: { create: true, update: true, delete: true } },
  ui: { hideCreate: true, hideDelete: true, listView: { initialColumns: ["title", "slug", "market", "status", "company"] } },
  fields: {
    publicationKey: (0, import_fields15.text)({ isIndexed: "unique", validation: { isRequired: true }, access: immutable }),
    slug: (0, import_fields15.text)({ validation: { isRequired: true, length: { min: 1, max: 100 }, match: { regex: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ } }, access: immutable }),
    title: (0, import_fields15.text)({ validation: { isRequired: true, length: { min: 2, max: 200 } }, access: immutable }),
    summary: (0, import_fields15.text)({ validation: { isRequired: true, length: { min: 20, max: 600 } }, ui: { displayMode: "textarea" }, access: immutable }),
    description: (0, import_fields15.text)({ validation: { length: { max: 5e3 } }, ui: { displayMode: "textarea" }, access: immutable }),
    market: (0, import_fields15.text)({ validation: { length: { max: 160 } }, access: immutable }),
    locationLabel: (0, import_fields15.text)({ validation: { length: { max: 200 } }, access: immutable }),
    deliveryMethod: (0, import_fields15.text)({ validation: { length: { max: 120 } }, access: immutable }),
    completionLabel: (0, import_fields15.text)({ validation: { length: { max: 80 } }, access: immutable }),
    approvedOutcome: (0, import_fields15.text)({ validation: { length: { max: 1e3 } }, ui: { displayMode: "textarea" }, access: immutable }),
    sortOrder: (0, import_fields15.integer)({ defaultValue: 0, validation: { min: 0, max: 1e4 }, access: immutable }),
    status: publicationStatus(),
    sourceProject: (0, import_fields15.relationship)({ ref: "Project.publications", access: { create: import_access13.denyAll, update: import_access13.denyAll } }),
    site: (0, import_fields15.relationship)({ ref: "PublicSiteProfile.projects", access: { create: import_access13.denyAll, update: import_access13.denyAll } }),
    company: companyTenantField("Company.publicProjects"),
    ...trackingFields
  }
});
var IntakeSubmission = (0, import_core6.list)({
  db: {
    // Preserve the existing rate-limit lookup index in generated schema/drift checks.
    extendPrismaSchema: (schema) => schema.replace(/\n\}$/, '\n  @@index([siteId, submittedAt], map: "IntakeSubmission_site_submittedAt_idx")\n}')
  },
  access: controlledIntakeAccess(),
  graphql: { omit: { create: true, update: true, delete: true } },
  ui: { hideCreate: true, hideDelete: true, listView: { initialColumns: ["publicReference", "kind", "contactName", "organization", "status", "submittedAt"] } },
  fields: {
    submissionKey: (0, import_fields15.text)({ isIndexed: "unique", validation: { isRequired: true }, access: immutable }),
    deduplicationKey: (0, import_fields15.text)({ isIndexed: "unique", validation: { isRequired: true }, access: immutable }),
    publicReference: (0, import_fields15.text)({ isIndexed: "unique", validation: { isRequired: true, length: { min: 10, max: 80 } }, access: immutable }),
    kind: (0, import_fields15.select)({
      type: "enum",
      options: [
        { label: "General contact", value: "general_contact" },
        { label: "Project inquiry", value: "project_inquiry" },
        { label: "Estimate request", value: "estimate_request" },
        { label: "RFP invitation", value: "rfp_invitation" },
        { label: "Trade partner interest", value: "trade_partner_interest" }
      ],
      validation: { isRequired: true },
      access: immutable
    }),
    status: (0, import_fields15.select)({
      type: "enum",
      options: [
        { label: "Received", value: "received" }
      ],
      defaultValue: "received",
      validation: { isRequired: true },
      access: immutable
    }),
    contactName: (0, import_fields15.text)({ validation: { isRequired: true, length: { min: 2, max: 200 } }, access: immutable }),
    organization: (0, import_fields15.text)({ validation: { length: { max: 240 } }, access: immutable }),
    email: (0, import_fields15.text)({ validation: { isRequired: true, length: { min: 3, max: 320 } }, access: immutable }),
    phone: (0, import_fields15.text)({ validation: { length: { max: 50 } }, access: immutable }),
    contactRole: (0, import_fields15.text)({ validation: { length: { max: 160 } }, access: immutable }),
    projectName: (0, import_fields15.text)({ validation: { length: { max: 240 } }, access: immutable }),
    projectType: (0, import_fields15.text)({ validation: { length: { max: 160 } }, access: immutable }),
    locationSummary: (0, import_fields15.text)({ validation: { length: { max: 500 } }, access: immutable }),
    deliveryMethod: (0, import_fields15.text)({ validation: { length: { max: 120 } }, access: immutable }),
    budgetRange: (0, import_fields15.text)({ validation: { length: { max: 120 } }, access: immutable }),
    desiredStart: (0, import_fields15.timestamp)({ access: immutable }),
    desiredCompletion: (0, import_fields15.timestamp)({ access: immutable }),
    designStage: (0, import_fields15.text)({ validation: { length: { max: 160 } }, access: immutable }),
    servicesSought: (0, import_fields15.text)({ validation: { length: { max: 600 } }, access: immutable }),
    scopeSummary: (0, import_fields15.text)({ validation: { isRequired: true, length: { min: 10, max: 5e3 } }, ui: { displayMode: "textarea" }, access: immutable }),
    referralSource: (0, import_fields15.text)({ validation: { length: { max: 240 } }, access: immutable }),
    sourcePath: (0, import_fields15.text)({ validation: { isRequired: true, length: { min: 1, max: 120 } }, access: immutable }),
    privacyVersion: (0, import_fields15.text)({ validation: { isRequired: true, length: { min: 1, max: 80 } }, access: immutable }),
    privacyNoticeSnapshot: (0, import_fields15.text)({ validation: { isRequired: true, length: { min: 1, max: 1e4 } }, access: immutable }),
    privacyNoticeDigest: (0, import_fields15.text)({ validation: { isRequired: true, length: { min: 64, max: 64 } }, access: immutable }),
    consentAt: (0, import_fields15.timestamp)({ validation: { isRequired: true }, access: immutable }),
    submittedAt: (0, import_fields15.timestamp)({ validation: { isRequired: true }, defaultValue: { kind: "now" }, access: immutable }),
    requestDigest: (0, import_fields15.text)({ validation: { isRequired: true, length: { min: 64, max: 64 } }, access: immutable }),
    site: (0, import_fields15.relationship)({ ref: "PublicSiteProfile.submissions", access: { create: import_access13.denyAll, update: import_access13.denyAll } }),
    company: companyTenantField("Company.intakeSubmissions"),
    lead: (0, import_fields15.relationship)({ ref: "ConstructionLead", access: { create: import_access13.denyAll, update: import_access13.denyAll } }),
    opportunity: (0, import_fields15.relationship)({ ref: "ConstructionOpportunity", access: { create: import_access13.denyAll, update: import_access13.denyAll } }),
    ...trackingFields
  }
});

// features/keystone/models/preconstruction.ts
var import_core7 = require("@keystone-6/core");
var import_access15 = require("@keystone-6/core/access");
var import_fields17 = require("@keystone-6/core/fields");

// features/keystone/domain/snapshots.ts
var snapshotQueries = {
  EstimateVersion: "id status lockedAt",
  DrawingRevision: "id status issuedAt",
  DocumentVersion: "id issuedAt",
  ProgressClaimLineItem: "id progressClaim { id status }"
};
function isImmutable(listKey, record) {
  if (listKey === "EstimateVersion") {
    return Boolean(record.lockedAt) || ["issued", "superseded"].includes(String(record.status));
  }
  if (listKey === "DrawingRevision") {
    return Boolean(record.issuedAt) || ["issued", "superseded", "voided"].includes(String(record.status));
  }
  if (listKey === "DocumentVersion") return Boolean(record.issuedAt);
  const claim = record.progressClaim;
  return Boolean(claim?.status && !["draft", "rejected"].includes(claim.status));
}
function immutableProjectSnapshotHooks(listKey) {
  const tenancy = projectTenantHooks();
  return {
    ...tenancy,
    beforeOperation: async (args) => {
      if (args.operation !== "update" && args.operation !== "delete" || !args.item?.id) return;
      const record = await queryById(
        args.context,
        listKey,
        args.item.id.toString(),
        snapshotQueries[listKey]
      );
      if (record && listKey === "DrawingRevision" && args.operation === "update" && record.status === "issued" && args.inputData?.status === "superseded" && Object.keys(args.inputData).length === 1) return;
      if (record && isImmutable(listKey, record)) {
        throw new Error(`${listKey} is an immutable historical snapshot`);
      }
    }
  };
}

// features/keystone/models/preconstruction.ts
var preconstructionAccess = () => controlledProjectModelAccess("canReadPreconstruction", "canManagePreconstruction");
var BidPackage = (0, import_core7.list)({
  access: preconstructionAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["number", "title", "status", "dueAt", "project"] } },
  fields: {
    number: (0, import_fields17.text)({ validation: { isRequired: true, length: { min: 1, max: 80 } } }),
    title: (0, import_fields17.text)({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    description: (0, import_fields17.text)({ ui: { displayMode: "textarea" } }),
    instructions: (0, import_fields17.text)({ ui: { displayMode: "textarea" } }),
    status: lifecycleStatus([
      { label: "Draft", value: "draft" },
      { label: "Open", value: "open" },
      { label: "Closed", value: "closed" },
      { label: "Awarded", value: "awarded" },
      { label: "Archived", value: "archived" }
    ], "draft"),
    bidType: (0, import_fields17.select)({
      type: "enum",
      options: [
        { label: "Lump Sum", value: "lump_sum" },
        { label: "Unit Price", value: "unit_price" },
        { label: "Cost Plus", value: "cost_plus" }
      ],
      defaultValue: "lump_sum",
      validation: { isRequired: true }
    }),
    dueAt: (0, import_fields17.timestamp)(),
    issuedAt: (0, import_fields17.timestamp)(),
    closedAt: (0, import_fields17.timestamp)(),
    bidManager: (0, import_fields17.relationship)({ ref: "User" }),
    awardedPartner: (0, import_fields17.relationship)({ ref: "TradePartner" }),
    company: companyTenantField(),
    project: projectTenantField("Project.bidPackages"),
    invitations: (0, import_fields17.relationship)({ ref: "BidInvitation.bidPackage", many: true, access: { create: import_access15.denyAll, update: import_access15.denyAll } }),
    submissions: (0, import_fields17.relationship)({ ref: "BidSubmission.bidPackage", many: true, access: { create: import_access15.denyAll, update: import_access15.denyAll } }),
    ...trackingFields
  }
});
var BidInvitation = (0, import_core7.list)({
  access: preconstructionAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["bidPackage", "tradePartner", "status", "sentAt"] } },
  fields: {
    status: (0, import_fields17.select)({
      type: "enum",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Invited", value: "invited" },
        { label: "Viewed", value: "viewed" },
        { label: "Intent to Bid", value: "intent_to_bid" },
        { label: "Declined", value: "declined" },
        { label: "Submitted", value: "submitted" }
      ],
      defaultValue: "draft",
      validation: { isRequired: true }
    }),
    recipientName: (0, import_fields17.text)({ validation: { length: { max: 200 } } }),
    recipientEmail: (0, import_fields17.text)({ validation: { length: { max: 320 } } }),
    sentAt: (0, import_fields17.timestamp)(),
    viewedAt: (0, import_fields17.timestamp)(),
    respondedAt: (0, import_fields17.timestamp)(),
    bidPackage: (0, import_fields17.relationship)({ ref: "BidPackage.invitations" }),
    budgetCode: (0, import_fields17.relationship)({ ref: "BudgetCode" }),
    tradePartner: (0, import_fields17.relationship)({ ref: "TradePartner.bidInvitations" }),
    submission: (0, import_fields17.relationship)({ ref: "BidSubmission.invitation", access: { create: import_access15.denyAll, update: import_access15.denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.bidInvitations"),
    ...trackingFields
  }
});
var BidSubmission = (0, import_core7.list)({
  access: preconstructionAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["submissionNumber", "tradePartner", "status", "totalMinor", "submittedAt"] } },
  fields: {
    submissionNumber: (0, import_fields17.text)({ validation: { isRequired: true, length: { min: 1, max: 80 } } }),
    status: (0, import_fields17.select)({
      type: "enum",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Submitted", value: "submitted" },
        { label: "Under Review", value: "under_review" },
        { label: "Accepted", value: "accepted" },
        { label: "Rejected", value: "rejected" },
        { label: "Withdrawn", value: "withdrawn" }
      ],
      defaultValue: "draft",
      validation: { isRequired: true }
    }),
    totalMinor: moneyField({ nonNegative: true }),
    currencyCode: currencyCodeField(),
    alternatesMinor: moneyField(),
    exclusions: (0, import_fields17.text)({ ui: { displayMode: "textarea" } }),
    clarifications: (0, import_fields17.text)({ ui: { displayMode: "textarea" } }),
    isBondable: (0, import_fields17.checkbox)({ defaultValue: false }),
    validUntil: (0, import_fields17.timestamp)(),
    submittedAt: (0, import_fields17.timestamp)(),
    reviewedAt: (0, import_fields17.timestamp)(),
    bidPackage: (0, import_fields17.relationship)({ ref: "BidPackage.submissions" }),
    invitation: (0, import_fields17.relationship)({ ref: "BidInvitation.submission" }),
    tradePartner: (0, import_fields17.relationship)({ ref: "TradePartner.bidSubmissions" }),
    reviewedBy: (0, import_fields17.relationship)({ ref: "User" }),
    lineItems: (0, import_fields17.relationship)({ ref: "BidLineItem.submission", many: true, access: { create: import_access15.denyAll, update: import_access15.denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.bidSubmissions"),
    ...trackingFields
  }
});
var BidLineItem = (0, import_core7.list)({
  access: preconstructionAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["description", "submission", "budgetCode", "amountMinor"] } },
  fields: {
    lineNumber: (0, import_fields17.integer)({ validation: { min: 1 } }),
    description: (0, import_fields17.text)({ validation: { isRequired: true, length: { min: 1, max: 500 } } }),
    quantity: (0, import_fields17.decimal)({ precision: 18, scale: 4, defaultValue: "1" }),
    unit: (0, import_fields17.text)({ validation: { length: { max: 40 } } }),
    unitPriceMinor: moneyField({ nonNegative: true }),
    amountMinor: moneyField({ nonNegative: true }),
    submission: (0, import_fields17.relationship)({ ref: "BidSubmission.lineItems" }),
    budgetCode: (0, import_fields17.relationship)({ ref: "BudgetCode.bidLineItems" }),
    company: companyTenantField(),
    project: projectTenantField("Project.bidLineItems"),
    ...trackingFields
  }
});
var Estimate = (0, import_core7.list)({
  access: preconstructionAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["number", "title", "status", "project"] } },
  fields: {
    number: (0, import_fields17.text)({ validation: { isRequired: true, length: { min: 1, max: 80 } } }),
    title: (0, import_fields17.text)({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    description: (0, import_fields17.text)({ ui: { displayMode: "textarea" } }),
    status: lifecycleStatus([
      { label: "Draft", value: "draft" },
      { label: "Internal Review", value: "internal_review" },
      { label: "Issued", value: "issued" },
      { label: "Accepted", value: "accepted" },
      { label: "Rejected", value: "rejected" },
      { label: "Superseded", value: "superseded" }
    ], "draft"),
    estimator: (0, import_fields17.relationship)({ ref: "User" }),
    currentVersion: (0, import_fields17.relationship)({ ref: "EstimateVersion.currentForEstimate" }),
    versions: (0, import_fields17.relationship)({ ref: "EstimateVersion.estimate", many: true, access: { create: import_access15.denyAll, update: import_access15.denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.estimates"),
    ...trackingFields
  }
});
var EstimateVersion = (0, import_core7.list)({
  access: preconstructionAccess(),
  hooks: {
    ...immutableProjectSnapshotHooks("EstimateVersion"),
    resolveInput: async (args) => {
      const resolved = await immutableProjectSnapshotHooks("EstimateVersion").resolveInput(args);
      if (args.operation !== "create") return resolved;
      const estimateId = getConnectedId(resolved.estimate);
      const versionNumber = resolved.versionNumber;
      if (!estimateId || versionNumber === null || versionNumber === void 0) {
        throw new Error("EstimateVersion requires estimate and versionNumber");
      }
      return { ...resolved, versionKey: `${estimateId}:${String(versionNumber).trim().toLowerCase()}` };
    }
  },
  ui: { listView: { initialColumns: ["estimate", "versionNumber", "status", "totalMinor", "issuedAt"] } },
  fields: {
    versionKey: (0, import_fields17.text)({
      isIndexed: "unique",
      access: { create: import_access15.denyAll, update: import_access15.denyAll },
      ui: { createView: { fieldMode: "hidden" }, itemView: { fieldMode: "read" } }
    }),
    versionNumber: (0, import_fields17.integer)({ validation: { isRequired: true, min: 1 }, access: { update: import_access15.denyAll } }),
    status: (0, import_fields17.select)({
      type: "enum",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Issued", value: "issued" },
        { label: "Superseded", value: "superseded" }
      ],
      defaultValue: "draft",
      validation: { isRequired: true }
    }),
    subtotalMinor: moneyField(),
    overheadMinor: moneyField(),
    profitMinor: moneyField(),
    contingencyMinor: moneyField(),
    totalMinor: moneyField(),
    currencyCode: currencyCodeField(),
    scopeSummary: (0, import_fields17.text)({ ui: { displayMode: "textarea" } }),
    assumptions: (0, import_fields17.text)({ ui: { displayMode: "textarea" } }),
    exclusions: (0, import_fields17.text)({ ui: { displayMode: "textarea" } }),
    issuedAt: (0, import_fields17.timestamp)(),
    lockedAt: (0, import_fields17.timestamp)({ access: { update: import_access15.denyAll } }),
    estimate: (0, import_fields17.relationship)({ ref: "Estimate.versions", access: { update: import_access15.denyAll } }),
    currentForEstimate: (0, import_fields17.relationship)({ ref: "Estimate.currentVersion", access: { create: import_access15.denyAll, update: import_access15.denyAll } }),
    lineItems: (0, import_fields17.relationship)({ ref: "EstimateLineItem.version", many: true, access: { create: import_access15.denyAll, update: import_access15.denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.estimateVersions"),
    ...trackingFields
  }
});
var EstimateLineItem = (0, import_core7.list)({
  access: preconstructionAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["description", "version", "budgetCode", "totalCostMinor"] } },
  fields: {
    lineNumber: (0, import_fields17.integer)({ validation: { min: 1 } }),
    description: (0, import_fields17.text)({ validation: { isRequired: true, length: { min: 1, max: 500 } } }),
    quantity: (0, import_fields17.decimal)({ precision: 18, scale: 4, defaultValue: "1" }),
    unit: (0, import_fields17.text)({ validation: { length: { max: 40 } } }),
    laborCostMinor: moneyField(),
    materialCostMinor: moneyField(),
    equipmentCostMinor: moneyField(),
    subcontractCostMinor: moneyField(),
    otherCostMinor: moneyField(),
    totalCostMinor: moneyField(),
    version: (0, import_fields17.relationship)({ ref: "EstimateVersion.lineItems", access: { update: import_access15.denyAll } }),
    budgetCode: (0, import_fields17.relationship)({ ref: "BudgetCode.estimateLineItems" }),
    company: companyTenantField(),
    project: projectTenantField("Project.estimateLineItems"),
    ...trackingFields
  }
});

// features/keystone/models/financials.ts
var import_core8 = require("@keystone-6/core");
var import_access17 = require("@keystone-6/core/access");
var import_fields19 = require("@keystone-6/core/fields");
var financialAccess = () => controlledProjectModelAccess("canReadFinancials", "canManageFinancials");
var Budget = (0, import_core8.list)({
  access: financialAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["name", "version", "status", "totalOriginalMinor", "project"] } },
  fields: {
    name: (0, import_fields19.text)({ validation: { isRequired: true, length: { min: 1, max: 200 } } }),
    version: (0, import_fields19.integer)({ defaultValue: 1, validation: { min: 1 } }),
    status: (0, import_fields19.select)({
      type: "enum",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Approved", value: "approved" },
        { label: "Active", value: "active" },
        { label: "Closed", value: "closed" }
      ],
      defaultValue: "draft",
      validation: { isRequired: true }
    }),
    totalOriginalMinor: moneyField(),
    totalRevisedMinor: moneyField(),
    totalCommittedMinor: moneyField(),
    totalActualMinor: moneyField(),
    forecastToCompleteMinor: moneyField(),
    currencyCode: currencyCodeField(),
    approvedAt: (0, import_fields19.timestamp)(),
    approvedBy: (0, import_fields19.relationship)({ ref: "User" }),
    lineItems: (0, import_fields19.relationship)({ ref: "BudgetLineItem.budget", many: true, access: { create: import_access17.denyAll, update: import_access17.denyAll } }),
    changes: (0, import_fields19.relationship)({ ref: "BudgetChange.budget", many: true, access: { create: import_access17.denyAll, update: import_access17.denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.budgets"),
    ...trackingFields
  }
});
var BudgetLineItem = (0, import_core8.list)({
  db: { extendPrismaSchema: (schema) => schema.replace(/\n\}$/, '\n  @@unique([budgetId, budgetCodeId], map: "BudgetLineItem_budget_budgetCode_key")\n}') },
  access: financialAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["budgetCode", "originalAmountMinor", "revisedAmountMinor", "committedAmountMinor"] } },
  fields: {
    description: (0, import_fields19.text)({ validation: { isRequired: true, length: { min: 1, max: 300 } } }),
    originalAmountMinor: moneyField(),
    approvedChangesMinor: moneyField(),
    revisedAmountMinor: moneyField(),
    committedAmountMinor: moneyField(),
    commitmentChangesMinor: moneyField(),
    actualCostMinor: moneyField(),
    pendingCostChangesMinor: moneyField(),
    forecastToCompleteMinor: moneyField(),
    projectedFinalCostMinor: moneyField(),
    projectedOverUnderMinor: moneyField(),
    budget: (0, import_fields19.relationship)({ ref: "Budget.lineItems" }),
    budgetCode: (0, import_fields19.relationship)({ ref: "BudgetCode.budgetLineItems" }),
    changeLineItems: (0, import_fields19.relationship)({ ref: "BudgetChangeLineItem.budgetLineItem", many: true, access: { create: import_access17.denyAll, update: import_access17.denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.budgetLineItems"),
    ...trackingFields
  }
});
var BudgetChange = (0, import_core8.list)({
  access: financialAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["number", "title", "status", "totalAmountMinor", "project"] } },
  fields: {
    number: (0, import_fields19.text)({ validation: { isRequired: true, length: { min: 1, max: 80 } } }),
    title: (0, import_fields19.text)({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    reason: (0, import_fields19.text)({ ui: { displayMode: "textarea" } }),
    status: lifecycleStatus([
      { label: "Draft", value: "draft" },
      { label: "Pending Approval", value: "pending_approval" },
      { label: "Approved", value: "approved" },
      { label: "Rejected", value: "rejected" },
      { label: "Posted", value: "posted" }
    ], "draft"),
    totalAmountMinor: moneyField(),
    currencyCode: currencyCodeField(),
    requestedBy: (0, import_fields19.relationship)({ ref: "User" }),
    reviewedBy: (0, import_fields19.relationship)({ ref: "User" }),
    reviewedAt: (0, import_fields19.timestamp)(),
    postedAt: (0, import_fields19.timestamp)(),
    budget: (0, import_fields19.relationship)({ ref: "Budget.changes" }),
    lineItems: (0, import_fields19.relationship)({ ref: "BudgetChangeLineItem.budgetChange", many: true, access: { create: import_access17.denyAll, update: import_access17.denyAll } }),
    sourceChangeEvent: (0, import_fields19.relationship)({ ref: "ChangeEvent.budgetChanges" }),
    company: companyTenantField(),
    project: projectTenantField("Project.budgetChanges"),
    ...trackingFields
  }
});
var BudgetChangeLineItem = (0, import_core8.list)({
  access: financialAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["budgetChange", "budgetCode", "amountMinor"] } },
  fields: {
    description: (0, import_fields19.text)({ validation: { isRequired: true, length: { min: 1, max: 500 } } }),
    amountMinor: moneyField(),
    budgetChange: (0, import_fields19.relationship)({ ref: "BudgetChange.lineItems" }),
    budgetLineItem: (0, import_fields19.relationship)({ ref: "BudgetLineItem.changeLineItems" }),
    budgetCode: (0, import_fields19.relationship)({ ref: "BudgetCode.budgetChangeLineItems" }),
    changeEventLineItem: (0, import_fields19.relationship)({ ref: "ChangeEventLineItem.budgetChangeLineItems" }),
    company: companyTenantField(),
    project: projectTenantField("Project.budgetChangeLineItems"),
    ...trackingFields
  }
});
var DirectCost = (0, import_core8.list)({
  access: financialAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["referenceNumber", "costDate", "status", "amountMinor", "budgetCode"] } },
  fields: {
    referenceNumber: (0, import_fields19.text)({ validation: { isRequired: true, length: { min: 1, max: 100 } } }),
    description: (0, import_fields19.text)({ validation: { isRequired: true, length: { min: 1, max: 500 } } }),
    costType: (0, import_fields19.select)({
      type: "enum",
      options: [
        { label: "Invoice", value: "invoice" },
        { label: "Expense", value: "expense" },
        { label: "Payroll", value: "payroll" },
        { label: "Equipment", value: "equipment" },
        { label: "Material", value: "material" },
        { label: "Adjustment", value: "adjustment" }
      ],
      defaultValue: "expense",
      validation: { isRequired: true }
    }),
    status: (0, import_fields19.select)({
      type: "enum",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Pending", value: "pending" },
        { label: "Approved", value: "approved" },
        { label: "Posted", value: "posted" },
        { label: "Voided", value: "voided" }
      ],
      defaultValue: "draft",
      validation: { isRequired: true }
    }),
    amountMinor: moneyField(),
    currencyCode: currencyCodeField(),
    costDate: (0, import_fields19.timestamp)({ validation: { isRequired: true } }),
    invoiceDate: (0, import_fields19.timestamp)(),
    vendorInvoiceNumber: (0, import_fields19.text)(),
    voidedAt: (0, import_fields19.timestamp)(),
    voidReason: (0, import_fields19.text)({ ui: { displayMode: "textarea" } }),
    voidedBy: (0, import_fields19.relationship)({ ref: "User" }),
    budgetCode: (0, import_fields19.relationship)({ ref: "BudgetCode.directCosts" }),
    tradePartner: (0, import_fields19.relationship)({ ref: "TradePartner" }),
    commitment: (0, import_fields19.relationship)({ ref: "Commitment.directCosts" }),
    approvedBy: (0, import_fields19.relationship)({ ref: "User" }),
    company: companyTenantField(),
    project: projectTenantField("Project.directCosts"),
    ...trackingFields
  }
});

// features/keystone/models/contracts.ts
var import_core9 = require("@keystone-6/core");
var import_access19 = require("@keystone-6/core/access");
var import_fields21 = require("@keystone-6/core/fields");
var contractAccess = () => controlledProjectModelAccess("canReadContracts", "canManageContracts");
function nextRelationshipId(input, currentId) {
  if (input === void 0) return currentId;
  if (input && typeof input === "object" && input.disconnect) return null;
  return getConnectedId(input);
}
async function validateContractSide(listKey, args, directionField) {
  const { operation, item: item3, resolvedData, context, addValidationError } = args;
  let current = null;
  if (operation === "update" && item3?.id) {
    current = await queryById(
      context,
      listKey,
      item3.id.toString(),
      `primeContract { id } commitment { id }${directionField ? ` ${directionField}` : ""}`
    );
  }
  const primeContractId = nextRelationshipId(resolvedData.primeContract, current?.primeContract?.id ?? null);
  const commitmentId = nextRelationshipId(resolvedData.commitment, current?.commitment?.id ?? null);
  if (Boolean(primeContractId) === Boolean(commitmentId)) {
    addValidationError("Exactly one of primeContract or commitment is required");
    return;
  }
  if (directionField) {
    const direction = resolvedData[directionField] ?? current?.[directionField];
    if (direction === "owner" && !primeContractId) {
      addValidationError("Owner records require a prime contract");
    }
    if (direction === "commitment" && !commitmentId) {
      addValidationError("Commitment records require a commitment");
    }
  }
}
function contractSideHooks(listKey, directionField) {
  return {
    ...projectTenantHooks(),
    validate: {
      create: (args) => validateContractSide(listKey, args, directionField),
      update: (args) => validateContractSide(listKey, args, directionField)
    }
  };
}
var PrimeContract = (0, import_core9.list)({
  access: contractAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["number", "title", "status", "revisedContractMinor", "client"] } },
  fields: {
    number: (0, import_fields21.text)({ validation: { isRequired: true, length: { min: 1, max: 80 } } }),
    title: (0, import_fields21.text)({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    description: (0, import_fields21.text)({ ui: { displayMode: "textarea" } }),
    contractType: (0, import_fields21.select)({
      type: "enum",
      options: [
        { label: "Lump Sum", value: "lump_sum" },
        { label: "Guaranteed Maximum Price", value: "gmp" },
        { label: "Cost Plus", value: "cost_plus" },
        { label: "Unit Price", value: "unit_price" }
      ],
      defaultValue: "lump_sum",
      validation: { isRequired: true }
    }),
    status: lifecycleStatus([
      { label: "Draft", value: "draft" },
      { label: "Pending Approval", value: "pending_approval" },
      { label: "Approved", value: "approved" },
      { label: "Rejected", value: "rejected" },
      { label: "Executed", value: "executed" },
      { label: "Closed", value: "closed" }
    ], "draft"),
    originalContractMinor: moneyField(),
    approvedChangesMinor: moneyField(),
    revisedContractMinor: moneyField(),
    billedToDateMinor: moneyField(),
    paidToDateMinor: moneyField(),
    defaultRetainageBps: basisPointsField(),
    currencyCode: currencyCodeField(),
    executedAt: (0, import_fields21.timestamp)(),
    startDate: (0, import_fields21.timestamp)(),
    completionDate: (0, import_fields21.timestamp)(),
    client: (0, import_fields21.relationship)({ ref: "TradePartner.primeContracts" }),
    contractManager: (0, import_fields21.relationship)({ ref: "User" }),
    lineItems: (0, import_fields21.relationship)({ ref: "ContractLineItem.primeContract", many: true, access: { create: import_access19.denyAll, update: import_access19.denyAll } }),
    changeOrders: (0, import_fields21.relationship)({ ref: "ChangeOrder.primeContract", many: true, access: { create: import_access19.denyAll, update: import_access19.denyAll } }),
    progressClaims: (0, import_fields21.relationship)({ ref: "ProgressClaim.primeContract", many: true, access: { create: import_access19.denyAll, update: import_access19.denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.primeContracts"),
    ...trackingFields
  }
});
var Commitment = (0, import_core9.list)({
  access: contractAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["number", "title", "commitmentType", "status", "tradePartner"] } },
  fields: {
    number: (0, import_fields21.text)({ validation: { isRequired: true, length: { min: 1, max: 80 } } }),
    title: (0, import_fields21.text)({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    description: (0, import_fields21.text)({ ui: { displayMode: "textarea" } }),
    commitmentType: (0, import_fields21.select)({
      type: "enum",
      options: [
        { label: "Subcontract", value: "subcontract" },
        { label: "Purchase Order", value: "purchase_order" }
      ],
      defaultValue: "subcontract",
      validation: { isRequired: true }
    }),
    status: lifecycleStatus([
      { label: "Draft", value: "draft" },
      { label: "Out for Signature", value: "out_for_signature" },
      { label: "Executed", value: "executed" },
      { label: "Complete", value: "complete" },
      { label: "Closed", value: "closed" },
      { label: "Cancelled", value: "cancelled" },
      { label: "Terminated", value: "terminated" }
    ], "draft"),
    originalContractMinor: moneyField(),
    approvedChangesMinor: moneyField(),
    revisedContractMinor: moneyField(),
    invoicedToDateMinor: moneyField(),
    paidToDateMinor: moneyField(),
    defaultRetainageBps: basisPointsField(),
    currencyCode: currencyCodeField(),
    executedAt: (0, import_fields21.timestamp)(),
    startDate: (0, import_fields21.timestamp)(),
    completionDate: (0, import_fields21.timestamp)(),
    tradePartner: (0, import_fields21.relationship)({ ref: "TradePartner.commitments" }),
    contractManager: (0, import_fields21.relationship)({ ref: "User" }),
    lineItems: (0, import_fields21.relationship)({ ref: "ContractLineItem.commitment", many: true, access: { create: import_access19.denyAll, update: import_access19.denyAll } }),
    changeOrders: (0, import_fields21.relationship)({ ref: "ChangeOrder.commitment", many: true, access: { create: import_access19.denyAll, update: import_access19.denyAll } }),
    progressClaims: (0, import_fields21.relationship)({ ref: "ProgressClaim.commitment", many: true, access: { create: import_access19.denyAll, update: import_access19.denyAll } }),
    directCosts: (0, import_fields21.relationship)({ ref: "DirectCost.commitment", many: true, access: { create: import_access19.denyAll, update: import_access19.denyAll } }),
    lienWaivers: (0, import_fields21.relationship)({ ref: "LienWaiver.commitment", many: true, access: { create: import_access19.denyAll, update: import_access19.denyAll } }),
    procurementRequests: (0, import_fields21.relationship)({ ref: "ProcurementRequest.commitment", many: true, access: { create: import_access19.denyAll, update: import_access19.denyAll } }),
    materialReceipts: (0, import_fields21.relationship)({ ref: "MaterialReceipt.commitment", many: true, access: { create: import_access19.denyAll, update: import_access19.denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.commitments"),
    ...trackingFields
  }
});
var ContractLineItem = (0, import_core9.list)({
  access: contractAccess(),
  hooks: contractSideHooks("ContractLineItem"),
  ui: { listView: { initialColumns: ["lineNumber", "description", "scheduledValueMinor", "budgetCode"] } },
  fields: {
    lineNumber: (0, import_fields21.integer)({ validation: { isRequired: true, min: 1 } }),
    description: (0, import_fields21.text)({ validation: { isRequired: true, length: { min: 1, max: 500 } } }),
    scheduledValueMinor: moneyField(),
    approvedChangesMinor: moneyField(),
    revisedValueMinor: moneyField(),
    retainageBps: basisPointsField(),
    primeContract: (0, import_fields21.relationship)({ ref: "PrimeContract.lineItems" }),
    commitment: (0, import_fields21.relationship)({ ref: "Commitment.lineItems" }),
    budgetCode: (0, import_fields21.relationship)({ ref: "BudgetCode.contractLineItems" }),
    changeOrderLineItems: (0, import_fields21.relationship)({ ref: "ChangeOrderLineItem.contractLineItem", many: true, access: { create: import_access19.denyAll, update: import_access19.denyAll } }),
    progressClaimLineItems: (0, import_fields21.relationship)({ ref: "ProgressClaimLineItem.contractLineItem", many: true, access: { create: import_access19.denyAll, update: import_access19.denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.contractLineItems"),
    ...trackingFields
  }
});
var ChangeEvent = (0, import_core9.list)({
  access: contractAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["number", "title", "status", "estimatedCostMinor", "project"] } },
  fields: {
    number: (0, import_fields21.text)({ validation: { isRequired: true, length: { min: 1, max: 80 } } }),
    title: (0, import_fields21.text)({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    description: (0, import_fields21.text)({ ui: { displayMode: "textarea" } }),
    eventType: (0, import_fields21.select)({
      type: "enum",
      options: [
        { label: "Owner Request", value: "owner_request" },
        { label: "Design Development", value: "design_development" },
        { label: "Design Error/Omission", value: "design_error" },
        { label: "Existing Condition", value: "existing_condition" },
        { label: "Allowance", value: "allowance" },
        { label: "Backcharge", value: "backcharge" },
        { label: "Other", value: "other" }
      ],
      defaultValue: "other",
      validation: { isRequired: true }
    }),
    status: lifecycleStatus([
      { label: "Open", value: "open" },
      { label: "Pricing", value: "pricing" },
      { label: "Pending Approval", value: "pending_approval" },
      { label: "Approved", value: "approved" },
      { label: "Rejected", value: "rejected" },
      { label: "Incorporated", value: "incorporated" },
      { label: "Voided", value: "voided" }
    ], "open"),
    estimatedCostMinor: moneyField(),
    estimatedRevenueMinor: moneyField(),
    scheduleImpactDays: (0, import_fields21.integer)({ defaultValue: 0 }),
    currencyCode: currencyCodeField(),
    discoveredAt: (0, import_fields21.timestamp)({ defaultValue: { kind: "now" } }),
    dueAt: (0, import_fields21.timestamp)(),
    owner: (0, import_fields21.relationship)({ ref: "User" }),
    sourceRfi: (0, import_fields21.relationship)({ ref: "RFI.changeEvents" }),
    lineItems: (0, import_fields21.relationship)({ ref: "ChangeEventLineItem.changeEvent", many: true, access: { create: import_access19.denyAll, update: import_access19.denyAll } }),
    quotes: (0, import_fields21.relationship)({ ref: "ChangeQuote.changeEvent", many: true, access: { create: import_access19.denyAll, update: import_access19.denyAll } }),
    changeOrders: (0, import_fields21.relationship)({ ref: "ChangeOrder.changeEvents", many: true, access: { create: import_access19.denyAll, update: import_access19.denyAll } }),
    budgetChanges: (0, import_fields21.relationship)({ ref: "BudgetChange.sourceChangeEvent", many: true, access: { create: import_access19.denyAll, update: import_access19.denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.changeEvents"),
    ...trackingFields
  }
});
var ChangeEventLineItem = (0, import_core9.list)({
  access: contractAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["description", "changeEvent", "budgetCode", "estimatedCostMinor"] } },
  fields: {
    lineNumber: (0, import_fields21.integer)({ validation: { min: 1 } }),
    description: (0, import_fields21.text)({ validation: { isRequired: true, length: { min: 1, max: 500 } } }),
    estimatedCostMinor: moneyField(),
    estimatedRevenueMinor: moneyField(),
    changeEvent: (0, import_fields21.relationship)({ ref: "ChangeEvent.lineItems" }),
    budgetCode: (0, import_fields21.relationship)({ ref: "BudgetCode.changeEventLineItems" }),
    quotes: (0, import_fields21.relationship)({ ref: "ChangeQuote.changeEventLineItem", many: true, access: { create: import_access19.denyAll, update: import_access19.denyAll } }),
    changeOrderLineItems: (0, import_fields21.relationship)({ ref: "ChangeOrderLineItem.changeEventLineItem", many: true, access: { create: import_access19.denyAll, update: import_access19.denyAll } }),
    budgetChangeLineItems: (0, import_fields21.relationship)({ ref: "BudgetChangeLineItem.changeEventLineItem", many: true, access: { create: import_access19.denyAll, update: import_access19.denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.changeEventLineItems"),
    ...trackingFields
  }
});
var ChangeQuote = (0, import_core9.list)({
  access: contractAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["quoteNumber", "tradePartner", "status", "amountMinor", "dueAt"] } },
  fields: {
    quoteNumber: (0, import_fields21.text)({ validation: { isRequired: true, length: { min: 1, max: 80 } } }),
    status: (0, import_fields21.select)({
      type: "enum",
      options: [
        { label: "Requested", value: "requested" },
        { label: "Received", value: "received" },
        { label: "Accepted", value: "accepted" },
        { label: "Rejected", value: "rejected" },
        { label: "Withdrawn", value: "withdrawn" }
      ],
      defaultValue: "requested",
      validation: { isRequired: true }
    }),
    scope: (0, import_fields21.text)({ ui: { displayMode: "textarea" } }),
    amountMinor: moneyField(),
    currencyCode: currencyCodeField(),
    dueAt: (0, import_fields21.timestamp)(),
    receivedAt: (0, import_fields21.timestamp)(),
    validUntil: (0, import_fields21.timestamp)(),
    changeEvent: (0, import_fields21.relationship)({ ref: "ChangeEvent.quotes" }),
    changeEventLineItem: (0, import_fields21.relationship)({ ref: "ChangeEventLineItem.quotes" }),
    tradePartner: (0, import_fields21.relationship)({ ref: "TradePartner.changeQuotes" }),
    company: companyTenantField(),
    project: projectTenantField("Project.changeQuotes"),
    ...trackingFields
  }
});
var ChangeOrder = (0, import_core9.list)({
  access: contractAccess(),
  hooks: contractSideHooks("ChangeOrder", "direction"),
  ui: { listView: { initialColumns: ["number", "title", "direction", "status", "totalMinor"] } },
  fields: {
    number: (0, import_fields21.text)({ validation: { isRequired: true, length: { min: 1, max: 80 } } }),
    title: (0, import_fields21.text)({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    description: (0, import_fields21.text)({ ui: { displayMode: "textarea" } }),
    direction: (0, import_fields21.select)({
      type: "enum",
      options: [
        { label: "Owner", value: "owner" },
        { label: "Commitment", value: "commitment" }
      ],
      defaultValue: "owner",
      validation: { isRequired: true }
    }),
    status: lifecycleStatus([
      { label: "Draft", value: "draft" },
      { label: "Pending Approval", value: "pending_approval" },
      { label: "Approved", value: "approved" },
      { label: "Rejected", value: "rejected" },
      { label: "Executed", value: "executed" },
      { label: "Posted", value: "posted" }
    ], "draft"),
    totalMinor: moneyField(),
    scheduleImpactDays: (0, import_fields21.integer)({ defaultValue: 0 }),
    currencyCode: currencyCodeField(),
    approvedAt: (0, import_fields21.timestamp)(),
    executedAt: (0, import_fields21.timestamp)(),
    requestedBy: (0, import_fields21.relationship)({ ref: "User" }),
    approvedBy: (0, import_fields21.relationship)({ ref: "User" }),
    primeContract: (0, import_fields21.relationship)({ ref: "PrimeContract.changeOrders" }),
    commitment: (0, import_fields21.relationship)({ ref: "Commitment.changeOrders" }),
    changeEvents: (0, import_fields21.relationship)({ ref: "ChangeEvent.changeOrders", many: true, access: { create: import_access19.denyAll, update: import_access19.denyAll } }),
    lineItems: (0, import_fields21.relationship)({ ref: "ChangeOrderLineItem.changeOrder", many: true, access: { create: import_access19.denyAll, update: import_access19.denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.changeOrders"),
    ...trackingFields
  }
});
var ChangeOrderLineItem = (0, import_core9.list)({
  access: contractAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["description", "changeOrder", "budgetCode", "amountMinor"] } },
  fields: {
    lineNumber: (0, import_fields21.integer)({ validation: { min: 1 } }),
    description: (0, import_fields21.text)({ validation: { isRequired: true, length: { min: 1, max: 500 } } }),
    amountMinor: moneyField(),
    changeOrder: (0, import_fields21.relationship)({ ref: "ChangeOrder.lineItems" }),
    contractLineItem: (0, import_fields21.relationship)({ ref: "ContractLineItem.changeOrderLineItems" }),
    changeEventLineItem: (0, import_fields21.relationship)({ ref: "ChangeEventLineItem.changeOrderLineItems" }),
    budgetCode: (0, import_fields21.relationship)({ ref: "BudgetCode.changeOrderLineItems" }),
    company: companyTenantField(),
    project: projectTenantField("Project.changeOrderLineItems"),
    ...trackingFields
  }
});

// features/keystone/models/execution.ts
var import_core10 = require("@keystone-6/core");
var import_access21 = require("@keystone-6/core/access");
var import_fields23 = require("@keystone-6/core/fields");
var executionAccess = () => controlledProjectModelAccess("canReadProjectExecution", "canManageProjectExecution");
var documentAccess = () => controlledProjectModelAccess("canReadDocuments", "canManageDocuments");
var fieldAccess = () => controlledProjectModelAccess("canReadFieldOperations", "canManageFieldOperations");
var RFI = (0, import_core10.list)({
  access: executionAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["number", "subject", "status", "ballInCourt", "dueAt"] } },
  fields: {
    number: (0, import_fields23.text)({ validation: { isRequired: true, length: { min: 1, max: 80 } } }),
    subject: (0, import_fields23.text)({ validation: { isRequired: true, length: { min: 1, max: 300 } } }),
    question: (0, import_fields23.text)({ validation: { isRequired: true }, ui: { displayMode: "textarea" } }),
    status: lifecycleStatus([
      { label: "Draft", value: "draft" },
      { label: "Open", value: "open" },
      { label: "Answered", value: "answered" },
      { label: "Closed", value: "closed" },
      { label: "Voided", value: "voided" }
    ], "draft"),
    priority: (0, import_fields23.select)({
      type: "enum",
      options: [
        { label: "Low", value: "low" },
        { label: "Normal", value: "normal" },
        { label: "High", value: "high" },
        { label: "Critical", value: "critical" }
      ],
      defaultValue: "normal",
      validation: { isRequired: true }
    }),
    scheduleImpactDays: (0, import_fields23.integer)({ defaultValue: 0 }),
    costImpact: (0, import_fields23.select)({
      type: "enum",
      options: [
        { label: "Unknown", value: "unknown" },
        { label: "No Impact", value: "none" },
        { label: "Potential", value: "potential" },
        { label: "Confirmed", value: "confirmed" }
      ],
      defaultValue: "unknown"
    }),
    dueAt: (0, import_fields23.timestamp)(),
    openedAt: (0, import_fields23.timestamp)(),
    answeredAt: (0, import_fields23.timestamp)(),
    closedAt: (0, import_fields23.timestamp)(),
    raisedBy: (0, import_fields23.relationship)({ ref: "User" }),
    ballInCourt: (0, import_fields23.relationship)({ ref: "User" }),
    responsiblePartner: (0, import_fields23.relationship)({ ref: "TradePartner" }),
    location: (0, import_fields23.relationship)({ ref: "ProjectLocation" }),
    specificationSection: (0, import_fields23.relationship)({ ref: "SpecificationSection.rfis" }),
    drawingRevision: (0, import_fields23.relationship)({ ref: "DrawingRevision.rfis" }),
    responses: (0, import_fields23.relationship)({ ref: "RFIResponse.rfi", many: true, access: { create: import_access21.denyAll, update: import_access21.denyAll } }),
    changeEvents: (0, import_fields23.relationship)({ ref: "ChangeEvent.sourceRfi", many: true, access: { create: import_access21.denyAll, update: import_access21.denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.rfis"),
    ...trackingFields
  }
});
var RFIResponse = (0, import_core10.list)({
  access: executionAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["rfi", "author", "isOfficial", "respondedAt"] } },
  fields: {
    response: (0, import_fields23.text)({ validation: { isRequired: true }, ui: { displayMode: "textarea" } }),
    isOfficial: (0, import_fields23.checkbox)({ defaultValue: false }),
    respondedAt: (0, import_fields23.timestamp)({ defaultValue: { kind: "now" }, validation: { isRequired: true } }),
    rfi: (0, import_fields23.relationship)({ ref: "RFI.responses" }),
    author: (0, import_fields23.relationship)({ ref: "User" }),
    onBehalfOf: (0, import_fields23.relationship)({ ref: "TradePartner" }),
    company: companyTenantField(),
    project: projectTenantField("Project.rfiResponses"),
    ...trackingFields
  }
});
var SpecificationSection = (0, import_core10.list)({
  access: documentAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["sectionNumber", "title", "division", "project"] } },
  fields: {
    sectionNumber: (0, import_fields23.text)({ validation: { isRequired: true, length: { min: 1, max: 40 } } }),
    title: (0, import_fields23.text)({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    division: (0, import_fields23.text)({ validation: { length: { max: 120 } } }),
    description: (0, import_fields23.text)({ ui: { displayMode: "textarea" } }),
    submittals: (0, import_fields23.relationship)({ ref: "Submittal.specificationSection", many: true, access: { create: import_access21.denyAll, update: import_access21.denyAll } }),
    rfis: (0, import_fields23.relationship)({ ref: "RFI.specificationSection", many: true, access: { create: import_access21.denyAll, update: import_access21.denyAll } }),
    inspections: (0, import_fields23.relationship)({ ref: "Inspection.specificationSection", many: true, access: { create: import_access21.denyAll, update: import_access21.denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.specificationSections"),
    ...trackingFields
  }
});
var Submittal = (0, import_core10.list)({
  access: executionAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["number", "title", "status", "ballInCourt", "dueAt"] } },
  fields: {
    number: (0, import_fields23.text)({ validation: { isRequired: true, length: { min: 1, max: 80 } } }),
    revision: (0, import_fields23.integer)({ defaultValue: 0, validation: { min: 0 } }),
    title: (0, import_fields23.text)({ validation: { isRequired: true, length: { min: 1, max: 300 } } }),
    description: (0, import_fields23.text)({ ui: { displayMode: "textarea" } }),
    submittalType: (0, import_fields23.select)({
      type: "enum",
      options: [
        { label: "Shop Drawing", value: "shop_drawing" },
        { label: "Product Data", value: "product_data" },
        { label: "Sample", value: "sample" },
        { label: "Closeout", value: "closeout" },
        { label: "Mockup", value: "mockup" },
        { label: "Other", value: "other" }
      ],
      defaultValue: "product_data",
      validation: { isRequired: true }
    }),
    status: lifecycleStatus([
      { label: "Draft", value: "draft" },
      { label: "Submitted", value: "submitted" },
      { label: "Under Review", value: "under_review" },
      { label: "Approved", value: "approved" },
      { label: "Revise and Resubmit", value: "revise_resubmit" },
      { label: "Rejected", value: "rejected" },
      { label: "Closed", value: "closed" },
      { label: "Voided", value: "voided" }
    ], "draft"),
    requiredOnSiteAt: (0, import_fields23.timestamp)(),
    dueAt: (0, import_fields23.timestamp)(),
    submittedAt: (0, import_fields23.timestamp)(),
    closedAt: (0, import_fields23.timestamp)(),
    specificationSection: (0, import_fields23.relationship)({ ref: "SpecificationSection.submittals" }),
    responsiblePartner: (0, import_fields23.relationship)({ ref: "TradePartner" }),
    submitter: (0, import_fields23.relationship)({ ref: "User" }),
    submittalManager: (0, import_fields23.relationship)({ ref: "User" }),
    ballInCourt: (0, import_fields23.relationship)({ ref: "User" }),
    reviews: (0, import_fields23.relationship)({ ref: "SubmittalReview.submittal", many: true, access: { create: import_access21.denyAll, update: import_access21.denyAll } }),
    documents: (0, import_fields23.relationship)({ ref: "Document.submittals", many: true, access: { create: import_access21.denyAll, update: import_access21.denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.submittals"),
    ...trackingFields
  }
});
var SubmittalReview = (0, import_core10.list)({
  access: executionAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["submittal", "submittalRevision", "sequence", "reviewer", "status", "completedAt"] } },
  fields: {
    sequence: (0, import_fields23.integer)({ defaultValue: 1, validation: { min: 1 } }),
    // The submittal revision this review step belongs to. Each resubmission
    // starts a new round; earlier rounds stay as history.
    submittalRevision: (0, import_fields23.integer)({ defaultValue: 0, validation: { min: 0 }, access: { update: import_access21.denyAll } }),
    status: (0, import_fields23.select)({
      type: "enum",
      options: [
        { label: "Pending", value: "pending" },
        { label: "In Review", value: "in_review" },
        { label: "Approved", value: "approved" },
        { label: "Approved as Noted", value: "approved_as_noted" },
        { label: "Revise and Resubmit", value: "revise_resubmit" },
        { label: "Rejected", value: "rejected" }
      ],
      defaultValue: "pending",
      validation: { isRequired: true }
    }),
    response: (0, import_fields23.text)({ ui: { displayMode: "textarea" } }),
    dueAt: (0, import_fields23.timestamp)(),
    completedAt: (0, import_fields23.timestamp)(),
    submittal: (0, import_fields23.relationship)({ ref: "Submittal.reviews" }),
    reviewer: (0, import_fields23.relationship)({ ref: "User" }),
    reviewerPartner: (0, import_fields23.relationship)({ ref: "TradePartner" }),
    company: companyTenantField(),
    project: projectTenantField("Project.submittalReviews"),
    ...trackingFields
  }
});
var Drawing = (0, import_core10.list)({
  access: documentAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["drawingNumber", "title", "discipline", "status", "currentRevision"] } },
  fields: {
    drawingNumber: (0, import_fields23.text)({ validation: { isRequired: true, length: { min: 1, max: 100 } } }),
    title: (0, import_fields23.text)({ validation: { isRequired: true, length: { min: 1, max: 300 } } }),
    discipline: (0, import_fields23.text)({ validation: { length: { max: 120 } } }),
    status: (0, import_fields23.select)({
      type: "enum",
      options: [
        { label: "Active", value: "active" },
        { label: "Archived", value: "archived" },
        { label: "Voided", value: "voided" }
      ],
      defaultValue: "active",
      validation: { isRequired: true }
    }),
    currentRevision: (0, import_fields23.relationship)({ ref: "DrawingRevision.currentForDrawing" }),
    revisions: (0, import_fields23.relationship)({ ref: "DrawingRevision.drawing", many: true, access: { create: import_access21.denyAll, update: import_access21.denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.drawings"),
    ...trackingFields
  }
});
var DrawingRevision = (0, import_core10.list)({
  access: documentAccess(),
  hooks: {
    ...immutableProjectSnapshotHooks("DrawingRevision"),
    resolveInput: async (args) => {
      const resolved = await immutableProjectSnapshotHooks("DrawingRevision").resolveInput(args);
      if (args.operation !== "create") return resolved;
      const drawingId = getConnectedId(resolved.drawing);
      const revisionNumber = resolved.revisionNumber;
      if (!drawingId || revisionNumber === null || revisionNumber === void 0) {
        throw new Error("DrawingRevision requires drawing and revisionNumber");
      }
      return { ...resolved, revisionKey: `${drawingId}:${String(revisionNumber).trim().toLowerCase()}` };
    }
  },
  ui: { listView: { initialColumns: ["drawing", "revisionNumber", "status", "issuedAt"] } },
  fields: {
    revisionKey: (0, import_fields23.text)({
      isIndexed: "unique",
      access: { create: import_access21.denyAll, update: import_access21.denyAll },
      ui: { createView: { fieldMode: "hidden" }, itemView: { fieldMode: "read" } }
    }),
    revisionNumber: (0, import_fields23.text)({ validation: { isRequired: true, length: { min: 1, max: 40 } }, access: { update: import_access21.denyAll } }),
    titleSnapshot: (0, import_fields23.text)({ validation: { isRequired: true }, access: { update: import_access21.denyAll } }),
    status: (0, import_fields23.select)({
      type: "enum",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Issued", value: "issued" },
        { label: "Superseded", value: "superseded" },
        { label: "Voided", value: "voided" }
      ],
      defaultValue: "draft",
      validation: { isRequired: true }
    }),
    fileName: (0, import_fields23.text)({ validation: { isRequired: true }, access: { update: import_access21.denyAll } }),
    storageKey: (0, import_fields23.text)({ validation: { isRequired: true }, access: { update: import_access21.denyAll } }),
    mimeType: (0, import_fields23.text)({ access: { update: import_access21.denyAll } }),
    byteSize: (0, import_fields23.integer)({ validation: { min: 0 }, access: { update: import_access21.denyAll } }),
    checksumSha256: (0, import_fields23.text)({ validation: { length: { min: 64, max: 64 } }, access: { update: import_access21.denyAll } }),
    issuedAt: (0, import_fields23.timestamp)(),
    receivedAt: (0, import_fields23.timestamp)(),
    uploadedBy: (0, import_fields23.relationship)({ ref: "User" }),
    drawing: (0, import_fields23.relationship)({ ref: "Drawing.revisions", access: { update: import_access21.denyAll } }),
    currentForDrawing: (0, import_fields23.relationship)({ ref: "Drawing.currentRevision", access: { create: import_access21.denyAll, update: import_access21.denyAll } }),
    rfis: (0, import_fields23.relationship)({ ref: "RFI.drawingRevision", many: true, access: { create: import_access21.denyAll, update: import_access21.denyAll } }),
    punchItems: (0, import_fields23.relationship)({ ref: "PunchItem.drawingRevision", many: true, access: { create: import_access21.denyAll, update: import_access21.denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.drawingRevisions"),
    ...trackingFields
  }
});
var Document = (0, import_core10.list)({
  access: documentAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["documentNumber", "title", "documentType", "status", "currentVersion"] } },
  fields: {
    documentNumber: (0, import_fields23.text)({ validation: { isRequired: true, length: { min: 1, max: 100 } } }),
    title: (0, import_fields23.text)({ validation: { isRequired: true, length: { min: 1, max: 300 } } }),
    documentType: (0, import_fields23.select)({
      type: "enum",
      options: [
        { label: "Contract", value: "contract" },
        { label: "Specification", value: "specification" },
        { label: "Submittal", value: "submittal" },
        { label: "RFI", value: "rfi" },
        { label: "Report", value: "report" },
        { label: "Photo", value: "photo" },
        { label: "Correspondence", value: "correspondence" },
        { label: "Other", value: "other" }
      ],
      defaultValue: "other",
      validation: { isRequired: true }
    }),
    status: (0, import_fields23.select)({
      type: "enum",
      options: [
        { label: "Active", value: "active" },
        { label: "Archived", value: "archived" },
        { label: "Voided", value: "voided" }
      ],
      defaultValue: "active",
      validation: { isRequired: true }
    }),
    folderPath: (0, import_fields23.text)(),
    description: (0, import_fields23.text)({ ui: { displayMode: "textarea" } }),
    currentVersion: (0, import_fields23.relationship)({ ref: "DocumentVersion.currentForDocument" }),
    versions: (0, import_fields23.relationship)({ ref: "DocumentVersion.document", many: true, access: { create: import_access21.denyAll, update: import_access21.denyAll } }),
    submittals: (0, import_fields23.relationship)({ ref: "Submittal.documents", many: true, access: { create: import_access21.denyAll, update: import_access21.denyAll } }),
    dailyLogEntries: (0, import_fields23.relationship)({ ref: "DailyLogEntry.documents", many: true, access: { create: import_access21.denyAll, update: import_access21.denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.documents"),
    ...trackingFields
  }
});
var DocumentVersion = (0, import_core10.list)({
  access: documentAccess(),
  hooks: {
    ...immutableProjectSnapshotHooks("DocumentVersion"),
    resolveInput: async (args) => {
      const resolved = await immutableProjectSnapshotHooks("DocumentVersion").resolveInput(args);
      if (args.operation !== "create") return resolved;
      const documentId = getConnectedId(resolved.document);
      const versionNumber = resolved.versionNumber;
      if (!documentId || versionNumber === null || versionNumber === void 0) {
        throw new Error("DocumentVersion requires document and versionNumber");
      }
      return { ...resolved, versionKey: `${documentId}:${String(versionNumber).trim().toLowerCase()}` };
    }
  },
  ui: { listView: { initialColumns: ["document", "versionNumber", "revisionLabel", "issuedAt"] } },
  fields: {
    versionKey: (0, import_fields23.text)({
      isIndexed: "unique",
      access: { create: import_access21.denyAll, update: import_access21.denyAll },
      ui: { createView: { fieldMode: "hidden" }, itemView: { fieldMode: "read" } }
    }),
    versionNumber: (0, import_fields23.integer)({ validation: { isRequired: true, min: 1 }, access: { update: import_access21.denyAll } }),
    revisionLabel: (0, import_fields23.text)({ validation: { length: { max: 80 } }, access: { update: import_access21.denyAll } }),
    titleSnapshot: (0, import_fields23.text)({ validation: { isRequired: true }, access: { update: import_access21.denyAll } }),
    fileName: (0, import_fields23.text)({ validation: { isRequired: true }, access: { update: import_access21.denyAll } }),
    storageKey: (0, import_fields23.text)({ validation: { isRequired: true }, access: { update: import_access21.denyAll } }),
    mimeType: (0, import_fields23.text)({ access: { update: import_access21.denyAll } }),
    byteSize: (0, import_fields23.integer)({ validation: { min: 0 }, access: { update: import_access21.denyAll } }),
    checksumSha256: (0, import_fields23.text)({ validation: { length: { min: 64, max: 64 } }, access: { update: import_access21.denyAll } }),
    notes: (0, import_fields23.text)({ ui: { displayMode: "textarea" } }),
    issuedAt: (0, import_fields23.timestamp)(),
    uploadedBy: (0, import_fields23.relationship)({ ref: "User" }),
    document: (0, import_fields23.relationship)({ ref: "Document.versions", access: { update: import_access21.denyAll } }),
    currentForDocument: (0, import_fields23.relationship)({ ref: "Document.currentVersion", access: { create: import_access21.denyAll, update: import_access21.denyAll } }),
    distributions: (0, import_fields23.relationship)({ ref: "DocumentDistribution.documentVersion", many: true, access: { create: import_access21.denyAll, update: import_access21.denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.documentVersions"),
    ...trackingFields
  }
});
var DailyLog = (0, import_core10.list)({
  access: fieldAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["logDate", "status", "preparedBy", "project"] } },
  fields: {
    logDate: (0, import_fields23.timestamp)({ validation: { isRequired: true } }),
    status: lifecycleStatus([
      { label: "Draft", value: "draft" },
      { label: "Submitted", value: "submitted" },
      { label: "Approved", value: "approved" }
    ], "draft"),
    weatherSummary: (0, import_fields23.text)(),
    highTemperatureC: (0, import_fields23.decimal)({ precision: 5, scale: 2 }),
    lowTemperatureC: (0, import_fields23.decimal)({ precision: 5, scale: 2 }),
    precipitationMm: (0, import_fields23.decimal)({ precision: 8, scale: 2 }),
    generalNotes: (0, import_fields23.text)({ ui: { displayMode: "textarea" } }),
    submittedAt: (0, import_fields23.timestamp)(),
    approvedAt: (0, import_fields23.timestamp)(),
    preparedBy: (0, import_fields23.relationship)({ ref: "User" }),
    approvedBy: (0, import_fields23.relationship)({ ref: "User" }),
    entries: (0, import_fields23.relationship)({ ref: "DailyLogEntry.dailyLog", many: true, access: { create: import_access21.denyAll, update: import_access21.denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.dailyLogs"),
    ...trackingFields
  }
});
var DailyLogEntry = (0, import_core10.list)({
  access: fieldAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["entryType", "title", "dailyLog", "location"] } },
  fields: {
    entryType: (0, import_fields23.select)({
      type: "enum",
      options: [
        { label: "Weather", value: "weather" },
        { label: "Manpower", value: "manpower" },
        { label: "Equipment", value: "equipment" },
        { label: "Delivery", value: "delivery" },
        { label: "Material", value: "material" },
        { label: "Safety", value: "safety" },
        { label: "Inspection", value: "inspection" },
        { label: "Delay", value: "delay" },
        { label: "Progress", value: "progress" },
        { label: "Visitor", value: "visitor" },
        { label: "Note", value: "note" }
      ],
      defaultValue: "note",
      validation: { isRequired: true }
    }),
    title: (0, import_fields23.text)({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    details: (0, import_fields23.text)({ ui: { displayMode: "textarea" } }),
    startedAt: (0, import_fields23.timestamp)(),
    endedAt: (0, import_fields23.timestamp)(),
    workerCount: (0, import_fields23.integer)({ validation: { min: 0 } }),
    quantity: (0, import_fields23.decimal)({ precision: 18, scale: 4 }),
    unit: (0, import_fields23.text)(),
    delayDays: (0, import_fields23.integer)({ validation: { min: 0 } }),
    dailyLog: (0, import_fields23.relationship)({ ref: "DailyLog.entries" }),
    location: (0, import_fields23.relationship)({ ref: "ProjectLocation" }),
    tradePartner: (0, import_fields23.relationship)({ ref: "TradePartner" }),
    equipment: (0, import_fields23.relationship)({ ref: "Equipment" }),
    material: (0, import_fields23.relationship)({ ref: "Material" }),
    safetyIncident: (0, import_fields23.relationship)({ ref: "SafetyIncident.dailyLogEntries" }),
    inspection: (0, import_fields23.relationship)({ ref: "Inspection.dailyLogEntries" }),
    scheduleTask: (0, import_fields23.relationship)({ ref: "ScheduleTask.dailyLogEntries" }),
    documents: (0, import_fields23.relationship)({ ref: "Document.dailyLogEntries", many: true }),
    company: companyTenantField(),
    project: projectTenantField("Project.dailyLogEntries"),
    ...trackingFields
  }
});
var Schedule = (0, import_core10.list)({
  access: executionAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["name", "scheduleType", "status", "version", "dataDate"] } },
  fields: {
    name: (0, import_fields23.text)({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    scheduleType: (0, import_fields23.select)({
      type: "enum",
      options: [
        { label: "Baseline", value: "baseline" },
        { label: "Current", value: "current" },
        { label: "Lookahead", value: "lookahead" },
        { label: "Recovery", value: "recovery" }
      ],
      defaultValue: "current",
      validation: { isRequired: true }
    }),
    status: lifecycleStatus([
      { label: "Draft", value: "draft" },
      { label: "Published", value: "published" },
      { label: "Archived", value: "archived" }
    ], "draft"),
    version: (0, import_fields23.integer)({ defaultValue: 1, validation: { min: 1 } }),
    dataDate: (0, import_fields23.timestamp)(),
    publishedAt: (0, import_fields23.timestamp)(),
    publishedBy: (0, import_fields23.relationship)({ ref: "User" }),
    tasks: (0, import_fields23.relationship)({ ref: "ScheduleTask.schedule", many: true, access: { create: import_access21.denyAll, update: import_access21.denyAll } }),
    dependencies: (0, import_fields23.relationship)({ ref: "ScheduleDependency.schedule", many: true, access: { create: import_access21.denyAll, update: import_access21.denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.schedules"),
    ...trackingFields
  }
});
var ScheduleTask = (0, import_core10.list)({
  access: executionAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["taskCode", "name", "status", "plannedStart", "plannedFinish"] } },
  fields: {
    taskCode: (0, import_fields23.text)({ validation: { isRequired: true, length: { min: 1, max: 80 } } }),
    name: (0, import_fields23.text)({ validation: { isRequired: true, length: { min: 1, max: 300 } } }),
    description: (0, import_fields23.text)({ ui: { displayMode: "textarea" } }),
    status: lifecycleStatus([
      { label: "Not Started", value: "not_started" },
      { label: "In Progress", value: "in_progress" },
      { label: "Completed", value: "completed" },
      { label: "Delayed", value: "delayed" },
      { label: "On Hold", value: "on_hold" }
    ], "not_started"),
    plannedStart: (0, import_fields23.timestamp)(),
    plannedFinish: (0, import_fields23.timestamp)(),
    actualStart: (0, import_fields23.timestamp)(),
    actualFinish: (0, import_fields23.timestamp)(),
    percentComplete: (0, import_fields23.integer)({ defaultValue: 0, validation: { min: 0, max: 100 } }),
    totalFloatDays: (0, import_fields23.integer)(),
    isMilestone: (0, import_fields23.checkbox)({ defaultValue: false }),
    schedule: (0, import_fields23.relationship)({ ref: "Schedule.tasks" }),
    parent: (0, import_fields23.relationship)({ ref: "ScheduleTask.children" }),
    children: (0, import_fields23.relationship)({ ref: "ScheduleTask.parent", many: true, access: { create: import_access21.denyAll, update: import_access21.denyAll } }),
    location: (0, import_fields23.relationship)({ ref: "ProjectLocation" }),
    responsiblePartner: (0, import_fields23.relationship)({ ref: "TradePartner" }),
    assignedTo: (0, import_fields23.relationship)({ ref: "User" }),
    predecessorDependencies: (0, import_fields23.relationship)({ ref: "ScheduleDependency.successor", many: true, access: { create: import_access21.denyAll, update: import_access21.denyAll } }),
    successorDependencies: (0, import_fields23.relationship)({ ref: "ScheduleDependency.predecessor", many: true, access: { create: import_access21.denyAll, update: import_access21.denyAll } }),
    dailyLogEntries: (0, import_fields23.relationship)({ ref: "DailyLogEntry.scheduleTask", many: true, access: { create: import_access21.denyAll, update: import_access21.denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.scheduleTasks"),
    ...trackingFields
  }
});
async function validateScheduleDependency(args) {
  const predecessorId = getConnectedId(args.resolvedData.predecessor);
  const successorId = getConnectedId(args.resolvedData.successor);
  if (predecessorId && successorId && predecessorId === successorId) {
    args.addValidationError("A schedule task cannot depend on itself");
    return;
  }
  if (args.operation !== "create" || !predecessorId || !successorId) return;
  const [predecessor, successor] = await Promise.all([
    queryById(args.context, "ScheduleTask", predecessorId, "schedule { id }"),
    queryById(args.context, "ScheduleTask", successorId, "schedule { id }")
  ]);
  if (!predecessor?.schedule?.id || predecessor.schedule.id !== successor?.schedule?.id) {
    args.addValidationError("Schedule dependencies must connect tasks in the same schedule");
  }
}
var ScheduleDependency = (0, import_core10.list)({
  access: executionAccess(),
  hooks: {
    ...projectTenantHooks(),
    validate: { create: validateScheduleDependency, update: validateScheduleDependency }
  },
  ui: { listView: { initialColumns: ["predecessor", "successor", "dependencyType", "lagDays"] } },
  fields: {
    dependencyType: (0, import_fields23.select)({
      type: "enum",
      options: [
        { label: "Finish to Start", value: "finish_to_start" },
        { label: "Start to Start", value: "start_to_start" },
        { label: "Finish to Finish", value: "finish_to_finish" },
        { label: "Start to Finish", value: "start_to_finish" }
      ],
      defaultValue: "finish_to_start",
      validation: { isRequired: true }
    }),
    lagDays: (0, import_fields23.integer)({ defaultValue: 0 }),
    schedule: (0, import_fields23.relationship)({ ref: "Schedule.dependencies" }),
    predecessor: (0, import_fields23.relationship)({ ref: "ScheduleTask.successorDependencies" }),
    successor: (0, import_fields23.relationship)({ ref: "ScheduleTask.predecessorDependencies" }),
    company: companyTenantField(),
    project: projectTenantField("Project.scheduleDependencies"),
    ...trackingFields
  }
});
var PunchItem = (0, import_core10.list)({
  access: fieldAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["number", "title", "status", "priority", "assignedTo", "dueAt"] } },
  fields: {
    number: (0, import_fields23.text)({ validation: { isRequired: true, length: { min: 1, max: 80 } } }),
    title: (0, import_fields23.text)({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    description: (0, import_fields23.text)({ validation: { isRequired: true }, ui: { displayMode: "textarea" } }),
    status: lifecycleStatus([
      { label: "Open", value: "open" },
      { label: "In Progress", value: "in_progress" },
      { label: "Ready for Review", value: "ready_for_review" },
      { label: "Closed", value: "closed" },
      { label: "Voided", value: "voided" }
    ], "open"),
    priority: (0, import_fields23.select)({
      type: "enum",
      options: [
        { label: "Low", value: "low" },
        { label: "Normal", value: "normal" },
        { label: "High", value: "high" },
        { label: "Critical", value: "critical" }
      ],
      defaultValue: "normal"
    }),
    dueAt: (0, import_fields23.timestamp)(),
    completedAt: (0, import_fields23.timestamp)(),
    closedAt: (0, import_fields23.timestamp)(),
    createdBy: (0, import_fields23.relationship)({ ref: "User" }),
    assignedTo: (0, import_fields23.relationship)({ ref: "User" }),
    responsiblePartner: (0, import_fields23.relationship)({ ref: "TradePartner" }),
    location: (0, import_fields23.relationship)({ ref: "ProjectLocation" }),
    drawingRevision: (0, import_fields23.relationship)({ ref: "DrawingRevision.punchItems" }),
    inspectionItem: (0, import_fields23.relationship)({ ref: "InspectionItem.punchItems" }),
    correctiveActions: (0, import_fields23.relationship)({ ref: "CorrectiveAction.punchItem", many: true, access: { create: import_access21.denyAll, update: import_access21.denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.punchItems"),
    ...trackingFields
  }
});

// features/keystone/models/resources.ts
var import_core11 = require("@keystone-6/core");
var import_access24 = require("@keystone-6/core/access");
var import_fields25 = require("@keystone-6/core/fields");

// features/keystone/domain/resource-fact.ts
var resourceEvents = {
  equipment: ["equipment_use", "equipment_idle", "equipment_breakdown"],
  material: ["material_received", "material_installed", "material_transferred", "material_wasted"]
};
function validateResourceOccurrence(value) {
  if (typeof value !== "string" || value.length > 80 || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(value)) throw new Error("Occurred at requires an ISO date/time with timezone");
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const calendar = new Date(Date.UTC(year, month - 1, day));
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day) throw new Error("Occurred at must have a valid calendar date");
  const occurred = new Date(value);
  if (!Number.isFinite(occurred.getTime())) throw new Error("Occurred at must be a valid date");
  return occurred;
}
function validateResourceFact(type, event, quantity, unit) {
  if (type !== "equipment" && type !== "material") throw new Error("Resource type must be equipment or material");
  if (!resourceEvents[type].includes(event)) throw new Error("Resource event does not match the selected resource type");
  if (typeof quantity !== "string" || !/^\d{1,14}(\.\d{1,4})?$/.test(quantity)) throw new Error("Quantity must be non-negative with at most 14 integer and 4 decimal digits");
  if (typeof unit !== "string" || !unit.trim() || unit.trim().length > 40) throw new Error("Resource unit is required (at most 40 characters)");
  return { resourceType: type, eventType: String(event), quantity, unit: unit.trim() };
}

// features/keystone/domain/resource-activity.ts
async function resourceReadFilter(context) {
  const session = context.session;
  if (!session?.itemId) return false;
  const query = context.sudo().query;
  const user = await query.User.findOne({ where: { id: session.itemId }, query: "id isActive role { canReadFieldOperations canManageFieldOperations }" });
  if (user?.isActive !== true || user.id !== session.itemId) return false;
  if (session.authType === "api_key") {
    const credential = await query.ApiCredential.findOne({ where: { id: session.apiCredential?.id ?? "" }, query: "id status scopes expiresAt revokedAt owner { id isActive } company { id } project { id company { id } }" });
    const active = activeApiSessionFromRecord(credential);
    if (!active || active.itemId !== session.itemId || active.apiCredential?.companyId !== session.apiCredential?.companyId || active.apiCredential?.projectId !== session.apiCredential?.projectId) return false;
    if (!active.apiCredential?.scopes.some((scope) => scopeAllows(scope, "field:read") || scopeAllows(scope, "field:write"))) return false;
  }
  const role = { OR: [{ canReadFieldOperations: { equals: true } }, { canManageFieldOperations: { equals: true } }] };
  const grant = user.role?.canReadFieldOperations || user.role?.canManageFieldOperations ? { OR: [{ role }, { role: null }] } : { role };
  const member = { user: { id: { equals: session.itemId } }, status: { equals: "active" } };
  return { OR: [
    { project: { memberships: { some: { ...member, portalType: { equals: "internal" }, ...grant } } } },
    { project: { memberships: { none: member }, company: { memberships: { some: { ...member, canAccessAllProjects: { equals: true }, ...grant } } } } }
  ] };
}
async function resourceAuthority(context, projectId2, write = false) {
  const session = context.session;
  if (!session?.itemId) throw new Error("Resource activity not found for this project role");
  const query = context.sudo().query;
  const project = await query.Project.findOne({ where: { id: projectId2 }, query: "id currencyCode company { id }" });
  const companyId = project?.company?.id;
  const user = await query.User.findOne({ where: { id: session.itemId }, query: "id isActive role { id name canReadFieldOperations canManageFieldOperations canReadAudit }" });
  if (!project?.id || !companyId || user?.isActive !== true || user.id !== session.itemId) throw new Error("Resource activity not found for this project role");
  const [membership] = await query.ProjectMembership.findMany({
    where: { user: { id: { equals: session.itemId } }, project: { id: { equals: projectId2 } }, status: { equals: "active" } },
    take: 1,
    query: "id status portalType accessLevel role { id name canReadFieldOperations canManageFieldOperations canReadAudit }"
  });
  const [companyMembership] = membership ? [] : await query.CompanyMembership.findMany({
    where: { user: { id: { equals: session.itemId } }, company: { id: { equals: companyId } }, status: { equals: "active" }, canAccessAllProjects: { equals: true } },
    take: 1,
    query: "id status canAccessAllProjects role { id name canReadFieldOperations canManageFieldOperations canReadAudit }"
  });
  if (membership && (membership.portalType !== "internal" || write && !["contributor", "manager"].includes(String(membership.accessLevel))) || !membership && !companyMembership) {
    throw new Error("Resource activity not found for this project role");
  }
  let principal = session;
  if (session.authType === "api_key") {
    const credential = await query.ApiCredential.findOne({ where: { id: session.apiCredential?.id ?? "" }, query: "id status scopes expiresAt revokedAt owner { id isActive } company { id } project { id company { id } }" });
    const active = activeApiSessionFromRecord(credential);
    if (!active || active.itemId !== session.itemId) throw new Error("Resource activity not found for this project role");
    principal = { ...session, ...active };
  }
  const fresh = {
    ...principal,
    data: {
      isActive: true,
      role: user.role,
      projectMemberships: membership ? [{ ...membership, project: { id: projectId2, company: { id: companyId } } }] : [],
      companyMemberships: companyMembership ? [{ ...companyMembership, company: { id: companyId } }] : []
    }
  };
  const allowed = write ? hasProjectPermission(fresh, companyId, projectId2, "canManageFieldOperations", true) : hasProjectPermission(fresh, companyId, projectId2, "canReadFieldOperations") || hasProjectPermission(fresh, companyId, projectId2, "canManageFieldOperations");
  if (!allowed) throw new Error("Resource activity not found for this project role");
  return { companyId, currencyCode: String(project.currencyCode ?? "USD"), session: fresh };
}

// features/keystone/models/resources.ts
var fieldAccess2 = () => controlledProjectModelAccess("canReadFieldOperations", "canManageFieldOperations");
var resourceCatalogAccess = () => companyModelAccess("canReadFieldOperations", "canManageFieldOperations", { delete: false });
var LaborEntry = (0, import_core11.list)({
  access: fieldAccess2(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["workDate", "workerName", "regularHours", "overtimeHours", "budgetCode"] } },
  fields: {
    workDate: (0, import_fields25.timestamp)({ validation: { isRequired: true } }),
    workerName: (0, import_fields25.text)({ validation: { isRequired: true, length: { min: 1, max: 200 } } }),
    employeeNumber: (0, import_fields25.text)(),
    laborType: (0, import_fields25.select)({
      type: "enum",
      options: [
        { label: "Employee", value: "employee" },
        { label: "Temporary", value: "temporary" },
        { label: "Subcontractor", value: "subcontractor" }
      ],
      defaultValue: "employee",
      validation: { isRequired: true }
    }),
    regularHours: (0, import_fields25.decimal)({ precision: 8, scale: 2, defaultValue: "0" }),
    overtimeHours: (0, import_fields25.decimal)({ precision: 8, scale: 2, defaultValue: "0" }),
    doubleTimeHours: (0, import_fields25.decimal)({ precision: 8, scale: 2, defaultValue: "0" }),
    hourlyRateMinor: moneyField({ nonNegative: true }),
    totalCostMinor: moneyField({ nonNegative: true }),
    currencyCode: currencyCodeField(),
    notes: (0, import_fields25.text)({ ui: { displayMode: "textarea" } }),
    worker: (0, import_fields25.relationship)({ ref: "User" }),
    tradePartner: (0, import_fields25.relationship)({ ref: "TradePartner" }),
    budgetCode: (0, import_fields25.relationship)({ ref: "BudgetCode.laborEntries" }),
    dailyLog: (0, import_fields25.relationship)({ ref: "DailyLog" }),
    scheduleTask: (0, import_fields25.relationship)({ ref: "ScheduleTask" }),
    approvedBy: (0, import_fields25.relationship)({ ref: "User" }),
    approvedAt: (0, import_fields25.timestamp)(),
    company: companyTenantField(),
    project: projectTenantField("Project.laborEntries"),
    ...trackingFields
  }
});
var Equipment = (0, import_core11.list)({
  access: resourceCatalogAccess(),
  graphql: { plural: "EquipmentItems" },
  // "Equipment" is uncountable, and the shared dashboard derives GraphQL names
  // from this Admin Meta plural label, so it must name the EquipmentItems plural.
  ui: { plural: "Equipment Items", listView: { initialColumns: ["equipmentNumber", "name", "status", "ownershipType", "company"] } },
  fields: {
    equipmentNumber: (0, import_fields25.text)({ validation: { isRequired: true, length: { min: 1, max: 100 } } }),
    name: (0, import_fields25.text)({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    description: (0, import_fields25.text)({ ui: { displayMode: "textarea" } }),
    equipmentType: (0, import_fields25.text)({ validation: { length: { max: 120 } } }),
    make: (0, import_fields25.text)(),
    model: (0, import_fields25.text)(),
    serialNumber: (0, import_fields25.text)(),
    ownershipType: (0, import_fields25.select)({
      type: "enum",
      options: [
        { label: "Owned", value: "owned" },
        { label: "Leased", value: "leased" },
        { label: "Rented", value: "rented" },
        { label: "Partner", value: "partner" }
      ],
      defaultValue: "owned",
      validation: { isRequired: true }
    }),
    status: (0, import_fields25.select)({
      type: "enum",
      options: [
        { label: "Available", value: "available" },
        { label: "In Use", value: "in_use" },
        { label: "Out of Service", value: "out_of_service" },
        { label: "Retired", value: "retired" }
      ],
      defaultValue: "available",
      validation: { isRequired: true }
    }),
    hourlyCostMinor: moneyField({ nonNegative: true }),
    currencyCode: currencyCodeField(),
    company: ownedCompanyField("Company.equipment"),
    logs: (0, import_fields25.relationship)({ ref: "ResourceLog.equipment", many: true, access: { create: import_access24.denyAll, update: import_access24.denyAll } }),
    ...trackingFields
  }
});
var Material = (0, import_core11.list)({
  access: resourceCatalogAccess(),
  ui: { listView: { initialColumns: ["sku", "name", "unit", "standardCostMinor", "company"] } },
  fields: {
    sku: (0, import_fields25.text)({ validation: { isRequired: true, length: { min: 1, max: 100 } } }),
    name: (0, import_fields25.text)({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    description: (0, import_fields25.text)({ ui: { displayMode: "textarea" } }),
    unit: (0, import_fields25.text)({ validation: { isRequired: true, length: { min: 1, max: 40 } } }),
    standardCostMinor: moneyField({ nonNegative: true }),
    currencyCode: currencyCodeField(),
    manufacturer: (0, import_fields25.text)(),
    modelNumber: (0, import_fields25.text)(),
    isActive: (0, import_fields25.select)({
      type: "enum",
      options: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
        { label: "Discontinued", value: "discontinued" }
      ],
      defaultValue: "active",
      validation: { isRequired: true }
    }),
    company: ownedCompanyField("Company.materials"),
    logs: (0, import_fields25.relationship)({ ref: "ResourceLog.material", many: true, access: { create: import_access24.denyAll, update: import_access24.denyAll } }),
    procurementRequestLines: (0, import_fields25.relationship)({ ref: "ProcurementRequestLine.material", many: true, access: { create: import_access24.denyAll, update: import_access24.denyAll } }),
    ...trackingFields
  }
});
async function validateResourceLog(args) {
  if (args.operation === "update") {
    args.addValidationError("Resource facts are append-only; a linked controlled correction is required, not an edit");
    return;
  }
  try {
    validateResourceFact(args.resolvedData.resourceType, args.resolvedData.eventType, String(args.resolvedData.quantity ?? "0"), args.resolvedData.unit);
  } catch (error) {
    args.addValidationError(error instanceof Error ? error.message : "Invalid resource fact");
  }
  const commandContext = args.context;
  const actorId = getConnectedId(args.resolvedData.operator);
  const projectId2 = getConnectedId(args.resolvedData.project);
  if (!actorId || actorId !== commandContext.session?.itemId || !projectId2) {
    args.addValidationError("Resource facts require the authenticated operator and selected project");
  } else {
    try {
      await resourceAuthority(commandContext, projectId2, true);
    } catch {
      args.addValidationError("Resource activity not authorized for the current project role");
    }
  }
  const type = args.resolvedData.resourceType ?? args.item?.resourceType;
  const currentEquipmentId = typeof args.item?.equipmentId === "string" ? args.item.equipmentId : null;
  const currentMaterialId = typeof args.item?.materialId === "string" ? args.item.materialId : null;
  const equipmentId = getConnectedId(args.resolvedData.equipment) ?? currentEquipmentId;
  const materialId = getConnectedId(args.resolvedData.material) ?? currentMaterialId;
  if (type === "equipment" && (!equipmentId || materialId)) {
    args.addValidationError("Equipment logs require equipment and cannot reference material");
  }
  if (type === "material" && (!materialId || equipmentId)) {
    args.addValidationError("Material logs require material and cannot reference equipment");
  }
}
var ResourceLog = (0, import_core11.list)({
  access: {
    ...fieldAccess2(),
    filter: { query: async ({ session, context }) => {
      const native = fieldAccess2().filter.query({ session });
      if (!context || native === false) return false;
      const live = await resourceReadFilter({ session, sudo: () => context.sudo() });
      return live === false ? false : { AND: [native, live] };
    } }
  },
  hooks: {
    ...projectTenantHooks(),
    validate: {
      create: validateResourceLog,
      update: validateResourceLog,
      delete: ({ addValidationError }) => {
        addValidationError("Resource facts are retained; deletion is not a correction");
      }
    }
  },
  ui: { listView: { initialColumns: ["occurredAt", "resourceType", "eventType", "equipment", "material", "quantity"] } },
  fields: {
    resourceType: (0, import_fields25.select)({
      type: "enum",
      options: [
        { label: "Equipment", value: "equipment" },
        { label: "Material", value: "material" }
      ],
      validation: { isRequired: true }
    }),
    eventType: (0, import_fields25.select)({
      type: "enum",
      options: [
        { label: "Equipment Use", value: "equipment_use" },
        { label: "Equipment Idle", value: "equipment_idle" },
        { label: "Equipment Breakdown", value: "equipment_breakdown" },
        { label: "Material Received", value: "material_received" },
        { label: "Material Installed", value: "material_installed" },
        { label: "Material Transferred", value: "material_transferred" },
        { label: "Material Wasted", value: "material_wasted" }
      ],
      validation: { isRequired: true }
    }),
    occurredAt: (0, import_fields25.timestamp)({ validation: { isRequired: true }, defaultValue: { kind: "now" } }),
    endedAt: (0, import_fields25.timestamp)(),
    quantity: (0, import_fields25.decimal)({ precision: 18, scale: 4, defaultValue: "0" }),
    unit: (0, import_fields25.text)({ validation: { length: { max: 40 } } }),
    unitCostMinor: moneyField(),
    totalCostMinor: moneyField(),
    currencyCode: currencyCodeField(),
    notes: (0, import_fields25.text)({ ui: { displayMode: "textarea" } }),
    equipment: (0, import_fields25.relationship)({ ref: "Equipment.logs" }),
    material: (0, import_fields25.relationship)({ ref: "Material.logs" }),
    budgetCode: (0, import_fields25.relationship)({ ref: "BudgetCode.resourceLogs" }),
    dailyLog: (0, import_fields25.relationship)({ ref: "DailyLog" }),
    location: (0, import_fields25.relationship)({ ref: "ProjectLocation" }),
    operator: (0, import_fields25.relationship)({ ref: "User" }),
    tradePartner: (0, import_fields25.relationship)({ ref: "TradePartner" }),
    company: companyTenantField(),
    project: projectTenantField("Project.resourceLogs"),
    ...trackingFields
  }
});

// features/keystone/models/safety.ts
var import_core12 = require("@keystone-6/core");
var import_access26 = require("@keystone-6/core/access");
var import_fields27 = require("@keystone-6/core/fields");
var safetyAccess = () => controlledProjectModelAccess("canReadSafety", "canManageSafety");
var SafetyIncident = (0, import_core12.list)({
  access: safetyAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["incidentNumber", "title", "severity", "status", "occurredAt"] } },
  fields: {
    incidentNumber: (0, import_fields27.text)({ validation: { isRequired: true, length: { min: 1, max: 80 } } }),
    title: (0, import_fields27.text)({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    description: (0, import_fields27.text)({ validation: { isRequired: true }, ui: { displayMode: "textarea" } }),
    incidentType: (0, import_fields27.select)({
      type: "enum",
      options: [
        { label: "Near Miss", value: "near_miss" },
        { label: "First Aid", value: "first_aid" },
        { label: "Recordable Injury", value: "recordable_injury" },
        { label: "Lost Time", value: "lost_time" },
        { label: "Property Damage", value: "property_damage" },
        { label: "Environmental", value: "environmental" },
        { label: "Security", value: "security" }
      ],
      defaultValue: "near_miss",
      validation: { isRequired: true }
    }),
    severity: (0, import_fields27.select)({
      type: "enum",
      options: [
        { label: "Low", value: "low" },
        { label: "Moderate", value: "moderate" },
        { label: "Serious", value: "serious" },
        { label: "Critical", value: "critical" },
        { label: "Fatal", value: "fatal" }
      ],
      defaultValue: "low",
      validation: { isRequired: true }
    }),
    status: lifecycleStatus([
      { label: "Reported", value: "reported" },
      { label: "Investigating", value: "investigating" },
      { label: "Corrective Action", value: "corrective_action" },
      { label: "Closed", value: "closed" }
    ], "reported"),
    occurredAt: (0, import_fields27.timestamp)({ validation: { isRequired: true } }),
    reportedAt: (0, import_fields27.timestamp)({ defaultValue: { kind: "now" }, validation: { isRequired: true } }),
    closedAt: (0, import_fields27.timestamp)(),
    isOshaRecordable: (0, import_fields27.checkbox)({ defaultValue: false }),
    daysAway: (0, import_fields27.integer)({ defaultValue: 0, validation: { min: 0 }, access: { read: import_access26.denyAll } }),
    restrictedDutyDays: (0, import_fields27.integer)({ defaultValue: 0, validation: { min: 0 }, access: { read: import_access26.denyAll } }),
    injuredPartyName: (0, import_fields27.text)({ access: { read: import_access26.denyAll } }),
    injuryDetails: (0, import_fields27.text)({ access: { read: import_access26.denyAll }, ui: { displayMode: "textarea" } }),
    privateNotes: (0, import_fields27.text)({ access: { read: import_access26.denyAll }, ui: { displayMode: "textarea" } }),
    reportedBy: (0, import_fields27.relationship)({ ref: "User" }),
    investigator: (0, import_fields27.relationship)({ ref: "User" }),
    responsiblePartner: (0, import_fields27.relationship)({ ref: "TradePartner" }),
    location: (0, import_fields27.relationship)({ ref: "ProjectLocation" }),
    dailyLogEntries: (0, import_fields27.relationship)({ ref: "DailyLogEntry.safetyIncident", many: true, access: { create: import_access26.denyAll, update: import_access26.denyAll } }),
    correctiveActions: (0, import_fields27.relationship)({ ref: "CorrectiveAction.safetyIncident", many: true, access: { create: import_access26.denyAll, update: import_access26.denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.safetyIncidents"),
    ...trackingFields
  }
});
var SafetyObservation = (0, import_core12.list)({
  access: safetyAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["observationNumber", "title", "observationType", "status", "observedAt"] } },
  fields: {
    observationNumber: (0, import_fields27.text)({ validation: { isRequired: true, length: { min: 1, max: 80 } } }),
    title: (0, import_fields27.text)({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    description: (0, import_fields27.text)({ validation: { isRequired: true }, ui: { displayMode: "textarea" } }),
    observationType: (0, import_fields27.select)({
      type: "enum",
      options: [
        { label: "Safe Practice", value: "safe_practice" },
        { label: "Unsafe Act", value: "unsafe_act" },
        { label: "Unsafe Condition", value: "unsafe_condition" },
        { label: "Environmental", value: "environmental" },
        { label: "Quality", value: "quality" }
      ],
      defaultValue: "unsafe_condition",
      validation: { isRequired: true }
    }),
    status: lifecycleStatus([
      { label: "Open", value: "open" },
      { label: "Assigned", value: "assigned" },
      { label: "Resolved", value: "resolved" },
      { label: "Closed", value: "closed" }
    ], "open"),
    observedAt: (0, import_fields27.timestamp)({ validation: { isRequired: true }, defaultValue: { kind: "now" } }),
    dueAt: (0, import_fields27.timestamp)(),
    resolvedAt: (0, import_fields27.timestamp)(),
    observedBy: (0, import_fields27.relationship)({ ref: "User" }),
    assignedTo: (0, import_fields27.relationship)({ ref: "User" }),
    responsiblePartner: (0, import_fields27.relationship)({ ref: "TradePartner" }),
    location: (0, import_fields27.relationship)({ ref: "ProjectLocation" }),
    correctiveActions: (0, import_fields27.relationship)({ ref: "CorrectiveAction.safetyObservation", many: true, access: { create: import_access26.denyAll, update: import_access26.denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.safetyObservations"),
    ...trackingFields
  }
});
var InspectionTemplate = (0, import_core12.list)({
  access: safetyAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["name", "inspectionType", "version", "isActive"] } },
  fields: {
    name: (0, import_fields27.text)({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    inspectionType: (0, import_fields27.select)({
      type: "enum",
      options: [
        { label: "Safety", value: "safety" },
        { label: "Quality", value: "quality" },
        { label: "Pre-installation", value: "pre_installation" },
        { label: "Commissioning", value: "commissioning" },
        { label: "Regulatory", value: "regulatory" },
        { label: "Equipment", value: "equipment" }
      ],
      defaultValue: "quality",
      validation: { isRequired: true }
    }),
    version: (0, import_fields27.integer)({ defaultValue: 1, validation: { min: 1 } }),
    instructions: (0, import_fields27.text)({ ui: { displayMode: "textarea" } }),
    isActive: (0, import_fields27.checkbox)({ defaultValue: true }),
    inspections: (0, import_fields27.relationship)({ ref: "Inspection.template", many: true, access: { create: import_access26.denyAll, update: import_access26.denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.inspectionTemplates"),
    ...trackingFields
  }
});
var Inspection = (0, import_core12.list)({
  access: safetyAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["inspectionNumber", "title", "status", "scheduledAt", "inspector"] } },
  fields: {
    inspectionNumber: (0, import_fields27.text)({ validation: { isRequired: true, length: { min: 1, max: 80 } } }),
    title: (0, import_fields27.text)({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    description: (0, import_fields27.text)({ ui: { displayMode: "textarea" } }),
    status: lifecycleStatus([
      { label: "Scheduled", value: "scheduled" },
      { label: "In Progress", value: "in_progress" },
      { label: "Passed", value: "passed" },
      { label: "Failed", value: "failed" },
      { label: "Closed", value: "closed" },
      { label: "Cancelled", value: "cancelled" }
    ], "scheduled"),
    scheduledAt: (0, import_fields27.timestamp)(),
    startedAt: (0, import_fields27.timestamp)(),
    completedAt: (0, import_fields27.timestamp)(),
    scorePercent: (0, import_fields27.integer)({ validation: { min: 0, max: 100 } }),
    summary: (0, import_fields27.text)({ ui: { displayMode: "textarea" } }),
    template: (0, import_fields27.relationship)({ ref: "InspectionTemplate.inspections" }),
    inspector: (0, import_fields27.relationship)({ ref: "User" }),
    responsiblePartner: (0, import_fields27.relationship)({ ref: "TradePartner" }),
    location: (0, import_fields27.relationship)({ ref: "ProjectLocation" }),
    specificationSection: (0, import_fields27.relationship)({ ref: "SpecificationSection.inspections" }),
    items: (0, import_fields27.relationship)({ ref: "InspectionItem.inspection", many: true, access: { create: import_access26.denyAll, update: import_access26.denyAll } }),
    dailyLogEntries: (0, import_fields27.relationship)({ ref: "DailyLogEntry.inspection", many: true, access: { create: import_access26.denyAll, update: import_access26.denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.inspections"),
    ...trackingFields
  }
});
var InspectionItem = (0, import_core12.list)({
  access: safetyAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["inspection", "sequence", "prompt", "result", "assignedTo"] } },
  fields: {
    sequence: (0, import_fields27.integer)({ defaultValue: 1, validation: { min: 1 } }),
    prompt: (0, import_fields27.text)({ validation: { isRequired: true, length: { min: 1, max: 500 } } }),
    requirement: (0, import_fields27.text)({ ui: { displayMode: "textarea" } }),
    result: (0, import_fields27.select)({
      type: "enum",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Pass", value: "pass" },
        { label: "Fail", value: "fail" },
        { label: "Not Applicable", value: "not_applicable" }
      ],
      defaultValue: "pending",
      validation: { isRequired: true }
    }),
    response: (0, import_fields27.text)({ ui: { displayMode: "textarea" } }),
    dueAt: (0, import_fields27.timestamp)(),
    completedAt: (0, import_fields27.timestamp)(),
    inspection: (0, import_fields27.relationship)({ ref: "Inspection.items" }),
    assignedTo: (0, import_fields27.relationship)({ ref: "User" }),
    punchItems: (0, import_fields27.relationship)({ ref: "PunchItem.inspectionItem", many: true, access: { create: import_access26.denyAll, update: import_access26.denyAll } }),
    correctiveActions: (0, import_fields27.relationship)({ ref: "CorrectiveAction.inspectionItem", many: true, access: { create: import_access26.denyAll, update: import_access26.denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.inspectionItems"),
    ...trackingFields
  }
});
async function validateCorrectiveActionSource(args) {
  if (args.operation !== "create") return;
  const sourceIds = [
    getConnectedId(args.resolvedData.safetyIncident),
    getConnectedId(args.resolvedData.safetyObservation),
    getConnectedId(args.resolvedData.inspectionItem),
    getConnectedId(args.resolvedData.punchItem)
  ].filter(Boolean);
  if (sourceIds.length === 0) {
    args.addValidationError("A corrective action must reference an incident, observation, inspection item, or punch item");
  }
}
var CorrectiveAction = (0, import_core12.list)({
  access: safetyAccess(),
  hooks: {
    ...projectTenantHooks(),
    validate: { create: validateCorrectiveActionSource }
  },
  ui: { listView: { initialColumns: ["actionNumber", "title", "status", "assignedTo", "dueAt"] } },
  fields: {
    actionNumber: (0, import_fields27.text)({ validation: { isRequired: true, length: { min: 1, max: 80 } } }),
    title: (0, import_fields27.text)({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    description: (0, import_fields27.text)({ validation: { isRequired: true }, ui: { displayMode: "textarea" } }),
    status: lifecycleStatus([
      { label: "Open", value: "open" },
      { label: "In Progress", value: "in_progress" },
      { label: "Ready for Verification", value: "ready_for_verification" },
      { label: "Verified", value: "verified" },
      { label: "Closed", value: "closed" }
    ], "open"),
    priority: (0, import_fields27.select)({
      type: "enum",
      options: [
        { label: "Low", value: "low" },
        { label: "Normal", value: "normal" },
        { label: "High", value: "high" },
        { label: "Critical", value: "critical" }
      ],
      defaultValue: "normal"
    }),
    dueAt: (0, import_fields27.timestamp)(),
    completionNotes: (0, import_fields27.text)({ ui: { displayMode: "textarea" } }),
    evidenceReference: (0, import_fields27.text)({ validation: { length: { max: 240 } } }),
    evidenceChecksumSha256: (0, import_fields27.text)({ validation: { length: { max: 64 } } }),
    completedAt: (0, import_fields27.timestamp)(),
    verifiedAt: (0, import_fields27.timestamp)(),
    assignedTo: (0, import_fields27.relationship)({ ref: "User" }),
    verifiedBy: (0, import_fields27.relationship)({ ref: "User" }),
    responsiblePartner: (0, import_fields27.relationship)({ ref: "TradePartner" }),
    safetyIncident: (0, import_fields27.relationship)({ ref: "SafetyIncident.correctiveActions" }),
    safetyObservation: (0, import_fields27.relationship)({ ref: "SafetyObservation.correctiveActions" }),
    inspectionItem: (0, import_fields27.relationship)({ ref: "InspectionItem.correctiveActions" }),
    punchItem: (0, import_fields27.relationship)({ ref: "PunchItem.correctiveActions" }),
    company: companyTenantField(),
    project: projectTenantField("Project.correctiveActions"),
    ...trackingFields
  }
});

// features/keystone/models/billing.ts
var import_core13 = require("@keystone-6/core");
var import_access28 = require("@keystone-6/core/access");
var import_fields29 = require("@keystone-6/core/fields");
var billingAccess = () => controlledProjectModelAccess("canReadBilling", "canManageBilling");
function nextRelationshipId2(input, currentId) {
  if (input === void 0) return currentId;
  if (input && typeof input === "object" && input.disconnect) return null;
  return getConnectedId(input);
}
async function validateClaimSide(args) {
  let current = null;
  if (args.operation === "update" && args.item?.id) {
    current = await queryById(
      args.context,
      "ProgressClaim",
      args.item.id.toString(),
      "claimType primeContract { id } commitment { id }"
    );
  }
  const primeContractId = nextRelationshipId2(args.resolvedData.primeContract, current?.primeContract?.id ?? null);
  const commitmentId = nextRelationshipId2(args.resolvedData.commitment, current?.commitment?.id ?? null);
  const claimType = args.resolvedData.claimType ?? current?.claimType;
  if (Boolean(primeContractId) === Boolean(commitmentId)) {
    args.addValidationError("Exactly one of primeContract or commitment is required");
    return;
  }
  if (claimType === "owner" && !primeContractId) {
    args.addValidationError("Owner progress claims require a prime contract");
  }
  if (claimType === "commitment" && !commitmentId) {
    args.addValidationError("Commitment progress claims require a commitment");
  }
}
var ProgressClaim = (0, import_core13.list)({
  access: billingAccess(),
  hooks: {
    ...projectTenantHooks(),
    validate: { create: validateClaimSide, update: validateClaimSide }
  },
  ui: { listView: { initialColumns: ["claimNumber", "claimType", "status", "periodEnd", "currentPaymentDueMinor"] } },
  fields: {
    claimNumber: (0, import_fields29.text)({ validation: { isRequired: true, length: { min: 1, max: 100 } } }),
    invoiceNumber: (0, import_fields29.text)({ validation: { length: { max: 100 } } }),
    claimType: (0, import_fields29.select)({
      type: "enum",
      options: [
        { label: "Owner", value: "owner" },
        { label: "Commitment", value: "commitment" }
      ],
      defaultValue: "commitment",
      validation: { isRequired: true }
    }),
    status: lifecycleStatus([
      { label: "Draft", value: "draft" },
      { label: "Submitted", value: "submitted" },
      { label: "Under Review", value: "under_review" },
      { label: "Approved", value: "approved" },
      { label: "Partially Paid", value: "partially_paid" },
      { label: "Paid", value: "paid" },
      { label: "Rejected", value: "rejected" },
      { label: "Closed", value: "closed" },
      { label: "Voided", value: "voided" }
    ], "draft"),
    periodStart: (0, import_fields29.timestamp)({ validation: { isRequired: true } }),
    periodEnd: (0, import_fields29.timestamp)({ validation: { isRequired: true } }),
    submittedAt: (0, import_fields29.timestamp)(),
    approvedAt: (0, import_fields29.timestamp)(),
    dueAt: (0, import_fields29.timestamp)(),
    originalContractMinor: moneyField(),
    approvedChangesMinor: moneyField(),
    revisedContractMinor: moneyField(),
    workCompletedToDateMinor: moneyField(),
    storedMaterialsMinor: moneyField(),
    retainageMinor: moneyField(),
    earnedLessRetainageMinor: moneyField(),
    previousPaymentsMinor: moneyField(),
    currentPaymentDueMinor: moneyField(),
    balanceToFinishMinor: moneyField(),
    currencyCode: currencyCodeField(),
    certification: (0, import_fields29.text)({ ui: { displayMode: "textarea" } }),
    primeContract: (0, import_fields29.relationship)({ ref: "PrimeContract.progressClaims" }),
    commitment: (0, import_fields29.relationship)({ ref: "Commitment.progressClaims" }),
    tradePartner: (0, import_fields29.relationship)({ ref: "TradePartner.progressClaims" }),
    submittedBy: (0, import_fields29.relationship)({ ref: "User" }),
    reviewedBy: (0, import_fields29.relationship)({ ref: "User" }),
    lineItems: (0, import_fields29.relationship)({ ref: "ProgressClaimLineItem.progressClaim", many: true, access: { create: import_access28.denyAll, update: import_access28.denyAll } }),
    allocations: (0, import_fields29.relationship)({ ref: "PaymentAllocation.progressClaim", many: true, access: { create: import_access28.denyAll, update: import_access28.denyAll } }),
    retainageReleases: (0, import_fields29.relationship)({ ref: "RetainageRelease.progressClaim", many: true, access: { create: import_access28.denyAll, update: import_access28.denyAll } }),
    lienWaivers: (0, import_fields29.relationship)({ ref: "LienWaiver.progressClaim", many: true, access: { create: import_access28.denyAll, update: import_access28.denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.progressClaims"),
    ...trackingFields
  }
});
async function validateClaimLineContract(args) {
  if (args.operation !== "create") return;
  const progressClaimId = getConnectedId(args.resolvedData.progressClaim);
  const contractLineItemId = getConnectedId(args.resolvedData.contractLineItem);
  if (!progressClaimId || !contractLineItemId) return;
  const [claim, line] = await Promise.all([
    queryById(args.context, "ProgressClaim", progressClaimId, "primeContract { id } commitment { id }"),
    queryById(args.context, "ContractLineItem", contractLineItemId, "primeContract { id } commitment { id }")
  ]);
  const matchesPrime = claim?.primeContract?.id && claim.primeContract.id === line?.primeContract?.id;
  const matchesCommitment = claim?.commitment?.id && claim.commitment.id === line?.commitment?.id;
  if (!matchesPrime && !matchesCommitment) {
    args.addValidationError("The progress claim and contract line item must belong to the same contract");
  }
}
var ProgressClaimLineItem = (0, import_core13.list)({
  access: billingAccess(),
  hooks: {
    ...immutableProjectSnapshotHooks("ProgressClaimLineItem"),
    validate: { create: validateClaimLineContract }
  },
  ui: { listView: { initialColumns: ["lineNumber", "description", "progressClaim", "scheduledValueMinor", "currentWorkMinor"] } },
  fields: {
    lineNumber: (0, import_fields29.integer)({ validation: { isRequired: true, min: 1 }, access: { update: import_access28.denyAll } }),
    description: (0, import_fields29.text)({ validation: { isRequired: true, length: { min: 1, max: 500 } }, access: { update: import_access28.denyAll } }),
    scheduledValueMinor: moneyField({ immutable: true }),
    previousWorkMinor: moneyField({ immutable: true }),
    currentWorkMinor: moneyField({ immutable: true }),
    storedMaterialsMinor: moneyField({ immutable: true }),
    completedStoredToDateMinor: moneyField({ immutable: true }),
    percentComplete: (0, import_fields29.integer)({ defaultValue: 0, validation: { min: 0, max: 100 }, access: { update: import_access28.denyAll } }),
    retainageBps: basisPointsField(),
    retainageMinor: moneyField({ immutable: true }),
    earnedLessRetainageMinor: moneyField({ immutable: true }),
    balanceToFinishMinor: moneyField({ immutable: true }),
    progressClaim: (0, import_fields29.relationship)({ ref: "ProgressClaim.lineItems", access: { update: import_access28.denyAll } }),
    contractLineItem: (0, import_fields29.relationship)({ ref: "ContractLineItem.progressClaimLineItems", access: { update: import_access28.denyAll } }),
    retainageReleases: (0, import_fields29.relationship)({ ref: "RetainageRelease.progressClaimLineItem", many: true, access: { create: import_access28.denyAll, update: import_access28.denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.progressClaimLineItems"),
    ...trackingFields
  }
});
var Payment = (0, import_core13.list)({
  access: billingAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["paymentNumber", "direction", "status", "amountMinor", "paidAt", "tradePartner"] } },
  fields: {
    paymentNumber: (0, import_fields29.text)({ validation: { isRequired: true, length: { min: 1, max: 100 } } }),
    direction: (0, import_fields29.select)({
      type: "enum",
      options: [
        { label: "Receipt", value: "receipt" },
        { label: "Disbursement", value: "disbursement" }
      ],
      validation: { isRequired: true }
    }),
    status: lifecycleStatus([
      { label: "Pending", value: "pending" },
      { label: "Authorized", value: "authorized" },
      { label: "Settled", value: "settled" },
      { label: "Reversed", value: "reversed" },
      { label: "Failed", value: "failed" },
      { label: "Voided", value: "voided" }
    ], "pending"),
    amountMinor: moneyField({ positive: true }),
    currencyCode: currencyCodeField(),
    paymentMethod: (0, import_fields29.select)({
      type: "enum",
      options: [
        { label: "ACH", value: "ach" },
        { label: "Check", value: "check" },
        { label: "Wire", value: "wire" },
        { label: "Card", value: "card" },
        { label: "Cash", value: "cash" },
        { label: "Other", value: "other" }
      ],
      defaultValue: "ach",
      validation: { isRequired: true }
    }),
    reference: (0, import_fields29.text)(),
    paidAt: (0, import_fields29.timestamp)(),
    settledAt: (0, import_fields29.timestamp)(),
    tradePartner: (0, import_fields29.relationship)({ ref: "TradePartner.payments" }),
    recordedBy: (0, import_fields29.relationship)({ ref: "User" }),
    allocations: (0, import_fields29.relationship)({ ref: "PaymentAllocation.payment", many: true, access: { create: import_access28.denyAll, update: import_access28.denyAll } }),
    reversals: (0, import_fields29.relationship)({ ref: "PaymentReversal.payment", many: true, access: { create: import_access28.denyAll, update: import_access28.denyAll } }),
    lienWaivers: (0, import_fields29.relationship)({ ref: "LienWaiver.payment", many: true, access: { create: import_access28.denyAll, update: import_access28.denyAll } }),
    retainageReleases: (0, import_fields29.relationship)({ ref: "RetainageRelease.payment", many: true, access: { create: import_access28.denyAll, update: import_access28.denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.payments"),
    ...trackingFields
  }
});
var PaymentReversal = (0, import_core13.list)({
  access: billingAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["reversalNumber", "payment", "amountMinor", "effectiveAt", "reversedBy"] } },
  fields: {
    reversalNumber: (0, import_fields29.text)({ validation: { isRequired: true, length: { min: 1, max: 100 } }, access: { update: import_access28.denyAll } }),
    amountMinor: moneyField({ positive: true, immutable: true }),
    reason: (0, import_fields29.text)({ validation: { isRequired: true, length: { min: 3, max: 2e3 } }, access: { update: import_access28.denyAll }, ui: { displayMode: "textarea" } }),
    externalReference: (0, import_fields29.text)({ validation: { isRequired: true, length: { min: 1, max: 200 } }, access: { update: import_access28.denyAll } }),
    effectiveAt: (0, import_fields29.timestamp)({ validation: { isRequired: true }, access: { update: import_access28.denyAll } }),
    allocationSnapshot: (0, import_fields29.text)({ validation: { isRequired: true }, access: { update: import_access28.denyAll }, ui: { displayMode: "textarea" } }),
    payment: (0, import_fields29.relationship)({ ref: "Payment.reversals", access: { update: import_access28.denyAll } }),
    reversedBy: (0, import_fields29.relationship)({ ref: "User", access: { update: import_access28.denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.paymentReversals"),
    ...trackingFields
  }
});
var PaymentAllocation = (0, import_core13.list)({
  access: billingAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["payment", "progressClaim", "amountMinor"] } },
  fields: {
    amountMinor: moneyField({ positive: true }),
    payment: (0, import_fields29.relationship)({ ref: "Payment.allocations" }),
    progressClaim: (0, import_fields29.relationship)({ ref: "ProgressClaim.allocations" }),
    company: companyTenantField(),
    project: projectTenantField("Project.paymentAllocations"),
    ...trackingFields
  }
});
var RetainageRelease = (0, import_core13.list)({
  access: billingAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["releaseNumber", "status", "amountMinor", "progressClaim", "releasedAt"] } },
  fields: {
    releaseNumber: (0, import_fields29.text)({ validation: { isRequired: true, length: { min: 1, max: 100 } } }),
    status: lifecycleStatus([
      { label: "Requested", value: "requested" },
      { label: "Approved", value: "approved" },
      { label: "Released", value: "released" },
      { label: "Rejected", value: "rejected" },
      { label: "Voided", value: "voided" }
    ], "requested"),
    amountMinor: moneyField({ positive: true }),
    currencyCode: currencyCodeField(),
    requestedAt: (0, import_fields29.timestamp)({ defaultValue: { kind: "now" } }),
    approvedAt: (0, import_fields29.timestamp)(),
    releasedAt: (0, import_fields29.timestamp)(),
    reason: (0, import_fields29.text)({ ui: { displayMode: "textarea" } }),
    progressClaim: (0, import_fields29.relationship)({ ref: "ProgressClaim.retainageReleases" }),
    progressClaimLineItem: (0, import_fields29.relationship)({ ref: "ProgressClaimLineItem.retainageReleases" }),
    payment: (0, import_fields29.relationship)({ ref: "Payment.retainageReleases" }),
    approvedBy: (0, import_fields29.relationship)({ ref: "User" }),
    company: companyTenantField(),
    project: projectTenantField("Project.retainageReleases"),
    ...trackingFields
  }
});
var LienWaiver = (0, import_core13.list)({
  access: billingAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["waiverNumber", "waiverType", "status", "tradePartner", "throughDate"] } },
  fields: {
    waiverNumber: (0, import_fields29.text)({ validation: { isRequired: true, length: { min: 1, max: 100 } } }),
    waiverType: (0, import_fields29.select)({
      type: "enum",
      options: [
        { label: "Conditional Progress", value: "conditional_progress" },
        { label: "Unconditional Progress", value: "unconditional_progress" },
        { label: "Conditional Final", value: "conditional_final" },
        { label: "Unconditional Final", value: "unconditional_final" }
      ],
      validation: { isRequired: true }
    }),
    status: lifecycleStatus([
      { label: "Requested", value: "requested" },
      { label: "Received", value: "received" },
      { label: "Accepted", value: "accepted" },
      { label: "Rejected", value: "rejected" },
      { label: "Expired", value: "expired" }
    ], "requested"),
    throughDate: (0, import_fields29.timestamp)({ validation: { isRequired: true } }),
    amountMinor: moneyField({ nonNegative: true }),
    currencyCode: currencyCodeField(),
    requestedAt: (0, import_fields29.timestamp)(),
    receivedAt: (0, import_fields29.timestamp)(),
    signedAt: (0, import_fields29.timestamp)(),
    signerName: (0, import_fields29.text)({ access: { read: import_access28.denyAll } }),
    fileName: (0, import_fields29.text)({ access: { read: import_access28.denyAll } }),
    storageKey: (0, import_fields29.text)({ access: { read: import_access28.denyAll } }),
    checksumSha256: (0, import_fields29.text)({ validation: { length: { min: 64, max: 64 } }, access: { read: import_access28.denyAll } }),
    tradePartner: (0, import_fields29.relationship)({ ref: "TradePartner.lienWaivers" }),
    commitment: (0, import_fields29.relationship)({ ref: "Commitment.lienWaivers" }),
    progressClaim: (0, import_fields29.relationship)({ ref: "ProgressClaim.lienWaivers" }),
    payment: (0, import_fields29.relationship)({ ref: "Payment.lienWaivers" }),
    reviewedBy: (0, import_fields29.relationship)({ ref: "User" }),
    company: companyTenantField(),
    project: projectTenantField("Project.lienWaivers"),
    ...trackingFields
  }
});

// features/keystone/models/agents.ts
var import_core14 = require("@keystone-6/core");
var import_access30 = require("@keystone-6/core/access");
var import_fields31 = require("@keystone-6/core/fields");
function validateIdentityOwner(args) {
  return validateCompanyOwner({ ...args, listKey: "AgentIdentity", required: true, immutable: true });
}
var deny2 = () => false;
var AuthSession = (0, import_core14.list)({
  access: {
    operation: { query: deny2, create: deny2, update: deny2, delete: deny2 }
  },
  graphql: { omit: { query: true, create: true, update: true, delete: true } },
  ui: { isHidden: true },
  fields: {
    sessionKey: (0, import_fields31.text)({ isIndexed: "unique", validation: { isRequired: true }, access: { read: import_access30.denyAll, update: import_access30.denyAll } }),
    user: (0, import_fields31.relationship)({ ref: "User.authSessions", access: { update: import_access30.denyAll } }),
    expiresAt: (0, import_fields31.timestamp)({ validation: { isRequired: true }, access: { update: import_access30.denyAll } }),
    revokedAt: (0, import_fields31.timestamp)(),
    ...trackingFields
  }
});
var AgentIdentity = (0, import_core14.list)({
  access: companyModelAccess("canReadAgents", "canManageAgents", { delete: false }),
  hooks: {
    validate: {
      create: validateIdentityOwner,
      update: validateIdentityOwner
    }
  },
  ui: { listView: { initialColumns: ["name", "slug", "status", "owner", "company"] } },
  fields: {
    name: (0, import_fields31.text)({ validation: { isRequired: true, length: { min: 1, max: 200 } } }),
    slug: (0, import_fields31.text)({
      validation: { isRequired: true, length: { min: 2, max: 120 }, match: { regex: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ } }
    }),
    description: (0, import_fields31.text)({ ui: { displayMode: "textarea" } }),
    status: (0, import_fields31.select)({
      type: "enum",
      options: [
        { label: "Active", value: "active" },
        { label: "Suspended", value: "suspended" },
        { label: "Revoked", value: "revoked" }
      ],
      defaultValue: "active",
      validation: { isRequired: true }
    }),
    approvalMode: (0, import_fields31.select)({
      type: "enum",
      options: [
        { label: "Always", value: "always" },
        { label: "Financial and Contract Actions", value: "risk_based" },
        { label: "No Additional Approval", value: "none" }
      ],
      defaultValue: "always",
      validation: { isRequired: true }
    }),
    owner: (0, import_fields31.relationship)({ ref: "User.agentIdentities", access: { update: import_access30.denyAll } }),
    company: ownedCompanyField("Company.agentIdentities"),
    scopeGrants: readOnlyRelationshipMany("ScopeGrant.agentIdentity"),
    actions: readOnlyRelationshipMany("AgentAction.agentIdentity"),
    ...trackingFields
  }
});
async function validateScopeProject(args) {
  let current = null;
  if (args.operation === "update" && args.item?.id) {
    current = await queryById(
      args.context,
      "ScopeGrant",
      args.item.id.toString(),
      "company { id } project { id } agentIdentity { id company { id } } grantedBy { id }"
    );
  }
  const companyId = getConnectedId(args.resolvedData.company) ?? current?.company?.id ?? null;
  const projectId2 = args.resolvedData.project === void 0 ? current?.project?.id ?? null : getConnectedId(args.resolvedData.project);
  const agentIdentityId = getConnectedId(args.resolvedData.agentIdentity) ?? current?.agentIdentity?.id ?? null;
  const grantedById = getConnectedId(args.resolvedData.grantedBy) ?? current?.grantedBy?.id ?? null;
  if (!companyId) args.addValidationError("Scope company is required");
  if (!agentIdentityId) args.addValidationError("Scope agent identity is required");
  if (!grantedById) args.addValidationError("Scope grantor is required");
  if (!companyId || !agentIdentityId) return;
  const identity = await queryById(args.context, "AgentIdentity", agentIdentityId, "company { id }");
  if (identity?.company?.id !== companyId) {
    args.addValidationError("The scope agent identity must belong to the scope company");
  }
  if (!projectId2) return;
  const project = await queryById(args.context, "Project", projectId2, "company { id }");
  if (project?.company?.id !== companyId) {
    args.addValidationError("The scope project must belong to the scope company");
  }
}
var ScopeGrant = (0, import_core14.list)({
  access: companyModelAccess("canReadAgents", "canManageAgents", { delete: false }),
  hooks: {
    resolveInput: {
      create: ({ resolvedData, context }) => {
        const actorId = context.session?.itemId ?? getConnectedId(resolvedData.grantedBy);
        if (!actorId) throw new Error("Scope grant attribution requires an actor");
        return { ...resolvedData, grantedBy: { connect: { id: actorId } } };
      },
      update: ({ resolvedData, context }) => {
        if (resolvedData.status !== "revoked") return resolvedData;
        const actorId = context.session?.itemId ?? getConnectedId(resolvedData.revokedBy);
        if (!actorId) throw new Error("Scope revocation attribution requires an actor");
        return {
          ...resolvedData,
          revokedAt: /* @__PURE__ */ new Date(),
          revokedBy: { connect: { id: actorId } }
        };
      }
    },
    validate: { create: validateScopeProject, update: validateScopeProject }
  },
  ui: { listView: { initialColumns: ["agentIdentity", "scope", "status", "company", "project", "expiresAt"] } },
  fields: {
    scope: (0, import_fields31.select)({
      type: "string",
      options: scopeOptions,
      validation: { isRequired: true }
    }),
    status: (0, import_fields31.select)({
      type: "enum",
      options: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
        { label: "Revoked", value: "revoked" }
      ],
      defaultValue: "active",
      validation: { isRequired: true }
    }),
    reason: (0, import_fields31.text)({ validation: { isRequired: true, length: { min: 3, max: 500 } } }),
    expiresAt: (0, import_fields31.timestamp)(),
    revokedAt: (0, import_fields31.timestamp)(),
    agentIdentity: (0, import_fields31.relationship)({ ref: "AgentIdentity.scopeGrants", access: { update: import_access30.denyAll } }),
    company: ownedCompanyField("Company.scopeGrants"),
    project: (0, import_fields31.relationship)({ ref: "Project.scopeGrants" }),
    grantedBy: (0, import_fields31.relationship)({ ref: "User", access: { create: import_access30.denyAll, update: import_access30.denyAll } }),
    revokedBy: (0, import_fields31.relationship)({ ref: "User", access: { create: import_access30.denyAll, update: import_access30.denyAll } }),
    ...trackingFields
  }
});
var AgentAction = (0, import_core14.list)({
  access: {
    operation: {
      query: permissions.canReadAudit,
      create: deny2,
      update: deny2,
      delete: deny2
    },
    filter: { query: ({ session }) => projectEvidencePermissionFilter(session) }
  },
  graphql: { omit: { create: true, update: true, delete: true } },
  ui: {
    hideCreate: true,
    hideDelete: true,
    listView: { initialColumns: ["action", "status", "actorType", "targetType", "targetId", "requestedAt"] }
  },
  fields: {
    actionKey: (0, import_fields31.text)({ isIndexed: "unique", validation: { isRequired: true }, access: { update: import_access30.denyAll } }),
    actorType: (0, import_fields31.select)({
      type: "enum",
      options: [
        { label: "Human", value: "human" },
        { label: "Agent", value: "agent" },
        { label: "System", value: "system" }
      ],
      validation: { isRequired: true },
      access: { update: import_access30.denyAll }
    }),
    action: (0, import_fields31.text)({ validation: { isRequired: true, length: { min: 1, max: 200 } }, access: { update: import_access30.denyAll } }),
    requiredScope: (0, import_fields31.select)({ type: "string", options: scopeOptions, access: { update: import_access30.denyAll } }),
    status: (0, import_fields31.select)({
      type: "enum",
      options: [
        { label: "Proposed", value: "proposed" },
        { label: "Approved", value: "approved" },
        { label: "Rejected", value: "rejected" },
        { label: "Running", value: "running" },
        { label: "Succeeded", value: "succeeded" },
        { label: "Failed", value: "failed" }
      ],
      validation: { isRequired: true }
    }),
    targetType: (0, import_fields31.text)({ validation: { isRequired: true, length: { min: 1, max: 120 } }, access: { update: import_access30.denyAll } }),
    targetId: (0, import_fields31.text)({ validation: { isRequired: true, length: { min: 1, max: 200 } }, access: { update: import_access30.denyAll } }),
    targetStatus: (0, import_fields31.text)({ validation: { isRequired: true, length: { min: 1, max: 80 } }, access: { update: import_access30.denyAll } }),
    reason: (0, import_fields31.text)({ validation: { isRequired: true, length: { min: 3, max: 500 } }, access: { update: import_access30.denyAll } }),
    correlationId: (0, import_fields31.text)({ access: { update: import_access30.denyAll } }),
    causationId: (0, import_fields31.text)({ access: { update: import_access30.denyAll } }),
    requestDigest: (0, import_fields31.text)({ access: { read: permissions.canReadAudit, update: import_access30.denyAll } }),
    resultDigest: (0, import_fields31.text)({ access: { read: permissions.canReadAudit } }),
    errorCode: (0, import_fields31.text)(),
    errorMessage: (0, import_fields31.text)({ access: { read: permissions.canReadAudit } }),
    requestedAt: (0, import_fields31.timestamp)({ validation: { isRequired: true }, defaultValue: { kind: "now" }, access: { update: import_access30.denyAll } }),
    reviewedAt: (0, import_fields31.timestamp)(),
    reviewNotes: (0, import_fields31.text)({ access: { read: permissions.canReadAudit } }),
    startedAt: (0, import_fields31.timestamp)(),
    completedAt: (0, import_fields31.timestamp)(),
    company: (0, import_fields31.relationship)({ ref: "Company.agentActions", access: { update: import_access30.denyAll } }),
    project: (0, import_fields31.relationship)({ ref: "Project.agentActions", access: { update: import_access30.denyAll } }),
    agentIdentity: (0, import_fields31.relationship)({ ref: "AgentIdentity.actions", access: { update: import_access30.denyAll } }),
    scopeGrant: (0, import_fields31.relationship)({ ref: "ScopeGrant", access: { update: import_access30.denyAll } }),
    requestedBy: (0, import_fields31.relationship)({ ref: "User.requestedAgentActions", access: { update: import_access30.denyAll } }),
    reviewedBy: (0, import_fields31.relationship)({ ref: "User.reviewedAgentActions" }),
    actorUser: (0, import_fields31.relationship)({ ref: "User.performedAgentActions", access: { update: import_access30.denyAll } }),
    idempotencyKey: (0, import_fields31.relationship)({ ref: "IdempotencyKey.agentAction", access: { update: import_access30.denyAll } }),
    outboxMessages: readOnlyRelationshipMany("OutboxMessage.agentAction"),
    ...trackingFields
  }
});
var OutboxMessage = (0, import_core14.list)({
  access: {
    operation: {
      query: permissions.canReadAudit,
      create: deny2,
      update: deny2,
      delete: deny2
    },
    filter: { query: ({ session }) => projectEvidencePermissionFilter(session) }
  },
  graphql: { omit: { create: true, update: true, delete: true } },
  ui: {
    hideCreate: true,
    hideDelete: true,
    listView: { initialColumns: ["eventType", "aggregateType", "aggregateId", "status", "availableAt"] }
  },
  fields: {
    messageKey: (0, import_fields31.text)({ isIndexed: "unique", validation: { isRequired: true }, access: { update: import_access30.denyAll } }),
    eventType: (0, import_fields31.text)({ validation: { isRequired: true, length: { min: 1, max: 160 } }, access: { update: import_access30.denyAll } }),
    aggregateType: (0, import_fields31.text)({ validation: { isRequired: true, length: { min: 1, max: 120 } }, access: { update: import_access30.denyAll } }),
    aggregateId: (0, import_fields31.text)({ validation: { isRequired: true, length: { min: 1, max: 200 } }, access: { update: import_access30.denyAll } }),
    schemaVersion: (0, import_fields31.integer)({ defaultValue: 1, validation: { isRequired: true, min: 1 }, access: { update: import_access30.denyAll } }),
    canonicalPayload: (0, import_fields31.text)({ validation: { isRequired: true }, access: { read: permissions.canReadAudit, update: import_access30.denyAll }, ui: { displayMode: "textarea" } }),
    payloadDigest: (0, import_fields31.text)({ validation: { isRequired: true, length: { min: 64, max: 64 } }, access: { update: import_access30.denyAll } }),
    status: (0, import_fields31.select)({
      type: "enum",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Processing", value: "processing" },
        { label: "Delivered", value: "delivered" },
        { label: "Retry", value: "retry" },
        { label: "Dead letter", value: "dead_letter" }
      ],
      defaultValue: "pending",
      validation: { isRequired: true }
    }),
    attempts: (0, import_fields31.integer)({ defaultValue: 0, validation: { isRequired: true, min: 0 } }),
    availableAt: (0, import_fields31.timestamp)({ defaultValue: { kind: "now" }, validation: { isRequired: true } }),
    lockedAt: (0, import_fields31.timestamp)(),
    lockOwner: (0, import_fields31.text)({ validation: { length: { max: 200 } } }),
    lastAttemptAt: (0, import_fields31.timestamp)(),
    deliveredAt: (0, import_fields31.timestamp)(),
    lastError: (0, import_fields31.text)({ access: { read: permissions.canReadAudit } }),
    company: (0, import_fields31.relationship)({ ref: "Company.outboxMessages", access: { update: import_access30.denyAll } }),
    project: (0, import_fields31.relationship)({ ref: "Project.outboxMessages", access: { update: import_access30.denyAll } }),
    agentAction: (0, import_fields31.relationship)({ ref: "AgentAction.outboxMessages", access: { update: import_access30.denyAll } }),
    ...trackingFields
  }
});
var IdempotencyKey = (0, import_core14.list)({
  access: {
    operation: {
      query: permissions.canReadAudit,
      create: deny2,
      update: deny2,
      delete: deny2
    },
    filter: { query: ({ session }) => projectEvidencePermissionFilter(session) }
  },
  graphql: { omit: { create: true, update: true, delete: true } },
  ui: {
    hideCreate: true,
    hideDelete: true,
    listView: { initialColumns: ["operation", "key", "status", "resourceType", "resourceId", "createdAt"] }
  },
  fields: {
    fingerprint: (0, import_fields31.text)({ isIndexed: "unique", validation: { isRequired: true }, access: { update: import_access30.denyAll } }),
    key: (0, import_fields31.text)({ validation: { isRequired: true, length: { min: 1, max: 200 } }, access: { update: import_access30.denyAll } }),
    operation: (0, import_fields31.text)({ validation: { isRequired: true, length: { min: 1, max: 200 } }, access: { update: import_access30.denyAll } }),
    requestHash: (0, import_fields31.text)({ validation: { isRequired: true, length: { min: 64, max: 64 } }, access: { update: import_access30.denyAll } }),
    status: (0, import_fields31.select)({
      type: "enum",
      options: [
        { label: "Started", value: "started" },
        { label: "Completed", value: "completed" },
        { label: "Failed", value: "failed" }
      ],
      defaultValue: "started",
      validation: { isRequired: true }
    }),
    resourceType: (0, import_fields31.text)({ access: { update: import_access30.denyAll } }),
    resourceId: (0, import_fields31.text)({ access: { update: import_access30.denyAll } }),
    fromStatus: (0, import_fields31.text)({ access: { update: import_access30.denyAll } }),
    toStatus: (0, import_fields31.text)({ access: { update: import_access30.denyAll } }),
    errorCode: (0, import_fields31.text)(),
    lockedAt: (0, import_fields31.timestamp)({ defaultValue: { kind: "now" }, access: { update: import_access30.denyAll } }),
    expiresAt: (0, import_fields31.timestamp)(),
    company: (0, import_fields31.relationship)({ ref: "Company.idempotencyKeys", access: { update: import_access30.denyAll } }),
    project: (0, import_fields31.relationship)({ ref: "Project.idempotencyKeys", access: { update: import_access30.denyAll } }),
    agentAction: (0, import_fields31.relationship)({ ref: "AgentAction.idempotencyKey" }),
    ...trackingFields
  }
});

// features/keystone/models/governance.ts
var import_core15 = require("@keystone-6/core");
var import_access32 = require("@keystone-6/core/access");
var import_fields33 = require("@keystone-6/core/fields");
var auditRead = () => controlledProjectModelAccess("canReadAudit", "canReadAudit");
var documentRead = () => controlledProjectModelAccess("canReadDocuments", "canManageDocuments");
var ApiCredential = (0, import_core15.list)({
  access: controlledCompanyModelAccess("canReadAgents", "canManageAgents"),
  ui: { listView: { initialColumns: ["name", "tokenPrefix", "status", "company", "project", "expiresAt"] } },
  fields: {
    name: (0, import_fields33.text)({ validation: { isRequired: true, length: { min: 3, max: 160 } } }),
    tokenPrefix: (0, import_fields33.text)({ validation: { isRequired: true, length: { min: 8, max: 24 } }, access: { update: import_access32.denyAll } }),
    tokenHash: (0, import_fields33.text)({
      isIndexed: "unique",
      validation: { isRequired: true, length: { min: 64, max: 64 } },
      access: { read: import_access32.denyAll, create: import_access32.denyAll, update: import_access32.denyAll }
    }),
    status: (0, import_fields33.select)({
      type: "enum",
      options: [
        { label: "Active", value: "active" },
        { label: "Suspended", value: "suspended" },
        { label: "Revoked", value: "revoked" }
      ],
      defaultValue: "active",
      validation: { isRequired: true },
      access: { update: import_access32.denyAll }
    }),
    scopes: (0, import_fields33.multiselect)({
      type: "string",
      options: scopeOptions,
      access: { update: import_access32.denyAll }
    }),
    lastUsedAt: (0, import_fields33.timestamp)({ access: { create: import_access32.denyAll, update: import_access32.denyAll } }),
    expiresAt: (0, import_fields33.timestamp)({ access: { update: import_access32.denyAll } }),
    revokedAt: (0, import_fields33.timestamp)({ access: { create: import_access32.denyAll, update: import_access32.denyAll } }),
    owner: (0, import_fields33.relationship)({ ref: "User", access: { update: import_access32.denyAll } }),
    company: ownedCompanyField("Company.apiCredentials"),
    project: (0, import_fields33.relationship)({ ref: "Project.apiCredentials", access: { update: import_access32.denyAll } }),
    ...trackingFields
  }
});
var AccountInvitation = (0, import_core15.list)({
  access: controlledProjectModelAccess("canReadPeople", "canManagePeople"),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["email", "status", "project", "expiresAt", "acceptedAt"] } },
  fields: {
    tokenHash: (0, import_fields33.text)({ isIndexed: "unique", validation: { isRequired: true, length: { min: 64, max: 64 } }, access: { read: import_access32.denyAll, create: import_access32.denyAll, update: import_access32.denyAll } }),
    tokenPrefix: (0, import_fields33.text)({ validation: { isRequired: true, length: { min: 8, max: 24 } }, access: { update: import_access32.denyAll } }),
    email: (0, import_fields33.text)({ validation: { isRequired: true, length: { min: 3, max: 320 } }, access: { update: import_access32.denyAll } }),
    status: (0, import_fields33.select)({
      type: "enum",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Accepted", value: "accepted" },
        { label: "Revoked", value: "revoked" },
        { label: "Expired", value: "expired" }
      ],
      defaultValue: "pending",
      validation: { isRequired: true },
      access: { update: import_access32.denyAll }
    }),
    expiresAt: (0, import_fields33.timestamp)({ validation: { isRequired: true }, access: { update: import_access32.denyAll } }),
    acceptedAt: (0, import_fields33.timestamp)({ access: { create: import_access32.denyAll, update: import_access32.denyAll } }),
    accountSetupRequired: (0, import_fields33.checkbox)({ defaultValue: false, access: { read: import_access32.denyAll, create: import_access32.denyAll, update: import_access32.denyAll } }),
    invitedBy: (0, import_fields33.relationship)({ ref: "User", access: { update: import_access32.denyAll } }),
    user: (0, import_fields33.relationship)({ ref: "User", access: { update: import_access32.denyAll } }),
    projectMembership: (0, import_fields33.relationship)({ ref: "ProjectMembership", access: { update: import_access32.denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.accountInvitations"),
    ...trackingFields
  }
});
var ApprovalPolicy = (0, import_core15.list)({
  access: controlledCompanyModelAccess("canReadAudit", "canManageRoles"),
  ui: { listView: { initialColumns: ["name", "domain", "minimumAmountMinor", "approverRole", "isActive"] } },
  fields: {
    policyKey: (0, import_fields33.text)({ isIndexed: "unique", validation: { isRequired: true }, access: { create: import_access32.denyAll, update: import_access32.denyAll } }),
    name: (0, import_fields33.text)({ validation: { isRequired: true, length: { min: 3, max: 160 } } }),
    domain: (0, import_fields33.select)({
      type: "enum",
      options: [
        { label: "Budget change", value: "budget_change" },
        { label: "Prime contract", value: "prime_contract" },
        { label: "Change order", value: "change_order" },
        { label: "Progress claim", value: "progress_claim" },
        { label: "Retainage release", value: "retainage_release" }
      ],
      validation: { isRequired: true }
    }),
    minimumAmountMinor: moneyField({ nonNegative: true }),
    currencyCode: currencyCodeField(),
    isActive: (0, import_fields33.checkbox)({ defaultValue: true }),
    approverRole: (0, import_fields33.relationship)({ ref: "Role" }),
    company: ownedCompanyField("Company.approvalPolicies"),
    project: (0, import_fields33.relationship)({ ref: "Project.approvalPolicies" }),
    requests: (0, import_fields33.relationship)({ ref: "ApprovalRequest.policy", many: true, access: { create: import_access32.denyAll, update: import_access32.denyAll } }),
    ...trackingFields
  }
});
var ApprovalRequest = (0, import_core15.list)({
  access: auditRead(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["requestNumber", "targetType", "targetStatus", "status", "amountMinor", "requestedAt"] } },
  fields: {
    requestKey: (0, import_fields33.text)({ isIndexed: "unique", validation: { isRequired: true }, access: { create: import_access32.denyAll, update: import_access32.denyAll } }),
    requestNumber: (0, import_fields33.text)({ validation: { isRequired: true, length: { min: 1, max: 100 } }, access: { update: import_access32.denyAll } }),
    operation: (0, import_fields33.text)({ validation: { isRequired: true, length: { min: 1, max: 160 } }, access: { update: import_access32.denyAll } }),
    targetType: (0, import_fields33.text)({ validation: { isRequired: true, length: { min: 1, max: 120 } }, access: { update: import_access32.denyAll } }),
    targetId: (0, import_fields33.text)({ validation: { isRequired: true, length: { min: 1, max: 200 } }, access: { update: import_access32.denyAll } }),
    targetStatus: (0, import_fields33.text)({ validation: { isRequired: true, length: { min: 1, max: 80 } }, access: { update: import_access32.denyAll } }),
    canonicalSnapshot: (0, import_fields33.text)({ validation: { isRequired: true }, access: { update: import_access32.denyAll }, ui: { displayMode: "textarea" } }),
    snapshotDigest: (0, import_fields33.text)({ validation: { isRequired: true, length: { min: 64, max: 64 } }, access: { update: import_access32.denyAll } }),
    policySnapshot: (0, import_fields33.text)({ validation: { isRequired: true }, access: { update: import_access32.denyAll }, ui: { displayMode: "textarea" } }),
    policyDigest: (0, import_fields33.text)({ validation: { isRequired: true, length: { min: 64, max: 64 } }, access: { update: import_access32.denyAll } }),
    approverRoleIdSnapshot: (0, import_fields33.text)({ access: { update: import_access32.denyAll } }),
    amountMinor: moneyField({ immutable: true }),
    currencyCode: currencyCodeField(),
    status: (0, import_fields33.select)({
      type: "enum",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Approved", value: "approved" },
        { label: "Rejected", value: "rejected" },
        { label: "Cancelled", value: "cancelled" },
        { label: "Superseded", value: "superseded" }
      ],
      defaultValue: "pending",
      validation: { isRequired: true },
      access: { update: import_access32.denyAll }
    }),
    requestedAt: (0, import_fields33.timestamp)({ validation: { isRequired: true }, defaultValue: { kind: "now" }, access: { update: import_access32.denyAll } }),
    decidedAt: (0, import_fields33.timestamp)({ access: { create: import_access32.denyAll, update: import_access32.denyAll } }),
    policy: (0, import_fields33.relationship)({ ref: "ApprovalPolicy.requests", access: { update: import_access32.denyAll } }),
    requestedBy: (0, import_fields33.relationship)({ ref: "User", access: { update: import_access32.denyAll } }),
    assignedTo: (0, import_fields33.relationship)({ ref: "ProjectMembership.approvalRequests", access: { update: import_access32.denyAll } }),
    decisions: (0, import_fields33.relationship)({ ref: "ApprovalDecision.request", many: true, access: { create: import_access32.denyAll, update: import_access32.denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.approvalRequests"),
    ...trackingFields
  }
});
var ApprovalDecision = (0, import_core15.list)({
  access: auditRead(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["request", "decision", "decidedBy", "decidedAt"] } },
  fields: {
    decision: (0, import_fields33.select)({
      type: "enum",
      options: [
        { label: "Approved", value: "approved" },
        { label: "Rejected", value: "rejected" }
      ],
      validation: { isRequired: true },
      access: { update: import_access32.denyAll }
    }),
    comment: (0, import_fields33.text)({ validation: { isRequired: true, length: { min: 3, max: 2e3 } }, access: { update: import_access32.denyAll }, ui: { displayMode: "textarea" } }),
    decidedAt: (0, import_fields33.timestamp)({ validation: { isRequired: true }, defaultValue: { kind: "now" }, access: { update: import_access32.denyAll } }),
    request: (0, import_fields33.relationship)({ ref: "ApprovalRequest.decisions", access: { update: import_access32.denyAll } }),
    decidedBy: (0, import_fields33.relationship)({ ref: "User", access: { update: import_access32.denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.approvalDecisions"),
    ...trackingFields
  }
});
var DocumentDistribution = (0, import_core15.list)({
  access: documentRead(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["documentVersion", "recipient", "purpose", "distributedAt", "expiresAt"] } },
  fields: {
    distributionKey: (0, import_fields33.text)({ isIndexed: "unique", validation: { isRequired: true }, access: { create: import_access32.denyAll, update: import_access32.denyAll } }),
    purpose: (0, import_fields33.text)({ validation: { isRequired: true, length: { min: 3, max: 500 } }, access: { update: import_access32.denyAll } }),
    distributedAt: (0, import_fields33.timestamp)({ validation: { isRequired: true }, defaultValue: { kind: "now" }, access: { update: import_access32.denyAll } }),
    expiresAt: (0, import_fields33.timestamp)({ access: { update: import_access32.denyAll } }),
    documentVersion: (0, import_fields33.relationship)({ ref: "DocumentVersion.distributions", access: { update: import_access32.denyAll } }),
    recipient: (0, import_fields33.relationship)({ ref: "ProjectMembership.documentDistributions", access: { update: import_access32.denyAll } }),
    distributedBy: (0, import_fields33.relationship)({ ref: "User", access: { update: import_access32.denyAll } }),
    acknowledgements: (0, import_fields33.relationship)({ ref: "DocumentAcknowledgement.distribution", many: true, access: { create: import_access32.denyAll, update: import_access32.denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.documentDistributions"),
    ...trackingFields
  }
});
var DocumentAcknowledgement = (0, import_core15.list)({
  access: documentRead(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["distribution", "acknowledgedBy", "acknowledgedAt"] } },
  fields: {
    acknowledgementKey: (0, import_fields33.text)({ isIndexed: "unique", validation: { isRequired: true }, access: { create: import_access32.denyAll, update: import_access32.denyAll } }),
    acknowledgement: (0, import_fields33.text)({ validation: { isRequired: true, length: { min: 3, max: 500 } }, access: { update: import_access32.denyAll } }),
    acknowledgedAt: (0, import_fields33.timestamp)({ validation: { isRequired: true }, defaultValue: { kind: "now" }, access: { update: import_access32.denyAll } }),
    distribution: (0, import_fields33.relationship)({ ref: "DocumentDistribution.acknowledgements", access: { update: import_access32.denyAll } }),
    acknowledgedBy: (0, import_fields33.relationship)({ ref: "User", access: { update: import_access32.denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.documentAcknowledgements"),
    ...trackingFields
  }
});

// features/keystone/models/procurement.ts
var import_core16 = require("@keystone-6/core");
var import_access34 = require("@keystone-6/core/access");
var import_fields35 = require("@keystone-6/core/fields");
var procurementAccess = () => controlledProjectModelAccess("canReadContracts", "canManageContracts");
var ProcurementRequest = (0, import_core16.list)({
  access: procurementAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["requestNumber", "title", "status", "neededBy", "requestedBy"] } },
  fields: {
    requestNumber: (0, import_fields35.text)({ validation: { isRequired: true, length: { min: 1, max: 100 } }, access: { update: import_access34.denyAll } }),
    title: (0, import_fields35.text)({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    description: (0, import_fields35.text)({ ui: { displayMode: "textarea" } }),
    status: lifecycleStatus([
      { label: "Draft", value: "draft" },
      { label: "Submitted", value: "submitted" },
      { label: "Approved", value: "approved" },
      { label: "Ordered", value: "ordered" },
      { label: "Partially received", value: "partially_received" },
      { label: "Received", value: "received" },
      { label: "Closed", value: "closed" },
      { label: "Rejected", value: "rejected" },
      { label: "Cancelled", value: "cancelled" }
    ], "draft"),
    neededBy: (0, import_fields35.timestamp)(),
    submittedAt: (0, import_fields35.timestamp)({ access: { update: import_access34.denyAll } }),
    approvedAt: (0, import_fields35.timestamp)({ access: { update: import_access34.denyAll } }),
    orderedAt: (0, import_fields35.timestamp)({ access: { update: import_access34.denyAll } }),
    closedAt: (0, import_fields35.timestamp)({ access: { update: import_access34.denyAll } }),
    totalEstimatedMinor: moneyField({ nonNegative: true }),
    currencyCode: currencyCodeField(),
    requestedBy: (0, import_fields35.relationship)({ ref: "User", access: { update: import_access34.denyAll } }),
    approvedBy: (0, import_fields35.relationship)({ ref: "User", access: { create: import_access34.denyAll, update: import_access34.denyAll } }),
    tradePartner: (0, import_fields35.relationship)({ ref: "TradePartner.procurementRequests" }),
    commitment: (0, import_fields35.relationship)({ ref: "Commitment.procurementRequests" }),
    lines: readOnlyRelationshipMany("ProcurementRequestLine.request"),
    receipts: readOnlyRelationshipMany("MaterialReceipt.request"),
    company: companyTenantField(),
    project: projectTenantField("Project.procurementRequests"),
    ...trackingFields
  }
});
var ProcurementRequestLine = (0, import_core16.list)({
  access: procurementAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["request", "lineNumber", "description", "quantity", "estimatedAmountMinor"] } },
  fields: {
    lineNumber: (0, import_fields35.integer)({ validation: { isRequired: true, min: 1 }, access: { update: import_access34.denyAll } }),
    description: (0, import_fields35.text)({ validation: { isRequired: true, length: { min: 1, max: 500 } } }),
    quantity: (0, import_fields35.decimal)({ precision: 18, scale: 4, validation: { isRequired: true } }),
    unit: (0, import_fields35.text)({ validation: { isRequired: true, length: { min: 1, max: 40 } } }),
    estimatedUnitCostMinor: moneyField({ nonNegative: true }),
    estimatedAmountMinor: moneyField({ nonNegative: true }),
    request: (0, import_fields35.relationship)({ ref: "ProcurementRequest.lines", access: { update: import_access34.denyAll } }),
    budgetCode: (0, import_fields35.relationship)({ ref: "BudgetCode.procurementRequestLines" }),
    material: (0, import_fields35.relationship)({ ref: "Material.procurementRequestLines" }),
    receiptLines: readOnlyRelationshipMany("MaterialReceiptLine.requestLine"),
    company: companyTenantField(),
    project: projectTenantField("Project.procurementRequestLines"),
    ...trackingFields
  }
});
var MaterialReceipt = (0, import_core16.list)({
  access: procurementAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["receiptNumber", "status", "receivedAt", "tradePartner", "receivedBy"] } },
  fields: {
    receiptNumber: (0, import_fields35.text)({ validation: { isRequired: true, length: { min: 1, max: 100 } }, access: { update: import_access34.denyAll } }),
    status: (0, import_fields35.select)({
      type: "enum",
      options: [
        { label: "Recorded", value: "recorded" },
        { label: "Accepted with exceptions", value: "accepted_with_exceptions" },
        { label: "Rejected", value: "rejected" },
        { label: "Voided", value: "voided" }
      ],
      defaultValue: "recorded",
      validation: { isRequired: true },
      access: { update: import_access34.denyAll }
    }),
    receivedAt: (0, import_fields35.timestamp)({ validation: { isRequired: true }, access: { update: import_access34.denyAll } }),
    packingSlipReference: (0, import_fields35.text)({ validation: { isRequired: true, length: { min: 1, max: 160 } }, access: { update: import_access34.denyAll } }),
    evidenceFileName: (0, import_fields35.text)({ access: { update: import_access34.denyAll } }),
    evidenceStorageKey: (0, import_fields35.text)({ access: { read: import_access34.denyAll, update: import_access34.denyAll } }),
    evidenceChecksumSha256: (0, import_fields35.text)({ validation: { length: { min: 64, max: 64 } }, access: { update: import_access34.denyAll } }),
    notes: (0, import_fields35.text)({ access: { update: import_access34.denyAll }, ui: { displayMode: "textarea" } }),
    request: (0, import_fields35.relationship)({ ref: "ProcurementRequest.receipts", access: { update: import_access34.denyAll } }),
    commitment: (0, import_fields35.relationship)({ ref: "Commitment.materialReceipts", access: { update: import_access34.denyAll } }),
    tradePartner: (0, import_fields35.relationship)({ ref: "TradePartner.materialReceipts", access: { update: import_access34.denyAll } }),
    receivedBy: (0, import_fields35.relationship)({ ref: "User", access: { update: import_access34.denyAll } }),
    lines: readOnlyRelationshipMany("MaterialReceiptLine.receipt"),
    company: companyTenantField(),
    project: projectTenantField("Project.materialReceipts"),
    ...trackingFields
  }
});
var MaterialReceiptLine = (0, import_core16.list)({
  access: procurementAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["receipt", "requestLine", "quantityReceived", "quantityAccepted", "quantityRejected"] } },
  fields: {
    lineNumber: (0, import_fields35.integer)({ validation: { isRequired: true, min: 1 }, access: { update: import_access34.denyAll } }),
    quantityReceived: (0, import_fields35.decimal)({ precision: 18, scale: 4, validation: { isRequired: true }, access: { update: import_access34.denyAll } }),
    quantityAccepted: (0, import_fields35.decimal)({ precision: 18, scale: 4, validation: { isRequired: true }, access: { update: import_access34.denyAll } }),
    quantityRejected: (0, import_fields35.decimal)({ precision: 18, scale: 4, defaultValue: "0", access: { update: import_access34.denyAll } }),
    exceptionReason: (0, import_fields35.text)({ access: { update: import_access34.denyAll }, ui: { displayMode: "textarea" } }),
    receipt: (0, import_fields35.relationship)({ ref: "MaterialReceipt.lines", access: { update: import_access34.denyAll } }),
    requestLine: (0, import_fields35.relationship)({ ref: "ProcurementRequestLine.receiptLines", access: { update: import_access34.denyAll } }),
    material: (0, import_fields35.relationship)({ ref: "Material", access: { update: import_access34.denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.materialReceiptLines"),
    ...trackingFields
  }
});

// features/keystone/models/index.ts
var models = {
  User,
  ServiceRequest,
  ServiceRequestEvent,
  AuthSession,
  ApiCredential,
  AccountInvitation,
  Role,
  Company,
  CompanyMembership,
  Project,
  ProjectMembership,
  TradePartner,
  ProjectLocation,
  CostCode,
  BudgetCode,
  ConstructionLead,
  ConstructionOpportunity,
  PublicSiteProfile,
  PublicService,
  PublicProject,
  IntakeSubmission,
  BidPackage,
  BidInvitation,
  BidSubmission,
  BidLineItem,
  Estimate,
  EstimateVersion,
  EstimateLineItem,
  Budget,
  BudgetLineItem,
  BudgetChange,
  BudgetChangeLineItem,
  DirectCost,
  PrimeContract,
  Commitment,
  ContractLineItem,
  ChangeEvent,
  ChangeEventLineItem,
  ChangeQuote,
  ChangeOrder,
  ChangeOrderLineItem,
  RFI,
  RFIResponse,
  SpecificationSection,
  Submittal,
  SubmittalReview,
  Drawing,
  DrawingRevision,
  Document,
  DocumentVersion,
  DailyLog,
  DailyLogEntry,
  Schedule,
  ScheduleTask,
  ScheduleDependency,
  PunchItem,
  LaborEntry,
  Equipment,
  Material,
  ResourceLog,
  SafetyIncident,
  SafetyObservation,
  InspectionTemplate,
  Inspection,
  InspectionItem,
  CorrectiveAction,
  ProgressClaim,
  ProgressClaimLineItem,
  Payment,
  PaymentReversal,
  PaymentAllocation,
  RetainageRelease,
  LienWaiver,
  ProcurementRequest,
  ProcurementRequestLine,
  MaterialReceipt,
  MaterialReceiptLine,
  ApprovalPolicy,
  ApprovalRequest,
  ApprovalDecision,
  DocumentDistribution,
  DocumentAcknowledgement,
  AgentIdentity,
  ScopeGrant,
  AgentAction,
  IdempotencyKey,
  OutboxMessage
};

// features/keystone/mutations/index.ts
var import_schema = require("@graphql-tools/schema");

// features/keystone/domain/lifecycle.ts
var lifecyclePolicies = {
  Project: {
    planning: ["active", "archived"],
    active: ["on_hold", "completed"],
    on_hold: ["active", "completed"],
    completed: ["archived"],
    archived: []
  },
  BidPackage: {
    draft: ["open", "archived"],
    open: ["closed"],
    closed: ["awarded", "archived"],
    awarded: ["archived"],
    archived: []
  },
  Estimate: {
    draft: ["internal_review"],
    internal_review: ["draft", "issued"],
    issued: ["accepted", "rejected", "superseded"],
    accepted: ["superseded"],
    rejected: ["draft", "superseded"],
    superseded: []
  },
  BudgetChange: {
    draft: ["pending_approval"],
    pending_approval: ["approved", "rejected"],
    approved: ["posted"],
    rejected: ["draft"],
    posted: []
  },
  PrimeContract: {
    draft: ["pending_approval"],
    pending_approval: ["draft", "approved", "rejected"],
    approved: ["executed"],
    rejected: ["draft"],
    executed: ["closed"],
    closed: []
  },
  Commitment: {
    draft: ["out_for_signature", "cancelled"],
    out_for_signature: ["draft", "executed", "cancelled"],
    executed: ["complete", "terminated"],
    complete: ["closed"],
    closed: [],
    cancelled: [],
    terminated: []
  },
  ChangeEvent: {
    open: ["pricing", "voided"],
    pricing: ["open", "pending_approval", "voided"],
    pending_approval: ["pricing", "approved", "rejected"],
    approved: ["incorporated"],
    rejected: ["pricing", "voided"],
    incorporated: [],
    voided: []
  },
  ChangeOrder: {
    draft: ["pending_approval"],
    pending_approval: ["draft", "approved", "rejected"],
    approved: ["executed"],
    rejected: ["draft"],
    executed: ["posted"],
    posted: []
  },
  RFI: {
    draft: ["open", "voided"],
    open: ["answered", "voided"],
    answered: ["open", "closed"],
    closed: [],
    voided: []
  },
  Submittal: {
    draft: ["submitted", "voided"],
    submitted: ["under_review", "voided"],
    under_review: ["approved", "revise_resubmit", "rejected"],
    revise_resubmit: ["submitted"],
    approved: ["closed"],
    rejected: ["revise_resubmit", "closed"],
    closed: [],
    voided: []
  },
  ProgressClaim: {
    draft: ["submitted", "voided"],
    submitted: ["under_review", "voided"],
    under_review: ["approved", "rejected"],
    approved: ["closed"],
    partially_paid: [],
    paid: ["closed"],
    rejected: ["draft"],
    closed: [],
    voided: []
  },
  SafetyIncident: {
    reported: ["investigating"],
    investigating: ["corrective_action", "closed"],
    corrective_action: ["investigating", "closed"],
    closed: []
  },
  Inspection: {
    scheduled: ["in_progress", "cancelled"],
    in_progress: ["passed", "failed"],
    passed: ["closed"],
    failed: ["in_progress", "closed"],
    closed: [],
    cancelled: []
  },
  Schedule: {
    draft: ["published", "archived"],
    published: ["archived"],
    archived: []
  },
  ScheduleTask: {
    not_started: ["in_progress", "on_hold", "delayed"],
    in_progress: ["completed", "on_hold", "delayed"],
    delayed: ["in_progress", "on_hold"],
    on_hold: ["in_progress", "delayed"],
    completed: []
  },
  DailyLog: {
    draft: ["submitted"],
    submitted: ["draft", "approved"],
    approved: []
  },
  PunchItem: {
    open: ["in_progress", "voided"],
    in_progress: ["ready_for_review", "voided"],
    ready_for_review: ["in_progress", "closed"],
    closed: [],
    voided: []
  },
  SafetyObservation: {
    open: ["assigned", "resolved"],
    assigned: ["open", "resolved"],
    resolved: ["assigned", "closed"],
    closed: []
  },
  CorrectiveAction: {
    open: ["in_progress"],
    in_progress: ["ready_for_verification"],
    ready_for_verification: ["in_progress", "verified"],
    verified: ["closed"],
    closed: []
  },
  Payment: {
    pending: ["authorized", "failed", "voided"],
    authorized: ["settled", "failed", "voided"],
    settled: [],
    reversed: [],
    failed: ["pending", "voided"],
    voided: []
  },
  RetainageRelease: {
    requested: ["approved", "rejected", "voided"],
    approved: ["released", "voided"],
    released: [],
    rejected: ["requested", "voided"],
    voided: []
  },
  LienWaiver: {
    requested: ["received", "expired"],
    received: ["accepted", "rejected", "expired"],
    accepted: [],
    rejected: ["requested"],
    expired: []
  },
  ProcurementRequest: {
    draft: ["submitted", "cancelled"],
    submitted: ["draft", "approved", "rejected", "cancelled"],
    approved: ["ordered", "cancelled"],
    ordered: ["partially_received", "received", "cancelled"],
    partially_received: ["received", "cancelled"],
    received: ["closed"],
    rejected: ["draft", "cancelled"],
    closed: [],
    cancelled: []
  }
};
function normalizeTransitionReason(reason) {
  if (typeof reason !== "string" || reason.trim().length === 0) {
    throw new Error("A transition reason is required");
  }
  const normalized = reason.trim();
  if (normalized.length < 3) {
    throw new Error("A transition reason must be at least 3 characters");
  }
  if (normalized.length > 500) {
    throw new Error("A transition reason must be at most 500 characters");
  }
  return normalized;
}
function assertAllowedTransition(listKey, fromStatus, toStatus) {
  const policy = lifecyclePolicies[listKey];
  if (!(fromStatus in policy)) {
    throw new Error(`Unknown ${listKey} status ${fromStatus}`);
  }
  if (!(toStatus in policy)) {
    throw new Error(`Unknown ${listKey} status ${toStatus}`);
  }
  if (fromStatus === toStatus) {
    throw new Error(`${listKey} is already in status ${toStatus}`);
  }
  if (!policy[fromStatus].includes(toStatus)) {
    throw new Error(`Invalid ${listKey} transition from ${fromStatus} to ${toStatus}`);
  }
}

// features/keystone/queries/construction.ts
var MAX_PROJECTS = 50;
var MAX_ITEMS_PER_LIST = 20;
var MAX_REPORT_ROWS_PER_LIST = 1e3;
function text18(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}
function idOf(value) {
  return text18(value?.id);
}
function nameOf(value) {
  const record = value;
  return text18(record?.name) || text18(record?.title) || text18(record?.email);
}
function dateOf(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}
function money(value) {
  if (value === null || value === void 0) return null;
  return String(value);
}
function currencyAmount(value, currency) {
  const code = text18(currency, "USD");
  if (code !== "USD") return `${code} amount unavailable (currency support is disabled)`;
  try {
    const minor = BigInt(String(value ?? 0));
    const absolute = minor < 0 ? -minor : minor;
    return `USD ${minor < 0 ? "-" : ""}${(absolute / BigInt(100)).toString()}.${(absolute % BigInt(100)).toString().padStart(2, "0")}`;
  } catch {
    return "USD \u2014";
  }
}
function requireSession(context) {
  if (!context.session?.itemId) throw new Error("Authentication required");
  return context.session;
}
function hasEitherProjectPermission(session, companyId, projectId2, read, manage) {
  return hasProjectPermission(session, companyId, projectId2, read) || hasProjectPermission(session, companyId, projectId2, manage);
}
function audienceForProject(session, companyId, projectId2) {
  const explicitMembership = session.data.projectMemberships?.find(
    (membership) => membership.status === "active" && membership.project?.id === projectId2
  );
  if (explicitMembership) return explicitMembership.portalType === "internal" ? "internal" : "external";
  return session.data.companyMemberships?.some(
    (membership) => membership.status === "active" && membership.canAccessAllProjects && membership.company?.id === companyId
  ) ? "internal" : "external";
}
function canWriteProjectFromSession(session, companyId, projectId2) {
  const explicitMembership = session.data.projectMemberships?.find(
    (membership) => membership.status === "active" && membership.project?.id === projectId2
  );
  if (explicitMembership) {
    return explicitMembership.portalType === "internal" && (explicitMembership.accessLevel === "contributor" || explicitMembership.accessLevel === "manager");
  }
  return companyId ? hasSessionProjectAccess(session, companyId, projectId2, true) : false;
}
function total(values) {
  return values.reduce((sum2, value) => {
    try {
      return sum2 + BigInt(value ?? 0);
    } catch {
      return sum2;
    }
  }, BigInt(0)).toString();
}
function sum(records, field) {
  if (!Array.isArray(records)) return BigInt(0);
  return records.reduce((total2, record) => {
    const value = record[field];
    try {
      return total2 + BigInt(value === null || value === void 0 ? 0 : String(value));
    } catch {
      return total2;
    }
  }, BigInt(0));
}
function countOf(value) {
  return typeof value === "number" ? value : null;
}
function projectSummary(project, audience, canViewInternalFinancials) {
  const budgets = project.budgets;
  const activeBudget = budgets?.[0];
  const exposeFinancials = audience === "internal" && canViewInternalFinancials;
  return {
    id: text18(project.id),
    projectNumber: text18(project.projectNumber),
    name: text18(project.name),
    status: text18(project.status),
    audience,
    companyId: audience === "internal" ? idOf(project.company) : null,
    companyName: nameOf(project.company),
    brandName: text18(project.company?.brandName, nameOf(project.company)),
    brandMark: text18(project.company?.brandMark),
    brandTagline: text18(project.company?.brandTagline),
    brandColor: text18(project.company?.brandColor, "#1D4ED8"),
    logoIcon: text18(project.company?.logoIcon),
    logoColor: text18(project.company?.logoColor, "0"),
    startDate: dateOf(project.startDate),
    completionDate: dateOf(project.substantialCompletionDate),
    currencyCode: text18(project.currencyCode, "USD"),
    originalBudgetMinor: exposeFinancials ? money(activeBudget?.totalOriginalMinor) ?? "0" : null,
    revisedBudgetMinor: exposeFinancials ? money(activeBudget?.totalRevisedMinor) ?? "0" : null,
    committedMinor: exposeFinancials ? money(activeBudget?.totalCommittedMinor) ?? String(sum(project.commitments, "revisedContractMinor")) : null,
    actualCostMinor: exposeFinancials ? money(activeBudget?.totalActualMinor) ?? String(sum(project.directCosts, "amountMinor")) : null,
    // External participants see assigned work, never unrelated project totals.
    openRfis: audience === "internal" ? countOf(project.openRfiCount) : null,
    openSubmittals: audience === "internal" ? countOf(project.openSubmittalCount) : null,
    openChanges: audience === "internal" ? countOf(project.openChangeCount) : null,
    openSafety: audience === "internal" ? countOf(project.openSafetyCount) : null,
    openPunch: audience === "internal" ? countOf(project.openPunchCount) : null,
    pendingClaims: audience === "internal" ? countOf(project.pendingClaimCount) : null
  };
}
var projectIdentityQuery = `
  id projectNumber name status startDate substantialCompletionDate currencyCode
  company { id name brandName brandMark brandTagline brandColor logoIcon logoColor }
`;
var projectSummaryQuery = `
  ${projectIdentityQuery}
  budgets(take: 1, where: { status: { equals: active } }, orderBy: { updatedAt: desc }) {
    totalOriginalMinor totalRevisedMinor totalCommittedMinor totalActualMinor
  }
  commitments(take: 100) { revisedContractMinor }
  directCosts(take: 100, where: { status: { not: { equals: voided } } }) { amountMinor }
  openRfiCount: rfisCount(where: { status: { notIn: [closed, voided] } })
  openSubmittalCount: submittalsCount(where: { status: { notIn: [closed, voided, approved, rejected] } })
  openChangeCount: changeEventsCount(where: { status: { notIn: [incorporated, voided, rejected] } })
  openSafetyCount: safetyIncidentsCount(where: { status: { notIn: [closed] } })
  openPunchCount: punchItemsCount(where: { status: { notIn: [closed, voided] } })
  pendingClaimCount: progressClaimsCount(where: { status: { notIn: [paid, closed, voided, rejected] } })
`;
async function constructionPortfolio(_root, args, context) {
  const session = requireSession(context);
  const externalProjectIds = session.data.projectMemberships?.filter((entry) => {
    const project = entry.project;
    return entry.status === "active" && entry.portalType !== "internal" && project?.company?.id && hasSessionProjectAccess(session, project.company.id, project.id) && hasEitherProjectPermission(session, project.company.id, project.id, "canReadProjects", "canManageProjects");
  }).map((entry) => entry.project.id) ?? [];
  const hasInternalPortfolio = session.data.companyMemberships?.some((entry) => entry.status === "active" && entry.canAccessAllProjects) || session.data.projectMemberships?.some((entry) => entry.status === "active" && entry.portalType === "internal");
  const search = typeof args?.search === "string" ? args.search.trim().slice(0, 120) : "";
  const searchFilter = search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { projectNumber: { contains: search, mode: "insensitive" } }] } : {};
  const page = Math.max(1, Math.floor(Number(args?.page) || 1));
  const externalOnly = !hasInternalPortfolio && externalProjectIds.length > 0 && Boolean(context.sudo);
  const projectApi = externalOnly ? context.sudo().query.Project : context.query.Project;
  const projectWhere = externalOnly ? { AND: [{ id: { in: externalProjectIds } }, searchFilter] } : searchFilter;
  const [companies, records, totalCount] = await Promise.all([
    hasPermission(session, "canReadCompanies") || hasPermission(session, "canManageCompanies") ? context.query.Company.findMany({
      take: 50,
      orderBy: { name: "asc" },
      query: "id name status brandName brandMark brandTagline brandColor logoIcon logoColor"
    }) : Promise.resolve([]),
    projectApi.findMany({
      where: projectWhere,
      take: MAX_PROJECTS,
      skip: (page - 1) * MAX_PROJECTS,
      orderBy: [{ status: "asc" }, { name: "asc" }, { id: "asc" }],
      query: externalOnly ? projectIdentityQuery : projectSummaryQuery
    }),
    projectApi.count({ where: projectWhere })
  ]);
  const projects = records.map((project) => {
    const companyId = idOf(project.company);
    const projectId2 = text18(project.id);
    const audience = audienceForProject(session, companyId, projectId2);
    return projectSummary(
      project,
      audience,
      audience === "internal" && hasEitherProjectPermission(
        session,
        companyId,
        projectId2,
        "canReadFinancials",
        "canManageFinancials"
      )
    );
  });
  const openWork = projects.reduce(
    (count2, project) => count2 + (project.openRfis ?? 0) + (project.openSubmittals ?? 0) + (project.openChanges ?? 0) + (project.openPunch ?? 0) + (project.openSafety ?? 0),
    0
  );
  const metrics = [
    { key: "active-projects", label: "Active projects", value: String(projects.filter((project) => project.status === "active").length), unit: "projects", tone: "neutral" }
  ];
  const internalProjects = projects.filter((project) => project.actualCostMinor !== null);
  const usdProjects = internalProjects.filter((project) => project.currencyCode === "USD");
  const unsupportedCurrencyProjects = internalProjects.filter((project) => project.currencyCode !== "USD");
  if (usdProjects.length > 0) {
    metrics.push(
      { key: "revised-budget", label: "Revised budget (USD jobs)", value: total(usdProjects.map((project) => project.revisedBudgetMinor)), unit: "USD", tone: "neutral" },
      { key: "actual-cost", label: "Actual cost (USD jobs)", value: total(usdProjects.map((project) => project.actualCostMinor)), unit: "USD", tone: "neutral" }
    );
  }
  if (unsupportedCurrencyProjects.length > 0) {
    metrics.push({ key: "unsupported-currency-projects", label: "Currency-blocked projects", value: String(unsupportedCurrencyProjects.length), unit: "projects", tone: "attention" });
  }
  metrics.push({ key: "open-work", label: "Open work", value: String(openWork), unit: "items", tone: "attention" });
  if (totalCount > records.length) {
    for (const metric of metrics) metric.label = `${metric.label}, this page`;
  }
  const canCreateIn = (companyId) => hasCompanyPermission(session, companyId, "canManageProjects") && hasCompanyPermission(session, companyId, "canManageFinancials");
  return {
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    canCreateProject: companies.some((company) => text18(company.status) === "active" && canCreateIn(text18(company.id))),
    page,
    pageSize: MAX_PROJECTS,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / MAX_PROJECTS)),
    search,
    companies: companies.map((company) => ({
      canCreateProject: text18(company.status) === "active" && canCreateIn(text18(company.id)),
      id: text18(company.id),
      name: text18(company.name),
      status: text18(company.status),
      brandName: text18(company.brandName, text18(company.name)),
      brandMark: text18(company.brandMark),
      brandTagline: text18(company.brandTagline),
      brandColor: text18(company.brandColor, "#1D4ED8"),
      logoIcon: text18(company.logoIcon),
      logoColor: text18(company.logoColor, "0")
    })),
    projects,
    metrics
  };
}
function item(spec) {
  return {
    id: text18(spec.record.id),
    kind: spec.kind,
    reference: text18(spec.reference),
    title: text18(spec.title, "Untitled record"),
    status: text18(spec.status, "recorded"),
    dueAt: dateOf(spec.dueAt),
    owner: nameOf(spec.owner) || text18(spec.owner, "Unassigned"),
    amountMinor: money(spec.amount),
    allowedTransitions: []
  };
}
var specs = {
  overview: [
    { listKey: "RFI", kind: "RFI", query: "id number subject status dueAt ballInCourt { name }", map: (r) => item({ kind: "RFI", record: r, reference: r.number, title: r.subject, status: r.status, dueAt: r.dueAt, owner: r.ballInCourt }) },
    { listKey: "Submittal", kind: "Submittal", query: "id number title status dueAt ballInCourt { name }", map: (r) => item({ kind: "Submittal", record: r, reference: r.number, title: r.title, status: r.status, dueAt: r.dueAt, owner: r.ballInCourt }) },
    { listKey: "ChangeEvent", kind: "Change event", query: "id number title status dueAt estimatedCostMinor owner { name }", map: (r) => item({ kind: "Change event", record: r, reference: r.number, title: r.title, status: r.status, dueAt: r.dueAt, owner: r.owner, amount: r.estimatedCostMinor }) },
    { listKey: "ScheduleTask", kind: "Schedule task", query: "id taskCode name status plannedFinish assignedTo { name }", map: (r) => item({ kind: "Schedule task", record: r, reference: r.taskCode, title: r.name, status: r.status, dueAt: r.plannedFinish, owner: r.assignedTo }) },
    { listKey: "PunchItem", kind: "Punch", query: "id number title status dueAt assignedTo { name }", map: (r) => item({ kind: "Punch", record: r, reference: r.number, title: r.title, status: r.status, dueAt: r.dueAt, owner: r.assignedTo }) }
  ],
  preconstruction: [
    { listKey: "BidPackage", kind: "Bid package", query: "id number title status dueAt bidManager { name }", map: (r) => item({ kind: "Bid package", record: r, reference: r.number, title: r.title, status: r.status, dueAt: r.dueAt, owner: r.bidManager }) },
    { listKey: "BidInvitation", kind: "Bid invitation", query: "id status sentAt respondedAt tradePartner { name } bidPackage { number title dueAt }", map: (r) => item({ kind: "Bid invitation", record: r, reference: r.bidPackage?.number, title: r.bidPackage?.title, status: r.status, dueAt: r.bidPackage?.dueAt, owner: r.tradePartner }) },
    { listKey: "BidSubmission", kind: "Bid submission", query: "id submissionNumber status totalMinor submittedAt tradePartner { name }", map: (r) => item({ kind: "Bid submission", record: r, reference: r.submissionNumber, title: nameOf(r.tradePartner), status: r.status, dueAt: r.submittedAt, owner: r.tradePartner, amount: r.totalMinor }) },
    { listKey: "Estimate", kind: "Estimate", query: "id number title status estimator { name }", map: (r) => item({ kind: "Estimate", record: r, reference: r.number, title: r.title, status: r.status, owner: r.estimator }) }
  ],
  financials: [
    { listKey: "BudgetLineItem", kind: "Budget line", query: "id description revisedAmountMinor projectedFinalCostMinor budgetCode { code }", map: (r) => item({ kind: "Budget line", record: r, reference: r.budgetCode?.code, title: r.description, status: "current", amount: r.revisedAmountMinor }) },
    { listKey: "DirectCost", kind: "Direct cost", query: "id referenceNumber description status costDate amountMinor tradePartner { name }", map: (r) => item({ kind: "Direct cost", record: r, reference: r.referenceNumber, title: r.description, status: r.status, dueAt: r.costDate, owner: r.tradePartner, amount: r.amountMinor }) },
    { listKey: "BudgetChange", kind: "Budget change", query: "id number title status totalAmountMinor requestedBy { name }", map: (r) => item({ kind: "Budget change", record: r, reference: r.number, title: r.title, status: r.status, owner: r.requestedBy, amount: r.totalAmountMinor }) }
  ],
  contracts: [
    { listKey: "PrimeContract", kind: "Prime contract", query: "id number title status revisedContractMinor client { name }", map: (r) => item({ kind: "Prime contract", record: r, reference: r.number, title: r.title, status: r.status, owner: r.client, amount: r.revisedContractMinor }) },
    { listKey: "Commitment", kind: "Commitment", query: "id number title status revisedContractMinor tradePartner { name }", map: (r) => item({ kind: "Commitment", record: r, reference: r.number, title: r.title, status: r.status, owner: r.tradePartner, amount: r.revisedContractMinor }) },
    { listKey: "ChangeEvent", kind: "Change event", query: "id number title status dueAt estimatedCostMinor owner { name }", map: (r) => item({ kind: "Change event", record: r, reference: r.number, title: r.title, status: r.status, dueAt: r.dueAt, owner: r.owner, amount: r.estimatedCostMinor }) },
    { listKey: "ChangeOrder", kind: "Change order", query: "id number title status totalMinor approvedBy { name }", map: (r) => item({ kind: "Change order", record: r, reference: r.number, title: r.title, status: r.status, owner: r.approvedBy, amount: r.totalMinor }) }
  ],
  procurement: [
    { listKey: "ProcurementRequest", kind: "Procurement request", query: "id requestNumber title status neededBy totalEstimatedMinor tradePartner { name }", map: (r) => item({ kind: "Procurement request", record: r, reference: r.requestNumber, title: r.title, status: r.status, dueAt: r.neededBy, owner: r.tradePartner, amount: r.totalEstimatedMinor }) },
    { listKey: "MaterialReceipt", kind: "Material receipt", query: "id receiptNumber status receivedAt tradePartner { name }", map: (r) => item({ kind: "Material receipt", record: r, reference: r.receiptNumber, title: "Material receipt", status: r.status, dueAt: r.receivedAt, owner: r.tradePartner }) },
    { listKey: "Commitment", kind: "Subcontract / PO", query: "id number title commitmentType status revisedContractMinor tradePartner { name }", map: (r) => item({ kind: "Subcontract / PO", record: r, reference: r.number, title: r.title, status: r.status, owner: r.tradePartner, amount: r.revisedContractMinor }) },
    { listKey: "BidInvitation", kind: "Bid invitation", query: "id status sentAt respondedAt tradePartner { name } bidPackage { number title }", map: (r) => item({ kind: "Bid invitation", record: r, reference: r.bidPackage?.number, title: nameOf(r.tradePartner), status: r.status, dueAt: r.respondedAt || r.sentAt, owner: r.tradePartner }) },
    { listKey: "ResourceLog", kind: "Material / equipment activity", query: "id resourceType eventType occurredAt quantity totalCostMinor tradePartner { name }", map: (r) => item({ kind: "Material / equipment activity", record: r, reference: r.resourceType, title: r.eventType, status: "recorded", dueAt: r.occurredAt, owner: r.tradePartner, amount: r.totalCostMinor }) },
    { listKey: "LienWaiver", kind: "Payment readiness", query: "id waiverNumber status throughDate amountMinor tradePartner { name }", map: (r) => item({ kind: "Payment readiness", record: r, reference: r.waiverNumber, title: nameOf(r.tradePartner), status: r.status, dueAt: r.throughDate, owner: r.tradePartner, amount: r.amountMinor }) }
  ],
  execution: [
    { listKey: "RFI", kind: "RFI", query: "id number subject status dueAt ballInCourt { name }", map: (r) => item({ kind: "RFI", record: r, reference: r.number, title: r.subject, status: r.status, dueAt: r.dueAt, owner: r.ballInCourt }) },
    { listKey: "Submittal", kind: "Submittal", query: "id number title status dueAt ballInCourt { name }", map: (r) => item({ kind: "Submittal", record: r, reference: r.number, title: r.title, status: r.status, dueAt: r.dueAt, owner: r.ballInCourt }) }
  ],
  field: [
    { listKey: "DailyLog", kind: "Daily log", query: "id logDate status weatherSummary preparedBy { name }", map: (r) => item({ kind: "Daily log", record: r, reference: dateOf(r.logDate), title: r.weatherSummary || "Daily field record", status: r.status, dueAt: r.logDate, owner: r.preparedBy }) },
    { listKey: "ScheduleTask", kind: "Schedule task", query: "id taskCode name status plannedFinish assignedTo { name }", map: (r) => item({ kind: "Schedule task", record: r, reference: r.taskCode, title: r.name, status: r.status, dueAt: r.plannedFinish, owner: r.assignedTo }) },
    { listKey: "LaborEntry", kind: "Labor", query: "id workerName workDate totalCostMinor tradePartner { name }", map: (r) => item({ kind: "Labor", record: r, reference: dateOf(r.workDate), title: r.workerName, dueAt: r.workDate, owner: r.tradePartner, amount: r.totalCostMinor }) },
    { listKey: "ResourceLog", kind: "Resource", query: "id resourceType eventType occurredAt totalCostMinor operator { name }", map: (r) => item({ kind: "Resource", record: r, reference: r.resourceType, title: r.eventType, dueAt: r.occurredAt, owner: r.operator, amount: r.totalCostMinor }) }
  ],
  schedule: [
    { listKey: "Schedule", kind: "Schedule", query: "id name scheduleType status dataDate publishedAt publishedBy { name }", map: (r) => item({ kind: "Schedule", record: r, reference: r.scheduleType, title: r.name, status: r.status, dueAt: r.dataDate, owner: r.publishedBy }) },
    { listKey: "ScheduleTask", kind: "Schedule task", query: "id taskCode name status plannedStart plannedFinish percentComplete assignedTo { name }", map: (r) => item({ kind: "Schedule task", record: r, reference: r.taskCode, title: r.name, status: r.status, dueAt: r.plannedFinish, owner: r.assignedTo }) }
  ],
  "quality-safety": [
    { listKey: "SafetyIncident", kind: "Incident", query: "id incidentNumber title status occurredAt investigator { name }", map: (r) => item({ kind: "Incident", record: r, reference: r.incidentNumber, title: r.title, status: r.status, dueAt: r.occurredAt, owner: r.investigator }) },
    { listKey: "SafetyObservation", kind: "Observation", query: "id observationNumber title status dueAt assignedTo { name }", map: (r) => item({ kind: "Observation", record: r, reference: r.observationNumber, title: r.title, status: r.status, dueAt: r.dueAt, owner: r.assignedTo }) },
    { listKey: "Inspection", kind: "Inspection", query: "id inspectionNumber title status scheduledAt inspector { name }", map: (r) => item({ kind: "Inspection", record: r, reference: r.inspectionNumber, title: r.title, status: r.status, dueAt: r.scheduledAt, owner: r.inspector }) },
    { listKey: "CorrectiveAction", kind: "Corrective action", query: "id actionNumber title status dueAt assignedTo { name }", map: (r) => item({ kind: "Corrective action", record: r, reference: r.actionNumber, title: r.title, status: r.status, dueAt: r.dueAt, owner: r.assignedTo }) },
    { listKey: "PunchItem", kind: "Punch", query: "id number title status dueAt assignedTo { name }", map: (r) => item({ kind: "Punch", record: r, reference: r.number, title: r.title, status: r.status, dueAt: r.dueAt, owner: r.assignedTo }) }
  ],
  documents: [
    { listKey: "Drawing", kind: "Drawing", query: "id drawingNumber title status discipline currentRevision { revisionNumber issuedAt }", map: (r) => item({ kind: "Drawing", record: r, reference: r.drawingNumber, title: r.title, status: r.status, dueAt: r.currentRevision?.issuedAt, owner: r.discipline }) },
    { listKey: "Document", kind: "Document", query: "id documentNumber title status documentType currentVersion { versionNumber issuedAt }", map: (r) => item({ kind: "Document", record: r, reference: r.documentNumber, title: r.title, status: r.status, dueAt: r.currentVersion?.issuedAt, owner: r.documentType }) }
  ],
  billing: [
    { listKey: "ProgressClaim", kind: "Progress claim", query: "id claimNumber status dueAt currentPaymentDueMinor tradePartner { name }", map: (r) => item({ kind: "Progress claim", record: r, reference: r.claimNumber, title: nameOf(r.tradePartner), status: r.status, dueAt: r.dueAt, owner: r.tradePartner, amount: r.currentPaymentDueMinor }) },
    { listKey: "Payment", kind: "Payment", query: "id paymentNumber status paidAt amountMinor tradePartner { name }", map: (r) => item({ kind: "Payment", record: r, reference: r.paymentNumber, title: nameOf(r.tradePartner), status: r.status, dueAt: r.paidAt, owner: r.tradePartner, amount: r.amountMinor }) },
    { listKey: "RetainageRelease", kind: "Retainage release", query: "id releaseNumber status amountMinor requestedAt approvedBy { name }", map: (r) => item({ kind: "Retainage release", record: r, reference: r.releaseNumber, title: "Retainage release", status: r.status, dueAt: r.requestedAt, owner: r.approvedBy, amount: r.amountMinor }) },
    { listKey: "LienWaiver", kind: "Lien waiver", query: "id waiverNumber status throughDate amountMinor tradePartner { name }", map: (r) => item({ kind: "Lien waiver", record: r, reference: r.waiverNumber, title: nameOf(r.tradePartner), status: r.status, dueAt: r.throughDate, owner: r.tradePartner, amount: r.amountMinor }) }
  ],
  team: [
    { listKey: "ProjectMembership", kind: "Team member", query: "id accessLevel status user { id name email }", map: (r) => item({ kind: "Team member", record: r, reference: r.user?.email, title: nameOf(r.user), status: r.status, owner: r.accessLevel }) }
  ],
  reports: [
    { listKey: "BudgetLineItem", kind: "Job cost / forecast", query: "id description revisedAmountMinor projectedFinalCostMinor projectedOverUnderMinor budgetCode { code }", map: (r) => item({ kind: "Job cost / forecast", record: r, reference: r.budgetCode?.code, title: r.description, status: BigInt(String(r.projectedOverUnderMinor ?? 0)) < BigInt(0) ? "over_budget" : "within_budget", amount: r.projectedFinalCostMinor }) },
    { listKey: "Commitment", kind: "Commitment exposure", query: "id number title status revisedContractMinor tradePartner { name }", map: (r) => item({ kind: "Commitment exposure", record: r, reference: r.number, title: r.title, status: r.status, owner: r.tradePartner, amount: r.revisedContractMinor }) },
    { listKey: "ChangeOrder", kind: "Change exposure", query: "id number title status totalMinor approvedBy { name }", map: (r) => item({ kind: "Change exposure", record: r, reference: r.number, title: r.title, status: r.status, owner: r.approvedBy, amount: r.totalMinor }) },
    { listKey: "RFI", kind: "RFI aging", query: "id number subject status dueAt ballInCourt { name }", map: (r) => item({ kind: "RFI aging", record: r, reference: r.number, title: r.subject, status: r.status, dueAt: r.dueAt, owner: r.ballInCourt }) },
    { listKey: "Submittal", kind: "Submittal aging", query: "id number title status dueAt ballInCourt { name }", map: (r) => item({ kind: "Submittal aging", record: r, reference: r.number, title: r.title, status: r.status, dueAt: r.dueAt, owner: r.ballInCourt }) },
    { listKey: "ProgressClaim", kind: "Claim aging", query: "id claimNumber status dueAt currentPaymentDueMinor tradePartner { name }", map: (r) => item({ kind: "Claim aging", record: r, reference: r.claimNumber, title: nameOf(r.tradePartner), status: r.status, dueAt: r.dueAt, owner: r.tradePartner, amount: r.currentPaymentDueMinor }) },
    { listKey: "Payment", kind: "Payment register", query: "id paymentNumber status paidAt amountMinor reference tradePartner { name }", map: (r) => item({ kind: "Payment register", record: r, reference: r.paymentNumber, title: text18(r.reference, nameOf(r.tradePartner)), status: r.status, dueAt: r.paidAt, owner: r.tradePartner, amount: r.amountMinor }) },
    { listKey: "LienWaiver", kind: "Waiver aging", query: "id waiverNumber status throughDate amountMinor tradePartner { name }", map: (r) => item({ kind: "Waiver aging", record: r, reference: r.waiverNumber, title: nameOf(r.tradePartner), status: r.status, dueAt: r.throughDate, owner: r.tradePartner, amount: r.amountMinor }) },
    { listKey: "LaborEntry", kind: "Labor actual", query: "id workerName workDate regularHours totalCostMinor tradePartner { name }", map: (r) => item({ kind: "Labor actual", record: r, reference: dateOf(r.workDate), title: `${text18(r.workerName)} \xB7 ${String(r.regularHours ?? 0)}h`, status: "recorded", dueAt: r.workDate, owner: r.tradePartner, amount: r.totalCostMinor }) },
    { listKey: "SafetyObservation", kind: "Safety aging", query: "id observationNumber title status dueAt assignedTo { name }", map: (r) => item({ kind: "Safety aging", record: r, reference: r.observationNumber, title: r.title, status: r.status, dueAt: r.dueAt, owner: r.assignedTo }) },
    { listKey: "Inspection", kind: "Inspection quality", query: "id inspectionNumber title status scheduledAt inspector { name }", map: (r) => item({ kind: "Inspection quality", record: r, reference: r.inspectionNumber, title: r.title, status: r.status, dueAt: r.scheduledAt, owner: r.inspector }) },
    { listKey: "CorrectiveAction", kind: "Corrective aging", query: "id actionNumber title status dueAt assignedTo { name }", map: (r) => item({ kind: "Corrective aging", record: r, reference: r.actionNumber, title: r.title, status: r.status, dueAt: r.dueAt, owner: r.assignedTo }) }
  ],
  audit: [
    { listKey: "AgentAction", kind: "Audit event", query: "id action status targetType targetId targetStatus reason requestedAt actorUser { name } requestedBy { name }", map: (r) => item({ kind: "Audit event", record: r, reference: `${text18(r.targetType)}:${text18(r.targetId)}`, title: text18(r.action), status: r.status, dueAt: r.requestedAt, owner: r.actorUser || r.requestedBy }) },
    { listKey: "OutboxMessage", kind: "Outbox", query: "id eventType aggregateType aggregateId status availableAt attempts", map: (r) => item({ kind: "Outbox", record: r, reference: `${text18(r.aggregateType)}:${text18(r.aggregateId)}`, title: r.eventType, status: r.status, dueAt: r.availableAt, owner: `${String(r.attempts ?? 0)} attempts` }) },
    { listKey: "IdempotencyKey", kind: "Idempotency", query: "id operation key status resourceType resourceId createdAt", map: (r) => item({ kind: "Idempotency", record: r, reference: r.key, title: r.operation, status: r.status, dueAt: r.createdAt, owner: r.resourceType }) }
  ]
};
var internalOnlyTools = /* @__PURE__ */ new Set([
  "financials",
  "contracts",
  "procurement",
  "billing",
  "reports",
  "team",
  "audit"
]);
var externalSafeListKeys = {
  overview: /* @__PURE__ */ new Set(["RFI", "Submittal", "ScheduleTask", "PunchItem"]),
  preconstruction: /* @__PURE__ */ new Set(["BidInvitation"]),
  execution: /* @__PURE__ */ new Set(["RFI", "Submittal"]),
  field: /* @__PURE__ */ new Set(["DailyLog", "ScheduleTask"]),
  schedule: /* @__PURE__ */ new Set(["ScheduleTask"]),
  "quality-safety": /* @__PURE__ */ new Set(["SafetyIncident", "SafetyObservation", "Inspection", "CorrectiveAction", "PunchItem"]),
  documents: /* @__PURE__ */ new Set()
};
var externalDomainPermissions = {
  BidInvitation: ["canReadPreconstruction", "canManagePreconstruction"],
  RFI: ["canReadProjectExecution", "canManageProjectExecution"],
  Submittal: ["canReadProjectExecution", "canManageProjectExecution"],
  ScheduleTask: ["canReadProjectExecution", "canManageProjectExecution"],
  DailyLog: ["canReadFieldOperations", "canManageFieldOperations"],
  PunchItem: ["canReadFieldOperations", "canManageFieldOperations"],
  SafetyIncident: ["canReadSafety", "canManageSafety"],
  SafetyObservation: ["canReadSafety", "canManageSafety"],
  Inspection: ["canReadSafety", "canManageSafety"],
  CorrectiveAction: ["canReadSafety", "canManageSafety"]
};
function externalRecordFilter(session, listKey, projectId2, companyId) {
  const user = { id: { equals: session.itemId } };
  switch (listKey) {
    case "BidInvitation": {
      const organizationIds = session.data.projectMemberships?.filter((entry) => entry.status === "active" && entry.portalType !== "internal" && entry.project?.id === projectId2 && entry.project.company?.id === companyId).map((entry) => entry.portalOrganization?.id).filter(Boolean);
      return organizationIds?.length ? { tradePartner: { id: { in: organizationIds } } } : false;
    }
    case "RFI": {
      const organizationIds = session.data.projectMemberships?.filter(
        (entry) => entry.status === "active" && entry.portalType !== "internal" && (!projectId2 || entry.project?.id === projectId2) && (!companyId || entry.project?.company?.id === companyId)
      ).map((entry) => entry.portalOrganization?.id).filter(Boolean);
      return { OR: [{ ballInCourt: user }, ...organizationIds?.length ? [{ responsiblePartner: { id: { in: organizationIds } } }] : []] };
    }
    case "Submittal":
      return { ballInCourt: user };
    case "ScheduleTask":
    case "SafetyObservation":
    case "CorrectiveAction":
    case "PunchItem":
      return { assignedTo: user };
    case "DailyLog":
      return { preparedBy: user };
    case "SafetyIncident":
      return { investigator: user };
    case "Inspection":
      return { inspector: user };
    default:
      return false;
  }
}
var lifecyclePermissions = {
  BidPackage: "canManagePreconstruction",
  Estimate: "canManagePreconstruction",
  BudgetChange: "canManageFinancials",
  PrimeContract: "canManageContracts",
  Commitment: "canManageContracts",
  ChangeEvent: "canManageContracts",
  ChangeOrder: "canManageContracts",
  RFI: "canManageProjectExecution",
  Submittal: "canManageProjectExecution",
  ProgressClaim: "canManageBilling",
  SafetyIncident: "canManageSafety",
  Inspection: "canManageSafety",
  Schedule: "canManageProjectExecution",
  ScheduleTask: "canManageProjectExecution",
  DailyLog: "canManageFieldOperations",
  PunchItem: "canManageFieldOperations",
  SafetyObservation: "canManageSafety",
  CorrectiveAction: "canManageSafety",
  Payment: "canManageBilling",
  RetainageRelease: "canManageBilling",
  LienWaiver: "canManageBilling",
  ProcurementRequest: "canManageContracts"
};
var commandPermissions = {
  recordSafetyIncidentPrivateDetails: "canManageSafety",
  issueApiCredential: "canManageAgents",
  startBidPackage: "canManagePreconstruction",
  recordDirectCost: "canManageFinancials",
  openChangeEvent: "canManageContracts",
  raiseRfi: "canManageProjectExecution",
  registerSubmittal: "canManageProjectExecution",
  startDailyLog: "canManageFieldOperations",
  recordSafetyObservation: "canManageSafety",
  recordPunchItem: "canManageFieldOperations",
  registerDocument: "canManageDocuments",
  addProjectMember: "canManagePeople",
  awardBidSubmission: "canManagePreconstruction",
  prepareProgressClaim: "canManageBilling",
  recordProgressPayment: "canManageBilling",
  registerTradePartner: "canManageCompanies",
  addBudgetLine: "canManageFinancials",
  createBudgetChangeWithLine: "canManageFinancials",
  reversePostedDirectCost: "canManageFinancials",
  createEstimateWithLine: "canManagePreconstruction",
  reviseEstimate: "canManagePreconstruction",
  registerSpecificationSection: "canManageDocuments",
  registerInspectionTemplate: "canManageSafety",
  addChangeEventLine: "canManageContracts",
  recordChangeQuote: "canManageContracts",
  inviteBidder: "canManagePreconstruction",
  recordBidSubmission: "canManagePreconstruction",
  createPrimeContractWithLine: "canManageContracts",
  createCommitmentWithLine: "canManageContracts",
  createChangeOrderWithLine: "canManageContracts",
  routeRfi: "canManageProjectExecution",
  respondToRfi: "canManageProjectExecution",
  routeSubmittalReview: "canManageProjectExecution",
  recordSubmittalReview: "canManageProjectExecution",
  addDailyLogEntry: "canManageFieldOperations",
  registerFieldPhoto: "canManageFieldOperations",
  recordLaborTime: "canManageFieldOperations",
  createResourceCatalogItem: "canManageFieldOperations",
  registerSchedule: "canManageProjectExecution",
  registerScheduleTask: "canManageProjectExecution",
  linkScheduleDependency: "canManageProjectExecution",
  updateScheduleTaskProgress: "canManageProjectExecution",
  recordSafetyIncident: "canManageSafety",
  createInspectionWithItem: "canManageSafety",
  recordInspectionItemResult: "canManageSafety",
  registerCorrectiveAction: "canManageSafety",
  recordCorrectiveActionEvidence: "canManageSafety",
  createProcurementRequestWithLine: "canManageContracts",
  placeProcurementOrder: "canManageContracts",
  recordMaterialReceipt: "canManageContracts",
  recordLienWaiverEvidence: "canManageBilling",
  requestRetainageRelease: "canManageBilling",
  registerDrawing: "canManageDocuments",
  recordResourceActivity: "canManageFieldOperations",
  inviteProjectMember: "canManagePeople",
  allocateSettledPayment: "canManageBilling",
  reverseSettledPayment: "canManageBilling",
  configureConstructionApprovalPolicy: "canManageRoles",
  transitionProjectStatus: "canManageProjects"
};
var toolCommands = {
  overview: ["transitionProjectStatus"],
  preconstruction: ["startBidPackage", "registerTradePartner", "createEstimateWithLine", "reviseEstimate", "inviteBidder", "recordBidSubmission"],
  financials: ["recordDirectCost", "addBudgetLine", "createBudgetChangeWithLine", "reversePostedDirectCost", "configureConstructionApprovalPolicy"],
  contracts: ["openChangeEvent", "addChangeEventLine", "recordChangeQuote", "createPrimeContractWithLine", "createCommitmentWithLine", "createChangeOrderWithLine", "configureConstructionApprovalPolicy"],
  procurement: ["awardBidSubmission", "createProcurementRequestWithLine", "placeProcurementOrder", "recordMaterialReceipt"],
  execution: ["raiseRfi", "registerSubmittal", "routeRfi", "respondToRfi", "routeSubmittalReview", "recordSubmittalReview"],
  field: ["startDailyLog", "addDailyLogEntry", "registerFieldPhoto", "recordLaborTime", "createResourceCatalogItem", "recordResourceActivity"],
  schedule: ["registerSchedule", "registerScheduleTask", "linkScheduleDependency", "updateScheduleTaskProgress"],
  "quality-safety": ["recordSafetyObservation", "recordPunchItem", "recordSafetyIncident", "registerInspectionTemplate", "createInspectionWithItem", "recordInspectionItemResult", "registerCorrectiveAction", "recordCorrectiveActionEvidence", "recordSafetyIncidentPrivateDetails"],
  documents: ["registerDocument", "registerDrawing", "registerSpecificationSection"],
  billing: ["prepareProgressClaim", "recordProgressPayment", "recordLienWaiverEvidence", "requestRetainageRelease", "allocateSettledPayment", "reverseSettledPayment", "configureConstructionApprovalPolicy"],
  team: ["inviteProjectMember"],
  audit: ["issueApiCredential"]
};
function recordAllowedTransitions(session, listKey, status2, companyId, projectId2) {
  if (!(listKey in lifecyclePolicies)) return [];
  const permission = lifecyclePermissions[listKey];
  if (!permission || !canWriteProjectFromSession(session, companyId, projectId2) || !hasProjectPermission(session, companyId, projectId2, permission, true)) return [];
  const policy = lifecyclePolicies[listKey];
  return [...policy[status2] ?? []];
}
function allowedTransitions(session, spec, status2, companyId, projectId2, canWriteProject) {
  if (!canWriteProject || !(spec.listKey in lifecyclePolicies)) return [];
  const listKey = spec.listKey;
  const permission = lifecyclePermissions[listKey];
  if (!permission || !hasProjectPermission(session, companyId, projectId2, permission, true)) return [];
  const policy = lifecyclePolicies[listKey];
  return [...policy[status2] ?? []];
}
function availableCommands(session, tool, audience, companyId, projectId2, canWriteProject) {
  if (!canWriteProject || audience === "external") return [];
  return (toolCommands[tool] ?? []).filter(
    (operation) => hasProjectPermission(session, companyId, projectId2, commandPermissions[operation], true)
  );
}
async function loadWorkItems(context, projectId2, tool, audience, companyId, canWriteProject, page = 1) {
  const selected = tool;
  const selectedSpecs = specs[selected];
  if (!selectedSpecs) throw new Error("Unknown construction workspace tool");
  if (audience === "external" && internalOnlyTools.has(tool)) return { items: [], groups: [] };
  const take = selected === "reports" ? MAX_REPORT_ROWS_PER_LIST : MAX_ITEMS_PER_LIST;
  const session = requireSession(context);
  const externalAllowlist = audience === "external" ? externalSafeListKeys[selected] : void 0;
  const visibleSpecs = externalAllowlist ? selectedSpecs.filter((spec) => externalAllowlist.has(spec.listKey)) : selectedSpecs;
  const groups = await Promise.all(visibleSpecs.map(async (spec) => {
    const required3 = externalDomainPermissions[spec.listKey];
    if (audience === "external" && (!required3 || !hasEitherProjectPermission(session, companyId, projectId2, ...required3))) return null;
    const externalFilter = audience === "external" ? externalRecordFilter(session, spec.listKey, projectId2, companyId) : null;
    if (externalFilter === false) return null;
    const query = audience === "external" ? context.sudo?.().query ?? context.query : context.query;
    const where = {
      AND: [
        { project: { id: { equals: projectId2 } } },
        ...externalFilter ? [externalFilter] : []
      ]
    };
    const [records, totalCount] = await Promise.all([
      query[spec.listKey].findMany({
        where,
        take,
        skip: selected === "reports" ? 0 : (page - 1) * take,
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        query: spec.query
      }),
      query[spec.listKey].count({ where })
    ]);
    const items = records.map(spec.map).map((entry) => ({
      ...entry,
      amountMinor: audience === "external" ? null : entry.amountMinor,
      allowedTransitions: audience === "external" ? [] : allowedTransitions(session, spec, entry.status, companyId, projectId2, canWriteProject)
    }));
    return { kind: spec.kind, totalCount, items };
  }));
  const visible = groups.filter((group) => group !== null);
  return {
    items: visible.flatMap((group) => group.items),
    groups: visible.map((group) => ({ kind: group.kind, totalCount: group.totalCount }))
  };
}
var procurementRequestStatuses = /* @__PURE__ */ new Set([
  "draft",
  "submitted",
  "approved",
  "ordered",
  "partially_received",
  "received",
  "closed",
  "rejected",
  "cancelled"
]);
var PROCUREMENT_REQUEST_PAGE_SIZE = 20;
async function constructionProcurementRequestRegister(_root, { projectId: projectId2, page, status: status2 }, context) {
  const session = requireSession(context);
  if (!projectId2) throw new Error("Project id is required");
  const project = await context.query.Project.findOne({ where: { id: projectId2 }, query: "id company { id }" });
  const companyId = idOf(project?.company);
  if (!project?.id || !companyId || audienceForProject(session, companyId, projectId2) !== "internal" || !hasEitherProjectPermission(session, companyId, projectId2, "canReadContracts", "canManageContracts")) {
    throw new Error("Procurement request register not found");
  }
  const selectedStatus = status2?.trim() || "all";
  if (selectedStatus !== "all" && !procurementRequestStatuses.has(selectedStatus)) {
    throw new Error("Unsupported procurement request status filter");
  }
  const where = {
    company: { id: { equals: companyId } },
    project: { id: { equals: projectId2 } },
    ...selectedStatus === "all" ? {} : { status: { equals: selectedStatus } }
  };
  const totalCount = await context.query.ProcurementRequest.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / PROCUREMENT_REQUEST_PAGE_SIZE));
  const currentPage = Math.min(Math.max(Number.isSafeInteger(page) ? page : 1, 1), totalPages);
  const records = await context.query.ProcurementRequest.findMany({
    where,
    take: PROCUREMENT_REQUEST_PAGE_SIZE,
    skip: (currentPage - 1) * PROCUREMENT_REQUEST_PAGE_SIZE,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    query: "id requestNumber title status neededBy tradePartner { name }"
  });
  const procurementSpec = specs.procurement.find((spec) => spec.listKey === "ProcurementRequest");
  if (!procurementSpec) throw new Error("Procurement request projection is unavailable");
  const canWriteProject = canWriteProjectFromSession(session, companyId, projectId2);
  return {
    projectId: projectId2,
    page: currentPage,
    pageSize: PROCUREMENT_REQUEST_PAGE_SIZE,
    totalCount,
    totalPages,
    status: selectedStatus,
    items: records.map((record) => {
      const projected = item({
        kind: "Procurement request",
        record,
        reference: record.requestNumber,
        title: record.title,
        status: record.status,
        dueAt: record.neededBy,
        owner: record.tradePartner
      });
      return {
        ...projected,
        allowedTransitions: allowedTransitions(session, procurementSpec, projected.status, companyId, projectId2, canWriteProject)
      };
    })
  };
}
var materialReceiptStatuses = /* @__PURE__ */ new Set(["recorded", "accepted_with_exceptions", "rejected", "voided"]);
var MATERIAL_RECEIPT_REGISTER_PAGE_SIZE = 20;
async function constructionMaterialReceiptRegister(_root, { projectId: projectId2, page, status: status2 }, context) {
  const session = requireSession(context);
  if (!projectId2) throw new Error("Project id is required");
  const project = await context.query.Project.findOne({ where: { id: projectId2 }, query: "id company { id }" });
  const companyId = idOf(project?.company);
  if (!project?.id || !companyId || audienceForProject(session, companyId, projectId2) !== "internal" || !hasEitherProjectPermission(session, companyId, projectId2, "canReadContracts", "canManageContracts")) {
    throw new Error("Material receipt register not found");
  }
  const selectedStatus = status2?.trim() || "all";
  if (selectedStatus !== "all" && !materialReceiptStatuses.has(selectedStatus)) {
    throw new Error("Unsupported material receipt status filter");
  }
  const where = {
    company: { id: { equals: companyId } },
    project: { id: { equals: projectId2 } },
    ...selectedStatus === "all" ? {} : { status: { equals: selectedStatus } }
  };
  const receipts = context.query.MaterialReceipt;
  const totalCount = await receipts.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / MATERIAL_RECEIPT_REGISTER_PAGE_SIZE));
  const currentPage = Math.min(Math.max(Number.isSafeInteger(page) ? page : 1, 1), totalPages);
  const records = await receipts.findMany({
    where,
    take: MATERIAL_RECEIPT_REGISTER_PAGE_SIZE,
    skip: (currentPage - 1) * MATERIAL_RECEIPT_REGISTER_PAGE_SIZE,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    query: "id receiptNumber status receivedAt"
  });
  return {
    projectId: projectId2,
    page: currentPage,
    pageSize: MATERIAL_RECEIPT_REGISTER_PAGE_SIZE,
    totalCount,
    totalPages,
    status: selectedStatus,
    items: records.map((record) => ({
      id: text18(record.id),
      reference: text18(record.receiptNumber),
      status: text18(record.status),
      receivedAt: dateOf(record.receivedAt)
    }))
  };
}
var commitmentStatuses = /* @__PURE__ */ new Set(["draft", "out_for_signature", "executed", "complete", "closed", "cancelled", "terminated"]);
var PROCUREMENT_COMMITMENT_REGISTER_PAGE_SIZE = 20;
async function constructionProcurementCommitmentRegister(_root, { projectId: projectId2, page, status: status2 }, context) {
  const session = requireSession(context);
  if (!projectId2) throw new Error("Project id is required");
  const project = await context.query.Project.findOne({ where: { id: projectId2 }, query: "id company { id }" });
  const companyId = idOf(project?.company);
  if (!project?.id || !companyId || audienceForProject(session, companyId, projectId2) !== "internal" || !hasEitherProjectPermission(session, companyId, projectId2, "canReadContracts", "canManageContracts")) {
    throw new Error("Commitment register not found");
  }
  const selectedStatus = status2?.trim() || "all";
  if (selectedStatus !== "all" && !commitmentStatuses.has(selectedStatus)) {
    throw new Error("Unsupported commitment status filter");
  }
  const where = {
    company: { id: { equals: companyId } },
    project: { id: { equals: projectId2 } },
    ...selectedStatus === "all" ? {} : { status: { equals: selectedStatus } }
  };
  const commitments = context.query.Commitment;
  const totalCount = await commitments.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / PROCUREMENT_COMMITMENT_REGISTER_PAGE_SIZE));
  const currentPage = Math.min(Math.max(Number.isSafeInteger(page) ? page : 1, 1), totalPages);
  const records = await commitments.findMany({
    where,
    take: PROCUREMENT_COMMITMENT_REGISTER_PAGE_SIZE,
    skip: (currentPage - 1) * PROCUREMENT_COMMITMENT_REGISTER_PAGE_SIZE,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    query: "id number title commitmentType status"
  });
  return {
    projectId: projectId2,
    page: currentPage,
    pageSize: PROCUREMENT_COMMITMENT_REGISTER_PAGE_SIZE,
    totalCount,
    totalPages,
    status: selectedStatus,
    items: records.map((record) => ({
      id: text18(record.id),
      number: text18(record.number),
      title: text18(record.title),
      commitmentType: text18(record.commitmentType),
      status: text18(record.status)
    }))
  };
}
var bidInvitationStatuses = /* @__PURE__ */ new Set(["draft", "invited", "viewed", "intent_to_bid", "declined", "submitted"]);
var PROCUREMENT_BID_INVITATION_REGISTER_PAGE_SIZE = 20;
async function constructionProcurementBidInvitationRegister(_root, { projectId: projectId2, page, status: status2 }, context) {
  const session = requireSession(context);
  if (!projectId2) throw new Error("Project id is required");
  const project = await context.query.Project.findOne({ where: { id: projectId2 }, query: "id company { id }" });
  const companyId = idOf(project?.company);
  if (!project?.id || !companyId || audienceForProject(session, companyId, projectId2) !== "internal" || !hasEitherProjectPermission(session, companyId, projectId2, "canReadPreconstruction", "canManagePreconstruction")) {
    throw new Error("Bid invitation register not found");
  }
  const selectedStatus = status2?.trim() || "all";
  if (selectedStatus !== "all" && !bidInvitationStatuses.has(selectedStatus)) {
    throw new Error("Unsupported bid invitation status filter");
  }
  const where = {
    company: { id: { equals: companyId } },
    project: { id: { equals: projectId2 } },
    ...selectedStatus === "all" ? {} : { status: { equals: selectedStatus } }
  };
  const invitations = context.query.BidInvitation;
  const totalCount = await invitations.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / PROCUREMENT_BID_INVITATION_REGISTER_PAGE_SIZE));
  const currentPage = Math.min(Math.max(Number.isSafeInteger(page) ? page : 1, 1), totalPages);
  const records = await invitations.findMany({
    where,
    take: PROCUREMENT_BID_INVITATION_REGISTER_PAGE_SIZE,
    skip: (currentPage - 1) * PROCUREMENT_BID_INVITATION_REGISTER_PAGE_SIZE,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    query: "id status sentAt respondedAt bidPackage { id number }"
  });
  return {
    projectId: projectId2,
    page: currentPage,
    pageSize: PROCUREMENT_BID_INVITATION_REGISTER_PAGE_SIZE,
    totalCount,
    totalPages,
    status: selectedStatus,
    items: records.map((record) => {
      const bidPackage = record.bidPackage && typeof record.bidPackage === "object" ? record.bidPackage : null;
      const bidPackageId = idOf(bidPackage);
      const bidPackageNumber = text18(bidPackage?.number);
      return {
        id: text18(record.id),
        status: text18(record.status),
        sentAt: dateOf(record.sentAt),
        respondedAt: dateOf(record.respondedAt),
        bidPackage: bidPackageId && bidPackageNumber ? { id: bidPackageId, number: bidPackageNumber } : null
      };
    })
  };
}
var lienWaiverStatuses = /* @__PURE__ */ new Set(["requested", "received", "accepted", "rejected", "expired"]);
var PROCUREMENT_LIEN_WAIVER_REGISTER_PAGE_SIZE = 20;
async function constructionProcurementLienWaiverRegister(_root, { projectId: projectId2, page, status: status2 }, context) {
  const session = requireSession(context);
  if (!projectId2) throw new Error("Project id is required");
  const project = await context.query.Project.findOne({ where: { id: projectId2 }, query: "id company { id }" });
  const companyId = idOf(project?.company);
  if (!project?.id || !companyId || audienceForProject(session, companyId, projectId2) !== "internal" || !hasEitherProjectPermission(session, companyId, projectId2, "canReadBilling", "canManageBilling")) {
    throw new Error("Lien waiver register not found");
  }
  const selectedStatus = status2?.trim() || "all";
  if (selectedStatus !== "all" && !lienWaiverStatuses.has(selectedStatus)) {
    throw new Error("Unsupported lien waiver status filter");
  }
  const where = {
    company: { id: { equals: companyId } },
    project: { id: { equals: projectId2 } },
    ...selectedStatus === "all" ? {} : { status: { equals: selectedStatus } }
  };
  const waivers = context.query.LienWaiver;
  const totalCount = await waivers.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / PROCUREMENT_LIEN_WAIVER_REGISTER_PAGE_SIZE));
  const currentPage = Math.min(Math.max(Number.isSafeInteger(page) ? page : 1, 1), totalPages);
  const records = await waivers.findMany({
    where,
    take: PROCUREMENT_LIEN_WAIVER_REGISTER_PAGE_SIZE,
    skip: (currentPage - 1) * PROCUREMENT_LIEN_WAIVER_REGISTER_PAGE_SIZE,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    query: "id waiverNumber waiverType status throughDate"
  });
  return {
    projectId: projectId2,
    page: currentPage,
    pageSize: PROCUREMENT_LIEN_WAIVER_REGISTER_PAGE_SIZE,
    totalCount,
    totalPages,
    status: selectedStatus,
    items: records.map((record) => ({
      id: text18(record.id),
      waiverNumber: text18(record.waiverNumber),
      waiverType: text18(record.waiverType),
      status: text18(record.status),
      throughDate: dateOf(record.throughDate)
    }))
  };
}
var inspectionStatuses = /* @__PURE__ */ new Set(["scheduled", "in_progress", "passed", "failed", "closed", "cancelled"]);
var INSPECTION_REGISTER_PAGE_SIZE = 20;
async function constructionInspectionRegister(_root, { projectId: projectId2, page, status: status2 }, context) {
  const session = requireSession(context);
  if (!projectId2) throw new Error("Project id is required");
  const selectedStatus = status2?.trim() || "all";
  if (selectedStatus !== "all" && !inspectionStatuses.has(selectedStatus)) {
    throw new Error("Unsupported inspection status filter");
  }
  const explicitMembership = session.data.projectMemberships?.find(
    (entry) => entry.status === "active" && entry.project?.id === projectId2
  );
  const externalMembership = explicitMembership?.portalType === "internal" ? void 0 : explicitMembership;
  const externalCompanyId = externalMembership?.project?.company?.id;
  if (externalMembership && !externalCompanyId) throw new Error("Inspection register not found");
  const externalContext = externalMembership ? context.sudo?.() : void 0;
  if (externalMembership && !externalContext) throw new Error("Inspection register not found");
  const queryContext = externalContext ?? context;
  const project = await queryContext.query.Project.findOne({ where: { id: projectId2 }, query: "id company { id }" });
  const companyId = idOf(project?.company);
  const audience = companyId ? audienceForProject(session, companyId, projectId2) : "external";
  if (!project?.id || !companyId || audience === "external" && !externalMembership || externalMembership && externalCompanyId !== companyId || audience === "internal" && !hasEitherProjectPermission(session, companyId, projectId2, "canReadSafety", "canManageSafety")) {
    throw new Error("Inspection register not found");
  }
  const externalFilter = audience === "external" ? externalRecordFilter(session, "Inspection", projectId2, companyId) : null;
  if (externalFilter === false) throw new Error("Inspection register not found");
  const where = {
    company: { id: { equals: companyId } },
    project: { id: { equals: projectId2 } },
    ...externalFilter ? externalFilter : {},
    ...selectedStatus === "all" ? {} : { status: { equals: selectedStatus } }
  };
  const inspections = queryContext.query.Inspection;
  const totalCount = await inspections.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / INSPECTION_REGISTER_PAGE_SIZE));
  const currentPage = Math.min(Math.max(Number.isSafeInteger(page) ? page : 1, 1), totalPages);
  const records = await inspections.findMany({
    where,
    take: INSPECTION_REGISTER_PAGE_SIZE,
    skip: (currentPage - 1) * INSPECTION_REGISTER_PAGE_SIZE,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    query: "id inspectionNumber title status scheduledAt inspector { name }"
  });
  const inspectionSpec = specs["quality-safety"].find((spec) => spec.listKey === "Inspection");
  if (!inspectionSpec) throw new Error("Inspection projection is unavailable");
  const canWriteProject = audience === "internal" && canWriteProjectFromSession(session, companyId, projectId2);
  return {
    projectId: projectId2,
    page: currentPage,
    pageSize: INSPECTION_REGISTER_PAGE_SIZE,
    totalCount,
    totalPages,
    status: selectedStatus,
    audience,
    items: records.map((record) => {
      const projected = item({
        kind: "Inspection",
        record,
        reference: record.inspectionNumber,
        title: record.title,
        status: record.status,
        dueAt: record.scheduledAt,
        owner: record.inspector
      });
      return {
        ...projected,
        allowedTransitions: audience === "external" ? [] : allowedTransitions(session, inspectionSpec, projected.status, companyId, projectId2, canWriteProject)
      };
    })
  };
}
var incidentStatuses = /* @__PURE__ */ new Set(["reported", "investigating", "corrective_action", "closed"]);
var SAFETY_INCIDENT_REGISTER_PAGE_SIZE = 20;
async function constructionSafetyIncidentRegister(_root, { projectId: projectId2, page, status: status2 }, context) {
  const session = requireSession(context);
  if (!projectId2) throw new Error("Project id is required");
  const project = await context.query.Project.findOne({ where: { id: projectId2 }, query: "id company { id }" });
  const companyId = idOf(project?.company);
  if (!project?.id || !companyId || audienceForProject(session, companyId, projectId2) !== "internal" || !hasEitherProjectPermission(session, companyId, projectId2, "canReadSafety", "canManageSafety")) {
    throw new Error("Safety incident register not found");
  }
  const selectedStatus = status2?.trim() || "all";
  if (selectedStatus !== "all" && !incidentStatuses.has(selectedStatus)) {
    throw new Error("Unsupported safety incident status filter");
  }
  const where = {
    company: { id: { equals: companyId } },
    project: { id: { equals: projectId2 } },
    ...selectedStatus === "all" ? {} : { status: { equals: selectedStatus } }
  };
  const incidents = context.query.SafetyIncident;
  const totalCount = await incidents.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / SAFETY_INCIDENT_REGISTER_PAGE_SIZE));
  const currentPage = Math.min(Math.max(Number.isSafeInteger(page) ? page : 1, 1), totalPages);
  const records = await incidents.findMany({
    where,
    take: SAFETY_INCIDENT_REGISTER_PAGE_SIZE,
    skip: (currentPage - 1) * SAFETY_INCIDENT_REGISTER_PAGE_SIZE,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    query: "id incidentNumber status occurredAt"
  });
  return {
    page: currentPage,
    pageSize: SAFETY_INCIDENT_REGISTER_PAGE_SIZE,
    totalCount,
    totalPages,
    status: selectedStatus,
    items: records.map((record) => ({
      id: text18(record.id),
      reference: text18(record.incidentNumber),
      status: text18(record.status),
      occurredAt: dateOf(record.occurredAt)
    }))
  };
}
var safetyObservationStatuses = /* @__PURE__ */ new Set(["open", "assigned", "resolved", "closed"]);
var SAFETY_OBSERVATION_REGISTER_PAGE_SIZE = 20;
async function constructionSafetyObservationRegister(_root, { projectId: projectId2, page, status: status2 }, context) {
  const session = requireSession(context);
  if (!projectId2) throw new Error("Project id is required");
  const project = await context.query.Project.findOne({ where: { id: projectId2 }, query: "id company { id }" });
  const companyId = idOf(project?.company);
  if (!project?.id || !companyId || audienceForProject(session, companyId, projectId2) !== "internal" || !hasEitherProjectPermission(session, companyId, projectId2, "canReadSafety", "canManageSafety")) {
    throw new Error("Safety observation register not found");
  }
  const selectedStatus = status2?.trim() || "all";
  if (selectedStatus !== "all" && !safetyObservationStatuses.has(selectedStatus)) {
    throw new Error("Unsupported safety observation status filter");
  }
  const where = {
    company: { id: { equals: companyId } },
    project: { id: { equals: projectId2 } },
    ...selectedStatus === "all" ? {} : { status: { equals: selectedStatus } }
  };
  const observations = context.query.SafetyObservation;
  const totalCount = await observations.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / SAFETY_OBSERVATION_REGISTER_PAGE_SIZE));
  const currentPage = Math.min(Math.max(Number.isSafeInteger(page) ? page : 1, 1), totalPages);
  const records = await observations.findMany({
    where,
    take: SAFETY_OBSERVATION_REGISTER_PAGE_SIZE,
    skip: (currentPage - 1) * SAFETY_OBSERVATION_REGISTER_PAGE_SIZE,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    query: "id observationNumber status observedAt"
  });
  return {
    page: currentPage,
    pageSize: SAFETY_OBSERVATION_REGISTER_PAGE_SIZE,
    totalCount,
    totalPages,
    status: selectedStatus,
    items: records.map((record) => ({
      id: text18(record.id),
      reference: text18(record.observationNumber),
      status: text18(record.status),
      observedAt: dateOf(record.observedAt)
    }))
  };
}
var rfiStatuses = /* @__PURE__ */ new Set(["draft", "open", "answered", "closed", "voided"]);
var RFI_REGISTER_PAGE_SIZE = 20;
async function constructionRfiRegister(_root, { projectId: projectId2, page, status: status2 }, context) {
  const session = requireSession(context);
  if (!projectId2) throw new Error("Project id is required");
  const projectMemberships = (session.data.projectMemberships ?? []).filter(
    (entry) => entry.status === "active" && entry.project?.id === projectId2
  );
  const membership = projectMemberships[0];
  const externalMembership = membership && membership.portalType !== "internal" ? membership : void 0;
  const externalCompanyId = externalMembership?.project?.company?.id;
  if (externalMembership && !externalCompanyId) throw new Error("RFI register not found");
  const externalContext = externalMembership ? context.sudo?.() : void 0;
  if (externalMembership && !externalContext) throw new Error("RFI register not found");
  const queryContext = externalContext ?? context;
  const project = await queryContext.query.Project.findOne({ where: { id: projectId2 }, query: "id company { id }" });
  const companyId = idOf(project?.company);
  const audience = companyId ? audienceForProject(session, companyId, projectId2) : "external";
  const matchingExternalMemberships = projectMemberships.filter(
    (entry) => entry.portalType !== "internal" && entry.project?.company?.id === companyId
  );
  if (!project?.id || !companyId || audience === "external" && matchingExternalMemberships.length === 0 || externalMembership && externalCompanyId !== companyId || audience === "internal" && !hasEitherProjectPermission(session, companyId, projectId2, "canReadProjectExecution", "canManageProjectExecution")) {
    throw new Error("RFI register not found");
  }
  const selectedStatus = status2?.trim() || "all";
  if (selectedStatus !== "all" && !rfiStatuses.has(selectedStatus)) {
    throw new Error("Unsupported RFI status filter");
  }
  const organizationIds = [...new Set(matchingExternalMemberships.map((entry) => entry.portalOrganization?.id).filter((id) => Boolean(id)))];
  const externalParticipantFilter = audience === "external" ? {
    OR: [
      { ballInCourt: { id: { equals: session.itemId } } },
      ...organizationIds.length ? [{ responsiblePartner: { id: { in: organizationIds } } }] : []
    ]
  } : null;
  const where = {
    company: { id: { equals: companyId } },
    project: { id: { equals: projectId2 } },
    ...externalParticipantFilter ?? {},
    ...selectedStatus === "all" ? {} : { status: { equals: selectedStatus } }
  };
  const rfis = queryContext.query.RFI;
  const totalCount = await rfis.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / RFI_REGISTER_PAGE_SIZE));
  const currentPage = Math.min(Math.max(Number.isSafeInteger(page) ? page : 1, 1), totalPages);
  const records = await rfis.findMany({
    where,
    take: RFI_REGISTER_PAGE_SIZE,
    skip: (currentPage - 1) * RFI_REGISTER_PAGE_SIZE,
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    query: "id number subject status dueAt"
  });
  return {
    page: currentPage,
    pageSize: RFI_REGISTER_PAGE_SIZE,
    totalCount,
    totalPages,
    status: selectedStatus,
    audience,
    items: records.map((record) => ({
      id: audience === "internal" ? text18(record.id) : null,
      number: text18(record.number),
      title: text18(record.subject),
      status: text18(record.status),
      dueAt: dateOf(record.dueAt)
    }))
  };
}
var submittalStatuses = /* @__PURE__ */ new Set([
  "draft",
  "submitted",
  "under_review",
  "approved",
  "revise_resubmit",
  "rejected",
  "closed",
  "voided"
]);
var SUBMITTAL_REGISTER_PAGE_SIZE = 20;
async function constructionSubmittalRegister(_root, { projectId: projectId2, page, status: status2 }, context) {
  const session = requireSession(context);
  if (!projectId2) throw new Error("Project id is required");
  const selectedStatus = status2?.trim() || "all";
  if (selectedStatus !== "all" && !submittalStatuses.has(selectedStatus)) {
    throw new Error("Unsupported submittal status filter");
  }
  const project = await context.query.Project.findOne({ where: { id: projectId2 }, query: "id company { id }" });
  const companyId = idOf(project?.company);
  if (!project?.id || !companyId || audienceForProject(session, companyId, projectId2) !== "internal" || !hasEitherProjectPermission(session, companyId, projectId2, "canReadProjectExecution", "canManageProjectExecution")) {
    throw new Error("Submittal register not found");
  }
  const where = {
    company: { id: { equals: companyId } },
    project: { id: { equals: projectId2 } },
    ...selectedStatus === "all" ? {} : { status: { equals: selectedStatus } }
  };
  const submittals = context.query.Submittal;
  const totalCount = await submittals.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / SUBMITTAL_REGISTER_PAGE_SIZE));
  const currentPage = Math.min(Math.max(Number.isSafeInteger(page) ? page : 1, 1), totalPages);
  const records = await submittals.findMany({
    where,
    take: SUBMITTAL_REGISTER_PAGE_SIZE,
    skip: (currentPage - 1) * SUBMITTAL_REGISTER_PAGE_SIZE,
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    query: "id number title status dueAt ballInCourt { name }"
  });
  return {
    projectId: projectId2,
    page: currentPage,
    pageSize: SUBMITTAL_REGISTER_PAGE_SIZE,
    totalCount,
    totalPages,
    status: selectedStatus,
    items: records.map((record) => item({
      kind: "Submittal",
      record,
      reference: record.number,
      title: record.title,
      status: record.status,
      dueAt: record.dueAt,
      owner: record.ballInCourt
    }))
  };
}
async function constructionProjectWorkspace(_root, { projectId: projectId2, tool, page }, context) {
  const session = requireSession(context);
  if (!projectId2) throw new Error("Project id is required");
  const selectedTool = tool || "overview";
  const externalGrant = session.data.projectMemberships?.find((entry) => entry.status === "active" && entry.project?.id === projectId2 && entry.portalType !== "internal");
  if (externalGrant) {
    const companyId2 = externalGrant.project?.company?.id;
    if (!companyId2 || !hasSessionProjectAccess(session, companyId2, projectId2) || !hasEitherProjectPermission(session, companyId2, projectId2, "canReadProjects", "canManageProjects")) throw new Error("Project not found");
  }
  const project = externalGrant && context.sudo ? await context.sudo().query.Project.findOne({ where: { id: projectId2 }, query: projectIdentityQuery }) : await context.query.Project.findOne({ where: { id: projectId2 }, query: projectSummaryQuery });
  if (!project) throw new Error("Project not found");
  const companyId = idOf(project.company);
  const audience = audienceForProject(session, companyId, projectId2);
  const canViewInternalFinancials = audience === "internal" && hasEitherProjectPermission(
    session,
    companyId,
    projectId2,
    "canReadFinancials",
    "canManageFinancials"
  );
  const canWriteProject = canWriteProjectFromSession(session, companyId, projectId2);
  const queuePage = Math.max(1, Math.floor(Number(page) || 1));
  const { items, groups } = await loadWorkItems(context, projectId2, selectedTool, audience, companyId, canWriteProject, queuePage);
  const pageSize = selectedTool === "reports" ? MAX_REPORT_ROWS_PER_LIST : MAX_ITEMS_PER_LIST;
  const summary = projectSummary(project, audience, canViewInternalFinancials);
  const metrics = [];
  if (canViewInternalFinancials) {
    metrics.push(
      { key: "revised-budget", label: "Revised budget", value: summary.revisedBudgetMinor ?? "0", unit: summary.currencyCode, tone: "neutral" },
      { key: "committed", label: "Committed", value: summary.committedMinor ?? "0", unit: summary.currencyCode, tone: "neutral" },
      { key: "actual", label: "Actual cost", value: summary.actualCostMinor ?? "0", unit: summary.currencyCode, tone: "neutral" }
    );
  }
  if (audience === "internal") {
    const openCounts = [summary.openRfis, summary.openSubmittals, summary.openChanges, summary.openPunch, summary.openSafety];
    metrics.push({
      key: "open-work",
      label: "Open work",
      value: openCounts.some((count2) => count2 === null) ? "" : String(openCounts.reduce((sum2, count2) => sum2 + (count2 ?? 0), 0)),
      unit: "items",
      tone: "attention"
    });
  }
  return {
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    tool: selectedTool,
    audience,
    availableCommands: availableCommands(session, selectedTool, audience, companyId, projectId2, canWriteProject),
    project: summary,
    metrics,
    items,
    queuePage,
    queueTotalPages: Math.max(1, ...groups.map((group) => Math.ceil(group.totalCount / pageSize))),
    queueGroups: groups
  };
}
var optionSpecs = [
  { kind: "budgetCode", listKey: "BudgetCode", read: "canReadFinancials", manage: "canManageFinancials", query: "id code description", label: (row) => `${text18(row.code)} \xB7 ${text18(row.description)}`, search: ["code", "description"] },
  { kind: "partner", listKey: "TradePartner", read: "canReadCompanies", manage: "canManageCompanies", companyScoped: true, query: "id name partnerType status", label: (row) => text18(row.name), detail: (row) => `${text18(row.partnerType)} \xB7 ${text18(row.status)}`, status: (row) => text18(row.status), search: ["name"] },
  { kind: "role", listKey: "Role", read: "canReadPeople", manage: "canManagePeople", companyScoped: true, query: "id name", label: (row) => text18(row.name), search: ["name"] },
  { kind: "accountInvitation", listKey: "AccountInvitation", read: "canReadPeople", manage: "canManagePeople", query: "id email status expiresAt", label: (row) => text18(row.email), detail: (row) => `${text18(row.status)} \xB7 expires ${dateOf(row.expiresAt) ?? "\u2014"}`, status: (row) => text18(row.status), search: ["email"] },
  { kind: "apiCredential", listKey: "ApiCredential", read: "canReadAgents", manage: "canManageAgents", companyScoped: true, query: "id name tokenPrefix status expiresAt project { id }", label: (row) => `${text18(row.name)} \xB7 ${text18(row.tokenPrefix)}`, detail: (row) => `${text18(row.status)}${row.expiresAt ? ` \xB7 expires ${dateOf(row.expiresAt)}` : ""}`, status: (row) => text18(row.status), search: ["name", "tokenPrefix"] },
  { kind: "membership", listKey: "ProjectMembership", read: "canReadPeople", manage: "canManagePeople", query: "id status portalType user { id name email }", label: (row) => nameOf(row.user), detail: (row) => `${text18(row.portalType)} \xB7 ${text18(row.status)}`, status: (row) => text18(row.status), search: ["user.name", "user.email"] },
  { kind: "user", listKey: "ProjectMembership", read: "canReadPeople", manage: "canManagePeople", query: "id status portalType user { id name email }", id: (row) => idOf(row.user), label: (row) => nameOf(row.user), detail: (row) => `${text18(row.portalType)} \xB7 ${text18(row.status)}`, idPath: "user.id", status: (row) => text18(row.status), search: ["user.name", "user.email"] },
  { kind: "companyMember", listKey: "CompanyMembership", read: "canReadPeople", manage: "canManagePeople", companyScoped: true, query: "id status title user { id name email }", id: (row) => idOf(row.user), label: (row) => nameOf(row.user), detail: (row) => [text18(row.title), text18(row.user?.email)].filter(Boolean).join(" \xB7 "), idPath: "user.id", status: (row) => text18(row.status), search: ["user.name", "user.email"] },
  { kind: "bidPackage", listKey: "BidPackage", read: "canReadPreconstruction", manage: "canManagePreconstruction", query: "id number title status", label: (row) => `${text18(row.number)} \xB7 ${text18(row.title)}`, detail: (row) => text18(row.status), status: (row) => text18(row.status), search: ["number", "title"] },
  { kind: "bidInvitation", listKey: "BidInvitation", read: "canReadPreconstruction", manage: "canManagePreconstruction", query: "id status tradePartner { name } bidPackage { id number }", label: (row) => `${text18(row.bidPackage?.number)} \xB7 ${nameOf(row.tradePartner)}`, detail: (row) => text18(row.status), parent: (row) => idOf(row.bidPackage), status: (row) => text18(row.status), search: ["bidPackage.number", "tradePartner.name"] },
  { kind: "bidSubmission", listKey: "BidSubmission", read: "canReadPreconstruction", manage: "canManagePreconstruction", query: "id submissionNumber status tradePartner { name }", label: (row) => `${text18(row.submissionNumber)} \xB7 ${nameOf(row.tradePartner)}`, detail: (row) => text18(row.status), status: (row) => text18(row.status), search: ["submissionNumber", "tradePartner.name"] },
  { kind: "directCost", listKey: "DirectCost", read: "canReadFinancials", manage: "canManageFinancials", query: "id referenceNumber description status amountMinor", label: (row) => `${text18(row.referenceNumber)} \xB7 ${text18(row.description)}`, detail: (row) => text18(row.status), status: (row) => text18(row.status), search: ["referenceNumber", "description"] },
  { kind: "budgetChange", listKey: "BudgetChange", read: "canReadFinancials", manage: "canManageFinancials", query: "id number title status", label: (row) => `${text18(row.number)} \xB7 ${text18(row.title)}`, detail: (row) => text18(row.status), status: (row) => text18(row.status), search: ["number", "title"] },
  { kind: "estimate", listKey: "Estimate", read: "canReadPreconstruction", manage: "canManagePreconstruction", query: "id number title status", label: (row) => `${text18(row.number)} \xB7 ${text18(row.title)}`, detail: (row) => text18(row.status), status: (row) => text18(row.status), search: ["number", "title"] },
  { kind: "changeEvent", listKey: "ChangeEvent", read: "canReadContracts", manage: "canManageContracts", query: "id number title status", label: (row) => `${text18(row.number)} \xB7 ${text18(row.title)}`, detail: (row) => text18(row.status), status: (row) => text18(row.status), search: ["number", "title"] },
  { kind: "changeEventLine", listKey: "ChangeEventLineItem", read: "canReadContracts", manage: "canManageContracts", query: "id lineNumber description changeEvent { id number }", label: (row) => `${text18(row.changeEvent?.number)} \xB7 ${text18(row.description)}`, parent: (row) => idOf(row.changeEvent), search: ["description"] },
  { kind: "primeContract", listKey: "PrimeContract", read: "canReadContracts", manage: "canManageContracts", query: "id number title status", label: (row) => `${text18(row.number)} \xB7 ${text18(row.title)}`, detail: (row) => text18(row.status), status: (row) => text18(row.status), search: ["number", "title"] },
  { kind: "commitment", listKey: "Commitment", read: "canReadContracts", manage: "canManageContracts", query: "id number title status tradePartner { name }", label: (row) => `${text18(row.number)} \xB7 ${text18(row.title)}`, detail: (row) => `${nameOf(row.tradePartner)} \xB7 ${text18(row.status)}`, status: (row) => text18(row.status), search: ["number", "title", "tradePartner.name"] },
  { kind: "changeOrder", listKey: "ChangeOrder", read: "canReadContracts", manage: "canManageContracts", query: "id number title status", label: (row) => `${text18(row.number)} \xB7 ${text18(row.title)}`, detail: (row) => text18(row.status), status: (row) => text18(row.status), search: ["number", "title"] },
  { kind: "rfi", listKey: "RFI", read: "canReadProjectExecution", manage: "canManageProjectExecution", query: "id number subject status", label: (row) => `${text18(row.number)} \xB7 ${text18(row.subject)}`, detail: (row) => text18(row.status), status: (row) => text18(row.status), search: ["number", "subject"] },
  { kind: "submittal", listKey: "Submittal", read: "canReadProjectExecution", manage: "canManageProjectExecution", query: "id number title status", label: (row) => `${text18(row.number)} \xB7 ${text18(row.title)}`, detail: (row) => text18(row.status), status: (row) => text18(row.status), search: ["number", "title"] },
  { kind: "submittalReview", listKey: "SubmittalReview", read: "canReadProjectExecution", manage: "canManageProjectExecution", query: "id status submittal { id number title }", label: (row) => `${text18(row.submittal?.number)} review`, detail: (row) => text18(row.status), parent: (row) => idOf(row.submittal), status: (row) => text18(row.status), search: ["submittal.number", "submittal.title"] },
  { kind: "drawing", listKey: "Drawing", read: "canReadDocuments", manage: "canManageDocuments", query: "id drawingNumber title status", label: (row) => `${text18(row.drawingNumber)} \xB7 ${text18(row.title)}`, detail: (row) => text18(row.status), status: (row) => text18(row.status), search: ["drawingNumber", "title"] },
  { kind: "drawingRevision", listKey: "DrawingRevision", read: "canReadDocuments", manage: "canManageDocuments", query: "id revisionNumber fileName status drawing { id drawingNumber title }", label: (row) => `${text18(row.drawing?.drawingNumber)} \xB7 ${text18(row.revisionNumber)}`, detail: (row) => `${text18(row.fileName)} \xB7 ${text18(row.status)}`, parent: (row) => idOf(row.drawing), status: (row) => text18(row.status), search: ["revisionNumber", "fileName", "drawing.drawingNumber"] },
  { kind: "document", listKey: "Document", read: "canReadDocuments", manage: "canManageDocuments", query: "id documentNumber title status", label: (row) => `${text18(row.documentNumber)} \xB7 ${text18(row.title)}`, detail: (row) => text18(row.status), status: (row) => text18(row.status), search: ["documentNumber", "title"] },
  { kind: "documentVersion", listKey: "DocumentVersion", read: "canReadDocuments", manage: "canManageDocuments", query: "id versionNumber fileName issuedAt document { id documentNumber title }", label: (row) => `${text18(row.document?.documentNumber)} \xB7 v${String(row.versionNumber ?? "")}`, detail: (row) => text18(row.fileName), parent: (row) => idOf(row.document), status: () => "issued", where: { issuedAt: { not: { equals: null } } }, search: ["fileName", "document.documentNumber", "document.title"] },
  { kind: "dailyLogEntry", listKey: "DailyLogEntry", read: "canReadFieldOperations", manage: "canManageFieldOperations", query: "id entryType title dailyLog { id logDate status }", label: (row) => `${dateOf(row.dailyLog?.logDate) ?? "Log"} \xB7 ${text18(row.title)}`, detail: (row) => text18(row.entryType), parent: (row) => idOf(row.dailyLog), status: (row) => text18(row.dailyLog?.status), search: ["title"] },
  { kind: "dailyLog", listKey: "DailyLog", read: "canReadFieldOperations", manage: "canManageFieldOperations", query: "id logDate status weatherSummary", label: (row) => `${dateOf(row.logDate)} \xB7 ${text18(row.weatherSummary, "Daily log")}`, detail: (row) => text18(row.status), status: (row) => text18(row.status), search: ["weatherSummary"] },
  { kind: "schedule", listKey: "Schedule", read: "canReadProjectExecution", manage: "canManageProjectExecution", query: "id name scheduleType status", label: (row) => text18(row.name), detail: (row) => `${text18(row.scheduleType)} \xB7 ${text18(row.status)}`, status: (row) => text18(row.status), search: ["name"] },
  { kind: "scheduleTask", listKey: "ScheduleTask", read: "canReadProjectExecution", manage: "canManageProjectExecution", query: "id taskCode name status schedule { id }", label: (row) => `${text18(row.taskCode)} \xB7 ${text18(row.name)}`, detail: (row) => text18(row.status), parent: (row) => idOf(row.schedule), status: (row) => text18(row.status), search: ["taskCode", "name"] },
  { kind: "equipment", listKey: "Equipment", read: "canReadFieldOperations", manage: "canManageFieldOperations", companyScoped: true, query: "id equipmentNumber name status", label: (row) => `${text18(row.equipmentNumber)} \xB7 ${text18(row.name)}`, detail: (row) => text18(row.status), status: (row) => text18(row.status), search: ["equipmentNumber", "name"] },
  { kind: "material", listKey: "Material", read: "canReadFieldOperations", manage: "canManageFieldOperations", companyScoped: true, query: "id sku name unit", label: (row) => `${text18(row.sku)} \xB7 ${text18(row.name)}`, detail: (row) => text18(row.unit), search: ["sku", "name"] },
  { kind: "inspectionItem", listKey: "InspectionItem", read: "canReadSafety", manage: "canManageSafety", query: "id prompt result inspection { id inspectionNumber status }", label: (row) => `${text18(row.inspection?.inspectionNumber)} \xB7 ${text18(row.prompt)}`, detail: (row) => text18(row.result), parent: (row) => idOf(row.inspection), status: (row) => text18(row.inspection?.status), search: ["prompt", "inspection.inspectionNumber"] },
  { kind: "safetyIncident", listKey: "SafetyIncident", read: "canReadSafety", manage: "canManageSafety", query: "id incidentNumber title status", label: (row) => `${text18(row.incidentNumber)} \xB7 ${text18(row.title)}`, detail: (row) => text18(row.status), status: (row) => text18(row.status), search: ["incidentNumber", "title"] },
  { kind: "safetyObservation", listKey: "SafetyObservation", read: "canReadSafety", manage: "canManageSafety", query: "id observationNumber title status", label: (row) => `${text18(row.observationNumber)} \xB7 ${text18(row.title)}`, detail: (row) => text18(row.status), status: (row) => text18(row.status), search: ["observationNumber", "title"] },
  { kind: "correctiveAction", listKey: "CorrectiveAction", read: "canReadSafety", manage: "canManageSafety", query: "id actionNumber title status", label: (row) => `${text18(row.actionNumber)} \xB7 ${text18(row.title)}`, detail: (row) => text18(row.status), status: (row) => text18(row.status), search: ["actionNumber", "title"] },
  { kind: "punchItem", listKey: "PunchItem", read: "canReadFieldOperations", manage: "canManageFieldOperations", query: "id number title status", label: (row) => `${text18(row.number)} \xB7 ${text18(row.title)}`, detail: (row) => text18(row.status), status: (row) => text18(row.status), search: ["number", "title"] },
  { kind: "procurementRequest", listKey: "ProcurementRequest", read: "canReadContracts", manage: "canManageContracts", query: "id requestNumber title status", label: (row) => `${text18(row.requestNumber)} \xB7 ${text18(row.title)}`, detail: (row) => text18(row.status), status: (row) => text18(row.status), search: ["requestNumber", "title"] },
  { kind: "procurementRequestLine", listKey: "ProcurementRequestLine", read: "canReadContracts", manage: "canManageContracts", query: "id lineNumber description request { id requestNumber }", label: (row) => `${text18(row.request?.requestNumber)} \xB7 ${text18(row.description)}`, parent: (row) => idOf(row.request), search: ["description", "request.requestNumber"] },
  { kind: "progressClaim", listKey: "ProgressClaim", read: "canReadBilling", manage: "canManageBilling", query: "id claimNumber status currentPaymentDueMinor tradePartner { name }", label: (row) => `${text18(row.claimNumber)} \xB7 ${nameOf(row.tradePartner)}`, detail: (row) => text18(row.status), status: (row) => text18(row.status), search: ["claimNumber", "tradePartner.name"] },
  { kind: "retainageRelease", listKey: "RetainageRelease", read: "canReadBilling", manage: "canManageBilling", query: "id releaseNumber status amountMinor", label: (row) => text18(row.releaseNumber), detail: (row) => text18(row.status), status: (row) => text18(row.status), search: ["releaseNumber"] },
  { kind: "approvalPolicy", listKey: "ApprovalPolicy", read: "canReadAudit", manage: "canManageRoles", query: "id name domain minimumAmountMinor currencyCode isActive approverRole { name }", label: (row) => `${text18(row.name)} \xB7 ${text18(row.domain)}`, detail: (row) => `${row.isActive ? "active" : "inactive"} \xB7 ${currencyAmount(row.minimumAmountMinor, row.currencyCode)}+ \xB7 ${nameOf(row.approverRole)}`, status: (row) => row.isActive ? "active" : "inactive", search: ["name"] },
  { kind: "approvalRequest", listKey: "ApprovalRequest", read: "canReadAudit", manage: "canReadAudit", query: "id requestNumber status targetType targetStatus", label: (row) => `${text18(row.requestNumber)} \xB7 ${text18(row.targetType)}`, detail: (row) => `${text18(row.status)} \u2192 ${text18(row.targetStatus)}`, status: (row) => text18(row.status), search: ["requestNumber"] },
  { kind: "payment", listKey: "Payment", read: "canReadBilling", manage: "canManageBilling", query: "id paymentNumber status amountMinor reference", label: (row) => `${text18(row.paymentNumber)} \xB7 ${text18(row.reference)}`, detail: (row) => text18(row.status), status: (row) => text18(row.status), search: ["paymentNumber", "reference"] }
];
var OPTION_INITIAL_TAKE = 100;
var OPTION_SEARCH_PAGE_SIZE = 25;
var OPTION_SEARCH_MAX_IDS = 50;
function optionRow(spec, record) {
  return {
    id: spec.id?.(record) || text18(record.id),
    kind: spec.kind,
    label: spec.label(record),
    detail: spec.detail?.(record) ?? "",
    parentId: spec.parent?.(record) || null,
    status: spec.status?.(record) || null
  };
}
function pathFilter(path, leaf) {
  return path.split(".").reduceRight((inner, segment) => ({ [segment]: inner }), leaf);
}
function optionWhere(spec, scope, lookup = {}) {
  const clauses = [
    spec.companyScoped ? { company: { id: { equals: scope.companyId } } } : { project: { id: { equals: scope.projectId } } }
  ];
  if (spec.kind === "approvalPolicy") clauses.push({ company: { id: { equals: scope.companyId } } });
  if (spec.where) clauses.push(spec.where);
  const search = lookup.search?.trim().slice(0, 120);
  if (search && spec.search?.length) {
    clauses.push({ OR: spec.search.map((path) => pathFilter(path, { contains: search, mode: "insensitive" })) });
  }
  if (lookup.ids?.length) clauses.push(pathFilter(spec.idPath ?? "id", { in: [...lookup.ids] }));
  return clauses.length === 1 ? clauses[0] : { AND: clauses };
}
async function internalOptionScope(context, projectId2) {
  const session = requireSession(context);
  const project = await context.query.Project.findOne({ where: { id: projectId2 }, query: "id company { id }" });
  const companyId = idOf(project?.company);
  if (!project?.id || !companyId || audienceForProject(session, companyId, projectId2) !== "internal") {
    throw new Error("Internal project options are not available");
  }
  return { session, companyId, projectId: projectId2 };
}
function visibleOption(spec, scope) {
  return spec.kind === "role" && hasProjectPermission(scope.session, scope.companyId, scope.projectId, "canManageRoles", true) || hasEitherProjectPermission(scope.session, scope.companyId, scope.projectId, spec.read, spec.manage);
}
function optionApi(context, spec, scope) {
  if (["role", "approvalPolicy"].includes(spec.kind) && hasProjectPermission(scope.session, scope.companyId, scope.projectId, "canManageRoles", true)) {
    const api = context.sudo?.().query[spec.listKey];
    if (!api) throw new Error("Scoped approval configuration lookup is unavailable");
    return api;
  }
  return context.query[spec.listKey];
}
async function constructionProjectOptions(_root, { projectId: projectId2 }, context) {
  const scope = await internalOptionScope(context, projectId2);
  const visible = optionSpecs.filter((spec) => visibleOption(spec, scope));
  const groups = await Promise.all(visible.map(async (spec) => {
    const records = await optionApi(context, spec, scope).findMany({
      where: optionWhere(spec, scope),
      take: OPTION_INITIAL_TAKE,
      orderBy: { createdAt: "desc" },
      query: spec.query
    });
    return records.map((record) => optionRow(spec, record));
  }));
  return groups.flat();
}
async function constructionProjectOptionSearch(_root, { projectId: projectId2, kinds, search, page, ids }, context) {
  const scope = await internalOptionScope(context, projectId2);
  const requested = new Set(kinds.slice(0, 8));
  const visible = optionSpecs.filter((spec) => requested.has(spec.kind) && visibleOption(spec, scope));
  const currentPage = Math.max(1, Math.min(Math.trunc(Number(page) || 1), 400));
  const selectedIds = ids?.slice(0, OPTION_SEARCH_MAX_IDS).filter(Boolean) ?? [];
  const results = await Promise.all(visible.map(async (spec) => {
    const where = optionWhere(spec, scope, selectedIds.length ? { ids: selectedIds } : { search });
    const api = optionApi(context, spec, scope);
    const [records, totalCount2] = await Promise.all([
      api.findMany({
        where,
        take: selectedIds.length ? OPTION_SEARCH_MAX_IDS : OPTION_SEARCH_PAGE_SIZE,
        skip: selectedIds.length ? 0 : (currentPage - 1) * OPTION_SEARCH_PAGE_SIZE,
        orderBy: { createdAt: "desc" },
        query: spec.query
      }),
      api.count({ where })
    ]);
    return { items: records.map((record) => optionRow(spec, record)), totalCount: totalCount2 };
  }));
  const totalCount = results.reduce((sum2, result) => sum2 + result.totalCount, 0);
  return {
    items: results.flatMap((result) => result.items),
    page: currentPage,
    totalCount,
    hasMore: !selectedIds.length && results.some((result) => result.totalCount > currentPage * OPTION_SEARCH_PAGE_SIZE)
  };
}

// features/keystone/domain/approval-review.ts
var import_node_crypto3 = require("node:crypto");
function text19(value, fallback = "") {
  return typeof value === "string" && value ? value : fallback;
}
function bounded(value, max = 4e3) {
  return value.length <= max ? value : value.slice(0, max) + "\u2026";
}
function related(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? Object.fromEntries(Object.entries(value)) : {};
}
function moneyLabel(value, currency) {
  const code = text19(currency);
  const raw = String(value ?? "");
  if (!/^-?\d+$/.test(raw) || typeof value === "number" && !Number.isSafeInteger(value)) return code ? code + " \u2014" : "Amount not recorded";
  if (code !== "USD") return (code || "Currency not recorded") + " " + raw + " minor units";
  const minor = BigInt(raw), absolute = minor < BigInt(0) ? -minor : minor;
  return `USD ${minor < BigInt(0) ? "-" : ""}${absolute / BigInt(100)}.${(absolute % BigInt(100)).toString().padStart(2, "0")}`;
}
function snapshotRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? Object.fromEntries(Object.entries(value)) : null;
}
function snapshotScalar(value) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}
function addSnapshotValue(lines, label, value) {
  const safe = snapshotScalar(value);
  if (safe) lines.push(`${label}: ${safe}`);
}
function addSnapshotMoney(lines, label, value, currency) {
  if (value !== null && value !== void 0) lines.push(`${label}: ${moneyLabel(value, currency)}`);
}
function addSnapshotRate(lines, label, value) {
  const raw = String(value ?? "");
  if (!/^\d+$/.test(raw)) return;
  const bps = BigInt(raw);
  if (bps > BigInt(1e4)) throw new Error("Approval snapshot contains an invalid retainage rate");
  lines.push(`${label}: ${bps / BigInt(100)}.${(bps % BigInt(100)).toString().padStart(2, "0")}%`);
}
function addLineItemTerms(lines, snapshot, currency, fields) {
  const items = Array.isArray(snapshot.lineItems) ? snapshot.lineItems : [];
  if (items.length > 500) throw new Error("Approval snapshot exceeds the portal review limit");
  lines.push(`Line items captured: ${items.length}`);
  for (const field of fields) {
    let total2 = BigInt(0);
    let found = false;
    for (const item3 of items) {
      const value = snapshotRecord(item3)?.[field.key];
      if (value === null || value === void 0) continue;
      try {
        if (!/^-?\d+$/.test(String(value)) || typeof value === "number" && !Number.isSafeInteger(value)) throw new Error("Invalid amount");
        total2 += BigInt(String(value));
        found = true;
      } catch {
        throw new Error("Approval snapshot contains invalid line-item amounts");
      }
    }
    if (found) addSnapshotMoney(lines, field.label, total2.toString(), currency);
  }
}
function assertAssignedOwnerApprovalSnapshot(request, scope) {
  const raw = text19(request.canonicalSnapshot);
  if (!raw || Buffer.byteLength(raw, "utf8") > 512e3 || (0, import_node_crypto3.createHash)("sha256").update(raw).digest("hex") !== request.snapshotDigest) throw new Error("Approval snapshot integrity verification failed");
  let snapshot;
  try {
    snapshot = snapshotRecord(JSON.parse(raw));
  } catch {
    throw new Error("Approval assignment requires staff review");
  }
  const saved = related(snapshot?._approvalAssignment), current = related(request.assignedTo);
  const currentProject = related(current.project), currentUser = related(current.user), currentRole = related(current.role);
  if (!snapshot || snapshot.snapshotVersion !== 2 || related(snapshot.company).id !== scope.companyId || related(snapshot.project).id !== scope.projectId || scope.portalType !== "owner" || typeof scope.roleId !== "string" || scope.accessLevel === "viewer" || !scope.accessLevel || current.status !== "active" || current.portalType !== "owner" || current.accessLevel !== scope.accessLevel || currentUser.id !== scope.userId || currentUser.isActive !== true || currentRole.id !== scope.roleId || related(current.portalOrganization).id !== scope.organizationId || currentProject.id !== scope.projectId || related(currentProject.company).id !== scope.companyId || !current.id || saved.membershipId !== current.id || saved.userId !== scope.userId || saved.roleId !== scope.roleId || saved.portalType !== scope.portalType || saved.organizationId !== scope.organizationId || saved.accessLevel !== scope.accessLevel) throw new Error("Approval assignment requires staff review");
}
function presentApprovalSnapshot(targetType, request, rawSnapshot) {
  if (Buffer.byteLength(rawSnapshot, "utf8") > 512e3) throw new Error("Approval snapshot exceeds the portal review limit");
  if (typeof request.snapshotDigest !== "string" || (0, import_node_crypto3.createHash)("sha256").update(rawSnapshot).digest("hex") !== request.snapshotDigest) throw new Error("Approval snapshot integrity verification failed");
  let snapshot = null;
  try {
    snapshot = snapshotRecord(JSON.parse(rawSnapshot));
  } catch {
    throw new Error("Approval snapshot is unavailable for review");
  }
  if (!snapshot || !text19(request.targetId) || snapshot.id !== text19(request.targetId)) {
    throw new Error("Approval snapshot does not match its request target");
  }
  const amountFieldByType = {
    BudgetChange: "totalAmountMinor",
    PrimeContract: "revisedContractMinor",
    ChangeOrder: "totalMinor",
    ProgressClaim: "currentPaymentDueMinor",
    RetainageRelease: "amountMinor"
  };
  const amountField = Object.hasOwn(amountFieldByType, targetType) ? amountFieldByType[targetType] : void 0;
  if (snapshot.snapshotVersion === 2 && snapshot.approvalTarget !== targetType) throw new Error("Approval snapshot type does not match its request");
  if (!amountField) throw new Error("This approval snapshot is not available in the external portal");
  try {
    if (!/^-?\d+$/.test(String(snapshot[amountField] ?? "")) || !/^-?\d+$/.test(String(request.amountMinor ?? "")) || BigInt(String(snapshot[amountField])) !== BigInt(String(request.amountMinor))) {
      throw new Error("Approval amount does not match its immutable snapshot");
    }
  } catch {
    throw new Error("Approval amount does not match its immutable snapshot");
  }
  const lines = [
    `Requested transition: ${bounded(text19(request.targetStatus), 100)}`,
    `Amount on request: ${moneyLabel(request.amountMinor, request.currencyCode)}`
  ];
  const currency = snapshot.currencyCode;
  if (typeof currency !== "string" || currency !== request.currencyCode) throw new Error("Approval currency does not match its immutable snapshot");
  switch (targetType) {
    case "BudgetChange":
      addSnapshotValue(lines, "Budget change", snapshot.number);
      addSnapshotValue(lines, "Title", snapshot.title);
      addSnapshotValue(lines, "Reason", snapshot.reason);
      addSnapshotValue(lines, "Status at request", snapshot.status);
      addSnapshotMoney(lines, "Requested total", snapshot.totalAmountMinor, currency);
      addLineItemTerms(lines, snapshot, currency, [{ key: "amountMinor", label: "Line-item amount total" }]);
      break;
    case "PrimeContract":
      addSnapshotValue(lines, "Prime contract", snapshot.number);
      addSnapshotValue(lines, "Title", snapshot.title);
      addSnapshotValue(lines, "Status at request", snapshot.status);
      addSnapshotMoney(lines, "Original contract", snapshot.originalContractMinor, currency);
      addSnapshotMoney(lines, "Approved changes", snapshot.approvedChangesMinor, currency);
      addSnapshotMoney(lines, "Revised contract", snapshot.revisedContractMinor, currency);
      addLineItemTerms(lines, snapshot, currency, [
        { key: "scheduledValueMinor", label: "Scheduled line-value total" },
        { key: "revisedValueMinor", label: "Revised line-value total" }
      ]);
      break;
    case "ChangeOrder":
      addSnapshotValue(lines, "Change order", snapshot.number);
      addSnapshotValue(lines, "Title", snapshot.title);
      addSnapshotValue(lines, "Description", snapshot.description);
      addSnapshotValue(lines, "Direction", snapshot.direction);
      addSnapshotValue(lines, "Status at request", snapshot.status);
      addSnapshotMoney(lines, "Change-order total", snapshot.totalMinor, currency);
      addSnapshotValue(lines, "Schedule impact (days)", snapshot.scheduleImpactDays);
      addLineItemTerms(lines, snapshot, currency, [{ key: "amountMinor", label: "Line-item amount total" }]);
      break;
    case "ProgressClaim":
      addSnapshotValue(lines, "Progress claim", snapshot.claimNumber);
      addSnapshotValue(lines, "Status at request", snapshot.status);
      addSnapshotValue(lines, "Period start", snapshot.periodStart);
      addSnapshotValue(lines, "Period end", snapshot.periodEnd);
      addSnapshotValue(lines, "Claim type", snapshot.claimType);
      addSnapshotMoney(lines, "Original contract", snapshot.originalContractMinor, currency);
      addSnapshotMoney(lines, "Approved changes", snapshot.approvedChangesMinor, currency);
      addSnapshotMoney(lines, "Revised contract", snapshot.revisedContractMinor, currency);
      addSnapshotMoney(lines, "Work to date", snapshot.workCompletedToDateMinor, currency);
      addSnapshotMoney(lines, "Stored materials", snapshot.storedMaterialsMinor, currency);
      addSnapshotMoney(lines, "Earned less retainage", snapshot.earnedLessRetainageMinor, currency);
      addSnapshotMoney(lines, "Previous payments", snapshot.previousPaymentsMinor, currency);
      addSnapshotMoney(lines, "Balance to finish", snapshot.balanceToFinishMinor, currency);
      addSnapshotMoney(lines, "Current payment due", snapshot.currentPaymentDueMinor, currency);
      addSnapshotMoney(lines, "Retainage", snapshot.retainageMinor, currency);
      addLineItemTerms(lines, snapshot, currency, [
        { key: "currentWorkMinor", label: "Current work total" },
        { key: "storedMaterialsMinor", label: "Stored materials total" },
        { key: "retainageMinor", label: "Line retainage total" },
        { key: "earnedLessRetainageMinor", label: "Earned less retainage total" }
      ]);
      break;
    case "RetainageRelease":
      addSnapshotValue(lines, "Retainage release", snapshot.releaseNumber);
      addSnapshotValue(lines, "Status at request", snapshot.status);
      addSnapshotMoney(lines, "Release amount", snapshot.amountMinor, currency);
      addSnapshotValue(lines, "Reason", snapshot.reason);
      break;
    default:
      throw new Error("This approval snapshot is not available in the external portal");
  }
  if (snapshot.snapshotVersion !== 2) lines.unshift("A new review is required before this legacy request can be approved.");
  if (targetType === "PrimeContract") {
    addSnapshotValue(lines, "Terms and scope", snapshot.description);
    addSnapshotValue(lines, "Contract type", snapshot.contractType);
    addSnapshotValue(lines, "Start date", snapshot.startDate);
    addSnapshotValue(lines, "Completion date", snapshot.completionDate);
    addSnapshotRate(lines, "Default retainage", snapshot.defaultRetainageBps);
  }
  const prime = related(snapshot.primeContract), commitment = related(snapshot.commitment), claim = related(snapshot.progressClaim), payment = related(snapshot.payment);
  const party = related(snapshot.client ?? snapshot.tradePartner ?? prime.client ?? commitment.tradePartner ?? claim.tradePartner);
  addSnapshotValue(lines, "Counterparty", party.name);
  addSnapshotValue(lines, "Prime contract", prime.number);
  addSnapshotValue(lines, "Commitment", commitment.number);
  addSnapshotValue(lines, "Progress claim", claim.claimNumber);
  addSnapshotValue(lines, "Budget", related(snapshot.budget).name);
  const sourceChange = related(snapshot.sourceChangeEvent);
  addSnapshotValue(lines, "Source change", [text19(sourceChange.number), text19(sourceChange.title)].filter(Boolean).join(" \xB7 "));
  addSnapshotValue(lines, "Invoice reference", snapshot.invoiceNumber);
  addSnapshotValue(lines, "Certification", snapshot.certification);
  const claimLine = related(snapshot.progressClaimLineItem);
  addSnapshotValue(lines, "Claim line", claimLine.description);
  addSnapshotMoney(lines, "Recorded line retainage", claimLine.retainageMinor, currency);
  if (payment.id) {
    addSnapshotValue(lines, "Covering payment", payment.paymentNumber);
    addSnapshotValue(lines, "Payment direction", payment.direction);
    addSnapshotValue(lines, "Payment status", payment.status);
    addSnapshotValue(lines, "Payment reference", payment.reference);
    addSnapshotValue(lines, "Payment date", payment.paidAt);
    addSnapshotValue(lines, "Settlement date", payment.settledAt);
    addSnapshotValue(lines, "Payment counterparty", related(payment.tradePartner).name);
    addSnapshotMoney(lines, "Payment amount", payment.amountMinor, payment.currencyCode);
  }
  const items = Array.isArray(snapshot.lineItems) ? snapshot.lineItems : [];
  if (items.length > 500) throw new Error("Approval snapshot exceeds the supported line review limit");
  items.forEach((value, index) => {
    const item3 = related(value);
    lines.push(`Item ${index + 1}: ${text19(item3.description, "Description not captured")}`);
    const code = related(item3.budgetCode);
    addSnapshotValue(lines, "Cost code", [text19(code.code), text19(code.description)].filter(Boolean).join(" \xB7 "));
    addSnapshotValue(lines, "Source scope", related(item3.changeEventLineItem).description);
    const contractLine = related(item3.contractLineItem);
    addSnapshotValue(lines, "Contract line number", contractLine.lineNumber);
    addSnapshotValue(lines, "Contract line", contractLine.description);
    addSnapshotMoney(lines, "Contract line scheduled value", contractLine.scheduledValueMinor, currency);
    addSnapshotMoney(lines, "Contract line revised value", contractLine.revisedValueMinor, currency);
    addSnapshotRate(lines, "Contract line retainage", contractLine.retainageBps);
    for (const [key, label] of Object.entries({ amountMinor: "Amount", scheduledValueMinor: "Scheduled value", approvedChangesMinor: "Approved changes", revisedValueMinor: "Revised value", previousWorkMinor: "Previous work", currentWorkMinor: "Current work", storedMaterialsMinor: "Stored materials", completedStoredToDateMinor: "Completed and stored to date", retainageMinor: "Retainage", earnedLessRetainageMinor: "Earned less retainage", balanceToFinishMinor: "Balance to finish" })) addSnapshotMoney(lines, label, item3[key], currency);
    addSnapshotValue(lines, "Percent complete", item3.percentComplete);
    addSnapshotRate(lines, "Line retainage", item3.retainageBps);
  });
  return lines;
}

// features/keystone/queries/portal.ts
function requirePortalGrant(context, projectId2) {
  const session = context.session;
  if (!session?.itemId || session.data.isActive === false || session.authType === "api_key") throw new Error("A live participant session is required");
  const grant = session.data.projectMemberships?.find(
    (entry) => entry.status === "active" && entry.project?.id === projectId2 && entry.portalType !== "internal" && entry.portalOrganization?.id
  );
  const companyId = grant?.project?.company?.id;
  if (!grant?.portalOrganization?.id || !companyId) throw new Error("An active external project organization grant is required");
  return { session, companyId, organizationId: grant.portalOrganization.id, grant };
}
function text20(value, fallback = "") {
  return typeof value === "string" && value ? value : fallback;
}
function bounded2(value, max = 4e3) {
  return value.length <= max ? value : `${value.slice(0, max)}\u2026`;
}
function date(value) {
  return value instanceof Date ? value.toISOString() : typeof value === "string" && value ? new Date(value).toISOString() : null;
}
function related2(value) {
  return value && typeof value === "object" ? value : {};
}
function moneyLabel2(value, currency) {
  try {
    const minor = BigInt(String(value ?? 0));
    const absolute = minor < 0 ? -minor : minor;
    return `${text20(currency, "USD")} ${minor < 0 ? "-" : ""}${(absolute / BigInt(100)).toString()}.${(absolute % BigInt(100)).toString().padStart(2, "0")}`;
  } catch {
    return `${text20(currency, "USD")} \u2014`;
  }
}
async function constructionPortalInbox(_root, { projectId: projectId2 }, context) {
  const id = text20(projectId2);
  if (!id) throw new Error("Project id is required");
  const { session, companyId, organizationId, grant } = requirePortalGrant(context, id);
  const query = context.sudo().query;
  const canPreconstruction = hasProjectPermission(session, companyId, id, "canReadPreconstruction");
  const canExecute = hasProjectPermission(session, companyId, id, "canReadProjectExecution");
  const canBill = hasProjectPermission(session, companyId, id, "canReadBilling");
  const canReadDocuments = hasProjectPermission(session, companyId, id, "canReadDocuments");
  const [invitations, rfis, reviews, commitments, approvals, distributions, drawings] = await Promise.all([
    canPreconstruction ? query.BidInvitation.findMany({
      where: { project: { id: { equals: id } }, tradePartner: { id: { equals: organizationId } }, status: { in: ["draft", "invited"] } },
      take: 50,
      orderBy: { createdAt: "desc" },
      query: "id status bidPackage { number title description instructions dueAt status }"
    }) : Promise.resolve([]),
    canExecute ? query.RFI.findMany({
      where: { project: { id: { equals: id } }, status: { equals: "open" }, OR: [
        { ballInCourt: { id: { equals: session.itemId } } },
        { responsiblePartner: { id: { equals: organizationId } } }
      ] },
      take: 50,
      orderBy: { createdAt: "desc" },
      query: "id number subject question status dueAt responses(where: { isOfficial: { equals: true } }, take: 10, orderBy: { respondedAt: desc }) { response respondedAt author { name } }"
    }) : Promise.resolve([]),
    canExecute ? query.SubmittalReview.findMany({
      where: { project: { id: { equals: id } }, status: { in: ["pending", "in_review"] }, OR: [
        { reviewer: { id: { equals: session.itemId } } },
        { reviewerPartner: { id: { equals: organizationId } } }
      ] },
      take: 50,
      orderBy: { createdAt: "desc" },
      query: "id status dueAt response submittal { id number title revision description }"
    }) : Promise.resolve([]),
    canBill ? query.Commitment.findMany({
      where: { project: { id: { equals: id } }, tradePartner: { id: { equals: organizationId } }, status: { in: ["executed", "complete"] } },
      take: 50,
      orderBy: { createdAt: "desc" },
      query: "id number title status revisedContractMinor"
    }) : Promise.resolve([]),
    grant.portalType === "owner" ? query.ApprovalRequest.findMany({
      where: { company: { id: { equals: companyId } }, project: { id: { equals: id } }, status: { equals: "pending" }, assignedTo: { user: { id: { equals: session.itemId }, isActive: { equals: true } }, status: { equals: "active" }, portalType: { equals: "owner" }, portalOrganization: { id: { equals: organizationId } }, project: { id: { equals: id } } } },
      take: 50,
      orderBy: { requestedAt: "desc" },
      query: "id requestNumber targetType targetStatus amountMinor currencyCode status requestedAt canonicalSnapshot snapshotDigest assignedTo { id status accessLevel portalType portalOrganization { id } user { id isActive } role { id } project { id company { id } } }"
    }) : Promise.resolve([]),
    canReadDocuments ? query.DocumentDistribution.findMany({
      where: { project: { id: { equals: id } }, recipient: { user: { id: { equals: session.itemId } }, status: { equals: "active" } }, OR: [
        { expiresAt: { equals: null } },
        { expiresAt: { gt: /* @__PURE__ */ new Date() } }
      ] },
      take: 50,
      orderBy: { distributedAt: "desc" },
      query: "id purpose expiresAt documentVersion { id fileName versionNumber issuedAt document { documentNumber title } } acknowledgements(take: 20) { id acknowledgedBy { id } }"
    }) : Promise.resolve([]),
    canReadDocuments ? query.Drawing.findMany({
      where: { project: { id: { equals: id } }, NOT: [{ currentRevision: null }] },
      take: 100,
      orderBy: { drawingNumber: "asc" },
      query: "id drawingNumber title currentRevision { id revisionNumber status fileName issuedAt }"
    }) : Promise.resolve([])
  ]);
  const items = [];
  for (const row of invitations) {
    const bidPackage = related2(row.bidPackage);
    if (bidPackage.status !== "open") continue;
    items.push({ id: `bid:${row.id}`, targetId: text20(row.id), secondaryId: null, kind: "Bid invitation", reference: text20(bidPackage.number), title: text20(bidPackage.title, "Bid package"), status: text20(row.status), dueAt: date(bidPackage.dueAt), action: "submit_bid", context: [bounded2(text20(bidPackage.description)), bounded2(text20(bidPackage.instructions))].filter(Boolean) });
  }
  for (const row of rfis) {
    const responses = Array.isArray(row.responses) ? row.responses : [];
    const context2 = [text20(row.question) ? bounded2(`Question: ${text20(row.question)}`) : "", ...responses.map((response) => bounded2(`Official response${text20(related2(response.author).name) ? ` \xB7 ${text20(related2(response.author).name)}` : ""}: ${text20(response.response)}`))].filter(Boolean);
    items.push({ id: `rfi:${row.id}`, targetId: text20(row.id), secondaryId: null, kind: "RFI", reference: text20(row.number), title: text20(row.subject), status: text20(row.status), dueAt: date(row.dueAt), action: "respond_rfi", context: context2 });
  }
  for (const row of reviews) {
    const submittal = related2(row.submittal);
    if (!submittal.id) continue;
    items.push({ id: `review:${row.id}`, targetId: text20(submittal.id), secondaryId: text20(row.id), kind: "Submittal review", reference: text20(submittal.number), title: text20(submittal.title), status: text20(row.status), dueAt: date(row.dueAt), action: "review_submittal", context: [text20(submittal.description) ? bounded2(`Submission: ${text20(submittal.description)}`) : "", text20(row.response) ? bounded2(`Prior response: ${text20(row.response)}`) : "", `Revision ${String(submittal.revision ?? 0)}`].filter(Boolean) });
  }
  for (const row of commitments) {
    const base2 = { targetId: text20(row.id), secondaryId: null, reference: text20(row.number), title: text20(row.title), status: text20(row.status), dueAt: null };
    items.push({ ...base2, id: `claim:${row.id}`, kind: "Commitment billing", action: "submit_claim" });
    items.push({ ...base2, id: `waiver:${row.id}`, kind: "Lien waiver", action: "submit_waiver" });
  }
  let needsApprovalStaffReview = false;
  for (const row of approvals) {
    try {
      assertAssignedOwnerApprovalSnapshot(row, { userId: session.itemId, companyId, projectId: id, organizationId, portalType: grant.portalType, roleId: grant.role?.id, accessLevel: grant.accessLevel });
    } catch {
      needsApprovalStaffReview = true;
      continue;
    }
    items.push({ id: `approval:${row.id}`, targetId: text20(row.id), secondaryId: null, kind: "Approval", reference: text20(row.requestNumber), title: `${text20(row.targetType)} \u2192 ${text20(row.targetStatus)} \xB7 ${moneyLabel2(row.amountMinor, row.currencyCode)}`, status: text20(row.status), dueAt: null, action: "decide_approval" });
  }
  if (needsApprovalStaffReview) items.push({ id: "approval:staff-review", targetId: "", secondaryId: null, kind: "Approval", reference: "Prior approval assignment", title: "A prior approval request needs project staff review before it can be shared again.", status: "pending", dueAt: null, action: "contact_staff" });
  for (const row of distributions) {
    const version = related2(row.documentVersion);
    const document = related2(version.document);
    if (!version.id || !version.issuedAt) continue;
    const acknowledged = Array.isArray(row.acknowledgements) && row.acknowledgements.some((entry) => related2(related2(entry).acknowledgedBy).id === session.itemId);
    items.push({ id: `document:${row.id}`, targetId: text20(row.id), secondaryId: text20(version.id), downloadTargetId: text20(version.id), kind: "Distributed document", reference: text20(document.documentNumber), title: `${text20(document.title)} \xB7 v${String(version.versionNumber ?? "")}`, status: acknowledged ? "acknowledged" : "distributed", dueAt: date(row.expiresAt), action: acknowledged ? "download_document" : "ack_document" });
  }
  for (const row of drawings) {
    const revision = related2(row.currentRevision);
    if (!revision.id || revision.status !== "issued") continue;
    items.push({ id: `drawing:${revision.id}`, targetId: text20(revision.id), secondaryId: null, kind: "Current drawing", reference: text20(row.drawingNumber), title: `${text20(row.title)} \xB7 ${text20(revision.revisionNumber)}`, status: "current", dueAt: date(revision.issuedAt), action: "download_drawing" });
  }
  return items;
}
async function constructionPortalApprovalSnapshot(_root, { projectId: projectId2, requestId }, context) {
  const project = text20(projectId2);
  const request = text20(requestId);
  if (!project || project.length > 200 || !request || request.length > 200) throw new Error("A valid project and approval request are required");
  const { session, companyId, organizationId, grant } = requirePortalGrant(context, project);
  if (grant.portalType !== "owner") throw new Error("An assigned owner review is required");
  const [approval] = await context.sudo().query.ApprovalRequest.findMany({
    where: {
      company: { id: { equals: companyId } },
      project: { id: { equals: project } },
      id: { equals: request },
      status: { equals: "pending" },
      assignedTo: { user: { id: { equals: session.itemId }, isActive: { equals: true } }, status: { equals: "active" }, portalType: { equals: "owner" }, portalOrganization: { id: { equals: organizationId } }, project: { id: { equals: project } } }
    },
    take: 1,
    query: "id targetId targetType targetStatus amountMinor currencyCode canonicalSnapshot snapshotDigest assignedTo { id status accessLevel portalType portalOrganization { id } user { id isActive } role { id } project { id company { id } } }"
  });
  const assignedTo = related2(approval?.assignedTo);
  if (!approval?.id || assignedTo.status !== "active" || assignedTo.portalType === "internal") {
    throw new Error("Pending assigned portal approval was not found");
  }
  const rawSnapshot = text20(approval.canonicalSnapshot);
  assertAssignedOwnerApprovalSnapshot(approval, { userId: session.itemId, companyId, projectId: project, organizationId, portalType: grant.portalType, roleId: grant.role?.id, accessLevel: grant.accessLevel });
  return presentApprovalSnapshot(text20(approval.targetType), approval, rawSnapshot);
}

// features/keystone/domain/approval-snapshots.ts
var import_node_crypto4 = require("node:crypto");
var approvalTargets = {
  BudgetChange: {
    listKey: "BudgetChange",
    domain: "budget_change",
    permission: "canManageFinancials",
    amountField: "totalAmountMinor",
    table: "BudgetChange",
    child: { table: "BudgetChangeLineItem", parentColumn: "budgetChange" },
    query: "id number title reason status totalAmountMinor currencyCode budget { id name currencyCode } sourceChangeEvent { id number title } company { id name } project { id name projectNumber } lineItems(take: 501, orderBy: { id: asc }) { id description amountMinor budgetLineItem { id budget { id } } budgetCode { id code description } changeEventLineItem { id description } }"
  },
  PrimeContract: {
    listKey: "PrimeContract",
    domain: "prime_contract",
    permission: "canManageContracts",
    amountField: "revisedContractMinor",
    table: "PrimeContract",
    child: { table: "ContractLineItem", parentColumn: "primeContract" },
    query: "id number title description contractType status originalContractMinor approvedChangesMinor revisedContractMinor defaultRetainageBps startDate completionDate currencyCode client { id name } company { id name } project { id name projectNumber } lineItems(take: 501, orderBy: [{ lineNumber: asc }, { id: asc }]) { id lineNumber description scheduledValueMinor approvedChangesMinor revisedValueMinor retainageBps budgetCode { id code description } }"
  },
  ChangeOrder: {
    listKey: "ChangeOrder",
    domain: "change_order",
    permission: "canManageContracts",
    amountField: "totalMinor",
    table: "ChangeOrder",
    child: { table: "ChangeOrderLineItem", parentColumn: "changeOrder" },
    query: "id number title description direction status totalMinor scheduleImpactDays currencyCode primeContract { id number title currencyCode client { id name } } commitment { id number title currencyCode tradePartner { id name } } company { id name } project { id name projectNumber } lineItems(take: 501, orderBy: [{ lineNumber: asc }, { id: asc }]) { id lineNumber description amountMinor contractLineItem { id lineNumber description scheduledValueMinor revisedValueMinor retainageBps budgetCode { id code description } } changeEventLineItem { id description } budgetCode { id code description } }"
  },
  ProgressClaim: {
    listKey: "ProgressClaim",
    domain: "progress_claim",
    permission: "canManageBilling",
    amountField: "currentPaymentDueMinor",
    table: "ProgressClaim",
    child: { table: "ProgressClaimLineItem", parentColumn: "progressClaim" },
    query: "id claimNumber invoiceNumber claimType status periodStart periodEnd dueAt certification originalContractMinor approvedChangesMinor revisedContractMinor workCompletedToDateMinor storedMaterialsMinor retainageMinor earnedLessRetainageMinor previousPaymentsMinor currentPaymentDueMinor balanceToFinishMinor currencyCode primeContract { id number title client { id name } } commitment { id number title tradePartner { id name } } tradePartner { id name } company { id name } project { id name projectNumber } lineItems(take: 501, orderBy: [{ lineNumber: asc }, { id: asc }]) { id lineNumber description scheduledValueMinor previousWorkMinor currentWorkMinor storedMaterialsMinor completedStoredToDateMinor percentComplete retainageBps retainageMinor earnedLessRetainageMinor balanceToFinishMinor contractLineItem { id } }"
  },
  RetainageRelease: {
    listKey: "RetainageRelease",
    domain: "retainage_release",
    permission: "canManageBilling",
    amountField: "amountMinor",
    table: "RetainageRelease",
    query: "id releaseNumber status amountMinor currencyCode reason company { id name } project { id name projectNumber } progressClaim { id claimNumber claimType tradePartner { id name } } progressClaimLineItem { id lineNumber description retainageMinor } payment { id paymentNumber direction status amountMinor currencyCode reference paidAt settledAt tradePartner { id name } }"
  }
};
function object(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!object(value)) return value;
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, entry]) => [key, stable(entry)]));
}
function canonicalApprovalSnapshot(value) {
  return JSON.stringify(stable(value));
}
function digestApprovalSnapshot(value) {
  return (0, import_node_crypto4.createHash)("sha256").update(value).digest("hex");
}
var referenceTables = {
  company: { table: "Company", scope: "root-company" },
  project: { table: "Project", scope: "company" },
  client: { table: "TradePartner", scope: "company" },
  tradePartner: { table: "TradePartner", scope: "company" },
  budget: { table: "Budget", scope: "project" },
  budgetLineItem: { table: "BudgetLineItem", scope: "project" },
  budgetCode: { table: "BudgetCode", scope: "project" },
  sourceChangeEvent: { table: "ChangeEvent", scope: "project" },
  changeEventLineItem: { table: "ChangeEventLineItem", scope: "project" },
  primeContract: { table: "PrimeContract", scope: "project" },
  commitment: { table: "Commitment", scope: "project" },
  contractLineItem: { table: "ContractLineItem", scope: "project" },
  progressClaim: { table: "ProgressClaim", scope: "project" },
  progressClaimLineItem: { table: "ProgressClaimLineItem", scope: "project" },
  payment: { table: "Payment", scope: "project" }
};
var displayLabels = /* @__PURE__ */ new Set(["name", "title", "number", "code", "projectNumber", "claimNumber", "paymentNumber", "releaseNumber"]);
var auditMetadata = /* @__PURE__ */ new Set(["createdAt", "updatedAt", "createdBy", "updatedBy", "_approvalAssignment"]);
function commercialApprovalProjection(record) {
  const project = (value, parent) => {
    if (Array.isArray(value)) return value.map((item3) => project(item3, parent));
    if (!object(value)) return value;
    return Object.fromEntries(Object.entries(value).filter(([key]) => !auditMetadata.has(key) && !(Object.hasOwn(referenceTables, parent) && (displayLabels.has(key) || parent === "budgetCode" && key === "description"))).map(([key, child]) => [key, project(child, key)]));
  };
  return Object.fromEntries(Object.entries(record).filter(([key]) => !auditMetadata.has(key)).map(([key, value]) => [key, project(value, key)]));
}
function matchesApprovalSnapshot(loaded, raw, expectedDigest) {
  if (typeof raw !== "string" || typeof expectedDigest !== "string" || Buffer.byteLength(raw, "utf8") > 512e3 || digestApprovalSnapshot(raw) !== expectedDigest) return false;
  try {
    const snapshot = JSON.parse(raw);
    if (!object(snapshot) || snapshot.snapshotVersion !== 2 || snapshot.approvalTarget !== loaded.config.listKey) return false;
    return digestApprovalSnapshot(canonicalApprovalSnapshot(commercialApprovalProjection(snapshot))) === loaded.commercialDigest;
  } catch {
    return false;
  }
}
async function loadApprovalSnapshot(context, targetType, targetId) {
  const config3 = Object.hasOwn(approvalTargets, targetType) ? approvalTargets[targetType] : void 0;
  if (!config3) throw new Error("This resource does not support bounded approvals");
  const record = await queryById(context, config3.listKey, targetId, config3.query);
  const companyId = record?.company?.id;
  const projectId2 = record?.project?.id;
  if (!record?.id || !companyId || !projectId2) throw new Error(`${config3.listKey} not found`);
  if (Array.isArray(record.lineItems) && record.lineItems.length > 500) {
    throw new Error("Approval snapshot exceeds the 500-line review limit");
  }
  const versioned = { ...record, snapshotVersion: 2, approvalTarget: config3.listKey };
  const snapshot = canonicalApprovalSnapshot(versioned);
  if (Buffer.byteLength(snapshot, "utf8") > 512e3) throw new Error("Approval snapshot exceeds the supported review size");
  return { config: config3, record, companyId, projectId: projectId2, snapshot, snapshotDigest: digestApprovalSnapshot(snapshot), commercialDigest: digestApprovalSnapshot(canonicalApprovalSnapshot(commercialApprovalProjection(versioned))) };
}
async function loadApprovalPolicySnapshot(context, policyId) {
  const record = await queryById(
    context,
    "ApprovalPolicy",
    policyId,
    "id domain minimumAmountMinor currencyCode isActive approverRole { id } company { id } project { id }"
  );
  if (!record?.id) throw new Error("Approval policy is unavailable");
  const snapshot = canonicalApprovalSnapshot(record);
  return { record, snapshot, snapshotDigest: digestApprovalSnapshot(snapshot) };
}
async function lockApprovalPolicySnapshot(context, policyId) {
  if (!context.prisma?.$queryRawUnsafe) throw new Error("Transactional approval-policy locking is unavailable");
  const [policy] = await context.prisma.$queryRawUnsafe(
    `SELECT id FROM "ApprovalPolicy" WHERE id = $1 FOR UPDATE`,
    policyId
  );
  if (!policy) throw new Error("Approval policy is unavailable");
  return loadApprovalPolicySnapshot(context, policyId);
}
function references(value, parent = "", found = /* @__PURE__ */ new Map()) {
  if (Array.isArray(value)) {
    for (const item3 of value) references(item3, parent, found);
    return found;
  }
  if (!object(value)) return found;
  const reference = Object.hasOwn(referenceTables, parent) ? referenceTables[parent] : void 0;
  if (reference && typeof value.id === "string") {
    const group = found.get(reference.table) ?? { scope: reference.scope, ids: /* @__PURE__ */ new Set() };
    group.ids.add(value.id);
    found.set(reference.table, group);
  }
  for (const [key, child] of Object.entries(value)) references(child, key, found);
  return found;
}
function referenceKey(value) {
  return JSON.stringify([...references(value)].sort(([a], [b]) => a.localeCompare(b)).map(([table, group]) => [table, [...group.ids].sort()]));
}
async function lockApprovalSnapshot(context, targetType, targetId) {
  const config3 = Object.hasOwn(approvalTargets, targetType) ? approvalTargets[targetType] : void 0;
  const sql = context.prisma?.$queryRawUnsafe?.bind(context.prisma);
  if (!config3 || !sql) throw new Error("Transactional approval snapshot locking is unavailable");
  const [target] = await sql(
    `SELECT id FROM "${config3.table}" WHERE id = $1 FOR UPDATE`,
    targetId
  );
  if (!target) throw new Error(`${config3.listKey} not found`);
  if (config3.child) {
    const children = await sql(
      `SELECT id FROM "${config3.child.table}" WHERE "${config3.child.parentColumn}" = $1 ORDER BY id LIMIT 501 FOR UPDATE`,
      targetId
    );
    if (children.length > 500) throw new Error("Approval snapshot exceeds the 500-line review limit");
  }
  const before = await loadApprovalSnapshot(context, targetType, targetId);
  for (const [table, group] of [...references(before.record)].sort(([a], [b]) => a.localeCompare(b))) {
    const ids = [...group.ids].sort();
    const values = [...ids];
    const slots = ids.map((_, index) => "$" + (index + 1)).join(", ");
    values.push(before.companyId);
    const tenant = group.scope === "root-company" ? `id = $${values.length}` : `company = $${values.length}`;
    let project = "";
    if (group.scope === "project") {
      values.push(before.projectId);
      project = ` AND project = $${values.length}`;
    }
    const locked = await sql(`SELECT id FROM "${table}" WHERE id IN (${slots}) AND ${tenant}${project} ORDER BY id FOR SHARE`, ...values);
    if (locked.length !== ids.length) throw new Error("Approval dependency is unavailable in this tenant/project");
  }
  const current = await loadApprovalSnapshot(context, targetType, targetId);
  if (referenceKey(current.record) !== referenceKey(before.record)) throw new Error("Approval dependencies changed while being locked; reload for review");
  return current;
}

// features/keystone/domain/current-authority.ts
function hasNativeAuthorityPort(context) {
  return Boolean(context.prisma?.user && context.prisma.$queryRawUnsafe);
}
async function lockInitialOnboardingAuthority(context) {
  const actor2 = context.session;
  const sql = context.prisma?.$queryRawUnsafe?.bind(context.prisma);
  if (!actor2?.itemId || actor2.authType === "api_key" || !actor2.authSessionId || !sql) throw new Error("A live user session is required for first-company onboarding");
  await sql("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))::text AS held", "onboard:" + actor2.itemId);
  const rows3 = await sql(`SELECT u.id FROM "User" u JOIN "AuthSession" s ON s."user" = u.id
    WHERE u.id = $1 AND s.id = $2 AND u."isActive" = true AND s."revokedAt" IS NULL AND s."expiresAt" > CURRENT_TIMESTAMP
    FOR SHARE OF u, s`, actor2.itemId, actor2.authSessionId);
  if (rows3.length !== 1) throw new Error("A live user session is required for first-company onboarding");
  await sql('SELECT id FROM "Role" WHERE id = (SELECT role FROM "User" WHERE id = $1) FOR SHARE', actor2.itemId);
  const user = await context.sudo().query.User.findOne({ where: { id: actor2.itemId }, query: `id isActive role { id name ${permissionsList.join(" ")} }` });
  const fresh = { ...actor2, data: { ...actor2.data, role: user?.role, companyMemberships: [], projectMemberships: [] } };
  if (!user?.isActive || !hasPermission(fresh, "canManageOnboarding") || !hasPermission(fresh, "canManageCompanies")) throw new Error("Only the initial platform administrator can onboard a company");
}
async function lockCurrentAuthority(context, companyId, projectId2, permission, externalOrganizationId) {
  const original = context.session;
  const sql = context.prisma?.$queryRawUnsafe?.bind(context.prisma);
  if (!original?.itemId || !sql) throw new Error("Current transactional authority is unavailable");
  const actorId = original.itemId;
  if (projectId2) {
    const projects = await sql('SELECT id FROM "Project" WHERE id = $1 AND company = $2 FOR UPDATE', projectId2, companyId);
    if (projects.length !== 1) throw new Error("Project is not available in this company");
    await sql('SELECT id FROM "Company" WHERE id = $1 FOR SHARE', companyId);
  } else await sql('SELECT id FROM "Company" WHERE id = $1 FOR UPDATE', companyId);
  await sql('SELECT id FROM "User" WHERE id = $1 FOR SHARE', actorId);
  if (original.authType === "api_key") {
    await sql('SELECT id FROM "ApiCredential" WHERE id = $1 FOR SHARE', original.apiCredential?.id || "");
  } else {
    if (!original.authSessionId) throw new Error("A current stored human session is required");
    const sessions = await sql('SELECT id FROM "AuthSession" WHERE id = $1 AND "user" = $2 AND "revokedAt" IS NULL AND "expiresAt" > CURRENT_TIMESTAMP FOR SHARE', original.authSessionId, actorId);
    if (sessions.length !== 1) throw new Error("A current stored human session is required");
  }
  await sql('SELECT id FROM "CompanyMembership" WHERE company = $1 AND "user" = $2 ORDER BY id FOR SHARE', companyId, actorId);
  if (projectId2) await sql('SELECT id FROM "ProjectMembership" WHERE project = $1 AND "user" = $2 ORDER BY id FOR SHARE', projectId2, actorId);
  await sql(`SELECT r.id FROM "Role" r WHERE r.id IN (
    SELECT role FROM "User" WHERE id = $1 UNION SELECT role FROM "CompanyMembership" WHERE company = $2 AND "user" = $1
    UNION SELECT role FROM "ProjectMembership" WHERE project = $3 AND "user" = $1
  ) ORDER BY r.id FOR SHARE`, actorId, companyId, projectId2 || "");
  const query = context.sudo().query;
  const roleFields = `id name ${permissionsList.join(" ")}`;
  const [user, company, companyMemberships, projectMemberships] = await Promise.all([
    query.User.findOne({ where: { id: actorId }, query: `id isActive role { ${roleFields} }` }),
    query.Company.findOne({ where: { id: companyId }, query: "id status" }),
    query.CompanyMembership.findMany({ where: { user: { id: { equals: actorId } }, company: { id: { equals: companyId } }, status: { equals: "active" } }, take: 2, query: `id status canAccessAllProjects company { id } role { ${roleFields} }` }),
    projectId2 ? query.ProjectMembership.findMany({ where: { user: { id: { equals: actorId } }, project: { id: { equals: projectId2 } }, status: { equals: "active" } }, take: 2, query: `id status portalType accessLevel portalOrganization { id } project { id company { id } } role { ${roleFields} }` }) : []
  ]);
  if (!user || user.id !== actorId || user.isActive !== true || company?.status !== "active") throw new Error("Not authorized for this current company");
  let principal = original;
  if (original.authType === "api_key") {
    const record = await query.ApiCredential.findOne({ where: { id: original.apiCredential?.id || "" }, query: "id status scopes expiresAt revokedAt owner { id isActive } company { id } project { id company { id } }" });
    const active = activeApiSessionFromRecord(record);
    if (!active || active.itemId !== actorId) throw new Error("Credential is no longer authorized");
    principal = { ...original, ...active };
  }
  const fresh = { ...principal, data: { ...original.data, isActive: true, role: user.role, companyMemberships, projectMemberships } };
  const explicit = fresh.data.projectMemberships?.[0];
  const companyGrant = fresh.data.companyMemberships?.[0];
  if (typeof permission === "object" && "kind" in permission) {
    if (fresh.authType !== "session" || !projectId2 || !explicit || explicit.portalType !== "owner" || explicit.accessLevel === "viewer" || !explicit.portalOrganization?.id || explicit.portalOrganization.id !== externalOrganizationId) {
      throw new Error("Not authorized for this assigned owner approval");
    }
    const assignment = await sql(`SELECT request.id FROM "ApprovalRequest" request
      JOIN "ProjectMembership" membership ON membership.id = request."assignedTo"
      WHERE request.id = $1 AND request.company = $2 AND request.project = $3 AND request.status = 'pending'
        AND request."requestedBy" <> $4 AND membership."user" = $4 AND membership.project = $3
        AND membership.status = 'active' AND membership."portalType" = 'owner' AND membership."accessLevel" <> 'viewer'
        AND membership."portalOrganization" = $5 FOR UPDATE OF request`, permission.requestId, companyId, projectId2, actorId, externalOrganizationId);
    if (assignment.length !== 1) throw new Error("Not authorized for this assigned owner approval");
    return fresh;
  }
  const required3 = typeof permission === "string" ? [permission] : permission;
  if (!required3.length) throw new Error("An explicit operation permission is required");
  if (projectId2) {
    if (explicit) {
      if (explicit.accessLevel === "viewer" || explicit.portalType !== "internal" && (!externalOrganizationId || explicit.portalOrganization?.id !== externalOrganizationId)) throw new Error("Not authorized for this current project");
    } else if (!companyGrant?.canAccessAllProjects) throw new Error("Not authorized for this current project");
    if (!required3.every((capability) => hasProjectPermission(fresh, companyId, projectId2, capability, true))) throw new Error("Not authorized for this current project operation");
  } else if (!companyGrant || !required3.every((capability) => hasCompanyPermission(fresh, companyId, capability))) throw new Error("Not authorized for this current company operation");
  return fresh;
}

// features/keystone/queries/approvals.ts
async function constructionApprovalSnapshot(_root, { projectId: projectId2, requestId }, context) {
  const session = context.session;
  if (!session?.itemId || session.authType === "api_key" || session.data.isActive === false || !projectId2 || !requestId || projectId2.length > 200 || requestId.length > 200) throw new Error("Sign in and select an approval request");
  const request = await queryById(context, "ApprovalRequest", requestId, "id status targetId targetType targetStatus amountMinor currencyCode canonicalSnapshot snapshotDigest company { id } project { id }");
  const companyId = request?.company?.id;
  const type = request?.targetType;
  const config3 = typeof type === "string" && Object.hasOwn(approvalTargets, type) ? approvalTargets[type] : void 0;
  if (!request || request.status !== "pending" || !companyId || request.project?.id !== projectId2 || !config3 || !hasProjectPermission(session, companyId, projectId2, config3.permission, true) || !await canAccessProjectById(context, session.itemId, projectId2, true)) throw new Error("Pending approval review is unavailable for this project");
  if (!context.__approvalReviewTransaction) {
    if (!context.transaction) throw new Error("Transactional review context is required");
    return context.transaction(async (tx) => {
      const fresh = await lockCurrentAuthority(tx, companyId, projectId2, config3.permission);
      const scoped2 = tx.withSession ? tx.withSession(fresh) : tx;
      return constructionApprovalSnapshot(_root, { projectId: projectId2, requestId }, { ...scoped2, session: fresh, __approvalReviewTransaction: true });
    }, { timeout: 3e4 });
  }
  if (typeof type !== "string" || typeof request.canonicalSnapshot !== "string") throw new Error("Approval snapshot is unavailable");
  return presentApprovalSnapshot(type, request, request.canonicalSnapshot);
}

// features/keystone/mutations/construction.ts
var import_node_crypto5 = require("node:crypto");
var CommandRequestRejected = class extends Error {
  constructor() {
    super("Idempotency key was already used with a different request. This request is rejected; the original outcome is not closed. Preserve the original key/body for authorized review.");
    this.code = "COMMAND_REQUEST_REJECTED";
    this.name = "CommandRequestRejected";
  }
};
var CommandAdmissionClosed = class extends Error {
  constructor() {
    super("Original admission was explicitly closed. Retrieve the SAME owned closed receipt before reviewing NEW; this is not a business rollback.");
    this.code = "ORIGINAL_ADMISSION_CLOSED";
    this.name = "CommandAdmissionClosed";
  }
};
var CommandOutcomeUnknown = class extends Error {
  constructor() {
    super("Original command outcome is unknown or not currently observable. Retrieve/reconcile or retry the SAME key and body when authorized; do not create a replacement request.");
    this.code = "COMMAND_OUTCOME_UNKNOWN";
    this.name = "CommandOutcomeUnknown";
  }
};
function commandDigest(value) {
  return (0, import_node_crypto5.createHash)("sha256").update(value).digest("hex");
}
var digest = commandDigest;
var USD_ONLY_MONEY_LISTS = /* @__PURE__ */ new Set([
  "BudgetChange",
  "BudgetChangeLineItem",
  "BudgetLineItem",
  "Commitment",
  "ContractLineItem",
  "ChangeOrder",
  "ChangeOrderLineItem",
  "DirectCost",
  "Estimate",
  "EstimateLineItem",
  "Payment",
  "PaymentAllocation",
  "PrimeContract",
  "ProgressClaim",
  "ProgressClaimLineItem",
  "ProcurementRequest",
  "ProcurementRequestLine",
  "RetainageRelease",
  "LienWaiver",
  "BidSubmission"
]);
function canonicalJson(value) {
  return JSON.stringify(Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== void 0).sort(([left], [right]) => left.localeCompare(right))
  ));
}
function requireCommandSession(context) {
  if (!context.session?.itemId) throw new Error("Authentication required");
  return context.session;
}
var requireSession2 = requireCommandSession;
function requirePermission(session, permission) {
  if (!hasPermission(session, permission)) throw new Error("Not authorized for this construction operation");
}
function requiredText(value, label, max) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required`);
  const normalized = value.trim();
  if (normalized.length > max) throw new Error(`${label} must be at most ${max} characters`);
  return normalized;
}
function optionalDate(value, label) {
  if (!value) return void 0;
  const date3 = new Date(value);
  if (Number.isNaN(date3.getTime())) throw new Error(`${label} must be a valid date`);
  return date3;
}
function requireCreate(sudo, listKey) {
  const createOne = sudo.db[listKey]?.createOne;
  if (!createOne) throw new Error(`${listKey} create mutation is unavailable`);
  return createOne;
}
function requireUpdate(sudo, listKey) {
  const updateOne = sudo.db[listKey]?.updateOne;
  if (!updateOne) throw new Error(`${listKey} update mutation is unavailable`);
  return updateOne;
}
async function runTransaction(context, callback) {
  if (!context.transaction) throw new Error("Transactional construction context is required");
  return context.transaction(callback, { timeout: 3e4 });
}
async function findReplay(context, fingerprint, requestHash) {
  const existing = await queryOne(
    context,
    "IdempotencyKey",
    { fingerprint },
    "id requestHash status errorCode operation resourceId agentAction { id }"
  );
  if (!existing) return null;
  if (existing.requestHash !== requestHash) {
    throw new CommandRequestRejected();
  }
  if (existing.status === "failed" && existing.errorCode === "ORIGINAL_ADMISSION_CLOSED") throw new CommandAdmissionClosed();
  if (existing.status !== "completed" || !existing.resourceId || !existing.agentAction?.id) {
    throw new Error(`Idempotent request is ${String(existing.status)}`);
  }
  return {
    success: true,
    operation: String(existing.operation),
    itemId: String(existing.resourceId),
    actionId: existing.agentAction.id,
    replayed: true
  };
}
async function waitForConcurrentReplay(context, fingerprint, requestHash, beforeReplay) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 40 * (attempt + 1)));
    try {
      await beforeReplay?.(context);
      const replay2 = await findReplay(context, fingerprint, requestHash);
      if (replay2) {
        await beforeReplay?.(context);
        return replay2;
      }
    } catch (error) {
      if (!(error instanceof Error) || !/request is started/i.test(error.message)) throw error;
    }
  }
  return null;
}
async function executeProjectCommand(args) {
  const session = requireSession2(args.context);
  const actorId = session.itemId;
  const requiredPermissions = [.../* @__PURE__ */ new Set([args.permission, ...args.additionalPermissions ?? []])];
  const actorType = session.authType === "api_key" ? "agent" : "human";
  const correlationId = session.authType === "api_key" ? session.apiCredential?.id : void 0;
  if (args.createsProject) requirePermission(session, args.permission);
  const key = requiredText(args.idempotencyKey, "Idempotency key", 200);
  const externalWriter = args.allowExternalProjectWrite && session.data.projectMemberships?.some(
    (membership) => membership.status === "active" && membership.project?.id === args.projectId && membership.portalType !== "internal" && membership.accessLevel !== "viewer" && Boolean(args.externalOrganizationId) && membership.portalOrganization?.id === args.externalOrganizationId
  );
  if (!args.createsProject && !externalWriter && !await canAccessProjectById(args.context, session.itemId, args.projectId, true)) {
    throw new Error("Not authorized for this project");
  }
  const project = args.createsProject ? null : await queryById(args.context, "Project", args.projectId, "id currencyCode company { id }");
  const companyId = args.companyId ?? project?.company?.id;
  if (!companyId) throw new Error("Project not found");
  if (!args.createsProject && !hasProjectPermission(
    session,
    companyId,
    args.projectId,
    args.permission,
    true
  )) {
    throw new Error("Not authorized for this project operation");
  }
  const requestSnapshot = canonicalJson({ operation: args.operation, ...args.request });
  const requestHash = digest(requestSnapshot);
  const fingerprint = digest(`${companyId}${args.operation}${key}`);
  await args.beforeReplay?.(args.context);
  const replay2 = await findReplay(args.context, fingerprint, requestHash);
  if (replay2) {
    if (hasNativeAuthorityPort(args.context)) return runTransaction(args.context, async (tx) => {
      const fresh = await lockCurrentAuthority(tx, companyId, args.createsProject ? null : args.projectId, requiredPermissions, args.allowExternalProjectWrite ? args.externalOrganizationId : void 0);
      if (tx.withSession) tx = tx.withSession(fresh);
      await args.beforeReplay?.(tx);
      const currentReplay = await findReplay(tx, fingerprint, requestHash);
      if (!currentReplay) throw new Error("Original command receipt is no longer available");
      return currentReplay;
    });
    await args.beforeReplay?.(args.context);
    return replay2;
  }
  const assertNewCurrency = async (context) => {
    if (!args.createsProject && USD_ONLY_MONEY_LISTS.has(args.listKey)) {
      const currentProject = await queryById(context, "Project", args.projectId, "id currencyCode company { id }");
      if (currentProject?.company?.id !== companyId || currentProject?.currencyCode !== "USD") {
        throw new Error("Monetary operations are disabled for non-USD projects until currency propagation is complete");
      }
    }
  };
  await assertNewCurrency(args.context);
  await args.beforeAdmission?.(args.context);
  try {
    const result = await runTransaction(args.context, async (tx) => {
      if (hasNativeAuthorityPort(tx)) {
        const fresh = await lockCurrentAuthority(tx, companyId, args.createsProject ? null : args.projectId, requiredPermissions, args.allowExternalProjectWrite ? args.externalOrganizationId : void 0);
        if (tx.withSession) tx = tx.withSession(fresh);
      }
      const sudo = tx.sudo();
      if (tx.prisma?.$queryRawUnsafe) {
        await tx.prisma.$queryRawUnsafe(`SELECT 1::int AS locked FROM pg_advisory_xact_lock(hashtextextended($1, 0))`, fingerprint);
        await args.beforeReplay?.(tx);
        const lockedReplay = await findReplay(tx, fingerprint, requestHash);
        if (lockedReplay) {
          await args.beforeReplay?.(tx);
          return lockedReplay;
        }
      }
      await args.beforeReplay?.(tx);
      await assertNewCurrency(tx);
      const idempotencyData = {
        fingerprint,
        key,
        operation: args.operation,
        requestHash,
        status: "started",
        resourceType: args.listKey,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1e3)
      };
      const idempotency = tx.prisma?.idempotencyKey?.create ? await tx.prisma.idempotencyKey.create({ data: {
        ...idempotencyData,
        companyId,
        ...!args.createsProject ? { projectId: args.projectId } : {},
        createdByUserId: actorId,
        updatedByUserId: actorId
      } }) : await requireCreate(sudo, "IdempotencyKey")({ data: {
        ...idempotencyData,
        company: { connect: { id: companyId } },
        ...!args.createsProject ? { project: { connect: { id: args.projectId } } } : {}
      } });
      const action = await requireCreate(sudo, "AgentAction")({
        data: {
          actionKey: (0, import_node_crypto5.randomUUID)(),
          actorType,
          action: args.operation,
          status: "running",
          correlationId,
          targetType: args.listKey,
          targetId: args.updateId ?? "pending",
          targetStatus: args.updateId ? "updated" : "created",
          reason: `${args.updateId ? "Update" : "Create"} ${args.listKey} from the construction workspace`,
          requestDigest: requestHash,
          requestedAt: /* @__PURE__ */ new Date(),
          startedAt: /* @__PURE__ */ new Date(),
          company: { connect: { id: companyId } },
          ...!args.createsProject ? { project: { connect: { id: args.projectId } } } : {},
          requestedBy: { connect: { id: actorId } },
          actorUser: { connect: { id: actorId } },
          idempotencyKey: { connect: { id: idempotency.id } }
        }
      });
      const lockedData = args.beforeCreate ? await args.beforeCreate(tx) : void 0;
      const created = args.updateId ? await requireUpdate(sudo, args.listKey)({ where: { id: args.updateId }, data: lockedData ?? args.data }) : await requireCreate(sudo, args.listKey)({ data: lockedData ?? args.data });
      if (args.afterCreate) await args.afterCreate(tx, created);
      const eventType = `${args.listKey}.${args.updateId ? "updated" : "created"}`;
      const payload = canonicalJson({
        schemaVersion: 1,
        eventType,
        aggregateType: args.listKey,
        aggregateId: created.id,
        projectId: args.createsProject ? created.id : args.projectId,
        companyId,
        actorId,
        requestHash
      });
      await requireCreate(sudo, "OutboxMessage")({
        data: {
          messageKey: `${args.operation}:${created.id}:${key}`,
          eventType,
          aggregateType: args.listKey,
          aggregateId: created.id,
          canonicalPayload: payload,
          payloadDigest: digest(payload),
          status: "pending",
          company: { connect: { id: companyId } },
          project: { connect: { id: args.createsProject ? created.id : args.projectId } },
          agentAction: { connect: { id: action.id } }
        }
      });
      await requireUpdate(sudo, "AgentAction")({
        where: { id: action.id },
        data: {
          status: "succeeded",
          targetId: created.id,
          targetStatus: args.updateId ? "updated" : "created",
          ...args.createsProject ? { project: { connect: { id: created.id } } } : {},
          resultDigest: digest(`${args.listKey}${created.id}`),
          completedAt: /* @__PURE__ */ new Date()
        }
      });
      await requireUpdate(sudo, "IdempotencyKey")({
        where: { id: idempotency.id },
        data: {
          status: "completed",
          resourceId: created.id,
          toStatus: args.updateId ? "updated" : "created",
          ...args.createsProject ? { project: { connect: { id: created.id } } } : {},
          agentAction: { connect: { id: action.id } }
        }
      });
      return { success: true, operation: args.operation, itemId: created.id, actionId: action.id, replayed: false };
    });
    await args.beforeReplay?.(args.context);
    return result;
  } catch {
    let recovered = null;
    let rejection = null;
    try {
      await args.beforeReplay?.(args.context);
      recovered = await waitForConcurrentReplay(args.context, fingerprint, requestHash, args.beforeReplay);
      if (recovered && hasNativeAuthorityPort(args.context)) {
        recovered = null;
        recovered = await runTransaction(args.context, async (tx) => {
          const fresh = await lockCurrentAuthority(tx, companyId, args.createsProject ? null : args.projectId, requiredPermissions, args.allowExternalProjectWrite ? args.externalOrganizationId : void 0);
          if (tx.withSession) tx = tx.withSession(fresh);
          await args.beforeReplay?.(tx);
          return findReplay(tx, fingerprint, requestHash);
        });
      }
    } catch (recoveryError) {
      if (recoveryError instanceof CommandRequestRejected || recoveryError instanceof CommandAdmissionClosed) rejection = recoveryError;
    }
    if (recovered) return recovered;
    const outcome = rejection ?? new CommandOutcomeUnknown();
    await args.context.sudo().db.AgentAction?.createOne?.({
      data: {
        actionKey: (0, import_node_crypto5.randomUUID)(),
        actorType,
        action: "observeConstructionCommandOutcome",
        status: rejection ? "rejected" : "failed",
        // acknowledgement observation, not a failed business fact
        correlationId,
        targetType: args.listKey,
        targetId: args.updateId ?? "unresolved",
        targetStatus: rejection instanceof CommandAdmissionClosed ? "closed_before_admission" : rejection ? "request_rejected_original_unresolved" : "unknown",
        reason: `${args.operation} acknowledgement/recovery unavailable; original ${args.listKey} outcome unresolved, not rollback; reconcile the original intent`,
        requestDigest: requestHash,
        errorCode: outcome.code,
        errorMessage: outcome.message,
        requestedAt: /* @__PURE__ */ new Date(),
        startedAt: /* @__PURE__ */ new Date(),
        completedAt: /* @__PURE__ */ new Date(),
        company: { connect: { id: companyId } },
        ...!args.createsProject ? { project: { connect: { id: args.projectId } } } : {},
        requestedBy: { connect: { id: actorId } },
        actorUser: { connect: { id: actorId } }
      }
    }).catch(() => void 0);
    throw outcome;
  }
}
async function rollUpPostedDirectCost(input, context, created) {
  const amount3 = BigInt(requiredText(input.amountMinor, "Amount", 30));
  const budgetCodeId = requiredText(input.relatedId, "Budget code id", 200);
  if (!context.prisma?.$queryRawUnsafe) throw new Error("Transactional aggregate client is unavailable");
  const [line] = await context.prisma.$queryRawUnsafe(
    `SELECT line.id, line.budget AS "budgetId", budget."currencyCode" AS "currencyCode"
     FROM "BudgetLineItem" line
     JOIN "Budget" budget ON budget.id = line.budget
     WHERE line.project = $1 AND line."budgetCode" = $2 AND budget.status = 'active'
     ORDER BY line."createdAt" ASC
     LIMIT 1
     FOR UPDATE OF line, budget`,
    input.projectId,
    budgetCodeId
  );
  if (!line?.budgetId) throw new Error("An active budget line is required for this budget code");
  if (!context.prisma.directCost?.update) throw new Error("Transactional direct cost currency update is unavailable");
  await context.prisma.directCost.update({
    where: { id: created.id },
    data: { currencyCode: line.currencyCode || "USD" }
  });
  await context.prisma.budgetLineItem.update({
    where: { id: line.id },
    data: {
      actualCostMinor: { increment: amount3 },
      projectedFinalCostMinor: { increment: amount3 },
      projectedOverUnderMinor: { decrement: amount3 }
    }
  });
  await context.prisma.budget.update({
    where: { id: line.budgetId },
    data: { totalActualMinor: { increment: amount3 } }
  });
}
function commandResolver(config3) {
  return async (_root, { input }, context) => {
    const session = requireSession2(context);
    const reference = requiredText(input.reference, "Reference", 100);
    const title = requiredText(input.title, "Title", 500);
    const description = typeof input.description === "string" ? input.description.trim() : "";
    return executeProjectCommand({
      context,
      operation: config3.operation,
      permission: config3.permission,
      projectId: requiredText(input.projectId, "Project id", 200),
      idempotencyKey: input.idempotencyKey,
      request: { ...input, reference, title, description },
      listKey: config3.listKey,
      data: config3.build({ ...input, reference, title, description }, session),
      afterCreate: config3.afterCreate ? (tx, created) => config3.afterCreate({ ...input, reference, title, description }, tx, created) : void 0
    });
  };
}
var startBidPackage = commandResolver({
  operation: "startBidPackage",
  permission: "canManagePreconstruction",
  listKey: "BidPackage",
  build: (input, session) => ({
    number: input.reference,
    title: input.title,
    description: input.description,
    dueAt: optionalDate(input.dueAt, "Due date"),
    bidManager: { connect: { id: session.itemId } },
    project: { connect: { id: input.projectId } }
  })
});
var openChangeEvent = commandResolver({
  operation: "openChangeEvent",
  permission: "canManageContracts",
  listKey: "ChangeEvent",
  build: (input, session) => ({
    number: input.reference,
    title: input.title,
    description: input.description,
    dueAt: optionalDate(input.dueAt, "Due date"),
    owner: { connect: { id: session.itemId } },
    project: { connect: { id: input.projectId } }
  })
});
var raiseRfi = commandResolver({
  operation: "raiseRfi",
  permission: "canManageProjectExecution",
  listKey: "RFI",
  build: (input, session) => ({
    number: input.reference,
    subject: input.title,
    question: requiredText(input.description, "Question", 1e4),
    dueAt: optionalDate(input.dueAt, "Due date"),
    raisedBy: { connect: { id: session.itemId } },
    ballInCourt: { connect: { id: session.itemId } },
    project: { connect: { id: input.projectId } }
  })
});
var registerSubmittal = commandResolver({
  operation: "registerSubmittal",
  permission: "canManageProjectExecution",
  listKey: "Submittal",
  build: (input, session) => ({
    number: input.reference,
    title: input.title,
    description: input.description,
    dueAt: optionalDate(input.dueAt, "Due date"),
    submitter: { connect: { id: session.itemId } },
    submittalManager: { connect: { id: session.itemId } },
    ballInCourt: { connect: { id: session.itemId } },
    project: { connect: { id: input.projectId } }
  })
});
var startDailyLog = commandResolver({
  operation: "startDailyLog",
  permission: "canManageFieldOperations",
  listKey: "DailyLog",
  build: (input, session) => ({
    logDate: optionalDate(input.reference, "Log date"),
    weatherSummary: input.title,
    generalNotes: input.description,
    preparedBy: { connect: { id: session.itemId } },
    project: { connect: { id: input.projectId } }
  })
});
var recordSafetyObservation = commandResolver({
  operation: "recordSafetyObservation",
  permission: "canManageSafety",
  listKey: "SafetyObservation",
  build: (input, session) => ({
    observationNumber: input.reference,
    title: input.title,
    description: requiredText(input.description, "Description", 1e4),
    dueAt: optionalDate(input.dueAt, "Due date"),
    observedBy: { connect: { id: session.itemId } },
    assignedTo: { connect: { id: session.itemId } },
    project: { connect: { id: input.projectId } }
  })
});
var recordPunchItem = commandResolver({
  operation: "recordPunchItem",
  permission: "canManageFieldOperations",
  listKey: "PunchItem",
  build: (input, session) => ({
    number: input.reference,
    title: input.title,
    description: requiredText(input.description, "Description", 1e4),
    dueAt: optionalDate(input.dueAt, "Due date"),
    createdBy: { connect: { id: session.itemId } },
    assignedTo: { connect: { id: session.itemId } },
    project: { connect: { id: input.projectId } }
  })
});
var registerDocument = commandResolver({
  operation: "registerDocument",
  permission: "canManageDocuments",
  listKey: "Document",
  build: (input) => ({
    documentNumber: input.reference,
    title: input.title,
    description: input.description,
    project: { connect: { id: input.projectId } }
  })
});
var recordDirectCost = commandResolver({
  operation: "recordDirectCost",
  permission: "canManageFinancials",
  listKey: "DirectCost",
  afterCreate: rollUpPostedDirectCost,
  build: (input, session) => {
    const amount3 = requiredText(input.amountMinor, "Amount", 30);
    if (!/^-?\d+$/.test(amount3) || BigInt(amount3) < BigInt(0)) throw new Error("Amount must be a non-negative integer in minor units");
    const budgetCodeId = requiredText(input.relatedId, "Budget code id", 200);
    return {
      referenceNumber: input.reference,
      description: input.title,
      amountMinor: amount3,
      status: "posted",
      costDate: optionalDate(input.dueAt, "Cost date") ?? /* @__PURE__ */ new Date(),
      budgetCode: { connect: { id: budgetCodeId } },
      approvedBy: { connect: { id: session.itemId } },
      project: { connect: { id: input.projectId } }
    };
  }
});
async function awardBidSubmission(_root, { input }, context) {
  const submissionId = requiredText(input.relatedId, "Bid submission id", 200);
  const submission = await queryById(
    context,
    "BidSubmission",
    submissionId,
    "id submissionNumber status totalMinor currencyCode tradePartner { id } bidPackage { id number title status } project { id company { id } }"
  );
  const projectId2 = submission?.project?.id;
  const packageRecord = submission?.bidPackage;
  const tradePartner = submission?.tradePartner;
  if (!projectId2 || !packageRecord?.id || !tradePartner?.id) throw new Error("Bid submission is incomplete");
  const projectCompanyId = submission.project?.company?.id;
  if (!projectCompanyId || !hasProjectPermission(requireSession2(context), projectCompanyId, projectId2, "canManageContracts", true)) {
    throw new Error("Awarding a bid also requires contract management permission");
  }
  requiredText(submission.totalMinor, "Bid total", 30);
  const retainageBps = input.retainageBps ?? 0;
  if (!Number.isInteger(retainageBps) || retainageBps < 0 || retainageBps > 1e4) throw new Error("Retainage must be between 0 and 10000 basis points");
  let awardedPackageId = String(packageRecord.id);
  let awardedLines = [];
  return executeProjectCommand({
    context,
    operation: "awardBidSubmission",
    permission: "canManagePreconstruction",
    projectId: projectId2,
    idempotencyKey: input.idempotencyKey,
    request: { ...input, submissionId },
    listKey: "Commitment",
    beforeReplay: async (current) => {
      if (!hasProjectPermission(requireSession2(current), projectCompanyId, projectId2, "canManageContracts", true)) throw new Error("Awarding a bid also requires current contract management permission");
    },
    beforeCreate: async (transaction) => {
      const prisma = transaction.prisma;
      if (!prisma?.$queryRawUnsafe) throw new Error("Transactional bid award lock is unavailable");
      const [locked] = await prisma.$queryRawUnsafe(
        `SELECT submission.status::text AS status,
                submission."totalMinor" AS "totalMinor",
                submission."currencyCode" AS "currencyCode",
                submission."tradePartner" AS "partnerId",
                submission."bidPackage" AS "packageId",
                package.status::text AS "packageStatus",
                package.title AS "packageTitle"
         FROM "BidSubmission" submission
         JOIN "BidPackage" package ON package.id = submission."bidPackage"
         WHERE submission.id = $1
         FOR UPDATE OF submission, package`,
        submissionId
      );
      if (!locked || !["submitted", "under_review"].includes(locked.status)) {
        throw new Error("Bid submission was already awarded or is no longer eligible");
      }
      if (locked.packageStatus !== "closed" || !locked.packageId || !locked.partnerId) {
        throw new Error("Bid package was already awarded or the submission is incomplete");
      }
      const lockedAmount = requiredText(String(locked.totalMinor), "Bid total", 30);
      awardedLines = await prisma.$queryRawUnsafe(
        `SELECT "lineNumber", description, "amountMinor", "budgetCode" AS "budgetCodeId"
         FROM "BidLineItem" WHERE submission = $1 ORDER BY "lineNumber" ASC FOR UPDATE`,
        submissionId
      );
      if (awardedLines.length === 0 || awardedLines.some((line) => !line.budgetCodeId) || awardedLines.reduce((sum2, line) => sum2 + line.amountMinor, BigInt(0)) !== locked.totalMinor) {
        throw new Error("Bid award requires budget-coded lines matching the submitted total");
      }
      awardedPackageId = locked.packageId;
      return {
        number: requiredText(input.reference, "Commitment number", 80),
        title: requiredText(input.title || locked.packageTitle, "Commitment title", 240),
        description: input.description?.trim(),
        commitmentType: "subcontract",
        originalContractMinor: lockedAmount,
        revisedContractMinor: lockedAmount,
        currencyCode: locked.currencyCode || "USD",
        tradePartner: { connect: { id: locked.partnerId } },
        contractManager: { connect: { id: requireSession2(context).itemId } },
        project: { connect: { id: projectId2 } }
      };
    },
    data: {},
    afterCreate: async (transaction, commitment) => {
      const sudo = transaction.sudo();
      const prisma = transaction.prisma;
      if (!prisma?.$queryRawUnsafe || !prisma.budgetLineItem?.update || !prisma.budget?.update) throw new Error("Transactional bid budget rollup is unavailable");
      for (const line of awardedLines) {
        await requireCreate(sudo, "ContractLineItem")({ data: {
          lineNumber: line.lineNumber,
          description: line.description,
          scheduledValueMinor: line.amountMinor.toString(),
          revisedValueMinor: line.amountMinor.toString(),
          retainageBps,
          commitment: { connect: { id: commitment.id } },
          budgetCode: { connect: { id: line.budgetCodeId } },
          project: { connect: { id: projectId2 } }
        } });
        const [budgetLine] = await prisma.$queryRawUnsafe(
          `SELECT line.id, line.budget AS "budgetId" FROM "BudgetLineItem" line
           JOIN "Budget" budget ON budget.id = line.budget
           WHERE line.project = $1 AND line."budgetCode" = $2 AND budget.status = 'active'
           ORDER BY line."createdAt" ASC LIMIT 1 FOR UPDATE OF line, budget`,
          projectId2,
          line.budgetCodeId
        );
        if (!budgetLine) throw new Error("Bid award requires a matching active budget line");
        await prisma.budgetLineItem.update({ where: { id: budgetLine.id }, data: {
          committedAmountMinor: { increment: line.amountMinor },
          projectedFinalCostMinor: { increment: line.amountMinor },
          projectedOverUnderMinor: { decrement: line.amountMinor }
        } });
        await prisma.budget.update({ where: { id: budgetLine.budgetId }, data: { totalCommittedMinor: { increment: line.amountMinor } } });
      }
      await requireUpdate(sudo, "BidSubmission")({
        where: { id: submissionId },
        data: { status: "accepted", reviewedAt: /* @__PURE__ */ new Date(), reviewedBy: { connect: { id: requireSession2(context).itemId } } }
      });
      await requireUpdate(sudo, "BidPackage")({
        where: { id: awardedPackageId },
        data: { status: "awarded" }
      });
    }
  });
}
async function prepareProgressClaim(_root, { input }, context) {
  const amount3 = requiredText(input.amountMinor, "Current work", 30);
  if (!/^\d+$/.test(amount3) || BigInt(amount3) === BigInt(0)) throw new Error("Current work must be a positive amount in minor units");
  const contractId = requiredText(input.relatedId, "Contract id", 200);
  const requestedLineId = input.secondaryId?.trim() || null;
  const contractQuery = "id status originalContractMinor revisedContractMinor currencyCode project { id company { id } }";
  const commitment = await queryById(context, "Commitment", contractId, `${contractQuery} tradePartner { id }`);
  const primeContract = commitment ? null : await queryById(context, "PrimeContract", contractId, `${contractQuery} client { id }`);
  const side = commitment ? "commitment" : "owner";
  const contract = commitment ?? primeContract;
  const table = side === "commitment" ? "Commitment" : "PrimeContract";
  const lineColumn = side === "commitment" ? "commitment" : '"primeContract"';
  const partnerColumn = side === "commitment" ? '"tradePartner"' : "client";
  const billableStatuses = side === "commitment" ? ["executed", "complete"] : ["executed"];
  const projectId2 = contract?.project?.id;
  const counterparty = side === "commitment" ? contract?.tradePartner : contract?.client;
  if (!contract || !projectId2 || projectId2 !== input.projectId || !counterparty?.id) throw new Error("Contract is not valid for this project");
  const claimSession = requireSession2(context);
  const externalSubmitter = side === "commitment" && (claimSession.data.projectMemberships?.some(
    (membership) => membership.status === "active" && membership.project?.id === projectId2 && membership.portalType !== "internal" && membership.accessLevel !== "viewer" && membership.portalOrganization?.id === String(counterparty.id)
  ) ?? false);
  const hasExternalGrant = claimSession.data.projectMemberships?.some(
    (membership) => membership.status === "active" && membership.project?.id === projectId2 && membership.portalType !== "internal"
  ) ?? false;
  if (hasExternalGrant && !externalSubmitter) throw new Error("Contract is not assigned to this portal organization");
  if (!billableStatuses.includes(String(contract.status))) throw new Error("Only executed contracts can be billed");
  const periodEnd = optionalDate(input.dueAt, "Period end") ?? /* @__PURE__ */ new Date();
  const periodStart = new Date(Date.UTC(periodEnd.getUTCFullYear(), periodEnd.getUTCMonth(), 1));
  let lockedLine = null;
  let previousWorkMinor = BigInt(0);
  return executeProjectCommand({
    context,
    operation: "prepareProgressClaim",
    permission: "canManageBilling",
    projectId: projectId2,
    idempotencyKey: input.idempotencyKey,
    request: side === "commitment" ? { ...input, commitmentId: contractId } : { ...input, primeContractId: contractId },
    listKey: "ProgressClaim",
    allowExternalProjectWrite: externalSubmitter,
    externalOrganizationId: externalSubmitter ? String(counterparty.id) : void 0,
    beforeCreate: async (transaction) => {
      const prisma = transaction.prisma;
      if (!prisma?.$queryRawUnsafe) throw new Error("Transactional claim capacity lock is unavailable");
      const [lockedContract] = await prisma.$queryRawUnsafe(
        `SELECT "originalContractMinor", "approvedChangesMinor", "revisedContractMinor", "currencyCode", ${partnerColumn} AS "partnerId", project AS "projectId", company AS "companyId", status::text FROM "${table}" WHERE id = $1 FOR UPDATE`,
        contractId
      );
      if (!lockedContract || !billableStatuses.includes(lockedContract.status) || lockedContract.projectId !== projectId2 || lockedContract.companyId !== contract.project?.company?.id || lockedContract.partnerId !== String(counterparty.id)) {
        throw new Error("Contract is no longer billable for this project and counterparty; reload for review");
      }
      if (lockedContract.currencyCode !== "USD") throw new Error("Claim currency is not supported by this USD workflow");
      const lines = await prisma.$queryRawUnsafe(
        `SELECT id, "lineNumber", description, "scheduledValueMinor", "revisedValueMinor", "retainageBps"
         FROM "ContractLineItem" WHERE ${lineColumn} = $1 ORDER BY "lineNumber" ASC, id ASC FOR UPDATE`,
        contractId
      );
      if (lines.length === 0) throw new Error("The contract requires a schedule-of-values line before billing");
      const previousByLine = /* @__PURE__ */ new Map();
      const previousRows = await prisma.$queryRawUnsafe(
        `SELECT item."contractLineItem" AS "lineId", COALESCE(SUM(item."currentWorkMinor" + item."storedMaterialsMinor"), 0)::bigint AS "previousWorkMinor"
         FROM "ProgressClaimLineItem" item
         JOIN "ProgressClaim" claim ON claim.id = item."progressClaim"
         WHERE item."contractLineItem" = ANY($1::text[]) AND claim.status <> 'voided'
         GROUP BY item."contractLineItem"`,
        lines.map((line2) => line2.id)
      );
      for (const row of previousRows) previousByLine.set(row.lineId, BigInt(row.previousWorkMinor ?? 0));
      const remaining = (line2) => (line2.revisedValueMinor || line2.scheduledValueMinor) - (previousByLine.get(line2.id) ?? BigInt(0));
      const line = requestedLineId ? lines.find((entry) => entry.id === requestedLineId) : lines.find((entry) => remaining(entry) >= BigInt(amount3));
      if (requestedLineId && !line) throw new Error("The selected schedule-of-values line does not belong to this contract");
      if (!line || remaining(line) < BigInt(amount3)) throw new Error("Claimed work cannot exceed the remaining value of the schedule-of-values line");
      lockedLine = line;
      previousWorkMinor = previousByLine.get(line.id) ?? BigInt(0);
      const [claimTotal] = await prisma.$queryRawUnsafe(
        `SELECT COALESCE(SUM("currentPaymentDueMinor" + "retainageMinor"), 0)::bigint AS "claimedMinor"
         FROM "ProgressClaim" WHERE ${lineColumn} = $1 AND status <> 'voided'`,
        contractId
      );
      const claimedMinor = claimTotal?.claimedMinor ?? BigInt(0);
      if (claimedMinor + BigInt(amount3) > lockedContract.revisedContractMinor) {
        throw new Error("Progress claims cannot exceed the contract revised value");
      }
      const current = BigInt(amount3);
      const scheduled = line.revisedValueMinor || line.scheduledValueMinor;
      const retainage = current * BigInt(line.retainageBps ?? 0) / BigInt(1e4);
      const earned = current - retainage;
      const balance = scheduled - previousWorkMinor - current;
      return {
        claimNumber: requiredText(input.reference, "Claim number", 100),
        invoiceNumber: requiredText(input.title, "Invoice number", 100),
        claimType: side,
        periodStart,
        periodEnd,
        dueAt: periodEnd,
        originalContractMinor: lockedContract.originalContractMinor.toString(),
        approvedChangesMinor: lockedContract.approvedChangesMinor.toString(),
        revisedContractMinor: lockedContract.revisedContractMinor.toString(),
        workCompletedToDateMinor: (previousWorkMinor + current).toString(),
        retainageMinor: retainage.toString(),
        earnedLessRetainageMinor: earned.toString(),
        currentPaymentDueMinor: earned.toString(),
        balanceToFinishMinor: (balance < BigInt(0) ? BigInt(0) : balance).toString(),
        currencyCode: lockedContract.currencyCode,
        submittedBy: { connect: { id: requireSession2(transaction).itemId } },
        tradePartner: { connect: { id: lockedContract.partnerId } },
        ...side === "commitment" ? { commitment: { connect: { id: contractId } } } : { primeContract: { connect: { id: contractId } } },
        project: { connect: { id: projectId2 } }
      };
    },
    data: {},
    afterCreate: async (transaction, claim) => {
      if (!lockedLine) throw new Error("The locked schedule-of-values line is unavailable");
      const scheduled = lockedLine.revisedValueMinor || lockedLine.scheduledValueMinor;
      const current = BigInt(amount3);
      const retainage = current * BigInt(lockedLine.retainageBps ?? 0) / BigInt(1e4);
      const earned = current - retainage;
      const balance = scheduled - previousWorkMinor - current;
      await requireCreate(transaction.sudo(), "ProgressClaimLineItem")({ data: {
        lineNumber: lockedLine.lineNumber,
        description: lockedLine.description,
        scheduledValueMinor: scheduled.toString(),
        previousWorkMinor: previousWorkMinor.toString(),
        currentWorkMinor: current.toString(),
        storedMaterialsMinor: "0",
        completedStoredToDateMinor: (previousWorkMinor + current).toString(),
        percentComplete: scheduled > BigInt(0) ? Number((previousWorkMinor + current) * BigInt(100) / scheduled) : 0,
        retainageBps: lockedLine.retainageBps ?? 0,
        retainageMinor: retainage.toString(),
        earnedLessRetainageMinor: earned.toString(),
        balanceToFinishMinor: (balance < BigInt(0) ? BigInt(0) : balance).toString(),
        progressClaim: { connect: { id: claim.id } },
        contractLineItem: { connect: { id: lockedLine.id } },
        project: { connect: { id: projectId2 } }
      } });
    }
  });
}
async function recordProgressPayment(_root, { input }, context) {
  const claimId = requiredText(input.relatedId, "Progress claim id", 200);
  const claim = await queryById(
    context,
    "ProgressClaim",
    claimId,
    "id status claimType currentPaymentDueMinor currencyCode tradePartner { id } project { id company { id } }"
  );
  const projectId2 = claim?.project?.id;
  if (!projectId2 || !["approved", "partially_paid"].includes(String(claim.status))) {
    throw new Error("Only an approved claim can receive a payment");
  }
  const amount3 = requiredText(input.amountMinor, "Payment amount", 30);
  if (!/^\d+$/.test(amount3) || BigInt(amount3) === BigInt(0)) throw new Error("Payment amount must be positive minor units");
  if (BigInt(amount3) > BigInt(String(claim.currentPaymentDueMinor ?? "0"))) {
    throw new Error("Payment cannot exceed the claim payment due");
  }
  const claimTradePartner = claim.tradePartner;
  const externalReference = requiredText(input.title, "External payment reference", 200);
  const effectiveAt = optionalDate(input.dueAt, "External payment effective date");
  if (!effectiveAt) throw new Error("External payment effective date is required");
  return executeProjectCommand({
    context,
    operation: "recordProgressPayment",
    permission: "canManageBilling",
    projectId: projectId2,
    idempotencyKey: input.idempotencyKey,
    request: { ...input, claimId },
    listKey: "Payment",
    data: {
      paymentNumber: requiredText(input.reference, "Payment number", 100),
      // Owner claims are settled by money received; commitment claims by money paid out.
      direction: claim.claimType === "owner" ? "receipt" : "disbursement",
      amountMinor: amount3,
      currencyCode: claim.currencyCode || "USD",
      reference: externalReference,
      paidAt: effectiveAt,
      paymentMethod: "other",
      tradePartner: claimTradePartner?.id ? { connect: { id: String(claimTradePartner.id) } } : void 0,
      recordedBy: { connect: { id: requireSession2(context).itemId } },
      project: { connect: { id: projectId2 } }
    }
  });
}
async function createConstructionProject(_root, { input }, context) {
  const session = requireSession2(context);
  requirePermission(session, "canManageProjects");
  const companyId = requiredText(input.companyId, "Company id", 200);
  if (!await canAccessCompanyById(context, session.itemId, companyId, true) || !hasCompanyPermission(session, companyId, "canManageProjects")) {
    throw new Error("Not authorized for this company");
  }
  if (!hasCompanyPermission(session, companyId, "canManageFinancials")) {
    throw new Error("Financial-management permission is required to initialize a project budget");
  }
  const projectNumber = requiredText(input.projectNumber, "Project number", 80);
  const name = requiredText(input.name, "Project name", 240);
  const currencyCode = String(input.currencyCode ?? "USD").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currencyCode)) throw new Error("Currency code must be a three-letter ISO code");
  if (currencyCode !== "USD") throw new Error("Only USD is currently supported for new projects until end-to-end currency propagation is complete");
  return executeProjectCommand({
    context,
    operation: "createConstructionProject",
    permission: "canManageProjects",
    additionalPermissions: ["canManageFinancials"],
    projectId: companyId,
    idempotencyKey: input.idempotencyKey,
    request: { ...input, projectNumber, name, currencyCode },
    listKey: "Project",
    companyId,
    createsProject: true,
    data: {
      projectNumber,
      name,
      description: input.description?.trim(),
      startDate: optionalDate(input.startDate, "Start date"),
      currencyCode,
      company: { connect: { id: companyId } }
    },
    afterCreate: async (transaction, project) => {
      const sudo = transaction.sudo();
      const companyMemberships = await sudo.query.CompanyMembership.findMany({
        where: { company: { id: { equals: companyId } }, user: { id: { equals: session.itemId } }, status: { equals: "active" } },
        take: 2,
        query: "id role { id }"
      });
      if (companyMemberships.length !== 1) throw new Error("An unambiguous active company membership is required to initialize this project");
      const companyRole = companyMemberships[0]?.role;
      const roleId = companyRole?.id;
      await requireCreate(sudo, "ProjectMembership")({
        data: {
          membershipKey: `${project.id}:${session.itemId}`,
          status: "active",
          accessLevel: "manager",
          portalType: "internal",
          joinedAt: /* @__PURE__ */ new Date(),
          ...roleId ? { role: { connect: { id: String(roleId) } } } : {},
          project: { connect: { id: project.id } },
          user: { connect: { id: session.itemId } }
        }
      });
      const costCodes = await sudo.query.CostCode.findMany({
        where: { costCodeKey: { equals: `${companyId}:gen` } },
        take: 2,
        query: "id"
      });
      if (costCodes.length > 1) throw new Error("Duplicate general cost codes require operator reconciliation");
      const costCode = costCodes[0]?.id ? costCodes[0] : await requireCreate(sudo, "CostCode")({ data: { code: "GEN", name: "General", company: { connect: { id: companyId } } } });
      const budgetCode = await requireCreate(sudo, "BudgetCode")({ data: {
        code: "GEN",
        description: "General project costs",
        costType: "other",
        isActive: true,
        costCode: { connect: { id: String(costCode.id) } },
        company: { connect: { id: companyId } },
        project: { connect: { id: project.id } }
      } });
      const budget = await requireCreate(sudo, "Budget")({ data: {
        name: "Initial project budget",
        version: 1,
        status: "active",
        currencyCode,
        approvedAt: /* @__PURE__ */ new Date(),
        approvedBy: { connect: { id: session.itemId } },
        project: { connect: { id: project.id } }
      } });
      await requireCreate(sudo, "BudgetLineItem")({ data: {
        description: "General project costs",
        budget: { connect: { id: budget.id } },
        budgetCode: { connect: { id: budgetCode.id } },
        project: { connect: { id: project.id } }
      } });
      for (const domain of ["budget_change", "prime_contract", "change_order", "progress_claim", "retainage_release"]) {
        await requireCreate(sudo, "ApprovalPolicy")({ data: {
          policyKey: `${companyId}:${project.id}:${domain}:default`,
          name: `Default ${domain.replaceAll("_", " ")} approval`,
          domain,
          minimumAmountMinor: "0",
          currencyCode,
          isActive: true,
          ...roleId ? { approverRole: { connect: { id: String(roleId) } } } : {},
          company: { connect: { id: companyId } },
          project: { connect: { id: project.id } }
        } });
      }
    }
  });
}
async function addProjectMember(_root, { input }, context) {
  const accessLevel = ["viewer", "contributor", "manager"].includes(input.accessLevel) ? input.accessLevel : null;
  if (!accessLevel) throw new Error("Access level is invalid");
  return executeProjectCommand({
    context,
    operation: "addProjectMember",
    permission: "canManagePeople",
    projectId: input.projectId,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "ProjectMembership",
    data: {
      membershipKey: `${input.projectId}:${requiredText(input.userId, "User id", 200)}`,
      status: "active",
      accessLevel,
      joinedAt: /* @__PURE__ */ new Date(),
      project: { connect: { id: input.projectId } },
      user: { connect: { id: input.userId } }
    }
  });
}

// features/keystone/queries/preconstruction.ts
async function constructionBidComparison(_root, { projectId: projectId2 }, context) {
  const session = requireCommandSession(context);
  const project = await queryById(context, "Project", projectId2, "id company { id }");
  const companyId = project?.company?.id;
  const internalGrant = session.authType === "api_key" || session.data.projectMemberships?.some((entry) => entry.status === "active" && entry.project?.id === projectId2 && entry.portalType === "internal") || session.data.companyMemberships?.some((entry) => entry.status === "active" && entry.company?.id === companyId && entry.canAccessAllProjects);
  if (!companyId || !internalGrant || !hasProjectPermission(session, companyId, projectId2, "canReadPreconstruction") || !await canAccessProjectById(context, session.itemId, projectId2)) {
    throw new Error("Bid comparison is not available for this project role");
  }
  const records = await context.sudo().query.BidSubmission.findMany({
    where: { project: { id: { equals: projectId2 } } },
    take: 200,
    orderBy: [{ totalMinor: "asc" }, { createdAt: "asc" }],
    query: "id submissionNumber status totalMinor currencyCode exclusions clarifications submittedAt tradePartner { id name } bidPackage { id number title status } lineItems(take: 200, orderBy: { lineNumber: asc }) { id description amountMinor budgetCode { code } }"
  });
  return records.map((record) => ({
    id: String(record.id),
    packageNumber: String(record.bidPackage?.number ?? ""),
    packageTitle: String(record.bidPackage?.title ?? ""),
    submissionNumber: String(record.submissionNumber ?? ""),
    partnerName: String(record.tradePartner?.name ?? ""),
    status: String(record.status ?? ""),
    totalMinor: String(record.totalMinor ?? "0"),
    currencyCode: String(record.currencyCode ?? "USD"),
    exclusions: String(record.exclusions ?? ""),
    clarifications: String(record.clarifications ?? ""),
    submittedAt: record.submittedAt instanceof Date ? record.submittedAt.toISOString() : record.submittedAt ? String(record.submittedAt) : null,
    lineCount: Array.isArray(record.lineItems) ? record.lineItems.length : 0
  }));
}

// features/keystone/domain/onboarding-seed.ts
function db(sudoDb, listKey) {
  const api = sudoDb[listKey];
  if (!api) throw new Error(`${listKey} is unavailable for workspace setup`);
  return api;
}
var DAY = 24 * 60 * 60 * 1e3;
var connect = (id) => ({ connect: { id } });
var APPROVAL_POLICY_DOMAINS = ["budget_change", "prime_contract", "change_order", "progress_claim", "retainage_release"];
async function seedWorkspaceSetup(sudoDb, args) {
  const project = connect(args.projectId);
  const location = await db(sudoDb, "ProjectLocation").createOne({ data: {
    code: "SITE",
    name: "Project site",
    locationType: "site",
    project
  } });
  const schedule = await db(sudoDb, "Schedule").createOne({ data: {
    name: "Project schedule",
    scheduleType: "baseline",
    status: "draft",
    ...args.startDate ? { dataDate: args.startDate } : {},
    project
  } });
  const milestones = {};
  for (const [code, name, date3] of [
    ["M-001", "Notice to proceed", args.startDate],
    ["M-002", "Substantial completion", args.completionDate]
  ]) {
    if (!date3) continue;
    const task = await db(sudoDb, "ScheduleTask").createOne({ data: {
      taskCode: code,
      name,
      isMilestone: true,
      plannedStart: date3,
      plannedFinish: date3,
      schedule: connect(schedule.id),
      project
    } });
    milestones[code] = task.id;
  }
  const inspectionTemplate = await db(sudoDb, "InspectionTemplate").createOne({ data: {
    name: "General quality inspection",
    inspectionType: "quality",
    instructions: "Check the work against the approved drawings, specifications and submittals. Record each deficiency as a corrective action.",
    isActive: true,
    project
  } });
  return { locationId: location.id, scheduleId: schedule.id, milestones, inspectionTemplateId: inspectionTemplate.id };
}
async function seedSampleWorkspace(sudoDb, args) {
  const project = connect(args.projectId);
  const company = connect(args.companyId);
  const actor2 = connect(args.actorId);
  const after = (days2) => new Date(args.startDate.getTime() + days2 * DAY);
  const section = await db(sudoDb, "SpecificationSection").createOne({ data: {
    sectionNumber: "03 30 00",
    title: "Cast-in-place concrete",
    division: "03",
    project
  } });
  await db(sudoDb, "Drawing").createOne({ data: {
    drawingNumber: "S-101",
    title: "Foundation plan",
    discipline: "Structural",
    project
  } });
  await db(sudoDb, "Equipment").createOne({ data: {
    equipmentNumber: "EQ-001",
    name: "Telehandler",
    description: "Fictional sample equipment",
    status: "available",
    company
  } });
  const material = await db(sudoDb, "Material").createOne({ data: {
    sku: "MAT-001",
    name: "Ready-mix concrete 4000 psi",
    description: "Fictional sample material",
    unit: "CY",
    standardCostMinor: "18500",
    isActive: "active",
    company
  } });
  const bidPackage = await db(sudoDb, "BidPackage").createOne({ data: {
    number: "BP-03",
    title: "Concrete",
    description: "Foundations, slabs on grade and site concrete.",
    dueAt: after(21),
    bidManager: actor2,
    project
  } });
  await db(sudoDb, "BidInvitation").createOne({ data: {
    status: "draft",
    recipientName: "Atlas estimating",
    recipientEmail: "bids@atlas.example.test",
    bidPackage: connect(bidPackage.id),
    budgetCode: connect(args.budgetCodeId),
    tradePartner: connect(args.tradePartnerId),
    project
  } });
  const estimate = await db(sudoDb, "Estimate").createOne({ data: {
    number: "EST-001",
    title: "Concrete scope estimate",
    description: "Draft estimate for the concrete package.",
    estimator: actor2,
    project
  } });
  const estimateTotal = "128000000";
  const version = await db(sudoDb, "EstimateVersion").createOne({ data: {
    versionNumber: 1,
    status: "draft",
    subtotalMinor: estimateTotal,
    totalMinor: estimateTotal,
    scopeSummary: "Foundations, slabs on grade and site concrete.",
    estimate: connect(estimate.id),
    project
  } });
  await db(sudoDb, "EstimateLineItem").createOne({ data: {
    lineNumber: 1,
    description: "Concrete subcontract",
    quantity: "1",
    unit: "LS",
    subcontractCostMinor: estimateTotal,
    totalCostMinor: estimateTotal,
    version: connect(version.id),
    budgetCode: connect(args.budgetCodeId),
    project
  } });
  await db(sudoDb, "Estimate").updateOne({ where: { id: estimate.id }, data: { currentVersion: connect(version.id) } });
  await db(sudoDb, "RFI").createOne({ data: {
    number: "RFI-001",
    subject: "Footing depth at grid C",
    question: "Confirm the footing depth at grid C where the geotechnical report shows softer soil.",
    dueAt: after(14),
    raisedBy: actor2,
    ballInCourt: actor2,
    location: connect(args.locationId),
    specificationSection: connect(section.id),
    project
  } });
  await db(sudoDb, "Submittal").createOne({ data: {
    number: "SUB-001",
    title: "Concrete mix design",
    submittalType: "product_data",
    dueAt: after(10),
    specificationSection: connect(section.id),
    responsiblePartner: connect(args.tradePartnerId),
    submitter: actor2,
    submittalManager: actor2,
    ballInCourt: actor2,
    project
  } });
  const mobilization = await db(sudoDb, "ScheduleTask").createOne({ data: {
    taskCode: "T-100",
    name: "Mobilization",
    plannedStart: args.startDate,
    plannedFinish: after(7),
    schedule: connect(args.scheduleId),
    location: connect(args.locationId),
    project
  } });
  const foundations = await db(sudoDb, "ScheduleTask").createOne({ data: {
    taskCode: "T-200",
    name: "Foundations",
    plannedStart: after(8),
    plannedFinish: after(45),
    schedule: connect(args.scheduleId),
    location: connect(args.locationId),
    responsiblePartner: connect(args.tradePartnerId),
    project
  } });
  await db(sudoDb, "ScheduleDependency").createOne({ data: {
    dependencyType: "finish_to_start",
    lagDays: 0,
    schedule: connect(args.scheduleId),
    predecessor: connect(mobilization.id),
    successor: connect(foundations.id),
    project
  } });
  const inspection = await db(sudoDb, "Inspection").createOne({ data: {
    inspectionNumber: "INS-001",
    title: "Pre-pour inspection",
    scheduledAt: after(30),
    template: connect(args.inspectionTemplateId),
    inspector: actor2,
    location: connect(args.locationId),
    specificationSection: connect(section.id),
    project
  } });
  await db(sudoDb, "InspectionItem").createOne({ data: {
    sequence: 1,
    prompt: "Reinforcement placed and tied per the approved shop drawings",
    inspection: connect(inspection.id),
    project
  } });
  await db(sudoDb, "DailyLog").createOne({ data: {
    logDate: args.startDate,
    preparedBy: actor2,
    project
  } });
  await db(sudoDb, "SafetyObservation").createOne({ data: {
    observationNumber: "OBS-001",
    title: "Stair guardrail not yet installed",
    description: "Temporary guardrail needed at stair 2 before the deck is opened to other trades.",
    dueAt: after(2),
    observedBy: actor2,
    assignedTo: actor2,
    location: connect(args.locationId),
    project
  } });
  await db(sudoDb, "ChangeEvent").createOne({ data: {
    number: "CE-001",
    title: "Entrance canopy added by owner",
    description: "Owner asked for a covered entrance canopy.",
    owner: actor2,
    project
  } });
  const procurement = await db(sudoDb, "ProcurementRequest").createOne({ data: {
    requestNumber: "PR-001",
    title: "Footing concrete",
    neededBy: after(28),
    totalEstimatedMinor: "1480000",
    requestedBy: actor2,
    project
  } });
  await db(sudoDb, "ProcurementRequestLine").createOne({ data: {
    lineNumber: 1,
    description: "Ready-mix concrete 4000 psi",
    quantity: "80",
    unit: "CY",
    estimatedUnitCostMinor: "18500",
    estimatedAmountMinor: "1480000",
    request: connect(procurement.id),
    budgetCode: connect(args.budgetCodeId),
    material: connect(material.id),
    project
  } });
  const lead = await db(sudoDb, "ConstructionLead").createOne({ data: {
    name: "Facilities planning office",
    organization: "City of Northstar",
    email: "facilities@northstar.example.test",
    source: "existing_client",
    status: "qualified",
    nextActionAt: after(5),
    owner: actor2,
    company
  } });
  await db(sudoDb, "ConstructionOpportunity").createOne({ data: {
    number: "OPP-001",
    name: "Library annex",
    organization: "City of Northstar",
    deliveryMethod: "Design-bid-build",
    stage: "qualifying",
    estimatedValueMinor: "450000000",
    probabilityBps: 4e3,
    targetBidDate: after(60),
    nextActionAt: after(5),
    owner: actor2,
    lead: connect(lead.id),
    client: connect(args.clientId),
    company
  } });
}
async function count(query, listKey, where) {
  const api = query[listKey]?.count;
  if (!api) throw new Error(`${listKey} count query is unavailable`);
  return api({ where });
}
var idIs = (id) => ({ id: { equals: id } });
async function companyReadiness(query, args) {
  const company = { company: idIs(args.companyId) };
  const projectTool = (tool) => args.firstProjectId ? `/dashboard/platform/projects/${encodeURIComponent(args.firstProjectId)}/${tool}` : "/dashboard/platform/projects";
  const portalSafe = {
    canAccessDashboard: { equals: false },
    canManageCompanies: { equals: false },
    canManagePeople: { equals: false },
    canManageAgents: { equals: false },
    canManageOnboarding: { equals: false }
  };
  const [profiles, internalRoles, externalRoles, costCodes] = await Promise.all([
    count(query, "PublicSiteProfile", company),
    count(query, "Role", { ...company, canAccessDashboard: { equals: true } }),
    count(query, "Role", { ...company, ...portalSafe }),
    count(query, "CostCode", { ...company, isActive: { equals: true } })
  ]);
  const policies = await query.ApprovalPolicy?.findMany?.({
    where: { ...company, isActive: { equals: true } },
    take: 200,
    query: "approverRole { id }"
  }) ?? [];
  const approverRoleIds = [...new Set(policies.map((policy) => policy.approverRole?.id).filter((id) => Boolean(id)))];
  const otherApprovers = approverRoleIds.length ? await count(query, "CompanyMembership", {
    ...company,
    status: { equals: "active" },
    user: { id: { not: { equals: args.actorId } } },
    role: { id: { in: approverRoleIds } }
  }) + await count(query, "ProjectMembership", {
    project: { company: idIs(args.companyId) },
    status: { equals: "active" },
    portalType: { equals: "internal" },
    user: { id: { not: { equals: args.actorId } } },
    role: { id: { in: approverRoleIds } }
  }) : 0;
  return [
    { key: "profile", label: "Company profile and public intake", complete: profiles > 0, detail: profiles > 0 ? "Profile saved" : "No public profile", href: `/dashboard/platform/store-settings?companyId=${encodeURIComponent(args.companyId)}`, required: true },
    { key: "roles", label: "Role templates", complete: internalRoles > 0 && externalRoles > 0, detail: `${internalRoles} staff, ${externalRoles} external`, href: "/dashboard/roles", required: true },
    { key: "cost-codes", label: "Cost codes", complete: costCodes > 0, detail: `${costCodes} active`, href: "/dashboard/cost-codes", required: true },
    { key: "approver", label: "Independent approver", complete: otherApprovers > 0, detail: otherApprovers > 0 ? `${otherApprovers} other approver${otherApprovers === 1 ? "" : "s"}` : "Invite a second approver", href: projectTool("team"), required: false }
  ];
}
async function projectReadiness(query, args) {
  const project = { project: idIs(args.projectId) };
  const tool = (slug) => `/dashboard/platform/projects/${encodeURIComponent(args.projectId)}${slug ? `/${slug}` : ""}`;
  const [managers, budgetCodes, activeBudgets, activeLines, schedules, locations, ...domains2] = await Promise.all([
    count(query, "ProjectMembership", { ...project, status: { equals: "active" }, portalType: { equals: "internal" }, accessLevel: { equals: "manager" } }),
    count(query, "BudgetCode", { ...project, isActive: { equals: true } }),
    count(query, "Budget", { ...project, status: { equals: "active" } }),
    count(query, "BudgetLineItem", { ...project, budget: { status: { equals: "active" } } }),
    count(query, "Schedule", project),
    count(query, "ProjectLocation", project),
    ...APPROVAL_POLICY_DOMAINS.map((domain) => count(query, "ApprovalPolicy", { ...project, domain: { equals: domain }, isActive: { equals: true } }))
  ]);
  const coveredDomains = domains2.filter((value) => value > 0).length;
  return [
    { key: "team", label: "Project manager access", complete: managers > 0, detail: `${managers} manager${managers === 1 ? "" : "s"}`, href: tool("team"), required: true },
    { key: "budget-codes", label: "Budget codes", complete: budgetCodes > 0, detail: `${budgetCodes} active`, href: tool("financials"), required: true },
    { key: "budget", label: "Active budget", complete: activeBudgets > 0 && activeLines > 0, detail: activeBudgets > 0 ? `${activeLines} budget line${activeLines === 1 ? "" : "s"}` : "No active budget", href: tool("financials"), required: true },
    { key: "policies", label: "Approval policies", complete: coveredDomains === APPROVAL_POLICY_DOMAINS.length, detail: `${coveredDomains} of ${APPROVAL_POLICY_DOMAINS.length} areas`, href: tool("financials"), required: true },
    { key: "schedule", label: "Schedule", complete: schedules > 0, detail: schedules > 0 ? "Schedule created" : "No schedule", href: tool("schedule"), required: true },
    { key: "locations", label: "Site locations", complete: locations > 0, detail: `${locations} location${locations === 1 ? "" : "s"}`, href: "/dashboard/project-locations", required: true }
  ];
}
async function assertWorkspaceReady(query, args) {
  const checks = [
    ...await companyReadiness(query, { companyId: args.companyId, actorId: args.actorId, firstProjectId: args.projectId }),
    ...await projectReadiness(query, { projectId: args.projectId })
  ];
  const missing = checks.filter((check) => check.required && !check.complete);
  if (missing.length) throw new Error(`Workspace setup is incomplete: ${missing.map((check) => check.label).join(", ")}`);
  return checks;
}

// features/keystone/queries/onboarding-readiness.ts
var MAX_READINESS_COMPANIES = 10;
var MAX_READINESS_PROJECTS = 10;
var setupPermissions = ["canManageOnboarding", "canManageSettings", "canManageCompanies"];
async function constructionOnboardingReadiness(_root, _args, context) {
  const session = context.session;
  if (!session?.itemId || session.authType === "api_key") throw new Error("Sign in to continue");
  const actorId = session.itemId;
  const query = context.sudo().query;
  const findMany2 = (listKey) => {
    const api = query[listKey]?.findMany;
    if (!api) throw new Error(`${listKey} query is unavailable`);
    return api;
  };
  const [companyMemberships, projectMembershipCount] = await Promise.all([
    findMany2("CompanyMembership")({
      where: { user: { id: { equals: actorId } }, status: { equals: "active" } },
      take: MAX_READINESS_COMPANIES,
      orderBy: { createdAt: "asc" },
      query: "company { id name status }"
    }),
    query.ProjectMembership?.count?.({ where: { user: { id: { equals: actorId } }, status: { equals: "active" } } }) ?? Promise.resolve(0)
  ]);
  const globalRole = session.data.role;
  const canStartFirstCompany = companyMemberships.length === 0 && projectMembershipCount === 0 && globalRole?.canManageOnboarding === true && globalRole?.canManageCompanies === true;
  const companies = [];
  for (const membership of companyMemberships) {
    const company = membership.company;
    if (!company?.id || company.status !== "active") continue;
    if (!setupPermissions.some((permission) => hasCompanyPermission(session, company.id, permission))) continue;
    const projects = await findMany2("Project")({
      where: { company: { id: { equals: company.id } }, status: { notIn: ["completed", "archived"] } },
      take: MAX_READINESS_PROJECTS,
      orderBy: { createdAt: "asc" },
      query: "id name"
    });
    const firstProjectId = projects[0]?.id ?? null;
    companies.push({
      companyId: company.id,
      name: String(company.name ?? ""),
      checks: await companyReadiness(query, { companyId: company.id, actorId, firstProjectId }),
      projects: await Promise.all(projects.map(async (project) => ({
        projectId: String(project.id),
        name: String(project.name ?? ""),
        checks: await projectReadiness(query, { projectId: String(project.id) })
      })))
    });
  }
  return {
    canStartFirstCompany,
    // Like E-commerce's full store template, the sample workspace is offered to
    // every first-company setup; its records are drafts flagged as fictional.
    sampleWorkspaceAvailable: canStartFirstCompany,
    projectOnly: companyMemberships.length === 0 && projectMembershipCount > 0,
    companies
  };
}

// features/keystone/queries/resource-activity.ts
var scoped = (companyId, projectId2) => ({ company: { id: { equals: companyId } }, project: { id: { equals: projectId2 } } });
function resourceLabel(row) {
  const resource = row.equipment ?? row.material;
  if (!resource) return "";
  return [resource.equipmentNumber ?? resource.sku, resource.name].filter((value) => typeof value === "string" && value).join(" \xB7 ");
}
async function constructionResourceLogRegister(_root, { projectId: projectId2, page = 1, search = "", type = "all", event = "all" }, context) {
  const authority = await resourceAuthority(context, projectId2);
  const selectedType = type || "all";
  const selectedEvent = event || "all";
  if (!["all", "equipment", "material"].includes(selectedType) || selectedEvent !== "all" && !Object.values(resourceEvents).flat().includes(selectedEvent)) throw new Error("Unsupported resource filter");
  const term = (search || "").trim();
  if (term.length > 200) throw new Error("Resource search must be at most 200 characters");
  const where = {
    ...scoped(authority.companyId, projectId2),
    ...selectedType === "all" ? {} : { resourceType: { equals: selectedType } },
    ...selectedEvent === "all" ? {} : { eventType: { equals: selectedEvent } },
    ...term ? { notes: { contains: term, mode: "insensitive" } } : {}
  };
  const totalCount = await context.query.ResourceLog.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / 20));
  const currentPage = Math.min(Math.max(Number.isSafeInteger(page) ? page : 1, 1), totalPages);
  const items = await context.query.ResourceLog.findMany({ where, take: 20, skip: (currentPage - 1) * 20, orderBy: [{ occurredAt: "desc" }, { id: "desc" }], query: "id resourceType eventType occurredAt quantity unit equipment { equipmentNumber name } material { sku name }" });
  const intentScope = { version: 2, purpose: "recordResourceActivity", actorId: authority.session.itemId, principalId: authority.session.authType === "api_key" ? `api:${authority.session.apiCredential?.id ?? ""}` : "human", companyId: authority.companyId, projectId: projectId2, currencyCode: authority.currencyCode };
  return { intentScope, page: currentPage, pageSize: 20, totalCount, totalPages, search: term, type: selectedType, event: selectedEvent, items: items.map((row) => ({ id: String(row.id), resourceType: String(row.resourceType), eventType: String(row.eventType), occurredAt: row.occurredAt instanceof Date ? row.occurredAt.toISOString() : row.occurredAt == null ? null : String(row.occurredAt), quantity: String(row.quantity ?? "0"), unit: String(row.unit ?? ""), resourceLabel: resourceLabel(row) })) };
}
async function resourceLogDetail(projectId2, recordId, context) {
  const authority = await resourceAuthority(context, projectId2);
  const [record] = await context.query.ResourceLog.findMany({
    where: { ...scoped(authority.companyId, projectId2), id: { equals: recordId } },
    take: 1,
    query: "id resourceType eventType occurredAt endedAt quantity unit unitCostMinor totalCostMinor currencyCode notes createdAt equipment { id equipmentNumber name company { id } } material { id sku name company { id } }"
  });
  if (!record?.id) throw new Error("Resource activity not found in this project");
  const resource = record.resourceType === "equipment" ? record.equipment : record.material;
  const company = resource?.company;
  const fields = ["resourceType", "eventType", "occurredAt", "endedAt", "quantity", "unit", "unitCostMinor", "totalCostMinor", "currencyCode", "notes", "createdAt"].flatMap((key) => record[key] == null || record[key] === "" ? [] : [{ label: key.replace(/([A-Z])/g, " $1"), value: record[key] instanceof Date ? record[key].toISOString() : String(record[key]) }]);
  fields.push({ label: "Resource", value: resource && company?.id === authority.companyId ? `${String(resource.equipmentNumber || resource.sku || "")} \xB7 ${String(resource.name || "")}` : "Resource unavailable" });
  fields.push({ label: "Meaning", value: "Append-only field observation, not procurement acceptance, stock movement, posted cost or settled billing. No silent edit or reversal; controlled linked correction is not yet available. Legacy records remain unchanged." });
  let history = [];
  if (hasProjectPermission(authority.session, authority.companyId, projectId2, "canReadAudit")) {
    const actions = await context.query.AgentAction.findMany({ where: { ...scoped(authority.companyId, projectId2), targetType: { equals: "ResourceLog" }, targetId: { equals: recordId } }, take: 100, orderBy: [{ requestedAt: "desc" }, { id: "desc" }], query: "id action status requestedAt requestDigest resultDigest" });
    history = actions.map((row) => ({ kind: "Audit action", reference: String(row.id), title: `${String(row.action)} \xB7 request ${String(row.requestDigest)} \xB7 result ${String(row.resultDigest)}`, status: String(row.status), occurredAt: row.requestedAt ? new Date(String(row.requestedAt)).toISOString() : null }));
    if (actions.length === 100) history.push({ kind: "Projection limit", reference: "", title: "At most 100 actions are shown; older actions may be omitted.", status: "bounded", occurredAt: null });
  }
  return {
    id: String(record.id),
    recordType: "resource-log",
    listKey: "ResourceLog",
    reference: String(record.id),
    title: String(record.eventType),
    status: "recorded",
    fields,
    evidence: [{ kind: "Persisted field fact", reference: String(record.id), title: `${String(record.quantity)} ${String(record.unit)} \xB7 ${String(record.currencyCode)} recorded cost (minor units) ${String(record.totalCostMinor)}`, status: "recorded", occurredAt: record.occurredAt ? new Date(String(record.occurredAt)).toISOString() : null }],
    history,
    allowedTransitions: []
  };
}

// features/keystone/queries/record-detail.ts
var MAX_INSPECTION_CORRECTIVE_ACTION_DETAILS = 100;
function text21(value, fallback = "") {
  return typeof value === "string" && value ? value : fallback;
}
function relation(value) {
  return value && typeof value === "object" ? value : {};
}
function rows(value) {
  return Array.isArray(value) ? value : [];
}
function date2(value) {
  return value instanceof Date ? value.toISOString() : value ? String(value) : null;
}
function money2(value, currency) {
  try {
    const minor = BigInt(String(value ?? 0));
    const absolute = minor < 0 ? -minor : minor;
    return `${text21(currency, "USD")} ${minor < 0 ? "-" : ""}${absolute / BigInt(100)}.${(absolute % BigInt(100)).toString().padStart(2, "0")}`;
  } catch {
    return `${text21(currency, "USD")} \u2014`;
  }
}
var item2 = (kind, row, reference, title, status2, occurredAt) => ({ kind, reference: text21(reference), title: text21(title, "Recorded evidence"), status: text21(status2, "recorded"), occurredAt: date2(occurredAt), recordId: text21(row.id) || null });
var childRecordTypes = { Submission: "bid-submission", "Schedule task": "schedule-task", "Corrective action": "corrective-action" };
function linkChildren(items) {
  return items.map((entry) => {
    const recordType = entry.recordId ? childRecordTypes[entry.kind] ?? null : null;
    return { ...entry, recordType, recordId: recordType ? entry.recordId : null };
  });
}
var configs = {
  rfi: { listKey: "RFI", permission: "canReadProjectExecution", query: "id number subject question status priority dueAt openedAt answeredAt closedAt raisedBy { name } ballInCourt { name } responsiblePartner { name } project { id company { id } } responses(take: 200, orderBy: { respondedAt: asc }) { id response isOfficial respondedAt author { name } onBehalfOf { name } }", reference: "number", title: "subject", evidence: (r) => {
    const responses = rows(r.responses);
    const evidence = responses.map((row) => item2(row.isOfficial ? "Official response" : "Response", row, relation(row.author).name, row.response, row.isOfficial ? "official" : "recorded", row.respondedAt));
    if (responses.length === 200) evidence.push(item2("Projection limit", {}, "", "At most 200 RFI responses are included; additional responses may be omitted.", "bounded"));
    return evidence;
  } },
  submittal: { listKey: "Submittal", permission: "canReadProjectExecution", query: "id number title description status revision dueAt submittedAt closedAt submitter { name } ballInCourt { name } responsiblePartner { name } project { id company { id } } reviews(take: 200, orderBy: { sequence: asc }) { id sequence status response dueAt completedAt reviewer { name } reviewerPartner { name } }", reference: "number", title: "title", evidence: (r) => {
    const reviews = rows(r.reviews);
    const evidence = reviews.map((row) => item2("Review", row, `Step ${String(row.sequence ?? "")}`, [
      text21(relation(row.reviewer).name, text21(relation(row.reviewerPartner).name)) && `Reviewer: ${text21(relation(row.reviewer).name, text21(relation(row.reviewerPartner).name))}`,
      text21(row.response) && `Response: ${text21(row.response)}`
    ].filter(Boolean).join("\n\n"), row.status, row.completedAt || row.dueAt));
    if (reviews.length === 200) evidence.push(item2("Projection limit", {}, "", "At most 200 submittal reviews are included; additional reviews may be omitted.", "bounded"));
    return evidence;
  } },
  "daily-log": { listKey: "DailyLog", permission: "canReadFieldOperations", query: "id logDate status weatherSummary generalNotes submittedAt approvedAt preparedBy { name } approvedBy { name } project { id company { id } } entries(take: 300, orderBy: { createdAt: asc }) { id entryType title details quantity unit delayDays startedAt }", reference: "logDate", title: "weatherSummary", evidence: (r) => {
    const entries = rows(r.entries);
    const evidence = entries.map((row) => item2(text21(row.entryType, "Entry"), row, [row.quantity, row.unit].filter(Boolean).join(" "), [text21(row.title), text21(row.details)].filter(Boolean).join("\n\n"), "recorded", row.startedAt));
    if (entries.length === 300) evidence.push(item2("Projection limit", {}, "", "At most 300 daily-log entries are included; additional entries may be omitted.", "bounded"));
    return evidence;
  } },
  estimate: { listKey: "Estimate", permission: "canReadPreconstruction", query: "id number title description status estimator { name } project { id company { id } } currentVersion { id versionNumber status subtotalMinor totalMinor scopeSummary issuedAt lineItems(take: 300, orderBy: { lineNumber: asc }) { id lineNumber description totalCostMinor budgetCode { code } } }", reference: "number", title: "title", evidence: (r) => {
    const lineItems = rows(relation(r.currentVersion).lineItems);
    const evidence = lineItems.map((row) => item2("Estimate line", row, relation(row.budgetCode).code, row.description, money2(row.totalCostMinor, "USD")));
    if (lineItems.length === 300) evidence.push(item2("Projection limit", {}, "", "At most 300 current estimate-version line items are included; additional line items may be omitted.", "bounded"));
    return evidence;
  } },
  "bid-package": { listKey: "BidPackage", permission: "canReadPreconstruction", query: "id number title description status dueAt issuedAt closedAt bidManager { name } project { id company { id } } invitations(take: 200) { id status tradePartner { name } sentAt respondedAt } submissions(take: 200) { id submissionNumber status totalMinor currencyCode tradePartner { name } submittedAt }", reference: "number", title: "title", evidence: (r) => {
    const invitations = rows(r.invitations);
    const submissions = rows(r.submissions);
    const evidence = [
      ...invitations.map((row) => item2("Invitation", row, relation(row.tradePartner).name, "Bid invitation", row.status, row.respondedAt || row.sentAt)),
      ...submissions.map((row) => item2("Submission", row, row.submissionNumber, `${text21(relation(row.tradePartner).name)} \xB7 ${money2(row.totalMinor, row.currencyCode)}`, row.status, row.submittedAt))
    ];
    if (invitations.length === 200) evidence.push(item2("Projection limit", {}, "", "At most 200 bid invitations are included; additional invitations may be omitted.", "bounded"));
    if (submissions.length === 200) evidence.push(item2("Projection limit", {}, "", "At most 200 bid submissions are included; additional submissions may be omitted.", "bounded"));
    return evidence;
  } },
  "bid-submission": { listKey: "BidSubmission", permission: "canReadPreconstruction", query: "id submissionNumber status totalMinor currencyCode exclusions clarifications submittedAt tradePartner { name } bidPackage { number title } project { id company { id } } lineItems(take: 300, orderBy: { lineNumber: asc }) { id lineNumber description amountMinor budgetCode { code } }", reference: "submissionNumber", title: "clarifications", evidence: (r) => {
    const lineItems = rows(r.lineItems);
    const evidence = lineItems.map((row) => item2("Bid line", row, relation(row.budgetCode).code, row.description, money2(row.amountMinor, r.currencyCode)));
    if (lineItems.length === 300) evidence.push(item2("Projection limit", {}, "", "At most 300 bid submission line items are included; additional line items may be omitted.", "bounded"));
    return evidence;
  } },
  "prime-contract": { listKey: "PrimeContract", permission: "canReadContracts", query: "id number title description status originalContractMinor approvedChangesMinor revisedContractMinor billedToDateMinor paidToDateMinor currencyCode executedAt client { name } project { id company { id } } lineItems(take: 300, orderBy: { lineNumber: asc }) { id lineNumber description revisedValueMinor budgetCode { code } } changeOrders(take: 200) { id number title status totalMinor }", reference: "number", title: "title", evidence: primeContractEvidence },
  commitment: { listKey: "Commitment", permission: "canReadContracts", query: "id number title description status originalContractMinor approvedChangesMinor revisedContractMinor invoicedToDateMinor paidToDateMinor currencyCode executedAt tradePartner { name } project { id company { id } } lineItems(take: 300, orderBy: { lineNumber: asc }) { id lineNumber description revisedValueMinor budgetCode { code } } changeOrders(take: 200) { id number title status totalMinor }", reference: "number", title: "title", evidence: commitmentEvidence },
  "subcontract-po": { listKey: "Commitment", permission: "canReadContracts", query: "id number title description status originalContractMinor approvedChangesMinor revisedContractMinor invoicedToDateMinor paidToDateMinor currencyCode executedAt tradePartner { name } project { id company { id } } lineItems(take: 300, orderBy: { lineNumber: asc }) { id lineNumber description revisedValueMinor budgetCode { code } } changeOrders(take: 200) { id number title status totalMinor }", reference: "number", title: "title", evidence: commitmentEvidence },
  "change-order": { listKey: "ChangeOrder", permission: "canReadContracts", query: "id number title description direction status totalMinor currencyCode scheduleImpactDays approvedAt executedAt requestedBy { name } approvedBy { name } project { id company { id } } lineItems(take: 300, orderBy: { lineNumber: asc }) { id lineNumber description amountMinor budgetCode { code } }", reference: "number", title: "title", evidence: (r) => {
    const lineItems = rows(r.lineItems);
    const evidence = lineItems.map((row) => item2("Change line", row, relation(row.budgetCode).code, row.description, money2(row.amountMinor, r.currencyCode)));
    if (lineItems.length === 300) evidence.push(item2("Projection limit", {}, "", "At most 300 change order line items are included; additional line items may be omitted.", "bounded"));
    return evidence;
  } },
  "procurement-request": { listKey: "ProcurementRequest", permission: "canReadContracts", query: "id requestNumber title description status neededBy totalEstimatedMinor currencyCode requestedBy { name } tradePartner { name } commitment { number } project { id company { id } } lines(take: 300, orderBy: { lineNumber: asc }) { id lineNumber description quantity unit estimatedAmountMinor budgetCode { code } } receipts(take: 200) { id receiptNumber status receivedAt }", reference: "requestNumber", title: "title", evidence: (r) => {
    const lines = rows(r.lines);
    const receipts = rows(r.receipts);
    const evidence = [
      ...lines.map((row) => item2("Request line", row, relation(row.budgetCode).code, `${text21(row.description)} \xB7 ${String(row.quantity ?? "")} ${text21(row.unit)}`, money2(row.estimatedAmountMinor, r.currencyCode))),
      ...receipts.map((row) => item2("Receipt", row, row.receiptNumber, "Material receipt", row.status, row.receivedAt))
    ];
    if (lines.length === 300) evidence.push(item2("Projection limit", {}, "", "At most 300 procurement request lines are included; additional lines may be omitted.", "bounded"));
    if (receipts.length === 200) evidence.push(item2("Projection limit", {}, "", "At most 200 related material receipts are included; additional receipts may be omitted.", "bounded"));
    return evidence;
  } },
  punch: { listKey: "PunchItem", permission: "canReadFieldOperations", query: "id number title description status priority dueAt completedAt closedAt assignedTo { name } project { id company { id } } correctiveActions(take: 100) { id actionNumber title status completedAt verifiedAt }", reference: "number", title: "title", evidence: (r) => {
    const correctiveActions = rows(r.correctiveActions);
    const evidence = correctiveActions.map((row) => item2("Corrective action", row, row.actionNumber, row.title, row.status, row.verifiedAt || row.completedAt));
    if (correctiveActions.length === 100) evidence.push(item2("Projection limit", {}, "", "At most 100 linked corrective actions are included; additional linked corrective actions may be omitted.", "bounded"));
    return evidence;
  } },
  observation: { listKey: "SafetyObservation", permission: "canReadSafety", query: "id observationNumber title description observationType status dueAt resolvedAt assignedTo { name } project { id company { id } } correctiveActions(take: 100) { id actionNumber title status completedAt verifiedAt }", reference: "observationNumber", title: "title", evidence: (r) => {
    const correctiveActions = rows(r.correctiveActions);
    const evidence = correctiveActions.map((row) => item2("Corrective action", row, row.actionNumber, row.title, row.status, row.verifiedAt || row.completedAt));
    if (correctiveActions.length === 100) evidence.push(item2("Projection limit", {}, "", "At most 100 linked corrective actions are included; additional linked corrective actions may be omitted.", "bounded"));
    return evidence;
  } },
  inspection: {
    listKey: "Inspection",
    permission: "canReadSafety",
    query: "id inspectionNumber title description status scheduledAt startedAt completedAt inspector { name } project { id company { id } } items(take: 300, orderBy: [{ sequence: asc }, { id: asc }]) { id sequence prompt result response completedAt correctiveActions(take: 100, orderBy: [{ createdAt: asc }, { id: asc }]) { id actionNumber status } }",
    reference: "inspectionNumber",
    title: "title",
    evidence: (record) => {
      const inspectionItems = rows(record.items);
      const itemEvidence = inspectionItems.map((row) => item2(
        "Inspection item",
        row,
        `Item ${String(row.sequence ?? "")}`,
        `${text21(row.prompt)} \xB7 ${text21(row.response)}`,
        row.result,
        row.completedAt
      ));
      const correctiveActionEvidence = [];
      const projectionLimitEvidence = [];
      if (inspectionItems.length >= 300) {
        projectionLimitEvidence.push(item2(
          "Projection limit",
          {},
          "",
          "At most 300 inspection items are included; corrective actions linked to additional items may be omitted.",
          "bounded"
        ));
      }
      for (const inspectionItem of inspectionItems) {
        for (const action of rows(inspectionItem.correctiveActions)) {
          if (correctiveActionEvidence.length >= MAX_INSPECTION_CORRECTIVE_ACTION_DETAILS) break;
          correctiveActionEvidence.push(item2(
            "Corrective action",
            action,
            action.actionNumber,
            `Linked to inspection item ${String(inspectionItem.sequence ?? "")}`,
            action.status
          ));
        }
        if (correctiveActionEvidence.length >= MAX_INSPECTION_CORRECTIVE_ACTION_DETAILS) break;
      }
      if (correctiveActionEvidence.length >= MAX_INSPECTION_CORRECTIVE_ACTION_DETAILS) {
        projectionLimitEvidence.push(item2(
          "Projection limit",
          {},
          "",
          "At most 100 linked corrective actions are shown; additional actions may be omitted.",
          "bounded"
        ));
      }
      return [...itemEvidence, ...correctiveActionEvidence, ...projectionLimitEvidence];
    }
  },
  incident: { listKey: "SafetyIncident", permission: "canReadSafety", query: "id incidentNumber title description status severity occurredAt reportedAt investigator { name } project { id company { id } } correctiveActions(take: 200) { id actionNumber title status completedAt verifiedAt }", reference: "incidentNumber", title: "title", evidence: (r) => rows(r.correctiveActions).map((row) => item2("Corrective action", row, row.actionNumber, row.title, row.status, row.verifiedAt || row.completedAt)) },
  "corrective-action": { listKey: "CorrectiveAction", permission: "canReadSafety", query: "id actionNumber title description status priority dueAt completionNotes evidenceReference completedAt verifiedAt assignedTo { name } verifiedBy { name } project { id company { id } }", reference: "actionNumber", title: "title" },
  "material-receipt": { listKey: "MaterialReceipt", permission: "canReadContracts", query: "id receiptNumber status receivedAt packingSlipReference evidenceFileName notes tradePartner { name } receivedBy { name } project { id company { id } } lines(take: 200, orderBy: { lineNumber: asc }) { id lineNumber quantityReceived quantityAccepted quantityRejected exceptionReason requestLine { description } }", reference: "receiptNumber", title: "packingSlipReference", evidence: (r) => {
    const lines = rows(r.lines);
    const evidence = lines.map((row) => item2("Receipt line", row, `Line ${String(row.lineNumber ?? "")}`, `${text21(relation(row.requestLine).description)} \xB7 accepted ${String(row.quantityAccepted ?? 0)} / received ${String(row.quantityReceived ?? 0)}`, Number(row.quantityRejected ?? 0) > 0 ? "exception" : "accepted"));
    if (lines.length === 200) evidence.push(item2("Projection limit", {}, "", "At most 200 receipt lines are included; additional lines may be omitted.", "bounded"));
    return evidence;
  } },
  "progress-claim": { listKey: "ProgressClaim", permission: "canReadBilling", query: "id claimNumber invoiceNumber status periodStart periodEnd dueAt revisedContractMinor currentPaymentDueMinor retainageMinor balanceToFinishMinor currencyCode submittedAt approvedAt tradePartner { name } project { id company { id } } lineItems(take: 300, orderBy: { lineNumber: asc }) { id lineNumber description currentWorkMinor retainageMinor earnedLessRetainageMinor } allocations(take: 200) { id amountMinor payment { paymentNumber status } }", reference: "claimNumber", title: "invoiceNumber", evidence: (r) => {
    const lineItems = rows(r.lineItems);
    const allocations = rows(r.allocations);
    const evidence = [
      ...lineItems.map((row) => item2("Claim line", row, `Line ${String(row.lineNumber ?? "")}`, row.description, money2(row.earnedLessRetainageMinor, r.currencyCode))),
      ...allocations.map((row) => item2("Payment allocation", row, relation(row.payment).paymentNumber, money2(row.amountMinor, r.currencyCode), relation(row.payment).status))
    ];
    if (lineItems.length === 300) evidence.push(item2("Projection limit", {}, "", "At most 300 claim line items are included; additional line items may be omitted.", "bounded"));
    if (allocations.length === 200) evidence.push(item2("Projection limit", {}, "", "At most 200 payment allocations are included; additional allocations may be omitted.", "bounded"));
    return evidence;
  } },
  "retainage-release": { listKey: "RetainageRelease", permission: "canReadBilling", query: "id releaseNumber status amountMinor currencyCode requestedAt approvedAt releasedAt reason approvedBy { name } progressClaim { claimNumber } payment { paymentNumber status } project { id company { id } }", reference: "releaseNumber", title: "reason" },
  "lien-waiver": { listKey: "LienWaiver", permission: "canReadBilling", query: "id waiverNumber waiverType status throughDate amountMinor currencyCode requestedAt receivedAt signedAt tradePartner { name } commitment { number } progressClaim { claimNumber } payment { paymentNumber status } project { id company { id } }", reference: "waiverNumber", title: "waiverType" },
  payment: { listKey: "Payment", permission: "canReadBilling", query: "id paymentNumber direction status amountMinor currencyCode paymentMethod reference paidAt settledAt tradePartner { name } project { id company { id } } allocations(take: 200) { id amountMinor progressClaim { claimNumber } } reversals(take: 20) { id reversalNumber amountMinor reason externalReference effectiveAt }", reference: "paymentNumber", title: "reference", evidence: (r) => {
    const allocations = rows(r.allocations);
    const reversals = rows(r.reversals);
    const evidence = [
      ...allocations.map((row) => item2("Allocation", row, relation(row.progressClaim).claimNumber, money2(row.amountMinor, r.currencyCode), "recorded")),
      ...reversals.map((row) => item2("Reversal", row, row.reversalNumber, `${text21(row.externalReference)} \xB7 ${text21(row.reason)}`, money2(row.amountMinor, r.currencyCode), row.effectiveAt))
    ];
    if (allocations.length === 200) evidence.push(item2("Projection limit", {}, "", "At most 200 payment allocations are included; additional allocations may be omitted.", "bounded"));
    if (reversals.length === 20) evidence.push(item2("Projection limit", {}, "", "At most 20 payment reversals are included; additional reversals may be omitted.", "bounded"));
    return evidence;
  } },
  document: { listKey: "Document", permission: "canReadDocuments", query: "id documentNumber title description documentType status project { id company { id } } versions(take: 200, orderBy: { versionNumber: desc }) { id versionNumber revisionLabel fileName issuedAt }", reference: "documentNumber", title: "title", evidence: (r) => {
    const versions = rows(r.versions);
    const evidence = versions.map((row) => item2("Document version", row, `v${String(row.versionNumber ?? "")}`, row.fileName, row.issuedAt ? "issued" : "draft", row.issuedAt));
    if (versions.length === 200) evidence.push(item2("Projection limit", {}, "", "At most 200 document versions are included; additional versions may be omitted.", "bounded"));
    return evidence;
  } },
  drawing: { listKey: "Drawing", permission: "canReadDocuments", query: "id drawingNumber title discipline status project { id company { id } } revisions(take: 200, orderBy: { issuedAt: desc }) { id revisionNumber titleSnapshot status fileName issuedAt }", reference: "drawingNumber", title: "title", evidence: (r) => {
    const revisions = rows(r.revisions);
    const evidence = revisions.map((row) => item2("Drawing revision", row, row.revisionNumber, row.fileName, row.status, row.issuedAt));
    if (revisions.length === 200) evidence.push(item2("Projection limit", {}, "", "At most 200 drawing revisions are included; additional revisions may be omitted.", "bounded"));
    return evidence;
  } },
  schedule: {
    listKey: "Schedule",
    permission: "canReadProjectExecution",
    query: "id name scheduleType status dataDate publishedAt publishedBy { name } project { id company { id } } tasks(take: 500, orderBy: { plannedStart: asc }) { id taskCode name status plannedStart plannedFinish percentComplete assignedTo { name } }",
    reference: "scheduleType",
    title: "name",
    evidence: (r) => {
      const tasks = rows(r.tasks);
      const evidence = tasks.map((row) => item2("Schedule task", row, row.taskCode, `${text21(row.name)} \xB7 ${String(row.percentComplete ?? 0)}%`, row.status, row.plannedFinish || row.plannedStart));
      if (tasks.length === 500) evidence.push(item2("Projection limit", {}, "", "At most 500 schedule tasks are included; additional tasks may be omitted.", "bounded"));
      return evidence;
    }
  },
  "schedule-task": { listKey: "ScheduleTask", permission: "canReadProjectExecution", query: "id taskCode name description status plannedStart plannedFinish actualStart actualFinish percentComplete assignedTo { name } project { id company { id } } predecessorDependencies(take: 100) { id dependencyType lagDays predecessor { taskCode name } } successorDependencies(take: 100) { id dependencyType lagDays successor { taskCode name } }", reference: "taskCode", title: "name", evidence: (r) => {
    const predecessors = rows(r.predecessorDependencies);
    const successors = rows(r.successorDependencies);
    const evidence = [
      ...predecessors.map((row) => item2("Predecessor", row, relation(row.predecessor).taskCode, relation(row.predecessor).name, row.dependencyType)),
      ...successors.map((row) => item2("Successor", row, relation(row.successor).taskCode, relation(row.successor).name, row.dependencyType))
    ];
    if (predecessors.length === 100) evidence.push(item2("Projection limit", {}, "", "At most 100 predecessor dependencies are included; additional predecessor dependencies may be omitted.", "bounded"));
    if (successors.length === 100) evidence.push(item2("Projection limit", {}, "", "At most 100 successor dependencies are included; additional successor dependencies may be omitted.", "bounded"));
    return evidence;
  } }
};
function contractEvidence(record) {
  const changeOrders = rows(record.changeOrders);
  const evidence = [
    ...rows(record.lineItems).map((row) => item2("SOV line", row, relation(row.budgetCode).code, row.description, money2(row.revisedValueMinor, record.currencyCode))),
    ...changeOrders.map((row) => item2("Change order", row, row.number, row.title, row.status))
  ];
  if (changeOrders.length === 200) {
    evidence.push(item2("Projection limit", {}, "", "At most 200 related change orders are included; additional change orders may be omitted.", "bounded"));
  }
  return evidence;
}
function primeContractEvidence(record) {
  const evidence = contractEvidence(record);
  if (rows(record.lineItems).length === 300) {
    evidence.push(item2("Projection limit", {}, "", "At most 300 prime contract SOV lines are included; additional SOV lines may be omitted.", "bounded"));
  }
  return evidence;
}
function commitmentEvidence(record) {
  const evidence = contractEvidence(record);
  if (rows(record.lineItems).length === 300) {
    evidence.push(item2("Projection limit", {}, "", "At most 300 commitment SOV lines are included; additional SOV lines may be omitted.", "bounded"));
  }
  return evidence;
}
var baseFields = [
  ["description", "Description"],
  ["question", "Question"],
  ["status", "Status"],
  ["priority", "Priority"],
  ["severity", "Severity"],
  ["direction", "Direction"],
  ["dueAt", "Due"],
  ["occurredAt", "Occurred"],
  ["periodStart", "Period start"],
  ["periodEnd", "Period end"],
  ["tradePartner", "Trade partner"],
  ["responsiblePartner", "Responsible partner"],
  ["ballInCourt", "Ball in court"],
  ["assignedTo", "Assigned to"],
  ["revisedContractMinor", "Revised contract"],
  ["billedToDateMinor", "Billed to date"],
  ["invoicedToDateMinor", "Invoiced to date"],
  ["paidToDateMinor", "Paid to date"],
  ["currentPaymentDueMinor", "Current payment due"],
  ["retainageMinor", "Retainage"],
  ["balanceToFinishMinor", "Balance to finish"],
  ["amountMinor", "Amount"],
  ["totalMinor", "Total"],
  ["completionNotes", "Completion notes"],
  ["evidenceReference", "Evidence reference"],
  ["percentComplete", "Percent complete"]
];
async function constructionRecordDetail(_root, { projectId: projectId2, recordType, recordId }, context) {
  if (recordType === "resource-log") return resourceLogDetail(projectId2, recordId, context);
  const config3 = configs[recordType];
  if (!config3) throw new Error("This construction record does not have a bounded detail projection");
  const session = requireCommandSession(context);
  const project = await queryById(context, "Project", projectId2, "id company { id }");
  const companyId = project?.company?.id;
  const internalGrant = session.authType === "api_key" || session.data.projectMemberships?.some((entry) => entry.status === "active" && entry.project?.id === projectId2 && entry.portalType === "internal") || session.data.companyMemberships?.some((entry) => entry.status === "active" && entry.company?.id === companyId && entry.canAccessAllProjects);
  if (!companyId || !internalGrant || !hasProjectPermission(session, companyId, projectId2, config3.permission) || !await canAccessProjectById(context, session.itemId, projectId2)) {
    throw new Error("Construction record not found for this project role");
  }
  const record = await queryById(context, config3.listKey, recordId, config3.query);
  if (!record?.id || record.project?.id !== projectId2) throw new Error("Construction record not found in this project");
  const currency = record.currencyCode ?? "USD";
  const fields = baseFields.flatMap(([key, label]) => {
    const value = record[key];
    if (value === null || value === void 0 || value === "") return [];
    const rendered = key.endsWith("Minor") ? money2(value, currency) : ["tradePartner", "responsiblePartner", "ballInCourt", "assignedTo"].includes(key) ? text21(relation(value).name) : key.endsWith("At") || key === "dueAt" || key.startsWith("period") ? date2(value) ?? "" : String(value);
    return rendered ? [{ label, value: rendered }] : [];
  });
  let history = [];
  if (hasProjectPermission(session, companyId, projectId2, "canReadAudit")) {
    const actions = await context.sudo().query.AgentAction.findMany({
      where: { project: { id: { equals: projectId2 } }, targetType: { equals: config3.listKey }, targetId: { equals: recordId } },
      take: 100,
      orderBy: { requestedAt: "desc" },
      query: "id action status targetStatus reason requestedAt actorUser { name } requestedBy { name }"
    });
    history = actions.map((row) => item2("Audit action", row, text21(relation(row.actorUser).name, text21(relation(row.requestedBy).name)), `${text21(row.action)} \xB7 ${text21(row.reason)}`, row.status, row.requestedAt));
  }
  return {
    id: String(record.id),
    recordType,
    listKey: config3.listKey,
    reference: text21(record[config3.reference]),
    title: text21(record[config3.title], config3.listKey),
    status: text21(record.status, "recorded"),
    fields,
    evidence: linkChildren(config3.evidence?.(record) ?? []),
    history: history.map((entry) => ({ ...entry, recordType: null, recordId: null })),
    allowedTransitions: session.authType === "api_key" ? [] : recordAllowedTransitions(session, config3.listKey, text21(record.status), companyId, projectId2)
  };
}

// features/keystone/domain/procurement-invariants.ts
function quantityToUnits(value) {
  if (!/^\d+(?:\.\d{1,4})?$/.test(value)) throw new Error("Quantity must be a positive decimal with at most four places");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * BigInt(1e4) + BigInt((fraction + "0000").slice(0, 4));
}
function deriveProcurementReceiptStatus(orderedUnits, acceptedUnits) {
  if (orderedUnits <= BigInt(0) || acceptedUnits < BigInt(0)) throw new Error("Ordered quantity must be positive and accepted quantity non-negative");
  if (acceptedUnits > orderedUnits) throw new Error("Accepted receipts exceed ordered quantity");
  if (acceptedUnits === BigInt(0)) return "ordered";
  if (acceptedUnits === orderedUnits) return "received";
  return "partially_received";
}
function receiptTotalsAreValid(input) {
  return input.receivedUnits > BigInt(0) && input.acceptedUnits >= BigInt(0) && input.rejectedUnits >= BigInt(0) && input.acceptedUnits + input.rejectedUnits === input.receivedUnits;
}
function receiptCapacityIsValid(input) {
  const outstandingUnits = input.orderedUnits - input.acceptedToDateUnits;
  return input.orderedUnits > BigInt(0) && input.receivedToDateUnits >= BigInt(0) && input.acceptedToDateUnits >= BigInt(0) && input.additionalReceivedUnits > BigInt(0) && input.additionalAcceptedUnits >= BigInt(0) && input.additionalAcceptedUnits <= input.additionalReceivedUnits && input.additionalReceivedUnits <= outstandingUnits;
}

// features/keystone/domain/resource-intent.ts
var optionalFields = ["description", "dueAt", "occurredAt", "amountMinor", "relatedId", "secondaryId", "partnerId", "userId", "roleId", "type", "quantity", "unit", "evidenceReference", "evidenceChecksumSha256"];
var requiredFields = ["projectId", "reference", "title", "idempotencyKey", "intentActorId", "intentPrincipalId", "intentCompanyId", "intentCurrencyCode"];
var scopeFields = ["version", "purpose", "actorId", "principalId", "companyId", "projectId", "currencyCode"];
var inputFields = [...requiredFields, ...optionalFields, "intentVersion"];
var ordered = (value) => Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
function encodeResourceIntent(intent) {
  return JSON.stringify({ scope: ordered(intent.scope), input: ordered(intent.input) });
}
function decodeResourceIntent(raw) {
  if (typeof raw !== "string" || raw.length > 32768 || new TextEncoder().encode(raw).length > 32768) throw new Error("Invalid or oversized original intent");
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid original intent");
  const packet = parsed;
  if (!packet.scope || !packet.input || Object.keys(packet).length !== 2) throw new Error("Unbound legacy intent requires authorized review; do not retry/rekey it");
  const { scope, input } = packet;
  if (Object.keys(scope).length !== scopeFields.length || Object.keys(scope).some((key) => !scopeFields.includes(key)) || scope.version !== 2 || scope.purpose !== "recordResourceActivity" || scopeFields.filter((key) => key !== "version").some((key) => typeof scope[key] !== "string" || !scope[key] || String(scope[key]).length > 200)) throw new Error("Invalid original intent scope");
  if (Object.keys(input).length !== inputFields.length || Object.keys(input).some((key) => !inputFields.includes(key)) || requiredFields.some((key) => typeof input[key] !== "string" || !input[key] || String(input[key]).length > 500) || optionalFields.some((key) => input[key] !== null && typeof input[key] !== "string") || input.intentVersion !== 2) throw new Error("Invalid original intent body");
  if (input.projectId !== scope.projectId || input.intentActorId !== scope.actorId || input.intentPrincipalId !== scope.principalId || input.intentCompanyId !== scope.companyId || input.intentCurrencyCode !== scope.currencyCode || !input.relatedId || typeof input.relatedId !== "string" || !input.relatedId.trim() || input.relatedId.length > 200 || String(input.description ?? "").length > 4e3) throw new Error("Original intent header/body mismatch");
  if (!String(input.idempotencyKey).trim() || String(input.idempotencyKey).length > 200 || input.title !== "recordResourceActivity" || input.amountMinor !== null && !/^\d{1,30}$/.test(String(input.amountMinor))) throw new Error("Invalid original key/purpose/cost");
  if (["dueAt", "partnerId", "userId", "roleId", "evidenceReference", "evidenceChecksumSha256"].some((key) => input[key] !== null) || input.secondaryId !== null && (typeof input.secondaryId !== "string" || !input.secondaryId || input.secondaryId.length > 200)) throw new Error("Original resource purpose contains unsupported fields");
  validateResourceFact(input.type, input.reference, input.quantity, input.unit);
  validateResourceOccurrence(input.occurredAt);
  return packet;
}
function sameResourceIntentOwner(a, b) {
  return a.version === b.version && a.purpose === b.purpose && a.actorId === b.actorId && a.principalId === b.principalId && a.companyId === b.companyId && a.projectId === b.projectId;
}
function unresolvedResourceReceipt(outcome, message) {
  return { outcome, message, intentJson: null, itemId: null, actionId: null, requestDigest: null, resultDigest: null, completedAt: null, factJson: null };
}

// features/keystone/queries/resource-receipt.ts
async function currentResourceIntentScope(context, projectId2, write = false) {
  const current = await resourceAuthority(context, projectId2, write);
  return { version: 2, purpose: "recordResourceActivity", actorId: current.session.itemId, principalId: current.session.authType === "api_key" ? `api:${current.session.apiCredential?.id ?? ""}` : "human", companyId: current.companyId, projectId: projectId2, currencyCode: current.currencyCode };
}
var iso = (value) => value instanceof Date ? value.toISOString() : typeof value === "string" && Number.isFinite(new Date(value).getTime()) ? new Date(value).toISOString() : null;
var object2 = (value) => value && typeof value === "object" ? value : {};
var idOf2 = (value) => String(object2(value).id ?? "");
async function constructionResourceActivityReceipt(_root, { intentJson }, context) {
  const intent = decodeResourceIntent(intentJson);
  const current = await currentResourceIntentScope(context, intent.scope.projectId, true);
  if (!sameResourceIntentOwner(intent.scope, current)) throw new Error("Original resource intent is not authorized for this actor/purpose/company/project");
  const fingerprint = commandDigest(`${intent.scope.companyId}recordResourceActivity${intent.input.idempotencyKey.trim()}`);
  const requestHash = commandDigest(canonicalJson({ operation: "recordResourceActivity", ...intent.input, actorId: intent.scope.actorId, principalId: intent.scope.principalId }));
  const key = await context.sudo().query.IdempotencyKey.findOne({ where: { fingerprint }, query: "id requestHash status operation resourceType resourceId errorCode toStatus expiresAt company { id } project { id } agentAction { id action actorType actorUser { id } requestedBy { id } correlationId targetType targetId targetStatus status reason requestDigest resultDigest completedAt company { id } project { id } }" });
  if (!key) return unresolvedResourceReceipt("not_found", "No original receipt is currently observable. This is not rollback or permission to rekey; retain/retrieve/retry the SAME original.");
  if (key.requestHash !== requestHash) return unresolvedResourceReceipt("conflict", "The original key/body does not match. Preserve it for authorized review; do not replace the key.");
  const action = object2(key.agentAction);
  if (key.status === "failed" && key.errorCode === "ORIGINAL_ADMISSION_CLOSED" && key.toStatus === "closed_before_admission" && !key.resourceId && key.operation === "recordResourceActivity" && key.resourceType === "ResourceLog" && idOf2(key.company) === current.companyId && idOf2(key.project) === current.projectId && action.action === "closeResourceActivityIntent" && action.status === "rejected" && action.targetType === "ResourceLog" && action.targetId === "not-admitted" && action.targetStatus === "closed_before_admission" && action.requestDigest === requestHash && action.resultDigest === commandDigest(`ResourceLogclosed_before_admission${requestHash}`) && action.id && iso(action.completedAt) && idOf2(action.actorUser) === current.actorId && idOf2(action.requestedBy) === current.actorId && idOf2(action.company) === current.companyId && idOf2(action.project) === current.projectId && action.actorType === (current.principalId === "human" ? "human" : "agent") && (current.principalId === "human" || action.correlationId === current.principalId.slice(4)) && typeof action.reason === "string" && action.reason.trim().length >= 3 && action.reason.length <= 500) {
    const final2 = await currentResourceIntentScope(context, current.projectId, true);
    if (!sameResourceIntentOwner(intent.scope, final2)) throw new Error("Original closure authority changed");
    return { outcome: "closed", message: "Original admission explicitly closed under its native key lock; not a rollback assertion or reversal of an accepted fact. A fresh owned resolution permits NEW review.", intentJson: encodeResourceIntent(intent), itemId: null, actionId: String(action.id), requestDigest: requestHash, resultDigest: String(action.resultDigest), completedAt: iso(action.completedAt), factJson: JSON.stringify({ resolution: "closed_before_admission", version: 2, purpose: current.purpose, actorId: current.actorId, principalId: current.principalId, companyId: current.companyId, projectId: current.projectId, resourceId: intent.input.relatedId?.trim(), reason: action.reason }) };
  }
  if (key.operation !== "recordResourceActivity" || key.resourceType !== "ResourceLog" || idOf2(key.company) !== current.companyId || idOf2(key.project) !== current.projectId || key.status !== "completed" || !key.resourceId || !action.id || action.status !== "succeeded" || action.action !== "recordResourceActivity" || action.targetType !== "ResourceLog" || action.targetId !== key.resourceId || action.requestDigest !== requestHash || action.resultDigest !== commandDigest(`ResourceLog${key.resourceId}`) || idOf2(action.actorUser) !== current.actorId || idOf2(action.requestedBy) !== current.actorId || idOf2(action.company) !== current.companyId || idOf2(action.project) !== current.projectId || action.actorType !== (current.principalId === "human" ? "human" : "agent") || current.principalId !== "human" && action.correlationId !== current.principalId.slice(4) || !iso(action.completedAt)) {
    return unresolvedResourceReceipt("unknown", "Original outcome/evidence is incomplete or not currently observable. Expiry is not rejection/rollback; retain the SAME intent for reconciliation.");
  }
  const beforeProjection = await currentResourceIntentScope(context, current.projectId, true);
  if (!sameResourceIntentOwner(intent.scope, beforeProjection)) throw new Error("Original recovery authority changed");
  const [fact] = await context.query.ResourceLog.findMany({
    where: { id: { equals: String(key.resourceId) }, company: { id: { equals: current.companyId } }, project: { id: { equals: current.projectId } } },
    take: 1,
    query: "id resourceType eventType quantity unit occurredAt currencyCode totalCostMinor notes equipment { id } material { id } operator { id }"
  });
  let matches = false;
  try {
    matches = Boolean(fact) && fact.resourceType === intent.input.type && fact.eventType === intent.input.reference && quantityToUnits(String(fact.quantity)) === quantityToUnits(String(intent.input.quantity)) && fact.unit === intent.input.unit?.trim() && iso(fact.occurredAt) === iso(intent.input.occurredAt) && fact.currencyCode === intent.scope.currencyCode && BigInt(String(fact.totalCostMinor)) === BigInt(intent.input.amountMinor || "0") && String(fact.notes ?? "") === (intent.input.description?.trim() ?? "") && idOf2(fact[intent.input.type === "equipment" ? "equipment" : "material"]) === intent.input.relatedId?.trim() && idOf2(fact.operator) === current.actorId;
  } catch {
    matches = false;
  }
  if (!fact || !matches) return unresolvedResourceReceipt("unknown", "Accepted original evidence is not fully observable/matching. Retain the SAME original for authorized review; no replacement key.");
  const final = await currentResourceIntentScope(context, current.projectId, true);
  if (!sameResourceIntentOwner(intent.scope, final)) throw new Error("Original recovery authority changed");
  return {
    outcome: "accepted",
    message: "Complete accepted original receipt retrieved. This observation is not stock, cost or invoice posting.",
    intentJson: encodeResourceIntent(intent),
    itemId: String(fact.id),
    actionId: String(action.id),
    requestDigest: requestHash,
    resultDigest: String(action.resultDigest),
    completedAt: iso(action.completedAt),
    factJson: JSON.stringify({ id: String(fact.id), version: 2, purpose: current.purpose, actorId: current.actorId, principalId: current.principalId, companyId: current.companyId, projectId: current.projectId, resourceId: intent.input.relatedId?.trim(), resourceType: String(fact.resourceType), eventType: String(fact.eventType), quantity: String(fact.quantity), unit: String(fact.unit), occurredAt: iso(fact.occurredAt), currencyCode: String(fact.currencyCode), totalCostMinor: String(fact.totalCostMinor), notes: String(fact.notes ?? "") })
  };
}
async function reconcileResourceActivityIntent(_root, args, context) {
  const receipt = await constructionResourceActivityReceipt(null, args, context);
  if (receipt.outcome !== "accepted") return receipt;
  const intent = decodeResourceIntent(args.intentJson);
  const actionKey = commandDigest(`resource-original-reconciled${receipt.actionId}${receipt.requestDigest}`);
  const prior = await context.sudo().query.AgentAction.findOne({ where: { actionKey }, query: "id" });
  const beforeAppend = await currentResourceIntentScope(context, intent.scope.projectId, true);
  if (!sameResourceIntentOwner(intent.scope, beforeAppend)) throw new Error("Original reconciliation authority changed");
  if (!prior) {
    try {
      await requireCreate(context.sudo(), "AgentAction")({ data: { actionKey, actorType: intent.scope.principalId === "human" ? "human" : "agent", action: "reconcileResourceActivityIntent", status: "succeeded", targetType: "ResourceLog", targetId: receipt.itemId, targetStatus: "accepted_original", reason: "Retrieved complete accepted original; prior ambiguous/failed acknowledgement evidence retained, not rollback", requestDigest: receipt.requestDigest, resultDigest: receipt.resultDigest, correlationId: intent.scope.principalId === "human" ? void 0 : intent.scope.principalId.slice(4), causationId: receipt.actionId, requestedAt: /* @__PURE__ */ new Date(), completedAt: /* @__PURE__ */ new Date(), company: { connect: { id: intent.scope.companyId } }, project: { connect: { id: intent.scope.projectId } }, actorUser: { connect: { id: intent.scope.actorId } }, requestedBy: { connect: { id: intent.scope.actorId } } } });
    } catch {
      const raced = await context.sudo().query.AgentAction.findOne({ where: { actionKey }, query: "id" });
      if (!raced) return unresolvedResourceReceipt("unknown", "Accepted original reconciliation acknowledgement is unavailable; retain the SAME intent.");
    }
  }
  return constructionResourceActivityReceipt(null, args, context);
}
async function closeResourceActivityIntent(_root, { intentJson, reason }, context) {
  const intent = decodeResourceIntent(intentJson);
  const closureReason = requiredText(reason, "Original admission closure reason", 500);
  if (closureReason.length < 3) throw new Error("Original admission closure reason must contain at least three characters");
  const initial = await currentResourceIntentScope(context, intent.scope.projectId, true);
  if (!sameResourceIntentOwner(intent.scope, initial)) throw new Error("Original closure is not authorized for this actor/purpose/company/project");
  const fingerprint = commandDigest(`${initial.companyId}recordResourceActivity${intent.input.idempotencyKey.trim()}`);
  const requestHash = commandDigest(canonicalJson({ operation: "recordResourceActivity", ...intent.input, actorId: initial.actorId, principalId: initial.principalId }));
  if (!context.transaction) throw new Error("Native original-admission transaction is unavailable");
  try {
    await context.transaction(async (tx) => {
      if (!tx.prisma?.$queryRawUnsafe) throw new Error("Native original-admission key lock is unavailable");
      await tx.prisma.$queryRawUnsafe(`SELECT 1::int AS locked FROM pg_advisory_xact_lock(hashtextextended($1, 0))`, fingerprint);
      const current = await currentResourceIntentScope(tx, initial.projectId, true);
      if (!sameResourceIntentOwner(intent.scope, current)) throw new Error("Original closure authority changed");
      const existing = await tx.sudo().query.IdempotencyKey.findOne({ where: { fingerprint }, query: "id" });
      if (existing) return;
      const sudo = tx.sudo();
      const key = await requireCreate(sudo, "IdempotencyKey")({ data: { fingerprint, key: intent.input.idempotencyKey.trim(), operation: "recordResourceActivity", requestHash, status: "failed", resourceType: "ResourceLog", resourceId: "", errorCode: "ORIGINAL_ADMISSION_CLOSED", toStatus: "closed_before_admission", company: { connect: { id: initial.companyId } }, project: { connect: { id: initial.projectId } } } });
      const action = await requireCreate(sudo, "AgentAction")({ data: { actionKey: commandDigest(`original-admission-closed${fingerprint}${requestHash}`), actorType: initial.principalId === "human" ? "human" : "agent", action: "closeResourceActivityIntent", status: "rejected", targetType: "ResourceLog", targetId: "not-admitted", targetStatus: "closed_before_admission", reason: closureReason, requestDigest: requestHash, resultDigest: commandDigest(`ResourceLogclosed_before_admission${requestHash}`), correlationId: initial.principalId === "human" ? void 0 : initial.principalId.slice(4), requestedAt: /* @__PURE__ */ new Date(), completedAt: /* @__PURE__ */ new Date(), company: { connect: { id: initial.companyId } }, project: { connect: { id: initial.projectId } }, actorUser: { connect: { id: initial.actorId } }, requestedBy: { connect: { id: initial.actorId } }, idempotencyKey: { connect: { id: key.id } } } });
      await requireUpdate(sudo, "IdempotencyKey")({ where: { id: key.id }, data: { agentAction: { connect: { id: action.id } } } });
    }, { timeout: 3e4 });
  } catch {
    try {
      return await constructionResourceActivityReceipt(null, { intentJson }, context);
    } catch {
      return unresolvedResourceReceipt("unknown", "Original closure acknowledgement is unavailable or denied; keep the SAME original.");
    }
  }
  return constructionResourceActivityReceipt(null, { intentJson }, context);
}

// features/keystone/domain/public-site.ts
var DEFAULT_PUBLIC_SITE_KEY = "default";
function getTrustedPublicSiteKey() {
  const value = (process.env.PUBLIC_SITE_KEY || DEFAULT_PUBLIC_SITE_KEY).trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) || value.length > 80) {
    throw new Error("PUBLIC_SITE_KEY must be a lowercase slug with at most 80 characters");
  }
  return value;
}
function publicSlug(value, fallback) {
  const slug = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100).replace(/-+$/g, "");
  return slug || fallback;
}

// features/keystone/queries/public-site.ts
var slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function text22(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}
function validateSlug(value) {
  const slug = text22(value).toLowerCase();
  if (!slugPattern.test(slug) || slug.length > 100) throw new Error("Public slug is invalid");
  return slug;
}
async function publishedSite(context) {
  const site = await queryOne(
    context,
    "PublicSiteProfile",
    { siteKey: getTrustedPublicSiteKey() },
    "id siteKey status serviceArea capabilitySummary inquiryEmail inquiryPhone privacyNotice acceptingInquiries company { id status name brandName brandMark brandTagline brandColor logoIcon logoColor }"
  );
  return site?.status === "published" && site.company?.id && site.company.status === "active" ? site : null;
}
async function findMany(context, listKey, where, query, take) {
  const operation = context.sudo().query[listKey]?.findMany;
  if (!operation) throw new Error(`${listKey} public projection is unavailable`);
  return operation({ where, query, take, orderBy: [{ sortOrder: "asc" }, { title: "asc" }] });
}
function projectProjection(record) {
  return {
    slug: text22(record.slug),
    title: text22(record.title),
    summary: text22(record.summary),
    description: text22(record.description),
    market: text22(record.market),
    locationLabel: text22(record.locationLabel),
    deliveryMethod: text22(record.deliveryMethod),
    completionLabel: text22(record.completionLabel),
    approvedOutcome: text22(record.approvedOutcome)
  };
}
function serviceProjection(record) {
  return {
    slug: text22(record.slug),
    title: text22(record.title),
    summary: text22(record.summary),
    details: text22(record.details),
    market: text22(record.market)
  };
}
async function publicConstructionSite(_root, _args, context) {
  const site = await publishedSite(context);
  if (!site?.id || !site.company?.id) return null;
  const [services, projects] = await Promise.all([
    findMany(context, "PublicService", { site: { id: { equals: site.id } }, status: { equals: "published" } }, "slug title summary details market sortOrder", 50),
    findMany(context, "PublicProject", { site: { id: { equals: site.id } }, status: { equals: "published" } }, "slug title summary description market locationLabel deliveryMethod completionLabel approvedOutcome sortOrder", 50)
  ]);
  return {
    brandName: text22(site.company.brandName, text22(site.company.name, "Openfront Construction")),
    brandMark: text22(site.company.brandMark),
    logoIcon: sanitizeStoreLogoSvg(text22(site.company.logoIcon)),
    logoColor: normalizeStoreLogoColor(site.company.logoColor),
    brandTagline: text22(site.company.brandTagline),
    brandColor: text22(site.company.brandColor, "#1D4ED8"),
    serviceArea: text22(site.serviceArea),
    capabilitySummary: text22(site.capabilitySummary),
    inquiryEmail: text22(site.inquiryEmail),
    inquiryPhone: text22(site.inquiryPhone),
    privacyNotice: text22(site.privacyNotice),
    acceptingInquiries: site.acceptingInquiries === true,
    services: services.map(serviceProjection),
    projects: projects.map(projectProjection)
  };
}
async function publicConstructionService(_root, { slug: rawSlug }, context) {
  const site = await publishedSite(context);
  if (!site?.company?.id) return null;
  const slug = validateSlug(rawSlug);
  const record = await queryOne(
    context,
    "PublicService",
    { serviceKey: `${site.company.id}:${slug}` },
    "slug title summary details market status site { id }"
  );
  if (!record || record.status !== "published" || record.site?.id !== site.id) return null;
  return serviceProjection(record);
}
async function publicConstructionProject(_root, { slug: rawSlug }, context) {
  const site = await publishedSite(context);
  if (!site?.company?.id) return null;
  const slug = validateSlug(rawSlug);
  const record = await queryOne(
    context,
    "PublicProject",
    { publicationKey: `${site.company.id}:${slug}` },
    "slug title summary description market locationLabel deliveryMethod completionLabel approvedOutcome status site { id }"
  );
  if (!record || record.status !== "published" || record.site?.id !== site.id) return null;
  return projectProjection(record);
}
async function publicIntakeReceipt(_root, { reference }, context) {
  const site = await publishedSite(context);
  const normalized = text22(reference).toUpperCase();
  if (!site?.company?.id || !/^REQ-[A-F0-9]{24}$/.test(normalized)) return null;
  const record = await queryOne(
    context,
    "IntakeSubmission",
    { publicReference: normalized },
    "publicReference kind status submittedAt company { id }"
  );
  if (!record || record.company?.id !== site.company.id) return null;
  return {
    publicReference: normalized,
    kind: text22(record.kind),
    status: "received",
    submittedAt: new Date(String(record.submittedAt)).toISOString()
  };
}

// features/keystone/mutations/agentActions.ts
var import_node_crypto7 = require("node:crypto");

// features/keystone/domain/agent-authority.ts
function assertAgentPrincipal(session, companyId, projectId2, permission, identityOwnerId) {
  if (!hasProjectPermission(session, companyId, projectId2, permission, true)) throw new Error("Not authorized for this agent action domain and project");
  if (session.authType === "api_key" && !session.apiCredential?.scopes.some((scope) => scopeAllows(scope, "agents:execute"))) throw new Error("An explicit agents:execute credential scope is required");
  if (identityOwnerId !== session.itemId && !hasProjectPermission(session, companyId, projectId2, "canManageAgents", true)) throw new Error("Not authorized for this agent identity");
}
function sqlPort(context) {
  const sql = context.prisma?.$queryRawUnsafe?.bind(context.prisma);
  if (!sql) throw new Error("Transactional agent authority locking is unavailable");
  return sql;
}
async function lockAgentIdentityGrant(context, input, mode = "active") {
  const sql = sqlPort(context);
  const [discovered] = await sql('SELECT id, owner AS "ownerId", company AS "companyId", status::text, "approvalMode"::text FROM "AgentIdentity" WHERE id = $1', input.identityId);
  if (!discovered || mode === "active" && !discovered.ownerId || discovered.companyId !== input.companyId) throw new Error("Agent identity is unavailable for this company");
  await sql('SELECT id FROM "User" WHERE id = $1 FOR SHARE', discovered.ownerId);
  const companyMemberships = await sql(`SELECT id, status::text FROM "CompanyMembership" WHERE "user" = $1 AND company = $2 AND status = 'active' ORDER BY id LIMIT 1 FOR SHARE`, discovered.ownerId, input.companyId);
  const projectMemberships = companyMemberships.length ? [] : await sql(`SELECT membership.id, membership.status::text FROM "ProjectMembership" membership JOIN "Project" project ON project.id = membership.project WHERE membership."user" = $1 AND project.company = $2 AND membership.status = 'active' ORDER BY membership.id LIMIT 1 FOR SHARE OF membership`, discovered.ownerId, input.companyId);
  const [identity] = await sql('SELECT id, owner AS "ownerId", company AS "companyId", status::text, "approvalMode"::text FROM "AgentIdentity" WHERE id = $1 FOR SHARE', input.identityId);
  if (!identity || identity.ownerId !== discovered.ownerId || identity.companyId !== input.companyId || mode === "active" && identity.status !== "active") throw new Error("Agent identity is inactive or changed");
  const [owner] = await sql('SELECT id FROM "User" WHERE id = $1 AND "isActive" = true', identity.ownerId);
  if (mode === "active" && (!owner || ![...companyMemberships, ...projectMemberships].some((member) => member.status === "active"))) throw new Error("Agent owner is no longer active in this company");
  const [grant] = await sql('SELECT id, "agentIdentity" AS "identityId", company AS "companyId", project AS "projectId", status::text, scope, "expiresAt" FROM "ScopeGrant" WHERE id = $1 FOR SHARE', input.grantId);
  if (!grant || grant.identityId !== identity.id || grant.companyId !== input.companyId || mode === "active" && !scopeGrantMatches(grant, input)) throw new Error("Agent scope is inactive, expired, revoked or out of scope");
  return { identity, grant };
}
async function selectAndLockAgentGrant(context, input) {
  const broader = input.requiredScope.endsWith(":read") ? input.requiredScope.replace(/:read$/, ":write") : input.requiredScope;
  const [candidate] = await sqlPort(context)(`SELECT id FROM "ScopeGrant"
    WHERE "agentIdentity" = $1 AND company = $2 AND (project IS NULL OR project = $3)
      AND status = 'active' AND scope IN ($4, $5) AND ("expiresAt" IS NULL OR "expiresAt" > CURRENT_TIMESTAMP)
    ORDER BY (project IS NOT NULL) DESC, id ASC LIMIT 1`, input.identityId, input.companyId, input.projectId, input.requiredScope, broader);
  if (!candidate) throw new Error("Agent identity lacks an active scope grant for this action");
  return lockAgentIdentityGrant(context, { ...input, grantId: candidate.id });
}
async function discoverAgentAction(context, actionId) {
  const [action] = await sqlPort(context)(`SELECT id, status::text, action, "targetType", "targetId", "targetStatus", "requiredScope",
    company AS "companyId", project AS "projectId", "agentIdentity" AS "identityId", "scopeGrant" AS "grantId", "requestedBy" AS "requestedById", "reviewedBy" AS "reviewedById"
    FROM "AgentAction" WHERE id = $1`, actionId);
  if (!action) throw new Error("Agent action not found");
  return action;
}
async function lockAgentActionChain(context, expected, requiredScope, mode = "active") {
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
async function compareAndSetAgentAction(context, id, from, to) {
  const rows3 = await sqlPort(context)('UPDATE "AgentAction" SET status = $3::"AgentActionStatusType" WHERE id = $1 AND status::text = $2 RETURNING id', id, from, to);
  if (rows3.length !== 1) throw new Error("Agent action state changed; no outcome was overwritten");
}

// features/keystone/mutations/lifecycle.ts
var import_node_crypto6 = require("node:crypto");

// features/keystone/domain/billing-invariants.ts
function assertSettlementCompatibility(input) {
  const expectedDirection = input.claimSide === "owner" ? "receipt" : "disbursement";
  if (input.paymentDirection !== expectedDirection) {
    throw new Error(`A ${input.claimSide} claim requires a ${expectedDirection} payment`);
  }
  if (input.paymentCurrencyCode.toUpperCase() !== input.claimCurrencyCode.toUpperCase()) {
    throw new Error("Payment and claim currencies must match");
  }
  if (input.paymentPartnerId !== input.claimPartnerId) {
    throw new Error("Payment counterparty must match the progress claim");
  }
}
function deriveClaimPaymentStatus(dueMinor, settledAllocatedMinor) {
  if (dueMinor <= BigInt(0) || settledAllocatedMinor < BigInt(0)) throw new Error("Claim due and settlement totals must be positive/non-negative");
  if (settledAllocatedMinor > dueMinor) throw new Error("Settled allocations exceed claim payment due");
  if (settledAllocatedMinor === BigInt(0)) return "approved";
  if (settledAllocatedMinor === dueMinor) return "paid";
  return "partially_paid";
}
function remainingCapacityMinor(capacityMinor, consumedMinor) {
  if (capacityMinor < BigInt(0) || consumedMinor < BigInt(0)) throw new Error("Financial capacity values cannot be negative");
  return capacityMinor > consumedMinor ? capacityMinor - consumedMinor : BigInt(0);
}

// features/keystone/domain/lifecycle-prerequisites.ts
function rows2(value) {
  return Array.isArray(value) ? value : [];
}
function boundedRows(value, limit, label) {
  const records = rows2(value);
  if (records.length > limit) throw new Error(`${label} exceeds the supported ${limit}-record review limit`);
  return records;
}
function statusOf(value) {
  return String(value.status ?? "");
}
async function effectiveClaimSettlement(context, id) {
  const prisma = context.prisma;
  if (prisma?.$queryRawUnsafe) {
    const [result] = await prisma.$queryRawUnsafe(
      `SELECT claim.status::text AS status, claim."currentPaymentDueMinor" AS due,
              COALESCE(SUM(allocation."amountMinor") FILTER (WHERE payment.status = 'settled'), 0)::bigint AS allocated
       FROM "ProgressClaim" claim
       LEFT JOIN "PaymentAllocation" allocation ON allocation."progressClaim" = claim.id
       LEFT JOIN "Payment" payment ON payment.id = allocation.payment
       WHERE claim.id = $1 GROUP BY claim.id`,
      id
    );
    if (!result) throw new Error("Progress claim settlement ledger is unavailable");
    return result;
  }
  const record = await queryById(context, "ProgressClaim", id, "id status currentPaymentDueMinor allocations(take: 501) { amountMinor payment { status } }");
  if (!record?.id) throw new Error("Progress claim is unavailable");
  const allocations = rows2(record.allocations);
  if (allocations.length > 500) throw new Error("Settlement ledger exceeds the bounded verification limit");
  const allocated = allocations.reduce(
    (total2, allocation) => statusOf(allocation.payment ?? {}) === "settled" ? total2 + BigInt(String(allocation.amountMinor ?? 0)) : total2,
    BigInt(0)
  );
  return { status: statusOf(record), due: BigInt(String(record.currentPaymentDueMinor ?? 0)), allocated };
}
async function requireApprovedSnapshot(context, listKey, id, targetStatus) {
  const approvals = await context.sudo().query.ApprovalRequest.findMany({
    where: { targetType: { equals: listKey }, targetId: { equals: id }, targetStatus: { equals: targetStatus }, status: { equals: "approved" } },
    take: 101,
    orderBy: [{ decidedAt: "desc" }, { id: "desc" }],
    query: "id decidedAt canonicalSnapshot snapshotDigest policySnapshot policyDigest policy { id }"
  });
  if (approvals.length > 100) throw new Error("Approval history exceeds the supported verification limit");
  if (!approvals.length) throw new Error(`${listKey} requires an approved, value-bound approval request`);
  const current = await lockApprovalSnapshot(context, listKey, id);
  for (const approved of approvals) {
    const policy = approved.policy;
    if (!approved.id || !approved.decidedAt || !policy || typeof policy !== "object" || !("id" in policy) || typeof policy.id !== "string" || typeof approved.policySnapshot !== "string" || typeof approved.policyDigest !== "string" || digestApprovalSnapshot(approved.policySnapshot) !== approved.policyDigest || !matchesApprovalSnapshot(current, approved.canonicalSnapshot, approved.snapshotDigest)) continue;
    const currentPolicy = await lockApprovalPolicySnapshot(context, policy.id);
    if (currentPolicy.snapshotDigest === approved.policyDigest) return;
  }
  throw new Error(`${listKey} terms, snapshot version or policy changed; request a new value-bound approval`);
}
async function assertTransitionPrerequisites(context, listKey, id, toStatus) {
  if (["BudgetChange", "PrimeContract", "ChangeOrder", "ProgressClaim", "RetainageRelease"].includes(listKey) && toStatus === "approved") {
    await requireApprovedSnapshot(context, listKey, id, toStatus);
  }
  switch (listKey) {
    case "BidPackage": {
      if (toStatus !== "open") return;
      const record = await queryById(context, listKey, id, "id invitations(take: 1) { id }");
      if (rows2(record?.invitations).length === 0) throw new Error("A bid package requires at least one persisted invitation before issue");
      return;
    }
    case "Estimate": {
      if (toStatus !== "issued") return;
      const record = await queryById(context, listKey, id, "id currentVersion { id status lineItems(take: 1) { id } }");
      const version = record?.currentVersion;
      if (!version?.id || rows2(version.lineItems).length === 0) throw new Error("An estimate requires a current version with line items before issue");
      return;
    }
    case "BudgetChange": {
      if (toStatus !== "pending_approval" && toStatus !== "posted") return;
      const record = await queryById(context, listKey, id, "id lineItems(take: 1) { id }");
      if (rows2(record?.lineItems).length === 0) throw new Error("A budget change requires at least one line item");
      return;
    }
    case "PrimeContract":
    case "Commitment": {
      if (!["pending_approval", "out_for_signature", "executed"].includes(toStatus)) return;
      const record = await queryById(context, listKey, id, "id lineItems(take: 1) { id }");
      if (rows2(record?.lineItems).length === 0) throw new Error(`${listKey} requires a schedule of values before this transition`);
      return;
    }
    case "ChangeOrder": {
      if (!["pending_approval", "approved", "executed", "posted"].includes(toStatus)) return;
      const record = await queryById(context, listKey, id, "id lineItems(take: 1) { id }");
      if (rows2(record?.lineItems).length === 0) throw new Error("A change order requires persisted line items");
      return;
    }
    case "RFI": {
      if (toStatus !== "answered" && toStatus !== "closed") return;
      const count2 = await queryCount(context, "RFIResponse", {
        rfi: { id: { equals: id } },
        isOfficial: { equals: true }
      });
      if (count2 < 1) throw new Error("An RFI requires an official response before it can be answered or closed");
      return;
    }
    case "Submittal": {
      if (!["under_review", "approved", "revise_resubmit", "rejected", "closed"].includes(toStatus)) return;
      const record = await queryById(context, listKey, id, "id revision");
      const revision = Number(record?.revision ?? 0);
      const current = await queryById(context, listKey, id, `id reviews(where: { submittalRevision: { equals: ${revision} } }, take: 101, orderBy: { sequence: asc }) { id status completedAt }`);
      const reviews = boundedRows(current?.reviews, 100, "Submittal review route");
      if (reviews.length === 0) throw new Error("A submittal requires a persisted review route for its current revision");
      if (toStatus === "approved" && reviews.some((review) => !["approved", "approved_as_noted"].includes(statusOf(review)))) {
        throw new Error("Every submittal review step must be approved before approval");
      }
      if (toStatus === "revise_resubmit" && !reviews.some((review) => statusOf(review) === "revise_resubmit")) {
        throw new Error("Revise-and-resubmit requires a matching review decision");
      }
      if (toStatus === "rejected" && !reviews.some((review) => statusOf(review) === "rejected")) {
        throw new Error("Submittal rejection requires a rejected review decision");
      }
      return;
    }
    case "ProgressClaim": {
      if (!["submitted", "under_review", "approved", "partially_paid", "paid", "closed"].includes(toStatus)) return;
      const record = await queryById(context, listKey, id, "id status lineItems(take: 500) { id earnedLessRetainageMinor }");
      const lines = rows2(record?.lineItems);
      if (lines.length === 0) throw new Error("A progress claim requires immutable schedule-of-values snapshots");
      if (toStatus === "partially_paid" || toStatus === "paid") {
        throw new Error("Claim settlement status is derived from settled allocations and cannot be set manually");
      }
      if (toStatus === "closed") {
        const settlement = await effectiveClaimSettlement(context, id);
        if (record?.status === "approved") {
          if (settlement.due !== BigInt(0) || settlement.allocated !== BigInt(0)) {
            throw new Error("Only a claim with no payment due can close without settlement");
          }
          return;
        }
        const derived = deriveClaimPaymentStatus(settlement.due, settlement.allocated);
        if (record?.status !== "paid" || derived !== "paid") {
          throw new Error("A claim can close only after settled allocations cover its full current payment due");
        }
      }
      return;
    }
    case "SafetyIncident": {
      if (toStatus !== "closed") return;
      const record = await queryById(context, listKey, id, "id severity correctiveActions(take: 101) { id status }");
      const actions = boundedRows(record?.correctiveActions, 100, "Incident corrective actions");
      if (["serious", "critical", "fatal"].includes(String(record?.severity)) && actions.length === 0) {
        throw new Error("Serious safety incidents require corrective action evidence before closure");
      }
      if (actions.some((action) => !["verified", "closed"].includes(statusOf(action)))) {
        throw new Error("All incident corrective actions must be verified before closure");
      }
      return;
    }
    case "Inspection": {
      if (!["passed", "failed", "closed"].includes(toStatus)) return;
      const record = await queryById(context, listKey, id, "id status items(take: 501) { id result response correctiveActions(take: 101) { status } }");
      const items = boundedRows(record?.items, 500, "Inspection items");
      for (const item3 of items) boundedRows(item3.correctiveActions, 100, "Inspection item corrective actions");
      if (items.length === 0 || items.some((entry) => statusOf({ status: entry.result }) === "pending")) {
        throw new Error("Every inspection item requires a recorded result");
      }
      if (toStatus === "passed" && items.some((entry) => !["pass", "not_applicable"].includes(String(entry.result)))) {
        throw new Error("An inspection with a failed item cannot be marked passed");
      }
      if (toStatus === "failed" && !items.some((entry) => entry.result === "fail")) {
        throw new Error("A failed inspection requires at least one failed item");
      }
      if (toStatus === "closed" && record?.status === "failed") {
        const failedItems = items.filter((entry) => entry.result === "fail");
        if (failedItems.some((entry) => rows2(entry.correctiveActions).length === 0)) {
          throw new Error("Every failed inspection item requires a corrective action before closure");
        }
        const unresolved = failedItems.flatMap((entry) => rows2(entry.correctiveActions)).some((action) => !["verified", "closed"].includes(statusOf(action)));
        if (unresolved) throw new Error("Failed inspection corrections must be verified before closure");
      }
      return;
    }
    case "Schedule": {
      if (toStatus !== "published") return;
      const count2 = await queryCount(context, "ScheduleTask", { schedule: { id: { equals: id } } });
      if (count2 < 1) throw new Error("A schedule requires at least one planned task before publication");
      return;
    }
    case "ScheduleTask": {
      if (toStatus !== "completed") return;
      const record = await queryById(context, listKey, id, "id percentComplete");
      if (Number(record?.percentComplete ?? 0) !== 100) throw new Error("A schedule task must record 100 percent progress before completion");
      return;
    }
    case "DailyLog": {
      if (toStatus !== "submitted" && toStatus !== "approved") return;
      const count2 = await queryCount(context, "DailyLogEntry", { dailyLog: { id: { equals: id } } });
      if (count2 < 1) throw new Error("A daily log requires at least one field entry before submission");
      return;
    }
    case "PunchItem": {
      if (toStatus !== "closed") return;
      const count2 = await queryCount(context, "CorrectiveAction", {
        punchItem: { id: { equals: id } },
        status: { in: ["verified", "closed"] }
      });
      if (count2 < 1) throw new Error("Punch closure requires a verified corrective action");
      return;
    }
    case "SafetyObservation": {
      if (toStatus !== "resolved" && toStatus !== "closed") return;
      const record = await queryById(context, listKey, id, "id observationType correctiveActions(take: 101) { status }");
      if (record?.observationType === "safe_practice") return;
      const actions = boundedRows(record?.correctiveActions, 100, "Observation corrective actions");
      if (actions.length === 0 || actions.some((action) => !["verified", "closed"].includes(statusOf(action)))) {
        throw new Error("Unsafe observations require verified corrective evidence");
      }
      return;
    }
    case "CorrectiveAction": {
      if (toStatus !== "ready_for_verification" && toStatus !== "verified" && toStatus !== "closed") return;
      const record = await queryById(context, listKey, id, "id completedAt verifiedAt completionNotes evidenceReference evidenceChecksumSha256");
      if (["ready_for_verification", "verified", "closed"].includes(toStatus) && (!record?.completedAt || !String(record.completionNotes ?? "").trim() || !String(record.evidenceReference ?? "").trim() || !/^[a-f0-9]{64}$/i.test(String(record.evidenceChecksumSha256 ?? "")))) {
        throw new Error("Corrective work requires completion notes and SHA-256-bound evidence before verification");
      }
      return;
    }
    case "Payment": {
      if (toStatus !== "authorized" && toStatus !== "settled") return;
      const record = await queryById(context, listKey, id, "id reference paidAt");
      if (!String(record?.reference ?? "").trim() || !record?.paidAt) {
        throw new Error("Manual payment authorization/settlement requires an external reference and effective date");
      }
      return;
    }
    case "RetainageRelease": {
      if (toStatus !== "released") return;
      const record = await queryById(context, listKey, id, `
        id amountMinor payment { id status amountMinor direction currencyCode tradePartner { id } project { id } }
        progressClaim { id status retainageMinor claimType currencyCode tradePartner { id } project { id } }
      `);
      const payment = record?.payment;
      const claim = record?.progressClaim;
      const paymentPartner = payment?.tradePartner;
      const claimPartner = claim?.tradePartner;
      const paymentProject = payment?.project;
      const claimProject = claim?.project;
      if (!payment?.id || payment.status !== "settled" || !claim?.id || paymentProject?.id !== claimProject?.id) {
        throw new Error("Retainage release requires a settled payment and claim from the same project");
      }
      assertSettlementCompatibility({
        claimSide: claim.claimType === "owner" ? "owner" : "commitment",
        claimPartnerId: claimPartner?.id ? String(claimPartner.id) : null,
        claimCurrencyCode: String(claim.currencyCode ?? ""),
        paymentDirection: String(payment.direction),
        paymentPartnerId: paymentPartner?.id ? String(paymentPartner.id) : null,
        paymentCurrencyCode: String(payment.currencyCode ?? "")
      });
      const prisma = context.prisma;
      if (!prisma?.$queryRawUnsafe) throw new Error("Retainage release capacity lock is unavailable");
      await prisma.$queryRawUnsafe(`SELECT id FROM "Payment" WHERE id = $1 FOR UPDATE`, String(payment.id));
      await prisma.$queryRawUnsafe(`SELECT id FROM "ProgressClaim" WHERE id = $1 FOR UPDATE`, String(claim.id));
      const [claimReserved] = await prisma.$queryRawUnsafe(
        `SELECT COALESCE(SUM("amountMinor"), 0)::bigint AS total FROM "RetainageRelease"
         WHERE "progressClaim" = $1 AND status IN ('requested', 'approved', 'released')`,
        String(claim.id)
      );
      const [paymentAllocated] = await prisma.$queryRawUnsafe(
        `SELECT COALESCE(SUM(allocation."amountMinor"), 0)::bigint AS total
         FROM "PaymentAllocation" allocation JOIN "Payment" p ON p.id = allocation.payment
         WHERE allocation.payment = $1 AND p.status = 'settled'`,
        String(payment.id)
      );
      const [paymentReserved] = await prisma.$queryRawUnsafe(
        `SELECT COALESCE(SUM("amountMinor"), 0)::bigint AS total FROM "RetainageRelease"
         WHERE payment = $1 AND status IN ('requested', 'approved', 'released')`,
        String(payment.id)
      );
      if ((claimReserved?.total ?? BigInt(0)) > BigInt(String(claim.retainageMinor ?? 0))) {
        throw new Error("Active retainage releases exceed the claim's held retainage");
      }
      if ((paymentAllocated?.total ?? BigInt(0)) + (paymentReserved?.total ?? BigInt(0)) > BigInt(String(payment.amountMinor ?? 0))) {
        throw new Error("Settled claim allocations and retainage releases exceed payment capacity");
      }
      return;
    }
    case "LienWaiver": {
      if (toStatus !== "received" && toStatus !== "accepted") return;
      const record = await queryById(context, listKey, id, "id receivedAt signedAt signerName fileName checksumSha256");
      if (!record?.receivedAt || !record?.signedAt || !record?.signerName || !record?.fileName || !record?.checksumSha256) {
        throw new Error("Waiver receipt/acceptance requires signed file evidence and checksum");
      }
      return;
    }
    case "ProcurementRequest": {
      if (!["submitted", "approved", "ordered", "partially_received", "received", "closed"].includes(toStatus)) return;
      const record = await queryById(context, listKey, id, `
        id commitment { id }
        lines(take: 1001) { id quantity }
        receipts(take: 1001) { id status lines(take: 1001) { quantityReceived quantityAccepted quantityRejected requestLine { id } } }
      `);
      const lines = rows2(record?.lines);
      if (lines.length === 0 || lines.length > 1e3) throw new Error("A procurement request requires a bounded, non-empty line set");
      if (["ordered", "partially_received", "received", "closed"].includes(toStatus) && !record?.commitment?.id) {
        throw new Error("Ordered procurement requires a linked purchase order or commitment");
      }
      if (!["partially_received", "received", "closed"].includes(toStatus)) return;
      const orderedByLine = new Map(lines.map((line) => [String(line.id), quantityToUnits(String(line.quantity ?? "0"))]));
      const receipts = rows2(record?.receipts);
      if (receipts.length > 1e3) throw new Error("Receipt history exceeds the bounded state-verification limit");
      let acceptedTotal = BigInt(0);
      const acceptedByLine = /* @__PURE__ */ new Map();
      for (const receipt of receipts) {
        if (statusOf(receipt) === "voided") continue;
        for (const receiptLine of rows2(receipt.lines)) {
          const requestLineId = String(receiptLine.requestLine?.id ?? "");
          const ordered2 = orderedByLine.get(requestLineId);
          if (ordered2 === void 0) throw new Error("Every receipt line must belong to a line on this procurement request");
          const received = quantityToUnits(String(receiptLine.quantityReceived ?? "0"));
          const accepted = quantityToUnits(String(receiptLine.quantityAccepted ?? "0"));
          const rejected = quantityToUnits(String(receiptLine.quantityRejected ?? "0"));
          if (!receiptTotalsAreValid({ receivedUnits: received, acceptedUnits: accepted, rejectedUnits: rejected })) {
            throw new Error("Every receipt line must reconcile received, accepted, and rejected quantities");
          }
          acceptedTotal += accepted;
          acceptedByLine.set(requestLineId, (acceptedByLine.get(requestLineId) ?? BigInt(0)) + accepted);
        }
      }
      for (const [lineId, accepted] of acceptedByLine) {
        if (accepted > (orderedByLine.get(lineId) ?? BigInt(0))) throw new Error("Accepted receipts exceed the ordered quantity for a request line");
      }
      const orderedTotal = [...orderedByLine.values()].reduce((sum2, quantity) => sum2 + quantity, BigInt(0));
      const derivedStatus = deriveProcurementReceiptStatus(orderedTotal, acceptedTotal);
      if (toStatus === "partially_received" && derivedStatus !== "partially_received") {
        throw new Error("Partially received status requires accepted quantities greater than zero and below the order total");
      }
      if ((toStatus === "received" || toStatus === "closed") && derivedStatus !== "received") {
        throw new Error("Received or closed procurement requires accepted quantities covering every ordered line");
      }
      return;
    }
    default:
      return;
  }
}

// features/keystone/mutations/lifecycle.ts
function requireCreate2(sudo, listKey) {
  const createOne = sudo.db[listKey]?.createOne;
  if (!createOne) throw new Error(`${listKey} create mutation is unavailable`);
  return createOne;
}
function requireUpdate2(sudo, listKey) {
  const updateOne = sudo.db[listKey]?.updateOne;
  if (!updateOne) throw new Error(`${listKey} update mutation is unavailable`);
  return updateOne;
}
async function runLifecycleTransaction(context, callback) {
  if (context.__constructionTransaction) return callback(context);
  if (!context.transaction) throw new Error("Transactional lifecycle context is required");
  return context.transaction(callback, { timeout: 3e4 });
}
async function compareAndSetStatus(sudo, listKey, id, fromStatus, toStatus, metadata2) {
  const prismaKey = `${listKey[0].toLowerCase()}${listKey.slice(1)}`;
  const updateMany = sudo.prisma?.[prismaKey]?.updateMany;
  if (updateMany) {
    const updated = await updateMany({ where: { id, status: fromStatus }, data: { status: toStatus, ...metadata2 } });
    if (updated.count !== 1) throw new Error(`${listKey} changed concurrently; reload before retrying`);
    return;
  }
  await requireUpdate2(sudo, listKey)({ where: { id }, data: { status: toStatus, ...metadata2 } });
}
async function applyFinancialTransitionEffects(sudo, listKey, id, toStatus) {
  const prisma = sudo.prisma;
  if (listKey === "BudgetChange" && toStatus === "posted") {
    if (!prisma?.$queryRawUnsafe || !prisma.$executeRawUnsafe) throw new Error("Transactional budget revision is unavailable");
    const [change] = await prisma.$queryRawUnsafe(
      `SELECT change."totalAmountMinor" AS total, change.budget AS "budgetId", change.project AS "projectId", change."currencyCode" AS currency,
              budget."currencyCode" AS "budgetCurrency", budget.status::text AS "budgetStatus"
       FROM "BudgetChange" change JOIN "Budget" budget ON budget.id = change.budget
       WHERE change.id = $1 FOR UPDATE OF change, budget`,
      id
    );
    if (!change || change.budgetStatus !== "active" || change.currency !== "USD" || change.budgetCurrency !== change.currency) throw new Error("Budget revision requires its active same-currency budget");
    const lines2 = await prisma.$queryRawUnsafe(
      `SELECT entry."amountMinor" AS amount, line.id AS "lineId", line."budgetCode" AS "codeId", entry."budgetCode" AS "sourceCodeId", line.budget AS "budgetId", line.project AS "projectId"
       FROM "BudgetChangeLineItem" entry JOIN "BudgetLineItem" line ON line.id = entry."budgetLineItem"
       WHERE entry."budgetChange" = $1 ORDER BY line.id FOR UPDATE OF entry, line`,
      id
    );
    const [count2] = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "BudgetChangeLineItem" WHERE "budgetChange" = $1', id);
    if (!lines2.length || count2.count !== lines2.length || lines2.reduce((total2, line) => total2 + line.amount, BigInt(0)) !== change.total || lines2.some((line) => line.budgetId !== change.budgetId || line.projectId !== change.projectId || line.codeId !== line.sourceCodeId)) throw new Error("Budget revision lines must exactly match the approved budget and total");
    for (const line of lines2) {
      const updated2 = await prisma.$executeRawUnsafe(
        `UPDATE "BudgetLineItem" SET "approvedChangesMinor" = "approvedChangesMinor" + $1,
          "revisedAmountMinor" = "revisedAmountMinor" + $1, "projectedOverUnderMinor" = "projectedOverUnderMinor" + $1, "updatedAt" = CURRENT_TIMESTAMP
         WHERE id = $2 AND "revisedAmountMinor" + $1 >= 0`,
        line.amount,
        line.lineId
      );
      if (updated2 !== 1) throw new Error("Budget revision would make a line negative");
    }
    const updated = await prisma.$executeRawUnsafe('UPDATE "Budget" SET "totalRevisedMinor" = "totalRevisedMinor" + $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2 AND "totalRevisedMinor" + $1 >= 0', change.total, change.budgetId);
    if (updated !== 1) throw new Error("Budget revision would make the budget negative");
    return;
  }
  if (listKey === "Commitment" && toStatus === "cancelled") {
    if (!prisma?.$queryRawUnsafe || !prisma.$executeRawUnsafe) throw new Error("Transactional commitment cancellation is unavailable");
    const [commitment] = await prisma.$queryRawUnsafe('SELECT project AS "projectId" FROM "Commitment" WHERE id = $1 FOR UPDATE', id);
    if (!commitment) throw new Error("Commitment not found");
    const [claims] = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "ProgressClaim" WHERE commitment = $1', id);
    if (claims.count) throw new Error("A commitment with claim evidence cannot be cancelled as an unperformed draft");
    const lines2 = await prisma.$queryRawUnsafe('SELECT "budgetCode" AS "codeId", "revisedValueMinor" AS amount FROM "ContractLineItem" WHERE commitment = $1 ORDER BY "budgetCode", id FOR UPDATE', id);
    const byCode = /* @__PURE__ */ new Map();
    for (const line of lines2) {
      if (!line.codeId || line.amount < BigInt(0)) throw new Error("Commitment cancellation requires valid budget-coded lines");
      byCode.set(line.codeId, (byCode.get(line.codeId) || BigInt(0)) + line.amount);
    }
    for (const [codeId, amount3] of byCode) {
      const [line] = await prisma.$queryRawUnsafe(
        `SELECT line.id, line.budget AS "budgetId" FROM "BudgetLineItem" line JOIN "Budget" budget ON budget.id = line.budget
         WHERE line.project = $1 AND line."budgetCode" = $2 AND budget.status = 'active' FOR UPDATE OF line, budget`,
        commitment.projectId,
        codeId
      );
      if (!line) throw new Error("Active budget line for commitment cancellation is unavailable");
      const updated = await prisma.$executeRawUnsafe(
        `UPDATE "BudgetLineItem" SET "committedAmountMinor" = "committedAmountMinor" - $1,
          "projectedFinalCostMinor" = "projectedFinalCostMinor" - $1, "projectedOverUnderMinor" = "projectedOverUnderMinor" + $1, "updatedAt" = CURRENT_TIMESTAMP
         WHERE id = $2 AND "committedAmountMinor" >= $1 AND "projectedFinalCostMinor" >= $1`,
        amount3,
        line.id
      );
      const header = await prisma.$executeRawUnsafe('UPDATE "Budget" SET "totalCommittedMinor" = "totalCommittedMinor" - $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2 AND "totalCommittedMinor" >= $1', amount3, line.budgetId);
      if (updated !== 1 || header !== 1) throw new Error("Commitment cancellation would violate budget conservation");
    }
    return;
  }
  if (listKey === "ProgressClaim" && toStatus === "approved") {
    if (!prisma?.$queryRawUnsafe || !prisma.$executeRawUnsafe) throw new Error("Transactional claim rollup is unavailable");
    const [claim] = await prisma.$queryRawUnsafe(
      `SELECT commitment AS "commitmentId", "primeContract" AS "primeContractId" FROM "ProgressClaim" WHERE id = $1 FOR UPDATE`,
      id
    );
    if (!claim || Boolean(claim.commitmentId) === Boolean(claim.primeContractId)) throw new Error("Approved claim must reference exactly one contract");
    if (claim.commitmentId) {
      await prisma.$executeRawUnsafe(
        `UPDATE "Commitment" SET "invoicedToDateMinor" = (
          SELECT COALESCE(SUM("currentPaymentDueMinor"), 0)::bigint FROM "ProgressClaim"
          WHERE commitment = $1 AND status IN ('approved','partially_paid','paid','closed')
        ) WHERE id = $1`,
        claim.commitmentId
      );
    } else if (claim.primeContractId) {
      await prisma.$executeRawUnsafe(
        `UPDATE "PrimeContract" SET "billedToDateMinor" = (
          SELECT COALESCE(SUM("currentPaymentDueMinor"), 0)::bigint FROM "ProgressClaim"
          WHERE "primeContract" = $1 AND status IN ('approved','partially_paid','paid','closed')
        ) WHERE id = $1`,
        claim.primeContractId
      );
    }
    return;
  }
  if (listKey !== "ChangeOrder" || toStatus !== "posted") return;
  if (!prisma?.$queryRawUnsafe || !prisma.$executeRawUnsafe) throw new Error("Transactional change-order rollup is unavailable");
  const [order] = await prisma.$queryRawUnsafe(
    `SELECT direction::text, "totalMinor", "primeContract" AS "primeContractId", commitment AS "commitmentId", project AS "projectId"
     FROM "ChangeOrder" WHERE id = $1 FOR UPDATE`,
    id
  );
  if (!order) throw new Error("Posted change order is unavailable for rollup");
  const lines = await prisma.$queryRawUnsafe(
    `SELECT "amountMinor", "budgetCode" AS "budgetCodeId", "contractLineItem" AS "contractLineItemId"
     FROM "ChangeOrderLineItem" WHERE "changeOrder" = $1 ORDER BY "lineNumber" ASC FOR UPDATE`,
    id
  );
  if (lines.length === 0) throw new Error("Posted change order requires line items for rollup");
  const lineTotal = lines.reduce((total2, line) => total2 + line.amountMinor, BigInt(0));
  if (lineTotal !== order.totalMinor) throw new Error("Change-order header and line totals must match before posting");
  if (order.direction === "owner") {
    if (!order.primeContractId || order.commitmentId) throw new Error("Owner change order requires exactly one prime contract");
    const updated = await prisma.$executeRawUnsafe(
      `UPDATE "PrimeContract" SET "approvedChangesMinor" = "approvedChangesMinor" + $1,
       "revisedContractMinor" = "revisedContractMinor" + $1 WHERE id = $2 AND "revisedContractMinor" + $1 >= 0`,
      order.totalMinor,
      order.primeContractId
    );
    if (updated !== 1) throw new Error("Prime-contract change rollup failed");
  } else {
    if (!order.commitmentId || order.primeContractId) throw new Error("Commitment change order requires exactly one commitment");
    const updated = await prisma.$executeRawUnsafe(
      `UPDATE "Commitment" SET "approvedChangesMinor" = "approvedChangesMinor" + $1,
       "revisedContractMinor" = "revisedContractMinor" + $1 WHERE id = $2 AND "revisedContractMinor" + $1 >= 0`,
      order.totalMinor,
      order.commitmentId
    );
    if (updated !== 1) throw new Error("Commitment change rollup failed");
  }
  for (const line of lines) {
    if (line.contractLineItemId) {
      const updated = await prisma.$executeRawUnsafe(
        `UPDATE "ContractLineItem" SET "approvedChangesMinor" = "approvedChangesMinor" + $1,
         "revisedValueMinor" = "revisedValueMinor" + $1 WHERE id = $2 AND "revisedValueMinor" + $1 >= 0`,
        line.amountMinor,
        line.contractLineItemId
      );
      if (updated !== 1) throw new Error("Contract schedule-of-values rollup failed");
    }
    if (order.direction === "commitment") {
      if (!line.budgetCodeId) throw new Error("Commitment change lines require a budget code for project cost rollup");
      const [budgetLine] = await prisma.$queryRawUnsafe(
        `SELECT line.id, line.budget AS "budgetId" FROM "BudgetLineItem" line
         JOIN "Budget" budget ON budget.id = line.budget
         WHERE line.project = $1 AND line."budgetCode" = $2 AND budget.status = 'active'
         ORDER BY line."createdAt" ASC LIMIT 1 FOR UPDATE OF line, budget`,
        order.projectId,
        line.budgetCodeId
      );
      if (!budgetLine) throw new Error("Commitment change requires a matching active budget line");
      const budgetUpdated = await prisma.$executeRawUnsafe(
        `UPDATE "BudgetLineItem" SET "committedAmountMinor" = "committedAmountMinor" + $1,
         "projectedFinalCostMinor" = "projectedFinalCostMinor" + $1,
         "projectedOverUnderMinor" = "projectedOverUnderMinor" - $1
         WHERE id = $2 AND "committedAmountMinor" + $1 >= 0 AND "projectedFinalCostMinor" + $1 >= 0`,
        line.amountMinor,
        budgetLine.id
      );
      if (budgetUpdated !== 1) throw new Error("Deductive change would make budget commitment or forecast negative");
      const budgetHeaderUpdated = await prisma.$executeRawUnsafe(
        `UPDATE "Budget" SET "totalCommittedMinor" = "totalCommittedMinor" + $1
         WHERE id = $2 AND "totalCommittedMinor" + $1 >= 0`,
        line.amountMinor,
        budgetLine.budgetId
      );
      if (budgetHeaderUpdated !== 1) throw new Error("Deductive change would make the budget commitment total negative");
    }
  }
}
async function applyWorkflowTransitionEffects(sudo, listKey, id, fromStatus, toStatus) {
  const prisma = sudo.prisma;
  if (listKey === "Estimate" && toStatus === "issued") {
    if (!prisma?.$executeRawUnsafe) throw new Error("Transactional estimate issue is unavailable");
    const issued = await prisma.$executeRawUnsafe(
      `UPDATE "EstimateVersion" SET status = 'issued', "issuedAt" = CURRENT_TIMESTAMP, "lockedAt" = CURRENT_TIMESTAMP
       WHERE id = (SELECT "currentVersion" FROM "Estimate" WHERE id = $1) AND status = 'draft' AND "lockedAt" IS NULL`,
      id
    );
    if (issued !== 1) throw new Error("The estimate's current version must be an unissued draft before it can be issued");
  }
  if (listKey === "Submittal" && fromStatus === "revise_resubmit" && toStatus === "submitted") {
    if (!prisma?.$executeRawUnsafe) throw new Error("Transactional submittal resubmission is unavailable");
    await prisma.$executeRawUnsafe(`UPDATE "Submittal" SET revision = COALESCE(revision, 0) + 1 WHERE id = $1`, id);
  }
}
function transitionMetadata(listKey, toStatus, now) {
  const atomic = {};
  const actor2 = {};
  if (listKey === "Project" && toStatus === "completed") atomic.actualCompletionDate = now;
  if (listKey === "BidPackage" && toStatus === "open") atomic.issuedAt = now;
  if (listKey === "BidPackage" && toStatus === "closed") atomic.closedAt = now;
  if (listKey === "BudgetChange" && toStatus === "approved") atomic.reviewedAt = now;
  if (listKey === "BudgetChange" && toStatus === "posted") atomic.postedAt = now;
  if (listKey === "PrimeContract" && toStatus === "executed") atomic.executedAt = now;
  if (listKey === "Commitment" && toStatus === "executed") atomic.executedAt = now;
  if (listKey === "ChangeOrder" && toStatus === "approved") atomic.approvedAt = now;
  if (listKey === "ChangeOrder" && toStatus === "executed") atomic.executedAt = now;
  if (listKey === "RFI" && toStatus === "open") atomic.openedAt = now;
  if (listKey === "RFI" && toStatus === "answered") atomic.answeredAt = now;
  if (listKey === "RFI" && toStatus === "closed") atomic.closedAt = now;
  if (listKey === "Submittal" && toStatus === "submitted") atomic.submittedAt = now;
  if (listKey === "Submittal" && toStatus === "closed") atomic.closedAt = now;
  if (listKey === "ProgressClaim" && toStatus === "submitted") atomic.submittedAt = now;
  if (listKey === "ProgressClaim" && toStatus === "approved") atomic.approvedAt = now;
  if (listKey === "SafetyIncident" && toStatus === "closed") atomic.closedAt = now;
  if (listKey === "Inspection" && toStatus === "in_progress") atomic.startedAt = now;
  if (listKey === "Inspection" && ["passed", "failed"].includes(toStatus)) atomic.completedAt = now;
  if (listKey === "Schedule" && toStatus === "published") atomic.publishedAt = now;
  if (listKey === "ScheduleTask" && toStatus === "in_progress") atomic.actualStart = now;
  if (listKey === "ScheduleTask" && toStatus === "completed") atomic.actualFinish = now;
  if (listKey === "DailyLog" && toStatus === "submitted") atomic.submittedAt = now;
  if (listKey === "DailyLog" && toStatus === "approved") atomic.approvedAt = now;
  if (listKey === "PunchItem" && toStatus === "ready_for_review") atomic.completedAt = now;
  if (listKey === "PunchItem" && toStatus === "closed") atomic.closedAt = now;
  if (listKey === "SafetyObservation" && toStatus === "resolved") atomic.resolvedAt = now;
  if (listKey === "CorrectiveAction" && toStatus === "ready_for_verification") atomic.completedAt = now;
  if (listKey === "CorrectiveAction" && toStatus === "verified") atomic.verifiedAt = now;
  if (listKey === "Payment" && toStatus === "settled") atomic.settledAt = now;
  if (listKey === "RetainageRelease" && toStatus === "approved") atomic.approvedAt = now;
  if (listKey === "RetainageRelease" && toStatus === "released") atomic.releasedAt = now;
  if (listKey === "LienWaiver" && toStatus === "received") atomic.receivedAt = now;
  if (listKey === "ProcurementRequest" && toStatus === "submitted") atomic.submittedAt = now;
  if (listKey === "ProcurementRequest" && toStatus === "approved") atomic.approvedAt = now;
  if (listKey === "ProcurementRequest" && toStatus === "ordered") atomic.orderedAt = now;
  if (listKey === "ProcurementRequest" && toStatus === "closed") atomic.closedAt = now;
  if (listKey === "BudgetChange" && toStatus === "approved") actor2.reviewedBy = true;
  if (listKey === "ChangeOrder" && toStatus === "approved") actor2.approvedBy = true;
  if (listKey === "ProgressClaim" && toStatus === "approved") actor2.reviewedBy = true;
  if (listKey === "DailyLog" && toStatus === "approved") actor2.approvedBy = true;
  if (listKey === "CorrectiveAction" && toStatus === "verified") actor2.verifiedBy = true;
  if (listKey === "Schedule" && toStatus === "published") actor2.publishedBy = true;
  if (listKey === "RetainageRelease" && toStatus === "approved") actor2.approvedBy = true;
  if (listKey === "ProcurementRequest" && toStatus === "approved") actor2.approvedBy = true;
  return { atomic, actor: actor2 };
}
var lifecycleConfigs = {
  transitionProjectStatus: { listKey: "Project", permission: "canManageProjects", requiredScope: "projects:write", projectRoot: true },
  transitionBidPackageStatus: { listKey: "BidPackage", permission: "canManagePreconstruction", requiredScope: "preconstruction:write" },
  transitionEstimateStatus: { listKey: "Estimate", permission: "canManagePreconstruction", requiredScope: "preconstruction:write" },
  transitionBudgetChangeStatus: { listKey: "BudgetChange", permission: "canManageFinancials", requiredScope: "financials:write" },
  transitionPrimeContractStatus: { listKey: "PrimeContract", permission: "canManageContracts", requiredScope: "contracts:write" },
  transitionCommitmentStatus: { listKey: "Commitment", permission: "canManageContracts", requiredScope: "contracts:write" },
  transitionChangeEventStatus: { listKey: "ChangeEvent", permission: "canManageContracts", requiredScope: "contracts:write" },
  transitionChangeOrderStatus: { listKey: "ChangeOrder", permission: "canManageContracts", requiredScope: "contracts:write" },
  transitionRfiStatus: { listKey: "RFI", permission: "canManageProjectExecution", requiredScope: "execution:write" },
  transitionSubmittalStatus: { listKey: "Submittal", permission: "canManageProjectExecution", requiredScope: "execution:write" },
  transitionProgressClaimStatus: { listKey: "ProgressClaim", permission: "canManageBilling", requiredScope: "billing:write" },
  transitionSafetyIncidentStatus: { listKey: "SafetyIncident", permission: "canManageSafety", requiredScope: "safety:write" },
  transitionInspectionStatus: { listKey: "Inspection", permission: "canManageSafety", requiredScope: "safety:write" },
  transitionScheduleStatus: { listKey: "Schedule", permission: "canManageProjectExecution", requiredScope: "execution:write" },
  transitionScheduleTaskStatus: { listKey: "ScheduleTask", permission: "canManageProjectExecution", requiredScope: "execution:write" },
  transitionDailyLogStatus: { listKey: "DailyLog", permission: "canManageFieldOperations", requiredScope: "field:write" },
  transitionPunchItemStatus: { listKey: "PunchItem", permission: "canManageFieldOperations", requiredScope: "field:write" },
  transitionSafetyObservationStatus: { listKey: "SafetyObservation", permission: "canManageSafety", requiredScope: "safety:write" },
  transitionCorrectiveActionStatus: { listKey: "CorrectiveAction", permission: "canManageSafety", requiredScope: "safety:write" },
  transitionPaymentStatus: { listKey: "Payment", permission: "canManageBilling", requiredScope: "billing:write" },
  transitionRetainageReleaseStatus: { listKey: "RetainageRelease", permission: "canManageBilling", requiredScope: "billing:write" },
  transitionLienWaiverStatus: { listKey: "LienWaiver", permission: "canManageBilling", requiredScope: "billing:write" },
  transitionProcurementRequestStatus: { listKey: "ProcurementRequest", permission: "canManageContracts", requiredScope: "contracts:write" }
};
function getLifecycleActionPolicy(action) {
  return Object.prototype.hasOwnProperty.call(lifecycleConfigs, action) ? lifecycleConfigs[action] : null;
}
function requireSession3(context) {
  const session = context.session;
  if (!session?.itemId) throw new Error("Authentication required");
  return session;
}
function normalizeIdempotencyKey(value) {
  if (value === null || value === void 0) return null;
  const normalized = value.trim();
  if (!normalized) throw new Error("Idempotency key cannot be empty");
  if (normalized.length > 200) throw new Error("Idempotency key must be at most 200 characters");
  return normalized;
}
function digest2(value) {
  return (0, import_node_crypto6.createHash)("sha256").update(value).digest("hex");
}
function lifecycleRequestHash(operation, input) {
  return digest2([operation, input.id, input.toStatus, input.reason, input.agentActionId ?? ""].join(""));
}
async function loadResource(context, config3, id) {
  return queryById(
    context,
    config3.listKey,
    id,
    config3.projectRoot ? "id status company { id }" : "id status company { id } project { id }"
  );
}
async function validateApprovedAgentAction(args) {
  const preview = await queryById(args.context, "AgentAction", args.actionId, "id status action targetType targetId targetStatus company { id } project { id }");
  if (!preview || preview.company?.id !== args.companyId || preview.project?.id !== args.projectId) throw new Error("Agent action tenant scope does not match this transition");
  if (preview.action !== args.expectedAction) throw new Error("Agent action operation does not match this transition");
  if (preview.targetType !== args.config.listKey || preview.targetId !== args.resourceId) throw new Error("Agent action target does not match this transition");
  if (preview.targetStatus !== args.toStatus) throw new Error("Agent action target status does not match this transition");
  const discovered = await discoverAgentAction(args.context, args.actionId);
  if (discovered.companyId !== args.companyId || discovered.projectId !== args.projectId) throw new Error("Agent action tenant scope does not match this transition");
  const { action, identity } = await lockAgentActionChain(args.context, discovered, args.config.requiredScope);
  if (action.status !== "approved") throw new Error("Agent action must be approved before execution");
  if (!action.requestedById) throw new Error("Agent action requester attribution is unavailable");
  if (action.action !== args.expectedAction) throw new Error("Agent action operation does not match this transition");
  if (action.targetType !== args.config.listKey || action.targetId !== args.resourceId) throw new Error("Agent action target does not match this transition");
  if (action.targetStatus !== args.toStatus) throw new Error("Agent action target status does not match this transition");
  if (identity.approvalMode !== "none" && (!action.reviewedById || action.reviewedById === action.requestedById)) throw new Error("The current identity policy requires independent human review");
  if (!scopeAllows(action.requiredScope, args.config.requiredScope)) throw new Error("Agent action does not grant the required scope");
  assertAgentPrincipal(args.session, args.companyId, args.projectId, args.config.permission, identity.ownerId);
  return action;
}
async function prepareIdempotency(args) {
  if (!args.key) return { record: null, replay: null };
  const fingerprint = digest2(`${args.companyId}${args.operation}${args.key}`);
  const existing = await queryOne(
    args.context,
    "IdempotencyKey",
    { fingerprint },
    "id key requestHash status resourceId fromStatus toStatus lockedAt agentAction { id }"
  );
  if (existing) {
    if (existing.requestHash !== args.requestHash) {
      throw new Error("Idempotency key was already used with a different request");
    }
    if (existing.status === "completed" && existing.resourceId && existing.fromStatus && existing.toStatus && existing.agentAction?.id) {
      return {
        record: existing,
        replay: {
          success: true,
          itemId: existing.resourceId,
          fromStatus: existing.fromStatus,
          toStatus: existing.toStatus,
          actionId: existing.agentAction.id,
          replayed: true
        }
      };
    }
    const lockedAt = existing.lockedAt ? new Date(existing.lockedAt).getTime() : 0;
    const stale = !Number.isFinite(lockedAt) || lockedAt < Date.now() - 2 * 6e4;
    if (existing.status === "started" && !stale) {
      throw new Error("Idempotent request is already in progress");
    }
    if (typeof existing.id !== "string") throw new Error("Idempotency record is missing its id");
    const sudo = args.context.sudo();
    const claimLease = sudo.prisma?.idempotencyKey?.updateMany;
    if (!claimLease) throw new Error("Atomic idempotency lease recovery is unavailable");
    const now = /* @__PURE__ */ new Date();
    const claimed = await claimLease({
      where: {
        id: existing.id,
        requestHash: args.requestHash,
        OR: [
          { status: "failed" },
          { status: "started", lockedAt: { lt: new Date(now.getTime() - 2 * 6e4) } }
        ]
      },
      data: {
        status: "started",
        errorCode: "",
        lockedAt: now,
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1e3)
      }
    });
    if (claimed.count !== 1) throw new Error("Idempotent request lease was acquired by another worker");
    const record2 = await queryById(args.context, "IdempotencyKey", existing.id, "id key requestHash status resourceId fromStatus toStatus lockedAt agentAction { id }");
    if (!record2) throw new Error("Recovered idempotency record is unavailable");
    return { record: record2, replay: null };
  }
  const record = await requireCreate2(args.context.sudo(), "IdempotencyKey")({
    data: {
      fingerprint,
      key: args.key,
      operation: args.operation,
      requestHash: args.requestHash,
      status: "started",
      resourceType: args.resourceType,
      resourceId: args.resourceId,
      company: { connect: { id: args.companyId } },
      project: { connect: { id: args.projectId } },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1e3)
    }
  });
  return { record, replay: null };
}
async function completeLifecycleTransition(args) {
  return runLifecycleTransaction(args.context, async (transactionContext) => {
    const sudo = transactionContext.sudo();
    if (args.config.listKey === "Inspection") {
      if (!sudo.prisma?.$queryRawUnsafe) throw new Error("Inspection lifecycle lock is unavailable");
      await sudo.prisma.$queryRawUnsafe(`SELECT id FROM "Inspection" WHERE id = $1 FOR UPDATE`, args.input.id);
    }
    await assertTransitionPrerequisites(
      transactionContext,
      args.config.listKey,
      args.input.id,
      args.input.toStatus
    );
    const metadata2 = transitionMetadata(args.config.listKey, args.input.toStatus, /* @__PURE__ */ new Date());
    await compareAndSetStatus(
      sudo,
      args.config.listKey,
      args.input.id,
      args.resource.status,
      args.input.toStatus,
      metadata2.atomic
    );
    await applyFinancialTransitionEffects(sudo, args.config.listKey, args.input.id, args.input.toStatus);
    await applyWorkflowTransitionEffects(sudo, args.config.listKey, args.input.id, args.resource.status, args.input.toStatus);
    if (Object.keys(metadata2.actor).length > 0) {
      await requireUpdate2(sudo, args.config.listKey)({
        where: { id: args.input.id },
        data: Object.fromEntries(Object.keys(metadata2.actor).map((field) => [field, { connect: { id: transactionContext.session.itemId } }]))
      });
    }
    if (args.input.agentActionId) await compareAndSetAgentAction(transactionContext, args.action.id, "running", "succeeded");
    await requireUpdate2(sudo, "AgentAction")({
      where: { id: args.action.id },
      data: {
        ...!args.input.agentActionId ? { status: "succeeded" } : {},
        resultDigest: digest2(`${args.input.id}${args.resource.status}${args.input.toStatus}`),
        completedAt: /* @__PURE__ */ new Date()
      }
    });
    const payload = JSON.stringify({
      schemaVersion: 1,
      eventType: `${args.config.listKey}.status_changed`,
      aggregateType: args.config.listKey,
      aggregateId: args.input.id,
      fromStatus: args.resource.status,
      toStatus: args.input.toStatus,
      companyId: args.companyId,
      projectId: args.projectId,
      actionId: args.action.id
    });
    const createOutbox = sudo.db.OutboxMessage?.createOne;
    if (createOutbox) {
      await createOutbox({
        data: {
          messageKey: `${args.mutationName}:${args.action.id}`,
          eventType: `${args.config.listKey}.status_changed`,
          aggregateType: args.config.listKey,
          aggregateId: args.input.id,
          canonicalPayload: payload,
          payloadDigest: digest2(payload),
          status: "pending",
          company: { connect: { id: args.companyId } },
          project: { connect: { id: args.projectId } },
          agentAction: { connect: { id: args.action.id } }
        }
      });
    }
    if (args.idempotency.record?.id) {
      await requireUpdate2(sudo, "IdempotencyKey")({
        where: { id: args.idempotency.record.id },
        data: {
          status: "completed",
          fromStatus: args.resource.status,
          toStatus: args.input.toStatus,
          agentAction: { connect: { id: args.action.id } }
        }
      });
    }
  });
}
function createLifecycleResolver(mutationName) {
  const config3 = lifecycleConfigs[mutationName];
  return async function resolveLifecycle(_root, { input }, context) {
    const session = requireSession3(context);
    if (!input?.id || typeof input.id !== "string") throw new Error("A resource id is required");
    if (!input.toStatus || typeof input.toStatus !== "string") throw new Error("A target status is required");
    if (hasNativeAuthorityPort(context) && !context.__constructionTransaction) {
      if (!context.transaction) throw new Error("Transactional lifecycle context is required");
      return context.transaction(async (tx) => {
        const record = await loadResource(tx, config3, input.id);
        const companyId2 = record?.company?.id;
        const projectId3 = config3.projectRoot ? record?.id : record?.project?.id;
        if (!companyId2 || !projectId3) throw new Error(`${config3.listKey} not found`);
        const fresh = await lockCurrentAuthority(tx, companyId2, projectId3, config3.permission);
        const current = tx.withSession ? tx.withSession(fresh) : tx;
        return resolveLifecycle(_root, { input }, { ...current, __constructionTransaction: true });
      }, { timeout: 3e4 });
    }
    const reason = normalizeTransitionReason(input.reason);
    const idempotencyKey = normalizeIdempotencyKey(input.idempotencyKey);
    const sudo = context.sudo();
    const resource = await loadResource(context, config3, input.id);
    if (!resource) throw new Error(`${config3.listKey} not found`);
    if (typeof resource.status !== "string") throw new Error(`${config3.listKey} is missing lifecycle status`);
    const companyId = resource.company?.id;
    const projectId2 = config3.projectRoot ? resource.id : resource.project?.id;
    if (!companyId || !projectId2) throw new Error(`${config3.listKey} is missing tenant relationships`);
    if (!hasProjectPermission(session, companyId, projectId2, config3.permission, true)) {
      throw new Error("Not authorized for this transition");
    }
    if (!await canAccessProjectById(context, session.itemId, projectId2, true)) {
      throw new Error("Not authorized for this project");
    }
    const requestHash = lifecycleRequestHash(mutationName, {
      id: input.id,
      toStatus: input.toStatus,
      reason,
      agentActionId: input.agentActionId
    });
    const idempotency = await prepareIdempotency({
      context,
      key: idempotencyKey,
      operation: mutationName,
      requestHash,
      companyId,
      projectId: projectId2,
      resourceType: config3.listKey,
      resourceId: input.id
    });
    if (idempotency.replay) return idempotency.replay;
    let action;
    try {
      if (input.agentActionId) {
        const approvedAction = await validateApprovedAgentAction({
          context,
          session,
          actionId: input.agentActionId,
          expectedAction: mutationName,
          config: config3,
          resourceId: input.id,
          toStatus: input.toStatus,
          companyId,
          projectId: projectId2
        });
        await compareAndSetAgentAction(context, approvedAction.id, "approved", "running");
        action = await requireUpdate2(sudo, "AgentAction")({
          where: { id: approvedAction.id },
          data: {
            actorUser: { connect: { id: session.itemId } },
            startedAt: /* @__PURE__ */ new Date(),
            ...idempotency.record ? { idempotencyKey: { connect: { id: idempotency.record.id } } } : {}
          }
        });
      } else {
        action = await requireCreate2(sudo, "AgentAction")({
          data: {
            actionKey: (0, import_node_crypto6.randomUUID)(),
            actorType: session.authType === "api_key" ? "agent" : "human",
            action: mutationName,
            requiredScope: config3.requiredScope,
            status: "running",
            targetType: config3.listKey,
            targetId: input.id,
            targetStatus: input.toStatus,
            reason,
            requestDigest: requestHash,
            requestedAt: /* @__PURE__ */ new Date(),
            startedAt: /* @__PURE__ */ new Date(),
            company: { connect: { id: companyId } },
            project: { connect: { id: projectId2 } },
            requestedBy: { connect: { id: session.itemId } },
            actorUser: { connect: { id: session.itemId } },
            ...idempotency.record ? { idempotencyKey: { connect: { id: idempotency.record.id } } } : {}
          }
        });
      }
    } catch (error) {
      if (idempotency.record?.id) {
        await requireUpdate2(sudo, "IdempotencyKey")({
          where: { id: idempotency.record.id },
          data: { status: "failed", errorCode: "ACTION_VALIDATION_FAILED" }
        }).catch(() => void 0);
      }
      throw error;
    }
    try {
      assertAllowedTransition(config3.listKey, resource.status, input.toStatus);
      await completeLifecycleTransition({
        context,
        config: config3,
        mutationName,
        input,
        resource,
        action,
        idempotency,
        companyId,
        projectId: projectId2
      });
      return {
        success: true,
        itemId: input.id,
        fromStatus: resource.status,
        toStatus: input.toStatus,
        actionId: action.id,
        replayed: false
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Transition failed";
      await requireUpdate2(sudo, "AgentAction")({
        where: { id: action.id },
        data: { status: "failed", errorCode: "TRANSITION_FAILED", errorMessage: message, completedAt: /* @__PURE__ */ new Date() }
      }).catch(() => void 0);
      if (idempotency.record?.id) {
        await requireUpdate2(sudo, "IdempotencyKey")({
          where: { id: idempotency.record.id },
          data: { status: "failed", errorCode: "TRANSITION_FAILED", agentAction: { connect: { id: action.id } } }
        }).catch(() => void 0);
      }
      throw error;
    }
  };
}
var lifecycleResolvers = Object.fromEntries(
  Object.keys(lifecycleConfigs).map((name) => [name, createLifecycleResolver(name)])
);

// features/keystone/mutations/agentActions.ts
function requireSession4(context) {
  if (!context.session?.itemId) throw new Error("Authentication required");
  return context.session;
}
function boundedString(value, label, max) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required`);
  const normalized = value.trim();
  if (normalized.length > max) throw new Error(`${label} must be at most ${max} characters`);
  return normalized;
}
function optionalBoundedString(value, label, max) {
  return value === null || value === void 0 || value === "" ? null : boundedString(value, label, max);
}
var digest3 = (value) => (0, import_node_crypto7.createHash)("sha256").update(value).digest("hex");
async function withAgentAuthority(context, companyId, projectId2, permission, callback) {
  if (!context.transaction) throw new Error("Transactional agent context is required");
  return context.transaction(async (tx) => {
    const fresh = await lockCurrentAuthority(tx, companyId, projectId2, permission);
    const current = tx.withSession ? tx.withSession(fresh) : tx;
    return callback({ ...current, session: fresh, __constructionTransaction: true });
  }, { timeout: 3e4 });
}
function actionPolicy(action) {
  const policy = getLifecycleActionPolicy(action.action);
  if (!policy || !action.projectId || action.targetType !== policy.listKey || !scopeAllows(action.requiredScope, policy.requiredScope)) throw new Error("Agent action has no valid bounded domain operation");
  return policy;
}
async function assertCurrentTarget(context, action, policy) {
  const record = await queryById(context, policy.listKey, action.targetId, policy.projectRoot ? "id status company { id }" : "id status company { id } project { id }");
  if (!record || record.company?.id !== action.companyId || (policy.projectRoot ? record.id : record.project?.id) !== action.projectId || typeof record.status !== "string") throw new Error("Agent action target is unavailable for this project");
  assertAllowedTransition(policy.listKey, record.status, action.targetStatus);
}
async function requestAgentAction(_root, { input }, context) {
  const session = requireSession4(context);
  const identityId = boundedString(input.agentIdentityId, "Agent identity", 200);
  const actionName = boundedString(input.action, "Action", 200);
  const targetType = boundedString(input.targetType, "Target type", 120);
  const targetId = boundedString(input.targetId, "Target id", 200);
  const targetStatus = boundedString(input.toStatus, "Target status", 80);
  const companyId = boundedString(input.companyId, "Company id", 200);
  const projectId2 = boundedString(input.projectId, "Project id", 200);
  const reason = normalizeTransitionReason(input.reason);
  const requiredScope = normalizeScope(input.requiredScope);
  const correlationId = optionalBoundedString(input.correlationId, "Correlation id", 200);
  const causationId = optionalBoundedString(input.causationId, "Causation id", 200);
  const policy = getLifecycleActionPolicy(actionName);
  if (!policy) throw new Error("Unsupported agent action");
  if (targetType !== policy.listKey) throw new Error("Agent action target type does not match the requested operation");
  if (!scopeAllows(requiredScope, policy.requiredScope)) throw new Error("Agent action scope does not satisfy the requested operation");
  if (!hasProjectPermission(session, companyId, projectId2, policy.permission, true)) throw new Error("Not authorized for this agent action domain and project");
  if (!context.__constructionTransaction) return withAgentAuthority(context, companyId, projectId2, policy.permission, (tx) => requestAgentAction(_root, { input }, tx));
  const { identity, grant } = await selectAndLockAgentGrant(context, { identityId, companyId, projectId: projectId2, requiredScope });
  assertAgentPrincipal(session, companyId, projectId2, policy.permission, identity.ownerId);
  await assertCurrentTarget(context, { targetId, targetStatus, companyId, projectId: projectId2 }, policy);
  const create2 = context.sudo().db.AgentAction?.createOne;
  if (!create2) throw new Error("AgentAction create mutation is unavailable");
  return create2({ data: {
    actionKey: (0, import_node_crypto7.randomUUID)(),
    actorType: "agent",
    action: actionName,
    requiredScope,
    status: identity.approvalMode === "none" ? "approved" : "proposed",
    targetType,
    targetId,
    targetStatus,
    reason,
    ...correlationId ? { correlationId } : {},
    ...causationId ? { causationId } : {},
    requestDigest: digest3([identityId, actionName, requiredScope, targetType, targetId, targetStatus, companyId, projectId2, reason, correlationId ?? "", causationId ?? ""].join("")),
    requestedAt: /* @__PURE__ */ new Date(),
    ...identity.approvalMode === "none" ? { reviewedAt: /* @__PURE__ */ new Date(), reviewNotes: "Auto-approved by identity policy", reviewedBy: { connect: { id: session.itemId } } } : {},
    company: { connect: { id: companyId } },
    project: { connect: { id: projectId2 } },
    agentIdentity: { connect: { id: identityId } },
    scopeGrant: { connect: { id: grant.id } },
    requestedBy: { connect: { id: session.itemId } }
  } });
}
async function reviewAgentAction(_root, { input }, context) {
  const session = requireSession4(context);
  if (session.authType === "api_key") throw new Error("Agent reviews require a live independent human session");
  const id = boundedString(input.id, "Agent action id", 200);
  const decision = boundedString(input.decision, "Decision", 20).toLowerCase();
  const notes = normalizeTransitionReason(input.notes);
  if (!["approve", "reject"].includes(decision)) throw new Error("Decision must be approve or reject");
  const discovered = await discoverAgentAction(context, id);
  const policy = actionPolicy(discovered);
  const projectId2 = discovered.projectId;
  if (!projectId2 || !hasProjectPermission(session, discovered.companyId, projectId2, "canManageAgents", true) || !hasProjectPermission(session, discovered.companyId, projectId2, policy.permission, true)) throw new Error("Not authorized to review this agent action");
  if (!context.__constructionTransaction) return withAgentAuthority(context, discovered.companyId, projectId2, ["canManageAgents", policy.permission], (tx) => reviewAgentAction(_root, { input }, tx));
  const { action } = await lockAgentActionChain(context, discovered, policy.requiredScope, decision === "reject" ? "restrict" : "active");
  if (action.status !== "proposed") throw new Error("Only proposed actions can be reviewed");
  if (decision === "approve") {
    if (action.requestedById === session.itemId) throw new Error("A different authorized human must approve this action");
    await assertCurrentTarget(context, action, policy);
  }
  const update2 = context.sudo().db.AgentAction?.updateOne;
  if (!update2) throw new Error("AgentAction update mutation is unavailable");
  await compareAndSetAgentAction(context, id, "proposed", decision === "approve" ? "approved" : "rejected");
  return update2({ where: { id }, data: {
    reviewedBy: { connect: { id: session.itemId } },
    reviewedAt: /* @__PURE__ */ new Date(),
    reviewNotes: notes,
    ...decision === "reject" ? { completedAt: /* @__PURE__ */ new Date() } : {}
  } });
}
async function captureObservation(_root, { input }, context) {
  const session = requireSession4(context);
  const id = boundedString(input.id, "Agent action id", 200);
  const outcome = boundedString(input.outcome, "Outcome", 20).toLowerCase();
  if (!["unknown", "running", "succeeded", "failed"].includes(outcome)) throw new Error("Reported outcome must be unknown, running, succeeded or failed");
  const resultSummary = optionalBoundedString(input.resultSummary, "Result summary", 2e3);
  const errorCode = optionalBoundedString(input.errorCode, "Error code", 100);
  const errorMessage = optionalBoundedString(input.errorMessage, "Error message", 1e3);
  if (outcome === "failed" && !errorMessage) throw new Error("A reported failure requires an error message");
  const discovered = await discoverAgentAction(context, id);
  const policy = actionPolicy(discovered);
  const projectId2 = discovered.projectId;
  if (!projectId2 || !hasProjectPermission(session, discovered.companyId, projectId2, policy.permission, true)) throw new Error("Not authorized to observe this agent action");
  if (!context.__constructionTransaction) return withAgentAuthority(context, discovered.companyId, projectId2, policy.permission, (tx) => captureObservation(_root, { input }, tx));
  const locked = await lockAgentActionChain(context, discovered, policy.requiredScope);
  assertAgentPrincipal(session, locked.action.companyId, projectId2, policy.permission, locked.identity.ownerId);
  const canonicalPayload = JSON.stringify({
    schemaVersion: 1,
    authoritative: false,
    actionId: id,
    reportedOutcome: outcome,
    observedActionStatus: locked.action.status,
    actorUserId: session.itemId,
    actorCredentialId: session.authType === "api_key" ? session.apiCredential?.id : null,
    resultSummary,
    errorCode,
    errorMessage
  });
  const messageKey = `AgentAction.observation:${id}:${digest3(canonicalPayload)}`;
  const sudo = context.sudo();
  const [existing] = await sudo.query.OutboxMessage.findMany({ where: { messageKey: { equals: messageKey } }, take: 1, query: "id canonicalPayload" });
  if (existing && existing.canonicalPayload !== canonicalPayload) throw new Error("Observation replay does not match its original payload");
  const create2 = sudo.db.OutboxMessage?.createOne;
  if (!existing && !create2) throw new Error("Observation evidence persistence is unavailable");
  const observation = existing ?? await create2({ data: {
    messageKey,
    eventType: "AgentAction.external_observation",
    aggregateType: "AgentAction",
    aggregateId: id,
    canonicalPayload,
    payloadDigest: digest3(canonicalPayload),
    status: "pending",
    company: { connect: { id: locked.action.companyId } },
    project: { connect: { id: projectId2 } },
    agentAction: { connect: { id } }
  } });
  if (!observation.id) throw new Error("Observation receipt is unavailable");
  const findAction = sudo.db.AgentAction?.findOne;
  if (!findAction) throw new Error("AgentAction receipt lookup is unavailable");
  const original = await findAction({ where: { id } });
  if (!original || original.id !== id || original.status !== locked.action.status) throw new Error("Action changed while capturing the observation");
  return { receipt: { actionId: id, observationId: observation.id, authoritative: false, reportedOutcome: outcome, observedActionStatus: locked.action.status, replayed: Boolean(existing) }, action: original };
}
async function recordAgentActionObservation(root, args, context) {
  return (await captureObservation(root, args, context)).receipt;
}
async function recordAgentActionOutcome(root, args, context) {
  return (await captureObservation(root, args, context)).action;
}

// features/keystone/mutations/store-settings.ts
var import_node_crypto8 = require("node:crypto");
var import_zod = require("zod");

// features/lib/public-content-limits.ts
var PUBLIC_PROJECT_LIMITS = {
  title: { label: "Project title", max: 200 },
  summary: { label: "Public summary", max: 600 },
  description: { label: "Public description", max: 5e3 },
  market: { label: "Market", max: 160 },
  locationLabel: { label: "General location", max: 200 },
  deliveryMethod: { label: "Delivery method", max: 120 },
  completionLabel: { label: "Completion state", max: 80 },
  approvedOutcome: { label: "Outcome", max: 1e3 }
};

// features/keystone/mutations/store-settings.ts
var base = { companyId: import_zod.z.string().min(1).max(200), idempotencyKey: import_zod.z.string().min(1).max(200) };
var status = import_zod.z.enum(["draft", "published", "archived"]);
var content = import_zod.z.discriminatedUnion("operation", [
  import_zod.z.object({ ...base, operation: import_zod.z.literal("branding"), brandName: import_zod.z.string().trim().min(2).max(120), brandMark: import_zod.z.string().regex(/^[A-Z0-9]{1,4}$/), brandTagline: import_zod.z.string().max(240), brandColor: import_zod.z.string().regex(/^#[0-9a-f]{6}$/i), logoIcon: import_zod.z.string().max(1e5), logoColor: import_zod.z.string().max(40) }).strict(),
  import_zod.z.object({ ...base, operation: import_zod.z.literal("profile"), status, serviceArea: import_zod.z.string().trim().min(2).max(240), capabilitySummary: import_zod.z.string().trim().min(20).max(1200), inquiryEmail: import_zod.z.string().email().max(320), inquiryPhone: import_zod.z.string().max(50), privacyNotice: import_zod.z.string().trim().min(20).max(1200), acceptingInquiries: import_zod.z.boolean() }).strict(),
  import_zod.z.object({ ...base, operation: import_zod.z.literal("service"), id: import_zod.z.string().max(200).optional(), title: import_zod.z.string().trim().min(2).max(160), summary: import_zod.z.string().trim().min(20).max(500), details: import_zod.z.string().max(4e3), market: import_zod.z.string().max(160), status }).strict(),
  import_zod.z.object({ ...base, operation: import_zod.z.literal("project"), id: import_zod.z.string().max(200).optional(), sourceProjectId: import_zod.z.string().max(200).optional(), title: import_zod.z.string().trim().min(2).max(PUBLIC_PROJECT_LIMITS.title.max), summary: import_zod.z.string().trim().min(20).max(PUBLIC_PROJECT_LIMITS.summary.max), description: import_zod.z.string().max(PUBLIC_PROJECT_LIMITS.description.max), market: import_zod.z.string().max(PUBLIC_PROJECT_LIMITS.market.max), locationLabel: import_zod.z.string().max(PUBLIC_PROJECT_LIMITS.locationLabel.max), deliveryMethod: import_zod.z.string().max(PUBLIC_PROJECT_LIMITS.deliveryMethod.max), completionLabel: import_zod.z.string().max(PUBLIC_PROJECT_LIMITS.completionLabel.max), approvedOutcome: import_zod.z.string().max(PUBLIC_PROJECT_LIMITS.approvedOutcome.max).optional(), status }).strict()
]);
var hash = (value) => (0, import_node_crypto8.createHash)("sha256").update(JSON.stringify(value)).digest("hex");
async function constructionStoreSettings(_root, { companyId }, context) {
  const actorId = context.session?.itemId;
  if (!actorId || context.session.authType !== "session") throw new Error("Sign in to continue");
  const companies = await context.prisma.company.findMany({
    where: { status: "active", memberships: { some: { userId: actorId, status: "active", role: { canManageSettings: true } } } },
    select: { id: true, name: true },
    take: 50,
    orderBy: { name: "asc" }
  });
  const configured = await context.prisma.publicSiteProfile.findUnique({ where: { siteKey: getTrustedPublicSiteKey() }, include: { company: { select: { id: true } } } });
  const selected = companyId || configured?.company?.id;
  if (!selected) return { companies, company: null, profile: null, services: [], projects: [] };
  if (!companies.some((company) => company.id === selected)) throw new Error("Store settings not found");
  return context.transaction(async (tx) => {
    await lockCurrentAuthority(tx, selected, null, "canManageSettings");
    const company = await tx.prisma.company.findUnique({ where: { id: selected }, select: { id: true, name: true, brandName: true, brandMark: true, brandTagline: true, brandColor: true, logoIcon: true, logoColor: true } });
    const profile = configured?.company?.id === selected ? await tx.prisma.publicSiteProfile.findUnique({ where: { id: configured.id }, select: { id: true, status: true, serviceArea: true, capabilitySummary: true, inquiryEmail: true, inquiryPhone: true, privacyNotice: true, acceptingInquiries: true } }) : null;
    const [services, projects] = profile ? await Promise.all([
      tx.prisma.publicService.findMany({ where: { companyId: selected, siteId: profile.id }, take: 50, orderBy: [{ sortOrder: "asc" }, { title: "asc" }], select: { id: true, title: true, slug: true, summary: true, details: true, market: true, status: true } }),
      tx.prisma.publicProject.findMany({ where: { companyId: selected, siteId: profile.id }, take: 50, orderBy: [{ sortOrder: "asc" }, { title: "asc" }], select: { id: true, title: true, slug: true, summary: true, description: true, market: true, locationLabel: true, deliveryMethod: true, completionLabel: true, approvedOutcome: true, status: true } })
    ]) : [[], []];
    return { companies, company: company && { ...company, logoIcon: sanitizeStoreLogoSvg(company.logoIcon), logoColor: normalizeStoreLogoColor(company.logoColor) }, profile, services, projects };
  });
}
async function updateConstructionStoreSettings(_root, { input: unknownInput }, context) {
  const input = content.parse(unknownInput);
  if (!context.session?.itemId || context.session.authType !== "session") throw new Error("Sign in to continue");
  if (input.operation === "branding") {
    const safe = sanitizeStoreLogoSvg(input.logoIcon);
    if (input.logoIcon.trim() && !safe) throw new Error("Logo must be a valid, safe SVG document");
    input.logoIcon = safe;
    input.logoColor = normalizeStoreLogoColor(input.logoColor);
  }
  const actorId = context.session.itemId;
  return context.transaction(async (tx) => {
    const fresh = await lockCurrentAuthority(tx, input.companyId, null, "canManageSettings");
    const scoped2 = tx.withSession(fresh);
    const sudo = scoped2.sudo();
    const fingerprint = hash([input.companyId, actorId, "updateConstructionStoreSettings", input.idempotencyKey]);
    const requestHash = hash(input);
    const replay2 = await tx.prisma.idempotencyKey.findUnique({ where: { fingerprint } });
    if (replay2) {
      if (replay2.requestHash !== requestHash || replay2.status !== "completed") throw new Error("Settings request key was already used for different details");
      return { success: true, operation: "updateConstructionStoreSettings", itemId: input.companyId, actionId: replay2.agentActionId, replayed: true };
    }
    let site = await tx.prisma.publicSiteProfile.findUnique({ where: { siteKey: getTrustedPublicSiteKey() }, include: { company: { select: { id: true } } } });
    if (site?.company?.id && site.company.id !== input.companyId) throw new Error("Configured public site belongs to another company");
    if (input.operation === "branding") {
      const { brandName, brandMark, brandTagline, brandColor, logoIcon, logoColor } = input;
      await sudo.db.Company.updateOne({ where: { id: input.companyId }, data: { brandName, brandMark, brandTagline, brandColor, logoIcon, logoColor } });
    } else if (input.operation === "profile") {
      const { status: status2, serviceArea, capabilitySummary, inquiryEmail, inquiryPhone, privacyNotice, acceptingInquiries } = input;
      const data = { status: status2, serviceArea, capabilitySummary, inquiryEmail, inquiryPhone, privacyNotice, acceptingInquiries };
      if (site) await sudo.db.PublicSiteProfile.updateOne({ where: { id: site.id }, data });
      else {
        const created = await sudo.db.PublicSiteProfile.createOne({ data: { ...data, siteKey: getTrustedPublicSiteKey(), company: { connect: { id: input.companyId } } } });
        site = await tx.prisma.publicSiteProfile.findUnique({ where: { id: String(created.id) }, include: { company: { select: { id: true } } } });
      }
    } else {
      if (!site?.id || site.company?.id !== input.companyId) throw new Error("Create the public profile first");
      if (input.operation === "service") {
        const { title, summary, details, market, status: status2 } = input;
        if (input.id) {
          const current = await tx.prisma.publicService.findUnique({ where: { id: input.id } });
          if (!current || current.companyId !== input.companyId || current.siteId !== site.id) throw new Error("Service not found");
          await sudo.db.PublicService.updateOne({ where: { id: input.id }, data: { title, summary, details, market, status: status2 } });
        } else {
          if (await tx.prisma.publicService.count({ where: { siteId: site.id } }) >= 50) throw new Error("Public service limit reached");
          const slug = publicSlug(title, (0, import_node_crypto8.randomUUID)());
          await sudo.db.PublicService.createOne({ data: { title, summary, details, market, status: status2, slug, serviceKey: `${input.companyId}:${slug}`, company: { connect: { id: input.companyId } }, site: { connect: { id: site.id } } } });
        }
      } else {
        const { title, summary, description, market, locationLabel, deliveryMethod, completionLabel, approvedOutcome, status: status2 } = input;
        if (input.id) {
          const current = await tx.prisma.publicProject.findUnique({ where: { id: input.id } });
          if (!current || current.companyId !== input.companyId || current.siteId !== site.id) throw new Error("Public project not found");
          await sudo.db.PublicProject.updateOne({ where: { id: input.id }, data: { title, summary, description, market, locationLabel, deliveryMethod, completionLabel, approvedOutcome, status: status2 } });
        } else {
          const source = input.sourceProjectId ? await tx.prisma.project.findUnique({ where: { id: input.sourceProjectId } }) : null;
          if (input.sourceProjectId && source?.companyId !== input.companyId) throw new Error("Source project not found");
          if (await tx.prisma.publicProject.count({ where: { siteId: site.id } }) >= 50) throw new Error("Public project limit reached");
          const slug = publicSlug(title, (0, import_node_crypto8.randomUUID)());
          await sudo.db.PublicProject.createOne({ data: { title, summary, description, market, locationLabel, deliveryMethod, completionLabel, approvedOutcome, status: status2, slug, publicationKey: `${input.companyId}:${slug}`, ...source ? { sourceProject: { connect: { id: source.id } } } : {}, company: { connect: { id: input.companyId } }, site: { connect: { id: site.id } } } });
        }
      }
    }
    const action = await sudo.db.AgentAction.createOne({ data: {
      actionKey: (0, import_node_crypto8.randomUUID)(),
      actorType: "human",
      action: `storeSettings.${input.operation}`,
      status: "succeeded",
      targetType: "Company",
      targetId: input.companyId,
      targetStatus: input.operation,
      reason: `Save explicitly selected ${input.operation} fields`,
      requestDigest: requestHash,
      resultDigest: hash([input.companyId, input.operation]),
      requestedAt: /* @__PURE__ */ new Date(),
      startedAt: /* @__PURE__ */ new Date(),
      completedAt: /* @__PURE__ */ new Date(),
      company: { connect: { id: input.companyId } },
      requestedBy: { connect: { id: actorId } },
      actorUser: { connect: { id: actorId } }
    } });
    await sudo.db.IdempotencyKey.createOne({ data: { fingerprint, key: input.idempotencyKey, operation: "updateConstructionStoreSettings", requestHash, status: "completed", resourceType: "Company", resourceId: input.companyId, toStatus: input.operation, expiresAt: new Date(Date.now() + 864e5), company: { connect: { id: input.companyId } }, agentAction: { connect: { id: action.id } } } });
    const payload = JSON.stringify({ schemaVersion: 1, eventType: "StoreSettings.saved", companyId: input.companyId, section: input.operation, actorId });
    await sudo.db.OutboxMessage.createOne({ data: { messageKey: `StoreSettings:${action.id}`, eventType: "StoreSettings.saved", aggregateType: "Company", aggregateId: input.companyId, canonicalPayload: payload, payloadDigest: (0, import_node_crypto8.createHash)("sha256").update(payload).digest("hex"), status: "pending", company: { connect: { id: input.companyId } }, agentAction: { connect: { id: action.id } } } });
    return { success: true, operation: "updateConstructionStoreSettings", itemId: input.companyId, actionId: String(action.id), replayed: false };
  }, { timeout: 15e3 });
}

// features/keystone/mutations/customer-requests.ts
var import_node_crypto9 = require("node:crypto");

// features/keystone/domain/customer-authority.ts
async function lockCustomerActor(context, companyId) {
  const session = context.session;
  if (!session?.itemId || session.authType !== "session" || !session.authSessionId) throw new Error("Sign in to continue");
  const actors = await context.prisma.$queryRawUnsafe(
    `SELECT u.id FROM "User" u JOIN "AuthSession" s ON s."user" = u.id
     WHERE u.id = $1 AND s.id = $2 AND u."isActive" = true
       AND s."revokedAt" IS NULL AND s."expiresAt" > CURRENT_TIMESTAMP
     FOR SHARE OF u, s`,
    session.itemId,
    session.authSessionId
  );
  if (actors.length !== 1) throw new Error("Sign in to continue");
  if (companyId) {
    const grants = await context.prisma.$queryRawUnsafe(
      `SELECT m.id FROM "CompanyMembership" m JOIN "Role" r ON r.id = m.role
       JOIN "Company" c ON c.id = m.company
       WHERE m."user" = $1 AND m.company = $2 AND m.status = 'active'
         AND r."canManagePreconstruction" = true AND c.status = 'active'
       FOR SHARE OF m, r, c`,
      session.itemId,
      companyId
    );
    if (grants.length !== 1) throw new Error("Request not found");
  }
  return session.itemId;
}

// features/keystone/mutations/customer-requests.ts
var hash2 = (value) => (0, import_node_crypto9.createHash)("sha256").update(JSON.stringify(value)).digest("hex");
var clean = (value, label, max, min = 1) => {
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max) throw new Error(`${label} is invalid`);
  return value.trim();
};
var selection = "id reference serviceTitle serviceSlug scope status version currencyCode quoteMinor quoteTerms expiresAt acceptedAt acceptedSnapshot createdAt customer { id } company { id name }";
async function registerConstructionCustomer(_root, { name, email, password: password2 }, context) {
  const identity = clean(email, "Email", 320).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity)) throw new Error("Email is invalid");
  const customerName = clean(name, "Name", 200);
  if (typeof password2 !== "string" || password2.length < 10 || password2.length > 1e3) throw new Error("Password must have at least 10 characters");
  const site = await context.prisma.publicSiteProfile.findUnique({ where: { siteKey: getTrustedPublicSiteKey() } });
  if (site?.status !== "published") throw new Error("Customer registration is unavailable");
  try {
    await context.sudo().db.User.createOne({ data: { name: customerName, email: identity, password: password2, onboardingStatus: "dismissed" } });
  } catch {
    throw new Error("Account could not be created. Sign in if you already have an account.");
  }
  return { success: true };
}
function customerRequestScope(context, operator) {
  const actorId = context.session?.itemId;
  if (!actorId || context.session?.authType !== "session") throw new Error("Sign in to continue");
  return operator ? { company: { status: { equals: "active" }, memberships: { some: { user: { id: { equals: actorId } }, status: { equals: "active" }, role: { canManagePreconstruction: { equals: true } } } } } } : { customer: { id: { equals: actorId } } };
}
async function constructionCustomerRequests(_root, { operator = false, skip = 0, take = 100 }, context) {
  const offset = Number.isSafeInteger(skip) && Number(skip) > 0 ? Number(skip) : 0;
  const limit = Number.isSafeInteger(take) && Number(take) > 0 ? Math.min(Number(take), 100) : 100;
  return context.query.ServiceRequest.findMany({
    where: customerRequestScope(context, Boolean(operator)),
    skip: offset,
    take: limit,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    query: selection
  });
}
async function constructionCustomerRequestCount(_root, { operator = false }, context) {
  return context.query.ServiceRequest.count({ where: customerRequestScope(context, Boolean(operator)) });
}
async function constructionCustomerRequest(_root, { id }, context) {
  if (!context.session?.itemId || context.session.authType !== "session") throw new Error("Sign in to continue");
  const row = await context.query.ServiceRequest.findOne({ where: { id }, query: selection });
  if (!row || row.customer?.id !== context.session.itemId) throw new Error("Request not found");
  return row;
}
async function commandConstructionRequest(_root, { input }, context) {
  const operation = clean(input.operation, "Operation", 30);
  if (!["request", "quote", "accept", "cancel"].includes(operation)) throw new Error("Operation is invalid");
  const key = clean(input.idempotencyKey, "Request key", 200);
  if (!context.session?.itemId || context.session.authType !== "session") throw new Error("Sign in to continue");
  const actorId = context.session.itemId;
  const commandDigest2 = hash2([operation, input.id || "", input.serviceSlug || "", input.scope || "", input.expectedVersion ?? null, input.amountMinor || "", input.terms || "", input.expiresAt || ""]);
  return context.transaction(async (tx) => {
    await lockCustomerActor(tx);
    if (operation === "request") {
      const slug = clean(input.serviceSlug, "Service", 100);
      const scope = clean(input.scope, "Project scope", 4e3, 20);
      const candidate = await tx.prisma.publicService.findFirst({ where: { slug, status: "published", site: { siteKey: getTrustedPublicSiteKey(), status: "published", acceptingInquiries: true } }, select: { companyId: true } });
      if (!candidate?.companyId) throw new Error("Service is unavailable");
      await tx.prisma.$queryRawUnsafe(`SELECT id FROM "Company" WHERE id = $1 AND status = 'active' FOR SHARE`, candidate.companyId);
      const services = await tx.prisma.$queryRawUnsafe(
        `SELECT s.id, s.title, s.company FROM "PublicService" s
         JOIN "PublicSiteProfile" p ON p.id = s.site JOIN "Company" c ON c.id = s.company
         WHERE s.slug = $1 AND s.status = 'published' AND p."siteKey" = $2
           AND p.status = 'published' AND p."acceptingInquiries" = true AND c.status = 'active'
           AND c."publicSiteProfile" = p.id FOR SHARE OF s, p`,
        slug,
        getTrustedPublicSiteKey()
      );
      const service = services[0];
      if (services.length !== 1 || !service) throw new Error("Service is unavailable");
      const requestKey = hash2([actorId, service.id, key]);
      await tx.prisma.$queryRawUnsafe("SELECT 1::int FROM pg_advisory_xact_lock(hashtextextended($1, 0))", requestKey);
      const replay3 = await tx.prisma.serviceRequest.findUnique({ where: { requestKey } });
      if (replay3) {
        if (replay3.requestDigest !== commandDigest2 || replay3.customerId !== actorId) throw new Error("Request key was used for different details");
        return tx.query.ServiceRequest.findOne({ where: { id: replay3.id }, query: selection });
      }
      const created = await tx.sudo().db.ServiceRequest.createOne({ data: {
        reference: `SR-${(0, import_node_crypto9.randomUUID)().slice(0, 8).toUpperCase()}`,
        requestKey,
        requestDigest: commandDigest2,
        serviceTitle: service.title,
        serviceSlug: slug,
        scope,
        status: "requested",
        version: 0,
        currencyCode: "USD",
        customer: { connect: { id: actorId } },
        company: { connect: { id: service.company } },
        service: { connect: { id: service.id } }
      } });
      await tx.sudo().db.ServiceRequestEvent.createOne({ data: {
        eventKey: hash2([actorId, created.id, key]),
        commandDigest: commandDigest2,
        action: operation,
        fromStatus: "",
        toStatus: "requested",
        version: 0,
        snapshot: { serviceTitle: service.title, serviceSlug: slug, scope, currencyCode: "USD" },
        actor: { connect: { id: actorId } },
        request: { connect: { id: created.id } }
      } });
      return tx.query.ServiceRequest.findOne({ where: { id: String(created.id) }, query: selection });
    }
    const id = clean(input.id, "Request", 200);
    const visible = await tx.db.ServiceRequest.findOne({ where: { id } });
    if (!visible?.companyId || !visible.customerId) throw new Error("Request not found");
    const owner = visible.customerId === actorId;
    if (operation === "quote" || !owner) await lockCustomerActor(tx, String(visible.companyId));
    if (operation === "accept" && !owner) throw new Error("Request not found");
    await tx.prisma.$queryRawUnsafe('SELECT id FROM "ServiceRequest" WHERE id = $1 FOR UPDATE', id);
    const row = await tx.prisma.serviceRequest.findUnique({ where: { id } });
    if (!row || row.companyId !== visible.companyId || row.customerId !== visible.customerId) throw new Error("Request not found");
    const eventKey = hash2([actorId, id, key]);
    const replay2 = await tx.prisma.serviceRequestEvent.findUnique({ where: { eventKey } });
    if (replay2) {
      if (replay2.commandDigest !== commandDigest2) throw new Error("Request key was used for different details");
      return tx.query.ServiceRequest.findOne({ where: { id }, query: selection });
    }
    if (!Number.isSafeInteger(input.expectedVersion) || input.expectedVersion !== row.version) throw new Error("Request changed. Reload and review the current terms.");
    const version = row.version + 1;
    let data;
    if (operation === "quote") {
      if (!["requested", "quoted"].includes(row.status)) throw new Error("Accepted or cancelled requests cannot be repriced");
      const amount3 = clean(input.amountMinor, "Quote amount", 16);
      if (!/^[1-9]\d*$/.test(amount3) || BigInt(amount3) > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Quote amount is outside the supported integer range");
      const terms = clean(input.terms, "Quote terms", 4e3, 20);
      const expiresAt = new Date(clean(input.expiresAt, "Quote expiry", 40));
      if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= Date.now() || expiresAt.getTime() > Date.now() + 90 * 864e5) throw new Error("Quote expiry must be within the next 90 days");
      data = { quoteMinor: BigInt(amount3), quoteTerms: terms, expiresAt, status: "quoted", version };
    } else if (operation === "accept") {
      if (row.status !== "quoted" || !row.expiresAt || row.expiresAt <= /* @__PURE__ */ new Date() || row.quoteMinor <= BigInt(0)) throw new Error("Quote is no longer available");
      data = { status: "payment_pending", version, acceptedAt: /* @__PURE__ */ new Date(), acceptedSnapshot: {
        serviceTitle: row.serviceTitle,
        serviceSlug: row.serviceSlug,
        scope: row.scope,
        quantity: 1,
        unit: "project scope",
        unitPriceMinor: row.quoteMinor.toString(),
        totalMinor: row.quoteMinor.toString(),
        currencyCode: row.currencyCode,
        terms: row.quoteTerms,
        quoteVersion: row.version,
        expiresAt: row.expiresAt.toISOString()
      } };
    } else {
      if (row.status === "cancelled") throw new Error("Request is already cancelled");
      data = { status: "cancelled", version };
    }
    await tx.sudo().db.ServiceRequest.updateOne({ where: { id }, data });
    await tx.sudo().db.ServiceRequestEvent.createOne({ data: {
      eventKey,
      commandDigest: commandDigest2,
      action: operation,
      fromStatus: row.status,
      toStatus: String(data.status),
      version,
      snapshot: JSON.parse(JSON.stringify(data, (_key, value) => typeof value === "bigint" ? value.toString() : value)),
      actor: { connect: { id: actorId } },
      request: { connect: { id } }
    } });
    return tx.query.ServiceRequest.findOne({ where: { id }, query: selection });
  }, { timeout: 15e3 });
}
async function constructionOperatorRequests(_root, { skip = 0, take = 25 }, context) {
  const rows3 = await constructionCustomerRequests(_root, { operator: true, skip, take }, context);
  const customerIds = [...new Set(rows3.map((row) => row.customer?.id).filter((id) => typeof id === "string"))];
  const customers = customerIds.length ? await context.sudo().query.User.findMany({ where: { id: { in: customerIds } }, query: "id name email phone" }) : [];
  const byId = new Map(customers.map((customer) => [String(customer.id), customer]));
  return rows3.map((row) => {
    const customer = byId.get(String(row.customer?.id ?? ""));
    return {
      request: row,
      customerName: String(customer?.name ?? ""),
      customerEmail: String(customer?.email ?? ""),
      customerPhone: customer?.phone ? String(customer.phone) : null
    };
  });
}

// features/keystone/mutations/onboarding.ts
var import_node_crypto10 = require("node:crypto");
function digest4(value) {
  return (0, import_node_crypto10.createHash)("sha256").update(value).digest("hex");
}
function text23(value, label, max) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required`);
  const normalized = value.trim();
  if (normalized.length > max) throw new Error(`${label} must be at most ${max} characters`);
  return normalized;
}
function optionalDate2(value, label = "Project start date") {
  if (!value) return void 0;
  const parsed = new Date(String(value));
  if (!Number.isFinite(parsed.getTime())) throw new Error(`${label} is invalid`);
  return parsed;
}
function optionalText(value, label, max) {
  if (typeof value !== "string" || !value.trim()) return void 0;
  const normalized = value.trim();
  if (normalized.length > max) throw new Error(`${label} must be at most ${max} characters`);
  return normalized;
}
function canonical(input) {
  return JSON.stringify(Object.fromEntries(Object.entries(input).sort(([a], [b]) => a.localeCompare(b))));
}
async function replay(context, fingerprint, requestHash) {
  const record = await queryOne(
    context,
    "IdempotencyKey",
    { fingerprint },
    "id requestHash status resourceId toStatus agentAction { id }"
  );
  if (!record) return null;
  if (record.requestHash !== requestHash) throw new Error("Idempotency key was already used with different onboarding data");
  if (record.status !== "completed" || !record.resourceId || !record.toStatus || !record.agentAction?.id) {
    throw new Error("Onboarding request is still in progress");
  }
  return {
    success: true,
    companyId: String(record.resourceId),
    projectId: String(record.toStatus),
    actionId: record.agentAction.id,
    replayed: true
  };
}
var managerPermissions = /* @__PURE__ */ new Set([
  "canAccessDashboard",
  "canReadCompanies",
  "canManageCompanies",
  "canReadPeople",
  "canManagePeople",
  "canReadProjects",
  "canManageProjects",
  "canReadPreconstruction",
  "canManagePreconstruction",
  "canReadFinancials",
  "canManageFinancials",
  "canReadContracts",
  "canManageContracts",
  "canReadProjectExecution",
  "canManageProjectExecution",
  "canReadDocuments",
  "canManageDocuments",
  "canReadFieldOperations",
  "canManageFieldOperations",
  "canReadSafety",
  "canManageSafety",
  "canReadBilling",
  "canManageBilling",
  "canReadAgents",
  "canReadAudit",
  "canManageOnboarding"
]);
var fieldPermissions = /* @__PURE__ */ new Set([
  "canAccessDashboard",
  "canReadCompanies",
  "canReadProjects",
  "canReadProjectExecution",
  "canReadDocuments",
  "canReadFieldOperations",
  "canManageFieldOperations",
  "canReadSafety",
  "canManageSafety"
]);
var externalPermissions = /* @__PURE__ */ new Set([
  "canReadProjects",
  "canReadPreconstruction",
  "canManagePreconstruction",
  "canReadProjectExecution",
  "canManageProjectExecution",
  "canReadDocuments",
  "canReadFieldOperations",
  "canManageFieldOperations",
  "canReadSafety",
  "canReadBilling",
  "canManageBilling"
]);
function roleData(name, companyId, enabled) {
  return {
    name,
    company: { connect: { id: companyId } },
    ...Object.fromEntries(permissionsList.map((permission) => [permission, enabled === "all" || enabled.has(permission)]))
  };
}
async function onboardConstructionWorkspace(_root, { input }, context) {
  const session = context.session;
  if (!session?.itemId || session.authType === "api_key") throw new Error("A live user session is required for first-company onboarding");
  if (!hasPermission(session, "canManageOnboarding") || !hasPermission(session, "canManageCompanies")) {
    throw new Error("Only the initial platform administrator can onboard a company");
  }
  const normalized = {
    ...input,
    companyName: text23(input.companyName, "Company name", 200),
    companySlug: text23(input.companySlug, "Company slug", 120).toLowerCase(),
    legalName: optionalText(input.legalName, "Legal name", 240) ?? null,
    brandName: text23(input.brandName, "Brand name", 120),
    brandMark: text23(input.brandMark, "Brand mark", 4).toUpperCase(),
    brandTagline: optionalText(input.brandTagline, "Tagline", 240) ?? null,
    brandColor: text23(input.brandColor, "Brand color", 7).toUpperCase(),
    projectNumber: text23(input.projectNumber, "Project number", 80),
    projectName: text23(input.projectName, "Project name", 240),
    projectDescription: optionalText(input.projectDescription, "Project description", 4e3) ?? null,
    // New optional setup fields stay out of the request hash when empty, so
    // retries of requests made before they existed still replay.
    completionDate: optionalText(input.completionDate, "Planned completion date", 40),
    clientName: optionalText(input.clientName, "Client", 240),
    tradePartnerName: optionalText(input.tradePartnerName, "Trade partner", 240),
    currencyCode: text23(input.currencyCode, "Currency code", 3).toUpperCase(),
    costCode: text23(input.costCode, "Cost code", 40),
    costCodeName: text23(input.costCodeName, "Cost code name", 200),
    budgetCode: text23(input.budgetCode, "Budget code", 80),
    budgetCodeDescription: text23(input.budgetCodeDescription, "Budget code description", 240),
    publicContactEmail: text23(input.publicContactEmail, "Public contact email", 320).toLowerCase(),
    publicContactPhone: input.publicContactPhone?.trim() || null,
    // The service area is also the primary public service's market (max 160).
    publicServiceArea: text23(input.publicServiceArea, "Public service area", 160),
    publicCapabilitySummary: text23(input.publicCapabilitySummary, "Public capability summary", 1200),
    primaryServiceName: text23(input.primaryServiceName, "Primary public service", 160),
    primaryServiceSummary: text23(input.primaryServiceSummary, "Primary service summary", 500),
    publicPrivacyNotice: text23(input.publicPrivacyNotice, "Public privacy notice", 1200),
    publishFirstProject: input.publishFirstProject === true,
    publicProjectSummary: input.publicProjectSummary?.trim() || null,
    publicProjectMarket: input.publicProjectMarket?.trim() || null,
    publicProjectLocation: input.publicProjectLocation?.trim() || null,
    idempotencyKey: text23(input.idempotencyKey, "Idempotency key", 200)
  };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.publicContactEmail)) throw new Error("Public contact email is invalid");
  if (normalized.publicContactPhone && normalized.publicContactPhone.length > 50) throw new Error("Public contact phone must be at most 50 characters");
  if (normalized.publicCapabilitySummary.length < 20 || normalized.primaryServiceSummary.length < 20 || normalized.publicPrivacyNotice.length < 20) {
    throw new Error("Public capability, service, and privacy summaries must each be at least 20 characters");
  }
  if (normalized.publishFirstProject && (!normalized.publicProjectSummary || normalized.publicProjectSummary.length < 20)) {
    throw new Error("A public project summary of at least 20 characters is required when publishing the first project");
  }
  if (normalized.publicProjectSummary && normalized.publicProjectSummary.length > 600) throw new Error("Public project summary must be at most 600 characters");
  if (normalized.publicProjectMarket && normalized.publicProjectMarket.length > 160) throw new Error("Public project market must be at most 160 characters");
  if (normalized.publicProjectLocation && normalized.publicProjectLocation.length > 200) throw new Error("Public project location must be at most 200 characters");
  if (normalized.brandName.length < 2) throw new Error("Brand name must be at least 2 characters");
  if (normalized.publishFirstProject && normalized.projectName.length > 200) throw new Error("Project name must be at most 200 characters to publish it");
  const startDate = optionalDate2(normalized.startDate);
  const completionDate = optionalDate2(normalized.completionDate, "Planned completion date");
  if (startDate && completionDate && completionDate < startDate) throw new Error("Planned completion must be after the start date");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized.companySlug)) throw new Error("Company slug is invalid");
  if (!/^[A-Z0-9]{1,4}$/.test(normalized.brandMark)) throw new Error("Brand mark must use 1\u20134 letters or numbers");
  if (!/^#[0-9A-F]{6}$/.test(normalized.brandColor)) throw new Error("Brand color must be a six-digit hex value");
  if (!/^[A-Z]{3}$/.test(normalized.currencyCode)) throw new Error("Currency code must be an ISO-style three-letter code");
  if (normalized.currencyCode !== "USD") throw new Error("Only USD is currently supported until end-to-end currency propagation is complete");
  const requestHash = digest4(canonical(normalized));
  const fingerprint = digest4(`${session.itemId}onboardConstructionWorkspace${normalized.idempotencyKey}`);
  if (!context.transaction) throw new Error("Transactional onboarding context is required");
  return context.transaction(async (tx) => {
    if (hasNativeAuthorityPort(tx)) await lockInitialOnboardingAuthority(tx);
    const existing = await replay(tx, fingerprint, requestHash);
    if (existing) return existing;
    const membershipCount = await queryCount(tx, "CompanyMembership", {
      user: { id: { equals: session.itemId } },
      status: { equals: "active" }
    });
    if (membershipCount > 0) throw new Error("First-company onboarding is already complete for this account");
    const sudo = tx.sudo();
    const company = await sudo.db.Company.createOne({ data: {
      name: normalized.companyName,
      slug: normalized.companySlug,
      legalName: normalized.legalName || "",
      ...normalized.fictionalFixture ? { isDemo: true } : {},
      status: "active",
      brandName: normalized.brandName,
      brandMark: normalized.brandMark,
      brandTagline: normalized.brandTagline || "",
      brandColor: normalized.brandColor
    } });
    const [administratorRole, managerRole, fieldRole, externalRole] = await Promise.all([
      sudo.db.Role.createOne({ data: roleData("Company Administrator", company.id, "all") }),
      sudo.db.Role.createOne({ data: roleData("Project Manager", company.id, managerPermissions) }),
      sudo.db.Role.createOne({ data: roleData("Field Lead", company.id, fieldPermissions) }),
      sudo.db.Role.createOne({ data: roleData("External Collaborator", company.id, externalPermissions) })
    ]);
    await sudo.db.CompanyMembership.createOne({ data: {
      membershipKey: `${company.id}:${session.itemId}`,
      status: "active",
      canAccessAllProjects: true,
      joinedAt: /* @__PURE__ */ new Date(),
      role: { connect: { id: administratorRole.id } },
      company: { connect: { id: company.id } },
      user: { connect: { id: session.itemId } }
    } });
    const client = normalized.clientName ? await sudo.db.TradePartner.createOne({ data: {
      name: normalized.clientName,
      partnerType: "owner",
      status: "prospective",
      company: { connect: { id: company.id } }
    } }) : null;
    const tradePartner = normalized.tradePartnerName ? await sudo.db.TradePartner.createOne({ data: {
      name: normalized.tradePartnerName,
      partnerType: "subcontractor",
      status: "prospective",
      company: { connect: { id: company.id } }
    } }) : null;
    const project = await sudo.db.Project.createOne({ data: {
      projectNumber: normalized.projectNumber,
      name: normalized.projectName,
      description: normalized.projectDescription || "",
      startDate,
      ...completionDate ? { substantialCompletionDate: completionDate } : {},
      ...client ? { owner: { connect: { id: client.id } } } : {},
      currencyCode: normalized.currencyCode,
      projectManager: { connect: { id: session.itemId } },
      superintendent: { connect: { id: session.itemId } },
      company: { connect: { id: company.id } }
    } });
    const publicSite = await sudo.db.PublicSiteProfile.createOne({ data: {
      siteKey: getTrustedPublicSiteKey(),
      status: "published",
      serviceArea: normalized.publicServiceArea,
      capabilitySummary: normalized.publicCapabilitySummary,
      inquiryEmail: normalized.publicContactEmail,
      inquiryPhone: normalized.publicContactPhone || "",
      privacyNotice: normalized.publicPrivacyNotice,
      acceptingInquiries: true,
      company: { connect: { id: company.id } }
    } });
    const serviceSlug = publicSlug(normalized.primaryServiceName, "construction-services");
    await sudo.db.PublicService.createOne({ data: {
      serviceKey: `${company.id}:${serviceSlug}`,
      slug: serviceSlug,
      title: normalized.primaryServiceName,
      summary: normalized.primaryServiceSummary,
      details: normalized.publicCapabilitySummary,
      market: normalized.publicServiceArea,
      sortOrder: 0,
      status: "published",
      site: { connect: { id: publicSite.id } },
      company: { connect: { id: company.id } }
    } });
    if (normalized.publishFirstProject) {
      const publicationSlug = publicSlug(normalized.projectName, normalized.projectNumber.toLowerCase());
      await sudo.db.PublicProject.createOne({ data: {
        publicationKey: `${company.id}:${publicationSlug}`,
        slug: publicationSlug,
        title: normalized.projectName,
        summary: normalized.publicProjectSummary,
        description: normalized.projectDescription || "",
        market: normalized.publicProjectMarket || "",
        locationLabel: normalized.publicProjectLocation || "",
        completionLabel: "Current work",
        sortOrder: 0,
        status: "published",
        sourceProject: { connect: { id: project.id } },
        site: { connect: { id: publicSite.id } },
        company: { connect: { id: company.id } }
      } });
    }
    await sudo.db.ProjectMembership.createOne({ data: {
      membershipKey: `${project.id}:${session.itemId}`,
      status: "active",
      accessLevel: "manager",
      portalType: "internal",
      joinedAt: /* @__PURE__ */ new Date(),
      role: { connect: { id: administratorRole.id } },
      project: { connect: { id: project.id } },
      user: { connect: { id: session.itemId } }
    } });
    const costCode = await sudo.db.CostCode.createOne({ data: {
      code: normalized.costCode,
      name: normalized.costCodeName,
      isActive: true,
      company: { connect: { id: company.id } }
    } });
    const budgetCode = await sudo.db.BudgetCode.createOne({ data: {
      code: normalized.budgetCode,
      description: normalized.budgetCodeDescription,
      costType: "other",
      isActive: true,
      costCode: { connect: { id: costCode.id } },
      project: { connect: { id: project.id } }
    } });
    const budget = await sudo.db.Budget.createOne({ data: {
      name: "Initial project budget",
      version: 1,
      status: "active",
      currencyCode: normalized.currencyCode,
      approvedAt: /* @__PURE__ */ new Date(),
      approvedBy: { connect: { id: session.itemId } },
      project: { connect: { id: project.id } }
    } });
    await sudo.db.BudgetLineItem.createOne({ data: {
      description: normalized.budgetCodeDescription,
      budget: { connect: { id: budget.id } },
      budgetCode: { connect: { id: budgetCode.id } },
      project: { connect: { id: project.id } }
    } });
    for (const domain of APPROVAL_POLICY_DOMAINS) {
      await sudo.db.ApprovalPolicy.createOne({ data: {
        policyKey: `${company.id}:${project.id}:${domain}:default`,
        name: `Default ${domain.replaceAll("_", " ")} approval`,
        domain,
        minimumAmountMinor: "0",
        currencyCode: normalized.currencyCode,
        isActive: true,
        approverRole: { connect: { id: administratorRole.id } },
        company: { connect: { id: company.id } },
        project: { connect: { id: project.id } }
      } });
    }
    const setup = await seedWorkspaceSetup(sudo.db, { projectId: project.id, startDate, completionDate });
    const sampleWorkspace = Boolean(normalized.fictionalFixture);
    if (sampleWorkspace) {
      if (!client || !tradePartner || !startDate) throw new Error("The sample workspace needs its client, trade partner and start date");
      await seedSampleWorkspace(sudo.db, {
        companyId: company.id,
        projectId: project.id,
        actorId: session.itemId,
        budgetCodeId: budgetCode.id,
        clientId: client.id,
        tradePartnerId: tradePartner.id,
        locationId: setup.locationId,
        scheduleId: setup.scheduleId,
        inspectionTemplateId: setup.inspectionTemplateId,
        startDate
      });
    }
    await assertWorkspaceReady(sudo.query, { companyId: company.id, projectId: project.id, actorId: session.itemId });
    const idempotency = await sudo.db.IdempotencyKey.createOne({ data: {
      fingerprint,
      key: normalized.idempotencyKey,
      operation: "onboardConstructionWorkspace",
      requestHash,
      status: "started",
      resourceType: "Company",
      resourceId: company.id,
      toStatus: project.id,
      company: { connect: { id: company.id } },
      project: { connect: { id: project.id } },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1e3)
    } });
    const action = await sudo.db.AgentAction.createOne({ data: {
      actionKey: (0, import_node_crypto10.randomUUID)(),
      actorType: "human",
      action: "onboardConstructionWorkspace",
      status: "succeeded",
      targetType: "Company",
      targetId: company.id,
      targetStatus: "onboarded",
      reason: sampleWorkspace ? "Create the fictional sample contractor workspace" : "Create the first contractor workspace",
      requestDigest: requestHash,
      resultDigest: digest4(`${company.id}${project.id}`),
      requestedAt: /* @__PURE__ */ new Date(),
      startedAt: /* @__PURE__ */ new Date(),
      completedAt: /* @__PURE__ */ new Date(),
      company: { connect: { id: company.id } },
      project: { connect: { id: project.id } },
      requestedBy: { connect: { id: session.itemId } },
      actorUser: { connect: { id: session.itemId } },
      idempotencyKey: { connect: { id: idempotency.id } }
    } });
    await sudo.db.IdempotencyKey.updateOne({ where: { id: idempotency.id }, data: {
      status: "completed",
      agentAction: { connect: { id: action.id } }
    } });
    await sudo.db.User.updateOne({ where: { id: session.itemId }, data: { onboardingStatus: "completed" } });
    const payload = JSON.stringify({
      schemaVersion: 1,
      eventType: "ConstructionWorkspace.onboarded",
      companyId: company.id,
      projectId: project.id,
      publicSiteId: publicSite.id,
      actorId: session.itemId,
      sampleWorkspace
    });
    await sudo.db.OutboxMessage.createOne({ data: {
      messageKey: `onboardConstructionWorkspace:${company.id}:${normalized.idempotencyKey}`,
      eventType: "ConstructionWorkspace.onboarded",
      aggregateType: "Company",
      aggregateId: company.id,
      canonicalPayload: payload,
      payloadDigest: digest4(payload),
      status: "pending",
      company: { connect: { id: company.id } },
      project: { connect: { id: project.id } },
      agentAction: { connect: { id: action.id } }
    } });
    return { success: true, companyId: company.id, projectId: project.id, actionId: action.id, replayed: false };
  }, { timeout: 6e4 });
}

// features/keystone/mutations/api-credentials.ts
var import_node_crypto11 = require("node:crypto");
function requireSession5(context) {
  if (!context.session?.itemId || context.session.authType === "api_key") {
    throw new Error("A live user session is required to administer API credentials");
  }
  return context.session;
}
function required(value, label, max) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required`);
  const normalized = value.trim();
  if (normalized.length > max) throw new Error(`${label} must be at most ${max} characters`);
  return normalized;
}
function digest5(value) {
  return (0, import_node_crypto11.createHash)("sha256").update(value).digest("hex");
}
async function authorize(context, session, companyId, projectId2) {
  if (!hasCompanyPermission(session, companyId, "canManageAgents") || !await canAccessCompanyById(context, session.itemId, companyId, true)) {
    throw new Error("Not authorized to administer API credentials for this company");
  }
  if (projectId2) {
    const project = await queryById(context, "Project", projectId2, "id company { id }");
    if (project?.company?.id !== companyId || !hasProjectPermission(session, companyId, projectId2, "canManageAgents", true) || !await canAccessProjectById(context, session.itemId, projectId2, true)) {
      throw new Error("Not authorized to administer API credentials for this project");
    }
  }
}
async function issueApiCredential(_root, { input }, context) {
  const session = requireSession5(context);
  const companyId = required(input.companyId, "Company id", 200);
  const projectId2 = input.projectId ? required(input.projectId, "Project id", 200) : null;
  await authorize(context, session, companyId, projectId2);
  const name = required(input.name, "Credential name", 160);
  const scopes = [...new Set(input.scopes.map(normalizeScope))];
  if (scopes.length === 0 || scopes.length > 12) throw new Error("Choose between one and twelve API scopes");
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
  if (expiresAt && (!Number.isFinite(expiresAt.getTime()) || expiresAt <= /* @__PURE__ */ new Date())) {
    throw new Error("API credential expiry must be in the future");
  }
  if (!context.transaction) throw new Error("Transactional API credential context is required");
  const token = `ofc_live_${(0, import_node_crypto11.randomBytes)(32).toString("base64url")}`;
  const tokenHash = digest5(token);
  const tokenPrefix = token.slice(0, 16);
  const result = await context.transaction(async (tx) => {
    const fresh = await lockCurrentAuthority(tx, companyId, projectId2, "canManageAgents");
    await authorize(tx, fresh, companyId, projectId2);
    const sudo = tx.sudo();
    const credential = await sudo.db.ApiCredential.createOne({ data: {
      name,
      tokenPrefix,
      tokenHash,
      status: "active",
      scopes,
      expiresAt,
      owner: { connect: { id: session.itemId } },
      company: { connect: { id: companyId } },
      ...projectId2 ? { project: { connect: { id: projectId2 } } } : {}
    } });
    const action = await sudo.db.AgentAction.createOne({ data: {
      actionKey: (0, import_node_crypto11.randomUUID)(),
      actorType: "human",
      action: "issueApiCredential",
      status: "succeeded",
      targetType: "ApiCredential",
      targetId: credential.id,
      targetStatus: "active",
      reason: `Issue scoped API credential ${name}`,
      requestDigest: digest5(JSON.stringify({ companyId, projectId: projectId2, name, scopes, expiresAt: expiresAt?.toISOString() ?? null })),
      requestedAt: /* @__PURE__ */ new Date(),
      startedAt: /* @__PURE__ */ new Date(),
      completedAt: /* @__PURE__ */ new Date(),
      company: { connect: { id: companyId } },
      ...projectId2 ? { project: { connect: { id: projectId2 } } } : {},
      requestedBy: { connect: { id: session.itemId } },
      actorUser: { connect: { id: session.itemId } }
    } });
    const payload = JSON.stringify({ schemaVersion: 1, credentialId: credential.id, companyId, projectId: projectId2, scopes, tokenPrefix });
    await sudo.db.OutboxMessage.createOne({ data: {
      messageKey: `issueApiCredential:${credential.id}`,
      eventType: "ApiCredential.issued",
      aggregateType: "ApiCredential",
      aggregateId: credential.id,
      canonicalPayload: payload,
      payloadDigest: digest5(payload),
      status: "pending",
      company: { connect: { id: companyId } },
      ...projectId2 ? { project: { connect: { id: projectId2 } } } : {},
      agentAction: { connect: { id: action.id } }
    } });
    return { credentialId: credential.id, actionId: action.id };
  }, { timeout: 3e4 });
  return { success: true, ...result, token, tokenPrefix, scopes };
}
async function revokeApiCredential(_root, { id, reason }, context) {
  const session = requireSession5(context);
  const credential = await queryById(context, "ApiCredential", required(id, "Credential id", 200), "id status tokenPrefix company { id } project { id }");
  const companyId = credential?.company?.id;
  if (!credential?.id || !companyId) throw new Error("API credential not found");
  const projectId2 = credential.project?.id ?? null;
  await authorize(context, session, companyId, projectId2);
  const normalizedReason = required(reason, "Revocation reason", 500);
  if (!context.transaction) throw new Error("Transactional API credential context is required");
  return context.transaction(async (tx) => {
    const fresh = await lockCurrentAuthority(tx, companyId, projectId2, "canManageAgents");
    await authorize(tx, fresh, companyId, projectId2);
    if (!tx.prisma?.$queryRawUnsafe) throw new Error("Transactional credential lock is unavailable");
    await tx.prisma.$queryRawUnsafe('SELECT id FROM "ApiCredential" WHERE id = $1 FOR UPDATE', String(credential.id));
    const sudo = tx.sudo();
    const current = await sudo.query.ApiCredential.findOne({ where: { id: String(credential.id) }, query: "id status company { id } project { id }" });
    if (!current || current.company?.id !== companyId || (current.project?.id ?? null) !== projectId2) throw new Error("API credential not found");
    if (current.status === "revoked") {
      const [receipt] = await sudo.query.AgentAction.findMany({ where: { company: { id: { equals: companyId } }, action: { equals: "revokeApiCredential" }, targetId: { equals: String(credential.id) } }, take: 1, orderBy: [{ completedAt: "asc" }, { id: "asc" }], query: "id" });
      if (!receipt?.id) throw new Error("Revocation receipt is unavailable");
      return { success: true, credentialId: String(credential.id), actionId: String(receipt.id), replayed: true };
    }
    await sudo.db.ApiCredential.updateOne({ where: { id: String(credential.id) }, data: { status: "revoked", revokedAt: /* @__PURE__ */ new Date() } });
    const action = await sudo.db.AgentAction.createOne({ data: {
      actionKey: (0, import_node_crypto11.randomUUID)(),
      actorType: "human",
      action: "revokeApiCredential",
      status: "succeeded",
      targetType: "ApiCredential",
      targetId: String(credential.id),
      targetStatus: "revoked",
      reason: normalizedReason,
      requestedAt: /* @__PURE__ */ new Date(),
      startedAt: /* @__PURE__ */ new Date(),
      completedAt: /* @__PURE__ */ new Date(),
      company: { connect: { id: companyId } },
      ...projectId2 ? { project: { connect: { id: projectId2 } } } : {},
      requestedBy: { connect: { id: session.itemId } },
      actorUser: { connect: { id: session.itemId } }
    } });
    const payload = JSON.stringify({ schemaVersion: 1, credentialId: credential.id, companyId, projectId: projectId2, reason: normalizedReason });
    await sudo.db.OutboxMessage.createOne({ data: {
      messageKey: `revokeApiCredential:${credential.id}:${action.id}`,
      eventType: "ApiCredential.revoked",
      aggregateType: "ApiCredential",
      aggregateId: String(credential.id),
      canonicalPayload: payload,
      payloadDigest: digest5(payload),
      status: "pending",
      company: { connect: { id: companyId } },
      ...projectId2 ? { project: { connect: { id: projectId2 } } } : {},
      agentAction: { connect: { id: action.id } }
    } });
    return { success: true, credentialId: String(credential.id), actionId: action.id, replayed: false };
  }, { timeout: 3e4 });
}

// features/keystone/mutations/approvals.ts
var import_node_crypto12 = require("node:crypto");
async function approvalTransaction(context, callback, options) {
  if (context.__constructionTransaction) return callback(context);
  if (!context.transaction) throw new Error("Transactional approval context is required");
  return context.transaction(callback, options);
}
function digest6(value) {
  return (0, import_node_crypto12.createHash)("sha256").update(value).digest("hex");
}
function required2(value, label, max) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required`);
  const normalized = value.trim();
  if (normalized.length > max) throw new Error(`${label} must be at most ${max} characters`);
  return normalized;
}
function requireSession6(context) {
  if (!context.session?.itemId) throw new Error("Authentication required");
  return context.session;
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function actorHasPolicyRole(session, companyId, projectId2, roleId) {
  if (!roleId) return true;
  const explicit = session.data.projectMemberships?.find((entry) => entry.status === "active" && entry.project?.id === projectId2 && entry.project?.company?.id === companyId);
  if (explicit) return explicit.role?.id === roleId;
  return Boolean(session.data.companyMemberships?.some((entry) => entry.status === "active" && entry.canAccessAllProjects && entry.company?.id === companyId && entry.role?.id === roleId));
}
async function requestConstructionApproval(_root, { input }, context) {
  const session = requireSession6(context);
  const targetId = required2(input.targetId, "Target id", 200);
  const targetStatus = required2(input.targetStatus, "Target status", 80);
  const requestNumber = required2(input.requestNumber, "Approval request number", 100);
  const reason = required2(input.reason, "Approval reason", 500);
  if (targetStatus !== "approved") throw new Error("The bounded initial approval workflow supports exact approval-state requests only");
  const config3 = Object.hasOwn(approvalTargets, input.targetType) ? approvalTargets[input.targetType] : void 0;
  if (!config3) throw new Error("This resource does not support bounded approvals");
  const target = await queryById(context, config3.listKey, targetId, "id company { id } project { id }");
  const companyId = target?.company?.id;
  const projectId2 = target?.project?.id;
  if (!companyId || !projectId2) throw new Error("Approval target not found");
  if (!hasProjectPermission(session, companyId, projectId2, config3.permission, true) || !await canAccessProjectById(context, session.itemId, projectId2, true)) throw new Error("Not authorized to request approval for this project");
  if (!context.__constructionTransaction) {
    if (!context.transaction) throw new Error("Transactional approval context is required");
    return context.transaction(async (tx) => {
      const fresh = await lockCurrentAuthority(tx, companyId, projectId2, config3.permission);
      const current = tx.withSession ? tx.withSession(fresh) : tx;
      return requestConstructionApproval(_root, { input }, { ...current, session: fresh, __constructionTransaction: true });
    }, { timeout: 3e4 });
  }
  let assigneeMembershipId = input.assigneeMembershipId ? required2(input.assigneeMembershipId, "Assignee membership id", 200) : null;
  const resourceWhere = { project: { id: { equals: projectId2 } }, targetType: { equals: config3.listKey }, targetId: { equals: targetId }, targetStatus: { equals: targetStatus } };
  const existing = await context.sudo().query.ApprovalRequest.findMany({
    where: { ...resourceWhere, requestNumber: { equals: requestNumber }, requestedBy: { id: { equals: session.itemId } } },
    take: 2,
    query: "id status assignedTo { id }"
  });
  if (existing.length > 1) throw new Error("This number identifies multiple prior attempts; review their receipts before starting a new request");
  if (existing[0]?.id) {
    const assigned = isRecord(existing[0].assignedTo) ? existing[0].assignedTo.id : null;
    const [receipt] = await context.sudo().query.AgentAction.findMany({ where: { action: { equals: "requestConstructionApproval" }, targetId: { equals: String(existing[0].id) }, requestedBy: { id: { equals: session.itemId } } }, take: 1, query: "id reason" });
    if (!receipt?.id || receipt.reason !== reason || assigned !== assigneeMembershipId) throw new Error("Approval replay must match the original request payload and receipt");
    if (existing[0].status !== "pending") throw new Error(`This approval attempt is already ${String(existing[0].status)}; use a new request number for a new review`);
    return { success: true, requestId: String(existing[0].id), actionId: String(receipt.id), replayed: true };
  }
  const loaded = await lockApprovalSnapshot(context, input.targetType, targetId);
  const targetCurrency = required2(loaded.record.currencyCode, "Recorded currency", 3);
  if (targetCurrency !== "USD") throw new Error("Approval workflows are disabled for non-USD projects until currency propagation is complete");
  const amountMinor = String(loaded.record[loaded.config.amountField] ?? "");
  if (!/^-?\d+$/.test(amountMinor)) throw new Error("The recorded approval amount is unavailable");
  const amountMagnitude = (BigInt(amountMinor) < BigInt(0) ? -BigInt(amountMinor) : BigInt(amountMinor)).toString();
  const policies = await context.sudo().query.ApprovalPolicy.findMany({
    where: {
      domain: { equals: loaded.config.domain },
      isActive: { equals: true },
      company: { id: { equals: loaded.companyId } },
      OR: [
        { project: { id: { equals: loaded.projectId } } },
        { project: null }
      ],
      minimumAmountMinor: { lte: amountMagnitude },
      currencyCode: { equals: targetCurrency }
    },
    take: 101,
    query: "id domain minimumAmountMinor currencyCode isActive approverRole { id } company { id } project { id }"
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
  let assignmentSnapshot = null;
  if (input.assigneeMembershipId) {
    assigneeMembershipId = required2(input.assigneeMembershipId, "Assignee membership id", 200);
    if (context.prisma?.$queryRawUnsafe) {
      await context.prisma.$queryRawUnsafe('SELECT id FROM "ProjectMembership" WHERE id = $1 FOR SHARE', assigneeMembershipId);
      await context.prisma.$queryRawUnsafe('SELECT id FROM "User" WHERE id = (SELECT "user" FROM "ProjectMembership" WHERE id = $1) FOR SHARE', assigneeMembershipId);
      await context.prisma.$queryRawUnsafe('SELECT id FROM "Role" WHERE id = (SELECT role FROM "ProjectMembership" WHERE id = $1) FOR SHARE', assigneeMembershipId);
    }
    const assignee = await context.sudo().query.ProjectMembership.findOne({ where: { id: assigneeMembershipId }, query: `id status portalType accessLevel project { id company { id } } user { id isActive } role { id ${loaded.config.permission} company { id } } portalOrganization { id company { id } }` });
    const policyRole = isRecord(policy.approverRole) ? policy.approverRole : null;
    const assigneeRole = isRecord(assignee?.role) ? assignee.role : null;
    const roleCompany = isRecord(assigneeRole?.company) ? assigneeRole.company : null;
    const assigneeUser = isRecord(assignee?.user) ? assignee.user : null;
    const organization = isRecord(assignee?.portalOrganization) ? assignee.portalOrganization : null;
    const organizationCompany = isRecord(organization?.company) ? organization.company : null;
    const owner = assignee?.portalType === "owner" && organizationCompany?.id === loaded.companyId;
    const internal = assignee?.portalType === "internal" && assigneeRole?.[loaded.config.permission] === true && (!policyRole?.id || assigneeRole?.id === policyRole.id);
    if (assignee?.status !== "active" || assignee.accessLevel === "viewer" || assignee.project?.id !== loaded.projectId || assignee.project?.company?.id !== loaded.companyId || assigneeUser?.isActive !== true || typeof assigneeUser.id !== "string" || typeof assigneeRole?.id !== "string" || roleCompany?.id !== loaded.companyId || !owner && !internal) {
      throw new Error("Approval assignee must be a current eligible reviewer for this project and policy");
    }
    if (assigneeUser.id === session.itemId) throw new Error("Choose a different eligible person for independent approval");
    assignmentSnapshot = { membershipId: assigneeMembershipId, userId: assigneeUser.id, roleId: assigneeRole.id, portalType: assignee.portalType, organizationId: organization?.id ?? null, accessLevel: assignee.accessLevel };
  }
  const snapshot = canonicalApprovalSnapshot({ ...loaded.record, snapshotVersion: 2, approvalTarget: loaded.config.listKey, _approvalAssignment: assignmentSnapshot });
  if (Buffer.byteLength(snapshot, "utf8") > 512e3) throw new Error("Approval snapshot exceeds the supported review size");
  const snapshotDigest = digestApprovalSnapshot(snapshot);
  const requestKey = digest6([companyId, projectId2, config3.listKey, targetId, targetStatus, session.itemId, requestNumber].join(String.fromCharCode(31)));
  const pending = await context.sudo().query.ApprovalRequest.findMany({ where: { ...resourceWhere, status: { equals: "pending" }, policyDigest: { equals: policyDigest } }, take: 101, query: "id canonicalSnapshot snapshotDigest" });
  if (pending.length > 100) throw new Error("Pending approval history exceeds the supported review limit");
  if (pending.some((request) => matchesApprovalSnapshot(loaded, request.canonicalSnapshot, request.snapshotDigest))) throw new Error("A review of these exact terms is already pending; finish or supersede it before requesting another");
  if (!context.transaction) throw new Error("Transactional approval context is required");
  try {
    return await approvalTransaction(context, async (tx) => {
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
        ...assigneeMembershipId ? { assignedTo: { connect: { id: assigneeMembershipId } } } : {},
        project: { connect: { id: loaded.projectId } }
      } });
      const action = await sudo.db.AgentAction.createOne({ data: {
        actionKey: (0, import_node_crypto12.randomUUID)(),
        actorType: session.authType === "api_key" ? "agent" : "human",
        action: "requestConstructionApproval",
        status: "succeeded",
        targetType: "ApprovalRequest",
        targetId: request.id,
        targetStatus: "pending",
        reason,
        correlationId: session.apiCredential?.id,
        requestDigest: snapshotDigest,
        requestedAt: /* @__PURE__ */ new Date(),
        startedAt: /* @__PURE__ */ new Date(),
        completedAt: /* @__PURE__ */ new Date(),
        company: { connect: { id: loaded.companyId } },
        project: { connect: { id: loaded.projectId } },
        requestedBy: { connect: { id: session.itemId } },
        actorUser: { connect: { id: session.itemId } }
      } });
      const payload = JSON.stringify({ schemaVersion: 1, requestId: request.id, targetType: loaded.config.listKey, targetId, targetStatus, snapshotDigest, assigneeMembershipId });
      await sudo.db.OutboxMessage.createOne({ data: {
        messageKey: `ApprovalRequest:${request.id}:requested`,
        eventType: "ApprovalRequest.requested",
        aggregateType: "ApprovalRequest",
        aggregateId: request.id,
        canonicalPayload: payload,
        payloadDigest: digest6(payload),
        status: "pending",
        company: { connect: { id: loaded.companyId } },
        project: { connect: { id: loaded.projectId } },
        agentAction: { connect: { id: action.id } }
      } });
      return { success: true, requestId: request.id, actionId: action.id, replayed: false };
    }, { timeout: 3e4 });
  } catch (error) {
    const concurrent = await context.sudo().query.ApprovalRequest.findMany({ where: { requestKey: { equals: requestKey }, status: { equals: "pending" } }, take: 1, query: "id" });
    if (concurrent[0]?.id) {
      const [receipt] = await context.sudo().query.AgentAction.findMany({ where: { action: { equals: "requestConstructionApproval" }, targetId: { equals: String(concurrent[0].id) }, requestedBy: { id: { equals: session.itemId } } }, take: 1, query: "id reason" });
      if (receipt?.id && receipt.reason === reason) return { success: true, requestId: String(concurrent[0].id), actionId: String(receipt.id), replayed: true };
    }
    throw error;
  }
}
async function decideConstructionApproval(_root, { input }, context) {
  const session = requireSession6(context);
  if (session.authType === "api_key") throw new Error("Approval decisions require a live human session");
  const request = await queryById(context, "ApprovalRequest", required2(input.requestId, "Approval request id", 200), `
    id status targetType targetId targetStatus canonicalSnapshot snapshotDigest policySnapshot policyDigest approverRoleIdSnapshot amountMinor
    company { id } project { id }
    policy { id }
    requestedBy { id }
    assignedTo { id status portalType accessLevel role { id } portalOrganization { id } user { id } }
  `);
  if (!request?.id || request.status !== "pending" || !request.company?.id || !request.project?.id) {
    throw new Error("Pending approval request not found");
  }
  if (!context.__constructionTransaction) {
    if (!context.transaction) throw new Error("Transactional approval context is required");
    const target2 = approvalTargets[String(request.targetType)];
    if (!target2) throw new Error("Approval target is unavailable");
    const externalOrganizationId = request.assignedTo?.user?.id === session.itemId && request.assignedTo.portalType === "owner" && request.assignedTo.accessLevel !== "viewer" ? request.assignedTo.portalOrganization?.id : void 0;
    return context.transaction(async (tx) => {
      const authority = externalOrganizationId ? { kind: "assigned-owner-approval", requestId: String(request.id) } : target2.permission;
      const fresh = await lockCurrentAuthority(tx, request.company.id, request.project.id, authority, externalOrganizationId);
      const current = tx.withSession ? tx.withSession(fresh) : tx;
      return decideConstructionApproval(_root, { input }, { ...current, session: fresh, __constructionTransaction: true });
    }, { timeout: 3e4 });
  }
  if (request.requestedBy?.id === session.itemId) throw new Error("A different authorized person must decide this approval request");
  const decision = input.decision === "approved" || input.decision === "rejected" ? input.decision : null;
  if (!decision) throw new Error("Approval decision must be approved or rejected");
  const target = approvalTargets[String(request.targetType)];
  if (request.assignedTo && (request.assignedTo.status !== "active" || request.assignedTo.user?.id !== session.itemId || request.assignedTo.accessLevel === "viewer")) {
    throw new Error("Only the current assigned approver may decide this request");
  }
  const assignedExternal = request.assignedTo?.status === "active" && request.assignedTo.user?.id === session.itemId && request.assignedTo.portalType === "owner" && request.assignedTo.accessLevel !== "viewer";
  const internalApprover = Boolean(target) && hasProjectPermission(session, request.company.id, request.project.id, target.permission, true) && actorHasPolicyRole(session, request.company.id, request.project.id, request.approverRoleIdSnapshot || null) && await canAccessProjectById(context, session.itemId, request.project.id, true);
  if (!target || !assignedExternal && !internalApprover) {
    throw new Error("Not authorized to decide this approval request");
  }
  if (!context.transaction) throw new Error("Transactional approval context is required");
  return approvalTransaction(context, async (tx) => {
    if (!tx.prisma?.$queryRawUnsafe) throw new Error("Transactional approval decision lock is unavailable");
    const [locked] = await tx.prisma.$queryRawUnsafe(
      `SELECT status::text, "snapshotDigest" FROM "ApprovalRequest" WHERE id = $1 FOR UPDATE`,
      String(request.id)
    );
    if (!locked || locked.status !== "pending" || locked.snapshotDigest !== request.snapshotDigest) {
      throw new Error("Approval request was already decided or superseded");
    }
    if (decision === "approved") {
      const currentSnapshot = await lockApprovalSnapshot(tx, String(request.targetType), String(request.targetId));
      if (!matchesApprovalSnapshot(currentSnapshot, request.canonicalSnapshot, request.snapshotDigest)) throw new Error("The commercial terms or snapshot version changed; request a new value-bound review");
      const captured = JSON.parse(String(request.canonicalSnapshot));
      const assignment = isRecord(captured) ? captured._approvalAssignment : void 0;
      if (request.assignedTo) {
        if (!isRecord(assignment) || assignment.membershipId !== request.assignedTo.id || assignment.userId !== session.itemId || assignment.portalType !== request.assignedTo.portalType || assignment.organizationId !== (request.assignedTo.portalOrganization?.id ?? null) || assignment.accessLevel !== request.assignedTo.accessLevel || assignment.roleId !== request.assignedTo.role?.id) throw new Error("The assigned reviewer authority changed; request a new review");
      } else if (assignment !== null) throw new Error("Approval assignment evidence is incomplete");
      if (!request.policy?.id || !request.policyDigest || digest6(String(request.policySnapshot ?? "")) !== request.policyDigest) throw new Error("Approval policy evidence is incomplete; request a new value-bound approval");
      const currentPolicy = await lockApprovalPolicySnapshot(tx, String(request.policy.id));
      if (currentPolicy.snapshotDigest !== request.policyDigest) throw new Error("Approval policy changed after request; issue a new approval request");
    }
    const sudo = tx.sudo();
    const decisionRecord = await sudo.db.ApprovalDecision.createOne({ data: {
      decision,
      comment: required2(input.comment, "Decision comment", 2e3),
      request: { connect: { id: String(request.id) } },
      decidedBy: { connect: { id: session.itemId } },
      project: { connect: { id: request.project.id } }
    } });
    await sudo.db.ApprovalRequest.updateOne({ where: { id: String(request.id) }, data: { status: decision, decidedAt: /* @__PURE__ */ new Date() } });
    const action = await sudo.db.AgentAction.createOne({ data: {
      actionKey: (0, import_node_crypto12.randomUUID)(),
      actorType: session.authType === "api_key" ? "agent" : "human",
      action: "decideConstructionApproval",
      status: "succeeded",
      targetType: "ApprovalRequest",
      targetId: String(request.id),
      targetStatus: decision,
      reason: `Approval ${decision}; decision ${decisionRecord.id}`,
      correlationId: session.apiCredential?.id,
      requestDigest: String(request.snapshotDigest),
      requestedAt: /* @__PURE__ */ new Date(),
      startedAt: /* @__PURE__ */ new Date(),
      completedAt: /* @__PURE__ */ new Date(),
      company: { connect: { id: request.company.id } },
      project: { connect: { id: request.project.id } },
      requestedBy: { connect: { id: session.itemId } },
      actorUser: { connect: { id: session.itemId } }
    } });
    const payload = JSON.stringify({ schemaVersion: 1, requestId: request.id, decision, decisionId: decisionRecord.id, targetType: request.targetType, targetId: request.targetId });
    await sudo.db.OutboxMessage.createOne({ data: {
      messageKey: `ApprovalRequest:${request.id}:${decisionRecord.id}`,
      eventType: "ApprovalRequest.decided",
      aggregateType: "ApprovalRequest",
      aggregateId: String(request.id),
      canonicalPayload: payload,
      payloadDigest: digest6(payload),
      status: "pending",
      company: { connect: { id: request.company.id } },
      project: { connect: { id: request.project.id } },
      agentAction: { connect: { id: action.id } }
    } });
    return { success: true, requestId: String(request.id), decisionId: decisionRecord.id, actionId: action.id };
  }, { timeout: 3e4 });
}

// features/keystone/mutations/approval-policies.ts
var domains = /* @__PURE__ */ new Set(["budget_change", "prime_contract", "change_order", "progress_claim", "retainage_release"]);
async function configureConstructionApprovalPolicy(_root, { input }, context) {
  const projectId2 = requiredText(input.projectId, "Project id", 200);
  const project = await queryById(context, "Project", projectId2, "id currencyCode company { id }");
  const companyId = project?.company?.id;
  if (!companyId) throw new Error("Project not found");
  const roleId = requiredText(input.approverRoleId, "Approver role id", 200);
  const role = await queryById(context, "Role", roleId, "id company { id }");
  if (role?.company?.id !== companyId) throw new Error("Approver role must belong to the project company");
  const domain = requiredText(input.domain, "Approval domain", 80);
  if (!domains.has(domain)) throw new Error("Approval domain is invalid");
  const minimumAmountMinor = requiredText(input.minimumAmountMinor, "Minimum amount", 30);
  if (!/^\d+$/.test(minimumAmountMinor)) throw new Error("Minimum amount must be non-negative integer minor units");
  const policyId = input.policyId ? requiredText(input.policyId, "Policy id", 200) : null;
  if (policyId) {
    const policy = await queryById(context, "ApprovalPolicy", policyId, "id project { id } company { id }");
    if (policy?.project?.id !== projectId2 || policy.company?.id !== companyId) throw new Error("Approval policy not found in this project");
  }
  return executeProjectCommand({
    context,
    operation: "configureConstructionApprovalPolicy",
    permission: "canManageRoles",
    projectId: projectId2,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "ApprovalPolicy",
    ...policyId ? { updateId: policyId } : {},
    data: {
      policyKey: `${companyId}:${projectId2}:${domain}:${minimumAmountMinor}`,
      name: requiredText(input.name, "Policy name", 160),
      domain,
      minimumAmountMinor,
      currencyCode: String(project.currencyCode ?? "USD"),
      isActive: Boolean(input.isActive),
      approverRole: { connect: { id: roleId } },
      company: { connect: { id: companyId } },
      project: { connect: { id: projectId2 } }
    }
  });
}

// features/keystone/mutations/documents.ts
var import_node_crypto14 = require("node:crypto");

// features/integrations/storage/s3.ts
var import_node_crypto13 = require("node:crypto");
function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for controlled document delivery`);
  return value;
}
function config() {
  const endpoint = new URL(requiredEnvironment("S3_ENDPOINT"));
  if (endpoint.protocol !== "https:" && !(endpoint.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(endpoint.hostname))) {
    throw new Error("S3_ENDPOINT must use HTTPS except for an explicit loopback development endpoint");
  }
  return {
    endpoint,
    bucket: requiredEnvironment("S3_BUCKET_NAME"),
    region: requiredEnvironment("S3_REGION"),
    accessKeyId: requiredEnvironment("S3_ACCESS_KEY_ID"),
    secretAccessKey: requiredEnvironment("S3_SECRET_ACCESS_KEY")
  };
}
function hash3(value) {
  return (0, import_node_crypto13.createHash)("sha256").update(value).digest("hex");
}
function hmac(key, value) {
  return (0, import_node_crypto13.createHmac)("sha256", key).update(value).digest();
}
function encode(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}
function timestamp16(date3) {
  return date3.toISOString().replace(/[:-]|\.\d{3}/g, "");
}
function objectUrl(storage, key) {
  const url = new URL(storage.endpoint);
  const prefix = url.pathname.replace(/\/$/, "");
  url.pathname = `${prefix}/${encode(storage.bucket)}/${key.split("/").map(encode).join("/")}`;
  return url;
}
function signingKey(secret, date3, region) {
  return hmac(hmac(hmac(hmac(`AWS4${secret}`, date3), region), "s3"), "aws4_request");
}
function assertObjectStorageConfigured() {
  void config();
}
function signObjectRequest(method, metadata2, expiresSeconds = 600, now = /* @__PURE__ */ new Date()) {
  const storage = config();
  const url = objectUrl(storage, metadata2.key);
  const amzDate = timestamp16(now);
  const date3 = amzDate.slice(0, 8);
  const credentialScope = `${date3}/${storage.region}/s3/aws4_request`;
  const headers = method === "PUT" ? {
    "content-type": metadata2.contentType,
    "x-amz-checksum-sha256": Buffer.from(metadata2.checksumSha256, "hex").toString("base64"),
    "x-amz-meta-sha256": metadata2.checksumSha256
  } : method === "HEAD" ? { "x-amz-checksum-mode": "ENABLED" } : {};
  const signedHeaderNames = ["host", ...Object.keys(headers)].sort();
  const canonicalHeaders = signedHeaderNames.map((name) => `${name}:${name === "host" ? url.host : headers[name].trim()}
`).join("");
  const params = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${storage.accessKeyId}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(Math.min(Math.max(expiresSeconds, 60), 900)),
    "X-Amz-SignedHeaders": signedHeaderNames.join(";")
  });
  const canonicalQuery = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${encode(key)}=${encode(value)}`).join("&");
  const canonicalRequest = [
    method,
    url.pathname,
    canonicalQuery,
    canonicalHeaders,
    signedHeaderNames.join(";"),
    "UNSIGNED-PAYLOAD"
  ].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, hash3(canonicalRequest)].join("\n");
  const signature = (0, import_node_crypto13.createHmac)("sha256", signingKey(storage.secretAccessKey, date3, storage.region)).update(stringToSign).digest("hex");
  url.search = `${canonicalQuery}&X-Amz-Signature=${signature}`;
  return {
    url: url.href,
    headers,
    expiresAt: new Date(now.getTime() + Math.min(Math.max(expiresSeconds, 60), 900) * 1e3).toISOString()
  };
}
var STORAGE_HEAD_TIMEOUT_MS = 8e3;
async function verifyUploadedObject(metadata2) {
  const signed = signObjectRequest("HEAD", metadata2, 120);
  const timeout = AbortSignal.timeout(STORAGE_HEAD_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(signed.url, { method: "HEAD", headers: signed.headers, redirect: "error", signal: timeout });
  } catch {
    const message = timeout.aborted ? "Object storage verification timed out. No version was issued; retry after storage is available." : "Object storage could not verify this upload. No version was issued; retry after storage is available.";
    throw new Error(message);
  }
  if (!response.ok) throw new Error("Uploaded object is not available for verification");
  const length = Number(response.headers.get("content-length"));
  const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  const checksum2 = response.headers.get("x-amz-meta-sha256")?.trim().toLowerCase();
  const validatedChecksum = response.headers.get("x-amz-checksum-sha256")?.trim();
  const expectedChecksum = Buffer.from(metadata2.checksumSha256, "hex").toString("base64");
  if (!Number.isSafeInteger(length) || length !== metadata2.byteSize) throw new Error("Uploaded object size does not match the authorized version");
  if (contentType !== metadata2.contentType.toLowerCase()) throw new Error("Uploaded object media type does not match the authorized version");
  if (checksum2 !== metadata2.checksumSha256.toLowerCase() || validatedChecksum !== expectedChecksum) {
    throw new Error("Object storage did not validate the authorized SHA-256 checksum");
  }
}

// features/keystone/mutations/documents.ts
var allowedMimeTypes = /* @__PURE__ */ new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
]);
var MAX_DOCUMENT_BYTES = 50 * 1024 * 1024;
function safeFileName(value) {
  const normalized = requiredText(value, "File name", 240).replace(/[^A-Za-z0-9._-]+/g, "-");
  if (!normalized || normalized.startsWith(".")) throw new Error("File name is invalid");
  return normalized;
}
function metadata(record) {
  return {
    key: String(record.storageKey),
    contentType: String(record.mimeType),
    byteSize: Number(record.byteSize),
    checksumSha256: String(record.checksumSha256)
  };
}
async function requestDocumentVersionUpload(_root, { input }, context) {
  const projectId2 = requiredText(input.projectId, "Project id", 200);
  const documentId = requiredText(input.documentId, "Document id", 200);
  const document = await queryById(context, "Document", documentId, "id title project { id company { id } }");
  if (document?.project?.id !== projectId2) throw new Error("Document not found in this project");
  if (!Number.isInteger(input.versionNumber) || input.versionNumber < 1) throw new Error("Version number must be a positive integer");
  const mimeType = requiredText(input.mimeType, "Media type", 200).toLowerCase();
  if (!allowedMimeTypes.has(mimeType)) throw new Error("This document media type is not allowed");
  if (!Number.isSafeInteger(input.byteSize) || input.byteSize < 1 || input.byteSize > MAX_DOCUMENT_BYTES) {
    throw new Error(`Document size must be between 1 and ${MAX_DOCUMENT_BYTES} bytes`);
  }
  const checksumSha256 = requiredText(input.checksumSha256, "SHA-256 checksum", 64).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(checksumSha256)) throw new Error("SHA-256 checksum must be 64 hexadecimal characters");
  const fileName = safeFileName(input.fileName);
  const companyId = document.project?.company?.id;
  if (!companyId) throw new Error("Document company is unavailable");
  assertObjectStorageConfigured();
  const storageKey = `${companyId}/${projectId2}/documents/${documentId}/${(0, import_node_crypto14.randomUUID)()}/${fileName}`;
  const result = await executeProjectCommand({
    context,
    operation: "requestDocumentVersionUpload",
    permission: "canManageDocuments",
    projectId: projectId2,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "DocumentVersion",
    data: {
      versionNumber: input.versionNumber,
      revisionLabel: input.revisionLabel?.trim(),
      titleSnapshot: requiredText(input.title, "Version title", 300),
      fileName,
      storageKey,
      mimeType,
      byteSize: input.byteSize,
      checksumSha256,
      uploadedBy: { connect: { id: requireCommandSession(context).itemId } },
      document: { connect: { id: documentId } },
      project: { connect: { id: projectId2 } }
    }
  });
  const version = await queryById(context, "DocumentVersion", result.itemId, "id fileName storageKey mimeType byteSize checksumSha256 issuedAt");
  if (!version || version.issuedAt) throw new Error("Document version is not awaiting upload");
  const signed = signObjectRequest("PUT", metadata(version));
  return {
    success: true,
    versionId: result.itemId,
    actionId: result.actionId,
    replayed: result.replayed,
    uploadUrl: signed.url,
    expiresAt: signed.expiresAt,
    headers: Object.entries(signed.headers).map(([name, value]) => ({ name, value }))
  };
}
async function requestDrawingRevisionUpload(_root, { input }, context) {
  const projectId2 = requiredText(input.projectId, "Project id", 200);
  const drawingId = requiredText(input.drawingId, "Drawing id", 200);
  const drawing = await queryById(context, "Drawing", drawingId, "id drawingNumber project { id company { id } }");
  if (drawing?.project?.id !== projectId2 || !drawing.project?.company?.id) throw new Error("Drawing not found in this project");
  const mimeType = requiredText(input.mimeType, "Media type", 200).toLowerCase();
  if (!allowedMimeTypes.has(mimeType)) throw new Error("This drawing media type is not allowed");
  if (!Number.isSafeInteger(input.byteSize) || input.byteSize < 1 || input.byteSize > MAX_DOCUMENT_BYTES) throw new Error(`Drawing size must be between 1 and ${MAX_DOCUMENT_BYTES} bytes`);
  const checksumSha256 = requiredText(input.checksumSha256, "SHA-256 checksum", 64).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(checksumSha256)) throw new Error("SHA-256 checksum must be 64 hexadecimal characters");
  const fileName = safeFileName(input.fileName);
  assertObjectStorageConfigured();
  const storageKey = `${drawing.project.company.id}/${projectId2}/drawings/${drawingId}/${(0, import_node_crypto14.randomUUID)()}/${fileName}`;
  const result = await executeProjectCommand({
    context,
    operation: "requestDrawingRevisionUpload",
    permission: "canManageDocuments",
    projectId: projectId2,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "DrawingRevision",
    data: {
      revisionNumber: requiredText(input.revisionNumber, "Revision number", 40),
      titleSnapshot: requiredText(input.title, "Revision title", 300),
      status: "draft",
      fileName,
      storageKey,
      mimeType,
      byteSize: input.byteSize,
      checksumSha256,
      uploadedBy: { connect: { id: requireCommandSession(context).itemId } },
      drawing: { connect: { id: drawingId } },
      project: { connect: { id: projectId2 } }
    }
  });
  const revision = await queryById(context, "DrawingRevision", result.itemId, "id fileName storageKey mimeType byteSize checksumSha256 status");
  if (!revision || revision.status !== "draft") throw new Error("Drawing revision is not awaiting upload");
  const signed = signObjectRequest("PUT", metadata(revision));
  return { success: true, revisionId: result.itemId, actionId: result.actionId, replayed: result.replayed, uploadUrl: signed.url, expiresAt: signed.expiresAt, headers: Object.entries(signed.headers).map(([name, value]) => ({ name, value })) };
}
async function completeDrawingRevisionUpload(_root, { revisionId, idempotencyKey }, context) {
  const id = requiredText(revisionId, "Drawing revision id", 200);
  const revision = await queryById(context, "DrawingRevision", id, `
    id status fileName storageKey mimeType byteSize checksumSha256
    drawing { id currentRevision { id } } project { id company { id } }
  `);
  const projectId2 = revision?.project?.id;
  const companyId = revision?.project?.company?.id;
  const session = requireCommandSession(context);
  if (!revision?.id || !projectId2 || !companyId || !revision.drawing?.id || !hasProjectPermission(session, companyId, projectId2, "canManageDocuments", true) || !await canAccessProjectById(context, session.itemId, projectId2, true)) throw new Error("Drawing revision not found");
  if (revision.status === "issued") return { success: true, revisionId: id, actionId: "already-issued", replayed: true };
  if (revision.status !== "draft") throw new Error("Only a draft drawing revision can be issued");
  await verifyUploadedObject(metadata(revision));
  let previousId = null;
  const issuedAt = /* @__PURE__ */ new Date();
  const result = await executeProjectCommand({
    context,
    operation: "completeDrawingRevisionUpload",
    permission: "canManageDocuments",
    projectId: projectId2,
    idempotencyKey: requiredText(idempotencyKey, "Idempotency key", 200),
    request: { revisionId: id, checksumSha256: revision.checksumSha256 },
    listKey: "DrawingRevision",
    updateId: id,
    data: { status: "issued", issuedAt },
    beforeCreate: async (tx) => {
      if (!tx.prisma?.$queryRawUnsafe) throw new Error("Drawing revision promotion lock is unavailable");
      const [drawing] = await tx.prisma.$queryRawUnsafe(
        `SELECT "currentRevision" AS "currentRevisionId" FROM "Drawing" WHERE id = $1 FOR UPDATE`,
        String(revision.drawing.id)
      );
      const [candidate] = await tx.prisma.$queryRawUnsafe(
        `SELECT drawing AS "drawingId", project AS "projectId", status::text AS status, "createdAt"
         FROM "DrawingRevision" WHERE id = $1 FOR UPDATE`,
        id
      );
      if (!drawing || !candidate || candidate.drawingId !== revision.drawing.id || candidate.projectId !== projectId2 || candidate.status !== "draft") {
        throw new Error("Only the current draft revision for this drawing can be issued");
      }
      previousId = drawing.currentRevisionId;
      if (previousId) {
        const [previous] = await tx.prisma.$queryRawUnsafe(
          `SELECT status::text AS status, "createdAt" FROM "DrawingRevision" WHERE id = $1 FOR UPDATE`,
          previousId
        );
        if (!previous || previous.status !== "issued" || new Date(candidate.createdAt) <= new Date(previous.createdAt)) {
          throw new Error("Drawing revisions must be issued in their created order from the current revision");
        }
      }
      return { status: "issued", issuedAt };
    },
    afterCreate: async (tx) => {
      if (previousId && previousId !== id) await requireUpdate(tx.sudo(), "DrawingRevision")({ where: { id: previousId }, data: { status: "superseded" } });
      await requireUpdate(tx.sudo(), "Drawing")({ where: { id: revision.drawing.id }, data: { currentRevision: { connect: { id } } } });
    }
  });
  return { success: true, revisionId: id, actionId: result.actionId, replayed: result.replayed };
}
async function completeDocumentVersionUpload(_root, { versionId, idempotencyKey }, context) {
  const id = requiredText(versionId, "Document version id", 200);
  const version = await queryById(context, "DocumentVersion", id, `
    id versionNumber titleSnapshot fileName storageKey mimeType byteSize checksumSha256 issuedAt
    document { id currentVersion { id versionNumber } } project { id company { id } }
  `);
  const projectId2 = version?.project?.id;
  const companyId = version?.project?.company?.id;
  const session = requireCommandSession(context);
  if (!version?.id || !projectId2 || !companyId || !version.document?.id || !hasProjectPermission(session, companyId, projectId2, "canManageDocuments", true) || !await canAccessProjectById(context, session.itemId, projectId2, true)) throw new Error("Document version not found");
  if (version.issuedAt) {
    return { success: true, versionId: id, actionId: "already-issued", replayed: true };
  }
  await verifyUploadedObject(metadata(version));
  const result = await executeProjectCommand({
    context,
    operation: "completeDocumentVersionUpload",
    permission: "canManageDocuments",
    projectId: projectId2,
    idempotencyKey: requiredText(idempotencyKey, "Idempotency key", 200),
    request: { versionId: id, checksumSha256: version.checksumSha256 },
    listKey: "DocumentVersion",
    updateId: id,
    data: { issuedAt: /* @__PURE__ */ new Date() },
    beforeCreate: async (tx) => {
      if (!tx.prisma?.$queryRawUnsafe) throw new Error("Document version promotion lock is unavailable");
      const [document] = await tx.prisma.$queryRawUnsafe(
        `SELECT "currentVersion" AS "currentVersionId" FROM "Document" WHERE id = $1 FOR UPDATE`,
        String(version.document.id)
      );
      const [candidate] = await tx.prisma.$queryRawUnsafe(
        `SELECT document AS "documentId", project AS "projectId", "versionNumber", "issuedAt"
         FROM "DocumentVersion" WHERE id = $1 FOR UPDATE`,
        id
      );
      if (!document || !candidate || candidate.documentId !== version.document.id || candidate.projectId !== projectId2 || candidate.issuedAt) {
        throw new Error("Only the current unissued document version can be issued");
      }
      if (document.currentVersionId) {
        const [current] = await tx.prisma.$queryRawUnsafe(
          `SELECT "versionNumber", "issuedAt" FROM "DocumentVersion" WHERE id = $1 FOR UPDATE`,
          document.currentVersionId
        );
        if (!current?.issuedAt || candidate.versionNumber <= current.versionNumber) {
          throw new Error("Document versions must be issued in strictly increasing version order");
        }
      } else {
        const [prior] = await tx.prisma.$queryRawUnsafe(
          `SELECT COUNT(*)::bigint AS count FROM "DocumentVersion" WHERE document = $1 AND "issuedAt" IS NOT NULL`,
          String(version.document.id)
        );
        if ((prior?.count ?? BigInt(0)) > BigInt(0)) throw new Error("Issued document history has no authoritative current-version pointer");
      }
      const [higherIssued] = await tx.prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::bigint AS count FROM "DocumentVersion"
         WHERE document = $1 AND "issuedAt" IS NOT NULL AND "versionNumber" >= $2`,
        String(version.document.id),
        candidate.versionNumber
      );
      if ((higherIssued?.count ?? BigInt(0)) > BigInt(0)) throw new Error("A newer document version is already issued");
      return { issuedAt: /* @__PURE__ */ new Date() };
    },
    afterCreate: async (tx) => {
      await requireUpdate(tx.sudo(), "Document")({
        where: { id: version.document.id },
        data: { currentVersion: { connect: { id } } }
      });
    }
  });
  return { success: true, versionId: id, actionId: result.actionId, replayed: result.replayed };
}
async function distributeDocumentVersion(_root, { input }, context) {
  const projectId2 = requiredText(input.projectId, "Project id", 200);
  const versionId = requiredText(input.versionId, "Document version id", 200);
  const membershipId = requiredText(input.membershipId, "Recipient membership id", 200);
  const [version, membership] = await Promise.all([
    queryById(context, "DocumentVersion", versionId, "id issuedAt project { id }"),
    queryById(context, "ProjectMembership", membershipId, "id status project { id } user { id }")
  ]);
  if (version?.project?.id !== projectId2 || !version.issuedAt) throw new Error("Only an issued project document can be distributed");
  if (membership?.project?.id !== projectId2 || membership.status !== "active") throw new Error("Recipient is not an active project member");
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : void 0;
  if (expiresAt && (!Number.isFinite(expiresAt.getTime()) || expiresAt <= /* @__PURE__ */ new Date())) throw new Error("Distribution expiry must be in the future");
  return executeProjectCommand({
    context,
    operation: "distributeDocumentVersion",
    permission: "canManageDocuments",
    projectId: projectId2,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "DocumentDistribution",
    data: {
      distributionKey: commandDigest(`${versionId}${membershipId}${input.idempotencyKey}`),
      purpose: requiredText(input.purpose, "Distribution purpose", 500),
      expiresAt,
      documentVersion: { connect: { id: versionId } },
      recipient: { connect: { id: membershipId } },
      distributedBy: { connect: { id: requireCommandSession(context).itemId } },
      project: { connect: { id: projectId2 } }
    }
  });
}
async function documentVersionDownload(_root, { versionId }, context) {
  const session = requireCommandSession(context);
  const version = await queryById(context, "DocumentVersion", requiredText(versionId, "Version id", 200), `
    id issuedAt fileName storageKey mimeType byteSize checksumSha256 project { id company { id } }
  `);
  const projectId2 = version?.project?.id;
  const companyId = version?.project?.company?.id;
  if (!version?.id || !version.issuedAt || !projectId2 || !companyId) throw new Error("Issued document version not found");
  const internalGrant = session.authType === "api_key" || session.data.projectMemberships?.some((entry) => entry.status === "active" && entry.project?.id === projectId2 && entry.portalType === "internal") || session.data.companyMemberships?.some((entry) => entry.status === "active" && entry.company?.id === companyId && entry.canAccessAllProjects);
  const internal = Boolean(internalGrant) && hasProjectPermission(session, companyId, projectId2, "canReadDocuments") && await canAccessProjectById(context, session.itemId, projectId2);
  let distributed = false;
  const distributionPrincipalAllowed = session.authType !== "api_key" || hasProjectPermission(session, companyId, projectId2, "canReadDocuments");
  if (!internal && distributionPrincipalAllowed) {
    distributed = await queryCount(context, "DocumentDistribution", {
      documentVersion: { id: { equals: String(version.id) } },
      recipient: { user: { id: { equals: session.itemId } }, status: { equals: "active" } },
      OR: [{ expiresAt: { equals: null } }, { expiresAt: { gt: /* @__PURE__ */ new Date() } }]
    }) > 0;
  }
  if (!internal && !distributed) throw new Error("Document version is not distributed to this account");
  const signed = signObjectRequest("GET", metadata(version), 300);
  return { success: true, fileName: String(version.fileName), mimeType: String(version.mimeType), byteSize: Number(version.byteSize), downloadUrl: signed.url, expiresAt: signed.expiresAt };
}
async function drawingRevisionDownload(_root, { revisionId }, context) {
  const session = requireCommandSession(context);
  const revision = await queryById(context, "DrawingRevision", requiredText(revisionId, "Revision id", 200), `
    id status fileName storageKey mimeType byteSize checksumSha256 project { id company { id } }
  `);
  const projectId2 = revision?.project?.id;
  const companyId = revision?.project?.company?.id;
  if (!revision?.id || revision.status !== "issued" || !projectId2 || !companyId) throw new Error("Issued drawing revision not found");
  if (!hasProjectPermission(session, companyId, projectId2, "canReadDocuments") || !await canAccessProjectById(context, session.itemId, projectId2)) {
    throw new Error("Drawing revision is not available to this account");
  }
  const signed = signObjectRequest("GET", metadata(revision), 300);
  return { success: true, fileName: String(revision.fileName), mimeType: String(revision.mimeType), byteSize: Number(revision.byteSize), downloadUrl: signed.url, expiresAt: signed.expiresAt };
}
async function acknowledgeDocumentDistribution(_root, { distributionId, acknowledgement }, context) {
  const session = requireCommandSession(context);
  if (session.authType === "api_key") throw new Error("A live participant session is required to acknowledge a document");
  const distribution = await queryById(context, "DocumentDistribution", requiredText(distributionId, "Distribution id", 200), `
    id distributionKey expiresAt project { id company { id } } recipient { id status user { id } }
  `);
  if (!distribution?.id || distribution.recipient?.user?.id !== session.itemId || distribution.recipient.status !== "active") {
    throw new Error("Document distribution not found for this account");
  }
  if (distribution.expiresAt && new Date(String(distribution.expiresAt)) <= /* @__PURE__ */ new Date()) throw new Error("Document distribution has expired");
  const existing = await queryCount(context, "DocumentAcknowledgement", {
    acknowledgementKey: { equals: `${distribution.id}:${session.itemId}` }
  });
  if (existing > 0) return { success: true, acknowledgementId: "existing", replayed: true };
  const projectId2 = distribution.project?.id;
  if (!projectId2 || !context.transaction) throw new Error("Transactional document acknowledgement context is required");
  try {
    return await context.transaction(async (tx) => {
      const record = await tx.sudo().db.DocumentAcknowledgement.createOne({ data: {
        acknowledgementKey: `${distribution.id}:${session.itemId}`,
        acknowledgement: requiredText(acknowledgement, "Acknowledgement", 500),
        distribution: { connect: { id: String(distribution.id) } },
        acknowledgedBy: { connect: { id: session.itemId } },
        project: { connect: { id: projectId2 } }
      } });
      return { success: true, acknowledgementId: record.id, replayed: false };
    }, { timeout: 3e4 });
  } catch (error) {
    const replayed = await queryCount(context, "DocumentAcknowledgement", {
      acknowledgementKey: { equals: `${distribution.id}:${session.itemId}` }
    });
    if (replayed > 0) return { success: true, acknowledgementId: "existing", replayed: true };
    throw error;
  }
}

// features/keystone/mutations/invitations.ts
var import_node_crypto15 = require("node:crypto");

// features/keystone/domain/invitation-acceptance.ts
function resolveInvitationAcceptanceMode(input) {
  if (input.accountSetupRequired) {
    if (input.sessionUserId) throw new Error("Sign out before setting up a newly invited account");
    if (input.password.length < 10) throw new Error("A new invited account requires a password with at least 10 characters");
    return "activate-new-account";
  }
  if (input.sessionAuthType !== "session" || input.sessionUserId !== input.invitedUserId) {
    throw new Error("Sign in to the invited account before accepting this invitation");
  }
  if (input.password.length > 0) throw new Error("Existing account passwords cannot be changed while accepting an invitation");
  return "accept-existing-account";
}

// features/keystone/mutations/invitations.ts
async function revokeProjectInvitation(_root, { invitationId, reason }, context) {
  const session = requireCommandSession(context);
  if (session.authType === "api_key") throw new Error("A live administrator session is required");
  const invitation = await queryById(context, "AccountInvitation", requiredText(invitationId, "Invitation id", 200), "id status projectMembership { id } project { id company { id } }");
  const projectId2 = invitation?.project?.id;
  const companyId = invitation?.project?.company?.id;
  if (!invitation?.id || !projectId2 || !companyId || !hasProjectPermission(session, companyId, projectId2, "canManagePeople", true) || !await canAccessProjectById(context, session.itemId, projectId2, true)) {
    throw new Error("Pending invitation not found for this project");
  }
  if (invitation.status === "revoked") return { success: true, operation: "revokeProjectInvitation", itemId: String(invitation.id), actionId: "already-revoked", replayed: true };
  if (invitation.status !== "pending") throw new Error("Only a pending invitation can be revoked");
  return executeProjectCommand({
    context,
    operation: "revokeProjectInvitation",
    permission: "canManagePeople",
    projectId: projectId2,
    idempotencyKey: `revoke:${invitation.id}`,
    request: { invitationId: invitation.id, reason: requiredText(reason, "Revocation reason", 500) },
    listKey: "AccountInvitation",
    updateId: String(invitation.id),
    data: { status: "revoked" },
    afterCreate: async (tx) => {
      const membershipId = invitation.projectMembership?.id;
      if (membershipId) await requireUpdate(tx.sudo(), "ProjectMembership")({ where: { id: membershipId }, data: { status: "revoked" } });
    }
  });
}
async function reissueProjectInvitation(_root, { invitationId, reason, idempotencyKey }, context) {
  const session = requireCommandSession(context);
  if (session.authType === "api_key") throw new Error("A live administrator session is required");
  const invitation = await queryById(context, "AccountInvitation", requiredText(invitationId, "Invitation id", 200), "id status email project { id company { id } }");
  const projectId2 = invitation?.project?.id;
  const companyId = invitation?.project?.company?.id;
  if (!invitation?.id || !projectId2 || !companyId || !hasProjectPermission(session, companyId, projectId2, "canManagePeople", true) || !await canAccessProjectById(context, session.itemId, projectId2, true)) {
    throw new Error("Invitation not found for this project");
  }
  const activationToken = `ofc_inv_${(0, import_node_crypto15.randomBytes)(32).toString("base64url")}`;
  const tokenHash = (0, import_node_crypto15.createHash)("sha256").update(activationToken).digest("hex");
  let previous = null;
  const result = await executeProjectCommand({
    context,
    operation: "reissueProjectInvitation",
    permission: "canManagePeople",
    projectId: projectId2,
    idempotencyKey,
    request: { invitationId: invitation.id, reason: requiredText(reason, "Reason", 500) },
    listKey: "AccountInvitation",
    updateId: String(invitation.id),
    data: {},
    beforeCreate: async (tx) => {
      if (!tx.prisma?.$queryRawUnsafe) throw new Error("Transactional invitation lock is unavailable");
      const [locked] = await tx.prisma.$queryRawUnsafe(
        `SELECT status::text, "user" AS "userId", "projectMembership" AS "membershipId", email, project AS "projectId"
         FROM "AccountInvitation" WHERE id = $1 FOR UPDATE`,
        String(invitation.id)
      );
      if (!locked || locked.projectId !== projectId2 || !locked.userId || !locked.membershipId) throw new Error("Invitation not found for this project");
      if (!["pending", "expired"].includes(locked.status)) throw new Error("Only a pending or expired invitation can be resent");
      const [membership] = await tx.prisma.$queryRawUnsafe('SELECT status::text FROM "ProjectMembership" WHERE id = $1 FOR UPDATE', locked.membershipId);
      if (membership?.status !== "invited") throw new Error("This membership is no longer awaiting acceptance; send a new invitation");
      previous = locked;
      return { status: locked.status === "pending" ? "revoked" : "expired" };
    },
    afterCreate: async (tx) => {
      if (!previous || !tx.prisma?.$queryRawUnsafe) throw new Error("Invitation is unavailable");
      const [user] = await tx.prisma.$queryRawUnsafe(
        'SELECT u."isActive", NOT EXISTS (SELECT 1 FROM "AuthSession" s WHERE s."user" = u.id) AS "neverSignedIn" FROM "User" u WHERE u.id = $1 FOR UPDATE OF u',
        previous.userId
      );
      if (!user) throw new Error("Invitee identity is unavailable");
      await requireCreate(tx.sudo(), "AccountInvitation")({ data: {
        tokenHash,
        tokenPrefix: activationToken.slice(0, 16),
        email: previous.email,
        status: "pending",
        accountSetupRequired: !user.isActive && user.neverSignedIn,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3),
        invitedBy: { connect: { id: requireCommandSession(tx).itemId } },
        user: { connect: { id: previous.userId } },
        projectMembership: { connect: { id: previous.membershipId } },
        project: { connect: { id: projectId2 } }
      } });
    }
  });
  return { ...result, activationToken: result.replayed ? null : activationToken };
}
async function acceptProjectInvitation(_root, { input }, context) {
  const token = requiredText(input.token, "Invitation token", 200);
  if (!/^ofc_inv_[A-Za-z0-9_-]{32,}$/.test(token)) throw new Error("Invitation token is invalid");
  const password2 = typeof input.password === "string" ? input.password : "";
  const tokenHash = (0, import_node_crypto15.createHash)("sha256").update(token).digest("hex");
  if (!context.transaction) throw new Error("Transactional invitation context is required");
  const outcome = await context.transaction(async (tx) => {
    if (!tx.prisma?.$queryRawUnsafe) throw new Error("Transactional invitation lock is unavailable");
    const [parent] = await tx.prisma.$queryRawUnsafe('SELECT project, company FROM "AccountInvitation" WHERE "tokenHash" = $1', tokenHash);
    if (!parent?.project || !parent.company) throw new Error("Invitation is invalid or already used");
    await tx.prisma.$queryRawUnsafe('SELECT id FROM "Project" WHERE id = $1 AND company = $2 FOR UPDATE', parent.project, parent.company);
    await tx.prisma.$queryRawUnsafe('SELECT id FROM "Company" WHERE id = $1 FOR SHARE', parent.company);
    const [locked] = await tx.prisma.$queryRawUnsafe(
      `SELECT invitation.id, invitation.status::text, invitation."expiresAt", invitation."user" AS "userId",
              invitation."projectMembership" AS "membershipId", invitation.company AS "companyId", invitation.project AS "projectId",
              invitation."accountSetupRequired"
       FROM "AccountInvitation" invitation WHERE invitation."tokenHash" = $1 FOR UPDATE`,
      tokenHash
    );
    if (!locked || locked.status !== "pending" || !locked.userId || !locked.membershipId || !locked.companyId || !locked.projectId) {
      throw new Error("Invitation is invalid or already used");
    }
    if (new Date(locked.expiresAt) <= /* @__PURE__ */ new Date()) {
      await requireUpdate(tx.sudo(), "AccountInvitation")({ where: { id: locked.id }, data: { status: "expired" } });
      return { expired: true };
    }
    const [user] = await tx.prisma.$queryRawUnsafe('SELECT u.id, u."isActive", NOT EXISTS (SELECT 1 FROM "AuthSession" s WHERE s."user" = u.id) AS "neverSignedIn", u.email FROM "User" u WHERE u.id = $1 FOR UPDATE OF u', locked.userId);
    await tx.prisma.$queryRawUnsafe('SELECT id FROM "CompanyMembership" WHERE company = $1 AND "user" = $2 ORDER BY id FOR UPDATE', locked.companyId, locked.userId);
    await tx.prisma.$queryRawUnsafe('SELECT id FROM "ProjectMembership" WHERE id = $1 FOR UPDATE', locked.membershipId);
    await tx.prisma.$queryRawUnsafe('SELECT r.id FROM "Role" r WHERE r.id IN (SELECT role FROM "ProjectMembership" WHERE id = $1 UNION SELECT role FROM "CompanyMembership" WHERE company = $2 AND "user" = $3) ORDER BY r.id FOR SHARE', locked.membershipId, locked.companyId, locked.userId);
    const sudo = tx.sudo();
    const membership = await sudo.query.ProjectMembership.findOne({ where: { id: locked.membershipId }, query: "id status portalType project { id company { id status } } user { id } role { id company { id } } portalOrganization { id company { id } }" });
    const companyMemberships = await sudo.query.CompanyMembership.findMany({ where: { user: { id: { equals: locked.userId } }, company: { id: { equals: locked.companyId } } }, take: 2, query: "id status role { id company { id } }" });
    const companyMembership = companyMemberships[0];
    if (!user || membership?.status !== "invited" || membership.user?.id !== locked.userId || membership.project?.id !== locked.projectId || locked.projectId !== parent.project || locked.companyId !== parent.company || membership.project?.company?.id !== locked.companyId || membership.project.company.status !== "active" || !membership.role?.id || membership.role.company?.id !== locked.companyId || companyMemberships.length !== 1 || !companyMembership || !["active", "invited"].includes(String(companyMembership.status)) || companyMembership.role?.company?.id !== locked.companyId || membership.portalType !== "internal" && (!membership.portalOrganization?.id || membership.portalOrganization.company?.id !== locked.companyId)) {
      throw new Error("Invitation grant is no longer eligible; request a new invitation");
    }
    if (locked.accountSetupRequired && (user.isActive || !user.neverSignedIn)) throw new Error("An invitation cannot replace an existing account credential");
    if (!locked.accountSetupRequired) {
      if (!user.isActive || !context.session?.authSessionId) throw new Error("A current invited account session is required");
      const sessions = await tx.prisma.$queryRawUnsafe('SELECT id FROM "AuthSession" WHERE id = $1 AND "user" = $2 AND "revokedAt" IS NULL AND "expiresAt" > CURRENT_TIMESTAMP FOR SHARE', context.session.authSessionId, locked.userId);
      if (sessions.length !== 1) throw new Error("A current invited account session is required");
    }
    const acceptanceMode = resolveInvitationAcceptanceMode({
      accountSetupRequired: locked.accountSetupRequired,
      sessionAuthType: context.session?.authType,
      sessionUserId: context.session?.itemId,
      invitedUserId: locked.userId,
      password: password2
    });
    if (acceptanceMode === "activate-new-account") {
      await requireUpdate(sudo, "User")({ where: { id: locked.userId }, data: {
        password: password2,
        isActive: true,
        onboardingStatus: "in_progress",
        ...input.name?.trim() ? { name: input.name.trim() } : {}
      } });
    }
    if (companyMembership.status === "invited") await requireUpdate(sudo, "CompanyMembership")({ where: { id: String(companyMembership.id) }, data: {
      status: "active",
      joinedAt: /* @__PURE__ */ new Date()
    } });
    await requireUpdate(sudo, "ProjectMembership")({ where: { id: locked.membershipId }, data: {
      status: "active",
      joinedAt: /* @__PURE__ */ new Date()
    } });
    await requireUpdate(sudo, "AccountInvitation")({ where: { id: locked.id }, data: {
      status: "accepted",
      acceptedAt: /* @__PURE__ */ new Date()
    } });
    const action = await requireCreate(sudo, "AgentAction")({ data: {
      actionKey: (0, import_node_crypto15.randomUUID)(),
      actorType: "human",
      action: "acceptProjectInvitation",
      status: "succeeded",
      targetType: "ProjectMembership",
      targetId: locked.membershipId,
      targetStatus: "active",
      reason: "Accept project invitation and activate the invited account",
      requestDigest: tokenHash,
      requestedAt: /* @__PURE__ */ new Date(),
      startedAt: /* @__PURE__ */ new Date(),
      completedAt: /* @__PURE__ */ new Date(),
      company: { connect: { id: locked.companyId } },
      project: { connect: { id: locked.projectId } },
      requestedBy: { connect: { id: locked.userId } },
      actorUser: { connect: { id: locked.userId } }
    } });
    const payload = JSON.stringify({ schemaVersion: 1, invitationId: locked.id, userId: locked.userId, membershipId: locked.membershipId });
    await requireCreate(sudo, "OutboxMessage")({ data: {
      messageKey: `acceptProjectInvitation:${locked.id}`,
      eventType: "AccountInvitation.accepted",
      aggregateType: "AccountInvitation",
      aggregateId: locked.id,
      canonicalPayload: payload,
      payloadDigest: (0, import_node_crypto15.createHash)("sha256").update(payload).digest("hex"),
      status: "pending",
      company: { connect: { id: locked.companyId } },
      project: { connect: { id: locked.projectId } },
      agentAction: { connect: { id: action.id } }
    } });
    return { success: true, userId: locked.userId, projectId: locked.projectId, portalType: String(membership.portalType) };
  }, { timeout: 3e4 });
  if ("expired" in outcome) throw new Error("Invitation has expired");
  return outcome;
}

// features/keystone/mutations/safety-private.ts
var INCIDENT_TYPES = ["near_miss", "first_aid", "recordable_injury", "lost_time", "property_damage", "environmental", "security"];
function incidentClassification(value) {
  const incidentType = INCIDENT_TYPES.find((entry) => entry === value);
  if (!incidentType) throw new Error("Select the incident type");
  return { incidentType, isOshaRecordable: incidentType === "recordable_injury" || incidentType === "lost_time" };
}
async function authorize2(context, incidentId) {
  const session = requireCommandSession(context);
  if (session.authType === "api_key") throw new Error("Private safety details require a live safety manager session");
  const incident = await queryById(context, "SafetyIncident", incidentId, "id status incidentType project { id company { id } }");
  const projectId2 = incident?.project?.id;
  const companyId = incident?.project?.company?.id;
  if (!incident?.id || !projectId2 || !companyId || !hasProjectPermission(session, companyId, projectId2, "canManageSafety", true) || !await canAccessProjectById(context, session.itemId, projectId2, true)) {
    throw new Error("Private safety incident not found for this safety role");
  }
  return { projectId: projectId2, status: String(incident.status ?? ""), incidentType: String(incident.incidentType ?? "") };
}
function days(value, label) {
  if (value === null || value === void 0) return void 0;
  if (!Number.isInteger(value) || value < 0 || value > 1e5) throw new Error(`${label} must be a non-negative whole number`);
  return value;
}
async function recordSafetyIncidentPrivateDetails(_root, { input }, context) {
  const incidentId = requiredText(input.incidentId, "Incident id", 200);
  const { projectId: projectId2, status: status2, incidentType } = await authorize2(context, incidentId);
  const classification = input.incidentType ? incidentClassification(input.incidentType) : null;
  if (classification && classification.incidentType !== incidentType && status2 === "closed") {
    throw new Error("A closed incident cannot be reclassified");
  }
  return executeProjectCommand({
    context,
    operation: "recordSafetyIncidentPrivateDetails",
    permission: "canManageSafety",
    projectId: projectId2,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "SafetyIncident",
    updateId: incidentId,
    data: {},
    afterCreate: async (tx) => {
      if (!tx.prisma?.safetyIncident?.update) throw new Error("Private safety update client is unavailable");
      await tx.prisma.safetyIncident.update({ where: { id: incidentId }, data: {
        injuredPartyName: input.injuredPartyName?.trim() || null,
        injuryDetails: input.injuryDetails?.trim() || null,
        privateNotes: input.privateNotes?.trim() || null,
        daysAway: days(input.lostTimeDays, "Lost-time days"),
        restrictedDutyDays: days(input.restrictedDutyDays, "Restricted-duty days"),
        ...classification ?? {}
      } });
    }
  });
}
async function safetyIncidentPrivateDetail(_root, { incidentId }, context) {
  const id = requiredText(incidentId, "Incident id", 200);
  await authorize2(context, id);
  if (!context.prisma?.safetyIncident?.findUnique) throw new Error("Private safety query client is unavailable");
  const incident = await context.prisma.safetyIncident.findUnique({ where: { id }, select: {
    id: true,
    incidentType: true,
    injuredPartyName: true,
    injuryDetails: true,
    privateNotes: true,
    daysAway: true,
    restrictedDutyDays: true
  } });
  if (!incident?.id) throw new Error("Safety incident not found");
  return {
    incidentId: String(incident.id),
    incidentType: String(incident.incidentType ?? ""),
    injuredPartyName: String(incident.injuredPartyName ?? ""),
    injuryDetails: String(incident.injuryDetails ?? ""),
    privateNotes: String(incident.privateNotes ?? ""),
    lostTimeDays: Number(incident.daysAway ?? 0),
    restrictedDutyDays: Number(incident.restrictedDutyDays ?? 0)
  };
}

// features/keystone/mutations/public-intake.ts
var import_node_crypto16 = require("node:crypto");
var INTAKE_KINDS = [
  "general_contact",
  "project_inquiry",
  "estimate_request",
  "rfp_invitation",
  "trade_partner_interest"
];
var SOURCE_PATHS = {
  general_contact: ["/contact"],
  project_inquiry: ["/start-a-project", "/client-intake"],
  estimate_request: ["/estimate"],
  rfp_invitation: ["/rfp"],
  trade_partner_interest: ["/bid", "/trade-partners"]
};
function digest7(value) {
  return (0, import_node_crypto16.createHash)("sha256").update(value).digest("hex");
}
function requiredText2(value, label, max, min = 1) {
  if (typeof value !== "string" || value.trim().length < min) throw new Error(`${label} is required`);
  const normalized = value.trim();
  if (normalized.length > max) throw new Error(`${label} must be at most ${max} characters`);
  return normalized;
}
function optionalText2(value, label, max) {
  if (value === null || value === void 0 || String(value).trim() === "") return null;
  const normalized = String(value).trim();
  if (normalized.length > max) throw new Error(`${label} must be at most ${max} characters`);
  return normalized;
}
function emailAddress(value) {
  const email = requiredText2(value, "Email", 320, 3).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Email must be valid");
  return email;
}
function optionalDate3(value, label) {
  if (!value) return null;
  const normalized = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) throw new Error(`${label} must be a calendar date`);
  const parsed = /* @__PURE__ */ new Date(`${normalized}T12:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime())) throw new Error(`${label} must be valid`);
  return parsed;
}
function canonical2(value) {
  return JSON.stringify(Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))));
}
function normalize(input) {
  if (!INTAKE_KINDS.includes(input.kind)) throw new Error("Inquiry type is invalid");
  const kind = input.kind;
  const sourcePath = requiredText2(input.sourcePath, "Source path", 120);
  if (!SOURCE_PATHS[kind].includes(sourcePath)) throw new Error("Inquiry source does not match its type");
  if (input.website?.trim()) throw new Error("Unable to accept this request");
  if (input.privacyConsent !== true) throw new Error("Privacy consent is required");
  const normalized = {
    kind,
    contactName: requiredText2(input.contactName, "Contact name", 200, 2),
    organization: optionalText2(input.organization, "Organization", 240),
    email: emailAddress(input.email),
    phone: optionalText2(input.phone, "Phone", 50),
    contactRole: optionalText2(input.contactRole, "Contact role", 160),
    projectName: optionalText2(input.projectName, "Project name", 240),
    projectType: optionalText2(input.projectType, kind === "trade_partner_interest" ? "Trade or specialty" : "Project type", 160),
    locationSummary: optionalText2(input.locationSummary, kind === "trade_partner_interest" ? "Service area" : "Project location", 500),
    deliveryMethod: optionalText2(input.deliveryMethod, "Delivery method", 120),
    budgetRange: optionalText2(input.budgetRange, "Budget range", 120),
    desiredStart: optionalDate3(input.desiredStart, "Desired start"),
    desiredCompletion: optionalDate3(input.desiredCompletion, "Desired completion"),
    designStage: optionalText2(input.designStage, "Design stage", 160),
    servicesSought: optionalText2(input.servicesSought, "Services sought", 600),
    scopeSummary: requiredText2(input.scopeSummary, kind === "general_contact" ? "Message" : "Scope summary", 5e3, 10),
    referralSource: optionalText2(input.referralSource, "Referral source", 240),
    sourcePath,
    idempotencyKey: requiredText2(input.idempotencyKey, "Idempotency key", 200, 8)
  };
  if (["project_inquiry", "estimate_request", "rfp_invitation"].includes(kind)) {
    if (!normalized.organization) throw new Error("Organization is required for a project request");
    if (!normalized.projectName) throw new Error("Project name is required");
    if (!normalized.projectType) throw new Error("Project type is required");
    if (!normalized.locationSummary) throw new Error("Project location or region is required");
    if (!normalized.servicesSought) throw new Error("Services sought are required");
  }
  if (kind === "rfp_invitation" && !normalized.deliveryMethod) throw new Error("Delivery method is required for an RFP invitation");
  if (kind === "trade_partner_interest") {
    if (!normalized.organization) throw new Error("Trade company is required");
    if (!normalized.projectType) throw new Error("Trade or specialty is required");
    if (!normalized.locationSummary) throw new Error("Service area is required");
  }
  if (normalized.desiredStart && normalized.desiredCompletion && normalized.desiredCompletion < normalized.desiredStart) {
    throw new Error("Desired completion cannot be before desired start");
  }
  return normalized;
}
function requestHashFor(normalized, privacyNoticeDigest) {
  return digest7(canonical2({
    ...normalized,
    privacyNoticeDigest,
    desiredStart: normalized.desiredStart?.toISOString() ?? null,
    desiredCompletion: normalized.desiredCompletion?.toISOString() ?? null,
    idempotencyKey: void 0
  }));
}
async function recoverExistingIntake(context, key, normalized, companyId, siteId) {
  if (key.status !== "completed" || typeof key.resourceId !== "string") throw new Error("This request is still being recorded");
  const record = await queryOne(context, "IntakeSubmission", { id: key.resourceId }, "id publicReference kind submittedAt requestDigest privacyNoticeDigest company { id } site { id }");
  const site = record?.site;
  if (!record || record.company?.id !== companyId || !site || typeof site !== "object" || !("id" in site) || site.id !== siteId || typeof record.privacyNoticeDigest !== "string" || record.requestDigest !== key.requestHash || requestHashFor(normalized, record.privacyNoticeDigest) !== key.requestHash) throw new Error("Idempotency key was already used with different request data");
  if (typeof record.publicReference !== "string" || typeof record.submittedAt !== "string" || !INTAKE_KINDS.some((kind2) => kind2 === record.kind)) throw new Error("Public request receipt is incomplete");
  const kind = INTAKE_KINDS.find((kind2) => kind2 === record.kind);
  if (!kind) throw new Error("Public request receipt is incomplete");
  return publicResult({ ...record, kind, publicReference: record.publicReference, submittedAt: record.submittedAt }, true);
}
function publicResult(record, replayed) {
  if (!record.publicReference || !record.kind || !record.submittedAt) throw new Error("Public request receipt is incomplete");
  return {
    success: true,
    publicReference: record.publicReference,
    kind: record.kind,
    submittedAt: new Date(record.submittedAt).toISOString(),
    replayed
  };
}
async function create(context, listKey, data) {
  const createOne = context.sudo().db[listKey]?.createOne;
  if (!createOne) throw new Error(`${listKey} create operation is unavailable`);
  return createOne({ data });
}
async function update(context, listKey, id, data) {
  const updateOne = context.sudo().db[listKey]?.updateOne;
  if (!updateOne) throw new Error(`${listKey} update operation is unavailable`);
  return updateOne({ where: { id }, data });
}
async function submitPublicIntake(_root, { input }, context) {
  const normalized = normalize(input);
  const site = await queryOne(
    context,
    "PublicSiteProfile",
    { siteKey: getTrustedPublicSiteKey() },
    "id siteKey status acceptingInquiries privacyNotice company { id }"
  );
  const companyId = site?.company?.id;
  if (!site?.id || !companyId) {
    throw new Error("Public project requests are not currently available");
  }
  const submissionKey = digest7(`${companyId}submitPublicIntake${normalized.idempotencyKey}`);
  const existingKey = await queryOne(context, "IdempotencyKey", { fingerprint: submissionKey }, "requestHash status resourceId");
  if (existingKey) return recoverExistingIntake(context, existingKey, normalized, companyId, String(site.id));
  const privacyNoticeSnapshot = requiredText2(site.privacyNotice, "Published privacy notice", 1e4, 1);
  const privacyNoticeDigest = digest7(privacyNoticeSnapshot);
  const presentedDigest = input.privacyNoticeDigest?.trim();
  if (presentedDigest && presentedDigest !== privacyNoticeDigest) {
    throw new Error("The privacy notice changed; review the current notice before sending your request");
  }
  const requestHash = requestHashFor(normalized, privacyNoticeDigest);
  const deduplicationKey = digest7([companyId, requestHash].join(String.fromCharCode(31)));
  const leadKey2 = digest7([companyId, normalized.email].join(String.fromCharCode(31)));
  if (!context.transaction) throw new Error("Transactional public intake is required");
  return context.transaction(async (tx) => {
    if (!tx.prisma?.$queryRawUnsafe) throw new Error("Transactional public intake locking is unavailable");
    for (const lock of [submissionKey, deduplicationKey, leadKey2].sort()) {
      await tx.prisma.$queryRawUnsafe(`SELECT 1::int AS locked FROM pg_advisory_xact_lock(hashtextextended($1, 0))`, lock);
    }
    const lockedKey = await queryOne(tx, "IdempotencyKey", { fingerprint: submissionKey }, "requestHash status resourceId");
    if (lockedKey) return recoverExistingIntake(tx, lockedKey, normalized, companyId, String(site.id));
    const companies = await tx.prisma.$queryRawUnsafe(`SELECT id FROM "Company" WHERE id = $1 AND status = 'active' FOR SHARE`, companyId);
    if (companies.length !== 1) throw new Error("Public project requests are not currently available");
    const [published] = await tx.prisma.$queryRawUnsafe(`SELECT profile.status::text, profile."acceptingInquiries", profile."privacyNotice"
      FROM "PublicSiteProfile" profile JOIN "Company" company ON company.id = profile.company
      WHERE profile.id = $1 AND profile.company = $2 AND profile."siteKey" = $3 AND company."publicSiteProfile" = profile.id
      FOR SHARE OF profile`, String(site.id), companyId, getTrustedPublicSiteKey());
    if (!published || published.status !== "published" || published.acceptingInquiries !== true) throw new Error("Public project requests are not currently available");
    if (digest7(requiredText2(published.privacyNotice, "Published privacy notice", 1e4, 1)) !== privacyNoticeDigest) throw new Error("The privacy notice changed; review the current notice before submitting again");
    const duplicate = await queryOne(tx, "IntakeSubmission", { deduplicationKey }, "id publicReference kind submittedAt");
    if (duplicate?.id) {
      await create(tx, "IdempotencyKey", {
        fingerprint: submissionKey,
        key: normalized.idempotencyKey,
        operation: "submitPublicIntake",
        requestHash,
        status: "completed",
        resourceType: "IntakeSubmission",
        resourceId: duplicate.id,
        company: { connect: { id: companyId } },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1e3)
      });
      return publicResult(duplicate, true);
    }
    const submittedAt = /* @__PURE__ */ new Date();
    const publicReference = `REQ-${(0, import_node_crypto16.randomBytes)(12).toString("hex").toUpperCase()}`;
    const buyerInquiry = ["project_inquiry", "estimate_request", "rfp_invitation"].includes(normalized.kind);
    const contactInquiry = normalized.kind !== "trade_partner_interest";
    let lead = null;
    let opportunity = null;
    if (contactInquiry) {
      lead = await queryOne(tx, "ConstructionLead", { leadKey: leadKey2 }, "id");
      if (!lead) {
        const legacyMatches = await tx.prisma.$queryRawUnsafe(
          `SELECT id FROM "ConstructionLead" WHERE company = $1 AND lower(btrim(email)) = $2
           ORDER BY "createdAt" ASC LIMIT 2 FOR UPDATE`,
          companyId,
          normalized.email
        );
        if (legacyMatches.length > 1) throw new Error("This contact has multiple legacy leads; operator review is required before accepting another inquiry");
        if (legacyMatches.length === 1) {
          const legacyId = String(legacyMatches[0].id);
          lead = { id: legacyId };
        }
      }
      if (!lead) {
        lead = await create(tx, "ConstructionLead", {
          leadKey: leadKey2,
          name: normalized.contactName,
          organization: normalized.organization,
          email: normalized.email,
          phone: normalized.phone,
          source: "public_opportunity",
          status: "new",
          notes: `Received through ${normalized.sourcePath}; source details remain in ${publicReference}.`,
          company: { connect: { id: companyId } }
        });
      }
    }
    if (buyerInquiry) {
      opportunity = await create(tx, "ConstructionOpportunity", {
        number: publicReference,
        name: normalized.projectName,
        organization: normalized.organization,
        deliveryMethod: normalized.deliveryMethod,
        locationSummary: normalized.locationSummary,
        stage: "qualifying",
        notes: `Public qualification request ${publicReference}; review the immutable intake before creating project or estimate records.`,
        ...lead ? { lead: { connect: { id: lead.id } } } : {},
        company: { connect: { id: companyId } }
      });
    }
    const submission = await create(tx, "IntakeSubmission", {
      submissionKey,
      deduplicationKey,
      publicReference,
      kind: normalized.kind,
      status: "received",
      contactName: normalized.contactName,
      organization: normalized.organization,
      email: normalized.email,
      phone: normalized.phone,
      contactRole: normalized.contactRole,
      projectName: normalized.projectName,
      projectType: normalized.projectType,
      locationSummary: normalized.locationSummary,
      deliveryMethod: normalized.deliveryMethod,
      budgetRange: normalized.budgetRange,
      desiredStart: normalized.desiredStart,
      desiredCompletion: normalized.desiredCompletion,
      designStage: normalized.designStage,
      servicesSought: normalized.servicesSought,
      scopeSummary: normalized.scopeSummary,
      referralSource: normalized.referralSource,
      sourcePath: normalized.sourcePath,
      privacyVersion: privacyNoticeDigest,
      privacyNoticeSnapshot,
      privacyNoticeDigest,
      consentAt: submittedAt,
      submittedAt,
      requestDigest: requestHash,
      site: { connect: { id: String(site.id) } },
      company: { connect: { id: companyId } },
      ...lead ? { lead: { connect: { id: lead.id } } } : {},
      ...opportunity ? { opportunity: { connect: { id: opportunity.id } } } : {}
    });
    const idempotency = await create(tx, "IdempotencyKey", {
      fingerprint: submissionKey,
      key: normalized.idempotencyKey,
      operation: "submitPublicIntake",
      requestHash,
      status: "started",
      resourceType: "IntakeSubmission",
      resourceId: submission.id,
      company: { connect: { id: companyId } },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1e3)
    });
    const action = await create(tx, "AgentAction", {
      actionKey: (0, import_node_crypto16.randomUUID)(),
      actorType: "system",
      action: "submitPublicIntake",
      status: "succeeded",
      targetType: "IntakeSubmission",
      targetId: submission.id,
      targetStatus: "received",
      reason: "Record a consented public qualification request without granting account, project, estimate, contract, or bid authority",
      requestDigest: requestHash,
      resultDigest: digest7(`${submission.id}${publicReference}`),
      requestedAt: submittedAt,
      startedAt: submittedAt,
      completedAt: submittedAt,
      company: { connect: { id: companyId } },
      idempotencyKey: { connect: { id: idempotency.id } }
    });
    await update(tx, "IdempotencyKey", idempotency.id, {
      status: "completed",
      agentAction: { connect: { id: action.id } }
    });
    const payload = JSON.stringify({
      schemaVersion: 1,
      eventType: "PublicIntake.received",
      companyId,
      intakeSubmissionId: submission.id,
      publicReference,
      kind: normalized.kind
    });
    await create(tx, "OutboxMessage", {
      messageKey: `submitPublicIntake:${submission.id}`,
      eventType: "PublicIntake.received",
      aggregateType: "IntakeSubmission",
      aggregateId: submission.id,
      canonicalPayload: payload,
      payloadDigest: digest7(payload),
      status: "pending",
      company: { connect: { id: companyId } },
      agentAction: { connect: { id: action.id } }
    });
    return {
      success: true,
      publicReference,
      kind: normalized.kind,
      submittedAt: submittedAt.toISOString(),
      replayed: false
    };
  }, { timeout: 3e4 });
}

// features/keystone/domain/line-pricing.ts
var SCALE = BigInt(1e4);
var MAX_MINOR = BigInt("9223372036854775807");
var MAX_QUANTITY_UNITS = BigInt("999999999999999999");
var halfUp = (numerator, denominator) => (numerator + denominator / BigInt(2)) / denominator;
function priceLineFromTotal(totalMinor, quantityInput = "1") {
  if (!/^\d+$/.test(totalMinor)) throw new Error("Line total must be non-negative integer minor units");
  const total2 = BigInt(totalMinor);
  const quantity = quantityInput.trim();
  const units = quantityToUnits(quantity);
  if (total2 > MAX_MINOR || units <= BigInt(0) || units > MAX_QUANTITY_UNITS) throw new Error("Line total or quantity exceeds the supported range");
  const unitPrice = halfUp(total2 * SCALE, units);
  if (unitPrice > MAX_MINOR || halfUp(unitPrice * units, SCALE) !== total2) {
    throw new Error("This line total cannot be represented by an integer-minor-unit rate at this quantity; review the quantity and total or submit a quantity-one lump sum");
  }
  return { quantity, unitPriceMinor: unitPrice.toString(), amountMinor: total2.toString() };
}

// features/keystone/domain/bid-submissions.ts
async function assertPortalBidRecoveryOwnership(context, projectId2, invitationId, organizationId) {
  const sql = context.prisma?.$queryRawUnsafe?.bind(context.prisma);
  if (!sql) throw new Error("Bid recovery ownership lookup is unavailable");
  const [submission] = await sql('SELECT candidate."tradePartner" AS "partnerId", candidate.project AS "projectId", candidate.company AS "companyId", scope.company AS "projectCompanyId" FROM "BidSubmission" candidate JOIN "Project" scope ON scope.id = candidate.project WHERE candidate.invitation = $1', invitationId);
  const [invitation] = submission ? [] : await sql('SELECT candidate."tradePartner" AS "partnerId", candidate.project AS "projectId", candidate.company AS "companyId", scope.company AS "projectCompanyId" FROM "BidInvitation" candidate JOIN "Project" scope ON scope.id = candidate.project WHERE candidate.id = $1', invitationId);
  const owned = submission ?? invitation;
  if (!owned || owned.projectId !== projectId2 || owned.companyId !== owned.projectCompanyId || owned.partnerId !== organizationId) throw new Error("Bid request is not owned by this project organization");
}
async function lockBidSubmissionAdmission(context, projectId2, invitationId, options = {}) {
  const sql = context.prisma?.$queryRawUnsafe?.bind(context.prisma);
  if (!sql) throw new Error("Bid submission admission locking is unavailable");
  const [current] = await sql(`SELECT invitation."bidPackage" AS "packageId", invitation."tradePartner" AS "partnerId", invitation."budgetCode" AS "budgetCodeId",
    invitation.status::text AS "invitationStatus", package.status::text AS "packageStatus", package."dueAt",
    EXISTS (SELECT 1 FROM "BidSubmission" submission WHERE submission.invitation = invitation.id) AS "hasSubmission"
    FROM "BidInvitation" invitation JOIN "BidPackage" package ON package.id = invitation."bidPackage"
    JOIN "Project" project ON project.id = invitation.project
    WHERE invitation.id = $1 AND invitation.project = $2 AND package.project = $2
      AND invitation.company = project.company AND package.company = project.company
    FOR UPDATE OF invitation, package`, invitationId, projectId2);
  if (!current?.partnerId || current.packageStatus !== "open" || current.hasSubmission || !["invited", "viewed", "intent_to_bid"].includes(current.invitationStatus)) throw new Error("This invitation is no longer eligible for a new bid submission");
  if (options.organizationId && current.partnerId !== options.organizationId) throw new Error("Bid invitation is not assigned to this organization");
  if (options.enforceDeadline && current.dueAt && new Date(current.dueAt).getTime() <= Date.now()) throw new Error("Bid invitation is past due");
  return { packageId: current.packageId, partnerId: current.partnerId, budgetCodeId: current.budgetCodeId };
}

// features/keystone/domain/execution-admission.ts
async function lockExecutionAdmission(context, kind, id, projectId2, statuses, assignment) {
  const sql = context.prisma?.$queryRawUnsafe?.bind(context.prisma);
  if (!sql) throw new Error("Execution record admission locking is unavailable");
  const table = kind === "RFI" ? "RFI" : "Submittal";
  const partner = kind === "RFI" ? '"responsiblePartner"' : "NULL::text";
  const [record] = await sql(`SELECT id, status::text, "ballInCourt" AS "actorId", ${partner} AS "partnerId" FROM "${table}"
    WHERE id = $1 AND project = $2 AND company = (SELECT company FROM "Project" WHERE id = $2) FOR UPDATE`, id, projectId2);
  if (!record || !statuses.includes(record.status)) throw new Error("This record is no longer eligible for the requested action");
  if (assignment && record.actorId !== assignment.actorId && record.partnerId !== assignment.organizationId) throw new Error("This record is no longer assigned to this participant");
  return record;
}
async function lockSubmittalRevision(context, submittalId, projectId2, statuses) {
  await lockExecutionAdmission(context, "Submittal", submittalId, projectId2, statuses);
  const [row] = await context.prisma.$queryRawUnsafe('SELECT revision FROM "Submittal" WHERE id = $1', submittalId);
  return Number(row?.revision ?? 0);
}
async function lockActiveSubmittalReviewStep(context, reviewId, submittalId, projectId2) {
  const sql = context.prisma?.$queryRawUnsafe?.bind(context.prisma);
  if (!sql) throw new Error("Execution record admission locking is unavailable");
  const revision = await lockSubmittalRevision(context, submittalId, projectId2, ["submitted", "under_review"]);
  const [review] = await sql(
    'SELECT id, status::text, sequence, "submittalRevision" FROM "SubmittalReview" WHERE id = $1 AND submittal = $2 FOR UPDATE',
    reviewId,
    submittalId
  );
  if (!review || !["pending", "in_review"].includes(review.status)) throw new Error("This review step has already been decided");
  if (Number(review.submittalRevision) !== revision) throw new Error("This review step belongs to an earlier submission round");
  const [earlier] = await sql(
    `SELECT COUNT(*)::int AS count FROM "SubmittalReview" WHERE submittal = $1 AND "submittalRevision" = $2 AND sequence < $3 AND status IN ('pending', 'in_review')`,
    submittalId,
    revision,
    review.sequence
  );
  if (Number(earlier?.count ?? 0) > 0) throw new Error("Earlier reviewers in this round must respond first");
}

// features/keystone/mutations/portal.ts
function portalGrant(session, projectId2) {
  const membership = session.data.projectMemberships?.find(
    (entry) => entry.status === "active" && entry.project?.id === projectId2 && entry.portalType !== "internal" && entry.accessLevel !== "viewer" && entry.portalOrganization?.id
  );
  if (!membership?.portalOrganization?.id) throw new Error("An active external project organization grant is required");
  return { organizationId: membership.portalOrganization.id, portalType: membership.portalType };
}
function amount(value) {
  const normalized = requiredText(value, "Bid amount", 30);
  if (!/^\d+$/.test(normalized)) throw new Error("Bid amount must be non-negative integer minor units");
  return normalized;
}
async function submitPortalBid(_root, { input }, context) {
  const session = requireCommandSession(context);
  if (session.authType === "api_key") throw new Error("A live participant session is required");
  const projectId2 = requiredText(input.projectId, "Project id", 200);
  const grant = portalGrant(session, projectId2);
  if (!["subcontractor", "vendor"].includes(String(grant.portalType))) throw new Error("This portal role cannot submit bids");
  const invitationId = requiredText(input.targetId, "Bid invitation id", 200);
  const total2 = amount(input.amountMinor);
  let price = null;
  let budgetCodeId = null;
  return executeProjectCommand({
    context,
    operation: "submitPortalBid",
    permission: "canManagePreconstruction",
    projectId: projectId2,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "BidSubmission",
    allowExternalProjectWrite: true,
    externalOrganizationId: grant.organizationId,
    beforeReplay: (tx) => assertPortalBidRecoveryOwnership(tx, projectId2, invitationId, grant.organizationId),
    data: {},
    beforeCreate: async (tx) => {
      const admission = await lockBidSubmissionAdmission(tx, projectId2, invitationId, { organizationId: grant.organizationId, enforceDeadline: true });
      if (!admission.budgetCodeId) throw new Error("The invitation budget code is unavailable");
      budgetCodeId = admission.budgetCodeId;
      price = priceLineFromTotal(total2, input.quantity || "1");
      return {
        submissionNumber: requiredText(input.reference, "Submission number", 80),
        status: "submitted",
        totalMinor: total2,
        clarifications: requiredText(input.response, "Bid clarifications", 1e4),
        submittedAt: /* @__PURE__ */ new Date(),
        invitation: { connect: { id: invitationId } },
        bidPackage: { connect: { id: admission.packageId } },
        tradePartner: { connect: { id: admission.partnerId } },
        project: { connect: { id: projectId2 } }
      };
    },
    afterCreate: async (tx, submission) => {
      if (!price || !budgetCodeId) throw new Error("Portal bid pricing admission is unavailable");
      await requireCreate(tx.sudo(), "BidLineItem")({ data: {
        lineNumber: 1,
        description: "Portal-submitted base bid",
        quantity: price.quantity,
        unit: input.unit?.trim() || "LS",
        unitPriceMinor: price.unitPriceMinor,
        amountMinor: price.amountMinor,
        submission: { connect: { id: submission.id } },
        budgetCode: { connect: { id: budgetCodeId } },
        project: { connect: { id: projectId2 } }
      } });
      await requireUpdate(tx.sudo(), "BidInvitation")({ where: { id: invitationId }, data: {
        status: "submitted",
        respondedAt: /* @__PURE__ */ new Date()
      } });
    }
  });
}
async function respondPortalRfi(_root, { input }, context) {
  const session = requireCommandSession(context);
  if (session.authType === "api_key") throw new Error("A live participant session is required");
  const projectId2 = requiredText(input.projectId, "Project id", 200);
  const grant = portalGrant(session, projectId2);
  const rfiId = requiredText(input.targetId, "RFI id", 200);
  const rfi = await queryById(context, "RFI", rfiId, "id status ballInCourt { id } responsiblePartner { id } project { id }");
  const assigned = rfi?.ballInCourt?.id === session.itemId || rfi?.responsiblePartner?.id === grant.organizationId;
  if (rfi?.project?.id !== projectId2 || !assigned) throw new Error("Assigned RFI not found");
  return executeProjectCommand({
    context,
    operation: "respondPortalRfi",
    permission: "canManageProjectExecution",
    projectId: projectId2,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "RFIResponse",
    allowExternalProjectWrite: true,
    externalOrganizationId: grant.organizationId,
    beforeCreate: async (tx) => {
      await lockExecutionAdmission(tx, "RFI", rfiId, projectId2, ["open"], { actorId: requireCommandSession(tx).itemId, organizationId: grant.organizationId });
    },
    data: {
      response: requiredText(input.response, "RFI response", 1e4),
      isOfficial: false,
      respondedAt: /* @__PURE__ */ new Date(),
      rfi: { connect: { id: rfiId } },
      author: { connect: { id: session.itemId } },
      onBehalfOf: { connect: { id: grant.organizationId } },
      project: { connect: { id: projectId2 } }
    }
  });
}
async function reviewPortalSubmittal(_root, { input }, context) {
  const session = requireCommandSession(context);
  if (session.authType === "api_key") throw new Error("A live participant session is required");
  const projectId2 = requiredText(input.projectId, "Project id", 200);
  const grant = portalGrant(session, projectId2);
  const submittalId = requiredText(input.targetId, "Submittal id", 200);
  const decision = ["approved", "approved_as_noted", "revise_resubmit", "rejected"].includes(String(input.decision)) ? String(input.decision) : null;
  if (!decision) throw new Error("Submittal decision is invalid");
  const reviews = await context.sudo().query.SubmittalReview.findMany({
    where: {
      submittal: { id: { equals: submittalId } },
      project: { id: { equals: projectId2 } },
      status: { in: ["pending", "in_review"] },
      OR: [{ reviewer: { id: { equals: session.itemId } } }, { reviewerPartner: { id: { equals: grant.organizationId } } }]
    },
    take: 100,
    query: "id status sequence submittalRevision"
  });
  const submittal = await context.sudo().query.Submittal.findOne({ where: { id: submittalId }, query: "id revision" });
  const activeReview = [...reviews].filter((entry) => Number(entry.submittalRevision ?? 0) === Number(submittal?.revision ?? 0)).sort((left, right) => Number(left.sequence ?? 0) - Number(right.sequence ?? 0))[0];
  const reviewId = String(activeReview?.id ?? "");
  if (!reviewId) throw new Error("Assigned submittal review not found");
  return executeProjectCommand({
    context,
    operation: "reviewPortalSubmittal",
    permission: "canManageProjectExecution",
    projectId: projectId2,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "SubmittalReview",
    updateId: reviewId,
    allowExternalProjectWrite: true,
    externalOrganizationId: grant.organizationId,
    beforeCreate: async (tx) => {
      await lockActiveSubmittalReviewStep(tx, reviewId, submittalId, projectId2);
    },
    data: { status: decision, response: requiredText(input.response, "Review response", 1e4), completedAt: /* @__PURE__ */ new Date() }
  });
}
async function submitPortalProgressClaim(_root, { input }, context) {
  const session = requireCommandSession(context);
  if (session.authType === "api_key") throw new Error("A live participant session is required");
  const projectId2 = requiredText(input.projectId, "Project id", 200);
  portalGrant(session, projectId2);
  return prepareProgressClaim(_root, { input: {
    projectId: projectId2,
    reference: requiredText(input.reference, "Claim number", 100),
    title: requiredText(input.title, "Invoice number", 100),
    description: input.response,
    dueAt: input.dueAt,
    amountMinor: input.amountMinor,
    relatedId: input.targetId,
    idempotencyKey: input.idempotencyKey
  } }, context);
}
async function submitPortalLienWaiver(_root, { input }, context) {
  const session = requireCommandSession(context);
  if (session.authType === "api_key") throw new Error("A live participant session is required");
  const projectId2 = requiredText(input.projectId, "Project id", 200);
  const grant = portalGrant(session, projectId2);
  const commitmentId = requiredText(input.targetId, "Commitment id", 200);
  const commitment = await queryById(context, "Commitment", commitmentId, "id tradePartner { id } project { id }");
  const commitmentPartnerId = commitment?.tradePartner?.id;
  if (commitment?.project?.id !== projectId2 || commitmentPartnerId !== grant.organizationId) throw new Error("Commitment not found for this portal organization");
  const amountMinor = amount(input.amountMinor);
  const checksum2 = requiredText(input.evidenceChecksumSha256, "Evidence SHA-256", 64).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(checksum2)) throw new Error("Evidence checksum must be SHA-256 hex");
  const evidenceReference = requiredText(input.evidenceReference, "Evidence reference", 160);
  return executeProjectCommand({
    context,
    operation: "submitPortalLienWaiver",
    permission: "canManageBilling",
    projectId: projectId2,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "LienWaiver",
    allowExternalProjectWrite: true,
    externalOrganizationId: grant.organizationId,
    data: {
      waiverNumber: requiredText(input.reference, "Waiver number", 100),
      waiverType: ["conditional_progress", "unconditional_progress", "conditional_final", "unconditional_final"].includes(String(input.decision)) ? input.decision : "conditional_progress",
      status: "received",
      throughDate: optionalDate(input.dueAt, "Through date") ?? /* @__PURE__ */ new Date(),
      amountMinor,
      requestedAt: /* @__PURE__ */ new Date(),
      receivedAt: /* @__PURE__ */ new Date(),
      signedAt: /* @__PURE__ */ new Date(),
      signerName: requiredText(input.title, "Signer name", 200),
      fileName: `${evidenceReference}.external`,
      storageKey: `external:${evidenceReference}`,
      checksumSha256: checksum2,
      tradePartner: { connect: { id: grant.organizationId } },
      commitment: { connect: { id: commitmentId } },
      project: { connect: { id: projectId2 } }
    }
  });
}

// features/keystone/mutations/workflows.ts
var import_node_crypto17 = require("node:crypto");
function amount2(value, label = "Amount", positive = false) {
  const normalized = requiredText(value, label, 30);
  if (!/^\d+$/.test(normalized) || BigInt(normalized) > BigInt("9223372036854775807") || positive && BigInt(normalized) === BigInt(0)) {
    throw new Error(`${label} must be ${positive ? "positive" : "non-negative"} integer minor units`);
  }
  return normalized;
}
function signedAmount(value, label = "Amount") {
  const normalized = requiredText(value, label, 30);
  if (!/^-?\d+$/.test(normalized) || BigInt(normalized) === BigInt(0) || BigInt(normalized) < BigInt("-9223372036854775808") || BigInt(normalized) > BigInt("9223372036854775807")) {
    throw new Error(`${label} must be a non-zero signed integer minor-unit value`);
  }
  return normalized;
}
function decimalQuantity(value, label = "Quantity") {
  const normalized = requiredText(value, label, 40);
  if (!/^\d+(?:\.\d{1,4})?$/.test(normalized) || quantityToUnits(normalized) <= BigInt(0) || quantityToUnits(normalized) > BigInt("999999999999999999")) {
    throw new Error(`${label} must be a positive number with at most four decimal places`);
  }
  return normalized;
}
function checksum(value) {
  const normalized = requiredText(value, "Evidence checksum", 64).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) throw new Error("Evidence checksum must be SHA-256 hex");
  return normalized;
}
function projectId(input) {
  return requiredText(input.projectId, "Project id", 200);
}
async function projectCompany(context, id) {
  const project = await queryById(context, "Project", id, "id currencyCode company { id }");
  if (!project?.company?.id) throw new Error("Project not found");
  return { companyId: project.company.id, currencyCode: String(project.currencyCode ?? "USD") };
}
async function registerTradePartner(_root, { input }, context) {
  const id = projectId(input);
  const { companyId } = await projectCompany(context, id);
  const partnerType = ["owner", "designer", "subcontractor", "vendor", "consultant", "authority"].includes(String(input.type)) ? String(input.type) : "subcontractor";
  return executeProjectCommand({
    context,
    operation: "registerTradePartner",
    permission: "canManageCompanies",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "TradePartner",
    data: {
      name: requiredText(input.title, "Partner name", 240),
      legalName: input.description?.trim(),
      partnerType,
      status: "prospective",
      email: input.reference?.trim(),
      company: { connect: { id: companyId } }
    }
  });
}
async function addBudgetLine(_root, { input }, context) {
  const id = projectId(input);
  const budgetCodeId = requiredText(input.relatedId, "Budget code id", 200);
  const original = amount2(input.amountMinor, "Original budget amount");
  const active = await context.sudo().query.Budget.findMany({
    where: { project: { id: { equals: id } }, status: { equals: "active" } },
    take: 2,
    query: "id currencyCode"
  });
  const budgetId = String(active[0]?.id ?? "");
  const singleActiveBudget = active.length === 1 && Boolean(budgetId);
  const existingLines = await context.sudo().query.BudgetLineItem.findMany({
    where: { project: { id: { equals: id } }, budget: { id: { equals: budgetId } }, budgetCode: { id: { equals: budgetCodeId } } },
    take: 2,
    query: "id originalAmountMinor revisedAmountMinor committedAmountMinor actualCostMinor projectedFinalCostMinor"
  });
  const existing = existingLines[0];
  const existingLineId = existing?.id ? String(existing.id) : void 0;
  return executeProjectCommand({
    context,
    operation: "addBudgetLine",
    permission: "canManageFinancials",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "BudgetLineItem",
    ...existingLineId ? { updateId: existingLineId } : {},
    beforeAdmission: async () => {
      if (!singleActiveBudget) throw new Error("Exactly one active project budget is required");
      if (existingLines.length > 1) throw new Error("Duplicate budget-code lines require operator reconciliation before funding");
    },
    data: {
      description: requiredText(input.title, "Budget line description", 300),
      originalAmountMinor: original,
      revisedAmountMinor: original,
      projectedOverUnderMinor: original,
      budget: { connect: { id: budgetId } },
      budgetCode: { connect: { id: budgetCodeId } },
      project: { connect: { id } }
    },
    beforeCreate: async (tx) => {
      if (!tx.prisma?.$queryRawUnsafe) throw new Error("Budget-line establishment lock is unavailable");
      const [lockedBudget] = await tx.prisma.$queryRawUnsafe(
        `SELECT id FROM "Budget" WHERE id = $1 AND project = $2 AND status = 'active' FOR UPDATE`,
        budgetId,
        id
      );
      if (!lockedBudget) throw new Error("Active budget changed before baseline funding");
      if (existingLineId) {
        const [lockedLine] = await tx.prisma.$queryRawUnsafe(
          `SELECT "originalAmountMinor", "revisedAmountMinor", "committedAmountMinor", "actualCostMinor", "projectedFinalCostMinor"
           FROM "BudgetLineItem" WHERE id = $1 AND project = $2 AND budget = $3 AND "budgetCode" = $4 FOR UPDATE`,
          existingLineId,
          id,
          budgetId,
          budgetCodeId
        );
        if (!lockedLine || Object.values(lockedLine).some((value) => BigInt(value) !== BigInt(0))) {
          throw new Error("Only an untouched zero-value baseline line can be established once");
        }
      } else {
        const duplicate = await tx.prisma.$queryRawUnsafe(
          `SELECT id FROM "BudgetLineItem" WHERE project = $1 AND budget = $2 AND "budgetCode" = $3 FOR UPDATE`,
          id,
          budgetId,
          budgetCodeId
        );
        if (duplicate.length) throw new Error("A budget-code line was concurrently established; reload and review its baseline");
      }
      return {
        description: requiredText(input.title, "Budget line description", 300),
        originalAmountMinor: original,
        revisedAmountMinor: original,
        projectedOverUnderMinor: original,
        budget: { connect: { id: budgetId } },
        budgetCode: { connect: { id: budgetCodeId } },
        project: { connect: { id } }
      };
    },
    afterCreate: async (tx) => {
      if (!tx.prisma?.budget?.update) throw new Error("Transactional budget rollup is unavailable");
      await tx.prisma.budget.update({ where: { id: budgetId }, data: {
        totalOriginalMinor: { increment: BigInt(original) },
        totalRevisedMinor: { increment: BigInt(original) }
      } });
    }
  });
}
async function createBudgetChangeWithLine(_root, { input }, context) {
  const id = projectId(input);
  const code = requiredText(input.relatedId, "Budget code", 200);
  const change = signedAmount(input.amountMinor, "Budget change");
  let lineId = "";
  return executeProjectCommand({
    context,
    operation: "createBudgetChangeWithLine",
    permission: "canManageFinancials",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "BudgetChange",
    data: {},
    beforeCreate: async (tx) => {
      if (!tx.prisma?.$queryRawUnsafe) throw new Error("Budget revision locks are unavailable");
      const budgets = await tx.prisma.$queryRawUnsafe(
        `SELECT id, "currencyCode" FROM "Budget" WHERE project = $1 AND status = 'active' ORDER BY id LIMIT 2 FOR UPDATE`,
        id
      );
      if (budgets.length !== 1 || budgets[0].currencyCode !== "USD") throw new Error("Exactly one active USD budget is required");
      const lines = await tx.prisma.$queryRawUnsafe(
        'SELECT line.id FROM "BudgetLineItem" line JOIN "BudgetCode" code ON code.id = line."budgetCode" WHERE line.budget = $1 AND line.project = $2 AND line."budgetCode" = $3 AND code.project = $2 ORDER BY line.id LIMIT 2 FOR UPDATE OF line, code',
        budgets[0].id,
        id,
        code
      );
      if (lines.length !== 1) throw new Error("Establish one baseline line for this budget code before revising it");
      lineId = lines[0].id;
      return {
        number: requiredText(input.reference, "Budget change number", 80),
        title: requiredText(input.title, "Budget change title", 240),
        reason: requiredText(input.description, "Budget change reason", 4e3),
        status: "draft",
        totalAmountMinor: change,
        currencyCode: "USD",
        requestedBy: { connect: { id: requireCommandSession(tx).itemId } },
        budget: { connect: { id: budgets[0].id } },
        project: { connect: { id } }
      };
    },
    afterCreate: async (tx, created) => {
      await requireCreate(tx.sudo(), "BudgetChangeLineItem")({ data: {
        description: requiredText(input.description, "Budget change reason", 500),
        amountMinor: change,
        budgetChange: { connect: { id: created.id } },
        budgetLineItem: { connect: { id: lineId } },
        budgetCode: { connect: { id: code } },
        project: { connect: { id } }
      } });
    }
  });
}
async function reversePostedDirectCost(_root, { input }, context) {
  const id = projectId(input);
  const directCostId = requiredText(input.relatedId, "Direct cost id", 200);
  return executeProjectCommand({
    context,
    operation: "reversePostedDirectCost",
    permission: "canManageFinancials",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "DirectCost",
    updateId: directCostId,
    data: {},
    beforeCreate: async (tx) => {
      if (!tx.prisma?.$queryRawUnsafe || !tx.prisma.budgetLineItem?.update || !tx.prisma.budget?.update) throw new Error("Transactional cost reversal is unavailable");
      const [cost] = await tx.prisma.$queryRawUnsafe(
        `SELECT status::text, "amountMinor", project AS "projectId", "budgetCode" AS "budgetCodeId" FROM "DirectCost" WHERE id = $1 FOR UPDATE`,
        directCostId
      );
      if (!cost || cost.projectId !== id || cost.status !== "posted") throw new Error("Only a posted project cost can be reversed");
      const [line] = await tx.prisma.$queryRawUnsafe(
        `SELECT line.id, line.budget AS "budgetId" FROM "BudgetLineItem" line JOIN "Budget" budget ON budget.id = line.budget
         WHERE line.project = $1 AND line."budgetCode" = $2 AND budget.status = 'active' ORDER BY line."createdAt" ASC LIMIT 1 FOR UPDATE OF line, budget`,
        id,
        cost.budgetCodeId
      );
      if (!line) throw new Error("Active budget line for the posted cost is unavailable");
      await tx.prisma.budgetLineItem.update({ where: { id: line.id }, data: {
        actualCostMinor: { decrement: cost.amountMinor },
        projectedFinalCostMinor: { decrement: cost.amountMinor },
        projectedOverUnderMinor: { increment: cost.amountMinor }
      } });
      await tx.prisma.budget.update({ where: { id: line.budgetId }, data: { totalActualMinor: { decrement: cost.amountMinor } } });
      return {
        status: "voided",
        voidedAt: optionalDate(input.occurredAt, "Reversal effective date") ?? /* @__PURE__ */ new Date(),
        voidReason: requiredText(input.description, "Reversal reason", 2e3),
        voidedBy: { connect: { id: requireCommandSession(context).itemId } }
      };
    }
  });
}
async function createEstimateWithLine(_root, { input }, context) {
  const id = projectId(input);
  const total2 = amount2(input.amountMinor, "Estimate line amount");
  const budgetCodeId = requiredText(input.relatedId, "Budget code id", 200);
  let versionId = "";
  return executeProjectCommand({
    context,
    operation: "createEstimateWithLine",
    permission: "canManagePreconstruction",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "Estimate",
    data: {
      number: requiredText(input.reference, "Estimate number", 80),
      title: requiredText(input.title, "Estimate title", 240),
      description: input.description?.trim(),
      estimator: { connect: { id: requireCommandSession(context).itemId } },
      project: { connect: { id } }
    },
    afterCreate: async (tx, estimate) => {
      const version = await requireCreate(tx.sudo(), "EstimateVersion")({ data: {
        versionNumber: 1,
        status: "draft",
        subtotalMinor: total2,
        totalMinor: total2,
        scopeSummary: input.description?.trim(),
        estimate: { connect: { id: estimate.id } },
        project: { connect: { id } }
      } });
      versionId = version.id;
      await requireCreate(tx.sudo(), "EstimateLineItem")({ data: {
        lineNumber: 1,
        description: requiredText(input.description || input.title, "Estimate line description", 500),
        quantity: decimalQuantity(input.quantity || "1"),
        unit: input.unit?.trim() || "LS",
        subcontractCostMinor: total2,
        totalCostMinor: total2,
        version: { connect: { id: version.id } },
        budgetCode: { connect: { id: budgetCodeId } },
        project: { connect: { id } }
      } });
      await requireUpdate(tx.sudo(), "Estimate")({ where: { id: estimate.id }, data: { currentVersion: { connect: { id: version.id } } } });
    }
  }).finally(() => {
  });
}
async function reviseEstimate(_root, { input }, context) {
  const id = projectId(input);
  const estimateId = requiredText(input.relatedId, "Estimate id", 200);
  let previousVersionId = "";
  return executeProjectCommand({
    context,
    operation: "reviseEstimate",
    permission: "canManagePreconstruction",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "EstimateVersion",
    beforeCreate: async (tx) => {
      if (!tx.prisma?.$queryRawUnsafe) throw new Error("Estimate revision locking is unavailable");
      const [row] = await tx.prisma.$queryRawUnsafe(
        `SELECT e.status::text AS "estimateStatus", v.id AS "versionId", v."versionNumber", v.status::text AS "versionStatus",
                v."subtotalMinor", v."overheadMinor", v."profitMinor", v."contingencyMinor", v."totalMinor", v."currencyCode",
                v."scopeSummary", v.assumptions, v.exclusions,
                (SELECT MAX("versionNumber") FROM "EstimateVersion" WHERE estimate = e.id) AS "maxVersion"
         FROM "Estimate" e LEFT JOIN "EstimateVersion" v ON v.id = e."currentVersion"
         WHERE e.id = $1 AND e.project = $2 FOR UPDATE OF e`,
        estimateId,
        id
      );
      if (!row) throw new Error("Estimate not found on this project");
      if (row.estimateStatus !== "rejected") throw new Error("Only a rejected estimate can be revised into a new draft version");
      if (!row.versionId || row.versionStatus !== "issued") throw new Error("The estimate has no issued version to revise");
      previousVersionId = row.versionId;
      return {
        versionNumber: Number(row.maxVersion ?? row.versionNumber ?? 0) + 1,
        status: "draft",
        subtotalMinor: row.subtotalMinor,
        overheadMinor: row.overheadMinor,
        profitMinor: row.profitMinor,
        contingencyMinor: row.contingencyMinor,
        totalMinor: row.totalMinor,
        ...row.currencyCode ? { currencyCode: row.currencyCode } : {},
        scopeSummary: input.description?.trim() || row.scopeSummary,
        assumptions: row.assumptions,
        exclusions: row.exclusions,
        estimate: { connect: { id: estimateId } },
        project: { connect: { id } }
      };
    },
    data: { estimate: { connect: { id: estimateId } }, project: { connect: { id } } },
    afterCreate: async (tx, version) => {
      const sudo = tx.sudo();
      const lines = await sudo.query.EstimateLineItem.findMany({
        where: { version: { id: { equals: previousVersionId } } },
        take: 501,
        orderBy: [{ lineNumber: "asc" }],
        query: "lineNumber description quantity unit laborCostMinor materialCostMinor equipmentCostMinor subcontractCostMinor otherCostMinor totalCostMinor budgetCode { id }"
      });
      if (lines.length > 500) throw new Error("Estimate has more lines than a revision can copy");
      for (const line of lines) {
        const budgetCode = line.budgetCode;
        await requireCreate(sudo, "EstimateLineItem")({ data: {
          lineNumber: line.lineNumber,
          description: line.description,
          quantity: line.quantity,
          unit: line.unit,
          laborCostMinor: line.laborCostMinor,
          materialCostMinor: line.materialCostMinor,
          equipmentCostMinor: line.equipmentCostMinor,
          subcontractCostMinor: line.subcontractCostMinor,
          otherCostMinor: line.otherCostMinor,
          totalCostMinor: line.totalCostMinor,
          version: { connect: { id: version.id } },
          ...budgetCode?.id ? { budgetCode: { connect: { id: budgetCode.id } } } : {},
          project: { connect: { id } }
        } });
      }
      if (!tx.prisma?.$executeRawUnsafe) throw new Error("Estimate revision is unavailable");
      const updated = await tx.prisma.$executeRawUnsafe(
        `UPDATE "Estimate" SET status = 'draft', "currentVersion" = $1 WHERE id = $2 AND status = 'rejected'`,
        version.id,
        estimateId
      );
      if (updated !== 1) throw new Error("Estimate changed concurrently; reload before revising");
    }
  });
}
async function inviteBidder(_root, { input }, context) {
  const id = projectId(input);
  const bidPackageId = requiredText(input.relatedId, "Bid package id", 200);
  const budgetCodeId = requiredText(input.secondaryId, "Budget code id", 200);
  const partnerId = requiredText(input.partnerId, "Trade partner id", 200);
  return executeProjectCommand({
    context,
    operation: "inviteBidder",
    permission: "canManagePreconstruction",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "BidInvitation",
    data: {
      status: "draft",
      recipientName: requiredText(input.title, "Recipient name", 200),
      recipientEmail: requiredText(input.reference, "Recipient email", 320),
      bidPackage: { connect: { id: bidPackageId } },
      budgetCode: { connect: { id: budgetCodeId } },
      tradePartner: { connect: { id: partnerId } },
      project: { connect: { id } }
    }
  });
}
async function recordBidSubmission(_root, { input }, context) {
  const id = projectId(input);
  const invitationId = requiredText(input.relatedId, "Bid invitation id", 200);
  const budgetCodeId = requiredText(input.secondaryId, "Budget code id", 200);
  const total2 = amount2(input.amountMinor, "Submitted total");
  let price = null;
  return executeProjectCommand({
    context,
    operation: "recordBidSubmission",
    permission: "canManagePreconstruction",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "BidSubmission",
    data: {},
    beforeCreate: async (tx) => {
      const admission = await lockBidSubmissionAdmission(tx, id, invitationId);
      price = priceLineFromTotal(total2, decimalQuantity(input.quantity || "1"));
      return {
        submissionNumber: requiredText(input.reference, "Submission number", 80),
        status: "submitted",
        totalMinor: total2,
        exclusions: input.description?.trim(),
        submittedAt: optionalDate(input.occurredAt, "Submission date") ?? /* @__PURE__ */ new Date(),
        invitation: { connect: { id: invitationId } },
        bidPackage: { connect: { id: admission.packageId } },
        tradePartner: { connect: { id: admission.partnerId } },
        project: { connect: { id } }
      };
    },
    afterCreate: async (tx, submission) => {
      if (!price) throw new Error("Bid pricing admission is unavailable");
      await requireCreate(tx.sudo(), "BidLineItem")({ data: {
        lineNumber: 1,
        description: requiredText(input.title, "Bid scope", 500),
        quantity: price.quantity,
        unit: input.unit?.trim() || "LS",
        unitPriceMinor: price.unitPriceMinor,
        amountMinor: price.amountMinor,
        submission: { connect: { id: submission.id } },
        budgetCode: { connect: { id: budgetCodeId } },
        project: { connect: { id } }
      } });
      await requireUpdate(tx.sudo(), "BidInvitation")({ where: { id: invitationId }, data: {
        status: "submitted",
        respondedAt: /* @__PURE__ */ new Date()
      } });
    }
  });
}
async function createContractWithLine(input, context, listKey) {
  const id = projectId(input);
  const total2 = amount2(input.amountMinor, "Contract value");
  const budgetCodeId = requiredText(input.secondaryId, "Budget code id", 200);
  const partnerId = requiredText(input.partnerId, "Trade partner id", 200);
  const isPrime = listKey === "PrimeContract";
  return executeProjectCommand({
    context,
    operation: isPrime ? "createPrimeContractWithLine" : "createCommitmentWithLine",
    permission: "canManageContracts",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey,
    data: {
      number: requiredText(input.reference, `${isPrime ? "Prime contract" : "Commitment"} number`, 80),
      title: requiredText(input.title, "Contract title", 240),
      description: input.description?.trim(),
      ...isPrime ? { contractType: input.type || "lump_sum", client: { connect: { id: partnerId } } } : {
        commitmentType: input.type === "purchase_order" ? "purchase_order" : "subcontract",
        tradePartner: { connect: { id: partnerId } }
      },
      originalContractMinor: total2,
      revisedContractMinor: total2,
      contractManager: { connect: { id: requireCommandSession(context).itemId } },
      project: { connect: { id } }
    },
    afterCreate: async (tx, contract) => {
      await requireCreate(tx.sudo(), "ContractLineItem")({ data: {
        lineNumber: 1,
        description: requiredText(input.description || input.title, "Schedule-of-values description", 500),
        scheduledValueMinor: total2,
        revisedValueMinor: total2,
        ...isPrime ? { primeContract: { connect: { id: contract.id } } } : { commitment: { connect: { id: contract.id } } },
        budgetCode: { connect: { id: budgetCodeId } },
        project: { connect: { id } }
      } });
      if (!isPrime && tx.prisma?.$queryRawUnsafe && tx.prisma.budgetLineItem?.update && tx.prisma.budget?.update) {
        const [line] = await tx.prisma.$queryRawUnsafe(
          `SELECT line.id, line.budget AS "budgetId" FROM "BudgetLineItem" line
           JOIN "Budget" budget ON budget.id = line.budget
           WHERE line.project = $1 AND line."budgetCode" = $2 AND budget.status = 'active'
           ORDER BY line."createdAt" ASC LIMIT 1 FOR UPDATE OF line, budget`,
          id,
          budgetCodeId
        );
        if (!line) throw new Error("A matching active budget line is required for commitment rollup");
        await tx.prisma.budgetLineItem.update({ where: { id: line.id }, data: {
          committedAmountMinor: { increment: BigInt(total2) },
          projectedFinalCostMinor: { increment: BigInt(total2) },
          projectedOverUnderMinor: { decrement: BigInt(total2) }
        } });
        await tx.prisma.budget.update({ where: { id: line.budgetId }, data: { totalCommittedMinor: { increment: BigInt(total2) } } });
      }
    }
  });
}
var createPrimeContractWithLine = (_root, { input }, context) => createContractWithLine(input, context, "PrimeContract");
var createCommitmentWithLine = (_root, { input }, context) => createContractWithLine(input, context, "Commitment");
async function createChangeOrderWithLine(_root, { input }, context) {
  const id = projectId(input);
  const total2 = signedAmount(input.amountMinor, "Change order value");
  const contractId = requiredText(input.relatedId, "Contract id", 200);
  const budgetCodeId = requiredText(input.secondaryId, "Budget code id", 200);
  const ownerDirection = input.type !== "commitment";
  const parentList = ownerDirection ? "PrimeContract" : "Commitment";
  const parent = await queryById(context, parentList, contractId, "id project { id } lineItems(take: 200) { id budgetCode { id } }");
  const contractLine = Array.isArray(parent?.lineItems) ? parent.lineItems.find((line) => line.budgetCode?.id === budgetCodeId) : void 0;
  if (parent?.project?.id !== id || !contractLine?.id) throw new Error("Contract and matching schedule-of-values line are required in this project");
  return executeProjectCommand({
    context,
    operation: "createChangeOrderWithLine",
    permission: "canManageContracts",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "ChangeOrder",
    data: {
      number: requiredText(input.reference, "Change order number", 80),
      title: requiredText(input.title, "Change order title", 240),
      description: input.description?.trim(),
      direction: ownerDirection ? "owner" : "commitment",
      totalMinor: total2,
      requestedBy: { connect: { id: requireCommandSession(context).itemId } },
      ...ownerDirection ? { primeContract: { connect: { id: contractId } } } : { commitment: { connect: { id: contractId } } },
      project: { connect: { id } }
    },
    afterCreate: async (tx, order) => {
      await requireCreate(tx.sudo(), "ChangeOrderLineItem")({ data: {
        lineNumber: 1,
        description: requiredText(input.description || input.title, "Change order line description", 500),
        amountMinor: total2,
        changeOrder: { connect: { id: order.id } },
        budgetCode: { connect: { id: budgetCodeId } },
        contractLineItem: { connect: { id: String(contractLine.id) } },
        project: { connect: { id } }
      } });
    }
  });
}
async function routeRfi(_root, { input }, context) {
  const id = projectId(input);
  const rfiId = requiredText(input.relatedId, "RFI id", 200);
  const assigneeId = requiredText(input.userId, "RFI assignee id", 200);
  return executeProjectCommand({
    context,
    operation: "routeRfi",
    permission: "canManageProjectExecution",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "RFI",
    updateId: rfiId,
    beforeCreate: async (tx) => {
      await lockExecutionAdmission(tx, "RFI", rfiId, id, ["draft", "open", "answered"]);
    },
    data: {
      ballInCourt: { connect: { id: assigneeId } },
      dueAt: optionalDate(input.dueAt, "RFI due date"),
      ...input.partnerId ? { responsiblePartner: { connect: { id: input.partnerId } } } : {}
    }
  });
}
async function respondToRfi(_root, { input }, context) {
  const id = projectId(input);
  const rfiId = requiredText(input.relatedId, "RFI id", 200);
  return executeProjectCommand({
    context,
    operation: "respondToRfi",
    permission: "canManageProjectExecution",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "RFIResponse",
    beforeCreate: async (tx) => {
      await lockExecutionAdmission(tx, "RFI", rfiId, id, ["open", "answered"]);
    },
    data: {
      response: requiredText(input.description, "RFI response", 1e4),
      isOfficial: input.type === "official",
      respondedAt: optionalDate(input.occurredAt, "Response date") ?? /* @__PURE__ */ new Date(),
      rfi: { connect: { id: rfiId } },
      author: { connect: { id: requireCommandSession(context).itemId } },
      project: { connect: { id } }
    }
  });
}
async function routeSubmittalReview(_root, { input }, context) {
  const id = projectId(input);
  const submittalId = requiredText(input.relatedId, "Submittal id", 200);
  const reviewerId = requiredText(input.userId, "Reviewer id", 200);
  const sequence = Number(input.quantity || 1);
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 100) throw new Error("Review sequence must be from 1 to 100");
  const reviewData = {
    sequence,
    status: "pending",
    response: input.description?.trim(),
    dueAt: optionalDate(input.dueAt, "Review due date"),
    submittal: { connect: { id: submittalId } },
    reviewer: { connect: { id: reviewerId } },
    ...input.partnerId ? { reviewerPartner: { connect: { id: input.partnerId } } } : {},
    project: { connect: { id } }
  };
  return executeProjectCommand({
    context,
    operation: "routeSubmittalReview",
    permission: "canManageProjectExecution",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "SubmittalReview",
    beforeCreate: async (tx) => ({
      ...reviewData,
      submittalRevision: await lockSubmittalRevision(tx, submittalId, id, ["draft", "submitted", "under_review", "revise_resubmit"])
    }),
    data: reviewData,
    afterCreate: async (tx) => {
      await requireUpdate(tx.sudo(), "Submittal")({ where: { id: submittalId }, data: { ballInCourt: { connect: { id: reviewerId } } } });
    }
  });
}
async function recordSubmittalReview(_root, { input }, context) {
  const id = projectId(input);
  const submittalId = requiredText(input.relatedId, "Submittal id", 200);
  const decision = ["approved", "approved_as_noted", "revise_resubmit", "rejected"].includes(String(input.type)) ? String(input.type) : null;
  if (!decision) throw new Error("A supported submittal review decision is required");
  const reviewerId = requireCommandSession(context).itemId;
  const pending = await context.sudo().query.SubmittalReview.findMany({
    where: {
      submittal: { id: { equals: submittalId } },
      project: { id: { equals: id } },
      reviewer: { id: { equals: reviewerId } },
      status: { equals: "pending" }
    },
    take: 100,
    query: "id sequence submittalRevision"
  });
  const submittal = await queryById(context, "Submittal", submittalId, "id revision");
  const review = [...pending].filter((entry) => Number(entry.submittalRevision ?? 0) === Number(submittal?.revision ?? 0)).sort((left, right) => Number(left.sequence ?? 0) - Number(right.sequence ?? 0))[0];
  if (!review?.id) throw new Error("No pending review assignment is available to this reviewer");
  return executeProjectCommand({
    context,
    operation: "recordSubmittalReview",
    permission: "canManageProjectExecution",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "SubmittalReview",
    updateId: String(review.id),
    beforeCreate: async (tx) => {
      await lockActiveSubmittalReviewStep(tx, String(review.id), submittalId, id);
    },
    data: {
      status: decision,
      response: requiredText(input.description, "Review response", 1e4),
      completedAt: optionalDate(input.occurredAt, "Review date") ?? /* @__PURE__ */ new Date()
    }
  });
}
async function lockDraftDailyLog(context, logId, project) {
  if (!context.prisma?.$queryRawUnsafe) throw new Error("Daily log admission locking is unavailable");
  const [log] = await context.prisma.$queryRawUnsafe('SELECT id, status::text, project AS "projectId" FROM "DailyLog" WHERE id = $1 FOR UPDATE', logId);
  if (!log || log.projectId !== project || log.status !== "draft") throw new Error("Only a draft daily log accepts new entries or photo links; submitted history cannot be changed");
}
async function addDailyLogEntry(_root, { input }, context) {
  const id = projectId(input);
  const dailyLogId = requiredText(input.relatedId, "Daily log id", 200);
  const entryType = ["weather", "manpower", "equipment", "delivery", "material", "safety", "inspection", "delay", "progress", "visitor", "note"].includes(String(input.type)) ? String(input.type) : "note";
  return executeProjectCommand({
    context,
    operation: "addDailyLogEntry",
    permission: "canManageFieldOperations",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "DailyLogEntry",
    beforeCreate: async (tx) => {
      await lockDraftDailyLog(tx, dailyLogId, id);
    },
    data: {
      entryType,
      title: requiredText(input.title, "Entry title", 240),
      details: input.description?.trim(),
      startedAt: optionalDate(input.occurredAt, "Entry start"),
      quantity: input.quantity || void 0,
      unit: input.unit?.trim(),
      delayDays: entryType === "delay" ? Number(input.quantity || 0) : void 0,
      dailyLog: { connect: { id: dailyLogId } },
      project: { connect: { id } }
    }
  });
}
async function registerFieldPhoto(_root, { input }, context) {
  const id = projectId(input);
  const entryId = requiredText(input.relatedId, "Daily log entry id", 200);
  return executeProjectCommand({
    context,
    operation: "registerFieldPhoto",
    permission: "canManageFieldOperations",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "Document",
    beforeCreate: async (tx) => {
      const sql = tx.prisma?.$queryRawUnsafe?.bind(tx.prisma);
      if (!sql) throw new Error("Photo parent admission locking is unavailable");
      const [entry] = await sql('SELECT "dailyLog" AS "dailyLogId", project AS "projectId" FROM "DailyLogEntry" WHERE id = $1', entryId);
      if (!entry?.dailyLogId || entry.projectId !== id) throw new Error("Daily log entry not found in this project");
      await lockDraftDailyLog(tx, entry.dailyLogId, id);
      const linked = await sql('SELECT id FROM "DailyLogEntry" WHERE id = $1 AND "dailyLog" = $2 AND project = $3 FOR SHARE', entryId, entry.dailyLogId, id);
      if (linked.length !== 1) throw new Error("Photo parent changed; reload before linking");
    },
    data: {
      documentNumber: requiredText(input.reference, "Photo reference", 100),
      title: requiredText(input.title, "Photo caption", 300),
      documentType: "photo",
      description: input.description?.trim(),
      dailyLogEntries: { connect: [{ id: entryId }] },
      project: { connect: { id } }
    }
  });
}
async function recordLaborTime(_root, { input }, context) {
  const id = projectId(input);
  const budgetCodeId = requiredText(input.relatedId, "Budget code id", 200);
  const hours = decimalQuantity(input.quantity, "Hours");
  const cost = amount2(input.amountMinor, "Labor cost");
  return executeProjectCommand({
    context,
    operation: "recordLaborTime",
    permission: "canManageFieldOperations",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "LaborEntry",
    data: {
      workDate: optionalDate(input.occurredAt, "Work date") ?? /* @__PURE__ */ new Date(),
      workerName: requiredText(input.title, "Worker or crew", 200),
      laborType: input.type === "subcontractor" ? "subcontractor" : "employee",
      regularHours: hours,
      totalCostMinor: cost,
      notes: input.description?.trim(),
      budgetCode: { connect: { id: budgetCodeId } },
      ...input.partnerId ? { tradePartner: { connect: { id: input.partnerId } } } : {},
      project: { connect: { id } }
    }
  });
}
async function registerScheduleTask(_root, { input }, context) {
  const id = projectId(input);
  const scheduleId = requiredText(input.relatedId, "Schedule id", 200);
  return executeProjectCommand({
    context,
    operation: "registerScheduleTask",
    permission: "canManageProjectExecution",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "ScheduleTask",
    data: {
      taskCode: requiredText(input.reference, "Task code", 80),
      name: requiredText(input.title, "Task name", 300),
      description: input.description?.trim(),
      plannedStart: optionalDate(input.occurredAt, "Planned start"),
      plannedFinish: optionalDate(input.dueAt, "Planned finish"),
      schedule: { connect: { id: scheduleId } },
      ...input.userId ? { assignedTo: { connect: { id: input.userId } } } : {},
      project: { connect: { id } }
    }
  });
}
async function linkScheduleDependency(_root, { input }, context) {
  const id = projectId(input);
  const predecessorId = requiredText(input.relatedId, "Predecessor task id", 200);
  const successorId = requiredText(input.secondaryId, "Successor task id", 200);
  if (predecessorId === successorId) throw new Error("A schedule task cannot depend on itself");
  const [predecessor, successor] = await Promise.all([
    queryById(context, "ScheduleTask", predecessorId, "id schedule { id } project { id }"),
    queryById(context, "ScheduleTask", successorId, "id schedule { id } project { id }")
  ]);
  const predecessorScheduleId = predecessor?.schedule?.id;
  const successorScheduleId = successor?.schedule?.id;
  if (predecessor?.project?.id !== id || successor?.project?.id !== id || !predecessorScheduleId || predecessorScheduleId !== successorScheduleId) {
    throw new Error("Schedule dependency tasks must belong to the same project schedule");
  }
  const dependencyType = ["finish_to_start", "start_to_start", "finish_to_finish", "start_to_finish"].includes(String(input.type)) ? String(input.type) : "finish_to_start";
  const lagDays = Number(input.quantity || 0);
  if (!Number.isInteger(lagDays) || lagDays < -3650 || lagDays > 3650) throw new Error("Dependency lag must be a whole number of days from -3650 to 3650");
  return executeProjectCommand({
    context,
    operation: "linkScheduleDependency",
    permission: "canManageProjectExecution",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "ScheduleDependency",
    data: {
      dependencyType,
      lagDays,
      schedule: { connect: { id: predecessorScheduleId } },
      predecessor: { connect: { id: predecessorId } },
      successor: { connect: { id: successorId } },
      project: { connect: { id } }
    },
    beforeCreate: async (tx) => {
      if (!tx.prisma?.$queryRawUnsafe) throw new Error("Schedule dependency locking is unavailable");
      const [schedule] = await tx.prisma.$queryRawUnsafe(
        `SELECT id FROM "Schedule" WHERE id = $1 AND project = $2 FOR UPDATE`,
        predecessorScheduleId,
        id
      );
      if (!schedule) throw new Error("Schedule changed before dependency validation");
      const [duplicate] = await tx.prisma.$queryRawUnsafe(
        `SELECT EXISTS(SELECT 1 FROM "ScheduleDependency" WHERE schedule = $1 AND predecessor = $2 AND successor = $3) AS "duplicateExists"`,
        predecessorScheduleId,
        predecessorId,
        successorId
      );
      if (duplicate?.duplicateExists) throw new Error("This dependency already exists in the schedule");
      const [cycle] = await tx.prisma.$queryRawUnsafe(
        `WITH RECURSIVE reachable(id) AS (
           SELECT successor FROM "ScheduleDependency" WHERE schedule = $1 AND predecessor = $2
           UNION
           SELECT edge.successor FROM "ScheduleDependency" edge JOIN reachable path ON edge.predecessor = path.id
           WHERE edge.schedule = $1
         )
         SELECT EXISTS(SELECT 1 FROM reachable WHERE id = $3) AS "createsCycle"`,
        predecessorScheduleId,
        successorId,
        predecessorId
      );
      if (cycle?.createsCycle) throw new Error("Schedule dependencies must remain acyclic");
    }
  });
}
async function updateScheduleTaskProgress(_root, { input }, context) {
  const id = projectId(input);
  const taskId = requiredText(input.relatedId, "Schedule task id", 200);
  const percent = Number(input.quantity);
  if (!Number.isInteger(percent) || percent < 0 || percent > 100) throw new Error("Percent complete must be an integer from 0 to 100");
  const task = await queryById(context, "ScheduleTask", taskId, "id status percentComplete project { id }");
  if (task?.project?.id !== id) throw new Error("Schedule task not found in this project");
  if (task.status === "completed") throw new Error("Completed schedule progress is immutable; reopen through an approved correction process");
  return executeProjectCommand({
    context,
    operation: "updateScheduleTaskProgress",
    permission: "canManageProjectExecution",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "ScheduleTask",
    updateId: taskId,
    data: { percentComplete: percent },
    beforeCreate: async (tx) => {
      if (!tx.prisma?.$queryRawUnsafe) throw new Error("Schedule-task progress locking is unavailable");
      const [lockedTask] = await tx.prisma.$queryRawUnsafe(
        `SELECT status::text FROM "ScheduleTask" WHERE id = $1 AND project = $2 FOR UPDATE`,
        taskId,
        id
      );
      if (!lockedTask) throw new Error("Schedule task changed before progress was recorded");
      if (lockedTask.status === "completed") throw new Error("Completed schedule progress is immutable; reopen through an approved correction process");
      return { percentComplete: percent };
    }
  });
}
async function recordSafetyIncident(_root, { input }, context) {
  const id = projectId(input);
  const severity = ["low", "moderate", "serious", "critical", "fatal"].includes(String(input.type)) ? String(input.type) : null;
  if (!severity) throw new Error("Select the incident severity");
  const classification = incidentClassification(input.incidentType);
  return executeProjectCommand({
    context,
    operation: "recordSafetyIncident",
    permission: "canManageSafety",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "SafetyIncident",
    data: {
      incidentNumber: requiredText(input.reference, "Incident number", 80),
      title: requiredText(input.title, "Incident title", 240),
      description: requiredText(input.description, "Incident description", 1e4),
      severity,
      ...classification,
      occurredAt: optionalDate(input.occurredAt, "Occurred at") ?? /* @__PURE__ */ new Date(),
      reportedBy: { connect: { id: requireCommandSession(context).itemId } },
      investigator: input.userId ? { connect: { id: input.userId } } : { connect: { id: requireCommandSession(context).itemId } },
      project: { connect: { id } }
    }
  });
}
async function createInspectionWithItem(_root, { input }, context) {
  const id = projectId(input);
  return executeProjectCommand({
    context,
    operation: "createInspectionWithItem",
    permission: "canManageSafety",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "Inspection",
    data: {
      inspectionNumber: requiredText(input.reference, "Inspection number", 80),
      title: requiredText(input.title, "Inspection title", 240),
      description: input.description?.trim(),
      scheduledAt: optionalDate(input.dueAt, "Scheduled date"),
      inspector: { connect: { id: input.userId || requireCommandSession(context).itemId } },
      project: { connect: { id } }
    },
    afterCreate: async (tx, inspection) => {
      await requireCreate(tx.sudo(), "InspectionItem")({ data: {
        sequence: 1,
        prompt: requiredText(input.description || input.title, "Inspection requirement", 500),
        inspection: { connect: { id: inspection.id } },
        project: { connect: { id } }
      } });
    }
  });
}
async function recordInspectionItemResult(_root, { input }, context) {
  const id = projectId(input);
  const itemId = requiredText(input.relatedId, "Inspection item id", 200);
  const result = ["pass", "fail", "not_applicable"].includes(String(input.type)) ? String(input.type) : null;
  if (!result) throw new Error("Inspection result must be pass, fail, or not applicable");
  const item3 = await queryById(context, "InspectionItem", itemId, "id project { id }");
  if (item3?.project?.id !== id) throw new Error("Inspection item not found in this project");
  return executeProjectCommand({
    context,
    operation: "recordInspectionItemResult",
    permission: "canManageSafety",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "InspectionItem",
    updateId: itemId,
    data: { result, response: requiredText(input.description, "Inspection response", 1e4), completedAt: optionalDate(input.occurredAt, "Completion date") ?? /* @__PURE__ */ new Date() },
    beforeCreate: async (tx) => {
      if (!tx.prisma?.$queryRawUnsafe) throw new Error("Inspection evidence lock is unavailable");
      const [inspection] = await tx.prisma.$queryRawUnsafe(
        `SELECT inspection.project AS "projectId", inspection.status::text AS status
         FROM "InspectionItem" item JOIN "Inspection" inspection ON inspection.id = item.inspection
         WHERE item.id = $1 FOR UPDATE OF inspection`,
        itemId
      );
      if (inspection?.projectId !== id || inspection.status !== "in_progress") {
        throw new Error("Inspection results may be recorded only while the parent inspection is in progress");
      }
    }
  });
}
async function registerCorrectiveAction(_root, { input }, context) {
  const id = projectId(input);
  const sourceId = requiredText(input.relatedId, "Source finding id", 200);
  const sourceField = ["safetyIncident", "safetyObservation", "inspectionItem", "punchItem"].includes(String(input.type)) ? String(input.type) : null;
  if (!sourceField) throw new Error("Corrective action source type is invalid");
  return executeProjectCommand({
    context,
    operation: "registerCorrectiveAction",
    permission: "canManageSafety",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "CorrectiveAction",
    data: {
      actionNumber: requiredText(input.reference, "Action number", 80),
      title: requiredText(input.title, "Action title", 240),
      description: requiredText(input.description, "Corrective action", 1e4),
      dueAt: optionalDate(input.dueAt, "Due date"),
      assignedTo: { connect: { id: input.userId || requireCommandSession(context).itemId } },
      [sourceField]: { connect: { id: sourceId } },
      project: { connect: { id } }
    }
  });
}
async function recordCorrectiveActionEvidence(_root, { input }, context) {
  const id = projectId(input);
  const actionId = requiredText(input.relatedId, "Corrective action id", 200);
  const action = await queryById(context, "CorrectiveAction", actionId, "id project { id }");
  if (action?.project?.id !== id) throw new Error("Corrective action is not ready for completion evidence");
  return executeProjectCommand({
    context,
    operation: "recordCorrectiveActionEvidence",
    permission: "canManageSafety",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "CorrectiveAction",
    updateId: actionId,
    beforeCreate: async (tx) => {
      if (!tx.prisma?.$queryRawUnsafe) throw new Error("Corrective action evidence lock is unavailable");
      const [locked] = await tx.prisma.$queryRawUnsafe(
        'SELECT status::text AS status, project AS "projectId" FROM "CorrectiveAction" WHERE id = $1 FOR UPDATE',
        actionId
      );
      if (locked?.projectId !== id || !["in_progress", "ready_for_verification"].includes(locked.status)) {
        throw new Error("Corrective action is not ready for completion evidence");
      }
    },
    data: {
      completionNotes: requiredText(input.description, "Completion notes", 1e4),
      evidenceReference: requiredText(input.evidenceReference, "Evidence reference", 240),
      evidenceChecksumSha256: checksum(input.evidenceChecksumSha256),
      completedAt: optionalDate(input.occurredAt, "Completion date") ?? /* @__PURE__ */ new Date()
    }
  });
}
async function createProcurementRequestWithLine(_root, { input }, context) {
  const id = projectId(input);
  const budgetCodeId = requiredText(input.relatedId, "Budget code id", 200);
  const estimated = amount2(input.amountMinor, "Estimated amount");
  const quantity = decimalQuantity(input.quantity || "1");
  let price = null;
  return executeProjectCommand({
    context,
    operation: "createProcurementRequestWithLine",
    permission: "canManageContracts",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "ProcurementRequest",
    beforeCreate: async () => {
      price = priceLineFromTotal(estimated, quantity);
    },
    data: {
      requestNumber: requiredText(input.reference, "Request number", 100),
      title: requiredText(input.title, "Request title", 240),
      description: input.description?.trim(),
      neededBy: optionalDate(input.dueAt, "Needed-by date"),
      totalEstimatedMinor: estimated,
      requestedBy: { connect: { id: requireCommandSession(context).itemId } },
      ...input.partnerId ? { tradePartner: { connect: { id: input.partnerId } } } : {},
      project: { connect: { id } }
    },
    afterCreate: async (tx, request) => {
      if (!price) throw new Error("Procurement pricing admission is unavailable");
      await requireCreate(tx.sudo(), "ProcurementRequestLine")({ data: {
        lineNumber: 1,
        description: requiredText(input.description || input.title, "Requested item", 500),
        quantity: price.quantity,
        unit: input.unit?.trim() || "EA",
        estimatedUnitCostMinor: price.unitPriceMinor,
        estimatedAmountMinor: price.amountMinor,
        request: { connect: { id: request.id } },
        budgetCode: { connect: { id: budgetCodeId } },
        project: { connect: { id } }
      } });
    }
  });
}
async function placeProcurementOrder(_root, { input }, context) {
  const id = projectId(input);
  const requestId = requiredText(input.relatedId, "Procurement request id", 200);
  const request = await queryById(context, "ProcurementRequest", requestId, `
    id status totalEstimatedMinor tradePartner { id } commitment { id }
    lines(take: 200, orderBy: { lineNumber: asc }) { id lineNumber description estimatedAmountMinor budgetCode { id } }
    project { id }
  `);
  let lines = Array.isArray(request?.lines) ? request.lines : [];
  const partnerId = input.partnerId || request?.tradePartner?.id;
  if (request?.project?.id !== id || !partnerId || lines.length === 0) {
    throw new Error("Approved procurement request, vendor, and request lines are required");
  }
  const total2 = lines.reduce((sum2, line) => sum2 + BigInt(String(line.estimatedAmountMinor ?? 0)), BigInt(0));
  const admissionError = request.status !== "approved" ? "Approved procurement request, vendor, and request lines are required" : total2 <= BigInt(0) || total2 !== BigInt(String(request.totalEstimatedMinor ?? 0)) ? "Procurement request header and line totals must match before ordering" : null;
  return executeProjectCommand({
    context,
    operation: "placeProcurementOrder",
    permission: "canManageContracts",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "Commitment",
    beforeAdmission: async () => {
      if (admissionError) throw new Error(admissionError);
    },
    data: {
      number: requiredText(input.reference, "Purchase order number", 80),
      title: requiredText(input.title, "Purchase order title", 240),
      description: input.description?.trim(),
      commitmentType: "purchase_order",
      status: "draft",
      originalContractMinor: total2.toString(),
      revisedContractMinor: total2.toString(),
      tradePartner: { connect: { id: partnerId } },
      contractManager: { connect: { id: requireCommandSession(context).itemId } },
      project: { connect: { id } }
    },
    beforeCreate: async (tx) => {
      if (!tx.prisma?.$queryRawUnsafe) throw new Error("Procurement request conversion lock is unavailable");
      const [lockedRequest] = await tx.prisma.$queryRawUnsafe(
        `SELECT status::text AS status, project AS "projectId", commitment AS "commitmentId",
                "tradePartner" AS "partnerId", "totalEstimatedMinor"
         FROM "ProcurementRequest" WHERE id = $1 FOR UPDATE`,
        requestId
      );
      if (!lockedRequest || lockedRequest.projectId !== id || lockedRequest.status !== "approved" || lockedRequest.commitmentId) {
        throw new Error("This procurement request is no longer eligible for one-time order conversion");
      }
      if (lockedRequest.partnerId && lockedRequest.partnerId !== partnerId) {
        throw new Error("Purchase order vendor must match the approved request vendor");
      }
      const lockedLines = await tx.prisma.$queryRawUnsafe(
        `SELECT id, "lineNumber", description, "estimatedAmountMinor", "budgetCode" AS "budgetCodeId"
         FROM "ProcurementRequestLine" WHERE request = $1 ORDER BY "lineNumber" ASC FOR UPDATE`,
        requestId
      );
      const lockedTotal = lockedLines.reduce((sum2, line) => sum2 + BigInt(line.estimatedAmountMinor), BigInt(0));
      if (lockedLines.length === 0 || lockedTotal <= BigInt(0) || lockedTotal !== lockedRequest.totalEstimatedMinor || lockedTotal !== total2) {
        throw new Error("Approved request header and locked line totals must match before ordering");
      }
      lines = lockedLines;
    },
    afterCreate: async (tx, commitment) => {
      if (!tx.prisma?.$queryRawUnsafe || !tx.prisma.budgetLineItem?.update || !tx.prisma.budget?.update) throw new Error("Procurement budget rollup is unavailable");
      for (const line of lines) {
        const budgetCodeId = line.budgetCode?.id ?? (line.budgetCodeId ? String(line.budgetCodeId) : null);
        const lineAmount = BigInt(String(line.estimatedAmountMinor ?? 0));
        if (!budgetCodeId || lineAmount <= BigInt(0)) throw new Error("Every procurement line requires a positive amount and budget code");
        await requireCreate(tx.sudo(), "ContractLineItem")({ data: {
          lineNumber: Number(line.lineNumber ?? 1),
          description: requiredText(line.description, "Procurement line description", 500),
          scheduledValueMinor: lineAmount.toString(),
          revisedValueMinor: lineAmount.toString(),
          commitment: { connect: { id: commitment.id } },
          budgetCode: { connect: { id: budgetCodeId } },
          project: { connect: { id } }
        } });
        const [budgetLine] = await tx.prisma.$queryRawUnsafe(
          `SELECT line.id, line.budget AS "budgetId" FROM "BudgetLineItem" line JOIN "Budget" budget ON budget.id = line.budget
           WHERE line.project = $1 AND line."budgetCode" = $2 AND budget.status = 'active' ORDER BY line."createdAt" ASC LIMIT 1 FOR UPDATE OF line, budget`,
          id,
          budgetCodeId
        );
        if (!budgetLine) throw new Error("Procurement order requires a matching active budget line");
        await tx.prisma.budgetLineItem.update({ where: { id: budgetLine.id }, data: {
          committedAmountMinor: { increment: lineAmount },
          projectedFinalCostMinor: { increment: lineAmount },
          projectedOverUnderMinor: { decrement: lineAmount }
        } });
        await tx.prisma.budget.update({ where: { id: budgetLine.budgetId }, data: { totalCommittedMinor: { increment: lineAmount } } });
      }
      await requireUpdate(tx.sudo(), "ProcurementRequest")({ where: { id: requestId }, data: {
        status: "ordered",
        orderedAt: /* @__PURE__ */ new Date(),
        commitment: { connect: { id: commitment.id } },
        tradePartner: { connect: { id: partnerId } }
      } });
    }
  });
}
async function recordMaterialReceipt(_root, { input }, context) {
  const id = projectId(input);
  const requestId = requiredText(input.relatedId, "Procurement request id", 200);
  const requestLineId = requiredText(input.secondaryId, "Procurement line id", 200);
  const evidenceReference = requiredText(input.evidenceReference, "Packing slip/evidence reference", 160);
  const evidenceHash = checksum(input.evidenceChecksumSha256);
  const received = decimalQuantity(input.quantity, "Received quantity");
  const accepted = input.type === "rejected" ? "0" : received;
  const rejected = input.type === "rejected" ? received : "0";
  const request = await queryById(context, "ProcurementRequest", requestId, "id status tradePartner { id } commitment { id } project { id }");
  const requestPartnerId = request?.tradePartner?.id ?? null;
  if (request?.project?.id !== id) throw new Error("Receiving requires an ordered request linked to its purchase order");
  if (input.partnerId && input.partnerId !== requestPartnerId) throw new Error("Receipt vendor must match the approved procurement request");
  const receivable = ["ordered", "partially_received"].includes(String(request.status)) && Boolean(request.commitment?.id);
  return executeProjectCommand({
    context,
    operation: "recordMaterialReceipt",
    permission: "canManageContracts",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "MaterialReceipt",
    beforeAdmission: async () => {
      if (!receivable) throw new Error("Receiving requires an ordered request linked to its purchase order");
    },
    data: {},
    beforeCreate: async (tx) => {
      if (!tx.prisma?.$queryRawUnsafe) throw new Error("Receipt quantity lock is unavailable");
      const [locked] = await tx.prisma.$queryRawUnsafe(
        `SELECT request.id AS "requestId", request.project AS "projectId", request.status::text AS "requestStatus",
                request.commitment AS "commitmentId", request."tradePartner" AS "partnerId", line.quantity::text AS "orderedQuantity"
         FROM "ProcurementRequestLine" line JOIN "ProcurementRequest" request ON request.id = line.request
         WHERE line.id = $1 FOR UPDATE OF request, line`,
        requestLineId
      );
      if (!locked || locked.requestId !== requestId || locked.projectId !== id || !["ordered", "partially_received"].includes(locked.requestStatus) || !locked.commitmentId) {
        throw new Error("Receipt line must belong to this ordered request and purchase order");
      }
      if (input.partnerId && locked.partnerId !== input.partnerId) throw new Error("Receipt vendor no longer matches the request vendor");
      const [totals] = await tx.prisma.$queryRawUnsafe(
        `SELECT COALESCE(SUM(receiptLine."quantityAccepted"), 0)::text AS accepted,
                COALESCE(SUM(receiptLine."quantityReceived"), 0)::text AS received
         FROM "MaterialReceiptLine" receiptLine JOIN "MaterialReceipt" receipt ON receipt.id = receiptLine.receipt
         WHERE receiptLine."requestLine" = $1 AND receipt.status <> 'voided'`,
        requestLineId
      );
      const acceptedUnits = quantityToUnits(String(totals?.accepted ?? "0"));
      const receivedUnits = quantityToUnits(String(totals?.received ?? "0"));
      const orderedUnits = quantityToUnits(locked.orderedQuantity);
      if (!receiptCapacityIsValid({
        orderedUnits,
        receivedToDateUnits: receivedUnits,
        acceptedToDateUnits: acceptedUnits,
        additionalReceivedUnits: quantityToUnits(received),
        additionalAcceptedUnits: quantityToUnits(accepted)
      })) {
        throw new Error("This delivery exceeds the quantity still outstanding on the order line");
      }
      return {
        receiptNumber: requiredText(input.reference, "Receipt number", 100),
        status: input.type === "rejected" ? "rejected" : "recorded",
        receivedAt: optionalDate(input.occurredAt, "Received date") ?? /* @__PURE__ */ new Date(),
        packingSlipReference: evidenceReference,
        evidenceFileName: requiredText(input.title, "Evidence file name", 240),
        evidenceStorageKey: `external:${evidenceReference}`,
        evidenceChecksumSha256: evidenceHash,
        notes: input.description?.trim(),
        request: { connect: { id: requestId } },
        commitment: { connect: { id: locked.commitmentId } },
        ...locked.partnerId ? { tradePartner: { connect: { id: locked.partnerId } } } : {},
        receivedBy: { connect: { id: requireCommandSession(context).itemId } },
        project: { connect: { id } }
      };
    },
    afterCreate: async (tx, receipt) => {
      await requireCreate(tx.sudo(), "MaterialReceiptLine")({ data: {
        lineNumber: 1,
        quantityReceived: received,
        quantityAccepted: accepted,
        quantityRejected: rejected,
        exceptionReason: input.type === "rejected" ? requiredText(input.description, "Rejection reason", 2e3) : void 0,
        receipt: { connect: { id: receipt.id } },
        requestLine: { connect: { id: requestLineId } },
        project: { connect: { id } }
      } });
    }
  });
}
async function recordLienWaiverEvidence(_root, { input }, context) {
  const id = projectId(input);
  const commitmentId = requiredText(input.relatedId, "Commitment id", 200);
  const partnerId = requiredText(input.partnerId, "Trade partner id", 200);
  const evidenceReference = requiredText(input.evidenceReference, "External evidence reference", 160);
  return executeProjectCommand({
    context,
    operation: "recordLienWaiverEvidence",
    permission: "canManageBilling",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "LienWaiver",
    data: {
      waiverNumber: requiredText(input.reference, "Waiver number", 100),
      waiverType: input.type || "conditional_progress",
      status: "received",
      throughDate: optionalDate(input.dueAt, "Through date") ?? /* @__PURE__ */ new Date(),
      amountMinor: amount2(input.amountMinor, "Waiver amount"),
      requestedAt: /* @__PURE__ */ new Date(),
      receivedAt: /* @__PURE__ */ new Date(),
      signedAt: optionalDate(input.occurredAt, "Signed date") ?? /* @__PURE__ */ new Date(),
      signerName: requiredText(input.title, "Signer name", 200),
      fileName: `${evidenceReference}.external`,
      storageKey: `external:${evidenceReference}`,
      checksumSha256: checksum(input.evidenceChecksumSha256),
      tradePartner: { connect: { id: partnerId } },
      commitment: { connect: { id: commitmentId } },
      reviewedBy: { connect: { id: requireCommandSession(context).itemId } },
      project: { connect: { id } }
    }
  });
}
async function requestRetainageRelease(_root, { input }, context) {
  const id = projectId(input);
  const claimId = requiredText(input.relatedId, "Progress claim id", 200);
  const paymentId = requiredText(input.secondaryId, "Covering settled payment id", 200);
  const releaseAmount = amount2(input.amountMinor, "Retainage amount", true);
  return executeProjectCommand({
    context,
    operation: "requestRetainageRelease",
    permission: "canManageBilling",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "RetainageRelease",
    data: {},
    beforeCreate: async (tx) => {
      if (!tx.prisma?.$queryRawUnsafe) throw new Error("Retainage capacity lock is unavailable");
      const [payment] = await tx.prisma.$queryRawUnsafe(
        `SELECT status::text, "amountMinor", project AS "projectId", direction::text AS direction,
                "currencyCode", "tradePartner" AS "partnerId"
         FROM "Payment" WHERE id = $1 FOR UPDATE`,
        paymentId
      );
      const [claim] = await tx.prisma.$queryRawUnsafe(
        `SELECT status::text, "retainageMinor", project AS "projectId", "claimType"::text AS "claimType",
                "currencyCode", "tradePartner" AS "partnerId"
         FROM "ProgressClaim" WHERE id = $1 FOR UPDATE`,
        claimId
      );
      if (!payment || payment.status !== "settled" || payment.projectId !== id || !claim || claim.projectId !== id || !["approved", "partially_paid", "paid", "closed"].includes(claim.status)) {
        throw new Error("Retainage requires an approved claim and a settled payment in the same project");
      }
      assertSettlementCompatibility({
        claimSide: claim.claimType === "owner" ? "owner" : "commitment",
        claimPartnerId: claim.partnerId,
        claimCurrencyCode: claim.currencyCode,
        paymentDirection: payment.direction,
        paymentPartnerId: payment.partnerId,
        paymentCurrencyCode: payment.currencyCode
      });
      const [claimReserved] = await tx.prisma.$queryRawUnsafe(
        `SELECT COALESCE(SUM("amountMinor"), 0)::bigint AS total FROM "RetainageRelease"
         WHERE "progressClaim" = $1 AND status IN ('requested', 'approved', 'released')`,
        claimId
      );
      const [paymentAllocated] = await tx.prisma.$queryRawUnsafe(
        `SELECT COALESCE(SUM(allocation."amountMinor"), 0)::bigint AS total
         FROM "PaymentAllocation" allocation JOIN "Payment" p ON p.id = allocation.payment
         WHERE allocation.payment = $1 AND p.status = 'settled'`,
        paymentId
      );
      const [paymentReserved] = await tx.prisma.$queryRawUnsafe(
        `SELECT COALESCE(SUM("amountMinor"), 0)::bigint AS total FROM "RetainageRelease"
         WHERE payment = $1 AND status IN ('requested', 'approved', 'released')`,
        paymentId
      );
      const requested = BigInt(releaseAmount);
      if (requested > remainingCapacityMinor(claim.retainageMinor, claimReserved?.total ?? BigInt(0))) {
        throw new Error("Retainage release exceeds the claim's remaining held retainage");
      }
      if (requested > remainingCapacityMinor(payment.amountMinor, (paymentAllocated?.total ?? BigInt(0)) + (paymentReserved?.total ?? BigInt(0)))) {
        throw new Error("Retainage release exceeds the payment's unallocated settlement capacity");
      }
      return {
        releaseNumber: requiredText(input.reference, "Release number", 100),
        status: "requested",
        amountMinor: releaseAmount,
        currencyCode: claim.currencyCode,
        reason: requiredText(input.description, "Release reason", 2e3),
        progressClaim: { connect: { id: claimId } },
        payment: { connect: { id: paymentId } },
        project: { connect: { id } }
      };
    }
  });
}
async function registerDrawing(_root, { input }, context) {
  const id = projectId(input);
  return executeProjectCommand({
    context,
    operation: "registerDrawing",
    permission: "canManageDocuments",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "Drawing",
    data: { drawingNumber: requiredText(input.reference, "Drawing number", 100), title: requiredText(input.title, "Drawing title", 300), discipline: input.description?.trim(), project: { connect: { id } } }
  });
}
async function registerSchedule(_root, { input }, context) {
  const id = projectId(input);
  return executeProjectCommand({
    context,
    operation: "registerSchedule",
    permission: "canManageProjectExecution",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "Schedule",
    data: { name: requiredText(input.title, "Schedule name", 240), scheduleType: input.type || "current", status: "draft", dataDate: optionalDate(input.occurredAt, "Data date"), project: { connect: { id } } }
  });
}
async function createResourceCatalogItem(_root, { input }, context) {
  const id = projectId(input);
  const { companyId } = await projectCompany(context, id);
  const equipment = input.type === "equipment";
  return executeProjectCommand({
    context,
    operation: "createResourceCatalogItem",
    permission: "canManageFieldOperations",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: equipment ? "Equipment" : "Material",
    data: equipment ? {
      equipmentNumber: requiredText(input.reference, "Equipment number", 100),
      name: requiredText(input.title, "Equipment name", 240),
      description: input.description?.trim(),
      status: "available",
      company: { connect: { id: companyId } }
    } : {
      sku: requiredText(input.reference, "Material SKU", 100),
      name: requiredText(input.title, "Material name", 240),
      description: input.description?.trim(),
      unit: requiredText(input.unit, "Material unit", 40),
      isActive: "active",
      company: { connect: { id: companyId } }
    }
  });
}
async function recordResourceActivity(_root, { input }, context) {
  const id = projectId(input);
  const fact = validateResourceFact(input.type, input.reference, input.quantity, input.unit);
  const resourceId = requiredText(input.relatedId, `${fact.resourceType} id`, 200);
  const occurredAt = validateResourceOccurrence(input.occurredAt);
  const actor2 = requireCommandSession(context);
  const authority = await resourceAuthority(context, id, true);
  const actorId = actor2.itemId;
  const principalId = actor2.authType === "api_key" ? `api:${actor2.apiCredential?.id ?? ""}` : "human";
  if (input.intentVersion != null && (input.intentVersion !== 2 || input.intentActorId !== actor2.itemId || input.intentPrincipalId !== principalId || input.intentCompanyId !== authority.companyId || !input.intentCurrencyCode)) throw new Error("Original resource intent does not match the current actor/purpose/company/project");
  if (input.intentVersion === 2) decodeResourceIntent(encodeResourceIntent({ scope: { version: 2, purpose: "recordResourceActivity", actorId, principalId, companyId: authority.companyId, projectId: id, currencyCode: input.intentCurrencyCode }, input }));
  const totalCostMinor = input.amountMinor ? amount2(input.amountMinor, "Resource cost") : "0";
  const authorizeOriginal = async (tx) => {
    const next = await resourceAuthority(tx, id, true);
    const nextPrincipal = next.session.authType === "api_key" ? `api:${next.session.apiCredential?.id ?? ""}` : "human";
    if (next.companyId !== authority.companyId || next.session.itemId !== actorId || nextPrincipal !== principalId) throw new Error("Original resource recovery scope changed; not authorized");
    return next;
  };
  return executeProjectCommand({
    context,
    operation: "recordResourceActivity",
    permission: "canManageFieldOperations",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: { ...input, actorId: actor2.itemId, principalId: actor2.authType === "api_key" ? `api:${actor2.apiCredential?.id ?? ""}` : "human" },
    listKey: "ResourceLog",
    data: {},
    beforeReplay: async (tx) => {
      await authorizeOriginal(tx);
    },
    beforeAdmission: async (tx) => {
      const current = await authorizeOriginal(tx);
      if (input.intentVersion === 2 && input.intentCurrencyCode !== current.currencyCode) throw new Error("Original currency changed; reconcile before NEW admission");
      if (current.currencyCode !== "USD" && totalCostMinor !== "0") throw new Error("Resource monetary recording requires a USD project until currency propagation is verified");
    },
    beforeCreate: async (tx) => {
      const current = await authorizeOriginal(tx);
      if (current.companyId !== authority.companyId || current.currencyCode !== authority.currencyCode || input.intentVersion === 2 && input.intentCurrencyCode !== current.currencyCode) throw new Error("Project scope or currency changed; reconcile the original intent before NEW admission");
      if (current.currencyCode !== "USD" && totalCostMinor !== "0") throw new Error("Resource monetary recording requires a USD project until currency propagation is verified");
      const resource = await queryById(
        tx,
        fact.resourceType === "equipment" ? "Equipment" : "Material",
        resourceId,
        fact.resourceType === "equipment" ? "id status company { id }" : "id isActive company { id }"
      );
      if (resource?.company?.id !== current.companyId || (fact.resourceType === "equipment" ? resource.status === "retired" : resource.isActive !== "active")) {
        throw new Error("Resource is unavailable in this company");
      }
      if (input.secondaryId) {
        const code = await queryById(tx, "BudgetCode", input.secondaryId, "id company { id } project { id }");
        if (code?.company?.id !== current.companyId || code?.project?.id !== id) throw new Error("Budget code is unavailable in this project");
      }
      return {
        ...fact,
        occurredAt,
        totalCostMinor,
        currencyCode: current.currencyCode,
        notes: input.description ? requiredText(input.description, "Resource notes", 4e3) : "",
        [fact.resourceType]: { connect: { id: resourceId } },
        ...input.secondaryId ? { budgetCode: { connect: { id: input.secondaryId } } } : {},
        operator: { connect: { id: actorId } },
        project: { connect: { id } }
      };
    }
  });
}
async function inviteProjectMember(_root, { input }, context) {
  const id = projectId(input);
  const roleId = requiredText(input.roleId, "Membership role id", 200);
  const email = requiredText(input.reference, "Invitee email", 320).toLowerCase();
  const name = requiredText(input.title, "Invitee name", 200);
  const accessLevel = ["viewer", "contributor", "manager"].includes(String(input.type)) ? String(input.type) : "viewer";
  const requestedPortalType = ["internal", "owner", "designer", "subcontractor", "vendor"].includes(String(input.unit)) ? String(input.unit) : "internal";
  if (requestedPortalType === "internal" === Boolean(input.partnerId)) {
    throw new Error("Internal members cannot have a portal organization, and external members require one");
  }
  const portalType = requestedPortalType;
  const { companyId } = await projectCompany(context, id);
  if (input.partnerId) {
    const partner = await queryById(context, "TradePartner", input.partnerId, "id partnerType company { id }");
    if (partner?.company?.id !== companyId || partner.partnerType !== portalType) {
      throw new Error("Portal organization must belong to the company and match the selected portal type");
    }
  }
  const activationToken = `ofc_inv_${(0, import_node_crypto17.randomBytes)(32).toString("base64url")}`;
  const tokenHash = (0, import_node_crypto17.createHash)("sha256").update(activationToken).digest("hex");
  let inviteeUserId = "";
  let accountSetupRequired = false;
  const result = await executeProjectCommand({
    context,
    operation: "inviteProjectMember",
    permission: "canManagePeople",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "ProjectMembership",
    data: {},
    beforeCreate: async (tx) => {
      const sudo = tx.sudo();
      const role = await sudo.query.Role.findOne({ where: { id: roleId }, query: "id name canAccessDashboard canManageCompanies canManagePeople canManageAgents canManageOnboarding company { id }" });
      if (role?.company?.id !== companyId) throw new Error("Membership role must belong to the project company");
      if (portalType !== "internal" && [role.canAccessDashboard, role.canManageCompanies, role.canManagePeople, role.canManageAgents, role.canManageOnboarding].some(Boolean)) {
        throw new Error("External participants require a portal-safe role without internal administration authority");
      }
      const users = await sudo.query.User.findMany({ where: { email: { equals: email } }, take: 1, query: "id isActive authSessionsCount" });
      let userId = String(users[0]?.id ?? "");
      if (!userId) {
        accountSetupRequired = true;
        const user = await requireCreate(sudo, "User")({ data: {
          name,
          email,
          password: (0, import_node_crypto17.randomBytes)(32).toString("base64url"),
          isActive: false,
          onboardingStatus: "not_started"
        } });
        userId = user.id;
      } else if (users[0]?.isActive !== true && Number(users[0]?.authSessionsCount ?? 0) === 0) {
        accountSetupRequired = true;
      }
      inviteeUserId = userId;
      const [existingMembership] = await sudo.query.ProjectMembership.findMany({
        where: { membershipKey: { equals: `${id}:${userId}` } },
        take: 1,
        query: "id status"
      });
      if (existingMembership?.status === "active") throw new Error("This person is already an active member of the project");
      if (existingMembership?.status === "invited") throw new Error("This person already has a pending invitation; resend it instead");
      if (existingMembership?.id) {
        await requireUpdate(sudo, "ProjectMembership")({ where: { id: String(existingMembership.id) }, data: {
          membershipKey: `${id}:${userId}:retired:${existingMembership.id}`
        } });
      }
      const companyMemberships = await sudo.query.CompanyMembership.findMany({
        where: { membershipKey: { equals: `${companyId}:${userId}` } },
        take: 1,
        query: "id status"
      });
      const companyMembership = companyMemberships[0];
      if (companyMembership?.id && !["active", "invited"].includes(String(companyMembership.status))) {
        if (!hasCompanyPermission(requireCommandSession(tx), companyId, "canManagePeople")) {
          throw new Error("This person's company access is suspended; a company administrator must restore it");
        }
        await requireUpdate(sudo, "CompanyMembership")({ where: { id: String(companyMembership.id) }, data: { status: "invited" } });
      }
      if (!companyMembership?.id) {
        await requireCreate(sudo, "CompanyMembership")({ data: {
          membershipKey: `${companyId}:${userId}`,
          status: "invited",
          canAccessAllProjects: false,
          role: { connect: { id: roleId } },
          invitedBy: { connect: { id: requireCommandSession(context).itemId } },
          company: { connect: { id: companyId } },
          user: { connect: { id: userId } }
        } });
      }
      return {
        membershipKey: `${id}:${userId}`,
        status: "invited",
        accessLevel,
        portalType,
        role: { connect: { id: roleId } },
        ...input.partnerId ? { portalOrganization: { connect: { id: input.partnerId } } } : {},
        project: { connect: { id } },
        user: { connect: { id: userId } }
      };
    },
    afterCreate: async (tx, membership) => {
      if (!inviteeUserId) throw new Error("Invitee identity is unavailable");
      await requireCreate(tx.sudo(), "AccountInvitation")({ data: {
        tokenHash,
        tokenPrefix: activationToken.slice(0, 16),
        email,
        status: "pending",
        accountSetupRequired,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3),
        invitedBy: { connect: { id: requireCommandSession(context).itemId } },
        user: { connect: { id: inviteeUserId } },
        projectMembership: { connect: { id: membership.id } },
        project: { connect: { id } }
      } });
    }
  });
  return { ...result, activationToken: result.replayed ? null : activationToken };
}
async function reverseSettledPayment(_root, { input }, context) {
  const id = projectId(input);
  const paymentId = requiredText(input.relatedId, "Payment id", 200);
  let amountMinor = "0";
  let allocations = [];
  return executeProjectCommand({
    context,
    operation: "reverseSettledPayment",
    permission: "canManageBilling",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "Payment",
    updateId: paymentId,
    data: {},
    beforeCreate: async (tx) => {
      if (!tx.prisma?.$queryRawUnsafe) throw new Error("Transactional payment reversal lock is unavailable");
      const [payment] = await tx.prisma.$queryRawUnsafe(
        `SELECT status::text, "amountMinor", project AS "projectId" FROM "Payment" WHERE id = $1 FOR UPDATE`,
        paymentId
      );
      if (!payment || payment.projectId !== id || payment.status !== "settled") throw new Error("Only a settled project payment can be reversed");
      const [retainage] = await tx.prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::bigint AS count FROM "RetainageRelease" WHERE payment = $1 AND status = 'released'`,
        paymentId
      );
      if ((retainage?.count ?? BigInt(0)) > BigInt(0)) throw new Error("Reverse released retainage through a reviewed accounting correction before reversing this payment");
      allocations = await tx.prisma.$queryRawUnsafe(
        `SELECT id, "amountMinor", "progressClaim" AS "claimId" FROM "PaymentAllocation" WHERE payment = $1 ORDER BY "progressClaim" FOR UPDATE`,
        paymentId
      );
      for (const claimId of [...new Set(allocations.map((entry) => entry.claimId))].sort()) {
        await tx.prisma.$queryRawUnsafe(`SELECT id FROM "ProgressClaim" WHERE id = $1 FOR UPDATE`, claimId);
      }
      amountMinor = payment.amountMinor.toString();
      return { status: "reversed" };
    },
    afterCreate: async (tx) => {
      const sudo = tx.sudo();
      await requireCreate(sudo, "PaymentReversal")({ data: {
        reversalNumber: requiredText(input.reference, "Reversal number", 100),
        amountMinor,
        reason: requiredText(input.description, "Reversal reason", 2e3),
        externalReference: requiredText(input.title, "External reversal reference", 200),
        effectiveAt: optionalDate(input.occurredAt, "Reversal effective date") ?? /* @__PURE__ */ new Date(),
        allocationSnapshot: JSON.stringify(allocations.map((entry) => ({ allocationId: entry.id, claimId: entry.claimId, amountMinor: entry.amountMinor.toString() }))),
        payment: { connect: { id: paymentId } },
        reversedBy: { connect: { id: requireCommandSession(context).itemId } },
        project: { connect: { id } }
      } });
      if (!tx.prisma?.$queryRawUnsafe || !tx.prisma.$executeRawUnsafe || !tx.prisma.progressClaim?.update) throw new Error("Claim correction client is unavailable");
      for (const claimId of [...new Set(allocations.map((entry) => entry.claimId))]) {
        const [totals] = await tx.prisma.$queryRawUnsafe(
          `SELECT COALESCE(SUM(allocation."amountMinor") FILTER (WHERE payment.status = 'settled'), 0)::bigint AS allocated,
                  claim."currentPaymentDueMinor" AS due
           FROM "ProgressClaim" claim
           LEFT JOIN "PaymentAllocation" allocation ON allocation."progressClaim" = claim.id
           LEFT JOIN "Payment" payment ON payment.id = allocation.payment
           WHERE claim.id = $1 GROUP BY claim.id`,
          claimId
        );
        if (!totals) throw new Error("Reversed claim settlement total is unavailable");
        const status2 = deriveClaimPaymentStatus(totals.due, totals.allocated);
        await tx.prisma.progressClaim.update({ where: { id: claimId }, data: { status: status2 } });
        const [parent] = await tx.prisma.$queryRawUnsafe(
          `SELECT commitment AS "commitmentId", "primeContract" AS "primeContractId" FROM "ProgressClaim" WHERE id = $1`,
          claimId
        );
        if (parent?.commitmentId) {
          await tx.prisma.$executeRawUnsafe(
            `UPDATE "Commitment" SET "paidToDateMinor" = (
              SELECT COALESCE(SUM(allocation."amountMinor"), 0)::bigint FROM "PaymentAllocation" allocation
              JOIN "Payment" payment ON payment.id = allocation.payment JOIN "ProgressClaim" claim ON claim.id = allocation."progressClaim"
              WHERE claim.commitment = $1 AND payment.status = 'settled'
            ) WHERE id = $1`,
            parent.commitmentId
          );
        } else if (parent?.primeContractId) {
          await tx.prisma.$executeRawUnsafe(
            `UPDATE "PrimeContract" SET "paidToDateMinor" = (
              SELECT COALESCE(SUM(allocation."amountMinor"), 0)::bigint FROM "PaymentAllocation" allocation
              JOIN "Payment" payment ON payment.id = allocation.payment JOIN "ProgressClaim" claim ON claim.id = allocation."progressClaim"
              WHERE claim."primeContract" = $1 AND payment.status = 'settled'
            ) WHERE id = $1`,
            parent.primeContractId
          );
        }
      }
    }
  });
}
async function allocateSettledPayment(_root, { input }, context) {
  const id = projectId(input);
  const paymentId = requiredText(input.relatedId, "Settled payment id", 200);
  const claimId = requiredText(input.secondaryId, "Progress claim id", 200);
  const allocation = amount2(input.amountMinor, "Allocation amount", true);
  return executeProjectCommand({
    context,
    operation: "allocateSettledPayment",
    permission: "canManageBilling",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "PaymentAllocation",
    data: {},
    beforeCreate: async (tx) => {
      if (!tx.prisma?.$queryRawUnsafe) throw new Error("Transactional settlement allocation is unavailable");
      const [payment] = await tx.prisma.$queryRawUnsafe(
        `SELECT status::text, "amountMinor", project AS "projectId", direction::text AS direction,
                "currencyCode", "tradePartner" AS "partnerId"
         FROM "Payment" WHERE id = $1 FOR UPDATE`,
        paymentId
      );
      const [claim] = await tx.prisma.$queryRawUnsafe(
        `SELECT status::text, "currentPaymentDueMinor", project AS "projectId", "claimType"::text AS "claimType",
                "currencyCode", "tradePartner" AS "partnerId"
         FROM "ProgressClaim" WHERE id = $1 FOR UPDATE`,
        claimId
      );
      if (!payment || payment.status !== "settled" || payment.projectId !== id) throw new Error("Only a settled payment in this project can be allocated");
      if (!claim || !["approved", "partially_paid"].includes(claim.status) || claim.projectId !== id) throw new Error("Claim is not eligible for allocation");
      assertSettlementCompatibility({
        claimSide: claim.claimType === "owner" ? "owner" : "commitment",
        claimPartnerId: claim.partnerId,
        claimCurrencyCode: claim.currencyCode,
        paymentDirection: payment.direction,
        paymentPartnerId: payment.partnerId,
        paymentCurrencyCode: payment.currencyCode
      });
      const [paymentTotal] = await tx.prisma.$queryRawUnsafe(
        `SELECT COALESCE(SUM(allocation."amountMinor"), 0)::bigint AS total
         FROM "PaymentAllocation" allocation JOIN "Payment" payment ON payment.id = allocation.payment
         WHERE allocation.payment = $1 AND payment.status = 'settled'`,
        paymentId
      );
      const [claimTotal] = await tx.prisma.$queryRawUnsafe(
        `SELECT COALESCE(SUM(allocation."amountMinor"), 0)::bigint AS total
         FROM "PaymentAllocation" allocation JOIN "Payment" payment ON payment.id = allocation.payment
         WHERE allocation."progressClaim" = $1 AND payment.status = 'settled'`,
        claimId
      );
      const [reservedRetainage] = await tx.prisma.$queryRawUnsafe(
        `SELECT COALESCE(SUM("amountMinor"), 0)::bigint AS total FROM "RetainageRelease"
         WHERE payment = $1 AND status IN ('requested', 'approved', 'released')`,
        paymentId
      );
      const paymentUsed = (paymentTotal?.total ?? BigInt(0)) + (reservedRetainage?.total ?? BigInt(0));
      const claimUsed = claimTotal?.total ?? BigInt(0);
      if (BigInt(allocation) > remainingCapacityMinor(payment.amountMinor, paymentUsed)) {
        throw new Error("Allocation exceeds settled payment capacity reserved for claims and retainage");
      }
      if (BigInt(allocation) > remainingCapacityMinor(claim.currentPaymentDueMinor, claimUsed)) {
        throw new Error("Allocation exceeds remaining claim payment due after effective settlements");
      }
      return {
        amountMinor: allocation,
        payment: { connect: { id: paymentId } },
        progressClaim: { connect: { id: claimId } },
        project: { connect: { id } }
      };
    },
    afterCreate: async (tx) => {
      if (!tx.prisma?.$queryRawUnsafe || !tx.prisma.$executeRawUnsafe || !tx.prisma.progressClaim?.update) throw new Error("Transactional claim update is unavailable");
      const [totals] = await tx.prisma.$queryRawUnsafe(
        `SELECT COALESCE(SUM(allocation."amountMinor") FILTER (WHERE payment.status = 'settled'), 0)::bigint AS allocated,
                claim."currentPaymentDueMinor" AS due
         FROM "ProgressClaim" claim LEFT JOIN "PaymentAllocation" allocation ON allocation."progressClaim" = claim.id
         LEFT JOIN "Payment" payment ON payment.id = allocation.payment
         WHERE claim.id = $1 GROUP BY claim.id`,
        claimId
      );
      if (!totals) throw new Error("Claim settlement total is unavailable");
      const status2 = deriveClaimPaymentStatus(totals.due, totals.allocated);
      if (status2 === "approved") throw new Error("Settled allocation did not change the claim balance");
      await tx.prisma.progressClaim.update({ where: { id: claimId }, data: { status: status2 } });
      const [parent] = await tx.prisma.$queryRawUnsafe(
        `SELECT commitment AS "commitmentId", "primeContract" AS "primeContractId" FROM "ProgressClaim" WHERE id = $1`,
        claimId
      );
      if (parent?.commitmentId) {
        await tx.prisma.$executeRawUnsafe(
          `UPDATE "Commitment" SET "paidToDateMinor" = (
            SELECT COALESCE(SUM(allocation."amountMinor"), 0)::bigint FROM "PaymentAllocation" allocation
            JOIN "Payment" payment ON payment.id = allocation.payment
            JOIN "ProgressClaim" claim ON claim.id = allocation."progressClaim"
            WHERE claim.commitment = $1 AND payment.status = 'settled'
          ) WHERE id = $1`,
          parent.commitmentId
        );
      } else if (parent?.primeContractId) {
        await tx.prisma.$executeRawUnsafe(
          `UPDATE "PrimeContract" SET "paidToDateMinor" = (
            SELECT COALESCE(SUM(allocation."amountMinor"), 0)::bigint FROM "PaymentAllocation" allocation
            JOIN "Payment" payment ON payment.id = allocation.payment
            JOIN "ProgressClaim" claim ON claim.id = allocation."progressClaim"
            WHERE claim."primeContract" = $1 AND payment.status = 'settled'
          ) WHERE id = $1`,
          parent.primeContractId
        );
      }
    }
  });
}
async function registerSpecificationSection(_root, { input }, context) {
  const id = projectId(input);
  const division = input.type?.trim();
  if (division && division.length > 120) throw new Error("Division must be at most 120 characters");
  return executeProjectCommand({
    context,
    operation: "registerSpecificationSection",
    permission: "canManageDocuments",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "SpecificationSection",
    data: {
      sectionNumber: requiredText(input.reference, "Section number", 40),
      title: requiredText(input.title, "Section title", 240),
      division: division || void 0,
      description: input.description?.trim(),
      project: { connect: { id } }
    }
  });
}
var INSPECTION_TYPES = ["safety", "quality", "pre_installation", "commissioning", "regulatory", "equipment"];
async function registerInspectionTemplate(_root, { input }, context) {
  const id = projectId(input);
  const inspectionType = INSPECTION_TYPES.includes(String(input.type)) ? String(input.type) : null;
  if (!inspectionType) throw new Error("Select the inspection type");
  const name = requiredText(input.title, "Template name", 240);
  const data = { name, inspectionType, instructions: input.description?.trim(), isActive: true, project: { connect: { id } } };
  return executeProjectCommand({
    context,
    operation: "registerInspectionTemplate",
    permission: "canManageSafety",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "InspectionTemplate",
    data,
    beforeCreate: async (tx) => {
      if (!tx.prisma?.$queryRawUnsafe) throw new Error("Inspection template versioning is unavailable");
      await tx.prisma.$queryRawUnsafe('SELECT id FROM "Project" WHERE id = $1 FOR UPDATE', id);
      const [latest] = await tx.prisma.$queryRawUnsafe(
        'SELECT MAX(version)::int AS version FROM "InspectionTemplate" WHERE project = $1 AND lower(name) = lower($2)',
        id,
        name
      );
      return { ...data, version: Number(latest?.version ?? 0) + 1 };
    }
  });
}
async function lockOpenChangeEvent(context, changeEventId, project) {
  if (!context.prisma?.$queryRawUnsafe) throw new Error("Change event locking is unavailable");
  const [event] = await context.prisma.$queryRawUnsafe(
    'SELECT status::text AS status, project AS "projectId" FROM "ChangeEvent" WHERE id = $1 FOR UPDATE',
    changeEventId
  );
  if (!event || event.projectId !== project) throw new Error("Change event not found in this project");
  if (!["open", "pricing"].includes(event.status)) throw new Error("Only an open change event can be priced");
  return event;
}
async function addChangeEventLine(_root, { input }, context) {
  const id = projectId(input);
  const changeEventId = requiredText(input.relatedId, "Change event id", 200);
  const estimatedCost = amount2(input.amountMinor, "Estimated cost");
  const description = requiredText(input.title, "Line description", 500);
  const budgetCodeId = requiredText(input.secondaryId, "Budget code id", 200);
  return executeProjectCommand({
    context,
    operation: "addChangeEventLine",
    permission: "canManageContracts",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "ChangeEventLineItem",
    data: {},
    beforeCreate: async (tx) => {
      await lockOpenChangeEvent(tx, changeEventId, id);
      const [latest] = await tx.prisma.$queryRawUnsafe(
        'SELECT MAX("lineNumber")::int AS "lineNumber" FROM "ChangeEventLineItem" WHERE "changeEvent" = $1',
        changeEventId
      );
      return {
        lineNumber: Number(latest?.lineNumber ?? 0) + 1,
        description,
        estimatedCostMinor: estimatedCost,
        changeEvent: { connect: { id: changeEventId } },
        budgetCode: { connect: { id: budgetCodeId } },
        project: { connect: { id } }
      };
    },
    afterCreate: async (tx) => {
      await tx.prisma.$executeRawUnsafe(
        `UPDATE "ChangeEvent" SET
           "estimatedCostMinor" = (SELECT COALESCE(SUM("estimatedCostMinor"), 0) FROM "ChangeEventLineItem" WHERE "changeEvent" = $1),
           status = CASE WHEN status::text = 'open' THEN 'pricing' ELSE status END
         WHERE id = $1`,
        changeEventId
      );
    }
  });
}
async function recordChangeQuote(_root, { input }, context) {
  const id = projectId(input);
  const changeEventId = requiredText(input.relatedId, "Change event id", 200);
  const partnerId = requiredText(input.partnerId, "Trade partner", 200);
  const quoted = amount2(input.amountMinor, "Quoted amount");
  const lineId = input.secondaryId?.trim() || null;
  return executeProjectCommand({
    context,
    operation: "recordChangeQuote",
    permission: "canManageContracts",
    projectId: id,
    idempotencyKey: input.idempotencyKey,
    request: input,
    listKey: "ChangeQuote",
    data: {},
    beforeCreate: async (tx) => {
      await lockOpenChangeEvent(tx, changeEventId, id);
      if (lineId) {
        const lines = await tx.prisma.$queryRawUnsafe(
          'SELECT id FROM "ChangeEventLineItem" WHERE id = $1 AND "changeEvent" = $2',
          lineId,
          changeEventId
        );
        if (lines.length !== 1) throw new Error("The selected line does not belong to this change event");
      }
      return {
        quoteNumber: requiredText(input.reference, "Quote number", 80),
        status: "received",
        scope: input.description?.trim(),
        amountMinor: quoted,
        receivedAt: optionalDate(input.occurredAt, "Received date") ?? /* @__PURE__ */ new Date(),
        validUntil: optionalDate(input.dueAt, "Valid until"),
        changeEvent: { connect: { id: changeEventId } },
        ...lineId ? { changeEventLineItem: { connect: { id: lineId } } } : {},
        tradePartner: { connect: { id: partnerId } },
        project: { connect: { id } }
      };
    }
  });
}

// features/keystone/mutations/redirectToInit.ts
async function redirectToInit(_root, _args, context) {
  const userCount = await context.sudo().query.User.count({});
  if (userCount === 0) {
    return true;
  }
  return false;
}
var redirectToInit_default = redirectToInit;

// features/keystone/mutations/index.ts
var graphql = String.raw;
function extendGraphqlSchema(baseSchema) {
  return (0, import_schema.mergeSchemas)({
    schemas: [baseSchema],
    typeDefs: graphql`
      input LifecycleTransitionInput {
        id: ID!
        toStatus: String!
        reason: String!
        idempotencyKey: String
        agentActionId: ID
      }

      type LifecycleTransitionResult {
        success: Boolean!
        itemId: ID!
        fromStatus: String!
        toStatus: String!
        actionId: ID!
        replayed: Boolean!
      }

      input AgentActionRequestInput {
        agentIdentityId: ID!
        action: String!
        requiredScope: String!
        targetType: String!
        targetId: ID!
        toStatus: String!
        companyId: ID!
        projectId: ID
        reason: String!
        correlationId: String
        causationId: String
      }

      input AgentActionReviewInput {
        id: ID!
        decision: String!
        notes: String!
      }

      input AgentActionOutcomeInput {
        id: ID!
        outcome: String!
        resultSummary: String
        errorCode: String
        errorMessage: String
      }

      type AgentActionObservationReceipt {
        actionId: ID!
        observationId: ID!
        authoritative: Boolean!
        reportedOutcome: String!
        observedActionStatus: String!
        replayed: Boolean!
      }

      type ConstructionProjectSummary {
        id: ID!
        projectNumber: String!
        name: String!
        status: String!
        audience: String!
        companyId: ID
        companyName: String!
        brandName: String!
        brandMark: String!
        brandTagline: String!
        brandColor: String!
        logoIcon: String!
        logoColor: String!
        startDate: String
        completionDate: String
        currencyCode: String!
        originalBudgetMinor: String
        revisedBudgetMinor: String
        committedMinor: String
        actualCostMinor: String
        openRfis: Int
        openSubmittals: Int
        openChanges: Int
        openSafety: Int
        openPunch: Int
        pendingClaims: Int
      }

      type ConstructionCompanySummary {
        canCreateProject: Boolean!
        logoIcon: String!
        logoColor: String!
        id: ID!
        name: String!
        status: String!
        brandName: String!
        brandMark: String!
        brandTagline: String!
        brandColor: String!
      }

      type ConstructionPortfolio {
        generatedAt: String!
        canCreateProject: Boolean!
        page: Int!
        pageSize: Int!
        totalCount: Int!
        totalPages: Int!
        search: String!
        companies: [ConstructionCompanySummary!]!
        projects: [ConstructionProjectSummary!]!
        metrics: [ConstructionMetric!]!
      }

      type ConstructionOption {
        id: ID!
        kind: String!
        label: String!
        detail: String!
        parentId: ID
        status: String
      }

      type ConstructionOptionPage {
        items: [ConstructionOption!]!
        page: Int!
        totalCount: Int!
        hasMore: Boolean!
      }

      type ConstructionRecordDetailField {
        label: String!
        value: String!
      }

      type ConstructionRecordEvidence {
        kind: String!
        reference: String!
        title: String!
        status: String!
        occurredAt: String
        recordType: String
        recordId: ID
      }

      type ConstructionRecordDetail {
        id: ID!
        recordType: String!
        listKey: String!
        reference: String!
        title: String!
        status: String!
        allowedTransitions: [String!]!
        fields: [ConstructionRecordDetailField!]!
        evidence: [ConstructionRecordEvidence!]!
        history: [ConstructionRecordEvidence!]!
      }

      type ConstructionBidComparisonRow {
        id: ID!
        packageNumber: String!
        packageTitle: String!
        submissionNumber: String!
        partnerName: String!
        status: String!
        totalMinor: String!
        currencyCode: String!
        exclusions: String!
        clarifications: String!
        submittedAt: String
        lineCount: Int!
      }

      type ConstructionPortalInboxItem {
        id: ID!
        targetId: ID!
        secondaryId: ID
        kind: String!
        reference: String!
        title: String!
        status: String!
        dueAt: String
        action: String!
        downloadTargetId: ID
        context: [String!]
      }

      type ConstructionMetric {
        key: String!
        label: String!
        value: String!
        unit: String!
        tone: String!
      }

      type ConstructionWorkItem {
        id: ID!
        kind: String!
        reference: String!
        title: String!
        status: String!
        dueAt: String
        owner: String!
        amountMinor: String
        allowedTransitions: [String!]!
      }

      type ConstructionProjectWorkspace {
        generatedAt: String!
        tool: String!
        audience: String!
        availableCommands: [String!]!
        project: ConstructionProjectSummary!
        metrics: [ConstructionMetric!]!
        items: [ConstructionWorkItem!]!
        queuePage: Int!
        queueTotalPages: Int!
        queueGroups: [ConstructionQueueGroup!]!
      }

      type ConstructionQueueGroup {
        kind: String!
        totalCount: Int!
      }

      type ConstructionProcurementRequestRegister {
        projectId: ID!
        page: Int!
        pageSize: Int!
        totalCount: Int!
        totalPages: Int!
        status: String!
        items: [ConstructionWorkItem!]!
      }

      type ConstructionResourceLogItem {
        id: ID!
        resourceType: String!
        eventType: String!
        occurredAt: String
        quantity: String!
        unit: String!
        resourceLabel: String!
      }
      type ConstructionResourceIntentScope {
        version: Int!
        purpose: String!
        actorId: ID!
        principalId: String!
        companyId: ID!
        projectId: ID!
        currencyCode: String!
      }
      type ConstructionResourceActivityReceipt {
        outcome: String!
        message: String!
        intentJson: String
        itemId: ID
        actionId: ID
        requestDigest: String
        resultDigest: String
        completedAt: String
        factJson: String
      }
      type ConstructionResourceLogRegister {
        intentScope: ConstructionResourceIntentScope!
        page: Int!
        pageSize: Int!
        totalCount: Int!
        totalPages: Int!
        search: String!
        type: String!
        event: String!
        items: [ConstructionResourceLogItem!]!
      }
      type ConstructionMaterialReceiptRegisterItem {
        id: ID!
        reference: String!
        status: String!
        receivedAt: String
      }

      type ConstructionMaterialReceiptRegister {
        projectId: ID!
        page: Int!
        pageSize: Int!
        totalCount: Int!
        totalPages: Int!
        status: String!
        items: [ConstructionMaterialReceiptRegisterItem!]!
      }

      type ConstructionProcurementCommitmentRegisterItem {
        id: ID!
        number: String!
        title: String!
        commitmentType: String!
        status: String!
      }

      type ConstructionProcurementCommitmentRegister {
        projectId: ID!
        page: Int!
        pageSize: Int!
        totalCount: Int!
        totalPages: Int!
        status: String!
        items: [ConstructionProcurementCommitmentRegisterItem!]!
      }

      type ConstructionProcurementBidPackageReference {
        id: ID!
        number: String!
      }

      type ConstructionProcurementBidInvitationRegisterItem {
        id: ID!
        status: String!
        sentAt: String
        respondedAt: String
        bidPackage: ConstructionProcurementBidPackageReference
      }

      type ConstructionProcurementBidInvitationRegister {
        projectId: ID!
        page: Int!
        pageSize: Int!
        totalCount: Int!
        totalPages: Int!
        status: String!
        items: [ConstructionProcurementBidInvitationRegisterItem!]!
      }

      type ConstructionProcurementLienWaiverRegisterItem {
        id: ID!
        waiverNumber: String!
        waiverType: String!
        status: String!
        throughDate: String
      }

      type ConstructionProcurementLienWaiverRegister {
        projectId: ID!
        page: Int!
        pageSize: Int!
        totalCount: Int!
        totalPages: Int!
        status: String!
        items: [ConstructionProcurementLienWaiverRegisterItem!]!
      }

      type ConstructionInspectionRegister {
        projectId: ID!
        page: Int!
        pageSize: Int!
        totalCount: Int!
        totalPages: Int!
        status: String!
        audience: String!
        items: [ConstructionWorkItem!]!
      }

      type ConstructionSubmittalRegister {
        projectId: ID!
        page: Int!
        pageSize: Int!
        totalCount: Int!
        totalPages: Int!
        status: String!
        items: [ConstructionWorkItem!]!
      }

      type ConstructionSafetyIncidentRegisterItem {
        id: ID!
        reference: String!
        status: String!
        occurredAt: String
      }

      type ConstructionSafetyIncidentRegister {
        page: Int!
        pageSize: Int!
        totalCount: Int!
        totalPages: Int!
        status: String!
        items: [ConstructionSafetyIncidentRegisterItem!]!
      }

      type ConstructionSafetyObservationRegisterItem {
        id: ID!
        reference: String!
        status: String!
        observedAt: String
      }

      type ConstructionSafetyObservationRegister {
        page: Int!
        pageSize: Int!
        totalCount: Int!
        totalPages: Int!
        status: String!
        items: [ConstructionSafetyObservationRegisterItem!]!
      }

      type ConstructionRfiRegisterItem {
        id: ID
        number: String!
        title: String!
        status: String!
        dueAt: String
      }

      type ConstructionRfiRegister {
        page: Int!
        pageSize: Int!
        totalCount: Int!
        totalPages: Int!
        status: String!
        audience: String!
        items: [ConstructionRfiRegisterItem!]!
      }

      input ConstructionCommandInput {
        retainageBps: Int
        projectId: ID!
        reference: String!
        title: String!
        description: String
        dueAt: String
        amountMinor: String
        relatedId: ID
        secondaryId: ID
        idempotencyKey: String!
      }

      input ConstructionProjectCommandInput {
        companyId: ID!
        projectNumber: String!
        name: String!
        description: String
        startDate: String
        currencyCode: String
        idempotencyKey: String!
      }

      input ProjectMemberCommandInput {
        projectId: ID!
        userId: ID!
        accessLevel: String!
        idempotencyKey: String!
      }

      input ConstructionWorkflowInput {
        intentVersion: Int
        intentActorId: ID
        intentPrincipalId: String
        intentCompanyId: ID
        intentCurrencyCode: String
        projectId: ID!
        reference: String!
        title: String!
        description: String
        dueAt: String
        occurredAt: String
        amountMinor: String
        relatedId: ID
        secondaryId: ID
        partnerId: ID
        userId: ID
        roleId: ID
        type: String
        quantity: String
        unit: String
        evidenceReference: String
        evidenceChecksumSha256: String
        incidentType: String
        idempotencyKey: String!
      }

      input ConstructionOnboardingInput {
        fictionalFixture: Boolean
        companyName: String!
        companySlug: String!
        legalName: String
        brandName: String!
        brandMark: String!
        brandTagline: String
        brandColor: String!
        projectNumber: String!
        projectName: String!
        projectDescription: String
        startDate: String
        completionDate: String
        clientName: String
        tradePartnerName: String
        currencyCode: String!
        costCode: String!
        costCodeName: String!
        budgetCode: String!
        budgetCodeDescription: String!
        publicContactEmail: String!
        publicContactPhone: String
        publicServiceArea: String!
        publicCapabilitySummary: String!
        primaryServiceName: String!
        primaryServiceSummary: String!
        publicPrivacyNotice: String!
        publishFirstProject: Boolean!
        publicProjectSummary: String
        publicProjectMarket: String
        publicProjectLocation: String
        idempotencyKey: String!
      }

      type ConstructionOnboardingResult {
        success: Boolean!
        companyId: ID!
        projectId: ID!
        actionId: ID!
        replayed: Boolean!
      }

      type ConstructionReadinessCheck {
        key: String!
        label: String!
        complete: Boolean!
        detail: String!
        href: String!
        required: Boolean!
      }

      type ConstructionProjectReadiness {
        projectId: ID!
        name: String!
        checks: [ConstructionReadinessCheck!]!
      }

      type ConstructionCompanyReadiness {
        companyId: ID!
        name: String!
        checks: [ConstructionReadinessCheck!]!
        projects: [ConstructionProjectReadiness!]!
      }

      type ConstructionOnboardingReadiness {
        canStartFirstCompany: Boolean!
        sampleWorkspaceAvailable: Boolean!
        projectOnly: Boolean!
        companies: [ConstructionCompanyReadiness!]!
      }

      input ApiCredentialInput {
        companyId: ID!
        projectId: ID
        name: String!
        scopes: [String!]!
        expiresAt: String
      }

      type ApiCredentialIssueResult {
        success: Boolean!
        credentialId: ID!
        actionId: ID!
        token: String!
        tokenPrefix: String!
        scopes: [String!]!
      }

      type ApiCredentialRevokeResult {
        success: Boolean!
        credentialId: ID!
        actionId: ID!
        replayed: Boolean!
      }

      input ConstructionApprovalPolicyInput {
        projectId: ID!
        policyId: ID
        name: String!
        domain: String!
        minimumAmountMinor: String!
        approverRoleId: ID!
        isActive: Boolean!
        idempotencyKey: String!
      }

      input ConstructionApprovalRequestInput {
        targetType: String!
        targetId: ID!
        targetStatus: String!
        requestNumber: String!
        reason: String!
        assigneeMembershipId: ID
      }

      input ConstructionApprovalDecisionInput {
        requestId: ID!
        decision: String!
        comment: String!
      }

      type ConstructionApprovalResult {
        success: Boolean!
        requestId: ID!
        decisionId: ID
        actionId: ID!
        replayed: Boolean
      }

      input DrawingRevisionUploadInput {
        projectId: ID!
        drawingId: ID!
        revisionNumber: String!
        title: String!
        fileName: String!
        mimeType: String!
        byteSize: Int!
        checksumSha256: String!
        idempotencyKey: String!
      }

      input DocumentVersionUploadInput {
        projectId: ID!
        documentId: ID!
        versionNumber: Int!
        revisionLabel: String
        title: String!
        fileName: String!
        mimeType: String!
        byteSize: Int!
        checksumSha256: String!
        idempotencyKey: String!
      }

      type SignedHeader {
        name: String!
        value: String!
      }

      type DocumentUploadAuthorization {
        success: Boolean!
        versionId: ID!
        actionId: ID!
        replayed: Boolean!
        uploadUrl: String!
        expiresAt: String!
        headers: [SignedHeader!]!
      }

      type DocumentUploadCompletion {
        success: Boolean!
        versionId: ID!
        actionId: ID!
        replayed: Boolean!
      }

      type DrawingUploadAuthorization {
        success: Boolean!
        revisionId: ID!
        actionId: ID!
        replayed: Boolean!
        uploadUrl: String!
        expiresAt: String!
        headers: [SignedHeader!]!
      }

      type DrawingUploadCompletion {
        success: Boolean!
        revisionId: ID!
        actionId: ID!
        replayed: Boolean!
      }

      input DocumentDistributionInput {
        projectId: ID!
        versionId: ID!
        membershipId: ID!
        purpose: String!
        expiresAt: String
        idempotencyKey: String!
      }

      type DocumentDownloadAuthorization {
        success: Boolean!
        fileName: String!
        mimeType: String!
        byteSize: Int!
        downloadUrl: String!
        expiresAt: String!
      }

      input PortalWorkflowInput {
        projectId: ID!
        targetId: ID!
        reference: String
        title: String
        response: String!
        amountMinor: String
        quantity: String
        unit: String
        decision: String
        dueAt: String
        evidenceReference: String
        evidenceChecksumSha256: String
        idempotencyKey: String!
      }

      input ProjectInvitationAcceptanceInput {
        token: String!
        password: String
        name: String
      }

      type ProjectInvitationAcceptanceResult {
        success: Boolean!
        userId: ID!
        projectId: ID!
        portalType: String!
      }

      type ProjectInvitationIssueResult {
        success: Boolean!
        operation: String!
        itemId: ID!
        actionId: ID!
        replayed: Boolean!
        activationToken: String
      }

      input SafetyIncidentPrivateInput {
        incidentId: ID!
        incidentType: String
        injuredPartyName: String
        injuryDetails: String
        privateNotes: String
        lostTimeDays: Int
        restrictedDutyDays: Int
        idempotencyKey: String!
      }

      type SafetyIncidentPrivateDetail {
        incidentId: ID!
        incidentType: String!
        injuredPartyName: String!
        injuryDetails: String!
        privateNotes: String!
        lostTimeDays: Int!
        restrictedDutyDays: Int!
      }

      type DocumentAcknowledgementResult {
        success: Boolean!
        acknowledgementId: ID!
        replayed: Boolean!
      }

      type ConstructionCommandResult {
        success: Boolean!
        operation: String!
        itemId: ID!
        actionId: ID!
        replayed: Boolean!
      }

      type PublicConstructionService {
        slug: String!
        title: String!
        summary: String!
        details: String!
        market: String!
      }

      type PublicConstructionProject {
        slug: String!
        title: String!
        summary: String!
        description: String!
        market: String!
        locationLabel: String!
        deliveryMethod: String!
        completionLabel: String!
        approvedOutcome: String!
      }

      type PublicConstructionSite {
        logoIcon: String!
        logoColor: String!
        brandName: String!
        brandMark: String!
        brandTagline: String!
        brandColor: String!
        serviceArea: String!
        capabilitySummary: String!
        inquiryEmail: String!
        inquiryPhone: String!
        privacyNotice: String!
        acceptingInquiries: Boolean!
        services: [PublicConstructionService!]!
        projects: [PublicConstructionProject!]!
      }

      type CustomerRegistrationResult { success: Boolean! }
      type ConstructionCustomerRequest {
        id: ID!
        reference: String!
        serviceTitle: String!
        serviceSlug: String!
        scope: String!
        status: String!
        version: Int!
        currencyCode: String!
        quoteMinor: String!
        quoteTerms: String!
        expiresAt: String
        acceptedAt: String
        acceptedSnapshot: JSON
        createdAt: String!
      }
      type ConstructionOperatorRequest {
        request: ConstructionCustomerRequest!
        customerName: String!
        customerEmail: String!
        customerPhone: String
      }
      input ServiceRequestInput {
        operation: String!
        id: ID
        serviceSlug: String
        scope: String
        expectedVersion: Int
        amountMinor: String
        terms: String
        expiresAt: String
        idempotencyKey: String!
      }

      type PublicIntakeReceipt {
        publicReference: String!
        kind: String!
        status: String!
        submittedAt: String!
      }

      input PublicIntakeInput {
        kind: String!
        contactName: String!
        organization: String
        email: String!
        phone: String
        contactRole: String
        projectName: String
        projectType: String
        locationSummary: String
        deliveryMethod: String
        budgetRange: String
        desiredStart: String
        desiredCompletion: String
        designStage: String
        servicesSought: String
        scopeSummary: String!
        referralSource: String
        sourcePath: String!
        privacyConsent: Boolean!
        privacyNoticeDigest: String
        idempotencyKey: String!
        website: String
      }

      type PublicIntakeResult {
        success: Boolean!
        publicReference: String!
        kind: String!
        submittedAt: String!
        replayed: Boolean!
      }

      type Query {
        redirectToInit: Boolean
        constructionPortfolio(page: Int, search: String): ConstructionPortfolio!
        constructionOnboardingReadiness: ConstructionOnboardingReadiness!
        constructionProjectWorkspace(projectId: ID!, tool: String!, page: Int): ConstructionProjectWorkspace!
        constructionProcurementRequestRegister(projectId: ID!, page: Int!, status: String): ConstructionProcurementRequestRegister!
        constructionResourceActivityReceipt(intentJson: String!): ConstructionResourceActivityReceipt!
        constructionResourceLogRegister(projectId: ID!, page: Int!, search: String, type: String, event: String): ConstructionResourceLogRegister!
        constructionMaterialReceiptRegister(projectId: ID!, page: Int!, status: String): ConstructionMaterialReceiptRegister!
        constructionProcurementCommitmentRegister(projectId: ID!, page: Int!, status: String): ConstructionProcurementCommitmentRegister!
        constructionProcurementBidInvitationRegister(projectId: ID!, page: Int!, status: String): ConstructionProcurementBidInvitationRegister!
        constructionProcurementLienWaiverRegister(projectId: ID!, page: Int!, status: String): ConstructionProcurementLienWaiverRegister!
        constructionInspectionRegister(projectId: ID!, page: Int!, status: String): ConstructionInspectionRegister!
        constructionSafetyIncidentRegister(projectId: ID!, page: Int!, status: String): ConstructionSafetyIncidentRegister!
        constructionSafetyObservationRegister(projectId: ID!, page: Int!, status: String): ConstructionSafetyObservationRegister!
        constructionSubmittalRegister(projectId: ID!, page: Int!, status: String): ConstructionSubmittalRegister!
        constructionRfiRegister(projectId: ID!, page: Int!, status: String): ConstructionRfiRegister!
        constructionProjectOptions(projectId: ID!): [ConstructionOption!]!
        constructionProjectOptionSearch(projectId: ID!, kinds: [String!]!, search: String, page: Int, ids: [ID!]): ConstructionOptionPage!
        constructionBidComparison(projectId: ID!): [ConstructionBidComparisonRow!]!
        constructionRecordDetail(projectId: ID!, recordType: String!, recordId: ID!): ConstructionRecordDetail!
        constructionPortalInbox(projectId: ID!): [ConstructionPortalInboxItem!]!
        constructionPortalApprovalSnapshot(projectId: ID!, requestId: ID!): [String!]!
        constructionApprovalSnapshot(projectId: ID!, requestId: ID!): [String!]!
        documentVersionDownload(versionId: ID!): DocumentDownloadAuthorization!
        drawingRevisionDownload(revisionId: ID!): DocumentDownloadAuthorization!
        safetyIncidentPrivateDetail(incidentId: ID!): SafetyIncidentPrivateDetail!
        publicConstructionSite: PublicConstructionSite
        publicConstructionService(slug: String!): PublicConstructionService
        publicConstructionProject(slug: String!): PublicConstructionProject
        publicIntakeReceipt(reference: String!): PublicIntakeReceipt
        constructionStoreSettings(companyId: ID): JSON
        constructionCustomerRequests(operator: Boolean, skip: Int, take: Int): [ConstructionCustomerRequest!]!
        constructionCustomerRequestCount(operator: Boolean): Int!
        constructionOperatorRequests(skip: Int, take: Int): [ConstructionOperatorRequest!]!
        constructionCustomerRequest(id: ID!): ConstructionCustomerRequest
      }

      type Mutation {
        transitionProjectStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionBidPackageStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionEstimateStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionBudgetChangeStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionPrimeContractStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionCommitmentStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionChangeEventStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionChangeOrderStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionRfiStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionSubmittalStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionProgressClaimStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionSafetyIncidentStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionInspectionStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionScheduleStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionScheduleTaskStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionDailyLogStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionPunchItemStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionSafetyObservationStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionCorrectiveActionStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionPaymentStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionRetainageReleaseStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionLienWaiverStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionProcurementRequestStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        createConstructionProject(input: ConstructionProjectCommandInput!): ConstructionCommandResult!
        startBidPackage(input: ConstructionCommandInput!): ConstructionCommandResult!
        awardBidSubmission(input: ConstructionCommandInput!): ConstructionCommandResult!
        prepareProgressClaim(input: ConstructionCommandInput!): ConstructionCommandResult!
        recordProgressPayment(input: ConstructionCommandInput!): ConstructionCommandResult!
        openChangeEvent(input: ConstructionCommandInput!): ConstructionCommandResult!
        raiseRfi(input: ConstructionCommandInput!): ConstructionCommandResult!
        registerSubmittal(input: ConstructionCommandInput!): ConstructionCommandResult!
        startDailyLog(input: ConstructionCommandInput!): ConstructionCommandResult!
        recordSafetyObservation(input: ConstructionCommandInput!): ConstructionCommandResult!
        recordPunchItem(input: ConstructionCommandInput!): ConstructionCommandResult!
        registerDocument(input: ConstructionCommandInput!): ConstructionCommandResult!
        recordDirectCost(input: ConstructionCommandInput!): ConstructionCommandResult!
        addProjectMember(input: ProjectMemberCommandInput!): ConstructionCommandResult!
        onboardConstructionWorkspace(input: ConstructionOnboardingInput!): ConstructionOnboardingResult!
        issueApiCredential(input: ApiCredentialInput!): ApiCredentialIssueResult!
        revokeApiCredential(id: ID!, reason: String!): ApiCredentialRevokeResult!
        configureConstructionApprovalPolicy(input: ConstructionApprovalPolicyInput!): ConstructionCommandResult!
        requestConstructionApproval(input: ConstructionApprovalRequestInput!): ConstructionApprovalResult!
        decideConstructionApproval(input: ConstructionApprovalDecisionInput!): ConstructionApprovalResult!
        requestDocumentVersionUpload(input: DocumentVersionUploadInput!): DocumentUploadAuthorization!
        completeDocumentVersionUpload(versionId: ID!, idempotencyKey: String!): DocumentUploadCompletion!
        requestDrawingRevisionUpload(input: DrawingRevisionUploadInput!): DrawingUploadAuthorization!
        completeDrawingRevisionUpload(revisionId: ID!, idempotencyKey: String!): DrawingUploadCompletion!
        distributeDocumentVersion(input: DocumentDistributionInput!): ConstructionCommandResult!
        acknowledgeDocumentDistribution(distributionId: ID!, acknowledgement: String!): DocumentAcknowledgementResult!
        acceptProjectInvitation(input: ProjectInvitationAcceptanceInput!): ProjectInvitationAcceptanceResult!
        revokeProjectInvitation(invitationId: ID!, reason: String!): ConstructionCommandResult!
        reissueProjectInvitation(invitationId: ID!, reason: String!, idempotencyKey: String!): ProjectInvitationIssueResult!
        submitPortalBid(input: PortalWorkflowInput!): ConstructionCommandResult!
        respondPortalRfi(input: PortalWorkflowInput!): ConstructionCommandResult!
        reviewPortalSubmittal(input: PortalWorkflowInput!): ConstructionCommandResult!
        submitPortalProgressClaim(input: PortalWorkflowInput!): ConstructionCommandResult!
        submitPortalLienWaiver(input: PortalWorkflowInput!): ConstructionCommandResult!
        recordSafetyIncidentPrivateDetails(input: SafetyIncidentPrivateInput!): ConstructionCommandResult!
        registerTradePartner(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        addBudgetLine(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        createBudgetChangeWithLine(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        reversePostedDirectCost(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        createEstimateWithLine(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        reviseEstimate(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        registerSpecificationSection(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        registerInspectionTemplate(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        addChangeEventLine(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        recordChangeQuote(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        inviteBidder(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        recordBidSubmission(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        createPrimeContractWithLine(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        createCommitmentWithLine(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        createChangeOrderWithLine(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        routeRfi(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        respondToRfi(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        routeSubmittalReview(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        recordSubmittalReview(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        addDailyLogEntry(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        registerFieldPhoto(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        recordLaborTime(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        createResourceCatalogItem(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        registerScheduleTask(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        linkScheduleDependency(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        updateScheduleTaskProgress(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        recordSafetyIncident(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        createInspectionWithItem(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        recordInspectionItemResult(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        registerCorrectiveAction(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        recordCorrectiveActionEvidence(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        createProcurementRequestWithLine(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        placeProcurementOrder(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        recordMaterialReceipt(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        recordLienWaiverEvidence(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        requestRetainageRelease(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        registerDrawing(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        registerSchedule(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        recordResourceActivity(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        reconcileResourceActivityIntent(intentJson: String!): ConstructionResourceActivityReceipt!
        closeResourceActivityIntent(intentJson: String!, reason: String!): ConstructionResourceActivityReceipt!
        inviteProjectMember(input: ConstructionWorkflowInput!): ProjectInvitationIssueResult!
        allocateSettledPayment(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        reverseSettledPayment(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        requestAgentAction(input: AgentActionRequestInput!): AgentAction!
        reviewAgentAction(input: AgentActionReviewInput!): AgentAction!
        recordAgentActionObservation(input: AgentActionOutcomeInput!): AgentActionObservationReceipt!
        recordAgentActionOutcome(input: AgentActionOutcomeInput!): AgentAction! @deprecated(reason: "Records a non-authoritative observation only; returns the unchanged action. Use recordAgentActionObservation for its explicit receipt. Execute through the authorized domain transition.")
        submitPublicIntake(input: PublicIntakeInput!): PublicIntakeResult!
        updateConstructionStoreSettings(input: JSON!): ConstructionCommandResult!
        registerConstructionCustomer(name: String!, email: String!, password: String!): CustomerRegistrationResult!
        commandConstructionRequest(input: ServiceRequestInput!): ConstructionCustomerRequest!
      }
    `,
    resolvers: {
      Query: {
        redirectToInit: redirectToInit_default,
        constructionStoreSettings,
        constructionCustomerRequest,
        constructionCustomerRequests,
        constructionCustomerRequestCount,
        constructionOperatorRequests,
        constructionPortfolio,
        constructionOnboardingReadiness,
        constructionProjectWorkspace,
        constructionProcurementRequestRegister,
        constructionResourceLogRegister,
        constructionResourceActivityReceipt,
        constructionMaterialReceiptRegister,
        constructionProcurementCommitmentRegister,
        constructionProcurementBidInvitationRegister,
        constructionProcurementLienWaiverRegister,
        constructionInspectionRegister,
        constructionSafetyIncidentRegister,
        constructionSafetyObservationRegister,
        constructionSubmittalRegister,
        constructionRfiRegister,
        constructionProjectOptions,
        constructionProjectOptionSearch,
        constructionBidComparison,
        constructionRecordDetail,
        constructionPortalInbox,
        constructionPortalApprovalSnapshot,
        constructionApprovalSnapshot,
        documentVersionDownload,
        drawingRevisionDownload,
        safetyIncidentPrivateDetail,
        publicConstructionSite,
        publicConstructionService,
        publicConstructionProject,
        publicIntakeReceipt
      },
      Mutation: {
        ...lifecycleResolvers,
        updateConstructionStoreSettings,
        commandConstructionRequest,
        registerConstructionCustomer,
        createConstructionProject,
        startBidPackage,
        awardBidSubmission,
        prepareProgressClaim,
        recordProgressPayment,
        openChangeEvent,
        raiseRfi,
        registerSubmittal,
        startDailyLog,
        recordSafetyObservation,
        recordPunchItem,
        registerDocument,
        recordDirectCost,
        addProjectMember,
        onboardConstructionWorkspace,
        issueApiCredential,
        revokeApiCredential,
        configureConstructionApprovalPolicy,
        requestConstructionApproval,
        decideConstructionApproval,
        requestDocumentVersionUpload,
        completeDocumentVersionUpload,
        requestDrawingRevisionUpload,
        completeDrawingRevisionUpload,
        distributeDocumentVersion,
        acknowledgeDocumentDistribution,
        acceptProjectInvitation,
        revokeProjectInvitation,
        reissueProjectInvitation,
        submitPortalBid,
        respondPortalRfi,
        reviewPortalSubmittal,
        submitPortalProgressClaim,
        submitPortalLienWaiver,
        recordSafetyIncidentPrivateDetails,
        registerTradePartner,
        addBudgetLine,
        createBudgetChangeWithLine,
        reversePostedDirectCost,
        createEstimateWithLine,
        reviseEstimate,
        registerSpecificationSection,
        registerInspectionTemplate,
        addChangeEventLine,
        recordChangeQuote,
        inviteBidder,
        recordBidSubmission,
        createPrimeContractWithLine,
        createCommitmentWithLine,
        createChangeOrderWithLine,
        routeRfi,
        respondToRfi,
        routeSubmittalReview,
        recordSubmittalReview,
        addDailyLogEntry,
        registerFieldPhoto,
        recordLaborTime,
        createResourceCatalogItem,
        registerScheduleTask,
        linkScheduleDependency,
        updateScheduleTaskProgress,
        recordSafetyIncident,
        createInspectionWithItem,
        recordInspectionItemResult,
        registerCorrectiveAction,
        recordCorrectiveActionEvidence,
        createProcurementRequestWithLine,
        placeProcurementOrder,
        recordMaterialReceipt,
        recordLienWaiverEvidence,
        requestRetainageRelease,
        registerDrawing,
        registerSchedule,
        recordResourceActivity,
        reconcileResourceActivityIntent,
        closeResourceActivityIntent,
        inviteProjectMember,
        allocateSettledPayment,
        reverseSettledPayment,
        requestAgentAction,
        reviewAgentAction,
        recordAgentActionOutcome,
        recordAgentActionObservation,
        submitPublicIntake
      }
    }
  });
}

// features/keystone/index.ts
var databaseURL = requirePostgresDatabaseUrl(process.env.DATABASE_URL);
var sessionConfig = {
  maxAge: 60 * 60 * 8,
  secret: requireSessionSecret()
};
var initialRolePermissions = Object.fromEntries(
  permissionsList.map((permission) => [permission, true])
);
var { withAuth } = (0, import_auth.createAuth)({
  listKey: "User",
  identityField: "email",
  secretField: "password",
  initFirstItem: {
    fields: ["name", "email", "password"],
    itemData: {
      role: {
        create: {
          name: "Platform Administrator",
          ...initialRolePermissions
        }
      }
    }
  },
  passwordResetLink: {
    async sendToken({ itemId, identity, token, context }) {
      const user = await context.sudo().query.User.findOne({ where: { id: String(itemId) }, query: "role { canAccessDashboard }" });
      const resetPath = user?.role?.canAccessDashboard ? "/dashboard/reset" : "/account/reset";
      await sendPasswordResetEmail(token, identity, void 0, resetPath);
    }
  },
  sessionData: `
    id
    name
    email
    isActive
    role {
      id
      name
      ${permissionsList.join("\n")}
    }
    companyMemberships {
      status
      canAccessAllProjects
      company { id name brandName brandMark brandTagline brandColor }
      role { id name ${permissionsList.join("\n")} }
    }
    projectMemberships {
      status
      accessLevel
      portalType
      project { id company { id } }
      portalOrganization { id name partnerType }
      role { id name ${permissionsList.join("\n")} }
    }
  `
});
var keystone_default = withAuth(
  (0, import_core18.config)({
    db: {
      provider: "postgresql",
      url: databaseURL
    },
    lists: models,
    // Construction files use the verified private-object adapter. No current
    // List uses starter my_images; do not instantiate an unused cloud client.
    ui: {
      isAccessAllowed: ({ session }) => permissions.canAccessDashboard({ session }),
      basePath: "/dashboard"
    },
    session: databaseSessions(sessionConfig),
    graphql: {
      extendGraphqlSchema
    }
  })
);

// keystone.ts
var keystone_default2 = keystone_default;
//# sourceMappingURL=config.js.map
