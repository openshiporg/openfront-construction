'use server';
import { platformClient } from "@/features/platform/lib/platform-client";
import type { CommandState } from "@/features/platform/projects/action-state";
function value(data: FormData, key: string) { return String(data.get(key) ?? "").trim(); }
export async function issueCredentialAction(_previous: CommandState, formData: FormData): Promise<CommandState> {
  const scopes = formData.getAll("scopes").map(String);
  const response = await platformClient<{ issueApiCredential: { token: string; tokenPrefix: string } }>(`
    mutation IssueApiCredential($input: ApiCredentialInput!) { issueApiCredential(input: $input) { success credentialId actionId token tokenPrefix scopes } }
  `, { input: { companyId: value(formData, "companyId"), projectId: value(formData, "projectId") || null, name: value(formData, "name"), scopes, expiresAt: value(formData, "expiresAt") || null } });
  return response.success ? {
    status: "success",
    message: "Credential issued. Copy this one-time token now; it cannot be recovered after leaving this screen.",
    oneTimeSecret: response.data.issueApiCredential.token,
    oneTimeSecretKind: "api-credential",
  } : { status: "error", message: response.error };
}
export async function revokeCredentialAction(_previous: CommandState, formData: FormData): Promise<CommandState> {
  const response = await platformClient<{ revokeApiCredential: { replayed: boolean } }>(`
    mutation RevokeApiCredential($id: ID!, $reason: String!) { revokeApiCredential(id: $id, reason: $reason) { success credentialId actionId replayed } }
  `, { id: value(formData, "credentialId"), reason: value(formData, "reason") });
  return response.success ? { status: "success", message: response.data.revokeApiCredential.replayed ? "Credential was already revoked." : "Credential revoked immediately." } : { status: "error", message: response.error };
}
