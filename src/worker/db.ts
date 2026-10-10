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
  /** Who to ask for and when (review fixes, migration 0012). */
  contact: string | null;
  best_time: string | null;
  /** When the lead was marked Shown; the follow-up cadence counts days from here. */
  shown_at: number | null;
  lat: number | null;
  lng: number | null;
  custom_domain: string | null;
  gbp_json: string | null;
  preview_opens: number;
  preview_opened_at: number | null;
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
  /** Payment link for the shorter (6-month) commitment. */
  payLinkShort?: string;
}

export interface AddOn {
  name: string;
  price: number;
  unit: "month" | "each" | "one-time" | "quote";
  /** One customer-facing sentence on what they get. */
  about?: string;
  /** Contract terms for this extra; blank uses the standard terms in contract.ts. */
  terms?: string;
}

/** "$49 one-time", "$129/month", "$35 each", or "priced per job". */
export function addonPrice(a: Pick<AddOn, "price" | "unit">): string {
  if (a.unit === "quote") return "priced per job";
  const p = `$${Number.isInteger(a.price) ? a.price : a.price.toFixed(2)}`;
  return a.unit === "month" ? `${p}/month` : a.unit === "each" ? `${p} each` : `${p} one-time`;
}

export const DEFAULT_ADDONS: AddOn[] = [
  { name: "Online ordering or booking hookup", price: 99, unit: "one-time", about: "We connect your Square, Toast, DoorDash, Calendly or Booksy so customers can order or book right from your site." },
  { name: "Get listed everywhere", price: 99, unit: "one-time", about: "We set up or fix your listings on Apple Maps, Bing, Yelp, Facebook, Nextdoor and the BBB so your hours and number match everywhere." },
  { name: "Google Business Profile setup", price: 149, unit: "one-time", about: "We set up or tune up your Google listing: hours, photos, services and description, so more people find you on Google Maps." },
  { name: "Photo shoot", price: 199, unit: "one-time", about: "We come by and take 20 to 30 photos of your place, your work and your team for your website and Google profile." },
  { name: "Spanish version of your site", price: 99, unit: "one-time", about: "A Spanish page with your hours, services and how to reach you, linked from every page." },
  { name: "\"We're hiring\" section", price: 49, unit: "one-time", about: "Show the jobs you're filling and how to apply. We update it free whenever your openings change." },
  { name: "Same-day build", price: 49, unit: "one-time", about: "Live the same business day you approve it." },
  { name: "Social media posts", price: 129, unit: "month", about: "8 to 12 Facebook and Instagram posts a month written for your business. You approve them before they go up." },
  { name: "QR table tents & window sign", price: 49, unit: "each", about: "A printed set with QR codes for your website, menu and Google reviews, for your tables, counter or front window." },
  { name: "Business cards, yard signs & door hangers", price: 0, unit: "quote", about: "Printed pieces that match your website, from a local print shop." },
  { name: "Logo refresh", price: 179, unit: "one-time", about: "A clean, simple logo in your site's colors, ready for signs, shirts and cards." },
  { name: "Tap-to-review card (NFC)", price: 35, unit: "each", about: "Customers tap their phone on the card at your counter to leave a Google review." },
  { name: "Extra changes", price: 50, unit: "each", about: "Bigger jobs beyond your plan's included updates, like a new page or section. We always quote first." },
  { name: "Ad management", price: 149, unit: "month", about: "We run your Google or Facebook ads and report what they bring in. Ad spend is paid separately." },
];

export type Billing = "short" | "standard" | "flex" | "annual";

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

/**
 * The ways a client can pay for a plan: a 6-month or 12-month commitment (no setup fee), month to month
 * (the only one with a setup fee), or yearly up front (months free).
 */
