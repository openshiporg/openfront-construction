import { CreditCard } from "lucide-react";

import { EmptyState, PageHeader, PlatformPage, Panel, SegmentTabs, SetupCompanyAction, StatusDot } from "@/features/platform/components/kit";
import { getPlatformCompanies, pickCompany } from "@/features/platform/lib/company";
import { platformClient } from "@/features/platform/lib/platform-client";
import { listHref, textParam } from "@/features/platform/projects/components/ListPager";
import { isPaymentProviderConfigured } from "@/features/keystone/utils/paymentProviderConfig";
import { InstallStripe, ToggleProvider } from "./ProviderControls";

const BASE = "/dashboard/platform/payment-providers";
type Provider = { id: string; name: string; code: string; isInstalled: boolean };

export async function PaymentProvidersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const companies = await getPlatformCompanies();
  const company = pickCompany(companies, textParam(params.company));
  const crumbs = [{ type: "page" as const, label: "Payment providers" }];
  if (!company) return <PlatformPage breadcrumbs={crumbs}><PageHeader icon={CreditCard} title="Payment providers" /><EmptyState icon={CreditCard} title="No company yet" action={<SetupCompanyAction />} /></PlatformPage>;
  const response = await platformClient<{ paymentProviders: Provider[] }>(`query Providers($companyId: ID!) { paymentProviders(where: { company: { id: { equals: $companyId } } }, orderBy: [{ createdAt: asc }], take: 20) { id name code isInstalled } }`, { companyId: company.id });
  const providers = response.success ? response.data.paymentProviders : [];
  const hasStripe = providers.some(provider => provider.code.startsWith("pp_stripe"));
  return (
    <PlatformPage breadcrumbs={crumbs}>
      <PageHeader icon={CreditCard} eyebrow={company.name} title="Payment providers" />
      {companies.length > 1 ? <SegmentTabs label="Company" tabs={companies.map(entry => ({ key: entry.id, label: entry.name, href: listHref(BASE, { company: entry.id }), active: entry.id === company.id }))} /> : null}
      <Panel title="Online payments" meta="Deposits and progress claims are paid by card or US bank account (ACH) through the provider you turn on here.">
        {providers.length === 0 ? <EmptyState compact title="No payment provider yet" action={<InstallStripe companyId={company.id} />} /> : (
          <ul className="divide-y">
            {providers.map(provider => {
              const configured = isPaymentProviderConfigured(provider.code);
              return <li key={provider.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="grid gap-1"><span className="font-medium">{provider.name}</span><span className="flex items-center gap-2 text-xs text-muted-foreground"><StatusDot tone={provider.isInstalled && configured ? "emerald" : "amber"} />{!provider.isInstalled ? "Turned off" : configured ? "Ready to take payments" : "Not configured: set the Stripe keys on the server"}</span></span>
                <ToggleProvider providerId={provider.id} isInstalled={provider.isInstalled} />
              </li>;
            })}
          </ul>
        )}
        {providers.length > 0 && !hasStripe ? <div className="pt-4"><InstallStripe companyId={company.id} /></div> : null}
      </Panel>
    </PlatformPage>
  );
}
