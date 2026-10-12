/**
 * The two discount programs (owner's rules, Oct 2026).
 *
 * Referrals: a client who sends us a business gets `referralMonths` (2) months of their own plan free once the referred
 * business's first payment goes through on a plan of at least `referralMinMonths` (6) months: the 6- or 12-month plan or
 * the yearly plan, not month to month and not the Price list plan. At most `referralMaxPerYear` (2) credits count per
 * referral year (365-day windows from the referrer's own first payment); the rest bank and are applied in later years by
 * the daily cron. A credit is a Stripe customer-balance credit (months × the referrer's monthly price) that Stripe takes
 * off their next invoices; a referrer without a Stripe customer (invoice client, marked paid by hand) gets a `by_hand`
 * credit the owner applies on the next invoice and marks applied.
 *
 * Founding customers: the first `founderSlots` (5) paying clients pick one free extra from the ones ticked "founder pick"
 * in Settings → Extras. The pick is stored on the sign-up (`extras_json.founder`) and priced at $0 by priceSignup.
 */
import {
  addonPrice,
  founderChoices,
  getLead,
  getSettings,
  isPayTest,
  promoRules,
  updateLead,
  type AppSettings,
  type LeadRow,
} from "./db.ts";
import { HttpError, newId, now, type Env } from "./env.ts";
import { notify } from "./notify.ts";
import { stripePost } from "./tap.ts";

export const YEAR_MS = 365 * 86_400_000;

export interface FounderOffer {
  slotsLeft: number;
  total: number;
  choices: Array<{ index: number; name: string; price: string; about: string }>;
}

/** How many founding-customer spots are left and what they can pick. Paying clients use a spot whether or not they picked. */
export async function founderOffer(
  env: Env,
  s: AppSettings,
): Promise<FounderOffer> {
  const total = promoRules(s).founderSlots;
  const choices = founderChoices(s).map(({ index, addon }) => ({
    index,
    name: addon.name,
    price: addonPrice(addon),
    about: addon.about ?? "",
  }));
  if (!choices.length || total <= 0) return { slotsLeft: 0, total, choices: [] };
  const used = await env.DB.prepare(
    `SELECT COUNT(DISTINCT s.lead_id) AS n FROM signups s JOIN leads l ON l.id = s.lead_id
     WHERE l.place_id != 'paytest' AND (s.paid = 1 OR (s.created_at > ? AND s.extras_json LIKE '%"founder":%'))`,
  )
    .bind(now() - 7 * 86_400_000)
    .first<{ n: number }>();
  return { slotsLeft: Math.max(0, total - (used?.n ?? 0)), total, choices };
}

/** The founder index from a form or the app, kept only while a spot is open and it is one of the choices. */
export function allowedFounderPick(
  offer: FounderOffer,
  picked: number | null | undefined,
): number | null {
  if (picked == null || offer.slotsLeft <= 0) return null;
  return offer.choices.some((c) => c.index === picked) ? picked : null;
}

/** A plan snapshot (signups.plan_json) qualifies when its term is at least the program's minimum months. */
export function referralQualifies(
  plan: { id?: string; billing?: string },
  s: Partial<AppSettings>,
): boolean {
  if (plan.id === "list") return false;
  const rules = promoRules(s);
  const months =
    plan.billing === "short"
      ? (s.shortMonths ?? 6)
      : plan.billing === "flex"
        ? 1
        : plan.billing === "annual"
          ? 12
          : (s.minMonths ?? 12);
  return months >= rules.referralMinMonths;
}

/** Which referral year a moment falls in, counted from the referrer's first payment (0 = the first year). */
export function creditYear(startMs: number, atMs: number): number {
  return Math.max(0, Math.floor((atMs - startMs) / YEAR_MS));
}

interface CreditRow {
  id: string;
  referrer_lead_id: string;
  referred_lead_id: string;
  signup_id: string | null;
  months: number;
  status: "banked" | "applied" | "by_hand";
  applied_year: number | null;
  applied_at: number | null;
  stripe_ref: string | null;
  note: string | null;
  created_at: number;
}

interface PaidSignup {
  id: string;
  created_at: number;
  stripe_customer: string | null;
  plan_json: string;
}

