import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PublicShell } from "../components/PublicShell";
import { getPublicConstructionSite } from "../data";

export async function ServicesPage() {
  const site = await getPublicConstructionSite();
  if (!site) return <PublicShell site={null} />;
  return (
    <PublicShell site={site}>
      <main className="sf-main">
        <section className="sf-hero" aria-labelledby="services-hero">
          <div className="sf-hero__grid" aria-hidden="true" />
          <div className="sf-wrap">
            <p className="sf-doc__kicker">Our services</p>
            <h1 id="services-hero" className="sf-doc__title">Services</h1>
            <p className="sf-doc__lede">{site.capabilitySummary || "Published services we can take on for owners, developers, and facility teams."}</p>
          </div>
        </section>
        <section className="sf-section sf-section--first" aria-label="Published services">
          <div className="sf-wrap">
            {site?.services.length ? (
              <div className="sf-spec">
                {site.services.map((service, index) => (
                  <article key={service.slug} className="sf-spec__row">
                    <div>
                      <p className="sf-spec__num">{String(index + 1).padStart(2, "0")}</p>
                      <h2 className="sf-spec__title">{service.title}</h2>
                    </div>
                    {service.market && <p className="sf-spec__market">{service.market}</p>}
                    <p className="sf-spec__text">{service.summary}</p>
                    <Link href={`/services/${service.slug}`} className="sf-spec__go">Details <ArrowRight className="size-4" aria-hidden="true" /></Link>
                  </article>
                ))}
              </div>
            ) : (
              <div className="sf-empty">
                <h2>Services are being prepared</h2>
                <p style={{ marginTop: "var(--space-xs)" }}>Our published service list is not available yet. Get in touch and we will discuss what you need.</p>
              </div>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-md)", marginTop: "var(--space-2xl)" }}>
              <Link href="/start-a-project" className="sf-btn">Request an estimate</Link>
              <Link href="/contact" className="sf-btn sf-btn--ghost">Ask a question</Link>
            </div>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
