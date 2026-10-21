import type { BusinessRecord } from "../generator/types.ts";
import { getSetting, getSettings, isPayTest, setSetting, updateLead, type LeadRow } from "./db.ts";
import type { Env } from "./env.ts";
import { fcmJwt, type ServiceAccount } from "./fcm.ts";
import { gaServiceAccount } from "./analytics.ts";

/**
 * Google Search Console for every client site, set up by itself (owner's ask, Oct 2026). On publish the app asks Google's
 * Site Verification API for an HTML-tag code for the live address and builds the site with it (`seo.gsc.token`, a second
 * google-site-verification meta beside any code typed in Edit); after the deploy it verifies the site (our service account
 * becomes its verified owner), adds it to Search Console, submits /sitemap.xml and makes our company Google addresses
 * (Settings → Owner's Google address, the profiles address) owners too. "Give the owner access" adds the client.
 * A site that isn't answering yet right after the deploy is retried by the minute cron (`retrySearchConsole`).
 * Auth: the same service account as Google Analytics (GA_SERVICE_ACCOUNT, else FCM_SERVICE_ACCOUNT), with the
 * "Site Verification API" and "Google Search Console API" switched on in its Google Cloud project. Never blocks a publish.
 */

const SCOPE = "https://www.googleapis.com/auth/siteverification https://www.googleapis.com/auth/webmasters";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SV = "https://www.googleapis.com/siteVerification/v1";
const WM = "https://www.googleapis.com/webmasters/v3";
export const GSC_ERROR_KEY = "gsc_last_error";
export const GSC_VERIFIED_KEY = "gsc_verified";
/** Verify tries per site before the cron gives up (every 5 minutes → about an hour). */
const MAX_TRIES = 12;

export type GscInfo = NonNullable<NonNullable<BusinessRecord["seo"]>["gsc"]>;

let cached: { email: string; token: string; exp: number } | null = null;

