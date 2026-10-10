import assert from "node:assert/strict";
import { test } from "node:test";
import { seedAutoServices } from "../../src/generator/packs/auto.ts";
import type { BusinessRecord } from "../../src/generator/types.ts";
import { applyEdits, EditsSchema } from "../../src/worker/edits.ts";
import type { Env } from "../../src/worker/env.ts";
import { handleFormPost, requestSummary } from "../../src/worker/forms.ts";
import { categoryRecord, sampleCopy } from "../fixtures.ts";

const parts = (ext: NonNullable<BusinessRecord["ext"]["auto"]>["parts"] = {}, over: Partial<BusinessRecord> = {}) =>
  categoryRecord("auto", { name: "Sample Auto Parts", variant: "parts", services: seedAutoServices("parts"), ext: { auto: { parts: ext } }, serviceArea: undefined, ...over });
const thrift = (donations: NonNullable<BusinessRecord["ext"]["retail"]>["donations"] | undefined, variant = "thrift") =>
  categoryRecord("retail", { name: "Sample Thrift", variant, showStreetAddress: true, ext: { retail: donations ? { donations } : {} } });

test("Edit saves parts and donations details and clears empties", () => {
  const e = EditsSchema.parse({
    record: {
      parts: { counter: { battery: true, keys: true, loaner: false }, counterConfirmed: true, turnaround: "Next morning", commercial: false, commercialText: "", program: "", orderUrl: "" },
      services: ["Brakes", "Batteries"],
    },
  });
  const p = applyEdits(parts({ program: "NAPA" }), sampleCopy(), e);
  assert.deepEqual(p.record.ext.auto?.parts, { counter: { battery: true, keys: true, loaner: false }, counterConfirmed: true, turnaround: "Next morning", commercial: false, commercialText: undefined, program: undefined, orderUrl: undefined });
  assert.deepEqual(p.record.services.map((s) => s.name), ["Brakes", "Batteries"]);
  assert.deepEqual(EditsSchema.parse({ record: { parts: { counter: { tires: true, keys: true } } } }).record?.parts?.counter, { keys: true }, "unknown counter services are dropped");
  assert.throws(() => EditsSchema.parse({ record: { parts: { orderUrl: "javascript:alert(1)" } } }));
  const general = applyEdits(categoryRecord("auto"), sampleCopy(), EditsSchema.parse({ record: { parts: { counterConfirmed: true } } }));
  assert.equal(general.record.ext.auto?.parts, undefined, "parts details only apply to parts stores");

  const d = EditsSchema.parse({ record: { donations: { enabled: true, accepts: ["Clothing"], doesNotAccept: [], dropOffHours: "10 to 4", pickup: true, pickupNote: "", receipts: false, note: "" } } });
  const t = applyEdits(thrift({ doesNotAccept: ["TVs"] }), sampleCopy(), d);
  assert.deepEqual(t.record.ext.retail?.donations, { enabled: true, accepts: ["Clothing"], doesNotAccept: undefined, dropOffHours: "10 to 4", pickup: true, pickupNote: undefined, receipts: false, note: undefined });
});

/** A fake D1 that records every statement; `first` answers the lead lookup and the rate-limit count. */
function fakeEnv(lead: Record<string, unknown> | null) {
  const log: Array<{ sql: string; args: unknown[] }> = [];
  const stmt = (sql: string, args: unknown[] = []) => ({
    bind: (...a: unknown[]) => stmt(sql, a),
    first: async () => {
      log.push({ sql, args });
      if (/FROM leads/.test(sql)) return lead;
      if (/COUNT\(\*\)/.test(sql)) return { n: 0 };
      return null;
    },
    run: async () => {
      log.push({ sql, args });
      return { success: true };
    },
    all: async () => {
      log.push({ sql, args });
      return { results: [] };
    },
  });
  return { env: { DB: { prepare: (sql: string) => stmt(sql) } } as unknown as Env, log };
}

test("reserve-a-part and pickup fields reach the stored submission and the notification", async () => {
  const { env, log } = fakeEnv({ id: "L1", name: "Sample Auto Parts", live_url: "https://sample.pages.dev" });
  const body = new URLSearchParams({ topic: "Reserve a part", name: "Amy R.", phone: "256-555-0100", year: "2014", make: "Ford", model: "F-150 5.0", part: "Front brake pads", message: "Need them Friday", website: "" });
  const res = await handleFormPost(env, new Request("https://app.example/f/L1", { method: "POST", body, headers: { "content-type": "application/x-www-form-urlencoded", "cf-connecting-ip": "1.2.3.4" } }), "L1");
  assert.equal(res.status, 303);
  assert.equal(res.headers.get("location"), "https://sample.pages.dev/thanks/");
  const insert = log.find((l) => /INSERT INTO submissions/.test(l.sql))!;
  const data = JSON.parse(insert.args[3] as string);
  assert.deepEqual(data, { topic: "Reserve a part", name: "Amy R.", phone: "256-555-0100", year: "2014", make: "Ford", model: "F-150 5.0", part: "Front brake pads", message: "Need them Friday" });
  const event = log.find((l) => /INSERT INTO events/.test(l.sql))!;
  assert.equal(event.args[6], "💬 New request from Sample Auto Parts's website: Amy R., Reserve a part: Front brake pads · 2014 Ford F-150 5.0");

  assert.equal(requestSummary({ topic: "Furniture pickup", items: "Couch and two chairs", address: "Hanceville", best_day: "Tuesday" }), "Furniture pickup: Couch and two chairs · Hanceville · best day Tuesday");
  assert.equal(requestSummary({ service: "Brakes", vehicle: "2010 Civic" }), "Brakes · 2010 Civic");
  assert.equal(requestSummary({ name: "x" }), "");
});
