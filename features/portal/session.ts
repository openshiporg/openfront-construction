import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/features/dashboard/actions/auth";

/** Signed-out portal visitors sign in on the public website and return to the page they opened. */
export async function requirePortalUser(from: string) {
  const response = await getAuthenticatedUser();
  const user = response.success ? (response.data as { authenticatedItem?: { id: string; name: string; email: string } | null } | undefined)?.authenticatedItem : null;
  if (!user) redirect(`/account?from=${encodeURIComponent(from)}`);
  return user;
}
