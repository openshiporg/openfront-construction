import type { WorkspaceDefinition } from "../workspaces/types";

export const overviewWorkspace: WorkspaceDefinition = {
  title: "Project overview",
  description: "Current cost position, due work, and decisions that need attention.",
};

export const financialsWorkspace: WorkspaceDefinition = {
  title: "Financials",
  description: "Compare revised budget, commitments, actual cost, and pending exposure.",
  command: {
    title: "Record an authorized direct cost",
    options: [{ value: "recordDirectCost", label: "Direct cost" }],
    needsAmount: true,
    needsRelated: true,
  },
};
