-- Check-run records: hidden from staff lists (never deleted), still listed under Administration > All records.
-- AlterTable
ALTER TABLE "ServiceRequest" ADD COLUMN     "isTestRecord" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "isTestRecord" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ConstructionLead" ADD COLUMN     "isTestRecord" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ConstructionOpportunity" ADD COLUMN     "isTestRecord" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "IntakeSubmission" ADD COLUMN     "isTestRecord" BOOLEAN NOT NULL DEFAULT false;

