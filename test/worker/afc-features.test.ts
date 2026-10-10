import assert from "node:assert/strict";
import { test } from "node:test";
import { seedAutoServices } from "../../src/generator/packs/auto.ts";
import { seedFinanceServices } from "../../src/generator/packs/finance.ts";
import type { BusinessRecord } from "../../src/generator/types.ts";
import { applyEdits, EditsSchema } from "../../src/worker/edits.ts";
import { requestSummary } from "../../src/worker/forms.ts";
import { categoryRecord, sampleCopy } from "../fixtures.ts";

const auto = (variant: string, ext: NonNullable<BusinessRecord["ext"]["auto"]> = {}) => categoryRecord("auto", { variant, services: seedAutoServices(variant), ext: { auto: ext } });
const fin = (variant: string, ext: NonNullable<BusinessRecord["ext"]["finance"]> = {}) => categoryRecord("finance", { variant, services: seedFinanceServices(variant), ext: { finance: ext } });
const church = (variant: string, ext: NonNullable<BusinessRecord["ext"]["church"]> = {}) => categoryRecord("church", { variant, ext: { church: ext } });

test("auto edits: amenities, programs, financing, tow, tire and body round-trip; empties clear; parts stores ignore them", () => {
  const e = EditsSchema.parse({
    record: {
      auto: {
        amenities: ["loaner", "wifi"],
        programs: ["NAPA AutoCare", "Mitchell 1"],
        financing: { lender: "Synchrony Car Care", url: "https://example.com/apply" },
        tow: { phone: "256-555-0199", always: true, yardNote: "" },
        tireBrands: ["Michelin"],
        storeUrl: "https://example.com/tires",
        body: { insurers: ["State Farm"], certifications: [], rightToChooseConfirmed: true, estimateNote: "" },
      },
    },
  });
  const t = applyEdits(auto("towing"), sampleCopy(), e).record.ext.auto!;
  assert.deepEqual(t.amenities, ["loaner", "wifi"]);
  assert.deepEqual(t.programs, ["NAPA AutoCare", "Mitchell 1"]);
  assert.deepEqual(t.financing, { lender: "Synchrony Car Care", url: "https://example.com/apply" });
  assert.deepEqual(t.tow, { phone: "(256) 555-0199", always: true }, "tow number normalized, empty note dropped");
  assert.deepEqual(t.body, { insurers: ["State Farm"], certifications: [], rightToChooseConfirmed: true, estimateNote: undefined });
  assert.deepEqual(t.tireBrands, ["Michelin"]);
  assert.equal(t.storeUrl, "https://example.com/tires");

  const cleared = applyEdits(auto("towing", { ...t }), sampleCopy(), EditsSchema.parse({ record: { auto: { amenities: [], programs: [], financing: null, tow: { phone: "", always: false, yardNote: "" }, tireBrands: [], storeUrl: "", body: null } } })).record.ext.auto!;
  for (const k of ["amenities", "programs", "financing", "tow", "tireBrands", "storeUrl", "body"] as const) assert.equal(cleared[k], undefined, `${k} cleared`);

  assert.throws(() => EditsSchema.parse({ record: { auto: { amenities: ["jacuzzi"] } } }), "unknown amenity ids are refused");
  assert.throws(() => EditsSchema.parse({ record: { auto: { financing: { lender: "X", url: "javascript:alert(1)" } } } }));
  assert.throws(() => applyEdits(auto("towing"), sampleCopy(), EditsSchema.parse({ record: { auto: { tow: { phone: "12345", always: false } } } })), /tow number/);
  const parts = applyEdits(categoryRecord("auto", { variant: "parts", ext: { auto: {} } }), sampleCopy(), EditsSchema.parse({ record: { auto: { amenities: ["loaner"] } } }));
  assert.equal(parts.record.ext.auto?.amenities, undefined, "parts stores don't get amenities");
  const tire = applyEdits(auto("tire"), sampleCopy(), EditsSchema.parse({ record: { auto: { tow: { always: true } } } })).record.ext.auto!;
  assert.deepEqual(tire.tow, { always: true }, "tow fields are saved on whatever variant the owner picked; the pack only renders them for towing");
});

