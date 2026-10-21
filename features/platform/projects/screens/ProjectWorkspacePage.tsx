import { notFound } from "next/navigation";

import { ProjectWorkspace } from "../components/ProjectWorkspace";
import { getConstructionResourceLogRegister } from "../data";
import { getConstructionBidComparison, getConstructionInspectionRegister, getConstructionMaterialReceiptRegister, getConstructionProjectOptions, getConstructionProcurementRequestRegister, getConstructionProcurementCommitmentRegister, getConstructionProcurementBidInvitationRegister, getConstructionProcurementLienWaiverRegister, getConstructionProjectWorkspace, getConstructionRfiRegister, getConstructionSafetyIncidentRegister, getConstructionSafetyObservationRegister, getConstructionSubmittalRegister } from "../data";

async function loadWorkspace(projectId: string, tool: string, queuePage: number) {
  try {
    return await getConstructionProjectWorkspace(projectId, tool, queuePage);
  } catch (error) {
    if (error instanceof Error && /not found/i.test(error.message)) notFound();
    throw error;
  }
}

async function loadMaterialReceiptRegister(projectId: string, page: number, status: string) {
  try {
    return await getConstructionMaterialReceiptRegister(projectId, page, status);
  } catch (error) {
    if (error instanceof Error && /not found/i.test(error.message)) notFound();
    throw error;
  }
}

async function loadProcurementCommitmentRegister(projectId: string, page: number, status: string) {
  try {
    return await getConstructionProcurementCommitmentRegister(projectId, page, status);
  } catch (error) {
    if (error instanceof Error && /not found/i.test(error.message)) notFound();
    throw error;
  }
}

async function loadProcurementBidInvitationRegister(projectId: string, page: number, status: string) {
  try {
    return await getConstructionProcurementBidInvitationRegister(projectId, page, status);
  } catch (error) {
    if (error instanceof Error && /not found/i.test(error.message)) notFound();
    throw error;
  }
}

async function loadProcurementLienWaiverRegister(projectId: string, page: number, status: string) {
  try {
    return await getConstructionProcurementLienWaiverRegister(projectId, page, status);
  } catch (error) {
    if (error instanceof Error && /lien waiver register not found/i.test(error.message)) return undefined;
    throw error;
  }
}

async function loadInspectionRegister(projectId: string, page: number, status: string) {
  try {
    return await getConstructionInspectionRegister(projectId, page, status);
  } catch (error) {
    if (error instanceof Error && /not found/i.test(error.message)) notFound();
    throw error;
  }
}

async function loadSafetyIncidentRegister(projectId: string, page: number, status: string) {
  try {
    return await getConstructionSafetyIncidentRegister(projectId, page, status);
  } catch (error) {
    if (error instanceof Error && /not found/i.test(error.message)) notFound();
    throw error;
  }
}

async function loadSafetyObservationRegister(projectId: string, page: number, status: string) {
  try {
    return await getConstructionSafetyObservationRegister(projectId, page, status);
  } catch (error) {
    if (error instanceof Error && /not found/i.test(error.message)) notFound();
    throw error;
  }
}

async function loadRfiRegister(projectId: string, page: number, status: string) {
  try {
    return await getConstructionRfiRegister(projectId, page, status);
  } catch (error) {
    if (error instanceof Error && /not found/i.test(error.message)) notFound();
    throw error;
  }
}

async function loadSubmittalRegister(projectId: string, page: number, status: string) {
  try {
    return await getConstructionSubmittalRegister(projectId, page, status);
  } catch (error) {
    if (error instanceof Error && /not found/i.test(error.message)) notFound();
    throw error;
  }
}

async function loadProcurementRegister(projectId: string, page: number, status: string) {
  try {
    return await getConstructionProcurementRequestRegister(projectId, page, status);
  } catch (error) {
    if (error instanceof Error && /not found/i.test(error.message)) notFound();
    throw error;
  }
}

