import { list } from "@keystone-6/core";
import { denyAll } from "@keystone-6/core/access";
import {
  checkbox,
  multiselect,
  relationship,
  select,
  text,
  timestamp,
} from "@keystone-6/core/fields";

import {
  controlledCompanyModelAccess,
  controlledProjectModelAccess,
} from "../access";
import { projectTenantHooks } from "../domain/tenancy";
import {
  companyTenantField,
  currencyCodeField,
  moneyField,
  ownedCompanyField,
  projectTenantField,
  scopeOptions,
} from "./fields";
import { trackingFields } from "./trackingFields";

const auditRead = () => controlledProjectModelAccess("canReadAudit", "canReadAudit");
const documentRead = () => controlledProjectModelAccess("canReadDocuments", "canManageDocuments");

/**
 * Bearer credentials are issued and revoked only by custom GraphQL mutations.
 * Only a SHA-256 digest and a display prefix are persisted; the raw token is
 * returned exactly once. Session hydration intersects these scopes with the
 * owning user's live roles and memberships.
 */
export const ApiCredential = list({
  access: controlledCompanyModelAccess("canReadAgents", "canManageAgents"),
  ui: { listView: { initialColumns: ["name", "tokenPrefix", "status", "company", "project", "expiresAt"] } },
  fields: {
    name: text({ validation: { isRequired: true, length: { min: 3, max: 160 } } }),
    tokenPrefix: text({ validation: { isRequired: true, length: { min: 8, max: 24 } }, access: { update: denyAll } }),
    tokenHash: text({
      isIndexed: "unique",
      validation: { isRequired: true, length: { min: 64, max: 64 } },
      access: { read: denyAll, create: denyAll, update: denyAll },
    }),
    status: select({
      type: "enum",
      options: [
        { label: "Active", value: "active" },
        { label: "Suspended", value: "suspended" },
        { label: "Revoked", value: "revoked" },
      ],
      defaultValue: "active",
      validation: { isRequired: true },
      access: { update: denyAll },
    }),
    scopes: multiselect({
      type: "string",
      options: scopeOptions,
      access: { update: denyAll },
    }),
    lastUsedAt: timestamp({ access: { create: denyAll, update: denyAll } }),
    expiresAt: timestamp({ access: { update: denyAll } }),
    revokedAt: timestamp({ access: { create: denyAll, update: denyAll } }),
    owner: relationship({ ref: "User", access: { update: denyAll } }),
    company: ownedCompanyField("Company.apiCredentials"),
    project: relationship({ ref: "Project.apiCredentials", access: { update: denyAll } }),
    ...trackingFields,
  },
});

export const AccountInvitation = list({
  access: controlledProjectModelAccess("canReadPeople", "canManagePeople"),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["email", "status", "project", "expiresAt", "acceptedAt"] } },
  fields: {
    tokenHash: text({ isIndexed: "unique", validation: { isRequired: true, length: { min: 64, max: 64 } }, access: { read: denyAll, create: denyAll, update: denyAll } }),
    tokenPrefix: text({ validation: { isRequired: true, length: { min: 8, max: 24 } }, access: { update: denyAll } }),
    email: text({ validation: { isRequired: true, length: { min: 3, max: 320 } }, access: { update: denyAll } }),
    status: select({
      type: "enum",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Accepted", value: "accepted" },
        { label: "Revoked", value: "revoked" },
        { label: "Expired", value: "expired" },
      ],
      defaultValue: "pending",
      validation: { isRequired: true },
      access: { update: denyAll },
    }),
    expiresAt: timestamp({ validation: { isRequired: true }, access: { update: denyAll } }),
    acceptedAt: timestamp({ access: { create: denyAll, update: denyAll } }),
    accountSetupRequired: checkbox({ defaultValue: false, access: { read: denyAll, create: denyAll, update: denyAll } }),
    invitedBy: relationship({ ref: "User", access: { update: denyAll } }),
    user: relationship({ ref: "User", access: { update: denyAll } }),
    projectMembership: relationship({ ref: "ProjectMembership", access: { update: denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.accountInvitations"),
    ...trackingFields,
  },
});

export const ApprovalPolicy = list({
  access: controlledCompanyModelAccess("canReadAudit", "canManageRoles"),
  ui: { listView: { initialColumns: ["name", "domain", "minimumAmountMinor", "approverRole", "isActive"] } },
  fields: {
    policyKey: text({ isIndexed: "unique", validation: { isRequired: true }, access: { create: denyAll, update: denyAll } }),
    name: text({ validation: { isRequired: true, length: { min: 3, max: 160 } } }),
    domain: select({
      type: "enum",
      options: [
        { label: "Budget change", value: "budget_change" },
        { label: "Prime contract", value: "prime_contract" },
        { label: "Change order", value: "change_order" },
        { label: "Progress claim", value: "progress_claim" },
        { label: "Retainage release", value: "retainage_release" },
      ],
      validation: { isRequired: true },
    }),
    minimumAmountMinor: moneyField({ nonNegative: true }),
    currencyCode: currencyCodeField(),
    isActive: checkbox({ defaultValue: true }),
    approverRole: relationship({ ref: "Role" }),
    company: ownedCompanyField("Company.approvalPolicies"),
    project: relationship({ ref: "Project.approvalPolicies" }),
    requests: relationship({ ref: "ApprovalRequest.policy", many: true, access: { create: denyAll, update: denyAll } }),
    ...trackingFields,
  },
});

