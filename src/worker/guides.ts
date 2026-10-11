import { addonPrice, type AppSettings } from "./db.ts";
import { APP_ORIGIN } from "./tankboard.ts";

/**
 * In-app how-to guides (Settings → Guides; owner and callers), one source for the web app and the Android app
 * (`GET /api/guides/<id>`). Prices and names are filled from Settings so the guide never goes stale when a price changes.
 * The first guide is the inventory system built for King Fish Aquatics: live price page + Tank board + QR tags + display.
 */

export interface GuideSection {
  title: string;
  /** Short lines; numbered when `numbered`. */
  steps: string[];
  numbered?: boolean;
  /** A one-line "good to know" under the steps. */
  note?: string;
}

export interface Guide {
  id: string;
  title: string;
  intro: string;
  sections: GuideSection[];
}

export const GUIDE_IDS = ["tankboard"] as const;

const money = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;

export function tankBoardGuide(s: AppSettings): Guide {
  const list = s.plans.find((p) => p.id === "list" && p.monthly);
  const listLine = list ? `the ${list.name} plan, ${money(list.monthly)} a month, no minimum, cancel any time` : "the Price list plan (turn it on in Settings → Plans by giving it a price)";
  const tags = s.addons.find((a) => /price tag|shelf label/i.test(a.name));
  const tagLine = tags ? `${tags.name}: ${addonPrice(tags)}` : "QR price tags: an extra in Settings → Extras";
  const company = s.companyName || "Underground Associates";
  return {
    id: "tankboard",
    title: "🐠 Tank board, price page & QR tags",
    intro:
      "The inventory system for shops whose stock changes every day: fish stores, plant nurseries, produce stands, resale. The shop keeps a board on their phone (what's in each tank or on each shelf, prices, counts, photos, sold out). Every change goes to a price page on their website within about a minute. QR tags on the tanks open that tank's live prices, and a cheap tablet by a tank can show them with no QR at all. Built for King Fish Aquatics in October 2026.",
    sections: [
      {
        title: "The four pieces",
        steps: [
          "Price page: /prices/ on their website, one section per tank or shelf, each item with name, price, note and photo. Sold-out and zero-count items disappear; 5 or fewer shows \"3 left\".",
          "Tank board: a private page we text the shop. No login, no app. They edit it from any phone; changes save by themselves.",
          "QR price tags: a printable sheet of labels, one per tank or shelf. Each QR opens that tank's section of the price page.",
          "Tablet display: a full-screen page for a tablet or TV by the tank that shows that tank live and never sleeps.",
        ],
      },
      {
        title: "What we sell it for",
        steps: [
          `Just the inventory system, no website: ${listLine}. The agreement says plainly it is not a website plan.`,
          "With any website plan (Basic, Plus, Pro): the price page, Tank board and tablet display are included.",
          `${tagLine}. The first sheet is included with the ${list?.name ?? "Price list"} plan; reprints (renamed tanks, new tanks, wear) are a new sheet.`,
          "Tablets are the shop's own purchase. Any $40 to $80 Android tablet works. If you set them up for the shop, $99 each installed is fair.",
        ],
      },
      {
        title: "Set a shop up (owner or full access)",
        numbered: true,
        steps: [
          "Add the business: Home → ➕ Add a business → search their name → pick the Shops type. If they already have a lead, open it.",
          "Wait for the preview to build (a minute or two). Open the lead.",
          "Optional: start the list for them. Edit → Shop details → \"Price list & QR labels\": give it a title (\"Fish & prices\"), tick or untick \"Public\" (private keeps it off Google and out of the menu; the QR tags still work), and type sections and items the way you'd type a menu: a line \"# Tank 1\" then \"Neon tetra | $2.99 | Schooling, keep 6+\". Save.",
          "Or skip typing: the shop adds everything on the Tank board themselves (next section). Anything they add shows in Edit too, and anything you type in Edit shows on their board.",
          "Photos: the board takes them straight from the phone camera, so there's nothing to collect up front. Photos already in the gallery get matched to items by caption.",
        ],
        note: "Google's photos never go on the price page or a label. Only owner photos (board camera, gallery uploads, or photos imported from their own website).",
      },
      {
        title: "Give them the Tank board",
        numbered: true,
        steps: [
          "Open the lead → the \"🐠 Tank board\" card (it shows for every retail lead once the preview is ready).",
          "Tap \"💬 Text them their tank board link\". Your messaging app opens with the link and a short note; send it. Callers can do this too.",
          "Or tap \"Open it here\" to show it on your own phone first. It's a good demo: add a tank, tap the camera, mark something sold out, then open the price page and watch it change.",
          "Tell them: bookmark it or add it to the home screen (Chrome ⋮ → Add to Home screen). Anyone with the link can edit, so they should only share it with staff.",
          "If the link gets out: \"Revoke old links\" (owner) kills every link sent so far. Text them a new one.",
        ],
      },
      {
        title: "How the shop uses the board (what to show them)",
        steps: [
          "\"+ Add a tank\" at the bottom: name it the way the tank is labeled in the store (\"Tank 12\", \"Saltwater\", \"Plants\").",
          "\"+ Add to this tank\": name, price, how many, a note (size, pairs only, feeding). The camera button takes or picks a photo; it's resized on the phone so it uploads fast.",
          "\"In stock · tap if sold out\" flips to \"Sold out · tap when back\". Sold-out items vanish from the website until tapped back. Setting how many to 0 does the same; 5 or fewer shows \"n left\" on the page.",
          "▲ ▼ move a tank up or down; 🗑 removes an item or a whole tank (it asks first).",
          "Everything saves by itself. The top of the board says \"Saved ✓\" with the time, or tells them if their signal dropped.",
          "📺 on a tank opens that tank's display page; \"All tanks, rotating\" in the footer cycles through every tank.",
        ],
      },
      {
        title: "How a change reaches the website",
        numbered: true,
        steps: [
          "The board saves into the same price list you see in Edit, and the preview is rebuilt at once.",
          "The price page on their live site doesn't wait for a rebuild: it reads a small live feed of the list every time it loads, cached for 30 seconds. A QR scan at the tank shows the change within about a minute.",
          "The static copy of the live site is republished by itself a few minutes later, so Google sees the current list too. Nothing to tap.",
          "Call guides and the preview show the list too, so a caller never quotes a stale price.",
        ],
        note: "If the page looks stale, wait a minute and reload. A phone sometimes shows its cached copy on the first open.",
      },
      {
        title: "QR price tags",
        numbered: true,
        steps: [
          "The site has to be live first (the QR has to point at a real address). Publish, then on the lead's \"Client site\" card tap \"QR price tags\".",
          "It opens a PDF: Letter sheets, 8 labels per sheet (2 across, 4 down, 3.75 × 2.5 in), one label per tank or shelf, each with the shop name, the tank name and a QR to that tank's section.",
          "Print on sticker paper or card stock, laminate if it's near water, and stick one on each tank. Scan one with your own phone before you leave.",
          "When a tank is renamed or added, print again: the QR goes to the section by its name, so a renamed tank needs a new label. Removing items never needs a reprint.",
          "A private price list (\"Public\" unticked in Edit) still works from the labels; it just isn't linked from the menu or shown to Google.",
        ],
      },
      {
        title: "Tablet display",
        numbered: true,
        steps: [
          `Open the shop's board, tap 📺 on a tank, and copy that address (it looks like ${APP_ORIGIN}/d/<lead>/<tank>). Without a tank name at the end it rotates through every tank, 10 seconds each.`,
          "On the tablet: open that address in Chrome, then ⋮ → Add to Home screen. Open it from the icon so it fills the screen.",
          "Settings → Display → Screen timeout → never (or as long as it allows), and keep it plugged in. The page also asks the tablet to stay awake.",
          "To stop customers tapping out of it: Settings → Security → App pinning (name varies by phone), then pin Chrome.",
          "It refreshes by itself every 30 seconds and shrinks the text so a tank with 15 items still fits. Big price in orange, photo if there is one, \"3 left\" under the price.",
          "Mount it above the tank in a cheap stand or clamp, away from splash. One or two bigger tablets or a TV with a streaming stick near the register, rotating through all tanks, costs less than one tablet per tank.",
        ],
      },
      {
        title: "Selling it",
        steps: [
          "The opener: \"You change what's in these tanks every day. What if the price on the tank changed itself when you changed it on your phone?\"",
          "Show, don't tell: open the board on your phone, add a fish, then scan the demo QR or open the price page. Under a minute, in front of them.",
          `Price it simply: ${listLine}. If they take a website plan, it's included.`,
          "\"We don't need a website\": fine, start with the board and the tags. Every month on it counts toward a website later, and the price page just becomes part of the site.",
          "\"My staff will mess it up\": it only edits the price list, nothing else on the site. And \"Revoke old links\" shuts a leaked link off in one tap.",
          "\"We already use a whiteboard\": the whiteboard doesn't show up on Google, can't take a photo, and nobody at home can read it before they drive over.",
        ],
      },
      {
        title: "Trouble",
        steps: [
          "\"This link isn't valid any more\": the links were revoked, or the lead expired. Send a new one from the lead.",
          "Board says \"Couldn't save\": their signal dropped. The change isn't lost on screen; it saves when they touch anything again.",
          "Photo won't attach: the item needs a name first, and the photo must be under 8 MB (phones' own photos are fine; screenshots of screenshots sometimes aren't).",
          "\"Open price page\" is missing on the board: the site isn't live yet. The preview still shows the list.",
          "Price page not changing: wait a minute, pull to refresh. If a live site is more than 10 minutes behind, open the lead and tap \"Republish changes\".",
          "Labels scan to the wrong tank: the tank was renamed after printing. Print the sheet again.",
          `Anything else: text ${company} from the lead's call log so the whole team sees it.`,
        ],
      },
    ],
  };
}

export function guideById(id: string, s: AppSettings): Guide | null {
  return id === "tankboard" ? tankBoardGuide(s) : null;
}
