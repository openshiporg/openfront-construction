import { assertAssignedOwnerApprovalSnapshot, presentApprovalSnapshot } from "../domain/approval-review";

import { hasProjectPermission, type Session } from "../access";
import type { CommandContext } from "../mutations/construction";

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
  context?: string[];
};

function requirePortalGrant(context: CommandContext, projectId: string) {
  const session = context.session as Session | undefined;
  if (!session?.itemId || session.data.isActive === false || session.authType === "api_key") throw new Error("A live participant session is required");
  const grant = session.data.projectMemberships?.find(entry =>
    entry.status === "active" && entry.project?.id === projectId && entry.portalType !== "internal" && entry.portalOrganization?.id,
  );
  const companyId = grant?.project?.company?.id;
  if (!grant?.portalOrganization?.id || !companyId) throw new Error("An active external project organization grant is required");
  return { session, companyId, organizationId: grant.portalOrganization.id, grant };
}
function text(value: unknown, fallback = "") { return typeof value === "string" && value ? value : fallback; }
function bounded(value: string, max = 4_000) { return value.length <= max ? value : `${value.slice(0, max)}…`; }
function date(value: unknown) { return value instanceof Date ? value.toISOString() : typeof value === "string" && value ? new Date(value).toISOString() : null; }
function related(value: unknown) { return value && typeof value === "object" ? value as Record<string, unknown> : {}; }
function moneyLabel(value: unknown, currency: unknown) {
  try {
    const minor = BigInt(String(value ?? 0)); const absolute = minor < 0 ? -minor : minor;
    return `${text(currency, "USD")} ${minor < 0 ? "-" : ""}${(absolute / BigInt(100)).toString()}.${(absolute % BigInt(100)).toString().padStart(2, "0")}`;
  } catch { return `${text(currency, "USD")} —`; }
}

