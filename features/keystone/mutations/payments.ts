import { createHash } from "node:crypto";
import type { KeystoneContext } from "@keystone-6/core/types";
import { hasCompanyPermission, hasProjectPermission, type Session } from "../access";
import { createPayment, getPaymentStatus, handleWebhook } from "../utils/paymentProviderAdapter";
import { isPaymentProviderConfigured } from "../utils/paymentProviderConfig";
import {
  applySettlement, assertProviderResult, assertRequestOwner, claimIdFromPaymentKey, claimPaymentKey,
  processWebhookOnce, requestPaymentKey, type ProviderPaymentResult,
} from "../domain/payment-settlement";
import { allocateProviderSettlement } from "./workflows";

const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const PROVIDER_QUERY = "id code isInstalled company { id } credentials createPaymentFunction capturePaymentFunction refundPaymentFunction getPaymentStatusFunction generatePaymentLinkFunction handleWebhookFunction";
const WEBHOOK_SETTLE = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded"]);
const WEBHOOK_FAIL = new Set(["checkout.session.async_payment_failed", "checkout.session.expired"]);

function humanSession(context: KeystoneContext) {
  const session = context.session as Session | undefined;
  if (!session?.itemId || session.authType !== "session") throw new Error("Sign in to pay");
  return session;
}

/** The company's installed Stripe provider. Never chosen by the client. */
export async function companyStripeProvider(context: KeystoneContext, companyId: string) {
  const providers = await context.sudo().query.PaymentProvider.findMany({
    where: { company: { id: { equals: companyId } }, isInstalled: { equals: true }, code: { startsWith: "pp_stripe" } },
    orderBy: [{ createdAt: "asc" }], take: 1, query: PROVIDER_QUERY,
  });
  const provider = providers[0];
  if (!provider || provider.company?.id !== companyId || !isPaymentProviderConfigured(provider.code)) throw new Error("Online payment is not set up for this contractor");
  return provider;
}

async function startProviderCheckout(context: KeystoneContext, args: {
  payment: { id: string }; provider: any; amount: number; currency: string; key: string; projectId: string; description: string;
  requestId?: string; claimId?: string; returnPath?: string;
}) {
  const session = await createPayment(args.provider, {
    order: { paymentId: args.payment.id, requestId: args.requestId, projectId: args.projectId, progressClaimId: args.claimId, description: args.description, returnPath: args.returnPath },
    amount: args.amount, currency: args.currency, idempotencyKey: args.key,
  });
  await context.sudo().prisma.payment.update({ where: { id: args.payment.id }, data: { reference: session.id, providerPaymentId: session.id, paymentProviderId: args.provider.id } });
  return { url: String(session.url), paymentId: args.payment.id };
}

/** Customer pays the deposit on their own accepted quote. */
export async function createCustomerPayment(_root: unknown, { requestId }: { requestId: string }, context: KeystoneContext) {
  const session = humanSession(context); const actorId = session.itemId;
  const request = await context.sudo().query.ServiceRequest.findOne({ where: { id: requestId }, query: "id status currencyCode quoteMinor acceptedSnapshot customer { id } company { id }" });
  assertRequestOwner(request ? { customerId: request.customer?.id, status: request.status } : null, actorId);
  const companyId = request!.company?.id; if (!companyId) throw new Error("Request company unavailable");
  const company = await context.sudo().query.Company.findOne({ where: { id: companyId }, query: "id projects { id }" });
  const projectId = company?.projects?.[0]?.id; if (!projectId) throw new Error("A construction project is required before online receipt processing");
  const provider = await companyStripeProvider(context, companyId);
  const snapshot: any = request!.acceptedSnapshot || {};
  const amount = Number(snapshot.totalMinor || request!.quoteMinor);
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("Payment amount is invalid");
  const key = requestPaymentKey(requestId, actorId);
  const prisma = context.sudo().prisma;
  let payment = await prisma.payment.findUnique({ where: { idempotencyKey: key } });
  if (payment?.status === "settled") throw new Error("Deposit already received");
  if (!payment) payment = await prisma.payment.create({ data: { paymentNumber: `RCPT-${requestId.slice(-10)}`, direction: "receipt", status: "pending", amountMinor: BigInt(amount), currencyCode: request!.currencyCode, paymentMethod: "card", idempotencyKey: key, companyId, projectId, paymentProviderId: provider.id, reference: "awaiting-provider" } });
  return startProviderCheckout(context, { payment, provider, amount, currency: request!.currencyCode, key, projectId, requestId, description: `Deposit for ${snapshot.serviceTitle || "accepted quote"}` });
}

