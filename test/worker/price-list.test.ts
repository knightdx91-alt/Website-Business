import assert from "node:assert/strict";
import test from "node:test";
import { buildSite } from "../../src/generator/render.ts";
import { parseMenuText } from "../../src/generator/menu.ts";
import { autoMatchPhotos, sectionSlug } from "../../src/generator/packs/retail.ts";
import { pricesPage } from "../../src/generator/pricelist.ts";
import { priceTagsPdf } from "../../src/worker/cards.ts";
import { applyEdits } from "../../src/worker/edits.ts";
import { categoryRecord, sampleCopy } from "../fixtures.ts";

const site = (look: string) => ({ slug: "shop", look, origin: "https://example.test" });
/** A shop record that clears the publish gate, so the sitemap and robots output can be checked. */
function shop() {
  const r = categoryRecord("retail");
  r.confirmed = ["name", "phone", "address", "hours", "services", "service_area", "variant"];
  return r;
}
const approved = () => ({ ...sampleCopy(), approved: true });
const file = (out: { files: Map<string, string | Uint8Array> }, path: string) => String(out.files.get(path) ?? "");

const LIST = "# Freshwater community\nNeon tetra | $2.99 | Schooling fish, keep 6+\nCorydoras | $6.99\n\n# Saltwater\nOcellaris clownfish | $24.99";

test("a shop's price list becomes a /prices/ page with a section per tank, linked and indexed when public", async () => {
  const record = shop();
  record.ext.retail = { ...(record.ext.retail ?? {}), priceList: { sections: parseMenuText(LIST), lastUpdated: "October 11, 2026", title: "Fish & prices", public: true } };
  const out = await buildSite({ record, copy: approved(), site: site("retail.mercantile~classic"), mode: "publish" });
  const prices = file(out, "prices/index.html");
  assert.ok(prices, "prices page is built");
  assert.match(prices, /id="sec-freshwater-community"/);
  assert.match(prices, /id="sec-saltwater"/);
  assert.match(prices, /Neon tetra/);
  assert.match(prices, /\$24\.99/);
  assert.doesNotMatch(prices, /name="robots" content="noindex"/);
  assert.match(file(out, "index.html"), /href="\/prices\/"[^>]*>Fish &amp; prices</);
  assert.match(file(out, "sitemap.xml"), /\/prices\//);
});

test("a private price list is built but kept out of Google, the sitemap and the menu", async () => {
  const record = shop();
  record.ext.retail = { ...(record.ext.retail ?? {}), priceList: { sections: parseMenuText(LIST), lastUpdated: "October 11, 2026", public: false } };
  const out = await buildSite({ record, copy: approved(), site: site("retail.mercantile~classic"), mode: "publish" });
  const prices = file(out, "prices/index.html");
  assert.match(prices, /name="robots" content="noindex"/);
  assert.doesNotMatch(file(out, "sitemap.xml"), /\/prices\//);
  assert.doesNotMatch(file(out, "index.html"), /href="\/prices\/"/);
  assert.equal(pricesPage({ r: record } as never)?.noindex, true);
});

test("editing the price list text sets the sections, the date and the title; empty text clears it", () => {
  const record = categoryRecord("retail");
  const first = applyEdits(record, sampleCopy(), { record: { retail: { priceListText: LIST, priceListTitle: "Fish & prices", pricesPublic: false } } } as never).record;
  const pl = first.ext.retail?.priceList;
  assert.equal(pl?.sections.length, 2);
  assert.equal(pl?.title, "Fish & prices");
  assert.equal(pl?.public, false);
  assert.match(pl?.lastUpdated ?? "", /2026|2027/);
  const cleared = applyEdits(first, sampleCopy(), { record: { retail: { priceListText: "" } } } as never).record;
  assert.equal(cleared.ext.retail?.priceList, undefined);
});

test("the QR price tag sheet is a PDF with one label per section and a page per 8 sections", () => {
  const sections = Array.from({ length: 10 }, (_, i) => ({ name: `Tank ${i + 1}`, slug: sectionSlug(`Tank ${i + 1}`) }));
  const pdf = priceTagsPdf({ business: "Kingfish Aquatics", siteUrl: "https://example.pages.dev/", title: "Fish & prices", sections });
  const text = new TextDecoder("latin1").decode(pdf);
  assert.match(text, /^%PDF/);
  assert.equal((text.match(/\/Type \/Page\b/g) ?? []).length, 2);
  assert.equal(sectionSlug("Freshwater & Community"), "freshwater-and-community");
});

test("items get photos: matched from gallery captions automatically, shown on the price page, and kept when the list is retyped", async () => {
  const record = shop();
  record.media.gallery = [
    { src: "/assets/owner/s1.jpg", alt: "Neon tetra school in the community tank", source: "site" },
    { src: "/assets/owner/s2.jpg", alt: "Store front", source: "site" },
  ];
  const sections = parseMenuText(LIST);
  assert.equal(autoMatchPhotos(sections, record.media.gallery), 1);
  assert.equal(sections[0]!.items[0]!.image?.src, "/assets/owner/s1.jpg");
  record.confirmed = [...record.confirmed, "site_photos"];
  record.ext.retail = { ...(record.ext.retail ?? {}), priceList: { sections, lastUpdated: "October 11, 2026", public: true } };
  const out = await buildSite({ record, copy: approved(), site: site("retail.mercantile~classic"), mode: "publish" });
  assert.match(file(out, "prices/index.html"), /menu-item--photo[\s\S]*s1\.jpg/);
  const retyped = applyEdits(record, approved(), { record: { retail: { priceListText: LIST + "\nCardinal tetra | $3.49" } } } as never).record;
  const items = retyped.ext.retail!.priceList!.sections.flatMap((s) => s.items);
  assert.equal(items.find((i) => i.name === "Neon tetra")?.image?.src, "/assets/owner/s1.jpg", "photo follows the item through a retype");
  const picked = applyEdits(retyped, approved(), { record: { retail: { priceItems: [{ name: "Cardinal tetra", image: "/assets/owner/s2.jpg" }, { name: "Neon tetra", image: "" }] } } } as never).record;
  const after = picked.ext.retail!.priceList!.sections.flatMap((s) => s.items);
  assert.equal(after.find((i) => i.name === "Cardinal tetra")?.image?.src, "/assets/owner/s2.jpg");
  assert.equal(after.find((i) => i.name === "Neon tetra")?.image, undefined);
});
