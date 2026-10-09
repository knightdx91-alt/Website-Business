import type { CategoryId } from "../generator/types.ts";
import type { Place } from "./client.ts";

export type WebPresence = "none" | "social" | "free_builder" | "has_site" | "outdated";

const SOCIAL = /(^|\.)(facebook\.com|fb\.com|fb\.me|instagram\.com|linktr\.ee|tiktok\.com|twitter\.com|x\.com|yelp\.com|nextdoor\.com|business\.site|g\.page|youtube\.com|linkedin\.com)$/i;
/** A booking, ordering or delivery page on someone else's platform: counts as "no website" (presence `social`). */
const BOOKING = /(^|\.)(booksy\.com|vagaro\.com|squareup\.com|square\.site|styleseat\.com|glossgenius\.com|schedulicity\.com|toasttab\.com|order\.online|clover\.com|menufy\.com|grubhub\.com|doordash\.com|ubereats\.com)$/i;
const FREE_BUILDER = /(^|\.)(wixsite\.com|weebly\.com|godaddysites\.com|webnode\.com|jimdosite\.com|carrd\.co|sites\.google\.com|churchcenter\.com|e-clubhouse\.org|keeq\.io)$/i;
/** A national or parent organization's page (a Legion department, a church locator) isn't the group's own site. */
const PARENT_ORG = /(^|\.)(legion\.org|legional\.org|vfw\.org|elks\.org|lionsclubs\.org|rotary\.org|churchofgod\.org|churchofjesuschrist\.org|jw\.org)$/i;

function hostOf(websiteUri: string | undefined): string | null {
  if (!websiteUri) return null;
  try {
    return new URL(websiteUri).hostname;
  } catch {
    return null;
  }
}

export function webPresence(websiteUri: string | undefined): WebPresence {
  const host = hostOf(websiteUri);
  if (!host) return "none";
  if (SOCIAL.test(host) || BOOKING.test(host)) return "social";
  if (PARENT_ORG.test(host)) return "none";
  if (FREE_BUILDER.test(host)) return "free_builder";
  return "has_site";
}

/** True when the "website" is only a booking/ordering page (Booksy, Toast, DoorDash…). */
export function isBookingPage(websiteUri: string | undefined): boolean {
  const host = hostOf(websiteUri);
  return !!host && BOOKING.test(host);
}

/**
 * Chains and franchises we never pitch, by the kind of search they'd show up in. A name is matched as whole words
 * ("arby" no longer drops "Darby's Diner"); entries ending in "'s" must also be the whole name or be followed by a
 * generic tail ("Jack's Family Restaurant", "Lowe's Home Improvement"), so "Jack's Auto Repair", "Wendy's Hair
 * Salon", "Logan's Barbershop" and "Lowe's Lawn Care" pass in their own categories.
 */
