'use server' 

import { createTransport } from "nodemailer";
import { smtpAddress } from "./smtp-address";
import { emailButton, emailLayout, emailMuted, emailParagraph } from "./email-layout";

// Utility function to get base URL for emails
function getBaseUrlForEmails(): string {
  if (process.env.SMTP_STORE_LINK) {
    return process.env.SMTP_STORE_LINK;
  }
  
  // Fallback warning - this should be set in production
  console.warn('SMTP_STORE_LINK not set. Please add SMTP_STORE_LINK to your environment variables for email links to work properly.');
  return '';
}

const parsedSmtpPort = process.env.SMTP_PORT ? Number.parseInt(process.env.SMTP_PORT, 10) : undefined;
const smtpPort = parsedSmtpPort !== undefined && Number.isFinite(parsedSmtpPort) ? parsedSmtpPort : undefined;

const transport = createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

function passwordResetEmail({ url }: { url: string }): string {
  return emailLayout({
    preheader: "Use this link to choose a new password.",
    title: "Reset your password",
    body: `${emailParagraph("We received a request to reset the password for your account. Use the button below to choose a new one.")}
${emailButton("Reset password", url)}
${emailMuted("If you did not request this, you can safely ignore this email. Your password will not change.")}`,
  });
}

export async function sendPasswordResetEmail(resetToken: string, to: string, baseUrl?: string, resetPath: "/dashboard/reset" | "/account/reset" = "/dashboard/reset"): Promise<void> {
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) throw new Error("Password reset email is not configured");
  const recipient = smtpAddress(to);
  const sender = smtpAddress(process.env.SMTP_FROM);
  // Use provided baseUrl or fall back to utility function
  const frontendUrl = baseUrl || getBaseUrlForEmails();
  
  // email the user a token
  await transport.sendMail({
    to: { name: "", address: recipient },
    from: { name: "", address: sender },
    disableFileAccess: true,
    disableUrlAccess: true,
    subject: "Your password reset token!",
    html: passwordResetEmail({
      url: `${frontendUrl}${resetPath}?token=${encodeURIComponent(resetToken)}`,
    }),
  });

}