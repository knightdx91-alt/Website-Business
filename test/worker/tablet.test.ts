import assert from "node:assert/strict";
import test from "node:test";
import { parseMenuText } from "../../src/generator/menu.ts";
import { buildSite } from "../../src/generator/render.ts";
import { addToTank, adjustQty, catalogOf, setInfoEverywhere, setItem } from "../../src/worker/tablet.ts";
import { applyClientItems, pricesFeed } from "../../src/worker/tankboard.ts";
import type { LeadRow } from "../../src/worker/db.ts";
import { categoryRecord, sampleCopy } from "../fixtures.ts";

const LIST = "# Tank 1\nNeon tetra | $2.99 | Schooling\nCorydoras | $6.99\n\n# Tank 2\nBetta | $9.99";
function shop() {
  const r = categoryRecord("retail");
  r.confirmed = ["name", "phone", "address", "hours", "services", "service_area", "variant"];
  r.media.gallery = [{ src: "/assets/owner/t1.jpg", alt: "Neon tetra", source: "owner", caption: "Neon tetra" }];
  r.ext.retail = { ...(r.ext.retail ?? {}), priceList: { sections: parseMenuText(LIST), lastUpdated: "x", public: true } };
  r.ext.retail.priceList!.sections[0]!.items[0]!.image = r.media.gallery[0];
  r.ext.retail.priceList!.sections[0]!.items[0]!.qty = 10;
  return r;
}
const lead = () => ({ id: "lead1", live_url: "https://shop.pages.dev/", custom_domain: null, client_key: "k" }) as unknown as LeadRow;

