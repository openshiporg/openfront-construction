import type { KeystoneQueryApi } from "./tenancy";

type SeedDbApi = {
  createOne(args: { data: Record<string, unknown> }): Promise<{ id: string } & Record<string, unknown>>;
  updateOne(args: { where: { id: string }; data: Record<string, unknown> }): Promise<{ id: string } & Record<string, unknown>>;
};
export type SeedDb = Record<string, SeedDbApi>;
type SeedQuery = Record<string, KeystoneQueryApi>;

function db(sudoDb: SeedDb, listKey: string): SeedDbApi {
  const api = sudoDb[listKey];
  if (!api) throw new Error(`${listKey} is unavailable for workspace setup`);
  return api;
}

const DAY = 24 * 60 * 60 * 1000;
const connect = (id: string) => ({ connect: { id } });

export const APPROVAL_POLICY_DOMAINS = ["budget_change", "prime_contract", "change_order", "progress_claim", "retainage_release"] as const;

/** Configuration every workspace needs: the project's site location, its
 * schedule shell with the operator's own planned dates, and a quality
 * inspection template. Plans only; nothing here records performed work. */
export async function seedWorkspaceSetup(sudoDb: SeedDb, args: {
  projectId: string;
  startDate?: Date;
  completionDate?: Date;
}) {
  const project = connect(args.projectId);
  const location = await db(sudoDb, "ProjectLocation").createOne({ data: {
    code: "SITE", name: "Project site", locationType: "site", project,
  } });
  const schedule = await db(sudoDb, "Schedule").createOne({ data: {
    name: "Project schedule", scheduleType: "baseline", status: "draft",
    ...(args.startDate ? { dataDate: args.startDate } : {}), project,
  } });
  const milestones: Record<string, string> = {};
  for (const [code, name, date] of [
    ["M-001", "Notice to proceed", args.startDate],
    ["M-002", "Substantial completion", args.completionDate],
  ] as const) {
    if (!date) continue;
    const task = await db(sudoDb, "ScheduleTask").createOne({ data: {
      taskCode: code, name, isMilestone: true, plannedStart: date, plannedFinish: date,
      schedule: connect(schedule.id), project,
    } });
    milestones[code] = task.id;
  }
  const inspectionTemplate = await db(sudoDb, "InspectionTemplate").createOne({ data: {
    name: "General quality inspection",
    inspectionType: "quality",
    instructions: "Check the work against the approved drawings, specifications and submittals. Record each deficiency as a corrective action.",
    isActive: true,
    project,
  } });
  return { locationId: location.id, scheduleId: schedule.id, milestones, inspectionTemplateId: inspectionTemplate.id };
}

/** Fictional sample content for the eligible local sample workspace only
 * (Company.isDemo). Everything is a draft, a plan or an open item: no
 * submitted bids, approvals, posted costs, receipts, payments or performed
 * work facts are written. */
