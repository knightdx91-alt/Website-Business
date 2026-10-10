import assert from "node:assert/strict";
import { test } from "node:test";
import { parseMenuText } from "../../src/generator/menu.ts";
import { seedSalonServices } from "../../src/generator/packs/salon.ts";
import type { BusinessRecord } from "../../src/generator/types.ts";
import { applyEdits, EditsSchema } from "../../src/worker/edits.ts";
import { requestSummary } from "../../src/worker/forms.ts";
import { categoryRecord, restaurantRecord, sampleCopy } from "../fixtures.ts";

const copy = sampleCopy();
const apply = (r: BusinessRecord, record: Record<string, unknown>) => applyEdits(structuredClone(r), copy, EditsSchema.parse({ record })).record;

test("owner proof, closures and visit lines round-trip; empties clear", () => {
  const r = restaurantRecord();
  const a = apply(r, {
    proof: { awards: [{ name: "Best of the Best", year: "2025" }, { name: "Readers' Choice" }], memberships: ["Cullman Chamber"], clients: ["Wallace State"], stats: [{ value: "40", label: "booths" }] },
    closures: [{ date: "2026-11-26", label: "Thanksgiving" }],
    visit: { paymentMethods: ["Cash", "Visa"], parking: "Lot out back." },
    links: { giftCards: "https://squareup.com/gift/x" },
  });
  assert.deepEqual(a.proof, { awards: [{ name: "Best of the Best", year: "2025" }, { name: "Readers' Choice" }], memberships: ["Cullman Chamber"], clients: ["Wallace State"], stats: [{ value: "40", label: "booths" }] });
  assert.deepEqual(a.closures, [{ date: "2026-11-26", label: "Thanksgiving" }]);
  assert.deepEqual(a.visit, { paymentMethods: ["Cash", "Visa"], parking: "Lot out back." });
  assert.equal(a.links.giftCards, "https://squareup.com/gift/x");
  const b = apply(a, { proof: { awards: [], memberships: [], clients: [], stats: [] }, closures: [], visit: { paymentMethods: [], parking: "" }, links: { giftCards: "" } });
  assert.equal(b.proof, undefined);
  assert.equal(b.closures, undefined);
  assert.equal(b.visit, undefined);
  assert.equal(b.links.giftCards, undefined);
  const c = apply(a, { visit: { parking: "" } });
  assert.deepEqual(c.visit, { paymentMethods: ["Cash", "Visa"] }, "a partial edit keeps the other line");
  assert.throws(() => EditsSchema.parse({ record: { closures: [{ date: "Nov 26", label: "x" }] } }));
  assert.throws(() => EditsSchema.parse({ record: { links: { giftCards: "javascript:alert(1)" } } }));
  assert.equal(apply(categoryRecord("contractor"), { proof: { memberships: ["BBB"] } }).proof?.memberships?.[0], "BBB", "every category takes proof");
});

