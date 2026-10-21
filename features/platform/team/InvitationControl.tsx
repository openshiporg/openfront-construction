'use client';
import { FormSelect } from "@/features/forms/components/FormSelect";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initialCommandState } from "@/features/platform/projects/action-state";
import type { ConstructionOption } from "@/features/platform/projects/data";
import { useRefreshOnSuccess } from "@/features/platform/projects/use-refresh-on-success";
import { OneTimeSecretReceipt } from "@/features/platform/projects/components/OneTimeSecretReceipt";
import { reissueInvitationAction, revokeInvitationAction } from "./actions";
export function InvitationControl({ options }: { options: ConstructionOption[] }) {
  const pendingInvites = options.filter(option => option.kind === "accountInvitation" && option.detail.startsWith("pending"));
  const [state, action, pending] = useActionState(revokeInvitationAction, initialCommandState);
  useRefreshOnSuccess(state.status);
  const resendable = options.filter(option => option.kind === "accountInvitation" && (option.detail.startsWith("pending") || option.detail.startsWith("expired")));
  return <>{pendingInvites.length > 0 && <form action={action} className="grid min-w-0 gap-3 border-y bg-muted/15 p-4 [&>label]:min-w-0 [&_input]:min-w-0 [&_select]:w-full [&_select]:min-w-0 md:grid-cols-[1fr_2fr_auto] md:p-6"><label className="grid gap-1 text-xs font-medium">Pending invitation<FormSelect name="invitationId" required defaultValue="" className="h-10 rounded-md border bg-background px-3"><option value="">Select…</option>{pendingInvites.map(option => <option key={option.id} value={option.id}>{option.label} — {option.detail}</option>)}</FormSelect></label><label className="grid gap-1 text-xs font-medium">Revocation reason<Input name="reason" required minLength={3} maxLength={500} /></label><div className="flex items-end"><Button variant="outline" disabled={pending}>{pending ? "Revoking…" : "Revoke invitation"}</Button></div>{state.message && <p role={state.status === "error" ? "alert" : "status"} className={`text-sm md:col-span-3 ${state.status === "error" ? "text-destructive" : "text-emerald-700"}`}>{state.message}</p>}</form>}{resendable.length > 0 && <ResendInvitation invites={resendable} />}</>;
}

function ResendInvitation({ invites }: { invites: ConstructionOption[] }) {
  const [state, action, pending] = useActionState(reissueInvitationAction, initialCommandState);
  useRefreshOnSuccess(state.status);
  return <form action={action} className="grid min-w-0 gap-3 border-b bg-muted/15 p-4 [&>label]:min-w-0 [&_input]:min-w-0 [&_select]:w-full [&_select]:min-w-0 md:grid-cols-[1fr_2fr_auto] md:p-6"><label className="grid gap-1 text-xs font-medium">Invitation to resend<FormSelect name="invitationId" required defaultValue="" className="h-10 rounded-md border bg-background px-3"><option value="">Select…</option>{invites.map(option => <option key={option.id} value={option.id}>{option.label} — {option.detail}</option>)}</FormSelect></label><label className="grid gap-1 text-xs font-medium">Reason<Input name="reason" required minLength={3} maxLength={500} /></label><div className="flex items-end"><Button variant="outline" disabled={pending}>{pending ? "Resending…" : "Resend invitation"}</Button></div>{state.message && <p role={state.status === "error" ? "alert" : "status"} className={`text-sm md:col-span-3 ${state.status === "error" ? "text-destructive" : "text-emerald-700"}`}>{state.message}</p>}<div className="md:col-span-3"><OneTimeSecretReceipt state={state} /></div></form>;
}
