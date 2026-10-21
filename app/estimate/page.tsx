import { InquiryPage } from "@/features/storefront/screens/InquiryPage";

export const dynamic = "force-dynamic";
export default function Page() {
  return <InquiryPage kind="estimate_request" sourcePath="/estimate" mode="project" />;
}
