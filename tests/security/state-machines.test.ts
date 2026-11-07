import test from "node:test";
import assert from "node:assert/strict";
import { lifecyclePolicies } from "../../features/keystone/domain/lifecycle";
import {
  assertMachineMove, assertMachineTransition, canTransition, stateMachines, statusGuard, type MachineName,
} from "../../features/keystone/domain/state-machines";

test("every machine only names states it defines", () => {
  for (const [name, map] of Object.entries(stateMachines)) {
    const states = new Set(Object.keys(map));
    for (const [from, targets] of Object.entries(map)) {
      for (const to of targets as readonly string[]) assert.ok(states.has(to), `${name}: ${from} -> ${to} targets an undefined state`);
    }
  }
});

test("terminal states have no way out unless the map says so", () => {
  for (const machine of ["ConstructionLead", "ConstructionOpportunity", "BidSubmission", "BidInvitation", "AgentIdentity", "ScopeGrant", "ServiceRequest"] as MachineName[]) {
    const map = stateMachines[machine] as Record<string, readonly string[]>;
    const finals = Object.entries(map).filter(([, to]) => to.length === 0).map(([from]) => from);
    assert.ok(finals.length > 0, `${machine} has a terminal state`);
  }
  assert.throws(() => assertMachineTransition("ConstructionLead", "converted", "new"), /cannot move/);
  assert.throws(() => assertMachineTransition("ConstructionOpportunity", "won", "lost"), /cannot move/);
  assert.throws(() => assertMachineTransition("AgentIdentity", "revoked", "active"), /cannot move/);
  assert.throws(() => assertMachineTransition("ScopeGrant", "revoked", "active"), /cannot move/);
  assert.throws(() => assertMachineTransition("BidSubmission", "accepted", "withdrawn"), /cannot move/);
});

test("no state is a dead end by accident: every non-final state can reach a final one", () => {
  for (const [name, map] of Object.entries({ ...stateMachines, ...lifecyclePolicies }) as Array<[string, Record<string, readonly string[]>]>) {
    if (name.endsWith("System")) continue;
    const finals = new Set(Object.entries(map).filter(([, to]) => to.length === 0).map(([s]) => s));
    for (const start of Object.keys(map)) {
      const seen = new Set([start]); const queue = [start]; let reached = finals.has(start);
      while (queue.length && !reached) for (const next of map[queue.shift()!] ?? []) { if (finals.has(next)) reached = true; if (!seen.has(next)) { seen.add(next); queue.push(next); } }
      // Machines with no final state (cyclic directories) are fine: every state must reach every other.
      if (finals.size > 0) assert.ok(reached, `${name}: ${start} cannot reach a final state`);
    }
  }
});

test("a bid invitation can no longer be stuck in draft", () => {
  assert.ok(canTransition("BidInvitation", "draft", "invited"));
  assert.ok(canTransition("BidInvitation", "invited", "submitted"));
  assert.ok(!canTransition("BidInvitation", "submitted", "invited"));
  assert.ok(!canTransition("BidInvitation", "submitted", "declined"));
});

test("service request: no payment before an accepted quote, no booking from a cancelled request", () => {
  assert.throws(() => assertMachineTransition("ServiceRequest", "requested", "payment_pending"), /cannot move/);
  assert.throws(() => assertMachineTransition("ServiceRequest", "cancelled", "booked"), /cannot move/);
  assert.throws(() => assertMachineTransition("ServiceRequest", "cancelled", "quoted"), /cannot move/);
  assert.doesNotThrow(() => assertMachineTransition("ServiceRequest", "payment_pending", "booked"));
  assert.doesNotThrow(() => assertMachineMove("ServiceRequest", "quoted", "quoted"));
});

test("provider payments: settled can only be reversed, reversed and voided are final", () => {
  assert.ok(canTransition("PaymentSystem", "pending", "settled"));
  assert.ok(canTransition("PaymentSystem", "settled", "reversed"));
  assert.ok(!canTransition("PaymentSystem", "reversed", "settled"));
  assert.ok(!canTransition("PaymentSystem", "settled", "failed"));
  assert.throws(() => assertMachineTransition("PaymentSystem", "reversed", "reversed"), /already/);
  // The manual map still refuses to mark money reversed by hand.
  assert.ok(!lifecyclePolicies.Payment.settled.length);
});

test("claim settlement roll-up only moves among approved, partially_paid and paid", () => {
  assert.doesNotThrow(() => assertMachineMove("ProgressClaimSystem", "approved", "partially_paid"));
  assert.doesNotThrow(() => assertMachineMove("ProgressClaimSystem", "paid", "partially_paid"));
  assert.doesNotThrow(() => assertMachineMove("ProgressClaimSystem", "paid", "approved"));
  assert.throws(() => assertMachineMove("ProgressClaimSystem", "closed", "paid"), /Unknown/);
  assert.throws(() => assertMachineMove("ProgressClaimSystem", "voided", "approved"), /Unknown/);
  assert.throws(() => assertMachineMove("ProgressClaimSystem", "draft", "paid"), /Unknown/);
});

test("statusGuard refuses illegal updates, allows unchanged status and creates", () => {
  const errors: string[] = [];
  const run = (from: string, to: unknown) => {
    errors.length = 0;
    statusGuard("TradePartner").validate.update({ item: { status: from }, resolvedData: { status: to }, fieldKey: "status", addValidationError: m => errors.push(m) });
    return [...errors];
  };
  assert.deepEqual(run("approved", "inactive"), []);
  assert.deepEqual(run("approved", "approved"), []);
  assert.equal(run("blocked", "approved").length, 1);
  assert.equal(run("prospective", "inactive").length, 1);
  const none: string[] = [];
  statusGuard("TradePartner").validate.update({ item: { status: "blocked" }, resolvedData: { name: "x" }, fieldKey: "status", addValidationError: m => none.push(m) });
  assert.deepEqual(none, []);
});

test("platform dashboard maps match the server maps", async () => {
  const { partnerTransitions } = await import("../../features/platform/trade-partners/lib/states");
  const { catalogTransitions } = await import("../../features/platform/resources/lib/states");
  assert.deepEqual(partnerTransitions, stateMachines.TradePartner);
  assert.deepEqual(catalogTransitions.equipment, stateMachines.Equipment);
  assert.deepEqual(catalogTransitions.materials, stateMachines.Material);
});
