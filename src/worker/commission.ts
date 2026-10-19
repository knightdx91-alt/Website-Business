import {
  billingOptions,
  addonPrice,
  isDomainAddon,
  isListPlan,
  planIncludesDomain,
  type AddOn,
  type AppSettings,
  type Plan,
} from "./db.ts";
import { dollars, priceSignup, type Pick } from "./checkout.ts";
import type { Env } from "./env.ts";

/**
 * Commission & pay (Oct 2026, the owner's plan; research/commission-page/src/plan.md is the team-facing write-up).
 * Everything a seller earns on a sale follows from these numbers, kept in Settings → Commission (`commissionPlan`), so a
 * change never needs code. All money here is in cents.
 *
 *  - Recurring things (the plan and monthly extras): a bonus of `bonusMonths` months of their monthly price when the
 *    first payment clears, then `residualPct` of every later payment, for `residualCapMonths` months from the first.
 *    Paid yearly: the bonus is one month's price plus `residualPct` of the whole first yearly payment; each renewal
 *    inside the cap earns `residualPct` of it.
 *  - The month-to-month setup fee: `setupPct` of it, with the bonus.
 *  - One-time and per-item extras: `oneTimePct` of what they cost (× quantity), with the bonus.
 *  - Priced-per-job extras: `quotePct` of whatever is charged, when it is paid.
 *  - A founding customer's free extra earns nothing (nothing is paid for it).
 *  - Opened by one person, closed by another (within `openerDays` of the opener's last logged contact): the opener gets
 *    `openerPct` of the bonus, the closer the rest and every residual.
 *  - The owner earns commission only when `ownerEarns` is on; otherwise the owner's share stays in the company.
 *  - The team pool (`teamPoolPct` of what clients pay) pays the office staff; it is shown on the company side only.
 */
export interface CommissionRules {
  bonusMonths: number;
  setupPct: number;
  oneTimePct: number;
  quotePct: number;
  residualPct: number;
  /** 0 = residuals never stop. */
  residualCapMonths: number;
  openerPct: number;
  openerDays: number;
  clawbackDays: number;
  ownerEarns: boolean;
  teamPoolPct: number;
}

export const DEFAULT_COMMISSION: CommissionRules = {
  bonusMonths: 1,
  setupPct: 20,
  oneTimePct: 20,
  quotePct: 20,
  residualPct: 10,
  residualCapMonths: 24,
  openerPct: 40,
  openerDays: 30,
  clawbackDays: 60,
  ownerEarns: false,
  teamPoolPct: 15,
};

export function commissionRules(s: Pick2<AppSettings, "commissionPlan">): CommissionRules {
  const r = { ...DEFAULT_COMMISSION };
  const saved = s.commissionPlan ?? {};
  for (const k of Object.keys(r) as Array<keyof CommissionRules>) {
    const v = saved[k];
    if (v === undefined || v === null) continue;
    if (k === "ownerEarns") r.ownerEarns = !!v;
    else if (typeof v === "number" && Number.isFinite(v) && v >= 0) (r[k] as number) = v;
  }
  return r;
}
type Pick2<T, K extends keyof T> = { [P in K]?: T[P] };

/** Stripe's card fee on one charge: 2.9% + 30¢. */
export function stripeFee(cents: number): number {
  return cents > 0 ? Math.round(cents * 0.029) + 30 : 0;
}

const pct = (cents: number, p: number) => Math.round((cents * p) / 100);

export interface CommissionItem {
  what: string;
  kind: "plan" | "setup" | "monthly extra" | "one-time extra" | "per-item extra" | "priced per job" | "free";
  /** What the client pays for it, in words. */
  price: string;
  /** Earned when the first payment clears. */
  bonus: number;
  /** Earned on every later payment (each month, or each yearly renewal). */
  residual: number;
  /** How this item's commission is worked out, in words. */
  how: string;
}

export interface Payout {
  /** "Seller" when one person did it all; "Opener" / "Closer" on a split sale. */
  role: "Seller" | "Opener" | "Closer";
  owner: boolean;
  /** The owner's share under Model B: it stays in the company and nobody is paid it. */
  keptByCompany: boolean;
  first: number;
  each: number;
  yearOne: number;
  overCap: number;
}

