# Category blueprint: Auto repair shops (general repair, tire shops, brake/transmission specialists)

Researched October 2026 for the Cullman, AL starting market. One shared template covers general repair, tire-and-service
dealers and specialists (transmission, European, diesel). Each sub-type switches a few modules on or off.

**Method, briefly.** I collected candidate sites from organic searches such as "auto repair <small Southern city>",
"tire and auto service <town>" and "transmission repair <state> family owned", with directory sites blocked. I also checked
three web-design roundups of auto repair sites for ideas only. Cities covered: Cullman, Arab, Guntersville, Albertville,
Decatur, Hartselle, Somerville, Huntsville, Tuscaloosa, Cottondale, Jasper, Florence and Oneonta (AL); Cookeville,
Tullahoma, Columbia and Shelbyville (TN); Starkville and Tupelo (MS); Dalton, Rome, Chatsworth and Cartersville (GA);
Jonesboro and Russellville (AR); Bowling Green and Murray (KY); Hickory and Boone (NC); Greenwood (SC); Nacogdoches and
Tyler (TX); and Ruston (LA). I added 8 chains and franchises for feature ideas only.

I downloaded each home page's HTML (with a phone user-agent) and ran a script over it. The script counted tel: links,
forms, schema.org types, third-party scripts and links, internal link labels, and keyword patterns in the visible text.
I also opened 12 sites with a page reader to get section order and above-the-fold detail: Graves, Pitts, Oliver Tire,
Harris, Just GM, Quick Tire, Lake City, Christian Brothers, Skene, Kevin's, Wilks and Wells.

**What the counts mean:**
- **All counts come from home pages only.** A feature that a site only has on an inner page is not counted, so true
  frequencies are somewhat higher.
- **Content loaded by JavaScript was not counted.** Several platforms load reviews and booking widgets that way, so
  review and booking counts are undercounts.
- **Keyword counts are pattern matches.** Treat them as close estimates (roughly ±2), not exact audits.

**Base for frequencies: N = 80 sites with usable home-page HTML** (72 independents or small local groups, 8 chains or franchises).
Shop mix of the 80 (classified by page title, so an estimate): general repair 40, tire-and-service dealers 32,
transmission specialists 5, European/import specialists 3.
Seven more sites were attempted but gave no usable HTML. They are listed in the sample and excluded from every count.

---

## 1. Summary

- **The phone is still the main CTA, and online booking is close behind.** 77/80 home pages have a tap-to-call link, and
  61/80 repeat it 3+ times. Appointment wording appears on 58/80, and 46/80 link to a booking or request page. Button
  labels split between "Appointment" (42 sites), "Book" (32), "Schedule" (24) and "Request" (19). The template should
  offer **Call** plus **Book/Request appointment**. A booking link to the shop's own system is the upgrade path.
- **Services are the backbone.** The most-named services on home pages are brakes (66/80), engine (62),
  oil change (58), diagnostics/check engine (58), tires (57), alignment (51), A/C (44), suspension/steering (42) and
  transmission (37). 69/80 link to a services hub and 64/80 link to individual service pages. Our template needs
  a services grid with 6-9 cards and a full list on its own page or section.
- **Warranty is the category's signature trust signal.** 46/80 mention a warranty. 33/80 state a concrete term, most often
  36 months/36,000 miles (19/80). 23/80 say the warranty is nationwide (usually through NAPA, a tire-dealer network or
  a parts program), and 29/80 have a warranty page. A concrete term in a badge beats the vague "we stand behind our work".
- **Credentials and history come next.** 40/80 show ASE certification in text or as a badge image, and 49/80 give a
  founding year or "N years" figure. 29/80 say "family-owned", and 36/80 say family- or locally owned. NAPA AutoCare
  (8), BBB (6), AAA Approved (4) and engine-supplier badges (Jasper, 9) appear less often, but they are cheap to add
  when true.
- **Money matters: coupons and financing are near-standard.** 49/80 mention coupons or specials and 52/80 link to a
  coupons page. 41/80 mention financing and 18/80 name or link a specific provider, such as Synchrony, the Firestone
  credit card (CFNA), Acima, Snap or Koalafi. Expired coupons are a common embarrassment, so ours need an expiry date.
- **Tire dealers are a distinct sub-type.** 32/80 are tire-led, and 17/80 use the same tire-dealer platform, with tire
  search, quote pages and a mobile icon row. Tire shoppers expect "Shop/Quote tires", brand logos (29/80 show them) and
  rebates. Our static template can't run a tire catalog. It should offer a tire-quote request form and brand list, plus
  a link to an external tire storefront when the shop has one.
- **The big wins are basic.** Nearly half the sample has no schema.org business markup (45/80). 16/80 have zero or
  several H1s. 21/80 have 60+ distinct link labels on the home page. 5/80 have no meta description. A third rely on an
  accessibility overlay widget instead of accessible markup (33/80). Facts conflict even within one page: different
  hours in the header and footer, two years-of-experience figures. A fast, correct one-pager with real schema already beats most local competitors.
- **Amenities are underused, so they set a shop apart.** Shuttle or loaner messaging appears on only 11/80 pages,
  waiting room or Wi-Fi on 19/80, after-hours key drop on 9/80, and digital inspections with photos on 5/80. When an owner
  offers these, the template should make them a visible strip, not a buried sentence.

---

## 2. Sample

Type: **Ind** = independent single-location shop. **Ind-2/3** = locally owned shop with 2-3 locations.
**Reg** = locally owned regional group with more locations. **Chain** = national or regional chain or franchise
(feature ideas only). "Visited directly" = I fetched the live home page myself. "Reader" means I also opened it with a
page reader for section order.

