import { newId, now, type Env } from "./env.ts";
import type { Session } from "./auth.ts";
import { getSetting, setSetting } from "./db.ts";

/**
 * Notifications: what other people did (notes, call outcomes, sales, sign-ups, publishes, website messages).
 * Everyone with full access (the owner and full-access team members) sees everything except their own actions.
 * Phone pushes carry no data: the push just wakes the app's service worker, which asks /api/notifications/latest
 * what's new while logged in. That keeps details off the push service and needs no payload encryption.
 */

export type EventKind = "note" | "call" | "status" | "signup_sent" | "signed" | "paid" | "published" | "added" | "message" | "run" | "preview_open";

export interface EventInput {
  kind: EventKind;
  text: string;
  leadId?: string | null;
  /** Who did it; null for customers (sign-ups, website forms). */
  actor?: Pick<Session, "userId" | "name"> | null;
  actorName?: string;
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
    await env.DB.prepare("INSERT INTO events (id, created_at, actor_id, actor_name, kind, lead_id, text) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(newId(), now(), e.actor?.userId ?? null, e.actor?.name ?? e.actorName ?? null, e.kind, e.leadId ?? null, e.text.slice(0, 500))
      .run();
    await pushAll(env, e.actor?.userId ?? null);
  } catch (err) {
    console.error("notify failed", err);
  }
}

/** People who get notifications: the owner and full-access team members. */
async function recipients(env: Env): Promise<string[]> {
  const admins = await env.DB.prepare("SELECT id FROM users WHERE admin = 1 AND disabled = 0").all<{ id: string }>();
  return ["owner", ...admins.results.map((u) => u.id)];
}

export async function listEvents(env: Env, userId: string, limit = 100) {
  const seen = await env.DB.prepare("SELECT seen_at FROM notif_seen WHERE user_id = ?").bind(userId).first<{ seen_at: number }>();
  const rows = await env.DB.prepare(
    "SELECT e.*, l.name AS lead_name FROM events e LEFT JOIN leads l ON l.id = e.lead_id WHERE e.actor_id IS NULL OR e.actor_id != ? ORDER BY e.created_at DESC LIMIT ?",
  )
    .bind(userId, limit)
    .all<EventRow & { lead_name: string | null }>();
  const seenAt = seen?.seen_at ?? 0;
  return {
    seenAt,
    unread: rows.results.filter((r) => r.created_at > seenAt).length,
    items: rows.results.map((r) => ({ id: r.id, at: r.created_at, kind: r.kind, text: r.text, who: r.actor_name, leadId: r.lead_id, leadName: r.lead_name, unread: r.created_at > seenAt })),
  };
}

export async function unreadCount(env: Env, userId: string): Promise<number> {
  const seen = await env.DB.prepare("SELECT seen_at FROM notif_seen WHERE user_id = ?").bind(userId).first<{ seen_at: number }>();
  const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM events WHERE created_at > ? AND (actor_id IS NULL OR actor_id != ?)")
    .bind(seen?.seen_at ?? 0, userId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function markSeen(env: Env, userId: string): Promise<void> {
  await env.DB.prepare("INSERT INTO notif_seen (user_id, seen_at) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET seen_at = excluded.seen_at").bind(userId, now()).run();
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
};

/** What a phone shows when a push arrives: the newest unread item, or a count when there are several. */
export async function latestForPush(env: Env, userId: string) {
  const test = Number((await getSetting(env, `push_test_${userId}`)) ?? 0);
  if (test && Date.now() - test < 120_000) {
    await setSetting(env, `push_test_${userId}`, "0");
    return { title: "Website Business", body: "Test notification: you're all set. You'll get one whenever someone else makes a change.", url: "/#/notifications", unread: 0 };
  }
  const { items, unread } = await listEvents(env, userId, 5);
  const top = items.find((i) => i.unread) ?? items[0];
  if (!top) return { title: "Website Business", body: "Nothing new.", url: "/#/notifications", unread: 0 };
  return {
    title: unread > 1 ? `${unread} new updates` : PUSH_TITLE[top.kind] ?? "Website Business",
    body: top.text,
    url: top.leadId ? `/#/lead/${top.leadId}` : "/#/notifications",
    unread,
  };
}

/* ---------- Web Push (VAPID, no payload) ---------- */

const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf as ArrayBuffer))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

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
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const enc = new TextEncoder();
  const header = b64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64url(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: "mailto:post@undergroundassociates.com" })));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(`${header}.${claims}`));
  return `vapid t=${header}.${claims}.${b64url(sig)}, k=${vapidPublicKey(env)}`;
}

/** Push services we accept subscriptions for (Chrome/Android uses FCM). */
export function allowedEndpoint(endpoint: string): boolean {
  try {
    const u = new URL(endpoint);
    return u.protocol === "https:" && /(^|\.)(googleapis\.com|mozilla\.com|windows\.com|push\.apple\.com)$/.test(u.hostname);
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
        headers: { Authorization: await vapidAuth(env, endpoint), TTL: "86400", Urgency: "high", "Content-Length": "0" },
        signal: AbortSignal.timeout(5000),
      });
      if (res.status === 404 || res.status === 410) await env.DB.prepare("DELETE FROM push_subs WHERE endpoint = ?").bind(endpoint).run();
      else if (res.ok) sent++;
    }),
  );
  return sent;
}

async function pushAll(env: Env, exceptUserId: string | null): Promise<void> {
  if (!env.VAPID_PRIVATE_JWK) return;
  const who = (await recipients(env)).filter((id) => id !== exceptUserId);
  if (!who.length) return;
  const subs = await env.DB.prepare(`SELECT endpoint FROM push_subs WHERE user_id IN (${who.map(() => "?").join(",")})`)
    .bind(...who)
    .all<{ endpoint: string }>();
  await pushTo(env, subs.results.map((s) => s.endpoint));
}
