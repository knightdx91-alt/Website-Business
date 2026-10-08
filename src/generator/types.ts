export type CategoryId = "restaurant" | "contractor" | "salon" | "auto" | "landscaping" | "cleaning" | "print" | "retail";

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

export interface AutoExt {
  warranty?: { months?: number; miles?: number; nationwide?: boolean };
  ase?: boolean;
  freeEstimates?: boolean;
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

export interface RetailExt {
  /** Link to an online store (Shopify, Etsy, Facebook shop) or a florist's own order page. */
  shopUrl?: string;
  giftCards?: boolean;
  delivery?: boolean;
}

export interface CleaningExt {
  freeEstimates?: boolean;
  backgroundChecked?: boolean;
  suppliesIncluded?: boolean;
  petSafe?: boolean;
  commercial?: boolean;
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
}

export interface Site {
  slug: string;
  look: string;
  /** Canonical origin once published, e.g. https://joes-bbq.pages.dev */
  origin?: string;
}

export type BuildMode = "preview" | "publish";
