# 2025–2026 trends: food, salons, retail, print & sign shops

Researched 10 October 2026 for the Cullman, AL market. A refresh layer on top of the four blueprints
(`research/restaurants-cafes.md`, `salons-barbershops.md`, `retail-shops.md`, `print-signs-apparel.md`): what the
best independent sites built in 2024–2026 do on the first screen, how they order the page, which features owners and
customers now expect, and where our packs (`src/generator/packs/{restaurant,salon,retail,print}.ts`) fall short.
Research only; no code was changed. Learn structure and features; never copy design, code or text.

**Method and honesty notes.**
- Candidates came from 2025–2026 roundups (Framer, Start Designs, Owner.com, Zarla, Colorlib, GlossGenius, Nanoglobals,
  HubSpot, Printavo, MassageBook), the Awwwards restaurant category, and agency case studies. I then opened the
  home pages of ~45 sites with a text reader to confirm the first screen and section order; where a site could not
  be read (bot wall, JavaScript-only, DNS failure) I say so and lean on the roundup's description only.
- Zarla's roundups mix real businesses with their own templates; templates are excluded here.
- Reddit threads were not retrievable through the search tool used (every `reddit` query returned vendor blogs).
  Owner/customer opinion therefore comes from a blog summary of a Reddit thread, a reader survey, a florist forum and
  a print-shop forum, each cited. Treat those as anecdotes, not a sample.
- Most statistics come from software vendors (Popmenu, Zenoti, Boulevard, GlossGenius, Square). Sample sizes and
  dates are given where the source gives them; where a number is vendor-reported and unverifiable it is marked.
- Our sites are static (Cloudflare Pages). Every feature below works with links out, `tel:`/`sms:`/`mailto:` and a
  text-only form post to our Worker. Nothing on a site may state a fact the owner or Google data did not supply.

---

## 0. What changed since the blueprints (cross-category)

