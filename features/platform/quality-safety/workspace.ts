import type { WorkspaceDefinition } from "../workspaces/types";

export const qualitySafetyWorkspace: WorkspaceDefinition = {
  title: "Quality & safety",
  description: "Take observations, inspections, punch, and corrective work through verified closure.",
  command: {
    title: "Capture a field finding",
    options: [
      { value: "recordSafetyObservation", label: "Safety observation" },
      { value: "recordPunchItem", label: "Punch item" },
    ],
  },
};
