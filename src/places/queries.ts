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
  salon: ["hair salon in Cullman, AL", "barber shop in Cullman, AL", "beauty salon in Cullman, AL"],
  auto: ["auto repair in Cullman, AL", "mechanic in Cullman, AL", "tire shop in Cullman, AL", "transmission repair in Cullman, AL"],
  landscaping: ["landscaping in Cullman, AL", "lawn care service in Cullman, AL", "lawn mowing service in Cullman, AL"],
  cleaning: ["house cleaning service in Cullman, AL", "cleaning service in Cullman, AL", "janitorial service in Cullman, AL"],
};

export const CATEGORY_LABELS: Partial<Record<CategoryId, string>> = {
  restaurant: "Restaurants & cafes",
  contractor: "Contractors",
  salon: "Salons & barbers",
  auto: "Auto repair",
  landscaping: "Landscaping & lawn",
  cleaning: "Cleaning services",
};
