import { createTransport } from "nodemailer";
import type { KeystoneContext } from "@keystone-6/core/types";
import { requestIdFromPaymentKey } from "../domain/payment-settlement";
import { formatUsdMinor } from "../../lib/money";
import { emailButton, emailHeading, emailLayout, emailMuted, emailParagraph, emailPanel, emailTotals, escapeHtml } from "./email-layout";
import { smtpAddress } from "./smtp-address";

const port = Number.parseInt(process.env.SMTP_PORT || "", 10);
const transport = createTransport({
  host: process.env.SMTP_HOST,
  port: Number.isFinite(port) ? port : undefined,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
});

/**
 * The customer's deposit receipt, sent when the deposit settles, by whichever path settled it
 * (return page, webhook, or a later page read). Exactly once per request: the send is claimed by a
 * unique ServiceRequestEvent key first and the claim is released if the mail server refuses, so the
 * next settle attempt retries. Never throws into settlement.
 */
export async function sendDepositConfirmationOnce(context: KeystoneContext, paymentId: string): Promise<string | null> {
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) return null;
  const prisma = context.sudo().prisma;
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, select: { id: true, status: true, idempotencyKey: true, amountMinor: true, paymentNumber: true, settledAt: true } });
  const requestId = requestIdFromPaymentKey(payment?.idempotencyKey);
  if (!payment || payment.status !== "settled" || !requestId) return null;
  const request = await prisma.serviceRequest.findUnique({
    where: { id: requestId },
    select: { id: true, reference: true, serviceTitle: true, status: true, projectId: true, acceptedSnapshot: true, customer: { select: { name: true, email: true } }, company: { select: { name: true, brandName: true } } },
  });
  const to = String(request?.customer?.email || "").trim();
  if (!request || request.status !== "booked" || !to) return null;
  const eventKey = `deposit-email:${request.id}`;
  try {
    await prisma.serviceRequestEvent.create({ data: { eventKey, commandDigest: payment.id, action: "deposit_email", fromStatus: "booked", toStatus: "booked", requestId: request.id, snapshot: { status: "sending" } } });
  } catch {
    return null; // already sent (or being sent) for this request
  }
  try {
    const snapshot = (request.acceptedSnapshot ?? {}) as Record<string, unknown>;
    const total = BigInt(String(snapshot.totalMinor || payment.amountMinor));
    const paid = BigInt(payment.amountMinor);
    const store = request.company?.brandName || request.company?.name || "Construction";
    const base = (process.env.SMTP_STORE_LINK || "").replace(/\/$/, "");
    const rows = [{ label: "Accepted quote", value: formatUsdMinor(total) }];
    if (total > paid) rows.push({ label: "Balance, billed on milestones", value: formatUsdMinor(total - paid) });
    rows.push({ label: total > paid ? "Deposit paid" : "Paid", value: formatUsdMinor(paid) });
    const html = emailLayout({
      storeName: store,
      preheader: `Your deposit for ${request.reference} is received and the job is booked.`,
      title: "Deposit received",
      body: `${emailHeading("Your job is booked")}
${emailParagraph(`Hi ${escapeHtml(request.customer?.name || "there")}, we received your payment for <strong>${escapeHtml(request.serviceTitle || "your project")}</strong> (${escapeHtml(request.reference)}). Your project is set up and your project manager will be in touch to schedule the work.`)}
${emailPanel(emailTotals(rows))}
${emailMuted(`Receipt ${escapeHtml(payment.paymentNumber || payment.id)}`)}
${base && request.projectId ? emailButton("Open your project", `${base}/portal/projects/${request.projectId}`) : ""}`,
    });
    const info = await transport.sendMail({
      to: { name: "", address: smtpAddress(to) },
      from: { name: store, address: smtpAddress(process.env.SMTP_FROM.replace(/^.*<([^>]+)>.*$/, "$1").trim()) },
      disableFileAccess: true,
      disableUrlAccess: true,
      subject: `Deposit received: ${request.reference} is booked`,
      html,
    });
    await prisma.serviceRequestEvent.update({ where: { eventKey }, data: { snapshot: { status: "sent", messageId: info.messageId, paymentId: payment.id } } });
    console.info(`[deposit-email] ${request.reference} sent ${info.messageId}`);
    return info.messageId;
  } catch (error) {
    console.warn(`[deposit-email] ${request.reference} not sent: ${(error as Error).message}`);
    await prisma.serviceRequestEvent.delete({ where: { eventKey } }).catch(() => undefined);
    return null;
  }
}
