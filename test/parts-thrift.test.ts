import assert from "node:assert/strict";
import { test } from "node:test";
import { autoVariant, partsBannedPhrases, partsCounter, seedAutoServices } from "../src/generator/packs/auto.ts";
import { donationsMissing, retailVariant } from "../src/generator/packs/retail.ts";
import { buildSite } from "../src/generator/render.ts";
import type { BusinessRecord } from "../src/generator/types.ts";
import { groupById } from "../src/places/queries.ts";
import { guessCategory, isChain } from "../src/places/qualify.ts";
import { categoryRecord, sampleCopy } from "./fixtures.ts";

const parts = (ext: NonNullable<BusinessRecord["ext"]["auto"]>["parts"] = {}, over: Partial<BusinessRecord> = {}) =>
  categoryRecord("auto", { name: "Sample Auto Parts", variant: "parts", services: seedAutoServices("parts"), ext: { auto: { parts: ext } }, serviceArea: undefined, ...over });

test("parts stores are picked from the name first, then Google's type; chains stay out", () => {
  assert.equal(autoVariant("auto_parts_store", ["store"], "Cullman Parts Co"), "parts");
  assert.equal(autoVariant("car_repair", ["car_repair"], "Smith Auto Parts & Repair"), "parts", "the name wins");
  assert.equal(autoVariant("store", [], "Hanceville Parts & Supply"), "parts");
  assert.equal(autoVariant("car_repair", [], "Smith Auto Repair"), "general");
  assert.equal(autoVariant("car_repair", [], "Jack's Transmission Parts & Repair"), "transmission", "repair shops that mention parts stay repair");
  assert.equal(autoVariant("car_repair", [], "Bob's Tires & Service"), "tire");
  assert.ok(isChain("O'Reilly Auto Parts", "auto") && isChain("AutoZone Auto Parts", "auto") && isChain("Carquest Auto Parts", "auto") && isChain("NAPA Auto Parts", "auto"));
  assert.ok(!isChain("Cullman Auto Parts", "auto"));
  const p = (name: string, type: string) => ({ id: "x", displayName: { text: name }, primaryType: type, types: [type] }) as never;
  assert.equal(guessCategory(p("Cullman Parts & Supply", "store")), "auto");
  assert.equal(guessCategory(p("Northside Motor Parts", "auto_parts_store")), "auto");
  assert.equal(groupById("auto_parts")?.category, "auto");
  assert.deepEqual(partsCounter(parts()).map((c) => c.id), ["battery", "install", "loaner"], "sensible defaults on");
  assert.deepEqual(partsCounter(parts({ counter: { battery: false, keys: true } })).map((c) => c.id), ["install", "loaner", "keys"]);
});

test("a parts site sells the counter: carry list, special orders, counter services, reserve-a-part form", async () => {
  const out = await buildSite({ record: parts(), copy: sampleCopy(), site: { slug: "p", look: "" }, mode: "preview" });
  assert.deepEqual(out.lint.errors, []);
  const home = String(out.files.get("index.html"));
  for (const id of ["carry", "orders", "counter", "reserve", "reviews", "visit"]) assert.ok(home.includes(`id="${id}"`), `has #${id}`);
  assert.ok(!home.includes('id="commercial"'), "commercial accounts only when turned on");
  assert.ok(!home.includes('id="area"'), "a parts store is a storefront, not a service area");
  assert.ok(home.includes('"@type":"AutoPartsStore"'), "schema.org type");
  assert.ok(/<title>Auto Parts Store in Cullman, AL \| Sample Auto Parts<\/title>/.test(home));
  assert.ok(home.includes("Call to check stock") && home.includes(">Reserve a part<"), "primary and secondary actions");
  assert.ok(home.includes('href="#reserve"'), "reserve points at the form");
  for (const n of ["year", "make", "model", "part"]) assert.ok(home.includes(`name="${n}"`), `form field ${n}`);
  assert.ok(home.includes('name="part" autocomplete="off" required'), "the part is required");
  assert.ok(home.includes('name="topic" value="Reserve a part"'));
  assert.ok(!home.includes('name="service"'), "no what-do-you-need select on the reserve form");
  for (const label of ["What we carry", "Services", "Reserve a part", "Hours", "Reviews"]) assert.ok(home.includes(`">${label}</a></li>`), `nav ${label}`);
  assert.ok(home.includes("Battery testing") && !home.includes("Key cutting"), "default counter services");
  assert.ok(out.todos.some((t) => /counter services/.test(t)), "owner must confirm counter services");
  assert.ok(out.suggestions.some((t) => /turnaround/.test(t)) && !out.todos.some((t) => /turnaround/.test(t)), "turnaround is suggested, not required");
  assert.ok(!home.includes("Order online for pickup"), "no online ordering without a link");

  const filled = await buildSite({
    record: parts({ counterConfirmed: true, counter: { keys: true, loaner: false }, turnaround: "Most parts are here by the next morning.", commercial: true, program: "Parts Plus", orderUrl: "https://example.com/order" }, { confirmed: ["services"] }),
    copy: sampleCopy(),
    site: { slug: "p", look: "" },
    mode: "preview",
  });
  const h2 = String(filled.files.get("index.html"));
  assert.ok(!filled.todos.some((t) => /counter services|carry/.test(t)), filled.todos.join("; "));
  assert.ok(h2.includes('id="commercial"') && h2.includes("Commercial accounts"));
  assert.ok(h2.includes("Order online for pickup") && h2.includes('href="https://example.com/order"'));
  assert.ok(h2.includes("next morning") && h2.includes("Key cutting") && !h2.includes("Loaner tools"));
  assert.ok(h2.includes("Parts Plus"), "program shows as a trust chip");

  const live = await buildSite({ record: parts({ counterConfirmed: true }, { confirmed: ["name", "phone", "address", "hours", "services"] }), copy: sampleCopy({ approved: true }), site: { slug: "p", look: "", origin: "https://p.pages.dev" }, mode: "publish", formEndpoint: "https://app.example/f/1" });
  assert.deepEqual(live.lint.errors, []);
  assert.ok(live.files.has("privacy/index.html") && live.files.has("thanks/index.html"), "form pages ship");
});

