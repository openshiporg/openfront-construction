-- Public project photos, and quote requests booked into a project + won opportunity on deposit.
-- AlterEnum
ALTER TYPE "ServiceRequestStatusType" ADD VALUE 'booked';

-- AlterTable
ALTER TABLE "ServiceRequest" ADD COLUMN     "opportunity" TEXT,
ADD COLUMN     "project" TEXT;

-- AlterTable
ALTER TABLE "PublicProject" ADD COLUMN     "photos" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "ServiceRequest_project_idx" ON "ServiceRequest"("project");

-- CreateIndex
CREATE INDEX "ServiceRequest_opportunity_idx" ON "ServiceRequest"("opportunity");

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_opportunity_fkey" FOREIGN KEY ("opportunity") REFERENCES "ConstructionOpportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Demo photos for the published portfolio (site-hosted under /public/projects).
UPDATE "PublicProject" SET "photos" = '/projects/' || "slug" || '-1.jpg' || E'\n' || '/projects/' || "slug" || '-2.jpg'
WHERE "photos" = '' AND "slug" IN ('civic-learning-center', 'maple-grove-elementary-addition', 'riverside-branch-library-renovation', 'franklin-township-fire-station-4');
