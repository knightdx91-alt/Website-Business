import assert from "node:assert/strict";
import { test } from "node:test";
import { OPEN_STATUS_SRC } from "../src/generator/client-script.ts";
import { contrast, repairBackground } from "../src/generator/color.ts";
import { formatTime, hoursSummary } from "../src/generator/hours.ts";
import { esc, html, jsonForScript } from "../src/generator/html.ts";
import { quotesReview } from "../src/generator/lint.ts";
import { normalizeUsPhone } from "../src/generator/phone.ts";
import { buildSite } from "../src/generator/render.ts";
import { LOOKS, resolveTheme } from "../src/generator/themes.ts";
import type { Hours } from "../src/generator/types.ts";
import { contractorRecord, loadFont, restaurantRecord, sampleCopy } from "./fixtures.ts";

test("phone normalization", () => {
  assert.deepEqual(normalizeUsPhone("(256) 555-0123"), { e164: "+12565550123", display: "(256) 555-0123" });
  assert.deepEqual(normalizeUsPhone("+1 256-555-0123")?.e164, "+12565550123");
  assert.equal(normalizeUsPhone("555-0123"), null);
  assert.equal(normalizeUsPhone("(056) 555-0123"), null);
});

test("html escapes interpolations and script JSON can't break out", () => {
  assert.equal(html`<p>${"<b>Tom & Jerry's</b>"}</p>`.value, "<p>&lt;b&gt;Tom &amp; Jerry&#39;s&lt;/b&gt;</p>");
  assert.equal(esc('"'), "&quot;");
  assert.ok(!jsonForScript({ x: "</script><script>alert(1)</script>" }).value.includes("</script>"));
});

test("hours formatting and summary", () => {
  assert.equal(formatTime("11:00"), "11 AM");
  assert.equal(formatTime("13:30"), "1:30 PM");
  assert.equal(formatTime("12:00"), "noon");
  const wk = [{ open: "11:00", close: "20:00" }];
  const h: Hours = { weekly: [[], wk, wk, wk, wk, wk, [{ open: "07:00", close: "14:00" }]] };
  assert.equal(hoursSummary(h), "Mon–Fri 11 AM – 8 PM · Sat 7 AM – 2 PM · Sun Closed");
});

test("open-now logic that ships to browsers", () => {
  const openStatus = new Function(`${OPEN_STATUS_SRC}; return openStatus;`)() as (h: Hours, n: { day: number; minutes: number }) => { open: boolean; text: string };
  const wk = [{ open: "11:00", close: "20:00" }];
  const h: Hours = { weekly: [[], wk, wk, wk, wk, [{ open: "11:00", close: "02:00" }], []] };
  assert.deepEqual(openStatus(h, { day: 1, minutes: 12 * 60 }), { open: true, text: "Open now · closes 8 PM" });
  assert.deepEqual(openStatus(h, { day: 1, minutes: 9 * 60 }), { open: false, text: "Closed · opens 11 AM" });
  assert.deepEqual(openStatus(h, { day: 1, minutes: 21 * 60 }), { open: false, text: "Closed · opens tomorrow 11 AM" });
  // Friday's late close runs past midnight into Saturday
  assert.deepEqual(openStatus(h, { day: 6, minutes: 60 }), { open: true, text: "Open now · closes 2 AM" });
  assert.deepEqual(openStatus(h, { day: 6, minutes: 12 * 60 }), { open: false, text: "Closed · opens Mon 11 AM" });
  assert.deepEqual(openStatus({ weekly: [], open24_7: true }, { day: 3, minutes: 0 }).open, true);
});

test("contrast math and repair", () => {
  assert.ok(Math.abs(contrast("#000000", "#ffffff") - 21) < 0.01);
  const fixed = repairBackground("#1A9E8F", "#FFFFFF");
  assert.ok(contrast("#FFFFFF", fixed) >= 4.5);
});

test("every look builds and passes AA", () => {
  for (const id of Object.keys(LOOKS)) assert.doesNotThrow(() => resolveTheme(id), id);
});

test("review text detection", () => {
  const review = "The brisket here is the most tender I have ever had in my whole life";
  assert.equal(quotesReview("Our brisket is smoked daily.", review), false);
  assert.equal(quotesReview("Folks say the brisket here is the most tender I have ever had.", review), true);
});

