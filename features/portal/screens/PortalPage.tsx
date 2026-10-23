import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { getConstructionPortfolio } from "@/features/platform/projects/data";
import { MerchantMark } from "@/features/portal/components/MerchantMark";
import { Empty, Status, readableStatus, statusDot } from "@/features/storefront/components/ui";

export async function PortalPage() {
  const portfolio = await getConstructionPortfolio();
  return (
    <main>
      <header className="sf-pagehead">
        <div className="sf-wrap">
          <p className="sf-kicker">Client portal · {String(portfolio.projects.length).padStart(2, "0")}</p>
          <h1 className="sf-display sf-h1">Your projects</h1>
        </div>
      </header>
      <section className="sf-section" aria-label="Projects">
        <div className="sf-wrap">
          {portfolio.projects.length === 0 ? <Empty title="No projects yet" /> : (
            <ul className="sf-list">
              {portfolio.projects.map(project => (
                <li key={project.id}>
                  <Link href={`/portal/projects/${encodeURIComponent(project.id)}`} className="sf-list__item sf-list__item--split">
                    <span style={{ display: "flex", alignItems: "center", gap: "0.85rem", minWidth: 0 }}>
                      <MerchantMark className="size-10" logoIcon={project.logoIcon} logoColor={project.logoColor} brandColor={project.brandColor} initials={project.brandMark || project.companyName.slice(0, 2).toUpperCase()} />
                      <span className="sf-stack" style={{ gap: "0.25rem" }}>
                        <span className="sf-list__ref">{project.projectNumber} · {project.brandName || project.companyName}</span>
                        <span className="sf-list__title">{project.name}<Status tone={statusDot(project.status)}>{readableStatus(project.status)}</Status></span>
                      </span>
                    </span>
                    <ArrowRight aria-hidden="true" width={18} height={18} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
