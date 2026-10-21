type ExecutionAdmissionContext = { prisma?: { $queryRawUnsafe?<T>(query: string, ...values: unknown[]): Promise<T> } };

export async function lockExecutionAdmission(context: ExecutionAdmissionContext, kind: "RFI" | "Submittal", id: string, projectId: string, statuses: readonly string[], assignment?: { actorId: string; organizationId: string }) {
  const sql = context.prisma?.$queryRawUnsafe?.bind(context.prisma);
  if (!sql) throw new Error("Execution record admission locking is unavailable");
  const table = kind === "RFI" ? "RFI" : "Submittal";
  const partner = kind === "RFI" ? '"responsiblePartner"' : 'NULL::text';
  const [record] = await sql<Array<{ id: string; status: string; actorId: string | null; partnerId: string | null }>>(`SELECT id, status::text, "ballInCourt" AS "actorId", ${partner} AS "partnerId" FROM "${table}"
    WHERE id = $1 AND project = $2 AND company = (SELECT company FROM "Project" WHERE id = $2) FOR UPDATE`, id, projectId);
  if (!record || !statuses.includes(record.status)) throw new Error("This record is no longer eligible for the requested action");
  if (assignment && record.actorId !== assignment.actorId && record.partnerId !== assignment.organizationId) throw new Error("This record is no longer assigned to this participant");
  return record;
}

export async function lockSubmittalRevision(context: ExecutionAdmissionContext, submittalId: string, projectId: string, statuses: readonly string[]) {
  await lockExecutionAdmission(context, "Submittal", submittalId, projectId, statuses);
  const [row] = await context.prisma!.$queryRawUnsafe!<Array<{ revision: number }>>('SELECT revision FROM "Submittal" WHERE id = $1', submittalId);
  return Number(row?.revision ?? 0);
}

/** Admit a review decision only for the active step of the current revision round:
 * the row must still be pending, belong to the submittal's current revision, and
 * every earlier step in that round must already be decided. */
export async function lockActiveSubmittalReviewStep(context: ExecutionAdmissionContext, reviewId: string, submittalId: string, projectId: string) {
  const sql = context.prisma?.$queryRawUnsafe?.bind(context.prisma);
  if (!sql) throw new Error("Execution record admission locking is unavailable");
  const revision = await lockSubmittalRevision(context, submittalId, projectId, ["submitted", "under_review"]);
  const [review] = await sql<Array<{ id: string; status: string; sequence: number; submittalRevision: number }>>(
    'SELECT id, status::text, sequence, "submittalRevision" FROM "SubmittalReview" WHERE id = $1 AND submittal = $2 FOR UPDATE', reviewId, submittalId);
  if (!review || !["pending", "in_review"].includes(review.status)) throw new Error("This review step has already been decided");
  if (Number(review.submittalRevision) !== revision) throw new Error("This review step belongs to an earlier submission round");
  const [earlier] = await sql<Array<{ count: number }>>(
    `SELECT COUNT(*)::int AS count FROM "SubmittalReview" WHERE submittal = $1 AND "submittalRevision" = $2 AND sequence < $3 AND status IN ('pending', 'in_review')`,
    submittalId, revision, review.sequence);
  if (Number(earlier?.count ?? 0) > 0) throw new Error("Earlier reviewers in this round must respond first");
}