export const ApprovalRequest = list({
  access: auditRead(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["requestNumber", "targetType", "targetStatus", "status", "amountMinor", "requestedAt"] } },
  fields: {
    requestKey: text({ isIndexed: "unique", validation: { isRequired: true }, access: { create: denyAll, update: denyAll } }),
    requestNumber: text({ validation: { isRequired: true, length: { min: 1, max: 100 } }, access: { update: denyAll } }),
    operation: text({ validation: { isRequired: true, length: { min: 1, max: 160 } }, access: { update: denyAll } }),
    targetType: text({ validation: { isRequired: true, length: { min: 1, max: 120 } }, access: { update: denyAll } }),
    targetId: text({ validation: { isRequired: true, length: { min: 1, max: 200 } }, access: { update: denyAll } }),
    targetStatus: text({ validation: { isRequired: true, length: { min: 1, max: 80 } }, access: { update: denyAll } }),
    canonicalSnapshot: text({ validation: { isRequired: true }, access: { update: denyAll }, ui: { displayMode: "textarea" } }),
    snapshotDigest: text({ validation: { isRequired: true, length: { min: 64, max: 64 } }, access: { update: denyAll } }),
    policySnapshot: text({ validation: { isRequired: true }, access: { update: denyAll }, ui: { displayMode: "textarea" } }),
    policyDigest: text({ validation: { isRequired: true, length: { min: 64, max: 64 } }, access: { update: denyAll } }),
    approverRoleIdSnapshot: text({ access: { update: denyAll } }),
    amountMinor: moneyField({ immutable: true }),
    currencyCode: currencyCodeField(),
    status: select({
      type: "enum",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Approved", value: "approved" },
        { label: "Rejected", value: "rejected" },
        { label: "Cancelled", value: "cancelled" },
        { label: "Superseded", value: "superseded" },
      ],
      defaultValue: "pending",
      validation: { isRequired: true },
      access: { update: denyAll },
    }),
    requestedAt: timestamp({ validation: { isRequired: true }, defaultValue: { kind: "now" }, access: { update: denyAll } }),
    decidedAt: timestamp({ access: { create: denyAll, update: denyAll } }),
    policy: relationship({ ref: "ApprovalPolicy.requests", access: { update: denyAll } }),
    requestedBy: relationship({ ref: "User", access: { update: denyAll } }),
    assignedTo: relationship({ ref: "ProjectMembership.approvalRequests", access: { update: denyAll } }),
    decisions: relationship({ ref: "ApprovalDecision.request", many: true, access: { create: denyAll, update: denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.approvalRequests"),
    ...trackingFields,
  },
});

export const ApprovalDecision = list({
  access: auditRead(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["request", "decision", "decidedBy", "decidedAt"] } },
  fields: {
    decision: select({
      type: "enum",
      options: [
        { label: "Approved", value: "approved" },
        { label: "Rejected", value: "rejected" },
      ],
      validation: { isRequired: true },
      access: { update: denyAll },
    }),
    comment: text({ validation: { isRequired: true, length: { min: 3, max: 2000 } }, access: { update: denyAll }, ui: { displayMode: "textarea" } }),
    decidedAt: timestamp({ validation: { isRequired: true }, defaultValue: { kind: "now" }, access: { update: denyAll } }),
    request: relationship({ ref: "ApprovalRequest.decisions", access: { update: denyAll } }),
    decidedBy: relationship({ ref: "User", access: { update: denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.approvalDecisions"),
    ...trackingFields,
  },
});

export const DocumentDistribution = list({
  access: documentRead(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["documentVersion", "recipient", "purpose", "distributedAt", "expiresAt"] } },
  fields: {
    distributionKey: text({ isIndexed: "unique", validation: { isRequired: true }, access: { create: denyAll, update: denyAll } }),
    purpose: text({ validation: { isRequired: true, length: { min: 3, max: 500 } }, access: { update: denyAll } }),
    distributedAt: timestamp({ validation: { isRequired: true }, defaultValue: { kind: "now" }, access: { update: denyAll } }),
    expiresAt: timestamp({ access: { update: denyAll } }),
    documentVersion: relationship({ ref: "DocumentVersion.distributions", access: { update: denyAll } }),
    recipient: relationship({ ref: "ProjectMembership.documentDistributions", access: { update: denyAll } }),
    distributedBy: relationship({ ref: "User", access: { update: denyAll } }),
    acknowledgements: relationship({ ref: "DocumentAcknowledgement.distribution", many: true, access: { create: denyAll, update: denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.documentDistributions"),
    ...trackingFields,
  },
});

export const DocumentAcknowledgement = list({
  access: documentRead(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["distribution", "acknowledgedBy", "acknowledgedAt"] } },
  fields: {
    acknowledgementKey: text({ isIndexed: "unique", validation: { isRequired: true }, access: { create: denyAll, update: denyAll } }),
    acknowledgement: text({ validation: { isRequired: true, length: { min: 3, max: 500 } }, access: { update: denyAll } }),
    acknowledgedAt: timestamp({ validation: { isRequired: true }, defaultValue: { kind: "now" }, access: { update: denyAll } }),
    distribution: relationship({ ref: "DocumentDistribution.acknowledgements", access: { update: denyAll } }),
    acknowledgedBy: relationship({ ref: "User", access: { update: denyAll } }),
    company: companyTenantField(),
    project: projectTenantField("Project.documentAcknowledgements"),
    ...trackingFields,
  },
});
