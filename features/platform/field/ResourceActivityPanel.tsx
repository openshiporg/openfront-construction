'use client';

import { FormSelect } from "@/features/forms/components/FormSelect";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { Download, Forklift } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ConstructionOption } from "../projects/data";
import { RecordLookup } from "@/features/forms/components/RecordLookup";
import { localDateTimeToInstant, userTimeZone } from "../projects/components/workflow-fields";
import { decodeResourceIntent, encodeResourceIntent, isCompleteResourceReceipt, isCompleteResourceResolution, type ResourceIntent, type ResourceIntentReceipt, type ResourceIntentScope } from "../../keystone/domain/resource-intent";
import { executeStoredResourceIntent, intentFromResourceForm, persistResourceIntent, readResourceIntentJournal, resolveStoredResourceIntent, resourceIntentStorageKey, type ResourceIntentMode } from "./resource-intent-journal";
import { operateResourceOriginal } from "./resource-intent-actions";
import { Panel, StatusDot, fieldLabelClass, inputClass, pillClass, readable, selectClass, textareaClass, trackClass } from "@/features/platform/components/kit";

const subscribeToNothing = () => () => {};
const fieldLabels: Record<string, string> = { type: "Resource type", relatedId: "Resource", reference: "Event", quantity: "Quantity", unit: "Unit", occurredAt: "Occurred", amountMinor: "Cost (minor units)", description: "Notes" };

