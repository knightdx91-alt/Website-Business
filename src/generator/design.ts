import { dnaSignature, pickDna, type Dna, type DnaHints } from "./dna.ts";
import { LAYOUT_IDS, type LayoutId } from "./layouts.ts";
import type { CategoryId } from "./types.ts";
import { designId, LOOKS, parseDesign } from "./themes.ts";

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** The layout a design uses, falling back to its look's default. */
export function layoutOf(design: string): LayoutId {
  const { look, layout } = parseDesign(design);
  return layout ?? LOOKS[look]?.layout ?? "classic";
}

/**
 * Picks a look + layout for a new site so sites in the same category don't all match, and so a paying
 * client's design stays theirs: nothing in `taken` (sold or live clients' designs, plus the design being
 * replaced) comes back while an alternative exists. The look is excluded outright, the layout and the
 * structure's signature too while other layouts and structures remain; among what is left, the
 * combination used least wins, then the look and layout used least on their own. Ties break on the lead
 * id, so a batch built at the same moment still spreads out. The pack's best-fit look wins a tie.
 */
export function pickDesign(o: { leadId: string; looks: string[]; used: string[]; taken: string[]; preferred?: string; hints?: DnaHints }): string {
  const combo = new Map<string, number>();
  const byLook = new Map<string, number>();
  const byLayout = new Map<string, number>();
  const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
  for (const d of o.used) {
    const look = parseDesign(d).look;
    const layout = layoutOf(d);
    bump(combo, designId(look, layout));
    bump(byLook, look);
    bump(byLayout, layout);
  }
  const takenLooks = new Set(o.taken.map((d) => parseDesign(d).look));
  const takenLayouts = new Set(o.taken.map(layoutOf));
  const takenSigs = new Set(o.taken.map((d) => parseDesign(d).dna).filter((d): d is Dna => !!d).map(dnaSignature));
  // A client's look is theirs alone; their layout too while other layouts are free. Only when every option is gone
  // (a category with 25 paying clients) does the spread fall back to sharing, the exact combination still excluded.
  const freeLooks = o.looks.filter((l) => !takenLooks.has(l));
  const looks = freeLooks.length ? freeLooks : o.looks;
  const freeLayouts = LAYOUT_IDS.filter((l) => !takenLayouts.has(l));
  const layouts = freeLayouts.length ? freeLayouts : LAYOUT_IDS;
  const takenCombos = new Set(o.taken.map((d) => designId(parseDesign(d).look, layoutOf(d))));
  let options = looks.flatMap((look) => layouts.map((layout) => designId(look, layout))).filter((d) => !takenCombos.has(d));
  if (!options.length) options = looks.flatMap((look) => LAYOUT_IDS.map((layout) => designId(look, layout)));
  const score = (d: string) => {
    const { look } = parseDesign(d);
    const layout = layoutOf(d);
    // The pack's best-fit look (and that look's own layout) wins ties, so a screen printer starts with the shirt-shop look.
    const fit = (look === o.preferred ? -0.6 : 0) + (look === o.preferred && layout === LOOKS[look]?.layout ? -0.3 : 0);
    return (combo.get(d) ?? 0) * 1000 + (takenLooks.has(look) ? 100 : 0) + (byLook.get(look) ?? 0) * 3 + (byLayout.get(layout) ?? 0) * 2 + fit;
  };
  const best = options.sort((a, b) => score(a) - score(b) || hash(o.leadId + a) - hash(o.leadId + b))[0]!;
  // Page structure (DNA) comes from the lead id, avoiding structures already in use in the category and never a client's.
  const look = parseDesign(best).look;
  const category = look.split(".")[0] as CategoryId;
  const avoid = [...o.used, ...o.taken].map((d) => parseDesign(d).dna).filter((d): d is Dna => !!d);
  let dna = pickDna(o.leadId, category, { avoid, hints: o.hints });
  for (let i = 1; i <= 12 && takenSigs.has(dnaSignature(dna)); i++) dna = pickDna(`${o.leadId}#${i}`, category, { avoid, hints: o.hints });
  return designId(look, layoutOf(best), dna);
}
