import { hasProjectPermission } from "../access";
import { canAccessProjectById, queryById } from "../domain/tenancy";
import { requireCommandSession, type CommandContext } from "../mutations/construction";

export async function constructionBidComparison(
  _root: unknown,
  { projectId }: { projectId: string },
  context: CommandContext,
) {
  const session = requireCommandSession(context);
  const project = await queryById(context, "Project", projectId, "id company { id }");
  const companyId = project?.company?.id;
  const internalGrant = session.authType === "api_key" ||
    session.data.projectMemberships?.some(entry => entry.status === "active" && entry.project?.id === projectId && entry.portalType === "internal") ||
    session.data.companyMemberships?.some(entry => entry.status === "active" && entry.company?.id === companyId && entry.canAccessAllProjects);
  if (!companyId || !internalGrant ||
      !hasProjectPermission(session, companyId, projectId, "canReadPreconstruction") ||
      !(await canAccessProjectById(context, session.itemId, projectId))) {
    throw new Error("Bid comparison is not available for this project role");
  }
  const records = await context.sudo().query.BidSubmission.findMany!({
    where: { project: { id: { equals: projectId } } }, take: 200,
    orderBy: [{ totalMinor: "asc" }, { createdAt: "asc" }],
    query: "id submissionNumber status totalMinor currencyCode exclusions clarifications submittedAt tradePartner { id name } bidPackage { id number title status } lineItems(take: 200, orderBy: { lineNumber: asc }) { id description amountMinor budgetCode { code } }",
  });
  return records.map(record => ({
    id: String(record.id),
    packageNumber: String((record.bidPackage as Record<string, unknown> | null)?.number ?? ""),
    packageTitle: String((record.bidPackage as Record<string, unknown> | null)?.title ?? ""),
    submissionNumber: String(record.submissionNumber ?? ""),
    partnerName: String((record.tradePartner as Record<string, unknown> | null)?.name ?? ""),
    status: String(record.status ?? ""),
    totalMinor: String(record.totalMinor ?? "0"),
    currencyCode: String(record.currencyCode ?? "USD"),
    exclusions: String(record.exclusions ?? ""),
    clarifications: String(record.clarifications ?? ""),
    submittedAt: record.submittedAt instanceof Date ? record.submittedAt.toISOString() : record.submittedAt ? String(record.submittedAt) : null,
    lineCount: Array.isArray(record.lineItems) ? record.lineItems.length : 0,
  }));
}
