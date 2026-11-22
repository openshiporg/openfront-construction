"use client";
import { useState } from "react";
import { CustomerAuthForm } from "./AccountForms";

/** Sign in and create account. Side by side on a wide screen; on a phone one form at a time,
 *  with a plain switch under it, so the page is one decision rather than two stacked forms. */
export function AuthChoices({ signupAllowed, service, from }: { signupAllowed: boolean; service?: string; from?: string }) {
  // Someone who arrives from a service page to ask for a quote is most likely new.
  const [mode, setMode] = useState<"signin" | "signup">(signupAllowed && service ? "signup" : "signin");
  if (!signupAllowed) return <div className="sf-split" style={{ alignItems: "start" }}><CustomerAuthForm service={service} from={from} /></div>;
  return <div className="sf-split sf-auth" data-mode={mode} style={{ alignItems: "start" }}>
    <div className="sf-auth__pane" data-pane="signin">
      <CustomerAuthForm service={service} from={from} />
      <p className="sf-small sf-auth__switch">New here? <button type="button" className="sf-link" onClick={() => setMode("signup")}>Create an account</button></p>
    </div>
    <div className="sf-auth__pane" data-pane="signup">
      <CustomerAuthForm signup service={service} from={from} />
      <p className="sf-small sf-auth__switch">Already have an account? <button type="button" className="sf-link" onClick={() => setMode("signin")}>Sign in</button></p>
    </div>
  </div>;
}
