import { gaServiceAccount } from "./analytics.ts";
import type { Env } from "./env.ts";
import { fcmJwt, type ServiceAccount } from "./fcm.ts";

/**
 * Tasks straight onto Google Calendar (Oct 2026, owner's ask: "integrated so it automatically does it"). With Google
 * Workspace domain-wide delegation, the service account (GA_SERVICE_ACCOUNT, else FCM_SERVICE_ACCOUNT) acts as each team
 * member and writes the event into their own calendar: nothing to accept, edits and removals show at once. Only addresses on
 * the company domain can be reached this way; anyone else (and everyone until the owner's one-time setup is done) gets the
 * emailed invite from tasks.ts instead.
 *
 * Owner's one-time setup: Google Cloud (the service account's project) → enable "Google Calendar API"; admin.google.com →
 * Security → Access and data control → API controls → Manage domain-wide delegation → Add new → the service account's
 * Client ID, scope https://www.googleapis.com/auth/calendar.events.
 */

export const CAL_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const LAST_KEY = "gcal_last";

/** Google event ids allow a–v and 0–9; task ids are 16 hex characters. */
export const eventId = (taskId: string) => `uatask${taskId.toLowerCase().replace(/[^a-v0-9]/g, "")}`;

export interface CalEvent {
  title: string;
  notes: string;
  due: string;
  dueTime: string | null;
  leadName: string | null;
  leadUrl: string | null;
}

/** The Calendar API body: 30-minute timed event with a 30-minute popup, or an all-day "free" event. */
export function eventBody(e: CalEvent, tz = "America/Chicago"): Record<string, unknown> {
  const description = [e.notes, e.leadName ? `About: ${e.leadName}` : "", e.leadUrl ?? "", "From the Underground Associates app."]
    .filter(Boolean)
    .join("\n");
  let when: Record<string, unknown>;
  if (e.dueTime) {
    const [h, m] = e.dueTime.split(":").map(Number) as [number, number];
    const end = h * 60 + m + 30;
    const endDay = end >= 24 * 60 ? nextDay(e.due) : e.due;
    const em = end % (24 * 60);
    const hhmm = (x: number) => `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
    when = {
      start: { dateTime: `${e.due}T${e.dueTime}:00`, timeZone: tz },
      end: { dateTime: `${endDay}T${hhmm(em)}:00`, timeZone: tz },
      reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 30 }] },
    };
  } else {
    when = { start: { date: e.due }, end: { date: nextDay(e.due) }, transparency: "transparent" };
  }
  return {
    summary: e.title,
    description,
    status: "confirmed",
    ...(e.leadUrl ? { source: { title: e.leadName ?? "Open in the app", url: e.leadUrl } } : {}),
    ...when,
  };
}

function nextDay(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** On the company Workspace domain (the only addresses the service account may act as). */
export function onDomain(email: string, domain: string): boolean {
  return email.toLowerCase().endsWith(`@${domain.toLowerCase()}`);
}

const tokens = new Map<string, { token: string; exp: number }>();

async function tokenFor(sa: ServiceAccount, email: string): Promise<string> {
  const hit = tokens.get(email);
  if (hit && hit.exp > Date.now() + 60_000) return hit.token;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: await fcmJwt(sa, undefined, CAL_SCOPE, email),
    }),
    signal: AbortSignal.timeout(8000),
  });
  const j = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string; error_description?: string };
  if (!res.ok || !j.access_token)
    throw new Error(
      j.error === "unauthorized_client"
        ? "domain-wide delegation isn't set up for the calendar yet"
        : `Google sign-in ${res.status}: ${j.error_description ?? j.error ?? "no token"}`,
    );
  tokens.set(email, { token: j.access_token, exp: Date.now() + (j.expires_in ?? 3600) * 1000 });
  return j.access_token;
}

async function record(env: Env, v: { ok: boolean; email: string; error?: string }) {
  await env.DB.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .bind(LAST_KEY, JSON.stringify({ ...v, at: Date.now() }))
    .run()
    .catch(() => {});
}

export async function gcalLast(env: Env): Promise<{ ok: boolean; email: string; error?: string; at: number } | null> {
  const r = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind(LAST_KEY).first<{ value: string }>().catch(() => null);
  try {
    return r ? JSON.parse(r.value) : null;
  } catch {
    return null;
  }
}

/** The service account's numeric client ID (what the Workspace admin pastes for domain-wide delegation). */
export function gcalClientId(env: Env): string | null {
  const raw = env.GA_SERVICE_ACCOUNT || env.FCM_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    return (JSON.parse(raw) as { client_id?: string }).client_id ?? null;
  } catch {
    return null;
  }
}

/**
 * Puts (or updates) the task's event straight into this person's calendar. True = done; false = can't reach their calendar
 * this way (setup missing, not on the domain, Google refused), so the caller sends the emailed invite instead.
 */
export async function gcalUpsert(env: Env, email: string, taskId: string, e: CalEvent): Promise<boolean> {
  const sa = gaServiceAccount(env);
  if (!sa) return false;
  try {
    const token = await tokenFor(sa, email);
    const id = eventId(taskId);
    const body = JSON.stringify({ ...eventBody(e), id });
    const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };
    let res = await fetch(`${API}/${id}`, { method: "PUT", headers, body, signal: AbortSignal.timeout(8000) });
    if (res.status === 404) res = await fetch(API, { method: "POST", headers, body, signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      throw new Error(`Calendar ${res.status}: ${j.error?.message ?? "refused"}`);
    }
    await record(env, { ok: true, email });
    return true;
  } catch (err) {
    await record(env, { ok: false, email, error: (err as Error).message });
    return false;
  }
}

/** Takes the task's event off this person's calendar. True = gone (or never there). */
export async function gcalDelete(env: Env, email: string, taskId: string): Promise<boolean> {
  const sa = gaServiceAccount(env);
  if (!sa) return false;
  try {
    const token = await tokenFor(sa, email);
    const res = await fetch(`${API}/${eventId(taskId)}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    return res.ok || res.status === 404 || res.status === 410;
  } catch {
    return false;
  }
}
