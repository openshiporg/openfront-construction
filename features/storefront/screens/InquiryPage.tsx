import { createHash } from "node:crypto";
import Link from "next/link";

import { PublicIntakeForm, type PublicIntakeKind } from "../components/PublicIntakeForm";
import { PublicShell } from "../components/PublicShell";
import { getPublicConstructionSite } from "../data";

const pageCopy: Record<string, { eyebrow: string; title: string; description: string }> = {
  "/start-a-project": { eyebrow: "New project", title: "Request an estimate", description: "Tell us about the project, the site, and the timing. We will confirm whether it is a good fit and talk through scope." },
  "/client-intake": { eyebrow: "Client intake", title: "Tell us about the work", description: "A simple first step so we can understand your project and how we can help." },
  "/estimate": { eyebrow: "Budget planning", title: "Request an estimate", description: "Share a rough budget range, design stage, timing, and scope so we can determine the right estimating approach." },
  "/rfp": { eyebrow: "Owner procurement", title: "Invite us to bid", description: "Record the project, delivery method, and deadline so we can consider it and respond in good time." },
  "/contact": { eyebrow: "Contact", title: "Contact the team", description: "Use this short path for referrals, general questions, or topics that are not yet a defined project." },
  "/bid": { eyebrow: "Trade partners", title: "Become a trade partner", description: "Tell us about your company, your specialty, and where you work so we can keep you in mind for projects." },
  "/trade-partners": { eyebrow: "Trade partners", title: "Work with us", description: "Introduce your firm, specialty, and coverage so we can consider you for future projects." },
};

export async function InquiryPage({
  kind,
  sourcePath,
  mode,
}: {
  kind: PublicIntakeKind;
  sourcePath: keyof typeof pageCopy;
  mode: "contact" | "project" | "trade";
}) {
  const site = await getPublicConstructionSite();
  const copy = pageCopy[sourcePath];
  // Binds the visitor's consent to the notice shown on this page.
  const privacyNoticeDigest = site?.privacyNotice?.trim() ? createHash("sha256").update(site.privacyNotice.trim()).digest("hex") : undefined;
  return (
    <PublicShell site={site}>
      <main className="sf-main">
        <section className="sf-section sf-section--first" aria-labelledby="inquiry-title">
          <div className="sf-wrap">
            <div className="sf-doc">
              <p className="sf-doc__kicker">{copy.eyebrow}</p>
              <h1 id="inquiry-title" className="sf-doc__title">{copy.title}</h1>
              <p className="sf-doc__lede">{copy.description}</p>
            </div>
            <div className="sf-intake">
              <aside className="sf-intake__aside">
                <h2>Contact</h2>
                {site && (
                  <div className="sf-intake__contact">
                    <p style={{ fontWeight: 500 }}>Prefer to reach us directly?</p>
                    <div style={{ marginTop: "var(--space-xs)", display: "grid", gap: "var(--space-2xs)" }}>
                      <a href={`mailto:${site.inquiryEmail}`} className="sf-line-link">{site.inquiryEmail}</a>
                      {site.inquiryPhone && <a href={`tel:${site.inquiryPhone.replace(/[^+\d]/g, "")}`} className="sf-line-link">{site.inquiryPhone}</a>}
                    </div>
                  </div>
                )}
                {mode === "trade" && <Link href="/account?from=/portal" className="sf-morelink" style={{ marginTop: "var(--space-md)" }}>Existing partners: sign in</Link>}
              </aside>
              <div className="min-w-0">
                {site?.acceptingInquiries ? <PublicIntakeForm kind={kind} sourcePath={sourcePath} mode={mode} privacyNoticeDigest={privacyNoticeDigest} /> : (
                  <div className="sf-receipt" style={{ marginTop: 0 }}>
                    <h2 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 700 }}>Online inquiries are not open right now</h2>
                    <p style={{ marginTop: "var(--space-sm)", color: "var(--sf-ink-2)", lineHeight: 1.6, fontSize: "var(--text-sm)" }}>Please contact us directly and we will be glad to help.</p>
                    {site?.inquiryEmail && <a href={`mailto:${site.inquiryEmail}`} className="sf-morelink" style={{ marginTop: "var(--space-md)" }}>Email us at {site.inquiryEmail}</a>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
