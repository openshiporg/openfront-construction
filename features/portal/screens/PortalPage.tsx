import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getConstructionPortfolio } from "@/features/platform/projects/data";
import { MerchantMark } from "@/features/portal/components/MerchantMark";

export async function PortalPage() {
  const portfolio = await getConstructionPortfolio();
  return (
    <main className="mx-auto min-h-svh max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <header className="border-b pb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Your projects</h1>
      </header>
      <section className="py-8" aria-labelledby="portal-projects">
        <h2 id="portal-projects" className="sr-only">Projects</h2>
        {portfolio.projects.length === 0 ? (
          <div className="mt-5 border-y py-12 text-center"><Building2 className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-3 font-medium">No projects yet</p><p className="mt-1 text-sm text-muted-foreground">Projects appear here once the contractor invites you.</p></div>
        ) : (
          <div className="mt-5 divide-y border-y">
            {portfolio.projects.map(project => (
              <Link key={project.id} href={`/portal/projects/${encodeURIComponent(project.id)}`} className="grid gap-4 py-5 hover:bg-muted/30 sm:grid-cols-[1fr_auto] sm:items-center sm:px-3">
                <div className="flex items-center gap-3"><MerchantMark logoIcon={project.logoIcon} logoColor={project.logoColor} brandColor={project.brandColor} initials={project.brandMark || project.companyName.slice(0, 2).toUpperCase()} /><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">{project.name}</h3><Badge variant="outline">{project.status.replaceAll("_", " ")}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{project.brandName} · {project.projectNumber}</p></div></div>
                <span className="inline-flex items-center gap-1 text-sm font-medium">Open project <ArrowRight className="h-4 w-4" /></span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
