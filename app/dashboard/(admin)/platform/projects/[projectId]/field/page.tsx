import { ProjectWorkspacePage } from "@/features/platform/projects/screens/ProjectWorkspacePage";

type PageProps = { params: Promise<{ projectId: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function Page({ params, searchParams }: PageProps) {
  const [{ projectId }, query] = await Promise.all([params, searchParams ?? Promise.resolve({})]);
  return <ProjectWorkspacePage projectId={projectId} tool="field" searchParams={query} />;
}
