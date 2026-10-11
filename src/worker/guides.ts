import { addonPrice, type AppSettings } from "./db.ts";
import { escHtml, page } from "./page.ts";
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

export const GUIDE_IDS = ["tankboard", "pricetags", "display"] as const;

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


export function priceTagsGuide(s: AppSettings): Guide {
  const tags = s.addons.find((a) => /price tag|shelf label/i.test(a.name));
  const tagName = tags?.name ?? "QR price tags & shelf labels";
  const tagPrice = tags ? addonPrice(tags) : "the price in Settings → Extras";
  const list = s.plans.find((p) => p.id === "list" && p.monthly);
  const company = s.companyName || "Underground Associates";
  return {
    id: "pricetags",
    title: "🏷️ QR price tags (the extra)",
    intro:
      `A printed sheet of labels, one per tank, shelf or rack. Each label carries a QR code that opens that section of the shop's live price page, so a price change on the website is a price change on the shelf, and nobody rewrites a tag. Sold as the extra "${tagName}" (${tagPrice}); the first sheet is included with the ${list?.name ?? "Price list"} plan. Only shops (the Shops type) have a price list, so only they can get tags.`,
    sections: [
      {
        title: "What a sheet is",
        steps: [
          "Letter paper, 8 labels per sheet: 2 across, 4 down, each 3.75 × 2.5 inches, with light cut lines between them.",
          "Each label: a big QR code on the left; on the right the section name (\"Tank 12\", \"Perennials\"), \"Scan for today's prices\", the shop's name and its web address.",
          "One label per section of the price list, in the order the sections are in. 9 to 16 sections = 2 sheets, and so on. A sheet is a price unit, so a shop with 20 tanks buys 3 sheets.",
          "The QR opens the live price page straight at that section. The page reads the live list every time it loads, so the tag never goes out of date unless the section is renamed.",
        ],
      },
      {
        title: "Before you can print",
        numbered: true,
        steps: [
          "The shop's site has to be live: the QR points at the real address (their own domain if one is attached, else the pages.dev address). The button says \"Publish the site first\" until then.",
          "The price list needs at least one section: Edit → Shop details → \"Price list & QR labels\", or the shop adds tanks on their Tank board. Each section becomes one label.",
          "Check the section names read well on a 1.35-inch-wide line: \"Tank 12\" is good, \"Freshwater community tanks, left wall\" wraps and gets small. Rename in Edit or on the board; the page and the label follow.",
          "A private price list (\"Public\" unticked) is fine: the labels still open it. It just isn't in the site's menu or on Google.",
        ],
      },
      {
        title: "Print the sheet",
        numbered: true,
        steps: [
          "Open the lead → \"Client site\" card → \"QR price tags\". The PDF opens (on the phone it opens in the app's PDF viewer with Print and Share).",
          "Print at 100% (\"Actual size\", not \"Fit to page\"), colour or black and white both scan.",
          "Paper: full-sheet sticker paper (Avery 8165 or any 8.5 × 11 label sheet) and cut on the lines, or card stock in a sleeve. Near water, run the cut labels through a laminator or use clear packing tape over the QR.",
          "Scan every label once with your own phone camera before you hand them over. If one won't scan, print that sheet again at a slightly larger scale; the QR has room.",
          "Hand them over with the tank names in order so they go on the right tanks. Or stick them on yourself; it takes five minutes and the shop remembers it.",
        ],
        note: "The agreement says the shop approves the layout before printing: show them the PDF on your phone first and get a yes.",
      },
      {
        title: "When to print again",
        steps: [
          "A section was renamed: the QR goes to the section by its name, so the old label points at a section that no longer exists (the page just opens at the top). Print again.",
          "A tank or shelf was added: print again; the new sheet has every section, so swap only the new label.",
          "Items changed, prices changed, sold out, photos: never. That is the whole point.",
          "Wear, water, sun: print again. Laminated labels last a year or more by a tank; paper lasts weeks.",
          `Pricing: reprints after a section change are at cost, per the agreement. A courtesy reprint for a good client is cheaper than the call about the broken tag. A new sheet for new tanks is a normal ${tagPrice.replace(/^\$/, "$")} purchase.`,
        ],
      },
      {
        title: "How to sell it",
        numbered: true,
        steps: [
          `At sign-up: it's in the extras list on the sign-up page and in the in-person sign-up on the phone (tick it, set the quantity to the number of sheets). On the ${list?.name ?? "Price list"} plan the first sheet is already included, so only add it for a second sheet.`,
          "After the sale: open the client → \"💬 Text 'Buy extras' link\". They tick the tags, pick how many sheets, sign and pay online. Or they tap \"Already a client? Add extras\" on our website and it lands in the Inbox.",
          "Quantity = sheets, not labels. Count their sections first: 8 or fewer is one sheet.",
          "Pair it with the Tank board: \"Your phone changes the price; the tag on the tank is already right.\" Then scan one in front of them.",
          "Who buys it: fish and reptile stores, plant nurseries, antique malls with booth numbers, farm and feed stores, produce stands, resale with sections, bakery cases. Anything with a section name you can stick a label on.",
          "Not for: restaurants (they get QR table tents and the menu instead), service businesses (no price list).",
        ],
      },
      {
        title: "After they pay",
        numbered: true,
        steps: [
          "The purchase shows on the client's lead screen under their sign-up with the signed extras agreement; it's marked paid by Stripe when the card goes through (Inbox requests from the website need you to send the Buy extras link or take payment in person).",
          "Print the sheets from the \"QR price tags\" button, scan-test, deliver. Log it in the call log (\"Delivered 2 sheets of tags\") so the whole team knows.",
          "Set a task for 30 days out: \"Check King Fish's tags\" with the lead attached. A quick look catches a renamed tank before customers do.",
        ],
      },
      {
        title: "Trouble",
        steps: [
          "\"Publish the site first\": the site isn't live. Publish from the lead, or if it's a Price list client that's not live yet, publish now; the plan only promises the price page but the whole site goes up.",
          "\"Add a price list first\": no sections yet. Edit → Shop details, or the Tank board.",
          "QR opens the page but not the right section: the section was renamed since printing. Reprint.",
          "QR opens a 404 or an old domain: a custom domain was attached or removed after printing. Reprint; the labels carry the domain.",
          "QR won't scan: printed too small (\"Fit to page\" shrinks it), glossy lamination glare, or a crease through the code. Print at 100%, matte lamination, flat.",
          `Anything else: text ${company} from the client's call log so everyone sees it.`,
        ],
      },
    ],
  };
}

