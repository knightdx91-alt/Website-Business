import { addonPrice, isDomainAddon, type AppSettings } from "./db.ts";
import { escHtml, page } from "./page.ts";
import { APP_ORIGIN } from "./tankboard.ts";
import { KINDS } from "../generator/pricelist.ts";
import type { ListKind } from "../generator/types.ts";

/**
 * In-app how-to guides (Settings → Guides; owner and callers), one source for the web app and the Android app
 * (`GET /api/guides/<id>`). Prices and names are filled from Settings so the guide never goes stale when a price changes.
 * The first guide is the inventory system built for King Fish Aquatics: live price page + the board + QR tags + display.
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

export const GUIDE_IDS = [
  "tankboard",
  "pricetags",
  "display",
  "costs",
  "words",
  "launch",
] as const;

const money = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;

export function tankBoardGuide(s: AppSettings): Guide {
  const list = s.plans.find((p) => p.id === "list" && p.monthly);
  const listLine = list
    ? `the ${list.name} plan, ${money(list.monthly)} a month, no minimum, cancel any time`
    : "the Price list plan (turn it on in Settings → Plans by giving it a price)";
  const tags = s.addons.find((a) => /price tag|shelf label/i.test(a.name));
  const tagLine = tags
    ? `${tags.name}: ${addonPrice(tags)}`
    : "QR price tags: an extra in Settings → Extras";
  const company = s.companyName || "Underground Associates";
  const tablet = s.addons.find((a) => /tablet/i.test(a.name));
  const scanner = s.addons.find((a) => /scanner/i.test(a.name));
  const scanning = s.addons.find((a) => /scanning/i.test(a.name));
  const load = s.addons.find((a) => /stock list|inventory/i.test(a.name));
  const SCANNING_LINE = scanning
    ? `${scanning.name}: ${addonPrice(scanning)}. Turns the Scan button on for their board (phone camera) and the tablet's staff mode. Switch it on in Edit → Live price list → "Barcode scanning on" once they buy it.`
    : "Barcode scanning is an add-on (add it in Settings → Extras, group Inventory add-ons); switch it on per shop in Edit → Live price list.";
  const TABLET_LINE = tablet
    ? `${tablet.name}: ${addonPrice(tablet)}. Any $40 to $80 Android tablet works; this is us bringing one, setting it up and mounting it. The display page itself is included.`
    : "Tablets are the shop's own purchase: any $40 to $80 Android tablet works, and we show them how to set it up (the display guide). We don't sell or supply hardware.";
  const SCANNER_LINE = scanner
    ? `${scanner.name}: ${addonPrice(scanner)}. The tablet camera scans for free; this is a handheld for shops that scan whole deliveries.`
    : "A handheld barcode scanner ($25 to $40 in keyboard mode) is the shop's own purchase; the phone or tablet camera scans for free. We don't sell or supply hardware.";
  const LOAD_LINE = load
    ? `${load.name}: ${addonPrice(load)}. They send a spreadsheet, a register export or photos of their price board; we load it. The board's own import is free when they do it themselves.`
    : "Loading a list for them is included in the set-up when it comes as a spreadsheet; a paper list retyped is an extra to quote.";
  return {
    id: "tankboard",
    title: "📋 Live inventory: the board, price page & QR tags",
    intro:
      "The inventory system for any business whose stock changes: fish stores, plant nurseries, bakeries and produce stands, resale, feed stores, auto parts and tire shops, used car and equipment lots. Every lead has it (Edit → Live price list; shops: Shop details). \"What's on it\" (fish / plants / pets / food / auto parts & tires / vehicles & equipment / other goods) sets the words (tank, bench, case, shelf) and the info-card fields; the board is called Tank board, Bench board, Case board or Stock board to match. The shop keeps a board on their phone (what's in each tank or on each shelf, prices, counts, photos, sold out). Every change goes to a price page on their website within about a minute. QR tags on the tanks open that tank's live prices, and a cheap tablet by a tank can show them with no QR at all. Built for King Fish Aquatics in October 2026.",
    sections: [
      {
        title: "The four pieces",
        steps: [
          'Price page: /prices/ on their website, one section per tank or shelf, each item with name, price, note and photo. Sold-out and zero-count items disappear; 5 or fewer shows "3 left".',
          "The board (Stock board; Tank board for a fish store, Parts board for a parts counter, Lot board for a dealer): a private page we text the shop. No login, no app. They edit it from any phone; changes save by themselves.",
          "QR price tags: a printable sheet of labels, one per tank or shelf. Each QR opens that tank's section of the price page.",
          "Tablet display: a full-screen page for a tablet or TV by the tank that shows that tank live and never sleeps.",
        ],
      },
      {
        title: "What we sell it for",
        steps: [
          `Just the inventory system, no website: ${listLine}. The agreement says plainly it is not a website plan.`,
          "With any website plan (Basic, Plus, Pro): the price page, the board and the tablet display are included.",
          `${tagLine}. The first sheet is included with the ${list?.name ?? "Price list"} plan; reprints (renamed tanks, new tanks, wear) are a new sheet.`,
          'Everything inventory-related is listed together as "Inventory add-ons" (Settings → Extras sets the group): on the website, Show plans, the sign-up page and Plans & answers.',
          SCANNING_LINE,
          TABLET_LINE,
          SCANNER_LINE,
          LOAD_LINE,
        ],
      },
      {
        title: "Set a shop up (owner or full access)",
        numbered: true,
        steps: [
          "Add the business: Home → ➕ Add a business → search their name → pick the Shops type. If they already have a lead, open it.",
          "Wait for the preview to build (a minute or two). Open the lead.",
          'Optional: start the list for them. Edit → Shop details → "Price list & QR labels": give it a title ("Fish & prices"), tick or untick "Public" (private keeps it off Google and out of the menu; the QR tags still work), and type sections and items the way you\'d type a menu: a line "# Tank 1" then "Neon tetra | $2.99 | Schooling, keep 6+". Save.',
          "Or skip typing: the shop adds everything on the board themselves (next section). Anything they add shows in Edit too, and anything you type in Edit shows on their board.",
          'A long list (auto parts, feed, resale, a whole register export): open their board ("Open it here" on the lead) → "Put a whole list on at once". Paste the cells from Excel or Google Sheets, or pick the .csv. See "Getting a whole inventory in" below.',
          "Photos: the board takes them straight from the phone camera, so there's nothing to collect up front. Photos already in the gallery get matched to items by caption.",
        ],
        note: "Google's photos never go on the price page or a label. Only owner photos (board camera, gallery uploads, or photos imported from their own website).",
      },
      {
        title: "Give them the board",
        numbered: true,
        steps: [
          'Open the lead → the "📋 … board" card (named for the shop: Tank board, Parts board, Lot board, Stock board; it shows on every lead once the preview is ready).',
          'Tap "💬 Text them their … board link". Your messaging app opens with the link and a short note; send it. Callers can do this too.',
          'Or tap "Open it here" to show it on your own phone first. It\'s a good demo: add a tank, tap the camera, mark something sold out, then open the price page and watch it change.',
          'Tell them: when the board offers "Add <their shop> to your home screen", tap Add; it then opens like an app with their name on the icon (iPhone: Share → Add to Home Screen; the board shows those words). Anyone with the link can edit, so they should only share it with staff.',
          'If the link gets out: "Revoke old links" (owner) kills every link sent so far. Text them a new one.',
        ],
      },
      {
        title: "How the shop uses the board (what to show them)",
        steps: [
          '"+ Add a tank" at the bottom: name it the way the tank is labeled in the store ("Tank 12", "Saltwater", "Plants").',
          '"+ Add to this tank": name, price, how many, a note (size, pairs only, feeding). The camera button takes or picks a photo; it\'s resized on the phone so it uploads fast.',
          '"In stock · tap if sold out" flips to "Sold out · tap when back". Sold-out items vanish from the website until tapped back. Setting how many to 0 does the same; 5 or fewer shows "n left" on the page.',
          "▲ ▼ move a tank up or down; 🗑 removes an item or a whole tank (it asks first).",
          'Everything saves by itself. The top of the board says "Saved ✓" with the time, or tells them if their signal dropped.',
          '📺 on a tank opens that tank\'s display page; "Every tank on one screen" in the footer shows every tank as a tile (a customer taps one to open it), and "rotating sign" cycles through them for a screen nobody touches.',
        ],
      },
      {
        title:
          "Getting a whole inventory in (auto parts, feed, resale, any long list)",
        numbered: true,
        steps: [
          'Ask what they have it in. Almost every register or point-of-sale system exports a spreadsheet (CSV): QuickBooks POS, Square, Clover, Lightspeed, Shopify, a parts counter\'s catalog, or a plain Excel file. A paper list or a whiteboard works too: photograph it and type it in a sheet (or sell the "Stock list loaded for you" extra and do it for them).',
          'On their board (lead page → "Open it here", or their own phone), scroll to "Put a whole list on at once". Paste the cells (in Excel or Sheets: select all, copy, paste into the box) or tap "📄 Pick a .csv file". Tap "Check it first".',
          'It reads the headings and says what each column is: Name, Price, How many, Barcode / SKU, the section (category, aisle, bin, tank), Note, and the info-card fields for that kind of shop (parts: Part #, Fits, Brand, Condition, Warranty, Where). Fix any it guessed wrong with the drop-downs. A column it should ignore (cost, supplier) is "Skip this column". A name column is the only must.',
          'Rows with no section go into the section you name ("Aisle 1", "Everything"); the shop can move items later. Then choose: "Add & update" (what\'s already on the board by barcode or name gets the new price and count, new rows are added, photos and cards stay) or "Replace everything" (the board becomes exactly this list; photos and cards still come back by name).',
          'Tap "Put N items on the board". Done in a few seconds; the page, QR tags and tablet follow within a minute. The board holds 2,000 items in 100 sections, plenty for a counter; a bigger catalog should keep the fast movers on the board and the rest in their register.',
          'Keeping it current after that: scan deliveries in and sales out on the tablet (staff mode), tap counts on the board, or paste a fresh export any time with "Add & update" (it only touches the rows in the sheet). "⬇️ Download what\'s on the board" gives them the whole list back as a .csv, which is also the template to fill in.',
          "Finding things on a long board: the board shows a Find box once it holds 15+ items (name, barcode or section). The price page shows the list by section with its own menu; a private list (Public unticked) keeps it off Google and out of the site menu, which parts counters and dealers often prefer.",
          'Any kind of business: Edit → "Live price list & QR labels" → "What\'s on it" sets the words and card fields (fish, plants, pets, food, auto parts & tires, vehicles & equipment, other goods). A parts counter gets a Parts board with bins and a part-number card; a dealer a Lot board with rows and year/make/model; anything else a Stock board with shelves.',
        ],
        note: "Google's product photos and a supplier's catalog pictures are not theirs to use; the board's camera and their own photos are. Prices and counts in the sheet are the shop's responsibility: we load what they send.",
      },
      {
        title: "On a website someone else built",
        numbered: true,
        steps: [
          'A shop with its own website (a friend built it, Wix, GoDaddy, Squarespace, WordPress) keeps it. Sell them the Price list plan: the board, tablet, QR tags and price page all work without our website, and the live list goes into theirs.',
          'On the lead page\'s board card: "🔌 Text their web person the setup page" (pick the web person in your texts), "Open the website setup page" to look at it yourself, or "Copy the website code" to paste it somewhere.',
          'The setup page gives the web person three ways, best first: (1) one line of code in an HTML / Embed / Custom code block, which draws the live list in the site\'s own fonts and colors; (2) a frame version for builders that box pasted code in; (3) a plain link or button to the list on a page of its own. It names where that block lives in Wix, Squarespace, WordPress, GoDaddy, Shopify and Weebly, and shows the live list at the bottom.',
          'Extras for the code: data-accent="#hex" for their brand color, data-tank="tank-3" to show one tank only (a page per tank).',
          'After it\'s on: every change on the board or the tablet shows on their site within about a minute. Nobody edits the website for stock again.',
        ],
        note: "Ask them to delete any fish or price list typed by hand on their site, so there is only one list and it is always right.",
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
          'The site has to be live first (the QR has to point at a real address). Publish, then on the lead\'s "Client site" card tap "QR price tags".',
          "It opens a PDF: Letter sheets, 8 labels per sheet (2 across, 4 down, 3.75 × 2.5 in), one label per tank or shelf, each with the shop name, the tank name and a QR to that tank's section.",
          "Print on sticker paper or card stock, laminate if it's near water, and stick one on each tank. Scan one with your own phone before you leave.",
          "When a tank is renamed or added, print again: the QR goes to the section by its name, so a renamed tank needs a new label. Removing items never needs a reprint.",
          'A private price list ("Public" unticked in Edit) still works from the labels; it just isn\'t linked from the menu or shown to Google.',
        ],
      },
      {
        title: "Tablet display",
        numbered: true,
        steps: [
          "The tablet is also the shop's inventory station: staff unlock it (PIN, NFC tag or a code approved from the phone) and add fish, change counts, take photos and get AI care cards right at the tank. Customers tap a fish for its care card. The full tour is in the Tablet display guide.",
          `Open the shop's board, tap 📺 on a tank, and copy that address (it looks like ${APP_ORIGIN}/d/<lead>/<tank>). Without a tank name at the end it rotates through every tank, 10 seconds each.`,
          "On the tablet: open that address in Chrome and tap Add when the page offers the home screen (else ⋮ → Add to Home screen). Open it from the icon so it fills the screen.",
          "Settings → Display → Screen timeout → never (or as long as it allows), and keep it plugged in. The page also asks the tablet to stay awake.",
          "To stop customers tapping out of it: Settings → Security → App pinning (name varies by phone), then pin Chrome.",
          'It refreshes by itself every 30 seconds and shrinks the text so a tank with 15 items still fits. Big price in orange, photo if there is one, "3 left" under the price. A customer taps a fish to read its care card (adult size, what it eats, temperament, tank size, water).',
          'Staff mode: the small "Staff" button in the corner asks for the staff PIN (set on the board), a staff NFC tag held to the back of the tablet, or a 6-digit code the shop approves on the Tank board. Then every item gets − / count / + and ⋯ (set the count, sold out, price, photo, care card), and "+ Add" lists everything the shop has ever stocked, or a new name: count, photo from the tablet camera, and a care card drafted by AI for the shop to check. "▦ Scan" reads a product\'s barcode with the tablet camera (or a cheap USB/Bluetooth scanner, which just types the code): a known product shows its name and count, you type or tap how many, then "Put in" or "Take out"; an unknown code asks for a name (food and pet products are often filled in from the barcode) and becomes a new item. ⋯ → Barcode links a code to an item that was added by name. It locks itself after 3 idle minutes; "Done" locks it now.',
          "Mount it above the tank in a cheap stand or clamp, away from splash. One or two bigger tablets or a TV with a streaming stick near the register, rotating through all tanks, costs less than one tablet per tank.",
        ],
      },
      {
        title: "Barcode scanning (packaged goods)",
        numbered: true,
        steps: [
          'What it is: anything with a barcode (fish food, filters, medications, parts, feed bags, bottles) can be counted in and out by scanning it instead of finding it in a list. It is the Barcode scanning add-on: once they buy it, switch it on in Edit → Live price list → "Barcode scanning on" (Android: Edit → the same card). Shops that were already scanning before the add-on existed stay on.',
          'On the phone board: "▦ Scan" in the bottom bar opens the camera; a known product shows its name, section and count with Put in / Take out; a new code asks for a name (often filled in), a price and which section it goes in. "Scan the next one" chains through a delivery. Each item also has a Barcode field with ▦ beside it.',
          "Unlock the tablet (Staff → PIN, staff tag or phone code), tap \"▦ Scan\" in the bottom bar and hold the product's barcode in front of the tablet's camera. Chrome on Android reads it in about a second. The first time, Chrome asks to use the camera: tap Allow.",
          'No camera, or a lot of scanning? Any USB-C or Bluetooth barcode scanner ($25 to $40, set to "keyboard mode", which is the default) works on the same screen: it types the code into the box and presses Enter for you. Pair it once in the tablet\'s Bluetooth settings.',
          'A product the shop has scanned before shows its name, which tank or shelf it is in, how many are in stock and the price. Tap − / + or type the amount, then "➕ Put in" (a delivery) or "➖ Take out" (a case sold, a return to the supplier). "Scan the next one" keeps going through a whole delivery.',
          "A product that sold out earlier comes back from the catalog with its photo, price and info card; it goes into whichever tank or shelf the tablet is on.",
          "A code nobody has scanned before: the tablet asks for a name, a price and the amount. For food, drink and pet products the name is often filled in from the barcode (a free product database); for parts and local goods the staff type it. It then asks for a photo and writes the info card, exactly like a new name typed by hand.",
          'Something was added by name and later gets a barcode: tap ⋯ on the item → Barcode → "▦ Scan it" (Change and Clear once it has one). On the phone board every item has a Barcode field with a ▦ button beside it. One code belongs to one product; the catalog keeps it after the last one sells, so the next delivery scans straight in.',
          "Scanning never changes a price unless staff type one, and customers can't reach it: the Scan button only exists in staff mode.",
          'Trouble: "can\'t read barcodes with its camera" means the tablet\'s browser is not Chrome (or is very old); use Chrome, or a handheld scanner. A blurry camera needs the code 4 to 8 inches away under decent light. A code that reads but is "not found" is simply new; name it once.',
        ],
      },
      {
        title: "Selling it",
        steps: [
          'The opener: "You change what\'s in these tanks every day. What if the price on the tank changed itself when you changed it on your phone?"',
          'Fill it first: on the lead, "🧪 Add sample items (preview only)" (owner / full access) puts made-up stock for their kind of business (car parts, hardware, a bakery case, tanks of fish, a car lot) on the preview\'s price page, board and tablet display, so the prospect sees it full instead of empty. The page says they\'re samples; "Remove sample items" takes them out, and the site can\'t publish while any remain.',
          "Show, don't tell: open the board on your phone, add a fish, then scan the demo QR or open the price page. Under a minute, in front of them.",
          `Price it simply: ${listLine}. If they take a website plan, it's included.`,
          '"We don\'t need a website": fine, start with the board and the tags. Every month on it counts toward a website later, and the price page just becomes part of the site.',
          '"My staff will mess it up": it only edits the price list, nothing else on the site. And "Revoke old links" shuts a leaked link off in one tap.',
          "\"We already use a whiteboard\": the whiteboard doesn't show up on Google, can't take a photo, and nobody at home can read it before they drive over.",
        ],
      },
      {
        title: "Trouble",
        steps: [
          '"This link isn\'t valid any more": the links were revoked, or the lead expired. Send a new one from the lead.',
          "Board says \"Couldn't save\": their signal dropped. The change isn't lost on screen; it saves when they touch anything again.",
          "Photo won't attach: the item needs a name first, and the photo must be under 8 MB (phones' own photos are fine; screenshots of screenshots sometimes aren't).",
          '"Open price page" is missing on the board: the site isn\'t live yet. The preview still shows the list.',
          'Price page not changing: wait a minute, pull to refresh. If a live site is more than 10 minutes behind, open the lead and tap "Republish changes".',
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
    intro: `A printed sheet of labels, one per tank, shelf or rack. Each label carries a QR code that opens that section of the shop's live price page, so a price change on the website is a price change on the shelf, and nobody rewrites a tag. Sold as the extra "${tagName}" (${tagPrice}); the first sheet is included with the ${list?.name ?? "Price list"} plan. Only shops (the Shops type) have a price list, so only they can get tags.`,
    sections: [
      {
        title: "What a sheet is",
        steps: [
          "Letter paper, 8 labels per sheet: 2 across, 4 down, each 3.75 × 2.5 inches, with light cut lines between them.",
          'Each label: a big QR code on the left; on the right the section name ("Tank 12", "Perennials"), "Scan for today\'s prices", the shop\'s name and its web address.',
          "One label per section of the price list, in the order the sections are in. 9 to 16 sections = 2 sheets, and so on. A sheet is a price unit, so a shop with 20 tanks buys 3 sheets.",
          "The QR opens the live price page straight at that section. The page reads the live list every time it loads, so the tag never goes out of date unless the section is renamed.",
        ],
      },
      {
        title: "Before you can print",
        numbered: true,
        steps: [
          'The shop\'s site has to be live: the QR points at the real address (their own domain if one is attached, else the pages.dev address). The button says "Publish the site first" until then.',
          'The price list needs at least one section: Edit → Shop details → "Price list & QR labels", or the shop adds sections on their board. Each section becomes one label.',
          'Check the section names read well on a 1.35-inch-wide line: "Tank 12" is good, "Freshwater community tanks, left wall" wraps and gets small. Rename in Edit or on the board; the page and the label follow.',
          "A private price list (\"Public\" unticked) is fine: the labels still open it. It just isn't in the site's menu or on Google.",
        ],
      },
      {
        title: "Print the sheet",
        numbered: true,
        steps: [
          'Open the lead → "Client site" card → "QR price tags". The PDF opens (on the phone it opens in the app\'s PDF viewer with Print and Share).',
          'Print at 100% ("Actual size", not "Fit to page"), colour or black and white both scan.',
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
          'After the sale: open the client → "💬 Text \'Buy extras\' link". They tick the tags, pick how many sheets, sign and pay online. Or they tap "Already a client? Add extras" on our website and it lands in the Inbox.',
          "Quantity = sheets, not labels. Count their sections first: 8 or fewer is one sheet.",
          'Pair it with the board: "Your phone changes the price; the tag on the tank is already right." Then scan one in front of them.',
          "Who buys it: fish and reptile stores, plant nurseries, antique malls with booth numbers, farm and feed stores, produce stands, resale with sections, bakery cases. Anything with a section name you can stick a label on.",
          "Not for: restaurants (they get QR table tents and the menu instead), service businesses (no price list).",
        ],
      },
      {
        title: "After they pay",
        numbered: true,
        steps: [
          "The purchase shows on the client's lead screen under their sign-up with the signed extras agreement; it's marked paid by Stripe when the card goes through (Inbox requests from the website need you to send the Buy extras link or take payment in person).",
          'Print the sheets from the "QR price tags" button, scan-test, deliver. Log it in the call log ("Delivered 2 sheets of tags") so the whole team knows.',
          'Set a task for 30 days out: "Check King Fish\'s tags" with the lead attached. A quick look catches a renamed tank before customers do.',
        ],
      },
      {
        title: "Trouble",
        steps: [
          "\"Publish the site first\": the site isn't live. Publish from the lead, or if it's a Price list client that's not live yet, publish now; the plan only promises the price page but the whole site goes up.",
          '"Add a price list first": no sections yet. Edit → Shop details, or the board.',
          "QR opens the page but not the right section: the section was renamed since printing. Reprint.",
          "QR opens a 404 or an old domain: a custom domain was attached or removed after printing. Reprint; the labels carry the domain.",
          'QR won\'t scan: printed too small ("Fit to page" shrinks it), glossy lamination glare, or a crease through the code. Print at 100%, matte lamination, flat.',
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
    intro: `A full-screen page for a cheap tablet or a TV in the shop that shows one tank (or every tank in turn) live: big name, big orange price, the photo, "3 left" when stock is low. It reads the same live list the Tank board writes, refreshes itself every 30 seconds and keeps the screen awake, so the customer standing at the tank sees the price without scanning anything. It costs us nothing to give, so it is included with the ${list?.name ?? "Price list"} plan and every website plan; the hardware is the shop's.`,
    sections: [
      {
        title: "What it shows",
        steps: [
          'One tank: the tank name as the heading, the shop name small on the right, and a card per item: photo (or a fish mark when there is none), name, note, the price in big orange type, "n left" under the price when 5 or fewer are left.',
          'Sold-out and zero-count items are gone, exactly like the price page. A tank with nothing in stock says "Sold out for now. Ask us what\'s coming."',
          "Every tank on one screen (the usual choice): one tile per tank with a photo, how many are in and the first few names; a customer taps a tank to see what's in it, and it goes back to the tiles after a minute and a half. Up to nine tanks fit on one screen with nothing to scroll (the tiles resize to fit); from ten up the page scrolls down. Staff unlock and tap a tank to count or add to it right there.",
          "Rotating sign: the same tank cards, a new tank every 10 seconds, with dots at the bottom showing which one is up. For a screen at the register or the door that nobody touches (add ?rotate=1 to the address, or use the footer link).",
          "It shrinks the text so a tank with 15 items still fits with nothing cut off, and goes to two columns on a wide screen.",
          'Bottom left: "Updated" with the time of the last change on the board. Bottom right: a small "Staff" button. Customers tap a fish for its care card; nothing else responds.',
          'Staff mode (after PIN, NFC tag or phone code): − / + on every item, ⋯ for the exact count, sold out, price, a photo from the tablet camera and the care card (read, redo with AI, or edit by hand), tank chips across the bottom, "+ New tank", and "+ Add" with the shop\'s whole catalog and a search box. New names get a photo prompt and an AI-drafted care card. "▦ Scan": point the camera at a barcode (or use a handheld scanner), type the amount, Put in or Take out; a code nobody has scanned before becomes a new item. Done or 3 idle minutes locks it, and the next person taps Staff and enters the PIN again (it never stays unlocked).',
        ],
      },
      {
        title: "Getting the address",
        numbered: true,
        steps: [
          'Open the shop\'s lead → 📋 their board card (up top once the list has items; before that under "More on this lead") → "Open it here" (or open the link you texted them).',
          "Each tank has a 📺 at the right of its name. Tapping it opens that tank's display page; copy the address from the browser bar. It looks like " +
            APP_ORIGIN +
            "/d/<lead>/<tank-name>.",
          'For every tank on one screen, use the "Every tank on one screen" link in the board\'s footer: the same address without the tank name on the end. "Rotating sign" next to it is the hands-off version.',
          "The address works without a login (it shows nothing but what the price page shows), so it can be typed into any tablet, phone or TV browser. It is hidden from Google.",
        ],
        note: "The tank part of the address is the tank's name. Rename the tank and the old address shows nothing: set the tablet up again with the new 📺 link.",
      },
      {
        title: "Set up a tablet",
        numbered: true,
        steps: [
          "Any Android tablet from about $40 to $80 works (Walmart onn., Amazon Fire with the Silk browser, an old phone). An iPad works too. Wi-Fi is all it needs.",
          'Open the address in Chrome (Fire: Silk). Menu ⋮ → "Add to Home screen". Open it from that icon so it fills the screen with no browser bar.',
          "Settings → Display → Screen timeout: the longest it allows or \"Never\". The page asks the screen to stay awake too, but the tablet's own setting is what you can trust. Turn brightness down a notch; it's on all day.",
          "Keep it plugged in. A tablet on battery dies by mid-afternoon.",
          'Stop customers tapping out of it: Settings → Security → "App pinning" (Samsung: "Pin windows"; Fire: "Enable Fire for Kids" or just the home-screen icon). Pin Chrome. Hold Back + Overview to unpin.',
          "Pick the right address for that screen: every tank as tiles for a screen customers can reach, the one tank it sits on, or the rotating sign for a screen at the register or the door.",
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
          "Changes can be made right on the tablet (Staff) or on the board on a phone; the screen, the website and the QR tags all follow within about 30 seconds.",
          "Three ways to unlock: the staff PIN (the board → Tablet & staff → Save PIN), a staff NFC tag (write the text shown on the board onto a $1 NFC sticker with the free NFC Tools app; only tablets with NFC can read it), or the 6-digit code the tablet shows, typed on the board. Revoke old links on the lead ends every tablet session too.",
          "If the screen looks stale, it has probably lost Wi-Fi. Tap it, swipe down to reload, or power it off and on. The page comes back by itself.",
          "Renaming a tank on the board means that tank's screen needs the new 📺 link once. Adding items, prices, photos and sold out never need anything.",
          "The tiles page and the rotating sign always show every tank, so a new tank joins them on its own.",
          "A screen can be moved to another tank by opening that tank's 📺 link on it.",
          'Packaged goods: in staff mode, "▦ Scan" counts them in and out by barcode (tablet camera in Chrome, or a $25 to $40 USB-C / Bluetooth scanner in keyboard mode). Scan, type the amount, Put in or Take out. New codes ask for a name once. The full steps are in the Tank board guide → Barcode scanning.',
        ],
      },
      {
        title: "Selling it (it's free, so sell the plan)",
        steps: [
          'The line: "Change the price on your phone, and the sign on the tank changes too." Then hold your phone next to a tablet and show it: mark something sold out, watch it vanish from the screen.',
          `It's included with the ${list?.name ?? "Price list"} plan and every website plan. You're selling the plan; the display is the part they'll remember.`,
          "If you set the tablets up for them (buy, mount, configure), $99 per tablet installed is fair: about $60 of hardware and 20 minutes of your time. Add it to the invoice as a one-off, or quote it by hand; it isn't a listed extra.",
          "Pair it with QR tags: the screen for the person at the tank, the tag for the person who wants to take the price home.",
          "Good fits: fish and reptile stores, plant nurseries (a screen per bench), produce stands, bakery cases, antique malls (booth map at the door), feed stores (a screen by the bulk bins).",
        ],
      },
      {
        title: "Trouble",
        steps: [
          '"Nothing on the board yet": the shop hasn\'t added any tanks, or the address has a tank name that no longer exists (renamed). Open the current 📺 link.',
          "Screen asleep: the tablet's own screen timeout is on. Settings → Display → Screen timeout → Never, and keep it plugged in.",
          "Prices not changing: no Wi-Fi. Reload once; if it stays stale, the tablet has dropped off the network.",
          "Page shows the browser bar or someone opened another app: open it from the home-screen icon, and turn on app pinning.",
          'Text too small or cut off: it shrinks to fit 15 or so items. Past that, split the tank into two sections on the board ("Tank 4 top", "Tank 4 bottom").',
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
  if (id === "costs") return costsGuide(s);
  if (id === "words") return wordsGuide(s);
  if (id === "launch") return launchGuide(s);
  return null;
}

/**
 * 🚀 From yes to live (owner's ask, Oct 2026): everything after a business says yes, in order: sign-up, making the site theirs,
 * publishing, their own domain, getting found on Google, Google Analytics, after launch, and the one-time setups behind it.
 * Button names here must match the apps; prices and plan names come from Settings.
 */
