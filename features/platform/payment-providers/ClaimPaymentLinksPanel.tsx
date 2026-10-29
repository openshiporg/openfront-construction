import { getPayableClaims } from "@/features/portal/payments/actions";
import { formatMinor } from "@/features/platform/components/kit";
import { ClaimPaymentLinks } from "./ClaimPaymentLinks";

export async function ClaimPaymentLinksPanel({ projectId, currencyCode }: { projectId: string; currencyCode: string }) {
  const claims = await getPayableClaims(projectId);
  return <ClaimPaymentLinks projectId={projectId} claims={claims.map(claim => ({ id: claim.id, claimNumber: claim.claimNumber, remaining: formatMinor(claim.remainingMinor, currencyCode), paymentId: claim.paymentId }))} />;
}
