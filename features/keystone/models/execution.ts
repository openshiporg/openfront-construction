import { list } from "@keystone-6/core";
import { denyAll } from "@keystone-6/core/access";
import {
  checkbox,
  decimal,
  integer,
  relationship,
  select,
  text,
  timestamp,
} from "@keystone-6/core/fields";

import { controlledProjectModelAccess } from "../access";
import type { ValidationHookArgs } from "../domain/hooks";
import { immutableProjectSnapshotHooks } from "../domain/snapshots";
import {
  getConnectedId,
  projectTenantHooks,
  queryById,
} from "../domain/tenancy";
import {
  companyTenantField,
  lifecycleStatus,
  projectTenantField,
} from "./fields";
import { trackingFields } from "./trackingFields";

const executionAccess = () =>
  controlledProjectModelAccess("canReadProjectExecution", "canManageProjectExecution");
const documentAccess = () =>
  controlledProjectModelAccess("canReadDocuments", "canManageDocuments");
const fieldAccess = () =>
  controlledProjectModelAccess("canReadFieldOperations", "canManageFieldOperations");

export const RFI = list({
  access: executionAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["number", "subject", "status", "ballInCourt", "dueAt"] } },
  fields: {
    number: text({ validation: { isRequired: true, length: { min: 1, max: 80 } } }),
    subject: text({ validation: { isRequired: true, length: { min: 1, max: 300 } } }),
    question: text({ validation: { isRequired: true }, ui: { displayMode: "textarea" } }),
    status: lifecycleStatus([
      { label: "Draft", value: "draft" },
      { label: "Open", value: "open" },
      { label: "Answered", value: "answered" },
      { label: "Closed", value: "closed" },
      { label: "Voided", value: "voided" },
    ], "draft"),
    priority: select({
      type: "enum",
      options: [
        { label: "Low", value: "low" },
        { label: "Normal", value: "normal" },
        { label: "High", value: "high" },
        { label: "Critical", value: "critical" },
      ],
      defaultValue: "normal",
      validation: { isRequired: true },
    }),
    scheduleImpactDays: integer({ defaultValue: 0 }),
    costImpact: select({
      type: "enum",
      options: [
        { label: "Unknown", value: "unknown" },
        { label: "No Impact", value: "none" },
        { label: "Potential", value: "potential" },
        { label: "Confirmed", value: "confirmed" },
      ],
      defaultValue: "unknown",
    }),
    dueAt: timestamp(),
    openedAt: timestamp(),
    answeredAt: timestamp(),
    closedAt: timestamp(),
    raisedBy: relationship({ ref: "User" }),
    ballInCourt: relationship({ ref: "User" }),
    responsiblePartner: relationship({ ref: "TradePartner" }),
    location: relationship({ ref: "ProjectLocation" }),
    specificationSection: relationship({ ref: "SpecificationSection.rfis" }),
    drawingRevision: relationship({ ref: "DrawingRevision.rfis" }),
    responses: relationship({ ref: "RFIResponse.rfi", many: true, access: { create: denyAll, update: denyAll } }),
    changeEvents: relationship({ ref: "ChangeEvent.sourceRfi", many: true, access: { create: denyAll, update: denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.rfis"),
    ...trackingFields,
  },
});

export const RFIResponse = list({
  access: executionAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["rfi", "author", "isOfficial", "respondedAt"] } },
  fields: {
    response: text({ validation: { isRequired: true }, ui: { displayMode: "textarea" } }),
    isOfficial: checkbox({ defaultValue: false }),
    respondedAt: timestamp({ defaultValue: { kind: "now" }, validation: { isRequired: true } }),
    rfi: relationship({ ref: "RFI.responses" }),
    author: relationship({ ref: "User" }),
    onBehalfOf: relationship({ ref: "TradePartner" }),
    company: companyTenantField(),
    project: projectTenantField("Project.rfiResponses"),
    ...trackingFields,
  },
});