export function launchGuide(s: AppSettings): Guide {
  const domain = s.addons.find((a) => isDomainAddon(a));
  const pro = s.plans.find((p) => p.id === "pro")?.name || "Pro";
  const domainPrice = domain ? addonPrice(domain) : "$11 upfront, then $2/month";
  return {
    id: "launch",
    title: "🚀 From yes to live: site, domain, Google & analytics",
    intro:
      "Everything after a business says yes, in order: sign them up, make the site what they want, publish it, put it on their own domain, get it found on Google, and turn on Google Analytics. The button names below are the ones in the app, on the web and the phone.",
    sections: [
      {
        title: "1. Sign them up",
        numbered: true,
        steps: [
          'On the lead page, tap "Sign them up" (or "Change plan or way to pay" for another plan or way to pay).',
          'They read "In short", type their name and sign with a finger.',
          'Take payment: 💳 Tap card on this phone, card entry on the phone, or "Text them the payment link".',
          `Ask about the domain now: the free .pages.dev address, or their own (like theirbusiness.com) = the "${domain?.name ?? "Domain name, bought for you"}" extra, ${domainPrice}, free on ${pro}.`,
        ],
        note: "The lead turns Sold and a green ✅ Client card appears at the top.",
      },
      {
        title: "2. Make the site what they want",
        steps: [
          "Tap Edit. Each card saves and the preview updates.",
          "Confirm with the owner: business name, phone, address (a new address moves the map pin).",
          "Text: headline, intro, about, closing. Change any wording they don't like.",
          'Services: one per line, like "Haircut | $25 | 45 min". A line like "# Color" starts a group.',
          "Hours.",
          "Photo: their main photo. Keep in view picks what stays in the frame; Zoom in on phones makes a sign readable.",
          'Photo gallery: their photos. Tick "Show in What\'s new" for the swipeable row. Stock photos: "Don\'t use this one" on any they don\'t like.',
          "Links: Facebook, booking, ordering. Leave Google Analytics ID blank; the app fills it in.",
          'Design (lead page): Try another design, or type a style ("rustic country") and tap ✨ Design it.',
          "Spanish page (only if they bought it): Write Spanish page translates the whole site.",
          "Show them with Preview: 📱 / 🖥️ for phone and desktop, 📝 Show notes for the to-do notes customers never see.",
        ],
      },
      {
        title: "3. Publish",
        numbered: true,
        steps: [
          "The 🚀 Finish & publish card lists anything still missing. Each line opens the card that fixes it.",
          "When the list is empty, tap Publish to Cloudflare.",
          "Within a minute it's live at something like theirbusiness.pages.dev. That address keeps working forever.",
          "Google Analytics is set up at this moment by itself (see 6).",
        ],
      },
      {
        title: "4. Their own domain",
        numbered: true,
        steps: [
          "Open the 🌐 Their domain card (before or after publishing). It suggests names marked Free or Taken; tap Use this on theirs.",
          "Tap Copy name & open Cloudflare, paste the name and register it. The client is the registrant contact (the domain is theirs). Leave auto-renew on.",
          "Back in the app, tap I bought it.",
          "Within minutes (sometimes an hour) the card says ● Working, the site switches to the new address and everyone gets an alert. No DNS records to type.",
        ],
        note: "Forgot step 3? The app checks every 5 minutes anyway.",
      },
      {
        title: "5. Get it found on Google",
        steps: [
          "Google finds new sites by itself, but it can take weeks. These get them showing up for their own name in days.",
          'Their Google Business Profile (the biggest one): the lead\'s Google profile tools → text the owner the "add us as Manager" steps. Once you have access, put the site address in the profile\'s Website field.',
          "Google Search Console (search.google.com/search-console, our company Google account): Add property → URL prefix → https://theirdomain.com → HTML tag → copy only the code inside content=\"…\".",
          "In the app: Edit → Links → Search Console code, paste, save, then tap Republish changes on the lead page.",
          "Back in Search Console: Verify → Sitemaps → submit sitemap.xml → URL inspection on the home page → Request indexing. Add the client as a user if they want to see it.",
          "Get listed everywhere (on the lead): Bing Places (import from their Google profile) and Apple Business Connect.",
        ],
        note: "Their name usually shows the site within a few days to two weeks. Ranking for \"pizza near me\" style searches takes longer and comes mostly from their Google profile and reviews.",
      },
      {
        title: "6. Google Analytics",
        steps: [
          "Already on the site from publishing: the app gives every published site its own Google Analytics property.",
          "Client site → 📊 Google Analytics → Give the owner access, with their Gmail. They see their reports at analytics.google.com.",
          "Open their reports shows you their numbers. Visits show within a day; calls, texts, Directions taps and form sends are counted too.",
          "If the business already has its own Google Analytics, type their ID in Edit → Links → Google Analytics ID instead.",
        ],
      },
      {
        title: "7. After launch",
        steps: [
          "Changes: Edit, then Republish changes. Clients text or call us with changes.",
          "Text monthly report: their visits and calls.",
          "Ask for a review and Review cards (QR): more reviews help them on Google too.",
        ],
      },
      {
        title: "One-time setups (owner)",
        steps: [
          'Google Analytics: analytics.google.com → Admin → Create account → copy the Account ID into Settings → Website → "Google Analytics account for client sites". Then the Connections strip at the top of Settings shows the last two steps: switch on the Google Analytics Admin API, and add the app\'s service account email as Administrator.',
          "Cloudflare token: Cloudflare → My Profile → API Tokens → edit the app's token → add Zone · DNS · Edit and Zone · Zone · Read, both for All zones. Without it a bought domain can get stuck on Connecting.",
        ],
      },
    ],
  };
}

