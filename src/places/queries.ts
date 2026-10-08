import type { CategoryId } from "../generator/types.ts";

export const MARKET = { name: "Cullman, AL", center: { lat: 34.1748, lng: -86.8436 }, radiusMeters: 30_000 };

/** Search phrases per category. Each runs as its own Places text search. */
export const QUERIES: Partial<Record<CategoryId, string[]>> = {
  restaurant: ["restaurants in Cullman, AL", "barbecue in Cullman, AL", "mexican restaurant in Cullman, AL", "cafe in Cullman, AL"],
  contractor: [
    "plumber in Cullman, AL",
    "heating and air conditioning in Cullman, AL",
    "electrician in Cullman, AL",
    "roofing contractor in Cullman, AL",
  ],
};

export const CATEGORY_LABELS: Partial<Record<CategoryId, string>> = {
  restaurant: "Restaurants & cafes",
  contractor: "Contractors",
};
