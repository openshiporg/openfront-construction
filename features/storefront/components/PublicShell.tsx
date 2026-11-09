import Link from "next/link";
import { ArrowRight, Mail, Menu, Phone } from "lucide-react";

import type { PublicConstructionSite } from "../types";
import { StoreBrand } from "./StoreBrand";
import { Empty, Pill, Status, Track } from "./ui";

const publicLinks = [
  { href: "/services", label: "Services" },
  { href: "/projects", label: "Projects" },
  { href: "/trade-partners", label: "Trade partners" },
  { href: "/contact", label: "Contact" },
] as const;

const CLIENT_SIGN_IN = "/account?from=/portal";

/** A public phone number, or "" when it is not a dialable number (555 exchange placeholders are never shown). */
export function publicPhone(phone: string | null | undefined) {
  const value = (phone ?? "").trim();
  return /\b555[-.\s]?\d{4}\b/.test(value) ? "" : value;
}

export function telHref(phone: string) {
  return `tel:${phone.replace(/[^+\d]/g, "")}`;
}

export function PublicShell({
  site,
  children,
  account = false,
  current,
  dock = true,
}: {
  site: PublicConstructionSite | null;
  children?: React.ReactNode;
  /** Account and sign-in pages stay available while the public website is unpublished. */
  account?: boolean;
  /** The public path this page belongs to, for the current-page pill. */
  current?: string;
  /** The phone action dock (estimate + call); off on pages that are themselves a form. */
  dock?: boolean;
}) {
  const unpublished = !site && !account;
  const brandName = site?.brandName?.trim() || "Contractor";
  const brandTagline = site?.brandTagline?.trim() || "";
  const area = site?.serviceArea?.trim() || "";
  const phone = publicPhone(site?.inquiryPhone);
  const email = site?.inquiryEmail?.trim() || "";
  return (
    <div className="storefront">
      <div className="sf-shell">
        <a href="#main" className="sf-skip">Skip to content</a>
        <header className="sf-header">
          <div className="sf-wrap sf-header__row">
            <StoreBrand name={brandName} logoIcon={site?.logoIcon} logoColor={site?.logoColor} />
            {site && (
              <nav aria-label="Public website" className="sf-nav">
                <Track>
                  {publicLinks.map(link => <Pill key={link.href} href={link.href} variant="quiet" size="sm" current={current === link.href}>{link.label}</Pill>)}
                  <Pill href={CLIENT_SIGN_IN} variant="quiet" size="sm" current={current === "/account"}>Client portal</Pill>
                </Track>
              </nav>
            )}
            <div className="sf-header__actions">
              {site && email && current === "/" && <a href={`mailto:${email}`} className="sf-header__email">{email}</a>}
              <span className="sf-header__cta">
                <Track>
                  {site?.acceptingInquiries && current !== "/" && <Pill href="/start-a-project" variant="primary" size="sm">Request an estimate</Pill>}
                </Track>
              </span>
              <details className="sf-menu">
                <summary className="sf-menu__btn" aria-label="Menu"><Menu aria-hidden="true" /></summary>
                <nav aria-label="Mobile public website" className="sf-menu__panel">
                  <div className="sf-menu__list">
                    {site && publicLinks.map(link => <Link key={link.href} href={link.href} className="sf-menu__link" aria-current={current === link.href ? "page" : undefined}>{link.label}<ArrowRight aria-hidden="true" width={18} height={18} /></Link>)}
                    {site?.acceptingInquiries && <Link href="/start-a-project" className="sf-menu__link" aria-current={current === "/start-a-project" ? "page" : undefined}>Request an estimate<ArrowRight aria-hidden="true" width={18} height={18} /></Link>}
                    <Link href={CLIENT_SIGN_IN} className="sf-menu__link">Client portal<ArrowRight aria-hidden="true" width={18} height={18} /></Link>
                  </div>
                  {(phone || email) && (
                    <div className="sf-menu__foot sf-contact">
                      {phone && <a href={telHref(phone)}><Phone />{phone}</a>}
                      {email && <a href={`mailto:${email}`}><Mail />{email}</a>}
                    </div>
                  )}
                </nav>
              </details>
            </div>
          </div>
        </header>
        <div id="main" className="sf-main">
          {unpublished ? (
            <main className="sf-section">
              <div className="sf-wrap">
                <Empty heading title="This website is not published yet" action={<Track><Pill href="/account" variant="raised">Client sign in</Pill></Track>} />
              </div>
            </main>
          ) : children}
        </div>
        {site && dock && (phone || site.acceptingInquiries) && (
          <div className="sf-dock">
            <Track label="Quick actions">
              {phone && <a href={telHref(phone)} className="sf-pill sf-pill--raised"><Phone />Call</a>}
              {site.acceptingInquiries && <Pill href="/start-a-project" variant="primary">Request an estimate</Pill>}
            </Track>
          </div>
        )}
        <footer className="sf-foot">
          <div className="sf-wrap sf-foot__grid">
            <div>
              <StoreBrand name={brandName} logoIcon={site?.logoIcon} logoColor={site?.logoColor} />
              {brandTagline && <p className="sf-foot__tag">{brandTagline}</p>}
              {site && <p className="sf-mt-sm">{site.acceptingInquiries ? <Status tone="ok">Taking new projects</Status> : <Status tone="idle">Not taking new projects</Status>}</p>}
            </div>
            {site && (
              <nav aria-label="Footer">
                <p className="sf-foot__title">Company</p>
                <ul className="sf-foot__links">
                  {publicLinks.map(link => <li key={link.href}><Link href={link.href}>{link.label}</Link></li>)}
                  <li><Link href="/privacy">Privacy</Link></li>
                </ul>
              </nav>
            )}
            <div>
              <p className="sf-foot__title">Clients</p>
              <ul className="sf-foot__links">
                {site?.acceptingInquiries && <li><Link href="/start-a-project">Request an estimate</Link></li>}
                {site?.acceptingInquiries && <li><Link href="/rfp">Invite us to bid</Link></li>}
                <li><Link href={CLIENT_SIGN_IN}>Client portal</Link></li>
                <li><Link href="/account">Account</Link></li>
                {phone && <li><a href={telHref(phone)}>{phone}</a></li>}
                {email && <li><a href={`mailto:${email}`}>{email}</a></li>}
              </ul>
            </div>
            {site?.acceptingInquiries && <div className="sf-foot__cta"><Pill href="/start-a-project" variant="primary">Request an estimate</Pill></div>}
          </div>
          <div className="sf-wrap sf-foot__meta">
            <span>© {new Date().getFullYear()} {brandName}</span>
            {area && <span>{area}</span>}
          </div>
        </footer>
      </div>
    </div>
  );
}
