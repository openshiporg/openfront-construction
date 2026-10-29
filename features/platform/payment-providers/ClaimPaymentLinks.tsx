'use client';

import { useActionState } from "react";
import { FormFeedback, Panel, Track, pillClass } from "@/features/platform/components/kit";
import { initialCommandState } from "@/features/platform/projects/action-state";
import { checkPaymentStatusAction, sendClaimPaymentLinkAction } from "@/features/portal/payments/actions";

export type StaffClaim = { id: string; claimNumber: string; remaining: string; paymentId: string | null };

function Row({ projectId, claim }: { projectId: string; claim: StaffClaim }) {
  const [link, linkAction, linking] = useActionState(sendClaimPaymentLinkAction, initialCommandState);
  const [check, checkAction, checking] = useActionState(checkPaymentStatusAction, initialCommandState);
  const paymentId = claim.paymentId;
  return <li className="grid gap-2 py-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="grid gap-0.5"><span className="font-medium">Claim {claim.claimNumber}</span><span className="text-xs text-muted-foreground tabular-nums">{claim.remaining} due</span></span>
      <Track>
        <form action={linkAction}><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="claimId" value={claim.id} /><button disabled={linking} className={pillClass("primary", "sm")}>{linking ? "Creating…" : "Send payment link"}</button></form>
        {paymentId && <form action={checkAction}><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="paymentId" value={paymentId} /><button disabled={checking} className={pillClass("raised", "sm")}>{checking ? "Checking…" : "Check status"}</button></form>}
      </Track>
    </div>
    {link.oneTimeSecret ? <label className="grid gap-1 text-xs">Share this secure payment link with the owner<input readOnly value={link.oneTimeSecret} onFocus={event => event.currentTarget.select()} className="w-full rounded-[6px] border bg-background px-2 py-1 font-mono" /></label> : <FormFeedback status={link.status} message={link.status === "error" ? link.message : ""} />}
    <FormFeedback status={check.status} message={check.message} />
  </li>;
}

export function ClaimPaymentLinks({ projectId, claims }: { projectId: string; claims: StaffClaim[] }) {
  if (!claims.length) return null;
  return <Panel id="claim-payments" title="Online claim payments" meta="Approved owner claims can be paid by card or US bank account (ACH).">
    <ul className="divide-y">{claims.map(claim => <Row key={claim.id} projectId={projectId} claim={claim} />)}</ul>
  </Panel>;
}
