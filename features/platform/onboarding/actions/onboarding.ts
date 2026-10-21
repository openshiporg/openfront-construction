'use server';

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { keystoneClient } from "@/features/dashboard/lib/keystoneClient";
import { buildDemoOnboardingInput } from "../lib/demo-fixture";
import type { CommandState } from "@/features/platform/projects/action-state";
import type { ConstructionOnboardingReadiness } from "@/features/keystone/queries/onboarding-readiness";

/** Canonical onboarding dismissal, scoped to the authenticated actor. */
export async function dismissOnboarding() {
  const actor = await keystoneClient<{ authenticatedItem: { id: string } | null }>(`query { authenticatedItem { ... on User { id } } }`);
  if (!actor.success || !actor.data.authenticatedItem?.id) return { success: false, error: "Sign in to continue" };
  const response = await keystoneClient(`mutation($id: ID!) { updateUser(where: { id: $id }, data: { onboardingStatus: dismissed }) { id } }`, { id: actor.data.authenticatedItem.id });
  if (!response.success) return { success: false, error: response.error };
  revalidatePath("/dashboard", "layout");
  return { success: true };
}

const checkFields = "key label complete detail href required";

/** Actor-scoped setup readiness for the setup page and onboarding dialog. */
export async function loadOnboardingReadiness(): Promise<ConstructionOnboardingReadiness | null> {
  const response = await keystoneClient<{ constructionOnboardingReadiness: ConstructionOnboardingReadiness }>(`
    query ConstructionOnboardingReadiness {
      constructionOnboardingReadiness {
        canStartFirstCompany sampleWorkspaceAvailable projectOnly
        companies { companyId name checks { ${checkFields} } projects { projectId name checks { ${checkFields} } } }
      }
    }
  `);
  return response.success ? response.data.constructionOnboardingReadiness : null;
}

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Loads the realistic, clearly-fictional construction demo fixture through the
 * exact same server-authoritative `onboardConstructionWorkspace` mutation the
 * custom setup path uses. There is no separate seed mutation or unrestricted
 * database path: session, tenant, project, and financial boundaries are the
 * mutation's own. The result is explicitly labeled as demo/mock data.
 */
export async function loadDemoFixtureAction(
  _previous: CommandState,
  formData: FormData,
): Promise<CommandState> {
  const input = buildDemoOnboardingInput(
    value(formData, "idempotencyKey") || randomUUID(),
  );
  const response = await keystoneClient<{ onboardConstructionWorkspace: { replayed: boolean; projectId: string } }>(`
    mutation OnboardConstructionWorkspace($input: ConstructionOnboardingInput!) {
      onboardConstructionWorkspace(input: $input) { success companyId projectId actionId replayed }
    }
  `, { input });
  if (!response.success) return { status: "error", message: response.error };
  revalidatePath("/dashboard", "layout");
  return {
    status: "success",
    message: "Sample workspace ready",
    itemId: response.data.onboardConstructionWorkspace.projectId,
  };
}

export async function onboardConstructionWorkspaceAction(
  _previous: CommandState,
  formData: FormData,
): Promise<CommandState> {
  const companyName = value(formData, "companyName");
  const input = {
    companyName,
    companySlug: value(formData, "companySlug"),
    legalName: value(formData, "legalName") || null,
    brandName: value(formData, "brandName") || companyName,
    brandMark: value(formData, "brandMark"),
    brandTagline: value(formData, "brandTagline") || null,
    brandColor: value(formData, "brandColor") || "#1D4ED8",
    projectNumber: value(formData, "projectNumber"),
    projectName: value(formData, "projectName"),
    projectDescription: value(formData, "projectDescription") || null,
    startDate: value(formData, "startDate") || null,
    completionDate: value(formData, "completionDate") || null,
    clientName: value(formData, "clientName") || null,
    tradePartnerName: value(formData, "tradePartnerName") || null,
    currencyCode: value(formData, "currencyCode") || "USD",
    costCode: value(formData, "costCode"),
    costCodeName: value(formData, "costCodeName"),
    budgetCode: value(formData, "budgetCode"),
    budgetCodeDescription: value(formData, "budgetCodeDescription"),
    publicContactEmail: value(formData, "publicContactEmail"),
    publicContactPhone: value(formData, "publicContactPhone") || null,
    publicServiceArea: value(formData, "publicServiceArea"),
    publicCapabilitySummary: value(formData, "publicCapabilitySummary"),
    primaryServiceName: value(formData, "primaryServiceName"),
    primaryServiceSummary: value(formData, "primaryServiceSummary"),
    publicPrivacyNotice: value(formData, "publicPrivacyNotice"),
    publishFirstProject: formData.get("publishFirstProject") === "on",
    publicProjectSummary: value(formData, "publicProjectSummary") || null,
    publicProjectMarket: value(formData, "publicProjectMarket") || null,
    publicProjectLocation: value(formData, "publicProjectLocation") || null,
    idempotencyKey: value(formData, "idempotencyKey") || randomUUID(),
  };
  const response = await keystoneClient<{ onboardConstructionWorkspace: { replayed: boolean; projectId: string } }>(`
    mutation OnboardConstructionWorkspace($input: ConstructionOnboardingInput!) {
      onboardConstructionWorkspace(input: $input) { success companyId projectId actionId replayed }
    }
  `, { input });
  if (!response.success) return { status: "error", message: response.error };
  revalidatePath("/dashboard", "layout");
  return {
    status: "success",
    message: "Workspace ready",
    itemId: response.data.onboardConstructionWorkspace.projectId,
  };
}
