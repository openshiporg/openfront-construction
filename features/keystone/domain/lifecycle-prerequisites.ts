import type { LifecycleListKey } from "./lifecycle";
import { assertSettlementCompatibility, deriveClaimPaymentStatus } from "./billing-invariants";
import { deriveProcurementReceiptStatus, quantityToUnits, receiptTotalsAreValid } from "./procurement-invariants";
import { queryById, queryCount, type KeystoneContextLike, type KeystoneQueryRecord } from "./tenancy";
import {
  digestApprovalSnapshot,
  lockApprovalPolicySnapshot,
  lockApprovalSnapshot,
  matchesApprovalSnapshot,
} from "./approval-snapshots";

type RecordWithRelations = KeystoneQueryRecord & Record<string, unknown>;

function rows(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value as Array<Record<string, unknown>> : [];
}

function boundedRows(value: unknown, limit: number, label: string): Array<Record<string, unknown>> {
  const records = rows(value);
  if (records.length > limit) throw new Error(`${label} exceeds the supported ${limit}-record review limit`);
  return records;
}

function statusOf(value: Record<string, unknown>): string {
  return String(value.status ?? "");
}

async function effectiveClaimSettlement(context: KeystoneContextLike, id: string): Promise<{ status: string; due: bigint; allocated: bigint }> {
  const prisma = (context as KeystoneContextLike & {
    prisma?: { $queryRawUnsafe?<T>(query: string, ...values: unknown[]): Promise<T> };
  }).prisma;
  if (prisma?.$queryRawUnsafe) {
    const [result] = await prisma.$queryRawUnsafe<Array<{ status: string; due: bigint; allocated: bigint }>>(
      `SELECT claim.status::text AS status, claim."currentPaymentDueMinor" AS due,
              COALESCE(SUM(allocation."amountMinor") FILTER (WHERE payment.status = 'settled'), 0)::bigint AS allocated
       FROM "ProgressClaim" claim
       LEFT JOIN "PaymentAllocation" allocation ON allocation."progressClaim" = claim.id
       LEFT JOIN "Payment" payment ON payment.id = allocation.payment
       WHERE claim.id = $1 GROUP BY claim.id`, id,
    );
    if (!result) throw new Error("Progress claim settlement ledger is unavailable");
    return result;
  }
  const record = await queryById(context, "ProgressClaim", id, "id status currentPaymentDueMinor allocations(take: 501) { amountMinor payment { status } }") as RecordWithRelations | null;
  if (!record?.id) throw new Error("Progress claim is unavailable");
  const allocations = rows(record.allocations);
  if (allocations.length > 500) throw new Error("Settlement ledger exceeds the bounded verification limit");
  const allocated = allocations.reduce((total, allocation) =>
    statusOf((allocation.payment as Record<string, unknown> | null) ?? {}) === "settled"
      ? total + BigInt(String(allocation.amountMinor ?? 0))
      : total, BigInt(0),
  );
  return { status: statusOf(record), due: BigInt(String(record.currentPaymentDueMinor ?? 0)), allocated };
}

async function requireApprovedSnapshot(
  context: KeystoneContextLike,
  listKey: string,
  id: string,
  targetStatus: string,
) {
  const approvals = await context.sudo().query.ApprovalRequest.findMany!({
    where: { targetType: { equals: listKey }, targetId: { equals: id }, targetStatus: { equals: targetStatus }, status: { equals: "approved" } },
    take: 101, orderBy: [{ decidedAt: "desc" }, { id: "desc" }],
    query: "id decidedAt canonicalSnapshot snapshotDigest policySnapshot policyDigest policy { id }",
  });
  if (approvals.length > 100) throw new Error("Approval history exceeds the supported verification limit");
  if (!approvals.length) throw new Error(`${listKey} requires an approved, value-bound approval request`);
  const current = await lockApprovalSnapshot(context, listKey, id);
  for (const approved of approvals) {
    const policy = approved.policy;
    if (!approved.id || !approved.decidedAt || !policy || typeof policy !== "object" || !("id" in policy) || typeof policy.id !== "string" ||
        typeof approved.policySnapshot !== "string" || typeof approved.policyDigest !== "string" || digestApprovalSnapshot(approved.policySnapshot) !== approved.policyDigest ||
        !matchesApprovalSnapshot(current, approved.canonicalSnapshot, approved.snapshotDigest)) continue;
    const currentPolicy = await lockApprovalPolicySnapshot(context, policy.id);
    if (currentPolicy.snapshotDigest === approved.policyDigest) return;
  }
  throw new Error(`${listKey} terms, snapshot version or policy changed; request a new value-bound approval`);
}

