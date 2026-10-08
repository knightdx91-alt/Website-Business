import type { Env } from "./env.ts";
import { today } from "./env.ts";

export interface LeadRow {
  id: string;
  place_id: string;
  run_id: string | null;
  category: string;
  name: string | null;
  phone: string | null;
  address: string | null;
  rating: number | null;
  review_count: number | null;
  presence: string | null;
  reason: string | null;
  score: number;
  status: "queued" | "building" | "ready" | "failed" | "expired";
  sales_status: "new" | "shown" | "sold" | "live" | "not_interested";
  place_json: string | null;
  record_json: string | null;
  copy_json: string | null;
  look: string | null;
  lint_json: string | null;
  pitch_json: string | null;
  error: string | null;
  rewrite: number;
  pages_project: string | null;
  live_url: string | null;
  published_at: number | null;
  fetched_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface RunRow {
  id: string;
  created_at: number;
  categories: string;
  cap: number;
  queued: number;
  searches_total: number;
  searches_done: number;
  status: string;
}

export async function getSetting(env: Env, key: string): Promise<string | null> {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first<{ value: string }>();
  return row?.value ?? null;
}

export async function setSetting(env: Env, key: string, value: string): Promise<void> {
  await env.DB.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(key, value).run();
}

export interface AppSettings {
  defaultCap: number;
  copyModel: string;
  companyName?: string;
  callerName?: string;
  setupPrice?: number;
  monthlyPrice?: number;
  offerIncludes?: string;
}

export const MODEL_PRICES: Record<string, { input: number; output: number; label: string }> = {
  "claude-opus-5-5": { input: 4, output: 20, label: "Claude Opus 5.5 (best writing)" },
  "claude-sonnet-5-5": { input: 2, output: 10, label: "Claude Sonnet 5.5 (about half the cost)" },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, label: "Claude Haiku 5.5 (cheapest)" },
};

export async function getSettings(env: Env): Promise<AppSettings> {
  const raw = await getSetting(env, "app_settings");
  const s = raw ? (JSON.parse(raw) as Partial<AppSettings>) : {};
  return {
    ...s,
    defaultCap: s.defaultCap ?? 50,
    copyModel: s.copyModel && MODEL_PRICES[s.copyModel] ? s.copyModel : "claude-opus-5-5",
  };
}

export async function getLead(env: Env, id: string): Promise<LeadRow | null> {
  return env.DB.prepare("SELECT * FROM leads WHERE id = ?").bind(id).first<LeadRow>();
}

export async function updateLead(env: Env, id: string, fields: Partial<LeadRow>): Promise<void> {
  const entries = Object.entries({ ...fields, updated_at: Date.now() });
  await env.DB.prepare(`UPDATE leads SET ${entries.map(([k]) => `${k} = ?`).join(", ")} WHERE id = ?`)
    .bind(...entries.map(([, v]) => (v === undefined ? null : v)), id)
    .run();
}

export async function addUsage(env: Env, u: { places?: number; photos?: number; aiIn?: number; aiOut?: number; costMicro?: number }): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO usage (day, places_requests, photo_requests, ai_input, ai_output, ai_cost_microdollars) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(day) DO UPDATE SET places_requests = places_requests + excluded.places_requests, photo_requests = photo_requests + excluded.photo_requests,
     ai_input = ai_input + excluded.ai_input, ai_output = ai_output + excluded.ai_output, ai_cost_microdollars = ai_cost_microdollars + excluded.ai_cost_microdollars`,
  )
    .bind(today(), u.places ?? 0, u.photos ?? 0, u.aiIn ?? 0, u.aiOut ?? 0, u.costMicro ?? 0)
    .run();
}
