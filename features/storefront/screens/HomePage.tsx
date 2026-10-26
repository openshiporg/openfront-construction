import Link from "next/link";
import { ArrowRight, Mail, Phone } from "lucide-react";

import { PublicShell, telHref } from "../components/PublicShell";
import { ProjectCard } from "../components/ProjectCard";
import { ServiceTile } from "../components/ServiceTile";
import { Empty, Pill, SectionHead, Status, Track } from "../components/ui";
import { getPublicConstructionSite } from "../data";

export async function HomePage() {
  const site = await getPublicConstructionSite();
  if (!site) return <PublicShell site={null} />;
  const area = site.serviceArea || "";
  const tagline = site.brandTagline || site.brandName || "General contractor";
  const markets = [...new Set([...site.services, ...site.projects].map(entry => entry.market).filter(Boolean))];
  return (
    <PublicShell site={site} current="/">
      <main>
        <section className="sf-slab" aria-labelledby="home-hero">
          <div className="sf-wrap sf-hero">
            <div className="sf-hero__grid">
              <div>
                <p className="sf-kicker">
                  {site.acceptingInquiries ? <Status tone="ok">Taking new projects</Status> : <Status tone="idle">Not taking new projects</Status>}
                  {area && <span>· {area}</span>}
                </p>
                <h1 id="home-hero" className="sf-display sf-h1 sf-hero__title">{tagline}</h1>
                {site.capabilitySummary && <p className="sf-lede sf-hero__lede">{site.capabilitySummary}</p>}
                <div className="sf-hero__actions">
                  <Track label="Get started">
                    {site.acceptingInquiries && <Pill href="/start-a-project" variant="primary">Request an estimate<ArrowRight /></Pill>}
                    <Pill href="/projects" variant="raised">Our projects</Pill>
                  </Track>
                </div>
              </div>
              <aside className="sf-board" aria-label="Contractor facts">
                <div className="sf-board__head"><span>{site.brandName}</span>{area ? <span>{area}</span> : null}</div>
                <dl className="sf-board__rows">
                  {area && <div className="sf-board__row"><dt>Service area</dt><dd>{area}</dd></div>}
                  <div className="sf-board__row"><dt>Services</dt><dd className="sf-board__big">{site.services.length}</dd></div>
                  <div className="sf-board__row"><dt>Projects</dt><dd className="sf-board__big">{site.projects.length}</dd></div>
                  {markets.length > 0 && <div className="sf-board__row"><dt>Markets</dt><dd>{markets.slice(0, 4).join(" · ")}</dd></div>}
                  {site.inquiryPhone && <div className="sf-board__row"><dt>Phone</dt><dd><a href={telHref(site.inquiryPhone)}>{site.inquiryPhone}</a></dd></div>}
                  {site.inquiryEmail && <div className="sf-board__row"><dt>Email</dt><dd><a href={`mailto:${site.inquiryEmail}`}>{site.inquiryEmail}</a></dd></div>}
                </dl>
              </aside>
            </div>
          </div>
        </section>

        <section className="sf-section" aria-labelledby="services-title">
          <div className="sf-wrap">
            <SectionHead id="services-title" title="What we build" action={site.services.length > 6 ? <Track><Pill href="/services" variant="raised" size="sm">All services<ArrowRight /></Pill></Track> : undefined} />
            {site.services.length
              ? <ul className="sf-tiles">{site.services.slice(0, 6).map((service, index) => <li key={service.slug}><ServiceTile service={service} index={index} /></li>)}</ul>
              : <Empty title="No published services" />}
          </div>
        </section>

        <section className="sf-section" aria-labelledby="work-title">
          <div className="sf-wrap">
            <SectionHead id="work-title" title="Recent work" action={site.projects.length > 3 ? <Track><Pill href="/projects" variant="raised" size="sm">All projects<ArrowRight /></Pill></Track> : undefined} />
            {site.projects.length
              ? <ul className="sf-cards">{site.projects.slice(0, 3).map(project => <li key={project.slug}><ProjectCard project={project} /></li>)}</ul>
              : <Empty title="No published projects" />}
          </div>
        </section>

        <section className="sf-slab" aria-labelledby="estimate-title">
          <div className="sf-wrap sf-section">
            <div className="sf-split">
              <div>
                <h2 id="estimate-title" className="sf-display sf-h2">Start a project</h2>
                <div className="sf-mt-lg">
                  <Track label="Start a project" wrap>
                    {site.acceptingInquiries && <Pill href="/start-a-project" variant="primary">Request an estimate</Pill>}
                    {site.acceptingInquiries && <Pill href="/rfp" variant="raised">Invite us to bid</Pill>}
                    <Pill href="/trade-partners" variant="quiet">Trade partners</Pill>
                  </Track>
                </div>
              </div>
              {(site.inquiryPhone || site.inquiryEmail) && (
                <div className="sf-contact">
                  {site.inquiryPhone && <a href={telHref(site.inquiryPhone)}><Phone />{site.inquiryPhone}</a>}
                  {site.inquiryEmail && <a href={`mailto:${site.inquiryEmail}`}><Mail />{site.inquiryEmail}</a>}
                  <Link href="/contact" className="sf-small sf-link">Contact form</Link>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
