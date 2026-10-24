import { InquiryPage } from "@/features/storefront/screens/InquiryPage";
import { getPublicStorefrontMetadata } from "@/features/storefront/data";

export const generateMetadata = async () => getPublicStorefrontMetadata("Invite us to bid");

export const dynamic = "force-dynamic";
export default function Page() {
  return <InquiryPage kind="rfp_invitation" sourcePath="/rfp" mode="project" />;
}