/**
 * Business evidence gates supplement adjacency. They run inside the same
 * transaction as the compare-and-set status update. No transition claims an
 * answer, review, inspection, settlement, waiver, or correction succeeded
 * unless the corresponding persisted evidence is present.
 */
export async function assertTransitionPrerequisites(
  context: KeystoneContextLike,
  listKey: LifecycleListKey,
  id: string,
  toStatus: string,
): Promise<void> {
  if (["BudgetChange", "PrimeContract", "ChangeOrder", "ProgressClaim", "RetainageRelease"].includes(listKey) && toStatus === "approved") {
    await requireApprovedSnapshot(context, listKey, id, toStatus);
  }

  switch (listKey) {
    case "BidPackage": {
      if (toStatus !== "open") return;
      const record = await queryById(context, listKey, id, "id invitations(take: 1) { id }") as RecordWithRelations | null;
      if (rows(record?.invitations).length === 0) throw new Error("A bid package requires at least one persisted invitation before issue");
      return;
    }
    case "Estimate": {
      if (toStatus !== "issued") return;
      const record = await queryById(context, listKey, id, "id currentVersion { id status lineItems(take: 1) { id } }") as RecordWithRelations | null;
      const version = record?.currentVersion as Record<string, unknown> | null | undefined;
      if (!version?.id || rows(version.lineItems).length === 0) throw new Error("An estimate requires a current version with line items before issue");
      return;
    }
    case "BudgetChange": {
      if (toStatus !== "pending_approval" && toStatus !== "posted") return;
      const record = await queryById(context, listKey, id, "id lineItems(take: 1) { id }") as RecordWithRelations | null;
      if (rows(record?.lineItems).length === 0) throw new Error("A budget change requires at least one line item");
      return;
    }
    case "PrimeContract":
    case "Commitment": {
      if (!["pending_approval", "out_for_signature", "executed"].includes(toStatus)) return;
      const record = await queryById(context, listKey, id, "id lineItems(take: 1) { id }") as RecordWithRelations | null;
      if (rows(record?.lineItems).length === 0) throw new Error(`${listKey} requires a schedule of values before this transition`);
      return;
    }
    case "ChangeOrder": {
      if (!["pending_approval", "approved", "executed", "posted"].includes(toStatus)) return;
      const record = await queryById(context, listKey, id, "id lineItems(take: 1) { id }") as RecordWithRelations | null;
      if (rows(record?.lineItems).length === 0) throw new Error("A change order requires persisted line items");
      return;
    }
    case "RFI": {
      if (toStatus !== "answered" && toStatus !== "closed") return;
      const count = await queryCount(context, "RFIResponse", {
        rfi: { id: { equals: id } },
        isOfficial: { equals: true },
      });
      if (count < 1) throw new Error("An RFI requires an official response before it can be answered or closed");
      return;
    }
    case "Submittal": {
      if (!["under_review", "approved", "revise_resubmit", "rejected", "closed"].includes(toStatus)) return;
      const record = await queryById(context, listKey, id, "id revision") as RecordWithRelations | null;
      const revision = Number(record?.revision ?? 0);
      // Only the current submission round decides the outcome; earlier rounds are history.
      const current = await queryById(context, listKey, id, `id reviews(where: { submittalRevision: { equals: ${revision} } }, take: 101, orderBy: { sequence: asc }) { id status completedAt }`) as RecordWithRelations | null;
      const reviews = boundedRows(current?.reviews, 100, "Submittal review route");
      if (reviews.length === 0) throw new Error("A submittal requires a persisted review route for its current revision");
      if (toStatus === "approved" && reviews.some(review => !["approved", "approved_as_noted"].includes(statusOf(review)))) {
        throw new Error("Every submittal review step must be approved before approval");
      }
      if (toStatus === "revise_resubmit" && !reviews.some(review => statusOf(review) === "revise_resubmit")) {
        throw new Error("Revise-and-resubmit requires a matching review decision");
      }
      if (toStatus === "rejected" && !reviews.some(review => statusOf(review) === "rejected")) {
        throw new Error("Submittal rejection requires a rejected review decision");
      }
      return;
    }
    case "ProgressClaim": {
      if (!["submitted", "under_review", "approved", "partially_paid", "paid", "closed"].includes(toStatus)) return;
      const record = await queryById(context, listKey, id, "id status lineItems(take: 500) { id earnedLessRetainageMinor }") as RecordWithRelations | null;
      const lines = rows(record?.lineItems);
      if (lines.length === 0) throw new Error("A progress claim requires immutable schedule-of-values snapshots");
      if (toStatus === "partially_paid" || toStatus === "paid") {
        throw new Error("Claim settlement status is derived from settled allocations and cannot be set manually");
      }
      if (toStatus === "closed") {
        const settlement = await effectiveClaimSettlement(context, id);
        // Fully retained work: nothing is payable now, so the claim completes
        // without a payment while its retainage stays held for later release.
        if (record?.status === "approved") {
          if (settlement.due !== BigInt(0) || settlement.allocated !== BigInt(0)) {
            throw new Error("Only a claim with no payment due can close without settlement");
          }
          return;
        }
        const derived = deriveClaimPaymentStatus(settlement.due, settlement.allocated);
        if (record?.status !== "paid" || derived !== "paid") {
          throw new Error("A claim can close only after settled allocations cover its full current payment due");
        }
      }
      return;
    }
    case "SafetyIncident": {
      if (toStatus !== "closed") return;
      const record = await queryById(context, listKey, id, "id severity correctiveActions(take: 101) { id status }") as RecordWithRelations | null;
      const actions = boundedRows(record?.correctiveActions, 100, "Incident corrective actions");
      if (["serious", "critical", "fatal"].includes(String(record?.severity)) && actions.length === 0) {
        throw new Error("Serious safety incidents require corrective action evidence before closure");
      }
      if (actions.some(action => !["verified", "closed"].includes(statusOf(action)))) {
        throw new Error("All incident corrective actions must be verified before closure");
      }
      return;
    }
    case "Inspection": {
      if (!["passed", "failed", "closed"].includes(toStatus)) return;
      const record = await queryById(context, listKey, id, "id status items(take: 501) { id result response correctiveActions(take: 101) { status } }") as RecordWithRelations | null;
      const items = boundedRows(record?.items, 500, "Inspection items");
      for (const item of items) boundedRows(item.correctiveActions, 100, "Inspection item corrective actions");
      if (items.length === 0 || items.some(entry => statusOf({ status: entry.result }) === "pending")) {
        throw new Error("Every inspection item requires a recorded result");
      }
      if (toStatus === "passed" && items.some(entry => !["pass", "not_applicable"].includes(String(entry.result)))) {
        throw new Error("An inspection with a failed item cannot be marked passed");
      }
      if (toStatus === "failed" && !items.some(entry => entry.result === "fail")) {
        throw new Error("A failed inspection requires at least one failed item");
      }
      if (toStatus === "closed" && record?.status === "failed") {
        const failedItems = items.filter(entry => entry.result === "fail");
        if (failedItems.some(entry => rows(entry.correctiveActions).length === 0)) {
          throw new Error("Every failed inspection item requires a corrective action before closure");
        }
        const unresolved = failedItems.flatMap(entry => rows(entry.correctiveActions)).some(action => !["verified", "closed"].includes(statusOf(action)));
        if (unresolved) throw new Error("Failed inspection corrections must be verified before closure");
      }
      return;
    }
    case "Schedule": {
      if (toStatus !== "published") return;
      const count = await queryCount(context, "ScheduleTask", { schedule: { id: { equals: id } } });
      if (count < 1) throw new Error("A schedule requires at least one planned task before publication");
      return;
    }
    case "ScheduleTask": {
      if (toStatus !== "completed") return;
      const record = await queryById(context, listKey, id, "id percentComplete") as RecordWithRelations | null;
      if (Number(record?.percentComplete ?? 0) !== 100) throw new Error("A schedule task must record 100 percent progress before completion");
      return;
    }
    case "DailyLog": {
      if (toStatus !== "submitted" && toStatus !== "approved") return;
      const count = await queryCount(context, "DailyLogEntry", { dailyLog: { id: { equals: id } } });
      if (count < 1) throw new Error("A daily log requires at least one field entry before submission");
      return;
    }
    case "PunchItem": {
      if (toStatus !== "closed") return;
      const count = await queryCount(context, "CorrectiveAction", {
        punchItem: { id: { equals: id } },
        status: { in: ["verified", "closed"] },
      });
      if (count < 1) throw new Error("Punch closure requires a verified corrective action");
      return;
    }
    case "SafetyObservation": {
      if (toStatus !== "resolved" && toStatus !== "closed") return;
      const record = await queryById(context, listKey, id, "id observationType correctiveActions(take: 101) { status }") as RecordWithRelations | null;
      if (record?.observationType === "safe_practice") return;
      const actions = boundedRows(record?.correctiveActions, 100, "Observation corrective actions");
      if (actions.length === 0 || actions.some(action => !["verified", "closed"].includes(statusOf(action)))) {
        throw new Error("Unsafe observations require verified corrective evidence");
      }
      return;
    }
    case "CorrectiveAction": {
      if (toStatus !== "ready_for_verification" && toStatus !== "verified" && toStatus !== "closed") return;
      const record = await queryById(context, listKey, id, "id completedAt verifiedAt completionNotes evidenceReference evidenceChecksumSha256") as RecordWithRelations | null;
      if (["ready_for_verification", "verified", "closed"].includes(toStatus) &&
          (!record?.completedAt || !String(record.completionNotes ?? "").trim() || !String(record.evidenceReference ?? "").trim() || !/^[a-f0-9]{64}$/i.test(String(record.evidenceChecksumSha256 ?? "")))) {
        throw new Error("Corrective work requires completion notes and SHA-256-bound evidence before verification");
      }
      return;
    }
    case "Payment": {
      if (toStatus !== "authorized" && toStatus !== "settled") return;
      const record = await queryById(context, listKey, id, "id reference paidAt") as RecordWithRelations | null;
      if (!String(record?.reference ?? "").trim() || !record?.paidAt) {
        throw new Error("Manual payment authorization/settlement requires an external reference and effective date");
      }
      return;
    }
    case "RetainageRelease": {
      if (toStatus !== "released") return;
      const record = await queryById(context, listKey, id, `
        id amountMinor payment { id status amountMinor direction currencyCode tradePartner { id } project { id } }
        progressClaim { id status retainageMinor claimType currencyCode tradePartner { id } project { id } }
      `) as RecordWithRelations | null;
      const payment = record?.payment as Record<string, unknown> | null | undefined;
      const claim = record?.progressClaim as Record<string, unknown> | null | undefined;
      const paymentPartner = payment?.tradePartner as Record<string, unknown> | null | undefined;
      const claimPartner = claim?.tradePartner as Record<string, unknown> | null | undefined;
      const paymentProject = payment?.project as Record<string, unknown> | null | undefined;
      const claimProject = claim?.project as Record<string, unknown> | null | undefined;
      if (!payment?.id || payment.status !== "settled" || !claim?.id || paymentProject?.id !== claimProject?.id) {
        throw new Error("Retainage release requires a settled payment and claim from the same project");
      }
      assertSettlementCompatibility({
        claimSide: claim.claimType === "owner" ? "owner" : "commitment",
        claimPartnerId: claimPartner?.id ? String(claimPartner.id) : null,
        claimCurrencyCode: String(claim.currencyCode ?? ""),
        paymentDirection: String(payment.direction) as "receipt" | "disbursement",
        paymentPartnerId: paymentPartner?.id ? String(paymentPartner.id) : null,
        paymentCurrencyCode: String(payment.currencyCode ?? ""),
      });
      const prisma = (context as KeystoneContextLike & {
        prisma?: { $queryRawUnsafe?<T>(query: string, ...values: unknown[]): Promise<T> };
      }).prisma;
      if (!prisma?.$queryRawUnsafe) throw new Error("Retainage release capacity lock is unavailable");
      await prisma.$queryRawUnsafe(`SELECT id FROM "Payment" WHERE id = $1 FOR UPDATE`, String(payment.id));
      await prisma.$queryRawUnsafe(`SELECT id FROM "ProgressClaim" WHERE id = $1 FOR UPDATE`, String(claim.id));
      const [claimReserved] = await prisma.$queryRawUnsafe<Array<{ total: bigint }>>(
        `SELECT COALESCE(SUM("amountMinor"), 0)::bigint AS total FROM "RetainageRelease"
         WHERE "progressClaim" = $1 AND status IN ('requested', 'approved', 'released')`, String(claim.id),
      );
      const [paymentAllocated] = await prisma.$queryRawUnsafe<Array<{ total: bigint }>>(
        `SELECT COALESCE(SUM(allocation."amountMinor"), 0)::bigint AS total
         FROM "PaymentAllocation" allocation JOIN "Payment" p ON p.id = allocation.payment
         WHERE allocation.payment = $1 AND p.status = 'settled'`, String(payment.id),
      );
      const [paymentReserved] = await prisma.$queryRawUnsafe<Array<{ total: bigint }>>(
        `SELECT COALESCE(SUM("amountMinor"), 0)::bigint AS total FROM "RetainageRelease"
         WHERE payment = $1 AND status IN ('requested', 'approved', 'released')`, String(payment.id),
      );
      if ((claimReserved?.total ?? BigInt(0)) > BigInt(String(claim.retainageMinor ?? 0))) {
        throw new Error("Active retainage releases exceed the claim's held retainage");
      }
      if ((paymentAllocated?.total ?? BigInt(0)) + (paymentReserved?.total ?? BigInt(0)) > BigInt(String(payment.amountMinor ?? 0))) {
        throw new Error("Settled claim allocations and retainage releases exceed payment capacity");
      }
      return;
    }
    case "LienWaiver": {
      if (toStatus !== "received" && toStatus !== "accepted") return;
      const record = await queryById(context, listKey, id, "id receivedAt signedAt signerName fileName checksumSha256") as RecordWithRelations | null;
      if (!record?.receivedAt || !record?.signedAt || !record?.signerName || !record?.fileName || !record?.checksumSha256) {
        throw new Error("Waiver receipt/acceptance requires signed file evidence and checksum");
      }
      return;
    }
    case "ProcurementRequest": {
      if (!["submitted", "approved", "ordered", "partially_received", "received", "closed"].includes(toStatus)) return;
      const record = await queryById(context, listKey, id, `
        id commitment { id }
        lines(take: 1001) { id quantity }
        receipts(take: 1001) { id status lines(take: 1001) { quantityReceived quantityAccepted quantityRejected requestLine { id } } }
      `) as RecordWithRelations | null;
      const lines = rows(record?.lines);
      if (lines.length === 0 || lines.length > 1000) throw new Error("A procurement request requires a bounded, non-empty line set");
      if (["ordered", "partially_received", "received", "closed"].includes(toStatus) && !(record?.commitment as Record<string, unknown> | null)?.id) {
        throw new Error("Ordered procurement requires a linked purchase order or commitment");
      }
      if (!["partially_received", "received", "closed"].includes(toStatus)) return;
      const orderedByLine = new Map(lines.map(line => [String(line.id), quantityToUnits(String(line.quantity ?? "0"))]));
      const receipts = rows(record?.receipts);
      if (receipts.length > 1000) throw new Error("Receipt history exceeds the bounded state-verification limit");
      let acceptedTotal = BigInt(0);
      const acceptedByLine = new Map<string, bigint>();
      for (const receipt of receipts) {
        if (statusOf(receipt) === "voided") continue;
        for (const receiptLine of rows(receipt.lines)) {
          const requestLineId = String((receiptLine.requestLine as Record<string, unknown> | null)?.id ?? "");
          const ordered = orderedByLine.get(requestLineId);
          if (ordered === undefined) throw new Error("Every receipt line must belong to a line on this procurement request");
          const received = quantityToUnits(String(receiptLine.quantityReceived ?? "0"));
          const accepted = quantityToUnits(String(receiptLine.quantityAccepted ?? "0"));
          const rejected = quantityToUnits(String(receiptLine.quantityRejected ?? "0"));
          if (!receiptTotalsAreValid({ receivedUnits: received, acceptedUnits: accepted, rejectedUnits: rejected })) {
            throw new Error("Every receipt line must reconcile received, accepted, and rejected quantities");
          }
          acceptedTotal += accepted;
          acceptedByLine.set(requestLineId, (acceptedByLine.get(requestLineId) ?? BigInt(0)) + accepted);
        }
      }
      for (const [lineId, accepted] of acceptedByLine) {
        if (accepted > (orderedByLine.get(lineId) ?? BigInt(0))) throw new Error("Accepted receipts exceed the ordered quantity for a request line");
      }
      const orderedTotal = [...orderedByLine.values()].reduce((sum, quantity) => sum + quantity, BigInt(0));
      const derivedStatus = deriveProcurementReceiptStatus(orderedTotal, acceptedTotal);
      if (toStatus === "partially_received" && derivedStatus !== "partially_received") {
        throw new Error("Partially received status requires accepted quantities greater than zero and below the order total");
      }
      if ((toStatus === "received" || toStatus === "closed") && derivedStatus !== "received") {
        throw new Error("Received or closed procurement requires accepted quantities covering every ordered line");
      }
      return;
    }
    default:
      return;
  }
}
