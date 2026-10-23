import { ClipboardCheck } from "lucide-react";

import { EmptyState, PageHeader, PillLink, PlatformPage, Track } from "@/features/platform/components/kit";
import { loadOnboardingReadiness } from "../actions/onboarding";
import { OnboardingSetup } from "../components/OnboardingSetup";
import { ReadinessChecklist } from "../components/ReadinessChecklist";

export async function OnboardingPage() {
  const readiness = await loadOnboardingReadiness();
  return (
    <PlatformPage breadcrumbs={[{ type: "link", label: "Portfolio", href: "/platform/portfolio" }, { type: "page", label: "Setup" }]}>
      <PageHeader icon={ClipboardCheck} title="Setup" />
      {!readiness ? <EmptyState title="Setup status is unavailable" />
        : readiness.canStartFirstCompany ? <div className="overflow-hidden rounded-xl border bg-background"><OnboardingSetup sampleAvailable={readiness.sampleWorkspaceAvailable} /></div>
        : readiness.companies.length > 0 ? <ReadinessChecklist companies={readiness.companies} />
        : readiness.projectOnly ? <EmptyState title="Project access is managed by your company administrator" action={<Track><PillLink href="/dashboard/platform/projects" variant="primary">Open projects</PillLink></Track>} />
        : <EmptyState title="Setup is available to company administrators" />}
    </PlatformPage>
  );
}
