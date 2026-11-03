import { ClientError, GraphQLClient } from "graphql-request";

import { getAuthHeaders } from "@/features/dashboard/lib/cookies";
import { getServerGraphQLTarget } from "@/features/dashboard/lib/getBaseUrl";
import type { KeystoneResponse } from "@/features/dashboard/lib/keystoneClient";
import { PUBLIC_REQUEST_ERROR, safeErrorSummary } from "@/features/dashboard/lib/security";
import { operatorErrorMessage } from "@/features/lib/operator-error";

/** The platform's GraphQL client: like the dashboard client, but a refused command
 * returns the reason ("03-3000 already exists") instead of the generic retry text. */
export async function platformClient<T = any>(query: string, variables: Record<string, unknown> = {}): Promise<KeystoneResponse<T>> {
  try {
    // Built per request, so the signed identity is the CURRENT visitor's.
    const target = await getServerGraphQLTarget();
    const client = new GraphQLClient(target.endpoint, {
      credentials: "include",
      redirect: "error",
      ...(target.fetch ? { fetch: target.fetch } : {}),
      headers: (await getAuthHeaders()) || {},
    });
    return { success: true, data: await client.request<T>(query, variables) };
  } catch (error) {
    console.error("Platform GraphQL request failed:", safeErrorSummary(error));
    const message = error instanceof ClientError ? operatorErrorMessage(error.response.errors) : null;
    return { success: false, error: message ?? PUBLIC_REQUEST_ERROR };
  }
}

/** The server's reason when it gave one, otherwise the form's own fallback. */
export function refusal(response: { error?: string }, fallback: string): string {
  return response.error && response.error !== PUBLIC_REQUEST_ERROR ? response.error : fallback;
}
