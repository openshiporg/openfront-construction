import { list } from "@keystone-6/core";
import { denyAll } from "@keystone-6/core/access";
import { checkbox, integer, relationship, select, text, timestamp } from "@keystone-6/core/fields";

import { controlledCompanyModelAccess } from "../access";
import { companyTenantField, readOnlyRelationshipMany } from "./fields";
import { trackingFields } from "./trackingFields";

const controlledPublicContentAccess = () => controlledCompanyModelAccess("canReadCompanies", "canManageSettings");
const controlledIntakeAccess = () => controlledCompanyModelAccess("canReadPreconstruction", "canManagePreconstruction");
const immutable = { update: denyAll } as const;

const publicationStatus = () => select({
  type: "enum",
  options: [
    { label: "Draft", value: "draft" },
    { label: "Published", value: "published" },
    { label: "Archived", value: "archived" },
  ],
  defaultValue: "draft",
  validation: { isRequired: true },
  access: immutable,
});

export const PublicSiteProfile = list({
  access: controlledPublicContentAccess(),
  graphql: { omit: { create: true, update: true, delete: true } },
  ui: { hideCreate: true, hideDelete: true, listView: { initialColumns: ["company", "siteKey", "status", "acceptingInquiries"] } },
  fields: {
    siteKey: text({ isIndexed: "unique", validation: { isRequired: true, length: { min: 1, max: 80 } }, access: immutable }),
    status: publicationStatus(),
    serviceArea: text({ validation: { isRequired: true, length: { min: 2, max: 240 } }, access: immutable }),
    capabilitySummary: text({ validation: { isRequired: true, length: { min: 20, max: 1200 } }, ui: { displayMode: "textarea" }, access: immutable }),
    inquiryEmail: text({ validation: { isRequired: true, length: { min: 3, max: 320 } }, access: immutable }),
    inquiryPhone: text({ validation: { length: { max: 50 } }, access: immutable }),
    privacyNotice: text({ validation: { isRequired: true, length: { min: 20, max: 1200 } }, ui: { displayMode: "textarea" }, access: immutable }),
    acceptingInquiries: checkbox({ defaultValue: true, access: immutable }),
    company: companyTenantField("Company.publicSiteProfile"),
    services: readOnlyRelationshipMany("PublicService.site"),
    projects: readOnlyRelationshipMany("PublicProject.site"),
    submissions: readOnlyRelationshipMany("IntakeSubmission.site"),
    ...trackingFields,
  },
});

export const PublicService = list({
  access: controlledPublicContentAccess(),
  graphql: { omit: { create: true, update: true, delete: true } },
  ui: { hideCreate: true, hideDelete: true, listView: { initialColumns: ["title", "slug", "status", "sortOrder", "company"] } },
  fields: {
    serviceRequests: relationship({ ref: "ServiceRequest.service", many: true, access: { create: denyAll, update: denyAll } }),
    serviceKey: text({ isIndexed: "unique", validation: { isRequired: true }, access: immutable }),
    slug: text({ validation: { isRequired: true, length: { min: 1, max: 100 }, match: { regex: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ } }, access: immutable }),
    title: text({ validation: { isRequired: true, length: { min: 2, max: 160 } }, access: immutable }),
    summary: text({ validation: { isRequired: true, length: { min: 20, max: 500 } }, ui: { displayMode: "textarea" }, access: immutable }),
    details: text({ validation: { length: { max: 4000 } }, ui: { displayMode: "textarea" }, access: immutable }),
    market: text({ validation: { length: { max: 160 } }, access: immutable }),
    sortOrder: integer({ defaultValue: 0, validation: { min: 0, max: 10_000 }, access: immutable }),
    status: publicationStatus(),
    site: relationship({ ref: "PublicSiteProfile.services", access: { create: denyAll, update: denyAll } }),
    company: companyTenantField("Company.publicServices"),
    ...trackingFields,
  },
});

export const PublicProject = list({
  access: controlledPublicContentAccess(),
  graphql: { omit: { create: true, update: true, delete: true } },
  ui: { hideCreate: true, hideDelete: true, listView: { initialColumns: ["title", "slug", "market", "status", "company"] } },
  fields: {
    publicationKey: text({ isIndexed: "unique", validation: { isRequired: true }, access: immutable }),
    slug: text({ validation: { isRequired: true, length: { min: 1, max: 100 }, match: { regex: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ } }, access: immutable }),
    title: text({ validation: { isRequired: true, length: { min: 2, max: 200 } }, access: immutable }),
    summary: text({ validation: { isRequired: true, length: { min: 20, max: 600 } }, ui: { displayMode: "textarea" }, access: immutable }),
    description: text({ validation: { length: { max: 5000 } }, ui: { displayMode: "textarea" }, access: immutable }),
    market: text({ validation: { length: { max: 160 } }, access: immutable }),
    locationLabel: text({ validation: { length: { max: 200 } }, access: immutable }),
    deliveryMethod: text({ validation: { length: { max: 120 } }, access: immutable }),
    completionLabel: text({ validation: { length: { max: 80 } }, access: immutable }),
    approvedOutcome: text({ validation: { length: { max: 1000 } }, ui: { displayMode: "textarea" }, access: immutable }),
    sortOrder: integer({ defaultValue: 0, validation: { min: 0, max: 10_000 }, access: immutable }),
    status: publicationStatus(),
    sourceProject: relationship({ ref: "Project.publications", access: { create: denyAll, update: denyAll } }),
    site: relationship({ ref: "PublicSiteProfile.projects", access: { create: denyAll, update: denyAll } }),
    company: companyTenantField("Company.publicProjects"),
    ...trackingFields,
  },
});

