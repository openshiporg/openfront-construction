'use server';

import { platformClient, refusal } from "@/features/platform/lib/platform-client";
import type { CommandState } from "@/features/platform/projects/action-state";
import { amountToMinorUnits } from "@/features/platform/projects/money";
import { catalogTransitions, ownershipTypes, type CatalogKind } from "./lib/states";

function value(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function cost(raw: string): { minor: string | null; error?: string } {
  try { return { minor: amountToMinorUnits(raw.replace(/^\$/, "")) ?? "0" }; }
  catch { return { minor: null, error: "Cost must be an amount like 125.00" }; }
}

function equipmentFields(formData: FormData): { data: Record<string, string | null>; error?: string } {
  const hourly = cost(value(formData, "hourlyCost"));
  const ownershipType = value(formData, "ownershipType");
  const data = {
    name: value(formData, "name"), description: value(formData, "description") || null,
    equipmentType: value(formData, "equipmentType") || null, make: value(formData, "make") || null,
    model: value(formData, "model") || null, serialNumber: value(formData, "serialNumber") || null,
    ownershipType, hourlyCostMinor: hourly.minor,
  };
  if (!data.name) return { data, error: "Name is required" };
  if (!ownershipTypes.some(entry => entry.value === ownershipType)) return { data, error: "Choose who owns it" };
  if (hourly.error) return { data, error: hourly.error };
  return { data };
}

function materialFields(formData: FormData): { data: Record<string, string | null>; error?: string } {
  const standard = cost(value(formData, "standardCost"));
  const data = {
    name: value(formData, "name"), description: value(formData, "description") || null,
    unit: value(formData, "unit"), manufacturer: value(formData, "manufacturer") || null,
    modelNumber: value(formData, "modelNumber") || null, standardCostMinor: standard.minor,
  };
  if (!data.name) return { data, error: "Name is required" };
  if (!data.unit) return { data, error: "Unit is required" };
  if (standard.error) return { data, error: standard.error };
  return { data };
}

export async function saveEquipmentAction(_previous: CommandState, formData: FormData): Promise<CommandState> {
  const id = value(formData, "id");
  const { data, error } = equipmentFields(formData);
  if (error) return { status: "error", message: error };
  if (id) {
    const response = await platformClient(`mutation UpdateEquipment($id: ID!, $data: EquipmentUpdateInput!) { updateEquipment(where: { id: $id }, data: $data) { id } }`, { id, data });
    return response.success ? { status: "success", message: "Saved", itemId: id } : { status: "error", message: refusal(response, "Changes not saved") };
  }
  const companyId = value(formData, "companyId");
  const equipmentNumber = value(formData, "equipmentNumber").toUpperCase();
  if (!companyId) return { status: "error", message: "Company is required" };
  if (!equipmentNumber) return { status: "error", message: "Unit number is required" };
  const duplicate = await platformClient<{ equipmentItemsCount: number }>(`
    query DuplicateEquipment($companyId: ID!, $number: String!) { equipmentItemsCount(where: { company: { id: { equals: $companyId } }, equipmentNumber: { equals: $number, mode: insensitive } }) }
  `, { companyId, number: equipmentNumber });
  if (duplicate.success && duplicate.data.equipmentItemsCount > 0) return { status: "error", message: `${equipmentNumber} already exists` };
  const response = await platformClient<{ createEquipment: { id: string } }>(`mutation CreateEquipment($data: EquipmentCreateInput!) { createEquipment(data: $data) { id } }`, {
    data: { ...data, equipmentNumber, status: "available", currencyCode: "USD", company: { connect: { id: companyId } } },
  });
  return response.success ? { status: "success", message: `${equipmentNumber} added`, itemId: response.data.createEquipment.id } : { status: "error", message: refusal(response, "Equipment not saved") };
}

export async function saveMaterialAction(_previous: CommandState, formData: FormData): Promise<CommandState> {
  const id = value(formData, "id");
  const { data, error } = materialFields(formData);
  if (error) return { status: "error", message: error };
  if (id) {
    const response = await platformClient(`mutation UpdateMaterial($id: ID!, $data: MaterialUpdateInput!) { updateMaterial(where: { id: $id }, data: $data) { id } }`, { id, data });
    return response.success ? { status: "success", message: "Saved", itemId: id } : { status: "error", message: refusal(response, "Changes not saved") };
  }
  const companyId = value(formData, "companyId");
  const sku = value(formData, "sku").toUpperCase();
  if (!companyId) return { status: "error", message: "Company is required" };
  if (!sku) return { status: "error", message: "SKU is required" };
  const duplicate = await platformClient<{ materialsCount: number }>(`
    query DuplicateMaterial($companyId: ID!, $sku: String!) { materialsCount(where: { company: { id: { equals: $companyId } }, sku: { equals: $sku, mode: insensitive } }) }
  `, { companyId, sku });
  if (duplicate.success && duplicate.data.materialsCount > 0) return { status: "error", message: `${sku} already exists` };
  const response = await platformClient<{ createMaterial: { id: string } }>(`mutation CreateMaterial($data: MaterialCreateInput!) { createMaterial(data: $data) { id } }`, {
    data: { ...data, sku, isActive: "active", currencyCode: "USD", company: { connect: { id: companyId } } },
  });
  return response.success ? { status: "success", message: `${sku} added`, itemId: response.data.createMaterial.id } : { status: "error", message: refusal(response, "Material not saved") };
}

export async function transitionCatalogItemAction(_previous: CommandState, formData: FormData): Promise<CommandState> {
  const kind = value(formData, "kind") as CatalogKind;
  const id = value(formData, "id");
  const from = value(formData, "from");
  const to = value(formData, "to");
  const moves = catalogTransitions[kind]?.[from] ?? [];
  if (!id || !moves.includes(to)) return { status: "error", message: "That status change is not allowed" };
  const response = kind === "equipment"
    ? await platformClient(`mutation EquipmentStatus($id: ID!, $status: EquipmentStatusType!) { updateEquipment(where: { id: $id }, data: { status: $status }) { id } }`, { id, status: to })
    : await platformClient(`mutation MaterialStatus($id: ID!, $status: MaterialIsActiveType!) { updateMaterial(where: { id: $id }, data: { isActive: $status }) { id } }`, { id, status: to });
  return response.success ? { status: "success", message: "Status updated", itemId: id } : { status: "error", message: refusal(response, "Status not changed") };
}