export interface CommissionQuote {
  plan: string;
  billing: string;
  billingLabel: string;
  interval: "month" | "year";
  clientFirst: number;
  clientEach: number;
  clientYearOne: number;
  items: CommissionItem[];
  bonus: number;
  residualEach: number;
  /** Later payments in the first 12 months (11 monthly, 0 yearly) and within the residual cap. */
  laterInYearOne: number;
  laterInCap: number;
  yearOne: number;
  overCap: number;
  payouts: Payout[];
  company: {
    stripeYearOne: number;
    paidOutYearOne: number;
    teamPoolYearOne: number;
    leftYearOne: number;
  };
  notes: string[];
}

export interface QuoteInput {
  plan: string;
  billing: string;
  picks?: Pick[];
  founder?: number | null;
  /** Prices the yearly option at the church / nonprofit rate. */
  church?: boolean;
  /** What will be charged for the priced-per-job extras, in dollars (their commission is a share of it). */
  quoteDollars?: number;
  who?: "solo" | "split";
  /** Where the owner is in the sale: not at all, did it all, opened it, closed it. */
  owner?: "none" | "seller" | "opener" | "closer";
}

/** Exactly what a sale earns, priced by the same code that charges the client (`priceSignup`). */
export function quoteCommission(s: AppSettings, input: QuoteInput, rules = commissionRules(s)): CommissionQuote {
  const picks = (input.picks ?? []).filter((p) => s.addons[p.index]);
  const order = priceSignup(s, input.plan, input.billing, picks, {
    category: input.church ? "church" : undefined,
    founder: input.founder ?? null,
  });
  const plan = order.plan!;
  const option = order.option!;
  const yearly = option.id === "annual";
  const interval: "month" | "year" = yearly ? "year" : "month";
  const items: CommissionItem[] = [];
  const months = rules.bonusMonths;
  const r = rules.residualPct;

  // The plan.
  const planPay = order.lines[0]!.amount; // monthly price, or the yearly price
  const planMonthly = Math.round(plan.monthly * 100);
  items.push({
    what: `${plan.name} plan`,
    kind: "plan",
    price: yearly ? `${dollars(planPay)} a year` : `${dollars(planMonthly)} a month`,
    bonus: yearly ? planMonthly * months + pct(planPay, r) : planMonthly * months,
    residual: pct(planPay, r),
    how: yearly
      ? `${months === 1 ? "One month" : `${months} months`} of the plan (${dollars(planMonthly * months)}) + ${r}% of the yearly payment; ${r}% of each renewal`
      : `${months === 1 ? "One month" : `${months} months`} of the plan up front, then ${r}% of each monthly payment`,
  });
  // The setup fee (month to month).
  const setupLine = order.lines.find((l) => /^Setup fee/.test(l.name));
  if (setupLine)
    items.push({
      what: setupLine.name,
      kind: "setup",
      price: `${dollars(setupLine.amount)} once`,
      bonus: pct(setupLine.amount, rules.setupPct),
      residual: 0,
      how: `${rules.setupPct}% of the setup fee, paid with the bonus`,
    });
  // Extras.
  for (const p of picks) {
    const a: AddOn = s.addons[p.index]!;
    const cents = Math.round(a.price * 100);
    if (isDomainAddon(a) && planIncludesDomain(plan)) {
      items.push({
        what: `${a.name} (included with ${plan.name})`,
        kind: "free",
        price: "included",
        bonus: 0,
        residual: 0,
        how: "Nothing is charged for it, so it earns nothing",
      });
    } else if (a.unit === "month") {
      const pay = yearly ? cents * 12 : cents;
      items.push({
        what: a.name,
        kind: "monthly extra",
        price: `${a.setup ? `${dollars(Math.round(a.setup * 100))} upfront, then ` : ""}${yearly ? `${dollars(pay)} a year` : `${dollars(cents)} a month`}`,
        bonus: yearly ? cents * months + pct(pay, r) : cents * months,
        residual: pct(pay, r),
        how: (yearly
          ? `One month of it (${dollars(cents * months)}) + ${r}% of its yearly charge; ${r}% of each renewal`
          : `One month of it up front, then ${r}% of each monthly charge, like the plan`) +
          (a.setup ? ". The upfront part pays for the registration itself, so it earns nothing" : ""),
      });
    } else if (a.unit === "quote") {
      const charged = Math.round(Math.max(0, input.quoteDollars ?? 0) * 100);
      items.push({
        what: a.name,
        kind: "priced per job",
        price: charged ? `${dollars(charged)} quoted` : "priced per job",
        bonus: pct(charged, rules.quotePct),
        residual: 0,
        how: `${rules.quotePct}% of whatever we charge for it, paid when the client pays it`,
      });
    } else {
      const total = cents * p.qty;
      items.push({
        what: p.qty > 1 ? `${a.name} × ${p.qty}` : a.name,
        kind: a.unit === "each" ? "per-item extra" : "one-time extra",
        price: p.qty > 1 ? `${dollars(cents)} each, ${dollars(total)}` : addonPrice(a),
        bonus: pct(total, rules.oneTimePct),
        residual: 0,
        how: `${rules.oneTimePct}% of what it costs, paid with the bonus`,
      });
    }
  }
  if (order.founder)
    items.push({
      what: `${order.founder} (free, founding customer)`,
      kind: "free",
      price: "free",
      bonus: 0,
      residual: 0,
      how: "Nothing is paid for it, so it earns nothing",
    });

  const bonus = items.reduce((t, i) => t + i.bonus, 0);
  const residualEach = items.reduce((t, i) => t + i.residual, 0);
  const cap = rules.residualCapMonths;
  const laterInYearOne = yearly ? 0 : 11;
  const laterInCap = yearly
    ? cap > 0 ? Math.max(0, Math.ceil(cap / 12) - 1) : Infinity
    : cap > 0 ? Math.max(0, cap - 1) : Infinity;
  const yearOne = bonus + residualEach * laterInYearOne;
  const overCap = Number.isFinite(laterInCap) ? bonus + residualEach * laterInCap : NaN;

  // Who gets it.
  const who = input.who ?? "solo";
  const owner = input.owner ?? "none";
  const keep = (isOwner: boolean) => isOwner && !rules.ownerEarns;
  const pay = (role: Payout["role"], isOwner: boolean, share: number, residualShare: number): Payout => ({
    role,
    owner: isOwner,
    keptByCompany: keep(isOwner),
    first: Math.round(bonus * share),
    each: Math.round(residualEach * residualShare),
    yearOne: Math.round(bonus * share) + Math.round(residualEach * residualShare) * laterInYearOne,
    overCap: Number.isFinite(laterInCap)
      ? Math.round(bonus * share) + Math.round(residualEach * residualShare) * laterInCap
      : NaN,
  });
  const payouts: Payout[] =
    who === "split"
      ? [
          pay("Opener", owner === "opener", rules.openerPct / 100, 0),
          pay("Closer", owner === "closer", 1 - rules.openerPct / 100, 1),
        ]
      : [pay("Seller", owner === "seller", 1, 1)];

  // The company side, first 12 months.
  const clientFirst = order.dueToday;
  const clientEach = order.renews?.amount ?? 0;
  const clientYearOne = clientFirst + clientEach * laterInYearOne;
  const stripeYearOne = order.invoice ? 0 : stripeFee(clientFirst) + stripeFee(clientEach) * laterInYearOne;
  const paidOutYearOne = payouts.filter((p) => !p.keptByCompany).reduce((t, p) => t + p.yearOne, 0);
  const teamPoolYearOne = pct(clientYearOne, rules.teamPoolPct);

  const notes: string[] = [];
  if (!yearly) notes.push(`The bonus is paid once the first payment clears; ${r}% of each later payment is paid monthly.`);
  else notes.push(`The bonus is paid once the yearly payment clears; each renewal inside the ${cap}-month limit earns ${r}% of it.`);
  if (cap > 0) notes.push(`Payments stop counting ${cap} months after the first payment.`);
  if (rules.clawbackDays)
    notes.push(`If the client cancels or is refunded within ${rules.clawbackDays} days, the bonus comes back out of the next payout.`);
  if (items.some((i) => i.kind === "priced per job") && !input.quoteDollars)
    notes.push(`Priced-per-job extras earn ${rules.quotePct}% of what is charged: type the quoted amount to see it.`);
  if (payouts.some((p) => p.keptByCompany))
    notes.push("The owner's share isn't paid as commission (Settings → Commission: owner earns commission is off); it stays in the company.");
  if (isListPlan(plan)) notes.push("The Price list plan has no month-to-month setup fee and no minimum term.");

  return {
    plan: plan.name,
    billing: option.id,
    billingLabel: option.label,
    interval,
    clientFirst,
    clientEach,
    clientYearOne,
    items,
    bonus,
    residualEach,
    laterInYearOne,
    laterInCap: Number.isFinite(laterInCap) ? laterInCap : -1,
    yearOne,
    overCap: Number.isFinite(overCap) ? overCap : -1,
    payouts,
    company: {
      stripeYearOne,
      paidOutYearOne,
      teamPoolYearOne,
      leftYearOne: clientYearOne - stripeYearOne - paidOutYearOne - teamPoolYearOne,
    },
    notes,
  };
}

