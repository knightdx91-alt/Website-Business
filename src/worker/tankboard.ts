import { z } from "zod";
import { hmac, safeEqual } from "./auth.ts";
import { getLead, updateLead, type LeadRow } from "./db.ts";
import { HttpError, newId, type Env } from "./env.ts";
import { autoMatchPhotos, sectionSlug } from "../generator/packs/retail.ts";
import { itemEmoji, kindWords, listKind, scanningOn } from "../generator/pricelist.ts";
import type {
  BusinessRecord,
  Copy,
  Image,
  ItemInfo,
  MenuSection,
} from "../generator/types.ts";
import { escHtml } from "./page.ts";
import {
  appIconSvg,
  homescreenHead,
  homescreenPrompt,
  webManifest,
} from "./homescreen.ts";
import { renderPreview } from "./pipeline.ts";
import { publishLead } from "./publish.ts";
import {
  approveUnlock,
  findByBarcode,
  lookupBarcode,
  nfcSecret,
  normalizeCode,
  setStaffPin,
} from "./tablet.ts";
import {
  detectColumns,
  exportCsv,
  fieldChoices,
  importRows,
  parseTable,
  rowsFrom,
  type Field,
} from "./stock-import.ts";

/**
 * Tank board: the client's own live editor for their price list (built for King Fish Aquatics, whose tanks change several
 * times a day). We text them `/c/<leadId>.<sig>`; no login, no password. The page lists their sections (tanks) and items
 * (name, price, how many, a note, a photo from the phone camera, sold out). Every change saves at once into the same
 * `ext.retail.priceList` the owner edits in the app, re-renders the preview, and the site's /prices/ page reads the live
 * feed `/l/<leadId>/prices.json`, so the QR label on a tank shows what's in it within about 30 seconds. Live sites are
 * republished by the minute cron (`republishDirty`) so the static copy and search engines catch up too.
 * The link is signed with a per-lead key (`leads.client_key`): "Text them their tank board link" makes one the first time;
 * a new key (future: a "revoke" button) kills old links.
 */

export const APP_ORIGIN = "https://app.undergroundassociates.com";

async function sign(env: Env, leadId: string, key: string): Promise<string> {
  return hmac(env.APP_SECRET, `client.${leadId}.${key}`);
}

/** The client's link, making their key on first use. */
export async function clientLink(
  env: Env,
  lead: LeadRow,
  origin: string,
): Promise<string> {
  let key = lead.client_key ?? null;
  if (!key) {
    key = newId();
    await updateLead(env, lead.id, { client_key: key });
  }
  return `${origin}/c/${lead.id}.${await sign(env, lead.id, key)}`;
}

async function leadFor(
  env: Env,
  leadId: string,
  sig: string,
): Promise<LeadRow> {
  const lead = await getLead(env, leadId);
  if (
    !lead ||
    lead.status === "expired" ||
    !lead.client_key ||
    !safeEqual(sig, await sign(env, leadId, lead.client_key))
  )
    throw new HttpError(
      404,
      "This link isn't valid any more. Ask us for a new one.",
    );
  return lead;
}

export const recordOf = (lead: LeadRow): BusinessRecord | null =>
  lead.record_json ? (JSON.parse(lead.record_json) as BusinessRecord) : null;

export function priceList(r: BusinessRecord) {
  return (
    (r.ext.retail ??= {}).priceList ?? {
      sections: [] as MenuSection[],
      lastUpdated: "",
      public: true,
    }
  );
}

export const stamp = () =>
  new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  });

/** What the site and the board read: in-stock items only for the site; the board asks with `all=1`. */
/** An owner photo's public address through `/l/<id>/photo/`; Google photos never. */
export function photoUrl(
  lead: LeadRow,
  origin: string,
  img?: Image,
): string | null {
  return img && img.source !== "google"
    ? img.src.startsWith("/assets/owner/")
      ? `${origin}/l/${lead.id}/photo/${img.src.slice("/assets/owner/".length)}`
      : img.src
    : null;
}

export function pricesFeed(
  lead: LeadRow,
  record: BusinessRecord,
  origin: string,
  all = false,
) {
  const pl = priceList(record);
  const photo = (img?: Image) => photoUrl(lead, origin, img) ?? undefined;
  const words = kindWords(record);
  return {
    name: record.name,
    title: pl.title?.trim() || words.title,
    kind: listKind(record),
    words: {
      section: words.section,
      item: words.item,
      emoji: words.emoji,
      board: words.board,
      empty: words.empty,
      fields: words.fields,
    },
    public: pl.public !== false,
    updatedAt: pl.lastUpdated,
    siteUrl: lead.custom_domain
      ? `https://${lead.custom_domain}/prices/`
      : lead.live_url
        ? `${lead.live_url.replace(/\/$/, "")}/prices/`
        : null,
    sections: pl.sections
      .map((s) => ({
        name: s.name,
        slug: sectionSlug(s.name),
        note: s.note ?? "",
        items: s.items
          .filter((it) => all || (!it.soldOut && it.qty !== 0))
          .map((it) => ({
            name: it.name,
            price: it.price ?? "",
            note: it.description ?? "",
            qty: it.qty ?? null,
            soldOut: !!it.soldOut,
            image: photo(it.image) ?? null,
            imageSrc: it.image?.src ?? null,
            info: it.info ?? null,
            barcode: it.barcode ?? "",
            sample: !!it.sample,
            emoji: it.sample ? itemEmoji(it.name, listKind(record)) : undefined,
          })),
      }))
      .filter((s) => all || s.items.length),
  };
}

const ItemsBody = z.object({
  sections: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(60),
        note: z.string().trim().max(200).optional(),
        items: z
          .array(
            z.object({
              name: z.string().trim().min(1).max(120),
              price: z.string().trim().max(30).optional(),
              note: z.string().trim().max(200).optional(),
              qty: z.number().int().min(0).max(9999).nullable().optional(),
              barcode: z.string().trim().max(80).optional(),
              sample: z.boolean().optional(),
              soldOut: z.boolean().optional(),
              /** The gallery file the item's photo is (kept across edits); "" clears. */
              imageSrc: z.string().max(200).nullable().optional(),
            }),
          )
          .max(2000),
      }),
    )
    .max(100),
});

