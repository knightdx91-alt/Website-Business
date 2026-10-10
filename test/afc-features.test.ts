import assert from "node:assert/strict";
import { test } from "node:test";
import { autoBannedPhrases, seedAutoServices, towLine } from "../src/generator/packs/auto.ts";
import { parseScheduleRow, sundayTimes, timesLine } from "../src/generator/packs/church.ts";
import { carrierItems, inSeason, seedFinanceServices } from "../src/generator/packs/finance.ts";
import { OPEN_STATUS_SRC } from "../src/generator/client-script.ts";
import { buildSite } from "../src/generator/render.ts";
import { extraPhones } from "../src/generator/phone.ts";
import { todayIso } from "../src/generator/components.ts";
import type { BusinessRecord, Copy } from "../src/generator/types.ts";
import { categoryRecord, sampleCopy } from "./fixtures.ts";

const LIVE: Partial<BusinessRecord> = { confirmed: ["name", "phone", "address", "hours", "services", "service_area"] };
const approved = (over: Partial<Copy> = {}) => sampleCopy({ approved: true, ...over });
const build = (record: BusinessRecord, mode: "preview" | "publish" = "preview", copy = mode === "publish" ? approved() : sampleCopy()) =>
  buildSite({ record, copy, site: { slug: "t", look: "", origin: mode === "publish" ? "https://t.pages.dev" : undefined }, mode, formEndpoint: "https://app.example/f/1" });
const home = (out: Awaited<ReturnType<typeof buildSite>>) => String(out.files.get("index.html"));
/** The look with the "utility" top bar DNA, so header lines can be checked. */
const UTIL = "auto.shop_floor~classic~h0n3b0s0v0c0f0a0p0";

const auto = (variant: string, ext: NonNullable<BusinessRecord["ext"]["auto"]> = {}, over: Partial<BusinessRecord> = {}) =>
  categoryRecord("auto", { variant, services: seedAutoServices(variant), ext: { auto: ext }, smsEnabled: true, ...over });

test("auto: amenities, warranty & programs band, financing render when set and nothing when empty", async () => {
  const empty = await build(auto("general"));
  assert.deepEqual(empty.lint.errors, []);
  const h0 = home(empty);
  assert.ok(!h0.includes('class="amen"') && !h0.includes('id="warranty"') && !h0.includes('class="tow"'), "nothing extra on an empty record");

  const filled = await build(auto("general", { amenities: ["loaner", "key_drop", "wifi"], programs: ["NAPA AutoCare", "TechNet"], financing: { lender: "Synchrony Car Care", url: "https://example.com/apply" }, warranty: { months: 36, miles: 36000, nationwide: true } }));
  assert.deepEqual(filled.lint.errors, []);
  const h = home(filled);
  assert.ok(h.includes('class="amen"') && h.includes("Loaner cars") && h.includes("After-hours key drop") && h.includes("Waiting room with Wi-Fi"), "Good to know row");
  assert.ok(h.indexOf('class="amen"') < h.indexOf('id="services"'), "amenities sit under the opening, before services");
  assert.ok(h.includes('id="warranty"') && h.includes("36-month / 36,000-mile warranty, honored nationwide"), "warranty band");
  assert.ok(h.includes("NAPA AutoCare") && h.includes("TechNet"), "program chips");
  assert.ok(h.includes("Financing available") && h.includes("Synchrony Car Care") && h.includes('href="https://example.com/apply"'), "financing line + link");
  assert.ok(!/\.png|\.svg|<img[^>]*napa/i.test(h.slice(h.indexOf('id="warranty"'), h.indexOf('id="how"'))), "programs are text only");
  const live = await build(auto("general", { amenities: ["loaner"], programs: ["TechNet"] }, LIVE), "publish");
  assert.deepEqual(live.lint.errors, []);
});