| # | Business | URL | City / State | Sub-type | Type | Visited directly |
|---|---|---|---|---|---|---|
| 1 | Just GM Auto Repair Plus | justgmplus.com | Cullman, AL | General + diesel | Ind | yes (reader) |
| 2 | Graves Auto Service | gravesautoservice.com | Cullman, AL | General (NAPA AutoCare) | Ind | yes (reader) |
| 3 | Guthrie's Auto Service | guthriesautoservice.net | Cullman, AL | General | Ind | yes |
| 4 | Quick Tire Sales | quicktirecullman.com | Cullman, AL | Tire + repair | Ind | yes (reader) |
| 5 | Branham Tire & Auto | branhamtire.com | Cullman, AL | Tire + repair | Ind | yes |
| 6 | Velocity Automotive & Repair | velocityautoandtire.com | Cullman, AL | Tire + repair + lifts | Ind | fetched, but an empty JavaScript shell; excluded |
| 7 | Community Auto Repair of Cullman | car-cullman.com | Cullman, AL | General + classic cars | Ind | no (bot check); excluded |
| 8 | Wilks Tire Pros & Auto Service Center | wilkstirearab.com | Arab, AL | Tire + repair | Ind | yes |
| 9 | Oliver Tire | oliver-tire.com | Guntersville, AL | Tire + repair | Ind | yes (reader) |
| 10 | Lake City Auto & Towing | lakecityautoandtire.com | Guntersville, AL | General + 24/7 towing | Ind | yes (reader) |
| 11 | Wilks Tire | wilkstire.com | Albertville, AL (multi-store) | Tire + repair + commercial | Reg | yes (reader) |
| 12 | Minor Tire & Wheel | minortireandwheel.com | Decatur, AL | Tire + repair | Ind | yes |
| 13 | OK Tire & Service | oktiredecatur.com | Decatur, AL | Tire + repair | Ind | yes |
| 14 | Tankersley's Service Center | tankersleyservice.com | Hartselle, AL | Tire + repair | Ind | yes |
| 15 | Henry Tire & Service Center | henrytire.com | Somerville, AL | Tire + repair | Ind | yes |
| 16 | RAD - Reis Auto & Diesel | rad-repair.com | Huntsville, AL | General + diesel | Ind | yes |
| 17 | Davies Auto Service | daviesautoservicellc.com | Huntsville, AL | General | Ind | yes |
| 18 | Icon Autoworks | iconautoworks.net | Huntsville, AL | General | Ind | yes |
| 19 | Brian's Tire & Service | brianstireandservice.com | Huntsville, AL | Tire + repair (veteran-owned) | Ind | yes |
| 20 | Kevin's Auto Repair | kevinsautomotiverepair.com | Huntsville, AL | General + diesel + fleet | Ind | yes (reader) |
| 21 | Pitts Automotive | pittsautorepair.com | Tuscaloosa, AL | General (Asian imports) | Ind | yes (reader) |
| 22 | Postle Tire Barn | postletire.com | Tuscaloosa, AL | Tire + alignment + brakes | Ind | yes |
| 23 | Babb's Auto & Tire | babbsautotire.com | Cottondale, AL | General + tire | Ind | yes |
| 24 | Warren Tire Pros | warrentireinc.com | Tuscaloosa, AL | Tire + repair | Ind-2/3 | yes |
| 25 | JacMac Tire Company | jacmac.net | Tuscaloosa, AL | Tire + repair | Ind | yes |
| 26 | Marks Automotive | marksautomotiverepair.com | Jasper, AL | General | Ind | yes |
| 27 | Bolton Garage | boltongarage.com | Jasper, AL | General | Ind | yes |
| 28 | Precision Automotive Repair & Performance | precisionautojasper.com | Jasper, AL | General + performance | Ind | yes |
| 29 | Southern Tint & Tire | southerntinttire.com | Jasper, AL | Tire + repair + tint | Ind | yes |
| 30 | Frankie's Auto & Towing | frankiesautotowing.com | Florence, AL | General + towing | Ind | yes |
| 31 | Pete Shirley Tire | peteshirleytire.com | Oneonta, AL | Tire + repair | Ind | yes |
| 32 | Elgin Tire Service | elgintireservice.com | Oneonta, AL | Tire + repair | Ind | yes |
| 33 | East Side Service & Performance | eastsideservicecenter.com | Cookeville, TN | General + tire (NAPA) | Ind | yes |
| 34 | Maggart Tire | maggarttire.com | Cookeville, TN | Tire + repair | Ind | yes |
| 35 | Total Automotive | totalautomotivetn.com | Cookeville / Hermitage, TN | General | Ind-2/3 | yes |
| 36 | Automotive Enterprise | automotiveenterprisellc.com | Cookeville, TN | General + body | Ind | no (timed out); excluded |
| 37 | Mike's Tire, Brake & Muffler | mikestiremufflerandbrake.com | Tullahoma, TN | Brakes/exhaust + tire | Ind | yes |
| 38 | Bobo's Automotive & Performance | bobosautomotive.com | Tullahoma, TN | General + tire | Ind | yes |
| 39 | Big Springs Garage | bigspringsgarage.com | Tullahoma, TN | General | Ind | yes |
| 40 | T&T Auto & Truck | tandtautotruck.com | Tullahoma, TN | General + accessories | Ind | yes |
| 41 | Next Level Automotive | nextlevelautocolumbia.com | Columbia, TN | General + tire | Ind | yes |
| 42 | Exhaust Plus Auto Center | exhaustplusautocenter.com | Columbia, TN | Exhaust + general + emissions | Ind | yes |
| 43 | A-1 Auto Services | a-1auto.services | Shelbyville, TN | General | Ind | yes |
| 44 | R&M Tire Pros | randmtirepros.com | Starkville, MS | Tire + repair | Ind | yes |
| 45 | William Wells Tire & Auto | williamwellstireandautorepair.com | Starkville, MS | Tire + repair | Ind-2/3 | yes |
| 46 | Trans-Formers Transmission | transformerstransmission.com | Dalton / Cartersville, GA | Transmission | Ind-2/3 | yes |
| 47 | Skene Transmission | skenetransmission.com | Cartersville, GA | Transmission | Ind | yes (reader) |
| 48 | Mike Fraser's Auto Repair-Wrecker | mikefrasersauto.com | Cordele, GA | Transmission + wrecker | Ind | no (403 block); excluded |
| 49 | Harris Service Center | harrisservicecenter.com | Dalton, GA | General + tire | Ind | yes (reader) |
| 50 | Tate Automotive | tatesautomotive.com | Dalton, GA | General (+ fuel) | Ind | yes |
| 51 | S&M Auto Repair and Towing | sandmautorepairandtowing.com | Dalton, GA | General + towing | Ind | yes |
| 52 | Rudy's European Auto Repair | rudyseuro.com | Rome, GA | European specialist | Ind | yes |
| 53 | Hanson's Tire & Auto | hansonstireandauto.com | Chatsworth / Dalton, GA | Tire + repair | Ind-2/3 | yes |
| 54 | D&R Automotive | drautomotive.org | Jonesboro, AR | General | Ind | yes |
| 55 | Starks Auto Service | starksautoservicejonesboro.com | Jonesboro, AR | General | Ind | yes |
| 56 | The Auto Clinic | autoclinicjonesboro.com | Jonesboro, AR | General | Ind | yes |
| 57 | Danny's Tire & Auto Service | dannystireandautoservice.com | Russellville, AR | Tire + repair + towing | Ind | yes |
| 58 | Musser Automotive | musserautomotive.com | Bowling Green, KY | General | Ind | yes |
| 59 | Harlan Automotive | harlanautomotive.com | Murray / Paducah, KY | General | Ind-2/3 | yes |
| 60 | Quality Plus Auto Care | qualityplusautocare.com | Murray, KY | General | Ind | no (domain did not resolve); excluded |
| 61 | Richey's Automotive | richeysautomotive.com | Hickory, NC | General | Ind | yes |
| 62 | Master Tech Auto Mechanics | mtamechanics.com | Hickory, NC | European specialist | Ind | yes |
| 63 | SRS Tire and Automotive | srstire.com | Boone, NC | Tire + repair | Ind | yes |
| 64 | Lakelands Tire & Auto | lakelandstire.com | Greenwood, SC | Tire + repair | Ind | yes |
| 65 | Professional Automotive | proautoserv.com | Greenwood, SC | General | Ind | yes |
| 66 | Mike's Automotive, Towing & Muffler | mikesautogreenwood.com | Greenwood, SC | Exhaust + towing | Ind | yes |
| 67 | Wells Automotive | wellsautomotive.com | Nacogdoches, TX | General + heavy truck | Ind | yes (reader) |
| 68 | The Car Doctor | thecardoctornacogdoches.com | Nacogdoches, TX | General | Ind | yes |
| 69 | Herman Power Tire Service | hermanpowertire.com | Nacogdoches, TX | Tire + repair | Ind | yes |
| 70 | JCR Auto Repair | jcrautorepair.com | Nacogdoches, TX | General | Ind | yes |
| 71 | 2M Auto Repair | 2mautorepair.com | Tyler, TX | General | Ind | yes |
| 72 | Atlas Automotive | atlasautotx.com | Tyler / Henderson, TX | General | Ind-2/3 | yes |
| 73 | EQ Autoworks | eqautoworks.com | Tyler / Mineola / Bullard, TX | General | Ind-2/3 | yes |
| 74 | S&J Automotive | sandjautomotive.com | Tyler, TX | General | Ind | yes |
| 75 | Spraggins Auto Repair (formerly Mike's Automotive) | spragginsautorepairtx.com | Tyler, TX | General | Reg | yes (old domain redirects) |
| 76 | Ace Automotive Repair & Towing | aceautomotiveruston.com | Ruston, LA | General + towing | Ind | yes |
| 77 | Walpole Tire & Service | walpoletire.com | Ruston / West Monroe, LA | Tire + repair | Ind-2/3 | yes |
| 78 | Christian Brothers Automotive (South Huntsville) | cbac.com/south-huntsville | Huntsville, AL | General | Chain (franchise) | yes (reader) |
| 79 | Car Fix (Cookeville) | teamcarfix.com | Cookeville, TN | General + tire | Chain (regional) | yes |
| 80 | Tire Discounters (Decatur) | tirediscounters.com | Decatur, AL | Tire + repair | Chain (regional) | yes |
| 81 | Precision Tune Auto Care (Decatur) | precisiontune.com | Decatur, AL | General | Chain (franchise) | yes |
| 82 | Midas (Tupelo) | midasautomotive.com | Tupelo, MS | General + brakes/exhaust | Chain (franchise) | yes |
| 83 | Firestone Complete Auto Care (Tupelo) | firestonecompleteautocare.com | Tupelo, MS | Tire + repair | Chain | yes |
| 84 | AAMCO (Tuscaloosa) | aamco.com | Tuscaloosa, AL | Transmission + general | Chain (franchise) | yes |
| 85 | Main Street Auto (Taylor Automotive) | mainstreetauto.com | Dalton, GA | General + tire | Chain (regional group) | yes |
| 86 | GEI Automotive & Tire | geiauto.com | Gadsden, AL | General + tire + mobile | Ind | no (timed out); excluded |
| 87 | North Jackson Tire | njtiretn.com | Tullahoma, TN | Tire + repair | Ind | no (home page 404); excluded |

**Totals:** 87 sites listed. 80 home pages fetched with usable content: 72 independents or small local groups, and 8 chains.
12 of those were also opened with a page reader. 7 were excluded: 1 empty JavaScript shell, 1 bot check, 1 block,
2 timeouts, 1 dead domain and 1 404. For those 7, what is known comes from search-result snippets only.

---

## 3. Pages

Counts are internal links from the home page (header, body or footer) to a page of that kind (N = 80).

| Page | Sites linking to it | Notes |
|---|---|---|
| Contact / location / directions | 72/80 | Usually address, hours and a map link. Embedded maps are rarer (11-15/80). |
| Services hub | 69/80 | A list or grid of every service. |
| Individual service pages | 64/80 | Brakes, oil change, A/C, transmission, alignment and diagnostics are the usual ones. Often thin and templated. |
| About / our story | 64/80 | Founding year, owner names, family history. |
| Coupons / specials | 52/80 (8/8 chains) | Printable or "show on phone" coupons and manufacturer rebates. |
| Tires | 50/80 | A catalog or quote page on tire dealers. On general shops it is just a service page. |
| Reviews / testimonials | 49/80 | Mostly embedded third-party feeds. |
| Blog / car-care tips | 48/80 | Mostly vendor-supplied generic articles. Low value for our clients. |
| Appointment / request service | 46/80 | Own page, or a pop-up widget from the shop system. |
| Careers / now hiring | 45/80 | Technician hiring is a real need for these shops. |
| Financing | 31/80 | Often just a link to a provider's application. |
| Warranty | 29/80 | Explains term, coverage and nationwide network. |
| Fleet / commercial | 25/80 (7/8 chains) | Matters for shops near industry and farms. |
| Gallery / shop photos | 19/80 | |
| Vehicles / makes we service | 19/80 | 18/80 name 5+ brands on the home page. |
| Team / technicians | 15/80 | |
| Towing / roadside | 14/80 | 20/80 mention towing in text. |
| FAQ (own page) | 7/80 | An FAQ section on the home page is more common (20/80). |
| Service-area pages | 7/80 | 33/80 name the area or towns served in text. |

**Recommended page set for our template**

Required:
1. **Home**: a long single page with anchors (see section 4).
2. **Services**: a full list grouped by system, such as Brakes, Engine & Diagnostics, Heating & A/C, Tires & Alignment,
   Suspension & Steering, Maintenance, Transmission and Electrical. The template ships with one section per group.
   It can also generate a short page per service the owner marks as a "headline service", for local SEO.
3. **Contact & hours**: address, hours, phone, map link, directions, the appointment form and after-hours drop instructions.

Optional (switched on by data the owner gives us):
4. **About**: when the owner supplies a story, photos or team. Otherwise a home-page section is enough.
5. **Coupons / specials**: only when the owner gives offers with expiry dates. It hides itself when every offer has expired.
6. **Warranty**: when the owner gives a term. Otherwise the term goes in a home-page badge only.
7. **Tires**: for tire-led shops: brands carried, a quote request form, and an optional external storefront link.
8. **Financing**: when the owner names a provider. This is one short section with the provider's apply link.
9. **Towing**: when the shop tows. Include a 24/7 number only if the owner confirms it is staffed.
10. **Fleet / commercial**: when the owner serves fleets.
11. **Careers**: a simple "we're hiring technicians" block with an email or phone. No applicant tracking.

Skip: blogs (48/80 have them, but they are mostly canned articles, which is thin content and maintenance debt), dozens of
city doorway pages, and per-make pages.

**One long page vs many pages.** For a shop that has no site today, a long home page with sticky anchors works best.
The reader-checked sites that felt strongest on a phone were essentially that: one scroll from phone/book, to services,
to trust, to reviews, to hours and map. Add 2-4 real pages for Services, Contact and (if used) Coupons and Tires. Those
give search engines distinct URLs for "brake repair <town>" style searches without a 40-page shell. The heavy multi-page
platform sites in the sample had a median of 46 distinct link labels on the home page, and 21/80 had 60+. That is
mega-menu territory and painful on a phone.

---

## 4. Home page section order

Typical order on the best sites (from the 12 reader-checked pages, plus link order in the HTML of the rest):

1. **Utility bar / header**: logo, tap-to-call phone, short hours line ("Mon-Fri 7:30-5:30"), and a Book/Request
   button. 7 of the 12 reader-checked pages put the phone plus a booking or quote link in the header. Several also put the
   address and hours there.
2. **Hero**: one headline naming the service and the town, one short supporting line, sometimes a star/review-count line
   (2 of the 12 reader-checked pages), and 1-2 buttons. Typically "Book an appointment" plus "Call", or "Shop/Quote tires" on tire dealers.
3. **Trust strip**: badges directly under the hero, such as ASE, warranty term, NAPA/AAA/BBB, "since 19xx" and family-owned.
4. **Featured services**: 3-8 cards with an icon or photo, and a "See all services" link.
5. **About / why choose us**: a short family or history story with an owner photo, and 3-4 value points (honest
   estimates, turnaround, warranty, local).
6. **Amenities strip** (on the better sites only): shuttle, loaner, waiting room/Wi-Fi, after-hours drop, digital
   inspection texts.
7. **Makes we service**: brand chips or a sentence ("domestic, Asian and European"), plus any specialties (diesel, hybrid,
   European, transmissions).
8. **Reviews**: 3-5 testimonials and a link to more, or to the Google profile.
9. **Warranty detail**: on sites where it is a selling point. Pitts gives it a dedicated band with three coverage tiers.
10. **Coupons / financing teaser**: optional.
11. **FAQ**: 5-8 questions on hours, makes, booking, pricing, discounts, status updates and hiring. 20/80 have one.
12. **Service area + location**: a town list, address, hours, a map link or embed, and a directions button.
13. **Footer**: NAP (name, address, phone), hours, payment logos, social links, privacy link.

**Above the fold on mobile (our rule):** logo and name, a tap-to-call button, a Book/Request button, the headline with the
town, and one trust line. Example: "ASE-certified · 36-mo/36k warranty · Since 1987". Hours ("Open today until 5:30")
should be visible without scrolling. Don't use a rotating slider. Several sample sites use one, and the slides that
carry the message are missed or fail to load.

**Sub-type variants:**
- *Tire-led*: swap the hero CTA to "Get a tire quote", and move tire brands and rebates up to position 4.
- *Transmission specialist*: hero offers "Free diagnosis/check" when the owner confirms it. Add a short
  "How we diagnose" 3-step module and a rebuild-warranty band. Skene, the reader-checked transmission shop, leads with
  a free-diagnosis offer and two warranty tiers.
- *Towing*: a red/orange "Need a tow?" strip directly under the header with a separate tow phone number, and a
  24/7 badge only if the owner confirms 24/7.

---

## 5. Features and calls to action

**Primary CTA: Call** (77/80 have tap-to-call, 61/80 have 3+ call links).
**Secondary CTA: Book / Request appointment** (58/80 use appointment wording, 46/80 link to a booking or request page).
Tire-led shops add **Get a tire quote** ("quote" appears in button labels on 11/80, and "shop (for) tires" on 18/80).
Directions links appear on 33/80.

| Feature | Frequency (N = 80) | Verdict |
|---|---|---|
| Tap-to-call phone, repeated | 77/80 (3+ links: 61/80) | **Must** |
| Booking or appointment request (link or form) | 58/80 mention, 46/80 link | **Must**. Use the owner's system link, or our own request form. |
| Hours on the home page | 57/80 (Saturday hours: 14/80) | **Must** |
| Services list (6+ named services) | brakes 66, engine 62, oil 58, diagnostics 58, tires 57 | **Must** |
| Warranty statement | 46/80 (a specific term: 33/80) | **Must** when the owner gives a term |
| History: founding year or years in business | 49/80 | **Must** when known |
| Reviews / testimonials | 55/80 mention reviews; 36/80 have a testimonial block | **Must**: owner-supplied testimonials plus a Google review link |
| ASE certification (text or badge) | 40/80 | **Must** when true |
| Area / towns served | 33/80 | **Must** |
| Coupons / specials | 49/80 text, 52/80 link | Nice to have, with expiry dates |
| Financing | 41/80 (a named provider: 18/80) | Nice to have |
| Makes serviced | 35/80 say "all makes"/domestic and import; 18/80 list 5+ brands | Nice to have (chips) |
| Family- or locally owned | 36/80 | Nice to have; strong in small towns |
| Careers / hiring | 45/80 link, 32/80 text | Nice to have |
| Towing / roadside | 20/80 (with 24/7 language: 10/80) | Sub-type module |
| Fleet / commercial | 28/80 (7/8 chains) | Optional module |
| FAQ section | 20/80 | Nice to have; AI can draft it, the owner approves |
| Waiting room / Wi-Fi | 19/80 | Amenity chip |
| Shuttle or loaner | 11/80 | Amenity chip; sets a shop apart |
| After-hours / key drop | 9/80 | Amenity chip, plus instructions on the contact page |
| Same-day service / walk-ins | 10/80 / 6/80 | Amenity chip |
| Military / senior discount | 8/80 | Amenity chip |
| Digital inspections (photos texted to you) | 5/80 (3 independents, 2 chains) | Amenity chip; sets a shop apart |
| Diesel | 15/80 | Specialty chip |
| Hybrid / EV | 10/80 | Specialty chip |
| Video | 6/80 | Skip |
| SMS ("text us") link | 2/80 | Optional, owner-controlled. A link only; we never auto-text. |

**Trust signals, in the order they seem to persuade:**
1. A specific warranty term ("36 months / 36,000 miles, nationwide").
2. Years in business or a founding year.
3. ASE certification. ASE Blue Seal or Master Tech when true.
4. Owner names and faces, plus family-owned.
5. Review count and testimonials.
6. Program badges: NAPA AutoCare, AAA Approved, BBB, a parts-program warranty or a Jasper engine installer.
7. "We call with an estimate before any work". Only 4/80 say this clearly, yet it speaks to the customer's top fear,
   so it is worth making standard copy when the owner confirms it.

**Badge images seen** (filename/alt matches, an estimate): tire brand logos 29/80, ASE 23/80, Jasper 9/80, NAPA 8/80,
BBB 6/80, Google review badge 5/80, AAA 4/80, Carfax 4/80, ACDelco 4/80, Motorcraft 4/80.
Our template should support a badge row with a fixed set of approved badge assets. Use text-only badges for anything
whose logo license we can't confirm.

---

## 6. Third-party integrations

Detected in the home-page HTML (N = 80):

| Tool / platform | Sites | How it shows up |
|---|---|---|
| Accessibility overlay widget (UserWay and similar) | 33/80 | A script bolted onto platform sites. We should build accessible markup instead. |
| Google "write a review" link | 17/80 | A plain link built from the Place ID |
| Tire-dealer site platform (tire search, quote pages, "Schedule a repair" page, mobile icon row) | 17/80 | The whole site is the platform. Not something we can copy statically. |
| Duda-based builders (several shop-software vendors resell them) | 17/80 | Platform |
| Tekmetric (shop management) online booking | 10/80 | "Book appointment" opens the Tekmetric booking widget or a booking.tekmetric.com link |
| AutoOps (shop marketing and booking) | 8/80 | Booking pop-up and a customer portal |
| Synchrony (car care credit card) | 9/80 | An apply link or banner |
| Embedded Google Map | 11-15/80 | An iframe |
| Review widget (Elfsight, Trustindex and similar) | 7/80 | A script-loaded review carousel |
| Carfax links or badges | 7/80 | A Carfax shop profile or "Top-Rated" badge |
| Firestone/Bridgestone credit card (CFNA) | 5/80 | An apply link |
| Kukui (shop website + "my garage" portal) | 4/80 | A "Schedule visit" pop-up |
| Call tracking (LogMyCalls, CallRail) | 4/80 | Swapped phone numbers |
| External tire storefront (TireConnect and similar) | 4/80 | A link or embedded catalog |
| Acima / Snap / Koalafi / Sunbit (lease-to-own and point-of-sale finance) | 3 / 2 / 2 / 1 | An apply link |
| RepairShopWebsites (appointment-request form pages) | 3/80 | A form page |
| AutoVitals (digital inspection, plus a request form) | 2/80 | An "#make-appointment" form |
| Generic booking iframe (d14e) | 2/80 | An embedded booking form |
| AutoNetTV (car-care video) | 2/80 | Video embeds |
| Calendly | 1/80 | Rare in this category |
| Shopmonkey | 0/80 detected | Common shop software, but no public booking embed found in this sample |

**Takeaway:** shops book through their **shop management system's** booking link (Tekmetric, AutoOps, Kukui, Shop-Ware,
Mitchell 1, Shopmonkey and similar), not through general schedulers. Our clients mostly have no system yet. So the
default is our own static request form (posting to a Cloudflare Worker that emails or texts the owner), with an
optional "booking URL" field that replaces it.

