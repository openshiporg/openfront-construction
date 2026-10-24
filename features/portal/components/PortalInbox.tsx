'use client';

import { FormSelect } from "@/features/forms/components/FormSelect";
import { useActionState, useState, useTransition } from "react";
import { Download, FileSearch } from "lucide-react";

import { getControlledDownload } from "@/features/platform/documents/actions";
import { initialCommandState } from "@/features/platform/projects/action-state";
import { useRefreshOnSuccess } from "@/features/platform/projects/use-refresh-on-success";
import { Empty, Status, readableStatus, statusDot } from "@/features/storefront/components/ui";
import { acknowledgePortalDocument, decidePortalApproval, loadPortalApprovalSnapshot, submitPortalAction } from "../actions";
import type { PortalInboxItem } from "../data";
import { keepUnlessSaved } from "@/features/lib/form-reset";

const actionLabels: Record<string, string> = {
  submit_bid: "Submit bid", respond_rfi: "Respond to RFI", review_submittal: "Review submittal", decide_approval: "Record decision",
  ack_document: "Acknowledge", submit_claim: "Submit pay application", submit_waiver: "Submit lien waiver",
  download_document: "Download", download_drawing: "Download",
};

function ErrorLine({ message }: { message: string }) {
  return <p role="alert" className="sf-error"><span aria-hidden="true" className="sf-dot sf-dot--stop" />{message}</p>;
}

function PortalDownload({ kind, itemId }: { kind: "document" | "drawing"; itemId: string }) {
  const [pending, startDownload] = useTransition();
  const [message, setMessage] = useState("");

  return (
    <div className="sf-stack" style={{ gap: "0.5rem" }}>
      <div className="sf-track">
        <button type="button" className="sf-pill sf-pill--raised sf-pill--sm" disabled={pending} onClick={() => startDownload(async () => {
          setMessage("");
          try {
            const result = await getControlledDownload(kind, itemId);
            if (result.success) window.location.assign(result.url);
            else setMessage(result.error);
          } catch {
            setMessage("Download is unavailable. Try again or contact the project administrator.");
          }
        })}>
          <Download />{pending ? "Preparing…" : "Download"}
        </button>
      </div>
      {message && <ErrorLine message={message} />}
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
    <div className="sf-stack" style={{ gap: "0.6rem" }}>
      <div className="sf-track">
        <button type="button" className="sf-pill sf-pill--raised sf-pill--sm" disabled={pending} onClick={toggle} aria-expanded={open}>
          <FileSearch />{pending ? "Loading terms…" : open ? "Hide terms" : "Review terms"}
        </button>
      </div>
      {error && <ErrorLine message={error} />}
      {open && context && <div aria-live="polite" className="sf-notice"><ul className="sf-stack" style={{ gap: "0.35rem", margin: 0, paddingLeft: "1rem" }}>{context.map((line, index) => <li key={`${requestId}:snapshot:${index}`} style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{line}</li>)}</ul></div>}
    </div>
  );
}

