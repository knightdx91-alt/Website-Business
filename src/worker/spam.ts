import { hmac, safeEqual } from "./auth.ts";
import { getSetting, setSetting } from "./db.ts";
import type { Env } from "./env.ts";
import { escHtml } from "./page.ts";

/**
 * Spam protection for every public form (Oct 2026: three of the first four messages through the company website's
 * contact form were SEO sellers, and each one alerted the owner's phone). Five checks, none of which a real customer
 * notices:
 *  1. the hidden "website" field (the honeypot) must stay empty;
 *  2. company-site forms carry a signed render time (`_t`): a post without it, or with a forged one, never loaded the
 *     form, and one sent under 3 seconds after the page rendered wasn't typed by a person;
 *  3. the words: a score over the fields (link selling, indexing and ranking pitches, "we noticed your website", promo
 *     codes, domain-renewal scams, mass-mail footers, vendor-like sender names…), with a local phone number counting
 *     against spam; `BLOCK_SCORE` or more is dropped;
 *  4. an address blocked five times in an hour is dropped without reading further;
 *  5. Cloudflare Turnstile, once Settings → Website has the site key and the Worker the TURNSTILE_SECRET_KEY secret: the
 *     widget's token is verified with Cloudflare. A missing or bad token asks the person to try again rather than
 *     dropping the post, because a blocked script would otherwise lose a real message.
 * A blocked post gets the normal thank-you (bots learn nothing) and alerts nobody. Blocks are counted in settings key
 * `spam_log` (per month, plus the last 25 with who, why and a snippet) for the Inbox and the Settings health strip.
 * Forms on clients' live sites (static, built once) get checks 1, 3 and 4.
 */

/** Hidden field carrying the signed render time. */
export const STAMP_FIELD = "_t";
/** The field Turnstile's widget adds to the form. */
export const TURNSTILE_FIELD = "cf-turnstile-response";
export const TURNSTILE_HOST = "https://challenges.cloudflare.com";
const TURNSTILE_SCRIPT = `${TURNSTILE_HOST}/turnstile/v0/api.js`;
const SITEVERIFY = `${TURNSTILE_HOST}/turnstile/v0/siteverify`;
/** A form sent sooner than this after it was rendered was not filled in by a person. */
export const MIN_FILL_MS = 3_000;
/** A stamp older than this is "stale" (the tab sat open): a point against, never a block on its own. */
const MAX_STAMP_AGE_MS = 24 * 3_600_000;
/** The content score at which a post is dropped. */
export const BLOCK_SCORE = 4;
const IP_WINDOW_MS = 3_600_000;
const IP_MAX_BLOCKS = 5;
const LOG_KEEP = 25;
const LOG_MONTHS = 13;
/** What a person sees when the Turnstile token is missing or rejected. */
export const HUMAN_NOTE =
  "Please tick the box that shows you're a person, then send again. If the box doesn't appear, call or text us instead.";

/* ---------- The signed render time ---------- */

export async function formStamp(secret: string, at = Date.now()): Promise<string> {
  return `${at}.${await hmac(secret, `form.${at}`)}`;
}

export type StampCheck = { age: number; stale: boolean } | null;

/** Null for a missing or forged stamp; else how long ago the form was rendered. */
export async function checkStamp(secret: string, stamp: string | null | undefined, at = Date.now()): Promise<StampCheck> {
  const m = /^(\d{10,16})\.([A-Za-z0-9_-]{20,})$/.exec((stamp ?? "").trim());
  if (!m) return null;
  const t = Number(m[1]);
  if (!safeEqual(m[2]!, await hmac(secret, `form.${t}`))) return null;
  const age = at - t;
  if (age < -60_000) return null;
  return { age, stale: age > MAX_STAMP_AGE_MS };
}

/* ---------- The words ---------- */

export interface Fields {
  [k: string]: string | undefined;
}

interface Rule {
  re: RegExp;
  points: number;
  why: string;
}

