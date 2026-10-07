# Category blueprint: Cleaning services (residential and commercial)

Researched October 2026 for the Cullman, AL starting market. One template covers house cleaning/maid services and small
commercial/janitorial cleaners. Residential is the default mode; a commercial mode swaps a few modules (see sections 3 and 5).

**Method.** I found candidates through organic searches such as "house cleaning <city>", "maid service <city>" and
"commercial cleaning <city>", with Yelp, Facebook, Angi, Thumbtack, HomeAdvisor, Porch, Expertise, Care.com and similar
directories blocked. Cities covered: Cullman, Huntsville/Madison, Decatur, Florence/Muscle Shoals, Gadsden/Guntersville,
Tuscaloosa, Auburn/Opelika, Dothan, Mobile and Birmingham (AL); Chattanooga, Knoxville, Johnson City, Cookeville and
Murfreesboro (TN); Hattiesburg, Oxford and Tupelo (MS); Athens and Columbus (GA); Jonesboro and Northwest Arkansas (AR);
Bowling Green (KY); Greenville/Spartanburg (SC); Lafayette (LA); Tyler and Waco (TX); Asheville and Wilmington (NC);
Springfield (MO). I added 7 national or regional franchises (mostly their Huntsville pages) for feature ideas only.

I downloaded each home page's HTML with a phone user-agent and ran a script over it. The script counted `tel:`/`sms:` links,
forms, schema.org types, third-party scripts and embeds, link labels, heading order, and keywords in the visible text. For 46
sites I also downloaded the first "Book / Quote / Pricing" page the home page linked to, to identify the booking or quote tool.
I opened 6 sites with a page reader for above-the-fold and section detail (Heaven Scent, Platt, Valley Clean Team, Creeky Clean
pricing, Queen City Maids, Nest Maid Fresh).

**Bases for the numbers.**
- **N = 69** home pages downloaded successfully (62 independents or regionals, 7 franchises). Used for link, tool, schema and
  technical counts.
- **N = 60** of those have 300+ words of server-rendered text. Used for keyword/content counts, because the other 9 are
  JavaScript-rendered or nearly empty and would undercount.
- Counts are from **home pages only** unless stated. A feature that lives only on an inner page is missed, so true frequencies are
  somewhat higher. Keyword counts are pattern matches: treat them as close estimates (roughly ±2), not exact audits.
  Sticky-bar counts come from CSS class names and are rougher still.

---

## 1. Summary

- **Every site sells the same three things.** Deep cleaning is named on 53/60 pages, move-in/move-out on 52/60 and recurring
  (weekly/biweekly/monthly) on 47/60. One-time cleaning shows up on 37/60, post-construction on 25/60 and Airbnb/short-term-rental
  turnover on 27/60. The template's core is a **3-card service menu: Standard (recurring), Deep, Move-in/Move-out**, with
  optional cards for Airbnb, post-construction and office cleaning.
- **The conversion is a quote, not an instant sale.** "Free quote/estimate" wording is on 39/60 pages and a quote link or button on
  47/69. Only 12/60 claim an instant or online price, and dollar amounts appear on just 10/60 home pages (some are promo amounts,
  not prices). The primary CTA should be **Get a free quote**, with **Call** (or **Call/Text**) as the secondary. When the owner is
  willing, a price range ("from $X" or a band by home size) is a real differentiator. The Cullman site that does this (Heaven Scent)
  is one of the strongest local examples.
- **Trust is the product.** Strangers are coming into the home, so the best sites stack proof: "insured" 41/60, satisfaction guarantee
  34/60, background checks or vetting 28/60, "bonded" 23/60, eco/pet-safe products 28/60, locally owned 23/60, family-owned 15/60.
  Only 15/60 state a concrete re-clean rule (for example "tell us within 24 hours and we come back"). A specific guarantee beats a vague
  one, and our template should make it a structured field.
- **The "What's included" checklist sets the best sites apart.** 20/60 show a room-by-room checklist (kitchen, bathrooms, bedrooms
  and living areas), and the strong ones compare tiers side by side. This answers the #1 buyer question ("what does deep actually mean?")
  and is cheap for us to generate from a standard task list that the owner can tick or untick.
- **Tap-to-call is common but not universal.** 59/69 have a `tel:` link and 39/69 repeat it 3+ times. Only 4/69 offer an `sms:` link,
  even though texting a quote request is natural for this category. A prefilled **Text us** button is an easy edge for our clients.
- **Booking software is a minority feature.** Dedicated cleaning booking or quote engines appear on 21/69 sites: ZenMaid 7, BookingKoala 5,
  Launch27 2, MaidCentral 2, plus single uses of Housecall Pro, Jobber, HouseAccount and two quote-form tools. Most small operators use
  a plain web form or just phone/Facebook. Our clients (no website today) will mostly start with call/text + a simple quote form, so
  the booking link must be optional.
- **Weak sites fail on basics:** JavaScript-only or near-empty home pages (9/69 under 300 words), missing H1 (7/69) or several H1s
  (9/69; one site has 10), no phone link (10/69), 1 MB+ HTML (9/69), leftover template or AI instruction text published as a heading,
  off-topic SEO filler (weather widgets, "things to do in town"), and one identical template reused by three unrelated companies in three
  states. Being correct, fast and distinctive already beats most local competitors.

---

## 2. Sample

Type: **Ind** = independent single-market business. **Reg** = independent company serving several metros. **Chain** = franchise or
national brand (feature ideas only). "Visited directly: yes" = I downloaded the live page myself. "no" = blocked by a bot check or
403, so only search-result snippets were seen; these rows are **not** in any count.

