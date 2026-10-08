import { z } from "zod";
import { LOOKS } from "../generator/themes.ts";
import { menuToText } from "../generator/menu.ts";
import { packFor } from "../generator/packs/index.ts";
import type { BusinessRecord, CategoryId, Copy } from "../generator/types.ts";
import { CATEGORY_LABELS, QUERIES } from "../places/queries.ts";
import Anthropic from "@anthropic-ai/sdk";
import { writePitch } from "../copy/pitch.ts";
import { reviewTexts } from "../places/to-record.ts";
import type { Place } from "../places/client.ts";
import { checkPassword, clearCookie, hasOwner, isLoggedIn, loginAllowed, recordLoginFailure, sessionCookie, setupOwner, shareToken, verifyShare } from "./auth.ts";
import { addUsage, getLead, getSettings, MODEL_PRICES, setSetting, updateLead, type LeadRow, type RunRow } from "./db.ts";
import { applyEdits, EditsSchema } from "./edits.ts";
import { HttpError, json, newId, now, type Env, type Job } from "./env.ts";
import { handleFormPost } from "./forms.ts";
import { renderPreview, runBuild, runSearch } from "./pipeline.ts";
import { servePreview } from "./preview.ts";
import { publishLead, zipLead } from "./publish.ts";

const PLACES_COST_PER_REQUEST = 0.04;
const PHOTO_COST = 0.007;

