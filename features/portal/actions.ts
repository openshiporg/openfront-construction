'use server';

import { randomUUID } from "node:crypto";

import { keystoneClient } from "@/features/dashboard/lib/keystoneClient";
import type { CommandState } from "@/features/platform/projects/action-state";
import { getPortalApprovalSnapshot } from "./data";

function value(formData: FormData, key: string) { return String(formData.get(key) ?? "").trim(); }
function minorUnits(raw: string) {
  if (!raw) return null;
  const match = raw.replaceAll(",", "").match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) throw new Error("Amount must use at most two decimal places");
  return `${match[1]}${(match[2] || "").padEnd(2, "0")}`.replace(/^0+(?=\d)/, "");
}

export async function submitPortalAction(_previous: CommandState, formData: FormData): Promise<CommandState> {
  const action = value(formData, "portalAction");
  const operation: Record<string, string> = {
    submit_bid: "submitPortalBid", respond_rfi: "respondPortalRfi", review_submittal: "reviewPortalSubmittal",
    submit_claim: "submitPortalProgressClaim", submit_waiver: "submitPortalLienWaiver",
  };
  const mutation = operation[action];
  if (!mutation) return { status: "error", message: "Unsupported portal action" };
  let amountMinor: string | null;
  try { amountMinor = minorUnits(value(formData, "amount")); }
  catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Amount is invalid" }; }
  const input = {
    projectId: value(formData, "projectId"), targetId: value(formData, "targetId"),
    reference: value(formData, "reference") || null, title: value(formData, "title") || null,
    response: value(formData, "response") || "Submitted through the project portal",
    amountMinor, quantity: value(formData, "quantity") || null, unit: value(formData, "unit") || null,
    decision: value(formData, "decision") || null, dueAt: value(formData, "dueAt") || null,
    evidenceReference: value(formData, "evidenceReference") || null,
    evidenceChecksumSha256: value(formData, "evidenceChecksumSha256") || null,
    idempotencyKey: value(formData, "idempotencyKey") || randomUUID(),
  };
  const response = await keystoneClient<Record<string, { replayed?: boolean }>>(`
    mutation PortalWorkflow($input: PortalWorkflowInput!) {
      ${mutation}(input: $input) { success operation itemId actionId replayed }
    }
  `, { input });
  if (!response.success) return { status: "error", message: response.error };
  return { status: "success", message: response.data[mutation].replayed ? "Response already recorded." : "Response recorded." };
}

export async function loadPortalApprovalSnapshot(projectId: string, requestId: string) {
  return getPortalApprovalSnapshot(projectId, requestId);
}

export async function decidePortalApproval(_previous: CommandState, formData: FormData): Promise<CommandState> {
  const response = await keystoneClient<{ decideConstructionApproval: { success: boolean } }>(`
    mutation DecidePortalApproval($input: ConstructionApprovalDecisionInput!) {
      decideConstructionApproval(input: $input) { success requestId decisionId actionId replayed }
    }
  `, { input: { requestId: value(formData, "targetId"), decision: value(formData, "decision"), comment: value(formData, "response") } });
  return response.success ? { status: "success", message: "Decision recorded." } : { status: "error", message: response.error };
}

export async function acknowledgePortalDocument(_previous: CommandState, formData: FormData): Promise<CommandState> {
  const response = await keystoneClient<{ acknowledgeDocumentDistribution: { replayed: boolean } }>(`
    mutation AcknowledgePortalDocument($distributionId: ID!, $acknowledgement: String!) {
      acknowledgeDocumentDistribution(distributionId: $distributionId, acknowledgement: $acknowledgement) { success acknowledgementId replayed }
    }
  `, { distributionId: value(formData, "targetId"), acknowledgement: value(formData, "response") });
  return response.success ? { status: "success", message: response.data.acknowledgeDocumentDistribution.replayed ? "Acknowledgement was already recorded." : "Document acknowledged." } : { status: "error", message: response.error };
}
