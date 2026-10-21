import { PageContainer } from "@/features/dashboard/components/PageContainer";
import { Badge } from "@/components/ui/badge";
import { formatUsdMinor } from "@/features/lib/money";
import { ListPager, listHref, pageParam } from "@/features/platform/projects/components/ListPager";
import { CancelRequestForm, QuoteForm } from "./QuoteForm";
import { getOperatorRequests, OPERATOR_REQUEST_PAGE_SIZE } from "./data";

export async function ServiceRequestsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const page = pageParam((await searchParams).page);
  const { rows, totalCount } = await getOperatorRequests(page);
  const totalPages = Math.max(1, Math.ceil(totalCount / OPERATOR_REQUEST_PAGE_SIZE));
  return <PageContainer
    title="Quote requests"
    breadcrumbs={[{ type: "link", label: "Portfolio", href: "/dashboard/platform/portfolio" }, { type: "page", label: "Quote requests" }]}
    header={<h1 className="text-xl font-semibold tracking-tight md:text-2xl">Quote requests</h1>}
  >
    <section className="grid min-w-0 gap-4 px-4 py-6 md:px-6" aria-labelledby="quote-requests-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 id="quote-requests-title" className="text-base font-semibold">Requests</h2><p className="text-sm text-muted-foreground">{totalCount} requests, newest first</p></div>
        <ListPager label="Quote request pages" page={page} totalPages={totalPages} hrefFor={next => listHref("/dashboard/platform/service-requests", { page: next })} />
      </div>
      {!rows.length && <p className="border-y py-8 text-center text-sm text-muted-foreground">No quote requests.</p>}
      {rows.map(({ request, customerName, customerEmail, customerPhone }) => <article className="grid min-w-0 gap-4 rounded-lg border p-5" key={request.id}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0"><p className="text-xs text-muted-foreground">{request.reference} · {new Date(request.createdAt).toLocaleDateString()}</p><h3 className="mt-1 text-lg font-semibold">{request.serviceTitle}</h3></div>
          <Badge variant="outline">{request.status.replaceAll("_", " ")}</Badge>
        </div>
        <dl className="grid gap-1 text-sm sm:grid-cols-3">
          <div><dt className="text-xs text-muted-foreground">Customer</dt><dd>{customerName || "—"}</dd></div>
          <div className="min-w-0"><dt className="text-xs text-muted-foreground">Email</dt><dd className="break-all">{customerEmail ? <a href={`mailto:${customerEmail}`} className="underline underline-offset-4">{customerEmail}</a> : "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Phone</dt><dd>{customerPhone ? <a href={`tel:${customerPhone}`} className="underline underline-offset-4">{customerPhone}</a> : "—"}</dd></div>
        </dl>
        <p className="whitespace-pre-wrap break-words text-sm">{request.scope}</p>
        {["requested", "quoted"].includes(request.status)
          ? <QuoteForm key={request.version} request={request} />
          : request.acceptedSnapshot && <div className="grid gap-1 text-sm"><p className="font-medium">Accepted quote: {formatUsdMinor(String(request.acceptedSnapshot.totalMinor))}</p><p className="whitespace-pre-wrap">{String(request.acceptedSnapshot.terms)}</p></div>}
        {request.status !== "cancelled" && <CancelRequestForm key={`cancel:${request.version}`} request={request} />}
      </article>)}
    </section>
  </PageContainer>;
}