/** 💵 What keeps the app running, what each piece costs, and the monthly check (for whoever minds the bills). */
export function costsGuide(s: AppSettings): Guide {
  const company = s.companyName || "Underground Associates";
  return {
    id: "costs",
    title: "💵 Costs & usage: what keeps the app running",
    intro: `${company} runs on a handful of outside services. Most are a few dollars a month or free; two are billed by how much we use them. Settings → Costs & usage lists every one with what it does for us, what it costs, how much we've used this month, when it renews and what stops if it lapses. This guide is the walkthrough for whoever keeps an eye on it.`,
    sections: [
      {
        title: "What we pay for, in one minute",
        steps: [
          "Cloudflare, $5 a month: the app itself, its database and photos, the build queue, every client website and our own site. If this card fails, everything goes dark until it's fixed, so it's the one to watch.",
          "Our domain, undergroundassociates.com, about $10 a year: the company site, every link we text, our email. Auto-renew stays on.",
          "Google Places API, billed by use: finding businesses (searches, details, photos). Google gives a free monthly allowance per kind of request; the run cap in Find new leads is what controls this bill.",
          "Anthropic (Claude), billed by use: writes every site's words, call guides, Spanish pages, info cards. Roughly 10 to 20 cents a site. Prepaid credit; it must be topped up.",
          "Stripe: no monthly fee; it keeps about 2.9% + 30¢ of each payment (2.7% + 15¢ for a tap) and pays the rest to our bank.",
          "Resend (email) and Brave Search are free at our volume; Firebase alerts, the Google Cloud project and the barcode lookup are free. Google Workspace is the company mailbox, about $8.40 a user a month.",
          "Development (the owner's Claude Code subscription) builds and fixes the app but is not needed for it to run.",
        ],
      },
      {
        title: "The monthly check (first week of the month)",
        numbered: true,
        steps: [
          "Open Settings → 💵 Costs & usage. The top card says what this month costs so far (fixed + usage + card fees) next to what's coming in from paid plans.",
          "Read the warnings line. A yellow line means a free allowance is 80% used, a renewal is within 30 days, a price is blank, or the month is over budget.",
          'Check each usage service\'s "This month" against "Last month". A jump in Places searches means a big run; a jump in Anthropic means a lot of rewrites. Neither is wrong, just know why.',
          "Open the three billing pages (Cloudflare, Google Cloud, Anthropic console) once and compare: the screen's numbers are estimates from our own counter and the prices typed in here, not the invoice.",
          "Anthropic: check the prepaid balance; add credit (or turn on auto-reload) before it runs out. Running out stops every build.",
          "Cards and renewals: a card expiring soon on any of these accounts gets fixed now, not when something breaks. The renewal dates in the screen are typed in by us; keep them current.",
          "Tap Edit on any service to update its price, the free allowance, the renewal date, which login it's under, or a note. Prices change; the code doesn't need to.",
        ],
      },
      {
        title: "If a card fails or a service stops",
        steps: [
          "Everything offline (app, client sites, company site): Cloudflare. Log in, Billing, fix the card; it comes back within minutes.",
          "Find new leads or Add a business fails with a Google error: the Google Cloud billing account. Fix the card there; the key itself rarely needs touching.",
          "Previews build with no words, call guide or Spanish page fails: Anthropic credit has run out. Add credit in the console; queued builds finish on their own.",
          "Payments fail or renewals stop: Stripe is asking for something (identity, bank details). The Stripe dashboard says exactly what.",
          "Emails to clients stop: Resend. Rare; text the link by hand meanwhile.",
          "Phone alerts arrive late (every 15 minutes instead of instantly): Firebase. Nothing is lost.",
          "Company email stops or Google sign-in fails: Google Workspace. The owner's password login to the app still works.",
        ],
      },
      {
        title: "Where to log in",
        steps: [
          "Each service card has an Open button to its billing or dashboard page and an \"Account\" line for which login it's under. Fill the account lines in once; the next person shouldn't have to guess.",
          "Passwords and API keys never go in the app. They live in the password manager the owner uses and, for the keys the app needs, in Cloudflare's secrets (set by the developer).",
          "Client domains: a client who buys their own pays for it themselves. When we buy one for them (the Domain name extra, or a Pro client), it is registered in their name on our Cloudflare account, about $10 to $15 a year each at cost, auto-renew on, and their monthly bill covers it; it shows on the Cloudflare bill above. Client Google Workspace mailboxes are billed to the clients by Google: not our bill.",
        ],
      },
      {
        title: "How the usage numbers are counted",
        steps: [
          "The app counts its own calls to Google, Anthropic, Brave, Resend and Firebase as they happen and adds them up per day. The Costs screen sums the current and previous month.",
          "Anthropic is counted in tokens (about three quarters of a word each) per model; the estimate multiplies by the prices typed in the screen.",
          "Google's free allowances and prices are set per kind of request; the defaults are from October 2026. If the Google bill differs from the estimate, update the prices here rather than trusting the estimate.",
          "The count is a cost estimate, not an invoice: a crash mid-request can lose a few counts, and nothing is counted before the day the counter was added.",
          "Budget: the screen compares the month against a budget (default $150). Over it, or 80% into a free allowance, the owner and full-access team get one alert for that month.",
        ],
      },
    ],
  };
}