async function paidSignups(env: Env, leadId: string): Promise<PaidSignup[]> {
  const rows = await env.DB.prepare(
    "SELECT id, created_at, stripe_customer, plan_json FROM signups WHERE lead_id = ? AND paid = 1 ORDER BY created_at ASC",
  )
    .bind(leadId)
    .all<PaidSignup>();
  return rows.results;
}

/**
 * Called whenever a sign-up is confirmed paid (tap, card sheet, Stripe Checkout, the "Payment is set up" tick). Records
 * the referrer's credit once per referred business, then tries to apply it.
 */
export async function onPlanPaid(
  env: Env,
  leadId: string,
  signupId?: string,
): Promise<void> {
  const lead = await getLead(env, leadId);
  if (!lead?.referred_by || isPayTest(lead)) return;
  const s = await getSettings(env);
  const rules = promoRules(s);
  if (rules.referralMonths <= 0) return;
  const existing = await env.DB.prepare(
    "SELECT id FROM referral_credits WHERE referred_lead_id = ?",
  )
    .bind(leadId)
    .first<{ id: string }>();
  if (existing) return;
  const row = signupId
    ? await env.DB.prepare(
        "SELECT id, created_at, stripe_customer, plan_json FROM signups WHERE id = ? AND lead_id = ?",
      )
        .bind(signupId, leadId)
        .first<PaidSignup>()
    : (await paidSignups(env, leadId)).at(-1);
  if (!row) return;
  const plan = JSON.parse(row.plan_json) as { id?: string; billing?: string; billingLabel?: string };
  const referrer = await getLead(env, lead.referred_by);
  if (!referrer) return;
  if (!referralQualifies(plan, s)) {
    await env.DB.prepare(
      "INSERT INTO lead_notes (id, lead_id, author, outcome, body, created_at) VALUES (?, ?, 'App', NULL, ?, ?)",
    )
      .bind(
        newId(),
        referrer.id,
        `No referral credit for ${lead.name}: their ${plan.billingLabel ?? "plan"} is under the ${rules.referralMinMonths}-month minimum.`,
        now(),
      )
      .run();
    return;
  }
  await env.DB.prepare(
    "INSERT INTO referral_credits (id, referrer_lead_id, referred_lead_id, signup_id, months, status, created_at) VALUES (?, ?, ?, ?, ?, 'banked', ?)",
  )
    .bind(newId(), referrer.id, leadId, row.id, rules.referralMonths, now())
    .run();
  await notify(env, {
    kind: "paid",
    actorName: "App",
    leadId: referrer.id,
    text: `🎁 ${referrer.name} earned a referral credit: ${lead.name} signed up (${rules.referralMonths} months free)`,
  });
  await applyReferralCredits(env, referrer.id, s);
}

/**
 * Applies the referrer's banked credits that fit in the current referral year: a Stripe customer-balance credit when they
 * have a Stripe customer, else a `by_hand` credit for the owner. Returns how many were applied or handed over.
 */
