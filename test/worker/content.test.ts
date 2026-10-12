import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  appContent, EVERY_PLAN, FOLLOW_UPS, OFFER_HINT, offerHint, payTerms, payWays, PLAN_PITCH, PLAN_QUESTIONS, PLAN_TAGLINE, PLAYBOOK_ALWAYS,
  playbookObjections, priceShort, SHARE_TEXT, SIGNUP_TEXT, SUGGESTED_PLANS, WALKIN_ALWAYS, WALKIN_OBJECTIONS, WALKIN_OBJECTIONS_CHURCH, WALKIN_QUESTIONS, WALKIN_SHOW, WALKIN_TIMING,
} from "../../src/worker/content.ts";
import { plansOptions } from "../../src/worker/plan-options.ts";
import type { AppSettings } from "../../src/worker/db.ts";

// The web app keeps its own copy of this text in app.js. The server copy (content.ts) feeds the Android app, so a
// change on one side without the other shows up here instead of as two different scripts in the field.
const appJs = readFileSync(new URL("../../app/public/app.js", import.meta.url).pathname, "utf8");

/** The literal parts of a template string ("{greeting} Hi {name}" → ["Hi"]), each of which must be in app.js. */
const literalParts = (s: string) => s.split(/\{[a-z]+\}/i).map((x) => x.trim()).filter((x) => x.length > 12);

function inAppJs(label: string, s: string) {
  for (const part of literalParts(s)) assert.ok(appJs.includes(part), `${label}: not in app.js: ${part}`);
}

test("plan copy (taglines, pitch, questions, every-plan list) matches app.js", () => {
  for (const [k, v] of Object.entries(PLAN_TAGLINE)) inAppJs(`PLAN_TAGLINE.${k}`, v);
  for (const x of EVERY_PLAN) inAppJs("EVERY_PLAN", x);
  for (const [k, p] of Object.entries(PLAN_PITCH)) {
    inAppJs(`PLAN_PITCH.${k}.fit`, p.fit);
    inAppJs(`PLAN_PITCH.${k}.line`, p.line);
    for (const pt of p.points) inAppJs(`PLAN_PITCH.${k}.points`, pt);
  }
  for (const [q, a] of PLAN_QUESTIONS) {
    inAppJs("PLAN_QUESTIONS", q);
    inAppJs("PLAN_QUESTIONS", a);
  }
  for (const x of PLAYBOOK_ALWAYS) inAppJs("PLAYBOOK_ALWAYS", x);
  assert.deepEqual(SUGGESTED_PLANS.map((p) => p.monthly), [49, 89, 149, 29]);
  for (const p of SUGGESTED_PLANS) inAppJs("SUGGESTED_PLANS", p.includes.split("\n")[0]!);
});

