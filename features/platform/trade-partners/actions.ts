'use server';

import { keystoneClient } from "@/features/dashboard/lib/keystoneClient";
import type { CommandState } from "@/features/platform/projects/action-state";
import { partnerTransitions, partnerTypes } from "./lib/states";

function value(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function contactFields(formData: FormData): { data: Record<string, string | null>; error?: string } {
  const data = {
    name: value(formData, "name"),
    legalName: value(formData, "legalName") || null,
    email: value(formData, "email") || null,
    phone: value(formData, "phone") || null,
    website: value(formData, "website") || null,
    addressLine1: value(formData, "addressLine1") || null,
    addressLine2: value(formData, "addressLine2") || null,
    city: value(formData, "city") || null,
    stateProvince: value(formData, "stateProvince") || null,
    postalCode: value(formData, "postalCode") || null,
    countryCode: (value(formData, "countryCode") || "US").toUpperCase(),
  };
  if (!data.name) return { data, error: "Name is required" };
  if (data.name.length > 240) return { data, error: "Name must be 240 characters or fewer" };
  if (data.email && !EMAIL.test(data.email)) return { data, error: "Email is not valid" };
  if (!/^[A-Z]{2}$/.test(data.countryCode ?? "")) return { data, error: "Country must be a two-letter code" };
  return { data };
}

function partnerType(formData: FormData): string | null {
  const type = value(formData, "partnerType");
  return partnerTypes.some(entry => entry.value === type) ? type : null;
}

export async function createTradePartnerAction(_previous: CommandState, formData: FormData): Promise<CommandState> {
  const companyId = value(formData, "companyId");
  const type = partnerType(formData);
  const { data, error } = contactFields(formData);
  if (!companyId) return { status: "error", message: "Company is required" };
  if (!type) return { status: "error", message: "Choose a partner type" };
  if (error) return { status: "error", message: error };
  const duplicate = await keystoneClient<{ tradePartnersCount: number }>(`
    query DuplicatePartner($companyId: ID!, $name: String!) {
      tradePartnersCount(where: { company: { id: { equals: $companyId } }, name: { equals: $name, mode: insensitive } })
    }
  `, { companyId, name: data.name });
  if (duplicate.success && duplicate.data.tradePartnersCount > 0) return { status: "error", message: `${data.name} is already in the directory` };
  const response = await keystoneClient<{ createTradePartner: { id: string } }>(`
    mutation CreateTradePartner($data: TradePartnerCreateInput!) { createTradePartner(data: $data) { id } }
  `, { data: { ...data, partnerType: type, status: "prospective", company: { connect: { id: companyId } } } });
  if (!response.success) return { status: "error", message: "Trade partner not saved" };
  return { status: "success", message: "Trade partner added", itemId: response.data.createTradePartner.id };
}

export async function updateTradePartnerAction(_previous: CommandState, formData: FormData): Promise<CommandState> {
  const id = value(formData, "id");
  const type = partnerType(formData);
  const { data, error } = contactFields(formData);
  if (!id) return { status: "error", message: "Trade partner is missing" };
  if (!type) return { status: "error", message: "Choose a partner type" };
  if (error) return { status: "error", message: error };
  const response = await keystoneClient(`
    mutation UpdateTradePartner($id: ID!, $data: TradePartnerUpdateInput!) { updateTradePartner(where: { id: $id }, data: $data) { id } }
  `, { id, data: { ...data, partnerType: type } });
  if (!response.success) return { status: "error", message: "Changes not saved" };
  return { status: "success", message: "Saved", itemId: id };
}

export async function transitionTradePartnerAction(_previous: CommandState, formData: FormData): Promise<CommandState> {
  const id = value(formData, "id");
  const from = value(formData, "from");
  const to = value(formData, "to");
  if (!id || !(partnerTransitions[from] ?? []).includes(to)) return { status: "error", message: "That status change is not allowed" };
  const current = await keystoneClient<{ tradePartner: { status: string } | null }>(`
    query PartnerStatus($id: ID!) { tradePartner(where: { id: $id }) { status } }
  `, { id });
  if (!current.success || !current.data.tradePartner) return { status: "error", message: "Trade partner is unavailable" };
  if (current.data.tradePartner.status !== from) return { status: "error", message: "Status changed elsewhere; reload and try again" };
  const response = await keystoneClient(`
    mutation TransitionTradePartner($id: ID!, $status: TradePartnerStatusType!) { updateTradePartner(where: { id: $id }, data: { status: $status }) { id } }
  `, { id, status: to });
  if (!response.success) return { status: "error", message: "Status not changed" };
  return { status: "success", message: "Status updated", itemId: id };
}
