import type { WorkspaceDefinition } from "../workspaces/types";

export const billingWorkspace: WorkspaceDefinition = {
  title: "Billing",
  description: "Prepare owner and subcontractor progress claims and record their payments.",
  command: {
    title: "Record a billing operation",
    options: [
      { value: "prepareProgressClaim", label: "Prepare progress claim" },
      { value: "recordProgressPayment", label: "Record claim payment" },
    ],
    needsAmount: true,
    needsRelated: true,
  },
};
