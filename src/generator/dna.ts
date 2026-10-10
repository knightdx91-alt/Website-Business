import type { CategoryId } from "./types.ts";

/**
 * Design DNA: the page's *structure*, as a third part of a site's design id ("<look>~<layout>~<dna>").
 * A look is colors and fonts, a layout is CSS decoration on shared markup; the DNA changes the markup
 * itself (how the hero is built, how the header, info strip, services, call to action, footer and phone
 * bar are put together) and the page's rhythm, type scale, density and texture, so two sites with the
 * same layout no longer read as the same page.
 *
 * Every knob has a legacy value (the first one) that reproduces the pre-DNA page exactly, so older sites
 * don't change. New values are only ever appended, and new knobs only ever added at the end, so every id
 * ever stored keeps meaning the same page. When a knob is NOT legacy, the layout's own CSS for that part
 * is scoped away (see scopeLayoutCss), so the layout keeps its character everywhere else while the DNA owns
 * that part.
 */
export const DNA_KNOBS = {
  hero: ["stack", "cover", "split", "banner", "statement", "card", "billboard"],
  nav: ["bar", "centered", "slim", "utility", "overlay"],
  buttons: ["solid-ghost", "solid-link", "solid-solid", "outline", "block", "pill", "shadow"],
  strip: ["bar", "tiles", "inline", "none", "ticker", "factcard"],
  services: ["cards", "list", "tiles", "accordion", "columns", "table", "scroller"],
  cta: ["band", "split", "boxed", "inline"],
  footer: ["columns", "stack", "bigcta", "bigname"],
  bar: ["bar", "fab"],
  photo: ["plain", "duotone", "frame", "arch", "tilt"],
  // Added Oct 2026 (ids without these letters mean the legacy value).
  // "question" and "benefit" (Oct 2026, appended) use copy.heroQuestion / copy.heroBenefit and fall back to "service" without them.
  headline: ["service", "name", "promise", "question", "benefit"],
  rhythm: ["bands", "continuous", "chapters", "boxed"],
  scale: ["standard", "dramatic", "poster", "tight"],
  density: ["standard", "compact", "generous"],
  tone: ["default", "light"],
  motif: ["none", "rules", "stripes", "dots", "grain"],
  proof: ["inline", "band"],
} as const;

export type DnaKnob = keyof typeof DNA_KNOBS;
export type Dna = { [K in DnaKnob]: (typeof DNA_KNOBS)[K][number] };
export const DNA_KNOB_IDS = Object.keys(DNA_KNOBS) as DnaKnob[];
/** The first nine knobs are always in an id; the rest may be missing (older ids) and then mean legacy. */
const REQUIRED_KNOBS = 9;

/** What every site had before DNA existed. */
export const LEGACY_DNA: Dna = Object.fromEntries(DNA_KNOB_IDS.map((k) => [k, DNA_KNOBS[k][0]])) as Dna;

/** Plain-language names for the app's pickers. */
export const DNA_LABELS: { [K in DnaKnob]: { label: string; values: Record<Dna[K], string> } } = {
  hero: {
    label: "Opening",
    values: {
      stack: "Headline over photo",
      cover: "Full-screen photo",
      split: "Headline + info panel",
      banner: "Short band, then details",
      statement: "Big words, photo below",
      card: "Photo, then a floating card",
      billboard: "Business name huge",
    },
  },
  nav: { label: "Top bar", values: { bar: "Name left, menu right", centered: "Name centered", slim: "Name and call button only", utility: "Thin info line above", overlay: "See-through over the opening" } },
  buttons: {
    label: "Buttons",
    values: { "solid-ghost": "Solid + outline", "solid-link": "Solid + text link", "solid-solid": "Two solid colors", outline: "Outlined", block: "Big full-width", pill: "Pill shaped", shadow: "Hard shadow" },
  },
  strip: { label: "Address bar", values: { bar: "Thin line", tiles: "Three tiles", inline: "One centered line", none: "In the opening", ticker: "Colored one-liner", factcard: "Card over the opening" } },
  services: { label: "Services", values: { cards: "Cards", list: "Ruled list", tiles: "Compact tiles", accordion: "Tap to expand", columns: "Text columns", table: "Price list", scroller: "Swipe row" } },
  cta: { label: "Closing call", values: { band: "Centered band", split: "Side by side", boxed: "Boxed", inline: "One line" } },
  footer: { label: "Footer", values: { columns: "Three columns", stack: "Centered stack", bigcta: "Big call button", bigname: "Giant name" } },
  bar: { label: "Phone bar", values: { bar: "Bottom bar", fab: "Round call button" } },
  photo: { label: "Photo style", values: { plain: "As is", duotone: "Tinted", frame: "Framed", arch: "Arched", tilt: "Snapshot" } },
  headline: { label: "Headline", values: { service: "What + where", name: "Business name", promise: "The promise line", question: "A question (\"AC blowing warm air?\")", benefit: "A benefit (\"Take your weekend back\")" } },
  rhythm: { label: "Page rhythm", values: { bands: "Alternating bands", continuous: "One background, ruled", chapters: "Numbered chapters", boxed: "Boxed sections" } },
  scale: { label: "Type size", values: { standard: "Standard", dramatic: "Dramatic", poster: "Poster", tight: "Tight" } },
  density: { label: "Spacing", values: { standard: "Standard", compact: "Compact", generous: "Generous" } },
  tone: { label: "Opening tone", values: { default: "Brand color", light: "Light" } },
  motif: { label: "Texture", values: { none: "None", rules: "Fine lines", stripes: "Diagonal stripes", dots: "Dots", grain: "Grain" } },
  proof: { label: "Proof", values: { inline: "In the opening", band: "Band under the opening" } },
};

