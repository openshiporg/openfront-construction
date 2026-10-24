import { InquiryPage } from "@/features/storefront/screens/InquiryPage";
import { getPublicStorefrontMetadata } from "@/features/storefront/data";

export const generateMetadata = async () => getPublicStorefrontMetadata("Project inquiry");

export const dynamic = "force-dynamic";
export default function Page() {
  return <InquiryPage kind="project_inquiry" sourcePath="/client-intake" mode="project" />;
}
