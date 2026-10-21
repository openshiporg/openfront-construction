import type { FetchLike } from "@modelcontextprotocol/sdk/shared/transport.js";

function canonicalEndpoint(url: URL): string {
  const canonical = new URL(url);
  canonical.hash = "";
  return canonical.href;
}

/**
 * Creates one request-local fetch for one MCP endpoint.
 *
 * Dashboard cookies never touch process-global fetch. Redirects and every URL
 * other than the exact configured endpoint are rejected before network I/O.
 */
export function createScopedMcpFetch(
  endpoint: URL,
  cookie: string,
  baseFetch: FetchLike = fetch,
): FetchLike {
  const allowedEndpoint = canonicalEndpoint(endpoint);
  const requestCookie = cookie.trim();

  return async (input, init = {}) => {
    const destination = new URL(String(input), endpoint);
    if (canonicalEndpoint(destination) !== allowedEndpoint) {
      throw new Error("MCP transport attempted a request outside the request-scoped MCP endpoint");
    }

    const headers = new Headers(init.headers);
    headers.delete("cookie");
    if (requestCookie) headers.set("cookie", requestCookie);

    return baseFetch(destination, {
      ...init,
      headers,
      redirect: "manual",
    });
  };
}
