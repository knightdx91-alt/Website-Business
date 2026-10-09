import { smsHref, telHref } from "./phone.ts";
import type { IconName } from "./icons.ts";
import type { BusinessRecord } from "./types.ts";

export type ActionId = "call" | "text" | "directions" | "order" | "reserve" | "book" | "quote" | "menu" | "review" | "shop" | "portal";

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
    case "review":
      return { id, label: "Leave us a review", short: "Review", href: reviewUrl(r), external: true, icon: "star" };
  }
}

export function actions(r: BusinessRecord, ids: ActionId[]): Action[] {
  return ids.map((id) => action(r, id)).filter((a): a is Action => a !== null);
}
