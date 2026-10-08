import { townsWithin } from "../generator/geo.ts";
import { autoVariant, seedAutoServices } from "../generator/packs/auto.ts";
import { cleaningVariant, seedCleaningServices } from "../generator/packs/cleaning.ts";
import { contractorTrade, seedServices } from "../generator/packs/contractor.ts";
import { landscapingVariant, seedLandscapingServices } from "../generator/packs/landscaping.ts";
import { salonVariant, seedSalonServices } from "../generator/packs/salon.ts";
import { restaurantVariant } from "../generator/packs/restaurant.ts";
import { normalizeUsPhone } from "../generator/phone.ts";
import type { BusinessRecord, CategoryId, Hours, Interval, RestaurantExt } from "../generator/types.ts";
import type { Place, PlacePeriodPoint } from "./client.ts";
import { webPresence } from "./qualify.ts";

const pad = (n: number) => String(n).padStart(2, "0");
const hhmm = (p: PlacePeriodPoint) => `${pad(p.hour)}:${pad(p.minute)}`;

export function hoursFromPlaces(periods: NonNullable<Place["regularOpeningHours"]>["periods"]): Hours | undefined {
  if (!periods?.length) return undefined;
  if (periods.length === 1 && !periods[0]!.close && periods[0]!.open.hour === 0 && periods[0]!.open.minute === 0) {
    return { weekly: [[], [], [], [], [], [], []], open24_7: true };
  }
  const weekly: Interval[][] = [[], [], [], [], [], [], []];
  for (const p of periods) {
    if (!p.close) continue;
    let close = hhmm(p.close);
    if (p.close.day !== p.open.day && close === "00:00") close = "24:00";
    weekly[p.open.day]!.push({ open: hhmm(p.open), close });
  }
  for (const day of weekly) day.sort((a, b) => a.open.localeCompare(b.open));
  return { weekly };
}

function component(p: Place, type: string, short = false): string | undefined {
  const c = p.addressComponents?.find((a) => a.types.includes(type));
  return c ? (short ? c.shortText : c.longText) : undefined;
}