export async function seedSampleWorkspace(sudoDb: SeedDb, args: {
  companyId: string;
  projectId: string;
  actorId: string;
  budgetCodeId: string;
  clientId: string;
  tradePartnerId: string;
  locationId: string;
  scheduleId: string;
  inspectionTemplateId: string;
  startDate: Date;
}) {
  const project = connect(args.projectId);
  const company = connect(args.companyId);
  const actor = connect(args.actorId);
  const after = (days: number) => new Date(args.startDate.getTime() + days * DAY);

  const section = await db(sudoDb, "SpecificationSection").createOne({ data: {
    sectionNumber: "03 30 00", title: "Cast-in-place concrete", division: "03", project,
  } });
  await db(sudoDb, "Drawing").createOne({ data: {
    drawingNumber: "S-101", title: "Foundation plan", discipline: "Structural", project,
  } });
  await db(sudoDb, "Equipment").createOne({ data: {
    equipmentNumber: "EQ-001", name: "Telehandler", description: "Fictional sample equipment", status: "available", company,
  } });
  const material = await db(sudoDb, "Material").createOne({ data: {
    sku: "MAT-001", name: "Ready-mix concrete 4000 psi", description: "Fictional sample material", unit: "CY",
    standardCostMinor: "18500", isActive: "active", company,
  } });

  const bidPackage = await db(sudoDb, "BidPackage").createOne({ data: {
    number: "BP-03", title: "Concrete", description: "Foundations, slabs on grade and site concrete.",
    dueAt: after(21), bidManager: actor, project,
  } });
  await db(sudoDb, "BidInvitation").createOne({ data: {
    status: "draft", recipientName: "Atlas estimating", recipientEmail: "bids@atlas.example.test",
    bidPackage: connect(bidPackage.id), budgetCode: connect(args.budgetCodeId), tradePartner: connect(args.tradePartnerId), project,
  } });
  const estimate = await db(sudoDb, "Estimate").createOne({ data: {
    number: "EST-001", title: "Concrete scope estimate", description: "Draft estimate for the concrete package.",
    estimator: actor, project,
  } });
  const estimateTotal = "128000000";
  const version = await db(sudoDb, "EstimateVersion").createOne({ data: {
    versionNumber: 1, status: "draft", subtotalMinor: estimateTotal, totalMinor: estimateTotal,
    scopeSummary: "Foundations, slabs on grade and site concrete.", estimate: connect(estimate.id), project,
  } });
  await db(sudoDb, "EstimateLineItem").createOne({ data: {
    lineNumber: 1, description: "Concrete subcontract", quantity: "1", unit: "LS",
    subcontractCostMinor: estimateTotal, totalCostMinor: estimateTotal,
    version: connect(version.id), budgetCode: connect(args.budgetCodeId), project,
  } });
  await db(sudoDb, "Estimate").updateOne({ where: { id: estimate.id }, data: { currentVersion: connect(version.id) } });

  await db(sudoDb, "RFI").createOne({ data: {
    number: "RFI-001", subject: "Footing depth at grid C",
    question: "Confirm the footing depth at grid C where the geotechnical report shows softer soil.",
    dueAt: after(14), raisedBy: actor, ballInCourt: actor,
    location: connect(args.locationId), specificationSection: connect(section.id), project,
  } });
  await db(sudoDb, "Submittal").createOne({ data: {
    number: "SUB-001", title: "Concrete mix design", submittalType: "product_data", dueAt: after(10),
    specificationSection: connect(section.id), responsiblePartner: connect(args.tradePartnerId),
    submitter: actor, submittalManager: actor, ballInCourt: actor, project,
  } });

  const mobilization = await db(sudoDb, "ScheduleTask").createOne({ data: {
    taskCode: "T-100", name: "Mobilization", plannedStart: args.startDate, plannedFinish: after(7),
    schedule: connect(args.scheduleId), location: connect(args.locationId), project,
  } });
  const foundations = await db(sudoDb, "ScheduleTask").createOne({ data: {
    taskCode: "T-200", name: "Foundations", plannedStart: after(8), plannedFinish: after(45),
    schedule: connect(args.scheduleId), location: connect(args.locationId),
    responsiblePartner: connect(args.tradePartnerId), project,
  } });
  await db(sudoDb, "ScheduleDependency").createOne({ data: {
    dependencyType: "finish_to_start", lagDays: 0, schedule: connect(args.scheduleId),
    predecessor: connect(mobilization.id), successor: connect(foundations.id), project,
  } });

  const inspection = await db(sudoDb, "Inspection").createOne({ data: {
    inspectionNumber: "INS-001", title: "Pre-pour inspection", scheduledAt: after(30),
    template: connect(args.inspectionTemplateId), inspector: actor, location: connect(args.locationId),
    specificationSection: connect(section.id), project,
  } });
  await db(sudoDb, "InspectionItem").createOne({ data: {
    sequence: 1, prompt: "Reinforcement placed and tied per the approved shop drawings",
    inspection: connect(inspection.id), project,
  } });
  await db(sudoDb, "DailyLog").createOne({ data: {
    logDate: args.startDate, preparedBy: actor, project,
  } });
  await db(sudoDb, "SafetyObservation").createOne({ data: {
    observationNumber: "OBS-001", title: "Stair guardrail not yet installed",
    description: "Temporary guardrail needed at stair 2 before the deck is opened to other trades.",
    dueAt: after(2), observedBy: actor, assignedTo: actor, location: connect(args.locationId), project,
  } });
  await db(sudoDb, "ChangeEvent").createOne({ data: {
    number: "CE-001", title: "Entrance canopy added by owner", description: "Owner asked for a covered entrance canopy.",
    owner: actor, project,
  } });
  const procurement = await db(sudoDb, "ProcurementRequest").createOne({ data: {
    requestNumber: "PR-001", title: "Footing concrete", neededBy: after(28),
    totalEstimatedMinor: "1480000", requestedBy: actor, project,
  } });
  await db(sudoDb, "ProcurementRequestLine").createOne({ data: {
    lineNumber: 1, description: "Ready-mix concrete 4000 psi", quantity: "80", unit: "CY",
    estimatedUnitCostMinor: "18500", estimatedAmountMinor: "1480000",
    request: connect(procurement.id), budgetCode: connect(args.budgetCodeId), material: connect(material.id), project,
  } });

  const lead = await db(sudoDb, "ConstructionLead").createOne({ data: {
    name: "Facilities planning office", organization: "City of Northstar", email: "facilities@northstar.example.test",
    source: "existing_client", status: "qualified", nextActionAt: after(5), owner: actor, company,
  } });
  await db(sudoDb, "ConstructionOpportunity").createOne({ data: {
    number: "OPP-001", name: "Library annex", organization: "City of Northstar", deliveryMethod: "Design-bid-build",
    stage: "qualifying", estimatedValueMinor: "450000000", probabilityBps: 4000,
    targetBidDate: after(60), nextActionAt: after(5), owner: actor, lead: connect(lead.id), client: connect(args.clientId), company,
  } });
}

