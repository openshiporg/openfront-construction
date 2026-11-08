import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { calendarDayEndsAt, calendarDayHasPassed, calendarDayKey, parseCommandDate } from "../../features/keystone/domain/calendar-dates";
import { assertBusinessNumberAvailable, BUSINESS_NUMBERS, businessNumberConflictMessage } from "../../features/keystone/domain/business-numbers";
import { isOverdue, formatDay } from "../../features/platform/components/kit";

test("date-only command values are real calendar days stored at noon UTC", () => {
  assert.equal(parseCommandDate("2027-03-15", "Due date")!.toISOString(), "2027-03-15T12:00:00.000Z");
  assert.equal(parseCommandDate(" 2028-02-29 ", "Due date")!.toISOString(), "2028-02-29T12:00:00.000Z");
  assert.throws(() => parseCommandDate("2027-02-30", "Due date"), /Due date must be a real calendar date/);
  assert.throws(() => parseCommandDate("2027-13-01", "Log date"), /Log date must be a real calendar date/);
  assert.throws(() => parseCommandDate("2027-02-30T09:00:00.000Z", "Entry start"), /real calendar date/);
  assert.throws(() => parseCommandDate("next tuesday", "Due date"), /must be a valid date/);
  assert.equal(parseCommandDate("", "Due date"), undefined);
  assert.equal(parseCommandDate(null, "Due date"), undefined);
  // Instants (datetime fields) stay instants.
  assert.equal(parseCommandDate("2027-03-15T13:30:00.000Z", "Entry start")!.toISOString(), "2027-03-15T13:30:00.000Z");
});

test("a due day ends at local midnight on the project calendar", () => {
  assert.equal(calendarDayKey("2026-10-28T00:00:00.000Z"), "2026-10-28");
  assert.equal(calendarDayKey("2026-10-28T12:00:00.000Z"), "2026-10-28");
  // EDT (UTC-4) and EST (UTC-5), including the day the clocks change.
  assert.equal(calendarDayEndsAt("2026-08-24T12:00:00.000Z", "America/New_York").toISOString(), "2026-08-25T04:00:00.000Z");
  assert.equal(calendarDayEndsAt("2026-12-10T12:00:00.000Z", "America/New_York").toISOString(), "2026-12-11T05:00:00.000Z");
  assert.equal(calendarDayEndsAt("2026-10-31T12:00:00.000Z", "America/New_York").toISOString(), "2026-11-01T04:00:00.000Z");
  assert.equal(calendarDayEndsAt("2026-11-01T12:00:00.000Z", "America/New_York").toISOString(), "2026-11-02T05:00:00.000Z");
  assert.equal(calendarDayEndsAt("2026-08-24T12:00:00.000Z", "America/Los_Angeles").toISOString(), "2026-08-25T07:00:00.000Z");
  assert.equal(calendarDayEndsAt("2026-08-24T12:00:00.000Z", "not/a-zone").toISOString(), "2026-08-25T04:00:00.000Z");
});

test("a bid due on a day is still open that evening in New York and closed after midnight", () => {
  const due = parseCommandDate("2026-11-20", "Bid due date")!;
  // 7:30 pm EST on the due day: the old instant comparison (due stored at UTC midnight) had already closed it.
  assert.equal(calendarDayHasPassed(due, "America/New_York", Date.parse("2026-11-21T00:30:00.000Z")), false);
  assert.equal(calendarDayHasPassed(new Date("2026-11-20T00:00:00.000Z"), "America/New_York", Date.parse("2026-11-21T00:30:00.000Z")), false);
  assert.equal(calendarDayHasPassed(due, "America/New_York", Date.parse("2026-11-21T05:00:00.000Z")), true);
});

test("overdue is judged on the due day, and due labels show the stored day", () => {
  const evening = Date.parse("2026-10-28T23:00:00.000Z"); // 7 pm EDT on Oct 28
  assert.equal(isOverdue("2026-10-28T12:00:00.000Z", "America/New_York", evening), false);
  assert.equal(isOverdue("2026-10-27T12:00:00.000Z", "America/New_York", evening), true);
  assert.equal(isOverdue(null, "America/New_York", evening), false);
  assert.equal(formatDay("2026-10-28T00:00:00.000Z"), "Oct 28, 2026");
  assert.equal(formatDay("2026-10-28T12:00:00.000Z"), "Oct 28, 2026");
});