/** Return from Checkout: settle the customer's payment for this request, idempotently. */
export async function reconcileCustomerPayment(_root: unknown, { requestId, sessionId }: { requestId: string; sessionId: string }, context: KeystoneContext) {
  const session = humanSession(context);
  const request = await context.sudo().query.ServiceRequest.findOne({ where: { id: requestId }, query: "id status customer { id }" });
  if (!request || request.customer?.id !== session.itemId) throw new Error("Request not found");
  const payment = await context.sudo().prisma.payment.findUnique({ where: { idempotencyKey: requestPaymentKey(requestId, session.itemId) } });
  if (!payment) throw new Error("Payment not found");
  if (payment.status !== "settled" && payment.reference !== sessionId) throw new Error("Payment session does not match");
  return { status: await settlePayment(context, payment.id) };
}

/** Pull the provider's truth, assert it, settle, and allocate. Safe to repeat. */
export async function settlePayment(context: KeystoneContext, paymentId: string): Promise<string> {
  const prisma = context.sudo().prisma;
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { paymentProvider: true } });
  if (!payment || !payment.paymentProviderId || !payment.companyId) throw new Error("Payment not found");
  if (payment.status === "failed" || payment.status === "voided") return payment.status;
  const provider = await context.sudo().query.PaymentProvider.findOne({ where: { id: payment.paymentProviderId }, query: PROVIDER_QUERY });
  if (!provider || provider.company?.id !== payment.companyId) throw new Error("Payment provider unavailable");
  const raw: any = await getPaymentStatus(provider, payment.reference);
  const result: ProviderPaymentResult = { status: raw.status, amount: Number(raw.amount), currency: String(raw.currency || ""), paymentIntentId: raw.paymentIntentId, metadata: raw.data?.metadata ?? null };
  assertProviderResult({ id: payment.id, amountMinor: payment.amountMinor, currencyCode: payment.currencyCode }, result);
  if (result.status === "expired") {
    await prisma.payment.updateMany({ where: { id: payment.id, status: { in: ["pending", "authorized"] } }, data: { status: "failed" } });
    return "failed";
  }
  if (result.status !== "succeeded") return payment.status === "settled" ? "settled" : "pending";
  const claimId = claimIdFromPaymentKey(payment.idempotencyKey);
  await applySettlement({
    markSettled: async () => {
      const done = await prisma.payment.updateMany({ where: { id: payment.id, status: { in: ["pending", "authorized"] } }, data: { status: "settled", settledAt: new Date(), paidAt: new Date(), paymentMethod: raw.data?.payment_method_types?.includes("us_bank_account") && !raw.data?.payment_method_types?.includes("card") ? "ach" : "card", ...(result.paymentIntentId ? { providerPaymentId: result.paymentIntentId } : {}) } });
      return done.count === 1;
    },
    allocateOnce: () => allocateProviderSettlement(context.sudo() as any, { projectId: payment.projectId!, paymentId: payment.id, claimId: claimId!, amountMinor: payment.amountMinor.toString() }),
  }, claimId);
  return "settled";
}

