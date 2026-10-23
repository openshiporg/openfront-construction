import { PublicShell } from "../components/PublicShell";
import { ServiceTile } from "../components/ServiceTile";
import { Empty, Pill, Track } from "../components/ui";
import { getPublicConstructionSite } from "../data";

export async function ServicesPage() {
  const site = await getPublicConstructionSite();
  if (!site) return <PublicShell site={null} />;
  return (
    <PublicShell site={site} current="/services">
      <main>
        <header className="sf-pagehead">
          <div className="sf-wrap">
            <p className="sf-kicker">Services · {String(site.services.length).padStart(2, "0")}</p>
            <h1 className="sf-display sf-h1">Services</h1>
            {site.capabilitySummary && <p className="sf-lede">{site.capabilitySummary}</p>}
          </div>
        </header>
        <section className="sf-section" aria-label="Published services">
          <div className="sf-wrap">
            {site.services.length
              ? <ul className="sf-tiles">{site.services.map((service, index) => <li key={service.slug}><ServiceTile service={service} index={index} /></li>)}</ul>
              : <Empty title="No published services" action={<Track><Pill href="/contact" variant="raised">Contact us</Pill></Track>} />}
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
