import { newId, now, type Env } from "./env.ts";
import type { Session } from "./auth.ts";
import { getSetting, getSettings, setSetting } from "./db.ts";
import { fcmSend } from "./fcm.ts";
import {
  IMPORTANT_KINDS,
  alertPrefKey,
  parseAlertMode,
  type AlertMode,
} from "./queue.ts";

/**
 * Notifications: what other people did (notes, call outcomes, sales, sign-ups, publishes, website messages).
 * Everyone with full access (the owner and full-access team members) sees everything except their own actions.
 * Callers get everything that happens on a lead (CALLER_KINDS: notes, calls, status and callback changes, sign-ups,
 * payments, publishes, preview opens, tasks); only website messages and search runs stay with full access.
 * Phone pushes carry no data: the push just wakes the app's service worker, which asks /api/notifications/latest
 * what's new while logged in. That keeps details off the push service and needs no payload encryption.
 */

export type EventKind =
  | "note"
  | "call"
  | "status"
  | "signup_sent"
  | "signed"
  | "paid"
  | "published"
  | "added"
  | "message"
  | "run"
  | "preview_open"
  | "task"
  | "costs"
  | "problem"
  | "clock";

/** The notifications callers get: anything added or changed on a lead, plus tasks. Not website messages or search runs. */
export const CALLER_KINDS: EventKind[] = [
  "note",
  "call",
  "status",
  "signup_sent",
  "signed",
  "paid",
  "published",
  "added",
  "preview_open",
  "task",
];
const callerFilter = `AND kind IN (${CALLER_KINDS.map((k) => `'${k}'`).join(",")})`;

export interface EventInput {
  kind: EventKind;
  text: string;
  leadId?: string | null;
  /** Who did it; null for customers (sign-ups, website forms). */
  actor?: Pick<Session, "userId" | "name"> | null;
  actorName?: string;
  /** People this is for (task assignees): they always see it and get the phone notification, whatever their alert mode. */
  forIds?: string[];
}

interface EventRow {
  id: string;
  created_at: number;
  actor_id: string | null;
  actor_name: string | null;
  kind: EventKind;
  lead_id: string | null;
  text: string;
}

/** Records the event and pings everyone else's phones. Never throws: a failed notification mustn't break the action. */
export async function notify(env: Env, e: EventInput): Promise<void> {
  try {
    await env.DB.prepare(
      "INSERT INTO events (id, created_at, actor_id, actor_name, kind, lead_id, text, for_ids) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(
        newId(),
        now(),
        e.actor?.userId ?? null,
        e.actor?.name ?? e.actorName ?? null,
        e.kind,
        e.leadId ?? null,
        e.text.slice(0, 500),
        e.forIds?.length ? e.forIds.join(",") : null,
      )
      .run();
    await pushAll(env, e.actor?.userId ?? null, e.kind, e.leadId ?? null, e.forIds ?? []);
    // Android phones: an instant "something's new" ping; each phone fetches its own filtered list.
    await fcmSend(env, { kind: "alerts" });
  } catch (err) {
    console.error("notify failed", err);
  }
}

/** People who get this kind of notification: the owner and full-access team members, plus callers for CALLER_KINDS. */
async function recipients(env: Env, kind: EventKind): Promise<string[]> {
  const sql = CALLER_KINDS.includes(kind)
    ? "SELECT id FROM users WHERE disabled = 0"
    : "SELECT id FROM users WHERE admin = 1 AND disabled = 0";
  const team = await env.DB.prepare(sql).all<{ id: string }>();
  return ["owner", ...team.results.map((u) => u.id)];
}

/* ---------- Alert preferences (Oct 2026) ---------- */

/** A person's alert mode: everything (default), only their own leads, or important kinds only. */
export async function getAlertMode(env: Env, userId: string): Promise<AlertMode> {
  return parseAlertMode(await getSetting(env, alertPrefKey(userId)));
}

export async function setAlertMode(env: Env, userId: string, mode: AlertMode): Promise<void> {
  await setSetting(env, alertPrefKey(userId), JSON.stringify({ mode }));
}

const importantList = IMPORTANT_KINDS.map((k) => `'${k}'`).join(",");

/**
 * The SQL that applies a mode to the events table (alias `e`), plus its binds. "mine" = events on leads this person
 * has logged a call or visit on, sent a sign-up link for, or that someone opened a preview of after they worked it,
 * plus the important kinds everywhere; "important" = the important kinds only.
 */
function modeFilter(mode: AlertMode, userName: string): { sql: string; binds: unknown[] } {
  if (mode === "important") return { sql: `AND e.kind IN (${importantList})`, binds: [] };
  if (mode === "mine")
    return {
      sql: `AND (e.kind IN (${importantList}) OR e.lead_id IS NULL OR EXISTS (SELECT 1 FROM lead_notes n WHERE n.lead_id = e.lead_id AND n.author = ?) OR EXISTS (SELECT 1 FROM signups s WHERE s.lead_id = e.lead_id AND s.sent_by = ?))`,
      binds: [userName, userName],
    };
  return { sql: "", binds: [] };
}

