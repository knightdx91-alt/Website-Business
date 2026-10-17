import { CADENCE, type NextStep } from "./sales.ts";
import { isListPlan, type AppSettings, type Plan } from "./db.ts";
import type { PricedOrder } from "./checkout.ts";

/**
 * Ease-of-use foundations (Oct 2026): the one thing to do next on a lead, the "Finish & publish" checklist, the Home
 * queue, the Settings health strip and the agreement's "In short" lines. Pure functions over the lead summary, so the
 * web app and the Android app show the same words and the tests can run them without a database.
 */

const DAY = 86_400_000;

/** What the apps do when the row's button is tapped. */
export type StepRoute =
  | "call"
  | "text"
  | "walkin"
  | "pay"
  | "checklist"
  | "publish"
  | "review"
  | "retry"
  | "log"
  | "preview"
  | "wait";

export interface Step {
  /** Stable key for styling / grouping. */
  key:
    | "take_payment"
    | "callback"
    | "opened"
    | "follow_up"
    | "publish"
    | "call"
    | "building"
    | "failed"
    | "live"
    | "closed"
    | "cadence_done";
  /** The headline on the lead page ("Signed, payment not finished"). */
  title: string;
  /** One supporting line; may be empty. */
  detail: string;
  /** The button label ("Take payment"). */
  action: string;
  route: StepRoute;
  /** Queue order: lower comes first. */
  priority: number;
}

/** The lead fields the next step is decided from (a subset of `summary()`). */
export interface StepInput {
  status: string;
  salesStatus: string;
  unpaidSignup?: boolean;
  blockers?: number | null;
  followUp?: string | null;
  previewOpens?: number;
  previewOpenedAt?: number | null;
  shownAt?: number | null;
  lastContact?: number | null;
  liveUrl?: string | null;
  payTest?: boolean;
}

const ROUTE_FOR: Record<NextStep, { route: StepRoute; action: string }> = {
  call: { route: "call", action: "Call" },
  text: { route: "text", action: "Text them" },
  walk_in: { route: "walkin", action: "Walk in" },
  last_text: { route: "text", action: "Send the last text" },
};

function daysAgo(at: number | null | undefined, now: number): string {
  if (!at) return "";
  const d = Math.floor((now - at) / DAY);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
}

/**
 * The follow-up step that is due: the latest cadence step whose day has arrived and that nobody has acted on since
 * (no contact logged after that day began). Null when nothing is due or the cadence is finished.
 */
export function dueCadenceStep(
  shownAt: number | null | undefined,
  lastContact: number | null | undefined,
  now = Date.now(),
): { day: number; next: NextStep; label: string; daysSince: number } | null {
  if (!shownAt) return null;
  const daysSince = Math.floor((now - shownAt) / DAY);
  const due = [...CADENCE].reverse().find((s) => s.day <= daysSince);
  if (!due) return null;
  if ((lastContact ?? 0) >= shownAt + due.day * DAY) return null;
  return { ...due, daysSince };
}

