import assert from "node:assert/strict";
import { test } from "node:test";
import { guessCategory } from "../src/places/qualify.ts";
import { placeToRecord } from "../src/places/to-record.ts";
import { storeKind } from "../src/generator/packs/general.ts";
import { retailVariant } from "../src/generator/packs/retail.ts";

const place = (name: string, primaryType: string, types: string[]) =>
  ({ id: "x", displayName: { text: name }, primaryType, types, formattedAddress: "1 Main St, Falkville, AL 35622, USA", nationalPhoneNumber: "(256) 555-0142" }) as never;

test("dry cleaners and laundries are a storefront, not house cleaning", () => {
  const p = place("L & L Dry Cleaners and Laundry", "laundry", ["laundry", "point_of_interest"]);
  assert.equal(guessCategory(p), "general");
  assert.equal(guessCategory(place("Main Street Laundromat", "laundry", ["laundry"])), "general");
  assert.equal(guessCategory(place("Sparkle Cleaning Service", "point_of_interest", [])), "cleaning");
  assert.equal(storeKind("L & L Dry Cleaners and Laundry"), "dry_cleaner");
  assert.equal(storeKind("Sparkle Cleaning Service"), null);
  const r = placeToRecord(p, "general");
  assert.equal(r.typeLabel, "Dry Cleaner & Laundry");
  assert.ok(r.services.some((s) => /dry cleaning/i.test(s.name)));
});

test("animal health and farm supply stores are farm & feed, not gift shops", () => {
  assert.equal(retailVariant("store", ["store", "food"], "Falkville Animal Health, LLC"), "farm_feed");
  assert.equal(retailVariant("store", ["store"], "Cullman Livestock Supply"), "farm_feed");
  assert.equal(retailVariant("store", ["store"], "Rosie's Gifts"), "gift");
  assert.equal(guessCategory(place("Falkville Animal Health, LLC", "store", ["store", "food"])), "retail");
});
