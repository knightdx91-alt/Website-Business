import type { Env } from "./env.ts";
import { getSetting, setSetting, type AppSettings } from "./db.ts";
import { notify } from "./notify.ts";
import { salesDashboard } from "./sales.ts";

/**
 * 💵 Costs & usage (owner and full access): every outside service the app depends on, what it costs, what we've used this
 * month (from the usage meter, `meter.ts` → `usage_daily`), when it renews and what stops if it lapses. Defaults below are
 * the prices as of October 2026; the team edits prices, free allowances, renewal dates, accounts and notes in the screen
 * (`PUT /api/costs`, stored as settings key `costs_json`), so a price change never needs a code change.
 */

export interface RateDef {
  metric: string;
  label: string;
  /** "each" = cents per call; "per_million" = cents per million tokens. */
  unit: "each" | "per_million";
  unitCents: number;
  /** Free units per month before the rate applies. */
  freeQty: number;
  note?: string;
}

export interface ServiceDef {
  id: string;
  emoji: string;
  name: string;
  /** What it does for us, in one or two sentences. */
  what: string;
  kind: "fixed" | "usage" | "fees" | "free";
  /** Fixed plans: the price per renewal; `renewEvery` says whether that's a month or a year. null = the owner fills it in. */
  monthlyCents?: number | null;
  renewEvery?: "month" | "year";
  /** Where to log in. */
  url?: string;
  /** Which login it's under (the owner's Google address, a shared email…). */
  account?: string;
  ifItStops: string;
  /** Anything the team should know: free tiers, what to check, how it's billed. */
  tip?: string;
  rates?: RateDef[];
}

