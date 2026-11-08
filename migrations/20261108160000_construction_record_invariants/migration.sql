-- Construction record invariants (round-2 invariants grill, 2026-11-08).
-- Commands refuse these with readable messages first (domain/business-numbers.ts, calendar-dates.ts, the
-- command pre-checks); this migration is the database backstop for every other writer.
-- Live data was checked before writing: 0 duplicates and 0 violations for every rule below.

-- 1. Business numbers are unique within their project (trimmed, case-insensitive); a project number is
--    unique within its company; a schedule task code is unique within its schedule.
CREATE UNIQUE INDEX "Project_company_projectNumber_key" ON "Project" ("company", lower(btrim("projectNumber"))) WHERE "company" IS NOT NULL AND btrim("projectNumber") <> '';
CREATE UNIQUE INDEX "BidPackage_project_number_key" ON "BidPackage" ("project", lower(btrim("number"))) WHERE "project" IS NOT NULL AND btrim("number") <> '';
CREATE UNIQUE INDEX "ChangeEvent_project_number_key" ON "ChangeEvent" ("project", lower(btrim("number"))) WHERE "project" IS NOT NULL AND btrim("number") <> '';
CREATE UNIQUE INDEX "RFI_project_number_key" ON "RFI" ("project", lower(btrim("number"))) WHERE "project" IS NOT NULL AND btrim("number") <> '';
CREATE UNIQUE INDEX "Submittal_project_number_key" ON "Submittal" ("project", lower(btrim("number"))) WHERE "project" IS NOT NULL AND btrim("number") <> '';
CREATE UNIQUE INDEX "PunchItem_project_number_key" ON "PunchItem" ("project", lower(btrim("number"))) WHERE "project" IS NOT NULL AND btrim("number") <> '';
CREATE UNIQUE INDEX "SafetyObservation_project_number_key" ON "SafetyObservation" ("project", lower(btrim("observationNumber"))) WHERE "project" IS NOT NULL AND btrim("observationNumber") <> '';
CREATE UNIQUE INDEX "BudgetChange_project_number_key" ON "BudgetChange" ("project", lower(btrim("number"))) WHERE "project" IS NOT NULL AND btrim("number") <> '';
CREATE UNIQUE INDEX "Estimate_project_number_key" ON "Estimate" ("project", lower(btrim("number"))) WHERE "project" IS NOT NULL AND btrim("number") <> '';
CREATE UNIQUE INDEX "PrimeContract_project_number_key" ON "PrimeContract" ("project", lower(btrim("number"))) WHERE "project" IS NOT NULL AND btrim("number") <> '';
CREATE UNIQUE INDEX "Commitment_project_number_key" ON "Commitment" ("project", lower(btrim("number"))) WHERE "project" IS NOT NULL AND btrim("number") <> '';
CREATE UNIQUE INDEX "ChangeOrder_project_number_key" ON "ChangeOrder" ("project", lower(btrim("number"))) WHERE "project" IS NOT NULL AND btrim("number") <> '';
CREATE UNIQUE INDEX "ProgressClaim_project_number_key" ON "ProgressClaim" ("project", lower(btrim("claimNumber"))) WHERE "project" IS NOT NULL AND btrim("claimNumber") <> '';
CREATE UNIQUE INDEX "SafetyIncident_project_number_key" ON "SafetyIncident" ("project", lower(btrim("incidentNumber"))) WHERE "project" IS NOT NULL AND btrim("incidentNumber") <> '';
CREATE UNIQUE INDEX "Inspection_project_number_key" ON "Inspection" ("project", lower(btrim("inspectionNumber"))) WHERE "project" IS NOT NULL AND btrim("inspectionNumber") <> '';
CREATE UNIQUE INDEX "CorrectiveAction_project_number_key" ON "CorrectiveAction" ("project", lower(btrim("actionNumber"))) WHERE "project" IS NOT NULL AND btrim("actionNumber") <> '';
CREATE UNIQUE INDEX "ProcurementRequest_project_number_key" ON "ProcurementRequest" ("project", lower(btrim("requestNumber"))) WHERE "project" IS NOT NULL AND btrim("requestNumber") <> '';
CREATE UNIQUE INDEX "MaterialReceipt_project_number_key" ON "MaterialReceipt" ("project", lower(btrim("receiptNumber"))) WHERE "project" IS NOT NULL AND btrim("receiptNumber") <> '';
CREATE UNIQUE INDEX "LienWaiver_project_number_key" ON "LienWaiver" ("project", lower(btrim("waiverNumber"))) WHERE "project" IS NOT NULL AND btrim("waiverNumber") <> '';
CREATE UNIQUE INDEX "RetainageRelease_project_number_key" ON "RetainageRelease" ("project", lower(btrim("releaseNumber"))) WHERE "project" IS NOT NULL AND btrim("releaseNumber") <> '';
CREATE UNIQUE INDEX "Drawing_project_number_key" ON "Drawing" ("project", lower(btrim("drawingNumber"))) WHERE "project" IS NOT NULL AND btrim("drawingNumber") <> '';
CREATE UNIQUE INDEX "SpecificationSection_project_number_key" ON "SpecificationSection" ("project", lower(btrim("sectionNumber"))) WHERE "project" IS NOT NULL AND btrim("sectionNumber") <> '';
CREATE UNIQUE INDEX "ScheduleTask_schedule_taskCode_key" ON "ScheduleTask" ("schedule", lower(btrim("taskCode"))) WHERE "schedule" IS NOT NULL AND btrim("taskCode") <> '';

