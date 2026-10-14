import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, chicagoDay, entryTimes, minutesOf, payOf, timesheetCsv, toEntry, weekStart, type EntryRow, type TeamWeek } from "../../src/worker/clock.ts";

test("weeks run Monday to Sunday", () => {
  assert.equal(weekStart("2026-10-14"), "2026-10-12"); // Wednesday → Monday
  assert.equal(weekStart("2026-10-12"), "2026-10-12");
  assert.equal(weekStart("2026-10-18"), "2026-10-12"); // Sunday belongs to the week before
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
});

test("a shift's day is the Cullman date it started on", () => {
  // 11:30 PM Cullman on Oct 14 is already Oct 15 in UTC.
  assert.equal(chicagoDay(Date.UTC(2026, 9, 15, 4, 30)), "2026-10-14");
});

test("picked times turn into a shift and bad ones are refused", () => {
  const at = Date.UTC(2026, 9, 15, 3); // Oct 14, 10 PM Cullman
  const { clockIn, clockOut } = entryTimes({ inDay: "2026-10-14", inTime: "09:00", outTime: "17:30" }, at);
  assert.equal((clockOut! - clockIn) / 3_600_000, 8.5);
  assert.throws(() => entryTimes({ inDay: "2026-10-14", inTime: "17:00", outTime: "09:00" }, at), /after clock in/);
  assert.throws(() => entryTimes({ inDay: "2026-10-16", inTime: "09:00" }, at), /future/);
  // Past midnight: clock out on the next day.
  const late = entryTimes({ inDay: "2026-10-13", inTime: "22:00", outDay: "2026-10-14", outTime: "02:00" }, at);
  assert.equal((late.clockOut! - late.clockIn) / 3_600_000, 4);
});

test("pay is minutes × the rate the shift started with", () => {
  assert.equal(payOf(90, 1500), 2250); // 1.5 h at $15
  assert.equal(payOf(90, null), 0);
  const row: EntryRow = { id: "e1", user_id: "u1", user_name: "Chris", clock_in: 0, clock_out: 45 * 60_000, note: null, rate_cents: 1200, edited_by: null, edited_at: null, reminded: 0, created_at: 0 };
  assert.equal(minutesOf(row), 45);
  assert.equal(toEntry(row).payCents, 900);
  assert.equal(minutesOf({ clock_in: 0, clock_out: null }, 30 * 60_000), 30, "an open shift counts up to now");
});

test("the timesheet CSV has a row per shift and totals", () => {
  const e = toEntry({ id: "e1", user_id: "u1", user_name: "Chris", clock_in: Date.UTC(2026, 9, 13, 14), clock_out: Date.UTC(2026, 9, 13, 22), note: "Walk-ins, Hanceville", rate_cents: 1500, edited_by: null, edited_at: null, reminded: 0, created_at: 0 });
  const w: TeamWeek = { from: "2026-10-12", to: "2026-10-18", people: [{ userId: "u1", name: "Chris", hourlyCents: 1500, minutes: e.minutes, payCents: e.payCents, open: false, entries: [e] }], totalMinutes: e.minutes, totalPayCents: e.payCents };
  const lines = timesheetCsv(w).trim().split("\r\n");
  assert.equal(lines[0], "Name,Date,Clock in,Clock out,Hours,Hourly pay,Pay,Note,Changed by hand");
  assert.equal(lines[1], '"Chris",2026-10-13,9:00 AM,5:00 PM,8.00,15.00,120.00,"Walk-ins, Hanceville",'.replace('"Chris"', "Chris"));
  assert.match(lines[2]!, /^Chris total,,,,8\.00,,120\.00/);
  assert.match(lines[3]!, /^Everyone,2026-10-12 to 2026-10-18,,,8\.00,,120\.00/);
});