| # | Business | URL | City / State | Type | Visited directly |
|---|---|---|---|---|---|
| 1 | Titan Cleaning Company | titancleaningcompany.com | Cullman, AL | Ind | yes (home page is a JS-only app; analyzed its Cullman page) |
| 2 | Heaven Scent Cleaning Services | heavenscentcullman.com | Cullman, AL | Ind | yes |
| 3 | Rosie Cleans | rosiecleansalabama.com | Huntsville, AL | Ind | yes |
| 4 | Madison Home Clean | madisonhomeclean.com | Huntsville/Madison, AL | Ind | yes |
| 5 | Rocket Maids | therocketmaids.com | Madison, AL | Ind | yes |
| 6 | The Valley Clean Team | thevalleycleanteam.com | Decatur/Florence/Huntsville, AL (+TN) | Reg | yes |
| 7 | Double Duty Commercial Cleaning | doubledutyclean.com | Guntersville/Huntsville, AL | Ind (commercial) | yes |
| 8 | Sweepers Office Cleaning | sweepersofficecleaning.com | Gadsden, AL | Ind (commercial) | yes |
| 9 | The Way Commercial Cleaning | thewaycleaning.com | Huntsville/Birmingham, AL | Reg (commercial) | yes |
| 10 | Alabama Extra Mile | alabamaextramile.com | Tuscaloosa, AL | Ind | yes |
| 11 | A&A Cleaning Co | aacleanco.com | Tuscaloosa, AL | Ind | yes |
| 12 | Unique Cleaning Services | uniquecleaningservices5.com | Tuscaloosa, AL | Ind | yes |
| 13 | Assured Comfort Cleaning | assuredcomfortcleaning.com | Florence/Muscle Shoals, AL | Ind | yes |
| 14 | Auburn Best Cleaning | auburnbestcleaning.com | Auburn, AL | Ind | yes |
| 15 | Polished Oak Cleaners | polishedoakcleaners.com | Auburn, AL | Ind | yes |
| 16 | Top Notch Tidy Services | topnotchtidyservices.com | Auburn, AL | Ind | yes |
| 17 | Mica's Cleaning | micascleaning.com | Auburn, AL | Ind | yes |
| 18 | Helpful Housekeeping | helpfulhousekeeping.com | Dothan, AL | Ind | yes |
| 19 | Zoiris Cleaning Services | zoiriscleaningservices.com | Mobile, AL | Reg | yes |
| 20 | Clean as Can Bee | cleanascanbeee.com | Birmingham, AL | Ind | yes |
| 21 | My Amazing Maid | myamazingmaid.com | Columbus, GA / Auburn, AL | Reg | yes |
| 22 | Nooga Home Cleaning | noogahomecleaning.com | Chattanooga, TN | Ind | yes |
| 23 | Brinco Cleaning Services | brincoclean.com | Chattanooga, TN | Ind | yes |
| 24 | Hero House Cleaning | herohousecleaning.com | Knoxville, TN | Ind | yes |
| 25 | Truly Green Cleaning | trulygreencleans.com | Knoxville, TN | Ind | yes |
| 26 | Creeky Clean | creekyclean.com | Johnson City, TN | Ind | yes |
| 27 | Magdalena's Cleaning | magdalenascleaning.com | Cookeville, TN | Ind | yes |
| 28 | Cumberland Cleaning Company | cumberlandcleaning.com | Cookeville, TN | Ind | yes |
| 29 | Two Sisters Maid to Clean | twosistersmaidtoclean.com | Murfreesboro, TN | Ind | yes |
| 30 | Mama Fer Professional Cleaning | mamafer.com | Hattiesburg, MS | Ind | yes |
| 31 | Oxford Maid Service | oxfordmaidservice.com | Oxford, MS | Ind | yes |
| 32 | Crystal's Cleaning Company | cccoxfordms.com | Oxford, MS | Ind | yes |
| 33 | Kayla's Cleaning Service | kaylascleaningservicellc.com | Tupelo, MS | Ind | yes |
| 34 | Mr. Janitor Inc | mrjanitortupelo.com | Tupelo, MS | Ind | yes |
| 35 | Tidy Team Cleaning Services | tidyteam.biz | Tupelo, MS | Ind | yes |
| 36 | Pure Sweep Cleaners | puresweepcleaners.com | Athens, GA | Ind | yes |
| 37 | Maid Teams | maidteams.com | Athens/Watkinsville, GA | Ind | yes |
| 38 | Hometown Cleaning | yourhometowncleaning.com | Athens, GA | Ind | yes |
| 39 | Apple Cleaning Services | applecleaningservicesar.com | Jonesboro, AR | Ind | yes |
| 40 | The Premium Cleaners | thepremiumcleaners.com | Jonesboro, AR | Ind | yes |
| 41 | A Beautiful Day Cleaning | abeautifuldaycleaning.com | Fayetteville/Bentonville, AR | Ind | yes |
| 42 | Magnolia Maids NWA | magnoliamaidsnwa.com | Northwest Arkansas, AR | Ind | yes |
| 43 | Clean Queen of Bowling Green | cleanqueenbg.com | Bowling Green, KY | Ind | yes |
| 44 | Bowling Green Cleaning Company | bgkycleaning.com | Bowling Green, KY | Ind | yes |
| 45 | Greenville House Cleaning | greenvillehousecleaning.com | Greenville, SC | Ind | yes |
| 46 | DK Cleaning Service | dkcleaningservicellc.com | Spartanburg, SC | Ind | yes |
| 47 | Platt Cleaning Services | plattservicesllc.com | Lafayette, LA | Ind | yes |
| 48 | Lafayette Premier Cleaning | lafayettepremiercleaning.com | Lafayette, LA | Ind | yes |
| 49 | Angelic Touch Cleaning Services | angelictouchcleaningservices.com | Lafayette, LA | Ind | yes |
| 50 | Clean Away 360 | cleanaway360.com | Tyler, TX | Ind | yes |
| 51 | Yellow Rose Maids | yellowrosemaids.com | Tyler, TX | Ind | yes |
| 52 | Sally's Maid Service | sallysmaidservice.com | Waco, TX | Ind | yes |
| 53 | Honeydo Sisters | honeydosisters.com | Waco, TX | Ind | yes |
| 54 | English Maids | englishmaids.biz | Waco/Temple, TX | Ind | yes |
| 55 | Asheville Pristine Clean | ashevillepristineclean.com | Asheville, NC | Ind | yes |
| 56 | Maidwell Cleaning | maidwell.co | Asheville, NC | Ind | yes |
| 57 | Anchor Maids | anchormaidsasheville.com | Asheville, NC | Ind | yes |
| 58 | Nest Maid Fresh | nestmaidfresh.com | Wilmington, NC | Ind | yes |
| 59 | MerMaids Cleaning Co. | mermaidscleaningco.com | Wilmington, NC | Ind | yes |
| 60 | Home-Ade | home-adellc.com | Wilmington, NC | Ind | yes |
| 61 | Queen City Maids | queencitymaids.com | Springfield, MO | Ind | yes |
| 62 | Maid Squad | maidsquadozarks.com | Springfield, MO | Ind | yes |
| 63 | Bear Brothers Cleaning (Cullman page) | bearbroscleaning.com | Huntsville-based, serves Cullman, AL | Chain (regional, multi-state) | yes |
| 64 | Molly Maid of Huntsville, Decatur and Athens | mollymaid.com | Huntsville, AL | Chain | yes |
| 65 | MaidPro Huntsville | maidpro.com | Huntsville, AL | Chain | yes |
| 66 | Merry Maids Huntsville | merrymaids.com | Huntsville, AL | Chain | yes |
| 67 | The Maids (Huntsville) | maids.com | Huntsville, AL | Chain | yes |
| 68 | Home Clean Heroes of Huntsville | homecleanheroes.com | Huntsville, AL | Chain | yes |
| 69 | Two Maids (Tupelo) | twomaidscleaning.com | Tupelo, MS | Chain | yes |
| 70 | Clean State of Mind | cleanstateofmind.com | Athens, GA | Ind | no (bot check) |
| 71 | Green Meadow Cleaning | greenmeadowcleaning.com | Johnson City, TN | Ind | no (bot check) |
| 72 | Local Home Cleaning of Knoxville | knoxhomecleaning.com | Knoxville, TN | Ind | no (bot check) |
| 73 | Davis Cleaning 417 | daviscleaning417.com | Nixa/Springfield, MO | Ind | no (bot check) |
| 74 | C.S.I. Restoration and Cleaning | csi-restorationandcleaning.com | Opelika, AL | Ind | no (403) |
| 75 | The Cleaning Authority Birmingham | thecleaningauthority.com | Birmingham, AL | Chain | no (403) |

