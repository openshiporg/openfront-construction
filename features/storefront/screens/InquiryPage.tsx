import { createHash } from "node:crypto";
import { Mail, Phone } from "lucide-react";

import { PublicIntakeForm, type PublicIntakeKind } from "../components/PublicIntakeForm";
import { PublicShell, telHref } from "../components/PublicShell";
import { Empty, Pill, Status, Track } from "../components/ui";
import { getPublicConstructionSite } from "../data";

const pageCopy: Record<string, { eyebrow: string; title: string }> = {
  "/start-a-project": { eyebrow: "New project", title: "Request an estimate" },
  "/client-intake": { eyebrow: "Client intake", title: "Tell us about the work" },
  "/estimate": { eyebrow: "Budget", title: "Request an estimate" },
  "/rfp": { eyebrow: "Owner procurement", title: "Invite us to bid" },
  "/contact": { eyebrow: "Contact", title: "Contact the team" },
  "/bid": { eyebrow: "Trade partners", title: "Become a trade partner" },
  "/trade-partners": { eyebrow: "Trade partners", title: "Work with us" },
};

const inquiryTypes = [
  { href: "/start-a-project", label: "Estimate", match: ["/start-a-project", "/estimate", "/client-intake"] },
  { href: "/rfp", label: "Bid invitation", match: ["/rfp"] },
  { href: "/trade-partners", label: "Trade partner", match: ["/trade-partners", "/bid"] },
  { href: "/contact", label: "General", match: ["/contact"] },
] as const;

const currentNav: Record<string, string> = { "/contact": "/contact", "/trade-partners": "/trade-partners", "/bid": "/trade-partners" };

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
    <PublicShell site={site} current={currentNav[sourcePath] ?? "/start-a-project"} dock={false}>
      <main>
        <header className="sf-pagehead">
          <div className="sf-wrap">
            <p className="sf-kicker">{copy.eyebrow}</p>
            <h1 className="sf-display sf-h1">{copy.title}</h1>
          </div>
        </header>
        <section className="sf-section">
          <div className="sf-wrap">
            <nav aria-label="Inquiry type" className="sf-segments">
              <Track scroll>
                {inquiryTypes.map(entry => <Pill key={entry.href} href={entry.href} variant="quiet" size="sm" current={(entry.match as readonly string[]).includes(sourcePath)}>{entry.label}</Pill>)}
              </Track>
            </nav>
            <div className="sf-intake">
              <aside className="sf-panel sf-panel--slab sf-slab sf-sticky" aria-labelledby="direct-title">
                <h2 id="direct-title" className="sf-panel__title">{site?.brandName || "Contact"}</h2>
                {site && <p className="sf-mt-sm">{site.acceptingInquiries ? <Status tone="ok">Taking new projects</Status> : <Status tone="idle">Not taking new projects</Status>}</p>}
                {site && (site.inquiryPhone || site.inquiryEmail) && (
                  <div className="sf-contact sf-mt">
                    {site.inquiryPhone && <a href={telHref(site.inquiryPhone)}><Phone />{site.inquiryPhone}</a>}
                    {site.inquiryEmail && <a href={`mailto:${site.inquiryEmail}`}><Mail />{site.inquiryEmail}</a>}
                  </div>
                )}
                {site?.serviceArea && <p className="sf-mt sf-small" style={{ color: "var(--sf-slab-muted)" }}>{site.serviceArea}</p>}
                {mode === "trade" && <div className="sf-mt"><Track><Pill href="/account?from=/portal" variant="raised" size="sm">Partner sign in</Pill></Track></div>}
              </aside>
              <div className="sf-stack">
                {site?.acceptingInquiries
                  ? <PublicIntakeForm kind={kind} sourcePath={sourcePath} mode={mode} privacyNoticeDigest={privacyNoticeDigest} />
                  : <Empty title="Online inquiries are closed" action={site?.inquiryEmail ? <Track><a href={`mailto:${site.inquiryEmail}`} className="sf-pill sf-pill--raised"><Mail />{site.inquiryEmail}</a></Track> : undefined} />}
              </div>
            </div>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
