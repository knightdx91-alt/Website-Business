import assert from "node:assert/strict";
import { test } from "node:test";
import { restaurantVariant } from "../src/generator/packs/restaurant.ts";
import { salonVariant, seedSalonServices } from "../src/generator/packs/salon.ts";
import { buildSite } from "../src/generator/render.ts";
import { groupById, SEARCH_GROUPS, searchesFor } from "../src/places/queries.ts";
import { websiteProblem } from "../src/places/site-check.ts";
import { categoryRecord, loadFont, restaurantRecord, sampleCopy } from "./fixtures.ts";

test("new kinds of business map to the right template variant", () => {
  assert.equal(salonVariant("nail_salon", [], "Luxe Nails"), "nails");
  assert.equal(salonVariant("pet_care", [], "Pampered Paws Grooming"), "pet");
  assert.equal(salonVariant(undefined, [], "Fluffy Dog Spa"), "pet");
  assert.equal(salonVariant("barber_shop", [], "Main St Barber"), "barber");
  assert.equal(restaurantVariant("restaurant", [], "Big Al's Food Truck"), "food_truck");
  assert.equal(restaurantVariant("barbecue_restaurant", [], "Smokin Joe's"), "bbq");
  assert.equal(seedSalonServices("pet")[0]!.name, "Full groom");
});

test("search groups: every group has a template, and nearby towns add searches", () => {
  for (const g of SEARCH_GROUPS) assert.ok(g.terms.length > 0, g.id);
  const food = groupById("food_truck")!;
  assert.equal(food.category, "restaurant");
  assert.deepEqual(searchesFor(food, false).map((s) => s.query), ["food truck in Cullman, AL"]);
  const wide = searchesFor(groupById("contractor")!, true);
  assert.equal(wide.length, 4 + 5 * 2);
  assert.ok(wide.some((s) => s.query === "plumber in Hartselle, AL" && s.center.lat > 34.4));
});

test("published sites carry the visit counter; previews don't", async () => {
  const record = restaurantRecord({
    confirmed: ["name", "phone", "address", "hours", "menu"],
    ext: { restaurant: { serviceOptions: { dineIn: true }, menu: { sections: [{ name: "Plates", items: [{ name: "Pulled pork plate", price: "$12" }] }], lastUpdated: "October 2026" } } },
  });
  const input = { record, copy: sampleCopy({ approved: true, about: [] }), site: { slug: "x", look: "" }, loadFont, statsEndpoint: "https://app.example/t/abc" };
  const preview = await buildSite({ ...input, mode: "preview" });
  assert.ok(!String(preview.files.get("index.html")).includes("wb-stats"));
  const pub = await buildSite({ ...input, mode: "publish" });
  assert.ok(String(pub.files.get("index.html")).includes('name="wb-stats" content="https://app.example/t/abc"'));
  assert.ok(String(pub.files.get("privacy/index.html") ?? "").includes("without cookies") || [...pub.files.keys()].every((k) => !k.startsWith("privacy")));
});

test("pet grooming site doesn't talk about haircuts", async () => {
  const r = categoryRecord("salon", { variant: "pet", services: seedSalonServices("pet") });
  const out = await buildSite({ record: r, copy: sampleCopy(), site: { slug: "p", look: "" }, mode: "preview" });
  const home = String(out.files.get("index.html"));
  assert.ok(home.includes("Pet grooming"));
  assert.ok(!/HairSalon|cuts and color/.test(home));
});

test("website checker flags outdated and broken sites", async () => {
  const real = globalThis.fetch;
  const page = (body: string, url = "https://example.com/") =>
    (async () => Object.defineProperty(new Response(body, { status: 200 }), "url", { value: url })) as unknown as typeof fetch;
  try {
    const modern = `<html><head><meta name="viewport" content="width=device-width"></head><body>${"x".repeat(500)} © 2026 Shop</body></html>`;
    globalThis.fetch = page(modern);
    assert.equal(await websiteProblem("https://example.com", new Date("2026-10-08")), null);
    globalThis.fetch = page(`<html><body>${"x".repeat(500)} Copyright 2017</body></html>`);
    assert.equal(await websiteProblem("https://example.com", new Date("2026-10-08")), "Website isn't made for phones");
    globalThis.fetch = page(modern.replace("2026", "2019"));
    assert.equal(await websiteProblem("https://example.com", new Date("2026-10-08")), "Website looks out of date (© 2019)");
    globalThis.fetch = page(modern, "http://example.com/");
    assert.equal(await websiteProblem("http://example.com", new Date("2026-10-08")), "Website isn't secure (no https)");
    globalThis.fetch = page(`<html><body>This domain is for sale! ${"x".repeat(500)}</body></html>`);
    assert.equal(await websiteProblem("https://example.com"), "Website domain is parked or expired");
    globalThis.fetch = (async () => { throw new Error("ENOTFOUND"); }) as unknown as typeof fetch;
    assert.equal(await websiteProblem("https://example.com"), "Website doesn't load");
  } finally {
    globalThis.fetch = real;
  }
});

test("Google profile text checks catch what Google rejects", async () => {
  const { profileTextProblems } = await import("../src/copy/gbp.ts");
  assert.deepEqual(profileTextProblems("Fresh barbecue in Cullman, cooked low and slow every morning.", 750), []);
  assert.deepEqual(profileTextProblems("Call us at (256) 555-0100 today", 750), ["has a phone number"]);
  assert.deepEqual(profileTextProblems("Visit www.example.com for more", 750), ["has a link"]);
  assert.deepEqual(profileTextProblems("The best BBQ in Cullman", 750), ["has a superlative"]);
  assert.deepEqual(profileTextProblems("x".repeat(800), 750), ["over 750 characters"]);
});

test("hand-added businesses get a sensible template guess", async () => {
  const { guessCategory } = await import("../src/places/qualify.ts");
  const p = (name: string, primaryType?: string, types: string[] = []) => ({ id: "x", displayName: { text: name }, primaryType, types });
  assert.equal(guessCategory(p("Rusty's Diner", "restaurant")), "restaurant");
  assert.equal(guessCategory(p("Smith Plumbing", "plumber")), "contractor");
  assert.equal(guessCategory(p("Green Acres Lawn Care", "point_of_interest")), "landscaping");
  assert.equal(guessCategory(p("Sparkle Maids", "point_of_interest")), "cleaning");
  assert.equal(guessCategory(p("Luxe Nails", "nail_salon")), "salon");
  assert.equal(guessCategory(p("Main St Tire & Auto", "car_repair")), "auto");
  assert.equal(guessCategory(p("Acme Holdings", "point_of_interest")), null);
});