/** Every plan × every way to pay with no extras, and every extra on its own: the "at a glance" tables. */
export function commissionTable(s: AppSettings, rules = commissionRules(s)) {
  const plans = s.plans
    .filter((p) => p.monthly > 0)
    .flatMap((p: Plan) =>
      billingOptions(p, s).map((o) => {
        const q = quoteCommission(s, { plan: p.id, billing: o.id }, rules);
        return {
          plan: p.name,
          planId: p.id,
          billing: o.id,
          billingLabel: o.label,
          clientFirst: q.clientFirst,
          clientEach: q.clientEach,
          interval: q.interval,
          bonus: q.bonus,
          residualEach: q.residualEach,
          yearOne: q.yearOne,
          overCap: q.overCap,
        };
      }),
    );
  const r = rules.residualPct;
  const extras = s.addons.map((a, index) => {
    const cents = Math.round(a.price * 100);
    const base = { index, name: a.name, unit: a.unit, price: addonPrice(a), founderPick: !!a.founderPick };
    if (a.unit === "month")
      return {
        ...base,
        bonus: cents * rules.bonusMonths,
        residualEach: pct(cents, r),
        yearlyBonus: cents * rules.bonusMonths + pct(cents * 12, r),
        yearlyResidual: pct(cents * 12, r),
        how: `One month up front, then ${r}% each month (paid yearly: one month + ${r}% of the year)`,
      };
    if (a.unit === "quote")
      return { ...base, bonus: 0, residualEach: 0, how: `${rules.quotePct}% of whatever we charge` };
    return {
      ...base,
      bonus: pct(cents, rules.oneTimePct),
      residualEach: 0,
      how: a.unit === "each" ? `${rules.oneTimePct}% of the price, for each one` : `${rules.oneTimePct}% of the price, once`,
    };
  });
  return { plans, extras };
}

