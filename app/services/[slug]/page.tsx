import { ServiceDetailPage } from "@/features/storefront/screens/ServiceDetailPage";

export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ServiceDetailPage slug={slug} />;
}
