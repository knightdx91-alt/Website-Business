import { smsHref, telHref } from "./phone.ts";
import type { IconName } from "./icons.ts";
import type { BusinessRecord } from "./types.ts";

export type ActionId = "call" | "text" | "directions" | "order" | "reserve" | "book" | "quote" | "menu" | "review" | "shop" | "portal" | "visit" | "watch" | "give" | "donate" | "help" | "join" | "rent";

export interface Action {
  id: ActionId;
  label: string;
  /** Shorter label for the mobile action bar. */
  short: string;
  href: string;
  external: boolean;
  icon: IconName;
}

const PROVIDERS: Array<[RegExp, string]> = [
  [/toasttab\.com/, "Toast"],
  [/square\.site|squareup\.com/, "Square"],
  [/clover\.com/, "Clover"],
  [/chownow\.com/, "ChowNow"],
  [/order\.online|doordash\.com/, "DoorDash"],
  [/slicelife\.com/, "Slice"],
  [/menufy\.com/, "Menufy"],
  [/ubereats\.com/, "Uber Eats"],
  [/opentable\.com/, "OpenTable"],
  [/resy\.com/, "Resy"],
  [/exploretock\.com/, "Tock"],
  [/servicetitan\.com/, "ServiceTitan"],
  [/housecallpro\.com/, "Housecall Pro"],
  [/getjobber\.com|jobber\.com/, "Jobber"],
  [/calendly\.com/, "Calendly"],
  [/booksy\.com/, "Booksy"],
  [/vagaro\.com/, "Vagaro"],
];

/** Free estimates only show when the owner has confirmed them, in whichever category the business is. */
export function freeEstimates(r: BusinessRecord): boolean {
  const e = r.ext;
  return !!(e.contractor?.freeEstimates || e.auto?.freeEstimates || e.landscaping?.freeEstimates || e.cleaning?.freeEstimates);
}

/** A shop's Donations section is on by default for thrift stores; any other shop can turn it on from Edit. */
export function donationsOn(r: BusinessRecord): boolean {
  return r.category === "retail" && (r.ext.retail?.donations?.enabled ?? r.variant === "thrift");
}

export function detectProvider(url: string): string | undefined {
  return PROVIDERS.find(([re]) => re.test(url))?.[1];
}

export function directionsUrl(r: BusinessRecord): string {
  const q = encodeURIComponent(r.showStreetAddress && r.address.street ? `${r.name}, ${r.address.street}, ${r.address.city}, ${r.address.state}` : r.name);
  return `https://www.google.com/maps/search/?api=1&query=${q}&query_place_id=${encodeURIComponent(r.placeId)}`;
}