export const SERVICES: ServiceDef[] = [
  {
    id: "cloudflare",
    emoji: "☁️",
    name: "Cloudflare (Workers Paid plan)",
    what: "Runs the app, its database and photo storage, the build queue, and hosts every client website and our own site. One bill covers all of it.",
    kind: "fixed",
    monthlyCents: 500,
    renewEvery: "month",
    url: "https://dash.cloudflare.com/?to=/:account/billing",
    ifItStops:
      "The app, every live client website and undergroundassociates.com go offline. Nothing is lost, but nothing works until the card is fixed.",
    tip: "The $5 plan includes far more than we use. Usage charges above it (requests, storage) only start at volumes we're nowhere near; the billing page shows the current month.",
  },
  {
    id: "domain",
    emoji: "🌐",
    name: "undergroundassociates.com (domain)",
    what: "Our own web address: the company site, the sign-up and agreement links clients get, and our email addresses.",
    kind: "fixed",
    monthlyCents: 1044,
    renewEvery: "year",
    url: "https://dash.cloudflare.com/?to=/:account/domains",
    ifItStops:
      "The company site and every link we've ever texted on that address stop working, and email bounces. Keep auto-renew on; fill in the renewal date below.",
    tip: "Registered through Cloudflare at cost (about $10 a year). Client domains are bought by the clients in their own names and are not our bill.",
  },
  {
    id: "google-places",
    emoji: "📍",
    name: "Google Places API",
    what: "Finds the businesses: Find new leads and Add a business search Google, read each business's details and show its photos in previews.",
    kind: "usage",
    url: "https://console.cloud.google.com/billing",
    ifItStops:
      "No new leads and no Add a business. Existing leads, previews and live sites are not affected.",
    tip: "Billed by Google Cloud per request, after a free monthly allowance per kind of request. Searches cost the most, so the run cap in Find new leads is what controls this bill. Prices and allowances below are editable; check them against the Google Cloud billing page once.",
    rates: [
      {
        metric: "places.search",
        label: "Searches (one per page of 20 results)",
        unit: "each",
        unitCents: 3.5,
        freeQty: 1000,
      },
      {
        metric: "places.details",
        label: "Business details",
        unit: "each",
        unitCents: 2,
        freeQty: 1000,
      },
      {
        metric: "places.photo",
        label: "Photos shown in previews",
        unit: "each",
        unitCents: 0.7,
        freeQty: 1000,
      },
    ],
  },
  {
    id: "anthropic",
    emoji: "✍️",
    name: "Anthropic (Claude API)",
    what: "Writes the words: every site's text, call guides, Spanish pages, Google profile text, social posts and the tablet's info cards.",
    kind: "usage",
    url: "https://console.anthropic.com/settings/billing",
    ifItStops:
      "New previews build with no text and the call guide, Spanish page and info-card buttons fail. Existing sites keep their words.",
    tip: "Billed per token (a token is about three quarters of a word). A full site is roughly 10 to 20 cents, a call guide a few cents. Prepaid credit: top it up before it runs out, or turn on auto-reload in the console.",
    rates: [
      {
        metric: "anthropic.claude-opus-5-5.in",
        label: "Opus 5.5: words read",
        unit: "per_million",
        unitCents: 400,
        freeQty: 0,
      },
      {
        metric: "anthropic.claude-opus-5-5.out",
        label: "Opus 5.5: words written",
        unit: "per_million",
        unitCents: 2000,
        freeQty: 0,
      },
      {
        metric: "anthropic.claude-opus-5-5.cache_read",
        label: "Opus 5.5: repeated prompt (cached)",
        unit: "per_million",
        unitCents: 20,
        freeQty: 0,
      },
      {
        metric: "anthropic.claude-opus-5-5.cache_write",
        label: "Opus 5.5: prompt saved to cache",
        unit: "per_million",
        unitCents: 500,
        freeQty: 0,
      },
      {
        metric: "anthropic.claude-sonnet-5-5.in",
        label: "Sonnet 5.5: words read",
        unit: "per_million",
        unitCents: 200,
        freeQty: 0,
      },
      {
        metric: "anthropic.claude-sonnet-5-5.out",
        label: "Sonnet 5.5: words written",
        unit: "per_million",
        unitCents: 1000,
        freeQty: 0,
      },
      {
        metric: "anthropic.claude-sonnet-5-5.cache_read",
        label: "Sonnet 5.5: repeated prompt (cached)",
        unit: "per_million",
        unitCents: 20,
        freeQty: 0,
      },
      {
        metric: "anthropic.claude-sonnet-5-5.cache_write",
        label: "Sonnet 5.5: prompt saved to cache",
        unit: "per_million",
        unitCents: 250,
        freeQty: 0,
      },
      {
        metric: "anthropic.claude-haiku-5-5.in",
        label: "Haiku 5.5: words read",
        unit: "per_million",
        unitCents: 10,
        freeQty: 0,
      },
      {
        metric: "anthropic.claude-haiku-5-5.out",
        label: "Haiku 5.5: words written",
        unit: "per_million",
        unitCents: 50,
        freeQty: 0,
      },
    ],
  },
  {
    id: "stripe",
    emoji: "💳",
    name: "Stripe (card payments)",
    what: "Takes every payment: sign-ups, Tap to Pay on the phone, monthly and yearly renewals, Buy extras links, refunds and the billing portal.",
    kind: "fees",
    url: "https://dashboard.stripe.com/",
    ifItStops:
      "No payments in and no renewals. Sites stay up. Fix the account (usually identity or bank details Stripe asks for) the same day.",
    tip: "No monthly fee. Stripe keeps about 2.9% + 30¢ of each online payment and 2.7% + 15¢ of each tap, and pays the rest to the bank account on file every couple of days. The estimate below is from this month's paid sign-ups and extras.",
  },
  {
    id: "resend",
    emoji: "📧",
    name: "Resend (email sending)",
    what: "Sends the emails clients ask for: Buy extras links, calendar invites for tasks, test emails from Settings. Never outreach.",
    kind: "usage",
    url: "https://resend.com/overview",
    ifItStops:
      "Those emails stop; the team texts the links by hand instead. Nothing else is affected.",
    tip: "Free up to 3,000 emails a month (100 a day). We send a handful. The paid plan ($20 a month) is only needed above that.",
    rates: [
      {
        metric: "email.sent",
        label: "Emails sent",
        unit: "each",
        unitCents: 0,
        freeQty: 3000,
        note: "$20 a month above 3,000",
      },
    ],
  },
  {
    id: "brave",
    emoji: "🔎",
    name: "Brave Search API",
    what: "One web search per new lead to catch a website Google's listing doesn't show (the \"Page on another site\" label).",
    kind: "usage",
    url: "https://api-dashboard.search.brave.com/",
    ifItStops:
      "Leads still come in; the app just can't tell when one has a page somewhere else. Re-check website stops working.",
    tip: "Free for the first 2,000 searches a month, then about $3 per 1,000. Each search run uses up to 15.",
    rates: [
      {
        metric: "brave.search",
        label: "Web searches",
        unit: "each",
        unitCents: 0.3,
        freeQty: 2000,
      },
    ],
  },
  {
    id: "google-workspace",
    emoji: "📬",
    name: "Google Workspace (company email)",
    what: "The @undergroundassociates.com mailboxes and the Google sign-in the team uses for the app.",
    kind: "fixed",
    monthlyCents: 840,
    renewEvery: "month",
    url: "https://admin.google.com/",
    ifItStops:
      "Company email stops and Google sign-in to the app fails (passwords still work for the owner). Billed per person with a mailbox; the price here is for one.",
    tip: "Business Starter is about $8.40 a user a month on the monthly plan. Add a line in Notes for each extra mailbox.",
  },
  {
    id: "firebase",
    emoji: "🔔",
    name: "Firebase Cloud Messaging",
    what: "Instant alerts to the team's phones (new sign-up, preview opened, app update).",
    kind: "free",
    url: "https://console.firebase.google.com/",
    ifItStops:
      "Alerts arrive on the app's 15-minute check instead of instantly. Free at any volume we'll reach.",
    rates: [
      {
        metric: "push.sent",
        label: "Pushes sent",
        unit: "each",
        unitCents: 0,
        freeQty: 1_000_000,
      },
    ],
  },
  {
    id: "google-cloud",
    emoji: "🔐",
    name: "Google Cloud project (sign-in, Places key)",
    what: "Holds the Places API key and the Google sign-in setup for the team. The same project is where the Places bill lands.",
    kind: "free",
    url: "https://console.cloud.google.com/",
    ifItStops:
      "If the card on the Google Cloud account fails, Places searches stop first. Google emails the account owner.",
  },
  {
    id: "openfoodfacts",
    emoji: "🏷️",
    name: "Open Food Facts (barcode names)",
    what: "Names a packaged product from its barcode when a shop scans one the tablet hasn't seen.",
    kind: "free",
    url: "https://world.openfoodfacts.org/",
    ifItStops: "Staff type the product name themselves. Nothing else changes.",
    rates: [
      {
        metric: "openfoodfacts.lookup",
        label: "Barcode lookups",
        unit: "each",
        unitCents: 0,
        freeQty: 1_000_000,
      },
    ],
  },
  {
    id: "dev-tools",
    emoji: "🛠️",
    name: "Development (Claude Code subscription)",
    what: "The AI developer the owner uses to build and fix this app. Not needed for the app to run.",
    kind: "fixed",
    monthlyCents: null,
    renewEvery: "month",
    url: "https://claude.ai/settings/billing",
    ifItStops:
      "No new features or fixes until it's back. The app, the sites and payments keep running.",
    tip: "Fill in what the owner pays so the total here is honest.",
  },
];

