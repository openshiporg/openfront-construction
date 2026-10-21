import { list } from "@keystone-6/core";
import { denyAll } from "@keystone-6/core/access";
import { bigInt, integer, json, relationship, select, text, timestamp } from "@keystone-6/core/fields";
import { isHumanSession } from "../access";
import { readOnlyRelationshipMany } from "./fields";
import { trackingFields } from "./trackingFields";

/** C13/C14: customer identity is a session relation, never an email claim. */
export const ServiceRequest = list({
  access: {
    operation: { query: isHumanSession, create: denyAll, update: denyAll, delete: denyAll },
    filter: {
      query: args => {
        if (!args.session?.itemId || args.session.authType === "api_key") return false;
        return { OR: [
          { customer: { id: { equals: args.session.itemId } } },
          { company: { status: { equals: "active" }, memberships: { some: { user: { id: { equals: args.session.itemId } }, status: { equals: "active" }, role: { canManagePreconstruction: { equals: true } } } } } },
        ] };
      },
    },
  },
  ui: { listView: { initialColumns: ["reference", "serviceTitle", "status", "quoteMinor"] } },
  fields: {
    reference: text({ isIndexed: "unique" }),
    requestKey: text({ isIndexed: "unique", access: { read: denyAll } }),
    requestDigest: text({ access: { read: denyAll } }),
    serviceTitle: text({ validation: { isRequired: true } }),
    serviceSlug: text(),
    scope: text({ validation: { isRequired: true }, ui: { displayMode: "textarea" } }),
    status: select({ type: "enum", options: ["requested", "quoted", "payment_pending", "cancelled"], defaultValue: "requested", validation: { isRequired: true } }),
    version: integer({ defaultValue: 0, validation: { isRequired: true } }),
    currencyCode: text({ defaultValue: "USD" }),
    quoteMinor: bigInt({ defaultValue: BigInt(0), validation: { isRequired: true } }),
    quoteTerms: text({ ui: { displayMode: "textarea" } }),
    expiresAt: timestamp(),
    acceptedAt: timestamp(),
    acceptedSnapshot: json(),
    customer: relationship({ ref: "User.serviceRequests" }),
    company: relationship({ ref: "Company.serviceRequests" }),
    service: relationship({ ref: "PublicService.serviceRequests" }),
    events: readOnlyRelationshipMany("ServiceRequestEvent.request"),
    ...trackingFields,
  },
});

export const ServiceRequestEvent = list({
  access: {
    operation: { query: isHumanSession, create: denyAll, update: denyAll, delete: denyAll },
    filter: { query: args => {
      if (!args.session?.itemId || args.session.authType === "api_key") return false;
      return { request: { OR: [
        { customer: { id: { equals: args.session.itemId } } },
        { company: { status: { equals: "active" }, memberships: { some: { user: { id: { equals: args.session.itemId } }, status: { equals: "active" }, role: { canManagePreconstruction: { equals: true } } } } } },
      ] } };
    } },
  },
  fields: {
    eventKey: text({ isIndexed: "unique", access: { read: denyAll } }),
    commandDigest: text({ access: { read: denyAll } }),
    action: text(),
    fromStatus: text(),
    toStatus: text(),
    version: integer(),
    snapshot: json(),
    actor: relationship({ ref: "User.serviceRequestEvents" }),
    request: relationship({ ref: "ServiceRequest.events" }),
    ...trackingFields,
  },
});