-- 2. One daily log per project per calendar day ("logDate" is a timestamp without time zone holding the day).
CREATE UNIQUE INDEX "DailyLog_project_logDay_key" ON "DailyLog" ("project", (("logDate")::date)) WHERE "project" IS NOT NULL;

-- 3. A schedule dependency links two different tasks once.
CREATE UNIQUE INDEX "ScheduleDependency_schedule_edge_key" ON "ScheduleDependency" ("schedule", "predecessor", "successor") WHERE "schedule" IS NOT NULL AND "predecessor" IS NOT NULL AND "successor" IS NOT NULL;
ALTER TABLE "ScheduleDependency" ADD CONSTRAINT "ScheduleDependency_distinct_tasks_check" CHECK ("predecessor" IS NULL OR "successor" IS NULL OR "predecessor" <> "successor");
ALTER TABLE "ScheduleDependency" ADD CONSTRAINT "ScheduleDependency_lag_range_check" CHECK ("lagDays" IS NULL OR "lagDays" BETWEEN -3650 AND 3650);

-- 4. Money: payments, reversals and allocations are positive; a reversal never exceeds its payment is enforced
--    by the command (it reverses the full amount once); currencies are ISO-4217 shaped.
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_amount_positive_check" CHECK ("amountMinor" > 0);
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_currency_code_check" CHECK ("currencyCode" ~ '^[A-Z]{3}$');
ALTER TABLE "PaymentReversal" ADD CONSTRAINT "PaymentReversal_amount_positive_check" CHECK ("amountMinor" > 0);
CREATE UNIQUE INDEX "PaymentReversal_payment_key" ON "PaymentReversal" ("payment") WHERE "payment" IS NOT NULL;
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_amount_positive_check" CHECK ("amountMinor" > 0);
ALTER TABLE "RetainageRelease" ADD CONSTRAINT "RetainageRelease_amount_positive_check" CHECK ("amountMinor" > 0);
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_quote_nonnegative_check" CHECK ("quoteMinor" >= 0);
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_quoted_terms_check" CHECK ("status"::text NOT IN ('quoted', 'payment_pending', 'booked') OR ("quoteMinor" > 0 AND "expiresAt" IS NOT NULL));

-- 5. Contracts: revised = original + approved changes, never negative; retainage 0..100%.
ALTER TABLE "PrimeContract" ADD CONSTRAINT "PrimeContract_revised_sum_check" CHECK ("revisedContractMinor" IS NULL OR "originalContractMinor" IS NULL OR "revisedContractMinor" = "originalContractMinor" + COALESCE("approvedChangesMinor", 0));
ALTER TABLE "PrimeContract" ADD CONSTRAINT "PrimeContract_amounts_nonnegative_check" CHECK (COALESCE("originalContractMinor", 0) >= 0 AND COALESCE("revisedContractMinor", 0) >= 0 AND COALESCE("billedToDateMinor", 0) >= 0 AND COALESCE("paidToDateMinor", 0) >= 0);
ALTER TABLE "PrimeContract" ADD CONSTRAINT "PrimeContract_retainage_bps_check" CHECK ("defaultRetainageBps" IS NULL OR "defaultRetainageBps" BETWEEN 0 AND 10000);
ALTER TABLE "PrimeContract" ADD CONSTRAINT "PrimeContract_dates_order_check" CHECK ("startDate" IS NULL OR "completionDate" IS NULL OR "completionDate" >= "startDate");
ALTER TABLE "Commitment" ADD CONSTRAINT "Commitment_revised_sum_check" CHECK ("revisedContractMinor" IS NULL OR "originalContractMinor" IS NULL OR "revisedContractMinor" = "originalContractMinor" + COALESCE("approvedChangesMinor", 0));
ALTER TABLE "Commitment" ADD CONSTRAINT "Commitment_amounts_nonnegative_check" CHECK (COALESCE("originalContractMinor", 0) >= 0 AND COALESCE("revisedContractMinor", 0) >= 0 AND COALESCE("invoicedToDateMinor", 0) >= 0 AND COALESCE("paidToDateMinor", 0) >= 0);
ALTER TABLE "Commitment" ADD CONSTRAINT "Commitment_retainage_bps_check" CHECK ("defaultRetainageBps" IS NULL OR "defaultRetainageBps" BETWEEN 0 AND 10000);
ALTER TABLE "Commitment" ADD CONSTRAINT "Commitment_dates_order_check" CHECK ("startDate" IS NULL OR "completionDate" IS NULL OR "completionDate" >= "startDate");
ALTER TABLE "ContractLineItem" ADD CONSTRAINT "ContractLineItem_amounts_check" CHECK (COALESCE("scheduledValueMinor", 0) >= 0 AND COALESCE("revisedValueMinor", 0) >= 0 AND ("retainageBps" IS NULL OR "retainageBps" BETWEEN 0 AND 10000));

