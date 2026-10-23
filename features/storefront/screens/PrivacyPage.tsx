import { PublicShell } from "../components/PublicShell";
import { getPublicConstructionSite } from "../data";

export async function PrivacyPage() {
  const site = await getPublicConstructionSite();
  return (
    <PublicShell site={site}>
      <main>
        <header className="sf-pagehead">
          <div className="sf-wrap">
            <p className="sf-kicker">{site?.brandName || "Privacy"}</p>
            <h1 className="sf-display sf-h1">Privacy</h1>
          </div>
        </header>
        <section className="sf-section">
          <div className="sf-wrap sf-prose">
            <div>
              <h2>Privacy notice</h2>
              <p className="sf-body">{site?.privacyNotice || "Inquiry details are used to review and reply to your request. They are not sold or used for marketing."}</p>
            </div>
            <div>
              <h2>Not to send through a form</h2>
              <p className="sf-body">Card or bank details, government IDs, medical or incident records, and confidential project files.</p>
            </div>
            {site?.inquiryEmail && (
              <div>
                <h2>Contact</h2>
                <p className="sf-body"><a href={`mailto:${site.inquiryEmail}`} className="sf-link">{site.inquiryEmail}</a></p>
              </div>
            )}
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
