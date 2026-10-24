'use server';

import { keystoneClient } from "@/features/dashboard/lib/keystoneClient";
import type { CommandState } from "@/features/platform/projects/action-state";
import { costTypes, locationTypes } from "./lib";

function value(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function createBudgetCodeAction(_previous: CommandState, formData: FormData): Promise<CommandState> {
  const projectId = value(formData, "projectId");
  const code = value(formData, "code").toUpperCase();
  const description = value(formData, "description");
  const costType = value(formData, "costType");
  const costCodeId = value(formData, "costCodeId");
  if (!projectId) return { status: "error", message: "Project is missing" };
  if (!code || code.length > 80) return { status: "error", message: "Code is required (80 characters or fewer)" };
  if (!description || description.length > 240) return { status: "error", message: "Description is required (240 characters or fewer)" };
  if (!costTypes.some(entry => entry.value === costType)) return { status: "error", message: "Choose a cost type" };
  if (!costCodeId) return { status: "error", message: "Choose a company cost code" };
  const duplicate = await keystoneClient<{ budgetCodesCount: number }>(`
    query DuplicateBudgetCode($projectId: ID!, $code: String!) { budgetCodesCount(where: { project: { id: { equals: $projectId } }, code: { equals: $code, mode: insensitive } }) }
  `, { projectId, code });
  if (duplicate.success && duplicate.data.budgetCodesCount > 0) return { status: "error", message: `${code} already exists on this project` };
  const response = await keystoneClient<{ createBudgetCode: { id: string } }>(`
    mutation CreateBudgetCode($data: BudgetCodeCreateInput!) { createBudgetCode(data: $data) { id } }
  `, { data: { code, description, costType, isActive: true, costCode: { connect: { id: costCodeId } }, project: { connect: { id: projectId } } } });
  if (!response.success) return { status: "error", message: "Budget code not saved" };
  return { status: "success", message: `${code} added`, itemId: response.data.createBudgetCode.id };
}

export async function setBudgetCodeActiveAction(_previous: CommandState, formData: FormData): Promise<CommandState> {
  const id = value(formData, "id");
  const active = value(formData, "active") === "true";
  if (!id) return { status: "error", message: "Budget code is missing" };
  const response = await keystoneClient(`
    mutation SetBudgetCodeActive($id: ID!, $active: Boolean!) { updateBudgetCode(where: { id: $id }, data: { isActive: $active }) { id } }
  `, { id, active });
  if (!response.success) return { status: "error", message: "Status not changed" };
  return { status: "success", message: active ? "Reactivated" : "Deactivated", itemId: id };
}

export async function createLocationAction(_previous: CommandState, formData: FormData): Promise<CommandState> {
  const projectId = value(formData, "projectId");
  const code = value(formData, "code").toUpperCase();
  const name = value(formData, "name");
  const locationType = value(formData, "locationType");
  const parentId = value(formData, "parentId");
  if (!projectId) return { status: "error", message: "Project is missing" };
  if (!code || code.length > 80) return { status: "error", message: "Code is required (80 characters or fewer)" };
  if (!name || name.length > 200) return { status: "error", message: "Name is required (200 characters or fewer)" };
  if (!locationTypes.some(entry => entry.value === locationType)) return { status: "error", message: "Choose a location type" };
  const duplicate = await keystoneClient<{ projectLocationsCount: number }>(`
    query DuplicateLocation($projectId: ID!, $code: String!) { projectLocationsCount(where: { project: { id: { equals: $projectId } }, code: { equals: $code, mode: insensitive } }) }
  `, { projectId, code });
  if (duplicate.success && duplicate.data.projectLocationsCount > 0) return { status: "error", message: `${code} already exists on this project` };
  const response = await keystoneClient<{ createProjectLocation: { id: string } }>(`
    mutation CreateProjectLocation($data: ProjectLocationCreateInput!) { createProjectLocation(data: $data) { id } }
  `, { data: { code, name, locationType, project: { connect: { id: projectId } }, ...(parentId ? { parent: { connect: { id: parentId } } } : {}) } });
  if (!response.success) return { status: "error", message: "Location not saved" };
  return { status: "success", message: `${code} added`, itemId: response.data.createProjectLocation.id };
}

export async function renameLocationAction(_previous: CommandState, formData: FormData): Promise<CommandState> {
  const id = value(formData, "id");
  const name = value(formData, "name");
  if (!id) return { status: "error", message: "Location is missing" };
  if (!name || name.length > 200) return { status: "error", message: "Name is required (200 characters or fewer)" };
  const response = await keystoneClient(`
    mutation RenameLocation($id: ID!, $name: String!) { updateProjectLocation(where: { id: $id }, data: { name: $name }) { id } }
  `, { id, name });
  if (!response.success) return { status: "error", message: "Name not saved" };
  return { status: "success", message: "Saved", itemId: id };
}
