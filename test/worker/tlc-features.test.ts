import assert from "node:assert/strict";
import { test } from "node:test";
import { applyEdits, EditsSchema } from "../../src/worker/edits.ts";
import { requestSummary } from "../../src/worker/forms.ts";
import { categoryRecord, sampleCopy } from "../fixtures.ts";

const copy = sampleCopy();
const apply = (r: ReturnType<typeof categoryRecord>, edits: unknown) => applyEdits(structuredClone(r), copy, EditsSchema.parse(edits));

test("plans, guarantee, offers and copy headline fields round-trip through Edit; empty values clear them", () => {
  const r = categoryRecord("cleaning");
  const next = apply(r, {
    record: {
      plans: [{ name: "Every 2 weeks", price: "$120", unit: "visit", badge: "Most popular", includes: ["Kitchen", "Baths"], note: "" }],
      guarantee: { window: "24 hours", remedy: "we re-clean it free", text: "" },
      offers: [{ title: "$25 off", code: "WEB25", expiresOn: "2026-12-31", detail: "First clean" }, { title: "Free quote", expiresOn: "" }],
    },
    copy: { heroQuestion: "When did you last have a free Saturday?", heroBenefit: "" },
  });
  assert.deepEqual(next.record.plans, [{ name: "Every 2 weeks", price: "$120", unit: "visit", badge: "Most popular", note: undefined, includes: ["Kitchen", "Baths"] }]);
  assert.deepEqual(next.record.guarantee, { window: "24 hours", remedy: "we re-clean it free", text: undefined });
  assert.equal(next.record.offers[1]!.expiresOn, undefined);
  assert.equal(next.record.offers[0]!.code, "WEB25");
  assert.equal(next.copy.heroQuestion, "When did you last have a free Saturday?");
  assert.equal(next.copy.heroBenefit, undefined);
  assert.equal(next.copy.approved, false);
  const cleared = apply(next.record, { record: { plans: [], guarantee: { window: "", remedy: "", text: "" }, offers: [] } });
  assert.equal(cleared.record.plans, undefined);
  assert.equal(cleared.record.guarantee, undefined);
  assert.deepEqual(cleared.record.offers, []);
  assert.throws(() => EditsSchema.parse({ record: { offers: [{ title: "x", expiresOn: "Dec 31" }] } }));
  assert.throws(() => EditsSchema.parse({ record: { plans: [{ name: "a", includes: [] }, { name: "b", includes: [] }, { name: "c", includes: [] }, { name: "d", includes: [] }] } }), "at most 3 plans");
});

test("gallery captions, towns and pairs: only real photos can be paired, never itself", () => {
  const r = categoryRecord("landscaping", {
    media: {
      gallery: [
        { src: "/assets/owner/g1.jpg", alt: "a", source: "owner" },
        { src: "/assets/owner/g2.jpg", alt: "b", source: "owner" },
      ],
    },
  });
  const next = apply(r, { record: { galleryMeta: { "/assets/owner/g1.jpg": { caption: "Patio", town: "Hanceville", pairWith: "g2" }, "/assets/owner/g2.jpg": { pairWith: "g2" } } } });
  assert.equal(next.record.media.gallery[0]!.caption, "Patio");
  assert.equal(next.record.media.gallery[0]!.town, "Hanceville");
  assert.equal(next.record.media.gallery[0]!.pairWith, "g2");
  assert.equal(next.record.media.gallery[1]!.pairWith, undefined, "a photo can't be its own after");
  const dangling = apply(next.record, { record: { galleryMeta: { "/assets/owner/g1.jpg": { pairWith: "g9", caption: "" } } } });
  assert.equal(dangling.record.media.gallery[0]!.pairWith, undefined);
  assert.equal(dangling.record.media.gallery[0]!.caption, undefined);
});

