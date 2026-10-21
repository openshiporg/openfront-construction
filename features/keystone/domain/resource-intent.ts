import type { ConstructionWorkflowInput } from "../mutations/workflows";
import { quantityToUnits } from "./procurement-invariants";
import { validateResourceFact, validateResourceOccurrence } from "./resource-fact";

export type ResourceIntentScope = {
  version: 2; purpose: "recordResourceActivity";
  actorId: string; principalId: string; companyId: string; projectId: string; currencyCode: string;
};
export type ResourceIntent = { scope: ResourceIntentScope; input: ConstructionWorkflowInput };
export type ResourceIntentReceipt = {
  outcome: "accepted" | "closed" | "unknown" | "not_found" | "conflict" | "legacy_review_required";
  message: string;
  intentJson: string | null; itemId: string | null; actionId: string | null;
  requestDigest: string | null; resultDigest: string | null; completedAt: string | null;
  factJson: string | null;
};
const optionalFields = ["description", "dueAt", "occurredAt", "amountMinor", "relatedId", "secondaryId", "partnerId", "userId", "roleId", "type", "quantity", "unit", "evidenceReference", "evidenceChecksumSha256"] as const;
const requiredFields = ["projectId", "reference", "title", "idempotencyKey", "intentActorId", "intentPrincipalId", "intentCompanyId", "intentCurrencyCode"] as const;
const scopeFields = ["version", "purpose", "actorId", "principalId", "companyId", "projectId", "currencyCode"];
const inputFields = [...requiredFields, ...optionalFields, "intentVersion"];
const ordered = (value: Record<string, unknown>) => Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));

