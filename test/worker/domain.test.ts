import assert from "node:assert/strict";
import { test } from "node:test";
import { pickerHtml, priceSignup } from "../../src/worker/checkout.ts";
import { quoteCommission } from "../../src/worker/commission.ts";
import { offerHint, playbookObjections, SUGGESTED_PLANS } from "../../src/worker/content.ts";
import { extraTerms } from "../../src/worker/contract.ts";
import { DEFAULT_ADDONS, defaultTerms, isDomainAddon, planIncludesDomain, type AppSettings } from "../../src/worker/db.ts";

// The domain rule (Oct 2026): every client picks the free .pages.dev address, a domain they buy, or one we buy for them
// in their name (the Domain name extra, free on a plan that includes a domain). Whichever, the domain is theirs.

const D = DEFAULT_ADDONS.findIndex(isDomainAddon);
const s = {
  plans: SUGGESTED_PLANS.filter((p) => p.id !== "list"),
  minMonths: 12,
  shortMonths: 6,
  flexSetup: 299,
  annualMonthsFree: 2,
  addons: DEFAULT_ADDONS,
} as unknown as AppSettings;

test("the Domain name extra exists, sits last (older picks keep their positions) and only it matches", () => {
  assert.equal(D, DEFAULT_ADDONS.length - 1);
  assert.equal(DEFAULT_ADDONS[D]!.unit, "month");
  assert.deepEqual(DEFAULT_ADDONS.filter(isDomainAddon).length, 1);
  assert.ok(planIncludesDomain(SUGGESTED_PLANS.find((p) => p.id === "pro")));
  assert.ok(!planIncludesDomain(SUGGESTED_PLANS.find((p) => p.id === "basic")));
  assert.ok(!planIncludesDomain(SUGGESTED_PLANS.find((p) => p.id === "plus")));
});

test("Basic + Domain name adds its monthly price; on Pro it is listed as included and charged nothing", () => {
  const basic = priceSignup(s, "basic", "standard", [{ index: D, qty: 1 }]);
  assert.equal(basic.dueToday, 4900 + 200);
  assert.equal(basic.renews!.amount, 4900 + 200);
  const pro = priceSignup(s, "pro", "standard", [{ index: D, qty: 1 }]);
  assert.equal(pro.dueToday, 14900);
  assert.equal(pro.renews!.amount, 14900);
  assert.deepEqual(pro.extras, [{ name: DEFAULT_ADDONS[D]!.name, qty: 1, price: "included with your plan" }]);
  const yearly = priceSignup(s, "basic", "annual", [{ index: D, qty: 1 }]);
  assert.equal(yearly.dueToday, 4900 * 10 + 200 * 12);
});

test("commission follows the price: nothing on a Pro client's free domain", () => {
  const pro = quoteCommission(s, { plan: "pro", billing: "standard", picks: [{ index: D, qty: 1 }] });
  const bare = quoteCommission(s, { plan: "pro", billing: "standard", picks: [] });
  assert.equal(pro.bonus, bare.bonus);
});

test("the picker knows which extra is the domain and which plans include one", () => {
  const html = pickerHtml(s, { esc: (x: string) => x, planId: "pro" });
  assert.match(html, /"domain":true/);
  assert.match(html, /included with "\+p\.name/);
});

test("agreement, extra terms, playbook and hints all say the domain is the client's", () => {
  const terms = defaultTerms(s);
  assert.match(terms, /10\. Your domain and email\. You choose how you get your web address, and whichever you choose, the domain belongs to you/);
  assert.match(terms, /free address we give it/);
  assert.match(extraTerms(DEFAULT_ADDONS[D]!), /^We register the web address you choose in your name/);
  assert.match(offerHint(DEFAULT_ADDONS[D]!.name), /Free on Pro/);
  const q = playbookObjections(s, s.plans).find(([x]) => x.startsWith("“Do I need to buy a domain name?”"));
  assert.match(q![1], /three choices.*belongs to you/);
});
