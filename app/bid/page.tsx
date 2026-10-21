import { InquiryPage } from "@/features/storefront/screens/InquiryPage";

export const dynamic = "force-dynamic";
export default function Page() {
  return <InquiryPage kind="trade_partner_interest" sourcePath="/bid" mode="trade" />;
}
