import assert from "node:assert/strict";
import { test } from "node:test";
import { EXAMPLES } from "../../src/examples/examples.ts";
import { dnaCode, editForm, editsFromForm, type EditDetail, type FormValues } from "../../src/worker/editform.ts";
import { applyEdits, EditsSchema } from "../../src/worker/edits.ts";

function detailOf(ex: (typeof EXAMPLES)[number]): EditDetail {
  return {
    record: ex.record,
    copy: ex.copy,
    menuText: "",
    looks: [{ id: ex.design.split("~")[0]!, name: "Look" }],
    layouts: [{ id: "classic", name: "Classic", about: "the usual" }, { id: "split", name: "Split", about: "two columns" }],
    dnaOrder: [{ id: "hero", label: "Opening", letter: "h", values: [{ id: "stack", name: "Stack" }, { id: "cover", name: "Cover" }] }],
    dna: null,
    layout: "classic",
    lookBase: ex.design.split("~")[0]!,
  };
}

function valuesOf(form: ReturnType<typeof editForm>): FormValues {
  const out: FormValues = {};
  for (const card of form.cards) for (const f of card.fields) if (f.name) out[f.name] = f.value ?? "";
  return out;
}

test("every example business gets an edit form whose values round-trip into valid edits", () => {
  for (const ex of EXAMPLES) {
    const d = detailOf(ex);
    const form = editForm(d);
    assert.ok(form.cards.length >= 10, `${ex.slug}: ${form.cards.length} cards`);
    const names = form.cards.flatMap((c) => c.fields.map((f) => f.name).filter(Boolean));
    assert.equal(new Set(names).size, names.length, `${ex.slug}: duplicate field names`);
    assert.ok(form.cards.some((c) => c.id === "text") && form.cards.some((c) => c.id === "confirm") && form.cards.some((c) => c.id === "links"), ex.slug);
    const { edits, warnings } = editsFromForm(d, valuesOf(form));
    assert.deepEqual(warnings, [], ex.slug);
    const parsed = EditsSchema.parse(edits);
    const next = applyEdits(structuredClone(ex.record), structuredClone(ex.copy), parsed);
    assert.equal(next.record.name, ex.record.name, ex.slug);
    assert.equal(next.record.phone.display, ex.record.phone.display, ex.slug);
    assert.deepEqual(next.record.services.map((s) => s.name), ex.record.services.map((s) => s.name), `${ex.slug}: services survive a no-change save`);
    assert.equal(next.copy.heroTagline, ex.copy.heroTagline, ex.slug);
  }
});

test("category cards show up for the right businesses, and typed changes land in the edits", () => {
  const byCat = Object.fromEntries(EXAMPLES.map((ex) => [ex.record.category, ex]));
  const restaurant = byCat.restaurant!;
  const d = detailOf(restaurant);
  const form = editForm(d);
  assert.ok(form.cards.some((c) => c.id === "menu"), "restaurants get a Menu card");
  assert.ok(form.cards.some((c) => c.id === "restaurant"), "restaurants get Restaurant details");
  assert.ok(!form.cards.some((c) => c.id === "services"), "restaurants have no Services card");
  const values = valuesOf(form);
  values.name = "Renamed Diner";
  values.rsCatering = true;
  values.events = "2026-12-24 | Christmas Eve buffet | 11–2 | Reservations recommended";
  values.hiringRoles = "Line cook\nServer";
  values.q0 = "Best catfish in town.";
  values.qn0 = "Amy R.";
  values.approved = false;
  const { edits, warnings } = editsFromForm(d, values);
  assert.deepEqual(warnings, []);
  const e = edits as any;
  assert.equal(e.record.name, "Renamed Diner");
  assert.equal(e.record.restaurant.catering, true);
  assert.deepEqual(e.record.events, [{ title: "Christmas Eve buffet", date: "2026-12-24", time: "11–2", detail: "Reservations recommended" }]);
  assert.deepEqual(e.record.hiring, { roles: ["Line cook", "Server"], how: "" });
  assert.equal(e.record.testimonials[0].quote, "Best catfish in town.");
  assert.equal(e.record.testimonials[0].displayName, "Amy R.");
  assert.equal(e.copy.approved, false);
  EditsSchema.parse(edits);

  const contractor = byCat.contractor!;
  const cd = detailOf(contractor);
  const cform = editForm(cd);
  for (const id of ["contractor", "plans", "guarantee", "offers", "services"]) assert.ok(cform.cards.some((c) => c.id === id), `contractors get ${id}`);
  const cv = valuesOf(cform);
  cv.plan0_name = "Comfort plan";
  cv.plan0_price = "$149";
  cv.plan0_includes = "Two tune-ups\n15% off repairs";
  cv.offers = "Free second opinion | | | On any repair quote\nBad date | X | 12/31/2026 |";
  cv.gWindow = "30 days";
  cv.dna_hero = "cover";
  const built = editsFromForm(cd, cv);
  assert.equal(built.warnings.length, 1, "the offer with a bad date is reported, not saved");
  const ce = built.edits as any;
  assert.deepEqual(ce.record.plans, [{ name: "Comfort plan", price: "$149", unit: "", badge: "", note: "", includes: ["Two tune-ups", "15% off repairs"] }]);
  assert.deepEqual(ce.record.offers, [{ title: "Free second opinion", detail: "On any repair quote" }]);
  assert.equal(ce.record.guarantee.window, "30 days");
  assert.ok(String(ce.look).endsWith("~h1"), ce.look);
  EditsSchema.parse(built.edits);
});

test("dnaCode is empty for all-classic picks and encodes the rest in order", () => {
  const order = [
    { id: "hero", label: "Opening", letter: "h", values: [{ id: "stack", name: "" }, { id: "cover", name: "" }] },
    { id: "nav", label: "Top bar", letter: "n", values: [{ id: "bar", name: "" }, { id: "utility", name: "" }] },
  ];
  assert.equal(dnaCode({ dna_hero: "stack", dna_nav: "bar" }, order), "");
  assert.equal(dnaCode({ dna_hero: "cover" }, order), "~h1n0");
  assert.equal(dnaCode({ dna_hero: "stack", dna_nav: "utility" }, order), "~h0n1");
});
