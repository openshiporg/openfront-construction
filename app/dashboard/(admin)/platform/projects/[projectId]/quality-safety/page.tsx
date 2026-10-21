import { ProjectWorkspacePage } from "@/features/platform/projects/screens/ProjectWorkspacePage";

export default async function Page({ params, searchParams }: {
  params: Promise<{ projectId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ projectId }, query] = await Promise.all([params, searchParams ?? Promise.resolve({})]);
  return <ProjectWorkspacePage projectId={projectId} tool="quality-safety" searchParams={query} />;
}