export type ReadinessCheck = {
  key: string;
  label: string;
  complete: boolean;
  detail: string;
  href: string;
  /** Required checks must pass before onboarding records completion. */
  required: boolean;
};

async function count(query: SeedQuery, listKey: string, where: Record<string, unknown>) {
  const api = query[listKey]?.count;
  if (!api) throw new Error(`${listKey} count query is unavailable`);
  return api({ where });
}

const idIs = (id: string) => ({ id: { equals: id } });

export async function companyReadiness(query: SeedQuery, args: { companyId: string; actorId: string; firstProjectId: string | null }): Promise<ReadinessCheck[]> {
  const company = { company: idIs(args.companyId) };
  const projectTool = (tool: string) => args.firstProjectId
    ? `/dashboard/platform/projects/${encodeURIComponent(args.firstProjectId)}/${tool}` : "/dashboard/platform/projects";
  const portalSafe = {
    canAccessDashboard: { equals: false }, canManageCompanies: { equals: false }, canManagePeople: { equals: false },
    canManageAgents: { equals: false }, canManageOnboarding: { equals: false },
  };
  const [profiles, internalRoles, externalRoles, costCodes] = await Promise.all([
    count(query, "PublicSiteProfile", company),
    count(query, "Role", { ...company, canAccessDashboard: { equals: true } }),
    count(query, "Role", { ...company, ...portalSafe }),
    count(query, "CostCode", { ...company, isActive: { equals: true } }),
  ]);
  const policies = await query.ApprovalPolicy?.findMany?.({
    where: { ...company, isActive: { equals: true } }, take: 200, query: "approverRole { id }",
  }) ?? [];
  const approverRoleIds = [...new Set(policies.map(policy => (policy.approverRole as { id?: string } | null)?.id).filter((id): id is string => Boolean(id)))];
  const otherApprovers = approverRoleIds.length ? await count(query, "CompanyMembership", {
    ...company, status: { equals: "active" }, user: { id: { not: { equals: args.actorId } } }, role: { id: { in: approverRoleIds } },
  }) + await count(query, "ProjectMembership", {
    project: { company: idIs(args.companyId) }, status: { equals: "active" }, portalType: { equals: "internal" },
    user: { id: { not: { equals: args.actorId } } }, role: { id: { in: approverRoleIds } },
  }) : 0;
  return [
    { key: "profile", label: "Company profile and public intake", complete: profiles > 0, detail: profiles > 0 ? "Profile saved" : "No public profile", href: `/dashboard/platform/store-settings?companyId=${encodeURIComponent(args.companyId)}`, required: true },
    { key: "roles", label: "Role templates", complete: internalRoles > 0 && externalRoles > 0, detail: `${internalRoles} staff, ${externalRoles} external`, href: "/dashboard/roles", required: true },
    { key: "cost-codes", label: "Cost codes", complete: costCodes > 0, detail: `${costCodes} active`, href: "/dashboard/cost-codes", required: true },
    { key: "approver", label: "Independent approver", complete: otherApprovers > 0, detail: otherApprovers > 0 ? `${otherApprovers} other approver${otherApprovers === 1 ? "" : "s"}` : "Invite a second approver", href: projectTool("team"), required: false },
  ];
}