for (const [name, record] of [
  ["restaurant", restaurantRecord()],
  ["contractor", contractorRecord()],
] as const) {
  test(`${name} preview builds clean`, async () => {
    const out = await buildSite({ record, copy: sampleCopy(), site: { slug: "sample", look: "" }, mode: "preview", loadFont });
    assert.deepEqual(out.lint.errors, []);
    const home = out.files.get("index.html") as string;
    assert.equal((home.match(/<h1[\s>]/g) ?? []).length, 1);
    assert.ok(home.includes('href="tel:+12565550123"'));
    assert.ok(home.includes('name="robots" content="noindex'));
    assert.ok(!home.includes('rel="canonical"'));
    const ld = JSON.parse(/<script type="application\/ld\+json">(.*?)<\/script>/s.exec(home)![1]!);
    const biz = ld["@graph"][0];
    assert.equal(biz.telephone, "+12565550123");
    assert.ok(!("aggregateRating" in biz));
    assert.ok(out.lint.publishBlockers.length > 0, "unconfirmed preview must not be publishable");
  });

  test(`${name} publish is blocked until the owner confirms`, async () => {
    await assert.rejects(buildSite({ record, copy: sampleCopy(), site: { slug: "sample", look: "" }, mode: "publish", loadFont }), /Publish blocked/);
  });
}

test("restaurant schema type and menu page", async () => {
  const out = await buildSite({ record: restaurantRecord(), copy: sampleCopy(), site: { slug: "s", look: "" }, mode: "preview", loadFont });
  assert.ok(out.files.has("menu/index.html"));
  const home = out.files.get("index.html") as string;
  assert.ok(home.includes('"@type":"Restaurant"'));
  assert.equal(out.look, "restaurant.pit_plank");
});

test("contractor has form, privacy page and trade schema", async () => {
  const out = await buildSite({ record: contractorRecord(), copy: sampleCopy(), site: { slug: "s", look: "" }, mode: "preview", loadFont });
  assert.ok(out.files.has("privacy/index.html"));
  const home = out.files.get("index.html") as string;
  assert.ok(home.includes('"@type":"Plumber"'));
  assert.ok(home.includes("Plumbing in Cullman, AL"));
  assert.ok(home.includes('<form class="form"'));
  assert.ok(!home.includes("100 Main Ave"), "service-area business hides the street");
});

test("fully confirmed site with owner content publishes", async () => {
  const record = restaurantRecord({
    confirmed: ["name", "phone", "address", "hours", "menu"],
    testimonials: [
      { quote: "Best Saturday lunch spot.", displayName: "Amy R." },
      { quote: "Friendly folks.", displayName: "Joe" },
    ],
    ext: {
      restaurant: {
        serviceOptions: { dineIn: true },
        menu: { sections: [{ name: "Plates", items: [{ name: "Pulled pork plate", price: "$12" }] }], lastUpdated: "October 2026" },
      },
    },
  });
  const copy = sampleCopy({ approved: true, about: [] });
  const out = await buildSite({ record, copy, site: { slug: "s", look: "" }, mode: "publish", loadFont });
  assert.ok(out.files.has("sitemap.xml"));
  assert.ok((out.files.get("index.html") as string).includes('rel="canonical" href="https://s.pages.dev/"'));
});