-- 6. Budget lines: revised = original + approved changes, never negative.
ALTER TABLE "BudgetLineItem" ADD CONSTRAINT "BudgetLineItem_revised_sum_check" CHECK ("revisedAmountMinor" IS NULL OR "originalAmountMinor" IS NULL OR "revisedAmountMinor" = "originalAmountMinor" + COALESCE("approvedChangesMinor", 0));
ALTER TABLE "BudgetLineItem" ADD CONSTRAINT "BudgetLineItem_amounts_nonnegative_check" CHECK (COALESCE("originalAmountMinor", 0) >= 0 AND COALESCE("revisedAmountMinor", 0) >= 0 AND COALESCE("committedAmountMinor", 0) >= 0 AND COALESCE("actualCostMinor", 0) >= 0);
ALTER TABLE "DirectCost" ADD CONSTRAINT "DirectCost_amount_nonnegative_check" CHECK ("amountMinor" IS NULL OR "amountMinor" >= 0);

-- 7. Progress claims: period ends on/after it starts; claim lines in range.
ALTER TABLE "ProgressClaim" ADD CONSTRAINT "ProgressClaim_period_order_check" CHECK ("periodEnd" >= "periodStart");
ALTER TABLE "ProgressClaim" ADD CONSTRAINT "ProgressClaim_amounts_nonnegative_check" CHECK (COALESCE("retainageMinor", 0) >= 0 AND COALESCE("currentPaymentDueMinor", 0) >= 0 AND COALESCE("previousPaymentsMinor", 0) >= 0);
ALTER TABLE "ProgressClaimLineItem" ADD CONSTRAINT "ProgressClaimLineItem_ranges_check" CHECK (COALESCE("previousWorkMinor", 0) >= 0 AND COALESCE("currentWorkMinor", 0) >= 0 AND COALESCE("retainageMinor", 0) >= 0 AND ("retainageBps" IS NULL OR "retainageBps" BETWEEN 0 AND 10000) AND ("percentComplete" IS NULL OR "percentComplete" BETWEEN 0 AND 100));

-- 8. Field and schedule ranges and windows.
ALTER TABLE "ScheduleTask" ADD CONSTRAINT "ScheduleTask_ranges_check" CHECK (("percentComplete" IS NULL OR "percentComplete" BETWEEN 0 AND 100) AND ("plannedStart" IS NULL OR "plannedFinish" IS NULL OR "plannedFinish"::date >= "plannedStart"::date));
ALTER TABLE "Project" ADD CONSTRAINT "Project_dates_order_check" CHECK ("startDate" IS NULL OR "substantialCompletionDate" IS NULL OR "substantialCompletionDate" >= "startDate");
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_score_range_check" CHECK ("scorePercent" IS NULL OR "scorePercent" BETWEEN 0 AND 100);
ALTER TABLE "DailyLogEntry" ADD CONSTRAINT "DailyLogEntry_window_check" CHECK (("startedAt" IS NULL OR "endedAt" IS NULL OR "endedAt" >= "startedAt") AND ("workerCount" IS NULL OR "workerCount" >= 0));
ALTER TABLE "LaborEntry" ADD CONSTRAINT "LaborEntry_nonnegative_check" CHECK (COALESCE("regularHours", 0) >= 0 AND COALESCE("overtimeHours", 0) >= 0 AND COALESCE("doubleTimeHours", 0) >= 0 AND COALESCE("hourlyRateMinor", 0) >= 0 AND COALESCE("totalCostMinor", 0) >= 0);
ALTER TABLE "MaterialReceiptLine" ADD CONSTRAINT "MaterialReceiptLine_quantities_check" CHECK ("quantityReceived" >= 0 AND "quantityAccepted" >= 0 AND "quantityAccepted" <= "quantityReceived" AND COALESCE("quantityRejected", 0) >= 0);
ALTER TABLE "ProcurementRequestLine" ADD CONSTRAINT "ProcurementRequestLine_amounts_check" CHECK ("quantity" > 0 AND COALESCE("estimatedUnitCostMinor", 0) >= 0 AND COALESCE("estimatedAmountMinor", 0) >= 0);
ALTER TABLE "ConstructionOpportunity" ADD CONSTRAINT "ConstructionOpportunity_ranges_check" CHECK (("probabilityBps" IS NULL OR "probabilityBps" BETWEEN 0 AND 10000) AND COALESCE("estimatedValueMinor", 0) >= 0);
