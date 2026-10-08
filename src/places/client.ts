/** Google Places API (New). Uses fetch only, so it runs in Node and Cloudflare Workers. */

export interface PlacePhoto {
  name: string;
  widthPx: number;
  heightPx: number;
  authorAttributions?: Array<{ displayName: string; uri?: string; photoUri?: string }>;
}

export interface PlacePeriodPoint {
  day: number;
  hour: number;
  minute: number;
}

export interface Place {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  addressComponents?: Array<{ longText: string; shortText: string; types: string[] }>;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  location?: { latitude: number; longitude: number };
  regularOpeningHours?: { periods?: Array<{ open: PlacePeriodPoint; close?: PlacePeriodPoint }> };
  businessStatus?: string;
  primaryType?: string;
  primaryTypeDisplayName?: { text: string };
  types?: string[];
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  websiteUri?: string;
  photos?: PlacePhoto[];
  priceLevel?: string;
  editorialSummary?: { text: string };
  reviews?: Array<{ text?: { text: string }; rating?: number }>;
  [flag: string]: unknown;
}

const BASE_FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "addressComponents",
  "nationalPhoneNumber",
  "internationalPhoneNumber",
  "location",
  "regularOpeningHours",
  "businessStatus",
  "primaryType",
  "primaryTypeDisplayName",
  "types",
  "rating",
  "userRatingCount",
  "googleMapsUri",
  "websiteUri",
  "photos",
  "editorialSummary",
  "reviews",
];

export const RESTAURANT_FLAGS = [
  "priceLevel",
  "dineIn",
  "takeout",
  "delivery",
  "curbsidePickup",
  "reservable",
  "servesBreakfast",
  "servesBrunch",
  "servesLunch",
  "servesDinner",
  "servesBeer",
  "servesWine",
  "servesCocktails",
  "servesCoffee",
  "servesDessert",
  "servesVegetarianFood",
  "outdoorSeating",
  "liveMusic",
  "menuForChildren",
  "goodForGroups",
  "allowsDogs",
  "accessibilityOptions",
];

export interface SearchOptions {
  textQuery: string;
  center: { lat: number; lng: number };
  radiusMeters: number;
  extraFields?: string[];
  maxPages?: number;
}

export class PlacesError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Text Search (New), following nextPageToken up to maxPages (20 results per page). */
export async function searchText(apiKey: string, o: SearchOptions): Promise<Place[]> {
  const fields = [...BASE_FIELDS, ...(o.extraFields ?? [])].map((f) => `places.${f}`);
  const out: Place[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < (o.maxPages ?? 3); page++) {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": [...fields, "nextPageToken"].join(","),
      },
      body: JSON.stringify({
        textQuery: o.textQuery,
        pageSize: 20,
        pageToken,
        locationBias: { circle: { center: { latitude: o.center.lat, longitude: o.center.lng }, radius: o.radiusMeters } },
      }),
    });
    const body = (await res.json()) as { places?: Place[]; nextPageToken?: string; error?: { message: string } };
    if (!res.ok) throw new PlacesError(res.status, body.error?.message ?? `Places search failed (${res.status})`);
    out.push(...(body.places ?? []));
    pageToken = body.nextPageToken;
    if (!pageToken) break;
  }
  return out;
}

/** Fetches photo bytes for previews. Google photos may not be re-hosted on published sites. */
export async function fetchPhoto(apiKey: string, photoName: string, maxWidthPx = 1600): Promise<{ bytes: Uint8Array; contentType: string }> {
  const url = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidthPx}&key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) throw new PlacesError(res.status, `Photo fetch failed (${res.status})`);
  return { bytes: new Uint8Array(await res.arrayBuffer()), contentType: res.headers.get("content-type") ?? "image/jpeg" };
}
