import type { BusinessRecord } from "../generator/types.ts";
import { searchText } from "../places/client.ts";
import type { Env } from "./env.ts";

/**
 * After Edit changed the address (the business moved): look the new address up once so the map pin, the walk-in route and the
 * site's structured data follow it. One Places text search; on any failure the old coordinates stay (the address text still
 * changed, and directions use it).
 */
export async function relocate(env: Env, leadId: string, before: BusinessRecord, after: BusinessRecord): Promise<void> {
  const a = after.address;
  const b = before.address;
  if (!after.addressEdited || (a.street === b.street && a.city === b.city && a.zip === b.zip)) return;
  if (!env.GOOGLE_PLACES_API_KEY) return;
  try {
    const query = [a.street, a.city, `${a.state} ${a.zip ?? ""}`.trim()].filter(Boolean).join(", ");
    const [hit] = await searchText(env.GOOGLE_PLACES_API_KEY, { textQuery: query, center: after.geo, radiusMeters: 50_000, maxPages: 1 });
    const loc = (hit as { location?: { latitude: number; longitude: number } } | undefined)?.location;
    if (!loc) return;
    after.geo = { lat: loc.latitude, lng: loc.longitude };
    await env.DB.prepare("UPDATE leads SET lat = ?, lng = ? WHERE id = ?").bind(loc.latitude, loc.longitude, leadId).run();
  } catch {
    /* keep the old pin */
  }
}
