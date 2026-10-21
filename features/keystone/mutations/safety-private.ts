import { hasProjectPermission } from "../access";
import { canAccessProjectById, queryById } from "../domain/tenancy";
import { executeProjectCommand, requireCommandSession, requiredText, type CommandContext } from "./construction";

export const INCIDENT_TYPES = ["near_miss", "first_aid", "recordable_injury", "lost_time", "property_damage", "environmental", "security"] as const;

/** Classification fields for an incident type. Recordable and lost-time injuries are recordable cases. */
export function incidentClassification(value: string | null | undefined) {
  const incidentType = INCIDENT_TYPES.find(entry => entry === value);
  if (!incidentType) throw new Error("Select the incident type");
  return { incidentType, isOshaRecordable: incidentType === "recordable_injury" || incidentType === "lost_time" };
}

export type SafetyPrivateInput = {
  incidentId: string;
  incidentType?: string | null;
  injuredPartyName?: string | null;
  injuryDetails?: string | null;
  privateNotes?: string | null;
  lostTimeDays?: number | null;
  restrictedDutyDays?: number | null;
  idempotencyKey: string;
};

async function authorize(context: CommandContext, incidentId: string) {
  const session = requireCommandSession(context);
  if (session.authType === "api_key") throw new Error("Private safety details require a live safety manager session");
  const incident = await queryById(context, "SafetyIncident", incidentId, "id status incidentType project { id company { id } }");
  const projectId = incident?.project?.id;
  const companyId = incident?.project?.company?.id;
  if (!incident?.id || !projectId || !companyId ||
      !hasProjectPermission(session, companyId, projectId, "canManageSafety", true) ||
      !(await canAccessProjectById(context, session.itemId, projectId, true))) {
    throw new Error("Private safety incident not found for this safety role");
  }
  return { projectId, status: String(incident.status ?? ""), incidentType: String(incident.incidentType ?? "") };
}
function days(value: number | null | undefined, label: string) {
  if (value === null || value === undefined) return undefined;
  if (!Number.isInteger(value) || value < 0 || value > 100_000) throw new Error(`${label} must be a non-negative whole number`);
  return value;
}

export async function recordSafetyIncidentPrivateDetails(
  _root: unknown,
  { input }: { input: SafetyPrivateInput },
  context: CommandContext,
) {
  const incidentId = requiredText(input.incidentId, "Incident id", 200);
  const { projectId, status, incidentType } = await authorize(context, incidentId);
  const classification = input.incidentType ? incidentClassification(input.incidentType) : null;
  if (classification && classification.incidentType !== incidentType && status === "closed") {
    throw new Error("A closed incident cannot be reclassified");
  }
  return executeProjectCommand({
    context, operation: "recordSafetyIncidentPrivateDetails", permission: "canManageSafety", projectId,
    idempotencyKey: input.idempotencyKey, request: input, listKey: "SafetyIncident", updateId: incidentId,
    data: {},
    afterCreate: async tx => {
      if (!tx.prisma?.safetyIncident?.update) throw new Error("Private safety update client is unavailable");
      await tx.prisma.safetyIncident.update({ where: { id: incidentId }, data: {
        injuredPartyName: input.injuredPartyName?.trim() || null,
        injuryDetails: input.injuryDetails?.trim() || null,
        privateNotes: input.privateNotes?.trim() || null,
        daysAway: days(input.lostTimeDays, "Lost-time days"),
        restrictedDutyDays: days(input.restrictedDutyDays, "Restricted-duty days"),
        ...(classification ?? {}),
      } });
    },
  });
}

export async function safetyIncidentPrivateDetail(
  _root: unknown,
  { incidentId }: { incidentId: string },
  context: CommandContext,
) {
  const id = requiredText(incidentId, "Incident id", 200);
  await authorize(context, id);
  if (!context.prisma?.safetyIncident?.findUnique) throw new Error("Private safety query client is unavailable");
  const incident = await context.prisma.safetyIncident.findUnique({ where: { id }, select: {
    id: true, incidentType: true, injuredPartyName: true, injuryDetails: true, privateNotes: true, daysAway: true, restrictedDutyDays: true,
  } });
  if (!incident?.id) throw new Error("Safety incident not found");
  return {
    incidentId: String(incident.id),
    incidentType: String(incident.incidentType ?? ""),
    injuredPartyName: String(incident.injuredPartyName ?? ""),
    injuryDetails: String(incident.injuryDetails ?? ""),
    privateNotes: String(incident.privateNotes ?? ""),
    lostTimeDays: Number(incident.daysAway ?? 0),
    restrictedDutyDays: Number(incident.restrictedDutyDays ?? 0),
  };
}
