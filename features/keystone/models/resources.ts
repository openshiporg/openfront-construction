import { list } from "@keystone-6/core";
import { denyAll } from "@keystone-6/core/access";
import {
  decimal,
  relationship,
  select,
  text,
  timestamp,
} from "@keystone-6/core/fields";

import { companyModelAccess, controlledProjectModelAccess, type AccessArgs } from "../access";
import { resourceAuthority, resourceReadFilter, validateResourceFact } from "../domain/resource-activity";
import type { CommandContext } from "../mutations/construction";
import type { ValidationHookArgs } from "../domain/hooks";
import { getConnectedId, projectTenantHooks } from "../domain/tenancy";
import {
  companyTenantField,
  currencyCodeField,
  moneyField,
  ownedCompanyField,
  projectTenantField,
} from "./fields";
import { trackingFields } from "./trackingFields";

const fieldAccess = () =>
  controlledProjectModelAccess("canReadFieldOperations", "canManageFieldOperations");
const resourceCatalogAccess = () =>
  companyModelAccess("canReadFieldOperations", "canManageFieldOperations", { delete: false });

export const LaborEntry = list({
  access: fieldAccess(),
  hooks: projectTenantHooks(),
  ui: { listView: { initialColumns: ["workDate", "workerName", "regularHours", "overtimeHours", "budgetCode"] } },
  fields: {
    workDate: timestamp({ validation: { isRequired: true } }),
    workerName: text({ validation: { isRequired: true, length: { min: 1, max: 200 } } }),
    employeeNumber: text(),
    laborType: select({
      type: "enum",
      options: [
        { label: "Employee", value: "employee" },
        { label: "Temporary", value: "temporary" },
        { label: "Subcontractor", value: "subcontractor" },
      ],
      defaultValue: "employee",
      validation: { isRequired: true },
    }),
    regularHours: decimal({ precision: 8, scale: 2, defaultValue: "0" }),
    overtimeHours: decimal({ precision: 8, scale: 2, defaultValue: "0" }),
    doubleTimeHours: decimal({ precision: 8, scale: 2, defaultValue: "0" }),
    hourlyRateMinor: moneyField({ nonNegative: true }),
    totalCostMinor: moneyField({ nonNegative: true }),
    currencyCode: currencyCodeField(),
    notes: text({ ui: { displayMode: "textarea" } }),
    worker: relationship({ ref: "User" }),
    tradePartner: relationship({ ref: "TradePartner" }),
    budgetCode: relationship({ ref: "BudgetCode.laborEntries" }),
    dailyLog: relationship({ ref: "DailyLog" }),
    scheduleTask: relationship({ ref: "ScheduleTask" }),
    approvedBy: relationship({ ref: "User" }),
    approvedAt: timestamp(),
    company: companyTenantField(),
    project: projectTenantField("Project.laborEntries"),
    ...trackingFields,
  },
});

