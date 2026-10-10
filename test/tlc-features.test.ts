import assert from "node:assert/strict";
import { test } from "node:test";
import { guaranteeChip, guaranteeLine, photoPairs } from "../src/generator/components.ts";
import { encodeDna, LEGACY_DNA } from "../src/generator/dna.ts";
import { cleaningVariant, parseTask, tagMatches } from "../src/generator/packs/cleaning.ts";
import { contractorBannedPhrases } from "../src/generator/packs/contractor.ts";
import { lawnPlans, needsAdaiPermit, seasonBlocks } from "../src/generator/packs/landscaping.ts";
import { buildSite } from "../src/generator/render.ts";
import type { BusinessRecord, Copy } from "../src/generator/types.ts";
import { categoryRecord, sampleCopy } from "./fixtures.ts";

const site = (look = "") => ({ slug: "t", look, origin: "https://example.test" });
const build = (record: BusinessRecord, copy: Copy = sampleCopy(), mode: "preview" | "publish" = "preview", look = "") => buildSite({ record, copy, site: site(look), mode });
const home = async (record: BusinessRecord, copy?: Copy, mode: "preview" | "publish" = "preview", look = "") => {
  const out = await build(record, copy, mode, look);
  return { out, html: String(out.files.get("index.html")) };
};
const future = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
const owner = (src: string, alt: string, extra: Partial<BusinessRecord["media"]["gallery"][number]> = {}) => ({ src, alt, source: "owner" as const, width: 1200, height: 900, ...extra });
const confirmedAll: BusinessRecord["confirmed"] = ["name", "phone", "address", "services", "service_area"];

function hvac(over: Partial<BusinessRecord> = {}): BusinessRecord {
  return categoryRecord("contractor", {
    name: "Sample Heating & Air",
    variant: "hvac",
    smsEnabled: true,
    services: [
      { id: "ac-repair", name: "AC repair" },
      { id: "tune-ups", name: "Tune-ups & maintenance" },
    ],
    licenses: [{ label: "AL HVAC Certification", number: "89459" }],
    insured: true,
    plans: [
      { name: "Standard", price: "$149", unit: "year", includes: ["Two tune-ups a year", "10% off repairs"] },
      { name: "Comfort", price: "$229", unit: "year", badge: "Most popular", includes: ["Two tune-ups a year", "15% off repairs", "Priority scheduling"], note: "Cancel any time." },
    ],
    guarantee: { window: "30 days", remedy: "we come back and make it right" },
    offers: [
      { title: "$50 off a new system", code: "COOL50", expiresOn: future(30), detail: "New installs only." },
      { title: "Free second opinion", detail: "Bring us any repair quote." },
      { title: "Old expired deal", expiresOn: "2020-01-01" },
    ],
    ext: {
      contractor: {
        residential: true,
        emergencyService: true,
        financing: { lender: "Wisetack", url: "https://example.org/apply" },
        warrantyText: "Parts and labor on our repairs are covered for one year.",
        afterHours: { phone: "(256) 555-0199", note: "Nights and weekends; after-hours rates apply", confirmed: true },
        serves: "both",
      },
    },
    ...over,
  });
}

