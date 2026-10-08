import type { Env } from "./env.ts";
import { today } from "./env.ts";

export interface LeadRow {
  id: string;
  place_id: string;
  run_id: string | null;
  category: string;
  name: string | null;
  phone: string | null;
  address: string | null;
  rating: number | null;
  review_count: number | null;
  presence: string | null;
  reason: string | null;
  score: number;
  status: "queued" | "building" | "ready" | "failed" | "expired";
  sales_status: "new" | "shown" | "sold" | "live" | "not_interested";
  place_json: string | null;
  record_json: string | null;
  copy_json: string | null;
  look: string | null;
  lint_json: string | null;
  pitch_json: string | null;
  follow_up: string | null;
  last_contact: number | null;
  lat: number | null;
  lng: number | null;
  custom_domain: string | null;
  error: string | null;
  rewrite: number;
  pages_project: string | null;
  live_url: string | null;
  published_at: number | null;
  fetched_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface RunRow {
  id: string;
  created_at: number;
  categories: string;
  cap: number;
  queued: number;
  searches_total: number;
  searches_done: number;
  status: string;
  options_json: string | null;
}

export async function getSetting(env: Env, key: string): Promise<string | null> {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first<{ value: string }>();
  return row?.value ?? null;
}

export async function setSetting(env: Env, key: string, value: string): Promise<void> {
  await env.DB.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(key, value).run();
}

export interface Plan {
  id: "basic" | "plus" | "pro";
  name: string;
  setup: number;
  monthly: number;
  includes: string;
  /** Stripe or Square payment link (monthly subscription) the client is sent to after signing. */
  payLink?: string;
  /** Optional links for the other billing choices; without them the client is told we'll invoice. */
  payLinkFlex?: string;
  payLinkAnnual?: string;
}

export interface AddOn {
  name: string;
  price: number;
  unit: "month" | "each" | "one-time";
}

export const DEFAULT_ADDONS: AddOn[] = [
  { name: "Extra email inbox", price: 10, unit: "month" },
  { name: "Tap-to-review card (NFC)", price: 35, unit: "each" },
  { name: "Google Business Profile setup", price: 149, unit: "one-time" },
];

export type Billing = "standard" | "flex" | "annual";

export interface BillingOption {
  id: Billing;
  label: string;
  /** Plain description of what they pay and the term. */
  detail: string;
  /** For revenue totals. */
  monthlyEquivalent: number;
  payLink?: string;
}

function dollars(n: number): string {
  return `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
}

/** The ways a client can pay for a plan: standard (minimum term), month to month (setup fee), or yearly (months free). */
export function billingOptions(plan: Plan, s: Pick<AppSettings, "minMonths" | "flexSetup" | "annualMonthsFree">): BillingOption[] {
  const min = s.minMonths ?? 12;
  const setup = plan.setup ? `${dollars(plan.setup)} setup` : "no setup fee";
  const out: BillingOption[] = [
    {
      id: "standard",
      label: min ? `${min}-month plan` : "Monthly",
      detail: `${dollars(plan.monthly)}/month · ${setup} · ${min ? `${min}-month minimum, then cancel any time` : "cancel any time"}`,
      monthlyEquivalent: plan.monthly,
      payLink: plan.payLink,
    },
  ];
  if (min && s.flexSetup) {
    out.push({
      id: "flex",
      label: "Month to month",
      detail: `${dollars(plan.monthly)}/month · ${dollars(plan.setup + s.flexSetup)} setup · no minimum, cancel any time`,
      monthlyEquivalent: plan.monthly,
      payLink: plan.payLinkFlex,
    });
  }
  if (s.annualMonthsFree) {
    const yearly = plan.monthly * (12 - s.annualMonthsFree);
    out.push({
      id: "annual",
      label: `Pay yearly (${s.annualMonthsFree} months free)`,
      detail: `${dollars(yearly)}/year instead of ${dollars(plan.monthly * 12)} · ${setup} · renews yearly`,
      monthlyEquivalent: Math.round((yearly / 12) * 100) / 100,
      payLink: plan.payLinkAnnual,
    });
  }
  return out;
}

export interface AppSettings {
  defaultCap: number;
  copyModel: string;
  companyName?: string;
  /** The legal entity that signs client agreements, e.g. "Underground Associates LLC". */
  legalName?: string;
  companyPhone?: string;
  companyEmail?: string;
  callerName?: string;
  plans: Plan[];
  minMonths?: number;
  /** Extra setup fee to skip the minimum term (month to month). 0 turns the option off. */
  flexSetup?: number;
  /** Months free when paying a year up front. 0 turns the option off. */
  annualMonthsFree?: number;
  addons: AddOn[];
  terms?: string;
  commission?: number;
  /** Old single-price fields, read only to build a plan for settings saved before plans existed. */
  setupPrice?: number;
  monthlyPrice?: number;
  offerIncludes?: string;
}

/** Plain-language starting point for the client agreement. The owner edits it in Settings. */
export function defaultTerms(s: Pick<AppSettings, "companyName" | "legalName" | "minMonths">): string {
  const us = s.legalName || s.companyName || "We";
  const min = s.minMonths ?? 12;
  return [
    `1. What you get: ${us} builds your website, hosts it and keeps it running, plus everything listed in your plan.`,
    "2. Payment: Any setup fee is due when you sign up. Your plan is charged automatically each month (or each year on a yearly plan), starting today.",
    min > 0
      ? `3. Term: With the ${min}-month plan, the first ${min} months are a minimum, then you can cancel any time with 30 days' notice. With month to month, there's no minimum: cancel any time with 30 days' notice. Yearly plans are paid up front for 12 months and renew each year unless you cancel before the renewal date.`
      : "3. Term: Cancel any time with 30 days' notice. Yearly plans are paid up front for 12 months and renew each year unless you cancel before the renewal date.",
    "4. Your content stays yours: your business name, logo, photos and text belong to you. You confirm you have the right to use any photos or text you send us.",
    "5. Your domain: A domain you already own stays in your name. If we register one for you, we'll transfer it to you on request if you leave.",
    "6. If you cancel: the site comes down at the end of your last paid month. We'll send you a copy of the site's files on request.",
    "7. Changes: Updates listed in your plan are included. We'll quote anything bigger before doing it.",
    "8. No promises on rankings: the site is built to be found on Google, but no one can guarantee rankings, visitors or sales.",
  ].join("\n");
}

