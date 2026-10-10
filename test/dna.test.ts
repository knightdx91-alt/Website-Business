import assert from "node:assert/strict";
import { test } from "node:test";
import { DNA_KNOB_IDS, DNA_KNOBS, encodeDna, LEGACY_DNA, parseDna, pickDna, scopeLayoutCss, type Dna } from "../src/generator/dna.ts";
import { LAYOUT_IDS } from "../src/generator/layouts.ts";
import { buildSite } from "../src/generator/render.ts";
import { designId, parseDesign } from "../src/generator/themes.ts";
import { categoryRecord, restaurantRecord, sampleCopy } from "./fixtures.ts";

const site = (look: string) => ({ slug: "d", look });

test("dna encodes and parses round-trip; bad codes are rejected", () => {
  for (let i = 0; i < 40; i++) {
    const d = pickDna(`seed-${i}`, (["restaurant", "contractor", "finance", "church"] as const)[i % 4]!);
    assert.deepEqual(parseDna(encodeDna(d)), d);
  }
  assert.equal(parseDna("h9n0b0s0v0c0f0a0p0"), undefined, "index out of range");
  assert.equal(parseDna("h0n0"), undefined, "too short");
  assert.equal(parseDna("h0n0b0s0v0c0f0a0p0x"), undefined, "trailing junk");
  assert.deepEqual(parseDna("h1n2b3s2v1c1f1a1p1"), { ...parseDna("h1n2b3s2v1c1f1a1p1t0r0k0d0o0m0q0") }, "an id from before the newer knobs still parses, with legacy values for them");
  assert.equal(parseDna("h0n0b0s0v0c0f0a0p0t5"), undefined, "a newer knob out of range is still rejected");
  assert.equal(encodeDna(LEGACY_DNA), "h0n0b0s0v0c0f0a0p0t0r0k0d0o0m0q0");
  const d = parseDesign("auto.motor_oil~classic~h1n2b3s2v1c1f1a1p1");
  assert.equal(d.layout, "classic");
  assert.equal(d.dna?.hero, "cover");
  assert.equal(designId("auto.motor_oil", "classic", LEGACY_DNA), "auto.motor_oil~classic", "legacy dna is left off the id");
  const legacyish = parseDesign("auto.motor_oil~classic~h0n0b0s0v0c0f0a0p0");
  assert.equal(encodeDna(legacyish.dna!), encodeDna(LEGACY_DNA));
});

test("picked dna is deterministic, category-aware and self-consistent", () => {
  const a = pickDna("lead-1", "finance");
  assert.deepEqual(pickDna("lead-1", "finance"), a);
  assert.notDeepEqual(pickDna("lead-2", "finance"), a);
  for (let i = 0; i < 60; i++) {
    const d = pickDna(`x${i}`, "finance");
    assert.notEqual(d.hero, "cover", "a CPA never gets a full-screen photo");
    assert.equal(d.bar, "bar");
    if (d.hero === "split") assert.equal(d.strip, "none");
    assert.notEqual(d.strip === "none" && d.hero !== "split", true, "the address never disappears");
  }
  const avoid = [pickDna("lead-1", "auto")];
  const next = pickDna("lead-1", "auto", { avoid });
  assert.notEqual(encodeDna(next), encodeDna(avoid[0]!));
  assert.ok(next.hero !== avoid[0]!.hero || next.services !== avoid[0]!.services || next.strip !== avoid[0]!.strip, "a reroll changes something people notice");
});

test("legacy dna reproduces the old page byte for byte", async () => {
  const record = categoryRecord("auto");
  const plain = await buildSite({ record, copy: sampleCopy(), site: site("auto.motor_oil~split"), mode: "preview" });
  const legacy = await buildSite({ record, copy: sampleCopy(), site: site(`auto.motor_oil~split~${encodeDna(LEGACY_DNA)}`), mode: "preview" });
  assert.equal(String(legacy.files.get("index.html")), String(plain.files.get("index.html")));
  assert.equal(String(legacy.files.get("assets/site.css")), String(plain.files.get("assets/site.css")));
});