export function displayGuide(s: AppSettings): Guide {
  const list = s.plans.find((p) => p.id === "list" && p.monthly);
  const company = s.companyName || "Underground Associates";
  return {
    id: "display",
    title: "📺 Tablet display by the tank",
    intro:
      `A full-screen page for a cheap tablet or a TV in the shop that shows one tank (or every tank in turn) live: big name, big orange price, the photo, "3 left" when stock is low. It reads the same live list the Tank board writes, refreshes itself every 30 seconds and keeps the screen awake, so the customer standing at the tank sees the price without scanning anything. It costs us nothing to give, so it is included with the ${list?.name ?? "Price list"} plan and every website plan; the hardware is the shop's.`,
    sections: [
      {
        title: "What it shows",
        steps: [
          "One tank: the tank name as the heading, the shop name small on the right, and a card per item: photo (or a fish mark when there is none), name, note, the price in big orange type, \"n left\" under the price when 5 or fewer are left.",
          "Sold-out and zero-count items are gone, exactly like the price page. A tank with nothing in stock says \"Sold out for now. Ask us what's coming.\"",
          "Every tank, rotating: the same card layout, a new tank every 10 seconds, with dots at the bottom showing which one is up.",
          "It shrinks the text so a tank with 15 items still fits with nothing cut off, and goes to two columns on a wide screen.",
          "Bottom left: \"Updated\" with the time of the last change on the board. Dark background, no cursor, nothing to tap.",
        ],
      },
      {
        title: "Getting the address",
        numbered: true,
        steps: [
          "Open the shop's lead → 🐠 Tank board → \"Open it here\" (or open the link you texted them).",
          "Each tank has a 📺 at the right of its name. Tapping it opens that tank's display page; copy the address from the browser bar. It looks like " + APP_ORIGIN + "/d/<lead>/<tank-name>.",
          "For every tank in turn, use the \"All tanks, rotating\" link in the board's footer: the same address without the tank name on the end.",
          "The address works without a login (it shows nothing but what the price page shows), so it can be typed into any tablet, phone or TV browser. It is hidden from Google.",
        ],
        note: "The tank part of the address is the tank's name. Rename the tank and the old address shows nothing: set the tablet up again with the new 📺 link.",
      },
      {
        title: "Set up a tablet",
        numbered: true,
        steps: [
          "Any Android tablet from about $40 to $80 works (Walmart onn., Amazon Fire with the Silk browser, an old phone). An iPad works too. Wi-Fi is all it needs.",
          "Open the address in Chrome (Fire: Silk). Menu ⋮ → \"Add to Home screen\". Open it from that icon so it fills the screen with no browser bar.",
          "Settings → Display → Screen timeout: the longest it allows or \"Never\". The page asks the screen to stay awake too, but the tablet's own setting is what you can trust. Turn brightness down a notch; it's on all day.",
          "Keep it plugged in. A tablet on battery dies by mid-afternoon.",
          "Stop customers tapping out of it: Settings → Security → \"App pinning\" (Samsung: \"Pin windows\"; Fire: \"Enable Fire for Kids\" or just the home-screen icon). Pin Chrome. Hold Back + Overview to unpin.",
          "Pick the right address for that screen: the one tank it sits on, or the rotating page for a screen at the register or the door.",
        ],
      },
      {
        title: "Mounting and placement",
        steps: [
          "Above the tank, not in front of it: a $10 acrylic tablet stand on the top rim, a clamp mount on the stand's frame, or a wall mount behind the tank. Away from the splash line and the lid.",
          "One tablet per tank adds up fast. Most shops do better with one or two larger screens: a 10-inch tablet or a TV with a $30 streaming stick (open the rotating address in its browser) near the register or the front door, plus QR tags on every tank.",
          "Eye level for an adult standing at the tank, and tilted down a little so the overhead lights don't glare on it.",
          "Run the charging cable so nobody trips on it and it never crosses the water. A short right-angle cable and a cable clip do it.",
          "Fish rooms are humid: a tablet in a cheap silicone case lasts longer. Wipe the screen with a dry cloth; no sprays.",
        ],
      },
      {
        title: "What the shop needs to know",
        steps: [
          "They never touch the display. Every change is made on the Tank board; the screen follows within about 30 seconds.",
          "If the screen looks stale, it has probably lost Wi-Fi. Tap it, swipe down to reload, or power it off and on. The page comes back by itself.",
          "Renaming a tank on the board means that tank's screen needs the new 📺 link once. Adding items, prices, photos and sold out never need anything.",
          "The rotating page always shows every tank, so a new tank joins it on its own.",
          "A screen can be moved to another tank by opening that tank's 📺 link on it.",
        ],
      },
      {
        title: "Selling it (it's free, so sell the plan)",
        steps: [
          "The line: \"Change the price on your phone, and the sign on the tank changes too.\" Then hold your phone next to a tablet and show it: mark something sold out, watch it vanish from the screen.",
          `It's included with the ${list?.name ?? "Price list"} plan and every website plan. You're selling the plan; the display is the part they'll remember.`,
          "If you set the tablets up for them (buy, mount, configure), $99 per tablet installed is fair: about $60 of hardware and 20 minutes of your time. Add it to the invoice as a one-off, or quote it by hand; it isn't a listed extra.",
          "Pair it with QR tags: the screen for the person at the tank, the tag for the person who wants to take the price home.",
          "Good fits: fish and reptile stores, plant nurseries (a screen per bench), produce stands, bakery cases, antique malls (booth map at the door), feed stores (a screen by the bulk bins).",
        ],
      },
      {
        title: "Trouble",
        steps: [
          "\"Nothing on the board yet\": the shop hasn't added any tanks, or the address has a tank name that no longer exists (renamed). Open the current 📺 link.",
          "Screen asleep: the tablet's own screen timeout is on. Settings → Display → Screen timeout → Never, and keep it plugged in.",
          "Prices not changing: no Wi-Fi. Reload once; if it stays stale, the tablet has dropped off the network.",
          "Page shows the browser bar or someone opened another app: open it from the home-screen icon, and turn on app pinning.",
          "Text too small or cut off: it shrinks to fit 15 or so items. Past that, split the tank into two sections on the board (\"Tank 4 top\", \"Tank 4 bottom\").",
          "Photos missing on the screen but on the board: photos taken on the board show within a minute; a photo uploaded in Edit shows after the next save on the board or Edit.",
          `Anything else: text ${company} from the client's call log so everyone sees it.`,
        ],
      },
    ],
  };
}

