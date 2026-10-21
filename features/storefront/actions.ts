'use server';

import { keystoneClient } from "@/features/dashboard/lib/keystoneClient";
import type { PublicIntakeState } from "./types";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function submitPublicIntakeAction(
  _previous: PublicIntakeState,
  formData: FormData,
): Promise<PublicIntakeState> {
  const input = {
    kind: value(formData, "kind"),
    contactName: value(formData, "contactName"),
    organization: value(formData, "organization") || null,
    email: value(formData, "email"),
    phone: value(formData, "phone") || null,
    contactRole: value(formData, "contactRole") || null,
    projectName: value(formData, "projectName") || null,
    projectType: value(formData, "projectType") || null,
    locationSummary: value(formData, "locationSummary") || null,
    deliveryMethod: value(formData, "deliveryMethod") || null,
    budgetRange: value(formData, "budgetRange") || null,
    desiredStart: value(formData, "desiredStart") || null,
    desiredCompletion: value(formData, "desiredCompletion") || null,
    designStage: value(formData, "designStage") || null,
    servicesSought: value(formData, "servicesSought") || null,
    scopeSummary: value(formData, "scopeSummary"),
    referralSource: value(formData, "referralSource") || null,
    sourcePath: value(formData, "sourcePath"),
    privacyConsent: formData.get("privacyConsent") === "on",
    privacyNoticeDigest: value(formData, "privacyNoticeDigest") || null,
    idempotencyKey: value(formData, "idempotencyKey"),
    website: value(formData, "website") || null,
  };
  const response = await keystoneClient<{
    submitPublicIntake: { success: boolean; publicReference: string; kind: string; submittedAt: string; replayed: boolean };
  }>(`
    mutation SubmitPublicIntake($input: PublicIntakeInput!) {
      submitPublicIntake(input: $input) { success publicReference kind submittedAt replayed }
    }
  `, { input });

  if (!response.success) {
    if (/privacy notice changed/i.test(response.error ?? "")) {
      return { status: "error", message: "Our privacy notice was updated while you were filling in this form. Reload the page, review it, and send your request again." };
    }
    const isRateLimited = /configured limit/i.test(response.error ?? "");
    return {
      status: "error",
      message: isRateLimited
        ? "We are temporarily unable to accept more online inquiries. Please try again later or use the published contact information."
        : "We could not record this request. Check the required details and try again, or use the published contact information.",
    };
  }
  return {
    status: "success",
    message: response.data.submitPublicIntake.replayed
      ? "This request was already received."
      : "Your request was recorded for contractor review.",
    publicReference: response.data.submitPublicIntake.publicReference,
    replayed: response.data.submitPublicIntake.replayed,
  };
}
