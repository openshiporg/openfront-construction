type GraphQLErrorEntry = { message?: unknown; extensions?: { code?: unknown } };

/** Only messages written for the operator: domain rules, list validation and access denials.
 * Never ClientError.message, which embeds the request variables. */
export function operatorErrorMessage(errors: unknown): string | null {
  if (!Array.isArray(errors)) return null;
  for (const entry of errors as GraphQLErrorEntry[]) {
    const code = entry?.extensions?.code;
    const message = typeof entry?.message === "string" ? entry.message.trim() : "";
    if (!message) continue;
    if (code === "DOMAIN_ERROR" || code === "KS_ACCESS_DENIED") return message;
    if (code === "KS_VALIDATION_FAILURE") {
      const details = message.split("\n").map(line => line.trim()).filter(line => line.startsWith("- ")).map(line => line.slice(2));
      return details.length ? details.join("; ") : message.split("\n")[0];
    }
  }
  return null;
}
