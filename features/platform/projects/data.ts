import { platformClient } from "@/features/platform/lib/platform-client";
import type { ResourceIntentScope } from "@/features/keystone/domain/resource-intent";

export type CompanySummary = {
  id: string;
  canCreateProject: boolean;
  name: string;
  status: string;
  brandName: string;
  brandMark: string;
  brandTagline: string;
  brandColor: string;
};

export type ResourceLogRegisterPage = {
  intentScope: ResourceIntentScope;
  page: number; pageSize: number; totalCount: number; totalPages: number;
  search: string; type: string; event: string;
  items: Array<{ id: string; resourceType: string; eventType: string; occurredAt: string | null; quantity: string; unit: string; resourceLabel: string }>;
};
export async function getConstructionResourceLogRegister(projectId: string, page: number, search: string, type: string, event: string) {
  const response = await platformClient<{ constructionResourceLogRegister: ResourceLogRegisterPage }>(`
    query ConstructionResourceLogRegister($projectId: ID!, $page: Int!, $search: String, $type: String, $event: String) {
      constructionResourceLogRegister(projectId: $projectId, page: $page, search: $search, type: $type, event: $event) {
        page pageSize totalCount totalPages search type event
        intentScope { version purpose actorId principalId companyId projectId currencyCode }
        items { id resourceType eventType occurredAt quantity unit resourceLabel }
      }
    }
  `, { projectId, page, search, type, event });
  if (!response.success) throw new Error(response.error);
  return response.data.constructionResourceLogRegister;
}

export type ConstructionOption = { id: string; kind: string; label: string; detail: string; parentId?: string | null; status?: string | null };
export type ConstructionOptionPage = { items: ConstructionOption[]; page: number; totalCount: number; hasMore: boolean };
export type ConstructionRecordEvidence = { kind: string; reference: string; title: string; status: string; occurredAt: string | null; recordType?: string | null; recordId?: string | null };
export type ConstructionRecordDetail = {
  id: string; recordType: string; listKey: string; reference: string; title: string; status: string;
  allowedTransitions: string[];
  fields: Array<{ label: string; value: string }>;
  evidence: ConstructionRecordEvidence[];
  history: ConstructionRecordEvidence[];
};
export type BidComparisonRow = {
  id: string; packageNumber: string; packageTitle: string; submissionNumber: string; partnerName: string;
  status: string; totalMinor: string; currencyCode: string; exclusions: string; clarifications: string;
  submittedAt: string | null; lineCount: number;
};

export type ProjectSummary = {
  id: string;
  projectNumber: string;
  name: string;
  status: string;
  audience: "internal" | "external";
  companyId: string | null;
  companyName: string;
  brandName: string;
  brandMark: string;
  brandTagline: string;
  brandColor: string;
  logoIcon: string;
  logoColor: string;
  startDate: string | null;
  completionDate: string | null;
  currencyCode: string;
  originalBudgetMinor: string | null;
  revisedBudgetMinor: string | null;
  committedMinor: string | null;
  actualCostMinor: string | null;
  openRfis: number | null;
  openSubmittals: number | null;
  openChanges: number | null;
  openSafety: number | null;
  openPunch: number | null;
  pendingClaims: number | null;
};

export type WorkItem = {
  id: string;
  kind: string;
  reference: string;
  title: string;
  status: string;
  dueAt: string | null;
  owner: string;
  amountMinor: string | null;
  allowedTransitions: string[];
};

export type Metric = { key: string; label: string; value: string; unit: string; tone: string };

export type Workspace = {
  generatedAt: string;
  tool: string;
  audience: "internal" | "external";
  availableCommands: string[];
  project: ProjectSummary;
  metrics: Metric[];
  items: WorkItem[];
  queuePage: number;
  queueTotalPages: number;
  queueGroups: Array<{ kind: string; totalCount: number }>;
};

export type ProcurementRequestRegisterPage = {
  projectId: string;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  status: string;
  items: WorkItem[];
};

export type MaterialReceiptRegisterItem = {
  id: string;
  reference: string;
  status: string;
  receivedAt: string | null;
};

export type MaterialReceiptRegisterPage = {
  projectId: string;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  status: string;
  items: MaterialReceiptRegisterItem[];
};

