-- CreateEnum
CREATE TYPE "OutboxMessageStatusType" AS ENUM ('pending', 'processing', 'delivered', 'retry', 'dead_letter');

-- CreateTable
CREATE TABLE "OutboxMessage" (
    "id" TEXT NOT NULL,
    "messageKey" TEXT NOT NULL DEFAULT '',
    "eventType" TEXT NOT NULL DEFAULT '',
    "aggregateType" TEXT NOT NULL DEFAULT '',
    "aggregateId" TEXT NOT NULL DEFAULT '',
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "canonicalPayload" TEXT NOT NULL DEFAULT '',
    "payloadDigest" TEXT NOT NULL DEFAULT '',
    "status" "OutboxMessageStatusType" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "lastError" TEXT NOT NULL DEFAULT '',
    "company" TEXT,
    "project" TEXT,
    "agentAction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboxMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OutboxMessage_messageKey_key" ON "OutboxMessage"("messageKey");

-- CreateIndex
CREATE INDEX "OutboxMessage_company_idx" ON "OutboxMessage"("company");

-- CreateIndex
CREATE INDEX "OutboxMessage_project_idx" ON "OutboxMessage"("project");

-- CreateIndex
CREATE INDEX "OutboxMessage_agentAction_idx" ON "OutboxMessage"("agentAction");

-- AddForeignKey
ALTER TABLE "OutboxMessage" ADD CONSTRAINT "OutboxMessage_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboxMessage" ADD CONSTRAINT "OutboxMessage_project_fkey" FOREIGN KEY ("project") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboxMessage" ADD CONSTRAINT "OutboxMessage_agentAction_fkey" FOREIGN KEY ("agentAction") REFERENCES "AgentAction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
