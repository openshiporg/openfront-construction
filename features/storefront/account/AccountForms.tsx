"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { customerAuthAction, customerProfileAction, customerRequestAction, customerResetAction, customerResetRequestAction } from "./actions";
import type { CustomerRequest } from "./data";

// Account actions return one message field; these are their success messages.
const SUCCESS_MESSAGES = new Set(["Details saved", "Saved"]);

function Message({ message, success }: { message: string; success?: boolean }) {
  if (!message) return null;
  return (success ?? SUCCESS_MESSAGES.has(message))
    ? <p role="status" className="sf-ok"><span aria-hidden="true" className="sf-dot sf-dot--ok" />{message}</p>
    : <p role="alert" className="sf-error"><span aria-hidden="true" className="sf-dot sf-dot--stop" />{message}</p>;
}

function Submit({ pending, label, pendingLabel, variant = "primary" }: { pending: boolean; label: string; pendingLabel: string; variant?: "primary" | "raised" | "danger" }) {
  return <div className="sf-track"><button type="submit" className={`sf-pill sf-pill--${variant}`} disabled={pending}>{pending ? pendingLabel : label}</button></div>;
}

export function CustomerAuthForm({ signup, service = "", from = "" }: { signup?: boolean; service?: string; from?: string }) {
  const [state, action, pending] = useActionState(customerAuthAction, { message: "" });
  return <form action={action} className="sf-panel sf-stack" aria-labelledby={signup ? "signup-title" : "signin-title"}>
    <h2 id={signup ? "signup-title" : "signin-title"} className="sf-panel__title">{signup ? "Create account" : "Sign in"}</h2>
    <input type="hidden" name="mode" value={signup ? "signup" : "signin"} />
    <input type="hidden" name="service" value={service} />
    <input type="hidden" name="from" value={from} />
    {signup && <label className="sf-field">Name<input className="sf-input" name="name" autoComplete="name" required maxLength={200} /></label>}
    <label className="sf-field">Email<input className="sf-input" name="email" type="email" autoComplete="email" required maxLength={320} /></label>
    <label className="sf-field">Password<input className="sf-input" name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} required minLength={10} maxLength={1000} /></label>
    <div className="sf-row">
      <Submit pending={pending} label={signup ? "Create account" : "Sign in"} pendingLabel={signup ? "Creating…" : "Signing in…"} variant={signup ? "raised" : "primary"} />
      {!signup && <Link href="/account/reset" className="sf-small sf-link">Forgot password</Link>}
    </div>
    <Message message={state.message} />
  </form>;
}

export function ResetRequestForm() {
  const [state, action, pending] = useActionState(customerResetRequestAction, { message: "", success: false });
  return <form action={action} className="sf-panel sf-stack">
    <h2 className="sf-panel__title">Reset password</h2>
    <label className="sf-field">Email<input className="sf-input" name="email" type="email" autoComplete="email" required maxLength={320} /></label>
    <div className="sf-row">
      <Submit pending={pending} label="Send reset link" pendingLabel="Sending…" />
      <Link href="/account" className="sf-small sf-link">Back to sign in</Link>
    </div>
    <Message message={state.message} success={state.success} />
  </form>;
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(customerResetAction, { message: "", success: false });
  if (state.success) return <div className="sf-panel sf-stack">
    <Message message={state.message} success />
    <div className="sf-track"><Link href="/account" className="sf-pill sf-pill--primary">Sign in</Link></div>
  </div>;
  return <form action={action} className="sf-panel sf-stack">
    <h2 className="sf-panel__title">New password</h2>
    <input type="hidden" name="token" value={token} />
    <label className="sf-field">Email<input className="sf-input" name="email" type="email" autoComplete="email" required maxLength={320} /></label>
    <label className="sf-field">New password<input className="sf-input" name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={1000} /></label>
    <label className="sf-field">Confirm password<input className="sf-input" name="confirmPassword" type="password" autoComplete="new-password" required minLength={10} maxLength={1000} /></label>
    <Submit pending={pending} label="Update password" pendingLabel="Saving…" />
    <Message message={state.message} />
    {state.message && <Link href="/account/reset" className="sf-small sf-link">Request a new link</Link>}
  </form>;
}

export function ProfileForm({ user }: { user: { name: string; email: string; phone: string } }) {
  const [state, action, pending] = useActionState(customerProfileAction, { message: "" });
  return <form action={action} className="sf-panel sf-stack" aria-labelledby="profile-title">
    <h2 id="profile-title" className="sf-panel__title">Your details</h2>
    <label className="sf-field">Name<input className="sf-input" name="name" autoComplete="name" required maxLength={200} defaultValue={user.name} /></label>
    <label className="sf-field">Email<input className="sf-input" name="email" type="email" autoComplete="email" required maxLength={320} defaultValue={user.email} /></label>
    <label className="sf-field">Phone<input className="sf-input" name="phone" type="tel" autoComplete="tel" maxLength={50} defaultValue={user.phone} /></label>
    <Submit pending={pending} label="Save details" pendingLabel="Saving…" variant="raised" />
    <Message message={state.message} />
  </form>;
}

export function RequestForm({ serviceSlug }: { serviceSlug: string }) {
  const [state, action, pending] = useActionState(customerRequestAction, { message: "" });
  const [key] = useState(() => crypto.randomUUID());
  const [scope, setScope] = useState("");
  return <form action={action} className="sf-stack">
    <input type="hidden" name="operation" value="request" />
    <input type="hidden" name="serviceSlug" value={serviceSlug} />
    <input type="hidden" name="idempotencyKey" value={key} />
    <label className="sf-field">Scope<textarea className="sf-textarea" name="scope" required minLength={20} maxLength={4000} value={scope} onChange={event => setScope(event.target.value)} /></label>
    <Submit pending={pending} label="Request a quote" pendingLabel="Sending…" />
    <Message message={state.message} />
  </form>;
}

export function RequestDecision({ request, operation, label }: { request: CustomerRequest; operation: "accept" | "cancel"; label: string }) {
  const [state, action, pending] = useActionState(customerRequestAction, { message: "" });
  const [key] = useState(() => crypto.randomUUID());
  return <form action={action} className="sf-stack" style={{ gap: "0.5rem" }}>
    <input type="hidden" name="operation" value={operation} /><input type="hidden" name="id" value={request.id} />
    <input type="hidden" name="version" value={request.version} /><input type="hidden" name="idempotencyKey" value={key} />
    <Submit pending={pending} label={label} pendingLabel="Saving…" variant={operation === "accept" ? "primary" : "danger"} />
    <Message message={state.message} />
  </form>;
}
