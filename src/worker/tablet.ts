import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { hmac, safeEqual } from "./auth.ts";
import { draftItemInfo, infoRows } from "../copy/iteminfo.ts";
import { autoMatchPhotos, sectionSlug } from "../generator/packs/retail.ts";
import {
  KINDS,
  kindWords,
  listKind,
  scanningOn,
} from "../generator/pricelist.ts";
import type {
  BusinessRecord,
  CatalogEntry,
  Image,
  ItemInfo,
  MenuItem,
} from "../generator/types.ts";
import {
  getLead,
  getSetting,
  setSetting,
  updateLead,
  type LeadRow,
} from "./db.ts";
import { HttpError, newId, type Env } from "./env.ts";
import { escHtml } from "./page.ts";
import { appIconSvg, homescreenHead, homescreenPrompt, webManifest } from "./homescreen.ts";
import {
  photoUrl,
  priceList,
  pricesFeed,
  recordOf,
  saveAndRefresh,
  stamp,
} from "./tankboard.ts";

/**
 * The tablet station (`/d/<leadId>/<tank>`): the screen by the tank. Customers see what's in the tank with prices and tap a
 * fish for its care card. Staff tap "Staff", prove it's them (PIN, an NFC staff tag, or an approval code from the shop's own
 * board on their phone) and get an inventory station: +1 / −1 / set the count, sold out, "Add" from the catalog of
 * everything the shop has stocked (or a new fish: name, count, a photo from the tablet's camera, a care card drafted by
 * Claude), and a photo button per item. Nothing a customer can reach changes stock. Staff sessions are signed tokens
 * (12 h, tied to the shop's client key, so "Revoke old links" ends them too) and the station locks itself after 3 idle minutes.
 */

const STAFF_HOURS = 12;
const PIN_FAILS = 8;
const PIN_LOCK_MS = 15 * 60_000;
const UNLOCK_MS = 10 * 60_000;

async function staffToken(env: Env, lead: LeadRow): Promise<string> {
  const exp = Date.now() + STAFF_HOURS * 3_600_000;
  return `${exp}.${await hmac(env.APP_SECRET, `staff.${lead.id}.${lead.client_key}.${exp}`)}`;
}

async function verifyStaff(
  env: Env,
  lead: LeadRow,
  token: string | null,
): Promise<boolean> {
  if (!token || !lead.client_key) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < Date.now())
    return false;
  return safeEqual(
    sig,
    await hmac(env.APP_SECRET, `staff.${lead.id}.${lead.client_key}.${exp}`),
  );
}

/** The text to write on a staff NFC tag (any "NFC Tools" app): `ua-staff:<secret>`. Shown on the board. */
export async function nfcSecret(env: Env, lead: LeadRow): Promise<string> {
  return (
    await hmac(env.APP_SECRET, `nfc.${lead.id}.${lead.client_key ?? ""}`)
  ).slice(0, 16);
}

/** Makes the client key if the shop never got a board link yet (the station needs it to sign tokens). */
async function withKey(env: Env, lead: LeadRow): Promise<LeadRow> {
  if (lead.client_key) return lead;
  const key = newId();
  await updateLead(env, lead.id, { client_key: key });
  return { ...lead, client_key: key };
}

// ---- pure stock edits (tested) ----

export function catalogOf(record: BusinessRecord): CatalogEntry[] {
  const pl = priceList(record);
  const by = new Map<string, CatalogEntry>();
  for (const c of pl.catalog ?? []) by.set(c.name.toLowerCase(), c);
  for (const s of pl.sections)
    for (const it of s.items) {
      const k = it.name.toLowerCase();
      const c = by.get(k) ?? { name: it.name };
      by.set(k, {
        ...c,
        name: c.name || it.name,
        price: it.price ?? c.price,
        image: it.image ?? c.image,
        info: it.info ?? c.info,
        barcode: it.barcode ?? c.barcode,
      });
    }
  return [...by.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function touchCatalog(record: BusinessRecord): void {
  record.ext.retail!.priceList = {
    ...priceList(record),
    catalog: catalogOf(record),
    lastUpdated: stamp(),
  };
}

function findItem(
  record: BusinessRecord,
  section: string,
  item: string,
): MenuItem | null {
  const sec = priceList(record).sections.find((s) => s.name === section);
  return sec?.items.find((it) => it.name === item) ?? null;
}

/** +n / −n on a count; a count of 0 hides the item on the page (kept on the board); anything above 0 clears Sold out. */
export function adjustQty(
  record: BusinessRecord,
  section: string,
  item: string,
  delta: number,
): MenuItem {
  const it = findItem(record, section, item);
  if (!it) throw new HttpError(404, "That item isn't on this tank any more");
  it.qty = Math.max(0, Math.min(9999, (it.qty ?? 0) + delta));
  if (it.qty > 0) it.soldOut = undefined;
  touchCatalog(record);
  return it;
}

export function setItem(
  record: BusinessRecord,
  section: string,
  item: string,
  change: {
    qty?: number | null;
    soldOut?: boolean;
    price?: string;
    info?: ItemInfo;
    barcode?: string;
  },
): MenuItem {
  const it = findItem(record, section, item);
  if (!it) throw new HttpError(404, "That item isn't on this tank any more");
  if (change.qty !== undefined)
    it.qty =
      change.qty === null ? undefined : Math.max(0, Math.min(9999, change.qty));
  if (change.soldOut !== undefined) it.soldOut = change.soldOut || undefined;
  if (change.price !== undefined) it.price = change.price.trim() || undefined;
  if (change.info !== undefined) it.info = change.info;
  if (change.barcode !== undefined)
    setBarcodeEverywhere(record, it.name, normalizeCode(change.barcode));
  touchCatalog(record);
  return it;
}

/** Barcodes as the scanner reads them: digits and letters only, no spaces; 64 characters at most. */
export function normalizeCode(code: string): string {
  return code.replace(/[^0-9A-Za-z\-._]/g, "").slice(0, 64);
}

/** The same product in two sections shares one barcode; the catalog remembers it after the last one sells. An empty code clears it. */
export function setBarcodeEverywhere(
  record: BusinessRecord,
  name: string,
  code: string,
): void {
  const pl = priceList(record);
  const key = name.toLowerCase();
  for (const s of pl.sections)
    for (const it of s.items) {
      if (it.name.toLowerCase() === key) it.barcode = code || undefined;
      else if (code && it.barcode === code) it.barcode = undefined; // one code, one product
    }
  const cat = (pl.catalog ?? []).map((c) =>
    c.name.toLowerCase() === key
      ? { ...c, barcode: code || undefined }
      : code && c.barcode === code
        ? { ...c, barcode: undefined }
        : c,
  );
  record.ext.retail!.priceList = { ...pl, catalog: cat };
}

/** What a scanned code is: a row on the board (the current section first), else something from the catalog, else nothing. */
export function findByBarcode(
  record: BusinessRecord,
  code: string,
  preferSection?: string,
): { item?: { section: string; item: MenuItem }; catalog?: CatalogEntry } {
  const c = normalizeCode(code);
  if (!c) return {};
  const pl = priceList(record);
  const rows: { section: string; item: MenuItem }[] = [];
  for (const s of pl.sections)
    for (const it of s.items)
      if (it.barcode === c) rows.push({ section: s.name, item: it });
  const item = rows.find((r) => r.section === preferSection) ?? rows[0];
  if (item) return { item };
  const cat = catalogOf(record).find((x) => x.barcode === c);
  return cat ? { catalog: cat } : {};
}

/** Puts `qty` of a thing into a tank: an existing row gets the count added; a known catalog item brings its photo, price and care card. */
export function addToTank(
  record: BusinessRecord,
  section: string,
  name: string,
  qty: number,
  price?: string,
  barcode?: string,
): { item: MenuItem; isNew: boolean } {
  const pl = priceList(record);
  let sec = pl.sections.find((s) => s.name === section);
  if (!sec) {
    sec = { name: section, items: [] };
    pl.sections.push(sec);
  }
  const existing = sec.items.find(
    (it) => it.name.toLowerCase() === name.toLowerCase(),
  );
  if (existing) {
    existing.qty = Math.min(9999, (existing.qty ?? 0) + qty);
    existing.soldOut = undefined;
    if (price?.trim()) existing.price = price.trim();
    if (barcode && normalizeCode(barcode))
      setBarcodeEverywhere(record, existing.name, normalizeCode(barcode));
    touchCatalog(record);
    return { item: existing, isNew: false };
  }
  const known = catalogOf(record).find(
    (c) => c.name.toLowerCase() === name.toLowerCase(),
  );
  const item: MenuItem = {
    name: known?.name ?? name.trim(),
    price: price?.trim() || known?.price,
    qty,
    image: known?.image,
    info: known?.info,
    barcode: known?.barcode,
  };
  sec.items.push(item);
  record.ext.retail!.priceList = pl;
  if (barcode && normalizeCode(barcode))
    setBarcodeEverywhere(record, item.name, normalizeCode(barcode));
  touchCatalog(record);
  return { item, isNew: !known };
}

/** Applies a care card to every row with that name and to the catalog. */
export function setInfoEverywhere(
  record: BusinessRecord,
  name: string,
  info: ItemInfo | undefined,
): void {
  const pl = priceList(record);
  for (const s of pl.sections)
    for (const it of s.items)
      if (it.name.toLowerCase() === name.toLowerCase()) it.info = info;
  const cat = catalogOf(record);
  const c = cat.find((x) => x.name.toLowerCase() === name.toLowerCase());
  if (c) c.info = info;
  else cat.push({ name, info });
  record.ext.retail!.priceList = { ...pl, catalog: cat, lastUpdated: stamp() };
}

// ---- unlock flows (settings-table state) ----

interface Pending {
  session: string;
  code: string;
  exp: number;
  ok: boolean;
}

async function pendingList(env: Env, leadId: string): Promise<Pending[]> {
  const raw = await getSetting(env, `unlock.${leadId}`);
  const now = Date.now();
  return raw ? (JSON.parse(raw) as Pending[]).filter((p) => p.exp > now) : [];
}

async function savePending(
  env: Env,
  leadId: string,
  list: Pending[],
): Promise<void> {
  await setSetting(env, `unlock.${leadId}`, JSON.stringify(list.slice(-10)));
}

/** The phone side: the shop types the tablet's code on their board. */
export async function approveUnlock(
  env: Env,
  leadId: string,
  code: string,
): Promise<boolean> {
  const list = await pendingList(env, leadId);
  const p = list.find((x) => x.code === code.replace(/\D/g, ""));
  if (!p) return false;
  p.ok = true;
  await savePending(env, leadId, list);
  return true;
}

export async function setStaffPin(
  env: Env,
  lead: LeadRow,
  record: BusinessRecord,
  pin: string,
): Promise<void> {
  if (pin && !/^\d{4,8}$/.test(pin))
    throw new HttpError(400, "The staff PIN is 4 to 8 digits");
  record.ext.retail!.priceList = {
    ...priceList(record),
    staffPin: pin || undefined,
  };
  await updateLead(env, lead.id, { record_json: JSON.stringify(record) });
}

const ItemRef = {
  section: z.string().trim().min(1).max(60),
  item: z.string().trim().min(1).max(120),
};
const InfoSchema = z.object({
  kind: z
    .enum([
      "fish",
      "invertebrate",
      "plant",
      "reptile",
      "bird",
      "small_animal",
      "other",
    ])
    .optional(),
  maxSize: z.string().trim().max(40).optional(),
  diet: z.string().trim().max(80).optional(),
  temperament: z.string().trim().max(60).optional(),
  minTank: z.string().trim().max(40).optional(),
  care: z.string().trim().max(20).optional(),
  water: z.string().trim().max(80).optional(),
  origin: z.string().trim().max(60).optional(),
  notes: z.string().trim().max(300).optional(),
  facts: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(40),
        value: z.string().trim().max(120),
      }),
    )
    .max(12)
    .optional(),
});

