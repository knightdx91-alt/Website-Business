import { action, actions, type Action, type ActionId } from "../actions.ts";
import { about, contactForm, ctaBand, faq, gallery, hero, offersSection, plans, promoBar, reviews, sectionHead, serviceArea, serviceList, steps, todo, visit, type Ctx, type FormField } from "../components.ts";
import { html, type Raw } from "../html.ts";
import type { BusinessRecord, Faq } from "../types.ts";
import { fitTitle, type CategoryPack } from "./types.ts";

/**
 * The catch-all pack: any local business the ten trade packs don't fit (gyms, dentists, daycares, studios, repair shops,
 * pet stores, photographers, tutors…). Nothing is assumed about the trade: the label is Google's own type name
 * (`record.typeLabel`), the services are the owner's to list (a required to-do until they do), and the copy brief tells
 * the writer the type so the words fit. Storefronts get hours and a Visit section; service businesses get a service area
 * and a quote form. Adding a trade-specific pack later is an upgrade, never a prerequisite for building a site.
 */

/** Google primary types with a schema.org LocalBusiness subtype worth naming; everything else is LocalBusiness. */
const SCHEMA_BY_TYPE: Record<string, string> = {
  gym: "ExerciseGym",
  fitness_center: "ExerciseGym",
  dentist: "Dentist",
  dental_clinic: "Dentist",
  doctor: "Physician",
  medical_clinic: "MedicalClinic",
  physiotherapist: "Physiotherapy",
  veterinary_care: "VeterinaryCare",
  pet_store: "PetStore",
  pharmacy: "Pharmacy",
  child_care_agency: "ChildCare",
  preschool: "Preschool",
  school: "School",
  lodging: "LodgingBusiness",
  hotel: "Hotel",
  storage: "SelfStorage",
  car_dealer: "AutoDealer",
  gas_station: "GasStation",
  laundry: "DryCleaningOrLaundry",
  dry_cleaner: "DryCleaningOrLaundry",
  locksmith: "Locksmith",
  moving_company: "MovingCompany",
  real_estate_agency: "RealEstateAgent",
  lawyer: "Attorney",
  tattoo_parlor: "TattooParlor",
  travel_agency: "TravelAgency",
  bank: "BankOrCreditUnion",
  event_venue: "EventVenue",
  wedding_venue: "EventVenue",
  bowling_alley: "BowlingAlley",
  golf_course: "GolfCourse",
  movie_theater: "MovieTheater",
  liquor_store: "LiquorStore",
  convenience_store: "ConvenienceStore",
  grocery_store: "GroceryStore",
  electronics_store: "ElectronicsStore",
  jewelry_store: "JewelryStore",
  sporting_goods_store: "SportingGoodsStore",
  book_store: "BookStore",
  bicycle_store: "BikeStore",
  optician: "Optician",
  dance_school: "SportsActivityLocation",
  martial_arts_school: "SportsActivityLocation",
};

/** Rental businesses Google only calls "Services": they get their own label, seeded rentals and a date-first form. */
export const RENTAL_KINDS = {
  party_rental: {
    label: "Party & Event Rentals",
    seed: [["bounce", "Bounce houses"], ["slides", "Water slides"], ["tents", "Tents"], ["tables", "Tables & chairs"]],
  },
  portable_toilet: {
    label: "Portable Toilet Rentals",
    seed: [["standard", "Standard portable toilets"], ["ada", "Accessible (ADA) units"], ["handwash", "Hand-wash stations"], ["events", "Event & job-site service"]],
  },
} as const;
export type RentalKind = keyof typeof RENTAL_KINDS;

/** Shops the general pack sees often enough to label and seed (the owner confirms the list): Google calls them "laundry". */
export const STORE_KINDS = {
  dry_cleaner: {
    label: "Dry Cleaner & Laundry",
    seed: [["dry-cleaning", "Dry cleaning"], ["laundry", "Laundry & wash and fold"], ["pressing", "Pressing"], ["alterations", "Alterations & repairs"]],
  },
} as const;
export type StoreKind = keyof typeof STORE_KINDS;

