import assert from "node:assert/strict";
import { test } from "node:test";
import { checkoutParams, pickerHtml, portalSession, priceExtras, priceSignup, stripeForm } from "../../src/worker/checkout.ts";
import type { AppSettings } from "../../src/worker/db.ts";
import { HttpError, type Env } from "../../src/worker/env.ts";
import { saveOrder } from "../../src/worker/signup.ts";

const s = {
  plans: [
    { id: "basic", name: "Basic", setup: 0, monthly: 49, includes: "" },
    { id: "plus", name: "Plus", setup: 0, monthly: 89, includes: "" },
  ],
  minMonths: 12,
  shortMonths: 6,
  flexSetup: 299,
  annualMonthsFree: 2,
  churchAnnualMonthsFree: 4,
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

test("unknown plans are refused with a 400 and unknown billing falls back to the 12-month plan", () => {
  assert.throws(() => priceSignup(s, "gold", "standard", []), (err: unknown) => err instanceof HttpError && err.status === 400);
  assert.equal(priceSignup(s, "plus", "bogus", []).option!.id, "standard");
});

test("a church lead pays the ministry rate on the yearly plan; everyone else pays the standard one", () => {
  const church = priceSignup(s, "plus", "annual", [], { category: "church" });
  assert.equal(church.dueToday, 8900 * 8);
  assert.match(church.option!.detail, /^Ministry rate: 12 months for the price of 8 — \$712\/year/);
  assert.equal(priceSignup(s, "plus", "annual", [], { category: "salon" }).dueToday, 8900 * 10);
});

test("'invoice' is only a way to pay when the page allows it; it prices the standard plan and marks the order", () => {
  const inv = priceSignup(s, "plus", "invoice", [], { category: "church", invoice: true });
  assert.equal(inv.invoice, true);
  assert.equal(inv.option!.id, "standard");
  assert.equal(inv.dueToday, 8900);
  assert.equal(priceSignup(s, "plus", "invoice", []).invoice, undefined);
});

test("checkout no longer asks Stripe to collect a phone number", () => {
  const o = priceSignup(s, "plus", "standard", []);
  assert.equal("phone_number_collection" in checkoutParams({ order: o, successUrl: "https://a/ok", cancelUrl: "https://a/no", metadata: {} }), false);
});

test("the picker with showPlans:false carries the hidden plan input, the plan line and a 'change plan' link", () => {
  const html = pickerHtml(s, { planId: "plus", esc: (t) => t, showPlans: false });
  assert.match(html, /<input type="hidden" name="plan" value="plus"/);
  assert.match(html, /Plan: <strong>Plus<\/strong> · \$89\/month/);
  assert.match(html, /<a href="#pk-plans" id="pk-change">change plan<\/a>/);
  assert.match(html, /<fieldset id="pk-plans" hidden disabled>/);
  // Two ways to pay up front, the others folded; featured extras first, the rest folded.
  assert.match(html, /<summary>Other ways to pay<\/summary>/);
  assert.match(html, /<summary>More extras<\/summary>/);
  assert.ok(html.indexOf('value="standard"') < html.indexOf("Other ways to pay"));
  assert.ok(html.indexOf('value="annual"') < html.indexOf("Other ways to pay"));
  assert.ok(html.indexOf('value="short"') > html.indexOf("Other ways to pay"));
  assert.ok(html.indexOf('name="x_0"') < html.indexOf("More extras"), "Photo shoot is featured");
  assert.ok(html.indexOf('name="x_1"') > html.indexOf("More extras"), "Social posts fold away");
  assert.doesNotMatch(html, /value="invoice"/);
  // The plan picker shows by default, and a church link gets the ministry rate and the invoice choice.
  assert.match(pickerHtml(s, { planId: "plus", esc: (t) => t }), /<fieldset id="pk-plans"><legend>Pick a plan/);
  const church = pickerHtml(s, { planId: "plus", esc: (t) => t, showPlans: false, category: "church", invoice: true });
  assert.match(church, /Ministry rate: 12 months for the price of 8 — \$712\/year\. No setup fee\./);
  assert.match(church, /value="invoice"[^>]*><span><strong>Pay by check or bank transfer<\/strong><small[^>]*>We'll send an invoice for the 12-month plan at the monthly price/);
});

/** A D1 stand-in that records every statement and returns nothing. */
function fakeDb() {
  const calls: Array<{ sql: string; args: unknown[] }> = [];
  const db = {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          calls.push({ sql, args });
          return { run: async () => ({}), first: async () => null, all: async () => ({ results: [] }) };
        },
      };
    },
  };
  return { calls, db };
}

test("an invoice order is saved without a Stripe checkout URL, marked billing 'invoice'", async () => {
  const { calls, db } = fakeDb();
  const env = { DB: db, APP_SECRET: "test-secret" } as unknown as Env;
  const order = priceSignup(s, "plus", "invoice", [{ index: 0, qty: 1 }], { category: "church", invoice: true });
  const req = new Request("https://app.test/a/x", { headers: { "cf-connecting-ip": "1.2.3.4", "user-agent": "t" } });
  const saved = await saveOrder(env, req, {
    leadId: "lead1", order, picks: [{ index: 0, qty: 1 }], terms: "T", name: "Pat Smith", signature: "data:image/png;base64,AAAA", email: "pat@example.com",
    source: "link", successUrl: "https://app.test/a/x?paid=1", cancelUrl: "https://app.test/a/x?canceled=1",
  });
  assert.equal(saved.checkoutUrl, null);
  assert.equal(saved.error, undefined);
  assert.match(saved.agreementUrl, /^https:\/\/app\.test\/agreement\/s[a-z0-9]+\./);
  const insert = calls.find((c) => /INSERT INTO signups/.test(c.sql))!;
  const plan = JSON.parse(insert.args[2] as string) as { billing: string; billingLabel: string };
  const extras = JSON.parse(insert.args[11] as string) as { billing?: string; invoice?: boolean };
  assert.equal(plan.billing, "standard");
  assert.match(plan.billingLabel, /invoiced$/);
  assert.deepEqual([extras.billing, extras.invoice], ["invoice", true]);
  assert.equal(calls.some((c) => /stripe_session/.test(c.sql)), false);
  // Even with a Stripe key, an invoice order never goes to Checkout.
  const withKey = await saveOrder({ ...env, STRIPE_SECRET_KEY: "sk_test" } as Env, req, {
    leadId: "lead1", order, picks: [], terms: "T", name: "Pat Smith", signature: "x", email: "pat@example.com", source: "link", successUrl: "https://app.test/a/x?paid=1", cancelUrl: "https://app.test/a/x?c=1",
  });
  assert.equal(withKey.checkoutUrl, null);
});

test("the billing portal needs the Stripe key", async () => {
  assert.equal(await portalSession({} as Env, "cus_1", "https://a/back"), null);
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
