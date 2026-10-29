const secret = () => { const key = process.env.STRIPE_SECRET_KEY; if (!key) throw new Error("Stripe is not configured"); return key; };
async function stripeRequest(path: string, method = "GET", payload?: Record<string, string>, idempotencyKey?: string) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, { method, headers: { Authorization: `Bearer ${secret()}`, ...(payload ? { "Content-Type": "application/x-www-form-urlencoded" } : {}), ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) }, body: payload ? new URLSearchParams(payload).toString() : undefined, signal: AbortSignal.timeout(30_000) });
  const result = await response.json(); if (!response.ok) throw new Error("Stripe request failed"); return result;
}
export async function createPaymentFunction({ order, amount, currency, idempotencyKey }: { order: any; amount: number; currency: string; idempotencyKey: string }) {
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const requestPath = `/account/requests/${encodeURIComponent(order?.requestId || "")}/payment`;
  const session: any = await stripeRequest("checkout/sessions", "POST", {
    mode: "payment", "payment_method_types[0]": "card", "payment_method_types[1]": "us_bank_account",
    "line_items[0][price_data][currency]": currency.toLowerCase(), "line_items[0][price_data][unit_amount]": String(amount),
    "line_items[0][price_data][product_data][name]": order?.description || "Construction payment", "line_items[0][quantity]": "1",
    success_url: `${origin}${requestPath}?session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${origin}${requestPath}?cancelled=1`,
    "metadata[paymentId]": order?.paymentId || "", "metadata[projectId]": order?.projectId || "", "metadata[requestId]": order?.requestId || "", "metadata[progressClaimId]": order?.progressClaimId || "",
  }, idempotencyKey);
  if (!session.url) throw new Error("Stripe did not return a Checkout URL");
  return { id: session.id, reference: session.url, url: session.url, status: session.payment_status, amount, currency: currency.toUpperCase() };
}
export async function capturePaymentFunction({ paymentId }: { paymentId: string }) { return getPaymentStatusFunction({ paymentId }); }
export async function refundPaymentFunction({ paymentId, amount, idempotencyKey }: { paymentId: string; amount: number; idempotencyKey: string }) { return stripeRequest("refunds", "POST", { payment_intent: paymentId, amount: String(amount) }, idempotencyKey); }
export async function getPaymentStatusFunction({ paymentId }: { paymentId: string }) { const s: any = await stripeRequest(`checkout/sessions/${encodeURIComponent(paymentId)}?expand[]=payment_intent`); return { status: s.payment_status === "paid" ? "succeeded" : s.status, amount: s.amount_total, currency: s.currency?.toUpperCase(), paymentIntentId: s.payment_intent?.id, data: s }; }
export async function generatePaymentLinkFunction({ paymentId }: { paymentId: string }) { return `https://dashboard.stripe.com/checkout/sessions/${encodeURIComponent(paymentId)}`; }
export async function handleWebhookFunction({ headers, rawBody }: { headers: Record<string, string>; rawBody: string }) {
  const signingSecret = process.env.STRIPE_WEBHOOK_SECRET; const signature = headers["stripe-signature"];
  if (!signingSecret || !signature || !rawBody) throw new Error("Stripe webhook is not configured");
  const parts = Object.fromEntries(signature.split(",").map(part => part.split("=")));
  const crypto = await import("node:crypto"); const expected = crypto.createHmac("sha256", signingSecret).update(`${parts.t}.${rawBody}`).digest("hex");
  const valid = (parts.v1 || "").split(" ").some((candidate: string) => candidate.length === expected.length && crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(expected)));
  if (!valid) throw new Error("Stripe webhook signature verification failed");
  const event = JSON.parse(rawBody); return { isValid: true, event, type: event.type, resource: event.data.object };
}
