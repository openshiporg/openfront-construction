"use client";
import { useActionState } from "react";
import { customerPaymentAction, type AccountState } from "./actions";
export function PaymentStartForm({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState(customerPaymentAction, { message: "" } satisfies AccountState);
  return <form action={action}><input type="hidden" name="requestId" value={requestId}/><button type="submit" disabled={pending}>{pending ? "Opening secure checkout…" : "Pay deposit"}</button>{state.message && <p role="alert">{state.message}</p>}</form>;
}