export type ProcurementCommitmentRegisterItem = {
  id: string;
  number: string;
  title: string;
  commitmentType: "subcontract" | "purchase_order";
  status: string;
};

export type ProcurementCommitmentRegisterPage = {
  projectId: string;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  status: string;
  items: ProcurementCommitmentRegisterItem[];
};

export type ProcurementBidPackageReference = {
  id: string;
  number: string;
};

export type ProcurementBidInvitationRegisterItem = {
  id: string;
  status: string;
  sentAt: string | null;
  respondedAt: string | null;
  bidPackage: ProcurementBidPackageReference | null;
};

export type ProcurementBidInvitationRegisterPage = {
  projectId: string;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  status: string;
  items: ProcurementBidInvitationRegisterItem[];
};

export type ProcurementLienWaiverRegisterItem = {
  id: string;
  waiverNumber: string;
  waiverType: string;
  status: string;
  throughDate: string | null;
};

export type ProcurementLienWaiverRegisterPage = {
  projectId: string;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  status: string;
  items: ProcurementLienWaiverRegisterItem[];
};

export type InspectionRegisterPage = {
  projectId: string;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  status: string;
  audience: "internal" | "external";
  items: WorkItem[];
};

export type SafetyIncidentRegisterItem = {
  id: string;
  reference: string;
  status: string;
  occurredAt: string | null;
};

export type SafetyIncidentRegisterPage = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  status: string;
  items: SafetyIncidentRegisterItem[];
};

export type SafetyObservationRegisterItem = {
  id: string;
  reference: string;
  status: string;
  observedAt: string | null;
};

export type SafetyObservationRegisterPage = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  status: string;
  items: SafetyObservationRegisterItem[];
};

export type SubmittalRegisterPage = {
  projectId: string;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  status: string;
  items: WorkItem[];
};

export type RfiRegisterItem = {
  id: string | null;
  number: string;
  title: string;
  status: string;
  dueAt: string | null;
};

export type RfiRegisterPage = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  status: string;
  audience: "internal" | "external";
  items: RfiRegisterItem[];
};

const projectFields = `
  id projectNumber name status audience companyId companyName brandName brandMark brandTagline brandColor logoIcon logoColor startDate completionDate currencyCode
  originalBudgetMinor revisedBudgetMinor committedMinor actualCostMinor
  openRfis openSubmittals openChanges openSafety openPunch pendingClaims
`;

export type ConstructionPortfolio = {
  generatedAt: string;
  canCreateProject: boolean;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  search: string;
  companies: CompanySummary[];
  projects: ProjectSummary[];
  metrics: Metric[];
};

export async function getConstructionPortfolio(page = 1, search = "") {
  const response = await platformClient<{ constructionPortfolio: ConstructionPortfolio }>(`
    query ConstructionPortfolio($page: Int, $search: String) {
      constructionPortfolio(page: $page, search: $search) {
        generatedAt canCreateProject page pageSize totalCount totalPages search
        companies { id name status canCreateProject brandName brandMark brandTagline brandColor }
        projects { ${projectFields} }
        metrics { key label value unit tone }
      }
    }
  `, { page, search: search || null });
  if (!response.success) throw new Error(response.error);
  return response.data.constructionPortfolio;
}

export async function getConstructionRecordDetail(projectId: string, recordType: string, recordId: string) {
  const response = await platformClient<{ constructionRecordDetail: ConstructionRecordDetail }>(`
    query ConstructionRecordDetail($projectId: ID!, $recordType: String!, $recordId: ID!) {
      constructionRecordDetail(projectId: $projectId, recordType: $recordType, recordId: $recordId) {
        id recordType listKey reference title status allowedTransitions
        fields { label value }
        evidence { kind reference title status occurredAt recordType recordId }
        history { kind reference title status occurredAt }
      }
    }
  `, { projectId, recordType, recordId });
  if (!response.success) throw new Error(response.error);
  return response.data.constructionRecordDetail;
}

export async function getConstructionBidComparison(projectId: string) {
  const response = await platformClient<{ constructionBidComparison: BidComparisonRow[] }>(`
    query ConstructionBidComparison($projectId: ID!) {
      constructionBidComparison(projectId: $projectId) {
        id packageNumber packageTitle submissionNumber partnerName status totalMinor currencyCode
        exclusions clarifications submittedAt lineCount
      }
    }
  `, { projectId });
  if (!response.success) throw new Error(response.error);
  return response.data.constructionBidComparison;
}

