import { InquiryPage } from "@/features/storefront/screens/InquiryPage";
import { getPublicStorefrontMetadata } from "@/features/storefront/data";

export const generateMetadata = async () => getPublicStorefrontMetadata("Start a project");

export const dynamic = "force-dynamic";
export default function Page() {
  return <InquiryPage kind="project_inquiry" sourcePath="/start-a-project" mode="project" />;
}