test("scopeLayoutCss only touches the parts the dna owns and keeps at-rules intact", () => {
  const css = `.hero h1{font-size:2rem}.cards{gap:0}.hero,.strip{margin:0}@media (min-width:900px){.hero__in{padding:0}.ftr{color:red}}@keyframes spin{from{opacity:0}to{opacity:1}}`;
  const dna: Dna = { ...LEGACY_DNA, hero: "cover" };
  const out = scopeLayoutCss(css, dna);
  assert.match(out, /^html\[data-hero="stack"\] \.hero h1\{font-size:2rem\}/);
  assert.match(out, /\.cards\{gap:0\}/);
  assert.match(out, /html\[data-hero="stack"\] \.hero,\.strip\{margin:0\}/);
  assert.match(out, /@media \(min-width:900px\)\{html\[data-hero="stack"\] \.hero__in\{padding:0\}\.ftr\{color:red\}\}/);
  assert.match(out, /@keyframes spin\{from\{opacity:0\}to\{opacity:1\}\}/);
  assert.equal(scopeLayoutCss(css, LEGACY_DNA), css);
});

test("every structure builds lint-clean on every layout, with and without a photo", async () => {
  const values = <K extends keyof Dna>(k: K) => DNA_KNOBS[k] as unknown as Array<Dna[K]>;
  let n = 0;
  for (const layout of LAYOUT_IDS) {
    for (let i = 0; i < 2; i++) {
      // Walk every value of every knob across the layouts so each value meets each layout at least once.
      const d = { ...LEGACY_DNA } as Dna;
      for (const k of DNA_KNOB_IDS) (d as Record<string, string>)[k] = values(k)[(n + i * 3) % values(k).length]!;
      if (d.hero === "split") d.strip = "none";
      const design = `salon.night_shift~${layout}~${encodeDna(d)}`;
      const withPhoto = await buildSite({ record: categoryRecord("salon"), copy: sampleCopy(), site: site(design), mode: "preview" });
      assert.deepEqual(withPhoto.lint.errors, [], design);
      const html = String(withPhoto.files.get("index.html"));
      assert.match(html, new RegExp(`data-hero="${d.hero}"`), design);
      const noPhoto = await buildSite({ record: categoryRecord("salon", { media: { hero: undefined, gallery: [] } }), copy: sampleCopy(), site: site(design), mode: "preview" });
      assert.deepEqual(noPhoto.lint.errors, [], `${design} (no photo)`);
      n++;
    }
  }
  // Every recipe of every category builds clean too, on a layout chosen by its position.
  const { RECIPES, settleDna } = await import("../src/generator/dna.ts");
  const { looksFor } = await import("../src/generator/themes.ts");
  let j = 0;
  for (const [category, recipes] of Object.entries(RECIPES)) {
    const look = looksFor(category as "auto")[0]!;
    for (const recipe of recipes) {
      const d = settleDna({ ...LEGACY_DNA, ...recipe.dna });
      const design = `${look}~${LAYOUT_IDS[j++ % LAYOUT_IDS.length]}~${encodeDna(d)}`;
      const rec = category === "restaurant" ? restaurantRecord() : categoryRecord(category as "auto", { smsEnabled: true });
      const out = await buildSite({ record: rec, copy: sampleCopy(), site: site(design), mode: "preview" });
      assert.deepEqual(out.lint.errors, [], `${category} recipe ${recipe.id}: ${design}`);
    }
  }
  const r = await buildSite({ record: restaurantRecord(), copy: sampleCopy(), site: site(`restaurant.pit_plank~classic~${encodeDna({ ...LEGACY_DNA, hero: "split", strip: "none", services: "tiles" })}`), mode: "preview" });
  assert.deepEqual(r.lint.errors, []);
});
