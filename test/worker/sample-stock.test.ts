import assert from "node:assert/strict";
import test from "node:test";
import { parseMenuText } from "../../src/generator/menu.ts";
import { buildSite } from "../../src/generator/render.ts";
import {
  addSampleStock,
  hasSampleStock,
  removeSampleStock,
  sampleSetFor,
} from "../../src/worker/sample-stock.ts";
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
