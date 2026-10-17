import assert from "node:assert/strict";
import test from "node:test";
import { buildSite } from "../../src/generator/render.ts";
import { stockPhotosOf } from "../../src/generator/scenes.ts";
import { applyEdits } from "../../src/worker/edits.ts";
import { editForm, editsFromForm } from "../../src/worker/editform.ts";
import { categoryRecord, restaurantRecord, sampleCopy } from "../fixtures.ts";

const DETAIL = { menuText: "", looks: [], layouts: [], dnaOrder: [], dna: null, layout: "classic", lookBase: "" };
const fields = (r: ReturnType<typeof categoryRecord>) =>
  editForm({ record: r, copy: sampleCopy(), ...DETAIL } as never).cards.flatMap((c) => c.fields.map((f) => ({ card: c.id, ...f })));

function salonWithPhotos() {
  const r = categoryRecord("salon");
  r.media.hero = { src: "/assets/owner/hero.jpg", alt: "Sign", source: "owner", width: 960, height: 960 };
  r.media.gallery = [{ src: "/assets/owner/g1.jpg", alt: "Chair", source: "owner", width: 800, height: 600 }];
  return r;
}

test("main photo framing and phone zoom: editor fields, saving, and the built page", async () => {
  const r0 = salonWithPhotos();
  const f = fields(r0);
  assert.ok(f.some((x) => x.name === "heroFocus" && x.card === "photo"));
  assert.ok(f.some((x) => x.name === "heroZoom"));
  assert.ok(f.some((x) => x.name === "gfocus_g1"));
  const built = editsFromForm({ record: r0, copy: sampleCopy(), ...DETAIL } as never, { heroFocus: "50% 30%", heroZoom: "1.5", gcap_g1: "", gfocus_g1: "50% 100%" });
  const { record: r } = applyEdits(r0, sampleCopy(), built.edits as never);
  assert.equal(r.media.hero!.focus, "50% 30%");
  assert.equal(r.media.hero!.zoomPhone, 1.5);
  assert.equal(r.media.gallery[0]!.focus, "50% 100%");
  // Back to the defaults.
  const off = applyEdits(r, sampleCopy(), { record: { heroFocus: "", heroZoom: null } } as never).record;
  assert.equal(off.media.hero!.focus, undefined);
  assert.equal(off.media.hero!.zoomPhone, undefined);
  const html = String((await buildSite({ record: r, copy: sampleCopy(), site: { slug: "s", look: "salon.blush_hour~circle~h5n2b3s4v4c0f1a1p0t0r0k1d2o0m0q0g0e0u0w0x3y4z2" }, mode: "preview", formEndpoint: "x" })).files.get("index.html"));
  assert.match(html, /src="\/assets\/owner\/hero\.jpg"[^>]*style="object-position:50% 30%;--zoom:1\.5;transform-origin:50% 30%" data-zoom-phone/);
  assert.match(html, /src="\/assets\/owner\/g1\.jpg"[^>]*style="object-position:50% 100%"/);
  // A value set by hand stays selectable.
  const custom = fields({ ...r, media: { ...r.media, hero: { ...r.media.hero!, focus: "50% 38%" } } } as never).find((x) => x.name === "heroFocus") as { options?: Array<{ value: string }> };
  assert.ok(custom.options!.some((o) => o.value === "50% 38%"));
});

test("stock photos: listed in Edit, a ticked one is replaced by the next, and can be turned back on", async () => {
  const r0 = categoryRecord("salon");
  const before = stockPhotosOf(r0);
  assert.ok(before.length >= 2);
  const first = before[0]!.file;
  const f = fields(r0);
  assert.ok(f.some((x) => x.card === "stock" && x.name === `noscene_${first.replace(/\.jpg$/, "")}`));
  const built = editsFromForm({ record: r0, copy: sampleCopy(), ...DETAIL } as never, { [`noscene_${first.replace(/\.jpg$/, "")}`]: true, [`noscene_${before[1]!.file.replace(/\.jpg$/, "")}`]: false });
  const { record: r } = applyEdits(r0, sampleCopy(), built.edits as never);
  assert.deepEqual(r.hiddenScenes, [first]);
  const after = stockPhotosOf(r);
  assert.ok(!after.filter((s) => !s.hidden).some((s) => s.file === first));
  assert.ok(after.some((s) => s.file === first && s.hidden));
  const html = String((await buildSite({ record: r, copy: sampleCopy(), site: { slug: "s", look: "" }, mode: "preview", formEndpoint: "x" })).files.get("index.html"));
  assert.ok(!html.includes(first));
  const back = applyEdits(r, sampleCopy(), { record: { hiddenScenes: [] } } as never).record;
  assert.equal(back.hiddenScenes, undefined);
});