/** The one thing to do next on this lead. `today` is the Cullman date (YYYY-MM-DD) for callback checks. */
export function nextStepFor(
  l: StepInput,
  today: string,
  now = Date.now(),
): Step {
  if (l.status === "failed")
    return {
      key: "failed",
      title: "The preview didn't build",
      detail: "Something went wrong making their website.",
      action: "Try the build again",
      route: "retry",
      priority: 6,
    };
  if (l.status === "queued" || l.status === "building")
    return {
      key: "building",
      title: "Their preview is being built",
      detail: "Usually a few minutes. You can call once it's ready.",
      action: "Check back soon",
      route: "wait",
      priority: 9,
    };
  if (l.salesStatus === "not_interested")
    return {
      key: "closed",
      title: "Not interested",
      detail: "Nothing to do unless they call back.",
      action: "Log a call",
      route: "log",
      priority: 10,
    };
  if (l.salesStatus === "live")
    return {
      key: "live",
      title: "Their website is live",
      detail: l.liveUrl ?? "",
      action: "Ask for a Google review",
      route: "review",
      priority: 8,
    };
  if (l.unpaidSignup)
    return {
      key: "take_payment",
      title: "Signed, payment not finished",
      detail: "They agreed; take the payment to finish the sale.",
      action: "Take payment",
      route: "pay",
      priority: 0,
    };
  if (l.salesStatus === "sold") {
    const n = l.blockers ?? 0;
    return n
      ? {
          key: "publish",
          title: "Finish & publish",
          detail: `${n} thing${n === 1 ? "" : "s"} to fix before the site can go live.`,
          action: "Open the checklist",
          route: "checklist",
          priority: 4,
        }
      : {
          key: "publish",
          title: "Ready to publish",
          detail: "Everything is confirmed. Put the site live.",
          action: "Publish",
          route: "publish",
          priority: 4,
        };
  }
  // New and Shown leads: callbacks first, then a prospect who just looked at the preview, then the cadence.
  if (l.followUp && l.followUp <= today) {
    const overdue = l.followUp < today;
    return {
      key: "callback",
      title: overdue ? "Callback overdue" : "Call back today",
      detail: overdue
        ? `Was due ${l.followUp}.`
        : "You said you'd call them back today.",
      action: "Call",
      route: "call",
      priority: 1,
    };
  }
  if (
    l.previewOpenedAt &&
    now - l.previewOpenedAt < 7 * DAY &&
    l.previewOpenedAt > (l.lastContact ?? 0)
  )
    return {
      key: "opened",
      title: "They opened their preview",
      detail: `Looked at it ${daysAgo(l.previewOpenedAt, now)}${l.previewOpens && l.previewOpens > 1 ? ` (${l.previewOpens} times)` : ""}. Call while it's fresh.`,
      action: "Call",
      route: "call",
      priority: 2,
    };
  if (l.salesStatus === "shown") {
    const due = dueCadenceStep(l.shownAt, l.lastContact, now);
    if (due)
      return {
        key: "follow_up",
        title: `Day ${due.daysSince}: ${due.label}`,
        detail: "They've seen the preview. Keep the conversation going.",
        ...ROUTE_FOR[due.next],
        priority: 3,
      };
    const daysSince = l.shownAt ? Math.floor((now - l.shownAt) / DAY) : 0;
    if (daysSince > CADENCE[CADENCE.length - 1]!.day)
      return {
        key: "cadence_done",
        title: "Follow-ups are done",
        detail: `Shown ${daysSince} days ago with no sale. Mark Not interested, or keep trying if they asked you to.`,
        action: "Log the outcome",
        route: "log",
        priority: 7,
      };
    return {
      key: "follow_up",
      title: "Waiting on them",
      detail: l.followUp
        ? `Next check-in ${l.followUp}.`
        : "Shown; the next follow-up isn't due yet.",
      action: "Log a call",
      route: "log",
      priority: 7,
    };
  }
  return {
    key: "call",
    title: l.lastContact ? "Call again" : "Call and show the preview",
    detail: l.lastContact
      ? `Last tried ${daysAgo(l.lastContact, now)}.`
      : "Nobody has called them yet. Their preview is ready.",
    action: "Call",
    route: "call",
    priority: 5,
  };
}

/* ---------- Finish & publish checklist ---------- */

export interface ChecklistItem {
  /** What's wrong, in the owner's words ("Confirm the team list"). */
  text: string;
  /** The Edit card to open (editform card id; the web editor uses the same ids). */
  card: string;
  kind: "confirm" | "approve" | "photos" | "todo" | "error";
}

/** Edit card for a required to-do, by its title; falls back to the category's own card, else Text. */
export function cardForTodo(title: string, category: string): string {
  const t = title.toLowerCase();
  const byCategory: Record<string, string> = {
    restaurant: "restaurant",
    retail: "retail",
    print: "print",
    auto: "auto",
    finance: "finance",
    church: "church",
    contractor: "contractor",
    landscaping: "landscaping",
    cleaning: "cleaning",
    salon: "salon",
  };
  if (/sample items/.test(t)) return category === "retail" ? "retail" : "pricelist";
  if (/old website/.test(t)) return "confirm";
  if (/counter services|special-order|tow|24\/7/.test(t)) return category === "auto" && /counter|special-order/.test(t) ? "parts" : "auto";
  if (/hours/.test(t)) return "facts";
  if (/customer quotes/.test(t)) return "quotes";
  if (/popular dishes|what you make/.test(t)) return "menu";
  if (/service area|services list|list what you do|ways to work/.test(t)) return "services";
  if (/booking link|facebook|instagram|sell online|upload link|email for artwork/.test(t))
    return category === "print" && /upload|artwork/.test(t) ? "print" : "links";
  if (/hvac|license|service area/.test(t) && category === "contractor") return "contractor";
  if (/adai|permit/.test(t) && category === "landscaping") return "landscaping";
  if (/team list|credentials|license number/.test(t) && category === "salon") return "salon";
  if (/ptin|cpa|brokercheck|disclosure|compliance|medicare|agents|credentials|client portal|what-to-bring/.test(t))
    return "finance";
  if (/service times|describe your church|first-time/.test(t)) return "church";
  return byCategory[category] ?? "text";
}

