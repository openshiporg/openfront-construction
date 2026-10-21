import Link from "next/link";
import { ArrowUpRight, FolderKanban } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/features/dashboard/components/PageContainer";
import { getConstructionPortfolio } from "@/features/platform/projects/data";
import { MetricList } from "@/features/platform/projects/components/MetricList";
import { ListPager, listHref, pageParam } from "@/features/platform/projects/components/ListPager";

function formatMinor(value: string, currencyCode = "USD") {
  if (currencyCode !== "USD") return `Withheld (${currencyCode})`;
  try {
    const minor = BigInt(value);
    const absolute = minor < 0 ? -minor : minor;
    return `${minor < 0 ? "-" : ""}USD ${(absolute / BigInt(100)).toLocaleString()}.${(absolute % BigInt(100)).toString().padStart(2, "0")}`;
  } catch {
    return "USD —";
  }
}

export async function PortfolioPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const page = pageParam((await searchParams).page);
  const portfolio = await getConstructionPortfolio(page);
  const showFinancials = portfolio.projects.some(project => project.revisedBudgetMinor !== null);
  const noCompany = portfolio.companies.length === 0;

  return (
    <PageContainer
      title="Portfolio"
      breadcrumbs={[{ type: "page", label: "Portfolio" }]}
      header={<div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between"><h1 className="text-xl font-semibold tracking-tight md:text-2xl">Portfolio</h1><Link href="/dashboard/platform/projects" className="inline-flex items-center gap-1 text-sm font-medium">All projects <ArrowUpRight className="h-4 w-4" /></Link></div>}
    >
      {portfolio.totalCount > 0 && <MetricList metrics={portfolio.metrics} label="Portfolio summary" />}
      <section className="px-4 py-6 md:px-6" aria-labelledby="portfolio-projects-title">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="portfolio-projects-title" className="text-base font-semibold">Projects</h2>
            {portfolio.totalCount > 0 && <p className="text-sm text-muted-foreground">{portfolio.totalCount} projects</p>}
          </div>
          <ListPager label="Portfolio pages" page={portfolio.page} totalPages={portfolio.totalPages} hrefFor={next => listHref("/dashboard/platform/portfolio", { page: next })} />
        </div>
        {portfolio.projects.length === 0 ? (
          <div className="border-y py-14 text-center">
            <FolderKanban className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <h3 className="mt-3 font-medium">{noCompany ? "No company yet" : "No projects"}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{noCompany ? "Set up your company and first project." : portfolio.canCreateProject ? "Create a project to get started." : "Projects you are added to appear here."}</p>
            {(noCompany || portfolio.canCreateProject) && (
              <div className="mt-4 flex justify-center">
                <Link href={noCompany ? "/dashboard/platform/setup" : "/dashboard/platform/projects"} className="inline-flex items-center gap-1 text-sm font-medium">{noCompany ? "Open onboarding" : "Create project"} <ArrowUpRight className="h-4 w-4" /></Link>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto border-y">
            <table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-muted/40 text-xs text-muted-foreground"><tr><th className="px-3 py-2 font-medium">Project</th><th className="px-3 py-2 font-medium">Status</th>{showFinancials && <><th className="px-3 py-2 text-right font-medium">Revised budget</th><th className="px-3 py-2 text-right font-medium">Actual cost</th></>}<th className="px-3 py-2 text-right font-medium">Execution</th><th className="px-3 py-2 text-right font-medium">Risk / closeout</th></tr></thead><tbody className="divide-y">{portfolio.projects.map(project => <tr key={project.id}><td className="px-3 py-3"><Link href={`/dashboard/platform/projects/${project.id}`} className="font-medium hover:underline">{project.name}</Link><p className="text-xs text-muted-foreground">{project.companyName} · {project.projectNumber}</p></td><td className="px-3 py-3"><Badge variant="outline">{project.status.replaceAll("_", " ")}</Badge></td>{showFinancials && <><td className="px-3 py-3 text-right tabular-nums">{project.revisedBudgetMinor === null ? "—" : formatMinor(project.revisedBudgetMinor, project.currencyCode)}</td><td className="px-3 py-3 text-right tabular-nums">{project.actualCostMinor === null ? "—" : formatMinor(project.actualCostMinor, project.currencyCode)}</td></>}<td className="px-3 py-3 text-right tabular-nums">{project.openRfis ?? "—"} RFI · {project.openSubmittals ?? "—"} submittal</td><td className="px-3 py-3 text-right tabular-nums">{project.openChanges ?? "—"} change · {project.openPunch === null || project.openSafety === null ? "—" : project.openPunch + project.openSafety} field</td></tr>)}</tbody></table>
          </div>
        )}
      </section>
    </PageContainer>
  );
}