const CHAIN_LISTS: Array<{ categories: CategoryId[]; names: string[] }> = [
  {
    categories: ["restaurant"],
    names: [
      "mcdonald's", "wendy's", "subway", "taco bell", "burger king", "chick-fil-a", "sonic drive-in", "sonic", "arby's", "hardee's", "kfc", "zaxby's",
      "waffle house", "cracker barrel", "starbucks", "dunkin", "dunkin'", "dunkin' donuts", "domino's", "domino's pizza", "pizza hut", "papa john's", "papa john's pizza", "little caesars", "jack's",
      "dairy queen", "krystal", "popeyes", "whataburger", "applebee's", "chili's", "logan's roadhouse", "logan's", "mellow mushroom", "moe's", "moe's southwest grill", "moe's original bbq", "lawler's barbecue", "lawlers",
      "dreamland", "dreamland bar-b-que", "jim 'n nick's", "jim 'n nick", "huddle house", "captain d's", "panda express", "cook out", "five guys", "jersey mike's", "firehouse subs",
      "wingstop", "buffalo wild wings", "olive garden", "outback", "outback steakhouse", "longhorn", "longhorn steakhouse", "texas roadhouse", "golden corral", "ihop", "denny's",
      "bojangles", "church's", "church's chicken", "zaxby's chicken fingers", "hibachi express", "tropical smoothie", "smoothie king", "marco's", "marco's pizza", "hungry howie's", "hungry howie's pizza", "hunt brothers",
    ],
  },
  {
    categories: ["contractor", "cleaning", "landscaping"],
    names: [
      "roto-rooter", "mr. rooter", "mister sparky", "one hour heating", "benjamin franklin plumbing", "ars rescue", "service experts", "mr. electric",
      "rainbow restoration", "servpro", "molly maid", "merry maids", "the grounds guys", "the maids", "stanley steemer", "chem-dry", "trugreen", "lawn doctor",
      "terminix", "orkin", "aptive", "mr. handyman", "lowe's", "home depot", "window world", "leaffilter", "leaf filter", "bath fitter", "re-bath",
    ],
  },
  {
    categories: ["auto"],
    names: [
      "jiffy lube", "express oil change", "take 5", "valvoline", "firestone", "goodyear", "pep boys", "o'reilly", "autozone", "advance auto parts",
      "napa auto", "meineke", "midas", "christian brothers automotive", "discount tire", "tire discounters", "mavis", "big o tires", "tires plus", "ntb",
      "safelite", "safelite autoglass", "maaco", "caliber collision", "gerber collision", "crash champions", "walmart auto", "sam's club", "aamco", "grease monkey",
    ],
  },
  {
    categories: ["salon"],
    names: ["great clips", "supercuts", "sport clips", "fantastic sams", "smartstyle", "cost cutters", "regis", "ulta", "sally beauty", "petsmart", "petco", "massage envy", "european wax center", "hand and stone", "hand & stone"],
  },
  {
    categories: ["print"],
    names: ["the ups store", "ups store", "fedex office", "office depot", "officemax", "staples", "fastsigns", "signarama", "minuteman press", "alphagraphics", "sir speedy", "speedpro", "big frog", "vistaprint"],
  },
  {
    categories: ["retail"],
    names: [
      "lowe's", "home depot", "hobby lobby", "walmart", "rural king", "tractor supply", "southern states", "tj maxx", "homegoods", "kirkland's", "goodwill",
      "plato's closet", "ashley furniture", "ashley homestore", "rooms to go", "bassett", "farmers home furniture", "petsense", "hollywood feed", "dollar general",
      "family dollar", "dollar tree", "maurices", "cato fashions", "cato", "rue21", "hibbett", "1-800-flowers", "michaels", "big lots", "ollie's", "five below", "bargain hunt",
      "harbor freight", "aaron's", "rent-a-center", "badcock", "mattress firm", "shoe station", "shoe carnival", "rack room", "belk", "kohl's", "ross", "ross dress for less", "burlington", "old navy", "ace hardware", "true value",
    ],
  },
];

