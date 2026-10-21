import { domainPriceWords, isListPlan, promoRules, type AppSettings } from "./db.ts";

/**
 * The in-app training course (🎓 Training on Home; owner and callers): the whole job from a lead appearing to a live site
 * on the client's own domain, as short lessons with the exact buttons to tap, a "try it now" exercise and a quick check.
 * One source for the web app and the Android app (`GET /api/training`); progress is per person (`training_done`).
 * Placeholders: {company}, {basic}, {plus}, {pro} (plan names + monthly prices from Settings), {basicName}/{plusName}/{proName},
 * {fromMonthly} (the cheapest website plan as "$49 a month"; prices are always said per month, never per day: the team found
 * "a dollar a day" confusing), {listPlan} (the Price list plan with its price).
 */

export interface CheckQuestion {
  q: string;
  options: string[];
  /** Index into options. */
  answer: number;
  why: string;
}

export interface Lesson {
  id: string;
  title: string;
  minutes: number;
  /** "owner" lessons are done by the owner or full access; callers read them to know what happens next. */
  who: "everyone" | "owner";
  why: string;
  steps: string[];
  tryIt?: string;
  check: CheckQuestion[];
}

const LESSONS: Lesson[] = [
  {
    id: "what-we-sell",
    title: "What we sell, in one breath",
    minutes: 3,
    who: "everyone",
    why: "Every call and visit comes down to one sentence. Know it cold before you learn any screen.",
    steps: [
      "We build a website for a local business that doesn't have one, before we ever talk to them. They see it finished, not a mock-up.",
      "Where you work: the app at app.undergroundassociates.com (a laptop or any phone browser; add it to the home screen) or the Android app (Settings → Android app). Same leads, same buttons.",
      "They pay a monthly plan that covers hosting, updates and fixes: {basic}, {plus} or {pro}. Most pick {plusName}. No setup fee on a 6- or 12-month plan.",
      'The line: "We already built your website. Want to see it? If you like it, it\'s live this week, from {fromMonthly}."',
      'Say prices the way the bill arrives: per month. "{plus}", not "a few dollars a day". Per-day math sounds like a trick and makes people do arithmetic instead of listening.',
      "We never guess at facts. Hours, prices and claims come from the owner. The site is reviewed by them before it goes live.",
      "You are never selling a website. You are selling the phone ringing: people who search for them find them and call.",
      "Shops whose stock changes daily (fish, plants, produce, parts) can also buy just the live price list: {listPlan}, no minimum. That's its own lesson near the end.",
    ],
    tryIt:
      "Open 💬 Plans & answers and read the three plan cards. Say the one-line pitch out loud twice.",
    check: [
      {
        q: "A restaurant owner asks what it costs. What do you say first?",
        options: [
          "The exact monthly price of the middle plan and that there's no setup fee on a 6- or 12-month plan",
          '"It depends"',
          "Nothing until they've seen the preview",
        ],
        answer: 0,
        why: "Price is not a secret. Lead with the middle plan and the no-setup-fee terms; vagueness loses trust.",
      },
      {
        q: 'They ask if the site can say "best BBQ in Alabama".',
        options: [
          "Yes, if they want it",
          "Only claims they can back up; the site is theirs to approve, and we don't invent facts",
          "Never, we don't allow any claims",
        ],
        answer: 1,
        why: "The owner reviews every word before it goes live, and we don't publish claims they can't stand behind.",
      },
    ],
  },
  {
    id: "where-leads-come-from",
    title: "Where leads come from",
    minutes: 4,
    who: "everyone",
    why: "Leads appear two ways. Knowing what the card tells you saves a wasted call.",
    steps: [
      'Search runs: the owner taps 🔎 Find new leads, picks business types and Run. The app searches Google around Cullman, keeps businesses with no real website, and builds a preview for each one. They land under the New tab with "Preview ready".',
      "By hand: ➕ Add a business. Type the name, pick the result, and the app builds the preview in a few minutes. Use it when you drive past a place or someone mentions one.",
      'The card\'s label matters. "No website" and "Only a social page" are the best leads. "Page on another site" means their only page lives on someone else\'s website (a landlord, a parent company): still a lead, different opener. "Outdated website" means they have one that\'s broken on phones.',
      "A \"🔗 Found page\" line means the app found a page the Google listing doesn't show. Open it before you call so you're not surprised.",
      "Tabs across the top of Leads: New (untouched), Callbacks (due), Activity (anything somebody has worked, newest first), Shown, Sold, Live, Not interested, All. The Up next card above them is your work list for the day: every lead that needs something, most urgent first, each with its one next step.",
    ],
    tryIt:
      "Open the Activity tab and read the last note on three leads. Then search for a business you know and add it (if it's not already in).",
    check: [
      {
        q: 'A card says "Page on stonebridgewedding.com, not linked from Google". What does that mean?',
        options: [
          "They have a website, skip them",
          "Their Google listing has no website button; the only page about them is on someone else's site",
          "The app made a mistake",
        ],
        answer: 1,
        why: "It's a real lead with a different opener: people who look them up on Google see no website, and the page they have isn't theirs.",
      },
    ],
  },
  {
    id: "before-you-call",
    title: "Before you call or visit",
    minutes: 4,
    who: "everyone",
    why: "Two minutes of prep makes the call sound like you know them, because you do.",
    steps: [
      "Open the lead and tap 📞 Call guide. It's written for this business: what their site has, what to point out, what they'll likely ask. Read it once.",
      "Tap Preview and look at the site on the phone and in the desktop view. Know what's on it.",
      "Going in person? Tap 🚶 In-person guide for the walk-in script and the best time of day for that kind of business.",
      "Want them to see it first? Text preview link sends a link that works 14 days. You get a 👀 alert the moment they open it, the lead's card says \"👀 opened preview\", and it moves up the Up next card. Call while it's fresh.",
      "They're out? Leave-behind flyer prints a page with a QR code to their preview. Leaving one marks the lead Shown and books a callback in 2 days.",
    ],
    tryIt:
      "Pick a New lead, read its call guide, then open its preview and find the Call button and the hours.",
    check: [
      {
        q: "You texted a preview link yesterday. How do you know if they looked?",
        options: [
          "Call and ask",
          'You get a 👀 alert, the card says "opened preview", and the lead moves up the Up next card',
          "You can't know",
        ],
        answer: 1,
        why: "Preview opens are tracked and alerted. Call while it's fresh.",
      },
    ],
  },
  {
    id: "showing-the-preview",
    title: "Showing the preview",
    minutes: 5,
    who: "everyone",
    why: "The demo sells itself when it's about them. Your job is to let them drive and fix things live.",
    steps: [
      "Open Preview on the phone (open the Fold for the desktop view). Hand it to them. Let them scroll.",
      "Point at three things only: the Call button at the bottom, their hours and directions, and their services or menu. Don't tour every section.",
      'Shop, parts counter, bakery, nursery or car lot? Before the visit, the owner or full access taps "🧪 Add sample items" (on the lead\'s board card, which sits under "More on this lead" until the list has items, or on the Preview screen next to Full screen). The home page then shows a "What\'s in right now" section and the menu gets an "In stock" (or "Today\'s case") page filled with made-up stock for their kind of business, so they see the live price list working instead of imagining it. Say it\'s sample stock; their own replaces it from their phone.',
      'When they correct something ("we close at 7 now", "we don\'t do roofing"), tap Edit, fix it, Save. The preview rebuilds in seconds. Fixing it in front of them is the moment they believe it\'s real.',
      "Take a photo of the storefront, truck or shop while you're there. The preview uses a Google photo, which we're not allowed to publish; the owner's photo replaces it (Edit → Photo).",
      'Ask who makes the decision and when they\'re easiest to reach. Put it in the lead with the contact note ("Ask for: Jim, mornings").',
      "Not today? Text them the link, leave a flyer, and log the call with a callback day. Never leave without one of those.",
    ],
    tryIt:
      "On any lead, open Edit, change the hours, Save, and watch the preview update. Then change them back. Then open the Preview screen, tap 🧪 Add sample items, find the In stock page in the site menu, and tap Remove sample items when you're done.",
    check: [
      {
        q: "The owner says their hours on the preview are wrong.",
        options: [
          "Tell them it'll be fixed later",
          "Tap Edit, fix the hours, Save, and show them the updated preview right there",
          "Write it on paper",
        ],
        answer: 1,
        why: "A live fix is the strongest proof the site is real and easy to keep right.",
      },
      {
        q: "Why take a photo of the storefront?",
        options: [
          "For the call log",
          "The preview's Google photo can't be published; an owner photo must replace it before the site goes live",
          "You don't need to",
        ],
        answer: 1,
        why: "Google photos are only allowed in previews. Publishing is blocked until an owner, stock or AI photo replaces them.",
      },
    ],
  },
  {
    id: "logging-calls",
    title: "Log every call. Every one.",
    minutes: 3,
    who: "everyone",
    why: "The team shares one list. If it isn't logged, someone else calls them again tomorrow.",
    steps: [
      "After each call or visit, use the Log a call or visit card on the lead and tap one outcome. On the phone: 📵 No answer or 📞 Reached. In person: 🚪 Owner not in, 🚶 Talked in person or 📄 Left a flyer. How it went: 👍 Interested (they saw the preview and want to think), 📅 Call back, 🎉 Sold, ✋ Not interested.",
      "No answer and Owner not in set a callback for tomorrow by themselves. Left a flyer and Interested mark the lead Shown and book a callback in 2 days (the flyer carries their preview link). Call back lets you pick the day. Sold and Not interested clear the callback.",
      "Not interested asks why (price, has someone, no need, timing). Pick honestly: it feeds the sales numbers.",
      "Add a one-line note with anything useful: who you spoke to, what they said, what to try next. Everyone on the team gets an alert, and the Activity tab shows it.",
      "Callbacks show on the Up next card on the day they're due. Overdue ones float to the top.",
    ],
    tryIt:
      'Log a note on the "Payment test" lead, then find it under the Activity tab and in Alerts.',
    check: [
      {
        q: "You reached the owner, she wants to think about it. What do you log?",
        options: [
          "Nothing until she decides",
          "Reached, with a callback day and a note on what she said",
          "Sold",
        ],
        answer: 1,
        why: "Reached plus a callback keeps her on the Up next card on the right day, and the note tells the next person where you left off.",
      },
    ],
  },
  {
    id: "signing-up",
    title: "Signing them up",
    minutes: 6,
    who: "everyone",
    why: "The whole sale happens on your phone in about three minutes: plan, agreement, signature.",
    steps: [
      "Tap 📋 Show plans and let them read {basicName}, {plusName} and {proName}. The page is customer-facing: no notes, no commission, just the plans.",
      'Start the sign-up: in the app, the lead\'s "Sign them up" card → Sign up; on the web, Choose <plan> under Show plans opens the same page. Pick the plan, the way to pay (6- or 12-month plan with no setup fee, month to month with the setup fee, or a year up front at a discount) and any extras they want.',
      "Ask about their web address before they sign: (1) the free address that comes with every plan (theirbusiness.pages.dev, no cost), (2) a domain they buy themselves, or already own, that we connect, or (3) we buy it for them: tick the \"Domain name, bought for you\" extra: {domainPrice} on their bill (it's included with {proName}). Whichever they pick, the domain is theirs.",
      "The agreement appears, built from exactly what they picked. Hand them the phone: they type their full name, draw their signature and tap agree. Nothing is stored until they sign.",
      "Want them to read it first? 📄 Show them the agreement opens a preview for any plan with nothing signed, and ⬇ PDF gives them a copy.",
      'Churches and some clients prefer an invoice. The sign-up offers "Pay by check or bank transfer" where it\'s allowed; the owner then sends the invoice.',
      "The moment they sign, the lead turns Sold, the team gets an alert, the signed agreement is attached to the lead, and a callback is set for tomorrow in case payment isn't finished.",
    ],
    tryIt:
      'Open the "Payment test (not a real business)" lead and go through Sign up with your own name. It only ever charges $1 and starts no plan. Stop before paying, or pay $1 and refund it in the next lesson.',
    check: [
      {
        q: "Which way to pay has a setup fee?",
        options: ["The 12-month plan", "Month to month only", "All of them"],
        answer: 1,
        why: "Only month to month carries the setup fee. The 6- and 12-month plans and the yearly up-front option have none.",
      },
    ],
  },
  {
    id: "taking-payment",
    title: "Taking payment",
    minutes: 5,
    who: "everyone",
    why: "Three ways to pay, all on the phone. Payment today is the difference between sold and maybe.",
    steps: [
      '💳 Tap card on this phone (also "Take payment by tap" on the lead\'s sign-up card): they tap their card or phone wallet on the back of your phone. NFC and Location must be on. Stripe saves the card for the renewals.',
      "Enter card on this phone: type the card number into Stripe's secure form on the phone. Same result.",
      'Text them the payment link: for people who want to pay from their own phone or later. The lead stays "Signed, payment not finished" on Home until they do.',
      'After payment: the lead shows "Paid … by tap (Visa ••1234)", Stripe emails them a receipt, the renewal is scheduled for one month or one year out on the same card, and everyone gets a 💳 alert.',
      "Changed their mind? The owner taps ↩ Refund on the paid sign-up. It refunds in Stripe, can cancel the plan, and notes it in the call log.",
      "Tap to Pay rules the phone enforces: Android 13 or newer, NFC on, Location on, Developer options off, Google Play present, not rooted. The screen tells you which one is in the way.",
    ],
    tryIt:
      "On the Payment test lead, pay $1 with your own card by tap, see the note and the alert, then have the owner refund it.",
    check: [
      {
        q: "The card tap won't start and the screen mentions Developer options.",
        options: [
          "Try a different card",
          "Turn Developer options off in the phone's settings, then try again",
          "Use the payment link instead and never tap again",
        ],
        answer: 1,
        why: "Stripe refuses to take payments while Developer options are on. Turn them off and the tap works.",
      },
    ],
  },
  {
    id: "finish-and-publish",
    title: "Finishing the site and publishing",
    minutes: 6,
    who: "owner",
    why: 'We promise "live within 3 business days". It\'s usually ten minutes once the facts are confirmed.',
    steps: [
      "Open the Sold lead. The screen lists what must be done before publishing. Required items block Publish; suggested ones can wait.",
      "Replace the Google photo: Edit → Photo → upload the storefront photo you took. Add more under Photo gallery if you have them.",
      "Confirm the facts the owner gave you: services, prices, the license number for trades, emergency terms for contractors, the team list for salons.",
      "Text wrong in tone? Rewrite regenerates it. Design not right? Try another design, or pick colours and layout under Edit → Design.",
      "Tap Publish to Cloudflare. The app runs its checks and pushes the site up. It's live at an address like businessname.pages.dev, and the lead turns Live. Later changes use the same button, now called Republish changes.",
      'Live sites carry a small "Website by {company}" line in the footer. Clients text or call us with changes; their contact-form messages land in the Inbox and alert the team.',
    ],
    tryIt:
      "Open any Sold or Live lead and read its to-do list. Find where the photo is uploaded.",
    check: [
      {
        q: 'The "Finish & publish" checklist says the Google photo must be replaced. What do you do?',
        options: [
          "Delete the lead",
          "Upload the owner's photo under Edit → Photo, then publish",
          "Publish anyway from the website",
        ],
        answer: 1,
        why: "Google's photos are only allowed in previews. An owner, stock or AI photo must replace them.",
      },
    ],
  },
  {
    id: "their-domain",
    title: "Their own domain and email",
    minutes: 6,
    who: "owner",
    why: "The .pages.dev address works, but customers remember smithplumbing.com. However they get it, the domain stays theirs.",
    steps: [
      "Every client picks at sign-up: the free address (theirbusiness.pages.dev, nothing to do) or their own domain, which we always buy on our Cloudflare account in their name (the \"Domain name, bought for you\" extra on their order, {domainPrice}; free on {proName}). Check the lead's sign-up card to see which.",
      'On the Sold or Live lead, open the "🌐 Their domain" card. It lists name ideas and says which are Free or Taken; type another name and tap Check if none fit. Tap Use this on the one they want.',
      "Tap Copy name & open Cloudflare and register it there (paste the name in the search). Put the client's business name and contact as the registrant, leave auto-renew on. It costs about $10 to $15 a year at cost; their upfront charge covers the first registration and the monthly charge the renewals. If they ever leave, transfer it to them within 10 business days once they're paid up (registrars lock a new domain for 60 days).",
      "Back in the app, tap I bought it. The app connects it (the bare name and www) to their site, or on publish if the site isn't live yet. There's no DNS record to add yourself.",
      "Within minutes (sometimes an hour) the card turns ● Working: the site switches to the new address by itself, everyone gets an alert, and the .pages.dev address keeps working. The app checks every 5 minutes even if you never tap anything.",
      "{proName} includes business email. With the domain on Cloudflare, set up free email forwarding (info@theirbusiness.com → the inbox they already use), or a Google Workspace mailbox billed to them by Google.",
      "Then update the website field on their Google Business Profile (the Google profile tools on the lead walk you through it).",
    ],
    check: [
      {
        q: "Who owns the client's domain?",
        options: [
          "We do when we bought it, they do when they bought it",
          "The client, always, whoever bought it",
          "Cloudflare",
        ],
        answer: 1,
        why: "The domain is theirs under the agreement, even when we buy it and add it to their bill. We hand it over cleanly if they ever leave.",
      },
      {
        q: "A {basicName} client doesn't want to buy a domain themselves but wants a .com. What do you do?",
        options: [
          "Tell them they need {proName}",
          'Add the "Domain name, bought for you" extra; we buy it in their name',
          "Use the free .pages.dev address only",
        ],
        answer: 1,
        why: "Any plan can have its own domain. They buy it, or we buy it for them as an extra on their bill. Only {proName} includes it free.",
      },
    ],
  },
  {
    id: "after-the-sale",
    title: "After the sale",
    minutes: 4,
    who: "everyone",
    why: "Clients who hear from us stay. Most of this is one tap.",
    steps: [
      "Printables on the Live lead: Review cards (QR to their Google review link), QR table tents, a window sign and, for shops with a price list, QR price tags. Drop them off on your next visit.",
      "Text monthly report sends their visits and tap-to-call counts. A client who sees the phone ringing never cancels.",
      "Ask for a review texts them our Google review link once their site is live and they're happy.",
      "Extras later (photo shoot, Spanish page, NFC card, Google profile setup) go through the Buy extras link on the client screen. They sign and pay the same way.",
      "Change requests come in through the footer link on their site and land in the Inbox. Acknowledge the same day, even if the change takes longer.",
      "Renewals charge the stored card automatically. A failed payment alerts the team; the Stripe billing portal button lets the client update their card.",
    ],
    tryIt:
      "Open a Live lead (or the Payment test lead) and find the review cards, the monthly report and the Buy extras link.",
    check: [
      {
        q: "A live client texts that their hours changed.",
        options: [
          "Tell them to fill out a form instead",
          "Edit the hours in the app and republish; thank them and note it in the call log",
          "Ignore it until the monthly report",
        ],
        answer: 1,
        why: "Changes to text, hours and photos are included in every plan. Do it, republish, and log it.",
      },
    ],
  },
  {
    id: "live-price-list",
    title: "The live price list: board, tags and tablet",
    minutes: 6,
    who: "everyone",
    why: "Shops whose stock changes every day (fish, plants, produce, parts, used cars) buy this before they buy a website. It's the same four pieces every time.",
    steps: [
      "What it is: a price page on their site with a section per tank, shelf, bin or row; a private board they edit from any phone with no login; printed QR tags, one per section, that open that section; and a cheap tablet by the tank that shows it live. Change a price on the board and all four follow within a minute.",
      'The words change with the business: a fish store has a Tank board with tanks, a parts counter a Parts board with bins, a car lot a Lot board with rows. The app picks this from the business; Edit → "Live price list & QR labels" → Kind changes it.',
      'Give it to the shop: on a ready lead, tap "💬 Text them their … board link" (or Open it here to show it on your phone). The link is theirs: no password, no app. Anyone on their staff with the link can edit. If it ever gets out, Revoke old links (owner) kills every old link in one tap.',
      'Empty lists sell badly. Before you show it, the owner or full access taps "🧪 Add sample items (preview only)" on the lead: made-up stock for their kind of business fills the preview\'s price page, board and tablet. It\'s marked as samples, "Remove sample items" clears it, and nothing can publish while it\'s there.',
      'Show it to the owner: "📋 Show them the … board" next to Show them the plans is a customer-facing page that explains the whole thing in their words, with a Try it on this phone button and the price lines from Settings. "💬 Text them this page" sends it.',
      'On the board: + Add a tank (or bin, row…), then + Add to this tank: name, price, how many, a note, a photo from the camera, Sold out. Everything saves by itself. Items at 0 or Sold out disappear from the page; 5 or fewer shows "3 left".',
      'A long list: on the board, "Put a whole list on at once" takes a paste from Excel or Google Sheets or a .csv from their register. "Check it first" shows what it made of each column; then Add & update or Replace everything. Up to 2,000 items. The full steps are in the Live inventory guide (Settings → Guides).',
      'QR price tags: once the site is live, QR price tags on the lead prints a sheet of 8 labels per section. Laminate them. They never need reprinting for a price change, only when a section is renamed or added. More sheets are the "QR price tags & shelf labels" extra.',
      "Tablet: the 📺 link on each section in the board, opened in Chrome on any tablet, shows that section full-screen and live. Staff unlock it with a PIN (set on the board under Tablet & staff), a staff NFC tag or a code approved from the phone, and can change stock right there. Customers tap an item to read its info card.",
      "Price: {listPlan}, no minimum, or included in the Plus and Pro website plans (not Basic). Every month on it counts toward a website later. The full how-to, with set-up steps and trouble, is Settings → Guides.",
    ],
    tryIt:
      'On the Payment test lead, tap 🧪 Add sample items (the board card under "More on this lead", or the Preview screen) and look at the home page section and the In stock page. Then open the Payment test lead, tap Open it here, add a section and two items with counts, then open a 📺 link and watch them appear. Read "Show them the … board" once as if you were the shop owner.',
    check: [
      {
        q: "The owner's price on a tank changes. Who reprints the QR tag?",
        options: [
          "We do, same day",
          "Nobody: the tag opens the live page, so the new price is already there",
          "The shop prints a new one",
        ],
        answer: 1,
        why: "Tags point at the section, not the price. Only a renamed or new section needs a new tag.",
      },
      {
        q: "A fish store's board link was texted to a staff member who quit.",
        options: [
          "Nothing to do",
          "Owner taps Revoke old links; every old link dies and we text a new one",
          "Change the shop's PIN only",
        ],
        answer: 1,
        why: "Revoke old links makes a new key: old board links and tablet sessions all stop working at once.",
      },
    ],
  },
  {
    id: "barcode-scanning",
    title: "Barcode scanning (the add-on)",
    minutes: 4,
    who: "everyone",
    why: "Packaged goods come in by the case. Scanning beats finding each one in a list, and the shop will ask you how it works.",
    steps: [
      'It is an add-on (Barcode scanning, in the Inventory add-ons group). When a shop buys it, the owner or full access switches it on: Edit → Live price list → "Barcode scanning on". Until then there is no Scan button anywhere on their board or tablet.',
      'On their phone board: "▦ Scan" in the bottom bar. A known product shows its name, section and count with Put in / Take out; a new code asks for a name, a price and the section. "Scan the next one" keeps going through a delivery.',
      'Where it lives on the tablet: staff mode. Tap Staff in the corner, unlock (PIN, staff tag or the phone code), and "▦ Scan" appears in the bottom bar. Customers never see it. The phone board has a Barcode field with a ▦ button on each item too.',
      "Tap ▦ Scan and hold the product's barcode in front of the tablet's camera; Chrome reads it in about a second (the first time, tap Allow when Chrome asks for the camera). Or use any $25 to $40 USB-C or Bluetooth barcode scanner: it types the code into the box and presses Enter for you. Nothing to configure, they come in keyboard mode.",
      'A product the shop has scanned before: the sheet shows its name, which section it\'s in, how many are in stock and the price. Set the amount with − / + or type it, then "➕ Put in" for a delivery or "➖ Take out" for a case sold or sent back. "Scan the next one" keeps you going through the delivery.',
      "A product that sold out earlier: it comes back from the shop's catalog with its photo, price and info card, and goes into whichever section the tablet is on.",
      "A code the shop has never scanned: the tablet asks for a name, a price and the amount. Food, drink and pet products are often named automatically from the barcode (a free product database); parts and local goods you type. Then it asks for a photo and writes the info card, the same as any new item.",
      "Something that was added by name and later needs a code: ⋯ on the item → Barcode → ▦ Scan it (Change and Clear once it has one). One code belongs to one product, and the catalog keeps it after the last one sells, so the next delivery scans straight in.",
      "Scanning never changes a price unless staff type one. If the sheet says the browser can't read barcodes, the tablet isn't on Chrome: switch to Chrome or use a handheld scanner.",
    ],
    tryIt:
      'On the Payment test lead\'s board, set a staff PIN under Tablet & staff. Open a 📺 link, tap Staff, enter the PIN, tap ▦ Scan, and type 4006381333931 in the box and press Enter (no camera needed). Name it "Test flakes", add 2, then scan it again and Take out 2.',
    check: [
      {
        q: "A customer at the tablet wants to scan a product to see its price.",
        options: [
          "Show them the Scan button",
          "There is no Scan button for customers; they tap the item on the screen or scan the QR tag with their phone",
          "Unlock staff mode for them",
        ],
        answer: 1,
        why: "Scan only exists in staff mode. Customers read the screen, tap an item for its info card, or scan the section's QR tag.",
      },
      {
        q: "The scanner reads a code the tablet has never seen.",
        options: [
          "It refuses the code",
          "It asks for a name (often filled in already), a price and the amount, then a photo and an info card",
          "It adds it with no name",
        ],
        answer: 1,
        why: "New codes are named once; from then on they scan straight in.",
      },
    ],
  },
  {
    id: "discounts",
    title: "Referrals and the founding-customer bonus",
    minutes: 5,
    who: "everyone",
    why: "Two offers close deals: a client who sends us a business gets {referralMonths} months free, and our first {founderSlots} clients pick a free extra. Both run themselves once you record them right.",
    steps: [
      'Referrals. When a new lead came from a client, open the lead → "🤝 Referrals" → "Add who sent them" and pick the client. The sign-up page then tells the new business that their referrer earns {referralMonths} months free.',
      "The credit is earned when the new business's first payment goes through on a {referralMin}- or 12-month plan or yearly. Month to month and the Price list plan don't count, and the app notes why on the referrer's call log.",
      'The credit lands on the client\'s Stripe account by itself and comes off their next bills. A client with no card on file shows "apply by hand on their next invoice": the owner takes it off the invoice and taps "Mark applied".',
      "Up to {referralMax} credits count in each year of their service. More than that show as banked and are applied by themselves when their next year starts, so nothing is lost.",
      'Tell clients about it: the Referrals card has "💬 Text them about referrals" with the wording ready. Plans & answers has the answer to "Do you have a referral program?"',
      'Founding customers. While spots are open (the first {founderSlots} paying clients), the sign-up page and the app\'s sign-up show "🎁 Founding-customer bonus": they pick one of three extras free. It shows as a $0 line on the order and in the agreement. Say it out loud; it\'s a reason to sign today.',
      'The owner picks the three in Settings → Extras ("🎁 Founder pick") and sets the numbers in Settings → Sales → "🎁 Discounts".',
      'Month to month: picking it adds the one-time setup fee by itself, and the plan cards and the sign-up page say so. Never promise "no setup fee" unless they take the {referralMin}- or 12-month plan or pay yearly.',
    ],
    tryIt:
      'On the Payment test lead, tap "Add who sent them" and pick any client, then open "📋 Show them the plans" and find the setup-fee line on the cards. Clear the referrer when you\'re done (the practice lead never earns credits).',
    check: [
      {
        q: "A client referred a shop that took the month-to-month plan. What does the client get?",
        options: [
          "{referralMonths} months free, like any referral",
          "Nothing: a referral needs a {referralMin}- or 12-month plan or yearly",
          "A free extra",
        ],
        answer: 1,
        why: "Month to month can be cancelled next month, so it never earns a referral credit. The app writes that on the referrer's call log so nobody has to explain it twice.",
      },
      {
        q: "A client sends three referrals in their first year. What happens to the third?",
        options: [
          "It's lost",
          "It's banked and applied when their next year of service starts",
          "It's paid out in cash",
        ],
        answer: 1,
        why: "Up to {referralMax} count each year; the rest wait for the next year. Credits are never cash.",
      },
    ],
  },
  {
    id: "full-run",
    title: "The full run-through on the practice lead",
    minutes: 15,
    who: "everyone",
    why: "Every piece in one sitting, on a lead that can't hurt anyone: the Payment test lead is a pretend shop, every payment on it is $1, and the owner resets it for the next person.",
    steps: [
      'Leads → "Payment test (not a real business)". Tap Preview. Look at "What\'s in right now" on the home page and the In stock page in the menu; tap 🧪 Remove sample items, watch them go, and add them back.',
      "Log a call or visit → 🚶 Talked in person → 👍 Interested. The lead becomes Shown and books its own callback two days out.",
      '"📋 Show them the plans": read it as the customer. Then "📋 Show them the Stock board" → "Try the board on this phone": add an item, mark one sold out, scan a barcoded product with the camera if one is handy.',
      "Back on the lead, pick a plan. In the sign-up, choose a way to pay and tick one add-on under Inventory add-ons or Add extras. The total stays $1.",
      "Tick \"I've read the agreement\", read the pop-up (your add-on's terms are in it), type the name, draw a signature, consent.",
      '"💳 Tap card on this phone" with your own card. NFC on, Location on, Developer options off. You should see "Paid $1 in person by tap" in the call log, the sign-up marked paid, and an alert.',
      "Status → Sold. Owner or full access: Edit → Confirm what it asks for, remove the sample items, Publish to Cloudflare. Open the live address, find the In stock page, print the QR price tags from the Live card.",
      "Try the after-sale screens too: ↩ Refund on the paid sign-up, the Buy extras link, Ask for a review, the monthly report.",
      'Done? The owner taps "🔁 Reset for the next run" on the lead\'s Practice card: it refunds the $1, clears the sign-ups, notes and tasks, takes the published site down, forgets board links and photos, and puts the sample items back. The practice lead never expires and never counts in Sales.',
    ],
    tryIt:
      "Do all nine steps once, start to finish, then ask the owner to reset it.",
    check: [
      {
        q: "A trainee finished the run-through and published the practice site. What now?",
        options: [
          "Leave it live as an example",
          "The owner taps Reset for the next run, which also takes the site down and refunds the $1",
          "Delete the lead",
        ],
        answer: 1,
        why: "Reset puts everything back, including removing the published site and refunding the trainee's dollar. Deleting the lead would lose the training aid.",
      },
    ],
  },
];

