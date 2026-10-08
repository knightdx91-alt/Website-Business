import { localDate, type Env } from "./env.ts";

const COLUMN: Record<string, string> = { view: "views", call: "calls", directions: "directions", text: "texts" };
const BOT = /bot|crawl|spider|slurp|preview|lighthouse|headless|monitor|curl|wget|python/i;

/** Beacon from a live client site (cookie-free): counts a page view or a tap on call/directions/text. */
export async function recordHit(env: Env, req: Request, leadId: string, event: string | null): Promise<Response> {
  const done = new Response(null, { status: 204, headers: { "access-control-allow-origin": "*" } });
  const col = event ? COLUMN[event] : undefined;
  if (!col || BOT.test(req.headers.get("user-agent") ?? "")) return done;
  const lead = await env.DB.prepare("SELECT live_url, custom_domain FROM leads WHERE id = ?").bind(leadId).first<{ live_url: string | null; custom_domain: string | null }>();
  if (!lead?.live_url) return done;
  // Only count hits sent from the client's own site.
  const origin = req.headers.get("origin");
  const allowed = [new URL(lead.live_url).host, lead.custom_domain, lead.custom_domain ? `www.${lead.custom_domain.replace(/^www\./, "")}` : null];
  let host = "";
  try {
    host = origin ? new URL(origin).host : "";
  } catch {
    /* ignore */
  }
  if (!host || !(allowed.includes(host) || host.endsWith(`.${new URL(lead.live_url).host}`))) return done;
  await env.DB.prepare(`INSERT INTO site_stats (lead_id, day, ${col}) VALUES (?, ?, 1) ON CONFLICT(lead_id, day) DO UPDATE SET ${col} = ${col} + 1`)
    .bind(leadId, localDate())
    .run();
  return done;
}

export interface Totals {
  views: number;
  calls: number;
  directions: number;
  texts: number;
  requests: number;
}

async function totals(env: Env, leadId: string, fromDay: string, toDay: string): Promise<Totals> {
  const s = await env.DB.prepare(
    "SELECT COALESCE(SUM(views),0) AS views, COALESCE(SUM(calls),0) AS calls, COALESCE(SUM(directions),0) AS directions, COALESCE(SUM(texts),0) AS texts FROM site_stats WHERE lead_id = ? AND day >= ? AND day <= ?",
  )
    .bind(leadId, fromDay, toDay)
    .first<Omit<Totals, "requests">>();
  const from = Date.parse(`${fromDay}T00:00:00-06:00`);
  const to = Date.parse(`${toDay}T23:59:59-06:00`);
  const f = await env.DB.prepare("SELECT COUNT(*) AS n FROM submissions WHERE lead_id = ? AND created_at >= ? AND created_at <= ?").bind(leadId, from, to).first<{ n: number }>();
  return { views: 0, calls: 0, directions: 0, texts: 0, ...s, requests: f?.n ?? 0 };
}

function monthBounds(ym: string): [string, string] {
  const [y, m] = ym.split("-").map(Number) as [number, number];
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return [`${ym}-01`, `${ym}-${String(last).padStart(2, "0")}`];
}

/** This month so far, last month, and the last 30 days, in Cullman time. */
export async function siteReport(env: Env, leadId: string) {
  const today = localDate();
  const thisMonth = today.slice(0, 7);
  const [y, m] = thisMonth.split("-").map(Number) as [number, number];
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  const [pFrom, pTo] = monthBounds(prev);
  return {
    thisMonth: { label: thisMonth, ...(await totals(env, leadId, `${thisMonth}-01`, today)) },
    lastMonth: { label: prev, ...(await totals(env, leadId, pFrom, pTo)) },
    last30: await totals(env, leadId, localDate(-29), today),
  };
}