/**
 * What stands between a sold lead and a live site, one line each with the Edit card that fixes it. Built from the
 * publish gate's blockers (`lint.publishBlockers` + `lint.errors`), so it is always the same list Publish would refuse on.
 */
export function publishChecklist(
  lint: { publishBlockers?: string[]; errors?: string[] } | null | undefined,
  category: string,
): ChecklistItem[] {
  const out: ChecklistItem[] = [];
  for (const b of lint?.publishBlockers ?? []) {
    const todo = /^Owner to-do: (.+)$/.exec(b);
    if (todo) {
      out.push({ text: todo[1]!, card: cardForTodo(todo[1]!, category), kind: "todo" });
      continue;
    }
    const conf = /^Owner hasn't confirmed (\w+)$/.exec(b);
    if (conf) {
      out.push({
        text: `Confirm the ${conf[1]} with the owner`,
        card: "confirm",
        kind: "confirm",
      });
      continue;
    }
    if (/approved the site text/.test(b)) {
      out.push({
        text: "Read the site text with the owner and tick Approved",
        card: "approved",
        kind: "approve",
      });
      continue;
    }
    if (/Google photos/.test(b)) {
      out.push({
        text: "Replace the Google photos with the owner's own (or stock)",
        card: "photo",
        kind: "photos",
      });
      continue;
    }
    out.push({ text: b, card: "text", kind: "todo" });
  }
  for (const e of lint?.errors ?? [])
    out.push({ text: e, card: "text", kind: "error" });
  // Confirmations together, then approval, then photos, then the to-dos: the order the Edit screen runs in.
  const rank: Record<ChecklistItem["kind"], number> = {
    confirm: 0,
    approve: 1,
    photos: 2,
    todo: 3,
    error: 4,
  };
  return out.sort((a, b) => rank[a.kind] - rank[b.kind]);
}

/* ---------- The Home queue ---------- */

export interface QueueRow<T> {
  lead: T;
  step: Step;
}

/**
 * Orders worked leads by what matters most (payment to finish → callbacks → opened previews → follow-ups due → sites
 * to publish → fresh leads) and keeps the list short: every urgent row, but at most `freshCap` untouched new leads
 * (best score first) and nothing that is merely waiting.
 */
export function rankQueue<T extends StepInput & { score?: number }>(
  leads: T[],
  today: string,
  now = Date.now(),
  freshCap = 5,
): { rows: QueueRow<T>[]; counts: Record<string, number> } {
  const rows: QueueRow<T>[] = [];
  const counts: Record<string, number> = {};
  for (const lead of leads) {
    if (lead.payTest) continue;
    const step = nextStepFor(lead, today, now);
    if (step.priority >= 6) continue; // building, failed, waiting, live, closed: not queue work
    counts[step.key] = (counts[step.key] ?? 0) + 1;
    rows.push({ lead, step });
  }
  rows.sort(
    (a, b) =>
      a.step.priority - b.step.priority ||
      (b.lead.score ?? 0) - (a.lead.score ?? 0),
  );
  let fresh = 0;
  return {
    rows: rows.filter((r) => {
      if (r.step.key !== "call") return true;
      return fresh++ < freshCap;
    }),
    counts,
  };
}

/* ---------- Settings health ---------- */

export type HealthState = "ok" | "warn" | "off";

export interface HealthItem {
  id: string;
  label: string;
  state: HealthState;
  /** One line: what works, or what to do. */
  detail: string;
  /** The Settings section (web) / card (Android) that fixes it; null when it's a Worker secret the owner sets with wrangler. */
  section: string | null;
}

