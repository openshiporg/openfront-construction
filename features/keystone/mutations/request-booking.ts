import type { KeystoneContext } from "@keystone-6/core/types";
import { requestIdFromPaymentKey } from "../domain/payment-settlement";

/**
 * A paid quote deposit books the job (Buildertrend/JobTread "sold lead → job"):
 * the accepted request becomes a won CRM opportunity and a live project with
 * its starter budget, the customer is added to that project's owner portal, the
 * deposit moves onto the new project's ledger (so Billing → Reverse payment
 * refunds it there), and the request advances to `booked`.
 *
 * Idempotent and serialized on the request row: settlement, the return page and
 * every webhook retry may call it; only the first creates anything.
 */
export async function bookPaidRequest(context: KeystoneContext, paymentId: string): Promise<{ projectId: string; opportunityId: string } | null> {
  const root = context.sudo();
  const payment = await root.prisma.payment.findUnique({ where: { id: paymentId }, select: { id: true, status: true, idempotencyKey: true, amountMinor: true, currencyCode: true, companyId: true } });
  const requestId = requestIdFromPaymentKey(payment?.idempotencyKey);
  if (!payment || !requestId || payment.status !== "settled" || !payment.companyId) return null;
  return root.transaction(async (tx: any) => {
    const sudo = tx.sudo();
    const [row] = await sudo.prisma.$queryRawUnsafe(
      `SELECT id, status::text AS status, project AS "projectId", opportunity AS "opportunityId" FROM "ServiceRequest" WHERE id = $1 FOR UPDATE`, requestId,
    ) as Array<{ id: string; status: string; projectId: string | null; opportunityId: string | null }>;
    if (!row) return null;
    if (row.projectId && row.opportunityId) return { projectId: row.projectId, opportunityId: row.opportunityId };
    if (row.status !== "payment_pending") return null;
    const request = await sudo.prisma.serviceRequest.findUnique({
      where: { id: requestId },
      select: { id: true, reference: true, serviceTitle: true, scope: true, version: true, currencyCode: true, acceptedSnapshot: true, companyId: true, customerId: true, customer: { select: { id: true, name: true, email: true } } },
    });
    if (!request?.companyId || request.companyId !== payment.companyId || !request.customerId) return null;
    const companyId = request.companyId;
    const snapshot = (request.acceptedSnapshot ?? {}) as Record<string, unknown>;
    const title = String(snapshot.serviceTitle || request.serviceTitle || "Accepted quote").slice(0, 200);
    const customerName = String(request.customer?.name || request.customer?.email || "Customer").slice(0, 200);
    const totalMinor = String(snapshot.totalMinor || "0");
    const currencyCode = (request.currencyCode || payment.currencyCode || "USD").toUpperCase();
    // The company's preconstruction lead approves the starter budget and owns the opportunity.
    const manager = await sudo.prisma.companyMembership.findFirst({
      where: { companyId, status: "active", role: { canManageProjects: true } }, orderBy: { createdAt: "asc" }, select: { userId: true, roleId: true },
    });

    // CRM: one lead per customer email (converted), one won opportunity per request.
    const email = String(request.customer?.email || "").trim().toLowerCase();
    let lead = email ? await sudo.prisma.constructionLead.findFirst({ where: { companyId, email }, select: { id: true } }) : null;
    if (!lead) lead = await sudo.db.ConstructionLead.createOne({ data: {
      name: customerName, email, source: "direct", status: "converted",
      notes: `Booked from quote request ${request.reference}.`, company: { connect: { id: companyId } },
    } });
    else await sudo.prisma.constructionLead.update({ where: { id: lead.id }, data: { status: "converted" } });
    // The customer as the project's owner organization (portal grants and approvals are organization-scoped).
    const client = (email ? await sudo.prisma.tradePartner.findFirst({ where: { companyId, partnerType: "owner", email }, select: { id: true } }) : null)
      ?? await sudo.db.TradePartner.createOne({ data: { name: customerName, partnerType: "owner", status: "approved", email, company: { connect: { id: companyId } } } });
    const opportunity = row.opportunityId ? { id: row.opportunityId } : await sudo.db.ConstructionOpportunity.createOne({ data: {
      number: request.reference, name: title, organization: customerName, stage: "won",
      estimatedValueMinor: totalMinor, currencyCode, probabilityBps: 10_000, expectedAwardDate: new Date(),
      notes: `Quote accepted and deposit paid online (${request.reference}).\n\nScope: ${String(snapshot.scope || request.scope).slice(0, 4000)}`,
      lead: { connect: { id: lead.id } }, client: { connect: { id: String(client.id) } },
      ...(manager?.userId ? { owner: { connect: { id: manager.userId } } } : {}),
      company: { connect: { id: companyId } },
    } });

    const project = row.projectId ? { id: row.projectId } : await sudo.db.Project.createOne({ data: {
      projectNumber: request.reference, name: title, status: "planning", currencyCode,
      description: `Booked from quote request ${request.reference} for ${customerName}.\n\n${String(snapshot.scope || request.scope).slice(0, 4000)}`,
      owner: { connect: { id: String(client.id) } },
      ...(manager?.userId ? { projectManager: { connect: { id: manager.userId } } } : {}),
      company: { connect: { id: companyId } },
    } });
    if (!row.projectId) {
      await initializeProjectBudget(sudo, { companyId, projectId: String(project.id), currencyCode, approverId: manager?.userId ?? null, roleId: manager?.roleId ?? null });
      // Owner portal: the customer follows the job, approvals and invoices from /portal.
      // Project access is role-driven, so the grant carries the company's external
      // (read-only, no dashboard) role, the same one portal invitations use.
      const portalRole = await sudo.prisma.role.findFirst({
        where: { companyId, name: "External Collaborator" }, select: { id: true },
      }) ?? await sudo.prisma.role.findFirst({
        where: { companyId, canReadProjects: true, canAccessDashboard: false, canManageProjects: false }, orderBy: { createdAt: "asc" }, select: { id: true },
      });
      // The role is attached after create: the list's role-assignment check is for
      // staff edits and the actor here is the paying customer, not an administrator.
      const membership = await sudo.db.ProjectMembership.createOne({ data: {
        status: "active", accessLevel: "contributor", portalType: "owner", joinedAt: new Date(),
        portalOrganization: { connect: { id: String(client.id) } },
        project: { connect: { id: project.id } }, user: { connect: { id: request.customerId } },
      } });
      if (portalRole) await sudo.prisma.projectMembership.update({ where: { id: String(membership.id) }, data: { roleId: portalRole.id } });
      // Staff who see this request on Quote requests (canManagePreconstruction) get the
      // project too, with their company role, so "Open project" and the Billing
      // refund path work for them and not only for all-projects administrators.
      const staff = await sudo.prisma.companyMembership.findMany({
        where: { companyId, status: "active", canAccessAllProjects: false, userId: { not: null }, role: { canManagePreconstruction: true } },
        select: { userId: true, roleId: true },
      });
      for (const member of staff) {
        if (!member.userId || member.userId === request.customerId) continue;
        // Role attached after create, as for the owner membership above.
        const grant = await sudo.db.ProjectMembership.createOne({ data: {
          status: "active", accessLevel: "manager", portalType: "internal", joinedAt: new Date(),
          project: { connect: { id: project.id } }, user: { connect: { id: member.userId } },
        } });
        if (member.roleId) await sudo.prisma.projectMembership.update({ where: { id: String(grant.id) }, data: { roleId: member.roleId } });
      }
      await sudo.prisma.payment.update({ where: { id: payment.id }, data: { projectId: String(project.id) } });
    }
    const version = request.version + 1;
    await sudo.prisma.$executeRawUnsafe(
      `UPDATE "ServiceRequest" SET status = 'booked', version = $2, project = $3, opportunity = $4, "updatedAt" = now() WHERE id = $1`,
      requestId, version, String(project.id), String(opportunity.id),
    );
    await sudo.db.ServiceRequestEvent.createOne({ data: {
      eventKey: `booked:${requestId}`, commandDigest: payment.id, action: "book", fromStatus: row.status, toStatus: "booked", version,
      snapshot: { paymentId: payment.id, projectId: String(project.id), opportunityId: String(opportunity.id) },
      request: { connect: { id: requestId } },
    } });
    return { projectId: String(project.id), opportunityId: String(opportunity.id) };
  }, { timeout: 20000 });
}

