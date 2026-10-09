import { layoutOf } from "../generator/design.ts";
import { LAYOUT_IDS, LAYOUTS } from "../generator/layouts.ts";
import { z } from "zod";
import { LOOKS, parseDesign } from "../generator/themes.ts";
import { menuToText } from "../generator/menu.ts";
import { packFor } from "../generator/packs/index.ts";
import type { BusinessRecord, CategoryId, Copy } from "../generator/types.ts";
import { groupById, MARKET, SEARCH_GROUPS, searchesFor } from "../places/queries.ts";
import Anthropic from "@anthropic-ai/sdk";
import { writePitch } from "../copy/pitch.ts";
import { profileTextProblems, writeMonthlyPosts, writeProfileKit, writeReviewReply, type GbpPost, type ProfileKit } from "../copy/gbp.ts";
import { reviewTexts } from "../places/to-record.ts";
import { getPlace, RESTAURANT_FLAGS, searchText, type Place } from "../places/client.ts";
import { guessCategory, isChain, scorePlace, webPresence, type WebPresence } from "../places/qualify.ts";
import { addCaller, checkPassword, clearCookie, getSession, hasOwner, listCallers, loginAllowed, recordLoginFailure, removeCaller, sessionCookie, setupOwner, shareToken, signupToken, updateCaller, verifyShare, verifySignup } from "./auth.ts";
import { previewFlyer, reviewCards } from "./cards.ts";
import { COMPANY_HOSTS, COMPANY_LEAD_ID, serveCompany } from "./company.ts";
import { addDomain, getDomain, removeDomain, type PagesDomain } from "./pages.ts";
import { salesDashboard } from "./sales.ts";
import { serveSignup, signupsFor } from "./signup.ts";
import { recordHit, siteReport } from "./stats.ts";
import { addUsage, billingOptions, defaultTerms, getLead, getSettings, MODEL_PRICES, setSetting, updateLead, type LeadRow, type RunRow } from "./db.ts";
import { applyEdits, EditsSchema } from "./edits.ts";
import { HttpError, json, localDate, newId, now, type Env, type Job } from "./env.ts";
import { handleFormPost } from "./forms.ts";
import { allowedEndpoint, latestForPush, listEvents, markSeen, notify, pushTo, unreadCount, vapidPublicKey } from "./notify.ts";
import { stripeWebhook } from "./stripe.ts";
import { chooseLook, renderPreview, runBuild, runSearch } from "./pipeline.ts";
import { servePreview } from "./preview.ts";
import { publishLead, zipLead } from "./publish.ts";

/** Lets the Android app (android/) open this site full-screen. The fingerprint is the app's public signing certificate. */
const ASSET_LINKS = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "com.knightdx91.websitebusiness",
      // Every signing key the app has shipped with, so older installs stay full-screen: 1.0-1.1, then 1.2.
      sha256_cert_fingerprints: [
        "62:7F:C0:94:66:E4:CB:F7:D2:A7:AC:60:BA:D2:48:34:0C:3B:58:B2:06:26:99:5D:83:94:7F:B7:36:CC:FD:FA",
        "AB:07:5A:34:16:59:24:70:46:74:79:CF:E8:8A:47:5B:76:01:C3:27:49:F0:BD:08:16:EE:B5:18:50:CE:A3:16",
      ],
    },
  },
];

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
    followUp: l.follow_up,
    lastContact: l.last_contact,
    placeId: l.place_id,
    lat: l.lat,
    lng: l.lng,
    customDomain: l.custom_domain,
    previewOpens: l.preview_opens ?? 0,
    previewOpenedAt: l.preview_opened_at,
    todos: lint?.todos.length ?? 0,
    blockers: lint ? lint.publishBlockers.length + lint.errors.length : null,
    createdAt: l.created_at,
  };
}

interface NoteRow {
  id: string;
  lead_id: string;
  author: string;
  outcome: string | null;
  body: string;
  created_at: number;
}