const money = (n: number | undefined) =>
  n == null ? "" : `$${Number.isInteger(n) ? n : n.toFixed(2)}`;

/** The course with the company and plan names/prices filled in from Settings. */
export function trainingCourse(s: AppSettings): { lessons: Lesson[] } {
  const plans = s.plans ?? [];
  const byId = (id: string, i: number) =>
    plans.find((p) => p.id === id) ?? plans[i];
  const basic = byId("basic", 0);
  const plus = byId("plus", 1);
  const pro = byId("pro", 2);
  const list = plans.find(isListPlan);
  const sitePlans = plans.filter((p) => !isListPlan(p) && p.monthly > 0);
  const cheapest = sitePlans.length
    ? Math.min(...sitePlans.map((p) => p.monthly))
    : 0;
  const fromMonthly = cheapest
    ? `${money(cheapest)} a month`
    : "a low monthly price";
  const vars: Record<string, string> = {
    company: s.companyName || "Underground Associates",
    basic: basic ? `${basic.name} ${money(basic.monthly)}/month` : "Basic",
    plus: plus ? `${plus.name} ${money(plus.monthly)}/month` : "Plus",
    pro: pro ? `${pro.name} ${money(pro.monthly)}/month` : "Pro",
    basicName: basic?.name ?? "Basic",
    plusName: plus?.name ?? "Plus",
    proName: pro?.name ?? "Pro",
    domainPrice: domainPriceWords(s),
    fromMonthly,
    listPlan:
      list && list.monthly > 0
        ? `the ${list.name} plan at ${money(list.monthly)} a month`
        : "the Price list plan",
    referralMonths: String(promoRules(s).referralMonths),
    referralMax: String(promoRules(s).referralMaxPerYear),
    referralMin: String(promoRules(s).referralMinMonths),
    founderSlots: String(promoRules(s).founderSlots),
  };
  const fill = (t: string) =>
    t.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);
  return {
    lessons: LESSONS.map((l) => ({
      ...l,
      why: fill(l.why),
      steps: l.steps.map(fill),
      tryIt: l.tryIt ? fill(l.tryIt) : undefined,
      check: l.check.map((c) => ({
        ...c,
        q: fill(c.q),
        options: c.options.map(fill),
        why: fill(c.why),
      })),
    })),
  };
}

export const LESSON_IDS = LESSONS.map((l) => l.id);
