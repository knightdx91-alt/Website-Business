import { shareToken } from "./auth.ts";
import { getSetting, setSetting } from "./db.ts";
import { now, type Env } from "./env.ts";
import { notify } from "./notify.ts";
import { APP_ORIGIN } from "./tankboard.ts";

/**
 * Flyer codes (Oct 2026): every lead can get a random 5-digit code that the team writes in the blank box on a mailed or
 * left-behind flyer. The business types it at undergroundassociates.com/code and lands on its own sample site; the team is
 * alerted at once. Codes are random (not sequential) and wrong guesses are capped per address, so nobody can walk through
 * other businesses' previews.
 */

export const CODE_RE = /^\d{5}$/;
const WRONG_MAX = 12;
const WINDOW_MS = 3_600_000;

function randomCode(): string {
  const n = new Uint32Array(1);
  crypto.getRandomValues(n);
  return String(10000 + (n[0]! % 90000));
}

/**
 * The lead's flyer code, made on first use. Every ready lead gets one automatically (`backfillMailCodes`, minute cron), so the
 * code is on the lead page whenever someone needs to write it down. `handedOut` (the mail list export, a logged "Left a
 * flyer") stamps `mail_code_at`, which keeps the preview from expiring inside the 90-day Google window.
 */
export async function assignMailCode(env: Env, leadId: string, o: { handedOut?: boolean } = {}): Promise<string | null> {
  const row = await env.DB.prepare("SELECT mail_code FROM leads WHERE id = ?").bind(leadId).first<{ mail_code: string | null }>();
  if (!row) return null;
  if (row.mail_code) {
    if (o.handedOut) await markHandedOut(env, leadId);
    return row.mail_code;
  }
  for (let i = 0; i < 20; i++) {
    const code = randomCode();
    try {
      const r = await env.DB.prepare("UPDATE leads SET mail_code = ?, mail_code_at = ? WHERE id = ? AND mail_code IS NULL")
        .bind(code, o.handedOut ? now() : null, leadId)
        .run();
      if (r.meta.changes) return code;
      const again = await env.DB.prepare("SELECT mail_code FROM leads WHERE id = ?").bind(leadId).first<{ mail_code: string | null }>();
      if (again?.mail_code) return again.mail_code;
    } catch {
      /* the unique index refused a code another lead already has: try another */
    }
  }
  throw new Error("Couldn't find a free flyer code");
}

/** The code went out on a flyer: keep the preview around for it. */
export async function markHandedOut(env: Env, leadId: string): Promise<void> {
  await env.DB.prepare("UPDATE leads SET mail_code_at = ? WHERE id = ? AND mail_code IS NOT NULL").bind(now(), leadId).run();
}

/** Gives every ready lead without a code one (minute cron, a batch at a time). */
export async function backfillMailCodes(env: Env, max = 50): Promise<number> {
  const rows = await env.DB.prepare("SELECT id FROM leads WHERE status = 'ready' AND mail_code IS NULL AND place_id != 'paytest' LIMIT ?")
    .bind(max)
    .all<{ id: string }>();
  for (const r of rows.results) await assignMailCode(env, r.id);
  return rows.results.length;
}

function ipKey(ip: string): string {
  return `code_ip:${ip.replace(/[^0-9a-f.:]/gi, "").slice(0, 45) || "unknown"}`;
}

async function wrongCount(env: Env, ip: string, at: number): Promise<{ count: number; since: number } | null> {
  const raw = await getSetting(env, ipKey(ip));
  if (!raw) return null;
  const c = JSON.parse(raw) as { count: number; since: number };
  return at - c.since > WINDOW_MS ? null : c;
}

export type CodeResult =
  | { kind: "open"; url: string; name: string }
  | { kind: "wrong" }
  | { kind: "gone"; name: string }
  | { kind: "locked" };

