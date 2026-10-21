import { mergeSchemas } from "@graphql-tools/schema";
import type { GraphQLSchema } from "graphql";

import {
  constructionPortfolio,
  constructionProjectOptions,
  constructionProjectOptionSearch,
  constructionProjectWorkspace,
  constructionProcurementRequestRegister,
  constructionMaterialReceiptRegister,
  constructionProcurementCommitmentRegister,
  constructionProcurementBidInvitationRegister,
  constructionProcurementLienWaiverRegister,
  constructionInspectionRegister,
  constructionSafetyIncidentRegister,
  constructionSafetyObservationRegister,
  constructionRfiRegister,
  constructionSubmittalRegister,
} from "../queries/construction";
import { constructionPortalApprovalSnapshot, constructionPortalInbox } from "../queries/portal";
import { constructionApprovalSnapshot } from "../queries/approvals";
import { constructionBidComparison } from "../queries/preconstruction";
import { constructionOnboardingReadiness } from "../queries/onboarding-readiness";
import { constructionRecordDetail } from "../queries/record-detail";
import { constructionResourceLogRegister } from "../queries/resource-activity";
import { constructionResourceActivityReceipt, reconcileResourceActivityIntent, closeResourceActivityIntent } from "../queries/resource-receipt";
import {
  publicConstructionProject,
  publicConstructionService,
  publicConstructionSite,
  publicIntakeReceipt,
} from "../queries/public-site";
import {
  recordAgentActionOutcome,
  recordAgentActionObservation,
  requestAgentAction,
  reviewAgentAction,
} from "./agentActions";
import {
  addProjectMember,
  awardBidSubmission,
  prepareProgressClaim,
  recordProgressPayment,
  startBidPackage,
  openChangeEvent,
  createConstructionProject,
  startDailyLog,
  registerDocument,
  recordPunchItem,
  raiseRfi,
  recordSafetyObservation,
  registerSubmittal,
  recordDirectCost,
} from "./construction";
import { lifecycleResolvers } from "./lifecycle";
import { constructionStoreSettings, updateConstructionStoreSettings } from "./store-settings";
import { commandConstructionRequest, constructionCustomerRequest, constructionCustomerRequestCount, constructionCustomerRequests, constructionOperatorRequests, registerConstructionCustomer } from "./customer-requests";
import { onboardConstructionWorkspace } from "./onboarding";
import { issueApiCredential, revokeApiCredential } from "./api-credentials";
import { decideConstructionApproval, requestConstructionApproval } from "./approvals";
import { configureConstructionApprovalPolicy } from "./approval-policies";
import {
  acknowledgeDocumentDistribution,
  completeDocumentVersionUpload,
  completeDrawingRevisionUpload,
  distributeDocumentVersion,
  documentVersionDownload,
  drawingRevisionDownload,
  requestDocumentVersionUpload,
  requestDrawingRevisionUpload,
} from "./documents";
import { acceptProjectInvitation, reissueProjectInvitation, revokeProjectInvitation } from "./invitations";
import { recordSafetyIncidentPrivateDetails, safetyIncidentPrivateDetail } from "./safety-private";
import { submitPublicIntake } from "./public-intake";
import { respondPortalRfi, reviewPortalSubmittal, submitPortalBid, submitPortalLienWaiver, submitPortalProgressClaim } from "./portal";
import {
  addBudgetLine,
  addChangeEventLine,
  registerInspectionTemplate,
  recordChangeQuote,
  registerSpecificationSection,
  reviseEstimate,
  createBudgetChangeWithLine,
  addDailyLogEntry,
  allocateSettledPayment,
  createChangeOrderWithLine,
  createCommitmentWithLine,
  registerCorrectiveAction,
  createEstimateWithLine,
  createInspectionWithItem,
  createPrimeContractWithLine,
  createProcurementRequestWithLine,
  createResourceCatalogItem,
  registerScheduleTask,
  recordCorrectiveActionEvidence,
  registerTradePartner,
  registerFieldPhoto,
  inviteBidder,
  inviteProjectMember,
  linkScheduleDependency,
  placeProcurementOrder,
  recordBidSubmission,
  recordInspectionItemResult,
  recordLaborTime,
  recordLienWaiverEvidence,
  recordMaterialReceipt,
  recordResourceActivity,
  recordSafetyIncident,
  recordSubmittalReview,
  registerDrawing,
  registerSchedule,
  requestRetainageRelease,
  routeRfi,
  routeSubmittalReview,
  reversePostedDirectCost,
  reverseSettledPayment,
  respondToRfi,
  updateScheduleTaskProgress,
} from "./workflows";
import redirectToInit from "./redirectToInit";

const graphql = String.raw;

