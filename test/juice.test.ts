import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSite } from "../src/generator/render.ts";
import { counterService, restaurantVariant } from "../src/generator/packs/restaurant.ts";
import { restaurantRecord, sampleCopy } from "./fixtures.ts";

test("nutrition clubs and juice bars get the juice variant", () => {
  assert.equal(restaurantVariant("juice_shop", [], "Hanceville Nutrition"), "juice");
  assert.equal(restaurantVariant("restaurant", ["restaurant"], "Downtown Nutrition"), "juice");
  assert.equal(restaurantVariant("restaurant", [], "Smoothie Stop"), "juice");
  assert.equal(restaurantVariant("coffee_shop", [], "Bean There"), "coffee");
  assert.equal(restaurantVariant("restaurant", [], "Mama's Kitchen"), "southern");
});

test("a counter-service shop shows no Dine-in / Takeout chips or takeout FAQ; a restaurant still does", async () => {
  const so = { dineIn: true, takeout: true, delivery: false, outdoorSeating: true, wheelchairAccessibleEntrance: true };
  const juice = restaurantRecord({ name: "Sample Nutrition", variant: "juice", ext: { restaurant: { serviceOptions: so } } });
  assert.ok(counterService(juice));
  const out = await buildSite({ record: juice, copy: sampleCopy(), site: { slug: "t", look: "restaurant.garden_table" }, mode: "preview" });
  const home = String(out.files.get("index.html"));
  assert.doesNotMatch(home, />Dine-in</);
  assert.doesNotMatch(home, />Takeout</);
  assert.match(home, />Outdoor seating</, "other chips stay");
  assert.doesNotMatch(home, /Can I order takeout\?/);
  assert.match(home, /Do you deliver\?[\s\S]*Call ahead and swing by; it'll be ready/);

  const diner = restaurantRecord({ variant: "diner", ext: { restaurant: { serviceOptions: so } } });
  assert.ok(!counterService(diner));
  const d = String((await buildSite({ record: diner, copy: sampleCopy(), site: { slug: "t", look: "restaurant.garden_table" }, mode: "preview" })).files.get("index.html"));
  assert.match(d, />Dine-in</);
  assert.match(d, />Takeout</);
  assert.match(d, /Can I order takeout\?/);
});