const ImportBody = z.object({
  text: z.string().max(2_000_000),
  mode: z.enum(["merge", "replace"]).default("merge"),
  /** Where rows without a section go. */
  section: z.string().trim().max(60).optional(),
  /** The page's corrected columns; absent = our guess. */
  columns: z.array(z.string().max(40)).max(60).optional(),
  hasHeader: z.boolean().optional(),
  /** Only report what would happen. */
  dryRun: z.boolean().optional(),
});

/** Shared by the board and the app: a pasted sheet or CSV in, a preview or the applied result out. */
export function runImport(
  record: BusinessRecord,
  body: z.infer<typeof ImportBody>,
) {
  const kind = listKind(record);
  const W = kindWords(record);
  const { rows, delimiter } = parseTable(body.text);
  if (!rows.length)
    throw new HttpError(
      422,
      "Nothing to import: paste the cells or pick a file first",
    );
  const guess = detectColumns(rows, kind);
  const allowed = new Set(fieldChoices(kind).map(([f]) => f));
  const columns: Field[] = body.columns?.length
    ? body.columns.map((c) => (allowed.has(c as Field) ? (c as Field) : "skip"))
    : guess.columns.map((c) => c.field);
  const hasHeader = body.hasHeader ?? guess.hasHeader;
  if (!columns.includes("name"))
    throw new HttpError(422, "Pick which column is the name");
  const fallback =
    body.section?.trim() ||
    priceList(record).sections[0]?.name ||
    `${W.section} 1`;
  const parsed = rowsFrom(rows, columns, hasHeader, fallback);
  const preview = {
    delimiter: delimiter === "\t" ? "tab" : delimiter,
    hasHeader,
    columns: guess.columns.map((c, i) => ({
      header: c.header,
      field: columns[i] ?? "skip",
      sample: c.sample,
    })),
    choices: fieldChoices(kind),
    rows: parsed.length,
    sections: [...new Set(parsed.map((r) => r.section))].length,
    sample: parsed.slice(0, 5),
    fallback,
  };
  if (body.dryRun) return { preview };
  const result = importRows(record, parsed, body.mode);
  return { preview, result };
}

/** Replaces the price list with what the board sent, keeping photos by file and matching new ones by caption. */
export function applyClientItems(
  record: BusinessRecord,
  body: z.infer<typeof ItemsBody>,
): void {
  const pl = priceList(record);
  const byFile = new Map<string, Image>();
  for (const g of record.media.gallery) byFile.set(g.src, g);
  for (const s of pl.sections)
    for (const it of s.items) if (it.image) byFile.set(it.image.src, it.image);
  // Care cards ride along by name (the board doesn't edit them; the tablet and the catalog do).
  const infoByName = new Map<string, ItemInfo | undefined>();
  const codeByName = new Map<string, string>();
  for (const c of pl.catalog ?? []) {
    if (c.info) infoByName.set(c.name.toLowerCase(), c.info);
    if (c.barcode) codeByName.set(c.name.toLowerCase(), c.barcode);
  }
  for (const s of pl.sections)
    for (const it of s.items) {
      if (it.info) infoByName.set(it.name.toLowerCase(), it.info);
      if (it.barcode) codeByName.set(it.name.toLowerCase(), it.barcode);
    }
  const sections: MenuSection[] = body.sections.map((s) => ({
    name: s.name,
    note: s.note || undefined,
    items: s.items.map((it) => ({
      name: it.name,
      price: it.price || undefined,
      description: it.note || undefined,
      qty: it.qty === null || it.qty === undefined ? undefined : it.qty,
      soldOut: it.soldOut || undefined,
      image: it.imageSrc ? byFile.get(it.imageSrc) : undefined,
      info: infoByName.get(it.name.toLowerCase()),
      barcode:
        it.barcode === undefined
          ? codeByName.get(it.name.toLowerCase())
          : normalizeCode(it.barcode) || undefined,
      sample: it.sample || undefined,
    })),
  }));
  autoMatchPhotos(sections, record.media.gallery);
  record.ext.retail!.priceList = { ...pl, sections, lastUpdated: stamp() };
}

export async function saveAndRefresh(
  env: Env,
  lead: LeadRow,
  record: BusinessRecord,
  o: { quick?: boolean } = {},
): Promise<void> {
  const copy = lead.copy_json ? (JSON.parse(lead.copy_json) as Copy) : null;
  await updateLead(env, lead.id, {
    record_json: JSON.stringify(record),
    prices_dirty: lead.live_url ? 1 : 0,
    pitch_json: null,
  });
  // Tablet taps (+1, −1) skip the preview rebuild: the preview and the live site both read the live feed anyway.
  if (copy && !o.quick)
    await renderPreview(env, lead, record, copy, lead.look ?? "");
}

/** Minute cron: republish live sites whose price list changed, two a minute, so the static copy follows the board. */
export async function republishDirty(env: Env): Promise<number> {
  const rows = await env.DB.prepare(
    "SELECT * FROM leads WHERE prices_dirty = 1 AND live_url IS NOT NULL AND status = 'ready' ORDER BY updated_at ASC LIMIT 2",
  ).all<LeadRow>();
  let n = 0;
  for (const lead of rows.results) {
    try {
      await publishLead(env, lead, APP_ORIGIN);
      await updateLead(env, lead.id, { prices_dirty: 0 });
      n++;
    } catch (err) {
      console.error("tank board republish failed", lead.id, err);
      await updateLead(env, lead.id, { prices_dirty: 0 });
    }
  }
  return n;
}

/** `/l/<leadId>/prices.json`: the live feed any copy of the site (preview, share, live) reads. Public, cached half a minute. */
export async function servePricesFeed(
  env: Env,
  leadId: string,
  origin: string,
): Promise<Response> {
  const lead = await getLead(env, leadId);
  const record = lead && recordOf(lead);
  if (!lead || !record || lead.status === "expired")
    return new Response("{}", {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  return new Response(JSON.stringify(pricesFeed(lead, record, origin)), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=30",
      "access-control-allow-origin": "*",
    },
  });
}

/** `/l/<leadId>/photo/<file>`: an owner photo straight from storage, so a photo taken at the tank shows before the next publish. */
export async function servePhoto(
  env: Env,
  leadId: string,
  file: string,
): Promise<Response> {
  if (!/^[A-Za-z0-9_.-]{1,80}$/.test(file))
    return new Response("Not found", { status: 404 });
  const obj = await env.BUCKET.get(`owner/${leadId}/${file}`);
  if (!obj) return new Response("Not found", { status: 404 });
  return new Response(obj.body, {
    headers: {
      "content-type": obj.httpMetadata?.contentType ?? "image/jpeg",
      "cache-control": "public, max-age=86400",
      "access-control-allow-origin": "*",
    },
  });
}

