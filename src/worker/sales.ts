import { getSettings, type Plan } from "./db.ts";
import { localDate, type Env } from "./env.ts";

/** Start of a Cullman calendar day as a timestamp (CST/CDT handled by trying both offsets). */
function startOf(day: string): number {
  for (const off of ["-05:00", "-06:00"]) {
    const t = Date.parse(`${day}T00:00:00${off}`);
    if (localDate(0, t) === day && localDate(0, t - 3_600_000) !== day) return t;
  }
  return Date.parse(`${day}T00:00:00-06:00`);
}

const CALL_OUTCOMES = ["no_answer", "callback", "shown", "sold", "not_interested"];

interface Row {
  person: string;
  calls: number;
  reached: number;
  interested: number;
  sold: number;
}

/** Calls and sales per person for this week and this month, plus recurring revenue. */
export async function salesDashboard(env: Env) {
  const settings = await getSettings(env);
  const today = localDate();
  const weekday = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
  const periods = {
    week: startOf(localDate(-weekday)),
    month: startOf(`${today.slice(0, 7)}-01`),
  };

  const notes = await env.DB.prepare(
    `SELECT lead_id, author, outcome, created_at FROM lead_notes WHERE created_at >= ? AND outcome IN (${CALL_OUTCOMES.map(() => "?").join(",")})`,
  )
    .bind(Math.min(periods.week, periods.month), ...CALL_OUTCOMES)
    .all<{ lead_id: string; author: string; outcome: string; created_at: number }>();

  // Who gets credit for a sale: whoever sent the sign-up link, else whoever logged "Sold".
  const sales = await env.DB.prepare(
    `SELECT l.id, l.name, l.sales_status,
       (SELECT s.sent_by FROM signups s WHERE s.lead_id = l.id ORDER BY s.created_at DESC LIMIT 1) AS sent_by,
       (SELECT s.created_at FROM signups s WHERE s.lead_id = l.id ORDER BY s.created_at DESC LIMIT 1) AS signed_at,
       (SELECT s.plan_json FROM signups s WHERE s.lead_id = l.id ORDER BY s.created_at DESC LIMIT 1) AS plan_json,
       (SELECT s.paid FROM signups s WHERE s.lead_id = l.id ORDER BY s.created_at DESC LIMIT 1) AS paid,
       (SELECT n.author FROM lead_notes n WHERE n.lead_id = l.id AND n.outcome = 'sold' ORDER BY n.created_at DESC LIMIT 1) AS sold_by,
       (SELECT n.created_at FROM lead_notes n WHERE n.lead_id = l.id AND n.outcome = 'sold' ORDER BY n.created_at DESC LIMIT 1) AS sold_at
     FROM leads l WHERE l.sales_status IN ('sold', 'live')`,
  ).all<{ id: string; name: string; sales_status: string; sent_by: string | null; signed_at: number | null; plan_json: string | null; paid: number | null; sold_by: string | null; sold_at: number | null }>();

  const table = (since: number): Row[] => {
    const by = new Map<string, Row>();
    const row = (p: string) => by.get(p) ?? (by.set(p, { person: p, calls: 0, reached: 0, interested: 0, sold: 0 }), by.get(p)!);
    for (const n of notes.results) {
      if (n.created_at < since) continue;
      const r = row(n.author);
      r.calls++;
      if (n.outcome !== "no_answer") r.reached++;
      if (n.outcome === "callback" || n.outcome === "shown") r.interested++;
    }
    for (const s of sales.results) {
      const at = s.signed_at ?? s.sold_at;
      if (!at || at < since) continue;
      row(s.sent_by ?? s.sold_by ?? "Owner").sold++;
    }
    return [...by.values()].sort((a, b) => b.sold - a.sold || b.calls - a.calls);
  };

  const clients = sales.results.map((s) => {
    const plan = s.plan_json ? (JSON.parse(s.plan_json) as Plan & { monthlyEquivalent?: number; billingLabel?: string }) : null;
    return { id: s.id, name: s.name, status: s.sales_status, plan: plan ? [plan.name, plan.billingLabel].filter(Boolean).join(", ") : null, monthly: plan?.monthlyEquivalent ?? plan?.monthly ?? 0, paid: !!s.paid, seller: s.sent_by ?? s.sold_by ?? null };
  });
  const commission = settings.commission ?? 0;
  // Full-access team members aren't paid commission; callers are.
  const admins = new Set((await env.DB.prepare("SELECT name FROM users WHERE admin = 1").all<{ name: string }>()).results.map((u) => u.name));
  const month = table(periods.month);
  return {
    week: table(periods.week),
    month,
    commission,
    commissionOwed: month.filter((r) => r.person !== "Owner" && !admins.has(r.person)).map((r) => ({ person: r.person, sales: r.sold, amount: r.sold * commission })),
    clients,
    monthlyRevenue: clients.filter((c) => c.paid).reduce((sum, c) => sum + c.monthly, 0),
    signedRevenue: clients.reduce((sum, c) => sum + c.monthly, 0),
  };
}