const cleanInfo = (i: z.infer<typeof InfoSchema>): ItemInfo | undefined => {
  const out: ItemInfo = {};
  for (const [k, v] of Object.entries(i)) {
    if (k === "facts") {
      const f = (v as Array<{ label: string; value: string }>).filter(
        (x) => x.value,
      );
      if (f.length) out.facts = f;
    } else if (v) (out as Record<string, unknown>)[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
};

const noStore = { "cache-control": "no-store" };

/** A product name for a retail UPC/EAN from Open Food Facts (free, no key; food, drink, pet food and some household goods). Best effort: null when unknown or slow. */
export async function lookupBarcode(
  code: string,
  fetcher: typeof fetch = fetch,
): Promise<string | null> {
  if (!/^\d{8,14}$/.test(code)) return null;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 4000);
    const r = await fetcher(
      `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,brands,quantity`,
      {
        headers: {
          "user-agent":
            "UndergroundAssociates/1.0 (live price list; undergroundassociates.com)",
        },
        signal: ctl.signal,
      },
    );
    clearTimeout(t);
    if (!r.ok) return null;
    const j = (await r.json()) as {
      product?: { product_name?: string; brands?: string; quantity?: string };
    };
    const p = j.product;
    const name = p?.product_name?.trim();
    if (!name) return null;
    const brand = ((p?.brands ?? "").split(",")[0] ?? "").trim();
    const qty = p?.quantity?.trim() ?? "";
    return [
      brand && !name.toLowerCase().includes(brand.toLowerCase()) ? brand : "",
      name,
      qty && !name.includes(qty) ? qty : "",
    ]
      .filter(Boolean)
      .join(" ")
      .slice(0, 120);
  } catch {
    return null;
  }
}

/**
 * `/l/<leadId>/unlock/*` (public, from the tablet) and `/l/<leadId>/staff/*` (needs header `x-staff`). `rest` starts after the lead id.
 */