export function guideById(id: string, s: AppSettings): Guide | null {
  if (id === "tankboard") return tankBoardGuide(s);
  if (id === "pricetags") return priceTagsGuide(s);
  if (id === "display") return displayGuide(s);
  return null;
}


/** A customer-facing page (Show them the Tank board): what it is for them, what they do, what we do, what it costs. */
export interface CustomerPitch {
  title: string;
  lead: string;
  sections: GuideSection[];
  /** Price lines, already filled from Settings. */
  price: string[];
  fine: string;
}

export function customerBoardPitch(s: AppSettings, o: { business: string; live: boolean }): CustomerPitch {
  const list = s.plans.find((p) => p.id === "list" && p.monthly);
  const site = s.plans.filter((p) => p.id !== "list" && p.monthly);
  const cheapest = site.length ? site.reduce((a, p) => (p.monthly < a.monthly ? p : a)) : null;
  const tags = s.addons.find((a) => /price tag|shelf label/i.test(a.name));
  const company = s.companyName || "Underground Associates";
  const you = o.business || "your shop";
  return {
    title: `What's in the tank, on your phone and on the tank`,
    lead: `${you} changes what's in its tanks every day. Here's how the price on the tank keeps up by itself: you change it on your phone, and the tag on the tank, the screen by the tank and your website all change with it.`,
    sections: [
      {
        title: "How it works",
        numbered: true,
        steps: [
          "We text you a private link: your Tank board. It opens on any phone. No app to install, no password to remember.",
          "The board lists your tanks (or shelves). For each one you type what's in it, the price, how many, and snap a photo if you like.",
          "Every change saves by itself and shows on your website's price page within about a minute.",
          "A small QR tag on each tank opens that tank's live prices on a customer's phone. A cheap tablet by the tank can show them too, no scanning.",
        ],
      },
      {
        title: "What you do",
        steps: [
          "Something new comes in: open the board, tap \"+ Add to this tank\" under that tank, and fill in the two boxes: what it is and what it costs. Twenty seconds.",
          "Something sells out: tap \"Sold out\". It disappears from the page until you tap it back. Or just type how many are left; at 5 or fewer the page says \"3 left\".",
          "Want a picture? Tap the camera on the item and take one right there at the tank.",
          "Prices change: change the number. Nobody rewrites a tag, nobody reprints anything.",
          "That's all. You never touch the website, and anyone on your staff with the link can do it.",
        ],
      },
      {
        title: "What your customers get",
        steps: [
          "At the tank: scan the tag or glance at the screen and see exactly what's in it today, with prices and photos.",
          "At home: your price page shows up with your website on Google, so people check what you have before they drive over, and call about the fish they want.",
          "Fewer \"how much is this one?\" questions, and no arguing about a price on an old tag.",
        ],
      },
      {
        title: `What ${company} does`,
        steps: [
          "Set up your price page and your board, and load your first tanks with you if you want.",
          "Print your QR tags (one per tank), and set up a tablet for you if you'd like one.",
          "Keep it all running: hosting, security, backups, and reprints when you rename or add a tank.",
          "Answer by text. Anything odd, you text us and we fix it.",
        ],
      },
    ],
    price: [
      list ? `Just the price page, board and tags: ${list.name}, $${list.monthly} a month. No minimum; cancel any time.${tags ? ` Your first sheet of QR tags is included.` : ""}` : "Ask us about the Price list plan.",
      cheapest ? `With a full website: included in every website plan, from $${cheapest.monthly} a month.` : "Included with every website plan.",
      tags ? `More QR tag sheets (8 tags each): ${addonPrice(tags)}.` : "QR tags are an extra.",
      "A tablet by the tank: any $40 to $80 tablet works; we'll set it up.",
    ],
    fine: o.live
      ? "Your price page is live now. Add a tank on the board and watch it change."
      : "Your website isn't live yet; the board and the preview work today, and the tags are printed once it's live (within 3 business days of your go-ahead).",
  };
}


