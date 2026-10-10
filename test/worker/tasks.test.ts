import assert from "node:assert/strict";
import { test } from "node:test";
import { chicagoToUtc, taskIcs } from "../../src/worker/tasks.ts";

test("Cullman times become the right UTC instant in and out of daylight saving", () => {
  assert.equal(chicagoToUtc("2026-10-14", "14:30").toISOString(), "2026-10-14T19:30:00.000Z"); // CDT, UTC-5
  assert.equal(chicagoToUtc("2026-12-14", "14:30").toISOString(), "2026-12-14T20:30:00.000Z"); // CST, UTC-6
});

test("task invites are valid iCalendar: timed and all-day, request and cancel", () => {
  const base = {
    uid: "task-abc@undergroundassociates.com",
    seq: 0,
    method: "REQUEST" as const,
    title: "Call Reyes pizza; bring the flyer, too",
    notes: "Ask for Maria\nMornings are best",
    leadName: "Reyes pizza",
    leadUrl: "https://website-business.knightdx91.workers.dev/#/lead/abc",
    organizer: { name: "Underground Associates", email: "info@undergroundassociates.com" },
    attendee: "post@undergroundassociates.com",
    now: new Date("2026-10-10T12:00:00Z"),
  };
  const raw = taskIcs({ ...base, due: "2026-10-14", dueTime: "14:30" });
  for (const line of raw.split("\r\n")) assert.ok(line.length <= 75, `folded: ${line}`);
  const timed = raw.replace(/\r\n /g, ""); // unfold for the content checks
  assert.match(timed, /^BEGIN:VCALENDAR\r\n/);
  assert.match(timed, /METHOD:REQUEST\r\n/);
  assert.match(timed, /DTSTART:20261014T193000Z\r\n/);
  assert.match(timed, /DTEND:20261014T200000Z\r\n/);
  assert.ok(timed.includes("SUMMARY:Call Reyes pizza\\; bring the flyer\\, too\r\n"), "summary escapes ; and ,");
  assert.match(timed, /DESCRIPTION:Ask for Maria\\nMornings are best\\nAbout: Reyes pizza\\n/);
  assert.match(timed, /ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:post@/);
  assert.match(timed, /TRIGGER:-PT30M/);

  const allDay = taskIcs({ ...base, due: "2026-10-31", dueTime: null });
  assert.match(allDay, /DTSTART;VALUE=DATE:20261031\r\nDTEND;VALUE=DATE:20261101\r\nTRANSP:TRANSPARENT/);

  const cancel = taskIcs({ ...base, seq: 2, method: "CANCEL", due: "2026-10-14", dueTime: null });
  assert.match(cancel, /METHOD:CANCEL/);
  assert.match(cancel, /SEQUENCE:2/);
  assert.match(cancel, /STATUS:CANCELLED/);
});
