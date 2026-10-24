'use server';

import { randomUUID } from "node:crypto";
import { platformClient } from "@/features/platform/lib/platform-client";
import type { CommandState } from "@/features/platform/projects/action-state";

function value(data: FormData, key: string) { return String(data.get(key) ?? "").trim(); }
export async function recordPrivateIncidentDetails(_previous: CommandState, formData: FormData): Promise<CommandState> {
  const response = await platformClient<{ recordSafetyIncidentPrivateDetails: { replayed: boolean } }>(`
    mutation RecordPrivateSafetyDetails($input: SafetyIncidentPrivateInput!) {
      recordSafetyIncidentPrivateDetails(input: $input) { success operation itemId actionId replayed }
    }
  `, { input: {
    incidentId: value(formData, "incidentId"), incidentType: value(formData, "incidentType") || null, injuredPartyName: value(formData, "injuredPartyName") || null,
    injuryDetails: value(formData, "injuryDetails") || null, privateNotes: value(formData, "privateNotes") || null,
    lostTimeDays: Number(value(formData, "lostTimeDays") || 0), restrictedDutyDays: Number(value(formData, "restrictedDutyDays") || 0),
    idempotencyKey: value(formData, "idempotencyKey") || randomUUID(),
  } });
  return response.success ? { status: "success", message: "Incident details saved." } : { status: "error", message: response.error };
}

export type PrivateIncidentDetail = {
  incidentId: string;
  incidentType: string;
  injuredPartyName: string;
  injuryDetails: string;
  privateNotes: string;
  lostTimeDays: number;
  restrictedDutyDays: number;
};

export async function loadPrivateIncidentDetails(incidentId: string): Promise<{ detail?: PrivateIncidentDetail; error?: string }> {
  const response = await platformClient<{ safetyIncidentPrivateDetail: PrivateIncidentDetail }>(`
    query SafetyIncidentPrivateDetail($incidentId: ID!) {
      safetyIncidentPrivateDetail(incidentId: $incidentId) { incidentId incidentType injuredPartyName injuryDetails privateNotes lostTimeDays restrictedDutyDays }
    }
  `, { incidentId });
  return response.success ? { detail: response.data.safetyIncidentPrivateDetail } : { error: response.error };
}
