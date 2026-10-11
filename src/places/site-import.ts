import type { ExistingSite } from "../generator/types.ts";

/**
 * Their current website as facts. When a lead has a site (the one Google links, or the page our web check found), the build
 * reads it once and hands the copy writer what the business already says about itself: what they carry, who runs it, how
 * long they've been around, special-order notes, a "we're moving" notice. The writer rewrites; it never copies a sentence
 * (`check()` in write.ts flags any that slips through). Nothing here is shown on the site unrewritten; the owner sees what
 * was found in Edit → "Their current website".
 */

const MAX_BYTES = 400_000;
const BLOCK = /<\/(?:p|div|li|h[1-6]|section|article|header|footer|td|th|blockquote|figcaption|dd|dt|br|tr)\s*>|<br\s*\/?>/gi;
const NOISE = /\b(cookie|cookies|this website uses|privacy policy|terms of (use|service)|all rights reserved|powered by|website builder|sign up for our newsletter|subscribe|copyright|©)\b/i;
const NOTICE = /\b(clos(ed|ing)|mov(ed|ing)|relocat\w*|re-?open\w*|new location|temporar\w*|under construction|coming soon|grand opening|retir\w*)\b/i;
/** Images that are not the business's own photos: logos, icons, tracking pixels, and the stock libraries site builders bundle. */
const NOT_A_PHOTO = /logo|icon|favicon|badge|pixel|tracking|spacer|placeholder|avatar|sprite|\.svg|\.gif|\.ico|data:|1x1|blank\./i;
const STOCK = /\/isteam\/stock\/|unsplash|pexels|pixabay|shutterstock|istockphoto|gettyimages|stock\.adobe|depositphotos|dreamstime|stocksy|\/stock\//i;

/** Absolute, de-sized image URLs: GoDaddy's `/:/rs=w:600…` resize suffix is dropped so the original comes down. */
function imageUrl(src: string, base: string): string | null {
  try {
    const u = new URL(src.trim(), base);
    if (!/^https?:$/.test(u.protocol)) return null;
    let s = u.toString();
    const cut = s.indexOf("/:/");
    if (/wsimg\.com/.test(u.hostname) && cut > 0) s = s.slice(0, cut);
    return s;
  } catch {
    return null;
  }
}

/** Their photos from <img> tags (src, data-src, the largest srcset entry), in page order, deduped, at most 12. */
export function extractImages(html: string, base: string): Array<{ src: string; alt?: string }> {
  const out: Array<{ src: string; alt?: string }> = [];
  const seen = new Set<string>();
  for (const m of html.matchAll(/<img\b([^>]*)>/gi)) {
    const attrs = m[1]!;
    const attr = (n: string) => new RegExp(`\\b${n}=["']([^"']*)["']`, "i").exec(attrs)?.[1];
    let src = attr("data-src") || attr("data-lazy-src") || attr("src") || "";
    const srcset = attr("srcset") || attr("data-srcset");
    if (srcset) {
      const best = srcset.split(",").map((x) => x.trim().split(/\s+/)).filter((p) => p[0]).sort((a, b) => (parseInt(b[1] ?? "0", 10) || 0) - (parseInt(a[1] ?? "0", 10) || 0))[0];
      if (best?.[0]) src = best[0];
    }
    const alt = decode(attr("alt") ?? "").trim() || undefined;
    const w = parseInt(attr("width") ?? "", 10);
    if (!src || NOT_A_PHOTO.test(src) || NOT_A_PHOTO.test(alt ?? "") || STOCK.test(src) || (w && w < 200)) continue;
    const abs = imageUrl(src, base);
    if (!abs) continue;
    const key = abs.replace(/\?.*$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ src: abs, alt });
    if (out.length >= 12) break;
  }
  return out;
}

