import {
  isDomainAddon,
  isListPlan,
  planIncludesDomain,
  addonGroup,
  addonPrice,
  annualMonthsFreeFor,
  billingOptions,
  type AddOn,
  type AppSettings,
  type Billing,
  type BillingOption,
  type Plan,
  founderChoices,
} from "./db.ts";
import { HttpError, type Env } from "./env.ts";

/**
 * Carts and Stripe Checkout. Prices always come from Settings on the server; the browser only says what was picked.
 * One checkout per order: the plan (monthly, or yearly up front), the month-to-month setup fee, and any extras.
 * Monthly extras ride on the plan's subscription (billed yearly at 12x on a yearly plan); one-time and per-item
 * extras are added to the first payment; "priced per job" extras are noted for a quote.
 */

export interface Line {
  name: string;
  /** Cents per unit. */
  amount: number;
  qty: number;
  /** Set for subscription lines. */
  interval?: "month" | "year";
}

export interface Pick {
  /** Index into Settings → extras. */
  index: number;
  qty: number;
}

export interface PricedOrder {
  plan?: Plan;
  option?: BillingOption;
  lines: Line[];
  /** What they pay today, in cents. */
  dueToday: number;
  /** What renews, in cents, and how often (null when nothing renews). */
  renews: { amount: number; interval: "month" | "year" } | null;
  extras: Array<{ name: string; qty: number; price: string }>;
  quotes: string[];
  /** They pay by check or bank transfer against an invoice we send; nothing is charged online. */
  invoice?: boolean;
  /** The extra a founding customer picked free (its name), when one was. */
  founder?: string;
}

const MAX_QTY = 20;

/** The way-to-pay choice that means "send me an invoice" (churches, or anyone whose link has ?invoice=1). */
export const INVOICE_BILLING = "invoice";

/** Reads extra picks from a form: x_<index> = "on" (and q_<index> = quantity for per-item extras). */
/** The founding-customer pick from a form: founder=<extra index>, or nothing. */
export function founderFromForm(form: FormData | null): number | null {
  const v = String(form?.get("founder") ?? "").trim();
  return /^\d{1,3}$/.test(v) ? Number(v) : null;
}

export function picksFromForm(form: FormData | null, addons: AddOn[]): Pick[] {
  const out: Pick[] = [];
  addons.forEach((a, i) => {
    if (form?.get(`x_${i}`) !== "on") return;
    const qty =
      a.unit === "each"
        ? Math.min(
            MAX_QTY,
            Math.max(1, Math.floor(Number(form.get(`q_${i}`)) || 1)),
          )
        : 1;
    out.push({ index: i, qty });
  });
  return out;
}

function extraLines(
  addons: AddOn[],
  picks: Pick[],
  interval: "month" | "year",
  /** The plan includes a domain (Pro): the Domain name extra is listed at no charge. */
  freeDomain = false,
) {
  const lines: Line[] = [];
  const extras: PricedOrder["extras"] = [];
  const quotes: string[] = [];
  for (const p of picks) {
    const a = addons[p.index];
    if (!a) continue;
    if (freeDomain && isDomainAddon(a)) {
      extras.push({ name: a.name, qty: 1, price: "included with your plan" });
      continue;
    }
    if (a.unit === "quote") {
      quotes.push(a.name);
      continue;
    }
    const cents = Math.round(a.price * 100);
    if (a.unit === "month") {
      lines.push({
        name: a.name,
        amount: interval === "year" ? cents * 12 : cents,
        qty: 1,
        interval,
      });
      // The upfront part of a monthly extra (the domain's registration) is charged once, with the first payment.
      if (a.setup && a.setup > 0)
        lines.push({ name: `${a.name}: upfront`, amount: Math.round(a.setup * 100), qty: 1 });
    } else lines.push({ name: a.name, amount: cents, qty: p.qty });
    extras.push({
      name: a.name,
      qty: p.qty,
      price:
        a.unit === "month" && interval === "year"
          ? `${a.setup ? `$${a.setup} upfront, then ` : ""}$${a.price * 12}/year`
          : addonPrice(a),
    });
  }
  return { lines, extras, quotes };
}

