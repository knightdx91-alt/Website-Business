import type { CategoryId } from "./types.ts";

/**
 * Design DNA: the page's *structure*, as a third part of a site's design id ("<look>~<layout>~<dna>").
 * A look is colors and fonts, a layout is CSS decoration on shared markup; the DNA changes the markup
 * itself (how the hero is built, how the header, info strip, services, call to action, footer and phone
 * bar are put together), so two sites with the same layout no longer read as the same page.
 *
 * Every knob has a legacy value that reproduces the pre-DNA page exactly, so older sites don't change.
 * When a knob is NOT legacy, the layout's own CSS for that part is scoped away (see scopeLayoutCss),
 * so the layout keeps its character everywhere else while the DNA owns that part.
 */
export const DNA_KNOBS = {
  hero: ["stack", "cover", "split", "banner", "statement"],
  nav: ["bar", "centered", "slim"],
  buttons: ["solid-ghost", "solid-link", "solid-solid", "outline", "block"],
  strip: ["bar", "tiles", "inline", "none"],
  services: ["cards", "list", "tiles", "accordion", "columns"],
  cta: ["band", "split", "boxed"],
  footer: ["columns", "stack", "bigcta"],
  bar: ["bar", "fab"],
  photo: ["plain", "duotone", "frame", "arch"],
} as const;

export type DnaKnob = keyof typeof DNA_KNOBS;
export type Dna = { [K in DnaKnob]: (typeof DNA_KNOBS)[K][number] };
export const DNA_KNOB_IDS = Object.keys(DNA_KNOBS) as DnaKnob[];

/** What every site had before DNA existed. */
export const LEGACY_DNA: Dna = { hero: "stack", nav: "bar", buttons: "solid-ghost", strip: "bar", services: "cards", cta: "band", footer: "columns", bar: "bar", photo: "plain" };

/** Plain-language names for the app's pickers. */
export const DNA_LABELS: { [K in DnaKnob]: { label: string; values: Record<Dna[K], string> } } = {
  hero: { label: "Opening", values: { stack: "Headline over photo", cover: "Full-screen photo", split: "Headline + info panel", banner: "Short band, then details", statement: "Big words, photo below" } },
  nav: { label: "Top bar", values: { bar: "Name left, menu right", centered: "Name centered", slim: "Name and call button only" } },
  buttons: { label: "Buttons", values: { "solid-ghost": "Solid + outline", "solid-link": "Solid + text link", "solid-solid": "Two solid colors", outline: "Outlined", block: "Big full-width" } },
  strip: { label: "Address bar", values: { bar: "Thin line", tiles: "Three tiles", inline: "One centered line", none: "In the opening" } },
  services: { label: "Services", values: { cards: "Cards", list: "Ruled list", tiles: "Compact tiles", accordion: "Tap to expand", columns: "Text columns" } },
  cta: { label: "Closing call", values: { band: "Centered band", split: "Side by side", boxed: "Boxed" } },
  footer: { label: "Footer", values: { columns: "Three columns", stack: "Centered stack", bigcta: "Big call button" } },
  bar: { label: "Phone bar", values: { bar: "Bottom bar", fab: "Round call button" } },
  photo: { label: "Photo style", values: { plain: "As is", duotone: "Tinted", frame: "Framed", arch: "Arched" } },
};

const LETTER: Record<DnaKnob, string> = { hero: "h", nav: "n", buttons: "b", strip: "s", services: "v", cta: "c", footer: "f", bar: "a", photo: "p" };

/** For the app's pickers: knob order, letter and values, so it can encode a design id the same way. */
export const DNA_ORDER = DNA_KNOB_IDS.map((k) => ({ id: k, letter: LETTER[k], label: DNA_LABELS[k].label, values: (DNA_KNOBS[k] as readonly string[]).map((v) => ({ id: v, name: (DNA_LABELS[k].values as Record<string, string>)[v]! })) }));

/** "h1n0b2s3v1c0f2a0p1": one letter + index per knob, always in DNA_KNOB_IDS order. */
export function encodeDna(d: Dna): string {
  return DNA_KNOB_IDS.map((k) => `${LETTER[k]}${(DNA_KNOBS[k] as readonly string[]).indexOf(d[k])}`).join("");
}

