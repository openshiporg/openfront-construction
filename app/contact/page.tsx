import { InquiryPage } from "@/features/storefront/screens/InquiryPage";
import { getPublicStorefrontMetadata } from "@/features/storefront/data";

export const generateMetadata = async () => getPublicStorefrontMetadata("Contact");

export const dynamic = "force-dynamic";
export default function Page() {
  return <InquiryPage kind="general_contact" sourcePath="/contact" mode="contact" />;
}
