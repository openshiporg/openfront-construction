import { Target } from "lucide-react";

import { keystoneClient } from "@/features/dashboard/lib/keystoneClient";
import { EmptyState, PageHeader, Panel, PillLink, PlatformPage, SegmentTabs, Track } from "@/features/platform/components/kit";
import { listHref, textParam } from "@/features/platform/projects/components/ListPager";
import { getPlatformCompanies, pickCompany } from "@/features/platform/lib/company";
import { OpportunityForm } from "../components/OpportunityForm";

const BASE = "/dashboard/platform/pipeline/create";

export async function OpportunityCreatePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const companies = await getPlatformCompanies();
  const company = pickCompany(companies, textParam(params.company));
  const breadcrumbs = [{ type: "link" as const, label: "Pipeline", href: "/platform/pipeline" }, { type: "page" as const, label: "New pursuit" }];
  if (!company) {
    return (
      <PlatformPage breadcrumbs={breadcrumbs}>
        <PageHeader icon={Target} title="New pursuit" />
        <EmptyState icon={Target} title="No company yet" action={<Track><PillLink href="/dashboard/platform/setup" variant="primary">Set up company</PillLink></Track>} />
      </PlatformPage>
    );
  }
  const clients = await keystoneClient<{ tradePartners: Array<{ id: string; name: string }> }>(`
    query PursuitClients($companyId: ID!) {
      tradePartners(where: { company: { id: { equals: $companyId } }, partnerType: { equals: owner }, status: { notIn: [blocked, inactive] } }, orderBy: [{ name: asc }], take: 200) { id name }
    }
  `, { companyId: company.id });

  return (
    <PlatformPage breadcrumbs={breadcrumbs}>
      <PageHeader icon={Target} eyebrow={company.name} title="New pursuit" />
      {companies.length > 1 ? (
        <SegmentTabs label="Company" tabs={companies.map(entry => ({ key: entry.id, label: entry.name, href: listHref(BASE, { company: entry.id }), active: entry.id === company.id }))} />
      ) : null}
      <Panel title="Pursuit" padded={false}>
        <OpportunityForm key={company.id} companyId={company.id} clients={clients.success ? clients.data.tradePartners : []} />
      </Panel>
    </PlatformPage>
  );
}