export function extendGraphqlSchema(baseSchema: GraphQLSchema) {
  return mergeSchemas({
    schemas: [baseSchema],
    typeDefs: graphql`
      input LifecycleTransitionInput {
        id: ID!
        toStatus: String!
        reason: String!
        idempotencyKey: String
        agentActionId: ID
      }

      type LifecycleTransitionResult {
        success: Boolean!
        itemId: ID!
        fromStatus: String!
        toStatus: String!
        actionId: ID!
        replayed: Boolean!
      }

      input AgentActionRequestInput {
        agentIdentityId: ID!
        action: String!
        requiredScope: String!
        targetType: String!
        targetId: ID!
        toStatus: String!
        companyId: ID!
        projectId: ID
        reason: String!
        correlationId: String
        causationId: String
      }

      input AgentActionReviewInput {
        id: ID!
        decision: String!
        notes: String!
      }

      input AgentActionOutcomeInput {
        id: ID!
        outcome: String!
        resultSummary: String
        errorCode: String
        errorMessage: String
      }

      type AgentActionObservationReceipt {
        actionId: ID!
        observationId: ID!
        authoritative: Boolean!
        reportedOutcome: String!
        observedActionStatus: String!
        replayed: Boolean!
      }

      type ConstructionProjectSummary {
        id: ID!
        projectNumber: String!
        name: String!
        status: String!
        audience: String!
        companyId: ID
        companyName: String!
        brandName: String!
        brandMark: String!
        brandTagline: String!
        brandColor: String!
        logoIcon: String!
        logoColor: String!
        startDate: String
        completionDate: String
        currencyCode: String!
        originalBudgetMinor: String
        revisedBudgetMinor: String
        committedMinor: String
        actualCostMinor: String
        openRfis: Int
        openSubmittals: Int
        openChanges: Int
        openSafety: Int
        openPunch: Int
        pendingClaims: Int
      }

      type ConstructionCompanySummary {
        canCreateProject: Boolean!
        logoIcon: String!
        logoColor: String!
        id: ID!
        name: String!
        status: String!
        brandName: String!
        brandMark: String!
        brandTagline: String!
        brandColor: String!
      }

      type ConstructionPortfolio {
        generatedAt: String!
        canCreateProject: Boolean!
        page: Int!
        pageSize: Int!
        totalCount: Int!
        totalPages: Int!
        search: String!
        companies: [ConstructionCompanySummary!]!
        projects: [ConstructionProjectSummary!]!
        metrics: [ConstructionMetric!]!
      }

      type ConstructionOption {
        id: ID!
        kind: String!
        label: String!
        detail: String!
        parentId: ID
        status: String
      }

      type ConstructionOptionPage {
        items: [ConstructionOption!]!
        page: Int!
        totalCount: Int!
        hasMore: Boolean!
      }

      type ConstructionRecordDetailField {
        label: String!
        value: String!
      }

      type ConstructionRecordEvidence {
        kind: String!
        reference: String!
        title: String!
        status: String!
        occurredAt: String
        recordType: String
        recordId: ID
      }

      type ConstructionRecordDetail {
        id: ID!
        recordType: String!
        listKey: String!
        reference: String!
        title: String!
        status: String!
        allowedTransitions: [String!]!
        fields: [ConstructionRecordDetailField!]!
        evidence: [ConstructionRecordEvidence!]!
        history: [ConstructionRecordEvidence!]!
      }

      type ConstructionBidComparisonRow {
        id: ID!
        packageNumber: String!
        packageTitle: String!
        submissionNumber: String!
        partnerName: String!
        status: String!
        totalMinor: String!
        currencyCode: String!
        exclusions: String!
        clarifications: String!
        submittedAt: String
        lineCount: Int!
      }

      type ConstructionPortalInboxItem {
        id: ID!
        targetId: ID!
        secondaryId: ID
        kind: String!
        reference: String!
        title: String!
        status: String!
        dueAt: String
        action: String!
        downloadTargetId: ID
        context: [String!]
      }

      type ConstructionMetric {
        key: String!
        label: String!
        value: String!
        unit: String!
        tone: String!
      }

      type ConstructionWorkItem {
        id: ID!
        kind: String!
        reference: String!
        title: String!
        status: String!
        dueAt: String
        owner: String!
        amountMinor: String
        allowedTransitions: [String!]!
      }

      type ConstructionProjectWorkspace {
        generatedAt: String!
        tool: String!
        audience: String!
        availableCommands: [String!]!
        project: ConstructionProjectSummary!
        metrics: [ConstructionMetric!]!
        items: [ConstructionWorkItem!]!
        queuePage: Int!
        queueTotalPages: Int!
        queueGroups: [ConstructionQueueGroup!]!
      }

      type ConstructionQueueGroup {
        kind: String!
        totalCount: Int!
      }

      type ConstructionProcurementRequestRegister {
        projectId: ID!
        page: Int!
        pageSize: Int!
        totalCount: Int!
        totalPages: Int!
        status: String!
        items: [ConstructionWorkItem!]!
      }

      type ConstructionResourceLogItem {
        id: ID!
        resourceType: String!
        eventType: String!
        occurredAt: String
        quantity: String!
        unit: String!
        resourceLabel: String!
      }
      type ConstructionResourceIntentScope {
        version: Int!
        purpose: String!
        actorId: ID!
        principalId: String!
        companyId: ID!
        projectId: ID!
        currencyCode: String!
      }
      type ConstructionResourceActivityReceipt {
        outcome: String!
        message: String!
        intentJson: String
        itemId: ID
        actionId: ID
        requestDigest: String
        resultDigest: String
        completedAt: String
        factJson: String
      }
      type ConstructionResourceLogRegister {
        intentScope: ConstructionResourceIntentScope!
        page: Int!
        pageSize: Int!
        totalCount: Int!
        totalPages: Int!
        search: String!
        type: String!
        event: String!
        items: [ConstructionResourceLogItem!]!
      }
      type ConstructionMaterialReceiptRegisterItem {
        id: ID!
        reference: String!
        status: String!
        receivedAt: String
      }

      type ConstructionMaterialReceiptRegister {
        projectId: ID!
        page: Int!
        pageSize: Int!
        totalCount: Int!
        totalPages: Int!
        status: String!
        items: [ConstructionMaterialReceiptRegisterItem!]!
      }

      type ConstructionProcurementCommitmentRegisterItem {
        id: ID!
        number: String!
        title: String!
        commitmentType: String!
        status: String!
      }

      type ConstructionProcurementCommitmentRegister {
        projectId: ID!
        page: Int!
        pageSize: Int!
        totalCount: Int!
        totalPages: Int!
        status: String!
        items: [ConstructionProcurementCommitmentRegisterItem!]!
      }

      type ConstructionProcurementBidPackageReference {
        id: ID!
        number: String!
      }

      type ConstructionProcurementBidInvitationRegisterItem {
        id: ID!
        status: String!
        sentAt: String
        respondedAt: String
        bidPackage: ConstructionProcurementBidPackageReference
      }

      type ConstructionProcurementBidInvitationRegister {
        projectId: ID!
        page: Int!
        pageSize: Int!
        totalCount: Int!
        totalPages: Int!
        status: String!
        items: [ConstructionProcurementBidInvitationRegisterItem!]!
      }

      type ConstructionProcurementLienWaiverRegisterItem {
        id: ID!
        waiverNumber: String!
        waiverType: String!
        status: String!
        throughDate: String
      }

      type ConstructionProcurementLienWaiverRegister {
        projectId: ID!
        page: Int!
        pageSize: Int!
        totalCount: Int!
        totalPages: Int!
        status: String!
        items: [ConstructionProcurementLienWaiverRegisterItem!]!
      }

      type ConstructionInspectionRegister {
        projectId: ID!
        page: Int!
        pageSize: Int!
        totalCount: Int!
        totalPages: Int!
        status: String!
        audience: String!
        items: [ConstructionWorkItem!]!
      }

      type ConstructionSubmittalRegister {
        projectId: ID!
        page: Int!
        pageSize: Int!
        totalCount: Int!
        totalPages: Int!
        status: String!
        items: [ConstructionWorkItem!]!
      }

      type ConstructionSafetyIncidentRegisterItem {
        id: ID!
        reference: String!
        status: String!
        occurredAt: String
      }

      type ConstructionSafetyIncidentRegister {
        page: Int!
        pageSize: Int!
        totalCount: Int!
        totalPages: Int!
        status: String!
        items: [ConstructionSafetyIncidentRegisterItem!]!
      }

      type ConstructionSafetyObservationRegisterItem {
        id: ID!
        reference: String!
        status: String!
        observedAt: String
      }

      type ConstructionSafetyObservationRegister {
        page: Int!
        pageSize: Int!
        totalCount: Int!
        totalPages: Int!
        status: String!
        items: [ConstructionSafetyObservationRegisterItem!]!
      }

      type ConstructionRfiRegisterItem {
        id: ID
        number: String!
        title: String!
        status: String!
        dueAt: String
      }

      type ConstructionRfiRegister {
        page: Int!
        pageSize: Int!
        totalCount: Int!
        totalPages: Int!
        status: String!
        audience: String!
        items: [ConstructionRfiRegisterItem!]!
      }

      input ConstructionCommandInput {
        retainageBps: Int
        projectId: ID!
        reference: String!
        title: String!
        description: String
        dueAt: String
        amountMinor: String
        relatedId: ID
        secondaryId: ID
        idempotencyKey: String!
      }

      input ConstructionProjectCommandInput {
        companyId: ID!
        projectNumber: String!
        name: String!
        description: String
        startDate: String
        currencyCode: String
        idempotencyKey: String!
      }

      input ProjectMemberCommandInput {
        projectId: ID!
        userId: ID!
        accessLevel: String!
        idempotencyKey: String!
      }

      input ConstructionWorkflowInput {
        intentVersion: Int
        intentActorId: ID
        intentPrincipalId: String
        intentCompanyId: ID
        intentCurrencyCode: String
        projectId: ID!
        reference: String!
        title: String!
        description: String
        dueAt: String
        occurredAt: String
        amountMinor: String
        relatedId: ID
        secondaryId: ID
        partnerId: ID
        userId: ID
        roleId: ID
        type: String
        quantity: String
        unit: String
        evidenceReference: String
        evidenceChecksumSha256: String
        incidentType: String
        idempotencyKey: String!
      }

      input ConstructionOnboardingInput {
        fictionalFixture: Boolean
        companyName: String!
        companySlug: String!
        legalName: String
        brandName: String!
        brandMark: String!
        brandTagline: String
        brandColor: String!
        projectNumber: String!
        projectName: String!
        projectDescription: String
        startDate: String
        completionDate: String
        clientName: String
        tradePartnerName: String
        currencyCode: String!
        costCode: String!
        costCodeName: String!
        budgetCode: String!
        budgetCodeDescription: String!
        publicContactEmail: String!
        publicContactPhone: String
        publicServiceArea: String!
        publicCapabilitySummary: String!
        primaryServiceName: String!
        primaryServiceSummary: String!
        publicPrivacyNotice: String!
        publishFirstProject: Boolean!
        publicProjectSummary: String
        publicProjectMarket: String
        publicProjectLocation: String
        idempotencyKey: String!
      }

      type ConstructionOnboardingResult {
        success: Boolean!
        companyId: ID!
        projectId: ID!
        actionId: ID!
        replayed: Boolean!
      }

      type ConstructionReadinessCheck {
        key: String!
        label: String!
        complete: Boolean!
        detail: String!
        href: String!
        required: Boolean!
      }

      type ConstructionProjectReadiness {
        projectId: ID!
        name: String!
        checks: [ConstructionReadinessCheck!]!
      }

      type ConstructionCompanyReadiness {
        companyId: ID!
        name: String!
        checks: [ConstructionReadinessCheck!]!
        projects: [ConstructionProjectReadiness!]!
      }

      type ConstructionOnboardingReadiness {
        canStartFirstCompany: Boolean!
        sampleWorkspaceAvailable: Boolean!
        projectOnly: Boolean!
        companies: [ConstructionCompanyReadiness!]!
      }

      input ApiCredentialInput {
        companyId: ID!
        projectId: ID
        name: String!
        scopes: [String!]!
        expiresAt: String
      }

      type ApiCredentialIssueResult {
        success: Boolean!
        credentialId: ID!
        actionId: ID!
        token: String!
        tokenPrefix: String!
        scopes: [String!]!
      }

      type ApiCredentialRevokeResult {
        success: Boolean!
        credentialId: ID!
        actionId: ID!
        replayed: Boolean!
      }

      input ConstructionApprovalPolicyInput {
        projectId: ID!
        policyId: ID
        name: String!
        domain: String!
        minimumAmountMinor: String!
        approverRoleId: ID!
        isActive: Boolean!
        idempotencyKey: String!
      }

      input ConstructionApprovalRequestInput {
        targetType: String!
        targetId: ID!
        targetStatus: String!
        requestNumber: String!
        reason: String!
        assigneeMembershipId: ID
      }

      input ConstructionApprovalDecisionInput {
        requestId: ID!
        decision: String!
        comment: String!
      }

      type ConstructionApprovalResult {
        success: Boolean!
        requestId: ID!
        decisionId: ID
        actionId: ID!
        replayed: Boolean
      }

      input DrawingRevisionUploadInput {
        projectId: ID!
        drawingId: ID!
        revisionNumber: String!
        title: String!
        fileName: String!
        mimeType: String!
        byteSize: Int!
        checksumSha256: String!
        idempotencyKey: String!
      }

      input DocumentVersionUploadInput {
        projectId: ID!
        documentId: ID!
        versionNumber: Int!
        revisionLabel: String
        title: String!
        fileName: String!
        mimeType: String!
        byteSize: Int!
        checksumSha256: String!
        idempotencyKey: String!
      }

      type SignedHeader {
        name: String!
        value: String!
      }

      type DocumentUploadAuthorization {
        success: Boolean!
        versionId: ID!
        actionId: ID!
        replayed: Boolean!
        uploadUrl: String!
        expiresAt: String!
        headers: [SignedHeader!]!
      }

      type DocumentUploadCompletion {
        success: Boolean!
        versionId: ID!
        actionId: ID!
        replayed: Boolean!
      }

      type DrawingUploadAuthorization {
        success: Boolean!
        revisionId: ID!
        actionId: ID!
        replayed: Boolean!
        uploadUrl: String!
        expiresAt: String!
        headers: [SignedHeader!]!
      }

      type DrawingUploadCompletion {
        success: Boolean!
        revisionId: ID!
        actionId: ID!
        replayed: Boolean!
      }

      input DocumentDistributionInput {
        projectId: ID!
        versionId: ID!
        membershipId: ID!
        purpose: String!
        expiresAt: String
        idempotencyKey: String!
      }

      type DocumentDownloadAuthorization {
        success: Boolean!
        fileName: String!
        mimeType: String!
        byteSize: Int!
        downloadUrl: String!
        expiresAt: String!
      }

      input PortalWorkflowInput {
        projectId: ID!
        targetId: ID!
        reference: String
        title: String
        response: String!
        amountMinor: String
        quantity: String
        unit: String
        decision: String
        dueAt: String
        evidenceReference: String
        evidenceChecksumSha256: String
        idempotencyKey: String!
      }

      input ProjectInvitationAcceptanceInput {
        token: String!
        password: String
        name: String
      }

      type ProjectInvitationAcceptanceResult {
        success: Boolean!
        userId: ID!
        projectId: ID!
        portalType: String!
      }

      type ProjectInvitationIssueResult {
        success: Boolean!
        operation: String!
        itemId: ID!
        actionId: ID!
        replayed: Boolean!
        activationToken: String
      }

      input SafetyIncidentPrivateInput {
        incidentId: ID!
        incidentType: String
        injuredPartyName: String
        injuryDetails: String
        privateNotes: String
        lostTimeDays: Int
        restrictedDutyDays: Int
        idempotencyKey: String!
      }

      type SafetyIncidentPrivateDetail {
        incidentId: ID!
        incidentType: String!
        injuredPartyName: String!
        injuryDetails: String!
        privateNotes: String!
        lostTimeDays: Int!
        restrictedDutyDays: Int!
      }

      type DocumentAcknowledgementResult {
        success: Boolean!
        acknowledgementId: ID!
        replayed: Boolean!
      }

      type ConstructionCommandResult {
        success: Boolean!
        operation: String!
        itemId: ID!
        actionId: ID!
        replayed: Boolean!
      }

      type PublicConstructionService {
        slug: String!
        title: String!
        summary: String!
        details: String!
        market: String!
      }

      type PublicConstructionProject {
        slug: String!
        title: String!
        summary: String!
        description: String!
        market: String!
        locationLabel: String!
        deliveryMethod: String!
        completionLabel: String!
        approvedOutcome: String!
      }

      type PublicConstructionSite {
        logoIcon: String!
        logoColor: String!
        brandName: String!
        brandMark: String!
        brandTagline: String!
        brandColor: String!
        serviceArea: String!
        capabilitySummary: String!
        inquiryEmail: String!
        inquiryPhone: String!
        privacyNotice: String!
        acceptingInquiries: Boolean!
        services: [PublicConstructionService!]!
        projects: [PublicConstructionProject!]!
      }

      type CustomerRegistrationResult { success: Boolean! }
      type ConstructionCustomerRequest {
        id: ID!
        reference: String!
        serviceTitle: String!
        serviceSlug: String!
        scope: String!
        status: String!
        version: Int!
        currencyCode: String!
        quoteMinor: String!
        quoteTerms: String!
        expiresAt: String
        acceptedAt: String
        acceptedSnapshot: JSON
        createdAt: String!
      }
      type ConstructionOperatorRequest {
        request: ConstructionCustomerRequest!
        customerName: String!
        customerEmail: String!
        customerPhone: String
      }
      input ServiceRequestInput {
        operation: String!
        id: ID
        serviceSlug: String
        scope: String
        expectedVersion: Int
        amountMinor: String
        terms: String
        expiresAt: String
        idempotencyKey: String!
      }

      type PublicIntakeReceipt {
        publicReference: String!
        kind: String!
        status: String!
        submittedAt: String!
      }

      input PublicIntakeInput {
        kind: String!
        contactName: String!
        organization: String
        email: String!
        phone: String
        contactRole: String
        projectName: String
        projectType: String
        locationSummary: String
        deliveryMethod: String
        budgetRange: String
        desiredStart: String
        desiredCompletion: String
        designStage: String
        servicesSought: String
        scopeSummary: String!
        referralSource: String
        sourcePath: String!
        privacyConsent: Boolean!
        privacyNoticeDigest: String
        idempotencyKey: String!
        website: String
      }

      type PublicIntakeResult {
        success: Boolean!
        publicReference: String!
        kind: String!
        submittedAt: String!
        replayed: Boolean!
      }

      type Query {
        redirectToInit: Boolean
        constructionPortfolio(page: Int, search: String): ConstructionPortfolio!
        constructionOnboardingReadiness: ConstructionOnboardingReadiness!
        constructionProjectWorkspace(projectId: ID!, tool: String!, page: Int): ConstructionProjectWorkspace!
        constructionProcurementRequestRegister(projectId: ID!, page: Int!, status: String): ConstructionProcurementRequestRegister!
        constructionResourceActivityReceipt(intentJson: String!): ConstructionResourceActivityReceipt!
        constructionResourceLogRegister(projectId: ID!, page: Int!, search: String, type: String, event: String): ConstructionResourceLogRegister!
        constructionMaterialReceiptRegister(projectId: ID!, page: Int!, status: String): ConstructionMaterialReceiptRegister!
        constructionProcurementCommitmentRegister(projectId: ID!, page: Int!, status: String): ConstructionProcurementCommitmentRegister!
        constructionProcurementBidInvitationRegister(projectId: ID!, page: Int!, status: String): ConstructionProcurementBidInvitationRegister!
        constructionProcurementLienWaiverRegister(projectId: ID!, page: Int!, status: String): ConstructionProcurementLienWaiverRegister!
        constructionInspectionRegister(projectId: ID!, page: Int!, status: String): ConstructionInspectionRegister!
        constructionSafetyIncidentRegister(projectId: ID!, page: Int!, status: String): ConstructionSafetyIncidentRegister!
        constructionSafetyObservationRegister(projectId: ID!, page: Int!, status: String): ConstructionSafetyObservationRegister!
        constructionSubmittalRegister(projectId: ID!, page: Int!, status: String): ConstructionSubmittalRegister!
        constructionRfiRegister(projectId: ID!, page: Int!, status: String): ConstructionRfiRegister!
        constructionProjectOptions(projectId: ID!): [ConstructionOption!]!
        constructionProjectOptionSearch(projectId: ID!, kinds: [String!]!, search: String, page: Int, ids: [ID!]): ConstructionOptionPage!
        constructionBidComparison(projectId: ID!): [ConstructionBidComparisonRow!]!
        constructionRecordDetail(projectId: ID!, recordType: String!, recordId: ID!): ConstructionRecordDetail!
        constructionPortalInbox(projectId: ID!): [ConstructionPortalInboxItem!]!
        constructionPortalApprovalSnapshot(projectId: ID!, requestId: ID!): [String!]!
        constructionApprovalSnapshot(projectId: ID!, requestId: ID!): [String!]!
        documentVersionDownload(versionId: ID!): DocumentDownloadAuthorization!
        drawingRevisionDownload(revisionId: ID!): DocumentDownloadAuthorization!
        safetyIncidentPrivateDetail(incidentId: ID!): SafetyIncidentPrivateDetail!
        publicConstructionSite: PublicConstructionSite
        publicConstructionService(slug: String!): PublicConstructionService
        publicConstructionProject(slug: String!): PublicConstructionProject
        publicIntakeReceipt(reference: String!): PublicIntakeReceipt
        constructionStoreSettings(companyId: ID): JSON
        constructionCustomerRequests(operator: Boolean, skip: Int, take: Int): [ConstructionCustomerRequest!]!
        constructionCustomerRequestCount(operator: Boolean): Int!
        constructionOperatorRequests(skip: Int, take: Int): [ConstructionOperatorRequest!]!
        constructionCustomerRequest(id: ID!): ConstructionCustomerRequest
      }

      type Mutation {
        transitionProjectStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionBidPackageStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionEstimateStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionBudgetChangeStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionPrimeContractStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionCommitmentStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionChangeEventStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionChangeOrderStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionRfiStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionSubmittalStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionProgressClaimStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionSafetyIncidentStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionInspectionStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionScheduleStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionScheduleTaskStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionDailyLogStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionPunchItemStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionSafetyObservationStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionCorrectiveActionStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionPaymentStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionRetainageReleaseStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionLienWaiverStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        transitionProcurementRequestStatus(input: LifecycleTransitionInput!): LifecycleTransitionResult!
        createConstructionProject(input: ConstructionProjectCommandInput!): ConstructionCommandResult!
        startBidPackage(input: ConstructionCommandInput!): ConstructionCommandResult!
        awardBidSubmission(input: ConstructionCommandInput!): ConstructionCommandResult!
        prepareProgressClaim(input: ConstructionCommandInput!): ConstructionCommandResult!
        recordProgressPayment(input: ConstructionCommandInput!): ConstructionCommandResult!
        openChangeEvent(input: ConstructionCommandInput!): ConstructionCommandResult!
        raiseRfi(input: ConstructionCommandInput!): ConstructionCommandResult!
        registerSubmittal(input: ConstructionCommandInput!): ConstructionCommandResult!
        startDailyLog(input: ConstructionCommandInput!): ConstructionCommandResult!
        recordSafetyObservation(input: ConstructionCommandInput!): ConstructionCommandResult!
        recordPunchItem(input: ConstructionCommandInput!): ConstructionCommandResult!
        registerDocument(input: ConstructionCommandInput!): ConstructionCommandResult!
        recordDirectCost(input: ConstructionCommandInput!): ConstructionCommandResult!
        addProjectMember(input: ProjectMemberCommandInput!): ConstructionCommandResult!
        onboardConstructionWorkspace(input: ConstructionOnboardingInput!): ConstructionOnboardingResult!
        issueApiCredential(input: ApiCredentialInput!): ApiCredentialIssueResult!
        revokeApiCredential(id: ID!, reason: String!): ApiCredentialRevokeResult!
        configureConstructionApprovalPolicy(input: ConstructionApprovalPolicyInput!): ConstructionCommandResult!
        requestConstructionApproval(input: ConstructionApprovalRequestInput!): ConstructionApprovalResult!
        decideConstructionApproval(input: ConstructionApprovalDecisionInput!): ConstructionApprovalResult!
        requestDocumentVersionUpload(input: DocumentVersionUploadInput!): DocumentUploadAuthorization!
        completeDocumentVersionUpload(versionId: ID!, idempotencyKey: String!): DocumentUploadCompletion!
        requestDrawingRevisionUpload(input: DrawingRevisionUploadInput!): DrawingUploadAuthorization!
        completeDrawingRevisionUpload(revisionId: ID!, idempotencyKey: String!): DrawingUploadCompletion!
        distributeDocumentVersion(input: DocumentDistributionInput!): ConstructionCommandResult!
        acknowledgeDocumentDistribution(distributionId: ID!, acknowledgement: String!): DocumentAcknowledgementResult!
        acceptProjectInvitation(input: ProjectInvitationAcceptanceInput!): ProjectInvitationAcceptanceResult!
        revokeProjectInvitation(invitationId: ID!, reason: String!): ConstructionCommandResult!
        reissueProjectInvitation(invitationId: ID!, reason: String!, idempotencyKey: String!): ProjectInvitationIssueResult!
        submitPortalBid(input: PortalWorkflowInput!): ConstructionCommandResult!
        respondPortalRfi(input: PortalWorkflowInput!): ConstructionCommandResult!
        reviewPortalSubmittal(input: PortalWorkflowInput!): ConstructionCommandResult!
        submitPortalProgressClaim(input: PortalWorkflowInput!): ConstructionCommandResult!
        submitPortalLienWaiver(input: PortalWorkflowInput!): ConstructionCommandResult!
        recordSafetyIncidentPrivateDetails(input: SafetyIncidentPrivateInput!): ConstructionCommandResult!
        registerTradePartner(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        addBudgetLine(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        createBudgetChangeWithLine(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        reversePostedDirectCost(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        createEstimateWithLine(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        reviseEstimate(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        registerSpecificationSection(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        registerInspectionTemplate(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        addChangeEventLine(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        recordChangeQuote(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        inviteBidder(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        recordBidSubmission(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        createPrimeContractWithLine(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        createCommitmentWithLine(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        createChangeOrderWithLine(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        routeRfi(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        respondToRfi(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        routeSubmittalReview(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        recordSubmittalReview(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        addDailyLogEntry(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        registerFieldPhoto(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        recordLaborTime(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        createResourceCatalogItem(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        registerScheduleTask(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        linkScheduleDependency(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        updateScheduleTaskProgress(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        recordSafetyIncident(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        createInspectionWithItem(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        recordInspectionItemResult(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        registerCorrectiveAction(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        recordCorrectiveActionEvidence(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        createProcurementRequestWithLine(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        placeProcurementOrder(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        recordMaterialReceipt(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        recordLienWaiverEvidence(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        requestRetainageRelease(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        registerDrawing(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        registerSchedule(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        recordResourceActivity(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        reconcileResourceActivityIntent(intentJson: String!): ConstructionResourceActivityReceipt!
        closeResourceActivityIntent(intentJson: String!, reason: String!): ConstructionResourceActivityReceipt!
        inviteProjectMember(input: ConstructionWorkflowInput!): ProjectInvitationIssueResult!
        allocateSettledPayment(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        reverseSettledPayment(input: ConstructionWorkflowInput!): ConstructionCommandResult!
        requestAgentAction(input: AgentActionRequestInput!): AgentAction!
        reviewAgentAction(input: AgentActionReviewInput!): AgentAction!
        recordAgentActionObservation(input: AgentActionOutcomeInput!): AgentActionObservationReceipt!
        recordAgentActionOutcome(input: AgentActionOutcomeInput!): AgentAction! @deprecated(reason: "Records a non-authoritative observation only; returns the unchanged action. Use recordAgentActionObservation for its explicit receipt. Execute through the authorized domain transition.")
        submitPublicIntake(input: PublicIntakeInput!): PublicIntakeResult!
        updateConstructionStoreSettings(input: JSON!): ConstructionCommandResult!
        registerConstructionCustomer(name: String!, email: String!, password: String!): CustomerRegistrationResult!
        commandConstructionRequest(input: ServiceRequestInput!): ConstructionCustomerRequest!
      }
    `,
    resolvers: {
      Query: {
        redirectToInit,
        constructionStoreSettings,
        constructionCustomerRequest,
        constructionCustomerRequests,
        constructionCustomerRequestCount,
        constructionOperatorRequests,
        constructionPortfolio,
        constructionOnboardingReadiness,
        constructionProjectWorkspace,
        constructionProcurementRequestRegister,
        constructionResourceLogRegister,
        constructionResourceActivityReceipt,
        constructionMaterialReceiptRegister,
        constructionProcurementCommitmentRegister,
        constructionProcurementBidInvitationRegister,
        constructionProcurementLienWaiverRegister,
        constructionInspectionRegister,
        constructionSafetyIncidentRegister,
        constructionSafetyObservationRegister,
        constructionSubmittalRegister,
        constructionRfiRegister,
        constructionProjectOptions,
        constructionProjectOptionSearch,
        constructionBidComparison,
        constructionRecordDetail,
        constructionPortalInbox,
        constructionPortalApprovalSnapshot,
        constructionApprovalSnapshot,
        documentVersionDownload,
        drawingRevisionDownload,
        safetyIncidentPrivateDetail,
        publicConstructionSite,
        publicConstructionService,
        publicConstructionProject,
        publicIntakeReceipt,
      },
      Mutation: {
        ...lifecycleResolvers,
        updateConstructionStoreSettings,
        commandConstructionRequest,
        registerConstructionCustomer,
        createConstructionProject,
        startBidPackage,
        awardBidSubmission,
        prepareProgressClaim,
        recordProgressPayment,
        openChangeEvent,
        raiseRfi,
        registerSubmittal,
        startDailyLog,
        recordSafetyObservation,
        recordPunchItem,
        registerDocument,
        recordDirectCost,
        addProjectMember,
        onboardConstructionWorkspace,
        issueApiCredential,
        revokeApiCredential,
        configureConstructionApprovalPolicy,
        requestConstructionApproval,
        decideConstructionApproval,
        requestDocumentVersionUpload,
        completeDocumentVersionUpload,
        requestDrawingRevisionUpload,
        completeDrawingRevisionUpload,
        distributeDocumentVersion,
        acknowledgeDocumentDistribution,
        acceptProjectInvitation,
        revokeProjectInvitation,
        reissueProjectInvitation,
        submitPortalBid,
        respondPortalRfi,
        reviewPortalSubmittal,
        submitPortalProgressClaim,
        submitPortalLienWaiver,
        recordSafetyIncidentPrivateDetails,
        registerTradePartner,
        addBudgetLine,
        createBudgetChangeWithLine,
        reversePostedDirectCost,
        createEstimateWithLine,
        reviseEstimate,
        registerSpecificationSection,
        registerInspectionTemplate,
        addChangeEventLine,
        recordChangeQuote,
        inviteBidder,
        recordBidSubmission,
        createPrimeContractWithLine,
        createCommitmentWithLine,
        createChangeOrderWithLine,
        routeRfi,
        respondToRfi,
        routeSubmittalReview,
        recordSubmittalReview,
        addDailyLogEntry,
        registerFieldPhoto,
        recordLaborTime,
        createResourceCatalogItem,
        registerScheduleTask,
        linkScheduleDependency,
        updateScheduleTaskProgress,
        recordSafetyIncident,
        createInspectionWithItem,
        recordInspectionItemResult,
        registerCorrectiveAction,
        recordCorrectiveActionEvidence,
        createProcurementRequestWithLine,
        placeProcurementOrder,
        recordMaterialReceipt,
        recordLienWaiverEvidence,
        requestRetainageRelease,
        registerDrawing,
        registerSchedule,
        recordResourceActivity,
        reconcileResourceActivityIntent,
        closeResourceActivityIntent,
        inviteProjectMember,
        allocateSettledPayment,
        reverseSettledPayment,
        requestAgentAction,
        reviewAgentAction,
        recordAgentActionOutcome,
        recordAgentActionObservation,
        submitPublicIntake,
      },
    },
  });
}
