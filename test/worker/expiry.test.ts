import assert from "node:assert/strict";
import { test } from "node:test";
import { expiryLabel, leadExpiry } from "../../src/worker/expire.ts";

const DAY = 86_400_000;
const NOW = Date.parse("2026-10-24T15:00:00Z");
const base = { place_id: "ChIJ1", status: "ready", sales_status: "new", created_at: NOW - 10 * DAY, updated_at: NOW - 10 * DAY };

test("new leads expire 30 days after they were found, shown 60, sold / live / practice / typed-in never", () => {
  assert.equal(leadExpiry(base, NOW)!.at, base.created_at + 30 * DAY);
  assert.equal(leadExpiry({ ...base, sales_status: "shown" }, NOW)!.at, base.created_at + 60 * DAY);
  for (const l of [{ ...base, sales_status: "sold" }, { ...base, sales_status: "live" }, { ...base, place_id: "paytest" }, { ...base, place_id: "manual:abc" }, { ...base, status: "expired" }])
    assert.equal(leadExpiry(l, NOW), null);
  assert.equal(expiryLabel(base.created_at + 30 * DAY, NOW), "Expires Nov 13 (in 20 days)");
});

test("a later callback or a handed-out flyer code keeps it longer, never past 90 days", () => {
  const cb = leadExpiry({ ...base, follow_up: "2026-12-01" }, NOW)!;
  assert.equal(cb.kept, "callback");
  assert.ok(cb.at > Date.parse("2026-12-01T00:00:00Z"));
  const far = leadExpiry({ ...base, follow_up: "2027-06-01" }, NOW)!;
  assert.equal(far.at, base.created_at + 90 * DAY);
  const fl = leadExpiry({ ...base, mail_code_at: NOW - DAY }, NOW)!;
  assert.equal(fl.kept, "flyer");
  assert.equal(fl.at, base.created_at + 90 * DAY);
  assert.equal(leadExpiry({ ...base, follow_up: "2026-10-01" }, NOW)!.kept, null);
});
