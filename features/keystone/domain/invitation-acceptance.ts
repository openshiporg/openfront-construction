export function resolveInvitationAcceptanceMode(input: {
  accountSetupRequired: boolean;
  sessionAuthType?: "session" | "api_key";
  sessionUserId?: string;
  invitedUserId: string;
  password: string;
}): "activate-new-account" | "accept-existing-account" {
  if (input.accountSetupRequired) {
    if (input.sessionUserId) throw new Error("Sign out before setting up a newly invited account");
    if (input.password.length < 10) throw new Error("A new invited account requires a password with at least 10 characters");
    return "activate-new-account";
  }
  if (input.sessionAuthType !== "session" || input.sessionUserId !== input.invitedUserId) {
    throw new Error("Sign in to the invited account before accepting this invitation");
  }
  if (input.password.length > 0) throw new Error("Existing account passwords cannot be changed while accepting an invitation");
  return "accept-existing-account";
}
