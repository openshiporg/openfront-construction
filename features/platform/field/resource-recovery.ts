export type ResourceRecovery = { version: 1; fields: Record<string, string> };
const fields = ["operation", "projectId", "idempotencyKey", "type", "relatedId", "reference", "quantity", "unit", "occurredAt", "description", "amount"] as const;
export function resourceRecovery(form: FormData): ResourceRecovery {
  const result = Object.fromEntries(fields.map(key => [key, String(form.get(key) ?? "").trim()]));
  if (result.operation !== "recordResourceActivity" || !result.projectId || !result.idempotencyKey) throw new Error("Invalid resource recovery request");
  // Normalize once, before sending/exporting. A replay never invents a new date/key.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(result.occurredAt)) throw new Error("Enter when the activity occurred.");
  const [year, month, day] = result.occurredAt.slice(0, 10).split("-").map(Number);
  const calendar = new Date(Date.UTC(year, month - 1, day));
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day) throw new Error("Occurred at must have a valid calendar date");
  const occurred = new Date(result.occurredAt);
  if (!Number.isFinite(occurred.getTime())) throw new Error("Occurred at must be a valid date");
  result.occurredAt = occurred.toISOString();
  return { version: 1, fields: result };
}
export function parseResourceRecovery(raw: string, projectId: string): ResourceRecovery {
  if (raw.length > 16_384) throw new Error("Recovery file is too large");
  const value = JSON.parse(raw) as ResourceRecovery;
  if (value?.version !== 1 || !value.fields || Object.keys(value.fields).length !== fields.length || fields.some(key => typeof value.fields[key] !== "string") || Object.keys(value.fields).some(key => !(fields as readonly string[]).includes(key))) throw new Error("Invalid resource recovery file");
  if (value.fields.projectId !== projectId) throw new Error("Recovery file belongs to another project");
  const form = new FormData();
  Object.entries(value.fields).forEach(([key, entry]) => form.set(key, entry));
  return resourceRecovery(form);
}
export function resourceRecoveryForm(value: ResourceRecovery): FormData {
  const form = new FormData();
  Object.entries(value.fields).forEach(([key, entry]) => form.set(key, entry));
  return form;
}
