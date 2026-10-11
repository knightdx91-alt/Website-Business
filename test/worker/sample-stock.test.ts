import assert from "node:assert/strict";
import test from "node:test";
import { parseMenuText } from "../../src/generator/menu.ts";
import { buildSite } from "../../src/generator/render.ts";
import { applyPriceListEdit } from "../../src/worker/edits.ts";
import { menuToText } from "../../src/generator/menu.ts";
import {
  addSampleStock,
  hasSampleStock,
  removeSampleStock,
  sampleSetFor,
} from "../../src/worker/sample-stock.ts";
import { itemEmoji } from "../../src/generator/pricelist.ts";
import { categoryRecord, sampleCopy } from "../fixtures.ts";

test("every kind of business gets believable sample stock, picked by what it is", () => {
  const parts = categoryRecord("auto");
  parts.name = "Cullman Auto Parts";
  parts.variant = "parts";
  assert.equal(sampleSetFor(parts).kind, "parts");
  assert.match(JSON.stringify(sampleSetFor(parts).sections), /Oil filter/);
  const tires = categoryRecord("auto");
  tires.name = "RPS Tire Shop";
  tires.variant = "tire";
  assert.match(JSON.stringify(sampleSetFor(tires).sections), /265\/70R17/);
  const hardware = categoryRecord("retail");
  hardware.name = "Hanceville Hardware";
  hardware.typeLabel = "Hardware Store";
  hardware.variant = "hardware";
  assert.match(JSON.stringify(sampleSetFor(hardware).sections), /Deck screws/);
  const feed = categoryRecord("retail");
  feed.name = "Cullman Feed & Seed";
  feed.variant = "farm_feed";
  assert.match(JSON.stringify(sampleSetFor(feed).sections), /Layer pellets/);
  const bakery = categoryRecord("retail");
  bakery.name = "Sweet Rise Bakery";
  bakery.typeLabel = "Bakery";
  assert.match(JSON.stringify(sampleSetFor(bakery).sections), /Sourdough/);
  const produce = categoryRecord("retail");
  produce.name = "Smith Farm Market";
  assert.match(JSON.stringify(sampleSetFor(produce).sections), /Sweet corn/);
  const fish = categoryRecord("retail");
  fish.name = "King Fish Aquatics";
  fish.variant = "pet";
  assert.match(JSON.stringify(sampleSetFor(fish).sections), /Neon tetra/);
  const lot = categoryRecord("general");
  lot.name = "Hwy 31 Auto Sales";
  lot.typeLabel = "Used car dealer";
  assert.match(JSON.stringify(sampleSetFor(lot).sections), /F-150/);
  const gym = categoryRecord("general");
  gym.name = "Iron Ridge Fitness";
  gym.typeLabel = "Gym";
  assert.equal(sampleSetFor(gym).kind, "goods");
});

test("adding samples keeps the shop's own items, flags every sample, and removing takes exactly those out", () => {
  const r = categoryRecord("auto");
  r.name = "Cullman Auto Parts";
  r.variant = "parts";
  (r.ext.retail ??= {}).priceList = {
    sections: parseMenuText("# Filters\nMy own filter | $5"),
    lastUpdated: "",
    public: true,
  };
  const added = addSampleStock(r);
  assert.ok(added.items > 10);
  const pl = r.ext.retail.priceList!;
  assert.equal(pl.sections[0]!.name, "Filters");
  assert.equal(
    pl.sections[0]!.items[0]!.sample,
    undefined,
    "the shop's own item is untouched",
  );
  assert.equal(
    pl.sections[1]!.name,
    "Filters (sample)",
    "a clashing section name is marked",
  );
  assert.ok(hasSampleStock(r));
  assert.ok(
    pl.sections
      .flatMap((s) => s.items)
      .filter((it) => it.sample)
      .every((it) => it.price),
  );
  const parts = pl.sections
    .flatMap((s) => s.items)
    .find((it) => it.name.startsWith("Oil filter"))!;
  assert.deepEqual(parts.info?.facts?.[0], {
    label: "Part # / size",
    value: "PH3614",
  });
  // Adding twice doesn't double up.
  addSampleStock(r);
  assert.equal(
    r.ext.retail.priceList!.sections.filter((s) => s.name.endsWith("(sample)"))
      .length,
    1,
  );
  const removed = removeSampleStock(r);
  assert.equal(removed, added.items);
  assert.equal(hasSampleStock(r), false);
  assert.deepEqual(
    r.ext.retail.priceList!.sections.map((s) => s.name),
    ["Filters"],
  );
  assert.equal(
    r.ext.retail.priceList!.sections[0]!.items[0]!.name,
    "My own filter",
  );
});

