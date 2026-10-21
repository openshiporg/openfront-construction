import { list } from "@keystone-6/core";
import { denyAll } from "@keystone-6/core/access";
import {
  integer,
  relationship,
  select,
  text,
  timestamp,
} from "@keystone-6/core/fields";

import {
  companyModelAccess,
  projectEvidencePermissionFilter,
  permissions,
} from "../access";
import {
  getConnectedId,
  queryById,
  type KeystoneContextLike,
  type KeystoneQueryRecord,
} from "../domain/tenancy";
import { ownedCompanyField, readOnlyRelationshipMany, scopeOptions } from "./fields";
import { trackingFields } from "./trackingFields";
import { validateCompanyOwner, type CompanyOwnerValidation } from "../domain/company-owners";

function validateIdentityOwner(args: Omit<CompanyOwnerValidation, "listKey">) {
  return validateCompanyOwner({ ...args, listKey: "AgentIdentity", required: true, immutable: true });
}

const deny = () => false;

export const AuthSession = list({
  access: {
    operation: { query: deny, create: deny, update: deny, delete: deny },
  },
  graphql: { omit: { query: true, create: true, update: true, delete: true } },
  ui: { isHidden: true },
  fields: {
    sessionKey: text({ isIndexed: "unique", validation: { isRequired: true }, access: { read: denyAll, update: denyAll } }),
    user: relationship({ ref: "User.authSessions", access: { update: denyAll } }),
    expiresAt: timestamp({ validation: { isRequired: true }, access: { update: denyAll } }),
    revokedAt: timestamp(),
    ...trackingFields,
  },
});

export const AgentIdentity = list({
  access: companyModelAccess("canReadAgents", "canManageAgents", { delete: false }),
  hooks: {
    validate: {
      create: validateIdentityOwner,
      update: validateIdentityOwner,
    },
  },
  ui: { listView: { initialColumns: ["name", "slug", "status", "owner", "company"] } },
  fields: {
    name: text({ validation: { isRequired: true, length: { min: 1, max: 200 } } }),
    slug: text({
      validation: { isRequired: true, length: { min: 2, max: 120 }, match: { regex: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ } },
    }),
    description: text({ ui: { displayMode: "textarea" } }),
    status: select({
      type: "enum",
      options: [
        { label: "Active", value: "active" },
        { label: "Suspended", value: "suspended" },
        { label: "Revoked", value: "revoked" },
      ],
      defaultValue: "active",
      validation: { isRequired: true },
    }),
    approvalMode: select({
      type: "enum",
      options: [
        { label: "Always", value: "always" },
        { label: "Financial and Contract Actions", value: "risk_based" },
        { label: "No Additional Approval", value: "none" },
      ],
      defaultValue: "always",
      validation: { isRequired: true },
    }),
    owner: relationship({ ref: "User.agentIdentities", access: { update: denyAll } }),
    company: ownedCompanyField("Company.agentIdentities"),
    scopeGrants: readOnlyRelationshipMany("ScopeGrant.agentIdentity"),
    actions: readOnlyRelationshipMany("AgentAction.agentIdentity"),
    ...trackingFields,
  },
});

type ScopeValidationArgs = {
  operation: "create" | "update";
  item?: { id: { toString(): string } } | null;
  resolvedData: Record<string, unknown>;
  context: KeystoneContextLike;
  addValidationError(message: string): void;
};

type ScopeGrantRecord = KeystoneQueryRecord & {
  agentIdentity?: { id?: string; company?: { id?: string } | null } | null;
  grantedBy?: { id?: string } | null;
};

async function validateScopeProject(args: ScopeValidationArgs) {
  let current: ScopeGrantRecord | null = null;
  if (args.operation === "update" && args.item?.id) {
    current = await queryById(
      args.context,
      "ScopeGrant",
      args.item.id.toString(),
      "company { id } project { id } agentIdentity { id company { id } } grantedBy { id }",
    ) as ScopeGrantRecord | null;
  }

  const companyId = getConnectedId(args.resolvedData.company) ?? current?.company?.id ?? null;
  const projectId = args.resolvedData.project === undefined
    ? current?.project?.id ?? null
    : getConnectedId(args.resolvedData.project);
  const agentIdentityId = getConnectedId(args.resolvedData.agentIdentity) ?? current?.agentIdentity?.id ?? null;
  const grantedById = getConnectedId(args.resolvedData.grantedBy) ?? current?.grantedBy?.id ?? null;

  if (!companyId) args.addValidationError("Scope company is required");
  if (!agentIdentityId) args.addValidationError("Scope agent identity is required");
  if (!grantedById) args.addValidationError("Scope grantor is required");
  if (!companyId || !agentIdentityId) return;

  const identity = await queryById(args.context, "AgentIdentity", agentIdentityId, "company { id }");
  if (identity?.company?.id !== companyId) {
    args.addValidationError("The scope agent identity must belong to the scope company");
  }

  if (!projectId) return;
  const project = await queryById(args.context, "Project", projectId, "company { id }");
  if (project?.company?.id !== companyId) {
    args.addValidationError("The scope project must belong to the scope company");
  }
}

