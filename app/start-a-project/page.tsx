import { InquiryPage } from "@/features/storefront/screens/InquiryPage";

export const dynamic = "force-dynamic";
export default function Page() {
  return <InquiryPage kind="project_inquiry" sourcePath="/start-a-project" mode="project" />;
}