test("basePath prefixes internal links and assets for previews", async () => {
  const out = await buildSite({ record: restaurantRecord(), copy: sampleCopy(), site: { slug: "s", look: "" }, mode: "preview", basePath: "/p/abc" });
  const home = out.files.get("index.html") as string;
  assert.ok(home.includes('href="/p/abc/assets/site.css"'));
  assert.ok(home.includes('href="/p/abc/menu/"'));
  assert.ok(home.includes('href="tel:+12565550123"'));
  assert.ok(!/(href|src)="\/(?!p\/abc|\/)/.test(home), "no unprefixed internal links");
  assert.ok((out.files.get("assets/site.css") as string).includes("url(/p/abc/assets/fonts/"));
  assert.ok(![...out.files.keys()].some((k) => k.startsWith("assets/fonts/")), "fonts left out when loadFont is omitted");
});

test("suggested to-dos show in previews but don't block publishing", async () => {
  const record = restaurantRecord({
    confirmed: ["name", "phone", "address", "hours", "menu"],
    ext: { restaurant: { serviceOptions: {}, menu: { sections: [{ name: "Plates", items: [{ name: "Plate", price: "$9" }] }], lastUpdated: "October 2026" } } },
  });
  const preview = await buildSite({ record, copy: sampleCopy({ approved: false }), site: { slug: "s", look: "" }, mode: "preview" });
  assert.ok(preview.suggestions.includes("Add 3 customer quotes"));
  assert.ok(preview.suggestions.includes("Tell us your story"));
  assert.deepEqual(preview.todos, []);
  const out = await buildSite({ record, copy: sampleCopy({ approved: true }), site: { slug: "s", look: "" }, mode: "publish", loadFont });
  assert.ok(!(out.files.get("index.html") as string).includes("data-todo"));
});

test("menu is required before a restaurant can publish", async () => {
  const record = restaurantRecord({ confirmed: ["name", "phone", "address", "hours"] });
  const preview = await buildSite({ record, copy: sampleCopy({ approved: true }), site: { slug: "s", look: "" }, mode: "preview" });
  assert.ok(preview.todos.includes("Send us your menu"));
});

import { categoryRecord } from "./fixtures.ts";
import { parsePrice } from "../src/generator/price.ts";

test("price parsing", () => {
  assert.deepEqual(parsePrice("$25"), { mode: "exact", amount: 25 });
  assert.deepEqual(parsePrice("from $80"), { mode: "from", amount: 80 });
  assert.deepEqual(parsePrice("$30-$45"), { mode: "range", min: 30, max: 45 });
  assert.deepEqual(parsePrice("consult"), { mode: "quote" });
  assert.equal(parsePrice("call us"), undefined);
});

const EXPECTED_TYPE = { salon: '"HairSalon"', auto: '"AutoRepair"', landscaping: '"HomeAndConstructionBusiness"', cleaning: '"LocalBusiness"' } as const;
for (const cat of ["salon", "auto", "landscaping", "cleaning"] as const) {
  test(`${cat} preview builds clean with the right schema type`, async () => {
    const out = await buildSite({ record: categoryRecord(cat), copy: sampleCopy({ cuisineLabel: undefined }), site: { slug: "s", look: "" }, mode: "preview" });
    assert.deepEqual(out.lint.errors, []);
    const home = out.files.get("index.html") as string;
    assert.equal((home.match(/<h1[\s>]/g) ?? []).length, 1);
    assert.ok(home.includes(`"@type":${EXPECTED_TYPE[cat]}`), `schema type for ${cat}`);
    assert.ok(home.includes('href="tel:+12565550123"'));
    assert.ok(out.look.startsWith(`${cat}.`));
    assert.ok(out.todos.length > 0, "an unconfirmed lead has required to-dos");
  });

  test(`${cat} publishes once the owner confirms everything`, async () => {
    const extra: Record<string, unknown> = cat === "salon" ? { salon: { walkIns: "welcome" } } : { [cat]: {} };
    const record = categoryRecord(cat, {
      confirmed: ["name", "phone", "address", "hours", "services", "service_area"],
      ext: extra,
    });
    const out = await buildSite({ record, copy: sampleCopy({ approved: true, cuisineLabel: undefined }), site: { slug: "s", look: "" }, mode: "publish", loadFont });
    assert.ok(out.files.has("sitemap.xml"));
    assert.ok(!(out.files.get("index.html") as string).includes("data-todo"));
  });
}

test("service-area categories hide the street; storefronts show it", async () => {
  for (const [cat, shows] of [["landscaping", false], ["cleaning", false], ["auto", true], ["salon", true]] as const) {
    const out = await buildSite({ record: categoryRecord(cat), copy: sampleCopy(), site: { slug: "s", look: "" }, mode: "preview" });
    assert.equal((out.files.get("index.html") as string).includes("100 Main Ave"), shows, cat);
  }
});

test("salon prices and walk-in badge render from owner data", async () => {
  const record = categoryRecord("salon", {
    services: [{ id: "cut", name: "Haircut", price: { mode: "exact", amount: 25 } }],
    ext: { salon: { walkIns: "welcome" } },
  });
  const home = (await buildSite({ record, copy: sampleCopy(), site: { slug: "s", look: "" }, mode: "preview" })).files.get("index.html") as string;
  assert.ok(home.includes("$25"));
  assert.ok(home.includes("Walk-ins welcome"));
});

test("auto trust chips only come from owner facts", async () => {
  const plain = (await buildSite({ record: categoryRecord("auto"), copy: sampleCopy(), site: { slug: "s", look: "" }, mode: "preview" })).files.get("index.html") as string;
  assert.ok(!plain.includes("ASE") && !plain.includes("warranty"));
  const record = categoryRecord("auto", { ext: { auto: { ase: true, warranty: { months: 36, miles: 36000, nationwide: true } } } });
  const home = (await buildSite({ record, copy: sampleCopy(), site: { slug: "s", look: "" }, mode: "preview" })).files.get("index.html") as string;
  assert.ok(home.includes("ASE-certified"));
  assert.ok(home.includes("36-month / 36,000-mile warranty, nationwide"));
});

test("superlative check allows advice phrasing", async () => {
  const { SUPERLATIVE } = await import("../src/generator/lint.ts");
  assert.equal(SUPERLATIVE.test("Fall is the best time to aerate."), false);
  assert.equal(SUPERLATIVE.test("We keep your business clean."), false);
  assert.equal(SUPERLATIVE.test("The best plumber in Cullman."), true);
  assert.equal(SUPERLATIVE.test("Best in town barbecue."), true);
});
