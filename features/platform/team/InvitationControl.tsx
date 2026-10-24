'use client';
import { FormSelect } from "@/features/forms/components/FormSelect";
import { useActionState } from "react";
import { MailWarning } from "lucide-react";
import { initialCommandState } from "@/features/platform/projects/action-state";
import type { ConstructionOption } from "@/features/platform/projects/data";
import { useRefreshOnSuccess } from "@/features/platform/projects/use-refresh-on-success";
import { OneTimeSecretReceipt } from "@/features/platform/projects/components/OneTimeSecretReceipt";
import { reissueInvitationAction, revokeInvitationAction } from "./actions";
import { FormFeedback, Panel, fieldLabelClass, inputClass, pillClass, selectClass, trackClass } from "@/features/platform/components/kit";
import { keepUnlessSaved } from "@/features/lib/form-reset";

export function InvitationControl({ options }: { options: ConstructionOption[] }) {
  const pendingInvites = options.filter(option => option.kind === "accountInvitation" && option.detail.startsWith("pending"));
  const resendable = options.filter(option => option.kind === "accountInvitation" && (option.detail.startsWith("pending") || option.detail.startsWith("expired")));
  if (!pendingInvites.length && !resendable.length) return null;
  return (
    <Panel id="invitations" title="Invitations" icon={MailWarning} meta={`${pendingInvites.length} pending`} padded={false}>
      <div className="divide-y">
        {pendingInvites.length > 0 && <RevokeInvitation invites={pendingInvites} />}
        {resendable.length > 0 && <ResendInvitation invites={resendable} />}
      </div>
    </Panel>
  );
}

function RevokeInvitation({ invites }: { invites: ConstructionOption[] }) {
  const [state, action, pending] = useActionState(revokeInvitationAction, initialCommandState);
  useRefreshOnSuccess(state.status);
  return <form action={action} onReset={keepUnlessSaved(state.status === "success")} className="grid min-w-0 gap-4 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto] md:items-end md:p-5">
    <label className={fieldLabelClass}>Pending invitation<FormSelect name="invitationId" required defaultValue="" className={selectClass}><option value="">Select…</option>{invites.map(option => <option key={option.id} value={option.id}>{option.label} — {option.detail}</option>)}</FormSelect></label>
    <label className={fieldLabelClass}>Reason<input name="reason" required minLength={3} maxLength={500} className={inputClass} /></label>
    <span className={trackClass}><button disabled={pending} className={pillClass("danger")}>{pending ? "Revoking…" : "Revoke"}</button></span>
    <FormFeedback status={state.status} message={state.message} className="md:col-span-3" />
  </form>;
}

function ResendInvitation({ invites }: { invites: ConstructionOption[] }) {
  const [state, action, pending] = useActionState(reissueInvitationAction, initialCommandState);
  useRefreshOnSuccess(state.status);
  return <form action={action} onReset={keepUnlessSaved(state.status === "success")} className="grid min-w-0 gap-4 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto] md:items-end md:p-5">
    <label className={fieldLabelClass}>Invitation to resend<FormSelect name="invitationId" required defaultValue="" className={selectClass}><option value="">Select…</option>{invites.map(option => <option key={option.id} value={option.id}>{option.label} — {option.detail}</option>)}</FormSelect></label>
    <label className={fieldLabelClass}>Reason<input name="reason" required minLength={3} maxLength={500} className={inputClass} /></label>
    <span className={trackClass}><button disabled={pending} className={pillClass("raised")}>{pending ? "Resending…" : "Resend"}</button></span>
    <FormFeedback status={state.status} message={state.message} className="md:col-span-3" />
    <div className="md:col-span-3"><OneTimeSecretReceipt state={state} /></div>
  </form>;
}
