# Category blueprint: Landscaping and lawn care

Researched October 2026 for the Cullman, AL starting market. One template covers the whole category, with two
variants chosen per client:
**Lawn crew** (mowing, edging, beds, leaves, recurring service) and **Landscape / design-build** (installs, hardscape,
irrigation, drainage, lighting). Many small Southern firms do both. The variant only changes the hero CTA, section order
and which modules are switched on.

**Method, briefly.** I collected candidate sites from organic searches for "<lawn care / landscaping> <small Southern city>",
with the big directories blocked (HomeAdvisor, Thumbtack, Yelp, Angi, BBB, LawnStarter, GreenPal and others). Cities covered:
Cullman, Hartselle, Decatur/Danville, Florence/Muscle Shoals, Tuscaloosa/Northport, Gadsden, Albertville, Guntersville, Dothan (AL);
Oxford, West Point, Hattiesburg (MS); Cookeville/Sparta, Jackson, Chattanooga, Nashville area (TN); Bowling Green (KY);
Rome, Kingston, Cartersville (GA); Conway, Russellville (AR). I also took a few sites from 2025 "best lawn care websites"
roundups (software vendors and agencies) and 7 chains and franchises, which are there for feature ideas only.

I downloaded each home page's HTML with a phone user-agent and ran a script over it. The script counted `tel:`/`sms:` links,
forms and their fields, schema.org types, third-party domains, internal link paths (to infer pages) and keywords in the visible
text, and it pulled out the H1–H3 sequence to give the section order. I also read 10 sites with a page reader to check section
order, plan presentation, forms and mobile bars: Turner's, Warrior, Oxford Lawn Pro, Southern Grounds, P&D, HRH, Southern Touch,
Mississippi Roots, Coldwater and Greenview.

**Read the counts with these limits in mind:**
- **All counts come from home pages only.** A feature that appears only on an inner page is not counted, so true frequencies run higher.
- Keyword counts are pattern matches. Treat them as close estimates (roughly ±2), not exact audits.
- Page counts come from the internal links on each home page.

**Base for frequencies: N = 59 sites with usable home-page HTML** (52 independents, 7 chains or regionals). Turner's Lawn Care
blocked the script and was read only with the page reader, so it informs the qualitative notes and is not in N.

---

## 1. Summary

- **The lead form is the money CTA, but the phone has to be one tap away.** 48/59 home pages have a tap-to-call link,
  and on 33/59 the first one sits in the top quarter of the page. "Free estimate/quote" wording appears on 40/59, and 27/59
  put a form right on the home page. Lawn work gets sold after someone looks at the yard, so the primary CTA should be
  **Get a free quote** (a short form), with **Call** (and optionally **Text**) as the always-visible secondary.
- **Services come first.** On nearly every independent home page whose heading order I parsed (about 45), the service list comes
  first or second after the hero. The services offered are fairly standard. Hardscape (37/59), mulch (33/59), fertilization/weed
  control (33/59), mowing (32/59), irrigation (32/59) and seasonal cleanups (36/59) dominate. Sod (21), tree/stump work (18),
  drainage (17), lighting (15), gutters (10), holiday lights (7), pine straw (6) and pressure washing (5) are the regional add-ons.
- **Recurring service is the business model, but few sites sell it well.** 33/59 mention plans, programs, packages or weekly or
  bi-weekly service. Only 3 present clearly named tiers: a 3-tier monthly plan in Oxford, MS, visit-count packages in Tuscaloosa,
  and a nursery's programs. Only 2 independents show a price. A simple, honest **"Ways to work with us"** module (one-time job,
  seasonal cleanup, weekly or bi-weekly plan) is an easy differentiator for our clients.
- **Proof means photos.** A gallery or "our work" section appears on 36/59 home pages (35/52 independents, versus 1/7 chains).
  Testimonials or reviews appear on 29/59. Before/after shows up on only 3/59, yet it is the most persuasive format for this
  category. **Owner-supplied photos are the most valuable input for these sites.** The template must handle 0, 3 or 20 photos gracefully.
- **Service area is a standard section.** 38/59 name the towns or counties they serve, and 17/59 link to separate area pages.
  Use one strong section with named towns and a radius. Separate thin city pages are not worth building.
- **Trust signals are thinner than in other trades.** Years in business or a founding year appears on 37/59, licensed/insured on
  19/59, family/locally owned on 19/59, a guarantee on 18/59 and a response-time promise ("we reply within 24 hours") on 8/59.
  Associations or certifications appear on 12/59 and awards on 4/59. A clean trust strip will already put a client ahead of most local competitors.
- **The local bar is low and uneven.** Weaker sites in the sample had leftover template placeholders, a buried or missing phone
  number, conflicting phone numbers or claims, and an outdated look. The strongest small sites in the sample were recently rebuilt,
  one-screen-per-idea pages with a short form, a 3-step "how it works", a service-area list and an FAQ.
- **The tech is simple.** WordPress powers 28/59 sites, GoDaddy 6, Duda 5 and Wix 2. Third-party tools are rare: a review widget on
  5/59, a client portal or bill-pay link on 12/59 (5 of them chains), and Jobber's client hub on 1. Plain static pages with
  link-out integrations are the norm, which fits our static-site model.

---

## 2. Sample

Type: **I** = independent, **C** = chain/franchise/regional brand. "Visited" = home page actually downloaded or opened.
Sites 1–50 are in the US South. 51–53 come from design roundups outside the South.