function fakeSql(taken: boolean) {
  const calls: Array<{ query: string; values: unknown[] }> = [];
  return {
    calls,
    prisma: {
      async $queryRawUnsafe<T>(query: string, ...values: unknown[]) {
        calls.push({ query, values });
        return (query.includes("EXISTS") ? [{ taken }] : [{ locked: 1 }]) as T;
      },
    },
  };
}

test("business numbers are refused when already used in their scope", async () => {
  const free = fakeSql(false);
  await assertBusinessNumberAvailable(free, "RFI", { number: " RFI-014 " }, "project-1");
  const lookup = free.calls.find(call => call.query.includes("EXISTS"))!;
  assert.match(lookup.query, /FROM "RFI" WHERE "project" = \$1 AND lower\(btrim\("number"\)\) = \$2/);
  assert.deepEqual(lookup.values, ["project-1", "rfi-014"]);

  await assert.rejects(assertBusinessNumberAvailable(fakeSql(true), "RFI", { number: "RFI-014" }, "project-1"), /RFI number RFI-014 is already used on this project/);
  await assert.rejects(assertBusinessNumberAvailable(fakeSql(true), "Project", { projectNumber: "NS-2611" }, "company-1"), /Project number NS-2611 is already used by another project in this company/);
  await assert.rejects(assertBusinessNumberAvailable(fakeSql(true), "ScheduleTask", { taskCode: "A1010", schedule: { connect: { id: "schedule-1" } } }, "project-1"), /Task code A1010 is already used in this schedule/);
  const schedule = fakeSql(false);
  await assertBusinessNumberAvailable(schedule, "ScheduleTask", { taskCode: "A1010", schedule: { connect: { id: "schedule-1" } } }, "project-1");
  assert.equal(schedule.calls.find(call => call.query.includes("EXISTS"))!.values[0], "schedule-1");
  // Lists without a business number are untouched.
  const other = fakeSql(true);
  await assertBusinessNumberAvailable(other, "DailyLogEntry", { title: "Concrete pour" }, "project-1");
  assert.equal(other.calls.length, 0);
});

test("one daily log per project day", async () => {
  await assert.rejects(
    assertBusinessNumberAvailable(fakeSql(true), "DailyLog", { logDate: parseCommandDate("2026-11-06", "Log date") }, "project-1"),
    /A daily log for Nov 6, 2026 already exists on this project; add entries to it instead/,
  );
  const free = fakeSql(false);
  await assertBusinessNumberAvailable(free, "DailyLog", { logDate: parseCommandDate("2026-11-06", "Log date") }, "project-1");
  assert.deepEqual(free.calls.find(call => call.query.includes("EXISTS"))!.values, ["project-1", "2026-11-06"]);
});

test("unique-index backstop hits read as the business rule", () => {
  const prismaError = Object.assign(new Error("Prisma error"), { extensions: { prisma: { code: "P2002", meta: { target: "RFI_project_number_key" } } } });
  assert.equal(businessNumberConflictMessage(prismaError), "RFI number is already used on this project");
  assert.equal(businessNumberConflictMessage({ message: "duplicate key value violates unique constraint \"DailyLog_project_logDay_key\"" }),
    "A daily log for that day already exists on this project; add entries to it instead");
  assert.equal(businessNumberConflictMessage(new Error("connect ECONNREFUSED")), null);
});

test("every business-number rule has its backstop index in the migration", () => {
  const sql = readFileSync(new URL("../../migrations/20261108160000_construction_record_invariants/migration.sql", import.meta.url), "utf8");
  for (const rule of Object.values(BUSINESS_NUMBERS)) assert.match(sql, new RegExp(`CREATE UNIQUE INDEX "${rule.index}"`));
  assert.match(sql, /CREATE UNIQUE INDEX "DailyLog_project_logDay_key"/);
});
