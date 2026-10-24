"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import { localDateTimeToInstant } from "@/features/platform/projects/components/workflow-fields";
import { operatorRequestAction, type OperatorRequestState } from "./actions";
import type { OperatorRequest } from "./data";
import { FormFeedback, fieldLabelClass, inputClass, pillClass, textareaClass, trackClass } from "@/features/platform/components/kit";
import { keepUnlessSaved } from "@/features/lib/form-reset";

const initialState: OperatorRequestState = { status: "idle", message: "" };
const subscribeToNothing = () => () => {};
let openedAt: number | undefined;
const clientNow = () => (openedAt ??= Date.now());

function Feedback({ state }: { state: OperatorRequestState }) {
  return <FormFeedback status={state.status} message={state.message} />;
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
  return <form action={action} onReset={keepUnlessSaved(state.status === "success")} className="grid min-w-0 gap-4">
    <input type="hidden" name="operation" value="quote" /><input type="hidden" name="id" value={request.id} />
    <input type="hidden" name="version" value={request.version} /><input type="hidden" name="idempotencyKey" value={key} />
    <input type="hidden" name="expiresAt" value={localDateTimeToInstant(expiry) ?? ""} />
    <label className={fieldLabelClass}>Amount (USD)<input name="amount" inputMode="decimal" required pattern="[0-9]+(\.[0-9]{1,2})?" defaultValue={quoted ? `${BigInt(request.quoteMinor) / BigInt(100)}.${(BigInt(request.quoteMinor) % BigInt(100)).toString().padStart(2, "0")}` : ""} className={`${inputClass} text-base font-semibold tabular-nums`} /></label>
    <label className={fieldLabelClass}>Terms<textarea name="terms" required minLength={20} maxLength={4000} defaultValue={request.quoteTerms} className={`${textareaClass} min-h-24`} /></label>
    <label className={fieldLabelClass}>Expires<input type="datetime-local" required value={expiry} onChange={event => setEdited(event.target.value)} className={inputClass} /></label>
    <span className={`${trackClass} w-fit justify-self-start`}><button type="submit" disabled={pending} className={pillClass("primary")}>{pending ? "Saving…" : quoted ? "Update quote" : "Issue quote"}</button></span>
    <Feedback state={state} />
  </form>;
}

export function CancelRequestForm({ request }: { request: OperatorRequest }) {
  const [state, action, pending] = useActionState(operatorRequestAction, initialState);
  const [key] = useState(() => crypto.randomUUID());
  return <form action={action} onReset={keepUnlessSaved(state.status === "success")} className="grid gap-2">
    <input type="hidden" name="operation" value="cancel" /><input type="hidden" name="id" value={request.id} />
    <input type="hidden" name="version" value={request.version} /><input type="hidden" name="idempotencyKey" value={key} />
    <span className={`${trackClass} w-fit justify-self-start`}><button type="submit" disabled={pending} className={pillClass("danger", "sm")}>{pending ? "Saving…" : "Cancel request"}</button></span>
    <Feedback state={state} />
  </form>;
}
