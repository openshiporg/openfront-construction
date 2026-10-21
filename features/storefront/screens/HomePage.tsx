import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";

import { PublicShell } from "../components/PublicShell";
import { getPublicConstructionSite } from "../data";

function SitePlanSVG({ label }: { label: string }) {
  return (
    <figure className="sf-hero__fig" aria-label={label}>
      <svg viewBox="0 0 640 340" role="img" aria-label={label} fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* sheet frame */}
        <rect x="1" y="1" width="638" height="338" stroke="var(--sf-rule-2)" strokeWidth="1" />
        <rect x="8" y="8" width="624" height="324" stroke="var(--sf-rule-2)" strokeWidth="1" />
        {/* parcel */}
        <path d="M60 250 L210 60 H430 L600 250 Z" stroke="var(--sf-ink)" strokeWidth="2" opacity="0.85" />
        {/* building footprint */}
        <rect x="180" y="110" width="230" height="120" stroke="var(--sf-ink)" strokeWidth="2" opacity="0.9" />
        {/* interior partitions */}
        <path d="M180 145 H410 M180 180 H410 M270 110 V230 M340 110 V230" stroke="var(--sf-ink)" strokeWidth="1" opacity="0.4" />
        {/* dimension line */}
        <line x1="180" y1="262" x2="410" y2="262" stroke="var(--sf-accent)" strokeWidth="1.5" />
        <line x1="180" y1="256" x2="180" y2="268" stroke="var(--sf-accent)" strokeWidth="1.5" />
        <line x1="410" y1="256" x2="410" y2="268" stroke="var(--sf-accent)" strokeWidth="1.5" />
        {/* north arrow */}
        <g transform="translate(560,60)">
          <line x1="0" y1="28" x2="0" y2="-4" stroke="var(--sf-ink)" strokeWidth="1.5" />
          <path d="M0 -10 L -8 6 L 0 2 L 8 6 Z" fill="var(--sf-ink)" />
        </g>
        {/* sheet stamps */}
        <g className="sf-plate-stamp">
          <text x="16" y="320">DRAWING 01 · SITE PLAN</text>
          <text x="16" y="24">SCALE 1:200</text>
        </g>
      </svg>
      <figcaption className="sf-figcap">Site plan · illustrative</figcaption>
    </figure>
  );
}

export async function HomePage() {
  const site = await getPublicConstructionSite();
  if (!site) return <PublicShell site={null} />;
  const area = site.serviceArea || "";
  const tagline = site.brandTagline || "Construction services";
  const summary = site.capabilitySummary || "";
  return (
    <PublicShell site={site}>
      <main className="sf-main">
        {/* Marquee hero */}
        <section className="sf-hero" aria-labelledby="home-hero">
          <div className="sf-hero__grid" aria-hidden="true" />
          <div className="sf-wrap">
            <div className="sf-hero__sheetmeta sf-reveal sf-reveal--1">
              {area ? <span>General contractor · {area}</span> : <span>General contractor</span>}
              {area && <span>{area}</span>}
            </div>
            <h1 id="home-hero" className="sf-hero__title sf-reveal sf-reveal--2">{tagline}</h1>
            {summary && <p className="sf-hero__lede sf-reveal sf-reveal--3">{summary}</p>}
          </div>
          <div className="sf-wrap">
            <hr className="sf-hero__rule" aria-hidden="true" />
            <div className="sf-hero__row sf-reveal sf-reveal--3">
              <SitePlanSVG label="Illustrative site plan" />
              <div className="sf-hero__actions">
                <Link href="/start-a-project" className="sf-btn">Request an estimate <ArrowRight className="size-4" aria-hidden="true" /></Link>
                <Link href="/projects" className="sf-btn sf-btn--ghost">View our work</Link>
              </div>
            </div>
          </div>
        </section>

        {/* Services — what we build / for whom */}
        <section className="sf-section" aria-labelledby="services-title">
          <div className="sf-wrap">
            <div className="sf-head sf-head--bold">
              <h2 id="services-title" className="sf-head__title">What we build</h2>

            </div>
            {site.services.length ? (
              <div className="sf-spec">
                {site.services.slice(0, 4).map((service, index) => (
                  <article key={service.slug} className="sf-spec__row">
                    <div>
                      <p className="sf-spec__num">{String(index + 1).padStart(2, "0")}</p>
                      <h3 className="sf-spec__title">{service.title}</h3>
                    </div>
                    {service.market && <p className="sf-spec__market">{service.market}</p>}
                    <p className="sf-spec__text">{service.summary}</p>
                    <Link href={`/services/${service.slug}`} className="sf-spec__go">Service detail <ArrowRight className="size-4" aria-hidden="true" /></Link>
                  </article>
                ))}
              </div>
            ) : (
              <p className="sf-empty">We are preparing our published services. Please check back, or get in touch to discuss your project.</p>
            )}
            {site.services.length > 4 && (
              <Link href="/services" className="sf-morelink">All services <ArrowRight className="size-4" aria-hidden="true" /></Link>
            )}
          </div>
        </section>

        {/* Portfolio — published work */}
        <section className="sf-section" aria-labelledby="work-title">
          <div className="sf-wrap">
            <div className="sf-head">
              <h2 id="work-title" className="sf-head__title">Recent work</h2>

            </div>
            {site.projects.length ? (
              <div className="sf-ledger">
                {site.projects.slice(0, 4).map(project => (
                  <Link key={project.slug} href={`/projects/${project.slug}`} className="sf-ledger__row">
                    <div className="sf-ledger__text-row">
                      <p className="sf-ledger__meta">{[project.market, project.locationLabel].filter(Boolean).join(" · ")}</p>
                      <h3 className="sf-ledger__title">{project.title}</h3>
                      <p className="sf-ledger__text">{project.summary}</p>
                    </div>
                    <span className="sf-ledger__go">Project details <ArrowRight className="size-4" aria-hidden="true" /></span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="sf-empty">Approved project summaries are being prepared. Get in touch to hear about our recent work.</p>
            )}
            {site.projects.length > 4 && (
              <Link href="/projects" className="sf-morelink">All projects <ArrowRight className="size-4" aria-hidden="true" /></Link>
            )}
          </div>
        </section>

        {/* Service area + estimate inquiry */}
        <section className="sf-section" aria-labelledby="estimate-title">
          <div className="sf-wrap sf-boundary">
            <div>
              <h2 id="estimate-title" className="sf-boundary__title">Ready to start?</h2>
              {area && (
                <p className="sf-boundary__text" style={{ display: "flex", gap: "var(--space-xs)", marginTop: "var(--space-md)" }}>
                  <MapPin className="size-5 shrink-0" aria-hidden="true" />
                  <span>Serving {area}.</span>
                </p>
              )}

            </div>
            <nav aria-label="Get in touch" className="sf-boundary__list">
              <Link href="/start-a-project" className="sf-boundary__item">Request an estimate <ArrowRight className="size-4" aria-hidden="true" /></Link>
              <Link href="/contact" className="sf-boundary__item">Contact the team <ArrowRight className="size-4" aria-hidden="true" /></Link>
              <Link href="/trade-partners" className="sf-boundary__item">Work with us as a trade partner <ArrowRight className="size-4" aria-hidden="true" /></Link>
            </nav>
          </div>
        </section>

      </main>
    </PublicShell>
  );
}