/** Checks a typed code. A match counts the visit, tells the team and returns a fresh 14-day share link to the sample. */
export async function useCode(env: Env, code: string, ip: string, at = now()): Promise<CodeResult> {
  const prev = await wrongCount(env, ip, at);
  if (prev && prev.count >= WRONG_MAX) return { kind: "locked" };
  const lead = CODE_RE.test(code)
    ? await env.DB.prepare("SELECT id, name, status, mail_opened_at FROM leads WHERE mail_code = ?")
        .bind(code)
        .first<{ id: string; name: string | null; status: string; mail_opened_at: number | null }>()
    : null;
  if (!lead) {
    await setSetting(env, ipKey(ip), JSON.stringify(prev ? { count: prev.count + 1, since: prev.since } : { count: 1, since: at }));
    return { kind: "wrong" };
  }
  const name = lead.name ?? "your business";
  if (lead.status !== "ready") return { kind: "gone", name };
  await env.DB.prepare("UPDATE leads SET mail_opens = mail_opens + 1, mail_opened_at = ? WHERE id = ?").bind(at, lead.id).run();
  // One alert per half hour, so a refresh or a second family member doesn't buzz every phone again.
  if (!lead.mail_opened_at || at - lead.mail_opened_at > 30 * 60_000) {
    await notify(env, {
      kind: "preview_open",
      leadId: lead.id,
      text: `📬 ${name} typed in their flyer code and is looking at their sample site. Good time to call.`,
    });
  }
  return { kind: "open", name, url: `${APP_ORIGIN}/s/${await shareToken(env, lead.id)}/` };
}

/** Drops wrong-guess counters whose hour has passed (daily cron). */
export async function pruneCodeCounters(env: Env, at = now()): Promise<void> {
  await env.DB.prepare("DELETE FROM settings WHERE key LIKE 'code_ip:%' AND COALESCE(json_extract(value, '$.since'), 0) < ?")
    .bind(at - WINDOW_MS)
    .run();
}

export interface MailRow {
  id: string;
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  code: string;
  category: string;
  status: string;
}

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export function mailCsv(rows: MailRow[]): string {
  const head = ["Business", "Street", "City", "State", "ZIP", "Flyer code", "Kind", "Status"];
  return [head, ...rows.map((r) => [r.name, r.street, r.city, r.state, r.zip, r.code, r.category, r.status])]
    .map((r) => r.map((c) => csvCell(c ?? "")).join(","))
    .join("\r\n") + "\r\n";
}

/**
 * The mail list: the best open leads that have a street address and a ready preview (never ones already mailed unless
 * asked), each given its flyer code. Highest score first.
 */
export async function mailList(env: Env, o: { limit: number; includeMailed?: boolean }): Promise<MailRow[]> {
  const rows = await env.DB.prepare(
    `SELECT id, name, category, sales_status, record_json, mail_code FROM leads
     WHERE status = 'ready' AND sales_status IN ('new', 'shown') AND place_id != 'paytest'
       ${o.includeMailed ? "" : "AND mail_code IS NULL"}
     ORDER BY score DESC LIMIT ?`,
  )
    .bind(Math.max(1, Math.min(500, o.limit * 2)))
    .all<{ id: string; name: string | null; category: string; sales_status: string; record_json: string | null; mail_code: string | null }>();
  const out: MailRow[] = [];
  for (const r of rows.results) {
    if (out.length >= o.limit) break;
    const rec = r.record_json ? (JSON.parse(r.record_json) as { address?: { street?: string; city?: string; state?: string; zip?: string }; showStreetAddress?: boolean }) : null;
    const a = rec?.address;
    if (!a?.street || !a.city) continue; // service-area businesses with no street can't be mailed
    const code = await assignMailCode(env, r.id, { handedOut: true });
    if (!code) continue;
    out.push({ id: r.id, name: r.name ?? "", street: a.street, city: a.city, state: a.state ?? "AL", zip: a.zip ?? "", code, category: r.category, status: r.sales_status });
  }
  return out;
}
