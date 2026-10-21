/*
  Warnings:

  - A unique constraint covering the columns `[publicSiteProfile]` on the table `Company` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PublicSiteProfileStatusType" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "PublicServiceStatusType" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "PublicProjectStatusType" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "IntakeSubmissionKindType" AS ENUM ('general_contact', 'project_inquiry', 'estimate_request', 'rfp_invitation', 'trade_partner_interest');

-- CreateEnum
CREATE TYPE "IntakeSubmissionStatusType" AS ENUM ('received');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "publicSiteProfile" TEXT;

-- AlterTable
-- Existing leads predate the public intake key. Backfill from the already-unique
-- primary key before enforcing the source schema's required/unique contract.
ALTER TABLE "ConstructionLead" ADD COLUMN     "leadKey" TEXT;
UPDATE "ConstructionLead" SET "leadKey" = "id" WHERE "leadKey" IS NULL;
ALTER TABLE "ConstructionLead"
    ALTER COLUMN "leadKey" SET DEFAULT '',
    ALTER COLUMN "leadKey" SET NOT NULL;

-- CreateTable
CREATE TABLE "PublicSiteProfile" (
    "id" TEXT NOT NULL,
    "siteKey" TEXT NOT NULL DEFAULT '',
    "status" "PublicSiteProfileStatusType" NOT NULL DEFAULT 'draft',
    "serviceArea" TEXT NOT NULL DEFAULT '',
    "capabilitySummary" TEXT NOT NULL DEFAULT '',
    "inquiryEmail" TEXT NOT NULL DEFAULT '',
    "inquiryPhone" TEXT NOT NULL DEFAULT '',
    "privacyNotice" TEXT NOT NULL DEFAULT '',
    "acceptingInquiries" BOOLEAN NOT NULL DEFAULT true,
    "createdByUser" TEXT,
    "updatedByUser" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicSiteProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicService" (
    "id" TEXT NOT NULL,
    "serviceKey" TEXT NOT NULL DEFAULT '',
    "slug" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "summary" TEXT NOT NULL DEFAULT '',
    "details" TEXT NOT NULL DEFAULT '',
    "market" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER DEFAULT 0,
    "status" "PublicServiceStatusType" NOT NULL DEFAULT 'draft',
    "site" TEXT,
    "company" TEXT,
    "createdByUser" TEXT,
    "updatedByUser" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicProject" (
    "id" TEXT NOT NULL,
    "publicationKey" TEXT NOT NULL DEFAULT '',
    "slug" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "summary" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "market" TEXT NOT NULL DEFAULT '',
    "locationLabel" TEXT NOT NULL DEFAULT '',
    "deliveryMethod" TEXT NOT NULL DEFAULT '',
    "completionLabel" TEXT NOT NULL DEFAULT '',
    "approvedOutcome" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER DEFAULT 0,
    "status" "PublicProjectStatusType" NOT NULL DEFAULT 'draft',
    "sourceProject" TEXT,
    "site" TEXT,
    "company" TEXT,
    "createdByUser" TEXT,
    "updatedByUser" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeSubmission" (
    "id" TEXT NOT NULL,
    "submissionKey" TEXT NOT NULL DEFAULT '',
    "deduplicationKey" TEXT NOT NULL DEFAULT '',
    "publicReference" TEXT NOT NULL DEFAULT '',
    "kind" "IntakeSubmissionKindType" NOT NULL,
    "status" "IntakeSubmissionStatusType" NOT NULL DEFAULT 'received',
    "contactName" TEXT NOT NULL DEFAULT '',
    "organization" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "contactRole" TEXT NOT NULL DEFAULT '',
    "projectName" TEXT NOT NULL DEFAULT '',
    "projectType" TEXT NOT NULL DEFAULT '',
    "locationSummary" TEXT NOT NULL DEFAULT '',
    "deliveryMethod" TEXT NOT NULL DEFAULT '',
    "budgetRange" TEXT NOT NULL DEFAULT '',
    "desiredStart" TIMESTAMP(3),
    "desiredCompletion" TIMESTAMP(3),
    "designStage" TEXT NOT NULL DEFAULT '',
    "servicesSought" TEXT NOT NULL DEFAULT '',
    "scopeSummary" TEXT NOT NULL DEFAULT '',
    "referralSource" TEXT NOT NULL DEFAULT '',
    "sourcePath" TEXT NOT NULL DEFAULT '',
    "privacyVersion" TEXT NOT NULL DEFAULT '',
    "consentAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestDigest" TEXT NOT NULL DEFAULT '',
    "site" TEXT,
    "company" TEXT,
    "lead" TEXT,
    "opportunity" TEXT,
    "createdByUser" TEXT,
    "updatedByUser" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntakeSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PublicSiteProfile_siteKey_key" ON "PublicSiteProfile"("siteKey");

-- CreateIndex
CREATE INDEX "PublicSiteProfile_createdByUser_idx" ON "PublicSiteProfile"("createdByUser");

-- CreateIndex
CREATE INDEX "PublicSiteProfile_updatedByUser_idx" ON "PublicSiteProfile"("updatedByUser");

-- CreateIndex
CREATE UNIQUE INDEX "PublicService_serviceKey_key" ON "PublicService"("serviceKey");

-- CreateIndex
CREATE INDEX "PublicService_site_idx" ON "PublicService"("site");

-- CreateIndex
CREATE INDEX "PublicService_company_idx" ON "PublicService"("company");

-- CreateIndex
CREATE INDEX "PublicService_createdByUser_idx" ON "PublicService"("createdByUser");

-- CreateIndex
CREATE INDEX "PublicService_updatedByUser_idx" ON "PublicService"("updatedByUser");

-- CreateIndex
CREATE UNIQUE INDEX "PublicProject_publicationKey_key" ON "PublicProject"("publicationKey");

-- CreateIndex
CREATE INDEX "PublicProject_sourceProject_idx" ON "PublicProject"("sourceProject");

-- CreateIndex
CREATE INDEX "PublicProject_site_idx" ON "PublicProject"("site");

-- CreateIndex
CREATE INDEX "PublicProject_company_idx" ON "PublicProject"("company");

-- CreateIndex
CREATE INDEX "PublicProject_createdByUser_idx" ON "PublicProject"("createdByUser");

-- CreateIndex
CREATE INDEX "PublicProject_updatedByUser_idx" ON "PublicProject"("updatedByUser");

-- CreateIndex
CREATE UNIQUE INDEX "IntakeSubmission_submissionKey_key" ON "IntakeSubmission"("submissionKey");

-- CreateIndex
CREATE UNIQUE INDEX "IntakeSubmission_deduplicationKey_key" ON "IntakeSubmission"("deduplicationKey");

-- CreateIndex
CREATE UNIQUE INDEX "IntakeSubmission_publicReference_key" ON "IntakeSubmission"("publicReference");

-- CreateIndex
CREATE INDEX "IntakeSubmission_site_idx" ON "IntakeSubmission"("site");

-- CreateIndex
CREATE INDEX "IntakeSubmission_company_idx" ON "IntakeSubmission"("company");

-- CreateIndex
CREATE INDEX "IntakeSubmission_lead_idx" ON "IntakeSubmission"("lead");

-- CreateIndex
CREATE INDEX "IntakeSubmission_opportunity_idx" ON "IntakeSubmission"("opportunity");

-- CreateIndex
CREATE INDEX "IntakeSubmission_createdByUser_idx" ON "IntakeSubmission"("createdByUser");

-- CreateIndex
CREATE INDEX "IntakeSubmission_updatedByUser_idx" ON "IntakeSubmission"("updatedByUser");

-- CreateIndex
CREATE UNIQUE INDEX "Company_publicSiteProfile_key" ON "Company"("publicSiteProfile");

-- CreateIndex
CREATE UNIQUE INDEX "ConstructionLead_leadKey_key" ON "ConstructionLead"("leadKey");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_publicSiteProfile_fkey" FOREIGN KEY ("publicSiteProfile") REFERENCES "PublicSiteProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicSiteProfile" ADD CONSTRAINT "PublicSiteProfile_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicSiteProfile" ADD CONSTRAINT "PublicSiteProfile_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicService" ADD CONSTRAINT "PublicService_site_fkey" FOREIGN KEY ("site") REFERENCES "PublicSiteProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicService" ADD CONSTRAINT "PublicService_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicService" ADD CONSTRAINT "PublicService_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicService" ADD CONSTRAINT "PublicService_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicProject" ADD CONSTRAINT "PublicProject_sourceProject_fkey" FOREIGN KEY ("sourceProject") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicProject" ADD CONSTRAINT "PublicProject_site_fkey" FOREIGN KEY ("site") REFERENCES "PublicSiteProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicProject" ADD CONSTRAINT "PublicProject_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicProject" ADD CONSTRAINT "PublicProject_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicProject" ADD CONSTRAINT "PublicProject_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeSubmission" ADD CONSTRAINT "IntakeSubmission_site_fkey" FOREIGN KEY ("site") REFERENCES "PublicSiteProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeSubmission" ADD CONSTRAINT "IntakeSubmission_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeSubmission" ADD CONSTRAINT "IntakeSubmission_lead_fkey" FOREIGN KEY ("lead") REFERENCES "ConstructionLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeSubmission" ADD CONSTRAINT "IntakeSubmission_opportunity_fkey" FOREIGN KEY ("opportunity") REFERENCES "ConstructionOpportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeSubmission" ADD CONSTRAINT "IntakeSubmission_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeSubmission" ADD CONSTRAINT "IntakeSubmission_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
