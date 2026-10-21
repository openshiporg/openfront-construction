import type { WorkspaceDefinition } from "../workspaces/types";

export const executionWorkspace: WorkspaceDefinition = {
  title: "RFIs & submittals",
  description: "Work due-date and ball-in-court queues without losing official response history.",
  command: {
    title: "Open project correspondence",
    options: [
      { value: "raiseRfi", label: "RFI" },
      { value: "registerSubmittal", label: "Submittal" },
    ],
  },
};
