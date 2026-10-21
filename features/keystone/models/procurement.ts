import { list } from "@keystone-6/core";
import { denyAll } from "@keystone-6/core/access";
import { decimal, integer, relationship, select, text, timestamp } from "@keystone-6/core/fields";

import { controlledProjectModelAccess } from "../access";
import { projectTenantHooks } from "../domain/tenancy";
import {
  companyTenantField,
  currencyCodeField,
  lifecycleStatus,
  moneyField,
  projectTenantField,
  readOnlyRelationshipMany,
} from "./fields";
import { trackingFields } from "./trackingFields";

const procurementAccess = () =>
  controlledProjectModelAccess("canReadContracts", "canManageContracts");

export const ProcurementRequest = list({
  access: procurementAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["requestNumber", "title", "status", "neededBy", "requestedBy"] } },
  fields: {
    requestNumber: text({ validation: { isRequired: true, length: { min: 1, max: 100 } }, access: { update: denyAll } }),
    title: text({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    description: text({ ui: { displayMode: "textarea" } }),
    status: lifecycleStatus([
      { label: "Draft", value: "draft" },
      { label: "Submitted", value: "submitted" },
      { label: "Approved", value: "approved" },
      { label: "Ordered", value: "ordered" },
      { label: "Partially received", value: "partially_received" },
      { label: "Received", value: "received" },
      { label: "Closed", value: "closed" },
      { label: "Rejected", value: "rejected" },
      { label: "Cancelled", value: "cancelled" },
    ], "draft"),
    neededBy: timestamp(),
    submittedAt: timestamp({ access: { update: denyAll } }),
    approvedAt: timestamp({ access: { update: denyAll } }),
    orderedAt: timestamp({ access: { update: denyAll } }),
    closedAt: timestamp({ access: { update: denyAll } }),
    totalEstimatedMinor: moneyField({ nonNegative: true }),
    currencyCode: currencyCodeField(),
    requestedBy: relationship({ ref: "User", access: { update: denyAll } }),
    approvedBy: relationship({ ref: "User", access: { create: denyAll, update: denyAll } }),
    tradePartner: relationship({ ref: "TradePartner.procurementRequests" }),
    commitment: relationship({ ref: "Commitment.procurementRequests" }),
    lines: readOnlyRelationshipMany("ProcurementRequestLine.request"),
    receipts: readOnlyRelationshipMany("MaterialReceipt.request"),
    company: companyTenantField(),
    project: projectTenantField("Project.procurementRequests"),
    ...trackingFields,
  },
});

export const ProcurementRequestLine = list({
  access: procurementAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["request", "lineNumber", "description", "quantity", "estimatedAmountMinor"] } },
  fields: {
    lineNumber: integer({ validation: { isRequired: true, min: 1 }, access: { update: denyAll } }),
    description: text({ validation: { isRequired: true, length: { min: 1, max: 500 } } }),
    quantity: decimal({ precision: 18, scale: 4, validation: { isRequired: true } }),
    unit: text({ validation: { isRequired: true, length: { min: 1, max: 40 } } }),
    estimatedUnitCostMinor: moneyField({ nonNegative: true }),
    estimatedAmountMinor: moneyField({ nonNegative: true }),
    request: relationship({ ref: "ProcurementRequest.lines", access: { update: denyAll } }),
    budgetCode: relationship({ ref: "BudgetCode.procurementRequestLines" }),
    material: relationship({ ref: "Material.procurementRequestLines" }),
    receiptLines: readOnlyRelationshipMany("MaterialReceiptLine.requestLine"),
    company: companyTenantField(),
    project: projectTenantField("Project.procurementRequestLines"),
    ...trackingFields,
  },
});

export const MaterialReceipt = list({
  access: procurementAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["receiptNumber", "status", "receivedAt", "tradePartner", "receivedBy"] } },
  fields: {
    receiptNumber: text({ validation: { isRequired: true, length: { min: 1, max: 100 } }, access: { update: denyAll } }),
    status: select({
      type: "enum",
      options: [
        { label: "Recorded", value: "recorded" },
        { label: "Accepted with exceptions", value: "accepted_with_exceptions" },
        { label: "Rejected", value: "rejected" },
        { label: "Voided", value: "voided" },
      ],
      defaultValue: "recorded",
      validation: { isRequired: true },
      access: { update: denyAll },
    }),
    receivedAt: timestamp({ validation: { isRequired: true }, access: { update: denyAll } }),
    packingSlipReference: text({ validation: { isRequired: true, length: { min: 1, max: 160 } }, access: { update: denyAll } }),
    evidenceFileName: text({ access: { update: denyAll } }),
    evidenceStorageKey: text({ access: { read: denyAll, update: denyAll } }),
    evidenceChecksumSha256: text({ validation: { length: { min: 64, max: 64 } }, access: { update: denyAll } }),
    notes: text({ access: { update: denyAll }, ui: { displayMode: "textarea" } }),
    request: relationship({ ref: "ProcurementRequest.receipts", access: { update: denyAll } }),
    commitment: relationship({ ref: "Commitment.materialReceipts", access: { update: denyAll } }),
    tradePartner: relationship({ ref: "TradePartner.materialReceipts", access: { update: denyAll } }),
    receivedBy: relationship({ ref: "User", access: { update: denyAll } }),
    lines: readOnlyRelationshipMany("MaterialReceiptLine.receipt"),
    company: companyTenantField(),
    project: projectTenantField("Project.materialReceipts"),
    ...trackingFields,
  },
});

export const MaterialReceiptLine = list({
  access: procurementAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["receipt", "requestLine", "quantityReceived", "quantityAccepted", "quantityRejected"] } },
  fields: {
    lineNumber: integer({ validation: { isRequired: true, min: 1 }, access: { update: denyAll } }),
    quantityReceived: decimal({ precision: 18, scale: 4, validation: { isRequired: true }, access: { update: denyAll } }),
    quantityAccepted: decimal({ precision: 18, scale: 4, validation: { isRequired: true }, access: { update: denyAll } }),
    quantityRejected: decimal({ precision: 18, scale: 4, defaultValue: "0", access: { update: denyAll } }),
    exceptionReason: text({ access: { update: denyAll }, ui: { displayMode: "textarea" } }),
    receipt: relationship({ ref: "MaterialReceipt.lines", access: { update: denyAll } }),
    requestLine: relationship({ ref: "ProcurementRequestLine.receiptLines", access: { update: denyAll } }),
    material: relationship({ ref: "Material", access: { update: denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.materialReceiptLines"),
    ...trackingFields,
  },
});
