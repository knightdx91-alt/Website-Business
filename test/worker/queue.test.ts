import assert from "node:assert/strict";
import test from "node:test";
import {
  cardForTodo,
  contractSummary,
  dueCadenceStep,
  funnel,
  healthItems,
  median,
  nextStepFor,
  parseAlertMode,
  publishChecklist,
  rankQueue,
  termLine,
} from "../../src/worker/queue.ts";
import { contractText } from "../../src/worker/contract.ts";
import { contractSections, signupPrefill } from "../../src/worker/signup.ts";
import { priceExtras, priceSignup } from "../../src/worker/checkout.ts";
import { DEFAULT_ADDONS, DEFAULT_LIST_PLAN, type AppSettings } from "../../src/worker/db.ts";
import { wordsGuide } from "../../src/worker/guides.ts";

const DAY = 86_400_000;
const NOW = Date.parse("2026-10-12T15:00:00Z");
const TODAY = "2026-10-12";

const base = { status: "ready", salesStatus: "new", blockers: 0, previewOpens: 0 };

test("next step: the stage decides, in priority order", () => {
  assert.equal(nextStepFor({ ...base, status: "building" }, TODAY, NOW).key, "building");
  assert.equal(nextStepFor({ ...base, status: "failed" }, TODAY, NOW).route, "retry");
  assert.equal(nextStepFor(base, TODAY, NOW).title, "Call and show the preview");
  assert.equal(nextStepFor({ ...base, lastContact: NOW - 3 * DAY }, TODAY, NOW).detail, "Last tried 3 days ago.");
  // A signed-but-unpaid lead beats everything else.
  const pay = nextStepFor({ ...base, salesStatus: "shown", unpaidSignup: true, followUp: "2026-10-01" }, TODAY, NOW);
  assert.equal(pay.key, "take_payment");
  assert.equal(pay.route, "pay");
  assert.equal(pay.priority, 0);
  // Callbacks: today vs overdue.
  assert.equal(nextStepFor({ ...base, followUp: TODAY }, TODAY, NOW).title, "Call back today");
  assert.equal(nextStepFor({ ...base, followUp: "2026-10-10" }, TODAY, NOW).title, "Callback overdue");
  assert.equal(nextStepFor({ ...base, followUp: "2026-10-20" }, TODAY, NOW).key, "call", "a future callback isn't due");
  // Opened preview in the last 7 days, after our last contact.
  const opened = nextStepFor({ ...base, previewOpenedAt: NOW - DAY, previewOpens: 2, lastContact: NOW - 2 * DAY }, TODAY, NOW);
  assert.equal(opened.key, "opened");
  assert.match(opened.detail, /yesterday \(2 times\)/);
  assert.equal(nextStepFor({ ...base, previewOpenedAt: NOW - 9 * DAY }, TODAY, NOW).key, "call", "an old open doesn't count");
  assert.equal(nextStepFor({ ...base, previewOpenedAt: NOW - DAY, lastContact: NOW - 3600_000 }, TODAY, NOW).key, "call", "we already called after they opened it");
  // Sold: checklist vs publish.
  assert.equal(nextStepFor({ ...base, salesStatus: "sold", blockers: 3 }, TODAY, NOW).detail, "3 things to fix before the site can go live.");
  assert.equal(nextStepFor({ ...base, salesStatus: "sold", blockers: 0 }, TODAY, NOW).route, "publish");
  assert.equal(nextStepFor({ ...base, salesStatus: "live", liveUrl: "https://x.pages.dev" }, TODAY, NOW).route, "review");
  assert.equal(nextStepFor({ ...base, salesStatus: "not_interested" }, TODAY, NOW).key, "closed");
});

test("cadence after Shown: day 2 call, day 5 text, day 10 walk in, day 21 last text, then done", () => {
  const shown = NOW - 5 * DAY;
  assert.equal(dueCadenceStep(shown, null, NOW)?.next, "text");
  assert.equal(dueCadenceStep(NOW - 5.5 * DAY, NOW - 3600_000, NOW), null, "a call logged after day 5 began clears it");
  assert.equal(dueCadenceStep(NOW - 1 * DAY, null, NOW), null, "nothing due before day 2");
  assert.equal(dueCadenceStep(NOW - 12 * DAY, NOW - 11 * DAY, NOW)?.next, "walk_in");
  const s = nextStepFor({ ...base, salesStatus: "shown", shownAt: shown }, TODAY, NOW);
  assert.equal(s.title, "Day 5: Text: any questions?");
  assert.equal(s.route, "text");
  const done = nextStepFor({ ...base, salesStatus: "shown", shownAt: NOW - 30 * DAY, lastContact: NOW - 2 * DAY }, TODAY, NOW);
  assert.equal(done.key, "cadence_done");
  const waiting = nextStepFor({ ...base, salesStatus: "shown", shownAt: NOW - 3 * DAY, lastContact: NOW - DAY, followUp: "2026-10-15" }, TODAY, NOW);
  assert.equal(waiting.title, "Waiting on them");
  assert.equal(waiting.priority, 7);
});

