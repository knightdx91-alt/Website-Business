# Category blueprint: Hair salons and barbershops

Researched October 2026 for the Cullman, AL starting market. One category, two variants that share a template:
**Salon** (cuts, color, blonding, extensions, bridal, often spa add-ons) and **Barbershop** (cuts, fades, beards, shaves,
kids). A third flag, **Both**, covers the common small-town "barber and beauty" shop.

**Method, briefly.** I collected candidates from organic searches such as "hair salon <city>", "barbershop <city>" and
"best hair salon <city>", with Yelp, Facebook, Instagram, the booking marketplaces and directory sites blocked. I also used
a few design-roundup articles for ideas only. Cities: Cullman, Decatur, Florence, Muscle Shoals, Huntsville, Tuscaloosa,
Opelika/Auburn, Dothan, Jasper, Hartselle, Arab (AL); Oxford, Hattiesburg, Tupelo, Starkville (MS); Ruston (LA);
Jonesboro (AR); Athens (GA); Cookeville, Chattanooga/Red Bank, Murfreesboro (TN); Bowling Green (KY); Greenville (SC).
I added 8 chains and regional groups for feature ideas only.

I downloaded each home page's HTML myself (with a phone user-agent) and ran a script over it. The script counted `tel:` links,
booking-platform links, schema.org types, link labels, headings, keywords in the visible text and page weight. I also read
13 sites with a page reader to get the section order and the first screen (Vanzant, Element, Creative Touch, Pageboy,
Adams, Jessica Eads, The Barber Shop TN, Society, Midtown, Southern Chic, LudaBlends, Solomon's, Studio 64).

**Base for frequencies: N = 79 sites with readable home-page HTML** (71 independents, 4 regional groups, 4 national chains).
By kind: 42 salons, 33 barbershops, 4 both. 13 more sites were tried but returned a bot check, failed, or were JavaScript-only
shells with no readable text. They are listed in the table and **not counted**.

**Caveats on the numbers.** All counts come from **home pages only**. A feature that only appears on an inner page is not counted,
so true frequencies are higher, especially for prices, policies, team bios and galleries. Keyword counts are pattern matches,
so treat them as close estimates (roughly ±2), not exact audits. Things a site builder adds with JavaScript after load
(Instagram feeds, review widgets, sticky bars) are under-counted.

A note on the market: most search results for Cullman-area salons and barbers were **Booksy, Vagaro, GlossGenius, Fresha or
Square booking pages**, not websites. Many of our future clients already have a booking link and simply need a real site
around it. The template has to take that link as input on day one.

---

## 1. Summary

- **Booking is the job of the site.** 67/79 home pages carry a "book" style call to action, and 47/79 link to a real online
  booking tool. Barbershops are higher (24/33) than salons (22/42). The booking itself always happens on a third-party tool:
  19 different tools appeared and none is dominant. Our template should take **one booking URL per shop, plus an optional URL per
  stylist or barber**, and never try to do booking itself.
- **Phone is the second CTA, and is often done badly.** Only 49/79 have a tap-to-call `tel:` link, though 59/79 print a number
  somewhere. Only 18 of those 59 put it in the top quarter of the page. Every one of our pages gets a tap-to-call button in
  the header and in a sticky bottom bar. Many small-town clients book by phone or text, so a "Text us" link is worth adding when the
  owner has a textable number.
- **Barbers and salons differ in three ways.** Barbershops show prices (9/33 list 3+ prices on the home page vs 2/42 salons),
  talk about walk-ins (11/33 vs 8/42) and book per barber. Salons hide prices behind a consult or the booking tool, and lean on
  specialties: extensions (17/42), blonding or balayage (15/42), bridal (11/42), gift cards (10/42) and careers (15/42).
  The template ships two variants with different defaults, not one generic page.
- **Show the people.** 42/79 have a team, stylist or barber link in the menu. The best sites give each person a photo, a role,
  specialties and their own Book button. In this category clients book a person, not a business.
- **Instagram is the de facto portfolio.** 56/79 link to Instagram and 16/79 embed a live feed widget, but our static sites
  should use an **owner-curated photo gallery plus an Instagram link**, not a live feed. Feeds break, slow the page and pull in
  third-party scripts.
- **Proof is thin and easy to beat.** Reviews or testimonials appear on only 26/79 home pages. Years in business or family
  ownership appear on 25/79, awards on 14/79, and a "licensed" mention on 8/79. A rating summary with a link to Google, plus 3 owner-approved
  testimonials and a founding year, would put a new client ahead of most local competitors.
- **Basic hygiene fails often.** 13/79 have no H1 and 19/79 have several. 26/79 have no meta description. Only 5/79 use a specific
  schema type (HairSalon or BeautySalon). 15/79 ship more than 500 KB of HTML, and 3 ship more than 1 MB. I also saw leftover template content from an
  unrelated business, booking buttons that go nowhere (`#`), and hours that disagree within the same page. A fast, correct,
  consistent static page already beats most of the sample.

---

## 2. Sample

Kind: Salon / Barber / Both (barber and beauty under one roof). Type: Independent = single-location or single-market business.
"Visited directly" = I downloaded the live home page myself and it had readable content. Rows 80-92 were attempted but could not
be read (bot check, timeout, or a JavaScript-only page), so they are not counted in any frequency below. The booking column
shows tools that were detectable in the home-page HTML. "phone / form only" means none was detectable (some of these sites book via a
JavaScript button the script could not see).

Note: Hair by Rheagan (row 3) is a GlossGenius-hosted mini-site, which is typical of what local stylists use instead of a website.
Marcus & Beatty (row 17) is a barbershop whose site is mostly a retail store.

| # | Business | URL | City / State | Kind | Type | Visited directly | Booking tool seen on home page |
|---|---|---|---|---|---|---|---|
| 1 | Solomon's Barbershop | solomonsbarber.com | Cullman, AL | Barber | Independent | yes | phone / form only |
| 2 | LudaBlends Barber Studio | ludablendsbarberstudio.com | Cullman, AL | Barber | Independent | yes | Booksy |
| 3 | Hair by Rheagan | rheaganholland.glossgenius.com | Cullman, AL | Salon | Independent | yes | GlossGenius |
| 4 | Vault 41 Salon | vault41salon.com | Decatur, AL | Salon | Independent | yes | GlossGenius |
| 5 | Elite Barbering & Beauty | elitebarberingandbeauty.com | Florence, AL | Barber | Independent | yes | Square, Wix Bookings |
| 6 | Ernest Barber | ernestbarber.com | Florence, AL | Barber | Independent | yes | Squire |
| 7 | Crocker Barber Co. | crockerbarberco.com | Florence, AL | Barber | Independent | yes | Squire |
| 8 | Creative Edge Salon | creative-edgesalon.com | Florence, AL | Salon | Independent | yes | phone / form only |
| 9 | Oasis Day Spa & Salon | oasisflorence.com | Florence, AL | Salon | Independent | yes | Thryv |
| 10 | Grissom Hair Company | grissomhaircompany.com | Muscle Shoals, AL | Salon | Independent | yes | Goldie |
| 11 | Wildflower Hair Studio | wildflower-hairstudio.com | Huntsville, AL | Salon | Independent | yes | Square |
| 12 | The Parlor | theparlorhuntsville.com | Huntsville, AL | Salon | Independent | yes | Vagaro |
| 13 | Society Salon | societysalonal.com | Huntsville, AL | Salon | Independent | yes | Phorest |
| 14 | Salon Allure | salonallurehuntsville.com | Huntsville, AL | Salon | Independent | yes | phone / form only |
| 15 | Nova Salon | thenovasalon.com | Huntsville, AL | Salon | Independent | yes | Jotform form, Vagaro |
| 16 | Greasy Hands Barbershop | greasyhands.co/tuscaloosa | Tuscaloosa, AL | Barber | Regional (multi-location) | yes | Square |
| 17 | Marcus & Beatty | marcusandbeatty.com | Tuscaloosa, AL | Barber | Independent | yes | phone / form only |
| 18 | Gentlemen's Grooming | gentlemensgrooming.net/index.html | Tuscaloosa, AL | Barber | Independent | yes | phone / form only |
| 19 | Style Connection | styleconn.com | Tuscaloosa, AL | Both | Independent | yes | phone / form only |
| 20 | Davis Mann & Co. | davismannandco.com | Opelika, AL | Salon | Independent | yes | phone / form only |
| 21 | The Cutting Edge | auburncuttingedge.com | Auburn, AL | Salon | Independent | yes | phone / form only |
| 22 | AP Pearson Salon | appearsonsalon.com | Opelika, AL | Salon | Independent | yes | phone / form only |
| 23 | Nicole Allen Salon | nicoleallensalon.com | Dothan, AL | Salon | Independent | yes | Phorest |
| 24 | The Beauty Room | thebeautyroomdothan.com | Dothan, AL | Salon | Independent | yes | phone / form only |
| 25 | Hairoglyphics Hair & Beauty | salonhairoglyphics.com | Dothan, AL | Salon | Independent | yes | phone / form only |
| 26 | Hemispheres Salon & Spa | hemispheresdothan.com | Dothan, AL | Salon | Independent | yes | phone / form only |
| 27 | Rituals Salon & Day Spa | ritualssalonandspa.com | Dothan, AL | Salon | Independent | yes | Phorest |
| 28 | Element Hair Studio | elementhairstudio.com | Oxford, MS | Salon | Independent | yes | Mangomint |
| 29 | DMR Salon & Extension Bar | dmroxford.com | Oxford, MS | Salon | Independent | yes | DaySmart, MySalonOnline, Phorest, Wix Bookings |
| 30 | Amara Salon & Aesthetics | amaraoxford.com | Oxford, MS | Salon | Independent | yes | Vagaro |
| 31 | Southern Chic Salon & Spa | southernchicsalon.com | Oxford, MS | Salon | Independent | yes | phone / form only |
| 32 | Salon 38 | salon38.org | Hattiesburg, MS | Salon | Independent | yes | phone / form only |
| 33 | Robin Symone & Co. | robinsymoneandco.com | Hattiesburg, MS | Salon | Independent | yes | Linktree, Square, Wix Bookings |
| 34 | Shear Envy Salon | shearenvytupelo.com | Tupelo, MS | Salon | Independent | yes | phone / form only |
| 35 | Creative Touch Day Spa & Salon | creativetouchtupelo.com | Tupelo, MS | Salon | Independent | yes | Mangomint |
| 36 | The Alchemy Hair Studio | thealchemyhairstudio.com | Tupelo, MS | Salon | Independent | yes | SalonBiz |
| 37 | Naturally Speaking Salons | naturallyspeakingsalons.com | Tupelo, MS | Salon | Independent | yes | phone / form only |
| 38 | Enlighten Salon & Spa | enlightensalonandspa.com | Tupelo, MS | Salon | Independent | yes | phone / form only |
| 39 | Vanzant Barbershop Lounge | vanzantbarbershoplounge.com | Tupelo, MS | Barber | Independent | yes | Booksy |
| 40 | Luxe Barbershop and Salon | luxebarbershopandsalon.com | Starkville, MS | Both | Independent | yes | Linktree |
| 41 | The Hairport | hairportruston.com | Ruston, LA | Barber | Independent | yes | phone / form only |
| 42 | Adams Barber Shop | adamsbarbershopjonesboro.com | Jonesboro, AR | Barber | Independent | yes | theCut |
| 43 | Tito's Professional Barbershop | titosprofessionalbarbershop.com | Athens, GA | Barber | Independent | yes | phone / form only |
| 44 | Southern Fine Lines | southernfinelines.com | Athens, GA | Barber | Independent | yes | GlossGenius |
| 45 | Pageboy / Pageman Barber Co. | pageboy.co | Athens, GA | Both | Independent | yes | Boulevard |
| 46 | Envision Hair Salon & Spa | envisionhairsalonandspa.com | Cookeville, TN | Salon | Independent | yes | phone / form only |
| 47 | Blown Away Salon & Co. | blownawaysalonandco.com | Cookeville, TN | Salon | Independent | yes | GlossGenius, Jotform form |
| 48 | White Oak Barbershop | whiteoakbarbershop.com | Red Bank, TN | Barber | Independent | yes | SalonUltimate |
| 49 | North Shore Barber Shop | northshorebarbers.com | Chattanooga, TN | Barber | Independent | yes | Square |
| 50 | The Wildwood Reserve Barbershop | wwbarbershop.com | Murfreesboro, TN | Barber | Independent | yes | Goldie, Square |
| 51 | Midtown Barbershop | midtownbarber.com | Murfreesboro, TN | Barber | Independent | yes | phone / form only |
| 52 | Vision Fadez Barbershop | visionfadezbarbershop.com | Murfreesboro, TN | Barber | Independent | yes | Squire |
| 53 | Elvis' Barbershop | elvisbarbershop.com | Murfreesboro, TN | Barber | Independent | yes | Squire |
| 54 | Regina Webb Salon & Spa | reginawebbsalon.com | Bowling Green, KY | Salon | Independent | yes | phone / form only |
| 55 | Posh Salon | poshsalonbgky.com | Bowling Green, KY | Salon | Independent | yes | Vagaro |
| 56 | Salon Panache and Spa | salonpanacheandspa.com | Bowling Green, KY | Salon | Independent | yes | phone / form only |
| 57 | The Green Room Studio Salon | bggreenroom.com | Bowling Green, KY | Salon | Independent | yes | Wix Bookings |
| 58 | Tony Lindsey & Company | tonylindseyandcompany.com | Bowling Green, KY | Salon | Independent | yes | phone / form only |
| 59 | Neighborhood Cut & Shave | neighborhoodcutandshave.com | Greenville, SC | Barber | Independent | yes | Boulevard |
| 60 | Old Crow Barbershop | oldcrowbarbers.com | Greenville, SC | Barber | Independent | yes | Squire |
| 61 | The Open Blade | theopenblade.com | Greenville, SC | Barber | Independent | yes | Square |
| 62 | Barber Lab GVL | barberlabgvl.com | Greenville, SC | Barber | Independent | yes | Square |
| 63 | The Vintage Barber | thevintagebarbershopsc.com | Greenville, SC | Barber | Independent | yes | Vagaro |
| 64 | Manscapers Barbershop & Spa | manscapersgreenville.com | Greenville, SC | Barber | Independent | yes | Booksy |
| 65 | The Edge Barber Shop | theedgebarbershopgvl.com | Greenville, SC | Barber | Independent | yes | Booker |
| 66 | Sport Clips (Opelika location page) | sportclips.com/us-al-opelika-al330 | Opelika, AL | Barber | Chain/franchise | yes | chain check-in app |
| 67 | Floyd's 99 Barbershop | floydsbarbershop.com | National | Barber | Chain/franchise | yes | phone / form only |
| 68 | Scout's Barbershop | scoutsbarbershop.com/locations/southside | Chattanooga, TN | Both | Regional (multi-location) | yes | phone / form only |
| 69 | Birds Barbershop | birdsbarbershop.com | Austin, TX | Barber | Regional (multi-location) | yes | Zenoti |
| 70 | A Cut Above The Rest | acutabovetheresttn.com | Murfreesboro, TN | Barber | Regional (multi-location) | yes | Squire |
| 71 | Studio 64 Salon and Spa | studio64salonandspa.com | Jasper, AL | Salon | Independent | yes | Vagaro |
| 72 | Jessica Eads Hair | jessicaeadshair.com | Jasper, AL | Salon | Independent | yes | phone / form only |
| 73 | Silver Stone Salon Spa | silverstonesalonspa.com | Hartselle, AL | Salon | Independent | yes | SalonBiz |
| 74 | Cutting Edge Hair Salon | cuttingedgearab.com | Arab, AL | Salon | Independent | yes | phone / form only |
| 75 | Kelly's Salon | kellyssalonarab.com | Arab, AL | Salon | Independent | yes | phone / form only |
| 76 | The Barber Shop | thebarbershoptn.com | Murfreesboro, TN | Barber | Independent | yes | phone / form only |
| 77 | Hair Cuttery | haircuttery.com | National | Salon | Chain/franchise | yes | DaySmart, chain check-in app |
| 78 | The Gents Place | thegentsplace.com | National | Barber | Chain/franchise | yes | Meevo |
| 79 | Mr. Haircut | mrhaircut.wixsite.com/mrhaircut | Athens, GA | Barber | Independent | yes | phone / form only |
| 80 | Wheelhouse Salon | wheelhousesalon.com/huntsville | Huntsville, AL | Salon | Regional (multi-location) | no (fetch failed or bot check) | not counted |
| 81 | Alchemy Hair Lab | alchemyhairlabdothan.com | Dothan, AL | Salon | Independent | no (fetch failed or bot check) | not counted |
| 82 | Kutz by Greg | kutzbygreg.com | Hattiesburg, MS | Salon | Independent | no (fetch failed or bot check) | not counted |
| 83 | Barbers & the Salon | barbersandthesalon.com | Athens, GA | Both | Independent | no (JS-only page, no readable HTML) | not counted |
| 84 | Missy's Hot Kuts | missyshotkuts.net | Cookeville, TN | Salon | Independent | no (JS-only page, no readable HTML) | not counted |
| 85 | RK Barber Shop | rkbarbershop.com | Murfreesboro, TN | Barber | Independent | no (JS-only page, no readable HTML) | not counted |
| 86 | El Barrio Barbershop | elbarriobarbershop.com | Greenville, SC | Barber | Independent | no (JS-only page, no readable HTML) | not counted |
| 87 | Great Clips (Cullman location page) | salons.greatclips.com/us/al/cullman/1839-patriot-way-sw | Cullman, AL | Both | Chain/franchise | no (JS-only page, no readable HTML) | not counted |
| 88 | Roosters Men's Grooming Center | roostersmgc.com | National | Barber | Chain/franchise | no (JS-only page, no readable HTML) | not counted |
| 89 | Drybar | drybarshops.com | National | Salon | Chain/franchise | no (JS-only page, no readable HTML) | not counted |
| 90 | Supercuts | supercuts.com | National | Both | Chain/franchise | no (JS-only page, no readable HTML) | not counted |
| 91 | King's Barber Lounge | kingsbarberlounge.com | Murfreesboro, TN | Barber | Independent | no (fetch failed or bot check) | not counted |
| 92 | 18\|8 Fine Men's Salons | eighteeneight.com | National | Barber | Chain/franchise | no (fetch failed or bot check) | not counted |

---

## 3. Pages

### What appears in the menus (link labels on the home page, N = 79)

| Page / link | All | Barber (33) | Salon (42) | Notes |
|---|---|---|---|---|
| Book / Appointments | 64/79 | 28/33 | 32/42 | Usually an external link, sometimes a page that lists per-person links |
| Contact / Location / Visit | 62/79 | 29/33 | 30/42 | |
| Services / Menu / Prices | 52/79 | 18/33 | 32/42 | Barbers often put the menu on the home page instead of a separate page |
| About / Our story | 49/79 | 16/33 | 30/42 | |
| Team / Stylists / Barbers | 41/79 | 15/33 | 24/42 | |
| FAQ / Policies / New clients | 31/79 | 10/33 | 19/42 | Pattern match, includes "policy" and "new guest" links |
| Shop / Products | 25/79 | 7/33 | 16/42 | Mostly links to an outside store or the booking tool's store |
| Gallery / Portfolio | 24/79 | 9/33 | 13/42 | |
| Careers / Join the team / Booth rental | 23/79 | 6/33 | 14/42 | |
| Spa / Nails / Lashes / Skin | 21/79 | 4/33 | 17/42 | Salons that are also day spas |
| Reviews / Testimonials | 12/79 | 6/33 | 6/42 | |
| Blog / News | 12/79 | 4/33 | 6/42 | Rarely kept up to date |
| Gift cards | 11/79 | 2/33 | 8/42 | |
| Extensions (own page) | 10/79 | 0/33 | 10/42 | |
| Bridal / Weddings / Events | 5/79 | 1/33 | 4/42 | Plus 13/79 that mention bridal work in the text |

The median home page has about 320 words and 14 distinct link labels. These sites are short, unlike contractor sites.

### Recommended page set for our template

**One long home page with anchor links is the right default.** The best small-town examples (Adams in Jonesboro,
The Barber Shop in Murfreesboro, Vanzant in Tupelo, North Shore in Chattanooga, Jessica Eads in Jasper) put almost everything on one
scrolling page, with a short menu that jumps to sections. On a phone, the visitor wants three things: book, see the price, find the shop.
Extra pages slow that down. Our clients start with no site and limited content, so a 6-page shell would mostly be empty.

Required (all on the home page as anchored sections):
1. Hero with Book and Call
2. Services and prices (`#services`)
3. Team (`#team`), if more than one person; for a one-person shop, fold this into About
4. Gallery (`#work`)
5. Reviews (`#reviews`)
6. About / our story (`#about`)
7. Visit: hours, address, map link, parking note (`#visit`)

Optional separate pages, generated only when the data exists:
- **/services**: the full menu when it has more than about 15 items (common for full-service salons and day spas). The home page
  then shows the top 6 categories with a link.
- **/team/<name>**: per-person pages for shops with 4+ people who each have their own booking link and portfolio.
  These pages also help SEO for "<stylist name> hair" searches.
- **/new-clients** or **/policies**: booking, cancellation, deposit and late policies, plus what to expect at a first visit. Salons need
  this more than barbers (new-client copy on 8/42 salons vs 1/33 barbers).
- **/bridal**: only when the owner offers wedding or event hair (13/79 mention it).
- **/careers**: hiring or booth/suite rental (25/79 mention it). A short section or page with a contact link, not a form.
- **/gift-cards**: a page or section that links to the booking tool's gift-card page (Square, Vagaro, GlossGenius and Booksy all sell them).

Skip by default: blog (rarely maintained), a full product store, and separate "spa" sub-sites.

---

## 4. Home page section order

Pieced together from the 13 page reads plus the heading sequences of all 79 home pages. The order below is the common
pattern on the stronger sites. It also matches what a phone visitor needs first.

| # | Section | Seen on stronger sites | Notes |
|---|---|---|---|
| 1 | Header: logo or name, Book button, Call icon, menu | Nearly all | Barber sites often put the phone in the header bar |
| 2 | Hero: shop name + city, one-line positioning, Book + Call buttons, walk-in or appointment badge | Nearly all | The better ones show the rating ("4.9 on Google, 300+ reviews") right in the hero |
| 3 | Quick facts strip: today's hours / open now, address with a directions link, walk-ins status | Several barber sites | Vanzant, The Barber Shop TN and Midtown put hours or walk-in rules high up |
| 4 | Services and prices | Barbers: usually 2nd or 3rd. Salons: category cards with a link | Name, starting price, duration, one-line description |
| 5 | Gallery of work | Common | 6-12 photos in a grid, with a link to Instagram |
| 6 | Team cards | Common | Photo, name, role, specialties, own Book button |
| 7 | Reviews | About a third | Rating summary, 3-5 short quotes, a "read all on Google" link |
| 8 | About / story, values, products used | Common | Often includes founding year, family-owned, licensed |
| 9 | New clients / policies / consultation prompt | Salons | "Not sure what to book?" guides were among the most useful patterns seen |
| 10 | FAQ | Few (7/79) | Walk-ins, kids, parking, payment, late policy |
| 11 | Visit: hours table, address, map, parking | Most | |
| 12 | Final call to action: Book + Call | Common | |
| 13 | Footer: NAP, hours, social links, booking link, gift-card and careers links | All | |

**Above the fold on a phone (about 390x750 px):** the shop name and city, a one-line description, the **Book** button (full width),
a **Call** button, and one trust line (Google rating and review count, or a founding year). For barbershops, add a small "Walk-ins
welcome" or "By appointment" badge. The hero photo should be a real photo of the shop or the work, cropped short (no taller than about 55% of
the screen) so that the buttons stay visible without scrolling.

