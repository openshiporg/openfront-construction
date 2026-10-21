'use server';

import { keystoneClient } from "@/features/dashboard/lib/keystoneClient";
import type { CommandState } from "@/features/platform/projects/action-state";

function value(formData: FormData, key: string) { return String(formData.get(key) ?? "").trim(); }
function minorUnits(raw: string) {
  const match = raw.replaceAll(",", "").match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) throw new Error("Threshold must use at most two decimal places");
  return `${match[1]}${(match[2] || "").padEnd(2, "0")}`.replace(/^0+(?=\d)/, "");
}

export async function configureProjectApprovalPolicy(_previous: CommandState, formData: FormData): Promise<CommandState> {
  let minimumAmountMinor: string;
  try { minimumAmountMinor = minorUnits(value(formData, "minimumAmount")); }
  catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Threshold is invalid" }; }
  const response = await keystoneClient<{ configureConstructionApprovalPolicy: { replayed: boolean } }>(`
    mutation ConfigureProjectApprovalPolicy($input: ConstructionApprovalPolicyInput!) {
      configureConstructionApprovalPolicy(input: $input) { success operation itemId actionId replayed }
    }
  `, { input: {
    projectId: value(formData, "projectId"), policyId: value(formData, "policyId") || null,
    name: value(formData, "name"), domain: value(formData, "domain"), minimumAmountMinor,
    approverRoleId: value(formData, "approverRoleId"), isActive: value(formData, "isActive") !== "false",
    idempotencyKey: value(formData, "idempotencyKey"),
  } });
  return response.success ? { status: "success", message: response.data.configureConstructionApprovalPolicy.replayed ? "Policy already saved." : "Approval policy saved." } : { status: "error", message: response.error };
}

export async function requestProjectApproval(_previous: CommandState, formData: FormData): Promise<CommandState> {
  const target = value(formData, "target");
  const separator = target.indexOf(":");
  if (separator < 1) return { status: "error", message: "Select a resource for approval" };
  const response = await keystoneClient<{ requestConstructionApproval: { replayed?: boolean } }>(`
    mutation RequestProjectApproval($input: ConstructionApprovalRequestInput!) {
      requestConstructionApproval(input: $input) { success requestId actionId replayed }
    }
  `, { input: {
    targetType: target.slice(0, separator), targetId: target.slice(separator + 1), targetStatus: "approved",
    requestNumber: value(formData, "requestNumber"), reason: value(formData, "reason"),
    assigneeMembershipId: value(formData, "assigneeMembershipId") || null,
  } });
  return response.success
    ? { status: "success", message: response.data.requestConstructionApproval.replayed ? "Existing approval request found." : "Approval requested." }
    : { status: "error", message: response.error };
}

export async function loadProjectApprovalSnapshot(projectId: string, requestId: string): Promise<{ success: true; terms: string[] } | { success: false; message: string }> {
  try {
    const response = await keystoneClient<{ constructionApprovalSnapshot: string[] }>(`query ApprovalReview($projectId: ID!, $requestId: ID!) { constructionApprovalSnapshot(projectId: $projectId, requestId: $requestId) }`, { projectId, requestId });
    if (!response.success) return { success: false, message: "The approval review is unavailable. Try again." };
    return { success: true, terms: response.data.constructionApprovalSnapshot };
  } catch { return { success: false, message: "The approval review could not be loaded. Try again." }; }
}

export async function decideProjectApproval(_previous: CommandState, formData: FormData): Promise<CommandState> {
  if (value(formData, "reviewedRequestId") !== value(formData, "requestId") || !value(formData, "requestId")) return { status: "error", message: "Review the selected request before deciding." };
  const response = await keystoneClient<{ decideConstructionApproval: { success: boolean } }>(`
    mutation DecideProjectApproval($input: ConstructionApprovalDecisionInput!) {
      decideConstructionApproval(input: $input) { success requestId decisionId actionId replayed }
    }
  `, { input: { requestId: value(formData, "requestId"), decision: value(formData, "decision"), comment: value(formData, "comment") } });
  return response.success ? { status: "success", message: "Approval decision recorded." } : { status: "error", message: response.error };
}
