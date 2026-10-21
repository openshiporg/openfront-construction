import { hasCompanyPermission, hasPermission, hasProjectPermission, type Session } from "../access";
import { lifecyclePolicies, type LifecycleListKey } from "../domain/lifecycle";
import { hasSessionProjectAccess } from "../domain/tenancy";
import type { Permission } from "../models/fields";

type QueryApi = {
  findMany(args: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
  findOne(args: Record<string, unknown>): Promise<Record<string, unknown> | null>;
  count(args: Record<string, unknown>): Promise<number>;
};

type ConstructionQueryContext = {
  session?: Session;
  query: Record<string, QueryApi>;
  sudo?(): { query: Record<string, QueryApi> };
};

type Audience = "internal" | "external";

type Metric = {
  key: string;
  label: string;
  value: string;
  unit: string;
  tone: string;
};

type WorkItem = {
  id: string;
  kind: string;
  reference: string;
  title: string;
  status: string;
  dueAt: string | null;
  owner: string;
  amountMinor: string | null;
  allowedTransitions: string[];
};

const MAX_PROJECTS = 50;
const MAX_ITEMS_PER_LIST = 20;
const MAX_REPORT_ROWS_PER_LIST = 1_000;

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function idOf(value: unknown): string {
  return text((value as { id?: unknown } | null)?.id);
}

function nameOf(value: unknown): string {
  const record = value as { name?: unknown; title?: unknown; email?: unknown } | null;
  return text(record?.name) || text(record?.title) || text(record?.email);
}

function dateOf(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function money(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return String(value);
}

function currencyAmount(value: unknown, currency: unknown): string {
  const code = text(currency, "USD");
  if (code !== "USD") return `${code} amount unavailable (currency support is disabled)`;
  try {
    const minor = BigInt(String(value ?? 0)); const absolute = minor < 0 ? -minor : minor;
    return `USD ${minor < 0 ? "-" : ""}${(absolute / BigInt(100)).toString()}.${(absolute % BigInt(100)).toString().padStart(2, "0")}`;
  } catch { return "USD —"; }
}

function requireSession(context: ConstructionQueryContext): Session {
  if (!context.session?.itemId) throw new Error("Authentication required");
  return context.session;
}

function hasEitherProjectPermission(
  session: Session,
  companyId: string,
  projectId: string,
  read: Permission,
  manage: Permission,
): boolean {
  return hasProjectPermission(session, companyId, projectId, read) ||
    hasProjectPermission(session, companyId, projectId, manage);
}

function audienceForProject(session: Session, companyId: string, projectId: string): Audience {
  const explicitMembership = session.data.projectMemberships?.find(
    membership => membership.status === "active" && membership.project?.id === projectId,
  );
  if (explicitMembership) return explicitMembership.portalType === "internal" ? "internal" : "external";
  return session.data.companyMemberships?.some(
    membership => membership.status === "active" && membership.canAccessAllProjects && membership.company?.id === companyId,
  ) ? "internal" : "external";
}

function canWriteProjectFromSession(session: Session, companyId: string, projectId: string): boolean {
  const explicitMembership = session.data.projectMemberships?.find(
    membership => membership.status === "active" && membership.project?.id === projectId,
  );
  if (explicitMembership) {
    return explicitMembership.portalType === "internal" &&
      (explicitMembership.accessLevel === "contributor" || explicitMembership.accessLevel === "manager");
  }
  return companyId ? hasSessionProjectAccess(session, companyId, projectId, true) : false;
}

function total(values: Array<string | null>): string {
  return values.reduce((sum, value) => {
    try {
      return sum + BigInt(value ?? 0);
    } catch {
      return sum;
    }
  }, BigInt(0)).toString();
}

function sum(records: unknown, field: string): bigint {
  if (!Array.isArray(records)) return BigInt(0);
  return records.reduce((total: bigint, record) => {
    const value = (record as Record<string, unknown>)[field];
    try {
      return total + BigInt(value === null || value === undefined ? 0 : String(value));
    } catch {
      return total;
    }
  }, BigInt(0));
}

// Relationship counts are null when the viewer cannot read that list; show
// the metric as unavailable rather than as zero.
function countOf(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function projectSummary(
  project: Record<string, unknown>,
  audience: Audience,
  canViewInternalFinancials: boolean,
) {
  const budgets = project.budgets as Array<Record<string, unknown>> | undefined;
  const activeBudget = budgets?.[0];
  const exposeFinancials = audience === "internal" && canViewInternalFinancials;
  return {
    id: text(project.id),
    projectNumber: text(project.projectNumber),
    name: text(project.name),
    status: text(project.status),
    audience,
    companyId: audience === "internal" ? idOf(project.company) : null,
    companyName: nameOf(project.company),
    brandName: text((project.company as Record<string, unknown> | null)?.brandName, nameOf(project.company)),
    brandMark: text((project.company as Record<string, unknown> | null)?.brandMark),
    brandTagline: text((project.company as Record<string, unknown> | null)?.brandTagline),
    brandColor: text((project.company as Record<string, unknown> | null)?.brandColor, "#1D4ED8"),
    logoIcon: text((project.company as Record<string, unknown> | null)?.logoIcon),
    logoColor: text((project.company as Record<string, unknown> | null)?.logoColor, "0"),
    startDate: dateOf(project.startDate),
    completionDate: dateOf(project.substantialCompletionDate),
    currencyCode: text(project.currencyCode, "USD"),
    originalBudgetMinor: exposeFinancials ? money(activeBudget?.totalOriginalMinor) ?? "0" : null,
    revisedBudgetMinor: exposeFinancials ? money(activeBudget?.totalRevisedMinor) ?? "0" : null,
    committedMinor: exposeFinancials
      ? money(activeBudget?.totalCommittedMinor) ?? String(sum(project.commitments, "revisedContractMinor"))
      : null,
    actualCostMinor: exposeFinancials
      ? money(activeBudget?.totalActualMinor) ?? String(sum(project.directCosts, "amountMinor"))
      : null,
    // External participants see assigned work, never unrelated project totals.
    openRfis: audience === "internal" ? countOf(project.openRfiCount) : null,
    openSubmittals: audience === "internal" ? countOf(project.openSubmittalCount) : null,
    openChanges: audience === "internal" ? countOf(project.openChangeCount) : null,
    openSafety: audience === "internal" ? countOf(project.openSafetyCount) : null,
    openPunch: audience === "internal" ? countOf(project.openPunchCount) : null,
    pendingClaims: audience === "internal" ? countOf(project.pendingClaimCount) : null,
  };
}

const projectIdentityQuery = `
  id projectNumber name status startDate substantialCompletionDate currencyCode
  company { id name brandName brandMark brandTagline brandColor logoIcon logoColor }
`;

const projectSummaryQuery = `
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

export async function constructionPortfolio(
  _root: unknown,
  args: { page?: number | null; search?: string | null } | undefined,
  context: ConstructionQueryContext,
) {
  const session = requireSession(context);
  const externalProjectIds = session.data.projectMemberships?.filter(entry => {
    const project = entry.project;
    return entry.status === "active" && entry.portalType !== "internal" && project?.company?.id &&
      hasSessionProjectAccess(session, project.company.id, project.id) &&
      hasEitherProjectPermission(session, project.company.id, project.id, "canReadProjects", "canManageProjects");
  }).map(entry => entry.project!.id) ?? [];
  const hasInternalPortfolio = session.data.companyMemberships?.some(entry => entry.status === "active" && entry.canAccessAllProjects) ||
    session.data.projectMemberships?.some(entry => entry.status === "active" && entry.portalType === "internal");
  const search = typeof args?.search === "string" ? args.search.trim().slice(0, 120) : "";
  const searchFilter = search
    ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { projectNumber: { contains: search, mode: "insensitive" } }] }
    : {};
  const page = Math.max(1, Math.floor(Number(args?.page) || 1));
  const externalOnly = !hasInternalPortfolio && externalProjectIds.length > 0 && Boolean(context.sudo);
  const projectApi = externalOnly ? context.sudo!().query.Project : context.query.Project;
  const projectWhere = externalOnly ? { AND: [{ id: { in: externalProjectIds } }, searchFilter] } : searchFilter;
  const [companies, records, totalCount] = await Promise.all([
    hasPermission(session, "canReadCompanies") || hasPermission(session, "canManageCompanies")
      ? context.query.Company.findMany({
          take: 50,
          orderBy: { name: "asc" },
          query: "id name status brandName brandMark brandTagline brandColor logoIcon logoColor",
        })
      : Promise.resolve([]),
    projectApi.findMany({
      where: projectWhere, take: MAX_PROJECTS, skip: (page - 1) * MAX_PROJECTS,
      orderBy: [{ status: "asc" }, { name: "asc" }, { id: "asc" }],
      query: externalOnly ? projectIdentityQuery : projectSummaryQuery,
    }),
    projectApi.count({ where: projectWhere }),
  ]);
  const projects = records.map(project => {
    const companyId = idOf(project.company);
    const projectId = text(project.id);
    const audience = audienceForProject(session, companyId, projectId);
    return projectSummary(
      project,
      audience,
      audience === "internal" && hasEitherProjectPermission(
        session,
        companyId,
        projectId,
        "canReadFinancials",
        "canManageFinancials",
      ),
    );
  });
  const openWork = projects.reduce(
    (count, project) => count + (project.openRfis ?? 0) + (project.openSubmittals ?? 0) + (project.openChanges ?? 0) + (project.openPunch ?? 0) + (project.openSafety ?? 0),
    0,
  );
  const metrics: Metric[] = [
    { key: "active-projects", label: "Active projects", value: String(projects.filter(project => project.status === "active").length), unit: "projects", tone: "neutral" },
  ];
  const internalProjects = projects.filter(project => project.actualCostMinor !== null);
  const usdProjects = internalProjects.filter(project => project.currencyCode === "USD");
  const unsupportedCurrencyProjects = internalProjects.filter(project => project.currencyCode !== "USD");
  if (usdProjects.length > 0) {
    metrics.push(
      { key: "revised-budget", label: "Revised budget (USD jobs)", value: total(usdProjects.map(project => project.revisedBudgetMinor)), unit: "USD", tone: "neutral" },
      { key: "actual-cost", label: "Actual cost (USD jobs)", value: total(usdProjects.map(project => project.actualCostMinor)), unit: "USD", tone: "neutral" },
    );
  }
  if (unsupportedCurrencyProjects.length > 0) {
    metrics.push({ key: "unsupported-currency-projects", label: "Currency-blocked projects", value: String(unsupportedCurrencyProjects.length), unit: "projects", tone: "attention" });
  }
  metrics.push({ key: "open-work", label: "Open work", value: String(openWork), unit: "items", tone: "attention" });
  // Totals are summed over the projects returned; say so when more pages exist.
  if (totalCount > records.length) {
    for (const metric of metrics) metric.label = `${metric.label}, this page`;
  }
  // Creating a project also initializes its budget, so both permissions are required.
  const canCreateIn = (companyId: string) =>
    hasCompanyPermission(session, companyId, "canManageProjects") && hasCompanyPermission(session, companyId, "canManageFinancials");
  return {
    generatedAt: new Date().toISOString(),
    canCreateProject: companies.some(company => text(company.status) === "active" && canCreateIn(text(company.id))),
    page,
    pageSize: MAX_PROJECTS,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / MAX_PROJECTS)),
    search,
    companies: companies.map(company => ({
      canCreateProject: text(company.status) === "active" && canCreateIn(text(company.id)),
      id: text(company.id), name: text(company.name), status: text(company.status),
      brandName: text(company.brandName, text(company.name)), brandMark: text(company.brandMark),
      brandTagline: text(company.brandTagline), brandColor: text(company.brandColor, "#1D4ED8"),
      logoIcon: text(company.logoIcon), logoColor: text(company.logoColor, "0"),
    })),
    projects,
    metrics,
  };
}

type ToolSpec = {
  listKey: string;
  kind: string;
  query: string;
  map(record: Record<string, unknown>): WorkItem;
};

function item(spec: {
  kind: string;
  record: Record<string, unknown>;
  reference?: unknown;
  title?: unknown;
  status?: unknown;
  dueAt?: unknown;
  owner?: unknown;
  amount?: unknown;
}): WorkItem {
  return {
    id: text(spec.record.id),
    kind: spec.kind,
    reference: text(spec.reference),
    title: text(spec.title, "Untitled record"),
    status: text(spec.status, "recorded"),
    dueAt: dateOf(spec.dueAt),
    owner: nameOf(spec.owner) || text(spec.owner, "Unassigned"),
    amountMinor: money(spec.amount),
    allowedTransitions: [],
  };
}

const specs: Record<string, readonly ToolSpec[]> = {
  overview: [
    { listKey: "RFI", kind: "RFI", query: "id number subject status dueAt ballInCourt { name }", map: r => item({ kind: "RFI", record: r, reference: r.number, title: r.subject, status: r.status, dueAt: r.dueAt, owner: r.ballInCourt }) },
    { listKey: "Submittal", kind: "Submittal", query: "id number title status dueAt ballInCourt { name }", map: r => item({ kind: "Submittal", record: r, reference: r.number, title: r.title, status: r.status, dueAt: r.dueAt, owner: r.ballInCourt }) },
    { listKey: "ChangeEvent", kind: "Change event", query: "id number title status dueAt estimatedCostMinor owner { name }", map: r => item({ kind: "Change event", record: r, reference: r.number, title: r.title, status: r.status, dueAt: r.dueAt, owner: r.owner, amount: r.estimatedCostMinor }) },
    { listKey: "ScheduleTask", kind: "Schedule task", query: "id taskCode name status plannedFinish assignedTo { name }", map: r => item({ kind: "Schedule task", record: r, reference: r.taskCode, title: r.name, status: r.status, dueAt: r.plannedFinish, owner: r.assignedTo }) },
    { listKey: "PunchItem", kind: "Punch", query: "id number title status dueAt assignedTo { name }", map: r => item({ kind: "Punch", record: r, reference: r.number, title: r.title, status: r.status, dueAt: r.dueAt, owner: r.assignedTo }) },
  ],
  preconstruction: [
    { listKey: "BidPackage", kind: "Bid package", query: "id number title status dueAt bidManager { name }", map: r => item({ kind: "Bid package", record: r, reference: r.number, title: r.title, status: r.status, dueAt: r.dueAt, owner: r.bidManager }) },
    { listKey: "BidInvitation", kind: "Bid invitation", query: "id status sentAt respondedAt tradePartner { name } bidPackage { number title dueAt }", map: r => item({ kind: "Bid invitation", record: r, reference: (r.bidPackage as { number?: unknown })?.number, title: (r.bidPackage as { title?: unknown })?.title, status: r.status, dueAt: (r.bidPackage as { dueAt?: unknown })?.dueAt, owner: r.tradePartner }) },
    { listKey: "BidSubmission", kind: "Bid submission", query: "id submissionNumber status totalMinor submittedAt tradePartner { name }", map: r => item({ kind: "Bid submission", record: r, reference: r.submissionNumber, title: nameOf(r.tradePartner), status: r.status, dueAt: r.submittedAt, owner: r.tradePartner, amount: r.totalMinor }) },
    { listKey: "Estimate", kind: "Estimate", query: "id number title status estimator { name }", map: r => item({ kind: "Estimate", record: r, reference: r.number, title: r.title, status: r.status, owner: r.estimator }) },
  ],
  financials: [
    { listKey: "BudgetLineItem", kind: "Budget line", query: "id description revisedAmountMinor projectedFinalCostMinor budgetCode { code }", map: r => item({ kind: "Budget line", record: r, reference: (r.budgetCode as { code?: unknown })?.code, title: r.description, status: "current", amount: r.revisedAmountMinor }) },
    { listKey: "DirectCost", kind: "Direct cost", query: "id referenceNumber description status costDate amountMinor tradePartner { name }", map: r => item({ kind: "Direct cost", record: r, reference: r.referenceNumber, title: r.description, status: r.status, dueAt: r.costDate, owner: r.tradePartner, amount: r.amountMinor }) },
    { listKey: "BudgetChange", kind: "Budget change", query: "id number title status totalAmountMinor requestedBy { name }", map: r => item({ kind: "Budget change", record: r, reference: r.number, title: r.title, status: r.status, owner: r.requestedBy, amount: r.totalAmountMinor }) },
  ],
  contracts: [
    { listKey: "PrimeContract", kind: "Prime contract", query: "id number title status revisedContractMinor client { name }", map: r => item({ kind: "Prime contract", record: r, reference: r.number, title: r.title, status: r.status, owner: r.client, amount: r.revisedContractMinor }) },
    { listKey: "Commitment", kind: "Commitment", query: "id number title status revisedContractMinor tradePartner { name }", map: r => item({ kind: "Commitment", record: r, reference: r.number, title: r.title, status: r.status, owner: r.tradePartner, amount: r.revisedContractMinor }) },
    { listKey: "ChangeEvent", kind: "Change event", query: "id number title status dueAt estimatedCostMinor owner { name }", map: r => item({ kind: "Change event", record: r, reference: r.number, title: r.title, status: r.status, dueAt: r.dueAt, owner: r.owner, amount: r.estimatedCostMinor }) },
    { listKey: "ChangeOrder", kind: "Change order", query: "id number title status totalMinor approvedBy { name }", map: r => item({ kind: "Change order", record: r, reference: r.number, title: r.title, status: r.status, owner: r.approvedBy, amount: r.totalMinor }) },
  ],
  procurement: [
    { listKey: "ProcurementRequest", kind: "Procurement request", query: "id requestNumber title status neededBy totalEstimatedMinor tradePartner { name }", map: r => item({ kind: "Procurement request", record: r, reference: r.requestNumber, title: r.title, status: r.status, dueAt: r.neededBy, owner: r.tradePartner, amount: r.totalEstimatedMinor }) },
    { listKey: "MaterialReceipt", kind: "Material receipt", query: "id receiptNumber status receivedAt tradePartner { name }", map: r => item({ kind: "Material receipt", record: r, reference: r.receiptNumber, title: "Material receipt", status: r.status, dueAt: r.receivedAt, owner: r.tradePartner }) },
    { listKey: "Commitment", kind: "Subcontract / PO", query: "id number title commitmentType status revisedContractMinor tradePartner { name }", map: r => item({ kind: "Subcontract / PO", record: r, reference: r.number, title: r.title, status: r.status, owner: r.tradePartner, amount: r.revisedContractMinor }) },
    { listKey: "BidInvitation", kind: "Bid invitation", query: "id status sentAt respondedAt tradePartner { name } bidPackage { number title }", map: r => item({ kind: "Bid invitation", record: r, reference: (r.bidPackage as { number?: unknown })?.number, title: nameOf(r.tradePartner), status: r.status, dueAt: r.respondedAt || r.sentAt, owner: r.tradePartner }) },
    { listKey: "ResourceLog", kind: "Material / equipment activity", query: "id resourceType eventType occurredAt quantity totalCostMinor tradePartner { name }", map: r => item({ kind: "Material / equipment activity", record: r, reference: r.resourceType, title: r.eventType, status: "recorded", dueAt: r.occurredAt, owner: r.tradePartner, amount: r.totalCostMinor }) },
    { listKey: "LienWaiver", kind: "Payment readiness", query: "id waiverNumber status throughDate amountMinor tradePartner { name }", map: r => item({ kind: "Payment readiness", record: r, reference: r.waiverNumber, title: nameOf(r.tradePartner), status: r.status, dueAt: r.throughDate, owner: r.tradePartner, amount: r.amountMinor }) },
  ],
  execution: [
    { listKey: "RFI", kind: "RFI", query: "id number subject status dueAt ballInCourt { name }", map: r => item({ kind: "RFI", record: r, reference: r.number, title: r.subject, status: r.status, dueAt: r.dueAt, owner: r.ballInCourt }) },
    { listKey: "Submittal", kind: "Submittal", query: "id number title status dueAt ballInCourt { name }", map: r => item({ kind: "Submittal", record: r, reference: r.number, title: r.title, status: r.status, dueAt: r.dueAt, owner: r.ballInCourt }) },
  ],
  field: [
    { listKey: "DailyLog", kind: "Daily log", query: "id logDate status weatherSummary preparedBy { name }", map: r => item({ kind: "Daily log", record: r, reference: dateOf(r.logDate), title: r.weatherSummary || "Daily field record", status: r.status, dueAt: r.logDate, owner: r.preparedBy }) },
    { listKey: "ScheduleTask", kind: "Schedule task", query: "id taskCode name status plannedFinish assignedTo { name }", map: r => item({ kind: "Schedule task", record: r, reference: r.taskCode, title: r.name, status: r.status, dueAt: r.plannedFinish, owner: r.assignedTo }) },
    { listKey: "LaborEntry", kind: "Labor", query: "id workerName workDate totalCostMinor tradePartner { name }", map: r => item({ kind: "Labor", record: r, reference: dateOf(r.workDate), title: r.workerName, dueAt: r.workDate, owner: r.tradePartner, amount: r.totalCostMinor }) },
    { listKey: "ResourceLog", kind: "Resource", query: "id resourceType eventType occurredAt totalCostMinor operator { name }", map: r => item({ kind: "Resource", record: r, reference: r.resourceType, title: r.eventType, dueAt: r.occurredAt, owner: r.operator, amount: r.totalCostMinor }) },
  ],
  schedule: [
    { listKey: "Schedule", kind: "Schedule", query: "id name scheduleType status dataDate publishedAt publishedBy { name }", map: r => item({ kind: "Schedule", record: r, reference: r.scheduleType, title: r.name, status: r.status, dueAt: r.dataDate, owner: r.publishedBy }) },
    { listKey: "ScheduleTask", kind: "Schedule task", query: "id taskCode name status plannedStart plannedFinish percentComplete assignedTo { name }", map: r => item({ kind: "Schedule task", record: r, reference: r.taskCode, title: r.name, status: r.status, dueAt: r.plannedFinish, owner: r.assignedTo }) },
  ],
  "quality-safety": [
    { listKey: "SafetyIncident", kind: "Incident", query: "id incidentNumber title status occurredAt investigator { name }", map: r => item({ kind: "Incident", record: r, reference: r.incidentNumber, title: r.title, status: r.status, dueAt: r.occurredAt, owner: r.investigator }) },
    { listKey: "SafetyObservation", kind: "Observation", query: "id observationNumber title status dueAt assignedTo { name }", map: r => item({ kind: "Observation", record: r, reference: r.observationNumber, title: r.title, status: r.status, dueAt: r.dueAt, owner: r.assignedTo }) },
    { listKey: "Inspection", kind: "Inspection", query: "id inspectionNumber title status scheduledAt inspector { name }", map: r => item({ kind: "Inspection", record: r, reference: r.inspectionNumber, title: r.title, status: r.status, dueAt: r.scheduledAt, owner: r.inspector }) },
    { listKey: "CorrectiveAction", kind: "Corrective action", query: "id actionNumber title status dueAt assignedTo { name }", map: r => item({ kind: "Corrective action", record: r, reference: r.actionNumber, title: r.title, status: r.status, dueAt: r.dueAt, owner: r.assignedTo }) },
    { listKey: "PunchItem", kind: "Punch", query: "id number title status dueAt assignedTo { name }", map: r => item({ kind: "Punch", record: r, reference: r.number, title: r.title, status: r.status, dueAt: r.dueAt, owner: r.assignedTo }) },
  ],
  documents: [
    { listKey: "Drawing", kind: "Drawing", query: "id drawingNumber title status discipline currentRevision { revisionNumber issuedAt }", map: r => item({ kind: "Drawing", record: r, reference: r.drawingNumber, title: r.title, status: r.status, dueAt: (r.currentRevision as { issuedAt?: unknown })?.issuedAt, owner: r.discipline }) },
    { listKey: "Document", kind: "Document", query: "id documentNumber title status documentType currentVersion { versionNumber issuedAt }", map: r => item({ kind: "Document", record: r, reference: r.documentNumber, title: r.title, status: r.status, dueAt: (r.currentVersion as { issuedAt?: unknown })?.issuedAt, owner: r.documentType }) },
  ],
  billing: [
    { listKey: "ProgressClaim", kind: "Progress claim", query: "id claimNumber status dueAt currentPaymentDueMinor tradePartner { name }", map: r => item({ kind: "Progress claim", record: r, reference: r.claimNumber, title: nameOf(r.tradePartner), status: r.status, dueAt: r.dueAt, owner: r.tradePartner, amount: r.currentPaymentDueMinor }) },
    { listKey: "Payment", kind: "Payment", query: "id paymentNumber status paidAt amountMinor tradePartner { name }", map: r => item({ kind: "Payment", record: r, reference: r.paymentNumber, title: nameOf(r.tradePartner), status: r.status, dueAt: r.paidAt, owner: r.tradePartner, amount: r.amountMinor }) },
    { listKey: "RetainageRelease", kind: "Retainage release", query: "id releaseNumber status amountMinor requestedAt approvedBy { name }", map: r => item({ kind: "Retainage release", record: r, reference: r.releaseNumber, title: "Retainage release", status: r.status, dueAt: r.requestedAt, owner: r.approvedBy, amount: r.amountMinor }) },
    { listKey: "LienWaiver", kind: "Lien waiver", query: "id waiverNumber status throughDate amountMinor tradePartner { name }", map: r => item({ kind: "Lien waiver", record: r, reference: r.waiverNumber, title: nameOf(r.tradePartner), status: r.status, dueAt: r.throughDate, owner: r.tradePartner, amount: r.amountMinor }) },
  ],
  team: [
    { listKey: "ProjectMembership", kind: "Team member", query: "id accessLevel status user { id name email }", map: r => item({ kind: "Team member", record: r, reference: (r.user as { email?: unknown })?.email, title: nameOf(r.user), status: r.status, owner: r.accessLevel }) },
  ],
  reports: [
    { listKey: "BudgetLineItem", kind: "Job cost / forecast", query: "id description revisedAmountMinor projectedFinalCostMinor projectedOverUnderMinor budgetCode { code }", map: r => item({ kind: "Job cost / forecast", record: r, reference: (r.budgetCode as { code?: unknown })?.code, title: r.description, status: BigInt(String(r.projectedOverUnderMinor ?? 0)) < BigInt(0) ? "over_budget" : "within_budget", amount: r.projectedFinalCostMinor }) },
    { listKey: "Commitment", kind: "Commitment exposure", query: "id number title status revisedContractMinor tradePartner { name }", map: r => item({ kind: "Commitment exposure", record: r, reference: r.number, title: r.title, status: r.status, owner: r.tradePartner, amount: r.revisedContractMinor }) },
    { listKey: "ChangeOrder", kind: "Change exposure", query: "id number title status totalMinor approvedBy { name }", map: r => item({ kind: "Change exposure", record: r, reference: r.number, title: r.title, status: r.status, owner: r.approvedBy, amount: r.totalMinor }) },
    { listKey: "RFI", kind: "RFI aging", query: "id number subject status dueAt ballInCourt { name }", map: r => item({ kind: "RFI aging", record: r, reference: r.number, title: r.subject, status: r.status, dueAt: r.dueAt, owner: r.ballInCourt }) },
    { listKey: "Submittal", kind: "Submittal aging", query: "id number title status dueAt ballInCourt { name }", map: r => item({ kind: "Submittal aging", record: r, reference: r.number, title: r.title, status: r.status, dueAt: r.dueAt, owner: r.ballInCourt }) },
    { listKey: "ProgressClaim", kind: "Claim aging", query: "id claimNumber status dueAt currentPaymentDueMinor tradePartner { name }", map: r => item({ kind: "Claim aging", record: r, reference: r.claimNumber, title: nameOf(r.tradePartner), status: r.status, dueAt: r.dueAt, owner: r.tradePartner, amount: r.currentPaymentDueMinor }) },
    { listKey: "Payment", kind: "Payment register", query: "id paymentNumber status paidAt amountMinor reference tradePartner { name }", map: r => item({ kind: "Payment register", record: r, reference: r.paymentNumber, title: text(r.reference, nameOf(r.tradePartner)), status: r.status, dueAt: r.paidAt, owner: r.tradePartner, amount: r.amountMinor }) },
    { listKey: "LienWaiver", kind: "Waiver aging", query: "id waiverNumber status throughDate amountMinor tradePartner { name }", map: r => item({ kind: "Waiver aging", record: r, reference: r.waiverNumber, title: nameOf(r.tradePartner), status: r.status, dueAt: r.throughDate, owner: r.tradePartner, amount: r.amountMinor }) },
    { listKey: "LaborEntry", kind: "Labor actual", query: "id workerName workDate regularHours totalCostMinor tradePartner { name }", map: r => item({ kind: "Labor actual", record: r, reference: dateOf(r.workDate), title: `${text(r.workerName)} · ${String(r.regularHours ?? 0)}h`, status: "recorded", dueAt: r.workDate, owner: r.tradePartner, amount: r.totalCostMinor }) },
    { listKey: "SafetyObservation", kind: "Safety aging", query: "id observationNumber title status dueAt assignedTo { name }", map: r => item({ kind: "Safety aging", record: r, reference: r.observationNumber, title: r.title, status: r.status, dueAt: r.dueAt, owner: r.assignedTo }) },
    { listKey: "Inspection", kind: "Inspection quality", query: "id inspectionNumber title status scheduledAt inspector { name }", map: r => item({ kind: "Inspection quality", record: r, reference: r.inspectionNumber, title: r.title, status: r.status, dueAt: r.scheduledAt, owner: r.inspector }) },
    { listKey: "CorrectiveAction", kind: "Corrective aging", query: "id actionNumber title status dueAt assignedTo { name }", map: r => item({ kind: "Corrective aging", record: r, reference: r.actionNumber, title: r.title, status: r.status, dueAt: r.dueAt, owner: r.assignedTo }) },
  ],
  audit: [
    { listKey: "AgentAction", kind: "Audit event", query: "id action status targetType targetId targetStatus reason requestedAt actorUser { name } requestedBy { name }", map: r => item({ kind: "Audit event", record: r, reference: `${text(r.targetType)}:${text(r.targetId)}`, title: text(r.action), status: r.status, dueAt: r.requestedAt, owner: r.actorUser || r.requestedBy }) },
    { listKey: "OutboxMessage", kind: "Outbox", query: "id eventType aggregateType aggregateId status availableAt attempts", map: r => item({ kind: "Outbox", record: r, reference: `${text(r.aggregateType)}:${text(r.aggregateId)}`, title: r.eventType, status: r.status, dueAt: r.availableAt, owner: `${String(r.attempts ?? 0)} attempts` }) },
    { listKey: "IdempotencyKey", kind: "Idempotency", query: "id operation key status resourceType resourceId createdAt", map: r => item({ kind: "Idempotency", record: r, reference: r.key, title: r.operation, status: r.status, dueAt: r.createdAt, owner: r.resourceType }) },
  ],
};

const internalOnlyTools = new Set([
  "financials",
  "contracts",
  "procurement",
  "billing",
  "reports",
  "team",
  "audit",
]);

const externalSafeListKeys: Partial<Record<string, ReadonlySet<string>>> = {
  overview: new Set(["RFI", "Submittal", "ScheduleTask", "PunchItem"]),
  preconstruction: new Set(["BidInvitation"]),
  execution: new Set(["RFI", "Submittal"]),
  field: new Set(["DailyLog", "ScheduleTask"]),
  schedule: new Set(["ScheduleTask"]),
  "quality-safety": new Set(["SafetyIncident", "SafetyObservation", "Inspection", "CorrectiveAction", "PunchItem"]),
  documents: new Set(),
};

const externalDomainPermissions: Record<string, readonly [Permission, Permission]> = {
  BidInvitation: ["canReadPreconstruction", "canManagePreconstruction"],
  RFI: ["canReadProjectExecution", "canManageProjectExecution"],
  Submittal: ["canReadProjectExecution", "canManageProjectExecution"],
  ScheduleTask: ["canReadProjectExecution", "canManageProjectExecution"],
  DailyLog: ["canReadFieldOperations", "canManageFieldOperations"],
  PunchItem: ["canReadFieldOperations", "canManageFieldOperations"],
  SafetyIncident: ["canReadSafety", "canManageSafety"],
  SafetyObservation: ["canReadSafety", "canManageSafety"],
  Inspection: ["canReadSafety", "canManageSafety"],
  CorrectiveAction: ["canReadSafety", "canManageSafety"],
};

function externalRecordFilter(session: Session, listKey: string, projectId: string, companyId: string): Record<string, unknown> | false {
  const user = { id: { equals: session.itemId } };
  switch (listKey) {
    case "BidInvitation": {
      const organizationIds = session.data.projectMemberships?.filter(entry => entry.status === "active" && entry.portalType !== "internal" && entry.project?.id === projectId && entry.project.company?.id === companyId).map(entry => entry.portalOrganization?.id).filter(Boolean) as string[] | undefined;
      return organizationIds?.length ? { tradePartner: { id: { in: organizationIds } } } : false;
    }
    case "RFI": {
      const organizationIds = session.data.projectMemberships?.filter(entry =>
        entry.status === "active" && entry.portalType !== "internal" &&
        (!projectId || entry.project?.id === projectId) &&
        (!companyId || entry.project?.company?.id === companyId),
      ).map(entry => entry.portalOrganization?.id).filter(Boolean) as string[] | undefined;
      return { OR: [{ ballInCourt: user }, ...(organizationIds?.length ? [{ responsiblePartner: { id: { in: organizationIds } } }] : [])] };
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

const lifecyclePermissions: Partial<Record<LifecycleListKey, Permission>> = {
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
  ProcurementRequest: "canManageContracts",
};

const commandPermissions: Record<string, Permission> = {
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
  transitionProjectStatus: "canManageProjects",
};

const toolCommands: Record<string, readonly string[]> = {
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
  audit: ["issueApiCredential"],
};

/** Next lifecycle states this session may move a record to, for native detail screens. */
export function recordAllowedTransitions(session: Session, listKey: string, status: string, companyId: string, projectId: string): string[] {
  if (!(listKey in lifecyclePolicies)) return [];
  const permission = lifecyclePermissions[listKey as LifecycleListKey];
  if (!permission || !canWriteProjectFromSession(session, companyId, projectId) ||
      !hasProjectPermission(session, companyId, projectId, permission, true)) return [];
  const policy = lifecyclePolicies[listKey as LifecycleListKey] as Record<string, readonly string[]>;
  return [...(policy[status] ?? [])];
}

function allowedTransitions(
  session: Session,
  spec: ToolSpec,
  status: string,
  companyId: string,
  projectId: string,
  canWriteProject: boolean,
): string[] {
  if (!canWriteProject || !(spec.listKey in lifecyclePolicies)) return [];
  const listKey = spec.listKey as LifecycleListKey;
  const permission = lifecyclePermissions[listKey];
  if (!permission || !hasProjectPermission(session, companyId, projectId, permission, true)) return [];
  const policy = lifecyclePolicies[listKey] as Record<string, readonly string[]>;
  return [...(policy[status] ?? [])];
}

function availableCommands(
  session: Session,
  tool: string,
  audience: Audience,
  companyId: string,
  projectId: string,
  canWriteProject: boolean,
): string[] {
  if (!canWriteProject || audience === "external") return [];
  return (toolCommands[tool] ?? []).filter(operation =>
    hasProjectPermission(session, companyId, projectId, commandPermissions[operation], true),
  );
}

async function loadWorkItems(
  context: ConstructionQueryContext,
  projectId: string,
  tool: string,
  audience: Audience,
  companyId: string,
  canWriteProject: boolean,
  page = 1,
): Promise<{ items: WorkItem[]; groups: Array<{ kind: string; totalCount: number }> }> {
  const selected = tool;
  const selectedSpecs = specs[selected];
  if (!selectedSpecs) throw new Error("Unknown construction workspace tool");
  if (audience === "external" && internalOnlyTools.has(tool)) return { items: [], groups: [] };
  const take = selected === "reports" ? MAX_REPORT_ROWS_PER_LIST : MAX_ITEMS_PER_LIST;
  const session = requireSession(context);
  const externalAllowlist = audience === "external" ? externalSafeListKeys[selected] : undefined;
  const visibleSpecs = externalAllowlist
    ? selectedSpecs.filter(spec => externalAllowlist.has(spec.listKey))
    : selectedSpecs;
  const groups = await Promise.all(visibleSpecs.map(async spec => {
    const required = externalDomainPermissions[spec.listKey];
    if (audience === "external" && (!required || !hasEitherProjectPermission(session, companyId, projectId, ...required))) return null;
    const externalFilter = audience === "external" ? externalRecordFilter(session, spec.listKey, projectId, companyId) : null;
    if (externalFilter === false) return null;
    const query = audience === "external" ? (context.sudo?.().query ?? context.query) : context.query;
    const where = {
      AND: [
        { project: { id: { equals: projectId } } },
        ...(externalFilter ? [externalFilter] : []),
      ],
    };
    const [records, totalCount] = await Promise.all([
      query[spec.listKey].findMany({
        where,
        take,
        skip: selected === "reports" ? 0 : (page - 1) * take,
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        query: spec.query,
      }),
      query[spec.listKey].count({ where }),
    ]);
    const items = records.map(spec.map).map(entry => ({
      ...entry,
      amountMinor: audience === "external" ? null : entry.amountMinor,
      allowedTransitions: audience === "external"
        ? []
        : allowedTransitions(session, spec, entry.status, companyId, projectId, canWriteProject),
    }));
    return { kind: spec.kind, totalCount, items };
  }));
  // Each record type pages independently (newest first within its type), so
  // no type is starved by another and every record stays reachable.
  const visible = groups.filter((group): group is NonNullable<typeof group> => group !== null);
  return {
    items: visible.flatMap(group => group.items),
    groups: visible.map(group => ({ kind: group.kind, totalCount: group.totalCount })),
  };
}

const procurementRequestStatuses = new Set([
  "draft", "submitted", "approved", "ordered", "partially_received", "received", "closed", "rejected", "cancelled",
]);
const PROCUREMENT_REQUEST_PAGE_SIZE = 20;

export async function constructionProcurementRequestRegister(
  _root: unknown,
  { projectId, page, status }: { projectId: string; page: number; status?: string | null },
  context: ConstructionQueryContext,
) {
  const session = requireSession(context);
  if (!projectId) throw new Error("Project id is required");
  const project = await context.query.Project.findOne({ where: { id: projectId }, query: "id company { id }" });
  const companyId = idOf(project?.company);
  if (!project?.id || !companyId || audienceForProject(session, companyId, projectId) !== "internal" ||
      !hasEitherProjectPermission(session, companyId, projectId, "canReadContracts", "canManageContracts")) {
    throw new Error("Procurement request register not found");
  }
  const selectedStatus = status?.trim() || "all";
  if (selectedStatus !== "all" && !procurementRequestStatuses.has(selectedStatus)) {
    throw new Error("Unsupported procurement request status filter");
  }
  const where = {
    company: { id: { equals: companyId } },
    project: { id: { equals: projectId } },
    ...(selectedStatus === "all" ? {} : { status: { equals: selectedStatus } }),
  };
  const totalCount = await context.query.ProcurementRequest.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / PROCUREMENT_REQUEST_PAGE_SIZE));
  const currentPage = Math.min(Math.max(Number.isSafeInteger(page) ? page : 1, 1), totalPages);
  const records = await context.query.ProcurementRequest.findMany({
    where,
    take: PROCUREMENT_REQUEST_PAGE_SIZE,
    skip: (currentPage - 1) * PROCUREMENT_REQUEST_PAGE_SIZE,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    query: "id requestNumber title status neededBy tradePartner { name }",
  });
  const procurementSpec = specs.procurement.find(spec => spec.listKey === "ProcurementRequest");
  if (!procurementSpec) throw new Error("Procurement request projection is unavailable");
  const canWriteProject = canWriteProjectFromSession(session, companyId, projectId);
  return {
    projectId,
    page: currentPage,
    pageSize: PROCUREMENT_REQUEST_PAGE_SIZE,
    totalCount,
    totalPages,
    status: selectedStatus,
    items: records.map(record => {
      const projected = item({
        kind: "Procurement request",
        record,
        reference: record.requestNumber,
        title: record.title,
        status: record.status,
        dueAt: record.neededBy,
        owner: record.tradePartner,
      });
      return {
        ...projected,
        allowedTransitions: allowedTransitions(session, procurementSpec, projected.status, companyId, projectId, canWriteProject),
      };
    }),
  };
}

const materialReceiptStatuses = new Set(["recorded", "accepted_with_exceptions", "rejected", "voided"]);
const MATERIAL_RECEIPT_REGISTER_PAGE_SIZE = 20;

export async function constructionMaterialReceiptRegister(
  _root: unknown,
  { projectId, page, status }: { projectId: string; page: number; status?: string | null },
  context: ConstructionQueryContext,
) {
  const session = requireSession(context);
  if (!projectId) throw new Error("Project id is required");
  const project = await context.query.Project.findOne({ where: { id: projectId }, query: "id company { id }" });
  const companyId = idOf(project?.company);
  if (!project?.id || !companyId || audienceForProject(session, companyId, projectId) !== "internal" ||
      !hasEitherProjectPermission(session, companyId, projectId, "canReadContracts", "canManageContracts")) {
    throw new Error("Material receipt register not found");
  }
  const selectedStatus = status?.trim() || "all";
  if (selectedStatus !== "all" && !materialReceiptStatuses.has(selectedStatus)) {
    throw new Error("Unsupported material receipt status filter");
  }
  const where = {
    company: { id: { equals: companyId } },
    project: { id: { equals: projectId } },
    ...(selectedStatus === "all" ? {} : { status: { equals: selectedStatus } }),
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
    query: "id receiptNumber status receivedAt",
  });
  return {
    projectId,
    page: currentPage,
    pageSize: MATERIAL_RECEIPT_REGISTER_PAGE_SIZE,
    totalCount,
    totalPages,
    status: selectedStatus,
    items: records.map(record => ({
      id: text(record.id),
      reference: text(record.receiptNumber),
      status: text(record.status),
      receivedAt: dateOf(record.receivedAt),
    })),
  };
}

const commitmentStatuses = new Set(["draft", "out_for_signature", "executed", "complete", "closed", "cancelled", "terminated"]);
const PROCUREMENT_COMMITMENT_REGISTER_PAGE_SIZE = 20;

export async function constructionProcurementCommitmentRegister(
  _root: unknown,
  { projectId, page, status }: { projectId: string; page: number; status?: string | null },
  context: ConstructionQueryContext,
) {
  const session = requireSession(context);
  if (!projectId) throw new Error("Project id is required");
  const project = await context.query.Project.findOne({ where: { id: projectId }, query: "id company { id }" });
  const companyId = idOf(project?.company);
  if (!project?.id || !companyId || audienceForProject(session, companyId, projectId) !== "internal" ||
      !hasEitherProjectPermission(session, companyId, projectId, "canReadContracts", "canManageContracts")) {
    throw new Error("Commitment register not found");
  }
  const selectedStatus = status?.trim() || "all";
  if (selectedStatus !== "all" && !commitmentStatuses.has(selectedStatus)) {
    throw new Error("Unsupported commitment status filter");
  }
  const where = {
    company: { id: { equals: companyId } },
    project: { id: { equals: projectId } },
    ...(selectedStatus === "all" ? {} : { status: { equals: selectedStatus } }),
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
    query: "id number title commitmentType status",
  });
  return {
    projectId,
    page: currentPage,
    pageSize: PROCUREMENT_COMMITMENT_REGISTER_PAGE_SIZE,
    totalCount,
    totalPages,
    status: selectedStatus,
    items: records.map(record => ({
      id: text(record.id),
      number: text(record.number),
      title: text(record.title),
      commitmentType: text(record.commitmentType),
      status: text(record.status),
    })),
  };
}

const bidInvitationStatuses = new Set(["draft", "invited", "viewed", "intent_to_bid", "declined", "submitted"]);
const PROCUREMENT_BID_INVITATION_REGISTER_PAGE_SIZE = 20;

export async function constructionProcurementBidInvitationRegister(
  _root: unknown,
  { projectId, page, status }: { projectId: string; page: number; status?: string | null },
  context: ConstructionQueryContext,
) {
  const session = requireSession(context);
  if (!projectId) throw new Error("Project id is required");
  const project = await context.query.Project.findOne({ where: { id: projectId }, query: "id company { id }" });
  const companyId = idOf(project?.company);
  if (!project?.id || !companyId || audienceForProject(session, companyId, projectId) !== "internal" ||
      !hasEitherProjectPermission(session, companyId, projectId, "canReadPreconstruction", "canManagePreconstruction")) {
    throw new Error("Bid invitation register not found");
  }
  const selectedStatus = status?.trim() || "all";
  if (selectedStatus !== "all" && !bidInvitationStatuses.has(selectedStatus)) {
    throw new Error("Unsupported bid invitation status filter");
  }
  const where = {
    company: { id: { equals: companyId } },
    project: { id: { equals: projectId } },
    ...(selectedStatus === "all" ? {} : { status: { equals: selectedStatus } }),
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
    query: "id status sentAt respondedAt bidPackage { id number }",
  });
  return {
    projectId,
    page: currentPage,
    pageSize: PROCUREMENT_BID_INVITATION_REGISTER_PAGE_SIZE,
    totalCount,
    totalPages,
    status: selectedStatus,
    items: records.map(record => {
      const bidPackage = record.bidPackage && typeof record.bidPackage === "object"
        ? record.bidPackage as Record<string, unknown>
        : null;
      const bidPackageId = idOf(bidPackage);
      const bidPackageNumber = text(bidPackage?.number);
      return {
        id: text(record.id),
        status: text(record.status),
        sentAt: dateOf(record.sentAt),
        respondedAt: dateOf(record.respondedAt),
        bidPackage: bidPackageId && bidPackageNumber ? { id: bidPackageId, number: bidPackageNumber } : null,
      };
    }),
  };
}

const lienWaiverStatuses = new Set(["requested", "received", "accepted", "rejected", "expired"]);
const PROCUREMENT_LIEN_WAIVER_REGISTER_PAGE_SIZE = 20;

export async function constructionProcurementLienWaiverRegister(
  _root: unknown,
  { projectId, page, status }: { projectId: string; page: number; status?: string | null },
  context: ConstructionQueryContext,
) {
  const session = requireSession(context);
  if (!projectId) throw new Error("Project id is required");
  const project = await context.query.Project.findOne({ where: { id: projectId }, query: "id company { id }" });
  const companyId = idOf(project?.company);
  if (!project?.id || !companyId || audienceForProject(session, companyId, projectId) !== "internal" ||
      !hasEitherProjectPermission(session, companyId, projectId, "canReadBilling", "canManageBilling")) {
    throw new Error("Lien waiver register not found");
  }
  const selectedStatus = status?.trim() || "all";
  if (selectedStatus !== "all" && !lienWaiverStatuses.has(selectedStatus)) {
    throw new Error("Unsupported lien waiver status filter");
  }
  const where = {
    company: { id: { equals: companyId } },
    project: { id: { equals: projectId } },
    ...(selectedStatus === "all" ? {} : { status: { equals: selectedStatus } }),
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
    query: "id waiverNumber waiverType status throughDate",
  });
  return {
    projectId,
    page: currentPage,
    pageSize: PROCUREMENT_LIEN_WAIVER_REGISTER_PAGE_SIZE,
    totalCount,
    totalPages,
    status: selectedStatus,
    items: records.map(record => ({
      id: text(record.id),
      waiverNumber: text(record.waiverNumber),
      waiverType: text(record.waiverType),
      status: text(record.status),
      throughDate: dateOf(record.throughDate),
    })),
  };
}

const inspectionStatuses = new Set(["scheduled", "in_progress", "passed", "failed", "closed", "cancelled"]);
const INSPECTION_REGISTER_PAGE_SIZE = 20;

export async function constructionInspectionRegister(
  _root: unknown,
  { projectId, page, status }: { projectId: string; page: number; status?: string | null },
  context: ConstructionQueryContext,
) {
  const session = requireSession(context);
  if (!projectId) throw new Error("Project id is required");
  const selectedStatus = status?.trim() || "all";
  if (selectedStatus !== "all" && !inspectionStatuses.has(selectedStatus)) {
    throw new Error("Unsupported inspection status filter");
  }

  const explicitMembership = session.data.projectMemberships?.find(entry =>
    entry.status === "active" && entry.project?.id === projectId,
  );
  const externalMembership = explicitMembership?.portalType === "internal" ? undefined : explicitMembership;
  const externalCompanyId = externalMembership?.project?.company?.id;
  if (externalMembership && !externalCompanyId) throw new Error("Inspection register not found");
  const externalContext = externalMembership ? context.sudo?.() : undefined;
  if (externalMembership && !externalContext) throw new Error("Inspection register not found");
  const queryContext = externalContext ?? context;
  const project = await queryContext.query.Project.findOne({ where: { id: projectId }, query: "id company { id }" });
  const companyId = idOf(project?.company);
  const audience = companyId ? audienceForProject(session, companyId, projectId) : "external";
  if (!project?.id || !companyId || (audience === "external" && !externalMembership) ||
      (externalMembership && externalCompanyId !== companyId) ||
      (audience === "internal" && !hasEitherProjectPermission(session, companyId, projectId, "canReadSafety", "canManageSafety"))) {
    throw new Error("Inspection register not found");
  }

  const externalFilter = audience === "external" ? externalRecordFilter(session, "Inspection", projectId, companyId) : null;
  if (externalFilter === false) throw new Error("Inspection register not found");
  const where = {
    company: { id: { equals: companyId } },
    project: { id: { equals: projectId } },
    ...(externalFilter ? externalFilter : {}),
    ...(selectedStatus === "all" ? {} : { status: { equals: selectedStatus } }),
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
    query: "id inspectionNumber title status scheduledAt inspector { name }",
  });
  const inspectionSpec = specs["quality-safety"].find(spec => spec.listKey === "Inspection");
  if (!inspectionSpec) throw new Error("Inspection projection is unavailable");
  const canWriteProject = audience === "internal" && canWriteProjectFromSession(session, companyId, projectId);
  return {
    projectId,
    page: currentPage,
    pageSize: INSPECTION_REGISTER_PAGE_SIZE,
    totalCount,
    totalPages,
    status: selectedStatus,
    audience,
    items: records.map(record => {
      const projected = item({
        kind: "Inspection",
        record,
        reference: record.inspectionNumber,
        title: record.title,
        status: record.status,
        dueAt: record.scheduledAt,
        owner: record.inspector,
      });
      return {
        ...projected,
        allowedTransitions: audience === "external"
          ? []
          : allowedTransitions(session, inspectionSpec, projected.status, companyId, projectId, canWriteProject),
      };
    }),
  };
}

const incidentStatuses = new Set(["reported", "investigating", "corrective_action", "closed"]);
const SAFETY_INCIDENT_REGISTER_PAGE_SIZE = 20;

export async function constructionSafetyIncidentRegister(
  _root: unknown,
  { projectId, page, status }: { projectId: string; page: number; status?: string | null },
  context: ConstructionQueryContext,
) {
  const session = requireSession(context);
  if (!projectId) throw new Error("Project id is required");
  const project = await context.query.Project.findOne({ where: { id: projectId }, query: "id company { id }" });
  const companyId = idOf(project?.company);
  if (!project?.id || !companyId || audienceForProject(session, companyId, projectId) !== "internal" ||
      !hasEitherProjectPermission(session, companyId, projectId, "canReadSafety", "canManageSafety")) {
    throw new Error("Safety incident register not found");
  }

  const selectedStatus = status?.trim() || "all";
  if (selectedStatus !== "all" && !incidentStatuses.has(selectedStatus)) {
    throw new Error("Unsupported safety incident status filter");
  }
  const where = {
    company: { id: { equals: companyId } },
    project: { id: { equals: projectId } },
    ...(selectedStatus === "all" ? {} : { status: { equals: selectedStatus } }),
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
    query: "id incidentNumber status occurredAt",
  });
  return {
    page: currentPage,
    pageSize: SAFETY_INCIDENT_REGISTER_PAGE_SIZE,
    totalCount,
    totalPages,
    status: selectedStatus,
    items: records.map(record => ({
      id: text(record.id),
      reference: text(record.incidentNumber),
      status: text(record.status),
      occurredAt: dateOf(record.occurredAt),
    })),
  };
}

const safetyObservationStatuses = new Set(["open", "assigned", "resolved", "closed"]);
const SAFETY_OBSERVATION_REGISTER_PAGE_SIZE = 20;

export async function constructionSafetyObservationRegister(
  _root: unknown,
  { projectId, page, status }: { projectId: string; page: number; status?: string | null },
  context: ConstructionQueryContext,
) {
  const session = requireSession(context);
  if (!projectId) throw new Error("Project id is required");
  const project = await context.query.Project.findOne({ where: { id: projectId }, query: "id company { id }" });
  const companyId = idOf(project?.company);
  if (!project?.id || !companyId || audienceForProject(session, companyId, projectId) !== "internal" ||
      !hasEitherProjectPermission(session, companyId, projectId, "canReadSafety", "canManageSafety")) {
    throw new Error("Safety observation register not found");
  }

  const selectedStatus = status?.trim() || "all";
  if (selectedStatus !== "all" && !safetyObservationStatuses.has(selectedStatus)) {
    throw new Error("Unsupported safety observation status filter");
  }
  const where = {
    company: { id: { equals: companyId } },
    project: { id: { equals: projectId } },
    ...(selectedStatus === "all" ? {} : { status: { equals: selectedStatus } }),
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
    query: "id observationNumber status observedAt",
  });
  return {
    page: currentPage,
    pageSize: SAFETY_OBSERVATION_REGISTER_PAGE_SIZE,
    totalCount,
    totalPages,
    status: selectedStatus,
    items: records.map(record => ({
      id: text(record.id),
      reference: text(record.observationNumber),
      status: text(record.status),
      observedAt: dateOf(record.observedAt),
    })),
  };
}

const rfiStatuses = new Set(["draft", "open", "answered", "closed", "voided"]);
const RFI_REGISTER_PAGE_SIZE = 20;

export async function constructionRfiRegister(
  _root: unknown,
  { projectId, page, status }: { projectId: string; page: number; status?: string | null },
  context: ConstructionQueryContext,
) {
  const session = requireSession(context);
  if (!projectId) throw new Error("Project id is required");
  const projectMemberships = (session.data.projectMemberships ?? []).filter(entry =>
    entry.status === "active" && entry.project?.id === projectId,
  );
  const membership = projectMemberships[0];
  const externalMembership = membership && membership.portalType !== "internal" ? membership : undefined;
  const externalCompanyId = externalMembership?.project?.company?.id;
  if (externalMembership && !externalCompanyId) throw new Error("RFI register not found");
  const externalContext = externalMembership ? context.sudo?.() : undefined;
  if (externalMembership && !externalContext) throw new Error("RFI register not found");
  const queryContext = externalContext ?? context;
  const project = await queryContext.query.Project.findOne({ where: { id: projectId }, query: "id company { id }" });
  const companyId = idOf(project?.company);
  const audience = companyId ? audienceForProject(session, companyId, projectId) : "external";
  const matchingExternalMemberships = projectMemberships.filter(entry =>
    entry.portalType !== "internal" && entry.project?.company?.id === companyId,
  );
  if (!project?.id || !companyId || (audience === "external" && matchingExternalMemberships.length === 0) ||
      (externalMembership && externalCompanyId !== companyId) ||
      (audience === "internal" && !hasEitherProjectPermission(session, companyId, projectId, "canReadProjectExecution", "canManageProjectExecution"))) {
    throw new Error("RFI register not found");
  }

  const selectedStatus = status?.trim() || "all";
  if (selectedStatus !== "all" && !rfiStatuses.has(selectedStatus)) {
    throw new Error("Unsupported RFI status filter");
  }
  const organizationIds = [...new Set(matchingExternalMemberships
    .map(entry => entry.portalOrganization?.id)
    .filter((id): id is string => Boolean(id)))];
  const externalParticipantFilter = audience === "external" ? {
    OR: [
      { ballInCourt: { id: { equals: session.itemId } } },
      ...(organizationIds.length ? [{ responsiblePartner: { id: { in: organizationIds } } }] : []),
    ],
  } : null;
  const where = {
    company: { id: { equals: companyId } },
    project: { id: { equals: projectId } },
    ...(externalParticipantFilter ?? {}),
    ...(selectedStatus === "all" ? {} : { status: { equals: selectedStatus } }),
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
    query: "id number subject status dueAt",
  });
  return {
    page: currentPage,
    pageSize: RFI_REGISTER_PAGE_SIZE,
    totalCount,
    totalPages,
    status: selectedStatus,
    audience,
    items: records.map(record => ({
      id: audience === "internal" ? text(record.id) : null,
      number: text(record.number),
      title: text(record.subject),
      status: text(record.status),
      dueAt: dateOf(record.dueAt),
    })),
  };
}

const submittalStatuses = new Set([
  "draft", "submitted", "under_review", "approved", "revise_resubmit", "rejected", "closed", "voided",
]);
const SUBMITTAL_REGISTER_PAGE_SIZE = 20;

export async function constructionSubmittalRegister(
  _root: unknown,
  { projectId, page, status }: { projectId: string; page: number; status?: string | null },
  context: ConstructionQueryContext,
) {
  const session = requireSession(context);
  if (!projectId) throw new Error("Project id is required");
  const selectedStatus = status?.trim() || "all";
  if (selectedStatus !== "all" && !submittalStatuses.has(selectedStatus)) {
    throw new Error("Unsupported submittal status filter");
  }
  const project = await context.query.Project.findOne({ where: { id: projectId }, query: "id company { id }" });
  const companyId = idOf(project?.company);
  if (!project?.id || !companyId || audienceForProject(session, companyId, projectId) !== "internal" ||
      !hasEitherProjectPermission(session, companyId, projectId, "canReadProjectExecution", "canManageProjectExecution")) {
    throw new Error("Submittal register not found");
  }

  const where = {
    company: { id: { equals: companyId } },
    project: { id: { equals: projectId } },
    ...(selectedStatus === "all" ? {} : { status: { equals: selectedStatus } }),
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
    query: "id number title status dueAt ballInCourt { name }",
  });
  return {
    projectId,
    page: currentPage,
    pageSize: SUBMITTAL_REGISTER_PAGE_SIZE,
    totalCount,
    totalPages,
    status: selectedStatus,
    items: records.map(record => item({
      kind: "Submittal",
      record,
      reference: record.number,
      title: record.title,
      status: record.status,
      dueAt: record.dueAt,
      owner: record.ballInCourt,
    })),
  };
}

export async function constructionProjectWorkspace(
  _root: unknown,
  { projectId, tool, page }: { projectId: string; tool: string; page?: number | null },
  context: ConstructionQueryContext,
) {
  const session = requireSession(context);
  if (!projectId) throw new Error("Project id is required");
  const selectedTool = tool || "overview";
  const externalGrant = session.data.projectMemberships?.find(entry => entry.status === "active" && entry.project?.id === projectId && entry.portalType !== "internal");
  if (externalGrant) {
    const companyId = externalGrant.project?.company?.id;
    if (!companyId || !hasSessionProjectAccess(session, companyId, projectId) ||
        !hasEitherProjectPermission(session, companyId, projectId, "canReadProjects", "canManageProjects")) throw new Error("Project not found");
  }
  const project = externalGrant && context.sudo
    ? await context.sudo().query.Project.findOne({ where: { id: projectId }, query: projectIdentityQuery })
    : await context.query.Project.findOne({ where: { id: projectId }, query: projectSummaryQuery });
  if (!project) throw new Error("Project not found");
  const companyId = idOf(project.company);
  const audience = audienceForProject(session, companyId, projectId);
  const canViewInternalFinancials = audience === "internal" && hasEitherProjectPermission(
    session,
    companyId,
    projectId,
    "canReadFinancials",
    "canManageFinancials",
  );
  const canWriteProject = canWriteProjectFromSession(session, companyId, projectId);
  const queuePage = Math.max(1, Math.floor(Number(page) || 1));
  const { items, groups } = await loadWorkItems(context, projectId, selectedTool, audience, companyId, canWriteProject, queuePage);
  const pageSize = selectedTool === "reports" ? MAX_REPORT_ROWS_PER_LIST : MAX_ITEMS_PER_LIST;
  const summary = projectSummary(project, audience, canViewInternalFinancials);
  const metrics: Metric[] = [];
  if (canViewInternalFinancials) {
    metrics.push(
      { key: "revised-budget", label: "Revised budget", value: summary.revisedBudgetMinor ?? "0", unit: summary.currencyCode, tone: "neutral" },
      { key: "committed", label: "Committed", value: summary.committedMinor ?? "0", unit: summary.currencyCode, tone: "neutral" },
      { key: "actual", label: "Actual cost", value: summary.actualCostMinor ?? "0", unit: summary.currencyCode, tone: "neutral" },
    );
  }
  if (audience === "internal") {
    const openCounts = [summary.openRfis, summary.openSubmittals, summary.openChanges, summary.openPunch, summary.openSafety];
    metrics.push({
      key: "open-work",
      label: "Open work",
      value: openCounts.some(count => count === null) ? "" : String(openCounts.reduce<number>((sum, count) => sum + (count ?? 0), 0)),
      unit: "items",
      tone: "attention",
    });
  }
  return {
    generatedAt: new Date().toISOString(),
    tool: selectedTool,
    audience,
    availableCommands: availableCommands(session, selectedTool, audience, companyId, projectId, canWriteProject),
    project: summary,
    metrics,
    items,
    queuePage,
    queueTotalPages: Math.max(1, ...groups.map(group => Math.ceil(group.totalCount / pageSize))),
    queueGroups: groups,
  };
}

type OptionSpec = {
  kind: string;
  listKey: string;
  read: Permission;
  manage: Permission;
  query: string;
  companyScoped?: boolean;
  /** Dot path of the option id when it is not the record id (e.g. user.id). */
  idPath?: string;
  /** Extra list filter that every lookup of this kind must satisfy. */
  where?: Record<string, unknown>;
  /** Text fields (dot paths through to-one relationships) used by search. */
  search?: readonly string[];
  label(record: Record<string, unknown>): string;
  id?(record: Record<string, unknown>): string;
  detail?(record: Record<string, unknown>): string;
  /** Owning record id, so dependent selectors can filter by their parent. */
  parent?(record: Record<string, unknown>): string;
  /** Lifecycle state, so selectors can offer only eligible records. */
  status?(record: Record<string, unknown>): string;
};

const optionSpecs: readonly OptionSpec[] = [
  { kind: "budgetCode", listKey: "BudgetCode", read: "canReadFinancials", manage: "canManageFinancials", query: "id code description", label: row => `${text(row.code)} · ${text(row.description)}`, search: ["code", "description"] },
  { kind: "partner", listKey: "TradePartner", read: "canReadCompanies", manage: "canManageCompanies", companyScoped: true, query: "id name partnerType status", label: row => text(row.name), detail: row => `${text(row.partnerType)} · ${text(row.status)}`, status: row => text(row.status), search: ["name"] },
  { kind: "role", listKey: "Role", read: "canReadPeople", manage: "canManagePeople", companyScoped: true, query: "id name", label: row => text(row.name), search: ["name"] },
  { kind: "accountInvitation", listKey: "AccountInvitation", read: "canReadPeople", manage: "canManagePeople", query: "id email status expiresAt", label: row => text(row.email), detail: row => `${text(row.status)} · expires ${dateOf(row.expiresAt) ?? "—"}`, status: row => text(row.status), search: ["email"] },
  { kind: "apiCredential", listKey: "ApiCredential", read: "canReadAgents", manage: "canManageAgents", companyScoped: true, query: "id name tokenPrefix status expiresAt project { id }", label: row => `${text(row.name)} · ${text(row.tokenPrefix)}`, detail: row => `${text(row.status)}${row.expiresAt ? ` · expires ${dateOf(row.expiresAt)}` : ""}`, status: row => text(row.status), search: ["name", "tokenPrefix"] },
  { kind: "membership", listKey: "ProjectMembership", read: "canReadPeople", manage: "canManagePeople", query: "id status portalType user { id name email }", label: row => nameOf(row.user), detail: row => `${text(row.portalType)} · ${text(row.status)}`, status: row => text(row.status), search: ["user.name", "user.email"] },
  { kind: "user", listKey: "ProjectMembership", read: "canReadPeople", manage: "canManagePeople", query: "id status portalType user { id name email }", id: row => idOf(row.user), label: row => nameOf(row.user), detail: row => `${text(row.portalType)} · ${text(row.status)}`, idPath: "user.id", status: row => text(row.status), search: ["user.name", "user.email"] },
  { kind: "companyMember", listKey: "CompanyMembership", read: "canReadPeople", manage: "canManagePeople", companyScoped: true, query: "id status title user { id name email }", id: row => idOf(row.user), label: row => nameOf(row.user), detail: row => [text(row.title), text((row.user as Record<string, unknown> | null)?.email)].filter(Boolean).join(" · "), idPath: "user.id", status: row => text(row.status), search: ["user.name", "user.email"] },
  { kind: "bidPackage", listKey: "BidPackage", read: "canReadPreconstruction", manage: "canManagePreconstruction", query: "id number title status", label: row => `${text(row.number)} · ${text(row.title)}`, detail: row => text(row.status), status: row => text(row.status), search: ["number", "title"] },
  { kind: "bidInvitation", listKey: "BidInvitation", read: "canReadPreconstruction", manage: "canManagePreconstruction", query: "id status tradePartner { name } bidPackage { id number }", label: row => `${text((row.bidPackage as Record<string, unknown> | null)?.number)} · ${nameOf(row.tradePartner)}`, detail: row => text(row.status), parent: row => idOf(row.bidPackage), status: row => text(row.status), search: ["bidPackage.number", "tradePartner.name"] },
  { kind: "bidSubmission", listKey: "BidSubmission", read: "canReadPreconstruction", manage: "canManagePreconstruction", query: "id submissionNumber status tradePartner { name }", label: row => `${text(row.submissionNumber)} · ${nameOf(row.tradePartner)}`, detail: row => text(row.status), status: row => text(row.status), search: ["submissionNumber", "tradePartner.name"] },
  { kind: "directCost", listKey: "DirectCost", read: "canReadFinancials", manage: "canManageFinancials", query: "id referenceNumber description status amountMinor", label: row => `${text(row.referenceNumber)} · ${text(row.description)}`, detail: row => text(row.status), status: row => text(row.status), search: ["referenceNumber", "description"] },
  { kind: "budgetChange", listKey: "BudgetChange", read: "canReadFinancials", manage: "canManageFinancials", query: "id number title status", label: row => `${text(row.number)} · ${text(row.title)}`, detail: row => text(row.status), status: row => text(row.status), search: ["number", "title"] },
  { kind: "estimate", listKey: "Estimate", read: "canReadPreconstruction", manage: "canManagePreconstruction", query: "id number title status", label: row => `${text(row.number)} · ${text(row.title)}`, detail: row => text(row.status), status: row => text(row.status), search: ["number", "title"] },
  { kind: "changeEvent", listKey: "ChangeEvent", read: "canReadContracts", manage: "canManageContracts", query: "id number title status", label: row => `${text(row.number)} · ${text(row.title)}`, detail: row => text(row.status), status: row => text(row.status), search: ["number", "title"] },
  { kind: "changeEventLine", listKey: "ChangeEventLineItem", read: "canReadContracts", manage: "canManageContracts", query: "id lineNumber description changeEvent { id number }", label: row => `${text((row.changeEvent as Record<string, unknown> | null)?.number)} · ${text(row.description)}`, parent: row => idOf(row.changeEvent), search: ["description"] },
  { kind: "primeContract", listKey: "PrimeContract", read: "canReadContracts", manage: "canManageContracts", query: "id number title status", label: row => `${text(row.number)} · ${text(row.title)}`, detail: row => text(row.status), status: row => text(row.status), search: ["number", "title"] },
  { kind: "commitment", listKey: "Commitment", read: "canReadContracts", manage: "canManageContracts", query: "id number title status tradePartner { name }", label: row => `${text(row.number)} · ${text(row.title)}`, detail: row => `${nameOf(row.tradePartner)} · ${text(row.status)}`, status: row => text(row.status), search: ["number", "title", "tradePartner.name"] },
  { kind: "changeOrder", listKey: "ChangeOrder", read: "canReadContracts", manage: "canManageContracts", query: "id number title status", label: row => `${text(row.number)} · ${text(row.title)}`, detail: row => text(row.status), status: row => text(row.status), search: ["number", "title"] },
  { kind: "rfi", listKey: "RFI", read: "canReadProjectExecution", manage: "canManageProjectExecution", query: "id number subject status", label: row => `${text(row.number)} · ${text(row.subject)}`, detail: row => text(row.status), status: row => text(row.status), search: ["number", "subject"] },
  { kind: "submittal", listKey: "Submittal", read: "canReadProjectExecution", manage: "canManageProjectExecution", query: "id number title status", label: row => `${text(row.number)} · ${text(row.title)}`, detail: row => text(row.status), status: row => text(row.status), search: ["number", "title"] },
  { kind: "submittalReview", listKey: "SubmittalReview", read: "canReadProjectExecution", manage: "canManageProjectExecution", query: "id status submittal { id number title }", label: row => `${text((row.submittal as Record<string, unknown> | null)?.number)} review`, detail: row => text(row.status), parent: row => idOf(row.submittal), status: row => text(row.status), search: ["submittal.number", "submittal.title"] },
  { kind: "drawing", listKey: "Drawing", read: "canReadDocuments", manage: "canManageDocuments", query: "id drawingNumber title status", label: row => `${text(row.drawingNumber)} · ${text(row.title)}`, detail: row => text(row.status), status: row => text(row.status), search: ["drawingNumber", "title"] },
  { kind: "drawingRevision", listKey: "DrawingRevision", read: "canReadDocuments", manage: "canManageDocuments", query: "id revisionNumber fileName status drawing { id drawingNumber title }", label: row => `${text((row.drawing as Record<string, unknown> | null)?.drawingNumber)} · ${text(row.revisionNumber)}`, detail: row => `${text(row.fileName)} · ${text(row.status)}`, parent: row => idOf(row.drawing), status: row => text(row.status), search: ["revisionNumber", "fileName", "drawing.drawingNumber"] },
  { kind: "document", listKey: "Document", read: "canReadDocuments", manage: "canManageDocuments", query: "id documentNumber title status", label: row => `${text(row.documentNumber)} · ${text(row.title)}`, detail: row => text(row.status), status: row => text(row.status), search: ["documentNumber", "title"] },
  { kind: "documentVersion", listKey: "DocumentVersion", read: "canReadDocuments", manage: "canManageDocuments", query: "id versionNumber fileName issuedAt document { id documentNumber title }", label: row => `${text((row.document as Record<string, unknown> | null)?.documentNumber)} · v${String(row.versionNumber ?? "")}`, detail: row => text(row.fileName), parent: row => idOf(row.document), status: () => "issued", where: { issuedAt: { not: { equals: null } } }, search: ["fileName", "document.documentNumber", "document.title"] },
  { kind: "dailyLogEntry", listKey: "DailyLogEntry", read: "canReadFieldOperations", manage: "canManageFieldOperations", query: "id entryType title dailyLog { id logDate status }", label: row => `${dateOf((row.dailyLog as Record<string, unknown> | null)?.logDate) ?? "Log"} · ${text(row.title)}`, detail: row => text(row.entryType), parent: row => idOf(row.dailyLog), status: row => text((row.dailyLog as Record<string, unknown> | null)?.status), search: ["title"] },
  { kind: "dailyLog", listKey: "DailyLog", read: "canReadFieldOperations", manage: "canManageFieldOperations", query: "id logDate status weatherSummary", label: row => `${dateOf(row.logDate)} · ${text(row.weatherSummary, "Daily log")}`, detail: row => text(row.status), status: row => text(row.status), search: ["weatherSummary"] },
  { kind: "schedule", listKey: "Schedule", read: "canReadProjectExecution", manage: "canManageProjectExecution", query: "id name scheduleType status", label: row => text(row.name), detail: row => `${text(row.scheduleType)} · ${text(row.status)}`, status: row => text(row.status), search: ["name"] },
  { kind: "scheduleTask", listKey: "ScheduleTask", read: "canReadProjectExecution", manage: "canManageProjectExecution", query: "id taskCode name status schedule { id }", label: row => `${text(row.taskCode)} · ${text(row.name)}`, detail: row => text(row.status), parent: row => idOf(row.schedule), status: row => text(row.status), search: ["taskCode", "name"] },
  { kind: "equipment", listKey: "Equipment", read: "canReadFieldOperations", manage: "canManageFieldOperations", companyScoped: true, query: "id equipmentNumber name status", label: row => `${text(row.equipmentNumber)} · ${text(row.name)}`, detail: row => text(row.status), status: row => text(row.status), search: ["equipmentNumber", "name"] },
  { kind: "material", listKey: "Material", read: "canReadFieldOperations", manage: "canManageFieldOperations", companyScoped: true, query: "id sku name unit", label: row => `${text(row.sku)} · ${text(row.name)}`, detail: row => text(row.unit), search: ["sku", "name"] },
  { kind: "inspectionItem", listKey: "InspectionItem", read: "canReadSafety", manage: "canManageSafety", query: "id prompt result inspection { id inspectionNumber status }", label: row => `${text((row.inspection as Record<string, unknown> | null)?.inspectionNumber)} · ${text(row.prompt)}`, detail: row => text(row.result), parent: row => idOf(row.inspection), status: row => text((row.inspection as Record<string, unknown> | null)?.status), search: ["prompt", "inspection.inspectionNumber"] },
  { kind: "safetyIncident", listKey: "SafetyIncident", read: "canReadSafety", manage: "canManageSafety", query: "id incidentNumber title status", label: row => `${text(row.incidentNumber)} · ${text(row.title)}`, detail: row => text(row.status), status: row => text(row.status), search: ["incidentNumber", "title"] },
  { kind: "safetyObservation", listKey: "SafetyObservation", read: "canReadSafety", manage: "canManageSafety", query: "id observationNumber title status", label: row => `${text(row.observationNumber)} · ${text(row.title)}`, detail: row => text(row.status), status: row => text(row.status), search: ["observationNumber", "title"] },
  { kind: "correctiveAction", listKey: "CorrectiveAction", read: "canReadSafety", manage: "canManageSafety", query: "id actionNumber title status", label: row => `${text(row.actionNumber)} · ${text(row.title)}`, detail: row => text(row.status), status: row => text(row.status), search: ["actionNumber", "title"] },
  { kind: "punchItem", listKey: "PunchItem", read: "canReadFieldOperations", manage: "canManageFieldOperations", query: "id number title status", label: row => `${text(row.number)} · ${text(row.title)}`, detail: row => text(row.status), status: row => text(row.status), search: ["number", "title"] },
  { kind: "procurementRequest", listKey: "ProcurementRequest", read: "canReadContracts", manage: "canManageContracts", query: "id requestNumber title status", label: row => `${text(row.requestNumber)} · ${text(row.title)}`, detail: row => text(row.status), status: row => text(row.status), search: ["requestNumber", "title"] },
  { kind: "procurementRequestLine", listKey: "ProcurementRequestLine", read: "canReadContracts", manage: "canManageContracts", query: "id lineNumber description request { id requestNumber }", label: row => `${text((row.request as Record<string, unknown> | null)?.requestNumber)} · ${text(row.description)}`, parent: row => idOf(row.request), search: ["description", "request.requestNumber"] },
  { kind: "progressClaim", listKey: "ProgressClaim", read: "canReadBilling", manage: "canManageBilling", query: "id claimNumber status currentPaymentDueMinor tradePartner { name }", label: row => `${text(row.claimNumber)} · ${nameOf(row.tradePartner)}`, detail: row => text(row.status), status: row => text(row.status), search: ["claimNumber", "tradePartner.name"] },
  { kind: "retainageRelease", listKey: "RetainageRelease", read: "canReadBilling", manage: "canManageBilling", query: "id releaseNumber status amountMinor", label: row => text(row.releaseNumber), detail: row => text(row.status), status: row => text(row.status), search: ["releaseNumber"] },
  { kind: "approvalPolicy", listKey: "ApprovalPolicy", read: "canReadAudit", manage: "canManageRoles", query: "id name domain minimumAmountMinor currencyCode isActive approverRole { name }", label: row => `${text(row.name)} · ${text(row.domain)}`, detail: row => `${row.isActive ? "active" : "inactive"} · ${currencyAmount(row.minimumAmountMinor, row.currencyCode)}+ · ${nameOf(row.approverRole)}`, status: row => (row.isActive ? "active" : "inactive"), search: ["name"] },
  { kind: "approvalRequest", listKey: "ApprovalRequest", read: "canReadAudit", manage: "canReadAudit", query: "id requestNumber status targetType targetStatus", label: row => `${text(row.requestNumber)} · ${text(row.targetType)}`, detail: row => `${text(row.status)} → ${text(row.targetStatus)}`, status: row => text(row.status), search: ["requestNumber"] },
  { kind: "payment", listKey: "Payment", read: "canReadBilling", manage: "canManageBilling", query: "id paymentNumber status amountMinor reference", label: row => `${text(row.paymentNumber)} · ${text(row.reference)}`, detail: row => text(row.status), status: row => text(row.status), search: ["paymentNumber", "reference"] },
];

type OptionRow = { id: string; kind: string; label: string; detail: string; parentId: string | null; status: string | null };

const OPTION_INITIAL_TAKE = 100;
const OPTION_SEARCH_PAGE_SIZE = 25;
const OPTION_SEARCH_MAX_IDS = 50;

function optionRow(spec: OptionSpec, record: Record<string, unknown>): OptionRow {
  return {
    id: spec.id?.(record) || text(record.id),
    kind: spec.kind,
    label: spec.label(record),
    detail: spec.detail?.(record) ?? "",
    parentId: spec.parent?.(record) || null,
    status: spec.status?.(record) || null,
  };
}

/** Builds a nested Keystone filter from a dot path, e.g. user.name. */
export function pathFilter(path: string, leaf: Record<string, unknown>): Record<string, unknown> {
  return path.split(".").reduceRight<Record<string, unknown>>((inner, segment) => ({ [segment]: inner }), leaf);
}

/** Project/company scope, kind-specific filter, and optional search or ids. */
export function optionWhere(
  spec: OptionSpec,
  scope: { companyId: string; projectId: string },
  lookup: { search?: string | null; ids?: readonly string[] | null } = {},
): Record<string, unknown> {
  const clauses: Array<Record<string, unknown>> = [
    spec.companyScoped ? { company: { id: { equals: scope.companyId } } } : { project: { id: { equals: scope.projectId } } },
  ];
  if (spec.kind === "approvalPolicy") clauses.push({ company: { id: { equals: scope.companyId } } });
  if (spec.where) clauses.push(spec.where);
  const search = lookup.search?.trim().slice(0, 120);
  if (search && spec.search?.length) {
    clauses.push({ OR: spec.search.map(path => pathFilter(path, { contains: search, mode: "insensitive" })) });
  }
  if (lookup.ids?.length) clauses.push(pathFilter(spec.idPath ?? "id", { in: [...lookup.ids] }));
  return clauses.length === 1 ? clauses[0] : { AND: clauses };
}

async function internalOptionScope(context: ConstructionQueryContext, projectId: string) {
  const session = requireSession(context);
  const project = await context.query.Project.findOne({ where: { id: projectId }, query: "id company { id }" });
  const companyId = idOf(project?.company);
  if (!project?.id || !companyId || audienceForProject(session, companyId, projectId) !== "internal") {
    throw new Error("Internal project options are not available");
  }
  return { session, companyId, projectId };
}

function visibleOption(spec: OptionSpec, scope: { session: Session; companyId: string; projectId: string }) {
  return (spec.kind === "role" && hasProjectPermission(scope.session, scope.companyId, scope.projectId, "canManageRoles", true)) ||
    hasEitherProjectPermission(scope.session, scope.companyId, scope.projectId, spec.read, spec.manage);
}
function optionApi(context: ConstructionQueryContext, spec: OptionSpec, scope: { session: Session; companyId: string; projectId: string }): QueryApi {
  if (["role", "approvalPolicy"].includes(spec.kind) && hasProjectPermission(scope.session, scope.companyId, scope.projectId, "canManageRoles", true)) {
    // Narrow configuration labels only. This does not admit the shared role
    // composer, global roles, financial targets or another company's catalog.
    const api = context.sudo?.().query[spec.listKey];
    if (!api) throw new Error("Scoped approval configuration lookup is unavailable");
    return api;
  }
  return context.query[spec.listKey];
}

export async function constructionProjectOptions(
  _root: unknown,
  { projectId }: { projectId: string },
  context: ConstructionQueryContext,
) {
  const scope = await internalOptionScope(context, projectId);
  const visible = optionSpecs.filter(spec => visibleOption(spec, scope));
  const groups = await Promise.all(visible.map(async spec => {
    const records = await optionApi(context, spec, scope).findMany({
      where: optionWhere(spec, scope),
      take: OPTION_INITIAL_TAKE,
      orderBy: { createdAt: "desc" },
      query: spec.query,
    });
    return records.map(record => optionRow(spec, record));
  }));
  return groups.flat();
}

/** Searchable, paginated lookup for one or more option kinds. Each kind keeps
 * its own read/manage permission and project/company scope; `ids` resolves a
 * selected value that is outside the first page without widening the scope. */
export async function constructionProjectOptionSearch(
  _root: unknown,
  { projectId, kinds, search, page, ids }: { projectId: string; kinds: string[]; search?: string | null; page?: number | null; ids?: string[] | null },
  context: ConstructionQueryContext,
) {
  const scope = await internalOptionScope(context, projectId);
  const requested = new Set(kinds.slice(0, 8));
  const visible = optionSpecs.filter(spec => requested.has(spec.kind) && visibleOption(spec, scope));
  const currentPage = Math.max(1, Math.min(Math.trunc(Number(page) || 1), 400));
  const selectedIds = ids?.slice(0, OPTION_SEARCH_MAX_IDS).filter(Boolean) ?? [];
  const results = await Promise.all(visible.map(async spec => {
    const where = optionWhere(spec, scope, selectedIds.length ? { ids: selectedIds } : { search });
    const api = optionApi(context, spec, scope);
    const [records, totalCount] = await Promise.all([
      api.findMany({
        where,
        take: selectedIds.length ? OPTION_SEARCH_MAX_IDS : OPTION_SEARCH_PAGE_SIZE,
        skip: selectedIds.length ? 0 : (currentPage - 1) * OPTION_SEARCH_PAGE_SIZE,
        orderBy: { createdAt: "desc" },
        query: spec.query,
      }),
      api.count({ where }),
    ]);
    return { items: records.map(record => optionRow(spec, record)), totalCount };
  }));
  const totalCount = results.reduce((sum, result) => sum + result.totalCount, 0);
  return {
    items: results.flatMap(result => result.items),
    page: currentPage,
    totalCount,
    hasMore: !selectedIds.length && results.some(result => result.totalCount > currentPage * OPTION_SEARCH_PAGE_SIZE),
  };
}