**Variant differences:**
- *Barbershop*: hero, services with prices, team with per-barber booking, gallery, reviews, visit. Price list early.
- *Salon*: hero, service categories (cuts, color, blonding, extensions, treatments, bridal), "not sure what to book / new client"
  block, team, gallery, reviews, about, visit. Prices shown as "from $X" or on a linked menu.

---

## 5. Features and calls to action

### Primary and secondary CTA

- **Primary: Book.** The label is "Book now" or "Book online". It links to the shop's booking URL and opens in a new tab. If the shop has no booking
  tool (12/79 had neither a `tel:` link nor a detectable booking link), the primary CTA falls back to **Call**.
- **Secondary: Call** (tap-to-call), and **Text** when the owner says the number accepts texts. Pageboy and Element both offer a text
  option. Text is common with small-town stylists who work alone.
- **Tertiary: Directions** (opens Google or Apple Maps).
- **Walk-in shops** (barbers mostly): the primary CTA can be **Call** or **Directions**, with a visible "Walk-ins welcome" badge and the
  walk-in rules (for example, last walk-in time). Midtown publishes a cutoff before closing time, which is a good pattern.

### Must-have (template always renders)

| Feature | Frequency seen | Why |
|---|---|---|
| Book CTA in header and hero | 67/79 have book-style CTA text | The main conversion |
| Tap-to-call link | 49/79 | Fallback and phone-first users |
| Street address | 68/79 | NAP and directions |
| Hours | 29/79 list 3+ weekdays on the home page | Under-done in the sample. We always show it |
| Map or directions link | 47/79 (34/79 embed a map) | We use a static map image plus a link, not an iframe |
| Services list | 52/79 have a services link. Prices on home page 13/79 | Barbers: show prices. Salons: show "from" prices |
| Social links (Instagram, Facebook) | Instagram 56/79, Facebook 66/79 | Instagram is the portfolio |
| Team section | 42/79 have a team link | People book people |
| Walk-in / appointment policy | Walk-ins mentioned on 19/79, appointment-only on 9/79 | Answers the most common question |

