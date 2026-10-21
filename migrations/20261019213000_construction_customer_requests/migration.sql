-- CreateEnum
CREATE TYPE "ServiceRequestStatusType" AS ENUM ('requested', 'quoted', 'payment_pending', 'cancelled');

-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL DEFAULT '',
    "requestKey" TEXT NOT NULL DEFAULT '',
    "requestDigest" TEXT NOT NULL DEFAULT '',
    "serviceTitle" TEXT NOT NULL DEFAULT '',
    "serviceSlug" TEXT NOT NULL DEFAULT '',
    "scope" TEXT NOT NULL DEFAULT '',
    "status" "ServiceRequestStatusType" NOT NULL DEFAULT 'requested',
    "version" INTEGER NOT NULL DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "quoteMinor" BIGINT NOT NULL DEFAULT 0,
    "quoteTerms" TEXT NOT NULL DEFAULT '',
    "expiresAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "acceptedSnapshot" JSONB,
    "customer" TEXT,
    "company" TEXT,
    "service" TEXT,
    "createdByUser" TEXT,
    "updatedByUser" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequestEvent" (
    "id" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL DEFAULT '',
    "commandDigest" TEXT NOT NULL DEFAULT '',
    "action" TEXT NOT NULL DEFAULT '',
    "fromStatus" TEXT NOT NULL DEFAULT '',
    "toStatus" TEXT NOT NULL DEFAULT '',
    "version" INTEGER,
    "snapshot" JSONB,
    "actor" TEXT,
    "request" TEXT,
    "createdByUser" TEXT,
    "updatedByUser" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceRequestEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceRequest_reference_key" ON "ServiceRequest"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceRequest_requestKey_key" ON "ServiceRequest"("requestKey");

-- CreateIndex
CREATE INDEX "ServiceRequest_customer_idx" ON "ServiceRequest"("customer");

-- CreateIndex
CREATE INDEX "ServiceRequest_company_idx" ON "ServiceRequest"("company");

-- CreateIndex
CREATE INDEX "ServiceRequest_service_idx" ON "ServiceRequest"("service");

-- CreateIndex
CREATE INDEX "ServiceRequest_createdByUser_idx" ON "ServiceRequest"("createdByUser");

-- CreateIndex
CREATE INDEX "ServiceRequest_updatedByUser_idx" ON "ServiceRequest"("updatedByUser");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceRequestEvent_eventKey_key" ON "ServiceRequestEvent"("eventKey");

-- CreateIndex
CREATE INDEX "ServiceRequestEvent_actor_idx" ON "ServiceRequestEvent"("actor");

-- CreateIndex
CREATE INDEX "ServiceRequestEvent_request_idx" ON "ServiceRequestEvent"("request");

-- CreateIndex
CREATE INDEX "ServiceRequestEvent_createdByUser_idx" ON "ServiceRequestEvent"("createdByUser");

-- CreateIndex
CREATE INDEX "ServiceRequestEvent_updatedByUser_idx" ON "ServiceRequestEvent"("updatedByUser");

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_customer_fkey" FOREIGN KEY ("customer") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_company_fkey" FOREIGN KEY ("company") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_service_fkey" FOREIGN KEY ("service") REFERENCES "PublicService"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequestEvent" ADD CONSTRAINT "ServiceRequestEvent_actor_fkey" FOREIGN KEY ("actor") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequestEvent" ADD CONSTRAINT "ServiceRequestEvent_request_fkey" FOREIGN KEY ("request") REFERENCES "ServiceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequestEvent" ADD CONSTRAINT "ServiceRequestEvent_createdByUser_fkey" FOREIGN KEY ("createdByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequestEvent" ADD CONSTRAINT "ServiceRequestEvent_updatedByUser_fkey" FOREIGN KEY ("updatedByUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

