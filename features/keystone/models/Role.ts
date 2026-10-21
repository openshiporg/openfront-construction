import { list } from "@keystone-6/core";
import { denyAll } from "@keystone-6/core/access";
import { relationship, text } from "@keystone-6/core/fields";

import { hasCompanyPermission, isSignedIn, permissions, rules } from "../access";
import { syncDashboardAdmission } from "../domain/dashboard-admission";
import { canAccessCompanyById, getConnectedId } from "../domain/tenancy";
import { permissionFields } from "./fields";
import { trackingFields } from "./trackingFields";

export const Role = list({
  hooks: {
    // Dashboard admission follows membership roles; re-evaluate members when
    // a role's dashboard permission changes.
    afterOperation: async ({ operation, resolvedData, item, context }) => {
      if (operation !== "update" || !item || resolvedData?.canAccessDashboard === undefined) return;
      const roleId = item.id.toString();
      const where = { role: { id: { equals: roleId } } };
      const [companyMembers, projectMembers] = await Promise.all([
        context.sudo().query.CompanyMembership.findMany({ where, take: 500, query: "user { id }" }),
        context.sudo().query.ProjectMembership.findMany({ where, take: 500, query: "user { id }" }),
      ]);
      const userIds = new Set([...companyMembers, ...projectMembers].map(member => (member.user as { id?: string } | null)?.id).filter(Boolean));
      for (const userId of userIds) await syncDashboardAdmission(context, userId);
    },
  },
  access: {
    operation: {
      query: isSignedIn,
      create: permissions.canManageRoles,
      update: permissions.canManageRoles,
      delete: permissions.canManageRoles,
    },
    filter: {
      query: rules.canReadRoles,
      update: rules.canManageRoles,
      delete: rules.canManageRoles,
    },
    item: {
      create: async ({ session, inputData, context }) => {
        const companyId = getConnectedId(inputData.company);
        if (!companyId || !session?.itemId) return false;
        return hasCompanyPermission(session, companyId, "canManageRoles") &&
          canAccessCompanyById(context, session.itemId, companyId, true);
      },
    },
  },
  ui: {
    hideCreate: args => !permissions.canManageRoles(args),
    hideDelete: args => !permissions.canManageRoles(args),
    listView: { initialColumns: ["name", "company", "assignedTo"] },
  },
  fields: {
    name: text({ validation: { isRequired: true, length: { min: 1, max: 120 } } }),
    company: relationship({
      ref: "Company.roles",
      access: {
        update: denyAll,
        create: async ({ session, inputData, context }) => {
          const companyId = getConnectedId(inputData.company);
          if (!companyId || !session?.itemId) return false;
          return hasCompanyPermission(session, companyId, "canManageRoles") &&
            canAccessCompanyById(context, session.itemId, companyId, true);
        },
      },
    }),
    ...permissionFields,
    assignedTo: relationship({ ref: "User.role", many: true, access: { create: denyAll, update: denyAll } }),
    companyMemberships: relationship({ ref: "CompanyMembership.role", many: true, access: { create: denyAll, update: denyAll } }),
    projectMemberships: relationship({ ref: "ProjectMembership.role", many: true, access: { create: denyAll, update: denyAll } }),
    ...trackingFields,
  },
});
