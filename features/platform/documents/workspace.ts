import type { WorkspaceDefinition } from "../workspaces/types";

export const documentsWorkspace: WorkspaceDefinition = {
  title: "Documents",
  description: "Find current drawings and documents while preserving immutable revision history.",
  command: {
    title: "Register a controlled document",
    options: [{ value: "registerDocument", label: "Document" }],
    referenceLabel: "Document number",
  },
};
