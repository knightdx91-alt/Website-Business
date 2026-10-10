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
export const GO_LIVE_TEXT = "Your site goes live within 3 business days of your OK on the details (same day only with the paid Same-day build extra).";

/**
 * Plain-language lines every agreement carries. They're woven into defaultTerms; when the owner has written their own
 * service agreement in Settings, contract.ts adds the ones that text doesn't already cover.
 */
/** The late fee and early-payoff discount as the agreement states them. */
export type PenaltySettings = Pick<AppSettings, "lateFee" | "payoffDiscount" | "interestRate" | "reinstatementFee" | "returnedPaymentFee">;
export const lateFeeOf = (s: PenaltySettings) => Math.max(0, Math.round((s.lateFee ?? 15) * 100) / 100);
export const payoffDiscountOf = (s: PenaltySettings) => Math.max(0, Math.min(100, Math.round(s.payoffDiscount ?? 15)));
/** Capped at 8: Alabama's legal maximum for a rate written into a contract (Ala. Code § 8-8-1). */
export const interestRateOf = (s: PenaltySettings) => Math.max(0, Math.min(8, Math.round((s.interestRate ?? 8) * 100) / 100));
export const reinstatementFeeOf = (s: PenaltySettings) => Math.max(0, Math.round((s.reinstatementFee ?? 49) * 100) / 100);
export const returnedFeeOf = (s: PenaltySettings) => Math.max(0, Math.round((s.returnedPaymentFee ?? 15) * 100) / 100);
export const money2 = (n: number) => `$${n % 1 ? n.toFixed(2) : n}`;
const fee = (s: PenaltySettings) => money2(lateFeeOf(s));
/** "pay it now less 15%" or, with no discount, "pay it now". */
const payoffWords = (s: PenaltySettings) => (payoffDiscountOf(s) ? `pay it now, less ${payoffDiscountOf(s)}%,` : "pay it now,");

