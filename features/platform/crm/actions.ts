'use server';

import { platformClient, refusal } from "@/features/platform/lib/platform-client";
import type { CommandState } from "@/features/platform/projects/action-state";
import { amountToMinorUnits } from "@/features/platform/projects/money";
import { deliveryMethods, openStages } from "./lib";

function value(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** A calendar date from <input type="date">, stored at midday UTC so it reads as the same day everywhere. */
function dateValue(formData: FormData, key: string): string | null {
  const raw = value(formData, key);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00.000Z` : null;
}

export async function createOpportunityAction(_previous: CommandState, formData: FormData): Promise<CommandState> {
  const companyId = value(formData, "companyId");
  const number = value(formData, "number");
  const name = value(formData, "name");
  const stage = value(formData, "stage") || "qualifying";
  const deliveryMethod = value(formData, "deliveryMethod");
  const clientId = value(formData, "clientId");
  const probability = value(formData, "probability");
  if (!companyId) return { status: "error", message: "Company is required" };
  if (!number || number.length > 80) return { status: "error", message: "Enter a pursuit number (80 characters or fewer)" };
  if (!name || name.length > 240) return { status: "error", message: "Enter a pursuit name (240 characters or fewer)" };
  if (!openStages.some(entry => entry.value === stage)) return { status: "error", message: "Choose a stage" };
  if (deliveryMethod && !(deliveryMethods as readonly string[]).includes(deliveryMethod)) return { status: "error", message: "Choose a delivery method" };
  let estimatedValueMinor: string | null;
  try {
    estimatedValueMinor = amountToMinorUnits(value(formData, "estimatedValue").replace(/^\$/, ""));
  } catch {
    return { status: "error", message: "Estimated value must be a dollar amount, like 1,250,000" };
  }
  const percent = probability ? Number(probability) : 0;
  if (!Number.isInteger(percent) || percent < 0 || percent > 100) return { status: "error", message: "Win probability must be a whole percent from 0 to 100" };
  const targetBidDate = dateValue(formData, "targetBidDate");
  const expectedAwardDate = dateValue(formData, "expectedAwardDate");
  if (targetBidDate && expectedAwardDate && expectedAwardDate < targetBidDate) return { status: "error", message: "Expected award must be on or after the bid date" };

  const context = await platformClient<{ authenticatedItem: { id: string } | null; constructionOpportunitiesCount: number }>(`
    query PursuitContext($companyId: ID!, $number: String!) {
      authenticatedItem { ... on User { id } }
      constructionOpportunitiesCount(where: { company: { id: { equals: $companyId } }, number: { equals: $number, mode: insensitive } })
    }
  `, { companyId, number });
  if (!context.success) return { status: "error", message: context.error };
  if (context.data.constructionOpportunitiesCount > 0) return { status: "error", message: `${number} is already in the pipeline` };
  const ownerId = context.data.authenticatedItem?.id;

  const response = await platformClient<{ createConstructionOpportunity: { id: string } }>(`
    mutation CreatePursuit($data: ConstructionOpportunityCreateInput!) { createConstructionOpportunity(data: $data) { id } }
  `, { data: {
    number, name, stage,
    organization: value(formData, "organization"),
    deliveryMethod,
    locationSummary: value(formData, "locationSummary"),
    estimatedValueMinor: estimatedValueMinor ?? "0",
    currencyCode: "USD",
    probabilityBps: percent * 100,
    targetBidDate, expectedAwardDate,
    nextActionAt: dateValue(formData, "nextActionAt"),
    notes: value(formData, "notes"),
    company: { connect: { id: companyId } },
    ...(clientId ? { client: { connect: { id: clientId } } } : {}),
    ...(ownerId ? { owner: { connect: { id: ownerId } } } : {}),
  } });
  if (!response.success) return { status: "error", message: refusal(response, "Pursuit not saved") };
  return { status: "success", message: "Pursuit added", itemId: response.data.createConstructionOpportunity.id };
}