export async function applyReferralCredits(
  env: Env,
  referrerId: string,
  settings?: AppSettings,
): Promise<number> {
  const s = settings ?? (await getSettings(env));
  const rules = promoRules(s);
  const referrer = await getLead(env, referrerId);
  if (!referrer) return 0;
  const paid = await paidSignups(env, referrerId);
  const first = paid[0];
  const latest = paid.at(-1);
  if (!first || !latest) return 0; // not a paying client yet: the credit waits
  const year = creditYear(first.created_at, now());
  const used = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM referral_credits WHERE referrer_lead_id = ? AND status != 'banked' AND applied_year = ?",
  )
    .bind(referrerId, year)
    .first<{ n: number }>();
  let room = rules.referralMaxPerYear - (used?.n ?? 0);
  if (room <= 0) return 0;
  const banked = await env.DB.prepare(
    "SELECT c.*, l.name AS referred_name FROM referral_credits c LEFT JOIN leads l ON l.id = c.referred_lead_id WHERE c.referrer_lead_id = ? AND c.status = 'banked' ORDER BY c.created_at ASC",
  )
    .bind(referrerId)
    .all<CreditRow & { referred_name: string | null }>();
  const plan = JSON.parse(latest.plan_json) as { monthly?: number; name?: string };
  const monthly = Number(plan.monthly ?? 0);
  let n = 0;
  for (const c of banked.results) {
    if (room <= 0) break;
    const cents = Math.round(monthly * 100 * c.months);
    const who = c.referred_name ?? "a referral";
    let status: CreditRow["status"] = "by_hand";
    let ref: string | null = null;
    let note = `Apply by hand: take ${c.months} months (${money(cents)}) off their next invoice.`;
    if (latest.stripe_customer && env.STRIPE_SECRET_KEY && cents > 0) {
      try {
        const bt = await stripePost<{ id: string }>(
          env,
          `customers/${latest.stripe_customer}/balance_transactions`,
          {
            amount: -cents,
            currency: "usd",
            description: `Referral credit: ${c.months} months free for referring ${who}`,
          },
          `refcredit:${c.id}`,
        );
        status = "applied";
        ref = bt.id;
        note = `${money(cents)} credited to their Stripe account; it comes off the next ${plan.name ?? ""} invoices.`;
      } catch (err) {
        note = `Stripe credit failed (${err instanceof Error ? err.message : String(err)}); apply ${money(cents)} by hand.`;
      }
    }
    await env.DB.prepare(
      "UPDATE referral_credits SET status = ?, applied_year = ?, applied_at = ?, stripe_ref = ?, note = ? WHERE id = ?",
    )
      .bind(status, year, status === "applied" ? now() : null, ref, note, c.id)
      .run();
    await env.DB.prepare(
      "INSERT INTO lead_notes (id, lead_id, author, outcome, body, created_at) VALUES (?, ?, 'App', NULL, ?, ?)",
    )
      .bind(
        newId(),
        referrerId,
        `Referral credit for ${who} (${c.months} months): ${note}`,
        now(),
      )
      .run();
    if (status === "by_hand")
      await notify(env, {
        kind: "paid",
        actorName: "App",
        leadId: referrerId,
        text: `🎁 ${referrer.name}'s referral credit (${c.months} months, ${money(cents)}) needs applying by hand: no card on file in Stripe.`,
      });
    room--;
    n++;
  }
  return n;
}

/** Daily: credits banked for a later year get applied once a referral year with room starts. */
export async function applyBankedReferrals(env: Env): Promise<void> {
  const rows = await env.DB.prepare(
    "SELECT DISTINCT referrer_lead_id FROM referral_credits WHERE status = 'banked'",
  ).all<{ referrer_lead_id: string }>();
  if (!rows.results.length) return;
  const s = await getSettings(env);
  for (const r of rows.results)
    await applyReferralCredits(env, r.referrer_lead_id, s).catch((err) =>
      console.error("referral credit", r.referrer_lead_id, err),
    );
}

/** The owner applied a by-hand credit on an invoice. */
export async function markReferralApplied(
  env: Env,
  creditId: string,
  actorName: string,
): Promise<{ ok: true }> {
  const c = await env.DB.prepare("SELECT * FROM referral_credits WHERE id = ?")
    .bind(creditId)
    .first<CreditRow>();
  if (!c) throw new HttpError(404, "No such credit");
  await env.DB.prepare(
    "UPDATE referral_credits SET status = 'applied', applied_at = ?, note = ? WHERE id = ?",
  )
    .bind(now(), `Applied by hand by ${actorName}.`, creditId)
    .run();
  return { ok: true };
}

/** Sets (or clears) who sent this lead. Only a sold / live client can be a referrer, and never the lead itself. */
export async function setReferrer(
  env: Env,
  lead: LeadRow,
  referrerId: string | null,
  actorName: string,
): Promise<{ referredBy: { id: string; name: string } | null }> {
  if (!referrerId) {
    await updateLead(env, lead.id, { referred_by: null });
    return { referredBy: null };
  }
  if (referrerId === lead.id)
    throw new HttpError(400, "A business can't refer itself");
  const r = await getLead(env, referrerId);
  if (!r) throw new HttpError(404, "No such client");
  if (r.sales_status !== "sold" && r.sales_status !== "live")
    throw new HttpError(409, "Only a client (Sold or Live) can refer someone");
  await updateLead(env, lead.id, { referred_by: r.id });
  await env.DB.prepare(
    "INSERT INTO lead_notes (id, lead_id, author, outcome, body, created_at) VALUES (?, ?, ?, NULL, ?, ?)",
  )
    .bind(newId(), lead.id, actorName, `Referred by ${r.name}.`, now())
    .run();
  return { referredBy: { id: r.id, name: r.name ?? "" } };
}