export interface HealthInput {
  stripeKey: boolean;
  stripeWebhook: boolean;
  stripePublishableKey: boolean;
  tap: { ready: boolean; why: string | null };
  email: boolean;
  companyEmail: string;
  googleClientId: boolean;
  fcmClient: boolean;
  fcmServer: boolean;
  webPush: boolean;
  braveSearch: boolean;
  reviewLink: boolean;
  companyAddress: boolean;
  plansPriced: number;
  /** Spam protection on the public forms: Turnstile's state (src/worker/spam.ts) and this month's blocked count. */
  spam: { turnstile: "on" | "key" | "secret" | "off"; blocked: number };
  /** Google Analytics for client sites (src/worker/analytics.ts): setup state, the service account to add, the last failure. */
  analytics?: { state: "on" | "account" | "secret" | "off"; serviceEmail: string | null; lastError: string | null; sites: number };
  /** Tasks written straight into Google Calendar (gcal.ts): service account present, its client ID, the last try. */
  calendar?: {
    serviceAccount: boolean;
    clientId: string | null;
    last: { ok: boolean; email: string; error?: string } | null;
    /** Google Tasks (same service account, scope …/auth/tasks). */
    tasks?: { ok: boolean; email: string; error?: string } | null;
  };
}

/** The health strip at the top of Settings: is every outside piece connected, and which ones are optional. */
export function healthItems(h: HealthInput): HealthItem[] {
  return [
    {
      id: "stripe",
      label: "Online payments (Stripe)",
      state: h.stripeKey ? (h.stripeWebhook ? "ok" : "warn") : "off",
      detail: !h.stripeKey
        ? "Not connected: sign-ups record the order and we send an invoice. Set the STRIPE_SECRET_KEY secret."
        : h.stripeWebhook
          ? "Checkout and the webhook are connected."
          : "Checkout works, but Stripe can't tell the app when someone pays (STRIPE_WEBHOOK_SECRET missing).",
      section: null,
    },
    {
      id: "tap",
      label: "Tap to Pay on the phone",
      state: h.tap.ready ? "ok" : "warn",
      detail: h.tap.ready
        ? "Ready: cards can be tapped on an Android phone."
        : (h.tap.why ?? "Not set up yet."),
      section: "Sales",
    },
    {
      id: "card",
      label: "Card entry on the phone",
      state: h.stripePublishableKey ? "ok" : "warn",
      detail: h.stripePublishableKey
        ? "The card sheet works in the Android app."
        : "Paste the Stripe publishable key (Stripe → Developers → API keys, pk_live_…) into Settings → Your business to type a card in on the phone.",
      section: "Your business",
    },
    {
      id: "email",
      label: "Email",
      state: h.email ? (h.companyEmail ? "ok" : "warn") : "off",
      detail: !h.email
        ? "Not connected: receipts, calendar invites and Buy-extras emails aren't sent (RESEND_API_KEY secret)."
        : h.companyEmail
          ? `Sending as ${h.companyEmail}.`
          : "Connected, but no company email is set to send from.",
      section: "Your business",
    },
    {
      id: "google",
      label: "Team sign-in with Google",
      state: h.googleClientId ? "ok" : "off",
      detail: h.googleClientId
        ? "The team can sign in with their company Google account."
        : "Off: everyone signs in with a password.",
      section: "Team sign-in",
    },
    {
      id: "push",
      label: "Phone alerts",
      state:
        h.fcmClient && h.fcmServer
          ? "ok"
          : h.webPush
            ? "warn"
            : "off",
      detail:
        h.fcmClient && h.fcmServer
          ? "Instant alerts reach the Android app and the web app."
          : h.webPush
            ? "Web alerts work; the Android app checks every 15 minutes (Firebase not finished)."
            : "No phone alerts: set up Firebase (Android) or the VAPID key (web).",
      section: "Phone alerts",
    },
    {
      id: "search",
      label: "Web search for hidden websites",
      state: h.braveSearch ? "ok" : "warn",
      detail: h.braveSearch
        ? "Each new lead is checked for a website Google doesn't list."
        : "Off: 'No website' can be wrong (BRAVE_SEARCH_API_KEY secret).",
      section: null,
    },
    {
      id: "review",
      label: "Our Google review link",
      state: h.reviewLink ? "ok" : "warn",
      detail: h.reviewLink
        ? "Clients can be asked for a review."
        : "Add it so the Ask for a review text works.",
      section: "Your business",
    },
    {
      id: "address",
      label: "Business address",
      state: h.companyAddress ? "ok" : "warn",
      detail: h.companyAddress
        ? "On the agreement and the company website."
        : "Needed for Tap to Pay and the agreement.",
      section: "Your business",
    },
    {
      id: "plans",
      label: "Plans & prices",
      state: h.plansPriced >= 1 ? "ok" : "off",
      detail:
        h.plansPriced >= 1
          ? `${h.plansPriced} plan${h.plansPriced === 1 ? "" : "s"} with a price.`
          : "No plan has a price yet; nothing can be sold.",
      section: "Plans & prices",
    },
    {
      id: "spam",
      label: "Spam protection on the website forms",
      state: h.spam.turnstile === "on" ? "ok" : "warn",
      detail: `${
        h.spam.turnstile === "on"
          ? "Turnstile checks every post, on top of the hidden-field, timing and content rules."
          : h.spam.turnstile === "key"
            ? "The site key is saved, but the Worker has no TURNSTILE_SECRET_KEY secret yet, so the widget shows and nothing is checked. Add the secret in Cloudflare → Workers & Pages → website-business → Settings → Variables and Secrets."
            : h.spam.turnstile === "secret"
              ? "The secret is set, but Settings → Website has no site key, so no widget shows and nothing is checked."
              : "The hidden-field, timing and content rules are on. Add Cloudflare Turnstile (free) to stop bots before they post: Turnstile → Add widget, the site key here, the secret key as the Worker secret TURNSTILE_SECRET_KEY."
      }${h.spam.blocked ? ` ${h.spam.blocked} blocked this month (see the Inbox).` : ""}`,
      section: "Website",
    },
    ...(h.analytics
      ? [
          {
            id: "analytics",
            label: "Google Analytics on client sites",
            state: (h.analytics.state === "on" && !h.analytics.lastError && h.analytics.sites > 0 ? "ok" : "warn") as HealthItem["state"],
            detail:
              h.analytics.state === "on"
                ? h.analytics.lastError
                  ? `Connected, but the last setup failed: ${h.analytics.lastError}. Check: (a) Google Cloud (the project of ${h.analytics.serviceEmail ?? "the service account"}) has "Google Analytics Admin API" switched on; (b) Google Analytics → Admin → Account access management lists ${h.analytics.serviceEmail ?? "the service account's email"} as Administrator.`
                  : h.analytics.sites > 0
                    ? `Every published site gets its own Google Analytics property (${h.analytics.sites} so far).`
                    : `Account saved; no site has been set up yet. Before the first publish: (2) In Google Cloud (the project of ${h.analytics.serviceEmail ?? "the service account"}), switch on "Google Analytics Admin API". (3) Google Analytics → Admin → Account access management → add ${h.analytics.serviceEmail ?? "the service account's email"} as Administrator. This turns green after the first site gets its property.`
                : `Not set up yet. (1) analytics.google.com → Admin → Create account "Underground Associates Clients"; copy its Account ID into Settings → Website → "Google Analytics account for client sites". (2) In Google Cloud (the project of ${h.analytics.serviceEmail ?? "the service account"}), switch on "Google Analytics Admin API". (3) Google Analytics → Admin → Account access management → add ${h.analytics.serviceEmail ?? "the service account's email"} as Administrator.${h.analytics.state === "account" ? " Step 1 is the one missing." : h.analytics.state === "secret" ? " The Worker has no service account (GA_SERVICE_ACCOUNT or FCM_SERVICE_ACCOUNT)." : ""}`,
            section: "Website",
          },
        ]
      : []),
    ...(h.calendar
      ? [
          {
            id: "calendar",
            label: "Tasks on Google Calendar",
            state: (h.calendar.last?.ok ? "ok" : "warn") as HealthItem["state"],
            detail: h.calendar.last?.ok
              ? "Tasks go straight onto the team's Google Calendars, nothing to accept."
              : `Tasks reach calendars as emailed invites for now (each person accepts once). To put them straight on everyone's calendar: (1) Google Cloud (the service account's project) → APIs → enable "Google Calendar API". (2) admin.google.com → Security → Access and data control → API controls → Manage domain-wide delegation → Add new: Client ID ${h.calendar.clientId ?? "(the service account's client ID)"}, scope https://www.googleapis.com/auth/calendar.events. Then add or change any dated task.${h.calendar.last?.error ? ` Last try: ${h.calendar.last.error}` : ""}${h.calendar.serviceAccount ? "" : " The Worker has no service account (GA_SERVICE_ACCOUNT or FCM_SERVICE_ACCOUNT)."}`,
            section: "Team sign-in",
          },
          {
            id: "gtasks",
            label: "Tasks in the Google Tasks app",
            state: (h.calendar.tasks?.ok ? "ok" : "warn") as HealthItem["state"],
            detail: h.calendar.tasks?.ok
              ? "Every task shows in the Google Tasks app of the people it's for, and ticking it off there finishes it here."
              : `Not on yet. (1) Google Cloud project 475092517584 → APIs → enable "Google Tasks API". (2) admin.google.com → Security → API controls → Manage domain-wide delegation → edit the entry for Client ID ${h.calendar.clientId ?? "(the service account's)"} and make the scopes https://www.googleapis.com/auth/calendar.events,https://www.googleapis.com/auth/tasks${h.calendar.tasks?.error ? ` Last try: ${h.calendar.tasks.error}` : ""}`,
            section: "Team sign-in",
          },
        ]
      : []),
  ];
}

