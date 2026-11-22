'use client';

import { useActionState } from "react";

import { FormFeedback, fieldLabelClass, inputClass, pillClass, selectClass, textareaClass, trackClass } from "@/features/platform/components/kit";
import { OptionSelect } from "@/features/platform/components/OptionSelect";
import { PlatformDateInput } from "@/features/platform/components/PlatformDateTime";
import { initialCommandState } from "@/features/platform/projects/action-state";
import { updateLeadAction, updatePursuitAction } from "../record-actions";

const day = (value: string | null) => (value ? value.slice(0, 10) : "");
const dollars = (minor: string) => {
  const value = BigInt(minor || "0");
  return value === BigInt(0) ? "" : (Number(value) / 100).toFixed(2);
};

export type PursuitFormValues = { id: string; stage: string; probabilityBps: number; estimatedValueMinor: string; targetBidDate: string | null; nextActionAt: string | null; notes: string };

export function PursuitForm({ pursuit, stages }: { pursuit: PursuitFormValues; stages: Array<{ value: string; label: string }> }) {
  const [state, action, pending] = useActionState(updatePursuitAction, initialCommandState);
  return (
    <form action={action} className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <input type="hidden" name="id" value={pursuit.id} />
      <label className={fieldLabelClass}>Stage
        <OptionSelect name="stage" defaultValue={pursuit.stage} className={selectClass}>
          {stages.map(stage => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
        </OptionSelect>
      </label>
      <label className={fieldLabelClass}>Estimated value (USD)<input name="estimatedValue" inputMode="decimal" defaultValue={dollars(pursuit.estimatedValueMinor)} placeholder="0.00" className={`${inputClass} tabular-nums`} /></label>
      <label className={fieldLabelClass}>Win probability (%)<input name="probability" type="number" min={0} max={100} step={1} defaultValue={Math.round(pursuit.probabilityBps / 100)} className={`${inputClass} tabular-nums`} /></label>
      <label className={fieldLabelClass}>Bid date<PlatformDateInput name="targetBidDate" defaultValue={day(pursuit.targetBidDate)} /></label>
      <label className={fieldLabelClass}>Next action<PlatformDateInput name="nextActionAt" defaultValue={day(pursuit.nextActionAt)} /></label>
      <label className={`${fieldLabelClass} sm:col-span-2 xl:col-span-3`}>Notes<textarea name="notes" rows={3} defaultValue={pursuit.notes} className={textareaClass} /></label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2 xl:col-span-4">
        <span className={trackClass}><button disabled={pending} className={pillClass("primary")}>{pending ? "Saving…" : "Save pursuit"}</button></span>
        <FormFeedback status={state.status} message={state.message} />
      </div>
    </form>
  );
}

export type LeadFormValues = { id: string; status: string; organization: string; phone: string; nextActionAt: string | null; notes: string };

export function LeadForm({ lead, statuses }: { lead: LeadFormValues; statuses: Array<{ value: string; label: string }> }) {
  const [state, action, pending] = useActionState(updateLeadAction, initialCommandState);
  return (
    <form action={action} className="grid min-w-0 gap-4 sm:grid-cols-2">
      <input type="hidden" name="id" value={lead.id} />
      <label className={fieldLabelClass}>Status
        <OptionSelect name="status" defaultValue={lead.status} className={selectClass}>
          {statuses.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}
        </OptionSelect>
      </label>
      <label className={fieldLabelClass}>Next action<PlatformDateInput name="nextActionAt" defaultValue={day(lead.nextActionAt)} /></label>
      <label className={fieldLabelClass}>Organization<input name="organization" maxLength={240} defaultValue={lead.organization} className={inputClass} /></label>
      <label className={fieldLabelClass}>Phone<input name="phone" type="tel" maxLength={50} defaultValue={lead.phone} className={inputClass} /></label>
      <label className={`${fieldLabelClass} sm:col-span-2`}>Notes<textarea name="notes" rows={3} defaultValue={lead.notes} className={textareaClass} /></label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <span className={trackClass}><button disabled={pending} className={pillClass("primary")}>{pending ? "Saving…" : "Save lead"}</button></span>
        <FormFeedback status={state.status} message={state.message} />
      </div>
    </form>
  );
}