async function body<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  let data: unknown;
  try {
    data = await req.json();
  } catch {
    throw new HttpError(400, "Expected JSON");
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new HttpError(400, parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  return parsed.data;
}

function summary(l: LeadRow) {
  const lint = l.lint_json ? (JSON.parse(l.lint_json) as { publishBlockers: string[]; errors: string[]; todos: string[] }) : null;
  return {
    id: l.id,
    runId: l.run_id,
    category: l.category,
    name: l.name,
    phone: l.phone,
    address: l.address,
    rating: l.rating,
    reviewCount: l.review_count,
    presence: l.presence,
    reason: l.reason,
    score: l.score,
    status: l.status,
    salesStatus: l.sales_status,
    look: l.look,
    error: l.error,
    liveUrl: l.live_url,
    hasPitch: !!l.pitch_json,
    todos: lint?.todos.length ?? 0,
    blockers: lint ? lint.publishBlockers.length + lint.errors.length : null,
    createdAt: l.created_at,
  };
}

function detail(l: LeadRow) {
  const record = l.record_json ? (JSON.parse(l.record_json) as BusinessRecord) : null;
  const copy = l.copy_json ? (JSON.parse(l.copy_json) as Copy) : null;
  const lint = l.lint_json ? JSON.parse(l.lint_json) : null;
  const pack = packFor(l.category as CategoryId);
  return {
    ...summary(l),
    record,
    copy,
    lint,
    menuText: record?.ext.restaurant?.menu ? menuToText(record.ext.restaurant.menu.sections) : "",
    variantLabel: record ? pack.variantLabel(record) : null,
    looks: pack.looks.map((id) => ({ id, name: LOOKS[id]?.name ?? id })),
  };
}

async function deletePrefix(env: Env, prefix: string): Promise<void> {
  let cursor: string | undefined;
  do {
    const list = await env.BUCKET.list({ prefix, cursor });
    if (list.objects.length) await env.BUCKET.delete(list.objects.map((o) => o.key));
    cursor = list.truncated ? list.cursor : undefined;
  } while (cursor);
}

async function requireLead(env: Env, id: string): Promise<LeadRow> {
  const lead = await getLead(env, id);
  if (!lead) throw new HttpError(404, "Lead not found");
  return lead;
}

async function api(env: Env, req: Request, url: URL): Promise<Response> {
  const path = url.pathname.replace(/^\/api/, "");
  const m = req.method;

  // CSRF guard: browsers can't add custom headers to cross-site form posts.
  if (m !== "GET" && req.headers.get("x-wb") !== "1") throw new HttpError(403, "Missing request header");

  if (path === "/auth/state" && m === "GET") return json({ hasOwner: await hasOwner(env), loggedIn: await isLoggedIn(env, req) });
  if (path === "/auth/setup" && m === "POST") {
    const { password } = await body(req, z.object({ password: z.string().max(200) }));
    await setupOwner(env, password);
    return json({ ok: true }, 200, { "set-cookie": await sessionCookie(env) });
  }
  if (path === "/auth/login" && m === "POST") {
    if (!(await loginAllowed(env))) throw new HttpError(429, "Too many tries. Wait 15 minutes and try again.");
    const { password } = await body(req, z.object({ password: z.string().max(200) }));
    if (!(await checkPassword(env, password))) {
      await recordLoginFailure(env);
      throw new HttpError(401, "Wrong password");
    }
    return json({ ok: true }, 200, { "set-cookie": await sessionCookie(env) });
  }
  if (path === "/auth/logout" && m === "POST") return json({ ok: true }, 200, { "set-cookie": clearCookie() });

  if (!(await isLoggedIn(env, req))) throw new HttpError(401, "Please log in");

  if (path === "/meta" && m === "GET") {
    const settings = await getSettings(env);
    return json({
      categories: Object.keys(QUERIES).map((id) => ({ id, label: CATEGORY_LABELS[id as CategoryId] ?? id })),
      models: Object.entries(MODEL_PRICES).map(([id, p]) => ({ id, label: p.label })),
      settings,
    });
  }

  if (path === "/settings" && m === "PUT") {
    const s = await body(
      req,
      z.object({
        defaultCap: z.number().int().min(1).max(500),
        copyModel: z.enum(Object.keys(MODEL_PRICES) as [string, ...string[]]),
        companyName: z.string().trim().max(80).optional(),
        callerName: z.string().trim().max(60).optional(),
        setupPrice: z.number().min(0).max(100_000).optional(),
        monthlyPrice: z.number().min(0).max(10_000).optional(),
        offerIncludes: z.string().trim().max(500).optional(),
      }),
    );
    const before = await getSettings(env);
    await setSetting(env, "app_settings", JSON.stringify(s));
    const salesKeys = ["companyName", "callerName", "setupPrice", "monthlyPrice", "offerIncludes"] as const;
    // Call guides quote these, so saved guides are rewritten on next open.
    if (salesKeys.some((k) => before[k] !== s[k])) await env.DB.prepare("UPDATE leads SET pitch_json = NULL WHERE pitch_json IS NOT NULL").run();
    return json({ ok: true });
  }

  if (path === "/runs" && m === "POST") {
    const input = await body(req, z.object({ categories: z.array(z.string()).min(1).max(6), cap: z.number().int().min(1).max(500) }));
    const cats = input.categories.filter((c) => QUERIES[c as CategoryId]);
    if (!cats.length) throw new HttpError(400, "Pick at least one category");
    const jobs: Job[] = cats.flatMap((c) => (QUERIES[c as CategoryId] ?? []).map((query) => ({ type: "search" as const, runId: "", category: c, query })));
    const id = newId();
    await env.DB.prepare("INSERT INTO runs (id, created_at, categories, cap, searches_total) VALUES (?, ?, ?, ?, ?)")
      .bind(id, now(), cats.join(","), input.cap, jobs.length)
      .run();
    await env.JOBS.sendBatch(jobs.map((j) => ({ body: { ...j, runId: id } as Job })));
    return json({ id });
  }

  if (path === "/runs" && m === "GET") {
    const runs = await env.DB.prepare("SELECT * FROM runs ORDER BY created_at DESC LIMIT 10").all<RunRow>();
    const out = [];
    for (const r of runs.results) {
      const counts = await env.DB.prepare("SELECT status, COUNT(*) AS n FROM leads WHERE run_id = ? GROUP BY status").bind(r.id).all<{ status: string; n: number }>();
      const by = Object.fromEntries(counts.results.map((c) => [c.status, c.n]));
      const searching = r.searches_done < r.searches_total;
      const pending = (by.queued ?? 0) + (by.building ?? 0);
      out.push({
        id: r.id,
        createdAt: r.created_at,
        categories: r.categories.split(","),
        cap: r.cap,
        searchesDone: r.searches_done,
        searchesTotal: r.searches_total,
        counts: by,
        done: !searching && pending === 0,
      });
    }
    return json({ runs: out });
  }

  if (path === "/leads" && m === "GET") {
    const where: string[] = ["status != 'expired'"];
    const binds: unknown[] = [];
    const sales = url.searchParams.get("sales");
    const category = url.searchParams.get("category");
    if (sales) {
      where.push("sales_status = ?");
      binds.push(sales);
    }
    if (category) {
      where.push("category = ?");
      binds.push(category);
    }
    const rows = await env.DB.prepare(`SELECT * FROM leads WHERE ${where.join(" AND ")} ORDER BY score DESC LIMIT 500`)
      .bind(...binds)
      .all<LeadRow>();
    return json({ leads: rows.results.map(summary) });
  }

  const leadMatch = /^\/leads\/([a-z0-9]+)(\/[a-z]+)?$/.exec(path);
  if (leadMatch) {
    const id = leadMatch[1]!;
    const action = leadMatch[2] ?? "";
    const lead = await requireLead(env, id);

    if (action === "" && m === "GET") return json(detail(lead));
    if (action === "" && m === "DELETE") {
      if (lead.sales_status === "live") throw new HttpError(409, "This site is live. It can't be deleted from here.");
      await deletePrefix(env, `previews/${id}/`);
      await deletePrefix(env, `owner/${id}/`);
      await env.DB.prepare("DELETE FROM leads WHERE id = ?").bind(id).run();
      return json({ ok: true });
    }
    if (action === "/status" && m === "POST") {
      const { salesStatus } = await body(req, z.object({ salesStatus: z.enum(["new", "shown", "sold", "not_interested"]) }));
      if (lead.sales_status === "live") throw new HttpError(409, "This site is already live");
      await updateLead(env, id, { sales_status: salesStatus });
      return json({ ok: true });
    }
    if (action === "/edits" && m === "PUT") {
      if (!lead.record_json || !lead.copy_json) throw new HttpError(409, "This site hasn't finished building yet");
      const edits = await body(req, EditsSchema);
      const next = applyEdits(JSON.parse(lead.record_json), JSON.parse(lead.copy_json), edits);
      await renderPreview(env, lead, next.record, next.copy, next.look ?? lead.look ?? "");
      return json(detail((await getLead(env, id))!));
    }
    if (action === "/photo" && m === "POST") {
      if (!lead.record_json || !lead.copy_json) throw new HttpError(409, "This site hasn't finished building yet");
      const type = req.headers.get("content-type") ?? "";
      const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[type];
      if (!ext) throw new HttpError(415, "Send a JPEG, PNG or WebP photo");
      const bytes = await req.arrayBuffer();
      if (bytes.byteLength > 8_000_000) throw new HttpError(413, "That photo is over 8 MB");
      await deletePrefix(env, `owner/${id}/hero.`);
      await env.BUCKET.put(`owner/${id}/hero.${ext}`, bytes, { httpMetadata: { contentType: type } });
      const record = JSON.parse(lead.record_json) as BusinessRecord;
      const w = Number(url.searchParams.get("w")) || undefined;
      const h = Number(url.searchParams.get("h")) || undefined;
      record.media.hero = { src: `/assets/owner/hero.${ext}`, alt: url.searchParams.get("alt")?.slice(0, 150) || `${record.name}`, source: "owner", width: w, height: h };
      await renderPreview(env, lead, record, JSON.parse(lead.copy_json), lead.look ?? "");
      return json(detail((await getLead(env, id))!));
    }
    if (action === "/rewrite" && m === "POST") {
      await updateLead(env, id, { rewrite: 1, status: "queued" });
      await env.JOBS.send({ type: "build", leadId: id });
      return json({ ok: true });
    }
    if (action === "/retry" && m === "POST") {
      if (lead.status !== "failed") throw new HttpError(409, "Only failed builds can be retried");
      await updateLead(env, id, { status: "queued", error: null });
      await env.JOBS.send({ type: "build", leadId: id });
      return json({ ok: true });
    }
    if (action === "/publish" && m === "POST") return json(await publishLead(env, lead, url.origin));
    if (action === "/share" && m === "POST") {
      if (lead.status !== "ready") throw new HttpError(409, "The preview isn't ready yet");
      const token = await shareToken(env, id);
      return json({ url: `${url.origin}/s/${token}/`, expiresInDays: 14 });
    }
    if (action === "/pitch" && (m === "GET" || m === "POST")) {
      if (m === "GET" && lead.pitch_json) return json({ pitch: JSON.parse(lead.pitch_json) });
      if (!lead.record_json || !lead.lint_json) throw new HttpError(409, "The preview isn't ready yet");
      const settings = await getSettings(env);
      const lint = JSON.parse(lead.lint_json) as { todos?: string[]; suggestions?: string[] };
      const place = lead.place_json ? (JSON.parse(lead.place_json) as Place) : undefined;
      const record = JSON.parse(lead.record_json) as BusinessRecord;
      const result = await writePitch(new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }), {
        record,
        pack: packFor(record.category),
        reason: lead.reason ?? "",
        reviewContext: place ? reviewTexts(place) : [],
        todos: lint.todos ?? [],
        suggestions: lint.suggestions ?? [],
        sales: settings,
        model: settings.copyModel,
      });
      const price = MODEL_PRICES[result.model] ?? MODEL_PRICES["claude-opus-5-5"]!;
      await addUsage(env, { aiIn: result.usage.input, aiOut: result.usage.output, costMicro: Math.round(result.usage.input * price.input + result.usage.output * price.output) });
      await updateLead(env, id, { pitch_json: JSON.stringify(result.pitch) });
      return json({ pitch: result.pitch });
    }
    if (action === "/zip" && m === "GET") {
      const zip = await zipLead(env, lead, url.origin);
      const name = (lead.pages_project ?? lead.name ?? "site").replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
      return new Response(zip, { headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${name}.zip"` } });
    }
  }

  if (path === "/inbox" && m === "GET") {
    const rows = await env.DB.prepare(
      "SELECT s.id, s.lead_id, s.created_at, s.data_json, s.read, l.name AS business FROM submissions s LEFT JOIN leads l ON l.id = s.lead_id ORDER BY s.created_at DESC LIMIT 200",
    ).all<{ id: string; lead_id: string; created_at: number; data_json: string; read: number; business: string }>();
    return json({
      items: rows.results.map((r) => ({ id: r.id, leadId: r.lead_id, business: r.business, createdAt: r.created_at, read: !!r.read, data: JSON.parse(r.data_json) })),
    });
  }
  const inboxMatch = /^\/inbox\/([a-z0-9]+)\/read$/.exec(path);
  if (inboxMatch && m === "POST") {
    await env.DB.prepare("UPDATE submissions SET read = 1 WHERE id = ?").bind(inboxMatch[1]).run();
    return json({ ok: true });
  }

  if (path === "/usage" && m === "GET") {
    const all = await env.DB.prepare(
      "SELECT COALESCE(SUM(places_requests),0) AS places, COALESCE(SUM(photo_requests),0) AS photos, COALESCE(SUM(ai_input),0) AS aiIn, COALESCE(SUM(ai_output),0) AS aiOut, COALESCE(SUM(ai_cost_microdollars),0) AS aiMicro FROM usage WHERE day >= ?",
    )
      .bind(new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10))
      .first<{ places: number; photos: number; aiIn: number; aiOut: number; aiMicro: number }>();
    const u = all ?? { places: 0, photos: 0, aiIn: 0, aiOut: 0, aiMicro: 0 };
    return json({
      last30Days: {
        googleRequests: u.places,
        googlePhotos: u.photos,
        googleCostEstimate: Math.round((u.places * PLACES_COST_PER_REQUEST + u.photos * PHOTO_COST) * 100) / 100,
        aiTokensIn: u.aiIn,
        aiTokensOut: u.aiOut,
        aiCost: Math.round(u.aiMicro / 10_000) / 100,
      },
    });
  }

  throw new HttpError(404, "Not found");
}