function totals(lines: Line[]) {
  const recurring = lines.filter((l) => l.interval);
  const dueToday = lines.reduce((s, l) => s + l.amount * l.qty, 0);
  const renews = recurring.length
    ? {
        amount: recurring.reduce((s, l) => s + l.amount * l.qty, 0),
        interval: recurring[0]!.interval!,
      }
    : null;
  return { dueToday, renews };
}

/**
 * A plan sign-up: plan + way to pay + extras. `opts.category` "church" prices the yearly option at the ministry rate.
 * `billing` "invoice" (only when `opts.invoice` allows it) means the standard plan, paid against an invoice instead of
 * online. Throws a 400 HttpError when the plan doesn't exist; an unknown way to pay falls back to the standard plan.
 */
export function priceSignup(
  s: AppSettings,
  planId: string,
  billing: string,
  picks: Pick[],
  opts: {
    category?: string;
    invoice?: boolean;
    /** Index of the extra a founding customer picked free; ignored unless Settings marks it as a founder pick. */
    founder?: number | null;
  } = {},
): PricedOrder {
  const plan = s.plans.find((p) => p.id === planId);
  if (!plan) throw new HttpError(400, "That plan isn't available");
  const invoice = billing === INVOICE_BILLING && !!opts.invoice;
  const options = billingOptions(plan, s, { category: opts.category });
  const option =
    options.find((o) => o.id === billing) ??
    options.find((o) => o.id === "standard") ??
    options[0]!;
  const yearly = option.id === "annual";
  const interval = yearly ? "year" : "month";
  const months = yearly ? 12 - annualMonthsFreeFor(s, opts.category) : 1;
  const lines: Line[] = [
    {
      name: `${plan.name} website plan${yearly ? " (yearly)" : ""}`,
      amount: Math.round(plan.monthly * months * 100),
      qty: 1,
      interval,
    },
  ];
  const setup =
    (plan.setup ?? 0) + (option.id === "flex" ? (s.flexSetup ?? 0) : 0);
  if (setup)
    lines.push({
      name: option.id === "flex" ? "Setup fee (month to month)" : "Setup fee",
      amount: Math.round(setup * 100),
      qty: 1,
    });
  const x = extraLines(s.addons, picks, interval, planIncludesDomain(plan));
  lines.push(...x.lines);
  // Founding-customer bonus: one free extra, shown on the order at $0 (never sent to Stripe as a line).
  const fp =
    opts.founder != null && opts.founder >= 0
      ? founderChoices(s).find((c) => c.index === opts.founder)?.addon
      : undefined;
  const freed = fp && !picks.some((pk) => pk.index === opts.founder);
  if (fp && freed) {
    lines.push({
      name: `Free: ${fp.name} (founding customer)`,
      amount: 0,
      qty: 1,
    });
    x.extras.push({ name: fp.name, qty: 1, price: "free (founding customer)" });
  }
  return {
    plan,
    option: option as BillingOption & { id: Billing },
    lines,
    ...totals(lines),
    extras: x.extras,
    quotes: x.quotes,
    ...(invoice ? { invoice: true } : {}),
    ...(fp && freed ? { founder: fp.name } : {}),
  };
}

/** Extras bought later by an existing client (monthly extras become their own monthly subscription). */
export function priceExtras(s: AppSettings, picks: Pick[]): PricedOrder {
  const x = extraLines(s.addons, picks, "month");
  return {
    lines: x.lines,
    ...totals(x.lines),
    extras: x.extras,
    quotes: x.quotes,
  };
}

export function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;
}

/** Stripe's form encoding for nested params: a[b][0][c]=… */
export function stripeForm(params: Record<string, unknown>): URLSearchParams {
  const out = new URLSearchParams();
  const walk = (prefix: string, v: unknown) => {
    if (v === undefined || v === null) return;
    if (Array.isArray(v)) v.forEach((item, i) => walk(`${prefix}[${i}]`, item));
    else if (typeof v === "object")
      for (const [k, val] of Object.entries(v as Record<string, unknown>))
        walk(prefix ? `${prefix}[${k}]` : k, val);
    else out.append(prefix, String(v));
  };
  walk("", params);
  return out;
}