export function storeKind(name: string, label = ""): StoreKind | null {
  return /\b(dry ?clean\w*|laundr\w*|laundromat|wash (&|and) fold)\b/i.test(`${name} ${label}`) ? "dry_cleaner" : null;
}

/** "Bouncers Inflatable Rentals", "Cullman Porta Potty Rentals", "VIP Rents" with a party-rental kind typed in → its kind. */
export function rentalKind(name: string, label = ""): RentalKind | null {
  const t = `${name} ${label}`;
  if (/\b(porta[- ]?(potty|potties|johns?)|portable (toilets?|restrooms?)|restroom trailers?)\b/i.test(t)) return "portable_toilet";
  if (/\b(bounce|bouncers?|bouncies|inflatables?|jumpers?|moon ?walks?|water ?slides?|party (rentals?|rents)|event rentals?|tent rentals?|tables? (and|&) chairs?|party (&|and) event)\b/i.test(t)) return "party_rental";
  return null;
}

export function seedRentals(kind: RentalKind): Array<{ id: string; name: string; featured: boolean }> {
  return RENTAL_KINDS[kind].seed.map(([id, name]) => ({ id, name, featured: true }));
}

const isRental = (r: BusinessRecord) => r.variant in RENTAL_KINDS;

export function generalLabel(r: BusinessRecord): string {
  return r.typeLabel?.trim() || "Local Business";
}

/** Storefront when the record shows a street (shops, clinics, studios); otherwise a service business with an area. */
export function isStorefront(r: BusinessRecord): boolean {
  return !r.serviceArea || (r.showStreetAddress && !!r.address.street);
}

const STEPS_RENTAL = [
  { title: "Pick your date", body: "Call, text or send the form with your date, place and what you'd like." },
  { title: "We deliver and set up", body: "We bring it out and get it set up before your event." },
  { title: "We pick it up", body: "When the party's over, we come back for it." },
];

const STEPS_SERVICE = [
  { title: "Get in touch", body: "Call, text or send the form. Tell us what you need." },
  { title: "We talk it through", body: "A quick conversation so we understand the job and can give you a straight answer." },
  { title: "We get it done", body: "On the day we agree, the way we said." },
];

function trust(r: BusinessRecord): string[] {
  const out: string[] = [];
  if (r.foundedYear) out.push(`Since ${r.foundedYear}`);
  if (r.ownershipTags.includes("family_owned")) out.push("Family-owned");
  else if (r.ownershipTags.includes("locally_owned")) out.push("Locally owned");
  if (r.ownershipTags.includes("veteran_owned")) out.push("Veteran-owned");
  if (r.ownershipTags.includes("woman_owned")) out.push("Woman-owned");
  if (r.insured && r.bonded) out.push("Insured & bonded");
  else if (r.insured) out.push("Insured");
  if (r.licenses.length) out.push("Licensed");
  return out.slice(0, 4);
}

export function generalFaq(ctx: Ctx): Faq[] {
  return ctx.copy.faq.slice(0, 6);
}