async function loadClaim(context: KeystoneContext, projectId: string, claimId: string) {
  const claim = await context.sudo().prisma.progressClaim.findUnique({ where: { id: claimId } });
  if (!claim || claim.projectId !== projectId || !claim.companyId) throw new Error("Claim not found");
  if (claim.claimType !== "owner" || !["approved", "partially_paid"].includes(claim.status)) throw new Error("Claim is not payable online");
  const settled = await context.sudo().prisma.paymentAllocation.aggregate({ _sum: { amountMinor: true }, where: { progressClaimId: claimId, payment: { status: "settled" } } });
  const remaining: bigint = BigInt(claim.currentPaymentDueMinor ?? 0) - BigInt(settled._sum.amountMinor ?? 0);
  if (remaining <= BigInt(0)) throw new Error("Claim has nothing left to pay");
  return { claim, remaining };
}

async function startClaimPayment(context: KeystoneContext, actorId: string, projectId: string, claimId: string) {
  const { claim, remaining } = await loadClaim(context, projectId, claimId);
  const amount = Number(remaining);
  if (!Number.isSafeInteger(amount)) throw new Error("Payment amount is invalid");
  const provider = await companyStripeProvider(context, claim.companyId!);
  const prisma = context.sudo().prisma;
  const base = claimPaymentKey(claimId, remaining);
  let attempt = 0; let payment = await prisma.payment.findUnique({ where: { idempotencyKey: `${base}:${attempt}` } });
  while (payment && ["failed", "voided", "reversed"].includes(payment.status)) payment = await prisma.payment.findUnique({ where: { idempotencyKey: `${base}:${++attempt}` } });
  const key = `${base}:${attempt}`;
  if (!payment) payment = await prisma.payment.create({ data: { paymentNumber: `RCPT-${claimId.slice(-8)}-${attempt}`, direction: "receipt", status: "pending", amountMinor: remaining, currencyCode: claim.currencyCode, paymentMethod: "ach", idempotencyKey: key, companyId: claim.companyId, projectId, tradePartnerId: claim.tradePartnerId, paymentProviderId: provider.id, recordedById: actorId, reference: "awaiting-provider" } });
  return startProviderCheckout(context, { payment, provider, amount, currency: claim.currencyCode, key, projectId, claimId, description: `Progress claim ${claim.claimNumber}`, returnPath: `/portal/projects/${encodeURIComponent(projectId)}/billing?paymentId=${encodeURIComponent(payment.id)}` });
}

/** Project owner/client pays an approved owner claim from the portal. */
export async function createClaimPayment(_root: unknown, { projectId, claimId }: { projectId: string; claimId: string }, context: KeystoneContext) {
  const session = humanSession(context);
  const membership = await context.sudo().prisma.projectMembership.findFirst({ where: { userId: session.itemId, projectId, status: "active", portalType: "owner", accessLevel: { not: "viewer" } } });
  if (!membership) throw new Error("Only the project owner can pay this claim");
  return startClaimPayment(context, session.itemId, projectId, claimId);
}

/** Staff create a payable link for an approved owner claim. */
export async function createClaimPaymentLink(_root: unknown, { projectId, claimId }: { projectId: string; claimId: string }, context: KeystoneContext) {
  const session = humanSession(context);
  const claim = await context.sudo().prisma.progressClaim.findUnique({ where: { id: claimId }, select: { projectId: true, companyId: true } });
  if (!claim || claim.projectId !== projectId || !claim.companyId || !hasProjectPermission(session, claim.companyId, projectId, "canManageBilling", true)) throw new Error("Not authorized to send payment links for this project");
  return startClaimPayment(context, session.itemId, projectId, claimId);
}

/** "Check status": staff with billing authority or the project's owner portal user. */
export async function checkPaymentStatus(_root: unknown, { projectId, paymentId }: { projectId: string; paymentId: string }, context: KeystoneContext) {
  const session = humanSession(context);
  const payment = await context.sudo().prisma.payment.findUnique({ where: { id: paymentId }, select: { projectId: true, companyId: true } });
  if (!payment || payment.projectId !== projectId || !payment.companyId) throw new Error("Payment not found");
  const staff = hasProjectPermission(session, payment.companyId, projectId, "canManageBilling", false);
  const owner = staff ? null : await context.sudo().prisma.projectMembership.findFirst({ where: { userId: session.itemId, projectId, status: "active", portalType: "owner" } });
  if (!staff && !owner) throw new Error("Payment not found");
  return { status: await settlePayment(context, paymentId) };
}

