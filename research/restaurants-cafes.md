# Category blueprint: Restaurants and cafes (diners, BBQ, Mexican, pizza, coffee, bakeries)

Researched October 2026 for the Cullman, AL starting market. One category, one shared template, with sub-type
variants (BBQ/Southern, diner/meat-and-three/breakfast, Mexican, pizza, coffee shop, bakery).

**Method, briefly.** Candidates came from searches like "best <type> in <small Southern town>", local coverage
(Cullman Tribune and Cullman Times stories, Only In Your State, Southern Living award announcements, city tourism blogs),
state/city "best BBQ" and "best bakery" roundups, directory listings used only to find names, and organic results for Cullman, Hartselle, Oneonta, Albertville, Decatur, Florence, Fairhope, Huntsville,
Birmingham/Bessemer/Homewood (AL); Friendsville, Iron City, Columbia, Franklin, Gatlinburg, Chattanooga, Knoxville, Nashville (TN);
Juliette, Smyrna, Athens, St. Simons Island, Savannah, Atlanta (GA); Taylor and Oxford (MS); Lexington, Ayden, Chapel Hill (NC);
Floyd (VA); Lockhart, Lexington, McKinney, West (TX); and one small-town Wyoming coffee drive-up. Search snippets rarely give
a business URL, so I also tried likely domains directly and kept only those that loaded the right business.

I downloaded each home page's HTML with a phone user-agent and ran a script over it. The script counted `tel:` links, PDF
links, schema.org types, third-party ordering/reservation/social links, site builder fingerprints, link labels and
keywords in the visible text. I then followed each site's "Menu" link and classified the menu page (HTML text with or
without prices, PDF, image, or embed). I also opened **23 home pages with a page reader** to get the top-to-bottom section
order, what sits above the fold, and weaknesses.

**Base for frequencies: N = 63 sites with usable home-page HTML** (55 independents, 8 chains/regionals).
Three more sites are in the table but could not be read (bot wall, timeout, JavaScript-only), and are excluded from counts.
**All counts below come from home pages only** unless marked "menu page". A feature that a site keeps only on an inner
page is not counted, so true frequencies are somewhat higher. Link-label counts are keyword matches over every link on the
home page (header, body and footer), so treat them as close estimates (roughly plus or minus 3), not exact audits.

Sub-type split of the 66 rows: BBQ 18, Southern/meat-and-three/diner/breakfast/cafe 21, coffee 8, bakery 8, pizza 6, Mexican 5.
Mexican and pizza are thinner than I wanted; most small-town Mexican restaurants we found in North Alabama have **no site of
their own** (only DoorDash, Toast, Facebook or directory listings), which is itself a useful sales signal.

---

## 1. Summary

- **Hours, address and a tappable phone are the job, and most sites fumble them.** A phone number appears in the home-page
  text on 36/63, but only **20/63 make it a `tel:` tap-to-call link**. Hours are readable in the HTML on only 29/63
  (others hide them in images, the footer, or nowhere). Of the 23 pages read in detail, only 3 put hours, address and phone
  near the top, and 7 had no readable hours on the home page (one showed them only as an image). Getting these three things right, above the fold, is the
  cheapest way for our template to beat most competitors.
- **The menu is the most important page, and it should be real text.** 55/63 link to a menu. On the menu pages we could
  classify, about 18 are HTML text with prices, about 12 are HTML text without prices, about 9 are mainly PDFs or photos of a
  printed menu, and the rest are thin or pushed off to an ordering platform. Text menus are readable on a phone, searchable,
  and easy to update; PDFs and images are the most common weakness on independent sites.
- **"Order online" is the main action, and it is always a link out.** 44/63 have an order/pickup link and 29/63 link
  straight to a known ordering service. Toast is the most common (12/63), then DoorDash's order.online/DoorDash (9),
  Square Online (6), Olo (4, mostly chains), ChowNow (2) and Clover (1). Reservations are rare here: Resy on 3/63,
  OpenTable on 0 of the counted sites. Our template should treat ordering as an owner-supplied URL, and reservations as optional.
- **Catering is a near-universal second business.** "Catering" appears on 37/63 home pages and is a nav link on 34/63
  (all 8 chains). BBQ, Mexican and bakeries lean on it hardest. Catering deserves its own section or page with a call/email
  inquiry path, plus an ezCater link where the owner has one (3/63).
- **Story and longevity are the main trust signals.** 49/63 link to an About/Our Story page. Founding year or "since..."
  appears on 14/63, press/award wording on 18/63, and a Press/Media link on 22/63. Reviews are shown on only a few pages
  (7/63 link to reviews or testimonials). Our clients have Google rating and review counts that we can show as a number,
  which most competitors don't.
- **Social links are everywhere, but feeds are a trap.** Facebook links are on 58/63 and Instagram on 47/63. For many small
  places, Facebook is the real "website" for daily specials. Two detailed reads used an Instagram feed as the main home-page
  content; one feed showed "image unavailable" placeholders. Link out to social; don't build the page around a feed.
- **Small-town sites skip the extras.** Gift cards (25/63), merch/sauce shop (around 38/63, inflated by the keyword match),
  careers (25/63), events/live music (18/63), private events (11/63) and FAQ (11/63) are common on bigger operators and
  chains but often missing on true small-town independents. Make them optional modules, switched on only when the owner
  supplies a link or details.
- **Domain rot is real.** Among roughly 175 domains we tried, at least 8 that once belonged to Southern restaurants,
  bakeries or a Cullman-area tourism site were expired (Squarespace or Wix "expired" pages), parked for sale, or hijacked
  by gambling spam. Some of those businesses may have closed or moved, but the lesson holds: our hosting/maintenance
  pitch should stress keeping the domain and site renewed.

---

## 2. Sample

