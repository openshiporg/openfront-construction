import { PortalProjectPage } from "@/features/portal/screens/PortalProjectPage";
import { requirePortalUser } from "@/features/portal/session";

export default async function Page({ params, searchParams }: { params: Promise<{ projectId: string; tool: string }>; searchParams: Promise<{ paymentId?: string; session_id?: string }> }) {
  const { projectId, tool } = await params; const search = await searchParams;
  await requirePortalUser(`/portal/projects/${encodeURIComponent(projectId)}/${encodeURIComponent(tool)}`);
  return <PortalProjectPage projectId={projectId} tool={tool} paymentId={search.paymentId} sessionId={search.session_id} />;
}
