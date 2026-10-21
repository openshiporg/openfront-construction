const DEFAULT_PUBLIC_SITE_KEY = "default";

export function getTrustedPublicSiteKey(): string {
  const value = (process.env.PUBLIC_SITE_KEY || DEFAULT_PUBLIC_SITE_KEY).trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) || value.length > 80) {
    throw new Error("PUBLIC_SITE_KEY must be a lowercase slug with at most 80 characters");
  }
  return value;
}

export function publicSlug(value: string, fallback: string): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
    .replace(/-+$/g, "");
  return slug || fallback;
}
