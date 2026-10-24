import { ProjectStructurePage } from "@/features/platform/project-structure/screens/ProjectStructurePage";

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  return <ProjectStructurePage projectId={(await params).projectId} />;
}