test("tablet taps: +1 / −1 clamp at 0, 0 hides on the page, a count above 0 clears Sold out", () => {
  const r = shop();
  adjustQty(r, "Tank 1", "Neon tetra", -4);
  assert.equal(r.ext.retail!.priceList!.sections[0]!.items[0]!.qty, 6);
  adjustQty(r, "Tank 1", "Neon tetra", -100);
  assert.equal(r.ext.retail!.priceList!.sections[0]!.items[0]!.qty, 0);
  const feed = pricesFeed(lead(), r, "https://app.test");
  assert.ok(!feed.sections.some((s) => s.items.some((i) => i.name === "Neon tetra")), "hidden at 0");
  setItem(r, "Tank 1", "Neon tetra", { soldOut: true });
  adjustQty(r, "Tank 1", "Neon tetra", 3);
  const it = r.ext.retail!.priceList!.sections[0]!.items[0]!;
  assert.equal(it.qty, 3);
  assert.equal(it.soldOut, undefined, "back in stock");
  assert.throws(() => adjustQty(r, "Tank 9", "Neon tetra", 1), /isn't on this tank/);
});

test("Add: an existing row gets the count added, a catalog item brings its photo and card back, a new tank is created", () => {
  const r = shop();
  setInfoEverywhere(r, "Neon tetra", { maxSize: "1.5 in", diet: "Flake", aiDrafted: true });
  const again = addToTank(r, "Tank 1", "neon tetra", 5);
  assert.equal(again.isNew, false);
  assert.equal(again.item.qty, 15);
  // Sell out and remove from the tank entirely, then it comes back from the catalog with its photo and card.
  applyClientItems(r, { sections: [{ name: "Tank 1", items: [{ name: "Corydoras", price: "$6.99" }] }, { name: "Tank 2", items: [{ name: "Betta", price: "$9.99" }] }] });
  assert.ok(catalogOf(r).some((c) => c.name === "Neon tetra" && c.image && c.info), "catalog remembers it");
  const back = addToTank(r, "Tank 3", "Neon tetra", 12);
  assert.equal(back.isNew, false);
  assert.equal(back.item.image?.src, "/assets/owner/t1.jpg");
  assert.equal(back.item.info?.maxSize, "1.5 in");
  assert.equal(back.item.price, "$2.99");
  assert.equal(r.ext.retail!.priceList!.sections.at(-1)!.name, "Tank 3");
  const brand = addToTank(r, "Tank 3", "Harlequin rasbora", 6, "$3.49");
  assert.equal(brand.isNew, true);
  assert.equal(brand.item.price, "$3.49");
  const feed = pricesFeed(lead(), r, "https://app.test");
  assert.equal(feed.sections.find((s) => s.name === "Tank 3")!.items[0]!.info?.diet, "Flake", "care cards ride in the live feed");
});

test("the price page folds a care card under an item", async () => {
  const r = shop();
  setInfoEverywhere(r, "Betta", { maxSize: "3 in", temperament: "Keep one male per tank", notes: "Lives 3 to 5 years." });
  const out = await buildSite({ record: r, copy: { ...sampleCopy(), approved: true }, site: { slug: "shop", look: "retail.mercantile~classic", origin: "https://example.test" }, mode: "publish" });
  const prices = String(out.files.get("prices/index.html") ?? "");
  assert.match(prices, /<details class="menu-item__more"><summary>About this one<\/summary><dl><dt>Adult size<\/dt><dd>3 in<\/dd>/);
  assert.match(prices, /Lives 3 to 5 years\./);
});

test("barcodes: find by code (current section first), add by code, set/clear, kept through a board save and in the catalog", async () => {
  const { addToTank, findByBarcode, setItem, catalogOf, normalizeCode, lookupBarcode } = await import("../../src/worker/tablet.ts");
  const { applyClientItems } = await import("../../src/worker/tankboard.ts");
  const r = shop();
  assert.equal(normalizeCode(" 0 12345-678905\n"), "012345-678905");
  // Scan an unknown code → a new item carries it; scanning again finds the row.
  addToTank(r, "Shelf 1", "Tetra Flakes 200 g", 3, "$8.99", "012345678905");
  const hit = findByBarcode(r, "012345678905");
  assert.equal(hit.item?.item.name, "Tetra Flakes 200 g");
  assert.equal(hit.item?.section, "Shelf 1");
  // The same product on a second shelf: the scan prefers the section the staff is looking at.
  addToTank(r, "Shelf 2", "Tetra Flakes 200 g", 2);
  assert.equal(findByBarcode(r, "012345678905", "Shelf 2").item?.section, "Shelf 2");
  assert.equal(findByBarcode(r, "012345678905").item?.section, "Shelf 1");
  // Linking a code to an item added by name; one code belongs to one product.
  addToTank(r, "Shelf 1", "Bloodworms", 5);
  setItem(r, "Shelf 1", "Bloodworms", { barcode: "012345678905" });
  assert.equal(findByBarcode(r, "012345678905").item?.item.name, "Bloodworms");
  assert.equal(findByBarcode(r, "012345678905", "Shelf 2").item?.section, "Shelf 1"); // not on Shelf 2 any more: falls back to where it is
  assert.equal(catalogOf(r).find((c) => c.name === "Tetra Flakes 200 g")?.barcode, undefined);
  assert.equal(catalogOf(r).find((c) => c.name === "Bloodworms")?.barcode, "012345678905");
  // Clearing.
  setItem(r, "Shelf 1", "Bloodworms", { barcode: "" });
  assert.deepEqual(findByBarcode(r, "012345678905"), {});
  // The board (phone) saves the list without barcodes: they ride along by name; a typed one is normalized.
  setItem(r, "Shelf 1", "Bloodworms", { barcode: "4006381333931" });
  applyClientItems(r, { sections: [{ name: "Shelf 1", items: [{ name: "Bloodworms", qty: 5 }, { name: "Neon Tetra", price: "$2.99", barcode: " 55 55 " }] }] });
  assert.equal(findByBarcode(r, "4006381333931").item?.item.name, "Bloodworms");
  assert.equal(findByBarcode(r, "5555").item?.item.name, "Neon Tetra");
  // A sold-out-and-removed product keeps its code in the catalog, so the next scan brings it back.
  applyClientItems(r, { sections: [{ name: "Shelf 1", items: [{ name: "Neon Tetra", price: "$2.99" }] }] });
  assert.equal(findByBarcode(r, "4006381333931").catalog?.name, "Bloodworms");
  // Unknown codes: the Open Food Facts lookup turns a product record into a name; non-UPC codes and errors give null.
  const fake = (async (url: string | URL | Request) => {
    assert.match(String(url), /openfoodfacts\.org\/api\/v2\/product\/4006381333931/);
    return new Response(JSON.stringify({ product: { product_name: "Tetra Flakes", brands: "Tetra,Spectrum", quantity: "200 g" } }));
  }) as unknown as typeof fetch;
  assert.equal(await lookupBarcode("4006381333931", fake), "Tetra Flakes 200 g");
  assert.equal(await lookupBarcode("ABC-123", fake), null);
  assert.equal(await lookupBarcode("4006381333931", (async () => new Response("", { status: 404 })) as unknown as typeof fetch), null);
  assert.equal(await lookupBarcode("4006381333931", (async () => { throw new Error("down"); }) as unknown as typeof fetch), null);
});