test("parts copy may not claim shipping, prices, stock or brands the owner didn't give", async () => {
  const bans = partsBannedPhrases(parts());
  for (const bad of ["Free shipping on every order", "We ship nationwide", "the lowest prices in town", "Everything in stock", "We carry Motorcraft and Bosch", "Shop online today"]) assert.ok(bans.some((re) => re.test(bad)), bad);
  for (const fine of ["Call and we'll tell you if it's on the shelf", "Brakes, batteries and filters", "Bring your old battery in"]) assert.ok(!bans.some((re) => re.test(fine)), fine);
  const withOrder = partsBannedPhrases(parts({ orderUrl: "https://example.com", program: "NAPA" }, { services: [{ id: "i", name: "Interstate batteries" }] }));
  assert.ok(!withOrder.some((re) => re.test("Order online for pickup")), "online ordering allowed with a link");
  assert.ok(!withOrder.some((re) => re.test("Interstate batteries")), "a brand the owner typed is fine");
  assert.ok(withOrder.some((re) => re.test("Bosch wipers")), "other brands still banned");
  const out = await buildSite({ record: parts(), copy: sampleCopy({ heroSub: "Free shipping on everything we sell." }), site: { slug: "p", look: "" }, mode: "preview" });
  assert.ok(out.lint.errors.some((e) => /isn't allowed/.test(e)), out.lint.errors.join("; "));
});

const thrift = (donations: NonNullable<BusinessRecord["ext"]["retail"]>["donations"] | undefined, variant = "thrift") =>
  categoryRecord("retail", { name: "Sample Thrift", variant, showStreetAddress: true, ext: { retail: donations ? { donations } : {} } });

test("thrift stores get a Donations section that blocks publishing until the owner fills it in", async () => {
  assert.equal(retailVariant("thrift_store", [], "Second Chance Resale"), "thrift");
  const empty = await buildSite({ record: thrift(undefined), copy: sampleCopy(), site: { slug: "t", look: "" }, mode: "preview" });
  const home = String(empty.files.get("index.html"));
  assert.ok(home.includes('id="donations"') && home.includes('">Donations</a></li>'), "section and nav");
  assert.ok(home.includes("Donate items"), "hero action");
  assert.ok(!home.includes("We gladly take"), "no columns before the owner's lists");
  assert.ok(!home.includes('id="pickup"'), "no pickup form unless turned on");
  assert.ok(!empty.files.has("privacy/index.html"), "no form, no privacy page");
  assert.ok(empty.todos.includes("Tell us what you accept for donations and your drop-off hours"));
  assert.ok(donationsMissing(thrift(undefined)));

  const filled = thrift({ accepts: ["Clothing", "Housewares"], doesNotAccept: ["Mattresses", "TVs"], dropOffHours: "Monday to Saturday, 10 to 4", pickup: true, receipts: true });
  const out = await buildSite({ record: filled, copy: sampleCopy(), site: { slug: "t", look: "" }, mode: "preview" });
  assert.deepEqual(out.lint.errors, []);
  assert.ok(!out.todos.some((t) => /donations/.test(t)), out.todos.join("; "));
  const h = String(out.files.get("index.html"));
  assert.ok(h.includes("We gladly take") && h.includes("We can't take") && h.includes("Mattresses") && h.includes("Housewares"));
  assert.ok(h.includes("Drop-off hours:</strong> Monday to Saturday, 10 to 4"));
  assert.ok(h.includes("give you a receipt"));
  assert.ok(h.includes('id="pickup"') && h.includes("Request a furniture pickup"));
  for (const n of ["items", "address", "best_day"]) assert.ok(h.includes(`name="${n}"`), `pickup field ${n}`);
  assert.ok(h.includes('name="topic" value="Furniture pickup"'));
  assert.ok(out.files.has("privacy/index.html"), "the pickup form brings the privacy page");
  const order = h.indexOf('id="new"') < h.indexOf('id="donations"') && h.indexOf('id="donations"') < h.indexOf('id="reviews"');
  assert.ok(order, "Donations sits after What's new");

  const gift = await buildSite({ record: thrift(undefined, "gift"), copy: sampleCopy(), site: { slug: "g", look: "" }, mode: "preview" });
  assert.ok(!String(gift.files.get("index.html")).includes('id="donations"'), "other shops have no donations by default");
  const giftOn = await buildSite({ record: thrift({ enabled: true, accepts: ["Books"], dropOffHours: "Any time we're open" }, "gift"), copy: sampleCopy(), site: { slug: "g", look: "" }, mode: "preview" });
  assert.ok(String(giftOn.files.get("index.html")).includes('id="donations"'), "but can turn it on");
  const off = await buildSite({ record: thrift({ enabled: false }), copy: sampleCopy(), site: { slug: "t", look: "" }, mode: "preview" });
  assert.ok(!String(off.files.get("index.html")).includes('id="donations"') && !off.todos.some((t) => /donations/.test(t)), "a thrift store can turn it off");
});
