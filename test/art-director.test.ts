import assert from "node:assert/strict";
import { test } from "node:test";
import type Anthropic from "@anthropic-ai/sdk";
import { catalogFor, colorName, directDesign, settlePick, type DirectorInput } from "../src/copy/art-director.ts";
import { LEGACY_DNA, RECIPES } from "../src/generator/dna.ts";
import { LAYOUT_IDS } from "../src/generator/layouts.ts";
import { packFor } from "../src/generator/packs/index.ts";
import { looksFor, parseDesign } from "../src/generator/themes.ts";
import { categoryRecord, restaurantRecord } from "./fixtures.ts";

const pick = (over: Partial<Parameters<typeof settlePick>[0]> = {}): Parameters<typeof settlePick>[0] => ({
  look: "restaurant.pit_plank",
  alsoGood: ["restaurant.blue_plate"],
  layout: "poster",
  recipe: "marquee",
  knobs: [{ knob: "align", value: "center" }],
  concept: "A chalkboard menu board",
  why: "Your reviews are all about the plate lunches, so the menu leads.",
  copyNotes: "Warm, plain-spoken; lead with the Friday supper; headline under 6 words.",
  ...over,
});

const input = (over: Partial<DirectorInput> = {}): DirectorInput => ({
  record: restaurantRecord(),
  looks: looksFor("restaurant"),
  preferred: "restaurant.blue_plate",
  used: [],
  taken: [],
  reviews: ["Best plate lunch in town, the biscuits are huge."],
  hints: { noPhoto: false, proof: false },
  seed: "lead-1",
  ...over,
});

test("the catalog names every look, layout, recipe and knob value of the category in plain words", () => {
  const text = catalogFor("restaurant");
  for (const id of looksFor("restaurant")) assert.ok(text.includes(`${id} ·`), id);
  for (const id of LAYOUT_IDS) assert.ok(text.includes(`${id} ·`), id);
  for (const r of RECIPES.restaurant) assert.ok(text.includes(`${r.id} · ${r.name}`), r.id);
  assert.match(text, /services \(Services\): .*bento=Bento grid/);
  assert.match(text, /align \(Opening text\): start=Left, center=Centered/);
  assert.match(text, /headings Alfa Slab One \(slab 400\)/, "fonts are described by kind");
  assert.match(text, /Photo direction: /);
  assert.doesNotMatch(catalogFor("finance"), /restaurant\./, "a category's catalog holds only its own looks");
  assert.equal(colorName("#B5381F"), "red");
  assert.equal(colorName("#1F1B18"), "black");
  assert.equal(colorName("#F2E8D5"), "cream");
  assert.equal(colorName("#14213d"), "navy");
  assert.equal(colorName("#C9A227"), "gold");
  assert.equal(colorName("#FFFFFF"), "white");
  assert.equal(colorName("#6b7280"), "gray");
});

test("a good pick becomes exactly that design: look, layout, recipe knobs and the extra knob, settled", () => {
  const { design, fixes } = settlePick(pick(), input());
  assert.deepEqual(fixes, []);
  const d = parseDesign(design);
  assert.equal(d.look, "restaurant.pit_plank");
  assert.equal(d.layout, "poster");
  assert.equal(d.dna?.hero, "cover", "from the marquee recipe");
  assert.equal(d.dna?.strip, "marquee");
  assert.equal(d.dna?.services, "bento");
  assert.equal(d.dna?.align, "center");
  // Deterministic for the same seed; the open knobs come from the seed, not from chance.
  assert.equal(settlePick(pick(), input()).design, design);
  assert.notEqual(settlePick(pick(), input({ seed: "lead-2" })).design, design, "another seed opens other knobs");
});

