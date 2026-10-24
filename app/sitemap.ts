import type { MetadataRoute } from "next";

import { getPublicConstructionSite, storefrontOrigin } from "@/features/storefront/data";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [site, origin] = await Promise.all([getPublicConstructionSite().catch(() => null), storefrontOrigin()]);
  if (!site || !origin) return [];
  const url = (path: string) => new URL(path, origin).toString();
  const pages = ["/", "/services", "/projects", "/contact", "/privacy", "/trade-partners", ...(site.acceptingInquiries ? ["/start-a-project", "/rfp"] : [])];
  return [
    ...pages.map(path => ({ url: url(path), changeFrequency: "weekly" as const, priority: path === "/" ? 1 : 0.7 })),
    ...site.services.map(service => ({ url: url(`/services/${encodeURIComponent(service.slug)}`), changeFrequency: "monthly" as const, priority: 0.6 })),
    ...site.projects.map(project => ({ url: url(`/projects/${encodeURIComponent(project.slug)}`), changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
