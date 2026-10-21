import { InvitationAcceptancePage } from "@/features/portal/acceptance/InvitationAcceptancePage";
import { getAuthenticatedUser } from "@/features/dashboard/actions/auth";

export const dynamic = "force-dynamic";

export default async function AcceptInvitationRoute({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const [params, response] = await Promise.all([searchParams, getAuthenticatedUser()]);
  const user = response.success ? response.data?.authenticatedItem : null;
  return <InvitationAcceptancePage token={params.token ?? ""} signedInAs={user ? String(user.email || user.name || "") : null} />;
}