export function parseDna(s: string | undefined): Dna | undefined {
  if (!s) return undefined;
  const out: Partial<Dna> = {};
  let rest = s;
  for (const k of DNA_KNOB_IDS) {
    const m = new RegExp(`^${LETTER[k]}(\\d+)`).exec(rest);
    if (!m) return undefined;
    const values = DNA_KNOBS[k] as readonly string[];
    const i = Number(m[1]);
    if (i >= values.length) return undefined;
    (out as Record<string, string>)[k] = values[i]!;
    rest = rest.slice(m[0].length);
  }
  return rest ? undefined : (out as Dna);
}

export const isLegacyDna = (d: Dna | undefined): boolean => !d || DNA_KNOB_IDS.every((k) => d[k] === LEGACY_DNA[k]);

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * What suits each category. Listed values are weighted picks (earlier = a little likelier); anything
 * not listed is never picked for that category (a CPA never gets a full-screen photo opening).
 */
type Prefs = { [K in DnaKnob]?: Array<Dna[K]> };
const PREFS: Record<CategoryId, Prefs> = {
  restaurant: { hero: ["cover", "stack", "banner", "split"], services: ["cards", "tiles", "columns"], strip: ["tiles", "bar", "inline"], photo: ["plain", "frame", "arch"], buttons: ["solid-ghost", "solid-solid", "block"] },
  contractor: { hero: ["split", "stack", "statement", "banner"], services: ["list", "cards", "accordion", "tiles"], cta: ["split", "band", "boxed"], buttons: ["block", "solid-solid", "solid-ghost"], photo: ["plain", "duotone", "frame"] },
  salon: { hero: ["cover", "banner", "stack", "split"], services: ["list", "columns", "cards"], photo: ["arch", "plain", "frame"], buttons: ["solid-ghost", "outline", "solid-link"], strip: ["inline", "bar", "tiles"] },
  auto: { hero: ["split", "stack", "cover", "statement"], services: ["list", "tiles", "cards", "accordion"], buttons: ["block", "solid-solid", "solid-ghost"], photo: ["plain", "duotone"] },
  landscaping: { hero: ["cover", "stack", "banner"], services: ["tiles", "cards", "list"], photo: ["plain", "frame"], buttons: ["solid-ghost", "block", "solid-solid"] },
  cleaning: { hero: ["statement", "split", "stack", "banner"], services: ["columns", "list", "cards"], photo: ["frame", "plain"], buttons: ["solid-ghost", "solid-link", "block"], strip: ["inline", "bar", "none"] },
  print: { hero: ["banner", "stack", "statement", "cover"], services: ["tiles", "cards", "list"], photo: ["frame", "plain", "duotone"], buttons: ["solid-solid", "solid-ghost", "block"] },
  retail: { hero: ["cover", "banner", "stack", "split"], services: ["tiles", "cards", "columns"], photo: ["plain", "arch", "frame"], strip: ["tiles", "inline", "bar"] },
  finance: { hero: ["statement", "split", "banner", "stack"], services: ["columns", "list", "cards"], buttons: ["outline", "solid-link", "solid-ghost"], photo: ["frame", "plain"], cta: ["boxed", "split", "band"], bar: ["bar"] },
  church: { hero: ["banner", "split", "statement", "stack"], services: ["columns", "list", "cards"], buttons: ["solid-link", "solid-ghost", "outline"], photo: ["frame", "plain", "arch"], bar: ["bar"] },
};

const ALL = <K extends DnaKnob>(k: K): Array<Dna[K]> => [...(DNA_KNOBS[k] as unknown as readonly Dna[K][])];

/**
 * A deterministic DNA for a site: the same seed always gives the same structure, different seeds spread
 * across the category's preferred values. Knobs that depend on each other are settled last.
 */