test("restaurant: menu item photos (gallery only) and tags survive a menu retype; catering, truck and partner links", () => {
  const r = restaurantRecord({ media: { gallery: [{ src: "/assets/owner/g1.jpg", alt: "Plate", source: "owner" }, { src: "/assets/owner/g2.jpg", alt: "Google", source: "google" }] } });
  const a = apply(r, { menuText: "# Plates\nPulled pork plate | $12 | Two sides\nBrisket plate | $15", menuItems: [{ name: "pulled pork plate", image: "/assets/owner/g1.jpg", tags: ["popular", "spicy", "popular"] }, { name: "Brisket plate", image: "/assets/owner/g2.jpg", tags: ["new"] }] });
  const items = () => a.ext.restaurant!.menu!.sections[0]!.items;
  assert.equal(items()[0]!.image?.src, "/assets/owner/g1.jpg");
  assert.deepEqual(items()[0]!.tags, ["popular", "spicy"], "matched by name, case-insensitive, tags de-duplicated");
  assert.equal(items()[1]!.image, undefined, "a Google photo never becomes a menu photo");
  assert.deepEqual(items()[1]!.tags, ["new"]);
  const b = apply(a, { menuText: "# Plates\nPulled pork plate | $13 | Two sides and bread\nBrisket plate | $15\nRibs | $18" });
  assert.equal(b.ext.restaurant!.menu!.sections[0]!.items[0]!.image?.src, "/assets/owner/g1.jpg", "retyping the menu keeps the photo");
  assert.equal(b.ext.restaurant!.menu!.sections[0]!.items[0]!.price, "$13");
  assert.deepEqual(b.ext.restaurant!.menu!.sections[0]!.items[1]!.tags, ["new"]);
  const c = apply(b, { menuItems: [{ name: "Pulled pork plate", image: "", tags: [] }] });
  assert.equal(c.ext.restaurant!.menu!.sections[0]!.items[0]!.image, undefined);
  assert.equal(c.ext.restaurant!.menu!.sections[0]!.items[0]!.tags, undefined);
  assert.throws(() => EditsSchema.parse({ record: { menuItems: [{ name: "x", tags: ["keto"] }] } }), "unknown tags are refused");

  const d = apply(r, { restaurant: { catering: true, cateringNote: "Pans for 20 to 200.", calendarUrl: "https://calendar.google.com/x", deliveryLinks: { doordash: "https://doordash.com/x", ubereats: "" }, rewardsUrl: "" } });
  assert.equal(d.ext.restaurant!.catering, true);
  assert.equal(d.ext.restaurant!.cateringNote, "Pans for 20 to 200.");
  assert.equal(d.ext.restaurant!.calendarUrl, "https://calendar.google.com/x");
  assert.deepEqual(d.ext.restaurant!.deliveryLinks, { doordash: "https://doordash.com/x" });
  assert.equal(d.ext.restaurant!.rewardsUrl, undefined);
  const e = apply(d, { restaurant: { catering: false, cateringNote: "", deliveryLinks: { doordash: "" } } });
  assert.equal(e.ext.restaurant!.catering, false);
  assert.equal(e.ext.restaurant!.cateringNote, undefined);
  assert.equal(e.ext.restaurant!.deliveryLinks, undefined);
  assert.equal(apply(categoryRecord("salon"), { restaurant: { catering: true } }).ext.restaurant, undefined, "restaurant fields only apply to restaurants");
});

test("salon: team, rates, policies, intro offer, pet rules and service durations", () => {
  const r = categoryRecord("salon", { variant: "massage", services: seedSalonServices("massage") });
  const a = apply(r, {
    salon: {
      team: [{ name: "Jess", role: "Owner", days: "", bookingUrl: "https://booksy.com/j", line: "" }, { name: "Mike" }],
      teamConfirmed: true,
      rates: [{ minutes: 30, price: "$45" }],
      policies: { deposit: "", cancellation: "24 hours.", lateness: "", kids: "" },
      introOffer: { text: "$10 off", until: "2026-12-31" },
      pet: { vaccinations: "Rabies.", pricingFrom: "", mattingNote: "", prep: "" },
    },
    services: ["Relaxation massage | $80 | 60 min", "Deep tissue | from $90 | 90", "Chair massage | | 15 minutes", "Gift certificates"],
  });
  const x = a.ext.salon!;
  assert.deepEqual(x.team, [{ name: "Jess", role: "Owner", bookingUrl: "https://booksy.com/j" }, { name: "Mike" }]);
  assert.equal(x.teamConfirmed, true);
  assert.deepEqual(x.rates, [{ minutes: 30, price: "$45" }]);
  assert.deepEqual(x.policies, { cancellation: "24 hours." });
  assert.deepEqual(x.introOffer, { text: "$10 off", until: "2026-12-31" });
  assert.deepEqual(x.pet, { vaccinations: "Rabies." });
  assert.deepEqual(a.services.map((s) => [s.name, s.price?.amount, s.durationMin]), [["Relaxation massage", 80, 60], ["Deep tissue", 90, 90], ["Chair massage", undefined, 15], ["Gift certificates", undefined, undefined]]);
  const b = apply(a, { salon: { team: [], rates: [], policies: { cancellation: "" }, introOffer: { text: "", until: "" }, pet: { vaccinations: "" } } });
  assert.equal(b.ext.salon!.team, undefined);
  assert.equal(b.ext.salon!.rates, undefined);
  assert.equal(b.ext.salon!.policies, undefined);
  assert.equal(b.ext.salon!.introOffer, undefined);
  assert.equal(b.ext.salon!.pet, undefined);
  assert.throws(() => EditsSchema.parse({ record: { salon: { team: [{ name: "x", bookingUrl: "ftp://x" }] } } }));
  assert.throws(() => EditsSchema.parse({ record: { salon: { introOffer: { text: "x", until: "soon" } } } }));
});

