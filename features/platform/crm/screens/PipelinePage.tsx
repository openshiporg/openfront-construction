import Link from "next/link";
import { ArrowRight, BriefcaseBusiness } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/features/dashboard/components/PageContainer";
import { keystoneClient } from "@/features/dashboard/lib/keystoneClient";
import { ListPager, listHref, pageParam } from "@/features/platform/projects/components/ListPager";

const activeStages = ["qualifying", "go_no_go", "estimating", "submitted", "negotiating"] as const;
const closedStages = ["won", "lost", "declined"] as const;
const views = [
  { value: "active", label: "Active", stages: activeStages },
  { value: "closed", label: "Closed", stages: closedStages },
  { value: "all", label: "All", stages: [...activeStages, ...closedStages] },
] as const;
const PAGE_SIZE = 50;

type Opportunity = { id: string; number: string; name: string; organization: string | null; stage: string; estimatedValueMinor: string; currencyCode: string; probabilityBps: number; targetBidDate: string | null; nextActionAt: string | null; owner: { name: string } | null };
type IntakeSubmission = { id: string; publicReference: string; kind: string; contactName: string; organization: string | null; projectName: string | null; status: string; submittedAt: string };

function formatMinor(value: string, currency: string) {
  try { const amount = BigInt(value); return `${currency} ${(amount / BigInt(100)).toLocaleString()}.${(amount % BigInt(100)).toString().padStart(2, "0")}`; } catch { return `${currency} —`; }
}

function isOverdue(item: Opportunity) {
  return item.nextActionAt !== null && (activeStages as readonly string[]).includes(item.stage) && new Date(item.nextActionAt).getTime() < Date.now();
}

function readable(value: string) {
  return value.replaceAll("_", " ");
}