export const Equipment = list({
  access: resourceCatalogAccess(),
  graphql: { plural: "EquipmentItems" },
  // "Equipment" is uncountable, and the shared dashboard derives GraphQL names
  // from this Admin Meta plural label, so it must name the EquipmentItems plural.
  ui: { plural: "Equipment Items", listView: { initialColumns: ["equipmentNumber", "name", "status", "ownershipType", "company"] } },
  fields: {
    equipmentNumber: text({ validation: { isRequired: true, length: { min: 1, max: 100 } } }),
    name: text({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    description: text({ ui: { displayMode: "textarea" } }),
    equipmentType: text({ validation: { length: { max: 120 } } }),
    make: text(),
    model: text(),
    serialNumber: text(),
    ownershipType: select({
      type: "enum",
      options: [
        { label: "Owned", value: "owned" },
        { label: "Leased", value: "leased" },
        { label: "Rented", value: "rented" },
        { label: "Partner", value: "partner" },
      ],
      defaultValue: "owned",
      validation: { isRequired: true },
    }),
    status: select({
      type: "enum",
      options: [
        { label: "Available", value: "available" },
        { label: "In Use", value: "in_use" },
        { label: "Out of Service", value: "out_of_service" },
        { label: "Retired", value: "retired" },
      ],
      defaultValue: "available",
      validation: { isRequired: true },
    }),
    hourlyCostMinor: moneyField({ nonNegative: true }),
    currencyCode: currencyCodeField(),
    company: ownedCompanyField("Company.equipment"),
    logs: relationship({ ref: "ResourceLog.equipment", many: true, access: { create: denyAll, update: denyAll } }),
    ...trackingFields,
  },
});

export const Material = list({
  access: resourceCatalogAccess(),
  ui: { listView: { initialColumns: ["sku", "name", "unit", "standardCostMinor", "company"] } },
  fields: {
    sku: text({ validation: { isRequired: true, length: { min: 1, max: 100 } } }),
    name: text({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    description: text({ ui: { displayMode: "textarea" } }),
    unit: text({ validation: { isRequired: true, length: { min: 1, max: 40 } } }),
    standardCostMinor: moneyField({ nonNegative: true }),
    currencyCode: currencyCodeField(),
    manufacturer: text(),
    modelNumber: text(),
    isActive: select({
      type: "enum",
      options: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
        { label: "Discontinued", value: "discontinued" },
      ],
      defaultValue: "active",
      validation: { isRequired: true },
    }),
    company: ownedCompanyField("Company.materials"),
    logs: relationship({ ref: "ResourceLog.material", many: true, access: { create: denyAll, update: denyAll } }),
    procurementRequestLines: relationship({ ref: "ProcurementRequestLine.material", many: true, access: { create: denyAll, update: denyAll } }),
    ...trackingFields,
  },
});

export async function validateResourceLog(args: ValidationHookArgs) {
  if (args.operation === "update") {
    args.addValidationError("Resource facts are append-only; a linked controlled correction is required, not an edit");
    return;
  }
  try { validateResourceFact(args.resolvedData.resourceType, args.resolvedData.eventType, String(args.resolvedData.quantity ?? "0"), args.resolvedData.unit); }
  catch (error) { args.addValidationError(error instanceof Error ? error.message : "Invalid resource fact"); }
  const commandContext = args.context as CommandContext;
  const actorId = getConnectedId(args.resolvedData.operator);
  const projectId = getConnectedId(args.resolvedData.project);
  if (!actorId || actorId !== commandContext.session?.itemId || !projectId) {
    args.addValidationError("Resource facts require the authenticated operator and selected project");
  } else {
    try { await resourceAuthority(commandContext, projectId, true); }
    catch { args.addValidationError("Resource activity not authorized for the current project role"); }
  }
  const type = args.resolvedData.resourceType ?? args.item?.resourceType;
  const currentEquipmentId = typeof args.item?.equipmentId === "string" ? args.item.equipmentId : null;
  const currentMaterialId = typeof args.item?.materialId === "string" ? args.item.materialId : null;
  const equipmentId = getConnectedId(args.resolvedData.equipment) ?? currentEquipmentId;
  const materialId = getConnectedId(args.resolvedData.material) ?? currentMaterialId;
  if (type === "equipment" && (!equipmentId || materialId)) {
    args.addValidationError("Equipment logs require equipment and cannot reference material");
  }
  if (type === "material" && (!materialId || equipmentId)) {
    args.addValidationError("Material logs require material and cannot reference equipment");
  }
}

export const ResourceLog = list({
  access: {
    ...fieldAccess(),
    filter: { query: async ({ session, context }: AccessArgs) => {
      const native = fieldAccess().filter.query({ session });
      if (!context || native === false) return false;
      const live = await resourceReadFilter({ session, sudo: () => context.sudo() } as CommandContext);
      return live === false ? false : { AND: [native, live] };
    } },
  },
  hooks: {
    ...projectTenantHooks(),
    validate: {
      create: validateResourceLog, update: validateResourceLog,
      delete: ({ addValidationError }) => { addValidationError("Resource facts are retained; deletion is not a correction"); },
    },
  },
  ui: { listView: { initialColumns: ["occurredAt", "resourceType", "eventType", "equipment", "material", "quantity"] } },
  fields: {
    resourceType: select({
      type: "enum",
      options: [
        { label: "Equipment", value: "equipment" },
        { label: "Material", value: "material" },
      ],
      validation: { isRequired: true },
    }),
    eventType: select({
      type: "enum",
      options: [
        { label: "Equipment Use", value: "equipment_use" },
        { label: "Equipment Idle", value: "equipment_idle" },
        { label: "Equipment Breakdown", value: "equipment_breakdown" },
        { label: "Material Received", value: "material_received" },
        { label: "Material Installed", value: "material_installed" },
        { label: "Material Transferred", value: "material_transferred" },
        { label: "Material Wasted", value: "material_wasted" },
      ],
      validation: { isRequired: true },
    }),
    occurredAt: timestamp({ validation: { isRequired: true }, defaultValue: { kind: "now" } }),
    endedAt: timestamp(),
    quantity: decimal({ precision: 18, scale: 4, defaultValue: "0" }),
    unit: text({ validation: { length: { max: 40 } } }),
    unitCostMinor: moneyField(),
    totalCostMinor: moneyField(),
    currencyCode: currencyCodeField(),
    notes: text({ ui: { displayMode: "textarea" } }),
    equipment: relationship({ ref: "Equipment.logs" }),
    material: relationship({ ref: "Material.logs" }),
    budgetCode: relationship({ ref: "BudgetCode.resourceLogs" }),
    dailyLog: relationship({ ref: "DailyLog" }),
    location: relationship({ ref: "ProjectLocation" }),
    operator: relationship({ ref: "User" }),
    tradePartner: relationship({ ref: "TradePartner" }),
    company: companyTenantField(),
    project: projectTenantField("Project.resourceLogs"),
    ...trackingFields,
  },
});
