import { list } from "@keystone-6/core";
import { denyAll } from "@keystone-6/core/access";
import {
  checkbox,
  integer,
  relationship,
  select,
  text,
  timestamp,
} from "@keystone-6/core/fields";

import { controlledProjectModelAccess } from "../access";
import type { ValidationHookArgs } from "../domain/hooks";
import { getConnectedId, projectTenantHooks } from "../domain/tenancy";
import {
  companyTenantField,
  lifecycleStatus,
  projectTenantField,
} from "./fields";
import { trackingFields } from "./trackingFields";

const safetyAccess = () =>
  controlledProjectModelAccess("canReadSafety", "canManageSafety");

export const SafetyIncident = list({
  access: safetyAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["incidentNumber", "title", "severity", "status", "occurredAt"] } },
  fields: {
    incidentNumber: text({ validation: { isRequired: true, length: { min: 1, max: 80 } } }),
    title: text({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    description: text({ validation: { isRequired: true }, ui: { displayMode: "textarea" } }),
    incidentType: select({
      type: "enum",
      options: [
        { label: "Near Miss", value: "near_miss" },
        { label: "First Aid", value: "first_aid" },
        { label: "Recordable Injury", value: "recordable_injury" },
        { label: "Lost Time", value: "lost_time" },
        { label: "Property Damage", value: "property_damage" },
        { label: "Environmental", value: "environmental" },
        { label: "Security", value: "security" },
      ],
      defaultValue: "near_miss",
      validation: { isRequired: true },
    }),
    severity: select({
      type: "enum",
      options: [
        { label: "Low", value: "low" },
        { label: "Moderate", value: "moderate" },
        { label: "Serious", value: "serious" },
        { label: "Critical", value: "critical" },
        { label: "Fatal", value: "fatal" },
      ],
      defaultValue: "low",
      validation: { isRequired: true },
    }),
    status: lifecycleStatus([
      { label: "Reported", value: "reported" },
      { label: "Investigating", value: "investigating" },
      { label: "Corrective Action", value: "corrective_action" },
      { label: "Closed", value: "closed" },
    ], "reported"),
    occurredAt: timestamp({ validation: { isRequired: true } }),
    reportedAt: timestamp({ defaultValue: { kind: "now" }, validation: { isRequired: true } }),
    closedAt: timestamp(),
    isOshaRecordable: checkbox({ defaultValue: false }),
    daysAway: integer({ defaultValue: 0, validation: { min: 0 }, access: { read: denyAll } }),
    restrictedDutyDays: integer({ defaultValue: 0, validation: { min: 0 }, access: { read: denyAll } }),
    injuredPartyName: text({ access: { read: denyAll } }),
    injuryDetails: text({ access: { read: denyAll }, ui: { displayMode: "textarea" } }),
    privateNotes: text({ access: { read: denyAll }, ui: { displayMode: "textarea" } }),
    reportedBy: relationship({ ref: "User" }),
    investigator: relationship({ ref: "User" }),
    responsiblePartner: relationship({ ref: "TradePartner" }),
    location: relationship({ ref: "ProjectLocation" }),
    dailyLogEntries: relationship({ ref: "DailyLogEntry.safetyIncident", many: true, access: { create: denyAll, update: denyAll } }),
    correctiveActions: relationship({ ref: "CorrectiveAction.safetyIncident", many: true, access: { create: denyAll, update: denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.safetyIncidents"),
    ...trackingFields,
  },
});

export const SafetyObservation = list({
  access: safetyAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["observationNumber", "title", "observationType", "status", "observedAt"] } },
  fields: {
    observationNumber: text({ validation: { isRequired: true, length: { min: 1, max: 80 } } }),
    title: text({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    description: text({ validation: { isRequired: true }, ui: { displayMode: "textarea" } }),
    observationType: select({
      type: "enum",
      options: [
        { label: "Safe Practice", value: "safe_practice" },
        { label: "Unsafe Act", value: "unsafe_act" },
        { label: "Unsafe Condition", value: "unsafe_condition" },
        { label: "Environmental", value: "environmental" },
        { label: "Quality", value: "quality" },
      ],
      defaultValue: "unsafe_condition",
      validation: { isRequired: true },
    }),
    status: lifecycleStatus([
      { label: "Open", value: "open" },
      { label: "Assigned", value: "assigned" },
      { label: "Resolved", value: "resolved" },
      { label: "Closed", value: "closed" },
    ], "open"),
    observedAt: timestamp({ validation: { isRequired: true }, defaultValue: { kind: "now" } }),
    dueAt: timestamp(),
    resolvedAt: timestamp(),
    observedBy: relationship({ ref: "User" }),
    assignedTo: relationship({ ref: "User" }),
    responsiblePartner: relationship({ ref: "TradePartner" }),
    location: relationship({ ref: "ProjectLocation" }),
    correctiveActions: relationship({ ref: "CorrectiveAction.safetyObservation", many: true, access: { create: denyAll, update: denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.safetyObservations"),
    ...trackingFields,
  },
});

export const InspectionTemplate = list({
  access: safetyAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["name", "inspectionType", "version", "isActive"] } },
  fields: {
    name: text({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    inspectionType: select({
      type: "enum",
      options: [
        { label: "Safety", value: "safety" },
        { label: "Quality", value: "quality" },
        { label: "Pre-installation", value: "pre_installation" },
        { label: "Commissioning", value: "commissioning" },
        { label: "Regulatory", value: "regulatory" },
        { label: "Equipment", value: "equipment" },
      ],
      defaultValue: "quality",
      validation: { isRequired: true },
    }),
    version: integer({ defaultValue: 1, validation: { min: 1 } }),
    instructions: text({ ui: { displayMode: "textarea" } }),
    isActive: checkbox({ defaultValue: true }),
    inspections: relationship({ ref: "Inspection.template", many: true, access: { create: denyAll, update: denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.inspectionTemplates"),
    ...trackingFields,
  },
});

export const Inspection = list({
  access: safetyAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["inspectionNumber", "title", "status", "scheduledAt", "inspector"] } },
  fields: {
    inspectionNumber: text({ validation: { isRequired: true, length: { min: 1, max: 80 } } }),
    title: text({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    description: text({ ui: { displayMode: "textarea" } }),
    status: lifecycleStatus([
      { label: "Scheduled", value: "scheduled" },
      { label: "In Progress", value: "in_progress" },
      { label: "Passed", value: "passed" },
      { label: "Failed", value: "failed" },
      { label: "Closed", value: "closed" },
      { label: "Cancelled", value: "cancelled" },
    ], "scheduled"),
    scheduledAt: timestamp(),
    startedAt: timestamp(),
    completedAt: timestamp(),
    scorePercent: integer({ validation: { min: 0, max: 100 } }),
    summary: text({ ui: { displayMode: "textarea" } }),
    template: relationship({ ref: "InspectionTemplate.inspections" }),
    inspector: relationship({ ref: "User" }),
    responsiblePartner: relationship({ ref: "TradePartner" }),
    location: relationship({ ref: "ProjectLocation" }),
    specificationSection: relationship({ ref: "SpecificationSection.inspections" }),
    items: relationship({ ref: "InspectionItem.inspection", many: true, access: { create: denyAll, update: denyAll } }),
    dailyLogEntries: relationship({ ref: "DailyLogEntry.inspection", many: true, access: { create: denyAll, update: denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.inspections"),
    ...trackingFields,
  },
});

export const InspectionItem = list({
  access: safetyAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["inspection", "sequence", "prompt", "result", "assignedTo"] } },
  fields: {
    sequence: integer({ defaultValue: 1, validation: { min: 1 } }),
    prompt: text({ validation: { isRequired: true, length: { min: 1, max: 500 } } }),
    requirement: text({ ui: { displayMode: "textarea" } }),
    result: select({
      type: "enum",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Pass", value: "pass" },
        { label: "Fail", value: "fail" },
        { label: "Not Applicable", value: "not_applicable" },
      ],
      defaultValue: "pending",
      validation: { isRequired: true },
    }),
    response: text({ ui: { displayMode: "textarea" } }),
    dueAt: timestamp(),
    completedAt: timestamp(),
    inspection: relationship({ ref: "Inspection.items" }),
    assignedTo: relationship({ ref: "User" }),
    punchItems: relationship({ ref: "PunchItem.inspectionItem", many: true, access: { create: denyAll, update: denyAll } }),
    correctiveActions: relationship({ ref: "CorrectiveAction.inspectionItem", many: true, access: { create: denyAll, update: denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.inspectionItems"),
    ...trackingFields,
  },
});

async function validateCorrectiveActionSource(args: ValidationHookArgs) {
  if (args.operation !== "create") return;
  const sourceIds = [
    getConnectedId(args.resolvedData.safetyIncident),
    getConnectedId(args.resolvedData.safetyObservation),
    getConnectedId(args.resolvedData.inspectionItem),
    getConnectedId(args.resolvedData.punchItem),
  ].filter(Boolean);
  if (sourceIds.length === 0) {
    args.addValidationError("A corrective action must reference an incident, observation, inspection item, or punch item");
  }
}

export const CorrectiveAction = list({
  access: safetyAccess(),
  hooks: {
    ...projectTenantHooks(),
    validate: { create: validateCorrectiveActionSource },
  },
  ui: { listView: { initialColumns: ["actionNumber", "title", "status", "assignedTo", "dueAt"] } },
  fields: {
    actionNumber: text({ validation: { isRequired: true, length: { min: 1, max: 80 } } }),
    title: text({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    description: text({ validation: { isRequired: true }, ui: { displayMode: "textarea" } }),
    status: lifecycleStatus([
      { label: "Open", value: "open" },
      { label: "In Progress", value: "in_progress" },
      { label: "Ready for Verification", value: "ready_for_verification" },
      { label: "Verified", value: "verified" },
      { label: "Closed", value: "closed" },
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
    completionNotes: text({ ui: { displayMode: "textarea" } }),
    evidenceReference: text({ validation: { length: { max: 240 } } }),
    evidenceChecksumSha256: text({ validation: { length: { max: 64 } } }),
    completedAt: timestamp(),
    verifiedAt: timestamp(),
    assignedTo: relationship({ ref: "User" }),
    verifiedBy: relationship({ ref: "User" }),
    responsiblePartner: relationship({ ref: "TradePartner" }),
    safetyIncident: relationship({ ref: "SafetyIncident.correctiveActions" }),
    safetyObservation: relationship({ ref: "SafetyObservation.correctiveActions" }),
    inspectionItem: relationship({ ref: "InspectionItem.correctiveActions" }),
    punchItem: relationship({ ref: "PunchItem.correctiveActions" }),
    company: companyTenantField(),
    project: projectTenantField("Project.correctiveActions"),
    ...trackingFields,
  },
});
