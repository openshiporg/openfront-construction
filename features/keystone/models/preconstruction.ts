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
import { immutableProjectSnapshotHooks } from "../domain/snapshots";
import { getConnectedId, projectTenantHooks } from "../domain/tenancy";
import {
  companyTenantField,
  currencyCodeField,
  lifecycleStatus,
  moneyField,
  projectTenantField,
} from "./fields";
import { trackingFields } from "./trackingFields";

const preconstructionAccess = () =>
  controlledProjectModelAccess("canReadPreconstruction", "canManagePreconstruction");

export const BidPackage = list({
  access: preconstructionAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["number", "title", "status", "dueAt", "project"] } },
  fields: {
    number: text({ validation: { isRequired: true, length: { min: 1, max: 80 } } }),
    title: text({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    description: text({ ui: { displayMode: "textarea" } }),
    instructions: text({ ui: { displayMode: "textarea" } }),
    status: lifecycleStatus([
      { label: "Draft", value: "draft" },
      { label: "Open", value: "open" },
      { label: "Closed", value: "closed" },
      { label: "Awarded", value: "awarded" },
      { label: "Archived", value: "archived" },
    ], "draft"),
    bidType: select({
      type: "enum",
      options: [
        { label: "Lump Sum", value: "lump_sum" },
        { label: "Unit Price", value: "unit_price" },
        { label: "Cost Plus", value: "cost_plus" },
      ],
      defaultValue: "lump_sum",
      validation: { isRequired: true },
    }),
    dueAt: timestamp(),
    issuedAt: timestamp(),
    closedAt: timestamp(),
    bidManager: relationship({ ref: "User" }),
    awardedPartner: relationship({ ref: "TradePartner" }),
    company: companyTenantField(),
    project: projectTenantField("Project.bidPackages"),
    invitations: relationship({ ref: "BidInvitation.bidPackage", many: true, access: { create: denyAll, update: denyAll } }),
    submissions: relationship({ ref: "BidSubmission.bidPackage", many: true, access: { create: denyAll, update: denyAll } }),
    ...trackingFields,
  },
});

export const BidInvitation = list({
  access: preconstructionAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["bidPackage", "tradePartner", "status", "sentAt"] } },
  fields: {
    status: select({
      type: "enum",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Invited", value: "invited" },
        { label: "Viewed", value: "viewed" },
        { label: "Intent to Bid", value: "intent_to_bid" },
        { label: "Declined", value: "declined" },
        { label: "Submitted", value: "submitted" },
      ],
      defaultValue: "draft",
      validation: { isRequired: true },
    }),
    recipientName: text({ validation: { length: { max: 200 } } }),
    recipientEmail: text({ validation: { length: { max: 320 } } }),
    sentAt: timestamp(),
    viewedAt: timestamp(),
    respondedAt: timestamp(),
    bidPackage: relationship({ ref: "BidPackage.invitations" }),
    budgetCode: relationship({ ref: "BudgetCode" }),
    tradePartner: relationship({ ref: "TradePartner.bidInvitations" }),
    submission: relationship({ ref: "BidSubmission.invitation", access: { create: denyAll, update: denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.bidInvitations"),
    ...trackingFields,
  },
});

export const BidSubmission = list({
  access: preconstructionAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["submissionNumber", "tradePartner", "status", "totalMinor", "submittedAt"] } },
  fields: {
    submissionNumber: text({ validation: { isRequired: true, length: { min: 1, max: 80 } } }),
    status: select({
      type: "enum",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Submitted", value: "submitted" },
        { label: "Under Review", value: "under_review" },
        { label: "Accepted", value: "accepted" },
        { label: "Rejected", value: "rejected" },
        { label: "Withdrawn", value: "withdrawn" },
      ],
      defaultValue: "draft",
      validation: { isRequired: true },
    }),
    totalMinor: moneyField({ nonNegative: true }),
    currencyCode: currencyCodeField(),
    alternatesMinor: moneyField(),
    exclusions: text({ ui: { displayMode: "textarea" } }),
    clarifications: text({ ui: { displayMode: "textarea" } }),
    isBondable: checkbox({ defaultValue: false }),
    validUntil: timestamp(),
    submittedAt: timestamp(),
    reviewedAt: timestamp(),
    bidPackage: relationship({ ref: "BidPackage.submissions" }),
    invitation: relationship({ ref: "BidInvitation.submission" }),
    tradePartner: relationship({ ref: "TradePartner.bidSubmissions" }),
    reviewedBy: relationship({ ref: "User" }),
    lineItems: relationship({ ref: "BidLineItem.submission", many: true, access: { create: denyAll, update: denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.bidSubmissions"),
    ...trackingFields,
  },
});

