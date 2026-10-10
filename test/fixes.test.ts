import assert from "node:assert/strict";
import { test } from "node:test";
import { EXAMPLES } from "../src/examples/examples.ts";
import { autoVariant } from "../src/generator/packs/auto.ts";
import { churchBannedPhrases, SCRIPTURE_REF } from "../src/generator/packs/church.ts";
import { contractorTrade, seedServices } from "../src/generator/packs/contractor.ts";
import { financeBannedPhrases } from "../src/generator/packs/finance.ts";
import { retailVariant } from "../src/generator/packs/retail.ts";
import { bannedPhraseIn, unsupportedNumbers } from "../src/generator/lint.ts";
import { buildSite } from "../src/generator/render.ts";
import { formatTime } from "../src/generator/hours.ts";
import type { BusinessRecord, Copy } from "../src/generator/types.ts";
import { guessCategory, isChain, qualify, webPresence } from "../src/places/qualify.ts";
import { SEARCH_GROUPS } from "../src/places/queries.ts";
import { websiteProblem } from "../src/places/site-check.ts";
import { categoryRecord, restaurantRecord, sampleCopy } from "./fixtures.ts";

const site = (slug = "s") => ({ slug, look: "", origin: "https://example.test" });
const build = (record: BusinessRecord, copy: Copy, mode: "preview" | "publish" = "preview") => buildSite({ record, copy, site: site(), mode });

test("a business named Premier Auto Care publishes; hype in the AI text still fails", async () => {
  const ex = EXAMPLES.find((e) => e.record.category === "auto")!;
  const record = structuredClone(ex.record);
  record.name = "Premier Auto Care #1";
  record.address.street = "12 Elevate Dr";
  const out = await buildSite({ record, copy: ex.copy, site: site("premier"), mode: "publish" });
  assert.deepEqual(out.lint.errors, []);
  assert.match(String(out.files.get("index.html")), /Premier Auto Care #1/);
  const hype = structuredClone(ex.copy);
  hype.about = [...hype.about, "Look no further for honest car care."];
  await assert.rejects(buildSite({ record, copy: hype, site: site("premier"), mode: "publish" }), /banned phrase "look no further"/);
  assert.equal(bannedPhraseIn("Premiere Cleaning offers elevated service"), null, "whole words only");
  assert.equal(bannedPhraseIn("We're the #1 shop"), "#1");
  assert.equal(bannedPhraseIn("Mouth-watering ribs"), "mouth-watering");
});

test("copy-writer issues and loose numbers show as warnings, never blockers", async () => {
  const copy = sampleCopy({ issues: ["mentions the number 25, which isn't in the facts"], about: ["Over 25 years in business, and 3 generations."] });
  const out = await build(restaurantRecord(), copy);
  assert.ok(out.lint.warnings.some((w) => w.startsWith("AI text may need a look: mentions the number 25")));
  assert.ok(out.lint.warnings.some((w) => /mentions "25"/.test(w) && !/"3"/.test(w)), "single digits are left alone");
  assert.deepEqual(out.lint.errors, []);
  assert.deepEqual(unsupportedNumbers("Call 256 for 20 years", '{"phone":"256"}'), ["20"]);
  const grounded = await build(restaurantRecord({ foundedYear: 2001 }), sampleCopy({ about: ["Since 2001."] }));
  assert.ok(!grounded.lint.warnings.some((w) => /business facts/.test(w)));
});

test("no hours or testimonials: no empty columns or quote grids on live sites, hours only suggested", async () => {
  const ex = EXAMPLES.find((e) => e.record.category === "retail")!;
  const record = structuredClone(ex.record);
  record.hours = undefined;
  record.testimonials = [];
  const preview = await buildSite({ record, copy: ex.copy, site: site(), mode: "preview" });
  assert.ok(!preview.todos.includes("Add your hours") && preview.suggestions.includes("Add your hours"), "storefront hours are suggested, never required");
  const noHoursLive = await buildSite({ record, copy: ex.copy, site: site(), mode: "publish" });
  assert.ok(!noHoursLive.lint.publishBlockers.some((b) => /hours/i.test(b)) && noHoursLive.lint.errors.length === 0, "a shop without Google hours still publishes");
  assert.match(String(noHoursLive.files.get("index.html")), /class="visit visit--solo"/);
  const pub = await buildSite({ record: { ...record, hours: ex.record.hours }, copy: ex.copy, site: site(), mode: "publish" });
  const home = String(pub.files.get("index.html"));
  assert.match(home, /Read our reviews on Google/);
  assert.doesNotMatch(home, /class="quotes"/);
  assert.doesNotMatch(home, /<div class="wrap"><\/div>/, "no empty wrappers");
  const service = await build(categoryRecord("contractor"), sampleCopy());
  assert.ok(!service.todos.includes("Add your hours") && service.suggestions.includes("Add your hours"), "service-area packs only suggest hours");
  // A church without office hours renders one column; an auto shop without hours renders one column on the live site.
  const church = await build(categoryRecord("church", { hours: undefined }), sampleCopy());
  assert.match(String(church.files.get("index.html")), /class="visit visit--solo"/);
});

test("every heading an aria-labelledby points at exists", async () => {
  const records: Array<{ record: BusinessRecord; copy: Copy; look: string }> = EXAMPLES.map((e) => ({ record: e.record, copy: e.copy, look: e.design }));
  for (const cat of ["salon", "auto", "landscaping", "cleaning", "contractor", "finance", "church", "print", "retail"] as const) {
    records.push({ record: categoryRecord(cat, { hiring: { roles: ["Helper"] } }), copy: sampleCopy(), look: "" });
  }
  records.push({ record: categoryRecord("church", { variant: "charity", ext: { church: { help: "Tuesdays 9-11", liveUrl: "https://example.com/live" } } }), copy: sampleCopy(), look: "" });
  records.push({ record: categoryRecord("church", { variant: "civic_post", ext: { church: { meetings: "First Monday" } } }), copy: sampleCopy(), look: "" });
  records.push({ record: categoryRecord("church", { variant: "community_center", ext: { church: { hall: "Call to book" } } }), copy: sampleCopy(), look: "" });
  records.push({ record: categoryRecord("finance", { variant: "insurance", ext: { finance: { independent: true, carriers: ["Alfa"] } } }), copy: sampleCopy(), look: "" });
  for (const { record, copy, look } of records) {
    for (const mode of (record.confirmed.length ? ["preview", "publish"] : ["preview"]) as Array<"preview" | "publish">) {
      const out = await buildSite({ record, copy: { ...copy, es: copy.es ?? { heroTagline: "Hola", heroSub: "Sub", about: [], services: {}, faq: [], ctaTitle: "Llame", ctaLine: "Hoy", metaDescription: "x" } }, site: { slug: "a", look }, mode });
      for (const [path, content] of out.files) {
        if (!path.endsWith(".html")) continue;
        const html = String(content);
        const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
        for (const m of html.matchAll(/aria-labelledby="([^"]+)"/g)) {
          for (const id of m[1]!.split(/\s+/)) assert.ok(ids.has(id), `${record.name} ${mode} ${path}: aria-labelledby="${id}" has no matching id`);
        }
      }
    }
  }
});