| # | Business | URL | City/State | Type | Visited |
|---|---|---|---|---|---|
| 1 | Bailey Lawn Care | baileylawncare.com | Cullman, AL | I | yes |
| 2 | 4 Seasons Landscape | 4seasonslandscapellc.com | Cullman, AL | I | yes |
| 3 | Alabama Dirt Worx | alabamadirtworx.com | Vinemont/Cullman, AL | I | yes |
| 4 | Pro-Scapes | proscapesal.com | Hartselle, AL | I | yes |
| 5 | Greenline Lawn & Landscape | greenlinelawn.biz | Hartselle, AL | I | yes |
| 6 | AG Lawn Care | aglawncarealabama.com | North Alabama (Moulton–Huntsville) | I | yes |
| 7 | Horti-Tech Landscape | hortitechlandscape.com | Danville, AL | I | yes |
| 8 | Coldwater Landscapes | coldwaterlandscapes.com | Muscle Shoals/Florence, AL | I | yes |
| 9 | Meadow Landscaping & Lawn Care | makelandscapinggreatagain.com | Florence, AL | I | yes |
| 10 | Green Valley Nursery & Landscaping | greenvalleynurseries.com | Florence, AL | I | yes |
| 11 | Total Lawn LLC | totallawnllc.com | Northport/Tuscaloosa, AL | I | yes |
| 12 | Warrior Landscape Services | warriorlandscapeservices.com | Tuscaloosa, AL | I | yes |
| 13 | Southern Grounds | thesoutherngrounds.com | Tuscaloosa, AL | I | yes |
| 14 | Ram99 Lawncare | ram99lawncare.com | Northport, AL | I | yes |
| 15 | MH Lawn Care | mhlawn.care | Tuscaloosa, AL | I | yes |
| 16 | P&D Lawn & Landscape | pndlawn.com | Gadsden, AL | I | yes |
| 17 | McGlaughn Lawn Care | mcglaughnlawncare.com | Gadsden, AL | I | yes |
| 18 | David's Lawn Care Plus | davidslawncareplus.com | Albertville, AL | I | yes |
| 19 | Shelton Lawn Service | sheltonlawnservice.com | Guntersville, AL | I | yes |
| 20 | HRH Lawn Care | hrhlawncare.com | Guntersville, AL | I | yes |
| 21 | L & L Lawn Care Services | lllawns.com | Dothan, AL | I | yes |
| 22 | Elite Lawn Management | elitelawnmanagement.com | Dothan, AL | I | yes |
| 23 | Garcia Pine Straw & Lawn Care | garciapinestrawandlawncare.com | Dothan, AL | I | yes |
| 24 | Oxford Lawn Pro | oxfordlawnpro.com | Oxford, MS | I | yes |
| 25 | Matthews Landscape & Maintenance | matthewslandscapellc.com | Oxford, MS | I | yes |
| 26 | Green Leaf Gardens | greenleafgardensllc.com | Oxford, MS | I | yes |
| 27 | Mississippi Roots Lawncare | msrootslawncare.com | West Point, MS | I | yes |
| 28 | Greenview Irrigation & Lawn Maintenance | greenviewirrigation.net | Hattiesburg/Purvis, MS | I | yes |
| 29 | Landview Solutions | landviewsolutions.com | Hattiesburg, MS | I | yes |
| 30 | Brendan Johnson Landscaping | brendanjohnsonlandscaping.com | Cookeville, TN | I | yes |
| 31 | Destined Landscapes | destinedlandscapes.com | Middle TN (Nashville area) | I | yes |
| 32 | NaturEscapes | natur-escapes.com | Sparta, TN | I | yes |
| 33 | Reliable Lawncare & Landscaping | reliablelawncareandlandscaping.com | Jackson, TN | I | yes |
| 34 | Lawn & Leaf Solutions | lawnandleafsolutions.com | Jackson, TN | I | yes |
| 35 | Earthscapes | earthscapesinctn.com | Chattanooga, TN | I | yes |
| 36 | Top Cut Lawn Service & Landscaping | topcutlawnsbg.com | Bowling Green, KY | I | yes |
| 37 | Southern Touch Lawn & Landscapes | southerntouchlawn.com | Bowling Green, KY | I | yes |
| 38 | Murphy's Lawn & Landscape | murphyslawnsky.com | Bowling Green, KY | I | yes |
| 39 | Custom Cut Lawn & Mulch | customcutlawn.com | Bowling Green, KY | I | yes |
| 40 | Grassroots of Rome | grassrootsofrome.com | Rome, GA | I | yes |
| 41 | Complete Lawn Service | completelawnserve.com | Kingston, GA | I | yes |
| 42 | Turner's Lawn Care Solutions | turnerslawncaresolutions.com | Kingston, GA | I | yes (page reader only) |
| 43 | Tyler Landscape Company | tylerlandscapeco.com | Cartersville, GA | I | yes |
| 44 | Southern Lawn Service | southernlawnservice.net | Conway, AR | I | yes |
| 45 | Yardman Johnson Lawn Care | yardmanjohnson.com | Conway, AR | I | yes |
| 46 | Olive Branch Landscape Management | olivebranchar.com | Conway, AR | I | yes |
| 47 | LawnScapes of the River Valley | lawnscapesoftherivervalley.com | Russellville, AR | I | yes |
| 48 | Grassperson | grassperson.com | Lewisville/Flower Mound, TX | I | yes |
| 49 | Southern Cut | southerncut.com | Charlotte, NC | I | yes |
| 50 | Dallas Landscape & Irrigation | dallaslandscapeandirrigation.com | Dallas, TX | I | yes |
| 51 | No Mow Worries | nomowworriesco.com | Aurora, CO | I | yes |
| 52 | Raymond Landscaping | raymondlawnservice.com | Trappe, PA | I | yes |
| 53 | Changing Seasons LLC | changingseasonsllc.com | not stated on home page | I | yes |
| 54 | The Grounds Guys | groundsguys.com | national franchise | C | yes |
| 55 | Weed Man | weedman.com | national franchise | C | yes |
| 56 | Lawn Doctor | lawndoctor.com | national franchise | C | yes |
| 57 | U.S. Lawns | uslawns.com | national franchise (commercial) | C | yes |
| 58 | Spring-Green | spring-green.com | national franchise | C | yes |
| 59 | Ryan Lawn & Tree | ryanlawn.com | Kansas City-based regional | C | yes |
| 60 | TruGreen | trugreen.com | national (Memphis, TN HQ) | C | yes |
| 61 | Kalvin's Lawn Care | kalvinslawncarellc.com | Tuscaloosa, AL | I | no (search snippet only) |
| 62 | Ardon Lawns & Landscapes | ardonlawnsllc.com | Bowling Green, KY | I | no (search snippet only) |
| 63 | Exterior Lawn Care | exteriorlawn.com | Northport, AL | I | no (search snippet only) |
| 64 | C. Wall Landscaping & Hardscaping | cwalllandscaping.com | Jackson, TN | I | no (search snippet only) |
| 65 | Lawncare Solutions BG | mowbg.com | Bowling Green, KY | I | no (search snippet only) |

