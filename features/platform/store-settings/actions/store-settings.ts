"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { platformClient } from "@/features/platform/lib/platform-client";
import { sanitizeStoreLogoSvg } from "@/features/lib/sanitize-store-logo";
import { normalizeStoreLogoColor } from "@/features/lib/store-logo";
import { PUBLIC_PROFILE_LIMITS, PUBLIC_PROJECT_LIMITS, PUBLIC_SERVICE_LIMITS, publicContentLengthError } from "@/features/lib/public-content-limits";
import type { CommandState } from "@/features/platform/projects/action-state";

export type StoreSettingsData = { id: string; name: string; brandName: string; brandMark: string; brandTagline: string; brandColor: string; logoIcon: string; logoColor: string };
export type PublicProfileSettings = { id: string; status: string; serviceArea: string; capabilitySummary: string; inquiryEmail: string; inquiryPhone: string; privacyNotice: string; acceptingInquiries: boolean };
export type PublicServiceSettings = { id: string; title: string; slug: string; summary: string; details: string; market: string; status: string };
export type PublicProjectSettings = { id: string; title: string; slug: string; summary: string; description: string; market: string; locationLabel: string; deliveryMethod: string; completionLabel: string; approvedOutcome: string; status: string };
export type PublicSettings = { companies: Array<{ id: string; name: string }>; company: StoreSettingsData | null; profile: PublicProfileSettings | null; services: PublicServiceSettings[]; projects: PublicProjectSettings[] };
const value = (data: FormData, key: string) => String(data.get(key) ?? "").trim();

export async function getPublicStoreSettings(companyId?: string) {
  const result = await platformClient<{ constructionStoreSettings: PublicSettings }>(`query StoreSettings($companyId: ID) { constructionStoreSettings(companyId: $companyId) }`, { companyId: companyId || null });
  if (!result.success) return { success: false as const, error: "Store Settings are unavailable for your role." };
  return { success: true as const, data: result.data.constructionStoreSettings };
}
export async function getStoreSettingsData() {
  const result = await getPublicStoreSettings();
  return result.success ? { success: true as const, data: result.data.company } : result;
}

async function save(input: Record<string, unknown>): Promise<CommandState> {
  const response = await platformClient(`mutation SaveStoreSettings($input: JSON!) { updateConstructionStoreSettings(input: $input) { success operation itemId actionId replayed } }`, { input: { ...input, idempotencyKey: randomUUID() } });
  if (!response.success) return { status: "error", message: "Settings could not be saved. Check the fields and current workspace permission." };
  revalidatePath("/", "layout");
  return { status: "success", message: "Saved" };
}

export async function updateStoreSettingsAction(_previous: CommandState, data: FormData): Promise<CommandState> {
  const submitted = value(data, "logoIcon");
  const logoIcon = sanitizeStoreLogoSvg(submitted);
  if (submitted && !logoIcon) return { status: "error", message: "Logo must be a valid, safe SVG document." };
  return save({ operation: "branding", companyId: value(data, "id"), brandName: value(data, "brandName"), brandMark: value(data, "brandMark").toUpperCase(), brandTagline: value(data, "brandTagline"), brandColor: value(data, "brandColor"), logoIcon, logoColor: normalizeStoreLogoColor(value(data, "logoColor")) });
}

export async function savePublicContentAction(_previous: CommandState, data: FormData): Promise<CommandState> {
  const operation = value(data, "operation");
  const input: Record<string, unknown> = { operation, companyId: value(data, "companyId") };
  let limits: Parameters<typeof publicContentLengthError>[0];
  if (operation === "profile") {
    for (const key of ["status", "serviceArea", "capabilitySummary", "inquiryEmail", "inquiryPhone", "privacyNotice"]) input[key] = value(data, key);
    input.acceptingInquiries = data.get("acceptingInquiries") === "on";
    limits = PUBLIC_PROFILE_LIMITS;
  } else if (operation === "service" || operation === "project") {
    if (value(data, "id")) input.id = value(data, "id");
    for (const key of ["title", "summary", "market", "status", ...(operation === "service" ? ["details"] : ["description", "locationLabel", "deliveryMethod", "completionLabel", "approvedOutcome"])]) input[key] = value(data, key);
    limits = operation === "service" ? PUBLIC_SERVICE_LIMITS : PUBLIC_PROJECT_LIMITS;
  } else return { status: "error", message: "Unsupported settings operation" };
  const lengthError = publicContentLengthError(limits, input);
  if (lengthError) return { status: "error", message: lengthError };
  return save(input);
}
