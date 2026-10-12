import assert from "node:assert/strict";
import { test } from "node:test";
import { priceSignup } from "../../src/worker/checkout.ts";
import { founderChoices, promoRules, type AppSettings } from "../../src/worker/db.ts";
import {
  allowedFounderPick,
  creditYear,
  promoTerms,
  referralInvite,
  referralQualifies,
  YEAR_MS,
} from "../../src/worker/referrals.ts";

const s = {
  companyName: "Underground Associates",
  companyPhone: "(256) 555-0100",
  plans: [
    { id: "basic", name: "Basic", monthly: 49, includes: "Site" },
    { id: "plus", name: "Plus", monthly: 89, includes: "Site" },
  ],
  minMonths: 12,
  shortMonths: 6,
  flexSetup: 299,
  annualMonthsFree: 2,
  churchAnnualMonthsFree: 4,
  addons: [
    { name: "Photo shoot", price: 199, unit: "one-time", founderPick: true },
    { name: "Tap-to-review card (NFC)", price: 35, unit: "each", founderPick: true },
    { name: "Barcode scanning", price: 15, unit: "month", founderPick: true },
    { name: "Ad management", price: 149, unit: "month" },
  ],
} as unknown as AppSettings;

test("founder choices are the ticked one-time / each extras only", () => {
  assert.deepEqual(
    founderChoices(s).map((c) => c.index),
    [0, 1],
  );
  assert.deepEqual(promoRules({}), { founderSlots: 5, referralMonths: 2, referralMaxPerYear: 2, referralMinMonths: 6 });
});

test("a founder pick is a $0 line that never reaches the total", () => {
  const order = priceSignup(s, "plus", "standard", [{ index: 1, qty: 2 }], { founder: 0 });
  assert.equal(order.founder, "Photo shoot");
  assert.equal(order.dueToday, 89 * 100 + 35 * 2 * 100);
  assert.ok(order.lines.some((l) => l.name === "Free: Photo shoot (founding customer)" && l.amount === 0));
  assert.ok(order.extras.some((x) => x.name === "Photo shoot" && x.price === "free (founding customer)"));
  // Not a founder pick (monthly), or picked as a paid extra too: no free line.
  assert.equal(priceSignup(s, "plus", "standard", [], { founder: 2 }).founder, undefined);
  assert.equal(priceSignup(s, "plus", "standard", [{ index: 0, qty: 1 }], { founder: 0 }).founder, undefined);
});

test("the pick only counts while spots are open and it is one of the choices", () => {
  const offer = { slotsLeft: 1, total: 5, choices: [{ index: 0, name: "Photo shoot", price: "$199 one-time", about: "" }] };
  assert.equal(allowedFounderPick(offer, 0), 0);
  assert.equal(allowedFounderPick(offer, 1), null);
  assert.equal(allowedFounderPick({ ...offer, slotsLeft: 0 }, 0), null);
  assert.equal(allowedFounderPick(offer, null), null);
});

test("referrals need a 6- or 12-month plan; month to month and the price list don't count", () => {
  assert.equal(referralQualifies({ id: "plus", billing: "standard" }, s), true);
  assert.equal(referralQualifies({ id: "plus", billing: "short" }, s), true);
  assert.equal(referralQualifies({ id: "plus", billing: "annual" }, s), true);
  assert.equal(referralQualifies({ id: "plus" }, s), true);
  assert.equal(referralQualifies({ id: "plus", billing: "flex" }, s), false);
  assert.equal(referralQualifies({ id: "list", billing: "standard" }, s), false);
  assert.equal(referralQualifies({ id: "plus", billing: "short" }, { ...s, referralMinMonths: 12 }), false);
});

test("referral years run from the referrer's first payment", () => {
  const start = Date.UTC(2026, 9, 1);
  assert.equal(creditYear(start, start), 0);
  assert.equal(creditYear(start, start + YEAR_MS - 1), 0);
  assert.equal(creditYear(start, start + YEAR_MS), 1);
  assert.equal(creditYear(start, start + 3 * YEAR_MS + 5), 3);
});

test("the agreement and the invite text carry the program's numbers", () => {
  const terms = promoTerms(s, "Photo shoot");
  assert.equal(terms.length, 2);
  assert.match(terms[0]!, /first 5 clients you get "Photo shoot" at no charge/);
  assert.match(terms[1]!, /plan of 6 months or more.*2 months of your plan free,.*Up to 2 referral credits count in each year/);
  assert.equal(promoTerms({ ...s, referralMonths: 0 }, null).length, 0);
  assert.match(referralInvite(s, { name: "Kingfish Aquatics" }), /mention Kingfish Aquatics, you get 2 months of your plan free \(up to 2 referrals a year; extra ones carry over\)/);
});