test("HVAC: plans, financing, emergency line, warranty, guarantee, offers, AL# and the form upgrades all render from owner facts", async () => {
  const { out, html } = await home(hvac());
  assert.deepEqual(out.lint.errors, []);
  assert.match(html, /id="plans"[\s\S]*Maintenance plans[\s\S]*plan--badged[\s\S]*Most popular[\s\S]*from \$229<\/strong><span>\/year/);
  assert.match(html, /Prices are starting points/);
  assert.match(html, /Financing available/);
  assert.match(html, /id="financing"[\s\S]*Apply with Wisetack/);
  assert.match(html, /class="emerg"[\s\S]*Emergency\? <a href="tel:\+12565550199">Call \(256\) 555-0199<\/a> · Nights and weekends; after-hours rates apply[\s\S]*Not urgent\? Request service/);
  assert.match(html, /Our warranty\.<\/strong> Parts and labor/);
  assert.match(html, /30-day guarantee/);
  assert.match(html, /Our guarantee\.<\/strong> Not happy\? Tell us within 30 days and we come back and make it right\./);
  assert.match(html, /class="promo" data-event-end="[\d-]+"[\s\S]*\$50 off a new system[\s\S]*Code <strong>COOL50/);
  assert.match(html, /id="offers"[\s\S]*Free second opinion/);
  assert.doesNotMatch(html, /Old expired deal/);
  assert.match(html, /hero__eyebrow">Sample Heating &amp; Air · AL# 89459/);
  assert.match(html, /AL HVAC Certification AL# 89459/, "footer uses the AL# wording");
  assert.match(html, /Residential &amp; commercial/);
  assert.match(html, /For homes and businesses in and around Cullman\./);
  assert.match(html, /<select name="property"[\s\S]*<option selected>Residential/);
  assert.match(html, /<select name="urgent"/);
  assert.match(html, /<select name="reach"/);
  assert.match(html, /text us a photo of the problem/);
  assert.match(html, /Do you offer financing\?[\s\S]*through Wisetack/);
  assert.match(html, /Do you offer a warranty\?/);
  assert.match(html, /What if I&#39;m not happy with the work\?/);
  assert.ok(!out.todos.includes("Confirm the emergency terms (hours, extra charges)"));
  // Everything confirmed: it publishes, and the after-hours number is an allowed tel: link.
  const live = await build(hvac({ confirmed: confirmedAll }), sampleCopy({ approved: true }), "publish");
  assert.deepEqual(live.lint.errors, []);
});

test("an empty contractor record renders none of the new sections; required to-dos follow Alabama's rules", async () => {
  const plain = hvac({ plans: undefined, guarantee: undefined, offers: [], licenses: [], ext: { contractor: { residential: true } } });
  const { out, html } = await home(plain);
  assert.deepEqual(out.lint.errors, []);
  for (const bit of ['id="plans"', 'id="financing"', 'class="emerg"', 'class="promo"', 'id="offers"', "Our guarantee", "Our warranty", "AL# \\d", '<select name="property"[\\s\\S]*selected']) assert.doesNotMatch(html, new RegExp(bit), bit);
  assert.match(html, /<select name="urgent"/, "contractors always get the emergency question");
  assert.ok(out.todos.includes("Add your Alabama HVAC certification number"), "HVAC needs the AL# before publishing");
  const licensed = await build(hvac({ plans: undefined, offers: [], ext: { contractor: { residential: true } } }));
  assert.ok(!licensed.todos.includes("Add your Alabama HVAC certification number"));
  // Emergency on but terms unconfirmed: required to-do, and publishing is blocked.
  const unconfirmed = hvac({ confirmed: confirmedAll, ext: { contractor: { residential: true, emergencyService: true } } });
  const prev = await build(unconfirmed);
  assert.ok(prev.todos.includes("Confirm the emergency terms (hours, extra charges)"));
  assert.match(String(prev.files.get("index.html")), /class="emerg"[\s\S]*Call \(256\) 555-0123<\/a> · 24\/7/, "falls back to the main number");
  await assert.rejects(build(unconfirmed, sampleCopy({ approved: true }), "publish"), /Confirm the emergency terms/);
  // Remodelers: suggested until they say jobs run over $10k, then required.
  const remodel = categoryRecord("contractor", { variant: "remodeling", licenses: [] });
  const r1 = await build(remodel);
  assert.ok(r1.suggestions.some((s) => /HBLB/.test(s)) && !r1.todos.some((s) => /HBLB/.test(s)));
  const r2 = await build({ ...remodel, ext: { contractor: { residential: true, jobsOver10k: true } } });
  assert.ok(r2.todos.includes("Add your HBLB license number"));
  const r3 = await build({ ...remodel, licenses: [{ label: "Alabama HBLB License", number: "12345" }], ext: { contractor: { residential: true, jobsOver10k: true } } });
  assert.ok(!r3.todos.some((s) => /HBLB/.test(s)));
  assert.match(String(r3.files.get("index.html")), /Alabama HBLB License AL# 12345/);
  // Plumbers keep plain "#" wording and no license to-do.
  const plumb = await build(categoryRecord("contractor", { variant: "plumbing", licenses: [{ label: "Master Plumber", number: "777" }] }));
  assert.match(String(plumb.files.get("index.html")), /Master Plumber #777/);
  assert.ok(!plumb.todos.some((s) => /license|AL#/i.test(s)));
});

test("contractor banned phrases: invented financing, licensing, warranty and 24/7 claims, unless the owner's own text has them", () => {
  const plain = categoryRecord("contractor", { variant: "hvac", licenses: [] });
  const hit = (text: string, r = plain) => contractorBannedPhrases(r).some((re) => re.test(text));
  assert.ok(hit("Ask about 0% financing"));
  assert.ok(hit("We're fully licensed and insured"));
  assert.ok(hit("Every job is guaranteed"));
  assert.ok(hit("We offer 24/7 emergency service"));
  assert.ok(!hit("We fix AC units in Cullman"));
  assert.ok(!hit("Ask about financing", hvac()), "a named lender allows the word financing");
  assert.ok(hit("No credit check financing", hvac()), "terms stay banned even with a lender");
  assert.ok(!hit("Our warranty covers parts", hvac()), "the owner's warranty text allows warranty wording");
  assert.ok(!hit("Emergency service day or night", hvac()));
});

test("landscaping: seasonal calendar from the services only, ADAI permit gate, default ways to work with us, crew line", async () => {
  const lawn = categoryRecord("landscaping", {
    variant: "lawn_crew",
    services: [
      { id: "mow", name: "Mowing & edging" },
      { id: "weed", name: "Fertilization & weed control" },
      { id: "leaf", name: "Leaf cleanup" },
      { id: "straw", name: "Mulch & pine straw" },
    ],
    ext: { landscaping: { seasonal: true, crew: "Owner-operated: Jake runs every job." } },
  });
  assert.ok(needsAdaiPermit(lawn));
  const seasons = seasonBlocks(lawn);
  assert.deepEqual(seasons.map((s) => s.name), ["Spring", "Summer", "Fall", "Winter"]);
  assert.ok(seasons[0]!.items.some((i) => i.service === "Fertilization & weed control" && /Pre-emergent/.test(i.line)));
  assert.ok(seasons[2]!.items.some((i) => i.service === "Leaf cleanup"));
  const { out, html } = await home(lawn);
  assert.deepEqual(out.lint.errors, []);
  assert.ok(out.todos.includes("Add your ADAI permit number"));
  assert.match(html, /id="seasons"[\s\S]*What we do when[\s\S]*<h3>Spring<\/h3>[\s\S]*Mowing starts mid-March/);
  assert.match(html, /id="plans"[\s\S]*Ways to work with us[\s\S]*<h3>Weekly<\/h3>[\s\S]*<h3>Every 2 weeks<\/h3>[\s\S]*<h3>One-time or seasonal<\/h3>/);
  assert.doesNotMatch(html, /Prices are starting points/, "default lawn plans carry no prices");
  assert.ok(out.suggestions.includes("Check these ways to work with us"));
  assert.match(html, /id="about"[\s\S]*class="crew"[\s\S]*Owner-operated: Jake runs every job\./);
  assert.match(html, /<select name="property"/);
  // Permit given: chip shows, to-do gone. Toggle off: no calendar. No matching services: no calendar even when on.
  const permitted = { ...lawn, ext: { landscaping: { seasonal: false, adaiPermit: "HP-1234" } } };
  const p = await home(permitted);
  assert.ok(!p.out.todos.includes("Add your ADAI permit number"));
  assert.match(p.html, /ADAI permit #HP-1234/);
  assert.doesNotMatch(p.html, /id="seasons"/);
  const none = await home(categoryRecord("landscaping", { services: [{ id: "x", name: "Consulting" }], ext: { landscaping: { seasonal: true } } }));
  assert.doesNotMatch(none.html, /id="seasons"/);
  assert.doesNotMatch(none.html, /id="plans"/, "no upkeep services, no default plan cards");
  // Owner plans replace the defaults; design-build gets none by default.
  assert.equal(lawnPlans(categoryRecord("landscaping", { variant: "design_build" })), undefined);
  const own = await home({ ...lawn, plans: [{ name: "Full-service", price: "$160", unit: "month", includes: ["Mowing", "Beds"] }] });
  assert.match(own.html, /<h3>Full-service<\/h3>[\s\S]*from \$160/);
  assert.doesNotMatch(own.html, /<h3>Every 2 weeks<\/h3>/);
});

test("cleaning: the what's-included table compares tiers, commercial gets the walkthrough path, exterior gets flat rates and the pairs to-do", async () => {
  assert.deepEqual(parseTask("Inside the oven @deep @move"), { task: "Inside the oven", tags: ["deep", "move"] });
  assert.ok(tagMatches("move", "Move-out") && tagMatches("deep", "Deep clean") && !tagMatches("deep", "Standard"));
  const res = categoryRecord("cleaning", {
    variant: "residential",
    smsEnabled: true,
    guarantee: { text: "Not happy with a room? Tell us within 24 hours and we'll re-clean it free." },
    ext: {
      cleaning: {
        checklist: {
          tiers: ["Standard", "Deep", "Move-out"],
          rooms: [
            { room: "Kitchen", tasks: ["Counters and sink", "Inside the oven @deep @move"] },
            { room: "Bathrooms", tasks: ["Toilets and tubs"] },
          ],
          extras: ["Interior windows", "Laundry"],
        },
      },
    },
  });
  const { out, html } = await home(res);
  assert.deepEqual(out.lint.errors, []);
  assert.match(html, /id="included"[\s\S]*<th scope="col" class="tiers__mark">Standard<\/th><th scope="col" class="tiers__mark">Deep<\/th><th scope="col" class="tiers__mark">Move-out<\/th>/);
  const oven = /<th scope="row">Inside the oven<\/th>(.*?)<\/tr>/.exec(html)![1]!;
  assert.match(oven, /^<td class="tiers__mark tiers__no">[\s\S]*tiers__yes[\s\S]*tiers__yes/, "a @deep @move task is out of Standard and in the other two");
  const counters = /<th scope="row">Counters and sink<\/th>(.*?)<\/tr>/.exec(html)![1]!;
  assert.equal((counters.match(/tiers__yes/g) ?? []).length, 3, "untagged tasks are in every tier");
  assert.match(html, /May cost extra[\s\S]*Interior windows/);
  assert.match(html, /Satisfaction guarantee/);
  assert.match(html, /re-clean it free/);
  assert.match(html, /<select name="property"[\s\S]*<option selected>Residential/);
  assert.match(html, /text us a photo of the rooms/);
  assert.ok(!out.suggestions.includes("Send us your cleaning checklist"));
  const empty = await home(categoryRecord("cleaning"));
  assert.doesNotMatch(empty.html, /id="included"/);
  assert.ok(empty.out.suggestions.includes("Send us your cleaning checklist"));

  assert.equal(cleaningVariant(undefined, [], "Sweepers Janitorial"), "commercial");
  const com = categoryRecord("cleaning", { variant: "commercial", ext: { cleaning: { facilities: ["Offices", "Churches"], frequency: "Nightly, weekly or on your schedule", afterHours: true, checklist: { tiers: ["Standard"], rooms: [{ room: "Kitchen", tasks: ["x"] }], extras: [] } } } });
  const c = await home(com);
  assert.deepEqual(c.out.lint.errors, []);
  assert.match(c.html, /Request a walkthrough/);
  assert.match(c.html, /<input type="hidden" name="topic" value="Walkthrough">/);
  assert.match(c.html, /<select name="facility"[\s\S]*Medical &amp; dental/);
  assert.match(c.html, /<input name="sq_ft" inputmode="numeric">/);
  assert.match(c.html, /id="facilities"[\s\S]*Buildings we take care of[\s\S]*Nightly, weekly or on your schedule[\s\S]*Churches/);
  assert.match(c.html, /After-hours cleaning/);
  assert.match(c.html, /<h3>Walkthrough<\/h3>[\s\S]*<h3>Written scope<\/h3>[\s\S]*<h3>Recurring schedule<\/h3>/);
  assert.doesNotMatch(c.html, /id="included"/, "no residential tiers on a commercial site");
  assert.doesNotMatch(c.html, /name="home_size"/);
  assert.ok(!c.out.suggestions.includes("Send us your cleaning checklist"));

  const ext = categoryRecord("cleaning", { variant: "exterior", plans: [{ name: "Driveway", price: "$150", includes: ["Up to 2 cars", "Sidewalk to the door"] }] });
  const e = await home(ext);
  assert.deepEqual(e.out.lint.errors, []);
  assert.match(e.html, /Simple flat-rate pricing[\s\S]*<h3>Driveway<\/h3>[\s\S]*from \$150/);
  assert.ok(e.out.suggestions.includes("Add before-and-after photos"));
  assert.match(e.html, /<select name="property"[\s\S]*Church or school/);
});

test("gallery captions and before/after pairs", async () => {
  const record = categoryRecord("cleaning", {
    variant: "exterior",
    media: {
      gallery: [
        owner("/assets/owner/g1.jpg", "Driveway before", { caption: "Driveway", town: "Hanceville", pairWith: "g2" }),
        owner("/assets/owner/g2.jpg", "Driveway after"),
        owner("/assets/owner/g3.jpg", "Deck", { caption: "Deck", town: "Cullman" }),
        owner("/assets/owner/g4.jpg", "Dangling", { pairWith: "nope" }),
      ],
    },
  });
  assert.equal(photoPairs(record.media.gallery).length, 1);
  const { out, html } = await home({ ...record, confirmed: confirmedAll }, sampleCopy({ approved: true }), "publish");
  assert.deepEqual(out.lint.errors, []);
  assert.match(html, /Before and after[\s\S]*class="pairs"[\s\S]*g1\.jpg[\s\S]*<figcaption>Before<\/figcaption>[\s\S]*g2\.jpg[\s\S]*<figcaption>After<\/figcaption>[\s\S]*class="pair__cap">Driveway, Hanceville/);
  assert.match(html, /class="gallery gallery--more"[\s\S]*<figcaption>Deck, Cullman<\/figcaption>/);
  assert.equal((html.match(/g2\.jpg/g) ?? []).length, 1, "the after photo leaves the grid");
  assert.match(html, /g4\.jpg/, "a dangling pair still shows as a plain photo");
  const plain = await home(categoryRecord("cleaning", { media: { gallery: [owner("/assets/owner/g1.jpg", "One")] } }));
  assert.match(plain.html, /class="gallery"><li><img/);
  assert.doesNotMatch(plain.html, /pairs|figcaption/);
});

test("headline forms: question and benefit use the copy fields and fall back to what + where", async () => {
  const dna = (headline: "question" | "benefit") => `contractor.toolbox~classic~${encodeDna({ ...LEGACY_DNA, headline })}`;
  const record = categoryRecord("contractor", { variant: "hvac", licenses: [{ label: "AL HVAC", number: "1" }] });
  const q = await home(record, sampleCopy({ heroQuestion: "Is your AC blowing warm air?" }), "preview", dna("question"));
  assert.match(q.html, /<h1 id="hero-title">Is your AC blowing warm air\?<\/h1>/);
  assert.match(q.html, /hero__eyebrow">Heating &amp; Air in Cullman, AL/);
  const b = await home(record, sampleCopy({ heroBenefit: "Cool again by tonight" }), "preview", dna("benefit"));
  assert.match(b.html, /<h1 id="hero-title">Cool again by tonight<\/h1>/);
  const fb = await home(record, sampleCopy(), "preview", dna("question"));
  assert.match(fb.html, /<h1 id="hero-title">Heating &amp; Air in Cullman, AL<\/h1>/);
  assert.deepEqual(fb.out.lint.errors, []);
  assert.equal(guaranteeChip({ window: "24 hours" }), "24-hour guarantee");
  assert.equal(guaranteeChip({ remedy: "we fix it" }), "Satisfaction guarantee");
  assert.equal(guaranteeChip({}), undefined);
  assert.equal(guaranteeLine({ window: "7 days" }), "Not happy? Tell us within 7 days and we'll make it right.");
});

test("every trades, lawn and cleaning variant builds lint-clean, filled and empty, in preview and publish", async () => {
  const cases: Array<[Parameters<typeof categoryRecord>[0], string]> = [
    ["contractor", "hvac"], ["contractor", "remodeling"], ["contractor", "plumbing"], ["contractor", "roofing"], ["contractor", "pest"],
    ["landscaping", "lawn_crew"], ["landscaping", "design_build"],
    ["cleaning", "residential"], ["cleaning", "commercial"], ["cleaning", "exterior"],
  ];
  for (const [category, variant] of cases) {
    const empty = categoryRecord(category, { variant, confirmed: confirmedAll, licenses: [{ label: "License", number: "1" }], ext: { [category]: category === "contractor" ? { residential: true } : {} } });
    const filled: BusinessRecord = {
      ...empty,
      smsEnabled: true,
      plans: [{ name: "Plan A", price: "$99", unit: "month", includes: ["One", "Two"], badge: "Most popular" }, { name: "Plan B", includes: ["Three"] }],
      guarantee: { window: "7 days", remedy: "we make it right" },
      offers: [{ title: "$20 off", code: "WEB20", expiresOn: future(10) }, { title: "Second offer" }],
      media: { gallery: [owner("/assets/owner/a.jpg", "Before", { caption: "Yard", town: "Cullman", pairWith: "b" }), owner("/assets/owner/b.jpg", "After")] },
      ext:
        category === "contractor"
          ? { contractor: { residential: true, emergencyService: true, financing: { lender: "Wisetack", url: "https://example.org/x" }, warrantyText: "One year on our work.", afterHours: { note: "Nights too", confirmed: true }, serves: "both", jobsOver10k: true } }
          : category === "landscaping"
            ? { landscaping: { seasonal: true, adaiPermit: "HP-1", crew: "Jake runs every job." } }
            : { cleaning: { checklist: { tiers: ["Standard", "Deep"], rooms: [{ room: "Kitchen", tasks: ["Counters", "Oven @deep"] }], extras: ["Windows"] }, facilities: ["Offices"], frequency: "Nightly", afterHours: true } },
    };
    for (const record of [empty, filled]) {
      for (const mode of ["preview", "publish"] as const) {
        const out = await build(record, sampleCopy({ approved: true, heroQuestion: "Ready for help?", heroBenefit: "Done right" }), mode);
        assert.deepEqual(out.lint.errors, [], `${category}/${variant} ${mode}`);
        const html = String(out.files.get("index.html"));
        assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1);
        if (mode === "publish") assert.doesNotMatch(html, /data-todo/);
        for (const m of html.matchAll(/aria-labelledby="([^"]+)"/g)) assert.ok(html.includes(`id="${m[1]}"`), `${category}/${variant}: ${m[1]} heading exists`);
      }
    }
  }
});
