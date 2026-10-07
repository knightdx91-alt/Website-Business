# Category blueprint: Home-service contractors (plumbing, HVAC, roofing, electrical)

Researched October 2026 for the Cullman, AL starting market. This covers one category with four sub-trades.
The template is shared, and each trade gets its own variant (services, CTAs and a few trade-specific modules).

**Method, briefly.** I collected candidate sites from the Cullman Area Chamber of Commerce member directory
(construction and contractors category) and from organic searches such as "<trade> <small Southern city>",
with directory sites blocked. Cities covered: Cullman, Hanceville, Albertville, Guntersville, Horton, Decatur, Florence/Sheffield,
Huntsville, Birmingham, Tuscaloosa, Opelika/Auburn (AL); Jonesboro (AR); Hattiesburg (MS); Cleveland/Ooltewah (TN);
Valdosta, Rome, Gainesville, Atlanta (GA); Ruston/Monroe (LA). I added one non-Southern site that a design roundup cited, plus 8 chains
and franchises for feature ideas only.

I downloaded each home page's HTML (with a phone user-agent) and ran a script over it. The script counted tel: links, forms,
schema.org types, third-party scripts, link labels and keywords in the visible text. I also opened 8 sites with a
page reader to get section order and above-the-fold detail. **All counts below come from home pages only.** A feature that a site
only has on an inner page is not counted, so true frequencies are somewhat higher. Keyword counts are pattern matches, so treat
them as close estimates (roughly ±2), not exact audits.

**Base for frequencies: N = 60 sites with usable home-page HTML** (52 independents, 8 chains/regionals).
Trade split of the 60: HVAC 18, roofing 17, plumbing 12, electrical 9, multi-trade 4.

---

## 1. Summary

- **The phone is the product.** 57/60 home pages have a tap-to-call `tel:` link. 50/60 repeat it 3+ times, and on 51/60
  the first one sits in the top ~15% of the page (header or hero). The template must put a tap-to-call button above the fold
  on every page and keep it reachable while scrolling.
- **Two CTAs, chosen by trade.** Plumbing, HVAC and electrical lead with *Call* and *Schedule service*. Online booking or a
  service-request link shows up on 14/18 HVAC and 8/12 plumbing pages, but only 2/17 roofing pages. Roofing leads with *Call* and
  *Free inspection/estimate*: a free-estimate offer is on 15/17 roofing pages versus 2/9 electrical.
- **Trust is stacked, not stated once.** Reviews or testimonials appear on 50/60 pages, years in business or a founding year on 44/60,
  "licensed" on 41/60 and "licensed and insured" together on 31/60. Family-owned or multi-generation claims appear on 25/60, and only 15/60
  show an actual license number. A real license number and founding year are cheap, credible wins for our clients.
- **Each trade has a signature module.** HVAC has maintenance plans (14/18), financing (15/18) and utility rebates (8/18; TVA EnergyRight
  shows up in North Alabama). Roofing has storm and insurance-claim help (15/17), manufacturer certification (12/17) and a project
  gallery (16/17). Plumbing has 24/7 emergency service (8/12) and coupons or senior/military discounts. Electrical has
  generator, EV-charger and panel-upgrade services, and leans hardest on "licensed" (8/9).
- **Service areas matter.** 53/60 mention the area they serve, and 34/60 list 3+ named towns. 31/60 link to service-area pages,
  many of which are thin near-duplicate city pages. Our template should use one strong service-area section with a town list,
  not dozens of doorway pages.
- **The best small-town sites are long single pages with a short menu.** The median home page runs about 1,300 words. Many
  agency-built sites carry 40+ distinct link labels (33/60), which gives you mega-menus that are painful on a phone. For a business
  with no site today, a long home page with anchors plus a few real pages beats a 40-page shell.
- **The common failures are basic ones:** broken or parked domains, a JavaScript-only site that shows search engines an empty page,
  missing H1 (7/60) or several H1s (8/60), conflicting phone numbers, hours or founding years, expired coupons still on the page,
  and >1 MB home-page HTML (7/60). We can beat most local competitors just by being correct, fast and consistent.

---

## 2. Sample

Type: **Ind** = independent or single-market local business. **Reg** = multi-location regional company. **Chain** = national brand or franchise.
"Visited directly" = I fetched the live page myself. "No" = blocked by a bot check, so the row rests on search-result snippets only.