export async function getConstructionProcurementRequestRegister(projectId: string, page: number, status: string) {
  const response = await platformClient<{ constructionProcurementRequestRegister: ProcurementRequestRegisterPage }>(`
    query ConstructionProcurementRequestRegister($projectId: ID!, $page: Int!, $status: String) {
      constructionProcurementRequestRegister(projectId: $projectId, page: $page, status: $status) {
        projectId page pageSize totalCount totalPages status
        items { id kind reference title status dueAt owner amountMinor allowedTransitions }
      }
    }
  `, { projectId, page, status });
  if (!response.success) throw new Error(response.error);
  return response.data.constructionProcurementRequestRegister;
}

export async function getConstructionMaterialReceiptRegister(projectId: string, page: number, status: string) {
  const response = await platformClient<{ constructionMaterialReceiptRegister: MaterialReceiptRegisterPage }>(`
    query ConstructionMaterialReceiptRegister($projectId: ID!, $page: Int!, $status: String) {
      constructionMaterialReceiptRegister(projectId: $projectId, page: $page, status: $status) {
        projectId page pageSize totalCount totalPages status
        items { id reference status receivedAt }
      }
    }
  `, { projectId, page, status });
  if (!response.success) throw new Error(response.error);
  return response.data.constructionMaterialReceiptRegister;
}

export async function getConstructionProcurementCommitmentRegister(projectId: string, page: number, status: string) {
  const response = await platformClient<{ constructionProcurementCommitmentRegister: ProcurementCommitmentRegisterPage }>(`
    query ConstructionProcurementCommitmentRegister($projectId: ID!, $page: Int!, $status: String) {
      constructionProcurementCommitmentRegister(projectId: $projectId, page: $page, status: $status) {
        projectId page pageSize totalCount totalPages status
        items { id number title commitmentType status }
      }
    }
  `, { projectId, page, status });
  if (!response.success) throw new Error(response.error);
  return response.data.constructionProcurementCommitmentRegister;
}

export async function getConstructionProcurementBidInvitationRegister(projectId: string, page: number, status: string) {
  const response = await platformClient<{ constructionProcurementBidInvitationRegister: ProcurementBidInvitationRegisterPage }>(`
    query ConstructionProcurementBidInvitationRegister($projectId: ID!, $page: Int!, $status: String) {
      constructionProcurementBidInvitationRegister(projectId: $projectId, page: $page, status: $status) {
        projectId page pageSize totalCount totalPages status
        items { id status sentAt respondedAt bidPackage { id number } }
      }
    }
  `, { projectId, page, status });
  if (!response.success) throw new Error(response.error);
  return response.data.constructionProcurementBidInvitationRegister;
}

export async function getConstructionProcurementLienWaiverRegister(projectId: string, page: number, status: string) {
  const response = await platformClient<{ constructionProcurementLienWaiverRegister: ProcurementLienWaiverRegisterPage }>(`
    query ConstructionProcurementLienWaiverRegister($projectId: ID!, $page: Int!, $status: String) {
      constructionProcurementLienWaiverRegister(projectId: $projectId, page: $page, status: $status) {
        projectId page pageSize totalCount totalPages status
        items { id waiverNumber waiverType status throughDate }
      }
    }
  `, { projectId, page, status });
  if (!response.success) throw new Error(response.error);
  return response.data.constructionProcurementLienWaiverRegister;
}

export async function getConstructionInspectionRegister(projectId: string, page: number, status: string) {
  const response = await platformClient<{ constructionInspectionRegister: InspectionRegisterPage }>(`
    query ConstructionInspectionRegister($projectId: ID!, $page: Int!, $status: String!) {
      constructionInspectionRegister(projectId: $projectId, page: $page, status: $status) {
        projectId page pageSize totalCount totalPages status audience
        items { id kind reference title status dueAt owner amountMinor allowedTransitions }
      }
    }
  `, { projectId, page, status });
  if (!response.success) throw new Error(response.error);
  return response.data.constructionInspectionRegister;
}

