"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { customerAuthAction, customerProfileAction, customerRequestAction, customerResetAction, customerResetRequestAction } from "./actions";
import type { CustomerRequest } from "./data";

const field = "grid min-w-0 gap-2 text-sm font-medium";
const input = "min-h-11 min-w-11 w-full rounded-md border bg-background px-3 py-2 text-base";
const button = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50";

export function CustomerAuthForm({ signup, service = "", from = "" }: { signup?: boolean; service?: string; from?: string }) {
  const [state, action, pending] = useActionState(customerAuthAction, { message: "" });
  return <form action={action} className="grid min-w-0 gap-4 rounded-lg border p-5">
    <h2 className="text-xl font-semibold">{signup ? "Create account" : "Sign in"}</h2>
    <input type="hidden" name="mode" value={signup ? "signup" : "signin"} />
    <input type="hidden" name="service" value={service} />
    <input type="hidden" name="from" value={from} />
    {signup && <label className={field}>Name<input className={input} name="name" autoComplete="name" required maxLength={200} /></label>}
    <label className={field}>Email<input className={input} name="email" type="email" autoComplete="email" required maxLength={320} /></label>
    <label className={field}>Password<input className={input} name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} required minLength={10} maxLength={1000} /></label>
    <button type="submit" className={button} disabled={pending}>{pending ? "Submitting…" : signup ? "Create account" : "Sign in"}</button>
    {!signup && <Link href="/account/reset" className="inline-flex min-h-11 items-center justify-self-start text-sm underline">Forgot password?</Link>}
    {state.message && <p role="alert" className="text-sm">{state.message}</p>}
  </form>;
}

export function ResetRequestForm() {
  const [state, action, pending] = useActionState(customerResetRequestAction, { message: "", success: false });
  return <form action={action} className="grid min-w-0 gap-4 rounded-lg border p-5">
    <h2 className="text-xl font-semibold">Reset password</h2>
    <label className={field}>Email<input className={input} name="email" type="email" autoComplete="email" required maxLength={320} /></label>
    <button type="submit" className={`${button} justify-self-start`} disabled={pending}>{pending ? "Sending…" : "Send reset link"}</button>
    {state.message && <p role={state.success ? "status" : "alert"} className="text-sm">{state.message}</p>}
    <Link href="/account" className="inline-flex min-h-11 items-center justify-self-start text-sm underline">Back to sign in</Link>
  </form>;
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(customerResetAction, { message: "", success: false });
  if (state.success) return <div className="grid min-w-0 gap-4 rounded-lg border p-5">
    <p role="status">{state.message}</p>
    <Link href="/account" className={`${button} justify-self-start`}>Sign in</Link>
  </div>;
  return <form action={action} className="grid min-w-0 gap-4 rounded-lg border p-5">
    <h2 className="text-xl font-semibold">Choose a new password</h2>
    <input type="hidden" name="token" value={token} />
    <label className={field}>Email<input className={input} name="email" type="email" autoComplete="email" required maxLength={320} /></label>
    <label className={field}>New password<input className={input} name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={1000} /></label>
    <label className={field}>Confirm new password<input className={input} name="confirmPassword" type="password" autoComplete="new-password" required minLength={10} maxLength={1000} /></label>
    <button type="submit" className={`${button} justify-self-start`} disabled={pending}>{pending ? "Saving…" : "Update password"}</button>
    {state.message && <p role="alert" className="text-sm">{state.message}</p>}
    {state.message && <Link href="/account/reset" className="inline-flex min-h-11 items-center justify-self-start text-sm underline">Request a new link</Link>}
  </form>;
}

export function ProfileForm({ user }: { user: { name: string; email: string; phone: string } }) {
  const [state, action, pending] = useActionState(customerProfileAction, { message: "" });
  return <form action={action} className="grid min-w-0 gap-4 rounded-lg border p-5">
    <h2 className="text-xl font-semibold">Your details</h2>
    <div className="grid min-w-0 gap-4 md:grid-cols-3">
      <label className={field}>Name<input className={input} name="name" autoComplete="name" required maxLength={200} defaultValue={user.name} /></label>
      <label className={field}>Email<input className={input} name="email" type="email" autoComplete="email" required maxLength={320} defaultValue={user.email} /></label>
      <label className={field}>Phone<input className={input} name="phone" type="tel" autoComplete="tel" maxLength={50} defaultValue={user.phone} /></label>
    </div>
    <button type="submit" className={`${button} justify-self-start`} disabled={pending}>{pending ? "Saving…" : "Save details"}</button>
    {state.message && <p role="status" className="text-sm">{state.message}</p>}
  </form>;
}

export function RequestForm({ serviceSlug }: { serviceSlug: string }) {
  const [state, action, pending] = useActionState(customerRequestAction, { message: "" });
  const [key] = useState(() => crypto.randomUUID());
  const [scope, setScope] = useState("");
  return <form action={action} className="grid gap-4">
    <input type="hidden" name="operation" value="request" />
    <input type="hidden" name="serviceSlug" value={serviceSlug} />
    <input type="hidden" name="idempotencyKey" value={key} />
    <label className={field}>Project scope<textarea className={`${input} min-h-32`} name="scope" required minLength={20} maxLength={4000} value={scope} onChange={event => setScope(event.target.value)} /></label>
    <button type="submit" className={`${button} justify-self-start`} disabled={pending}>{pending ? "Submitting…" : "Request a quote"}</button>
    {state.message && <p role="status" className="text-sm">{state.message}</p>}
  </form>;
}

export function RequestDecision({ request, operation, label }: { request: CustomerRequest; operation: "accept" | "cancel"; label: string }) {
  const [state, action, pending] = useActionState(customerRequestAction, { message: "" });
  const [key] = useState(() => crypto.randomUUID());
  return <form action={action} className="grid gap-2">
    <input type="hidden" name="operation" value={operation} /><input type="hidden" name="id" value={request.id} />
    <input type="hidden" name="version" value={request.version} /><input type="hidden" name="idempotencyKey" value={key} />
    <button type="submit" className={button} disabled={pending}>{pending ? "Saving…" : label}</button>
    {state.message && <p role="status" className="text-sm">{state.message}</p>}
  </form>;
}

