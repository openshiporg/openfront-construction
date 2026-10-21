import { PortalProjectPage } from "@/features/portal/screens/PortalProjectPage";
import { requirePortalUser } from "@/features/portal/session";

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  await requirePortalUser(`/portal/projects/${encodeURIComponent(projectId)}`);
  return <PortalProjectPage projectId={projectId} />;
}