| # | Business | URL | City / State | Trade | Type | Visited directly |
|---|---|---|---|---|---|---|
| 1 | Bama Air Systems | bamaairsystems.com | Cullman, AL | HVAC | Ind | yes |
| 2 | Dye HVAC | dyehvac.com | Cullman, AL | HVAC | Ind | yes |
| 3 | Richard Electric Co. | richardelectric.net | Cullman, AL | HVAC + electrical | Ind | yes |
| 4 | Avans Electric | avanselectric.com | Cullman, AL | Electrical | Ind | yes |
| 5 | McPherson Electric | mcphersonelectricco.com | Cullman, AL | Electrical | Ind | yes (page reader only) |
| 6 | Mize Electric | mizeelectric.com | Cullman, AL | Electrical | Ind | yes (empty JS shell, excluded from counts) |
| 7 | Goss Electric | gosselectric.com | Cullman, AL | Electrical (industrial) | Ind | yes (industrial, excluded from counts) |
| 8 | Jonesy Plumbing & Contracting | jonesyplumbing.com | Cullman, AL | Plumbing | Ind | yes |
| 9 | Premier Plumbing | premierplumbingco.net | Cullman, AL | Plumbing | Ind | no (bot check) |
| 10 | 1 Source Roofing | 1sourcerfg.com | Cullman / Arab, AL | Roofing | Ind | yes |
| 11 | Roofing Services LLC | roofingservicellc.com | Cullman, AL | Roofing | Ind | yes |
| 12 | Willoughby Roofing & Sheet Metal | wrsminc.com | Cullman, AL | Roofing (mostly commercial) | Ind | yes |
| 13 | Bullard Roofing | bullardroofing.com | Cullman, AL | Roofing | Ind | no (bot check) |
| 14 | A, R & C Specialists | arandcspecialists.com | Hanceville, AL | HVAC / refrigeration | Ind | yes |
| 15 | Jackson Plumbing, Heating & Cooling | jacksonplumbingheatingandcooling.com | Decatur, AL | Multi-trade | Ind | yes |
| 16 | A Plumber | myaplumber.com | Decatur, AL | Plumbing | Ind | yes |
| 17 | River City Roofing Solutions | rivercityroofingsolutions.com | Decatur, AL | Roofing | Ind | yes |
| 18 | All Seasons Heating & Cooling | alabamacomfort.com | Albertville, AL | HVAC | Ind | yes |
| 19 | One Team Heating & Cooling | oneteamhvac.com | Guntersville, AL | HVAC | Ind | yes |
| 20 | Davis Heating & Cooling | davisheatingandcooling.pro | Guntersville, AL | HVAC | Ind | yes |
| 21 | Sewell Service Company | sewellservicecompany.com | Guntersville / Albertville, AL | HVAC | Ind | no (bot check) |
| 22 | Silas Heating & Cooling | silashvac.com | Horton, AL | HVAC | Ind | yes |
| 23 | Alabama Climate Control | alabamaclimatecontrol.com | Huntsville, AL | HVAC | Ind | yes |
| 24 | Henderson Roofing | hendersonroofing.net | Florence, AL | Roofing | Ind | yes |
| 25 | ICS Roofing & Construction | icsroofingco.com | Sheffield, AL | Roofing | Ind | yes |
| 26 | Cypress Roofing & Exteriors | cypressroofingexteriors.com | Florence, AL | Roofing | Ind | no (bot check) |
| 27 | Ridgeline Construction | ridgelineconstructionhsv.com | Athens, AL | Roofing | Ind | no (bot check) |
| 28 | B&A Roofing and Gutters | baroofings.com | Huntsville, AL (AL/MS/GA) | Roofing | Ind | yes |
| 29 | Hinkle Roofing | hinkleroofing.com | Birmingham, AL | Roofing / exteriors | Ind | yes |
| 30 | The Roofing Dudes | theroofingdudes.com | Birmingham, AL | Roofing | Ind | yes |
| 31 | Patriot Roofing & Builders | patriotroofingbirmingham.com | Birmingham, AL | Roofing | Ind | yes |
| 32 | Bama Roofing | bamaroofing.net | Tuscaloosa, AL | Roofing | Ind | yes |
| 33 | White Oaks Construction | whiteoaksconstruction.llc | Tuscaloosa, AL | Roofing | Ind | yes |
| 34 | Davis Roofing & Sheetmetal | davisroofingllc.com | AL/FL Gulf Coast | Roofing | Ind | yes |
| 35 | Thalamus Electric | thalamus-llc.com | Opelika, AL | Electrical | Ind | yes |
| 36 | Parker Service Company | parkerserviceco.com | Opelika, AL | Electrical | Ind | yes |
| 37 | First Source Electrical | firstsourceelectricllc.com | Opelika, AL | Electrical (mostly commercial) | Ind | yes |
| 38 | Nuckles & Son Plumbing | nucklesandsonplumbing.com | Jonesboro, AR | Plumbing | Ind | yes |
| 39 | Chris West Plumbing | chriswestplumbing.com | Jonesboro, AR | Plumbing | Ind | yes |
| 40 | Clayton Plumbing | claytonplumbingllc.com | Jonesboro, AR | Plumbing | Ind | yes |
| 41 | Clark Electric | clarkelectricms.com | Hattiesburg, MS | Electrical | Ind | yes |
| 42 | Baker Electric Co. | bakerelectricco.com | Cleveland, TN | Electrical | Ind | yes |
| 43 | Tilley Brothers Electric | tilleybrotherselectric.com | Cleveland, TN | Electrical | Ind | yes |
| 44 | Town and Country Electric | tcetn.net | Ooltewah, TN | Electrical | Ind | yes |
| 45 | Doyle Electric | doyleelectricllc.co | Chattanooga / Cleveland, TN | Electrical | Ind | no (bot check) |
| 46 | Red Valley Electric | redvalleyelectric.com | Cleveland, TN | Electrical | Ind | yes (site broken: domain error page) |
| 47 | Wright's Heating & Air Conditioning | hvacdonewright.com | Valdosta, GA | HVAC | Ind | yes |
| 48 | Davis Air Conditioning | davisairco.com | Valdosta, GA | HVAC | Ind | yes |
| 49 | Ray & Son Heating & Air | rayandson.com | Valdosta, GA | HVAC (+ plumbing) | Ind | yes |
| 50 | Rowe Air Conditioning | roweair.com | Valdosta, GA | HVAC | Ind | yes |
| 51 | Waller Heating & Air | wallerhvac.com | Valdosta, GA | HVAC | Ind | yes |
| 52 | Absolute Comfort AC | absolutecomfortvaldosta.com | Valdosta, GA | HVAC | Ind | yes |
| 53 | Crider Plumbing Co. | criderplumbing.com | Rome, GA | Plumbing | Ind | yes |
| 54 | Bluestream Plumbing | blue-streamplumbing.com | Rome / metro Atlanta, GA | Plumbing | Ind | yes |
| 55 | Gainesville Plumbing | gainesvilleplumbing.us | Gainesville, GA | Plumbing | Ind | yes |
| 56 | MasterCraft Plumbing | mastercraftproservices.com | Gainesville / NE Georgia | Plumbing | Ind | yes |
| 57 | Atlantis Plumbing | atlantisplumbing.com | Atlanta, GA | Plumbing | Ind | yes |
| 58 | Keep Smiling Plumbing, Electric, Heating & Cooling | callkeepsmiling.com | Loganville / metro Atlanta, GA | Multi-trade | Ind | yes |
| 59 | Mixon Roofing & Waterproofing | mixonroofinginc.com | Choudrant / Ruston, LA | Roofing | Ind | yes |
| 60 | Golden Roofing | goldenroofingcontractor.com | Monroe, LA | Roofing | Ind | yes |
| 61 | HUDCO Roofing & Exteriors | hudcoroofing.com | Louisiana (statewide) | Roofing | Ind | yes |
| 62 | Smock HVAC | smockhvac.com | Frederick, MD | HVAC | Ind (design-roundup pick, not Southern) | yes |
| 63 | Buffington Brothers | buffingtonbrothers.com | Poplar Bluff, MO / NE Arkansas | HVAC | Reg (family-owned, multi-location) | yes |
| 64 | Hiller | happyhiller.com | Nashville, TN + 3 states | Multi-trade | Reg / chain | yes |
| 65 | Lee Company | leecompany.com | Franklin, TN (TN/AL/GA/KY) | Multi-trade | Reg / chain | yes |
| 66 | Quick Roofing | quickroofing.com | Texas HQ; Lake Charles, LA office | Roofing | Reg / chain | yes |
| 67 | Mr. Rooter of Tupelo & Oxford | mrrooter.com/tupelo | Tupelo, MS | Plumbing | Chain (franchise) | yes |
| 68 | Roto-Rooter Decatur | rotorooter.com/decatural | Decatur, AL | Plumbing | Chain | yes |
| 69 | Mr. Electric of Hattiesburg | mrelectric.com/hattiesburg | Hattiesburg, MS | Electrical | Chain (franchise) | yes |
| 70 | Aire Serv of Valdosta | aireserv.com/valdosta | Valdosta, GA | HVAC | Chain (franchise) | yes |
| 71 | Mister Sparky | mistersparky.com | National | Electrical | Chain (franchise) | yes (page reader only) |

