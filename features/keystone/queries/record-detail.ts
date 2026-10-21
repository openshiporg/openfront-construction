import { hasProjectPermission } from "../access";
import { resourceLogDetail, type ResourceContext } from "./resource-activity";
import { recordAllowedTransitions } from "./construction";
import { canAccessProjectById, queryById } from "../domain/tenancy";
import type { Permission } from "../models/fields";
import { requireCommandSession, type CommandContext } from "../mutations/construction";

type DetailItem = { kind: string; reference: string; title: string; status: string; occurredAt: string | null; recordId?: string | null };
type Config = { listKey: string; permission: Permission; query: string; reference: string; title: string; evidence?: (record: Record<string, unknown>) => DetailItem[] };
const MAX_INSPECTION_CORRECTIVE_ACTION_DETAILS = 100;
function text(value: unknown, fallback = "") { return typeof value === "string" && value ? value : fallback; }
function relation(value: unknown) { return value && typeof value === "object" ? value as Record<string, unknown> : {}; }
function rows(value: unknown) { return Array.isArray(value) ? value as Array<Record<string, unknown>> : []; }
function date(value: unknown) { return value instanceof Date ? value.toISOString() : value ? String(value) : null; }
function money(value: unknown, currency: unknown) {
  try { const minor = BigInt(String(value ?? 0)); const absolute = minor < 0 ? -minor : minor; return `${text(currency, "USD")} ${minor < 0 ? "-" : ""}${absolute / BigInt(100)}.${(absolute % BigInt(100)).toString().padStart(2, "0")}`; }
  catch { return `${text(currency, "USD")} —`; }
}
const item = (kind: string, row: Record<string, unknown>, reference: unknown, title: unknown, status: unknown, occurredAt?: unknown): DetailItem => ({ kind, reference: text(reference), title: text(title, "Recorded evidence"), status: text(status, "recorded"), occurredAt: date(occurredAt), recordId: text(row.id) || null });
// Child evidence that has its own detail projection; that projection re-checks
// project ownership and the reader's permission.
const childRecordTypes: Record<string, string> = { Submission: "bid-submission", "Schedule task": "schedule-task", "Corrective action": "corrective-action" };
function linkChildren(items: DetailItem[]) {
  return items.map(entry => {
    const recordType = entry.recordId ? childRecordTypes[entry.kind] ?? null : null;
    return { ...entry, recordType, recordId: recordType ? entry.recordId : null };
  });
}

