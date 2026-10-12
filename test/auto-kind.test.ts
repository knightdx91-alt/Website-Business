import assert from "node:assert/strict";
import { test } from "node:test";
import { autoVariant, seedAutoServices, setAutoVariant } from "../src/generator/packs/auto.ts";
import type { BusinessRecord } from "../src/generator/types.ts";

test("a parts store is detected from the name or Google's type", () => {
  assert.equal(autoVariant("auto_parts_store", ["auto_parts_store", "car_repair"], "The Parts Store, LLC"), "parts");
  assert.equal(autoVariant("car_repair", ["car_repair"], "Smith Auto Parts"), "parts");
  assert.equal(autoVariant("car_repair", ["car_repair"], "Pinnacle Automotive, LLC"), "general");
});

test("re-kinding a repair shop as a parts store reseeds untouched services and drops the service area", () => {
  const r = {
    category: "auto",
    variant: "general",
    name: "The Parts Store, LLC",
    services: seedAutoServices("general"),
    serviceArea: { towns: ["Hanceville"], counties: ["Cullman"] },
    ext: { auto: {} },
  } as unknown as BusinessRecord;
  assert.equal(setAutoVariant(r, "parts"), true);
  assert.equal(r.variant, "parts");
  assert.ok(r.services.some((s) => /brake|batter|filter/i.test(s.name)));
  assert.ok(!r.services.some((s) => /oil change|engine repair/i.test(s.name)));
  assert.equal((r as { serviceArea?: unknown }).serviceArea, undefined);
  assert.deepEqual((r.ext as { auto: { parts?: unknown } }).auto.parts, {});
  // Services the owner already edited are kept.
  const edited = { ...r, variant: "general", services: [{ id: "custom", name: "Custom exhaust", featured: true }] } as unknown as BusinessRecord;
  setAutoVariant(edited, "tire");
  assert.equal(edited.services[0]!.name, "Custom exhaust");
  assert.equal(setAutoVariant(edited, "tire"), false);
  assert.equal(setAutoVariant(edited, "spaceship"), false);
});
