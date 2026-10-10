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
  assert.equal(wide.length, 4 + 5 * 4);
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
  assert.equal(guessCategory(p("A1 Painting", "point_of_interest")), "contractor");
  assert.equal(guessCategory(p("Gloss Boss Auto Detailing", "point_of_interest")), "auto");
  assert.equal(guessCategory(p("Barnett Pressure Washing, LLC", "point_of_interest")), "cleaning");
  assert.equal(guessCategory(p("Relax & Align Massage", "point_of_interest")), "salon");
  assert.equal(guessCategory(p("Johnson Small Engine", "point_of_interest")), "auto");
  assert.equal(guessCategory(p("Creative Design & Screen Printing", "service")), "print");
  assert.equal(guessCategory(p("Cullman Sign and Banner", "point_of_interest")), "print");
  assert.equal(guessCategory(p("Lavish Boutique Cullman", "clothing_store")), "retail");
  assert.equal(guessCategory(p("Flowers & More", "point_of_interest")), "retail");
  assert.equal(guessCategory(p("Acme Holdings", "point_of_interest")), null);
});

test("new variants are picked from the business name", async () => {
  const { contractorTrade } = await import("../src/generator/packs/contractor.ts");
  const { autoVariant } = await import("../src/generator/packs/auto.ts");
  const { salonVariant } = await import("../src/generator/packs/salon.ts");
  const { cleaningVariant } = await import("../src/generator/packs/cleaning.ts");
  assert.equal(contractorTrade(undefined, [], "J W Painting & Staining"), "painting");
  assert.equal(contractorTrade(undefined, [], "Moore's Handyman and Woodworking"), "handyman");
  assert.equal(contractorTrade(undefined, [], "Cullman Concrete"), "concrete");
  assert.equal(contractorTrade(undefined, [], "Smith Plumbing"), "plumbing");
  assert.equal(autoVariant(undefined, [], "Gloss Boss Auto Detailing and Ceramic Coatings"), "detailing");
  assert.equal(autoVariant(undefined, [], "Simple Man Towing"), "towing");
  assert.equal(autoVariant(undefined, [], "Davis Small Engine"), "small_engine");
  assert.equal(autoVariant(undefined, [], "Main St Collision"), "body");
  assert.equal(salonVariant(undefined, [], "Revive Massage Therapy, LLC"), "massage");
  assert.equal(salonVariant(undefined, [], "Bella Hair Salon & Spa"), "salon");
  assert.equal(salonVariant(undefined, [], "Luxe Nail Spa"), "nails");
  assert.equal(cleaningVariant(undefined, [], "A Plus SoftWash LLC"), "exterior");
});

test("every new variant renders a clean preview", async () => {
  const { seedServices } = await import("../src/generator/packs/contractor.ts");
  const { seedAutoServices } = await import("../src/generator/packs/auto.ts");
  const { seedCleaningServices } = await import("../src/generator/packs/cleaning.ts");
  const cases: Array<[Parameters<typeof categoryRecord>[0], string, ReturnType<typeof seedServices>, RegExp]> = [
    ["contractor", "painting", seedServices("painting"), /Painting in/],
    ["contractor", "tree", seedServices("tree"), /Stump grinding/],
    ["auto", "detailing", seedAutoServices("detailing"), /What we offer/],
    ["auto", "small_engine", seedAutoServices("small_engine"), /Equipment \(type, make, model\)/],
    ["auto", "body", seedAutoServices("body"), /Collision repair/],
    ["cleaning", "exterior", seedCleaningServices("exterior"), /What we wash/],
    ["salon", "massage", seedSalonServices("massage"), /Massage therapy/],
  ];
  for (const [category, variant, services, expect] of cases) {
    const r = categoryRecord(category, { variant, services });
    const out = await buildSite({ record: r, copy: sampleCopy(), site: { slug: "v", look: "" }, mode: "preview" });
    const home = String(out.files.get("index.html"));
    assert.match(home, expect, `${category}/${variant}`);
    assert.deepEqual(out.lint.errors, [], `${category}/${variant}: ${JSON.stringify(out.lint.errors)}`);
  }
  const massage = await buildSite({ record: categoryRecord("salon", { variant: "massage", services: seedSalonServices("massage") }), copy: sampleCopy(), site: { slug: "m", look: "" }, mode: "preview" });
  assert.ok(massage.todos.some((t) => /license number/.test(t)));
});

test("new sites in a category spread across looks and layouts", async () => {
  const { pickDesign, layoutOf } = await import("../src/generator/design.ts");
  const { looksFor, parseDesign } = await import("../src/generator/themes.ts");
  const looks = looksFor("contractor");
  const used: string[] = [];
  for (let i = 0; i < 12; i++) used.push(pickDesign({ leadId: `lead${i}`, looks, used, taken: [] }));
  assert.equal(new Set(used).size, 12, "no two of the first 12 sites match");
  assert.equal(new Set(used.map((d) => parseDesign(d).look)).size, 12, "each of the first 12 sites gets its own colors and fonts");
  assert.equal(new Set(used.map(layoutOf)).size, 12, "and its own layout");
  const sold = used[0]!;
  for (let i = 0; i < 30; i++) assert.notEqual(pickDesign({ leadId: `x${i}`, looks, used: [], taken: [sold] }), sold);
  assert.equal(layoutOf("contractor.toolbox"), "split", "a bare look uses its own default layout");
  assert.equal(pickDesign({ leadId: "first", looks: looksFor("print"), used: [], taken: [], preferred: "print.fresh_ink" }).split("~").slice(0, 2).join("~"), "print.fresh_ink~poster", "first site gets the best fit");
});

test("print and retail shops get the right variant and a clean site", async () => {
  const { printVariant, seedPrintServices } = await import("../src/generator/packs/print.ts");
  const { retailVariant, seedRetailCarry } = await import("../src/generator/packs/retail.ts");
  assert.equal(printVariant("service", [], "Creative Design & Screen Printing"), "screen_printing");
  assert.equal(printVariant(undefined, [], "Cullman Sign and Banner"), "signs");
  assert.equal(printVariant(undefined, [], "Sew Blessed Fabric & Embroidery"), "embroidery");
  assert.equal(printVariant(undefined, [], "Modernistic Printers Inc"), "print_shop");
  assert.equal(retailVariant("florist", [], "Flowers & More"), "florist");
  assert.equal(retailVariant(undefined, [], "Sand Mountain Feed & Seed"), "farm_feed");
  assert.equal(retailVariant("clothing_store", [], "Lavish Boutique"), "boutique");
  assert.equal(retailVariant(undefined, [], "Cullman Antique Mall"), "antique");
  for (const v of ["screen_printing", "embroidery", "signs", "print_shop"]) {
    const out = await buildSite({ record: categoryRecord("print", { variant: v, services: seedPrintServices(v) }), copy: sampleCopy(), site: { slug: "pr", look: "" }, mode: "preview" });
    assert.deepEqual(out.lint.errors, [], v);
    assert.ok(String(out.files.get("index.html")).includes("Send us your design"), v);
  }
  for (const v of ["boutique", "gift", "antique", "thrift", "florist", "farm_feed", "furniture"]) {
    const out = await buildSite({ record: categoryRecord("retail", { variant: v, services: seedRetailCarry(v) }), copy: sampleCopy(), site: { slug: "rt", look: "" }, mode: "preview" });
    assert.deepEqual(out.lint.errors, [], v);
    assert.ok(out.todos.includes("Tick what you carry"), v);
  }
});
