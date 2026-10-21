'use client';

import { FormSelect } from "@/features/forms/components/FormSelect";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ConstructionOption } from "@/features/platform/projects/data";
import { useKeyedCommand } from "@/features/platform/projects/use-keyed-command";
import { loadPrivateIncidentDetails, recordPrivateIncidentDetails, type PrivateIncidentDetail } from "./actions";

const INCIDENT_TYPE_OPTIONS = [
  { value: "near_miss", label: "Near miss" },
  { value: "first_aid", label: "First aid" },
  { value: "recordable_injury", label: "Recordable injury" },
  { value: "lost_time", label: "Lost time" },
  { value: "property_damage", label: "Property damage" },
  { value: "environmental", label: "Environmental" },
  { value: "security", label: "Security" },
];

function IncidentDetailForm({ detail }: { detail: PrivateIncidentDetail }) {
  const { state, action, pending, idempotencyKey } = useKeyedCommand(recordPrivateIncidentDetails);
  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="incidentId" value={detail.incidentId} />
      <label className="grid gap-1 text-xs font-medium">Incident type<FormSelect name="incidentType" aria-label="Incident type" defaultValue={detail.incidentType} className="h-10 rounded-md border bg-background px-3">{INCIDENT_TYPE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</FormSelect></label>
      <label className="grid gap-1 text-xs font-medium">Injured party<Input name="injuredPartyName" defaultValue={detail.injuredPartyName} /></label>
      <label className="grid gap-1 text-xs font-medium">Lost-time days<Input name="lostTimeDays" type="number" min="0" step="1" defaultValue={detail.lostTimeDays} /></label>
      <label className="grid gap-1 text-xs font-medium">Restricted-duty days<Input name="restrictedDutyDays" type="number" min="0" step="1" defaultValue={detail.restrictedDutyDays} /></label>
      <label className="grid gap-1 text-xs font-medium md:col-span-2">Injury details<Textarea name="injuryDetails" className="min-h-20" defaultValue={detail.injuryDetails} /></label>
      <label className="grid gap-1 text-xs font-medium md:col-span-2">Private notes<Textarea name="privateNotes" className="min-h-20" defaultValue={detail.privateNotes} /></label>
      <Button disabled={pending} className="md:col-span-2">{pending ? "Saving…" : "Save incident details"}</Button>
      {state.message && <p role={state.status === "error" ? "alert" : "status"} className={`text-sm md:col-span-2 ${state.status === "error" ? "text-destructive" : "text-emerald-700"}`}>{state.message}</p>}
    </form>
  );
}

export function PrivateIncidentPanel({ options }: { options: ConstructionOption[] }) {
  const incidents = options.filter(option => option.kind === "safetyIncident");
  const [incidentId, setIncidentId] = useState("");
  const [loaded, setLoaded] = useState<{ id: string; detail?: PrivateIncidentDetail; error?: string } | null>(null);

  useEffect(() => {
    if (!incidentId) return;
    let current = true;
    loadPrivateIncidentDetails(incidentId)
      .then(result => { if (current) setLoaded({ id: incidentId, ...result }); })
      .catch(() => { if (current) setLoaded({ id: incidentId, error: "Incident details could not be loaded." }); });
    return () => { current = false; };
  }, [incidentId]);

  if (!incidents.length) return null;
  const ready = loaded?.id === incidentId ? loaded : null;
  return (
    <details className="border-y bg-muted/15">
      <summary className="min-h-12 cursor-pointer px-4 py-4 font-medium md:px-6">Restricted incident details</summary>
      <div className="grid gap-3 border-t p-4 md:p-6">
        <label className="grid gap-1 text-xs font-medium md:max-w-md">Incident<FormSelect aria-label="Incident" value={incidentId} onValueChange={setIncidentId} className="h-10 rounded-md border bg-background px-3"><option value="">Select…</option>{incidents.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</FormSelect></label>
        {incidentId && !ready && <p role="status" className="text-sm text-muted-foreground">Loading…</p>}
        {ready?.error && <p role="alert" className="text-sm text-destructive">{ready.error}</p>}
        {ready?.detail && <IncidentDetailForm key={ready.detail.incidentId} detail={ready.detail} />}
      </div>
    </details>
  );
}
