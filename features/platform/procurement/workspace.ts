import type { WorkspaceDefinition } from "../workspaces/types";

export const procurementWorkspace: WorkspaceDefinition = {
  title: "Subcontractors & procurement",
  description: "Award a closed bid into an attributable draft commitment and track downstream procurement readiness.",
  command: {
    title: "Award a bid to a subcontract",
    options: [{ value: "awardBidSubmission", label: "Award bid submission" }],
    referenceLabel: "Commitment number",
    needsRelated: true,
  },
};
