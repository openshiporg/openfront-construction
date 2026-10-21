import type { WorkspaceDefinition } from "../workspaces/types";

export const preconstructionWorkspace: WorkspaceDefinition = {
  title: "Preconstruction",
  description: "Move estimates and bid packages from solicitation through award.",
  command: {
    title: "Start preconstruction work",
    options: [{ value: "startBidPackage", label: "Bid package" }],
  },
};
