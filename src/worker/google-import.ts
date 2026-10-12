import { hoursFromPlaces, restaurantExt } from "../places/to-record.ts";
import type { Place } from "../places/client.ts";
import { normalizeUsPhone } from "../generator/phone.ts";
import type { BusinessRecord, Image } from "../generator/types.ts";

/** Preview-only Google gallery photos live at /assets/img/google-<n>.jpg (n = the index in place.photos); the preview route
 *  proxies them live, nothing is stored, and publish mode leaves them out. */
export const GOOGLE_GALLERY_PREFIX = "/assets/img/google-";
export const isGooglePhoto = (p: { source?: string } | undefined): boolean => !!p && p.source === "google";

/** Extra Place Details fields the Google import reads (same price tier as the reviews we already fetch). */
export const GOOGLE_IMPORT_FIELDS = ["paymentOptions", "parkingOptions", "accessibilityOptions"];

const PAY: Array<[string, string]> = [
  ["acceptsCashOnly", "Cash only"],
  ["acceptsCreditCards", "Credit cards"],
  ["acceptsDebitCards", "Debit cards"],
  ["acceptsNfc", "Tap to pay"],
];
const PARK: Array<[string, string]> = [
  ["freeParkingLot", "Free parking lot"],
  ["freeStreetParking", "Free street parking"],
  ["freeGarageParking", "Free garage parking"],
  ["paidParkingLot", "Paid parking lot"],
  ["paidStreetParking", "Paid street parking"],
  ["paidGarageParking", "Paid garage parking"],
  ["valetParking", "Valet parking"],
];

function flags(obj: unknown, table: Array<[string, string]>): string[] {
  const o = (obj ?? {}) as Record<string, unknown>;
  const out = table.filter(([k]) => o[k] === true).map(([, l]) => l);
  // "Cash only" says it all; the card lines would contradict it.
  return out.includes("Cash only") ? ["Cash only"] : out;
}

/** Every photo on the Google listing (up to the 10 Places returns) as preview-only gallery photos, after the owner's own.
 *  Replaces any Google photos imported before; skips the one already used as the hero; never for churches (people, children). */
export function galleryFromPlace(record: BusinessRecord, place: Place): number {
  const own = record.media.gallery.filter((p) => !isGooglePhoto(p));
  if (record.category === "church") {
    record.media.gallery = own;
    return 0;
  }
  const photos = place.photos ?? [];
  const start = record.media.hero?.source === "google" ? 1 : 0;
  const room = Math.max(0, 24 - own.length);
  const imgs: Image[] = photos.slice(start, start + room).map((photo, k) => {
    const w = Math.min(photo.widthPx, 1600);
    const author = photo.authorAttributions?.[0];
    return {
      src: `${GOOGLE_GALLERY_PREFIX}${start + k}.jpg`,
      alt: "",
      source: "google",
      width: w,
      height: Math.round((w / photo.widthPx) * photo.heightPx),
      attribution: author ? { name: author.displayName, uri: author.uri } : undefined,
    };
  });
  record.media.gallery = [...own, ...imgs];
  return imgs.length;
}

/** "Import from their Google page": pull the listing's latest facts into the record without touching anything the owner
 *  confirmed or typed. Returns plain words for what changed, for the toast and the alert. */
export function refreshFromPlace(record: BusinessRecord, place: Place): string[] {
  const changed: string[] = [];
  const confirmed = new Set(record.confirmed ?? []);
  const phone = normalizeUsPhone(place.nationalPhoneNumber ?? place.internationalPhoneNumber ?? "");
  if (phone && phone.e164 !== record.phone.e164 && !confirmed.has("phone")) {
    record.phone = phone;
    changed.push("phone");
  }
  const hours = hoursFromPlaces(place.regularOpeningHours?.periods);
  if (hours && !confirmed.has("hours") && JSON.stringify(hours) !== JSON.stringify(record.hours ?? null)) {
    record.hours = hours;
    changed.push("hours");
  }
  const rating = place.rating;
  const count = place.userRatingCount;
  if ((rating != null && rating !== record.reputation.rating) || (count != null && count !== record.reputation.count)) {
    record.reputation = { ...record.reputation, rating: rating ?? record.reputation.rating, count: count ?? record.reputation.count };
    changed.push("Google rating");
  }
  const label = place.primaryTypeDisplayName?.text;
  if (label && label !== record.typeLabel) {
    record.typeLabel = label;
    changed.push("business type");
  }
  if (record.category === "restaurant") {
    const fresh = restaurantExt(place);
    const x = (record.ext.restaurant = record.ext.restaurant ?? { serviceOptions: {} });
    const before = JSON.stringify(x.serviceOptions);
    x.serviceOptions = { ...x.serviceOptions, ...fresh.serviceOptions };
    if (fresh.priceLevel && !x.priceLevel) x.priceLevel = fresh.priceLevel;
    if (JSON.stringify(x.serviceOptions) !== before) changed.push("service options");
  }
  const pay = flags(place.paymentOptions, PAY);
  if (pay.length && !(record.visit?.paymentMethods?.length)) {
    record.visit = { ...(record.visit ?? {}), paymentMethods: pay };
    changed.push("ways to pay");
  }
  const park = flags(place.parkingOptions, PARK);
  if (park.length && !record.visit?.parking) {
    record.visit = { ...(record.visit ?? {}), parking: park.join(", ") };
    changed.push("parking");
  }
  const site = place.websiteUri ?? "";
  const social = record.links.social as Record<string, string | undefined>;
  for (const [host, key] of [["facebook.com", "facebook"], ["instagram.com", "instagram"]] as const) {
    if (site.includes(host) && !social[key]) {
      social[key] = site;
      changed.push(key === "facebook" ? "Facebook page" : "Instagram page");
    }
  }
  record.googleImportedAt = new Date().toISOString();
  return changed;
}
