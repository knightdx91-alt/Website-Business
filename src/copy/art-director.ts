import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { layoutOf } from "../generator/design.ts";
import { DNA_KNOB_IDS, DNA_KNOBS, DNA_LABELS, dnaSignature, pickDna, RECIPES, settleDna, type Dna, type DnaHints, type DnaKnob } from "../generator/dna.ts";
import { FONTS } from "../generator/fonts.ts";
import { hasAnyHours } from "../generator/hours.ts";
import { LAYOUT_IDS, LAYOUTS, type LayoutId } from "../generator/layouts.ts";
import { designId, LOOKS, parseDesign, type LookDef } from "../generator/themes.ts";
import type { BusinessRecord, CategoryId, DesignNotes } from "../generator/types.ts";

/**
 * The art director: picks a site's design (look + layout + page structure) from what is known about the business,
 * instead of rolling it from the lead id. It reads the same catalog the app's pickers show (25 looks and 25 layouts per
 * category, the named structures and every structure knob) and answers with ids, a one-line concept and a plain reason
 * the salesperson can say out loud ("we gave it a chalkboard-menu feel because your reviews are all about the plate
 * lunches"). Everything it returns is validated against the catalog; anything off is replaced by the deterministic
 * pick, so a bad answer can never produce a design that doesn't exist. When the call fails, callers fall back to
 * `pickDesign` and the site still builds.
 *
 * Model: the studio's default (Opus 5.5) at low effort; one call is a few thousand cached input tokens and ~200 out.
 */

export const DEFAULT_DESIGN_MODEL = "claude-opus-5-5";
/** Bump when the rules or the catalog wording change in a way worth noting in `DesignNotes.model`. */
export const DESIGN_PROMPT_VERSION = 1;

const Schema = z.object({
  look: z.string().max(60).describe("The look id from LOOKS, spelled exactly (e.g. restaurant.pit_plank)."),
  alsoGood: z.array(z.string().max(60)).max(3).describe("Two or three other look ids that would also fit, best first, in case the first is already used by a neighbor."),
  layout: z.string().max(40).describe("The layout id from LAYOUTS, spelled exactly."),
  recipe: z.string().max(40).describe("A recipe id from RECIPES that sets the page structure, or an empty string to set the knobs yourself."),
  knobs: z
    .array(z.object({ knob: z.string().max(20), value: z.string().max(20) }))
    .max(17)
    .describe("Structure knobs to set on top of the recipe: knob id and value id from KNOBS. Only the ones you have a reason for; the rest are picked for variety."),
  concept: z.string().max(90).describe("The design idea in a few words, the way a designer names a direction: 'A chalkboard menu board', 'The parts-counter wall', 'Sunday-morning program'."),
  why: z.string().max(260).describe("One or two plain sentences for the salesperson: why this fits THIS business, in words the owner would nod at. No design jargon, no superlatives."),
  copyNotes: z
    .string()
    .max(240)
    .describe("Direction for the copywriter: the tone in 3-5 words, the one thing the headline should lead with, and anything the structure needs (e.g. 'headline under 5 words' for a poster opening)."),
});
type Pick = z.infer<typeof Schema>;