// Domain contract, not generated SDK types or a synthetic GraphQL schema.
export function encodeResourceIntent(intent: ResourceIntent): string {
  return JSON.stringify({ scope: ordered(intent.scope), input: ordered(intent.input) });
}
export function decodeResourceIntent(raw: string): ResourceIntent {
  if (typeof raw !== "string" || raw.length > 32_768 || new TextEncoder().encode(raw).length > 32_768) throw new Error("Invalid or oversized original intent");
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid original intent");
  const packet = parsed as { scope?: Record<string, unknown>; input?: Record<string, unknown> };
  if (!packet.scope || !packet.input || Object.keys(packet).length !== 2) throw new Error("Unbound legacy intent requires authorized review; do not retry/rekey it");
  const { scope, input } = packet;
  if (Object.keys(scope).length !== scopeFields.length || Object.keys(scope).some(key => !scopeFields.includes(key)) || scope.version !== 2 || scope.purpose !== "recordResourceActivity" || scopeFields.filter(key => key !== "version").some(key => typeof scope[key] !== "string" || !scope[key] || String(scope[key]).length > 200)) throw new Error("Invalid original intent scope");
  if (Object.keys(input).length !== inputFields.length || Object.keys(input).some(key => !(inputFields as readonly string[]).includes(key)) || requiredFields.some(key => typeof input[key] !== "string" || !input[key] || String(input[key]).length > 500) || optionalFields.some(key => input[key] !== null && typeof input[key] !== "string") || input.intentVersion !== 2) throw new Error("Invalid original intent body");
  if (input.projectId !== scope.projectId || input.intentActorId !== scope.actorId || input.intentPrincipalId !== scope.principalId || input.intentCompanyId !== scope.companyId || input.intentCurrencyCode !== scope.currencyCode || !input.relatedId || typeof input.relatedId !== "string" || !input.relatedId.trim() || input.relatedId.length > 200 || String(input.description ?? "").length > 4000) throw new Error("Original intent header/body mismatch");
  if (!String(input.idempotencyKey).trim() || String(input.idempotencyKey).length > 200 || input.title !== "recordResourceActivity" || (input.amountMinor !== null && !/^\d{1,30}$/.test(String(input.amountMinor)))) throw new Error("Invalid original key/purpose/cost");
  if (["dueAt", "partnerId", "userId", "roleId", "evidenceReference", "evidenceChecksumSha256"].some(key => input[key] !== null) || (input.secondaryId !== null && (typeof input.secondaryId !== "string" || !input.secondaryId || input.secondaryId.length > 200))) throw new Error("Original resource purpose contains unsupported fields");
  validateResourceFact(input.type, input.reference, input.quantity, input.unit);
  validateResourceOccurrence(input.occurredAt);
  return packet as ResourceIntent;
}
export function sameResourceIntentOwner(a: ResourceIntentScope, b: ResourceIntentScope): boolean {
  // Historical currency is immutable intent, not NEW/current admission.
  return a.version === b.version && a.purpose === b.purpose && a.actorId === b.actorId && a.principalId === b.principalId && a.companyId === b.companyId && a.projectId === b.projectId;
}
export function unresolvedResourceReceipt(outcome: Exclude<ResourceIntentReceipt["outcome"], "accepted" | "closed">, message: string): ResourceIntentReceipt {
  return { outcome, message, intentJson: null, itemId: null, actionId: null, requestDigest: null, resultDigest: null, completedAt: null, factJson: null };
}
export function isCompleteResourceResolution(intent: ResourceIntent, receipt: ResourceIntentReceipt): boolean {
  if (receipt.outcome === "accepted") return isCompleteResourceReceipt(intent, receipt);
  if (receipt.outcome !== "closed" || receipt.intentJson !== encodeResourceIntent(intent) || receipt.itemId !== null || !receipt.actionId || !receipt.factJson || !receipt.completedAt || !Number.isFinite(new Date(receipt.completedAt).getTime()) || !/^[a-f0-9]{64}$/.test(receipt.requestDigest ?? "") || !/^[a-f0-9]{64}$/.test(receipt.resultDigest ?? "")) return false;
  try {
    const closed: Record<string, unknown> = JSON.parse(receipt.factJson);
    return closed.resolution === "closed_before_admission" && closed.version === 2 && closed.purpose === intent.scope.purpose && closed.actorId === intent.scope.actorId && closed.principalId === intent.scope.principalId && closed.companyId === intent.scope.companyId && closed.projectId === intent.scope.projectId && closed.resourceId === intent.input.relatedId?.trim() && typeof closed.reason === "string" && closed.reason.trim().length >= 3 && closed.reason.length <= 500;
  } catch { return false; }
}

export function isCompleteResourceReceipt(intent: ResourceIntent, receipt: ResourceIntentReceipt): boolean {
  if (receipt.outcome !== "accepted" || receipt.intentJson !== encodeResourceIntent(intent) || !receipt.itemId || !receipt.actionId || !receipt.factJson || !receipt.completedAt || !Number.isFinite(new Date(receipt.completedAt).getTime()) || !/^[a-f0-9]{64}$/.test(receipt.requestDigest ?? "") || !/^[a-f0-9]{64}$/.test(receipt.resultDigest ?? "")) return false;
  try {
    const fact: Record<string, unknown> = JSON.parse(receipt.factJson);
    return fact.id === receipt.itemId && fact.companyId === intent.scope.companyId && fact.projectId === intent.scope.projectId && fact.resourceId === intent.input.relatedId?.trim() && fact.actorId === intent.scope.actorId && fact.principalId === intent.scope.principalId && fact.purpose === intent.scope.purpose && fact.version === 2 && fact.currencyCode === intent.scope.currencyCode && fact.resourceType === intent.input.type && fact.eventType === intent.input.reference && quantityToUnits(String(fact.quantity)) === quantityToUnits(String(intent.input.quantity)) && fact.unit === intent.input.unit?.trim() && new Date(String(fact.occurredAt)).toISOString() === new Date(String(intent.input.occurredAt)).toISOString() && BigInt(String(fact.totalCostMinor)) === BigInt(intent.input.amountMinor || "0") && fact.notes === (intent.input.description?.trim() ?? "");
  } catch { return false; }
}
