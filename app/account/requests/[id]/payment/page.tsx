import { notFound, redirect } from "next/navigation";
import { keystoneClient } from "@/features/dashboard/lib/keystoneClient";
import { getCustomerRequest, getCustomerUser } from "@/features/storefront/account/data";
import { getPublicConstructionSite } from "@/features/storefront/data";
import { PublicShell } from "@/features/storefront/components/PublicShell";
import { Track, Pill } from "@/features/storefront/components/ui";
import { PaymentStartForm } from "@/features/storefront/account/PaymentStartForm";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ session_id?: string; cancelled?: string }> }) {
  const { id } = await params; const [site, user, request, search] = await Promise.all([getPublicConstructionSite(), getCustomerUser(), getCustomerRequest(id), searchParams]);
  if (!user) redirect(`/account?from=${encodeURIComponent(`/account/requests/${id}/payment`)}`);
  if (!request) notFound();
  let notice = search.cancelled ? "Checkout was cancelled. No payment was taken." : "";
  if (search.session_id) {
    const response = await keystoneClient<{ reconcileCustomerPayment: { status: string } }>(`mutation ReconcilePayment($requestId: ID!, $sessionId: String!) { reconcileCustomerPayment(requestId: $requestId, sessionId: $sessionId) { status } }`, { requestId: id, sessionId: search.session_id });
    if (response.success && response.data.reconcileCustomerPayment.status === "settled") redirect(`/account/requests/${encodeURIComponent(id)}?paid=1`);
    notice = response.success && response.data.reconcileCustomerPayment.status === "pending"
      ? "Your payment is still processing. Bank payments can take a few days to clear; this page will show it once received."
      : "We could not confirm this payment. Reload to check again or contact the contractor.";
  }
  const snapshot = request.acceptedSnapshot; const amount = Number(snapshot?.totalMinor || request.quoteMinor);
  const payable = request.status === "payment_pending";
  return <PublicShell site={site} account current="/account"><main><header className="sf-pagehead"><div className="sf-wrap"><Track><Pill href={`/account/requests/${encodeURIComponent(id)}`} variant="raised" size="sm">Back to request</Pill></Track><p className="sf-kicker">{request.reference}</p><h1 className="sf-display sf-h1">Pay deposit</h1></div></header><section className="sf-section"><div className="sf-wrap sf-stack"><h2>{snapshot?.serviceTitle ? String(snapshot.serviceTitle) : request.serviceTitle}</h2><p>Deposit due: {(amount / 100).toLocaleString("en-US", { style: "currency", currency: request.currencyCode })}</p>{notice && <p role="status">{notice}</p>}{payable ? <PaymentStartForm requestId={id}/> : <p>This quote is not currently payable.</p>}<p className="sf-small">Pay by card or US bank account (ACH) through Stripe secure checkout.</p></div></section></main></PublicShell>;
}
