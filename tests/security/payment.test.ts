import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { handleWebhookFunction } from "../../features/integrations/payment/stripe";

test("Stripe webhook rejects malformed signature", async () => {
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  await assert.rejects(() => handleWebhookFunction({ rawBody: "{}", headers: { "stripe-signature": "t=1,v1=wrong" } }));
});

test("Stripe webhook signature validates raw request bytes", async () => {
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  const rawBody = JSON.stringify({ id: "evt_test", type: "checkout.session.completed", data: { object: {} } });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", "whsec_test").update(`${timestamp}.${rawBody}`).digest("hex");
  const result = await handleWebhookFunction({ rawBody, headers: { "stripe-signature": `t=${timestamp},v1=${signature}` } });
  assert.equal(result.isValid, true);
  assert.equal(result.event.id, "evt_test");
});