test("playbook objections match app.js, with the prices and terms from Settings filled in", () => {
  const s = { companyName: "Underground Associates", minMonths: 12, shortMonths: 6, flexSetup: 299, annualMonthsFree: 2 };
  const list = playbookObjections(s, SUGGESTED_PLANS);
  assert.equal(list.length, 20);
  for (const [q, a] of list) {
    inAppJs("objection", q);
    // Static answers are in app.js verbatim; the dynamic ones are checked by their fixed sentences below.
    if (!/\$|6-month|12 months|Underground|referral/.test(a)) inAppJs("objection answer", a);
  }
  const by = (q: string) => list.find(([x]) => x.startsWith(q))![1];
  assert.match(by("“Do you have a referral program?”"), /^Yes\. When a business you refer signs up for a 6- or 12-month plan .* you get 2 months of your plan free, up to 2 referrals a year/);
  inAppJs("referral", "Just have them mention your business name when they sign up.");
  assert.equal(by("“It's too expensive.”"), "I hear you. Basic is $49 a month, with no setup fee on the 6- or 12-month plan. If it brings you one customer a month, it pays for itself. Want to start there? You can move up any time.");
  assert.equal(by("“I don't want a contract.”"), "No problem. There's a 6-month plan, same price and still no setup fee. Or go month to month: same monthly price, a one-time $299 setup fee, and cancel any time with 30 days' notice.");
  assert.match(by("“Is this a scam?”"), /^Fair question\. Underground Associates is a local company here in Cullman\. You can see your site/);
  assert.match(by("“Do I own it?”"), /After the first 12 months you can cancel any time with 30 days' notice, and we'll send you a copy/);
  inAppJs("scam", "You can see your site before you pay anything, nothing goes live until you say so, and you sign up and pay through a secure link.");
  inAppJs("contract", "same price and still no setup fee.");
  inAppJs("contract", "setup fee, and cancel any time with 30 days' notice.");
  // No company name, no minimum term, no month to month.
  const bare = playbookObjections({ minMonths: 0, shortMonths: 0, flexSetup: 0 }, []);
  assert.match(bare.find(([q]) => q.startsWith("“Is this a scam?”"))![1], /^Fair question\. We're local, here in Cullman\./);
  assert.match(bare.find(([q]) => q.startsWith("“Do I own it?”"))![1], /name\. You can cancel any time with 30 days' notice, and/);
  assert.equal(bare.find(([q]) => q.startsWith("“I don't want a contract.”"))![1], "No problem. You can cancel any time with 30 days' notice.");
  assert.match(bare.find(([q]) => q.startsWith("“It's too expensive.”"))![1], /^I hear you\. Our starter plan is low monthly\. If it brings/);
});

test("in-person guide copy (timing, objections, questions, what to show, always) matches app.js", () => {
  for (const [k, v] of Object.entries(WALKIN_TIMING)) inAppJs(`WALKIN_TIMING.${k}`, v);
  assert.equal(Object.keys(WALKIN_TIMING).length, 10);
  for (const [q, a] of [...WALKIN_OBJECTIONS, ...WALKIN_OBJECTIONS_CHURCH]) {
    inAppJs("walkin objection", q);
    inAppJs("walkin answer", a);
  }
  assert.equal(WALKIN_OBJECTIONS.length, 8);
  assert.equal(WALKIN_OBJECTIONS_CHURCH.length, 7);
  for (const x of [...WALKIN_QUESTIONS.before, WALKIN_QUESTIONS.restaurant, WALKIN_QUESTIONS.services, ...WALKIN_QUESTIONS.after]) inAppJs("WALKIN_QUESTIONS", x);
  for (const [k, v] of Object.entries(WALKIN_SHOW)) inAppJs(`WALKIN_SHOW.${k}`, v);
  for (const x of WALKIN_ALWAYS) inAppJs("WALKIN_ALWAYS", x);
  assert.equal(priceShort({ minMonths: 12, shortMonths: 6 }, SUGGESTED_PLANS), "plans start at $49 a month with no setup fee on the 6- or 12-month plan");
  assert.equal(priceShort({ minMonths: 0, shortMonths: 0 }, []), "it's a low monthly price");
  inAppJs("priceShort", "it's a low monthly price");
});

test("follow-up texts, share texts and offer hints match app.js", () => {
  assert.equal(FOLLOW_UPS.length, 3);
  for (const f of FOLLOW_UPS) {
    inAppJs("FOLLOW_UPS.label", f.label);
    inAppJs("FOLLOW_UPS.text", f.text);
    assert.match(f.text, /^\{greeting\} .*\{name\}.*\{url\}$/);
  }
  inAppJs("SHARE_TEXT", SHARE_TEXT);
  inAppJs("SIGNUP_TEXT", SIGNUP_TEXT);
  assert.equal(OFFER_HINT.length, 18);
  for (const h of OFFER_HINT) {
    inAppJs("OFFER_HINT.text", h.text);
    assert.ok(appJs.includes(`[/${h.match}/i,`), `OFFER_HINT pattern not in app.js: ${h.match}`);
  }
  assert.equal(offerHint("Spanish version of your site"), "Mexican restaurants, landscapers, cleaners and shops with Spanish-speaking customers.");
  assert.equal(offerHint("Ad management"), "Contractors in busy season; restaurants with a new menu or event.");
  assert.equal(offerHint("Tap-to-review card (NFC)"), "Busy counters: restaurants, salons, shops. More reviews, higher on Maps.");
  assert.equal(offerHint("Something else"), "");
});

test("ways to pay match app.js payWays(): commitments, month to month, invoice, yearly; churches get the ministry rate", () => {
  const s = { minMonths: 12, shortMonths: 6, flexSetup: 299, annualMonthsFree: 2, churchAnnualMonthsFree: 4, invoiceForAll: true };
  const ways = payWays(s, SUGGESTED_PLANS);
  assert.deepEqual(ways.map(([t]) => t), ["6-month plan", "12-month plan", "Month to month", "Pay by invoice", "Pay yearly, 2 months free"]);
  assert.equal(ways[4]![1], "12 months for the price of 10, no setup fee. Basic $490/year · Plus $890/year · Pro $1490/year · Price list $290/year");
  for (const part of [
    "-month plan", "The monthly price, no setup fee. After ", " months, cancel any time with 30 days' notice.", "Month to month", "Same monthly price plus a one-time ",
    " setup fee. No contract, cancel any time.", "Pay by invoice", "We send an invoice; pay by check or bank transfer. Monthly invoices are due in 15 days, yearly in 30. Nothing is charged online.",
    "Pay yearly, ", " months free", "12 months for the price of ", " for churches and nonprofits", ", no setup fee. ", "The monthly price. Cancel any time.",
  ]) assert.ok(appJs.includes(part), `payWays: not in app.js: ${part}`);
  const church = payWays(s, SUGGESTED_PLANS, true);
  assert.match(church.at(-1)![1], /^12 months for the price of 8 for churches and nonprofits, no setup fee\. Basic \$392\/year/);
  assert.deepEqual(payWays({ ...s, invoiceForAll: false }, SUGGESTED_PLANS).map(([t]) => t), ["6-month plan", "12-month plan", "Month to month", "Pay yearly, 2 months free"]);
  assert.deepEqual(payWays({ ...s, invoiceForAll: false }, SUGGESTED_PLANS, true).map(([t]) => t).includes("Pay by invoice"), true);
  assert.deepEqual(payWays({ minMonths: 0, shortMonths: 0, flexSetup: 0, annualMonthsFree: 0, invoiceForAll: false }, []), [["Monthly", "The monthly price. Cancel any time."]]);
  assert.deepEqual(payTerms(s), { min: 12, short: 6, commits: [6, 12], flex: 299, free: 2, church: false });
});

const settings = (over: Partial<AppSettings> = {}): AppSettings => ({
  defaultCap: 50,
  copyModel: "claude-opus-5-5",
  companyName: "Underground Associates",
  plans: SUGGESTED_PLANS,
  minMonths: 12,
  shortMonths: 6,
  flexSetup: 299,
  annualMonthsFree: 2,
  churchAnnualMonthsFree: 4,
  invoiceForAll: true,
  addons: [
    { name: "Photo shoot", price: 199, unit: "one-time", about: "We come by." },
    { name: "Business cards, yard signs & door hangers", price: 0, unit: "quote" },
    { name: "Social media posts", price: 129, unit: "month" },
  ],
  ...over,
});

test("GET /api/content carries every block the app needs, filled from Settings", () => {
  const c = appContent(settings());
  assert.equal(c.planTagline.plus, PLAN_TAGLINE.plus);
  assert.equal(c.playbookObjections.length, 20);
  assert.match(c.playbookObjections[2]![1], /Basic is \$49 a month/);
  assert.deepEqual(c.churchYearly, { free: 4, payFor: 8, plans: [{ name: "Basic", year: "$392" }, { name: "Plus", year: "$712" }, { name: "Pro", year: "$1192" }] });
  assert.equal(appContent(settings({ churchAnnualMonthsFree: 0 })).churchYearly, null);
  assert.equal(c.followUps[0]!.text.startsWith("{greeting}"), true);
  assert.equal(c.walkinTiming.restaurant, WALKIN_TIMING.restaurant);
  // Empty Settings → the suggested plans stand in, like SUGGESTED_PLANS in app.js.
  assert.match(appContent(settings({ plans: [] })).playbookObjections[2]![1], /Basic is \$49 a month/);
});

test("GET /api/plans/options prices every way to pay for every plan, with what is due today", () => {
  const o = plansOptions(settings());
  assert.equal(o.church, false);
  assert.deepEqual(o.plans.map((p) => p.id), ["basic", "plus", "pro", "list"]);
  const plus = o.plans[1]!;
  assert.equal(plus.perDay, 2.93);
  assert.deepEqual(plus.includes.slice(0, 2), ["Everything in Basic", "Monthly visitor report by text"]);
  assert.deepEqual(plus.options.map((x) => [x.id, x.dueTodayCents]), [["short", 8900], ["standard", 8900], ["flex", 8900 + 29900], ["annual", 89000]]);
  assert.equal(plus.options[0]!.label, "6-month plan");
  assert.match(plus.options[2]!.detail, /\$299 setup · no minimum/);
  assert.equal(plus.options[3]!.monthlyEquivalent, 74.17);
  assert.deepEqual(plus.options[3]!.renews, { amount: 89000, interval: "year" });
  assert.deepEqual(o.terms, { min: 12, short: 6, commits: [6, 12], commitWords: "6- or 12-month", flex: 299, free: 2 });
  assert.equal(o.payWays.length, 5);
  assert.equal(o.priceShort, "plans start at $49 a month with no setup fee on the 6- or 12-month plan");
  assert.deepEqual(o.addons.map((a) => a.price), ["$199 one-time", "Priced per job", "$129/month"]);
  assert.equal(o.invoice, true);
  // Churches: the ministry rate on the yearly option, and the invoice always offered.
  const church = plansOptions(settings({ invoiceForAll: false }), "church");
  assert.equal(church.church, true);
  assert.equal(church.invoice, true);
  assert.equal(church.terms.free, 4);
  assert.deepEqual(church.plans[1]!.options.at(-1)!.dueTodayCents, 71200);
  assert.equal(church.plans[1]!.options.at(-1)!.label, "Pay yearly (ministry rate)");
  // A plan with no monthly price is left out (like the web); no plans at all → the suggested ones.
  assert.equal(plansOptions(settings({ plans: [{ ...SUGGESTED_PLANS[0]!, monthly: 0 }, SUGGESTED_PLANS[1]!] })).plans.length, 1);
  assert.equal(plansOptions(settings({ plans: [] })).plans.length, 4);
});
