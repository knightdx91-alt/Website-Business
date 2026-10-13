import assert from "node:assert/strict";
import { test } from "node:test";
import { commissionRules, commissionTable, DEFAULT_COMMISSION, pickOpener, quoteCommission, quoteFromSignup, stripeFee } from "../../src/worker/commission.ts";
import { getSettings, type AddOn } from "../../src/worker/db.ts";

const ADDONS: AddOn[] = [
  { name: "Photo shoot", price: 199, unit: "one-time" },
  { name: "Social media posts", price: 129, unit: "month" },
  { name: "QR table tents & window sign", price: 49, unit: "each" },
  { name: "Business cards", price: 0, unit: "quote" },
  { name: "Google Business Profile setup", price: 149, unit: "one-time", founderPick: true },
];
async function settings(extra: Record<string, unknown> = {}) {
  const raw = JSON.stringify({
    plans: [
      { id: "basic", name: "Basic", setup: 0, monthly: 49, includes: "" },
      { id: "plus", name: "Plus", setup: 0, monthly: 89, includes: "" },
      { id: "pro", name: "Pro", setup: 0, monthly: 149, includes: "" },
    ],
    addons: ADDONS,
    minMonths: 12,
    shortMonths: 6,
    flexSetup: 299,
    annualMonthsFree: 2,
    founderSlots: 5,
    ...extra,
  });
  const env = { DB: { prepare: () => ({ bind: () => ({ first: async () => ({ value: raw }) }) }) } } as never;
  return getSettings(env);
}

test("plans alone: one month up front + 10% residual; month to month adds 20% of the setup fee; yearly is a month + 10% of the year", async () => {
  const s = await settings();
  let q = quoteCommission(s, { plan: "basic", billing: "standard" });
  assert.deepEqual([q.clientFirst, q.bonus, q.residualEach, q.yearOne, q.overCap], [4900, 4900, 490, 4900 + 490 * 11, 4900 + 490 * 23]);
  q = quoteCommission(s, { plan: "basic", billing: "short" });
  assert.equal(q.bonus, 4900, "the 6-month plan earns the same as the 12-month plan");
  q = quoteCommission(s, { plan: "basic", billing: "flex" });
  assert.deepEqual([q.clientFirst, q.bonus, q.residualEach], [34800, 4900 + 5980, 490]);
  q = quoteCommission(s, { plan: "plus", billing: "annual" });
  assert.deepEqual([q.clientFirst, q.bonus, q.residualEach, q.interval, q.yearOne, q.overCap], [89000, 8900 + 8900, 8900, "year", 17800, 17800 + 8900]);
  // The church yearly rate (4 months free) changes the yearly payment and so the 10%.
  q = quoteCommission(s, { plan: "basic", billing: "annual", church: true });
  assert.deepEqual([q.clientFirst, q.bonus], [39200, 4900 + 3920]);
});

test("extras: monthly ones like the plan, one-time and per-item 20%, priced per job 20% of the quote, a founder's free pick nothing", async () => {
  const s = await settings();
  const q = quoteCommission(s, {
    plan: "basic",
    billing: "flex",
    picks: [{ index: 0, qty: 1 }, { index: 1, qty: 1 }, { index: 2, qty: 3 }, { index: 3, qty: 1 }],
    founder: 4,
    quoteDollars: 250,
  });
  const by = Object.fromEntries(q.items.map((i) => [i.kind, i]));
  assert.equal(by["one-time extra"]!.bonus, 3980);
  assert.deepEqual([by["monthly extra"]!.bonus, by["monthly extra"]!.residual], [12900, 1290]);
  assert.equal(by["per-item extra"]!.bonus, Math.round(4900 * 3 * 0.2));
  assert.equal(by["per-item extra"]!.what, "QR table tents & window sign × 3");
  assert.equal(by["priced per job"]!.bonus, 5000);
  assert.equal(by.free!.bonus, 0);
  assert.equal(q.bonus, 4900 + 5980 + 3980 + 12900 + 2940 + 5000);
  assert.equal(q.residualEach, 490 + 1290);
  // A monthly extra on a yearly plan is charged ×12, so its 10% is of the year.
  const y = quoteCommission(s, { plan: "basic", billing: "annual", picks: [{ index: 1, qty: 1 }] });
  const sm = y.items.find((i) => i.kind === "monthly extra")!;
  assert.deepEqual([sm.bonus, sm.residual], [12900 + 15480, 15480]);
  // Without the quoted amount, a note says how it works.
  assert.match(quoteCommission(s, { plan: "basic", billing: "standard", picks: [{ index: 3, qty: 1 }] }).notes.join(" "), /type the quoted amount/);
});