const PITCH_CSS = `
.pitch{max-width:760px;margin:0 auto;padding:8px 16px 40px;color:#16181d}
.pitch h1{color:#14213d;font-size:clamp(1.5rem,6vw,2.2rem);line-height:1.15;margin:12px 0 8px}
.pitch .lead{color:#4f5663;font-size:1.08rem;margin:0 0 18px}
.pitch section{border:2px solid #e1e4ea;border-radius:16px;padding:16px 18px;margin:0 0 12px;background:#fff}
.pitch h2{margin:0 0 6px;color:#14213d;font-size:1.2rem}
.pitch ul,.pitch ol{margin:0;padding-left:22px}.pitch li{padding:5px 0}
.pitch .box{background:#f4f5f8;border:0}
.pitch .btns{display:grid;gap:10px}.pitch .btn{display:block;text-align:center;padding:14px;border-radius:12px;font-weight:800;text-decoration:none;background:#eef1f6;color:#14213d}
.pitch .btn--go{background:#14213d;color:#fff}
.pitch .fine{color:#4f5663;font-size:.95rem;margin:14px 0 0}
.pitch .co{color:#4f5663;font-size:.9rem;margin-top:18px}
`;

/**
 * The public, texted version of "Show them the Tank board" (`/b/<leadId>.<exp>.<sig>`): the same words, with buttons to open
 * their own board (their private link), the tablet view, and our pricing page.
 */
