'use client';

import { FormSelect } from "@/features/forms/components/FormSelect";
import { useActionState, useRef, useState, useTransition, type ReactNode } from "react";
import { Stamp } from "lucide-react";
import { initialCommandState, type CommandState } from "@/features/platform/projects/action-state";
import type { ConstructionOption } from "@/features/platform/projects/data";
import { useRefreshOnSuccess } from "@/features/platform/projects/use-refresh-on-success";
import { useKeyedCommand } from "@/features/platform/projects/use-keyed-command";
import { configureProjectApprovalPolicy, decideProjectApproval, loadProjectApprovalSnapshot, requestProjectApproval } from "./actions";
import { DisclosurePanel, FormFeedback, selectClass, fieldLabelClass, inputClass, pillClass, textareaClass, trackClass } from "@/features/platform/components/kit";

const targetType: Record<string, string> = {
  budgetChange: "BudgetChange", primeContract: "PrimeContract", changeOrder: "ChangeOrder",
  progressClaim: "ProgressClaim", retainageRelease: "RetainageRelease",
};
function Feedback({ state }: { state: CommandState }) {
  return <FormFeedback status={state.status} message={state.message} className="md:col-span-2" />;
}
function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground md:col-span-2">{children}</h3>;
}
function PolicyForm({ projectId, options }: { projectId: string; options: ConstructionOption[] }) {
  const { state, action, pending, idempotencyKey } = useKeyedCommand(configureProjectApprovalPolicy);
  const roles = options.filter(option => option.kind === "role");
  const policies = options.filter(option => option.kind === "approvalPolicy");
  return <form action={action} onReset={event => event.preventDefault()} className="grid gap-4 p-4 md:p-5">
    <SectionTitle>Approval policy</SectionTitle>
    <input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="idempotencyKey" value={idempotencyKey} />
    <fieldset key={idempotencyKey} disabled={pending} className="grid min-w-0 gap-4 md:grid-cols-2">
      <label className={fieldLabelClass}>Existing policy (optional)<FormSelect className={selectClass} name="policyId" defaultValue=""><option value="">Create new policy</option>{policies.map(option => <option key={option.id} value={option.id}>{option.label} — {option.detail}</option>)}</FormSelect></label>
      <label className={fieldLabelClass}>Policy name<input name="name" required minLength={3} maxLength={160} className={inputClass} /></label>
      <label className={fieldLabelClass}>Domain<FormSelect className={selectClass} name="domain" required defaultValue=""><option value="">Select…</option>{["budget_change", "prime_contract", "change_order", "progress_claim", "retainage_release"].map(domain => <option key={domain} value={domain}>{domain.replaceAll("_", " ")}</option>)}</FormSelect></label>
      <label className={fieldLabelClass}>Minimum amount<input name="minimumAmount" type="number" min="0" step="0.01" required className={inputClass} /></label>
      <label className={fieldLabelClass}>Approver role<FormSelect className={selectClass} name="approverRoleId" required defaultValue=""><option value="">Select…</option>{roles.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</FormSelect></label>
      <label className={fieldLabelClass}>State<FormSelect className={selectClass} name="isActive" defaultValue="true"><option value="true">Active</option><option value="false">Inactive</option></FormSelect></label>
    </fieldset>
    <span className={trackClass}><button disabled={pending} className={pillClass("primary")}>{pending ? "Saving…" : "Save approval policy"}</button></span><Feedback state={state} />
  </form>;
}
function RequestForm({ options }: { options: ConstructionOption[] }) {
  const [state, action, pending] = useActionState(requestProjectApproval, initialCommandState);
  useRefreshOnSuccess(state.status, state);
  const targets = options.filter(option => targetType[option.kind]);
  return <form action={action} onReset={event => event.preventDefault()} className="grid min-w-0 gap-4 p-4 md:grid-cols-2 md:p-5">
    <SectionTitle>Request approval</SectionTitle>
    <label className={fieldLabelClass}>Request for<FormSelect className={selectClass} name="target" required defaultValue="" disabled={pending}><option value="">Select…</option>{targets.map(option => <option key={`${option.kind}:${option.id}`} value={`${targetType[option.kind]}:${option.id}`}>{option.label} — {option.detail}</option>)}</FormSelect></label>
    <label className={fieldLabelClass}>Request number<input name="requestNumber" required maxLength={100} readOnly={pending} className={inputClass} /></label>
    <label className={fieldLabelClass}>Assigned project member (optional)<FormSelect className={selectClass} name="assigneeMembershipId" defaultValue="" disabled={pending}><option value="">Policy role</option>{options.filter(option => option.kind === "membership").map(option => <option key={option.id} value={option.id}>{option.label} — {option.detail}</option>)}</FormSelect></label>
    <label className={`${fieldLabelClass} md:col-span-2`}>Reason<textarea name="reason" required maxLength={500} readOnly={pending} className={`${textareaClass} min-h-20`} /></label>
    <span className={`${trackClass} w-fit md:col-span-2`}><button disabled={pending} className={pillClass("primary")}>{pending ? "Requesting…" : "Request approval"}</button></span><Feedback state={state} />
  </form>;
}
function DecisionForm({ projectId, options }: { projectId: string; options: ConstructionOption[] }) {
  const [state, action, pending] = useActionState(decideProjectApproval, initialCommandState);
  const [selected, setSelected] = useState("");
  const [selectedLabel, setSelectedLabel] = useState("");
  const [comment, setComment] = useState("");
  const [decision, setDecision] = useState("");
  const [review, setReview] = useState<{ requestId: string; terms: string[] } | null>(null);
  const [reviewError, setReviewError] = useState("");
  const [loadingReview, startReview] = useTransition();
  const ticket = useRef(0);
  const [lastSubmitted, setLastSubmitted] = useState("");
  useRefreshOnSuccess(state.status, state);
  const requests = options.filter(option => option.kind === "approvalRequest" && option.detail.startsWith("pending"));
  const available = requests.some(request => request.id === selected);
  const reviewed = review?.requestId === selected && available;
  function selectRequest(next: string) {
    ticket.current += 1;
    if (state.status === "success" && lastSubmitted === selected) { setComment(""); setDecision(""); }
    setSelected(next); setSelectedLabel(requests.find(request => request.id === next)?.label ?? "");
    setReview(null); setReviewError("");
  }
  function loadReview() {
    const requestId = selected, currentTicket = ++ticket.current;
    startReview(async () => {
      try {
        const result = await loadProjectApprovalSnapshot(projectId, requestId);
        if (ticket.current !== currentTicket) return;
        if (result.success) { setReview({ requestId, terms: result.terms }); setReviewError(""); }
        else { setReview(null); setReviewError(result.message); }
      } catch {
        if (ticket.current === currentTicket) { setReview(null); setReviewError("The review could not be loaded. Try again."); }
      }
    });
  }
  return <form action={action} onReset={event => event.preventDefault()} onSubmit={event => {
    if (!reviewed) { event.preventDefault(); setReviewError("Review the selected request before deciding."); }
    else setLastSubmitted(selected);
  }} className="grid min-w-0 gap-4 p-4 md:grid-cols-2 md:p-5">
    <SectionTitle>Decide</SectionTitle>
    <input type="hidden" name="reviewedRequestId" value={reviewed ? selected : ""} />
    <label className={fieldLabelClass}>Pending approval<FormSelect className={selectClass} name="requestId" required value={selected} onValueChange={selectRequest} disabled={pending}><option value="">Select…</option>{selected && !available && <option value={selected} disabled>{selectedLabel} — not available</option>}{requests.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</FormSelect></label>
    <span className={trackClass}><button type="button" onClick={loadReview} disabled={!available || pending || loadingReview} className={pillClass("raised")}>{loadingReview ? "Loading review…" : "Review captured terms"}</button></span>
    {review?.requestId === selected && <section aria-live="polite" className="min-w-0 rounded-lg border bg-muted/30 p-3 md:col-span-2"><h3 className="text-sm font-medium">Terms captured for this request</h3><ul className="mt-2 grid min-w-0 gap-2 text-sm">{review.terms.map((term, index) => <li key={`${selected}:${index}`} className="min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]">{term}</li>)}</ul></section>}
    {reviewError && <p role="alert" className="text-sm text-destructive md:col-span-2">{reviewError}</p>}
    <label className={fieldLabelClass}>Decision<FormSelect className={selectClass} name="decision" required value={decision} onValueChange={setDecision} disabled={pending}><option value="">Select…</option><option value="approved">Approve</option><option value="rejected">Reject</option></FormSelect></label>
    <label className={`${fieldLabelClass} md:col-span-2`}>Decision comment<textarea name="comment" required maxLength={2000} value={comment} onChange={event => setComment(event.target.value)} readOnly={pending} className={`${textareaClass} min-h-20`} /></label>
    <span className={`${trackClass} w-fit md:col-span-2`}><button disabled={pending || !reviewed} className={pillClass("primary")}>{pending ? "Recording…" : "Record approval decision"}</button></span>
    {!pending && lastSubmitted === selected && <Feedback state={state} />}
  </form>;
}
export function ApprovalPanel({ projectId, options, canConfigure }: { projectId: string; options: ConstructionOption[]; canConfigure: boolean }) {
  const hasTargets = options.some(option => targetType[option.kind]);
  const hasRequests = options.some(option => option.kind === "approvalRequest" && option.detail.startsWith("pending"));
  if (!canConfigure && !hasTargets && !hasRequests) return null;
  const pendingCount = options.filter(option => option.kind === "approvalRequest" && option.detail.startsWith("pending")).length;
  return <DisclosurePanel title="Approvals" icon={Stamp} meta={pendingCount ? `${pendingCount} pending` : undefined} defaultOpen={pendingCount > 0}><div className="divide-y">{hasRequests && <DecisionForm projectId={projectId} options={options} />}{hasTargets && <RequestForm options={options} />}{canConfigure && <PolicyForm projectId={projectId} options={options} />}</div></DisclosurePanel>;
}
