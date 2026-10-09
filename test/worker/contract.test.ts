import assert from "node:assert/strict";
import { test } from "node:test";
import { priceExtras, priceSignup } from "../../src/worker/checkout.ts";
import { contractSectionsHtml, contractText, extraTerms } from "../../src/worker/contract.ts";
import type { AppSettings } from "../../src/worker/db.ts";
import { readSignature } from "../../src/worker/esign.ts";

const s = {
  companyName: "Underground Associates",
  legalName: "Underground Associates LLC",
  plans: [{ id: "plus", name: "Plus", setup: 0, monthly: 89, includes: "Everything in Basic\nMonthly report" }],
  minMonths: 12,
  shortMonths: 6,
  flexSetup: 299,
  annualMonthsFree: 2,
  churchAnnualMonthsFree: 4,
  addons: [
    { name: "Photo shoot", price: 199, unit: "one-time" },
    { name: "Logo refresh", price: 179, unit: "one-time", terms: "Our own logo terms." },
    { name: "Ad management", price: 149, unit: "month" },
  ],
} as unknown as AppSettings;

test("the agreement holds the order, plan, way to pay, main terms and only the extras picked", () => {
  const order = priceSignup(s, "plus", "standard", [{ index: 0, qty: 1 }, { index: 1, qty: 1 }]);
  const text = contractText(s, order, { business: "Joe's Pizza", kind: "signup" });
  assert.match(text, /Between Underground Associates LLC \("we"\) and Joe's Pizza/);
  assert.match(text, /YOUR PLAN: PLUS[\s\S]*Monthly report/);
  assert.match(text, /HOW YOU PAY\n12-month plan/);
  assert.match(text, /SERVICE AGREEMENT/);
  assert.match(text, /EXTRA: PHOTO SHOOT \(\$199 one-time\)\n.*20 to 30 edited photos/);
  assert.match(text, /EXTRA: LOGO REFRESH[^\n]*\nOur own logo terms\./);
  assert.doesNotMatch(text, /AD MANAGEMENT/);
  assert.match(text, /ELECTRONIC SIGNATURE/);
});

test("the agreement says when the site goes live and carries the five core lines", () => {
  const order = priceSignup(s, "plus", "standard", []);
  const text = contractText(s, order, { business: "Joe's Pizza", kind: "signup" });
  assert.match(text, /HOW YOU PAY\n12-month plan[^\n]*\n\nTIMING\nWe put your site live within 3 business days after you approve the details\. A same-day build, if bought, goes live the same business day/);
  assert.match(text, /If you cancel before the end of your plan's minimum term, the remaining months of the minimum are due\./);
  assert.match(text, /If a payment fails and isn't fixed within 30 days, we may take the site offline until it's caught up\./);
  assert.match(text, /Our total liability to you is limited to what you paid us in the 3 months before the problem\. Alabama law applies\./);
  assert.match(text, /Our cancellation and refund policy at undergroundassociates\.com\/terms is part of this agreement as of the day you sign\./);
  assert.match(text, /Yearly plans renew each year\. We'll email you at least 30 days before a yearly renewal, and you can cancel before it renews\./);
  assert.doesNotMatch(text, /ALSO PART OF THIS AGREEMENT/);
  // The owner's own agreement text still gets the lines it leaves out.
  const custom = contractText({ ...s, terms: "1. We build and host your site.\n2. Our total liability to you is limited to what you paid us in the 3 months before the problem. Alabama law applies." }, order, { business: "Joe's", kind: "signup" });
  assert.match(custom, /SERVICE AGREEMENT\n1\. We build and host your site\.\n2\. Our total liability[^\n]*\n\nALSO PART OF THIS AGREEMENT\nIf you cancel before the end/);
  assert.equal((custom.match(/total liability/g) ?? []).length, 1);
  const html = contractSectionsHtml(s, { business: "Joe's", kind: "signup", esc: (t) => t });
  assert.match(html, /<h3>Timing<\/h3><p>We put your site live within 3 business days/);
  assert.match(html, /<p data-invoice-text hidden>You pay by check or bank transfer/);
  // Extras-only agreements don't repeat the timing or terms.
  assert.doesNotMatch(contractText(s, priceExtras(s, [{ index: 2, qty: 1 }]), { business: "Joe's", kind: "extras" }), /TIMING/);
});

test("a church's agreement says the ministry rate; an invoice order says nothing is charged online", () => {
  const church = contractText(s, priceSignup(s, "plus", "annual", [], { category: "church" }), { business: "First Example Church", kind: "signup" });
  assert.match(church, /HOW YOU PAY\nPay yearly \(ministry rate\): Ministry rate: 12 months for the price of 8 — \$712\/year/);
  assert.match(church, /Due today: \$712\. Then \$712 per year, charged automatically\./);
  const inv = contractText(s, priceSignup(s, "plus", "invoice", [], { category: "church", invoice: true }), { business: "First Example Church", kind: "signup" });
  assert.match(inv, /On your first invoice: \$89\. Then \$89 per month, invoiced\./);
  assert.match(inv, /HOW YOU PAY\n12-month plan: [^\n]*\nYou pay by check or bank transfer when we send an invoice; nothing is charged online\./);
});

test("extras agreements point back to the existing service agreement", () => {
  const text = contractText(s, priceExtras(s, [{ index: 2, qty: 1 }]), { business: "Joe's Pizza", kind: "extras" });
  assert.match(text, /^EXTRAS AGREEMENT/);
  assert.match(text, /added to your existing website service agreement/);
  assert.match(text, /EXTRA: AD MANAGEMENT \(\$149\/month\)\n.*ad spend/i);
  assert.doesNotMatch(text, /SERVICE AGREEMENT\n/);
});

test("the pop-up carries a section per plan and per extra for the page to show or hide", () => {
  const html = contractSectionsHtml(s, { business: "Joe's", kind: "signup", esc: (t) => t });
  assert.match(html, /data-plan="plus"/);
  for (const i of [0, 1, 2]) assert.match(html, new RegExp(`data-extra="${i}"`));
  assert.equal(extraTerms({ name: "Something new" }).startsWith("We provide this extra"), true);
});

test("a signature needs agreement, a full name and a real drawing", () => {
  const png = "data:image/png;base64," + "A".repeat(3000);
  const form = (o: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(o)) f.set(k, v);
    return f;
  };
  assert.deepEqual(readSignature(form({ agree: "yes", signer_name: "  Pat   Smith ", signature: png })), { name: "Pat Smith", signature: png });
  assert.equal(readSignature(form({ agree: "", signer_name: "Pat Smith", signature: png })), null);
  assert.equal(readSignature(form({ agree: "yes", signer_name: "Pat", signature: png })), null);
  assert.equal(readSignature(form({ agree: "yes", signer_name: "Pat Smith", signature: "data:image/png;base64,AAAA" })), null);
  assert.equal(readSignature(form({ agree: "yes", signer_name: "Pat Smith", signature: "javascript:alert(1)" })), null);
});