**Our template should support (all as links or simple embeds, so the site stays static):**
- `booking_url`: any shop-software booking link or Calendly/Square Appointments link. It opens in a new tab, or in a
  modal iframe when the provider allows framing. When there is none, the built-in appointment request form is used. It
  collects name, phone, vehicle year/make/model, the service needed, a preferred day and notes. It posts to our Worker
  endpoint, with a honeypot field and rate limiting.
- `tire_quote`: a built-in tire quote request form (vehicle or tire size, and a preference such as budget, value or
  premium), plus an optional `tire_store_url` for shops with an online tire storefront.
- `financing[]`: provider name and apply URL. Supported names: Synchrony Car Care, CFNA/Firestone credit card, Acima,
  Snap, Koalafi, Sunbit, Affirm, or "ask in store". Show the provider name and a link, never terms or rates (those
  change and carry legal risk).
- `review_link`: a Google "write a review" link built from the Place ID, plus optional Facebook and Carfax profile links.
- `map`: a static map image or a "Get directions" link (lighter than an iframe). Optionally a Google Maps embed iframe
  on the contact page.
- `tow_phone`: a separate tap-to-call number when towing runs on a different line.
- Social links: Facebook (nearly universal, 67/80 link to it), Instagram (19/80) and TikTok.

**Skip:** live tire catalogs, call-tracking number swaps (they break NAP consistency) and accessibility overlays.
Also skip review widgets that pull Google review text, which Google's terms and our compliance rules forbid.

