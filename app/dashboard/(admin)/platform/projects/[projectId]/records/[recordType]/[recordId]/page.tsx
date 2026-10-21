import { ProjectRecordDetailPage } from "@/features/platform/projects/screens/ProjectRecordDetailPage";

export default async function RecordDetailRoute({ params }: { params: Promise<{ projectId: string; recordType: string; recordId: string }> }) {
  return <ProjectRecordDetailPage {...await params} />;
}
