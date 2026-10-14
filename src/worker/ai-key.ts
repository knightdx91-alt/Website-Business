import { getSetting, setSetting } from "./db.ts";
import { now, type Env } from "./env.ts";

/**
 * The Claude API key, changeable from Settings (Oct 2026, owner's ask: the first account ran out of credit and another
 * account has some). A key saved in the app wins over the Worker secret ANTHROPIC_API_KEY; removing it goes back to the
 * secret. It is stored encrypted (AES-GCM, key derived from APP_SECRET) in settings key `anthropic_key`, never sent back
 * to the apps (only its last 4 characters), and left out of backups. Every handler runs with `withAiKey(env)`, so all the
 * code that reads env.ANTHROPIC_API_KEY picks it up unchanged.
 */

export const AI_KEY_SETTING = "anthropic_key";
const CACHE_MS = 60_000;

interface Stored {
  iv: string;
  ct: string;
  last4: string;
  at: number;
  by?: string;
}

let cache: { at: number; key: string | null; meta: Stored | null } | null = null;

const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function cryptoKey(env: Env): Promise<CryptoKey> {
  const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`aikey.${env.APP_SECRET}`));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function load(env: Env): Promise<{ key: string | null; meta: Stored | null }> {
  if (cache && now() - cache.at < CACHE_MS) return cache;
  const raw = await getSetting(env, AI_KEY_SETTING).catch(() => null);
  let key: string | null = null;
  let meta: Stored | null = null;
  if (raw) {
    try {
      meta = JSON.parse(raw) as Stored;
      const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(meta.iv) }, await cryptoKey(env), unb64(meta.ct));
      key = new TextDecoder().decode(plain);
    } catch {
      key = null; // APP_SECRET changed: fall back to the Worker secret until the key is pasted again
    }
  }
  cache = { at: now(), key, meta };
  return cache;
}

/** The env every handler uses: the app's key in place of the Worker secret when one is saved. */
export async function withAiKey(env: Env): Promise<Env> {
  const { key } = await load(env);
  return key ? { ...env, ANTHROPIC_API_KEY: key } : env;
}

export interface AiKeyStatus {
  /** Which key the app is using now. */
  using: "app" | "worker" | "none";
  last4: string | null;
  savedAt: number | null;
  savedBy: string | null;
  /** A key is saved but can't be read (the app secret changed): paste it again. */
  unreadable: boolean;
  workerKey: boolean;
}

export async function aiKeyStatus(env: Env): Promise<AiKeyStatus> {
  cache = null;
  const { key, meta } = await load(env);
  return {
    using: key ? "app" : env.ANTHROPIC_API_KEY ? "worker" : "none",
    last4: key ? (meta?.last4 ?? null) : null,
    savedAt: meta?.at ?? null,
    savedBy: meta?.by ?? null,
    unreadable: !!meta && !key,
    workerKey: !!env.ANTHROPIC_API_KEY,
  };
}

/** One tiny request (1 output token on the smallest model) to prove the key works and its account has credit. */
export async function testAiKey(key: string, fetcher: typeof fetch = fetch): Promise<{ ok: true } | { ok: false; error: string }> {
  let res: Response;
  try {
    res = await fetcher("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: "claude-haiku-5-5", max_tokens: 1, messages: [{ role: "user", content: "Hi" }] }),
    });
  } catch {
    return { ok: false, error: "Couldn't reach Anthropic to check the key. Try again in a minute." };
  }
  if (res.ok || res.status === 429) return { ok: true }; // 429 = busy, but the key itself is good
  const text = await res.text().catch(() => "");
  let msg = "";
  try {
    msg = (JSON.parse(text) as { error?: { message?: string } }).error?.message ?? "";
  } catch {
    /* not JSON */
  }
  if (res.status === 401) return { ok: false, error: "Anthropic says that key isn't valid. Copy it again from console.anthropic.com → API keys." };
  if (/credit balance/i.test(msg))
    return { ok: false, error: "That key works, but its account has no credit left. Add credit in console.anthropic.com → Billing, or use a key from another account." };
  if (res.status === 403) return { ok: false, error: `Anthropic refused that key${msg ? `: ${msg}` : "."}` };
  return { ok: false, error: `Anthropic answered ${res.status}${msg ? `: ${msg}` : ""}. The key wasn't saved.` };
}

export const AI_KEY_RE = /^sk-ant-[A-Za-z0-9_-]{20,300}$/;

export async function saveAiKey(env: Env, key: string, by: string): Promise<void> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await cryptoKey(env), new TextEncoder().encode(key)));
  const stored: Stored = { iv: b64(iv), ct: b64(ct), last4: key.slice(-4), at: now(), by };
  await setSetting(env, AI_KEY_SETTING, JSON.stringify(stored));
  cache = null;
}

export async function clearAiKey(env: Env): Promise<void> {
  await env.DB.prepare("DELETE FROM settings WHERE key = ?").bind(AI_KEY_SETTING).run();
  cache = null;
}