export const ScopeGrant = list({
  access: companyModelAccess("canReadAgents", "canManageAgents", { delete: false }),
  hooks: {
    resolveInput: {
      create: ({ resolvedData, context }) => {
        const actorId = context.session?.itemId ?? getConnectedId(resolvedData.grantedBy);
        if (!actorId) throw new Error("Scope grant attribution requires an actor");
        return { ...resolvedData, grantedBy: { connect: { id: actorId } } };
      },
      update: ({ resolvedData, context }) => {
        if (resolvedData.status !== "revoked") return resolvedData;
        const actorId = context.session?.itemId ?? getConnectedId(resolvedData.revokedBy);
        if (!actorId) throw new Error("Scope revocation attribution requires an actor");
        return {
          ...resolvedData,
          revokedAt: new Date(),
          revokedBy: { connect: { id: actorId } },
        };
      },
    },
    validate: { create: validateScopeProject, update: validateScopeProject },
  },
  ui: { listView: { initialColumns: ["agentIdentity", "scope", "status", "company", "project", "expiresAt"] } },
  fields: {
    scope: select({
      type: "string",
      options: scopeOptions,
      validation: { isRequired: true },
    }),
    status: select({
      type: "enum",
      options: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
        { label: "Revoked", value: "revoked" },
      ],
      defaultValue: "active",
      validation: { isRequired: true },
    }),
    reason: text({ validation: { isRequired: true, length: { min: 3, max: 500 } } }),
    expiresAt: timestamp(),
    revokedAt: timestamp(),
    agentIdentity: relationship({ ref: "AgentIdentity.scopeGrants", access: { update: denyAll } }),
    company: ownedCompanyField("Company.scopeGrants"),
    project: relationship({ ref: "Project.scopeGrants" }),
    grantedBy: relationship({ ref: "User", access: { create: denyAll, update: denyAll } }),
    revokedBy: relationship({ ref: "User", access: { create: denyAll, update: denyAll } }),
    ...trackingFields,
  },
});

export const AgentAction = list({
  access: {
    operation: {
      query: permissions.canReadAudit,
      create: deny,
      update: deny,
      delete: deny,
    },
    filter: { query: ({ session }) => projectEvidencePermissionFilter(session) },
  },
  graphql: { omit: { create: true, update: true, delete: true } },
  ui: {
    hideCreate: true,
    hideDelete: true,
    listView: { initialColumns: ["action", "status", "actorType", "targetType", "targetId", "requestedAt"] },
  },
  fields: {
    actionKey: text({ isIndexed: "unique", validation: { isRequired: true }, access: { update: denyAll } }),
    actorType: select({
      type: "enum",
      options: [
        { label: "Human", value: "human" },
        { label: "Agent", value: "agent" },
        { label: "System", value: "system" },
      ],
      validation: { isRequired: true },
      access: { update: denyAll },
    }),
    action: text({ validation: { isRequired: true, length: { min: 1, max: 200 } }, access: { update: denyAll } }),
    requiredScope: select({ type: "string", options: scopeOptions, access: { update: denyAll } }),
    status: select({
      type: "enum",
      options: [
        { label: "Proposed", value: "proposed" },
        { label: "Approved", value: "approved" },
        { label: "Rejected", value: "rejected" },
        { label: "Running", value: "running" },
        { label: "Succeeded", value: "succeeded" },
        { label: "Failed", value: "failed" },
      ],
      validation: { isRequired: true },
    }),
    targetType: text({ validation: { isRequired: true, length: { min: 1, max: 120 } }, access: { update: denyAll } }),
    targetId: text({ validation: { isRequired: true, length: { min: 1, max: 200 } }, access: { update: denyAll } }),
    targetStatus: text({ validation: { isRequired: true, length: { min: 1, max: 80 } }, access: { update: denyAll } }),
    reason: text({ validation: { isRequired: true, length: { min: 3, max: 500 } }, access: { update: denyAll } }),
    correlationId: text({ access: { update: denyAll } }),
    causationId: text({ access: { update: denyAll } }),
    requestDigest: text({ access: { read: permissions.canReadAudit, update: denyAll } }),
    resultDigest: text({ access: { read: permissions.canReadAudit } }),
    errorCode: text(),
    errorMessage: text({ access: { read: permissions.canReadAudit } }),
    requestedAt: timestamp({ validation: { isRequired: true }, defaultValue: { kind: "now" }, access: { update: denyAll } }),
    reviewedAt: timestamp(),
    reviewNotes: text({ access: { read: permissions.canReadAudit } }),
    startedAt: timestamp(),
    completedAt: timestamp(),
    company: relationship({ ref: "Company.agentActions", access: { update: denyAll } }),
    project: relationship({ ref: "Project.agentActions", access: { update: denyAll } }),
    agentIdentity: relationship({ ref: "AgentIdentity.actions", access: { update: denyAll } }),
    scopeGrant: relationship({ ref: "ScopeGrant", access: { update: denyAll } }),
    requestedBy: relationship({ ref: "User.requestedAgentActions", access: { update: denyAll } }),
    reviewedBy: relationship({ ref: "User.reviewedAgentActions" }),
    actorUser: relationship({ ref: "User.performedAgentActions", access: { update: denyAll } }),
    idempotencyKey: relationship({ ref: "IdempotencyKey.agentAction", access: { update: denyAll } }),
    outboxMessages: readOnlyRelationshipMany("OutboxMessage.agentAction"),
    ...trackingFields,
  },
});

