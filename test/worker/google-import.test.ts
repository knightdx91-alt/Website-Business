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

test("the Google import puts every listing photo in the gallery for the preview only; publish leaves them out", async () => {
  const { galleryFromPlace } = await import("../../src/worker/google-import.ts");
  const { buildSite } = await import("../../src/generator/render.ts");
  const { sampleCopy } = await import("../fixtures.ts");
  const photos = Array.from({ length: 6 }, (_, i) => ({ name: `places/x/photos/p${i}`, widthPx: 4000, heightPx: 3000, authorAttributions: [{ displayName: "A Fan", uri: "https://maps.google.com/u" }] }));
  const r = restaurantRecord({ media: { gallery: [{ src: "/assets/owner/g1.jpg", alt: "Plate", source: "owner" }] } });
  r.media.hero = { src: "/assets/img/hero.jpg", alt: "", source: "google" };
  assert.equal(galleryFromPlace(r, place({ photos } as never)), 5, "the hero photo is skipped");
  assert.equal(r.media.gallery.length, 6);
  assert.equal(r.media.gallery[0]!.src, "/assets/owner/g1.jpg", "owner photos stay first");
  assert.equal(r.media.gallery[1]!.src, "/assets/img/google-1.jpg");
  assert.equal(r.media.gallery[5]!.src, "/assets/img/google-5.jpg");
  assert.equal(r.media.gallery[1]!.width, 1600);
  assert.equal(r.media.gallery[1]!.height, 1200);
  assert.equal(galleryFromPlace(r, place({ photos } as never)), 5, "a second import replaces, never doubles");
  assert.equal(r.media.gallery.length, 6);
  const church = restaurantRecord({ category: "church" as never });
  assert.equal(galleryFromPlace(church, place({ photos } as never)), 0);

  const site = { slug: "t", look: "restaurant.garden_table" };
  const prev = String((await buildSite({ record: r, copy: sampleCopy(), site, mode: "preview" })).files.get("index.html"));
  assert.equal((prev.match(/\/assets\/img\/google-\d\.jpg/g) ?? []).length, 5, "the preview shows them");
  assert.match(prev, /Send us your own photos/);
  const pubRecord = { ...r, confirmed: ["name", "phone", "address", "hours"] as never, media: { ...r.media, hero: { src: "/assets/owner/h.jpg", alt: "front", source: "owner" as const } } };
  const pub = await buildSite({ record: pubRecord, copy: sampleCopy({ approved: true }), site: { ...site, origin: "https://x.pages.dev" }, mode: "publish" }).catch((e: Error) => e);
  const html = pub instanceof Error ? "" : String(pub.files.get("index.html"));
  assert.ok(!(pub instanceof Error) || !/Google photos must be replaced/.test(pub.message), "Google gallery photos never block publishing");
  if (!(pub instanceof Error)) {
    assert.doesNotMatch(html, /\/assets\/img\/google-/, "and never print on the live site");
    assert.match(html, /\/assets\/owner\/g1\.jpg/, "the owner photo stays");
  }
});