### Nice-to-have (rendered when the data exists)

| Feature | Frequency | Notes |
|---|---|---|
| Per-person booking buttons | Verified on 5 barbershops (North Shore, Wildwood Reserve, The Open Blade, Barber Lab, LudaBlends) | Each barber card links to their own Square, Squire or Booksy page |
| Reviews section | 26/79 | See trust signals |
| Gallery | 24/79 have a gallery link, 28/79 mention gallery or portfolio | Owner photos only on published sites |
| Gift cards | 13/79 (salons 10/42) | Link to the booking tool's gift-card page |
| Careers / booth or suite rental | 25/79 | Short section with a contact link |
| Product brands carried | 12/79 name a brand (Aveda 4, Redken 2, Kevin Murphy 2, others once) | Logo-free text list is fine |
| New-client or "not sure what to book" guide | New-client copy on 9/79, consultation on 13/79 | Strong for salons |
| Policies (cancellation, no-show, deposit, late) | 9/79 on the home page. Deposits 3/79 | Short, friendly, linked from the booking button area |
| Kids cuts, senior or military pricing | Kids 19/79, senior or military 6/79 | Popular in small towns |
| FAQ | 7/79 | Doubles as SEO content |
| Bridal / event hair | 13/79 (11/42 salons) | Optional page |
| Early-bird or after-hours slots | Seen on 2 barbershops (Adams, Vanzant) | Premium-priced option, by request |
| Buy now, pay later | 1/79 (GlossGenius users get this from the platform) | Mention only if the tool offers it |
| Email or text club sign-up | 11/79 | Skip on static sites unless the booking tool hosts it |

