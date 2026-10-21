import { decodeResourceIntent, encodeResourceIntent, isCompleteResourceResolution, sameResourceIntentOwner, type ResourceIntent, type ResourceIntentReceipt, type ResourceIntentScope } from "../../keystone/domain/resource-intent";
import { validateResourceFact } from "../../keystone/domain/resource-fact";
import { amountToMinorUnits } from "../projects/money";
import { resourceRecovery } from "./resource-recovery";

export type ResourceIntentStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type ResourceIntentMode = "retrieve" | "reconcile" | "retry" | "close";
type Journal = { intentJson: string; receipt: ResourceIntentReceipt | null };
export function resourceIntentStorageKey(scope: ResourceIntentScope) {
  return `construction:resource-original:v2:${[scope.actorId, scope.principalId, scope.companyId, scope.projectId, scope.purpose].map(encodeURIComponent).join(":")}`;
}
export function intentFromResourceForm(form: FormData, scope: ResourceIntentScope): ResourceIntent {
  const { fields } = resourceRecovery(form);
  if (fields.projectId !== scope.projectId) throw new Error("Original intent project changed");
  validateResourceFact(fields.type, fields.reference, fields.quantity, fields.unit);
  const amountMinor = amountToMinorUnits(fields.amount);
  if ((amountMinor?.length ?? 0) > 30 || (scope.currencyCode !== "USD" && amountMinor && BigInt(amountMinor) !== BigInt(0))) throw new Error("Unsupported recorded cost");
  const input = { projectId: scope.projectId, reference: fields.reference, title: "recordResourceActivity", description: fields.description || null, dueAt: null, occurredAt: fields.occurredAt, amountMinor, relatedId: fields.relatedId, secondaryId: null, partnerId: null, userId: null, roleId: null, type: fields.type, quantity: fields.quantity, unit: fields.unit, evidenceReference: null, evidenceChecksumSha256: null, idempotencyKey: fields.idempotencyKey,
    intentVersion: 2, intentActorId: scope.actorId, intentPrincipalId: scope.principalId, intentCompanyId: scope.companyId, intentCurrencyCode: scope.currencyCode };
  return decodeResourceIntent(encodeResourceIntent({ scope, input }));
}
export function readResourceIntentJournal(storage: ResourceIntentStorage, scope: ResourceIntentScope): Journal | null {
  const raw = storage.getItem(resourceIntentStorageKey(scope));
  if (!raw) return null;
  if (raw.length > 40_000) throw new Error("Original journal is oversized; retain it for authorized review");
  const value: Journal = JSON.parse(raw);
  if (!value || typeof value.intentJson !== "string" || Object.keys(value).some(key => !["intentJson", "receipt"].includes(key))) throw new Error("Invalid original journal; do not replace it");
  const intent = decodeResourceIntent(value.intentJson);
  if (!sameResourceIntentOwner(intent.scope, scope)) throw new Error("Private original belongs to another actor/purpose/company/project");
  return value;
}
function roundtrip(storage: ResourceIntentStorage, scope: ResourceIntentScope, value: Journal): Journal {
  const raw = JSON.stringify(value);
  storage.setItem(resourceIntentStorageKey(scope), raw);
  if (storage.getItem(resourceIntentStorageKey(scope)) !== raw) throw new Error("Original private storage did not roundtrip; no NEW request permitted");
  const restored = readResourceIntentJournal(storage, scope);
  if (!restored || restored.intentJson !== value.intentJson) throw new Error("Original private storage is unavailable");
  return restored;
}
export function persistResourceIntent(storage: ResourceIntentStorage, scope: ResourceIntentScope, intent: ResourceIntent): ResourceIntent {
  if (!sameResourceIntentOwner(intent.scope, scope)) throw new Error("Private original does not match this actor/purpose/company/project");
  const intentJson = encodeResourceIntent(decodeResourceIntent(encodeResourceIntent(intent)));
  const prior = readResourceIntentJournal(storage, scope);
  if (prior && prior.intentJson !== intentJson) throw new Error("An original intent is already pending. Retrieve/reconcile it; do not rekey or overwrite it");
  return decodeResourceIntent(roundtrip(storage, scope, prior ?? { intentJson, receipt: null }).intentJson);
}
// UI calls this under the browser's origin-wide Web Lock. Execution receives ONLY
// a fresh durable readback, never mutable form/filter/component state.
export async function executeStoredResourceIntent(storage: ResourceIntentStorage, scope: ResourceIntentScope, mode: ResourceIntentMode, execute: (mode: ResourceIntentMode, intentJson: string) => Promise<ResourceIntentReceipt>): Promise<ResourceIntentReceipt> {
  const prior = readResourceIntentJournal(storage, scope);
  if (!prior) throw new Error("No durable original is available; no request was sent");
  const restored = roundtrip(storage, scope, prior);
  const receipt = await execute(mode, restored.intentJson);
  const intent = decodeResourceIntent(restored.intentJson);
  if (["accepted", "closed"].includes(receipt.outcome) && !isCompleteResourceResolution(intent, receipt)) throw new Error("Original accepted DTO is incomplete or mismatched; retain the SAME intent");
  const latest = readResourceIntentJournal(storage, scope);
  if (!latest || latest.intentJson !== restored.intentJson) throw new Error("Original journal changed during acknowledgement; retain the SAME intent");
  roundtrip(storage, scope, { ...latest, receipt });
  return receipt;
}
export async function resolveStoredResourceIntent(storage: ResourceIntentStorage, scope: ResourceIntentScope, execute: (mode: ResourceIntentMode, intentJson: string) => Promise<ResourceIntentReceipt>) {
  // Stored/client equality is NOT authority. A NEW review needs a fresh owned
  // server receipt, even if local storage already contains an accepted DTO.
  const receipt = await executeStoredResourceIntent(storage, scope, "retrieve", execute);
  const journal = readResourceIntentJournal(storage, scope);
  if (!journal || !isCompleteResourceResolution(decodeResourceIntent(journal.intentJson), receipt)) throw new Error("Original remains unresolved. Not-found/expiry/unknown do not authorize NEW");
  storage.removeItem(resourceIntentStorageKey(scope));
  if (storage.getItem(resourceIntentStorageKey(scope)) !== null) throw new Error("Original journal could not be resolved; no NEW review permitted");
  return receipt;
}
