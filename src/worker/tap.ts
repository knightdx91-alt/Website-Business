/**
 * Tap to Pay (Stripe Terminal) for in-person sign-ups, Oct 2026 (research/android-tap-to-pay-2026.md).
 *
 * The owner's Android app has a native Tap to Pay screen. The web app asks this module to start a payment for a signed
 * sign-up (`startTap`): a Stripe Customer and a `card_present` PaymentIntent with `setup_future_usage=off_session`, plus a
 * 10-minute single-use token the page hands to the native screen through an `intent://` link. The native screen uses the
 * token for `tapSession` (what to charge), `connectionToken` (Stripe's reader auth) and `completeTap` (after the tap). The
 * server never trusts the app's word: `completeTap` re-reads the PaymentIntent from Stripe, takes the `generated_card`
 * Stripe attached to the Customer and starts the plan subscription from it, anchored one period ahead with no proration,
 * so the period just paid by tap is not billed twice. The webhook (`payment_intent.succeeded`, metadata kind `signup_tap`)
 * and the daily cron (`reconcileTaps`) finish the same bookkeeping if the phone died between the tap and the call.
 */
import { tapToken, verifyTap } from "./auth.ts";
import { priceSignup, stripeForm, type Pick } from "./checkout.ts";
import { getLead, getSetting, getSettings, setSetting, updateLead, type AppSettings } from "./db.ts";
import { HttpError, newId, now, type Env } from "./env.ts";
import { notify } from "./notify.ts";
import type { Session } from "./auth.ts";

/** The Android app's package; the page opens `intent://tap…;package=<this>` so Chrome hands off to it. */
export const TAP_PACKAGE = "com.knightdx91.websitebusiness";
export const TAP_TOKEN_MINUTES = 10;
/** Settings key holding the Stripe Terminal Location id (tml_…). Kept apart from app_settings, which the app rewrites. */
const LOCATION_KEY = "terminal_location";
/** Stripe's smallest charge. */
const MIN_CENTS = 50;

interface StripeError {
  error?: { message?: string; code?: string; type?: string };
}

async function stripe<T>(env: Env, path: string, params: Record<string, unknown>, idempotencyKey?: string): Promise<T> {
  if (!env.STRIPE_SECRET_KEY) throw new HttpError(503, "Stripe isn't connected");
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "content-type": "application/x-www-form-urlencoded",
      ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}),
    },
    body: stripeForm(params),
  });
  const data = (await res.json()) as T & StripeError;
  if (!res.ok) throw new HttpError(502, `Stripe: ${data.error?.message ?? res.status}`);
  return data;
}

async function stripeGet<T>(env: Env, path: string, query: Record<string, unknown> = {}): Promise<T> {
  if (!env.STRIPE_SECRET_KEY) throw new HttpError(503, "Stripe isn't connected");
  const qs = stripeForm(query).toString();
  const res = await fetch(`https://api.stripe.com/v1/${path}${qs ? `?${qs}` : ""}`, { headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } });
  const data = (await res.json()) as T & StripeError;
  if (!res.ok) throw new HttpError(502, `Stripe: ${data.error?.message ?? res.status}`);
  return data;
}

export async function terminalLocation(env: Env): Promise<string | null> {
  return getSetting(env, LOCATION_KEY);
}

/** Whether a tap payment can be started right now, and if not, what's missing. */
export async function tapStatus(env: Env, s?: AppSettings): Promise<{ ready: boolean; why: string | null; locationId: string | null; address: string | null }> {
  const settings = s ?? (await getSettings(env));
  const locationId = await terminalLocation(env);
  const address = companyAddress(settings);
  if (!env.STRIPE_SECRET_KEY) return { ready: false, why: "Stripe isn't connected: add the STRIPE_SECRET_KEY secret to the Worker.", locationId, address };
  if (!locationId) return { ready: false, why: address ? "Tap “Set up Tap to Pay” once." : "Fill in the business street address below, save, then tap “Set up Tap to Pay”.", locationId, address };
  return { ready: true, why: null, locationId, address };
}

function companyAddress(s: AppSettings): string | null {
  if (!s.companyStreet || !s.companyCity || !s.companyZip) return null;
  return `${s.companyStreet}, ${s.companyCity}, ${s.companyState || "AL"} ${s.companyZip}`;
}

