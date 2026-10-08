export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  JOBS: Queue<Job>;
  ASSETS: Fetcher;
  GOOGLE_PLACES_API_KEY: string;
  ANTHROPIC_API_KEY: string;
  CF_API_TOKEN: string;
  CF_ACCOUNT_ID: string;
  APP_SECRET: string;
}

export type Job =
  | {
      type: "search";
      runId: string;
      category: string;
      query: string;
      center?: { lat: number; lng: number };
      radiusMeters?: number;
      /** Also take businesses whose website is outdated or broken. */
      badSites?: boolean;
    }
  | { type: "build"; leadId: string };

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export function newId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

export function now(): number {
  return Date.now();
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Calendar date (YYYY-MM-DD) in Cullman's time zone, optionally some days ahead. */
export function localDate(addDays = 0, from = Date.now()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(from + addDays * 86_400_000));
}