const configs: Record<string, Config> = {
  rfi: { listKey: "RFI", permission: "canReadProjectExecution", query: "id number subject question status priority dueAt openedAt answeredAt closedAt raisedBy { name } ballInCourt { name } responsiblePartner { name } project { id company { id } } responses(take: 200, orderBy: { respondedAt: asc }) { id response isOfficial respondedAt author { name } onBehalfOf { name } }", reference: "number", title: "subject", evidence: r => {
    const responses = rows(r.responses);
    const evidence = responses.map(row => item(row.isOfficial ? "Official response" : "Response", row, relation(row.author).name, row.response, row.isOfficial ? "official" : "recorded", row.respondedAt));
    if (responses.length === 200) evidence.push(item("Projection limit", {}, "", "At most 200 RFI responses are included; additional responses may be omitted.", "bounded"));
    return evidence;
  } },
  submittal: { listKey: "Submittal", permission: "canReadProjectExecution", query: "id number title description status revision dueAt submittedAt closedAt submitter { name } ballInCourt { name } responsiblePartner { name } project { id company { id } } reviews(take: 200, orderBy: { sequence: asc }) { id sequence status response dueAt completedAt reviewer { name } reviewerPartner { name } }", reference: "number", title: "title", evidence: r => {
    const reviews = rows(r.reviews);
    const evidence = reviews.map(row => item("Review", row, `Step ${String(row.sequence ?? "")}`, [
      text(relation(row.reviewer).name, text(relation(row.reviewerPartner).name)) && `Reviewer: ${text(relation(row.reviewer).name, text(relation(row.reviewerPartner).name))}`,
      text(row.response) && `Response: ${text(row.response)}`,
    ].filter(Boolean).join("\n\n"), row.status, row.completedAt || row.dueAt));
    if (reviews.length === 200) evidence.push(item("Projection limit", {}, "", "At most 200 submittal reviews are included; additional reviews may be omitted.", "bounded"));
    return evidence;
  } },
  "daily-log": { listKey: "DailyLog", permission: "canReadFieldOperations", query: "id logDate status weatherSummary generalNotes submittedAt approvedAt preparedBy { name } approvedBy { name } project { id company { id } } entries(take: 300, orderBy: { createdAt: asc }) { id entryType title details quantity unit delayDays startedAt }", reference: "logDate", title: "weatherSummary", evidence: r => {
    const entries = rows(r.entries);
    const evidence = entries.map(row => item(text(row.entryType, "Entry"), row, [row.quantity, row.unit].filter(Boolean).join(" "), [text(row.title), text(row.details)].filter(Boolean).join("\n\n"), "recorded", row.startedAt));
    if (entries.length === 300) evidence.push(item("Projection limit", {}, "", "At most 300 daily-log entries are included; additional entries may be omitted.", "bounded"));
    return evidence;
  } },
  estimate: { listKey: "Estimate", permission: "canReadPreconstruction", query: "id number title description status estimator { name } project { id company { id } } currentVersion { id versionNumber status subtotalMinor totalMinor scopeSummary issuedAt lineItems(take: 300, orderBy: { lineNumber: asc }) { id lineNumber description totalCostMinor budgetCode { code } } }", reference: "number", title: "title", evidence: r => {
    const lineItems = rows(relation(r.currentVersion).lineItems);
    const evidence = lineItems.map(row => item("Estimate line", row, relation(row.budgetCode).code, row.description, money(row.totalCostMinor, "USD")));
    if (lineItems.length === 300) evidence.push(item("Projection limit", {}, "", "At most 300 current estimate-version line items are included; additional line items may be omitted.", "bounded"));
    return evidence;
  } },
  "bid-package": { listKey: "BidPackage", permission: "canReadPreconstruction", query: "id number title description status dueAt issuedAt closedAt bidManager { name } project { id company { id } } invitations(take: 200) { id status tradePartner { name } sentAt respondedAt } submissions(take: 200) { id submissionNumber status totalMinor currencyCode tradePartner { name } submittedAt }", reference: "number", title: "title", evidence: r => {
    const invitations = rows(r.invitations);
    const submissions = rows(r.submissions);
    const evidence = [
      ...invitations.map(row => item("Invitation", row, relation(row.tradePartner).name, "Bid invitation", row.status, row.respondedAt || row.sentAt)),
      ...submissions.map(row => item("Submission", row, row.submissionNumber, `${text(relation(row.tradePartner).name)} · ${money(row.totalMinor, row.currencyCode)}`, row.status, row.submittedAt)),
    ];
    if (invitations.length === 200) evidence.push(item("Projection limit", {}, "", "At most 200 bid invitations are included; additional invitations may be omitted.", "bounded"));
    if (submissions.length === 200) evidence.push(item("Projection limit", {}, "", "At most 200 bid submissions are included; additional submissions may be omitted.", "bounded"));
    return evidence;
  } },
  "bid-submission": { listKey: "BidSubmission", permission: "canReadPreconstruction", query: "id submissionNumber status totalMinor currencyCode exclusions clarifications submittedAt tradePartner { name } bidPackage { number title } project { id company { id } } lineItems(take: 300, orderBy: { lineNumber: asc }) { id lineNumber description amountMinor budgetCode { code } }", reference: "submissionNumber", title: "clarifications", evidence: r => {
    const lineItems = rows(r.lineItems);
    const evidence = lineItems.map(row => item("Bid line", row, relation(row.budgetCode).code, row.description, money(row.amountMinor, r.currencyCode)));
    if (lineItems.length === 300) evidence.push(item("Projection limit", {}, "", "At most 300 bid submission line items are included; additional line items may be omitted.", "bounded"));
    return evidence;
  } },
  "prime-contract": { listKey: "PrimeContract", permission: "canReadContracts", query: "id number title description status originalContractMinor approvedChangesMinor revisedContractMinor billedToDateMinor paidToDateMinor currencyCode executedAt client { name } project { id company { id } } lineItems(take: 300, orderBy: { lineNumber: asc }) { id lineNumber description revisedValueMinor budgetCode { code } } changeOrders(take: 200) { id number title status totalMinor }", reference: "number", title: "title", evidence: primeContractEvidence },
  commitment: { listKey: "Commitment", permission: "canReadContracts", query: "id number title description status originalContractMinor approvedChangesMinor revisedContractMinor invoicedToDateMinor paidToDateMinor currencyCode executedAt tradePartner { name } project { id company { id } } lineItems(take: 300, orderBy: { lineNumber: asc }) { id lineNumber description revisedValueMinor budgetCode { code } } changeOrders(take: 200) { id number title status totalMinor }", reference: "number", title: "title", evidence: commitmentEvidence },
  "subcontract-po": { listKey: "Commitment", permission: "canReadContracts", query: "id number title description status originalContractMinor approvedChangesMinor revisedContractMinor invoicedToDateMinor paidToDateMinor currencyCode executedAt tradePartner { name } project { id company { id } } lineItems(take: 300, orderBy: { lineNumber: asc }) { id lineNumber description revisedValueMinor budgetCode { code } } changeOrders(take: 200) { id number title status totalMinor }", reference: "number", title: "title", evidence: commitmentEvidence },
  "change-order": { listKey: "ChangeOrder", permission: "canReadContracts", query: "id number title description direction status totalMinor currencyCode scheduleImpactDays approvedAt executedAt requestedBy { name } approvedBy { name } project { id company { id } } lineItems(take: 300, orderBy: { lineNumber: asc }) { id lineNumber description amountMinor budgetCode { code } }", reference: "number", title: "title", evidence: r => {
    const lineItems = rows(r.lineItems);
    const evidence = lineItems.map(row => item("Change line", row, relation(row.budgetCode).code, row.description, money(row.amountMinor, r.currencyCode)));
    if (lineItems.length === 300) evidence.push(item("Projection limit", {}, "", "At most 300 change order line items are included; additional line items may be omitted.", "bounded"));
    return evidence;
  } },
  "procurement-request": { listKey: "ProcurementRequest", permission: "canReadContracts", query: "id requestNumber title description status neededBy totalEstimatedMinor currencyCode requestedBy { name } tradePartner { name } commitment { number } project { id company { id } } lines(take: 300, orderBy: { lineNumber: asc }) { id lineNumber description quantity unit estimatedAmountMinor budgetCode { code } } receipts(take: 200) { id receiptNumber status receivedAt }", reference: "requestNumber", title: "title", evidence: r => {
    const lines = rows(r.lines);
    const receipts = rows(r.receipts);
    const evidence = [
      ...lines.map(row => item("Request line", row, relation(row.budgetCode).code, `${text(row.description)} · ${String(row.quantity ?? "")} ${text(row.unit)}`, money(row.estimatedAmountMinor, r.currencyCode))),
      ...receipts.map(row => item("Receipt", row, row.receiptNumber, "Material receipt", row.status, row.receivedAt)),
    ];
    if (lines.length === 300) evidence.push(item("Projection limit", {}, "", "At most 300 procurement request lines are included; additional lines may be omitted.", "bounded"));
    if (receipts.length === 200) evidence.push(item("Projection limit", {}, "", "At most 200 related material receipts are included; additional receipts may be omitted.", "bounded"));
    return evidence;
  } },
  punch: { listKey: "PunchItem", permission: "canReadFieldOperations", query: "id number title description status priority dueAt completedAt closedAt assignedTo { name } project { id company { id } } correctiveActions(take: 100) { id actionNumber title status completedAt verifiedAt }", reference: "number", title: "title", evidence: r => {
    const correctiveActions = rows(r.correctiveActions);
    const evidence = correctiveActions.map(row => item("Corrective action", row, row.actionNumber, row.title, row.status, row.verifiedAt || row.completedAt));
    if (correctiveActions.length === 100) evidence.push(item("Projection limit", {}, "", "At most 100 linked corrective actions are included; additional linked corrective actions may be omitted.", "bounded"));
    return evidence;
  } },
  observation: { listKey: "SafetyObservation", permission: "canReadSafety", query: "id observationNumber title description observationType status dueAt resolvedAt assignedTo { name } project { id company { id } } correctiveActions(take: 100) { id actionNumber title status completedAt verifiedAt }", reference: "observationNumber", title: "title", evidence: r => {
    const correctiveActions = rows(r.correctiveActions);
    const evidence = correctiveActions.map(row => item("Corrective action", row, row.actionNumber, row.title, row.status, row.verifiedAt || row.completedAt));
    if (correctiveActions.length === 100) evidence.push(item("Projection limit", {}, "", "At most 100 linked corrective actions are included; additional linked corrective actions may be omitted.", "bounded"));
    return evidence;
  } },
  inspection: {
    listKey: "Inspection",
    permission: "canReadSafety",
    query: "id inspectionNumber title description status scheduledAt startedAt completedAt inspector { name } project { id company { id } } items(take: 300, orderBy: [{ sequence: asc }, { id: asc }]) { id sequence prompt result response completedAt correctiveActions(take: 100, orderBy: [{ createdAt: asc }, { id: asc }]) { id actionNumber status } }",
    reference: "inspectionNumber",
    title: "title",
    evidence: record => {
      const inspectionItems = rows(record.items);
      const itemEvidence = inspectionItems.map(row => item(
        "Inspection item",
        row,
        `Item ${String(row.sequence ?? "")}`,
        `${text(row.prompt)} · ${text(row.response)}`,
        row.result,
        row.completedAt,
      ));
      const correctiveActionEvidence: DetailItem[] = [];
      const projectionLimitEvidence: DetailItem[] = [];
      if (inspectionItems.length >= 300) {
        projectionLimitEvidence.push(item(
          "Projection limit",
          {},
          "",
          "At most 300 inspection items are included; corrective actions linked to additional items may be omitted.",
          "bounded",
        ));
      }
      for (const inspectionItem of inspectionItems) {
        for (const action of rows(inspectionItem.correctiveActions)) {
          if (correctiveActionEvidence.length >= MAX_INSPECTION_CORRECTIVE_ACTION_DETAILS) break;
          correctiveActionEvidence.push(item(
            "Corrective action",
            action,
            action.actionNumber,
            `Linked to inspection item ${String(inspectionItem.sequence ?? "")}`,
            action.status,
          ));
        }
        if (correctiveActionEvidence.length >= MAX_INSPECTION_CORRECTIVE_ACTION_DETAILS) break;
      }
      if (correctiveActionEvidence.length >= MAX_INSPECTION_CORRECTIVE_ACTION_DETAILS) {
        projectionLimitEvidence.push(item(
          "Projection limit",
          {},
          "",
          "At most 100 linked corrective actions are shown; additional actions may be omitted.",
          "bounded",
        ));
      }
      return [...itemEvidence, ...correctiveActionEvidence, ...projectionLimitEvidence];
    },
  },
  incident: { listKey: "SafetyIncident", permission: "canReadSafety", query: "id incidentNumber title description status severity occurredAt reportedAt investigator { name } project { id company { id } } correctiveActions(take: 200) { id actionNumber title status completedAt verifiedAt }", reference: "incidentNumber", title: "title", evidence: r => rows(r.correctiveActions).map(row => item("Corrective action", row, row.actionNumber, row.title, row.status, row.verifiedAt || row.completedAt)) },
  "corrective-action": { listKey: "CorrectiveAction", permission: "canReadSafety", query: "id actionNumber title description status priority dueAt completionNotes evidenceReference completedAt verifiedAt assignedTo { name } verifiedBy { name } project { id company { id } }", reference: "actionNumber", title: "title" },
  "material-receipt": { listKey: "MaterialReceipt", permission: "canReadContracts", query: "id receiptNumber status receivedAt packingSlipReference evidenceFileName notes tradePartner { name } receivedBy { name } project { id company { id } } lines(take: 200, orderBy: { lineNumber: asc }) { id lineNumber quantityReceived quantityAccepted quantityRejected exceptionReason requestLine { description } }", reference: "receiptNumber", title: "packingSlipReference", evidence: r => {
    const lines = rows(r.lines);
    const evidence = lines.map(row => item("Receipt line", row, `Line ${String(row.lineNumber ?? "")}`, `${text(relation(row.requestLine).description)} · accepted ${String(row.quantityAccepted ?? 0)} / received ${String(row.quantityReceived ?? 0)}`, Number(row.quantityRejected ?? 0) > 0 ? "exception" : "accepted"));
    if (lines.length === 200) evidence.push(item("Projection limit", {}, "", "At most 200 receipt lines are included; additional lines may be omitted.", "bounded"));
    return evidence;
  } },
  "progress-claim": { listKey: "ProgressClaim", permission: "canReadBilling", query: "id claimNumber invoiceNumber status periodStart periodEnd dueAt revisedContractMinor currentPaymentDueMinor retainageMinor balanceToFinishMinor currencyCode submittedAt approvedAt tradePartner { name } project { id company { id } } lineItems(take: 300, orderBy: { lineNumber: asc }) { id lineNumber description currentWorkMinor retainageMinor earnedLessRetainageMinor } allocations(take: 200) { id amountMinor payment { paymentNumber status } }", reference: "claimNumber", title: "invoiceNumber", evidence: r => {
    const lineItems = rows(r.lineItems);
    const allocations = rows(r.allocations);
    const evidence = [
      ...lineItems.map(row => item("Claim line", row, `Line ${String(row.lineNumber ?? "")}`, row.description, money(row.earnedLessRetainageMinor, r.currencyCode))),
      ...allocations.map(row => item("Payment allocation", row, relation(row.payment).paymentNumber, money(row.amountMinor, r.currencyCode), relation(row.payment).status)),
    ];
    if (lineItems.length === 300) evidence.push(item("Projection limit", {}, "", "At most 300 claim line items are included; additional line items may be omitted.", "bounded"));
    if (allocations.length === 200) evidence.push(item("Projection limit", {}, "", "At most 200 payment allocations are included; additional allocations may be omitted.", "bounded"));
    return evidence;
  } },
  "retainage-release": { listKey: "RetainageRelease", permission: "canReadBilling", query: "id releaseNumber status amountMinor currencyCode requestedAt approvedAt releasedAt reason approvedBy { name } progressClaim { claimNumber } payment { paymentNumber status } project { id company { id } }", reference: "releaseNumber", title: "reason" },
  "lien-waiver": { listKey: "LienWaiver", permission: "canReadBilling", query: "id waiverNumber waiverType status throughDate amountMinor currencyCode requestedAt receivedAt signedAt tradePartner { name } commitment { number } progressClaim { claimNumber } payment { paymentNumber status } project { id company { id } }", reference: "waiverNumber", title: "waiverType" },
  payment: { listKey: "Payment", permission: "canReadBilling", query: "id paymentNumber direction status amountMinor currencyCode paymentMethod reference paidAt settledAt tradePartner { name } project { id company { id } } allocations(take: 200) { id amountMinor progressClaim { claimNumber } } reversals(take: 20) { id reversalNumber amountMinor reason externalReference effectiveAt }", reference: "paymentNumber", title: "reference", evidence: r => {
    const allocations = rows(r.allocations);
    const reversals = rows(r.reversals);
    const evidence = [
      ...allocations.map(row => item("Allocation", row, relation(row.progressClaim).claimNumber, money(row.amountMinor, r.currencyCode), "recorded")),
      ...reversals.map(row => item("Reversal", row, row.reversalNumber, `${text(row.externalReference)} · ${text(row.reason)}`, money(row.amountMinor, r.currencyCode), row.effectiveAt)),
    ];
    if (allocations.length === 200) evidence.push(item("Projection limit", {}, "", "At most 200 payment allocations are included; additional allocations may be omitted.", "bounded"));
    if (reversals.length === 20) evidence.push(item("Projection limit", {}, "", "At most 20 payment reversals are included; additional reversals may be omitted.", "bounded"));
    return evidence;
  } },
  document: { listKey: "Document", permission: "canReadDocuments", query: "id documentNumber title description documentType status project { id company { id } } versions(take: 200, orderBy: { versionNumber: desc }) { id versionNumber revisionLabel fileName issuedAt }", reference: "documentNumber", title: "title", evidence: r => {
    const versions = rows(r.versions);
    const evidence = versions.map(row => item("Document version", row, `v${String(row.versionNumber ?? "")}`, row.fileName, row.issuedAt ? "issued" : "draft", row.issuedAt));
    if (versions.length === 200) evidence.push(item("Projection limit", {}, "", "At most 200 document versions are included; additional versions may be omitted.", "bounded"));
    return evidence;
  } },
  drawing: { listKey: "Drawing", permission: "canReadDocuments", query: "id drawingNumber title discipline status project { id company { id } } revisions(take: 200, orderBy: { issuedAt: desc }) { id revisionNumber titleSnapshot status fileName issuedAt }", reference: "drawingNumber", title: "title", evidence: r => {
    const revisions = rows(r.revisions);
    const evidence = revisions.map(row => item("Drawing revision", row, row.revisionNumber, row.fileName, row.status, row.issuedAt));
    if (revisions.length === 200) evidence.push(item("Projection limit", {}, "", "At most 200 drawing revisions are included; additional revisions may be omitted.", "bounded"));
    return evidence;
  } },
  schedule: {
    listKey: "Schedule",
    permission: "canReadProjectExecution",
    query: "id name scheduleType status dataDate publishedAt publishedBy { name } project { id company { id } } tasks(take: 500, orderBy: { plannedStart: asc }) { id taskCode name status plannedStart plannedFinish percentComplete assignedTo { name } }",
    reference: "scheduleType",
    title: "name",
    evidence: r => {
      const tasks = rows(r.tasks);
      const evidence = tasks.map(row => item("Schedule task", row, row.taskCode, `${text(row.name)} · ${String(row.percentComplete ?? 0)}%`, row.status, row.plannedFinish || row.plannedStart));
      if (tasks.length === 500) evidence.push(item("Projection limit", {}, "", "At most 500 schedule tasks are included; additional tasks may be omitted.", "bounded"));
      return evidence;
    },
  },
  "schedule-task": { listKey: "ScheduleTask", permission: "canReadProjectExecution", query: "id taskCode name description status plannedStart plannedFinish actualStart actualFinish percentComplete assignedTo { name } project { id company { id } } predecessorDependencies(take: 100) { id dependencyType lagDays predecessor { taskCode name } } successorDependencies(take: 100) { id dependencyType lagDays successor { taskCode name } }", reference: "taskCode", title: "name", evidence: r => {
    const predecessors = rows(r.predecessorDependencies);
    const successors = rows(r.successorDependencies);
    const evidence = [
      ...predecessors.map(row => item("Predecessor", row, relation(row.predecessor).taskCode, relation(row.predecessor).name, row.dependencyType)),
      ...successors.map(row => item("Successor", row, relation(row.successor).taskCode, relation(row.successor).name, row.dependencyType)),
    ];
    if (predecessors.length === 100) evidence.push(item("Projection limit", {}, "", "At most 100 predecessor dependencies are included; additional predecessor dependencies may be omitted.", "bounded"));
    if (successors.length === 100) evidence.push(item("Projection limit", {}, "", "At most 100 successor dependencies are included; additional successor dependencies may be omitted.", "bounded"));
    return evidence;
  } },
};