export const SpecificationSection = list({
  access: documentAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["sectionNumber", "title", "division", "project"] } },
  fields: {
    sectionNumber: text({ validation: { isRequired: true, length: { min: 1, max: 40 } } }),
    title: text({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    division: text({ validation: { length: { max: 120 } } }),
    description: text({ ui: { displayMode: "textarea" } }),
    submittals: relationship({ ref: "Submittal.specificationSection", many: true, access: { create: denyAll, update: denyAll } }),
    rfis: relationship({ ref: "RFI.specificationSection", many: true, access: { create: denyAll, update: denyAll } }),
    inspections: relationship({ ref: "Inspection.specificationSection", many: true, access: { create: denyAll, update: denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.specificationSections"),
    ...trackingFields,
  },
});

export const Submittal = list({
  access: executionAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["number", "title", "status", "ballInCourt", "dueAt"] } },
  fields: {
    number: text({ validation: { isRequired: true, length: { min: 1, max: 80 } } }),
    revision: integer({ defaultValue: 0, validation: { min: 0 } }),
    title: text({ validation: { isRequired: true, length: { min: 1, max: 300 } } }),
    description: text({ ui: { displayMode: "textarea" } }),
    submittalType: select({
      type: "enum",
      options: [
        { label: "Shop Drawing", value: "shop_drawing" },
        { label: "Product Data", value: "product_data" },
        { label: "Sample", value: "sample" },
        { label: "Closeout", value: "closeout" },
        { label: "Mockup", value: "mockup" },
        { label: "Other", value: "other" },
      ],
      defaultValue: "product_data",
      validation: { isRequired: true },
    }),
    status: lifecycleStatus([
      { label: "Draft", value: "draft" },
      { label: "Submitted", value: "submitted" },
      { label: "Under Review", value: "under_review" },
      { label: "Approved", value: "approved" },
      { label: "Revise and Resubmit", value: "revise_resubmit" },
      { label: "Rejected", value: "rejected" },
      { label: "Closed", value: "closed" },
      { label: "Voided", value: "voided" },
    ], "draft"),
    requiredOnSiteAt: timestamp(),
    dueAt: timestamp(),
    submittedAt: timestamp(),
    closedAt: timestamp(),
    specificationSection: relationship({ ref: "SpecificationSection.submittals" }),
    responsiblePartner: relationship({ ref: "TradePartner" }),
    submitter: relationship({ ref: "User" }),
    submittalManager: relationship({ ref: "User" }),
    ballInCourt: relationship({ ref: "User" }),
    reviews: relationship({ ref: "SubmittalReview.submittal", many: true, access: { create: denyAll, update: denyAll } }),
    documents: relationship({ ref: "Document.submittals", many: true, access: { create: denyAll, update: denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.submittals"),
    ...trackingFields,
  },
});

export const SubmittalReview = list({
  access: executionAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["submittal", "submittalRevision", "sequence", "reviewer", "status", "completedAt"] } },
  fields: {
    sequence: integer({ defaultValue: 1, validation: { min: 1 } }),
    // The submittal revision this review step belongs to. Each resubmission
    // starts a new round; earlier rounds stay as history.
    submittalRevision: integer({ defaultValue: 0, validation: { min: 0 }, access: { update: denyAll } }),
    status: select({
      type: "enum",
      options: [
        { label: "Pending", value: "pending" },
        { label: "In Review", value: "in_review" },
        { label: "Approved", value: "approved" },
        { label: "Approved as Noted", value: "approved_as_noted" },
        { label: "Revise and Resubmit", value: "revise_resubmit" },
        { label: "Rejected", value: "rejected" },
      ],
      defaultValue: "pending",
      validation: { isRequired: true },
    }),
    response: text({ ui: { displayMode: "textarea" } }),
    dueAt: timestamp(),
    completedAt: timestamp(),
    submittal: relationship({ ref: "Submittal.reviews" }),
    reviewer: relationship({ ref: "User" }),
    reviewerPartner: relationship({ ref: "TradePartner" }),
    company: companyTenantField(),
    project: projectTenantField("Project.submittalReviews"),
    ...trackingFields,
  },
});

export const Drawing = list({
  access: documentAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["drawingNumber", "title", "discipline", "status", "currentRevision"] } },
  fields: {
    drawingNumber: text({ validation: { isRequired: true, length: { min: 1, max: 100 } } }),
    title: text({ validation: { isRequired: true, length: { min: 1, max: 300 } } }),
    discipline: text({ validation: { length: { max: 120 } } }),
    status: select({
      type: "enum",
      options: [
        { label: "Active", value: "active" },
        { label: "Archived", value: "archived" },
        { label: "Voided", value: "voided" },
      ],
      defaultValue: "active",
      validation: { isRequired: true },
    }),
    currentRevision: relationship({ ref: "DrawingRevision.currentForDrawing" }),
    revisions: relationship({ ref: "DrawingRevision.drawing", many: true, access: { create: denyAll, update: denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.drawings"),
    ...trackingFields,
  },
});

export const DrawingRevision = list({
  access: documentAccess(),
  hooks: {
    ...immutableProjectSnapshotHooks("DrawingRevision"),
    resolveInput: async args => {
      const resolved = await immutableProjectSnapshotHooks("DrawingRevision").resolveInput(args);
      if (args.operation !== "create") return resolved;
      const drawingId = getConnectedId(resolved.drawing);
      const revisionNumber = resolved.revisionNumber;
      if (!drawingId || revisionNumber === null || revisionNumber === undefined) {
        throw new Error("DrawingRevision requires drawing and revisionNumber");
      }
      return { ...resolved, revisionKey: `${drawingId}:${String(revisionNumber).trim().toLowerCase()}` };
    },
  },
  ui: { listView: { initialColumns: ["drawing", "revisionNumber", "status", "issuedAt"] } },
  fields: {
    revisionKey: text({
      isIndexed: "unique",
      access: { create: denyAll, update: denyAll },
      ui: { createView: { fieldMode: "hidden" }, itemView: { fieldMode: "read" } },
    }),
    revisionNumber: text({ validation: { isRequired: true, length: { min: 1, max: 40 } }, access: { update: denyAll } }),
    titleSnapshot: text({ validation: { isRequired: true }, access: { update: denyAll } }),
    status: select({
      type: "enum",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Issued", value: "issued" },
        { label: "Superseded", value: "superseded" },
        { label: "Voided", value: "voided" },
      ],
      defaultValue: "draft",
      validation: { isRequired: true },
    }),
    fileName: text({ validation: { isRequired: true }, access: { update: denyAll } }),
    storageKey: text({ validation: { isRequired: true }, access: { update: denyAll } }),
    mimeType: text({ access: { update: denyAll } }),
    byteSize: integer({ validation: { min: 0 }, access: { update: denyAll } }),
    checksumSha256: text({ validation: { length: { min: 64, max: 64 } }, access: { update: denyAll } }),
    issuedAt: timestamp(),
    receivedAt: timestamp(),
    uploadedBy: relationship({ ref: "User" }),
    drawing: relationship({ ref: "Drawing.revisions", access: { update: denyAll } }),
    currentForDrawing: relationship({ ref: "Drawing.currentRevision", access: { create: denyAll, update: denyAll } }),
    rfis: relationship({ ref: "RFI.drawingRevision", many: true, access: { create: denyAll, update: denyAll } }),
    punchItems: relationship({ ref: "PunchItem.drawingRevision", many: true, access: { create: denyAll, update: denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.drawingRevisions"),
    ...trackingFields,
  },
});

export const Document = list({
  access: documentAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["documentNumber", "title", "documentType", "status", "currentVersion"] } },
  fields: {
    documentNumber: text({ validation: { isRequired: true, length: { min: 1, max: 100 } } }),
    title: text({ validation: { isRequired: true, length: { min: 1, max: 300 } } }),
    documentType: select({
      type: "enum",
      options: [
        { label: "Contract", value: "contract" },
        { label: "Specification", value: "specification" },
        { label: "Submittal", value: "submittal" },
        { label: "RFI", value: "rfi" },
        { label: "Report", value: "report" },
        { label: "Photo", value: "photo" },
        { label: "Correspondence", value: "correspondence" },
        { label: "Other", value: "other" },
      ],
      defaultValue: "other",
      validation: { isRequired: true },
    }),
    status: select({
      type: "enum",
      options: [
        { label: "Active", value: "active" },
        { label: "Archived", value: "archived" },
        { label: "Voided", value: "voided" },
      ],
      defaultValue: "active",
      validation: { isRequired: true },
    }),
    folderPath: text(),
    description: text({ ui: { displayMode: "textarea" } }),
    currentVersion: relationship({ ref: "DocumentVersion.currentForDocument" }),
    versions: relationship({ ref: "DocumentVersion.document", many: true, access: { create: denyAll, update: denyAll } }),
    submittals: relationship({ ref: "Submittal.documents", many: true, access: { create: denyAll, update: denyAll } }),
    dailyLogEntries: relationship({ ref: "DailyLogEntry.documents", many: true, access: { create: denyAll, update: denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.documents"),
    ...trackingFields,
  },
});

export const DocumentVersion = list({
  access: documentAccess(),
  hooks: {
    ...immutableProjectSnapshotHooks("DocumentVersion"),
    resolveInput: async args => {
      const resolved = await immutableProjectSnapshotHooks("DocumentVersion").resolveInput(args);
      if (args.operation !== "create") return resolved;
      const documentId = getConnectedId(resolved.document);
      const versionNumber = resolved.versionNumber;
      if (!documentId || versionNumber === null || versionNumber === undefined) {
        throw new Error("DocumentVersion requires document and versionNumber");
      }
      return { ...resolved, versionKey: `${documentId}:${String(versionNumber).trim().toLowerCase()}` };
    },
  },
  ui: { listView: { initialColumns: ["document", "versionNumber", "revisionLabel", "issuedAt"] } },
  fields: {
    versionKey: text({
      isIndexed: "unique",
      access: { create: denyAll, update: denyAll },
      ui: { createView: { fieldMode: "hidden" }, itemView: { fieldMode: "read" } },
    }),
    versionNumber: integer({ validation: { isRequired: true, min: 1 }, access: { update: denyAll } }),
    revisionLabel: text({ validation: { length: { max: 80 } }, access: { update: denyAll } }),
    titleSnapshot: text({ validation: { isRequired: true }, access: { update: denyAll } }),
    fileName: text({ validation: { isRequired: true }, access: { update: denyAll } }),
    storageKey: text({ validation: { isRequired: true }, access: { update: denyAll } }),
    mimeType: text({ access: { update: denyAll } }),
    byteSize: integer({ validation: { min: 0 }, access: { update: denyAll } }),
    checksumSha256: text({ validation: { length: { min: 64, max: 64 } }, access: { update: denyAll } }),
    notes: text({ ui: { displayMode: "textarea" } }),
    issuedAt: timestamp(),
    uploadedBy: relationship({ ref: "User" }),
    document: relationship({ ref: "Document.versions", access: { update: denyAll } }),
    currentForDocument: relationship({ ref: "Document.currentVersion", access: { create: denyAll, update: denyAll } }),
    distributions: relationship({ ref: "DocumentDistribution.documentVersion", many: true, access: { create: denyAll, update: denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.documentVersions"),
    ...trackingFields,
  },
});

export const DailyLog = list({
  access: fieldAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["logDate", "status", "preparedBy", "project"] } },
  fields: {
    logDate: timestamp({ validation: { isRequired: true } }),
    status: lifecycleStatus([
      { label: "Draft", value: "draft" },
      { label: "Submitted", value: "submitted" },
      { label: "Approved", value: "approved" },
    ], "draft"),
    weatherSummary: text(),
    highTemperatureC: decimal({ precision: 5, scale: 2 }),
    lowTemperatureC: decimal({ precision: 5, scale: 2 }),
    precipitationMm: decimal({ precision: 8, scale: 2 }),
    generalNotes: text({ ui: { displayMode: "textarea" } }),
    submittedAt: timestamp(),
    approvedAt: timestamp(),
    preparedBy: relationship({ ref: "User" }),
    approvedBy: relationship({ ref: "User" }),
    entries: relationship({ ref: "DailyLogEntry.dailyLog", many: true, access: { create: denyAll, update: denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.dailyLogs"),
    ...trackingFields,
  },
});

export const DailyLogEntry = list({
  access: fieldAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["entryType", "title", "dailyLog", "location"] } },
  fields: {
    entryType: select({
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
        { label: "Note", value: "note" },
      ],
      defaultValue: "note",
      validation: { isRequired: true },
    }),
    title: text({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    details: text({ ui: { displayMode: "textarea" } }),
    startedAt: timestamp(),
    endedAt: timestamp(),
    workerCount: integer({ validation: { min: 0 } }),
    quantity: decimal({ precision: 18, scale: 4 }),
    unit: text(),
    delayDays: integer({ validation: { min: 0 } }),
    dailyLog: relationship({ ref: "DailyLog.entries" }),
    location: relationship({ ref: "ProjectLocation" }),
    tradePartner: relationship({ ref: "TradePartner" }),
    equipment: relationship({ ref: "Equipment" }),
    material: relationship({ ref: "Material" }),
    safetyIncident: relationship({ ref: "SafetyIncident.dailyLogEntries" }),
    inspection: relationship({ ref: "Inspection.dailyLogEntries" }),
    scheduleTask: relationship({ ref: "ScheduleTask.dailyLogEntries" }),
    documents: relationship({ ref: "Document.dailyLogEntries", many: true }),
    company: companyTenantField(),
    project: projectTenantField("Project.dailyLogEntries"),
    ...trackingFields,
  },
});

export const Schedule = list({
  access: executionAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["name", "scheduleType", "status", "version", "dataDate"] } },
  fields: {
    name: text({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    scheduleType: select({
      type: "enum",
      options: [
        { label: "Baseline", value: "baseline" },
        { label: "Current", value: "current" },
        { label: "Lookahead", value: "lookahead" },
        { label: "Recovery", value: "recovery" },
      ],
      defaultValue: "current",
      validation: { isRequired: true },
    }),
    status: lifecycleStatus([
      { label: "Draft", value: "draft" },
      { label: "Published", value: "published" },
      { label: "Archived", value: "archived" },
    ], "draft"),
    version: integer({ defaultValue: 1, validation: { min: 1 } }),
    dataDate: timestamp(),
    publishedAt: timestamp(),
    publishedBy: relationship({ ref: "User" }),
    tasks: relationship({ ref: "ScheduleTask.schedule", many: true, access: { create: denyAll, update: denyAll } }),
    dependencies: relationship({ ref: "ScheduleDependency.schedule", many: true, access: { create: denyAll, update: denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.schedules"),
    ...trackingFields,
  },
});

export const ScheduleTask = list({
  access: executionAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["taskCode", "name", "status", "plannedStart", "plannedFinish"] } },
  fields: {
    taskCode: text({ validation: { isRequired: true, length: { min: 1, max: 80 } } }),
    name: text({ validation: { isRequired: true, length: { min: 1, max: 300 } } }),
    description: text({ ui: { displayMode: "textarea" } }),
    status: lifecycleStatus([
      { label: "Not Started", value: "not_started" },
      { label: "In Progress", value: "in_progress" },
      { label: "Completed", value: "completed" },
      { label: "Delayed", value: "delayed" },
      { label: "On Hold", value: "on_hold" },
    ], "not_started"),
    plannedStart: timestamp(),
    plannedFinish: timestamp(),
    actualStart: timestamp(),
    actualFinish: timestamp(),
    percentComplete: integer({ defaultValue: 0, validation: { min: 0, max: 100 } }),
    totalFloatDays: integer(),
    isMilestone: checkbox({ defaultValue: false }),
    schedule: relationship({ ref: "Schedule.tasks" }),
    parent: relationship({ ref: "ScheduleTask.children" }),
    children: relationship({ ref: "ScheduleTask.parent", many: true, access: { create: denyAll, update: denyAll } }),
    location: relationship({ ref: "ProjectLocation" }),
    responsiblePartner: relationship({ ref: "TradePartner" }),
    assignedTo: relationship({ ref: "User" }),
    predecessorDependencies: relationship({ ref: "ScheduleDependency.successor", many: true, access: { create: denyAll, update: denyAll } }),
    successorDependencies: relationship({ ref: "ScheduleDependency.predecessor", many: true, access: { create: denyAll, update: denyAll } }),
    dailyLogEntries: relationship({ ref: "DailyLogEntry.scheduleTask", many: true, access: { create: denyAll, update: denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.scheduleTasks"),
    ...trackingFields,
  },
});

async function validateScheduleDependency(args: ValidationHookArgs) {
  const predecessorId = getConnectedId(args.resolvedData.predecessor);
  const successorId = getConnectedId(args.resolvedData.successor);
  if (predecessorId && successorId && predecessorId === successorId) {
    args.addValidationError("A schedule task cannot depend on itself");
    return;
  }
  if (args.operation !== "create" || !predecessorId || !successorId) return;
  const [predecessor, successor] = await Promise.all([
    queryById(args.context, "ScheduleTask", predecessorId, "schedule { id }"),
    queryById(args.context, "ScheduleTask", successorId, "schedule { id }"),
  ]) as [
    { schedule?: { id?: string } | null } | null,
    { schedule?: { id?: string } | null } | null,
  ];
  if (!predecessor?.schedule?.id || predecessor.schedule.id !== successor?.schedule?.id) {
    args.addValidationError("Schedule dependencies must connect tasks in the same schedule");
  }
}

export const ScheduleDependency = list({
  access: executionAccess(),
  hooks: {
    ...projectTenantHooks(),
    validate: { create: validateScheduleDependency, update: validateScheduleDependency },
  },
  ui: { listView: { initialColumns: ["predecessor", "successor", "dependencyType", "lagDays"] } },
  fields: {
    dependencyType: select({
      type: "enum",
      options: [
        { label: "Finish to Start", value: "finish_to_start" },
        { label: "Start to Start", value: "start_to_start" },
        { label: "Finish to Finish", value: "finish_to_finish" },
        { label: "Start to Finish", value: "start_to_finish" },
      ],
      defaultValue: "finish_to_start",
      validation: { isRequired: true },
    }),
    lagDays: integer({ defaultValue: 0 }),
    schedule: relationship({ ref: "Schedule.dependencies" }),
    predecessor: relationship({ ref: "ScheduleTask.successorDependencies" }),
    successor: relationship({ ref: "ScheduleTask.predecessorDependencies" }),
    company: companyTenantField(),
    project: projectTenantField("Project.scheduleDependencies"),
    ...trackingFields,
  },
});

export const PunchItem = list({
  access: fieldAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["number", "title", "status", "priority", "assignedTo", "dueAt"] } },
  fields: {
    number: text({ validation: { isRequired: true, length: { min: 1, max: 80 } } }),
    title: text({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    description: text({ validation: { isRequired: true }, ui: { displayMode: "textarea" } }),
    status: lifecycleStatus([
      { label: "Open", value: "open" },
      { label: "In Progress", value: "in_progress" },
      { label: "Ready for Review", value: "ready_for_review" },
      { label: "Closed", value: "closed" },
      { label: "Voided", value: "voided" },
    ], "open"),
    priority: select({
      type: "enum",
      options: [
        { label: "Low", value: "low" },
        { label: "Normal", value: "normal" },
        { label: "High", value: "high" },
        { label: "Critical", value: "critical" },
      ],
      defaultValue: "normal",
    }),
    dueAt: timestamp(),
    completedAt: timestamp(),
    closedAt: timestamp(),
    createdBy: relationship({ ref: "User" }),
    assignedTo: relationship({ ref: "User" }),
    responsiblePartner: relationship({ ref: "TradePartner" }),
    location: relationship({ ref: "ProjectLocation" }),
    drawingRevision: relationship({ ref: "DrawingRevision.punchItems" }),
    inspectionItem: relationship({ ref: "InspectionItem.punchItems" }),
    correctiveActions: relationship({ ref: "CorrectiveAction.punchItem", many: true, access: { create: denyAll, update: denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.punchItems"),
    ...trackingFields,
  },
});
