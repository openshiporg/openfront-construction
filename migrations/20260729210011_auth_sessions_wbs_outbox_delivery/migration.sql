/*
  Warnings:

  - A unique constraint covering the columns `[budgetCodeKey]` on the table `BudgetCode` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[costCodeKey]` on the table `CostCode` will be added. If there are existing duplicate values, this will fail.

*/
-- Add and backfill tenant-scoped WBS keys before enforcing uniqueness.
ALTER TABLE "BudgetCode" ADD COLUMN "budgetCodeKey" TEXT;
UPDATE "BudgetCode"
SET "budgetCodeKey" = "project" || ':' || lower(trim("code"));
ALTER TABLE "BudgetCode" ALTER COLUMN "budgetCodeKey" SET NOT NULL;
ALTER TABLE "BudgetCode" ALTER COLUMN "budgetCodeKey" SET DEFAULT '';

ALTER TABLE "CostCode" ADD COLUMN "costCodeKey" TEXT;
UPDATE "CostCode"
SET "costCodeKey" = "company" || ':' || lower(trim("code"));
ALTER TABLE "CostCode" ALTER COLUMN "costCodeKey" SET NOT NULL;
ALTER TABLE "CostCode" ALTER COLUMN "costCodeKey" SET DEFAULT '';

-- AlterTable
ALTER TABLE "OutboxMessage" ADD COLUMN     "lastAttemptAt" TIMESTAMP(3),
ADD COLUMN     "lockOwner" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "lockedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "sessionKey" TEXT NOT NULL DEFAULT '',
    "user" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_sessionKey_key" ON "AuthSession"("sessionKey");

-- CreateIndex
CREATE INDEX "AuthSession_user_idx" ON "AuthSession"("user");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetCode_budgetCodeKey_key" ON "BudgetCode"("budgetCodeKey");

-- CreateIndex
CREATE UNIQUE INDEX "CostCode_costCodeKey_key" ON "CostCode"("costCodeKey");

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_user_fkey" FOREIGN KEY ("user") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
