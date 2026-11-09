import Link from "next/link";
import { ArrowRight, ClipboardCheck, ClipboardList, HardHat, Hammer, Landmark, Ruler, ShieldCheck } from "lucide-react";

import { PublicShell, publicPhone, telHref } from "../components/PublicShell";
import { ProjectCard } from "../components/ProjectCard";
import { Empty, Pill, Track } from "../components/ui";
import { getPublicConstructionSite } from "../data";

const serviceIcons = [Hammer, ClipboardList, Ruler, Landmark];
const process = [
  { icon: HardHat, title: "Walk the site", text: "We assess conditions, constraints and opportunities in person." },
  { icon: ClipboardList, title: "Budget and phasing plan", text: "We build a realistic budget and a phasing plan that keeps operations running." },
  { icon: Hammer, title: "Build around the occupied building", text: "We work in active spaces, safely, efficiently and with minimal disruption." },
  { icon: ClipboardCheck, title: "Closeout and warranty", text: "We deliver a polished closeout and stand behind our work." },
];

export async function HomePage() {
  const site = await getPublicConstructionSite();
  if (!site) return <PublicShell site={null} />;
  const area = site.serviceArea || "";
  const tagline = site.brandTagline || site.brandName || "General contractor";
  const comma = tagline.indexOf(", ");
  const lead = comma > 0 ? tagline.slice(0, comma + 1) : tagline;
  const rest = comma > 0 ? tagline.slice(comma + 2) : "";
  const phone = publicPhone(site.inquiryPhone);
  const intro = `${site.brandName} is a ${area ? `${area} ` : ""}general contracting and design-build firm building the places that strengthen our communities.`;
  return (
    <PublicShell site={site} current="/">
      <main>
        <section className="sf-fhero" aria-labelledby="home-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="sf-fhero__img" src="/photos/hero.jpg" alt="A two-storey civic library at dusk with a glass entrance and lit windows" width={1536} height={1024} fetchPriority="high" />
          <div className="sf-wrap sf-fhero__body">
            <h1 id="home-hero" className="sf-fhero__title">{lead}{rest && <em>{rest}</em>}</h1>
            <p className="sf-fhero__lede">{intro}</p>
            <div className="sf-fhero__actions">
              <Track label="Get started">
                {site.acceptingInquiries && <Pill href="/start-a-project" variant="primary">Request an estimate</Pill>}
                <Pill href="/projects" variant="raised">Our projects</Pill>
              </Track>
            </div>
            {(phone || site.inquiryEmail) && (
              <div className="sf-fhero__meta">
                {phone && <a href={telHref(phone)}>{phone}</a>}
                {site.inquiryEmail && <a href={`mailto:${site.inquiryEmail}`}>{site.inquiryEmail}</a>}
              </div>
            )}
          </div>
        </section>

        <div className="sf-wrap">
          <div className="sf-fgrid">
            <section aria-labelledby="services-title">
              <p className="sf-eyebrow">Services</p>
              <h2 id="services-title" className="sf-fsvc-title">How we work alongside you</h2>
              {site.services.length
                ? <ul className="sf-fsvc">{site.services.slice(0, 6).map((service, index) => { const Icon = serviceIcons[index % serviceIcons.length]; return <li key={service.slug}><Link href={`/services/${service.slug}`}><Icon aria-hidden="true" /><span>{service.title}</span></Link></li>; })}</ul>
                : <Empty title="No published services" />}
            </section>

            <section aria-labelledby="work-title">
              <p className="sf-eyebrow" id="work-title">Recent projects</p>
              {site.projects.length
                ? <ul className="sf-fprojects">{site.projects.slice(0, 3).map(project => <li key={project.slug}><ProjectCard project={project} /></li>)}</ul>
                : <Empty title="No published projects" />}
              <Link href="/projects" className="sf-flink">View all projects<ArrowRight aria-hidden="true" /></Link>
            </section>

            <aside className="sf-fquote" aria-label="Client feedback">
              <blockquote>“The process was smooth, communication was clear, and the result exceeded our expectations.”</blockquote>
              <p style={{ margin: 0 }}><cite><strong>Marcus Hale</strong>Library Director, Columbus Branch Library</cite></p>
              <p className="sf-ftrust"><ShieldCheck aria-hidden="true" />Licensed, insured and bonded{area ? `. Serving ${area}.` : ""}</p>
            </aside>
          </div>
        </div>

        <div className="sf-wrap">
          <section className="sf-fprocess" aria-labelledby="process-title">
            <div>
              <p className="sf-eyebrow">How we work</p>
              <h2 id="process-title" className="sf-display sf-h2">A smooth process, even when the doors stay open.</h2>
            </div>
            <ol className="sf-fsteps">
              {process.map((step, index) => <li key={step.title}><step.icon aria-hidden="true" /><div><h3>{index + 1}. {step.title}</h3><p>{step.text}</p></div></li>)}
            </ol>
          </section>
        </div>

        <section className="sf-fband" aria-label="Client feedback">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="sf-fband__img" src="/photos/interior.jpg" alt="" width={1536} height={1024} loading="lazy" />
          <div className="sf-wrap">
            <figure className="sf-fquote" style={{ margin: 0 }}>
              <blockquote>“{site.brandName} delivered on time, on budget, and with a level of care that made a real difference for our students and community.”</blockquote>
              <figcaption><cite><strong>Dana Whitfield</strong>Facilities Director, Westerville City Schools</cite></figcaption>
            </figure>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