/** `/c/<leadId>.<sig>` and its little API. */
export async function serveTankBoard(
  env: Env,
  req: Request,
  leadId: string,
  sig: string,
  rest: string,
  origin: string,
): Promise<Response> {
  const lead = await leadFor(env, leadId, sig);
  const record = recordOf(lead);
  if (!record)
    throw new HttpError(
      409,
      "Your site isn't built yet. Try again in a few minutes.",
    );
  const base = `/c/${leadId}.${sig}`;
  if (rest === "/data" && req.method === "GET")
    return Response.json(
      {
        ...pricesFeed(lead, record, origin, true),
        staffPinSet: !!priceList(record).staffPin,
        nfcText: `ua-staff:${await nfcSecret(env, lead)}`,
      },
      { headers: { "cache-control": "no-store" } },
    );
  if (rest === "/items" && req.method === "PUT") {
    const body = ItemsBody.parse(await req.json());
    applyClientItems(record, body);
    await saveAndRefresh(env, lead, record);
    return Response.json(pricesFeed(lead, record, origin, true), {
      headers: { "cache-control": "no-store" },
    });
  }
  if (rest === "/import" && req.method === "POST") {
    const body = ImportBody.parse(await req.json());
    const out = runImport(record, body);
    if (out.result) await saveAndRefresh(env, lead, record);
    return Response.json(out, { headers: { "cache-control": "no-store" } });
  }
  if (rest === "/export.csv" && req.method === "GET") {
    return new Response(exportCsv(record), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${record.name.replace(/[^\w ]+/g, "").trim() || "stock"} - ${kindWords(record).board}.csv"`,
        "cache-control": "no-store",
      },
    });
  }
  if (rest === "/manifest.webmanifest" && req.method === "GET") {
    const W = kindWords(record);
    return webManifest({
      name: `${record.name} · ${W.board}`,
      shortName: record.name.length <= 14 ? record.name : W.board,
      description: `What's in every ${W.section.toLowerCase()} at ${record.name}: prices, counts and photos, changed from your phone.`,
      startUrl: `${base}/`,
      scope: `${base}/`,
      iconUrl: `${base}/icon.svg`,
    });
  }
  if (rest === "/icon.svg" && req.method === "GET")
    return appIconSvg(record.name);
  if (rest === "/lookup" && req.method === "GET") {
    // The board's Scan mode: what a code is (a row here, something from the catalog, or a product name from its UPC).
    if (!scanningOn(record))
      throw new HttpError(
        403,
        "Barcode scanning isn't turned on for this board. It's an add-on; ask us to switch it on.",
      );
    const code = normalizeCode(new URL(req.url).searchParams.get("code") ?? "");
    if (!code) throw new HttpError(400, "No code read");
    const hit = findByBarcode(record, code);
    const out: Record<string, unknown> = { code };
    if (hit.item)
      out.item = {
        section: hit.item.section,
        name: hit.item.item.name,
        qty: hit.item.item.qty ?? null,
        price: hit.item.item.price ?? "",
      };
    else if (hit.catalog)
      out.catalog = {
        name: hit.catalog.name,
        price: hit.catalog.price ?? "",
        imageSrc: hit.catalog.image?.src ?? null,
        image: photoUrl(lead, origin, hit.catalog.image),
      };
    else if (/^\d{8,14}$/.test(code))
      out.suggestion = await lookupBarcode(code).catch(() => null);
    return Response.json(out, { headers: { "cache-control": "no-store" } });
  }
  if (rest === "/unlock" && req.method === "POST") {
    // The shop approves a tablet's 6-digit code from their phone.
    const { code } = (await req.json()) as { code?: string };
    if (!(await approveUnlock(env, leadId, String(code ?? ""))))
      throw new HttpError(
        404,
        "No tablet is waiting with that code (codes last 10 minutes)",
      );
    return Response.json({ ok: true });
  }
  if (rest === "/staffpin" && req.method === "PUT") {
    const { pin } = (await req.json()) as { pin?: string };
    await setStaffPin(env, lead, record, String(pin ?? "").trim());
    return Response.json({ ok: true, set: !!String(pin ?? "").trim() });
  }
  if (rest === "/photo" && req.method === "POST") {
    const url = new URL(req.url);
    const type = req.headers.get("content-type") ?? "";
    const ext = (
      {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
      } as Record<string, string>
    )[type];
    if (!ext) throw new HttpError(415, "Send a JPEG, PNG or WebP photo");
    const bytes = await req.arrayBuffer();
    if (bytes.byteLength > 8_000_000)
      throw new HttpError(413, "That photo is over 8 MB");
    const section = url.searchParams.get("section") ?? "";
    const item = url.searchParams.get("item") ?? "";
    const key = `c${newId().slice(0, 10)}`;
    await env.BUCKET.put(`owner/${leadId}/${key}.${ext}`, bytes, {
      httpMetadata: { contentType: type },
    });
    const img: Image = {
      src: `/assets/owner/${key}.${ext}`,
      alt: item || `Photo from ${record.name}`,
      source: "owner",
      width: Number(url.searchParams.get("w")) || undefined,
      height: Number(url.searchParams.get("h")) || undefined,
    };
    if (record.media.gallery.length < 24) record.media.gallery.push(img);
    const pl = priceList(record);
    const target = pl.sections
      .find((s) => s.name === section)
      ?.items.find((it) => it.name === item);
    if (target) target.image = img;
    record.ext.retail!.priceList = { ...pl, lastUpdated: stamp() };
    await saveAndRefresh(env, lead, record);
    return Response.json({
      ok: true,
      imageSrc: img.src,
      image: `${origin}/l/${leadId}/photo/${key}.${ext}`,
    });
  }
  if (rest && rest !== "/") return Response.redirect(`${origin}${base}/`, 302);
  if (!rest) return Response.redirect(`${origin}${base}/`, 301);
  return boardPage(record, base, leadId);
}

const NOTE_HINT: Record<string, string> = {
  fish: "size, pairs only, feeding",
  plants: "size, sun, pot",
  pets: "age, sex, handled",
  food: "serves, allergens",
  parts: "fits, condition, where it is",
  vehicles: "miles, title, color",
  goods: "size, condition, brand",
};

