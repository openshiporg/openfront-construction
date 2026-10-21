/*
  Warnings:

  - You are about to drop the column `canCreateTodos` on the `Role` table. All the data in the column will be lost.
  - You are about to drop the column `canEditOtherPeople` on the `Role` table. All the data in the column will be lost.
  - You are about to drop the column `canManageAllTodos` on the `Role` table. All the data in the column will be lost.
  - You are about to drop the column `canSeeOtherPeople` on the `Role` table. All the data in the column will be lost.
  - You are about to drop the `Todo` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TodoImage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_Todo_todoImages` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "UserOnboardingStatusType" AS ENUM ('not_started', 'in_progress', 'completed', 'dismissed');

-- CreateEnum
CREATE TYPE "CompanyStatusType" AS ENUM ('active', 'suspended', 'archived');

-- CreateEnum
CREATE TYPE "CompanyMembershipStatusType" AS ENUM ('invited', 'active', 'suspended', 'revoked');

-- CreateEnum
CREATE TYPE "ProjectStatusType" AS ENUM ('planning', 'active', 'on_hold', 'completed', 'archived');

-- CreateEnum
CREATE TYPE "ProjectMembershipStatusType" AS ENUM ('invited', 'active', 'suspended', 'revoked');

-- CreateEnum
CREATE TYPE "ProjectMembershipAccessLevelType" AS ENUM ('viewer', 'contributor', 'manager');

-- CreateEnum
CREATE TYPE "TradePartnerPartnerTypeType" AS ENUM ('owner', 'designer', 'subcontractor', 'vendor', 'consultant', 'authority');

-- CreateEnum
CREATE TYPE "TradePartnerStatusType" AS ENUM ('prospective', 'approved', 'inactive', 'blocked');

-- CreateEnum
CREATE TYPE "ProjectLocationLocationTypeType" AS ENUM ('site', 'building', 'floor', 'area', 'room', 'zone');

-- CreateEnum
CREATE TYPE "BudgetCodeCostTypeType" AS ENUM ('labor', 'material', 'subcontract', 'equipment', 'other');

-- CreateEnum
CREATE TYPE "BidPackageStatusType" AS ENUM ('draft', 'open', 'closed', 'awarded', 'archived');

-- CreateEnum
CREATE TYPE "BidPackageBidTypeType" AS ENUM ('lump_sum', 'unit_price', 'cost_plus');

-- CreateEnum
CREATE TYPE "BidInvitationStatusType" AS ENUM ('draft', 'invited', 'viewed', 'intent_to_bid', 'declined', 'submitted');

-- CreateEnum
CREATE TYPE "BidSubmissionStatusType" AS ENUM ('draft', 'submitted', 'under_review', 'accepted', 'rejected', 'withdrawn');

-- CreateEnum
CREATE TYPE "EstimateStatusType" AS ENUM ('draft', 'internal_review', 'issued', 'accepted', 'rejected', 'superseded');

-- CreateEnum
CREATE TYPE "EstimateVersionStatusType" AS ENUM ('draft', 'issued', 'superseded');

-- CreateEnum
CREATE TYPE "BudgetStatusType" AS ENUM ('draft', 'approved', 'active', 'closed');

-- CreateEnum
CREATE TYPE "BudgetChangeStatusType" AS ENUM ('draft', 'pending_approval', 'approved', 'rejected', 'posted');

-- CreateEnum
CREATE TYPE "DirectCostCostTypeType" AS ENUM ('invoice', 'expense', 'payroll', 'equipment', 'material', 'adjustment');

-- CreateEnum
CREATE TYPE "DirectCostStatusType" AS ENUM ('draft', 'pending', 'approved', 'posted', 'voided');

-- CreateEnum
CREATE TYPE "PrimeContractContractTypeType" AS ENUM ('lump_sum', 'gmp', 'cost_plus', 'unit_price');

-- CreateEnum
CREATE TYPE "PrimeContractStatusType" AS ENUM ('draft', 'pending_approval', 'approved', 'rejected', 'executed', 'closed');

-- CreateEnum
CREATE TYPE "CommitmentCommitmentTypeType" AS ENUM ('subcontract', 'purchase_order');

-- CreateEnum
CREATE TYPE "CommitmentStatusType" AS ENUM ('draft', 'out_for_signature', 'executed', 'complete', 'closed', 'cancelled', 'terminated');

-- CreateEnum
CREATE TYPE "ChangeEventEventTypeType" AS ENUM ('owner_request', 'design_development', 'design_error', 'existing_condition', 'allowance', 'backcharge', 'other');

-- CreateEnum
CREATE TYPE "ChangeEventStatusType" AS ENUM ('open', 'pricing', 'pending_approval', 'approved', 'rejected', 'incorporated', 'voided');

-- CreateEnum
CREATE TYPE "ChangeQuoteStatusType" AS ENUM ('requested', 'received', 'accepted', 'rejected', 'withdrawn');

-- CreateEnum
CREATE TYPE "ChangeOrderDirectionType" AS ENUM ('owner', 'commitment');

-- CreateEnum
CREATE TYPE "ChangeOrderStatusType" AS ENUM ('draft', 'pending_approval', 'approved', 'rejected', 'executed', 'posted');

-- CreateEnum
CREATE TYPE "RFIStatusType" AS ENUM ('draft', 'open', 'answered', 'closed', 'voided');

-- CreateEnum
CREATE TYPE "RFIPriorityType" AS ENUM ('low', 'normal', 'high', 'critical');

-- CreateEnum
CREATE TYPE "RFICostImpactType" AS ENUM ('unknown', 'none', 'potential', 'confirmed');

-- CreateEnum
CREATE TYPE "SubmittalSubmittalTypeType" AS ENUM ('shop_drawing', 'product_data', 'sample', 'closeout', 'mockup', 'other');

-- CreateEnum
CREATE TYPE "SubmittalStatusType" AS ENUM ('draft', 'submitted', 'under_review', 'approved', 'revise_resubmit', 'rejected', 'closed', 'voided');

-- CreateEnum
CREATE TYPE "SubmittalReviewStatusType" AS ENUM ('pending', 'in_review', 'approved', 'approved_as_noted', 'revise_resubmit', 'rejected');

-- CreateEnum
CREATE TYPE "DrawingStatusType" AS ENUM ('active', 'archived', 'voided');

-- CreateEnum
CREATE TYPE "DrawingRevisionStatusType" AS ENUM ('draft', 'issued', 'superseded', 'voided');

-- CreateEnum
CREATE TYPE "DocumentDocumentTypeType" AS ENUM ('contract', 'specification', 'submittal', 'rfi', 'report', 'photo', 'correspondence', 'other');

-- CreateEnum
CREATE TYPE "DocumentStatusType" AS ENUM ('active', 'archived', 'voided');

-- CreateEnum
CREATE TYPE "DailyLogStatusType" AS ENUM ('draft', 'submitted', 'approved');

-- CreateEnum
CREATE TYPE "DailyLogEntryEntryTypeType" AS ENUM ('weather', 'manpower', 'equipment', 'delivery', 'material', 'safety', 'inspection', 'delay', 'progress', 'visitor', 'note');

-- CreateEnum
CREATE TYPE "ScheduleScheduleTypeType" AS ENUM ('baseline', 'current', 'lookahead', 'recovery');

-- CreateEnum
CREATE TYPE "ScheduleStatusType" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "ScheduleTaskStatusType" AS ENUM ('not_started', 'in_progress', 'completed', 'delayed', 'on_hold');

-- CreateEnum
CREATE TYPE "ScheduleDependencyDependencyTypeType" AS ENUM ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish');

-- CreateEnum
CREATE TYPE "PunchItemStatusType" AS ENUM ('open', 'in_progress', 'ready_for_review', 'closed', 'voided');

-- CreateEnum
CREATE TYPE "PunchItemPriorityType" AS ENUM ('low', 'normal', 'high', 'critical');

-- CreateEnum
CREATE TYPE "LaborEntryLaborTypeType" AS ENUM ('employee', 'temporary', 'subcontractor');

-- CreateEnum
CREATE TYPE "EquipmentOwnershipTypeType" AS ENUM ('owned', 'leased', 'rented', 'partner');

-- CreateEnum
CREATE TYPE "EquipmentStatusType" AS ENUM ('available', 'in_use', 'out_of_service', 'retired');

-- CreateEnum
CREATE TYPE "MaterialIsActiveType" AS ENUM ('active', 'inactive', 'discontinued');

-- CreateEnum
CREATE TYPE "ResourceLogResourceTypeType" AS ENUM ('equipment', 'material');

-- CreateEnum
CREATE TYPE "ResourceLogEventTypeType" AS ENUM ('equipment_use', 'equipment_idle', 'equipment_breakdown', 'material_received', 'material_installed', 'material_transferred', 'material_wasted');

-- CreateEnum
CREATE TYPE "SafetyIncidentIncidentTypeType" AS ENUM ('near_miss', 'first_aid', 'recordable_injury', 'lost_time', 'property_damage', 'environmental', 'security');

-- CreateEnum
CREATE TYPE "SafetyIncidentSeverityType" AS ENUM ('low', 'moderate', 'serious', 'critical', 'fatal');

-- CreateEnum
CREATE TYPE "SafetyIncidentStatusType" AS ENUM ('reported', 'investigating', 'corrective_action', 'closed');

-- CreateEnum
CREATE TYPE "SafetyObservationObservationTypeType" AS ENUM ('safe_practice', 'unsafe_act', 'unsafe_condition', 'environmental', 'quality');

-- CreateEnum
CREATE TYPE "SafetyObservationStatusType" AS ENUM ('open', 'assigned', 'resolved', 'closed');

-- CreateEnum
CREATE TYPE "InspectionTemplateInspectionTypeType" AS ENUM ('safety', 'quality', 'pre_installation', 'commissioning', 'regulatory', 'equipment');

-- CreateEnum
CREATE TYPE "InspectionStatusType" AS ENUM ('scheduled', 'in_progress', 'passed', 'failed', 'closed', 'cancelled');

-- CreateEnum
CREATE TYPE "InspectionItemResultType" AS ENUM ('pending', 'pass', 'fail', 'not_applicable');

-- CreateEnum
CREATE TYPE "CorrectiveActionStatusType" AS ENUM ('open', 'in_progress', 'ready_for_verification', 'verified', 'closed');

-- CreateEnum
CREATE TYPE "CorrectiveActionPriorityType" AS ENUM ('low', 'normal', 'high', 'critical');

-- CreateEnum
CREATE TYPE "ProgressClaimClaimTypeType" AS ENUM ('owner', 'commitment');

-- CreateEnum
CREATE TYPE "ProgressClaimStatusType" AS ENUM ('draft', 'submitted', 'under_review', 'approved', 'partially_paid', 'paid', 'rejected', 'closed', 'voided');

-- CreateEnum
CREATE TYPE "PaymentDirectionType" AS ENUM ('receipt', 'disbursement');

-- CreateEnum
CREATE TYPE "PaymentStatusType" AS ENUM ('pending', 'authorized', 'settled', 'failed', 'voided');

-- CreateEnum
CREATE TYPE "PaymentPaymentMethodType" AS ENUM ('ach', 'check', 'wire', 'card', 'cash', 'other');

-- CreateEnum
CREATE TYPE "RetainageReleaseStatusType" AS ENUM ('requested', 'approved', 'released', 'rejected', 'voided');

-- CreateEnum
CREATE TYPE "LienWaiverWaiverTypeType" AS ENUM ('conditional_progress', 'unconditional_progress', 'conditional_final', 'unconditional_final');

-- CreateEnum
CREATE TYPE "LienWaiverStatusType" AS ENUM ('requested', 'received', 'accepted', 'rejected', 'expired');

-- CreateEnum
CREATE TYPE "AgentIdentityStatusType" AS ENUM ('active', 'suspended', 'revoked');

-- CreateEnum
CREATE TYPE "AgentIdentityApprovalModeType" AS ENUM ('always', 'risk_based', 'none');

-- CreateEnum
CREATE TYPE "ScopeGrantStatusType" AS ENUM ('active', 'inactive', 'revoked');

-- CreateEnum
CREATE TYPE "AgentActionActorTypeType" AS ENUM ('human', 'agent', 'system');

-- CreateEnum
CREATE TYPE "AgentActionStatusType" AS ENUM ('proposed', 'approved', 'rejected', 'running', 'succeeded', 'failed');

-- CreateEnum
CREATE TYPE "IdempotencyKeyStatusType" AS ENUM ('started', 'completed', 'failed');

-- DropForeignKey
ALTER TABLE "Todo" DROP CONSTRAINT "Todo_assignedTo_fkey";

-- DropForeignKey
ALTER TABLE "_Todo_todoImages" DROP CONSTRAINT "_Todo_todoImages_A_fkey";

-- DropForeignKey
ALTER TABLE "_Todo_todoImages" DROP CONSTRAINT "_Todo_todoImages_B_fkey";

-- AlterTable
ALTER TABLE "Role" DROP COLUMN "canCreateTodos",
DROP COLUMN "canEditOtherPeople",
DROP COLUMN "canManageAllTodos",
DROP COLUMN "canSeeOtherPeople",
ADD COLUMN     "canManageAgents" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageBilling" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageCompanies" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageContracts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageDocuments" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageFieldOperations" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageFinancials" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageOnboarding" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManagePreconstruction" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageProjectExecution" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageProjects" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageSafety" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageSettings" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canReadAgents" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canReadAudit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canReadBilling" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canReadCompanies" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canReadContracts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canReadDocuments" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canReadFieldOperations" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canReadFinancials" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canReadPeople" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canReadPreconstruction" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canReadProjectExecution" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canReadProjects" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canReadSafety" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "company" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "jobTitle" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "onboardingStatus" "UserOnboardingStatusType" NOT NULL DEFAULT 'not_started',
ADD COLUMN     "phone" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "Todo";

-- DropTable
DROP TABLE "TodoImage";

-- DropTable
DROP TABLE "_Todo_todoImages";

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "slug" TEXT NOT NULL DEFAULT '',
    "legalName" TEXT NOT NULL DEFAULT '',
    "status" "CompanyStatusType" NOT NULL DEFAULT 'active',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "addressLine1" TEXT NOT NULL DEFAULT '',
    "addressLine2" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "stateProvince" TEXT NOT NULL DEFAULT '',
    "postalCode" TEXT NOT NULL DEFAULT '',
    "countryCode" TEXT NOT NULL DEFAULT 'US',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyMembership" (
    "id" TEXT NOT NULL,
    "membershipKey" TEXT NOT NULL DEFAULT '',
    "user" TEXT,
    "company" TEXT,
    "status" "CompanyMembershipStatusType" NOT NULL DEFAULT 'invited',
    "title" TEXT NOT NULL DEFAULT '',
    "canAccessAllProjects" BOOLEAN NOT NULL DEFAULT false,
    "invitedBy" TEXT,
    "joinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "projectKey" TEXT NOT NULL DEFAULT '',
    "projectNumber" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "status" "ProjectStatusType" NOT NULL DEFAULT 'planning',
    "company" TEXT,
    "owner" TEXT,
    "projectManager" TEXT,
    "superintendent" TEXT,
    "startDate" TIMESTAMP(3),
    "substantialCompletionDate" TIMESTAMP(3),
    "actualCompletionDate" TIMESTAMP(3),
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "addressLine1" TEXT NOT NULL DEFAULT '',
    "addressLine2" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "stateProvince" TEXT NOT NULL DEFAULT '',
    "postalCode" TEXT NOT NULL DEFAULT '',
    "countryCode" TEXT NOT NULL DEFAULT 'US',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMembership" (
    "id" TEXT NOT NULL,
    "membershipKey" TEXT NOT NULL DEFAULT '',
    "user" TEXT,
    "project" TEXT,
    "status" "ProjectMembershipStatusType" NOT NULL DEFAULT 'invited',
    "accessLevel" "ProjectMembershipAccessLevelType" NOT NULL DEFAULT 'viewer',
    "joinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradePartner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "legalName" TEXT NOT NULL DEFAULT '',
    "partnerType" "TradePartnerPartnerTypeType" NOT NULL DEFAULT 'subcontractor',
    "status" "TradePartnerStatusType" NOT NULL DEFAULT 'prospective',
    "taxIdLast4" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "addressLine1" TEXT NOT NULL DEFAULT '',
    "addressLine2" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "stateProvince" TEXT NOT NULL DEFAULT '',
    "postalCode" TEXT NOT NULL DEFAULT '',
    "countryCode" TEXT NOT NULL DEFAULT 'US',
    "company" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradePartner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectLocation" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL DEFAULT '',
    "locationType" "ProjectLocationLocationTypeType" DEFAULT 'area',
    "parent" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL DEFAULT '',
    "division" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "company" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "costType" "BudgetCodeCostTypeType" NOT NULL DEFAULT 'other',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "costCode" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BidPackage" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "instructions" TEXT NOT NULL DEFAULT '',
    "status" "BidPackageStatusType" NOT NULL DEFAULT 'draft',
    "bidType" "BidPackageBidTypeType" NOT NULL DEFAULT 'lump_sum',
    "dueAt" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "bidManager" TEXT,
    "awardedPartner" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BidPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BidInvitation" (
    "id" TEXT NOT NULL,
    "status" "BidInvitationStatusType" NOT NULL DEFAULT 'draft',
    "recipientName" TEXT NOT NULL DEFAULT '',
    "recipientEmail" TEXT NOT NULL DEFAULT '',
    "sentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "bidPackage" TEXT,
    "tradePartner" TEXT,
    "submission" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BidInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BidSubmission" (
    "id" TEXT NOT NULL,
    "submissionNumber" TEXT NOT NULL DEFAULT '',
    "status" "BidSubmissionStatusType" NOT NULL DEFAULT 'draft',
    "totalMinor" BIGINT DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "alternatesMinor" BIGINT DEFAULT 0,
    "exclusions" TEXT NOT NULL DEFAULT '',
    "clarifications" TEXT NOT NULL DEFAULT '',
    "isBondable" BOOLEAN NOT NULL DEFAULT false,
    "validUntil" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "bidPackage" TEXT,
    "tradePartner" TEXT,
    "reviewedBy" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BidSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BidLineItem" (
    "id" TEXT NOT NULL,
    "lineNumber" INTEGER,
    "description" TEXT NOT NULL DEFAULT '',
    "quantity" DECIMAL(18,4) DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT '',
    "unitPriceMinor" BIGINT DEFAULT 0,
    "amountMinor" BIGINT DEFAULT 0,
    "submission" TEXT,
    "budgetCode" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BidLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Estimate" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "status" "EstimateStatusType" NOT NULL DEFAULT 'draft',
    "estimator" TEXT,
    "currentVersion" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Estimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstimateVersion" (
    "id" TEXT NOT NULL,
    "versionKey" TEXT NOT NULL DEFAULT '',
    "versionNumber" INTEGER NOT NULL,
    "status" "EstimateVersionStatusType" NOT NULL DEFAULT 'draft',
    "subtotalMinor" BIGINT DEFAULT 0,
    "overheadMinor" BIGINT DEFAULT 0,
    "profitMinor" BIGINT DEFAULT 0,
    "contingencyMinor" BIGINT DEFAULT 0,
    "totalMinor" BIGINT DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "scopeSummary" TEXT NOT NULL DEFAULT '',
    "assumptions" TEXT NOT NULL DEFAULT '',
    "exclusions" TEXT NOT NULL DEFAULT '',
    "issuedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "estimate" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstimateVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstimateLineItem" (
    "id" TEXT NOT NULL,
    "lineNumber" INTEGER,
    "description" TEXT NOT NULL DEFAULT '',
    "quantity" DECIMAL(18,4) DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT '',
    "laborCostMinor" BIGINT DEFAULT 0,
    "materialCostMinor" BIGINT DEFAULT 0,
    "equipmentCostMinor" BIGINT DEFAULT 0,
    "subcontractCostMinor" BIGINT DEFAULT 0,
    "otherCostMinor" BIGINT DEFAULT 0,
    "totalCostMinor" BIGINT DEFAULT 0,
    "version" TEXT,
    "budgetCode" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstimateLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "version" INTEGER DEFAULT 1,
    "status" "BudgetStatusType" NOT NULL DEFAULT 'draft',
    "totalOriginalMinor" BIGINT DEFAULT 0,
    "totalRevisedMinor" BIGINT DEFAULT 0,
    "totalCommittedMinor" BIGINT DEFAULT 0,
    "totalActualMinor" BIGINT DEFAULT 0,
    "forecastToCompleteMinor" BIGINT DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetLineItem" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "originalAmountMinor" BIGINT DEFAULT 0,
    "approvedChangesMinor" BIGINT DEFAULT 0,
    "revisedAmountMinor" BIGINT DEFAULT 0,
    "committedAmountMinor" BIGINT DEFAULT 0,
    "commitmentChangesMinor" BIGINT DEFAULT 0,
    "actualCostMinor" BIGINT DEFAULT 0,
    "pendingCostChangesMinor" BIGINT DEFAULT 0,
    "forecastToCompleteMinor" BIGINT DEFAULT 0,
    "projectedFinalCostMinor" BIGINT DEFAULT 0,
    "projectedOverUnderMinor" BIGINT DEFAULT 0,
    "budget" TEXT,
    "budgetCode" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetChange" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "reason" TEXT NOT NULL DEFAULT '',
    "status" "BudgetChangeStatusType" NOT NULL DEFAULT 'draft',
    "totalAmountMinor" BIGINT DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "requestedBy" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "budget" TEXT,
    "sourceChangeEvent" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetChangeLineItem" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "amountMinor" BIGINT DEFAULT 0,
    "budgetChange" TEXT,
    "budgetLineItem" TEXT,
    "budgetCode" TEXT,
    "changeEventLineItem" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetChangeLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectCost" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "costType" "DirectCostCostTypeType" NOT NULL DEFAULT 'expense',
    "status" "DirectCostStatusType" NOT NULL DEFAULT 'draft',
    "amountMinor" BIGINT DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "costDate" TIMESTAMP(3) NOT NULL,
    "invoiceDate" TIMESTAMP(3),
    "vendorInvoiceNumber" TEXT NOT NULL DEFAULT '',
    "budgetCode" TEXT,
    "tradePartner" TEXT,
    "commitment" TEXT,
    "approvedBy" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrimeContract" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "contractType" "PrimeContractContractTypeType" NOT NULL DEFAULT 'lump_sum',
    "status" "PrimeContractStatusType" NOT NULL DEFAULT 'draft',
    "originalContractMinor" BIGINT DEFAULT 0,
    "approvedChangesMinor" BIGINT DEFAULT 0,
    "revisedContractMinor" BIGINT DEFAULT 0,
    "billedToDateMinor" BIGINT DEFAULT 0,
    "paidToDateMinor" BIGINT DEFAULT 0,
    "defaultRetainageBps" INTEGER DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "executedAt" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "completionDate" TIMESTAMP(3),
    "client" TEXT,
    "contractManager" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrimeContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commitment" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "commitmentType" "CommitmentCommitmentTypeType" NOT NULL DEFAULT 'subcontract',
    "status" "CommitmentStatusType" NOT NULL DEFAULT 'draft',
    "originalContractMinor" BIGINT DEFAULT 0,
    "approvedChangesMinor" BIGINT DEFAULT 0,
    "revisedContractMinor" BIGINT DEFAULT 0,
    "invoicedToDateMinor" BIGINT DEFAULT 0,
    "paidToDateMinor" BIGINT DEFAULT 0,
    "defaultRetainageBps" INTEGER DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "executedAt" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "completionDate" TIMESTAMP(3),
    "tradePartner" TEXT,
    "contractManager" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Commitment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractLineItem" (
    "id" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "scheduledValueMinor" BIGINT DEFAULT 0,
    "approvedChangesMinor" BIGINT DEFAULT 0,
    "revisedValueMinor" BIGINT DEFAULT 0,
    "retainageBps" INTEGER DEFAULT 0,
    "primeContract" TEXT,
    "commitment" TEXT,
    "budgetCode" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeEvent" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "eventType" "ChangeEventEventTypeType" NOT NULL DEFAULT 'other',
    "status" "ChangeEventStatusType" NOT NULL DEFAULT 'open',
    "estimatedCostMinor" BIGINT DEFAULT 0,
    "estimatedRevenueMinor" BIGINT DEFAULT 0,
    "scheduleImpactDays" INTEGER DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "discoveredAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "owner" TEXT,
    "sourceRfi" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeEventLineItem" (
    "id" TEXT NOT NULL,
    "lineNumber" INTEGER,
    "description" TEXT NOT NULL DEFAULT '',
    "estimatedCostMinor" BIGINT DEFAULT 0,
    "estimatedRevenueMinor" BIGINT DEFAULT 0,
    "changeEvent" TEXT,
    "budgetCode" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangeEventLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeQuote" (
    "id" TEXT NOT NULL,
    "quoteNumber" TEXT NOT NULL DEFAULT '',
    "status" "ChangeQuoteStatusType" NOT NULL DEFAULT 'requested',
    "scope" TEXT NOT NULL DEFAULT '',
    "amountMinor" BIGINT DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "dueAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "changeEvent" TEXT,
    "changeEventLineItem" TEXT,
    "tradePartner" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangeQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeOrder" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "direction" "ChangeOrderDirectionType" NOT NULL DEFAULT 'owner',
    "status" "ChangeOrderStatusType" NOT NULL DEFAULT 'draft',
    "totalMinor" BIGINT DEFAULT 0,
    "scheduleImpactDays" INTEGER DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "approvedAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "requestedBy" TEXT,
    "approvedBy" TEXT,
    "primeContract" TEXT,
    "commitment" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangeOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeOrderLineItem" (
    "id" TEXT NOT NULL,
    "lineNumber" INTEGER,
    "description" TEXT NOT NULL DEFAULT '',
    "amountMinor" BIGINT DEFAULT 0,
    "changeOrder" TEXT,
    "contractLineItem" TEXT,
    "changeEventLineItem" TEXT,
    "budgetCode" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangeOrderLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RFI" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL DEFAULT '',
    "subject" TEXT NOT NULL DEFAULT '',
    "question" TEXT NOT NULL DEFAULT '',
    "status" "RFIStatusType" NOT NULL DEFAULT 'draft',
    "priority" "RFIPriorityType" NOT NULL DEFAULT 'normal',
    "scheduleImpactDays" INTEGER DEFAULT 0,
    "costImpact" "RFICostImpactType" DEFAULT 'unknown',
    "dueAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "answeredAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "raisedBy" TEXT,
    "ballInCourt" TEXT,
    "responsiblePartner" TEXT,
    "location" TEXT,
    "specificationSection" TEXT,
    "drawingRevision" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RFI_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RFIResponse" (
    "id" TEXT NOT NULL,
    "response" TEXT NOT NULL DEFAULT '',
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rfi" TEXT,
    "author" TEXT,
    "onBehalfOf" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RFIResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecificationSection" (
    "id" TEXT NOT NULL,
    "sectionNumber" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "division" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpecificationSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submittal" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL DEFAULT '',
    "revision" INTEGER DEFAULT 0,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "submittalType" "SubmittalSubmittalTypeType" NOT NULL DEFAULT 'product_data',
    "status" "SubmittalStatusType" NOT NULL DEFAULT 'draft',
    "requiredOnSiteAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "specificationSection" TEXT,
    "responsiblePartner" TEXT,
    "submitter" TEXT,
    "submittalManager" TEXT,
    "ballInCourt" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Submittal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmittalReview" (
    "id" TEXT NOT NULL,
    "sequence" INTEGER DEFAULT 1,
    "status" "SubmittalReviewStatusType" NOT NULL DEFAULT 'pending',
    "response" TEXT NOT NULL DEFAULT '',
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "submittal" TEXT,
    "reviewer" TEXT,
    "reviewerPartner" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmittalReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Drawing" (
    "id" TEXT NOT NULL,
    "drawingNumber" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "discipline" TEXT NOT NULL DEFAULT '',
    "status" "DrawingStatusType" NOT NULL DEFAULT 'active',
    "currentRevision" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Drawing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrawingRevision" (
    "id" TEXT NOT NULL,
    "revisionKey" TEXT NOT NULL DEFAULT '',
    "revisionNumber" TEXT NOT NULL DEFAULT '',
    "titleSnapshot" TEXT NOT NULL DEFAULT '',
    "status" "DrawingRevisionStatusType" NOT NULL DEFAULT 'draft',
    "fileName" TEXT NOT NULL DEFAULT '',
    "storageKey" TEXT NOT NULL DEFAULT '',
    "mimeType" TEXT NOT NULL DEFAULT '',
    "byteSize" INTEGER,
    "checksumSha256" TEXT NOT NULL DEFAULT '',
    "issuedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "uploadedBy" TEXT,
    "drawing" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DrawingRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "documentType" "DocumentDocumentTypeType" NOT NULL DEFAULT 'other',
    "status" "DocumentStatusType" NOT NULL DEFAULT 'active',
    "folderPath" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "currentVersion" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentVersion" (
    "id" TEXT NOT NULL,
    "versionKey" TEXT NOT NULL DEFAULT '',
    "versionNumber" INTEGER NOT NULL,
    "revisionLabel" TEXT NOT NULL DEFAULT '',
    "titleSnapshot" TEXT NOT NULL DEFAULT '',
    "fileName" TEXT NOT NULL DEFAULT '',
    "storageKey" TEXT NOT NULL DEFAULT '',
    "mimeType" TEXT NOT NULL DEFAULT '',
    "byteSize" INTEGER,
    "checksumSha256" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "issuedAt" TIMESTAMP(3),
    "uploadedBy" TEXT,
    "document" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyLog" (
    "id" TEXT NOT NULL,
    "logDate" TIMESTAMP(3) NOT NULL,
    "status" "DailyLogStatusType" NOT NULL DEFAULT 'draft',
    "weatherSummary" TEXT NOT NULL DEFAULT '',
    "highTemperatureC" DECIMAL(5,2),
    "lowTemperatureC" DECIMAL(5,2),
    "precipitationMm" DECIMAL(8,2),
    "generalNotes" TEXT NOT NULL DEFAULT '',
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "preparedBy" TEXT,
    "approvedBy" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyLogEntry" (
    "id" TEXT NOT NULL,
    "entryType" "DailyLogEntryEntryTypeType" NOT NULL DEFAULT 'note',
    "title" TEXT NOT NULL DEFAULT '',
    "details" TEXT NOT NULL DEFAULT '',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "workerCount" INTEGER,
    "quantity" DECIMAL(18,4),
    "unit" TEXT NOT NULL DEFAULT '',
    "delayDays" INTEGER,
    "dailyLog" TEXT,
    "location" TEXT,
    "tradePartner" TEXT,
    "equipment" TEXT,
    "material" TEXT,
    "safetyIncident" TEXT,
    "inspection" TEXT,
    "scheduleTask" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "scheduleType" "ScheduleScheduleTypeType" NOT NULL DEFAULT 'current',
    "status" "ScheduleStatusType" NOT NULL DEFAULT 'draft',
    "version" INTEGER DEFAULT 1,
    "dataDate" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "publishedBy" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleTask" (
    "id" TEXT NOT NULL,
    "taskCode" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "status" "ScheduleTaskStatusType" NOT NULL DEFAULT 'not_started',
    "plannedStart" TIMESTAMP(3),
    "plannedFinish" TIMESTAMP(3),
    "actualStart" TIMESTAMP(3),
    "actualFinish" TIMESTAMP(3),
    "percentComplete" INTEGER DEFAULT 0,
    "totalFloatDays" INTEGER,
    "isMilestone" BOOLEAN NOT NULL DEFAULT false,
    "schedule" TEXT,
    "parent" TEXT,
    "location" TEXT,
    "responsiblePartner" TEXT,
    "assignedTo" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleDependency" (
    "id" TEXT NOT NULL,
    "dependencyType" "ScheduleDependencyDependencyTypeType" NOT NULL DEFAULT 'finish_to_start',
    "lagDays" INTEGER DEFAULT 0,
    "schedule" TEXT,
    "predecessor" TEXT,
    "successor" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleDependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PunchItem" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "status" "PunchItemStatusType" NOT NULL DEFAULT 'open',
    "priority" "PunchItemPriorityType" DEFAULT 'normal',
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "assignedTo" TEXT,
    "responsiblePartner" TEXT,
    "location" TEXT,
    "drawingRevision" TEXT,
    "inspectionItem" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PunchItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaborEntry" (
    "id" TEXT NOT NULL,
    "workDate" TIMESTAMP(3) NOT NULL,
    "workerName" TEXT NOT NULL DEFAULT '',
    "employeeNumber" TEXT NOT NULL DEFAULT '',
    "laborType" "LaborEntryLaborTypeType" NOT NULL DEFAULT 'employee',
    "regularHours" DECIMAL(8,2) DEFAULT 0,
    "overtimeHours" DECIMAL(8,2) DEFAULT 0,
    "doubleTimeHours" DECIMAL(8,2) DEFAULT 0,
    "hourlyRateMinor" BIGINT DEFAULT 0,
    "totalCostMinor" BIGINT DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT NOT NULL DEFAULT '',
    "worker" TEXT,
    "tradePartner" TEXT,
    "budgetCode" TEXT,
    "dailyLog" TEXT,
    "scheduleTask" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LaborEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "equipmentNumber" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "equipmentType" TEXT NOT NULL DEFAULT '',
    "make" TEXT NOT NULL DEFAULT '',
    "model" TEXT NOT NULL DEFAULT '',
    "serialNumber" TEXT NOT NULL DEFAULT '',
    "ownershipType" "EquipmentOwnershipTypeType" NOT NULL DEFAULT 'owned',
    "status" "EquipmentStatusType" NOT NULL DEFAULT 'available',
    "hourlyCostMinor" BIGINT DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "company" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "unit" TEXT NOT NULL DEFAULT '',
    "standardCostMinor" BIGINT DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "manufacturer" TEXT NOT NULL DEFAULT '',
    "modelNumber" TEXT NOT NULL DEFAULT '',
    "isActive" "MaterialIsActiveType" NOT NULL DEFAULT 'active',
    "company" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceLog" (
    "id" TEXT NOT NULL,
    "resourceType" "ResourceLogResourceTypeType" NOT NULL,
    "eventType" "ResourceLogEventTypeType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "quantity" DECIMAL(18,4) DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT '',
    "unitCostMinor" BIGINT DEFAULT 0,
    "totalCostMinor" BIGINT DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT NOT NULL DEFAULT '',
    "equipment" TEXT,
    "material" TEXT,
    "budgetCode" TEXT,
    "dailyLog" TEXT,
    "location" TEXT,
    "operator" TEXT,
    "tradePartner" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyIncident" (
    "id" TEXT NOT NULL,
    "incidentNumber" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "incidentType" "SafetyIncidentIncidentTypeType" NOT NULL DEFAULT 'near_miss',
    "severity" "SafetyIncidentSeverityType" NOT NULL DEFAULT 'low',
    "status" "SafetyIncidentStatusType" NOT NULL DEFAULT 'reported',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "isOshaRecordable" BOOLEAN NOT NULL DEFAULT false,
    "daysAway" INTEGER DEFAULT 0,
    "restrictedDutyDays" INTEGER DEFAULT 0,
    "injuredPartyName" TEXT NOT NULL DEFAULT '',
    "injuryDetails" TEXT NOT NULL DEFAULT '',
    "privateNotes" TEXT NOT NULL DEFAULT '',
    "reportedBy" TEXT,
    "investigator" TEXT,
    "responsiblePartner" TEXT,
    "location" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafetyIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyObservation" (
    "id" TEXT NOT NULL,
    "observationNumber" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "observationType" "SafetyObservationObservationTypeType" NOT NULL DEFAULT 'unsafe_condition',
    "status" "SafetyObservationStatusType" NOT NULL DEFAULT 'open',
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "observedBy" TEXT,
    "assignedTo" TEXT,
    "responsiblePartner" TEXT,
    "location" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafetyObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "inspectionType" "InspectionTemplateInspectionTypeType" NOT NULL DEFAULT 'quality',
    "version" INTEGER DEFAULT 1,
    "instructions" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InspectionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" TEXT NOT NULL,
    "inspectionNumber" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "status" "InspectionStatusType" NOT NULL DEFAULT 'scheduled',
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "scorePercent" INTEGER,
    "summary" TEXT NOT NULL DEFAULT '',
    "template" TEXT,
    "inspector" TEXT,
    "responsiblePartner" TEXT,
    "location" TEXT,
    "specificationSection" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionItem" (
    "id" TEXT NOT NULL,
    "sequence" INTEGER DEFAULT 1,
    "prompt" TEXT NOT NULL DEFAULT '',
    "requirement" TEXT NOT NULL DEFAULT '',
    "result" "InspectionItemResultType" NOT NULL DEFAULT 'pending',
    "response" TEXT NOT NULL DEFAULT '',
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "inspection" TEXT,
    "assignedTo" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InspectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorrectiveAction" (
    "id" TEXT NOT NULL,
    "actionNumber" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "status" "CorrectiveActionStatusType" NOT NULL DEFAULT 'open',
    "priority" "CorrectiveActionPriorityType" DEFAULT 'normal',
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "assignedTo" TEXT,
    "verifiedBy" TEXT,
    "responsiblePartner" TEXT,
    "safetyIncident" TEXT,
    "safetyObservation" TEXT,
    "inspectionItem" TEXT,
    "punchItem" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorrectiveAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressClaim" (
    "id" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL DEFAULT '',
    "invoiceNumber" TEXT NOT NULL DEFAULT '',
    "claimType" "ProgressClaimClaimTypeType" NOT NULL DEFAULT 'commitment',
    "status" "ProgressClaimStatusType" NOT NULL DEFAULT 'draft',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "originalContractMinor" BIGINT DEFAULT 0,
    "approvedChangesMinor" BIGINT DEFAULT 0,
    "revisedContractMinor" BIGINT DEFAULT 0,
    "workCompletedToDateMinor" BIGINT DEFAULT 0,
    "storedMaterialsMinor" BIGINT DEFAULT 0,
    "retainageMinor" BIGINT DEFAULT 0,
    "earnedLessRetainageMinor" BIGINT DEFAULT 0,
    "previousPaymentsMinor" BIGINT DEFAULT 0,
    "currentPaymentDueMinor" BIGINT DEFAULT 0,
    "balanceToFinishMinor" BIGINT DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "certification" TEXT NOT NULL DEFAULT '',
    "primeContract" TEXT,
    "commitment" TEXT,
    "tradePartner" TEXT,
    "submittedBy" TEXT,
    "reviewedBy" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgressClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressClaimLineItem" (
    "id" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "scheduledValueMinor" BIGINT DEFAULT 0,
    "previousWorkMinor" BIGINT DEFAULT 0,
    "currentWorkMinor" BIGINT DEFAULT 0,
    "storedMaterialsMinor" BIGINT DEFAULT 0,
    "completedStoredToDateMinor" BIGINT DEFAULT 0,
    "percentComplete" INTEGER DEFAULT 0,
    "retainageBps" INTEGER DEFAULT 0,
    "retainageMinor" BIGINT DEFAULT 0,
    "earnedLessRetainageMinor" BIGINT DEFAULT 0,
    "balanceToFinishMinor" BIGINT DEFAULT 0,
    "progressClaim" TEXT,
    "contractLineItem" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgressClaimLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "paymentNumber" TEXT NOT NULL DEFAULT '',
    "direction" "PaymentDirectionType" NOT NULL,
    "status" "PaymentStatusType" NOT NULL DEFAULT 'pending',
    "amountMinor" BIGINT NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "paymentMethod" "PaymentPaymentMethodType" NOT NULL DEFAULT 'ach',
    "reference" TEXT NOT NULL DEFAULT '',
    "paidAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "tradePartner" TEXT,
    "recordedBy" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAllocation" (
    "id" TEXT NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "payment" TEXT,
    "progressClaim" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetainageRelease" (
    "id" TEXT NOT NULL,
    "releaseNumber" TEXT NOT NULL DEFAULT '',
    "status" "RetainageReleaseStatusType" NOT NULL DEFAULT 'requested',
    "amountMinor" BIGINT NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "requestedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "reason" TEXT NOT NULL DEFAULT '',
    "progressClaim" TEXT,
    "progressClaimLineItem" TEXT,
    "payment" TEXT,
    "approvedBy" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetainageRelease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LienWaiver" (
    "id" TEXT NOT NULL,
    "waiverNumber" TEXT NOT NULL DEFAULT '',
    "waiverType" "LienWaiverWaiverTypeType" NOT NULL,
    "status" "LienWaiverStatusType" NOT NULL DEFAULT 'requested',
    "throughDate" TIMESTAMP(3) NOT NULL,
    "amountMinor" BIGINT DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "requestedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "signerName" TEXT NOT NULL DEFAULT '',
    "fileName" TEXT NOT NULL DEFAULT '',
    "storageKey" TEXT NOT NULL DEFAULT '',
    "checksumSha256" TEXT NOT NULL DEFAULT '',
    "tradePartner" TEXT,
    "commitment" TEXT,
    "progressClaim" TEXT,
    "payment" TEXT,
    "reviewedBy" TEXT,
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LienWaiver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentIdentity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "slug" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "status" "AgentIdentityStatusType" NOT NULL DEFAULT 'active',
    "approvalMode" "AgentIdentityApprovalModeType" NOT NULL DEFAULT 'always',
    "owner" TEXT,
    "company" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScopeGrant" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "status" "ScopeGrantStatusType" NOT NULL DEFAULT 'active',
    "reason" TEXT NOT NULL DEFAULT '',
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "agentIdentity" TEXT,
    "company" TEXT,
    "project" TEXT,
    "grantedBy" TEXT,
    "revokedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScopeGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentAction" (
    "id" TEXT NOT NULL,
    "actionKey" TEXT NOT NULL DEFAULT '',
    "actorType" "AgentActionActorTypeType" NOT NULL,
    "action" TEXT NOT NULL DEFAULT '',
    "requiredScope" TEXT,
    "status" "AgentActionStatusType" NOT NULL,
    "targetType" TEXT NOT NULL DEFAULT '',
    "targetId" TEXT NOT NULL DEFAULT '',
    "targetStatus" TEXT NOT NULL DEFAULT '',
    "reason" TEXT NOT NULL DEFAULT '',
    "correlationId" TEXT NOT NULL DEFAULT '',
    "causationId" TEXT NOT NULL DEFAULT '',
    "requestDigest" TEXT NOT NULL DEFAULT '',
    "resultDigest" TEXT NOT NULL DEFAULT '',
    "errorCode" TEXT NOT NULL DEFAULT '',
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT NOT NULL DEFAULT '',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "company" TEXT,
    "project" TEXT,
    "agentIdentity" TEXT,
    "scopeGrant" TEXT,
    "requestedBy" TEXT,
    "reviewedBy" TEXT,
    "actorUser" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL DEFAULT '',
    "key" TEXT NOT NULL DEFAULT '',
    "operation" TEXT NOT NULL DEFAULT '',
    "requestHash" TEXT NOT NULL DEFAULT '',
    "status" "IdempotencyKeyStatusType" NOT NULL DEFAULT 'started',
    "resourceType" TEXT NOT NULL DEFAULT '',
    "resourceId" TEXT NOT NULL DEFAULT '',
    "fromStatus" TEXT NOT NULL DEFAULT '',
    "toStatus" TEXT NOT NULL DEFAULT '',
    "errorCode" TEXT NOT NULL DEFAULT '',
    "lockedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "company" TEXT,
    "project" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ChangeEvent_changeOrders" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ChangeEvent_changeOrders_AB_pkey" PRIMARY KEY ("A", "B")
);

-- CreateTable
CREATE TABLE "_Document_submittals" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_Document_submittals_AB_pkey" PRIMARY KEY ("A", "B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyMembership_membershipKey_key" ON "CompanyMembership"("membershipKey");

-- CreateIndex
CREATE INDEX "CompanyMembership_user_idx" ON "CompanyMembership"("user");

-- CreateIndex
CREATE INDEX "CompanyMembership_company_idx" ON "CompanyMembership"("company");

-- CreateIndex
CREATE INDEX "CompanyMembership_invitedBy_idx" ON "CompanyMembership"("invitedBy");

-- CreateIndex
CREATE UNIQUE INDEX "Project_projectKey_key" ON "Project"("projectKey");

-- CreateIndex
CREATE INDEX "Project_company_idx" ON "Project"("company");

-- CreateIndex
CREATE INDEX "Project_owner_idx" ON "Project"("owner");

-- CreateIndex
CREATE INDEX "Project_projectManager_idx" ON "Project"("projectManager");

-- CreateIndex
CREATE INDEX "Project_superintendent_idx" ON "Project"("superintendent");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMembership_membershipKey_key" ON "ProjectMembership"("membershipKey");

-- CreateIndex
CREATE INDEX "ProjectMembership_user_idx" ON "ProjectMembership"("user");

-- CreateIndex
CREATE INDEX "ProjectMembership_project_idx" ON "ProjectMembership"("project");

-- CreateIndex
CREATE INDEX "TradePartner_company_idx" ON "TradePartner"("company");

-- CreateIndex
CREATE INDEX "ProjectLocation_parent_idx" ON "ProjectLocation"("parent");

-- CreateIndex
CREATE INDEX "ProjectLocation_company_idx" ON "ProjectLocation"("company");

-- CreateIndex
CREATE INDEX "ProjectLocation_project_idx" ON "ProjectLocation"("project");

-- CreateIndex
CREATE INDEX "CostCode_company_idx" ON "CostCode"("company");

-- CreateIndex
CREATE INDEX "BudgetCode_costCode_idx" ON "BudgetCode"("costCode");

-- CreateIndex
CREATE INDEX "BudgetCode_company_idx" ON "BudgetCode"("company");

-- CreateIndex
CREATE INDEX "BudgetCode_project_idx" ON "BudgetCode"("project");

-- CreateIndex
CREATE INDEX "BidPackage_bidManager_idx" ON "BidPackage"("bidManager");

-- CreateIndex
CREATE INDEX "BidPackage_awardedPartner_idx" ON "BidPackage"("awardedPartner");

-- CreateIndex
CREATE INDEX "BidPackage_company_idx" ON "BidPackage"("company");

-- CreateIndex
CREATE INDEX "BidPackage_project_idx" ON "BidPackage"("project");

-- CreateIndex
CREATE UNIQUE INDEX "BidInvitation_submission_key" ON "BidInvitation"("submission");

-- CreateIndex
CREATE INDEX "BidInvitation_bidPackage_idx" ON "BidInvitation"("bidPackage");

-- CreateIndex
CREATE INDEX "BidInvitation_tradePartner_idx" ON "BidInvitation"("tradePartner");

-- CreateIndex
CREATE INDEX "BidInvitation_company_idx" ON "BidInvitation"("company");

-- CreateIndex
CREATE INDEX "BidInvitation_project_idx" ON "BidInvitation"("project");

-- CreateIndex
CREATE INDEX "BidSubmission_bidPackage_idx" ON "BidSubmission"("bidPackage");

-- CreateIndex
CREATE INDEX "BidSubmission_tradePartner_idx" ON "BidSubmission"("tradePartner");

-- CreateIndex
CREATE INDEX "BidSubmission_reviewedBy_idx" ON "BidSubmission"("reviewedBy");

-- CreateIndex
CREATE INDEX "BidSubmission_company_idx" ON "BidSubmission"("company");

-- CreateIndex
CREATE INDEX "BidSubmission_project_idx" ON "BidSubmission"("project");

-- CreateIndex
CREATE INDEX "BidLineItem_submission_idx" ON "BidLineItem"("submission");

-- CreateIndex
CREATE INDEX "BidLineItem_budgetCode_idx" ON "BidLineItem"("budgetCode");

-- CreateIndex
CREATE INDEX "BidLineItem_company_idx" ON "BidLineItem"("company");

-- CreateIndex
CREATE INDEX "BidLineItem_project_idx" ON "BidLineItem"("project");

-- CreateIndex
CREATE UNIQUE INDEX "Estimate_currentVersion_key" ON "Estimate"("currentVersion");

-- CreateIndex
CREATE INDEX "Estimate_estimator_idx" ON "Estimate"("estimator");

-- CreateIndex
CREATE INDEX "Estimate_company_idx" ON "Estimate"("company");

-- CreateIndex
CREATE INDEX "Estimate_project_idx" ON "Estimate"("project");

-- CreateIndex
CREATE UNIQUE INDEX "EstimateVersion_versionKey_key" ON "EstimateVersion"("versionKey");

-- CreateIndex
CREATE INDEX "EstimateVersion_estimate_idx" ON "EstimateVersion"("estimate");

-- CreateIndex
CREATE INDEX "EstimateVersion_company_idx" ON "EstimateVersion"("company");

-- CreateIndex
CREATE INDEX "EstimateVersion_project_idx" ON "EstimateVersion"("project");

-- CreateIndex
CREATE INDEX "EstimateLineItem_version_idx" ON "EstimateLineItem"("version");

-- CreateIndex
CREATE INDEX "EstimateLineItem_budgetCode_idx" ON "EstimateLineItem"("budgetCode");

-- CreateIndex
CREATE INDEX "EstimateLineItem_company_idx" ON "EstimateLineItem"("company");

-- CreateIndex
CREATE INDEX "EstimateLineItem_project_idx" ON "EstimateLineItem"("project");

-- CreateIndex
CREATE INDEX "Budget_approvedBy_idx" ON "Budget"("approvedBy");

-- CreateIndex
CREATE INDEX "Budget_company_idx" ON "Budget"("company");

-- CreateIndex
CREATE INDEX "Budget_project_idx" ON "Budget"("project");

-- CreateIndex
CREATE INDEX "BudgetLineItem_budget_idx" ON "BudgetLineItem"("budget");

-- CreateIndex
CREATE INDEX "BudgetLineItem_budgetCode_idx" ON "BudgetLineItem"("budgetCode");

-- CreateIndex
CREATE INDEX "BudgetLineItem_company_idx" ON "BudgetLineItem"("company");

-- CreateIndex
CREATE INDEX "BudgetLineItem_project_idx" ON "BudgetLineItem"("project");

-- CreateIndex
CREATE INDEX "BudgetChange_requestedBy_idx" ON "BudgetChange"("requestedBy");

-- CreateIndex
CREATE INDEX "BudgetChange_reviewedBy_idx" ON "BudgetChange"("reviewedBy");

-- CreateIndex
CREATE INDEX "BudgetChange_budget_idx" ON "BudgetChange"("budget");

-- CreateIndex
CREATE INDEX "BudgetChange_sourceChangeEvent_idx" ON "BudgetChange"("sourceChangeEvent");

-- CreateIndex
CREATE INDEX "BudgetChange_company_idx" ON "BudgetChange"("company");

-- CreateIndex
CREATE INDEX "BudgetChange_project_idx" ON "BudgetChange"("project");

-- CreateIndex
CREATE INDEX "BudgetChangeLineItem_budgetChange_idx" ON "BudgetChangeLineItem"("budgetChange");

-- CreateIndex
CREATE INDEX "BudgetChangeLineItem_budgetLineItem_idx" ON "BudgetChangeLineItem"("budgetLineItem");

-- CreateIndex
CREATE INDEX "BudgetChangeLineItem_budgetCode_idx" ON "BudgetChangeLineItem"("budgetCode");

-- CreateIndex
CREATE INDEX "BudgetChangeLineItem_changeEventLineItem_idx" ON "BudgetChangeLineItem"("changeEventLineItem");

-- CreateIndex
CREATE INDEX "BudgetChangeLineItem_company_idx" ON "BudgetChangeLineItem"("company");

-- CreateIndex
CREATE INDEX "BudgetChangeLineItem_project_idx" ON "BudgetChangeLineItem"("project");

-- CreateIndex
CREATE INDEX "DirectCost_budgetCode_idx" ON "DirectCost"("budgetCode");

-- CreateIndex
CREATE INDEX "DirectCost_tradePartner_idx" ON "DirectCost"("tradePartner");

-- CreateIndex
CREATE INDEX "DirectCost_commitment_idx" ON "DirectCost"("commitment");

-- CreateIndex
CREATE INDEX "DirectCost_approvedBy_idx" ON "DirectCost"("approvedBy");

-- CreateIndex
CREATE INDEX "DirectCost_company_idx" ON "DirectCost"("company");

-- CreateIndex
CREATE INDEX "DirectCost_project_idx" ON "DirectCost"("project");

-- CreateIndex
CREATE INDEX "PrimeContract_client_idx" ON "PrimeContract"("client");

-- CreateIndex
CREATE INDEX "PrimeContract_contractManager_idx" ON "PrimeContract"("contractManager");

-- CreateIndex
CREATE INDEX "PrimeContract_company_idx" ON "PrimeContract"("company");

-- CreateIndex
CREATE INDEX "PrimeContract_project_idx" ON "PrimeContract"("project");

-- CreateIndex
CREATE INDEX "Commitment_tradePartner_idx" ON "Commitment"("tradePartner");

-- CreateIndex
CREATE INDEX "Commitment_contractManager_idx" ON "Commitment"("contractManager");

-- CreateIndex
CREATE INDEX "Commitment_company_idx" ON "Commitment"("company");

-- CreateIndex
CREATE INDEX "Commitment_project_idx" ON "Commitment"("project");

-- CreateIndex
CREATE INDEX "ContractLineItem_primeContract_idx" ON "ContractLineItem"("primeContract");

-- CreateIndex
CREATE INDEX "ContractLineItem_commitment_idx" ON "ContractLineItem"("commitment");

-- CreateIndex
CREATE INDEX "ContractLineItem_budgetCode_idx" ON "ContractLineItem"("budgetCode");

-- CreateIndex
CREATE INDEX "ContractLineItem_company_idx" ON "ContractLineItem"("company");

-- CreateIndex
CREATE INDEX "ContractLineItem_project_idx" ON "ContractLineItem"("project");

-- CreateIndex
CREATE INDEX "ChangeEvent_owner_idx" ON "ChangeEvent"("owner");

-- CreateIndex
CREATE INDEX "ChangeEvent_sourceRfi_idx" ON "ChangeEvent"("sourceRfi");

-- CreateIndex
CREATE INDEX "ChangeEvent_company_idx" ON "ChangeEvent"("company");

-- CreateIndex
CREATE INDEX "ChangeEvent_project_idx" ON "ChangeEvent"("project");

-- CreateIndex
CREATE INDEX "ChangeEventLineItem_changeEvent_idx" ON "ChangeEventLineItem"("changeEvent");

-- CreateIndex
CREATE INDEX "ChangeEventLineItem_budgetCode_idx" ON "ChangeEventLineItem"("budgetCode");

-- CreateIndex
CREATE INDEX "ChangeEventLineItem_company_idx" ON "ChangeEventLineItem"("company");

-- CreateIndex
CREATE INDEX "ChangeEventLineItem_project_idx" ON "ChangeEventLineItem"("project");

-- CreateIndex
CREATE INDEX "ChangeQuote_changeEvent_idx" ON "ChangeQuote"("changeEvent");

-- CreateIndex
CREATE INDEX "ChangeQuote_changeEventLineItem_idx" ON "ChangeQuote"("changeEventLineItem");

-- CreateIndex
CREATE INDEX "ChangeQuote_tradePartner_idx" ON "ChangeQuote"("tradePartner");

-- CreateIndex
CREATE INDEX "ChangeQuote_company_idx" ON "ChangeQuote"("company");

-- CreateIndex
CREATE INDEX "ChangeQuote_project_idx" ON "ChangeQuote"("project");

-- CreateIndex
CREATE INDEX "ChangeOrder_requestedBy_idx" ON "ChangeOrder"("requestedBy");

-- CreateIndex
CREATE INDEX "ChangeOrder_approvedBy_idx" ON "ChangeOrder"("approvedBy");

-- CreateIndex
CREATE INDEX "ChangeOrder_primeContract_idx" ON "ChangeOrder"("primeContract");

-- CreateIndex
CREATE INDEX "ChangeOrder_commitment_idx" ON "ChangeOrder"("commitment");

-- CreateIndex
CREATE INDEX "ChangeOrder_company_idx" ON "ChangeOrder"("company");

-- CreateIndex
CREATE INDEX "ChangeOrder_project_idx" ON "ChangeOrder"("project");

-- CreateIndex
CREATE INDEX "ChangeOrderLineItem_changeOrder_idx" ON "ChangeOrderLineItem"("changeOrder");

-- CreateIndex
CREATE INDEX "ChangeOrderLineItem_contractLineItem_idx" ON "ChangeOrderLineItem"("contractLineItem");

-- CreateIndex
CREATE INDEX "ChangeOrderLineItem_changeEventLineItem_idx" ON "ChangeOrderLineItem"("changeEventLineItem");

-- CreateIndex
CREATE INDEX "ChangeOrderLineItem_budgetCode_idx" ON "ChangeOrderLineItem"("budgetCode");

-- CreateIndex
CREATE INDEX "ChangeOrderLineItem_company_idx" ON "ChangeOrderLineItem"("company");

-- CreateIndex
CREATE INDEX "ChangeOrderLineItem_project_idx" ON "ChangeOrderLineItem"("project");

-- CreateIndex
CREATE INDEX "RFI_raisedBy_idx" ON "RFI"("raisedBy");

-- CreateIndex
CREATE INDEX "RFI_ballInCourt_idx" ON "RFI"("ballInCourt");

-- CreateIndex
CREATE INDEX "RFI_responsiblePartner_idx" ON "RFI"("responsiblePartner");

-- CreateIndex
CREATE INDEX "RFI_location_idx" ON "RFI"("location");

-- CreateIndex
CREATE INDEX "RFI_specificationSection_idx" ON "RFI"("specificationSection");

-- CreateIndex
CREATE INDEX "RFI_drawingRevision_idx" ON "RFI"("drawingRevision");

-- CreateIndex
CREATE INDEX "RFI_company_idx" ON "RFI"("company");

-- CreateIndex
CREATE INDEX "RFI_project_idx" ON "RFI"("project");

-- CreateIndex
CREATE INDEX "RFIResponse_rfi_idx" ON "RFIResponse"("rfi");

-- CreateIndex
CREATE INDEX "RFIResponse_author_idx" ON "RFIResponse"("author");

-- CreateIndex
CREATE INDEX "RFIResponse_onBehalfOf_idx" ON "RFIResponse"("onBehalfOf");

-- CreateIndex
CREATE INDEX "RFIResponse_company_idx" ON "RFIResponse"("company");

-- CreateIndex
CREATE INDEX "RFIResponse_project_idx" ON "RFIResponse"("project");

-- CreateIndex
CREATE INDEX "SpecificationSection_company_idx" ON "SpecificationSection"("company");

-- CreateIndex
CREATE INDEX "SpecificationSection_project_idx" ON "SpecificationSection"("project");

-- CreateIndex
CREATE INDEX "Submittal_specificationSection_idx" ON "Submittal"("specificationSection");

-- CreateIndex
CREATE INDEX "Submittal_responsiblePartner_idx" ON "Submittal"("responsiblePartner");

-- CreateIndex
CREATE INDEX "Submittal_submitter_idx" ON "Submittal"("submitter");

-- CreateIndex
CREATE INDEX "Submittal_submittalManager_idx" ON "Submittal"("submittalManager");

-- CreateIndex
CREATE INDEX "Submittal_ballInCourt_idx" ON "Submittal"("ballInCourt");

-- CreateIndex
CREATE INDEX "Submittal_company_idx" ON "Submittal"("company");

-- CreateIndex
CREATE INDEX "Submittal_project_idx" ON "Submittal"("project");

-- CreateIndex
CREATE INDEX "SubmittalReview_submittal_idx" ON "SubmittalReview"("submittal");

-- CreateIndex
CREATE INDEX "SubmittalReview_reviewer_idx" ON "SubmittalReview"("reviewer");

-- CreateIndex
CREATE INDEX "SubmittalReview_reviewerPartner_idx" ON "SubmittalReview"("reviewerPartner");

-- CreateIndex
CREATE INDEX "SubmittalReview_company_idx" ON "SubmittalReview"("company");

-- CreateIndex
CREATE INDEX "SubmittalReview_project_idx" ON "SubmittalReview"("project");

-- CreateIndex
CREATE UNIQUE INDEX "Drawing_currentRevision_key" ON "Drawing"("currentRevision");

-- CreateIndex
CREATE INDEX "Drawing_company_idx" ON "Drawing"("company");

-- CreateIndex
CREATE INDEX "Drawing_project_idx" ON "Drawing"("project");

-- CreateIndex
CREATE UNIQUE INDEX "DrawingRevision_revisionKey_key" ON "DrawingRevision"("revisionKey");

-- CreateIndex
CREATE INDEX "DrawingRevision_uploadedBy_idx" ON "DrawingRevision"("uploadedBy");

-- CreateIndex
CREATE INDEX "DrawingRevision_drawing_idx" ON "DrawingRevision"("drawing");

-- CreateIndex
CREATE INDEX "DrawingRevision_company_idx" ON "DrawingRevision"("company");

-- CreateIndex
CREATE INDEX "DrawingRevision_project_idx" ON "DrawingRevision"("project");

-- CreateIndex
CREATE UNIQUE INDEX "Document_currentVersion_key" ON "Document"("currentVersion");

-- CreateIndex
CREATE INDEX "Document_company_idx" ON "Document"("company");

-- CreateIndex
CREATE INDEX "Document_project_idx" ON "Document"("project");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentVersion_versionKey_key" ON "DocumentVersion"("versionKey");

-- CreateIndex
CREATE INDEX "DocumentVersion_uploadedBy_idx" ON "DocumentVersion"("uploadedBy");

-- CreateIndex
CREATE INDEX "DocumentVersion_document_idx" ON "DocumentVersion"("document");

-- CreateIndex
CREATE INDEX "DocumentVersion_company_idx" ON "DocumentVersion"("company");

-- CreateIndex
CREATE INDEX "DocumentVersion_project_idx" ON "DocumentVersion"("project");

-- CreateIndex
CREATE INDEX "DailyLog_preparedBy_idx" ON "DailyLog"("preparedBy");

-- CreateIndex
CREATE INDEX "DailyLog_approvedBy_idx" ON "DailyLog"("approvedBy");

-- CreateIndex
CREATE INDEX "DailyLog_company_idx" ON "DailyLog"("company");

-- CreateIndex
CREATE INDEX "DailyLog_project_idx" ON "DailyLog"("project");

-- CreateIndex
CREATE INDEX "DailyLogEntry_dailyLog_idx" ON "DailyLogEntry"("dailyLog");

-- CreateIndex
CREATE INDEX "DailyLogEntry_location_idx" ON "DailyLogEntry"("location");

-- CreateIndex
CREATE INDEX "DailyLogEntry_tradePartner_idx" ON "DailyLogEntry"("tradePartner");

-- CreateIndex
CREATE INDEX "DailyLogEntry_equipment_idx" ON "DailyLogEntry"("equipment");

-- CreateIndex
CREATE INDEX "DailyLogEntry_material_idx" ON "DailyLogEntry"("material");

-- CreateIndex
CREATE INDEX "DailyLogEntry_safetyIncident_idx" ON "DailyLogEntry"("safetyIncident");

-- CreateIndex
CREATE INDEX "DailyLogEntry_inspection_idx" ON "DailyLogEntry"("inspection");

-- CreateIndex
CREATE INDEX "DailyLogEntry_scheduleTask_idx" ON "DailyLogEntry"("scheduleTask");

-- CreateIndex
CREATE INDEX "DailyLogEntry_company_idx" ON "DailyLogEntry"("company");

-- CreateIndex
CREATE INDEX "DailyLogEntry_project_idx" ON "DailyLogEntry"("project");

-- CreateIndex
CREATE INDEX "Schedule_publishedBy_idx" ON "Schedule"("publishedBy");

-- CreateIndex
CREATE INDEX "Schedule_company_idx" ON "Schedule"("company");

-- CreateIndex
CREATE INDEX "Schedule_project_idx" ON "Schedule"("project");

-- CreateIndex
CREATE INDEX "ScheduleTask_schedule_idx" ON "ScheduleTask"("schedule");

-- CreateIndex
CREATE INDEX "ScheduleTask_parent_idx" ON "ScheduleTask"("parent");

-- CreateIndex
CREATE INDEX "ScheduleTask_location_idx" ON "ScheduleTask"("location");

-- CreateIndex
CREATE INDEX "ScheduleTask_responsiblePartner_idx" ON "ScheduleTask"("responsiblePartner");

-- CreateIndex
CREATE INDEX "ScheduleTask_assignedTo_idx" ON "ScheduleTask"("assignedTo");

-- CreateIndex
CREATE INDEX "ScheduleTask_company_idx" ON "ScheduleTask"("company");

-- CreateIndex
CREATE INDEX "ScheduleTask_project_idx" ON "ScheduleTask"("project");

-- CreateIndex
CREATE INDEX "ScheduleDependency_schedule_idx" ON "ScheduleDependency"("schedule");

-- CreateIndex
CREATE INDEX "ScheduleDependency_predecessor_idx" ON "ScheduleDependency"("predecessor");

-- CreateIndex
CREATE INDEX "ScheduleDependency_successor_idx" ON "ScheduleDependency"("successor");

-- CreateIndex
CREATE INDEX "ScheduleDependency_company_idx" ON "ScheduleDependency"("company");

-- CreateIndex
CREATE INDEX "ScheduleDependency_project_idx" ON "ScheduleDependency"("project");

-- CreateIndex
CREATE INDEX "PunchItem_createdBy_idx" ON "PunchItem"("createdBy");

-- CreateIndex
CREATE INDEX "PunchItem_assignedTo_idx" ON "PunchItem"("assignedTo");

-- CreateIndex
CREATE INDEX "PunchItem_responsiblePartner_idx" ON "PunchItem"("responsiblePartner");

-- CreateIndex
CREATE INDEX "PunchItem_location_idx" ON "PunchItem"("location");

-- CreateIndex
CREATE INDEX "PunchItem_drawingRevision_idx" ON "PunchItem"("drawingRevision");

-- CreateIndex
CREATE INDEX "PunchItem_inspectionItem_idx" ON "PunchItem"("inspectionItem");

-- CreateIndex
CREATE INDEX "PunchItem_company_idx" ON "PunchItem"("company");

-- CreateIndex
CREATE INDEX "PunchItem_project_idx" ON "PunchItem"("project");

-- CreateIndex
CREATE INDEX "LaborEntry_worker_idx" ON "LaborEntry"("worker");

-- CreateIndex
CREATE INDEX "LaborEntry_tradePartner_idx" ON "LaborEntry"("tradePartner");

-- CreateIndex
CREATE INDEX "LaborEntry_budgetCode_idx" ON "LaborEntry"("budgetCode");

-- CreateIndex
CREATE INDEX "LaborEntry_dailyLog_idx" ON "LaborEntry"("dailyLog");

-- CreateIndex
CREATE INDEX "LaborEntry_scheduleTask_idx" ON "LaborEntry"("scheduleTask");

-- CreateIndex
CREATE INDEX "LaborEntry_approvedBy_idx" ON "LaborEntry"("approvedBy");

-- CreateIndex
CREATE INDEX "LaborEntry_company_idx" ON "LaborEntry"("company");

-- CreateIndex
CREATE INDEX "LaborEntry_project_idx" ON "LaborEntry"("project");

-- CreateIndex
CREATE INDEX "Equipment_company_idx" ON "Equipment"("company");

-- CreateIndex
CREATE INDEX "Material_company_idx" ON "Material"("company");

-- CreateIndex
CREATE INDEX "ResourceLog_equipment_idx" ON "ResourceLog"("equipment");

-- CreateIndex
CREATE INDEX "ResourceLog_material_idx" ON "ResourceLog"("material");

-- CreateIndex
CREATE INDEX "ResourceLog_budgetCode_idx" ON "ResourceLog"("budgetCode");

-- CreateIndex
CREATE INDEX "ResourceLog_dailyLog_idx" ON "ResourceLog"("dailyLog");

-- CreateIndex
CREATE INDEX "ResourceLog_location_idx" ON "ResourceLog"("location");

-- CreateIndex
CREATE INDEX "ResourceLog_operator_idx" ON "ResourceLog"("operator");

-- CreateIndex
CREATE INDEX "ResourceLog_tradePartner_idx" ON "ResourceLog"("tradePartner");

-- CreateIndex
CREATE INDEX "ResourceLog_company_idx" ON "ResourceLog"("company");

-- CreateIndex
CREATE INDEX "ResourceLog_project_idx" ON "ResourceLog"("project");

-- CreateIndex
CREATE INDEX "SafetyIncident_reportedBy_idx" ON "SafetyIncident"("reportedBy");

-- CreateIndex
CREATE INDEX "SafetyIncident_investigator_idx" ON "SafetyIncident"("investigator");

-- CreateIndex
CREATE INDEX "SafetyIncident_responsiblePartner_idx" ON "SafetyIncident"("responsiblePartner");

-- CreateIndex
CREATE INDEX "SafetyIncident_location_idx" ON "SafetyIncident"("location");

-- CreateIndex
CREATE INDEX "SafetyIncident_company_idx" ON "SafetyIncident"("company");

-- CreateIndex
CREATE INDEX "SafetyIncident_project_idx" ON "SafetyIncident"("project");

-- CreateIndex
CREATE INDEX "SafetyObservation_observedBy_idx" ON "SafetyObservation"("observedBy");

-- CreateIndex
CREATE INDEX "SafetyObservation_assignedTo_idx" ON "SafetyObservation"("assignedTo");

-- CreateIndex
CREATE INDEX "SafetyObservation_responsiblePartner_idx" ON "SafetyObservation"("responsiblePartner");

-- CreateIndex
CREATE INDEX "SafetyObservation_location_idx" ON "SafetyObservation"("location");

-- CreateIndex
CREATE INDEX "SafetyObservation_company_idx" ON "SafetyObservation"("company");

-- CreateIndex
CREATE INDEX "SafetyObservation_project_idx" ON "SafetyObservation"("project");

-- CreateIndex
CREATE INDEX "InspectionTemplate_company_idx" ON "InspectionTemplate"("company");

-- CreateIndex
CREATE INDEX "InspectionTemplate_project_idx" ON "InspectionTemplate"("project");

-- CreateIndex
CREATE INDEX "Inspection_template_idx" ON "Inspection"("template");

-- CreateIndex
CREATE INDEX "Inspection_inspector_idx" ON "Inspection"("inspector");

-- CreateIndex
CREATE INDEX "Inspection_responsiblePartner_idx" ON "Inspection"("responsiblePartner");

-- CreateIndex
CREATE INDEX "Inspection_location_idx" ON "Inspection"("location");

-- CreateIndex
CREATE INDEX "Inspection_specificationSection_idx" ON "Inspection"("specificationSection");

-- CreateIndex
CREATE INDEX "Inspection_company_idx" ON "Inspection"("company");

-- CreateIndex
CREATE INDEX "Inspection_project_idx" ON "Inspection"("project");

-- CreateIndex
CREATE INDEX "InspectionItem_inspection_idx" ON "InspectionItem"("inspection");

-- CreateIndex
CREATE INDEX "InspectionItem_assignedTo_idx" ON "InspectionItem"("assignedTo");

-- CreateIndex
CREATE INDEX "InspectionItem_company_idx" ON "InspectionItem"("company");

-- CreateIndex
CREATE INDEX "InspectionItem_project_idx" ON "InspectionItem"("project");

-- CreateIndex
CREATE INDEX "CorrectiveAction_assignedTo_idx" ON "CorrectiveAction"("assignedTo");

-- CreateIndex
CREATE INDEX "CorrectiveAction_verifiedBy_idx" ON "CorrectiveAction"("verifiedBy");

-- CreateIndex
CREATE INDEX "CorrectiveAction_responsiblePartner_idx" ON "CorrectiveAction"("responsiblePartner");

-- CreateIndex
CREATE INDEX "CorrectiveAction_safetyIncident_idx" ON "CorrectiveAction"("safetyIncident");

-- CreateIndex
CREATE INDEX "CorrectiveAction_safetyObservation_idx" ON "CorrectiveAction"("safetyObservation");

-- CreateIndex
CREATE INDEX "CorrectiveAction_inspectionItem_idx" ON "CorrectiveAction"("inspectionItem");

-- CreateIndex
CREATE INDEX "CorrectiveAction_punchItem_idx" ON "CorrectiveAction"("punchItem");

-- CreateIndex
CREATE INDEX "CorrectiveAction_company_idx" ON "CorrectiveAction"("company");

-- CreateIndex
CREATE INDEX "CorrectiveAction_project_idx" ON "CorrectiveAction"("project");

-- CreateIndex
CREATE INDEX "ProgressClaim_primeContract_idx" ON "ProgressClaim"("primeContract");

-- CreateIndex
CREATE INDEX "ProgressClaim_commitment_idx" ON "ProgressClaim"("commitment");

-- CreateIndex
CREATE INDEX "ProgressClaim_tradePartner_idx" ON "ProgressClaim"("tradePartner");

-- CreateIndex
CREATE INDEX "ProgressClaim_submittedBy_idx" ON "ProgressClaim"("submittedBy");

-- CreateIndex
CREATE INDEX "ProgressClaim_reviewedBy_idx" ON "ProgressClaim"("reviewedBy");

-- CreateIndex
CREATE INDEX "ProgressClaim_company_idx" ON "ProgressClaim"("company");

-- CreateIndex
CREATE INDEX "ProgressClaim_project_idx" ON "ProgressClaim"("project");

-- CreateIndex
CREATE INDEX "ProgressClaimLineItem_progressClaim_idx" ON "ProgressClaimLineItem"("progressClaim");

-- CreateIndex
CREATE INDEX "ProgressClaimLineItem_contractLineItem_idx" ON "ProgressClaimLineItem"("contractLineItem");

-- CreateIndex
CREATE INDEX "ProgressClaimLineItem_company_idx" ON "ProgressClaimLineItem"("company");

-- CreateIndex
CREATE INDEX "ProgressClaimLineItem_project_idx" ON "ProgressClaimLineItem"("project");

-- CreateIndex
CREATE INDEX "Payment_tradePartner_idx" ON "Payment"("tradePartner");

-- CreateIndex
CREATE INDEX "Payment_recordedBy_idx" ON "Payment"("recordedBy");

-- CreateIndex
CREATE INDEX "Payment_company_idx" ON "Payment"("company");

-- CreateIndex
CREATE INDEX "Payment_project_idx" ON "Payment"("project");

-- CreateIndex
CREATE INDEX "PaymentAllocation_payment_idx" ON "PaymentAllocation"("payment");

-- CreateIndex
CREATE INDEX "PaymentAllocation_progressClaim_idx" ON "PaymentAllocation"("progressClaim");

-- CreateIndex
CREATE INDEX "PaymentAllocation_company_idx" ON "PaymentAllocation"("company");

-- CreateIndex
CREATE INDEX "PaymentAllocation_project_idx" ON "PaymentAllocation"("project");

-- CreateIndex
CREATE INDEX "RetainageRelease_progressClaim_idx" ON "RetainageRelease"("progressClaim");

-- CreateIndex
CREATE INDEX "RetainageRelease_progressClaimLineItem_idx" ON "RetainageRelease"("progressClaimLineItem");

-- CreateIndex
CREATE INDEX "RetainageRelease_payment_idx" ON "RetainageRelease"("payment");

-- CreateIndex
CREATE INDEX "RetainageRelease_approvedBy_idx" ON "RetainageRelease"("approvedBy");

-- CreateIndex
CREATE INDEX "RetainageRelease_company_idx" ON "RetainageRelease"("company");

-- CreateIndex
CREATE INDEX "RetainageRelease_project_idx" ON "RetainageRelease"("project");

-- CreateIndex
CREATE INDEX "LienWaiver_tradePartner_idx" ON "LienWaiver"("tradePartner");

-- CreateIndex
CREATE INDEX "LienWaiver_commitment_idx" ON "LienWaiver"("commitment");

-- CreateIndex
CREATE INDEX "LienWaiver_progressClaim_idx" ON "LienWaiver"("progressClaim");

-- CreateIndex
CREATE INDEX "LienWaiver_payment_idx" ON "LienWaiver"("payment");

-- CreateIndex
CREATE INDEX "LienWaiver_reviewedBy_idx" ON "LienWaiver"("reviewedBy");

-- CreateIndex
CREATE INDEX "LienWaiver_company_idx" ON "LienWaiver"("company");

-- CreateIndex
CREATE INDEX "LienWaiver_project_idx" ON "LienWaiver"("project");

-- CreateIndex
CREATE INDEX "AgentIdentity_owner_idx" ON "AgentIdentity"("owner");

-- CreateIndex
CREATE INDEX "AgentIdentity_company_idx" ON "AgentIdentity"("company");

-- CreateIndex
CREATE INDEX "ScopeGrant_agentIdentity_idx" ON "ScopeGrant"("agentIdentity");

-- CreateIndex
CREATE INDEX "ScopeGrant_company_idx" ON "ScopeGrant"("company");

-- CreateIndex
CREATE INDEX "ScopeGrant_project_idx" ON "ScopeGrant"("project");

-- CreateIndex
CREATE INDEX "ScopeGrant_grantedBy_idx" ON "ScopeGrant"("grantedBy");

-- CreateIndex
CREATE INDEX "ScopeGrant_revokedBy_idx" ON "ScopeGrant"("revokedBy");

-- CreateIndex
CREATE UNIQUE INDEX "AgentAction_actionKey_key" ON "AgentAction"("actionKey");

-- CreateIndex
CREATE UNIQUE INDEX "AgentAction_idempotencyKey_key" ON "AgentAction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "AgentAction_company_idx" ON "AgentAction"("company");

-- CreateIndex
CREATE INDEX "AgentAction_project_idx" ON "AgentAction"("project");

-- CreateIndex
CREATE INDEX "AgentAction_agentIdentity_idx" ON "AgentAction"("agentIdentity");

-- CreateIndex
CREATE INDEX "AgentAction_scopeGrant_idx" ON "AgentAction"("scopeGrant");

-- CreateIndex
CREATE INDEX "AgentAction_requestedBy_idx" ON "AgentAction"("requestedBy");

-- CreateIndex
CREATE INDEX "AgentAction_reviewedBy_idx" ON "AgentAction"("reviewedBy");

-- CreateIndex
CREATE INDEX "AgentAction_actorUser_idx" ON "AgentAction"("actorUser");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_fingerprint_key" ON "IdempotencyKey"("fingerprint");

-- CreateIndex
CREATE INDEX "IdempotencyKey_company_idx" ON "IdempotencyKey"("company");

-- CreateIndex
CREATE INDEX "IdempotencyKey_project_idx" ON "IdempotencyKey"("project");

-- CreateIndex
CREATE INDEX "_ChangeEvent_changeOrders_B_index" ON "_ChangeEvent_changeOrders"("B");

-- CreateIndex
CREATE INDEX "_Document_submittals_B_index" ON "_Document_submittals"("B");

-- CreateIndex
CREATE INDEX "Role_company_idx" ON "Role"("company");

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMembership" ADD CONSTRAINT "CompanyMembership_user_fkey" FOREIGN KEY ("user") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMembership" ADD CONSTRAINT "CompanyMembership_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMembership" ADD CONSTRAINT "CompanyMembership_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_owner_fkey" FOREIGN KEY ("owner") REFERENCES "TradePartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_projectManager_fkey" FOREIGN KEY ("projectManager") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_superintendent_fkey" FOREIGN KEY ("superintendent") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMembership" ADD CONSTRAINT "ProjectMembership_user_fkey" FOREIGN KEY ("user") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMembership" ADD CONSTRAINT "ProjectMembership_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradePartner" ADD CONSTRAINT "TradePartner_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectLocation" ADD CONSTRAINT "ProjectLocation_parent_fkey" FOREIGN KEY ("parent") REFERENCES "ProjectLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectLocation" ADD CONSTRAINT "ProjectLocation_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectLocation" ADD CONSTRAINT "ProjectLocation_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostCode" ADD CONSTRAINT "CostCode_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetCode" ADD CONSTRAINT "BudgetCode_costCode_fkey" FOREIGN KEY ("costCode") REFERENCES "CostCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetCode" ADD CONSTRAINT "BudgetCode_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetCode" ADD CONSTRAINT "BudgetCode_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidPackage" ADD CONSTRAINT "BidPackage_bidManager_fkey" FOREIGN KEY ("bidManager") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidPackage" ADD CONSTRAINT "BidPackage_awardedPartner_fkey" FOREIGN KEY ("awardedPartner") REFERENCES "TradePartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidPackage" ADD CONSTRAINT "BidPackage_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidPackage" ADD CONSTRAINT "BidPackage_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidInvitation" ADD CONSTRAINT "BidInvitation_bidPackage_fkey" FOREIGN KEY ("bidPackage") REFERENCES "BidPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidInvitation" ADD CONSTRAINT "BidInvitation_tradePartner_fkey" FOREIGN KEY ("tradePartner") REFERENCES "TradePartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidInvitation" ADD CONSTRAINT "BidInvitation_submission_fkey" FOREIGN KEY ("submission") REFERENCES "BidSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidInvitation" ADD CONSTRAINT "BidInvitation_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidInvitation" ADD CONSTRAINT "BidInvitation_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidSubmission" ADD CONSTRAINT "BidSubmission_bidPackage_fkey" FOREIGN KEY ("bidPackage") REFERENCES "BidPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidSubmission" ADD CONSTRAINT "BidSubmission_tradePartner_fkey" FOREIGN KEY ("tradePartner") REFERENCES "TradePartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidSubmission" ADD CONSTRAINT "BidSubmission_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidSubmission" ADD CONSTRAINT "BidSubmission_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidSubmission" ADD CONSTRAINT "BidSubmission_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidLineItem" ADD CONSTRAINT "BidLineItem_submission_fkey" FOREIGN KEY ("submission") REFERENCES "BidSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidLineItem" ADD CONSTRAINT "BidLineItem_budgetCode_fkey" FOREIGN KEY ("budgetCode") REFERENCES "BudgetCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidLineItem" ADD CONSTRAINT "BidLineItem_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidLineItem" ADD CONSTRAINT "BidLineItem_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_estimator_fkey" FOREIGN KEY ("estimator") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_currentVersion_fkey" FOREIGN KEY ("currentVersion") REFERENCES "EstimateVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateVersion" ADD CONSTRAINT "EstimateVersion_estimate_fkey" FOREIGN KEY ("estimate") REFERENCES "Estimate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateVersion" ADD CONSTRAINT "EstimateVersion_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateVersion" ADD CONSTRAINT "EstimateVersion_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateLineItem" ADD CONSTRAINT "EstimateLineItem_version_fkey" FOREIGN KEY ("version") REFERENCES "EstimateVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateLineItem" ADD CONSTRAINT "EstimateLineItem_budgetCode_fkey" FOREIGN KEY ("budgetCode") REFERENCES "BudgetCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateLineItem" ADD CONSTRAINT "EstimateLineItem_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateLineItem" ADD CONSTRAINT "EstimateLineItem_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLineItem" ADD CONSTRAINT "BudgetLineItem_budget_fkey" FOREIGN KEY ("budget") REFERENCES "Budget"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLineItem" ADD CONSTRAINT "BudgetLineItem_budgetCode_fkey" FOREIGN KEY ("budgetCode") REFERENCES "BudgetCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLineItem" ADD CONSTRAINT "BudgetLineItem_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLineItem" ADD CONSTRAINT "BudgetLineItem_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetChange" ADD CONSTRAINT "BudgetChange_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetChange" ADD CONSTRAINT "BudgetChange_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetChange" ADD CONSTRAINT "BudgetChange_budget_fkey" FOREIGN KEY ("budget") REFERENCES "Budget"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetChange" ADD CONSTRAINT "BudgetChange_sourceChangeEvent_fkey" FOREIGN KEY ("sourceChangeEvent") REFERENCES "ChangeEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetChange" ADD CONSTRAINT "BudgetChange_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetChange" ADD CONSTRAINT "BudgetChange_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetChangeLineItem" ADD CONSTRAINT "BudgetChangeLineItem_budgetChange_fkey" FOREIGN KEY ("budgetChange") REFERENCES "BudgetChange"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetChangeLineItem" ADD CONSTRAINT "BudgetChangeLineItem_budgetLineItem_fkey" FOREIGN KEY ("budgetLineItem") REFERENCES "BudgetLineItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetChangeLineItem" ADD CONSTRAINT "BudgetChangeLineItem_budgetCode_fkey" FOREIGN KEY ("budgetCode") REFERENCES "BudgetCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetChangeLineItem" ADD CONSTRAINT "BudgetChangeLineItem_changeEventLineItem_fkey" FOREIGN KEY ("changeEventLineItem") REFERENCES "ChangeEventLineItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetChangeLineItem" ADD CONSTRAINT "BudgetChangeLineItem_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetChangeLineItem" ADD CONSTRAINT "BudgetChangeLineItem_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectCost" ADD CONSTRAINT "DirectCost_budgetCode_fkey" FOREIGN KEY ("budgetCode") REFERENCES "BudgetCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectCost" ADD CONSTRAINT "DirectCost_tradePartner_fkey" FOREIGN KEY ("tradePartner") REFERENCES "TradePartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectCost" ADD CONSTRAINT "DirectCost_commitment_fkey" FOREIGN KEY ("commitment") REFERENCES "Commitment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectCost" ADD CONSTRAINT "DirectCost_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectCost" ADD CONSTRAINT "DirectCost_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectCost" ADD CONSTRAINT "DirectCost_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrimeContract" ADD CONSTRAINT "PrimeContract_client_fkey" FOREIGN KEY ("client") REFERENCES "TradePartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrimeContract" ADD CONSTRAINT "PrimeContract_contractManager_fkey" FOREIGN KEY ("contractManager") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrimeContract" ADD CONSTRAINT "PrimeContract_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrimeContract" ADD CONSTRAINT "PrimeContract_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commitment" ADD CONSTRAINT "Commitment_tradePartner_fkey" FOREIGN KEY ("tradePartner") REFERENCES "TradePartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commitment" ADD CONSTRAINT "Commitment_contractManager_fkey" FOREIGN KEY ("contractManager") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commitment" ADD CONSTRAINT "Commitment_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commitment" ADD CONSTRAINT "Commitment_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractLineItem" ADD CONSTRAINT "ContractLineItem_primeContract_fkey" FOREIGN KEY ("primeContract") REFERENCES "PrimeContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractLineItem" ADD CONSTRAINT "ContractLineItem_commitment_fkey" FOREIGN KEY ("commitment") REFERENCES "Commitment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractLineItem" ADD CONSTRAINT "ContractLineItem_budgetCode_fkey" FOREIGN KEY ("budgetCode") REFERENCES "BudgetCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractLineItem" ADD CONSTRAINT "ContractLineItem_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractLineItem" ADD CONSTRAINT "ContractLineItem_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeEvent" ADD CONSTRAINT "ChangeEvent_owner_fkey" FOREIGN KEY ("owner") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeEvent" ADD CONSTRAINT "ChangeEvent_sourceRfi_fkey" FOREIGN KEY ("sourceRfi") REFERENCES "RFI"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeEvent" ADD CONSTRAINT "ChangeEvent_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeEvent" ADD CONSTRAINT "ChangeEvent_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeEventLineItem" ADD CONSTRAINT "ChangeEventLineItem_changeEvent_fkey" FOREIGN KEY ("changeEvent") REFERENCES "ChangeEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeEventLineItem" ADD CONSTRAINT "ChangeEventLineItem_budgetCode_fkey" FOREIGN KEY ("budgetCode") REFERENCES "BudgetCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeEventLineItem" ADD CONSTRAINT "ChangeEventLineItem_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeEventLineItem" ADD CONSTRAINT "ChangeEventLineItem_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeQuote" ADD CONSTRAINT "ChangeQuote_changeEvent_fkey" FOREIGN KEY ("changeEvent") REFERENCES "ChangeEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeQuote" ADD CONSTRAINT "ChangeQuote_changeEventLineItem_fkey" FOREIGN KEY ("changeEventLineItem") REFERENCES "ChangeEventLineItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeQuote" ADD CONSTRAINT "ChangeQuote_tradePartner_fkey" FOREIGN KEY ("tradePartner") REFERENCES "TradePartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeQuote" ADD CONSTRAINT "ChangeQuote_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeQuote" ADD CONSTRAINT "ChangeQuote_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeOrder" ADD CONSTRAINT "ChangeOrder_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeOrder" ADD CONSTRAINT "ChangeOrder_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeOrder" ADD CONSTRAINT "ChangeOrder_primeContract_fkey" FOREIGN KEY ("primeContract") REFERENCES "PrimeContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeOrder" ADD CONSTRAINT "ChangeOrder_commitment_fkey" FOREIGN KEY ("commitment") REFERENCES "Commitment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeOrder" ADD CONSTRAINT "ChangeOrder_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeOrder" ADD CONSTRAINT "ChangeOrder_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeOrderLineItem" ADD CONSTRAINT "ChangeOrderLineItem_changeOrder_fkey" FOREIGN KEY ("changeOrder") REFERENCES "ChangeOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeOrderLineItem" ADD CONSTRAINT "ChangeOrderLineItem_contractLineItem_fkey" FOREIGN KEY ("contractLineItem") REFERENCES "ContractLineItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeOrderLineItem" ADD CONSTRAINT "ChangeOrderLineItem_changeEventLineItem_fkey" FOREIGN KEY ("changeEventLineItem") REFERENCES "ChangeEventLineItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeOrderLineItem" ADD CONSTRAINT "ChangeOrderLineItem_budgetCode_fkey" FOREIGN KEY ("budgetCode") REFERENCES "BudgetCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeOrderLineItem" ADD CONSTRAINT "ChangeOrderLineItem_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeOrderLineItem" ADD CONSTRAINT "ChangeOrderLineItem_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFI" ADD CONSTRAINT "RFI_raisedBy_fkey" FOREIGN KEY ("raisedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFI" ADD CONSTRAINT "RFI_ballInCourt_fkey" FOREIGN KEY ("ballInCourt") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFI" ADD CONSTRAINT "RFI_responsiblePartner_fkey" FOREIGN KEY ("responsiblePartner") REFERENCES "TradePartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFI" ADD CONSTRAINT "RFI_location_fkey" FOREIGN KEY ("location") REFERENCES "ProjectLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFI" ADD CONSTRAINT "RFI_specificationSection_fkey" FOREIGN KEY ("specificationSection") REFERENCES "SpecificationSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFI" ADD CONSTRAINT "RFI_drawingRevision_fkey" FOREIGN KEY ("drawingRevision") REFERENCES "DrawingRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFI" ADD CONSTRAINT "RFI_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFI" ADD CONSTRAINT "RFI_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFIResponse" ADD CONSTRAINT "RFIResponse_rfi_fkey" FOREIGN KEY ("rfi") REFERENCES "RFI"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFIResponse" ADD CONSTRAINT "RFIResponse_author_fkey" FOREIGN KEY ("author") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFIResponse" ADD CONSTRAINT "RFIResponse_onBehalfOf_fkey" FOREIGN KEY ("onBehalfOf") REFERENCES "TradePartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFIResponse" ADD CONSTRAINT "RFIResponse_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFIResponse" ADD CONSTRAINT "RFIResponse_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecificationSection" ADD CONSTRAINT "SpecificationSection_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecificationSection" ADD CONSTRAINT "SpecificationSection_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submittal" ADD CONSTRAINT "Submittal_specificationSection_fkey" FOREIGN KEY ("specificationSection") REFERENCES "SpecificationSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submittal" ADD CONSTRAINT "Submittal_responsiblePartner_fkey" FOREIGN KEY ("responsiblePartner") REFERENCES "TradePartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submittal" ADD CONSTRAINT "Submittal_submitter_fkey" FOREIGN KEY ("submitter") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submittal" ADD CONSTRAINT "Submittal_submittalManager_fkey" FOREIGN KEY ("submittalManager") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submittal" ADD CONSTRAINT "Submittal_ballInCourt_fkey" FOREIGN KEY ("ballInCourt") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submittal" ADD CONSTRAINT "Submittal_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submittal" ADD CONSTRAINT "Submittal_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmittalReview" ADD CONSTRAINT "SubmittalReview_submittal_fkey" FOREIGN KEY ("submittal") REFERENCES "Submittal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmittalReview" ADD CONSTRAINT "SubmittalReview_reviewer_fkey" FOREIGN KEY ("reviewer") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmittalReview" ADD CONSTRAINT "SubmittalReview_reviewerPartner_fkey" FOREIGN KEY ("reviewerPartner") REFERENCES "TradePartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmittalReview" ADD CONSTRAINT "SubmittalReview_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmittalReview" ADD CONSTRAINT "SubmittalReview_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Drawing" ADD CONSTRAINT "Drawing_currentRevision_fkey" FOREIGN KEY ("currentRevision") REFERENCES "DrawingRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Drawing" ADD CONSTRAINT "Drawing_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Drawing" ADD CONSTRAINT "Drawing_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingRevision" ADD CONSTRAINT "DrawingRevision_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingRevision" ADD CONSTRAINT "DrawingRevision_drawing_fkey" FOREIGN KEY ("drawing") REFERENCES "Drawing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingRevision" ADD CONSTRAINT "DrawingRevision_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrawingRevision" ADD CONSTRAINT "DrawingRevision_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_currentVersion_fkey" FOREIGN KEY ("currentVersion") REFERENCES "DocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_document_fkey" FOREIGN KEY ("document") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLog" ADD CONSTRAINT "DailyLog_preparedBy_fkey" FOREIGN KEY ("preparedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLog" ADD CONSTRAINT "DailyLog_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLog" ADD CONSTRAINT "DailyLog_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLog" ADD CONSTRAINT "DailyLog_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLogEntry" ADD CONSTRAINT "DailyLogEntry_dailyLog_fkey" FOREIGN KEY ("dailyLog") REFERENCES "DailyLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLogEntry" ADD CONSTRAINT "DailyLogEntry_location_fkey" FOREIGN KEY ("location") REFERENCES "ProjectLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLogEntry" ADD CONSTRAINT "DailyLogEntry_tradePartner_fkey" FOREIGN KEY ("tradePartner") REFERENCES "TradePartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLogEntry" ADD CONSTRAINT "DailyLogEntry_equipment_fkey" FOREIGN KEY ("equipment") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLogEntry" ADD CONSTRAINT "DailyLogEntry_material_fkey" FOREIGN KEY ("material") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLogEntry" ADD CONSTRAINT "DailyLogEntry_safetyIncident_fkey" FOREIGN KEY ("safetyIncident") REFERENCES "SafetyIncident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLogEntry" ADD CONSTRAINT "DailyLogEntry_inspection_fkey" FOREIGN KEY ("inspection") REFERENCES "Inspection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLogEntry" ADD CONSTRAINT "DailyLogEntry_scheduleTask_fkey" FOREIGN KEY ("scheduleTask") REFERENCES "ScheduleTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLogEntry" ADD CONSTRAINT "DailyLogEntry_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLogEntry" ADD CONSTRAINT "DailyLogEntry_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_publishedBy_fkey" FOREIGN KEY ("publishedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleTask" ADD CONSTRAINT "ScheduleTask_schedule_fkey" FOREIGN KEY ("schedule") REFERENCES "Schedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleTask" ADD CONSTRAINT "ScheduleTask_parent_fkey" FOREIGN KEY ("parent") REFERENCES "ScheduleTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleTask" ADD CONSTRAINT "ScheduleTask_location_fkey" FOREIGN KEY ("location") REFERENCES "ProjectLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleTask" ADD CONSTRAINT "ScheduleTask_responsiblePartner_fkey" FOREIGN KEY ("responsiblePartner") REFERENCES "TradePartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleTask" ADD CONSTRAINT "ScheduleTask_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleTask" ADD CONSTRAINT "ScheduleTask_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleTask" ADD CONSTRAINT "ScheduleTask_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleDependency" ADD CONSTRAINT "ScheduleDependency_schedule_fkey" FOREIGN KEY ("schedule") REFERENCES "Schedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleDependency" ADD CONSTRAINT "ScheduleDependency_predecessor_fkey" FOREIGN KEY ("predecessor") REFERENCES "ScheduleTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleDependency" ADD CONSTRAINT "ScheduleDependency_successor_fkey" FOREIGN KEY ("successor") REFERENCES "ScheduleTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleDependency" ADD CONSTRAINT "ScheduleDependency_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleDependency" ADD CONSTRAINT "ScheduleDependency_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PunchItem" ADD CONSTRAINT "PunchItem_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PunchItem" ADD CONSTRAINT "PunchItem_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PunchItem" ADD CONSTRAINT "PunchItem_responsiblePartner_fkey" FOREIGN KEY ("responsiblePartner") REFERENCES "TradePartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PunchItem" ADD CONSTRAINT "PunchItem_location_fkey" FOREIGN KEY ("location") REFERENCES "ProjectLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PunchItem" ADD CONSTRAINT "PunchItem_drawingRevision_fkey" FOREIGN KEY ("drawingRevision") REFERENCES "DrawingRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PunchItem" ADD CONSTRAINT "PunchItem_inspectionItem_fkey" FOREIGN KEY ("inspectionItem") REFERENCES "InspectionItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PunchItem" ADD CONSTRAINT "PunchItem_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PunchItem" ADD CONSTRAINT "PunchItem_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaborEntry" ADD CONSTRAINT "LaborEntry_worker_fkey" FOREIGN KEY ("worker") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaborEntry" ADD CONSTRAINT "LaborEntry_tradePartner_fkey" FOREIGN KEY ("tradePartner") REFERENCES "TradePartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaborEntry" ADD CONSTRAINT "LaborEntry_budgetCode_fkey" FOREIGN KEY ("budgetCode") REFERENCES "BudgetCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaborEntry" ADD CONSTRAINT "LaborEntry_dailyLog_fkey" FOREIGN KEY ("dailyLog") REFERENCES "DailyLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaborEntry" ADD CONSTRAINT "LaborEntry_scheduleTask_fkey" FOREIGN KEY ("scheduleTask") REFERENCES "ScheduleTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaborEntry" ADD CONSTRAINT "LaborEntry_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaborEntry" ADD CONSTRAINT "LaborEntry_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaborEntry" ADD CONSTRAINT "LaborEntry_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceLog" ADD CONSTRAINT "ResourceLog_equipment_fkey" FOREIGN KEY ("equipment") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceLog" ADD CONSTRAINT "ResourceLog_material_fkey" FOREIGN KEY ("material") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceLog" ADD CONSTRAINT "ResourceLog_budgetCode_fkey" FOREIGN KEY ("budgetCode") REFERENCES "BudgetCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceLog" ADD CONSTRAINT "ResourceLog_dailyLog_fkey" FOREIGN KEY ("dailyLog") REFERENCES "DailyLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceLog" ADD CONSTRAINT "ResourceLog_location_fkey" FOREIGN KEY ("location") REFERENCES "ProjectLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceLog" ADD CONSTRAINT "ResourceLog_operator_fkey" FOREIGN KEY ("operator") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceLog" ADD CONSTRAINT "ResourceLog_tradePartner_fkey" FOREIGN KEY ("tradePartner") REFERENCES "TradePartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceLog" ADD CONSTRAINT "ResourceLog_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceLog" ADD CONSTRAINT "ResourceLog_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyIncident" ADD CONSTRAINT "SafetyIncident_reportedBy_fkey" FOREIGN KEY ("reportedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyIncident" ADD CONSTRAINT "SafetyIncident_investigator_fkey" FOREIGN KEY ("investigator") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyIncident" ADD CONSTRAINT "SafetyIncident_responsiblePartner_fkey" FOREIGN KEY ("responsiblePartner") REFERENCES "TradePartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyIncident" ADD CONSTRAINT "SafetyIncident_location_fkey" FOREIGN KEY ("location") REFERENCES "ProjectLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyIncident" ADD CONSTRAINT "SafetyIncident_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyIncident" ADD CONSTRAINT "SafetyIncident_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyObservation" ADD CONSTRAINT "SafetyObservation_observedBy_fkey" FOREIGN KEY ("observedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyObservation" ADD CONSTRAINT "SafetyObservation_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyObservation" ADD CONSTRAINT "SafetyObservation_responsiblePartner_fkey" FOREIGN KEY ("responsiblePartner") REFERENCES "TradePartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyObservation" ADD CONSTRAINT "SafetyObservation_location_fkey" FOREIGN KEY ("location") REFERENCES "ProjectLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyObservation" ADD CONSTRAINT "SafetyObservation_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyObservation" ADD CONSTRAINT "SafetyObservation_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionTemplate" ADD CONSTRAINT "InspectionTemplate_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionTemplate" ADD CONSTRAINT "InspectionTemplate_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_template_fkey" FOREIGN KEY ("template") REFERENCES "InspectionTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_inspector_fkey" FOREIGN KEY ("inspector") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_responsiblePartner_fkey" FOREIGN KEY ("responsiblePartner") REFERENCES "TradePartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_location_fkey" FOREIGN KEY ("location") REFERENCES "ProjectLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_specificationSection_fkey" FOREIGN KEY ("specificationSection") REFERENCES "SpecificationSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionItem" ADD CONSTRAINT "InspectionItem_inspection_fkey" FOREIGN KEY ("inspection") REFERENCES "Inspection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionItem" ADD CONSTRAINT "InspectionItem_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionItem" ADD CONSTRAINT "InspectionItem_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionItem" ADD CONSTRAINT "InspectionItem_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_responsiblePartner_fkey" FOREIGN KEY ("responsiblePartner") REFERENCES "TradePartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_safetyIncident_fkey" FOREIGN KEY ("safetyIncident") REFERENCES "SafetyIncident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_safetyObservation_fkey" FOREIGN KEY ("safetyObservation") REFERENCES "SafetyObservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_inspectionItem_fkey" FOREIGN KEY ("inspectionItem") REFERENCES "InspectionItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_punchItem_fkey" FOREIGN KEY ("punchItem") REFERENCES "PunchItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressClaim" ADD CONSTRAINT "ProgressClaim_primeContract_fkey" FOREIGN KEY ("primeContract") REFERENCES "PrimeContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressClaim" ADD CONSTRAINT "ProgressClaim_commitment_fkey" FOREIGN KEY ("commitment") REFERENCES "Commitment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressClaim" ADD CONSTRAINT "ProgressClaim_tradePartner_fkey" FOREIGN KEY ("tradePartner") REFERENCES "TradePartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressClaim" ADD CONSTRAINT "ProgressClaim_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressClaim" ADD CONSTRAINT "ProgressClaim_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressClaim" ADD CONSTRAINT "ProgressClaim_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressClaim" ADD CONSTRAINT "ProgressClaim_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressClaimLineItem" ADD CONSTRAINT "ProgressClaimLineItem_progressClaim_fkey" FOREIGN KEY ("progressClaim") REFERENCES "ProgressClaim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressClaimLineItem" ADD CONSTRAINT "ProgressClaimLineItem_contractLineItem_fkey" FOREIGN KEY ("contractLineItem") REFERENCES "ContractLineItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressClaimLineItem" ADD CONSTRAINT "ProgressClaimLineItem_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressClaimLineItem" ADD CONSTRAINT "ProgressClaimLineItem_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tradePartner_fkey" FOREIGN KEY ("tradePartner") REFERENCES "TradePartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_payment_fkey" FOREIGN KEY ("payment") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_progressClaim_fkey" FOREIGN KEY ("progressClaim") REFERENCES "ProgressClaim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetainageRelease" ADD CONSTRAINT "RetainageRelease_progressClaim_fkey" FOREIGN KEY ("progressClaim") REFERENCES "ProgressClaim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetainageRelease" ADD CONSTRAINT "RetainageRelease_progressClaimLineItem_fkey" FOREIGN KEY ("progressClaimLineItem") REFERENCES "ProgressClaimLineItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetainageRelease" ADD CONSTRAINT "RetainageRelease_payment_fkey" FOREIGN KEY ("payment") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetainageRelease" ADD CONSTRAINT "RetainageRelease_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetainageRelease" ADD CONSTRAINT "RetainageRelease_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetainageRelease" ADD CONSTRAINT "RetainageRelease_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LienWaiver" ADD CONSTRAINT "LienWaiver_tradePartner_fkey" FOREIGN KEY ("tradePartner") REFERENCES "TradePartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LienWaiver" ADD CONSTRAINT "LienWaiver_commitment_fkey" FOREIGN KEY ("commitment") REFERENCES "Commitment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LienWaiver" ADD CONSTRAINT "LienWaiver_progressClaim_fkey" FOREIGN KEY ("progressClaim") REFERENCES "ProgressClaim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LienWaiver" ADD CONSTRAINT "LienWaiver_payment_fkey" FOREIGN KEY ("payment") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LienWaiver" ADD CONSTRAINT "LienWaiver_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LienWaiver" ADD CONSTRAINT "LienWaiver_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LienWaiver" ADD CONSTRAINT "LienWaiver_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentIdentity" ADD CONSTRAINT "AgentIdentity_owner_fkey" FOREIGN KEY ("owner") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentIdentity" ADD CONSTRAINT "AgentIdentity_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScopeGrant" ADD CONSTRAINT "ScopeGrant_agentIdentity_fkey" FOREIGN KEY ("agentIdentity") REFERENCES "AgentIdentity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScopeGrant" ADD CONSTRAINT "ScopeGrant_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScopeGrant" ADD CONSTRAINT "ScopeGrant_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScopeGrant" ADD CONSTRAINT "ScopeGrant_grantedBy_fkey" FOREIGN KEY ("grantedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScopeGrant" ADD CONSTRAINT "ScopeGrant_revokedBy_fkey" FOREIGN KEY ("revokedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentAction" ADD CONSTRAINT "AgentAction_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentAction" ADD CONSTRAINT "AgentAction_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentAction" ADD CONSTRAINT "AgentAction_agentIdentity_fkey" FOREIGN KEY ("agentIdentity") REFERENCES "AgentIdentity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentAction" ADD CONSTRAINT "AgentAction_scopeGrant_fkey" FOREIGN KEY ("scopeGrant") REFERENCES "ScopeGrant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentAction" ADD CONSTRAINT "AgentAction_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentAction" ADD CONSTRAINT "AgentAction_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentAction" ADD CONSTRAINT "AgentAction_actorUser_fkey" FOREIGN KEY ("actorUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentAction" ADD CONSTRAINT "AgentAction_idempotencyKey_fkey" FOREIGN KEY ("idempotencyKey") REFERENCES "IdempotencyKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdempotencyKey" ADD CONSTRAINT "IdempotencyKey_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdempotencyKey" ADD CONSTRAINT "IdempotencyKey_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChangeEvent_changeOrders" ADD CONSTRAINT "_ChangeEvent_changeOrders_A_fkey" FOREIGN KEY ("A") REFERENCES "ChangeEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChangeEvent_changeOrders" ADD CONSTRAINT "_ChangeEvent_changeOrders_B_fkey" FOREIGN KEY ("B") REFERENCES "ChangeOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Document_submittals" ADD CONSTRAINT "_Document_submittals_A_fkey" FOREIGN KEY ("A") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Document_submittals" ADD CONSTRAINT "_Document_submittals_B_fkey" FOREIGN KEY ("B") REFERENCES "Submittal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
