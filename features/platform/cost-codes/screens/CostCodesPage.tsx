import { Hash, Plus, Search } from "lucide-react";

import { DisclosurePanel, EmptyState, PageHeader, PlatformPage, SegmentTabs, TitleStatus, inputClass, pillClass, trackClass, SetupCompanyAction } from "@/features/platform/components/kit";
import { RegisterFrame } from "@/features/platform/components/Register";
import { listHref, pageParam, textParam } from "@/features/platform/projects/components/ListPager";
import { getPlatformCompanies, pickCompany } from "@/features/platform/lib/company";
import { CostCodeActiveToggle, CostCodeForm } from "../components/CostCodeForms";
import { COST_CODE_PAGE_SIZE, getCostCodeRegister } from "../data";

const BASE = "/dashboard/platform/cost-codes";

export async function CostCodesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const companies = await getPlatformCompanies();
  const company = pickCompany(companies, textParam(params.company));
  if (!company) {
    return (
      <PlatformPage breadcrumbs={[{ type: "page", label: "Cost codes" }]}>
        <PageHeader icon={Hash} title="Cost codes" />
        <EmptyState icon={Hash} title="No company yet" action={<SetupCompanyAction />} />
      </PlatformPage>
    );
  }

  const page = pageParam(params.page);
  const search = textParam(params.q);
  const requested = textParam(params.status);
  const status = requested === "active" || requested === "inactive" ? requested : "all";
  const register = await getCostCodeRegister(company.id, page, search, status);
  const totalPages = Math.max(1, Math.ceil(register.totalCount / COST_CODE_PAGE_SIZE));
  const companyParam = companies.length > 1 ? company.id : undefined;
  const href = (nextPage: number, nextStatus: string) => listHref(BASE, { company: companyParam, q: search, status: nextStatus === "all" ? undefined : nextStatus, page: nextPage });
  const all = register.activeCount + register.inactiveCount;

  return (
    <PlatformPage breadcrumbs={[{ type: "page", label: "Cost codes" }]}>
      <PageHeader icon={Hash} eyebrow={company.name} title="Cost codes" meta={<span className="tabular-nums">{register.activeCount} active</span>} />

      {companies.length > 1 ? (
        <SegmentTabs label="Company" tabs={companies.map(entry => ({ key: entry.id, label: entry.name, href: listHref(BASE, { company: entry.id }), active: entry.id === company.id }))} />
      ) : null}

      <DisclosurePanel title="New cost code" icon={Plus} defaultOpen={all <= 1}>
        <CostCodeForm companyId={company.id} />
      </DisclosurePanel>

      <RegisterFrame
        id="cost-codes"
        title="Cost code library"
        noun="cost codes"
        page={page}
        pageSize={COST_CODE_PAGE_SIZE}
        totalCount={register.totalCount}
        totalPages={totalPages}
        status={status}
        filters={[{ value: "all", label: `All ${all}` }, { value: "active", label: `Active ${register.activeCount}` }, { value: "inactive", label: `Inactive ${register.inactiveCount}` }]}
        hrefFor={href}
        itemCount={register.items.length}
        toolbar={
          <form action={BASE} className="flex min-w-0 items-center gap-2">
            {companyParam ? <input type="hidden" name="company" value={companyParam} /> : null}
            {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
            <label className="sr-only" htmlFor="cost-code-search">Search cost codes</label>
            <input id="cost-code-search" name="q" defaultValue={search} placeholder="Code, name or division" className={`${inputClass} h-9 sm:w-72`} />
            <span className={trackClass}><button className={pillClass("raised", "sm")}><Search />Search</button></span>
          </form>
        }
      >
        {register.items.map(code => (
          <li key={code.id} className="grid min-w-0 gap-3 px-3 py-3 md:px-4">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">{[code.code, code.division].filter(Boolean).join(" · ")}</p>
                <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="min-w-0 break-words text-sm font-medium">{code.name}</span>
                  <TitleStatus status={code.isActive ? "active" : "inactive"} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{code.budgetCodesCount ? `Used by ${code.budgetCodesCount} budget ${code.budgetCodesCount === 1 ? "code" : "codes"}` : "Not used on a project"}{code.description ? ` · ${code.description}` : ""}</p>
              </div>
              <CostCodeActiveToggle id={code.id} isActive={code.isActive} />
            </div>
            <details className="group rounded-lg border">
              <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-muted-foreground [&::-webkit-details-marker]:hidden"><span className="group-open:hidden">Edit</span><span className="hidden group-open:inline">Close</span></summary>
              <div className="border-t"><CostCodeForm values={code} /></div>
            </details>
          </li>
        ))}
      </RegisterFrame>
    </PlatformPage>
  );
}
