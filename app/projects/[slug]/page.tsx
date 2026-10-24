import { ProjectDetailPage } from "@/features/storefront/screens/ProjectDetailPage";
import { getPublicConstructionProject, getPublicStorefrontMetadata } from "@/features/storefront/data";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const item = await getPublicConstructionProject((await params).slug).catch(() => null);
  return getPublicStorefrontMetadata(item?.title ?? "Project not found");
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ProjectDetailPage slug={slug} />;
}
