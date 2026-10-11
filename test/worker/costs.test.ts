import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_ADDONS, DEFAULT_LIST_PLAN, type AppSettings } from "../../src/worker/db.ts";
import { SERVICES, costsReport, estimate, monthKey, previousMonthKey } from "../../src/worker/costs.ts";
import { guideById } from "../../src/worker/guides.ts";

const settings = () => ({ plans: [{ id: "plus", name: "Plus", setup: 0, monthly: 89, includes: "" }, DEFAULT_LIST_PLAN], addons: DEFAULT_ADDONS, companyName: "Underground Associates" }) as unknown as AppSettings;

/** A D1 stand-in: usage rows, a settings table, and the paid sign-ups query. */
function fakeEnv(usage: Array<[string, string, number]>, settingsRows: Record<string, string> = {}) {
  const saved: Record<string, string> = { ...settingsRows };
  return {
    saved,
    env: {
      DB: {
        prepare: (sql: string) => ({
          bind: (...args: unknown[]) => ({
            all: async () => {
              if (sql.includes("FROM usage_daily")) {
                const months = args as string[];
                const by = new Map<string, number>();
                for (const [day, metric, qty] of usage) if (months.includes(day.slice(0, 7))) by.set(`${day.slice(0, 7)}|${metric}`, (by.get(`${day.slice(0, 7)}|${metric}`) ?? 0) + qty);
                return { results: [...by].map(([k, qty]) => ({ month: k.split("|")[0], metric: k.split("|")[1], qty })) };
              }
              return { results: [] };
            },
            first: async () => {
              if (sql.includes("FROM settings")) return saved[args[0] as string] === undefined ? null : { value: saved[args[0] as string] };
              if (sql.includes("due_cents")) return { cents: 17800, n: 2 };
              return null;
            },
            run: async () => {
              if (sql.includes("INTO settings")) saved[args[0] as string] = args[1] as string;
              return {};
            },
          }),
        }),
      },
    } as never,
  };
}

test("estimate: free allowance first, then the rate; tokens are priced per million", () => {
  assert.equal(estimate({ metric: "m", label: "", unit: "each", unitCents: 3.5, freeQty: 1000 }, 800), 0);
  assert.equal(estimate({ metric: "m", label: "", unit: "each", unitCents: 3.5, freeQty: 1000 }, 1400), 1400);
  assert.equal(estimate({ metric: "m", label: "", unit: "per_million", unitCents: 400, freeQty: 0 }, 2_500_000), 1000);
  assert.equal(estimate({ metric: "m", label: "", unit: "each", unitCents: 0, freeQty: 3000 }, 9000), 0);
});

test("month keys", () => {
  assert.equal(monthKey(new Date("2026-10-11T19:00:00Z")), "2026-10");
  assert.equal(previousMonthKey(new Date("2026-01-11T19:00:00Z")), "2025-12");
});

test("every service says what it does, what stops, and where to log in; usage services carry rates", () => {
  const ids = new Set<string>();
  for (const s of SERVICES) {
    assert.ok(!ids.has(s.id), s.id);
    ids.add(s.id);
    assert.ok(s.what.length > 30 && s.ifItStops.length > 30, s.id);
    assert.ok(s.url, s.id);
    if (s.kind === "usage") assert.ok(s.rates?.length, s.id);
    if (s.kind === "fixed") assert.ok(s.renewEvery, s.id);
  }
  for (const id of ["cloudflare", "domain", "google-places", "anthropic", "stripe", "resend", "brave", "google-workspace"]) assert.ok(ids.has(id), id);
});

