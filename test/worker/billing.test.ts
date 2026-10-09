import assert from "node:assert/strict";
import { test } from "node:test";
import { billingOptions, defaultTerms, type Plan } from "../../src/worker/db.ts";

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