const PRICE: Record<string, 1 | 2 | 3 | 4> = {
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

const FLAG_KEYS = [
  "dineIn", "takeout", "delivery", "curbsidePickup", "reservable", "servesBreakfast", "servesBrunch", "servesLunch",
  "servesDinner", "servesBeer", "servesWine", "servesCocktails", "servesCoffee", "servesDessert", "servesVegetarianFood",
  "outdoorSeating", "liveMusic", "menuForChildren", "goodForGroups", "allowsDogs",
] as const;

function restaurantExt(p: Place): RestaurantExt {
  const so: RestaurantExt["serviceOptions"] = {};
  for (const k of FLAG_KEYS) if (typeof p[k] === "boolean") so[k] = p[k] as boolean;
  const access = p.accessibilityOptions as { wheelchairAccessibleEntrance?: boolean } | undefined;
  if (typeof access?.wheelchairAccessibleEntrance === "boolean") so.wheelchairAccessibleEntrance = access.wheelchairAccessibleEntrance;
  return { serviceOptions: so, priceLevel: p.priceLevel ? PRICE[p.priceLevel] : undefined };
}

/** Builds an unconfirmed record from a Places result. Everything here is a draft the owner confirms. */
export function placeToRecord(p: Place, category: CategoryId): BusinessRecord {
  const rawName = p.displayName?.text ?? "";
  const cityName = component(p, "locality") ?? "";
  // Google often appends the branch town, e.g. "Buenavista Mexican Cantina (Cullman)".
  // Also drops keyword-stuffed tails like "Cafe Tula Taquería | Mexican".
  const trimmed = rawName.replace(/\s+\|.*$/, "");
  const name = (cityName ? trimmed.replace(new RegExp(`\\s*[(-]\\s*${cityName}\\s*\\)?\\s*$`, "i"), "") : trimmed).trim() || rawName;
  const phone = normalizeUsPhone(p.nationalPhoneNumber ?? p.internationalPhoneNumber ?? "");
  if (!phone) throw new Error(`${name}: no usable US phone number`);
  const geo = { lat: p.location?.latitude ?? 0, lng: p.location?.longitude ?? 0 };
  const streetNo = component(p, "street_number");
  const route = component(p, "route");
  const city = component(p, "locality") ?? component(p, "postal_town") ?? "Cullman";
  const county = component(p, "administrative_area_level_2")?.replace(/ County$/, "");
  const types = p.types ?? [];
  const social: BusinessRecord["links"]["social"] = {};
  if (webPresence(p.websiteUri) === "social" && p.websiteUri) {
    const host = new URL(p.websiteUri).hostname;
    if (/facebook|fb\./.test(host)) social.facebook = p.websiteUri;
    else if (/instagram/.test(host)) social.instagram = p.websiteUri;
    else if (/tiktok/.test(host)) social.tiktok = p.websiteUri;
    else if (/nextdoor/.test(host)) social.nextdoor = p.websiteUri;
  }

  const base: BusinessRecord = {
    placeId: p.id,
    name,
    category,
    variant: "other",
    businessStatus: p.businessStatus ?? "UNKNOWN",
    phone,
    smsEnabled: false,
    address: {
      street: streetNo && route ? `${streetNo} ${route}` : route,
      city,
      state: component(p, "administrative_area_level_1", true) ?? "AL",
      zip: component(p, "postal_code"),
      county,
    },
    showStreetAddress: true,
    geo,
    timezone: "America/Chicago",
    mapsUrl: p.googleMapsUri ?? `https://www.google.com/maps/place/?q=place_id:${p.id}`,
    hours: hoursFromPlaces(p.regularOpeningHours?.periods),
    ownershipTags: [],
    licenses: [],
    services: [],
    offers: [],
    testimonials: [],
    links: { social },
    media: { gallery: [] },
    reputation: { rating: p.rating, count: p.userRatingCount, displayMode: "link_only" },
    ext: {},
    confirmed: [],
  };

  if (category === "restaurant") {
    return { ...base, variant: restaurantVariant(p.primaryType, types, name), ext: { restaurant: restaurantExt(p) } };
  }
  if (category === "contractor") {
    const trade = contractorTrade(p.primaryType, types, name);
    return {
      ...base,
      variant: trade,
      showStreetAddress: false,
      services: seedServices(trade),
      serviceArea: { towns: townsWithin(geo, 25, 10), counties: county ? [county] : [] },
      ext: { contractor: { residential: true } },
    };
  }
  if (category === "salon") {
    const variant = salonVariant(p.primaryType, types, name);
    return { ...base, variant, services: seedSalonServices(variant), ext: { salon: {} } };
  }
  if (category === "auto") {
    const variant = autoVariant(p.primaryType, types, name);
    return {
      ...base,
      variant,
      services: seedAutoServices(variant),
      serviceArea: { towns: townsWithin(geo, 20, 8), counties: county ? [county] : [] },
      confirmed: [],
      ext: { auto: {} },
    };
  }
  if (category === "landscaping" || category === "cleaning") {
    const variant = category === "landscaping" ? landscapingVariant(p.primaryType, types, name) : cleaningVariant(p.primaryType, types, name);
    return {
      ...base,
      variant,
      showStreetAddress: false,
      services: category === "landscaping" ? seedLandscapingServices(variant) : seedCleaningServices(variant),
      serviceArea: { towns: townsWithin(geo, 25, 10), counties: county ? [county] : [] },
      ext: category === "landscaping" ? { landscaping: {} } : { cleaning: { commercial: variant === "commercial" } },
    };
  }
  throw new Error(`Category ${category} not supported yet`);
}

/** Review text is private AI context and a lint input. It is never rendered. */
export function reviewTexts(p: Place): string[] {
  return (p.reviews ?? []).map((r) => r.text?.text ?? "").filter((t) => t.length > 0);
}