---

## 7. Mobile behavior

- **Sticky header with call and menu.** Roughly 30/80 pages have sticky-header markup (an estimate from class names,
  such as builder flags for a sticky header). 17/80, all on the tire-dealer platform, also ship a mobile icon row with
  call, directions, tires, service and contact. Two small custom-built sites have a dedicated mobile call bar.
  **Ours:** a slim sticky top bar (logo, Call button) plus a **bottom action bar** on phones with 2-3 buttons: Call,
  Book, Directions. Swap in "Tow" for towing shops and "Tire quote" for tire shops. Keep each tap target at least 48px.
- **The tap-to-call link must be correct.** One reader-checked site had malformed `tel:` links (spaces and escaped
  characters). Always generate `tel:+1XXXXXXXXXX` from the normalized Places phone.
- **Hours as "Open now / Closes at 5:30".** This is the question a stranded driver asks. Compute it client-side from the
  hours JSON with a tiny script, and fall back to the static table. Flag holiday closures when the owner adds them.
- **Menus:** a hamburger with no more than 6-7 items. The big platform sites use deep mega-menus (21/80 have 60+ link
  labels on the home page). Our one-pager uses anchor links: Services, Why Us, Reviews, Hours & Location, plus Coupons
  and Tires when used.
- **Images:** use real shop photos where possible: bays, owner, storefront sign. Use responsive `srcset`, WebP/AVIF,
  lazy-load below the fold, and fixed aspect ratios to stop layout shift. The median sample home page was 169 KB of HTML
  alone, and 5/80 exceeded 500 KB before any images loaded. One page was ~900 KB of HTML.
