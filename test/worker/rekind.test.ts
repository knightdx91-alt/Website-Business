import assert from "node:assert/strict";
import { test } from "node:test";
import { restaurantVariant } from "../../src/generator/packs/restaurant.ts";
import { guessCategory, isDealerName } from "../../src/places/qualify.ts";
import { placeToRecord } from "../../src/places/to-record.ts";
import { carryOver } from "../../src/worker/pipeline.ts";
import { restaurantRecord } from "../fixtures.ts";
import type { Place } from "../../src/places/client.ts";

const place = (name: string, primaryType: string, types: string[] = [primaryType]): Place =>
  ({ id: "x", displayName: { text: name }, primaryType, types, formattedAddress: "1 Main St, Cullman, AL 35055", addressComponents: [], location: { latitude: 34.17, longitude: -86.84 }, nationalPhoneNumber: "(256) 555-0100", internationalPhoneNumber: "+1 256-555-0100" }) as unknown as Place;

test("a truck or car lot is a dealer (general pack), never a food truck or a repair shop", () => {
  assert.ok(isDealerName("Barbee Truck Sales"));
  assert.ok(isDealerName("Cullman Motors"));
  assert.ok(isDealerName("Hanceville Used Cars"));
  assert.ok(!isDealerName("Big Daddy's Taco Truck"));
  assert.ok(!isDealerName("Joe's Truck Repair"));
  assert.equal(guessCategory(place("Barbee Truck Sales", "car_dealer")), "general");
  assert.equal(guessCategory(place("Smith Motors", "car_dealer")), "general");
  assert.equal(guessCategory(place("Big Daddy's Taco Truck", "food_truck")), "restaurant");
  assert.equal(guessCategory(place("Joe's Truck Repair", "car_repair")), "auto");
  assert.equal(restaurantVariant("car_dealer", [], "Barbee Truck Sales"), "other", "if forced into the restaurant pack it is still not a food truck");
  assert.equal(restaurantVariant("restaurant", [], "Big Daddy's Taco Truck"), "food_truck");
  assert.equal(restaurantVariant("food_truck", [], "Rolling Smoke"), "food_truck");
});

test("rebuilding as another kind keeps what the owner gave us and drops the old pack's sections", () => {
  const old = restaurantRecord({
    email: "hi@example.com",
    foundedYear: 1998,
    smsEnabled: true,
    links: { social: { facebook: "https://facebook.com/x" }, order: "https://order.example.com" } as never,
    proof: { awards: [{ name: "Best of Cullman", year: 2025 }] } as never,
    confirmed: ["name", "phone", "services", "site_photos"] as never,
  });
  old.media.hero = { src: "owner/x/h.jpg", alt: "front", source: "owner" } as never;
  old.media.gallery = [{ src: "owner/x/g1.jpg", alt: "a", source: "owner" }, { src: "g", alt: "b", source: "google" }] as never;
  old.ext.retail = { priceList: { sections: [{ name: "Lot", items: [{ name: "2019 F-150", price: "$24,500" }] }] } } as never;
  const fresh = carryOver(placeToRecord(place(old.name, "car_dealer"), "general"), old);
  assert.equal(fresh.category, "general");
  assert.equal(fresh.name, old.name);
  assert.equal(fresh.email, "hi@example.com");
  assert.equal(fresh.foundedYear, 1998);
  assert.equal(fresh.smsEnabled, true);
  assert.equal(fresh.links.order, "https://order.example.com");
  assert.equal(fresh.links.social.facebook, "https://facebook.com/x");
  assert.equal(fresh.media.hero?.src, "owner/x/h.jpg", "owner photo stays");
  assert.deepEqual(fresh.media.gallery.map((g) => g.src), ["owner/x/g1.jpg"], "Google photos are not carried");
  assert.equal(fresh.proof?.awards?.[0]?.name, "Best of Cullman");
  assert.equal(fresh.ext.retail?.priceList?.sections[0]?.name, "Lot", "the price list carries over");
  assert.equal(fresh.ext.restaurant, undefined, "no menu, no restaurant sections");
  assert.deepEqual(fresh.confirmed, ["name", "phone", "site_photos"], "pack-specific confirmations are dropped");
});
