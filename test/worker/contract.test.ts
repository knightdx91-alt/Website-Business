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