async function token(sa: ServiceAccount, fetchFn: typeof fetch): Promise<string> {
  if (cached && cached.email === sa.client_email && cached.exp > Date.now() + 60_000) return cached.token;
  const res = await fetchFn(TOKEN_URL, {
    method: "POST",
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: await fcmJwt(sa, undefined, SCOPE) }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Google sign-in for Search Console failed (${res.status})`);
  const j = (await res.json()) as { access_token: string; expires_in: number };
  cached = { email: sa.client_email, token: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return j.access_token;
}

async function call<T>(sa: ServiceAccount, method: string, url: string, body: unknown, fetchFn: typeof fetch): Promise<T> {
  const res = await fetchFn(url, {
    method,
    headers: { authorization: `Bearer ${await token(sa, fetchFn)}`, ...(body === undefined ? {} : { "content-type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text.slice(0, 300);
    try {
      msg = (JSON.parse(text) as { error?: { message?: string } }).error?.message ?? msg;
    } catch {
      /* raw text */
    }
    const api = url.startsWith(SV) ? "Site Verification API" : "Google Search Console API";
    const hint = res.status === 403 && /has not been used|disabled|not enabled/i.test(msg) ? ` Switch on the "${api}" in the service account's Google Cloud project.` : "";
    throw new Error(`Search Console said ${res.status}: ${msg}${hint}`);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

/** The site identifier Google uses for a URL-prefix property: the origin with a trailing slash. */
export function siteId(origin: string): string {
  return origin.replace(/\/+$/, "") + "/";
}

/** The `content` of `<meta name="google-site-verification" content="…" />`. */
export function metaContent(tag: string): string | null {
  const m = tag.match(/content="([^"]+)"/);
  return m && /^[A-Za-z0-9_-]{10,120}$/.test(m[1]!) ? m[1]! : null;
}

async function noteAndError(env: Env, lead: LeadRow, name: string, error: string): Promise<void> {
  console.error("Search Console setup failed", lead.id, error);
  await setSetting(env, GSC_ERROR_KEY, JSON.stringify({ at: Date.now(), lead: lead.id, name, error }));
}

/**
 * Before a publish: a verification code for the address the site is going live at (a new one when the address changed,
 * e.g. their own domain started working). Returns the lead with the updated record, or the same lead.
 */
export async function prepareSearchConsole(env: Env, lead: LeadRow, origin: string, fetchFn: typeof fetch = fetch): Promise<LeadRow> {
  if (!lead.record_json || isPayTest(lead)) return lead;
  const sa = gaServiceAccount(env);
  if (!sa) return lead;
  const record = JSON.parse(lead.record_json) as BusinessRecord;
  const site = siteId(origin);
  if (record.seo?.gsc?.site === site && record.seo.gsc.token) return lead;
  try {
    const r = await call<{ token?: string }>(sa, "POST", `${SV}/token`, { site: { type: "SITE", identifier: site }, verificationMethod: "META" }, fetchFn);
    const code = metaContent(r.token ?? "");
    if (!code) throw new Error("Google sent no verification code");
    record.seo = { ...(record.seo ?? {}), gsc: { site, token: code } };
    const record_json = JSON.stringify(record);
    await updateLead(env, lead.id, { record_json });
    return { ...lead, record_json };
  } catch (err) {
    await noteAndError(env, lead, record.name, (err as Error).message);
    return lead;
  }
}

/** Our own Google addresses that become owners of every client's Search Console property. */
async function companyOwners(env: Env): Promise<string[]> {
  const s = await getSettings(env);
  const list = [s.ownerEmail, s.gbpEmail].map((e) => (e ?? "").trim().toLowerCase()).filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
  return [...new Set(list)];
}

/** Adds owners to a verified site (keeps the ones already there). */
async function addOwners(sa: ServiceAccount, site: string, emails: string[], fetchFn: typeof fetch): Promise<string[]> {
  const id = encodeURIComponent(site);
  const cur = await call<{ owners?: string[] }>(sa, "GET", `${SV}/webResource/${id}`, undefined, fetchFn);
  const owners = [...new Set([...(cur.owners ?? []), ...emails])];
  if (owners.length !== (cur.owners ?? []).length)
    await call(sa, "PUT", `${SV}/webResource/${id}`, { site: { type: "SITE", identifier: site }, owners }, fetchFn);
  return owners;
}

/**
 * After the deploy (and from the cron until it works): verify, add to Search Console, submit the sitemap, add our owners.
 * Returns true when the site is verified.
 */
export async function finishSearchConsole(env: Env, leadId: string, fetchFn: typeof fetch = fetch): Promise<boolean> {
  const lead = await env.DB.prepare("SELECT * FROM leads WHERE id = ?").bind(leadId).first<LeadRow>();
  if (!lead?.record_json) return false;
  const record = JSON.parse(lead.record_json) as BusinessRecord;
  const g = record.seo?.gsc;
  const sa = gaServiceAccount(env);
  if (!g?.token || g.verified || !sa) return !!g?.verified;
  const save = async (next: GscInfo) => {
    const fresh = await env.DB.prepare("SELECT record_json FROM leads WHERE id = ?").bind(leadId).first<{ record_json: string | null }>();
    const r = fresh?.record_json ? (JSON.parse(fresh.record_json) as BusinessRecord) : record;
    if (r.seo?.gsc?.site && r.seo.gsc.site !== next.site) return; // the address moved meanwhile: the next publish starts over
    r.seo = { ...(r.seo ?? {}), gsc: next };
    await updateLead(env, leadId, { record_json: JSON.stringify(r) });
  };
  try {
    await call(sa, "POST", `${SV}/webResource?verificationMethod=META`, { site: { type: "SITE", identifier: g.site } }, fetchFn);
  } catch (err) {
    const tries = (g.tries ?? 0) + 1;
    await save({ ...g, tries, error: (err as Error).message.slice(0, 300) });
    if (tries >= MAX_TRIES) await noteAndError(env, lead, record.name, (err as Error).message);
    return false;
  }
  const done: GscInfo = { site: g.site, token: g.token, verified: Date.now() };
  const steps: string[] = [];
  try {
    await call(sa, "PUT", `${WM}/sites/${encodeURIComponent(g.site)}`, undefined, fetchFn);
    await call(sa, "PUT", `${WM}/sites/${encodeURIComponent(g.site)}/sitemaps/${encodeURIComponent(`${g.site}sitemap.xml`)}`, undefined, fetchFn);
    done.sitemap = Date.now();
    steps.push("sitemap sent");
  } catch (err) {
    done.error = (err as Error).message.slice(0, 300);
    await noteAndError(env, lead, record.name, done.error);
  }
  try {
    const owners = await companyOwners(env);
    if (owners.length) {
      await addOwners(sa, g.site, owners, fetchFn);
      done.owners = owners;
      steps.push(`${owners.join(", ")} added as owner${owners.length > 1 ? "s" : ""}`);
    }
  } catch (err) {
    done.error = (err as Error).message.slice(0, 300);
    await noteAndError(env, lead, record.name, done.error);
  }
  await save(done);
  await env.DB.prepare("INSERT INTO lead_notes (id, lead_id, author, outcome, body, created_at) VALUES (?, ?, ?, NULL, ?, ?)")
    .bind(crypto.randomUUID().replace(/-/g, "").slice(0, 16), leadId, "App", `🔎 Google Search Console set up for ${g.site}${steps.length ? ` (${steps.join("; ")})` : ""}.`, Date.now())
    .run();
  if (!done.error) await setSetting(env, GSC_ERROR_KEY, "");
  await setSetting(env, GSC_VERIFIED_KEY, String(Date.now()));
  return true;
}

/** "Give the owner access": the client's Google address becomes an owner of their site in Search Console. */
export async function grantSearchConsole(env: Env, record: BusinessRecord, email: string, fetchFn: typeof fetch = fetch): Promise<void> {
  const g = record.seo?.gsc;
  const sa = gaServiceAccount(env);
  if (!g?.verified || !sa) throw new Error("Search Console isn't set up for this site yet");
  await addOwners(sa, g.site, [email], fetchFn);
}

/** Minute cron (every fifth minute): live sites whose verification hasn't gone through yet try again, a few at a time. */
export async function retrySearchConsole(env: Env, fetchFn: typeof fetch = fetch): Promise<number> {
  if (!gaServiceAccount(env)) return 0;
  const rows = await env.DB.prepare(
    "SELECT id, record_json FROM leads WHERE live_url IS NOT NULL AND status = 'ready' AND json_extract(record_json, '$.seo.gsc.token') IS NOT NULL AND json_extract(record_json, '$.seo.gsc.verified') IS NULL LIMIT 20",
  ).all<{ id: string; record_json: string }>();
  let n = 0;
  for (const row of rows.results ?? []) {
    const g = (JSON.parse(row.record_json) as BusinessRecord).seo?.gsc;
    if (!g || (g.tries ?? 0) >= MAX_TRIES) continue;
    if (n >= 3) break;
    n++;
    await finishSearchConsole(env, row.id, fetchFn).catch((e) => console.error("gsc retry", row.id, e));
  }
  return n;
}

/** Once the first site has verified, every live site is republished once so it gets its own Search Console setup. */
export async function queueGscBackfill(env: Env): Promise<number> {
  if (!(await getSetting(env, GSC_VERIFIED_KEY))) return 0;
  if (await getSetting(env, "gsc_backfill_v1")) return 0;
  await setSetting(env, "gsc_backfill_v1", String(Date.now()));
  const res = await env.DB.prepare(
    "UPDATE leads SET prices_dirty = 1 WHERE live_url IS NOT NULL AND status = 'ready' AND json_extract(record_json, '$.seo.gsc.verified') IS NULL",
  ).run();
  return res.meta.changes ?? 0;
}

export async function gscLastError(env: Env): Promise<{ at: number; lead: string; name: string; error: string } | null> {
  const raw = await getSetting(env, GSC_ERROR_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
