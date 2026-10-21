'use client';

import { FormSelect } from "@/features/forms/components/FormSelect";
import { useActionState, useState, useTransition } from "react";
import { Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getControlledDownload } from "@/features/platform/documents/actions";
import { initialCommandState } from "@/features/platform/projects/action-state";
import { useRefreshOnSuccess } from "@/features/platform/projects/use-refresh-on-success";
import { acknowledgePortalDocument, decidePortalApproval, loadPortalApprovalSnapshot, submitPortalAction } from "../actions";
import type { PortalInboxItem } from "../data";

function readable(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, character => character.toUpperCase()); }

function PortalDownload({ kind, itemId }: { kind: "document" | "drawing"; itemId: string }) {
  const [pending, startDownload] = useTransition();
  const [message, setMessage] = useState("");

  return (
    <div className="grid gap-2">
      <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => startDownload(async () => {
        setMessage("");
        try {
          const result = await getControlledDownload(kind, itemId);
          if (result.success) window.location.assign(result.url);
          else setMessage(result.error);
        } catch {
          setMessage("Download authorization is temporarily unavailable. Try again or contact the project administrator.");
        }
      })}>
        <Download className="mr-1 h-3.5 w-3.5" />{pending ? "Authorizing…" : "Download before acknowledgement"}
      </Button>
      {message && <p role="alert" className="text-xs text-destructive">{message}</p>}
    </div>
  );
}

function PortalApprovalSnapshot({ projectId, requestId, onReviewed }: { projectId: string; requestId: string; onReviewed: () => void }) {
  const [context, setContext] = useState<string[] | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, startLoad] = useTransition();

  function toggle() {
    setError("");
    if (context) {
      setOpen(value => !value);
      return;
    }
    startLoad(async () => {
      try {
        const result = await loadPortalApprovalSnapshot(projectId, requestId);
        if (result.success) {
          setContext(result.context);
          setOpen(true);
          onReviewed();
        } else {
          setError(result.error);
        }
      } catch {
        setError("Terms could not be loaded. Try again or contact the contractor.");
      }
    });
  }

  return (
    <div className="grid gap-2 rounded-md border bg-muted/20 p-3">
      <Button type="button" size="sm" variant="outline" className="w-fit" disabled={pending} onClick={toggle}>
        {pending ? "Loading terms…" : open ? "Hide terms" : "Review terms"}
      </Button>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      {open && context && <div aria-live="polite"><h4 className="text-sm font-medium">Terms captured when this request was made</h4><ul className="mt-2 grid gap-1 text-sm text-muted-foreground">{context.map((line, index) => <li key={`${requestId}:snapshot:${index}`} className="min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]">{line}</li>)}</ul></div>}
    </div>
  );
}