const SYSTEM = `You are the art director for a small studio that builds websites for local businesses in and around Cullman, Alabama. For each business you pick ONE design from a fixed catalog: a look (colors and fonts), a layout (page skeleton) and a page structure (a recipe plus a few knobs). A generator builds the page from your ids; you never write code or copy. The owner sees the finished site on a phone first, in person, and decides in a few seconds whether it looks like their business.

What a good pick does:
- Looks like the business, not like a template. The owner should think "that's us": a barbecue joint is dark, warm, slab type; a CPA is quiet, light, serif, never a full-screen photo; a kids' party rental is bright and rounded; a barber at night is dark with a condensed face.
- Reads at a glance as "a <trade> in <town>". Prefer type-led openings (statement, billboard, banner) when there is no owner photo: Google photos never go live, so a photo-led opening (stack, cover, split, card) would look worse the day it is published. With real owner photos, lead with them.
- Trades, auto, cleaning, lawn care: strong condensed or grotesque type, left-aligned text, a utility bar or thin address line, services framed as the customer's problem (cards, bento or a list), the bottom call bar. Restaurants and cafes: photo first where photos exist, menu-board or marquee structures, warm palettes. Salons and barbers: book-first, elegant display or serif type, centered openings are fine, price-list services. Retail: window-display or billboard openings, bento "what we carry". Finance and churches: quiet, light, generous spacing, bottom bar, no marquee, no poster type, no full-screen photo. Churches: service times live next to the headline, so keep the opening calm.
- Proof: when the business has 10+ Google reviews at 4.3 or better, pick a structure that shows the rating under the opening (proof "band"), unless the category hides ratings.
- Read the business's own words. Reviews that say "fancy", "date night", "cozy" → refined serif, darker, generous. "Cheap", "quick", "honest", "fair" → plain bold sans, light page, compact. "Family", "kids", "friendly" → rounded, warm. A long-standing business (a founding year) can carry a classic or slab face; a new one can be modern.
- Dark pages suit night and shop businesses (auto, barbers, barbecue, gyms, bars); light pages suit daytime shops, churches, finance, cleaning, kids, food trucks.
- Variety: neighbors in the same category must not match. Prefer looks and openings not listed under "in use nearby"; never pick anything listed under "taken".
- Keep it buildable: centered text only on one-column openings (stack, cover, statement, banner, billboard); a marquee address line never with a utility top bar or a proof band; poster type only with short headlines.
- The phone view is what the owner sees first. Vary it on purpose with the phone, trust and heads knobs (how the opening's buttons sit, how the trust line reads, how section headings look), so two neighbors never share the same phone chrome; "bar" (buttons only in the bottom bar) suits trades and shops with a strong name, "link" suits calm pages, "natural" suits short labels.
- A paying client's design is theirs: never their look, and not their layout or opening either while others fit.
Return only ids that exist in the catalog, spelled exactly. The "why" is for a salesperson talking to the owner: plain words, specific to this business, no design jargon.`;

/* ---------- describing the catalog ---------- */

function hsl(hex: string): { h: number; s: number; l: number } {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return { h: 0, s: 0, l: 0.5 };
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1]!.slice(i, i + 2), 16) / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, l };
}

/** A plain color word for a hex value ("dark red", "gold", "navy", "cream"), good enough to reason about a palette. */
export function colorName(hex: string): string {
  const { h, s, l } = hsl(hex);
  if (l < 0.08 || (l < 0.13 && s < 0.3)) return "black";
  if (l > 0.94 && s < 0.5) return "white";
  if (s < 0.12) return l < 0.3 ? "charcoal" : l < 0.7 ? "gray" : "light gray";
  if (l > 0.84 && h >= 20 && h <= 70) return "cream";
  const base =
    h < 15 || h >= 345 ? "red" : h < 40 ? (l < 0.38 ? "brown" : "orange") : h < 66 ? (l < 0.42 ? "brown" : "gold") : h < 82 ? "olive" : h < 165 ? "green" : h < 200 ? "teal" : h < 255 ? (l < 0.32 ? "navy" : "blue") : h < 290 ? "purple" : h < 330 ? "magenta" : "pink";
  if (l > 0.72 && base !== "gold") return `pale ${base}`;
  return l < 0.27 && !["brown", "navy", "black"].includes(base) ? `dark ${base}` : base;
}

function fontKind(spec: LookDef["fonts"]["heading"]): string {
  const fam = spec.family;
  if (/Condensed|Narrow|Compressed|Bebas|Anton|Oswald|Teko|Six Caps|League Gothic|Fjalla|Saira Extra|Big Shoulders/i.test(fam)) return "condensed";
  if (/Script|Pacifico|Caveat|Dancing|Lobster|Satisfy|Kaushan|Courgette|Sacramento|Yellowtail|Great Vibes/i.test(fam)) return "script";
  if (/Slab|Arvo|Bitter|Domine|Zilla|Alfa|Rockwell|Bree|Josefin Slab/i.test(fam)) return "slab";
  if (/Rounded|Varela|Nunito|Quicksand|Fredoka|Comfortaa|Baloo|Sniglet/i.test(fam)) return "rounded";
  const kind = (FONTS as Record<string, { kind: string }>)[spec.pkg]?.kind;
  if (kind === "display") return /Black|Fatface|Ultra|Bungee|Chango|Rubik Mono/i.test(fam) ? "heavy display" : "display";
  if (kind === "serif") return "serif";
  if (kind === "monospace") return "mono";
  return /serif/i.test(spec.fallback) && !/sans/i.test(spec.fallback) ? "serif" : "sans";
}