export function pickDna(seed: string, category: CategoryId, o: { avoid?: Dna[] } = {}): Dna {
  const prefs = PREFS[category] ?? {};
  const pick = <K extends DnaKnob>(k: K, salt = ""): Dna[K] => {
    const pool = (prefs[k] as Array<Dna[K]> | undefined) ?? ALL(k);
    // Earlier entries get a slightly bigger slice: weights 3,2.5,2,... down to 1.
    const weights = pool.map((_, i) => Math.max(1, 3 - i * 0.5));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = ((hash(`${seed}|${k}|${salt}`) % 10_000) / 10_000) * total;
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i]!;
      if (r <= 0) return pool[i]!;
    }
    return pool[pool.length - 1]!;
  };
  const build = (salt: string): Dna => {
    const d: Dna = {
      hero: pick("hero", salt),
      nav: pick("nav", salt),
      buttons: pick("buttons", salt),
      strip: pick("strip", salt),
      services: pick("services", salt),
      cta: pick("cta", salt),
      footer: pick("footer", salt),
      bar: pick("bar", salt),
      photo: pick("photo", salt),
    };
    // The split opening carries the address, phone and hours in its panel, so no strip under it.
    if (d.hero === "split") d.strip = "none";
    else if (d.strip === "none") d.strip = "bar";
    // A full-screen photo opening reads best with a quiet line under it.
    if (d.hero === "cover" && d.strip === "tiles") d.strip = "inline";
    // Photo treatments only make sense where the photo is a picture, not a backdrop.
    if ((d.hero === "stack" || d.hero === "cover") && (d.photo === "frame" || d.photo === "arch")) d.photo = "plain";
    if (d.hero === "statement" && d.photo === "duotone") d.photo = "plain";
    return d;
  };
  for (let i = 0; i < 6; i++) {
    const d = build(i ? String(i) : "");
    if (!o.avoid?.some((a) => encodeDna(a) === encodeDna(d))) return d;
  }
  return build("6");
}

/** data-* attributes for <html>, which every piece of DNA CSS keys off. */
export function dnaAttrs(d: Dna): string {
  return ` data-hero="${d.hero}" data-nav="${d.nav}" data-btn="${d.buttons}" data-strip="${d.strip}" data-svc="${d.services}" data-cta="${d.cta}" data-ftr="${d.footer}" data-bar="${d.bar}" data-photo="${d.photo}"`;
}

/* ---------- keeping layout CSS out of the parts the DNA owns ---------- */

/** Which selectors belong to which part, and the html attribute that says the DNA left that part alone. */
const PARTS: Array<{ knob: DnaKnob; attr: string; test: RegExp }> = [
  { knob: "hero", attr: "data-hero", test: /\.hero\b|\.hero__|\.hero--|\.badge\b|\.status\b/ },
  { knob: "nav", attr: "data-nav", test: /\.hdr\b|\.hdr__|\.brand\b|\.nav\b|\.navbtn/ },
  { knob: "strip", attr: "data-strip", test: /\.strip/ },
  { knob: "cta", attr: "data-cta", test: /\.cta\b/ },
  { knob: "footer", attr: "data-ftr", test: /\.ftr/ },
  { knob: "bar", attr: "data-bar", test: /\.bar\b/ },
];

/**
 * Prefixes every layout rule that styles a DNA-owned part with `html[data-<part>="<legacy>"]`, so it only
 * applies when the DNA kept the legacy structure there. With legacy DNA the CSS comes back unchanged.
 * Handles nested @media / @supports blocks; leaves @keyframes and @font-face alone.
 */
export function scopeLayoutCss(css: string, dna: Dna): string {
  const active = PARTS.filter((p) => dna[p.knob] !== LEGACY_DNA[p.knob]);
  if (!active.length) return css;
  const prefixFor = (selector: string): string | null => {
    const hits = active.filter((p) => p.test.test(selector));
    if (!hits.length) return null;
    return hits.map((p) => `html[${p.attr}="${LEGACY_DNA[p.knob]}"]`).join("");
  };
  const rewriteSelector = (sel: string): string =>
    sel
      .split(",")
      .map((s) => {
        const t = s.trim();
        const pre = prefixFor(t);
        if (!pre) return t;
        // ".js" / ".no-js" are classes on <html> itself, so the attribute goes on the same element.
        return /^\.(no-)?js\b/.test(t) ? `${pre}${t}` : `${pre} ${t}`;
      })
      .join(",");
  // A tiny CSS walker: rules are "selector{decls}"; at-rules with blocks recurse.
  const walk = (src: string): string => {
    let out = "";
    let i = 0;
    while (i < src.length) {
      const open = src.indexOf("{", i);
      if (open < 0) {
        out += src.slice(i);
        break;
      }
      const head = src.slice(i, open);
      // Find the matching close brace for this block.
      let depth = 1;
      let j = open + 1;
      while (j < src.length && depth) {
        if (src[j] === "{") depth++;
        else if (src[j] === "}") depth--;
        j++;
      }
      const body = src.slice(open + 1, j - 1);
      const sel = head.trim();
      if (sel.startsWith("@")) {
        const nested = /^@(media|supports|container|layer)\b/.test(sel);
        out += `${head}{${nested ? walk(body) : body}}`;
      } else {
        out += `${head.replace(sel, rewriteSelector(sel))}{${body}}`;
      }
      i = j;
    }
    return out;
  };
  return walk(css);
}