export async function constructionPortalInbox(
  _root: unknown,
  { projectId }: { projectId: string },
  context: CommandContext,
): Promise<PortalInboxItem[]> {
  const id = text(projectId);
  if (!id) throw new Error("Project id is required");
  const { session, companyId, organizationId, grant } = requirePortalGrant(context, id);
  const query = context.sudo().query;
  const canPreconstruction = hasProjectPermission(session, companyId, id, "canReadPreconstruction");
  const canExecute = hasProjectPermission(session, companyId, id, "canReadProjectExecution");
  const canBill = hasProjectPermission(session, companyId, id, "canReadBilling");
  const canReadDocuments = hasProjectPermission(session, companyId, id, "canReadDocuments");
  const [invitations, rfis, reviews, commitments, approvals, distributions, drawings] = await Promise.all([
    canPreconstruction ?
    query.BidInvitation.findMany!({
      where: { project: { id: { equals: id } }, tradePartner: { id: { equals: organizationId } }, status: { in: ["draft", "invited"] } },
      take: 50, orderBy: { createdAt: "desc" }, query: "id status bidPackage { number title description instructions dueAt status }",
    }) : Promise.resolve([]),
    canExecute ? query.RFI.findMany!({
      where: { project: { id: { equals: id } }, status: { equals: "open" }, OR: [
        { ballInCourt: { id: { equals: session.itemId } } }, { responsiblePartner: { id: { equals: organizationId } } },
      ] },
      take: 50, orderBy: { createdAt: "desc" }, query: "id number subject question status dueAt responses(where: { isOfficial: { equals: true } }, take: 10, orderBy: { respondedAt: desc }) { response respondedAt author { name } }",
    }) : Promise.resolve([]),
    canExecute ? query.SubmittalReview.findMany!({
      where: { project: { id: { equals: id } }, status: { in: ["pending", "in_review"] }, OR: [
        { reviewer: { id: { equals: session.itemId } } }, { reviewerPartner: { id: { equals: organizationId } } },
      ] },
      take: 50, orderBy: { createdAt: "desc" }, query: "id status dueAt response submittal { id number title revision description }",
    }) : Promise.resolve([]),
    canBill ? query.Commitment.findMany!({
      where: { project: { id: { equals: id } }, tradePartner: { id: { equals: organizationId } }, status: { in: ["executed", "complete"] } },
      take: 50, orderBy: { createdAt: "desc" }, query: "id number title status revisedContractMinor",
    }) : Promise.resolve([]),
    grant.portalType === "owner" ? query.ApprovalRequest.findMany!({
      where: { company: { id: { equals: companyId } }, project: { id: { equals: id } }, status: { equals: "pending" }, assignedTo: { user: { id: { equals: session.itemId }, isActive: { equals: true } }, status: { equals: "active" }, portalType: { equals: "owner" }, portalOrganization: { id: { equals: organizationId } }, project: { id: { equals: id } } } },
      take: 50, orderBy: { requestedAt: "desc" }, query: "id requestNumber targetType targetStatus amountMinor currencyCode status requestedAt canonicalSnapshot snapshotDigest assignedTo { id status accessLevel portalType portalOrganization { id } user { id isActive } role { id } project { id company { id } } }",
    }) : Promise.resolve([]),
    canReadDocuments ? query.DocumentDistribution.findMany!({
      where: { project: { id: { equals: id } }, recipient: { user: { id: { equals: session.itemId } }, status: { equals: "active" } }, OR: [
        { expiresAt: { equals: null } }, { expiresAt: { gt: new Date() } },
      ] },
      take: 50, orderBy: { distributedAt: "desc" }, query: "id purpose expiresAt documentVersion { id fileName versionNumber issuedAt document { documentNumber title } } acknowledgements(take: 20) { id acknowledgedBy { id } }",
    }) : Promise.resolve([]),
    canReadDocuments ? query.Drawing.findMany!({
      where: { project: { id: { equals: id } }, NOT: [{ currentRevision: null }] },
      take: 100, orderBy: { drawingNumber: "asc" }, query: "id drawingNumber title currentRevision { id revisionNumber status fileName issuedAt }",
    }) : Promise.resolve([]),
  ]);
  const items: PortalInboxItem[] = [];
  for (const row of invitations) {
    const bidPackage = related(row.bidPackage);
    if (bidPackage.status !== "open") continue;
    items.push({ id: `bid:${row.id}`, targetId: text(row.id), secondaryId: null, kind: "Bid invitation", reference: text(bidPackage.number), title: text(bidPackage.title, "Bid package"), status: text(row.status), dueAt: date(bidPackage.dueAt), action: "submit_bid", context: [bounded(text(bidPackage.description)), bounded(text(bidPackage.instructions))].filter(Boolean) });
  }
  for (const row of rfis) {
    const responses = Array.isArray(row.responses) ? row.responses as Array<Record<string, unknown>> : [];
    const context = [text(row.question) ? bounded(`Question: ${text(row.question)}`) : "", ...responses.map(response => bounded(`Official response${text(related(response.author).name) ? ` · ${text(related(response.author).name)}` : ""}: ${text(response.response)}`))].filter(Boolean);
    items.push({ id: `rfi:${row.id}`, targetId: text(row.id), secondaryId: null, kind: "RFI", reference: text(row.number), title: text(row.subject), status: text(row.status), dueAt: date(row.dueAt), action: "respond_rfi", context });
  }
  for (const row of reviews) {
    const submittal = related(row.submittal);
    if (!submittal.id) continue;
    items.push({ id: `review:${row.id}`, targetId: text(submittal.id), secondaryId: text(row.id), kind: "Submittal review", reference: text(submittal.number), title: text(submittal.title), status: text(row.status), dueAt: date(row.dueAt), action: "review_submittal", context: [text(submittal.description) ? bounded(`Submission: ${text(submittal.description)}`) : "", text(row.response) ? bounded(`Prior response: ${text(row.response)}`) : "", `Revision ${String(submittal.revision ?? 0)}`].filter(Boolean) });
  }
  for (const row of commitments) {
    const base = { targetId: text(row.id), secondaryId: null, reference: text(row.number), title: text(row.title), status: text(row.status), dueAt: null };
    items.push({ ...base, id: `claim:${row.id}`, kind: "Commitment billing", action: "submit_claim" });
    items.push({ ...base, id: `waiver:${row.id}`, kind: "Lien waiver", action: "submit_waiver" });
  }
  let needsApprovalStaffReview = false;
  for (const row of approvals) {
    try { assertAssignedOwnerApprovalSnapshot(row, { userId: session.itemId, companyId, projectId: id, organizationId, portalType: grant.portalType, roleId: grant.role?.id, accessLevel: grant.accessLevel }); }
    catch { needsApprovalStaffReview = true; continue; }
    items.push({ id: `approval:${row.id}`, targetId: text(row.id), secondaryId: null, kind: "Approval", reference: text(row.requestNumber), title: `${text(row.targetType)} → ${text(row.targetStatus)} · ${moneyLabel(row.amountMinor, row.currencyCode)}`, status: text(row.status), dueAt: null, action: "decide_approval" });
  }
  if (needsApprovalStaffReview) items.push({ id: "approval:staff-review", targetId: "", secondaryId: null, kind: "Approval", reference: "Prior approval assignment", title: "A prior approval request needs project staff review before it can be shared again.", status: "pending", dueAt: null, action: "contact_staff" });
  for (const row of distributions) {
    const version = related(row.documentVersion); const document = related(version.document);
    if (!version.id || !version.issuedAt) continue;
    const acknowledged = Array.isArray(row.acknowledgements) && row.acknowledgements.some(entry => related(related(entry).acknowledgedBy).id === session.itemId);
    items.push({ id: `document:${row.id}`, targetId: text(row.id), secondaryId: text(version.id), downloadTargetId: text(version.id), kind: "Distributed document", reference: text(document.documentNumber), title: `${text(document.title)} · v${String(version.versionNumber ?? "")}`, status: acknowledged ? "acknowledged" : "distributed", dueAt: date(row.expiresAt), action: acknowledged ? "download_document" : "ack_document" });
  }
  for (const row of drawings) {
    const revision = related(row.currentRevision);
    if (!revision.id || revision.status !== "issued") continue;
    items.push({ id: `drawing:${revision.id}`, targetId: text(revision.id), secondaryId: null, kind: "Current drawing", reference: text(row.drawingNumber), title: `${text(row.title)} · ${text(revision.revisionNumber)}`, status: "current", dueAt: date(revision.issuedAt), action: "download_drawing" });
  }
  return items;
}

