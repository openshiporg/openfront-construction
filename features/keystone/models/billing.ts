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
import { immutableProjectSnapshotHooks } from "../domain/snapshots";
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

const billingAccess = () =>
  controlledProjectModelAccess("canReadBilling", "canManageBilling");

function nextRelationshipId(input: unknown, currentId: string | null): string | null {
  if (input === undefined) return currentId;
  if (input && typeof input === "object" && (input as { disconnect?: boolean }).disconnect) return null;
  return getConnectedId(input);
}

type ProgressClaimRecord = RelatedRecord & { claimType?: string };

async function validateClaimSide(args: ValidationHookArgs) {
  let current: ProgressClaimRecord | null = null;
  if (args.operation === "update" && args.item?.id) {
    current = await queryById(
      args.context,
      "ProgressClaim",
      args.item.id.toString(),
      "claimType primeContract { id } commitment { id }",
    ) as ProgressClaimRecord | null;
  }
  const primeContractId = nextRelationshipId(args.resolvedData.primeContract, current?.primeContract?.id ?? null);
  const commitmentId = nextRelationshipId(args.resolvedData.commitment, current?.commitment?.id ?? null);
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

export const ProgressClaim = list({
  access: billingAccess(),
  hooks: {
    ...projectTenantHooks(),
    validate: { create: validateClaimSide, update: validateClaimSide },
  },
  ui: { listView: { initialColumns: ["claimNumber", "claimType", "status", "periodEnd", "currentPaymentDueMinor"] } },
  fields: {
    claimNumber: text({ validation: { isRequired: true, length: { min: 1, max: 100 } } }),
    invoiceNumber: text({ validation: { length: { max: 100 } } }),
    claimType: select({
      type: "enum",
      options: [
        { label: "Owner", value: "owner" },
        { label: "Commitment", value: "commitment" },
      ],
      defaultValue: "commitment",
      validation: { isRequired: true },
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
      { label: "Voided", value: "voided" },
    ], "draft"),
    periodStart: timestamp({ validation: { isRequired: true } }),
    periodEnd: timestamp({ validation: { isRequired: true } }),
    submittedAt: timestamp(),
    approvedAt: timestamp(),
    dueAt: timestamp(),
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
    certification: text({ ui: { displayMode: "textarea" } }),
    primeContract: relationship({ ref: "PrimeContract.progressClaims" }),
    commitment: relationship({ ref: "Commitment.progressClaims" }),
    tradePartner: relationship({ ref: "TradePartner.progressClaims" }),
    submittedBy: relationship({ ref: "User" }),
    reviewedBy: relationship({ ref: "User" }),
    lineItems: relationship({ ref: "ProgressClaimLineItem.progressClaim", many: true, access: { create: denyAll, update: denyAll } }),
    allocations: relationship({ ref: "PaymentAllocation.progressClaim", many: true, access: { create: denyAll, update: denyAll } }),
    retainageReleases: relationship({ ref: "RetainageRelease.progressClaim", many: true, access: { create: denyAll, update: denyAll } }),
    lienWaivers: relationship({ ref: "LienWaiver.progressClaim", many: true, access: { create: denyAll, update: denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.progressClaims"),
    ...trackingFields,
  },
});

async function validateClaimLineContract(args: ValidationHookArgs) {
  if (args.operation !== "create") return;
  const progressClaimId = getConnectedId(args.resolvedData.progressClaim);
  const contractLineItemId = getConnectedId(args.resolvedData.contractLineItem);
  if (!progressClaimId || !contractLineItemId) return;
  const [claim, line] = await Promise.all([
    queryById(args.context, "ProgressClaim", progressClaimId, "primeContract { id } commitment { id }"),
    queryById(args.context, "ContractLineItem", contractLineItemId, "primeContract { id } commitment { id }"),
  ]) as [RelatedRecord | null, RelatedRecord | null];
  const matchesPrime = claim?.primeContract?.id && claim.primeContract.id === line?.primeContract?.id;
  const matchesCommitment = claim?.commitment?.id && claim.commitment.id === line?.commitment?.id;
  if (!matchesPrime && !matchesCommitment) {
    args.addValidationError("The progress claim and contract line item must belong to the same contract");
  }
}

export const ProgressClaimLineItem = list({
  access: billingAccess(),
  hooks: {
    ...immutableProjectSnapshotHooks("ProgressClaimLineItem"),
    validate: { create: validateClaimLineContract },
  },
  ui: { listView: { initialColumns: ["lineNumber", "description", "progressClaim", "scheduledValueMinor", "currentWorkMinor"] } },
  fields: {
    lineNumber: integer({ validation: { isRequired: true, min: 1 }, access: { update: denyAll } }),
    description: text({ validation: { isRequired: true, length: { min: 1, max: 500 } }, access: { update: denyAll } }),
    scheduledValueMinor: moneyField({ immutable: true }),
    previousWorkMinor: moneyField({ immutable: true }),
    currentWorkMinor: moneyField({ immutable: true }),
    storedMaterialsMinor: moneyField({ immutable: true }),
    completedStoredToDateMinor: moneyField({ immutable: true }),
    percentComplete: integer({ defaultValue: 0, validation: { min: 0, max: 100 }, access: { update: denyAll } }),
    retainageBps: basisPointsField(),
    retainageMinor: moneyField({ immutable: true }),
    earnedLessRetainageMinor: moneyField({ immutable: true }),
    balanceToFinishMinor: moneyField({ immutable: true }),
    progressClaim: relationship({ ref: "ProgressClaim.lineItems", access: { update: denyAll } }),
    contractLineItem: relationship({ ref: "ContractLineItem.progressClaimLineItems", access: { update: denyAll } }),
    retainageReleases: relationship({ ref: "RetainageRelease.progressClaimLineItem", many: true, access: { create: denyAll, update: denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.progressClaimLineItems"),
    ...trackingFields,
  },
});

export const Payment = list({
  access: billingAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["paymentNumber", "direction", "status", "amountMinor", "paidAt", "tradePartner"] } },
  fields: {
    paymentNumber: text({ validation: { isRequired: true, length: { min: 1, max: 100 } } }),
    direction: select({
      type: "enum",
      options: [
        { label: "Receipt", value: "receipt" },
        { label: "Disbursement", value: "disbursement" },
      ],
      validation: { isRequired: true },
    }),
    status: lifecycleStatus([
      { label: "Pending", value: "pending" },
      { label: "Authorized", value: "authorized" },
      { label: "Settled", value: "settled" },
      { label: "Reversed", value: "reversed" },
      { label: "Failed", value: "failed" },
      { label: "Voided", value: "voided" },
    ], "pending"),
    amountMinor: moneyField({ positive: true }),
    currencyCode: currencyCodeField(),
    paymentMethod: select({
      type: "enum",
      options: [
        { label: "ACH", value: "ach" },
        { label: "Check", value: "check" },
        { label: "Wire", value: "wire" },
        { label: "Card", value: "card" },
        { label: "Cash", value: "cash" },
        { label: "Other", value: "other" },
      ],
      defaultValue: "ach",
      validation: { isRequired: true },
    }),
    reference: text(),
    paidAt: timestamp(),
    settledAt: timestamp(),
    tradePartner: relationship({ ref: "TradePartner.payments" }),
    recordedBy: relationship({ ref: "User" }),
    allocations: relationship({ ref: "PaymentAllocation.payment", many: true, access: { create: denyAll, update: denyAll } }),
    reversals: relationship({ ref: "PaymentReversal.payment", many: true, access: { create: denyAll, update: denyAll } }),
    lienWaivers: relationship({ ref: "LienWaiver.payment", many: true, access: { create: denyAll, update: denyAll } }),
    retainageReleases: relationship({ ref: "RetainageRelease.payment", many: true, access: { create: denyAll, update: denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.payments"),
    ...trackingFields,
  },
});

export const PaymentReversal = list({
  access: billingAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["reversalNumber", "payment", "amountMinor", "effectiveAt", "reversedBy"] } },
  fields: {
    reversalNumber: text({ validation: { isRequired: true, length: { min: 1, max: 100 } }, access: { update: denyAll } }),
    amountMinor: moneyField({ positive: true, immutable: true }),
    reason: text({ validation: { isRequired: true, length: { min: 3, max: 2000 } }, access: { update: denyAll }, ui: { displayMode: "textarea" } }),
    externalReference: text({ validation: { isRequired: true, length: { min: 1, max: 200 } }, access: { update: denyAll } }),
    effectiveAt: timestamp({ validation: { isRequired: true }, access: { update: denyAll } }),
    allocationSnapshot: text({ validation: { isRequired: true }, access: { update: denyAll }, ui: { displayMode: "textarea" } }),
    payment: relationship({ ref: "Payment.reversals", access: { update: denyAll } }),
    reversedBy: relationship({ ref: "User", access: { update: denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.paymentReversals"),
    ...trackingFields,
  },
});

export const PaymentAllocation = list({
  access: billingAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["payment", "progressClaim", "amountMinor"] } },
  fields: {
    amountMinor: moneyField({ positive: true }),
    payment: relationship({ ref: "Payment.allocations" }),
    progressClaim: relationship({ ref: "ProgressClaim.allocations" }),
    company: companyTenantField(),
    project: projectTenantField("Project.paymentAllocations"),
    ...trackingFields,
  },
});

export const RetainageRelease = list({
  access: billingAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["releaseNumber", "status", "amountMinor", "progressClaim", "releasedAt"] } },
  fields: {
    releaseNumber: text({ validation: { isRequired: true, length: { min: 1, max: 100 } } }),
    status: lifecycleStatus([
      { label: "Requested", value: "requested" },
      { label: "Approved", value: "approved" },
      { label: "Released", value: "released" },
      { label: "Rejected", value: "rejected" },
      { label: "Voided", value: "voided" },
    ], "requested"),
    amountMinor: moneyField({ positive: true }),
    currencyCode: currencyCodeField(),
    requestedAt: timestamp({ defaultValue: { kind: "now" } }),
    approvedAt: timestamp(),
    releasedAt: timestamp(),
    reason: text({ ui: { displayMode: "textarea" } }),
    progressClaim: relationship({ ref: "ProgressClaim.retainageReleases" }),
    progressClaimLineItem: relationship({ ref: "ProgressClaimLineItem.retainageReleases" }),
    payment: relationship({ ref: "Payment.retainageReleases" }),
    approvedBy: relationship({ ref: "User" }),
    company: companyTenantField(),
    project: projectTenantField("Project.retainageReleases"),
    ...trackingFields,
  },
});

export const LienWaiver = list({
  access: billingAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["waiverNumber", "waiverType", "status", "tradePartner", "throughDate"] } },
  fields: {
    waiverNumber: text({ validation: { isRequired: true, length: { min: 1, max: 100 } } }),
    waiverType: select({
      type: "enum",
      options: [
        { label: "Conditional Progress", value: "conditional_progress" },
        { label: "Unconditional Progress", value: "unconditional_progress" },
        { label: "Conditional Final", value: "conditional_final" },
        { label: "Unconditional Final", value: "unconditional_final" },
      ],
      validation: { isRequired: true },
    }),
    status: lifecycleStatus([
      { label: "Requested", value: "requested" },
      { label: "Received", value: "received" },
      { label: "Accepted", value: "accepted" },
      { label: "Rejected", value: "rejected" },
      { label: "Expired", value: "expired" },
    ], "requested"),
    throughDate: timestamp({ validation: { isRequired: true } }),
    amountMinor: moneyField({ nonNegative: true }),
    currencyCode: currencyCodeField(),
    requestedAt: timestamp(),
    receivedAt: timestamp(),
    signedAt: timestamp(),
    signerName: text({ access: { read: denyAll } }),
    fileName: text({ access: { read: denyAll } }),
    storageKey: text({ access: { read: denyAll } }),
    checksumSha256: text({ validation: { length: { min: 64, max: 64 } }, access: { read: denyAll } }),
    tradePartner: relationship({ ref: "TradePartner.lienWaivers" }),
    commitment: relationship({ ref: "Commitment.lienWaivers" }),
    progressClaim: relationship({ ref: "ProgressClaim.lienWaivers" }),
    payment: relationship({ ref: "Payment.lienWaivers" }),
    reviewedBy: relationship({ ref: "User" }),
    company: companyTenantField(),
    project: projectTenantField("Project.lienWaivers"),
    ...trackingFields,
  },
});
