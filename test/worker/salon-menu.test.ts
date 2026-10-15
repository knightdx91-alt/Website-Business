import assert from "node:assert/strict";
import test from "node:test";
import { directionsUrl } from "../../src/generator/actions.ts";
import { buildSite } from "../../src/generator/render.ts";
import { applyEdits } from "../../src/worker/edits.ts";
import { editForm, editsFromForm } from "../../src/worker/editform.ts";
import { categoryRecord, sampleCopy } from "../fixtures.ts";

const LINES = [
  "# Color | Any lightening service adds an Olaplex treatment ($40).",
  "All over color / glaze | $110+",
  "Root bleach | $110",
  "# Nails",
  "Regular manicure | $20",
  "French tip | +$5",
  "# Facials & peels",
  "Chemical peel packages | consult",
];

test("a grouped salon menu: groups, notes, $110+, add-ons; it round-trips through the editor", async () => {
  const r0 = categoryRecord("salon");
  const { record: r } = applyEdits(r0, sampleCopy(), { record: { services: LINES } } as never);
  assert.deepEqual(r.services.map((s) => [s.group, s.name]), [
    ["Color", "All over color / glaze"], ["Color", "Root bleach"], ["Nails", "Regular manicure"], ["Nails", "French tip"], ["Facials & peels", "Chemical peel packages"],
  ]);
  assert.equal(r.serviceNotes?.Color, "Any lightening service adds an Olaplex treatment ($40).");
  const html = String((await buildSite({ record: r, copy: sampleCopy(), site: { slug: "s", look: "" }, mode: "preview", formEndpoint: "x" })).files.get("index.html"));
  assert.match(html, /class="smenu__nav"[^]*href="#grp-color">Color<\/a>[^]*href="#grp-facials-peels"/);
  assert.match(html, /All over color \/ glaze<\/span><span class="smenu__dots"[^>]*><\/span><span class="smenu__pr">\$110\+<\/span>/);
  assert.match(html, /French tip<\/span>[^]*?<span class="smenu__pr">\+\$5<\/span>/);
  assert.match(html, /Price at consultation/);
  assert.match(html, /class="smenu__note">Any lightening service adds an Olaplex treatment/);
  // The editor shows the same lines back.
  const form = editForm({ record: r, copy: sampleCopy(), menuText: "", looks: [], layouts: [], dnaOrder: [], dna: null, layout: "classic", lookBase: "" } as never);
  const svc = form.cards.flatMap((c) => c.fields).find((f) => (f as { name?: string }).name === "services") as { value: string };
  assert.equal(svc.value.split("\n").slice(0, 3).join("\n"), "# Color | Any lightening service adds an Olaplex treatment ($40).\nAll over color / glaze | from $110\nRoot bleach | $110");
  assert.match(svc.value, /French tip \| \+\$5/);
});

test("a new address: the site uses it and directions stop pointing at Google's old pin", () => {
  const r0 = categoryRecord("salon");
  assert.match(directionsUrl(r0), /query_place_id=/);
  const same = applyEdits(r0, sampleCopy(), { record: { address: { street: r0.address.street ?? "", city: r0.address.city, zip: r0.address.zip ?? "" } } } as never).record;
  assert.equal(same.addressEdited, undefined);
  const { record: r } = applyEdits(r0, sampleCopy(), { record: { address: { street: "1705 Co Rd 520", city: "Hanceville", zip: "35077" } } } as never);
  assert.equal(r.address.street, "1705 Co Rd 520");
  assert.equal(r.addressEdited, true);
  assert.doesNotMatch(directionsUrl(r), /query_place_id/);
  assert.match(directionsUrl(r), /1705%20Co%20Rd%20520%2C%20Hanceville%2C%20AL%2035077/);
  // From the app's editor form too.
  const built = editsFromForm({ record: r0, copy: sampleCopy(), menuText: "", looks: [], layouts: [], dnaOrder: [], dna: null, layout: "classic", lookBase: "" } as never, { addrStreet: "1705 Co Rd 520", addrCity: "Hanceville", addrZip: "35077" });
  assert.deepEqual((built.edits as { record: { address: unknown } }).record.address, { street: "1705 Co Rd 520", city: "Hanceville", zip: "35077" });
});
