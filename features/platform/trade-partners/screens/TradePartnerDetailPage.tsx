import type { ReactNode } from "react";
import { Pencil, UsersRound } from "lucide-react";

import { DisclosurePanel, EmptyState, Fact, NotFoundPage, PageHeader, Panel, PlatformPage, TitleStatus, formatDate, formatMinor } from "@/features/platform/components/kit";
import { projectToolHref } from "@/features/platform/lib/navigation";
import { PartnerStatusControl } from "../components/PartnerStatusControl";
import { TradePartnerForm } from "../components/TradePartnerForm";
import { getTradePartnerDetail } from "../data";
import { partnerTypeLabel } from "../lib/states";

type Row = { id: string; reference: string | null; title: string | null; status: string; amount?: string | null; currency?: string | null; date?: string | null; project: { id: string; projectNumber: string | null; name: string | null } | null; recordType?: string };

function recordHref(row: Row) {
  if (!row.project) return null;
  return row.recordType ? `${projectToolHref(row.project.id, "")}/records/${row.recordType}/${encodeURIComponent(row.id)}` : projectToolHref(row.project.id, "");
}

function Related({ title, count, rows }: { title: string; count: number | null; rows: Row[] }) {
  return (
    <Panel title={title} meta={count ? `${count} total` : undefined} padded={rows.length === 0}>
      {rows.length === 0 ? <EmptyState compact title={`No ${title.toLowerCase()}`} /> : (
        <ul className="divide-y">
          {rows.map(row => {
            const href = recordHref(row);
            return (
              <li key={row.id} className="grid min-w-0 gap-1 px-4 py-3 md:px-5">
                <p className="text-xs text-muted-foreground">{[row.reference, row.project?.projectNumber].filter(Boolean).join(" · ")}</p>
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                  {href ? <a href={href} className="min-w-0 break-words text-sm font-medium underline-offset-4 hover:underline">{row.title || row.project?.name || "Record"}</a> : <span className="text-sm font-medium">{row.title || "Record"}</span>}
                  <TitleStatus status={row.status} />
                </div>
                <p className="text-xs tabular-nums text-muted-foreground">{[row.amount ? formatMinor(row.amount, row.currency ?? "USD") : null, row.date ? formatDate(row.date) : null].filter(Boolean).join(" · ")}</p>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

export async function TradePartnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const partner = await getTradePartnerDetail(id);
  if (!partner) return <NotFoundPage title="Trade partner not found" backHref="/dashboard/platform/trade-partners" backLabel="Trade partners" />;
  const address = [partner.addressLine1, partner.addressLine2, [partner.city, partner.stateProvince, partner.postalCode].filter(Boolean).join(", "), partner.countryCode].filter(Boolean);
  const facts: Array<[string, ReactNode]> = [
    ["Type", partnerTypeLabel[partner.partnerType] ?? partner.partnerType],
    ["Legal name", partner.legalName || "—"],
    ["Email", partner.email ? <a className="underline underline-offset-4" href={`mailto:${partner.email}`}>{partner.email}</a> : "—"],
    ["Phone", partner.phone || "—"],
    ["Website", partner.website || "—"],
    ["Address", address.length ? address.join(" · ") : "—"],
  ];

  return (
    <PlatformPage breadcrumbs={[{ type: "link", label: "Trade partners", href: "/platform/trade-partners" }, { type: "page", label: partner.name }]}>
      <PageHeader
        icon={UsersRound}
        eyebrow={partner.company?.name}
        title={partner.name}
        status={<TitleStatus status={partner.status} />}
        meta={partner.updatedAt ? <span>Updated {formatDate(partner.updatedAt)}</span> : undefined}
        actions={<PartnerStatusControl id={partner.id} status={partner.status} />}
      />

      <Panel title="Details">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{facts.map(([label, value]) => <Fact key={label} label={label}>{value}</Fact>)}</dl>
      </Panel>

      <DisclosurePanel title="Edit details" icon={Pencil}>
        <TradePartnerForm values={partner} />
      </DisclosurePanel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Related title="Subcontracts & POs" count={partner.commitmentsCount} rows={partner.commitments.map(row => ({ id: row.id, reference: row.number, title: row.title, status: row.status, amount: row.revisedContractMinor, currency: row.currencyCode, project: row.project, recordType: row.commitmentType === "purchase_order" ? "subcontract-po" : "commitment" }))} />
        <Related title="Bids" count={partner.bidSubmissionsCount} rows={partner.bidSubmissions.map(row => ({ id: row.id, reference: row.submissionNumber, title: row.bidPackage?.title ?? null, status: row.status, amount: row.totalMinor, currency: row.currencyCode, date: row.submittedAt, project: row.project, recordType: "bid-submission" }))} />
        <Related title="Progress claims" count={partner.progressClaimsCount} rows={partner.progressClaims.map(row => ({ id: row.id, reference: row.claimNumber, title: "Progress claim", status: row.status, amount: row.currentPaymentDueMinor, currency: row.currencyCode, date: row.dueAt, project: row.project, recordType: "progress-claim" }))} />
        <Related title="Payments" count={partner.paymentsCount} rows={partner.payments.map(row => ({ id: row.id, reference: row.paymentNumber, title: row.direction === "receipt" ? "Received" : "Paid out", status: row.status, amount: row.amountMinor, currency: row.currencyCode, date: row.paidAt, project: row.project, recordType: "payment" }))} />
        <Related title="Lien waivers" count={partner.lienWaiversCount} rows={partner.lienWaivers.map(row => ({ id: row.id, reference: row.waiverNumber, title: row.waiverType.replaceAll("_", " "), status: row.status, amount: row.amountMinor, currency: row.currencyCode, date: row.throughDate, project: row.project, recordType: "lien-waiver" }))} />
        <Related title="Procurement requests" count={partner.procurementRequestsCount} rows={partner.procurementRequests.map(row => ({ id: row.id, reference: row.requestNumber, title: row.title, status: row.status, amount: row.totalEstimatedMinor, currency: row.currencyCode, date: row.neededBy, project: row.project, recordType: "procurement-request" }))} />
        <Related title="Owned projects" count={partner.ownedProjectsCount} rows={partner.ownedProjects.map(row => ({ id: row.id, reference: row.projectNumber, title: row.name, status: row.status, project: { id: row.id, projectNumber: null, name: row.name } }))} />
        <Related title="Portal users" count={null} rows={partner.projectMembers.map(row => ({ id: row.id, reference: row.user?.email ?? null, title: row.user?.name ?? null, status: row.status, project: row.project }))} />
      </div>
    </PlatformPage>
  );
}