export const BidLineItem = list({
  access: preconstructionAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["description", "submission", "budgetCode", "amountMinor"] } },
  fields: {
    lineNumber: integer({ validation: { min: 1 } }),
    description: text({ validation: { isRequired: true, length: { min: 1, max: 500 } } }),
    quantity: decimal({ precision: 18, scale: 4, defaultValue: "1" }),
    unit: text({ validation: { length: { max: 40 } } }),
    unitPriceMinor: moneyField({ nonNegative: true }),
    amountMinor: moneyField({ nonNegative: true }),
    submission: relationship({ ref: "BidSubmission.lineItems" }),
    budgetCode: relationship({ ref: "BudgetCode.bidLineItems" }),
    company: companyTenantField(),
    project: projectTenantField("Project.bidLineItems"),
    ...trackingFields,
  },
});

export const Estimate = list({
  access: preconstructionAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["number", "title", "status", "project"] } },
  fields: {
    number: text({ validation: { isRequired: true, length: { min: 1, max: 80 } } }),
    title: text({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    description: text({ ui: { displayMode: "textarea" } }),
    status: lifecycleStatus([
      { label: "Draft", value: "draft" },
      { label: "Internal Review", value: "internal_review" },
      { label: "Issued", value: "issued" },
      { label: "Accepted", value: "accepted" },
      { label: "Rejected", value: "rejected" },
      { label: "Superseded", value: "superseded" },
    ], "draft"),
    estimator: relationship({ ref: "User" }),
    currentVersion: relationship({ ref: "EstimateVersion.currentForEstimate" }),
    versions: relationship({ ref: "EstimateVersion.estimate", many: true, access: { create: denyAll, update: denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.estimates"),
    ...trackingFields,
  },
});

export const EstimateVersion = list({
  access: preconstructionAccess(),
  hooks: {
    ...immutableProjectSnapshotHooks("EstimateVersion"),
    resolveInput: async args => {
      const resolved = await immutableProjectSnapshotHooks("EstimateVersion").resolveInput(args);
      if (args.operation !== "create") return resolved;
      const estimateId = getConnectedId(resolved.estimate);
      const versionNumber = resolved.versionNumber;
      if (!estimateId || versionNumber === null || versionNumber === undefined) {
        throw new Error("EstimateVersion requires estimate and versionNumber");
      }
      return { ...resolved, versionKey: `${estimateId}:${String(versionNumber).trim().toLowerCase()}` };
    },
  },
  ui: { listView: { initialColumns: ["estimate", "versionNumber", "status", "totalMinor", "issuedAt"] } },
  fields: {
    versionKey: text({
      isIndexed: "unique",
      access: { create: denyAll, update: denyAll },
      ui: { createView: { fieldMode: "hidden" }, itemView: { fieldMode: "read" } },
    }),
    versionNumber: integer({ validation: { isRequired: true, min: 1 }, access: { update: denyAll } }),
    status: select({
      type: "enum",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Issued", value: "issued" },
        { label: "Superseded", value: "superseded" },
      ],
      defaultValue: "draft",
      validation: { isRequired: true },
    }),
    subtotalMinor: moneyField(),
    overheadMinor: moneyField(),
    profitMinor: moneyField(),
    contingencyMinor: moneyField(),
    totalMinor: moneyField(),
    currencyCode: currencyCodeField(),
    scopeSummary: text({ ui: { displayMode: "textarea" } }),
    assumptions: text({ ui: { displayMode: "textarea" } }),
    exclusions: text({ ui: { displayMode: "textarea" } }),
    issuedAt: timestamp(),
    lockedAt: timestamp({ access: { update: denyAll } }),
    estimate: relationship({ ref: "Estimate.versions", access: { update: denyAll } }),
    currentForEstimate: relationship({ ref: "Estimate.currentVersion", access: { create: denyAll, update: denyAll } }),
    lineItems: relationship({ ref: "EstimateLineItem.version", many: true, access: { create: denyAll, update: denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.estimateVersions"),
    ...trackingFields,
  },
});

export const EstimateLineItem = list({
  access: preconstructionAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["description", "version", "budgetCode", "totalCostMinor"] } },
  fields: {
    lineNumber: integer({ validation: { min: 1 } }),
    description: text({ validation: { isRequired: true, length: { min: 1, max: 500 } } }),
    quantity: decimal({ precision: 18, scale: 4, defaultValue: "1" }),
    unit: text({ validation: { length: { max: 40 } } }),
    laborCostMinor: moneyField(),
    materialCostMinor: moneyField(),
    equipmentCostMinor: moneyField(),
    subcontractCostMinor: moneyField(),
    otherCostMinor: moneyField(),
    totalCostMinor: moneyField(),
    version: relationship({ ref: "EstimateVersion.lineItems", access: { update: denyAll } }),
    budgetCode: relationship({ ref: "BudgetCode.estimateLineItems" }),
    company: companyTenantField(),
    project: projectTenantField("Project.estimateLineItems"),
    ...trackingFields,
  },
});
