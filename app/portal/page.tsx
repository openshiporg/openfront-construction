import { PortalPage } from "@/features/portal/screens/PortalPage";
import { requirePortalUser } from "@/features/portal/session";

export default async function Page() {
  await requirePortalUser("/portal");
  return <PortalPage />;
}
