import type { Metadata } from "next";
import { keystoneClient } from "@/features/dashboard/lib/keystoneClient";
import type {
  PublicConstructionSite,
  PublicIntakeReceipt,
  PublicProjectSummary,
  PublicServiceSummary,
} from "./types";

export async function getPublicConstructionSite(): Promise<PublicConstructionSite | null> {
  const response = await keystoneClient<{ publicConstructionSite: PublicConstructionSite | null }>(`
    query PublicConstructionSite {
      publicConstructionSite {
        brandName brandMark brandTagline brandColor logoIcon logoColor serviceArea capabilitySummary
        inquiryEmail inquiryPhone privacyNotice acceptingInquiries
        services { slug title summary details market }
        projects { slug title summary description market locationLabel deliveryMethod completionLabel approvedOutcome }
      }
    }
  `);
  if (!response.success) throw new Error("The public contractor profile is temporarily unavailable");
  return response.data.publicConstructionSite;
}

/**
 * Metadata for the public storefront derived only from the persisted public
 * projection. Returns null when no profile is published so routes fall back to
 * the neutral root-layout title rather than inventing a brand.
 */
export async function getPublicStorefrontMetadata(): Promise<Metadata> {
  const site = await getPublicConstructionSite();
  if (!site) return {};
  return {
    title: site.brandName?.trim() || undefined,
    description: site.capabilitySummary?.trim() || site.brandTagline?.trim() || undefined,
  };
}

export async function getPublicConstructionService(slug: string): Promise<PublicServiceSummary | null> {
  const response = await keystoneClient<{ publicConstructionService: PublicServiceSummary | null }>(`
    query PublicConstructionService($slug: String!) {
      publicConstructionService(slug: $slug) { slug title summary details market }
    }
  `, { slug });
  if (!response.success) return null;
  return response.data.publicConstructionService;
}

export async function getPublicConstructionProject(slug: string): Promise<PublicProjectSummary | null> {
  const response = await keystoneClient<{ publicConstructionProject: PublicProjectSummary | null }>(`
    query PublicConstructionProject($slug: String!) {
      publicConstructionProject(slug: $slug) {
        slug title summary description market locationLabel deliveryMethod completionLabel approvedOutcome
      }
    }
  `, { slug });
  if (!response.success) return null;
  return response.data.publicConstructionProject;
}

export async function getPublicIntakeReceipt(reference: string): Promise<PublicIntakeReceipt | null> {
  const response = await keystoneClient<{ publicIntakeReceipt: PublicIntakeReceipt | null }>(`
    query PublicIntakeReceipt($reference: String!) {
      publicIntakeReceipt(reference: $reference) { publicReference kind status submittedAt }
    }
  `, { reference });
  if (!response.success) return null;
  return response.data.publicIntakeReceipt;
}
