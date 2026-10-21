import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";

import { PublicShell } from "../components/PublicShell";
import { getPublicConstructionSite, getPublicIntakeReceipt } from "../data";

function readable(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, character => character.toUpperCase());
}

export async function RequestConfirmationPage({ reference }: { reference: string }) {
  const [site, receipt] = await Promise.all([getPublicConstructionSite(), getPublicIntakeReceipt(reference)]);
  if (!receipt) notFound();
  return (
    <PublicShell site={site}>
      <main className="sf-main">
        <section className="sf-section sf-section--first" aria-labelledby="confirmation-title">
          <div className="sf-wrap">
            <div className="sf-receipt">
              <span className="sf-receipt__mark" aria-hidden="true"><Check className="size-5" /></span>
              <p className="sf-doc__kicker" style={{ marginTop: "var(--space-lg)" }}>We received your inquiry</p>
              <h1 id="confirmation-title" className="sf-doc__title" style={{ fontSize: "clamp(2rem, 4vw + 1rem, 3rem)" }}>Thanks for getting in touch</h1>
              <p className="sf-doc__lede" style={{ marginTop: "var(--space-sm)" }}>We have your {readable(receipt.kind).toLowerCase()} and will respond as soon as we can. Keep the reference below in case you want to follow up.</p>
              <dl className="sf-facts">
                <div className="sf-facts__row">
                  <dt className="sf-facts__dt">Reference</dt>
                  <dd className="sf-facts__dd" style={{ fontFamily: "var(--font-mono)", overflowWrap: "anywhere" }}>{receipt.publicReference}</dd>
                </div>
                <div className="sf-facts__row">
                  <dt className="sf-facts__dt">Type</dt>
                  <dd className="sf-facts__dd">{readable(receipt.kind)}</dd>
                </div>
                <div className="sf-facts__row">
                  <dt className="sf-facts__dt">Received</dt>
                  <dd className="sf-facts__dd">{new Date(receipt.submittedAt).toLocaleString()}</dd>
                </div>
              </dl>
              <div style={{ marginTop: "var(--space-xl)", display: "flex", flexWrap: "wrap", gap: "var(--space-md)" }}>
                <Link href="/" className="sf-btn">Return home</Link>
                <Link href="/contact" className="sf-btn sf-btn--ghost">Contact us</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
