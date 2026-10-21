import { list } from "@keystone-6/core";
import { denyAll } from "@keystone-6/core/access";
import { checkbox, password, relationship, select, text } from "@keystone-6/core/fields";

import { isHumanSession, isSignedIn, permissions, rules } from "../access";
import { permissionsList, readOnlyRelationshipMany } from "./fields";
import { trackingFields } from "./trackingFields";

export function shouldRevokeUserSessions(operation: string, resolvedData: Record<string, unknown>): boolean {
  return operation === "update" && (resolvedData.password !== undefined || resolvedData.isActive === false);
}

function isPlatformAdministrator(session: Parameters<typeof permissions.canManageRoles>[0]["session"]): boolean {
  return Boolean(session?.data.role && permissionsList.every(permission => session.data.role?.[permission] === true));
}

export const User = list({
  hooks: {
    afterOperation: async ({ operation, resolvedData, item, context }) => {
      if (!resolvedData || !item || !shouldRevokeUserSessions(operation, resolvedData)) return;
      await context.sudo().prisma.authSession.updateMany({
        where: { userId: item.id.toString(), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    },
  },
  access: {
    operation: {
      query: isSignedIn,
      create: args =>
        process.env.PUBLIC_SIGNUPS_ALLOWED === "true" || permissions.canManagePeople(args),
      update: isHumanSession,
      delete: permissions.canManagePeople,
    },
    filter: {
      query: rules.canReadPeople,
      update: rules.canUpdatePeople,
      delete: rules.canDeletePeople,
    },
  },
  ui: {
    hideCreate: args => !permissions.canManagePeople(args),
    hideDelete: args => !permissions.canManagePeople(args),
    listView: { initialColumns: ["name", "email", "role", "isActive"] },
  },
  fields: {
    name: text({ validation: { isRequired: true, length: { min: 1, max: 200 } } }),
    email: text({
      isIndexed: "unique",
      validation: { isRequired: true, length: { min: 3, max: 320 } },
    }),
    password: password({
      access: {
        read: denyAll,
        update: ({ session, item }) => isHumanSession({ session }) && (
          permissions.canManagePeople({ session }) || session?.itemId === item.id
        ),
      },
      validation: {
        isRequired: true,
        length: { min: 10, max: 1000 },
        rejectCommon: true,
      },
    }),
    role: relationship({
      ref: "Role.assignedTo",
      access: {
        create: ({ session }) => isPlatformAdministrator(session),
        update: ({ session }) => isPlatformAdministrator(session),
      },
    }),
    phone: text({ validation: { length: { max: 50 } } }),
    jobTitle: text({ validation: { length: { max: 160 } } }),
    isActive: checkbox({ defaultValue: true }),
    onboardingStatus: select({
      type: "enum",
      options: [
        { label: "Not Started", value: "not_started" },
        { label: "In Progress", value: "in_progress" },
        { label: "Completed", value: "completed" },
        { label: "Dismissed", value: "dismissed" },
      ],
      defaultValue: "not_started",
      validation: { isRequired: true },
    }),
    authSessions: relationship({ ref: "AuthSession.user", many: true, access: { read: denyAll, create: denyAll, update: denyAll } }),
    companyMemberships: readOnlyRelationshipMany("CompanyMembership.user"),
    projectMemberships: readOnlyRelationshipMany("ProjectMembership.user"),
    serviceRequests: readOnlyRelationshipMany("ServiceRequest.customer"),
    serviceRequestEvents: readOnlyRelationshipMany("ServiceRequestEvent.actor"),
    agentIdentities: readOnlyRelationshipMany("AgentIdentity.owner"),
    requestedAgentActions: readOnlyRelationshipMany("AgentAction.requestedBy"),
    reviewedAgentActions: readOnlyRelationshipMany("AgentAction.reviewedBy"),
    performedAgentActions: readOnlyRelationshipMany("AgentAction.actorUser"),
    ...trackingFields,
  },
});
