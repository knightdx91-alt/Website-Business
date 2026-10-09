import type { CategoryId } from "../generator/types.ts";

export const MARKET = { name: "Cullman, AL", center: { lat: 34.1748, lng: -86.8436 }, radiusMeters: 30_000 };

/** Nearby towns searched when a run asks for the wider area (each with its own search center). */
export const WIDER_TOWNS = [
  { name: "Hartselle, AL", lat: 34.4434, lng: -86.9353 },
  { name: "Arab, AL", lat: 34.3281, lng: -86.4958 },
  { name: "Hanceville, AL", lat: 34.0607, lng: -86.7675 },
  { name: "Good Hope, AL", lat: 34.1157, lng: -86.8636 },
  { name: "Vinemont, AL", lat: 34.2465, lng: -86.8661 },
];
const TOWN_RADIUS = 12_000;

/** What the owner picks at Run. Several groups can share one category pack (template). */
export interface SearchGroup {
  id: string;
  label: string;
  category: CategoryId;
  terms: string[];
}

export const SEARCH_GROUPS: SearchGroup[] = [
  { id: "restaurant", label: "Restaurants & cafes", category: "restaurant", terms: ["restaurants", "barbecue", "mexican restaurant", "cafe", "pizza"] },
  { id: "sweets", label: "Bakeries, coffee & sweets", category: "restaurant", terms: ["bakery", "coffee shop", "donut shop", "ice cream shop"] },
  { id: "food_truck", label: "Food trucks", category: "restaurant", terms: ["food truck"] },
  { id: "contractor", label: "Contractors", category: "contractor", terms: ["plumber", "heating and air conditioning", "electrician", "roofing contractor"] },
  { id: "home_trades", label: "Painters, concrete & handymen", category: "contractor", terms: ["painting contractor", "concrete contractor", "handyman", "remodeling contractor", "fence contractor", "appliance repair"] },
  { id: "tree_pest", label: "Tree service & pest control", category: "contractor", terms: ["tree service", "pest control"] },
  { id: "salon", label: "Salons & barbers", category: "salon", terms: ["hair salon", "barber shop", "beauty salon"] },
  { id: "nails", label: "Nail salons", category: "salon", terms: ["nail salon"] },
  { id: "massage", label: "Massage & day spas", category: "salon", terms: ["massage therapist", "day spa"] },
  { id: "pet_grooming", label: "Pet groomers", category: "salon", terms: ["pet grooming", "dog groomer"] },
  { id: "auto", label: "Auto repair", category: "auto", terms: ["auto repair", "mechanic", "tire shop", "transmission repair"] },
  { id: "auto_more", label: "Body shops, detailing & towing", category: "auto", terms: ["auto body shop", "auto detailing", "towing service"] },
  { id: "small_engine", label: "Small engine & mower repair", category: "auto", terms: ["small engine repair", "lawn mower repair"] },
  { id: "landscaping", label: "Landscaping & lawn", category: "landscaping", terms: ["landscaping", "lawn care service", "lawn mowing service"] },
  { id: "cleaning", label: "Cleaning services", category: "cleaning", terms: ["house cleaning service", "cleaning service", "janitorial service"] },
  { id: "pressure_washing", label: "Pressure & window washing", category: "cleaning", terms: ["pressure washing", "window cleaning"] },
  { id: "print", label: "Print, sign & shirt shops", category: "print", terms: ["screen printing", "sign shop", "print shop", "embroidery", "custom t-shirts"] },
  { id: "retail", label: "Boutiques & gift shops", category: "retail", terms: ["boutique", "gift shop", "florist"] },
  { id: "retail_more", label: "Antiques, thrift, feed & furniture", category: "retail", terms: ["antique store", "thrift store", "feed store", "furniture store"] },
  // Tax & finance (research/tax-finance.md §10). Financial advisors aren't searched: most need their firm's approval
  // for a website, so they're added by hand after asking.
  { id: "finance", label: "Tax preparers & bookkeepers", category: "finance", terms: ["tax preparation service", "income tax service", "tax preparer", "bookkeeping service", "taxes y seguros"] },
  { id: "accounting", label: "Accountants & CPAs", category: "finance", terms: ["accountant", "CPA", "payroll service", "small business accountant"] },
  { id: "insurance", label: "Insurance agencies", category: "finance", terms: ["insurance agency", "independent insurance agent", "auto insurance agency", "Medicare insurance agent", "seguros de auto"] },
];

export function groupById(id: string): SearchGroup | undefined {
  return SEARCH_GROUPS.find((g) => g.id === id);
}

export interface PlannedSearch {
  query: string;
  center: { lat: number; lng: number };
  radiusMeters: number;
}

export function searchesFor(group: SearchGroup, wider: boolean): PlannedSearch[] {
  const home = group.terms.map((t) => ({ query: `${t} in ${MARKET.name}`, center: MARKET.center, radiusMeters: MARKET.radiusMeters }));
  if (!wider) return home;
  const towns = WIDER_TOWNS.flatMap((town) =>
    group.terms.map((t) => ({ query: `${t} in ${town.name}`, center: { lat: town.lat, lng: town.lng }, radiusMeters: TOWN_RADIUS })),
  );
  return [...home, ...towns];
}

/** Home-town search phrases per category (used by scripts/demo.ts). */
export const QUERIES: Partial<Record<CategoryId, string[]>> = Object.fromEntries(
  SEARCH_GROUPS.filter((g) => g.id === g.category).map((g) => [g.category, searchesFor(g, false).map((s) => s.query)]),
);

export const CATEGORY_LABELS: Partial<Record<CategoryId, string>> = Object.fromEntries(
  SEARCH_GROUPS.filter((g) => g.id === g.category).map((g) => [g.category, g.label]),
);
