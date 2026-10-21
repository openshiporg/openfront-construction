import type { Session } from "../access";
import { priceLineFromTotal } from "../domain/line-pricing";
import { assertPortalBidRecoveryOwnership, lockBidSubmissionAdmission } from "../domain/bid-submissions";
import { lockActiveSubmittalReviewStep, lockExecutionAdmission } from "../domain/execution-admission";
import { queryById } from "../domain/tenancy";
import {
  executeProjectCommand,
  optionalDate,
  prepareProgressClaim,
  requireCommandSession,
  requireCreate,
  requireUpdate,
  requiredText,
  type CommandContext,
} from "./construction";

export type PortalWorkflowInput = {
  projectId: string;
  targetId: string;
  reference?: string | null;
  title?: string | null;
  response: string;
  amountMinor?: string | null;
  quantity?: string | null;
  unit?: string | null;
  decision?: string | null;
  dueAt?: string | null;
  evidenceReference?: string | null;
  evidenceChecksumSha256?: string | null;
  idempotencyKey: string;
};

function portalGrant(session: Session, projectId: string) {
  const membership = session.data.projectMemberships?.find(entry =>
    entry.status === "active" && entry.project?.id === projectId &&
    entry.portalType !== "internal" && entry.accessLevel !== "viewer" && entry.portalOrganization?.id,
  );
  if (!membership?.portalOrganization?.id) throw new Error("An active external project organization grant is required");
  return { organizationId: membership.portalOrganization.id, portalType: membership.portalType };
}

function amount(value: unknown) {
  const normalized = requiredText(value, "Bid amount", 30);
  if (!/^\d+$/.test(normalized)) throw new Error("Bid amount must be non-negative integer minor units");
  return normalized;
}

export async function submitPortalBid(
  _root: unknown,
  { input }: { input: PortalWorkflowInput },
  context: CommandContext,
) {
  const session = requireCommandSession(context);
  if (session.authType === "api_key") throw new Error("A live participant session is required");
  const projectId = requiredText(input.projectId, "Project id", 200);
  const grant = portalGrant(session, projectId);
  if (!['subcontractor', 'vendor'].includes(String(grant.portalType))) throw new Error("This portal role cannot submit bids");
  const invitationId = requiredText(input.targetId, "Bid invitation id", 200);
  const total = amount(input.amountMinor);
  let price: ReturnType<typeof priceLineFromTotal> | null = null;
  let budgetCodeId: string | null = null;
  return executeProjectCommand({
    context, operation: "submitPortalBid", permission: "canManagePreconstruction", projectId,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "BidSubmission", allowExternalProjectWrite: true, externalOrganizationId: grant.organizationId,
    beforeReplay: tx => assertPortalBidRecoveryOwnership(tx, projectId, invitationId, grant.organizationId),
    data: {},
    beforeCreate: async tx => {
      const admission = await lockBidSubmissionAdmission(tx, projectId, invitationId, { organizationId: grant.organizationId, enforceDeadline: true });
      if (!admission.budgetCodeId) throw new Error("The invitation budget code is unavailable");
      budgetCodeId = admission.budgetCodeId;
      price = priceLineFromTotal(total, input.quantity || "1");
      return {
        submissionNumber: requiredText(input.reference, "Submission number", 80), status: "submitted", totalMinor: total,
        clarifications: requiredText(input.response, "Bid clarifications", 10_000), submittedAt: new Date(),
        invitation: { connect: { id: invitationId } }, bidPackage: { connect: { id: admission.packageId } },
        tradePartner: { connect: { id: admission.partnerId } }, project: { connect: { id: projectId } },
      };
    },
    afterCreate: async (tx, submission) => {
      if (!price || !budgetCodeId) throw new Error("Portal bid pricing admission is unavailable");
      await requireCreate(tx.sudo(), "BidLineItem")({ data: {
        lineNumber: 1, description: "Portal-submitted base bid",
        quantity: price.quantity, unit: input.unit?.trim() || "LS",
        unitPriceMinor: price.unitPriceMinor, amountMinor: price.amountMinor,
        submission: { connect: { id: submission.id } }, budgetCode: { connect: { id: budgetCodeId } },
        project: { connect: { id: projectId } },
      } });
      await requireUpdate(tx.sudo(), "BidInvitation")({ where: { id: invitationId }, data: {
        status: "submitted", respondedAt: new Date(),
      } });
    },
  });
}

export async function respondPortalRfi(
  _root: unknown,
  { input }: { input: PortalWorkflowInput },
  context: CommandContext,
) {
  const session = requireCommandSession(context);
  if (session.authType === "api_key") throw new Error("A live participant session is required");
  const projectId = requiredText(input.projectId, "Project id", 200);
  const grant = portalGrant(session, projectId);
  const rfiId = requiredText(input.targetId, "RFI id", 200);
  const rfi = await queryById(context, "RFI", rfiId, "id status ballInCourt { id } responsiblePartner { id } project { id }") as Record<string, unknown> & {
    ballInCourt?: { id?: string } | null;
    responsiblePartner?: { id?: string } | null;
    project?: { id?: string } | null;
  } | null;
  const assigned = rfi?.ballInCourt?.id === session.itemId || rfi?.responsiblePartner?.id === grant.organizationId;
  if (rfi?.project?.id !== projectId || !assigned) throw new Error("Assigned RFI not found");
  return executeProjectCommand({
    context, operation: "respondPortalRfi", permission: "canManageProjectExecution", projectId,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "RFIResponse", allowExternalProjectWrite: true, externalOrganizationId: grant.organizationId,
    beforeCreate: async tx => { await lockExecutionAdmission(tx, "RFI", rfiId, projectId, ["open"], { actorId: requireCommandSession(tx).itemId, organizationId: grant.organizationId }); },
    data: {
      response: requiredText(input.response, "RFI response", 10_000), isOfficial: false, respondedAt: new Date(),
      rfi: { connect: { id: rfiId } }, author: { connect: { id: session.itemId } },
      onBehalfOf: { connect: { id: grant.organizationId } }, project: { connect: { id: projectId } },
    },
  });
}

