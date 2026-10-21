import { hasProjectPermission } from "../access";
import { resourceAuthority, resourceEvents } from "../domain/resource-activity";
import type { CommandContext } from "../mutations/construction";

type Api = {
  findMany(args: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
  count(args: Record<string, unknown>): Promise<number>;
};
export type ResourceContext = CommandContext & { query: Record<string, Api> };
const scoped = (companyId: string, projectId: string) => ({ company: { id: { equals: companyId } }, project: { id: { equals: projectId } } });

// Labels come through the reader's own access to the equipment or material.
function resourceLabel(row: Record<string, unknown>): string {
  const resource = (row.equipment ?? row.material) as Record<string, unknown> | null | undefined;
  if (!resource) return "";
  return [resource.equipmentNumber ?? resource.sku, resource.name].filter(value => typeof value === "string" && value).join(" · ");
}

export async function constructionResourceLogRegister(_root: unknown, { projectId, page = 1, search = "", type = "all", event = "all" }: { projectId: string; page?: number; search?: string | null; type?: string | null; event?: string | null }, context: ResourceContext) {
  const authority = await resourceAuthority(context, projectId);
  const selectedType = type || "all";
  const selectedEvent = event || "all";
  if (!["all", "equipment", "material"].includes(selectedType) || (selectedEvent !== "all" && !Object.values(resourceEvents).flat().includes(selectedEvent as never))) throw new Error("Unsupported resource filter");
  const term = (search || "").trim();
  if (term.length > 200) throw new Error("Resource search must be at most 200 characters");
  const where = {
    ...scoped(authority.companyId, projectId),
    ...(selectedType === "all" ? {} : { resourceType: { equals: selectedType } }),
    ...(selectedEvent === "all" ? {} : { eventType: { equals: selectedEvent } }),
    ...(term ? { notes: { contains: term, mode: "insensitive" } } : {}),
  };
  const totalCount = await context.query.ResourceLog.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / 20));
  const currentPage = Math.min(Math.max(Number.isSafeInteger(page) ? page : 1, 1), totalPages);
  const items = await context.query.ResourceLog.findMany({ where, take: 20, skip: (currentPage - 1) * 20, orderBy: [{ occurredAt: "desc" }, { id: "desc" }], query: "id resourceType eventType occurredAt quantity unit equipment { equipmentNumber name } material { sku name }" });
  const intentScope = { version: 2, purpose: "recordResourceActivity", actorId: authority.session.itemId, principalId: authority.session.authType === "api_key" ? `api:${authority.session.apiCredential?.id ?? ""}` : "human", companyId: authority.companyId, projectId, currencyCode: authority.currencyCode };
  return { intentScope, page: currentPage, pageSize: 20, totalCount, totalPages, search: term, type: selectedType, event: selectedEvent, items: items.map(row => ({ id: String(row.id), resourceType: String(row.resourceType), eventType: String(row.eventType), occurredAt: row.occurredAt instanceof Date ? row.occurredAt.toISOString() : row.occurredAt == null ? null : String(row.occurredAt), quantity: String(row.quantity ?? "0"), unit: String(row.unit ?? ""), resourceLabel: resourceLabel(row) })) };
}

export async function resourceLogDetail(projectId: string, recordId: string, context: ResourceContext) {
  const authority = await resourceAuthority(context, projectId);
  const [record] = await context.query.ResourceLog.findMany({ where: { ...scoped(authority.companyId, projectId), id: { equals: recordId } }, take: 1,
    query: "id resourceType eventType occurredAt endedAt quantity unit unitCostMinor totalCostMinor currencyCode notes createdAt equipment { id equipmentNumber name company { id } } material { id sku name company { id } }" });
  if (!record?.id) throw new Error("Resource activity not found in this project");
  const resource = (record.resourceType === "equipment" ? record.equipment : record.material) as Record<string, unknown> | null;
  const company = resource?.company as { id?: string } | null;
  const fields = ["resourceType", "eventType", "occurredAt", "endedAt", "quantity", "unit", "unitCostMinor", "totalCostMinor", "currencyCode", "notes", "createdAt"].flatMap(key => record[key] == null || record[key] === "" ? [] : [{ label: key.replace(/([A-Z])/g, " $1"), value: record[key] instanceof Date ? record[key].toISOString() : String(record[key]) }]);
  fields.push({ label: "Resource", value: resource && company?.id === authority.companyId ? `${String(resource.equipmentNumber || resource.sku || "")} · ${String(resource.name || "")}` : "Resource unavailable" });
  fields.push({ label: "Meaning", value: "Append-only field observation, not procurement acceptance, stock movement, posted cost or settled billing. No silent edit or reversal; controlled linked correction is not yet available. Legacy records remain unchanged." });
  let history: Array<{ kind: string; reference: string; title: string; status: string; occurredAt: string | null }> = [];
  if (hasProjectPermission(authority.session, authority.companyId, projectId, "canReadAudit")) {
    const actions = await context.query.AgentAction.findMany({ where: { ...scoped(authority.companyId, projectId), targetType: { equals: "ResourceLog" }, targetId: { equals: recordId } }, take: 100, orderBy: [{ requestedAt: "desc" }, { id: "desc" }], query: "id action status requestedAt requestDigest resultDigest" });
    history = actions.map(row => ({ kind: "Audit action", reference: String(row.id), title: `${String(row.action)} · request ${String(row.requestDigest)} · result ${String(row.resultDigest)}`, status: String(row.status), occurredAt: row.requestedAt ? new Date(String(row.requestedAt)).toISOString() : null }));
    if (actions.length === 100) history.push({ kind: "Projection limit", reference: "", title: "At most 100 actions are shown; older actions may be omitted.", status: "bounded", occurredAt: null });
  }
  return { id: String(record.id), recordType: "resource-log", listKey: "ResourceLog", reference: String(record.id), title: String(record.eventType), status: "recorded", fields,
    evidence: [{ kind: "Persisted field fact", reference: String(record.id), title: `${String(record.quantity)} ${String(record.unit)} · ${String(record.currencyCode)} recorded cost (minor units) ${String(record.totalCostMinor)}`, status: "recorded", occurredAt: record.occurredAt ? new Date(String(record.occurredAt)).toISOString() : null }], history, allowedTransitions: [] };
}
