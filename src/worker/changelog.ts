/**
 * What's new: the team-facing change log. Every update that changes what the team sees or can do gets an entry at the TOP
 * of CHANGELOG (n = the previous top n + 1), written for the people using the app, not for programmers: what changed,
 * where to find it, what to do differently. An Android release carries its version name in `android` (the test checks the
 * newest one matches android/app/build.gradle.kts). Web and Android both show unseen entries in a pop-up after an update
 * and the whole list under Settings → What's new.
 */
export type ChangeEntry = {
  /** Increasing number; the newest entry has the highest. */
  n: number;
  /** YYYY-MM-DD (Cullman time). */
  date: string;
  /** Android version name this shipped in ("2.74"), when the phone app changed. */
  android?: string;
  title: string;
  items: string[];
};

export const CHANGELOG: ChangeEntry[] = [
  {
    n: 80,
    date: "2026-10-21",
    title: "The live price list is now a Plus and Pro feature (not Basic)",
    items: [
      "The Basic plan no longer lists the live price list. It's included in Plus and Pro, or on its own as the Price list plan.",
      "Changed everywhere it's described: the plan cards on undergroundassociates.com, the pricing and price-list pages, Show them the plans, Plans & answers, the guides and the training.",
      "When a shop whose stock changes wants the price list with a website, sign them up for Plus or Pro.",
    ],
  },
  {
    n: 79,
    date: "2026-10-21",
    title: "Google Search Console set up by itself for every live site",
    items: [
      "When a site is published, the app now registers it with Google Search Console, proves it's ours, sends Google the list of its pages (the sitemap) and adds our company Google address as an owner. No codes to copy any more.",
      "On the lead page, the 📊 Google Analytics & Search Console box shows \"Search Console: verified, sitemap sent\" with a link. \"Give the owner access\" now gives the client both their Analytics and their Search Console.",
      "Owner, one-time: Google Cloud (the project of our service account) → APIs & Services → Library → switch on \"Site Verification API\" and \"Google Search Console API\". Settings → Connections shows the exact project. Once the first site works, every live site is done by itself.",
    ],
  },
  {
    n: 78,
    date: "2026-10-21",
    title: "Tapping a photo on a site shows the photo again",
    items: [
      "On some phones (the app's own preview among them), tapping a photo to see it bigger showed only its caption on a dark screen. The big photo now sizes itself from the phone's real screen, so it always shows.",
      "Previews are redrawn with the fix over the next few minutes; live sites republish with it by themselves. Nothing to do.",
    ],
  },
  {
    n: 77,
    date: "2026-10-21",
    title: "Every new site comes with Spanish ready, behind one button",
    items: [
      "When a new site is built, its Spanish version is written at the same time and kept off the site. Customers don't see it until you turn it on.",
      "To turn it on: Edit → Spanish page → \"🇲🇽 Turn Spanish on\" (on the phone app: \"Write Spanish page\"). It's instant: the Español button and every /es/ page appear right away, and a live site updates by itself within a couple of minutes.",
      "Turning it off (\"Turn Spanish off\", or \"Remove\" on the phone) keeps the translation, so turning it back on is instant again. \"Rewrite Spanish\" translates the whole site afresh after big text changes.",
      "Sites built before today don't have one waiting: turning Spanish on for them writes it then (about 20 seconds), as before.",
    ],
  },
  {
    n: 76,
    date: "2026-10-21",
    title: "Home link in every site's menu",
    items: [
      "Every client site's menu (the ☰ button on phones, the menu bar on computers) now starts with \"Home\", so visitors on the menu page or any other page can get back to the start in one tap. Spanish pages say \"Inicio\".",
      "Live sites republish with it by themselves, and every preview is redrawn with it over the next few minutes. Nothing to do.",
    ],
  },
  {
    n: 75,
    date: "2026-10-21",
    title: "Food photo mosaic + menu section notes",
    items: [
      "New place for a gallery photo: Edit → Photo gallery → Where it shows → \"Food / featured photo mosaic\". Two or more photos make a section with one big photo and smaller ones around it, the caption on each photo, and a tap opens it full screen. On a restaurant it sits right after the menu and is called \"From our kitchen\"; anywhere else it's \"Our work\".",
      "On a restaurant, caption a food photo with the menu item's exact name (\"Cuban\") and its price shows on the photo too.",
      "Menus: a section line can carry a note now, like \"# Wraps | $13, served with one side\". The note shows under the section name on the menu page.",
    ],
  },
  {
    n: 74,
    date: "2026-10-21",
    title: "Extra sections: a section of the owner's own",
    items: [
      "New Edit card \"Extra sections\" on every site: up to 3 sections in the owner's words (a $5 grab bag, a cause they support, a rewards card), each with a heading, a few paragraphs, an optional photo from the Photo gallery beside it and one button (directions, call or text).",
      "They show near the bottom of the home page, before the closing call. Spanish sites translate them on their own.",
      "Leave a section's heading empty and save to remove it. Works on the phone app's Edit too, no update needed.",
    ],
  },
  {
    n: 73,
    date: "2026-10-21",
    title: "The Español button shows on every site",
    items: [
      "On designs with a dark top bar, the \"Español\" button at the top of client sites was dark text on a dark bar, so it looked like the Spanish version was missing. It now takes the bar's own text color.",
      "Live sites with a Spanish version republish by themselves within a few minutes; nothing to do.",
      "Design changes now show at once on a client's own domain too: before, a phone that had visited the site could keep the old look for up to 4 hours (a private / incognito window showed the new one).",
    ],
  },
  {
    n: 72,
    date: "2026-10-19",
    android: "2.90",
    title: "Charge extras to the card on file",
    items: [
      "Adding an extra doesn't charge anything by itself. Right after you tap \"Add the extras, then take payment\", the app now asks how they pay.",
      "New: \"💳 Charge their card on file\" for clients who already paid their plan with a card: one tap, no card needed in hand. Tap and \"Type in the card numbers\" are still there.",
      "Unpaid extras say \"⚠️ Not charged until you tap one of these.\"",
    ],
  },
  {
    n: 71,
    date: "2026-10-19",
    android: "2.89",
    title: "Add an extra and take the payment right in the app",
    items: [
      "On a client's lead page (Sold or Live), the 🛒 Extras card has \"➕ Add an extra now (they pay here)\": tick the extras (and how many), type who approved it, tap Add the extras.",
      "The new order shows right there with two buttons: \"💳 Take payment by tap\" and \"⌨️ Type in the card numbers\". Monthly extras then renew on the same card every month; one-time ones are charged once.",
      "Added one by mistake? Tap Remove before it's paid. On the web app, the card button opens Stripe's secure card page.",
    ],
  },
  {
    n: 70,
    date: "2026-10-19",
    android: "2.88",
    title: "Domain name: $11 upfront, then $2 a month",
    items: [
      "The \"Domain name, bought for you\" extra is now $11 upfront (the first registration), then $2 a month. Every price list, the sign-up page and phone sign-up totals, the agreement, the company website, Plans & answers, the domain card, training and guides say so. Still free on Pro.",
      "Owner: Settings → Extras has a new \"Upfront\" amount for monthly extras (charged once with the first payment).",
    ],
  },
  {
    n: 69,
    date: "2026-10-19",
    title: "Donation details no longer block publishing",
    items: [
      "A thrift store's \"what you accept for donations and drop-off hours\" is now a suggestion, not a must: the site can go live without it, and the Donations section just says to call until they tell us.",
      "In Finish & publish, that line now opens the Donations card in Edit (it used to open Facts).",
    ],
  },
  {
    n: 68,
    date: "2026-10-19",
    android: "2.87",
    title: "Tap to Pay fixed + a Type in the card numbers button",
    items: [
      "Tap to Pay works again after a first try: the phone kept using the first payment's pass, so every later tap stopped at \"This payment was restarted\". Update the app, then start the payment again from the lead page.",
      "New button \"⌨️ Type in the card numbers\" right under \"💳 Take payment by tap\" on the lead page's sign-up card (and on the sign-up screen after they sign): Stripe's card form opens, they type the card, it's charged and saved for renewals. On the web app the same button opens Stripe's secure card page.",
      "The card form uses Stripe's newest version, which fixes typing card numbers on newer Android phones.",
    ],
  },
  {
    n: 67,
    date: "2026-10-18",
    android: "2.86",
    title: "Live stock on a website someone else built",
    items: [
      "A shop that already has its own website can now show our live stock list on it. Sell them the Price list plan; the board, tablet and QR tags work as always.",
      "On the lead page's board card: \"🔌 Text their web person the setup page\", \"Open the website setup page\" and \"Copy the website code\" (web and phone).",
      "The setup page gives their web person one line of code to paste (the list takes on their site's fonts and colors), a frame version for picky site builders, and a plain link. It updates itself within a minute of every change on the board or tablet.",
      "How-to: Settings → Guides → Live inventory → \"On a website someone else built\".",
    ],
  },
  {
    n: 66,
    date: "2026-10-18",
    title: "No more \"Request a change\" on client sites",
    items: [
      "Live client websites no longer show the \"Request a change\" link in the footer. The small \"Website by Underground Associates\" line stays.",
      "Clients text or call us when they want something changed. Live sites pick this up the next time they're republished (the app republishes them all for you).",
    ],
  },
  {
    n: 65,
    date: "2026-10-17",
    android: "2.85",
    title: "Republish button on live sites",
    items: [
      "Live sites now have a green \"🔁 Republish changes\" button right on the Client site card (web and phone). Before, it was hidden under \"More on this lead\". Tap it after any edit, Spanish page or photo change so the live site shows it.",
    ],
  },
  {
    n: 64,
    date: "2026-10-17",
    title: "Web lead page fixed",
    items: [
      "Client site → 📊 Google Analytics → \"Give the owner access\" works now (it said \"insufficient authentication scope\", then timed out once). Google can be slow: the app now waits longer and tries a second time. Google doesn't email the owner; they just find the site at analytics.google.com.",
      "Every live site with Google Analytics now has a Privacy page (linked in its footer) saying how visits are counted and how to opt out, even when the site has no contact form. Google's terms require it.",
      "The lead page in the web app (laptop / phone browser) showed \"reload is not defined\" since the 📬 I mailed it button came in this morning. Fixed; thanks Katy for reporting it. The Android app was never affected.",
      "Ticking \"Payment is set up\" now also clears the \"payment not finished, call them\" callback and writes \"Marked paid by hand\" in the call log.",
    ],
  },
  {
    n: 63,
    date: "2026-10-17",
    title: "No more namesakes' websites on our previews",
    items: [
      "When the app searches the web for a business's own page, the page must now mention their phone number, their town or Alabama. A business with a common name (our test \"Doug's Diner\" found a Colorado chain) no longer gets someone else's photos, story or \"since\" year.",
      "\"✖ Not their website\" now also removes the founding year, email and social links that page had filled in.",
      "Settings → Google Analytics row keeps showing the service account email and the two Google steps until the first site really gets its Analytics.",
    ],
  },
  {
    n: 62,
    date: "2026-10-17",
    android: "2.84",
    title: "Problem reports always alert the owner",
    items: [
      "Every 🐞 Report this now sends an alert and a phone notification to the owner and full access, even when it was sent from the same login (before, a report sent from the owner login alerted nobody).",
      "The alert shows what the person typed, not just \"Something didn't work\".",
      "You can type a longer description now (up to 1,000 characters; it used to stop at 120).",
      "Dry cleaners and laundries are built as a dry cleaner & laundry storefront, not house cleaning. L & L Dry Cleaners was rebuilt.",
      "Feed, animal health, livestock and farm supply stores are built as farm & feed stores, not gift shops. Falkville Animal Health was rebuilt.",
    ],
  },
  {
    n: 61,
    date: "2026-10-17",
    title: "Spanish sites switch by themselves",
    items: [
      "Websites with a Spanish version now open in Spanish on their own when the visitor's phone is set to Spanish, on whatever page they land on.",
      "Every page has an Español / English button in the top bar (no longer only inside the menu). It goes to the same page in the other language, and the site remembers the visitor's choice next time.",
      "Thrift & More and Reyes pizza have Spanish pages: open Edit and tap Save once so their previews pick this up. Sites go live with it automatically.",
    ],
  },
  {
    n: 60,
    date: "2026-10-17",
    android: "2.83",
    title: "Slide the photo and the words into place",
    items: [
      "Preview → “↕ Adjust the top photo”: three sliders (Words position, Photo position, Shade on the photo). The preview moves while you drag, so you can line the words up with the photo exactly. Tap Save to keep it, Undo to go back, As designed to start over.",
      "The same three sliders are in Edit → Photo. They replace the Higher / Lower / Much lower steps; anything you set with the steps carries over.",
      "Phone app: update to 2.83 for the sliders.",
    ],
  },
  {
    n: 59,
    date: "2026-10-17",
    title: "Move the words and the photo separately",
    items: [
      "Edit → Photo has three new settings for the top of the page, on every website: Words position (Higher / Lower / Much lower), Photo position (slide the picture Higher / Lower / Much lower behind the words) and Shade on the photo (Lighter / Much lighter, when the photo looks too dark).",
      "Mix them until a sign or the important part of the photo shows where you want it, then Save. “As designed” / “As is” puts each one back.",
      "“Or take the words off the photo” is still there if the words should sit under the photo instead. Works in the phone app with no update.",
    ],
  },
  {
    n: 58,
    date: "2026-10-17",
    title: "“Bottom of the photo” fixed on phones",
    items: [
      "Edit → Photo → Words on the main photo → “Bottom of the photo” now shows the whole photo clear at the top on phones, with a short fade just above the words. It used to darken the bottom of the photo and, in the app's preview, slide the words back over it.",
      "Already picked it? Open Edit and tap Save once so the preview rebuilds.",
    ],
  },
  {
    n: 57,
    date: "2026-10-17",
    title: "Move the words off a sign in the main photo",
    items: [
      "Edit → Photo → “Words on the main photo”: when the business name covers a sign or lettering in their photo, pick “Under the photo” (the photo shows clear with nothing on it, the name sits on a card below) or “Bottom of the photo” (the top half of the photo stays clear and the words sit at the bottom). Then Save.",
      "“As designed” puts it back. Works on every website and in the phone app, no update needed. Keep in view and Zoom in on phones still move the photo itself.",
    ],
  },
  {
    n: 56,
    date: "2026-10-17",
    title: "Pick where each photo shows",
    items: [
      "Edit → Photo gallery: every photo now has one “Where it shows” choice: Photos grid, What's new row, Big photo between sections, or Don't show it. A photo only appears in the place you pick, so it no longer shows up twice.",
      "This replaces the two tick boxes (What's new, big photo). Photos you already ticked keep their place.",
    ],
  },
  {
    n: 55,
    date: "2026-10-17",
    android: "2.82",
    title: "Swap any stock photo on any website",
    items: [
      "Edit → Stock photos now has two photo pickers on every website: Main photo (top of the page) and Big photo between sections (also used behind the closing call).",
      "Tap any picture in the row: another stock photo for their trade, or one of their own photos (add theirs in Photo gallery first). Then Save. Automatic puts it back to our pick.",
      "Picking a photo for the between-sections spot also turns that strip on if the design didn't have one. To remove the strip, go to Edit → Design → Page structure and set More photos to “Opening only”.",
      "Phone app: update to 2.82 to see the pictures in the pickers.",
    ],
  },
  {
    n: 54,
    date: "2026-10-17",
    title: "Pick the big photo between sections",
    items: [
      "Some designs show a wide photo partway down the home page or behind the closing call. Until now it was always a stock photo.",
      "To use one of their own photos there: Edit → Photo gallery → tick “Use as the big photo between sections” under the photo, then Save. It works even if that photo is also in What's new. Works the same in the phone app; no update needed.",
      "To drop the strip altogether, go to Edit → Design → Page structure and set More photos to “Opening only”.",
    ],
  },
  {
    n: 53,
    date: "2026-10-17",
    android: "2.81",
    title: "Mailed-flyer button, and texts in your own name",
    items: [
      "New on every lead: 📬 I mailed it, under the flyer code. Tap it after a flyer goes in the mail. It keeps their preview up for the code and books a call 5 days out, when the flyer should have arrived. 📬 Mailed a flyer is also in Log a call or visit.",
      "Fixed: preview texts, flyers and call guides sent by team members with full access started with the owner's name. They now use the name of whoever is signed in.",
    ],
  },
  {
    n: 52,
    date: "2026-10-16",
    title: "Tasks show in the Google Tasks app",
    items: [
      "Your tasks now show in the Google Tasks app on Android and iPhone, and in the Tasks list in Gmail and Google Calendar. That includes tasks with no date.",
      "Tick a task off in Google Tasks and it's marked finished in our app within a few minutes. Finishing it in our app ticks it off in Google Tasks.",
      "Google Tasks only keeps the day, so a task's time is shown first in its notes (⏰ 2:30 PM). Tasks with a time also stay on Google Calendar as events, with the 30-minute reminder. Date-only tasks show on the calendar as tasks instead of events.",
    ],
  },
  {
    n: 51,
    date: "2026-10-16",
    title: "Tasks now go straight onto your Google Calendar",
    items: [
      "A task with a date goes straight onto the calendar of everyone it's for, the moment it's saved. Nothing to accept.",
      "You also get a short email, \"📅 On your calendar: …\", and a phone notification from the app. You get both again if the date or time changes, or when you're added to a task later. The person who makes the change doesn't get them.",
      "Task notifications reach you even if your alerts are set to \"My leads\" or \"Important only\".",
      "Timed tasks remind you 30 minutes before. Finishing or deleting a task takes it off everyone's calendar.",
    ],
  },
  {
    n: 50,
    date: "2026-10-16",
    title: "Tasks can go straight onto your calendar",
    items: [
      "Once the owner finishes a one-time Google setup, tasks go straight onto your Google Calendar: nothing to accept, and changes show up right away.",
      "Until then, tasks keep arriving as calendar invites by email.",
      "Owner: Settings → the \"Tasks on Google Calendar\" line in the Connections strip has the two steps (turn on the Calendar API, then allow it in the Google Admin console).",
    ],
  },
  {
    n: 49,
    date: "2026-10-16",
    android: "2.80",
    title: "Tasks go on everyone's Google Calendar",
    items: [
      "A task with a date now shows up on the Google Calendar of every person it's for, not just the owner's. It arrives as a calendar invite by email: accept it once and it stays on your calendar.",
      "Changing the task updates it on everyone's calendar. Finishing or deleting it takes it off. Taking someone off the task takes it off their calendar, and adding someone sends it to them.",
      "A task for \"anyone\" still goes to the owner's calendar.",
      "It goes to the email in Settings → Team. If someone has no email there, the app tells you when you save the task. Owner: add each person's work email so their calendar gets tasks.",
    ],
  },
  {
    n: 48,
    date: "2026-10-16",
    android: "2.79",
    title: "Guide: from yes to live",
    items: [
      "A new step-by-step guide covers everything after a business says yes: sign-up, editing their site, publishing, their own domain, getting found on Google, and Google Analytics.",
      "Open it from Settings → 🚀 From yes to live, or from the \"🚀 The whole path, step by step\" link on the lead page's Finish & publish card.",
    ],
  },
  {
    n: 47,
    date: "2026-10-16",
    android: "2.78",
    title: "Domains in three taps",
    items: [
      "Sold and live leads have a \"🌐 Their domain\" card. It suggests names (reyespizza.com, reyespizzahanceville.com…) and shows which are Free or Taken. Type your own idea and tap Check.",
      "Tap Use this, then Copy name & open Cloudflare: buy it there with the client as the registrant (every domain is bought on our Cloudflare, in their name).",
      "Back in the app, tap I bought it. The app connects the domain and www to the site by itself: no DNS records to type. The site switches over once it works, and everyone gets an alert.",
      "Not live yet? Buy it anyway: publishing hooks it up. The training lesson \"Their own domain and email\" walks through it.",
    ],
  },
  {
    n: 46,
    date: "2026-10-16",
    android: "2.77",
    title: "Domains switch over only once they work",
    items: [
      "Typing in a client's domain no longer changes the site's address right away. The site keeps its free .pages.dev address until Cloudflare says the domain works.",
      "The app checks every 5 minutes. When the domain works, the site switches to it by itself, it's noted in the call log, and everyone gets an alert (\"🌐 … is live\").",
      "QR codes, review cards and the price list links use the domain only once it works, so nothing ever points at an address that doesn't load.",
      "Nothing can be published to a domain we don't control: it only works after someone with access to the domain adds the DNS record shown on the lead page.",
    ],
  },
  {
    n: 45,
    date: "2026-10-16",
    title: "A place for their domain name",
    items: [
      "Edit → \"Their domain name\": type the domain the business bought (or we bought for them), like www.theirbusiness.com. Works on the web app and the phone.",
      "You can type it before the site is published: publishing connects it. Typed after publishing, it's connected right away and the site republishes.",
      "Then add the DNS record shown on the lead page (Client site → Their own domain). Clear the box to go back to the free .pages.dev address.",
    ],
  },
  {
    n: 44,
    date: "2026-10-16",
    android: "2.76",
    title: "Google Analytics on every client site, set up by itself",
    items: [
      "When a site is published, the app creates that business its own Google Analytics and puts it on every page (Spanish pages too). Previews never count.",
      "Calls, texts, Directions taps and form sends show up in Google Analytics as events.",
      "Lead page → Client site → 📊 Google Analytics: Open their reports, or Give the owner access with their Gmail so they can see their own numbers.",
      "Sites already live get it on their next republish (all of them at once, as soon as it's connected).",
      "Owner: one-time setup in Settings → Website → \"Google Analytics account for client sites\". The Connections strip at the top of Settings lists the steps.",
      "If a business already has its own Google Analytics, type their ID in Edit → Links instead.",
    ],
  },
  {
    n: 43,
    date: "2026-10-16",
    title: "Spanish sites translate the whole site",
    items: [
      "The Spanish version used to be a short summary page that left out the menu, reviews, FAQ and photos. Now every page and every section is translated: the menu, price list, reviews, FAQ, hours, buttons and footer.",
      "Links on a Spanish page stay in Spanish (the Menú link opens the Spanish menu), and the English link goes back to the same page in English.",
      "When the site changes (new menu items, edits, new sections), the new lines are translated automatically on the next save.",
      "Sites that already had a Spanish page were redone this way.",
    ],
  },
  {
    n: 42,
    date: "2026-10-16",
    android: "2.75",
    title: "What's new: this change log",
    items: [
      "After every update, a \"What's new\" pop-up lists what changed since you last looked. Tap Got it to close it.",
      "The whole history is under Settings → 📋 What's new (and the 📋 What's new button on Home), newest first, back to the first day.",
      "The phone's \"Update available\" pop-up now shows what's in the update before you install it.",
    ],
  },
  {
    n: 41,
    date: "2026-10-16",
    android: "2.74",
    title: "Send the Spanish version of a preview",
    items: [
      "When a site has a Spanish page, the lead page, call guide, walk-in guide and Preview screen show 🇲🇽 Text Spanish link, Copy Spanish message and Open Spanish version.",
      "The text goes out in Spanish and the link opens the site straight in Spanish, with the preview banner in Spanish too.",
      "Make the Spanish page first: Edit → Spanish page → Write Spanish page.",
    ],
  },
  {
    n: 40,
    date: "2026-10-15",
    android: "2.73",
    title: "Photo controls for every photo on a site",
    items: [
      "Edit → Photo: pick what stays in view (middle, top, bottom, left, right…) and how far to zoom in on phones, or remove the main photo.",
      "Edit → Photo gallery: every photo has its own \"Keep in view\" setting.",
      "Edit → Stock photos: see the library photos a site uses and tick \"Don't use this one\" to swap any of them out.",
    ],
  },
  {
    n: 39,
    date: "2026-10-15",
    title: "Service menus in groups, address changes, text-first salons",
    items: [
      "The services box takes group headings: a line like \"# Color | Prices vary by length\" starts a group. Salon sites show grouped menus with jump buttons.",
      "Prices like +$5 show as add-ons; up to 120 services per site.",
      "Edit → Confirm now has Street address, Town and ZIP. Changing them moves the map pin and the Directions button.",
      "Appointment-only salons that take texts lead with \"Text for an appointment\".",
      "A full-width opening photo with lettering (like a sign) stays readable on phones.",
    ],
  },
  {
    n: 38,
    date: "2026-10-15",
    android: "2.72",
    title: "Stock lookup for shops that keep stock in QuickBooks",
    items: [
      "A simple search page for a shop: type a tire size (any way it's written: 265/70R17, 265 70 17, 2657017) or a name and see what's in stock.",
      "The shop updates it by uploading their QuickBooks export (Excel or CSV) from the same page.",
      "On the lead page's board card: 🔎 Text them the stock lookup / Open the lookup here.",
    ],
  },
  {
    n: 37,
    date: "2026-10-15",
    android: "2.71",
    title: "What's new photo carousel, tap any photo to enlarge",
    items: [
      "Edit → Photo gallery: tick \"Show in What's new\" on a photo to put it in a swipeable photo row with arrows and dots.",
      "Works on every kind of site (shops show it in their What's new section, others as \"Our latest photos\").",
      "Every photo on a site opens big when tapped, with next / previous and swipe.",
    ],
  },
  {
    n: 36,
    date: "2026-10-15",
    android: "2.70",
    title: "Tasks for several people",
    items: ["When adding or editing a task, tick more than one person under \"For\". Leave all unticked for anyone."],
  },
  {
    n: 35,
    date: "2026-10-14",
    title: "Towing companies get their own kind of site",
    items: [
      "Tow companies build as \"Towing & Roadside\" (towing, jump starts, lockouts, a Request a tow form) instead of a repair shop.",
      "Shops that tow and repair build as \"Towing & Auto Repair\".",
    ],
  },
  {
    n: 34,
    date: "2026-10-14",
    android: "2.69",
    title: "Time clock and timesheets",
    items: [
      "Anyone with an hourly rate gets a ⏱ Clock in / Clock out card at the top of Tasks, with today's and this week's hours.",
      "Owner: Settings → Team → Set hourly pay; 🗂️ Timesheets shows each week, lets you fix or add a shift, and downloads a CSV for payroll.",
      "Tasks on the phone have calendar and clock pickers, and you can tap a task to change or delete it.",
    ],
  },
  {
    n: 33,
    date: "2026-10-14",
    android: "2.68",
    title: "Claude API key from Settings",
    items: ["Owner: Settings → 🤖 Claude API key. Paste a new key when the account changes; the app checks it before saving."],
  },
  {
    n: 32,
    date: "2026-10-14",
    android: "2.67",
    title: "Flyer codes and the mail-out flyer",
    items: [
      "Every lead has a 5-digit flyer code on its lead page. Write it in the white box on the flyer.",
      "The business types it at undergroundassociates.com/code to see their sample, and everyone gets an alert.",
      "Log \"Left a flyer\" so their preview stays up 90 days.",
      "Owner: Settings → 📬 Flyer mail-out prints the flyer and downloads a mailing list with codes.",
      "Shared previews end with \"Like it? Call or text\" our number.",
    ],
  },
  {
    n: 31,
    date: "2026-10-13",
    android: "2.65",
    title: "Sites come to life",
    items: [
      "Sites without their own photos now use real photos of their kind of work from our library.",
      "New designs add shaped section edges, decorations and photo bands.",
      "The dashed to-do notes are hidden from customers. Preview → 📝 Show notes to see them.",
    ],
  },
  {
    n: 30,
    date: "2026-10-13",
    android: "2.64",
    title: "Describe the style they want",
    items: ["Lead page → Design: type a style (\"rustic country\", \"bright and happy\") or tap an idea, then ✨ Design it. It can rewrite the words to match."],
  },
  {
    n: 29,
    date: "2026-10-13",
    android: "2.63",
    title: "Connection fix for some phones",
    items: ["Fixes \"Trust anchor for certification path not found\" on phones with antivirus, VPN or ad-blocker apps."],
  },
  {
    n: 28,
    date: "2026-10-13",
    android: "2.61",
    title: "Domains: three choices, always the client's",
    items: [
      "Ask every client at sign-up: the free address, a domain they buy, or one we buy for them in their name ($2 a month, free on Pro).",
      "The domain always belongs to the client.",
    ],
  },
  {
    n: 27,
    date: "2026-10-13",
    android: "2.60",
    title: "Commission calculator",
    items: ["Home → 💰 What I'd earn: pick a plan, way to pay and extras to see your bonus and monthly residuals."],
  },
  {
    n: 26,
    date: "2026-10-13",
    android: "2.59",
    title: "Spam protection and safer Settings saves",
    items: [
      "Website contact forms block spam; blocked messages are counted in the Inbox instead of alerting you.",
      "Saving Settings from the phone no longer wipes fields the phone doesn't show.",
    ],
  },
  {
    n: 25,
    date: "2026-10-13",
    android: "2.57",
    title: "Better designs; a sold design is never reused",
    items: [
      "An AI art director picks each new site's design from the business and explains why on the Design card.",
      "Phone views differ between sites too.",
      "Once a client buys a design it's theirs alone; it's marked sold in the pickers.",
    ],
  },
  {
    n: 24,
    date: "2026-10-12",
    android: "2.55",
    title: "Businesses that aren't on Google",
    items: [
      "Add a business → \"Not on Google? Add it by hand\" builds a site from typed-in details.",
      "New search group: party and event rentals.",
      "The company site has an Extras page customers can find.",
    ],
  },
  {
    n: 23,
    date: "2026-10-12",
    android: "2.54",
    title: "Import from their Google page; change the kind of business",
    items: [
      "Lead page → 🔄 Import from their Google page refreshes hours, phone, photos and details from Google.",
      "Edit → Kind of business rebuilds a site as another kind (for a business that was guessed wrong).",
      "Juice bars and nutrition clubs never talk about dining in.",
    ],
  },
  {
    n: 22,
    date: "2026-10-12",
    android: "2.53",
    title: "Tablet picker, company emails, board fix",
    items: [
      "The shop tablet shows every tank as a tile; customers tap one to open it.",
      "Tablet staff mode asks for the PIN every time.",
      "Company billing@ and support@ addresses in Settings.",
      "Fixed boards stuck on \"Loading your tanks\".",
    ],
  },
  {
    n: 21,
    date: "2026-10-12",
    android: "2.51",
    title: "New app address",
    items: ["The app now lives at app.undergroundassociates.com. Re-add it to your home screen and turn alerts on again there."],
  },
  {
    n: 20,
    date: "2026-10-12",
    android: "2.49",
    title: "Easier to use: always know the next step",
    items: [
      "Every lead opens with one Next step card.",
      "Home shows an Up next queue: payments, callbacks, opened previews, follow-ups, sites to publish.",
      "Sign them up in three taps; a Finish & publish checklist; a Start here card for new teammates.",
      "Alerts can be set to all / mine / important; Report this sends a problem to the owner.",
      "📖 What the words mean explains every status.",
    ],
  },
  {
    n: 19,
    date: "2026-10-12",
    android: "2.48",
    title: "Client card, referrals and founding customers",
    items: [
      "A green ✅ Client card on paid leads shows the plan, how they paid and when it renews.",
      "Callers can now work a lead end to end (edit, publish, take payment).",
      "Referral program (2 months free per referral) and a free extra for our first 5 clients; training lesson added.",
    ],
  },
  {
    n: 18,
    date: "2026-10-12",
    android: "2.44",
    title: "Practice lead and Tap to Pay fixes",
    items: [
      "The Payment test lead is the practice run: everything on it is $1; 🔁 Reset for the next run (owner).",
      "Tap to Pay works again; a failed tap reports why.",
      "The sign-up screen keeps the signature when you leave and come back.",
    ],
  },
  {
    n: 17,
    date: "2026-10-11",
    android: "2.40",
    title: "Inventory system: board, import, scanning, sample stock",
    items: [
      "The live price list's editor is \"the board\" (Tank board, Parts board, Lot board… by kind of shop).",
      "Put a whole inventory on at once from a spreadsheet; Barcode scanning is a $15/month add-on.",
      "🧪 Add sample items to a preview to show a shop how it works (removed before publishing).",
      "Shops can add the board to their home screen with their own name.",
    ],
  },
  {
    n: 16,
    date: "2026-10-11",
    android: "2.36",
    title: "Price list for every business; Costs & usage",
    items: [
      "Any kind of business can have a live price list page with QR labels.",
      "Owner: 💵 Costs & usage shows what the app costs each month.",
      "Prices are always said per month, never per day.",
      "The web app reloads itself when there's a new version.",
    ],
  },
  {
    n: 15,
    date: "2026-10-11",
    android: "2.33",
    title: "Guides, Show them the board, in-person outcomes",
    items: [
      "Settings → 📖 Guides: the board, QR price tags and the tablet display, step by step.",
      "Show them the board: a customer page on shop leads, and a page you can text them.",
      "Log a call or visit: Owner not in, Talked in person, Left a flyer.",
      "Tablet station: staff can count stock, add items and photos, and get AI care cards.",
    ],
  },
  {
    n: 14,
    date: "2026-10-11",
    android: "2.27",
    title: "Any business, their old website, the Tank board",
    items: [
      "\"Something else\" builds a site for any kind of business.",
      "Previews read their current website and bring over its photos; ⬇️ Import their website on the phone when the server can't reach it.",
      "Tank board: shops edit their own live price list from a phone; Price list plan ($29/month) for shops that only want that.",
      "Directory pages are never treated as their website.",
    ],
  },
  {
    n: 13,
    date: "2026-10-11",
    android: "2.19",
    title: "Instant updates and alerts, faster app",
    items: [
      "🔎 Re-check website searches the web for a page Google doesn't know about.",
      "Updates and alerts arrive instantly; the update download shows real progress.",
      "The app opens much faster.",
      "The company website was rebuilt.",
    ],
  },
  {
    n: 12,
    date: "2026-10-11",
    android: "2.11",
    title: "Training, update pop-up, new name",
    items: [
      "🎓 Training: a short course with exercises for the whole team.",
      "The app is called Underground Associates; it offers updates when it opens.",
      "Categories sorted A to Z; Settings sections fold.",
      "Finds pages elsewhere for \"no website\" leads; everyone gets an alert when a site is edited.",
    ],
  },
  {
    n: 11,
    date: "2026-10-10",
    android: "2.4",
    title: "The native Android app",
    items: [
      "The phone app is a real app now (no web pages inside), with Google sign-in and updates from Settings.",
      "Sign clients up on the phone with a signature pad, take payment by tap or card, view and print PDFs.",
      "Refunds from the app (owner); an Activity tab on Home; callers get every lead alert.",
    ],
  },
  {
    n: 10,
    date: "2026-10-10",
    title: "The client agreement",
    items: [
      "The agreement was rewritten after a contract review; signed and unsigned copies download as PDFs.",
      "📄 Show them the agreement before they sign; Sign this agreement opens their sign-up page.",
      "Late fee, payoff discount, interest and other fees are Settings fields; pay by invoice is available.",
    ],
  },
  {
    n: 9,
    date: "2026-10-10",
    title: "More site features, tasks, brand",
    items: [
      "Page structures vary per site; the lead page has a Design card with styles.",
      "Trade, food, salon, shop, auto, finance and church sites gained features like plans, guarantees, offers, catering and team cards.",
      "📝 Tasks for the team, with calendar invites for the owner.",
      "The UA badge everywhere; a test email button in Settings.",
    ],
  },
  {
    n: 8,
    date: "2026-10-09",
    title: "Churches, tax offices, 625 designs, walk-in guide",
    items: [
      "New kinds of business: churches & nonprofits, tax & finance.",
      "25 color looks × 25 layouts for each kind of business.",
      "🚶 In-person guide for each lead.",
      "A round of 32 fixes across the app.",
    ],
  },
  {
    n: 7,
    date: "2026-10-09",
    title: "Online checkout, contracts and extras",
    items: [
      "Clients pick a plan, way to pay and extras with a live total, sign, and pay in one checkout.",
      "Every extra listed with a price and description; Spanish page, social posts, table tents and window signs.",
      "Preview-opened alerts, follow-up texts, Request a change and review asks for live clients.",
      "6- and 12-month plans with no setup fee.",
    ],
  },
  {
    n: 6,
    date: "2026-10-08",
    title: "Alerts, full-access team, Show plans",
    items: [
      "🔔 Alerts with phone notifications.",
      "Full-access team members; Show plans for customers; Plans & answers for callers.",
      "Add a business by hand; seven page layouts; print/sign and shop sites.",
      "The company website and logo; Google profile tools for clients.",
    ],
  },
  {
    n: 5,
    date: "2026-10-08",
    title: "Sales tools",
    items: [
      "Call guide and preview links for every lead; caller logins, call log and callbacks.",
      "Sign-up links and payments, client visit reports, review cards and flyers.",
      "The Android app; salons, auto repair, landscaping and cleaning.",
    ],
  },
  {
    n: 4,
    date: "2026-10-08",
    title: "The app goes live",
    items: ["Find leads, build their previews and publish sites from the phone."],
  },
];

export const LATEST_CHANGE = CHANGELOG[0]!.n;

export function changelogSeenKey(userId: string): string {
  return `changelog_seen.${userId}`;
}

/** Entries newer than what this person has seen. Someone who has never looked sees just the newest entry once. */
export function unseenChanges(seen: number | null): ChangeEntry[] {
  if (seen == null) return CHANGELOG.slice(0, 1);
  return CHANGELOG.filter((e) => e.n > seen);
}

/** Entries that shipped in Android builds newer than `versionName` (for the phone's Update available pop-up). */
export function changesSince(versionName: string): ChangeEntry[] {
  const v = (s: string) => s.split(".").map(Number);
  const newer = (a: string, b: string) => {
    const x = v(a), y = v(b);
    for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
    return false;
  };
  const out: ChangeEntry[] = [];
  for (const e of CHANGELOG) {
    if (e.android && !newer(e.android, versionName)) break;
    out.push(e);
  }
  return out;
}
