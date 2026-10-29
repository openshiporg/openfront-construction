import { notFound, redirect } from "next/navigation";
import { keystoneClient } from "@/features/dashboard/lib/keystoneClient";
import { getCustomerRequest, getCustomerUser, getCustomerPaymentProviderId } from "@/features/storefront/account/data";
import { getPublicConstructionSite } from "@/features/storefront/data";
import { PublicShell } from "@/features/storefront/components/PublicShell";
import { Track, Pill } from "@/features/storefront/components/ui";
import { customerPaymentAction } from "@/features/storefront/account/actions";
import { PaymentStartForm } from "@/features/storefront/account/PaymentStartForm";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ session_id?: string }> }) {
  const { id } = await params; const [site, user, request, search] = await Promise.all([getPublicConstructionSite(), getCustomerUser(), getCustomerRequest(id), searchParams]);
  if (!user) redirect(`/account?from=${encodeURIComponent(`/account/requests/${id}/payment`)}`);
  if (!request) notFound();
  if (search.session_id) {
    const response = await keystoneClient(`mutation ReconcilePayment($requestId: ID!, $sessionId: String!) { reconcileCustomerPayment(requestId: $requestId, sessionId: $sessionId) { status } }`, { requestId: id, sessionId: search.session_id });
    if (response.success) redirect(`/account/requests/${encodeURIComponent(id)}`);
  }
  const snapshot = request.acceptedSnapshot; const amount = String(snapshot?.totalMinor || request.quoteMinor);
  const providerId = await getCustomerPaymentProviderId();
  return <PublicShell site={site} account current="/account"><main><header className="sf-pagehead"><div className="sf-wrap"><Track><Pill href={`/account/requests/${encodeURIComponent(id)}`} variant="raised" size="sm">Back to request</Pill></Track><p className="sf-kicker">{request.reference}</p><h1 className="sf-display sf-h1">Pay accepted quote</h1></div></header><section className="sf-section"><div className="sf-wrap sf-stack"><h2>{snapshot?.serviceTitle ? String(snapshot.serviceTitle) : request.serviceTitle}</h2><p>Deposit due: ${(Number(amount) / 100).toFixed(2)} {request.currencyCode}</p>{request.status === "payment_pending" ? <p>Contact the contractor to arrange payment.</p> : <p>This quote is not currently payable.</p>}{providerId && <PaymentStartForm requestId={id} providerId={providerId}/>}</div></section></main></PublicShell>;
}
