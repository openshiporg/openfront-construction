import assert from "node:assert/strict";
import { test } from "node:test";

import { projectEvidencePermissionFilter } from "../../features/keystone/access";

/** Keystone rejects "" as an id ("Only a string can be passed to id filters"),
 * which blanked the dashboard counts and broke onboarding's idempotency read. */
test("company-level evidence uses a relationship null check, never an empty id", () => {
  const session = {
    itemId: "user-1",
    authType: "session",
    data: { role: { canReadAudit: true, canAccessDashboard: true } },
  } as never;
  const filter = projectEvidencePermissionFilter(session);
  const json = JSON.stringify(filter);
  assert.ok(!json.includes('"equals":""'), json);
  assert.ok(json.includes('"project":null'), json);
});