export const OutboxMessage = list({
  access: {
    operation: {
      query: permissions.canReadAudit,
      create: deny,
      update: deny,
      delete: deny,
    },
    filter: { query: ({ session }) => projectEvidencePermissionFilter(session) },
  },
  graphql: { omit: { create: true, update: true, delete: true } },
  ui: {
    hideCreate: true,
    hideDelete: true,
    listView: { initialColumns: ["eventType", "aggregateType", "aggregateId", "status", "availableAt"] },
  },
  fields: {
    messageKey: text({ isIndexed: "unique", validation: { isRequired: true }, access: { update: denyAll } }),
    eventType: text({ validation: { isRequired: true, length: { min: 1, max: 160 } }, access: { update: denyAll } }),
    aggregateType: text({ validation: { isRequired: true, length: { min: 1, max: 120 } }, access: { update: denyAll } }),
    aggregateId: text({ validation: { isRequired: true, length: { min: 1, max: 200 } }, access: { update: denyAll } }),
    schemaVersion: integer({ defaultValue: 1, validation: { isRequired: true, min: 1 }, access: { update: denyAll } }),
    canonicalPayload: text({ validation: { isRequired: true }, access: { read: permissions.canReadAudit, update: denyAll }, ui: { displayMode: "textarea" } }),
    payloadDigest: text({ validation: { isRequired: true, length: { min: 64, max: 64 } }, access: { update: denyAll } }),
    status: select({
      type: "enum",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Processing", value: "processing" },
        { label: "Delivered", value: "delivered" },
        { label: "Retry", value: "retry" },
        { label: "Dead letter", value: "dead_letter" },
      ],
      defaultValue: "pending",
      validation: { isRequired: true },
    }),
    attempts: integer({ defaultValue: 0, validation: { isRequired: true, min: 0 } }),
    availableAt: timestamp({ defaultValue: { kind: "now" }, validation: { isRequired: true } }),
    lockedAt: timestamp(),
    lockOwner: text({ validation: { length: { max: 200 } } }),
    lastAttemptAt: timestamp(),
    deliveredAt: timestamp(),
    lastError: text({ access: { read: permissions.canReadAudit } }),
    company: relationship({ ref: "Company.outboxMessages", access: { update: denyAll } }),
    project: relationship({ ref: "Project.outboxMessages", access: { update: denyAll } }),
    agentAction: relationship({ ref: "AgentAction.outboxMessages", access: { update: denyAll } }),
    ...trackingFields,
  },
});

export const IdempotencyKey = list({
  access: {
    operation: {
      query: permissions.canReadAudit,
      create: deny,
      update: deny,
      delete: deny,
    },
    filter: { query: ({ session }) => projectEvidencePermissionFilter(session) },
  },
  graphql: { omit: { create: true, update: true, delete: true } },
  ui: {
    hideCreate: true,
    hideDelete: true,
    listView: { initialColumns: ["operation", "key", "status", "resourceType", "resourceId", "createdAt"] },
  },
  fields: {
    fingerprint: text({ isIndexed: "unique", validation: { isRequired: true }, access: { update: denyAll } }),
    key: text({ validation: { isRequired: true, length: { min: 1, max: 200 } }, access: { update: denyAll } }),
    operation: text({ validation: { isRequired: true, length: { min: 1, max: 200 } }, access: { update: denyAll } }),
    requestHash: text({ validation: { isRequired: true, length: { min: 64, max: 64 } }, access: { update: denyAll } }),
    status: select({
      type: "enum",
      options: [
        { label: "Started", value: "started" },
        { label: "Completed", value: "completed" },
        { label: "Failed", value: "failed" },
      ],
      defaultValue: "started",
      validation: { isRequired: true },
    }),
    resourceType: text({ access: { update: denyAll } }),
    resourceId: text({ access: { update: denyAll } }),
    fromStatus: text({ access: { update: denyAll } }),
    toStatus: text({ access: { update: denyAll } }),
    errorCode: text(),
    lockedAt: timestamp({ defaultValue: { kind: "now" }, access: { update: denyAll } }),
    expiresAt: timestamp(),
    company: relationship({ ref: "Company.idempotencyKeys", access: { update: denyAll } }),
    project: relationship({ ref: "Project.idempotencyKeys", access: { update: denyAll } }),
    agentAction: relationship({ ref: "AgentAction.idempotencyKey" }),
    ...trackingFields,
  },
});
