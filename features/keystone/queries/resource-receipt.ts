import { resourceAuthority } from "../domain/resource-activity";
import { decodeResourceIntent, encodeResourceIntent, sameResourceIntentOwner, unresolvedResourceReceipt, type ResourceIntentReceipt, type ResourceIntentScope } from "../domain/resource-intent";
import { quantityToUnits } from "../domain/procurement-invariants";
import { canonicalJson, commandDigest, requireCreate, requireUpdate, requiredText, type CommandContext } from "../mutations/construction";
import type { ResourceContext } from "./resource-activity";

export async function currentResourceIntentScope(context: CommandContext, projectId: string, write = false): Promise<ResourceIntentScope> {
  const current = await resourceAuthority(context, projectId, write);
  return { version: 2, purpose: "recordResourceActivity", actorId: current.session.itemId, principalId: current.session.authType === "api_key" ? `api:${current.session.apiCredential?.id ?? ""}` : "human", companyId: current.companyId, projectId, currencyCode: current.currencyCode };
}
const iso = (value: unknown) => value instanceof Date ? value.toISOString() : typeof value === "string" && Number.isFinite(new Date(value).getTime()) ? new Date(value).toISOString() : null;
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" ? value as Record<string, unknown> : {};
const idOf = (value: unknown) => String(object(value).id ?? "");

