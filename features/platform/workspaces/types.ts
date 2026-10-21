import type { CommandOption } from "../projects/components/CommandPanel";

export type WorkspaceDefinition = {
  title: string;
  description: string;
  command?: {
    title: string;
    options: CommandOption[];
    referenceLabel?: string;
    referenceInputType?: "text" | "date";
    titleLabel?: string;
    hideDue?: boolean;
    needsAmount?: boolean;
    needsRelated?: boolean;
  };
};
