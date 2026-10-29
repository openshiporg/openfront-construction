import type { KeystoneContext } from "@keystone-6/core/types";
import { createPayment } from "../utils/paymentProviderAdapter";
import { isPaymentProviderConfigured } from "../utils/paymentProviderConfig";

export async function createCustomerPayment(_root: unknown, { requestId, providerId }: { requestId: string; providerId: string }, context: KeystoneContext) {
  const actorId = context.session?.itemId;
  if (!actorId || context.session?.authType !== "session") throw new Error("Sign in to pay");
  const request = await context.sudo().query.ServiceRequest.findOne({ where: { id: requestId }, query: "id status currencyCode quoteMinor acceptedSnapshot customer { id } company { id }" });
  if (!request || request.customer?.id !== actorId || request.status !== "payment_pending") throw new Error("Request not payable");
  const companyId = request.company?.id; if (!companyId) throw new Error("Request company unavailable");
  const company = await context.sudo().query.Company.findOne({ where: { id: companyId }, query: "id projects { id }" });
  const projectId = company?.projects?.[0]?.id; if (!projectId) throw new Error("A construction project is required before online receipt processing");
  const provider = await context.sudo().query.PaymentProvider.findOne({ where: { id: providerId }, query: "id code isInstalled company { id } credentials createPaymentFunction capturePaymentFunction refundPaymentFunction getPaymentStatusFunction generatePaymentLinkFunction handleWebhookFunction" });
  if (!provider || !provider.isInstalled || provider.company?.id !== companyId || !isPaymentProviderConfigured(provider.code)) throw new Error("Payment provider unavailable");
  const snapshot: any = request.acceptedSnapshot || {};
  const amount = Number(snapshot.totalMinor || request.quoteMinor);
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("Payment amount is invalid");
  const key = `construction-request:${requestId}:${actorId}`;
  let payment = await context.sudo().prisma.payment.findUnique({ where: { idempotencyKey: key } });
  if (!payment) payment = await context.sudo().prisma.payment.create({ data: { paymentNumber: `RCPT-${requestId.slice(0, 10)}`, direction: "receipt", status: "pending", amountMinor: BigInt(amount), currencyCode: request.currencyCode, paymentMethod: "card", idempotencyKey: key, companyId, projectId, reference: "awaiting-provider" } });
  const session = await createPayment(provider, { order: { paymentId: payment.id, requestId, projectId, description: `Deposit for ${snapshot.serviceTitle || "accepted quote"}` }, amount, currency: request.currencyCode, idempotencyKey: key });
  await context.sudo().prisma.payment.update({ where: { id: payment.id }, data: { reference: session.url || session.reference, providerPaymentId: session.id } });
  return { url: session.url || session.reference, paymentId: payment.id };
}
