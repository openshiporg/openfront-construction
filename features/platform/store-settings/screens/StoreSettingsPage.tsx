import { FormSelect } from "@/features/forms/components/FormSelect";
import { PageBreadcrumbs } from "@/features/dashboard/components/PageBreadcrumbs";
import { getPublicStoreSettings } from "../actions/store-settings";
import { StoreSettingsPageClient } from "./StoreSettingsPageClient";
import { PublicProfileForm, PublicProjectForm, PublicServiceForm } from "../components/PublicContentForms";

export async function StoreSettingsPage({ searchParams }: { searchParams: Promise<{ companyId?: string }> }) {
  const params = await searchParams;
  const result = await getPublicStoreSettings(params.companyId);
  const data = result.success ? result.data : null;
  const company = data?.company;
  // PageBreadcrumbs prefixes the dashboard basePath, so its hrefs are relative.
  return <div className="flex min-w-0 flex-col bg-background">
    <PageBreadcrumbs items={[{ type: "link", label: "Portfolio", href: "/platform/portfolio" }, { type: "page", label: "Store Settings" }]} />
    <div className="flex flex-wrap items-start justify-between gap-4 border-b px-4 py-4 md:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Store Settings</h1>
        {company && <p className="mt-0.5 text-sm text-muted-foreground">{company.name}</p>}
      </div>
    </div>
    <section className="grid min-w-0 gap-6 px-4 py-6 md:px-6">
    {!result.success && <p role="alert">{result.error}</p>}
    {data && !company && (data.companies.length ? <form className="flex flex-wrap gap-3" action="/dashboard/platform/store-settings">
      <label className="grid min-w-0 gap-2 text-sm font-medium">Company<FormSelect name="companyId" required className="min-h-11 rounded-md border bg-background px-3" defaultValue=""><option value="">Select company</option>{data.companies.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</FormSelect></label>
      <button className="min-h-11 self-end rounded-md border px-4">Open Store Settings</button>
    </form> : <p>No company you can manage</p>)}
    {company && data && <>
      <StoreSettingsPageClient initial={company} initialError={null} />
      <PublicProfileForm companyId={company.id} profile={data.profile} />
      {data.profile && <>
        <section className="grid gap-3"><h2 className="text-xl font-semibold">Services</h2>
          {data.services.map(service => <details className="rounded-lg border" key={service.id}><summary className="min-h-12 cursor-pointer px-5 py-3">{service.title} · {service.status}</summary><PublicServiceForm companyId={company.id} service={service} /></details>)}
          <details className="rounded-lg border"><summary className="min-h-12 cursor-pointer px-5 py-3">Add service</summary><PublicServiceForm companyId={company.id} /></details>
        </section>
        <section className="grid gap-3"><h2 className="text-xl font-semibold">Public projects</h2>
          {data.projects.map(project => <details className="rounded-lg border" key={project.id}><summary className="min-h-12 cursor-pointer px-5 py-3">{project.title} · {project.status}</summary><PublicProjectForm companyId={company.id} project={project} /></details>)}
          <details className="rounded-lg border"><summary className="min-h-12 cursor-pointer px-5 py-3">Add public project</summary><PublicProjectForm companyId={company.id} /></details>
        </section>
      </>}
    </>}
    </section>
  </div>;
}