- **No carousels for key content.** Sliders appeared on several reader-checked sites. Slide 2-4 messages are rarely seen,
  and one site's slides pointed at placeholder images.
- **Forms:** short ones, with `inputmode="tel"`, autocomplete attributes and a single column. A year/make/model text
  field is enough; a VIN lookup isn't needed.
- **Logo walls:** one site had about 50 partner logos in a grid. On a phone, cap the badge row at 4-6 and let it
  scroll horizontally.
- **Duplicate desktop/mobile content:** two reader-checked sites shipped the same sections twice (once per breakpoint),
  which doubles scroll length and confuses search engines. Use one responsive layout.

---

## 8. Content the AI must write

Tone: plain, confident, neighborly. It should sound like a trusted mechanic explaining things, not an ad. Short
sentences. No hype words ("premier", "world-class"), no invented claims, no prices unless the owner gives them. Use
Southern-friendly warmth sparingly ("Stop by", "We'll call you"), not dialect.

| Section | What the AI writes | Length | Data it may use |
|---|---|---|---|
| Page title + meta description | Pattern-based (see section 11) | 50-60 / 140-155 chars | Name, city, primary services |
| Hero headline | Service + town, for example "Honest auto repair in Cullman" | 4-8 words | Category, city |
| Hero subline | One sentence on what they fix and the main reason to choose them | 15-25 words | Services, owner facts |
| Trust strip labels | Badge text from owner facts only (warranty term, ASE, since year) | 2-5 words each | **Owner-confirmed facts only** |
| Services cards | Card title + one-line plain description per service | 10-20 words each | The owner's services list, plus category defaults the owner approves |
| Services page groups | A 2-3 sentence intro per group: what it covers, warning signs to watch for | 40-70 words per group | General knowledge, no numbers |
| About | A short story: who runs it, how long, what they care about | 80-150 words | **Owner interview answers.** If none, a neutral 2-sentence version without invented history. |
| Why choose us | 3-4 value points with a one-line explanation each | 10-20 words each | Owner facts and amenities |
| Amenities chips | Labels only | 1-4 words | Owner checklist |
| Makes / specialties line | One sentence plus brand chips | 15-25 words | Owner list |
| Warranty band | A plain restatement of the owner's term and what it covers | 30-60 words | **Owner's exact term.** The AI must not invent or round it. |
| Coupons | Offer title + fine print + expiry | 5-25 words | **Owner-supplied offers only** |
| FAQ | 5-8 Q&As on hours, makes, booking, estimates, payment, warranty, drop-off | 25-60 words each | Owner facts. Questions with no supporting fact are skipped. |
| Service-area paragraph | One sentence plus a list of towns | 20-40 words + list | Places address; nearby towns from a fixed regional list the owner confirms |
| Towing module | A short explanation of when to call and what happens | 30-50 words | Owner confirms availability and hours |
| Careers block | A two-sentence "we're hiring techs" note | 25-40 words | Owner opt-in |
| Image alt text | Descriptive alt for every photo | 5-15 words | Photo context |

