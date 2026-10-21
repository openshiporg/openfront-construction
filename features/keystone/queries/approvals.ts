import { hasProjectPermission } from "../access";
import { approvalTargets } from "../domain/approval-snapshots";
import { presentApprovalSnapshot } from "../domain/approval-review";
import { lockCurrentAuthority } from "../domain/current-authority";
import { canAccessProjectById, queryById } from "../domain/tenancy";
import type { CommandContext } from "../mutations/construction";

/** Internal approvers read the same immutable terms as exact assigned owners.
 * This is a projection, never a substitute for decision-time authority checks. */
export async function constructionApprovalSnapshot(_root: unknown, { projectId, requestId }: { projectId: string; requestId: string }, context: CommandContext & { __approvalReviewTransaction?: true }): Promise<string[]> {
  const session = context.session;
  if (!session?.itemId || session.authType === "api_key" || session.data.isActive === false || !projectId || !requestId || projectId.length > 200 || requestId.length > 200) throw new Error("Sign in and select an approval request");
  const request = await queryById(context, "ApprovalRequest", requestId, "id status targetId targetType targetStatus amountMinor currencyCode canonicalSnapshot snapshotDigest company { id } project { id }");
  const companyId = request?.company?.id;
  const type = request?.targetType;
  const config = typeof type === "string" && Object.hasOwn(approvalTargets, type) ? approvalTargets[type] : undefined;
  if (!request || request.status !== "pending" || !companyId || request.project?.id !== projectId || !config || !hasProjectPermission(session, companyId, projectId, config.permission, true) || !(await canAccessProjectById(context, session.itemId, projectId, true))) throw new Error("Pending approval review is unavailable for this project");
  if (!context.__approvalReviewTransaction) {
    if (!context.transaction) throw new Error("Transactional review context is required");
    return context.transaction(async tx => {
      const fresh = await lockCurrentAuthority(tx, companyId, projectId, config.permission);
      const scoped = tx.withSession ? tx.withSession(fresh) : tx;
      return constructionApprovalSnapshot(_root, { projectId, requestId }, { ...scoped, session: fresh, __approvalReviewTransaction: true });
    }, { timeout: 30_000 });
  }
  if (typeof type !== "string" || typeof request.canonicalSnapshot !== "string") throw new Error("Approval snapshot is unavailable");
  return presentApprovalSnapshot(type, request, request.canonicalSnapshot);
}