async function userName(env: Env, userId: string): Promise<string> {
  if (userId === "owner") return (await getSettings(env)).callerName || "Owner";
  const row = await env.DB.prepare("SELECT name FROM users WHERE id = ?")
    .bind(userId)
    .first<{ name: string }>();
  return row?.name ?? "";
}

/** The person's filter, ready to splice into a query on `events e`. */
async function prefFilter(env: Env, userId: string): Promise<{ sql: string; binds: unknown[] }> {
  const mode = await getAlertMode(env, userId);
  if (mode === "all") return { sql: "", binds: [] };
  const f = modeFilter(mode, mode === "mine" ? await userName(env, userId) : "");
  // Anything addressed to this person (a task for them) shows whatever the mode.
  return {
    sql: `AND (instr(',' || coalesce(e.for_ids, '') || ',', ?) > 0 OR (1 ${f.sql}))`,
    binds: [`,${userId},`, ...f.binds],
  };
}

export async function listEvents(
  env: Env,
  userId: string,
  limit = 100,
  caller = false,
) {
  const seen = await env.DB.prepare(
    "SELECT seen_at FROM notif_seen WHERE user_id = ?",
  )
    .bind(userId)
    .first<{ seen_at: number }>();
  const pref = await prefFilter(env, userId);
  const rows = await env.DB.prepare(
    `SELECT e.*, l.name AS lead_name FROM events e LEFT JOIN leads l ON l.id = e.lead_id WHERE (e.actor_id IS NULL OR e.actor_id != ?) ${caller ? callerFilter.replace("kind", "e.kind") : ""} ${pref.sql} ORDER BY e.created_at DESC LIMIT ?`,
  )
    .bind(userId, ...pref.binds, limit)
    .all<EventRow & { lead_name: string | null }>();
  const seenAt = seen?.seen_at ?? 0;
  return {
    seenAt,
    unread: rows.results.filter((r) => r.created_at > seenAt).length,
    items: rows.results.map((r) => ({
      id: r.id,
      at: r.created_at,
      kind: r.kind,
      text: r.text,
      who: r.actor_name,
      leadId: r.lead_id,
      leadName: r.lead_name,
      unread: r.created_at > seenAt,
    })),
  };
}

export async function unreadCount(
  env: Env,
  userId: string,
  caller = false,
): Promise<number> {
  const seen = await env.DB.prepare(
    "SELECT seen_at FROM notif_seen WHERE user_id = ?",
  )
    .bind(userId)
    .first<{ seen_at: number }>();
  const pref = await prefFilter(env, userId);
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM events e WHERE e.created_at > ? AND (e.actor_id IS NULL OR e.actor_id != ?) ${caller ? callerFilter.replace("kind", "e.kind") : ""} ${pref.sql}`,
  )
    .bind(seen?.seen_at ?? 0, userId, ...pref.binds)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function markSeen(env: Env, userId: string): Promise<void> {
  await env.DB.prepare(
    "INSERT INTO notif_seen (user_id, seen_at) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET seen_at = excluded.seen_at",
  )
    .bind(userId, now())
    .run();
}

const PUSH_TITLE: Record<EventKind, string> = {
  note: "📝 New note",
  call: "📞 Call update",
  status: "🏷️ Lead updated",
  signup_sent: "📨 Sign-up link sent",
  signed: "✍️ New sign-up!",
  paid: "💵 Payment",
  published: "🚀 Site published",
  added: "➕ Lead added",
  message: "💬 New message",
  run: "🔎 Search started",
  preview_open: "👀 Preview opened",
  task: "📝 Task",
  costs: "💵 Costs & usage",
  problem: "🐞 Problem reported",
  clock: "⏱ Time clock",
};

/** What a phone shows when a push arrives: the newest unread item, or a count when there are several. */
export async function latestForPush(env: Env, userId: string, caller = false) {
  const test = Number((await getSetting(env, `push_test_${userId}`)) ?? 0);
  if (test && Date.now() - test < 120_000) {
    await setSetting(env, `push_test_${userId}`, "0");
    return {
      title: "Underground Associates",
      body: "Test notification: you're all set. You'll get one whenever someone else adds or changes something on a lead.",
      url: "/#/notifications",
      unread: 0,
    };
  }
  const { items, unread } = await listEvents(env, userId, 5, caller);
  const top = items.find((i) => i.unread) ?? items[0];
  if (!top)
    return {
      title: "Underground Associates",
      body: "Nothing new.",
      url: "/#/notifications",
      unread: 0,
    };
  return {
    title:
      unread > 1
        ? `${unread} new updates`
        : (PUSH_TITLE[top.kind] ?? "Underground Associates"),
    body: top.text,
    url: top.leadId ? `/#/lead/${top.leadId}` : "/#/notifications",
    unread,
  };
}

