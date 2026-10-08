import { LAYOUT_IDS, type LayoutId } from "./layouts.ts";
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
 * the same moment still spreads out.
 */
export function pickDesign(o: { leadId: string; looks: string[]; used: string[]; taken: string[] }): string {
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
    return (combo.get(d) ?? 0) * 1000 + (takenLooks.has(look) ? 100 : 0) + (byLook.get(look) ?? 0) * 3 + (byLayout.get(layout) ?? 0) * 2;
  };
  return options.sort((a, b) => score(a) - score(b) || hash(o.leadId + a) - hash(o.leadId + b))[0]!;
}