export function customerPitchPage(p: CustomerPitch, o: { business: string; company: string; phone?: string; boardUrl: string; displayUrl: string; pricingUrl: string }): Response {
  const e = escHtml;
  const sec = (x: GuideSection) => `<section><h2>${e(x.title)}</h2><${x.numbered ? "ol" : "ul"}>${x.steps.map((t) => `<li>${e(t)}</li>`).join("")}</${x.numbered ? "ol" : "ul"}></section>`;
  const body = `<main class="pitch">
<h1>${e(p.title)}</h1><p class="lead">${e(p.lead)}</p>
${p.sections.map(sec).join("")}
<section class="box"><h2>What it costs</h2><ul>${p.price.map((t) => `<li>${e(t)}</li>`).join("")}</ul></section>
<section class="box"><h2>Try it</h2><div class="btns">
<a class="btn btn--go" href="${e(o.boardUrl)}">🐠 Open your Tank board</a>
<a class="btn" href="${e(o.displayUrl)}" target="_blank" rel="noopener">📺 See the tablet view</a>
<a class="btn" href="${e(o.pricingUrl)}" target="_blank" rel="noopener">📋 Plans and prices</a>
${o.phone ? `<a class="btn" href="sms:+1${e(o.phone.replace(/\D/g, "").replace(/^1/, ""))}">💬 Text us a question</a>` : ""}</div>
<p class="fine">Your Tank board link is private: anyone with it can change your prices, so share it only with your staff. Bookmark it or add it to your home screen.</p></section>
<p class="fine">${e(p.fine)}</p>
<p class="co">${e(o.company)} · Websites and price pages for ${e(o.business)} and other Cullman-area businesses.</p>
</main>`;
  return page(`${o.business}: your Tank board`, body, { brand: o.company, css: PITCH_CSS });
}
