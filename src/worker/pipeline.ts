import Anthropic from "@anthropic-ai/sdk";
import { writeCopy } from "../copy/write.ts";
import { packFor } from "../generator/packs/index.ts";
import { pickDesign } from "../generator/design.ts";
import { buildSite } from "../generator/render.ts";
import type { BusinessRecord, CategoryId, Copy } from "../generator/types.ts";
import { RESTAURANT_FLAGS, searchText, type Place } from "../places/client.ts";
import { groupById, MARKET } from "../places/queries.ts";
import { qualify } from "../places/qualify.ts";
import { websiteProblem } from "../places/site-check.ts";
import { placeToRecord, reviewTexts } from "../places/to-record.ts";
import { addUsage, getLead, getSettings, MODEL_PRICES, updateLead, type LeadRow } from "./db.ts";
import { newId, now, type Env, type Job } from "./env.ts";

const SEARCH_PAGES = 2;
/** Website checks per search job (each is one outbound request). */
const MAX_SITE_CHECKS = 15;

export async function runSearch(env: Env, job: Extract<Job, { type: "search" }>): Promise<void> {
  const run = await env.DB.prepare("SELECT status, cap, categories FROM runs WHERE id = ?").bind(job.runId).first<{ status: string; cap: number; categories: string }>();
  if (!run || run.status === "cancelled") return;
  // Split the cap fairly so one category can't use up the whole run. Groups sharing a template share its slice.
  const categories = new Set(run.categories.split(",").map((g) => groupById(g)?.category ?? g));
  const categoryCap = Math.ceil(run.cap / Math.max(1, categories.size));
  const category = job.category as CategoryId;
  try {
    const places = await searchText(env.GOOGLE_PLACES_API_KEY, {
      textQuery: job.query,
      center: job.center ?? MARKET.center,
      radiusMeters: job.radiusMeters ?? MARKET.radiusMeters,
      extraFields: category === "restaurant" ? RESTAURANT_FLAGS : [],
      maxPages: SEARCH_PAGES,
    });
    await addUsage(env, { places: Math.min(SEARCH_PAGES, Math.ceil(places.length / 20) || 1) });

    const builds: Job[] = [];
    let checks = 0;
    for (const lead of qualify(places, { includeSites: job.badSites })) {
      const exists = await env.DB.prepare("SELECT 1 FROM leads WHERE place_id = ?").bind(lead.place.id).first();
      if (exists) continue;
      if (lead.presence === "has_site" || lead.presence === "free_builder") {
        if (checks >= MAX_SITE_CHECKS) continue;
        checks++;
        const problem = await websiteProblem(lead.place.websiteUri!);
        if (!problem) continue;
        lead.presence = "outdated";
        lead.reason = `${problem} · ${lead.place.userRatingCount ?? 0} Google reviews`;
      }
      const slot = await env.DB.prepare(
        "UPDATE runs SET queued = queued + 1 WHERE id = ? AND queued < cap AND (SELECT COUNT(*) FROM leads WHERE run_id = ? AND category = ?) < ? RETURNING queued",
      )
        .bind(job.runId, job.runId, category, categoryCap)
        .first();
      if (!slot) break;
      const p = lead.place;
      const id = newId();
      const inserted = await env.DB.prepare(
        `INSERT OR IGNORE INTO leads (id, place_id, run_id, category, name, phone, address, rating, review_count, presence, reason, score, status, place_json, lat, lng, fetched_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?, ?, ?, ?, ?)`,
      )
        .bind(id, p.id, job.runId, category, p.displayName?.text ?? "", p.nationalPhoneNumber ?? "", p.formattedAddress ?? "", p.rating ?? null, p.userRatingCount ?? null, lead.presence, lead.reason, lead.score, JSON.stringify(p), p.location?.latitude ?? null, p.location?.longitude ?? null, now(), now(), now())
        .run();
      if (!inserted.meta.changes) {
        await env.DB.prepare("UPDATE runs SET queued = queued - 1 WHERE id = ?").bind(job.runId).run();
        continue;
      }
      builds.push({ type: "build", leadId: id });
    }
    for (let i = 0; i < builds.length; i += 100) await env.JOBS.sendBatch(builds.slice(i, i + 100).map((body) => ({ body })));
  } finally {
    await env.DB.prepare("UPDATE runs SET searches_done = searches_done + 1 WHERE id = ?").bind(job.runId).run();
  }
}