1. **"Hours, address, phone above the fold" is now the differentiator, not the baseline.** BrightLocal's 2023 Local
   Business Discovery & Trust survey (1,138 US adults) found opening hours are the most-searched detail for retail (53%)
   and food & drink (51%), 62% would avoid a business whose online information is wrong, and 26% have turned up too
   early or too late at least monthly because of wrong hours
   (https://www.brightlocal.com/research/local-business-discovery-trust-report/). Of the ~45 home pages read this round,
   fewer than a third put today's hours in the first screen. Keep ours there (we already do via `hero.showStatus` and
   `infoStrip`), and add a **holiday-hours line** (GasLamp Antiques lists every closure day: https://www.gaslampantiques.com/).
2. **Friction kills bookings and orders more than design does.** Zenoti's Nov 2025 survey of 1,000+ US salon/spa
   clients: 71% have decided not to book because it was too hard to reach someone or book online; 48% would be "much more
   likely" to return to a salon that lets them book or change at any hour
   (https://www.zenoti.com/en-uk/thecheckin/salon-booking-survey-data). Popmenu (Apr 2024, 1,000 consumers): 67% prefer
   ordering from the restaurant's own site over a third party, mainly to avoid fees
   (https://www.fsrmagazine.com/industry-news/popmenu-releases-restaurant-dining-trends-to-watch-in-2025/). Our job on
   the first screen is one obvious action with the owner's real link behind it.
3. **Proof moved into the hero.** The strongest 2025–26 sites put a number next to the headline: "4.9 on Google ·
   390 reviews" (https://www.denversportsmassage.com/), "4.90 from 215 verified reviews" plus six press logos
   (https://www.snapdragonedinburgh.com/), "5/5 · 4,100+ Etsy reviews · 31,000+ orders" (https://www.chattanoogatshirt.com/),
   "Voted Best Salon in Nashville" badge (https://www.truebluesalon.com/). We already show the Google rating in the hero
   when ≥4.3 with ≥10 reviews; the gap is **owner-supplied proof** (local "Best of" awards, years, counts).
4. **One hero, one promise, one button.** Across categories the pattern that reads best on a 390-px phone is: eyebrow
   (what + town), 3–7-word promise, one full-width primary button, a text line for the second action, then today's
   hours. Hero carousels, autoplay video with sound and heavy parallax are called out as "fading" in 2026 trend guides
   (https://tinyfrog.com/web-design-trends, https://line25.com/articles/web-design-trends-2026/).
5. **Social is the live feed; the site is the front door.** Antique malls, boutiques and barbers post "new arrivals
   daily" on Instagram and the site links out (https://www.gaslampantiques.com/, https://cakeplussize.com/). Nanoglobals'
   2026 barbershop review found sites that *redirect booking to Facebook* "scored lowest on conversion"
   (https://nanoglobals.com/barbershop-websites/). Link to social for freshness; never make it the home page.

**How this maps onto the second-round Design DNA (`src/generator/dna.ts`).** Several first-screen findings below are
already expressible as knob values, so the work is choosing per-category defaults, not new components:
- `headline`: the good sites use *name* for sit-down restaurants, salons and shops, *service + town* for print/sign
  shops and florists, *promise* for trucks and bakeries. `PREFS` already lists the allowed values per category; the
  evidence in 1B/2B/3B/4B says which should come first.
- `proof: band` matches the "rating + award under the hero" pattern (Denver Sports Massage, Snapdragon, Chattanooga
  T-Shirt). Today the band holds the Google rating and `trust` items only; the owner proof fields proposed in the
  Top 10 feed it.
- `nav: utility` (thin line with address and today's hours) is the "hours-first" restaurant shape (BoccaLupo, Loveless,
  Kaffeine). `hero: billboard` suits malls and trucks whose name is the sign (GasLamp, Lobos). `services: table` is the
  barber/massage price list (Heritage, Holden Beach); the gap there is durations, not layout. `hero: statement` +
  `tone: light` is the photo-less opening (Strange Bird, Bluebird) and should be what a lead gets when no owner photo
  exists, instead of a Google photo that disappears at publish.

---

## 1. Restaurants, cafés, bakeries, coffee shops, food trucks

### 1A. Standout independent sites (2024–2026)

Verified = I read the live home page on 10 Oct 2026. Others are as described by the cited roundup.

| # | Site | Type / size | What grabs attention in the first screen | Source |
|---|---|---|---|---|
| 1 | BoccaLupo, Atlanta — https://boccalupoatl.com/ (verified) | One-room Italian trattoria | Hours ("Open 5:30pm · Final seating 9:15pm, Wed–Sat") and "Walk-ins welcome (reservations encouraged)" sit directly under the logo, with a Resy button, `tel:` phone and Maps link before any photo. Weakness: menu is a PDF. | https://www.startdesigns.com/blog/best-restaurant-websites/ |
| 2 | The Loveless Cafe, Nashville — https://www.lovelesscafe.com/ (verified) | Roadside café since 1951 | Week's hours in the header *and* under the logo; "Since 1951" as the subhead; three buttons for three visitor types: View Menus / Order To-Go / Reservations; seasonal pre-order bar on top ("Thanksgiving Meal Packs… Order Here"). | https://www.zarla.com/inspiration/restaurant |
| 3 | Doo-Dah Diner, Wichita — https://www.doodahdiner.com/ (verified) | Single-location diner | Opens straight on "Featured" photo tiles of eight dishes linked to menu items, then "Join our Yelp Waitlist", then a stack of dated award blocks ("Best Diner in Kansas, Dec 2025"). Food first, proof second. | https://www.owner.com/blog/best-restaurant-websites |
| 4 | Campo Juice + Kitchen, Denver — https://www.campojuiceandkitchen.com/ (verified) | One juice bar, opened 2021 | "Locally sourced / crafted with love", two buttons (Order Online → Uber Eats, View Menu), three-item nav; ratings shown as plain text "4.9 on Google · 5 stars on Uber Eats" (no widget). | https://www.zarla.com/inspiration/restaurant |
| 5 | Where Ya At Matt, Seattle — https://www.whereyaatmatt.com/ (verified) | One food truck | Chef portrait + "Bringing New Orleans soul food to Seattle" + "one of Seattle's original food trucks"; full HTML menu with prices on the home page; schedule page is a dated event-card list with time window, venue, Maps link and Google Calendar/ICS links (https://www.whereyaatmatt.com/truckschedule). | https://colorlib.com/wp/best-food-truck-website-examples/ |
| 6 | Nacheaux, Portland — https://www.nacheauxpdx.com/ (verified) | One food cart | Three circular service cards right under the hero: Book Our Carts / Find Us / Cater With Us. "Find Us" is a link to a Google Calendar the owner already keeps (no embed, no server). | https://www.zarla.com/inspiration/restaurant |
| 7 | Cheddar Box, Waco — https://www.cheddarboxwaco.com/ (verified) | Grilled-cheese truck at a fixed site | "So Cheesy You'll Think We're Kidding" + "Waco's Original Grilled Cheese Food Truck"; Order Online → `*.square.site`; press feature; hours + address at the bottom. | https://colorlib.com/wp/best-food-truck-website-examples/ |
| 8 | Bluebird Bakery, York UK — https://www.bluebirdbakery.co.uk/ (verified) | Small-batch bakery | "Good Baked Goods" over dark sourdough photo; a one-sentence origin ("started on a kitchen table") and a four-ingredient promise; 16-question FAQ (hours, dogs, gluten-free, Sunday bread); per-location hours blocks. | https://www.zarla.com/guides/bakery-website-examples |
| 9 | Tori's Bakeshop, Toronto (now a page on https://www.villagejuicery.com/) | Neighbourhood bakery | "Baked Fresh With Love Since 2012" beside one doughnut; dietary badges (plant-based, gluten-free, local) as icons in the hero. Domain now redirects: a reminder to keep domain renewal in our plan. | https://www.zarla.com/guides/bakery-website-examples |
| 10 | Folk, Nashville — folkpizza.com (DNS failed on read) | Artisan pizzeria | Home-page image tiles jump straight into menu sections; large bold headings. | https://www.startdesigns.com/blog/best-restaurant-websites/ |
| 11 | Strange Taco Bar, multi-site — https://www.strangetacobar.com/ (403 on read) | Casual taco bar | Fixed bottom navigation bar on mobile; all original photos, no stock. | https://www.startdesigns.com/blog/best-restaurant-websites/ |
| 12 | Kaffeine, London — kaffeine.co.uk | Two-shop coffee bar | Looping video of the neon sign as hero, with opening hours and both addresses "near the top". | https://www.zarla.com/inspiration/cafe |
| 13 | Lemon Jelly Café, Dublin — lemonjelly.ie | One café | Four-button row under the hero: Menus / Order online / Gift vouchers / Visit. | https://www.zarla.com/inspiration/cafe |
| 14 | The Grilled Cheese Truck, LA — https://www.thegrilledcheesetruck.com/ (verified; calendar template empty at read) | Food truck | "This week's truck locations" as a dated weekly calendar block on the home page with a "see the complete schedule" button. | https://www.zarla.com/inspiration/food-truck |
| 15 | Burrito Madre, Serbia — https://burritomadre.rs/en/ (verified) | Small burrito chain; Awwwards Honorable Mention Jul 2026 | Eight photo category cards (Burrito, Tacos, Nachos…) directly under a single-dish hero; "Order" opens a pop-up with the two delivery partners; loyalty app promoted lower down. | https://www.awwwards.com/websites/hotel-restaurant/ |

Also noted but not read: Talat Market (Atlanta) was praised for "location and hours on the homepage + a Resy link
instead of Order Online" (https://www.owner.com/blog/best-restaurant-websites); on 10 Oct 2026 the site was a
"coming soon" shell (https://www.talatmarketatl.com/), which is its own lesson: a live preview beats a half-built site.

### 1B. Above-the-fold patterns, ranked by frequency among the good sites

1. **Hero structure: one real food/room photo + name + one-line description + 2 buttons** (BoccaLupo, Campo, Cheddar
   Box, Bluebird, Loveless, Burrito Madre). Full-bleed carousels appear only on weaker sites. Doo-Dah and Folk use a
   **tile grid of dishes as the hero** (menu-first). Where Ya At Matt uses a **chef portrait** (story-first).
2. **Headline strategy:** (a) *name as H1 + "what + town" line* is most common for sit-down places (BoccaLupo, Campo,
   Lobos: "Kick Ass Comfort Food on Wheels"); (b) *promise/claim* for trucks and bakeries ("Waco's Original Grilled
   Cheese Food Truck", "Good Baked Goods", "Baked Fresh With Love Since 2012"); (c) *question* only in one bakery
   ("Summer Is Coming. Do You Have Enough Pastry?", https://www.zarla.com/guides/bakery-website-examples). Service+town
   as H1 (our contractor pattern) is rare for restaurants; keep `titleMode: "name"`.
3. **Primary action:** Order online when a link exists (Campo → Uber Eats, Cheddar Box → Square, Loveless → Upserve);
   Reservations for sit-down (BoccaLupo → Resy); **View menu is always the secondary**. Loveless shows three buttons
   because it genuinely serves three audiences; most should show two.
4. **Proof in the first screen:** "Since YEAR" (Loveless, Tori's), rating as text (Campo), award badge (Doo-Dah, below
   fold), press logo row (Beaucoup Bakery). Google review *text* never appears on the best sites (and Places terms
   forbid it for us).
5. **Hours in the first screen:** BoccaLupo, Loveless, Kaffeine, Cake (retail) do it; Campo, Cheddar Box, Bluebird
   push hours to the footer. Reader complaints single this out as the top frustration (Heavy Table reader survey:
   https://heavytable.com/restaurant-websites-things-love-things-dont/; Reddit-thread summary listing menu, address,
   hours, contact, promotions as what people want first: https://www.cloudwaitress.com/?p=622).
6. **Imagery type:** close-up of the signature item (burrito, sourdough, doughnut) beats room shots for counter
   service; room/porch shots for sit-down. Trucks show the truck or the chef.
7. **When photos are missing:** Bluebird and Strange Bird (salon) prove a **typographic hero on a flat colour** works;
   Zarla's barbershop guide says the same ("use a bold typographic hero if you lack good photography",
   https://www.zarla.com/guides/barbershop-website-examples). Our `hero: statement`/`billboard` with `tone: light`
   already renders this; `pickDna` should prefer it when `media.hero` is absent, so the preview and the published
   site open the same way.

### 1C. Home-page order and the shapes seen

Most common order among the good sites (composite): header with hours → hero (name, promise, Order/Reserve + Menu)
→ **menu favourites as photo tiles** → story (one paragraph, founding year) → proof (ratings/awards/press) → catering
or events teaser → visit (hours table, address, map link) → footer. This matches our pack order
(`menuHighlights → about → reviews → visit → faq → ctaBand`) except that the best sites put **photos on the menu
tiles** and **proof closer to the top**.

Four shapes:
- **Menu-first** (Doo-Dah, Folk, Burrito Madre, Where Ya At Matt): dish tiles are the hero; story below. Best for
  diners, Mexican, pizza, BBQ with good food photos.
- **Hours-first / "are you open?"** (BoccaLupo, Loveless, Kaffeine): hours and address in the header; small hero.
  Best for sit-down places that fill by reservation and for coffee shops.
- **Story-first** (Bluebird, Where Ya At Matt's chef portrait, Beaucoup): origin sentence + promise, then product.
  Best for bakeries and coffee roasters.
- **Where-are-we-today** (Nacheaux, Grilled Cheese Truck, Kogi per Colorlib): schedule block in slot 2 and a Book
  Us / Cater button. Mandatory for food trucks.

### 1D. Features owners need and customers expect

| Feature | Why it sells | Owner must supply | Default / generate? | Priority |
|---|---|---|---|---|
| HTML menu with prices | 84% of diners look up a menu before visiting (TouchBistro 2022 via https://www.restaurantdive.com/press-release/20220914-touchbistro-2022-diner-trends-report-finds-dine-in-making-a-comeback/); PDFs are the #1 complaint (https://www.lifelinedesign.ca/blogs/dear-restaurants-stop-using-pdf-menus) | Photo of printed menu (we type it) | Already built (`/menu/`) | Must |
| Menu item photos on the favourites tiles | Popmenu May 2026 (1,000 consumers): 82% more likely to choose a restaurant whose online menu has photos and reviews (https://restauranttechnologynews.com/2026/05/popmenu-unveils-video-first-menu-experience-designed-to-drive-more-restaurant-traffic-and-orders/); Owner.com cites 61% calling item photos a most-important feature (vendor) | 3–6 dish photos (owner phone is fine) | Generate tile layout; photos owner-only (Google photos not allowed live) | Must |
| Order online button, provider-labelled | 67% prefer direct ordering to avoid fees (Popmenu Apr 2024); 75% of operators plan to push orders to their own site (Popmenu Jan 2025, 359 operators) | Toast/Square/Clover/DoorDash link | Built (`links.order`, `detectProvider`) | Must |
| "Order direct and save" line next to the button | Monster Vegan / Que Vida Tacos state that direct is cheaper (https://www.owner.com/blog/best-restaurant-websites) | Owner confirms it is true for them | Toggle, default off | Should |
| Delivery partner row (DoorDash / Uber Eats / Grubhub) | Burrito Madre's Order pop-up lists partners; Campo links Uber Eats | URLs | Small secondary row under hero | Should |
| Reservation button (Resy/OpenTable/Yelp) | BoccaLupo puts it first; sit-down only | URL | Built as action `reserve` but **not used in the hero** today | Should |
| Today's hours + "final seating" / "kitchen closes" note | BoccaLupo's "Final seating 9:15pm" answers the real question | One line | Field `hours.note` | Should |
| Holiday hours / closures list | GasLamp lists every closure; BrightLocal: 26% hit wrong hours monthly | List of dates | Owner text, auto-hide after date | Should |
| Daily specials / plate of the day | Reddit summary lists "promotions and deals" among the five things people want | Weekly list or a link to the FB post | Owner text with day labels; otherwise "Follow us for today's special" link | Should |
| Catering teaser + inquiry form | Blueprint: catering on 37/63 home pages; Nacheaux and Loveless give it a card | Yes/no + what they cater | `ext.restaurant.catering` exists but no section renders | Should |
| Food-truck schedule | Where Ya At Matt (event cards), Grilled Cheese Truck (weekly calendar), Nacheaux (Google Calendar link) | Google Calendar link, or weekly list | Link-out button "This week's stops" + optional typed weekly list | Must (truck) |
| Book the truck / private events form | Nacheaux "Book Our Carts"; Watson's, KOi Fusion embed catering forms (https://colorlib.com/wp/best-food-truck-website-examples/) | Yes/no | Text form (date, headcount, location) | Must (truck) |
| Bakery pre-orders / custom cake requests | Loveless seasonal pre-order bar; Zarla: "Book a Tasting", "Order a Dozen" CTAs; form guides stress a pickup-date picker (https://paperform.co/templates/bakery-custom-cake-order-form/) | Lead time ("48 h notice"), what they take orders for | Text form: item, servings, pickup date, notes; owner sets cutoff text | Should (bakery) |
| Dietary / allergen tags on menu items | Framer and Orders.co both list filters/tags as 2026 baseline (https://www.framer.com/blog/restaurant-website-design-examples/, https://orders.co/blog/restaurant-website-needs-2026/) | Tag per item | Tag chips (GF, V, spicy) in `MenuItem` | Nice |
| Gift cards link | Lemon Jelly's four-button row; Toast/Square gift pages | URL | `links.giftCards` exists in the record; no action renders it | Should |
| Loyalty / rewards link | Doo-Dah "Rewards", Burrito Madre app; Square 2025: 78% of consumers would use a loyalty program (https://squareup.com/us/en/the-bottom-line/series/foc/future-of-commerce) | URL | Button only | Nice |
| Waitlist link (Yelp Waitlist) | Doo-Dah's "Join Waitlist" | URL | Action | Nice |
| Press / awards strip | Doo-Dah dated award blocks; Beaucoup press logos; Cullman has its own "Best of the Best" (https://cullmantimes.com/2024/08/04/best-of-the-best-2024-winners) | Award name + year (+ link) | Owner-typed chips | Should |
| Events / live music | Loveless events filter; 18/63 in the blueprint | Dated list | Auto-expire | Nice |
| Wholesale / "we supply cafés" | Bluebird, Leaven & Co (bakeries) | One paragraph + email | Toggle section (bakery, coffee roaster) | Nice |
| Parking / "where to park" line | Strange Bird (salon) devotes an FAQ to it; small-town squares need it | One line | Field in `visit` | Nice |

### 1E. Marketing hooks and trust elements that work

- **Hooks:** seasonal pre-order bars (Loveless Thanksgiving packs); "Burger of the Month" (Kuma's, Owner.com list);
  weekly plate list by day (SMS vendors' example, https://www.boostly.com/blog/best-sms-promotion-ideas-for-restaurants);
  "order direct, skip the fees"; first-screen coupon code in the header (Talkin' Tacos, Owner.com list) — only when the
  owner gives the code and an end date (Verde Salon shows the right form: code + "ends November 15th", https://www.verdesalon.ca/).
- **Local pride:** "Waco's Original…", "Seattle's original food trucks", named local sourcing ("all ingredients from
  Colorado", Campo). For Cullman: "Cullman County since YEAR", named farm suppliers, Oktoberfest/festival presence —
  all owner-confirmed only.
- **Trust:** founding year (Loveless 1951, Tori's 2012, Bluebird's kitchen-table origin), dated awards, press logos,
  rating-as-number with the platform named, honest operating notes ("walk-ins welcome, reservations encouraged",
  "cash preferred"). BrightLocal 2025: 83% read reviews on Google and 89% expect owners to answer reviews
  (https://www.brightlocal.com/research/local-consumer-review-survey-2025/), so the review *link* plus the owner's
  reply habit matters more than quoting reviews.

### 1F. Visual trends 2025–26 for food, and what to avoid

- **Type:** one display face + one body face, fluid headline sizes (`clamp()` from ~48 px on phones to ~96 px desktop)
  (https://line25.com/articles/web-design-trends-2026/); hand-lettered or script wordmarks for bakeries/trucks
  (Self Raised, Bon Me); body 17–18 px is increasingly common (https://bellaworksweb.com/website-design-trends-2026/).
- **Colour:** two directions in 2026 — "dopamine" saturated brights for trucks/tacos/juice, and "nature distilled" earthy
  neutrals for bakeries/coffee (Wix 2026 trend report as summarised at
  https://www.studiountitled.com/news/web-design-in-2026-isnt-about-trends-its-about-feel and
  https://wix.com/blog/web-design-trends). Dark "moody" palettes remain for steak/fine dining.
- **Image treatment:** single hero dish shot, tile grids of dishes, gingham/texture frames (Loveless), press-logo rows in
  grey. Video heroes appear (Kaffeine neon loop) but silent and short.
- **Motion:** micro-interactions under ~300 ms, scroll reveals; avoid heavy parallax and autoplay with sound
  (https://tinyfrog.com/web-design-trends).
- **Layout rhythm:** 3-button hero rows, 4-up tile grids, bento-style mixed tiles (Maloney's barbers, Burrito Madre).
- **Avoid:** PDF menus; hero carousels; pop-ups on load; Instagram feed as the main section (Barrel Maker, Cake and
  GasLamp all show feed *strips* below the fold, never as the hero); "coming soon" shells; copyright 2020 footers
  (Industry Print Shop still shows © 2020); icon-only social links; stock food photos (Nanoglobals: "stock imagery
  scored lowest").

### 1G. Gaps versus `packs/restaurant.ts`, by expected sales impact

1. **No dish photos on the menu tiles.** `menuHighlights` renders name/price/description only. Add an optional image
   per `MenuItem` (owner upload, same path as gallery) and render 3–6 photo tiles; the Edit screen should let the owner
   attach a photo to a highlighted item. This is the single biggest "wow" on the preview.
2. **Catering section never renders.** `ext.restaurant.catering` exists; the home page ignores it. Add a "Catering &
   events" band with a text form (date, headcount, where) and `hasForm` true when on.
3. **Food-truck schedule is only a to-do + FAQ line.** Add `ext.restaurant.truck`: `calendarUrl` (Google Calendar / FB
   events link) and/or a typed weekly list `[{day, time, place, mapsQuery}]`; render a "This week" block in slot 2 and a
   "Book the truck" form. Promote the FB stops link to a hero button when no calendar exists.
4. **Reserve is never a hero action.** `primaryAction` is order-or-call. When `links.reserve` exists and
   `serviceOptions.reservable`, make Reserve primary for dine-in places, Order secondary.
5. **Specials / "today" line.** A `specials: [{day, text}]` owner field rendered under the info strip ("Tuesday: catfish
   plate"), or, when absent, a "Today's special is on Facebook" link when a FB page exists.
6. **Gift cards and loyalty buttons.** `links.giftCards` is in the record but has no `ActionId`; add `giftcard` and
   `rewards` actions and show them in the closing band/footer.
7. **Hours note + holiday closures.** `hours.note` ("kitchen closes 8:30") and `closures: [{date, label}]` rendered in
   `visit` and the info strip.
8. **Bakery / coffee pre-order form.** For variants `bakery`/`coffee`/`cafe` with `preorders: true`, a text form (what,
   how many, pickup date) plus owner-typed lead-time line; CTA "Order ahead".
9. **Owner proof chips.** `awards: [{name, year, url}]` and `pressLogos` (text only) rendered as a strip under the hero.
10. **Delivery partner row** from `links.delivery: {doordash?, ubereats?, grubhub?}` under the hero buttons.
11. **Dietary tags** on `MenuItem` (`tags: ["gf","v","spicy"]`) and a legend on `/menu/`.
12. **Photo-less opening by default when no owner photo** (`pickDna` preferring `statement`/`billboard` + `tone:
    light` when `media.hero` is absent); today a Google photo fills the preview and then vanishes at publish, which
    makes the live site look worse than the preview.
13. **Per-category `headline` default.** The restaurant evidence favours `name` (BoccaLupo, Campo, Loveless) with
    `promise` for trucks and bakeries; `service` ("Restaurant in Cullman") was not seen on any strong site.

---

## 2. Hair salons, barbershops, nail salons, pet groomers, massage

### 2A. Standout independent sites (2024–2026)

| # | Site | Type / size | First-screen hook | Source |
|---|---|---|---|---|
| 1 | Heritage Barbershop, Portland — https://www.heritagebarbershop.com/ (verified) | One shop, ~12 barbers | H1 "Southeast Portland's classic barbershop experience", Book Now, then hours ("Open daily 9–7"), phone and street address in the first screen; full price list ($25–$80) on the home page; each barber card shows **available days, accepted payments and own booking button**; "kids, seniors, military $5 off". | https://nanoglobals.com/barbershop-websites/ |
| 2 | Strange Bird, Austin — https://strangebirdsalon.com/ (verified) | One salon | "Austin's first haircutting-only, chemical-free salon" as the subhead; one Book Now (Mangomint); hourly "what-you-see-is-what-you-pay, gratuity included" pricing; FAQ with exact parking instructions; "1,000+ five-star reviews" lower down. | https://www.zarla.com/inspiration/salon |
| 3 | True Blue Salon, Nashville — https://www.truebluesalon.com/ (verified) | One salon since 1991 | Hero is a "Voted Best Salon in Nashville" badge + "$25 Intro Offer" button; three specialty tiles (Balayage, Short Hair, Extensions); "Hundreds of 5-star Google reviews" band; Phorest booking. | https://www.zarla.com/inspiration/salon |
| 4 | Verde Salon, Winnipeg — https://www.verdesalon.ca/ (verified) | Two-location salon | Hero is a dated promo ("Advanced hair treatments for $20… code TREAT20, ends Nov 15 2026") with Book Now; later "1,400+ five-star Google reviews", a guarantee block, new-guest gift. | https://glossgenius.com/blog/hair-salon-websites |
| 5 | East Nashville Beard & Barber — https://www.eastnashvillebeardandbarber.com/ (verified) | One shop | Big name + Book Now; a long **named testimonial** that describes the room and names a barber; four service tiles → full list with price + duration per service (per Nanoglobals). | https://nanoglobals.com/barbershop-websites/ |
| 6 | The Clip Joint, Columbia MO — https://www.theclipjointsalon.com/ (verified) | Full-service salon, 50 years | "Modern. Timeless. Eclectic." + "a staple in the community for over 50 years"; three service families (hair / nail / spa) each with "view all services"; named testimonials that name stylists; Aveda + Bumble shop links. | https://colorlib.com/wp/hair-salon-websites-design/ |
| 7 | The Scotch Pine, Seattle — https://www.thescotchpine.com/ (verified) | Small barbershop | "So Fresh… So Clean!", Book Now → Square; a price-change notice and a cancellation-policy block on the home page; "Appointments only — please book online, call 11–6 Mon–Fri if stuck". Shows policies belong on the page. | https://nanoglobals.com/barbershop-websites/ |
| 8 | Inman Park Massage, Atlanta — https://www.massagebook.com/therapists/inman-park-massage (verified) | Solo LMT | First screen: name, address, "119 reviews", **"Next available opening: Wed, Oct 21st 10:00AM"**, Book now, Gift Certificates; therapist credentials (24 years, Esalen) in the intro. | https://pro.massagebook.com/blog/massage-therapist-websites |
| 9 | Holden Beach Massage, NC — https://www.holdenbeachmassage.net/ (verified) | Two-therapist practice | "Relax, Rejuvenate, Restore · Therapeutic massage on the island"; therapist cards show **NC license numbers**; a 3-row rates table (30/60/90 min = $50/$80/$110); one Google review + Yelp/Google badges. | https://pro.massagebook.com/blog/massage-therapist-websites |
| 10 | Denver Sports Massage — https://www.denversportsmassage.com/ (verified) | Small clinic | Condition-led H1 ("Flexibility, injury prevention…"), Make an Appointment + tappable phone; "4.9 from 390 Google reviews" with owner replies; three-step "assessment → plan → education". | https://www.zarla.com/inspiration/massage |
| 11 | Hydrodog (mobile grooming, franchise) — https://hydrodog.com/ (verified) | Mobile groomer | "Your dog feels right at home. Because they are." + Check Availability; three illustrated objections (dog / mess / your time); 4-step "how booking works"; **prep-work list**; vaccination rule in FAQ; "no hidden fees, extras need your OK". | https://www.zarla.com/guides/pet-grooming-website-examples |
| 12 | Studio Hound, Auckland — https://studiohound.co.nz/ (verified) | One grooming salon | "Dog and Cat Grooming · Epsom Auckland" with the street address as the subhead; loyalty card graphic in the hero; a **carparks section with directions**; T&Cs linked before booking. Weakness: price list is an image. | https://www.zarla.com/guides/pet-grooming-website-examples |
| 13 | UL Nails & Spa, Wichita — ulnailsspa.com (JS-only on read) | One nail salon | Praised for "transparent pricing display and a testimonials section" on a Canva-built site. | https://colorlib.com/wp/nail-salon-website-examples/ |
| 14 | DBCN / Designs by Celestial Nails — https://dbcnails.com/ (verified) | Solo nail artist | "Meet your new favorite nail artist", Book Nail Appointment, and the line **"Please check services & pricing prior to booking"**; separate Nail Appt FAQ and policies pages; portfolio links. | https://colorlib.com/wp/nail-salon-website-examples/ |
| 15 | Wise Men Barbers, NYC — wisemenbarbersnyc.com (empty on read) | One shop | Booking on the home page with a priced services menu and "all kinds of hair" messaging. | https://glossgenius.com/blog/hair-salon-websites |

Nanoglobals' 20-site review adds three findings worth keeping: ~80% of the good barbershop sites run on Squarespace,
Boulevard/Squire/Square Appointments are the common booking tools, and "many sites lacked individual barber profiles"
(https://nanoglobals.com/barbershop-websites/).

### 2B. Above-the-fold patterns, ranked

1. **Name or positioning line + one Book button** (every verified site). Barbers add the phone in the header (Resident
   Barber, Heritage). Second action is Call, or "walk-ins welcome" as a badge (Imperium, https://www.zarla.com/guides/barbershop-website-examples).
2. **Headline strategy:** *claim a specific "first/only"* (Strange Bird), *shop type + neighbourhood* (Heritage, Studio
   Hound), *award badge as the hero* (True Blue), *dated offer as the hero* (Verde). Plain name-only heroes
   (East Nashville) rely on the testimonial below to do the work. Question headlines: none seen.
3. **Proof shown:** review count and rating as text (Strange Bird 1,000+, Verde 1,400+, Denver 4.9/390, Inman Park
   119), "Voted best" badges, years ("over 50 years", "since 1991"), licence numbers (massage).
4. **Prices visible early:** barbers yes (Heritage full list on home), salons partly (Albrecht's shows a staff-level
   price matrix, https://albrechts.webflow.io/; True Blue shows only the $25 intro), nails "check pricing before booking"
   link (DBCN), massage a 3-row duration × price table (Holden Beach), groomers usually "from" by size or none. Our
   `services: table` (dot-leader price list) and the "Price list" recipe already fit barbers; salons should default to
   `tiles`/`cards` with "from $" and a link to the booking tool's menu.
5. **Imagery:** real shop interior or a client mid-cut; two client portraits on a flat colour (Two Birds); typographic
   hero on terracotta (Strange Bird). Stock photos are the tell of a weak site.
6. **Walk-in / appointment rule** appears in the first screen on the better barber sites (Imperium "walk-ins welcome";
   Scotch Pine "appointments only"); we already badge this via `WALK_IN_TEXT`.
7. **Photos missing:** solo operators (DBCN, Inman Park) open with a portrait of the person; that beats a stock chair.

### 2C. Section order and shapes

Composite order on the good sites: header (Book + phone) → hero → **services with prices (barbers) or specialty tiles
(salons)** → team cards → gallery/Instagram strip → reviews (count + 3 quotes) → policies / new-client info → about →
visit (hours, address, parking) → closing Book. Our pack puts services first and has no team block.

Shapes:
- **Price-list-first** (barbers, massage): services with price (+ duration) in slot 2, team in slot 3.
- **Offer-first** (True Blue, Verde): intro offer or promo in the hero, specialties next, reviews, then booking.
- **Person-first** (solo nail/massage/mobile groomer): portrait + credentials, services, "how it works", reviews.
- **Policy-forward** (Scotch Pine, DBCN, Studio Hound): cancellation, deposits, T&Cs near the top because no-shows
  cost them most (Zenoti 2025 benchmark: 8% cancellation, 3% no-show rate in salons).

### 2D. Features

| Feature | Why it sells | Owner supplies | Default / generate? | Priority |
|---|---|---|---|---|
| Book button to their tool (Booksy/Vagaro/Square/GlossGenius/Mangomint/Phorest) | 71% abandoned a booking due to friction; top salons have 61% higher online-booking rates (Zenoti 2025); online-booked first-timers return ~78% vs ~39% walk-ins (Boulevard via https://joinblvd.com/blog/salon-trends-industry-statistics) | URL | Built | Must |
| Services with price **and duration** | East Nashville, Heritage, Holden Beach show both; Zarla barbershop guide: "list service durations next to prices" | Minutes per service | `Service.price` exists; add `durationMin` | Must |
| Team / stylist / barber cards with own booking link, available days, payment methods | "People book people" (blueprint); Heritage's cards; Nanoglobals flags missing profiles as the common weakness | Name, photo, role, days, booking URL | New `ext.salon.team[]` | Must |
| Walk-in / appointment rule | First question new clients ask | Pick one | Built | Must |
| Policies block (cancellation window, deposit, late, kids, cash) | Scotch Pine, DBCN, Studio Hound put it on the page; reduces no-shows | Their wording | Owner text; template prompts for each line | Should |
| New-client / intro offer with end date | True Blue "$25 intro", Verde "$55+ new-guest gift", Studio Hound "$100 off" | Offer text + expiry | `offers[]` exists in the record; render a hero badge/band | Should |
| Specialty tiles (balayage, extensions, fades, kids, beards) | True Blue's three tiles; Oxana's named "Headspa" signature | Which 3 | Pick from `services` marked `featured` | Should |
| Gift cards / certificates link | Inman Park puts it beside Book; Heritage sells eGift on page | URL (booking tool's gift page) | `links.giftCards` exists; add action | Should |
| Payment methods line ("cash preferred, ATM on site, Venmo") | Heritage, Pink Dog ("cash or credit only") | List | Chips in `visit` | Should |
| Kids / senior / military pricing line | Heritage "$5 off"; 19/79 mention kids in the blueprint | Text | Chip under services | Nice |
| Products / brands carried + shop link | Clip Joint (Aveda), Verde (Aveda B-Corp), East Nashville (Suavecito) | Brand names, link | Owner-typed chips, optional URL | Nice |
| "Not sure what to book?" guide or stylist-match prompt | Style House uses a quiz as primary CTA (Zarla salon); consultation prompts on 13/79 (blueprint) | 3–5 Q&As | Owner text; FAQ variant | Nice |
| Instagram portfolio link under gallery | Portfolio lives on IG; the site shows 6–12 owner photos | Handle | Built (gallery to-do) | Should |
| **Nails:** deposit/no-show policy, "check prices before booking", design gallery | DBCN; nail work is design-led | Deposit amount, photos | Policy text + gallery | Must (nails) |
| **Pet:** vaccination requirement, pricing "from $ by size/coat", matting/de-shed surcharge note, drop-off/pick-up window, puppy first groom, prep list | Hydrodog FAQ + prep list; sample grooming T&Cs require rabies/DHPP proof and list matting fees (https://form.jotform.com/220074440541242) | Their rules and starting prices | Structured fields; required to-do for vaccination line | Must (pet) |
| **Pet:** parking / loading directions | Studio Hound's carpark section | Text | Field in `visit` | Nice |
| **Massage:** duration × price table, licence numbers in footer, gift certificates, "who it's for", intake/first-visit note | Holden Beach, Inman Park, Denver Sports | Rates, AL licence no. | Rates table component; licence already required | Must (massage) |
| **Massage:** "next available opening" | Inman Park shows it; needs the booking tool | n/a | Cannot be static; link "See openings" to the tool | Skip |
| Memberships / packages link | Zenoti: salons with memberships grew revenue 4× (8% vs 2%) (https://www.zenoti.com/en-uk/thecheckin/salon-trends-2026); Master Class Barber tiers | URL to tool | Button only | Nice |
| Careers / booth rent | 25/79 in blueprint; True Blue has a careers band | Text | `hiring` exists | Nice |
| Loyalty / referral card | Studio Hound loyalty card; referral rewards | Rules | Owner text | Nice |

### 2E. Hooks and trust

- **Hooks that appear on the best sites:** dated promo with a code and end date (Verde), new-guest intro price (True
  Blue), kids/senior/military discount line (Heritage), add-on upsell with a flat price ("add a treatment for $20"),
  seasonal (back-to-school cuts, prom/wedding hair, holiday gift cards), "first groom" puppy package. All need the
  owner's numbers; the site never invents a price.
- **Retention beats acquisition in 2025–26:** new-guest visits fell 5–7% for salons in 2025 while existing-guest
  frequency rose (Zenoti 2026 benchmark via https://www.zenoti.com/en-uk/thecheckin/salon-trends-2026). Pitch the site as
  the thing that makes rebooking and gift cards one tap, not only as a lead source.
- **Trust elements:** review count + platform; "voted best" badge with year; years/"three generations"; licence
  numbers (massage, required in AL ads); named product lines; "licensed cosmetologist/master barber" when true; a
  named testimonial that mentions the stylist (East Nashville, Clip Joint); a plain guarantee line (Verde). "As seen
  in" press rows appear on city salons (Element's Elle ranking) and are optional here.

### 2F. Visual trends and what to avoid

- **Type:** high-contrast serif + sans pairs for salons (Strange Bird, Oxana), condensed grotesks and crests for barbers
  (Master Barbers LA oversized crest wordmark); monograms in a circle (Blonde Faith "BF").
- **Colour:** sage/terracotta/cream for salons and massage ("nature distilled"); black + gold or black + deep red for
  barbers (Zarla barbershop guide); bright teal or hot pink for playful nail/pet brands (Squeeze, Pink Dog).
- **Imagery:** two client portraits on flat colour; hands-at-work photos (massage); after-photos for groomers (Zarla:
  "real after-photos persuade better than elaborate design"); illustration instead of photos for groomers (Fluff & Buff,
  Hydrodog's three illustrated benefits).
- **Motion:** floating/sticky Book tab (Molly Rose, Society "booking button on every page"); hover lifts on team cards.
- **Avoid:** booking that redirects to Facebook (lowest conversion in Nanoglobals' review); price lists as images
  (Studio Hound); internally contradictory policy text (Scotch Pine's "6 hours… 3 hours"); conflicting phone numbers
  (Albrecht's shows three); "Make an Appointment" buttons that link to `#`; stock chairs; medical claims on massage
  pages (our brief already bans them).

### 2G. Gaps versus `packs/salon.ts`, by sales impact

1. **No team section.** Add `ext.salon.team: [{name, role, photo?, days?, bookingUrl?, instagram?, specialties?}]`,
   render cards after services with a per-person Book button (falls back to the shop link); Edit card "Your team".
   This is the feature the blueprint called "people book people" and the one most absent from competitor sites.
2. **Durations.** Add `durationMin` to `Service`; render "45 min · $35" (barber/massage/nails) and a 30/60/90 rates
   table for `massage`.
3. **Policies block.** `ext.salon.policies: {cancellation?, deposit?, late?, kids?, payments?}` rendered under
   services with the owner's words; the Edit screen prompts each line. Required to-do for `nails` (deposit) and `pet`
   (vaccination) before publish.
4. **Intro offer in the hero.** `offers[]` exists but the salon home never renders it; show one offer as a hero badge
   or band with its end date, auto-hidden after.
5. **Pet-grooming fields.** `ext.salon.pet: {vaccines, pricingNote ("from $45 small dogs"), mattingNote, dropOff,
   prepList[], puppyPackage?}`; a "Before your visit" list like Hydrodog's.
6. **Gift cards action** from `links.giftCards`; show next to Book for salons/massage.
7. **Specialty tiles**: when ≥3 services are `featured`, render them as 3 photo/text tiles above the full list for
   `salon`/`nails`.
8. **Payment methods chips** and a **parking line** in `visit`.
9. **Products carried** chips + optional shop link.
10. **Memberships/packages link** and **careers** reuse existing `hiring`.

---

## 3. Retail: boutiques, gift, antique, thrift, florists, farm & feed, furniture

### 3A. Standout independent sites (2024–2026)

Public roundups for gift shops, small antique malls, feed stores and family furniture stores are thin (searches
returned template marketplaces); the verified independents below carry more weight than usual, and the blueprint's own
78-site sample remains the base for those variants.

| # | Site | Type / size | First-screen hook | Source |
|---|---|---|---|---|
| 1 | Cake Plus-Size Resale, Minneapolis — https://cakeplussize.com/ (verified) | One resale boutique | Name, then **address, phone, email, Instagram handle and day-by-day hours directly under the H1**, a Monday "Happy Hour 20% off" note, then a shop photo; "More ways to shop" tiles (online shop, IG stories, FB live sales, mystery bags, gift cards); dated press list 2017–2024. | https://www.zarla.com/guides/boutique-website-examples |
| 2 | Snapdragon, Edinburgh — https://www.snapdragonedinburgh.com/ (verified) | One florist + botanical store | H1 "Edinburgh Florist & Botanical Store" + Order Flowers; three ordering shortcuts (delivery / wedding / funeral); six press logos; "4.90 from 215 verified reviews"; shop hours seven days; "no floral foam" commitments. | https://www.zarla.com/guides/florist-website-examples |
| 3 | Oak & Olive Flowers, Decorah IA — https://www.oakandoliveflowers.com/ (verified) | Tiny flower farm + studio | "flowers grown here" + one sentence of provenance; nav splits Online Flower Shop / Subscriptions / Gift Cards / Weddings; grower photographed in her field. Weakness: no hours, no delivery info on the home page. | https://www.zarla.com/guides/florist-website-examples |
| 4 | Props Floral Design, Nova Scotia — propsfloraldesign.com (403 on read) | Small florist | Vivid seasonal blooms with an **upfront note that delivered arrangements vary with what's fresh**. | https://www.zarla.com/guides/florist-website-examples |
| 5 | Sozo Trading Co., Birmingham AL — https://www.sozotrading.org/ (verified) | 18,000 sq ft nonprofit thrift | "AN UPSCALE THRIFT STORE" + street address under it; **"Schedule a pick-up" in the header** (links to pickupmydonation.com); Our Mission / Shop / Donate buttons; What To Donate and How To Donate pages; store hours and vendor-booth application in the footer. | Blueprint sample, re-read |
| 6 | GasLamp Antiques, Nashville — https://www.gaslampantiques.com/ (verified) | Two antique malls | Stats line as the subhead: "Two stores, 50,000 sq ft, nearly 300 dealers"; "Open daily" sign linking to a Best-of vote; Instagram "New arrivals daily" strip; **full holiday closure list**; "buy by phone, pick up later" note; dealer spotlight. | Blueprint sample, re-read |
| 7 | Russell Feed & Supply, Fort Worth — https://www.russellfeed.com/ (verified) | Regional family feed chain, 29 years | Promo bar "Free delivery on pet & poultry $49+"; nav by animal (Pet, Poultry, Horse, Livestock…); **"Shop by animal" icon row**, hay prices, **chick delivery schedule per store**, "Top brands" logo row (Purina, Nutrena…), events calendar, loyalty program. Bigger than our clients, but the departments/brands/chick-days pattern is the small-town feed store's content. | Search |
| 8 | Hazel & Olive, Rockwall TX — https://www.hazelandolive.com/ (verified) | Online-first boutique | "Dress with confidence"; **occasion tiles** (Homecoming, Gameday, Wedding Guest, Prom…) as the first section; founder story with a family photo; app + VIP email in the footer. Store hours absent (online-first), so copy the occasion tiles, not the catalog. | https://www.zarla.com/guides/boutique-website-examples |
| 9 | Wild Poppies, Auckland — wildpoppies.co.nz | Florist | Weekly "Best buys + free cupcakes" offer and a four-item delivery promise row (same day / overnight / made to order / pay later). | https://www.zarla.com/guides/florist-website-examples |
| 10 | Starbright, NYC — starbrightnyc.com | Florist | Phone number at the top "for same-day callers", award badge, owner story in a split hero. | https://blog.hubspot.com/website/florist-websites |
| 11 | Market Road Antiques, St Jacobs ON — https://www.stjacobsmarket.com/general-6-1 | 130-booth antique market | Vendor page states booth sizes and the per-square-foot rate and takes applications online; shopper page states daily hours. | Search |
| 12 | Conscious Clothing, Michigan — consciousclothing.net | Made-to-order boutique | Top strip states the ~2-week production time; one outlined button. Pattern: put the one operational fact shoppers need in a thin strip above the header. | https://www.zarla.com/guides/boutique-website-examples |

### 3B. Above-the-fold patterns, ranked

1. **Name + "what + where" line + the operational facts** (address, today's hours) — Cake, Studio Hound, Sozo, GasLamp
   put the address in or right under the hero. This is the retail first screen that converts a drive.
2. **Headline strategy:** *type + town* for search ("Edinburgh Florist & Botanical Store", "An upscale thrift store"),
   *stats line* for malls ("300 dealers"), *promise* for farms ("flowers grown here"), *mood line* for boutiques
   ("Dress with confidence"). Name-only heroes rely on the next block.
3. **Primary action:** Directions/visit for shops; **Order flowers** for florists (Snapdragon, Vasette's floating Order
   Now); **Schedule a pick-up** / Donate in the header for thrift; Shop online only when they have one.
4. **Proof:** verified review count (Snapdragon), press logos, "voted best" sign (GasLamp), dated press list (Cake),
   years ("29 years", "est. 2015").
5. **Imagery:** shop floor or storefront (Cake, GasLamp), product close-up (florists), grower/owner portrait (Oak &
   Olive). Product carousels mark catalog sites, not storefront sites.
6. **Operational strip:** free-delivery threshold (Russell), production time (Conscious), happy-hour discount day
   (Cake), same-day cutoff (Zarla florist examples "Order by 2 PM").
7. **Photos missing:** a flat-colour hero with the stats line (GasLamp's text-heavy opener works) or an illustrated
   mark; never a stock interior.

### 3C. Section order and shapes

Composite: header (call, directions, Shop/Order if any) → hero with address/hours → **what we carry / shop by
department** (Russell's animal row, Hazel's occasion tiles, GasLamp's category lists) → the variant's job (donate /
vendors / delivery promises / occasions) → new arrivals via social → store photos → reviews/press → about →
visit (hours incl. holidays, parking) → footer. Our pack matches this except that the variant module is missing for
every variant but thrift.

Shapes:
- **Visit-first brochure** (Cake, GasLamp, Sozo): facts in the hero, departments next, social for freshness.
- **Occasion-first** (florists, boutiques): three to eight tiles by occasion (delivery / wedding / funeral; homecoming /
  gameday), each a link to order or inquire.
- **Department-first** (feed, hardware, furniture): shop-by-animal/room icons, brands row, seasonal block (chick days,
  deer season), delivery line.
- **Mission-first** (nonprofit thrift): why shop/donate, then donate/pickup, then shop.

### 3D. Features

| Feature | Why it sells | Owner supplies | Default / generate? | Priority |
|---|---|---|---|---|
| Address + today's hours in the first screen, holiday closures | BrightLocal: hours are the top-searched fact for retail (53%); 26% arrive at the wrong time monthly | Confirm hours; closure dates | Built (hero status + strip); add closures | Must |
| Tap-to-call and Directions buttons | 19/78 blueprint sites show a dead number | — | Built | Must |
| What we carry as 6 category cards | 45/52 text pages name categories | Tick/edit | Built | Must |
| **Occasion tiles (florist, boutique)** | Snapdragon's delivery/wedding/funeral; Hazel's homecoming/gameday/prom | Which occasions, link per tile (order page, inquiry form, or Call) | New module from a per-variant seed list | Must (florist), Should (boutique) |
| **Delivery line: area, cutoff, fee** (florist, feed, furniture) | Zarla florist tips: "show cutoff times, delivery areas and fees"; Russell's $49 threshold; Paulsen's "free delivery across Shelby County" | Their rule | `ext.retail.deliveryNote` owner text | Must (florist) |
| "Designer's choice / arrangements vary with what's fresh" note | Props frames variation as freshness; reduces complaints | Yes/no | Toggle sentence | Should (florist) |
| Sympathy / wedding inquiry form | 7/9 florist pages sell both (blueprint) | Yes/no | Text form (date, venue, budget range) | Should (florist) |
| **Vendors / booth rental section** (antique, thrift, boutique with vendors) | Market Road states sizes and rate; Sozo and GasLamp carry applications; University Pickers "Booth Biz" (blueprint) | Booth sizes, rate or "call", how to apply | `ext.retail.vendors {note, sizes?, applyUrl?}` + "Rent a booth" form | Should |
| Dealer / booth count + square footage stats line | GasLamp's hero subhead | Numbers | Trust chips | Should (antique) |
| Donations module (what we take / can't, drop-off hours, pickup) | Sozo header button; blueprint | Lists | Built | Must (thrift) |
| Mission / proceeds line for nonprofit thrift | Sozo "supports 140 children in Kampala and local ministries" | Their sentence | `ext.retail.mission` text under the hero | Should (thrift) |
| Sales-day / tag-colour / happy-hour note | Cake's Monday 20% | Text | Owner text chip | Nice |
| **Departments by animal/room + brands row** (feed, hardware, furniture) | Russell's animal icons and brand logos; blueprint: brands on 4/6 feed pages | Tick departments; type brand names | Seed lists per variant; brand chips as text (no logos we don't own) | Must (feed) |
| Seasonal block (chick days, deer season, Christmas trees, prom) | Russell's chick delivery schedule; Loveless' seasonal bar | Dates + line | Dated banner, auto-expire | Should (feed, gift) |
| Financing link + delivery note (furniture) | 3/6 furniture pages lead with both (blueprint) | Provider URL, delivery line | Button + text; no terms in copy | Should (furniture) |
| "Call to hold it / buy by phone, pick up later" | GasLamp's note; antique/thrift stock is one-of-a-kind | Yes/no | Sentence + Call button in the What's-new band | Should (antique/thrift) |
| New arrivals via social + drop-day / live-sale schedule | 24/78 blueprint; SocialKit: a named fixed-day drop series is the strongest recurring format (https://socialrails.com/blog/boutique-marketing-strategies) | Day/time + platform | Built band; add owner `dropDay` text | Should (boutique) |
| Text club / VIP list link | Hazel's VIP email + app; Rain POS: top spenders get early access (https://www.rainpos.com/blog/retail-marketing-strategies) | Signup URL | Button; no pop-up | Nice |
| Gift cards | Cake, Oak & Olive, Lemon Jelly | URL or "in store" | `links.giftCards` → action | Should |
| Events (sip & shop, trunk show, sidewalk sale, workshops) | Snapdragon wreath workshops; Russell events calendar; EcommerceFastlane 2026 event ideas | Dated list | Auto-expire module | Nice |
| Gift wrap / registry / local makers chips | Gift shops; "local or Alabama-made" on 4/52 | Tick | Service chips | Nice (gift) |
| Parking / landmark line | GasLamp "two stores within walking distance"; Studio Hound carparks | Text | Field | Nice |
| Press list by year | Cake | Links | Owner list | Nice |

### 3E. Hooks and trust

- **Hooks:** fixed-day new-arrival drops; happy-hour discount day; free-delivery threshold; same-day cutoff ("order by
  1 PM"); seasonal events (chick days, Christmas open house, prom); workshops; "mystery bags"; loyalty punch card
  (Russell's Frequent Buyer program; Square 2025: 78% would use a loyalty program).
- **Local pride:** "serving North Texans for 29 years", "flowers grown here", nonprofit proceeds staying local, local
  makers shelf. For Cullman: county/town names, Alabama-made, farm names — owner-confirmed only.
- **Trust:** verified review count + platform, press logos/list, "voted best" with the voting source, years, founder/
  family photo, honest variation note (Props), clear holiday closures (GasLamp), vendor-count stats.

### 3F. Visual trends and what to avoid

- **Type:** serif display + sans body for florists and gift ("Bloom"-style), condensed sans for feed/hardware, script
  accents for boutiques; headline as a stats line for malls.
- **Colour:** earthy neutrals (sage, clay, cream) dominate florist/gift 2026; boutiques split between pastel and
  black-on-white with one accent; feed stores stay utilitarian (green/brown/orange).
- **Image treatment:** storefront or shop-floor hero; product close-ups in a 4-up tile; occasion tiles with a photo
  and one word; owner/grower portraits.
- **Motion:** floating Order button (Vasette), hover lift on tiles, nothing more.
- **Avoid:** catalog home pages with no hours (blueprint anti-pattern 1); newsletter pop-ups on load (HubSpot's
  Esscents of Flowers shows a 10% pop-up — don't); Instagram feeds as the only content; price lists as images;
  "Powered by" badges; conflicting hours between sections (GasLamp's captions vs its hours block).

### 3G. Gaps versus `packs/retail.ts`, by sales impact

1. **Florist module is missing.** Only `shopUrl` → "Order flowers" exists. Add `ext.retail.florist: {deliveryNote,
   cutoff, areas[], designersChoice, occasions[]}`; render three occasion tiles (Delivery / Sympathy / Weddings & events)
   right after the hero, a delivery line in the info strip, and sympathy/wedding inquiry forms (`hasForm` true).
2. **Variant modules for antique, feed, furniture, boutique** (the blueprint listed them; the pack renders only
   thrift donations): `vendors` section with a "Rent a booth" form (antique/thrift), `departments` + `brands` chips +
   seasonal dated banner (feed/hardware), `financing` URL + `deliveryNote` (furniture), `dropDay` + occasion tiles
   (boutique).
3. **Address in the hero for retail.** `hero` shows city/state in the eyebrow; add the street line (when
   `showStreetAddress`) under the buttons like Cake and Sozo. Also holiday `closures`.
4. **Mission line for nonprofit thrift** (`ext.retail.mission`) under the hero and in the FAQ.
5. **"Call to hold / buy by phone"** sentence in the What's-new band for antique/thrift/furniture when the owner ticks
   it.
6. **Gift cards action**, **events module** (dated, auto-expire), **text-club link** button.
7. **Stats chips** (`dealerCount`, `sqft`, `founded`) for malls and feed stores in `trust()`.
8. **Gift/boutique service chips** (gift wrap, monogramming, layaway, alterations, local makers) — owner-ticked.

---

## 4. Print shops, sign shops, screen printers, embroiderers

### 4A. Standout independent sites (2024–2026)

| # | Site | Type / size | First-screen hook | Source |
|---|---|---|---|---|
| 1 | Chattanooga T-Shirt Co. — https://www.chattanoogatshirt.com/ (verified) | One shop, 15 years | H1 "Custom T-Shirt Printing in Chattanooga, TN"; subhead promises digital proof before printing and no minimum for DTG; **three CTAs: Free Quick Quote / Detailed Project Quote / Upload Art**; proof stack "5/5 · 4,100+ Etsy reviews · 31,000+ orders · 4.6 on Google (55)"; two shirt mockups "Your design here". Below: a **two-step 60-second quick quote** (name/email/phone → quantity, needed-by date, print locations, artwork status, notes) and an FAQ that states real prices, minimums and 10–15 business-day turnaround. | Blueprint sample, re-read |
| 2 | Barrel Maker Printing, Chicago — https://www.barrelmakerprinting.com/ (verified) | Mid-size screen printer | "Retail Quality Manufacturing" + GET A QUOTE; "Eco friendly / Retail ready" taglines; 1% for the Planet badge; service blocks each with Learn more + Get a Quote; long contact form with budget dropdown, add-on checkboxes and 6-file upload. | https://www.printavo.com/blog/best-screen-printing-websites/ |
| 3 | Trust Print Shop, Fort Worth — https://www.trustprintshop.com/ (verified) | Small screen printer | "Your custom t-shirts deserve to be worn." + Get a Quote / Tell me more; **three-item nav**; five client case studies; gallery entries list ink spec ("Bleach, 3 colors"); three named reviews; address + phone. | https://www.printavo.com/blog/best-screen-printing-websites/ |
| 4 | Ginny's Custom Embroidery, Monroe GA — https://www.ginnyscustomembroidery.com/ (verified) | Small-town embroidery + boutique | Phone, email and socials in the top bar; "Building your BRAND one impression at a time"; **"Best of GA 2024 & 2025" badges + two chamber logos**; quote form with **quantity tiers 12–47 / 48–71 / 72+** and a 25 MB upload; boutique address + hours; three testimonials + Google link; portrait of Ginny. | Blueprint sample, re-read |
| 5 | Printed Threads, Fort Worth — https://www.printedthreads.com/ (verified) | Screen print + embroidery | "Empower your brand" + Get a Quote in the header; a 2026 blog (puff embroidery, merch ROI); Instagram-fed "Our Work" with a Full Gallery link; job postings in the feed. Shows a shop that keeps content fresh. | https://www.printavo.com/blog/best-screen-printing-websites/ |
| 6 | Industry Print Shop, Austin — http://www.industryprintshop.com/ (verified) | Poster + apparel printer | "FRESH PRINTS DAILY." + GET A QUOTE / Get to know us; nav includes **FAQ's and Art Requirements**; client logo strip; footer still © 2020 (stale). | https://www.printavo.com/blog/best-screen-printing-websites/ |
| 7 | Paulsen Printing, Memphis — https://www.paulsenprinting.com/ (verified) | Commercial printer since 1978 | H1 "Commercial Printing Services in Memphis, TN"; Request a Quote / View Services + **Upload Files** in the header; phone in header and hero; "New ownership" note; six product tiles; "digital printing often within 2–3 business days"; **free local delivery across Shelby County**. | Blueprint sample, re-read |
| 8 | Ditto Graphics, Memphis — https://www.dittographics.com/ (verified) | Small forms/print shop | Since 1989; Request a quote + catalog; local and toll-free numbers and a named contact (Tommy Spencer); plain product lists by family (forms / signs / office / advertising). Small-shop honesty, dated look. | Blueprint sample |
| 9 | Oak & Twine, McDonald TN — https://www.oakandtwine.com/ (verified) | Embroidery + screen print | Name + town, Browse Products / Request a Quote; "Locally owned, fast turnaround, dedicated service, bulk decoration" tiles; Instagram embed; "Come visit our shop" + address. Weakness: empty testimonial heading, broken reCAPTCHA on the form. | Blueprint sample |
| 10 | 1-800-T-SHIRTS / Envision Tees, Dubuque — http://1800tshirts.com/ (verified) | Promo + apparel | Phone numbers in the top bar; brand logo row (Gildan, Carhartt, Nike…); bulk-discount and fast-shipping feature trio; staff headshots in "customer satisfaction". | https://www.printavo.com/blog/best-screen-printing-websites/ |
| 11 | Northwest Sign & Design, Seattle (agency case study; live URL not given) | Sign fabricator, 20+ years | Full-width masthead video, portfolio grid with hover titles as "the primary selling point", contact page with custom form + stylised map. | https://www.seattlewebdesign.com/portfolio/project/northwest-signs |
| 12 | Unnamed local sign company (Marketing 360 case study) | Wraps + business signs | Redesign reorganised navigation by gallery category and replaced phone snapshots with professional photos; "the gallery is arguably the most important content on a sign company website". | https://blog.marketing360.com/?p=15764 |

No 2025–26 roundup of independent **sign-shop** sites exists in the sources searched; the two case studies and the
blueprint's 18 sign shops stand in. The consistent lesson is photo-first.

### 4B. Above-the-fold patterns, ranked

1. **Service + town H1 + Get a Quote** (Chattanooga, Paulsen, Oak & Twine's name + town). Our `titleMode: "service"`
   is right for this category.
2. **Second CTA is Call, third is artwork** (Upload / Email / Text a photo). Chattanooga splits Quick vs Detailed quote
   — the quick path is the conversion.
3. **Proof stack in the hero:** review count across platforms (Chattanooga), local award badges + chamber logos
   (Ginny's), years (Paulsen 1978, Ditto 1989), client logos (Industry), 1% for the Planet (Barrel Maker).
4. **Phone in the top bar** (Ginny's, Paulsen, 1-800-T-SHIRTS, Ditto): print buyers call.
5. **Headline strategy:** service + town (most), promise ("Your custom t-shirts deserve to be worn", "Fresh prints
   daily", "Retail quality manufacturing"), brand line ("Building your BRAND…"). Questions: none.
6. **Imagery:** shirt mockups with "your design here" (Chattanooga), finished trucks/storefronts (sign shops), shop
   video (Industry per Printavo, Northwest Sign), a portrait of the owner (Ginny's).
7. **Operational honesty up top:** "proof before we print", "no minimum for DTG", "free local delivery", "2–3 business
   days digital" — only where the owner states it.

### 4C. Section order and shapes

Composite: header (phone, Get a Quote) → hero (service + town, proof, 2–3 CTAs) → quick quote or services → gallery /
case studies → who we serve / client logos → how it works (3 steps, proof promise) → FAQ with the hard numbers
(prices, minimums, turnaround — owner-stated) → reviews → about/owner → visit (pickup, hours, delivery area) → full
quote form. Our pack order is close; the gaps are the quick-quote form fields and the owner-stated FAQ numbers.

Shapes:
- **Quote-first** (Chattanooga): the two-step form is the second section; everything else supports it.
- **Portfolio-first** (sign shops, Trust's case studies): gallery grid by category above services.
- **Catalog + quote** (1-800-T-SHIRTS, Oak & Twine, Paulsen): product tiles with a quote button on each.
- **Brand/story-first** (Ginny's, Industry): owner, awards, chamber ties, then services; suits a small-town shop whose
  buyers are neighbours.

### 4D. Features

| Feature | Why it sells | Owner supplies | Default / generate? | Priority |
|---|---|---|---|---|
| Quick quote with **needed-by date, quantity, print locations, artwork status** | Chattanooga's 60-second form; a Shirt Board owner says a mandatory intake questionnaire filters poor-fit leads (https://theshirtboard.com/index.php/topic,23539.0.html); blueprint: deadline wording on 11/62 quote pages | Nothing | Our form has only service + quantity; add fields | Must |
| Quantity tiers instead of a free number | Ginny's 12–47 / 48–71 / 72+ maps to price breaks | Their breaks, or defaults | Select with owner-editable tiers | Should |
| Artwork path without uploads: Email with reference code, Text a photo, **owner's file-request link** (Dropbox/Google Drive "file request" URL) | 19/73 blueprint sites accept uploads; a file-request link gives us uploads with zero server work | Create the request link once | `ext.print.uploadUrl` → "Upload your artwork" button | Must |
| Proof-before-print promise block | Chattanooga's reviews praise the proof; 16/60 state it | Tick | `proofBeforePrint` exists; render it as a named block + step | Should |
| Owner-stated FAQ numbers: starting price, minimum, typical turnaround, rush | Chattanooga states "about $25 for 1–2 shirts", "24+ for screen printing", "10–15 business days"; agency guidance: "clear minimums and turnaround" (https://alwaysdobetterllc.com/screen-printing-website-design/) | Their numbers | Structured fields → FAQ answers; AI never writes them | Should |
| Gallery by category with spec captions | Trust's "Bleach, 3 colors"; sign case studies | Photos + caption | Gallery exists; add category + caption | Must (signs), Should (others) |
| Client logos / named clients with permission | Industry, Trust case studies, 27/60 | Names | Text chips (no logos we don't own) | Should |
| Awards + chamber membership badges | Ginny's "Best of GA 2024/2025" + two chambers | Names/years | Owner-typed chips | Should |
| Services at the counter (print shops): copies, lamination, business cards while-you-wait | Walk-in trade | Tick | Chip list | Should (print_shop) |
| Pickup / delivery / install area line | Paulsen free delivery Shelby County; 12/22 sign shops mention install | Text | `visit` line | Should |
| Online / team store link (spirit-wear stores) | InkSoft: back-to-school is the peak window (https://inksoft.com/?p=17646); Custom Ink: 87% of school organisers have used spirit wear to raise money (https://www.customink.com/blog/fundraisers-fall-school-fundraising/); Printavo: keep stores under ~9 items (vendor) | Store URL | Action `store` | Should (screen_printing) |
| Seasonal banner (spirit-wear season, Christmas orders cutoff, election signs) | InkSoft July–Aug window | Dates + line | Dated banner | Nice |
| "We keep your art/screens on file — reorder in one text" | Repeat business is the margin | Tick | Sentence | Nice |
| Design help / Art requirements page | Industry's "Art Requirements" nav; 22/60 offer design help | Tick + file-type list | `designHelp` exists; add a short requirements list | Nice |
| Promo products card (one card, not a catalog) | 27/60 | Tick | Card | Nice |
| Pay-an-invoice link | Shops on Printavo/Square | URL | Footer link | Nice |
| Sign-specific: size W×H, indoor/outdoor, install needed, photo of the spot | Blueprint CTA matrix | — | Form extras per variant | Must (signs) |
| Embroidery-specific: placement, your garments or ours, digitising note | Ginny's form lacks these; blueprint recommends | Their digitising policy | Form extras + owner note | Should (embroidery) |

### 4E. Hooks and trust

- **Hooks:** quick vs detailed quote split; "no minimum" lines where true; seasonal windows (spirit wear July–Aug,
  fundraisers, reunions, election yard signs, Christmas cards); online stores for schools/churches that "keep 100% of
  the markup"; free local delivery radius; reorder-in-one-text.
- **Local pride:** chamber logos, "Best of" county awards, named local teams/churches (with permission), "printed in
  our shop in Hanceville".
- **Trust:** review counts across platforms, years, proof promise, owner portrait, in-house equipment ("printed
  in-house"), sustainability badges only when real (1% for the Planet, water-based inks), named account rep.

### 4F. Visual trends and what to avoid

- **Type:** heavy grotesk headlines in caps ("FRESH PRINTS DAILY."), ink/registration motifs, monospace accents;
  sign shops lean industrial sans.
- **Colour:** black + one ink colour (Trust's high contrast), or craft-paper neutrals for print shops; sign shops use
  safety yellow/blue.
- **Image treatment:** shirt mockups with "your design here", flat-lay stacks, finished-vehicle photos shot straight on,
  shop video loops (silent).
- **Motion:** hover lift and title reveal on portfolio tiles (Northwest Sign); nothing else.
- **Avoid:** © 2020 footers (Industry), broken reCAPTCHA and empty "testimonials" headings (Oak & Twine), reCAPTCHA
  at all (36/73 in the blueprint; use Turnstile/honeypot), online design tools (Printavo advises against them for small
  shops: https://www.printavo.com/blog/how-to-make-a-website-for-screen-printing/), "fast turnaround" with no number
  unless the owner gives one, catalogs with "Sold out" tiles (1-800-T-SHIRTS).

### 4G. Gaps versus `packs/print.ts`, by sales impact

1. **Quote form fields.** Today: services select + "How many?" (or size for signs) + details. Add `needed_by` (date),
   print locations / placement checkboxes per variant, artwork status radio (print-ready / needs clean-up / need
   design / not sure), quantity tiers, rush checkbox, and a browser-generated reference code carried into the
   `mailto:` subject and `sms:` body (the blueprint specified this; it was never built).
2. **"Upload your artwork" via the owner's file-request link** (`ext.print.uploadUrl`): Dropbox/Google Drive file
   requests accept uploads with no server. Show it as the third artwork button when present.
3. **Owner-stated numbers block** (`ext.print.pricing: {startingAt?, minimum?, turnaround?, rush?}`) rendered as FAQ
   answers and a small "Good to know" strip; the AI brief already forbids inventing them.
4. **Gallery categories + captions** (`Image.caption`, `Image.tag`) and a category filter row for sign shops.
5. **Proof-before-print block** and **Art requirements** list when `proofBeforePrint` / `designHelp` are set.
6. **Awards / chamber chips** and **named clients** (text).
7. **Online store action** (`links.store`) for spirit-wear shops; **seasonal dated banner**.
8. **Counter services chips** for `print_shop` (copies, lamination, notary?) — owner-ticked.
9. **Delivery / install area line** in `visit`.

---

## 5. Visual trends 2025–2026 that apply to all four (keep this list next to `themes.ts`)

- **Fluid type scale:** headline `clamp(2rem, 5vw + 1rem, 6rem)` (~48 → 96 px), body 17–18 px, one display + one text
  face, variable fonts where available (https://line25.com/articles/web-design-trends-2026/,
  https://bellaworksweb.com/website-design-trends-2026/). Our looks already enforce one heading font per look; check
  body sizes against 17 px on phones.
- **Colour:** tokens with contrast baked in (4.5:1 text, 3:1 large); two 2026 moods — saturated "dopamine" accents on
  neutral grounds, or muted earthy "nature distilled" palettes with an off-white like Pantone's Cloud Dancer
  (https://www.studiountitled.com/news/web-design-in-2026-isnt-about-trends-its-about-feel). Limit text colours to 2–3.
- **Layout:** bento tiles for mixed content (menu favourites, services, team) with the most important tile largest and
  a sane phone stack; three-button hero rows; stats lines as subheads. Our `rhythm` (bands / continuous / chapters /
  boxed) and `services: scroller` (snap row on phones) already cover the common 2026 rhythms; what is missing is a
  mixed-size tile option for menu favourites and team cards.
- **Imagery:** one real hero photo, tile grids, owner portraits; custom illustration where photos are weak; AI
  imagery only for textures/abstracts, never for food, people or products (https://line25.com/articles/web-design-trends-2026/).
- **Motion:** micro-interactions under ~300 ms, scroll reveals on `transform`/`opacity` only, honour
  `prefers-reduced-motion`; no autoplay-with-sound, no heavy parallax, no hero carousels
  (https://tinyfrog.com/web-design-trends).
- **Weight:** aim under ~500 KB first load; WebP/AVIF; lazy-load below the fold (line25's "sustainable design").
- **Accessibility traps seen this round:** price lists as images, text in images (BoccaLupo's headline and address
  are PNGs), icon-only social links, low-contrast neumorphism, hidden navigation, duplicated nav blocks.
- **Conversion killers seen this round:** booking/ordering that redirects to Facebook, forms with broken CAPTCHA,
  "coming soon" sections, stale copyright years, contradictory hours/policies in two places, missing street address.

---

## Top 10 build recommendations across the four categories

Effort: S = under a day, M = 1–3 days, L = a week-plus (generator + edits + app screen + tests).

1. **Owner proof chips everywhere** (`awards[{name, year, url?}]`, `memberships[]`, `clientNames[]`, `stats` such as
   dealer count / orders shipped): fed into `trust()` so the existing `proof: band` / `proof: inline` knob shows them
   under the hero in every pack; Edit card "Awards & proof"; `pickDna` prefers `proof: band` when any owner proof
   exists. Highest sales impact per hour: Ginny's, True Blue, GasLamp and Chattanooga all open with it. **M**
2. **Salon team cards with per-person booking, days and payment methods** (`ext.salon.team[]`), plus `durationMin`
   on services and a 30/60/90 rates table for massage. **L**
3. **Quote form upgrade for print** (needed-by date, placement/locations, artwork status, quantity tiers, rush,
   reference code in `mailto:`/`sms:`) plus `ext.print.uploadUrl` "Upload your artwork" (owner's Dropbox/Drive file
   request). **M**
4. **Menu photo tiles + dietary tags** (`MenuItem.image`, `MenuItem.tags`), owner upload via the gallery path; and
   `pickDna` choosing a photo-less opening (`statement`/`billboard`, `tone: light`) when no owner hero photo exists, so
   the live site never looks worse than the preview. **M**
5. **Florist module** (occasion tiles, delivery line with cutoff/area/fee, designer's-choice note, sympathy/wedding
   forms) — the retail variant with the clearest buying intent and the weakest current coverage. **M**
6. **Food-truck "This week" block + Book the truck form** (`calendarUrl` link-out and/or typed weekly stops; Where Ya
   At Matt's card format: day, time window, place, Maps link). **M**
7. **Policies & intro-offer blocks for salons/nails/pet** (`ext.salon.policies`, `ext.salon.pet` with vaccination,
   pricing-from, matting note, prep list; render one `offers[]` item in the hero with an end date). **M**
8. **Retail variant modules**: vendors/booth rental + form (antique/thrift), departments + brand chips + seasonal
   dated banner (feed/hardware), financing + delivery (furniture), drop-day + occasion tiles (boutique), mission line
   (nonprofit thrift), "call to hold" sentence. **L**
9. **Hours extras on every pack**: `hours.note` ("final seating 9:15"), `closures[{date,label}]` auto-expiring, street
   address line in the retail hero, payment-methods and parking lines in `visit`. **S–M**
10. **Missing actions and sections already in the data model**: `giftcard` (from `links.giftCards`), `rewards`,
    `store`, delivery-partner row, Reserve as hero primary for reservable dine-in, and the restaurant **catering
    section + form** that `ext.restaurant.catering` already flags. **S each; M together**

Two things deliberately *not* recommended: live "next available opening" (needs the booking tool's API; link out
instead) and any embedded Instagram feed or review widget (every feed seen this round was below the fold or broken,
and the Places terms forbid showing Google review text).