/** Same starter ledger createConstructionProject sets up: GEN cost/budget code, an active budget, default approval policies. */
async function initializeProjectBudget(sudo: any, args: { companyId: string; projectId: string; currencyCode: string; approverId: string | null; roleId: string | null }) {
  const { companyId, projectId, currencyCode } = args;
  const costCode = await sudo.prisma.costCode.findUnique({ where: { costCodeKey: `${companyId}:gen` }, select: { id: true } })
    ?? await sudo.db.CostCode.createOne({ data: { code: "GEN", name: "General", company: { connect: { id: companyId } } } });
  const budgetCode = await sudo.db.BudgetCode.createOne({ data: {
    code: "GEN", description: "General project costs", costType: "other", isActive: true,
    costCode: { connect: { id: String(costCode.id) } }, company: { connect: { id: companyId } }, project: { connect: { id: projectId } },
  } });
  const budget = await sudo.db.Budget.createOne({ data: {
    name: "Initial project budget", version: 1, status: "active", currencyCode, approvedAt: new Date(),
    ...(args.approverId ? { approvedBy: { connect: { id: args.approverId } } } : {}),
    project: { connect: { id: projectId } },
  } });
  await sudo.db.BudgetLineItem.createOne({ data: {
    description: "General project costs",
    budget: { connect: { id: budget.id } }, budgetCode: { connect: { id: budgetCode.id } }, project: { connect: { id: projectId } },
  } });
  for (const domain of ["budget_change", "prime_contract", "change_order", "progress_claim", "retainage_release"]) {
    await sudo.db.ApprovalPolicy.createOne({ data: {
      policyKey: `${companyId}:${projectId}:${domain}:default`, name: `Default ${domain.replaceAll("_", " ")} approval`, domain,
      minimumAmountMinor: "0", currencyCode, isActive: true,
      ...(args.roleId ? { approverRole: { connect: { id: args.roleId } } } : {}),
      company: { connect: { id: companyId } }, project: { connect: { id: projectId } },
    } });
  }
}
