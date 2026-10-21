import { ProjectWorkspacePage } from "@/features/platform/projects/screens/ProjectWorkspacePage";

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  return <ProjectWorkspacePage projectId={(await params).projectId} tool="billing" />;
}
