'use client';

import { useActionState } from "react";

import { FormFeedback, Track, fieldLabelClass, inputClass, pillClass, selectClass, textareaClass, trackClass } from "@/features/platform/components/kit";
import { initialCommandState } from "@/features/platform/projects/action-state";
import { useRefreshOnSuccess } from "@/features/platform/projects/use-refresh-on-success";
import { saveEquipmentAction, saveMaterialAction, transitionCatalogItemAction } from "../actions";
import { catalogTransitions, ownershipTypes, transitionVerbs, type CatalogKind } from "../lib/states";
import { keepUnlessSaved } from "@/features/lib/form-reset";

function dollars(minor: string | null | undefined) {
  if (!minor || minor === "0") return "";
  try { const value = BigInt(minor); return `${value / BigInt(100)}.${(value % BigInt(100)).toString().padStart(2, "0")}`; } catch { return ""; }
}

type EquipmentValues = { id?: string; equipmentNumber?: string; name?: string; description?: string | null; equipmentType?: string | null; make?: string | null; model?: string | null; serialNumber?: string | null; ownershipType?: string; hourlyCostMinor?: string | null };

export function EquipmentForm({ companyId, values = {} }: { companyId?: string; values?: EquipmentValues }) {
  const editing = Boolean(values.id);
  const [state, action, pending] = useActionState(saveEquipmentAction, initialCommandState);
  useRefreshOnSuccess(state.status, state);
  const formKey = !editing && state.status === "success" ? state.itemId : "form";
  return (
    <form key={formKey} action={action} onReset={keepUnlessSaved(state.status === "success")} className="grid min-w-0 gap-4 p-4 sm:grid-cols-2 md:p-5 xl:grid-cols-4">
      {editing ? <input type="hidden" name="id" value={values.id} /> : <input type="hidden" name="companyId" value={companyId} />}
      <label className={fieldLabelClass}>Unit number
        {editing ? <input value={values.equipmentNumber} readOnly className={`${inputClass} bg-muted/40 font-mono`} /> : <input name="equipmentNumber" required maxLength={100} className={`${inputClass} font-mono uppercase`} />}
      </label>
      <label className={`${fieldLabelClass} sm:col-span-1 xl:col-span-2`}>Name<input name="name" required maxLength={240} defaultValue={values.name ?? ""} className={inputClass} /></label>
      <label className={fieldLabelClass}>Ownership
        <select name="ownershipType" defaultValue={values.ownershipType ?? "owned"} className={selectClass}>{ownershipTypes.map(entry => <option key={entry.value} value={entry.value}>{entry.label}</option>)}</select>
      </label>
      <label className={fieldLabelClass}>Type<input name="equipmentType" maxLength={120} defaultValue={values.equipmentType ?? ""} className={inputClass} /></label>
      <label className={fieldLabelClass}>Make<input name="make" defaultValue={values.make ?? ""} className={inputClass} /></label>
      <label className={fieldLabelClass}>Model<input name="model" defaultValue={values.model ?? ""} className={inputClass} /></label>
      <label className={fieldLabelClass}>Serial number<input name="serialNumber" defaultValue={values.serialNumber ?? ""} className={`${inputClass} font-mono`} /></label>
      <label className={fieldLabelClass}>Hourly cost (USD)<input name="hourlyCost" inputMode="decimal" defaultValue={dollars(values.hourlyCostMinor)} className={`${inputClass} tabular-nums`} /></label>
      <label className={`${fieldLabelClass} sm:col-span-2 xl:col-span-3`}>Description<textarea name="description" rows={1} defaultValue={values.description ?? ""} className={`${textareaClass} min-h-10`} /></label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2 xl:col-span-4">
        <span className={trackClass}><button disabled={pending} className={pillClass("primary")}>{pending ? "Saving…" : editing ? "Save changes" : "Add equipment"}</button></span>
        <FormFeedback status={state.status} message={state.message} />
      </div>
    </form>
  );
}

type MaterialValues = { id?: string; sku?: string; name?: string; description?: string | null; unit?: string; manufacturer?: string | null; modelNumber?: string | null; standardCostMinor?: string | null };

export function MaterialForm({ companyId, values = {} }: { companyId?: string; values?: MaterialValues }) {
  const editing = Boolean(values.id);
  const [state, action, pending] = useActionState(saveMaterialAction, initialCommandState);
  useRefreshOnSuccess(state.status, state);
  const formKey = !editing && state.status === "success" ? state.itemId : "form";
  return (
    <form key={formKey} action={action} onReset={keepUnlessSaved(state.status === "success")} className="grid min-w-0 gap-4 p-4 sm:grid-cols-2 md:p-5 xl:grid-cols-4">
      {editing ? <input type="hidden" name="id" value={values.id} /> : <input type="hidden" name="companyId" value={companyId} />}
      <label className={fieldLabelClass}>SKU
        {editing ? <input value={values.sku} readOnly className={`${inputClass} bg-muted/40 font-mono`} /> : <input name="sku" required maxLength={100} className={`${inputClass} font-mono uppercase`} />}
      </label>
      <label className={`${fieldLabelClass} xl:col-span-2`}>Name<input name="name" required maxLength={240} defaultValue={values.name ?? ""} className={inputClass} /></label>
      <label className={fieldLabelClass}>Unit<input name="unit" required maxLength={40} placeholder="ea, lf, cy" defaultValue={values.unit ?? ""} className={inputClass} /></label>
      <label className={fieldLabelClass}>Standard cost (USD)<input name="standardCost" inputMode="decimal" defaultValue={dollars(values.standardCostMinor)} className={`${inputClass} tabular-nums`} /></label>
      <label className={fieldLabelClass}>Manufacturer<input name="manufacturer" defaultValue={values.manufacturer ?? ""} className={inputClass} /></label>
      <label className={fieldLabelClass}>Model number<input name="modelNumber" defaultValue={values.modelNumber ?? ""} className={`${inputClass} font-mono`} /></label>
      <label className={`${fieldLabelClass} sm:col-span-2 xl:col-span-1`}>Description<textarea name="description" rows={1} defaultValue={values.description ?? ""} className={`${textareaClass} min-h-10`} /></label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2 xl:col-span-4">
        <span className={trackClass}><button disabled={pending} className={pillClass("primary")}>{pending ? "Saving…" : editing ? "Save changes" : "Add material"}</button></span>
        <FormFeedback status={state.status} message={state.message} />
      </div>
    </form>
  );
}

export function CatalogStatusControl({ kind, id, status }: { kind: CatalogKind; id: string; status: string }) {
  const [state, action, pending] = useActionState(transitionCatalogItemAction, initialCommandState);
  useRefreshOnSuccess(state.status, state);
  const moves = catalogTransitions[kind][status] ?? [];
  if (!moves.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Track label="Change status">
        {moves.map(to => (
          <form key={to} action={action} onReset={keepUnlessSaved(state.status === "success")}>
            <input type="hidden" name="kind" value={kind} />
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="from" value={status} />
            <input type="hidden" name="to" value={to} />
            <button disabled={pending} className={pillClass(to === "retired" || to === "discontinued" || to === "out_of_service" ? "danger" : "raised", "sm")}>{transitionVerbs[to] ?? to}</button>
          </form>
        ))}
      </Track>
      <FormFeedback status={state.status} message={state.status === "error" ? state.message : ""} />
    </div>
  );
}
