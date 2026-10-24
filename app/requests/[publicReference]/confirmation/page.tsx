import { RequestConfirmationPage } from "@/features/storefront/screens/RequestConfirmationPage";
import { getPublicStorefrontMetadata } from "@/features/storefront/data";

export const generateMetadata = async () => getPublicStorefrontMetadata("Request received");

export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ publicReference: string }> }) {
  const { publicReference } = await params;
  return <RequestConfirmationPage reference={publicReference} />;
}
