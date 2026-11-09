import type { Metadata } from "next";

import { getAuthenticatedUser } from "@/features/dashboard/actions/auth";
import { PublicShell } from "@/features/storefront/components/PublicShell";
import { getPublicConstructionSite, getPublicStorefrontMetadata } from "@/features/storefront/data";
import { customerSignOut } from "@/features/storefront/account/actions";

export const dynamic = "force-dynamic";
export const generateMetadata = async (): Promise<Metadata> => getPublicStorefrontMetadata("Client portal");

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
        <div className="sf-portalbar">
          <div className="sf-wrap sf-portalbar__row">
            <span className="sf-portalbar__who">Client portal · {user.name || user.email}</span>
            <form action={customerSignOut}><button className="sf-pill sf-pill--sm">Sign out</button></form>
          </div>
        </div>
      )}
      {children}
    </PublicShell>
  );
}
