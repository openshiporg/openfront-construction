import type { KeystoneContext } from "@keystone-6/core/types";
import { z } from "zod";
import { lockCurrentAuthority } from "../domain/current-authority";

/**
 * Mark or unmark check-run records (projects, quote requests, leads, pursuits, website inquiries)
 * so staff lists stop showing them. Nothing is deleted: flagged records keep their audit trail and stay
 * reachable under Administration > All records. Store administrators only (canManageSettings), one company at a time.
 */
const ids = z.array(z.string().min(1).max(200)).max(500).default([]);
const input = z.object({
  companyId: z.string().min(1).max(200),
  isTestRecord: z.boolean(),
  projects: ids, requests: ids, leads: ids, opportunities: ids, inquiries: ids,
});

export async function markConstructionTestRecords(_root: unknown, args: { input: unknown }, context: KeystoneContext) {
  const actorId = context.session?.itemId;
  if (!actorId || context.session?.authType !== "session") throw new Error("Sign in to continue");
  const parsed = input.safeParse(args.input);
  if (!parsed.success) throw new Error("Invalid test-record selection");
  const { companyId, isTestRecord: flag, projects, requests, leads, opportunities, inquiries } = parsed.data;
  return context.transaction(async tx => {
    await lockCurrentAuthority(tx, companyId, null, "canManageSettings");
    const scope = (list: string[]) => ({ id: { in: list }, companyId });
    const [p, r, l, o, i] = await Promise.all([
      tx.prisma.project.updateMany({ where: scope(projects), data: { isTestRecord: flag } }),
      tx.prisma.serviceRequest.updateMany({ where: scope(requests), data: { isTestRecord: flag } }),
      tx.prisma.constructionLead.updateMany({ where: scope(leads), data: { isTestRecord: flag } }),
      tx.prisma.constructionOpportunity.updateMany({ where: scope(opportunities), data: { isTestRecord: flag } }),
      tx.prisma.intakeSubmission.updateMany({ where: scope(inquiries), data: { isTestRecord: flag } }),
    ]);
    return `${flag ? "Marked" : "Unmarked"} ${p.count} projects, ${r.count} requests, ${l.count} leads, ${o.count} pursuits, ${i.count} inquiries`;
  });
}
