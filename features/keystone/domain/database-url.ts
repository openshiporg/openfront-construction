/** Configuration validation only; never include credential-bearing values in errors. */
export function requirePostgresDatabaseUrl(value: string | undefined): string {
  const raw = value?.trim();
  const fail = () => { throw new Error("DATABASE_URL must be a configured PostgreSQL connection URL"); };
  if (!raw) return fail();
  try {
    const parsed = new URL(raw);
    if (!["postgres:", "postgresql:"].includes(parsed.protocol) || !parsed.hostname || parsed.pathname.length < 2) return fail();
  } catch { return fail(); }
  return raw;
}