Also tried but unreachable: asherscleaning.com (Birmingham) and cluttercleanerschatt.com (Chattanooga) no longer resolve, and
housecleaningincullmanalabama.com and elkingcleaning.com (Cookeville) failed to connect. They count only as evidence for the
"dead or broken domain" anti-pattern.

Totals: 75 listed, **69 visited directly** (62 Ind/Reg + 7 Chain), 6 seen via search snippets only.

---

## 3. Pages

**What appears.** These counts are link labels found anywhere on the home page (nav, body or footer), N = 69. Most sites put
service pages in a "Services" dropdown, so a label count is a good proxy for "has this page".

| Page / link | Sites | Notes |
|---|---|---|
| About | 52/69 | Owner story, team photo, values. Strongest on family/sister/mother-daughter businesses. |
| Contact | 49/69 | Often doubles as the quote form. |
| Quote / Estimate | 47/69 | "Free quote" or "Request estimate" page or anchor. The #1 conversion target. |
| Services (index) | 46/69 | |
| Privacy / Terms / Policies | 41/69 | Footer. Some have real cancellation/breakage policies (see FAQ). |
| Reviews / Testimonials | 39/69 | |
| Move-in/out (own page or label) | 36/69 | |
| Deep cleaning (own page or label) | 34/69 | |
| Blog | 33/69 | Mostly dormant or SEO filler on small sites. |
| Careers / Join our team | 31/69 | Cleaning has constant hiring needs; owners value this. |
| Commercial / Office | 30/69 | |
| Residential / House cleaning | 30/69 | |
| FAQ | 29/69 | FAQ *content* appears on 41/60 home pages. |
| Service areas | 25/69 | Many have one thin page per town. |
| Book / Schedule | 23/69 | Goes to an online booking tool when present. |
| Airbnb / Vacation rental | 19/69 | |
| Pricing | 16/69 | |
| Post-construction | 16/69 | |
| Gift cards / certificates | 15/69 | Gift wording on 17/60 pages. |
| Checklist / What's included | 13/69 | Checklist *content* appears on 20/60 home pages. |
| Gallery / Before-after | 11/69 | |
| Specials / Promotions | 11/69 | |
| Client login / Pay online | 10/69 | Only for sites with booking software. |
| Referral program | 5/69 | |

**Recommended page set for our template**

Required:
1. **Home** (long, anchored single page; see section 4).
2. **Services & pricing**: one page with a card per tier, the "What's included" comparison checklist, add-ons, and price ranges
   if the owner gives them. Each tier also gets an anchor so the home page cards can deep-link.
3. **Get a quote**: form + call + text, plus what happens next (3 steps) and the response-time promise.
4. **About**: owner/team story, photo, years in business, the trust facts (insured, bonded, background checks) stated plainly.
5. **Privacy** (static, generated): required because the quote form collects personal data.

Optional (owner toggles):
- **FAQ** as its own page when it runs to 8+ questions (otherwise it stays a home-page section).
- **Move-out cleaning** standalone page: worthwhile in college towns and rental-heavy areas; it ranks on its own.
- **Commercial / office cleaning** page for mixed businesses. For a commercial-only business, the template's commercial mode makes
  this the home page focus (see section 5).