test("split sales and the owner: 40/60 on the bonus, residuals to the closer; the owner's share stays in the company unless owner commission is on", async () => {
  const s = await settings();
  let q = quoteCommission(s, { plan: "basic", billing: "flex", who: "split" });
  const [opener, closer] = q.payouts;
  assert.deepEqual([opener!.first, opener!.each, closer!.first, closer!.each], [4352, 0, 6528, 490]);
  assert.equal(opener!.first + closer!.first, q.bonus);
  q = quoteCommission(s, { plan: "basic", billing: "flex", who: "split", owner: "opener" });
  assert.equal(q.payouts[0]!.keptByCompany, true);
  assert.equal(q.company.paidOutYearOne, q.payouts[1]!.yearOne, "only the closer is paid");
  const a = quoteCommission(await settings({ commissionPlan: { ownerEarns: true } }), { plan: "basic", billing: "flex", owner: "seller" });
  assert.equal(a.payouts[0]!.keptByCompany, false);
  // Company side adds up: client = Stripe + paid out + team pool + left.
  assert.equal(q.clientYearOne, q.company.stripeYearOne + q.company.paidOutYearOne + q.company.teamPoolYearOne + q.company.leftYearOne);
  assert.equal(stripeFee(34800), 1009 + 30);
});

test("rules come from Settings with defaults for anything missing; the table covers every plan × way to pay and every extra", async () => {
  const s = await settings({ commissionPlan: { residualPct: 15, ownerEarns: true, bogus: 3, setupPct: -5 } });
  const r = commissionRules(s);
  assert.equal(r.residualPct, 15);
  assert.equal(r.setupPct, DEFAULT_COMMISSION.setupPct, "a negative number is ignored");
  assert.equal(r.ownerEarns, true);
  const t = commissionTable(s);
  assert.equal(t.plans.length, 3 * 4 + 2, "3 website plans × 4 ways to pay + the Price list plan's 2");
  assert.equal(t.extras.length, ADDONS.length);
  const unlimited = commissionTable(await settings({ commissionPlan: { residualCapMonths: 0 } }));
  assert.equal(unlimited.plans[0]!.overCap, -1, "no cap = no lifetime total");
});

test("who opened it: the first person to log real contact, unless they closed it too or went quiet past the window", () => {
  const day = 86_400_000;
  const notes = [
    { author: "Chris", created_at: 1 * day },
    { author: "Chris", created_at: 10 * day },
    { author: "Katy", created_at: 20 * day },
  ];
  assert.equal(pickOpener(notes, "Katy", 25 * day, 30), "Chris");
  assert.equal(pickOpener(notes, "Katy", 45 * day, 30), null, "Chris's last contact was 35 days before the sign-up");
  assert.equal(pickOpener(notes, "chris", 25 * day, 30), null, "the closer opened it");
  assert.equal(pickOpener([], "Katy", 25 * day, 30), null);
});

test("a stored sign-up is re-priced with the plan as it was signed", async () => {
  const s = await settings();
  const q = quoteFromSignup(s, {
    plan_json: JSON.stringify({ id: "basic", name: "Basic", setup: 0, monthly: 39, includes: "", billing: "flex" }),
    extras_json: JSON.stringify({ picks: [{ index: 0, qty: 1 }] }),
    category: "restaurant",
  })!;
  assert.equal(q.bonus, 3900 + 5980 + 3980, "the old $39 price, not today's $49");
});
