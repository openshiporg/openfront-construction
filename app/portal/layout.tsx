import type { Metadata } from "next";

import { getAuthenticatedUser } from "@/features/dashboard/actions/auth";
import { PublicShell } from "@/features/storefront/components/PublicShell";
import { getPublicConstructionSite } from "@/features/storefront/data";
import { customerSignOut } from "@/features/storefront/account/actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Project portal" };

async function publicSite() {
  try {
    return await getPublicConstructionSite();
  } catch {
    return null;
  }
}

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  // Each portal page signs out visitors back to the public sign-in with its own return path.
  const [response, site] = await Promise.all([getAuthenticatedUser(), publicSite()]);
  const user = response.success ? response.data?.authenticatedItem : null;
  return (
    <PublicShell site={site} account current="/account" dock={false}>
      {user && (
        <div className="sf-util" style={{ background: "var(--sf-paper-2)", color: "var(--sf-ink-2)", borderBottom: "1px solid var(--sf-rule)" }}>
          <div className="sf-wrap sf-util__row">
            <span className="sf-util__area">Client portal · {user.name || user.email}</span>
            <form action={customerSignOut}><button className="sf-pill sf-pill--sm" style={{ minHeight: "2rem" }}>Sign out</button></form>
          </div>
        </div>
      )}
      {children}
    </PublicShell>
  );
}
