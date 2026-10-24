'use client';

import { useActionState } from "react";

import { FormFeedback, fieldLabelClass, inputClass, pillClass, selectClass, trackClass } from "@/features/platform/components/kit";
import { initialCommandState } from "@/features/platform/projects/action-state";
import { useRefreshOnSuccess } from "@/features/platform/projects/use-refresh-on-success";
import { createBudgetCodeAction, createLocationAction, renameLocationAction, setBudgetCodeActiveAction } from "../actions";
import { costTypes, locationTypes } from "../lib";

export function BudgetCodeForm({ projectId, costCodes }: { projectId: string; costCodes: Array<{ id: string; code: string; name: string }> }) {
  const [state, action, pending] = useActionState(createBudgetCodeAction, initialCommandState);
  useRefreshOnSuccess(state.status, state);
  return (
    <form key={state.status === "success" ? state.itemId : "form"} action={action} className="grid min-w-0 gap-4 p-4 sm:grid-cols-2 md:p-5 xl:grid-cols-[8rem_minmax(0,1fr)_10rem_minmax(0,14rem)]">
      <input type="hidden" name="projectId" value={projectId} />
      <label className={fieldLabelClass}>Code<input name="code" required maxLength={80} className={`${inputClass} font-mono uppercase`} /></label>
      <label className={fieldLabelClass}>Description<input name="description" required maxLength={240} className={inputClass} /></label>
      <label className={fieldLabelClass}>Cost type
        <select name="costType" defaultValue="subcontract" className={selectClass}>{costTypes.map(entry => <option key={entry.value} value={entry.value}>{entry.label}</option>)}</select>
      </label>
      <label className={fieldLabelClass}>Company cost code
        <select name="costCodeId" required className={selectClass}>{costCodes.map(entry => <option key={entry.id} value={entry.id}>{entry.code} · {entry.name}</option>)}</select>
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2 xl:col-span-4">
        <span className={trackClass}><button disabled={pending || costCodes.length === 0} className={pillClass("primary")}>{pending ? "Saving…" : "Add budget code"}</button></span>
        <FormFeedback status={state.status} message={state.message} />
      </div>
    </form>
  );
}

export function BudgetCodeActiveToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [state, action, pending] = useActionState(setBudgetCodeActiveAction, initialCommandState);
  useRefreshOnSuccess(state.status, state);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={String(!isActive)} />
      <span className={trackClass}><button disabled={pending} className={pillClass(isActive ? "raised" : "primary", "sm")}>{isActive ? "Deactivate" : "Reactivate"}</button></span>
      <FormFeedback status={state.status} message={state.status === "error" ? state.message : ""} />
    </form>
  );
}

export function LocationForm({ projectId, parents }: { projectId: string; parents: Array<{ id: string; label: string }> }) {
  const [state, action, pending] = useActionState(createLocationAction, initialCommandState);
  useRefreshOnSuccess(state.status, state);
  return (
    <form key={state.status === "success" ? state.itemId : "form"} action={action} className="grid min-w-0 gap-4 p-4 sm:grid-cols-2 md:p-5 xl:grid-cols-[8rem_minmax(0,1fr)_9rem_minmax(0,14rem)]">
      <input type="hidden" name="projectId" value={projectId} />
      <label className={fieldLabelClass}>Code<input name="code" required maxLength={80} className={`${inputClass} font-mono uppercase`} /></label>
      <label className={fieldLabelClass}>Name<input name="name" required maxLength={200} className={inputClass} /></label>
      <label className={fieldLabelClass}>Type
        <select name="locationType" defaultValue="area" className={selectClass}>{locationTypes.map(entry => <option key={entry.value} value={entry.value}>{entry.label}</option>)}</select>
      </label>
      <label className={fieldLabelClass}>Inside
        <select name="parentId" defaultValue="" className={selectClass}>
          <option value="">Top level</option>
          {parents.map(entry => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
        </select>
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2 xl:col-span-4">
        <span className={trackClass}><button disabled={pending} className={pillClass("primary")}>{pending ? "Saving…" : "Add location"}</button></span>
        <FormFeedback status={state.status} message={state.message} />
      </div>
    </form>
  );
}

export function RenameLocationForm({ id, name }: { id: string; name: string }) {
  const [state, action, pending] = useActionState(renameLocationAction, initialCommandState);
  useRefreshOnSuccess(state.status, state);
  return (
    <form action={action} className="flex min-w-0 flex-wrap items-center gap-2 p-3">
      <input type="hidden" name="id" value={id} />
      <label className="sr-only" htmlFor={`location-${id}`}>Name</label>
      <input id={`location-${id}`} name="name" required maxLength={200} defaultValue={name} className={`${inputClass} h-9 sm:w-72`} />
      <span className={trackClass}><button disabled={pending} className={pillClass("raised", "sm")}>{pending ? "Saving…" : "Rename"}</button></span>
      <FormFeedback status={state.status} message={state.message} />
    </form>
  );
}