/** Drops recipients whose alert mode doesn't want this event (important-only, or "my leads" for someone else's lead). */
async function wantsPush(
  env: Env,
  ids: string[],
  kind: EventKind,
  leadId: string | null,
): Promise<string[]> {
  if ((IMPORTANT_KINDS as readonly string[]).includes(kind)) return ids;
  const prefs = await env.DB.prepare(
    "SELECT key, value FROM settings WHERE key LIKE 'notif_prefs.%'",
  ).all<{ key: string; value: string }>();
  const modes = new Map(
    prefs.results.map((r) => [r.key.slice("notif_prefs.".length), parseAlertMode(r.value)]),
  );
  const out: string[] = [];
  for (const id of ids) {
    const mode = modes.get(id) ?? "all";
    if (mode === "all") {
      out.push(id);
      continue;
    }
    if (mode === "important") continue;
    if (!leadId) {
      out.push(id);
      continue;
    }
    const name = await userName(env, id);
    const mine = await env.DB.prepare(
      "SELECT 1 AS x FROM lead_notes WHERE lead_id = ? AND author = ? UNION SELECT 1 FROM signups WHERE lead_id = ? AND sent_by = ? LIMIT 1",
    )
      .bind(leadId, name, leadId, name)
      .first();
    if (mine) out.push(id);
  }
  return out;
}

/* ---------- Web Push (VAPID, no payload) ---------- */

const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf as ArrayBuffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
const fromB64url = (s: string) =>
  Uint8Array.from(
    atob(
      s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4),
    ),
    (c) => c.charCodeAt(0),
  );

/** The public key phones subscribe with (uncompressed P-256 point), or null when push isn't set up. */
export function vapidPublicKey(env: Env): string | null {
  if (!env.VAPID_PRIVATE_JWK) return null;
  const jwk = JSON.parse(env.VAPID_PRIVATE_JWK) as JsonWebKey;
  const x = fromB64url(jwk.x!);
  const y = fromB64url(jwk.y!);
  const out = new Uint8Array(65);
  out[0] = 4;
  out.set(x, 1);
  out.set(y, 33);
  return b64url(out);
}

export async function vapidAuth(env: Env, endpoint: string): Promise<string> {
  const jwk = JSON.parse(env.VAPID_PRIVATE_JWK!) as JsonWebKey;
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const enc = new TextEncoder();
  const header = b64url(
    enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })),
  );
  const claims = b64url(
    enc.encode(
      JSON.stringify({
        aud: new URL(endpoint).origin,
        exp: Math.floor(Date.now() / 1000) + 12 * 3600,
        sub: "mailto:post@undergroundassociates.com",
      }),
    ),
  );
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    enc.encode(`${header}.${claims}`),
  );
  return `vapid t=${header}.${claims}.${b64url(sig)}, k=${vapidPublicKey(env)}`;
}

/** Push services we accept subscriptions for (Chrome/Android uses FCM). */
export function allowedEndpoint(endpoint: string): boolean {
  try {
    const u = new URL(endpoint);
    return (
      u.protocol === "https:" &&
      /(^|\.)(googleapis\.com|mozilla\.com|windows\.com|push\.apple\.com)$/.test(
        u.hostname,
      )
    );
  } catch {
    return false;
  }
}

export async function pushTo(env: Env, endpoints: string[]): Promise<number> {
  if (!env.VAPID_PRIVATE_JWK || !endpoints.length) return 0;
  let sent = 0;
  await Promise.allSettled(
    endpoints.map(async (endpoint) => {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: await vapidAuth(env, endpoint),
          TTL: "86400",
          Urgency: "high",
          "Content-Length": "0",
        },
        signal: AbortSignal.timeout(5000),
      });
      if (res.status === 404 || res.status === 410)
        await env.DB.prepare("DELETE FROM push_subs WHERE endpoint = ?")
          .bind(endpoint)
          .run();
      else if (res.ok) sent++;
    }),
  );
  return sent;
}

async function pushAll(
  env: Env,
  exceptUserId: string | null,
  kind: EventKind,
  leadId: string | null,
  forIds: string[] = [],
): Promise<void> {
  if (!env.VAPID_PRIVATE_JWK) return;
  const all = (await recipients(env, kind)).filter((id) => id !== exceptUserId);
  if (!all.length) return;
  const wanted = await wantsPush(env, all.filter((id) => !forIds.includes(id)), kind, leadId);
  let who = [...wanted, ...all.filter((id) => forIds.includes(id))];
  if (!who.length) return;
  const subs = await env.DB.prepare(
    `SELECT endpoint FROM push_subs WHERE user_id IN (${who.map(() => "?").join(",")})`,
  )
    .bind(...who)
    .all<{ endpoint: string }>();
  await pushTo(
    env,
    subs.results.map((s) => s.endpoint),
  );
}