test("contractor details: financing, warranty, after-hours (normalized), serves and the $10k flag", () => {
  const r = categoryRecord("contractor", { variant: "hvac" });
  const next = apply(r, { record: { contractor: { financingLender: "Wisetack", financingUrl: "https://example.org/apply", warrantyText: "One year on our work.", afterHoursPhone: "256-555-0199", afterHoursNote: "Nights and weekends", afterHoursConfirmed: true, serves: "both", jobsOver10k: true } } });
  const x = next.record.ext.contractor!;
  assert.deepEqual(x.financing, { lender: "Wisetack", url: "https://example.org/apply" });
  assert.equal(x.warrantyText, "One year on our work.");
  assert.deepEqual(x.afterHours, { phone: "(256) 555-0199", note: "Nights and weekends", confirmed: true });
  assert.equal(x.serves, "both");
  assert.equal(x.jobsOver10k, true);
  assert.throws(() => EditsSchema.parse({ record: { contractor: { financingUrl: "javascript:alert(1)" } } }));
  assert.throws(() => apply(r, { record: { contractor: { afterHoursPhone: "12" } } }), /after-hours number/);
  const cleared = apply(next.record, { record: { contractor: { financingLender: "", warrantyText: "", afterHoursPhone: "", afterHoursNote: "", afterHoursConfirmed: false, serves: "", jobsOver10k: false } } });
  const y = cleared.record.ext.contractor!;
  assert.equal(y.financing, undefined);
  assert.equal(y.warrantyText, undefined);
  assert.equal(y.afterHours, undefined);
  assert.equal(y.serves, undefined);
  assert.equal(y.jobsOver10k, undefined);
  // Other categories ignore the block.
  assert.equal(apply(categoryRecord("cleaning"), { record: { contractor: { warrantyText: "x" } } }).record.ext.contractor, undefined);
});

test("landscaping and cleaning details round-trip; facility names come from the fixed list", () => {
  const lawn = apply(categoryRecord("landscaping"), { record: { landscaping: { seasonal: true, adaiPermit: " HP-1234 ", crew: "Jake runs every job." } } });
  assert.deepEqual(lawn.record.ext.landscaping, { seasonal: true, adaiPermit: "HP-1234", crew: "Jake runs every job." });
  const off = apply(lawn.record, { record: { landscaping: { seasonal: false, adaiPermit: "", crew: "" } } });
  assert.deepEqual(off.record.ext.landscaping, { seasonal: undefined, adaiPermit: undefined, crew: undefined });

  const res = apply(categoryRecord("cleaning"), { record: { cleaning: { checklist: { tiers: ["Standard", "Deep"], rooms: [{ room: "Kitchen", tasks: ["Counters", "Oven @deep"] }, { room: "Bedrooms", tasks: [] }], extras: ["Windows"] } } } });
  assert.deepEqual(res.record.ext.cleaning!.checklist, { tiers: ["Standard", "Deep"], rooms: [{ room: "Kitchen", tasks: ["Counters", "Oven @deep"] }], extras: ["Windows"] });
  const gone = apply(res.record, { record: { cleaning: { checklist: { tiers: [], rooms: [], extras: [] } } } });
  assert.equal(gone.record.ext.cleaning!.checklist, undefined);

  const com = apply(categoryRecord("cleaning", { variant: "commercial" }), { record: { cleaning: { facilities: ["Offices", "Churches", "Offices"], frequency: "Nightly", afterHours: true } } });
  assert.deepEqual(com.record.ext.cleaning!.facilities, ["Offices", "Churches"]);
  assert.equal(com.record.ext.cleaning!.frequency, "Nightly");
  assert.equal(com.record.ext.cleaning!.afterHours, true);
  assert.throws(() => EditsSchema.parse({ record: { cleaning: { facilities: ["Casinos"] } } }));
  const none = apply(com.record, { record: { cleaning: { facilities: [], frequency: "", afterHours: false } } });
  assert.equal(none.record.ext.cleaning!.facilities, undefined);
  assert.equal(none.record.ext.cleaning!.afterHours, undefined);
});

test("requestSummary carries the new fields and puts 🔴 in front of an emergency", () => {
  assert.equal(requestSummary({ service: "AC repair", urgent: "Yes", reach: "Text", property: "Residential" }), "🔴 Emergency · AC repair · Residential · prefers a text");
  assert.equal(requestSummary({ service: "AC repair", urgent: "No", reach: "Call" }), "AC repair · prefers a call");
  assert.equal(requestSummary({ topic: "Walkthrough", facility: "Offices", sq_ft: "4000", frequency: "Nightly" }), "Walkthrough: Offices · 4000 sq ft · Nightly");
  assert.equal(requestSummary({ urgent: "yes" }), "🔴 Emergency");
  assert.equal(requestSummary({}), "");
});
