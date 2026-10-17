import { hasScenes } from "../generator/scenes.ts";
import Anthropic from "@anthropic-ai/sdk";
import { autoVariant, setAutoVariant } from "../generator/packs/auto.ts";
import { restaurantVariant } from "../generator/packs/restaurant.ts";
import { writeCopy } from "../copy/write.ts";
import { directDesign } from "../copy/art-director.ts";
import { designId, LOOKS, parseDesign } from "../generator/themes.ts";
import { LEGACY_DNA, pickDna, settleDna } from "../generator/dna.ts";
import { notify } from "./notify.ts";
import { packFor } from "../generator/packs/index.ts";
import { churchVariant } from "../generator/packs/church.ts";
import { financeVariant } from "../generator/packs/finance.ts";
import { pickDesign } from "../generator/design.ts";
import type { DnaHints } from "../generator/dna.ts";
import { buildSite } from "../generator/render.ts";
import { syncSpanish } from "./spanish-sync.ts";
import type { BusinessRecord, CategoryId, Copy, DesignNotes } from "../generator/types.ts";
import { RESTAURANT_FLAGS, searchText, type Place } from "../places/client.ts";
import { groupById, MARKET } from "../places/queries.ts";
import { qualify, scorePlace } from "../places/qualify.ts";
import { mentionsPlace, resolvePresence, townOf } from "../places/web-presence.ts";
import {
  applySiteFacts,
  fetchSitePhotos,
  importSiteDetailed,
  isDirectoryPage,
} from "../places/site-import.ts";
import { autoMatchPhotos } from "../generator/packs/retail.ts";
import { websiteProblem } from "../places/site-check.ts";
import { placeToRecord, reviewTexts } from "../places/to-record.ts";
import {
  addUsage,
  getLead,
  getSettings,
  MODEL_PRICES,
  updateLead,
  type LeadRow,
} from "./db.ts";
import { newId, now, type Env, type Job } from "./env.ts";

const SEARCH_PAGES = 2;
/** Website checks per search job (each is one outbound request). */
const MAX_SITE_CHECKS = 15;
/** Web searches per search job for "no website" leads (Brave free tier is 2,000 a month). */
const MAX_WEB_CHECKS = 15;

