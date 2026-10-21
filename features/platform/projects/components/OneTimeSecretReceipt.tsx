'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { CommandState } from "../action-state";

export function OneTimeSecretReceipt({ state }: { state: CommandState }) {
  const secret = state.oneTimeSecret;
  if (!secret) return null;
  return <SecretReceipt key={secret} secret={secret} kind={state.oneTimeSecretKind} />;
}

/** Invitation links are issued as app paths; the recipient needs the full URL
 * on this app's origin. */
function shareableValue(secret: string, kind?: string) {
  if (kind !== "invitation-link" || typeof window === "undefined") return secret;
  return new URL(secret, window.location.origin).toString();
}

function SecretReceipt({ secret: issued, kind }: { secret: string; kind?: string }) {
  const secret = shareableValue(issued, kind);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  async function copySecret() {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopied(false);
      setCopyError(true);
    }
  }

  return (
    <section className="grid gap-2 rounded-md border border-emerald-700/30 bg-emerald-50/50 p-3 text-sm dark:bg-emerald-950/20" aria-label={kind === "invitation-link" ? "Invitation link" : "One-time credential"}>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={copySecret}>{copied ? "Copied" : kind === "invitation-link" ? "Copy invitation link" : "Copy one-time value"}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setDismissed(true)}>Dismiss</Button>
      </div>
      <code className="block max-h-24 overflow-auto break-all rounded bg-background p-2 text-xs">{secret}</code>
      {copyError && <p role="status" className="text-xs text-destructive">Clipboard access failed. Select and copy the value above.</p>}
      {copied && <p role="status" className="text-xs text-emerald-800 dark:text-emerald-300">{kind === "invitation-link" ? "Copied. Send it to the invitee; it works once." : "Copied. It is shown only once."}</p>}
    </section>
  );
}
