export const resourceEvents = {
  equipment: ["equipment_use", "equipment_idle", "equipment_breakdown"],
  material: ["material_received", "material_installed", "material_transferred", "material_wasted"],
} as const;

export function validateResourceOccurrence(value: unknown): Date {
  if (typeof value !== "string" || value.length > 80 || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(value)) throw new Error("Occurred at requires an ISO date/time with timezone");
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const calendar = new Date(Date.UTC(year, month - 1, day));
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day) throw new Error("Occurred at must have a valid calendar date");
  const occurred = new Date(value);
  if (!Number.isFinite(occurred.getTime())) throw new Error("Occurred at must be a valid date");
  return occurred;
}

export function validateResourceFact(type: unknown, event: unknown, quantity: unknown, unit: unknown) {
  if (type !== "equipment" && type !== "material") throw new Error("Resource type must be equipment or material");
  if (!(resourceEvents[type] as readonly unknown[]).includes(event)) throw new Error("Resource event does not match the selected resource type");
  if (typeof quantity !== "string" || !/^\d{1,14}(\.\d{1,4})?$/.test(quantity)) throw new Error("Quantity must be non-negative with at most 14 integer and 4 decimal digits");
  if (typeof unit !== "string" || !unit.trim() || unit.trim().length > 40) throw new Error("Resource unit is required (at most 40 characters)");
  return { resourceType: type, eventType: String(event), quantity, unit: unit.trim() };
}