test("a gallery photo picked for the wide strip replaces the stock photo there, even on a design without a strip", async () => {
  const r0 = salonWithPhotos();
  assert.ok(fields(r0).some((x) => x.card === "gallery" && x.name === "gwhere_g1"));
  const built = editsFromForm({ record: r0, copy: sampleCopy(), ...DETAIL } as never, { gcap_g1: "", gwhere_g1: "strip" });
  const { record: r } = applyEdits(r0, sampleCopy(), built.edits as never);
  assert.equal(r.media.gallery[0]!.band, true);
  const look = (z: string) => `salon.blush_hour~circle~h5n2b3s4v4c0f1a1p0t0r0k1d2o0m0q0g0e0u0w0x3y4${z}`;
  for (const z of ["z0", "z1"]) {
    const html = String((await buildSite({ record: r, copy: sampleCopy(), site: { slug: "s", look: look(z) }, mode: "preview", formEndpoint: "x" })).files.get("index.html"));
    const band = html.match(/<div class="pband[^"]*"[^>]*>(.*?)<\/div>/)?.[1] ?? "";
    assert.match(band, /src="\/assets\/owner\/g1\.jpg"/, `strip on ${z}`);
    // It shows in one place only: not in the Photos grid as well.
    assert.equal(html.split('src="/assets/owner/g1.jpg"').length - 1, 1, `once on ${z}`);
  }
  const plain = String((await buildSite({ record: r0, copy: sampleCopy(), site: { slug: "s", look: look("z0") }, mode: "preview", formEndpoint: "x" })).files.get("index.html"));
  assert.ok(!plain.includes('class="pband'));
});

test("photo pickers: swap the main photo and the strip for any stock photo or one of their own, in every category", async () => {
  const { photoPickChoices, sceneLibrary } = await import("../../src/generator/scenes.ts");
  for (const cat of ["restaurant", "contractor", "salon", "auto", "landscaping", "cleaning", "retail", "print", "finance", "church", "general"] as const) {
    const r0 = cat === "restaurant" ? restaurantRecord() : categoryRecord(cat);
    r0.media.hero = undefined;
    const lib = sceneLibrary(r0);
    assert.ok(lib.length >= 4, `${cat} has a library`);
    const f = fields(r0);
    assert.ok(f.some((x) => x.card === "stock" && x.name === "pick_hero"), `${cat} main photo picker`);
    assert.ok(f.some((x) => x.card === "stock" && x.name === "pick_strip"), `${cat} strip picker`);
    const last = lib[lib.length - 1]!.file;
    const built = editsFromForm({ record: r0, copy: sampleCopy(), ...DETAIL } as never, { pick_hero: `s:${last}`, pick_strip: `s:${lib[0]!.file}` });
    const { record: r } = applyEdits(r0, sampleCopy(), built.edits as never);
    assert.deepEqual(r.photoPicks, { hero: last, strip: lib[0]!.file });
    assert.equal(photoPickChoices(r).hero, `s:${last}`);
    const html = String((await buildSite({ record: r, copy: sampleCopy(), site: { slug: "s", look: "" }, mode: "preview", formEndpoint: "x" })).files.get("index.html"));
    assert.ok(html.includes(`/assets/scene/${last}`), `${cat} hero is the picked stock photo`);
    if (lib[0]!.file !== last) assert.ok(html.includes(`/assets/scene/${lib[0]!.file}`), `${cat} strip shows the picked stock photo`);
    // Back to automatic.
    const auto = applyEdits(r, sampleCopy(), { record: { photoPicks: { hero: "", strip: "" } } } as never).record;
    assert.equal(auto.photoPicks, undefined);
  }
  // One of their own photos as the main photo, and as the strip (which clears a stock pick).
  const r1 = salonWithPhotos();
  r1.media.hero = undefined;
  const a = applyEdits(r1, sampleCopy(), { record: { photoPicks: { hero: "g:g1", strip: "g:g1" } } } as never).record;
  assert.equal(a.media.hero!.src, "/assets/owner/g1.jpg");
  assert.equal(a.media.gallery[0]!.band, true);
  // Saving the form without touching the pickers leaves a gallery tick alone.
  const r2 = salonWithPhotos();
  const untouched = editsFromForm({ record: r2, copy: sampleCopy(), ...DETAIL } as never, { gcap_g1: "", gwhere_g1: "strip", pick_strip: "" });
  const b = applyEdits(r2, sampleCopy(), untouched.edits as never).record;
  assert.equal(b.media.gallery[0]!.band, true);
});

