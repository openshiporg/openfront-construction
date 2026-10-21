import { PublicShell } from "../components/PublicShell";
import { getPublicConstructionSite } from "../data";

export async function PrivacyPage() {
  const site = await getPublicConstructionSite();
  return (
    <PublicShell site={site}>
      <main className="sf-main">
        <section className="sf-section sf-section--first" aria-labelledby="privacy-title">
          <div className="sf-wrap">
            <div className="sf-doc">
              <p className="sf-doc__kicker">Your information</p>
              <h1 id="privacy-title" className="sf-doc__title">Privacy</h1>
            </div>
            <div className="sf-doc" style={{ marginTop: "var(--space-2xl)" }}>
              <section className="sf-doc__section">
                <h2 className="sf-doc__kicker">What we do with your details</h2>
                <p style={{ marginTop: "var(--space-sm)", color: "var(--sf-ink-2)", lineHeight: 1.65 }}>{site?.privacyNotice || "The details you send us through an inquiry are used to review your request and respond. We do not sell or market your information."}</p>
              </section>
              <section className="sf-doc__section">
                <h2 className="sf-doc__kicker">Sending an inquiry</h2>
                <p style={{ marginTop: "var(--space-sm)", color: "var(--sf-ink-2)", lineHeight: 1.65 }}>An inquiry lets us get back to you about your project. It does not commit you to anything, and it does not begin any work.</p>
              </section>
              <section className="sf-doc__section">
                <h2 className="sf-doc__kicker">What not to send</h2>
                <p style={{ marginTop: "var(--space-sm)", color: "var(--sf-ink-2)", lineHeight: 1.65 }}>Please do not send card numbers, bank details, government IDs, medical or incident records, or confidential project files through a public form. Those should only be shared once we are working together and on a secure channel.</p>
              </section>
              <section className="sf-doc__section">
                <h2 className="sf-doc__kicker">Contact</h2>
                <p style={{ marginTop: "var(--space-sm)", color: "var(--sf-ink-2)", lineHeight: 1.65 }}>Questions about your information can be sent to {site?.inquiryEmail ? <a href={`mailto:${site.inquiryEmail}`} className="sf-line-link">{site.inquiryEmail}</a> : "our published contact email once available"}.</p>
              </section>
            </div>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