export function boardPage(
  record: BusinessRecord,
  base: string,
  leadId = "",
): Response {
  const name = escHtml(record.name);
  const scan = scanningOn(record);
  const W = kindWords(record);
  const sec = W.section.toLowerCase();
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow"><meta name="theme-color" content="#14213d"><title>${escHtml(W.board)} · ${name}</title>
<link rel="icon" href="${escHtml(base)}/icon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/brand/logo-192.png">${homescreenHead({ manifestUrl: `${base}/manifest.webmanifest`, title: record.name })}
<style>
:root{--navy:#14213d;--gold:#fca311;--ink:#16181d;--muted:#5b6270;--line:#e1e4ea;--bg:#f4f5f8;--ok:#0f7b3b;--warn:#8a5300}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding-bottom:90px}
header{background:var(--navy);color:#fff;padding:14px 16px;position:sticky;top:0;z-index:3;display:flex;align-items:center;justify-content:space-between;gap:10px}
header h1{font-size:1.1rem;margin:0}header .st{font-size:.85rem;color:#dfe4ee}
main{max-width:720px;margin:0 auto;padding:12px}
.tank{background:#fff;border:1px solid var(--line);border-radius:14px;margin:0 0 12px;overflow:hidden}
.tank__h{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#fff7e6;border-bottom:1px solid var(--line)}
.tank__h input{flex:1;font:700 1.05rem system-ui;border:0;background:transparent;min-width:0}
.item{display:grid;grid-template-columns:56px 1fr;gap:10px;padding:10px 12px;border-bottom:1px solid var(--line)}
.item:last-child{border-bottom:0}.item.out{opacity:.55}
.ph{width:56px;height:56px;border-radius:10px;background:#eef1f6;display:grid;place-items:center;overflow:hidden;position:relative;border:1px dashed #c7cdd8;font-size:22px}
.ph img{width:100%;height:100%;object-fit:cover}.ph input{position:absolute;inset:0;opacity:0;width:100%;height:100%}
.row{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.row input{min-width:0;border:1px solid var(--line);border-radius:8px;padding:8px;font:inherit}
.nm{flex:3 1 140px}.pr{flex:1 1 72px;max-width:96px}.qt{flex:1 1 60px;max-width:72px}.nt{flex:1 1 100%}
.chip{border:1px solid var(--line);border-radius:999px;padding:6px 10px;font-size:.85rem;background:#fff;cursor:pointer}
.chip.on{background:#fde7d7;border-color:#f4b183;color:#8a2c0a}
.ic{border:0;background:transparent;font-size:1.1rem;cursor:pointer;padding:4px 6px;color:var(--muted)}
.add{display:block;width:100%;padding:12px;border:0;background:transparent;color:var(--navy);font-weight:700;cursor:pointer;text-align:left}
.bar{position:fixed;left:0;right:0;bottom:0;background:#fff;border-top:1px solid var(--line);padding:10px 12px calc(10px + env(safe-area-inset-bottom));display:flex;gap:8px;justify-content:space-between;align-items:center}
.btn{border:0;border-radius:12px;background:var(--gold);color:var(--navy);font:700 1rem system-ui;padding:12px 16px;cursor:pointer}
.btn--line{background:#fff;border:2px solid var(--navy)}
.muted{color:var(--muted)}.small{font-size:.86rem}
.saved{color:var(--ok);font-weight:700}.err{color:#a3281c;font-weight:700}
.empty{padding:24px 12px;text-align:center;color:var(--muted)}
footer{text-align:center;color:var(--muted);font-size:.8rem;padding:16px}
</style></head><body>
<header><div><h1>${name} · ${escHtml(W.board)}</h1><div class="st" id="st">Loading…</div></div><a id="open" class="small" style="color:#fff" hidden target="_blank" rel="noopener">Open price page ↗</a></header>
<div id="findbar" style="max-width:720px;margin:0 auto;padding:12px 12px 0" hidden><input id="find" type="search" placeholder="Find by name, barcode or ${escHtml(sec)}…" aria-label="Find" style="width:100%;border:1px solid var(--line);border-radius:10px;padding:10px;font:inherit"><p class="small muted" id="findMsg" style="margin:4px 0 0"></p></div>
<div id="sampleNote" class="small" style="max-width:720px;margin:12px auto 0;padding:10px 12px;background:#fff7e6;border:1px solid #f4b183;border-radius:12px" hidden>🧪 <b>Sample items.</b> We put made-up stock on your board so you can see how it works. Replace it with your own (type it, scan it, or paste a list below), then ask us to remove the samples.</div>
<main id="m"><p class="empty">Loading your ${escHtml(sec)}s…</p></main>
<section class="tank" id="importbox" style="max-width:720px;margin:0 auto 12px"><div class="tank__h"><span>⬆️</span><b>Put a whole list on at once</b></div><div style="padding:10px 12px" class="small">
<p style="margin:0 0 8px">Have your stock in a spreadsheet or your register's export? Paste the cells here (open it in Excel or Google Sheets, select all, copy, paste) or pick the .csv file. A column for the name is all it needs; price, how many, barcode or SKU and ${escHtml(sec)} / category are used when you have them.</p>
<textarea id="impText" rows="5" placeholder="Name	Price	How many	Barcode	${escHtml(W.section)}&#10;Oil filter PH3614	$6.99	24	0025338041...	Aisle 3" style="width:100%;border:1px solid var(--line);border-radius:8px;padding:8px;font:inherit"></textarea>
<div class="row" style="margin:8px 0"><label class="chip" style="cursor:pointer">📄 Pick a .csv file<input id="impFile" type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain" style="display:none"></label><button class="btn btn--line" id="impPreview" type="button" style="padding:10px 12px">Check it first</button><a class="chip" id="expCsv" href="${escHtml(base)}/export.csv" download>⬇️ Download what's on the board (.csv)</a></div>
<div id="impPrev" hidden></div>
<p class="muted" id="impMsg" style="margin:4px 0 0"></p></div></section>
<div class="bar"><button class="btn btn--line" id="addTank" type="button">+ Add a ${escHtml(sec)}</button>${scan ? '<button class="btn" id="scanMode" type="button">▦ Scan</button>' : ""}<span class="small muted">Changes save by themselves.</span></div>
<div id="hitOv" style="display:none;position:fixed;inset:0;background:rgba(20,33,61,.55);z-index:8;align-items:flex-end;justify-content:center"><div id="hitBody" style="background:#fff;border-radius:16px 16px 0 0;padding:16px;width:100%;max-width:720px;max-height:80vh;overflow:auto"></div></div>
<section class="tank" id="staffbox"><div class="tank__h"><span>📺</span><b>Tablet &amp; staff</b></div><div style="padding:10px 12px" class="small">
<p style="margin:0 0 8px">A tablet beside a ${escHtml(sec)} shows it live (the 📺 on each one). On the tablet, <b>Staff</b> unlocks adding ${escHtml(W.item)}s, counts and photos. Three ways in:</p>
<div class="row" style="margin-bottom:8px"><label style="flex:1 1 160px">Staff PIN (4–8 digits)<input id="pinIn" inputmode="numeric" placeholder="not set" style="width:100%;margin-top:4px"></label><button class="btn btn--line" id="pinSave" type="button" style="padding:10px 12px">Save PIN</button></div>
<div class="row" style="margin-bottom:8px"><label style="flex:1 1 160px">Tablet showing a code? Type it here<input id="codeIn" inputmode="numeric" placeholder="123 456" style="width:100%;margin-top:4px"></label><button class="btn btn--line" id="codeGo" type="button" style="padding:10px 12px">Approve</button></div>
<p style="margin:0 0 4px">Staff NFC tag: write this text on any NFC sticker or fob with a free "NFC Tools" app, then tap it on the tablet: <code id="nfcText" style="user-select:all"></code></p>
<p class="muted" id="staffMsg" style="margin:4px 0 0"></p></div></section>
<div id="scanOv" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:9;flex-direction:column;align-items:center;justify-content:center;padding:16px;gap:12px"><video id="scanVid" playsinline muted autoplay style="width:100%;max-width:520px;max-height:60vh;border-radius:12px;background:#000"></video><p id="scanMsg" style="color:#fff;margin:0"></p><button class="btn btn--line" id="scanCancel" type="button" style="color:#fff;border-color:#fff">Cancel</button></div>
${homescreenPrompt({ appName: record.name, key: base })}
<footer>📺 means "show this ${escHtml(sec)} on a screen": open that link on a tablet beside it and it shows what's in it, live. <a href="/d/${escHtml(leadId)}/" target="_blank" rel="noopener">Everything, rotating</a>.<br>${escHtml(W.board)} by Underground Associates · Anything odd? Text us.</footer>
<script>
(function(){
var BASE=${JSON.stringify(base)};var LEAD=${JSON.stringify(leadId)};var SCAN=${scan ? "true" : "false"};var data=null;var timer=null;var st=document.getElementById("st");var m=document.getElementById("m");
function esc(t){return String(t==null?"":t).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function status(t,cls){st.textContent=t;st.className="st "+(cls||"")}
function render(){
  if(!data.sections.length){m.innerHTML='<p class="empty">Nothing yet. Tap <b>+ Add a ${escHtml(sec)}</b> below, then add what\\'s in it.</p>';return}
  m.innerHTML=data.sections.map(function(s,si){return '<section class="tank" data-s="'+si+'"><div class="tank__h"><span>${W.emoji}</span><input value="'+esc(s.name)+'" data-f="sname" aria-label="Section name"><button class="ic" data-a="up" title="Move up">▲</button><button class="ic" data-a="down" title="Move down">▼</button><button class="ic" data-a="deltank" title="Remove this ${escHtml(sec)}">🗑</button><a class="ic" href="/d/'+LEAD+'/'+esc(s.slug||'')+'" target="_blank" rel="noopener" title="Show this ${escHtml(sec)} on a tablet or TV">📺</a></div>'+
    s.items.map(function(it,ii){return '<div class="item'+(it.soldOut?' out':'')+'" data-i="'+ii+'"'+(it.sample?' title="Sample item"':'')+'><label class="ph" title="Take or pick a photo">'+(it.image?'<img src="'+esc(it.image)+'" alt="">':'📷')+'<input type="file" accept="image/*" capture="environment" data-a="photo"></label><div>'+
      '<div class="row"><input class="nm" value="'+esc(it.name)+'" data-f="name" placeholder="What is it?" aria-label="Name"><input class="pr" value="'+esc(it.price)+'" data-f="price" placeholder="$" inputmode="decimal" aria-label="Price"><input class="qt" value="'+(it.qty==null?"":it.qty)+'" data-f="qty" placeholder="how many" inputmode="numeric" aria-label="How many"></div>'+
      (it.sample?'<div class="row"><span class="chip" style="background:#fff7e6;border-color:#f4b183">🧪 sample</span></div>':'')+'<div class="row"><input class="nt" value="'+esc(it.note)+'" data-f="note" placeholder="Note (${escHtml(NOTE_HINT[listKind(record)])}…)" aria-label="Note"></div>'+
      (SCAN?'<div class="row"><input class="bc" value="'+esc(it.barcode||"")+'" data-f="barcode" placeholder="Barcode (scan or type)" inputmode="numeric" aria-label="Barcode" style="flex:1 1 9em"><button class="ic" data-a="scan" type="button" title="Scan the barcode with the camera">▦</button></div>':'')+
      '<div class="row"><button class="chip'+(it.soldOut?' on':'')+'" data-a="sold" type="button">'+(it.soldOut?'Sold out · tap when back':'In stock · tap if sold out')+'</button><button class="ic" data-a="delitem" title="Remove">🗑</button></div></div></div>'}).join("")+
    '<button class="add" data-a="additem" type="button">+ Add to this ${escHtml(sec)}</button></section>'}).join("");
}
function collect(){return{sections:data.sections.map(function(s){return{name:s.name,note:s.note||"",items:s.items.map(function(it){return{name:it.name,price:it.price||"",note:it.note||"",qty:(it.qty===""||it.qty==null)?null:Number(it.qty),soldOut:!!it.soldOut,imageSrc:it.imageSrc||"",barcode:it.barcode||"",sample:!!it.sample}})}})}}
function save(now){clearTimeout(timer);status("Saving…");timer=setTimeout(function(){
  var body=collect();body.sections=body.sections.filter(function(s){return s.name.trim()});body.sections.forEach(function(s){s.items=s.items.filter(function(i){return i.name.trim()})});
  fetch(BASE+"/items",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(body)}).then(function(r){if(!r.ok)throw new Error("Save failed ("+r.status+")");return r.json()}).then(function(j){
    var open=document.getElementById("open");if(j.siteUrl){open.href=j.siteUrl;open.hidden=false}
    status("Saved ✓ "+new Date().toLocaleTimeString([], {hour:"numeric",minute:"2-digit"}),"saved")}).catch(function(e){status(e.message||"Couldn't save. Check your signal and try again.","err")})},now?0:700)}
function load(){fetch(BASE+"/data",{cache:"no-store"}).then(function(r){return r.json()}).then(function(j){data=j;document.getElementById("sampleNote").hidden=!j.sections.some(function(s){return s.items.some(function(i){return i.sample})});var open=document.getElementById("open");if(j.siteUrl){open.href=j.siteUrl;open.hidden=false}render();status(j.updatedAt?"Last change "+j.updatedAt:"Ready");document.getElementById("nfcText").textContent=j.nfcText||"";document.getElementById("pinIn").placeholder=j.staffPinSet?"set (type a new one to change)":"not set"}).catch(function(){status("Couldn't load. Check your signal.","err")})}
document.getElementById("pinSave").addEventListener("click",function(){var v=document.getElementById("pinIn").value.trim();var msg=document.getElementById("staffMsg");fetch(BASE+"/staffpin",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({pin:v})}).then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error(j.error||"Failed");return j})}).then(function(j){msg.textContent=j.set?"PIN saved ✓":"PIN removed";document.getElementById("pinIn").value="";load()}).catch(function(e){msg.textContent=e.message})});
document.getElementById("codeGo").addEventListener("click",function(){var v=document.getElementById("codeIn").value.replace(/\D/g,"");var msg=document.getElementById("staffMsg");fetch(BASE+"/unlock",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code:v})}).then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error(j.error||"Failed");return j})}).then(function(){msg.textContent="Tablet unlocked ✓";document.getElementById("codeIn").value=""}).catch(function(e){msg.textContent=e.message})});
m.addEventListener("input",function(e){var t=e.target;var sec=t.closest("[data-s]");if(!sec)return;var s=data.sections[+sec.dataset.s];var f=t.dataset.f;if(!f)return;if(f==="sname"){s.name=t.value;save();return}var it=s.items[+t.closest("[data-i]").dataset.i];if(f==="qty"){it.qty=t.value.trim()===""?null:Math.max(0,parseInt(t.value,10)||0)}else it[f]=t.value;save()});
m.addEventListener("click",function(e){var b=e.target.closest("[data-a]");if(!b||b.tagName==="INPUT")return;var sec=b.closest("[data-s]");var si=+sec.dataset.s;var s=data.sections[si];var a=b.dataset.a;
  if(a==="additem"){s.items.push({name:"",price:"",note:"",qty:null,soldOut:false,image:null,imageSrc:null});render();var last=sec&&m.querySelector('[data-s="'+si+'"] .item:last-of-type .nm');if(last)last.focus();return}
  var row=b.closest("[data-i]");var it=row?s.items[+row.dataset.i]:null;
  if(a==="sold"&&it){it.soldOut=!it.soldOut;render();save(true)}
  if(a==="scan"&&it){scanInto(function(code){it.barcode=code;render();save(true)},row.querySelector('[data-f="barcode"]'))}
  if(a==="delitem"&&it&&confirm("Remove "+(it.name||"this item")+" from the board?")){s.items.splice(+row.dataset.i,1);render();save(true)}
  if(a==="deltank"&&confirm("Remove "+s.name+" and everything in it?")){data.sections.splice(si,1);render();save(true)}
  if(a==="up"&&si>0){data.sections.splice(si-1,0,data.sections.splice(si,1)[0]);render();save(true)}
  if(a==="down"&&si<data.sections.length-1){data.sections.splice(si+1,0,data.sections.splice(si,1)[0]);render();save(true)}
});
m.addEventListener("change",function(e){var t=e.target;if(t.dataset.a!=="photo"||!t.files||!t.files[0])return;var sec=t.closest("[data-s]");var s=data.sections[+sec.dataset.s];var it=s.items[+t.closest("[data-i]").dataset.i];if(!it.name.trim()){alert("Give it a name first, then add the photo.");return}
  status("Sending photo…");var f=t.files[0];var img=new Image();var url=URL.createObjectURL(f);img.onload=function(){var max=1600,w=img.width,h=img.height,k=Math.min(1,max/Math.max(w,h));var c=document.createElement("canvas");c.width=Math.round(w*k);c.height=Math.round(h*k);c.getContext("2d").drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);
    c.toBlob(function(blob){fetch(BASE+"/photo?section="+encodeURIComponent(s.name)+"&item="+encodeURIComponent(it.name)+"&w="+c.width+"&h="+c.height,{method:"POST",headers:{"content-type":"image/jpeg"},body:blob}).then(function(r){if(!r.ok)throw new Error("Photo failed ("+r.status+")");return r.json()}).then(function(j){it.image=j.image;it.imageSrc=j.imageSrc;render();status("Photo saved ✓","saved")}).catch(function(e){status(e.message,"err")})},"image/jpeg",0.85)};img.src=url});
var scanStream=null,scanT=null;
function scanStop(){clearTimeout(scanT);if(scanStream){scanStream.getTracks().forEach(function(x){x.stop()});scanStream=null}document.getElementById("scanOv").style.display="none";document.getElementById("scanVid").srcObject=null}
function scanInto(cb,input){var det=null;try{det=("BarcodeDetector" in window)?new BarcodeDetector():null}catch(e){}
  if(!det||!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){alert("This phone's browser can't read barcodes with the camera. Type the code, or plug in a scanner (it types the code for you).");if(input)input.focus();return}
  var o=document.getElementById("scanOv"),v=document.getElementById("scanVid");o.style.display="flex";document.getElementById("scanMsg").textContent="Hold the barcode in front of the camera.";
  navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}}).then(function(st){scanStream=st;v.srcObject=st;v.play().catch(function(){});
    var loop=function(){if(!scanStream)return;if(v.readyState>=2){det.detect(v).then(function(codes){var c=codes&&codes.length&&codes[0].rawValue;if(c){scanStop();cb(String(c).replace(/[^0-9A-Za-z\-._]/g,"").slice(0,64))}else scanT=setTimeout(loop,250)}).catch(function(){scanT=setTimeout(loop,400)})}else scanT=setTimeout(loop,250)};loop()
  }).catch(function(){scanStop();alert("Couldn't open the camera. Type the code instead.");if(input)input.focus()})}
