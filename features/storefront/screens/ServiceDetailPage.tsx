import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { PublicShell } from "../components/PublicShell";
import { getPublicConstructionService, getPublicConstructionSite } from "../data";

export async function ServiceDetailPage({ slug }: { slug: string }) {
  const [site, service] = await Promise.all([getPublicConstructionSite(), getPublicConstructionService(slug)]);
  if (!service) notFound();
  return (
    <PublicShell site={site}>
      <main className="sf-main">
        <section className="sf-section sf-section--first" aria-labelledby="service-title">
          <div className="sf-wrap">
            <Link href="/services" className="sf-doc__back"><ArrowLeft className="size-4" aria-hidden="true" />Services</Link>
            <div className="sf-doc" style={{ marginTop: "var(--space-xl)" }}>
              <p className="sf-doc__kicker">{service.market || "Construction service"}</p>
              <h1 id="service-title" className="sf-doc__title">{service.title}</h1>
              <p className="sf-doc__lede">{service.summary}</p>
              {service.details && <div className="sf-doc__body">{service.details}</div>}
              <div style={{ marginTop: "var(--space-2xl)", display: "flex", flexWrap: "wrap", gap: "var(--space-md)" }}>
                <Link href={`/account?service=${encodeURIComponent(service.slug)}`} className="sf-btn">Request a quote <ArrowRight className="size-4" aria-hidden="true" /></Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
