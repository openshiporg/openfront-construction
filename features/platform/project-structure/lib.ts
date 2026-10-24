export const costTypes = [
  { value: "labor", label: "Labor" },
  { value: "material", label: "Material" },
  { value: "subcontract", label: "Subcontract" },
  { value: "equipment", label: "Equipment" },
  { value: "other", label: "Other" },
] as const;

export const locationTypes = [
  { value: "site", label: "Site" },
  { value: "building", label: "Building" },
  { value: "floor", label: "Floor" },
  { value: "area", label: "Area" },
  { value: "room", label: "Room" },
  { value: "zone", label: "Zone" },
] as const;
