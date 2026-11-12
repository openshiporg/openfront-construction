-- Projects booked from a paid quote deposit only granted the paying customer, so staff
-- who handle quote requests (company role with canManagePreconstruction, not all-projects)
-- got 404 on "Open project" and could not reach the Billing refund. Give each such active
-- company member one active internal manager grant, with their company role, on every
-- project booked from a request of their company. New bookings do this in request-booking.ts.
INSERT INTO "ProjectMembership" ("id", "membershipKey", "user", "project", "status", "accessLevel", "role", "portalType", "joinedAt", "createdAt", "updatedAt")
SELECT 'c' || substr(md5(cm."user" || ':' || sr."project" || clock_timestamp()::text), 1, 24),
       sr."project" || ':' || cm."user", cm."user", sr."project", 'active', 'manager', cm."role", 'internal', now(), now(), now()
FROM "ServiceRequest" sr
JOIN "CompanyMembership" cm ON cm."company" = sr."company"
JOIN "Role" r ON r."id" = cm."role"
WHERE sr."project" IS NOT NULL
  AND cm."status" = 'active' AND cm."canAccessAllProjects" = false AND cm."user" IS NOT NULL
  AND r."canManagePreconstruction" = true
  AND (sr."customer" IS NULL OR cm."user" <> sr."customer")
  AND NOT EXISTS (SELECT 1 FROM "ProjectMembership" pm WHERE pm."membershipKey" = sr."project" || ':' || cm."user");
