import type { BusinessRecord } from "../generator/types.ts";
import { getSetting, getSettings, isPayTest, setSetting, updateLead, type AppSettings, type LeadRow } from "./db.ts";
import type { Env } from "./env.ts";
import { fcmJwt, type ServiceAccount } from "./fcm.ts";

/**
 * Google Analytics for every client site, set up by itself (owner's pick, Oct 2026). When a site is published and has no
 * Google Analytics ID yet, the app creates the business its own GA4 property + web data stream under our Google Analytics
 * account (Settings → Website → "Google Analytics account for client sites") through the Analytics Admin API, stores the
 * measurement ID on the record (`seo.gaId`, plus `seo.ga` with the property / stream we made), and the site is built with
 * the Google tag on every live page. "Give the owner access" adds the client's Google address as a viewer on their property.
 * Auth: a Google service account (Worker secret GA_SERVICE_ACCOUNT, else the Firebase one in FCM_SERVICE_ACCOUNT) that the
 * owner adds as Administrator on the Google Analytics account, with the "Google Analytics Admin API" switched on in that
 * account's Google Cloud project. Nothing here ever blocks a publish: a failure is remembered (settings key `ga_last_error`)
 * and shown in Settings, and the site goes live without the tag.
 */

// edit = make properties and streams; manage.users = "Give the owner access" (access bindings refuse a token without it).
const SCOPE = "https://www.googleapis.com/auth/analytics.edit https://www.googleapis.com/auth/analytics.manage.users";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ADMIN = "https://analyticsadmin.googleapis.com";
export const GA_ERROR_KEY = "ga_last_error";
export const GA_ID_RE = /^G-[A-Z0-9]{4,15}$/;

export function gaServiceAccount(env: Env): ServiceAccount | null {
  const raw = env.GA_SERVICE_ACCOUNT || env.FCM_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const sa = JSON.parse(raw) as Partial<ServiceAccount>;
    return sa.client_email && sa.private_key && sa.project_id ? (sa as ServiceAccount) : null;
  } catch {
    return null;
  }
}

