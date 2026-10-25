import seedData from "./seed.json";

import type { ConstructionOnboardingInput } from "@/features/keystone/mutations/onboarding";

/**
 * The realistic construction demo fixture, expressed as a normal onboarding
 * request so it can be provisioned through the same server-authoritative
 * `onboardConstructionWorkspace` mutation that the custom setup path uses.
 *
 * Everything here is clearly fictional sample data: the company, brand,
 * client, trade partner, project, public profile, services, portfolio and
 * financial codes are invented. Nothing here is a real contractor, owner, or
 * job: the company is stored with isDemo, its legal name says so, and the
 * public capability summary and privacy notice state it in plain language.
 * The mutation seeds the sample drafts, the remaining public services and the
 * past-project portfolio (from seed.json, server side) as fictional records.
 */
export const DEMO_FIXTURE_LABEL = "Fictional demo workspace";

export function buildDemoOnboardingInput(idempotencyKey: string): ConstructionOnboardingInput {
  return {
    fictionalFixture: true,
    companyName: seedData.company.name,
    companySlug: seedData.company.slug,
    legalName: `${seedData.company.name} LLC (fictional demo)`,
    brandName: seedData.company.name,
    brandMark: seedData.company.brandMark,
    brandTagline: seedData.company.brandTagline,
    brandColor: seedData.company.brandColor,
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
    publicContactEmail: seedData.publicSite.contactEmail,
    publicContactPhone: seedData.publicSite.contactPhone,
    publicServiceArea: seedData.publicSite.serviceArea,
    publicCapabilitySummary: seedData.publicSite.capabilitySummary,
    primaryServiceName: seedData.services[0].name,
    primaryServiceSummary: seedData.services[0].summary,
    publicPrivacyNotice: seedData.publicSite.privacyNotice,
    publishFirstProject: true,
    publicProjectSummary: seedData.project.publicSummary,
    publicProjectMarket: seedData.project.publicMarket,
    publicProjectLocation: seedData.project.publicLocation,
    idempotencyKey,
  };
}