export interface CostOverrides {
  services?: Record<
    string,
    {
      monthlyCents?: number | null;
      renews?: string | null;
      account?: string | null;
      notes?: string | null;
    }
  >;
  rates?: Record<string, { unitCents?: number; freeQty?: number }>;
  budgetCents?: number;
}

export const DEFAULT_BUDGET_CENTS = 15000;

export async function getCostOverrides(env: Env): Promise<CostOverrides> {
  const raw = await getSetting(env, "costs_json");
  if (!raw) return {};
  try {
    return JSON.parse(raw) as CostOverrides;
  } catch {
    return {};
  }
}

export async function saveCostOverrides(
  env: Env,
  o: CostOverrides,
): Promise<void> {
  await setSetting(env, "costs_json", JSON.stringify(o));
}

/** Cents a metric costs this month, after its free allowance. Exported for tests. */
export function estimate(rate: RateDef, qty: number): number {
  const billable = Math.max(0, qty - (rate.freeQty ?? 0));
  if (!billable || !rate.unitCents) return 0;
  return rate.unit === "per_million"
    ? (billable / 1_000_000) * rate.unitCents
    : billable * rate.unitCents;
}

export function monthKey(d = new Date()): string {
  return d.toISOString().slice(0, 7);
}

export function previousMonthKey(d = new Date()): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1))
    .toISOString()
    .slice(0, 7);
}

/** Sum of `usage_daily` per metric for the months given (YYYY-MM). */
export async function usageByMonth(
  env: Env,
  months: string[],
): Promise<Record<string, Record<string, number>>> {
  const out: Record<string, Record<string, number>> = {};
  for (const m of months) out[m] = {};
  if (!months.length) return out;
  const rows = await env.DB.prepare(
    `SELECT substr(day, 1, 7) AS month, metric, SUM(qty) AS qty FROM usage_daily WHERE substr(day, 1, 7) IN (${months.map(() => "?").join(",")}) GROUP BY month, metric`,
  )
    .bind(...months)
    .all<{ month: string; metric: string; qty: number }>();
  for (const r of rows.results)
    (out[r.month] ??= {})[r.metric] = Number(r.qty) || 0;
  return out;
}

