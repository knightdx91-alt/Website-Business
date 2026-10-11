import { getSetting, setSetting, type AppSettings } from "./db.ts";
import type { Env } from "./env.ts";

/**
 * Firebase Cloud Messaging: the instant push channel to the Android app. The Worker sends data-only messages to the
 * "team" topic (every signed-in phone subscribes): {kind: "update"} when a new build lands in R2 (minute cron,
 * `announceUpdate`) and {kind: "alerts"} whenever notify() records a team event. The phone then fetches what's new with
 * its own login, so no lead data rides on the push. Needs Worker secret FCM_SERVICE_ACCOUNT (the Firebase service-account
 * JSON) and, for the phones, Settings → Phone alerts (Firebase): app id, API key, project id, sender id. Without the
 * secret every function here is a no-op and the app falls back to its 15-minute polling.
 */

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

export const FCM_TOPIC = "team";
const SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

const b64url = (buf: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof buf === "string" ? new TextEncoder().encode(buf) : new Uint8Array(buf as ArrayBuffer);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

export function serviceAccount(env: Env): ServiceAccount | null {
  if (!env.FCM_SERVICE_ACCOUNT) return null;
  try {
    const sa = JSON.parse(env.FCM_SERVICE_ACCOUNT) as Partial<ServiceAccount>;
    return sa.client_email && sa.private_key && sa.project_id ? (sa as ServiceAccount) : null;
  } catch {
    return null;
  }
}

/** A signed RS256 JWT for the OAuth token exchange (one hour). Exported for the test. */
export async function fcmJwt(sa: ServiceAccount, now = Math.floor(Date.now() / 1000)): Promise<string> {
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }));
  const pem = sa.private_key.replace(/-----[A-Z ]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claims}`));
  return `${header}.${claims}.${b64url(sig)}`;
}

let cached: { token: string; exp: number } | null = null;

async function accessToken(sa: ServiceAccount, fetchFn: typeof fetch = fetch): Promise<string> {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const body = new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: await fcmJwt(sa) });
  const res = await fetchFn(TOKEN_URL, { method: "POST", body, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`FCM token ${res.status}`);
  const j = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return j.access_token;
}

/** Sends one data message to the team topic. Never throws: a push that fails must not break the action that caused it. */
export async function fcmSend(env: Env, data: Record<string, string>, fetchFn: typeof fetch = fetch): Promise<boolean> {
  const sa = serviceAccount(env);
  if (!sa) return false;
  try {
    const token = await accessToken(sa, fetchFn);
    const res = await fetchFn(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message: { topic: FCM_TOPIC, data, android: { priority: "high" } } }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error("FCM send failed", res.status, (await res.text()).slice(0, 300));
    return res.ok;
  } catch (err) {
    console.error("FCM send error", err);
    return false;
  }
}

/** What the phones need to initialise Firebase (public values from Settings), or null until all four are set. */
export function fcmClientConfig(s: AppSettings): { appId: string; apiKey: string; projectId: string; senderId: string } | null {
  return s.fcmAppId && s.fcmApiKey && s.fcmProjectId && s.fcmSenderId ? { appId: s.fcmAppId, apiKey: s.fcmApiKey, projectId: s.fcmProjectId, senderId: s.fcmSenderId } : null;
}

const ANNOUNCED_KEY = "android_announced_code";

/**
 * Minute cron: when android/build.sh has uploaded a newer build (_build/website-business.json), tell every phone once.
 * Returns the version announced, or null.
 */
export async function announceUpdate(env: Env, fetchFn: typeof fetch = fetch): Promise<string | null> {
  if (!serviceAccount(env)) return null;
  const obj = await env.BUCKET.get("_build/website-business.json");
  if (!obj) return null;
  const info = (await obj.json()) as { versionCode?: number; versionName?: string };
  const code = Number(info.versionCode ?? 0);
  if (!code) return null;
  const announced = Number((await getSetting(env, ANNOUNCED_KEY)) ?? 0);
  if (code <= announced) return null;
  const ok = await fcmSend(env, { kind: "update", versionCode: String(code), versionName: String(info.versionName ?? "") }, fetchFn);
  if (ok) await setSetting(env, ANNOUNCED_KEY, String(code));
  return ok ? String(info.versionName ?? code) : null;
}
