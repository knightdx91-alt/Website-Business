/**
 * Full-site Spanish: every page of the English site is copied under /es/ with its visible text swapped for the Spanish in
 * `copy.es.strings` (English text → Spanish, collected from the built pages and translated by src/copy/spanish.ts). Because it
 * works on the finished HTML, every section of every pack (menus, reviews, FAQ, hours, footer…) is covered, including sections
 * added later: a line with no translation yet stays English until the next build translates it (worker/spanish-sync.ts).
 */

const TOKEN = /(<!--[\s\S]*?-->|<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<[^>]+>)/i;
const ATTRS = /(?<=\s)(alt|title|aria-label|placeholder|data-cap)="([^"]*)"/g;
const META_CONTENT = /^<meta\s+(?:name="description"|property="og:(?:title|description)")\s+content="([^"]*)"/;

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " " };
export function decodeHtml(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (ENTITIES[e]) return ENTITIES[e]!;
    if (e[0] === "#") {
      const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return m;
  });
}
const encodeText = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const encodeAttr = (s: string) => encodeText(s).replace(/"/g, "&quot;");

/** The key a piece of text is stored under: decoded, spaces collapsed, trimmed. */
export function textKey(s: string): string {
  return decodeHtml(s).replace(/\s+/g, " ").trim();
}

/** Worth translating: has letters, isn't a link, email, phone number, time or price on its own. */
export function translatable(key: string): boolean {
  if (key.length < 2 || !/[A-Za-z]/.test(key)) return false;
  if (/^(https?:\/\/|www\.)\S+$/i.test(key) || /^\S+@\S+\.\S+$/.test(key)) return false;
  if (/^[\d\s()+.\-–—:$,%/×x#*·|]+$/i.test(key)) return false;
  if (/^\d{1,2}(:\d{2})?\s?(AM|PM)(\s?[–-]\s?\d{1,2}(:\d{2})?\s?(AM|PM))?$/i.test(key)) return false;
  return true;
}

/** Every translatable piece of visible text in a page: text between tags, alt / title / aria-label / placeholder / photo captions, the meta description. Owner to-do notes are left out (they're for the team). */
export function textsOf(html: string): string[] {
  const out: string[] = [];
  const body = html.replace(/<div class="todo" data-todo>[\s\S]*?<\/div>/g, "");
  for (const part of body.split(TOKEN)) {
    if (!part) continue;
    if (part[0] === "<") {
      if (part.startsWith("<!--") || /^<(script|style)\b/i.test(part)) continue;
      const meta = META_CONTENT.exec(part);
      if (meta) out.push(textKey(meta[1]!));
      for (const m of part.matchAll(ATTRS)) out.push(textKey(m[2]!));
    } else out.push(textKey(part));
  }
  return out.filter(translatable);
}

/** Every distinct translatable text across pages, minus the ones to keep as written (the business name). */
export function siteTexts(pages: string[], keep: string[] = []): string[] {
  const skip = new Set(keep.map(textKey));
  return [...new Set(pages.flatMap(textsOf))].filter((t) => !skip.has(t));
}

/** The page with every text that has a translation swapped (spacing around it kept). */
export function applyTranslations(html: string, map: Record<string, string>): string {
  const tr = (raw: string, enc: (s: string) => string) => {
    const k = textKey(raw);
    const es = map[k];
    if (!es) return raw;
    const lead = /^\s*/.exec(raw)![0];
    const tail = /\s*$/.exec(raw)![0];
    return lead + enc(es) + tail;
  };
  return html
    .split(TOKEN)
    .map((part) => {
      if (!part) return part;
      if (part[0] !== "<") return tr(part, encodeText);
      if (part.startsWith("<!--") || /^<(script|style)\b/i.test(part)) return part;
      let tag = part.replace(ATTRS, (_m, a: string, v: string) => `${a}="${tr(v, encodeAttr)}"`);
      const meta = META_CONTENT.exec(tag);
      if (meta) tag = tag.replace(`content="${meta[1]}"`, `content="${tr(meta[1]!, encodeAttr)}"`);
      return tag;
    })
    .join("");
}

/**
 * The /es/ copy of an English page: text translated, lang="es", links between site pages kept inside /es/, the "Español"
 * menu link turned into "English" (back to the same English page), canonical and og:url pointing at the Spanish address.
 */
export function spanishDoc(html: string, o: { path: string; pagePaths: string[]; origin: string; map: Record<string, string> }): string {
  const esPath = (p: string) => `/es${p}`;
  const pages = new Set(o.pagePaths);
  let out = applyTranslations(html, o.map);
  out = out.replace(/<html lang="en"/, '<html lang="es"');
  // The language switch: on a Spanish page it goes back to the English one.
  out = out.replace(/<a([^>]*?)href="\/es\/"([^>]*)>([\s\S]*?)<\/a>/g, (_m, a: string, b: string) => `<a${a}href="\u0000EN${o.path}"${b} lang="en">English</a>`);
  out = out.replace(/\bhref="(\/[^"]*)"/g, (m, href: string) => {
    if (href.startsWith("/es/") || href.startsWith("/assets/")) return m;
    const p = href.replace(/[?#].*$/, "") || "/";
    return pages.has(p) ? `href="${esPath(p)}${href.slice(p.length)}"` : m;
  });
  out = out.replace(/href="\u0000EN/g, 'href="');
  const origin = o.origin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  out = out.replace(new RegExp(`(rel="canonical" href="|property="og:url" content=")${origin}(/[^"]*)"`, "g"), (_m, a: string, p: string) => `${a}${o.origin}${esPath(p)}"`);
  return out;
}
