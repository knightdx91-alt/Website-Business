import assert from "node:assert/strict";
import { test } from "node:test";
import { EXAMPLES } from "../src/examples/examples.ts";
import { buildSite } from "../src/generator/render.ts";
import type { BusinessRecord } from "../src/generator/types.ts";

const ex = EXAMPLES.find((e) => e.record.category === "restaurant" && e.record.ext.restaurant?.menu)!;
const build = (record: BusinessRecord, mode: "publish" | "preview" = "publish") =>
  buildSite({ record, copy: ex.copy, site: { slug: ex.slug, look: ex.design, origin: "https://example.test" }, mode, allowSamples: true });

test("featured photos make a mosaic right after the menu, with menu prices on the captions", async () => {
  const items = ex.record.ext.restaurant!.menu!.sections.flatMap((s) => s.items).filter((i) => i.price).slice(0, 4);
  const record = structuredClone(ex.record);
  record.media.gallery = [
    ...items.map((it, n) => ({ src: `/assets/owner/f${n}.jpg`, alt: it.name, source: "owner" as const, caption: it.name, featured: true })),
    { src: "/assets/owner/plain.jpg", alt: "Dining room", source: "owner" as const, caption: "Dining room" },
    { src: "/assets/img/google-1.jpg", alt: "", source: "google" as const, featured: true },
  ];
  const home = String((await build(record)).files.get("index.html"));
  const at = home.indexOf('id="featured"');
  assert.ok(at > home.indexOf('id="menu"') && home.indexOf('id="menu"') > 0, "after the menu");
  const sec = home.slice(at, home.indexOf("</section>", at));
  assert.equal((sec.match(/class="mosaic__tile"/g) ?? []).length, 4, "the Google photo stays out of the live site");
  assert.ok(sec.includes(`<span class="mosaic__price">${items[0]!.price}</span>`), "price from the menu");
  assert.ok(sec.includes('href="/menu/"'));
  assert.equal(home.split("/assets/owner/f0.jpg").length - 1, 2, "a featured photo shows once (data-zoom + img), not again in the grid");
  assert.ok(home.includes("/assets/owner/plain.jpg"), "the other photo stays in the grid");

  record.media.gallery = record.media.gallery.slice(0, 1).concat(record.media.gallery.slice(4));
  const one = String((await build(record)).files.get("index.html"));
  assert.ok(!one.includes('id="featured"'), "one featured photo is not a mosaic");
});
