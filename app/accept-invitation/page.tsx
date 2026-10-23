import { InvitationAcceptancePage } from "@/features/portal/acceptance/InvitationAcceptancePage";
import { getAuthenticatedUser } from "@/features/dashboard/actions/auth";
import { PublicShell } from "@/features/storefront/components/PublicShell";
import { getPublicConstructionSite } from "@/features/storefront/data";

export const dynamic = "force-dynamic";

export default async function AcceptInvitationRoute({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const [params, response, site] = await Promise.all([searchParams, getAuthenticatedUser(), getPublicConstructionSite().catch(() => null)]);
  const user = response.success ? response.data?.authenticatedItem : null;
  return (
    <PublicShell site={site} account dock={false}>
      <InvitationAcceptancePage token={params.token ?? ""} signedInAs={user ? String(user.email || user.name || "") : null} />
    </PublicShell>
  );
}
