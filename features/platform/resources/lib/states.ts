export type CatalogKind = "equipment" | "materials";

export const equipmentStatuses = ["available", "in_use", "out_of_service", "retired"] as const;
export const materialStatuses = ["active", "inactive", "discontinued"] as const;

export const ownershipTypes = [
  { value: "owned", label: "Owned" },
  { value: "leased", label: "Leased" },
  { value: "rented", label: "Rented" },
  { value: "partner", label: "Partner" },
] as const;

/** Catalog states and the moves allowed from each. */
export const catalogTransitions: Record<CatalogKind, Record<string, readonly string[]>> = {
  equipment: {
    available: ["in_use", "out_of_service", "retired"],
    in_use: ["available", "out_of_service"],
    out_of_service: ["available", "retired"],
    retired: ["available"],
  },
  materials: {
    active: ["inactive", "discontinued"],
    inactive: ["active", "discontinued"],
    discontinued: ["active"],
  },
};

export const transitionVerbs: Record<string, string> = {
  available: "Mark available", in_use: "Mark in use", out_of_service: "Out of service", retired: "Retire",
  active: "Activate", inactive: "Deactivate", discontinued: "Discontinue",
};
