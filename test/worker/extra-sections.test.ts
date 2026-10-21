import assert from "node:assert/strict";
import { test } from "node:test";
import { EXAMPLES } from "../../src/examples/examples.ts";
import { buildSite } from "../../src/generator/render.ts";
import { editForm, editsFromForm, type EditDetail, type FormValues } from "../../src/worker/editform.ts";
import { applyEdits, EditsSchema } from "../../src/worker/edits.ts";

const shop = EXAMPLES.find((e) => e.record.category === "retail")!;
const detail = (record = shop.record): EditDetail => ({
  record,
  copy: shop.copy,
  menuText: "",
  looks: [{ id: shop.design.split("~")[0]!, name: "Look" }],
  layouts: [{ id: "classic", name: "Classic", about: "" }],
  dnaOrder: [],
  dna: null,
  layout: "classic",
  lookBase: shop.design.split("~")[0]!,
});
const valuesOf = (d: EditDetail): FormValues => {
  const out: FormValues = {};
  for (const c of editForm(d).cards) for (const f of c.fields) if (f.name) out[f.name] = f.value ?? "";
  return out;
};
const grabBag = {
  label: "Giving back",
  title: "$5 grab bags",
  body: "Bags packed full of clothes for $5.\n\nOur way of giving back to Hanceville.",
  button: "directions" as const,
};

test("Extra sections: the Edit card's values become a section before the closing call, and an empty heading removes it", async () => {
  const values = valuesOf(detail());
  assert.equal(values.xs1Title, "", "the card is there, empty");
  const photo = shop.record.media.gallery.find((p) => p.source !== "google")?.src;
  Object.assign(values, { xs1Title: grabBag.title, xs1Label: grabBag.label, xs1Body: grabBag.body, xs1Btn: "directions", xs1Photo: photo ?? "" });
  const { edits } = editsFromForm(detail(), values);
  const next = applyEdits(structuredClone(shop.record), structuredClone(shop.copy), EditsSchema.parse(edits));
  assert.deepEqual(next.record.extraSections, [{ ...grabBag, ...(photo ? { image: photo } : {}) }]);

  const out = await buildSite({ record: next.record, copy: shop.copy, site: { slug: shop.slug, look: shop.design, origin: "https://example.test" }, mode: "publish", allowSamples: true });
  const home = String(out.files.get("index.html"));
  const at = home.indexOf('id="extra1"');
  assert.ok(at > 0, "section rendered");
  assert.ok(at < home.indexOf('<section class="cta'), "before the closing call");
  assert.match(home, /\$5 grab bags/);
  assert.match(home, /<p>Our way of giving back to Hanceville\.<\/p>/, "a blank line starts a new paragraph");
  assert.match(home.slice(at, at + 3000), /Get directions/);
  if (photo) assert.ok(home.slice(at, at + 3000).includes(photo.split("/").pop()!), "the photo sits beside the words");

  const again = valuesOf(detail(next.record));
  assert.equal(again.xs1Title, grabBag.title, "the card shows what was saved");
  again.xs1Title = "";
  const cleared = applyEdits(structuredClone(next.record), structuredClone(shop.copy), EditsSchema.parse(editsFromForm(detail(next.record), again).edits));
  assert.equal(cleared.record.extraSections, undefined);
});