export interface ReferralSummary {
  referredBy: { id: string; name: string } | null;
  months: number;
  maxPerYear: number;
  minMonths: number;
  /** Credits this client earned by referring others. */
  credits: Array<{
    id: string;
    referred: { id: string; name: string };
    months: number;
    status: "banked" | "applied" | "by_hand";
    appliedAt: number | null;
    note: string | null;
    createdAt: number;
  }>;
  usedThisYear: number;
  /** When the next referral year starts (banked credits get their turn), or null for a non-paying lead. */
  nextYearAt: number | null;
  /** The text to send a client that explains the program (Text them about referrals). */
  inviteText: string;
}

/** Everything the lead page shows about referrals for this lead (as the referred business and as a referrer). */
export async function referralSummary(
  env: Env,
  lead: LeadRow,
  settings?: AppSettings,
): Promise<ReferralSummary> {
  const s = settings ?? (await getSettings(env));
  const rules = promoRules(s);
  const by = lead.referred_by ? await getLead(env, lead.referred_by) : null;
  const rows = await env.DB.prepare(
    "SELECT c.*, l.name AS referred_name FROM referral_credits c LEFT JOIN leads l ON l.id = c.referred_lead_id WHERE c.referrer_lead_id = ? ORDER BY c.created_at DESC",
  )
    .bind(lead.id)
    .all<CreditRow & { referred_name: string | null }>();
  const paid = await paidSignups(env, lead.id);
  const first = paid[0];
  const year = first ? creditYear(first.created_at, now()) : null;
  const usedThisYear =
    year == null
      ? 0
      : rows.results.filter((c) => c.status !== "banked" && c.applied_year === year).length;
  return {
    referredBy: by ? { id: by.id, name: by.name ?? "" } : null,
    months: rules.referralMonths,
    maxPerYear: rules.referralMaxPerYear,
    minMonths: rules.referralMinMonths,
    credits: rows.results.map((c) => ({
      id: c.id,
      referred: { id: c.referred_lead_id, name: c.referred_name ?? "" },
      months: c.months,
      status: c.status,
      appliedAt: c.applied_at,
      note: c.note,
      createdAt: c.created_at,
    })),
    usedThisYear,
    nextYearAt: first && year != null ? first.created_at + (year + 1) * YEAR_MS : null,
    inviteText: referralInvite(s, lead),
  };
}

/** The text a team member sends a client about the program. */
export function referralInvite(s: Partial<AppSettings>, lead: { name: string | null }): string {
  const rules = promoRules(s);
  const company = s.companyName || "Underground Associates";
  const phone = s.companyPhone ? ` or call ${s.companyPhone}` : "";
  return `Hi! Thanks for being a ${company} client. Know a business that could use a website? When they sign up for a ${rules.referralMinMonths}- or 12-month plan and mention ${lead.name ?? "you"}, you get ${rules.referralMonths} months of your plan free (up to ${rules.referralMaxPerYear} referrals a year; extra ones carry over). Send them to undergroundassociates.com${phone}.`;
}

/** The agreement's PROMOTIONS wording (founder bonus + the referral program), from Settings. */
export function promoTerms(
  s: Partial<AppSettings>,
  founder?: string | null,
): string[] {
  const rules = promoRules(s);
  const out: string[] = [];
  if (founder)
    out.push(
      `Founding-customer bonus: as one of our first ${rules.founderSlots} clients you get "${founder}" at no charge with this plan. It is one per business, can't be exchanged for cash, credit or another extra, and is delivered with your site (printed items within 30 days of going live).`,
    );
  if (rules.referralMonths > 0)
    out.push(
      `Referral program: when a business you refer signs up for a plan of ${rules.referralMinMonths} months or more and its first payment goes through, you get ${rules.referralMonths} months of your plan free, as a credit on your account that comes off your next bills. Up to ${rules.referralMaxPerYear} referral credits count in each year of your service; more than that are banked for the following years. Credits aren't cash, can't be transferred or paid out, and need both accounts to be in good standing when applied. We may change or end the program for future referrals with 30 days' notice; credits already earned stay.`,
    );
  return out;
}

function money(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;
}
