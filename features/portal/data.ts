import { keystoneClient } from "@/features/dashboard/lib/keystoneClient";

export type PortalInboxItem = {
  id: string;
  targetId: string;
  secondaryId: string | null;
  kind: string;
  reference: string;
  title: string;
  status: string;
  dueAt: string | null;
  action: string;
  downloadTargetId?: string | null;
  context?: string[] | null;
};

export async function getPortalInbox(projectId: string) {
  const response = await keystoneClient<{ constructionPortalInbox: PortalInboxItem[] }>(`
    query ConstructionPortalInbox($projectId: ID!) {
      constructionPortalInbox(projectId: $projectId) { id targetId secondaryId kind reference title status dueAt action downloadTargetId context }
    }
  `, { projectId });
  if (!response.success) throw new Error(response.error);
  return response.data.constructionPortalInbox;
}

export async function getPortalApprovalSnapshot(projectId: string, requestId: string) {
  const response = await keystoneClient<{ constructionPortalApprovalSnapshot: string[] }>(`
    query ConstructionPortalApprovalSnapshot($projectId: ID!, $requestId: ID!) {
      constructionPortalApprovalSnapshot(projectId: $projectId, requestId: $requestId)
    }
  `, { projectId, requestId });
  if (!response.success) return { success: false as const, error: response.error };
  return { success: true as const, context: response.data.constructionPortalApprovalSnapshot };
}