document.getElementById("scanCancel").addEventListener("click",scanStop);
var find=document.getElementById("find");var findBar=document.getElementById("findbar");
function applyFind(){var q=(find.value||"").trim().toLowerCase();var n=0,shown=0;m.querySelectorAll("[data-s]").forEach(function(sec){var s=data.sections[+sec.dataset.s];var secHit=!q||s.name.toLowerCase().indexOf(q)>=0;var any=false;sec.querySelectorAll("[data-i]").forEach(function(row){var it=s.items[+row.dataset.i];n++;var hit=secHit||(it.name||"").toLowerCase().indexOf(q)>=0||(it.barcode||"").indexOf(q)>=0||(it.note||"").toLowerCase().indexOf(q)>=0;row.style.display=hit?"":"none";if(hit){any=true;shown++}});sec.style.display=any||secHit?"":"none"});document.getElementById("findMsg").textContent=q?shown+" of "+n+" shown":""}
find.addEventListener("input",applyFind);
var _render=render;render=function(){_render();var n=0;data.sections.forEach(function(s){n+=s.items.length});findBar.hidden=n<15;if(!findBar.hidden&&find.value)applyFind()};
var impPrev=document.getElementById("impPrev"),impMsg=document.getElementById("impMsg"),impText=document.getElementById("impText"),impCols=null,impHeader=null;
document.getElementById("impFile").addEventListener("change",function(e){var f=e.target.files&&e.target.files[0];if(!f)return;if(f.size>2000000){impMsg.textContent="That file is over 2 MB. Split it in two.";return}var rd=new FileReader();rd.onload=function(){impText.value=String(rd.result||"");impCols=null;impHeader=null;preview()};rd.readAsText(f)});
function imp(body){return fetch(BASE+"/import",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}).then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error(j.error||"Import failed ("+r.status+")");return j})})}
function preview(){impMsg.textContent="Reading…";var body={text:impText.value,dryRun:true};if(impCols)body.columns=impCols;if(impHeader!==null)body.hasHeader=impHeader;
  imp(body).then(function(j){var p=j.preview;impCols=p.columns.map(function(c){return c.field});impHeader=p.hasHeader;impMsg.textContent="";
    var h='<p style="margin:8px 0 4px"><b>'+p.rows+' item'+(p.rows===1?'':'s')+'</b> in <b>'+p.sections+' ${escHtml(sec)}'+(p.sections===1?'':'s')+'</b>'+(p.hasHeader?' (first row is the headings)':' (no heading row)')+'. Check what each column is:</p><div class="row">';
    p.columns.forEach(function(c,i){h+='<label class="small" style="flex:1 1 140px">'+(c.header?esc(c.header):'Column '+(i+1))+'<br><span class="muted">e.g. '+esc(c.sample||'—')+'</span><select data-col="'+i+'" style="width:100%;margin-top:2px;font:inherit;padding:6px;border:1px solid var(--line);border-radius:8px">'+p.choices.map(function(ch){return '<option value="'+esc(ch[0])+'"'+(ch[0]===c.field?' selected':'')+'>'+esc(ch[1])+'</option>'}).join('')+'</select></label>'});
    h+='</div><label class="small" style="display:block;margin:8px 0"><input type="checkbox" id="impHdr"'+(p.hasHeader?' checked':'')+'> The first row is headings, not an item</label>';
    h+='<label class="small" style="display:block;margin:8px 0">Rows with no ${escHtml(sec)} go in <input id="impSec" value="'+esc(p.fallback)+'" style="font:inherit;padding:6px;border:1px solid var(--line);border-radius:8px"></label>';
    h+='<div class="small" style="margin:8px 0"><label style="display:block"><input type="radio" name="impMode" value="merge" checked> <b>Add &amp; update</b>: items already on the board (same barcode or name) get the new price and count; new ones are added. Photos stay.</label><label style="display:block;margin-top:4px"><input type="radio" name="impMode" value="replace"> <b>Replace everything</b>: the board becomes exactly this list (photos and cards are kept by name).</label></div>';
    if(p.sample.length){h+='<p class="small muted" style="margin:4px 0">First rows: '+p.sample.map(function(r){return esc(r.section)+' › '+esc(r.name)+(r.price?' '+esc(r.price):'')+(r.qty!=null?' ×'+r.qty:'')}).join(' · ')+'</p>'}
    h+='<button class="btn" id="impGo" type="button" style="margin-top:6px">Put '+p.rows+' item'+(p.rows===1?'':'s')+' on the board</button>';
    impPrev.innerHTML=h;impPrev.hidden=false;
    impPrev.querySelectorAll("select[data-col]").forEach(function(sel){sel.addEventListener("change",function(){impCols[+sel.dataset.col]=sel.value;preview()})});
    document.getElementById("impHdr").addEventListener("change",function(e){impHeader=e.target.checked;preview()});
    document.getElementById("impGo").addEventListener("click",function(){var mode=(impPrev.querySelector('input[name="impMode"]:checked')||{}).value||"merge";if(mode==="replace"&&!confirm("Replace everything on the board with this list?"))return;impMsg.textContent="Importing…";document.getElementById("impGo").disabled=true;
      imp({text:impText.value,mode:mode,columns:impCols,hasHeader:impHeader,section:document.getElementById("impSec").value}).then(function(j){var r=j.result;impMsg.textContent="Done ✓ "+r.added+" added, "+r.updated+" updated"+(r.skipped?", "+r.skipped+" skipped (the board holds 2,000 items)":"")+". "+r.items+" items in "+r.sections+" ${escHtml(sec)}s.";impPrev.hidden=true;impText.value="";impCols=null;impHeader=null;load();window.scrollTo(0,0)}).catch(function(e){impMsg.textContent=e.message;document.getElementById("impGo").disabled=false})});
  }).catch(function(e){impMsg.textContent=e.message;impPrev.hidden=true})}