export async function getConstructionSafetyIncidentRegister(projectId: string, page: number, status: string) {
  const response = await platformClient<{ constructionSafetyIncidentRegister: SafetyIncidentRegisterPage }>(`
    query ConstructionSafetyIncidentRegister($projectId: ID!, $page: Int!, $status: String!) {
      constructionSafetyIncidentRegister(projectId: $projectId, page: $page, status: $status) {
        page pageSize totalCount totalPages status
        items { id reference status occurredAt }
      }
    }
  `, { projectId, page, status });
  if (!response.success) throw new Error(response.error);
  return response.data.constructionSafetyIncidentRegister;
}

export async function getConstructionSafetyObservationRegister(projectId: string, page: number, status: string) {
  const response = await platformClient<{ constructionSafetyObservationRegister: SafetyObservationRegisterPage }>(`
    query ConstructionSafetyObservationRegister($projectId: ID!, $page: Int!, $status: String!) {
      constructionSafetyObservationRegister(projectId: $projectId, page: $page, status: $status) {
        page pageSize totalCount totalPages status
        items { id reference status observedAt }
      }
    }
  `, { projectId, page, status });
  if (!response.success) throw new Error(response.error);
  return response.data.constructionSafetyObservationRegister;
}

export async function getConstructionSubmittalRegister(projectId: string, page: number, status: string) {
  const response = await platformClient<{ constructionSubmittalRegister: SubmittalRegisterPage }>(`
    query ConstructionSubmittalRegister($projectId: ID!, $page: Int!, $status: String!) {
      constructionSubmittalRegister(projectId: $projectId, page: $page, status: $status) {
        projectId page pageSize totalCount totalPages status
        items { id kind reference title status dueAt owner amountMinor allowedTransitions }
      }
    }
  `, { projectId, page, status });
  if (!response.success) throw new Error(response.error);
  return response.data.constructionSubmittalRegister;
}

export async function getConstructionRfiRegister(projectId: string, page: number, status: string) {
  const response = await platformClient<{ constructionRfiRegister: RfiRegisterPage }>(`
    query ConstructionRfiRegister($projectId: ID!, $page: Int!, $status: String!) {
      constructionRfiRegister(projectId: $projectId, page: $page, status: $status) {
        page pageSize totalCount totalPages status audience
        items { id number title status dueAt }
      }
    }
  `, { projectId, page, status });
  if (!response.success) throw new Error(response.error);
  return response.data.constructionRfiRegister;
}

export async function getConstructionProjectOptions(projectId: string) {
  const response = await platformClient<{ constructionProjectOptions: ConstructionOption[] }>(`
    query ConstructionProjectOptions($projectId: ID!) {
      constructionProjectOptions(projectId: $projectId) { id kind label detail parentId status }
    }
  `, { projectId });
  if (!response.success) throw new Error(response.error);
  return response.data.constructionProjectOptions;
}

export async function searchConstructionProjectOptions(
  projectId: string,
  lookup: { kinds: string[]; search?: string; page?: number; ids?: string[] },
) {
  const response = await platformClient<{ constructionProjectOptionSearch: ConstructionOptionPage }>(`
    query ConstructionProjectOptionSearch($projectId: ID!, $kinds: [String!]!, $search: String, $page: Int, $ids: [ID!]) {
      constructionProjectOptionSearch(projectId: $projectId, kinds: $kinds, search: $search, page: $page, ids: $ids) {
        page totalCount hasMore
        items { id kind label detail parentId status }
      }
    }
  `, { projectId, kinds: lookup.kinds, search: lookup.search ?? null, page: lookup.page ?? 1, ids: lookup.ids ?? null });
  if (!response.success) throw new Error(response.error);
  return response.data.constructionProjectOptionSearch;
}

export async function getConstructionProjectWorkspace(projectId: string, tool: string, page = 1) {
  const response = await platformClient<{ constructionProjectWorkspace: Workspace }>(`
    query ConstructionProjectWorkspace($projectId: ID!, $tool: String!, $page: Int) {
      constructionProjectWorkspace(projectId: $projectId, tool: $tool, page: $page) {
        generatedAt tool audience availableCommands queuePage queueTotalPages
        queueGroups { kind totalCount }
        project { ${projectFields} }
        metrics { key label value unit tone }
        items { id kind reference title status dueAt owner amountMinor allowedTransitions }
      }
    }
  `, { projectId, tool, page });
  if (!response.success) throw new Error(response.error);
  return response.data.constructionProjectWorkspace;
}