test("where a gallery photo shows: one place each, and nowhere when hidden", async () => {
  const r0 = salonWithPhotos();
  r0.media.gallery.push({ src: "/assets/owner/g2.jpg", alt: "Wash", source: "owner", width: 800, height: 600 });
  const look = "salon.blush_hour~circle~h5n2b3s4v4c0f1a1p0t0r0k1d2o0m0q0g0e0u0w0x3y4z0";
  const build = async (vals: Record<string, string>) => {
    const { edits } = editsFromForm({ record: r0, copy: sampleCopy(), ...DETAIL } as never, { gcap_g1: "", gcap_g2: "", ...vals });
    const { record } = applyEdits(r0, sampleCopy(), edits as never);
    return String((await buildSite({ record, copy: sampleCopy(), site: { slug: "s", look }, mode: "preview", formEndpoint: "x" })).files.get("index.html"));
  };
  const count = (html: string, f: string) => html.split(`src="/assets/owner/${f}"`).length - 1;
  const grid = await build({ gwhere_g1: "grid", gwhere_g2: "grid" });
  assert.equal(count(grid, "g1.jpg"), 1);
  const row = await build({ gwhere_g1: "new", gwhere_g2: "grid" });
  assert.match(row, /carousel__track[\s\S]*g1\.jpg/);
  assert.equal(count(row, "g1.jpg"), 1);
  const hidden = await build({ gwhere_g1: "hidden", gwhere_g2: "grid" });
  assert.equal(count(hidden, "g1.jpg"), 0);
  assert.equal(count(hidden, "g2.jpg"), 1);
});

test("words on the main photo: bottom of the photo (cover) or under it (card), on any design", async () => {
  const r0 = salonWithPhotos();
  assert.ok(fields(r0).some((x) => x.card === "photo" && x.name === "heroText"));
  const look = "salon.blush_hour~circle~h0n2b3s4v4c0f1a1p0t0r0k1d2o0m0q0g0e0u0w0x3y4z0";
  for (const [v, hero] of [["bottom", "cover"], ["below", "card"]] as const) {
    const { edits } = editsFromForm({ record: r0, copy: sampleCopy(), ...DETAIL } as never, { heroText: v });
    const { record } = applyEdits(r0, sampleCopy(), edits as never);
    assert.equal(record.heroText, v);
    const html = String((await buildSite({ record, copy: sampleCopy(), site: { slug: "s", look }, mode: "preview", formEndpoint: "x" })).files.get("index.html"));
    assert.match(html, new RegExp(`<html[^>]*data-hero="${hero}"`));
  }
  const off = applyEdits({ ...r0, heroText: "below" }, sampleCopy(), { record: { heroText: "" } } as never).record;
  assert.equal(off.heroText, undefined);
});

test("words position, photo position and shade: saved and on the page", async () => {
  const r0 = salonWithPhotos();
  const f = fields(r0);
  for (const n of ["heroMove", "heroShift", "heroShade"]) assert.ok(f.some((x) => x.card === "photo" && x.name === n), n);
  const { edits } = editsFromForm({ record: r0, copy: sampleCopy(), ...DETAIL } as never, { heroMove: "down", heroShift: "down2", heroShade: "lighter" });
  const { record } = applyEdits(r0, sampleCopy(), edits as never);
  assert.deepEqual([record.heroMove, record.heroShift, record.heroShade], ["down", "down2", "lighter"]);
  const html = String((await buildSite({ record, copy: sampleCopy(), site: { slug: "s", look: "" }, mode: "preview", formEndpoint: "x" })).files.get("index.html"));
  assert.match(html, /<html[^>]*data-hmove="down" data-hshade="lighter" data-hshift="down2"/);
  const off = applyEdits(record, sampleCopy(), { record: { heroMove: "", heroShift: "", heroShade: "" } } as never).record;
  assert.deepEqual([off.heroMove, off.heroShift, off.heroShade], [undefined, undefined, undefined]);
});
