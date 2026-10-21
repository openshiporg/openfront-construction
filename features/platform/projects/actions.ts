'use server';

import { randomUUID } from "node:crypto";
import { keystoneClient } from "@/features/dashboard/lib/keystoneClient";
import type { CommandState } from "./action-state";
import { amountToMinorUnits } from "./money";

const createOperations = new Set([
  "startBidPackage",
  "openChangeEvent",
  "raiseRfi",
  "registerSubmittal",
  "startDailyLog",
  "recordSafetyObservation",
  "recordPunchItem",
  "registerDocument",
  "recordDirectCost",
  "awardBidSubmission",
  "prepareProgressClaim",
  "recordProgressPayment",
]);

function value(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function runConstructionCommand(
  _previous: CommandState,
  formData: FormData,
): Promise<CommandState> {
  const operation = value(formData, "operation");
  if (!createOperations.has(operation)) return { status: "error", message: "Unsupported construction command" };
  const projectId = value(formData, "projectId");
  let amountMinor: string | null;
  try {
    amountMinor = amountToMinorUnits(value(formData, "amount"));
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Amount is invalid" };
  }
  const input = {
    projectId,
    reference: value(formData, "reference"),
    title: value(formData, "title"),
    description: value(formData, "description") || null,
    dueAt: value(formData, "dueAt") || null,
    amountMinor,
    retainageBps: value(formData, "retainageBps") ? Number(value(formData, "retainageBps")) : null,
    relatedId: value(formData, "relatedId") || null,
    idempotencyKey: value(formData, "idempotencyKey") || randomUUID(),
  };
  const response = await keystoneClient<Record<string, { success: boolean; replayed: boolean }>>(`
    mutation ConstructionCommand($input: ConstructionCommandInput!) {
      ${operation}(input: $input) { success operation itemId actionId replayed }
    }
  `, { input });
  if (!response.success) return { status: "error", message: response.error };
  return { status: "success", message: response.data[operation].replayed ? "Request safely replayed." : "Record created." };
}

const workflowOperations = new Set([
  "registerTradePartner", "addBudgetLine", "createBudgetChangeWithLine", "reversePostedDirectCost", "createEstimateWithLine", "reviseEstimate", "inviteBidder", "recordBidSubmission",
  "registerSpecificationSection", "registerInspectionTemplate", "addChangeEventLine", "recordChangeQuote",
  "createPrimeContractWithLine", "createCommitmentWithLine", "createChangeOrderWithLine", "routeRfi", "respondToRfi",
  "routeSubmittalReview", "recordSubmittalReview", "addDailyLogEntry", "registerFieldPhoto", "recordLaborTime", "createResourceCatalogItem", "registerSchedule", "registerScheduleTask", "linkScheduleDependency",
  "updateScheduleTaskProgress", "recordSafetyIncident", "createInspectionWithItem", "recordInspectionItemResult",
  "registerCorrectiveAction", "recordCorrectiveActionEvidence", "createProcurementRequestWithLine", "placeProcurementOrder", "recordMaterialReceipt", "recordLienWaiverEvidence",
  "requestRetainageRelease", "registerDrawing", "recordResourceActivity", "inviteProjectMember", "allocateSettledPayment", "reverseSettledPayment",
]);

export async function runConstructionWorkflow(
  _previous: CommandState,
  formData: FormData,
): Promise<CommandState> {
  const operation = value(formData, "operation");
  if (!workflowOperations.has(operation)) return { status: "error", message: "Unsupported construction workflow" };
  let amountMinor: string | null;
  try {
    amountMinor = amountToMinorUnits(value(formData, "amount"), operation === "createChangeOrderWithLine" || operation === "createBudgetChangeWithLine");
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Amount is invalid" };
  }
  const input = {
    projectId: value(formData, "projectId"),
    reference: value(formData, "reference") || operation,
    title: value(formData, "title") || operation.replaceAll(/([A-Z])/g, " $1").trim(),
    description: value(formData, "description") || null,
    dueAt: value(formData, "dueAt") || null,
    occurredAt: value(formData, "occurredAt") || null,
    amountMinor,
    relatedId: value(formData, "relatedId") || null,
    secondaryId: value(formData, "secondaryId") || null,
    partnerId: value(formData, "partnerId") || null,
    userId: value(formData, "userId") || null,
    roleId: value(formData, "roleId") || null,
    type: value(formData, "type") || null,
    quantity: value(formData, "quantity") || null,
    unit: value(formData, "unit") || null,
    evidenceReference: value(formData, "evidenceReference") || null,
    evidenceChecksumSha256: value(formData, "evidenceChecksumSha256") || null,
    incidentType: value(formData, "incidentType") || null,
    idempotencyKey: value(formData, "idempotencyKey") || randomUUID(),
  };
  const response = await keystoneClient<Record<string, { replayed: boolean; itemId: string; activationToken?: string | null }>>(`
    mutation ConstructionWorkflow($input: ConstructionWorkflowInput!) {
      ${operation}(input: $input) {
        success
        ${operation === "inviteProjectMember" ? "operation itemId actionId replayed activationToken" : "operation itemId actionId replayed"}
      }
    }
  `, { input });
  if (!response.success) return { status: "error", message: response.error };
  const result = response.data[operation];
  if (operation === "inviteProjectMember" && result.activationToken) {
    return {
      status: "success",
      message: "Invitation created. Copy or open this one-time activation link; it cannot be recovered after leaving this screen.",
      oneTimeSecret: `/accept-invitation?token=${encodeURIComponent(result.activationToken)}`,
      oneTimeSecretKind: "invitation-link",
    };
  }
  return { status: "success", itemId: result.itemId, message: result.replayed ? "Request safely replayed." : "Workflow record saved with audit evidence." };
}

export async function createConstructionProjectAction(
  _previous: CommandState,
  formData: FormData,
): Promise<CommandState> {
  const input = {
    companyId: value(formData, "companyId"),
    projectNumber: value(formData, "projectNumber"),
    name: value(formData, "name"),
    description: value(formData, "description") || null,
    startDate: value(formData, "startDate") || null,
    currencyCode: value(formData, "currencyCode").toUpperCase() || "USD",
    idempotencyKey: value(formData, "idempotencyKey") || randomUUID(),
  };
  const response = await keystoneClient<{ createConstructionProject: { replayed: boolean; itemId: string } }>(`
    mutation CreateConstructionProject($input: ConstructionProjectCommandInput!) {
      createConstructionProject(input: $input) { success operation itemId actionId replayed }
    }
  `, { input });
  if (!response.success) return { status: "error", message: response.error };
  return { status: "success", message: "Project created.", itemId: response.data.createConstructionProject.itemId };
}

export async function addProjectMemberAction(
  _previous: CommandState,
  formData: FormData,
): Promise<CommandState> {
  const projectId = value(formData, "projectId");
  const input = {
    projectId,
    userId: value(formData, "userId"),
    accessLevel: value(formData, "accessLevel"),
    idempotencyKey: value(formData, "idempotencyKey") || randomUUID(),
  };
  const response = await keystoneClient<{ addProjectMember: { replayed: boolean } }>(`
    mutation AddProjectMember($input: ProjectMemberCommandInput!) {
      addProjectMember(input: $input) { success operation itemId actionId replayed }
    }
  `, { input });
  if (!response.success) return { status: "error", message: response.error };
  return { status: "success", message: "Project member added." };
}

const transitionOperations: Record<string, string> = {
  Project: "transitionProjectStatus",
  "Bid package": "transitionBidPackageStatus",
  Estimate: "transitionEstimateStatus",
  "Budget change": "transitionBudgetChangeStatus",
  "Prime contract": "transitionPrimeContractStatus",
  Commitment: "transitionCommitmentStatus",
  "Subcontract / PO": "transitionCommitmentStatus",
  "Change event": "transitionChangeEventStatus",
  "Change order": "transitionChangeOrderStatus",
  RFI: "transitionRfiStatus",
  Submittal: "transitionSubmittalStatus",
  "Progress claim": "transitionProgressClaimStatus",
  Incident: "transitionSafetyIncidentStatus",
  Inspection: "transitionInspectionStatus",
  Schedule: "transitionScheduleStatus",
  "Schedule task": "transitionScheduleTaskStatus",
  "Daily log": "transitionDailyLogStatus",
  Punch: "transitionPunchItemStatus",
  Observation: "transitionSafetyObservationStatus",
  "Corrective action": "transitionCorrectiveActionStatus",
  Payment: "transitionPaymentStatus",
  "Retainage release": "transitionRetainageReleaseStatus",
  "Lien waiver": "transitionLienWaiverStatus",
  "Procurement request": "transitionProcurementRequestStatus",
};

export async function transitionConstructionItem(
  _previous: CommandState,
  formData: FormData,
): Promise<CommandState> {
  const kind = value(formData, "kind");
  const operation = transitionOperations[kind];
  if (!operation) return { status: "error", message: "This record has no controlled transition." };
  const input = {
    id: value(formData, "itemId"),
    toStatus: value(formData, "toStatus"),
    reason: value(formData, "reason"),
    idempotencyKey: value(formData, "idempotencyKey") || randomUUID(),
  };
  const response = await keystoneClient<Record<string, { replayed: boolean }>>(`
    mutation TransitionConstructionItem($input: LifecycleTransitionInput!) {
      ${operation}(input: $input) { success itemId fromStatus toStatus actionId replayed }
    }
  `, { input });
  if (!response.success) return { status: "error", message: response.error };
  return { status: "success", message: response.data[operation].replayed ? "Transition replayed safely." : "Status advanced." };
}
