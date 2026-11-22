-- Store Settings: deposit percentage charged online when a quote is accepted (default 30%),
-- and optional contractor licence / insurer shown on the public site only when filled.
-- AlterTable
ALTER TABLE "PublicSiteProfile" ADD COLUMN     "depositPercent" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "insurer" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "licenseNumber" TEXT NOT NULL DEFAULT '';
