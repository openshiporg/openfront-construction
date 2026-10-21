'use server';

import { keystoneClient } from "@/features/dashboard/lib/keystoneClient";
import type { CommandState } from "@/features/platform/projects/action-state";

export type InvitationAcceptanceState = CommandState & { destination?: "/dashboard" | "/portal" };

export async function acceptProjectInvitationAction(_previous: InvitationAcceptanceState, formData: FormData): Promise<InvitationAcceptanceState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  if ((password || confirmPassword) && password !== confirmPassword) return { status: "error", message: "Passwords do not match" };
  const input = {
    token: String(formData.get("token") ?? "").trim(),
    password: password || null,
    name: String(formData.get("name") ?? "").trim() || null,
  };
  const response = await keystoneClient<{ acceptProjectInvitation: { success: boolean; portalType: string } }>(`
    mutation AcceptProjectInvitation($input: ProjectInvitationAcceptanceInput!) {
      acceptProjectInvitation(input: $input) { success userId projectId portalType }
    }
  `, { input });
  if (!response.success) return { status: "error", message: response.error };
  // Internal staff work in the dashboard; clients and trade partners use the project portal.
  const destination = response.data.acceptProjectInvitation.portalType === "internal" ? "/dashboard" : "/portal";
  return { status: "success", message: "Invitation accepted.", destination };
}
