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
import { projectTenantHooks } from "../domain/tenancy";
import {
  companyTenantField,
  currencyCodeField,
  lifecycleStatus,
  moneyField,
  projectTenantField,
} from "./fields";
import { trackingFields } from "./trackingFields";

const financialAccess = () =>
  controlledProjectModelAccess("canReadFinancials", "canManageFinancials");

export const Budget = list({
  access: financialAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["name", "version", "status", "totalOriginalMinor", "project"] } },
  fields: {
    name: text({ validation: { isRequired: true, length: { min: 1, max: 200 } } }),
    version: integer({ defaultValue: 1, validation: { min: 1 } }),
    status: select({
      type: "enum",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Approved", value: "approved" },
        { label: "Active", value: "active" },
        { label: "Closed", value: "closed" },
      ],
      defaultValue: "draft",
      validation: { isRequired: true },
    }),
    totalOriginalMinor: moneyField(),
    totalRevisedMinor: moneyField(),
    totalCommittedMinor: moneyField(),
    totalActualMinor: moneyField(),
    forecastToCompleteMinor: moneyField(),
    currencyCode: currencyCodeField(),
    approvedAt: timestamp(),
    approvedBy: relationship({ ref: "User" }),
    lineItems: relationship({ ref: "BudgetLineItem.budget", many: true, access: { create: denyAll, update: denyAll } }),
    changes: relationship({ ref: "BudgetChange.budget", many: true, access: { create: denyAll, update: denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.budgets"),
    ...trackingFields,
  },
});

export const BudgetLineItem = list({
  db: { extendPrismaSchema: schema => schema.replace(/\n\}$/, '\n  @@unique([budgetId, budgetCodeId], map: "BudgetLineItem_budget_budgetCode_key")\n}') },
  access: financialAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["budgetCode", "originalAmountMinor", "revisedAmountMinor", "committedAmountMinor"] } },
  fields: {
    description: text({ validation: { isRequired: true, length: { min: 1, max: 300 } } }),
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
    budget: relationship({ ref: "Budget.lineItems" }),
    budgetCode: relationship({ ref: "BudgetCode.budgetLineItems" }),
    changeLineItems: relationship({ ref: "BudgetChangeLineItem.budgetLineItem", many: true, access: { create: denyAll, update: denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.budgetLineItems"),
    ...trackingFields,
  },
});

export const BudgetChange = list({
  access: financialAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["number", "title", "status", "totalAmountMinor", "project"] } },
  fields: {
    number: text({ validation: { isRequired: true, length: { min: 1, max: 80 } } }),
    title: text({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    reason: text({ ui: { displayMode: "textarea" } }),
    status: lifecycleStatus([
      { label: "Draft", value: "draft" },
      { label: "Pending Approval", value: "pending_approval" },
      { label: "Approved", value: "approved" },
      { label: "Rejected", value: "rejected" },
      { label: "Posted", value: "posted" },
    ], "draft"),
    totalAmountMinor: moneyField(),
    currencyCode: currencyCodeField(),
    requestedBy: relationship({ ref: "User" }),
    reviewedBy: relationship({ ref: "User" }),
    reviewedAt: timestamp(),
    postedAt: timestamp(),
    budget: relationship({ ref: "Budget.changes" }),
    lineItems: relationship({ ref: "BudgetChangeLineItem.budgetChange", many: true, access: { create: denyAll, update: denyAll } }),
    sourceChangeEvent: relationship({ ref: "ChangeEvent.budgetChanges" }),
    company: companyTenantField(),
    project: projectTenantField("Project.budgetChanges"),
    ...trackingFields,
  },
});

export const BudgetChangeLineItem = list({
  access: financialAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["budgetChange", "budgetCode", "amountMinor"] } },
  fields: {
    description: text({ validation: { isRequired: true, length: { min: 1, max: 500 } } }),
    amountMinor: moneyField(),
    budgetChange: relationship({ ref: "BudgetChange.lineItems" }),
    budgetLineItem: relationship({ ref: "BudgetLineItem.changeLineItems" }),
    budgetCode: relationship({ ref: "BudgetCode.budgetChangeLineItems" }),
    changeEventLineItem: relationship({ ref: "ChangeEventLineItem.budgetChangeLineItems" }),
    company: companyTenantField(),
    project: projectTenantField("Project.budgetChangeLineItems"),
    ...trackingFields,
  },
});

export const DirectCost = list({
  access: financialAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["referenceNumber", "costDate", "status", "amountMinor", "budgetCode"] } },
  fields: {
    referenceNumber: text({ validation: { isRequired: true, length: { min: 1, max: 100 } } }),
    description: text({ validation: { isRequired: true, length: { min: 1, max: 500 } } }),
    costType: select({
      type: "enum",
      options: [
        { label: "Invoice", value: "invoice" },
        { label: "Expense", value: "expense" },
        { label: "Payroll", value: "payroll" },
        { label: "Equipment", value: "equipment" },
        { label: "Material", value: "material" },
        { label: "Adjustment", value: "adjustment" },
      ],
      defaultValue: "expense",
      validation: { isRequired: true },
    }),
    status: select({
      type: "enum",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Pending", value: "pending" },
        { label: "Approved", value: "approved" },
        { label: "Posted", value: "posted" },
        { label: "Voided", value: "voided" },
      ],
      defaultValue: "draft",
      validation: { isRequired: true },
    }),
    amountMinor: moneyField(),
    currencyCode: currencyCodeField(),
    costDate: timestamp({ validation: { isRequired: true } }),
    invoiceDate: timestamp(),
    vendorInvoiceNumber: text(),
    voidedAt: timestamp(),
    voidReason: text({ ui: { displayMode: "textarea" } }),
    voidedBy: relationship({ ref: "User" }),
    budgetCode: relationship({ ref: "BudgetCode.directCosts" }),
    tradePartner: relationship({ ref: "TradePartner" }),
    commitment: relationship({ ref: "Commitment.directCosts" }),
    approvedBy: relationship({ ref: "User" }),
    company: companyTenantField(),
    project: projectTenantField("Project.directCosts"),
    ...trackingFields,
  },
});
