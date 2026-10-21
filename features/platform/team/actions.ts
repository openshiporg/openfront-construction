'use server';
import { randomUUID } from "node:crypto";
import { keystoneClient } from "@/features/dashboard/lib/keystoneClient";
import type { CommandState } from "@/features/platform/projects/action-state";
export async function revokeInvitationAction(_previous: CommandState, formData: FormData): Promise<CommandState> {
  const response = await keystoneClient<{ revokeProjectInvitation: { replayed: boolean } }>(`
    mutation RevokeProjectInvitation($invitationId: ID!, $reason: String!) {
      revokeProjectInvitation(invitationId: $invitationId, reason: $reason) { success operation itemId actionId replayed }
    }
  `, { invitationId: String(formData.get("invitationId") ?? ""), reason: String(formData.get("reason") ?? "") });
  return response.success ? { status: "success", message: response.data.revokeProjectInvitation.replayed ? "Invitation was already revoked." : "Invitation and pending project grant revoked." } : { status: "error", message: response.error };
}
export async function reissueInvitationAction(_previous: CommandState, formData: FormData): Promise<CommandState> {
  const response = await keystoneClient<{ reissueProjectInvitation: { replayed: boolean; activationToken?: string | null } }>(`
    mutation ReissueProjectInvitation($invitationId: ID!, $reason: String!, $idempotencyKey: String!) {
      reissueProjectInvitation(invitationId: $invitationId, reason: $reason, idempotencyKey: $idempotencyKey) { success operation itemId actionId replayed activationToken }
    }
  `, { invitationId: String(formData.get("invitationId") ?? ""), reason: String(formData.get("reason") ?? ""), // Each resend is a new link; a repeat simply supersedes the previous one.
    idempotencyKey: randomUUID() });
  if (!response.success) return { status: "error", message: response.error };
  const token = response.data.reissueProjectInvitation.activationToken;
  if (!token) return { status: "success", message: "This invitation was already resent. Resend it again to get a new link." };
  return {
    status: "success",
    message: "New invitation link created. The previous link no longer works. Copy this link now; it cannot be shown again.",
    oneTimeSecret: `/accept-invitation?token=${encodeURIComponent(token)}`,
    oneTimeSecretKind: "invitation-link",
  };
}