const OUTCOMES = ["note", "no_answer", "callback", "shown", "sold", "not_interested"] as const;
const OUTCOME_STATUS: Partial<Record<(typeof OUTCOMES)[number], LeadRow["sales_status"]>> = { shown: "shown", sold: "sold", not_interested: "not_interested" };
const PAY_LINK = z.string().trim().url().max(500).refine((u) => u.startsWith("https://"), "Payment links must start with https://");
const CALLER_NAME = z.string().trim().min(1).max(60).regex(/^[^\u0000-\u001f"\\<>]+$/, "Use letters and spaces only");
const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 2026-10-09");

async function notesFor(env: Env, leadId: string) {
  const rows = await env.DB.prepare("SELECT * FROM lead_notes WHERE lead_id = ? ORDER BY created_at DESC LIMIT 100").bind(leadId).all<NoteRow>();
  return rows.results.map((n) => ({ id: n.id, author: n.author, outcome: n.outcome, body: n.body, createdAt: n.created_at }));
}

/** Call guides name the caller; swap the cached name for whoever is opening it instead of paying for a rewrite. */
function pitchFor(raw: string, callerName: string | undefined): unknown {
  const { _caller, ...pitch } = JSON.parse(raw) as { _caller?: string };
  if (!_caller || !callerName || _caller === callerName) return pitch;
  return JSON.parse(JSON.stringify(pitch).split(_caller).join(callerName.replace(/["\\]/g, "")));
}

interface GbpState {
  checks: Record<string, boolean>;
  kit?: ProfileKit & { createdAt: number; problems: string[] };
  posts: Array<GbpPost & { id: string; month: string; status: "draft" | "posted"; createdAt: number; problems: string[] }>;
  notes?: string;
}

function gbpState(l: LeadRow): GbpState {
  return l.gbp_json ? (JSON.parse(l.gbp_json) as GbpState) : { checks: {}, posts: [] };
}

async function chargeAi(env: Env, model: string, usage: { input: number; output: number }): Promise<void> {
  const price = MODEL_PRICES[model] ?? MODEL_PRICES["claude-opus-5-5"]!;
  await addUsage(env, { aiIn: usage.input, aiOut: usage.output, costMicro: Math.round(usage.input * price.input + usage.output * price.output) });
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
    layouts: LAYOUT_IDS.map((id) => ({ id, name: LAYOUTS[id].name, about: LAYOUTS[id].about })),
    layout: l.look ? layoutOf(l.look) : null,
    lookBase: l.look ? parseDesign(l.look).look : null,
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

/** Showing someone their preview books a check-in 2 days out, unless a callback is already coming up. */
function autoCallback(lead: LeadRow): { follow_up: string } | Record<string, never> {
  return lead.follow_up && lead.follow_up >= localDate() ? {} : { follow_up: localDate(2) };
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

  if (path === "/auth/state" && m === "GET") {
    const session = await getSession(env, req);
    return json({ hasOwner: await hasOwner(env), loggedIn: !!session, role: session?.role ?? null, name: session?.name ?? null });
  }
  if (path === "/auth/setup" && m === "POST") {
    const { password } = await body(req, z.object({ password: z.string().max(200) }));
    await setupOwner(env, password);
    return json({ ok: true }, 200, { "set-cookie": await sessionCookie(env, { role: "owner", userId: "owner", name: "Owner" }) });
  }
  if (path === "/auth/login" && m === "POST") {
    if (!(await loginAllowed(env))) throw new HttpError(429, "Too many tries. Wait 15 minutes and try again.");
    const { password } = await body(req, z.object({ password: z.string().max(200) }));
    const who = await checkPassword(env, password);
    if (!who) {
      await recordLoginFailure(env);
      throw new HttpError(401, "Wrong password");
    }
    return json({ ok: true, role: who.role }, 200, { "set-cookie": await sessionCookie(env, who) });
  }
  if (path === "/auth/logout" && m === "POST") return json({ ok: true }, 200, { "set-cookie": clearCookie() });

  const session = await getSession(env, req);
  if (!session) throw new HttpError(401, "Please log in");
  const isOwner = session.role === "owner";
  // Callers can work leads (view, call guide, share link, sales status, notes) but nothing that costs money or changes sites.
  const ownerOnly = () => {
    if (!isOwner) throw new HttpError(403, "Only the owner can do that");
  };

  if (path === "/meta" && m === "GET") {
    const settings = await getSettings(env);
    return json({
      me: { role: session.role, name: session.name, id: session.userId },
      categories: SEARCH_GROUPS.map((g) => ({ id: g.id, label: g.label, category: g.category, searches: searchesFor(g, false).length, widerSearches: searchesFor(g, true).length })),
      defaultTerms: defaultTerms(settings),
      models: Object.entries(MODEL_PRICES).map(([id, p]) => ({ id, label: p.label })),
      settings,
    });
  }

  // Notifications: the owner and full-access team see what everyone else did; callers only see preview opens.
  if (path === "/notifications/count" && m === "GET") return json({ unread: await unreadCount(env, session.userId, !isOwner) });
  if (path === "/notifications" && m === "GET") return json(await listEvents(env, session.userId, 100, !isOwner));
  if (path === "/notifications/seen" && m === "POST") {
    await markSeen(env, session.userId);
    return json({ ok: true });
  }
  if (path === "/notifications/latest" && m === "GET") return json(await latestForPush(env, session.userId, !isOwner));
  if (path === "/push/key" && m === "GET") return json({ key: vapidPublicKey(env) });
  if (path === "/push/subscribe" && (m === "POST" || m === "DELETE")) {
    const { endpoint } = await body(req, z.object({ endpoint: z.string().url().max(1000) }));
    if (m === "DELETE") await env.DB.prepare("DELETE FROM push_subs WHERE endpoint = ?").bind(endpoint).run();
    else {
      if (!allowedEndpoint(endpoint)) throw new HttpError(400, "That push service isn't supported");
      await env.DB.prepare("INSERT INTO push_subs (endpoint, user_id, created_at) VALUES (?, ?, ?) ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id")
        .bind(endpoint, session.userId, now())
        .run();
    }
    return json({ ok: true });
  }
  if (path === "/push/test" && m === "POST") {
    const subs = await env.DB.prepare("SELECT endpoint FROM push_subs WHERE user_id = ?").bind(session.userId).all<{ endpoint: string }>();
    await setSetting(env, `push_test_${session.userId}`, String(now()));
    return json({ sent: await pushTo(env, subs.results.map((s) => s.endpoint)) });
  }

  if (path === "/settings" && m === "PUT") {
    ownerOnly();
    const s = await body(
      req,
      z.object({
        defaultCap: z.number().int().min(1).max(500),
        copyModel: z.enum(Object.keys(MODEL_PRICES) as [string, ...string[]]),
        companyName: z.string().trim().max(80).optional(),
        legalName: z.string().trim().max(120).optional(),
        companyPhone: z.string().trim().max(30).optional(),
        companyEmail: z.string().trim().email().max(120).optional(),
        directEmail: z.string().trim().email().max(120).optional(),
        gbpEmail: z.string().trim().email().max(120).optional(),
        callerName: z.string().trim().max(60).optional(),
        plans: z
          .array(
            z.object({
              id: z.enum(["basic", "plus", "pro"]),
              name: z.string().trim().min(1).max(40),
              setup: z.number().min(0).max(100_000),
              monthly: z.number().min(0).max(10_000),
              includes: z.string().trim().max(500),
              payLink: PAY_LINK.optional(),
              payLinkFlex: PAY_LINK.optional(),
              payLinkAnnual: PAY_LINK.optional(),
              payLinkShort: PAY_LINK.optional(),
            }),
          )
          .max(3),
        minMonths: z.number().int().min(0).max(36).optional(),
        shortMonths: z.number().int().min(0).max(36).optional(),
        flexSetup: z.number().min(0).max(10_000).optional(),
        annualMonthsFree: z.number().int().min(0).max(6).optional(),
        addons: z.array(z.object({ name: z.string().trim().min(1).max(60), price: z.number().min(0).max(10_000), unit: z.enum(["month", "each", "one-time"]) })).max(10).optional(),
        terms: z.string().trim().max(6000).optional(),
        commission: z.number().min(0).max(10_000).optional(),
      }),
    );
    const before = await getSettings(env);
    await setSetting(env, "app_settings", JSON.stringify(s));
    // Call guides quote these, so saved guides are rewritten on next open.
    const sales = (x: Partial<typeof s>) => JSON.stringify([x.companyName, x.legalName, x.callerName, x.minMonths, x.shortMonths, x.flexSetup, x.annualMonthsFree, x.addons, (x.plans ?? []).map((p) => [p.name, p.setup, p.monthly, p.includes])]);
    if (sales(before) !== sales(s)) await env.DB.prepare("UPDATE leads SET pitch_json = NULL WHERE pitch_json IS NOT NULL").run();
    return json({ ok: true });
  }

  // The Android app (android/), for any logged-in user to install. Uploaded to R2 by `npm run android:upload`.
  if (path === "/android.apk" && m === "GET") {
    const apk = await env.BUCKET.get("_build/website-business.apk");
    if (!apk) throw new HttpError(404, "The Android app hasn't been uploaded yet");
    return new Response(apk.body, {
      headers: { "content-type": "application/vnd.android.package-archive", "content-disposition": 'attachment; filename="website-business.apk"', "cache-control": "no-store" },
    });
  }

  if (path === "/runs") ownerOnly();
  if (path === "/runs" && m === "POST") {
    const input = await body(
      req,
      z.object({ categories: z.array(z.string()).min(1).max(SEARCH_GROUPS.length), cap: z.number().int().min(1).max(500), wider: z.boolean().default(false), badSites: z.boolean().default(false) }),
    );
    const groups = input.categories.map(groupById).filter((g) => !!g);
    if (!groups.length) throw new HttpError(400, "Pick at least one category");
    const jobs: Job[] = groups.flatMap((g) =>
      searchesFor(g, input.wider).map((p) => ({ type: "search" as const, runId: "", category: g.category, query: p.query, center: p.center, radiusMeters: p.radiusMeters, badSites: input.badSites })),
    );
    const id = newId();
    await env.DB.prepare("INSERT INTO runs (id, created_at, categories, cap, searches_total, options_json) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(id, now(), groups.map((g) => g.id).join(","), input.cap, jobs.length, JSON.stringify({ wider: input.wider, badSites: input.badSites }))
      .run();
    await env.JOBS.sendBatch(jobs.map((j) => ({ body: { ...j, runId: id } as Job })));
    await notify(env, { kind: "run", actor: session, text: `${session.name} started a search run: ${groups.map((g) => g.label).join(", ")} (up to ${input.cap} sites)` });
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
        options: r.options_json ? JSON.parse(r.options_json) : {},
        cap: r.cap,
        searchesDone: r.searches_done,
        searchesTotal: r.searches_total,
        counts: by,
        done: !searching && pending === 0,
      });
    }
    return json({ runs: out });
  }

  if (path === "/callers" || path.startsWith("/callers/")) ownerOnly();
  if (path === "/callers" && m === "GET") return json({ callers: await listCallers(env) });
  if (path === "/callers" && m === "POST") {
    const input = await body(req, z.object({ name: CALLER_NAME, password: z.string().max(200), admin: z.boolean().optional() }));
    return json({ id: await addCaller(env, input.name, input.password, input.admin) });
  }
  const callerMatch = /^\/callers\/([a-z0-9]+)$/.exec(path);
  if (callerMatch && m === "PUT") {
    const change = await body(req, z.object({ name: CALLER_NAME.optional(), password: z.string().max(200).optional(), disabled: z.boolean().optional(), admin: z.boolean().optional() }));
    if (change.admin === false && callerMatch[1] === session.userId) throw new HttpError(400, "You can't take away your own full access");
    await updateCaller(env, callerMatch[1]!, change);
    return json({ ok: true });
  }
  if (callerMatch && m === "DELETE") {
    await removeCaller(env, callerMatch[1]!);
    return json({ ok: true });
  }

  if (path === "/sales" && m === "GET") {
    ownerOnly();
    return json(await salesDashboard(env));
  }

  // Look up one business by name to add it by hand (owner and callers; one Google request per search).
  if (path === "/places/search" && m === "GET") {
    const q = (url.searchParams.get("q") ?? "").trim().slice(0, 120);
    if (q.length < 3) throw new HttpError(400, "Type at least 3 letters");
    const places = await searchText(env.GOOGLE_PLACES_API_KEY, { textQuery: /\b(al|alabama)\b/i.test(q) ? q : `${q} near ${MARKET.name}`, center: MARKET.center, radiusMeters: MARKET.radiusMeters, maxPages: 1 });
    await addUsage(env, { places: 1 });
    const results = [];
    for (const p of places.slice(0, 10)) {
      const existing = await env.DB.prepare("SELECT id, status, sales_status, name FROM leads WHERE place_id = ?").bind(p.id).first<{ id: string; status: string; sales_status: string; name: string | null }>();
      results.push({
        placeId: p.id,
        name: p.displayName?.text ?? "",
        type: p.primaryTypeDisplayName?.text ?? null,
        address: p.formattedAddress ?? "",
        phone: p.nationalPhoneNumber ?? null,
        rating: p.rating ?? null,
        reviews: p.userRatingCount ?? 0,
        website: p.websiteUri ?? null,
        presence: webPresence(p.websiteUri),
        open: p.businessStatus === "OPERATIONAL",
        chain: isChain(p.displayName?.text ?? ""),
        category: guessCategory(p),
        existing: existing && existing.status !== "expired" ? { id: existing.id, status: existing.status, salesStatus: existing.sales_status } : null,
      });
    }
    return json({ results });
  }
  if (path === "/leads/add" && m === "POST") {
    const input = await body(req, z.object({ placeId: z.string().min(5).max(300), category: z.enum(["restaurant", "contractor", "salon", "auto", "landscaping", "cleaning", "print", "retail"]) }));
    const existing = await env.DB.prepare("SELECT id, status FROM leads WHERE place_id = ?").bind(input.placeId).first<{ id: string; status: string }>();
    if (existing && existing.status !== "expired") return json({ id: existing.id, existed: true });
    const p = await getPlace(env.GOOGLE_PLACES_API_KEY, input.placeId, input.category === "restaurant" ? RESTAURANT_FLAGS : []);
    await addUsage(env, { places: 1 });
    if (!p.nationalPhoneNumber) throw new HttpError(400, "Google has no phone number for this business, and every site needs one. Add it to their Google listing first.");
    const presence = webPresence(p.websiteUri) as WebPresence;
    const count = p.userRatingCount ?? 0;
    const label = { none: "No website", social: "Only a social page", free_builder: "Free-builder site", has_site: "Has a website", outdated: "Outdated website" }[presence];
    const reason = `${label} · ${count} Google reviews · added by ${session.name}`;
    const fields = [p.displayName?.text ?? "", p.nationalPhoneNumber, p.formattedAddress ?? "", p.rating ?? null, p.userRatingCount ?? null, presence, reason, scorePlace(p, presence), JSON.stringify(p), p.location?.latitude ?? null, p.location?.longitude ?? null, now(), now()];
    let id = existing?.id;
    if (id) {
      // An expired lead (old Google data was cleared): bring it back with fresh data.
      await env.DB.prepare(
        "UPDATE leads SET category = ?, name = ?, phone = ?, address = ?, rating = ?, review_count = ?, presence = ?, reason = ?, score = ?, place_json = ?, lat = ?, lng = ?, fetched_at = ?, updated_at = ?, status = 'queued', sales_status = 'new', record_json = NULL, copy_json = NULL, lint_json = NULL, pitch_json = NULL, look = NULL, created_at = ? WHERE id = ?",
      )
        .bind(input.category, ...fields, now(), id)
        .run();
    } else {
      id = newId();
      await env.DB.prepare(
        `INSERT INTO leads (id, place_id, run_id, category, name, phone, address, rating, review_count, presence, reason, score, status, place_json, lat, lng, fetched_at, created_at, updated_at)
         VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?, ?, ?, ?, ?)`,
      )
        .bind(id, p.id, input.category, ...fields, now())
        .run();
    }
    await env.DB.prepare("INSERT INTO lead_notes (id, lead_id, author, outcome, body, created_at) VALUES (?, ?, ?, NULL, ?, ?)")
      .bind(newId(), id, session.name, "Added by hand from a Google search", now())
      .run();
    await env.JOBS.send({ type: "build", leadId: id });
    await notify(env, { kind: "added", actor: session, leadId: id, text: `${session.name} added ${p.displayName?.text ?? "a business"} by hand` });
    return json({ id, existed: false });
  }

  if (path === "/leads" && m === "GET") {
    const where: string[] = ["status != 'expired'"];
    const binds: unknown[] = [];
    const sales = url.searchParams.get("sales");
    const category = url.searchParams.get("category");
    const callbacks = url.searchParams.get("callbacks");
    let order = "score DESC";
    if (url.searchParams.get("opened") === "recent") {
      // Prospects who opened their preview in the last 7 days and haven't bought yet: call them now.
      where.push("preview_opened_at >= ?", "sales_status IN ('new', 'shown')");
      binds.push(now() - 7 * 86_400_000);
      order = "preview_opened_at DESC";
    } else if (callbacks) {
      // "due": today or overdue; "all": every scheduled callback. Closed leads drop off.
      where.push("follow_up IS NOT NULL", "sales_status IN ('new', 'shown')");
      if (callbacks === "due") {
        where.push("follow_up <= ?");
        binds.push(localDate());
      }
      order = "follow_up ASC, score DESC";
    } else if (sales) {
      where.push("sales_status = ?");
      binds.push(sales);
    }
    if (category) {
      where.push("category = ?");
      binds.push(category);
    }
    const rows = await env.DB.prepare(`SELECT * FROM leads WHERE ${where.join(" AND ")} ORDER BY ${order} LIMIT 500`)
      .bind(...binds)
      .all<LeadRow>();
    return json({ leads: rows.results.map(summary) });
  }

  const leadMatch = /^\/leads\/([a-z0-9]+)(\/[a-z]+)?(?:\/([a-z0-9]+))?$/.exec(path);
  if (leadMatch) {
    const id = leadMatch[1]!;
    const action = leadMatch[2] ?? "";
    const sub = leadMatch[3];
    const lead = await requireLead(env, id);
    const callerSafe = (action === "" && m === "GET") || ["/status", "/share", "/pitch", "/log", "/notes", "/followup", "/signup", "/flyer"].includes(action);
    if (!callerSafe) ownerOnly();

    if (action === "" && m === "GET") return json({ ...detail(lead), notes: await notesFor(env, id), signups: await signupsFor(env, id) });
    if (action === "/signup" && m === "POST") {
      const { plan } = await body(req, z.object({ plan: z.enum(["basic", "plus", "pro"]) }));
      const settings = await getSettings(env);
      const p = settings.plans.find((x) => x.id === plan);
      if (!p) throw new HttpError(400, "Set up your plans in Settings first");
      if (lead.status !== "ready") throw new HttpError(409, "The preview isn't ready yet");
      const token = await signupToken(env, id, plan);
      await env.DB.prepare("INSERT INTO lead_notes (id, lead_id, author, outcome, body, created_at) VALUES (?, ?, ?, 'signup_sent', ?, ?)")
        .bind(newId(), id, session.name, `Sign-up link for ${p.name}`, now())
        .run();
      await notify(env, { kind: "signup_sent", actor: session, leadId: id, text: `${session.name} sent ${lead.name} a ${p.name} sign-up link` });
      return json({ url: `${url.origin}/a/${token}`, plan: p.name, expiresInDays: 30 });
    }
    if (action === "/paid" && m === "POST") {
      const { signupId, paid } = await body(req, z.object({ signupId: z.string().regex(/^[a-z0-9]+$/), paid: z.boolean() }));
      await env.DB.prepare("UPDATE signups SET paid = ? WHERE id = ? AND lead_id = ?").bind(paid ? 1 : 0, signupId, id).run();
      await notify(env, { kind: "paid", actor: session, leadId: id, text: paid ? `${session.name} marked ${lead.name}'s payment as set up 💵` : `${session.name} marked ${lead.name} as not paid` });
      return json({ ok: true });
    }
    if (action === "/flyer" && m === "GET") {
      if (lead.status !== "ready") throw new HttpError(409, "The preview isn't ready yet");
      const days = 60;
      const token = await shareToken(env, id, days);
      // Leaving a flyer counts as showing them, which also keeps the preview around longer.
      if (lead.sales_status === "new") await updateLead(env, id, { sales_status: "shown", ...autoCallback(lead) });
      const settings = await getSettings(env);
      return previewFlyer({
        business: lead.name ?? "your business",
        previewUrl: `${url.origin}/s/${token}/`,
        company: settings.companyName,
        phone: settings.companyPhone,
        caller: isOwner ? settings.callerName : session.name,
        days,
      });
    }
    if (action === "/gbp") {
      if (!lead.record_json) throw new HttpError(409, "This site hasn't finished building yet");
      const record = JSON.parse(lead.record_json) as BusinessRecord;
      const state = gbpState(lead);
      const save = (s: GbpState) => updateLead(env, id, { gbp_json: JSON.stringify(s) });
      const settings = await getSettings(env);
      const ai = () => new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
      const website = lead.custom_domain ? `https://${lead.custom_domain}` : (lead.live_url ?? undefined);
      if (m === "GET" && !sub) return json({ ...state, website, mapsUrl: record.mapsUrl, gbpEmail: settings.gbpEmail ?? null });
      if (m === "PUT" && !sub) {
        const input = await body(
          req,
          z.object({ check: z.string().regex(/^[a-z_]+$/).optional(), done: z.boolean().optional(), postId: z.string().regex(/^[a-z0-9]+$/).optional(), posted: z.boolean().optional(), removePost: z.boolean().optional(), notes: z.string().max(1000).optional() }),
        );
        if (input.check) state.checks[input.check] = !!input.done;
        if (input.postId) {
          if (input.removePost) state.posts = state.posts.filter((p) => p.id !== input.postId);
          else for (const p of state.posts) if (p.id === input.postId) p.status = input.posted ? "posted" : "draft";
        }
        if (input.notes !== undefined) state.notes = input.notes;
        await save(state);
        return json(state);
      }
      if (m === "POST" && sub === "kit") {
        const { kit, usage } = await writeProfileKit(ai(), { record, pack: packFor(record.category), website, model: settings.copyModel });
        await chargeAi(env, settings.copyModel, usage);
        state.kit = { ...kit, createdAt: now(), problems: profileTextProblems(kit.description, 750) };
        await save(state);
        return json(state);
      }
      if (m === "POST" && sub === "posts") {
        const { count, notes } = await body(req, z.object({ count: z.number().int().min(1).max(4).default(2), notes: z.string().trim().max(1000).optional() }));
        const month = new Date().toLocaleDateString("en-US", { timeZone: "America/Chicago", month: "long", year: "numeric" });
        const { posts, usage } = await writeMonthlyPosts(ai(), {
          record,
          pack: packFor(record.category),
          month,
          count,
          recentTopics: state.posts.slice(-8).map((p) => p.topic),
          ownerNotes: notes ?? state.notes,
          model: settings.copyModel,
        });
        await chargeAi(env, settings.copyModel, usage);
        if (notes !== undefined) state.notes = notes;
        state.posts.push(...posts.map((p) => ({ ...p, id: newId(), month, status: "draft" as const, createdAt: now(), problems: profileTextProblems(p.text, 1500) })));
        state.posts = state.posts.slice(-30);
        await save(state);
        return json(state);
      }
      if (m === "POST" && sub === "reply") {
        const input = await body(req, z.object({ review: z.string().trim().min(1).max(4000), stars: z.number().int().min(1).max(5), reviewer: z.string().trim().max(80).optional() }));
        const { reply, usage } = await writeReviewReply(ai(), { record, ...input, model: settings.copyModel });
        await chargeAi(env, settings.copyModel, usage);
        return json({ reply, problems: profileTextProblems(reply, 4000) });
      }
    }
    if (action === "/reviewcard" && m === "GET") return reviewCards(lead.name ?? "us", lead.place_id);
    if (action === "/stats" && m === "GET") return json(await siteReport(env, id));
    if (action === "/domain") {
      if (!lead.pages_project) throw new HttpError(409, "Publish the site first, then add its domain");
      const auth = { accountId: env.CF_ACCOUNT_ID, token: env.CF_API_TOKEN };
      const describe = (d: PagesDomain | null) => ({
        domain: d?.name ?? lead.custom_domain,
        status: d?.status ?? null,
        error: d?.verification_data?.error_message ?? d?.validation_data?.error_message ?? null,
        target: `${lead.pages_project}.pages.dev`,
      });
      if (m === "GET") return json(describe(lead.custom_domain ? await getDomain(auth, lead.pages_project, lead.custom_domain) : null));
      if (m === "PUT") {
        const { domain } = await body(req, z.object({ domain: z.string().trim().toLowerCase().max(253).regex(/^(?!-)([a-z0-9-]{1,63}\.)+[a-z]{2,63}$/, "Type a domain like www.example.com") }));
        if (lead.custom_domain && lead.custom_domain !== domain) await removeDomain(auth, lead.pages_project, lead.custom_domain);
        const d = await addDomain(auth, lead.pages_project, domain);
        await updateLead(env, id, { custom_domain: domain });
        return json(describe(d));
      }
      if (m === "DELETE") {
        if (lead.custom_domain) await removeDomain(auth, lead.pages_project, lead.custom_domain);
        await updateLead(env, id, { custom_domain: null });
        return json({ ok: true });
      }
    }
    if (action === "/log" && m === "POST") {
      const input = await body(
        req,
        z.object({ outcome: z.enum(OUTCOMES), note: z.string().trim().max(2000).default(""), followUp: DATE.nullable().optional() }),
      );
      if (input.outcome === "note" && !input.note) throw new HttpError(400, "Write a note first");
      if (input.outcome === "callback" && !input.followUp) throw new HttpError(400, "Pick a day to call back");
      if (input.followUp && input.followUp < localDate()) throw new HttpError(400, "Pick today or a later day");
      const fields: Partial<LeadRow> = {};
      if (input.outcome !== "note") fields.last_contact = now();
      if (input.followUp !== undefined) fields.follow_up = input.followUp;
      else if (input.outcome === "no_answer") fields.follow_up = localDate(1);
      else if (input.outcome === "sold" || input.outcome === "not_interested") fields.follow_up = null;
      const status = OUTCOME_STATUS[input.outcome] ?? (input.outcome === "callback" && lead.sales_status === "new" ? "shown" : undefined);
      if (status && lead.sales_status !== "live") fields.sales_status = status;
      if (fields.sales_status === "shown" && lead.sales_status !== "shown" && input.followUp === undefined) Object.assign(fields, autoCallback(lead));
      await env.DB.prepare("INSERT INTO lead_notes (id, lead_id, author, outcome, body, created_at) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(newId(), id, session.name, input.outcome === "note" ? null : input.outcome, input.note, now())
        .run();
      if (Object.keys(fields).length) await updateLead(env, id, fields);
      const what = {
        note: `added a note on ${lead.name}`,
        no_answer: `called ${lead.name}: no answer`,
        callback: `called ${lead.name}: call back ${fields.follow_up ?? ""}`.trim(),
        shown: `called ${lead.name}: they're interested 👍`,
        sold: `SOLD ${lead.name}! 🎉`,
        not_interested: `called ${lead.name}: not interested`,
      }[input.outcome];
      await notify(env, { kind: input.outcome === "note" ? "note" : "call", actor: session, leadId: id, text: `${session.name} ${what}${input.note ? `: "${input.note.slice(0, 160)}"` : ""}` });
      return json({ ok: true, followUp: fields.follow_up === undefined ? lead.follow_up : fields.follow_up });
    }
    if (action === "/followup" && m === "PUT") {
      const { date } = await body(req, z.object({ date: DATE.nullable() }));
      if (date && date < localDate()) throw new HttpError(400, "Pick today or a later day");
      await updateLead(env, id, { follow_up: date });
      return json({ ok: true });
    }
    if (action === "/notes" && sub && m === "DELETE") {
      const note = await env.DB.prepare("SELECT * FROM lead_notes WHERE id = ? AND lead_id = ?").bind(sub, id).first<NoteRow>();
      if (!note) throw new HttpError(404, "Note not found");
      if (!isOwner && note.author !== session.name) throw new HttpError(403, "You can only delete your own notes");
      await env.DB.prepare("DELETE FROM lead_notes WHERE id = ?").bind(sub).run();
      return json({ ok: true });
    }
    if (action === "" && m === "DELETE") {
      if (lead.sales_status === "live") throw new HttpError(409, "This site is live. It can't be deleted from here.");
      await deletePrefix(env, `previews/${id}/`);
      await deletePrefix(env, `owner/${id}/`);
      await env.DB.batch([
        env.DB.prepare("DELETE FROM lead_notes WHERE lead_id = ?").bind(id),
        env.DB.prepare("DELETE FROM site_stats WHERE lead_id = ?").bind(id),
        env.DB.prepare("DELETE FROM leads WHERE id = ?").bind(id),
      ]);
      return json({ ok: true });
    }
    if (action === "/status" && m === "POST") {
      const { salesStatus } = await body(req, z.object({ salesStatus: z.enum(["new", "shown", "sold", "not_interested"]) }));
      if (lead.sales_status === "live") throw new HttpError(409, "This site is already live");
      await updateLead(env, id, { sales_status: salesStatus, ...(salesStatus === "shown" && lead.sales_status === "new" ? autoCallback(lead) : {}) });
      if (salesStatus !== lead.sales_status) {
        const label = { new: "New", shown: "Shown", sold: "Sold 🎉", not_interested: "Not interested" }[salesStatus];
        await notify(env, { kind: "status", actor: session, leadId: id, text: `${session.name} marked ${lead.name} as ${label}` });
      }
      return json({ ok: true });
    }
    if (action === "/restyle" && m === "POST") {
      if (!lead.record_json || !lead.copy_json) throw new HttpError(409, "This site hasn't finished building yet");
      if (lead.sales_status === "live") throw new HttpError(409, "This site is already live. Change its design from Edit.");
      const record = JSON.parse(lead.record_json) as BusinessRecord;
      const look = await chooseLook(env, record, `${id}:${Date.now()}`, lead.look ?? undefined);
      await renderPreview(env, lead, record, JSON.parse(lead.copy_json), look);
      return json({ ok: true, look });
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
    if (action === "/publish" && m === "POST") {
      const out = await publishLead(env, lead, url.origin);
      await notify(env, { kind: "published", actor: session, leadId: id, text: `${session.name} published ${lead.name}'s website 🚀 ${out.url}` });
      return json(out);
    }
    if (action === "/share" && m === "POST") {
      if (lead.status !== "ready") throw new HttpError(409, "The preview isn't ready yet");
      const token = await shareToken(env, id);
      return json({ url: `${url.origin}/s/${token}/`, expiresInDays: 14 });
    }
    if (action === "/pitch" && (m === "GET" || m === "POST")) {
      const settings = await getSettings(env);
      const callerName = isOwner ? settings.callerName : session.name;
      if (m === "GET" && lead.pitch_json) return json({ pitch: pitchFor(lead.pitch_json, callerName) });
      if (!lead.record_json || !lead.lint_json) throw new HttpError(409, "The preview isn't ready yet");
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
        sales: {
          ...settings,
          callerName,
          billing: settings.plans[0]
            ? billingOptions(settings.plans[0], settings).map((o) => `${o.label}: ${o.id === "short" || o.id === "standard" ? "no setup fee" : o.id === "flex" ? `no minimum, one-time $${settings.flexSetup} setup fee` : `pay for ${12 - (settings.annualMonthsFree ?? 0)} months up front, get 12 (${settings.annualMonthsFree} free)`}`)
            : [],
          addons: settings.addons.map((a) => `${a.name}: $${a.price}${a.unit === "month" ? "/month" : a.unit === "each" ? " each" : " one-time"}`),
        },
        model: settings.copyModel,
      });
      const price = MODEL_PRICES[result.model] ?? MODEL_PRICES["claude-opus-5-5"]!;
      await addUsage(env, { aiIn: result.usage.input, aiOut: result.usage.output, costMicro: Math.round(result.usage.input * price.input + result.usage.output * price.output) });
      await updateLead(env, id, { pitch_json: JSON.stringify({ ...result.pitch, _caller: callerName }) });
      return json({ pitch: result.pitch });
    }
    if (action === "/zip" && m === "GET") {
      const zip = await zipLead(env, lead, url.origin);
      const name = (lead.pages_project ?? lead.name ?? "site").replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
      return new Response(zip, { headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${name}.zip"` } });
    }
  }

  if (path === "/inbox" || path.startsWith("/inbox/") || path === "/usage") ownerOnly();
  if (path === "/inbox" && m === "GET") {
    const rows = await env.DB.prepare(
      "SELECT s.id, s.lead_id, s.created_at, s.data_json, s.read, l.name AS business FROM submissions s LEFT JOIN leads l ON l.id = s.lead_id ORDER BY s.created_at DESC LIMIT 200",
    ).all<{ id: string; lead_id: string; created_at: number; data_json: string; read: number; business: string }>();
    return json({
      items: rows.results.map((r) => ({ id: r.id, leadId: r.lead_id, business: r.lead_id === COMPANY_LEAD_ID ? "your own website" : r.business, createdAt: r.created_at, read: !!r.read, data: JSON.parse(r.data_json) })),
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
    const esc = (t: string) => t.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);
    const name = esc(lead?.name ?? "your business");
    const from = settings.companyName ? ` by ${esc(settings.companyName)}` : "";
    const banner = `<div role="note" style="position:relative;z-index:60;background:#14213d;color:#fff;font:600 14px/1.4 system-ui,sans-serif;padding:10px 16px;text-align:center">Free preview made for ${name}${from}. Not live yet; photos and details will be checked with you first.</div>`;
    // Link-preview bots (texts, Facebook) fetch the page but don't run scripts, so only a real visit after a moment counts.
    const beacon = `<script>setTimeout(function(){try{if(sessionStorage.getItem("wbo"))return;sessionStorage.setItem("wbo","1")}catch(e){}if(document.visibilityState!=="hidden"&&navigator.sendBeacon)navigator.sendBeacon("/s/${token}/opened")},3000)</script>`;
    text = text.replace(/<body([^>]*)>/, `<body$1>${banner}`).replace(/<\/body>/, `${beacon}</body>`);
  }
  const headers = new Headers(res.headers);
  headers.delete("content-length");
  return new Response(text, { status: res.status, headers });
}

/** A prospect opened their shared preview: count it and tell the team (once per 30 minutes; our own logins don't count). */
async function previewOpened(env: Env, req: Request, leadId: string): Promise<Response> {
  if (await getSession(env, req)) return new Response(null, { status: 204 });
  const t = now();
  const row = await env.DB.prepare(
    "UPDATE leads SET preview_opens = preview_opens + 1, preview_opened_at = ? WHERE id = ? AND status != 'expired' AND COALESCE(preview_opened_at, 0) < ? RETURNING preview_opens, name",
  )
    .bind(t, leadId, t - 30 * 60_000)
    .first<{ preview_opens: number; name: string | null }>();
  if (row) {
    const n = row.preview_opens;
    const times = n === 1 ? "" : ` (${n}${n % 10 === 2 && n % 100 !== 12 ? "nd" : n % 10 === 3 && n % 100 !== 13 ? "rd" : n % 10 === 1 && n % 100 !== 11 ? "st" : "th"} time)`;
    await notify(env, { kind: "preview_open", leadId, text: `${row.name ?? "A prospect"} just opened their preview${times}. Good time to call.` });
  }
  return new Response(null, { status: 204 });
}

async function expireStaleLeads(env: Env): Promise<void> {
  const cutoffNew = now() - 30 * 86_400_000;
  const cutoffShown = now() - 60 * 86_400_000;
  const stale = await env.DB.prepare(
    `SELECT id FROM leads WHERE status != 'expired' AND ((sales_status = 'new' AND created_at < ?) OR (sales_status = 'shown' AND created_at < ?))
     AND NOT (COALESCE(follow_up, '') >= ? AND created_at >= ?) LIMIT 200`,
  )
    // A scheduled callback keeps a lead around, but never past 90 days of Google data.
    .bind(cutoffNew, cutoffShown, localDate(), now() - 90 * 86_400_000)
    .all<{ id: string }>();
  for (const { id } of stale.results) {
    await deletePrefix(env, `previews/${id}/`);
    await deletePrefix(env, `owner/${id}/`);
    // Keep only the Place ID (allowed indefinitely) so the lead isn't re-found as new.
    await updateLead(env, id, { status: "expired", place_json: null, record_json: null, copy_json: null, lint_json: null, name: null, phone: null, address: null, lat: null, lng: null });
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    try {
      if (COMPANY_HOSTS.includes(url.hostname)) return (await serveCompany(env, req, url)) ?? env.ASSETS.fetch(req);
      if (url.pathname.startsWith("/api/")) return await api(env, req, url);
      const preview = /^\/p\/([a-z0-9]+)(\/.*)?$/.exec(url.pathname);
      if (preview) {
        if (!(await getSession(env, req))) return Response.redirect(`${url.origin}/?next=${encodeURIComponent(url.pathname)}`, 302);
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
        if (rest === "/opened" && req.method === "POST") return await previewOpened(env, req, leadId);
        if (!rest) return Response.redirect(`${url.origin}/s/${token}/`, 301);
        return await serveShared(env, req, leadId, token, rest);
      }
      if (url.pathname === "/.well-known/assetlinks.json") return json(ASSET_LINKS, 200, { "cache-control": "public, max-age=3600" });
      const signup = /^\/a\/([a-z0-9]+)\.(basic|plus|pro)\.(\d+)\.([A-Za-z0-9_-]+)$/.exec(url.pathname);
      if (signup && (req.method === "GET" || req.method === "POST")) {
        const [, leadId, plan, exp, sig] = signup as unknown as [string, string, string, string, string];
        if (!(await verifySignup(env, leadId, plan, exp, sig))) {
          return new Response("This sign-up link has expired. Ask us for a new one.", { status: 410, headers: { "content-type": "text/plain; charset=utf-8", "x-robots-tag": "noindex" } });
        }
        return await serveSignup(env, req, leadId, plan, url.origin);
      }
      if (url.pathname === "/stripe/webhook" && req.method === "POST") return await stripeWebhook(env, req);
      const hit = /^\/t\/([a-z0-9]+)$/.exec(url.pathname);
      if (hit && req.method === "POST") return await recordHit(env, req, hit[1]!, url.searchParams.get("e"));
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
