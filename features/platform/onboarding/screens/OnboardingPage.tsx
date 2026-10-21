import Link from "next/link";

import { PageContainer } from "@/features/dashboard/components/PageContainer";
import { loadOnboardingReadiness } from "../actions/onboarding";
import { OnboardingSetup } from "../components/OnboardingSetup";
import { ReadinessChecklist } from "../components/ReadinessChecklist";

export async function OnboardingPage() {
  const readiness = await loadOnboardingReadiness();
  return (
    <PageContainer
      title="Setup"
      breadcrumbs={[{ type: "link", label: "Portfolio", href: "/dashboard/platform/portfolio" }, { type: "page", label: "Setup" }]}
      header={<div><p className="text-xs font-medium text-muted-foreground">Onboarding</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Setup</h1></div>}
    >
      <section className="px-4 py-7 md:px-6">
        {!readiness ? <p role="alert">Setup status is unavailable. Try again.</p>
          : readiness.canStartFirstCompany ? <div className="rounded-lg border"><OnboardingSetup sampleAvailable={readiness.sampleWorkspaceAvailable} /></div>
          : readiness.companies.length > 0 ? <ReadinessChecklist companies={readiness.companies} />
          : readiness.projectOnly ? <p>Your project access is managed by your company administrator. <Link className="inline-flex min-h-11 items-center underline" href="/dashboard/platform/projects">Open projects</Link></p>
          : <p>Workspace setup is available to company administrators.</p>}
      </section>
    </PageContainer>
  );
}