function contractEvidence(record: Record<string, unknown>): DetailItem[] {
  const changeOrders = rows(record.changeOrders);
  const evidence = [
    ...rows(record.lineItems).map(row => item("SOV line", row, relation(row.budgetCode).code, row.description, money(row.revisedValueMinor, record.currencyCode))),
    ...changeOrders.map(row => item("Change order", row, row.number, row.title, row.status)),
  ];
  if (changeOrders.length === 200) {
    evidence.push(item("Projection limit", {}, "", "At most 200 related change orders are included; additional change orders may be omitted.", "bounded"));
  }
  return evidence;
}

function primeContractEvidence(record: Record<string, unknown>): DetailItem[] {
  const evidence = contractEvidence(record);
  if (rows(record.lineItems).length === 300) {
    evidence.push(item("Projection limit", {}, "", "At most 300 prime contract SOV lines are included; additional SOV lines may be omitted.", "bounded"));
  }
  return evidence;
}

function commitmentEvidence(record: Record<string, unknown>): DetailItem[] {
  const evidence = contractEvidence(record);
  if (rows(record.lineItems).length === 300) {
    evidence.push(item("Projection limit", {}, "", "At most 300 commitment SOV lines are included; additional SOV lines may be omitted.", "bounded"));
  }
  return evidence;
}