"Visited directly" means I downloaded the live home page myself. "HTML scan" = automated scan of the home page plus its menu
page; "detailed read" = also opened with a page reader for section order and weaknesses. Chains/regionals (8) are for
feature ideas only. Two search hits were dropped after checking: a chophouse listed near Cullman turned out to be a Wisconsin-based chain,
and one "El Barrio" result was an Illinois restaurant's broken archived copy (we used the Birmingham El Barrio instead).

| # | Business | URL | City/State | Type | Subtype | Visited directly |
|---|---|---|---|---|---|---|
| 1 | Johnny's Bar-B-Q | https://johnnysbarbq.com/ | Cullman, AL | independent | BBQ | yes (HTML scan + detailed read) |
| 2 | Brandin' Iron Steak House | https://brandinironsteakhouse.com/ | Cullman area, AL | independent | steak/family | yes (HTML scan + detailed read) |
| 3 | Hank's Sports Bar & Rumors Deli | https://rumorsdeli.com/ | Cullman, AL | independent | deli/bar | yes (HTML scan) |
| 4 | Big Bob Gibson Bar-B-Q | https://bigbobgibson.com/ | Decatur, AL | independent | BBQ | yes (HTML scan + detailed read) |
| 5 | Warehouse Coffee | https://warehousecoffeeonline.square.site/ | Hartselle, AL | independent | coffee | yes (HTML fetched; Square Online storefront, mostly JS) |
| 6 | Legends of Oneonta | https://legendsofoneonta.wixsite.com/website | Oneonta, AL | independent | cafe | yes (HTML scan + detailed read) |
| 7 | Odette | https://www.odettealabama.com/ | Florence, AL | independent | American | yes (HTML scan) |
| 8 | Rosie's Mexican Cantina | https://rosiesmexicancantina.com/ | Huntsville/Florence, AL | independent | Mexican | yes (HTML scan + detailed read) |
| 9 | Buenavista Mexican Cantina | https://buenavistacantina.com/ | Huntsville/Madison, AL | independent | Mexican | yes (HTML scan) |
| 10 | Panini Pete's | https://paninipetes.com/ | Fairhope, AL | independent | cafe | yes (HTML scan) |
| 11 | Warehouse Bakery & Donuts | https://warehousebakeryanddonuts.com/ | Fairhope, AL | independent | bakery | yes (HTML scan + detailed read) |
| 12 | ellenJAY | https://www.ellenjay.com/ | Fairhope, AL | independent | bakery | yes (HTML scan) |
| 13 | Rooster's Crow Coffee | https://roosterscrowcoffee.com/ | Huntsville, AL | independent | coffee | yes (HTML scan) |
| 14 | Cotton Row | https://www.cottonrowrestaurant.com/ | Huntsville, AL | independent | American | yes (HTML scan) |
| 15 | Earth & Stone Wood Fired Pizza | https://earthandstonepizza.com/ | Huntsville, AL | independent | pizza | no (bot wall / timeout; seen via search only) |
| 16 | Big Ed's Pizza | https://www.bigedspizza.com/ | Huntsville, AL | independent | pizza | yes (HTML scan + detailed read) |
| 17 | Saw's BBQ | https://sawsbbq.com/ | Birmingham, AL | independent | BBQ | yes (HTML scan) |
| 18 | Bob Sykes Bar-B-Q | https://bobsykes.com/ | Bessemer, AL | independent | BBQ | yes (HTML scan + detailed read) |
| 19 | Niki's West | https://nikiswest.com/ | Birmingham, AL | independent | meat-and-three | yes (HTML scan + detailed read) |
| 20 | The Bright Star | https://thebrightstar.com/ | Bessemer, AL | independent | Southern/seafood | yes (HTML scan) |
| 21 | Johnny's Restaurant | https://www.johnnyshomewood.com/ | Homewood, AL | independent | meat-and-three | yes (HTML scan) |
| 22 | Post Office Pies | https://www.postofficepies.com/ | Birmingham, AL | independent | pizza | yes (HTML scan) |
| 23 | Pizza Grace | https://www.pizzagrace.com/ | Birmingham, AL | independent | pizza | yes (HTML scan) |
| 24 | El Barrio | https://www.elbarriobirmingham.com/ | Birmingham, AL | independent | Mexican | yes (HTML scan) |
| 25 | Domestique Coffee | https://www.domestiquecoffee.com/ | Birmingham, AL | independent | coffee | yes (HTML scan) |
| 26 | Seeds Coffee | https://seedscoffee.com/ | Birmingham, AL | independent | coffee | yes (HTML scan) |
| 27 | Loveless Cafe | https://lovelesscafe.com/ | Nashville, TN | independent | diner | yes (HTML scan) |
| 28 | Peg Leg Porker | https://peglegporker.com/ | Nashville, TN | independent | BBQ | no (bot wall / timeout; seen via search only) |
| 29 | Arnold's Country Kitchen | https://www.arnoldscountrykitchen.com/ | Nashville, TN | independent | meat-and-three | yes (HTML scan + detailed read) |
| 30 | Monell's | https://monellstn.com/ | Nashville, TN | independent | family-style Southern | yes (HTML scan) |
| 31 | Last Call Baking Co. | https://lastcallbakingco.com/ | Iron City, TN | independent | bakery | partly (page loads, but content is JavaScript-only; nothing readable) |
| 32 | Small Town BBQ | https://smalltownbbq.com/ | Friendsville, TN | independent | BBQ | yes (HTML scan + detailed read) |
| 33 | Merridee's Breadbasket | https://www.merridees.com/ | Franklin, TN | independent | bakery/cafe | yes (HTML scan + detailed read) |
| 34 | Niedlov's Bakery | https://www.niedlovs.com/ | Chattanooga, TN | independent | bakery | yes (HTML scan + detailed read) |
| 35 | Muletown Coffee | https://muletowncoffee.com/ | Columbia, TN | independent | coffee | yes (HTML scan) |
| 36 | The Tomato Head | https://www.thetomatohead.com/ | Knoxville, TN | independent | pizza | yes (HTML scan) |
| 37 | Pancake Pantry | https://pancakepantry.com/ | Gatlinburg, TN | independent | breakfast | yes (HTML scan + detailed read) |
| 38 | City Cafe Diner | https://citycafediner.com/ | Chattanooga, TN | independent | diner | yes (HTML scan + detailed read) |
| 39 | Cancun Mexican Grill & Cantina | https://cancunknox.com/ | Knoxville, TN | independent | Mexican | yes (HTML scan + detailed read) |
| 40 | D'Andrews Bakery & Cafe | https://dandrewsbakery.com/ | Nashville, TN | independent | bakery | yes (HTML scan) |
| 41 | Mary Mac's Tea Room | https://marymacs.com/ | Atlanta, GA | independent | Southern | yes (HTML scan) |
| 42 | Mrs. Wilkes' Dining Room | https://mrswilkes.com/ | Savannah, GA | independent | Southern | yes (HTML scan) |
| 43 | Southern Soul Barbeque | https://www.southernsoulbbq.com/ | St. Simons Island, GA | independent | BBQ | yes (HTML scan + detailed read) |
| 44 | The Whistle Stop Cafe | https://thewhistlestopcafe.com/ | Juliette, GA | independent | Southern cafe | yes (HTML scan + detailed read) |
| 45 | Mama's Boy | https://www.mamasboyathens.com/ | Athens, GA | independent | breakfast | yes (HTML scan) |
| 46 | Rev Coffee Roasters | https://revcoffee.com/ | Smyrna, GA | independent | coffee | yes (HTML scan) |
| 47 | Taylor Grocery | https://taylorgrocery.com/ | Taylor, MS | independent | catfish/Southern | yes (HTML scan + detailed read) |
| 48 | Ajax Diner | https://ajaxdiner.net/ | Oxford, MS | independent | diner | yes (HTML scan) |
| 49 | Lexington Barbecue | https://www.lexbbq.com/ | Lexington, NC | independent | BBQ | yes (HTML scan + detailed read) |
| 50 | Skylight Inn BBQ | https://www.skylightinnbbq.com/ | Ayden, NC | independent | BBQ | yes (HTML scan) |
| 51 | Mama Dip's Kitchen | https://mamadips.com/ | Chapel Hill, NC | independent | Southern | yes (HTML scan) |
| 52 | Red Rooster Coffee | https://www.redroostercoffee.com/ | Floyd, VA | independent | coffee | yes (HTML scan) |
| 53 | Hutchins BBQ | https://hutchinsbbq.com/ | McKinney, TX | independent | BBQ | yes (HTML scan) |
| 54 | Snow's BBQ | https://snowsbbq.com/ | Lexington, TX | independent | BBQ | yes (HTML scan) |
| 55 | Kreuz Market | https://www.kreuzmarket.com/ | Lockhart, TX | independent | BBQ | yes (HTML scan + detailed read) |
| 56 | Black's Barbecue | https://www.blacksbbq.com/ | Lockhart, TX | independent | BBQ | yes (HTML scan) |
| 57 | Czech Stop | https://www.czechstop.net/ | West, TX | independent | bakery | yes (HTML scan + detailed read) |
| 58 | The Kaffee Klatsch | https://thekaffeeklatsch.com/ | Newcastle, WY | independent | coffee | yes (HTML scan) |
| 59 | Moe's Original BBQ (Cullman) | https://www.moesoriginalbbq.com/lo/cullman | Cullman, AL | chain | BBQ | yes (HTML scan + detailed read) |
| 60 | LawLers Barbecue (Cullman) | https://www.lawlersbarbecue.com/cullman-al/ | Cullman, AL | chain | BBQ | yes (HTML scan) |
| 61 | Dreamland BBQ | https://dreamlandbbq.com/ | Tuscaloosa, AL (HQ) | chain | BBQ | yes (HTML scan) |
| 62 | Jim 'N Nick's | https://jimnnicks.com/ | Birmingham, AL (HQ) | chain | BBQ | yes (HTML scan) |
| 63 | Full Moon BBQ | https://fullmoonbbq.com/ | Birmingham, AL (HQ) | chain | BBQ | yes (HTML scan) |
| 64 | Mellow Mushroom | https://www.mellowmushroom.com/ | Atlanta, GA (HQ) | chain | pizza | yes (HTML scan) |
| 65 | Taco Mama | https://tacomamaonline.com/ | Birmingham, AL (HQ) | chain | Mexican | yes (HTML scan) |
| 66 | Duck Donuts | https://www.duckdonuts.com/ | Duck, NC (HQ) | chain | bakery/donuts | yes (HTML scan) |