/** Provider webhook: verified, deduped durably on (provider, event id), correlated by metadata.paymentId. */
export async function handlePaymentProviderWebhook(context: KeystoneContext, providerId: string, rawBody: string, headers: Record<string, string>): Promise<"processed" | "duplicate" | "ignored"> {
  const sudo = context.sudo();
  const provider = await sudo.query.PaymentProvider.findOne({ where: { id: providerId }, query: PROVIDER_QUERY });
  if (!provider?.isInstalled || !provider.company?.id) throw Object.assign(new Error("Provider unavailable"), { status: 404 });
  const verified: any = await handleWebhook(provider, { event: undefined, rawBody, headers });
  if (!verified?.isValid) throw Object.assign(new Error("Invalid signature"), { status: 400 });
  const eventId = String(verified.event?.id || ""); const type = String(verified.type || "");
  if (!eventId) throw Object.assign(new Error("Event id missing"), { status: 400 });
  const settle = WEBHOOK_SETTLE.has(type); const fail = WEBHOOK_FAIL.has(type);
  if (!settle && !fail) return "ignored";
  const resource = verified.resource || {};
  const paymentId = String(resource.metadata?.paymentId || "");
  const payment = paymentId ? await sudo.prisma.payment.findUnique({ where: { id: paymentId }, select: { id: true, companyId: true, paymentProviderId: true, reference: true } }) : null;
  if (!payment || payment.companyId !== provider.company.id || payment.paymentProviderId !== provider.id || (resource.id && payment.reference !== resource.id && payment.reference !== "awaiting-provider")) throw Object.assign(new Error("Payment not found"), { status: 400 });
  const fingerprint = digest(`payment-webhook\u001f${provider.id}\u001f${eventId}`);
  const idem = sudo.prisma.idempotencyKey;
  const outcome = await processWebhookOnce({
    claim: async () => {
      try {
        await idem.create({ data: { fingerprint, key: eventId, operation: "paymentWebhook", requestHash: digest(rawBody), status: "started", resourceType: "Payment", resourceId: payment.id, expiresAt: new Date(Date.now() + 30 * 86400000), companyId: provider.company.id } });
        return "new";
      } catch (error: any) {
        if (error?.code !== "P2002") throw error;
        const existing = await idem.findUnique({ where: { fingerprint } });
        if (existing?.status === "completed") return "done";
        const reclaimed = await idem.updateMany({ where: { fingerprint, OR: [{ status: "failed" }, { status: "started", updatedAt: { lt: new Date(Date.now() - 5 * 60000) } }] }, data: { status: "started", updatedAt: new Date() } });
        if (reclaimed.count === 1) return "retry";
        throw Object.assign(new Error("Event is being processed"), { status: 409 });
      }
    },
    handle: async () => {
      if (settle) await settlePayment(context, payment.id);
      else await sudo.prisma.payment.updateMany({ where: { id: payment.id, status: { in: ["pending", "authorized"] } }, data: { status: "failed" } });
    },
    complete: async () => { await idem.update({ where: { fingerprint }, data: { status: "completed" } }); },
    fail: async () => { await idem.update({ where: { fingerprint }, data: { status: "failed" } }).catch(() => undefined); },
  });
  return outcome;
}

export type PayableClaim = { id: string; claimNumber: string; status: string; currencyCode: string; retainageMinor: string; netMinor: string; remainingMinor: string; paymentId: string | null; paymentStatus: string | null };

