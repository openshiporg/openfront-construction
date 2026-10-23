import { notFound } from "next/navigation";

import { PublicShell } from "../components/PublicShell";
import { Pill, Status, Track } from "../components/ui";
import { getPublicConstructionSite, getPublicIntakeReceipt } from "../data";

function readable(value: string) {
  const text = value.replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export async function RequestConfirmationPage({ reference }: { reference: string }) {
  const [site, receipt] = await Promise.all([getPublicConstructionSite(), getPublicIntakeReceipt(reference)]);
  if (!receipt) notFound();
  return (
    <PublicShell site={site}>
      <main className="sf-section">
        <div className="sf-wrap">
          <article className="sf-ticket" aria-labelledby="confirmation-title">
            <div className="sf-ticket__head">
              <p className="sf-kicker"><Status tone="ok">{readable(receipt.status)}</Status></p>
              <h1 id="confirmation-title" className="sf-display sf-h2" style={{ marginTop: "0.75rem" }}>Inquiry received</h1>
            </div>
            <div className="sf-ticket__body">
              <div><p className="sf-small">Reference</p><p className="sf-ticket__ref">{receipt.publicReference}</p></div>
            </div>
            <div className="sf-ticket__perf" aria-hidden="true" />
            <div className="sf-ticket__body">
              <dl className="sf-spec">
                <div><dt>Type</dt><dd>{readable(receipt.kind)}</dd></div>
                <div><dt>Received</dt><dd className="sf-mono">{new Date(receipt.submittedAt).toLocaleString()}</dd></div>
              </dl>
              <Track wrap>
                <Pill href="/" variant="raised">Home</Pill>
                <Pill href="/projects" variant="quiet">Projects</Pill>
              </Track>
            </div>
          </article>
        </div>
      </main>
    </PublicShell>
  );
}