/**
 * One-time setup: a Stripe Terminal Location for the company (Tap to Pay readers attach to it at connection time). Needs
 * the business street address from Settings; a US address is required by Stripe. Running it again keeps the location.
 */
export async function setupTap(env: Env): Promise<{ locationId: string; address: string }> {
  const s = await getSettings(env);
  const address = companyAddress(s);
  if (!address) throw new HttpError(400, "Fill in the business street, city and ZIP in Settings first");
  const existing = await terminalLocation(env);
  if (existing) return { locationId: existing, address };
  const loc = await stripe<{ id: string }>(env, "terminal/locations", {
    display_name: `${s.companyName || "Website Business"} (in person)`,
    address: { line1: s.companyStreet, city: s.companyCity, state: s.companyState || "AL", postal_code: s.companyZip, country: "US" },
  });
  await setSetting(env, LOCATION_KEY, loc.id);
  return { locationId: loc.id, address };
}

interface TapSignupRow {
  id: string;
  lead_id: string;
  plan_json: string;
  signer_name: string;
  signer_email: string | null;
  paid: number;
  due_cents: number | null;
  extras_json: string | null;
  stripe_customer: string | null;
  stripe_subscription: string | null;
  stripe_payment_intent: string | null;
  tap_nonce: string | null;
  created_at: number;
}

interface PaymentIntentObj {
  id: string;
  status: string;
  amount: number;
  customer: string | null;
  client_secret?: string;
  metadata?: Record<string, string>;
  latest_charge?: {
    id: string;
    payment_method_details?: { card_present?: { generated_card?: string | null; brand?: string; last4?: string; wallet?: { type?: string } | null } };
  } | null;
}

async function signupRow(env: Env, signupId: string): Promise<TapSignupRow> {
  const row = await env.DB.prepare("SELECT id, lead_id, plan_json, signer_name, signer_email, paid, due_cents, extras_json, stripe_customer, stripe_subscription, stripe_payment_intent, tap_nonce, created_at FROM signups WHERE id = ?")
    .bind(signupId)
    .first<TapSignupRow>();
  if (!row) throw new HttpError(404, "No such sign-up");
  return row;
}

