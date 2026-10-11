import type { Env } from "./env.ts";

/**
 * Usage meter for the paid services the app calls (Costs & usage screen, `src/worker/costs.ts`).
 *
 * `installMeter()` wraps the global `fetch` once per isolate and recognises the hosts we pay for: every Places request,
 * Brave search, email and push is counted; Anthropic responses have their `usage` block read (a clone of the body, so the SDK
 * still gets its stream) and the tokens are counted per model. Counts collect in memory and `flushUsage(env)` adds them to
 * D1 `usage_daily` (one row per day and metric) at the end of each request, queue batch and cron run. An isolate that dies
 * before a flush loses a few counts; this is a cost estimate, not an invoice. Metric names:
 *   places.search · places.details · places.photo · brave.search · email.sent · push.sent · openfoodfacts.lookup
 *   anthropic.<model>.calls · .in · .out · .cache_read · .cache_write
 */

const pending = new Map<string, number>();
const inflight = new Set<Promise<unknown>>();
let installed = false;

export function recordUsage(metric: string, qty = 1): void {
  if (!metric || !(qty > 0)) return;
  pending.set(metric, (pending.get(metric) ?? 0) + qty);
}

/** Which metric a request to `url` counts as (null = not a service we pay for). Exported for tests. */
export function classify(url: string, method = "GET"): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const h = u.hostname;
  if (h === "places.googleapis.com") {
    if (
      u.pathname.endsWith(":searchText") ||
      u.pathname.endsWith(":searchNearby")
    )
      return "places.search";
    if (u.pathname.includes("/photos/") && u.pathname.endsWith("/media"))
      return "places.photo";
    if (/^\/v1\/places\/[^/]+$/.test(u.pathname)) return "places.details";
    return null;
  }
  if (h === "api.search.brave.com") return "brave.search";
  if (h === "api.resend.com" || h === "api.mailersend.com")
    return method === "POST" ? "email.sent" : null;
  if (h === "fcm.googleapis.com") return method === "POST" ? "push.sent" : null;
  if (h.endsWith("openfoodfacts.org")) return "openfoodfacts.lookup";
  if (h === "api.anthropic.com")
    return u.pathname.startsWith("/v1/messages") && method === "POST"
      ? "anthropic"
      : null;
  return null;
}

/** Token counts out of a Messages API response body. Exported for tests. */
export function anthropicUsage(body: unknown): Record<string, number> | null {
  const j = body as {
    model?: string;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_read_input_tokens?: number;
      cache_creation_input_tokens?: number;
    };
  } | null;
  if (!j || typeof j !== "object" || !j.usage) return null;
  const model = String(j.model ?? "unknown").replace(/[^a-z0-9.-]/gi, "");
  const u = j.usage;
  const out: Record<string, number> = { [`anthropic.${model}.calls`]: 1 };
  const add = (k: string, n: number | undefined) => {
    if (n && n > 0) out[`anthropic.${model}.${k}`] = n;
  };
  add("in", u.input_tokens);
  add("out", u.output_tokens);
  add("cache_read", u.cache_read_input_tokens);
  add("cache_write", u.cache_creation_input_tokens);
  return out;
}

function urlOf(input: RequestInfo | URL): string {
  return typeof input === "string"
    ? input
    : input instanceof URL
      ? input.href
      : input.url;
}

/** Wraps global fetch (once). Safe to call many times; a no-op where fetch can't be replaced. */
export function installMeter(): void {
  if (installed) return;
  const real = globalThis.fetch;
  if (typeof real !== "function") return;
  const metered: typeof fetch = async (input, init) => {
    const method = (
      init?.method ?? (input instanceof Request ? input.method : "GET")
    ).toUpperCase();
    const metric = classify(urlOf(input), method);
    const res = await real(input, init);
    if (!metric) return res;
    if (metric !== "anthropic") {
      recordUsage(metric);
      return res;
    }
    if (
      res.ok &&
      (res.headers.get("content-type") ?? "").includes("application/json")
    ) {
      const p = res
        .clone()
        .json()
        .then((j) => {
          const u = anthropicUsage(j);
          if (u) for (const [k, n] of Object.entries(u)) recordUsage(k, n);
        })
        .catch(() => undefined)
        .finally(() => inflight.delete(p));
      inflight.add(p);
    } else recordUsage("anthropic.unknown.calls");
    return res;
  };
  try {
    globalThis.fetch = metered;
    installed = true;
  } catch {
    /* read-only fetch: no metering */
  }
}

/** Everything counted so far, zeroing the buffer. Exported for tests and for the flush. */
export async function drainUsage(): Promise<Map<string, number>> {
  if (inflight.size) await Promise.allSettled([...inflight]);
  const out = new Map(pending);
  pending.clear();
  return out;
}

/** Adds the buffered counts to `usage_daily` for today (UTC day; the Costs screen sums by month). */
export async function flushUsage(env: Env): Promise<void> {
  const counts = await drainUsage();
  if (!counts.size) return;
  const day = new Date().toISOString().slice(0, 10);
  try {
    const stmt = env.DB.prepare(
      "INSERT INTO usage_daily (day, metric, qty) VALUES (?, ?, ?) ON CONFLICT(day, metric) DO UPDATE SET qty = qty + excluded.qty",
    );
    await env.DB.batch(
      [...counts].map(([metric, qty]) => stmt.bind(day, metric, qty)),
    );
  } catch (err) {
    console.error("usage flush failed", err);
    for (const [k, n] of counts) recordUsage(k, n); // try again next time
  }
}