/* ---------- Agreement: in short ---------- */

const money = (c: number) => `$${(c / 100).toFixed(c % 100 ? 2 : 0)}`;

/** The one-line term for a way to pay ("12-month minimum…"), used by the summary and the sign-up pop-up. */
export function termLine(
  s: Pick<AppSettings, "minMonths" | "shortMonths">,
  plan: Pick<Plan, "id"> | undefined,
  billing: string | undefined,
): string {
  if (plan && isListPlan(plan as Plan))
    return "No minimum term and no early cancellation fee: cancel any time with 30 days' notice.";
  if (billing === "flex")
    return "Month to month: no minimum term; the setup fee is the only one-time charge. Cancel with 30 days' notice.";
  if (billing === "annual")
    return "Paid for the year: it renews yearly unless you cancel before the renewal date (we remind you first).";
  const months = billing === "short" ? (s.shortMonths ?? 6) : (s.minMonths ?? 12);
  if (!months) return "No minimum term: cancel any time with 30 days' notice.";
  return `${months}-month minimum. Leaving early owes the remaining months of that minimum; after it, cancel any time with 30 days' notice.`;
}

/** The lines that don't depend on the order. */
export function summaryTail(
  s: Pick<AppSettings, "companyPhone">,
): string[] {
  return [
    "Your site goes live within 3 business days after you approve the final details.",
    "Your name, logo, photos, text and domain stay yours. Our templates and code stay ours; we may show your site in our portfolio.",
    `Late payments carry a fee and the site can go offline until you're caught up. Questions any time${s.companyPhone ? `: ${s.companyPhone}` : ""}.`,
  ];
}