/** A customer-facing page (Show them the board): what it is for them, what they do, what we do, what it costs. */
export interface CustomerPitch {
  title: string;
  lead: string;
  sections: GuideSection[];
  /** Price lines, already filled from Settings. */
  price: string[];
  fine: string;
}

export function customerBoardPitch(
  s: AppSettings,
  o: { business: string; live: boolean; kind?: ListKind },
): CustomerPitch {
  const W = KINDS[o.kind ?? "fish"];
  const sec = W.section.toLowerCase();
  const item = W.item;
  const list = s.plans.find((p) => p.id === "list" && p.monthly);
  const site = s.plans.filter((p) => p.id !== "list" && p.monthly);
  const cheapest = site.length
    ? site.reduce((a, p) => (p.monthly < a.monthly ? p : a))
    : null;
  const tags = s.addons.find((a) => /price tag|shelf label/i.test(a.name));
  const company = s.companyName || "Underground Associates";
  const you = o.business || "your shop";
  return {
    title: `What's in the ${sec}, on your phone and on the ${sec}`,
    lead: `${you} changes what's on its ${sec}s every day. Here's how the price on the ${sec} keeps up by itself: you change it on your phone or the tablet, and the tag on the ${sec}, the screen beside it and your website all change with it.`,
    sections: [
      {
        title: "How it works",
        numbered: true,
        steps: [
          `We text you a private link: your ${W.board}. It opens on any phone. No app to install, no password to remember.`,
          `The board lists your ${sec}s. For each one you type what's in it, the price, how many, and snap a photo if you like.`,
          "Every change saves by itself and shows on your website's price page within about a minute.",
          `A small QR tag on each ${sec} opens its live prices on a customer's phone. A cheap tablet beside it can show them too, no scanning.`,
          "Packaged goods have a barcode? With the Barcode scanning add-on, scan it on your phone or the tablet (its camera, or a cheap handheld scanner), type how many came in, done. The same scan takes them out when they sell.",
        ],
      },
      {
        title: "What you do",
        steps: [
          `Something new comes in: on the tablet, tap Staff, enter your PIN (or tap your staff tag), tap "+ Add", tap the ${item} in the list (or type a new name) and tap how many. Twenty seconds. The same works on the board on your phone. Packaged goods: tap "▦ Scan", show the barcode to the tablet camera (or use a handheld scanner), type how many, tap "Put in". Selling a case of something? Scan it and tap "Take out".`,
          `A new ${item} nobody has stocked before: type its name, tap how many, and the tablet asks for a photo and writes its info card (${W.fields
            .slice(0, 3)
            .map((f) => f[1].toLowerCase())
            .join(", ")}…) for you to check.`,
          `Customers tap a ${item} on the tablet or the website to read its info card. Nothing they tap can change your stock: that takes your PIN, your staff tag, or your phone.`,
          'Something sells out: tap "Sold out". It disappears from the page until you tap it back. Or just type how many are left; at 5 or fewer the page says "3 left".',
          `Want a picture? Tap the camera on the item and take one right there at the ${sec}.`,
          "Prices change: change the number. Nobody rewrites a tag, nobody reprints anything.",
          "That's all. You never touch the website, and anyone on your staff with the link can do it.",
        ],
      },
      {
        title: "What your customers get",
        steps: [
          `At the ${sec}: scan the tag or glance at the screen and see exactly what's on it today, with prices and photos.`,
          `At home: your price page shows up with your website on Google, so people check what you have before they drive over, and call about the ${item} they want.`,
          'Fewer "how much is this one?" questions, and no arguing about a price on an old tag.',
        ],
      },
      {
        title: `What ${company} does`,
        steps: [
          `Set up your price page and your board, and load your first ${sec}s with you if you want.`,
          `Print your QR tags (one per ${sec}), and show you how to set up a tablet of your own by the ${sec} if you'd like one (any $40 to $80 Android tablet works).`,
          `Keep it all running: hosting, security, backups, and reprints when you rename or add a ${sec}.`,
          "Answer by text. Anything odd, you text us and we fix it.",
        ],
      },
    ],
    price: [
      list
        ? `Just the price page, board and tags: ${list.name}, $${list.monthly} a month. No minimum; cancel any time.${tags ? ` Your first sheet of QR tags is included.` : ""}`
        : "Ask us about the Price list plan.",
      cheapest
        ? `With a full website: included in every website plan, from $${cheapest.monthly} a month.`
        : "Included with every website plan.",
      tags
        ? `More QR tag sheets (8 tags each): ${addonPrice(tags)}.`
        : "QR tags are an extra.",
      `A tablet by the ${sec}: any $40 to $80 tablet works; we'll set it up.`,
    ],
    fine: o.live
      ? `Your price page is live now. Add a ${sec} on the board and watch it change.`
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
 * The public, texted version of "Show them the board" (`/b/<leadId>.<exp>.<sig>`): the same words, with buttons to open
 * their own board (their private link), the tablet view, and our pricing page.
 */
export function customerPitchPage(
  p: CustomerPitch,
  o: {
    business: string;
    company: string;
    phone?: string;
    boardUrl: string;
    displayUrl: string;
    pricingUrl: string;
    /** "Tank board" / "Parts board" / … for this shop. */
    board?: string;
  },
): Response {
  const e = escHtml;
  const sec = (x: GuideSection) =>
    `<section><h2>${e(x.title)}</h2><${x.numbered ? "ol" : "ul"}>${x.steps.map((t) => `<li>${e(t)}</li>`).join("")}</${x.numbered ? "ol" : "ul"}></section>`;
  const body = `<main class="pitch">
<h1>${e(p.title)}</h1><p class="lead">${e(p.lead)}</p>
${p.sections.map(sec).join("")}
<section class="box"><h2>What it costs</h2><ul>${p.price.map((t) => `<li>${e(t)}</li>`).join("")}</ul></section>
<section class="box"><h2>Try it</h2><div class="btns">
<a class="btn btn--go" href="${e(o.boardUrl)}">📋 Open your ${e(o.board ?? "Stock board")}</a>
<a class="btn" href="${e(o.displayUrl)}" target="_blank" rel="noopener">📺 See the tablet view</a>
<a class="btn" href="${e(o.pricingUrl)}" target="_blank" rel="noopener">📋 Plans and prices</a>
${o.phone ? `<a class="btn" href="sms:+1${e(o.phone.replace(/\D/g, "").replace(/^1/, ""))}">💬 Text us a question</a>` : ""}</div>
<p class="fine">Your ${e(o.board ?? "Stock board")} link is private: anyone with it can change your prices, so share it only with your staff. Bookmark it or add it to your home screen.</p></section>
<p class="fine">${e(p.fine)}</p>
<p class="co">${e(o.company)} · Websites and price pages for ${e(o.business)} and other Cullman-area businesses.</p>
</main>`;
  return page(`${o.business}: your ${o.board ?? "Stock board"}`, body, {
    brand: o.company,
    css: PITCH_CSS,
  });
}

/**
 * 📖 What the words mean: the glossary behind every label in the app, so a new teammate never has to guess what
 * "Shown" or "Ready" means. Keep it in step with the labels (status tabs, cards, Settings) when they change.
 */
export function wordsGuide(s: AppSettings): Guide {
  const company = s.companyName || "Underground Associates";
  const list = s.plans.find((p) => p.id === "list" && p.monthly);
  return {
    id: "words",
    title: "📖 What the words mean",
    intro: `Every label in the app, in plain words. Two kinds of status live on a lead: how far the SALE has got (New, Shown, Sold, Live, Not interested) and how far the PREVIEW has got (Building, Ready, Failed). The sale status is the one you work; the preview status just says whether the website is ready to show.`,
    sections: [
      {
        title: "Sale status (the tabs on Home)",
        steps: [
          "New: nobody has shown them the preview yet. The job is to call or walk in and show it.",
          "Shown: they've seen their preview (in person, by text link, or we left a flyer). Follow-ups run from here: day 2 call, day 5 text, day 10 walk in, day 21 last text.",
          "Sold: they signed the agreement. If the payment isn't finished the card says so; once paid, the job is Finish & publish.",
          "Live: the website is published on the internet. Ask for a Google review, send the monthly report, sell extras.",
          "Not interested: they said no. We ask why (price, has someone, no need, timing) and the lead drops off after 30 days.",
        ],
      },
      {
        title: "Preview status",
        steps: [
          "Building (or Queued): the app is writing the words and laying out the pages. A few minutes.",
          "Ready: the preview can be shown. Every New lead you call should be Ready.",
          "Failed: the build broke. Tap Try the build again; if it fails twice, use Report this.",
          "Expired: an unsold lead we stopped keeping (New after 30 days, Shown after 60). Only the Google Place ID stays; add it again by hand if they come back.",
        ],
      },
      {
        title: "The one-line next step",
        steps: [
          "Every lead page opens with one line saying what to do next and a button that does it. The Home queue is the same line for every lead that needs something, most urgent first.",
          "Signed, payment not finished: take the payment (tap, card or payment link).",
          "Callback today / overdue: the day you booked when you logged the last call.",
          "They opened their preview: the prospect looked at the link in the last 7 days. Call while it's fresh.",
          "Day N: Call / Text / Walk in: the follow-up cadence after Shown.",
          "Finish & publish: the site is paid for; the checklist lists what's missing before it can go live.",
        ],
      },
      {
        title: "Money words",
        steps: [
          "Plan: the monthly website service (Basic, Plus, Pro). The Price list plan is the live price page and board without a website" + (list ? ` (${money(list.monthly)} a month)` : "") + ".",
          "Way to pay: the term they pick. 6-month or 12-month plan (no setup fee), month to month (the one with a setup fee), or yearly up front (months free). Churches can pay by invoice.",
          "Extras: one-time or monthly add-ons (logo, Spanish page, Google profile setup, NFC card…). The app also says add-ons; same thing. Inventory add-ons are the ones for the board.",
          "Sign-up: the agreement they sign on the phone or from a texted link. Signed means the agreement is done; Paid means the money is in.",
          "Tap to Pay: tapping their card on an Android phone. Card sheet: typing the card number in. Payment link: a texted link they pay on their own.",
          "Founding customer: one of the first paying clients, who picks a free extra. Referral: a client who sends us a business gets months free once that business pays.",
        ],
      },
      {
        title: "Website words",
        steps: [
          "Preview: the website we built before they buy. Private, behind our login, or shared by a 14-day link.",
          "Publish: putting the site live on the internet. Republish: pushing changes to a live site.",
          "Owner to-do: something only the business owner can answer (hours, license number, team names). Required ones block publishing; suggested ones are talking points.",
          "Confirm: the owner says name, phone, address and hours are right. Approve: the owner has read the site text. Both happen in Edit and both are needed to publish.",
          "Design: the colors and fonts (a look), the page structure (a layout) and the smaller choices (style). Try another design changes all three.",
          "Board: the shop's own live price list editor on their phone (Tank board, Parts board, Stock board, named for their kind of shop). QR price tags and the tablet display read from it.",
        ],
      },
      {
        title: "People words",
        steps: [
          `Owner: ${company}'s account. Full access: a team member who can do everything the owner can (Settings, Sales, Inbox, Costs).`,
          "Caller: a team member who works leads end to end (calls, previews, sign-ups, payments, publishing) but can't change Settings or prices.",
          "Ask for: the person at the business to ask for, and the best time to catch them. Typed on the lead page.",
          "Alerts (the bell): what other people did on leads. Settings → Alerts lets you choose Everything, My leads or Important only.",
          "The app: app.undergroundassociates.com in any browser (add it to the home screen), or the Android app. The old workers.dev address still works.",
        ],
      },
    ],
  };
}
