import type { WorkspaceDefinition } from "../workspaces/types";

export const fieldWorkspace: WorkspaceDefinition = {
  title: "Field operations",
  description: "Capture the daily record, schedule progress, labor, equipment, and material activity.",
  command: {
    title: "Start today’s field record",
    options: [{ value: "startDailyLog", label: "Daily log" }],
    referenceLabel: "Log date",
    referenceInputType: "date",
    titleLabel: "Weather / shift summary",
    hideDue: true,
  },
};