function nonce(): string {
  const b = crypto.getRandomValues(new Uint8Array(12));
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/** The intent:// link Chrome turns into "open the Tap to Pay screen of our app", with a Settings page as the fallback. */
export function tapIntentUrl(token: string, origin: string): string {
  const fallback = encodeURIComponent(`${origin}/#/settings`);
  return `intent://tap?t=${encodeURIComponent(token)}&o=${encodeURIComponent(origin)}#Intent;scheme=wbpay;package=${TAP_PACKAGE};S.browser_fallback_url=${fallback};end`;
}

/**
 * Starts (or resumes) an in-person payment for a signed sign-up: Customer + card_present PaymentIntent for what is due
 * today, and a short-lived token for the native screen. Resumes the same PaymentIntent while it is still open (a decline
 * or a cancelled tap must never authorize twice); a PaymentIntent that already succeeded is completed instead.
 */
export async function startTap(
  env: Env,
  o: { signupId: string; leadId: string; origin: string; session: Session },
): Promise<{ token: string; intentUrl: string; amountCents: number; business: string; alreadyPaid?: boolean }> {
  const status = await tapStatus(env);
  if (!status.ready) throw new HttpError(409, status.why ?? "Tap to Pay isn't set up");
  const row = await signupRow(env, o.signupId);
  if (row.lead_id !== o.leadId) throw new HttpError(404, "No such sign-up");
  const lead = await getLead(env, row.lead_id);
  if (!lead) throw new HttpError(404, "No such lead");
  const business = lead.name ?? "the client";
  const amountCents = row.due_cents ?? 0;
  if (row.paid) throw new HttpError(409, "This sign-up is already paid");
  if (amountCents < MIN_CENTS) throw new HttpError(409, "Nothing is due today on this sign-up");
  const plan = JSON.parse(row.plan_json) as { id?: string; name: string; billing?: string };

  let customer = row.stripe_customer;
  if (!customer) {
    const prev = await env.DB.prepare("SELECT stripe_customer FROM signups WHERE lead_id = ? AND stripe_customer IS NOT NULL ORDER BY created_at DESC LIMIT 1").bind(row.lead_id).first<{ stripe_customer: string }>();
    customer = prev?.stripe_customer ?? null;
  }
  if (!customer) {
    const c = await stripe<{ id: string }>(env, "customers", {
      name: business,
      ...(row.signer_email ? { email: row.signer_email } : {}),
      ...(lead.phone ? { phone: lead.phone } : {}),
      description: `${row.signer_name} · signed up in person`,
      metadata: { leadId: row.lead_id, signupId: row.id },
    }, `cus:${row.id}`);
    customer = c.id;
  }

  // Reuse an open PaymentIntent (same amount) rather than authorizing a second one.
  let pi: PaymentIntentObj | null = null;
  if (row.stripe_payment_intent) {
    try {
      const existing = await stripeGet<PaymentIntentObj>(env, `payment_intents/${row.stripe_payment_intent}`);
      if (existing.status === "succeeded") {
        await completeTap(env, { signupId: row.id, paymentIntentId: existing.id, actorName: o.session.name });
        return { token: "", intentUrl: "", amountCents, business, alreadyPaid: true };
      }
      if (["requires_payment_method", "requires_confirmation", "requires_action"].includes(existing.status) && existing.amount === amountCents) pi = existing;
      else if (existing.status !== "canceled" && existing.status !== "processing") await stripe(env, `payment_intents/${existing.id}/cancel`, {}).catch(() => undefined);
    } catch {
      pi = null;
    }
  }
  if (!pi) {
    pi = await stripe<PaymentIntentObj>(env, "payment_intents", {
      amount: amountCents,
      currency: "usd",
      customer,
      payment_method_types: ["card_present"],
      setup_future_usage: "off_session",
      capture_method: "automatic",
      ...(row.signer_email ? { receipt_email: row.signer_email } : {}),
      description: `${plan.name} website plan for ${business}: first payment, in person`,
      metadata: { kind: "signup_tap", signupId: row.id, leadId: row.lead_id },
    });
  }
  const n = nonce();
  await env.DB.prepare("UPDATE signups SET stripe_customer = ?, stripe_payment_intent = ?, tap_nonce = ? WHERE id = ?").bind(customer, pi.id, n, row.id).run();
  const token = await tapToken(env, row.id, n, TAP_TOKEN_MINUTES);
  return { token, intentUrl: tapIntentUrl(token, o.origin), amountCents, business };
}

/** Checks a native-screen token: signed, unexpired, and still the sign-up's current nonce (a new Start replaces it). */
export async function tapAuth(env: Env, authorization: string | null): Promise<TapSignupRow> {
  const bearer = /^Bearer\s+(.+)$/i.exec(authorization ?? "")?.[1]?.trim();
  if (!bearer) throw new HttpError(401, "Missing tap token");
  const t = await verifyTap(env, bearer);
  if (!t) throw new HttpError(401, "This payment link has expired. Start the payment again from the app.");
  const row = await signupRow(env, t.signupId);
  if (!row.tap_nonce || row.tap_nonce !== t.nonce) throw new HttpError(401, "This payment was restarted. Start it again from the app.");
  return row;
}

/** What the native screen needs: the PaymentIntent's client secret, the amount, names, and the Terminal location. */
export async function tapSession(env: Env, row: TapSignupRow): Promise<Record<string, unknown>> {
  const s = await getSettings(env);
  const lead = await getLead(env, row.lead_id);
  const locationId = await terminalLocation(env);
  if (!row.stripe_payment_intent || !locationId) throw new HttpError(409, "Start the payment again from the app");
  const pi = await stripeGet<PaymentIntentObj>(env, `payment_intents/${row.stripe_payment_intent}`);
  const plan = JSON.parse(row.plan_json) as { name: string; billingLabel?: string };
  const extras = row.extras_json ? (JSON.parse(row.extras_json) as { renews?: { amount: number; interval: "month" | "year" } | null }) : null;
  return {
    signupId: row.id,
    paymentIntentId: pi.id,
    clientSecret: pi.client_secret,
    status: pi.status,
    amountCents: pi.amount,
    business: lead?.name ?? "",
    signer: row.signer_name,
    plan: `${plan.name} plan${plan.billingLabel ? ` · ${plan.billingLabel}` : ""}`,
    renews: extras?.renews ? { amountCents: extras.renews.amount, interval: extras.renews.interval } : null,
    locationId,
    merchant: s.companyName || "Website Business",
    receiptEmail: row.signer_email,
    paid: !!row.paid,
  };
}

/** Stripe Terminal connection token for the reader SDK (never cached; the SDK asks whenever it needs one). */
export async function connectionToken(env: Env): Promise<{ secret: string }> {
  const t = await stripe<{ secret: string }>(env, "terminal/connection_tokens", {});
  return { secret: t.secret };
}

/** The same calendar day one period later, in UTC (Jan 31 → Feb 28/29), as Stripe's billing_cycle_anchor (seconds). */
export function nextPeriodStart(from: Date, interval: "month" | "year"): number {
  const d = new Date(from.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  if (interval === "year") d.setUTCFullYear(d.getUTCFullYear() + 1);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return Math.floor(d.getTime() / 1000);
}

function money(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;
}

function longDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/Chicago" });
}

export interface TapResult {
  ok: true;
  already?: boolean;
  amountCents: number;
  card: string | null;
  /** False when Stripe gave no reusable card (some wallets): the plan is paid for this period but renewals need a card. */
  cardSaved: boolean;
  subscription: string | null;
  renewsOn: string | null;
  message: string;
}

/**
 * After the tap: verifies the PaymentIntent with Stripe, starts the plan subscription from the saved card (anchored one
 * period ahead, no proration), marks the sign-up paid and tells the team. Safe to run twice (app, webhook, cron): the
 * subscription is created under an idempotency key and a paid sign-up with a subscription returns at once.
 */
export async function completeTap(env: Env, o: { signupId: string; paymentIntentId?: string | null; actorName: string }): Promise<TapResult> {
  const row = await signupRow(env, o.signupId);
  const lead = await getLead(env, row.lead_id);
  const business = lead?.name ?? "the client";
  if (row.paid && row.stripe_subscription) {
    return { ok: true, already: true, amountCents: row.due_cents ?? 0, card: null, cardSaved: true, subscription: row.stripe_subscription, renewsOn: null, message: `${business} is already marked paid.` };
  }
  const piId = o.paymentIntentId ?? row.stripe_payment_intent;
  if (!piId) throw new HttpError(409, "No payment was started for this sign-up");
  if (row.stripe_payment_intent && piId !== row.stripe_payment_intent) throw new HttpError(409, "That payment doesn't belong to this sign-up");
  const pi = await stripeGet<PaymentIntentObj>(env, `payment_intents/${piId}`, { "expand[]": "latest_charge" });
  if (pi.metadata?.signupId !== row.id) throw new HttpError(409, "That payment doesn't belong to this sign-up");
  if (pi.status !== "succeeded") throw new HttpError(409, pi.status === "requires_payment_method" ? "The card wasn't charged. Try the tap again." : `The payment isn't finished yet (${pi.status}).`);

  const details = pi.latest_charge?.payment_method_details?.card_present;
  const generated = details?.generated_card ?? null;
  const card = details?.brand ? `${details.brand.replace(/^\w/, (c) => c.toUpperCase())} ••${details.last4 ?? ""}` : null;
  const customer = pi.customer ?? row.stripe_customer;

  // What renews: the plan line and any monthly extras, priced the same way the sign-up page priced them.
  const settings = await getSettings(env);
  const plan = JSON.parse(row.plan_json) as { id?: string; name: string; billing?: string };
  const extras = row.extras_json ? (JSON.parse(row.extras_json) as { picks?: Pick[]; invoice?: boolean; renews?: { amount: number; interval: "month" | "year" } | null }) : null;
  let recurring: Array<{ name: string; amount: number; qty: number; interval: "month" | "year" }> = [];
  try {
    const priced = priceSignup(settings, plan.id ?? "plus", plan.billing ?? "standard", extras?.picks ?? [], { category: lead?.category, invoice: !!extras?.invoice });
    recurring = priced.lines.filter((l): l is typeof l & { interval: "month" | "year" } => !!l.interval).map((l) => ({ name: l.name, amount: l.amount, qty: l.qty, interval: l.interval }));
  } catch {
    if (extras?.renews) recurring = [{ name: `${plan.name} website plan`, amount: extras.renews.amount, qty: 1, interval: extras.renews.interval }];
  }

  let subscription: string | null = row.stripe_subscription;
  let renewsOn: string | null = null;
  if (generated && customer && recurring.length && !subscription) {
    const interval = recurring[0]!.interval;
    const anchor = nextPeriodStart(new Date(), interval);
    const sub = await stripe<{ id: string }>(env, "subscriptions", {
      customer,
      default_payment_method: generated,
      items: recurring.map((l) => ({ quantity: l.qty, price_data: { currency: "usd", unit_amount: l.amount, product_data: { name: l.name }, recurring: { interval: l.interval } } })),
      billing_cycle_anchor: anchor,
      proration_behavior: "none",
      off_session: true,
      collection_method: "charge_automatically",
      metadata: { kind: "signup", signupId: row.id, leadId: row.lead_id, paidInPerson: pi.id },
    }, `sub:${row.id}:${pi.id}`);
    subscription = sub.id;
    renewsOn = longDate(anchor);
    await stripe(env, `customers/${customer}`, { invoice_settings: { default_payment_method: generated } }).catch(() => undefined);
  }

  await env.DB.prepare("UPDATE signups SET paid = 1, stripe_customer = COALESCE(?, stripe_customer), stripe_subscription = COALESCE(?, stripe_subscription), paid_via = 'tap', tap_nonce = NULL WHERE id = ?")
    .bind(customer, subscription, row.id)
    .run();
  const renewText = subscription && recurring.length ? ` Renews ${recurring[0]!.interval === "year" ? "yearly" : "monthly"}${renewsOn ? ` from ${renewsOn}` : ""} on the same card.` : "";
  const cardText = generated ? "" : recurring.length ? " The card couldn't be saved for renewals (some phone wallets can't be): open their Stripe billing portal to add a card before the next payment." : "";
  const note = `Paid ${money(pi.amount)} in person by tap${card ? ` (${card})` : ""}.${renewText}${cardText}`;
  if (lead) {
    await updateLead(env, row.lead_id, { follow_up: null });
    await env.DB.prepare("INSERT INTO lead_notes (id, lead_id, author, outcome, body, created_at) VALUES (?, ?, ?, NULL, ?, ?)").bind(newId(), row.lead_id, o.actorName, note, now()).run();
  }
  await notify(env, { kind: "paid", actorName: o.actorName, leadId: lead ? row.lead_id : null, text: `💳 ${business} paid ${money(pi.amount)} by tap.${renewText}${generated ? "" : " ⚠️ Card not saved for renewals."}` });
  return { ok: true, amountCents: pi.amount, card, cardSaved: !!generated, subscription, renewsOn, message: note };
}

/**
 * Daily: finish tap payments the phone never reported (the PaymentIntent succeeded in Stripe but the sign-up is unpaid)
 * and cancel open ones older than a day so nothing stale can be confirmed later. Returns how many of each.
 */
export async function reconcileTaps(env: Env): Promise<{ completed: number; cancelled: number }> {
  if (!env.STRIPE_SECRET_KEY) return { completed: 0, cancelled: 0 };
  const rows = await env.DB.prepare("SELECT id, stripe_payment_intent, created_at FROM signups WHERE paid = 0 AND stripe_payment_intent IS NOT NULL AND created_at > ?")
    .bind(now() - 30 * 86_400_000)
    .all<{ id: string; stripe_payment_intent: string; created_at: number }>();
  let completed = 0;
  let cancelled = 0;
  for (const r of rows.results) {
    try {
      const pi = await stripeGet<PaymentIntentObj>(env, `payment_intents/${r.stripe_payment_intent}`);
      if (pi.status === "succeeded") {
        await completeTap(env, { signupId: r.id, paymentIntentId: pi.id, actorName: "Stripe" });
        completed++;
      } else if (pi.status !== "canceled" && pi.status !== "processing" && now() - r.created_at > 86_400_000) {
        await stripe(env, `payment_intents/${pi.id}/cancel`, {}).catch(() => undefined);
        await env.DB.prepare("UPDATE signups SET stripe_payment_intent = NULL, tap_nonce = NULL WHERE id = ?").bind(r.id).run();
        cancelled++;
      }
    } catch (err) {
      console.error("tap reconcile", r.id, err);
    }
  }
  return { completed, cancelled };
}
