import assert from "node:assert/strict";
import { test } from "node:test";
import { refreshFromPlace } from "../../src/worker/google-import.ts";
import type { Place } from "../../src/places/client.ts";
import { restaurantRecord } from "../fixtures.ts";

const place = (over: Partial<Place> = {}): Place =>
  ({ id: "x", displayName: { text: "Sample Smokehouse" }, nationalPhoneNumber: "(256) 555-0199", rating: 4.8, userRatingCount: 212, primaryTypeDisplayName: { text: "Barbecue Restaurant" },
     regularOpeningHours: { periods: [{ open: { day: 1, hour: 11, minute: 0 }, close: { day: 1, hour: 20, minute: 0 } }] },
     paymentOptions: { acceptsCreditCards: true, acceptsDebitCards: true, acceptsNfc: true }, parkingOptions: { freeParkingLot: true },
     websiteUri: "https://www.facebook.com/samplesmokehouse", delivery: true, ...over }) as unknown as Place;

test("Google import refreshes the listing's facts but never what the owner confirmed", () => {
  const r = restaurantRecord();
  const changed = refreshFromPlace(r, place());
  assert.equal(r.phone.e164, "+12565550199");
  assert.equal(r.reputation.rating, 4.8);
  assert.equal(r.reputation.count, 212);
  assert.equal(r.typeLabel, "Barbecue Restaurant");
  assert.deepEqual(r.visit?.paymentMethods, ["Credit cards", "Debit cards", "Tap to pay"]);
  assert.equal(r.visit?.parking, "Free parking lot");
  assert.equal(r.ext.restaurant?.serviceOptions.delivery, true, "new Google flags merge in");
  assert.equal(r.ext.restaurant?.serviceOptions.dineIn, true, "old flags stay");
  assert.ok(r.googleImportedAt);
  for (const w of ["phone", "hours", "Google rating", "business type", "ways to pay", "parking", "service options"]) assert.ok(changed.includes(w), w);
  assert.ok(!changed.includes("Facebook page"), "the fixture already links Facebook");

  const kept = restaurantRecord({ confirmed: ["phone", "hours"] as never, visit: { paymentMethods: ["Cash"], parking: "Out front" } });
  const before = { phone: kept.phone.e164, hours: JSON.stringify(kept.hours) };
  const ch2 = refreshFromPlace(kept, place());
  assert.equal(kept.phone.e164, before.phone, "confirmed phone untouched");
  assert.equal(JSON.stringify(kept.hours), before.hours, "confirmed hours untouched");
  assert.deepEqual(kept.visit?.paymentMethods, ["Cash"], "owner's payment list wins");
  assert.equal(kept.visit?.parking, "Out front");
  assert.ok(!ch2.includes("phone") && !ch2.includes("hours") && !ch2.includes("ways to pay"));

  const cashOnly = restaurantRecord();
  refreshFromPlace(cashOnly, place({ paymentOptions: { acceptsCashOnly: true, acceptsCreditCards: false } }));
  assert.deepEqual(cashOnly.visit?.paymentMethods, ["Cash only"]);
  const noFb = restaurantRecord({ links: { social: {} } as never });
  assert.ok(refreshFromPlace(noFb, place()).includes("Facebook page"));
  assert.equal(noFb.links.social.facebook, "https://www.facebook.com/samplesmokehouse");
});