/**
 * Five plain lines at the top of every sign-up agreement, built from the order itself: what they pay and when, the
 * term, when the site goes live, what they own, and how to cancel. The full text follows; these lines never add terms,
 * they restate the ones below.
 */
export function contractSummary(
  s: Pick<AppSettings, "minMonths" | "shortMonths" | "companyPhone">,
  order: PricedOrder,
  kind: "signup" | "extras",
): string[] {
  if (kind === "extras")
    return [
      `You're adding extras to your existing plan. ${order.invoice ? `They go on your next invoice: ${money(order.dueToday)}.` : `Today: ${money(order.dueToday)}${order.renews ? `, then ${money(order.renews.amount)} a ${order.renews.interval}` : ""}.`}`,
      "Each extra's own terms are below. Your website agreement doesn't change.",
    ];
  const out: string[] = [];
  const plan = order.plan;
  if (plan) {
    const line = order.renews
      ? `${plan.name} plan: ${money(order.renews.amount)} a ${order.renews.interval}${order.invoice ? ", invoiced" : ", charged to the card or bank account you give us"}.`
      : `${plan.name} plan: ${money(order.dueToday)}.`;
    out.push(
      `${order.invoice ? "On your first invoice" : "Today"}: ${money(order.dueToday)}. ${line}`,
      termLine(s, plan, order.invoice ? "standard" : order.option?.id),
    );
  }
  out.push(...summaryTail(s));
  return out;
}

