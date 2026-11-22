'use server';

import { revalidatePath } from "next/cache";
import { platformClient, refusal } from "@/features/platform/lib/platform-client";
import type { CommandState } from "@/features/platform/projects/action-state";
import { amountToMinorUnits } from "@/features/platform/projects/money";

const value = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();
/** A calendar date from <input type="date">, stored at midday UTC so it reads as the same day everywhere. Blank clears it. */
const dateValue = (formData: FormData, key: string) => {
  const raw = value(formData, key);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00.000Z` : null;
};

const opportunityStages = ["qualifying", "go_no_go", "estimating", "submitted", "negotiating", "won", "lost", "declined"];
const leadStatuses = ["new", "qualified", "nurturing", "converted", "disqualified"];

export async function updatePursuitAction(_previous: CommandState, formData: FormData): Promise<CommandState> {
  const id = value(formData, "id");
  const stage = value(formData, "stage");
  if (!id) return { status: "error", message: "Pursuit is missing" };
  if (!opportunityStages.includes(stage)) return { status: "error", message: "Choose a stage" };
  const percent = Number(value(formData, "probability") || "0");
  if (!Number.isInteger(percent) || percent < 0 || percent > 100) return { status: "error", message: "Win probability must be a whole percent from 0 to 100" };
  let estimatedValueMinor: string | null;
  try {
    estimatedValueMinor = amountToMinorUnits(value(formData, "estimatedValue").replace(/^\$/, ""));
  } catch {
    return { status: "error", message: "Estimated value must be a dollar amount, like 1,250,000" };
  }
  const response = await platformClient(`mutation UpdatePursuit($id: ID!, $data: ConstructionOpportunityUpdateInput!) { updateConstructionOpportunity(where: { id: $id }, data: $data) { id } }`, {
    id,
    data: {
      stage, probabilityBps: percent * 100, estimatedValueMinor: estimatedValueMinor ?? "0",
      targetBidDate: dateValue(formData, "targetBidDate"), nextActionAt: dateValue(formData, "nextActionAt"),
      notes: value(formData, "notes"),
    },
  });
  if (!response.success) return { status: "error", message: refusal(response, "Pursuit not saved. Won pursuits are closed and some stage moves are not allowed.") };
  revalidatePath(`/dashboard/platform/pipeline/${id}`);
  return { status: "success", message: "Saved" };
}

export async function updateLeadAction(_previous: CommandState, formData: FormData): Promise<CommandState> {
  const id = value(formData, "id");
  const status = value(formData, "status");
  if (!id) return { status: "error", message: "Lead is missing" };
  if (!leadStatuses.includes(status)) return { status: "error", message: "Choose a status" };
  const phone = value(formData, "phone");
  if (phone.length > 50) return { status: "error", message: "Phone is too long" };
  const response = await platformClient(`mutation UpdateLead($id: ID!, $data: ConstructionLeadUpdateInput!) { updateConstructionLead(where: { id: $id }, data: $data) { id } }`, {
    id,
    data: { status, phone, organization: value(formData, "organization").slice(0, 240), nextActionAt: dateValue(formData, "nextActionAt"), notes: value(formData, "notes") },
  });
  if (!response.success) return { status: "error", message: refusal(response, "Lead not saved. Converted leads are closed.") };
  revalidatePath(`/dashboard/platform/pipeline/leads/${id}`);
  return { status: "success", message: "Saved" };
}
