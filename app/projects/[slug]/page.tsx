import { ProjectDetailPage } from "@/features/storefront/screens/ProjectDetailPage";

export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ProjectDetailPage slug={slug} />;
}
