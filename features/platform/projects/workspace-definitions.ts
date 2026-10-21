import { auditWorkspace } from "../audit/workspace";
import { billingWorkspace } from "../billing/workspace";
import { contractsWorkspace } from "../contracts/workspace";
import { documentsWorkspace } from "../documents/workspace";
import { executionWorkspace } from "../execution/workspace";
import { fieldWorkspace } from "../field/workspace";
import {
  financialsWorkspace,
  overviewWorkspace,
} from "../project-controls/workspace";
import { preconstructionWorkspace } from "../preconstruction/workspace";
import { procurementWorkspace } from "../procurement/workspace";
import { qualitySafetyWorkspace } from "../quality-safety/workspace";
import { reportsWorkspace } from "../reports/workspace";
import { schedulingWorkspace } from "../scheduling/workspace";
import { teamWorkspace } from "../team/workspace";
import type { WorkspaceDefinition } from "../workspaces/types";

export const workspaceDefinitions: Record<string, WorkspaceDefinition> = {
  overview: overviewWorkspace,
  preconstruction: preconstructionWorkspace,
  financials: financialsWorkspace,
  contracts: contractsWorkspace,
  procurement: procurementWorkspace,
  execution: executionWorkspace,
  field: fieldWorkspace,
  schedule: schedulingWorkspace,
  "quality-safety": qualitySafetyWorkspace,
  documents: documentsWorkspace,
  billing: billingWorkspace,
  reports: reportsWorkspace,
  team: teamWorkspace,
  audit: auditWorkspace,
};
