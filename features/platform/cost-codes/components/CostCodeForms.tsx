'use client';

import { useActionState } from "react";

import { FormFeedback, fieldLabelClass, inputClass, pillClass, textareaClass, trackClass } from "@/features/platform/components/kit";
import { initialCommandState } from "@/features/platform/projects/action-state";
import { useRefreshOnSuccess } from "@/features/platform/projects/use-refresh-on-success";
import { createCostCodeAction, setCostCodeActiveAction, updateCostCodeAction } from "../actions";
import { keepUnlessSaved } from "@/features/lib/form-reset";

type Values = { id?: string; code?: string; name?: string; division?: string | null; description?: string | null };

export function CostCodeForm({ companyId, values = {} }: { companyId?: string; values?: Values }) {
  const editing = Boolean(values.id);
  const [state, action, pending] = useActionState(editing ? updateCostCodeAction : createCostCodeAction, initialCommandState);
  useRefreshOnSuccess(state.status, state);
  const formKey = !editing && state.status === "success" ? state.itemId : "form";
  return (
    <form key={formKey} action={action} onReset={keepUnlessSaved(state.status === "success")} className="grid min-w-0 gap-4 p-4 sm:grid-cols-2 md:p-5 lg:grid-cols-[8rem_minmax(0,1fr)_minmax(0,14rem)]">
      {editing ? <input type="hidden" name="id" value={values.id} /> : <input type="hidden" name="companyId" value={companyId} />}
      <label className={fieldLabelClass}>Code
        {editing
          ? <input value={values.code} readOnly className={`${inputClass} bg-muted/40 font-mono`} />
          : <input name="code" required maxLength={40} className={`${inputClass} font-mono uppercase`} />}
      </label>
      <label className={fieldLabelClass}>Name<input name="name" required maxLength={200} defaultValue={values.name ?? ""} className={inputClass} /></label>
      <label className={fieldLabelClass}>Division<input name="division" maxLength={120} defaultValue={values.division ?? ""} className={inputClass} /></label>
      <label className={`${fieldLabelClass} sm:col-span-2 lg:col-span-3`}>Description<textarea name="description" rows={2} defaultValue={values.description ?? ""} className={`${textareaClass} min-h-16`} /></label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-3">
        <span className={trackClass}><button disabled={pending} className={pillClass("primary")}>{pending ? "Saving…" : editing ? "Save changes" : "Add cost code"}</button></span>
        <FormFeedback status={state.status} message={state.message} />
      </div>
    </form>
  );
}

export function CostCodeActiveToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [state, action, pending] = useActionState(setCostCodeActiveAction, initialCommandState);
  useRefreshOnSuccess(state.status, state);
  return (
    <form action={action} onReset={keepUnlessSaved(state.status === "success")} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={String(!isActive)} />
      <span className={trackClass}><button disabled={pending} className={pillClass(isActive ? "raised" : "primary", "sm")}>{isActive ? "Deactivate" : "Reactivate"}</button></span>
      <FormFeedback status={state.status} message={state.status === "error" ? state.message : ""} />
    </form>
  );
}
