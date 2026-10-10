import assert from "node:assert/strict";
import { test } from "node:test";
import { annualMonthsFreeFor, billingOptions, defaultTerms, missingCoreTerms, type Plan } from "../../src/worker/db.ts";

const plus: Plan = { id: "plus", name: "Plus", setup: 0, monthly: 89, includes: "" };

test("6- and 12-month plans have no setup fee; only month to month does; yearly is 12 months for the price of 10", () => {
  const o = billingOptions(plus, { minMonths: 12, shortMonths: 6, flexSetup: 299, annualMonthsFree: 2 });
  assert.deepEqual(o.map((x) => x.id), ["short", "standard", "flex", "annual"]);
  assert.match(o[0]!.detail, /no setup fee · 6-month minimum/);
  assert.match(o[1]!.detail, /no setup fee · 12-month minimum/);
  assert.match(o[2]!.detail, /\$299 setup · no minimum/);
  assert.match(o[3]!.detail, /^\$890 for 12 months \(you pay for 10, 2 are free\)/);
  assert.equal(o[3]!.monthlyEquivalent, 74.17);
  assert.deepEqual(billingOptions(plus, { minMonths: 12, shortMonths: 0, flexSetup: 299, annualMonthsFree: 2 }).map((x) => x.id), ["standard", "flex", "annual"]);
  assert.match(defaultTerms({ minMonths: 12, shortMonths: 6 }), /6-month or 12-month plan/);
});

test("6-month plan falls back to the monthly link", () => {
  const plan = { id: "plus" as const, name: "Plus", setup: 0, monthly: 89, includes: "", payLink: "https://buy.stripe.com/m" };
  const opts = billingOptions(plan, { minMonths: 12, shortMonths: 6, flexSetup: 299, annualMonthsFree: 2 });
  assert.equal(opts.find((o) => o.id === "short")?.payLink, "https://buy.stripe.com/m");
  assert.equal(billingOptions({ ...plan, payLinkShort: "https://buy.stripe.com/s" }, { minMonths: 12, shortMonths: 6 }).find((o) => o.id === "short")?.payLink, "https://buy.stripe.com/s");
});

test("churches and nonprofits get the ministry rate on the yearly option: 12 months for the price of 8", () => {
  const s = { minMonths: 12, shortMonths: 6, flexSetup: 299, annualMonthsFree: 2, churchAnnualMonthsFree: 4 };
  const church = billingOptions(plus, s, { category: "church" }).find((o) => o.id === "annual")!;
  assert.equal(church.label, "Pay yearly (ministry rate)");
  assert.match(church.detail, /^Ministry rate: 12 months for the price of 8 — \$712\/year · no setup fee · renews yearly$/);
  assert.equal(church.monthlyEquivalent, 59.33);
  // Everyone else keeps the standard rate, and so does a church when no category is passed.
  assert.match(billingOptions(plus, s, { category: "restaurant" }).find((o) => o.id === "annual")!.detail, /^\$890 for 12 months/);
  assert.match(billingOptions(plus, s).find((o) => o.id === "annual")!.detail, /^\$890 for 12 months/);
  assert.equal(annualMonthsFreeFor(s, "church"), 4);
  assert.equal(annualMonthsFreeFor({ ...s, churchAnnualMonthsFree: undefined }, "church"), 4);
  assert.equal(annualMonthsFreeFor(s, "salon"), 2);
});

test("the default agreement carries the five core lines; a custom one that lacks them gets them added", () => {
  const terms = defaultTerms({ minMonths: 12, shortMonths: 6 });
  assert.deepEqual(missingCoreTerms(terms), []);
  assert.match(terms, /remaining months of the minimum term/);
  assert.match(terms, /isn't fixed within 30 days/);
  assert.match(terms, /total liability to you is limited to what you paid us in the 12 months/);
  assert.match(terms, /early cancellation fee equal to your monthly price times the remaining months of the minimum term/);
  assert.match(terms, /\$15 late fee/);
  assert.match(terms, /Cullman County/);
  assert.match(terms, /undergroundassociates\.com\/terms is part of this agreement/);
  assert.match(terms, /at least 30 days before a yearly renewal/);
  assert.equal(missingCoreTerms("Our own short agreement. Our total liability is capped.").length, 10);
});

test("the late fee and early-payoff discount come from Settings, and 0 turns each off", () => {
  const base = { minMonths: 12, shortMonths: 6 };
  assert.match(defaultTerms({ ...base, lateFee: 25, payoffDiscount: 10 }), /we add a \$25 late fee, once per missed payment/);
  assert.match(defaultTerms({ ...base, lateFee: 25, payoffDiscount: 10 }), /or pay it now, less 10%, and we close your account at once/);
  assert.match(defaultTerms({ ...base, lateFee: 12.5 }), /\$12\.50 late fee/);
  const none = defaultTerms({ ...base, lateFee: 0, payoffDiscount: 0 });
  assert.doesNotMatch(none, /late fee/);
  assert.match(none, /or pay it now, and we close your account at once/);
  assert.deepEqual(missingCoreTerms(none, { lateFee: 0, payoffDiscount: 0 }), [], "no late-fee core line is demanded when the fee is off");
  assert.ok(missingCoreTerms("short custom text", { lateFee: 20 }).some((t) => t.includes("$20 late fee")));
  assert.ok(!missingCoreTerms("short custom text", { lateFee: 0 }).some((t) => t.includes("late fee")));
});
