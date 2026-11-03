import { test } from "node:test";
import assert from "node:assert/strict";
import { assertChangeQuoteClosable, canCloseChangeQuote, changeQuoteCloseStatus, scopeWithCloseReason } from "../../features/keystone/domain/change-quote";

test("a partner can withdraw a requested or received quote", () => {
  assert.equal(canCloseChangeQuote("withdraw", "requested"), true);
  assert.equal(canCloseChangeQuote("withdraw", "received"), true);
  assert.equal(changeQuoteCloseStatus("withdraw"), "withdrawn");
});

test("staff can reject only a received quote", () => {
  assert.equal(canCloseChangeQuote("reject", "received"), true);
  assert.equal(canCloseChangeQuote("reject", "requested"), false);
  assert.equal(changeQuoteCloseStatus("reject"), "rejected");
});

test("accepted and already-closed quotes can never be closed again", () => {
  for (const status of ["accepted", "rejected", "withdrawn"]) {
    for (const action of ["withdraw", "reject"] as const) {
      assert.equal(canCloseChangeQuote(action, status), false, `${action} from ${status}`);
      assert.throws(() => assertChangeQuoteClosable(action, status), /cannot be/);
    }
  }
});

test("unknown or missing status is refused", () => {
  assert.equal(canCloseChangeQuote("withdraw", undefined), false);
  assert.equal(canCloseChangeQuote("reject", "bogus"), false);
});

test("the close reason is appended to the scope", () => {
  assert.equal(scopeWithCloseReason("Layout check", "withdraw", "Partner pulled out"), "Layout check\n\nWithdrawn: Partner pulled out");
  assert.equal(scopeWithCloseReason(null, "reject", "Too high"), "Rejected: Too high");
});

test("change quote status is workflow-owned: read-only in the admin, never updated generically", async () => {
  const fs = await import("node:fs");
  const src = fs.readFileSync(new URL("../../features/keystone/models/contracts.ts", import.meta.url), "utf8");
  const start = src.indexOf("export const ChangeQuote = list(");
  const block = src.slice(start, src.indexOf("\n});", start));
  assert.match(block, /status: lifecycleStatus\(\[/);
  assert.doesNotMatch(block, /status: select\(/);
});