export async function PipelinePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const view = views.find(entry => entry.value === params.view) ?? views[0];
  const page = pageParam(params.page);
  const requestPage = pageParam(params.requestPage);
  const stageCountFields = activeStages.map(stage => `${stage}: constructionOpportunitiesCount(where: { stage: { equals: ${stage} } })`).join("\n");
  const response = await keystoneClient<{
    constructionOpportunities: Opportunity[];
    opportunityCount: number;
    intakeSubmissions: IntakeSubmission[];
    intakeCount: number;
  } & Record<string, number>>(`
    query ConstructionPipeline($stages: [ConstructionOpportunityStageType!], $take: Int!, $skip: Int!, $requestSkip: Int!) {
      constructionOpportunities(where: { stage: { in: $stages } }, take: $take, skip: $skip, orderBy: [{ nextActionAt: asc }, { updatedAt: desc }, { id: asc }]) {
        id number name organization stage estimatedValueMinor currencyCode probabilityBps targetBidDate nextActionAt owner { name }
      }
      opportunityCount: constructionOpportunitiesCount(where: { stage: { in: $stages } })
      ${stageCountFields}
      intakeSubmissions(take: $take, skip: $requestSkip, orderBy: [{ submittedAt: desc }, { id: asc }]) {
        id publicReference kind contactName organization projectName status submittedAt
      }
      intakeCount: intakeSubmissionsCount
    }
  `, { stages: [...view.stages], take: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE, requestSkip: (requestPage - 1) * PAGE_SIZE });
  if (!response.success) throw new Error(response.error);
  const { constructionOpportunities: opportunities, opportunityCount, intakeSubmissions: intake, intakeCount } = response.data;
  const hrefFor = (updates: { view?: string; page?: number; requestPage?: number }) => listHref("/dashboard/platform/pipeline", {
    view: (updates.view ?? view.value) === "active" ? undefined : updates.view ?? view.value,
    page: updates.page ?? page,
    requestPage: updates.requestPage ?? requestPage,
  });

  return <PageContainer title="Pipeline" breadcrumbs={[{ type: "link", label: "Portfolio", href: "/dashboard/platform/portfolio" }, { type: "page", label: "Pipeline" }]} header={<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1><Link href="/dashboard/platform/pipeline/create" className="inline-flex items-center gap-1 text-sm font-medium">Add opportunity <ArrowRight className="h-4 w-4" /></Link></div>}>
    <dl className="grid border-y sm:grid-cols-5" aria-label="Active pursuits by stage">{activeStages.map(stage => <div key={stage} className="border-b p-4 sm:border-b-0 sm:border-r"><dt className="text-xs capitalize text-muted-foreground">{readable(stage)}</dt><dd className="mt-2 text-xl font-semibold tabular-nums">{response.data[stage] ?? 0}</dd></div>)}</dl>
    <section className="border-b px-4 py-6 md:px-6" aria-labelledby="public-intake-title">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 id="public-intake-title" className="font-semibold">Public requests</h2><p className="mt-1 text-sm text-muted-foreground">{intakeCount} requests</p></div><ListPager label="Public request pages" page={requestPage} totalPages={Math.max(1, Math.ceil(intakeCount / PAGE_SIZE))} hrefFor={next => hrefFor({ requestPage: next })} /></div>
      {intake.length === 0 ? <p className="border-y py-8 text-center text-sm text-muted-foreground">No public requests.</p> : <div className="divide-y border-y">{intake.map(item => <article key={item.id} className="grid gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div><p className="text-xs text-muted-foreground">{item.publicReference} · {readable(item.kind)}</p><h3 className="mt-1 font-medium"><Link href={`/dashboard/platform/pipeline/requests/${item.id}`} className="hover:underline">{item.projectName || item.organization || item.contactName}</Link></h3><p className="mt-1 text-xs text-muted-foreground">{item.contactName}{item.organization ? ` · ${item.organization}` : ""}</p></div><div className="flex items-center gap-3"><Badge variant="outline">{readable(item.status)}</Badge><span className="text-xs text-muted-foreground">{new Date(item.submittedAt).toLocaleDateString()}</span></div></article>)}</div>}
    </section>
    <section className="px-4 py-6 md:px-6" aria-labelledby="pursuits-title">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 id="pursuits-title" className="font-semibold">Pursuits</h2><p className="mt-1 text-sm text-muted-foreground">{opportunityCount} {view.value === "all" ? "" : `${view.label.toLowerCase()} `}pursuits</p></div><ListPager label="Pursuit pages" page={page} totalPages={Math.max(1, Math.ceil(opportunityCount / PAGE_SIZE))} hrefFor={next => hrefFor({ page: next })} /></div>
      <nav aria-label="Filter pursuits" className="mb-4 flex gap-2 overflow-x-auto pb-1">{views.map(entry => <Link key={entry.value} href={hrefFor({ view: entry.value, page: 1 })} aria-current={entry.value === view.value ? "page" : undefined} className={`shrink-0 rounded-full border px-3 py-1 text-xs ${entry.value === view.value ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{entry.label}</Link>)}</nav>
      {opportunities.length === 0 ? <div className="border-y py-12 text-center"><BriefcaseBusiness className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden="true" /><p className="mt-3 font-medium">No pursuits</p><Link href="/dashboard/platform/pipeline/create" className="mt-2 inline-flex items-center gap-1 text-sm font-medium">Add opportunity <ArrowRight className="h-4 w-4" /></Link></div> : <div className="overflow-x-auto border-y"><table className="w-full min-w-[960px] text-left text-sm"><thead className="bg-muted/40 text-xs text-muted-foreground"><tr><th className="px-3 py-2 font-medium">Opportunity</th><th className="px-3 py-2 font-medium">Stage</th><th className="px-3 py-2 font-medium">Owner</th><th className="px-3 py-2 font-medium">Next action</th><th className="px-3 py-2 font-medium">Bid date</th><th className="px-3 py-2 text-right font-medium">Estimated value</th><th className="px-3 py-2 text-right font-medium">Probability</th></tr></thead><tbody className="divide-y">{opportunities.map(item => {
        const overdue = isOverdue(item);
        return <tr key={item.id}><td className="px-3 py-3"><Link href={`/dashboard/platform/pipeline/${item.id}`} className="font-medium hover:underline">{item.name}</Link><p className="text-xs text-muted-foreground">{item.number}{item.organization ? ` · ${item.organization}` : ""}</p></td><td className="px-3 py-3"><Badge variant="outline">{readable(item.stage)}</Badge></td><td className="px-3 py-3 text-muted-foreground">{item.owner?.name ?? "Unassigned"}</td><td className={`px-3 py-3 ${overdue ? "font-medium text-destructive" : "text-muted-foreground"}`}>{item.nextActionAt ? `${new Date(item.nextActionAt).toLocaleDateString()}${overdue ? " · Overdue" : ""}` : "—"}</td><td className="px-3 py-3 text-muted-foreground">{item.targetBidDate ? new Date(item.targetBidDate).toLocaleDateString() : "—"}</td><td className="px-3 py-3 text-right tabular-nums">{formatMinor(item.estimatedValueMinor, item.currencyCode)}</td><td className="px-3 py-3 text-right tabular-nums">{(item.probabilityBps / 100).toFixed(0)}%</td></tr>;
      })}</tbody></table></div>}
    </section>
  </PageContainer>;
}
