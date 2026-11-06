import test from "node:test";
import assert from "node:assert/strict";
import { claimPaymentKey, requestIdFromPaymentKey, requestPaymentKey } from "../../features/keystone/domain/payment-settlement";
import { bookPaidRequest } from "../../features/keystone/mutations/request-booking";
import { parseProjectPhotos, projectPhotosError } from "../../features/lib/public-content-limits";

test("request deposit keys round-trip and never match claim keys", () => {
  assert.equal(requestIdFromPaymentKey(requestPaymentKey("req_1", "u1")), "req_1");
  assert.equal(requestIdFromPaymentKey(`${claimPaymentKey("clm_1", BigInt(5000))}:0`), null);
  assert.equal(requestIdFromPaymentKey(null), null);
});

test("project photos accept site paths and https URLs only", () => {
  assert.deepEqual(parseProjectPhotos("/projects/a-1.jpg\n https://cdn.example.com/b.webp \n\n"), ["/projects/a-1.jpg", "https://cdn.example.com/b.webp"]);
  assert.deepEqual(parseProjectPhotos("javascript:alert(1)\nhttp://x/y.jpg\n/projects/../x.txt"), []);
  assert.equal(projectPhotosError(""), null);
  assert.equal(projectPhotosError("/projects/a.jpg"), null);
  assert.match(String(projectPhotosError("/projects/a.jpg\nnot a url")), /https image URL/);
  assert.match(String(projectPhotosError(Array.from({ length: 13 }, (_, i) => `/p/${i}.jpg`).join("\n"))), /at most 12/);
});

/** In-memory sudo context: enough of Keystone's db/prisma surface for the booking path. */
function fakeContext(initial: { requestStatus?: string; paymentStatus?: string } = {}) {
  const created: Record<string, any[]> = {};
  const request: any = {
    id: "req_1", reference: "SR-ABC12345", serviceTitle: "Kitchen remodel", scope: "Full gut and rebuild", version: 2, status: initial.requestStatus ?? "payment_pending",
    currencyCode: "USD", acceptedSnapshot: { serviceTitle: "Kitchen remodel", scope: "Full gut and rebuild", totalMinor: "1250000" },
    companyId: "co_1", customerId: "u_cust", customer: { id: "u_cust", name: "Pat Owner", email: "pat@example.com" }, projectId: null, opportunityId: null,
  };
  const payment: any = { id: "pay_1", status: initial.paymentStatus ?? "settled", idempotencyKey: requestPaymentKey("req_1", "u_cust"), amountMinor: BigInt(1250000), currencyCode: "USD", companyId: "co_1", projectId: "proj_other" };
  let n = 0;
  const createOne = (list: string) => async ({ data }: { data: any }) => { const row = { id: `${list}_${++n}`, ...data }; (created[list] ||= []).push(row); return row; };
  const db = new Proxy({}, { get: (_t, list: string) => ({ createOne: createOne(list) }) });
  const prisma: any = {
    payment: { findUnique: async () => payment, update: async ({ data }: any) => Object.assign(payment, data) },
    serviceRequest: { findUnique: async () => request },
    companyMembership: { findFirst: async () => ({ userId: "u_pm", roleId: "role_pm" }) },
    role: { findFirst: async ({ where }: any) => where.name === "External Collaborator" ? { id: "role_external" } : null },
    constructionLead: { findFirst: async () => null, update: async () => undefined },
    tradePartner: { findFirst: async () => created.TradePartner?.[0] ?? null },
    costCode: { findUnique: async () => null },
    $queryRawUnsafe: async () => [{ id: request.id, status: request.status, projectId: request.projectId, opportunityId: request.opportunityId }],
    $executeRawUnsafe: async (_sql: string, _id: string, version: number, projectId: string, opportunityId: string) => {
      Object.assign(request, { status: "booked", version, projectId, opportunityId });
    },
  };
  const sudo: any = { prisma, db, transaction: async (fn: any) => fn({ sudo: () => sudo }) };
  return { context: { sudo: () => sudo } as any, created, request, payment };
}

test("a settled deposit books the job: won opportunity, project, owner portal, ledger move", async () => {
  const { context, created, request, payment } = fakeContext();
  const result = await bookPaidRequest(context, "pay_1");
  assert.ok(result?.projectId && result.opportunityId);
  assert.equal(request.status, "booked");
  assert.equal(request.version, 3);
  const [opportunity] = created.ConstructionOpportunity;
  assert.equal(opportunity.stage, "won");
  assert.equal(opportunity.estimatedValueMinor, "1250000");
  assert.equal(opportunity.number, "SR-ABC12345");
  const [project] = created.Project;
  assert.equal(project.projectNumber, "SR-ABC12345");
  assert.equal(project.status, "planning");
  assert.deepEqual(project.company, { connect: { id: "co_1" } });
  const [membership] = created.ProjectMembership;
  assert.equal(membership.portalType, "owner");
  assert.deepEqual(membership.user, { connect: { id: "u_cust" } });
  assert.deepEqual(membership.role, { connect: { id: "role_external" } }, "portal reads are role-driven");
  assert.ok(membership.portalOrganization.connect.id);
  assert.equal(created.ConstructionLead[0].status, "converted");
  assert.equal(created.Budget.length, 1);
  assert.equal(created.ApprovalPolicy.length, 5);
  assert.equal(payment.projectId, result!.projectId, "deposit moves onto the booked project's ledger");
  assert.equal(created.ServiceRequestEvent[0].action, "book");
});

test("booking is idempotent across return page and webhook retries", async () => {
  const { context, created } = fakeContext();
  const first = await bookPaidRequest(context, "pay_1");
  const second = await bookPaidRequest(context, "pay_1");
  assert.deepEqual(second, first);
  assert.equal(created.Project.length, 1);
  assert.equal(created.ConstructionOpportunity.length, 1);
});

test("unsettled deposits and cancelled requests are never booked", async () => {
  const pending = fakeContext({ paymentStatus: "pending" });
  assert.equal(await bookPaidRequest(pending.context, "pay_1"), null);
  assert.equal(pending.created.Project, undefined);
  const cancelled = fakeContext({ requestStatus: "cancelled" });
  assert.equal(await bookPaidRequest(cancelled.context, "pay_1"), null);
  assert.equal(cancelled.created.Project, undefined);
});