export async function projectReadiness(query: SeedQuery, args: { projectId: string }): Promise<ReadinessCheck[]> {
  const project = { project: idIs(args.projectId) };
  const tool = (slug: string) => `/dashboard/platform/projects/${encodeURIComponent(args.projectId)}${slug ? `/${slug}` : ""}`;
  const [managers, budgetCodes, activeBudgets, activeLines, schedules, locations, ...domains] = await Promise.all([
    count(query, "ProjectMembership", { ...project, status: { equals: "active" }, portalType: { equals: "internal" }, accessLevel: { equals: "manager" } }),
    count(query, "BudgetCode", { ...project, isActive: { equals: true } }),
    count(query, "Budget", { ...project, status: { equals: "active" } }),
    count(query, "BudgetLineItem", { ...project, budget: { status: { equals: "active" } } }),
    count(query, "Schedule", project),
    count(query, "ProjectLocation", project),
    ...APPROVAL_POLICY_DOMAINS.map(domain => count(query, "ApprovalPolicy", { ...project, domain: { equals: domain }, isActive: { equals: true } })),
  ]);
  const coveredDomains = domains.filter(value => value > 0).length;
  return [
    { key: "team", label: "Project manager access", complete: managers > 0, detail: `${managers} manager${managers === 1 ? "" : "s"}`, href: tool("team"), required: true },
    { key: "budget-codes", label: "Budget codes", complete: budgetCodes > 0, detail: `${budgetCodes} active`, href: tool("financials"), required: true },
    { key: "budget", label: "Active budget", complete: activeBudgets > 0 && activeLines > 0, detail: activeBudgets > 0 ? `${activeLines} budget line${activeLines === 1 ? "" : "s"}` : "No active budget", href: tool("financials"), required: true },
    { key: "policies", label: "Approval policies", complete: coveredDomains === APPROVAL_POLICY_DOMAINS.length, detail: `${coveredDomains} of ${APPROVAL_POLICY_DOMAINS.length} areas`, href: tool("financials"), required: true },
    { key: "schedule", label: "Schedule", complete: schedules > 0, detail: schedules > 0 ? "Schedule created" : "No schedule", href: tool("schedule"), required: true },
    { key: "locations", label: "Site locations", complete: locations > 0, detail: `${locations} location${locations === 1 ? "" : "s"}`, href: "/dashboard/project-locations", required: true },
  ];
}

/** Onboarding records completion only when every required check passes on the
 * persisted rows inside the same transaction. */
export async function assertWorkspaceReady(query: SeedQuery, args: { companyId: string; projectId: string; actorId: string }) {
  const checks = [
    ...await companyReadiness(query, { companyId: args.companyId, actorId: args.actorId, firstProjectId: args.projectId }),
    ...await projectReadiness(query, { projectId: args.projectId }),
  ];
  const missing = checks.filter(check => check.required && !check.complete);
  if (missing.length) throw new Error(`Workspace setup is incomplete: ${missing.map(check => check.label).join(", ")}`);
  return checks;
}