- **Airbnb / rental turnover** page where short-term rentals matter (lake towns such as Guntersville/Smith Lake near Cullman).
- **Gift cards** (link-out to Square or similar).
- **Careers** (simple "we're hiring" block with apply-by-text/email or a form link).
- **Policies**: cancellation, lockout and breakage terms when the owner has them.

**Single long page vs many pages.** For our clients (one- to ten-person operations with no current site), a long home page with
anchor navigation plus 3-4 real pages works best. The strongest small sites in the sample (Heaven Scent, Platt, A&A, Creeky,
Nest Maid Fresh, Polished Oak) put the full story on one scrolling home page and use inner pages only for pricing detail and the quote.
The median home page runs about **1,000 words** (N = 60). Sites that sprawl into dozens of city pages or 20+ service cards (one lists
solar panels, gutters and gym cleaning next to house cleaning) read as generic and dilute the core offer. **Don't generate per-town
doorway pages.** Use one service-area section with a town list, plus at most one real page per core service.

---

## 4. Home page section order

The typical order on the best residential sites (synthesized from heading sequences on 60 pages and the 6 detailed reads):

1. **Header**: logo/name, phone (tap-to-call), primary button (Get a quote). Hamburger menu on mobile.
2. **Hero**: what + where in one headline (service + town), one supporting line of trust facts (insured, local, since YEAR),
   **two buttons (Get a free quote / Call or text)**, and a compact trust row (star rating link, years, "insured & background-checked").
3. **Trust bar / "why us"**: 3-4 icon points. Common picks: insured/bonded, vetted team, satisfaction guarantee, no contracts,
   we bring supplies, eco/pet-safe.
4. **Services**: 3 primary cards (Standard/recurring, Deep, Move-in/out), plus optional cards. Each card has a one-line description,
   a "best for" note, and either a price range or "Get price".
5. **How it works**: 3 steps (request quote → we confirm price and time → we clean). It appears on 14/60 pages and in nearly every strong one.
6. **What's included**: room-by-room checklist, ideally with a Standard vs Deep vs Move-out comparison.
7. **Reviews**: 3 owner-supplied testimonials + "See our reviews on Google" link.
8. **About/meet the owner**: photo, short story, family/local angle.
9. **Service area**: town list (and a small static map image if wanted; no heavy embed above the fold).
10. **FAQ**: 5-8 questions (pricing, supplies, being home, pets, guarantee, cancellation).
11. **Final CTA band**: repeat Get a quote + Call/Text, plus hours.
12. **Footer**: NAP, hours, service towns, social links, review link, policies, copyright.

Optional slots between 7 and 9: before/after gallery, gift-card promo, careers banner, loyalty/referral program.

**Above the fold on mobile (≈ 360×740 viewport):**
- Business name/logo + a tap-to-call icon in the header.
- Headline naming the service and the town ("House cleaning in Cullman" style, in our own wording per client).
- One trust line (insured · local · since YEAR, or rating link).
- **Get a free quote** button (full width) and **Call** / **Text** buttons side by side under it.
- Keep the hero photo small or as a soft background. The buttons must not be pushed below the fold by a tall image.

On 43/69 pages the first `tel:` link comes before the H1 in the HTML, meaning a phone in the header or top bar. Copy that.

---

## 5. Features and calls to action

**Primary CTA:** *Get a free quote* (form or text). **Secondary CTA:** *Call* (with *Text* alongside). If the owner uses a booking
tool, add *Book online* as a third option and let the owner choose which one is primary.

Must-have (in the template by default):

| Feature | Frequency in sample | Notes |
|---|---|---|
| Tap-to-call phone link | 59/69 (39/69 repeat it 3+ times) | Header, hero, final CTA, footer, sticky bar. |
| Quote request (form or quote page) | quote link 47/69; "free quote/estimate" wording 39/60 | Short form: name, phone, ZIP/town, service type, home size (beds/baths or sq ft), frequency, notes. |
| Service tiers: standard/recurring, deep, move-in/out | deep 53/60, move 52/60, recurring 47/60 | Card per tier, with "best for" guidance. |
| Reviews/testimonials | 50/60 | Owner-supplied text + link out to Google. |
| Service area towns | 44/60 | Named towns, not just "and surrounding areas". |
| FAQ content | 41/60 | |
| Insured statement | 41/60 | Only if the owner confirms it. |
| Hours | 38/60 | From Places, owner-confirmed. |
| Satisfaction guarantee | 34/60 (concrete re-clean rule 15/60) | Structured field: window (24/48 h) + remedy (re-clean free / refund). |
| Background checks / vetted team | 28/60 | Only if true. |
| Eco / pet-safe products | eco 28/60, pets mentioned 23/60 | Toggle; many Southern buyers have pets. |

Nice-to-have (toggles):

| Feature | Frequency | Notes |
|---|---|---|
| What's-included checklist | 20/60 | Strongly recommended; we can generate it from a master list. |
| "How it works" 3 steps | 14/60 | Cheap and reassuring. |
| Gift cards | 17/60 | Link to Square/Stripe gift card page. |
| Careers / hiring | 23/60 | Simple block. |
| Discounts (first clean, recurring) | 23/60 | Recurring-frequency discount is the common structure (weekly > biweekly > monthly). |
| Published prices or ranges | $ amounts on 10/60 home pages; Pricing link 16/69 | Owner opt-in. Ranges by home size or "starting at". |
| Instant/online price claim | 12/60 | Only with a real tool behind it. One site promises an instant price and has no calculator. |
| Before/after gallery | ~11/69 by link label | Owner photos only. |
| No-contract promise | 8/60 | Easy trust win for recurring. |
| Same cleaner/team each visit | 5/60 | Strong differentiator when true. |
| Employees, not subcontractors | ~16/60 (noisy match) | Trust point for owner-operated businesses. |
| "Text us" (`sms:` link) | 4/69 links, "call or text" wording 6/60 | Underused; we should default it on for mobile numbers. |
| Loyalty / referral program | referral 7/60 | |
| Key/lockbox / "you don't need to be home" | 7/60 | FAQ item. |
| Cancellation policy | 10/60 | FAQ or policies page. |

