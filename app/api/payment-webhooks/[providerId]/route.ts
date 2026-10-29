import { NextRequest, NextResponse } from "next/server";
import { keystoneContext } from "@/features/keystone/context";
import { handleWebhook } from "@/features/keystone/utils/paymentProviderAdapter";

export const runtime = "nodejs";
export async function POST(request: NextRequest, { params }: { params: Promise<{ providerId: string }> }) {
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > 1_048_576) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  let event: any;
  try { event = JSON.parse(rawBody); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const { providerId } = await params;
  const context = keystoneContext.sudo();
  const provider = await context.query.PaymentProvider.findOne({ where: { id: providerId }, query: "id code isInstalled handleWebhookFunction credentials" });
  if (!provider?.isInstalled) return NextResponse.json({ error: "Provider unavailable" }, { status: 404 });
  try {
    const verified = await handleWebhook(provider, { event, rawBody, headers: { "stripe-signature": request.headers.get("stripe-signature") || "" } });
    if (!verified.isValid) return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    const resource: any = verified.resource;
    const id = String(resource?.metadata?.paymentId || "");
    const payment = id ? await context.prisma.payment.findUnique({ where: { id }, select: { id: true, amountMinor: true, currencyCode: true, providerPaymentId: true } }) : null;
    if (!payment || Number(resource.amount_total) !== Number(payment.amountMinor) || String(resource.currency).toUpperCase() !== String(payment.currencyCode).toUpperCase()) return NextResponse.json({ error: "Payment mismatch" }, { status: 400 });
    const paymentIntent = typeof resource.payment_intent === "string" ? resource.payment_intent : resource.payment_intent?.id;
    await context.prisma.payment.update({ where: { id: payment.id }, data: { status: "settled", settledAt: new Date(), providerPaymentId: paymentIntent || resource.id } });
    return NextResponse.json({ received: true });
  } catch { return NextResponse.json({ error: "Webhook could not be reconciled" }, { status: 400 }); }
}
