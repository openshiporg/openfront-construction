/** Configuration validation only; never include credential-bearing values in errors. */
export function requirePostgresDatabaseUrl(value: string | undefined): string {
  const raw = value?.trim();
  if (!raw) throw new Error("DATABASE_URL is required");
  return raw;
}