const LETTER: Record<DnaKnob, string> = {
  hero: "h",
  nav: "n",
  buttons: "b",
  strip: "s",
  services: "v",
  cta: "c",
  footer: "f",
  bar: "a",
  photo: "p",
  headline: "t",
  rhythm: "r",
  scale: "k",
  density: "d",
  tone: "o",
  motif: "m",
  proof: "q",
};

/** For the app's pickers: knob order, letter and values, so it can encode a design id the same way. */
export const DNA_ORDER = DNA_KNOB_IDS.map((k) => ({
  id: k,
  letter: LETTER[k],
  label: DNA_LABELS[k].label,
  values: (DNA_KNOBS[k] as readonly string[]).map((v) => ({ id: v, name: (DNA_LABELS[k].values as Record<string, string>)[v]! })),
}));

/** "h1n0b2s3v1c0f2a0p1t0r1k0d0o0m0q0": one letter + index per knob, always in DNA_KNOB_IDS order. */
export function encodeDna(d: Dna): string {
  return DNA_KNOB_IDS.map((k) => `${LETTER[k]}${(DNA_KNOBS[k] as readonly string[]).indexOf(d[k])}`).join("");
}

export function parseDna(s: string | undefined): Dna | undefined {
  if (!s) return undefined;
  const out: Partial<Dna> = {};
  let rest = s;
  for (let i = 0; i < DNA_KNOB_IDS.length; i++) {
    const k = DNA_KNOB_IDS[i]!;
    const m = new RegExp(`^${LETTER[k]}(\\d+)`).exec(rest);
    if (!m) {
      if (i < REQUIRED_KNOBS) return undefined;
      (out as Record<string, string>)[k] = DNA_KNOBS[k][0]; // older id: this knob didn't exist yet
      continue;
    }
    const values = DNA_KNOBS[k] as readonly string[];
    const n = Number(m[1]);
    if (n >= values.length) return undefined;
    (out as Record<string, string>)[k] = values[n]!;
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
  restaurant: {
    hero: ["cover", "stack", "card", "banner", "billboard", "split"],
    services: ["cards", "tiles", "scroller", "columns", "table"],
    strip: ["tiles", "bar", "ticker", "inline", "factcard"],
    photo: ["plain", "frame", "arch"],
    buttons: ["solid-ghost", "solid-solid", "block", "pill"],
    headline: ["service", "name", "promise"],
    scale: ["standard", "dramatic", "poster"],
    motif: ["none", "dots", "rules", "grain"],
  },
  contractor: {
    hero: ["split", "stack", "statement", "card", "banner"],
    services: ["list", "cards", "accordion", "tiles", "scroller"],
    cta: ["split", "band", "boxed", "inline"],
    buttons: ["block", "solid-solid", "solid-ghost", "shadow"],
    photo: ["plain", "duotone", "frame"],
    strip: ["bar", "ticker", "factcard", "tiles", "inline"],
    headline: ["service", "promise", "question", "benefit"],
    scale: ["standard", "dramatic"],
    motif: ["none", "stripes", "rules"],
    proof: ["band", "inline"],
    tone: ["default"],
  },
  salon: {
    hero: ["cover", "banner", "billboard", "stack", "card", "split"],
    services: ["list", "table", "columns", "cards"],
    photo: ["arch", "plain", "frame", "tilt"],
    buttons: ["solid-ghost", "outline", "solid-link", "pill"],
    strip: ["inline", "bar", "tiles", "ticker"],
    headline: ["name", "service", "promise"],
    scale: ["dramatic", "standard", "poster"],
    motif: ["none", "rules", "grain"],
    rhythm: ["bands", "continuous", "chapters"],
  },
  auto: {
    hero: ["split", "stack", "cover", "statement", "card"],
    services: ["list", "tiles", "cards", "accordion", "scroller"],
    buttons: ["block", "solid-solid", "solid-ghost", "shadow"],
    photo: ["plain", "duotone"],
    strip: ["bar", "ticker", "tiles", "factcard"],
    headline: ["service", "promise"],
    scale: ["standard", "dramatic"],
    motif: ["none", "stripes", "rules"],
    proof: ["band", "inline"],
    tone: ["default"],
  },
  landscaping: {
    hero: ["cover", "stack", "banner", "card"],
    services: ["tiles", "cards", "list", "scroller"],
    photo: ["plain", "frame"],
    buttons: ["solid-ghost", "block", "solid-solid", "pill"],
    headline: ["service", "benefit", "promise", "question"],
    motif: ["none", "dots"],
    proof: ["band", "inline"],
  },
  cleaning: {
    hero: ["statement", "split", "stack", "banner", "card"],
    services: ["columns", "list", "cards", "tiles"],
    photo: ["frame", "plain"],
    buttons: ["solid-ghost", "solid-link", "block", "pill"],
    strip: ["inline", "bar", "none", "factcard"],
    headline: ["service", "benefit", "promise", "question"],
    motif: ["none", "rules"],
    proof: ["band", "inline"],
    tone: ["default", "light"],
  },
  print: {
    hero: ["banner", "stack", "statement", "billboard", "card", "cover"],
    services: ["tiles", "cards", "list", "scroller"],
    photo: ["frame", "plain", "duotone", "tilt"],
    buttons: ["solid-solid", "solid-ghost", "block", "shadow"],
    headline: ["name", "service"],
    scale: ["standard", "poster", "dramatic"],
    motif: ["none", "dots", "stripes", "grain"],
    rhythm: ["bands", "chapters", "boxed", "continuous"],
  },
  retail: {
    hero: ["cover", "banner", "stack", "billboard", "card", "split"],
    services: ["tiles", "cards", "columns", "scroller"],
    photo: ["plain", "arch", "frame", "tilt"],
    strip: ["tiles", "inline", "bar", "ticker"],
    headline: ["name", "service", "promise"],
    scale: ["standard", "dramatic", "poster"],
    motif: ["none", "dots", "rules"],
  },
  finance: {
    hero: ["statement", "split", "banner", "stack", "card"],
    services: ["columns", "list", "cards", "table"],
    buttons: ["outline", "solid-link", "solid-ghost", "pill"],
    photo: ["frame", "plain"],
    cta: ["boxed", "split", "band", "inline"],
    bar: ["bar"],
    strip: ["bar", "inline", "factcard", "tiles"],
    headline: ["service", "name"],
    scale: ["standard", "tight"],
    motif: ["none", "rules"],
    tone: ["default", "light"],
    density: ["standard", "generous"],
    rhythm: ["bands", "continuous"],
  },
  church: {
    hero: ["banner", "split", "statement", "stack", "card"],
    services: ["columns", "list", "cards"],
    buttons: ["solid-link", "solid-ghost", "outline", "pill"],
    photo: ["frame", "plain", "arch"],
    bar: ["bar"],
    nav: ["bar", "centered", "utility"],
    headline: ["name", "service"],
    scale: ["standard"],
    motif: ["none", "rules"],
    tone: ["default", "light"],
    density: ["standard", "generous"],
    rhythm: ["bands", "continuous"],
  },
};

/**
 * Curated recipes: named structures that set the knobs people notice most (the rest are still picked
 * per site). About half of new sites start from a recipe, so the common shapes show up often and still
 * never twice the same.
 */
export interface Recipe {
  id: string;
  name: string;
  about: string;
  dna: Partial<Dna>;
}
const R = (id: string, name: string, about: string, dna: Partial<Dna>): Recipe => ({ id, name, about, dna });
export const RECIPES: Record<CategoryId, Recipe[]> = {
  restaurant: [
    R("photo-first", "Photo first", "Full-screen food photo, menu tiles, swipeable specials.", { hero: "cover", services: "tiles", strip: "inline", scale: "dramatic" }),
    R("menu-board", "Menu board", "Name as a sign, price-list menu, dots texture.", { hero: "billboard", services: "table", motif: "dots", strip: "ticker" }),
    R("story", "Story first", "Short band, then the story and photo side by side.", { hero: "banner", services: "columns", rhythm: "continuous", photo: "frame" }),
    R("postcard", "Postcard", "Photo, then a floating card with the hours and call button.", { hero: "card", strip: "none", services: "scroller", footer: "bigname" }),
    R("classic-diner", "Classic", "Headline over photo, three tiles, cards.", { hero: "stack", strip: "tiles", services: "cards", rhythm: "bands" }),
    R("poster", "Poster", "Huge type, one background, numbered chapters.", { hero: "statement", scale: "poster", rhythm: "chapters", buttons: "shadow" }),
  ],
  contractor: [
    R("dispatch", "Dispatch", "Info panel beside the headline, proof band, ruled list.", { hero: "split", strip: "none", proof: "band", services: "list", buttons: "block" }),
    R("truck-side", "Truck side", "Big words, stripes, hard-shadow buttons.", { hero: "statement", motif: "stripes", buttons: "shadow", services: "tiles", proof: "band" }),
    R("estimate-first", "Estimate first", "Photo then a floating request card, colored one-liner.", { hero: "card", strip: "ticker", services: "accordion", cta: "inline" }),
    R("ledger", "Ledger", "One background, numbered chapters, price-list services.", { hero: "banner", rhythm: "chapters", services: "table", footer: "stack" }),
    R("classic-crew", "Classic crew", "Headline over the crew photo, three tiles, cards.", { hero: "stack", strip: "tiles", services: "cards", proof: "inline" }),
    R("fact-card", "Fact card", "A details card pulled up over the opening.", { hero: "stack", strip: "factcard", services: "list", cta: "split" }),
  ],
  salon: [
    R("lookbook", "Lookbook", "Full-screen photo, name headline, arched photos.", { hero: "cover", headline: "name", photo: "arch", services: "list", scale: "dramatic" }),
    R("price-list", "Price list", "Name as the sign, services as a price list.", { hero: "billboard", services: "table", strip: "inline", rhythm: "continuous" }),
    R("editorial", "Editorial", "Short band, generous spacing, text columns.", { hero: "banner", density: "generous", services: "columns", photo: "frame", buttons: "outline" }),
    R("snapshot", "Snapshot", "Photo, floating card, tilted snapshots, pill buttons.", { hero: "card", photo: "tilt", buttons: "pill", services: "list", footer: "bigname" }),
    R("poster-shop", "Poster", "Huge type, grain texture, numbered chapters.", { hero: "statement", scale: "poster", motif: "grain", rhythm: "chapters" }),
  ],
  auto: [
    R("service-desk", "Service desk", "Info panel, proof band, ruled list, big buttons.", { hero: "split", strip: "none", proof: "band", services: "list", buttons: "block" }),
    R("bay-door", "Bay door", "Full-screen shop photo, colored one-liner, tiles.", { hero: "cover", strip: "ticker", services: "tiles", proof: "band" }),
    R("workshop", "Workshop", "Big words, stripes, swipe row of services.", { hero: "statement", motif: "stripes", services: "scroller", buttons: "shadow" }),
    R("classic-shop", "Classic shop", "Headline over photo, three tiles, cards.", { hero: "stack", strip: "tiles", services: "cards" }),
    R("front-counter", "Front counter", "Photo, floating card, fact strip, accordion.", { hero: "card", strip: "factcard", services: "accordion", cta: "inline" }),
  ],
  landscaping: [
    R("yard-photo", "Yard photo", "Full-screen photo, proof band, tiles.", { hero: "cover", proof: "band", services: "tiles", strip: "inline" }),
    R("seasons", "Seasons", "Short band, swipe row, numbered chapters.", { hero: "banner", services: "scroller", rhythm: "chapters" }),
    R("crew", "Crew", "Photo, floating card, pill buttons.", { hero: "card", buttons: "pill", services: "cards", footer: "stack" }),
    R("classic-lawn", "Classic", "Headline over photo, cards.", { hero: "stack", services: "cards", strip: "bar" }),
  ],
  cleaning: [
    R("fresh", "Fresh", "Big words on a light opening, text columns, generous spacing.", { hero: "statement", tone: "light", services: "columns", density: "generous" }),
    R("checklist", "Checklist", "Info panel, proof band, ruled list.", { hero: "split", strip: "none", proof: "band", services: "list" }),
    R("tidy-card", "Tidy card", "Photo, floating card, pill buttons.", { hero: "card", buttons: "pill", services: "tiles", cta: "inline" }),
    R("classic-clean", "Classic", "Headline over photo, cards.", { hero: "stack", services: "cards" }),
  ],
  print: [
    R("shop-sign", "Shop sign", "Name huge, dots texture, tiles.", { hero: "billboard", motif: "dots", services: "tiles", buttons: "shadow" }),
    R("proof-sheet", "Proof sheet", "Short band, boxed sections, snapshots.", { hero: "banner", rhythm: "boxed", photo: "tilt", services: "cards" }),
    R("poster-print", "Poster", "Huge type, grain, numbered chapters.", { hero: "statement", scale: "poster", motif: "grain", rhythm: "chapters" }),
    R("classic-print", "Classic", "Headline over photo, cards.", { hero: "stack", services: "cards" }),
  ],
  retail: [
    R("storefront", "Storefront", "Full-screen photo, name headline, tiles.", { hero: "cover", headline: "name", services: "tiles", strip: "inline" }),
    R("window-sign", "Window sign", "Name huge, dots texture, swipe row.", { hero: "billboard", motif: "dots", services: "scroller", footer: "bigname" }),
    R("boutique", "Boutique", "Short band, arched photos, generous spacing.", { hero: "banner", photo: "arch", density: "generous", services: "columns", rhythm: "continuous" }),
    R("snapshots", "Snapshots", "Photo, floating card, tilted snapshots.", { hero: "card", photo: "tilt", buttons: "pill", services: "cards" }),
    R("classic-shop", "Classic", "Headline over photo, three tiles, cards.", { hero: "stack", strip: "tiles", services: "cards" }),
  ],
  finance: [
    R("quiet-office", "Quiet office", "Big words on a light opening, one background, generous spacing.", { hero: "statement", tone: "light", rhythm: "continuous", density: "generous", services: "columns" }),
    R("desk", "Desk", "Info panel, boxed closing call, outlined buttons.", { hero: "split", strip: "none", cta: "boxed", buttons: "outline", services: "list" }),
    R("ledger-office", "Ledger", "Short band, fact card, price-list services.", { hero: "banner", strip: "factcard", services: "table", scale: "tight" }),
    R("classic-office", "Classic", "Headline over photo, cards.", { hero: "stack", services: "cards" }),
  ],
  church: [
    R("welcome", "Welcome", "Short band, light tone, info line above, columns.", { hero: "banner", tone: "light", nav: "utility", services: "columns", density: "generous" }),
    R("gathering", "Gathering", "Info panel with service times, one background.", { hero: "split", strip: "none", rhythm: "continuous", services: "list" }),
    R("steeple", "Steeple", "Big words, fine lines, centered name.", { hero: "statement", motif: "rules", nav: "centered", services: "columns" }),
    R("classic-church", "Classic", "Headline over photo, cards.", { hero: "stack", services: "cards" }),
  ],
};

const ALL = <K extends DnaKnob>(k: K): Array<Dna[K]> => [...(DNA_KNOBS[k] as unknown as readonly Dna[K][])];

/** Knobs that depend on each other, settled after the free picks. */
export function settleDna(d: Dna): Dna {
  // The split opening carries the address, phone and hours in its panel, so no strip under it.
  if (d.hero === "split") d.strip = "none";
  else if (d.strip === "none") d.strip = "bar";
  // A full-screen photo opening reads best with a quiet line under it.
  if (d.hero === "cover" && d.strip === "tiles") d.strip = "inline";
  // The fact card overlaps the opening; it needs a flat bottom edge to sit on.
  if (d.strip === "factcard" && (d.hero === "banner" || d.hero === "card")) d.strip = "bar";
  // Photo treatments only make sense where the photo is a picture, not a backdrop.
  if ((d.hero === "stack" || d.hero === "cover") && (d.photo === "frame" || d.photo === "arch" || d.photo === "tilt")) d.photo = "plain";
  if (d.hero === "statement" && d.photo === "duotone") d.photo = "plain";
  // The billboard is the name; the headline knob has nothing to say there.
  if (d.hero === "billboard") d.headline = "service";
  // Poster type needs room; a see-through header hides behind a floating card's photo.
  if (d.scale === "poster" && d.density === "compact") d.density = "standard";
  if (d.nav === "overlay" && (d.hero === "card" || d.hero === "banner")) d.nav = "bar";
  // A texture under a light opening or a full photo isn't visible; keep the id honest.
  if (d.motif !== "none" && (d.tone === "light" || d.hero === "cover")) d.motif = "none";
  // Boxed sections set their own spacing; a see-through header needs a dark opening behind it.
  if (d.rhythm === "boxed") d.density = "standard";
  if (d.tone === "light" && d.nav === "overlay") d.nav = "bar";
  // A whole promise line at poster size fills the screen; keep poster type for short headlines.
  if (d.headline === "promise" && d.scale === "poster") d.scale = "dramatic";
  // A proof band plus a thin address line stacks two bands; make the second one quieter.
  if (d.proof === "band" && d.strip === "bar") d.strip = "inline";
  return d;
}

/**
 * A deterministic DNA for a site: the same seed always gives the same structure, different seeds spread
 * across the category's preferred values. About half the time a curated recipe sets the big knobs first.
 */
/** What's known about the business when its structure is picked (see pickDesign / chooseLook). */
export interface DnaHints {
  /** The owner gave awards, memberships, clients or stats: the proof band under the opening shows them off. */
  proof?: boolean;
  /** No owner photo (none, or only a Google one that can't go live): open without a photo, so the live site never looks worse than the preview. */
  noPhoto?: boolean;
}

const PHOTO_LESS: Array<Dna["hero"]> = ["statement", "billboard", "banner"];

export function pickDna(seed: string, category: CategoryId, o: { avoid?: Dna[]; hints?: DnaHints } = {}): Dna {
  const prefs = PREFS[category] ?? {};
  const roll = (salt: string) => (hash(`${seed}|${salt}`) % 10_000) / 10_000;
  const pick = <K extends DnaKnob>(k: K, salt = ""): Dna[K] => {
    const pool = (prefs[k] as Array<Dna[K]> | undefined) ?? ALL(k);
    // Earlier entries get a slightly bigger slice: weights 3,2.5,2,... down to 1.
    const weights = pool.map((_, i) => Math.max(1, 3 - i * 0.5));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = roll(`${k}|${salt}`) * total;
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i]!;
      if (r <= 0) return pool[i]!;
    }
    return pool[pool.length - 1]!;
  };
  const build = (salt: string): Dna => {
    const d = Object.fromEntries(DNA_KNOB_IDS.map((k) => [k, pick(k, salt)])) as Dna;
    const recipes = RECIPES[category] ?? [];
    if (recipes.length && roll(`recipe|${salt}`) < 0.55) Object.assign(d, recipes[Math.floor(roll(`which|${salt}`) * recipes.length)]!.dna);
    if (o.hints?.proof) d.proof = "band";
    if (o.hints?.noPhoto && !PHOTO_LESS.includes(d.hero)) {
      // Photo-led openings fall back to a plain band without a photo; pick one meant to stand on its own instead.
      const pool = PHOTO_LESS.filter((h) => (prefs.hero ?? PHOTO_LESS).includes(h));
      const opts = pool.length ? pool : PHOTO_LESS;
      d.hero = opts[Math.floor(roll(`nophoto|${salt}`) * opts.length)]!;
      // A light opening is allowed here even where the category normally keeps its brand color.
      if (roll(`light|${salt}`) < 0.35) d.tone = "light";
    }
    return settleDna(d);
  };
  // "Used" means the parts people notice first match (opening, services, address bar, headline), not every knob.
  const sig = (d: Dna) => `${d.hero}|${d.services}|${d.strip}|${d.headline}`;
  const used = new Set((o.avoid ?? []).map(sig));
  let first: Dna | undefined;
  for (let i = 0; i < 12; i++) {
    const d = build(i ? String(i) : "");
    first ??= d;
    if (!used.has(sig(d))) return d;
  }
  return first!;
}

/** data-* attributes for <html>, which every piece of DNA CSS keys off. */
export function dnaAttrs(d: Dna): string {
  return (
    ` data-hero="${d.hero}" data-nav="${d.nav}" data-btn="${d.buttons}" data-strip="${d.strip}" data-svc="${d.services}" data-cta="${d.cta}" data-ftr="${d.footer}" data-bar="${d.bar}" data-photo="${d.photo}"` +
    ` data-headline="${d.headline}" data-rhythm="${d.rhythm}" data-scale="${d.scale}" data-density="${d.density}" data-tone="${d.tone}" data-motif="${d.motif}" data-proof="${d.proof}"`
  );
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
