'use client';

import Link from "next/link";
import { useActionState } from "react";

import { keepUnlessSaved } from "@/features/lib/form-reset";
import { FormFeedback, fieldLabelClass, inputClass, pillClass, selectClass, textareaClass, trackClass } from "@/features/platform/components/kit";
import { initialCommandState } from "@/features/platform/projects/action-state";
import { createOpportunityAction } from "../actions";
import { deliveryMethods, openStages } from "../lib";

export function OpportunityForm({ companyId, clients }: { companyId: string; clients: Array<{ id: string; name: string }> }) {
  const [state, action, pending] = useActionState(createOpportunityAction, initialCommandState);
  const saved = state.status === "success";

  return (
    <form key={saved ? state.itemId : "form"} action={action} onReset={keepUnlessSaved(saved)} className="grid min-w-0 gap-4 p-4 sm:grid-cols-2 md:p-5 xl:grid-cols-4">
      <input type="hidden" name="companyId" value={companyId} />
      <label className={fieldLabelClass}>Number<input name="number" required maxLength={80} placeholder="BD-2026-014" className={`${inputClass} font-mono`} /></label>
      <label className={`${fieldLabelClass} sm:col-span-1 xl:col-span-3`}>Name<input name="name" required maxLength={240} className={inputClass} /></label>
      <label className={fieldLabelClass}>Client
        <select name="clientId" defaultValue="" className={selectClass}>
          <option value="">None</option>
          {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>
      </label>
      <label className={fieldLabelClass}>Organization<input name="organization" maxLength={240} className={inputClass} /></label>
      <label className={fieldLabelClass}>Delivery method
        <select name="deliveryMethod" defaultValue="" className={selectClass}>
          <option value="">Not set</option>
          {deliveryMethods.map(method => <option key={method} value={method}>{method}</option>)}
        </select>
      </label>
      <label className={fieldLabelClass}>Stage
        <select name="stage" defaultValue="qualifying" className={selectClass}>
          {openStages.map(stage => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
        </select>
      </label>
      <label className={fieldLabelClass}>Estimated value (USD)<input name="estimatedValue" inputMode="decimal" placeholder="0.00" className={`${inputClass} tabular-nums`} /></label>
      <label className={fieldLabelClass}>Win probability (%)<input name="probability" type="number" min={0} max={100} step={1} placeholder="0" className={`${inputClass} tabular-nums`} /></label>
      <label className={fieldLabelClass}>Bid date<input name="targetBidDate" type="date" className={inputClass} /></label>
      <label className={fieldLabelClass}>Expected award<input name="expectedAwardDate" type="date" className={inputClass} /></label>
      <label className={fieldLabelClass}>Next action<input name="nextActionAt" type="date" className={inputClass} /></label>
      <label className={`${fieldLabelClass} sm:col-span-2 xl:col-span-3`}>Location<input name="locationSummary" maxLength={500} className={inputClass} /></label>
      <label className={`${fieldLabelClass} sm:col-span-2 xl:col-span-4`}>Notes<textarea name="notes" rows={3} className={textareaClass} /></label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2 xl:col-span-4">
        <span className={trackClass}><button disabled={pending} className={pillClass("primary")}>{pending ? "Saving…" : "Add pursuit"}</button></span>
        <FormFeedback status={state.status} message={state.message} />
        {saved && state.itemId ? <Link href={`/dashboard/platform/pipeline/${encodeURIComponent(state.itemId)}`} className="text-sm font-medium underline underline-offset-4">Open</Link> : null}
        {saved ? <Link href="/dashboard/platform/pipeline" className="text-sm font-medium underline underline-offset-4">Back to pipeline</Link> : null}
      </div>
    </form>
  );
}