function decode(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

const strip = (html: string) => decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

/** Pulls the useful facts out of a page. Pure, so it's testable without a network. */
export function extractSiteFacts(url: string, html: string): ExistingSite {
  const body = html.replace(/<(script|style|noscript|svg|template|iframe)[\s\S]*?<\/\1>/gi, " ").replace(/<!--[\s\S]*?-->/g, " ");
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(body)?.[1];
  const metaDesc = /<meta[^>]+name=["']description["'][^>]+content=(?:"([^"]*)"|'([^']*)')/i.exec(body) ?? /<meta[^>]+content=(?:"([^"]*)"|'([^']*)')[^>]+name=["']description["']/i.exec(body);
  const description = metaDesc?.[1] ?? metaDesc?.[2];
  const headings = [...body.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)].map((m) => strip(m[1]!)).filter((h) => h.length >= 3 && h.length <= 140 && !NOISE.test(h));
  const seen = new Set<string>();
  const paragraphs: string[] = [];
  for (const chunk of body.split(BLOCK)) {
    const t = strip(chunk);
    if (t.length < 40 || t.length > 1200 || NOISE.test(t)) continue;
    const key = t.toLowerCase().slice(0, 120);
    if (seen.has(key)) continue;
    seen.add(key);
    paragraphs.push(t);
    if (paragraphs.length >= 25) break;
  }
  const text = strip(body);
  const phones = [...new Set([...text.matchAll(/\(?\b(\d{3})\)?[-. ]\s?(\d{3})[-. ](\d{4})\b/g)].map((m) => `${m[1]}-${m[2]}-${m[3]}`))].slice(0, 4);
  const emails = [...new Set([...text.matchAll(/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi)].map((m) => m[0].toLowerCase()))].filter((e) => !/sentry|wixpress|example\.com|godaddy|squarespace/.test(e)).slice(0, 3);
  const social: ExistingSite["social"] = {};
  for (const m of body.matchAll(/href=["'](https?:\/\/(?:www\.|m\.)?(facebook|instagram|tiktok|youtube)\.com\/[^"'#?\s]+)/gi)) {
    const k = m[2]!.toLowerCase() as keyof ExistingSite["social"];
    const href = m[1]!;
    if (/\/(sharer|share|intent|plugins|tr\?|dialog)\b/i.test(href)) continue;
    if (!social[k]) social[k] = href;
  }
  const year = /\b(?:since|est\.?|established|founded|serving .{0,40} since|family[- ]owned since)\s*(?:in\s*)?((?:18|19|20)\d{2})\b/i.exec(text)?.[1];
  const notices = [...new Set(paragraphs.filter((p) => NOTICE.test(p)).map((p) => p.slice(0, 300)))].slice(0, 3);
  return {
    url,
    title: title ? strip(title).slice(0, 140) : undefined,
    description: description ? decode(description).trim().slice(0, 300) : undefined,
    headings: [...new Set(headings)].slice(0, 12),
    paragraphs: paragraphs.slice(0, 15).map((p) => p.slice(0, 500)),
    phones,
    emails,
    social,
    foundedYear: year ? Number(year) : undefined,
    notices,
    images: extractImages(body, url),
    fetchedAt: new Date().toISOString().slice(0, 10),
  };
}

export interface SitePhoto {
  bytes: ArrayBuffer;
  type: "image/jpeg" | "image/png" | "image/webp";
  ext: "jpg" | "png" | "webp";
  alt?: string;
  src: string;
}

/** Downloads up to `max` of their photos: real image types only, 25 KB to 8 MB, one at a time so a slow host can't hang the build. */
export async function fetchSitePhotos(images: ExistingSite["images"], max = 6, fetchFn: typeof fetch = fetch): Promise<SitePhoto[]> {
  const out: SitePhoto[] = [];
  for (const img of images) {
    if (out.length >= max) break;
    try {
      const res = await fetchFn(img.src, { headers: { "user-agent": "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/128 Mobile Safari/537.36", accept: "image/*" }, signal: AbortSignal.timeout(8000) });
      const type = (res.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
      const ext = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const)[type as "image/jpeg"];
      if (!res.ok || !ext) continue;
      const bytes = await res.arrayBuffer();
      if (bytes.byteLength < 25_000 || bytes.byteLength > 8_000_000) continue;
      out.push({ bytes, type: type as SitePhoto["type"], ext, alt: img.alt, src: img.src });
    } catch {
      /* skip this one */
    }
  }
  return out;
}

export interface SiteImportResult {
  facts: ExistingSite | null;
  /** Why nothing came back, in plain words ("timed out after 15 s", "HTTP 403", "not an HTML page"). */
  error?: string;
}

const UA = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Mobile Safari/537.36";

async function fetchPage(url: string, fetchFn: typeof fetch, ms: number): Promise<{ html?: string; finalUrl?: string; error?: string }> {
  try {
    const res = await fetchFn(url, {
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5", "accept-language": "en-US,en;q=0.8" },
      redirect: "follow",
      signal: AbortSignal.timeout(ms),
    });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const type = res.headers.get("content-type") ?? "";
    if (!/text\/html|xhtml/i.test(type)) return { error: `not an HTML page (${type.split(";")[0] || "no content type"})` };
    return { html: (await res.text()).slice(0, MAX_BYTES), finalUrl: res.url || url };
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    return { error: name === "TimeoutError" || name === "AbortError" ? `timed out after ${Math.round(ms / 1000)} s` : `couldn't connect (${err instanceof Error ? err.message : String(err)})`.slice(0, 160) };
  }
}

/**
 * Fetches and extracts, with the reason when it can't. Tries https first (Google often stores the http address), then the
 * address as given, each with a generous limit: small-business hosts are slow. Never throws.
 */
export async function importSiteDetailed(url: string, fetchFn: typeof fetch = fetch): Promise<SiteImportResult> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { facts: null, error: "not a web address" };
  }
  if (/(^|\.)(facebook|instagram|linktr|tiktok|yelp|google|nextdoor)\./i.test(u.hostname)) return { facts: null, error: "a social page, not their own site" };
  const tries = u.protocol === "http:" ? [u.toString().replace(/^http:/, "https:"), u.toString()] : [u.toString()];
  let lastError = "unknown";
  for (const t of tries) {
    const r = await fetchPage(t, fetchFn, 15_000);
    if (r.html) {
      const facts = extractSiteFacts(r.finalUrl ?? t, r.html);
      return facts.paragraphs.length || facts.headings.length || facts.images.length ? { facts } : { facts: null, error: "the page had no readable text (probably built by scripts)" };
    }
    lastError = r.error ?? lastError;
  }
  return { facts: null, error: lastError };
}

/** Facts or null; see importSiteDetailed for the reason. */
export async function importSite(url: string, fetchFn: typeof fetch = fetch): Promise<ExistingSite | null> {
  return (await importSiteDetailed(url, fetchFn)).facts;
}

/** Fills record gaps the site answers plainly (email, social links, founded year). Never overwrites what's there. */
export function applySiteFacts(r: { email?: string; foundedYear?: number; links: { social: Record<string, string | undefined> } }, s: ExistingSite): string[] {
  const used: string[] = [];
  if (!r.email && s.emails[0]) { r.email = s.emails[0]; used.push("email"); }
  if (!r.foundedYear && s.foundedYear && s.foundedYear <= new Date().getFullYear()) { r.foundedYear = s.foundedYear; used.push("founded year"); }
  for (const k of ["facebook", "instagram", "tiktok", "youtube"] as const) {
    if (!r.links.social[k] && s.social[k]) { r.links.social[k] = s.social[k]; used.push(k); }
  }
  return used;
}
