'use client';

import { FormSelect } from "@/features/forms/components/FormSelect";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ConstructionOption } from "../projects/data";
import { RecordLookup } from "@/features/forms/components/RecordLookup";
import { localDateTimeToInstant, userTimeZone } from "../projects/components/workflow-fields";
import { decodeResourceIntent, encodeResourceIntent, isCompleteResourceReceipt, isCompleteResourceResolution, type ResourceIntent, type ResourceIntentReceipt, type ResourceIntentScope } from "../../keystone/domain/resource-intent";
import { executeStoredResourceIntent, intentFromResourceForm, persistResourceIntent, readResourceIntentJournal, resolveStoredResourceIntent, resourceIntentStorageKey, type ResourceIntentMode } from "./resource-intent-journal";
import { operateResourceOriginal } from "./resource-intent-actions";

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
  return <section className="border-y p-4 md:p-6" aria-labelledby="resource-record-title">
    <h2 id="resource-record-title" className="font-semibold">Record equipment or material activity</h2>
    <p className="mt-1 text-sm text-muted-foreground">Entries do not change stock, costs or billing. Each entry is kept on this device until it is saved, so it can be retried safely.</p>
    {!ready && <p role="status" className="mt-3 text-sm">Preparing…</p>}
    {ready && !request && <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={event => {
      event.preventDefault();
      try { freeze(intentFromResourceForm(new FormData(event.currentTarget), scope)); }
      catch (error) { setMessage(error instanceof Error ? error.message : "Check the entry and try again."); }
    }}>
      <input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="operation" value="recordResourceActivity" /><input type="hidden" name="idempotencyKey" value={key} />
      <label className="grid gap-1 text-sm">Resource type<FormSelect name="type" value={type} onValueChange={nextValue => setType(nextValue)} className="h-10 rounded-md border bg-background px-3"><option value="equipment">Equipment</option><option value="material">Material</option></FormSelect></label>
      <label className="grid gap-1 text-sm">{type === "equipment" ? "Equipment" : "Material"}<RecordLookup key={type} name="relatedId" projectId={projectId} kinds={[type]} initial={options.filter(option => option.kind === type)} required /></label>
      <label className="grid gap-1 text-sm">Event<FormSelect key={`${type}-event`} name="reference" required defaultValue="" className="h-10 rounded-md border bg-background px-3"><option value="">Select…</option>{(type === "equipment" ? ["equipment_use", "equipment_idle", "equipment_breakdown"] : ["material_received", "material_installed", "material_transferred", "material_wasted"]).map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</FormSelect></label>
      <label className="grid gap-1 text-sm">Occurred{timeZone ? ` (${timeZone})` : ""}<Input type="datetime-local" value={occurredLocal} onChange={event => setOccurredLocal(event.target.value)} required /><input type="hidden" name="occurredAt" value={localDateTimeToInstant(occurredLocal) ?? ""} /></label>
      <label className="grid gap-1 text-sm">Quantity<Input name="quantity" inputMode="decimal" pattern="[0-9]{1,14}(\.[0-9]{1,4})?" required placeholder="0.0000" /></label>
      <label className="grid gap-1 text-sm">Unit<Input name="unit" required maxLength={40} /></label>
      {currencyCode === "USD" ? <label className="grid gap-1 text-sm">Cost (USD, optional)<Input name="amount" inputMode="decimal" placeholder="0.00" /></label> : <p className="text-xs text-muted-foreground">Costs can be recorded for USD projects only.</p>}
      <label className="grid gap-1 text-sm sm:col-span-2">Notes<Textarea name="description" maxLength={4000} /></label>
      <Button disabled={pending} type="submit">Review entry</Button>
    </form>}
    {request && <div className="mt-4 space-y-3">
      <dl className="grid gap-2 text-sm sm:grid-cols-2">{["type", "relatedId", "reference", "quantity", "unit", "occurredAt", "amountMinor", "description"].map(field => {
        const raw = request.input[field as keyof typeof request.input];
        const shown = field === "relatedId" ? options.find(option => option.id === raw)?.label ?? String(raw ?? "—")
          : field === "occurredAt" && raw ? new Date(String(raw)).toLocaleString()
          : String(raw ?? "—").replaceAll("_", " ");
        return <div key={field}><dt className="text-muted-foreground">{fieldLabels[field]}</dt><dd className="whitespace-pre-wrap break-words">{shown}</dd></div>;
      })}</dl>
      <a href={`data:application/json;charset=utf-8,${encodeURIComponent(encodeResourceIntent(request))}`} download={`resource-activity-${request.input.idempotencyKey}.json`} className="inline-block text-sm underline">Download a copy of this entry</a>
      <div className="flex flex-wrap gap-3">
        <Button disabled={pending || !ready || resolved} onClick={() => original("retry")}>{pending ? "Saving…" : receipt ? "Retry save" : "Save activity"}</Button>
        <Button variant="outline" disabled={pending || !ready} onClick={() => original("retrieve")}>Check status</Button>
        <Button variant="outline" disabled={pending || !ready} onClick={() => original("reconcile")}>Refresh status</Button>
        {resolved && <Button variant="outline" disabled={pending || !ready} onClick={() => original("retrieve", true)}>Start a new entry</Button>}
      </div>
      {!resolved && <div className="grid gap-2"><label className="grid gap-1 text-sm">Reason for discarding this entry<Textarea value={closureReason} onChange={event => setClosureReason(event.target.value)} maxLength={500} /></label><Button variant="outline" className="justify-self-start" disabled={pending || !ready || closureReason.trim().length < 3} onClick={() => original("close")}>Discard unsaved entry</Button><p className="text-xs text-muted-foreground">Only an entry that was never saved can be discarded.</p></div>}
      {resolved && receipt && <p className="text-xs">{receipt.outcome === "closed" ? "Entry discarded" : "Activity saved"}{receipt.completedAt ? ` · ${new Date(receipt.completedAt).toLocaleString()}` : ""}</p>}
      {accepted && receipt?.itemId && <div className="space-y-2 text-xs"><Link className="text-sm underline" href={`/dashboard/platform/projects/${encodeURIComponent(projectId)}/records/resource-log/${encodeURIComponent(receipt.itemId)}`}>Open saved entry</Link></div>}
    </div>}
    {ready && !request && <label className="mt-4 grid gap-1 text-sm">Restore a downloaded entry<Input type="file" accept="application/json,.json" disabled={pending} onChange={async event => {
      const file = event.target.files?.[0]; if (!file) return;
      try { if (file.size > 32_768) throw new Error("This file is too large to be a saved entry."); freeze(decodeResourceIntent(await file.text())); }
      catch (error) { setMessage(error instanceof Error ? error.message : "This file is not a valid entry for this project."); }
    }} /></label>}
    {message && <p role="status" className="mt-3 whitespace-pre-wrap text-sm">{message}</p>}
  </section>;
}
