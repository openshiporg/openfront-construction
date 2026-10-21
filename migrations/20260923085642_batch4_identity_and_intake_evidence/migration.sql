-- Expand-only fields for safe invitation setup and immutable intake-consent provenance.
-- AlterTable
ALTER TABLE "AccountInvitation" ADD COLUMN     "accountSetupRequired" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "IntakeSubmission" ADD COLUMN     "privacyNoticeDigest" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "privacyNoticeSnapshot" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "ApprovalRequest" ADD COLUMN "policySnapshot" TEXT NOT NULL DEFAULT '',
ADD COLUMN "policyDigest" TEXT NOT NULL DEFAULT '',
ADD COLUMN "approverRoleIdSnapshot" TEXT NOT NULL DEFAULT '';

-- Support bounded per-site request-window counts without scanning the full intake history.
CREATE INDEX "IntakeSubmission_site_submittedAt_idx" ON "IntakeSubmission"("site", "submittedAt");