export async function constructionPortalApprovalSnapshot(
  _root: unknown,
  { projectId, requestId }: { projectId: string; requestId: string },
  context: CommandContext,
): Promise<string[]> {
  const project = text(projectId);
  const request = text(requestId);
  if (!project || project.length > 200 || !request || request.length > 200) throw new Error("A valid project and approval request are required");
  const { session, companyId, organizationId, grant } = requirePortalGrant(context, project);
  if (grant.portalType !== "owner") throw new Error("An assigned owner review is required");
  const [approval] = await context.sudo().query.ApprovalRequest.findMany!({
    where: {
      company: { id: { equals: companyId } },
      project: { id: { equals: project } },
      id: { equals: request },
      status: { equals: "pending" },
      assignedTo: { user: { id: { equals: session.itemId }, isActive: { equals: true } }, status: { equals: "active" }, portalType: { equals: "owner" }, portalOrganization: { id: { equals: organizationId } }, project: { id: { equals: project } } },
    },
    take: 1,
    query: "id targetId targetType targetStatus amountMinor currencyCode canonicalSnapshot snapshotDigest assignedTo { id status accessLevel portalType portalOrganization { id } user { id isActive } role { id } project { id company { id } } }", 
  });
  const assignedTo = related(approval?.assignedTo);
  if (!approval?.id || assignedTo.status !== "active" || assignedTo.portalType === "internal") {
    throw new Error("Pending assigned portal approval was not found");
  }
  const rawSnapshot = text(approval.canonicalSnapshot);
  assertAssignedOwnerApprovalSnapshot(approval, { userId: session.itemId, companyId, projectId: project, organizationId, portalType: grant.portalType, roleId: grant.role?.id, accessLevel: grant.accessLevel });
  return presentApprovalSnapshot(text(approval.targetType), approval, rawSnapshot);
}
