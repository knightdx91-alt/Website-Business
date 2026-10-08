import type { CategoryId } from "../generator/types.ts";
import type { Place } from "./client.ts";

export type WebPresence = "none" | "social" | "free_builder" | "has_site" | "outdated";

const SOCIAL = /(^|\.)(facebook\.com|fb\.com|fb\.me|instagram\.com|linktr\.ee|tiktok\.com|twitter\.com|x\.com|yelp\.com|nextdoor\.com|business\.site|g\.page)$/i;
const FREE_BUILDER = /(^|\.)(wixsite\.com|weebly\.com|godaddysites\.com|square\.site|webnode\.com|jimdosite\.com|carrd\.co|sites\.google\.com)$/i;

export function webPresence(websiteUri: string | undefined): WebPresence {
  if (!websiteUri) return "none";
  let host: string;
  try {
    host = new URL(websiteUri).hostname;
  } catch {
    return "none";
  }
  if (SOCIAL.test(host)) return "social";
  if (FREE_BUILDER.test(host)) return "free_builder";
  return "has_site";
}

const CHAINS = [
  "mcdonald", "wendy", "subway", "taco bell", "burger king", "chick-fil-a", "sonic drive", "arby", "hardee", "kfc", "zaxby",
  "waffle house", "cracker barrel", "starbucks", "dunkin", "domino", "pizza hut", "papa john", "little caesars", "jack's",
  "dairy queen", "krystal", "popeyes", "whataburger", "applebee", "chili's", "logan's", "mellow mushroom", "moe's", "lawlers",
  "dreamland", "jim 'n nick", "huddle house", "captain d", "panda express", "cook out", "five guys", "jersey mike", "firehouse subs",
  "wingstop", "buffalo wild wings", "olive garden", "outback", "longhorn", "texas roadhouse", "golden corral", "ihop", "denny",
  "bojangles", "church's", "hibachi express", "tropical smoothie", "smoothie king", "marco's", "hungry howie",
  "roto-rooter", "mr. rooter", "mister sparky", "one hour heating", "benjamin franklin", "ars rescue", "service experts",
  "lowe's", "home depot", "mr. electric", "rainbow restoration", "servpro", "molly maid", "merry maids", "the grounds guys",
  "hunt brothers", "the ups store", "fedex office", "office depot", "officemax", "staples", "fastsigns", "signarama", "minuteman press",
  "alphagraphics", "sir speedy", "speedpro", "big frog", "hobby lobby", "walmart", "rural king", "tractor supply", "southern states",
  "tj maxx", "homegoods", "kirkland's", "goodwill", "plato's closet", "ashley furniture", "ashley homestore", "rooms to go", "bassett", "farmers home furniture",
  "petsense", "hollywood feed", "dollar general", "family dollar", "maurices", "cato fashions", "rue21", "hibbett", "1-800-flowers",
];

export function isChain(name: string): boolean {
  const n = name.toLowerCase().replace(/[’‘]/g, "'");
  return CHAINS.some((c) => n.includes(c));
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

/**
 * Keeps operational, non-chain places with a phone and no real website. Ranks likely buyers first.
 * With includeSites, places that have a website come back too, for the caller to check (see site-check.ts). */
export function qualify(places: Place[], opts: { includeFreeBuilder?: boolean; includeSites?: boolean } = {}): QualifiedLead[] {
  const seen = new Set<string>();
  const out: QualifiedLead[] = [];
  for (const p of places) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    const name = p.displayName?.text ?? "";
    if (!name || isChain(name)) continue;
    if (p.businessStatus !== "OPERATIONAL") continue;
    if (!p.nationalPhoneNumber) continue;
    const presence = webPresence(p.websiteUri);
    if (!opts.includeSites && (presence === "has_site" || (presence === "free_builder" && !opts.includeFreeBuilder))) continue;
    const count = p.userRatingCount ?? 0;
    const score = scorePlace(p, presence);
    const reason =
      presence === "none"
        ? `No website · ${count} Google reviews`
        : presence === "social"
          ? `Only a social page · ${count} Google reviews`
          : `Free-builder site · ${count} Google reviews`;
    out.push({ place: p, presence, score, reason });
  }
  return out.sort((a, b) => b.score - a.score);
}

const TYPE_CATEGORY: Array<[RegExp, CategoryId]> = [
  [/restaurant|cafe|coffee|bakery|meal_|food|bar_and_grill|diner|deli|ice_cream|donut|sandwich|pizza|steak|barbecue/, "restaurant"],
  [/hair|barber|beauty|nail|pet_care|pet_groom|spa$|massage/, "salon"],
  [/car_repair|auto|tire|transmission|oil_change|car_dealer|car_wash/, "auto"],
  [/plumb|electric|roofing|contractor|hvac|heating|painter|locksmith|moving|handyman/, "contractor"],
  [/florist|clothing_store|gift_shop|furniture_store|thrift_store|flea_market|home_goods_store|shoe_store|garden_center/, "retail"],
];

/** Best-guess template for a Places result (the owner can change it before adding). */
export function guessCategory(p: Place): CategoryId | null {
  const n = (p.displayName?.text ?? "").toLowerCase();
  if (/\b(collision|body shop|paint (&|and) body|detail|wrecker|towing|small engine|mower repair)/.test(n)) return "auto";
  if (/\b(lawn|landscap|mowing|sod|irrigation)/.test(n)) return "landscaping";
  if (/\b(clean|maid|janitor|(pressure|power|soft) ?wash)/.test(n)) return "cleaning";
  if (/\b(massage|day spa|bodywork)/.test(n)) return "salon";
  if (/screen ?print|embroider|monogram|\bsigns?\b|banners?|vinyl|decals|t-?shirts|\bprint(ing|ers)?\b|graphics/.test(n)) return "print";
  if (/\b(boutique|gifts?|antiques?|thrift|consign|flowers?|florist|floral|feed|seed|furniture|mercantile|vintage)\b/.test(n)) return "retail";
  if (/\b(paint|concrete|fenc|pest|termite|remodel|appliance|tree|stump)/.test(n)) return "contractor";
  if (/\b(food truck|truck|grill|bbq|cafe|kitchen|diner|taco|pizza)/.test(n)) return "restaurant";
  for (const t of [p.primaryType ?? "", ...(p.types ?? [])]) {
    for (const [re, cat] of TYPE_CATEGORY) if (re.test(t)) return cat;
  }
  if (/\b(salon|barber|nails?|groom)/.test(n)) return "salon";
  if (/\b(auto|motors|tire|automotive|mechanic)/.test(n)) return "auto";
  if (/\b(plumb|electric|roof|heating|air|hvac|construction|builders?)\b/.test(n)) return "contractor";
  return null;
}
