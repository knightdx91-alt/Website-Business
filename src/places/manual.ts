import { NORTH_AL_TOWNS } from "../generator/geo.ts";
import { normalizeUsPhone } from "../generator/phone.ts";
import type { Place } from "./client.ts";

/**
 * Businesses that aren't on Google Maps (VIP Rents, Oct 2026). The team types in what they know and we build a stand-in
 * `Place` from it, so the rest of the pipeline (placeToRecord, the build, recategorize) works unchanged. Its id starts
 * with `manual:`; nothing in it came from Google, so it never expires and nothing tries to refresh it from Places.
 */
export const MANUAL_PREFIX = "manual:";

export const isManualPlaceId = (id: string | null | undefined): boolean => !!id && id.startsWith(MANUAL_PREFIX);

export interface ManualBusiness {
  name: string;
  phone: string;
  town: string;
  street?: string;
  zip?: string;
  /** What they do, in a few words ("Party & event rentals"); becomes the site's label. */
  kind?: string;
  /** Their Facebook page or other web page, if any. */
  web?: string;
  /** They go to the customer (no storefront): the site shows a service area instead of a street. */
  comesToCustomers?: boolean;
}

/** The town's center from our North Alabama list (case-insensitive), else Cullman's. */
export function townCenter(town: string): { lat: number; lng: number; name: string } {
  const t = town.trim().toLowerCase().replace(/,?\s*(al|alabama)$/i, "").trim();
  const hit = NORTH_AL_TOWNS.find((x) => x.name.toLowerCase() === t);
  return hit ?? { ...NORTH_AL_TOWNS[0]!, name: town.trim().replace(/,?\s*(al|alabama)$/i, "").trim() || "Cullman" };
}

/** Title-cases a typed town ("good hope" → "Good Hope"); our known towns keep their spelling. */
function townName(town: string): string {
  const c = townCenter(town);
  return c.name.replace(/\b[a-z]/g, (m) => m.toUpperCase());
}

export function manualPlace(id: string, b: ManualBusiness): Place {
  const phone = normalizeUsPhone(b.phone);
  if (!phone) throw new Error("That doesn't look like a 10-digit US phone number.");
  const city = townName(b.town);
  const center = townCenter(b.town);
  const street = b.street?.trim() || undefined;
  const m = street?.match(/^(\d+[A-Za-z]?)\s+(.+)$/);
  const zip = b.zip?.trim().match(/^\d{5}$/) ? b.zip!.trim() : undefined;
  const components: NonNullable<Place["addressComponents"]> = [
    ...(m ? [{ longText: m[1]!, shortText: m[1]!, types: ["street_number"] }, { longText: m[2]!, shortText: m[2]!, types: ["route"] }] : street ? [{ longText: street, shortText: street, types: ["route"] }] : []),
    { longText: city, shortText: city, types: ["locality"] },
    { longText: "Alabama", shortText: "AL", types: ["administrative_area_level_1"] },
    ...(zip ? [{ longText: zip, shortText: zip, types: ["postal_code"] }] : []),
  ];
  const formatted = [street, city, `AL${zip ? ` ${zip}` : ""}`].filter(Boolean).join(", ");
  const web = b.web?.trim();
  return {
    id: `${MANUAL_PREFIX}${id}`,
    displayName: { text: b.name.trim() },
    nationalPhoneNumber: phone.display,
    formattedAddress: formatted,
    addressComponents: components,
    location: { latitude: center.lat, longitude: center.lng },
    types: [],
    businessStatus: "OPERATIONAL",
    ...(b.kind?.trim() ? { primaryTypeDisplayName: { text: b.kind.trim() } } : {}),
    ...(web && /^https?:\/\//i.test(web) ? { websiteUri: web } : {}),
    googleMapsUri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${b.name.trim()}, ${formatted}`)}`,
    ...(b.comesToCustomers || !street ? { pureServiceAreaBusiness: true } : {}),
  } as Place;
}
