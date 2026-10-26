import { ExternalLink, FolderOpen, Hammer, Store } from "lucide-react";

import { FormSelect } from "@/features/forms/components/FormSelect";
import { DisclosurePanel, EmptyState, PageHeader, Panel, PillLink, PlatformPage, StatusDot, Track, fieldLabelClass, pillClass, selectClass, statusTone, trackClass, SetupCompanyAction } from "@/features/platform/components/kit";
import { getPublicStoreSettings } from "../actions/store-settings";
import { StoreSettingsPageClient } from "./StoreSettingsPageClient";
import { PublicProfileForm, PublicProjectForm, PublicServiceForm } from "../components/PublicContentForms";

function ItemTitle({ title, status }: { title: string; status: string }) {
  return <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1"><span className="min-w-0 break-words">{title}</span><span className="inline-flex items-center gap-1.5 text-xs font-medium capitalize text-muted-foreground"><StatusDot tone={statusTone(status)} />{status}</span></span>;
}

export async function StoreSettingsPage({ searchParams }: { searchParams: Promise<{ companyId?: string }> }) {
  const params = await searchParams;
  const result = await getPublicStoreSettings(params.companyId);
  const data = result.success ? result.data : null;
  const company = data?.company;
  return (
    <PlatformPage width="narrow" breadcrumbs={[{ type: "link", label: "Portfolio", href: "/platform/portfolio" }, { type: "page", label: "Store Settings" }]}>
      <PageHeader
        icon={Store}
        title="Store Settings"
        meta={company ? <span>{company.name}</span> : undefined}
        status={data?.profile ? <span className="inline-flex items-center gap-1.5 text-xs font-medium capitalize text-muted-foreground"><StatusDot tone={statusTone(data.profile.status)} />{data.profile.status}</span> : undefined}
        actions={company ? <Track><PillLink href="/" size="sm"><ExternalLink />View website</PillLink></Track> : undefined}
      />
      {!result.success && <p role="alert" className="flex items-center gap-2 rounded-[6px] border px-4 py-3 text-sm"><StatusDot tone="rose" />{result.error}</p>}
      {data && !company && (data.companies.length
        ? <Panel id="choose-company" title="Choose a company">
            <form className="flex flex-wrap items-end gap-3" action="/dashboard/platform/store-settings">
              <label className={`${fieldLabelClass} min-w-56`}>Company<FormSelect name="companyId" required className={selectClass} defaultValue=""><option value="">Select company</option>{data.companies.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</FormSelect></label>
              <span className={trackClass}><button className={pillClass("primary")}>Open</button></span>
            </form>
          </Panel>
        : <EmptyState icon={Store} title="No company you can manage" action={<SetupCompanyAction />} />)}
      {company && data && <>
        <StoreSettingsPageClient initial={company} initialError={null} />
        <PublicProfileForm companyId={company.id} profile={data.profile} />
        {data.profile && <>
          <section aria-labelledby="services-title" className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 id="services-title" className="flex items-center gap-2 text-sm font-semibold"><Hammer className="size-4 text-muted-foreground" aria-hidden="true" />Services <span className="font-normal tabular-nums text-muted-foreground">{data.services.length}</span></h2>
            </div>
            {data.services.map(service => <DisclosurePanel key={service.id} title={<ItemTitle title={service.title} status={service.status} />}><PublicServiceForm companyId={company.id} service={service} /></DisclosurePanel>)}
            <DisclosurePanel title="Add service" defaultOpen={data.services.length === 0}><PublicServiceForm companyId={company.id} /></DisclosurePanel>
          </section>
          <section aria-labelledby="public-projects-title" className="grid gap-3">
            <h2 id="public-projects-title" className="flex items-center gap-2 text-sm font-semibold"><FolderOpen className="size-4 text-muted-foreground" aria-hidden="true" />Public projects <span className="font-normal tabular-nums text-muted-foreground">{data.projects.length}</span></h2>
            {data.projects.map(project => <DisclosurePanel key={project.id} title={<ItemTitle title={project.title} status={project.status} />}><PublicProjectForm companyId={company.id} project={project} /></DisclosurePanel>)}
            <DisclosurePanel title="Add public project" defaultOpen={data.projects.length === 0}><PublicProjectForm companyId={company.id} /></DisclosurePanel>
          </section>
        </>}
      </>}
    </PlatformPage>
  );
}
