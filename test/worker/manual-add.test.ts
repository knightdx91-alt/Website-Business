import assert from "node:assert/strict";
import { test } from "node:test";
import { isManualPlaceId, manualPlace, townCenter } from "../../src/places/manual.ts";
import { placeToRecord } from "../../src/places/to-record.ts";
import { rentalKind } from "../../src/generator/packs/general.ts";
import { buildSite } from "../../src/generator/render.ts";
import { SEARCH_GROUPS } from "../../src/places/queries.ts";
import { EXPIRE_SQL } from "../../src/worker/expire.ts";
import { sampleCopy } from "../fixtures.ts";

test("rental kinds from names and typed labels", () => {
  assert.equal(rentalKind("Bouncers Inflatable Rentals"), "party_rental");
  assert.equal(rentalKind("Cullman Bounce House and Party Rentals"), "party_rental");
  assert.equal(rentalKind("Luca's Party Jumpers"), "party_rental");
  assert.equal(rentalKind("VIP Rents LLC", "Party & event rentals"), "party_rental");
  assert.equal(rentalKind("Cullman Porta Potty Rentals"), "portable_toilet");
  assert.equal(rentalKind("Thompson Cat Rentals"), null);
  assert.equal(rentalKind("Enterprise Rent-A-Car"), null);
});

test("party rentals search group builds on the catch-all", () => {
  const g = SEARCH_GROUPS.find((x) => x.id === "party_rentals");
  assert.ok(g);
  assert.equal(g.category, "general");
});

test("a typed-in business becomes a stand-in place and a party-rental record", () => {
  const p = manualPlace("abc123", { name: "VIP Rents LLC", phone: "256-708-4558", town: "hanceville", kind: "Party & event rentals", comesToCustomers: true });
  assert.ok(isManualPlaceId(p.id));
  assert.equal(p.nationalPhoneNumber, "(256) 708-4558");
  assert.equal(p.formattedAddress, "Hanceville, AL");
  assert.equal(p.location?.latitude, townCenter("Hanceville").lat);
  const r = placeToRecord(p, "general");
  assert.equal(r.variant, "party_rental");
  assert.equal(r.typeLabel, "Party & event rentals");
  assert.equal(r.address.city, "Hanceville");
  assert.ok(r.serviceArea?.towns.length);
  assert.deepEqual(r.services.map((s) => s.name), ["Bounce houses", "Water slides", "Tents", "Tables & chairs"]);
  assert.ok(r.mapsUrl.includes("google.com/maps/search"));
});

test("a typed-in shop keeps its street and builds a preview with a date form for rentals", async () => {
  const p = manualPlace("x1", { name: "Smith Tent Rentals", phone: "2565550123", town: "Cullman", street: "101 Example St NE", zip: "35055" });
  const r = placeToRecord(p, "general");
  assert.equal(r.address.street, "101 Example St NE");
  assert.equal(r.address.zip, "35055");
  const out = await buildSite({ record: r, copy: sampleCopy(), site: { slug: "t", look: "general.clean_slate" }, mode: "preview" });
  const home = String(out.files.get("index.html"));
  assert.match(home, /Check your date/);
  assert.match(home, /name="event_date"/);
});

test("typed-in leads never expire (nothing in them came from Google)", () => {
  assert.match(EXPIRE_SQL, /place_id NOT LIKE 'manual:%'/);
});

test("a bad phone number is refused", () => {
  assert.throws(() => manualPlace("x", { name: "X", phone: "12", town: "Cullman" }));
});
