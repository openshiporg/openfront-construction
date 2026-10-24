import type { Metadata } from "next";

import { PublicShell } from "@/features/storefront/components/PublicShell";
import { Empty, Pill, Track } from "@/features/storefront/components/ui";
import { getPublicConstructionSite } from "@/features/storefront/data";

export const metadata: Metadata = { title: "Page not found", robots: { index: false, follow: false } };

/** Unmatched URLs and missing projects, services and requests, inside the branded shell. */
export default async function NotFound() {
  const site = await getPublicConstructionSite().catch(() => null);
  return (
    <PublicShell site={site} account dock={false}>
      <main className="sf-section">
        <div className="sf-wrap">
          <Empty heading title="Page not found" action={<Track><Pill href="/" variant="primary">Home</Pill></Track>} />
        </div>
      </main>
    </PublicShell>
  );
}
