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
    fetchedAt: new Date().toISOString().slice(0, 10),
  };
}

/** Fetches and extracts; null when the site is down, not HTML, or looks like a social page. Never throws. */
export async function importSite(url: string, fetchFn: typeof fetch = fetch): Promise<ExistingSite | null> {
  try {
    const u = new URL(url);
    if (/(^|\.)(facebook|instagram|linktr|tiktok|yelp|google|nextdoor)\./i.test(u.hostname)) return null;
    const res = await fetchFn(u.toString(), {
      headers: { "user-agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Mobile Safari/537.36", accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok || !/text\/html|xhtml/i.test(res.headers.get("content-type") ?? "")) return null;
    const html = (await res.text()).slice(0, MAX_BYTES);
    const facts = extractSiteFacts(res.url || u.toString(), html);
    return facts.paragraphs.length || facts.headings.length ? facts : null;
  } catch {
    return null;
  }
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
