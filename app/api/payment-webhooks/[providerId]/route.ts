import { NextRequest, NextResponse } from "next/server";
import { keystoneContext } from "@/features/keystone/context";
import { handlePaymentProviderWebhook } from "@/features/keystone/mutations/payments";

export const runtime = "nodejs";
export async function POST(request: NextRequest, { params }: { params: Promise<{ providerId: string }> }) {
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > 1_048_576) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  const { providerId } = await params;
  try {
    const outcome = await handlePaymentProviderWebhook(keystoneContext, providerId, rawBody, { "stripe-signature": request.headers.get("stripe-signature") || "" });
    return NextResponse.json({ received: true, outcome });
  } catch (error) {
    const status = (error as { status?: number })?.status;
    if (status) return NextResponse.json({ error: (error as Error).message }, { status });
    return NextResponse.json({ error: "Webhook could not be reconciled" }, { status: 500 });
  }
}