/* ---------- Funnel ---------- */

export interface FunnelStage {
  id: "new" | "shown" | "signed" | "paid" | "live";
  label: string;
  count: number;
  /** Share of the previous stage that got here (null for the first stage). */
  rate: number | null;
  /** Median days from the previous stage, for the leads that made it (null when none did). */
  medianDays: number | null;
}

export interface FunnelLead {
  created_at: number;
  shown_at: number | null;
  signed_at: number | null;
  paid_at: number | null;
  published_at: number | null;
  sales_status: string;
}

export function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** new → shown → signed → paid → live, counting every lead that ever reached a stage, with the median days per step. */
export function funnel(leads: FunnelLead[]): FunnelStage[] {
  const reachedShown = (l: FunnelLead) =>
    l.shown_at != null ||
    l.signed_at != null ||
    ["shown", "sold", "live"].includes(l.sales_status);
  const shownAt = (l: FunnelLead) => l.shown_at ?? l.signed_at ?? l.created_at;
  const stages: Array<{
    id: FunnelStage["id"];
    label: string;
    has: (l: FunnelLead) => boolean;
    at: (l: FunnelLead) => number | null;
  }> = [
    { id: "new", label: "Leads", has: () => true, at: (l) => l.created_at },
    { id: "shown", label: "Shown the preview", has: reachedShown, at: shownAt },
    { id: "signed", label: "Signed", has: (l) => l.signed_at != null, at: (l) => l.signed_at },
    { id: "paid", label: "Paid", has: (l) => l.paid_at != null, at: (l) => l.paid_at },
    { id: "live", label: "Site live", has: (l) => l.published_at != null || l.sales_status === "live", at: (l) => l.published_at },
  ];
  const out: FunnelStage[] = [];
  let prev: (typeof stages)[number] | null = null;
  let prevCount = 0;
  for (const st of stages) {
    const got = leads.filter(st.has);
    const days: number[] = [];
    if (prev) {
      for (const l of got) {
        const a = prev.at(l);
        const b = st.at(l);
        if (a != null && b != null && b >= a) days.push((b - a) / DAY);
      }
    }
    const m = median(days);
    out.push({
      id: st.id,
      label: st.label,
      count: got.length,
      rate: prev ? (prevCount ? Math.round((got.length / prevCount) * 100) / 100 : 0) : null,
      medianDays: m == null ? null : Math.round(m * 10) / 10,
    });
    prev = st;
    prevCount = got.length;
  }
  return out;
}

/* ---------- Alert preferences ---------- */

export type AlertMode = "all" | "mine" | "important";

export const ALERT_MODES: Array<{ id: AlertMode; label: string; about: string }> = [
  { id: "all", label: "Everything", about: "Every change anyone makes on any lead." },
  { id: "mine", label: "My leads", about: "Only leads you've called, visited or signed up, plus sign-ups, payments, messages and tasks." },
  { id: "important", label: "Important only", about: "Sign-ups, payments, published sites, opened previews, messages and tasks. No notes or call logs." },
];

/** Kinds that always get through on "Important only" (and on "My leads" for leads that aren't yours). */
export const IMPORTANT_KINDS = [
  "signed",
  "paid",
  "published",
  "preview_open",
  "message",
  "task",
  "problem",
  "costs",
] as const;

/** Settings key holding a person's alert mode. */
export function alertPrefKey(userId: string): string {
  return `notif_prefs.${userId}`;
}

export function parseAlertMode(raw: string | null | undefined): AlertMode {
  try {
    const v = raw ? (JSON.parse(raw) as { mode?: string }).mode : null;
    return v === "mine" || v === "important" ? v : "all";
  } catch {
    return "all";
  }
}

/* ---------- Start here ---------- */

/** The three lessons a new teammate does first, then the practice run on the Payment test lead. */
export const START_LESSONS = [
  "what-we-sell",
  "before-you-call",
  "showing-the-preview",
] as const;
export const START_PRACTICE = "full-run";