/** Owner claims the caller may pay (owner portal member), or all payable claims for billing staff. */
export async function constructionPayableClaims(_root: unknown, { projectId }: { projectId: string }, context: KeystoneContext): Promise<PayableClaim[]> {
  const session = humanSession(context);
  const prisma = context.sudo().prisma;
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { companyId: true } });
  if (!project?.companyId) return [];
  const staff = hasProjectPermission(session, project.companyId, projectId, "canManageBilling", false);
  const owner = staff ? null : await prisma.projectMembership.findFirst({ where: { userId: session.itemId, projectId, status: "active", portalType: "owner" } });
  if (!staff && !owner) return [];
  const claims = await prisma.progressClaim.findMany({ where: { projectId, claimType: "owner", status: { in: ["approved", "partially_paid"] } }, orderBy: { createdAt: "asc" }, take: 50 });
  const out: PayableClaim[] = [];
  for (const claim of claims) {
    const settled = await prisma.paymentAllocation.aggregate({ _sum: { amountMinor: true }, where: { progressClaimId: claim.id, payment: { status: "settled" } } });
    const remaining = BigInt(claim.currentPaymentDueMinor ?? 0) - BigInt(settled._sum.amountMinor ?? 0);
    if (remaining <= BigInt(0)) continue;
    const pending = await prisma.payment.findFirst({ where: { idempotencyKey: { startsWith: `construction-claim:${claim.id}:` }, status: "pending" }, orderBy: { createdAt: "desc" }, select: { id: true, status: true } });
    out.push({ id: claim.id, claimNumber: claim.claimNumber, status: claim.status, currencyCode: claim.currencyCode, retainageMinor: String(claim.retainageMinor ?? 0), netMinor: String(claim.currentPaymentDueMinor ?? 0), remainingMinor: remaining.toString(), paymentId: pending?.id ?? null, paymentStatus: pending?.status ?? null });
  }
  return out;
}

const STRIPE_FUNCTIONS = { createPaymentFunction: "stripe", capturePaymentFunction: "stripe", refundPaymentFunction: "stripe", getPaymentStatusFunction: "stripe", generatePaymentLinkFunction: "stripe", handleWebhookFunction: "stripe" };

function companyBillingAdmin(context: KeystoneContext, companyId: string) {
  const session = humanSession(context);
  if (!hasCompanyPermission(session, companyId, "canManageBilling")) throw new Error("Not authorized to manage payment providers");
  return session;
}

/** Install the company's Stripe provider record (credentials stay in server env). */
export async function installStripePaymentProvider(_root: unknown, { companyId }: { companyId: string }, context: KeystoneContext) {
  companyBillingAdmin(context, companyId);
  const sudo = context.sudo();
  const existing = await sudo.prisma.paymentProvider.findFirst({ where: { companyId, code: { startsWith: "pp_stripe" } } });
  if (existing) return { id: existing.id, isInstalled: existing.isInstalled, configured: isPaymentProviderConfigured(existing.code) };
  const code = `pp_stripe_${companyId.slice(-12).replace(/[^a-zA-Z0-9]/g, "")}`;
  const created = await sudo.prisma.paymentProvider.create({ data: { name: "Stripe (card and US bank account)", code, isInstalled: true, companyId, ...STRIPE_FUNCTIONS } });
  return { id: created.id, isInstalled: true, configured: isPaymentProviderConfigured(code) };
}

export async function setPaymentProviderInstalled(_root: unknown, { providerId, isInstalled }: { providerId: string; isInstalled: boolean }, context: KeystoneContext) {
  const sudo = context.sudo();
  const provider = await sudo.prisma.paymentProvider.findUnique({ where: { id: providerId } });
  if (!provider?.companyId) throw new Error("Provider not found");
  companyBillingAdmin(context, provider.companyId);
  const updated = await sudo.prisma.paymentProvider.update({ where: { id: providerId }, data: { isInstalled } });
  return { id: updated.id, isInstalled: updated.isInstalled, configured: isPaymentProviderConfigured(updated.code) };
}