export function billingOptions(plan: Plan, s: BillingSettings, opts: { category?: string } = {}): BillingOption[] {
  const min = s.minMonths ?? 12;
  const short = s.shortMonths ?? 6;
  const church = opts.category === "church";
  const free = annualMonthsFreeFor(s, opts.category);
  const setup = plan.setup ? `${dollars(plan.setup)} setup` : "no setup fee";
  const out: BillingOption[] = [];
  if (short && min && short < min) {
    out.push({
      id: "short",
      label: `${short}-month plan`,
      detail: `${dollars(plan.monthly)}/month · ${setup} · ${short}-month minimum, then cancel any time`,
      monthlyEquivalent: plan.monthly,
      // Same monthly price as the 12-month plan, so its link works too; the signed agreement sets the term.
      payLink: plan.payLinkShort || plan.payLink,
    });
  }
  out.push(
    {
      id: "standard",
      label: min ? `${min}-month plan` : "Monthly",
      detail: `${dollars(plan.monthly)}/month · ${setup} · ${min ? `${min}-month minimum, then cancel any time` : "cancel any time"}`,
      monthlyEquivalent: plan.monthly,
      payLink: plan.payLink,
    },
  );
  if (min && s.flexSetup) {
    out.push({
      id: "flex",
      label: "Month to month",
      detail: `${dollars(plan.monthly)}/month · ${dollars(plan.setup + s.flexSetup)} setup · no minimum, cancel any time`,
      monthlyEquivalent: plan.monthly,
      payLink: plan.payLinkFlex,
    });
  }
  if (free) {
    const yearly = plan.monthly * (12 - free);
    out.push({
      id: "annual",
      label: church ? "Pay yearly (ministry rate)" : `Pay yearly (${free} months free)`,
      detail: church
        ? `Ministry rate: 12 months for the price of ${12 - free} — ${dollars(yearly)}/year · ${setup} · renews yearly`
        : `${dollars(yearly)} for 12 months (you pay for ${12 - free}, ${free} are free) instead of ${dollars(plan.monthly * 12)} · ${setup} · renews yearly`,
      monthlyEquivalent: Math.round((yearly / 12) * 100) / 100,
      payLink: plan.payLinkAnnual,
    });
  }
  return out;
}

/** The settings billingOptions reads. churchAnnualMonthsFree is optional here so older callers and tests still type-check. */
export type BillingSettings = Pick<AppSettings, "minMonths" | "shortMonths" | "flexSetup" | "annualMonthsFree"> & { churchAnnualMonthsFree?: number };

/** Months free on the yearly option: the ministry rate for churches and nonprofits, the standard rate for everyone else. */
export function annualMonthsFreeFor(s: BillingSettings, category?: string): number {
  return category === "church" ? (s.churchAnnualMonthsFree ?? 4) : (s.annualMonthsFree ?? 0);
}

/** Shown wherever someone is about to buy, and in the agreement's TIMING section. */
export const GO_LIVE_TEXT = "Your site goes live within 3 business days of your OK on the details.";

/**
 * Plain-language lines every agreement carries. They're woven into defaultTerms; when the owner has written their own
 * service agreement in Settings, contract.ts adds the ones that text doesn't already cover.
 */
