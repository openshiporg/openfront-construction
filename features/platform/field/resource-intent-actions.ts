'use server';

import { keystoneClient } from "../../dashboard/lib/keystoneClient";
import { decodeResourceIntent, encodeResourceIntent, unresolvedResourceReceipt, type ResourceIntentReceipt } from "../../keystone/domain/resource-intent";
import type { ResourceIntentMode } from "./resource-intent-journal";

async function retrieveOriginal(intentJson: string) {
  const response = await keystoneClient<{ constructionResourceActivityReceipt: ResourceIntentReceipt }>(`
    query ConstructionResourceActivityReceipt($intentJson: String!) {
      constructionResourceActivityReceipt(intentJson: $intentJson) {
        outcome message intentJson itemId actionId requestDigest resultDigest completedAt factJson
      }
    }
  `, { intentJson });
  if (!response.success) return unresolvedResourceReceipt("unknown", "The entry status is not available right now. Keep this entry and check again.");
  return response.data.constructionResourceActivityReceipt;
}
export async function operateResourceOriginal(mode: ResourceIntentMode, raw: string, reason = ""): Promise<ResourceIntentReceipt> {
  try {
    if (!["retrieve", "reconcile", "retry", "close"].includes(mode)) throw new Error("Unsupported original-intent operation");
    const intent = decodeResourceIntent(raw);
    const intentJson = encodeResourceIntent(intent);
    if (mode === "retrieve") return retrieveOriginal(intentJson);
    if (mode === "close") {
      const response = await keystoneClient<{ closeResourceActivityIntent: ResourceIntentReceipt }>(`
        mutation CloseResourceActivityIntent($intentJson: String!, $reason: String!) {
          closeResourceActivityIntent(intentJson: $intentJson, reason: $reason) {
            outcome message intentJson itemId actionId requestDigest resultDigest completedAt factJson
          }
        }
      `, { intentJson, reason });
      return response.success ? response.data.closeResourceActivityIntent : unresolvedResourceReceipt("unknown", "The entry could not be discarded. Keep it and try again.");
    }
    if (mode === "reconcile") {
      const response = await keystoneClient<{ reconcileResourceActivityIntent: ResourceIntentReceipt }>(`
        mutation ReconcileResourceActivityIntent($intentJson: String!) {
          reconcileResourceActivityIntent(intentJson: $intentJson) {
            outcome message intentJson itemId actionId requestDigest resultDigest completedAt factJson
          }
        }
      `, { intentJson });
      return response.success ? response.data.reconcileResourceActivityIntent : unresolvedResourceReceipt("unknown", "The entry status could not be refreshed. Keep it and try again.");
    }
    // This is SAME submission/retry, never reconstruction from current form.
    // Admission uses the native command; only owned readback resolves the intent.
    const response = await keystoneClient(`
      mutation RetryResourceActivityOriginal($input: ConstructionWorkflowInput!) {
        recordResourceActivity(input: $input) { success operation itemId actionId replayed }
      }
    `, { input: intent.input });
    if (!response.success) {
      const recovered = await retrieveOriginal(intentJson);
      return recovered.outcome === "accepted" || recovered.outcome === "closed" || recovered.outcome === "conflict" ? recovered : unresolvedResourceReceipt("unknown", "The entry was not confirmed as saved. Check its status, then retry the same entry.");
    }
    return retrieveOriginal(intentJson);
  } catch {
    return unresolvedResourceReceipt("unknown", "This entry cannot be processed from this account. Keep it and ask a project manager to review it.");
  }
}