export function coreTerms(s: PenaltySettings = {}): Array<{ key: RegExp; text: string }> {
  return [
    { key: /early cancellation fee|remaining months of the minimum/i, text: `If you cancel before the end of your plan's minimum term, you owe an early cancellation fee equal to your monthly price times the remaining months of the minimum term: keep paying monthly until the term ends, or ${payoffWords(s)} and we close your account. We may charge the card on file for it.` },
    { key: /isn't fixed within 30 days|not fixed within 30 days/i, text: "If a payment fails and isn't fixed within 30 days, we may take the site offline until it's caught up; after 60 days we may end the agreement and the whole balance is due." },
    ...(lateFeeOf(s) ? [{ key: /late fee/i, text: `A payment still unpaid 10 days after it fails carries a ${fee(s)} late fee, once per missed payment.` }] : []),
    { key: /dispute/i, text: "Disputing a charge with your bank that was due under this agreement counts as a missed payment." },
    { key: /total liability/i, text: "Our total liability to you is limited to what you paid us in the 12 months before the problem, and we aren't liable for indirect losses such as lost profits. Alabama law applies." },
    { key: /undergroundassociates\.com\/terms/i, text: "Our cancellation and refund policy at undergroundassociates.com/terms is part of this agreement as of the day you sign." },
    { key: /30 days before a yearly renewal/i, text: "Yearly plans renew each year. We'll text and email you at least 30 days before a yearly renewal, and you can cancel before it renews." },
    { key: /templates, designs and code/i, text: "Your name, logo, photos, text and domain are yours; the templates, designs and code we build with are ours. If you leave, you may ask for a copy of your site's pages within 30 days." },
    { key: /right to use any photos/i, text: "You confirm you have the right to use any photos, logo or text you send us and that what you tell us about your business is true; claims arising from them are yours to cover." },
    { key: /guarantee search rankings/i, text: "No one can guarantee search rankings, visitors, calls or sales, or that a site is never down." },
    { key: /Cullman County/i, text: "Alabama law applies and any case is filed in the state courts in Cullman County, Alabama, after we've first tried for 30 days to work it out." },
  ];
}
/** Kept for callers that only need the default numbers. */
export const CORE_TERMS = coreTerms();

/** The core lines a (custom) service agreement doesn't already say. */
export function missingCoreTerms(text: string, s: PenaltySettings = {}): string[] {
  return coreTerms(s).filter((c) => !c.key.test(text)).map((c) => c.text);
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
  /** Where task invites go (the owner's Google Calendar address); falls back to directEmail. */
  calendarEmail?: string;
  /** Google tag (Analytics) measurement ID, e.g. G-XXXXXXXXXX; put on every company website page when set. */
  gaMeasurementId?: string;
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
  /** Late fee in dollars, added once per missed payment 10 days after it fails (0 = no late fee). */
  lateFee?: number;
  /** Percent off when a client pays the rest of their minimum term up front instead of month by month (0 = no discount). */
  payoffDiscount?: number;
  /** Yearly interest on balances more than 30 days overdue, percent (Alabama caps written contracts at 8; 0 = none). */
  interestRate?: number;
  /** Fee to put a site back online after it was taken down for non-payment (0 = none). */
  reinstatementFee?: number;
  /** Fee for a bank debit that comes back unpaid or a card charge the bank disputes (0 = none). */
  returnedPaymentFee?: number;
  /** Offer "Pay by check or bank transfer (we'll send an invoice)" on every sign-up page, not only churches. */
  invoiceForAll?: boolean;
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
/**
 * The standard client agreement (Oct 2026 rewrite after research/contract-review-2026.md). Plain English, numbered,
 * phone-readable. The bracket-free defaults are business decisions: $15 late fee after 10 days, 8%/yr after 30 days
 * overdue, offline at 30 days, agreement may end at 60, $49 to reinstate, 15% off an early payoff, 12-month liability
 * cap, a free month for >24 h of our-fault downtime, 3-business-day updates, 7-day deemed approval. Not legal advice.
 */

/**
 * The standard client agreement (Oct 2026 rewrite after research/contract-review-2026.md). Plain English, numbered,
 * phone-readable. The bracket-free defaults are business decisions: $15 late fee after 10 days, 8%/yr after 30 days
 * overdue, offline at 30 days, agreement may end at 60, $49 to reinstate, 15% off an early payoff, 12-month liability
 * cap, a free month for >24 h of our-fault downtime, 3-business-day updates, 7-day deemed approval. Not legal advice.
 */
export function defaultTerms(s: Pick<AppSettings, "companyName" | "legalName" | "minMonths" | "shortMonths"> & PenaltySettings): string {
  const us = s.legalName || s.companyName || "We";
  const late = lateFeeOf(s);
  const min = s.minMonths ?? 12;
  const short = s.shortMonths ?? 6;
  const terms = short && short < min ? `${short}-month or ${min}-month plan` : `${min}-month plan`;
  return [
    `1. What you get. ${us} builds your website, hosts it and keeps it running, and does the updates listed in your plan: changes to your text, hours, prices, services, menu and photos. New pages, new features and design changes beyond your plan are quoted before we start.`,
    "2. Approving your site. You saw a preview before signing. We make the changes you ask for, you give us a yes, and the site goes live within 3 business days of that yes; same-day timing is only with the paid Same-day build extra (see Timing). If we don't hear from you within 7 days of sending you a change, we treat it as approved so your site isn't held up.",
    "3. Payment. Your plan is charged automatically each month (or each year on a yearly plan), starting today. Month to month has a one-time setup fee due today; the other plans have none unless your plan says otherwise. You authorize us to charge the card or bank account on file for your plan, extras you approve and other amounts you owe under this agreement. Prices don't include sales or use tax; if one applies, we add it. Your price is fixed for your minimum or prepaid term; after that we give 30 days' notice of any change and you may cancel instead. Extras are described in the section for each extra: one-time extras are billed when you sign up for them and aren't refundable once delivered unless we made the mistake; monthly extras can be canceled with 30 days' notice; quoted work starts after you approve the quote.",
    min > 0
      ? `4. Your term and early cancellation fee. With the ${terms}, those first months are a minimum. You get them with no setup fee because you're committing to them, and we build your site up front in return. After the minimum, cancel any time with 30 days' notice. If you cancel before the minimum term ends, you owe an early cancellation fee equal to your monthly price times the remaining months of the minimum term. You agree that's a fair estimate of our loss, not a penalty, since we built your site at no charge in return for the term. You can pay it two ways: keep paying monthly until the term ends (your site stays live unless you ask us to take it down), or ${payoffWords(s)} and we close your account at once. If you stop paying instead, the whole fee is due at once; we may charge the card or bank account on file for it, and the late-payment section applies, including collection costs. Month to month has no minimum: cancel any time with 30 days' notice; the setup fee isn't refundable once your site is live. Yearly plans are paid up front for 12 months and aren't refunded after the first 30 days.`
      : "4. Your term. Cancel any time with 30 days' notice. Yearly plans are paid up front for 12 months.",
    "5. Renewal and how to cancel. Monthly plans continue after any minimum term until you cancel. Yearly plans renew each year. We'll text and email you at least 30 days before a yearly renewal, and you can cancel before it renews. To cancel, text or email us or use your billing link; it takes effect at the end of your paid period. Our cancellation and refund policy at undergroundassociates.com/terms is part of this agreement as of the day you sign.",
    `6. Late payments. If a payment fails we'll tell you and retry the card.${late ? ` If it's still unpaid after 10 days, we add a ${fee(s)} late fee, once per missed payment.` : ""}${interestRateOf(s) ? ` Balances more than 30 days overdue earn interest at ${interestRateOf(s)}% a year.` : ""} Your plan keeps billing while a payment is late. If a payment fails and isn't fixed within 30 days, we may take the site offline until it's caught up. 60 days after a missed payment we may end this agreement, and the whole balance, including the rest of any minimum term, is due.${reinstatementFeeOf(s) ? ` Putting a site back online costs ${money2(reinstatementFeeOf(s))}.` : ""} If we send a balance to collections or court, you also owe our reasonable collection costs and attorney's fees as far as Alabama law allows.`,
    `7. Payment disputes. Contact us before disputing a charge with your bank; we refund billing mistakes in full. A dispute of a charge that was due under this agreement counts as a missed payment: we may take the site offline right away, and you owe the amount${returnedFeeOf(s) ? `, a ${money2(returnedFeeOf(s))} dispute fee` : ""}${reinstatementFeeOf(s) ? " and the reinstatement fee" : ""} once it's resolved.`,
    "8. Your content stays yours. Your business name, logo, photos, the text about your business and your domain belong to you. You confirm you have the right to use any photos, logo or text you send us, and that what you tell us about your business, prices and licenses is true. The templates, designs and code we build with are ours, and we use them for other businesses too. While your plan is active you may use the site as we host it. We may show your site in our portfolio and keep a small \"Website by\" line in the footer unless you ask us not to.",
    "9. Website text. We draft your site's text with software from your public listing and what you tell us, then you review it. Check prices, hours, licenses and promises before you approve; once approved, the text is yours and you're responsible for it.",
    "10. Your domain and email. If you already own your domain it stays yours; we only need DNS changes. If we register one for you, we put it in your name where the registrar allows, pay renewals while your plan is active, and transfer it to you within 10 business days after your final balance is paid (registrars lock a domain against moving for 60 days after an ownership change). Email forwarding to your own inbox is free with plans that include it. A Google mailbox is billed to you by Google under Google's terms; we set it up but don't control Google's prices or service.",
    "11. If you leave. The site comes down at the end of your last paid period. Ask within 30 days and we'll send you a copy of your site's pages and images to use anywhere for your business (not our build tools or licensed fonts). Any messages sent through your site's forms are yours and are delivered to you as they arrive.",
    "12. What we need from you. Accurate business details; a yes or no on changes within 7 days; valid licenses for anything you ask us to say you're licensed for; and keeping your own accounts (Google, Facebook, booking or ordering services, your domain) in good standing. Tell us when your hours, prices or services change.",
    "13. Other companies' services. Your site runs on Cloudflare, payments go through Stripe, and features like ordering, booking, maps, reviews and email use Google, Square, Toast, Calendly, Booksy or others you choose. Their outages, prices, verification steps and rules are theirs, not ours. If one of them changes in a way that breaks a feature, we'll tell you and quote any work to fix it.",
    "14. If we let you down. We aim to keep your site up around the clock, answer within one business day, and make included updates within 3 business days of having what we need. If your site is down more than 24 hours in a month because of something within our control, tell us and that month's plan fee is free. If that happens three times in a year, or we don't fix a problem within 14 days of your written notice, you may cancel without owing the rest of your term and we refund any prepaid months you haven't used. These are the remedies for downtime and delays.",
    "15. No promises on results. Your site is built to be found on Google and to current accessibility good practice (WCAG 2.1 AA for the pages we make), and we fix accessibility problems found in our work. No one can guarantee search rankings, visitors, calls or sales, full legal compliance of content and tools you add, or that a site is never down or error-free. We make no other warranties, express or implied.",
    "16. Limits. Our total liability to you is limited to what you paid us in the 12 months before the problem. We aren't liable for lost profits, lost sales or other indirect losses. These limits don't apply where the law won't allow them. If someone makes a claim against us because of content, claims or licenses you gave us or approved, or because of your products or services, you'll cover our costs, including reasonable attorney's fees.",
    "17. Things beyond our control. Neither of us is in breach for delays caused by events outside our reasonable control, such as storms, power or internet failures, outages at Cloudflare or Google, or government orders. Payment for service already provided is still due.",
    "18. If a business changes hands. If you sell your business, the new owner can take over this agreement with our OK, which we won't withhold without a good reason; otherwise the agreement ends and the rest of any term is due. We may transfer this agreement to a company that buys ours; your price and terms stay the same.",
    "19. Texts, emails and notices. You agree we may text and email the number and address you gave us about your account, your site and payments; reply STOP to stop texts. Notices between us go to those contacts and to ours on this agreement; a text or email counts as written notice. Keep your contact details current. Our privacy policy at undergroundassociates.com/privacy applies and is part of this agreement.",
    "20. Confidential information. We keep what you tell us about your business private, and you keep our pricing offers and unreleased work private, except what's public or must be disclosed by law.",
    "21. If we disagree. We'll talk first: either of us can ask for a call or meeting, and we'll both try for 30 days to sort it out. After that either of us may go to court. Alabama law applies, and any case is filed in the state courts in Cullman County, Alabama, including small claims court.",
    "22. The whole deal. This agreement, your plan, our refund and privacy policies and any extras you sign for are the whole agreement; anything said in conversation isn't part of it. Changes must be in writing (a text or email from us that you accept counts). If a court strikes one part, the rest stands. Payment, ownership, limits and the sections about leaving survive after this agreement ends.",
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
    lateFee: s.lateFee ?? 15,
    payoffDiscount: s.payoffDiscount ?? 15,
    interestRate: s.interestRate ?? 8,
    reinstatementFee: s.reinstatementFee ?? 49,
    returnedPaymentFee: s.returnedPaymentFee ?? 15,
    invoiceForAll: s.invoiceForAll ?? true,
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