**Guardrails for the AI:**
- Never state ASE, AAA, NAPA, BBB, warranty terms, a founding year, "family-owned", 24/7, free shuttle or loaners
  unless that fact is in the owner-confirmed data. Unconfirmed facts produce no copy, not hedged copy.
- Google review text may inform tone and themes, for example "reviews keep mentioning fair prices". It is never quoted
  or paraphrased into fake testimonials.
- No prices or "cheapest" claims. Use "estimate before any work" only if the owner confirms that is their practice.

**Data source split:**
- **From Google Places:** name, formatted address, location (lat/lng), national phone, regular opening hours, primary
  type / display name (car_repair, or tire- or body-shop types when returned), rating and review count (preview only;
  see section 9), Place ID, Google Maps URL, and existing website URL (to qualify the lead).
- **From the owner:** services offered and headline services, makes serviced and specialties, warranty term,
  certifications, founding year, ownership story, owner/team names and photos, amenities, towing details and phone,
  financing provider, coupons, booking URL, tire brands carried, service-area towns, testimonials they have permission
  to use, payment methods, and holiday hours.
- **From AI:** all prose in the table above, generated only from the two sources above.

---

## 9. Data model

`R` = required to publish, `O` = optional. Source: **P** = Google Places, **A** = AI-generated, **W** = owner.
"Preview" = may be shown in the private preview only.

