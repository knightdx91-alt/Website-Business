import { layoutOf } from "../generator/design.ts";
import { parseDesign } from "../generator/themes.ts";
import type { Env } from "./env.ts";

/**
 * A paying client's design is theirs alone (owner's rule, Oct 2026). "Design" means the look (colors + fonts) first of all,
 * and the layout and page structure as far as other options remain. Three places enforce it:
 *  - the pickers (`pickDesign`, the art director's `settlePick`) never hand out a sold or live client's look, layout or
 *    structure signature while an alternative exists, and the app's look pickers show those looks as sold;
 *  - `/edits` refuses a look that belongs to another client;
 *  - when a lead becomes sold or live (`lockDesign`), every open lead in the category that shares its look is queued for a
 *    new design, so no prospect is ever shown a site in a client's colors.
 */

export interface SoldDesign {
  id: string;
  name: string;
  look: string;
}

/** Designs of sold and live clients in a category (not expired), optionally leaving one lead out (itself). */
export async function soldDesigns(env: Env, category: string, exceptId?: string): Promise<SoldDesign[]> {
  const rows = await env.DB.prepare(
    "SELECT id, name, look FROM leads WHERE category = ? AND look IS NOT NULL AND sales_status IN ('sold', 'live') AND status != 'expired'",
  )
    .bind(category)
    .all<SoldDesign>();
  return rows.results.filter((r) => r.id !== exceptId);
}

/** The client whose look (colors + fonts) a design id uses, if any. */
export function lookOwner(sold: SoldDesign[], design: string): SoldDesign | undefined {
  const base = parseDesign(design).look;
  return sold.find((s) => parseDesign(s.look).look === base);
}

/** Whether two designs share the look, or the layout: what another business would notice. */
export function sameDesignFamily(a: string, b: string): { look: boolean; layout: boolean } {
  return { look: parseDesign(a).look === parseDesign(b).look, layout: layoutOf(a) === layoutOf(b) };
}

/**
 * Called when a lead becomes sold or live: open leads (new / shown) in the same category whose look matches get a
 * `restyle` job, which gives each a new design (the art director with the client's design listed as taken) and tells the
 * team why. Returns the ids queued. Leads that are themselves sold or live are never touched.
 */
export async function lockDesign(env: Env, lead: { id: string; category: string; look: string | null; name?: string | null }): Promise<string[]> {
  if (!lead.look) return [];
  const base = parseDesign(lead.look).look;
  const rows = await env.DB.prepare(
    "SELECT id, name, look FROM leads WHERE category = ? AND id != ? AND look IS NOT NULL AND sales_status IN ('new', 'shown') AND status != 'expired'",
  )
    .bind(lead.category, lead.id)
    .all<SoldDesign>();
  const sharing = rows.results.filter((r) => parseDesign(r.look).look === base);
  for (const r of sharing) await env.JOBS.send({ type: "restyle", leadId: r.id, because: lead.id });
  return sharing.map((r) => r.id);
}