/** Each rule counts once. Tuned on the real posts (test/worker/spam.test.ts keeps them, and real inquiries, as fixtures). */
const RULES: Rule[] = [
  {
    re: /\bback ?links?\b|\blink[- ]building\b|\bguest[- ]posts?\b|\bsponsored (posts?|articles?)\b|\bdo-?follow\b|\bdomain (authority|rating)\b|\bDA ?\d\d\b/i,
    points: 4,
    why: "link selling",
  },
  {
    re: /\bindex(ing|ed|er)?\b.{0,40}\b(google|pages?|urls?|site|status|credits?)\b|\bsearch index\b|\bget (your )?(site|pages?|urls?) indexed\b/i,
    points: 2,
    why: "indexing pitch",
  },
  {
    re: /\b(first|1st|top|front) page (of|on) google\b|\brank(ing|s|ed)? (higher|better|#?1|first|top)\b|\bpage[- ]one\b|\bsearch (visibility|rankings?|results?)\b|\borganic (traffic|growth|visibility)\b|\bkeywords? (performance|rankings?|research)\b|\bshow(s|ing)? up (in|on) (web )?(search|google) results\b/i,
    points: 2,
    why: "ranking pitch",
  },
  { re: /\bseo\b|\baeo\b|\bsearch engine optimi[sz]ation\b/i, points: 1, why: "SEO" },
  {
    re: /\b(we|i) (just )?(noticed|came across|checked|visited|found|reviewed|analy[sz]ed|audited|looked at) (that )?(your|the) (web)?site\b|\byour (web)?site (is|isn't|is not|could|has|hasn't|doesn't|does not|needs|might|may|lacks)\b|\bis your (web)?site\b|\bfor undergroundassociates\.com\b/i,
    points: 2,
    why: "unsolicited audit",
  },
  {
    re: /\bfree (seo |website |site |marketing )?(audit|analysis|report|consultation|trial|credits?|account|quote)\b|\bno obligation\b/i,
    points: 1,
    why: "free audit",
  },
  {
    re: /\b(increase|boost|grow|double|triple|skyrocket|drive|maximi[sz]e|improve) (your )?(web(site)? |online |search )?(traffic|sales|leads|revenue|conversions|visibility|rankings?|presence)\b/i,
    points: 2,
    why: "traffic pitch",
  },
  {
    re: /\bdigital marketing\b|\bmarketing (agency|services|company|team|firm)\b|\bweb (design|development) (agency|company|services|firm)\b|\bweb designer\b|\bwordpress\b|\bshopify\b|\bweb developers?\b/i,
    points: 1,
    why: "agency pitch",
  },
  {
    re: /\bAI (agents?|chat ?bots?|automation|employees?|receptionists?|assistants?|calling|voice)\b|\bchat ?bots?\b|\bvoice (agents?|assistants?)\b/i,
    points: 2,
    why: "AI pitch",
  },
  {
    re: /\b(promo|coupon|discount|bonus) codes?\b|\b\d{1,2} ?% (off|bonus|discount)\b|\blimited[- ]time\b|\bspecial offer\b|\btop[- ]up\b|\bbonus (tokens|credits)\b/i,
    points: 1,
    why: "promo code",
  },
  {
    re: /\bdomains?( [a-z0-9.-]+\.[a-z]{2,})? (is|are|will be|has|have) (about to |going to )?(expir|renew)|\bdomain (registration|listing|renewal|notice|expiration)\b|\brenew (now|today|immediately)\b|\bsearch ?register\b|\bsubmit (your )?(site|website|domain|[a-z0-9.-]+\.[a-z]{2,}) (in|to) (google|search engines?|the search)/i,
    points: 3,
    why: "domain or listing scam",
  },
  {
    re: /\bunsubscribe\b|\bopt[- ]?out\b|\breply (with )?["']?stop\b|\bto stop receiving\b|\bremove (me|us) from\b/i,
    points: 2,
    why: "mass-mail footer",
  },
  { re: /\b(whats ?app|telegram|skype)\b/i, points: 1, why: "chat app" },
  {
    re: /\bdear (sir|madam|sir\/madam|business owner|website owner|webmaster|friend|owner)\b|\b(hi|hello|dear) team\b|\bgreetings\b/i,
    points: 1,
    why: "form letter",
  },
  {
    re: /\b(crypto|bitcoin|forex|casino|betting|viagra|cialis|escorts?|porn|adult (site|content)|payday loans?|investment opportunity|get a loan|need a loan|loan (offer|approval))\b/i,
    points: 3,
    why: "junk",
  },
  { re: /\bupwork\b|\bfiverr\b|\bfreelancer?\b|\boutsourc(e|ing)\b/i, points: 2, why: "freelancer pitch" },
  {
    re: /\b(our|my) (team|company|agency|service|platform|tool|software|experts?) (can|will|helps?|offers?|provides?|speciali[sz]es?)\b|\b[A-Z][A-Za-z-]+ helps you\b/,
    points: 1,
    why: "sales pitch",
  },
  { re: /\b(best|kind|warm) regards\b|\bregards,|\bsincerely,|\bcheers,/i, points: 1, why: "signed like an email" },
  {
    re: /\b(claim|get started|create your free account|sign up now|book a (call|demo)|schedule a (call|demo)|learn more|start your free)\b.{0,24}(here|now|today|:|$)/im,
    points: 1,
    why: "call to action",
  },
];

/** Links: full URLs and bare domains on the common endings (never our own domain, which has its own rule). */
const LINK_RE =
  /(?:https?:\/\/|www\.)[^\s<>"')]+|\b[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.(?:com|net|org|io|co|pro|digital|site|online|xyz|info|biz|us|me|ai|app|dev|shop|store|agency|tech|cloud|link|top|club|vip|live|website|pw|cc|ru|in|uk|ca|de|fr|es|it|nl|pl|ua|cn|br|au)\b(?:\/[^\s<>"')]*)?/gi;
const OUR_DOMAIN = /undergroundassociates\.com/i;
/** Sender names that read like a vendor, not a person or a shop. */
const VENDOR_NAME =
  /\b(team|a\.?i\.?|seo|agency|technolog(?:y|ies)|digital|marketing|media|index(?:ing|er)?|ranking|search|traffic|backlinks?|promo|growth|outreach)\b/i;
/** The same, as substrings of an email address (local part + domain, without the ending). */
const VENDOR_EMAIL = /seo|backlink|index|linkbuild|guestpost|promo|marketing|digital|agency|growth|leadgen|outreach|search|ranking|rankflow|pagerank/i;
/** Scripts no Cullman customer writes in (the site has English and Spanish pages). */
const OTHER_SCRIPT = /[Ͱ-ϿЀ-ӿ֐-׿؀-ۿ฀-๿぀-ヿ一-鿿가-힯]{8,}/;
/** North Alabama and the rest of the state: a real local number counts against spam. */
const LOCAL_PHONE = /^1?(205|251|256|334|659|938)\d{7}$/;

export interface Score {
  score: number;
  reasons: string[];
}

function hostOf(link: string): string {
  const bare = link.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  return bare.split(/[/?#]/)[0]!.toLowerCase();
}

/** How much a post reads like spam, with the reasons in plain words. */
export function spamScore(f: Fields): Score {
  const text = [f.message, f.notes, f.web, f.service].filter(Boolean).join("\n");
  const everything = [f.name, f.business, f.email, text].filter(Boolean).join("\n");
  const reasons: string[] = [];
  let score = 0;
  const add = (points: number, why: string) => {
    score += points;
    reasons.push(why);
  };
  for (const r of RULES) if (r.re.test(everything)) add(r.points, r.why);
  const hosts = new Set<string>();
  for (const m of everything.matchAll(LINK_RE)) {
    const h = hostOf(m[0]);
    if (h && !OUR_DOMAIN.test(h)) hosts.add(h);
  }
  if (hosts.size) add(Math.min(hosts.size, 3), hosts.size === 1 ? "a link" : `${hosts.size} links`);
  if (OUR_DOMAIN.test(text)) add(1, "names our domain");
  if (VENDOR_NAME.test(`${f.name ?? ""} ${f.business ?? ""}`)) add(1, "sender named like a vendor");
  const email = (f.email ?? "").toLowerCase();
  if (email && VENDOR_EMAIL.test(email.replace(/\.[a-z]{2,}$/, ""))) add(1, "vendor-like email address");
  if (OTHER_SCRIPT.test(everything)) add(3, "not in English or Spanish");
  const digits = (f.phone ?? "").replace(/\D/g, "");
  if (LOCAL_PHONE.test(digits)) add(-2, "local phone number");
  return { score, reasons };
}

/* ---------- Turnstile ---------- */

export type Human = "ok" | "fail" | "skip";

/** Both halves must be set before anything is enforced: a widget with no secret checks nothing, a secret with no widget would lock every person out. */
export function turnstileState(env: Pick<Env, "TURNSTILE_SECRET_KEY">, s: { turnstileSiteKey?: string }): "on" | "key" | "secret" | "off" {
  const key = !!s.turnstileSiteKey;
  const secret = !!env.TURNSTILE_SECRET_KEY;
  return key && secret ? "on" : key ? "key" : secret ? "secret" : "off";
}

/** "ok" / "fail" from Cloudflare; "skip" when Turnstile isn't set up, Cloudflare can't be reached, or our own secret is wrong. */
export async function turnstileCheck(
  env: Pick<Env, "TURNSTILE_SECRET_KEY">,
  siteKey: string | undefined,
  token: string | null | undefined,
  ip: string,
  fetcher: typeof fetch = fetch,
): Promise<Human> {
  if (turnstileState(env, { turnstileSiteKey: siteKey }) !== "on") return "skip";
  if (!token) return "fail";
  try {
    const res = await fetcher(SITEVERIFY, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: token.slice(0, 2048), ...(ip ? { remoteip: ip } : {}) }),
    });
    if (!res.ok) return "skip";
    const out = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (out.success) return "ok";
    const codes = out["error-codes"] ?? [];
    return codes.some((c) => c === "invalid-input-secret" || c === "missing-input-secret") ? "skip" : "fail";
  } catch {
    return "skip";
  }
}

/** The hidden render-time field and, when Turnstile is set up, its widget and script. Goes inside every company-site form. */
export function formShieldHtml(o: { stamp: string; siteKey?: string; theme?: "light" | "dark" }): string {
  const widget = o.siteKey
    ? `<div class="cf-turnstile" data-sitekey="${escHtml(o.siteKey)}" data-theme="${o.theme ?? "light"}" data-size="flexible"></div><script src="${TURNSTILE_SCRIPT}" async defer></script>`
    : "";
  return `<input type="hidden" name="${STAMP_FIELD}" value="${escHtml(o.stamp)}">${widget}`;
}

/* ---------- Counters and the log ---------- */

export interface Blocked {
  at: number;
  scope: string;
  reasons: string[];
  who: string;
  snippet: string;
}

interface SpamLog {
  months: Record<string, number>;
  recent: Blocked[];
}

interface Counter {
  count: number;
  since: number;
}

function ipKey(ip: string): string {
  return `spam_ip:${ip.replace(/[^0-9a-f.:]/gi, "").slice(0, 45) || "unknown"}`;
}

async function counter(env: Env, key: string, at: number): Promise<Counter | null> {
  const raw = await getSetting(env, key);
  if (!raw) return null;
  const c = JSON.parse(raw) as Counter;
  return at - c.since > IP_WINDOW_MS ? null : c;
}

/** True once an address has been blocked IP_MAX_BLOCKS times inside the window. */
export async function blockedRecently(env: Env, ip: string, at = Date.now()): Promise<boolean> {
  const c = await counter(env, ipKey(ip), at);
  return !!c && c.count >= IP_MAX_BLOCKS;
}

function monthOf(at: number): string {
  return new Date(at).toISOString().slice(0, 7);
}

async function readLog(env: Env): Promise<SpamLog> {
  const raw = await getSetting(env, "spam_log");
  if (!raw) return { months: {}, recent: [] };
  const log = JSON.parse(raw) as Partial<SpamLog>;
  return { months: log.months ?? {}, recent: log.recent ?? [] };
}

function whoOf(f: Fields): string {
  return [f.name, f.business && f.business !== f.name ? `(${f.business})` : "", f.email ? `<${f.email}>` : (f.phone ?? "")]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

function snippetOf(f: Fields): string {
  return (f.message || f.notes || f.web || "").replace(/\s+/g, " ").trim().slice(0, 140);
}

/** Counts a blocked post against its address and in the log the owner can read. */
export async function recordBlocked(env: Env, b: { scope: string; ip: string; reasons: string[]; fields: Fields; at?: number }): Promise<void> {
  const at = b.at ?? Date.now();
  const key = ipKey(b.ip);
  const prev = await counter(env, key, at);
  await setSetting(env, key, JSON.stringify(prev ? { count: prev.count + 1, since: prev.since } : { count: 1, since: at }));
  const log = await readLog(env);
  const month = monthOf(at);
  log.months[month] = (log.months[month] ?? 0) + 1;
  const keep = Object.keys(log.months).sort().slice(-LOG_MONTHS);
  log.months = Object.fromEntries(keep.map((k) => [k, log.months[k]!]));
  log.recent.unshift({ at, scope: b.scope, reasons: b.reasons, who: whoOf(b.fields), snippet: snippetOf(b.fields) });
  log.recent = log.recent.slice(0, LOG_KEEP);
  await setSetting(env, "spam_log", JSON.stringify(log));
}

/** For the Inbox and the health strip: this month's count and the last few blocked posts. */
export async function blockedSummary(env: Env, at = Date.now()): Promise<{ month: number; recent: Blocked[] }> {
  const log = await readLog(env);
  return { month: log.months[monthOf(at)] ?? 0, recent: log.recent };
}

/** Drops per-address counters whose hour has passed (daily cron). */
export async function pruneSpamCounters(env: Env, at = Date.now()): Promise<void> {
  await env.DB.prepare("DELETE FROM settings WHERE key LIKE 'spam_ip:%' AND COALESCE(json_extract(value, '$.since'), 0) < ?")
    .bind(at - IP_WINDOW_MS)
    .run();
}

/* ---------- The one call a form handler makes ---------- */

export interface Screen {
  /** Drop the post, answering as if it went through. */
  block: boolean;
  /** Turnstile's verdict; "fail" means ask the person to tick the box and send again. */
  human: Human;
  reasons: string[];
  score: number;
}

export interface ScreenOpts {
  /** Where it came from, for the log: "Website contact form", "Change request", "Website of King Fish Aquatics"… */
  scope: string;
  ip: string;
  /** The typed fields (name, business, phone, email, message / notes / web). */
  fields: Fields;
  /** False for forms on static client sites, which carry no render stamp. */
  stamp?: boolean;
  /** False for forms with no Turnstile widget (client sites). */
  turnstile?: boolean;
  fetcher?: typeof fetch;
  now?: number;
}

export async function screenForm(env: Env, s: { turnstileSiteKey?: string }, form: FormData | null, o: ScreenOpts): Promise<Screen> {
  const at = o.now ?? Date.now();
  const get = (k: string) => String(form?.get(k) ?? "").trim();
  const drop = async (reasons: string[], score = 0): Promise<Screen> => {
    await recordBlocked(env, { scope: o.scope, ip: o.ip, reasons, fields: o.fields, at });
    return { block: true, human: "skip", reasons, score };
  };
  if (!form) return drop(["no form data"]);
  if (get("website")) return drop(["filled the hidden field"]);
  let stale = false;
  if (o.stamp !== false) {
    const st = await checkStamp(env.APP_SECRET, get(STAMP_FIELD), at);
    if (!st) return drop(["posted without loading the form"]);
    if (st.age < MIN_FILL_MS) return drop([`sent ${(st.age / 1000).toFixed(1)} seconds after the page loaded`]);
    stale = st.stale;
  }
  const { score, reasons } = spamScore(o.fields);
  let total = score;
  if (stale) {
    total += 1;
    reasons.push("form left open for over a day");
  }
  if (total >= BLOCK_SCORE) return drop(reasons, total);
  if (await blockedRecently(env, o.ip, at)) return drop([`blocked ${IP_MAX_BLOCKS} times in the last hour`], total);
  const human = o.turnstile === false ? "skip" : await turnstileCheck(env, s.turnstileSiteKey, get(TURNSTILE_FIELD), o.ip, o.fetcher);
  return { block: false, human, reasons, score: total };
}