test("auto: the utility top bar carries the review count wherever reviews are allowed and the count is 10+", async () => {
  const h = home(await buildSite({ record: auto("general"), copy: sampleCopy(), site: { slug: "t", look: UTIL }, mode: "preview" }));
  assert.ok(h.includes('class="util__rev"') && h.includes("4.6 · 210 reviews"), "rating and count in the util bar");
  const few = home(await buildSite({ record: auto("general", {}, { reputation: { rating: 5, count: 4, displayMode: "link_only" } }), copy: sampleCopy(), site: { slug: "t", look: UTIL }, mode: "preview" }));
  assert.ok(!few.includes('class="util__rev"'), "not under 10 reviews");
  const church = home(await buildSite({ record: categoryRecord("church"), copy: sampleCopy(), site: { slug: "t", look: "church.country_chapel~classic~h0n3b0s0v0c0f0a0p0" }, mode: "preview" }));
  assert.ok(!church.includes('class="util__rev"') && !church.includes("Google reviews"), "never for churches");
  const plain = home(await build(auto("general")));
  assert.ok(!plain.includes('class="util__rev"'), "only the utility top bar has it");
});

test("auto towing: tow strip, separate tow line, text-your-location, and 24/7 only once confirmed", async () => {
  const base = auto("towing", { tow: { phone: "(256) 555-0199", always: false, yardNote: "Yard pickup weekdays 8 to 5." } });
  assert.deepEqual(towLine(base), { e164: "+12565550199", display: "(256) 555-0199", separate: true });
  assert.deepEqual(extraPhones(base), ["+12565550199"]);
  const out = await build(base);
  assert.deepEqual(out.lint.errors, [], "a second tel: number is allowed when it's the tow line");
  const h = home(out);
  assert.ok(h.includes('class="tow"') && h.includes("Need a tow?") && h.includes('href="tel:+12565550199"'), "tow strip with the tow line");
  assert.ok(h.includes("Text us your location") && h.includes('href="sms:+12565550123"'), "sms link when texts are on");
  assert.ok(h.includes("Yard pickup weekdays 8 to 5."), "yard note");
  assert.ok(!/>24\/7</.test(h), "no 24/7 until confirmed");
  assert.ok(!out.todos.some((t) => /24\/7/.test(t)), "no required to-do when nothing claims 24/7");

  const claims = await build(auto("towing", { tow: { always: false } }), "preview", sampleCopy({ heroSub: "We tow 24/7 across Cullman County." }));
  assert.ok(claims.todos.includes("Confirm 24/7 towing"), "24/7 in the copy needs the owner's confirmation");
  assert.ok(claims.lint.errors.some((e) => /24\/7/.test(e)), "and the AI text is flagged");
  assert.ok(home(claims).includes('href="tel:+12565550123"'), "falls back to the shop line");
  await assert.rejects(build(auto("towing", { tow: { always: false } }, LIVE), "publish", approved({ heroSub: "We tow 24/7 across Cullman County." })), /24\/7/);

  const ok = await build(auto("towing", { tow: { phone: "256-555-0199", always: true } }, LIVE), "publish", approved({ heroSub: "We tow 24/7 across Cullman County." }));
  assert.deepEqual(ok.lint.errors, []);
  assert.ok(home(ok).includes(">24/7<") || /24\/7<\/span>/.test(home(ok)), "24/7 shows once confirmed");
  assert.ok(!autoBannedPhrases(auto("towing", { tow: { always: true } })).some((re) => re.test("open 24/7")));
  assert.ok(autoBannedPhrases(auto("general")).some((re) => re.test("EV certified technicians")));
});