**Counts.** 71 sites listed. 65 were fetched directly. 63 returned usable content: 60 full HTML feed the frequency counts, and
3 others were read but kept out of the counts (McPherson and Mister Sparky through the page reader only, Goss because it is
industrial). Mize returned an empty JavaScript shell and Red Valley returned a domain error. 6 sites (Premier, Bullard,
Cypress, Sewell, Ridgeline, Doyle) were blocked by bot-check pages, so they are known only from search snippets.
Two more candidates were dropped because the domain was parked (a Florence HVAC dealer) or did not respond.

---

## 3. Pages

Frequencies come from the link labels on each home page (header menu, mega-menu, footer). N = 60.

| Page / nav item | Count | Notes |
|---|---|---|
| Contact | 49/60 | Almost universal. |
| Services (index or dropdown) | 44/60 | Usually a dropdown with one page per service. HVAC and roofing menus often hold 15–40 service links. |
| About (story, team, "meet the owner") | 41/60 | "Meet the team" / owner pages are common on family firms. |
| Commercial (separate link or page) | 33/60 | 45/60 mention both residential and commercial work. |
| Estimate / quote / inspection link | 32/60 | Mostly roofing and HVAC replacement. |
| Blog / resources | 32/60 | Usually SEO-agency driven. Many posts are generic. |
| Reviews / testimonials page | 31/60 | |
| Service areas (index or city pages) | 31/60 | Often one thin page per town. |
| Book / schedule / request service | 29/60 | |
| Financing | 26/60 | |
| Gallery / projects / our work | 22/60 | Roofing far more than others. |
| Careers / join our team | 21/60 | Shows the company is growing. Optional for us. |
| Specials / coupons / offers | 20/60 | Plumbing and HVAC. |
| Emergency service page | 19/60 | |
| FAQ page | 17/60 | 38/60 put FAQ content on the home page itself. |
| Maintenance plan / club page | 12/60 | Nearly all HVAC. |
| Insurance claims page | 9/60 | Roofing only. |
| Warranty page | 5/60 | Roofing mostly. |

**Recommended page set for our template**