function describeLook(l: LookDef): string {
  const bg = hsl(l.palette.bg);
  const page = bg.l < 0.3 ? "dark page" : colorName(l.palette.bg) === "cream" ? "cream page" : "light page";
  return `${l.id} · ${l.name}: ${l.knobs.hero} opening, ${page}; primary ${colorName(l.palette.primary)}, accent ${colorName(l.palette.accent)}, headings ${colorName(l.palette.heading)}; headings ${l.fonts.heading.family} (${fontKind(l.fonts.heading)} ${l.headingWeight}), body ${l.fonts.body.family}; ${l.button} buttons, ${l.knobs.label} labels, ${l.knobs.card} cards, ${l.knobs.spacing} spacing. Photo direction: ${l.photoDirection}`;
}

/** The catalog a category's picks come from, as text the director reads: looks, layouts, recipes and every knob. */
export function catalogFor(category: CategoryId): string {
  const looks = Object.values(LOOKS).filter((l) => l.category === category);
  const knobs = DNA_KNOB_IDS.map((k) => `${k} (${DNA_LABELS[k].label}): ${(DNA_KNOBS[k] as readonly string[]).map((v) => `${v}=${(DNA_LABELS[k].values as Record<string, string>)[v]}`).join(", ")}`);
  return [
    "LOOKS (colors + fonts; id · name: description)",
    ...looks.map(describeLook),
    "",
    "LAYOUTS (page skeleton; id · name: description)",
    ...LAYOUT_IDS.map((id) => `${id} · ${LAYOUTS[id].name}: ${LAYOUTS[id].about}`),
    "",
    "RECIPES (named page structures for this category; id · name: description)",
    ...(RECIPES[category] ?? []).map((r) => `${r.id} · ${r.name}: ${r.about}`),
    "",
    "KNOBS (page structure; knob: value=meaning)",
    ...knobs,
  ].join("\n");
}

/* ---------- describing the business ---------- */

export interface DirectorInput {
  record: BusinessRecord;
  /** The category's looks (pack.looks) and the pack's best-fit look. */
  looks: string[];
  preferred?: string;
  /** Designs of other open leads in the category (prefer something else) and of paying clients plus the current design (never). */
  used: string[];
  taken: string[];
  /** The design this replaces, when the owner asked for another one. */
  current?: string;
  reviews: string[];
  editorialSummary?: string;
  hints: DnaHints;
  /** Seeds the knobs the director leaves open (the lead id, or lead id + time for a restyle). */
  seed: string;
  model?: string;
}

export interface DirectorResult {
  design: string;
  notes: DesignNotes;
  usage: { input: number; output: number };
  model: string;
  /** The ids the model returned before validation, for logs and tests. */
  raw: Pick;
}

