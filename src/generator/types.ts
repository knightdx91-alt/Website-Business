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

export interface Offer {
  title: string;
  detail?: string;
  startsOn?: string;
  expiresOn: string;
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

/** Amenity ids an auto shop can tick in Edit; labels live in AUTO_AMENITIES (packs/auto.ts). */
export type AutoAmenity = "loaner" | "shuttle" | "key_drop" | "wifi" | "digital_inspection" | "second_opinion" | "walk_ins" | "same_day" | "towing" | "spanish";

export interface AutoExt {
  warranty?: { months?: number; miles?: number; nationwide?: boolean };
  ase?: boolean;
  freeEstimates?: boolean;
  parts?: AutoPartsExt;
  /** Owner-ticked amenities ("Good to know" chip row under the opening). */
  amenities?: AutoAmenity[];
  /** Program names the shop belongs to (NAPA AutoCare, TechNet, Jasper, AAA Approved…), shown as text only, never logos. */
  programs?: string[];
  /** "Financing available through <lender>" with an optional apply link; never approval or credit claims. */
  financing?: { lender: string; url?: string };
  /** Towing variant: a separate tow line (display form), whether it's staffed 24/7 (owner-confirmed), and yard/pickup notes. */
  tow?: { phone?: string; always: boolean; yardNote?: string };
  /** Tire variant: brands carried (owner's list) and an online tire storefront. */
  tireBrands?: string[];
  storeUrl?: string;
  /** Body variant: insurers and certifications in the owner's words; the right-to-choose line shows only once confirmed. */
  body?: { insurers: string[]; certifications: string[]; rightToChooseConfirmed: boolean; estimateNote?: string };
}

export interface LandscapingExt {
  freeEstimates?: boolean;
  commercial?: boolean;
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
  /** Carriers as names (older records) or with service-centre links (Oct 2026). */
  carriers?: Array<string | FinanceCarrier>;
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
  /** "Who you'll work with": names, titles and credentials exactly as the owner gave them (no photos yet). */
  people?: FinancePerson[];
  /** Owner confirmed every name and credential in `people` (required to publish while people are listed). */
  peopleConfirmed?: boolean;
  /** tax_prep: hours during the window (MM-DD from/to, may wrap the year) in the owner's words; Google hours stay the regular set. */
  seasonHours?: { from: string; to: string; summary: string };
  /** insurance: memberships shown as chips (Trusted Choice, Big "I"). */
  memberships?: string[];
  /** Owner-stated niche, e.g. "farms, trucking companies and small contractors"; the copy may carry it into the hero. */
  whoWeServe?: string;
  /** Published fees (Circular 230 allows them; they must be honored 30 days), with the month they were last set. */
  fees?: Array<{ service: string; price: string }>;
  feesAsOf?: string;
  /** financial_advisor: compliance approval that allows a reviews section (with the SEC disclosure line under it). */
  advisorReviewsApproved?: { by: string; on: string };
}

export interface FinancePerson {
  name: string;
  title: string;
  credentials?: string;
  line?: string;
}

export interface FinanceCarrier {
  name: string;
  payUrl?: string;
  claimsPhone?: string;
  claimsUrl?: string;
}

/** Churches & nonprofits (research/churches-nonprofits.md §9). Everything here is the organization's own words. */
export interface ChurchExt {
  /** Suggested from the name (baptist, methodist, church_of_christ, pentecostal, catholic…); drives seeds and defaults only. */
  tradition?: string;
  /** Display words, e.g. "Missionary Baptist church". Shown only once confirmed; otherwise plain "Church". */
  traditionLabel?: string;
  traditionConfirmed?: boolean;
  schedule?: ChurchScheduleRow[];
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
  /** The church's own Plan-a-visit / connect-card form (Church Center, Tithely, Breeze); Plan a visit links there when set. */
  planVisitUrl?: string;
  connectCardUrl?: string;
  /** Where prayer requests go: an https link, mailto: or sms:. The site never stores them. */
  prayerUrl?: string;
  bulletinUrl?: string;
  appUrl?: string;
  podcastUrl?: string;
  /** Owner line for Watch, e.g. "Live Sundays at 10:30 on Facebook". */
  liveNote?: string;
  /** Kids & students, in the church's words; the section shows when any field is set. */
  kids?: { nursery?: string; kids?: string; students?: string; checkIn?: string };
  /** Charities: a volunteer sign-up link. */
  volunteerUrl?: string;
  /** Posts and centers: hall rental facts as chips plus how to book (the `hall` paragraph stays as is). */
  hallDetails?: { capacity?: string; kitchen?: boolean; tables?: string; how?: string };
}

/** One schedule line; `lang: "es"` marks a Spanish-language service. */
export interface ChurchScheduleRow {
  day: string;
  time: string;
  label: string;
  lang?: "es";
}

export interface CleaningExt {
  freeEstimates?: boolean;
  backgroundChecked?: boolean;
  suppliesIncluded?: boolean;
  petSafe?: boolean;
  commercial?: boolean;
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