/* ---------- Who earned what this month (Sales) ---------- */

/** Call-log outcomes that count as real contact with the business owner (who "opened" the lead). */
export const CONTACT_OUTCOMES = ["reached", "visited", "flyer", "callback", "shown", "sold"] as const;

interface SignupRow {
  id: string;
  lead_id: string;
  plan_json: string;
  extras_json: string | null;
  sent_by: string | null;
  created_at: number;
  category: string | null;
}

export interface OwedRow {
  person: string;
  sales: number;
  bonus: number;
  residual: number;
  total: number;
}

/** True for the owner's own session name. */
const isOwnerName = (n: string) => n.trim().toLowerCase() === "owner";

/**
 * Estimated commission for one month: bonuses on paid sign-ups made in the month (split with an opener when the rules
 * say so), plus residuals on paying clients signed in earlier months, inside the cap. An estimate: Stripe is the record
 * of what actually cleared, and refunds within the clawback window take the bonus back.
 */
export async function commissionForMonth(env: Env, s: AppSettings, monthStart: number, now = Date.now()): Promise<OwedRow[]> {
  const rules = commissionRules(s);
  const rows = await env.DB.prepare(
    `SELECT s.id, s.lead_id, s.plan_json, s.extras_json, s.sent_by, s.created_at, l.category
       FROM signups s JOIN leads l ON l.id = s.lead_id
      WHERE s.paid = 1 AND l.place_id != 'paytest' AND l.sales_status IN ('sold', 'live')`,
  ).all<SignupRow>();
  const by = new Map<string, OwedRow>();
  const add = (person: string, field: "bonus" | "residual", cents: number, sale = false) => {
    if (!cents && !sale) return;
    if (isOwnerName(person) && !rules.ownerEarns) return;
    const r = by.get(person) ?? { person, sales: 0, bonus: 0, residual: 0, total: 0 };
    r[field] += cents;
    r.total += cents;
    if (sale) r.sales++;
    by.set(person, r);
  };
  for (const row of rows.results) {
    const quote = quoteFromSignup(s, row, rules);
    if (!quote) continue;
    const closer = row.sent_by || "Owner";
    if (row.created_at >= monthStart && row.created_at < now) {
      const opener = await openerOf(env, row.lead_id, closer, row.created_at, rules);
      if (opener) {
        const share = Math.round(quote.bonus * (rules.openerPct / 100));
        add(opener, "bonus", share, false);
        add(closer, "bonus", quote.bonus - share, true);
      } else add(closer, "bonus", quote.bonus, true);
      continue;
    }
    if (row.created_at >= monthStart) continue;
    // Residuals: one per month (monthly) or one per anniversary month (yearly), inside the cap.
    const monthsIn = monthsBetween(row.created_at, monthStart);
    if (rules.residualCapMonths > 0 && monthsIn >= rules.residualCapMonths) continue;
    if (quote.interval === "year" && monthsIn % 12 !== 0) continue;
    add(closer, "residual", quote.residualEach);
  }
  return [...by.values()].sort((a, b) => b.total - a.total);
}

