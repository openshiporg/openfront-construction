"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { localDateTimeToInstant } from "@/features/platform/projects/components/workflow-fields";
import { operatorRequestAction, type OperatorRequestState } from "./actions";
import type { OperatorRequest } from "./data";

const initialState: OperatorRequestState = { status: "idle", message: "" };
const subscribeToNothing = () => () => {};
let openedAt: number | undefined;
const clientNow = () => (openedAt ??= Date.now());

function Feedback({ state }: { state: OperatorRequestState }) {
  return state.message ? <p role={state.status === "error" ? "alert" : "status"} className={`text-sm ${state.status === "error" ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"}`}>{state.message}</p> : null;
}

function localInputValue(iso: string) {
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function QuoteForm({ request }: { request: OperatorRequest }) {
  const [state, action, pending] = useActionState(operatorRequestAction, initialState);
  const [key] = useState(() => crypto.randomUUID());
  // Shown in the operator's own time zone, so it is resolved on the client.
  const defaultExpiry = useSyncExternalStore(subscribeToNothing, () => localInputValue(request.expiresAt ?? new Date(clientNow() + 7 * 86400000).toISOString()), () => "");
  const [edited, setEdited] = useState<string | null>(null);
  const expiry = edited ?? defaultExpiry;
  const quoted = request.status === "quoted";
  return <form action={action} className="grid min-w-0 gap-4">
    <input type="hidden" name="operation" value="quote" /><input type="hidden" name="id" value={request.id} />
    <input type="hidden" name="version" value={request.version} /><input type="hidden" name="idempotencyKey" value={key} />
    <input type="hidden" name="expiresAt" value={localDateTimeToInstant(expiry) ?? ""} />
    <label className="grid min-w-0 gap-1 text-sm font-medium">Quote amount (USD)<Input name="amount" inputMode="decimal" required pattern="[0-9]+(\.[0-9]{1,2})?" defaultValue={quoted ? `${BigInt(request.quoteMinor) / BigInt(100)}.${(BigInt(request.quoteMinor) % BigInt(100)).toString().padStart(2, "0")}` : ""} /></label>
    <label className="grid min-w-0 gap-1 text-sm font-medium">Quote terms<Textarea name="terms" required minLength={20} maxLength={4000} defaultValue={request.quoteTerms} className="min-h-24" /></label>
    <label className="grid min-w-0 gap-1 text-sm font-medium">Quote expires<Input type="datetime-local" required value={expiry} onChange={event => setEdited(event.target.value)} /></label>
    <Button type="submit" className="justify-self-start" disabled={pending}>{pending ? "Saving…" : quoted ? "Update quote" : "Issue quote"}</Button>
    <Feedback state={state} />
  </form>;
}

export function CancelRequestForm({ request }: { request: OperatorRequest }) {
  const [state, action, pending] = useActionState(operatorRequestAction, initialState);
  const [key] = useState(() => crypto.randomUUID());
  return <form action={action} className="grid gap-2">
    <input type="hidden" name="operation" value="cancel" /><input type="hidden" name="id" value={request.id} />
    <input type="hidden" name="version" value={request.version} /><input type="hidden" name="idempotencyKey" value={key} />
    <Button type="submit" variant="outline" className="justify-self-start" disabled={pending}>{pending ? "Saving…" : "Cancel request"}</Button>
    <Feedback state={state} />
  </form>;
}