**Trust signals ranked by how often the good sites use them:** reviews (with a Google link), insured, satisfaction guarantee with a
specific re-clean window, background-checked staff, years in business ("since YEAR" 26/60), locally/family owned, bonded, eco/pet-safe,
owner photo and name, community partner badges (e.g. a cancer-patient cleaning charity appears on 3 sites), BBB link (6/69).
"Licensed" appears on 17/60, but in Alabama this usually means a city business license, not a trade license. The AI must not claim
"licensed" unless the owner confirms what it refers to.

**Commercial mode** (for janitorial/office cleaners such as Sweepers, Double Duty, The Way, Brinco): replace the residential tiers
with *facility types served* (offices, medical, retail, churches, industrial), add *frequency* (nightly, weekly), *after-hours service*,
*floor care* (strip/wax, carpet), *supplies restocking*, and a **walkthrough request** as the primary CTA. The commercial sites that read
well also show a 3-step onboarding (walkthrough → custom scope → recurring service) and stress insurance, consistency and a single point
of contact.

---

## 6. Third-party integrations

Detected on home pages plus the first booking/quote page (N = 69; lower bound, since I checked one inner page per site):

| Tool | Sites | How it is used |
|---|---|---|
| ZenMaid (booking/quote) | 7 | Iframe on a /book page or link to `app.zenmaid.com/book/<slug>`. |
| BookingKoala (booking with live price) | 5 | Subdomain `<name>.bookingkoala.com`, linked or iframed. |
| Launch27 (booking with live price) | 2 | Subdomain `<name>.launch27.com` iframe. |
| MaidCentral | 2 | Embedded quote/booking widget. |
| Housecall Pro | 1 | `book.housecallpro.com` link + widget. |
| Jobber | 1 | Request form link. |
| HouseAccount (franchise) | 1 | Scheduling link. |
| Other quote widgets (ConvertLabs, a "cleaning software" quote form, Formaloo) | 3 | Iframe forms. |
| Calendly | 1 | Walkthrough appointment. |
| GoHighLevel / LeadConnector (agency CRM forms/chat) | 10 | Forms, chat bubbles, funnels. Heavy scripts. |
| Plain WordPress form plugins (Gravity, WPForms, CF7) | 13 | Quote/contact forms. |
| Review widgets (Trustindex 6, Elfsight 3, NiceJob 2, Podium 1, SoTellUs 1) | 13 | Embedded Google-review carousels. |
| Google Maps embed | 21 | Service-area/contact map, usually low on the page. |
| Facebook link | 54 | Footer/header icon. Instagram 30, Yelp 9, Nextdoor 7, BBB 6, Thumbtack 4, Angi 4. |
| Payment mentions (Venmo/Zelle/Cash App) | 3 | Text only. |

**Recommendation for our static template:**
- **Booking link (optional field, URL + provider).** Support ZenMaid, BookingKoala, Launch27, MaidCentral, Jobber, Housecall Pro, Square
  Appointments and Calendly as a plain **link-out button** by default. Offer an **iframe embed on the Quote page only** for providers that
  publish an embeddable URL (ZenMaid, BookingKoala, Launch27), lazy-loaded. Never inject their scripts site-wide.
- **Quote form.** Post to a tiny endpoint we host (a Cloudflare Worker/Pages Function) that emails and/or texts the owner. Fallbacks: an
  `sms:` link with a prefilled message and a `mailto:` link. Add a honeypot field and Cloudflare Turnstile, not reCAPTCHA (seen on 28/69,
  heavy).
