/**
 * Onboarding coverage for every registered Construction list.
 *
 * - setup: onboarding writes it for every new workspace (configuration and
 *   catalog data the operator supplied or that every workspace needs).
 * - sample: written only for the fictional sample workspace (Company.isDemo),
 *   always as drafts, plans or open items; the live path names how a real
 *   workspace creates it.
 * - workflow: created only by the named controlled command once real work
 *   happens.
 * - evidence: produced only by real activity (sessions, receipts, settlements,
 *   approvals, audit). Never seeded, not even for the sample workspace.
 */
export type OnboardingCoverage = "setup" | "sample" | "workflow" | "evidence";

export type OnboardingManifestEntry = {
  coverage: OnboardingCoverage;
  /** The controlled path a real workspace uses to create this list. */
  livePath: string;
};

export const ONBOARDING_MANIFEST = {
  User: { coverage: "evidence", livePath: "initial administrator setup, invitations and customer registration" },
  ServiceRequest: { coverage: "workflow", livePath: "commandConstructionRequest (customer quote request)" },
  ServiceRequestEvent: { coverage: "evidence", livePath: "written with each customer request command" },
  AuthSession: { coverage: "evidence", livePath: "sign-in" },
  ApiCredential: { coverage: "workflow", livePath: "issueApiCredential" },
  AccountInvitation: { coverage: "workflow", livePath: "inviteProjectMember" },
  Role: { coverage: "setup", livePath: "onboarding role templates; Models › Roles" },
  Company: { coverage: "setup", livePath: "onboardConstructionWorkspace" },
  CompanyMembership: { coverage: "setup", livePath: "onboardConstructionWorkspace; inviteProjectMember" },
  Project: { coverage: "setup", livePath: "onboardConstructionWorkspace; createConstructionProject" },
  ProjectMembership: { coverage: "setup", livePath: "onboardConstructionWorkspace; inviteProjectMember; addProjectMember" },
  TradePartner: { coverage: "setup", livePath: "onboarding client and trade partner; registerTradePartner" },
  ProjectLocation: { coverage: "setup", livePath: "onboarding site location; Models › Project locations" },
  CostCode: { coverage: "setup", livePath: "onboarding cost code; Models › Cost codes" },
  BudgetCode: { coverage: "setup", livePath: "onboarding budget code; addBudgetLine" },
  ConstructionLead: { coverage: "sample", livePath: "submitPublicIntake; Models › Construction leads" },
  ConstructionOpportunity: { coverage: "sample", livePath: "submitPublicIntake; Pipeline" },
  PublicSiteProfile: { coverage: "setup", livePath: "onboarding public profile; Store Settings" },
  PublicService: { coverage: "setup", livePath: "onboarding primary service; Store Settings" },
  PublicProject: { coverage: "setup", livePath: "optional onboarding publication; Store Settings" },
  IntakeSubmission: { coverage: "workflow", livePath: "submitPublicIntake" },
  BidPackage: { coverage: "sample", livePath: "startBidPackage" },
  BidInvitation: { coverage: "sample", livePath: "inviteBidder" },
  BidSubmission: { coverage: "workflow", livePath: "recordBidSubmission; submitPortalBid" },
  BidLineItem: { coverage: "workflow", livePath: "recordBidSubmission; submitPortalBid" },
  Estimate: { coverage: "sample", livePath: "createEstimateWithLine" },
  EstimateVersion: { coverage: "sample", livePath: "createEstimateWithLine; reviseEstimate" },
  EstimateLineItem: { coverage: "sample", livePath: "createEstimateWithLine; reviseEstimate" },
  Budget: { coverage: "setup", livePath: "onboardConstructionWorkspace; createConstructionProject" },
  BudgetLineItem: { coverage: "setup", livePath: "onboardConstructionWorkspace; addBudgetLine" },
  BudgetChange: { coverage: "workflow", livePath: "createBudgetChangeWithLine" },
  BudgetChangeLineItem: { coverage: "workflow", livePath: "createBudgetChangeWithLine" },
  DirectCost: { coverage: "evidence", livePath: "recordDirectCost (posted cost)" },
  PrimeContract: { coverage: "workflow", livePath: "createPrimeContractWithLine" },
  Commitment: { coverage: "workflow", livePath: "awardBidSubmission; createCommitmentWithLine" },
  ContractLineItem: { coverage: "workflow", livePath: "createPrimeContractWithLine; createCommitmentWithLine" },
  ChangeEvent: { coverage: "sample", livePath: "openChangeEvent" },
  ChangeEventLineItem: { coverage: "workflow", livePath: "addChangeEventLine" },
  ChangeQuote: { coverage: "workflow", livePath: "recordChangeQuote" },
  ChangeOrder: { coverage: "workflow", livePath: "createChangeOrderWithLine" },
  ChangeOrderLineItem: { coverage: "workflow", livePath: "createChangeOrderWithLine" },
  RFI: { coverage: "sample", livePath: "raiseRfi" },
  RFIResponse: { coverage: "workflow", livePath: "respondToRfi; respondPortalRfi" },
  SpecificationSection: { coverage: "sample", livePath: "registerSpecificationSection" },
  Submittal: { coverage: "sample", livePath: "registerSubmittal" },
  SubmittalReview: { coverage: "workflow", livePath: "routeSubmittalReview" },
  Drawing: { coverage: "sample", livePath: "registerDrawing" },
  DrawingRevision: { coverage: "evidence", livePath: "requestDrawingRevisionUpload (verified file)" },
  Document: { coverage: "workflow", livePath: "registerDocument" },
  DocumentVersion: { coverage: "evidence", livePath: "requestDocumentVersionUpload (verified file)" },
  DailyLog: { coverage: "sample", livePath: "startDailyLog" },
  DailyLogEntry: { coverage: "workflow", livePath: "addDailyLogEntry" },
  Schedule: { coverage: "setup", livePath: "onboarding project schedule; registerSchedule" },
  ScheduleTask: { coverage: "setup", livePath: "onboarding planned milestones; registerScheduleTask" },
  ScheduleDependency: { coverage: "sample", livePath: "linkScheduleDependency" },
  PunchItem: { coverage: "workflow", livePath: "recordPunchItem" },
  LaborEntry: { coverage: "evidence", livePath: "recordLaborTime (performed work)" },
  Equipment: { coverage: "sample", livePath: "createResourceCatalogItem" },
  Material: { coverage: "sample", livePath: "createResourceCatalogItem" },
  ResourceLog: { coverage: "evidence", livePath: "recordResourceActivity (performed work)" },
  SafetyIncident: { coverage: "evidence", livePath: "recordSafetyIncident" },
  SafetyObservation: { coverage: "sample", livePath: "recordSafetyObservation" },
  InspectionTemplate: { coverage: "setup", livePath: "onboarding quality template; registerInspectionTemplate" },
  Inspection: { coverage: "sample", livePath: "createInspectionWithItem" },
  InspectionItem: { coverage: "sample", livePath: "createInspectionWithItem" },
  CorrectiveAction: { coverage: "workflow", livePath: "registerCorrectiveAction" },
  ProgressClaim: { coverage: "workflow", livePath: "prepareProgressClaim (owner or subcontract); submitPortalProgressClaim" },
  ProgressClaimLineItem: { coverage: "workflow", livePath: "prepareProgressClaim" },
  Payment: { coverage: "evidence", livePath: "recordProgressPayment (settlement)" },
  PaymentReversal: { coverage: "evidence", livePath: "reverseSettledPayment" },
  PaymentAllocation: { coverage: "evidence", livePath: "allocateSettledPayment" },
  RetainageRelease: { coverage: "workflow", livePath: "requestRetainageRelease" },
  LienWaiver: { coverage: "evidence", livePath: "recordLienWaiverEvidence" },
  ProcurementRequest: { coverage: "sample", livePath: "createProcurementRequestWithLine" },
  ProcurementRequestLine: { coverage: "sample", livePath: "createProcurementRequestWithLine" },
  MaterialReceipt: { coverage: "evidence", livePath: "recordMaterialReceipt (delivery)" },
  MaterialReceiptLine: { coverage: "evidence", livePath: "recordMaterialReceipt (delivery)" },
  ApprovalPolicy: { coverage: "setup", livePath: "onboarding default policies; configureConstructionApprovalPolicy" },
  ApprovalRequest: { coverage: "workflow", livePath: "requestConstructionApproval" },
  ApprovalDecision: { coverage: "evidence", livePath: "decideConstructionApproval (independent approver)" },
  DocumentDistribution: { coverage: "workflow", livePath: "distributeDocumentVersion" },
  DocumentAcknowledgement: { coverage: "evidence", livePath: "acknowledgeDocumentDistribution" },
  AgentIdentity: { coverage: "workflow", livePath: "Models › Agent identities (agent administrators)" },
  ScopeGrant: { coverage: "workflow", livePath: "Models › Scope grants (agent administrators)" },
  AgentAction: { coverage: "evidence", livePath: "written by every controlled command" },
  IdempotencyKey: { coverage: "evidence", livePath: "written by every controlled command" },
  OutboxMessage: { coverage: "evidence", livePath: "written by every controlled command" },
} as const satisfies Record<string, OnboardingManifestEntry>;

export type ManifestListKey = keyof typeof ONBOARDING_MANIFEST;

export function manifestListsWith(coverage: OnboardingCoverage): ManifestListKey[] {
  return (Object.keys(ONBOARDING_MANIFEST) as ManifestListKey[])
    .filter(listKey => ONBOARDING_MANIFEST[listKey].coverage === coverage);
}

/** What a finished setup shows the operator. */
export const ONBOARDING_SETUP_SUMMARY = [
  "Company, public profile and primary service",
  "Role templates for staff, field leads and external collaborators",
  "First project with its site location and schedule",
  "Cost code, budget code and active budget",
  "Approval policies for budget changes, contracts, change orders, claims and retainage",
  "Quality inspection template",
] as const;

export const SAMPLE_WORKSPACE_SUMMARY = [
  "Client and trade partner",
  "Draft bid package, bidder invitation and estimate",
  "Draft RFI, submittal and specification section",
  "Planned schedule tasks, scheduled inspection and draft daily log",
  "Equipment and material catalog, draft procurement request",
  "Open change event, safety observation and pipeline opportunity",
] as const;
