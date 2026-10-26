import Link from "next/link";
import { BriefcaseBusiness, Inbox, Plus, Target } from "lucide-react";

import { keystoneClient } from "@/features/dashboard/lib/keystoneClient";
import { ListPager, listHref, pageParam } from "@/features/platform/projects/components/ListPager";
import { EmptyState, PageHeader, Panel, PillLink, PlatformPage, SegmentTabs, StatusDot, TitleStatus, Track, formatDate, formatMinor, readable, statusTone } from "@/features/platform/components/kit";

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

function isOverdue(item: Opportunity) {
  return item.nextActionAt !== null && (activeStages as readonly string[]).includes(item.stage) && new Date(item.nextActionAt).getTime() < Date.now();
}

const stageLabels: Record<string, string> = { go_no_go: "Go / no-go" };
function stageLabel(stage: string) {
  return stageLabels[stage] ?? readable(stage);
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

  const stageTotal = activeStages.reduce((sum, stage) => sum + (response.data[stage] ?? 0), 0);

  return <PlatformPage breadcrumbs={[{ type: "link", label: "Portfolio", href: "/platform/portfolio" }, { type: "page", label: "Pipeline" }]}>
    <PageHeader icon={Target} title="Pipeline" meta={<span className="tabular-nums">{stageTotal} active pursuits</span>} actions={<Track><PillLink href="/dashboard/platform/pipeline/create" variant="primary"><Plus />New pursuit</PillLink></Track>} />

    <section aria-label="Active pursuits by stage" className="overflow-hidden rounded-[6px] border bg-background">
      <ol className="grid grid-cols-2 sm:grid-cols-5">
        {activeStages.map((stage, index) => {
          const count = response.data[stage] ?? 0;
          return <li key={stage} className="relative min-w-0 border-b p-4 sm:border-b-0 sm:border-r sm:last:border-r-0 [&:nth-child(odd)]:border-r">
            <p className="font-mono text-[11px] tabular-nums text-muted-foreground">{String(index + 1).padStart(2, "0")}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><StatusDot tone={statusTone(stage)} />{stageLabel(stage)}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{count}</p>
            <div aria-hidden="true" className="mt-3 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-foreground/60" style={{ width: `${stageTotal ? Math.round((count / stageTotal) * 100) : 0}%` }} /></div>
          </li>;
        })}
      </ol>
    </section>

    <Panel id="pursuits" icon={BriefcaseBusiness} title="Pursuits" meta={`${opportunityCount} ${view.value === "all" ? "" : `${view.label.toLowerCase()} `}pursuits`} padded={false}
      actions={<ListPager label="Pursuit pages" page={page} totalPages={Math.max(1, Math.ceil(opportunityCount / PAGE_SIZE))} hrefFor={next => hrefFor({ page: next })} />}>
      <div className="px-4 pt-3 md:px-5"><SegmentTabs label="Filter pursuits" tabs={views.map(entry => ({ key: entry.value, label: entry.label, href: hrefFor({ view: entry.value, page: 1 }), active: entry.value === view.value }))} /></div>
      {opportunities.length === 0 ? <div className="p-4 md:p-5"><EmptyState compact title="No pursuits" action={<Track><PillLink href="/dashboard/platform/pipeline/create" variant="primary"><Plus />New pursuit</PillLink></Track>} /></div> : <>
        <ul className="mt-3 divide-y border-t md:hidden">{opportunities.map(item => {
          const overdue = isOverdue(item);
          return <li key={item.id} className="grid gap-2 px-4 py-3">
            <p className="text-xs text-muted-foreground">{item.number}{item.organization ? ` · ${item.organization}` : ""}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><Link href={`/dashboard/platform/pipeline/${item.id}`} className="text-sm font-medium underline-offset-4 hover:underline">{item.name}</Link><TitleStatus status={item.stage} label={stageLabel(item.stage)} /></div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs"><span className="font-semibold tabular-nums">{formatMinor(item.estimatedValueMinor, item.currencyCode, { whole: true })} · {(item.probabilityBps / 100).toFixed(0)}%</span><span className={overdue ? "font-medium text-rose-700 dark:text-rose-400" : "text-muted-foreground"}>{item.nextActionAt ? `Next ${formatDate(item.nextActionAt)}` : "No next action"}</span></div>
          </li>;
        })}</ul>
        <div className="relative mt-3 hidden overflow-x-auto border-t md:block"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b bg-muted/40 text-xs text-muted-foreground"><tr><th className="px-4 py-2 font-medium">Pursuit</th><th className="px-4 py-2 font-medium">Owner</th><th className="px-4 py-2 font-medium">Next action</th><th className="px-4 py-2 font-medium">Bid date</th><th className="px-4 py-2 text-right font-medium">Value</th><th className="px-4 py-2 text-right font-medium">Win %</th></tr></thead><tbody className="divide-y">{opportunities.map(item => {
          const overdue = isOverdue(item);
          return <tr key={item.id} className="transition-colors hover:bg-muted/30"><td className="px-4 py-3"><p className="text-xs text-muted-foreground">{item.number}{item.organization ? ` · ${item.organization}` : ""}</p><div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1"><Link href={`/dashboard/platform/pipeline/${item.id}`} className="font-medium underline-offset-4 hover:underline">{item.name}</Link><TitleStatus status={item.stage} label={stageLabel(item.stage)} /></div></td><td className="px-4 py-3 text-muted-foreground">{item.owner?.name ?? "Unassigned"}</td><td className={`px-4 py-3 tabular-nums ${overdue ? "font-medium text-rose-700 dark:text-rose-400" : "text-muted-foreground"}`}>{item.nextActionAt ? `${formatDate(item.nextActionAt)}${overdue ? " · Overdue" : ""}` : "—"}</td><td className="px-4 py-3 tabular-nums text-muted-foreground">{formatDate(item.targetBidDate)}</td><td className="px-4 py-3 text-right font-medium tabular-nums">{formatMinor(item.estimatedValueMinor, item.currencyCode, { whole: true })}</td><td className="px-4 py-3 text-right tabular-nums">{(item.probabilityBps / 100).toFixed(0)}%</td></tr>;
        })}</tbody></table></div>
      </>}
    </Panel>

    <Panel id="public-intake" icon={Inbox} title="Website inquiries" meta={`${intakeCount} received`} padded={false}
      actions={<ListPager label="Website inquiry pages" page={requestPage} totalPages={Math.max(1, Math.ceil(intakeCount / PAGE_SIZE))} hrefFor={next => hrefFor({ requestPage: next })} />}>
      {intake.length === 0 ? <div className="p-4 md:p-5"><EmptyState compact title="No website inquiries" /></div> : <ul className="divide-y">{intake.map(item => <li key={item.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center md:px-5">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{item.publicReference} · {readable(item.kind)}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1"><Link href={`/dashboard/platform/pipeline/requests/${item.id}`} className="text-sm font-medium underline-offset-4 hover:underline">{item.projectName || item.organization || item.contactName}</Link><TitleStatus status={item.status} /></div>
          <p className="mt-0.5 text-xs text-muted-foreground">{item.contactName}{item.organization ? ` · ${item.organization}` : ""}</p>
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">{formatDate(item.submittedAt)}</span>
      </li>)}</ul>}
    </Panel>
  </PlatformPage>;
}
