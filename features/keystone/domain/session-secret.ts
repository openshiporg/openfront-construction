export function requireSessionSecret(environment: NodeJS.ProcessEnv = process.env): string {
  const secret = environment.SESSION_SECRET?.trim();
  if (environment.NODE_ENV === "test" && !secret) {
    return "test-only-session-secret-not-valid-for-production";
  }
  if (!secret) throw new Error("SESSION_SECRET is required");
  if (secret.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters long");
  return secret;
}