test("retail: florist, vendors, departments, brands, financing, delivery, drop day, hold note, occasions", () => {
  const r = categoryRecord("retail", { variant: "florist", ext: { retail: {} } });
  const a = apply(r, { retail: { florist: { occasions: ["Sympathy"], deliveryArea: "Cullman", cutoff: "1 PM", deliveryFee: "", designersChoice: true }, vendors: { boothsAvailable: true, note: "" }, departments: ["Poultry"], brands: [], financing: { lender: "Acima", url: "" }, deliveryNote: "Free over $499.", dropDay: "Thursdays", holdNote: "Call to hold.", occasions: ["Prom"] } });
  const x = a.ext.retail!;
  assert.deepEqual(x.florist, { occasions: ["Sympathy"], deliveryArea: "Cullman", cutoff: "1 PM", designersChoice: true });
  assert.deepEqual(x.vendors, { boothsAvailable: true });
  assert.deepEqual(x.departments, ["Poultry"]);
  assert.equal(x.brands, undefined);
  assert.deepEqual(x.financing, { lender: "Acima", url: undefined });
  assert.equal(x.deliveryNote, "Free over $499.");
  assert.equal(x.dropDay, "Thursdays");
  assert.equal(x.holdNote, "Call to hold.");
  assert.deepEqual(x.occasions, ["Prom"]);
  const b = apply(a, { retail: { florist: { cutoff: "", designersChoice: false }, vendors: { boothsAvailable: false }, financing: { lender: "" }, deliveryNote: "", occasions: [] } });
  assert.deepEqual(b.ext.retail!.florist, { occasions: ["Sympathy"], deliveryArea: "Cullman" }, "clearing the cutoff drops the same-day claim; the rest stays");
  assert.equal(b.ext.retail!.vendors, undefined);
  assert.equal(b.ext.retail!.financing, undefined);
  assert.equal(b.ext.retail!.deliveryNote, undefined);
  assert.equal(b.ext.retail!.occasions, undefined);
});

test("print: upload link, turnaround, price breaks and store link", () => {
  const r = categoryRecord("print", { variant: "screen_printing", ext: { print: {} } });
  const a = apply(r, { print: { uploadUrl: "https://www.dropbox.com/request/abc", turnaround: "About 10 business days.", quantityTiers: [{ from: 48, note: "best price" }, { from: 12, note: "" }], storeUrl: "" } });
  assert.deepEqual(a.ext.print, { uploadUrl: "https://www.dropbox.com/request/abc", turnaround: "About 10 business days.", quantityTiers: [{ from: 48, note: "best price" }, { from: 12, note: undefined }], storeUrl: undefined });
  const b = apply(a, { print: { uploadUrl: "", turnaround: "", quantityTiers: [] } });
  assert.deepEqual(b.ext.print, { uploadUrl: undefined, turnaround: undefined, quantityTiers: undefined, storeUrl: undefined });
  assert.throws(() => EditsSchema.parse({ record: { print: { quantityTiers: [{ from: 0 }] } } }));
  assert.equal(apply(categoryRecord("retail"), { print: { turnaround: "x" } }).ext.print, undefined);
});

test("requestSummary reads well for the new forms", () => {
  assert.equal(requestSummary({ topic: "Quote", service: "Custom T-shirts", quantity: "48", needed_by: "2026-11-03", placements: "front, back", artwork_status: "I have a print-ready file", rush: "Yes, I need it fast" }), "Quote: 48 Custom T-shirts · needed by Nov 3 · front, back · has artwork · RUSH");
  assert.equal(requestSummary({ topic: "Quote", service: "Vinyl banners", quantity: "4x8", artwork_status: "I need design help", rush: "No, normal timing is fine" }), "Quote: 4x8 Vinyl banners · needs design help");
  assert.equal(requestSummary({ topic: "Catering", event_date: "2026-12-12", guests: "40", needs: "drop-off" }), "Catering: Dec 12 · 40 guests · drop-off");
  assert.equal(requestSummary({ topic: "Book the truck", event_date: "2026-07-04", guests: "150", location: "Heritage Park" }), "Book the truck: Jul 4 · 150 guests · Heritage Park");
  assert.equal(requestSummary({ topic: "Sympathy & weddings", occasion: "Wedding", event_date: "2027-05-01", budget_range: "$250 to $500" }), "Sympathy & weddings: Wedding · May 1 · budget $250 to $500");
  assert.equal(requestSummary({ topic: "Booth inquiry", booth: "Vintage glass, 8x10", best_day: "Tuesday" }), "Booth inquiry: Vintage glass, 8x10 · best day Tuesday");
  assert.equal(requestSummary({ topic: "Reserve a part", year: "2015", make: "Ford", model: "F-150", part: "alternator" }), "Reserve a part: alternator · 2015 Ford F-150", "older forms read as before");
  assert.equal(requestSummary({ service: "Drain cleaning", town: "Cullman" }), "Drain cleaning · Cullman");
});