function PortalAction({ projectId, item }: { projectId: string; item: PortalInboxItem }) {
  const serverAction = item.action === "decide_approval" ? decidePortalApproval : item.action === "ack_document" ? acknowledgePortalDocument : submitPortalAction;
  const [state, action, pending] = useActionState(serverAction, initialCommandState);
  const [key] = useState(() => crypto.randomUUID());
  const [snapshotReviewed, setSnapshotReviewed] = useState(false);
  useRefreshOnSuccess(state.status);
  const downloadKind = item.action === "download_drawing" ? "drawing" : "document";

  if (["download_document", "download_drawing"].includes(item.action)) {
    return <PortalDownload kind={downloadKind} itemId={item.action === "download_document" ? String(item.downloadTargetId ?? item.secondaryId) : item.targetId} />;
  }

  return (
    <div className="mt-4 grid gap-4">
      {item.downloadTargetId && <PortalDownload kind="document" itemId={item.downloadTargetId} />}
      {item.action === "decide_approval" && <PortalApprovalSnapshot projectId={projectId} requestId={item.targetId} onReviewed={() => setSnapshotReviewed(true)} />}
      <form action={action} className="grid gap-3 border-t pt-4 sm:grid-cols-2">
        <input type="hidden" name="portalAction" value={item.action} /><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="targetId" value={item.targetId} /><input type="hidden" name="idempotencyKey" value={key} />
        {item.action === "submit_bid" && <><label className="grid gap-1 text-xs font-medium">Submission number<Input name="reference" required /></label><label className="grid gap-1 text-xs font-medium">Bid amount<Input name="amount" required type="number" min="0" step="0.01" /></label><label className="grid gap-1 text-xs font-medium">Quantity<Input name="quantity" type="number" min="0.0001" step="0.0001" defaultValue="1" /></label><label className="grid gap-1 text-xs font-medium">Unit<Input name="unit" defaultValue="LS" /></label></>}
        {item.action === "review_submittal" && <label className="grid gap-1 text-xs font-medium">Decision<FormSelect name="decision" required defaultValue="" className="h-10 rounded-md border bg-background px-3"><option value="">Select…</option>{["approved", "approved_as_noted", "revise_resubmit", "rejected"].map(value => <option key={value} value={value}>{readable(value)}</option>)}</FormSelect></label>}
        {item.action === "submit_claim" && <><label className="grid gap-1 text-xs font-medium">Claim number<Input name="reference" required /></label><label className="grid gap-1 text-xs font-medium">Invoice number<Input name="title" required /></label><label className="grid gap-1 text-xs font-medium">Current work amount<Input name="amount" required type="number" min="0" step="0.01" /></label><label className="grid gap-1 text-xs font-medium">Period end<Input name="dueAt" type="date" required /></label></>}
        {item.action === "submit_waiver" && <><label className="grid gap-1 text-xs font-medium">Waiver number<Input name="reference" required /></label><label className="grid gap-1 text-xs font-medium">Signer name<Input name="title" required /></label><label className="grid gap-1 text-xs font-medium">Waiver amount<Input name="amount" required type="number" min="0" step="0.01" /></label><label className="grid gap-1 text-xs font-medium">Through date<Input name="dueAt" type="date" required /></label><label className="grid gap-1 text-xs font-medium">Waiver type<FormSelect name="decision" className="h-10 rounded-md border bg-background px-3">{["conditional_progress", "unconditional_progress", "conditional_final", "unconditional_final"].map(value => <option key={value} value={value}>{readable(value)}</option>)}</FormSelect></label><label className="grid gap-1 text-xs font-medium">Evidence reference<Input name="evidenceReference" required /></label><label className="grid gap-1 text-xs font-medium sm:col-span-2">Evidence SHA-256<Input name="evidenceChecksumSha256" required minLength={64} maxLength={64} /></label></>}
        {item.action === "decide_approval" && <label className="grid gap-1 text-xs font-medium">Decision<FormSelect name="decision" required defaultValue="" className="h-10 rounded-md border bg-background px-3"><option value="">Select…</option><option value="approved">Approve</option><option value="rejected">Reject</option></FormSelect></label>}
        <label className="grid gap-1 text-xs font-medium sm:col-span-2">{item.action === "ack_document" ? "Acknowledgement" : item.action === "respond_rfi" ? "Response" : item.action === "submit_bid" ? "Clarifications and exclusions" : item.action === "review_submittal" ? "Review response" : item.action === "decide_approval" ? "Decision comment" : "Submission notes"}<Textarea name="response" required className="min-h-20" /></label>
        <Button type="submit" disabled={pending || (item.action === "decide_approval" && !snapshotReviewed)} className="sm:col-span-2">{pending ? "Submitting…" : item.action === "decide_approval" && !snapshotReviewed ? "Review terms before deciding" : readable(item.action)}</Button>
        {item.action === "decide_approval" && !snapshotReviewed && <p className="text-xs text-muted-foreground sm:col-span-2">Review the terms above before deciding.</p>}
        {state.message && <p role="status" className={`text-sm sm:col-span-2 ${state.status === "error" ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"}`}>{state.message}</p>}
      </form>
    </div>
  );
}

export function PortalInbox({ projectId, items }: { projectId: string; items: PortalInboxItem[] }) {
  return (
    <section className="border-t py-7" aria-labelledby="portal-inbox-title">
      <h2 id="portal-inbox-title" className="font-semibold">Your actions and files</h2>
      {items.length === 0 ? <div className="mt-5 border-y py-10 text-center text-sm text-muted-foreground">No assigned actions</div> : <div className="mt-5 grid gap-4">{items.map(item => <article key={item.id} className="rounded-lg border p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs text-muted-foreground">{item.kind} · {item.reference}</p><h3 className="mt-1 font-medium">{item.title}</h3>{item.context?.map((entry, index) => <p key={`${item.id}:context:${index}`} className="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{entry}</p>)}{item.dueAt && <p className="mt-1 text-xs text-muted-foreground">Due / issued {new Date(item.dueAt).toLocaleDateString()}</p>}</div><Badge variant="outline">{readable(item.status)}</Badge></div><PortalAction projectId={projectId} item={item} /></article>)}</div>}
    </section>
  );
}
