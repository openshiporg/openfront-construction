import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PublicShell } from "../components/PublicShell";
import { ProjectCard } from "../components/ProjectCard";
import { Pill, SectionHead, Status, Track, completionTone, monogram } from "../components/ui";
import { getPublicConstructionProject, getPublicConstructionSite } from "../data";

export async function ProjectDetailPage({ slug }: { slug: string }) {
  const [site, project] = await Promise.all([getPublicConstructionSite(), getPublicConstructionProject(slug)]);
  if (!project) notFound();
  const facts = [
    ["Market", project.market],
    ["Location", project.locationLabel],
    ["Delivery", project.deliveryMethod],
    ["Status", project.completionLabel],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
  const related = (site?.projects ?? []).filter(entry => entry.slug !== project.slug && (!project.market || entry.market === project.market)).slice(0, 3);
  return (
    <PublicShell site={site} current="/projects">
      <main>
        <section className="sf-slab sf-grid-bg" aria-labelledby="project-title">
          <div className="sf-wrap sf-hero">
            <div className="sf-back"><Track><Pill href="/projects" variant="raised" size="sm"><ArrowLeft />Projects</Pill></Track></div>
            <div className="sf-hero__grid">
              <div>
                <p className="sf-kicker">{[project.market, project.locationLabel].filter(Boolean).join(" · ") || "Project"}</p>
                <h1 id="project-title" className="sf-display sf-h1 sf-hero__title">{project.title}</h1>
                {project.completionLabel && <p className="sf-mt"><Status tone={completionTone(project.completionLabel)}>{project.completionLabel}</Status></p>}
                <p className="sf-lede sf-hero__lede">{project.summary}</p>
              </div>
              <div className="sf-plate sf-plate--tall" aria-hidden="true" style={{ borderRadius: "1rem", border: "1px solid var(--sf-slab-rule)" }}>
                <div className="sf-plate__meta"><span>{project.market || "Project"}</span><span>{project.deliveryMethod}</span></div>
                <span className="sf-plate__mono">{monogram(project.title)}</span>
              </div>
            </div>
          </div>
          <div className="sf-tape" aria-hidden="true" />
        </section>
        <section className="sf-section">
          <div className="sf-wrap sf-stack sf-stack--lg">
            {facts.length > 0 && <dl className="sf-spec">{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
            <div className="sf-split">
              <div className="sf-prose">
                {project.description && <div><h2>The project</h2><p className="sf-body">{project.description}</p></div>}
                {project.approvedOutcome && <div><h2>Outcome</h2><p className="sf-body">{project.approvedOutcome}</p></div>}
              </div>
              {site?.acceptingInquiries && (
                <aside className="sf-panel sf-sticky" aria-labelledby="similar-title">
                  <h2 id="similar-title" className="sf-panel__title">Planning something similar?</h2>
                  <div className="sf-mt"><Track wrap><Pill href="/start-a-project" variant="primary">Request an estimate</Pill><Pill href="/contact" variant="quiet">Contact</Pill></Track></div>
                </aside>
              )}
            </div>
          </div>
        </section>
        {related.length > 0 && (
          <section className="sf-section" aria-labelledby="related-title">
            <div className="sf-wrap">
              <SectionHead id="related-title" title="More projects" />
              <ul className="sf-cards">{related.map(entry => <li key={entry.slug}><ProjectCard project={entry} /></li>)}</ul>
            </div>
          </section>
        )}
      </main>
    </PublicShell>
  );
}