---

## 3. Pages

What the 63 readable home pages link to (keyword match on link labels and URLs, independents / chains in brackets):

| Page / destination | Count | Notes |
|---|---|---|
| Menu | 55/63 (47/55, 8/8) | The 8 without a menu link are mostly coffee roasters whose site is a bean shop, plus one family-style place with a fixed meal. |
| About / Our story / History | 49/63 (43/55, 6/8) | Often a long single block of text; family and founding year are the content. |
| Order online / pickup | 44/63 (37/55, 7/8) | Almost always an external link (see section 6). |
| Contact | 44/63 (38/55, 6/8) | Usually phone + email + address; forms are uncommon on small sites. |
| Location(s) / Visit / Hours / Directions | 43/63 (35/55, 8/8) | Single-location places often fold this into the home page or footer. |
| Shop / merch / sauces / shipping | ~38/63 (32/55, 6/8) | Overcounted by the keyword match. Real stores are common on BBQ (sauces, rubs, shipped meat) and coffee roasters (beans). |
| Catering | 34/63 (26/55, 8/8) | Plus 3 more mention catering without a nav link. |
| Gift cards | 25/63 (18/55, 7/8) | Nearly always a third-party gift card link. |
| Careers / Jobs / Join the team | 25/63 (17/55, 8/8) | Every chain has one; small places use a mailto or a hiring note. |
| Press / Media / Awards | 22/63 (20/55, 2/8) | BBQ and destination diners use it most. |
| Events / live music | 18/63 (17/55, 1/8) | Bars, BBQ joints with music, coffee shops with open mics. |
| Rewards / loyalty / app | 15/63 (11/55, 4/8) | Usually Toast or Square loyalty. |
| Blog / News | 13/63 (12/55, 1/8) | Often stale (one site's newest post was four years old). |
| Private events / parties / venue | 11/63 (10/55, 1/8) | |
| FAQ | 11/63 (11/55, 0/8) | Where present, it answers hours, reservations, parking, gift cards, dietary. |
| Reservations | 7/63 | Rare. Most small places are walk-in only, and several say so plainly. |
| Specials / happy hour / daily menu | 7/63 | Low on the home page, but specials live on Facebook for many places. |
| Reviews / testimonials page | 7/63 | |
| Gallery / photos | 5/63 | |
| Newsletter signup | 6/63 | |
| Wholesale | 6/63 | Coffee roasters and bakeries. |

**Recommended page set for our template**

| Page | Status | Contents |
|---|---|---|
| Home (`/`) | **Required** | A single long page with anchor sections (section 4). It must work on its own for a visitor who never clicks further. |
| Menu (`/menu/`) | **Required** | HTML text menu, grouped by category with jump links, prices when the owner gives them, dietary tags, a "last updated" date, and an optional printable PDF as a secondary link. A separate URL ranks for "<name> menu" searches and can be shared by text. |
| Catering (`/catering/`) | Optional (on when owner offers catering) | Packages or per-person options, minimums, lead time, service area, call/email inquiry, optional ezCater link. |
| Events & private parties (`/events/`) | Optional | Room capacity, live-music nights, recurring events. No event calendar backend; a simple list the owner edits. |
| Specials (anchor on home, not a page) | Optional | Weekly or daily plate-lunch rotation, happy hour, kids-eat-free night. Rendered as a small table the owner can edit in the app. |
| Gift cards, Shop, Jobs, Reservations | Optional, link only | Buttons to the owner's existing Toast/Square/Shopify/OpenTable pages or a mailto. Never built in. |
| Privacy (`/privacy/`) | Only if a form or analytics is on | Short boilerplate. |

**One long page or many?** For this category, **a long home page with anchors plus a separate Menu page** fits best.
The small-town sites that work (for example a Cullman BBQ site, a Gatlinburg breakfast house, a Texas kolache stop)
keep five or fewer nav items and put hours, location and story on the home page. Multi-page sites add pages like
"Media Assets", "Blues Festival" anchors or "Parking" that have little content and often hold placeholder (#) links.
Keep the menu separate because it is the page people search for, share and come back to, and because a long
menu would bury the hours and location sections.

---

## 4. Home page section order

The best-run sites (the ones that answered "when are you open, where are you, what do you serve, how do I order" fastest)
followed roughly this order. This is a composite of the 23 detailed reads, not any single site.

1. **Slim header**: logo/name, 3 to 5 nav items (Menu, Order, Catering, About, Visit), and a tap-to-call icon on mobile.
2. **Hero**: one strong food or storefront photo, the business name and a one-line description (cuisine + town),
   **open-now status with today's hours**, and two buttons: primary (Order online, or Call if there is no ordering link)
   and secondary (View menu).
3. **Quick info strip**: address (tap opens Maps), phone (tap to call), today's hours with a "see all hours" toggle,
   and service chips from Places (Dine-in, Takeout, Delivery, Drive-through, Outdoor seating).
4. **Menu highlights**: 3 to 6 signature items with photo, one-line description and price, then "Full menu".
5. **Specials** (optional): this week's plate lunches, happy hour, daily soup. Must show the date or day it applies to.
6. **About / story**: 2 short paragraphs with a photo of the owner, family or building; founding year if confirmed.
7. **Reviews**: Google star rating and count as a number (with a link to the Google listing), plus up to 3 owner-supplied
   testimonials. Never paste Google review text (see the compliance rules in CLAUDE.md).
8. **Catering** teaser (optional): one paragraph and an "Ask about catering" button.
9. **Events / private parties** teaser (optional).
10. **Visit us**: full weekly hours table, holiday-closure note, address, a static map image or a "Get directions" button
    (an embedded Google map is optional and loads only on tap), parking or drive-up notes.
11. **Footer**: name, address, phone, hours summary, social icons with text labels, gift card/jobs links, copyright year
    generated at build time.

**Above the fold on a phone (360-412 px wide, about 640-740 px tall), we must show:**
name, cuisine + town line, today's hours or open/closed status, the primary button, and a tap-to-call control.
The hero photo can sit behind or above this, but it should not push the buttons below the first screen.
The address can be one tap away (in the info strip right under the hero).

What we saw instead: on 16 of the 23 detailed reads, a visitor had to scroll past imagery, a long story block, promo
banners or an Instagram feed before finding hours or the address. One opened with two promo pop-ups (party booking,
catering) in front of everything on load.

---

## 5. Features and calls to action

**Primary CTA**, chosen per client by the data we have:
- **Order online** when the owner has an ordering link (Toast, Square, Clover, ChowNow, order.online, Slice, etc.).
  It was the first button in the header or hero on about 8 of the 23 detailed reads.
- **Call to order** when the place takes phone orders but has no online ordering. This is common in small towns: one
  Texas bakery stop says outright that orders are phone-only on weekdays.
- **Reserve a table** only for sit-down places that take reservations (Places `reservable` = true, or the owner says so).

**Secondary CTA**: **View menu**, always. Tertiary: **Get directions**.

**Must-have features** (present on most strong sites, or a basic need that weak sites miss):

| Feature | Seen on | Why required |
|---|---|---|
| Menu link / page | 55/63 | The top reason people visit. |
| Phone number visible | 36/63 in text | Small-town customers call. |
| Tap-to-call `tel:` link | **20/63** | Big gap: our template beats most sites just by doing this. |
| Hours as text | 29/63 detectable | Many sites put hours in an image, the footer only, or nowhere. |
| Street address | 39/63 detectable in text | Should link to Google Maps directions. |
| Social links | Facebook 58/63, Instagram 47/63 | Where daily specials actually get posted. |
| Mobile viewport tag | 60/63 | The 3 without one (older hand-built or legacy-template sites) show a shrunken desktop page on phones. |
| Ordering link (if owner has one) | 44/63 have order links | |
| Catering info (if offered) | 37/63 mention catering | |

**Nice-to-have** (switch on per client): gift cards (25/63), events/live music (18/63), private parties (11/63),
FAQ (11/63), newsletter (6/63), shipping/Goldbelly (5/63, BBQ only), rewards/loyalty link (15/63), merch/sauce shop link,
jobs link (25/63), allergen/dietary notes, kids menu, "Haul it home" family packs, drive-through note.

**Trust signals seen, roughly in order of how often:**
- Story with family names and generations (most About pages).
- Founding year or "since..." (14/63 on the home page). Strong for BBQ and diners.
- Awards, press logos and TV mentions (18/63 use award/press wording; one Chattanooga diner opens with a strip of 12 award badges).
- Customer reviews (a few pages show 3 to 12 named quotes, one shows a 5-review Google carousel).
- Local ties: hall-of-fame or chamber badges, sister businesses, charity work.
- Simple honesty notes that build trust: "cash and card accepted", "no reservations, first come first served",
  "closed on these holidays".

For our clients: show the **Google rating and review count as numbers** (from Places, refreshed), the founding year
**only when the owner confirms it**, and up to 3 owner-supplied quotes. Award badges only with owner proof.

---

## 6. Third-party integrations

Counted from home-page links (N = 63). Ordering links that sit behind an internal "/order" page are not counted, so real
use is higher.

| Tool | Count | How it was used |
|---|---|---|
| **Toast** (order / gift cards / loyalty) | 12/63 | "Order online" button linking to the Toast online-ordering page; gift card and rewards links on some. Never embedded. |
| **DoorDash / order.online** | 9/63 | Link-out buttons; one small-town BBQ uses it for all ordering, one diner shows a DoorDash logo button. |
| **Square Online / Square gift cards** | 6/63 | Link to a `*.square.site` storefront; one Hartselle coffee shop's whole site *is* the Square storefront. |
| **Olo** | 4/63 | Chains only (plus one multi-location independent). |
| **ChowNow** | 2/63 | Order link, with a location picker first. |
| **Clover** | 1/63 | Order link. |
| **Uber Eats** | 1/63 | Link next to DoorDash. Grubhub: 0. |
| **Resy** | 3/63 | Upscale independents only. OpenTable and Tock: 0 counted (one dropped chain used OpenTable). |
| **ezCater** | 3/63 | "Order catering" buttons. |
| **Goldbelly** | 5/63 | BBQ shipping nationwide. |
| Third-party gift card sellers | 6/63 | Toast, Square, Gift Up and similar. |
| Google Maps link | 21/63 | Address links. Embedded maps only on 4/63. |
| Email marketing (Mailchimp/Klaviyo) | 7/63 | |
| Eventbrite | 2/63 | Ticketed dinners/events. |
| OpenMenu / menu-hosting embeds | 4 menu pages | An iframe or off-site menu page; one Cullman steakhouse's only menu is on an off-site menu host. |
| Yelp / Tripadvisor badges | 5/63, 4/63 | Mostly old badges ("2019"), which look dated. |

**Site builders seen** (useful for sales conversations, not for our stack): WordPress 25/63, Squarespace 15/63,
Shopify 10/63 (BBQ sauce shops and coffee roasters), GoDaddy builder 7/63, Square/Weebly 4/63, Wix 2/63, Webflow 2/63,
BentoBox 1, SpotHopper 1, Chowly-built 1. Several small-town Wix/GoDaddy sites still show the builder's ad banner or
"powered by" badge and a free subdomain.

**What our template should support (all as plain links or click-to-load embeds; the site stays static):**
- **Order online URL** (any provider). Auto-detect the provider from the URL to show the right label and icon:
  Toast, Square, Clover, ChowNow, order.online/DoorDash, Slice, Menufy, Owner.com, Popmenu, BentoBox.
- **Delivery links** (DoorDash, Uber Eats, Grubhub), shown as a small row of secondary buttons.
- **Reservation URL** (OpenTable, Resy, Tock, Yelp Guest Manager, SevenRooms) as a button. No widget scripts by default.
- **Catering URL** (ezCater or the owner's form/email).
- **Gift card URL** (Toast, Square, other).
- **Shipping/shop URL** (Goldbelly, Shopify, Square).
- **Social URLs** (Facebook, Instagram, TikTok, YouTube).
- **Google Maps** directions link from the Place ID (`https://www.google.com/maps/place/?q=place_id:...`), plus an optional
  click-to-load map iframe.
- Skip: live Instagram feeds, review widgets, chatbots, pop-ups.

---

## 7. Mobile behavior

- **Sticky action bars are rare on these sites, and they work well when present.** Only a handful of the 63 pages show
  markup for a fixed bottom bar or floating buttons (a Chattanooga diner's floating "Call a location" and "Order online"
  buttons, a SpotHopper BBQ site's fixed bottom nav, a BentoBox sticky mobile footer, a Square/Weebly mobile bar). About as
  many use a sticky header. This is a markup scan, not a rendered check, so it may undercount.
  **Our template: a fixed bottom bar on phones with 2-3 buttons: Call, Order (or Menu), Directions.** Hide it on desktop.
- **Tap-to-call** is missing on most sites (only 20/63 have `tel:` links). One footer phone link had an invisible character
  in it that would break dialing. Generate `tel:` links from the E.164 number from Places, never from free text.
- **Menus on phones:** PDF and photo menus force pinch-zoom; the best mobile menus were HTML with category jump links
  (sticky category chips at the top of the menu page), short item descriptions, and prices right-aligned.
- **Hours:** show "Open now, closes 8 PM" / "Closed, opens Tue 10:30 AM" computed in the browser from the hours data,
  with the full week behind a toggle. Several sites showed conflicting hours in two places (hero vs footer), so render
  every hours block from the same single source of data.
- **Images:** hero photos were often huge, uncompressed and lacking alt text. Serve responsive WebP/AVIF with `srcset`,
  lazy-load everything below the fold, and keep total page weight small (target under 1 MB on first load).
- **Navigation:** duplicated nav blocks (desktop + mobile copies in the HTML) were common and caused screen readers to read
  the menu twice. Use one nav that changes layout with CSS.
- **No pop-ups** on load. One small-town BBQ site opened with two stacked promo pop-ups covering the page.
- **Thumb reach:** buttons at least 48 px tall, primary actions in the lower half of the screen (the sticky bar).

---

## 8. Content the AI must write

Tone for all copy: warm, plain, specific and local. Short sentences. Talk like a friendly regular, not an ad agency.
No invented facts. No dialect caricature ("y'all" at most once per site, only if the owner likes it). Avoid stock phrases
("nestled", "culinary journey", "mouthwatering", "elevate", "look no further"). US English, 6th-8th grade reading level.

| Section | What the AI writes | Length | Inputs it may use |
|---|---|---|---|
| Hero line | Name is given; AI writes a 4-8 word tagline + 1 line of cuisine + town | Tagline ≤ 8 words; subline ≤ 15 words | Places primary type, city, owner keywords, review themes (as context only) |
| Menu highlights | One-line descriptions for 3-6 signature items | ≤ 18 words each | Only items the owner listed or confirmed. **Never invent dishes or prices.** |
| Menu page | Category intros (optional) and item descriptions where the owner gave only names | ≤ 15 words per item | Owner's menu (typed, photo-transcribed, or PDF-transcribed, then owner-approved) |
| About / story | 2 short paragraphs | 80-150 words | Owner interview answers (who, since when, what makes it different). Places editorial summary as a fallback. No made-up years, family names or awards. |
| Specials blurb | One line per special | ≤ 12 words | Owner input |
| Catering | Intro paragraph + 3-5 bullet points (what's offered, minimums, lead time, area served) | 50-90 words | Owner input; if missing, a generic "call to ask" version |
| Private events | Short paragraph | 40-70 words | Owner input (capacity, room) |
| FAQ | 4-6 Q&As built from facts (parking, reservations, payment, kids, dietary, takeout/delivery, pets on patio) | ≤ 40 words per answer | Places booleans + owner input |
| Reviews intro | One line around the rating | ≤ 12 words | Places rating + count |
| SEO title & meta description | Per page | Title ≤ 60 chars; meta 140-155 chars | Name, cuisine, city, signature item |
| Image alt text | Every image | ≤ 125 chars | Image caption from owner, or a neutral description |
| Hours notes | Holiday closures, kitchen vs bar hours | One line | Owner input |

**Where each piece of data comes from**

- **Google Places:** name, address, phone, coordinates, Place ID / Maps link, regular hours (and holiday hours when present
  in current opening hours), primary type and types, price level / price range, rating and review count, service options
  (dine-in, takeout, delivery, curbside, reservable), meals served (breakfast, lunch, dinner, brunch), drinks served
  (beer, wine, cocktails, coffee), amenities (outdoor seating, live music, kids menu, good for groups, dogs allowed,
  restroom), payment, parking and accessibility options, editorial summary, photos (preview only; must be swapped before
  publish), reviews (context only, never quoted).
- **Owner (required before publish):** the menu (items, categories, prices), confirmation of hours, ordering/reservation
  links, photos they own or approve, the story facts, catering details, specials, social URLs.
- **AI:** all prose in the table above, written from the two sources, and marked "needs owner review" in the app.
- **Stock or AI images:** fallback only, never presented as "our food" without the owner's OK. Prefer generic
  textures/ingredients over fake plated dishes.

---

## 9. Data model

`R` = required to publish, `O` = optional. Source: `P` = Google Places, `A` = AI-written, `W` = owner, `S` = system.

```yaml
business:
  place_id:            R  P   # store indefinitely
  name:                R  P   # owner may edit display name
  subtype:             R  P/W # bbq | southern | diner | breakfast | mexican | pizza | coffee | bakery | cafe | other
  cuisine_label:       R  A/W # "Smokehouse BBQ", "Mexican restaurant & cantina"
  tagline:             O  A
  phone_e164:          R  P   # for tel: links
  phone_display:       R  P
  email:               O  W
  address: {street, city, state, zip}  R  P
  geo: {lat, lng}      R  P
  maps_url:            R  P/S
  service_area_note:   O  W   # e.g. "Catering anywhere in Cullman County"
  price_level:         O  P   # $, $$
  founded_year:        O  W   # only if owner confirms
  owner_names:         O  W
hours:
  weekly: [{day, open, close}]   R  P (owner confirms)  # multiple ranges per day allowed (lunch/dinner)
  kitchen_vs_bar:      O  W
  holiday_closures: [{date, note}]  O  W/P
  seasonal_note:       O  W
services:              # booleans, drive chips + FAQ + schema
  dine_in, takeout, delivery, curbside, drive_through, reservable,
  serves_breakfast, serves_brunch, serves_lunch, serves_dinner,
  serves_beer, serves_wine, serves_cocktails, serves_coffee, serves_dessert, serves_vegetarian,
  outdoor_seating, live_music, kids_menu, good_for_groups, dogs_allowed, wheelchair_accessible,
  payment: [cash, card, nfc]            O  P (owner confirms)
links:
  order_url:           O  W   # provider auto-detected
  delivery_urls: []    O  W
  reservation_url:     O  W
  catering_url:        O  W
  gift_card_url:       O  W
  shop_url:            O  W
  jobs_url_or_email:   O  W
  social: {facebook, instagram, tiktok, youtube}  O  W (Facebook URL is often the lead source)
menu:
  last_updated:        R  S
  pdf_url:             O  W   # secondary, printable
  sections: [{name, note, items: [{name, description(A/W), price(W), tags: [spicy, vegetarian, gluten_free, house_favorite, new], photo(W)}]}]  R  W
  highlights: [item refs, 3-6]  R  W/A (AI suggests, owner confirms)
specials:  [{title, days, time_window, price, note, expires}]  O  W
catering:  {intro(A), offerings[], min_order, lead_time, service_area, contact}  O  W/A
events:    [{title, recurring_rule or date, note}]  O  W
private_events: {capacity, rooms, note(A)}  O  W
reviews:
  rating:              O  P   # refresh on a schedule, show "as of" date
  review_count:        O  P
  testimonials: [{quote, name}]  O  W  # owner-supplied only
about:
  story:               R  A (from owner answers)
  photo:               O  W
awards: [{name, year, proof_url}]  O  W
faq: [{q, a}]          O  A (from P booleans + W)
media:
  logo:                O  W   # fallback = typeset wordmark
  hero_photo:          R  W/stock  # Google photos allowed in preview only
  gallery: []          O  W
design:
  look:                R  S   # pit-and-plank | blue-plate | garden-table | color-block
  accent_variant:      R  S   # rotated so neighbors differ
seo:
  title, meta_description per page  R  A
  schema_type:         R  S   # mapped from subtype
status: new | shown | sold | live  R  S
```

---

## 10. Design looks

Four original looks. Each has two accent variants so two clients of the same look in one town still look different.
Assign a look by sub-type first (the default is listed), then rotate the variant or the look if a nearby client already has it.
All palettes keep body text at or above WCAG AA contrast on their background.

### A. Pit & Plank (default for BBQ, smokehouses, steak and catfish houses)
- **Mood:** smoky, hearty, unfussy, a little rugged. Proud of the fire and the family.
- **Palette:** charcoal `#1F1B18`, butcher paper `#F2E8D5`, ember red `#B5381F`, mustard `#D4972F`, ash gray `#6E6660`.
  Variant 2 swaps ember red for hickory green `#3F5B3A`.
- **Fonts:** headings **Alfa Slab One**, body **Source Sans 3**. Prices and labels in **Source Sans 3** semibold, tabular numbers.
- **Photo style:** close and warm, low side light, visible texture (bark, char, wood, steam). Hands and pits over posed people.
- **Layout feel:** full-bleed dark hero with paper-colored sections below, thick horizontal rules, rubber-stamp-style badge
  for the founding year or "pit-smoked daily", menu as a two-column board list with dotted leaders on desktop, one column on phones.

### B. Blue Plate (default for diners, meat-and-threes, breakfast spots, family restaurants)
- **Mood:** bright, friendly, hometown, morning-coffee energy. Clean, not kitschy (no checkerboard floors or chrome clip art).
- **Palette:** cream `#FFF8EC`, plate blue `#1E4F8A`, tomato `#D9483B`, butter `#F3C969`, ink `#23272E`.
  Variant 2 swaps plate blue for teal `#16736F` and tomato for coral `#E86A50`.
- **Fonts:** headings **Archivo Black**, body **Archivo**.
- **Photo style:** daylight, top-down plates on the table, real portions, a counter or booth in the background.
- **Layout feel:** rounded cards and pill buttons, a "Today's plates" specials card that reads like a printed daily
  sheet (clean type, not a chalkboard font), big hours card, generous tap targets.

### C. Garden Table (default for coffee shops, bakeries, cafes, brunch)
- **Mood:** airy, calm, handmade, morning light.
- **Palette:** oat `#F6F2EA`, sage `#6E8F72`, terracotta `#C2654A`, espresso `#2E2723`, flour white `#FFFFFF`.
  Variant 2 swaps sage for dusty blue `#6C88A3` and terracotta for berry `#A2456A`.
- **Fonts:** headings **Fraunces** (soft optical size), body **DM Sans**.
- **Photo style:** soft window light, shallow depth of field, pastries on linen or wood, cups from above, hands at work.
- **Layout feel:** lots of white space, asymmetric image + text pairs, rounded-corner photos, small-caps section labels,
  a "Fresh today" or "Weekly bake list" module, pre-order/cake-order block for bakeries.

### D. Color Block (default for Mexican, taquerias, pizza, burger and casual counter-service spots)
- **Mood:** loud, fun, festive, fast. Built for "order now".
- **Palette:** deep teal `#0F3C44`, chili orange `#EF5B2B`, marigold `#F5C043`, warm white `#FBF6EF`, hot pink accent `#E2557F`
  (accent only, small doses). Variant 2: tomato red `#D7322C` + basil `#2F7A3E` on warm white, for pizza.
- **Fonts:** headings **Bricolage Grotesque** (heavy), body **Nunito Sans**.
- **Photo style:** high saturation, direct light, tight crops on food, drinks with color, cheese pulls and steam.
- **Layout feel:** full-width color-block sections, oversized headings, tilted "sticker" labels for specials and happy hour,
  big order button repeated after each section. Must avoid stereotyped motifs (sombreros, cartoon chilies, papel picado clip art).

Shared rules for every look: one logo (or a typeset wordmark when the owner has none), max two fonts, one accent color for
all buttons, photos from the owner first, and the same section order from section 4.

---

## 11. Local SEO

**Schema.org (JSON-LD on every page).** Only 7/63 home pages used a food-specific type (`Restaurant` or
`FoodEstablishment`), 13 more used plain `LocalBusiness`, and only 8 had `OpeningHoursSpecification`. Easy win.
- Type by sub-type: `BarbecueRestaurant` is not a schema.org type, so use `Restaurant` with `servesCuisine: "Barbecue"`.
  Coffee: `CafeOrCoffeeShop`. Bakery: `Bakery`. Counter service: `FastFoodRestaurant` only if the owner is fine with that
  label, otherwise `Restaurant`. Bars/pubs: `BarOrPub`.
- Include: `name`, `url`, `telephone`, `address` (`PostalAddress`), `geo`, `openingHoursSpecification` (from the same
  hours data as the page), `servesCuisine`, `priceRange`, `hasMenu` (menu page URL), `acceptsReservations`,
  `image`, `logo`, `sameAs` (Facebook, Instagram, Google Maps URL), `potentialAction` `OrderAction` / `ReserveAction`
  pointing at the owner's links when present.
- Menu page: optional `Menu` / `MenuSection` / `MenuItem` markup with `offers.price` when prices exist.
- **Do not** add `aggregateRating` built from Google reviews to the business's own page. Google treats self-serving
  review markup on a LocalBusiness as ineligible for review stars, and copying Google review data into markup also
  conflicts with the Places terms.

**Title and meta patterns**
- Home title: `{Name} | {Cuisine} in {City}, {ST}` (e.g., "Name | BBQ & Catering in Cullman, AL"), ≤ 60 characters.
- Menu title: `Menu | {Name}, {City} {ST}`.
- Catering title: `Catering in {City} & {County} County | {Name}`.
- Meta description: cuisine + signature item + town + a fact (open since, drive-through, open Sunday) + action, 140-155 chars.
- One `h1` per page (the business name on home, "Menu" on the menu page).

**NAP consistency.** Render name, address and phone from one record everywhere (header, info strip, visit section,
footer, schema). Use the Places formatting and keep it identical to the Google Business Profile. Several studied sites
had two different phone numbers or two different hours blocks for the same place.

**Category-specific notes**
- Menu items as real text are the SEO content for this category. People search "<dish> near me" and "<name> menu".
- Put the town and nearby landmarks in plain words in the visit section ("downtown Cullman, across from...", "off I-65 exit 304").
  Highway exit numbers matter for travelers in towns like Cullman.
- Add the website URL, menu URL and order URL to the client's Google Business Profile at publish time (owner action).
- Sitemap and robots: previews stay `noindex` behind login (CLAUDE.md); published sites get a sitemap and `index`.
- Fast pages help both ranking and conversions; static Cloudflare Pages output with compressed images is a natural advantage.

---

## 12. Anti-patterns

Seen on weaker sites in the sample (or among the domains we tried); our templates must avoid all of these.

1. **Hours missing, buried or contradictory.** 7 of the 23 detailed reads had no readable hours on the home page; others
   showed hours only in the footer, or in two places that disagreed.
2. **No tap-to-call.** 43/63 home pages have no `tel:` link, including sites that print the number.
3. **PDF or photo menus** (a screenshot file as the whole weekday menu, a scanned JPG, an "Oct 2020" menu URL).
   Hard to read on phones, invisible to search, and they go stale.
4. **Off-site menus with no fallback.** A menu that only exists on a third-party menu host or inside the ordering app.
5. **Hero with no action.** Big photo or slogan and no button; ordering link at the very bottom of the page.
6. **Feeds as content.** An Instagram feed as the main home-page section, sometimes showing "image unavailable" placeholders.
7. **Pop-ups on load** (party booking, catering) that cover the page on a phone.
8. **Stale signals:** copyright 2019-2022, "Restaurant Guru 2019" badges, last blog post years ago, "open again" pandemic-era
   banners, empty review widgets, a "cart (0)" with nothing to buy.
9. **Broken or placeholder links** (`#` targets for To-Go Menu, Events, Buy Now), duplicated nav blocks, mislabeled links
   ("Pizza" pointing to a bread page), and builder leftovers (a "missing storage" notice in a newsletter form, a visible
   placeholder account email, "Loading..." text).
10. **Free-builder branding:** Wix ad banners, "Powered by GoDaddy", free subdomains like `name.wixsite.com/website`.
11. **Expired or hijacked domains.** At least 8 of roughly 175 domains we tried were expired (Squarespace/Wix error pages),
    parked for sale, or redirected to gambling spam. Domain renewal must be part of our maintenance plan.
12. **Icon-only links and missing alt text** (social icons with no labels, slides all alt-tagged "slide 2").
13. **Image-only text:** hours or specials posted as a graphic, so screen readers, search and translation can't read them.
14. **Too many look-alike CTAs:** "Order", "Order Online Now", "Sauce Orders", "Shop Now" all on one page with no clear primary.
15. **Multi-location confusion** (not our usual client, but it happens): a phone number with no address, or two
    different numbers for one place with no label.
16. **JavaScript-only pages** that show nothing to crawlers (one award-winning bakery's site returned only its title).
17. **Google review text pasted on the site.** Not seen often, but our generator must never do it (Places terms).