export async function reviewPortalSubmittal(
  _root: unknown,
  { input }: { input: PortalWorkflowInput },
  context: CommandContext,
) {
  const session = requireCommandSession(context);
  if (session.authType === "api_key") throw new Error("A live participant session is required");
  const projectId = requiredText(input.projectId, "Project id", 200);
  const grant = portalGrant(session, projectId);
  const submittalId = requiredText(input.targetId, "Submittal id", 200);
  const decision = ["approved", "approved_as_noted", "revise_resubmit", "rejected"].includes(String(input.decision))
    ? String(input.decision) : null;
  if (!decision) throw new Error("Submittal decision is invalid");
  const reviews = await context.sudo().query.SubmittalReview.findMany!({
    where: {
      submittal: { id: { equals: submittalId } }, project: { id: { equals: projectId } },
      status: { in: ["pending", "in_review"] },
      OR: [{ reviewer: { id: { equals: session.itemId } } }, { reviewerPartner: { id: { equals: grant.organizationId } } }],
    },
    take: 100,
    query: "id status sequence submittalRevision",
  });
  const submittal = await context.sudo().query.Submittal.findOne!({ where: { id: submittalId }, query: "id revision" });
  const activeReview = [...reviews]
    .filter(entry => Number(entry.submittalRevision ?? 0) === Number(submittal?.revision ?? 0))
    .sort((left, right) => Number(left.sequence ?? 0) - Number(right.sequence ?? 0))[0];
  const reviewId = String(activeReview?.id ?? "");
  if (!reviewId) throw new Error("Assigned submittal review not found");
  return executeProjectCommand({
    context, operation: "reviewPortalSubmittal", permission: "canManageProjectExecution", projectId,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "SubmittalReview", updateId: reviewId,
    allowExternalProjectWrite: true, externalOrganizationId: grant.organizationId,
    beforeCreate: async tx => { await lockActiveSubmittalReviewStep(tx, reviewId, submittalId, projectId); },
    data: { status: decision, response: requiredText(input.response, "Review response", 10_000), completedAt: new Date() },
  });
}

export async function submitPortalProgressClaim(
  _root: unknown,
  { input }: { input: PortalWorkflowInput },
  context: CommandContext,
) {
  const session = requireCommandSession(context);
  if (session.authType === "api_key") throw new Error("A live participant session is required");
  const projectId = requiredText(input.projectId, "Project id", 200);
  portalGrant(session, projectId);
  return prepareProgressClaim(_root, { input: {
    projectId,
    reference: requiredText(input.reference, "Claim number", 100),
    title: requiredText(input.title, "Invoice number", 100),
    description: input.response,
    dueAt: input.dueAt,
    amountMinor: input.amountMinor,
    relatedId: input.targetId,
    idempotencyKey: input.idempotencyKey,
  } }, context);
}

export async function submitPortalLienWaiver(
  _root: unknown,
  { input }: { input: PortalWorkflowInput },
  context: CommandContext,
) {
  const session = requireCommandSession(context);
  if (session.authType === "api_key") throw new Error("A live participant session is required");
  const projectId = requiredText(input.projectId, "Project id", 200);
  const grant = portalGrant(session, projectId);
  const commitmentId = requiredText(input.targetId, "Commitment id", 200);
  const commitment = await queryById(context, "Commitment", commitmentId, "id tradePartner { id } project { id }");
  const commitmentPartnerId = (commitment?.tradePartner as { id?: string } | null | undefined)?.id;
  if (commitment?.project?.id !== projectId || commitmentPartnerId !== grant.organizationId) throw new Error("Commitment not found for this portal organization");
  const amountMinor = amount(input.amountMinor);
  const checksum = requiredText(input.evidenceChecksumSha256, "Evidence SHA-256", 64).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(checksum)) throw new Error("Evidence checksum must be SHA-256 hex");
  const evidenceReference = requiredText(input.evidenceReference, "Evidence reference", 160);
  return executeProjectCommand({
    context, operation: "submitPortalLienWaiver", permission: "canManageBilling", projectId,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "LienWaiver", allowExternalProjectWrite: true, externalOrganizationId: grant.organizationId,
    data: {
      waiverNumber: requiredText(input.reference, "Waiver number", 100),
      waiverType: ["conditional_progress", "unconditional_progress", "conditional_final", "unconditional_final"].includes(String(input.decision)) ? input.decision : "conditional_progress",
      status: "received", throughDate: optionalDate(input.dueAt, "Through date") ?? new Date(), amountMinor,
      requestedAt: new Date(), receivedAt: new Date(), signedAt: new Date(),
      signerName: requiredText(input.title, "Signer name", 200),
      fileName: `${evidenceReference}.external`, storageKey: `external:${evidenceReference}`, checksumSha256: checksum,
      tradePartner: { connect: { id: grant.organizationId } }, commitment: { connect: { id: commitmentId } },
      project: { connect: { id: projectId } },
    },
  });
}