function monthsBetween(from: number, to: number): number {
  const a = new Date(from);
  const b = new Date(to);
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
}

/** Re-prices a stored sign-up with the plan as it was signed (prices can change later) and works out its commission. */
export function quoteFromSignup(s: AppSettings, row: Pick3<SignupRow, "plan_json" | "extras_json" | "category">, rules = commissionRules(s)): CommissionQuote | null {
  try {
    const plan = JSON.parse(row.plan_json) as Plan & { billing?: string };
    const x = row.extras_json ? (JSON.parse(row.extras_json) as { picks?: Pick[]; billing?: string; founder?: string }) : {};
    const billing = x.billing === "invoice" ? "standard" : (plan.billing ?? x.billing ?? "standard");
    const settings: AppSettings = { ...s, plans: [plan, ...s.plans.filter((p) => p.id !== plan.id)] };
    return quoteCommission(settings, { plan: plan.id, billing, picks: x.picks ?? [], church: row.category === "church" }, rules);
  } catch {
    return null;
  }
}
type Pick3<T, K extends keyof T> = { [P in K]: T[P] };

/** The opener, when it isn't the closer and their last logged contact was within the rules' window before the sign-up. */
async function openerOf(env: Env, leadId: string, closer: string, signedAt: number, rules: CommissionRules): Promise<string | null> {
  const notes = await env.DB.prepare(
    `SELECT author, created_at FROM lead_notes WHERE lead_id = ? AND created_at <= ? AND outcome IN (${CONTACT_OUTCOMES.map(() => "?").join(",")}) ORDER BY created_at`,
  )
    .bind(leadId, signedAt, ...CONTACT_OUTCOMES)
    .all<{ author: string; created_at: number }>();
  return pickOpener(notes.results, closer, signedAt, rules.openerDays);
}

/** Pure part of openerOf, for tests: the first person to log real contact, if it isn't the closer and they're still in the window. */
export function pickOpener(notes: Array<{ author: string; created_at: number }>, closer: string, signedAt: number, days: number): string | null {
  const first = notes[0];
  if (!first || first.author.trim().toLowerCase() === closer.trim().toLowerCase()) return null;
  const last = notes.filter((n) => n.author === first.author).at(-1)!;
  return signedAt - last.created_at <= days * 86_400_000 ? first.author : null;
}
