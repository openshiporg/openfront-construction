'use client';

import { FormSelect } from "@/features/forms/components/FormSelect";
import { useActionState, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { initialCommandState, type CommandState } from "@/features/platform/projects/action-state";
import type { ConstructionOption } from "@/features/platform/projects/data";
import { useRefreshOnSuccess } from "@/features/platform/projects/use-refresh-on-success";
import { useKeyedCommand } from "@/features/platform/projects/use-keyed-command";
import { configureProjectApprovalPolicy, decideProjectApproval, loadProjectApprovalSnapshot, requestProjectApproval } from "./actions";

const targetType: Record<string, string> = {
  budgetChange: "BudgetChange", primeContract: "PrimeContract", changeOrder: "ChangeOrder",
  progressClaim: "ProgressClaim", retainageRelease: "RetainageRelease",
};
function Feedback({ state }: { state: CommandState }) {
  return state.message ? <p role={state.status === "error" ? "alert" : "status"} className={`text-sm md:col-span-2 ${state.status === "error" ? "text-destructive" : "text-emerald-700"}`}>{state.message}</p> : null;
}
function PolicyForm({ projectId, options }: { projectId: string; options: ConstructionOption[] }) {
  const { state, action, pending, idempotencyKey } = useKeyedCommand(configureProjectApprovalPolicy);
  const roles = options.filter(option => option.kind === "role");
  const policies = options.filter(option => option.kind === "approvalPolicy");
  return <form action={action} onReset={event => event.preventDefault()} className="grid gap-3 border-t p-4 md:p-6">
    <input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="idempotencyKey" value={idempotencyKey} />
    <fieldset key={idempotencyKey} disabled={pending} className="grid min-w-0 gap-3 md:grid-cols-2">
      <label className="grid min-w-0 gap-1 text-xs font-medium">Existing policy (optional)<FormSelect name="policyId" defaultValue=""><option value="">Create new policy</option>{policies.map(option => <option key={option.id} value={option.id}>{option.label} — {option.detail}</option>)}</FormSelect></label>
      <label className="grid min-w-0 gap-1 text-xs font-medium">Policy name<Input name="name" required minLength={3} maxLength={160} /></label>
      <label className="grid min-w-0 gap-1 text-xs font-medium">Domain<FormSelect name="domain" required defaultValue=""><option value="">Select…</option>{["budget_change", "prime_contract", "change_order", "progress_claim", "retainage_release"].map(domain => <option key={domain} value={domain}>{domain.replaceAll("_", " ")}</option>)}</FormSelect></label>
      <label className="grid min-w-0 gap-1 text-xs font-medium">Minimum amount<Input name="minimumAmount" type="number" min="0" step="0.01" required /></label>
      <label className="grid min-w-0 gap-1 text-xs font-medium">Approver role<FormSelect name="approverRoleId" required defaultValue=""><option value="">Select…</option>{roles.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</FormSelect></label>
      <label className="grid min-w-0 gap-1 text-xs font-medium">State<FormSelect name="isActive" defaultValue="true"><option value="true">Active</option><option value="false">Inactive</option></FormSelect></label>
    </fieldset>
    <Button disabled={pending}>{pending ? "Saving…" : "Save approval policy"}</Button><Feedback state={state} />
  </form>;
}
function RequestForm({ options }: { options: ConstructionOption[] }) {
  const [state, action, pending] = useActionState(requestProjectApproval, initialCommandState);
  useRefreshOnSuccess(state.status, state);
  const targets = options.filter(option => targetType[option.kind]);
  return <form action={action} onReset={event => event.preventDefault()} className="grid min-w-0 gap-3 p-4 md:grid-cols-2 md:p-6">
    <label className="grid min-w-0 gap-1 text-xs font-medium">Request for<FormSelect name="target" required defaultValue="" disabled={pending}><option value="">Select…</option>{targets.map(option => <option key={`${option.kind}:${option.id}`} value={`${targetType[option.kind]}:${option.id}`}>{option.label} — {option.detail}</option>)}</FormSelect></label>
    <label className="grid min-w-0 gap-1 text-xs font-medium">Request number<Input name="requestNumber" required maxLength={100} readOnly={pending} /></label>
    <label className="grid min-w-0 gap-1 text-xs font-medium">Assigned project member (optional)<FormSelect name="assigneeMembershipId" defaultValue="" disabled={pending}><option value="">Policy role</option>{options.filter(option => option.kind === "membership").map(option => <option key={option.id} value={option.id}>{option.label} — {option.detail}</option>)}</FormSelect></label>
    <label className="grid min-w-0 gap-1 text-xs font-medium md:col-span-2">Reason<Textarea name="reason" required maxLength={500} readOnly={pending} className="min-h-20" /></label>
    <Button disabled={pending} className="md:col-span-2">{pending ? "Requesting…" : "Request approval"}</Button><Feedback state={state} />
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
  }} className="grid min-w-0 gap-3 border-t p-4 md:grid-cols-2 md:p-6">
    <input type="hidden" name="reviewedRequestId" value={reviewed ? selected : ""} />
    <label className="grid min-w-0 gap-1 text-xs font-medium">Pending approval<FormSelect name="requestId" required value={selected} onValueChange={selectRequest} disabled={pending}><option value="">Select…</option>{selected && !available && <option value={selected} disabled>{selectedLabel} — not available</option>}{requests.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</FormSelect></label>
    <Button type="button" variant="outline" onClick={loadReview} disabled={!available || pending || loadingReview}>{loadingReview ? "Loading review…" : "Review captured terms"}</Button>
    {review?.requestId === selected && <section aria-live="polite" className="min-w-0 rounded-md border p-3 md:col-span-2"><h3 className="text-sm font-medium">Terms captured for this request</h3><ul className="mt-2 grid min-w-0 gap-2 text-sm">{review.terms.map((term, index) => <li key={`${selected}:${index}`} className="min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]">{term}</li>)}</ul></section>}
    {reviewError && <p role="alert" className="text-sm text-destructive md:col-span-2">{reviewError}</p>}
    <label className="grid min-w-0 gap-1 text-xs font-medium">Decision<FormSelect name="decision" required value={decision} onValueChange={setDecision} disabled={pending}><option value="">Select…</option><option value="approved">Approve</option><option value="rejected">Reject</option></FormSelect></label>
    <label className="grid min-w-0 gap-1 text-xs font-medium md:col-span-2">Decision comment<Textarea name="comment" required maxLength={2000} value={comment} onChange={event => setComment(event.target.value)} readOnly={pending} className="min-h-20" /></label>
    <Button disabled={pending || !reviewed} className="md:col-span-2">{pending ? "Recording…" : "Record approval decision"}</Button>
    {!pending && lastSubmitted === selected && <Feedback state={state} />}
  </form>;
}
export function ApprovalPanel({ projectId, options, canConfigure }: { projectId: string; options: ConstructionOption[]; canConfigure: boolean }) {
  const hasTargets = options.some(option => targetType[option.kind]);
  const hasRequests = options.some(option => option.kind === "approvalRequest" && option.detail.startsWith("pending"));
  if (!canConfigure && !hasTargets && !hasRequests) return null;
  return <details className="min-w-0 border-y bg-muted/15 [&_button]:min-h-11 [&_input]:min-h-11 [&_select]:min-h-11"><summary className="min-h-12 cursor-pointer px-4 py-4 font-medium md:px-6">Approvals</summary>{canConfigure && <PolicyForm projectId={projectId} options={options} />}{hasTargets && <RequestForm options={options} />}{hasRequests && <DecisionForm projectId={projectId} options={options} />}</details>;
}
