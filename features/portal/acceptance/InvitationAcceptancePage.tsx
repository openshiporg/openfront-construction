'use client';

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initialCommandState } from "@/features/platform/projects/action-state";
import { acceptProjectInvitationAction, type InvitationAcceptanceState } from "./actions";
import { customerSignOut } from "@/features/storefront/account/actions";

// Staff sign in on the dashboard; clients and trade partners sign in on the public website.
function nextHref(destination: "/dashboard" | "/portal", signedIn: boolean) {
  if (signedIn) return destination;
  return destination === "/dashboard" ? "/dashboard/signin" : "/account?from=/portal";
}

export function InvitationAcceptancePage({ token, signedInAs }: { token: string; signedInAs: string | null }) {
  const [state, action, pending] = useActionState<InvitationAcceptanceState, FormData>(acceptProjectInvitationAction, initialCommandState);
  const continuation = `/accept-invitation?token=${encodeURIComponent(token)}`;
  const signInHref = `/account?from=${encodeURIComponent(continuation)}`;

  return (
    <main className="mx-auto flex min-h-svh max-w-lg items-center px-4 py-10">
      <section className="w-full rounded-xl border p-6 shadow-sm md:p-8">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Project invitation</p>
        <h1 className="mt-2 text-2xl font-semibold">Accept your project invitation</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          This invitation can be used once and expires seven days after it was sent.
          New to the portal? Choose a password below. Already have an account? Sign in with the invited email, then accept without a password.
        </p>
        {signedInAs && <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
          <span className="min-w-0 break-words">Signed in as {signedInAs}</span>
          <form action={customerSignOut}><input type="hidden" name="from" value={continuation} /><button className="inline-flex min-h-11 items-center font-medium underline underline-offset-4">Switch account</button></form>
        </div>}
        <form action={action} className="mt-6 grid gap-4">
          <label className="grid gap-1.5 text-sm font-medium">Invitation token<Input name="token" required defaultValue={token} autoComplete="off" /></label>
          <label className="grid gap-1.5 text-sm font-medium">Display name (new accounts only)<Input name="name" autoComplete="name" /></label>
          <label className="grid gap-1.5 text-sm font-medium">New-account password (leave blank for existing accounts)<Input name="password" type="password" minLength={10} autoComplete="new-password" /></label>
          <label className="grid gap-1.5 text-sm font-medium">Confirm new-account password<Input name="confirmPassword" type="password" minLength={10} autoComplete="new-password" /></label>
          <Button disabled={pending}>{pending ? "Accepting…" : "Accept invitation"}</Button>
          {state.message && <p role="status" className={`text-sm ${state.status === "error" ? "text-destructive" : "text-emerald-700"}`}>{state.message}</p>}
        </form>
        {!signedInAs && <Link href={signInHref} className="mt-5 inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">Already have an account? Sign in first</Link>}
        {state.status === "success" && <Link href={nextHref(state.destination ?? "/portal", Boolean(signedInAs))} className="mt-3 inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">{signedInAs ? "Open your projects" : "Continue to sign in"}</Link>}
      </section>
    </main>
  );
}
