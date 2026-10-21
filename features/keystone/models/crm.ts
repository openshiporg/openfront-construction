import { createHash } from "node:crypto";

import { list } from "@keystone-6/core";
import { denyAll } from "@keystone-6/core/access";
import { integer, relationship, select, text, timestamp } from "@keystone-6/core/fields";

import { companyModelAccess } from "../access";
import { getConnectedId, queryById, type KeystoneContextLike } from "../domain/tenancy";
import { currencyCodeField, moneyField, ownedCompanyField } from "./fields";
import { trackingFields } from "./trackingFields";
import { validateCompanyOwner, type CompanyOwnerValidation } from "../domain/company-owners";

function validateLeadOwner(args: Omit<CompanyOwnerValidation, "listKey">) {
  return validateCompanyOwner({ ...args, listKey: "ConstructionLead" });
}

const crmAccess = () => companyModelAccess("canReadPreconstruction", "canManagePreconstruction", { delete: false });

function leadKey(companyId: string, email: string) {
  return createHash("sha256").update(`${companyId}\u001f${email.trim().toLowerCase()}`).digest("hex");
}

async function resolveLeadIdentity({ resolvedData, context, item }: {
  resolvedData: Record<string, unknown>;
  context: KeystoneContextLike;
  item?: { id: { toString(): string } } | null;
}) {
  let companyId = getConnectedId(resolvedData.company);
  let email = typeof resolvedData.email === "string" ? resolvedData.email.trim().toLowerCase() : "";
  if (item?.id && (!companyId || !email)) {
    const current = await queryById(context, "ConstructionLead", item.id.toString(), "company { id } email");
    companyId ||= current?.company?.id ?? null;
    email ||= String(current?.email ?? "").trim().toLowerCase();
  }
  return {
    ...resolvedData,
    ...(typeof resolvedData.email === "string" ? { email } : {}),
    ...(companyId && email ? { leadKey: leadKey(companyId, email) } : {}),
  };
}

async function validateOpportunityTenant({ resolvedData, context, item, addValidationError }: {
  resolvedData: Record<string, unknown>;
  context: KeystoneContextLike;
  item?: { id: { toString(): string } } | null;
  addValidationError(message: string): void;
}) {
  await validateCompanyOwner({ listKey: "ConstructionOpportunity", resolvedData, context, item, addValidationError });
  let companyId = getConnectedId(resolvedData.company);
  if (!companyId && item?.id) {
    companyId = (await queryById(context, "ConstructionOpportunity", item.id.toString(), "company { id }"))?.company?.id ?? null;
  }
  if (!companyId) return;
  for (const [field, listKey] of [["lead", "ConstructionLead"], ["client", "TradePartner"]] as const) {
    const id = getConnectedId(resolvedData[field]);
    if (!id) continue;
    const record = await queryById(context, listKey, id, "company { id }");
    if (record?.company?.id !== companyId) addValidationError(`${field} must belong to the opportunity company`);
  }
}

export const ConstructionLead = list({
  access: crmAccess(),
  hooks: {
    resolveInput: { create: resolveLeadIdentity, update: resolveLeadIdentity },
    validate: { create: validateLeadOwner, update: validateLeadOwner },
  },
  ui: { listView: { initialColumns: ["name", "organization", "status", "owner", "nextActionAt"] } },
  fields: {
    leadKey: text({ isIndexed: "unique", access: { create: denyAll, update: denyAll }, ui: { createView: { fieldMode: "hidden" }, itemView: { fieldMode: "read" } } }),
    name: text({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    organization: text({ validation: { length: { max: 240 } } }),
    email: text({ validation: { length: { max: 320 } } }),
    phone: text({ validation: { length: { max: 50 } } }),
    source: select({
      type: "enum",
      options: [
        { label: "Referral", value: "referral" },
        { label: "Invitation", value: "invitation" },
        { label: "Public opportunity", value: "public_opportunity" },
        { label: "Existing client", value: "existing_client" },
        { label: "Direct", value: "direct" },
        { label: "Other", value: "other" },
      ],
      defaultValue: "other",
      validation: { isRequired: true },
    }),
    status: select({
      type: "enum",
      options: [
        { label: "New", value: "new" },
        { label: "Qualified", value: "qualified" },
        { label: "Nurturing", value: "nurturing" },
        { label: "Converted", value: "converted" },
        { label: "Disqualified", value: "disqualified" },
      ],
      defaultValue: "new",
      validation: { isRequired: true },
    }),
    notes: text({ ui: { displayMode: "textarea" } }),
    nextActionAt: timestamp(),
    owner: relationship({ ref: "User" }),
    opportunities: relationship({ ref: "ConstructionOpportunity.lead", many: true, access: { create: denyAll, update: denyAll } }),
    company: ownedCompanyField("Company.constructionLeads"),
    ...trackingFields,
  },
});

export const ConstructionOpportunity = list({
  access: crmAccess(),
  hooks: { validate: { create: validateOpportunityTenant, update: validateOpportunityTenant } },
  ui: { listView: { initialColumns: ["number", "name", "stage", "estimatedValueMinor", "targetBidDate", "owner"] } },
  fields: {
    number: text({ validation: { isRequired: true, length: { min: 1, max: 80 } } }),
    name: text({ validation: { isRequired: true, length: { min: 1, max: 240 } } }),
    organization: text({ validation: { length: { max: 240 } } }),
    deliveryMethod: text({ validation: { length: { max: 120 } } }),
    locationSummary: text({ validation: { length: { max: 500 } } }),
    stage: select({
      type: "enum",
      options: [
        { label: "Qualifying", value: "qualifying" },
        { label: "Go / no-go", value: "go_no_go" },
        { label: "Estimating", value: "estimating" },
        { label: "Submitted", value: "submitted" },
        { label: "Negotiating", value: "negotiating" },
        { label: "Won", value: "won" },
        { label: "Lost", value: "lost" },
        { label: "Declined", value: "declined" },
      ],
      defaultValue: "qualifying",
      validation: { isRequired: true },
    }),
    estimatedValueMinor: moneyField(),
    currencyCode: currencyCodeField(),
    probabilityBps: integer({ defaultValue: 0, validation: { min: 0, max: 10_000 } }),
    targetBidDate: timestamp(),
    expectedAwardDate: timestamp(),
    nextActionAt: timestamp(),
    notes: text({ ui: { displayMode: "textarea" } }),
    owner: relationship({ ref: "User" }),
    lead: relationship({ ref: "ConstructionLead.opportunities" }),
    client: relationship({ ref: "TradePartner.opportunities" }),
    company: ownedCompanyField("Company.constructionOpportunities"),
    ...trackingFields,
  },
});
