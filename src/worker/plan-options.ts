import { priceSignup } from "./checkout.ts";
import { billingOptions, type AppSettings } from "./db.ts";
import { addonPriceText, commitWords, payTerms, payWays, priceShort, SUGGESTED_PLANS } from "./content.ts";

/**
 * `GET /api/plans/options?lead=<id>`: what Show plans and the In-person guide need to talk price, computed here so
 * the Android app never ports the billing math: every plan with its ways to pay (`billingOptions` + what is due
 * today from `priceSignup`), the plain-language "Ways to pay" list, the terms behind the headline sentences, and
 * the extras with their prices formatted. `category` "church" gives the ministry rate.
 */
export function plansOptions(s: AppSettings, category?: string) {
  const church = category === "church";
  const all = s.plans.length ? s.plans : SUGGESTED_PLANS;
  const plans = all.filter((p) => p.monthly);
  const t = payTerms(s, church);
  const perDay = (m: number) => Math.round((m * 12 / 365) * 100) / 100;
  // priceSignup reads s.plans, so the suggested plans stand in when Settings has none.
  const priced = { ...s, plans: all };
  return {
    church,
    plans: plans.map((p) => ({
      id: p.id,
      name: p.name,
      monthly: p.monthly,
      setup: p.setup ?? 0,
      perDay: perDay(p.monthly),
      includes: String(p.includes || "").split("\n").map((x) => x.trim()).filter(Boolean),
      options: billingOptions(p, s, { category }).map((o) => {
        const order = priceSignup(priced, p.id, o.id, [], { category });
        return { id: o.id, label: o.label, detail: o.detail, monthlyEquivalent: o.monthlyEquivalent, dueTodayCents: order.dueToday, renews: order.renews };
      }),
    })),
    terms: { min: t.min, short: t.short, commits: t.commits, commitWords: t.commits.length ? commitWords(t) : "", flex: t.flex, free: t.free },
    payWays: payWays(s, plans, church).map(([title, detail]) => ({ title, detail })),
    priceShort: priceShort(s, all, church),
    invoice: s.invoiceForAll !== false || church,
    addons: (s.addons ?? []).map((a) => ({ name: a.name, about: a.about ?? "", price: addonPriceText(a), unit: a.unit })),
  };
}
