import { Plus, Search, UsersRound } from "lucide-react";

import { DisclosurePanel, EmptyState, PageHeader, PlatformPage, SegmentTabs, inputClass, pillClass, trackClass } from "@/features/platform/components/kit";
import { RegisterFrame, RegisterRow } from "@/features/platform/components/Register";
import { listHref, pageParam, textParam } from "@/features/platform/projects/components/ListPager";
import { getPlatformCompanies, pickCompany } from "@/features/platform/lib/company";
import { TradePartnerForm } from "../components/TradePartnerForm";
import { TRADE_PARTNER_PAGE_SIZE, getTradePartnerRegister } from "../data";
import { partnerStatuses, partnerTypeLabel, partnerTypes } from "../lib/states";

const BASE = "/dashboard/platform/trade-partners";

function plural(count: number | null, one: string, many: string) {
  return count ? `${count} ${count === 1 ? one : many}` : null;
}

export async function TradePartnersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const companies = await getPlatformCompanies();
  const company = pickCompany(companies, textParam(params.company));
  if (!company) {
    return (
      <PlatformPage breadcrumbs={[{ type: "page", label: "Trade partners" }]}>
        <PageHeader icon={UsersRound} title="Trade partners" />
        <EmptyState icon={UsersRound} title="No company yet" />
      </PlatformPage>
    );
  }

  const page = pageParam(params.page);
  const search = textParam(params.q);
  const requestedType = textParam(params.type);
  const type = partnerTypes.some(entry => entry.value === requestedType) ? requestedType : "all";
  const requestedStatus = textParam(params.status);
  const status = (partnerStatuses as readonly string[]).includes(requestedStatus) ? requestedStatus : "all";
  const register = await getTradePartnerRegister(company.id, page, search, type, status);
  const totalPages = Math.max(1, Math.ceil(register.totalCount / TRADE_PARTNER_PAGE_SIZE));
  const companyParam = companies.length > 1 ? company.id : undefined;
  const href = (next: { page?: number; status?: string; type?: string; company?: string }) => listHref(BASE, {
    company: next.company ?? companyParam, q: search, type: next.type ?? (type === "all" ? undefined : type),
    status: (next.status ?? status) === "all" ? undefined : next.status ?? status, page: next.page,
  });
  const allCount = Object.values(register.statusCounts).reduce((sum, count) => sum + count, 0);

  return (
    <PlatformPage breadcrumbs={[{ type: "page", label: "Trade partners" }]}>
      <PageHeader
        icon={UsersRound}
        eyebrow={company.name}
        title="Trade partners"
        meta={<span className="tabular-nums">{allCount} in directory</span>}
      />

      {companies.length > 1 ? (
        <SegmentTabs label="Company" tabs={companies.map(entry => ({ key: entry.id, label: entry.name, href: listHref(BASE, { company: entry.id }), active: entry.id === company.id }))} />
      ) : null}

      <DisclosurePanel title="New trade partner" icon={Plus} defaultOpen={allCount === 0}>
        <TradePartnerForm companyId={company.id} />
      </DisclosurePanel>

      <RegisterFrame
        id="trade-partners"
        title="Directory"
        noun="trade partners"
        page={page}
        pageSize={TRADE_PARTNER_PAGE_SIZE}
        totalCount={register.totalCount}
        totalPages={totalPages}
        status={status}
        filters={[{ value: "all", label: `All ${allCount}` }, ...partnerStatuses.map(value => ({ value, label: `${value.charAt(0).toUpperCase()}${value.slice(1)} ${register.statusCounts[value] ?? 0}` }))]}
        hrefFor={(nextPage, nextStatus) => href({ page: nextPage, status: nextStatus })}
        itemCount={register.items.length}
        toolbar={
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <SegmentTabs label="Filter by type" tabs={[{ key: "all", label: "All types", href: href({ type: "", page: 1 }), active: type === "all" }, ...partnerTypes.map(entry => ({ key: entry.value, label: entry.label, href: href({ type: entry.value, page: 1 }), active: type === entry.value }))]} />
            <form action={BASE} className="flex min-w-0 items-center gap-2">
              {companyParam ? <input type="hidden" name="company" value={companyParam} /> : null}
              {type !== "all" ? <input type="hidden" name="type" value={type} /> : null}
              {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
              <label className="sr-only" htmlFor="partner-search">Search trade partners</label>
              <input id="partner-search" name="q" defaultValue={search} placeholder="Name or email" className={`${inputClass} h-9 lg:w-64`} />
              <span className={trackClass}><button className={pillClass("raised", "sm")}><Search />Search</button></span>
            </form>
          </div>
        }
      >
        {register.items.map(partner => (
          <RegisterRow
            key={partner.id}
            reference={partnerTypeLabel[partner.partnerType] ?? partner.partnerType}
            title={partner.name}
            href={`${BASE}/${encodeURIComponent(partner.id)}`}
            status={partner.status}
            meta={[
              [partner.city, partner.stateProvince].filter(Boolean).join(", "),
              partner.email,
              plural(partner.commitmentsCount, "commitment", "commitments"),
              plural(partner.bidSubmissionsCount, "bid", "bids"),
              plural(partner.ownedProjectsCount, "owned project", "owned projects"),
            ].filter(Boolean).join(" · ") || undefined}
          />
        ))}
      </RegisterFrame>
    </PlatformPage>
  );
}