type WorkspaceSearchParams = Record<string, string | string[] | undefined>;
const procurementStatuses = new Set(["all", "draft", "submitted", "approved", "ordered", "partially_received", "received", "closed", "rejected", "cancelled"]);
const materialReceiptStatuses = new Set(["all", "recorded", "accepted_with_exceptions", "rejected", "voided"]);
const commitmentStatuses = new Set(["all", "draft", "out_for_signature", "executed", "complete", "closed", "cancelled", "terminated"]);
const bidInvitationStatuses = new Set(["all", "draft", "invited", "viewed", "intent_to_bid", "declined", "submitted"]);
const lienWaiverStatuses = new Set(["all", "requested", "received", "accepted", "rejected", "expired"]);
const inspectionStatuses = new Set(["all", "scheduled", "in_progress", "passed", "failed", "closed", "cancelled"]);
const incidentStatuses = new Set(["all", "reported", "investigating", "corrective_action", "closed"]);
const observationStatuses = new Set(["all", "open", "assigned", "resolved", "closed"]);
const submittalStatuses = new Set(["all", "draft", "submitted", "under_review", "approved", "revise_resubmit", "rejected", "closed", "voided"]);
const rfiStatuses = new Set(["all", "draft", "open", "answered", "closed", "voided"]);

function firstSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | string[] | undefined) {
  const page = Number(firstSearchValue(value) ?? "1");
  return Number.isSafeInteger(page) && page >= 1 && page <= 2_147_483_647 ? page : 1;
}

