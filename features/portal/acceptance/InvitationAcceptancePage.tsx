'use client';

import Link from "next/link";
import { useActionState } from "react";
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
    <main>
      <header className="sf-pagehead">
        <div className="sf-wrap">
          <p className="sf-kicker">Project invitation</p>
          <h1 className="sf-display sf-h1">Join the project</h1>
        </div>
      </header>
      <section className="sf-section">
        <div className="sf-wrap" style={{ maxWidth: "38rem" }}>
          <div className="sf-stack">
            {signedInAs && (
              <div className="sf-panel sf-row" style={{ justifyContent: "space-between" }}>
                <span className="sf-status"><span aria-hidden="true" className="sf-dot sf-dot--ok" />Signed in as {signedInAs}</span>
                <form action={customerSignOut} className="sf-track"><input type="hidden" name="from" value={continuation} /><button className="sf-pill sf-pill--sm">Switch account</button></form>
              </div>
            )}
            {state.status === "success" ? (
              <div className="sf-panel sf-stack" role="status">
                <p className="sf-ok"><span aria-hidden="true" className="sf-dot sf-dot--ok" />{state.message || "Invitation accepted"}</p>
                <div className="sf-track"><Link href={nextHref(state.destination ?? "/portal", Boolean(signedInAs))} className="sf-pill sf-pill--primary">{signedInAs ? "Open your projects" : "Sign in"}</Link></div>
              </div>
            ) : (
              <form action={action} className="sf-panel sf-stack">
                <label className="sf-field">Invitation code<input className="sf-input sf-mono" name="token" required defaultValue={token} autoComplete="off" /></label>
                {!signedInAs && <>
                  <p className="sf-kicker">New account</p>
                  <label className="sf-field">Name<input className="sf-input" name="name" autoComplete="name" /></label>
                  <label className="sf-field">Password<input className="sf-input" name="password" type="password" minLength={10} autoComplete="new-password" /></label>
                  <label className="sf-field">Confirm password<input className="sf-input" name="confirmPassword" type="password" minLength={10} autoComplete="new-password" /></label>
                </>}
                <div className="sf-row">
                  <div className="sf-track"><button className="sf-pill sf-pill--primary" disabled={pending}>{pending ? "Accepting…" : "Accept invitation"}</button></div>
                  {!signedInAs && <Link href={signInHref} className="sf-small sf-link">I have an account</Link>}
                </div>
                {state.status === "error" && state.message && <p role="alert" className="sf-error"><span aria-hidden="true" className="sf-dot sf-dot--stop" />{state.message}</p>}
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
