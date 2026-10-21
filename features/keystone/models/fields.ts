import { denyAll } from "@keystone-6/core/access";
import {
  bigInt,
  checkbox,
  integer,
  relationship,
  select,
  text,
} from "@keystone-6/core/fields";

import type { ConstructionScope } from "../domain/scopes";
import { CONSTRUCTION_SCOPES } from "../domain/scopes";
import { canAccessCompanyById, getConnectedId } from "../domain/tenancy";

export const permissionFields = {
  canAccessDashboard: checkbox({ defaultValue: false }),
  canReadCompanies: checkbox({ defaultValue: false }),
  canManageCompanies: checkbox({ defaultValue: false }),
  canReadPeople: checkbox({ defaultValue: false }),
  canManagePeople: checkbox({ defaultValue: false }),
  canReadProjects: checkbox({ defaultValue: false }),
  canManageProjects: checkbox({ defaultValue: false }),
  canReadPreconstruction: checkbox({ defaultValue: false }),
  canManagePreconstruction: checkbox({ defaultValue: false }),
  canReadFinancials: checkbox({ defaultValue: false }),
  canManageFinancials: checkbox({ defaultValue: false }),
  canReadContracts: checkbox({ defaultValue: false }),
  canManageContracts: checkbox({ defaultValue: false }),
  canReadProjectExecution: checkbox({ defaultValue: false }),
  canManageProjectExecution: checkbox({ defaultValue: false }),
  canReadDocuments: checkbox({ defaultValue: false }),
  canManageDocuments: checkbox({ defaultValue: false }),
  canReadFieldOperations: checkbox({ defaultValue: false }),
  canManageFieldOperations: checkbox({ defaultValue: false }),
  canReadSafety: checkbox({ defaultValue: false }),
  canManageSafety: checkbox({ defaultValue: false }),
  canReadBilling: checkbox({ defaultValue: false }),
  canManageBilling: checkbox({ defaultValue: false }),
  canReadAgents: checkbox({ defaultValue: false }),
  canManageAgents: checkbox({ defaultValue: false }),
  canReadAudit: checkbox({ defaultValue: false }),
  canManageRoles: checkbox({ defaultValue: false }),
  canManageSettings: checkbox({ defaultValue: false }),
  canManageOnboarding: checkbox({ defaultValue: false }),
};

export type Permission = keyof typeof permissionFields;
export const permissionsList = Object.keys(permissionFields) as Permission[];

export function lifecycleStatus(
  options: readonly { label: string; value: string }[],
  defaultValue: string,
) {
  return select({
    type: "enum",
    options: [...options],
    defaultValue,
    validation: { isRequired: true },
    access: { update: denyAll },
    ui: {
      itemView: { fieldMode: "read" },
      createView: { fieldMode: "hidden" },
    },
  });
}

export function currencyCodeField() {
  return text({
    defaultValue: "USD",
    validation: { isRequired: true, length: { min: 3, max: 3 } },
  });
}

export function basisPointsField(defaultValue = 0) {
  return integer({
    defaultValue,
    validation: { min: 0, max: 10_000 },
  });
}

export function moneyField(
  options: {
    immutable?: boolean;
    nonNegative?: boolean;
    positive?: boolean;
  } = {},
) {
  return bigInt({
    defaultValue: options.positive ? undefined : BigInt(0),
    validation: { isRequired: options.positive },
    ...(options.positive || options.nonNegative
      ? {
          hooks: {
            validate: ({ resolvedData, fieldKey, addValidationError }) => {
              const value = resolvedData?.[fieldKey];
              if (value === null || value === undefined) return;
              const minimum = options.positive ? BigInt(1) : BigInt(0);
              if (value < minimum) {
                addValidationError(options.positive
                  ? "Amount must be greater than zero"
                  : "Amount cannot be negative");
              }
            },
          },
        }
      : {}),
    ...(options.immutable ? { access: { update: denyAll }, ui: { itemView: { fieldMode: "read" } } } : {}),
  });
}

export function companyTenantField(ref = "Company") {
  return relationship({
    ref,
    access: { create: denyAll, update: denyAll },
    ui: {
      createView: { fieldMode: "hidden" },
      itemView: { fieldMode: "read" },
    },
  });
}

export function readOnlyRelationshipMany(ref: string) {
  return relationship({
    ref,
    many: true,
    access: { create: denyAll, update: denyAll },
    ui: { createView: { fieldMode: "hidden" }, itemView: { fieldMode: "read" } },
  });
}

export function projectTenantField(ref: string) {
  return relationship({
    ref,
    access: { update: denyAll },
    ui: { itemView: { fieldMode: "read" } },
  });
}

export function ownedCompanyField(ref: string) {
  return relationship({
    ref,
    ui: { itemView: { fieldMode: "read" } },
    access: {
      update: denyAll,
      create: async ({ session, inputData, context }) => {
        const companyId = getConnectedId((inputData as Record<string, unknown>).company);
        if (!companyId || !session?.itemId) return false;
        return canAccessCompanyById(context, session.itemId, companyId, true);
      },
    },
  });
}

export const scopeOptions = CONSTRUCTION_SCOPES.map(scope => ({
  label: scope,
  value: scope,
})) satisfies { label: string; value: ConstructionScope }[];