### Trust signals

Seen, from most to least common: years in business, founding year or family ownership (25/79). Reviews or testimonials (26/79).
Clean and sanitized shop (16/79, mostly barbers at 11/33). Awards or "voted best" (14/79). Master barber or stylist levels (13/79).
Licensed (8/79). Chamber of commerce membership (seen on Midtown). Press features (seen on Element). Named product lines (12/79).
Recommended for the template: a Google rating line with a link (see the compliance note in section 8), the founding year,
"licensed master barber" or "licensed cosmetologist" when true, a team photo, and 3 owner-approved testimonials.

---

## 6. Third-party integrations

### Booking tools seen on home pages (N = 79; a site can show more than one)

| Tool | Sites | Mostly | How it was linked |
|---|---|---|---|
| Square Appointments | 8 | Barbers (6) | Link to a `square.site` or `book.squareup.com` page, often one per barber |
| Squire | 6 | Barbers (6) | Link to the shop's Squire page. Popular with barbershops in TN, AL and SC |
| Vagaro | 6 | Salons (5) | Link to the shop's Vagaro page |
| GlossGenius | 4 | Salons (3) | Link to `<name>.glossgenius.com`. One shop's whole "site" was its GlossGenius page |
| Phorest | 4 | Salons | Link out, sometimes from several buttons |
| Wix Bookings | 4 | Wix sites | Built into the builder |
| Booksy | 3 | Barbers | Link to the Booksy profile. Booksy profiles dominated Cullman search results |
| SalonBiz | 2 | Salons | Link out |
| Mangomint, Boulevard, Goldie, DaySmart | 2 each | Mixed | Link out |
| theCut, SalonUltimate, Booker, Zenoti, Meevo, Thryv, MySalonOnline | 1 each | Mixed | Link out |
| Chain check-in apps (Sport Clips, Hair Cuttery) | 2 | Chains | Online check-in or waitlist, not appointments |
| Linktree as the "Book" target | 2 | | An extra hop. Avoid |
| Jotform request form as "booking" | 2 | | A request, not a booking. Acceptable only as a fallback |