const baseFields = [
  ["description", "Description"], ["question", "Question"], ["status", "Status"], ["priority", "Priority"],
  ["severity", "Severity"], ["direction", "Direction"], ["dueAt", "Due"], ["occurredAt", "Occurred"],
  ["periodStart", "Period start"], ["periodEnd", "Period end"], ["tradePartner", "Trade partner"],
  ["responsiblePartner", "Responsible partner"], ["ballInCourt", "Ball in court"], ["assignedTo", "Assigned to"],
  ["revisedContractMinor", "Revised contract"], ["billedToDateMinor", "Billed to date"], ["invoicedToDateMinor", "Invoiced to date"],
  ["paidToDateMinor", "Paid to date"], ["currentPaymentDueMinor", "Current payment due"], ["retainageMinor", "Retainage"],
  ["balanceToFinishMinor", "Balance to finish"], ["amountMinor", "Amount"], ["totalMinor", "Total"],
  ["completionNotes", "Completion notes"], ["evidenceReference", "Evidence reference"], ["percentComplete", "Percent complete"],
] as const;

export async function constructionRecordDetail(
  _root: unknown,
  { projectId, recordType, recordId }: { projectId: string; recordType: string; recordId: string },
  context: CommandContext,
) {
  if (recordType === "resource-log") return resourceLogDetail(projectId, recordId, context as ResourceContext);
  const config = configs[recordType];
  if (!config) throw new Error("This construction record does not have a bounded detail projection");
  const session = requireCommandSession(context);
  const project = await queryById(context, "Project", projectId, "id company { id }");
  const companyId = project?.company?.id;
  const internalGrant = session.authType === "api_key" ||
    session.data.projectMemberships?.some(entry => entry.status === "active" && entry.project?.id === projectId && entry.portalType === "internal") ||
    session.data.companyMemberships?.some(entry => entry.status === "active" && entry.company?.id === companyId && entry.canAccessAllProjects);
  if (!companyId || !internalGrant || !hasProjectPermission(session, companyId, projectId, config.permission) || !(await canAccessProjectById(context, session.itemId, projectId))) {
    throw new Error("Construction record not found for this project role");
  }
  const record = await queryById(context, config.listKey, recordId, config.query);
  if (!record?.id || record.project?.id !== projectId) throw new Error("Construction record not found in this project");
  const currency = record.currencyCode ?? "USD";
  const fields = baseFields.flatMap(([key, label]) => {
    const value = record[key];
    if (value === null || value === undefined || value === "") return [];
    const rendered = key.endsWith("Minor") ? money(value, currency)
      : ["tradePartner", "responsiblePartner", "ballInCourt", "assignedTo"].includes(key) ? text(relation(value).name)
      : key.endsWith("At") || key === "dueAt" || key.startsWith("period") ? date(value) ?? ""
      : String(value);
    return rendered ? [{ label, value: rendered }] : [];
  });
  let history: DetailItem[] = [];
  if (hasProjectPermission(session, companyId, projectId, "canReadAudit")) {
    const actions = await context.sudo().query.AgentAction.findMany!({
      where: { project: { id: { equals: projectId } }, targetType: { equals: config.listKey }, targetId: { equals: recordId } },
      take: 100, orderBy: { requestedAt: "desc" }, query: "id action status targetStatus reason requestedAt actorUser { name } requestedBy { name }",
    });
    history = actions.map(row => item("Audit action", row, text(relation(row.actorUser).name, text(relation(row.requestedBy).name)), `${text(row.action)} · ${text(row.reason)}`, row.status, row.requestedAt));
  }
  return {
    id: String(record.id), recordType, listKey: config.listKey,
    reference: text(record[config.reference]), title: text(record[config.title], config.listKey), status: text(record.status, "recorded"),
    fields, evidence: linkChildren(config.evidence?.(record) ?? []), history: history.map(entry => ({ ...entry, recordType: null, recordId: null })),
    allowedTransitions: session.authType === "api_key" ? [] : recordAllowedTransitions(session, config.listKey, text(record.status), companyId, projectId),
  };
}
