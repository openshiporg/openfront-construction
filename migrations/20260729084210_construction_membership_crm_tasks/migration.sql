/*
  Warnings:

  - The primary key for the `_ChangeEvent_changeOrders` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `_Document_submittals` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[A,B]` on the table `_ChangeEvent_changeOrders` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[A,B]` on the table `_Document_submittals` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ProjectMembershipPortalTypeType" AS ENUM ('internal', 'owner', 'designer', 'subcontractor', 'vendor');

-- CreateEnum
CREATE TYPE "ConstructionLeadSourceType" AS ENUM ('referral', 'invitation', 'public_opportunity', 'existing_client', 'direct', 'other');

-- CreateEnum
CREATE TYPE "ConstructionLeadStatusType" AS ENUM ('new', 'qualified', 'nurturing', 'converted', 'disqualified');

-- CreateEnum
CREATE TYPE "ConstructionOpportunityStageType" AS ENUM ('qualifying', 'go_no_go', 'estimating', 'submitted', 'negotiating', 'won', 'lost', 'declined');

-- AlterTable
ALTER TABLE "CompanyMembership" ADD COLUMN     "role" TEXT;

-- AlterTable
ALTER TABLE "ProjectMembership" ADD COLUMN     "portalOrganization" TEXT,
ADD COLUMN     "portalType" "ProjectMembershipPortalTypeType" NOT NULL DEFAULT 'internal',
ADD COLUMN     "role" TEXT;

-- AlterTable
ALTER TABLE "_ChangeEvent_changeOrders" DROP CONSTRAINT "_ChangeEvent_changeOrders_AB_pkey";

-- AlterTable
ALTER TABLE "_Document_submittals" DROP CONSTRAINT "_Document_submittals_AB_pkey";

-- CreateTable
CREATE TABLE "ConstructionLead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "organization" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "source" "ConstructionLeadSourceType" NOT NULL DEFAULT 'other',
    "status" "ConstructionLeadStatusType" NOT NULL DEFAULT 'new',
    "notes" TEXT NOT NULL DEFAULT '',
    "nextActionAt" TIMESTAMP(3),
    "owner" TEXT,
    "company" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConstructionLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConstructionOpportunity" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL DEFAULT '',
    "organization" TEXT NOT NULL DEFAULT '',
    "deliveryMethod" TEXT NOT NULL DEFAULT '',
    "locationSummary" TEXT NOT NULL DEFAULT '',
    "stage" "ConstructionOpportunityStageType" NOT NULL DEFAULT 'qualifying',
    "estimatedValueMinor" BIGINT DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "probabilityBps" INTEGER DEFAULT 0,
    "targetBidDate" TIMESTAMP(3),
    "expectedAwardDate" TIMESTAMP(3),
    "nextActionAt" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "owner" TEXT,
    "lead" TEXT,
    "client" TEXT,
    "company" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConstructionOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConstructionLead_owner_idx" ON "ConstructionLead"("owner");

-- CreateIndex
CREATE INDEX "ConstructionLead_company_idx" ON "ConstructionLead"("company");

-- CreateIndex
CREATE INDEX "ConstructionOpportunity_owner_idx" ON "ConstructionOpportunity"("owner");

-- CreateIndex
CREATE INDEX "ConstructionOpportunity_lead_idx" ON "ConstructionOpportunity"("lead");

-- CreateIndex
CREATE INDEX "ConstructionOpportunity_client_idx" ON "ConstructionOpportunity"("client");

-- CreateIndex
CREATE INDEX "ConstructionOpportunity_company_idx" ON "ConstructionOpportunity"("company");

-- CreateIndex
CREATE INDEX "CompanyMembership_role_idx" ON "CompanyMembership"("role");

-- CreateIndex
CREATE INDEX "ProjectMembership_role_idx" ON "ProjectMembership"("role");

-- CreateIndex
CREATE INDEX "ProjectMembership_portalOrganization_idx" ON "ProjectMembership"("portalOrganization");

-- CreateIndex
CREATE UNIQUE INDEX "_ChangeEvent_changeOrders_AB_unique" ON "_ChangeEvent_changeOrders"("A", "B");

-- CreateIndex
CREATE UNIQUE INDEX "_Document_submittals_AB_unique" ON "_Document_submittals"("A", "B");

-- AddForeignKey
ALTER TABLE "CompanyMembership" ADD CONSTRAINT "CompanyMembership_role_fkey" FOREIGN KEY ("role") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMembership" ADD CONSTRAINT "ProjectMembership_role_fkey" FOREIGN KEY ("role") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMembership" ADD CONSTRAINT "ProjectMembership_portalOrganization_fkey" FOREIGN KEY ("portalOrganization") REFERENCES "TradePartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConstructionLead" ADD CONSTRAINT "ConstructionLead_owner_fkey" FOREIGN KEY ("owner") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConstructionLead" ADD CONSTRAINT "ConstructionLead_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConstructionOpportunity" ADD CONSTRAINT "ConstructionOpportunity_owner_fkey" FOREIGN KEY ("owner") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConstructionOpportunity" ADD CONSTRAINT "ConstructionOpportunity_lead_fkey" FOREIGN KEY ("lead") REFERENCES "ConstructionLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConstructionOpportunity" ADD CONSTRAINT "ConstructionOpportunity_client_fkey" FOREIGN KEY ("client") REFERENCES "TradePartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConstructionOpportunity" ADD CONSTRAINT "ConstructionOpportunity_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
