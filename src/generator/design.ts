import { pickDna } from "./dna.ts";
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
 * Picks a look + layout for a new site so sites in the same category don't all match:
 * never a design a paying client already has, then the combination used least, then the
 * look and layout used least on their own. Ties break on the lead id, so a batch built at
 * the same moment still spreads out. The best-fit look for the business wins a tie.
 */
export function pickDesign(o: { leadId: string; looks: string[]; used: string[]; taken: string[]; preferred?: string }): string {
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
  const taken = new Set(o.taken.map((d) => designId(parseDesign(d).look, layoutOf(d))));
  const takenLooks = new Set(o.taken.map((d) => parseDesign(d).look));
  const options = o.looks.flatMap((look) => LAYOUT_IDS.map((layout) => designId(look, layout))).filter((d) => !taken.has(d));
  if (!options.length) return designId(o.looks[0]!, LOOKS[o.looks[0]!]?.layout);
  const score = (d: string) => {
    const { look } = parseDesign(d);
    const layout = layoutOf(d);
    // The pack's best-fit look (and that look's own layout) wins ties, so a screen printer starts with the shirt-shop look.
    const fit = (look === o.preferred ? -0.6 : 0) + (look === o.preferred && layout === LOOKS[look]?.layout ? -0.3 : 0);
    return (combo.get(d) ?? 0) * 1000 + (takenLooks.has(look) ? 100 : 0) + (byLook.get(look) ?? 0) * 3 + (byLayout.get(layout) ?? 0) * 2 + fit;
  };
  const best = options.sort((a, b) => score(a) - score(b) || hash(o.leadId + a) - hash(o.leadId + b))[0]!;
  // Page structure (DNA) comes from the lead id, avoiding structures already in use in the category.
  const look = parseDesign(best).look;
  const category = look.split(".")[0] as CategoryId;
  const avoid = o.used.map((d) => parseDesign(d).dna).filter((d): d is NonNullable<typeof d> => !!d);
  return designId(look, layoutOf(best), pickDna(o.leadId, category, { avoid }));
}