export async function constructionResourceActivityReceipt(_root: unknown, { intentJson }: { intentJson: string }, context: ResourceContext): Promise<ResourceIntentReceipt> {
  const intent = decodeResourceIntent(intentJson);
  // Authority and bounded header precede any private fact projection. No NEW
  // catalog availability/currency admission is needed to read accepted history.
  const current = await currentResourceIntentScope(context, intent.scope.projectId, true);
  if (!sameResourceIntentOwner(intent.scope, current)) throw new Error("Original resource intent is not authorized for this actor/purpose/company/project");
  const fingerprint = commandDigest(`${intent.scope.companyId}\u001frecordResourceActivity\u001f${intent.input.idempotencyKey.trim()}`);
  const requestHash = commandDigest(canonicalJson({ operation: "recordResourceActivity", ...intent.input, actorId: intent.scope.actorId, principalId: intent.scope.principalId }));
  const key = await context.sudo().query.IdempotencyKey.findOne!({ where: { fingerprint }, query: "id requestHash status operation resourceType resourceId errorCode toStatus expiresAt company { id } project { id } agentAction { id action actorType actorUser { id } requestedBy { id } correlationId targetType targetId targetStatus status reason requestDigest resultDigest completedAt company { id } project { id } }" });
  if (!key) return unresolvedResourceReceipt("not_found", "No original receipt is currently observable. This is not rollback or permission to rekey; retain/retrieve/retry the SAME original.");
  if (key.requestHash !== requestHash) return unresolvedResourceReceipt("conflict", "The original key/body does not match. Preserve it for authorized review; do not replace the key.");
  const action = object(key.agentAction);
  if (key.status === "failed" && key.errorCode === "ORIGINAL_ADMISSION_CLOSED" && key.toStatus === "closed_before_admission" && !key.resourceId && key.operation === "recordResourceActivity" && key.resourceType === "ResourceLog" && idOf(key.company) === current.companyId && idOf(key.project) === current.projectId && action.action === "closeResourceActivityIntent" && action.status === "rejected" && action.targetType === "ResourceLog" && action.targetId === "not-admitted" && action.targetStatus === "closed_before_admission" && action.requestDigest === requestHash && action.resultDigest === commandDigest(`ResourceLog\u001fclosed_before_admission\u001f${requestHash}`) && action.id && iso(action.completedAt) && idOf(action.actorUser) === current.actorId && idOf(action.requestedBy) === current.actorId && idOf(action.company) === current.companyId && idOf(action.project) === current.projectId && action.actorType === (current.principalId === "human" ? "human" : "agent") && (current.principalId === "human" || action.correlationId === current.principalId.slice(4)) && typeof action.reason === "string" && action.reason.trim().length >= 3 && action.reason.length <= 500) {
    const final = await currentResourceIntentScope(context, current.projectId, true);
    if (!sameResourceIntentOwner(intent.scope, final)) throw new Error("Original closure authority changed");
    return { outcome: "closed", message: "Original admission explicitly closed under its native key lock; not a rollback assertion or reversal of an accepted fact. A fresh owned resolution permits NEW review.", intentJson: encodeResourceIntent(intent), itemId: null, actionId: String(action.id), requestDigest: requestHash, resultDigest: String(action.resultDigest), completedAt: iso(action.completedAt), factJson: JSON.stringify({ resolution: "closed_before_admission", version: 2, purpose: current.purpose, actorId: current.actorId, principalId: current.principalId, companyId: current.companyId, projectId: current.projectId, resourceId: intent.input.relatedId?.trim(), reason: action.reason }) };
  }
  if (key.operation !== "recordResourceActivity" || key.resourceType !== "ResourceLog" || idOf(key.company) !== current.companyId || idOf(key.project) !== current.projectId || key.status !== "completed" || !key.resourceId || !action.id || action.status !== "succeeded" || action.action !== "recordResourceActivity" || action.targetType !== "ResourceLog" || action.targetId !== key.resourceId || action.requestDigest !== requestHash || action.resultDigest !== commandDigest(`ResourceLog\u001f${key.resourceId}`) || idOf(action.actorUser) !== current.actorId || idOf(action.requestedBy) !== current.actorId || idOf(action.company) !== current.companyId || idOf(action.project) !== current.projectId || action.actorType !== (current.principalId === "human" ? "human" : "agent") || (current.principalId !== "human" && action.correlationId !== current.principalId.slice(4)) || !iso(action.completedAt)) {
    return unresolvedResourceReceipt("unknown", "Original outcome/evidence is incomplete or not currently observable. Expiry is not rejection/rollback; retain the SAME intent for reconciliation.");
  }
  const beforeProjection = await currentResourceIntentScope(context, current.projectId, true);
  if (!sameResourceIntentOwner(intent.scope, beforeProjection)) throw new Error("Original recovery authority changed");
  const [fact] = await context.query.ResourceLog.findMany({ where: { id: { equals: String(key.resourceId) }, company: { id: { equals: current.companyId } }, project: { id: { equals: current.projectId } } }, take: 1,
    query: "id resourceType eventType quantity unit occurredAt currencyCode totalCostMinor notes equipment { id } material { id } operator { id }" });
  let matches = false;
  try {
    matches = Boolean(fact) && fact.resourceType === intent.input.type && fact.eventType === intent.input.reference && quantityToUnits(String(fact.quantity)) === quantityToUnits(String(intent.input.quantity)) && fact.unit === intent.input.unit?.trim() && iso(fact.occurredAt) === iso(intent.input.occurredAt) && fact.currencyCode === intent.scope.currencyCode && BigInt(String(fact.totalCostMinor)) === BigInt(intent.input.amountMinor || "0") && String(fact.notes ?? "") === (intent.input.description?.trim() ?? "") && idOf(fact[intent.input.type === "equipment" ? "equipment" : "material"]) === intent.input.relatedId?.trim() && idOf(fact.operator) === current.actorId;
  } catch { matches = false; }
  if (!fact || !matches) return unresolvedResourceReceipt("unknown", "Accepted original evidence is not fully observable/matching. Retain the SAME original for authorized review; no replacement key.");
  const final = await currentResourceIntentScope(context, current.projectId, true);
  if (!sameResourceIntentOwner(intent.scope, final)) throw new Error("Original recovery authority changed");
  return { outcome: "accepted", message: "Complete accepted original receipt retrieved. This observation is not stock, cost or invoice posting.", intentJson: encodeResourceIntent(intent), itemId: String(fact.id), actionId: String(action.id), requestDigest: requestHash, resultDigest: String(action.resultDigest), completedAt: iso(action.completedAt),
    factJson: JSON.stringify({ id: String(fact.id), version: 2, purpose: current.purpose, actorId: current.actorId, principalId: current.principalId, companyId: current.companyId, projectId: current.projectId, resourceId: intent.input.relatedId?.trim(), resourceType: String(fact.resourceType), eventType: String(fact.eventType), quantity: String(fact.quantity), unit: String(fact.unit), occurredAt: iso(fact.occurredAt), currencyCode: String(fact.currencyCode), totalCostMinor: String(fact.totalCostMinor), notes: String(fact.notes ?? "") }) };
}

export async function reconcileResourceActivityIntent(_root: unknown, args: { intentJson: string }, context: ResourceContext) {
  const receipt = await constructionResourceActivityReceipt(null, args, context);
  if (receipt.outcome !== "accepted") return receipt;
  const intent = decodeResourceIntent(args.intentJson);
  const actionKey = commandDigest(`resource-original-reconciled\u001f${receipt.actionId}\u001f${receipt.requestDigest}`);
  // Append evidence; never repair/delete historical COMMAND_ROLLED_BACK rows,
  // rewrite the original action/key, or enqueue another ResourceLog.created.
  const prior = await context.sudo().query.AgentAction.findOne!({ where: { actionKey }, query: "id" });
  const beforeAppend = await currentResourceIntentScope(context, intent.scope.projectId, true);
  if (!sameResourceIntentOwner(intent.scope, beforeAppend)) throw new Error("Original reconciliation authority changed");
  if (!prior) {
    try {
      await requireCreate(context.sudo(), "AgentAction")({ data: { actionKey, actorType: intent.scope.principalId === "human" ? "human" : "agent", action: "reconcileResourceActivityIntent", status: "succeeded", targetType: "ResourceLog", targetId: receipt.itemId, targetStatus: "accepted_original", reason: "Retrieved complete accepted original; prior ambiguous/failed acknowledgement evidence retained, not rollback", requestDigest: receipt.requestDigest, resultDigest: receipt.resultDigest, correlationId: intent.scope.principalId === "human" ? undefined : intent.scope.principalId.slice(4), causationId: receipt.actionId, requestedAt: new Date(), completedAt: new Date(), company: { connect: { id: intent.scope.companyId } }, project: { connect: { id: intent.scope.projectId } }, actorUser: { connect: { id: intent.scope.actorId } }, requestedBy: { connect: { id: intent.scope.actorId } } } });
    } catch {
      const raced = await context.sudo().query.AgentAction.findOne!({ where: { actionKey }, query: "id" });
      if (!raced) return unresolvedResourceReceipt("unknown", "Accepted original reconciliation acknowledgement is unavailable; retain the SAME intent.");
    }
  }
  // Re-authorize before returning private DTO, including after append failure/race.
  return constructionResourceActivityReceipt(null, args, context);
}