export const IntakeSubmission = list({
  db: {
    // Preserve the existing rate-limit lookup index in generated schema/drift checks.
    extendPrismaSchema: schema => schema.replace(/\n\}$/, '\n  @@index([siteId, submittedAt], map: "IntakeSubmission_site_submittedAt_idx")\n}'),
  },
  access: controlledIntakeAccess(),
  graphql: { omit: { create: true, update: true, delete: true } },
  ui: { hideCreate: true, hideDelete: true, listView: { initialColumns: ["publicReference", "kind", "contactName", "organization", "status", "submittedAt"] } },
  fields: {
    submissionKey: text({ isIndexed: "unique", validation: { isRequired: true }, access: immutable }),
    deduplicationKey: text({ isIndexed: "unique", validation: { isRequired: true }, access: immutable }),
    publicReference: text({ isIndexed: "unique", validation: { isRequired: true, length: { min: 10, max: 80 } }, access: immutable }),
    kind: select({
      type: "enum",
      options: [
        { label: "General contact", value: "general_contact" },
        { label: "Project inquiry", value: "project_inquiry" },
        { label: "Estimate request", value: "estimate_request" },
        { label: "RFP invitation", value: "rfp_invitation" },
        { label: "Trade partner interest", value: "trade_partner_interest" },
      ],
      validation: { isRequired: true },
      access: immutable,
    }),
    status: select({
      type: "enum",
      options: [
        { label: "Received", value: "received" },
      ],
      defaultValue: "received",
      validation: { isRequired: true },
      access: immutable,
    }),
    contactName: text({ validation: { isRequired: true, length: { min: 2, max: 200 } }, access: immutable }),
    organization: text({ validation: { length: { max: 240 } }, access: immutable }),
    email: text({ validation: { isRequired: true, length: { min: 3, max: 320 } }, access: immutable }),
    phone: text({ validation: { length: { max: 50 } }, access: immutable }),
    contactRole: text({ validation: { length: { max: 160 } }, access: immutable }),
    projectName: text({ validation: { length: { max: 240 } }, access: immutable }),
    projectType: text({ validation: { length: { max: 160 } }, access: immutable }),
    locationSummary: text({ validation: { length: { max: 500 } }, access: immutable }),
    deliveryMethod: text({ validation: { length: { max: 120 } }, access: immutable }),
    budgetRange: text({ validation: { length: { max: 120 } }, access: immutable }),
    desiredStart: timestamp({ access: immutable }),
    desiredCompletion: timestamp({ access: immutable }),
    designStage: text({ validation: { length: { max: 160 } }, access: immutable }),
    servicesSought: text({ validation: { length: { max: 600 } }, access: immutable }),
    scopeSummary: text({ validation: { isRequired: true, length: { min: 10, max: 5000 } }, ui: { displayMode: "textarea" }, access: immutable }),
    referralSource: text({ validation: { length: { max: 240 } }, access: immutable }),
    sourcePath: text({ validation: { isRequired: true, length: { min: 1, max: 120 } }, access: immutable }),
    privacyVersion: text({ validation: { isRequired: true, length: { min: 1, max: 80 } }, access: immutable }),
    privacyNoticeSnapshot: text({ validation: { isRequired: true, length: { min: 1, max: 10_000 } }, access: immutable }),
    privacyNoticeDigest: text({ validation: { isRequired: true, length: { min: 64, max: 64 } }, access: immutable }),
    consentAt: timestamp({ validation: { isRequired: true }, access: immutable }),
    submittedAt: timestamp({ validation: { isRequired: true }, defaultValue: { kind: "now" }, access: immutable }),
    requestDigest: text({ validation: { isRequired: true, length: { min: 64, max: 64 } }, access: immutable }),
    site: relationship({ ref: "PublicSiteProfile.submissions", access: { create: denyAll, update: denyAll } }),
    company: companyTenantField("Company.intakeSubmissions"),
    lead: relationship({ ref: "ConstructionLead", access: { create: denyAll, update: denyAll } }),
    opportunity: relationship({ ref: "ConstructionOpportunity", access: { create: denyAll, update: denyAll } }),
    ...trackingFields,
  },
});