function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={`sf-field${wide ? " sf-span2" : ""}`}>{label}{children}</label>;
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

  const blocked = item.action === "decide_approval" && !snapshotReviewed;
  return (
    <div className="sf-stack">
      {item.downloadTargetId && <PortalDownload kind="document" itemId={item.downloadTargetId} />}
      {item.action === "decide_approval" && <PortalApprovalSnapshot projectId={projectId} requestId={item.targetId} onReviewed={() => setSnapshotReviewed(true)} />}
      <form action={action} onReset={keepUnlessSaved(state.status === "success")} className="sf-grid2" style={{ marginTop: 0, borderTop: "1px solid var(--sf-rule)", paddingTop: "1rem" }}>
        <input type="hidden" name="portalAction" value={item.action} /><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="targetId" value={item.targetId} /><input type="hidden" name="idempotencyKey" value={key} />
        {item.action === "submit_bid" && <>
          <Field label="Submission number"><input className="sf-input" name="reference" required /></Field>
          <Field label="Bid amount (USD)"><input className="sf-input sf-mono" name="amount" required type="number" min="0" step="0.01" /></Field>
          <Field label="Quantity"><input className="sf-input sf-mono" name="quantity" type="number" min="0.0001" step="0.0001" defaultValue="1" /></Field>
          <Field label="Unit"><input className="sf-input" name="unit" defaultValue="LS" /></Field>
        </>}
        {item.action === "review_submittal" && <Field label="Decision"><FormSelect name="decision" required defaultValue="" className="sf-select"><option value="">Select…</option>{["approved", "approved_as_noted", "revise_resubmit", "rejected"].map(value => <option key={value} value={value}>{readableStatus(value)}</option>)}</FormSelect></Field>}
        {item.action === "submit_claim" && <>
          <Field label="Pay application number"><input className="sf-input" name="reference" required /></Field>
          <Field label="Invoice number"><input className="sf-input" name="title" required /></Field>
          <Field label="Work this period (USD)"><input className="sf-input sf-mono" name="amount" required type="number" min="0" step="0.01" /></Field>
          <Field label="Period end"><input className="sf-input" name="dueAt" type="date" required /></Field>
        </>}
        {item.action === "submit_waiver" && <>
          <Field label="Waiver number"><input className="sf-input" name="reference" required /></Field>
          <Field label="Signer name"><input className="sf-input" name="title" required /></Field>
          <Field label="Waiver amount (USD)"><input className="sf-input sf-mono" name="amount" required type="number" min="0" step="0.01" /></Field>
          <Field label="Through date"><input className="sf-input" name="dueAt" type="date" required /></Field>
          <Field label="Waiver type"><FormSelect name="decision" className="sf-select">{["conditional_progress", "unconditional_progress", "conditional_final", "unconditional_final"].map(value => <option key={value} value={value}>{readableStatus(value)}</option>)}</FormSelect></Field>
          <Field label="Evidence reference"><input className="sf-input" name="evidenceReference" required /></Field>
          <Field label="Evidence SHA-256" wide><input className="sf-input sf-mono" name="evidenceChecksumSha256" required minLength={64} maxLength={64} /></Field>
        </>}
        {item.action === "decide_approval" && <Field label="Decision"><FormSelect name="decision" required defaultValue="" className="sf-select"><option value="">Select…</option><option value="approved">Approve</option><option value="rejected">Reject</option></FormSelect></Field>}
        <Field wide label={item.action === "ack_document" ? "Acknowledgement" : item.action === "respond_rfi" ? "Response" : item.action === "submit_bid" ? "Clarifications and exclusions" : item.action === "review_submittal" ? "Review comments" : item.action === "decide_approval" ? "Decision comment" : "Notes"}>
          <textarea className="sf-textarea" name="response" required style={{ minHeight: "5.5rem" }} />
        </Field>
        <div className="sf-span2 sf-row">
          <div className="sf-track"><button type="submit" disabled={pending || blocked} className="sf-pill sf-pill--primary">{pending ? "Submitting…" : blocked ? "Review terms first" : actionLabels[item.action] ?? readableStatus(item.action)}</button></div>
        </div>
        {state.message && (state.status === "error"
          ? <div className="sf-span2"><ErrorLine message={state.message} /></div>
          : <p role="status" className="sf-ok sf-span2"><span aria-hidden="true" className="sf-dot sf-dot--ok" />{state.message}</p>)}
      </form>
    </div>
  );
}

export function PortalInbox({ projectId, items }: { projectId: string; items: PortalInboxItem[] }) {
  return (
    <section aria-labelledby="portal-inbox-title" className="sf-stack">
      <div className="sf-panel__head" style={{ marginBottom: 0 }}>
        <h2 id="portal-inbox-title" className="sf-panel__title">Your actions <span className="sf-mono sf-small">{items.length}</span></h2>
      </div>
      {items.length === 0 ? <Empty title="Nothing waiting on you" /> : (
        <ul className="sf-stack" style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {items.map(item => (
            <li key={item.id} className="sf-panel sf-stack">
              <div className="sf-stack" style={{ gap: "0.3rem" }}>
                <span className="sf-list__ref">{item.kind} · {item.reference}{item.dueAt ? ` · ${new Date(item.dueAt).toLocaleDateString()}` : ""}</span>
                <span className="sf-list__title">{item.title}<Status tone={statusDot(item.status)}>{readableStatus(item.status)}</Status></span>
                {item.context?.map((entry, index) => <p key={`${item.id}:context:${index}`} className="sf-small" style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{entry}</p>)}
              </div>
              <PortalAction projectId={projectId} item={item} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