| Field | Type | R/O | Source | Notes |
|---|---|---|---|---|
| `place_id` | string | R | P | May be stored indefinitely |
| `name` | string | R | P → W confirms | Exact legal/signage name for NAP |
| `subtype` | enum: general, tire, transmission, european, diesel, towing | R | A (from Places type + name) → W | Drives module toggles |
| `phone` | E.164 string | R | P → W confirms | Used in `tel:` links and schema |
| `tow_phone` | E.164 string | O | W | |
| `text_phone` | E.164 string | O | W | Shown as an `sms:` link only if the owner wants it |
| `email` | string | O | W | Form notifications |
| `address` | street, city, state, zip | R | P → W confirms | Refresh per the Places caching rules |
| `geo` | lat, lng | R | P | |
| `hours` | 7 day entries with open/close times, plus `notes` | R | P → W confirms | Owner overrides win |
| `holiday_hours[]` | date, open/close or closed | O | W | |
| `after_hours_drop` | bool + instructions | O | W | |
| `services[]` | {name, group, headline:bool, blurb} | R (≥ 6) | W picks from category defaults; A writes the blurbs | |
| `makes_serviced` | enum (all / domestic / Asian / European) + `brands[]` | O | W | |
| `specialties[]` | diesel, hybrid/EV, European, transmission, performance/lift, fleet, RV | O | W | |
| `warranty` | {months, miles, nationwide:bool, provider, notes} | O | W | Exact values only |
| `certifications[]` | ASE, ASE Blue Seal, ASE Master, AAA Approved, NAPA AutoCare, BBB, other | O | W | Each needs owner confirmation |
| `founded_year` | int | O | W | |
| `ownership` | family-owned, locally owned, veteran-owned, woman-owned (multi) | O | W | |
| `owner_story` | text | O | W (interview) → A polishes | |
| `team[]` | {name, role, photo} | O | W | |
| `amenities[]` | shuttle, loaner, waiting room, Wi-Fi, same-day, walk-ins, digital inspections, military/senior discount, key drop | O | W | |
| `towing` | {offered, 24_7:bool, radius_note} | O | W | |
| `financing[]` | {provider, apply_url} | O | W | |
| `payment_methods[]` | cash, cards, checks, financing | O | W | |
| `coupons[]` | {title, details, expires:date} | O | W | Auto-hidden after expiry |
| `booking_url` | URL | O | W | Replaces the built-in request form |
| `tire_brands[]` | strings | O | W | Tire subtype |
| `tire_store_url` | URL | O | W | |
| `service_area[]` | town names | R (≥ 1) | A suggests from location → W confirms | |
| `testimonials[]` | {quote, name/initials, source, permission:true} | O | W | **Never from Google review text** |
| `review_link` | URL | O | P (built from Place ID) | |
| `rating`, `review_count` | number | Preview | P | Not baked into published sites. Places caching limits apply, and stale numbers look bad. Optional owner-entered text such as "200+ five-star reviews", which the owner keeps current. |
| `social` | {facebook, instagram, tiktok, carfax} | O | W (Facebook URL is often found during qualification) | |
| `photos` | {hero, storefront, bays[], team[]} | R (≥ 1 non-Google image to publish) | Preview: P photos. Published: W, stock or AI | Google photos can't be re-hosted on published sites |
| `logo` | image | O | W | Fallback: a typographic wordmark |
| `look` | enum (see section 10) | R | A picks; W can change | Avoid repeating a look within the same town |
| `seo` | {title, meta_description, h1} | R | A | |
| `faq[]` | {q, a} | O | A from owner facts → W approves | |
| `careers` | {hiring:bool, contact} | O | W | |

---

## 10. Design looks

Four original looks. Each must clear WCAG AA contrast for text and buttons. The colors are starting points; owners'
logo colors can tint the accent.

### A. "Shop Floor": industrial and precise
- **Mood:** no-nonsense, organized, technical competence. It fits general repair and diesel shops with clean bays.
- **Palette:** graphite `#1E2328` (header/footer), steel `#4A5560` (secondary text), concrete `#F3F2EE` (background),
  signal yellow `#F2B705` (accent and CTA, with graphite text on it), white `#FFFFFF` cards.
- **Fonts:** Barlow Condensed 700 (headings, all caps for short labels) + Barlow 400/500 (body).
- **Photos:** real bays, lifts, tools laid out, a technician's hands at work. Cool, even light, slightly desaturated.
- **Layout feel:** square corners, thin 1px rules, "spec sheet" service cards with a small code-style index number,
  a yellow-striped divider used once (not as a theme). Large numerals for the warranty term and years in business.

### B. "Main Street Garage": warm and hometown
- **Mood:** family-owned and trusted, "we know your truck". It fits multi-generation small-town shops, the core of our market.
- **Palette:** buttermilk `#FBF6EC` (background), brick red `#A23B2A` (CTA, white text), denim `#24384F` (headings/footer),
  kraft tan `#D8C3A0` (bands and chips), ink `#2A2622` (body text).
- **Fonts:** Zilla Slab 600/700 (headings) + Source Sans 3 (body).
- **Photos:** owner and crew in front of the storefront, warm late-day light, a sign or the town in the background.
  Include people.
- **Layout feel:** soft 10px corners, a circular "Since 19xx" seal near the hero, a story-first About band with a photo,
  and testimonial cards styled like index cards. Generous spacing and big tap targets.

### C. "Clear Diagnostic": bright, modern and tech-forward
- **Mood:** transparent, up to date, explains things. It fits import/European specialists, hybrid/EV-capable shops and
  shops offering digital inspections.
- **Palette:** white `#FFFFFF`, frost `#EEF3F7` (section bands), cobalt `#1557E0` (CTA, white text), graphite
  `#151B26` (text), teal `#0E9F8A` (status accents, such as an "Open now" dot).
- **Fonts:** Space Grotesk 600 (headings) + IBM Plex Sans 400/500 (body).
- **Photos:** bright, clean bays, a scan tool or tablet showing an inspection, close-ups of components. High key.
- **Layout feel:** an airy grid, pill buttons, and a 3-step "Book, Inspect & text photos, Approve & fix" module.
  Thin line icons, an FAQ accordion and a clean hours card with a live open/closed state.