/** Spreads looks and layouts across a category so neighboring businesses get different-looking sites. */
export async function chooseLook(env: Env, record: BusinessRecord, leadId: string, current?: string): Promise<string> {
  const pack = packFor(record.category);
  const rows = await env.DB.prepare("SELECT look, sales_status FROM leads WHERE category = ? AND look IS NOT NULL AND status != 'expired'")
    .bind(record.category)
    .all<{ look: string; sales_status: string }>();
  return pickDesign({
    leadId,
    looks: pack.looks,
    preferred: pack.defaultLook(record),
    used: rows.results.map((r) => r.look),
    taken: [...rows.results.filter((r) => r.sales_status === "sold" || r.sales_status === "live").map((r) => r.look), ...(current ? [current] : [])],
  });
}

export function heroFromPlace(record: BusinessRecord, place: Place): void {
  const photo = place.photos?.[0];
  if (!photo || (record.media.hero && record.media.hero.source !== "google")) return;
  const author = photo.authorAttributions?.[0];
  const w = Math.min(photo.widthPx, 1600);
  record.media.hero = {
    src: "/assets/img/hero.jpg",
    alt: "",
    source: "google",
    width: w,
    height: Math.round((w / photo.widthPx) * photo.heightPx),
    attribution: author ? { name: author.displayName, uri: author.uri } : undefined,
  };
}

/** Renders the preview into R2 under previews/<leadId>/ and stores the lint report. */
export async function renderPreview(env: Env, lead: LeadRow, record: BusinessRecord, copy: Copy, look: string): Promise<void> {
  const place = lead.place_json ? (JSON.parse(lead.place_json) as Place) : undefined;
  const out = await buildSite({
    record,
    copy,
    site: { slug: lead.id, look },
    mode: "preview",
    basePath: `/p/${lead.id}`,
    reviewTexts: place ? reviewTexts(place) : [],
  });
  await Promise.all(
    [...out.files].map(([path, content]) =>
      env.BUCKET.put(`previews/${lead.id}/${path}`, content, { httpMetadata: { contentType: contentType(path) } }),
    ),
  );
  await updateLead(env, lead.id, {
    status: "ready",
    error: null,
    record_json: JSON.stringify(record),
    copy_json: JSON.stringify(copy),
    look: out.look,
    lint_json: JSON.stringify({ ...out.lint, todos: out.todos, suggestions: out.suggestions }),
    // The call guide asks about what's still missing, so it's redone after any change.
    pitch_json: null,
    name: record.name,
  });
}

export async function runBuild(env: Env, job: Extract<Job, { type: "build" }>): Promise<void> {
  const lead = await getLead(env, job.leadId);
  if (!lead || !lead.place_json || lead.status === "expired") return;
  if (lead.status === "ready" && !lead.rewrite) return;
  await updateLead(env, lead.id, { status: "building", error: null });
  try {
    const place = JSON.parse(lead.place_json) as Place;
    const category = lead.category as CategoryId;
    const record: BusinessRecord = lead.record_json ? JSON.parse(lead.record_json) : placeToRecord(place, category);
    heroFromPlace(record, place);

    let copy: Copy | undefined = lead.copy_json && !lead.rewrite ? JSON.parse(lead.copy_json) : undefined;
    if (!copy) {
      const settings = await getSettings(env);
      const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
      const result = await writeCopy(client, {
        record,
        pack: packFor(category),
        reviewContext: reviewTexts(place),
        editorialSummary: place.editorialSummary?.text,
        primaryTypeLabel: place.primaryTypeDisplayName?.text,
        model: settings.copyModel,
      });
      const price = MODEL_PRICES[result.model] ?? MODEL_PRICES["claude-opus-5-5"]!;
      await addUsage(env, {
        aiIn: result.usage.input,
        aiOut: result.usage.output,
        costMicro: Math.round(result.usage.input * price.input + result.usage.output * price.output),
      });
      copy = result.copy;
      // Keep a Spanish page across an English rewrite; the owner can rewrite it from Edit.
      const old = lead.copy_json ? (JSON.parse(lead.copy_json) as Copy) : undefined;
      if (old?.es) copy.es = old.es;
    }
    const look = lead.look ?? (await chooseLook(env, record, lead.id));
    await renderPreview(env, lead, record, copy, look);
    if (lead.rewrite) await updateLead(env, lead.id, { rewrite: 0 });
  } catch (err) {
    await updateLead(env, lead.id, { status: "failed", error: (err as Error).message.slice(0, 500), rewrite: 0 });
  }
}

export function contentType(path: string): string {
  if (path.endsWith(".html")) return "text/html; charset=utf-8";
  if (path.endsWith(".css")) return "text/css; charset=utf-8";
  if (path.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (path.endsWith(".xml")) return "application/xml";
  if (path.endsWith(".txt")) return "text/plain; charset=utf-8";
  if (path.endsWith(".woff2")) return "font/woff2";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}
