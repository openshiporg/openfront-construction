import type { WorkspaceDefinition } from "../workspaces/types";

export const contractsWorkspace: WorkspaceDefinition = {
  title: "Contracts & changes",
  description: "Control upstream and downstream contracts, exposure, quotes, and executed changes.",
  command: {
    title: "Open potential cost or schedule exposure",
    options: [{ value: "openChangeEvent", label: "Change event" }],
  },
};
