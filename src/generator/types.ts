export type CategoryId = "restaurant" | "contractor" | "salon" | "auto" | "landscaping" | "cleaning" | "print" | "retail" | "finance" | "church";

/** Where a value came from. `google` images may appear in previews only. */
export type Source = "places" | "owner" | "ai" | "system" | "stock" | "google";

/** Fields that must be owner-confirmed before publish. */
export type ConfirmableField =
  | "name"
  | "phone"
  | "address"
  | "hours"
  | "services"
  | "service_area"
  | "variant"
  | "menu";

export interface Interval {
  /** "HH:MM", 24h. close may be "24:00"; close < open means it runs past midnight. */
  open: string;
  close: string;
}

export interface Hours {
  /** Index 0 = Sunday ... 6 = Saturday. A day with no intervals is closed. */
  weekly: Interval[][];
  open24_7?: boolean;
  byAppointment?: boolean;
  note?: string;
}

export interface Image {
  src: string;
  alt: string;
  source: Source;
  width?: number;
  height?: number;
  /** Required by Google for Places photos shown in previews. */
  attribution?: { name: string; uri?: string };
  /** Owner photos: a short caption ("Patio") and the town it was taken in, shown under the photo. */
  caption?: string;
  town?: string;
  /** This photo is the "before" of a pair: the file name (without folder or extension) of its "after" photo. */
  pairWith?: string;
}

export type PriceMode = "none" | "exact" | "from" | "range" | "quote";

export interface Service {
  id: string;
  name: string;
  group?: string;
  featured?: boolean;
  price?: { mode: PriceMode; amount?: number; min?: number; max?: number; unit?: string; note?: string };
}

export interface Testimonial {
  quote: string;
  displayName: string;
  town?: string;
  service?: string;
}

export interface License {
  label: string;
  number: string;
  state?: string;
}

/** A coupon or promotion in the owner's words. Hidden once `expiresOn` passes; without one it stays up until removed. */
export interface Offer {
  title: string;
  detail?: string;
  startsOn?: string;
  expiresOn?: string;
  /** Promo code to mention, e.g. "WEB25". */
  code?: string;
}

/** A plan, membership or way to work with the business (research/trends-2026/trades-lawn-cleaning.md §5.1). Owner-entered. */
export interface Plan {
  name: string;
  /** Price text as the owner wrote it, e.g. "$49" or "$120"; shown with a "starting points" note. */
  price?: string;
  /** "month", "visit", "year"… */
  unit?: string;
  includes: string[];
  /** "Most popular" and the like. */
  badge?: string;
  note?: string;
}

/** A guarantee in the owner's words: the window to report a problem and what they do about it, or one full sentence. */
export interface Guarantee {
  window?: string;
  remedy?: string;
  text?: string;
}

export interface MenuItem {
  name: string;
  description?: string;
  price?: string;
  tags?: Array<"spicy" | "vegetarian" | "gluten_free" | "house_favorite" | "new">;
}

export interface MenuSection {
  name: string;
  note?: string;
  items: MenuItem[];
}

export interface RestaurantExt {
  cuisineLabel?: string;
  /** From Places, owner confirms. Drives chips, FAQ and schema. */
  serviceOptions: Partial<
    Record<
      | "dineIn"
      | "takeout"
      | "delivery"
      | "curbsidePickup"
      | "reservable"
      | "servesBreakfast"
      | "servesBrunch"
      | "servesLunch"
      | "servesDinner"
      | "servesBeer"
      | "servesWine"
      | "servesCocktails"
      | "servesCoffee"
      | "servesDessert"
      | "servesVegetarianFood"
      | "outdoorSeating"
      | "liveMusic"
      | "menuForChildren"
      | "goodForGroups"
      | "allowsDogs"
      | "wheelchairAccessibleEntrance",
      boolean
    >
  >;
  priceLevel?: 1 | 2 | 3 | 4;
  menu?: { sections: MenuSection[]; lastUpdated: string; pdfUrl?: string };
  highlights?: string[];
  catering?: boolean;
}

export interface ContractorExt {
  residential: boolean;
  commercial?: boolean;
  emergencyService?: boolean;
  freeEstimates?: boolean;
  warrantyText?: string;
  financing?: { lender: string; url: string };
  /** Emergency path (with emergencyService): after-hours number if different, terms in the owner's words; confirmed is required to publish. */
  afterHours?: { phone?: string; note?: string; confirmed: boolean };
  /** Remodelers: jobs over $10,000 need the HBLB license number in advertising (Act 2024-443). */
  jobsOver10k?: boolean;
  serves?: "residential" | "commercial" | "both";
}

export interface SalonExt {
  walkIns?: "welcome" | "appointment_only" | "both";
}

/** Counter services an auto parts store may offer; the owner confirms the set before publish. */
export type PartsCounterService = "battery" | "hose" | "machine" | "keys" | "paint" | "install" | "loaner";

