import assert from "node:assert/strict";
import { test } from "node:test";
import { CLIENT_SCRIPT } from "../../src/generator/client-script.ts";
import { buildSite } from "../../src/generator/render.ts";
import type { Image } from "../../src/generator/types.ts";
import { applyEdits } from "../../src/worker/edits.ts";
import { categoryRecord, sampleCopy } from "../fixtures.ts";

const photo = (n: number, extra: Partial<Image> = {}): Image => ({ src: `/assets/owner/g${n}.jpg`, alt: `Shelf ${n}`, source: "owner", width: 800, height: 1000, ...extra });

test("What's new photos: a carousel with zoom buttons; they leave the Photos grid", async () => {
  const r = categoryRecord("retail");
  r.variant = "thrift";
  r.media.gallery = [photo(1, { whatsNew: true, caption: "Vintage glass" }), photo(2, { whatsNew: true }), photo(3)];
  const out = await buildSite({ record: r, copy: sampleCopy(), site: { slug: "s", look: "" }, mode: "preview", formEndpoint: "https://app.example/f/1" });
  const html = String(out.files.get("index.html"));
  const nw = html.slice(html.indexOf('id="new"'), html.indexOf("</section>", html.indexOf('id="new"')));
  assert.equal((nw.match(/data-zoom=/g) ?? []).length, 2);
  assert.match(nw, /data-cap="Vintage glass"/);
  assert.match(nw, /class="carousel__btn carousel__btn--next"/);
  const ph = html.slice(html.indexOf('id="photos"'));
  assert.ok(html.includes('id="photos"'));
  assert.ok(ph.includes("/assets/owner/g3.jpg") && !ph.slice(0, ph.indexOf("</section>")).includes("/assets/owner/g1.jpg"));
  // Photos in the regular grid open big too.
  assert.match(ph, /class="zoomable" data-zoom="\/assets\/owner\/g3.jpg"/);
  // The design's photo band never repeats a photo the page already shows.
  r.media.gallery = [photo(1, { whatsNew: true })];
  for (const look of ["retail.salvage_yard~poster~h0n0b0s0v0c0f0a0p0t0r0k0d0o0m0q0g0e0u0w0x2y2z1", "retail.salvage_yard~poster~h0n0b0s0v0c0f0a0p0t0r0k0d0o0m0q0g0e0u0w0x2y2z2"]) {
    const one = String((await buildSite({ record: r, copy: sampleCopy(), site: { slug: "s", look }, mode: "preview", formEndpoint: "https://app.example/f/1" })).files.get("index.html"));
    assert.equal((one.match(/src="\/assets\/owner\/g1\.jpg"/g) ?? []).length, 1, look);
  }
  // No ticked photos: no carousel.
  r.media.gallery = [photo(3)];
  const plain = String((await buildSite({ record: r, copy: sampleCopy(), site: { slug: "s", look: "" }, mode: "preview", formEndpoint: "https://app.example/f/1" })).files.get("index.html"));
  assert.ok(!plain.includes("data-carousel"));
  assert.match(CLIENT_SCRIPT, /lightbox__close/);
  new Function(CLIENT_SCRIPT);
});

test("galleryMeta edits tick and untick What's new", () => {
  const r = categoryRecord("retail");
  r.media.gallery = [photo(1)];
  const src = r.media.gallery[0]!.src;
  const on = applyEdits(r, sampleCopy(), { record: { galleryMeta: { [src]: { whatsNew: true } } } } as never).record;
  assert.equal(on.media.gallery[0]!.whatsNew, true);
  const off = applyEdits(on, sampleCopy(), { record: { galleryMeta: { [src]: { whatsNew: false } } } } as never).record;
  assert.equal(off.media.gallery[0]!.whatsNew, undefined);
});
