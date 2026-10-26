import { Package, Plus, Search, Truck } from "lucide-react";
import type { ReactNode } from "react";

import { DisclosurePanel, EmptyState, PageHeader, PlatformPage, SegmentTabs, TitleStatus, formatMinor, inputClass, pillClass, readable, trackClass, SetupCompanyAction } from "@/features/platform/components/kit";
import { RegisterFrame } from "@/features/platform/components/Register";
import { listHref, pageParam, textParam } from "@/features/platform/projects/components/ListPager";
import { getPlatformCompanies, pickCompany } from "@/features/platform/lib/company";
import { CatalogStatusControl, EquipmentForm, MaterialForm } from "../components/CatalogForms";
import { CATALOG_PAGE_SIZE, getEquipmentRegister, getMaterialRegister } from "../data";
import { equipmentStatuses, materialStatuses, type CatalogKind } from "../lib/states";

const BASE = "/dashboard/platform/resources";

function CatalogRow({ reference, title, status, meta, control, editor }: { reference: string; title: string; status: string; meta: string; control: ReactNode; editor: ReactNode }) {
  return (
    <li className="grid min-w-0 gap-3 px-3 py-3 md:px-4">
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{reference}</p>
          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <span className="min-w-0 break-words text-sm font-medium">{title}</span>
            <TitleStatus status={status} />
          </div>
          {meta ? <p className="mt-1 text-xs text-muted-foreground">{meta}</p> : null}
        </div>
        {control}
      </div>
      <details className="group rounded-[6px] border">
        <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-muted-foreground [&::-webkit-details-marker]:hidden"><span className="group-open:hidden">Edit</span><span className="hidden group-open:inline">Close</span></summary>
        <div className="border-t">{editor}</div>
      </details>
    </li>
  );
}

function uses(count: number | null, one: string, many: string) {
  return count ? `${count} ${count === 1 ? one : many}` : null;
}

export async function ResourceCatalogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const companies = await getPlatformCompanies();
  const company = pickCompany(companies, textParam(params.company));
  if (!company) {
    return (
      <PlatformPage breadcrumbs={[{ type: "page", label: "Equipment & materials" }]}>
        <PageHeader icon={Truck} title="Equipment & materials" />
        <EmptyState icon={Truck} title="No company yet" action={<SetupCompanyAction />} />
      </PlatformPage>
    );
  }

  const kind: CatalogKind = textParam(params.kind) === "materials" ? "materials" : "equipment";
  const page = pageParam(params.page);
  const search = textParam(params.q);
  const statuses: readonly string[] = kind === "equipment" ? equipmentStatuses : materialStatuses;
  const requested = textParam(params.status);
  const status = statuses.includes(requested) ? requested : "all";
  const companyParam = companies.length > 1 ? company.id : undefined;
  const href = (nextPage: number, nextStatus: string) => listHref(BASE, { company: companyParam, kind: kind === "materials" ? kind : undefined, q: search, status: nextStatus === "all" ? undefined : nextStatus, page: nextPage });

  const equipment = kind === "equipment" ? await getEquipmentRegister(company.id, page, search, status) : null;
  const materials = kind === "materials" ? await getMaterialRegister(company.id, page, search, status) : null;
  const register = equipment ?? materials!;
  const all = Object.values(register.statusCounts).reduce((sum, count) => sum + count, 0);
  const noun = kind === "equipment" ? "equipment" : "materials";

  return (
    <PlatformPage breadcrumbs={[{ type: "page", label: "Equipment & materials" }]}>
      <PageHeader icon={Truck} eyebrow={company.name} title="Equipment & materials" />

      {companies.length > 1 ? (
        <SegmentTabs label="Company" tabs={companies.map(entry => ({ key: entry.id, label: entry.name, href: listHref(BASE, { company: entry.id }), active: entry.id === company.id }))} />
      ) : null}

      <SegmentTabs size="md" label="Catalog" tabs={[
        { key: "equipment", label: "Equipment", href: listHref(BASE, { company: companyParam }), active: kind === "equipment" },
        { key: "materials", label: "Materials", href: listHref(BASE, { company: companyParam, kind: "materials" }), active: kind === "materials" },
      ]} />

      <DisclosurePanel title={kind === "equipment" ? "New equipment" : "New material"} icon={kind === "equipment" ? Plus : Package} defaultOpen={all === 0}>
        {kind === "equipment" ? <EquipmentForm companyId={company.id} /> : <MaterialForm companyId={company.id} />}
      </DisclosurePanel>

      <RegisterFrame
        id="resource-catalog"
        title={kind === "equipment" ? "Equipment" : "Materials"}
        noun={noun}
        page={page}
        pageSize={CATALOG_PAGE_SIZE}
        totalCount={register.totalCount}
        totalPages={Math.max(1, Math.ceil(register.totalCount / CATALOG_PAGE_SIZE))}
        status={status}
        filters={[{ value: "all", label: `All ${all}` }, ...statuses.map(value => ({ value, label: `${readable(value)} ${register.statusCounts[value] ?? 0}` }))]}
        hrefFor={href}
        itemCount={register.items.length}
        toolbar={
          <form action={BASE} className="flex min-w-0 items-center gap-2">
            {companyParam ? <input type="hidden" name="company" value={companyParam} /> : null}
            {kind === "materials" ? <input type="hidden" name="kind" value="materials" /> : null}
            {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
            <label className="sr-only" htmlFor="catalog-search">Search {noun}</label>
            <input id="catalog-search" name="q" defaultValue={search} placeholder={kind === "equipment" ? "Unit, name, make or serial" : "SKU, name or manufacturer"} className={`${inputClass} h-9 sm:w-72`} />
            <span className={trackClass}><button className={pillClass("raised", "sm")}><Search />Search</button></span>
          </form>
        }
      >
        {equipment?.items.map(item => (
          <CatalogRow
            key={item.id}
            reference={[item.equipmentNumber, item.equipmentType].filter(Boolean).join(" · ")}
            title={item.name}
            status={item.status}
            meta={[readable(item.ownershipType), [item.make, item.model].filter(Boolean).join(" "), item.hourlyCostMinor && item.hourlyCostMinor !== "0" ? `${formatMinor(item.hourlyCostMinor, item.currencyCode ?? "USD")}/hr` : null, uses(item.logsCount, "log entry", "log entries")].filter(Boolean).join(" · ")}
            control={<CatalogStatusControl kind="equipment" id={item.id} status={item.status} />}
            editor={<EquipmentForm values={item} />}
          />
        ))}
        {materials?.items.map(item => (
          <CatalogRow
            key={item.id}
            reference={[item.sku, item.manufacturer].filter(Boolean).join(" · ")}
            title={item.name}
            status={item.isActive}
            meta={[item.standardCostMinor && item.standardCostMinor !== "0" ? `${formatMinor(item.standardCostMinor, item.currencyCode ?? "USD")} / ${item.unit}` : `Per ${item.unit}`, uses(item.procurementRequestLinesCount, "request line", "request lines"), uses(item.logsCount, "log entry", "log entries")].filter(Boolean).join(" · ")}
            control={<CatalogStatusControl kind="materials" id={item.id} status={item.isActive} />}
            editor={<MaterialForm values={item} />}
          />
        ))}
      </RegisterFrame>
    </PlatformPage>
  );
}