/** The Checkout Session parameters for an order. */
export function checkoutParams(o: {
  order: PricedOrder;
  successUrl: string;
  cancelUrl: string;
  clientReferenceId?: string;
  email?: string;
  customer?: string | null;
  metadata: Record<string, string>;
}): Record<string, unknown> {
  const subscription = o.order.lines.some((l) => l.interval);
  return {
    mode: subscription ? "subscription" : "payment",
    success_url: o.successUrl,
    cancel_url: o.cancelUrl,
    client_reference_id: o.clientReferenceId,
    ...(o.customer
      ? { customer: o.customer }
      : o.email
        ? { customer_email: o.email }
        : {}),
    ...(!subscription && !o.customer ? { customer_creation: "always" } : {}),
    metadata: o.metadata,
    ...(subscription
      ? { subscription_data: { metadata: o.metadata } }
      : { payment_intent_data: { metadata: o.metadata } }),
    line_items: o.order.lines.filter((l) => l.amount > 0).map((l) => ({
      quantity: l.qty,
      price_data: {
        currency: "usd",
        unit_amount: l.amount,
        product_data: { name: l.name },
        ...(l.interval ? { recurring: { interval: l.interval } } : {}),
      },
    })),
  };
}

/** Creates a Stripe Checkout Session and returns where to send the customer. */
export async function createCheckout(
  env: Env,
  params: Record<string, unknown>,
): Promise<{ id: string; url: string }> {
  if (!env.STRIPE_SECRET_KEY) throw new Error("Online checkout isn't set up");
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: stripeForm(params),
  });
  const data = (await res.json()) as {
    id?: string;
    url?: string;
    error?: { message?: string };
  };
  if (!res.ok || !data.url || !data.id)
    throw new Error(`Stripe: ${data.error?.message ?? res.status}`);
  return { id: data.id, url: data.url };
}

/**
 * A Stripe Billing Portal session for an existing customer (update card, see invoices, cancel). Returns the URL to send
 * them to, or null when online checkout isn't set up.
 */
export async function portalSession(
  env: Env,
  customer: string,
  returnUrl: string,
): Promise<string | null> {
  if (!env.STRIPE_SECRET_KEY) return null;
  const res = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: stripeForm({ customer, return_url: returnUrl }),
  });
  const data = (await res.json()) as {
    url?: string;
    error?: { message?: string };
  };
  if (!res.ok || !data.url)
    throw new Error(`Stripe: ${data.error?.message ?? res.status}`);
  return data.url;
}

/** Extras worth showing first on a sign-up page; the rest fold under "More extras". */
const FEATURED_EXTRAS = /order|book|photo|spanish|logo|nfc|review card/i;
const MAX_FEATURED = 5;

export interface PickerOptions {
  planId?: string;
  billing?: string;
  esc: (t: string) => string;
  /** false: the plan is pre-picked and shown as one line with a "change plan" link that reveals the picker. */
  showPlans?: boolean;
  /** The lead's category: "church" shows and charges the ministry rate on the yearly option. */
  category?: string;
  /** Offer "Pay by check or bank transfer (we'll send an invoice)" as a way to pay. */
  invoice?: boolean;
  /** Founding-customer bonus still open: the free extras to pick from and how many spots are left. */
  founder?: {
    slotsLeft: number;
    total: number;
    choices: Array<{ index: number; name: string; price: string; about: string }>;
  } | null;
  /** The client who referred them (shown so they know the referrer earns the credit), with the program's numbers. */
  referredBy?: { name: string; months: number } | null;
  /** Extras to tick already (indexes into Settings → Extras), e.g. from the website's Extras page "Add at sign-up". */
  picks?: number[];
}

/**
 * Plan/billing/extras picker shared by the sign-up page and the website's Buy now page. Totals update as they pick.
 * Short by default: two ways to pay (the standard plan and yearly) with the rest under "Other ways to pay", and up to
 * five featured extras with the rest under "More extras".
 */
