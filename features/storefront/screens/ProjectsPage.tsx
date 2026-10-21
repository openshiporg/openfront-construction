import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PublicShell } from "../components/PublicShell";
import { getPublicConstructionSite } from "../data";

export async function ProjectsPage() {
  const site = await getPublicConstructionSite();
  return (
    <PublicShell site={site}>
      <main className="sf-main">
        <section className="sf-hero" aria-labelledby="projects-hero">
          <div className="sf-hero__grid" aria-hidden="true" />
          <div className="sf-wrap">
            <p className="sf-doc__kicker">Our work</p>
            <h1 id="projects-hero" className="sf-doc__title">Projects</h1>
            <p className="sf-doc__lede">Approved project summaries we are able to publish. Some project details stay confidential for our clients, and that is by design.</p>
          </div>
        </section>
        <section className="sf-section sf-section--first" aria-label="Published projects">
          <div className="sf-wrap">
            {site?.projects.length ? (
              <div className="sf-ledger">
                {site.projects.map(project => (
                  <Link key={project.slug} href={`/projects/${project.slug}`} className="sf-ledger__row">
                    <div className="sf-ledger__text-row">
                      <p className="sf-ledger__meta">{[project.market, project.locationLabel, project.completionLabel].filter(Boolean).join(" · ")}</p>
                      <h2 className="sf-ledger__title">{project.title}</h2>
                      <p className="sf-ledger__text">{project.summary}</p>
                    </div>
                    <span className="sf-ledger__go">Project details <ArrowRight className="size-4" aria-hidden="true" /></span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="sf-empty">
                <h2>Project pages are being prepared</h2>
                <p style={{ marginTop: "var(--space-xs)" }}>Approved case studies are not published yet. Get in touch and we can share examples of our recent work directly.</p>
              </div>
            )}
            <div style={{ marginTop: "var(--space-2xl)" }}>
              <Link href="/start-a-project" className="sf-btn">Request an estimate</Link>
            </div>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
