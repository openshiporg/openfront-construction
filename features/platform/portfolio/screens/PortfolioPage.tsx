import Link from "next/link";
import { Building2, FolderKanban, Plus } from "lucide-react";

import { getConstructionPortfolio, type ProjectSummary } from "@/features/platform/projects/data";
import { MetricList } from "@/features/platform/projects/components/MetricList";
import { ListPager, listHref, pageParam } from "@/features/platform/projects/components/ListPager";
import { EmptyState, PageHeader, PillLink, PlatformPage, StatusDot, TitleStatus, Track, formatDate, formatMinor } from "@/features/platform/components/kit";

function money(value: string | null, currencyCode: string) {
  if (value === null) return "—";
  return currencyCode === "USD" ? formatMinor(value, "USD", { whole: true }) : `Withheld (${currencyCode})`;
}

/** Spent against revised budget, as a bar that turns amber past 90% and rose past 100%. */
function BudgetBar({ project }: { project: ProjectSummary }) {
  if (project.revisedBudgetMinor === null || project.actualCostMinor === null || project.currencyCode !== "USD") return null;
  let ratio = 0;
  try {
    const budget = Number(BigInt(project.revisedBudgetMinor));
    ratio = budget > 0 ? Number(BigInt(project.actualCostMinor)) / budget : 0;
  } catch { return null; }
  const width = Math.max(0, Math.min(1, ratio)) * 100;
  const tone = ratio > 1 ? "bg-rose-500" : ratio > 0.9 ? "bg-amber-500" : "bg-foreground/70";
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-muted-foreground">Cost to date</span>
        <span className="tabular-nums"><span className="font-semibold">{money(project.actualCostMinor, project.currencyCode)}</span><span className="text-muted-foreground"> / {money(project.revisedBudgetMinor, project.currencyCode)}</span></span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${Math.round(ratio * 100)}% of revised budget spent`}><div className={`h-full rounded-full ${tone}`} style={{ width: `${width}%` }} /></div>
    </div>
  );
}

function Count({ label, value, attention }: { label: string; value: number | null; attention?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">{attention && value ? <StatusDot tone="amber" /> : null}{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold tabular-nums">{value ?? "—"}</dd>
    </div>
  );
}

function ProjectCard({ project }: { project: ProjectSummary }) {
  return (
    <li className="min-w-0">
      <Link href={`/dashboard/platform/projects/${encodeURIComponent(project.id)}`} className="group grid h-full min-w-0 gap-4 rounded-[6px] border bg-background p-4 transition-shadow hover:shadow-[0_1px_3px_rgb(0_0_0/0.08),0_0_0_1px_rgb(0_0_0/0.04)] md:p-5">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{project.projectNumber} · {project.companyName}</p>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="min-w-0 break-words text-base font-semibold tracking-tight group-hover:underline group-hover:underline-offset-4">{project.name}</h3>
            <TitleStatus status={project.status} />
          </div>
          {(project.startDate || project.completionDate) && <p className="mt-1 text-xs tabular-nums text-muted-foreground">{formatDate(project.startDate)} → {formatDate(project.completionDate)}</p>}
        </div>
        <BudgetBar project={project} />
        <dl className="grid grid-cols-3 gap-3 border-t pt-3 sm:grid-cols-5">
          <Count label="RFIs" value={project.openRfis} attention />
          <Count label="Submittals" value={project.openSubmittals} attention />
          <Count label="Changes" value={project.openChanges} attention />
          <Count label="Punch" value={project.openPunch} />
          <Count label="Safety" value={project.openSafety} attention />
        </dl>
      </Link>
    </li>
  );
}

export async function PortfolioPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const page = pageParam((await searchParams).page);
  const portfolio = await getConstructionPortfolio(page);
  const noCompany = portfolio.companies.length === 0;

  return (
    <PlatformPage breadcrumbs={[{ type: "page", label: "Portfolio" }]}>
      <PageHeader
        icon={Building2}
        title="Portfolio"
        meta={portfolio.totalCount > 0 ? <span className="tabular-nums">{portfolio.totalCount} projects</span> : undefined}
        actions={<Track>{portfolio.canCreateProject ? <PillLink href="/dashboard/platform/projects" variant="primary"><Plus />New project</PillLink> : null}<PillLink href="/dashboard/platform/projects">All projects</PillLink></Track>}
      />
      {portfolio.totalCount > 0 && <MetricList metrics={portfolio.metrics} label="Portfolio summary" />}
      {portfolio.projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={noCompany ? "No company yet" : "No projects"}
          action={noCompany ? <Track><PillLink href="/dashboard/platform/setup" variant="primary">Set up company</PillLink></Track> : portfolio.canCreateProject ? <Track><PillLink href="/dashboard/platform/projects" variant="primary"><Plus />New project</PillLink></Track> : undefined}
        />
      ) : (
        <section aria-labelledby="portfolio-projects-title" className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="portfolio-projects-title" className="text-sm font-semibold">Projects</h2>
            <ListPager label="Portfolio pages" page={portfolio.page} totalPages={portfolio.totalPages} hrefFor={next => listHref("/dashboard/platform/portfolio", { page: next })} />
          </div>
          <ul className="grid gap-4 lg:grid-cols-2">{portfolio.projects.map(project => <ProjectCard key={project.id} project={project} />)}</ul>
        </section>
      )}
    </PlatformPage>
  );
}