/** Auto parts stores (auto pack, variant `parts`). What they carry is `record.services`; everything here is owner-entered. */
export interface AutoPartsExt {
  counter?: Partial<Record<PartsCounterService, boolean>>;
  /** Owner confirmed the counter-service list (required to publish). */
  counterConfirmed?: boolean;
  /** Typical special-order turnaround in the owner's words, e.g. "Most parts by the next morning". */
  turnaround?: string;
  commercial?: boolean;
  commercialText?: string;
  /** Buying group or program name (NAPA, Carquest, Parts Plus, Bumper to Bumper), shown only with the owner's say-so. */
  program?: string;
  /** The program's online ordering page for in-store pickup; adds an "Order online for pickup" button. */
  orderUrl?: string;
}

export interface AutoExt {
  warranty?: { months?: number; miles?: number; nationwide?: boolean };
  ase?: boolean;
  freeEstimates?: boolean;
  parts?: AutoPartsExt;
}

export interface LandscapingExt {
  freeEstimates?: boolean;
  commercial?: boolean;
  /** Show the 4-season "what we do when" block, built only from the services on the record. */
  seasonal?: boolean;
  /** Alabama Dept. of Agriculture & Industries permit, required before fertilizing/weed/pest services can publish. */
  adaiPermit?: string;
  /** "Owner-operated: Jake runs every job", in the About section. */
  crew?: string;
}

export interface PrintExt {
  /** Other lines the shop does besides its main variant (screen_printing, embroidery, signs, print_shop). */
  lines?: string[];
  designHelp?: boolean;
  proofBeforePrint?: boolean;
  install?: boolean;
}

/** Thrift-store donations (on by default for the thrift variant; any shop can turn it on). All owner-entered. */
export interface RetailDonations {
  enabled?: boolean;
  accepts?: string[];
  doesNotAccept?: string[];
  dropOffHours?: string;
  /** Adds a "Request a furniture pickup" form. */
  pickup?: boolean;
  pickupNote?: string;
  /** Shows the "we're a nonprofit and can give you a receipt" line. */
  receipts?: boolean;
  note?: string;
}

export interface RetailExt {
  /** Link to an online store (Shopify, Etsy, Facebook shop) or a florist's own order page. */
  shopUrl?: string;
  giftCards?: boolean;
  delivery?: boolean;
  donations?: RetailDonations;
}

/** Tax & finance (research/tax-finance.md §9). Every claim field is owner-entered and owner-confirmed. */
export interface FinanceExt {
  /** Secondary lines from the name or the owner: insurance, tax_prep, bookkeeping, payroll, notary, translation. */
  alsoOffers?: string[];
  /** The owner's exact credentials line, e.g. "Enrolled Agent" or "Jane Doe, CPA". Shown only once confirmed. */
  credentials?: string;
  credentialsConfirmed?: boolean;
  /** tax_prep: owner confirms every paid preparer has a current PTIN (required to publish). */
  ptinConfirmed?: boolean;
  /** Owner confirms an EFIN; unlocks the "Authorized IRS e-file Provider" line. */
  efileProvider?: boolean;
  /** Required whenever "CPA" appears in the name or credentials. */
  cpaPermitConfirmed?: boolean;
  cpaPermitNo?: string;
  spanish?: boolean;
  modes?: Array<"drop_off" | "in_person" | "virtual">;
  portalUrl?: string;
  /** tax_prep: hours after tax season in the owner's words, e.g. "After April 15, by appointment". */
  offSeason?: string;
  whatToBring?: string[];
  /** insurance */
  independent?: boolean;
  carriers?: string[];
  licensesConfirmed?: boolean;
  licenseNo?: string;
  medicare?: boolean;
  /** CMS third-party marketing disclaimer, pasted by the owner from their carrier or FMO. */
  tpmoDisclaimer?: string;
  /** financial_advisor */
  disclosure?: string;
  complianceApprovedBy?: string;
  complianceApprovedOn?: string;
  brokercheckUrl?: string;
  crsUrl?: string;
}

/** Churches & nonprofits (research/churches-nonprofits.md §9). Everything here is the organization's own words. */
export interface ChurchExt {
  /** Suggested from the name (baptist, methodist, church_of_christ, pentecostal, catholic…); drives seeds and defaults only. */
  tradition?: string;
  /** Display words, e.g. "Missionary Baptist church". Shown only once confirmed; otherwise plain "Church". */
  traditionLabel?: string;
  traditionConfirmed?: boolean;
  schedule?: Array<{ day: string; time: string; label: string }>;
  scheduleConfirmed?: boolean;
  firstVisit?: { parking?: string; dress?: string; kids?: string; length?: string; music?: string; accessibility?: string };
  pastor?: { name: string; title?: string; bio?: string };
  pastorOff?: boolean;
  beliefs?: string;
  beliefsUrl?: string;
  givingUrl?: string;
  liveUrl?: string;
  sermonsUrl?: string;
  spanish?: boolean;
  facility?: string;
  /** Nonprofits */
  help?: string;
  donateUrl?: string;
  needed?: string;
  volunteer?: string;
  meetings?: string;
  joinText?: string;
  joinUrl?: string;
  hall?: string;
  /** Only with deductibleConfirmed: the organization's own status line, e.g. "We're a 501(c)(3); gifts are tax-deductible." */
  statusText?: string;
  deductibleConfirmed?: boolean;
}

