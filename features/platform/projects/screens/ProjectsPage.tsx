import Link from "next/link";
import { ArrowUpRight, FolderKanban } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageContainer } from "@/features/dashboard/components/PageContainer";
import { CreateProjectPanel } from "../components/CreateProjectPanel";
import { ListPager, listHref, pageParam, textParam } from "../components/ListPager";
import { getConstructionPortfolio } from "../data";

export async function ProjectsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const search = textParam(params.search);
  const portfolio = await getConstructionPortfolio(pageParam(params.page), search);
  const firstItem = portfolio.totalCount === 0 ? 0 : ((portfolio.page - 1) * portfolio.pageSize) + 1;
  const lastItem = firstItem === 0 ? 0 : firstItem + portfolio.projects.length - 1;
  return (
    <PageContainer
      title="Projects"
      header={<div><h1 className="text-xl font-semibold tracking-tight md:text-2xl">Projects</h1></div>}
      breadcrumbs={[{ type: "link", label: "Portfolio", href: "/dashboard/platform/portfolio" }, { type: "page", label: "Projects" }]}
    >
      {portfolio.canCreateProject && <CreateProjectPanel companies={portfolio.companies} />}
      <section className="px-4 py-6 md:px-6" aria-labelledby="projects-list-title">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="projects-list-title" className="text-base font-semibold">All projects</h2>
            <p className="text-sm text-muted-foreground">{portfolio.totalCount === 0 ? "No matching projects." : `Showing ${firstItem}–${lastItem} of ${portfolio.totalCount}`}</p>
          </div>
          <ListPager label="Project pages" page={portfolio.page} totalPages={portfolio.totalPages} hrefFor={next => listHref("/dashboard/platform/projects", { search, page: next })} />
        </div>
        <form role="search" action="/dashboard/platform/projects" className="mb-4 flex max-w-md gap-2">
          <Input type="search" name="search" defaultValue={search} placeholder="Search name or number" aria-label="Search projects" />
          <Button type="submit" variant="outline">Search</Button>
        </form>

        {portfolio.projects.length === 0 ? (
          <div className="border-y py-14 text-center"><FolderKanban className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" /><h2 className="mt-3 font-medium">{search ? "No projects match this search" : "No projects"}</h2></div>
        ) : (
          <div className="divide-y border-y">
            {portfolio.projects.map(project => (
              <Link key={project.id} href={`/dashboard/platform/projects/${project.id}`} className="grid gap-3 px-1 py-4 hover:bg-muted/30 sm:grid-cols-[1fr_auto] sm:items-center md:px-3">
                <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">{project.name}</h3><Badge variant="outline">{project.status.replaceAll("_", " ")}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{project.companyName} · {project.projectNumber}</p></div>
                <div className="flex items-center gap-5 text-xs text-muted-foreground"><span>{project.openRfis === null || project.openSubmittals === null ? "—" : project.openRfis + project.openSubmittals} execution items</span><span>{project.openChanges ?? "—"} changes</span><ArrowUpRight className="h-4 w-4" aria-hidden="true" /></div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </PageContainer>
  );
}
