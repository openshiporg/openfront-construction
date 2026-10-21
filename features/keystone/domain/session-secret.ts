const unsafeSecretPattern = /replace-with|testing|change-?me/i;

export function requireSessionSecret(environment: NodeJS.ProcessEnv = process.env): string {
  const secret = environment.SESSION_SECRET?.trim();
  if (environment.NODE_ENV === "test" && !secret) {
    return "test-only-session-secret-not-valid-for-production";
  }
  if (!secret) throw new Error("SESSION_SECRET is required");
  if (secret.length < 32 || new Set(secret).size < 12 || unsafeSecretPattern.test(secret)) {
    throw new Error("SESSION_SECRET must be a non-placeholder secret with at least 32 characters and 12 distinct characters");
  }
  return secret;
}
