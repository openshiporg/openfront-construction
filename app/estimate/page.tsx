import { InquiryPage } from "@/features/storefront/screens/InquiryPage";
import { getPublicStorefrontMetadata } from "@/features/storefront/data";

export const generateMetadata = async () => getPublicStorefrontMetadata("Request an estimate");

export const dynamic = "force-dynamic";
export default function Page() {
  return <InquiryPage kind="estimate_request" sourcePath="/estimate" mode="project" />;
}