### D. "Night Road": rugged, for towing, tires and trucks
- **Mood:** ready when you're stuck, built for trucks and back roads. It fits towing-plus-repair, tire shops,
  lift/leveling and heavy-truck work.
- **Palette:** asphalt `#141414` (hero/background bands), charcoal `#2A2A2A` (cards), hi-vis orange `#FF6A13` (CTA, with
  asphalt-black text, since white on this orange fails contrast), bone `#F4F1EA` (light sections), olive `#5E6B3A`
  (secondary accent).
- **Fonts:** Archivo Black (headings) + Archivo 400/500 (body).
- **Photos:** a wrecker or a truck on a rural road at dusk, tire tread close-ups, lifted trucks. Dramatic contrast, but
  real local shots, not stock-car glamour.
- **Layout feel:** a dark full-bleed hero with a very large phone number, an orange "Need a tow?" strip, one subtle
  angled section edge, and chunky service tiles. Light sections in between keep it readable.

**Assignment rule:** pick the look from the subtype by default (towing/tire → D, specialist/EV → C, family-history-rich →
B, others → A). Never assign the same look to two clients within ~15 miles if another fits.

---

## 11. Local SEO

- **Schema.org type:** `AutoRepair` (a subtype of AutomotiveBusiness → LocalBusiness). Tire-led shops get both types:
  `"@type": ["AutoRepair", "TireShop"]`. Only 35/80 sample sites had any business-type schema at all, and 21/80 used
  `AutoRepair`. Include:
  - `name`, `telephone`, `address` (PostalAddress), `geo`, `url`, `openingHoursSpecification`, `areaServed`
    (towns as `City`), `priceRange` (owner-optional) and `paymentAccepted`.
  - `sameAs` (Facebook, Google Maps URL), `image` and `logo`.
  - `hasOfferCatalog` listing services as `Offer` → `Service` (`serviceType`).
  - `foundingDate`, when the owner confirms it.
- **Do not** add `AggregateRating` built from Google reviews. Google ignores self-serving review markup for
  LocalBusiness, and our compliance rules forbid re-hosting Google review content. FAQ markup is fine but no longer
  earns rich results for business sites, so add it only where an FAQ section exists.
- **Title pattern:** "{Primary service} in {City}, {ST} | {Name}", for example "Auto Repair & Tires in Cullman, AL | {Name}".
  38/80 sample titles use an "… in {City}" pattern, and 68/80 include a category word. Keep it to 60 characters or
  fewer (19/80 sample titles exceed 65). Never "Home | …" (5/80 do this).
- **Meta description:** "{Name} in {City}, {ST}: {3 headline services}. {Warranty or ASE if true}. Call {phone} or
  book online." Keep it to 155 characters or fewer. 5/80 sample sites had none.
- **One H1 per page**, with the town in it. 8/80 sample pages had no H1 and 8/80 had several.
- **NAP consistency:** generate name, address and phone from one record everywhere: header, footer, schema, contact page
  and `tel:` links. In the reader-checked sample, one page gave different closing
  times in the header and footer, and another gave two different years-of-experience figures. Search listings for
  a third showed a different phone from its own site. No call
  tracking numbers on the site.
- **Service pages:** one short page per headline service ("Brake Repair in {City}"), each with unique owner-informed copy.
  No near-duplicate pages per town; one service-area section with a town list covers them.
- **Category-specific details:**
  - Mention makes serviced and specialties (diesel, European, hybrid) in body copy, because people search them.
  - Mention "near {neighboring towns}" once in the service-area copy.
  - Link to the Google Business Profile. Prompt owners to keep their GBP categories matching (Auto repair shop, Tire
    shop, Towing service, Transmission shop).
- **Technical:**
  - Previews are `noindex` behind login. The published site gets a sitemap.xml and robots.txt.
  - Canonical URLs on `*.pages.dev`, switched to the custom domain once attached.
  - Fast static pages.

---

## 12. Anti-patterns

Seen on weaker sites in the sample. Our templates must avoid them:

1. **Inconsistent facts**: different hours in the header and footer, two phone numbers, conflicting years of experience
   on the same page. One generated record feeds every mention.
2. **"24/7 towing" on a shop closed weekends**, with no separate after-hours number. Show 24/7 only with a confirmed,
   staffed number.
3. **Expired coupons and rebates** still on the page. Every offer needs an expiry date and auto-hides.
4. **Vague warranty**: "we stand behind our work" with no term. If there is no term, say nothing rather than something vague.
5. **Rotating hero sliders**, sometimes with placeholder images. Use one static hero.
6. **Mega-menus and link sprawl**: 21/80 had 60+ link labels on the home page. Keep the menu short.
7. **Canned blogs and doorway pages**: generic vendor articles and near-duplicate city pages. Skip both.
8. **Duplicated sections** shipped once for desktop and once for mobile, doubling scroll length.
9. **Logo walls**: dozens of brand logos in a grid. Cap it at 4-6 relevant badges.
10. **Template leftovers**: links pointing at another business's domain, vendor admin links ("Website changes",
    "Add article") in the public footer. Our build step should lint for them: every
    link domain must be on an allow list, and the phone must match the record.
11. **JavaScript-only pages**: one Cullman site serves an empty shell until scripts run, so search engines and slow
    phones see nothing. Our sites are pre-rendered HTML.
12. **Accessibility overlays instead of accessible markup** (33/80). Use real headings, labels, contrast, focus states
    and alt text.
13. **Missing or multiple H1s** (16/80), "Home |" titles (5/80), and missing meta descriptions (5/80).
14. **Bloated pages**: 5/80 home pages had over 500 KB of HTML before images. Keep the home page under ~100 KB of
    HTML/CSS/JS before images.
15. **Malformed `tel:` links** (spaces or escaped characters) that may not dial. Always use E.164.
16. **Reviews that never load**: several pages showed an empty testimonials heading because a widget failed to load.
    Our testimonials are static HTML.
17. **Hours and address buried** at the very bottom, with no "open now" status. Put them in the header line, a
    near-top card and the footer.
