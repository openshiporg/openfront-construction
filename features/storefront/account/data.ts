import { keystoneClient } from "@/features/dashboard/lib/keystoneClient";

export type CustomerRequest = {
  id: string; reference: string; serviceTitle: string; serviceSlug: string; scope: string;
  status: string; version: number; currencyCode: string; quoteMinor: string; quoteTerms: string;
  expiresAt: string | null; acceptedAt: string | null; acceptedSnapshot: Record<string, unknown> | null; createdAt: string;
};
export const REQUEST_SELECTION = "id reference serviceTitle serviceSlug scope status version currencyCode quoteMinor quoteTerms expiresAt acceptedAt acceptedSnapshot createdAt";

export const CUSTOMER_REQUEST_PAGE_SIZE = 25;

export async function getCustomerUser() {
  const result = await keystoneClient<{ authenticatedItem: { id: string; name: string; email: string; phone: string | null } | null }>(`query CustomerSession { authenticatedItem { ... on User { id name email phone } } }`);
  return result.success ? result.data.authenticatedItem : null;
}
export async function getCustomerRequests(operator = false, page?: { skip: number; take: number }): Promise<CustomerRequest[]> {
  const result = await keystoneClient<{ constructionCustomerRequests: CustomerRequest[] }>(`query CustomerRequests($operator: Boolean, $skip: Int, $take: Int) { constructionCustomerRequests(operator: $operator, skip: $skip, take: $take) { ${REQUEST_SELECTION} } }`, { operator, skip: page?.skip ?? null, take: page?.take ?? null });
  if (!result.success) throw new Error("Requests are unavailable");
  return result.data.constructionCustomerRequests;
}
export async function getCustomerRequestCount(operator = false): Promise<number> {
  const result = await keystoneClient<{ constructionCustomerRequestCount: number }>(`query CustomerRequestCount($operator: Boolean) { constructionCustomerRequestCount(operator: $operator) }`, { operator });
  if (!result.success) throw new Error("Requests are unavailable");
  return result.data.constructionCustomerRequestCount;
}
export async function getCustomerRequest(id: string): Promise<CustomerRequest | null> {
  const result = await keystoneClient<{ constructionCustomerRequest: CustomerRequest | null }>(`query CustomerRequest($id: ID!) { constructionCustomerRequest(id: $id) { ${REQUEST_SELECTION} } }`, { id });
  return result.success ? result.data.constructionCustomerRequest : null;
}
