import { RequestConfirmationPage } from "@/features/storefront/screens/RequestConfirmationPage";

export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ publicReference: string }> }) {
  const { publicReference } = await params;
  return <RequestConfirmationPage reference={publicReference} />;
}