test("finance edits: people, season hours, carriers (strings and objects), memberships, fees, advisor approval", () => {
  const e = EditsSchema.parse({
    record: {
      finance: {
        people: [{ name: "Jane Smith", title: "Owner", credentials: "Enrolled Agent", line: "" }, { name: "Tom Lee", title: "" }],
        peopleConfirmed: true,
        seasonHours: { from: "01-15", to: "04-15", summary: "Mon to Fri 8 to 7" },
        carriers: ["Auto-Owners", { name: "Progressive", payUrl: "https://example.com/pay", claimsPhone: "800-555-0100", claimsUrl: "" }, { name: "Alfa", payUrl: "" }],
        memberships: ["Trusted Choice"],
        whoWeServe: "farms and small contractors",
        fees: [{ service: "Form 1040", price: "from $150" }],
        feesAsOf: "October 2026",
        advisorReviewsApproved: { by: "J. Doe", on: "2026-10-05" },
      },
    },
  });
  const f = applyEdits(fin("insurance"), sampleCopy(), e).record.ext.finance!;
  assert.deepEqual(f.people, [{ name: "Jane Smith", title: "Owner", credentials: "Enrolled Agent" }, { name: "Tom Lee", title: "" }]);
  assert.equal(f.peopleConfirmed, true);
  assert.deepEqual(f.seasonHours, { from: "01-15", to: "04-15", summary: "Mon to Fri 8 to 7" });
  assert.deepEqual(f.carriers, ["Auto-Owners", { name: "Progressive", payUrl: "https://example.com/pay", claimsPhone: "800-555-0100" }, "Alfa"], "names-only entries stay strings; empty links drop");
  assert.deepEqual(f.memberships, ["Trusted Choice"]);
  assert.equal(f.whoWeServe, "farms and small contractors");
  assert.deepEqual(f.fees, [{ service: "Form 1040", price: "from $150" }]);
  assert.equal(f.feesAsOf, "October 2026");
  assert.deepEqual(f.advisorReviewsApproved, { by: "J. Doe", on: "2026-10-05" });

  const old = fin("insurance", { carriers: ["Progressive", "Alfa"] });
  const kept = applyEdits(old, sampleCopy(), EditsSchema.parse({ record: { finance: { independent: true } } })).record.ext.finance!;
  assert.deepEqual(kept.carriers, ["Progressive", "Alfa"], "older names-only carriers survive unrelated edits");

  const cleared = applyEdits(fin("insurance", f), sampleCopy(), EditsSchema.parse({ record: { finance: { people: [], seasonHours: null, carriers: [], memberships: [], whoWeServe: "", fees: [], feesAsOf: "", advisorReviewsApproved: null } } })).record.ext.finance!;
  for (const k of ["people", "seasonHours", "carriers", "memberships", "whoWeServe", "fees", "feesAsOf", "advisorReviewsApproved"] as const) assert.equal(cleared[k], undefined, `${k} cleared`);
  assert.throws(() => EditsSchema.parse({ record: { finance: { seasonHours: { from: "Jan 15", to: "04-15", summary: "x" } } } }), "season dates are MM-DD");
  assert.throws(() => EditsSchema.parse({ record: { finance: { carriers: [{ name: "X", payUrl: "javascript:alert(1)" }] } } }));
  assert.equal(applyEdits(fin("tax_prep"), sampleCopy(), EditsSchema.parse({ record: { finance: { seasonHours: { from: "01-15", to: "04-15", summary: "" } } } })).record.ext.finance!.seasonHours, undefined, "no summary, no season block");
});

