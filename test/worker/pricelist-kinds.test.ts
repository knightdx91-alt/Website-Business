import assert from "node:assert/strict";
import test from "node:test";
import { parseMenuText } from "../../src/generator/menu.ts";
import { buildSite } from "../../src/generator/render.ts";
import { KINDS, infoRows, listKind } from "../../src/generator/pricelist.ts";
import { applyPriceListEdit } from "../../src/worker/edits.ts";
import { editForm, editsFromForm } from "../../src/worker/editform.ts";
import { categoryRecord, sampleCopy } from "../fixtures.ts";

const approved = () => ({ ...sampleCopy(), approved: true });

test("every kind has words and care-card fields; the kind is guessed from the business when unset", () => {
  for (const k of Object.keys(KINDS)) assert.ok(KINDS[k as keyof typeof KINDS].fields.length >= 5, k);
  const bakery = categoryRecord("general");
  bakery.name = "Sweet Rise Bakery";
  bakery.typeLabel = "Bakery";
  assert.equal(listKind(bakery), "food");
  const nursery = categoryRecord("landscaping");
  assert.equal(listKind(nursery), "plants");
  const shop = categoryRecord("retail");
  assert.equal(listKind(shop), shop.variant === "pet" ? "fish" : "goods");
  shop.ext.retail = { ...(shop.ext.retail ?? {}), priceList: { sections: [], lastUpdated: "", kind: "fish" } };
  assert.equal(listKind(shop), "fish");
});

test("a business of any type gets the /prices/ page and nav link, with a kind-specific info card", async () => {
  const r = categoryRecord("general");
  r.name = "Sweet Rise Bakery";
  r.confirmed = ["name", "phone", "address", "hours", "services", "service_area", "variant"];
  r.services = [{ id: "cakes", name: "Custom cakes" }];
  r.ext.retail = { priceList: { sections: parseMenuText("# Case\nSourdough loaf | $8 | Baked daily\nCinnamon rolls (6) | $14"), lastUpdated: "today", title: "Today's case", public: true, kind: "food" } };
  r.ext.retail.priceList!.sections[0]!.items[0]!.info = { facts: [{ label: "Made with", value: "Flour, water, salt, starter" }, { label: "Allergens", value: "Wheat" }], notes: "Best the day it's baked." };
  const out = await buildSite({ record: r, copy: approved(), site: { slug: "bakery", look: "general.town_square~classic", origin: "https://example.test" }, mode: "publish" });
  const prices = String(out.files.get("prices/index.html") ?? "");
  assert.ok(prices, "prices page built for a non-shop");
  assert.match(prices, /<dt>Made with<\/dt><dd>Flour, water, salt, starter<\/dd>/);
  assert.match(prices, /Best the day it&#39;s baked\./);
  assert.match(String(out.files.get("index.html")), /href="\/prices\/"[^>]*>Today&#39;s case</);
});

test("info rows follow the kind's fields, then free facts; a fish card still shows on a shop set to goods", () => {
  assert.deepEqual(infoRows({ maxSize: "1.5 in", diet: "Flake" }, "goods"), [["Adult size", "1.5 in"], ["Eats", "Flake"]]);
  assert.deepEqual(infoRows({ facts: [{ label: "Brand", value: "Carhartt" }] }, "goods"), [["Brand", "Carhartt"]]);
});

test("retyping the list in Edit keeps counts, sold-out flags, info cards and the kind by name", () => {
  const r = categoryRecord("general");
  applyPriceListEdit(r, { text: "# Case\nSourdough | $8\nRye | $9", kind: "food", title: "Case" });
  const pl = r.ext.retail!.priceList!;
  pl.sections[0]!.items[0]!.qty = 3;
  pl.sections[0]!.items[1]!.soldOut = true;
  pl.sections[0]!.items[1]!.info = { facts: [{ label: "Allergens", value: "Wheat, rye" }] };
  applyPriceListEdit(r, { text: "# Case\nSourdough | $8.50\nRye | $9\nBaguette | $4" });
  const after = r.ext.retail!.priceList!;
  assert.equal(after.kind, "food");
  assert.equal(after.title, "Case");
  assert.equal(after.sections[0]!.items[0]!.qty, 3);
  assert.equal(after.sections[0]!.items[0]!.price, "$8.50");
  assert.equal(after.sections[0]!.items[1]!.soldOut, true);
  assert.equal(after.sections[0]!.items[1]!.info?.facts?.[0]?.value, "Wheat, rye");
  assert.equal(after.sections[0]!.items.length, 3);
});

test("the editor-as-data carries a Live price list card for non-shops and round-trips it", () => {
  const r = categoryRecord("general");
  const d = { record: r as never, copy: { ...sampleCopy(), approved: true } as never, looks: [] };
  const form = editForm(d);
  const card = form.cards.find((c) => c.id === "pricelist");
  assert.ok(card, "pricelist card");
  const values = { plText: "# Shelf\nLocal honey | $12", plTitle: "Shelf", plKind: "food", plPublic: true };
  const { edits } = editsFromForm(d, values);
  assert.deepEqual(edits.record?.priceList, { text: "# Shelf\nLocal honey | $12", title: "Shelf", public: true, kind: "food" });
});
