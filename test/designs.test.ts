import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { FONTS } from "../src/generator/fonts.ts";
import { LAYOUT_IDS, LAYOUTS } from "../src/generator/layouts.ts";
import { packFor } from "../src/generator/packs/index.ts";
import { buildSite } from "../src/generator/render.ts";
import { LOOKS, looksFor, resolveTheme } from "../src/generator/themes.ts";
import type { CategoryId } from "../src/generator/types.ts";
import { categoryRecord, restaurantRecord, sampleCopy } from "./fixtures.ts";

const CATEGORIES: CategoryId[] = ["restaurant", "contractor", "salon", "auto", "landscaping", "cleaning", "print", "retail", "finance", "church"];
const recordFor = (c: CategoryId) => (c === "restaurant" ? restaurantRecord() : categoryRecord(c));

test("25 layouts, each with a name and blurb", () => {
  assert.equal(LAYOUT_IDS.length, 25);
  assert.equal(new Set(Object.values(LAYOUTS).map((l) => l.name)).size, 25, "layout names are unique");
  for (const id of LAYOUT_IDS) assert.ok(LAYOUTS[id].name && LAYOUTS[id].about, id);
});

test("25 looks per category, all different, all passing contrast", () => {
  for (const c of CATEGORIES) {
    const looks = looksFor(c);
    assert.equal(looks.length, 25, `${c} has ${looks.length} looks`);
    assert.deepEqual([...packFor(c).looks].sort(), [...looks].sort(), `${c} pack offers every look`);
    const defs = looks.map((id) => LOOKS[id]!);
    assert.equal(new Set(defs.map((l) => l.name)).size, 25, `${c}: look names are unique`);
    assert.equal(new Set(defs.map((l) => l.fonts.heading.pkg)).size, 25, `${c}: every look has its own heading font`);
    assert.equal(new Set(defs.map((l) => `${l.palette.bg}|${l.palette.primary}`)).size, 25, `${c}: every look has its own colors`);
    for (const l of defs) {
      assert.ok(l.id.startsWith(`${c}.`) && l.category === c, l.id);
      assert.doesNotThrow(() => resolveTheme(l.id), l.id);
    }
  }
});

test("every font weight a look uses is installed", () => {
  for (const l of Object.values(LOOKS)) {
    for (const font of [l.fonts.heading, l.fonts.body]) {
      const meta = FONTS[font.pkg as keyof typeof FONTS];
      assert.ok(meta, `${l.id}: ${font.pkg} isn't in fonts.ts`);
      assert.equal(font.family, meta.family, `${l.id}: family name for ${font.pkg}`);
      for (const w of font.weights) assert.ok(existsSync(`node_modules/@fontsource/${font.pkg}/files/${font.pkg}-latin-${w}-normal.woff2`), `${l.id}: ${font.pkg} ${w}`);
    }
    assert.ok(l.fonts.heading.weights.includes(l.headingWeight), `${l.id}: heading weight ${l.headingWeight} is loaded`);
  }
});

test("looks and layouts build lint-clean together", async () => {
  // Every look in 3 layouts and every layout with every category, rotating so the combinations spread out.
  let n = 0;
  for (const c of CATEGORIES) {
    const looks = looksFor(c);
    for (let i = 0; i < looks.length; i++) {
      for (const j of [i, i + 9, i + 17]) {
        const design = `${looks[i]}~${LAYOUT_IDS[(j + n) % LAYOUT_IDS.length]}`;
        const out = await buildSite({ record: recordFor(c), copy: sampleCopy(), site: { slug: "d", look: design }, mode: "preview" });
        assert.equal(out.look, design);
        assert.deepEqual(out.lint.errors, [], design);
      }
    }
    n += 3;
  }
  for (const layout of LAYOUT_IDS) {
    for (const look of ["salon.night_shift", "contractor.clear_air", "restaurant.pit_plank"]) {
      const design = `${look}~${layout}`;
      const out = await buildSite({ record: recordFor(LOOKS[look]!.category), copy: sampleCopy(), site: { slug: "d", look: design }, mode: "preview" });
      assert.deepEqual(out.lint.errors, [], design);
      if (layout !== "classic") assert.ok(String(out.files.get("assets/site.css")).includes(`/* layout: ${layout} */`), design);
    }
  }
});