test("favicon, link-preview image and cache headers", async () => {
  const ex = EXAMPLES[0]!;
  const plain = await buildSite({ record: ex.record, copy: ex.copy, site: site(), mode: "publish" });
  const home = String(plain.files.get("index.html"));
  assert.match(home, /<link rel="icon" href="data:image\/svg\+xml,/);
  assert.match(home, /%3Ctext[^>]*%3EM%3C%2Ftext%3E/, "the initial M");
  assert.match(home, /name="twitter:card" content="summary"/);
  assert.doesNotMatch(home, /og:image/);
  const record = structuredClone(ex.record);
  record.media.hero = { src: "/assets/owner/hero.jpg", alt: "Front door", source: "owner", width: 1600, height: 1000 };
  const withHero = await buildSite({ record, copy: ex.copy, site: site(), mode: "publish" });
  const h2 = String(withHero.files.get("index.html"));
  assert.match(h2, /property="og:image" content="https:\/\/example.test\/assets\/owner\/hero.jpg"/);
  assert.match(h2, /name="twitter:card" content="summary_large_image"/);
  record.media.hero.source = "google";
  const google = await buildSite({ record, copy: ex.copy, site: site(), mode: "preview" });
  assert.doesNotMatch(String(google.files.get("index.html")), /og:image/);
  const headers = String(plain.files.get("_headers"));
  assert.match(headers, /\/assets\/\*\n  Cache-Control: public, max-age=0, must-revalidate/);
  assert.match(headers, /\/assets\/fonts\/\*\n  Cache-Control: public, max-age=604800/);
});

test("menu label, church schema and Spanish nav and hours", async () => {
  const menu = { sections: [{ name: "Plates", items: [{ name: "Catfish plate", price: "$12" }] }], lastUpdated: "October 2026" };
  const plain = await build(restaurantRecord({ ext: { restaurant: { serviceOptions: {}, menu } } }), sampleCopy());
  assert.match(String(plain.files.get("index.html")), /From the menu/);
  const fav = await build(restaurantRecord({ ext: { restaurant: { serviceOptions: {}, menu, highlights: ["Catfish plate"] } } }), sampleCopy());
  assert.match(String(fav.files.get("index.html")), /Customer favorites/);
  const church = await build(categoryRecord("church"), sampleCopy());
  assert.doesNotMatch(String(church.files.get("index.html")), /hasOfferCatalog/);
  const es = { heroTagline: "Hola", heroSub: "Sub", about: [], services: {}, faq: [], ctaTitle: "Llame", ctaLine: "Hoy", metaDescription: "x", nav: { Reviews: "Opiniones" } };
  const out = await build(restaurantRecord({ hours: { weekly: [[], [{ open: "11:00", close: "20:30" }], [], [], [], [], []] } }), sampleCopy({ es }));
  const page = String(out.files.get("es/index.html"));
  assert.match(page, /11 a\. m\. – 8:30 p\. m\./);
  assert.match(page, /Cerrado/);
  assert.match(page, />Menú<\/a>/);
  assert.match(page, />Opiniones<\/a>/, "owner/translator label wins");
  assert.match(page, />Horario y ubicación<\/a>/);
  assert.match(page, /href="\/">English<\/a>/);
  assert.doesNotMatch(page, />Español<\/a>/);
  assert.match(String(out.files.get("index.html")), />Reviews<\/a>/, "English pages keep English labels");
  assert.equal(formatTime("12:00", { es: true }), "mediodía");
});

test("chains are filtered per category and as whole names", () => {
  for (const [name, cat] of [["Wendy's Hair Salon", "salon"], ["Jack's Auto Repair", "auto"], ["Logan's Barbershop", "salon"], ["Lowe's Lawn Care", "landscaping"], ["Darby's Diner", "restaurant"], ["Subway Cafe", "restaurant"], ["Goodwill Baptist Church", "church"]] as const) {
    assert.equal(isChain(name, cat), false, `${name} is independent`);
  }
  for (const [name, cat] of [["Wendy's", "restaurant"], ["Jack's Family Restaurant", "restaurant"], ["Lowe's Home Improvement", "retail"], ["Hardee's of Cullman", "restaurant"], ["Roto-Rooter Plumbing & Water Cleanup", "contractor"], ["Great Clips", "salon"], ["Safelite AutoGlass", "auto"], ["Terminix Pest Control", "contractor"]] as const) {
    assert.equal(isChain(name, cat), true, `${name} is a chain`);
  }
  assert.equal(isChain("Wendy's"), true, "no category: every list applies");
  assert.equal(isChain("Wendy's Hair Salon"), false);
});

test("booking pages count as no website; far-away and duplicate-phone places are dropped", () => {
  assert.equal(webPresence("https://booksy.com/en-us/12345_wendys-hair"), "social");
  assert.equal(webPresence("https://order.toasttab.com/online/darbys"), "social");
  assert.equal(webPresence("https://www.youtube.com/@shop"), "social");
  assert.equal(webPresence("https://darbys.square.site"), "social");
  assert.equal(webPresence("https://www.darbysdiner.com"), "has_site");
  const place = (id: string, name: string, over: Record<string, unknown> = {}) =>
    ({ id, displayName: { text: name }, businessStatus: "OPERATIONAL", nationalPhoneNumber: "(256) 555-0100", types: ["restaurant"], location: { latitude: 34.17, longitude: -86.84 }, ...over }) as never;
  const center = { lat: 34.1748, lng: -86.8436 };
  const leads = qualify(
    [
      place("a", "Darby's Diner", { websiteUri: "https://order.toasttab.com/online/darbys", userRatingCount: 40 }),
      place("b", "Darby's Diner (old listing)", { nationalPhoneNumber: "256-555-0100" }),
      place("c", "Far Away Grill", { nationalPhoneNumber: "(256) 555-0199", location: { latitude: 33.5, longitude: -86.8 } }),
      place("d", "Wendy's"),
    ],
    { category: "restaurant", center },
  );
  assert.deepEqual(leads.map((l) => l.place.id), ["a"]);
  assert.equal(leads[0]!.reason, "Only a booking/ordering page · 40 Google reviews");
  assert.equal(qualify([place("c", "Far Away Grill", { location: { latitude: 33.5, longitude: -86.8 } })], { category: "restaurant" }).length, 1, "no center, no distance cut");
});

test("new search groups map to the right template variants", () => {
  for (const id of ["septic_dirt", "doors_gutters_welding", "floors_drywall", "glass_muffler", "hardware", "restaurant_more"]) assert.ok(SEARCH_GROUPS.some((g) => g.id === id), id);
  assert.equal(contractorTrade(undefined, [], "Cullman Septic & Excavating"), "septic");
  assert.equal(contractorTrade(undefined, [], "Smith Dirt Work & Grading"), "septic");
  assert.equal(contractorTrade(undefined, [], "Overhead Door Co of Cullman"), "garage_door");
  assert.equal(contractorTrade(undefined, [], "Seamless Gutters by Ray"), "gutters");
  assert.equal(contractorTrade(undefined, [], "Precision Welding & Fabrication"), "welding");
  assert.equal(contractorTrade(undefined, [], "Hometown Flooring"), "flooring");
  assert.equal(contractorTrade(undefined, [], "A+ Drywall"), "drywall");
  assert.equal(contractorTrade(undefined, [], "Smith Plumbing & Septic"), "plumbing");
  assert.ok(seedServices("septic").some((s) => /pumping/.test(s.name)));
  assert.equal(autoVariant(undefined, [], "Cullman Auto Glass"), "glass");
  assert.equal(autoVariant(undefined, [], "Discount Muffler & Brake"), "exhaust");
  assert.equal(retailVariant(undefined, [], "Hanceville Hardware"), "hardware");
  assert.equal(retailVariant("hardware_store", [], "Smith Supply"), "hardware");
  const p = (name: string, type: string) => ({ id: name, displayName: { text: name }, primaryType: type, types: [type] }) as never;
  assert.equal(guessCategory(p("Cullman Septic Service", "point_of_interest")), "contractor");
  assert.equal(guessCategory(p("Ray's Garage Doors", "point_of_interest")), "contractor");
  assert.equal(guessCategory(p("Precision Welding", "point_of_interest")), "contractor");
  assert.equal(guessCategory(p("Cullman Auto Glass", "point_of_interest")), "auto");
  assert.equal(guessCategory(p("Vinemont Hardware", "hardware_store")), "retail");
  assert.equal(guessCategory(p("Catfish Haven", "point_of_interest")), "restaurant");
  assert.equal(guessCategory(p("Tokyo Hibachi", "japanese_restaurant")), "restaurant");
});

test("finance and church banned lists skip everyday phrases", () => {
  const fin = financeBannedPhrases(categoryRecord("finance"));
  for (const fine of ["Feel free to call us with questions.", "Call our toll-free line.", "We work with independent contractors and small businesses.", "You're free to stop by any time."]) {
    assert.ok(!fin.some((re) => re.test(fine)), fine);
  }
  for (const bad of ["Free consultation", "An independent agency", "free of charge"]) assert.ok(fin.some((re) => re.test(bad)), bad);
  const ch = churchBannedPhrases(categoryRecord("church"));
  for (const fine of ["Sunday 11:00 worship", "Wednesday 6:30 Bible study", "Doors open at 10:45", "Meet us Sunday 9:30-10:30"]) assert.ok(!ch.some((re) => re.test(fine)), fine);
  for (const bad of ["John 3:16", "1 Cor. 13:4", "Ps 23:1", "Romans 8:28 says"]) assert.ok(SCRIPTURE_REF.test(bad), bad);
  assert.ok(!SCRIPTURE_REF.test("john 3:16"), "book names are case-sensitive");
});

test("a bot-challenge 503 isn't a broken website", async () => {
  const real = globalThis.fetch;
  try {
    globalThis.fetch = (async () => new Response("<html><title>Just a moment...</title><script src='/cdn-cgi/challenge-platform/x'></script></html>", { status: 503 })) as unknown as typeof fetch;
    assert.equal(await websiteProblem("https://example.com"), null);
    globalThis.fetch = (async () => new Response("", { status: 503, headers: { "cf-mitigated": "challenge" } })) as unknown as typeof fetch;
    assert.equal(await websiteProblem("https://example.com"), null);
    globalThis.fetch = (async () => new Response("Service Unavailable", { status: 503 })) as unknown as typeof fetch;
    assert.equal(await websiteProblem("https://example.com"), "Website is down");
    globalThis.fetch = (async () => new Response("boom", { status: 500 })) as unknown as typeof fetch;
    assert.equal(await websiteProblem("https://example.com"), "Website is down");
  } finally {
    globalThis.fetch = real;
  }
});
