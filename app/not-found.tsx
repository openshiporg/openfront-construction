import type { Metadata } from "next";
import { connection } from "next/server";

import { PublicShell } from "@/features/storefront/components/PublicShell";
import { Empty, Pill, Track } from "@/features/storefront/components/ui";
import { getPublicConstructionSite, getPublicStorefrontMetadata } from "@/features/storefront/data";

// Rendered per request: a build-time prerender has no database, so it lost the contractor name.
export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const { title } = await getPublicStorefrontMetadata("Page not found");
  return { title, robots: { index: false, follow: false } };
}

/** Unmatched URLs and missing projects, services and requests, inside the branded shell. */
export default async function NotFound() {
  await connection();
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