export function ResourceActivityPanel({ projectId, options, currencyCode, scope }: { projectId: string; options: ConstructionOption[]; currencyCode: string; scope: ResourceIntentScope }) {
  const router = useRouter();
  const [key, setKey] = useState(() => crypto.randomUUID());
  const [type, setType] = useState("equipment");
  const [request, setRequest] = useState<ResourceIntent | null>(null);
  const [receipt, setReceipt] = useState<ResourceIntentReceipt | null>(null);
  const [observed, setObserved] = useState(false);
  const [message, setMessage] = useState("");
  const [closureReason, setClosureReason] = useState("");
  const [occurredLocal, setOccurredLocal] = useState("");
  const timeZone = useSyncExternalStore(subscribeToNothing, userTimeZone, () => "");
  const [ready, setReady] = useState(false);
  const [pending, startTransition] = useTransition();
  const storageKey = resourceIntentStorageKey(scope);
  useEffect(() => {
    function restore() {
      try {
        const saved = readResourceIntentJournal(localStorage, scope);
        setRequest(saved ? decodeResourceIntent(saved.intentJson) : null);
        setReceipt(saved?.receipt ?? null);
        setObserved(false); // Saved/client JSON is not current server authority.
        setReady(true);
      } catch { setReady(false); setMessage("This browser cannot save entries on this device, so activity cannot be recorded here. Try another browser."); }
    }
    restore();
    function changed(event: StorageEvent) { if (event.key === storageKey) restore(); }
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, [scope, storageKey]);
  async function locked<T>(callback: () => Promise<T>): Promise<T> {
    if (!navigator.locks) throw new Error("This browser cannot save entries safely. Nothing was sent.");
    return navigator.locks.request(storageKey, callback);
  }
  function original(mode: ResourceIntentMode, resolve = false) {
    startTransition(async () => {
      try {
        const execute = mode === "close" ? (operation: ResourceIntentMode, packet: string) => operateResourceOriginal(operation, packet, closureReason) : operateResourceOriginal;
        const result = await locked(async () => resolve
          ? resolveStoredResourceIntent(localStorage, scope, operateResourceOriginal)
          : executeStoredResourceIntent(localStorage, scope, mode, execute));
        setReceipt(result); setObserved(result.outcome === "accepted" || result.outcome === "closed"); setMessage(result.message);
        if (resolve) { setRequest(null); setReceipt(null); setObserved(false); setKey(crypto.randomUUID()); }
        if (result.outcome === "accepted" && mode !== "retrieve") router.refresh();
      } catch (error) { setMessage(error instanceof Error ? error.message : "No response was received. Retry to send the same entry again."); }
    });
  }
  function freeze(intent: ResourceIntent) {
    startTransition(async () => {
      try {
        const restored = await locked(async () => persistResourceIntent(localStorage, scope, intent));
        setRequest(restored); setReceipt(null); setObserved(false); setMessage("Entry ready. Review it, then save.");
      } catch (error) { setMessage(error instanceof Error ? error.message : "The entry could not be prepared. Nothing was sent."); }
    });
  }
  const accepted = Boolean(observed && request && receipt && isCompleteResourceReceipt(request, receipt));
  const resolved = Boolean(observed && request && receipt && isCompleteResourceResolution(request, receipt));
  return <Panel id="resource-record" title="Log equipment or material" icon={Forklift} meta="Saved on this device until sent">
    {!ready && <p role="status" className="text-sm text-muted-foreground">Preparing…</p>}
    {ready && !request && <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" onSubmit={event => {
      event.preventDefault();
      try { freeze(intentFromResourceForm(new FormData(event.currentTarget), scope)); }
      catch (error) { setMessage(error instanceof Error ? error.message : "Check the entry and try again."); }
    }}>
      <input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="operation" value="recordResourceActivity" /><input type="hidden" name="idempotencyKey" value={key} />
      <label className={fieldLabelClass}>Resource type<FormSelect name="type" value={type} onValueChange={nextValue => setType(nextValue)} className={selectClass}><option value="equipment">Equipment</option><option value="material">Material</option></FormSelect></label>
      <label className={fieldLabelClass}>{type === "equipment" ? "Equipment" : "Material"}<RecordLookup key={type} name="relatedId" projectId={projectId} kinds={[type]} initial={options.filter(option => option.kind === type)} required /></label>
      <label className={fieldLabelClass}>Event<FormSelect key={`${type}-event`} name="reference" required defaultValue="" className={selectClass}><option value="">Select…</option>{(type === "equipment" ? ["equipment_use", "equipment_idle", "equipment_breakdown"] : ["material_received", "material_installed", "material_transferred", "material_wasted"]).map(value => <option key={value} value={value}>{readable(value)}</option>)}</FormSelect></label>
      <label className={fieldLabelClass}>Occurred{timeZone ? ` (${timeZone})` : ""}<input type="datetime-local" value={occurredLocal} onChange={event => setOccurredLocal(event.target.value)} required className={inputClass} /><input type="hidden" name="occurredAt" value={localDateTimeToInstant(occurredLocal) ?? ""} /></label>
      <label className={fieldLabelClass}>Quantity<input name="quantity" inputMode="decimal" pattern="[0-9]{1,14}(\.[0-9]{1,4})?" required placeholder="0.0000" className={`${inputClass} tabular-nums`} /></label>
      <label className={fieldLabelClass}>Unit<input name="unit" required maxLength={40} className={inputClass} /></label>
      {currencyCode === "USD" ? <label className={fieldLabelClass}>Cost (USD, optional)<input name="amount" inputMode="decimal" placeholder="0.00" className={inputClass} /></label> : <p className="text-xs text-muted-foreground">Costs can be recorded for USD projects only.</p>}
      <label className={`${fieldLabelClass} sm:col-span-2 lg:col-span-4`}>Notes<textarea name="description" maxLength={4000} className={textareaClass} /></label>
      <span className={`${trackClass} sm:col-span-2 lg:col-span-4`}><button disabled={pending} type="submit" className={pillClass("primary")}>Review entry</button></span>
    </form>}
    {request && <div className="grid gap-4">
      <dl className="grid gap-3 rounded-[6px] border bg-muted/30 p-3 text-sm sm:grid-cols-2 lg:grid-cols-4">{["type", "relatedId", "reference", "quantity", "unit", "occurredAt", "amountMinor", "description"].map(field => {
        const raw = request.input[field as keyof typeof request.input];
        const shown = field === "relatedId" ? options.find(option => option.id === raw)?.label ?? String(raw ?? "—")
          : field === "occurredAt" && raw ? new Date(String(raw)).toLocaleString()
          : String(raw ?? "—").replaceAll("_", " ");
        return <div key={field} className="min-w-0"><dt className="text-xs text-muted-foreground">{fieldLabels[field]}</dt><dd className="mt-0.5 whitespace-pre-wrap break-words font-medium">{shown}</dd></div>;
      })}</dl>
      <a href={`data:application/json;charset=utf-8,${encodeURIComponent(encodeResourceIntent(request))}`} download={`resource-activity-${request.input.idempotencyKey}.json`} className="inline-flex w-fit items-center gap-1.5 text-sm underline underline-offset-4"><Download className="size-3.5" aria-hidden="true" />Download entry</a>
      <div className={trackClass}>
        <button disabled={pending || !ready || resolved} onClick={() => original("retry")} className={pillClass("primary")}>{pending ? "Saving…" : receipt ? "Retry save" : "Save activity"}</button>
        <button disabled={pending || !ready} onClick={() => original("retrieve")} className={pillClass("quiet")}>Check status</button>
        <button disabled={pending || !ready} onClick={() => original("reconcile")} className={pillClass("quiet")}>Refresh</button>
        {resolved && <button disabled={pending || !ready} onClick={() => original("retrieve", true)} className={pillClass("raised")}>New entry</button>}
      </div>
      {!resolved && <div className="grid gap-2"><label className={fieldLabelClass}>Discard reason<textarea value={closureReason} onChange={event => setClosureReason(event.target.value)} maxLength={500} className={textareaClass} /></label><span className={`${trackClass} w-fit justify-self-start`}><button disabled={pending || !ready || closureReason.trim().length < 3} onClick={() => original("close")} className={pillClass("danger")}>Discard unsaved entry</button></span></div>}
      {resolved && receipt && <p className="flex items-center gap-2 text-xs"><StatusDot tone={receipt.outcome === "closed" ? "zinc" : "emerald"} />{receipt.outcome === "closed" ? "Entry discarded" : "Activity saved"}{receipt.completedAt ? ` · ${new Date(receipt.completedAt).toLocaleString()}` : ""}</p>}
      {accepted && receipt?.itemId && <div className="space-y-2 text-xs"><Link className="text-sm underline" href={`/dashboard/platform/projects/${encodeURIComponent(projectId)}/records/resource-log/${encodeURIComponent(receipt.itemId)}`}>Open saved entry</Link></div>}
    </div>}
    {ready && !request && <label className={`${fieldLabelClass} mt-4 max-w-sm`}>Restore a downloaded entry<input type="file" accept="application/json,.json" disabled={pending} className={`${inputClass} h-auto min-h-10 py-2 file:mr-3 file:rounded-full file:border-0 file:bg-muted file:px-3 file:py-1 file:text-xs file:font-medium`} onChange={async event => {
      const file = event.target.files?.[0]; if (!file) return;
      try { if (file.size > 32_768) throw new Error("This file is too large to be a saved entry."); freeze(decodeResourceIntent(await file.text())); }
      catch (error) { setMessage(error instanceof Error ? error.message : "This file is not a valid entry for this project."); }
    }} /></label>}
    {message && <p role="status" className="mt-3 whitespace-pre-wrap text-sm">{message}</p>}
  </Panel>;
}
