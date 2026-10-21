import { list } from "@keystone-6/core";
import { denyAll } from "@keystone-6/core/access";
import {
  integer,
  relationship,
  select,
  text,
  timestamp,
} from "@keystone-6/core/fields";

import { controlledProjectModelAccess } from "../access";
import type { RelatedRecord, ValidationHookArgs } from "../domain/hooks";
import { getConnectedId, projectTenantHooks, queryById } from "../domain/tenancy";
import {
  basisPointsField,
  companyTenantField,
  currencyCodeField,
  lifecycleStatus,
  moneyField,
  projectTenantField,
} from "./fields";
import { trackingFields } from "./trackingFields";

const contractAccess = () =>
  controlledProjectModelAccess("canReadContracts", "canManageContracts");

function nextRelationshipId(input: unknown, currentId: string | null): string | null {
  if (input === undefined) return currentId;
  if (input && typeof input === "object" && (input as { disconnect?: boolean }).disconnect) return null;
  return getConnectedId(input);
}

async function validateContractSide(
  listKey: string,
  args: ValidationHookArgs,
  directionField?: string,
) {
  const { operation, item, resolvedData, context, addValidationError } = args;
  let current: RelatedRecord | null = null;
  if (operation === "update" && item?.id) {
    current = await queryById(
      context,
      listKey,
      item.id.toString(),
      `primeContract { id } commitment { id }${directionField ? ` ${directionField}` : ""}`,
    ) as RelatedRecord | null;
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

function contractSideHooks(listKey: string, directionField?: string) {
  return {
    ...projectTenantHooks(),
    validate: {
      create: (args: ValidationHookArgs) => validateContractSide(listKey, args, directionField),
      update: (args: ValidationHookArgs) => validateContractSide(listKey, args, directionField),
    },
  };
}

export const PrimeContract = list({
  access: contractAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["number", "title", "status", "revisedContractMinor", "client"] } },
  fields: {
    number: text({ validation: { isRequired: true, length: { min: 1, max: 80 } } }),
    title: text({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    description: text({ ui: { displayMode: "textarea" } }),
    contractType: select({
      type: "enum",
      options: [
        { label: "Lump Sum", value: "lump_sum" },
        { label: "Guaranteed Maximum Price", value: "gmp" },
        { label: "Cost Plus", value: "cost_plus" },
        { label: "Unit Price", value: "unit_price" },
      ],
      defaultValue: "lump_sum",
      validation: { isRequired: true },
    }),
    status: lifecycleStatus([
      { label: "Draft", value: "draft" },
      { label: "Pending Approval", value: "pending_approval" },
      { label: "Approved", value: "approved" },
      { label: "Rejected", value: "rejected" },
      { label: "Executed", value: "executed" },
      { label: "Closed", value: "closed" },
    ], "draft"),
    originalContractMinor: moneyField(),
    approvedChangesMinor: moneyField(),
    revisedContractMinor: moneyField(),
    billedToDateMinor: moneyField(),
    paidToDateMinor: moneyField(),
    defaultRetainageBps: basisPointsField(),
    currencyCode: currencyCodeField(),
    executedAt: timestamp(),
    startDate: timestamp(),
    completionDate: timestamp(),
    client: relationship({ ref: "TradePartner.primeContracts" }),
    contractManager: relationship({ ref: "User" }),
    lineItems: relationship({ ref: "ContractLineItem.primeContract", many: true, access: { create: denyAll, update: denyAll } }),
    changeOrders: relationship({ ref: "ChangeOrder.primeContract", many: true, access: { create: denyAll, update: denyAll } }),
    progressClaims: relationship({ ref: "ProgressClaim.primeContract", many: true, access: { create: denyAll, update: denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.primeContracts"),
    ...trackingFields,
  },
});

export const Commitment = list({
  access: contractAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["number", "title", "commitmentType", "status", "tradePartner"] } },
  fields: {
    number: text({ validation: { isRequired: true, length: { min: 1, max: 80 } } }),
    title: text({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    description: text({ ui: { displayMode: "textarea" } }),
    commitmentType: select({
      type: "enum",
      options: [
        { label: "Subcontract", value: "subcontract" },
        { label: "Purchase Order", value: "purchase_order" },
      ],
      defaultValue: "subcontract",
      validation: { isRequired: true },
    }),
    status: lifecycleStatus([
      { label: "Draft", value: "draft" },
      { label: "Out for Signature", value: "out_for_signature" },
      { label: "Executed", value: "executed" },
      { label: "Complete", value: "complete" },
      { label: "Closed", value: "closed" },
      { label: "Cancelled", value: "cancelled" },
      { label: "Terminated", value: "terminated" },
    ], "draft"),
    originalContractMinor: moneyField(),
    approvedChangesMinor: moneyField(),
    revisedContractMinor: moneyField(),
    invoicedToDateMinor: moneyField(),
    paidToDateMinor: moneyField(),
    defaultRetainageBps: basisPointsField(),
    currencyCode: currencyCodeField(),
    executedAt: timestamp(),
    startDate: timestamp(),
    completionDate: timestamp(),
    tradePartner: relationship({ ref: "TradePartner.commitments" }),
    contractManager: relationship({ ref: "User" }),
    lineItems: relationship({ ref: "ContractLineItem.commitment", many: true, access: { create: denyAll, update: denyAll } }),
    changeOrders: relationship({ ref: "ChangeOrder.commitment", many: true, access: { create: denyAll, update: denyAll } }),
    progressClaims: relationship({ ref: "ProgressClaim.commitment", many: true, access: { create: denyAll, update: denyAll } }),
    directCosts: relationship({ ref: "DirectCost.commitment", many: true, access: { create: denyAll, update: denyAll } }),
    lienWaivers: relationship({ ref: "LienWaiver.commitment", many: true, access: { create: denyAll, update: denyAll } }),
    procurementRequests: relationship({ ref: "ProcurementRequest.commitment", many: true, access: { create: denyAll, update: denyAll } }),
    materialReceipts: relationship({ ref: "MaterialReceipt.commitment", many: true, access: { create: denyAll, update: denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.commitments"),
    ...trackingFields,
  },
});

export const ContractLineItem = list({
  access: contractAccess(),
  hooks: contractSideHooks("ContractLineItem"),
  ui: { listView: { initialColumns: ["lineNumber", "description", "scheduledValueMinor", "budgetCode"] } },
  fields: {
    lineNumber: integer({ validation: { isRequired: true, min: 1 } }),
    description: text({ validation: { isRequired: true, length: { min: 1, max: 500 } } }),
    scheduledValueMinor: moneyField(),
    approvedChangesMinor: moneyField(),
    revisedValueMinor: moneyField(),
    retainageBps: basisPointsField(),
    primeContract: relationship({ ref: "PrimeContract.lineItems" }),
    commitment: relationship({ ref: "Commitment.lineItems" }),
    budgetCode: relationship({ ref: "BudgetCode.contractLineItems" }),
    changeOrderLineItems: relationship({ ref: "ChangeOrderLineItem.contractLineItem", many: true, access: { create: denyAll, update: denyAll } }),
    progressClaimLineItems: relationship({ ref: "ProgressClaimLineItem.contractLineItem", many: true, access: { create: denyAll, update: denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.contractLineItems"),
    ...trackingFields,
  },
});

export const ChangeEvent = list({
  access: contractAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["number", "title", "status", "estimatedCostMinor", "project"] } },
  fields: {
    number: text({ validation: { isRequired: true, length: { min: 1, max: 80 } } }),
    title: text({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    description: text({ ui: { displayMode: "textarea" } }),
    eventType: select({
      type: "enum",
      options: [
        { label: "Owner Request", value: "owner_request" },
        { label: "Design Development", value: "design_development" },
        { label: "Design Error/Omission", value: "design_error" },
        { label: "Existing Condition", value: "existing_condition" },
        { label: "Allowance", value: "allowance" },
        { label: "Backcharge", value: "backcharge" },
        { label: "Other", value: "other" },
      ],
      defaultValue: "other",
      validation: { isRequired: true },
    }),
    status: lifecycleStatus([
      { label: "Open", value: "open" },
      { label: "Pricing", value: "pricing" },
      { label: "Pending Approval", value: "pending_approval" },
      { label: "Approved", value: "approved" },
      { label: "Rejected", value: "rejected" },
      { label: "Incorporated", value: "incorporated" },
      { label: "Voided", value: "voided" },
    ], "open"),
    estimatedCostMinor: moneyField(),
    estimatedRevenueMinor: moneyField(),
    scheduleImpactDays: integer({ defaultValue: 0 }),
    currencyCode: currencyCodeField(),
    discoveredAt: timestamp({ defaultValue: { kind: "now" } }),
    dueAt: timestamp(),
    owner: relationship({ ref: "User" }),
    sourceRfi: relationship({ ref: "RFI.changeEvents" }),
    lineItems: relationship({ ref: "ChangeEventLineItem.changeEvent", many: true, access: { create: denyAll, update: denyAll } }),
    quotes: relationship({ ref: "ChangeQuote.changeEvent", many: true, access: { create: denyAll, update: denyAll } }),
    changeOrders: relationship({ ref: "ChangeOrder.changeEvents", many: true, access: { create: denyAll, update: denyAll } }),
    budgetChanges: relationship({ ref: "BudgetChange.sourceChangeEvent", many: true, access: { create: denyAll, update: denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.changeEvents"),
    ...trackingFields,
  },
});

export const ChangeEventLineItem = list({
  access: contractAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["description", "changeEvent", "budgetCode", "estimatedCostMinor"] } },
  fields: {
    lineNumber: integer({ validation: { min: 1 } }),
    description: text({ validation: { isRequired: true, length: { min: 1, max: 500 } } }),
    estimatedCostMinor: moneyField(),
    estimatedRevenueMinor: moneyField(),
    changeEvent: relationship({ ref: "ChangeEvent.lineItems" }),
    budgetCode: relationship({ ref: "BudgetCode.changeEventLineItems" }),
    quotes: relationship({ ref: "ChangeQuote.changeEventLineItem", many: true, access: { create: denyAll, update: denyAll } }),
    changeOrderLineItems: relationship({ ref: "ChangeOrderLineItem.changeEventLineItem", many: true, access: { create: denyAll, update: denyAll } }),
    budgetChangeLineItems: relationship({ ref: "BudgetChangeLineItem.changeEventLineItem", many: true, access: { create: denyAll, update: denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.changeEventLineItems"),
    ...trackingFields,
  },
});

export const ChangeQuote = list({
  access: contractAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["quoteNumber", "tradePartner", "status", "amountMinor", "dueAt"] } },
  fields: {
    quoteNumber: text({ validation: { isRequired: true, length: { min: 1, max: 80 } } }),
    status: select({
      type: "enum",
      options: [
        { label: "Requested", value: "requested" },
        { label: "Received", value: "received" },
        { label: "Accepted", value: "accepted" },
        { label: "Rejected", value: "rejected" },
        { label: "Withdrawn", value: "withdrawn" },
      ],
      defaultValue: "requested",
      validation: { isRequired: true },
    }),
    scope: text({ ui: { displayMode: "textarea" } }),
    amountMinor: moneyField(),
    currencyCode: currencyCodeField(),
    dueAt: timestamp(),
    receivedAt: timestamp(),
    validUntil: timestamp(),
    changeEvent: relationship({ ref: "ChangeEvent.quotes" }),
    changeEventLineItem: relationship({ ref: "ChangeEventLineItem.quotes" }),
    tradePartner: relationship({ ref: "TradePartner.changeQuotes" }),
    company: companyTenantField(),
    project: projectTenantField("Project.changeQuotes"),
    ...trackingFields,
  },
});

export const ChangeOrder = list({
  access: contractAccess(),
  hooks: contractSideHooks("ChangeOrder", "direction"),
  ui: { listView: { initialColumns: ["number", "title", "direction", "status", "totalMinor"] } },
  fields: {
    number: text({ validation: { isRequired: true, length: { min: 1, max: 80 } } }),
    title: text({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    description: text({ ui: { displayMode: "textarea" } }),
    direction: select({
      type: "enum",
      options: [
        { label: "Owner", value: "owner" },
        { label: "Commitment", value: "commitment" },
      ],
      defaultValue: "owner",
      validation: { isRequired: true },
    }),
    status: lifecycleStatus([
      { label: "Draft", value: "draft" },
      { label: "Pending Approval", value: "pending_approval" },
      { label: "Approved", value: "approved" },
      { label: "Rejected", value: "rejected" },
      { label: "Executed", value: "executed" },
      { label: "Posted", value: "posted" },
    ], "draft"),
    totalMinor: moneyField(),
    scheduleImpactDays: integer({ defaultValue: 0 }),
    currencyCode: currencyCodeField(),
    approvedAt: timestamp(),
    executedAt: timestamp(),
    requestedBy: relationship({ ref: "User" }),
    approvedBy: relationship({ ref: "User" }),
    primeContract: relationship({ ref: "PrimeContract.changeOrders" }),
    commitment: relationship({ ref: "Commitment.changeOrders" }),
    changeEvents: relationship({ ref: "ChangeEvent.changeOrders", many: true, access: { create: denyAll, update: denyAll } }),
    lineItems: relationship({ ref: "ChangeOrderLineItem.changeOrder", many: true, access: { create: denyAll, update: denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.changeOrders"),
    ...trackingFields,
  },
});

export const ChangeOrderLineItem = list({
  access: contractAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["description", "changeOrder", "budgetCode", "amountMinor"] } },
  fields: {
    lineNumber: integer({ validation: { min: 1 } }),
    description: text({ validation: { isRequired: true, length: { min: 1, max: 500 } } }),
    amountMinor: moneyField(),
    changeOrder: relationship({ ref: "ChangeOrder.lineItems" }),
    contractLineItem: relationship({ ref: "ContractLineItem.changeOrderLineItems" }),
    changeEventLineItem: relationship({ ref: "ChangeEventLineItem.changeOrderLineItems" }),
    budgetCode: relationship({ ref: "BudgetCode.changeOrderLineItems" }),
    company: companyTenantField(),
    project: projectTenantField("Project.changeOrderLineItems"),
    ...trackingFields,
  },
});