test("a fish store's samples carry care cards in the fish fields, and a blank list disappears when samples go", () => {
  const r = categoryRecord("retail");
  r.name = "King Fish Aquatics";
  r.variant = "pet";
  addSampleStock(r);
  const tetra = r.ext.retail!.priceList!.sections[0]!.items[0]!;
  assert.equal(tetra.info?.minTank, "10 gal");
  assert.equal(r.ext.retail!.priceList!.kind, "fish");
  removeSampleStock(r);
  assert.equal(r.ext.retail!.priceList, undefined);
});

test("the preview shows the sample note and a REQUIRED to-do, so the site can't publish with samples on it", async () => {
  const r = categoryRecord("retail");
  r.name = "Hanceville Hardware";
  r.typeLabel = "Hardware Store";
  r.variant = "hardware";
  addSampleStock(r);
  const preview = await buildSite({
    record: r,
    copy: sampleCopy(),
    site: { slug: "t", look: "" },
    mode: "preview",
  });
  const key = [...preview.files.keys()].find((k) =>
    /prices\/index\.html$/.test(k),
  )!;
  const prices = preview.files.get(key);
  assert.ok(
    typeof prices === "string" && /Sample items\./.test(prices),
    [...preview.files.keys()].filter((k) => k.includes("prices")).join(","),
  );
  assert.ok(
    preview.todos.some((t) => /sample items/i.test(t)),
    JSON.stringify(preview.todos),
  );
  await assert.rejects(
    buildSite({
      record: r,
      copy: sampleCopy({ approved: true }),
      site: { slug: "t", look: "", origin: "https://t.pages.dev" },
      mode: "publish",
    }),
    /Remove the sample items from the price list/,
  );
});

test("retyping the list in Edit keeps sample items flagged, so they can still be removed and still block publishing", () => {
  const r = categoryRecord("retail"); r.name = "Hanceville Hardware"; r.typeLabel = "Hardware Store"; r.variant = "hardware";
  addSampleStock(r);
  const text = menuToText(r.ext.retail!.priceList!.sections) + "\nMy own hammer | $19";
  applyPriceListEdit(r, { text });
  assert.ok(hasSampleStock(r));
  const items = r.ext.retail!.priceList!.sections.flatMap((s) => s.items);
  assert.equal(items.find((it) => it.name === "My own hammer")!.sample, undefined);
  assert.ok(items.filter((it) => it.sample).length > 10);
  removeSampleStock(r);
  assert.deepEqual(r.ext.retail!.priceList!.sections.flatMap((s) => s.items).map((it) => it.name), ["My own hammer"]);
});

test("placeholder pictures match the item, not just the kind of shop", () => {
  assert.equal(itemEmoji("Battery, group 24F", "parts"), "🔋");
  assert.equal(itemEmoji("Oil filter, spin-on", "parts"), "🛢️");
  assert.equal(itemEmoji("265/70R17 all-terrain", "parts"), "🛞");
  assert.equal(itemEmoji("2018 Ford F-150 XLT SuperCrew", "vehicles"), "🛻");
  assert.equal(itemEmoji("Ocellaris clownfish", "fish"), "🐠");
  assert.equal(itemEmoji("Neon tetra", "fish"), "🐟");
  assert.equal(itemEmoji("Sourdough loaf", "food"), "🍞");
  assert.equal(itemEmoji("Cinnamon roll", "food"), "🥐");
  assert.equal(itemEmoji("Deck screws 3 in, 5 lb box", "goods"), "🔩");
  assert.equal(itemEmoji("Layer pellets, 50 lb", "goods"), "🌾");
  assert.equal(itemEmoji("Soy candle, 8 oz", "goods"), "🕯️");
  assert.equal(itemEmoji("Zzyx widget", "goods"), "🏷️");
  const r = categoryRecord("auto"); r.name = "Cullman Auto Parts"; r.variant = "parts";
  addSampleStock(r);
  const items = r.ext.retail!.priceList!.sections.flatMap((s) => s.items);
  const distinct = new Set(items.map((it) => itemEmoji(it.name, "parts")));
  assert.ok(distinct.size >= 6, `only ${distinct.size} different pictures across ${items.length} parts`);
});