test("auto tire: quote form by size or vehicle, brands and storefront", async () => {
  const empty = await build(auto("tire"));
  assert.deepEqual(empty.lint.errors, []);
  const h0 = home(empty);
  for (const n of ["tire_size", "year", "make", "model", "quantity", "brand"]) assert.ok(h0.includes(`name="${n}"`), `field ${n}`);
  assert.ok(h0.includes('name="topic" value="Tire quote"') && h0.includes("Get a tire quote"));
  assert.ok(h0.includes('placeholder="265/70R17"'));
  assert.ok(!h0.includes("Shop tires online") && !h0.includes("Brands we carry"));
  assert.ok(empty.suggestions.some((t) => /tire brands/i.test(t)));
  const filled = await build(auto("tire", { tireBrands: ["Michelin", "Cooper"], storeUrl: "https://example.com/tires" }, LIVE), "publish");
  assert.deepEqual(filled.lint.errors, []);
  const h = home(filled);
  assert.ok(h.includes("Brands we carry") && h.includes("Michelin") && h.includes("Cooper"));
  assert.ok(h.includes("Shop tires online") && h.includes('href="https://example.com/tires"'));
  assert.ok(h.includes(">Tire quote</a></li>"), "nav says Tire quote");
});

test("auto body: after-an-accident steps, insurers, certifications, right-to-choose only when confirmed, before/after to-do", async () => {
  const empty = await build(auto("body"));
  assert.deepEqual(empty.lint.errors, []);
  const h0 = home(empty);
  assert.ok(h0.includes('id="claims"') && h0.includes("Call us") && h0.includes("We work with your insurance") && h0.includes("We handle the rest"));
  assert.ok(!h0.includes("<strong>You choose the shop.</strong>") && !h0.includes("Insurance companies we work with"));
  assert.ok(empty.suggestions.includes("Send 3 before/after pairs") && empty.suggestions.some((t) => /Right-to-choose/.test(t)));
  assert.ok(!empty.todos.some((t) => /Right-to-choose/.test(t)), "right-to-choose is suggested, not required");
  const filled = await build(auto("body", { body: { insurers: ["State Farm", "Alfa"], certifications: ["I-CAR Gold Class"], rightToChooseConfirmed: true, estimateNote: "Text us photos for a same-day rough estimate." } }, LIVE), "publish");
  assert.deepEqual(filled.lint.errors, []);
  const h = home(filled);
  assert.ok(h.includes("<strong>You choose the shop.</strong>") && h.includes("State Farm") && h.includes("I-CAR Gold Class") && h.includes("Text us photos for a same-day rough estimate."));
  assert.ok(h.includes(">After an accident</a></li>"), "nav item");
});

const fin = (variant: string, ext: NonNullable<BusinessRecord["ext"]["finance"]> = {}, over: Partial<BusinessRecord> = {}) =>
  categoryRecord("finance", { variant, services: seedFinanceServices(variant), showStreetAddress: true, hours: categoryRecord("salon").hours, ext: { finance: { ptinConfirmed: true, licensesConfirmed: true, ...ext } }, serviceArea: undefined, ...over });

test("finance: people section with a required confirmation, who-we-serve line, fees with the as-of month", async () => {
  const empty = await build(fin("accounting"));
  assert.deepEqual(empty.lint.errors, []);
  assert.ok(!home(empty).includes('id="people"') && !home(empty).includes('id="fees"') && !home(empty).includes('id="who"'));
  const filled = await build(fin("accounting", { people: [{ name: "Jane Smith", title: "Owner", credentials: "Enrolled Agent", line: "Jane has kept books in Cullman since 2009." }, { name: "Tom Lee", title: "Bookkeeper" }], whoWeServe: "farms, trucking companies and small contractors", fees: [{ service: "Monthly bookkeeping", price: "from $250" }], feesAsOf: "October 2026" }));
  assert.deepEqual(filled.lint.errors, []);
  const h = home(filled);
  assert.ok(h.includes('id="people"') && h.includes("Who you&#39;ll work with") && h.includes("Jane Smith") && h.includes("Owner · Enrolled Agent") && h.includes("Tom Lee"));
  assert.ok(h.indexOf('id="services"') < h.indexOf('id="people"'), "people come after services");
  assert.ok(h.includes("Who we serve:</strong> farms, trucking companies and small contractors."));
  assert.ok(h.includes('id="fees"') && h.includes("Monthly bookkeeping") && h.includes("from $250") && h.includes("Fees shown as of October 2026; call to confirm."));
  assert.ok(filled.todos.includes("Confirm names and credentials"));
  await assert.rejects(build(fin("accounting", { people: [{ name: "Jane Smith", title: "Owner" }] }, LIVE), "publish"), /Confirm names and credentials/);
  const ok = await build(fin("accounting", { people: [{ name: "Jane Smith", title: "Owner" }], peopleConfirmed: true }, LIVE), "publish");
  assert.deepEqual(ok.lint.errors, []);
  const noDate = await build(fin("accounting", { fees: [{ service: "Payroll", price: "$60/month" }] }));
  assert.ok(home(noDate).includes("Call to confirm current fees.") && noDate.suggestions.some((t) => /fees last set/.test(t)));
});

