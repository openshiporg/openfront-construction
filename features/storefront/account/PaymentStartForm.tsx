"use client";
import { useActionState } from "react";
import { customerPaymentAction, type AccountState } from "./actions";
export function PaymentStartForm({ requestId, label = "Pay deposit" }: { requestId: string; label?: string }) {
  const [state, action, pending] = useActionState(customerPaymentAction, { message: "" } satisfies AccountState);
  return <form action={action} className="sf-stack" style={{ gap: "0.5rem" }}>
    <input type="hidden" name="requestId" value={requestId}/>
    <div className="sf-track"><button type="submit" className="sf-pill sf-pill--primary" disabled={pending}>{pending ? "Opening secure checkout…" : label}</button></div>
    {state.message && <p role="alert" className="sf-error"><span aria-hidden="true" className="sf-dot sf-dot--stop" />{state.message}</p>}
  </form>;
}
