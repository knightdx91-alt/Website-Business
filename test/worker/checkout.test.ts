import assert from "node:assert/strict";
import { test } from "node:test";
import { checkoutParams, priceExtras, priceSignup, stripeForm } from "../../src/worker/checkout.ts";
import type { AppSettings } from "../../src/worker/db.ts";

const s = {
  plans: [
    { id: "basic", name: "Basic", setup: 0, monthly: 49, includes: "" },
    { id: "plus", name: "Plus", setup: 0, monthly: 89, includes: "" },
  ],
  minMonths: 12,
  shortMonths: 6,
  flexSetup: 299,
  annualMonthsFree: 2,
  addons: [
    { name: "Photo shoot", price: 199, unit: "one-time" },
    { name: "Social media posts", price: 129, unit: "month" },
    { name: "Table tents", price: 49, unit: "each" },
    { name: "Yard signs", price: 0, unit: "quote" },
  ],
} as unknown as AppSettings;

test("12-month plan with extras: monthly plan + monthly extra renew; one-time and per-item extras due today", () => {
  const o = priceSignup(s, "plus", "standard", [{ index: 0, qty: 1 }, { index: 1, qty: 1 }, { index: 2, qty: 3 }, { index: 3, qty: 1 }]);
  assert.equal(o.dueToday, 8900 + 19900 + 12900 + 3 * 4900);
  assert.deepEqual(o.renews, { amount: 8900 + 12900, interval: "month" });
  assert.deepEqual(o.quotes, ["Yard signs"]);
});

test("month to month adds the setup fee; yearly charges 10 months and bills monthly extras yearly", () => {
  const flex = priceSignup(s, "basic", "flex", []);
  assert.equal(flex.dueToday, 4900 + 29900);
  assert.equal(flex.renews!.amount, 4900);
  const year = priceSignup(s, "plus", "annual", [{ index: 1, qty: 1 }]);
  assert.equal(year.dueToday, 8900 * 10 + 12900 * 12);
  assert.deepEqual(year.renews, { amount: 8900 * 10 + 12900 * 12, interval: "year" });
});

test("unknown plans are refused and unknown billing falls back to the 12-month plan", () => {
  assert.throws(() => priceSignup(s, "gold", "standard", []));
  assert.equal(priceSignup(s, "plus", "bogus", []).option!.id, "standard");
});

test("extras-only orders: one-time is a payment, monthly makes a subscription", () => {
  const once = priceExtras(s, [{ index: 0, qty: 1 }]);
  assert.equal(checkoutParams({ order: once, successUrl: "https://a/ok", cancelUrl: "https://a/no", metadata: { kind: "extras" } }).mode, "payment");
  const monthly = priceExtras(s, [{ index: 1, qty: 1 }]);
  assert.equal(checkoutParams({ order: monthly, successUrl: "https://a/ok", cancelUrl: "https://a/no", metadata: { kind: "extras" } }).mode, "subscription");
});

test("Stripe form encoding nests line items and metadata", () => {
  const o = priceSignup(s, "plus", "standard", [{ index: 0, qty: 1 }]);
  const form = stripeForm(checkoutParams({ order: o, successUrl: "https://a/ok", cancelUrl: "https://a/no", email: "x@y.com", clientReferenceId: "lead1", metadata: { kind: "signup", signupId: "s1" } }));
  assert.equal(form.get("mode"), "subscription");
  assert.equal(form.get("line_items[0][price_data][unit_amount]"), "8900");
  assert.equal(form.get("line_items[0][price_data][recurring][interval]"), "month");
  assert.equal(form.get("line_items[1][price_data][product_data][name]"), "Photo shoot");
  assert.equal(form.get("line_items[1][price_data][recurring][interval]"), null);
  assert.equal(form.get("metadata[signupId]"), "s1");
  assert.equal(form.get("subscription_data[metadata][kind]"), "signup");
  assert.equal(form.get("customer_email"), "x@y.com");
});
