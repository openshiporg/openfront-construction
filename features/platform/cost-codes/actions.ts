'use server';

import { keystoneClient } from "@/features/dashboard/lib/keystoneClient";
import type { CommandState } from "@/features/platform/projects/action-state";

function value(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function describe(formData: FormData): { data: { name: string; division: string | null; description: string | null }; error?: string } {
  const data = { name: value(formData, "name"), division: value(formData, "division") || null, description: value(formData, "description") || null };
  if (!data.name) return { data, error: "Name is required" };
  if (data.name.length > 200) return { data, error: "Name must be 200 characters or fewer" };
  if ((data.division ?? "").length > 120) return { data, error: "Division must be 120 characters or fewer" };
  return { data };
}

export async function createCostCodeAction(_previous: CommandState, formData: FormData): Promise<CommandState> {
  const companyId = value(formData, "companyId");
  const code = value(formData, "code").toUpperCase();
  const { data, error } = describe(formData);
  if (!companyId) return { status: "error", message: "Company is required" };
  if (!code) return { status: "error", message: "Code is required" };
  if (code.length > 40) return { status: "error", message: "Code must be 40 characters or fewer" };
  if (error) return { status: "error", message: error };
  const duplicate = await keystoneClient<{ costCodesCount: number }>(`
    query DuplicateCostCode($companyId: ID!, $code: String!) {
      costCodesCount(where: { company: { id: { equals: $companyId } }, code: { equals: $code, mode: insensitive } })
    }
  `, { companyId, code });
  if (duplicate.success && duplicate.data.costCodesCount > 0) return { status: "error", message: `${code} already exists` };
  const response = await keystoneClient<{ createCostCode: { id: string } }>(`
    mutation CreateCostCode($data: CostCodeCreateInput!) { createCostCode(data: $data) { id } }
  `, { data: { ...data, code, isActive: true, company: { connect: { id: companyId } } } });
  if (!response.success) return { status: "error", message: "Cost code not saved" };
  return { status: "success", message: `${code} added`, itemId: response.data.createCostCode.id };
}

export async function updateCostCodeAction(_previous: CommandState, formData: FormData): Promise<CommandState> {
  const id = value(formData, "id");
  const { data, error } = describe(formData);
  if (!id) return { status: "error", message: "Cost code is missing" };
  if (error) return { status: "error", message: error };
  const response = await keystoneClient(`
    mutation UpdateCostCode($id: ID!, $data: CostCodeUpdateInput!) { updateCostCode(where: { id: $id }, data: $data) { id } }
  `, { id, data });
  if (!response.success) return { status: "error", message: "Changes not saved" };
  return { status: "success", message: "Saved", itemId: id };
}

export async function setCostCodeActiveAction(_previous: CommandState, formData: FormData): Promise<CommandState> {
  const id = value(formData, "id");
  const active = value(formData, "active") === "true";
  if (!id) return { status: "error", message: "Cost code is missing" };
  const response = await keystoneClient(`
    mutation SetCostCodeActive($id: ID!, $active: Boolean!) { updateCostCode(where: { id: $id }, data: { isActive: $active }) { id } }
  `, { id, active });
  if (!response.success) return { status: "error", message: "Status not changed" };
  return { status: "success", message: active ? "Reactivated" : "Deactivated", itemId: id };
}
