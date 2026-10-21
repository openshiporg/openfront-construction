import { keystoneClient } from "@/features/dashboard/lib/keystoneClient";

export type OperatorRequest = {
  id: string; reference: string; serviceTitle: string; scope: string; status: string; version: number;
  currencyCode: string; quoteMinor: string; quoteTerms: string; expiresAt: string | null;
  acceptedSnapshot: Record<string, unknown> | null; createdAt: string;
};
export type OperatorQueueRow = { request: OperatorRequest; customerName: string; customerEmail: string; customerPhone: string | null };

export const OPERATOR_REQUEST_PAGE_SIZE = 25;

export async function getOperatorRequests(page: number): Promise<{ rows: OperatorQueueRow[]; totalCount: number }> {
  const result = await keystoneClient<{ constructionOperatorRequests: OperatorQueueRow[]; constructionCustomerRequestCount: number }>(`
    query OperatorRequests($skip: Int, $take: Int) {
      constructionOperatorRequests(skip: $skip, take: $take) {
        customerName customerEmail customerPhone
        request { id reference serviceTitle scope status version currencyCode quoteMinor quoteTerms expiresAt acceptedSnapshot createdAt }
      }
      constructionCustomerRequestCount(operator: true)
    }
  `, { skip: (page - 1) * OPERATOR_REQUEST_PAGE_SIZE, take: OPERATOR_REQUEST_PAGE_SIZE });
  if (!result.success) throw new Error("Quote requests are unavailable");
  return { rows: result.data.constructionOperatorRequests, totalCount: result.data.constructionCustomerRequestCount };
}