| Page | Status | Notes |
|---|---|---|
| Home (long, anchored sections) | **Required** | Holds services, reviews, service area, FAQ and contact. Most clients need nothing else. |
| Contact / Request service (or estimate) | **Required** | Can be the home page's `#contact` section plus a standalone `/contact` for ads and QR codes. |
| Privacy policy | **Required** if the site has a form | 45/60 link one. Needed once we collect name/phone. |
| Service detail pages (3–6) | Optional, recommended when the owner confirms the services | One page per *major* service (e.g. "Water heater repair & replacement"). Each needs unique, substantial content. Skip it if the content would be thin. |
| About / Our story | Optional | Only when the owner gives real story facts (founding year, family, owner name). Otherwise keep a short About section on Home. |
| Gallery / Our work | Optional, **default ON for roofing** | Owner photos only (Google photos can't be re-hosted). Hide the page if there are fewer than 6 photos. |
| Financing | Optional | Only when the owner names a lender or program. Otherwise one line in the FAQ. |
| Emergency service | Optional | Only if the owner confirms after-hours service. |
| Maintenance plan | Optional, HVAC | Only when the owner has a plan with real terms. |
| Storm damage & insurance claims | Optional, roofing | |
| Service-area city pages | **Not in v1** | They tend to be near-duplicate "doorway" pages. One strong service-area section works better. |

**Single long page versus many pages:** for this category, use a single long home page with anchor navigation, plus a few
real subpages. Here is why:
- Our clients have no site today and limited real content. A 1,000–1,600-word home page (the sample median is about 1,300 words) can cover
  everything that matters. Thin extra pages add maintenance and weak SEO.
- Visitors arrive with one urgent job (a leak, no heat, a storm). They want the phone number, proof of trust and confirmation
  that the company serves their town, and all of that fits on one scroll.
- The multi-page sites in the sample are mostly agency builds aimed at SEO for many keywords. That is worth adding later, when a client
  pays for growth (an upsell tier: "service pages pack").

---

## 4. Home page section order

This is a synthesis of the heading order on all 60 home pages, plus section-by-section reads of 8 sites (Bama Air Systems,
River City Roofing, Parker Service Co., Nuckles & Son, Patriot Roofing, Mister Sparky, McPherson Electric, and the heading outline of
the rest). The strongest independent sites converge on roughly this order:

1. **Utility strip** (optional, thin): emergency or 24/7 note, or hours, plus license number. *(Seen on many HVAC/plumbing sites.)*
2. **Header:** business name or logo, tap-to-call phone, one primary button (Schedule / Free estimate), and a short menu or hamburger.
3. **Hero:** an H1 that names the trade and town (34/60 put a city or region in the H1), a one-line promise, **two buttons**
   (Call now + Request service/estimate) and a row of 2–4 trust chips (licensed & insured, years or founding year, rating, 24/7).
4. **Trust strip:** badges such as license, insurance, family-owned, BBB, and manufacturer or dealer certifications (roofing/HVAC).
5. **Services grid:** 6–9 cards, each with an icon, a short blurb and a link (or anchor) to details.
6. **Why choose us:** 3–6 short points, such as owner on the job, upfront pricing, clean work, on-time arrival, or warranty.
7. **Reviews:** 3 short testimonials, the overall rating and a link to all reviews on Google.
8. **Trade module** (one of these):
   - HVAC: maintenance plan tiers, financing and rebates
   - Plumbing: emergency service, plus coupons/discounts
   - Roofing: storm and insurance-claim help, then the gallery
   - Electrical: generators, EV chargers and panel upgrades as a feature band
9. **How it works:** 3–4 numbered steps (call or request, visit/inspection, clear quote, work done and cleaned up).
   This appeared as a distinct section on several of the best-organized sites (Parker, Patriot, Wright's).
10. **Gallery / recent projects** (roofing strongly, others optional).
11. **Service area:** a named list of towns and counties, plus a "not sure? call us" line and a map link.
12. **About / meet the owner:** photo, short story and founding year.
13. **FAQ:** 5–6 questions (38/60 have FAQ content on the home page, and 16/60 mark it up with FAQPage schema).
14. **Final CTA band:** repeat the phone number and primary button.
15. **Footer:** full NAP (name, address, phone), hours, license number(s), service-area summary, links, social, privacy.

**Above the fold on a phone (about 390×750 px):** name/logo, a **tap-to-call button with the number visible**, the H1 (trade + town),
a one-line subhead, the primary CTA button and at most one row of 2–3 trust chips. No carousel and no autoplay video. Keep a background
photo light and dark-overlaid, or skip it.
An inline lead form in the hero was rare (11/60, mostly chains and big-agency builds), so on mobile we put the short form
**directly below the hero** (as Parker does) rather than squeezing it into the first screen.

---

## 5. Features and calls to action

### Primary and secondary CTA

| Trade | Primary CTA | Secondary CTA |
|---|---|---|
| Plumbing | Call now (tap-to-call) | Request service / Book online |
| HVAC | Call now | Schedule service / Book online. Replacement: "Free estimate on new systems" |
| Electrical | Call now | Request service / Free quote |
| Roofing | Free inspection / estimate | Call now. "Text us photos" is a nice extra |

### Must-have (template ships these for every client)

| Feature | Frequency (N=60) | Notes |
|---|---|---|
| Tap-to-call phone in header + hero, repeated | 57/60 have `tel:`, 50/60 have 3+ | Use the national format (256) 555-0123 and an E.164 `tel:` link. |
| Reviews / testimonials section | 50/60 | Owner-supplied testimonials, plus a link to the Google profile. Don't quote Google review text (compliance). |
| Service-area statement + town list | 53/60 mention it; 34/60 list 3+ towns | |
| Services list | ~all | Trade-specific defaults the owner can toggle. |
| Years in business / founding year | 44/60 | Owner-supplied only. |
| Licensed (and insured) | 41/60 "licensed"; 31/60 both | Show the license number when the owner gives it (15/60 do). Alabama has separate boards for plumbing/gas, electrical, HVAC and home builders, so the label should say which license. |
| Hours | 37/60 show hours | From Places. "24/7" only when the owner confirms it. |
| Residential and commercial | 45/60 | Toggle. |
| Request form (name, phone, service, town, message) | 35/60 have a form on the home page | Short. Phone is required, email optional. |
| FAQ | 38/60 | 5–6 entries. |
| Final CTA band + full footer NAP | ~all | |

### Strongly recommended (on by default when data exists)

| Feature | Frequency | Notes |
|---|---|---|
| Emergency / 24/7 messaging | "emergency" 42/60; 24/7 or 24-hour 31/60 (plumbing 8/12, HVAC 11/18, roofing 6/17) | Show it only if the owner confirms after-hours service, and show the after-hours terms honestly. |
| Financing | 39/60 mention it (HVAC 15/18, roofing 14/17, plumbing 5/12, electrical 2/9) | Link to the lender's application page. |
| Warranty / guarantee | 37/60 | Owner states the terms. Never let AI invent warranty terms. |
| Free estimate / inspection | 31/60 (roofing 15/17) | Roofing default. HVAC "free estimate on replacements". |
| Gallery / project photos | Gallery or projects wording on 45/60; gallery page 22/60 | Roofing default ON. No home page in the sample labels before/after pairs (0/60). The best roofing sites use project cards (photo, town, roof type) instead. Offer project cards plus an optional before/after pair block as a differentiator. |
| Online booking link | 32/60 mention booking/scheduling; 11/60 have a detectable booking widget | Plumbing/HVAC/electrical. Link out to the owner's tool. |
| Family-owned / locally owned / veteran-owned | 25/60 family; 16/60 locally owned; few veteran-owned | Owner confirms. Strong in small Southern towns. |
| Manufacturer / dealer certifications | 25/60 (roofing 12/17, HVAC 9/18) | Show as a text list or badges only with the owner's permission to use the marks. |
| Star rating + review count | 16/60 show one on the home page | See compliance note in section 8. |

### Nice-to-have (optional modules)

| Feature | Frequency | Notes |
|---|---|---|
| Maintenance plan / club (tiers) | 25/60 (HVAC 14/18) | 2–3 tier cards. Owner sets the terms. |
| Coupons / specials | 22/60 | Every coupon needs an expiry date, and the template hides expired ones automatically. |
| Upfront / flat-rate pricing, no trip fee | 16/60 | Diagnostic or trip fee shown on 6/60. Show it if the owner wants. |
| Storm / insurance-claim help | 16/60 (roofing 15/17) | Roofing only. |
| Same-day service | 14/60 | |
| Senior / military / first-responder discount | 11/60 (plumbing 5/12) | |
| Referral program | 13/60 | |
| Utility rebates (e.g. TVA EnergyRight in North AL) | 8/60, all HVAC | Link to the utility program page. |
| "Best of" local award badges | 15/60 mention awards | Owner-supplied, with year. |
| Careers | 25/60 mention hiring | A "We're hiring" line plus email/phone is enough. |
| Text-us link (`sms:`) | 4/60 | Rare in the sample, but cheap and useful for photos of leaks and roof damage. We recommend it, and the owner must opt in. |
| Payment methods accepted | ~18/60 (loose match) | Simple icon row (cards, cash, check). |
| Roof visualizer / instant quote / storm-check tool | 6/60 | Link out only. |
| Customer portal login | 2/60 | Link out only. |

### Trust signals ranked by how often they appear
Reviews/testimonials (50) > years/founding (44) > licensed (41) > warranty (37) > licensed+insured (31) > family-owned (25)
\> manufacturer certifications (25) > star rating shown (16) > award badges (15) > license number (15) > BBB (9) > Google Guaranteed (4).

---

## 6. Third-party integrations

These were detected in home-page code (script, iframe and link hosts). N = 60. Detection misses tools that load only on inner pages.

| Purpose | Tools seen (count) | How they're used |
|---|---|---|
| Online booking / dispatch | ServiceTitan scheduler (6), Housecall Pro (5); none seen for Jobber or Calendly | A "Book now" button opens the vendor's hosted scheduler (popup or new page) |
| Financing | GreenSky (4), Wells Fargo home projects card (4), Synchrony (2), GoodLeap (2), Wisetack (1), Service Finance (1), AccuLynx's AccuFi (1, roofing) | Lender logo + "Apply" link to the lender's application URL. Some use a dedicated Financing page |
| Reviews | Trustindex (7), WordPress Google-review widgets (5), Podium (3), Birdeye (2), Elfsight (2) | JavaScript widgets that pull Google reviews into a carousel |
| Chat / texting | Podium, LeadConnector/GoHighLevel and other chat bubbles (9 total) | Floating bubble at the bottom right |
| Call tracking | CallRail (8) | Swaps the displayed phone number per traffic source |
| Forms | Gravity Forms (8), Contact Form 7 (6), plus builder forms. reCAPTCHA on 30/60 | Native forms posting to the site's CMS |
| Maps | Google Maps iframe (17; map embeds of any kind about 24) | Embedded map of the office or service area |
| Roofing tools | Roofle-style instant quote and roof visualizers (6 with any such tool) | Link or embedded widget |
| Accessibility overlays | accessiBe / UserWay (3) | Not recommended (see anti-patterns) |

**What our static template should support** (all as plain links or optional lazy embeds, no server code on the client site):

1. **Booking URL** (generic field), with button label presets for ServiceTitan, Housecall Pro, Jobber, Calendly and Square Appointments.
   Default: open in a new tab. An optional iframe embed sits behind a "Book online" click, so third-party scripts never load
   on page view.
2. **Financing URL + lender name** (GreenSky, Synchrony, Wisetack, Service Finance, GoodLeap, Hearth, Wells Fargo, or "other").
   Render a text button plus an optional lender logo the owner supplies. No embedded calculator.
3. **Google reviews link** (the Place's `googleMapsUri`) and an optional "Leave us a review" link. **No live review widget**:
   widgets are heavy and pull Google review text onto the page, which our compliance rules forbid. Show owner-supplied
   testimonials instead.
4. **Facebook / Instagram / Nextdoor / YouTube links** (many prospects only have a Facebook page today; link it).
5. **Call-tracking number override** (optional field; if set, it replaces the display number everywhere except schema, where
   the main number stays for NAP consistency).
6. **Lead form** posting to *our* shared Cloudflare Worker endpoint, which emails or texts the owner. Use Cloudflare Turnstile
   instead of reCAPTCHA. Add a honeypot field. With JavaScript off, the form still works through a plain POST, and `tel:` / `sms:` links are always present.
7. **Map**: a static "Get directions" link by default. Use a lazy-loaded Maps iframe only when the business has a storefront.
   Service-area-only businesses can hide the street address (see section 9).
8. **Roofing extras** (optional link fields): instant-quote tool URL, manufacturer warranty page, insurance-claim guide.

---

## 7. Mobile behavior

- **Tap-to-call everywhere.** 57/60 have `tel:` links and 50/60 repeat them 3+ times. The phone button appears in the top ~15% of the
  page on 51/60.
- **Sticky bottom action bar.** At least 10/60 have a fixed bottom bar with Call and Book/Estimate buttons visible in the
  static markup. That includes all three Neighborly franchises, Parker, Patriot, Waller, Ray & Son, Mixon, Atlantis and Keep Smiling.
  More sites likely add one with JavaScript (site builders such as Duda inject mobile call buttons), so this is an undercount.
  **Template rule:** on screens under 768 px, show a fixed bottom bar with two buttons, *Call* and the trade's secondary CTA.
  It must not cover the footer (add bottom padding equal to the bar height) and must respect the iOS/Android safe area.
- **Sticky header.** Some sites (e.g. Parker) also make the header sticky. We use a compact header that hides on scroll-down and
  shows on scroll-up, so it doesn't fight the bottom bar.
- **Menus.** Most sample sites use a hamburger that opens a long accordion mega-menu (33/60 home pages carry 40+ distinct link labels).
  That's the weakest mobile pattern seen. Our template keeps ≤6 top-level items (Services, Service area, Reviews, About, Contact),
  with services as on-page anchors.
- **Images.** 51/60 lazy-load images, and 7/60 ship more than 1 MB of HTML before images. We will use responsive `srcset`, WebP/AVIF, explicit
  width/height (no layout shift), lazy-loading below the fold, and no hero carousels.
- **Forms.** Keep 4–5 fields on mobile with `type="tel"` and `autocomplete` attributes. Put a service dropdown before the message box.
  Add a large submit button and a visible "or call (xxx) xxx-xxxx" fallback.
- **Popups.** Coupon and lead popups show up on several HVAC/plumbing sites, including a separate mobile popup on one. We avoid interstitials
  on mobile: they block the phone number and Google discourages intrusive interstitials.
- **Chat bubbles** (9/60) cover the bottom-right corner, where the sticky bar goes. We leave them out.
- **Text us.** `sms:` links are rare (2/60 in markup, 4/60 mention texting) but suit roofing and plumbing, where photos help.
  Offer it as an optional third action in the menu, not in the bar.

---

## 8. Content the AI must write

**Global tone:** plain, neighborly and confident. Write at a 6th–8th grade reading level with short sentences and active voice. Name the town and
nearby towns naturally. No hype words ("best", "#1", "unmatched") unless the owner supplies a sourced award. **The AI writes no numbers or
claims it was not given:** no years, license numbers, warranty lengths, prices, response times, review counts or "24/7".
Missing facts become owner-review placeholders, not guesses.

| Section | Copy needed | Length | Notes |
|---|---|---|---|
| Hero H1 | Trade + town, e.g. "[Trade] in [Town], [ST]" pattern | 4–9 words | One H1 per page. Three variants for the owner to pick from. |
| Hero subhead | One-line promise built from confirmed facts | 12–22 words | |
| Trust chips | 2–4 short labels from confirmed fields | 2–4 words each | Only from data fields, never invented. |
| Services cards | Blurb per service | 25–45 words each | Trade-accurate, no prices. Default service lists per trade (below). |
| Service detail pages (optional) | Problem, signs you need it, what we do, what to expect, FAQ (2–3), CTA | 400–700 words | Only for services the owner confirms. Unique per client. |
| Why choose us | 3–6 points, each with a title and one sentence | 10–25 words each | Built from owner answers (owner-operated? cleanup? upfront quotes?). |
| How it works | 3–4 steps | 8–18 words each | Generic but trade-correct (roofing: inspection → quote → install → cleanup and final walkthrough). |
| Trade module | Maintenance plan, emergency, storm/insurance, or generator/EV band | 40–90 words | Uses the owner's real terms. |
| Service area | Paragraph + town list | 50–90 words | Towns from owner, else drafted from a radius around the address (owner confirms). |
| About / owner | Short story | 80–150 words | Needs the owner's facts. If none, the AI writes a neutral 2-sentence version flagged for review. |
| FAQ | 5–6 Q&A | 40–80 words per answer | Common homeowner questions per trade (when to replace a water heater, how storm inspections work, what a tune-up covers). Never state prices or legal/insurance guarantees. |
| Final CTA | Heading + one line | 6–20 words | |
| Meta title / description | Per page | ≤60 / ≤155 chars | Pattern in section 11. |
| Image alt text | Per image | 6–15 words | Describes the actual photo. |
| Reviews intro | One line | ≤15 words | The testimonials themselves come from the owner. |

**Default service lists (owner toggles; AI writes blurbs):**
- *Plumbing:* leak repair, drain cleaning, water heaters (tank/tankless), toilets & fixtures, sewer & water lines, gas lines,
  sump pumps, repiping, water filtration/softeners, septic (optional), emergency plumbing.
- *HVAC:* AC repair, AC replacement, heat pumps, furnaces/heating, ductless mini-splits, tune-ups/maintenance plans, ductwork,
  indoor air quality, thermostats, mobile/modular home HVAC (common in the rural South), light commercial.
- *Electrical:* troubleshooting & repairs, panel upgrades, outlets & switches, lighting (indoor/outdoor), ceiling fans, whole-home
  generators & transfer switches, EV chargers, surge protection, rewiring, new construction, inspections.
- *Roofing:* roof replacement, roof repair & leaks, storm/hail damage & insurance claims, inspections, metal roofing, shingle roofing,
  flat/low-slope (commercial), gutters, siding/soffit/fascia, emergency tarping.

**Data sources**

| Comes from Google Places | Must come from the owner (or stays hidden) |
|---|---|
| Business name, phone, formatted address, coordinates, regular opening hours (incl. open 24 hours), primary type / types, rating + rating count (see caveat), Google Maps URL, business status | License number(s) and which board, insured yes/no, founding year, 24/7 / after-hours policy, financing lender + link, warranty terms, certifications and dealer status, service-area towns, services offered, photos, testimonials (with permission), owner name & story, maintenance plan terms, coupons with expiry, booking URL, social links, payment methods, discounts |

**Compliance caveats for copy:**
- Google reviews may be used as *private context* for the AI (e.g. "customers mention clean work"), but no review text is quoted
  on the site.
- A star rating pulled from Places is Places content with caching limits. Don't bake it into a published static page and leave it there
  forever. Either the Worker refreshes it on a schedule, or the owner states it ("4.9 stars on Google") and we link to the Google profile.
- Google photos may appear in the private preview only. The publish step swaps in owner, stock or AI images.

---

## 9. Data model

`R` = required, `O` = optional. Source: **P** = Google Places, **AI** = generated, **OW** = owner, **SYS** = our system.

```
business
  place_id                  R  P    (stored indefinitely per Places terms)
  name                      R  P    (owner may edit the display name)
  trade                     R  SYS  enum: plumbing | hvac | electrical | roofing | multi
                                    (mapped from Places types such as plumber, electrician, roofing_contractor,
                                    general_contractor + name keywords; HVAC usually needs name/keyword
                                    detection. Owner confirms.)
  trades_secondary[]        O  OW   e.g. hvac + plumbing
  phone_display             R  P
  phone_e164                R  SYS  derived
  sms_enabled               O  OW   default false
  tracking_phone            O  OW   call-tracking override (display only)
  email                     O  OW   lead notifications
  address {street, city, state, zip}   R  P
  hide_street_address       O  OW   true for service-area businesses without a storefront
  geo {lat, lng}            R  P
  google_maps_url           R  P
  hours[] {day, open, close}           O  P    (refresh; may be empty)
  open_24_7                 O  OW   explicit owner confirmation only
  after_hours_note          O  OW   e.g. "after-hours rates apply"
  business_status           R  P    must be OPERATIONAL to generate
  rating, rating_count      O  P    display rules in section 8; refresh or owner-state
  founded_year              O  OW
  ownership_tags[]          O  OW   family_owned | locally_owned | veteran_owned | woman_owned | multi_generation
  owner {name, title, photo, bio_facts}  O  OW
  licenses[] {board_label, number, state}  O  OW  (strongly encouraged)
  insured                   O  OW   boolean
  bonded                    O  OW   boolean
  certifications[] {name, logo_permission}  O  OW   e.g. manufacturer programs, NATE, master plumber
  awards[] {name, year, source}           O  OW
  bbb_url                   O  OW
  residential               R  OW   default true
  commercial                O  OW
  services[] {id, name, blurb, featured, has_page}   R  defaults by trade (SYS) -> owner toggles -> blurbs AI
  service_area {towns[], counties[], radius_miles}   R  towns drafted by SYS from radius, owner confirms
  emergency_service         O  OW
  free_estimates            O  OW   (default true for roofing, owner confirms)
  financing {lender, url, note}           O  OW
  booking {provider, url}   O  OW   servicetitan | housecallpro | jobber | calendly | square | other
  maintenance_plan {name, tiers[] {name, price_text, perks[]}}  O  OW  (HVAC)
  offers[] {title, detail, expires_on}    O  OW   auto-hidden after expiry
  discounts[]               O  OW   senior | military | first_responder | multi_service
  warranty_text             O  OW   never AI-generated
  pricing_notes             O  OW   e.g. diagnostic fee, "no trip charge"
  storm_insurance_help      O  OW   (roofing)
  payment_methods[]         O  OW
  testimonials[] {quote, name_initial, town, service, date}   O  OW   (with customer permission)
  photos[] {url, alt, kind: hero|team|truck|project|before|after}  O  OW/stock/AI (no Google photos on publish)
  social {facebook, instagram, nextdoor, youtube}   O  OW (often found during qualify step)
  hiring {enabled, contact}  O  OW

content (AI, owner-reviewed)
  hero_h1_options[3], hero_sub, trust_chips[], why_us[], process_steps[], trade_module_copy,
  service_area_copy, about_copy, faq[] {q, a}, cta_final, meta {title, description} per page, alt_text per image

site
  look                      R  SYS  one of the looks in section 10 (see neighbor rule)
  accent_variant            O  SYS
  slug / pages_project      R  SYS
  noindex_preview           R  SYS  true until publish
  privacy_policy            R  SYS  generated from template when form enabled
```

---

## 10. Design looks

These are four original looks built from the patterns above, not modeled on any site in the sample. Each one is a complete token set
(color, type, radius, photo direction and layout rhythm). **Neighbor rule:** two clients in the same trade within ~30 miles never share a
look, and two clients of any trade in the same town shouldn't share both look *and* accent. Every combination must meet WCAG AA contrast
for text and buttons.

### Look A: "Toolbox"
- **Mood:** practical, sturdy, no-nonsense. A working crew, not a marketing department. Good default for plumbing and electrical.
- **Palette:** deep graphite `#1F2933`, high-visibility amber `#F2A900` (buttons and highlights, used with dark text), concrete
  `#E9E7E2` (section backgrounds), white `#FFFFFF`, steel blue `#3E5C76` (links, secondary).
- **Fonts (Google):** headings in **Barlow Condensed** (600/700, uppercase for section labels only), body in **Source Sans 3** (400/600).
- **Photos:** crew and truck in daylight, hands on tools and fittings, tight crops. A slight cool grade with honest, unposed moments.
- **Layout feel:** square corners (2 px radius), heavy 4 px amber rules over section titles, numbered steps in large condensed
  numerals, services as a dense 2-column grid on mobile with line icons. Bottom bar: amber Call button + graphite secondary.

### Look B: "Front Porch"
- **Mood:** warm, hometown, family-run, "we've been here a long time." Good default for multi-generation family firms of any trade.
- **Palette:** buttermilk `#FBF5E9` (page background), brick red `#9E3B2C` (primary buttons), pine green `#2E4A3B` (headings, footer),
  honey `#D49A3A` (accents, rating stars), ink `#2B2622` (body text).
- **Fonts (Google):** headings in **Zilla Slab** (600/700), body in **Nunito Sans** (400/700).
- **Photos:** owner and family or team portrait in front of the shop or truck, homes with porches and yards, warm late-day light.
- **Layout feel:** soft 12 px radius cards, a round "Serving [Town] since [year]" seal (only if founding year exists), testimonial cards
  with a large open-quote glyph, a subtle paper texture in the hero, and generous spacing. Bottom bar: brick Call + pine secondary.

### Look C: "Clear Air"
- **Mood:** clean, modern, calm and technical. Good default for HVAC, and also suits electrical/EV/generator-heavy shops.
- **Palette:** white `#FFFFFF`, cool mist `#EEF4F8` (alternating bands), deep harbor blue `#123E63` (headings, header),
  bright teal `#1A9E8F` (primary buttons with white text), warm coral `#E8664D` (emergency and heating accents, used sparingly).
- **Fonts (Google):** headings in **Manrope** (700/800), body in **Figtree** (400/600).
- **Photos:** bright interiors, technician at an outdoor unit or panel, clean equipment close-ups, lots of negative space, light grade.
- **Layout feel:** airy, 16 px radius cards with soft shadows, a "cool/heat" two-tone split for HVAC service cards, maintenance-plan tiers as
  three clean columns, and pill-shaped trust chips. Bottom bar: teal Call + outlined secondary.

### Look D: "Ridgeline"
- **Mood:** bold, outdoorsy, built to weather storms. Good default for roofing and exteriors.
- **Palette:** charcoal slate `#23272B` (header, hero overlay), weathered copper `#B4652E` (primary buttons), storm sky `#8DAFC4`
  (accents, links on dark), limestone `#F3F0EA` (light sections), white `#FFFFFF`.
- **Fonts (Google):** headings in **Big Shoulders Display** (700/800), body in **Public Sans** (400/600).
- **Photos:** wide shots of finished roofs against the sky, drone/overhead angles, crews on pitch with safety gear, before/after pairs
  shot from the same angle.
- **Layout feel:** full-bleed photo bands with dark overlays, a single angled edge at the hero bottom (once per page only), and a project
  gallery as a 2-up grid with captions (town + roof type). Insurance/storm help gets a framed callout. Bottom bar: copper "Free inspection" +
  slate Call.

**Default look by trade:** plumbing → A, HVAC → C, electrical → A or C, roofing → D, family/multi-generation → B (any trade).
The neighbor rule then rotates to the next look if a nearby same-trade client already has the default. Each look also ships two
accent variants (e.g. Toolbox with safety-orange `#E8590C` instead of amber), which gives 8 combinations.

---

## 11. Local SEO

**Schema.org (JSON-LD on every page).** 39/60 sample sites have some LocalBusiness-family schema, but only 21/60 use a trade-specific
type. That's an easy edge for us.
- Plumbing → `Plumber`. HVAC → `HVACBusiness`. Electrical → `Electrician`. Roofing → `RoofingContractor`. All are subtypes of
  `HomeAndConstructionBusiness`. Multi-trade → an array, e.g. `["HVACBusiness","Plumber"]`.
- Include: `name`, `url`, `telephone`, `address` (PostalAddress; omit `streetAddress` when hidden for service-area businesses),
  `geo`, `openingHoursSpecification` (or 00:00–23:59 all days only when the owner confirms 24/7), `areaServed` (array of `City`
  with names, plus counties as `AdministrativeArea`), `priceRange` (owner, optional), `sameAs` (Google Maps URL, Facebook, BBB),
  `founder`/`foundingDate` (owner), `hasOfferCatalog` listing the services, `image`, `logo`.
- `FAQPage` markup for the FAQ block (16/60 do this). Keep it true to the visible text.
- Don't mark up `AggregateRating` or `Review` from Google reviews on the business's own site. Google doesn't show self-serving
  review stars for local businesses, and the content would be re-hosted Google data.
- `BreadcrumbList` on subpages. `WebSite` on home.

**Title and meta patterns**
- Home title: `{Primary trade service} in {Town}, {ST} | {Business Name}`, e.g. "Plumber in Cullman, AL | Smith Plumbing", ≤60 chars.
  For a multi-trade business, try `Heating, Air & Plumbing in {Town}, {ST} | {Name}`.
- Service page title: `{Service} in {Town}, {ST} | {Name}`.
- Meta description: `{Name} offers {top 2–3 services} in {Town}, {Town2} and {Town3}. {Confirmed trust fact}. Call {phone}.` ≤155 chars.
- H1 = trade + town (34/60 of the sample do this). There is exactly one H1 per page (8/60 have several; 7/60 have none).

**NAP consistency**
- Name, address and phone must match the Google Business Profile exactly, in the header/footer, contact section and schema. The sample
  shows real drift in search snippets: one Valdosta HVAC site's schema carried a different phone number than its page, and two
  Decatur-area plumbing pages advertised 24/7 service while their schema listed weekday-only hours.
- Founding year and "X years" must agree. Compute "years" from `founded_year` at build time, don't type it.
- A call-tracking number goes in the visible display only. Schema and footer keep the main number.

**Category-specific**
- **Service-area businesses:** many contractors work from home. Support `hide_street_address`, and still show city + state and a town
  list. This matches how Google Business Profile treats service-area businesses.
- **Town list:** name the real towns and counties served (e.g. Cullman, Hanceville, Good Hope, Vinemont, Holly Pond, Arab, and Cullman/
  Morgan/Blount/Marshall counties for a Cullman client). Use one section, not thin per-city pages.
- **Seasonal and weather intent:** HVAC copy should cover heat-pump use, humidity and mobile/modular homes. Roofing should cover hail and wind
  storms and Fortified roofing (Alabama has a Fortified roof program). Plumbing should cover freezes, well/septic in rural areas and water
  heaters. Electrical should cover storm-season generators. Owners confirm what they actually do.
- Link to the Google Business Profile (`sameAs` + a visible "Reviews on Google" link). Owners should add the new site URL to their
  profile at publish time. Add that step to the publish checklist.
- Performance is part of SEO: static pages, compressed images and no third-party scripts on load put us well ahead of the 7/60 sample
  sites with more than 1 MB of HTML.

---

## 12. Anti-patterns

These were seen in the sample (counts where measured) and our templates must avoid them:

1. **Dead, parked or broken domains.** One Cleveland, TN electrician's domain shows a site-builder "connect your domain" error, and a
   Florence HVAC dealer's domain listed in a manufacturer's dealer directory is parked. *Ours:* monitor the domain and SSL after publish.
2. **JavaScript-only sites that render empty without JS.** One Cullman electrician's site serves about 16 words of HTML. Search engines and
   link previews see almost nothing. *Ours:* fully static HTML.
3. **No tap-to-call link** (3/60 had none in the HTML). *Ours:* `tel:` is always present.
4. **Heading chaos:** no H1 (7/60) or several H1s (8/60), and headings used as styling (a review author's name as an H2, empty headings).
   *Ours:* one H1, logical H2/H3.
5. **Contradictory facts:** "since 19XX" versus "XX years" that don't add up (two sites per search snippets), 24/7 claims with weekday-only
   hours in schema, and different phone numbers in schema versus the page. *Ours:* single source of truth, computed values.
6. **Stale promotions:** a coupon left on the home page marked "expired." *Ours:* offers carry `expires_on` and auto-hide.
7. **Template leftovers and typos:** placeholder labels left in menus (e.g. a gallery named like a template default), an "Error" heading
   rendered by a broken widget, and misspellings in headings. One search snippet showed a literal "[Phone Number]" placeholder.
   *Ours:* a build-time linter fails on brackets, lorem ipsum, empty headings, and unknown or placeholder phone numbers. Spell-check all
   AI copy.
8. **Mega-menus with 40+ links on a phone** (33/60 home pages carry 40+ distinct link labels). *Ours:* ≤6 menu items.
9. **Heavy pages:** 7/60 home pages ship >1 MB of HTML before images, plus review widgets, chat bubbles and overlays. *Ours:* no
   third-party JavaScript on page load.
10. **Accessibility overlays** (3/60) don't fix real accessibility problems. *Ours:* build it accessible (contrast, focus states,
    labels, alt text) and skip overlays.
11. **Thin pages:** home pages under 500 words (7/60, some just a logo, a phone number and a few lines), and dozens of near-identical
    city pages. *Ours:* one substantial home page, with optional service pages only when there's real content.
12. **Service areas that sprawl:** a small roofer listing towns hundreds of miles apart, or a Cullman-area company page listing a branch in
    another state with no explanation. *Ours:* the town list comes from the owner's real radius.
13. **Self-awarded superlatives** ("#1", "most trusted", "best") with no source. *Ours:* awards need a name, year and source.
14. **Intrusive popups and chat bubbles** that cover the phone number on mobile. *Ours:* none. Sticky bar only.
15. **Hidden or unexplained links** (e.g. odd decoy links visible in a footer). *Ours:* every link is real and labeled.
16. **Bot-check walls** that greet some visitors with a captcha redirect (6 sites in our sample blocked plain fetches this way, and
    it can also block link previews and some crawlers). *Ours:* Cloudflare Pages static hosting with no interstitial challenge on content pages.

---

### Caveats on this research
- Frequencies come from **home pages only**, through keyword and markup detection. Inner-page features (e.g. a financing page not linked
  in the menu, a widget loaded by JavaScript) are undercounted. Keyword matches can be loose by a couple of sites either way.
- Sticky mobile bars were counted only when visible in static markup, so the true share is higher.
- 6 listed sites were blocked by bot checks and are known only from search snippets. 2 more were opened but unusable (empty JS shell,
  broken domain). Real traffic data is not public, so "best" was judged by local search prominence, chamber membership and visible
  review standing.
- Sample skew: HVAC and roofing are over-represented relative to electrical (9 sites). Electrical findings are the least certain.