export const MODEL_PRICES: Record<string, { input: number; output: number; label: string }> = {
  "claude-opus-5-5": { input: 4, output: 20, label: "Claude Opus 5.5 (best writing)" },
  "claude-sonnet-5-5": { input: 2, output: 10, label: "Claude Sonnet 5.5 (about half the cost)" },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, label: "Claude Haiku 5.5 (cheapest)" },
};

export async function getSettings(env: Env): Promise<AppSettings> {
  const raw = await getSetting(env, "app_settings");
  const s = raw ? (JSON.parse(raw) as Partial<AppSettings>) : {};
  const plans = s.plans?.length
    ? s.plans
    : s.monthlyPrice
      ? [{ id: "basic" as const, name: "Website", setup: s.setupPrice ?? 0, monthly: s.monthlyPrice, includes: s.offerIncludes ?? "" }]
      : [];
  return {
    ...s,
    plans,
    addons: s.addons ?? DEFAULT_ADDONS,
    flexSetup: s.flexSetup ?? 299,
    annualMonthsFree: s.annualMonthsFree ?? 2,
    defaultCap: s.defaultCap ?? 50,
    copyModel: s.copyModel && MODEL_PRICES[s.copyModel] ? s.copyModel : "claude-opus-5-5",
  };
}

export async function getLead(env: Env, id: string): Promise<LeadRow | null> {
  return env.DB.prepare("SELECT * FROM leads WHERE id = ?").bind(id).first<LeadRow>();
}

export async function updateLead(env: Env, id: string, fields: Partial<LeadRow>): Promise<void> {
  const entries = Object.entries({ ...fields, updated_at: Date.now() });
  await env.DB.prepare(`UPDATE leads SET ${entries.map(([k]) => `${k} = ?`).join(", ")} WHERE id = ?`)
    .bind(...entries.map(([, v]) => (v === undefined ? null : v)), id)
    .run();
}

export async function addUsage(env: Env, u: { places?: number; photos?: number; aiIn?: number; aiOut?: number; costMicro?: number }): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO usage (day, places_requests, photo_requests, ai_input, ai_output, ai_cost_microdollars) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(day) DO UPDATE SET places_requests = places_requests + excluded.places_requests, photo_requests = photo_requests + excluded.photo_requests,
     ai_input = ai_input + excluded.ai_input, ai_output = ai_output + excluded.ai_output, ai_cost_microdollars = ai_cost_microdollars + excluded.ai_cost_microdollars`,
  )
    .bind(today(), u.places ?? 0, u.photos ?? 0, u.aiIn ?? 0, u.aiOut ?? 0, u.costMicro ?? 0)
    .run();
}
