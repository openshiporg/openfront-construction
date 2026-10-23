import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone } from "lucide-react";

import { PublicShell, telHref } from "../components/PublicShell";
import { Pill, Status, Track } from "../components/ui";
import { getPublicConstructionService, getPublicConstructionSite } from "../data";

export async function ServiceDetailPage({ slug }: { slug: string }) {
  const [site, service] = await Promise.all([getPublicConstructionSite(), getPublicConstructionService(slug)]);
  if (!service) notFound();
  const index = site ? site.services.findIndex(entry => entry.slug === service.slug) : -1;
  return (
    <PublicShell site={site} current="/services">
      <main>
        <header className="sf-pagehead">
          <div className="sf-wrap">
            <div className="sf-back"><Track><Pill href="/services" variant="raised" size="sm"><ArrowLeft />Services</Pill></Track></div>
            <p className="sf-kicker">{index >= 0 ? `SVC-${String(index + 1).padStart(2, "0")}` : "Service"}{service.market && <span>· {service.market}</span>}</p>
            <h1 className="sf-display sf-h1">{service.title}</h1>
            <p className="sf-lede">{service.summary}</p>
          </div>
        </header>
        <section className="sf-section">
          <div className="sf-wrap sf-split">
            <div className="sf-prose">
              {service.details ? <div><h2>Scope</h2><p className="sf-body">{service.details}</p></div> : null}
              {service.market ? <dl className="sf-spec"><div><dt>Market</dt><dd>{service.market}</dd></div>{site?.serviceArea ? <div><dt>Service area</dt><dd>{site.serviceArea}</dd></div> : null}</dl> : null}
            </div>
            <aside className="sf-panel sf-panel--slab sf-sticky sf-slab" aria-labelledby="quote-title">
              <h2 id="quote-title" className="sf-panel__title">Request a quote</h2>
              <p className="sf-mt-sm">{site?.acceptingInquiries ? <Status tone="ok">Taking new projects</Status> : <Status tone="idle">Not taking new projects</Status>}</p>
              <div className="sf-mt">
                <Track wrap>
                  {site?.acceptingInquiries && <Pill href={`/account?service=${encodeURIComponent(service.slug)}`} variant="primary">Request a quote</Pill>}
                  {site?.acceptingInquiries && <Pill href="/start-a-project" variant="quiet">Full project inquiry</Pill>}
                </Track>
              </div>
              {(site?.inquiryPhone || site?.inquiryEmail) && (
                <div className="sf-contact sf-mt">
                  {site.inquiryPhone && <a href={telHref(site.inquiryPhone)}><Phone />{site.inquiryPhone}</a>}
                  {site.inquiryEmail && <a href={`mailto:${site.inquiryEmail}`}><Mail />{site.inquiryEmail}</a>}
                </div>
              )}
            </aside>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