export async function ProjectWorkspacePage({
  projectId,
  tool = "overview",
  searchParams = {},
}: {
  projectId: string;
  tool?: string;
  searchParams?: WorkspaceSearchParams;
}) {
  const requestedStatus = firstSearchValue(searchParams.status) ?? "all";
  const procurementPage = parsePage(searchParams.page);
  const procurementStatus = procurementStatuses.has(requestedStatus) ? requestedStatus : "all";
  const requestedMaterialReceiptStatus = firstSearchValue(searchParams.materialReceiptStatus) ?? "all";
  const materialReceiptPage = parsePage(searchParams.materialReceiptPage);
  const materialReceiptStatus = materialReceiptStatuses.has(requestedMaterialReceiptStatus) ? requestedMaterialReceiptStatus : "all";
  const commitmentPage = parsePage(searchParams.commitmentPage);
  const requestedCommitmentStatus = firstSearchValue(searchParams.commitmentStatus) ?? "all";
  const commitmentStatus = commitmentStatuses.has(requestedCommitmentStatus) ? requestedCommitmentStatus : "all";
  const bidInvitationPage = parsePage(searchParams.bidInvitationPage);
  const requestedBidInvitationStatus = firstSearchValue(searchParams.bidInvitationStatus) ?? "all";
  const bidInvitationStatus = bidInvitationStatuses.has(requestedBidInvitationStatus) ? requestedBidInvitationStatus : "all";
  const lienWaiverPage = parsePage(searchParams.lienWaiverPage);
  const requestedLienWaiverStatus = firstSearchValue(searchParams.lienWaiverStatus) ?? "all";
  const lienWaiverStatus = lienWaiverStatuses.has(requestedLienWaiverStatus) ? requestedLienWaiverStatus : "all";
  const inspectionPage = parsePage(searchParams.page);
  const inspectionStatus = inspectionStatuses.has(requestedStatus) ? requestedStatus : "all";
  const requestedIncidentStatus = firstSearchValue(searchParams.incidentStatus) ?? "all";
  const incidentPage = parsePage(searchParams.incidentPage);
  const incidentStatus = incidentStatuses.has(requestedIncidentStatus) ? requestedIncidentStatus : "all";
  const requestedObservationStatus = firstSearchValue(searchParams.observationStatus) ?? "all";
  const observationPage = parsePage(searchParams.observationPage);
  const observationStatus = observationStatuses.has(requestedObservationStatus) ? requestedObservationStatus : "all";
  const requestedSubmittalStatus = firstSearchValue(searchParams.submittalStatus ?? searchParams.status) ?? "all";
  const submittalPage = parsePage(searchParams.submittalPage ?? searchParams.page);
  const submittalStatus = submittalStatuses.has(requestedSubmittalStatus) ? requestedSubmittalStatus : "all";
  const requestedRfiStatus = firstSearchValue(searchParams.rfiStatus) ?? "all";
  const rfiPage = parsePage(searchParams.rfiPage);
  const rfiStatus = rfiStatuses.has(requestedRfiStatus) ? requestedRfiStatus : "all";
  const workspace = await loadWorkspace(projectId, tool, parsePage(searchParams.queuePage));
  let resourceRegister;
  let resourceUnavailable = false;
  if (tool === "field" && workspace.audience === "internal") {
    try {
      resourceRegister = await getConstructionResourceLogRegister(projectId, parsePage(searchParams.resourcePage), firstSearchValue(searchParams.resourceSearch) ?? "", firstSearchValue(searchParams.resourceType) ?? "all", firstSearchValue(searchParams.resourceEvent) ?? "all");
    } catch (error) {
      if (error instanceof Error && /Resource activity not found for this project role/i.test(error.message)) resourceUnavailable = true;
      else throw error;
    }
  }
  const externalExecution = tool === "execution" && workspace.audience === "external";
  const [options, bidComparison, procurementRegister, materialReceiptRegister, procurementCommitmentRegister, procurementBidInvitationRegister, procurementLienWaiverRegister, inspectionRegister, incidentRegister, observationRegister, submittalRegister, rfiRegister] = await Promise.all([
    externalExecution ? Promise.resolve([]) : getConstructionProjectOptions(projectId),
    tool === "preconstruction" ? getConstructionBidComparison(projectId) : Promise.resolve([]),
    tool === "procurement"
      ? loadProcurementRegister(projectId, procurementPage, procurementStatus)
      : Promise.resolve(undefined),
    tool === "procurement" && workspace.audience === "internal"
      ? loadMaterialReceiptRegister(projectId, materialReceiptPage, materialReceiptStatus)
      : Promise.resolve(undefined),
    tool === "procurement" && workspace.audience === "internal"
      ? loadProcurementCommitmentRegister(projectId, commitmentPage, commitmentStatus)
      : Promise.resolve(undefined),
    tool === "procurement" && workspace.audience === "internal"
      ? loadProcurementBidInvitationRegister(projectId, bidInvitationPage, bidInvitationStatus)
      : Promise.resolve(undefined),
    tool === "procurement" && workspace.audience === "internal"
      ? loadProcurementLienWaiverRegister(projectId, lienWaiverPage, lienWaiverStatus)
      : Promise.resolve(undefined),
    tool === "quality-safety"
      ? loadInspectionRegister(projectId, inspectionPage, inspectionStatus)
      : Promise.resolve(undefined),
    tool === "quality-safety" && workspace.audience === "internal"
      ? loadSafetyIncidentRegister(projectId, incidentPage, incidentStatus)
      : Promise.resolve(undefined),
    tool === "quality-safety" && workspace.audience === "internal"
      ? loadSafetyObservationRegister(projectId, observationPage, observationStatus)
      : Promise.resolve(undefined),
    tool === "execution" && workspace.audience === "internal"
      ? loadSubmittalRegister(projectId, submittalPage, submittalStatus)
      : Promise.resolve(undefined),
    tool === "execution"
      ? loadRfiRegister(projectId, rfiPage, rfiStatus)
      : Promise.resolve(undefined),
  ]);
  return <ProjectWorkspace resourceRegister={resourceRegister} resourceUnavailable={resourceUnavailable} workspace={workspace} options={options} bidComparison={bidComparison} procurementRegister={procurementRegister} materialReceiptRegister={materialReceiptRegister} procurementCommitmentRegister={procurementCommitmentRegister} procurementBidInvitationRegister={procurementBidInvitationRegister} procurementLienWaiverRegister={procurementLienWaiverRegister} inspectionRegister={inspectionRegister} incidentRegister={incidentRegister} observationRegister={observationRegister} submittalRegister={submittalRegister} rfiRegister={rfiRegister} searchParams={searchParams} registerNavigation={{ rfiPage, rfiStatus, submittalPage, submittalStatus, inspectionPage, inspectionStatus, incidentPage, incidentStatus, observationPage, observationStatus }} />;
}