/** Serves a preview through a share link: rewrites internal links to the share path and adds a preview banner. */
async function serveShared(env: Env, req: Request, leadId: string, token: string, rest: string): Promise<Response> {
  const res = await servePreview(env, req, leadId, rest);
  const type = res.headers.get("content-type") ?? "";
  if (!type.startsWith("text/html") && !type.startsWith("text/css")) return res;
  let text = (await res.text()).split(`/p/${leadId}/`).join(`/s/${token}/`);
  if (type.startsWith("text/html")) {
    const lead = await getLead(env, leadId);
    const settings = await getSettings(env);
    const name = (lead?.name ?? "your business").replace(/[<>&"]/g, "");
    const from = settings.companyName ? ` by ${settings.companyName.replace(/[<>&"]/g, "")}` : "";
    const banner = `<div role="note" style="position:relative;z-index:60;background:#14213d;color:#fff;font:600 14px/1.4 system-ui,sans-serif;padding:10px 16px;text-align:center">Free preview made for ${name}${from}. Not live yet; photos and details will be checked with you first.</div>`;
    text = text.replace(/<body([^>]*)>/, `<body$1>${banner}`);
  }
  const headers = new Headers(res.headers);
  headers.delete("content-length");
  return new Response(text, { status: res.status, headers });
}

async function expireStaleLeads(env: Env): Promise<void> {
  const cutoffNew = now() - 30 * 86_400_000;
  const cutoffShown = now() - 60 * 86_400_000;
  const stale = await env.DB.prepare(
    "SELECT id FROM leads WHERE status != 'expired' AND ((sales_status = 'new' AND created_at < ?) OR (sales_status = 'shown' AND created_at < ?)) LIMIT 200",
  )
    .bind(cutoffNew, cutoffShown)
    .all<{ id: string }>();
  for (const { id } of stale.results) {
    await deletePrefix(env, `previews/${id}/`);
    await deletePrefix(env, `owner/${id}/`);
    // Keep only the Place ID (allowed indefinitely) so the lead isn't re-found as new.
    await updateLead(env, id, { status: "expired", place_json: null, record_json: null, copy_json: null, lint_json: null, name: null, phone: null, address: null });
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    try {
      if (url.pathname.startsWith("/api/")) return await api(env, req, url);
      const preview = /^\/p\/([a-z0-9]+)(\/.*)?$/.exec(url.pathname);
      if (preview) {
        if (!(await isLoggedIn(env, req))) return Response.redirect(`${url.origin}/?next=${encodeURIComponent(url.pathname)}`, 302);
        if (!url.pathname.startsWith(`/p/${preview[1]}/`)) return Response.redirect(`${url.origin}/p/${preview[1]}/`, 301);
        return await servePreview(env, req, preview[1]!, preview[2] ?? "/");
      }
      const share = /^\/s\/([a-z0-9]+)\.(\d+)\.([A-Za-z0-9_-]+)(\/.*)?$/.exec(url.pathname);
      if (share) {
        const [, leadId, exp, sig, rest] = share as unknown as [string, string, string, string, string | undefined];
        if (!(await verifyShare(env, leadId, exp, sig))) {
          return new Response("This preview link has expired. Ask us for a new one.", { status: 410, headers: { "content-type": "text/plain; charset=utf-8", "x-robots-tag": "noindex" } });
        }
        const token = `${leadId}.${exp}.${sig}`;
        if (!rest) return Response.redirect(`${url.origin}/s/${token}/`, 301);
        return await serveShared(env, req, leadId, token, rest);
      }
      const form = /^\/f\/([a-z0-9]+)$/.exec(url.pathname);
      if (form && req.method === "POST") return await handleFormPost(env, req, form[1]!);
      return env.ASSETS.fetch(req);
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message, ...err.extra }, err.status);
      console.error(err);
      return json({ error: "Something went wrong. Try again." }, 500);
    }
  },

  async queue(batch: MessageBatch<Job>, env: Env): Promise<void> {
    for (const msg of batch.messages) {
      try {
        if (msg.body.type === "search") await runSearch(env, msg.body);
        else if (msg.body.type === "build") await runBuild(env, msg.body);
      } catch (err) {
        console.error("job failed", msg.body, err);
      }
      msg.ack();
    }
  },

  async scheduled(_event: ScheduledController, env: Env): Promise<void> {
    await expireStaleLeads(env);
  },
} satisfies ExportedHandler<Env, Job>;
