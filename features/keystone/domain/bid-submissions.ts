type BidAdmissionContext = { prisma?: { $queryRawUnsafe?<T>(query: string, ...values: unknown[]): Promise<T> } };

/** Historical recovery checks ownership, never new-admission state/deadline. */
export async function assertPortalBidRecoveryOwnership(context: BidAdmissionContext, projectId: string, invitationId: string, organizationId: string) {
  const sql = context.prisma?.$queryRawUnsafe?.bind(context.prisma);
  if (!sql) throw new Error("Bid recovery ownership lookup is unavailable");
  type OwnedBid = { partnerId: string | null; projectId: string; companyId: string; projectCompanyId: string };
  const [submission] = await sql<OwnedBid[]>('SELECT candidate."tradePartner" AS "partnerId", candidate.project AS "projectId", candidate.company AS "companyId", scope.company AS "projectCompanyId" FROM "BidSubmission" candidate JOIN "Project" scope ON scope.id = candidate.project WHERE candidate.invitation = $1', invitationId);
  const [invitation] = submission ? [] : await sql<OwnedBid[]>('SELECT candidate."tradePartner" AS "partnerId", candidate.project AS "projectId", candidate.company AS "companyId", scope.company AS "projectCompanyId" FROM "BidInvitation" candidate JOIN "Project" scope ON scope.id = candidate.project WHERE candidate.id = $1', invitationId);
  const owned = submission ?? invitation;
  if (!owned || owned.projectId !== projectId || owned.companyId !== owned.projectCompanyId || owned.partnerId !== organizationId) throw new Error("Bid request is not owned by this project organization");
}

/** Called for NEW admission only, inside the project command transaction. */
export async function lockBidSubmissionAdmission(context: BidAdmissionContext, projectId: string, invitationId: string, options: { organizationId?: string; enforceDeadline?: boolean } = {}) {
  const sql = context.prisma?.$queryRawUnsafe?.bind(context.prisma);
  if (!sql) throw new Error("Bid submission admission locking is unavailable");
  const [current] = await sql<Array<{ packageId: string; partnerId: string | null; budgetCodeId: string | null; invitationStatus: string; packageStatus: string; dueAt: Date | null; hasSubmission: boolean }>>(`SELECT invitation."bidPackage" AS "packageId", invitation."tradePartner" AS "partnerId", invitation."budgetCode" AS "budgetCodeId",
    invitation.status::text AS "invitationStatus", package.status::text AS "packageStatus", package."dueAt",
    EXISTS (SELECT 1 FROM "BidSubmission" submission WHERE submission.invitation = invitation.id) AS "hasSubmission"
    FROM "BidInvitation" invitation JOIN "BidPackage" package ON package.id = invitation."bidPackage"
    JOIN "Project" project ON project.id = invitation.project
    WHERE invitation.id = $1 AND invitation.project = $2 AND package.project = $2
      AND invitation.company = project.company AND package.company = project.company
    FOR UPDATE OF invitation, package`, invitationId, projectId);
  if (!current?.partnerId || current.packageStatus !== "open" || current.hasSubmission || !["invited", "viewed", "intent_to_bid"].includes(current.invitationStatus)) throw new Error("This invitation is no longer eligible for a new bid submission");
  if (options.organizationId && current.partnerId !== options.organizationId) throw new Error("Bid invitation is not assigned to this organization");
  if (options.enforceDeadline && current.dueAt && new Date(current.dueAt).getTime() <= Date.now()) throw new Error("Bid invitation is past due");
  return { packageId: current.packageId, partnerId: current.partnerId, budgetCodeId: current.budgetCodeId };
}