/** What's included, room by room. A task may end in tier tags ("Dust ceiling fans @deep"); untagged tasks are in every tier. */
export interface CleaningChecklist {
  rooms: Array<{ room: string; tasks: string[] }>;
  tiers: string[];
  /** "May cost extra" items. */
  extras: string[];
}

export interface CleaningExt {
  freeEstimates?: boolean;
  backgroundChecked?: boolean;
  suppliesIncluded?: boolean;
  petSafe?: boolean;
  commercial?: boolean;
  checklist?: CleaningChecklist;
  /** Commercial: facility types they clean for, from CLEANING_FACILITIES. */
  facilities?: string[];
  /** Commercial: "Nightly, weekly or on your schedule", in the owner's words. */
  frequency?: string;
  /** Commercial: cleans after hours. */
  afterHours?: boolean;
}

/** One dated item for the "What's happening" section: an event, a special, a coupon, a deadline. */
export interface EventItem {
  title: string;
  /** YYYY-MM-DD; the day it happens or a special starts. */
  date: string;
  /** YYYY-MM-DD; shown until this day is over (defaults to `date`). */
  endDate?: string;
  /** Free text, e.g. "5–7 PM" or "All month". */
  time?: string;
  detail?: string;
  url?: string;
}

export interface BusinessRecord {
  placeId: string;
  name: string;
  category: CategoryId;
  variant: string;
  businessStatus: string;
  phone: { e164: string; display: string };
  smsEnabled: boolean;
  email?: string;
  address: { street?: string; city: string; state: string; zip?: string; county?: string };
  showStreetAddress: boolean;
  geo: { lat: number; lng: number };
  timezone: string;
  mapsUrl: string;
  hours?: Hours;
  serviceArea?: { towns: string[]; counties: string[]; radiusMiles?: number };
  foundedYear?: number;
  ownershipTags: Array<"family_owned" | "locally_owned" | "veteran_owned" | "woman_owned" | "owner_operated">;
  licenses: License[];
  insured?: boolean;
  bonded?: boolean;
  services: Service[];
  offers: Offer[];
  testimonials: Testimonial[];
  links: {
    order?: string;
    reserve?: string;
    booking?: string;
    giftCards?: string;
    social: Partial<Record<"facebook" | "instagram" | "tiktok" | "youtube" | "nextdoor", string>>;
  };
  media: { logo?: Image; hero?: Image; gallery: Image[] };
  /** Optional "We're hiring" section: the jobs open and how to apply, in the owner's words. */
  hiring?: { roles: string[]; how?: string };
  /** Dated events, specials and announcements in the owner's words; past ones drop off on their own. */
  events?: EventItem[];
  reputation: { rating?: number; count?: number; displayMode: "link_only" | "owner_stated"; ownerStatedText?: string };
  ext: {
    restaurant?: RestaurantExt;
    contractor?: ContractorExt;
    salon?: SalonExt;
    auto?: AutoExt;
    landscaping?: LandscapingExt;
    cleaning?: CleaningExt;
    print?: PrintExt;
    retail?: RetailExt;
    finance?: FinanceExt;
    church?: ChurchExt;
  };
  confirmed: ConfirmableField[];
  /** Plans & pricing cards (memberships, recurring tiers, ways to work with us). Owner-entered; 1–3. */
  plans?: Plan[];
  guarantee?: Guarantee;
}

export interface Faq {
  q: string;
  a: string;
}

/** Everything the AI writes. Every piece is owner-reviewed before publish. */
export interface Copy {
  heroTagline: string;
  heroSub: string;
  about: string[];
  serviceBlurbs: Record<string, string>;
  steps?: Array<{ title: string; body: string }>;
  faq: Faq[];
  serviceAreaIntro?: string;
  ctaTitle: string;
  ctaLine: string;
  cuisineLabel?: string;
  meta: { title: string; description: string };
  approved: boolean;
  /** The Spanish page (extra), translated from the text above and owner-reviewed like the rest. */
  es?: SpanishCopy;
  /** Problems the copy writer still saw after its retries (hype, invented numbers). Shown as a lint warning; never blocks. */
  issues?: string[];
  /** Headline forms for the DNA `headline` knob: a question ("Is your AC blowing warm air?") and a benefit ("Take your weekend back"). ≤60 chars, no claims. */
  heroQuestion?: string;
  heroBenefit?: string;
}

export interface SpanishCopy {
  heroTagline: string;
  heroSub: string;
  about: string[];
  /** Service names in Spanish, by service id. */
  services: Record<string, string>;
  faq: Faq[];
  ctaTitle: string;
  ctaLine: string;
  metaDescription: string;
  /** Menu labels in Spanish, by the English label ("Services" → "Servicios"). Missing ones fall back to the generator's defaults. */
  nav?: Record<string, string>;
}

export interface Site {
  slug: string;
  look: string;
  /** Canonical origin once published, e.g. https://joes-bbq.pages.dev */
  origin?: string;
}

export type BuildMode = "preview" | "publish";