function businessText(i: DirectorInput): string {
  const r = i.record;
  const names = (ids: string[]) => ids.map((d) => LOOKS[parseDesign(d).look]?.name ?? parseDesign(d).look);
  const usedNames = [...new Set(names(i.used.filter((d) => !i.taken.includes(d))))];
  const takenNames = [...new Set(i.taken.map((d) => `${LOOKS[parseDesign(d).look]?.name ?? parseDesign(d).look} (${layoutOf(d)} layout, ${parseDesign(d).dna?.hero ?? "stack"} opening)`))];
  const openings = [...new Set(i.used.map((d) => parseDesign(d).dna?.hero).filter(Boolean))];
  const cur = i.current ? parseDesign(i.current) : undefined;
  const photos = r.media.hero ? (r.media.hero.source === "google" ? "only a Google photo (cannot go live)" : "their own photo") : "none";
  const gallery = (r.media.gallery ?? []).filter((g) => g.source !== "google").length;
  const hours = r.hours && hasAnyHours(r.hours) ? JSON.stringify(r.hours).slice(0, 400) : "not given";
  const site = r.existingSite ? [r.existingSite.title, r.existingSite.description, ...(r.existingSite.headings ?? []).slice(0, 6)].filter(Boolean).join(" | ").slice(0, 500) : "";
  const lines = [
    `name: ${r.name}`,
    `category: ${r.category}; kind: ${r.typeLabel ?? r.variant}; variant: ${r.variant}`,
    `town: ${r.address.city}, ${r.address.state}${r.showStreetAddress && r.address.street ? " (storefront, street shown)" : " (service area, no street shown)"}`,
    r.foundedYear ? `since: ${r.foundedYear}` : "",
    r.ownershipTags.length ? `ownership: ${r.ownershipTags.join(", ")}` : "",
    `services: ${r.services.map((s) => s.name).slice(0, 14).join("; ") || "none listed yet"}`,
    r.reputation.rating ? `google rating: ${r.reputation.rating} from ${r.reputation.count ?? 0} reviews` : "google rating: none",
    `photos: hero ${photos}; ${gallery} owner gallery photo(s); logo ${r.media.logo ? "yes" : "no"}`,
    `hours: ${hours}`,
    r.links.booking || r.links.order || r.links.reserve ? `online: ${[r.links.booking && "booking", r.links.order && "ordering", r.links.reserve && "reservations"].filter(Boolean).join(", ")}` : "",
    r.proof && (r.proof.awards?.length || r.proof.memberships?.length || r.proof.stats?.length || r.proof.clients?.length) ? `owner proof: ${JSON.stringify(r.proof).slice(0, 300)}` : "",
    r.plans?.length ? `plans/memberships: ${r.plans.map((p) => p.name).join(", ")}` : "",
    r.ext.retail?.priceList?.sections?.length ? "has a live price list / inventory page" : "",
    r.ext.restaurant?.menu?.sections?.length ? "has a menu with items" : "",
    site ? `their current website says: ${site}` : "",
    i.editorialSummary ? `google's summary: ${i.editorialSummary}` : "",
    i.reviews.length ? `what reviews praise (background only):\n${i.reviews.slice(0, 5).map((t, n) => `  [${n + 1}] ${t.slice(0, 300)}`).join("\n")}` : "",
    `hints: ${i.hints.noPhoto ? "no owner photo, so open without one (statement, billboard or banner)" : "owner photo available"}${i.hints.proof ? "; owner proof given, show the proof band" : ""}`,
    cur ? `replacing: ${LOOKS[cur.look]?.name ?? cur.look} with a ${cur.dna?.hero ?? "stack"} opening (the owner wants something clearly different)` : "",
    takenNames.length ? `taken (never): ${takenNames.join(", ")}` : "",
    usedNames.length ? `in use nearby (prefer others): looks ${usedNames.join(", ")}${openings.length ? `; openings ${openings.join(", ")}` : ""}` : "",
    i.preferred ? `the pack's default fit: ${LOOKS[i.preferred]?.name ?? i.preferred}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}

/* ---------- validation: ids in, a real design id out ---------- */

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
const PHOTO_LESS: Array<Dna["hero"]> = ["statement", "billboard", "banner"];

/** Turns the model's answer into a design id that exists, honoring the hints and the taken list; pure, so tests can drive it. */
export function settlePick(pick: Pick, i: DirectorInput): { design: string; fixes: string[] } {
  const fixes: string[] = [];
  const category = i.record.category;
  const takenLooks = new Set(i.taken.map((d) => parseDesign(d).look));
  const okLook = (id: string | undefined): id is string => !!id && i.looks.includes(id) && !takenLooks.has(id);
  let look = okLook(pick.look) ? pick.look : pick.alsoGood.find(okLook);
  if (!look) {
    const free = i.looks.filter((l) => !takenLooks.has(l));
    look = (i.preferred && free.includes(i.preferred) ? i.preferred : free[hash(i.seed) % Math.max(1, free.length)]) ?? i.looks[0]!;
    fixes.push(`look ${pick.look} → ${look}`);
  } else if (look !== pick.look) fixes.push(`look ${pick.look} → ${look}`);
  let layout: LayoutId = (LAYOUT_IDS as string[]).includes(pick.layout) ? (pick.layout as LayoutId) : (LOOKS[look]?.layout ?? "classic");
  if (layout !== pick.layout) fixes.push(`layout ${pick.layout} → ${layout}`);
  // A client's layout stays theirs while other layouts are free.
  const takenLayouts = new Set(i.taken.map(layoutOf));
  if (takenLayouts.has(layout)) {
    const free = LAYOUT_IDS.filter((l) => !takenLayouts.has(l));
    if (free.length) {
      const own = LOOKS[look]?.layout;
      const next = own && free.includes(own) ? own : free[hash(`${i.seed}|layout`) % free.length]!;
      fixes.push(`layout ${layout} → ${next} (a client's)`);
      layout = next;
    }
  }
  const recipe = pick.recipe ? (RECIPES[category] ?? []).find((r) => r.id === pick.recipe) : undefined;
  if (pick.recipe && !recipe) fixes.push(`recipe ${pick.recipe} dropped`);
  const avoid = i.used.map((d) => parseDesign(d).dna).filter((d): d is Dna => !!d);
  const d: Dna = { ...pickDna(i.seed, category, { avoid, hints: i.hints }), ...(recipe?.dna ?? {}) };
  // Knobs the recipe or the model set on purpose; the rest came from the seed and give way in a conflict.
  const pinned = new Set<DnaKnob>(Object.keys(recipe?.dna ?? {}) as DnaKnob[]);
  for (const k of pick.knobs) {
    const knob = k.knob as DnaKnob;
    if (!(DNA_KNOB_IDS as string[]).includes(knob) || !(DNA_KNOBS[knob] as readonly string[]).includes(k.value)) {
      fixes.push(`knob ${k.knob}=${k.value} dropped`);
      continue;
    }
    (d as Record<string, string>)[knob] = k.value;
    pinned.add(knob);
  }
  // settleDna would quietly demote an asked-for value when a seeded knob clashes with it; move the seeded knob instead.
  if (pinned.has("strip") && d.strip === "marquee") {
    if (d.nav === "utility" && !pinned.has("nav")) d.nav = "bar";
    if (d.proof === "band" && !pinned.has("proof") && !i.hints.proof) d.proof = "inline";
  }
  if (pinned.has("align") && d.align === "center" && !pinned.has("hero") && !["stack", "cover", "statement", "banner", "billboard"].includes(d.hero)) d.hero = "banner";
  if (pinned.has("nav") && d.nav === "overlay" && !pinned.has("tone")) d.tone = "default";
  // The hints are facts about the business, so they win over taste: no owner photo means a type-led opening.
  if (i.hints.noPhoto && !PHOTO_LESS.includes(d.hero)) {
    d.hero = PHOTO_LESS[hash(`${i.seed}|hero`) % PHOTO_LESS.length]!;
    fixes.push(`hero → ${d.hero} (no owner photo)`);
  }
  if (i.hints.proof) d.proof = "band";
  // Nor does another site get a client's structure signature (opening, services, strip, headline): move the services knob.
  const takenSigs = new Set(i.taken.map((t) => parseDesign(t).dna).filter((t): t is Dna => !!t).map(dnaSignature));
  let settled = settleDna(d);
  const services = DNA_KNOBS.services as readonly Dna["services"][];
  for (let n = 1; n < services.length && takenSigs.has(dnaSignature(settled)); n++) {
    settled = settleDna({ ...d, services: services[(services.indexOf(d.services) + n) % services.length]! });
    if (!takenSigs.has(dnaSignature(settled))) fixes.push(`services → ${settled.services} (a client has that structure)`);
  }
  return { design: designId(look, layout, settled), fixes };
}

