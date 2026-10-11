import assert from "node:assert/strict";
import test from "node:test";
import { parseMenuText } from "../../src/generator/menu.ts";
import { applyClientItems, pricesFeed } from "../../src/worker/tankboard.ts";
import type { LeadRow } from "../../src/worker/db.ts";
import { categoryRecord } from "../fixtures.ts";

const LIST = "# Freshwater\nNeon tetra | $2.99 | Schooling fish\nCorydoras | $6.99\n\n# Saltwater\nOcellaris clownfish | $24.99";
const ORIGIN = "https://app.test";

function shop() {
  const record = categoryRecord("retail");
  record.media.gallery = [{ src: "/assets/owner/c1.jpg", alt: "Neon tetra", source: "owner", width: 1600, height: 1200 }];
  record.ext.retail = { ...(record.ext.retail ?? {}), priceList: { sections: parseMenuText(LIST), lastUpdated: "Oct 11, 9:00 AM", title: "Fish & prices", public: true } };
  const [fresh] = record.ext.retail.priceList!.sections;
  fresh!.items[0]!.image = record.media.gallery[0];
  fresh!.items[1]!.soldOut = true;
  record.ext.retail.priceList!.sections[1]!.items[0]!.qty = 0;
  return record;
}
const lead = (over: Partial<LeadRow> = {}) => ({ id: "lead1", live_url: "https://shop.pages.dev/", custom_domain: null, ...over }) as LeadRow;

test("the live feed hides sold-out and empty tanks, serves owner photos through /l/, and the board gets everything", () => {
  const feed = pricesFeed(lead(), shop(), ORIGIN);
  assert.equal(feed.title, "Fish & prices");
  assert.equal(feed.siteUrl, "https://shop.pages.dev/prices/");
  assert.deepEqual(feed.sections.map((s) => s.name), ["Freshwater"], "Saltwater's only item has qty 0, so the section is gone");
  assert.deepEqual(feed.sections[0]!.items.map((i) => i.name), ["Neon tetra"], "the sold-out Corydoras is hidden");
  assert.equal(feed.sections[0]!.items[0]!.image, `${ORIGIN}/l/lead1/photo/c1.jpg`);
  const all = pricesFeed(lead({ custom_domain: "kingfish.example" }), shop(), ORIGIN, true);
  assert.equal(all.siteUrl, "https://kingfish.example/prices/");
  assert.equal(all.sections.length, 2);
  assert.equal(all.sections[0]!.items[1]!.soldOut, true);
  assert.equal(all.sections[1]!.items[0]!.qty, 0);
});

test("saving from the board keeps photos by file, applies counts and sold-out, and stamps the time", () => {
  const record = shop();
  applyClientItems(record, {
    sections: [
      { name: "Tank 1", note: "Community", items: [{ name: "Neon tetra", price: "$3.49", qty: 12, imageSrc: "/assets/owner/c1.jpg" }, { name: "Corydoras", price: "$6.99", soldOut: true, imageSrc: null }] },
      { name: "Tank 2", items: [{ name: "Betta", price: "$9.99", qty: 3, note: "Males" }] },
    ],
  });
  const pl = record.ext.retail!.priceList!;
  assert.deepEqual(pl.sections.map((s) => s.name), ["Tank 1", "Tank 2"]);
  assert.equal(pl.sections[0]!.items[0]!.image?.src, "/assets/owner/c1.jpg", "photo kept by file name");
  assert.equal(pl.sections[0]!.items[0]!.qty, 12);
  assert.equal(pl.sections[0]!.items[1]!.soldOut, true);
  assert.equal(pl.sections[1]!.items[0]!.description, "Males");
  assert.equal(pl.title, "Fish & prices", "title and public flag survive");
  assert.notEqual(pl.lastUpdated, "Oct 11, 9:00 AM");
});
