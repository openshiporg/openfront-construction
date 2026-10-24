export const openStages = [
  { value: "qualifying", label: "Qualifying" },
  { value: "go_no_go", label: "Go / no-go" },
  { value: "estimating", label: "Estimating" },
  { value: "submitted", label: "Submitted" },
  { value: "negotiating", label: "Negotiating" },
] as const;

export const deliveryMethods = [
  "Design-bid-build",
  "Design-build",
  "CM at risk",
  "Negotiated",
  "Job order contract",
  "Integrated project delivery",
] as const;
