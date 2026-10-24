export const partnerTypes = [
  { value: "subcontractor", label: "Subcontractors" },
  { value: "vendor", label: "Vendors" },
  { value: "owner", label: "Owners" },
  { value: "designer", label: "Architects & engineers" },
  { value: "consultant", label: "Consultants" },
  { value: "authority", label: "Authorities" },
] as const;

export const partnerTypeLabel: Record<string, string> = {
  subcontractor: "Subcontractor", vendor: "Vendor", owner: "Owner", designer: "Architect / engineer", consultant: "Consultant", authority: "Authority",
};

export const partnerStatuses = ["prospective", "approved", "inactive", "blocked"] as const;

/** Directory states and the moves a manager can make from each. */
export const partnerTransitions: Record<string, readonly string[]> = {
  prospective: ["approved", "blocked"],
  approved: ["inactive", "blocked"],
  inactive: ["approved", "blocked"],
  blocked: ["prospective"],
};
