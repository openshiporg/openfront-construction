import Link from "next/link";
import { ArrowRight, Menu } from "lucide-react";

import { storefrontThemeTokens, type StorefrontThemeTokens } from "@/features/lib/store-theme";
import type { PublicConstructionSite } from "../types";
import { StoreBrand } from "./StoreBrand";

const publicLinks = [
  { href: "/services", label: "Services" },
  { href: "/projects", label: "Projects" },
  { href: "/start-a-project", label: "Start a project" },
  { href: "/trade-partners", label: "Trade partners" },
  { href: "/contact", label: "Contact" },
  { href: "/account", label: "Account" },
] as const;

const CLIENT_SIGN_IN = "/account?from=/portal";

type ThemeStyle = React.CSSProperties & Partial<StorefrontThemeTokens>;

export function PublicShell({
  site,
  children,
  account = false,
}: {
  site: PublicConstructionSite | null;
  children?: React.ReactNode;
  /** Account and sign-in pages stay available while the public website is unpublished. */
  account?: boolean;
}) {
  const unpublished = !site && !account;
  const brandName = site?.brandName?.trim() || "";
  const brandTagline = site?.brandTagline?.trim() || "";
  // The saved logo hue themes the storefront; an unpublished site stays neutral.
  const themeStyle: ThemeStyle = site ? storefrontThemeTokens(site.logoColor) : {};
  const area = site?.serviceArea?.trim() || "";
  return (
    <div className="storefront" style={themeStyle}>
      <div className="sf-shell">
        <header className="sf-mast">
          {/* title-block top line */}
          <div className="sf-wrap">
            <div className="sf-mast__top">
              <span>{brandName || "Public profile"}</span>
              <span className="sf-hide-mobile">{area || "Construction services"}</span>
            </div>
            <div className="sf-mast__word">
              <StoreBrand name={brandName || "Public profile"} logoIcon={site?.logoIcon} logoColor={site?.logoColor} className="sf-mast__name" />
            </div>
          </div>
          <div className="sf-wrap">
            <div className="sf-mast__navrow">
              <nav aria-label="Public website">
                <ul className="sf-mast__links">
                  {publicLinks.map(link => (
                    <li key={link.href}>
                      <Link href={link.href} className="sf-mast__link">{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="sf-menu">
                <details className="sf-hide-desktop">
                  <summary className="sf-menu__toggle" aria-label="Open public navigation">
                    <Menu className="size-4" aria-hidden="true" />Menu
                  </summary>
                  <nav aria-label="Mobile public website" className="sf-mobile-nav">
                    <StoreBrand name={brandName || "Public profile"} logoIcon={site?.logoIcon} logoColor={site?.logoColor} />
                    {publicLinks.map(link => (
                      <Link key={link.href} href={link.href} className="sf-mobile-nav__link">{link.label}</Link>
                    ))}
                    <Link href={CLIENT_SIGN_IN} className="sf-mobile-nav__link">Client sign in</Link>
                  </nav>
                </details>
                <Link
                  href={CLIENT_SIGN_IN}
                  className="sf-mast__signin"
                  aria-label="Sign in to the client portal"
                >
                  Client sign in <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </header>
        {unpublished ? (
          <main className="sf-main">
            <section className="sf-section sf-section--first" aria-labelledby="unpublished-title">
              <div className="sf-wrap">
                <div className="sf-doc">
                  <p className="sf-doc__kicker">Public profile</p>
                  <h1 id="unpublished-title" className="sf-doc__title">This contractor&apos;s website is not available yet</h1>
                  <p className="sf-doc__lede">Existing clients can still <Link href="/account" className="underline">sign in to their account</Link>.</p>
                </div>
              </div>
            </section>
          </main>
        ) : (
          children
        )}
        <footer className="sf-foot">
          <div className="sf-wrap sf-foot__inner">
            <div className="sf-foot__top">
              <div className="sf-wrap-nopad">
                <StoreBrand name={brandName || "Public profile"} logoIcon={site?.logoIcon} logoColor={site?.logoColor} className="sf-foot__name" />
                {brandTagline && <p className="sf-foot__tag">{brandTagline}</p>}
              </div>
              <ul className="sf-foot__links">
                <li><Link href="/services" className="sf-foot__link">Services</Link></li>
                <li><Link href="/projects" className="sf-foot__link">Projects</Link></li>
                <li><Link href="/start-a-project" className="sf-foot__link">Start a project</Link></li>
                <li><Link href="/trade-partners" className="sf-foot__link">Trade partners</Link></li>
                <li><Link href="/contact" className="sf-foot__link">Contact</Link></li>
                <li><Link href="/privacy" className="sf-foot__link">Privacy</Link></li>
                <li><Link href="/account" className="sf-foot__link">Account</Link></li>
                <li><Link href={CLIENT_SIGN_IN} className="sf-foot__link">Client sign in</Link></li>
              </ul>
            </div>
            <div className="sf-foot__meta">
              <span>{brandName || "Public profile"}</span>
              <span>{area || "Construction services"}</span>
              <span>© {new Date().getFullYear()}</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
