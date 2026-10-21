-- Batch 3 construction integrity additions. Existing relationship-table primary keys are retained.
-- CreateEnum
CREATE TYPE "ApiCredentialStatusType" AS ENUM ('active', 'suspended', 'revoked');

-- CreateEnum
CREATE TYPE "AccountInvitationStatusType" AS ENUM ('pending', 'accepted', 'revoked', 'expired');

-- CreateEnum
CREATE TYPE "ProcurementRequestStatusType" AS ENUM ('draft', 'submitted', 'approved', 'ordered', 'partially_received', 'received', 'closed', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "MaterialReceiptStatusType" AS ENUM ('recorded', 'accepted_with_exceptions', 'rejected', 'voided');

-- CreateEnum
CREATE TYPE "ApprovalPolicyDomainType" AS ENUM ('budget_change', 'prime_contract', 'change_order', 'progress_claim', 'retainage_release');

-- CreateEnum
CREATE TYPE "ApprovalRequestStatusType" AS ENUM ('pending', 'approved', 'rejected', 'cancelled', 'superseded');

-- CreateEnum
CREATE TYPE "ApprovalDecisionDecisionType" AS ENUM ('approved', 'rejected');

-- AlterEnum
ALTER TYPE "PaymentStatusType" ADD VALUE 'reversed';

-- AlterTable
ALTER TABLE "AgentAction" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "AgentIdentity" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "AuthSession" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "BidInvitation" ADD COLUMN     "budgetCode" TEXT,
ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "BidLineItem" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "BidPackage" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "BidSubmission" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "Budget" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "BudgetChange" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "BudgetChangeLineItem" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "BudgetCode" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "BudgetLineItem" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "ChangeEvent" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "ChangeEventLineItem" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "ChangeOrder" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "ChangeOrderLineItem" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "ChangeQuote" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "Commitment" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "brandColor" TEXT NOT NULL DEFAULT '#1D4ED8',
ADD COLUMN     "brandMark" TEXT NOT NULL DEFAULT 'NB',
ADD COLUMN     "brandName" TEXT NOT NULL DEFAULT 'Northstar Builders',
ADD COLUMN     "brandTagline" TEXT NOT NULL DEFAULT 'Built on accountable work.',
ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "CompanyMembership" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "ConstructionLead" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "ConstructionOpportunity" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "ContractLineItem" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "CorrectiveAction" ADD COLUMN     "completionNotes" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "evidenceChecksumSha256" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "evidenceReference" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "CostCode" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "DailyLog" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "DailyLogEntry" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "DirectCost" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT,
ADD COLUMN     "voidReason" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "voidedAt" TIMESTAMP(3),
ADD COLUMN     "voidedBy" TEXT;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "DocumentVersion" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "Drawing" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "DrawingRevision" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "Estimate" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "EstimateLineItem" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "EstimateVersion" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "IdempotencyKey" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "Inspection" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "InspectionItem" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "InspectionTemplate" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "LaborEntry" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "LienWaiver" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "Material" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "OutboxMessage" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "PaymentAllocation" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "PrimeContract" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "ProgressClaim" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "ProgressClaimLineItem" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "ProjectLocation" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "ProjectMembership" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "PunchItem" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "RFI" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "RFIResponse" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "ResourceLog" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "RetainageRelease" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "SafetyIncident" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "SafetyObservation" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "Schedule" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "ScheduleDependency" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "ScheduleTask" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "ScopeGrant" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "SpecificationSection" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "Submittal" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "SubmittalReview" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "TradePartner" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdByUser" TEXT,
ADD COLUMN     "updatedByUser" TEXT;

-- CreateTable
CREATE TABLE "ApiCredential" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "tokenPrefix" TEXT NOT NULL DEFAULT '',
    "tokenHash" TEXT NOT NULL DEFAULT '',
    "status" "ApiCredentialStatusType" NOT NULL DEFAULT 'active',
    "scopes" JSONB NOT NULL DEFAULT '[]',
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "owner" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdByUser" TEXT,
    "updatedByUser" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountInvitation" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL DEFAULT '',
    "tokenPrefix" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "status" "AccountInvitationStatusType" NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "invitedBy" TEXT,
    "user" TEXT,
    "projectMembership" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdByUser" TEXT,
    "updatedByUser" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentReversal" (
    "id" TEXT NOT NULL,
    "reversalNumber" TEXT NOT NULL DEFAULT '',
    "amountMinor" BIGINT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "externalReference" TEXT NOT NULL DEFAULT '',
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "allocationSnapshot" TEXT NOT NULL DEFAULT '',
    "payment" TEXT,
    "reversedBy" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdByUser" TEXT,
    "updatedByUser" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentReversal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcurementRequest" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "status" "ProcurementRequestStatusType" NOT NULL DEFAULT 'draft',
    "neededBy" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "orderedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "totalEstimatedMinor" BIGINT DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "requestedBy" TEXT,
    "approvedBy" TEXT,
    "tradePartner" TEXT,
    "commitment" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdByUser" TEXT,
    "updatedByUser" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcurementRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcurementRequestLine" (
    "id" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT '',
    "estimatedUnitCostMinor" BIGINT DEFAULT 0,
    "estimatedAmountMinor" BIGINT DEFAULT 0,
    "request" TEXT,
    "budgetCode" TEXT,
    "material" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdByUser" TEXT,
    "updatedByUser" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcurementRequestLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialReceipt" (
    "id" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL DEFAULT '',
    "status" "MaterialReceiptStatusType" NOT NULL DEFAULT 'recorded',
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "packingSlipReference" TEXT NOT NULL DEFAULT '',
    "evidenceFileName" TEXT NOT NULL DEFAULT '',
    "evidenceStorageKey" TEXT NOT NULL DEFAULT '',
    "evidenceChecksumSha256" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "request" TEXT,
    "commitment" TEXT,
    "tradePartner" TEXT,
    "receivedBy" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdByUser" TEXT,
    "updatedByUser" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialReceiptLine" (
    "id" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "quantityReceived" DECIMAL(18,4) NOT NULL,
    "quantityAccepted" DECIMAL(18,4) NOT NULL,
    "quantityRejected" DECIMAL(18,4) DEFAULT 0,
    "exceptionReason" TEXT NOT NULL DEFAULT '',
    "receipt" TEXT,
    "requestLine" TEXT,
    "material" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdByUser" TEXT,
    "updatedByUser" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialReceiptLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalPolicy" (
    "id" TEXT NOT NULL,
    "policyKey" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL DEFAULT '',
    "domain" "ApprovalPolicyDomainType" NOT NULL,
    "minimumAmountMinor" BIGINT DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "approverRole" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdByUser" TEXT,
    "updatedByUser" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL DEFAULT '',
    "requestNumber" TEXT NOT NULL DEFAULT '',
    "operation" TEXT NOT NULL DEFAULT '',
    "targetType" TEXT NOT NULL DEFAULT '',
    "targetId" TEXT NOT NULL DEFAULT '',
    "targetStatus" TEXT NOT NULL DEFAULT '',
    "canonicalSnapshot" TEXT NOT NULL DEFAULT '',
    "snapshotDigest" TEXT NOT NULL DEFAULT '',
    "amountMinor" BIGINT DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "status" "ApprovalRequestStatusType" NOT NULL DEFAULT 'pending',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "policy" TEXT,
    "requestedBy" TEXT,
    "assignedTo" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdByUser" TEXT,
    "updatedByUser" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalDecision" (
    "id" TEXT NOT NULL,
    "decision" "ApprovalDecisionDecisionType" NOT NULL,
    "comment" TEXT NOT NULL DEFAULT '',
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "request" TEXT,
    "decidedBy" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdByUser" TEXT,
    "updatedByUser" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentDistribution" (
    "id" TEXT NOT NULL,
    "distributionKey" TEXT NOT NULL DEFAULT '',
    "purpose" TEXT NOT NULL DEFAULT '',
    "distributedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "documentVersion" TEXT,
    "recipient" TEXT,
    "distributedBy" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdByUser" TEXT,
    "updatedByUser" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentAcknowledgement" (
    "id" TEXT NOT NULL,
    "acknowledgementKey" TEXT NOT NULL DEFAULT '',
    "acknowledgement" TEXT NOT NULL DEFAULT '',
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "distribution" TEXT,
    "acknowledgedBy" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdByUser" TEXT,
    "updatedByUser" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentAcknowledgement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DailyLogEntry_documents" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DailyLogEntry_documents_AB_pkey" PRIMARY KEY ("A", "B")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiCredential_tokenHash_key" ON "ApiCredential"("tokenHash");

-- CreateIndex
CREATE INDEX "ApiCredential_owner_idx" ON "ApiCredential"("owner");

-- CreateIndex
CREATE INDEX "ApiCredential_company_idx" ON "ApiCredential"("company");

-- CreateIndex
CREATE INDEX "ApiCredential_project_idx" ON "ApiCredential"("project");

-- CreateIndex
CREATE INDEX "ApiCredential_createdByUser_idx" ON "ApiCredential"("createdByUser");

-- CreateIndex
CREATE INDEX "ApiCredential_updatedByUser_idx" ON "ApiCredential"("updatedByUser");

-- CreateIndex
CREATE UNIQUE INDEX "AccountInvitation_tokenHash_key" ON "AccountInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "AccountInvitation_invitedBy_idx" ON "AccountInvitation"("invitedBy");

-- CreateIndex
CREATE INDEX "AccountInvitation_user_idx" ON "AccountInvitation"("user");

-- CreateIndex
CREATE INDEX "AccountInvitation_projectMembership_idx" ON "AccountInvitation"("projectMembership");

-- CreateIndex
CREATE INDEX "AccountInvitation_company_idx" ON "AccountInvitation"("company");

-- CreateIndex
CREATE INDEX "AccountInvitation_project_idx" ON "AccountInvitation"("project");

-- CreateIndex
CREATE INDEX "AccountInvitation_createdByUser_idx" ON "AccountInvitation"("createdByUser");

-- CreateIndex
CREATE INDEX "AccountInvitation_updatedByUser_idx" ON "AccountInvitation"("updatedByUser");

-- CreateIndex
CREATE INDEX "PaymentReversal_payment_idx" ON "PaymentReversal"("payment");

-- CreateIndex
CREATE INDEX "PaymentReversal_reversedBy_idx" ON "PaymentReversal"("reversedBy");

-- CreateIndex
CREATE INDEX "PaymentReversal_company_idx" ON "PaymentReversal"("company");

-- CreateIndex
CREATE INDEX "PaymentReversal_project_idx" ON "PaymentReversal"("project");

-- CreateIndex
CREATE INDEX "PaymentReversal_createdByUser_idx" ON "PaymentReversal"("createdByUser");

-- CreateIndex
CREATE INDEX "PaymentReversal_updatedByUser_idx" ON "PaymentReversal"("updatedByUser");

-- CreateIndex
CREATE INDEX "ProcurementRequest_requestedBy_idx" ON "ProcurementRequest"("requestedBy");

-- CreateIndex
CREATE INDEX "ProcurementRequest_approvedBy_idx" ON "ProcurementRequest"("approvedBy");

-- CreateIndex
CREATE INDEX "ProcurementRequest_tradePartner_idx" ON "ProcurementRequest"("tradePartner");

-- CreateIndex
CREATE INDEX "ProcurementRequest_commitment_idx" ON "ProcurementRequest"("commitment");

-- CreateIndex
CREATE INDEX "ProcurementRequest_company_idx" ON "ProcurementRequest"("company");

-- CreateIndex
CREATE INDEX "ProcurementRequest_project_idx" ON "ProcurementRequest"("project");

-- CreateIndex
CREATE INDEX "ProcurementRequest_createdByUser_idx" ON "ProcurementRequest"("createdByUser");

-- CreateIndex
CREATE INDEX "ProcurementRequest_updatedByUser_idx" ON "ProcurementRequest"("updatedByUser");

-- CreateIndex
CREATE INDEX "ProcurementRequestLine_request_idx" ON "ProcurementRequestLine"("request");

-- CreateIndex
CREATE INDEX "ProcurementRequestLine_budgetCode_idx" ON "ProcurementRequestLine"("budgetCode");

-- CreateIndex
CREATE INDEX "ProcurementRequestLine_material_idx" ON "ProcurementRequestLine"("material");

-- CreateIndex
CREATE INDEX "ProcurementRequestLine_company_idx" ON "ProcurementRequestLine"("company");

-- CreateIndex
CREATE INDEX "ProcurementRequestLine_project_idx" ON "ProcurementRequestLine"("project");

-- CreateIndex
CREATE INDEX "ProcurementRequestLine_createdByUser_idx" ON "ProcurementRequestLine"("createdByUser");

-- CreateIndex
CREATE INDEX "ProcurementRequestLine_updatedByUser_idx" ON "ProcurementRequestLine"("updatedByUser");

-- CreateIndex
CREATE INDEX "MaterialReceipt_request_idx" ON "MaterialReceipt"("request");

-- CreateIndex
CREATE INDEX "MaterialReceipt_commitment_idx" ON "MaterialReceipt"("commitment");

-- CreateIndex
CREATE INDEX "MaterialReceipt_tradePartner_idx" ON "MaterialReceipt"("tradePartner");

-- CreateIndex
CREATE INDEX "MaterialReceipt_receivedBy_idx" ON "MaterialReceipt"("receivedBy");

-- CreateIndex
CREATE INDEX "MaterialReceipt_company_idx" ON "MaterialReceipt"("company");

-- CreateIndex
CREATE INDEX "MaterialReceipt_project_idx" ON "MaterialReceipt"("project");

-- CreateIndex
CREATE INDEX "MaterialReceipt_createdByUser_idx" ON "MaterialReceipt"("createdByUser");

-- CreateIndex
CREATE INDEX "MaterialReceipt_updatedByUser_idx" ON "MaterialReceipt"("updatedByUser");

-- CreateIndex
CREATE INDEX "MaterialReceiptLine_receipt_idx" ON "MaterialReceiptLine"("receipt");

-- CreateIndex
CREATE INDEX "MaterialReceiptLine_requestLine_idx" ON "MaterialReceiptLine"("requestLine");

-- CreateIndex
CREATE INDEX "MaterialReceiptLine_material_idx" ON "MaterialReceiptLine"("material");

-- CreateIndex
CREATE INDEX "MaterialReceiptLine_company_idx" ON "MaterialReceiptLine"("company");

-- CreateIndex
CREATE INDEX "MaterialReceiptLine_project_idx" ON "MaterialReceiptLine"("project");

-- CreateIndex
CREATE INDEX "MaterialReceiptLine_createdByUser_idx" ON "MaterialReceiptLine"("createdByUser");

-- CreateIndex
CREATE INDEX "MaterialReceiptLine_updatedByUser_idx" ON "MaterialReceiptLine"("updatedByUser");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalPolicy_policyKey_key" ON "ApprovalPolicy"("policyKey");

-- CreateIndex
CREATE INDEX "ApprovalPolicy_approverRole_idx" ON "ApprovalPolicy"("approverRole");

-- CreateIndex
CREATE INDEX "ApprovalPolicy_company_idx" ON "ApprovalPolicy"("company");

-- CreateIndex
CREATE INDEX "ApprovalPolicy_project_idx" ON "ApprovalPolicy"("project");

-- CreateIndex
CREATE INDEX "ApprovalPolicy_createdByUser_idx" ON "ApprovalPolicy"("createdByUser");

-- CreateIndex
CREATE INDEX "ApprovalPolicy_updatedByUser_idx" ON "ApprovalPolicy"("updatedByUser");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalRequest_requestKey_key" ON "ApprovalRequest"("requestKey");

-- CreateIndex
CREATE INDEX "ApprovalRequest_policy_idx" ON "ApprovalRequest"("policy");

-- CreateIndex
CREATE INDEX "ApprovalRequest_requestedBy_idx" ON "ApprovalRequest"("requestedBy");

-- CreateIndex
CREATE INDEX "ApprovalRequest_assignedTo_idx" ON "ApprovalRequest"("assignedTo");

-- CreateIndex
CREATE INDEX "ApprovalRequest_company_idx" ON "ApprovalRequest"("company");

-- CreateIndex
CREATE INDEX "ApprovalRequest_project_idx" ON "ApprovalRequest"("project");

-- CreateIndex
CREATE INDEX "ApprovalRequest_createdByUser_idx" ON "ApprovalRequest"("createdByUser");

-- CreateIndex
CREATE INDEX "ApprovalRequest_updatedByUser_idx" ON "ApprovalRequest"("updatedByUser");

-- CreateIndex
CREATE INDEX "ApprovalDecision_request_idx" ON "ApprovalDecision"("request");

-- CreateIndex
CREATE INDEX "ApprovalDecision_decidedBy_idx" ON "ApprovalDecision"("decidedBy");

-- CreateIndex
CREATE INDEX "ApprovalDecision_company_idx" ON "ApprovalDecision"("company");

-- CreateIndex
CREATE INDEX "ApprovalDecision_project_idx" ON "ApprovalDecision"("project");

-- CreateIndex
CREATE INDEX "ApprovalDecision_createdByUser_idx" ON "ApprovalDecision"("createdByUser");

-- CreateIndex
CREATE INDEX "ApprovalDecision_updatedByUser_idx" ON "ApprovalDecision"("updatedByUser");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentDistribution_distributionKey_key" ON "DocumentDistribution"("distributionKey");

-- CreateIndex
CREATE INDEX "DocumentDistribution_documentVersion_idx" ON "DocumentDistribution"("documentVersion");

-- CreateIndex
CREATE INDEX "DocumentDistribution_recipient_idx" ON "DocumentDistribution"("recipient");

-- CreateIndex
CREATE INDEX "DocumentDistribution_distributedBy_idx" ON "DocumentDistribution"("distributedBy");

-- CreateIndex
CREATE INDEX "DocumentDistribution_company_idx" ON "DocumentDistribution"("company");

-- CreateIndex
CREATE INDEX "DocumentDistribution_project_idx" ON "DocumentDistribution"("project");

-- CreateIndex
CREATE INDEX "DocumentDistribution_createdByUser_idx" ON "DocumentDistribution"("createdByUser");

-- CreateIndex
CREATE INDEX "DocumentDistribution_updatedByUser_idx" ON "DocumentDistribution"("updatedByUser");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentAcknowledgement_acknowledgementKey_key" ON "DocumentAcknowledgement"("acknowledgementKey");

-- CreateIndex
CREATE INDEX "DocumentAcknowledgement_distribution_idx" ON "DocumentAcknowledgement"("distribution");

-- CreateIndex
CREATE INDEX "DocumentAcknowledgement_acknowledgedBy_idx" ON "DocumentAcknowledgement"("acknowledgedBy");

-- CreateIndex
CREATE INDEX "DocumentAcknowledgement_company_idx" ON "DocumentAcknowledgement"("company");

-- CreateIndex
CREATE INDEX "DocumentAcknowledgement_project_idx" ON "DocumentAcknowledgement"("project");

-- CreateIndex
CREATE INDEX "DocumentAcknowledgement_createdByUser_idx" ON "DocumentAcknowledgement"("createdByUser");

-- CreateIndex
CREATE INDEX "DocumentAcknowledgement_updatedByUser_idx" ON "DocumentAcknowledgement"("updatedByUser");

-- CreateIndex
CREATE INDEX "_DailyLogEntry_documents_B_index" ON "_DailyLogEntry_documents"("B");

-- CreateIndex
CREATE INDEX "AgentAction_createdByUser_idx" ON "AgentAction"("createdByUser");

-- CreateIndex
CREATE INDEX "AgentAction_updatedByUser_idx" ON "AgentAction"("updatedByUser");

-- CreateIndex
CREATE INDEX "AgentIdentity_createdByUser_idx" ON "AgentIdentity"("createdByUser");

-- CreateIndex
CREATE INDEX "AgentIdentity_updatedByUser_idx" ON "AgentIdentity"("updatedByUser");

-- CreateIndex
CREATE INDEX "AuthSession_createdByUser_idx" ON "AuthSession"("createdByUser");

-- CreateIndex
CREATE INDEX "AuthSession_updatedByUser_idx" ON "AuthSession"("updatedByUser");

-- CreateIndex
CREATE INDEX "BidInvitation_budgetCode_idx" ON "BidInvitation"("budgetCode");

-- CreateIndex
CREATE INDEX "BidInvitation_createdByUser_idx" ON "BidInvitation"("createdByUser");

-- CreateIndex
CREATE INDEX "BidInvitation_updatedByUser_idx" ON "BidInvitation"("updatedByUser");

-- CreateIndex
CREATE INDEX "BidLineItem_createdByUser_idx" ON "BidLineItem"("createdByUser");

-- CreateIndex
CREATE INDEX "BidLineItem_updatedByUser_idx" ON "BidLineItem"("updatedByUser");

-- CreateIndex
CREATE INDEX "BidPackage_createdByUser_idx" ON "BidPackage"("createdByUser");

-- CreateIndex
CREATE INDEX "BidPackage_updatedByUser_idx" ON "BidPackage"("updatedByUser");

-- CreateIndex
CREATE INDEX "BidSubmission_createdByUser_idx" ON "BidSubmission"("createdByUser");

-- CreateIndex
CREATE INDEX "BidSubmission_updatedByUser_idx" ON "BidSubmission"("updatedByUser");

-- CreateIndex
CREATE INDEX "Budget_createdByUser_idx" ON "Budget"("createdByUser");

-- CreateIndex
CREATE INDEX "Budget_updatedByUser_idx" ON "Budget"("updatedByUser");

-- CreateIndex
CREATE INDEX "BudgetChange_createdByUser_idx" ON "BudgetChange"("createdByUser");

-- CreateIndex
CREATE INDEX "BudgetChange_updatedByUser_idx" ON "BudgetChange"("updatedByUser");

-- CreateIndex
CREATE INDEX "BudgetChangeLineItem_createdByUser_idx" ON "BudgetChangeLineItem"("createdByUser");

-- CreateIndex
CREATE INDEX "BudgetChangeLineItem_updatedByUser_idx" ON "BudgetChangeLineItem"("updatedByUser");

-- CreateIndex
CREATE INDEX "BudgetCode_createdByUser_idx" ON "BudgetCode"("createdByUser");

-- CreateIndex
CREATE INDEX "BudgetCode_updatedByUser_idx" ON "BudgetCode"("updatedByUser");

-- CreateIndex
CREATE INDEX "BudgetLineItem_createdByUser_idx" ON "BudgetLineItem"("createdByUser");

-- CreateIndex
CREATE INDEX "BudgetLineItem_updatedByUser_idx" ON "BudgetLineItem"("updatedByUser");

-- CreateIndex
CREATE INDEX "ChangeEvent_createdByUser_idx" ON "ChangeEvent"("createdByUser");

-- CreateIndex
CREATE INDEX "ChangeEvent_updatedByUser_idx" ON "ChangeEvent"("updatedByUser");

-- CreateIndex
CREATE INDEX "ChangeEventLineItem_createdByUser_idx" ON "ChangeEventLineItem"("createdByUser");

-- CreateIndex
CREATE INDEX "ChangeEventLineItem_updatedByUser_idx" ON "ChangeEventLineItem"("updatedByUser");

-- CreateIndex
CREATE INDEX "ChangeOrder_createdByUser_idx" ON "ChangeOrder"("createdByUser");

-- CreateIndex
CREATE INDEX "ChangeOrder_updatedByUser_idx" ON "ChangeOrder"("updatedByUser");

-- CreateIndex
CREATE INDEX "ChangeOrderLineItem_createdByUser_idx" ON "ChangeOrderLineItem"("createdByUser");

-- CreateIndex
CREATE INDEX "ChangeOrderLineItem_updatedByUser_idx" ON "ChangeOrderLineItem"("updatedByUser");

-- CreateIndex
CREATE INDEX "ChangeQuote_createdByUser_idx" ON "ChangeQuote"("createdByUser");

-- CreateIndex
CREATE INDEX "ChangeQuote_updatedByUser_idx" ON "ChangeQuote"("updatedByUser");

-- CreateIndex
CREATE INDEX "Commitment_createdByUser_idx" ON "Commitment"("createdByUser");

-- CreateIndex
CREATE INDEX "Commitment_updatedByUser_idx" ON "Commitment"("updatedByUser");

-- CreateIndex
CREATE INDEX "Company_createdByUser_idx" ON "Company"("createdByUser");

-- CreateIndex
CREATE INDEX "Company_updatedByUser_idx" ON "Company"("updatedByUser");

-- CreateIndex
CREATE INDEX "CompanyMembership_createdByUser_idx" ON "CompanyMembership"("createdByUser");

-- CreateIndex
CREATE INDEX "CompanyMembership_updatedByUser_idx" ON "CompanyMembership"("updatedByUser");

-- CreateIndex
CREATE INDEX "ConstructionLead_createdByUser_idx" ON "ConstructionLead"("createdByUser");

-- CreateIndex
CREATE INDEX "ConstructionLead_updatedByUser_idx" ON "ConstructionLead"("updatedByUser");

-- CreateIndex
CREATE INDEX "ConstructionOpportunity_createdByUser_idx" ON "ConstructionOpportunity"("createdByUser");

-- CreateIndex
CREATE INDEX "ConstructionOpportunity_updatedByUser_idx" ON "ConstructionOpportunity"("updatedByUser");

-- CreateIndex
CREATE INDEX "ContractLineItem_createdByUser_idx" ON "ContractLineItem"("createdByUser");

-- CreateIndex
CREATE INDEX "ContractLineItem_updatedByUser_idx" ON "ContractLineItem"("updatedByUser");

-- CreateIndex
CREATE INDEX "CorrectiveAction_createdByUser_idx" ON "CorrectiveAction"("createdByUser");

-- CreateIndex
CREATE INDEX "CorrectiveAction_updatedByUser_idx" ON "CorrectiveAction"("updatedByUser");

-- CreateIndex
CREATE INDEX "CostCode_createdByUser_idx" ON "CostCode"("createdByUser");

-- CreateIndex
CREATE INDEX "CostCode_updatedByUser_idx" ON "CostCode"("updatedByUser");

-- CreateIndex
CREATE INDEX "DailyLog_createdByUser_idx" ON "DailyLog"("createdByUser");

-- CreateIndex
CREATE INDEX "DailyLog_updatedByUser_idx" ON "DailyLog"("updatedByUser");

-- CreateIndex
CREATE INDEX "DailyLogEntry_createdByUser_idx" ON "DailyLogEntry"("createdByUser");

-- CreateIndex
CREATE INDEX "DailyLogEntry_updatedByUser_idx" ON "DailyLogEntry"("updatedByUser");

-- CreateIndex
CREATE INDEX "DirectCost_voidedBy_idx" ON "DirectCost"("voidedBy");

-- CreateIndex
CREATE INDEX "DirectCost_createdByUser_idx" ON "DirectCost"("createdByUser");

-- CreateIndex
CREATE INDEX "DirectCost_updatedByUser_idx" ON "DirectCost"("updatedByUser");

-- CreateIndex
CREATE INDEX "Document_createdByUser_idx" ON "Document"("createdByUser");

-- CreateIndex
CREATE INDEX "Document_updatedByUser_idx" ON "Document"("updatedByUser");

-- CreateIndex
CREATE INDEX "DocumentVersion_createdByUser_idx" ON "DocumentVersion"("createdByUser");

-- CreateIndex
CREATE INDEX "DocumentVersion_updatedByUser_idx" ON "DocumentVersion"("updatedByUser");

-- CreateIndex
CREATE INDEX "Drawing_createdByUser_idx" ON "Drawing"("createdByUser");

-- CreateIndex
CREATE INDEX "Drawing_updatedByUser_idx" ON "Drawing"("updatedByUser");

-- CreateIndex
CREATE INDEX "DrawingRevision_createdByUser_idx" ON "DrawingRevision"("createdByUser");

-- CreateIndex
CREATE INDEX "DrawingRevision_updatedByUser_idx" ON "DrawingRevision"("updatedByUser");

-- CreateIndex
CREATE INDEX "Equipment_createdByUser_idx" ON "Equipment"("createdByUser");

-- CreateIndex
CREATE INDEX "Equipment_updatedByUser_idx" ON "Equipment"("updatedByUser");

-- CreateIndex
CREATE INDEX "Estimate_createdByUser_idx" ON "Estimate"("createdByUser");

-- CreateIndex
CREATE INDEX "Estimate_updatedByUser_idx" ON "Estimate"("updatedByUser");

-- CreateIndex
CREATE INDEX "EstimateLineItem_createdByUser_idx" ON "EstimateLineItem"("createdByUser");

-- CreateIndex
CREATE INDEX "EstimateLineItem_updatedByUser_idx" ON "EstimateLineItem"("updatedByUser");

-- CreateIndex
CREATE INDEX "EstimateVersion_createdByUser_idx" ON "EstimateVersion"("createdByUser");

-- CreateIndex
CREATE INDEX "EstimateVersion_updatedByUser_idx" ON "EstimateVersion"("updatedByUser");

-- CreateIndex
CREATE INDEX "IdempotencyKey_createdByUser_idx" ON "IdempotencyKey"("createdByUser");

-- CreateIndex
CREATE INDEX "IdempotencyKey_updatedByUser_idx" ON "IdempotencyKey"("updatedByUser");

-- CreateIndex
CREATE INDEX "Inspection_createdByUser_idx" ON "Inspection"("createdByUser");

-- CreateIndex
CREATE INDEX "Inspection_updatedByUser_idx" ON "Inspection"("updatedByUser");

-- CreateIndex
CREATE INDEX "InspectionItem_createdByUser_idx" ON "InspectionItem"("createdByUser");

-- CreateIndex
CREATE INDEX "InspectionItem_updatedByUser_idx" ON "InspectionItem"("updatedByUser");

-- CreateIndex
CREATE INDEX "InspectionTemplate_createdByUser_idx" ON "InspectionTemplate"("createdByUser");

-- CreateIndex
CREATE INDEX "InspectionTemplate_updatedByUser_idx" ON "InspectionTemplate"("updatedByUser");

-- CreateIndex
CREATE INDEX "LaborEntry_createdByUser_idx" ON "LaborEntry"("createdByUser");

-- CreateIndex
CREATE INDEX "LaborEntry_updatedByUser_idx" ON "LaborEntry"("updatedByUser");

-- CreateIndex
CREATE INDEX "LienWaiver_createdByUser_idx" ON "LienWaiver"("createdByUser");

-- CreateIndex
CREATE INDEX "LienWaiver_updatedByUser_idx" ON "LienWaiver"("updatedByUser");

-- CreateIndex
CREATE INDEX "Material_createdByUser_idx" ON "Material"("createdByUser");

-- CreateIndex
CREATE INDEX "Material_updatedByUser_idx" ON "Material"("updatedByUser");

-- CreateIndex
CREATE INDEX "OutboxMessage_createdByUser_idx" ON "OutboxMessage"("createdByUser");

-- CreateIndex
CREATE INDEX "OutboxMessage_updatedByUser_idx" ON "OutboxMessage"("updatedByUser");

-- CreateIndex
CREATE INDEX "Payment_createdByUser_idx" ON "Payment"("createdByUser");

-- CreateIndex
CREATE INDEX "Payment_updatedByUser_idx" ON "Payment"("updatedByUser");

-- CreateIndex
CREATE INDEX "PaymentAllocation_createdByUser_idx" ON "PaymentAllocation"("createdByUser");

-- CreateIndex
CREATE INDEX "PaymentAllocation_updatedByUser_idx" ON "PaymentAllocation"("updatedByUser");

-- CreateIndex
CREATE INDEX "PrimeContract_createdByUser_idx" ON "PrimeContract"("createdByUser");

-- CreateIndex
CREATE INDEX "PrimeContract_updatedByUser_idx" ON "PrimeContract"("updatedByUser");

-- CreateIndex
CREATE INDEX "ProgressClaim_createdByUser_idx" ON "ProgressClaim"("createdByUser");

-- CreateIndex
CREATE INDEX "ProgressClaim_updatedByUser_idx" ON "ProgressClaim"("updatedByUser");

-- CreateIndex
CREATE INDEX "ProgressClaimLineItem_createdByUser_idx" ON "ProgressClaimLineItem"("createdByUser");

-- CreateIndex
CREATE INDEX "ProgressClaimLineItem_updatedByUser_idx" ON "ProgressClaimLineItem"("updatedByUser");

-- CreateIndex
CREATE INDEX "Project_createdByUser_idx" ON "Project"("createdByUser");

-- CreateIndex
CREATE INDEX "Project_updatedByUser_idx" ON "Project"("updatedByUser");

-- CreateIndex
CREATE INDEX "ProjectLocation_createdByUser_idx" ON "ProjectLocation"("createdByUser");

-- CreateIndex
CREATE INDEX "ProjectLocation_updatedByUser_idx" ON "ProjectLocation"("updatedByUser");

-- CreateIndex
CREATE INDEX "ProjectMembership_createdByUser_idx" ON "ProjectMembership"("createdByUser");

-- CreateIndex
CREATE INDEX "ProjectMembership_updatedByUser_idx" ON "ProjectMembership"("updatedByUser");

-- CreateIndex
CREATE INDEX "PunchItem_createdByUser_idx" ON "PunchItem"("createdByUser");

-- CreateIndex
CREATE INDEX "PunchItem_updatedByUser_idx" ON "PunchItem"("updatedByUser");

-- CreateIndex
CREATE INDEX "RFI_createdByUser_idx" ON "RFI"("createdByUser");

-- CreateIndex
CREATE INDEX "RFI_updatedByUser_idx" ON "RFI"("updatedByUser");

-- CreateIndex
CREATE INDEX "RFIResponse_createdByUser_idx" ON "RFIResponse"("createdByUser");

-- CreateIndex
CREATE INDEX "RFIResponse_updatedByUser_idx" ON "RFIResponse"("updatedByUser");

-- CreateIndex
CREATE INDEX "ResourceLog_createdByUser_idx" ON "ResourceLog"("createdByUser");

-- CreateIndex
CREATE INDEX "ResourceLog_updatedByUser_idx" ON "ResourceLog"("updatedByUser");

-- CreateIndex
CREATE INDEX "RetainageRelease_createdByUser_idx" ON "RetainageRelease"("createdByUser");

-- CreateIndex
CREATE INDEX "RetainageRelease_updatedByUser_idx" ON "RetainageRelease"("updatedByUser");

-- CreateIndex
CREATE INDEX "Role_createdByUser_idx" ON "Role"("createdByUser");

-- CreateIndex
CREATE INDEX "Role_updatedByUser_idx" ON "Role"("updatedByUser");

-- CreateIndex
CREATE INDEX "SafetyIncident_createdByUser_idx" ON "SafetyIncident"("createdByUser");

-- CreateIndex
CREATE INDEX "SafetyIncident_updatedByUser_idx" ON "SafetyIncident"("updatedByUser");

-- CreateIndex
CREATE INDEX "SafetyObservation_createdByUser_idx" ON "SafetyObservation"("createdByUser");

-- CreateIndex
CREATE INDEX "SafetyObservation_updatedByUser_idx" ON "SafetyObservation"("updatedByUser");

-- CreateIndex
CREATE INDEX "Schedule_createdByUser_idx" ON "Schedule"("createdByUser");

-- CreateIndex
CREATE INDEX "Schedule_updatedByUser_idx" ON "Schedule"("updatedByUser");

-- CreateIndex
CREATE INDEX "ScheduleDependency_createdByUser_idx" ON "ScheduleDependency"("createdByUser");

-- CreateIndex
CREATE INDEX "ScheduleDependency_updatedByUser_idx" ON "ScheduleDependency"("updatedByUser");

-- CreateIndex
CREATE INDEX "ScheduleTask_createdByUser_idx" ON "ScheduleTask"("createdByUser");

-- CreateIndex
CREATE INDEX "ScheduleTask_updatedByUser_idx" ON "ScheduleTask"("updatedByUser");

-- CreateIndex
CREATE INDEX "ScopeGrant_createdByUser_idx" ON "ScopeGrant"("createdByUser");

-- CreateIndex
CREATE INDEX "ScopeGrant_updatedByUser_idx" ON "ScopeGrant"("updatedByUser");

-- CreateIndex
CREATE INDEX "SpecificationSection_createdByUser_idx" ON "SpecificationSection"("createdByUser");

-- CreateIndex
CREATE INDEX "SpecificationSection_updatedByUser_idx" ON "SpecificationSection"("updatedByUser");

-- CreateIndex
CREATE INDEX "Submittal_createdByUser_idx" ON "Submittal"("createdByUser");

-- CreateIndex
CREATE INDEX "Submittal_updatedByUser_idx" ON "Submittal"("updatedByUser");

-- CreateIndex
CREATE INDEX "SubmittalReview_createdByUser_idx" ON "SubmittalReview"("createdByUser");

-- CreateIndex
CREATE INDEX "SubmittalReview_updatedByUser_idx" ON "SubmittalReview"("updatedByUser");

-- CreateIndex
CREATE INDEX "TradePartner_createdByUser_idx" ON "TradePartner"("createdByUser");

-- CreateIndex
CREATE INDEX "TradePartner_updatedByUser_idx" ON "TradePartner"("updatedByUser");

-- CreateIndex
CREATE INDEX "User_createdByUser_idx" ON "User"("createdByUser");

-- CreateIndex
CREATE INDEX "User_updatedByUser_idx" ON "User"("updatedByUser");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiCredential" ADD CONSTRAINT "ApiCredential_owner_fkey" FOREIGN KEY ("owner") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiCredential" ADD CONSTRAINT "ApiCredential_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiCredential" ADD CONSTRAINT "ApiCredential_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiCredential" ADD CONSTRAINT "ApiCredential_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiCredential" ADD CONSTRAINT "ApiCredential_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountInvitation" ADD CONSTRAINT "AccountInvitation_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountInvitation" ADD CONSTRAINT "AccountInvitation_user_fkey" FOREIGN KEY ("user") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountInvitation" ADD CONSTRAINT "AccountInvitation_projectMembership_fkey" FOREIGN KEY ("projectMembership") REFERENCES "ProjectMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountInvitation" ADD CONSTRAINT "AccountInvitation_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountInvitation" ADD CONSTRAINT "AccountInvitation_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountInvitation" ADD CONSTRAINT "AccountInvitation_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountInvitation" ADD CONSTRAINT "AccountInvitation_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMembership" ADD CONSTRAINT "CompanyMembership_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMembership" ADD CONSTRAINT "CompanyMembership_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMembership" ADD CONSTRAINT "ProjectMembership_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMembership" ADD CONSTRAINT "ProjectMembership_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradePartner" ADD CONSTRAINT "TradePartner_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradePartner" ADD CONSTRAINT "TradePartner_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectLocation" ADD CONSTRAINT "ProjectLocation_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectLocation" ADD CONSTRAINT "ProjectLocation_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostCode" ADD CONSTRAINT "CostCode_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostCode" ADD CONSTRAINT "CostCode_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetCode" ADD CONSTRAINT "BudgetCode_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetCode" ADD CONSTRAINT "BudgetCode_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConstructionLead" ADD CONSTRAINT "ConstructionLead_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConstructionLead" ADD CONSTRAINT "ConstructionLead_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConstructionOpportunity" ADD CONSTRAINT "ConstructionOpportunity_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConstructionOpportunity" ADD CONSTRAINT "ConstructionOpportunity_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidPackage" ADD CONSTRAINT "BidPackage_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidPackage" ADD CONSTRAINT "BidPackage_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidInvitation" ADD CONSTRAINT "BidInvitation_budgetCode_fkey" FOREIGN KEY ("budgetCode") REFERENCES "BudgetCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidInvitation" ADD CONSTRAINT "BidInvitation_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidInvitation" ADD CONSTRAINT "BidInvitation_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidSubmission" ADD CONSTRAINT "BidSubmission_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidSubmission" ADD CONSTRAINT "BidSubmission_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidLineItem" ADD CONSTRAINT "BidLineItem_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidLineItem" ADD CONSTRAINT "BidLineItem_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateVersion" ADD CONSTRAINT "EstimateVersion_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateVersion" ADD CONSTRAINT "EstimateVersion_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateLineItem" ADD CONSTRAINT "EstimateLineItem_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateLineItem" ADD CONSTRAINT "EstimateLineItem_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLineItem" ADD CONSTRAINT "BudgetLineItem_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLineItem" ADD CONSTRAINT "BudgetLineItem_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetChange" ADD CONSTRAINT "BudgetChange_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetChange" ADD CONSTRAINT "BudgetChange_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetChangeLineItem" ADD CONSTRAINT "BudgetChangeLineItem_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetChangeLineItem" ADD CONSTRAINT "BudgetChangeLineItem_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectCost" ADD CONSTRAINT "DirectCost_voidedBy_fkey" FOREIGN KEY ("voidedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectCost" ADD CONSTRAINT "DirectCost_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectCost" ADD CONSTRAINT "DirectCost_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrimeContract" ADD CONSTRAINT "PrimeContract_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrimeContract" ADD CONSTRAINT "PrimeContract_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commitment" ADD CONSTRAINT "Commitment_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commitment" ADD CONSTRAINT "Commitment_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractLineItem" ADD CONSTRAINT "ContractLineItem_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractLineItem" ADD CONSTRAINT "ContractLineItem_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeEvent" ADD CONSTRAINT "ChangeEvent_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeEvent" ADD CONSTRAINT "ChangeEvent_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeEventLineItem" ADD CONSTRAINT "ChangeEventLineItem_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeEventLineItem" ADD CONSTRAINT "ChangeEventLineItem_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeQuote" ADD CONSTRAINT "ChangeQuote_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeQuote" ADD CONSTRAINT "ChangeQuote_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeOrder" ADD CONSTRAINT "ChangeOrder_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeOrder" ADD CONSTRAINT "ChangeOrder_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeOrderLineItem" ADD CONSTRAINT "ChangeOrderLineItem_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeOrderLineItem" ADD CONSTRAINT "ChangeOrderLineItem_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFI" ADD CONSTRAINT "RFI_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFI" ADD CONSTRAINT "RFI_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFIResponse" ADD CONSTRAINT "RFIResponse_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFIResponse" ADD CONSTRAINT "RFIResponse_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecificationSection" ADD CONSTRAINT "SpecificationSection_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecificationSection" ADD CONSTRAINT "SpecificationSection_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submittal" ADD CONSTRAINT "Submittal_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submittal" ADD CONSTRAINT "Submittal_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmittalReview" ADD CONSTRAINT "SubmittalReview_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmittalReview" ADD CONSTRAINT "SubmittalReview_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Drawing" ADD CONSTRAINT "Drawing_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Drawing" ADD CONSTRAINT "Drawing_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingRevision" ADD CONSTRAINT "DrawingRevision_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingRevision" ADD CONSTRAINT "DrawingRevision_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLog" ADD CONSTRAINT "DailyLog_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLog" ADD CONSTRAINT "DailyLog_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLogEntry" ADD CONSTRAINT "DailyLogEntry_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLogEntry" ADD CONSTRAINT "DailyLogEntry_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleTask" ADD CONSTRAINT "ScheduleTask_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleTask" ADD CONSTRAINT "ScheduleTask_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleDependency" ADD CONSTRAINT "ScheduleDependency_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleDependency" ADD CONSTRAINT "ScheduleDependency_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PunchItem" ADD CONSTRAINT "PunchItem_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PunchItem" ADD CONSTRAINT "PunchItem_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaborEntry" ADD CONSTRAINT "LaborEntry_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaborEntry" ADD CONSTRAINT "LaborEntry_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceLog" ADD CONSTRAINT "ResourceLog_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceLog" ADD CONSTRAINT "ResourceLog_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyIncident" ADD CONSTRAINT "SafetyIncident_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyIncident" ADD CONSTRAINT "SafetyIncident_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyObservation" ADD CONSTRAINT "SafetyObservation_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyObservation" ADD CONSTRAINT "SafetyObservation_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionTemplate" ADD CONSTRAINT "InspectionTemplate_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionTemplate" ADD CONSTRAINT "InspectionTemplate_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionItem" ADD CONSTRAINT "InspectionItem_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionItem" ADD CONSTRAINT "InspectionItem_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressClaim" ADD CONSTRAINT "ProgressClaim_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressClaim" ADD CONSTRAINT "ProgressClaim_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressClaimLineItem" ADD CONSTRAINT "ProgressClaimLineItem_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressClaimLineItem" ADD CONSTRAINT "ProgressClaimLineItem_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReversal" ADD CONSTRAINT "PaymentReversal_payment_fkey" FOREIGN KEY ("payment") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReversal" ADD CONSTRAINT "PaymentReversal_reversedBy_fkey" FOREIGN KEY ("reversedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReversal" ADD CONSTRAINT "PaymentReversal_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReversal" ADD CONSTRAINT "PaymentReversal_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReversal" ADD CONSTRAINT "PaymentReversal_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReversal" ADD CONSTRAINT "PaymentReversal_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetainageRelease" ADD CONSTRAINT "RetainageRelease_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetainageRelease" ADD CONSTRAINT "RetainageRelease_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LienWaiver" ADD CONSTRAINT "LienWaiver_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LienWaiver" ADD CONSTRAINT "LienWaiver_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementRequest" ADD CONSTRAINT "ProcurementRequest_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementRequest" ADD CONSTRAINT "ProcurementRequest_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementRequest" ADD CONSTRAINT "ProcurementRequest_tradePartner_fkey" FOREIGN KEY ("tradePartner") REFERENCES "TradePartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementRequest" ADD CONSTRAINT "ProcurementRequest_commitment_fkey" FOREIGN KEY ("commitment") REFERENCES "Commitment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementRequest" ADD CONSTRAINT "ProcurementRequest_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementRequest" ADD CONSTRAINT "ProcurementRequest_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementRequest" ADD CONSTRAINT "ProcurementRequest_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementRequest" ADD CONSTRAINT "ProcurementRequest_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementRequestLine" ADD CONSTRAINT "ProcurementRequestLine_request_fkey" FOREIGN KEY ("request") REFERENCES "ProcurementRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementRequestLine" ADD CONSTRAINT "ProcurementRequestLine_budgetCode_fkey" FOREIGN KEY ("budgetCode") REFERENCES "BudgetCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementRequestLine" ADD CONSTRAINT "ProcurementRequestLine_material_fkey" FOREIGN KEY ("material") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementRequestLine" ADD CONSTRAINT "ProcurementRequestLine_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementRequestLine" ADD CONSTRAINT "ProcurementRequestLine_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementRequestLine" ADD CONSTRAINT "ProcurementRequestLine_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementRequestLine" ADD CONSTRAINT "ProcurementRequestLine_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReceipt" ADD CONSTRAINT "MaterialReceipt_request_fkey" FOREIGN KEY ("request") REFERENCES "ProcurementRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReceipt" ADD CONSTRAINT "MaterialReceipt_commitment_fkey" FOREIGN KEY ("commitment") REFERENCES "Commitment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReceipt" ADD CONSTRAINT "MaterialReceipt_tradePartner_fkey" FOREIGN KEY ("tradePartner") REFERENCES "TradePartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReceipt" ADD CONSTRAINT "MaterialReceipt_receivedBy_fkey" FOREIGN KEY ("receivedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReceipt" ADD CONSTRAINT "MaterialReceipt_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReceipt" ADD CONSTRAINT "MaterialReceipt_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReceipt" ADD CONSTRAINT "MaterialReceipt_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReceipt" ADD CONSTRAINT "MaterialReceipt_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReceiptLine" ADD CONSTRAINT "MaterialReceiptLine_receipt_fkey" FOREIGN KEY ("receipt") REFERENCES "MaterialReceipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReceiptLine" ADD CONSTRAINT "MaterialReceiptLine_requestLine_fkey" FOREIGN KEY ("requestLine") REFERENCES "ProcurementRequestLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReceiptLine" ADD CONSTRAINT "MaterialReceiptLine_material_fkey" FOREIGN KEY ("material") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReceiptLine" ADD CONSTRAINT "MaterialReceiptLine_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReceiptLine" ADD CONSTRAINT "MaterialReceiptLine_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReceiptLine" ADD CONSTRAINT "MaterialReceiptLine_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialReceiptLine" ADD CONSTRAINT "MaterialReceiptLine_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalPolicy" ADD CONSTRAINT "ApprovalPolicy_approverRole_fkey" FOREIGN KEY ("approverRole") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalPolicy" ADD CONSTRAINT "ApprovalPolicy_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalPolicy" ADD CONSTRAINT "ApprovalPolicy_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalPolicy" ADD CONSTRAINT "ApprovalPolicy_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalPolicy" ADD CONSTRAINT "ApprovalPolicy_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_policy_fkey" FOREIGN KEY ("policy") REFERENCES "ApprovalPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "ProjectMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalDecision" ADD CONSTRAINT "ApprovalDecision_request_fkey" FOREIGN KEY ("request") REFERENCES "ApprovalRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalDecision" ADD CONSTRAINT "ApprovalDecision_decidedBy_fkey" FOREIGN KEY ("decidedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalDecision" ADD CONSTRAINT "ApprovalDecision_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalDecision" ADD CONSTRAINT "ApprovalDecision_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalDecision" ADD CONSTRAINT "ApprovalDecision_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalDecision" ADD CONSTRAINT "ApprovalDecision_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentDistribution" ADD CONSTRAINT "DocumentDistribution_documentVersion_fkey" FOREIGN KEY ("documentVersion") REFERENCES "DocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentDistribution" ADD CONSTRAINT "DocumentDistribution_recipient_fkey" FOREIGN KEY ("recipient") REFERENCES "ProjectMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentDistribution" ADD CONSTRAINT "DocumentDistribution_distributedBy_fkey" FOREIGN KEY ("distributedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentDistribution" ADD CONSTRAINT "DocumentDistribution_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentDistribution" ADD CONSTRAINT "DocumentDistribution_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentDistribution" ADD CONSTRAINT "DocumentDistribution_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentDistribution" ADD CONSTRAINT "DocumentDistribution_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAcknowledgement" ADD CONSTRAINT "DocumentAcknowledgement_distribution_fkey" FOREIGN KEY ("distribution") REFERENCES "DocumentDistribution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAcknowledgement" ADD CONSTRAINT "DocumentAcknowledgement_acknowledgedBy_fkey" FOREIGN KEY ("acknowledgedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAcknowledgement" ADD CONSTRAINT "DocumentAcknowledgement_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAcknowledgement" ADD CONSTRAINT "DocumentAcknowledgement_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAcknowledgement" ADD CONSTRAINT "DocumentAcknowledgement_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAcknowledgement" ADD CONSTRAINT "DocumentAcknowledgement_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentIdentity" ADD CONSTRAINT "AgentIdentity_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentIdentity" ADD CONSTRAINT "AgentIdentity_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScopeGrant" ADD CONSTRAINT "ScopeGrant_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScopeGrant" ADD CONSTRAINT "ScopeGrant_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentAction" ADD CONSTRAINT "AgentAction_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentAction" ADD CONSTRAINT "AgentAction_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdempotencyKey" ADD CONSTRAINT "IdempotencyKey_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdempotencyKey" ADD CONSTRAINT "IdempotencyKey_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboxMessage" ADD CONSTRAINT "OutboxMessage_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboxMessage" ADD CONSTRAINT "OutboxMessage_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DailyLogEntry_documents" ADD CONSTRAINT "_DailyLogEntry_documents_A_fkey" FOREIGN KEY ("A") REFERENCES "DailyLogEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DailyLogEntry_documents" ADD CONSTRAINT "_DailyLogEntry_documents_B_fkey" FOREIGN KEY ("B") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