/** What may follow a possessive or everyday-word chain name and still mean the chain itself ("Jack's Family Restaurant", "Lowe's Home Improvement"). */
const CHAIN_TAIL =
  /^(?:\s*(?:restaurants?|family restaurants?|hamburgers|burgers|chicken|subs|drive[- ]?in|express|store|home improvement|home center|supply|outlet|of [\w .]+|in [\w .]+|#\s?\d+|\d+|inc\.?|llc|co\.?|[-–—(,].*|®|™))*\s*$/i;
/** Single-word chain names that are also ordinary words or surnames, so they must be the whole business name. */
const AMBIGUOUS = new Set(["subway", "sonic", "krystal", "dreamland", "dunkin", "outback", "longhorn", "cato", "regis", "ross", "belk", "staples", "midas", "mavis", "ntb", "goodwill", "bassett", "michaels", "burlington", "badcock", "ulta", "aptive", "take 5"]);

function chainRe(name: string): RegExp {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/'s$/, "'?s").replace(/\s+/g, "\\s+");
  return new RegExp(`(^|[^a-z0-9])${esc}(?![a-z0-9])`, "i");
}

const COMPILED = CHAIN_LISTS.map((l) => ({
  categories: new Set<CategoryId>(l.categories),
  names: l.names.map((n) => ({ name: n, re: chainRe(n), strict: /'s$/.test(n) || AMBIGUOUS.has(n) })),
}));

function matchesChain(n: string, entry: { re: RegExp; strict: boolean }): boolean {
  const m = entry.re.exec(n);
  if (!m) return false;
  if (!entry.strict) return true;
  // Short or possessive names must be the whole business name (or carry only a generic tail) and sit at the start.
  if (m.index !== 0) return false;
  return CHAIN_TAIL.test(n.slice(m[0].length));
}

/**
 * True for a national chain or franchise. With a category, only that category's lists apply (a church is never a
 * chain; "Jack's Auto Repair" is only checked against auto chains). Without one, every list applies.
 */
export function isChain(name: string, category?: CategoryId): boolean {
  const n = name.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();
  if (category === "church") return false;
  for (const list of COMPILED) {
    if (category && !list.categories.has(category)) continue;
    if (list.names.some((e) => matchesChain(n, e))) return true;
  }
  return false;
}

const KM_PER_DEG = 111.32;
function kmBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = (b.lat - a.lat) * KM_PER_DEG;
  const dLng = (b.lng - a.lng) * KM_PER_DEG * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180));
  return Math.hypot(dLat, dLng);
}

/** Likely-buyer score: busy (many reviews), well rated, active on social, complete listing. */
export function scorePlace(p: Place, presence: WebPresence): number {
  let score = Math.log10(1 + (p.userRatingCount ?? 0)) * 20 + (p.rating ?? 0) * 3;
  if (presence === "social") score += 8;
  if (p.regularOpeningHours?.periods?.length) score += 4;
  if (p.photos?.length) score += 3;
  return Math.round(score * 10) / 10;
}

export interface QualifiedLead {
  place: Place;
  presence: WebPresence;
  score: number;
  reason: string;
}

export interface QualifyOptions {
  includeFreeBuilder?: boolean;
  includeSites?: boolean;
  category?: CategoryId;
  /** The search center; places farther than `maxKm` (default 40) from it are dropped. The pipeline should pass its search's center. */
  center?: { lat: number; lng: number };
  maxKm?: number;
}

/**
 * Keeps operational, non-chain places with a phone and no real website. Ranks likely buyers first.
 * With includeSites, places that have a website come back too, for the caller to check (see site-check.ts).
 * Duplicates are dropped by Place ID and then by phone number (a second listing for the same shop). */
export function qualify(places: Place[], opts: QualifyOptions = {}): QualifiedLead[] {
  const seen = new Set<string>();
  const seenPhones = new Set<string>();
  const out: QualifiedLead[] = [];
  const maxKm = opts.maxKm ?? 40;
  for (const p of places) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    const name = p.displayName?.text ?? "";
    if (!name || isChain(name, opts.category)) continue;
    if (p.businessStatus !== "OPERATIONAL") continue;
    if (!p.nationalPhoneNumber) continue;
    if (opts.center && p.location && kmBetween(opts.center, { lat: p.location.latitude, lng: p.location.longitude }) > maxKm) continue;
    const digits = p.nationalPhoneNumber.replace(/\D/g, "").slice(-10);
    if (digits.length === 10) {
      if (seenPhones.has(digits)) continue;
      seenPhones.add(digits);
    }
    const presence = webPresence(p.websiteUri);
    if (!opts.includeSites && (presence === "has_site" || (presence === "free_builder" && !opts.includeFreeBuilder))) continue;
    const count = p.userRatingCount ?? 0;
    const score = scorePlace(p, presence);
    const reason =
      presence === "none"
        ? `No website · ${count} Google reviews`
        : presence === "social"
          ? `${isBookingPage(p.websiteUri) ? "Only a booking/ordering page" : "Only a social page"} · ${count} Google reviews`
          : `Free-builder site · ${count} Google reviews`;
    out.push({ place: p, presence, score, reason });
  }
  return out.sort((a, b) => b.score - a.score);
}

const TYPE_CATEGORY: Array<[RegExp, CategoryId]> = [
  [/restaurant|cafe|coffee|bakery|meal_|food|bar_and_grill|diner|deli|ice_cream|donut|sandwich|pizza|steak|barbecue/, "restaurant"],
  [/hair|barber|beauty|nail|pet_care|pet_groom|spa$|massage/, "salon"],
  [/car_repair|auto|tire|transmission|oil_change|car_dealer|car_wash/, "auto"],
  [/plumb|electric|roofing|contractor|hvac|heating|painter|locksmith|moving|handyman|excavat|septic|welder|garage_door|gutter|flooring|drywall|insulation/, "contractor"],
  [/hardware_store|home_improvement_store|lumber/, "retail"],
  [/^(accounting|insurance_agency)$/, "finance"],
  [/^(church|place_of_worship|community_center|non_profit_organization)$/, "church"],
  [/florist|clothing_store|gift_shop|furniture_store|thrift_store|flea_market|home_goods_store|shoe_store|garden_center/, "retail"],
];

/** Best-guess template for a Places result (the owner can change it before adding). */
export function guessCategory(p: Place): CategoryId | null {
  const n = (p.displayName?.text ?? "").toLowerCase();
  if (/\b(collision|body shop|paint (&|and) body|detail|wrecker|towing|small engine|mower repair|auto glass|autoglass|windshield|muffler|exhaust)/.test(n)) return "auto";
  if (/\b(lawn|landscap|mowing|sod|irrigation)/.test(n)) return "landscaping";
  if (/\b(clean|maid|janitor|(pressure|power|soft) ?wash)/.test(n)) return "cleaning";
  if (/\b(massage|day spa|bodywork)/.test(n)) return "salon";
  if (/screen ?print|embroider|monogram|\bsigns?\b|banners?|vinyl|decals|t-?shirts|\bprint(ing|ers)?\b|graphics/.test(n)) return "print";
  if (/\b(boutique|gifts?|antiques?|thrift|consign|flowers?|florist|floral|feed|seed|furniture|mercantile|vintage|hardware|lumber|building supply)\b/.test(n)) return "retail";
  if (/\b(paint|concrete|fenc|pest|termite|remodel|appliance|tree|stump|septic|excavat|dirt work|grading|dozer|backhoe|land clearing|garage door|gutter|weld|fabricat|flooring|floors?\b|carpet|drywall|sheetrock)/.test(n)) return "contractor";
  if (/\b(church|chapel|iglesia|tabernacle|parish|vfw|american legion|lions club|ruritan|masonic|food pantry|food bank|community center)\b/.test(n)) return "church";
  if (/\b(tax(es)?|impuestos|accounting|accountants?|bookkeep\w*|c\.?p\.?a\.?s?|insurance|seguros|financial (planning|advisors?|services))\b/.test(n)) return "finance";
  if (/\b(food truck|truck|grill|bbq|cafe|kitchen|diner|taco|pizza|seafood|catfish|hibachi|wings?|chinese|sushi|buffet)\b/.test(n)) return "restaurant";
  for (const t of [p.primaryType ?? "", ...(p.types ?? [])]) {
    for (const [re, cat] of TYPE_CATEGORY) if (re.test(t)) return cat;
  }
  if (/\b(salon|barber|nails?|groom)/.test(n)) return "salon";
  if (/\b(auto|motors|tire|automotive|mechanic)/.test(n)) return "auto";
  if (/\b(plumb|electric|roof|heating|air|hvac|construction|builders?)\b/.test(n)) return "contractor";
  return null;
}