document.getElementById("impPreview").addEventListener("click",function(){impCols=null;impHeader=null;preview()});
var hitOv=document.getElementById("hitOv"),hitBody=document.getElementById("hitBody");var scanModeBtn=document.getElementById("scanMode");
function findCode(code){for(var i=0;i<data.sections.length;i++){var s=data.sections[i];for(var j=0;j<s.items.length;j++)if((s.items[j].barcode||"")===code)return{s:s,it:s.items[j]}}return null}
function hitClose(){hitOv.style.display="none"}
hitOv.addEventListener("click",function(e){if(e.target===hitOv)hitClose()});
function qtyRowHtml(){return '<div class="row" style="margin:10px 0;align-items:center"><span>How many?</span><button class="chip" id="hM" type="button">−</button><b id="hN" style="min-width:2ch;text-align:center">1</b><button class="chip" id="hP" type="button">+</button><input id="hIn" inputmode="numeric" placeholder="Other" style="max-width:5em"></div>'}
var hq=1;function bindQty(){hq=1;var show=function(){document.getElementById("hN").textContent=hq};document.getElementById("hM").onclick=function(){hq=Math.max(1,hq-1);show()};document.getElementById("hP").onclick=function(){hq=Math.min(9999,hq+1);show()};document.getElementById("hIn").addEventListener("input",function(){var n=parseInt(this.value,10);if(n>0){hq=Math.min(9999,n);show()}})}
function afterHit(text){hitBody.innerHTML='<p class="saved">'+esc(text)+'</p><div class="row"><button class="btn" id="hNext" type="button">▦ Scan the next one</button><button class="btn btn--line" id="hDone" type="button">Done</button></div>';document.getElementById("hNext").onclick=function(){hitClose();scanInto(scanHit,null)};document.getElementById("hDone").onclick=hitClose}
function scanHit(code){var hit=findCode(code);hitOv.style.display="flex";
  if(hit){hitBody.innerHTML='<h3 style="margin:0 0 4px">'+esc(hit.it.name)+'</h3><p class="small muted" style="margin:0">In '+esc(hit.s.name)+(hit.it.qty==null?"":" · "+hit.it.qty+" in stock")+(hit.it.price?" · "+esc(hit.it.price):"")+' · code '+esc(code)+'</p>'+qtyRowHtml()+'<div class="row"><button class="btn" id="hPut" type="button">➕ Put in</button><button class="btn btn--line" id="hOut" type="button">➖ Take out</button><button class="ic" id="hX" type="button" title="Cancel">✕</button></div>';bindQty();
    document.getElementById("hPut").onclick=function(){hit.it.qty=Math.min(9999,(Number(hit.it.qty)||0)+hq);hit.it.soldOut=false;render();save(true);afterHit("Put in "+hq+" · "+hit.it.name+" now "+hit.it.qty)};
    document.getElementById("hOut").onclick=function(){hit.it.qty=Math.max(0,(Number(hit.it.qty)||0)-hq);if(hit.it.qty===0)hit.it.soldOut=true;render();save(true);afterHit("Took out "+hq+" · "+hit.it.name+" now "+hit.it.qty+(hit.it.qty===0?" (sold out)":""))};
    document.getElementById("hX").onclick=hitClose;return}
  hitBody.innerHTML='<p>Looking up '+esc(code)+'…</p>';
  fetch(BASE+"/lookup?code="+encodeURIComponent(code)).then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error(j.error||"Lookup failed");return j})}).then(function(j){
    var known=j.catalog||null;var nm=known?known.name:(j.suggestion||"");
    var secOpts=data.sections.map(function(s,i){return '<option value="'+i+'">'+esc(s.name)+'</option>'}).join("")+'<option value="new">+ New ${escHtml(sec)}…</option>';
    hitBody.innerHTML='<h3 style="margin:0 0 4px">'+(known?"Known, none in right now":"New product")+'</h3><p class="small muted" style="margin:0">Code '+esc(code)+(j.suggestion&&!known?" · found online, fix the name if it is wrong":"")+'</p><div class="row" style="margin-top:8px"><input id="hName" class="nm" placeholder="Name" value="'+esc(nm)+'"><input id="hPrice" class="pr" placeholder="$" inputmode="decimal" value="'+esc(known&&known.price||"")+'"></div><div class="row" style="margin-top:6px"><label class="small">Goes in <select id="hSec" style="font:inherit;padding:6px">'+secOpts+'</select></label></div>'+qtyRowHtml()+'<div class="row"><button class="btn" id="hAdd" type="button">➕ Put in</button><button class="ic" id="hX" type="button" title="Cancel">✕</button></div>';bindQty();
    if(!nm)setTimeout(function(){document.getElementById("hName").focus()},50);
    document.getElementById("hX").onclick=hitClose;
    document.getElementById("hAdd").onclick=function(){var name=document.getElementById("hName").value.trim();if(!name){alert("Give it a name.");return}var si=document.getElementById("hSec").value;var s;if(si==="new"){var n=prompt("${escHtml(W.section)} or section name");if(!n||!n.trim())return;s={name:n.trim(),slug:"",note:"",items:[]};data.sections.push(s)}else s=data.sections[+si];
      var ex=null;for(var k=0;k<s.items.length;k++)if(s.items[k].name.toLowerCase()===name.toLowerCase())ex=s.items[k];
      if(ex){ex.qty=Math.min(9999,(Number(ex.qty)||0)+hq);ex.soldOut=false;ex.barcode=code}else s.items.push({name:name,price:document.getElementById("hPrice").value.trim(),note:"",qty:hq,soldOut:false,image:known?known.image:null,imageSrc:known?known.imageSrc:null,barcode:code});
      render();save(true);afterHit("Put in "+hq+" · "+name)}
  }).catch(function(e){hitBody.innerHTML='<p class="err">'+esc(e.message)+'</p><div class="row"><button class="btn btn--line" id="hX" type="button">Close</button></div>';document.getElementById("hX").onclick=hitClose})}
if(scanModeBtn)scanModeBtn.addEventListener("click",function(){scanInto(scanHit,null)});
document.getElementById("addTank").addEventListener("click",function(){var n=prompt("${escHtml(W.section)} or section name (e.g. ${escHtml(W.section)} 12, New arrivals)");if(!n||!n.trim())return;data.sections.push({name:n.trim(),slug:"",note:"",items:[]});render();save(true);window.scrollTo(0,document.body.scrollHeight)});
load();
})();
</script></body></html>`;
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
      "referrer-policy": "no-referrer",
      "content-security-policy":
        "default-src 'self'; img-src 'self' blob: data: https:; media-src 'self' blob: mediastream:; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'",
    },
  });
}