export async function serveStation(
  env: Env,
  req: Request,
  leadId: string,
  rest: string,
  origin: string,
): Promise<Response> {
  const lead0 = await getLead(env, leadId);
  const record = lead0 && recordOf(lead0);
  if (!lead0 || !record || lead0.status === "expired")
    throw new HttpError(404, "Not found");
  const lead = await withKey(env, lead0);
  const pl = priceList(record);

  // --- unlock ---
  if (rest === "/unlock/pin" && req.method === "POST") {
    const { pin } = (await req.json()) as { pin?: string };
    const key = `pinfail.${leadId}`;
    const fail = JSON.parse((await getSetting(env, key)) ?? "null") as {
      n: number;
      until: number;
    } | null;
    if (fail && fail.until > Date.now())
      throw new HttpError(
        429,
        "Too many tries. Wait 15 minutes, or approve from the shop's phone.",
      );
    if (!pl.staffPin)
      throw new HttpError(
        409,
        "No staff PIN is set yet. Set one on your board, or approve from your phone.",
      );
    if (!pin || !safeEqual(String(pin), pl.staffPin)) {
      const n =
        (fail && fail.until > Date.now() - PIN_LOCK_MS ? fail.n : 0) + 1;
      await setSetting(
        env,
        key,
        JSON.stringify({
          n,
          until: n >= PIN_FAILS ? Date.now() + PIN_LOCK_MS : 0,
        }),
      );
      throw new HttpError(
        403,
        n >= PIN_FAILS
          ? "Too many tries. Wait 15 minutes."
          : "That PIN isn't right",
      );
    }
    await setSetting(env, key, "null");
    return Response.json(
      { token: await staffToken(env, lead) },
      { headers: noStore },
    );
  }
  if (rest === "/unlock/nfc" && req.method === "POST") {
    const { secret } = (await req.json()) as { secret?: string };
    if (!secret || !safeEqual(secret.trim(), await nfcSecret(env, lead)))
      throw new HttpError(403, "That tag isn't one of this shop's staff tags");
    return Response.json(
      { token: await staffToken(env, lead) },
      { headers: noStore },
    );
  }
  if (rest === "/unlock/start" && req.method === "POST") {
    const list = await pendingList(env, leadId);
    const p: Pending = {
      session: newId(),
      code: String(Math.floor(100000 + Math.random() * 900000)),
      exp: Date.now() + UNLOCK_MS,
      ok: false,
    };
    list.push(p);
    await savePending(env, leadId, list);
    return Response.json(
      { session: p.session, code: p.code, expiresIn: UNLOCK_MS / 1000 },
      { headers: noStore },
    );
  }
  const poll = /^\/unlock\/([a-z0-9]+)$/.exec(rest);
  if (poll && req.method === "GET") {
    const list = await pendingList(env, leadId);
    const p = list.find((x) => x.session === poll[1]);
    if (!p)
      return Response.json({ ok: false, expired: true }, { headers: noStore });
    if (!p.ok) return Response.json({ ok: false }, { headers: noStore });
    await savePending(
      env,
      leadId,
      list.filter((x) => x !== p),
    );
    return Response.json(
      { ok: true, token: await staffToken(env, lead) },
      { headers: noStore },
    );
  }

  // --- staff (locked) ---
  if (!rest.startsWith("/staff/")) throw new HttpError(404, "Not found");
  if (!(await verifyStaff(env, lead, req.headers.get("x-staff"))))
    throw new HttpError(401, "Locked. Tap Staff and unlock again.");
  const url = new URL(req.url);
  const feed = () =>
    Response.json(
      {
        ...pricesFeed(lead, record, origin, true),
        catalog: catalogOf(record).map((c) => ({
          name: c.name,
          price: c.price ?? "",
          image: photoUrl(lead, origin, c.image),
          hasInfo: !!c.info,
          barcode: c.barcode ?? "",
        })),
      },
      { headers: noStore },
    );

  if (rest === "/staff/data" && req.method === "GET") return feed();
  if (rest === "/staff/find" && req.method === "GET") {
    if (!scanningOn(record))
      throw new HttpError(
        403,
        "Barcode scanning isn't turned on for this shop. It's an add-on; ask us to switch it on.",
      );
    // A scanned barcode: a row on the board, a catalog item, or (new) a product name looked up by its UPC/EAN.
    const code = normalizeCode(url.searchParams.get("code") ?? "");
    if (!code) throw new HttpError(400, "No code read");
    const hit = findByBarcode(
      record,
      code,
      url.searchParams.get("section") ?? undefined,
    );
    const out: Record<string, unknown> = { code };
    if (hit.item)
      out.item = {
        section: hit.item.section,
        name: hit.item.item.name,
        qty: hit.item.item.qty ?? null,
        price: hit.item.item.price ?? "",
        image: photoUrl(lead, origin, hit.item.item.image),
      };
    else if (hit.catalog)
      out.catalog = {
        name: hit.catalog.name,
        price: hit.catalog.price ?? "",
        image: photoUrl(lead, origin, hit.catalog.image),
      };
    else out.suggestion = await lookupBarcode(code);
    return Response.json(out, { headers: noStore });
  }
  if (rest === "/staff/adjust" && req.method === "POST") {
    const b = z
      .object({ ...ItemRef, delta: z.number().int().min(-9999).max(9999) })
      .parse(await req.json());
    adjustQty(record, b.section, b.item, b.delta);
    await saveAndRefresh(env, lead, record, { quick: true });
    return feed();
  }
  if (rest === "/staff/set" && req.method === "POST") {
    const b = z
      .object({
        ...ItemRef,
        qty: z.number().int().min(0).max(9999).nullable().optional(),
        soldOut: z.boolean().optional(),
        price: z.string().max(30).optional(),
        info: InfoSchema.optional(),
        barcode: z.string().max(80).optional(),
      })
      .parse(await req.json());
    setItem(record, b.section, b.item, {
      qty: b.qty,
      soldOut: b.soldOut,
      price: b.price,
      info: b.info ? cleanInfo(b.info) : undefined,
      barcode: b.barcode,
    });
    if (b.info) setInfoEverywhere(record, b.item, cleanInfo(b.info));
    await saveAndRefresh(env, lead, record, { quick: true });
    return feed();
  }
  if (rest === "/staff/add" && req.method === "POST") {
    const b = z
      .object({
        section: z.string().trim().min(1).max(60),
        name: z.string().trim().min(1).max(120),
        qty: z.number().int().min(1).max(9999),
        price: z.string().trim().max(30).optional(),
        barcode: z.string().max(80).optional(),
      })
      .parse(await req.json());
    const { item, isNew } = addToTank(
      record,
      b.section,
      b.name,
      b.qty,
      b.price,
      b.barcode,
    );
    await saveAndRefresh(env, lead, record, { quick: true });
    return Response.json(
      { ...((await feed().json()) as object), added: item.name, isNew },
      { headers: noStore },
    );
  }
  if (rest === "/staff/photo" && req.method === "POST") {
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
    const name = url.searchParams.get("item") ?? "";
    const key = `t${newId().slice(0, 10)}`;
    await env.BUCKET.put(`owner/${leadId}/${key}.${ext}`, bytes, {
      httpMetadata: { contentType: type },
    });
    const img: Image = {
      src: `/assets/owner/${key}.${ext}`,
      alt: name || `Photo from ${record.name}`,
      source: "owner",
      width: Number(url.searchParams.get("w")) || undefined,
      height: Number(url.searchParams.get("h")) || undefined,
      caption: name || undefined,
    };
    if (record.media.gallery.length < 24) record.media.gallery.push(img);
    for (const s of pl.sections)
      for (const it of s.items)
        if (it.name.toLowerCase() === name.toLowerCase()) it.image = img;
    touchCatalog(record);
    await saveAndRefresh(env, lead, record, { quick: true });
    return Response.json(
      { ok: true, image: photoUrl(lead, origin, img) },
      { headers: noStore },
    );
  }
  if (rest === "/staff/info" && req.method === "POST") {
    const b = z
      .object({
        name: z.string().trim().min(1).max(120),
        section: z.string().max(60).optional(),
        note: z.string().max(200).optional(),
      })
      .parse(await req.json());
    if (!env.ANTHROPIC_API_KEY)
      throw new HttpError(409, "The care-card writer isn't set up");
    const info = await draftItemInfo(
      new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }),
      b.name,
      {
        shop: record.name,
        section: b.section,
        note: b.note,
        kind: listKind(record),
      },
    );
    setInfoEverywhere(record, b.name, info);
    await saveAndRefresh(env, lead, record, { quick: true });
    return Response.json(
      { info, rows: infoRows(info, listKind(record)) },
      { headers: noStore },
    );
  }
  if (rest === "/staff/info" && req.method === "PUT") {
    const b = z
      .object({ name: z.string().trim().min(1).max(120), info: InfoSchema })
      .parse(await req.json());
    setInfoEverywhere(record, b.name, cleanInfo(b.info));
    await saveAndRefresh(env, lead, record, { quick: true });
    return feed();
  }
  throw new HttpError(404, "Not found");
}

/** The tablet page itself. */
/** `/d/<id>/manifest.webmanifest` (+ `?tank=<slug>` for one tank's page) and `/d/<id>/icon.svg`: public like the display itself. */
export async function serveDisplayMeta(env: Env, leadId: string, what: "manifest" | "icon", slug: string): Promise<Response> {
  const lead = await getLead(env, leadId);
  const record = lead?.record_json ? (JSON.parse(lead.record_json) as BusinessRecord) : null;
  if (!lead || !record || lead.status === "expired") throw new HttpError(404, "Not found");
  if (what === "icon") return appIconSvg(record.name);
  const W = kindWords(record);
  const tank = slug ? priceList(record).sections.find((x) => sectionSlug(x.name) === slug) : null;
  const name = tank ? `${record.name} · ${tank.name}` : `${record.name} · display`;
  return webManifest({ name, shortName: tank ? tank.name.slice(0, 14) : record.name.slice(0, 14), description: `Live ${W.title.toLowerCase()} at ${record.name}, for a tablet or TV by the ${W.section.toLowerCase()}.`, startUrl: `/d/${leadId}/${tank ? slug : ""}`, scope: `/d/${leadId}/`, iconUrl: `/d/${leadId}/icon.svg`, display: "fullscreen" });
}