test("finance tax_prep: season hours switch by date; the open/closed pill stays on Google hours", async () => {
  const today = todayIso().slice(5);
  const [mm, dd] = today.split("-").map(Number) as [number, number];
  const pad = (n: number) => String(n).padStart(2, "0");
  const nextMonth = `${pad((mm % 12) + 1)}-${pad(Math.min(dd, 28))}`;
  const inside = { from: today, to: nextMonth, summary: "Monday to Friday 8 to 7, Saturday 9 to 3" };
  const outside = { from: nextMonth, to: nextMonth, summary: "Monday to Friday 8 to 7, Saturday 9 to 3" };
  assert.ok(inSeason(inside) && !inSeason(outside));
  assert.ok(inSeason({ from: "11-01", to: "02-15" }, "12-20") && inSeason({ from: "11-01", to: "02-15" }, "01-10") && !inSeason({ from: "11-01", to: "02-15" }, "06-01"), "windows may wrap the year");
  assert.ok(!inSeason({ from: "bad", to: "04-15" }));

  const inW = home(await build(fin("tax_prep", { seasonHours: inside })));
  assert.ok(inW.includes("Tax season hours") && inW.includes(">Now</span>") && inW.includes("Rest of the year"), "season first with a chip");
  assert.ok(inW.indexOf("Tax season hours") < inW.indexOf('class="hours"'), "season block above the regular table");
  assert.ok(inW.includes('data-open-status') && inW.includes('id="hours-data"'), "status pill still from Google hours");
  assert.ok(/class="chip">(?:<svg[\s\S]*?<\/svg>)?Tax season hours/.test(inW), "strip chip while in season");
  const outW = home(await build(fin("tax_prep", { seasonHours: outside })));
  assert.ok(outW.includes("Tax season hours") && !outW.includes(">Now</span>") && !outW.includes("Rest of the year"));
  assert.ok(outW.indexOf('class="hours"') < outW.indexOf("Tax season hours"), "regular hours first when out of season");
  const none = home(await build(fin("tax_prep")));
  assert.ok(!none.includes("Tax season hours"));
});

test("finance insurance: coverage-first quote block, service centre from carriers, memberships, compatible with names-only carriers", async () => {
  const names = await build(fin("insurance", { carriers: ["Progressive", "Auto-Owners"], independent: true }));
  assert.deepEqual(names.lint.errors, []);
  assert.deepEqual(carrierItems({ carriers: ["Progressive", { name: "Auto-Owners", payUrl: "https://example.com" }] }).map((c) => c.name), ["Progressive", "Auto-Owners"]);
  assert.deepEqual(carrierItems(undefined), []);
  const h0 = home(names);
  assert.ok(h0.includes("Companies we work with: Progressive, Auto-Owners.") && !h0.includes('id="service-center"'));
  assert.ok(h0.includes("Start a quote") && h0.includes('name="topic" value="Quote"'));
  const form = h0.slice(h0.indexOf('<form class="form"'), h0.indexOf("</form>"));
  assert.ok(form.indexOf('name="service"') < form.indexOf('name="name"'), "coverage type comes first");
  for (const c of ["Auto", "Home", "Life", "Business", "Other"]) assert.ok(form.includes(`<option>${c}</option>`), c);
  assert.ok(!form.includes("<option>Medicare</option>"), "Medicare only when they sell it");
  assert.ok(h0.includes("4.6 on Google · 210 reviews"), "review count beside the quote block");

  const centre = await build(fin("insurance", { medicare: true, tpmoDisclaimer: "We do not offer every plan available in your area.", memberships: ["Trusted Choice", "Big “I”"], carriers: [{ name: "Progressive", payUrl: "https://example.com/pay", claimsPhone: "800-555-0100", claimsUrl: "https://example.com/claims" }, "Auto-Owners"] }, LIVE), "publish");
  assert.deepEqual(centre.lint.errors, [], "a carrier claims number is an allowed tel: link");
  const h = home(centre);
  assert.ok(h.includes('id="service-center"') && h.includes("Pay a bill") && h.includes("Report a claim") && h.includes('href="tel:+18005550100"') && h.includes("(800) 555-0100"));
  assert.ok(h.includes("Trusted Choice") && h.includes("Member of"));
  assert.ok(h.includes("<option>Medicare</option>"));
});

