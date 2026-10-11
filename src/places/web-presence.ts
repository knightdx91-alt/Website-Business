import { websiteProblem } from "./site-check.ts";
import { isDirectoryPage } from "./site-import.ts";
import type { Place } from "./client.ts";
import type { WebPresence } from "./qualify.ts";

/**
 * Google's business profile only tells us about the website linked ON the profile. A business can still have a page
 * somewhere else: its own domain that nobody linked, or a page on a parent company's site (Luna's BBQ lives on the
 * wedding venue's site). One web search per lead catches most of those, so the card never says "No website" when a
 * page exists. Brave Search is the provider (Worker secret BRAVE_SEARCH_API_KEY, free tier 2,000 queries a month, then
 * about $3 per 1,000). Without the key everything works as before.
 */

export interface WebResult {
  url: string;
  title: string;
  description?: string;
}

export interface FoundPage {
  url: string;
  host: string;
  title: string;
  /** The domain looks like theirs (the business name is in the host): a real website Google just isn't showing. */
  own: boolean;
}

/** Hosts that are never "their website": search engines, social, delivery, directories, job boards, local news. */
const IGNORED_HOSTS =
  /(^|\.)(google\.[a-z.]+|facebook\.com|instagram\.com|yelp\.com|yellowpages\.com|mapquest\.com|tripadvisor\.com|doordash\.com|grubhub\.com|ubereats\.com|seamless\.com|nextdoor\.com|bbb\.org|manta\.com|foursquare\.com|zomato\.com|menupix\.com|restaurantji\.com|allmenus\.com|linktr\.ee|tiktok\.com|x\.com|twitter\.com|youtube\.com|linkedin\.com|alignable\.com|chamberofcommerce\.com|cylex[a-z.-]*\.com|hotfrog\.com|superpages\.com|dexknows\.com|local\.com|411\.com|whitepages\.com|citysearch\.com|merchantcircle\.com|birdeye\.com|yellowbook\.com|findglocal\.com|zaubee\.com|sirved\.com|menuism\.com|untappd\.com|opentable\.com|slicelife\.com|toasttab\.com|squareup\.com|square\.site|booksy\.com|vagaro\.com|styleseat\.com|indeed\.com|glassdoor\.com|ziprecruiter\.com|zillow\.com|realtor\.com|angi\.com|homeadvisor\.com|thumbtack\.com|houzz\.com|porch\.com|bark\.com|yext\.com|wikipedia\.org|pinterest\.com|reddit\.com|threads\.net|snapchat\.com|apple\.com|bing\.com|waze\.com|cullmantimes\.com|cullmantribune\.com|cullmantoday\.com|cullmansense\.com|al\.com|waff\.com|whnt\.com|wbrc\.com|wvtm13\.com|patch\.com|newsbreak\.com|yahoo\.com|msn\.com|loopnet\.com|buzzfile\.com|dnb\.com|bizapedia\.com|opencorporates\.com|zoominfo\.com|crunchbase\.com|mapcarta\.com|cityfos\.com|ezlocal\.com|brownbook\.net|n49\.com|tupalo\.com|elocal\.com|insiderpages\.com|showmelocal\.com|yellowpagecity\.com|cybo\.com|businessyab\.com|nicelocal\.com|hubbiz\.com|placesmap\.net|wheree\.com|localstack\.com|opendi\.us|yably\.com|chamberorganizer\.com|eventbrite\.com|meetup\.com|amazon\.com|etsy\.com|ebay\.com|groupon\.com|uber\.com|lyft\.com|postmates\.com|caviar\.com|favor\.com|waitr\.com|waitrapp\.com|ezcater\.com|healthgrades\.com|zocdoc\.com|vitals\.com|avvo\.com|justia\.com|lawyers\.com|findlaw\.com|carfax\.com|cars\.com|autotrader\.com|repairpal\.com|mechanicadvisor\.com|yellowpagesgoesgreen\.org|us-business\.info|usa-company\.com|companylist\.org|poi-factory\.com|hours-guide\.com|storeopeninghours\.com|hoursopen\.org|openingtimes\.us)$/i;

const STOP = new Set(["the", "and", "of", "llc", "inc", "co", "company", "in", "at", "a", "an", "on", "by", "for", "with", "to", "&"]);

/** Lower-case words of a name, apostrophes folded ("Luna's" → "lunas"), stop words and corporate tails dropped. */
export function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w && !STOP.has(w));
}

const norm = (s: string) => ` ${s.toLowerCase().replace(/['’.]/g, "").replace(/[^a-z0-9]+/g, " ").trim()} `;