export function reviewUrl(r: BusinessRecord): string {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(r.placeId)}`;
}

/** The one place every CTA link is built. Returns null when the data for an action is missing. */
export function action(r: BusinessRecord, id: ActionId): Action | null {
  switch (id) {
    case "call":
      return { id, label: `Call ${r.phone.display}`, short: "Call", href: telHref(r.phone.e164), external: false, icon: "phone" };
    case "text":
      return r.smsEnabled ? { id, label: "Text us", short: "Text", href: smsHref(r.phone.e164), external: false, icon: "message" } : null;
    case "directions":
      return { id, label: "Get directions", short: "Directions", href: directionsUrl(r), external: true, icon: "pin" };
    case "order":
      return r.links.order ? { id, label: "Order online", short: "Order", href: r.links.order, external: true, icon: "bag" } : null;
    case "reserve":
      return r.links.reserve ? { id, label: "Reserve a table", short: "Reserve", href: r.links.reserve, external: true, icon: "calendar" } : null;
    case "book":
      return r.links.booking ? { id, label: r.category === "finance" ? "Book an appointment" : "Book online", short: "Book", href: r.links.booking, external: true, icon: "calendar" } : null;
    case "quote": {
      if (r.category === "finance") {
        const ins = r.variant === "insurance";
        return { id, label: ins ? "Get a quote" : "Request a call back", short: ins ? "Quote" : "Call back", href: "#contact", external: false, icon: "clipboard" };
      }
      if (r.category === "auto" && r.variant === "parts") return { id, label: "Reserve a part", short: "Reserve", href: "#reserve", external: false, icon: "clipboard" };
      if (r.category === "auto" && r.variant === "tire") return { id, label: "Get a tire quote", short: "Tire quote", href: "#contact", external: false, icon: "clipboard" };
      const free = freeEstimates(r);
      const label = free ? (r.category === "contractor" || r.category === "auto" ? "Get a free estimate" : "Get a free quote") : r.category === "auto" ? "Request an appointment" : r.category === "contractor" ? "Request service" : r.category === "print" ? "Get a quote" : "Request a quote";
      return { id, label, short: free ? (r.category === "contractor" || r.category === "auto" ? "Estimate" : "Free quote") : r.category === "auto" ? "Request" : "Quote", href: "#contact", external: false, icon: "clipboard" };
    }
    case "menu":
      return { id, label: "View menu", short: "Menu", href: "/menu/", external: false, icon: "list" };
    case "shop": {
      const url = r.ext.retail?.shopUrl;
      if (!url) return null;
      const florist = r.category === "retail" && r.variant === "florist";
      return { id, label: florist ? "Order flowers" : "Shop online", short: florist ? "Order" : "Shop", href: url, external: true, icon: "bag" };
    }
    case "portal": {
      const url = r.ext.finance?.portalUrl;
      if (!url) return null;
      return { id, label: r.variant === "tax_prep" ? "Upload your documents" : "Client portal", short: r.variant === "tax_prep" ? "Upload" : "Portal", href: url, external: true, icon: "clipboard" };
    }
    case "visit": {
      // The church's own Plan-a-visit form (Church Center, Tithely…) wins over our anchor when they have one.
      const own = r.ext.church?.planVisitUrl;
      if (own) return { id, label: "Plan a visit", short: "Visit", href: own, external: true, icon: "calendar" };
      return { id, label: r.ext.church?.tradition === "catholic" ? "Mass times" : "Plan a visit", short: r.ext.church?.tradition === "catholic" ? "Mass" : "Visit", href: r.ext.church?.tradition === "catholic" ? "#times" : "#plan", external: false, icon: "calendar" };
    }
    case "watch":
      return r.ext.church?.liveUrl ? { id, label: "Watch live", short: "Watch", href: r.ext.church.liveUrl, external: true, icon: "arrow" } : null;
    case "give":
      return r.ext.church?.givingUrl ? { id, label: "Give online", short: "Give", href: r.ext.church.givingUrl, external: true, icon: "check" } : null;
    case "donate":
      if (r.category === "retail") return donationsOn(r) ? { id, label: "Donate items", short: "Donate", href: "#donations", external: false, icon: "bag" } : null;
      return r.ext.church?.donateUrl ? { id, label: "Donate", short: "Donate", href: r.ext.church.donateUrl, external: true, icon: "check" } : null;
    case "help":
      return { id, label: "Get help", short: "Get help", href: "#help", external: false, icon: "list" };
    case "join":
      return r.ext.church?.joinUrl ? { id, label: "Join", short: "Join", href: r.ext.church.joinUrl, external: true, icon: "calendar" } : { id, label: "Visit a meeting", short: "Meetings", href: "#join", external: false, icon: "calendar" };
    case "rent":
      return { id, label: "Rent the hall", short: "Rent", href: "#hall", external: false, icon: "calendar" };
    case "review":
      return { id, label: "Leave us a review", short: "Review", href: reviewUrl(r), external: true, icon: "star" };
  }
}

export function actions(r: BusinessRecord, ids: ActionId[]): Action[] {
  return ids.map((id) => action(r, id)).filter((a): a is Action => a !== null);
}