Totals: **65 listed, 60 visited directly** (59 by HTML download, 1 by page reader only), 5 seen only in search results.
I tried three more sites but they would not load, so I left them out: landllawn.com (TLS certificate error / HTTP 503),
1stchoicelawncare.com (HTTP 500) and dillonbroslandscaping.com (captcha wall). A dead site is itself a
lesson (see section 12).

---

## 3. Pages

Inferred from each home page's internal links (N = 59):

| Page | Sites linking to it | Notes |
|---|---|---|
| Services (index and/or per-service pages) | 54/59 | Larger firms have one page per service. Small crews put everything on one page. |
| Contact | 44/59 | Usually holds the quote form, phone, email, hours and sometimes a map. |
| About | 43/59 | Owner story, founding year, crew photo. |
| Gallery / Our work / Projects | 28/59 | Another ~8 have the gallery only as a home-page section. |
| Blog / tips | 21/59 | Mostly SEO articles. Often stale. Not worth it for our clients. |
| Reviews / testimonials | 20/59 | |
| Service areas (one or more town pages) | 17/59 | Several were thin near-duplicate town pages. |
| Commercial (separate) | 16/59 | Plus 9 with a separate Residential page. |
| Careers / Join our team | 16/59 | 5 of the 7 chains have it. Common for crews that hire seasonally. |
| Dedicated quote/estimate page | 11/59 | Others use the Contact page. |
| FAQ (separate page) | 8/59 | Another ~9 have an FAQ section on the home page (17/59 in total). |
| Plans / pricing / programs | 6/59 | |
| Pay bill / client portal | 5/59 links (12/59 mention it) | Mostly chains, plus a few larger independents. |
| Single-page site (≤3 internal links) | 6/59 | Includes three of the best-built small Southern sites (P&D, McGlaughn, MS Roots). |

**Recommended page set for our template**

- **Required**
  - **Home**: one long page with anchor links covering every essential (see section 4).
  - **Free Quote / Contact**: form, phone, text, email, hours, service area.
  - **Privacy**: short, auto-generated, because the form collects personal data.