/**
 * The first result that is plausibly the business's own page: a domain carrying its name (own), or a page whose title
 * starts with the name and whose address or title carries the whole name (a page on someone else's site). Directories,
 * social, delivery and news hosts never count.
 */
export function pickPage(results: WebResult[], name: string): FoundPage | null {
  const tokens = nameTokens(name);
  if (!tokens.length) return null;
  const joined = tokens.join(" ");
  const first = tokens[0]!;
  const slug = tokens.join("");
  for (const r of results) {
    let u: URL;
    try {
      u = new URL(r.url);
    } catch {
      continue;
    }
    const host = u.hostname.replace(/^www\./, "");
    if (IGNORED_HOSTS.test(host) || /\.(gov|edu|mil)$/.test(host) || isDirectoryPage(r.url, r.title)) continue;
    // Judge "their own domain" by the registrable domain only: pops-cafe-hanceville.res-pick.com is a page on an ordering
    // platform (a page elsewhere), not their website, even though the subdomain carries the name.
    const registrable = host.split(".").slice(-2).join(".");
    const bare = registrable.replace(/\.[a-z]+$/, "").replace(/[^a-z0-9]/g, "");
    const carries = (b: string) => b.includes(slug) || (first.length >= 5 && b.includes(first)) || (tokens.length >= 2 && b.includes(tokens[0]! + tokens[1]!));
    if (carries(bare)) return { url: r.url, host, title: r.title, own: true };
    const sub = host.slice(0, host.length - registrable.length).replace(/[^a-z0-9]/g, "");
    if (sub && carries(sub)) return { url: r.url, host: registrable, title: r.title, own: false };
    const title = norm(r.title);
    const path = u.pathname.toLowerCase().replace(/[^a-z0-9]/g, "");
    const titleStarts = title.startsWith(` ${joined} `) || title.startsWith(` ${joined}`);
    const allInTitle = tokens.every((t) => title.includes(` ${t} `));
    const pathHas = path.includes(slug) || (first.length >= 5 && path.includes(first));
    if (titleStarts || (allInTitle && pathHas)) return { url: r.url, host, title: r.title, own: false };
  }
  return null;
}

/** "Hanceville" from "105 Main St NW, Hanceville, AL 35077, USA"; falls back to Cullman. */
export function townOf(address: string | undefined): string {
  const parts = (address ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 3) return parts[parts.length - 3]!.replace(/\s+\d{5}(-\d{4})?$/, "");
  return "Cullman";
}

export async function searchBrave(key: string, q: string, fetchFn: typeof fetch = fetch): Promise<WebResult[]> {
  const u = new URL("https://api.search.brave.com/res/v1/web/search");
  u.searchParams.set("q", q);
  u.searchParams.set("count", "10");
  u.searchParams.set("country", "us");
  u.searchParams.set("search_lang", "en");
  u.searchParams.set("text_decorations", "0");
  u.searchParams.set("safesearch", "moderate");
  const res = await fetchFn(u, { headers: { Accept: "application/json", "X-Subscription-Token": key }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Brave search ${res.status}`);
  const j = (await res.json()) as { web?: { results?: Array<{ url?: string; title?: string; description?: string }> } };
  return (j.web?.results ?? []).filter((r) => r.url && r.title).map((r) => ({ url: r.url!, title: r.title!, description: r.description }));
}

export interface Resolved {
  presence: WebPresence;
  /** Card wording, without the review count: "Page on stonebridgewedding.com, not linked from Google". */
  label: string;
  url: string;
}

/**
 * For a place whose Google profile shows no real website: one web search, then a decision. Their own domain → a working
 * site is `has_site` (callers skip it in runs), a broken one `outdated`; a page on another site → `elsewhere`. Null when
 * nothing is found or the search fails (never blocks a run).
 */
export async function resolvePresence(key: string | undefined, place: Pick<Place, "displayName" | "formattedAddress">, fetchFn: typeof fetch = fetch): Promise<Resolved | null> {
  const name = place.displayName?.text?.trim();
  if (!key || !name) return null;
  let found: FoundPage | null;
  try {
    found = pickPage(await searchBrave(key, `"${name}" ${townOf(place.formattedAddress)} AL`, fetchFn), name);
  } catch {
    return null;
  }
  if (!found) return null;
  if (!found.own) return { presence: "elsewhere", label: `Page on ${found.host}, not linked from Google`, url: found.url };
  const problem = await websiteProblem(found.url).catch(() => null);
  if (problem) return { presence: "outdated", label: `${problem} (site not linked from Google)`, url: found.url };
  return { presence: "has_site", label: `Has a website at ${found.host}, not linked from Google`, url: found.url };
}