export const CORE_TERMS: Array<{ key: RegExp; text: string }> = [
  { key: /remaining months of the minimum/i, text: "If you cancel before the end of your plan's minimum term, the remaining months of the minimum are due." },
  { key: /isn't fixed within 30 days|not fixed within 30 days/i, text: "If a payment fails and isn't fixed within 30 days, we may take the site offline until it's caught up." },
  { key: /total liability/i, text: "Our total liability to you is limited to what you paid us in the 3 months before the problem. Alabama law applies." },
  { key: /undergroundassociates\.com\/terms/i, text: "Our cancellation and refund policy at undergroundassociates.com/terms is part of this agreement as of the day you sign." },
  { key: /30 days before a yearly renewal/i, text: "Yearly plans renew each year. We'll email you at least 30 days before a yearly renewal, and you can cancel before it renews." },
];

/** The core lines a (custom) service agreement doesn't already say. */
export function missingCoreTerms(text: string): string[] {
  return CORE_TERMS.filter((c) => !c.key.test(text)).map((c) => c.text);
}

export interface AppSettings {
  defaultCap: number;
  copyModel: string;
  companyName?: string;
  /** The legal entity that signs client agreements, e.g. "Underground Associates LLC". */
  legalName?: string;
  companyPhone?: string;
  companyEmail?: string;
  /** The owner's own address, shown next to the business email for people who want them directly. */
  directEmail?: string;
  /** Our own Google "write a review" link, texted to happy clients. */
  companyReviewUrl?: string;
  /** Our Facebook page, linked from the company website. */
  companyFacebookUrl?: string;
  /** The Google account clients add as a Manager on their Business Profile. */
  gbpEmail?: string;
  callerName?: string;
  plans: Plan[];
  minMonths?: number;
  /** Shorter commitment offered next to the standard one (6 months). 0 turns it off. */
  shortMonths?: number;
  /** Extra setup fee to skip the minimum term (month to month). 0 turns the option off. */
  flexSetup?: number;
  /** Months free when paying a year up front. 0 turns the option off. */
  annualMonthsFree?: number;
  /** Months free on the yearly option for churches and nonprofits (12 months for the price of 8 by default). */
  churchAnnualMonthsFree: number;
  /** Daily call goal per person, shown in the app only. 0 = no goal. */
  dailyCalls?: number;
  addons: AddOn[];
  terms?: string;
  commission?: number;
  /** Old single-price fields, read only to build a plan for settings saved before plans existed. */
  setupPrice?: number;
  monthlyPrice?: number;
  offerIncludes?: string;
}

/** Plain-language starting point for the client agreement. The owner edits it in Settings. */
export function defaultTerms(s: Pick<AppSettings, "companyName" | "legalName" | "minMonths" | "shortMonths">): string {
  const us = s.legalName || s.companyName || "We";
  const min = s.minMonths ?? 12;
  const short = s.shortMonths ?? 6;
  const terms = short && short < min ? `${short}-month or ${min}-month plan` : `${min}-month plan`;
  return [
    `1. What you get: ${us} builds your website, hosts it and keeps it running, plus everything listed in your plan.`,
    "2. Payment: Your plan is charged automatically each month (or each year on a yearly plan), starting today. Month to month has a one-time setup fee, due when you sign up; the other plans have none unless your plan says otherwise.",
    min > 0
      ? `3. Term: With the ${terms}, those first months are a minimum, then you can cancel any time with 30 days' notice. If you cancel before the end of your plan's minimum term, the remaining months of the minimum are due. With month to month, there's no minimum: cancel any time with 30 days' notice. Yearly plans are paid up front for 12 months. Yearly plans renew each year. We'll email you at least 30 days before a yearly renewal, and you can cancel before it renews.`
      : "3. Term: Cancel any time with 30 days' notice. Yearly plans are paid up front for 12 months. Yearly plans renew each year. We'll email you at least 30 days before a yearly renewal, and you can cancel before it renews.",
    "4. Your content stays yours: your business name, logo, photos and text belong to you. You confirm you have the right to use any photos or text you send us.",
    "5. Your domain and email: A domain you already own stays in your name. If we register one for you, we'll transfer it to you on request if you leave. Email forwarding to your own inbox is free with plans that include it. If you choose a Google mailbox instead, Google bills you directly under Google's terms; we set it up but don't charge for it or control Google's prices or service.",
    "6. If you cancel: the site comes down at the end of your last paid month. We'll send you a copy of the site's files on request. Our cancellation and refund policy at undergroundassociates.com/terms is part of this agreement as of the day you sign.",
    "7. Late payments: If a payment fails and isn't fixed within 30 days, we may take the site offline until it's caught up.",
    "8. Changes: Updates listed in your plan are included. We'll quote anything bigger before doing it.",
    "9. No promises on rankings: the site is built to be found on Google, but no one can guarantee rankings, visitors or sales.",
    "10. Limits: Our total liability to you is limited to what you paid us in the 3 months before the problem. Alabama law applies.",
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
    shortMonths: s.shortMonths ?? 6,
    flexSetup: s.flexSetup ?? 299,
    annualMonthsFree: s.annualMonthsFree ?? 2,
    churchAnnualMonthsFree: s.churchAnnualMonthsFree ?? 4,
    dailyCalls: s.dailyCalls ?? 0,
    companyFacebookUrl: s.companyFacebookUrl ?? "https://www.facebook.com/undergroundassociates",
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
