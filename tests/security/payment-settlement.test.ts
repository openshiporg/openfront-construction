import test from "node:test";
import assert from "node:assert/strict";
import {
  applySettlement, assertProviderResult, assertRequestOwner, claimIdFromPaymentKey, claimPaymentKey,
  processWebhookOnce, requestPaymentKey,
} from "../../features/keystone/domain/payment-settlement";

const payment = { id: "pay_1", amountMinor: BigInt(250000), currencyCode: "USD" };
const ok = { status: "succeeded", amount: 250000, currency: "usd", metadata: { paymentId: "pay_1" } };

test("only the request's own customer can pay an accepted quote", () => {
  assert.doesNotThrow(() => assertRequestOwner({ customerId: "u1", status: "payment_pending" }, "u1"));
  assert.throws(() => assertRequestOwner({ customerId: "u1", status: "payment_pending" }, "u2"), /not payable/);
  assert.throws(() => assertRequestOwner({ customerId: "u1", status: "quoted" }, "u1"), /not payable/);
  assert.throws(() => assertRequestOwner(null, "u1"), /not payable/);
  assert.throws(() => assertRequestOwner({ customerId: "u1", status: "payment_pending" }, undefined), /Sign in/);
});

test("provider amount, currency and payment correlation must match exactly", () => {
  assert.doesNotThrow(() => assertProviderResult(payment, ok));
  assert.throws(() => assertProviderResult(payment, { ...ok, amount: 249999 }), /amount/);
  assert.throws(() => assertProviderResult(payment, { ...ok, amount: 250000.5 }), /amount/);
  assert.throws(() => assertProviderResult(payment, { ...ok, currency: "eur" }), /currency/);
  assert.throws(() => assertProviderResult(payment, { ...ok, metadata: { paymentId: "pay_2" } }), /does not belong/);
});

test("claim payment keys round-trip and never match request keys", () => {
  const key = `${claimPaymentKey("clm_1", BigInt(5000))}:0`;
  assert.equal(claimIdFromPaymentKey(key.replace(/:0$/, "")), "clm_1");
  assert.equal(claimIdFromPaymentKey(requestPaymentKey("req_1", "u1")), null);
  assert.equal(claimIdFromPaymentKey(null), null);
});

function fakeLedger() {
  const state = { status: "pending", allocations: 0, events: new Map<string, string>() };
  const ports = (claim: boolean) => ({
    markSettled: async () => { if (state.status === "settled") return false; state.status = "settled"; return true; },
    allocateOnce: async () => { if (state.allocations > 0) return false; state.allocations++; return true; },
    claim,
  });
  return { state, ports };
}

test("repeated settlement allocates to the claim exactly once", async () => {
  const { state, ports } = fakeLedger();
  const first = await applySettlement(ports(true), "clm_1");
  const second = await applySettlement(ports(true), "clm_1");
  assert.deepEqual(first, { settledNow: true, allocated: true });
  assert.deepEqual(second, { settledNow: false, allocated: false });
  assert.equal(state.allocations, 1);
});

test("a deposit (no claim) settles without allocating", async () => {
  const { state, ports } = fakeLedger();
  assert.deepEqual(await applySettlement(ports(false), null), { settledNow: true, allocated: false });
  assert.equal(state.allocations, 0);
});

test("a duplicate webhook event is handled once; a failed attempt can be retried", async () => {
  const { state, ports } = fakeLedger();
  const events = new Map<string, "started" | "completed" | "failed">();
  const deliver = (id: string, boom = false) => processWebhookOnce({
    claim: async () => { const s = events.get(id); if (s === "completed") return "done"; events.set(id, "started"); return s ? "retry" : "new"; },
    handle: async () => { if (boom) throw new Error("db down"); await applySettlement(ports(true), "clm_1"); },
    complete: async () => { events.set(id, "completed"); },
    fail: async () => { events.set(id, "failed"); },
  });
  await assert.rejects(() => deliver("evt_1", true), /db down/);
  assert.equal(await deliver("evt_1"), "processed");
  assert.equal(await deliver("evt_1"), "duplicate");
  assert.equal(await deliver("evt_1"), "duplicate");
  assert.equal(state.allocations, 1);
});
