import assert from "node:assert/strict";
import { test } from "node:test";
import { applyEdits, EditsSchema } from "../../src/worker/edits.ts";
import { categoryRecord, sampleCopy } from "../fixtures.ts";

test("events arrive through Edit, bad links are dropped and an empty list removes the section", () => {
  const r = categoryRecord("auto");
  const copy = sampleCopy();
  const parsed = EditsSchema.parse({ record: { events: [{ title: "Trunk or Treat", date: "2026-10-25", time: "5–7 PM" }] } });
  const next = applyEdits(structuredClone(r), copy, parsed);
  assert.equal(next.record.events?.[0]?.title, "Trunk or Treat");
  assert.throws(() => EditsSchema.parse({ record: { events: [{ title: "x", date: "2026-10-25", url: "javascript:alert(1)" }] } }));
  assert.throws(() => EditsSchema.parse({ record: { events: [{ title: "x", date: "Oct 25" }] } }));
  assert.equal(applyEdits(structuredClone(next.record), copy, EditsSchema.parse({ record: { events: [] } })).record.events, undefined);
});
