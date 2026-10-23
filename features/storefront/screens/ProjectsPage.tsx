import { PublicShell } from "../components/PublicShell";
import { ProjectCard } from "../components/ProjectCard";
import { Empty, Pill, Track } from "../components/ui";
import { getPublicConstructionSite } from "../data";

export async function ProjectsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const [site, params] = await Promise.all([getPublicConstructionSite(), searchParams ?? Promise.resolve({} as Record<string, string | string[] | undefined>)]);
  if (!site) return <PublicShell site={null} />;
  const markets = [...new Set(site.projects.map(project => project.market).filter(Boolean))];
  const requested = Array.isArray(params.market) ? params.market[0] : params.market;
  const market = requested && markets.includes(requested) ? requested : "";
  const projects = market ? site.projects.filter(project => project.market === market) : site.projects;
  return (
    <PublicShell site={site} current="/projects">
      <main>
        <header className="sf-pagehead">
          <div className="sf-wrap">
            <p className="sf-kicker">Projects · {String(site.projects.length).padStart(2, "0")}</p>
            <h1 className="sf-display sf-h1">Our work</h1>
          </div>
        </header>
        <section className="sf-section" aria-label="Published projects">
          <div className="sf-wrap">
            {markets.length > 1 && (
              <nav aria-label="Filter by market" className="sf-segments">
                <Track scroll>
                  <Pill href="/projects" variant="quiet" size="sm" current={!market}>All</Pill>
                  {markets.map(entry => <Pill key={entry} href={`/projects?market=${encodeURIComponent(entry)}`} variant="quiet" size="sm" current={entry === market}>{entry}</Pill>)}
                </Track>
              </nav>
            )}
            {projects.length
              ? <ul className="sf-cards">{projects.map(project => <li key={project.slug}><ProjectCard project={project} headingLevel={2} /></li>)}</ul>
              : <Empty title="No published projects" action={<Track><Pill href="/contact" variant="raised">Contact us</Pill></Track>} />}
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