export async function serveDisplay(
  env: Env,
  leadId: string,
  slug: string,
  origin: string,
): Promise<Response> {
  const lead = await getLead(env, leadId);
  const record = lead && recordOf(lead);
  if (!lead || !record || lead.status === "expired")
    return new Response("Not found", { status: 404 });
  const feed = pricesFeed(lead, record, origin);
  const tank = slug ? feed.sections.find((x) => x.slug === slug) : null;
  const title = tank
    ? `${tank.name} · ${record.name}`
    : `${feed.title} · ${record.name}`;
  const hasPin = !!priceList(record).staffPin;
  const scan = scanningOn(record);
  const W = kindWords(record);
  const sec = W.section.toLowerCase();
  const FIELDS = JSON.stringify(W.fields.map(([k, l, ex]) => [k, l, ex]));
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow"><title>${escHtml(title)}</title>
<link rel="icon" href="/d/${escHtml(leadId)}/icon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/brand/logo-192.png">${homescreenHead({ manifestUrl: `/d/${leadId}/manifest.webmanifest${slug ? `?tank=${encodeURIComponent(slug)}` : ""}`, title: tank ? `${record.name} ${tank.name}` : record.name })}
<style>
:root{--bg:#0b1324;--ink:#f6f7fb;--muted:#9aa6bf;--gold:#fca311;--card:#141f38;--line:#2b3a5e;--ok:#2bd46f;--bad:#ff6b6b}
*{box-sizing:border-box}html,body{height:100%}body{margin:0;background:var(--bg);color:var(--ink);font:clamp(18px,2.6vw,30px)/1.3 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;overflow:hidden;-webkit-user-select:none;user-select:none;display:flex;flex-direction:column}
body.customer{cursor:none}
header{flex:none;display:flex;justify-content:space-between;align-items:baseline;padding:2vh 3vw 1vh;gap:2vw}
h1{margin:0;font-size:clamp(28px,5vw,64px);line-height:1.1}
.shop{color:var(--muted);font-size:.75em;white-space:nowrap}
/* main takes what the header leaves; the bottom padding clears the fixed footer (and the staff bar in staff mode) */
main{padding:0 3vw 7vh;flex:1 1 0;min-height:0;overflow:hidden}
body.staff main{overflow:auto;padding-bottom:30vh;font-size:.85em}
body.staff .grid{grid-template-columns:1fr}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,17em),1fr));gap:1.2vmin}
.it{display:grid;grid-template-columns:auto 1fr auto;gap:1em;align-items:center;background:var(--card);border-radius:1em;padding:.7em 1em}
.it.tap{cursor:pointer}
.ph{width:3.4em;height:3.4em;border-radius:.7em;object-fit:cover;background:#1e2b4b}
.ph--none{display:grid;place-items:center;font-size:1.6em;opacity:.5}
.nm{font-weight:700;font-size:1.15em}.nt{color:var(--muted);font-size:.8em}
.pr{font-weight:800;font-size:1.5em;color:var(--gold);white-space:nowrap;text-align:right}
.left{display:block;font-size:.55em;color:var(--muted);font-weight:600}
.empty{color:var(--muted);font-size:1.3em;padding:10vh 0;text-align:center}
footer{position:fixed;left:0;right:0;bottom:0;display:flex;justify-content:space-between;align-items:center;padding:1vh 3vw;color:var(--muted);font-size:.6em;gap:1em}
.dots{display:flex;gap:.5em}.dots i{width:.6em;height:.6em;border-radius:50%;background:#2b3a5e}.dots i.on{background:var(--gold)}
.staffbtn{font:inherit;font-size:1em;background:transparent;border:1px solid var(--line);color:var(--muted);border-radius:999px;padding:.5em 1.2em;cursor:pointer}
/* overlays */
.ov{position:fixed;inset:0;background:rgba(5,10,24,.92);display:none;align-items:center;justify-content:center;padding:4vmin;z-index:5}
.ov.on{display:flex}
.sheet{background:var(--card);border-radius:1.2em;padding:1.2em 1.4em;max-width:46em;width:100%;max-height:92vh;overflow:auto;font-size:.9em}
.sheet h2{margin:0 0 .4em;font-size:1.5em}
.sheet .big{font-size:1.6em;font-weight:800;color:var(--gold)}
.rows{display:grid;grid-template-columns:auto 1fr;gap:.3em 1em;margin:.6em 0}.rows b{color:var(--muted);font-weight:600}
.hero{width:100%;max-height:38vh;object-fit:cover;border-radius:.9em;margin:.4em 0}
.btn{font:inherit;font-size:1em;font-weight:800;border:0;border-radius:.8em;padding:.75em 1.1em;background:#2b3a5e;color:#fff;cursor:pointer;min-height:2.6em}
.btn.go{background:var(--gold);color:#14213d}.btn.ghost{background:transparent;border:2px solid var(--line)}.btn.small{font-size:.8em;padding:.5em .8em;min-height:2.2em}
.btn:disabled{opacity:.5}
.row{display:flex;gap:.6em;flex-wrap:wrap;align-items:center;margin:.5em 0}
.pad{display:grid;grid-template-columns:repeat(3,1fr);gap:.5em;max-width:16em;margin:.6em auto}.pad .btn{font-size:1.4em;min-height:1.8em}
.pin{font-size:2em;letter-spacing:.3em;text-align:center;min-height:1.4em;color:var(--gold)}
.msg{color:var(--muted);font-size:.85em;min-height:1.2em}.msg.bad{color:var(--bad)}.msg.ok{color:var(--ok)}
input,select{font:inherit;font-size:1em;padding:.6em .7em;border-radius:.6em;border:1px solid var(--line);background:#0f1830;color:var(--ink);width:100%}
.qty{display:flex;align-items:center;gap:.3em}.qty b{min-width:2.2em;text-align:center;font-size:1.2em}
.staffbar{position:fixed;left:0;right:0;bottom:0;background:#101a33;border-top:1px solid var(--line);padding:1vh 3vw;display:none;gap:.6em;align-items:center;justify-content:space-between;z-index:4}
body.staff .staffbar{display:flex}
.tanks{display:flex;gap:.5em;overflow:auto;padding:.3em 0}.tanks .btn{white-space:nowrap}
.list{display:grid;gap:.4em;max-height:50vh;overflow:auto}.list .it{padding:.5em .8em}
.chip{display:inline-block;font-size:.7em;background:#2b3a5e;border-radius:999px;padding:.15em .6em;color:#fff;margin-left:.4em}
.chip.ai{background:#4b3a7a}
/* the picker: one tile per tank. 1–9 tanks are laid out as a grid that fills the screen (--cols set per count and
   orientation, every row the same height, the photo takes what is left), so nothing scrolls; from 10 up the tiles keep a
   fixed shape and the page scrolls down, never sideways. */
body.pickhome main{display:flex;flex-direction:column}
.tiles{display:grid;grid-template-columns:repeat(var(--cols,3),1fr);grid-auto-rows:1fr;gap:1.6vmin;flex:1 1 0;min-height:0}
.tiles.scroll{flex:none;grid-auto-rows:auto;overflow:auto;max-height:100%}
.tile{background:var(--card);border-radius:1.2em;padding:.8em 1em;cursor:pointer;display:flex;flex-direction:column;gap:.3em;min-width:0;border:2px solid transparent}
.tile:active{border-color:var(--gold)}
.tile img,.tile .big{flex:1 1 0;min-height:3.2em;width:100%;object-fit:cover;border-radius:.8em;background:#1e2b4b}
.tiles.scroll .tile img,.tiles.scroll .tile .big{flex:none;aspect-ratio:16/9}
.tile .big{display:grid;place-items:center;font-size:2.4em;min-height:1.3em;opacity:.7;border-radius:.3em}
.tile .tn,.tile .tc,.tile .tl{flex:none;overflow:hidden;text-overflow:ellipsis}
.tile .tn{font-weight:800;font-size:1.2em;line-height:1.15;white-space:nowrap}.tile .tc{color:var(--gold);font-weight:700;font-size:.85em}.tile .tl{color:var(--muted);font-size:.72em;line-height:1.3;min-height:2.6em;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.tile.new{border:2px dashed var(--line);color:var(--muted);justify-content:center;align-items:center;font-size:1.1em}
#back{display:none;white-space:nowrap;flex:none}body.tankview #back{display:inline-block}
.hint{color:var(--muted);font-size:.7em;margin:0 0 1vh}
</style></head><body class="customer">
<header><button class="staffbtn" id="back" type="button">← All ${escHtml(sec)}s</button><h1 id="h">${escHtml(tank ? tank.name : feed.title)}</h1><span class="shop">${escHtml(record.name)}</span></header>
<main id="m"><p class="empty">Loading…</p></main>
<footer><span id="u"></span><span class="dots" id="dots"></span><button class="staffbtn" id="staff" type="button">Staff</button></footer>
<div class="staffbar"><div class="tanks" id="tanks"></div><div class="row" style="margin:0"><button class="btn go" id="addbtn" type="button">+ Add</button><button class="btn" id="scanbtn" type="button"${scan ? "" : " hidden"}>▦ Scan</button><button class="btn ghost" id="lock" type="button">Done</button></div></div>

<div class="ov" id="info"><div class="sheet" id="infoBody"></div></div>
<div class="ov" id="unlock"><div class="sheet">
  <h2>Staff only</h2>
  <div id="ulPin"><div class="pin" id="pinShow">&nbsp;</div><div class="pad" id="pad"></div><div class="msg" id="pinMsg">${hasPin ? "Enter the staff PIN." : "No PIN set yet: approve from the shop's phone below, or set a PIN on the ${escHtml(W.board)}."}</div></div>
  <div class="row"><button class="btn ghost" id="nfcBtn" type="button" hidden>📶 Tap your staff tag</button><button class="btn ghost" id="codeBtn" type="button">📱 Approve from the shop's phone</button><button class="btn ghost" id="ulCancel" type="button">Cancel</button></div>
  <div id="ulCode" hidden><p>On the shop's phone, open the <b>${escHtml(W.board)}</b> → <b>Tablet &amp; staff</b> → type this code:</p><p class="big" id="codeShow"></p><p class="msg" id="codeMsg">Waiting…</p></div>
</div></div>
<div class="ov" id="add"><div class="sheet">
  <h2 id="addTitle">Add to <span id="addTank"></span></h2>
  <input id="addSearch" placeholder="Search or type a new name…" autocomplete="off">
  <div class="list" id="addList"></div>
  <div id="addNew" hidden><p>New: <b id="addNewName"></b></p><div class="row"><input id="addPrice" placeholder="Price (optional)" style="max-width:10em"></div></div>
  <div id="addQty" hidden><p>How many <b id="addQtyName"></b>?</p><div class="row" id="qtyPicks"></div><div class="row"><input id="qtyCustom" inputmode="numeric" placeholder="Other" style="max-width:7em"><button class="btn small" id="qtyGo" type="button">Add</button></div></div>
  <div class="row"><button class="btn ghost" id="addCancel" type="button">Cancel</button></div>
</div></div>
<div class="ov" id="more"><div class="sheet" id="moreBody"></div></div>
<div class="ov" id="scan"><div class="sheet">
  <h2 id="scanTitle">Scan a barcode</h2>
  <video id="scanVid" playsinline muted autoplay style="width:100%;max-height:36vh;border-radius:.9em;background:#000;display:none"></video>
  <div class="row"><input id="scanIn" inputmode="numeric" placeholder="Or scan with a handheld scanner, or type the code" autocomplete="off"><button class="btn small" id="scanGo" type="button">Go</button></div>
  <p class="msg" id="scanMsg"></p>
  <div id="scanHit" hidden></div>
  <div class="row"><button class="btn ghost" id="scanCancel" type="button">Cancel</button></div>
</div></div>
<input type="file" id="cam" accept="image/*" capture="environment" hidden>
<script>
(function(){
var LEAD=${JSON.stringify(leadId)},BASE="/l/"+LEAD,FEED=BASE+"/prices.json",SLUG=${JSON.stringify(slug)},data=null,i=0,ROTATE=10000,staffTok=null,staff=false,cur=null,idle=null,pollT=null,pin="";
// one tank (a slug), rotate (?rotate=1, a passive sign), or pick (the default: every tank as a tile; tap one to open it)
var MODE=SLUG?"one":(/[?&]rotate=1/.test(location.search)?"rotate":"pick"),TITLE=${JSON.stringify(feed.title)},custIdle=null;
var SEC=${JSON.stringify(sec)},SECT=${JSON.stringify(W.section)},EMOJI=${JSON.stringify(W.emoji)},EMPTY=${JSON.stringify(W.empty)},FIELDS=${FIELDS},KIND=${JSON.stringify(listKind(record))};
// the staff token lives only while the staff screen is open: Done, 3 idle minutes or a reload all mean the PIN again
try{localStorage.removeItem("staff."+LEAD)}catch(e){}
var $=function(id){return document.getElementById(id)};
function esc(t){return String(t==null?"":t).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function api(path,opts){opts=opts||{};opts.headers=Object.assign({"content-type":"application/json"},opts.headers||{});if(staffTok)opts.headers["x-staff"]=staffTok;return fetch(BASE+path,opts).then(function(r){return r.json().then(function(j){if(!r.ok){if(r.status===401)lock();throw new Error(j.error||("Failed ("+r.status+")"))}return j})})}
function tankName(){if(cur)return cur;if(SLUG&&data){for(var k=0;k<data.sections.length;k++)if(data.sections[k].slug===SLUG)return data.sections[k].name}if(MODE==="pick")return "";return data&&data.sections.length?data.sections[i%data.sections.length].name:""}
function pick(){if(!data)return null;var n=tankName();for(var k=0;k<data.sections.length;k++)if(data.sections[k].name===n)return data.sections[k];return SLUG?{name:"",items:[]}:(MODE==="pick"?null:(data.sections[0]||null))}
function tankView(on){document.body.classList.toggle("tankview",!!on&&MODE==="pick");document.body.classList.toggle("pickhome",!on&&MODE==="pick")}
// columns for n tiles: wide screens prefer rows of 3 or 4, tall ones 1 to 3 columns; above 9 the grid scrolls
var COLS_WIDE={1:1,2:2,3:3,4:2,5:3,6:3,7:4,8:4,9:3},COLS_TALL={1:1,2:1,3:1,4:2,5:2,6:2,7:3,8:3,9:3};
function colsFor(n){var wide=innerWidth>innerHeight;if(n>9)return wide?4:3;return (wide?COLS_WIDE:COLS_TALL)[n]||3}
// the picker: one tile per tank with its first photo, how many are in, and the first few names
function renderHome(){var m=$("m"),h=$("h");h.textContent=TITLE;tankView(false);$("dots").innerHTML="";
  var secs=data?data.sections.filter(function(s){return staff||s.items.some(function(it){return !it.soldOut&&it.qty!==0})}):[];
  if(!secs.length&&!staff){m.innerHTML='<p class="empty">'+esc(EMPTY)+'</p>';return}
  var n=secs.length+(staff?1:0);
  m.innerHTML='<p class="hint">'+(staff?'Tap a '+SEC+' to count, add or change what is in it.':'Tap a '+SEC+' to see what is in it and what it needs.')+'</p><div class="tiles'+(n>9?' scroll':'')+'" style="--cols:'+colsFor(n)+'">'+secs.map(function(s){var items=staff?s.items:s.items.filter(function(it){return !it.soldOut&&it.qty!==0});var img=null;items.forEach(function(it){if(!img&&it.image)img=it.image});
    return '<div class="tile" data-tile="'+esc(s.name)+'">'+(img?'<img src="'+esc(img)+'" alt="">':'<div class="big">'+EMOJI+'</div>')+'<div class="tn">'+esc(s.name)+'</div><div class="tc">'+items.length+' in stock</div><div class="tl">'+esc(items.slice(0,3).map(function(it){return it.name}).join(" · ")+(items.length>3?" · …":""))+'</div></div>'}).join("")+(staff?'<div class="tile new" data-tile="__new">+ New '+SEC+'</div>':'')+'</div>';
  if(staff)$("tanks").innerHTML=(data?data.sections:[]).map(function(t){return '<button class="btn small ghost" data-tank="'+esc(t.name)+'">'+esc(t.name)+'</button>'}).join("")+'<button class="btn small ghost" data-tank="__new">+ New '+SEC+'</button>';
  else fit();
  $("u").textContent=data&&data.updatedAt?"Updated "+data.updatedAt:"";
  $("m").dataset.items="[]"}
var ALLF=${JSON.stringify(Object.values(KINDS).flatMap((k) => k.fields.map(([key, label]) => [key, label])))};
function rows(info){if(!info)return[];var out=[],seen={};FIELDS.concat(ALLF).forEach(function(f){if(seen[f[0]])return;var v=info[f[0]];if(typeof v==="string"&&v.trim()){out.push([f[1],v.trim()]);seen[f[0]]=1;seen["l:"+f[1].toLowerCase()]=1}});(info.facts||[]).forEach(function(f){if(f.label&&f.value&&!seen["l:"+f.label.toLowerCase()])out.push([f.label,f.value])});return out}
function render(){var s=pick();var m=$("m"),h=$("h"),d=$("dots");
  if(MODE==="pick"&&!cur){renderHome();return}
  tankView(true);
  if(!s){m.innerHTML='<p class="empty">Nothing on the board yet.'+(staff?' Tap + Add.':'')+'</p>';return}
  if(s.name)h.textContent=s.name;
  var items=staff?s.items:s.items.filter(function(it){return !it.soldOut&&it.qty!==0});
  m.innerHTML=items.length?'<div class="grid">'+items.map(function(it,k){var left=it.qty!=null&&it.qty<=5&&it.qty>0?'<span class="left">'+it.qty+' left</span>':'';
    var right=staff?'<div class="qty"><button class="btn small" data-adj="-1" data-k="'+k+'">−</button><b>'+(it.qty==null?"–":it.qty)+'</b><button class="btn small go" data-adj="1" data-k="'+k+'">+</button><button class="btn small ghost" data-more="'+k+'">⋯</button></div>':'<div class="pr">'+esc(it.price||"Ask")+left+'</div>';
    var tag=staff&&(it.soldOut||it.qty===0)?'<span class="chip">hidden</span>':'';
    return '<div class="it'+(staff?'':' tap')+'" data-k="'+k+'">'+(it.image?'<img class="ph" src="'+esc(it.image)+'" alt="">':'<div class="ph ph--none">'+EMOJI+'</div>')+'<div><div class="nm">'+esc(it.name)+tag+'</div>'+(it.note||(staff&&it.price)?'<div class="nt">'+esc(staff?(it.price||"no price")+(it.note?" · "+it.note:""):it.note)+'</div>':'')+'</div>'+right+'</div>'}).join("")+'</div>':'<p class="empty">'+(staff?'Nothing in this '+SEC+'. Tap + Add.':esc(EMPTY))+'</p>';
  d.innerHTML=MODE!=="rotate"||staff||data.sections.length<2?"":data.sections.map(function(_,k){return '<i'+(k===i%data.sections.length?' class="on"':'')+'></i>'}).join("");
  $("u").textContent=data.updatedAt?"Updated "+data.updatedAt:"";
  if(staff){$("tanks").innerHTML=data.sections.map(function(t){return '<button class="btn small'+(t.name===s.name?' go':' ghost')+'" data-tank="'+esc(t.name)+'">'+esc(t.name)+'</button>'}).join("")+'<button class="btn small ghost" data-tank="__new">+ New '+SEC+'</button>'}
  else fit();
  $("m").dataset.items=JSON.stringify(items)}
function over(){var m=$("m"),t=m.querySelector(".tiles");return m.scrollHeight>m.clientHeight+2||(t&&!t.classList.contains("scroll")&&t.scrollHeight>t.clientHeight+2)}
function fit(){var b=document.body;b.style.fontSize="";var px=parseFloat(getComputedStyle(b).fontSize);var n=0;while(over()&&px>11&&n<40){px=px*0.92;b.style.fontSize=px+"px";n++}}
window.addEventListener("resize",function(){if(MODE==="pick"&&!cur){render();return}if(!staff)fit()});
function load(){return (staff?api("/staff/data"):fetch(FEED,{cache:"no-store"}).then(function(r){return r.json()})).then(function(j){data=j;render()}).catch(function(){})}
load();setInterval(function(){if(!staff&&!$("info").classList.contains("on"))load()},30000);
setInterval(function(){if(MODE==="rotate"&&!staff&&!$("info").classList.contains("on")){i++;render()}},ROTATE);
// a customer who opened a tank and walked away: back to the picker after 90 s
function custTouch(){clearTimeout(custIdle);if(MODE==="pick"&&!staff&&cur)custIdle=setTimeout(function(){if(!staff){cur=null;$("info").classList.remove("on");render()}},90000)}
document.addEventListener("pointerdown",custTouch);
$("back").onclick=function(){cur=null;render()};
$("m").addEventListener("click",function(e){var t=e.target.closest("[data-tile]");if(!t)return;if(t.dataset.tile==="__new"){var n=prompt("Name the new "+SEC);if(!n||!n.trim())return;cur=n.trim();openAdd();return}cur=t.dataset.tile;render();custTouch()});
function wake(){if(navigator.wakeLock)navigator.wakeLock.request("screen").catch(function(){})}
wake();document.addEventListener("visibilitychange",function(){if(!document.hidden)wake()});
// ---- customer: tap for the care card ----
$("m").addEventListener("click",function(e){var adj=e.target.closest("[data-adj]");if(adj&&staff){var s=pick(),it=s.items[+adj.dataset.k];api("/staff/adjust",{method:"POST",body:JSON.stringify({section:s.name,item:it.name,delta:+adj.dataset.adj})}).then(function(j){data=j;render();touch()}).catch(function(err){alert(err.message)});return}
  var more=e.target.closest("[data-more]");if(more&&staff){moreSheet(+more.dataset.more);return}
  var card=e.target.closest(".it.tap");if(card&&!staff){var items=JSON.parse($("m").dataset.items||"[]");showInfo(items[+card.dataset.k])}});
function showInfo(it){if(!it)return;var r=rows(it.info);var b=$("infoBody");
  b.innerHTML=(it.image?'<img class="hero" src="'+esc(it.image)+'" alt="">':'')+'<h2>'+esc(it.name)+'</h2><p class="big">'+esc(it.price||"Ask us")+(it.qty!=null&&it.qty<=5&&it.qty>0?' <span class="nt">· '+it.qty+' left</span>':'')+'</p>'+(it.note?'<p>'+esc(it.note)+'</p>':'')+(r.length?'<div class="rows">'+r.map(function(x){return '<b>'+esc(x[0])+'</b><span>'+esc(x[1])+'</span>'}).join("")+'</div>':'')+(it.info&&it.info.notes?'<p>'+esc(it.info.notes)+'</p>':'')+(!r.length&&!(it.info&&it.info.notes)?'<p class="nt">Ask us about this one.</p>':'')+'<div class="row"><button class="btn go" id="infoClose" type="button">Close</button></div>';
  $("info").classList.add("on");$("infoClose").onclick=function(){$("info").classList.remove("on")};clearTimeout(window._ic);window._ic=setTimeout(function(){$("info").classList.remove("on")},25000)}
$("info").addEventListener("click",function(e){if(e.target===$("info"))$("info").classList.remove("on")});
// ---- unlock ----
$("staff").onclick=function(){if(staffTok){enter();return}$("unlock").classList.add("on");pin="";$("pinShow").innerHTML="&nbsp;";if("NDEFReader" in window){$("nfcBtn").hidden=false}};
$("ulCancel").onclick=function(){$("unlock").classList.remove("on");stopPoll()};
var pad=$("pad");"123456789⌫0✓".split("").forEach(function(c){var b=document.createElement("button");b.className="btn"+(c==="✓"?" go":"");b.type="button";b.textContent=c;b.onclick=function(){if(c==="⌫")pin=pin.slice(0,-1);else if(c==="✓")tryPin();else if(pin.length<8)pin+=c;$("pinShow").textContent=pin?pin.replace(/./g,"•"):"";if(!pin)$("pinShow").innerHTML="&nbsp;"};pad.appendChild(b)});
function tryPin(){if(!pin)return;$("pinMsg").className="msg";$("pinMsg").textContent="Checking…";api("/unlock/pin",{method:"POST",body:JSON.stringify({pin:pin})}).then(function(j){gotToken(j.token)}).catch(function(e){$("pinMsg").className="msg bad";$("pinMsg").textContent=e.message;pin="";$("pinShow").innerHTML="&nbsp;"})}
$("nfcBtn").onclick=function(){try{var r=new NDEFReader();$("pinMsg").className="msg";$("pinMsg").textContent="Hold the staff tag to the back of the tablet…";r.scan().then(function(){r.onreading=function(ev){var txt="";try{for(var k=0;k<ev.message.records.length;k++){var rec=ev.message.records[k];if(rec.recordType==="text"){txt=new TextDecoder(rec.encoding||"utf-8").decode(rec.data);break}}}catch(e){}var m=/^ua-staff:([a-f0-9]+)/i.exec(txt||"");if(!m){$("pinMsg").className="msg bad";$("pinMsg").textContent="That tag isn't a staff tag.";return}api("/unlock/nfc",{method:"POST",body:JSON.stringify({secret:m[1]})}).then(function(j){gotToken(j.token)}).catch(function(e){$("pinMsg").className="msg bad";$("pinMsg").textContent=e.message})}}).catch(function(e){$("pinMsg").className="msg bad";$("pinMsg").textContent="NFC isn't available: "+e.message})}catch(e){$("pinMsg").className="msg bad";$("pinMsg").textContent="This tablet has no NFC."}};
$("codeBtn").onclick=function(){$("ulCode").hidden=false;$("codeMsg").textContent="Waiting…";api("/unlock/start",{method:"POST",body:"{}"}).then(function(j){$("codeShow").textContent=j.code.slice(0,3)+" "+j.code.slice(3);stopPoll();pollT=setInterval(function(){api("/unlock/"+j.session).then(function(p){if(p.ok){stopPoll();gotToken(p.token)}else if(p.expired){stopPoll();$("codeMsg").textContent="That code expired. Tap again for a new one."}})},3000)}).catch(function(e){$("codeMsg").textContent=e.message})};
function stopPoll(){if(pollT){clearInterval(pollT);pollT=null}}
function gotToken(t){staffTok=t;$("unlock").classList.remove("on");$("ulCode").hidden=true;stopPoll();enter()}
function enter(){staff=true;document.body.classList.remove("customer");document.body.classList.add("staff");$("staff").textContent="Staff ✓";cur=tankName()||null;load().then(function(){if(!data||!data.sections.length)return;if(!cur&&MODE!=="pick")cur=data.sections[0].name;render()});touch()}
function lock(){staff=false;staffTok=null;cur=null;document.body.classList.add("customer");document.body.classList.remove("staff");$("staff").textContent="Staff";["add","more","unlock"].forEach(function(id){$(id).classList.remove("on")});closeScan();load()}
$("lock").onclick=lock;
function touch(){clearTimeout(idle);idle=setTimeout(function(){if(staff)lock()},180000)}
document.addEventListener("pointerdown",function(){if(staff)touch()});
$("tanks").addEventListener("click",function(e){var b=e.target.closest("[data-tank]");if(!b)return;if(b.dataset.tank==="__new"){var n=prompt("Name the new "+SEC);if(!n||!n.trim())return;cur=n.trim();openAdd();return}cur=b.dataset.tank;render()});
// ---- add ----
var addName="",addIsNew=false;
function openAdd(){$("addTank").textContent=cur||"";$("addSearch").value="";$("addNew").hidden=true;$("addQty").hidden=true;addName="";listCatalog("");$("add").classList.add("on");setTimeout(function(){$("addSearch").focus()},50)}
$("addbtn").onclick=function(){if(!cur){if(data&&data.sections.length){alert("Tap a "+SEC+" first, or + New "+SEC+".");return}var n=prompt("Name the first "+SEC);if(!n||!n.trim())return;cur=n.trim()}openAdd()};
$("addCancel").onclick=function(){$("add").classList.remove("on")};
$("addSearch").addEventListener("input",function(){listCatalog(this.value)});
function listCatalog(q){var cat=(data&&data.catalog)||[];q=(q||"").trim().toLowerCase();var hits=cat.filter(function(c){return !q||c.name.toLowerCase().indexOf(q)>=0});
  var html=hits.map(function(c){return '<div class="it" data-pick="'+esc(c.name)+'">'+(c.image?'<img class="ph" src="'+esc(c.image)+'" alt="">':'<div class="ph ph--none">'+EMOJI+'</div>')+'<div><div class="nm">'+esc(c.name)+(c.hasInfo?'<span class="chip">info</span>':'')+'</div><div class="nt">'+esc(c.price||"")+'</div></div><div></div></div>'}).join("");
  if(q&&!hits.some(function(c){return c.name.toLowerCase()===q}))html='<div class="it" data-new="'+esc(q)+'"><div class="ph ph--none">✚</div><div><div class="nm">New: '+esc(q)+'</div><div class="nt">Add it with a photo and a care card</div></div><div></div></div>'+html;
  $("addList").innerHTML=html||'<p class="nt">Nothing yet. Type a name to add a new one.</p>'}
$("addList").addEventListener("click",function(e){var p=e.target.closest("[data-pick]"),n=e.target.closest("[data-new]");if(p){addName=p.dataset.pick;addIsNew=false}else if(n){addName=$("addSearch").value.trim();addIsNew=true;$("addNewName").textContent=addName;$("addPrice").value=""}else return;$("addNew").hidden=!addIsNew;$("addQtyName").textContent=addName;$("addQty").hidden=false;$("qtyPicks").innerHTML=[1,2,3,5,10,20].map(function(n){return '<button class="btn go" data-q="'+n+'" type="button">'+n+'</button>'}).join("");$("addQty").scrollIntoView({block:"nearest"})});
$("qtyPicks").addEventListener("click",function(e){var b=e.target.closest("[data-q]");if(b)doAdd(+b.dataset.q)});
$("qtyGo").onclick=function(){var n=parseInt($("qtyCustom").value,10);if(n>0)doAdd(n)};
function doAdd(n){var body={section:cur,name:addName,qty:n};var pr=$("addPrice").value.trim();if(addIsNew&&pr)body.price=pr;$("qtyGo").disabled=true;
  api("/staff/add",{method:"POST",body:JSON.stringify(body)}).then(function(j){data=j;$("add").classList.remove("on");render();touch();if(j.isNew){afterNew(j.added)}}).catch(function(e){alert(e.message)}).then(function(){$("qtyGo").disabled=false})}
function afterNew(name){var s=pick();var k=-1;for(var x=0;x<s.items.length;x++)if(s.items[x].name===name)k=x;
  var b=$("moreBody");b.innerHTML='<h2>'+esc(name)+' is in</h2><p>Take a photo so customers see it, and we\\'ll draft its info card.</p><div class="row"><button class="btn go" id="newPhoto" type="button">📷 Take a photo</button><button class="btn ghost" id="newSkip" type="button">Skip</button></div><p class="msg" id="newMsg"></p>';
  $("more").classList.add("on");
  $("newPhoto").onclick=function(){takePhoto(s.name,name,function(){$("newMsg").className="msg ok";$("newMsg").textContent="Photo saved ✓"})};
  $("newSkip").onclick=function(){$("more").classList.remove("on")};
  $("newMsg").textContent="Writing the care card…";api("/staff/info",{method:"POST",body:JSON.stringify({name:name,section:s.name})}).then(function(j){$("newMsg").className="msg ok";$("newMsg").textContent="Care card drafted"+(j.info.unsure?" (it wasn\\'t sure; check it)":"")+". Tap ⋯ on the item to read or fix it.";load()}).catch(function(e){$("newMsg").className="msg bad";$("newMsg").textContent="No care card: "+e.message})}
// ---- scan (barcode → count) ----
var scanOn=null,scanCb=null,scanQty=1;
function scanner(video,onCode,msg){var det=null;try{det=("BarcodeDetector" in window)?new BarcodeDetector():null}catch(e){det=null}
  var stream=null,t=null,stopped=false;
  function stop(){stopped=true;clearTimeout(t);if(stream){stream.getTracks().forEach(function(x){x.stop()});stream=null}video.srcObject=null;video.style.display="none"}
  function loop(){if(stopped)return;if(video.readyState>=2){det.detect(video).then(function(codes){if(stopped)return;var c=codes&&codes.length&&codes[0].rawValue;if(c){stop();onCode(c)}else t=setTimeout(loop,250)}).catch(function(){t=setTimeout(loop,400)})}else t=setTimeout(loop,250)}
  if(det&&navigator.mediaDevices&&navigator.mediaDevices.getUserMedia){navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}}).then(function(st){if(stopped){st.getTracks().forEach(function(x){x.stop()});return}stream=st;video.srcObject=st;video.style.display="block";video.play().catch(function(){});msg("Hold the barcode in front of the camera.");loop()}).catch(function(){msg("No camera: use a handheld scanner or type the code.")})}
  else msg(det?"No camera here: use a handheld scanner or type the code.":"This tablet's browser can't read barcodes with its camera: use a handheld scanner (it types the code) or type it.");
  return {stop:stop}}
function openScan(title,cb){scanCb=cb||null;$("scanTitle").textContent=title||"Scan a barcode";$("scanHit").hidden=true;$("scanHit").innerHTML="";$("scanIn").value="";$("scanMsg").className="msg";$("scanMsg").textContent="";$("scan").classList.add("on");
  if(scanOn)scanOn.stop();scanOn=scanner($("scanVid"),gotCode,function(t){$("scanMsg").textContent=t});setTimeout(function(){$("scanIn").focus()},80);touch()}
function closeScan(){if(scanOn){scanOn.stop();scanOn=null}$("scan").classList.remove("on")}
$("scanbtn").onclick=function(){openScan("Scan a barcode",null)};
$("scanCancel").onclick=closeScan;
$("scanGo").onclick=function(){var v=$("scanIn").value.trim();if(v)gotCode(v)};
$("scanIn").addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();var v=this.value.trim();if(v)gotCode(v)}});
function gotCode(code){if(scanOn){scanOn.stop();scanOn=null}touch();$("scanIn").value="";
  if(scanCb){var cb=scanCb;scanCb=null;closeScan();cb(code);return}
  $("scanMsg").textContent="Looking up "+code+"…";
  api("/staff/find?code="+encodeURIComponent(code)+"&section="+encodeURIComponent(cur||"")).then(showHit).catch(function(e){$("scanMsg").className="msg bad";$("scanMsg").textContent=e.message})}
function qtyRow(){return '<div class="row"><span>How many?</span><div class="qty"><button class="btn small" id="sqM" type="button">−</button><b id="sqN">1</b><button class="btn small" id="sqP" type="button">+</button></div><input id="sqIn" inputmode="numeric" placeholder="Other" style="max-width:6em"></div>'}
function bindQty(){scanQty=1;var show=function(){$("sqN").textContent=scanQty};$("sqM").onclick=function(){scanQty=Math.max(1,scanQty-1);show()};$("sqP").onclick=function(){scanQty=Math.min(9999,scanQty+1);show()};$("sqIn").addEventListener("input",function(){var n=parseInt(this.value,10);if(n>0){scanQty=Math.min(9999,n);show()}})}
function showHit(j){var h=$("scanHit");h.hidden=false;$("scanMsg").className="msg";$("scanMsg").textContent="Code "+j.code;
  var pic=function(img){return img?'<img class="ph" src="'+esc(img)+'" alt="">':'<div class="ph ph--none">'+EMOJI+'</div>'};
  if(j.item){h.innerHTML='<div class="it"><div>'+pic(j.item.image)+'</div><div><div class="nm">'+esc(j.item.name)+'</div><div class="nt">In '+esc(j.item.section)+(j.item.qty==null?"":" · "+j.item.qty+" in stock")+(j.item.price?" · "+esc(j.item.price):"")+'</div></div><div></div></div>'+qtyRow()+'<div class="row"><button class="btn go" id="sAdd" type="button">➕ Put in</button><button class="btn" id="sOut" type="button">➖ Take out</button></div>';bindQty();
    $("sAdd").onclick=function(){api("/staff/add",{method:"POST",body:JSON.stringify({section:j.item.section,name:j.item.name,qty:scanQty})}).then(afterScan).catch(function(e){alert(e.message)})};
    $("sOut").onclick=function(){api("/staff/adjust",{method:"POST",body:JSON.stringify({section:j.item.section,item:j.item.name,delta:-scanQty})}).then(afterScan).catch(function(e){alert(e.message)})};
    return}
  if(j.catalog){h.innerHTML='<div class="it"><div>'+pic(j.catalog.image)+'</div><div><div class="nm">'+esc(j.catalog.name)+'</div><div class="nt">Known, none in right now'+(j.catalog.price?" · "+esc(j.catalog.price):"")+'</div></div><div></div></div><p>Put it in <b>'+esc(cur||"")+'</b>:</p>'+qtyRow()+'<div class="row"><button class="btn go" id="sAdd" type="button">➕ Put in</button></div>';bindQty();
    $("sAdd").onclick=function(){if(!cur){var n=prompt("Name the "+SEC+" it goes in");if(!n||!n.trim())return;cur=n.trim()}api("/staff/add",{method:"POST",body:JSON.stringify({section:cur,name:j.catalog.name,qty:scanQty,barcode:j.code})}).then(afterScan).catch(function(e){alert(e.message)})};
    return}
  h.innerHTML='<p>New product'+(j.suggestion?" (found online; fix the name if it\'s wrong)":"")+'. Goes in <b>'+esc(cur||"")+'</b>.</p><div class="row"><input id="sName" placeholder="Name" value="'+esc(j.suggestion||"")+'"></div><div class="row"><input id="sPrice" placeholder="Price (optional)" style="max-width:10em"></div>'+qtyRow()+'<div class="row"><button class="btn go" id="sAdd" type="button">➕ Add it</button></div>';bindQty();
  if(!j.suggestion)setTimeout(function(){$("sName").focus()},50);
  $("sAdd").onclick=function(){var n=$("sName").value.trim();if(!n){$("sName").focus();return}if(!cur){var t=prompt("Name the "+SEC+" it goes in");if(!t||!t.trim())return;cur=t.trim()}var body={section:cur,name:n,qty:scanQty,barcode:j.code};var pr=$("sPrice").value.trim();if(pr)body.price=pr;
    api("/staff/add",{method:"POST",body:JSON.stringify(body)}).then(function(r){data=r;closeScan();render();touch();if(r.isNew)afterNew(r.added)}).catch(function(e){alert(e.message)})}}
function afterScan(j){data=j;render();touch();var h=$("scanHit");h.innerHTML='<p class="msg ok">Saved ✓</p><div class="row"><button class="btn go" id="sAgain" type="button">▦ Scan the next one</button><button class="btn ghost" id="sDone" type="button">Done</button></div>';$("sAgain").onclick=function(){openScan("Scan a barcode",null)};$("sDone").onclick=closeScan}
// ---- more (per item) ----
function moreSheet(k){var s=pick(),it=s.items[k];if(!it)return;var r=rows(it.info);var b=$("moreBody");
  b.innerHTML='<h2>'+esc(it.name)+'</h2><div class="row"><span>Count:</span><input id="mQty" inputmode="numeric" value="'+(it.qty==null?"":it.qty)+'" style="max-width:6em"><button class="btn small" id="mQtyGo" type="button">Set</button><button class="btn small ghost" id="mSold" type="button">'+(it.soldOut?"Back in stock":"Sold out")+'</button></div>'+
    '<div class="row"><span>Price:</span><input id="mPrice" value="'+esc(it.price||"")+'" style="max-width:8em"><button class="btn small" id="mPriceGo" type="button">Set</button></div>'+
    '<div class="row"><button class="btn small" id="mPhoto" type="button">📷 '+(it.image?"New photo":"Add a photo")+'</button><button class="btn small" id="mAi" type="button">✨ '+(it.info?"Redo the care card":"Write a care card")+'</button></div>'+
    '<div class="row"><span>Barcode:</span><span class="nt">'+(it.barcode?esc(it.barcode):"none")+'</span><button class="btn small" id="mScan" type="button">▦ '+(it.barcode?"Change":"Scan it")+'</button>'+(it.barcode?'<button class="btn small ghost" id="mScanClr" type="button">Clear</button>':'')+'</div>'+
    (r.length||it.info&&it.info.notes?'<div class="rows">'+r.map(function(x){return '<b>'+esc(x[0])+'</b><span>'+esc(x[1])+'</span>'}).join("")+'</div>'+(it.info.notes?'<p>'+esc(it.info.notes)+'</p>':'')+(it.info.aiDrafted?'<p class="nt"><span class="chip ai">AI draft</span> Read it once; fix anything below.</p>':''):'<p class="nt">No info card yet.</p>')+
    '<details><summary>Edit the info card</summary><div class="rows" style="grid-template-columns:1fr">'+FIELDS.concat([["notes","Notes",""]]).map(function(f){return '<input data-f="'+f[0]+'" placeholder="'+esc(f[1])+(f[2]?" (e.g. "+esc(f[2])+")":"")+'" value="'+esc(it.info&&it.info[f[0]]||"")+'">'}).join("")+'</div><div class="row"><button class="btn small go" id="mInfoSave" type="button">Save card</button></div></details>'+
    '<p class="msg" id="mMsg"></p><div class="row"><button class="btn ghost" id="mClose" type="button">Close</button></div>';
  $("more").classList.add("on");
  var done=function(j){data=j;render();$("more").classList.remove("on");touch()};
  $("mClose").onclick=function(){$("more").classList.remove("on")};
  $("mQtyGo").onclick=function(){var v=$("mQty").value.trim();api("/staff/set",{method:"POST",body:JSON.stringify({section:s.name,item:it.name,qty:v===""?null:parseInt(v,10)})}).then(done).catch(function(e){alert(e.message)})};
  $("mSold").onclick=function(){api("/staff/set",{method:"POST",body:JSON.stringify({section:s.name,item:it.name,soldOut:!it.soldOut})}).then(done).catch(function(e){alert(e.message)})};
  $("mScan").onclick=function(){$("more").classList.remove("on");openScan("Scan "+it.name+"\'s barcode",function(code){api("/staff/set",{method:"POST",body:JSON.stringify({section:s.name,item:it.name,barcode:code})}).then(function(j){data=j;render();touch();moreSheet(k)}).catch(function(e){alert(e.message)})})};
  if($("mScanClr"))$("mScanClr").onclick=function(){api("/staff/set",{method:"POST",body:JSON.stringify({section:s.name,item:it.name,barcode:""})}).then(done).catch(function(e){alert(e.message)})};
  $("mPriceGo").onclick=function(){api("/staff/set",{method:"POST",body:JSON.stringify({section:s.name,item:it.name,price:$("mPrice").value})}).then(done).catch(function(e){alert(e.message)})};
  $("mPhoto").onclick=function(){takePhoto(s.name,it.name,function(){load();$("mMsg").className="msg ok";$("mMsg").textContent="Photo saved ✓"})};
  $("mAi").onclick=function(){$("mMsg").className="msg";$("mMsg").textContent="Writing…";api("/staff/info",{method:"POST",body:JSON.stringify({name:it.name,section:s.name,note:it.note})}).then(function(){load().then(function(){moreSheet(k)})}).catch(function(e){$("mMsg").className="msg bad";$("mMsg").textContent=e.message})};
  $("mInfoSave").onclick=function(){var info={},facts=[];b.querySelectorAll("[data-f]").forEach(function(inp){var v=inp.value.trim();if(!v)return;var k=inp.dataset.f;if(k==="notes"||KIND==="fish")info[k]=v;else{var lab="";FIELDS.forEach(function(f){if(f[0]===k)lab=f[1]});facts.push({label:lab||k,value:v})}});if(facts.length)info.facts=facts;api("/staff/info",{method:"PUT",body:JSON.stringify({name:it.name,info:info})}).then(done).catch(function(e){alert(e.message)})}}
function takePhoto(section,name,cb){var cam=$("cam");cam.value="";cam.onchange=function(){var f=cam.files&&cam.files[0];if(!f)return;var img=new Image();var url=URL.createObjectURL(f);img.onload=function(){var max=1600,w=img.width,h=img.height,k=Math.min(1,max/Math.max(w,h));var c=document.createElement("canvas");c.width=Math.round(w*k);c.height=Math.round(h*k);c.getContext("2d").drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);
    c.toBlob(function(blob){fetch(BASE+"/staff/photo?section="+encodeURIComponent(section)+"&item="+encodeURIComponent(name)+"&w="+c.width+"&h="+c.height,{method:"POST",headers:{"content-type":"image/jpeg","x-staff":staffTok||""},body:blob}).then(function(r){if(!r.ok)throw new Error("Photo failed ("+r.status+")");return r.json()}).then(function(){cb&&cb()}).catch(function(e){alert(e.message)})},"image/jpeg",0.85)};img.src=url};cam.click()}
})();
</script>${homescreenPrompt({ appName: tank ? `${record.name} ${tank.name}` : `${record.name} display`, key: `/d/${leadId}`, dark: true })}
</body></html>`;
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
      "content-security-policy":
        "default-src 'self'; img-src 'self' https: data: blob:; media-src 'self' blob: mediastream:; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'",
    },
  });
}
