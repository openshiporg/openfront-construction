import { ServiceDetailPage } from "@/features/storefront/screens/ServiceDetailPage";
import { getPublicConstructionService, getPublicStorefrontMetadata } from "@/features/storefront/data";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const item = await getPublicConstructionService((await params).slug).catch(() => null);
  return getPublicStorefrontMetadata(item?.title ?? "Service not found");
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ServiceDetailPage slug={slug} />;
}