export function pickerHtml(s: AppSettings, o: PickerOptions): string {
  const e = o.esc;
  const plans = s.plans.filter((p) => p.monthly);
  const plan =
    plans.find((p) => p.id === o.planId) ??
    plans.find((p) => p.id === "plus") ??
    plans[0];
  if (!plan) return "";
  const church = o.category === "church";
  const free = annualMonthsFreeFor(s, o.category);
  const options = billingOptions(plan, s, { category: o.category });
  const picked = o.billing ?? "standard";
  const data = {
    plans: Object.fromEntries(
      plans.map((p) => [
        p.id,
        {
          name: p.name,
          monthly: p.monthly,
          setup: p.setup ?? 0,
          domain: planIncludesDomain(p),
        },
      ]),
    ),
    flexSetup: s.flexSetup ?? 0,
    free,
    addons: s.addons.map((a) => ({
      price: a.price,
      setup: a.unit === "month" ? (a.setup ?? 0) : 0,
      unit: a.unit,
      domain: isDomainAddon(a),
      text: addonPrice(a),
    })),
  };
  const money = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
  const billingLabel = (b: BillingOption) =>
    isListPlan(plan)
      ? b.id === "annual"
        ? `Pay 12 months up front for the price of ${12 - free}. No setup fee.`
        : "Monthly price, no setup fee, no minimum. Cancel any time."
      : b.id === "flex"
        ? `Monthly price plus a one-time ${money((plan.setup ?? 0) + (s.flexSetup ?? 0))} setup fee. No minimum.`
        : b.id === "annual"
          ? church
            ? `Ministry rate: 12 months for the price of ${12 - free} — ${money(plan.monthly * (12 - free))}/year. No setup fee.`
            : `Pay 12 months up front for the price of ${12 - free}. No setup fee.`
          : `Monthly price, no setup fee. ${b.id === "short" ? (s.shortMonths ?? 6) : (s.minMonths ?? 12)}-month minimum, then cancel any time.`;
  const billingOpt = (b: BillingOption) =>
    `<label class="opt"><input type="radio" name="billing" value="${b.id}"${b.id === picked ? " checked" : ""}><span><strong>${e(b.label)}</strong><small data-bdetail="${b.id}">${e(billingLabel(b))}</small></span></label>`;
  const mainWays = options.filter(
    (b) => b.id === "standard" || b.id === "annual",
  );
  const otherWays = options.filter((b) => !mainWays.includes(b));
  const standard = options.find((b) => b.id === "standard") ?? options[0]!;
  const invoiceOpt = o.invoice
    ? `<label class="opt"><input type="radio" name="billing" value="${INVOICE_BILLING}"${picked === INVOICE_BILLING ? " checked" : ""}><span><strong>Pay by check or bank transfer</strong><small data-bdetail="${INVOICE_BILLING}">We'll send an invoice for the ${e(standard.label)} at the monthly price, no setup fee. Nothing is charged online.</small></span></label>`
    : "";
  const picks = new Set(o.picks ?? []);
  const extraOpt = (a: AddOn, i: number) =>
    `<label class="opt"><input type="checkbox" name="x_${i}"${picks.has(i) ? " checked" : ""}><span><strong>${e(a.name)}</strong> · <span class="pk-price">${e(addonPrice(a))}</span>${a.about ? `<small>${e(a.about)}</small>` : ""}${a.unit === "quote" ? "<small>We'll call you with a price.</small>" : ""}</span>${a.unit === "each" ? `<input class="qty" type="number" name="q_${i}" min="1" max="${MAX_QTY}" value="1" aria-label="How many">` : ""}</label>`;
  // Pre-ticked extras show up top so nobody has to open "More extras" to see what they asked for.
  const featured = new Set<number>(
    [...picks].filter((i) => s.addons[i] && addonGroup(s.addons[i]) !== "inventory"),
  );
  s.addons.forEach((a, i) => {
    if (
      featured.size < MAX_FEATURED &&
      addonGroup(a) !== "inventory" &&
      FEATURED_EXTRAS.test(a.name)
    )
      featured.add(i);
  });
  const inv = (a: AddOn) => addonGroup(a) === "inventory";
  // The Price list plan leads with its own pieces; website plans keep them under their own heading.
  const listFirst = isListPlan(plan);
  const topExtras = s.addons
    .map((a, i) => (featured.has(i) && !inv(a) ? extraOpt(a, i) : ""))
    .join("");
  const moreExtras = s.addons
    .map((a, i) => (featured.has(i) || inv(a) ? "" : extraOpt(a, i)))
    .join("");
  const invExtras = s.addons
    .map((a, i) => (inv(a) ? extraOpt(a, i) : ""))
    .join("");
  const planRow = (p: Plan) =>
    `<label class="opt"><input type="radio" name="plan" value="${p.id}"${p.id === plan.id ? " checked" : ""}><span><strong>${e(p.name)}</strong> · ${money(p.monthly)}/month<small>${e(p.includes.split("\n").filter(Boolean).join(" · "))}</small></span></label>`;
  const planPicker = (hidden: boolean) =>
    `<fieldset id="pk-plans"${hidden ? " hidden disabled" : ""}><legend>Pick a plan</legend>${plans.map(planRow).join("")}</fieldset>`;
  return `<style>
.pk fieldset{border:0;padding:0;margin:0 0 18px}.pk legend{font-weight:700;font-size:1.05rem;margin-bottom:8px}
.pk .opt{display:flex;gap:10px;align-items:flex-start;border:1px solid #d5d9e2;border-radius:12px;padding:12px;margin:0 0 8px;cursor:pointer;background:#fff;color:#16181d}
.pk .opt input{margin-top:4px;width:20px;height:20px;min-height:0;padding:0;flex:none}.pk .opt small{display:block;color:#545b68}
.pk .opt:has(input:checked){border:2px solid #fca311;padding:11px}
.pk .opt input.qty{width:64px;height:auto;min-height:38px;padding:4px 8px;margin:0 0 0 auto}
.pk .total{background:#14213d;color:#fff;border-radius:12px;padding:14px 16px;margin:0 0 18px}.pk .total strong{font-size:1.4rem}
.pk .plan-line{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:baseline;margin:0 0 16px;font-size:1.05rem}.pk .plan-line a{color:#1d4ed8}
.pk details{border:1px solid #d5d9e2;border-radius:12px;padding:0 12px;margin:0 0 10px;background:#fff}.pk details[open]{padding-bottom:4px}
.pk summary{cursor:pointer;font-weight:700;padding:12px 0;color:#1d4ed8}.pk details .opt{margin-top:2px}
</style>
<div class="pk" id="pk">
${o.showPlans === false ? `<input type="hidden" name="plan" value="${plan.id}" id="pk-plan-fixed"><p class="plan-line" id="pk-plan-line"><span>Plan: <strong>${e(plan.name)}</strong> · ${money(plan.monthly)}/month</span><a href="#pk-plans" id="pk-change">change plan</a>${!isListPlan(plan) && (s.flexSetup ?? 0) > 0 ? `<small style="flex-basis:100%;color:#545b68">No setup fee on the ${s.shortMonths ?? 6}- or ${s.minMonths ?? 12}-month plan or yearly; month to month adds a one-time ${money(s.flexSetup ?? 0)} setup fee (added below when you pick it).</small>` : ""}</p>${planPicker(true)}` : planPicker(false)}
<fieldset><legend>How would you like to pay?</legend>${mainWays.map(billingOpt).join("")}${invoiceOpt}${otherWays.length ? `<details><summary>Other ways to pay</summary>${otherWays.map(billingOpt).join("")}</details>` : ""}</fieldset>
${invExtras && listFirst ? `<fieldset><legend>Inventory add-ons <span style="font-weight:400;color:#545b68">(optional)</span></legend>${invExtras}</fieldset>` : ""}
${topExtras || moreExtras ? `<fieldset><legend>Add extras <span style="font-weight:400;color:#545b68">(optional)</span></legend>${topExtras}${moreExtras ? `<details><summary>More extras</summary>${moreExtras}</details>` : ""}</fieldset>` : ""}
${invExtras && !listFirst ? `<fieldset><legend>Inventory add-ons <span style="font-weight:400;color:#545b68">(optional, for the live price list)</span></legend>${invExtras}</fieldset>` : ""}
${
  o.founder && o.founder.slotsLeft > 0 && o.founder.choices.length
    ? `<fieldset id="pk-founder"><legend>🎁 Founding-customer bonus</legend><p style="margin:0 0 8px;color:#545b68">You're one of our first ${o.founder.total} clients: pick one of these free with your plan${o.founder.slotsLeft <= 2 ? ` (${o.founder.slotsLeft} spot${o.founder.slotsLeft === 1 ? "" : "s"} left)` : ""}.</p>${o.founder.choices
        .map(
          (c) =>
            `<label class="opt"><input type="radio" name="founder" value="${c.index}"><span><strong>${e(c.name)}</strong> · <s>${e(c.price)}</s> <b>free</b>${c.about ? `<small>${e(c.about)}</small>` : ""}</span></label>`,
        )
        .join("")}<label class="opt"><input type="radio" name="founder" value="" checked><span>No thanks</span></label></fieldset>`
    : ""
}${
  o.referredBy
    ? `<p class="pk-ref" style="margin:0 0 16px;padding:12px;border-radius:12px;background:#eef3ff;color:#16181d">🤝 Referred by <strong>${e(o.referredBy.name)}</strong>. Once your plan's first payment goes through, they get ${o.referredBy.months} month${o.referredBy.months === 1 ? "" : "s"} free. Thanks for coming through them.</p>`
    : ""
}<div class="total" aria-live="polite"><span id="pk-today"></span><br><small id="pk-then"></small></div>
</div>
<script>(function(){var d=${JSON.stringify(data).replace(/</g, "\\u003c")};var f=document.getElementById("pk").closest("form");
function v(n){var x=f.querySelector('[name="'+n+'"]:checked:enabled')||f.querySelector('input[type=hidden][name="'+n+'"]');return x?x.value:""}
function m(c){return "$"+(c%100?(c/100).toFixed(2):c/100)}
function u(){var p=d.plans[v("plan")];if(!p)return;var b=v("billing"),inv=b==="${INVOICE_BILLING}",y=b==="annual",iv=y?"year":"month";var today=Math.round(p.monthly*(y?12-d.free:1)*100),again=today;
var setup=(p.setup||0)+(b==="flex"?d.flexSetup:0);today+=Math.round(setup*100);
d.addons.forEach(function(a,i){var c=f.querySelector('[name="x_'+i+'"]'),fr=a.domain&&p.domain;if(c&&a.domain){var pp=c.closest(".opt").querySelector(".pk-price");if(pp)pp.textContent=fr?"included with "+p.name:a.text;}if(!c||!c.checked||a.unit==="quote"||fr)return;var q=a.unit==="each"?Math.max(1,parseInt((f.querySelector('[name="q_'+i+'"]')||{}).value)||1):1;var amt=Math.round(a.price*100)*q;
if(a.unit==="month"){amt=y?amt*12:amt;again+=amt;today+=Math.round((a.setup||0)*100);}today+=amt;});
var r=f.querySelector('[name="billing"]:checked');if(r&&r.closest("details"))r.closest("details").open=true;
document.getElementById("pk-today").innerHTML=(inv?"On your first invoice: ":"Due today: ")+"<strong>"+m(today)+"</strong>";document.getElementById("pk-then").textContent="Then "+m(again)+" per "+iv+(inv?", invoiced.":", charged automatically.");
var go=document.getElementById("pk-go");if(go&&go.dataset.pay)go.textContent=inv&&go.dataset.invoice?go.dataset.invoice:go.dataset.pay;}
var ch=document.getElementById("pk-change");if(ch){ch.addEventListener("click",function(ev){ev.preventDefault();var fx=document.getElementById("pk-plan-fixed"),fs=document.getElementById("pk-plans");if(fx)fx.parentNode.removeChild(fx);fs.hidden=false;fs.disabled=false;document.getElementById("pk-plan-line").hidden=true;u();fs.querySelector("input:checked").focus();});}
f.addEventListener("change",u);f.addEventListener("input",u);u();})();</script>`;
}
