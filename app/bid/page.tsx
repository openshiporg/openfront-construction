import { InquiryPage } from "@/features/storefront/screens/InquiryPage";
import { getPublicStorefrontMetadata } from "@/features/storefront/data";

export const generateMetadata = async () => getPublicStorefrontMetadata("Bid with us");

export const dynamic = "force-dynamic";
export default function Page() {
  return <InquiryPage kind="trade_partner_interest" sourcePath="/bid" mode="trade" />;
}