test("church edits: schedule lang tag, visitor links (prayer may be mailto/sms), kids, volunteer link, hall details", () => {
  const e = EditsSchema.parse({
    record: {
      church: {
        schedule: [{ day: "Sunday", time: "11:00 AM", label: "Worship" }, { day: "Sunday", time: "2:00 PM", label: "Servicio", lang: "es" }],
        planVisitUrl: "https://example.churchcenter.com/forms/1",
        connectCardUrl: "",
        prayerUrl: "mailto:pastor@example.com",
        bulletinUrl: "https://example.com/b.pdf",
        appUrl: "",
        podcastUrl: "https://example.com/pod",
        liveNote: "Live Sundays at 10:30 on Facebook",
        kids: { nursery: "Birth to 3", kids: "", students: "", checkIn: "" },
        volunteerUrl: "https://example.com/vol",
        hallDetails: { capacity: "150", kitchen: true, tables: "", how: "Call the post." },
      },
    },
  });
  const c = applyEdits(church("church"), sampleCopy(), e).record.ext.church!;
  assert.deepEqual(c.schedule, [{ day: "Sunday", time: "11:00 AM", label: "Worship" }, { day: "Sunday", time: "2:00 PM", label: "Servicio", lang: "es" }]);
  assert.equal(c.planVisitUrl, "https://example.churchcenter.com/forms/1");
  assert.equal(c.connectCardUrl, undefined);
  assert.equal(c.prayerUrl, "mailto:pastor@example.com");
  assert.equal(c.liveNote, "Live Sundays at 10:30 on Facebook");
  assert.deepEqual(c.kids, { nursery: "Birth to 3" });
  assert.equal(c.volunteerUrl, "https://example.com/vol");
  assert.deepEqual(c.hallDetails, { capacity: "150", kitchen: true, how: "Call the post." });
  assert.equal(EditsSchema.parse({ record: { church: { prayerUrl: "sms:+12565550123" } } }).record?.church?.prayerUrl, "sms:+12565550123");
  assert.throws(() => EditsSchema.parse({ record: { church: { prayerUrl: "javascript:alert(1)" } } }));
  assert.throws(() => EditsSchema.parse({ record: { church: { schedule: [{ day: "Sunday", time: "11", label: "x", lang: "fr" }] } } }));
  const cleared = applyEdits(church("church", c), sampleCopy(), EditsSchema.parse({ record: { church: { kids: { nursery: "", kids: "", students: "", checkIn: "" }, hallDetails: { capacity: "", kitchen: false, tables: "", how: "" }, prayerUrl: "", liveNote: "" } } })).record.ext.church!;
  assert.equal(cleared.kids, undefined);
  assert.equal(cleared.hallDetails, undefined);
  assert.equal(cleared.prayerUrl, undefined);
  assert.equal(cleared.hall, undefined, "the hall paragraph is a separate field");
});

test("Inbox line for a tire quote reads the size and count, or the vehicle", () => {
  assert.equal(requestSummary({ topic: "Tire quote", tire_size: "265/70R17", quantity: "4" }), "Tire quote: 265/70R17 ×4");
  assert.equal(requestSummary({ topic: "Tire quote", tire_size: "265/70R17", quantity: "4", brand: "Michelin", year: "2019", make: "Ford", model: "F-150" }), "Tire quote: 265/70R17 ×4 · 2019 Ford F-150 · Michelin");
  assert.equal(requestSummary({ topic: "Tire quote", year: "2019", make: "Ford", model: "F-150", quantity: "2" }), "Tire quote: 2019 Ford F-150 ×2");
  assert.equal(requestSummary({ topic: "Tire quote", tire_size: "225/60R16", quantity: "Not sure" }), "Tire quote: 225/60R16 (Not sure)");
  assert.equal(requestSummary({ topic: "Reserve a part", year: "2014", make: "Ford", model: "F-150", part: "Brake pads" }), "Reserve a part: Brake pads · 2014 Ford F-150", "existing forms unchanged");
  assert.equal(requestSummary({ topic: "Quote", service: "Auto" }), "Quote: Auto");
});
