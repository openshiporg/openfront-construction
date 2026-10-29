import { list } from "@keystone-6/core";
import { checkbox, json, relationship, text } from "@keystone-6/core/fields";
import { permissions } from "../access";
import { companyTenantField } from "./fields";
import { trackingFields } from "./trackingFields";
export const PaymentProvider = list({
  access: { operation: { query: ({ session }) => permissions.canReadBilling({ session }) || permissions.canManageBilling({ session }), create: permissions.canManageBilling, update: permissions.canManageBilling, delete: permissions.canManageBilling } },
  fields: {
    name: text({ validation: { isRequired: true } }),
    code: text({ isIndexed: "unique", validation: { isRequired: true, match: { regex: /^pp_[a-zA-Z0-9-_]+$/ } } }),
    isInstalled: checkbox({ defaultValue: true }), credentials: json({ defaultValue: {} }), metadata: json({ defaultValue: {} }),
    createPaymentFunction: text({ validation: { isRequired: true } }), capturePaymentFunction: text({ validation: { isRequired: true } }),
    refundPaymentFunction: text({ validation: { isRequired: true } }), getPaymentStatusFunction: text({ validation: { isRequired: true } }),
    generatePaymentLinkFunction: text({ validation: { isRequired: true } }), handleWebhookFunction: text({ validation: { isRequired: true } }),
    company: companyTenantField("Company.paymentProviders"), payments: relationship({ ref: "Payment.paymentProvider", many: true }), ...trackingFields,
  },
});