export interface UsageLine {
  metric: string;
  label: string;
  unit: RateDef["unit"];
  unitCents: number;
  freeQty: number;
  note?: string;
  month: number;
  lastMonth: number;
  estCents: number;
  /** 0–1 of the free allowance used this month (null when there is none). */
  freeUsed: number | null;
}

export interface ServiceReport {
  id: string;
  emoji: string;
  name: string;
  what: string;
  kind: ServiceDef["kind"];
  monthlyCents: number | null;
  renewEvery?: "month" | "year";
  /** What this service adds to a month: the fixed price (a yearly price ÷ 12) or this month's usage estimate. */
  perMonthCents: number;
  renews: string | null;
  url?: string;
  account: string | null;
  notes: string | null;
  ifItStops: string;
  tip?: string;
  usage: UsageLine[];
  warnings: string[];
}

export interface CostsReport {
  month: string;
  lastMonth: string;
  asOf: string;
  budgetCents: number;
  totals: {
    fixedCents: number;
    usageCents: number;
    feesCents: number;
    outCents: number;
    revenueCents: number;
    signedRevenueCents: number;
  };
  warnings: string[];
  services: ServiceReport[];
}

function unknownModels(
  metrics: Iterable<string>,
  known: Set<string>,
): RateDef[] {
  const out: RateDef[] = [];
  const seen = new Set<string>();
  for (const m of metrics) {
    const mm = /^anthropic\.([^.]+)\.(in|out|cache_read|cache_write)$/.exec(m);
    if (!mm || known.has(m) || seen.has(m)) continue;
    seen.add(m);
    const [, model, k] = mm;
    // A model we haven't priced: use the Opus rate and say so.
    const rate = { in: 400, out: 2000, cache_read: 20, cache_write: 500 }[
      k as "in"
    ];
    const what = {
      in: "words read",
      out: "words written",
      cache_read: "repeated prompt (cached)",
      cache_write: "prompt saved to cache",
    }[k as "in"];
    out.push({
      metric: m,
      label: `${model}: ${what}`,
      unit: "per_million",
      unitCents: rate,
      freeQty: 0,
      note: "Priced at the Opus rate until you set it",
    });
  }
  return out;
}