test("finance advisor: reviews stay off until compliance approves, then the SEC line sits under them; TPMO to-do names the October 2026 wording", async () => {
  const off = await build(fin("financial_advisor", { disclosure: "Securities offered through Example, Member FINRA/SIPC.", complianceApprovedBy: "J. Doe", complianceApprovedOn: "2026-10-01", brokercheckUrl: "https://brokercheck.finra.org/x" }, { testimonials: [{ quote: "Great to work with.", displayName: "A client" }] }));
  assert.ok(!home(off).includes('id="reviews"') && !home(off).includes("no compensation was paid"));
  const on = await build(fin("financial_advisor", { disclosure: "Securities offered through Example, Member FINRA/SIPC.", complianceApprovedBy: "J. Doe", complianceApprovedOn: "2026-10-01", brokercheckUrl: "https://brokercheck.finra.org/x", advisorReviewsApproved: { by: "J. Doe, CCO", on: "2026-10-05" } }, { testimonials: [{ quote: "Great to work with.", displayName: "A client" }] }));
  assert.deepEqual(on.lint.errors, []);
  const h = home(on);
  assert.ok(h.includes('id="reviews"') && h.includes("These reviews were given by clients; no compensation was paid. Conflicts of interest: none."));
  assert.ok(h.indexOf('id="reviews"') < h.indexOf('id="reviews-disclosure"'));
  assert.ok(!h.includes('class="util__rev"') && !h.includes("hero__proof"), "no Google rating badges for advisors even then");
  const med = await build(fin("insurance", { medicare: true }));
  assert.ok(med.todos.includes("Paste the Medicare disclaimer"));
  assert.ok(home(med).includes("current (October 2026) CMS wording") && home(med).includes("SHIP"));
});

const church = (variant: string, ext: NonNullable<BusinessRecord["ext"]["church"]> = {}, over: Partial<BusinessRecord> = {}) =>
  categoryRecord("church", { variant, showStreetAddress: true, ext: { church: ext }, serviceArea: undefined, ...over });
const SCHEDULE = [
  { day: "Sunday", time: "9:45 AM", label: "Sunday School" },
  { day: "Sunday", time: "11:00 AM", label: "Worship" },
  { day: "Sunday", time: "2:00 PM", label: "Servicio en español", lang: "es" as const },
  { day: "Wednesday", time: "6:30", label: "Prayer & Bible Study" },
];

