import { FileSignature, Mail, Phone } from "lucide-react";

import { formatUsdMinor } from "@/features/lib/money";
import { ListPager, listHref, pageParam } from "@/features/platform/projects/components/ListPager";
import { EmptyState, PageHeader, PlatformPage, TitleStatus, formatDate, type Tone } from "@/features/platform/components/kit";
import { CancelRequestForm, QuoteForm } from "./QuoteForm";
import { getOperatorRequests, OPERATOR_REQUEST_PAGE_SIZE } from "./data";

const requestStatus: Record<string, { label: string; tone: Tone }> = {
  requested: { label: "Awaiting quote", tone: "amber" },
  quoted: { label: "Quote sent", tone: "blue" },
  payment_pending: { label: "Accepted", tone: "emerald" },
  cancelled: { label: "Cancelled", tone: "rose" },
};

export async function ServiceRequestsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const page = pageParam((await searchParams).page);
  const { rows, totalCount } = await getOperatorRequests(page);
  const totalPages = Math.max(1, Math.ceil(totalCount / OPERATOR_REQUEST_PAGE_SIZE));
  const awaiting = rows.filter(row => row.request.status === "requested").length;
  return (
    <PlatformPage breadcrumbs={[{ type: "link", label: "Portfolio", href: "/platform/portfolio" }, { type: "page", label: "Quote requests" }]}>
      <PageHeader
        icon={FileSignature}
        title="Quote requests"
        meta={<><span className="tabular-nums">{totalCount} requests</span>{awaiting ? <TitleStatus tone="amber" label={`${awaiting} awaiting quote on this page`} /> : null}</>}
        actions={<ListPager label="Quote request pages" page={page} totalPages={totalPages} hrefFor={next => listHref("/dashboard/platform/service-requests", { page: next })} />}
      />
      {!rows.length && <EmptyState icon={FileSignature} title="No quote requests" />}
      <ul className="grid gap-4">
        {rows.map(({ request, customerName, customerEmail, customerPhone }) => {
          const status = requestStatus[request.status] ?? { label: request.status.replaceAll("_", " "), tone: "zinc" as Tone };
          const open = ["requested", "quoted"].includes(request.status);
          return (
            <li key={request.id} className="min-w-0 overflow-hidden rounded-xl border bg-background">
              <div className={`grid min-w-0 ${open ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:divide-x" : ""}`}>
                <article className="grid min-w-0 content-start gap-4 p-4 md:p-5">
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">{request.reference} · {formatDate(request.createdAt)}</p>
                    <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                      <h2 className="min-w-0 break-words text-base font-semibold tracking-tight">{request.serviceTitle}</h2>
                      <TitleStatus tone={status.tone} label={status.label} />
                    </div>
                  </div>
                  <dl className="grid gap-3 rounded-lg bg-muted/40 p-3 text-sm sm:grid-cols-3">
                    <div className="min-w-0"><dt className="text-xs text-muted-foreground">Customer</dt><dd className="mt-0.5 break-words font-medium">{customerName || "—"}</dd></div>
                    <div className="min-w-0"><dt className="text-xs text-muted-foreground">Email</dt><dd className="mt-0.5 break-all">{customerEmail ? <a href={`mailto:${customerEmail}`} className="inline-flex items-center gap-1 underline underline-offset-4"><Mail className="size-3.5 shrink-0" aria-hidden="true" />{customerEmail}</a> : "—"}</dd></div>
                    <div className="min-w-0"><dt className="text-xs text-muted-foreground">Phone</dt><dd className="mt-0.5">{customerPhone ? <a href={`tel:${customerPhone}`} className="inline-flex items-center gap-1 underline underline-offset-4"><Phone className="size-3.5 shrink-0" aria-hidden="true" />{customerPhone}</a> : "—"}</dd></div>
                  </dl>
                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground">Scope</h3>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">{request.scope}</p>
                  </div>
                  {!open && request.acceptedSnapshot && (
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Accepted quote</p>
                      <p className="mt-0.5 text-lg font-semibold tabular-nums">{formatUsdMinor(String(request.acceptedSnapshot.totalMinor))}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{String(request.acceptedSnapshot.terms)}</p>
                    </div>
                  )}
                  {request.status !== "cancelled" && <CancelRequestForm key={`cancel:${request.version}`} request={request} />}
                </article>
                {open && (
                  <div className="min-w-0 border-t bg-muted/20 p-4 md:p-5 lg:border-t-0">
                    <h3 className="mb-3 text-sm font-semibold">{request.status === "quoted" ? "Revise quote" : "Issue quote"}</h3>
                    <QuoteForm key={request.version} request={request} />
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </PlatformPage>
  );
}
