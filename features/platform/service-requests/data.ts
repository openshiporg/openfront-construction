import { keystoneClient } from "@/features/dashboard/lib/keystoneClient";

export type OperatorRequest = {
  id: string; reference: string; serviceTitle: string; scope: string; status: string; version: number;
  currencyCode: string; quoteMinor: string; quoteTerms: string; expiresAt: string | null;
  acceptedSnapshot: Record<string, unknown> | null; createdAt: string; depositStatus: string | null;
  projectId?: string | null; opportunityId?: string | null;
};
export type OperatorQueueRow = { request: OperatorRequest; customerName: string; customerEmail: string; customerPhone: string | null };

export const OPERATOR_REQUEST_PAGE_SIZE = 25;

export const REQUEST_VIEWS = {
  quote: { label: "To quote", statuses: ["requested"], empty: "Nothing waiting for a quote" },
  customer: { label: "With customer", statuses: ["quoted", "payment_pending"], empty: "No quotes are out with customers" },
  booked: { label: "Booked", statuses: ["booked"], empty: "No booked jobs yet" },
  cancelled: { label: "Cancelled", statuses: ["cancelled"], empty: "No cancelled requests" },
} as const;
export type RequestView = keyof typeof REQUEST_VIEWS;
export const REQUEST_VIEW_KEYS = Object.keys(REQUEST_VIEWS) as RequestView[];

export async function getOperatorRequests(view: RequestView, page: number): Promise<{ rows: OperatorQueueRow[]; counts: Record<RequestView, number> }> {
  const result = await keystoneClient<{ constructionOperatorRequests: OperatorQueueRow[] } & Record<RequestView, number>>(`
    query OperatorRequests($skip: Int, $take: Int, $statuses: [String!]) {
      constructionOperatorRequests(skip: $skip, take: $take, statuses: $statuses) {
        customerName customerEmail customerPhone
        request { id reference serviceTitle scope status version currencyCode quoteMinor quoteTerms expiresAt acceptedSnapshot createdAt depositStatus projectId opportunityId }
      }
      ${REQUEST_VIEW_KEYS.map(key => `${key}: constructionCustomerRequestCount(operator: true, statuses: ${JSON.stringify(REQUEST_VIEWS[key].statuses)})`).join("\n      ")}
    }
  `, { skip: (page - 1) * OPERATOR_REQUEST_PAGE_SIZE, take: OPERATOR_REQUEST_PAGE_SIZE, statuses: REQUEST_VIEWS[view].statuses });
  if (!result.success) throw new Error("Quote requests are unavailable");
  const counts = Object.fromEntries(REQUEST_VIEW_KEYS.map(key => [key, Number(result.data[key] ?? 0)])) as Record<RequestView, number>;
  return { rows: result.data.constructionOperatorRequests, counts };
}
