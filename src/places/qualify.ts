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
  [/hair|barber|beauty|nail|pet_care|pet_groom|spa$/, "salon"],
  [/car_repair|auto|tire|transmission|oil_change|car_dealer/, "auto"],
  [/plumb|electric|roofing|contractor|hvac|heating|painter|locksmith|moving|handyman/, "contractor"],
];

/** Best-guess template for a Places result (the owner can change it before adding). */
export function guessCategory(p: Place): CategoryId | null {
  const n = (p.displayName?.text ?? "").toLowerCase();
  if (/\b(lawn|landscap|mowing|tree service|sod|irrigation)/.test(n)) return "landscaping";
  if (/\b(clean|maid|janitor|pressure wash)/.test(n)) return "cleaning";
  if (/\b(food truck|truck|grill|bbq|cafe|kitchen|diner|taco|pizza)/.test(n)) return "restaurant";
  for (const t of [p.primaryType ?? "", ...(p.types ?? [])]) {
    for (const [re, cat] of TYPE_CATEGORY) if (re.test(t)) return cat;
  }
  if (/\b(salon|barber|nails?|groom)/.test(n)) return "salon";
  if (/\b(auto|motors|tire|automotive|mechanic)/.test(n)) return "auto";
  if (/\b(plumb|electric|roof|heating|air|hvac|construction|builders?)\b/.test(n)) return "contractor";
  return null;
}
