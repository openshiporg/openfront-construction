import seedData from "./seed.json";

import type { ConstructionOnboardingInput } from "@/features/keystone/mutations/onboarding";

/**
 * The realistic construction demo fixture, expressed as a normal onboarding
 * request so it can be provisioned through the same server-authoritative
 * `onboardConstructionWorkspace` mutation that the custom setup path uses.
 *
 * Everything here is clearly fictional sample data: the company, brand,
 * client, trade partner, project, public profile, and financial codes are
 * mock values with explicit demo labels. Nothing here is a real contractor,
 * owner, or job. The mutation seeds the sample drafts as fictional records.
 */
export const DEMO_FIXTURE_LABEL = "Fictional demo workspace";

export function buildDemoOnboardingInput(idempotencyKey: string): ConstructionOnboardingInput {
  return {
    fictionalFixture: true,
    companyName: seedData.company.name,
    companySlug: seedData.company.slug,
    legalName: `${seedData.company.name} LLC (fictional demo)`,
    brandName: seedData.company.name,
    brandMark: "NB",
    brandTagline: "Fictional sample construction workspace.",
    brandColor: "#1D4ED8",
    projectNumber: seedData.project.projectNumber,
    projectName: seedData.project.name,
    projectDescription: seedData.project.description,
    startDate: seedData.project.startDate,
    completionDate: seedData.project.completionDate,
    clientName: seedData.client.name,
    tradePartnerName: seedData.tradePartner.name,
    currencyCode: seedData.project.currencyCode,
    costCode: seedData.costCode.code,
    costCodeName: seedData.costCode.name,
    budgetCode: seedData.budgetCode.code,
    budgetCodeDescription: seedData.budgetCode.description,
    publicContactEmail: "contact@northstar.example.test",
    publicContactPhone: null,
    publicServiceArea: "Central Ohio",
    publicCapabilitySummary:
      "General contracting and preconstruction for fictional community facilities in this sample workspace.",
    primaryServiceName: "General contracting",
    primaryServiceSummary: "Scope review, estimating and coordination for fictional community construction projects.",
    publicPrivacyNotice:
      "This fictional sample workspace retains submitted details only to review and respond to the request.",
    publishFirstProject: true,
    publicProjectSummary:
      "A fictional community learning center with classrooms and public meeting facilities.",
    publicProjectMarket: "Community facilities",
    publicProjectLocation: "Central Ohio",
    idempotencyKey,
  };
}
