import assert from "node:assert/strict";
import { test } from "node:test";
import { autoBannedPhrases, autoVariant, isTow, seedAutoServices, setAutoVariant } from "../src/generator/packs/auto.ts";
import { buildSite } from "../src/generator/render.ts";
import type { BusinessRecord } from "../src/generator/types.ts";
import { categoryRecord, sampleCopy } from "./fixtures.ts";

test("a tow company is its own kind; a shop that tows and repairs is the other", () => {
  assert.equal(autoVariant("service", ["service"], "Hays Towing"), "towing");
  assert.equal(autoVariant("car_repair", ["car_repair"], "Smith Wrecker Service"), "towing");
  assert.equal(autoVariant("car_repair", ["car_repair"], "Smith Towing & Auto Repair"), "tow_repair");
  assert.ok(isTow("towing") && isTow("tow_repair") && !isTow("general"));
});

test("a tow company built with the old repair list is reseeded once", () => {
  const r = { category: "auto", variant: "towing", services: seedAutoServices("tow_repair"), ext: { auto: {} } } as unknown as BusinessRecord;
  assert.equal(setAutoVariant(r, "towing"), true);
  assert.ok(r.services.some((s) => /roadside|jump|lockout/i.test(s.name)));
  assert.ok(!r.services.some((s) => /brake|engine repair|diagnos/i.test(s.name)));
  assert.equal(setAutoVariant(r, "towing"), false, "nothing to do the second time");
});

test("a tow company's site sells towing, not repairs", async () => {
  const record = categoryRecord("auto", { name: "Hays Towing", variant: "towing", services: seedAutoServices("towing") });
  const out = await buildSite({ record, copy: sampleCopy(), site: { slug: "t", look: "auto.night_road" }, mode: "preview" });
  const home = String(out.files.get("index.html"));
  assert.match(home, /Towing &amp; Roadside in /);
  assert.match(home, /Need a tow\?/);
  assert.match(home, /What we do/);
  assert.doesNotMatch(home, /What we fix/);
  assert.match(home, /Request a tow/);
  assert.match(home, /name="location"/);
  const banned = autoBannedPhrases(record);
  assert.ok(banned.some((re) => re.test("Our mechanics handle repairs")));
  assert.ok(banned.some((re) => re.test("We'll be there within 30 minutes")));
});
