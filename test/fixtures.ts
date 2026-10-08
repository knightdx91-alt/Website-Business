import { readFile } from "node:fs/promises";
import type { BusinessRecord, Copy } from "../src/generator/types.ts";

export const loadFont = (pkg: string, file: string) => readFile(`node_modules/@fontsource/${pkg}/files/${file}`);

const weekday = [{ open: "11:00", close: "20:00" }];
export function restaurantRecord(over: Partial<BusinessRecord> = {}): BusinessRecord {
  return {
    placeId: "ChIJtest123",
    name: "Sample Smokehouse",
    category: "restaurant",
    variant: "bbq",
    businessStatus: "OPERATIONAL",
    phone: { e164: "+12565550123", display: "(256) 555-0123" },
    smsEnabled: false,
    address: { street: "100 Main Ave NE", city: "Cullman", state: "AL", zip: "35055", county: "Cullman" },
    showStreetAddress: true,
    geo: { lat: 34.17, lng: -86.84 },
    timezone: "America/Chicago",
    mapsUrl: "https://maps.google.com/?cid=1",
    hours: { weekly: [[], weekday, weekday, weekday, weekday, [{ open: "11:00", close: "21:00" }], [{ open: "07:00", close: "14:00" }]] },
    ownershipTags: [],
    licenses: [],
    services: [],
    offers: [],
    testimonials: [],
    links: { social: { facebook: "https://www.facebook.com/samplesmokehouse" } },
    media: { gallery: [] },
    reputation: { rating: 4.6, count: 210, displayMode: "link_only" },
    ext: { restaurant: { serviceOptions: { dineIn: true, takeout: true, delivery: false, servesLunch: true, servesDinner: true, reservable: false } } },
    confirmed: [],
    ...over,
  };
}

export function contractorRecord(over: Partial<BusinessRecord> = {}): BusinessRecord {
  return {
    ...restaurantRecord(),
    placeId: "ChIJtest456",
    name: "Sample Plumbing Co",
    category: "contractor",
    variant: "plumbing",
    showStreetAddress: false,
    hours: undefined,
    serviceArea: { towns: ["Cullman", "Hanceville", "Good Hope"], counties: ["Cullman"] },
    services: [
      { id: "leak-repair", name: "Leak repair" },
      { id: "drain-cleaning", name: "Drain cleaning" },
    ],
    ext: { contractor: { residential: true } },
    ...over,
  };
}

export function sampleCopy(over: Partial<Copy> = {}): Copy {
  return {
    heroTagline: "Slow-smoked meats and sides made from scratch.",
    heroSub: "Pit-smoked barbecue for lunch and dinner in Cullman.",
    about: ["We smoke our meat low and slow every day.", "Come hungry and bring the family."],
    serviceBlurbs: { "leak-repair": "We find and fix leaks under sinks, in walls and in yards.", "drain-cleaning": "Slow or clogged drains cleared fast." },
    faq: [
      { q: "How do I know if I have a leak?", a: "Look for water stains, a running meter or higher bills. Call us and we'll take a look." },
      { q: "What should I do if a pipe bursts?", a: "Shut off the main water valve, then call us." },
      { q: "Can you clear a slow drain?", a: "Yes. Call us and we'll clear it." },
    ],
    serviceAreaIntro: "We work in homes across Cullman and the towns around it.",
    ctaTitle: "Come see us",
    ctaLine: "Stop by for lunch or call ahead for takeout.",
    cuisineLabel: "Smokehouse BBQ",
    meta: { title: "", description: "Pit-smoked BBQ in Cullman, AL with dine-in and takeout for lunch and dinner. Call ahead for takeout or stop by Main Ave today." },
    approved: false,
    ...over,
  };
}

export function categoryRecord(category: "salon" | "auto" | "landscaping" | "cleaning", over: Partial<BusinessRecord> = {}): BusinessRecord {
  const base = restaurantRecord();
  const storefront = category === "salon" || category === "auto";
  return {
    ...base,
    placeId: `ChIJ${category}`,
    name: { salon: "Sample Barber Co", auto: "Sample Auto Service", landscaping: "Sample Lawn Care", cleaning: "Sample Cleaning Co" }[category],
    category,
    variant: { salon: "barber", auto: "general", landscaping: "lawn_crew", cleaning: "residential" }[category],
    showStreetAddress: storefront,
    hours: storefront ? base.hours : undefined,
    serviceArea: { towns: ["Cullman", "Hanceville"], counties: ["Cullman"] },
    services: [
      { id: "one", name: "Service one" },
      { id: "two", name: "Service two" },
    ],
    ext: { [category]: {} },
    ...over,
  };
}