- **Optional (switched on by data)**
  - **Services**: one combined page, or per-service pages only when the owner adds real detail (photos, process, what's included).
    Default: off. Each service is a card on the home page.
  - **Our Work / Gallery**: on when the owner supplies ≥ 9 photos. Below that, the photos live in a home-page strip.
  - **About**: on when the owner supplies a story or photo beyond the basics. Otherwise it is a home-page block.
  - **Plans & Pricing**: on when the owner defines recurring plans.
  - **Commercial**: on when the owner marks commercial / HOA / property-manager work as a focus.
  - **Careers**: a simple "we're hiring" block or page if the owner wants it (seasonal hiring is common here).

**One long page or many?** For our clients (1–10 person crews), **use a long home page with anchors plus a separate Quote/Contact page**.
- The best small sites were single-page or close to it, and visitors arrive on phones wanting three things: services, proof, and how
  to get a price.
- Multi-page sites in the sample mostly padded the extra pages with thin SEO text.
- Keep the Quote page separate so it has a clean URL (`/quote`) to share in texts and on truck magnets and yard signs.
- Add per-service or per-town pages only when there is unique content to put on them.

---

## 4. Home page section order

The typical order on the best sites, synthesized from about 45 parsed heading sequences plus the page-reader reads.
The parts that appeared most consistently were services near the top and service area, FAQ and final CTA at the bottom.
The middle varies.

1. **Header**: logo/name, tap-to-call number, **Free Quote** button, hamburger menu. A sticky header showed up on several sites.
2. **Hero**:
   - H1 naming the service and town, e.g. "Lawn care and landscaping in Cullman".
   - One supporting line.
   - Two buttons: primary **Get a Free Quote**, secondary **Call** (or **Call or Text**).
   - A 3-item trust strip under the buttons, e.g. "Licensed & insured · Since 2009 · Free estimates". Only items the owner confirms appear.
   - Background: one wide, well-lit yard photo (owner photo preferred).
3. **Services**: cards with an icon or photo, a name and a one-line benefit. Grouped as *Lawn care* / *Landscaping & installs* /
   *Seasonal & extras* when there are more than 6.
4. **Why us / about-lite**: owner name and face, how long they have served the area, local/family/veteran ownership if true,
   and 3 short differentiators.
5. **Our work**: a photo strip or grid, with an optional before/after slider.
6. **How it works**: 3 steps (request → free on-site look and quote → we get to work / you're on the schedule). This appeared on
   12/59 home pages, mostly on the newer, better sites.
7. **Ways to work with us / Plans**: one-time job, seasonal cleanup, recurring plan (weekly / bi-weekly / monthly). Prices are
   optional and always "starting at".
8. **Reviews**: owner-provided testimonials with first names and towns, plus a "See our reviews on Google" link (see section 8 for rules).
9. **Seasonal calendar** (optional, a category signature): what the crew does in spring, summer, fall and winter, and any current
   seasonal offer.
10. **Service area**: named towns/counties + radius statement + "Not sure? Ask us."
11. **FAQ**: 5–7 questions.
12. **Final CTA**: short quote form inline, plus call and text buttons.
13. **Footer**: NAP (name, address or "Serving X County"), phone, email, hours, social links, quick links, privacy, copyright.

**Variant tweaks**
- **Lawn crew:** keep the order above. Plans move up to position 5, right after services, when the owner offers recurring service.
- **Design-build / hardscape:** put **Our work** right after the hero and use a 4-step process (consult → design → build →
  enjoy/maintain). Use **Request a consultation** as the primary CTA. On 30-plus sites, project photos did most of the persuading.

**Above the fold on a phone (≈ 390×750 px)**
- Compact header (logo + call icon + menu).
- H1 (≤ 2 lines) and supporting line (≤ 2 lines).
- **Get a Free Quote** button (full width) and **Call** button (full width or half).
- Trust strip, plus the top edge of the hero photo.
- The sticky bottom bar (section 7) appears once the hero buttons scroll off-screen.

---

## 5. Features and calls to action

**Primary CTA:** **Get a Free Quote**. It opens the short quote form (anchor on home, `/quote` page).
**Secondary CTA:** **Call** (tap-to-call). Optional third: **Text us** (sms:), on when the owner says texting is fine. Only
5/59 home pages offer texting, but several of the best small Southern sites did, and crews in the field often answer
texts faster than calls.
Design-build variant: the primary CTA reads **Request a Consultation**.

| Feature | Frequency (home pages, N=59) | Template |
|---|---|---|
| Tap-to-call link | 48/59 (44/52 independents) | **Must**: header, hero, sticky bar, footer |
| First phone link in top quarter of page | 33/59 | **Must** |
| "Free estimate/quote" wording | 40/59 | **Must** (unless the owner charges for estimates) |
| Quote/contact form on the home page | 27/59 | **Must**: short form at the bottom, full form on /quote |
| Services list | ~all | **Must** |
| Gallery / our work section | 36/59 | **Must** (graceful when photos are few) |
| Service area (named towns/counties) | 38/59 | **Must** |
| Residential + commercial mentioned | 35/59 | Must if owner does both, else omit |
| Years in business / founding year | 37/59 | **Must** when known (owner) |
| Recurring plan / program language | 33/59 | **Must** module, owner-configured |
| Testimonials / review section | 29/59 | **Must** when the owner provides testimonials. Otherwise a Google reviews link |
| Hours shown | 30/59 | **Must** (Places) |
| Facebook link | 46/59 | Must if exists |
| Licensed / insured / bonded | 19/59 | **Must** when owner confirms |
| Family / locally owned | 19/59 | Nice, owner-confirmed |
| Guarantee / satisfaction promise | 18/59 | Nice, owner-worded only |
| FAQ section or page | 17/59 | **Must** (also feeds FAQ schema-free SEO text) |
| Process / how-it-works steps | 12/59 | **Must** (cheap, high clarity) |
| Associations / certifications | 12/59 | Nice (owner) |
| Client portal / bill pay link | 12/59 (7/52 indep.) | Nice: link-out slot |
| Response-time promise (24–48 h) | 8/59 | Nice, owner-confirmed |
| Discounts (referral, military/first responder, first service) | ~8/59 (estimate) | Nice: offer banner slot |
| Video (embedded or linked) | 22/59 (all 7 chains) | Optional, owner-supplied only |
| Map embed | 7/59 | Optional. Prefer a static map link (lighter) |
| Named, priced tiers | 3/59 tiers, 2/52 independents with prices | Nice: plan cards with "starting at" |
| Before/after | 3/59 | **Nice, strongly encouraged**: slider when owner pairs photos |
| Awards / "best of" | 4/59 | Optional (owner) |
| Spanish version | 1/59 | Optional toggle (owner) |

**Trust signals that work here.** Put them in this order, and show only what the owner confirms:
1. Real photos of their own work.
2. Owner name and face plus a founding year.
3. Licensed & insured, with a license number where the state issues one.
4. Testimonials with first name + town.
5. Google rating and count, with a link to the Google listing. Rules are in section 8.
6. Local memberships (chamber, state turfgrass/nursery associations, BBB).
7. A plain-English promise, e.g. "If something's missed, we come back and fix it." Owner-worded.

**Quote form fields.** Across the 24 form-bearing pages I parsed, name and email appeared on 22, phone on 19 and a service picker
on 8. Most forms were generic contact forms. Ours:
- **Required:** Name, Phone.
- **Recommended:** Street address or town (dropdown of service-area towns + Other), Services wanted (checkboxes), How often
  (one-time / weekly / every 2 weeks / monthly / not sure).
- **Optional:** Email, Notes, photo upload (only if our form backend supports it), Best way to reach you (call / text / email).

Keep it to 5–6 visible fields. Put a reply-time line under the button only if the owner sets one.

---

## 6. Third-party integrations

What showed up (home-page HTML, N = 59):

| Tool / pattern | Seen on | How it was used |
|---|---|---|
| Google review links / "review us on Google" | many (most common integration) | Plain links to the Google listing or review form |
| Review widgets (Elfsight, Trustindex, a niche lawn-review widget) | 5/59 | Embedded carousels of Google reviews |
| Client portal / bill pay | 12/59 mention it. Domains seen: CopilotCRM (1), Jobber client hub (1), a hosted "manage and pay my account" portal (1), PayPal (1) | Header or footer link |
| CRM lead widget (LeadConnector / HighLevel) | 2/59 | Embedded form or chat |
| Chat widgets (Broadly, Chatbase, help prompts) | 3/59 | Floating bubble |
| Website-platform forms (GoDaddy, Duda, Wix, Gravity Forms, Contact Form 7, WPForms, etc.) | ~27/59 | Native forms, posting to the builder |
| Instant-quote / estimator flows | 3/59 (one independent, two chains) | Multi-step yard size → frequency → price range. Chains use ZIP-first quote forms |
| Online scheduling (Calendly, Housecall Pro, Jobber booking) | 0/59 | Not used. Lawn quotes are done after a site visit |
| YouTube / Vimeo | 22/59 | Mostly links. A few hero or background videos |

**Recommendation.** Sites stay static, and every integration is a link or a lightweight embed:
- **Quote form**: our own form posting to a Cloudflare Worker endpoint that emails or texts the owner. This is the default and is always on.
- **Client portal / pay bill**: a URL slot rendered as a "Pay my bill" header/footer link. Covers Jobber client hub, CopilotCRM,
  Yardbook, Service Autopilot, LMN, Square invoices, PayPal.me, etc. We don't need to know the vendor.
- **Online booking / request link** (optional): URL slot for Jobber "request work", Housecall Pro or Calendly. If present, it
  becomes the target of the primary button. The form stays as the fallback.
- **Google reviews**: a "Read our reviews on Google" button using the place's Maps URL from Places. No third-party review
  widget by default: it adds weight and scripts, and our compliance rules bar quoting Google review text.
- **Video**: optional YouTube/Vimeo URL, rendered as a click-to-load poster image, not an auto-loading iframe.
- **Facebook / Instagram / Nextdoor**: icon links.
- Skip chat widgets and instant-price calculators for v1. They need upkeep the owner won't do, and a wrong instant price creates
  bad leads. Reconsider a simple "price range" calculator only for owners who give us a real price table.

---

## 7. Mobile behavior

- **Tap-to-call everywhere.** `tel:` links in the header, hero, sticky bar and footer. 33/59 put the first one in the top quarter,
  and the rest buried it. One site in the sample showed the phone number only near the bottom of the page.
- **Sticky bottom action bar.** Class names for sticky/mobile CTA bars turned up in about 12/59 HTML files. A page-reader check
  confirmed a sticky mobile bar on HRH (call) and Oxford Lawn Pro (call + plans link). Our template: a two-button bar
  (**Free Quote** | **Call**, or **Call** | **Text** when texting is on). It appears after the hero buttons scroll out of view and
  is ≥ 56 px tall with safe-area padding. It never covers form submit buttons, so hide it while a form field has focus.
- **Menu.** A hamburger menu was present on ~50/59. Keep it to 4–6 items (Services, Our Work, Plans, Areas, FAQ, Quote).
  On a one-page build the items are anchors with smooth scroll and offset for the sticky header.
- **Images.** 40/59 used `loading="lazy"` and 24/59 served WebP. Galleries are the heaviest part of these sites. Use:
  - responsive `srcset`, AVIF/WebP with JPEG fallback;
  - a fixed aspect ratio (4:3 for work photos, 16:9 for hero) to avoid layout shift;
  - a hero image under 200 KB on mobile;
  - a tap-to-enlarge lightbox with swipe.
- **Before/after slider.** Drag handle, keyboard-accessible, both images the same size. Fall back to side-by-side when JS is off.
- **Forms.** Use `type="tel"` and `autocomplete` attributes, a town dropdown instead of free text, and big tap targets for service
  checkboxes. Don't use reCAPTCHA puzzles; use a honeypot plus Worker-side rate limiting.
- **Avoid:** autoplay background video on mobile (a few sites used it), hero carousels, and popups.

---

## 8. Content the AI must write

Tone: friendly, plain-spoken, local and confident. It should read like a hard-working crew owner talking to a neighbor:
short sentences, no landscaping-magazine fluff, and no superlatives the owner can't back up ("best in Alabama", "#1").
Reading level about 6th–8th grade. The AI may refer to local context (town names, county, the general Southern growing season),
but must never invent facts.

| Section | Copy needed | Length |
|---|---|---|
| Hero | H1 (service + town), one supporting line, button labels | H1 ≤ 8 words; line ≤ 20 words |
| Trust strip | 3 short labels built **only** from confirmed fields | ≤ 4 words each |
| Services | One card per service: name + benefit line. Optional detail paragraph per service | 10–18 words per card; 40–80 per detail |
| Why us / about-lite | Short owner/crew intro + 3 differentiators | 50–90 words + 3 × ≤ 10 words |
| How it works | 3 (or 4) steps | ≤ 15 words each |
| Plans | Plan names and what's included, from owner data. AI phrases it; owner sets scope and prices | ≤ 12 words per bullet |
| Seasonal calendar | What happens each season for a typical client in their area | 15–30 words per season |
| Service area | Intro line + town list (data) + "not listed? ask" line | ≤ 35 words |
| FAQ | 5–7 Q&As: free estimates, contracts/cancel, weather delays, payment methods, areas, what a visit includes, licensed/insured | 30–60 words per answer |
| Final CTA | Headline + one line | ≤ 20 words |
| SEO | `<title>`, meta description, image alt text, OG text | see section 11 |

**Hard rules for the AI**
- Never state these unless the owner provided them: licensing, insurance, bonding, license numbers, years in business,
  guarantees, warranties, response times, prices, awards, certifications, "family/veteran-owned", or chemicals or products used.
  If a field is empty, the section or chip is omitted, never filled with plausible text.
- **Google reviews:** never quote, paraphrase or excerpt review text on the site. Reviews may only inform tone and which services
  to emphasize. Show the rating and count only if refreshed from Places at build or publish time; otherwise show just a link.
  Owner-supplied testimonials (with the customer's permission) are the only on-page quotes.
- Lawn advice in the seasonal calendar or FAQ stays general (e.g., "fall leaf cleanup", "spring bed refresh"). No specific
  chemical, rate or timing claims unless the owner supplies them.
- Write 2 variants for the hero line and service blurbs so the owner can choose. Keep neighboring clients' copy different
  (vary the seed and the phrasing patterns per site).

**Where data comes from**

| From Google Places (refresh, don't keep forever) | From the owner (in-app review step) |
|---|---|
| Name, address, phone, hours, Maps URL, lat/lng, primary type/types, rating + count, business status, editorial summary (context only) | Services actually offered (checklist + custom), service-area towns/radius, photos of their work (and before/after pairs), owner name/photo/story, founding year, licensed/insured status and numbers, plans and starting prices, payment methods, email, text-OK flag, testimonials, guarantee wording, discounts, portal/booking links, social links, commercial/HOA yes/no, Spanish yes/no |

Google photos may appear in the private preview only. At publish time they must be replaced by owner, stock or AI images.
The publish step must block if any Google-sourced image is still in use.

---

## 9. Data model

`R` = required, `O` = optional. Source: **P** = Google Places, **AI** = generated, **OW** = owner, **SYS** = our system.

```
business
  place_id                      R  P    (stored indefinitely per Places terms)
  name                          R  P    (owner may edit display name)
  variant                       R  SYS  enum: lawn_crew | design_build   (guessed from name/types/services; owner confirms)
  phone_display                 R  P
  phone_e164                    R  SYS  derived
  sms_enabled                   O  OW   default false
  email                         O  OW   lead notifications + optional display
  address {street, city, state, zip}  R  P
  hide_street_address           O  OW   default true for home-based crews ("Serving Cullman County")
  geo {lat, lng}                R  P
  google_maps_url               R  P
  hours[] {day, open, close}    O  P    (refresh; owner may override, e.g. "Mon–Sat, daylight")
  business_status               R  P    must be OPERATIONAL to generate
  rating, rating_count          O  P    show only if refreshed at publish; else omit
  founded_year                  O  OW
  ownership_tags[]              O  OW   family_owned | locally_owned | veteran_owned | woman_owned | owner_operated
  owner {name, title, photo, bio_facts}   O  OW
  licensed                      O  OW   boolean, plus licenses[] {label, number, state}
  insured                       O  OW   boolean (optional liability amount)
  bonded                        O  OW   boolean
  memberships[] {name, url}     O  OW   chamber, state turf/nursery assoc., BBB
  awards[] {name, year, source} O  OW
  guarantee_text                O  OW   owner's own words (AI may tidy grammar only)
  response_time_text            O  OW   e.g. "We reply within one business day"
  free_estimates                R  OW   boolean, default true (confirm)
  serves_commercial             O  OW   boolean; commercial_types[] (HOA, rentals, churches, offices)
  languages[]                   O  OW   en default; es optional

services[]                      R  OW (+AI copy)   at least 3
  key                               enum seed list below + custom
  group                             lawn | landscape | hardscape | water | seasonal | extras
  name                          R   OW/AI
  blurb                         R   AI   (10–18 words)
  detail                        O   AI   (40–80 words; only if page enabled)
  photo                         O   OW/stock/AI
  starting_price                O   OW   + unit (per visit / per month / per project)
  seasonal_months[]             O   OW

  seed keys: mowing, edging_trimming, blowing, bed_maintenance, mulch, pine_straw, hedge_shrub_trimming,
  leaf_removal, spring_cleanup, fall_cleanup, fertilization_weed_control, aeration, overseeding, sod_install,
  landscape_design, planting, hardscape_patio, retaining_wall, pavers_walkways, fire_pit_outdoor_living,
  irrigation_install, irrigation_repair, drainage_french_drain, grading, landscape_lighting, tree_trimming,
  tree_removal, stump_grinding, land_clearing, gutter_cleaning, pressure_washing, holiday_lighting,
  snow_removal, junk_debris_removal, rock_gravel

plans[]                         O  OW   (renders "Ways to work with us")
  name                          R       e.g. "Every other week"
  frequency                     R       weekly | biweekly | monthly | seasonal | one_time
  includes[]                    R
  starting_price                O       + unit; always rendered "starting at"
  notes                         O       contract/cancellation terms in owner words

service_area
  towns[]                       R  OW   (prefill from Places city + nearby towns within radius; owner edits)
  counties[]                    O  OW
  radius_miles                  O  OW
  note                          O  AI

media
  hero_photo                    R  OW/stock/AI   (Google photo allowed in preview only)
  gallery[] {src, caption, service_key, town}  O  OW
  before_after[] {before, after, caption}      O  OW
  logo                          O  OW   (else text wordmark from look)
  video_url                     O  OW

testimonials[] {quote, first_name, town, service_key, permission:true}  O  OW
faq[] {q, a}                    R  AI (owner-reviewed), 5–7
seasonal_calendar {spring, summer, fall, winter}  O  AI (owner-reviewed)
offer {text, start, end}        O  OW   e.g. fall cleanup booking; hidden after end date
links
  quote_form                    R  SYS  Worker endpoint
  booking_url                   O  OW
  portal_url                    O  OW   ("Pay my bill")
  facebook, instagram, nextdoor, youtube   O  OW/P
  google_reviews_url            O  SYS  from place_id
seo
  title, meta_description, og_image   R  AI/SYS
  schema_jsonld                 R  SYS
site
  look                          R  SYS  A–D (neighbor rule, section 10)
  accent_variant                R  SYS
  pages_enabled[]               R  SYS  derived from data thresholds
  status                        R  SYS  new | shown | sold | live
```

---

## 10. Design looks

These are four original looks built from the patterns above, not modeled on any site in the sample. Each look is a complete token set:
color, type, radius, photo direction and layout rhythm. The fonts are chosen so they don't overlap with the other category
blueprints.
**Neighbor rule:** two landscaping clients within ~30 miles never share a look, and two clients of any category in the same town
shouldn't share both look *and* accent. Every combination must meet WCAG AA for text and buttons. Colors marked "decorative" are
never used for small text.

### Look A: "Fresh Stripe"
- **Mood:** crisp, energetic, just-mowed. The default for mowing-and-maintenance crews.
- **Palette:**

  | Role | Color | Hex |
  |---|---|---|
  | Primary (headings, buttons with white text) | turf green | `#1E6B3A` |
  | Primary CTA (dark text on it) | sun yellow | `#F5C518` |
  | Text, footer | field ink | `#13201A` |
  | Section backgrounds | morning mist | `#F3F6EF` |
  | Accent stripes and icons (decorative) | clipping lime | `#8CC63F` |
- **Fonts (Google):** headings **Saira Condensed** (700, tight tracking, sentence case), body **Mulish** (400/700).
- **Photos:** bright mid-morning light, crisp mower stripes, low camera angle across the lawn, wide crops with sky. A slightly
  cool, clean grade.
- **Layout feel:**
  - 6 px radius, a full-bleed hero with a dark gradient at the bottom for legible text.
  - Section dividers made of faint alternating-green "stripe" bands.
  - Services as a 2-column icon grid on mobile, plans as stacked cards with a yellow "Most popular" tab (owner-chosen).
  - Bottom bar: yellow Quote + green Call.

### Look B: "Red Clay & Pine"
- **Mood:** warm, Southern, rooted. A family crew that has done pine straw and beds around town for years. Good for
  lawn-plus-beds businesses and family firms.
- **Palette:**

  | Role | Color | Hex |
  |---|---|---|
  | Page background | cotton cream | `#FBF5EA` |
  | Primary buttons, white text | red clay | `#A8462C` |
  | Headings, footer | longleaf pine | `#2F4A3A` |
  | Accents and rating stars, dark text on it | pine straw gold | `#D6AE62` |
  | Body text | bark | `#2A2420` |
- **Fonts (Google):** headings **Bitter** (600/700), body **Hind** (400/600).
- **Photos:** golden-hour light, close textures (fresh pine straw, mulch edges, brick borders), porches and mature trees. Owner
  and crew portraits by the truck. A warm grade.
- **Layout feel:**
  - 14 px radius cards on cream, a thin pine rule above section titles.
  - The seasonal calendar as a 4-tile row (spring/summer/fall/winter with small illustrated leaf icons).
  - Testimonials as cards with the town in small caps.
  - Bottom bar: clay Quote + pine Call.

### Look C: "Stone & Garden"
- **Mood:** calm, crafted, premium but not snobbish. The default for design-build, hardscape, irrigation and lighting firms.
- **Palette:**

  | Role | Color | Hex |
  |---|---|---|
  | Text and dark sections | slate | `#2F3A40` |
  | Background | limestone | `#EEEBE4` |
  | Primary buttons, white text | weathered bronze | `#8C5A2B` |
  | Large display text and accents only (decorative) | sage | `#7D8F6E` |
  | Cards | white | `#FFFFFF` |
- **Fonts (Google):** headings **Newsreader** (display, 500/600), body **Plus Jakarta Sans** (400/600).
- **Photos:** wide finished-project shots, patios and walls at dusk with landscape lighting on, natural stone texture, people only
  occasionally. A neutral, slightly desaturated grade.
- **Layout feel:**
  - Editorial pacing with generous whitespace and large photo-led project cards with caption + town.
  - A numbered 4-step process in big serif numerals, and the before/after slider featured high on the page.
  - 2 px radius (crisp, architectural).
  - Bottom bar: bronze "Consultation" + slate Call.

### Look D: "Neighborhood Crew"
- **Mood:** friendly, upbeat, approachable. A young owner-operator crew that answers texts. Good for newer businesses
  with few photos, because it leans on icons and color rather than photography.
- **Palette:**

  | Role | Color | Hex |
  |---|---|---|
  | Headings, footer | deep navy | `#1B3A5C` |
  | Secondary buttons, white text | leaf green | `#237A4B` |
  | Primary CTA, white text | pumpkin | `#C2531F` |
  | Backgrounds | sky wash | `#EAF4F7` |
  | Cards | white | `#FFFFFF` |
- **Fonts (Google):** headings **Lexend** (600/700), body **Atkinson Hyperlegible** (400/700).
- **Photos:** candid crew-at-work shots, trailer and mower lineup, a smiling owner. Otherwise friendly flat illustrations of
  mower, leaf rake and hedge trimmer. A bright, natural grade.
- **Layout feel:**
  - Pill buttons and 20 px radius cards, with big numbered "1-2-3" steps in colored circles.
  - Icon-led service tiles, and the service area as a chip cloud of town names.
  - Bottom bar: pumpkin Quote + green Text/Call.

Assignment default: lawn_crew → A or D (B if family/long-established), design_build → C (B as alternate). Then apply the neighbor rule.

---

## 11. Local SEO

**Schema.org (JSON-LD on every page)**
- schema.org has **no landscaping or lawn-care business type**. I checked HomeAndConstructionBusiness, and its subtypes are only
  Electrician, GeneralContractor, HVACBusiness, HousePainter, Locksmith, MovingCompany, Plumber and RoofingContractor.
  One sampled site used a non-existent type. Use:
  - `@type: "HomeAndConstructionBusiness"` (a LocalBusiness subtype), with
    `additionalType: "http://www.productontology.org/id/Landscaping"` (and `/id/Lawn` for lawn-only crews), or plain
    `LocalBusiness` if we want maximum safety.
  - `name`, `telephone`, `url`, `image`, `logo`, `priceRange` (only if the owner sets prices).
  - `address` (`PostalAddress`). For crews that hide the street address, keep the city/region/postal code and add `areaServed`.
  - `geo`, `openingHoursSpecification` (from Places), `sameAs` (Google Maps URL, Facebook, Instagram).
  - `areaServed`: an array of `City` / `AdministrativeArea` (county) objects from the service-area towns.
  - `hasOfferCatalog` → `OfferCatalog` of `Service` items (one per service). Add `Offer` with `price`/`priceSpecification`
    only for owner-set starting prices.
  - `founder` / `foundingDate` only if the owner provided them.
  - **Do not** add `AggregateRating` built from Google reviews. Self-serving review markup on a LocalBusiness doesn't earn stars
    in Google results, and we don't own that data. Only 5/59 sample sites included it.
- 22/59 sample home pages had some LocalBusiness-family or Service JSON-LD. Getting this right is an easy edge.
- Skip `FAQPage` markup as a rich-result play (Google limits FAQ rich results). Keep the FAQ as plain, useful HTML.

**Titles and meta**
- Home `<title>`: `{Primary service phrase} in {City}, {ST} | {Business name}`, ≤ 60 characters.
  E.g. "Lawn Care & Landscaping in Cullman, AL | Smith Lawn Co." Design-build: "Landscape Design & Hardscapes in {City}, {ST} | {Name}".
- Meta description (≤ 155 chars): services + area + CTA. E.g. "Mowing, mulch, cleanups and landscaping across Cullman County.
  Free estimates. Call or text {phone}."
- One H1 per page, and it includes the main service + town. Several sampled sites had multiple H1s or generic H1s like
  "Welcome" or "Home".
- Quote page title: "Free Lawn Care Quote | {Name}". Service pages (if on): "{Service} in {City}, {ST} | {Name}".

**NAP consistency**
- The name, phone and city must match the Google Business Profile exactly, so we use the Places values. Set one canonical phone format.
- If the owner hides the street address, render "Serving {County} County, {ST}" consistently in the footer, the schema and the contact page.
- Two sampled businesses showed conflicting phone numbers in search snippets. One canonical number, everywhere.

**Category-specific**
- **Service-area SEO:** list the towns in visible text in the service-area section and in `areaServed`. Create per-town pages only
  when the owner can supply something unique per town (projects or photos there). Otherwise they are doorway pages.
- **Seasonal intent:** "fall leaf removal {town}", "pine straw installation {town}", "spring cleanup". Make sure the service
  names include these common phrasings, because the service cards double as keyword coverage.
- **Image SEO:** filenames and alt text with service + town ("mulch-bed-refresh-cullman-al.webp"). Galleries are most of the page weight
  and most of the unique content.
- Link to the Google Business Profile, and encourage the owner to post the same project photos there.
- Make the canonical quote URL short (`/quote`) and printable as a QR code for door hangers and yard signs.

---

## 12. Anti-patterns

Seen on weaker sites in the sample. Our templates must avoid them.

- **Unfinished template content left live.** Placeholder text, sample "John Doe" photo credits, unfilled footer placeholders
  and carousel slides still titled "Slide title" all appeared on live sites. Our publish step must fail on any placeholder token
  or empty required field.
- **Phone missing from the top of the page.** One site showed the number only near the bottom. Several showed it only as text,
  without a tap-to-call link (11/59 home pages had no `tel:` link at all).
- **Conflicting facts.** Different phone numbers, years in business and prices on different parts of the same site, and seasonal
  dates that had already passed. Our data model keeps each fact in one field, rendered everywhere from that field.
- **Fake urgency.** "Only N spots left" counters and pricing-lock pressure. They work against a small-town trust sell, and they go stale.
  We don't ship scarcity widgets. The owner can set a dated seasonal offer, and it auto-hides after its end date.
- **Generic, interchangeable copy.** At least two Cullman-area sites from search results shared near-identical wording and
  testimonials, and several testimonial blocks looked generic and unverifiable. Owner-supplied testimonials only; varied AI copy per client.
- **Heading misuse.** Many H1s on a page (one site had 14), "Welcome"/"Home" as the H1, and keyword-stuffed or misspelled titles.
- **No proof.** Pages with no photos, no testimonials and only a generic paragraph about "working with nature". Even 3 real
  photos beat stock-only.
- **Heavy, slow pages.** Background autoplay video, multi-megabyte unoptimized galleries, sliders and preloaders ("Loading… 0%").
- **Thin town pages and stale blogs.** Lots of near-duplicate "Lawn care in {Town}" pages and blogs last updated years ago.
  We don't generate either.
- **Dead or blocked sites.** Three candidates failed to load: a certificate error, a server error and a captcha wall in front
  of the home page. Cloudflare Pages hosting plus uptime checks should prevent this for our clients.
- **Dated layouts.** Fixed-width or frame-style pages, tiny text and image-only navigation. Everything we ship is mobile-first.
- **Forms that ask too much or too little.** Some had a comment box only (no phone field), others had long multi-field forms.
  Name + phone required, 5–6 fields total.
- **Hiding the service area.** By our keyword check, 21/59 home pages never name the towns or area they work in, so visitors can't tell if they qualify.
- **Prices without context.** A bare "$40" special with no unit or scope. Prices always carry "starting at" + unit + what's included.