test("the report: this month vs last, estimates after free tiers, fixed totals, fees, revenue, warnings; overrides change the math", async () => {
  const now = new Date("2026-10-11T19:00:00Z");
  const { env, saved } = fakeEnv([
    ["2026-10-02", "places.search", 900],
    ["2026-10-09", "places.search", 300],
    ["2026-09-20", "places.search", 400],
    ["2026-10-05", "anthropic.claude-opus-5-5.in", 2_000_000],
    ["2026-10-05", "anthropic.claude-opus-5-5.out", 500_000],
    ["2026-10-05", "anthropic.claude-opus-5-5.calls", 40],
    ["2026-10-06", "anthropic.claude-future-9.in", 1_000_000],
    ["2026-10-07", "brave.search", 1700],
  ]);
  const r = await costsReport(env, settings(), { now, revenue: { monthly: 356, signed: 445 } });
  assert.equal(r.month, "2026-10");
  assert.equal(r.lastMonth, "2026-09");
  const places = r.services.find((s) => s.id === "google-places")!;
  const search = places.usage.find((l) => l.metric === "places.search")!;
  assert.equal(search.month, 1200);
  assert.equal(search.lastMonth, 400);
  assert.equal(search.estCents, 700); // 200 over the free 1,000 at 3.5¢
  assert.equal(search.freeUsed, 1);
  assert.match(places.warnings.join(" "), /100% of the free 1,000/);
  const ai = r.services.find((s) => s.id === "anthropic")!;
  assert.equal(ai.usage.find((l) => l.metric === "anthropic.claude-opus-5-5.in")!.estCents, 800); // 2M × $4
  assert.equal(ai.usage.find((l) => l.metric === "anthropic.claude-opus-5-5.out")!.estCents, 1000); // 0.5M × $20
  const unknown = ai.usage.find((l) => l.metric === "anthropic.claude-future-9.in")!;
  assert.match(unknown.note ?? "", /Opus rate/);
  assert.equal(unknown.estCents, 400);
  assert.equal(ai.perMonthCents, 2200);
  const brave = r.services.find((s) => s.id === "brave")!;
  assert.equal(brave.usage[0]!.estCents, 0);
  assert.match(brave.warnings.join(" "), /85% of the free 2,000/);
  const cf = r.services.find((s) => s.id === "cloudflare")!;
  assert.equal(cf.perMonthCents, 500);
  assert.equal(r.services.find((s) => s.id === "domain")!.perMonthCents, 87); // $10.44 a year ÷ 12
  assert.match(r.services.find((s) => s.id === "dev-tools")!.warnings.join(" "), /Price not filled in/);
  assert.equal(r.totals.feesCents, Math.round(17800 * 0.029 + 60));
  assert.equal(r.totals.revenueCents, 35600);
  assert.equal(r.totals.signedRevenueCents, 44500);
  assert.equal(r.totals.fixedCents, 500 + 87 + 840);
  assert.equal(r.totals.outCents, Math.round(r.totals.fixedCents + r.totals.usageCents + r.totals.feesCents));
  assert.ok(r.warnings.some((w) => /Google Places API: Searches/.test(w)));

  // Overrides: a renewal date, a price, a cheaper search rate and a bigger free tier.
  saved["costs_json"] = JSON.stringify({ services: { domain: { renews: "2026-10-30", account: "owner@undergroundassociates.com" }, "dev-tools": { monthlyCents: 2000 } }, rates: { "places.search": { unitCents: 2, freeQty: 1100 } }, budgetCents: 1000 });
  const r2 = await costsReport(env, settings(), { now, revenue: { monthly: 356, signed: 445 } });
  assert.equal(r2.services.find((s) => s.id === "google-places")!.usage[0]!.estCents, 200); // 100 over 1,100 at 2¢
  assert.equal(r2.services.find((s) => s.id === "domain")!.account, "owner@undergroundassociates.com");
  assert.match(r2.services.find((s) => s.id === "domain")!.warnings.join(" "), /Renews in 18 days/);
  assert.equal(r2.services.find((s) => s.id === "dev-tools")!.perMonthCents, 2000);
  assert.match(r2.warnings[0]!, /over the \$10\.00 budget/);
});

test("the costs guide exists and names the services", () => {
  const g = guideById("costs", settings())!;
  assert.ok(g);
  const t = g.sections.map((s) => s.steps.join("\n")).join("\n");
  for (const name of ["Cloudflare", "Google Places", "Anthropic", "Stripe", "Resend", "Brave"]) assert.ok(t.includes(name), name);
  assert.ok(g.sections.some((s) => /monthly check/i.test(s.title)));
});
