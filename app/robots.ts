import type { MetadataRoute } from "next";

import { getPublicConstructionSite, storefrontOrigin } from "@/features/storefront/data";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const [site, origin] = await Promise.all([getPublicConstructionSite().catch(() => null), storefrontOrigin()]);
  if (!site) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/account", "/portal", "/requests", "/accept-invitation", "/api"] },
    ...(origin ? { sitemap: new URL("/sitemap.xml", origin).toString() } : {}),
  };
}