export async function runSearch(
  env: Env,
  job: Extract<Job, { type: "search" }>,
): Promise<void> {
  const run = await env.DB.prepare(
    "SELECT status, cap, categories FROM runs WHERE id = ?",
  )
    .bind(job.runId)
    .first<{ status: string; cap: number; categories: string }>();
  if (!run || run.status === "cancelled") return;
  // Split the cap fairly so one category can't use up the whole run. Groups sharing a template share its slice.
  const categories = new Set(
    run.categories.split(",").map((g) => groupById(g)?.category ?? g),
  );
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
    await addUsage(env, {
      places: Math.min(SEARCH_PAGES, Math.ceil(places.length / 20) || 1),
    });

    const builds: Job[] = [];
    let checks = 0;
    let webChecks = 0;
    for (const lead of qualify(places, {
      includeSites: job.badSites,
      category,
      center: job.center ?? MARKET.center,
    })) {
      if (
        category === "church" &&
        !churchVariant(
          lead.place.primaryType,
          lead.place.types ?? [],
          lead.place.displayName?.text ?? "",
        )
      )
        continue;
      if (
        category === "finance" &&
        !financeVariant(
          lead.place.primaryType,
          lead.place.types ?? [],
          lead.place.displayName?.text ?? "",
        )
      )
        continue;
      const exists = await env.DB.prepare(
        "SELECT 1 FROM leads WHERE place_id = ?",
      )
        .bind(lead.place.id)
        .first();
      if (exists) continue;
      if (lead.presence === "has_site" || lead.presence === "free_builder") {
        if (checks >= MAX_SITE_CHECKS) continue;
        checks++;
        const problem = await websiteProblem(lead.place.websiteUri!);
        if (!problem) continue;
        lead.presence = "outdated";
        lead.reason = `${problem} · ${lead.place.userRatingCount ?? 0} Google reviews`;
      }
      // "No website" on Google isn't always true: one web search may find their own unlinked site (a working one is
      // skipped like any other site; a broken one becomes an outdated-site lead) or a page on a parent company's site.
      let foundUrl: string | null = null;
      if (
        (lead.presence === "none" || lead.presence === "social") &&
        env.BRAVE_SEARCH_API_KEY &&
        webChecks < MAX_WEB_CHECKS
      ) {
        webChecks++;
        const found = await resolvePresence(
          env.BRAVE_SEARCH_API_KEY,
          lead.place,
        );
        if (found?.presence === "has_site") continue;
        if (found) {
          lead.presence = found.presence;
          lead.reason = `${found.label} · ${lead.place.userRatingCount ?? 0} Google reviews`;
          lead.score = scorePlace(lead.place, found.presence);
          foundUrl = found.url;
        }
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
        `INSERT OR IGNORE INTO leads (id, place_id, run_id, category, name, phone, address, rating, review_count, presence, reason, score, status, place_json, lat, lng, fetched_at, created_at, updated_at, found_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          id,
          p.id,
          job.runId,
          category,
          p.displayName?.text ?? "",
          p.nationalPhoneNumber ?? "",
          p.formattedAddress ?? "",
          p.rating ?? null,
          p.userRatingCount ?? null,
          lead.presence,
          lead.reason,
          lead.score,
          JSON.stringify(p),
          p.location?.latitude ?? null,
          p.location?.longitude ?? null,
          now(),
          now(),
          now(),
          foundUrl,
        )
        .run();
      if (!inserted.meta.changes) {
        await env.DB.prepare("UPDATE runs SET queued = queued - 1 WHERE id = ?")
          .bind(job.runId)
          .run();
        continue;
      }
      builds.push({ type: "build", leadId: id });
    }
    for (let i = 0; i < builds.length; i += 100)
      await env.JOBS.sendBatch(
        builds.slice(i, i + 100).map((body) => ({ body })),
      );
  } finally {
    await env.DB.prepare(
      "UPDATE runs SET searches_done = searches_done + 1 WHERE id = ?",
    )
      .bind(job.runId)
      .run();
  }
}

/** Spreads looks and layouts across a category so neighboring businesses get different-looking sites. */
export async function chooseLook(
  env: Env,
  record: BusinessRecord,
  leadId: string,
  current?: string,
): Promise<string> {
  const pack = packFor(record.category);
  const rows = await env.DB.prepare(
    "SELECT look, sales_status FROM leads WHERE category = ? AND look IS NOT NULL AND status != 'expired'",
  )
    .bind(record.category)
    .all<{ look: string; sales_status: string }>();
  return pickDesign({
    leadId,
    looks: pack.looks,
    preferred: pack.defaultLook(record),
    used: rows.results.map((r) => r.look),
    taken: [
      ...rows.results
        .filter((r) => r.sales_status === "sold" || r.sales_status === "live")
        .map((r) => r.look),
      ...(current ? [current] : []),
    ],
    hints: dnaHints(record),
  });
}

/**
 * The design for a new site (or a replacement the owner asked for): the art director picks a look, layout and structure
 * that fit the business and explains why; its answer is validated against the catalog. Without a Claude key, or when the
 * call fails, the deterministic spread (`chooseLook`) decides and the site still builds. Usage is metered like copy.
 */
export async function designFor(
  env: Env,
  record: BusinessRecord,
  leadId: string,
  o: { place?: Place; current?: string; client?: Anthropic; brief?: string } = {},
): Promise<{ look: string; notes?: DesignNotes }> {
  if (!env.ANTHROPIC_API_KEY) return { look: await chooseLook(env, record, leadId, o.current) };
  const pack = packFor(record.category);
  // An owner's style request opens every category's looks, so a client's look in any category is off limits too.
  const rows = await env.DB.prepare(
    o.brief
      ? "SELECT look, sales_status FROM leads WHERE look IS NOT NULL AND status != 'expired' AND id != ?2 AND (category = ?1 OR sales_status IN ('sold','live'))"
      : "SELECT look, sales_status FROM leads WHERE category = ?1 AND look IS NOT NULL AND status != 'expired' AND id != ?2",
  )
    .bind(record.category, leadId.split(":")[0])
    .all<{ look: string; sales_status: string }>();
  try {
    const client = o.client ?? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const r = await directDesign(client, {
      record,
      looks: o.brief ? Object.keys(LOOKS) : pack.looks,
      preferred: pack.defaultLook(record),
      brief: o.brief,
      used: rows.results.map((x) => x.look),
      taken: [
        ...rows.results.filter((x) => x.sales_status === "sold" || x.sales_status === "live").map((x) => x.look),
        ...(o.current ? [o.current] : []),
      ],
      current: o.current,
      reviews: o.place ? reviewTexts(o.place) : [],
      editorialSummary: o.place?.editorialSummary?.text,
      hints: dnaHints(record),
      seed: leadId,
    });
    const price = MODEL_PRICES[r.model] ?? MODEL_PRICES["claude-opus-5-5"]!;
    await addUsage(env, {
      aiIn: r.usage.input,
      aiOut: r.usage.output,
      costMicro: Math.round(r.usage.input * price.input + r.usage.output * price.output),
    });
    return { look: r.design, notes: r.notes };
  } catch (err) {
    console.warn(`art director failed for ${leadId}: ${(err as Error).message}`);
    return { look: await chooseLook(env, record, leadId, o.current) };
  }
}

/** What the structure picker should know about this business: owner proof to show off, and whether a photo can go live. */
export function dnaHints(record: BusinessRecord): DnaHints {
  const p = record.proof;
  const proof =
    !!p &&
    !!(
      p.awards?.length ||
      p.memberships?.length ||
      p.clients?.length ||
      p.stats?.length
    );
  return {
    proof,
    // A Google photo shows in the preview and a trade scene replaces it on the live site, so either way the page has a
    // photo; only a business with neither (and no scenes for its trade) gets a type-led opening.
    noPhoto: !record.media.hero && !hasScenes(record),
  };
}

/**
 * Their own photos from their current website → R2 `owner/<id>/s<n>.<ext>` and the record: the first becomes the hero when the
 * record only has a Google photo (which may never go live), the rest fill the gallery up to 24. Earlier site photos are
 * replaced (the owner may have deleted some on purpose: only runs when none are left, or on a rewrite). Owner-uploaded
 * photos are never touched. Publishing still needs the owner's "these are ours" tick (confirmed `site_photos`).
 */
export async function importSitePhotos(
  env: Env,
  leadId: string,
  record: BusinessRecord,
  images: Array<{ src: string; alt?: string }>,
): Promise<number> {
  if (!images.length || record.category === "church") return 0;
  const keep = (i: { source: string } | undefined) =>
    !!i && i.source !== "site";
  const room = 24 - record.media.gallery.filter(keep).length;
  const photos = await fetchSitePhotos(
    images,
    Math.max(0, Math.min(12, room + 1)),
  );
  if (!photos.length) return 0;
  const old = await env.BUCKET.list({ prefix: `owner/${leadId}/s` });
  await Promise.all(old.objects.map((o) => env.BUCKET.delete(o.key)));
  record.media.gallery = record.media.gallery.filter(keep);
  // Hero = the largest proper landscape photo (not the first thing on their page, which is often a banner); the rest in page order.
  const wantHero = !record.media.hero || record.media.hero.source === "google";
  const area = (p: { width?: number; height?: number }) =>
    (p.width ?? 0) * (p.height ?? 0);
  const heroPick = wantHero
    ? ([...photos]
        .filter(
          (p) =>
            p.width &&
            p.height &&
            p.width >= 800 &&
            p.width / p.height >= 1 &&
            p.width / p.height <= 2.2,
        )
        .sort((a, b) => area(b) - area(a))[0] ?? photos[0])
    : undefined;
  let n = 0;
  for (const ph of photos) {
    const key = `s${n + 1}`;
    await env.BUCKET.put(`owner/${leadId}/${key}.${ph.ext}`, ph.bytes, {
      httpMetadata: { contentType: ph.type },
    });
    const img = {
      src: `/assets/owner/${key}.${ph.ext}`,
      alt: ph.alt || `Photo from ${record.name}`,
      source: "site" as const,
      width: ph.width,
      height: ph.height,
    };
    if (ph === heroPick) record.media.hero = img;
    else if (record.media.gallery.length < 24) record.media.gallery.push(img);
    n++;
  }
  return n;
}

/**
 * "Not their website": undo a site import. Drops the imported text and photos (R2 `owner/<id>/s*`), puts the Google
 * photo back as the hero, forgets the found page (presence back to "none") so the next build doesn't read it again,
 * and asks for a rewrite since the copy was written from that page.
 */
export async function forgetSiteImport(
  env: Env,
  lead: LeadRow,
  record: BusinessRecord,
): Promise<void> {
  const list = await env.BUCKET.list({ prefix: `owner/${lead.id}/s` });
  if (list.objects.length)
    await env.BUCKET.delete(list.objects.map((o) => o.key));
  const gone = new Set<string>();
  record.media.gallery = record.media.gallery.filter((g) => {
    if (g.source === "site") gone.add(g.src);
    return g.source !== "site";
  });
  if (record.media.hero?.source === "site") {
    gone.add(record.media.hero.src);
    record.media.hero = undefined;
    if (lead.place_json)
      heroFromPlace(record, JSON.parse(lead.place_json) as Place);
  }
  for (const sec of record.ext.retail?.priceList?.sections ?? [])
    for (const it of sec.items)
      if (it.image && gone.has(it.image.src)) it.image = undefined;
  // Facts that page filled in (applySiteFacts) go too: a namesake's founding year must not stay on the site.
  const was = record.existingSite;
  if (was) {
    if (was.foundedYear && record.foundedYear === was.foundedYear) record.foundedYear = undefined;
    if (record.email && was.emails.includes(record.email)) record.email = undefined;
    for (const k of ["facebook", "instagram", "tiktok", "youtube"] as const)
      if (record.links.social[k] && record.links.social[k] === was.social[k]) record.links.social[k] = undefined;
  }
  record.existingSite = undefined;
  record.siteImport = undefined;
  record.confirmed = record.confirmed.filter((c) => c !== "site_photos");
  const change: Partial<LeadRow> = {
    record_json: JSON.stringify(record),
    rewrite: 1,
    status: "queued",
    error: null,
  };
  if (lead.found_url) {
    change.found_url = null;
    if (lead.presence === "elsewhere") {
      change.presence = "none";
      change.reason = (lead.reason ?? "")
        .replace(/^Page on [^·]+ not linked from Google/i, "No website")
        .replace(/\s*·\s*$/, "");
    }
  }
  await updateLead(env, lead.id, change);
  await env.JOBS.send({ type: "build", leadId: lead.id });
}

/** Minute cron: a build that has sat in "queued" for 20 minutes lost its job (deploy mid-run, a dropped message); send it again. */
export async function requeueStuck(env: Env): Promise<number> {
  const rows = await env.DB.prepare(
    "SELECT id FROM leads WHERE status = 'queued' AND updated_at < ? ORDER BY updated_at ASC LIMIT 5",
  )
    .bind(Date.now() - 20 * 60_000)
    .all<{ id: string }>();
  for (const r of rows.results) {
    await updateLead(env, r.id, { status: "queued" });
    await env.JOBS.send({ type: "build", leadId: r.id });
  }
  return rows.results.length;
}

export function heroFromPlace(record: BusinessRecord, place: Place): void {
  // Google photos of churches and groups are often of people, children included: never use them, even in previews.
  if (record.category === "church") return;
  const photo = place.photos?.[0];
  if (!photo || (record.media.hero && record.media.hero.source !== "google"))
    return;
  const author = photo.authorAttributions?.[0];
  const w = Math.min(photo.widthPx, 1600);
  record.media.hero = {
    src: "/assets/img/hero.jpg",
    alt: "",
    source: "google",
    width: w,
    height: Math.round((w / photo.widthPx) * photo.heightPx),
    attribution: author
      ? { name: author.displayName, uri: author.uri }
      : undefined,
  };
}

/** Renders the preview into R2 under previews/<leadId>/ and stores the lint report. */
export async function renderPreview(
  env: Env,
  lead: LeadRow,
  record: BusinessRecord,
  copy: Copy,
  look: string,
): Promise<void> {
  const place = lead.place_json
    ? (JSON.parse(lead.place_json) as Place)
    : undefined;
  const build = () =>
    buildSite({
      record,
      copy,
      site: { slug: lead.id, look },
      mode: "preview",
      basePath: `/p/${lead.id}`,
      reviewTexts: place ? reviewTexts(place) : [],
      liveData: `/l/${lead.id}/prices.json`,
    });
  let out = await build();
  // Sites with a Spanish page: any line without Spanish yet (new section, edited text, menu change) is translated, then built again.
  if (await syncSpanish(env, record, copy, out.files)) out = await build();
  await Promise.all(
    [...out.files].map(([path, content]) =>
      env.BUCKET.put(`previews/${lead.id}/${path}`, content, {
        httpMetadata: { contentType: contentType(path) },
      }),
    ),
  );
  await updateLead(env, lead.id, {
    status: "ready",
    error: null,
    record_json: JSON.stringify(record),
    copy_json: JSON.stringify(copy),
    look: out.look,
    lint_json: JSON.stringify({
      ...out.lint,
      todos: out.todos,
      suggestions: out.suggestions,
    }),
    // The call guide asks about what's still missing, so it's redone after any change.
    pitch_json: null,
    name: record.name,
  });
}

/** Owner-given facts that stay true whatever kind of site is built: contact, links, photos they sent, proof, the price list. */
export function carryOver(fresh: BusinessRecord, old: BusinessRecord): BusinessRecord {
  fresh.name = old.name;
  fresh.phone = old.phone;
  fresh.smsEnabled = old.smsEnabled;
  if (old.email) fresh.email = old.email;
  if (old.hours) fresh.hours = old.hours;
  if (old.foundedYear) fresh.foundedYear = old.foundedYear;
  if (old.ownershipTags?.length) fresh.ownershipTags = old.ownershipTags;
  fresh.links = { ...fresh.links, ...old.links, social: { ...fresh.links.social, ...old.links.social } };
  const theirs = (i: { source?: string } | undefined) => !!i && i.source !== "google";
  if (theirs(old.media.logo)) fresh.media.logo = old.media.logo;
  if (theirs(old.media.hero)) fresh.media.hero = old.media.hero;
  fresh.media.gallery = (old.media.gallery ?? []).filter(theirs);
  for (const k of ["proof", "closures", "visit", "hiring", "seo", "existingSite", "siteImport", "events", "offers", "testimonials"] as const) {
    const v = old[k];
    if (v !== undefined && !(Array.isArray(v) && v.length === 0)) (fresh as unknown as Record<string, unknown>)[k] = v;
  }
  if (old.reputation?.displayMode === "owner_stated") fresh.reputation = old.reputation;
  if (old.ext.retail?.priceList) fresh.ext.retail = { ...(fresh.ext.retail ?? {}), priceList: old.ext.retail.priceList } as typeof fresh.ext.retail;
  fresh.confirmed = old.confirmed.filter((c) => c === "site_photos" || c === "name" || c === "phone" || c === "address" || c === "hours");
  return fresh;
}

/** The owner picked a different kind of business in Edit: start the record over from Google's data with the new pack, keep what
 *  the owner gave us (carryOver), pick a design from the new category and rebuild the site with new copy. */
export async function recategorizeLead(
  env: Env,
  lead: LeadRow,
  category: CategoryId,
): Promise<void> {
  if (!lead.place_json) throw new Error("This lead has no Google data to rebuild from");
  const place = JSON.parse(lead.place_json) as Place;
  const fresh = placeToRecord(place, category);
  if (lead.record_json) carryOver(fresh, JSON.parse(lead.record_json) as BusinessRecord);
  const look = await chooseLook(env, fresh, lead.id);
  await updateLead(env, lead.id, {
    category,
    record_json: JSON.stringify(fresh),
    copy_json: null,
    lint_json: null,
    pitch_json: null,
    look,
    rewrite: 1,
    status: "queued",
    error: null,
  });
  await env.JOBS.send({ type: "build", leadId: lead.id });
}

export async function runBuild(
  env: Env,
  job: Extract<Job, { type: "build" }>,
): Promise<void> {
  const lead = await getLead(env, job.leadId);
  if (!lead || !lead.place_json || lead.status === "expired") return;
  if (lead.status === "ready" && !lead.rewrite) return;
  await updateLead(env, lead.id, { status: "building", error: null });
  try {
    const place = JSON.parse(lead.place_json) as Place;
    const category = lead.category as CategoryId;
    const record: BusinessRecord = lead.record_json
      ? JSON.parse(lead.record_json)
      : placeToRecord(place, category);
    heroFromPlace(record, place);
    // Shops built before their kind existed (a parts store built as a repair shop): a rewrite re-reads Google's type and the name.
    if (lead.rewrite && category === "auto" && record.variant === "general") {
      const detected = autoVariant(place.primaryType, place.types ?? [], record.name);
      if (detected !== "general") setAutoVariant(record, detected);
    }
    // Tow companies built while "towing" still meant towing + repair: a rewrite swaps the untouched repair list for towing work.
    if (lead.rewrite && category === "auto" && record.variant === "towing") setAutoVariant(record, "towing");
    // Same for restaurants built before a variant existed (the nutrition clubs built as plain restaurants).
    if (lead.rewrite && category === "restaurant" && record.variant === "other") {
      const detected = restaurantVariant(place.primaryType, place.types ?? [], record.name);
      if (detected !== "other") record.variant = detected;
    }
    // Their current website, if they have one: read once (again after 7 days or on a rewrite) and used as facts for the copy.
    const siteUrl =
      lead.found_url ||
      (place.websiteUri &&
      !/facebook\.|instagram\.|linktr\.ee|tiktok\./i.test(place.websiteUri) &&
      !isDirectoryPage(place.websiteUri)
        ? place.websiteUri
        : null);
    const fresh =
      !!record.existingSite &&
      Date.now() - Date.parse(record.existingSite.fetchedAt) <= 7 * 86_400_000;
    // The phone's read wins while fresh: it ran the page's scripts and reached hosts the server can't.
    const stale =
      record.existingSite?.via === "app"
        ? !fresh
        : !record.existingSite ||
          record.existingSite.url !== siteUrl ||
          !fresh ||
          !!lead.rewrite;
    if (siteUrl && stale) {
      const got = await importSiteDetailed(siteUrl);
      // A page the web search found (not one Google links) must be about this business, or it's a namesake's.
      const namesake =
        !!got.facts &&
        siteUrl === lead.found_url &&
        !mentionsPlace(
          [got.facts.title, got.facts.description, ...got.facts.headings, ...got.facts.paragraphs, ...got.facts.phones].join(" "),
          { town: townOf(place.formattedAddress), phone: place.nationalPhoneNumber ?? record.phone.e164 },
        );
      if (namesake) {
        record.siteImport = {
          url: siteUrl,
          triedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
          error: "a different business with the same name (the page has no phone, town or Alabama address of theirs)",
        };
        await env.DB.prepare(
          "UPDATE leads SET found_url = NULL, presence = CASE WHEN presence IN ('elsewhere','outdated','has_site') THEN 'none' ELSE presence END WHERE id = ?",
        )
          .bind(lead.id)
          .run();
      } else if (got.facts) {
        record.existingSite = got.facts;
        record.siteImport = undefined;
        applySiteFacts(record, got.facts);
        if (
          (await importSitePhotos(env, lead.id, record, got.facts.images)) &&
          record.ext.retail?.priceList
        )
          autoMatchPhotos(
            record.ext.retail.priceList.sections,
            record.media.gallery,
          );
      } else {
        record.siteImport = {
          url: siteUrl,
          triedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
          error: got.error ?? "unknown",
        };
      }
    }

    // A new site gets its design first, so the copywriter knows the page it is writing for.
    let look = lead.look;
    if (!look) {
      const d = await designFor(env, record, lead.id, { place });
      look = d.look;
      if (d.notes) record.designNotes = d.notes;
    }
    let copy: Copy | undefined =
      lead.copy_json && !lead.rewrite ? JSON.parse(lead.copy_json) : undefined;
    if (!copy) {
      const settings = await getSettings(env);
      const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
      const result = await writeCopy(client, {
        record,
        pack: packFor(category),
        reviewContext: reviewTexts(place),
        editorialSummary: place.editorialSummary?.text,
        primaryTypeLabel: place.primaryTypeDisplayName?.text,
        existingSite: record.existingSite,
        direction: record.designNotes?.copyNotes,
        model: settings.copyModel,
      });
      const price =
        MODEL_PRICES[result.model] ?? MODEL_PRICES["claude-opus-5-5"]!;
      await addUsage(env, {
        aiIn: result.usage.input,
        aiOut: result.usage.output,
        costMicro: Math.round(
          result.usage.input * price.input + result.usage.output * price.output,
        ),
      });
      copy = result.copy;
      // Keep a Spanish page across an English rewrite; the owner can rewrite it from Edit.
      const old = lead.copy_json
        ? (JSON.parse(lead.copy_json) as Copy)
        : undefined;
      if (old?.es) copy.es = old.es;
    }
    await renderPreview(env, lead, record, copy, look);
    if (lead.rewrite) await updateLead(env, lead.id, { rewrite: 0 });
  } catch (err) {
    await updateLead(env, lead.id, {
      status: "failed",
      error: (err as Error).message.slice(0, 500),
      rewrite: 0,
    });
  }
}

/**
 * A client bought the look this lead's preview uses (`lockDesign` in exclusive.ts): pick the lead a new design, with the
 * client's design counted as taken, re-render the preview and tell the team. A lead that is sold, live, gone or not built
 * yet is left alone (an unbuilt lead loses its pre-picked look so the build picks fresh).
 */
export async function runRestyle(env: Env, job: Extract<Job, { type: "restyle" }>): Promise<void> {
  const lead = await getLead(env, job.leadId);
  if (!lead || lead.status === "expired" || lead.sales_status === "sold" || lead.sales_status === "live") return;
  const buyer = await getLead(env, job.because);
  const buyerLook = buyer?.look ? parseDesign(buyer.look).look : undefined;
  if (!lead.look || !buyerLook || parseDesign(lead.look).look !== buyerLook) return; // already different
  const lookName = LOOKS[buyerLook]?.name ?? buyerLook;
  if (!lead.record_json || !lead.copy_json) {
    await updateLead(env, lead.id, { look: null });
    return;
  }
  const record = JSON.parse(lead.record_json) as BusinessRecord;
  const place = lead.place_json ? (JSON.parse(lead.place_json) as Place) : undefined;
  const d = await designFor(env, record, `${lead.id}:${Date.now()}`, { place, current: lead.look });
  if (d.notes) record.designNotes = d.notes;
  else delete record.designNotes;
  await renderPreview(env, lead, record, JSON.parse(lead.copy_json) as Copy, d.look);
  await notify(env, {
    kind: "status",
    actorName: "The app",
    leadId: lead.id,
    text: `🎨 ${lead.name}'s preview got a new design: ${buyer?.name ?? "a client"} bought the "${lookName}" look, so it's theirs alone now`,
  });
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

/**
 * The life round (Oct 2026): previews built before section edges, decoration and trade photos existed were flat color
 * blocks. Every open lead gets the new knobs once; a New lead whose opening was type-led only because it had no owner
 * photo also gets a photo-led opening now that a scene (or the Google photo) can carry it. Same words, no AI cost.
 */
export async function runRelive(env: Env, job: Extract<Job, { type: "relive" }>): Promise<void> {
  const lead = await getLead(env, job.leadId);
  if (!lead || lead.status !== "ready" || !lead.record_json || !lead.copy_json || !lead.look) return;
  if (lead.sales_status !== "new" && lead.sales_status !== "shown") return;
  const d = parseDesign(lead.look);
  const old = d.dna ?? LEGACY_DNA;
  if (old.edge !== "straight" || old.decor !== "none" || old.pics !== "none") return; // already lively
  const record = JSON.parse(lead.record_json) as BusinessRecord;
  const hints = dnaHints(record);
  const fresh = pickDna(lead.id, record.category, { hints });
  const typeLed = ["statement", "billboard", "banner"].includes(old.hero);
  const swapHero = lead.sales_status === "new" && typeLed && !hints.noPhoto;
  const dna = settleDna({ ...old, edge: fresh.edge, decor: fresh.decor, pics: fresh.pics, ...(swapHero ? { hero: fresh.hero } : {}) });
  await renderPreview(env, lead, record, JSON.parse(lead.copy_json) as Copy, designId(d.look, d.layout ?? "classic", dna));
}

/** Queues the life round for every open lead, once (settings key `relive_v1`). Called from the minute cron. */
export async function queueRelive(env: Env): Promise<void> {
  if (await env.DB.prepare("SELECT 1 FROM settings WHERE key = 'relive_v1'").first()) return;
  await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('relive_v1', ?)").bind(now()).run();
  const rows = await env.DB.prepare("SELECT id FROM leads WHERE status = 'ready' AND sales_status IN ('new', 'shown')").all<{ id: string }>();
  const ids = rows.results.map((r) => r.id);
  for (let i = 0; i < ids.length; i += 100) await env.JOBS.sendBatch(ids.slice(i, i + 100).map((leadId) => ({ body: { type: "relive", leadId } as Job })));
}