export async function closeResourceActivityIntent(_root: unknown, { intentJson, reason }: { intentJson: string; reason: string }, context: ResourceContext) {
  const intent = decodeResourceIntent(intentJson);
  const closureReason = requiredText(reason, "Original admission closure reason", 500);
  if (closureReason.length < 3) throw new Error("Original admission closure reason must contain at least three characters");
  const initial = await currentResourceIntentScope(context, intent.scope.projectId, true);
  if (!sameResourceIntentOwner(intent.scope, initial)) throw new Error("Original closure is not authorized for this actor/purpose/company/project");
  const fingerprint = commandDigest(`${initial.companyId}\u001frecordResourceActivity\u001f${intent.input.idempotencyKey.trim()}`);
  const requestHash = commandDigest(canonicalJson({ operation: "recordResourceActivity", ...intent.input, actorId: initial.actorId, principalId: initial.principalId }));
  if (!context.transaction) throw new Error("Native original-admission transaction is unavailable");
  try {
    await context.transaction(async tx => {
      if (!tx.prisma?.$queryRawUnsafe) throw new Error("Native original-admission key lock is unavailable");
      // SAME namespace/lock as executeProjectCommand, not a lease-expiry guess.
      await tx.prisma.$queryRawUnsafe(`SELECT 1::int AS locked FROM pg_advisory_xact_lock(hashtextextended($1, 0))`, fingerprint);
      const current = await currentResourceIntentScope(tx, initial.projectId, true);
      if (!sameResourceIntentOwner(intent.scope, current)) throw new Error("Original closure authority changed");
      const existing = await tx.sudo().query.IdempotencyKey.findOne!({ where: { fingerprint }, query: "id" });
      // NEVER change a completed, started, expired, failed or legacy key. The
      // owned reader decides accepted/closed/conflict/unknown after this branch.
      if (existing) return;
      const sudo = tx.sudo();
      const key = await requireCreate(sudo, "IdempotencyKey")({ data: { fingerprint, key: intent.input.idempotencyKey.trim(), operation: "recordResourceActivity", requestHash, status: "failed", resourceType: "ResourceLog", resourceId: "", errorCode: "ORIGINAL_ADMISSION_CLOSED", toStatus: "closed_before_admission", company: { connect: { id: initial.companyId } }, project: { connect: { id: initial.projectId } } } });
      const action = await requireCreate(sudo, "AgentAction")({ data: { actionKey: commandDigest(`original-admission-closed\u001f${fingerprint}\u001f${requestHash}`), actorType: initial.principalId === "human" ? "human" : "agent", action: "closeResourceActivityIntent", status: "rejected", targetType: "ResourceLog", targetId: "not-admitted", targetStatus: "closed_before_admission", reason: closureReason, requestDigest: requestHash, resultDigest: commandDigest(`ResourceLog\u001fclosed_before_admission\u001f${requestHash}`), correlationId: initial.principalId === "human" ? undefined : initial.principalId.slice(4), requestedAt: new Date(), completedAt: new Date(), company: { connect: { id: initial.companyId } }, project: { connect: { id: initial.projectId } }, actorUser: { connect: { id: initial.actorId } }, requestedBy: { connect: { id: initial.actorId } }, idempotencyKey: { connect: { id: key.id } } } });
      await requireUpdate(sudo, "IdempotencyKey")({ where: { id: key.id }, data: { agentAction: { connect: { id: action.id } } } });
    }, { timeout: 30_000 });
  } catch {
    // Lost commit ACK/lock/revocation is NOT closure proof. Read the SAME owned
    // key; if unavailable, no closed/accepted DTO is invented.
    try { return await constructionResourceActivityReceipt(null, { intentJson }, context); }
    catch { return unresolvedResourceReceipt("unknown", "Original closure acknowledgement is unavailable or denied; keep the SAME original."); }
  }
  return constructionResourceActivityReceipt(null, { intentJson }, context);
}
