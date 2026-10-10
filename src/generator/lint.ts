import { hoursSummary } from "./hours.ts";
import { normalizeUsPhone } from "./phone.ts";
import type { BuildMode, BusinessRecord, Copy } from "./types.ts";

export interface LintResult {
  /** Always wrong, in any mode. */
  errors: string[];
  /** Fine in a preview, but publishing is blocked until fixed. */
  publishBlockers: string[];
  warnings: string[];
}

const PLACEHOLDERS = [/lorem ipsum/i, /\[(city|phone|business|name|town)[^\]]*\]/i, /\byour business (name|here)\b/i, /john doe/i, /example\.com/i, /\bTODO\b/, /slide title/i];
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
/** Whole-word matcher for a banned phrase, so "Premiere Cleaning" or "elevated deck" don't trip "premier"/"elevate". */
function phraseRe(p: string): RegExp {
  const esc = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/-/g, "[- ]?");
  return new RegExp(`(?<![a-z0-9#])${esc}(?![a-z0-9])`, "i");
}
const BANNED_RES = BANNED_PHRASES.map((p) => [p, phraseRe(p)] as const);

/** The first banned phrase found in a piece of text, matched as whole words, or null. */
export function bannedPhraseIn(text: string): string | null {
  for (const [p, re] of BANNED_RES) if (re.test(text)) return p;
  return null;
}

/** Numbers in AI copy that don't appear in the facts are likely invented. Compared as whole numbers, so "25" isn't excused by "(256)". */
export function unsupportedNumbers(text: string, factsText: string): string[] {
  const norm = (n: string) => n.replace(/[,.]/g, "");
  const known = new Set((factsText.match(/\d[\d,.]*/g) ?? []).map(norm));
  const nums = text.match(/\b\d[\d,.]*\b/g) ?? [];
  return [...new Set(nums.filter((n) => !known.has(norm(n))))];
}

/** Every line the AI wrote (plus the owner-editable text it may have shaped): the only text the phrase checks look at. */
export function aiTextOf(copy: Copy): string {
  return [copy.heroTagline, copy.heroSub, ...copy.about, ...Object.values(copy.serviceBlurbs), ...(copy.steps ?? []).flatMap((s) => [s.title, s.body]), ...copy.faq.flatMap((f) => [f.q, f.a]), copy.serviceAreaIntro ?? "", copy.ctaTitle, copy.ctaLine, copy.meta.description, copy.cuisineLabel ?? "", copy.heroQuestion ?? "", copy.heroBenefit ?? ""].join(" \n ");
}

/** The numbers a site may legitimately mention: phone, address, years, prices, licenses, hours. */
export function factsTextOf(r: BusinessRecord): string {
  const parts: unknown[] = [r.phone.display, r.phone.e164, r.address, r.foundedYear, r.licenses, r.serviceArea?.radiusMiles, r.ext, r.hours ? hoursSummary(r.hours) : "", r.offers];
  for (const s of r.services) if (s.price) parts.push(s.price.amount, s.price.min, s.price.max, s.price.note);
  return JSON.stringify(parts);
}

/** Business superlatives. "the best time to mow" is advice, not a claim, so common advice phrases are allowed. */
export const SUPERLATIVE = /\b(?:the best(?! (?:time|way|part|thing|fit|results|choice for you|option for you))|best in (?:town|the|cullman|alabama|county)|finest|number one)\b/i;

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
  /** Category phrases the AI text may never use (e.g. refund or rate claims for tax and insurance offices). */
  banned?: RegExp[];
}

export function lintSite(input: LintInput): LintResult {
  const { record: r, copy, pages } = input;
  const errors: string[] = [];
  const blockers: string[] = [];
  const warnings: string[] = [];
  // The only numbers a tel: link may dial: the business number, plus a contractor's after-hours line.
  const okTel = new Set([`tel:${r.phone.e164}`]);
  const afterHours = r.ext.contractor?.afterHours?.phone ? normalizeUsPhone(r.ext.contractor.afterHours.phone) : null;
  if (afterHours) okTel.add(`tel:${afterHours.e164}`);

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
      if (href.startsWith("tel:") && !okTel.has(href)) errors.push(`${path}: phone link ${href} doesn't match ${r.phone.e164}`);
    }
    for (const m of html.matchAll(/<img\b[^>]*>/g)) {
      if (!/\balt="/.test(m[0])) errors.push(`${path}: image without alt text`);
    }
    for (const re of PLACEHOLDERS) if (re.test(text)) errors.push(`${path}: placeholder text matches ${re}`);
    if (SUPERLATIVE.test(text)) warnings.push(`${path}: superlative wording ("${SUPERLATIVE.exec(text)![0]}") needs a sourced award`);
    for (const review of input.reviewTexts ?? []) {
      if (quotesReview(text, review)) errors.push(`${path}: contains text from a Google review`);
    }
    if (html.length > 120_000) warnings.push(`${path}: HTML is ${Math.round(html.length / 1024)} KB (budget ~100 KB)`);
  }

  // Hype and category-specific claims are checked in the AI text only. The business name, address and nav are
  // facts, so "Premier Auto Care" or "Elevate Salon" can still publish.
  const aiText = aiTextOf(copy);
  const banned = bannedPhraseIn(aiText);
  if (banned) errors.push(`Site text uses the banned phrase "${banned}". Edit the text or rewrite it.`);
  for (const re of input.banned ?? []) {
    const m = re.exec(aiText);
    if (m) errors.push(`Site text says "${m[0]}", which isn't allowed for this kind of business. Edit the text or rewrite it.`);
  }
  if (copy.issues?.length) warnings.push(`AI text may need a look: ${copy.issues.join("; ")}`);
  const facts = factsTextOf(r);
  const loose = unsupportedNumbers(aiText, facts).filter((n) => n.replace(/\D/g, "").length >= 2);
  if (loose.length) warnings.push(`AI text mentions ${loose.map((n) => `"${n}"`).join(", ")}, which isn't in the business facts. Check it with the owner.`);
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