test("bad ids never leave the catalog: taken looks fall to the alternates, junk falls to the defaults, and the hints win", () => {
  // A paying client already has Pit & Plank: the second choice is used.
  let r = settlePick(pick(), input({ taken: ["restaurant.pit_plank~poster"] }));
  assert.equal(parseDesign(r.design).look, "restaurant.blue_plate");
  assert.deepEqual(r.fixes, ["look restaurant.pit_plank → restaurant.blue_plate"]);
  // Nothing usable: the pack's best fit, else a seeded free look.
  r = settlePick(pick({ look: "restaurant.nope", alsoGood: ["salon.night_shift", "auto.motor_oil"] }), input());
  assert.equal(parseDesign(r.design).look, "restaurant.blue_plate");
  r = settlePick(pick({ look: "restaurant.nope", alsoGood: [] }), input({ preferred: undefined, taken: ["restaurant.blue_plate"] }));
  assert.ok(looksFor("restaurant").includes(parseDesign(r.design).look));
  assert.notEqual(parseDesign(r.design).look, "restaurant.blue_plate");
  // Unknown layout → the look's own; unknown recipe and knobs dropped, each named in fixes.
  r = settlePick(pick({ layout: "sideways", recipe: "nope", knobs: [{ knob: "hero", value: "giant" }, { knob: "color", value: "red" }, { knob: "services", value: "list" }] }), input());
  const d = parseDesign(r.design);
  assert.equal(d.layout, "poster", "Pit & Plank's default layout");
  assert.equal(d.dna?.services, "list");
  assert.deepEqual(r.fixes, ["layout sideways → poster", "recipe nope dropped", "knob hero=giant dropped", "knob color=red dropped"]);
  // No owner photo: a photo-led opening is replaced by a type-led one, whatever the model said.
  r = settlePick(pick({ recipe: "", knobs: [{ knob: "hero", value: "cover" }] }), input({ hints: { noPhoto: true } }));
  assert.ok(["statement", "billboard", "banner"].includes(parseDesign(r.design).dna!.hero));
  assert.match(r.fixes.join(";"), /hero → (statement|billboard|banner) \(no owner photo\)/);
  // Owner proof: the band, even when the model picked inline.
  r = settlePick(pick({ knobs: [{ knob: "proof", value: "inline" }] }), input({ hints: { proof: true } }));
  assert.equal(parseDesign(r.design).dna?.proof, "band");
  // Every category's pack looks are accepted (the director is used for every pack).
  for (const cat of ["contractor", "salon", "auto", "finance", "church", "general"] as const) {
    const looks = packFor(cat).looks;
    const out = settlePick(pick({ look: looks[3]!, alsoGood: [], layout: "classic", recipe: "", knobs: [] }), input({ record: categoryRecord(cat), looks, preferred: looks[0] }));
    assert.equal(parseDesign(out.design).look, looks[3]);
  }
});

test("directDesign sends the cached catalog and the business facts, and returns validated notes; a refusal throws", async () => {
  const calls: Array<Record<string, unknown>> = [];
  const fake = (answer: unknown, stop = "end_turn") =>
    ({
      beta: {
        messages: {
          parse: async (req: Record<string, unknown>) => {
            calls.push(req);
            return { stop_reason: stop, parsed_output: answer, content: [], usage: { input_tokens: 3200, output_tokens: 180 } };
          },
        },
      },
    }) as unknown as Anthropic;
  const i = input({ used: ["restaurant.blue_plate~classic~h1n0b0s2v0c0f0a0p0t0r0k0d0o0m0q0g0"], taken: ["restaurant.pit_plank~poster"], current: "restaurant.pit_plank~poster" });
  const res = await directDesign(fake(pick()), i);
  assert.equal(calls.length, 1);
  const req = calls[0]!;
  assert.equal(req.model, "claude-opus-5-5");
  const system = req.system as Array<{ text: string; cache_control?: unknown }>;
  assert.equal(system.length, 2);
  assert.match(system[0]!.text, /art director/);
  assert.match(system[1]!.text, /<catalog category="restaurant">/);
  assert.ok(system[1]!.cache_control, "the catalog block is cached across a run");
  const user = (req.messages as Array<{ content: string }>)[0]!.content;
  assert.match(user, /name: Sample/);
  assert.match(user, /google rating: /);
  assert.match(user, /taken \(never\): Pit & Plank/);
  assert.match(user, /in use nearby \(prefer others\): looks Blue Plate; openings cover/);
  assert.match(user, /replacing: Pit & Plank with a stack opening/);
  assert.match(user, /what reviews praise/);
  assert.equal((req.output_config as { effort: string }).effort, "low");
  // Pit & Plank is taken (it is the current design), so the alternate was used and the fix is on record.
  assert.equal(parseDesign(res.design).look, "restaurant.blue_plate");
  assert.deepEqual(res.notes.fixes, ["look restaurant.pit_plank → restaurant.blue_plate"]);
  assert.equal(res.notes.concept, "A chalkboard menu board");
  assert.match(res.notes.why, /plate lunches/);
  assert.match(res.notes.copyNotes!, /Friday supper/);
  assert.match(res.notes.model, /^claude-opus-5-5\/v\d+$/);
  assert.match(res.notes.at, /^\d{4}-\d\d-\d\d \d\d:\d\d$/);
  assert.deepEqual(res.usage, { input: 3200, output: 180 });
  await assert.rejects(directDesign(fake(undefined, "refusal"), i), /declined/);
  await assert.rejects(directDesign(fake(undefined, "max_tokens"), i), /didn't match/);
  // Legacy knobs stay legacy unless the recipe or the model sets them (the base roll never produces a legacy-only id by accident).
  assert.ok(parseDesign(res.design).dna, "a full dna id");
  assert.notDeepEqual(parseDesign(res.design).dna, LEGACY_DNA);
});
