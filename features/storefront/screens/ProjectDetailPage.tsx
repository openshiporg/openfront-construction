import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { PublicShell } from "../components/PublicShell";
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
  return (
    <PublicShell site={site}>
      <main className="sf-main">
        <section className="sf-section sf-section--first" aria-labelledby="project-title">
          <div className="sf-wrap">
            <Link href="/projects" className="sf-doc__back"><ArrowLeft className="size-4" aria-hidden="true" />Projects</Link>
            <article>
              <div className="sf-doc" style={{ marginTop: "var(--space-xl)" }}>
                <p className="sf-doc__kicker">Project summary</p>
                <h1 id="project-title" className="sf-doc__title">{project.title}</h1>
                <p className="sf-doc__lede">{project.summary}</p>
              </div>
              {facts.length > 0 && (
                <dl className="sf-facts">
                  {facts.map(([label, value]) => (
                    <div key={label} className="sf-facts__row">
                      <dt className="sf-facts__dt">{label}</dt>
                      <dd className="sf-facts__dd">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {project.description && (
                <div className="sf-doc" style={{ marginTop: "var(--space-2xl)" }}>
                  <h2 className="sf-doc__kicker">About the project</h2>
                  <div className="sf-doc__body">{project.description}</div>
                </div>
              )}
              {project.approvedOutcome && (
                <div className="sf-doc" style={{ marginTop: "var(--space-2xl)" }}>
                  <h2 className="sf-doc__kicker">Outcome</h2>
                  <p className="sf-doc__body">{project.approvedOutcome}</p>
                </div>
              )}
              <div style={{ marginTop: "var(--space-2xl)" }}>
                <Link href="/start-a-project" className="sf-btn">Start a project <ArrowRight className="size-4" aria-hidden="true" /></Link>
              </div>
            </article>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