test("church: times under the H1 with a next-service chip, Sunday times in the utility bar, Spanish rows tagged", async () => {
  assert.deepEqual(parseScheduleRow({ day: "Sunday", time: "10:30 AM", label: "x" }), { d: 0, m: 630 });
  assert.deepEqual(parseScheduleRow({ day: "Wed", time: "6:30", label: "x" }), { d: 3, m: 18 * 60 + 30 }, "a bare 6:30 on a weeknight is the evening");
  assert.deepEqual(parseScheduleRow({ day: "Sun", time: "11", label: "x" }), { d: 0, m: 660 });
  assert.equal(parseScheduleRow({ day: "Weekdays", time: "8:00 AM", label: "x" }), null);
  assert.equal(parseScheduleRow({ day: "Sunday", time: "", label: "x" }), null);
  const r = church("church", { schedule: SCHEDULE, scheduleConfirmed: true, traditionLabel: "Baptist church", traditionConfirmed: true, pastor: { name: "Bro. Tom" } });
  assert.equal(timesLine(r), "Sundays · 9:45 AM Sunday School · 11:00 AM Worship");
  assert.equal(sundayTimes(r), "Sundays 9:45 AM · 11:00 AM · 2:00 PM");
  assert.equal(timesLine(church("church", { schedule: SCHEDULE })), "", "nothing before the church confirms the schedule");

  const out = await buildSite({ record: r, copy: sampleCopy(), site: { slug: "t", look: "church.country_chapel~classic~h0n3b0s0v0c0f0a0p0" }, mode: "preview" });
  assert.deepEqual(out.lint.errors, []);
  const h = home(out);
  assert.ok(h.includes('class="hero__note"') && h.includes("Sundays · 9:45 AM Sunday School · 11:00 AM Worship"), "times line in the opening");
  assert.ok(h.indexOf('class="hero__note"') < h.indexOf('id="main"'));
  assert.ok(/data-next-service="\[\{&quot;d&quot;:0,&quot;m&quot;:585\}/.test(h) || h.includes('data-next-service="[{"d":0,"m":585}'), "parsed rows for the chip");
  assert.ok(h.includes('data-tz="America/Chicago"'));
  const util = h.slice(h.indexOf('class="util"'), h.indexOf('<header'));
  assert.ok(util.includes("Sundays 9:45 AM · 11:00 AM · 2:00 PM") && !util.includes("data-today-hours"), "utility bar shows Sunday times, not office hours");
  assert.ok(h.includes('class="schedule__lang" lang="es">en español'), "Spanish row badge");
  assert.ok(!h.includes("Google reviews"), "no review links for churches");

  const plain = home(await build(church("church", { schedule: SCHEDULE, scheduleConfirmed: true })));
  assert.ok(!plain.includes('class="util"') && plain.includes('class="hero__note"'));
  const unconfirmed = home(await build(church("church", { schedule: SCHEDULE })));
  assert.ok(!unconfirmed.includes('class="hero__note"') && !unconfirmed.includes("data-next-service"));
});

test("church: the next-service script picks the soonest row", () => {
  const fn = new Function(`${OPEN_STATUS_SRC}
    function next(rows, now) { var best = null; for (var i = 0; i < rows.length; i++) { var delta = ((rows[i].d - now.day) * 1440 + rows[i].m - now.minutes + 10080) % 10080; if (best === null || delta < best.delta) best = { delta: delta, row: rows[i] }; }
      var mm = best.row.m, hh = Math.floor(mm / 60), mi = mm % 60; return ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][best.row.d] + " " + fmtTime((hh < 10 ? "0" + hh : hh) + ":" + (mi < 10 ? "0" + mi : mi)); }
    return next;`)() as (rows: Array<{ d: number; m: number }>, now: { day: number; minutes: number }) => string;
  const rows = [{ d: 0, m: 585 }, { d: 0, m: 660 }, { d: 3, m: 1110 }];
  assert.equal(fn(rows, { day: 1, minutes: 600 }), "Wednesday 6:30 PM");
  assert.equal(fn(rows, { day: 0, minutes: 600 }), "Sunday 11 AM", "later today");
  assert.equal(fn(rows, { day: 5, minutes: 600 }), "Sunday 9:45 AM", "wraps to next week");
});

test("church: plan-a-visit link, kids & students, watch line + podcast, connect row (links only, no forms)", async () => {
  const empty = await build(church("church", { schedule: SCHEDULE, scheduleConfirmed: true }));
  const h0 = home(empty);
  assert.ok(!h0.includes('id="kids"') && !h0.includes('id="connect"') && !h0.includes('id="watch"'));
  assert.ok(h0.includes('href="#plan"'), "our anchor when they have no form");
  const filled = await build(church("church", {
    schedule: SCHEDULE, scheduleConfirmed: true,
    planVisitUrl: "https://example.churchcenter.com/people/forms/1", connectCardUrl: "https://example.com/card", prayerUrl: "mailto:pastor@example.com", bulletinUrl: "https://example.com/bulletin.pdf", appUrl: "https://example.com/app", podcastUrl: "https://example.com/podcast",
    liveUrl: "https://example.com/live", liveNote: "Live Sundays at 10:30 on Facebook",
    kids: { nursery: "Birth through age 3 during both services.", students: "Youth meet Wednesdays at 6:30." },
  }));
  assert.deepEqual(filled.lint.errors, []);
  const h = home(filled);
  assert.ok(h.includes('href="https://example.churchcenter.com/people/forms/1"') && !h.includes('href="#plan"'), "Plan a visit goes to their form");
  assert.ok(h.includes('id="kids"') && h.includes("Birth through age 3") && h.includes("Youth meet Wednesdays") && !h.includes("Check-in"));
  assert.ok(h.includes(">Kids</a></li>"), "nav item");
  assert.ok(h.includes('id="watch"') && h.includes("Live Sundays at 10:30 on Facebook") && h.includes(">Podcast<"));
  assert.ok(h.includes('id="connect"') && h.includes('href="mailto:pastor@example.com"') && h.includes("Send a prayer request") && h.includes("This week&#39;s bulletin") && h.includes("Get our app") && h.includes("Connect card"));
  assert.ok(!h.includes("<form"), "no forms on a church site");
  assert.ok(!filled.files.has("privacy/index.html"));
});

test("church charity + civic: events section placed after the opening, volunteer link, hall chips", async () => {
  const soon = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
  const charity = await build(church("charity", { help: "Tuesdays and Thursdays 9 to noon. Bring a photo ID.", volunteerUrl: "https://example.com/volunteer", donateUrl: "https://example.com/give" }, { events: [{ title: "Food distribution", date: soon, time: "9 AM to noon" }] }));
  assert.deepEqual(charity.lint.errors, []);
  const h = home(charity);
  assert.ok(h.includes('id="events"') && h.includes(">This season<") && h.includes("Coming up") && h.includes("Food distribution"));
  assert.ok(h.indexOf('id="events"') < h.indexOf('id="help"'), "events right after the opening");
  assert.ok(h.includes("Sign up to volunteer") && h.includes('href="https://example.com/volunteer"'));

  const post = await build(church("civic_post", { meetings: "2nd Tuesday, 6:30 PM", hallDetails: { capacity: "150", kitchen: true, tables: "20 tables, 160 chairs", how: "Call the post home Tuesday to Friday, 10 to 2." } }, { name: "Sample VFW Post 1234" }));
  assert.deepEqual(post.lint.errors, []);
  const p = home(post);
  assert.ok(p.includes("Hall rental") && p.includes("Seats 150") && p.includes(">Kitchen<") || p.includes("Kitchen</li>"), "hall chips");
  assert.ok(p.includes("Tables &amp; chairs: 20 tables, 160 chairs") && p.includes("To book:</strong> Call the post home"));
  assert.ok(p.includes("Can I rent the building?"), "FAQ from the how-to-book line");
  const center = home(await build(church("community_center", { hallDetails: { capacity: "80", how: "Text or call." } }, { name: "Sample Community Center" })));
  assert.ok(center.includes("Seats 80") && center.includes("To book:</strong> Text or call."));
  const bare = await build(church("community_center", {}, { name: "Sample Community Center" }));
  assert.ok(bare.suggestions.some((t) => /renting the hall/.test(t)) && !home(bare).includes("Seats "));
});
