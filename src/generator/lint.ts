import type { BuildMode, BusinessRecord, Copy } from "./types.ts";

export interface LintResult {
  /** Always wrong, in any mode. */
  errors: string[];
  /** Fine in a preview, but publishing is blocked until fixed. */
  publishBlockers: string[];
  warnings: string[];
}

const PLACEHOLDERS = [/lorem ipsum/i, /\[(city|phone|business|name|town)[^\]]*\]/i, /your business/i, /john doe/i, /example\.com/i, /\bTODO\b/, /slide title/i];
export const BANNED_PHRASES = [
  "nestled",
  "culinary journey",
  "mouthwatering",
  "mouth-watering",
  "elevate",
  "look no further",
  "unmatched",
  "premier",
  "world-class",
  "top-rated",
  "most trusted",
  "second to none",
  "best in town",
  "#1",
];
const SUPERLATIVE = /\b(the best|best in|finest|number one)\b/i;

function visibleText(htmlDoc: string): string {
  return htmlDoc
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ");
}

function unescapeHtml(s: string | undefined): string | undefined {
  return s?.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

function words(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter(Boolean);
}

/** True if any 7-word run of a review appears on the page. */
export function quotesReview(pageText: string, review: string): boolean {
  const page = ` ${words(pageText).join(" ")} `;
  const w = words(review);
  for (let i = 0; i + 7 <= w.length; i++) {
    if (page.includes(` ${w.slice(i, i + 7).join(" ")} `)) return true;
  }
  return false;
}

export interface LintInput {
  record: BusinessRecord;
  copy: Copy;
  mode: BuildMode;
  pages: Array<{ path: string; html: string }>;
  todos: string[];
  /** Google review texts held as AI context; must never appear on the site. */
  reviewTexts?: string[];
  assetBytes: number;
}

export function lintSite(input: LintInput): LintResult {
  const { record: r, copy, pages } = input;
  const errors: string[] = [];
  const blockers: string[] = [];
  const warnings: string[] = [];

  for (const { path, html } of pages) {
    const text = visibleText(html);
    const h1s = (html.match(/<h1[\s>]/g) ?? []).length;
    if (h1s !== 1) errors.push(`${path}: has ${h1s} <h1> headings (needs exactly 1)`);
    const title = unescapeHtml(/<title>([^<]*)<\/title>/.exec(html)?.[1]);
    if (!title) errors.push(`${path}: missing <title>`);
    else if (title.length > 60) warnings.push(`${path}: title is ${title.length} characters (aim for 60 or fewer)`);
    const desc = unescapeHtml(/<meta name="description" content="([^"]*)"/.exec(html)?.[1]);
    if (!desc) errors.push(`${path}: missing meta description`);
    else if (desc.length < 110 || desc.length > 165) warnings.push(`${path}: meta description is ${desc.length} characters (aim for 140-155)`);

    for (const m of html.matchAll(/href="([^"]*)"/g)) {
      const href = m[1]!;
      if (href === "#" || href === "") errors.push(`${path}: empty or "#" link`);
      if (href.startsWith("tel:") && href !== `tel:${r.phone.e164}`) errors.push(`${path}: phone link ${href} doesn't match ${r.phone.e164}`);
    }
    for (const m of html.matchAll(/<img\b[^>]*>/g)) {
      if (!/\balt="/.test(m[0])) errors.push(`${path}: image without alt text`);
    }
    for (const re of PLACEHOLDERS) if (re.test(text)) errors.push(`${path}: placeholder text matches ${re}`);
    const lower = text.toLowerCase();
    for (const p of BANNED_PHRASES) if (lower.includes(p)) errors.push(`${path}: banned phrase "${p}"`);
    if (SUPERLATIVE.test(text)) warnings.push(`${path}: superlative wording ("${SUPERLATIVE.exec(text)![0]}") needs a sourced award`);
    for (const review of input.reviewTexts ?? []) {
      if (quotesReview(text, review)) errors.push(`${path}: contains text from a Google review`);
    }
    if (html.length > 120_000) warnings.push(`${path}: HTML is ${Math.round(html.length / 1024)} KB (budget ~100 KB)`);
  }

  if (r.businessStatus !== "OPERATIONAL") errors.push(`Business status is ${r.businessStatus}, not OPERATIONAL`);
  if (input.assetBytes > 100_000) warnings.push(`CSS + JS are ${Math.round(input.assetBytes / 1024)} KB`);

  // Publish gate
  for (const t of input.todos) blockers.push(`Owner to-do: ${t}`);
  for (const f of ["name", "phone", "address"] as const) if (!r.confirmed.includes(f)) blockers.push(`Owner hasn't confirmed ${f}`);
  if (r.hours && !r.confirmed.includes("hours")) blockers.push("Owner hasn't confirmed hours");
  if (!copy.approved) blockers.push("Owner hasn't approved the site text");
  const images = [r.media.hero, r.media.logo, ...r.media.gallery].filter(Boolean);
  if (images.some((i) => i!.source === "google")) blockers.push("Google photos must be replaced with owner, stock or AI photos before publishing");

  return { errors: [...new Set(errors)], publishBlockers: [...new Set(blockers)], warnings: [...new Set(warnings)] };
}
