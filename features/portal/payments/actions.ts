'use server';

import { redirect } from "next/navigation";
import { keystoneClient } from "@/features/dashboard/lib/keystoneClient";
import type { CommandState } from "@/features/platform/projects/action-state";

const value = (data: FormData, name: string) => String(data.get(name) ?? "").trim();

export type PayableClaim = { id: string; claimNumber: string; status: string; currencyCode: string; retainageMinor: string; netMinor: string; remainingMinor: string; paymentId: string | null; paymentStatus: string | null };

export async function getPayableClaims(projectId: string): Promise<PayableClaim[]> {
  const response = await keystoneClient<{ constructionPayableClaims: PayableClaim[] }>(`query PayableClaims($projectId: ID!) { constructionPayableClaims(projectId: $projectId) { id claimNumber status currencyCode retainageMinor netMinor remainingMinor paymentId paymentStatus } }`, { projectId });
  return response.success ? response.data.constructionPayableClaims : [];
}

/** Owner pays an approved claim online (net of retainage). Redirects to Stripe Checkout. */
export async function payClaimAction(_previous: CommandState, data: FormData): Promise<CommandState> {
  const response = await keystoneClient<{ createClaimPayment: { url: string } }>(`mutation PayClaim($projectId: ID!, $claimId: ID!) { createClaimPayment(projectId: $projectId, claimId: $claimId) { url paymentId } }`, { projectId: value(data, "projectId"), claimId: value(data, "claimId") });
  if (!response.success) return { status: "error", message: "Payment could not be started. Reload and try again or contact the contractor." };
  redirect(response.data.createClaimPayment.url);
}

/** Staff generate a payment link for the owner to pay an approved claim. */
export async function sendClaimPaymentLinkAction(_previous: CommandState, data: FormData): Promise<CommandState> {
  const response = await keystoneClient<{ createClaimPaymentLink: { url: string } }>(`mutation SendClaimLink($projectId: ID!, $claimId: ID!) { createClaimPaymentLink(projectId: $projectId, claimId: $claimId) { url paymentId } }`, { projectId: value(data, "projectId"), claimId: value(data, "claimId") });
  if (!response.success) return { status: "error", message: "Payment link could not be created. The claim must be an approved owner claim and Stripe must be set up." };
  return { status: "success", message: `Payment link: ${response.data.createClaimPaymentLink.url}`, oneTimeSecret: response.data.createClaimPaymentLink.url, oneTimeSecretKind: "invitation-link" };
}

/** Reconcile against the provider (return from Checkout, or the "Check status" button). */
export async function checkPaymentStatusAction(_previous: CommandState, data: FormData): Promise<CommandState> {
  const response = await keystoneClient<{ checkPaymentStatus: { status: string } }>(`mutation CheckPayment($projectId: ID!, $paymentId: ID!) { checkPaymentStatus(projectId: $projectId, paymentId: $paymentId) { status } }`, { projectId: value(data, "projectId"), paymentId: value(data, "paymentId") });
  if (!response.success) return { status: "error", message: "Status could not be checked." };
  const status = response.data.checkPaymentStatus.status;
  return { status: "success", message: status === "settled" ? "Payment received and applied to the claim." : status === "failed" ? "Payment did not complete." : "Payment is still processing." };
}