export function gaAccount(s: Pick<AppSettings, "gaAccountId">): string | null {
  const id = (s.gaAccountId ?? "").replace(/^accounts\//, "").trim();
  return /^\d{4,20}$/.test(id) ? id : null;
}

let cached: { email: string; token: string; exp: number } | null = null;

async function gaToken(sa: ServiceAccount, fetchFn: typeof fetch): Promise<string> {
  if (cached && cached.email === sa.client_email && cached.exp > Date.now() + 60_000) return cached.token;
  const res = await fetchFn(TOKEN_URL, {
    method: "POST",
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: await fcmJwt(sa, undefined, SCOPE) }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Google sign-in for Analytics failed (${res.status})`);
  const j = (await res.json()) as { access_token: string; expires_in: number };
  cached = { email: sa.client_email, token: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return j.access_token;
}

/** One Admin API call; Google's own message on failure (with a plain-words hint for the usual setup mistakes). */
async function admin<T>(sa: ServiceAccount, path: string, body: unknown, fetchFn: typeof fetch): Promise<T> {
  // Google's Admin API sometimes takes well over 12 s (a first "Give the owner access" timed out): wait 25 s, try once more.
  const send = async () =>
    fetchFn(`${ADMIN}${path}`, {
      method: "POST",
      headers: { authorization: `Bearer ${await gaToken(sa, fetchFn)}`, "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25000),
    });
  let res: Response;
  try {
    res = await send();
  } catch (err) {
    if (!/abort|timeout/i.test(String((err as Error)?.message ?? err))) throw err;
    try {
      res = await send();
    } catch {
      throw new Error("Google Analytics didn't answer in time. Wait a minute and try again; it may already have gone through.");
    }
  }
  const text = await res.text();
  if (!res.ok) {
    let msg = text.slice(0, 300);
    try {
      msg = (JSON.parse(text) as { error?: { message?: string } }).error?.message ?? msg;
    } catch {
      /* keep the raw text */
    }
    const hint =
      res.status === 403 && /has not been used|disabled/i.test(msg)
        ? " Switch on the Google Analytics Admin API in the service account's Google Cloud project."
        : res.status === 403
          ? ` Add ${sa.client_email} as Administrator on the Google Analytics account (Admin → Account access management).`
          : "";
    throw new Error(`Google Analytics said ${res.status}: ${msg}${hint}`);
  }
  return JSON.parse(text) as T;
}

export interface GaSetup {
  property: string;
  stream: string;
  measurementId: string;
}

/** Creates the business's GA4 property and its web data stream. Exported for the test (fetchFn is faked there). */
export async function createProperty(
  sa: ServiceAccount,
  account: string,
  r: Pick<BusinessRecord, "name" | "address">,
  origin: string,
  fetchFn: typeof fetch = fetch,
): Promise<GaSetup> {
  const where = [r.address?.city, r.address?.state].filter(Boolean).join(", ");
  const prop = await admin<{ name: string }>(
    sa,
    "/v1beta/properties",
    { parent: `accounts/${account}`, displayName: `${r.name}${where ? ` (${where})` : ""}`.slice(0, 100), timeZone: "America/Chicago", currencyCode: "USD" },
    fetchFn,
  );
  const stream = await admin<{ name: string; webStreamData?: { measurementId?: string } }>(
    sa,
    `/v1beta/${prop.name}/dataStreams`,
    { type: "WEB_DATA_STREAM", displayName: r.name.slice(0, 100), webStreamData: { defaultUri: origin } },
    fetchFn,
  );
  const measurementId = stream.webStreamData?.measurementId ?? "";
  if (!GA_ID_RE.test(measurementId)) throw new Error("Google Analytics made the property but sent no measurement ID");
  return { property: prop.name, stream: stream.name, measurementId };
}

export type GaState = "on" | "account" | "secret" | "off";

/** on = ready; account = Settings has no account number; secret = no service account; off = neither. */
export function gaState(env: Env, s: Pick<AppSettings, "gaAccountId">): GaState {
  const sa = !!gaServiceAccount(env);
  const acct = !!gaAccount(s);
  return sa && acct ? "on" : sa ? "account" : acct ? "secret" : "off";
}

/**
 * Before a publish: a live site without a Google Analytics ID gets its own property now (or the one we made before, if the
 * ID was cleared). Returns the lead with the updated record, or the same lead when nothing changed / it isn't set up.
 */
export async function ensureAnalytics(env: Env, lead: LeadRow, origin: string, fetchFn: typeof fetch = fetch): Promise<LeadRow> {
  if (!lead.record_json || isPayTest(lead)) return lead;
  const record = JSON.parse(lead.record_json) as BusinessRecord;
  if (record.seo?.gaId) return lead;
  const s = await getSettings(env);
  const sa = gaServiceAccount(env);
  const account = gaAccount(s);
  if (!sa || !account) return lead;
  try {
    const ga = record.seo?.ga?.measurementId ? record.seo.ga : { ...(await createProperty(sa, account, record, origin, fetchFn)), at: Date.now() };
    record.seo = { ...(record.seo ?? {}), gaId: ga.measurementId, ga };
    const record_json = JSON.stringify(record);
    await updateLead(env, lead.id, { record_json });
    await env.DB.prepare("INSERT INTO lead_notes (id, lead_id, author, outcome, body, created_at) VALUES (?, ?, ?, NULL, ?, ?)")
      .bind(crypto.randomUUID().replace(/-/g, "").slice(0, 16), lead.id, "App", `📊 Google Analytics set up for the live site (${ga.measurementId}).`, Date.now())
      .run();
    await setSetting(env, GA_ERROR_KEY, "");
    return { ...lead, record_json };
  } catch (err) {
    const error = (err as Error).message;
    console.error("Google Analytics setup failed", lead.id, error);
    await setSetting(env, GA_ERROR_KEY, JSON.stringify({ at: Date.now(), lead: lead.id, name: record.name, error }));
    return lead;
  }
}

/** The last setup failure (cleared by the next success), for Settings and the health strip. */
export async function gaLastError(env: Env): Promise<{ at: number; lead: string; name: string; error: string } | null> {
  const raw = await getSetting(env, GA_ERROR_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** "Give the owner access": the client's Google address becomes a viewer on the property we made for them. */
export async function grantViewer(env: Env, record: BusinessRecord, email: string, fetchFn: typeof fetch = fetch): Promise<void> {
  const property = record.seo?.ga?.property;
  if (!property) throw new Error("This site's Google Analytics wasn't set up by the app, so it can't share it");
  const sa = gaServiceAccount(env);
  if (!sa) throw new Error("Google Analytics isn't connected (no service account)");
  try {
    await admin(sa, `/v1alpha/${property}/accessBindings`, { user: email, roles: ["predefinedRoles/viewer"] }, fetchFn);
  } catch (err) {
    // A retry after a slow first try (or a second tap) finds the access already there: that's the outcome we wanted.
    if (!/said 409|already exists/i.test(String((err as Error).message))) throw err;
  }
}

/** The reports link for a property the app made ("properties/123" → analytics.google.com/…#/p123/…). */
export function reportsUrl(property: string | undefined): string | null {
  const id = property?.replace(/^properties\//, "");
  return id && /^\d+$/.test(id) ? `https://analytics.google.com/analytics/web/#/p${id}/reports/intelligenthome` : null;
}

/** Minute cron: once Google Analytics is connected, every live site is republished once so it picks up its own property. */
export async function queueGaBackfill(env: Env): Promise<number> {
  if (gaState(env, await getSettings(env)) !== "on") return 0;
  if (await getSetting(env, "ga_backfill_v1")) return 0;
  await setSetting(env, "ga_backfill_v1", String(Date.now()));
  const res = await env.DB.prepare("UPDATE leads SET prices_dirty = 1 WHERE live_url IS NOT NULL AND status = 'ready'").run();
  return res.meta.changes ?? 0;
}