/** The whole picture for the screen. `revenue` can be passed in by tests; otherwise it comes from the sales dashboard. */
export async function costsReport(
  env: Env,
  settings: AppSettings,
  opts: { now?: Date; revenue?: { monthly: number; signed: number } } = {},
): Promise<CostsReport> {
  const now = opts.now ?? new Date();
  const month = monthKey(now);
  const lastMonth = previousMonthKey(now);
  const [usage, overrides] = await Promise.all([
    usageByMonth(env, [month, lastMonth]),
    getCostOverrides(env),
  ]);
  const revenue =
    opts.revenue ??
    (await salesDashboard(env)
      .then((d) => ({ monthly: d.monthlyRevenue, signed: d.signedRevenue }))
      .catch(() => ({ monthly: 0, signed: 0 })));
  const thisM = usage[month] ?? {};
  const lastM = usage[lastMonth] ?? {};
  const knownMetrics = new Set(
    SERVICES.flatMap((s) => (s.rates ?? []).map((r) => r.metric)),
  );
  const extraAnthropic = unknownModels(
    new Set([...Object.keys(thisM), ...Object.keys(lastM)]),
    knownMetrics,
  );
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const paid = await env.DB.prepare(
    "SELECT COALESCE(SUM(due_cents), 0) AS cents, COUNT(*) AS n FROM (SELECT due_cents FROM signups WHERE paid = 1 AND created_at >= ? UNION ALL SELECT due_cents FROM purchases WHERE paid = 1 AND created_at >= ?)",
  )
    .bind(monthStart, monthStart)
    .first<{ cents: number; n: number }>()
    .catch(() => ({ cents: 0, n: 0 }));
  const feesCents = Math.round(
    (Number(paid?.cents) || 0) * 0.029 + (Number(paid?.n) || 0) * 30,
  );

  const warnings: string[] = [];
  const services: ServiceReport[] = SERVICES.map((def) => {
    const o = overrides.services?.[def.id] ?? {};
    const rates = [
      ...(def.rates ?? []),
      ...(def.id === "anthropic" ? extraAnthropic : []),
    ].map((r) => ({ ...r, ...(overrides.rates?.[r.metric] ?? {}) }));
    const lines: UsageLine[] = rates.map((r) => {
      const m = thisM[r.metric] ?? 0;
      return {
        metric: r.metric,
        label: r.label,
        unit: r.unit,
        unitCents: r.unitCents,
        freeQty: r.freeQty,
        note: r.note,
        month: m,
        lastMonth: lastM[r.metric] ?? 0,
        estCents: estimate(r, m),
        freeUsed:
          r.freeQty > 0 && r.freeQty < 1_000_000
            ? Math.min(1, m / r.freeQty)
            : null,
      };
    });
    // Hide zero rows for models/metrics that never happened, but keep the first line of each service so the card isn't empty.
    const usage = lines.filter(
      (l, i) => l.month || l.lastMonth || (i === 0 && def.kind !== "fees"),
    );
    const monthlyCents =
      o.monthlyCents === undefined
        ? (def.monthlyCents ?? null)
        : o.monthlyCents;
    const sw: string[] = [];
    for (const l of usage) {
      if (l.freeUsed !== null && l.freeUsed >= 0.8)
        sw.push(
          `${l.label}: ${Math.round(l.freeUsed * 100)}% of the free ${l.freeQty.toLocaleString("en-US")} a month used${l.freeUsed >= 1 ? "; now billed" : ""}.`,
        );
    }
    const renews = o.renews ?? null;
    if (renews && def.kind === "fixed") {
      const days = Math.round(
        (Date.parse(renews) - now.getTime()) / 86_400_000,
      );
      if (days >= 0 && days <= 30)
        sw.push(`Renews in ${days} day${days === 1 ? "" : "s"} (${renews}).`);
      if (days < 0)
        sw.push(
          `The renewal date ${renews} has passed; update it after you've checked the bill.`,
        );
    }
    if (def.kind === "fixed" && monthlyCents === null)
      sw.push("Price not filled in yet: tap Edit and type what it costs.");
    const usageCents = usage.reduce((n, l) => n + l.estCents, 0);
    const perMonthCents =
      def.kind === "fixed"
        ? (monthlyCents ?? 0) / (def.renewEvery === "year" ? 12 : 1)
        : def.kind === "fees"
          ? feesCents
          : usageCents;
    warnings.push(...sw.map((w) => `${def.name}: ${w}`));
    return {
      id: def.id,
      emoji: def.emoji,
      name: def.name,
      what: def.what,
      kind: def.kind,
      monthlyCents,
      renewEvery: def.renewEvery,
      perMonthCents: Math.round(perMonthCents * 100) / 100,
      renews,
      url: def.url,
      account: o.account ?? def.account ?? null,
      notes: o.notes ?? null,
      ifItStops: def.ifItStops,
      tip: def.tip,
      usage,
      warnings: sw,
    };
  });
  const fixedCents = services
    .filter((s) => s.kind === "fixed")
    .reduce((n, s) => n + s.perMonthCents, 0);
  const usageCents = services
    .filter((s) => s.kind === "usage" || s.kind === "free")
    .reduce((n, s) => n + s.perMonthCents, 0);
  const budgetCents = overrides.budgetCents ?? DEFAULT_BUDGET_CENTS;
  const outCents = fixedCents + usageCents + feesCents;
  if (budgetCents > 0 && outCents > budgetCents)
    warnings.unshift(
      `This month is over the ${(budgetCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })} budget.`,
    );
  return {
    month,
    lastMonth,
    asOf: now.toISOString(),
    budgetCents,
    totals: {
      fixedCents: Math.round(fixedCents),
      usageCents: Math.round(usageCents),
      feesCents,
      outCents: Math.round(outCents),
      revenueCents: Math.round(revenue.monthly * 100),
      signedRevenueCents: Math.round(revenue.signed * 100),
    },
    warnings,
    services,
  };
}

/** Daily cron: tell the owner and full access once a month when the budget or a free allowance is crossed. */
export async function costAlerts(
  env: Env,
  settings: AppSettings,
): Promise<string[]> {
  const report = await costsReport(env, settings);
  const key = `costs_alerted.${report.month}`;
  const already = new Set<string>(
    JSON.parse((await getSetting(env, key)) ?? "[]") as string[],
  );
  const fresh = report.warnings.filter(
    (w) =>
      !already.has(w) && !/Renews in|Price not filled|renewal date/.test(w),
  );
  if (!fresh.length) return [];
  await notify(env, {
    kind: "costs",
    actorName: "Costs & usage",
    text: `💵 ${fresh[0]}${fresh.length > 1 ? ` (+${fresh.length - 1} more; see Settings → Costs & usage)` : ""}`,
  });
  await setSetting(env, key, JSON.stringify([...already, ...fresh]));
  return fresh;
}