test("publish checklist: every blocker becomes a line with the Edit card that fixes it, confirmations first", () => {
  const items = publishChecklist(
    {
      publishBlockers: [
        "Owner to-do: Confirm the team list",
        "Owner hasn't confirmed phone",
        "Owner hasn't confirmed hours",
        "Owner hasn't approved the site text",
        "Google photos must be replaced with owner, stock or AI photos before publishing",
        "Owner to-do: Add your hours",
        "Owner to-do: Remove the sample items from the price list",
      ],
      errors: ["Phone number differs from Google"],
    },
    "salon",
  );
  assert.deepEqual(
    items.map((i) => [i.kind, i.card]),
    [
      ["confirm", "confirm"],
      ["confirm", "confirm"],
      ["approve", "approved"],
      ["photos", "photo"],
      ["todo", "salon"],
      ["todo", "facts"],
      ["todo", "pricelist"],
      ["error", "text"],
    ],
  );
  assert.equal(items[0]!.text, "Confirm the phone with the owner");
  assert.equal(cardForTodo("Confirm 24/7 towing", "auto"), "auto");
  assert.equal(cardForTodo("Confirm which counter services you offer", "auto"), "parts");
  assert.equal(cardForTodo("Add your Alabama HVAC certification number", "contractor"), "contractor");
  assert.equal(cardForTodo("Confirm your service times", "church"), "church");
  assert.equal(cardForTodo("Confirm every paid preparer has a current PTIN", "finance"), "finance");
  assert.equal(cardForTodo("Send photos of your popular dishes", "restaurant"), "menu");
  assert.equal(cardForTodo("Add an upload link", "print"), "print");
  assert.equal(cardForTodo("Add your booking link", "salon"), "links");
  assert.equal(cardForTodo("Remove the sample items from the price list", "retail"), "retail");
  assert.equal(cardForTodo("Something new", "general"), "text");
  assert.deepEqual(publishChecklist(null, "auto"), []);
});

test("the queue: urgent first, fresh leads capped, waiting and closed leads left out", () => {
  const leads = [
    { id: "a", ...base, score: 10 },
    { id: "b", ...base, score: 90 },
    { id: "c", ...base, score: 50 },
    { id: "d", ...base, salesStatus: "shown", unpaidSignup: true, score: 1 },
    { id: "e", ...base, followUp: "2026-10-01", score: 5 },
    { id: "f", ...base, salesStatus: "sold", blockers: 2, score: 5 },
    { id: "g", ...base, salesStatus: "shown", shownAt: NOW - 3 * DAY, lastContact: NOW - DAY, score: 99 },
    { id: "h", ...base, status: "building", score: 99 },
    { id: "p", ...base, payTest: true, score: 999 },
  ];
  const q = rankQueue(leads, TODAY, NOW, 2);
  assert.deepEqual(
    q.rows.map((r) => r.lead.id),
    ["d", "e", "f", "b", "c"],
  );
  assert.deepEqual(q.counts, { take_payment: 1, callback: 1, publish: 1, call: 3 });
});

test("health strip states", () => {
  const items = healthItems({
    stripeKey: true,
    stripeWebhook: false,
    stripePublishableKey: true,
    tap: { ready: false, why: "Add the business address first" },
    email: true,
    companyEmail: "info@undergroundassociates.com",
    googleClientId: true,
    fcmClient: true,
    fcmServer: true,
    webPush: true,
    braveSearch: false,
    reviewLink: false,
    companyAddress: false,
    plansPriced: 3,
    spam: { turnstile: "key", blocked: 7 },
  });
  const by = Object.fromEntries(items.map((i) => [i.id, i]));
  assert.equal(by.stripe!.state, "warn");
  assert.match(by.stripe!.detail, /STRIPE_WEBHOOK_SECRET/);
  assert.equal(by.tap!.detail, "Add the business address first");
  assert.equal(by.email!.state, "ok");
  assert.equal(by.push!.state, "ok");
  assert.equal(by.search!.state, "warn");
  assert.equal(by.plans!.detail, "3 plans with a price.");
  assert.equal(by.spam!.state, "warn");
  assert.match(by.spam!.detail, /TURNSTILE_SECRET_KEY secret yet/);
  assert.match(by.spam!.detail, /7 blocked this month/);
  assert.equal(by.spam!.section, "Website");
  assert.equal(items.length, 11);
});