/* ---------- the call ---------- */

export async function directDesign(client: Anthropic, i: DirectorInput): Promise<DirectorResult> {
  const model = i.model ?? DEFAULT_DESIGN_MODEL;
  const res = await client.beta.messages.parse({
    model,
    max_tokens: 2000,
    system: [
      { type: "text", text: SYSTEM },
      // The catalog is the same for every business in a category, so it is cached across a run.
      { type: "text", text: `<catalog category="${i.record.category}">\n${catalogFor(i.record.category)}\n</catalog>`, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: `<business>\n${businessText(i)}\n</business>\n\nPick the design for this business.` }],
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(Schema) },
  });
  if (res.stop_reason === "refusal") throw new Error(`Design request for ${i.record.name} was declined`);
  if (!res.parsed_output) throw new Error(`Design pick for ${i.record.name} didn't match the schema (stop: ${res.stop_reason})`);
  const raw = res.parsed_output;
  const { design, fixes } = settlePick(raw, i);
  const clean = (s: string, max: number) => s.replace(/\s+/g, " ").trim().slice(0, max);
  const notes: DesignNotes = {
    concept: clean(raw.concept, 90) || "Designed for the business",
    why: clean(raw.why, 260),
    copyNotes: clean(raw.copyNotes, 240) || undefined,
    model: `${model}/v${DESIGN_PROMPT_VERSION}`,
    at: new Date().toISOString().slice(0, 16).replace("T", " "),
    fixes: fixes.length ? fixes : undefined,
  };
  return { design, notes, usage: { input: res.usage.input_tokens, output: res.usage.output_tokens }, model, raw };
}

/** For tests and the design sheet: the layout a settled design uses. */
export { layoutOf };