- **Reviews.** No live widgets. Show owner-supplied testimonials (with the client's permission) and a "Read our Google reviews" link plus a
  "Leave a review" link built from the Place ID. Per the Places terms, don't copy Google review text onto published sites (see section 8).
- **Map.** A static map image or a "Get directions" link instead of an embedded map. Embeds are heavy and many of these businesses are
  home-based with no storefront.
- **Gift cards.** Link-out button (Square, Stripe Payment Link, or the booking tool's gift card page).
- **Social.** Facebook/Instagram/Nextdoor links as icons in the footer.
- **Skip:** chat bubbles, agency CRM scripts, review carousels, live-price calculators we would have to maintain.

---

## 7. Mobile behavior

- **All 69 sites set a viewport meta tag.** Mobile layout is table stakes; quality varies.
- **Tap-to-call:** 59/69 have it; 10/69 have *no* `tel:` link at all (some show the number only as an image or plain text). Every number
  on our sites is a `tel:` link.
- **Sticky contact bar:** class names suggest a mobile bottom bar or floating call/book button on roughly 14/69 sites (estimate),
  including all the franchises that have them and the better-built independents. The best version I saw (Valley Clean Team) has three
  buttons in a bottom bar on small screens: Call, **Text (with a prefilled quote message)** and Get price. Our template: a bottom bar on
  phones with **Call · Text · Quote** (or Book), hidden on desktop, never covering the footer links.
- **Sticky header:** common (Elementor/Duda sticky headers and Tailwind `sticky top-0` on about a quarter of sites). Keep ours slim
  (≤ 56px) so it doesn't eat the small screen together with the bottom bar.
- **Menus:** hamburger with 4-6 items: Services, Pricing, About, Reviews, FAQ, plus a Quote button outside the menu. Avoid dropdowns
  with 10+ service links on mobile.
- **Images:** 9/69 home pages ship more than 1 MB of HTML before images (Wix and page-builder sites). Use one responsive hero image
  (`srcset`, ≤ 150 KB on mobile), lazy-load everything below the fold, and size before/after images as pairs. Many hero images on these
  sites are dark stock photos with white text over them, which hurts contrast on phones. Prefer a light background with the photo
  beside or below the text.
- **Forms:** keep the quote form to 6-8 fields with phone-friendly input types (`tel`, `email`, numeric for beds/baths, a select for
  service). Put "We reply within X hours" next to the submit button.
- **Click targets:** CTA buttons full-width on phones, ≥ 48px tall.
- **Fold Z Fold note** (for the owner's in-person demo): test at both the folded (~ 344-412px) and unfolded (~ 700-900px) widths; the
  services cards should go 1 → 2 → 3 columns.

---

## 8. Content the AI must write

Tone across the board: warm, plain-spoken, confident, Southern-friendly without dialect; short sentences; second person ("your home").
No unverifiable superlatives ("#1", "best in Alabama") unless the owner supplies an actual award. Never invent facts: years, insurance,
bonding, background checks, guarantees, prices and towns come from data fields, and the AI writes around them.

| Section | Copy needed | Length | Notes |
|---|---|---|---|
| Hero headline | Service + town, benefit-led | 4-9 words | 2-3 variants per site so neighbors differ. |
| Hero subline | Who it's for + top 2 trust facts | 15-25 words | Pulls from trust fields. |
| Trust points (3-4) | Title + one sentence each | 3-5 words + 10-18 words | Only from enabled trust fields. |
| Service cards | Name, one-line pitch, "best for" | 10-25 words each | Standard, Deep, Move-in/out + optional. |
| Services page tier detail | What's included, who it suits, how long it takes, how it's priced | 60-120 words per tier | Uses the checklist field. |
| Checklist | Room-by-room tasks per tier | 8-12 items per room | Generated from a master list; the owner edits. |
| How it works | 3 steps | 8-15 words each | Reflects the actual process (call/text/form, walkthrough or not). |
| About | Owner story, values, local roots | 120-200 words | Needs owner input: name, start year, why they started, family or team details. Placeholder until supplied. |
| Guarantee | Plain statement of the policy | 25-50 words | From structured guarantee fields only. |
| Service area intro | One sentence + town list | 20-40 words | Towns from the owner (default: Places city + nearby towns within radius, owner-confirmed). |
| FAQ | 5-8 Q&As | 40-80 words per answer | Topics: price basis, supplies, do I need to be home, pets, guarantee, cancellation, first clean = deep clean?, recurring discounts. |
| Final CTA band | One line + buttons | 8-15 words | |
| Commercial mode | Facility types, after-hours, scope/walkthrough | 150-250 words | Only for commercial clients. |
| Title and meta description | See section 11 | ≤ 60 / ≤ 155 chars | |
| Image alt text | Descriptive alt for each photo | 5-12 words | |

**Data from Google Places (preview use; refresh rather than store long-term, except Place ID):** business name, Place ID, formatted
address (or locality only for service-area businesses), phone, website/Facebook URL, opening hours, primary type and category, rating and
review count (as internal context and ranking only), Google Maps URL, photos (preview only; **never re-hosted on published sites**).
Review text can be used as private context for the AI, **never quoted on the site**.

**Must come from the owner (or be confirmed by them):**
- Services offered and which tiers; residential vs commercial mix.
- Price basis and any ranges or starting prices (or "quote only").
- Insurance, bonding and background-check status; any license and what it covers.
- Guarantee terms (window and remedy), cancellation/lockout policy.
- Products (eco/pet-safe), whether they bring supplies, same-team policy, employees vs contractors.
- Service towns / radius.
- Owner name, story, start year, team size, and a photo of the owner or team.
- Testimonials they have permission to use; their own before/after photos.
- Booking tool URL, gift card URL, preferred contact method (call, text, both), quote response time.
- Whether the street address may be shown (many cleaners work from home).

---

## 9. Data model

`R` = required, `O` = optional. Source: **P** = Google Places, **AI** = generated, **Own** = owner-supplied or owner-confirmed,
**Sys** = system default.

| Field | Req | Source | Notes |
|---|---|---|---|
| `place_id` | R | P | Stored indefinitely. |
| `business_name` | R | P → Own | Owner can correct. |
| `phone` | R | P → Own | Display + `tel:` link. |
| `phone_accepts_text` | O | Own | Default true for mobile numbers; turns on `sms:` buttons. |
| `email` | O | Own | Quote notifications and `mailto:` fallback. |
| `address` | O | P → Own | Street, city, state, ZIP. |
| `show_street_address` | R | Own | Default **false** (service-area business). Locality is always shown. |
| `city`, `state` | R | P | |
| `service_area_towns[]` | R | Own (AI suggests from radius) | 5-15 towns. |
| `service_radius_miles` | O | Own | |
| `hours[]` | O | P → Own | Day, open, close; "by appointment" flag. |
| `business_mode` | R | Own/Sys | `residential` · `commercial` · `both`. |
| `services[]` | R | Own (AI drafts) | `{id, name, kind: standard|deep|move|airbnb|postconstruction|office|carpet|windows|organizing|laundry|custom, blurb, best_for, price_display, enabled}`. |
| `price_mode` | R | Own | `quote_only` · `starting_at` · `ranges` · `hourly`. |
| `price_ranges[]` | O | Own | `{service_id, label (e.g. "2-3 bed"), min, max, unit}`. |
| `recurring_frequencies[]` | O | Own | weekly / biweekly / monthly, plus optional discount %. |
| `add_ons[]` | O | Own | Inside oven, inside fridge, windows, laundry, baseboards, cabinets; `{name, price?}`. |
| `checklist` | O | AI from master list → Own | `{room: [tasks]}` per tier; drives the comparison table. |
| `trust.insured` | O | Own | Boolean; claim shown only when true. |
| `trust.bonded` | O | Own | Boolean. |
| `trust.background_checked` | O | Own | Boolean. |
| `trust.licensed_note` | O | Own | Free text describing the license; hidden if empty. |
| `trust.employees_not_contractors` | O | Own | Boolean. |
| `trust.same_team` | O | Own | Boolean. |
| `trust.no_contracts` | O | Own | Boolean. |
| `trust.supplies_included` | O | Own | Boolean. |
| `trust.eco_products` / `trust.pet_safe` | O | Own | Booleans. |
| `ownership_tags[]` | O | Own | family-owned, woman-owned, veteran-owned, locally owned. |
| `year_started` | O | Own | Drives "since YEAR". |
| `guarantee` | O | Own | `{window_hours, remedy: reclean|refund|both, text_override?}`. |
| `policies` | O | Own | Cancellation notice, lockout fee, breakage; free text. |
| `owner_name`, `owner_story_notes` | O | Own | Input for About copy. |
| `team_photo`, `hero_photo`, `gallery[]` | O | Own / stock / AI | Never Google photos on published sites. Before/after pairs: `{before, after, caption}`. |
| `testimonials[]` | O | Own | `{quote, name/initials, town, permission: true}`. |
| `google_rating`, `google_review_count` | O | P | Internal ranking and AI context. Not rendered on published pages unless the owner confirms the numbers. |
| `google_maps_url`, `google_review_url` | O | P (built from Place ID) | "See / leave a review" links. |
| `booking` | O | Own | `{provider, url, embed: bool}`. |
| `quote_form` | R | Sys | Enabled by default; `{fields[], notify_email, notify_sms, response_time_text}`. |
| `gift_card_url` | O | Own | |
| `careers` | O | Own | `{enabled, apply_url or apply_text}`. |
| `social` | O | P/Own | facebook, instagram, nextdoor, yelp, bbb URLs. |
| `promo` | O | Own | `{text, expires_on}`; hidden automatically after expiry. |
| `faq[]` | R | AI → Own | 5-8 items. |
| `copy.*` | R | AI | Hero, subline, trust blurbs, tier text, about, service area intro, final CTA, meta. |
| `look` | R | Sys | One of the four looks in section 10, auto-picked to differ from nearby clients. |
| `accent_variant` | O | Sys | Palette variant within a look. |
| `seo.title`, `seo.description` | R | AI | Patterns in section 11. |

---

## 10. Design looks

Four original looks, each with a distinct mood, palette, font pairing, photo direction and layout. Assignment rule: no two clients
within ~25 miles in this category share a look, and a look's two palette variants spread them further. All text/background pairs below
are chosen to meet WCAG AA for body text. CTA buttons use the dark or saturated shade with white text, never the light accent.

### Look A: "Fresh Linen"
- **Mood:** calm, airy, quietly premium. Fits house cleaning, eco/non-toxic positioning, owner-operated businesses.
- **Palette:** linen background `#FAF7F2`, surface white `#FFFFFF`, sage `#7FA28A` (decorative), deep sage `#2F4B3C` (text/CTA),
  soft butter accent `#F3D67A` (highlights only), ink `#1F2723`. Variant 2 swaps sage for dusty blue `#6F8FAF` / `#28415C`.
- **Fonts (Google):** *Fraunces* (headings, soft optical size) + *Nunito Sans* (body).
- **Photo style:** bright natural light, close details (folded towels, a wiped counter, a made bed), lots of negative space, no posed
  stock smiles. Rounded-corner crops.
- **Layout feel:** generous whitespace, rounded cards (16px radius), thin dividers, checklist with soft round check icons, testimonial
  as one large centered quote.

### Look B: "Clear Blue Professional"
- **Mood:** crisp, organized, dependable. Fits businesses that do residential **and** commercial, or commercial only.
- **Palette:** navy `#13263F` (header/footer/text), bright blue `#2563EB` (links/secondary), ice `#EEF4FB` (section bands), white `#FFFFFF`,
  CTA amber `#F59E0B` with navy text `#13263F`. Variant 2: teal blue `#0E7490` instead of bright blue.
- **Fonts:** *Plus Jakarta Sans* (headings, semi-bold) + *Inter* (body).
- **Photo style:** uniformed team at work, branded vehicle, office and lobby shots, straight-on and evenly lit.
- **Layout feel:** structured 12-column grid, square-ish cards (6px radius), an icon trust strip right under the hero, a tier comparison
  **table**, and a facility-types grid in commercial mode. Feels like a well-run small company, not a franchise.

### Look C: "Front Porch"
- **Mood:** warm, family-run, small-town Southern. Fits family, sister or mother-daughter teams and long-established local names.
- **Palette:** cream `#FFF7EA`, terracotta `#B5523B` (CTA, white text), magnolia leaf green `#3D5A45` (headings), peach wash `#F7DCC4`
  (section bands), espresso text `#2B211C`. Variant 2: brick red `#9E3B2F` + pine `#2F4A3E`.
- **Fonts:** *DM Serif Display* (headings) + *Work Sans* (body).
- **Photo style:** owner and team portraits, real local homes and porches, warm tones, slightly candid. Owner photo is a feature,
  not an afterthought.
- **Layout feel:** story-led. The About block moves up to just after Services, with a "meet the owner" card and signature line. Wavy
  or scalloped section dividers, a handmade-feeling badge for "since YEAR", testimonials as cards with town names.

### Look D: "Bright & Bold"
- **Mood:** energetic, modern, fast. Fits younger businesses, move-out/Airbnb specialists, college-town clients.
- **Palette:** white `#FFFFFF`, ink `#111827`, deep teal `#0F766E` (CTA, white text), mint wash `#DDF7F1` (bands),
  lemon pop `#FFE14D` (highlight chips behind ink text). Variant 2: grape `#5B21B6` with lilac wash `#EEE7FB`.
- **Fonts:** *Sora* (headings, bold) + *DM Sans* (body).
- **Photo style:** before/after splits, tight bold crops, overhead shots of clean surfaces, one bright prop color.
- **Layout feel:** big type, pill buttons, price/"starting at" chips on service cards, a before/after slider section, checklist as a
  bold checkmark grid, sticky bottom bar styled as a pill.

---

## 11. Local SEO

**Schema.org.** There is no cleaning-specific LocalBusiness subtype, so use **`LocalBusiness`** (22/69 sample sites already do; a few use
`ProfessionalService` or `HomeAndConstructionBusiness`). One JSON-LD block on the home page:
- `@type: LocalBusiness`, `name`, `telephone`, `url`, `image` (owner-supplied), `priceRange` (only if the owner gave prices).
- `address`: include `addressLocality`, `addressRegion` and `postalCode`. Add `streetAddress` only when `show_street_address` is true.
- `areaServed`: an array of `City` objects for the service towns.
- `openingHoursSpecification` from hours.
- `hasOfferCatalog` → `OfferCatalog` of `Service` items (Standard, Deep, Move-in/out, …), mirroring the visible cards.
- `sameAs`: Facebook, Instagram, Google Maps URL.
- `FAQPage` for the visible FAQ (12/69 do this; fine to include, though Google rarely shows FAQ rich results for businesses now).
- **Do not** add `AggregateRating`/`Review` markup built from Google reviews (10/69 do). Self-serving review markup is not eligible for
  stars, and copying Google review data breaks the Places terms.

**Title patterns** (≤ 60 chars, pick by mode):
- Residential: `House Cleaning in {City}, {ST} | {Business}`
- Move-out focus: `Move-Out & Deep Cleaning in {City}, {ST} | {Business}`
- Commercial: `Office & Commercial Cleaning in {City}, {ST} | {Business}`
- Services page: `Cleaning Services & Pricing | {Business} | {City}, {ST}`

**Meta description** (≤ 155 chars): service + town + 1-2 trust facts + CTA, e.g. a pattern like
`{Business} offers {standard, deep and move-out} cleaning in {City} and {Town2}. {Insured}. Call or text {phone} for a free quote.`

**NAP consistency:** name, phone and locality must match the Google Business Profile exactly, in the header, footer, schema and contact
page. Search snippets in the sample showed out-of-area phone numbers, two different numbers for one company, and conflicting prices or
ownership claims across pages. All of that undermines local ranking and trust.

**Category-specific notes:**
- Many cleaners are **service-area businesses** with a hidden address on Google. Mirror that: show the town, not the house.
- Put the primary town in the H1 and the service-area towns in body text once each. **No per-town doorway pages.** Several sample sites link
  15+ town pages (I did not audit each one for duplication), and one town page I did read pads itself with weather and "things to do"
  filler.
- One real page per core service (deep, move-out) is fine when it has unique content: its own checklist, who it's for, and price basis.
- Exactly one H1 per page (16/69 sample pages get this wrong).
- Link "Leave us a review" to the Google review URL from the footer and the thank-you state of the quote form. Review velocity matters
  more than anything on-page for local pack ranking.
- Image file names and alt text describe the work and the town where natural ("deep-cleaned kitchen in Cullman home").

---

## 12. Anti-patterns

Seen in the sample; our templates must avoid all of them:

1. **JavaScript-only or near-empty home pages.** One Cullman competitor's home page returns an empty app shell to non-JS clients, and
   a Birmingham Wix site returns one word of text. 9/69 home pages have under 300 words of server-rendered text. We ship static HTML with
   all copy in the markup.
2. **Missing or multiple H1s:** 7/69 have none, 9/69 have several (one has 10).
3. **No tap-to-call link:** 10/69, with the phone shown as plain text or an image.
4. **Leftover template or generator text published live.** One site has a visible heading that is clearly an instruction about why a
   section matters. Our generator needs a QA pass that rejects meta-text, placeholders ("Lorem", "Your Business", "[City]") and empty
   sections before preview.
5. **The same template for unrelated businesses.** Three companies in Alabama, Arkansas and South Carolina run an identical section
   structure and headings. This is exactly why we rotate the four looks and vary copy per client.
6. **Off-topic SEO filler:** weather widgets, "neighborhoods" and "things to do" blocks on a cleaning page; dozens of thin town pages.
7. **Service-list sprawl:** 20+ service cards (solar panels, gutters, detailing next to house cleaning) bury the 3 things buyers want.
8. **Claims without substance:** "#1", "best", "top-rated" in titles with no award; "instant quote" with no calculator; "licensed" with
   no license explained; guarantees with no terms. Only render claims backed by an owner-confirmed field.
9. **Inconsistent facts:** different phone numbers, prices or ownership stories on different pages or listings. Single source of truth
   in our data model.
10. **Heavy pages:** 9/69 ship 1 MB+ HTML; agency CRM scripts, chat bubbles, review carousels, reCAPTCHA (28/69) and map embeds pile up.
    Keep our pages light: no third-party JS on load.
11. **Dark hero photos with white text and buttons pushed below the fold** on phones.
12. **Expired promos** ("first clean" or holiday offers) left up indefinitely. Our `promo.expires_on` auto-hides them.
13. **Dead or broken domains and bot walls.** Two sampled businesses' domains no longer resolve, and four more sit behind a hosting
    bot-check page. Managed hosting on Cloudflare Pages and domain-renewal reminders in the app avoid this.
14. **Reviews as a bare link with no proof on the page.** Show 2-3 real testimonials plus the Google link.
15. **Pricing that conflicts with itself** (a flat-price promise next to an FAQ saying "it depends"). If prices are shown, state the basis
    once and keep it consistent across cards, FAQ and schema.