test("Google Analytics stays green once a property was created, even with no site live", () => {
  const base = {
    stripeKey: true, stripeWebhook: true, stripePublishableKey: true, tap: { ready: true }, email: true, companyEmail: "x@y.z",
    googleClientId: true, fcmClient: true, fcmServer: true, webPush: true, braveSearch: true, reviewLink: true, companyAddress: true,
    plansPriced: 3,
    spam: { turnstile: "on", blocked: 0 },
  };
  const ga = (extra: object) =>
    healthItems({ ...base, analytics: { state: "on", serviceEmail: "sa@x.iam.gserviceaccount.com", lastError: null, sites: 0, ...extra } } as never)
      .find((i) => i.id === "analytics")!;
  assert.equal(ga({}).state, "warn");
  assert.equal(ga({ verified: true }).state, "ok");
  assert.match(ga({ verified: true }).detail, /Connected and tested/);
  assert.equal(ga({ sites: 2 }).state, "ok");
  assert.equal(ga({ verified: true, lastError: "denied" }).state, "warn");
});

const settings = (): AppSettings =>
  ({
    plans: [
      { id: "basic", name: "Basic", setup: 0, monthly: 49, includes: "Five pages" },
      { id: "plus", name: "Plus", setup: 0, monthly: 89, includes: "Everything in Basic\nSpanish page" },
      DEFAULT_LIST_PLAN,
    ],
    addons: DEFAULT_ADDONS,
    companyName: "Underground Associates",
    legalName: "Underground Associates LLC",
    companyPhone: "(256) 555-0100",
    minMonths: 12,
    shortMonths: 6,
    flexSetup: 299,
    annualMonthsFree: 2,
  }) as unknown as AppSettings;

test("agreement: 'In short' leads the text and reads as its own section; the term follows the way to pay", () => {
  const s = settings();
  const order = priceSignup(s, "plus", "short", []);
  const lines = contractSummary(s, order, "signup");
  assert.equal(lines.length, 5);
  assert.match(lines[0]!, /^Today: \$89\. Plus plan: \$89 a month, charged/);
  assert.match(lines[1]!, /^6-month minimum/);
  assert.match(lines[4]!, /\(256\) 555-0100/);
  assert.match(termLine(s, { id: "plus" }, "flex"), /Month to month: no minimum/);
  assert.match(termLine(s, { id: "plus" }, "annual"), /renews yearly/);
  assert.match(termLine(s, { id: "list" }, "standard"), /No minimum term and no early cancellation fee/);
  const text = contractText(s, order, { business: "Reyes Pizza", kind: "signup" });
  const sections = contractSections(text);
  assert.equal(sections[1]!.heading, "IN SHORT");
  assert.equal(sections[2]!.heading, "YOUR ORDER");
  assert.match(sections[1]!.text, /^- Today: \$89/);
  const extras = contractSummary(s, priceExtras(s, [{ index: 0, qty: 1 }]), "extras");
  assert.equal(extras.length, 2);
  assert.match(extras[0]!, /adding extras/);
});

test("funnel: counts every lead that reached a stage, with the median days per step", () => {
  const t0 = Date.parse("2026-09-01T12:00:00Z");
  const f = funnel([
    { created_at: t0, shown_at: t0 + 2 * DAY, signed_at: t0 + 4 * DAY, paid_at: t0 + 4 * DAY + DAY / 2, published_at: t0 + 7 * DAY, sales_status: "live" },
    { created_at: t0, shown_at: t0 + 6 * DAY, signed_at: null, paid_at: null, published_at: null, sales_status: "shown" },
    { created_at: t0, shown_at: null, signed_at: null, paid_at: null, published_at: null, sales_status: "new" },
    { created_at: t0, shown_at: null, signed_at: null, paid_at: null, published_at: null, sales_status: "not_interested" },
  ]);
  assert.deepEqual(
    f.map((s) => [s.id, s.count, s.rate, s.medianDays]),
    [
      ["new", 4, null, null],
      ["shown", 2, 0.5, 4],
      ["signed", 1, 0.5, 2],
      ["paid", 1, 1, 0.5],
      ["live", 1, 1, 2.5],
    ],
  );
  assert.equal(median([]), null);
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([1, 2, 3, 4]), 2.5);
});

test("alert mode parsing and sign-up prefill", () => {
  assert.equal(parseAlertMode(null), "all");
  assert.equal(parseAlertMode('{"mode":"mine"}'), "mine");
  assert.equal(parseAlertMode("junk"), "all");
  assert.deepEqual(signupPrefill({ contact: "Maria Reyes", record_json: JSON.stringify({ email: "maria@reyespizza.com" }) }), { name: "Maria Reyes", email: "maria@reyespizza.com" });
  assert.deepEqual(signupPrefill({ contact: "the manager (afternoons)", record_json: null }), { name: "", email: "" });
  assert.deepEqual(signupPrefill({ contact: null, record_json: "{bad" }), { name: "", email: "" });
});

test("the glossary guide covers both status kinds and the money words", () => {
  const g = wordsGuide(settings());
  const text = JSON.stringify(g);
  for (const w of ["New:", "Shown:", "Sold:", "Live:", "Building", "Ready:", "Failed:", "Way to pay", "Extras:", "Caller:", "Full access"])
    assert.ok(text.includes(w), `glossary explains ${w}`);
  assert.match(text, /\$29 a month/);
});
