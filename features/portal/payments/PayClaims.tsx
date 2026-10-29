'use client';

import { useActionState } from "react";
import { initialCommandState } from "@/features/platform/projects/action-state";
import { checkPaymentStatusAction, payClaimAction, type PayableClaim } from "./actions";

const money = (minor: string, currency: string) => (Number(minor) / 100).toLocaleString("en-US", { style: "currency", currency });

function PayForm({ projectId, claim }: { projectId: string; claim: PayableClaim }) {
  const [state, action, pending] = useActionState(payClaimAction, initialCommandState);
  return <form action={action}><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="claimId" value={claim.id} /><button type="submit" disabled={pending} className="sf-btn">{pending ? "Opening secure checkout…" : "Pay claim"}</button>{state.status === "error" && <p role="alert">{state.message}</p>}</form>;
}
function CheckForm({ projectId, paymentId }: { projectId: string; paymentId: string }) {
  const [state, action, pending] = useActionState(checkPaymentStatusAction, initialCommandState);
  return <form action={action}><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="paymentId" value={paymentId} /><button type="submit" disabled={pending}>{pending ? "Checking…" : "Check status"}</button>{state.message && <p role="status">{state.message}</p>}</form>;
}

export function PayClaims({ projectId, claims, notice }: { projectId: string; claims: PayableClaim[]; notice?: string }) {
  if (!claims.length && !notice) return null;
  return <section aria-labelledby="pay-claims-title" className="sf-stack">
    <h2 id="pay-claims-title" className="sf-panel__title">Pay approved claims</h2>
    {notice && <p role="status">{notice}</p>}
    <ul className="sf-list">{claims.map(claim => <li key={claim.id} className="sf-list__item sf-list__item--split">
      <span className="sf-stack" style={{ gap: "0.25rem" }}>
        <span className="sf-list__ref">Claim {claim.claimNumber}</span>
        <span className="sf-list__title">{money(claim.remainingMinor, claim.currencyCode)} due</span>
        <span className="sf-small">After {money(claim.retainageMinor, claim.currencyCode)} retainage held. Pay by card or US bank account (ACH).</span>
      </span>
      <span className="sf-stack" style={{ gap: "0.5rem" }}><PayForm projectId={projectId} claim={claim} />{claim.paymentId && <CheckForm projectId={projectId} paymentId={claim.paymentId} />}</span>
    </li>)}</ul>
  </section>;
}
