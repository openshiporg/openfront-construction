-- Cancelling a booked quote request now archives its still-planning project (customer-requests.ts).
-- Bring requests cancelled before that change into line; projects past planning are left to staff.
UPDATE "Project" p SET "status" = 'archived', "updatedAt" = now()
FROM "ServiceRequest" sr
WHERE sr."project" = p."id" AND sr."status" = 'cancelled' AND p."status" = 'planning';