/** Claims the writer may never make about a business it knows nothing about. */
export function generalBannedPhrases(r: BusinessRecord): RegExp[] {
  // "free" alone is a normal word (free weights, free parking); only the sales claims are banned.
  const out: RegExp[] = [
    /\b(award[- ]winning|#1|number one|the best|top[- ]rated|five[- ]star|5[- ]star)\b/i,
    /\b(guaranteed?|guarantees|warranty)\b/i,
    /\b(certified|accredited|board[- ]certified)\b/i,
    /\b(cheapest|lowest prices?|free (estimates?|quotes?|consultations?|trials?|delivery|shipping|installation))\b/i,
  ];
  if (!r.licenses.length) out.push(/\b(fully |state )?licensed\b/i);
  return out;
}

export const generalPack: CategoryPack = {
  id: "general",
  label: "Local business",
  titleMode: "name",
  locationModel: "storefront",
  hasForm: () => true,
  looks: ["general.town_square", "general.clean_slate", "general.warm_welcome", "general.night_shift"],
  defaultLook(r) {
    if (r.ownershipTags.includes("family_owned")) return "general.warm_welcome";
    return isStorefront(r) ? "general.town_square" : "general.clean_slate";
  },
  variantLabel: (r) => generalLabel(r),
  schemaType: (r) => SCHEMA_BY_TYPE[r.variant] ?? "LocalBusiness",
  schemaExtras: () => ({}),
  homeTitle(r) {
    const t = generalLabel(r);
    return fitTitle([`${r.name} | ${t} in ${r.address.city}, ${r.address.state}`, `${r.name} | ${t} in ${r.address.city}`, `${r.name} | ${r.address.city}, ${r.address.state}`, r.name]);
  },
  nav: (ctx) => [
    ...(ctx.r.services.length ? [{ label: "What we do", href: "/#services" }] : []),
    ...(ctx.r.plans?.length ? [{ label: "Pricing", href: "/#plans" }] : []),
    { label: "About", href: "/#about" },
    { label: "Reviews", href: "/#reviews" },
    isStorefront(ctx.r) ? { label: "Hours & location", href: "/#visit" } : { label: "Service area", href: "/#area" },
    { label: "Contact", href: "/#contact" },
  ],
  actionBar: (ctx) => {
    const r = ctx.r;
    const ids: ActionId[] = isStorefront(r) ? (r.links.booking ? ["book", "call"] : ["call", "directions"]) : ["quote", "call"];
    return actions(r, r.smsEnabled ? [...ids, "text"] : ids);
  },
  homeFaq: (ctx) => generalFaq(ctx),
  bannedPhrases: (r) => generalBannedPhrases(r),
  home(ctx: Ctx) {
    const r = ctx.r;
    const t = generalLabel(r);
    const storefront = isStorefront(r);
    const primary: Action[] = storefront
      ? actions(r, r.links.booking ? ["book", "call"] : ["call", "directions"])
      : actions(r, r.smsEnabled ? ["quote", "call", "text"] : ["quote", "call"]);
    const rental = isRental(r);
    const fields: FormField[] = [
      ...(rental ? [{ name: "event_date" as const, label: r.variant === "portable_toilet" ? "Date you need it" : "Event date", type: "date" as const }, { name: "location" as const, label: "Where (town or address)" }] : []),
      { name: "reach", label: "Best way to reach you", options: ["Call", "Text", "Email"] },
    ];
    const formOpts = rental
      ? { title: "Check your date", topic: "Booking", button: "Check my date", details: "What would you like to rent?" }
      : storefront ? { title: "Send us a message", topic: "Message", button: "Send", details: "What can we help you with?" } : { title: "Request a quote", topic: "Quote", button: "Request a quote", details: "Tell us about the job" };
    const formIntro = rental ? "Tell us your date and what you'd like, and we'll let you know what's open and the price." : storefront ? "Questions? Send a note and we'll get back to you." : "Tell us what you need and we'll get back to you with a price.";
    return html`${hero(ctx, {
      eyebrow: `${t} · ${r.address.city}, ${r.address.state}`,
      h1: r.name,
      sub: ctx.copy.heroSub,
      trust: trust(r),
      showStatus: storefront,
      actions: primary,
      address: storefront,
      badge: r.foundedYear && ctx.theme.knobs.badge === "seal" ? `Since ${r.foundedYear}` : undefined,
    })}
${promoBar(ctx)}
<main id="main">
${r.services.length
      ? html`<section class="section" id="services" aria-labelledby="services-title"><div class="wrap">
${sectionHead("What we do", ctx.copy.heroTagline || `What ${r.name} does`, undefined, "services-title")}
${serviceList(ctx, r.services.map((s) => ({ title: s.name, body: ctx.copy.serviceBlurbs[s.id], icon: "check" as const })), 2)}
${r.confirmed.includes("services") ? "" : todo(ctx, "Check the services list", "Tell us what to add or remove, and whether to show starting prices.", true)}
</div></section>`
      : html`<section class="section" id="services" aria-labelledby="services-title"><div class="wrap">
${sectionHead("What we do", ctx.copy.heroTagline || `What ${r.name} does`, undefined, "services-title")}
${todo(ctx, "List what you do", `Give us 3 to 8 things people come to you for (for a ${t.toLowerCase()}: the main services, classes, products or programs). They become this section, with a line under each.`, true)}
</div></section>`}
${plans(ctx, { label: "Pricing", title: "Plans and pricing" })}
${offersSection(ctx)}
${storefront ? "" : html`<section class="section section--band" id="how" aria-labelledby="how-title"><div class="wrap">
${sectionHead("How it works", "Three easy steps", undefined, "how-title")}
${steps(ctx.copy.steps?.length ? ctx.copy.steps : rental ? STEPS_RENTAL : STEPS_SERVICE)}
</div></section>`}
${gallery(ctx, "Send us a few photos", "Your place, your work, your team: five phone photos in daylight are plenty. We'll put the best ones here.")}
${reviews(ctx)}
${about(ctx, `About ${r.name}`)}
${storefront ? visit(ctx, "Come see us") : serviceArea(ctx)}
${faq(generalFaq(ctx), true)}
${contactForm(ctx, r.services.map((s) => s.name), r.serviceArea?.towns ?? [], fields, formIntro, formOpts)}
${ctaBand(ctx, primary)}
</main>`;
  },
  pages: () => [],
  copyBrief: (r) => {
    const t = generalLabel(r);
    const storefront = isStorefront(r);
    return {
      voice: `Friendly, plain-spoken and local, the way a good ${t.toLowerCase()} talks to a new customer. Short sentences. Everything you write must be true of ANY ${t.toLowerCase()}: never invent services, products, prices, hours, credentials, years, team members, awards or guarantees. Use google_type as the kind of business.`,
      fields: {
        heroTagline: `One sentence (10-18 words) saying what kind of business this is and where, e.g. "A family-run ${t.toLowerCase()} in ${r.address.city}" in your own words, only from the facts.`,
        heroSub: "One supporting line (15-25 words) under the name: who it's for and what to expect, general and true. No superlatives.",
        serviceBlurbs: "For each service id, one line (12-25 words) on what it is or who it's for. General and true; no prices, no promises.",
        faq: `5-6 general questions a first-time customer asks a ${t.toLowerCase()} before coming in or calling (what to bring, how to book, first-visit expectations, payment types, parking, appointments vs walk-ins) with helpful general answers (30-55 words). Never state this business's own policies, prices or hours; say to call or check the listing where it depends.`,
        about: `Two short paragraphs (70-110 words total). The owner's story is unknown: a neutral, true introduction to a ${t.toLowerCase()} in ${r.address.city} (what kind of place it is, who it serves, where). Do not invent history, team size, years or credentials.`,
        ...(storefront ? {} : isRental(r) ? { steps: "Three steps (title 2-4 words, body one sentence) for renting from a business like this: pick your date and items, they deliver and set up, they pick it up. Never promise free delivery, setup or times.", serviceAreaIntro: "One or two sentences about delivering to the town and the nearby communities listed." } : { steps: "Three steps (title 2-4 words, body one sentence) for how a new customer gets started with a service business like this: contact, agree, done.", serviceAreaIntro: "One or two sentences about serving the town and the nearby communities listed." }),
        cta: `ctaTitle: 3-7 words. ctaLine: one sentence, at most 18 words, inviting them to ${storefront ? "come by or get in touch" : "ask for a quote"}.`,
        metaDescription: `140-155 characters: ${t.toLowerCase()} + town + one true fact + an action.`,
      },
    };
  },
};
