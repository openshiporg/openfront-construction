import { PortalProjectPage } from "@/features/portal/screens/PortalProjectPage";
import { requirePortalUser } from "@/features/portal/session";

export default async function Page({ params }: { params: Promise<{ projectId: string; tool: string }> }) {
  const { projectId, tool } = await params;
  await requirePortalUser(`/portal/projects/${encodeURIComponent(projectId)}/${encodeURIComponent(tool)}`);
  return <PortalProjectPage projectId={projectId} tool={tool} />;
}