Not seen on any home page in this sample: Fresha, Schedulicity, StyleSeat, Acuity or Calendly. But Fresha and StyleSeat
listings did show up in local searches (Jasper, Arab), so we should support them anyway.

**How they are embedded.** Almost every site **links out** to the booking tool, usually in a new tab. A few use the builder's own
booking module (Wix). I saw no site that embedded a full booking iframe in its home page. Link-out is the norm and the right
call for static sites.

**Other integrations seen:** Instagram links (56/79) and live Instagram feed widgets (16/79, mostly salons at 12/42). Google review
widgets (5/79, for example a "verified Google reviews" carousel). Map iframes (34/79). Product stores (Shopify, or the booking tool's store).
Gift cards through the booking tool. Chat widgets (Vanzant offers call, chat and book in one bar).

### What our template should support (sites stay static)

1. **`booking.url`** (one per shop) and **`staff[].booking_url`** (optional, per person). Any https URL is accepted. Detect the platform by
   domain to pick the button label and an optional small "Book on Square/Vagaro/..." note. Known domains: `square.site`,
   `book.squareup.com`, `getsquire.com`, `booksy.com`, `vagaro.com`, `glossgenius.com`, `fresha.com`, `styleseat.com`,
   `schedulicity.com`, `phorest.com`, `joinblvd.com`/`boulevard.io`, `mangomint.com`, `thecut.co`, `heygoldie.com`,
   `calendly.com`, `acuityscheduling.com`.
2. **Optional embed** only for tools that offer a simple, supported embed (Square's booking widget, Vagaro's widget, Booksy's
   widget). Load it on a dedicated `/book` page, after a tap, never on the home page. Default is link-out.
3. **`gift_cards.url`**: link to the tool's gift-card page.
4. **`shop.url`**: link to an external product store if the owner has one.
5. **Instagram**: a profile link and the handle. **No live feed** on published sites. The gallery uses owner-uploaded photos (optionally
   picked from their Instagram by the owner during review).
6. **Google**: a "See our reviews on Google" link and a "Leave a review" link built from the Place ID. Directions links go to Google
   Maps or Apple Maps. No Google Maps iframe by default (heavy, cookie-laden). Use a static map image or a plain link.
7. **Text messaging**: an `sms:` link when the owner confirms the number accepts texts.

---

## 7. Mobile behavior

- **Sticky bottom action bar.** I confirmed this in the HTML of 4 sites (Vanzant: Call, Chat and Book; Creative Touch: a fixed
  CTA bar; The Barber Shop TN: a click-to-call bar; Grissom: a builder bar with phone and location). Five more have floating
  buttons. Static detection under-counts this, but it is the single most useful mobile pattern. **Template: a fixed bottom bar with
  Book | Call | Directions** (Book first; for walk-in shops without booking, Call | Directions | Hours). Respect the
  `safe-area-inset-bottom`, keep it at least 56px tall, and hide it when the on-screen keyboard is open.
- **Tap-to-call and tap-to-text** everywhere a number appears. Never show the number as an image.
- **Short header**: logo or name, Book button, and a menu icon. The menu is a full-screen overlay with 5-7 anchor links. Avoid
  mega-menus. The spa-heavy sites with 40-86 link labels (Society, Southern Chic, Rituals) are hard to use on a phone.
- **Service list as accordions or cards.** Category headers collapse. Each item shows name, "from" price and duration on one or two
  lines. Barbers' short menus can stay fully expanded.
- **Team as a horizontal swipe row or a 2-column grid** with square photos, name, role and a Book button under each.
- **Gallery: a 2- or 3-column grid** of square thumbnails, lazy-loaded, opening a simple lightbox. Cap it at 12 images on the home page.
- **Images**: serve responsive WebP or AVIF at 2-3 sizes. The hero is under about 200 KB on mobile. Never inline base64 images (one sample
  site shipped 1.27 MB of HTML because of them).
- **Hours**: show "Open now · closes 6 PM" (computed with a small script, with the full table as the no-JS fallback) above the full table.
  Highlight today.
- **Maps**: a directions button, not an embedded map that traps scrolling.
- **Accessibility**: 44px minimum tap targets, good contrast on photo overlays (a scrim behind hero text), and alt text on gallery
  images ("Balayage on long dark hair", not "image1").

---

## 8. Content the AI must write

The AI writes **only what can't be wrong about the business**, or drafts copy that the owner confirms. Facts such as prices, policies, licenses,
awards and years come from the owner or from Places, never from the model. The tone is warm, plain and local: first person plural
("we"), short sentences, no hype words, no invented superlatives. Barbershop copy can be a bit more casual. Salon copy is a bit more polished.

| Section | Copy needed | Length | Notes |
|---|---|---|---|
| Hero | One-line positioning under the name | 6-12 words | Say what the shop does and for whom ("Classic cuts, fades and beard work in downtown Cullman"). No "best in town" unless the owner supplies an award |
| Hero badge | Walk-in / appointment line | 2-5 words | From owner data ("Walk-ins welcome", "By appointment") |
| Services intro | One short sentence | 10-20 words | Optional |
| Service descriptions | One line per service | 8-20 words each | Describe what is included (wash, hot towel, razor line-up, toner, consult). Never invent a price or duration |
| Salon category blurbs | Cuts, color, blonding, extensions, treatments, bridal | 20-40 words each | Only for categories the owner offers |
| "Not sure what to book?" helper (salons) | 3-6 goal-based options mapped to services | 15-30 words each | Built from the owner's menu. Strong pattern from Jessica Eads and Society |
| Team bios | Per person: role line + 2-3 sentence bio + specialties tags | 40-70 words | Drafted from owner notes (years cutting, specialties, fun fact). The owner approves each one |
| About / story | Who runs the shop, since when, what it's like inside | 80-150 words | Owner facts only: founding year, family, hometown ties |
| New clients / policies | What to expect at a first visit, and a friendly summary of the cancellation and late policy | 60-120 words | Policy terms come from the owner word-for-word. The AI only smooths the wording |
| FAQ | 4-6 Q&As (walk-ins? kids? parking? payment types? how early to arrive? do you do X?) | 25-50 words per answer | Answers come from owner data. Skip a question if there is no data |
| Reviews intro | One line | 5-12 words | Plus the testimonials the owner picks or supplies (not Google review text) |
| Visit | Parking or landmark line | 10-25 words | "Behind the courthouse, free parking out front" style. From the owner |
| Careers | A short hiring or booth-rental note | 30-60 words | Only if the owner turns it on |
| SEO | Title, meta description, image alt text | See section 11 | Generated from the data |

**Inputs the AI may use for context only (not quoted):** Google review text (themes such as "great with kids" or "fast fades" can steer
the tagline and bios, but no quotes, names or star claims), the Places category, and the business name.

**Source split:**
- **Google Places**: name, formatted address, location (lat/lng), phone, regular opening hours, primary type
  (`hair_salon`, `barber_shop`, `beauty_salon`), rating and review count, Google Maps URI, business status, Place ID,
  and photos (**preview only**; they must be swapped out before publish).
- **Owner (required before publish)**: services with prices and durations, booking URL(s), walk-in or appointment policy, staff list,
  photos, and confirmation of hours and phone.
- **Owner (optional)**: founding year, licenses, awards, brands carried, policies, gift-card URL, Instagram or Facebook handles,
  text-capable number, parking note, payment methods (some small-town shops are cash-only, which is worth stating), special closures
  (one Athens shop closes on home football game days), senior, military or kids pricing.
- **AI**: tagline, descriptions, bios (drafts), about (draft), FAQ wording, meta.

---

## 9. Data model

`R` = required to publish, `O` = optional. Source: `P` = Google Places, `A` = AI-written (owner reviews), `W` = owner-supplied, `D` = derived.

```
business
  place_id                 R  P   stored indefinitely (allowed)
  name                     R  P   owner may correct spelling or casing
  kind                     R  P/W salon | barber | both   (from primaryType, owner confirms)
  tagline                  R  A
  phone                    R  P   owner confirms; one number used everywhere
  sms_enabled              O  W   true = show "Text us"
  email                    O  W
  address{street,city,state,zip}  R  P
  geo{lat,lng}             R  P
  maps_url                 R  P/D directions link
  service_area_towns[]     O  W   e.g. Hanceville, Vinemont, Good Hope (one line, no doorway pages)
  parking_note             O  W
  hours[]{day,open,close}  R  P   owner confirms; refresh before publish
  special_closures[]       O  W   holidays, game days, vacations
  walk_in_policy           R  W   walk_ins_welcome | appointment_only | both ; + walk_in_cutoff_minutes (O)
  founded_year             O  W
  licenses[]               O  W   "Licensed master barber", "Licensed cosmetologist"
  awards[]                 O  W   text + year; never AI-generated
  payment_methods[]        O  W   cash, card, Apple Pay, Venmo...
  price_range              O  D   from the services
  languages[]              O  W   e.g. Spanish (enables a short Spanish blurb and a hreflang page later)

booking
  url                      R* W   *required unless walk-in only; any https URL
  platform                 D      detected from the domain (square, squire, booksy, vagaro, glossgenius, fresha, ...)
  embed_allowed            O  W   default false (link-out)
  new_client_url           O  W   some shops use a separate new-guest link or form
  gift_cards_url           O  W
  shop_url                 O  W

services[]                 R  W   at least 3
  category                 R  W   e.g. Cuts, Color, Blonding, Extensions, Treatments, Beard & Shave, Kids, Bridal, Spa
  name                     R  W
  price                    O  W   number, or {from: n} or {min,max}; may be hidden for "consult" services
  price_note               O  W   "varies by length", "consult required"
  duration_min             O  W
  description              O  A
  featured                 O  W   shows on the home page when the menu is long

staff[]                    O  W
  name, role               R  W   e.g. Owner / Master Barber, Senior Stylist, Apprentice
  photo                    R  W   owner-supplied only
  bio                      O  A
  specialties[]            O  W
  booking_url              O  W
  instagram                O  W

media
  hero_image               R  W/stock/AI   Google photos allowed in the preview only
  gallery[]                O  W   6-12 images, each with alt text (A) and an optional caption
  logo                     O  W   fall back to a typographic wordmark

reputation
  google_rating            O  P   display only with Google attribution, refreshed on each publish (see section 11)
  google_review_count      O  P
  google_reviews_url       R  D   from place_id
  testimonials[]           O  W   {text, first_name_or_initial, source}; owner-supplied or owner-approved, never Google text

policies
  cancellation             O  W
  late_arrival             O  W
  deposit                  O  W
  new_client_notes         O  A/W

social
  instagram, facebook, tiktok   O  W

extras
  faq[]{q,a}               O  A/W
  careers{enabled, text, contact}  O  W/A
  brands_carried[]         O  W
  discounts[]              O  W   kids, seniors, military, first visit
  early_late_slots         O  W   by-request premium hours

site
  look                     R  D   one of the four looks, chosen so neighbors differ
  accent_override          O  W
  status                   R  D   new | shown | sold | live
```

---

## 10. Design looks

Four original looks, each built from shared components but with its own type, color, shape language and photo treatment.
The generator should assign looks so that two shops within ~5 miles, or in the same category on the same street, never share one.
Any look works for either variant. The "best for" column is only the default.

| | 1. Porch Light | 2. Night Shift | 3. Main Street | 4. Color Bar |
|---|---|---|---|---|
| **Best for** | Salons, solo stylists, small studios | Modern barbershops, men's grooming | Classic barbershops, family salons, "barber & beauty" | Color, blonding and extension specialists, younger clientele |
| **Mood** | Warm, calm, welcoming, like a friend's front room | Sharp, confident, after-dark, precise | Hometown, trustworthy, a bit nostalgic, busy and friendly | Bright, playful, bold, current |
| **Palette** | Linen `#F7F1E8` (background), warm clay `#A05A45` (buttons, white text 5.2:1), sage `#5E6B52` (accents and links), cocoa `#2E2420` (text), soft sand `#E8D9C4` (cards) | Near-black `#121212` (background), graphite `#232323` (cards), bone `#EEE9E0` (text), brass `#C9A227` (buttons, with dark text), steel `#8A9199` (muted) | Paper `#F4EFE4` (background), navy `#1E3A5F` (headings, buttons), brick `#A63D2F` (accent), cream `#FFF9EE` (cards), ink `#1B1B1B` (text) | Warm white `#FFFBF5` (background), deep plum `#3D1F3A` (text, footer), coral `#F26B5B` (buttons, with plum text), butter `#F5D27A` (highlights), mint `#A8D5C2` (tags) |
| **Google Fonts** | Fraunces (headings, soft optical sizes) + Karla (body) | Oswald (uppercase condensed headings) + Inter (body) | Zilla Slab (headings) + Libre Franklin (body) | DM Serif Display (headings) + DM Sans (body) |
| **Photo style** | Natural window light, warm grade, close-ups of texture and hands, plants and wood in the shop | High contrast, cool or desaturated grade, side-lit fades, razor and line-up detail, dark backgrounds | Candid and documentary: chairs, storefront, regulars, kids' first cut, slight warm film tone | Saturated, clean backdrops, before/after pairs, color swatches, strong crops |
| **Layout feel** | Airy spacing, rounded corners (16px), arch-shaped masks on hero and team photos, centered hero text, services as soft cards | Full-bleed dark bands, sharp corners, thin brass rules, a big tabular price list with dot leaders, left-aligned hero | Boxed sections with ruled borders, menu-board price list, a "Since 19XX" seal badge, a single striped divider used once (no barber-pole clip art) | Asymmetric grid, overlapping image cards, pill tags for specialties, CSS-only before/after slider, sticker-style badges |
| **Buttons** | Pill buttons in clay, sage outline secondary | Square buttons in brass, bone outline secondary | Rectangular navy buttons with a 2px offset shadow | Pill buttons in coral, plum outline secondary |
| **Sticky bar** | Linen bar, clay Book button | Black bar, brass Book button | Navy bar, cream text | Plum bar, coral Book button |

Contrast notes (checked): cocoa on linen 13.5:1, bone on near-black 15.5:1, ink on paper 15:1, plum on warm white 14:1. Put dark text on the brass and coral buttons: near-black on brass is 7.7:1 and plum on coral is 4.8:1, while white text fails on both (2.4:1 and 3.0:1). Lighter clay or sage tints are for decoration only, not text. Use a 40-60% dark scrim
behind any hero text set over a photo. Check every pair against WCAG AA (4.5:1 for body text) at build time.

---

## 11. Local SEO

**Schema.org type.** Use **`HairSalon`** (a subtype of `HealthAndBeautyBusiness`) for salons **and** for barbershops.
schema.org has **no `BarberShop` type**; one sample site used it anyway, which makes the markup invalid. Use `BeautySalon` only for
shops whose main business is broader beauty services (nails, lashes, skin) with hair as a side line, and `DaySpa` as an additional type for
salon-spas. Only 5/79 sample sites used a specific type, and 30/79 used any local-business type, so this is an easy edge.

JSON-LD on the home page:
- `@type: HairSalon`, `name`, `url`, `telephone`, `image`, `logo`, `priceRange`
- `address` (`PostalAddress`), `geo` (`GeoCoordinates`), `hasMap` (the Google Maps URL)
- `openingHoursSpecification` matching the visible hours exactly
- `sameAs`: Instagram, Facebook, the booking-platform profile and the Google Maps URL
- `potentialAction`: `ReserveAction` whose `target` is the booking URL
- `hasOfferCatalog`: an `OfferCatalog` of `Offer` → `Service` entries with `price` / `priceCurrency` where the owner gave prices
- `employee`: `Person` entries for staff with their own pages (optional)
- `areaServed`: the town list (optional)
- **Do not** add `AggregateRating` or `Review` built from Google reviews. It is third-party data, and Google does not show stars for
  self-serving local-business review markup anyway.

**Titles and meta (patterns, with ST as the state abbreviation):**
- Barbershop title: `{Name} | Barbershop in {City}, {ST}` or `{Name} – Haircuts, Fades & Beard Trims | {City}, {ST}` (max about 60 characters)
- Salon title: `{Name} | Hair Salon in {City}, {ST}` or `{Name} – Cuts, Color & Extensions | {City}, {ST}`
- Meta description: `{Name} in {City}, {ST}: {top 2-3 services}. {Walk-ins welcome | Book online}. Call {phone}.` (max about 155 characters)
- One H1: `{Name}`, with `{category} in {City}, {ST}` as the line under it (in the H1 or directly below it). The sample had 13/79 with no H1 and
  19/79 with several.
- Staff pages: `{Person} – {Role} at {Name} | {City}, {ST}`.
- Services page: `Services & Prices | {Name}, {City}, {ST}`.

**NAP consistency.** Name, address and phone must match the Google Business Profile character for character, with one phone number
everywhere. The local searches turned up conflicting data for Cullman shops: one barbershop had two different phone numbers in two
directories, and another had two different street addresses. The publish step should show the owner the Places data next to our site
data and flag any difference. Tell the owner to set the site as the **Website** and the booking tool as the **Appointments link** on their
Google Business Profile.

**Category-specific points:**
- Put service words people search for in headings and service names: "fade", "beard trim", "kids haircut", "balayage",
  "highlights", "extensions", "bridal hair", "men's haircut", "hot towel shave".
- Image alt text should describe the style ("skin fade with beard line-up"), which helps image search, where hair searches are common.
- Mention nearby towns once in the Visit section ("Clients come from Hanceville, Vinemont and Good Hope"). Do not generate per-town pages.
- Per-stylist pages rank for stylist-name searches. Generate them only when there is a real bio, photo and booking link.
- Google rating display: rating and review count come from Places, which has caching limits. If shown, it carries Google
  attribution and is refreshed every time the site is republished (or loaded live from our Worker). The safe default is a "Read our
  reviews on Google" link with no number. Check this against the Places terms when building.
- Add `noindex` to previews (already a project rule). Add `sitemap.xml`, a canonical URL, and Open Graph tags with the hero image (shares
  in Facebook groups are a big local channel).

---

## 12. Anti-patterns

Seen in the sample. Our templates must avoid all of these.

1. **Leftover template content.** One salon's home page included whole sections and a second footer for an unrelated solar company, plus
   placeholder text and a sample email address. *Template rule: no lorem ipsum or demo content can survive a build. Fail the build on known
   placeholder strings.*
2. **Book buttons that go nowhere.** Four sites had "Book" links pointing to a bare `#`. These may open a script pop-up that a plain HTML reader cannot see, but they fail without JavaScript. Two sent "Book" to a Linktree page and two to a request form. *Rule: Book always points at a real
   booking URL, a `tel:` link, or a `/book` page that lists per-person links.*
3. **No tap-to-call** (30/79) and **phone buried at the bottom** (41 of the 59 pages that print a number put it below the first quarter of the page).
4. **Hours missing or inconsistent.** Only 29/79 list hours on the home page. One site listed different hours in its sidebar and its footer.
   Another said only "posted business hours". *Rule: one hours source, rendered in one component, reused everywhere.*
5. **Inconsistent staff info.** One shop's menu listed five barbers, its staff section named four, and it spelled one name differently.
   *Rule: staff come from one list.*
6. **No prices anywhere visible** (60/79 have no price on the home page). Salons often have a reason (consult-based pricing). Then say
   "from $X" or "priced at consultation" rather than hiding the menu entirely.
7. **Heading chaos.** 13/79 have no H1 and 19/79 have several. One site had 20 H1s because every team member's name was an H1.
8. **Heavy pages.** 15/79 home pages ship more than 500 KB of HTML and 3 ship more than 1 MB, mostly from builder bloat and inlined base64 images.
9. **JavaScript-only sites.** 4 independents and 4 chain pages returned essentially empty HTML without JavaScript. Search
   engines and link previews may see nothing. *Rule: static HTML with all content in the markup.*
10. **Live Instagram feeds and review widgets** (16/79 and 5/79). They add third-party scripts, break when tokens expire, and can show
    an empty box. *Rule: static gallery plus profile link.*
11. **Mega-menus and service sprawl.** Spa-salon sites with 40-86 link labels repeat the same services in the menu, cards, a second list and the footer.
12. **Text baked into images, letter-spaced headings** (two sites spelled their name with spaces between every letter, which screen readers
    read letter by letter), and cursive script fonts for body text.
13. **Stale signals**: old copyright years, an "under construction" heading on a live site, and blog sections with old posts. *Rule: the
    copyright year is generated, and there is no blog by default.*
14. **Missing meta descriptions** (26/79) and **invalid or missing schema** (49/79 have no local-business type; one used a type that does not exist).
15. **Map iframes that trap scrolling** on phones (34/79 embed one). Use a button instead.
16. **Claims without proof**: "best salon in town" or "#1 barbershop" headlines with no source. Use a real award (with year) or the
    Google rating link instead.
