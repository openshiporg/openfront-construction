import Link from "next/link";
import { ArrowUpRight, FolderKanban, Search } from "lucide-react";

import { CreateProjectPanel } from "../components/CreateProjectPanel";
import { ListPager, listHref, pageParam, textParam } from "../components/ListPager";
import { getConstructionPortfolio } from "../data";
import { EmptyState, PageHeader, PlatformPage, TitleStatus, formatDate, inputClass, pillClass, trackClass } from "@/features/platform/components/kit";

export async function ProjectsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const search = textParam(params.search);
  const portfolio = await getConstructionPortfolio(pageParam(params.page), search);
  const firstItem = portfolio.totalCount === 0 ? 0 : ((portfolio.page - 1) * portfolio.pageSize) + 1;
  const lastItem = firstItem === 0 ? 0 : firstItem + portfolio.projects.length - 1;
  return (
    <PlatformPage breadcrumbs={[{ type: "link", label: "Portfolio", href: "/platform/portfolio" }, { type: "page", label: "Projects" }]}>
      <PageHeader icon={FolderKanban} title="Projects" meta={portfolio.totalCount > 0 ? <span className="tabular-nums">{firstItem}–{lastItem} of {portfolio.totalCount}</span> : undefined} />
      {portfolio.canCreateProject && <CreateProjectPanel companies={portfolio.companies} defaultOpen={portfolio.totalCount === 0 && !search} />}
      <section aria-labelledby="projects-list-title" className="min-w-0 overflow-hidden rounded-xl border bg-background">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 md:px-5">
          <h2 id="projects-list-title" className="text-sm font-semibold">All projects</h2>
          <form role="search" action="/dashboard/platform/projects" className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
            <input type="search" name="search" defaultValue={search} placeholder="Name or number" aria-label="Search projects" className={`${inputClass} h-9 sm:w-64`} />
            <span className={trackClass}><button type="submit" className={pillClass("raised", "sm")}><Search />Search</button></span>
          </form>
        </div>
        {portfolio.projects.length === 0 ? (
          <div className="p-4 md:p-5"><EmptyState compact title={search ? "No projects match this search" : "No projects"} /></div>
        ) : (
          <ul className="divide-y">
            {portfolio.projects.map(project => {
              const execution = project.openRfis === null || project.openSubmittals === null ? null : project.openRfis + project.openSubmittals;
              return (
                <li key={project.id}>
                  <Link href={`/dashboard/platform/projects/${encodeURIComponent(project.id)}`} className="grid gap-3 px-4 py-3.5 transition-colors hover:bg-muted/30 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center md:px-5">
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">{project.projectNumber} · {project.companyName}</p>
                      <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1"><span className="min-w-0 break-words text-sm font-medium">{project.name}</span><TitleStatus status={project.status} /></div>
                    </div>
                    <dl className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
                      <div className="flex gap-1"><dt>Start</dt><dd className="tabular-nums text-foreground">{formatDate(project.startDate)}</dd></div>
                      <div className="flex gap-1"><dt>RFIs + submittals</dt><dd className="tabular-nums text-foreground">{execution ?? "—"}</dd></div>
                      <div className="flex gap-1"><dt>Changes</dt><dd className="tabular-nums text-foreground">{project.openChanges ?? "—"}</dd></div>
                      <ArrowUpRight className="hidden size-4 sm:block" aria-hidden="true" />
                    </dl>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {portfolio.totalPages > 1 && <div className="flex justify-end border-t px-4 py-3 md:px-5"><ListPager label="Project pages" page={portfolio.page} totalPages={portfolio.totalPages} hrefFor={next => listHref("/dashboard/platform/projects", { search, page: next })} /></div>}
      </section>
    </PlatformPage>
  );
}
