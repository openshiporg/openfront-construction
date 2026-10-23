'use client';

import { FormSelect } from "@/features/forms/components/FormSelect";
import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import type { ConstructionOption } from "@/features/platform/projects/data";
import { useKeyedCommand } from "@/features/platform/projects/use-keyed-command";
import { loadPrivateIncidentDetails, recordPrivateIncidentDetails, type PrivateIncidentDetail } from "./actions";
import { DisclosurePanel, FormFeedback, fieldLabelClass, inputClass, pillClass, selectClass, textareaClass, trackClass } from "@/features/platform/components/kit";

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
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="incidentId" value={detail.incidentId} />
      <label className={fieldLabelClass}>Incident type<FormSelect name="incidentType" aria-label="Incident type" defaultValue={detail.incidentType} className={selectClass}>{INCIDENT_TYPE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</FormSelect></label>
      <label className={fieldLabelClass}>Injured party<input name="injuredPartyName" defaultValue={detail.injuredPartyName} className={inputClass} /></label>
      <label className={fieldLabelClass}>Lost-time days<input name="lostTimeDays" type="number" min="0" step="1" defaultValue={detail.lostTimeDays} className={inputClass} /></label>
      <label className={fieldLabelClass}>Restricted-duty days<input name="restrictedDutyDays" type="number" min="0" step="1" defaultValue={detail.restrictedDutyDays} className={inputClass} /></label>
      <label className={`${fieldLabelClass} md:col-span-2`}>Injury details<textarea name="injuryDetails" defaultValue={detail.injuryDetails} className={`${textareaClass} min-h-20`} /></label>
      <label className={`${fieldLabelClass} md:col-span-2`}>Private notes<textarea name="privateNotes" defaultValue={detail.privateNotes} className={`${textareaClass} min-h-20`} /></label>
      <span className={`${trackClass} w-fit md:col-span-2`}><button disabled={pending} className={pillClass("primary")}>{pending ? "Saving…" : "Save incident details"}</button></span>
      <FormFeedback status={state.status} message={state.message} className="md:col-span-2" />
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
    <DisclosurePanel title="Restricted incident details" icon={ShieldAlert}>
      <div className="grid gap-4 p-4 md:p-5">
        <label className={`${fieldLabelClass} md:max-w-md`}>Incident<FormSelect aria-label="Incident" value={incidentId} onValueChange={setIncidentId} className={selectClass}><option value="">Select…</option>{incidents.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</FormSelect></label>
        {incidentId && !ready && <p role="status" className="text-sm text-muted-foreground">Loading…</p>}
        {ready?.error && <p role="alert" className="text-sm text-destructive">{ready.error}</p>}
        {ready?.detail && <IncidentDetailForm key={ready.detail.incidentId} detail={ready.detail} />}
      </div>
    </DisclosurePanel>
  );
}
