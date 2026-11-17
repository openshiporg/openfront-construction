import test from "node:test";
import assert from "node:assert/strict";
import { createCustomerPayment, settlePayment } from "../../features/keystone/mutations/payments";
import { claimPaymentKey, requestPaymentKey } from "../../features/keystone/domain/payment-settlement";

process.env.STRIPE_SECRET_KEY = "sk_test_unit";
const provider = { id: "pp_1", code: "pp_stripe_co1", isInstalled: true, company: { id: "co_1" }, credentials: {}, createPaymentFunction: "stripe", getPaymentStatusFunction: "stripe", refundPaymentFunction: "stripe", handleWebhookFunction: "stripe" };

/** Stripe API stub: records calls, answers checkout session reads and creates. */
function stubStripe(session: Record<string, unknown>) {
  const calls: string[] = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    calls.push(`${init?.method || "GET"} ${String(url).replace("https://api.stripe.com/v1/", "")}`);
    const body = init?.method === "POST" ? { id: "cs_new", url: "https://checkout.stripe.com/c/cs_new" } : session;
    return { ok: true, json: async () => body } as Response;
  }) as typeof fetch;
  return calls;
}

function depositContext(payment: any) {
  const prisma: any = {
    payment: {
      findUnique: async () => payment,
      update: async ({ data }: any) => Object.assign(payment, data),
      updateMany: async ({ where, data }: any) => { if (payment && payment.status === (where.status?.in ? where.status.in.find((s: string) => s === payment.status) : where.status)) { Object.assign(payment, data); return { count: 1 }; } return { count: 0 }; },
      create: async ({ data }: any) => Object.assign(payment ?? {}, { id: "pay_new", ...data }),
    },
  };
  const sudo: any = {
    prisma,
    query: {
      ServiceRequest: { findOne: async () => ({ id: "req_1", status: "payment_pending", currencyCode: "USD", quoteMinor: 50000, acceptedSnapshot: { totalMinor: "50000", serviceTitle: "Deck" }, customer: { id: "u_cust" }, company: { id: "co_1" } }) },
      Company: { findOne: async () => ({ id: "co_1", projects: [{ id: "proj_1" }] }) },
      PaymentProvider: { findMany: async () => [provider], findOne: async () => provider },
    },
  };
  return { sudo: () => sudo, session: { itemId: "u_cust", authType: "session" } } as any;
}

test("#2 a deposit checkout still open is reused, not replaced", async () => {
  const payment = { id: "pay_1", status: "pending", reference: "cs_old", idempotencyKey: requestPaymentKey("req_1", "u_cust") };
  const calls = stubStripe({ id: "cs_old", status: "open", payment_status: "unpaid", url: "https://checkout.stripe.com/c/cs_old", amount_total: 50000, currency: "usd" });
  const result = await createCustomerPayment(null, { requestId: "req_1" }, depositContext(payment));
  assert.equal(result.url, "https://checkout.stripe.com/c/cs_old");
  assert.equal(payment.reference, "cs_old");
  assert.ok(!calls.some(call => call.startsWith("POST")), "no second Stripe session");
});

test("#2 a bank payment that is still clearing cannot be paid again", async () => {
  const payment = { id: "pay_1", status: "pending", reference: "cs_old", idempotencyKey: requestPaymentKey("req_1", "u_cust") };
  const calls = stubStripe({ id: "cs_old", status: "complete", payment_status: "unpaid", amount_total: 50000, currency: "usd" });
  await assert.rejects(() => createCustomerPayment(null, { requestId: "req_1" }, depositContext(payment)), /processing/);
  assert.equal(payment.status, "pending");
  assert.ok(!calls.some(call => call.startsWith("POST")));
});

test("#5 a paid claim link that no longer fits the claim settles without failing every retry", async () => {
  const payment: any = { id: "pay_c", status: "pending", reference: "cs_c", paymentProviderId: "pp_1", companyId: "co_1", projectId: "proj_1", amountMinor: BigInt(40000), currencyCode: "USD", idempotencyKey: `${claimPaymentKey("clm_1", BigInt(40000))}:0` };
  stubStripe({ id: "cs_c", status: "complete", payment_status: "paid", amount_total: 40000, currency: "usd", payment_intent: { id: "pi_c" }, metadata: { paymentId: "pay_c" }, payment_method_types: ["card"] });
  const context = depositContext(payment);
  context.sudo().transaction = async () => { throw new Error("Allocation exceeds remaining claim payment due after effective settlements"); };
  assert.equal(await settlePayment(context, "pay_c"), "settled");
  assert.equal(payment.status, "settled");
  assert.equal(await settlePayment(context, "pay_c"), "settled", "a webhook retry no longer throws");
});
