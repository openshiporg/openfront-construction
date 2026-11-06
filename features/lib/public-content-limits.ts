/**
 * Store Settings public-content length limits. They match the validation on
 * PublicSiteProfile, PublicService and PublicProject (features/keystone/models/public.ts)
 * and are shared by the settings forms, the server action and the scoped command,
 * so an oversized field is named before the model rejects the whole save.
 */
export const PUBLIC_PROFILE_LIMITS = {
  serviceArea: { label: "Service area", max: 240 },
  capabilitySummary: { label: "Capability summary", max: 1200 },
  inquiryEmail: { label: "Contact email", max: 320 },
  inquiryPhone: { label: "Contact phone", max: 50 },
  privacyNotice: { label: "Privacy notice", max: 1200 },
} as const;

export const PUBLIC_SERVICE_LIMITS = {
  title: { label: "Service title", max: 160 },
  summary: { label: "Summary", max: 500 },
  details: { label: "Details", max: 4000 },
  market: { label: "Market", max: 160 },
} as const;

export const PUBLIC_PROJECT_LIMITS = {
  title: { label: "Project title", max: 200 },
  summary: { label: "Public summary", max: 600 },
  description: { label: "Public description", max: 5000 },
  market: { label: "Market", max: 160 },
  locationLabel: { label: "General location", max: 200 },
  deliveryMethod: { label: "Delivery method", max: 120 },
  completionLabel: { label: "Completion state", max: 80 },
  approvedOutcome: { label: "Outcome", max: 1000 },
  photos: { label: "Photos", max: 4000 },
} as const;

/** Project photo URLs: site-hosted paths or https images, at most 12, one per line. */
export function parseProjectPhotos(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return value.split(/\r?\n/).map(line => line.trim()).filter(line => /^\/[A-Za-z0-9._~\/-]+\.(?:jpe?g|png|webp|avif)$/i.test(line) || /^https:\/\/[^\s"'<>]+$/i.test(line)).slice(0, 12);
}
export function projectPhotosError(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const lines = value.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length > 12) return "Add at most 12 photos.";
  return parseProjectPhotos(value).length === lines.length ? null : "Each photo must be an https image URL or a site path like /projects/photo.jpg, one per line.";
}

type Limits = Record<string, { label: string; max: number }>;

/** The first field over its limit, as a message naming that field, or null. */
export function publicContentLengthError(limits: Limits, values: Record<string, unknown>): string | null {
  for (const [key, { label, max }] of Object.entries(limits)) {
    const value = values[key];
    if (typeof value === "string" && value.length > max) return `${label} must be ${max} characters or fewer.`;
  }
  return null;
}
