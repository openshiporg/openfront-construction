'use client';

import { useState } from "react";
import { Copy, KeyRound, X } from "lucide-react";

import { pillClass, trackClass } from "@/features/platform/components/kit";
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
  const invitation = kind === "invitation-link";

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
    <section className="grid gap-3 rounded-[6px] border border-emerald-600/30 bg-emerald-50/60 p-3 text-sm dark:bg-emerald-950/20" aria-label={invitation ? "Invitation link" : "One-time credential"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-medium"><KeyRound className="size-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />{invitation ? "Invitation link · works once" : "Shown once"}</p>
        <span className={trackClass}>
          <button type="button" onClick={copySecret} className={pillClass("raised", "sm")}><Copy />{copied ? "Copied" : "Copy"}</button>
          <button type="button" onClick={() => setDismissed(true)} className={pillClass("quiet", "sm")}><X />Dismiss</button>
        </span>
      </div>
      <code className="block max-h-24 overflow-auto break-all rounded-[6px] bg-background p-2 font-mono text-xs">{secret}</code>
      {copyError && <p role="status" className="text-xs text-destructive">Clipboard unavailable. Select and copy the value.</p>}
    </section>
  );
}
