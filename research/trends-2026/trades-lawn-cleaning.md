# Trends 2026: contractors & home services, landscaping & lawn care, cleaning services

Researched 10 October 2026 for the Cullman, AL market. This is a *refresh layer* on top of the October 2026
blueprints (`research/contractors.md`, `landscaping-lawn-care.md`, `cleaning-services.md`), which hold the big-sample
counts (60–75 home pages per category). This file covers what the standout 2024–2026 sites do, the conversion data
that has come out since, the modules each trade needs, and the gaps between that and what `src/generator/packs/`
builds today. Learn structure and features only; never copy a design, code or text.

**Method.** Web searches across 2025–2026 roundups (Colorlib, Zarla, Jobber Academy, ServiceTitan, Hook Agency,
WebCitz, createtoday, NanoGlobals, Skillmammoth, CI Web Group, UENI, GorillaDesk), then I opened about 30 live home
pages with a page reader to see the first screen and section order first-hand: Doggone Good Heating & Cooling, Cheap
Cold Air, Air It Up, Reliant Plumbing, One Nation Exteriors, Hedlund Painting, Axcel Pest Control, Bama Air Systems
(Cullman), Sullivan's Landscaping, ZEHR Property Maintenance, Horse Creek Lawn Care, Peek Lawn Care, Cory's Lawn
Service, Greenbeard Lawn Care, Bailey Lawn Care (Cullman), 4 Seasons Landscape (Cullman), Allegiance Pressure Washing,
Peachtree Power Wash, Water Works Pressure Cleaning, Music City Pressure Washing, Karen's Green Cleaning, Two Bettys,
Ivory Maids, Simply Pure Home, Maid Marines, Heaven Scent (Cullman), Sweepers Office Cleaning (Gadsden), Double Duty
(Decatur), plus Doggone's membership page. Another ~45 sites are described from reviewers' write-ups and are marked
"(per <source>)". Counts in the "above the fold" sections are tallies over those sites, so they are directional, not
statistics. Vendor sources (agencies, software companies) are flagged where their numbers are self-reported.

**What I could not get.** Reddit is unreachable from this environment (reddit.com and old.reddit.com both refused,
and no search query returned r/sweatystartup, r/Plumbing, r/HVAC or r/lawncare threads), so "what actually got calls"
comes from homeowner surveys and agency case studies rather than owner anecdotes. Several JavaScript-only sites
(Scissortail, Spruce Lawn Care, Gray Duck Plumbing, North Country Janitorial, Stetty's Lawns) returned empty pages;
those are described from reviewers only.

---

## 0. Numbers worth saying out loud when showing a preview

These are the 2025–2026 figures that back the modules below. Quote them with the source; the two vendor surveys are
large but self-published.

| Claim | Number | Source |
|---|---|---|
| People who visit the business website after reading positive reviews | 54% (was 32% in 2019) | [BrightLocal Local Consumer Review Survey 2026](https://www.brightlocal.com/research/local-consumer-review-survey/) (n=1,002, Feb 2026) |
| Won't use a business under 4 stars / under 4.5 stars | 68% / 31% (31% was 17% a year earlier) | same |
| Won't use a business with fewer than 20 reviews | 47% | same |
| Only trust reviews from the last 3 months / last month matters | 74% / 44% | same |
| Expect the owner to reply to reviews | 89% (50% put off by templated replies) | same |
| Use AI tools (ChatGPT etc.) for local recommendations | 45% (was 6%); Google fell from 83% to 71% | same |
| Expect a user-friendly, professional website | 96% | [Housecall Pro homeowner survey](https://www.housecallpro.com/resources/home-service-customer-service-report-trends-statistics/) (n=1,040, Oct 2025) |
| Factor online booking into choosing a pro | 80% | same |
| Say response time matters / instant estimates influence the hire | 97% / 93% | same |
| Frustrated by hidden costs | 77% | same |
| Expect text updates as the job progresses | 59% | same |
| Say past-work photos influence them / expect photo proof of finished work | 92% / 68% | same |
| Expect flexible payment plans or financing | 55% | same |
| Like seeing the technician's name and photo before the visit | 58% | same |
| Contractors who offer financing: higher close rate / higher ticket | +12% / +13% | [ServiceTitan, Synchrony, Visa 2025 Consumer Trends in the Trades release](https://www.synchrony.com/contenthub/newsroom/majority-of-homeowners-expect-personalized-digital.html) |
| Consumers who actively look for financing options | 41% | same (Synchrony Major Purchase Journey survey) |
| Homeowners who begin the search online | 80% | same |
| Financed jobs vs other jobs (average size) | 4.5× ($4,500 vs $1,000) | [Wisetack report](https://www.wisetack.com/press/home-services-businesses-can-win-jobs-4-5-times-bigger-by-offering-financing-new-wisetack-report-shows) (2023, vendor) |
| Share of AI-answered bookings that come in after hours | 26% | [Housecall Pro](https://www.housecallpro.com/resources/ai-booking-dispatch-home-services/) (vendor data, undated) |
| Mobile sites passing Core Web Vitals | 48% (desktop 56%) | HTTP Archive Web Almanac 2025, via [UENI](https://ueni.com/blog/cleaning-service-website/) |

Agency claims that are plausible but unverified (one author's own testing): a 24-pt tap-to-call button out-converts a
14-pt one by about 2×, real photos out-convert stock about 3×, hiding all pricing behind a form costs 30–50% of
inbound, 82–90% of plumber-site traffic is mobile
([Skillmammoth](https://skillmammoth.com/blog/plumber-website-design)). Treat them as directional.

---

## 1. Contractors and home services

Covers plumbing, HVAC, roofing, electrical, painting, concrete, handymen, fencing, remodeling, appliance, tree, pest,
septic/dirt work, doors/gutters/welding, floors/drywall. The `contractor` pack already keys its services by trade; the
patterns below are what the 2024–2026 standouts share and where trades differ.

### 1A. Standout independent sites (2024–2026)

Ordered roughly by how close the business is to a Cullman one-to-ten-truck shop.

| # | Site | Trade, size, place | What grabs attention in the first screen |
|---|---|---|---|
| 1 | [Axcel Pest Control](https://www.axcelpestcontrol.com/) | Pest control, founded 2023, Oklahoma City | Headline "Oklahoma City's Most Thorough Pest Control Company"; a two-field mini form (pest type + area) and a call link beside a photo of a tech treating a fence line; four badges: state licensed, no contracts, free return visits, same technician each visit; a promo bar with a first-treatment code and a **Text us** button. Plans are priced on the page: monthly $59, every 2 months $80, quarterly $110, all no-contract. |
| 2 | [Air It Up Air Conditioning & Heating](https://airitupnola.com/) | HVAC, family-owned since 2000, Gretna LA | A *question* headline ("Is your AC blowing warm air in the Louisiana heat?"), "same-day or next-day, upfront pricing" subhead, 5.0 on 153 Google reviews, call button + a hero quote form (name, phone, email, service type, SMS consent). Below: a comfort-problem picker, maintenance plans, 10% off repairs for members, Wisetack/GoodLeap financing. |
| 3 | [Doggone Good Heating & Cooling](https://calldoggone.com/) | HVAC, repair-first, Baton Rouge | Top banner "Already have a quote? We'll review it free"; headline "Fast, honest HVAC service that puts your budget first"; three badges (100% satisfaction, 24/7 emergency, family owned); van + dog mascot. Mobile bar has four actions: Call (24/7), Free quote, Text us, Book online. Membership is one $99/yr card with published inclusions ([membership page](https://calldoggone.com/memberships)). |
| 4 | [Reliant Plumbing](https://reliantplumbing.com/) | Plumbing, founded 2014, Austin | "Your trusted 24-hour plumbing experts"; Call now + Book online; a uniformed employee in front of a yellow truck; a four-icon row (licensed & insured, financing available, residential & commercial, satisfaction guaranteed); "10 years, since 2014" badge. Below: local "Best of" awards by year, a separate emergency banner with two numbers, "service fee waived" offer, license number RMP-42389 in the footer. |
| 5 | [One Nation Exteriors](https://onenationexteriors.com/) | Roofing, Lino Lakes MN | "Friendly Minnesota roofing experts"; hero form "Request a free inspection — free, no obligation" (7 fields + consent); badges family-owned, GAF Master Elite, 25+ years; 5.0 on Google, Facebook and BBB side by side. Below: storm & insurance help with photo documentation, a five-step process, lifetime workmanship warranty, "Check your address" service-area map, MN and WI license numbers in the footer. |
| 6 | [Hedlund Painting](https://www.hedlundpainting.com/) | Painting, since 2014, Seattle area | "Seattle-area painters you can trust / backed by a 10-year warranty"; Get your free estimate + Call; a real house photo captioned with the town; badge row (Top rated on Google, EPA Lead-Safe, Best of Houzz, BBB A+). Below: service area grouped by region, 8 project cards labelled by town, 6-step process, 4.9 on 122 reviews, "12.5 years". |
| 7 | [Cheap Cold Air](https://www.cheapcoldair.com/) | HVAC install/replace, Austin | One promise brand: "Cold air is cold air. Why pay more?"; hero subhead "Transparent pricing. No upselling. Guaranteed."; Book now + Call + "Licensed & Insured" badge; problem-based cards ("AC not cooling?", "High energy bills?"); an 8-item maintenance checklist; license TACLA160390E in the footer. Anti-pattern on the same page: "0+ installations / 0% satisfaction" counters that never animated. |
| 8 | [Bama Air Systems](https://bamaairsystems.com/) (local, Cullman) | HVAC, family-owned since 1989 | "Your family-owned heating and cooling team in Cullman, AL since 1989"; Book now (Housecall Pro) + call + Specials & Rebates; AL License #89459 and TN #60679 stated; Google Guaranteed, BBB A+, Daikin and Mitsubishi dealer badges, Cullman Times Best of the Best 2025 and 2026; diagnostic "starting at $89". Three maintenance tiers (Standard / Comfort / Complete) with concrete perks (10/15/20% off repairs, no overtime charges on the top tier), GreenSky/GoodLeap/Service Finance logos, TVA EnergyRight rebates up to $1,500, three coupons. This is the local bar an HVAC preview is measured against. |
| 9 | Gray Duck Plumbing (grayduckplumbing.com) | Plumbing, woman-owned, St Paul | Duck mascot with a wrench, Call now + Schedule service both in the first screen, trust bar "woman-owned, plumbers since 1999"; Financing and "Virtual plumber" in the nav. No rating above the fold (per [Skillmammoth](https://skillmammoth.com/blog/plumber-website-design)). |
| 10 | Brothers Plumbing, Heating & Electric (Denver) | Multi-trade, larger | Van and two staff in front of the skyline, "Same Day Service Available" above a big red number and a Schedule button, "9,095 reviews" as the first number on the page, a $50-off offer directly under the hero (per Skillmammoth). Too big to copy whole; the hero recipe scales down. |
| 11 | Ken's Tree Service (kens-tree-service.com); Steve's Tree & Hauling (stevestreeandhauling.com) | Tree service | Ken's: looping video with one big "Schedule an assessment" button. Steve's: a Jobber quote form that takes **photos with the request**, service areas, payment methods, local permitting notes (per [Jobber](https://www.getjobber.com/academy/tree-service-arborist/best-arborist-websites-designs/)). |
| 12 | Handyman Mark (handymanmarknc.com); Zach of all Trades (zachofalltradesmt.com) | Handyman | Mark: BBB rating and "veteran owned and operated" on the home page, gallery, quote form, free downloadable maintenance checklists. Zach: pricing info in the nav, before/after gallery, Jobber form asking services wanted + availability (per [Jobber](https://getjobber.com/academy/handyman/handyman-website-examples/)). |

Also worth a look (per reviewers): Medley Heating & Air, team photo plus "900+ Google reviews" linked in the hero
([ServiceTitan](https://www.servicetitan.com/blog/hvac-websites)); Atlas Heating & Air, star rating, phone, address and
Book Now all above the fold; Boulden Brothers, the two owners in front of a branded truck; Rene's Heating & Air, a real
technician photo and an emergency button (per the 2026 HVAC roundups at [Colorlib](https://colorlib.com/wp/hvac-company-website-examples/),
[Zarla](https://www.zarla.com/inspiration/hvac), [Skillmammoth](https://skillmammoth.com/blog/hvac-website-design) and
[Customershand](https://customershand.com/blog/best-hvac-company-websites/));
Angels Cooling, a "$0 down" financing block with an Apply button and a 30-city service-area map
([CI Web Group](https://ciwebgroup.com/guides/best-hvac-website-design)); Central Ohio Tree Care, a veteran-owned
Squarespace site listing ISA and TCIA membership ([Colorlib](https://colorlib.com/wp/tree-service-website-examples/)).
Anti-example: Erik Nelson Plumbing, an 11-person shop with a fixed-width page, no buttons and the phone in small text
(Skillmammoth).

### 1B. Above the fold, ranked by frequency among the good sites

Tallies are over the ~25 contractor home pages I opened or that reviewers described in detail.

**Hero structure** (most to least common)
1. Headline + two buttons on the left, a photo of *their own* truck, tech or owner on the right or behind (Reliant,
   Brothers, Boulden, Doggone, Medley, Axcel, Rene's): about half.
2. Headline + a short lead form in the hero (One Nation, Air It Up, Soderlin, Axcel's two-field version, McAtee,
   Painter Bros): about a third. The best keep it to 3–5 fields; several run to 7 plus consent checkboxes.
3. Illustration or mascot instead of a photo (Doggone, Gray Duck, Maize, AirWorks' tappable house): a visible 2026
   trend for brands that want to look local and friendly without a photo shoot.
4. Dark theme with one promise line and no photo (Cheap Cold Air).
No autoplay carousels in any standout; looping *silent* video appears on tree/landscape sites (Ken's, Scissortail).

**Headline strategy**
1. **Trust word + trade + region** is the most common: "Friendly Minnesota Roofing Experts", "Seattle-Area Painters
   You Can Trust", "Your Trusted 24-Hour Plumbing Experts", "Oklahoma City's Most Thorough Pest Control Company".
2. **Plain service + town**: "AC Repair Arlington TX" (Metro Express, per [createtoday](https://createtoday.io/examples/best-hvac-websites)),
   "Your Family-Owned Heating and Cooling Team in Cullman, AL since 1989" (Bama Air).
3. **Promise**: "Fast, Honest HVAC Service That Puts Your Budget First" (Doggone), "Cold air is cold air. Why pay more?"
   (Cheap Cold Air), "Advanced Comfort. Made Simple." (per CI Web Group).
4. **Question**: "Is Your AC Blowing Warm Air in the Louisiana Heat?" (Air It Up); the Mr. Handyman home page asks a
   question in large capitals (per the 2025–2026 handyman roundups at [Zarla](https://www.zarla.com/guides/handyman-website-examples)
   and [Website Planet](https://websiteplanet.com/blog/best-handyman-website)).
5. **Customer-focused**: "Protect Your Family and Home" (Northface Construction, per [Hook Agency](https://hookagency.com/blog/best-roofing-websites/)).
Hook Agency's 2026 advice is the shortest version: say what you do and that you solve it *now*
("HVAC problems? Solved today.") ([Hook Agency 2026 trends](https://hookagency.com/blog/contractor-website-design-trends-2026/)).
Our DNA `headline` knob (what+where / name / promise) already covers 1–3; the question form (4) is missing.

**Primary and secondary action**
- Plumbing/HVAC/electrical/appliance/garage doors: **Call** + **Book online / Schedule service** (Reliant, Doggone,
  Atlas, Bama Air, Bradham Brothers with ServiceTitan scheduling). Where there is no booking tool: Call + Request service.
- Roofing/painting/remodel/concrete/fencing/tree: **Free estimate / Free inspection / Schedule an assessment** + Call
  (One Nation, Hedlund, Ken's, Hook Agency's "free estimate button top-right of every page").
- A third **Text us** action is now common on the best small sites (Doggone's bar, Axcel's promo bar, All Bright
  Painting's four-way sticky widget: call, text, email, chat, per [WebCitz](https://www.webcitz.com/blog/best-painters-websites/)).
- "Free second opinion" as a *top banner* on repair trades (Doggone, Air It Up, Logan Services' dedicated page
  [logan-inc.com](https://www.logan-inc.com/free-second-opinion)).

**Proof shown in the first screen**
1. Google rating with the count (5.0 · 153; 4.9 · 122; 4.7 · 559; "900+") — on roughly half, and reviewers single
   out sites that lack it (Gray Duck, Christopher's). Housecall Pro's homeowner survey and BrightLocal both say the
   count and recency matter, so "4.9 on 122 reviews" beats five gold stars.
2. A row of 3–4 chips: licensed & insured, family-owned, 24/7, satisfaction guarantee, financing available, free
   estimates, same-day.
3. Years or founding year ("since 2000", "25+ years", "10 years, since 2014").
4. Manufacturer or program badges: GAF Master Elite, Amana/Daikin/Mitsubishi dealer, EPA Lead-Safe (painters),
   Google Guaranteed, BBB A+, local "Best of" with the year.
5. License number: in the footer on most (Reliant, Cheap Cold Air, One Nation); Bama Air puts it in the first screen.
   Alabama's HVAC board **requires** the certification number on the website home page, prefixed "AL#" (see 1D).

**Imagery**: own truck/crew/owner > illustration or mascot > a finished-job photo (Christopher's bathroom, One Nation's
project beside the form) > none. Every 2026 source says stock photos read as fake
([Hook Agency 2026](https://hookagency.com/blog/contractor-website-design-trends-2026/),
[tinyfrog 2026](https://tinyfrog.com/web-design-trends-2026/), [TheeDigital 2026](https://www.theedigital.com/blog/web-design-trends)).

**Emergency / 24-7**: a thin utility strip or a hero chip ("24/7 Emergency ★ Licensed techs" on Doggone; "Available
24/7/365" navy banner on Kensington Mechanical, per createtoday), and on Reliant a *separate* emergency banner with the
after-hours number. Skillmammoth's main critique of otherwise good plumbing sites is a single generic form that gives the
3 a.m. caller and the "replace my water heater next month" shopper the same path.

**Financing**: an icon in the hero row (Reliant), a header button (Skylake, per ServiceTitan), a "$0 down" block
with Apply (Angels Cooling), or lender logos in their own section (Bama Air: GreenSky, GoodLeap, Service Finance;
Air It Up: Wisetack, GoodLeap, FTL). Every one links out to the lender's application; none embeds it.

### 1C. Home-page section order and the shapes

The order the first-hand pages converge on (Doggone, Air It Up, Reliant, One Nation, Hedlund, Axcel, Bama Air):

1. Utility banner (free second opinion / 24-7 / specials) · 2. Header: logo, phone, one button · 3. Hero (above) ·
4. Services: 5–9 cards with a photo or icon · 5. Promise / "why us": 3–4 points (upfront pricing, on-time, clean,
same tech) · 6. Process: 3–6 numbered steps · 7. Trade module: maintenance plan, financing, storm & insurance, or
warranty · 8. About / meet the owner (family since YEAR, photo) · 9. Reviews: 3–7 quotes + "read all" link ·
10. Offer or member discount · 11. Service area: named towns (10–20) and often a map or "check your address" ·
12. FAQ: 6–9 questions (same-day? emergency? financing? brands? guarantee?) · 13. Final CTA ("Prefer to call?") ·
14. Footer with address, hours, license numbers, social, legal.

Four distinct shapes:

- **Dispatcher** (Doggone, Reliant, Rene's): emergency path + booking path in the first screen, promise band, financing,
  short service cards, membership card. Right for plumbing, HVAC repair, electrical, appliance, garage doors, pest.
- **Planned-purchase installer** (Cheap Cold Air, Angels Cooling, Swiss Air, Enviro per CI Web Group): problem-based
  cards ("AC not cooling?"), repair-vs-replace explainer, financing estimate, maintenance tiers with a checklist,
  service-area cards. Right for HVAC replacement, generators, water heaters, roofing re-roofs.
- **Project portfolio** (One Nation, Hedlund, Precision Painting Plus): hero form + badges, project cards labelled with
  the town, process steps, warranty section, grouped service area. Right for roofing, painting, remodel, concrete,
  fencing, flooring, drywall, gutters.
- **Owner-story local** (Air It Up, Bama Air, Boulden, Oehl's four-generation family portrait per createtoday): the
  family and the year first, then neighborhood-level content and a learning center. Right for any long-established
  family trade; weak for a 2023 startup, which should use Dispatcher with proof of process instead (Axcel).

### 1D. Features unique to the trades

Priority is for a first-site owner in a small town. "Default/generate" says whether we can ship it without the owner
typing anything.

| Feature | Why it sells | Owner must supply | Default or generate? | Priority |
|---|---|---|---|---|
| Emergency / after-hours banner with the number to call | Repair trades are bought in a panic; Housecall Pro: 97% say response time matters, 26% of AI-answered bookings come after hours | Confirmation they take after-hours calls, any after-hours number, the terms (weekends? fee?) | Render from `ext.contractor.emergencyService` + an `afterHours` text; never default on | Must (plumbing, HVAC, electrical, garage door, appliance, tree storm); Should (roofing leaks) |
| Financing badge + "Apply" link | +12% close, +13% ticket (ServiceTitan/Synchrony); 55% of homeowners expect it; Wisetack is the default inside Jobber ([Jobber financing](https://www.getjobber.com/features/consumer-financing/), 3–60 months) and Housecall Pro ([$500–$25,000](https://help.housecallpro.com/en/articles/3836042-wisetack-consumer-financing-overview)) | Lender name + their application URL (or "ask us") | `ext.contractor.financing {lender,url}` exists in the type; render as a chip + section; lender logos only with permission, text otherwise | Must (HVAC, roofing, remodel, electrical panels/generators, septic); Should (plumbing water heaters, fencing, concrete, flooring) |
| License number shown with the right prefix | **Alabama HVAC rule 440-X-5-.07**: company name + "AL#" number on websites, estimates, invoices, vehicles; failure is grounds for discipline ([rule text](https://regulations.justia.com/states/alabama/title-440/chapter-440-x-5/section-440-x-5-07), [board FAQ](https://hacr.alabama.gov/faq/what-are-the-requirements-for-displaying-my-certification-number/)). **Home builders (remodel over $10k): Act 2024-443** requires the license number on websites, social ads, vehicles, cards ([HBLB](https://hblb.alabama.gov/changes-to-statutory-regulations-become-effective-march-17-2025/)). Plumbing/gas: the board's Jan 2026 rule compilation has no advertising rule (only annual business registration, 720-X-17-.01). Electrical: the Feb 2026 rules only require the license displayed at the place of business (303-X-5-.05). | License label + number (+ state) | Footer already prints `label #number`; HVAC needs "AL# 89459" wording and a copy near the top (Bama Air does this); required to-do for HVAC and remodel | Must (HVAC, remodel); Should (all) |
| Maintenance plan / club card(s) | Recurring revenue and the top module on HVAC sites (14/18 in the blueprint); local competitor shows 3 tiers | Tier names, price, visits per year, perks (priority, % off repairs, no overtime) | Template 1 or 3 cards + an 8-item tune-up checklist (Cheap Cold Air style) with owner-filled prices; hide without prices | Must (HVAC); Should (pest quarterly plans, garage door tune-ups, plumbing "home care") |
| Pest plan pricing (monthly / bi-monthly / quarterly) | Axcel publishes $59/$80/$110 no-contract; 93% say instant estimates influence the hire | Three prices and what each visit includes | Card trio + "what every visit includes" steps | Must (pest) |
| Storm & insurance-claim help | Roofing's signature module (15/17 in the blueprint); One Nation: free inspection, photo documentation, storm damage report | Whether they handle claims, what they document | Default section for roofing with owner toggle; no promises about payouts | Must (roofing); Nice (gutters, tree) |
| Warranty / guarantee band | 37/60 in the blueprint; Hedlund puts "10-year warranty" in the headline; One Nation's lifetime workmanship | Exact terms in their words | `ext.contractor.warrantyText` exists in the type, unrendered; render as a band + FAQ item | Must (roofing, painting, flooring, concrete, fencing); Should (others) |
| Project cards labelled by town (not a bare gallery) | "92% say past-work visuals influence them"; Hedlund and Sullivan's label every card with the neighborhood | Photos + town + one line | Gallery exists; add optional caption/town per photo | Must (roofing, painting, remodel, concrete, fencing, flooring, drywall, welding); Should (others) |
| Before/after pair block | Painters and pressure washers lead with it; 0/60 contractor pages in the blueprint used it, so it differentiates | Paired photos | A two-photo component (click to toggle on phones) | Should (painting, drywall, concrete, gutters, roofing) |
| "Numbers" band (years, jobs, response time) | Common on 2026 sites, but **two first-hand pages showed "0+"** because the counter script failed | Real numbers | Static text only (no animated counters); owner numbers only | Nice |
| Text-a-photo prompt in the form ("text us a picture of the leak") | Jobber's tree-service example takes photos with the request; our forms can't upload, but `sms:` can carry a photo | SMS-capable number | Add a line under the form when `smsEnabled` | Should (plumbing, roofing, appliance, tree, handyman, drywall) |
| Online booking link (Housecall Pro / Jobber / ServiceTitan) | 80% factor online booking; Housecall Pro gives a shareable booking URL ([doc](https://help.housecallpro.com/en/articles/11473210-getting-started-with-online-booking)) | Their booking page URL | `links.booking` + `book` action already exist | Should (HVAC, plumbing, electrical, appliance, garage door, pest) |
| Service-area map or town grid with "check your address" | 8/9 landscaping and all first-hand contractor pages name towns; One Nation and Doggone add a map | Town list | Town chips exist; add a static map image link | Should |
| Residential / commercial split | 45/60 in the blueprint; `ext.contractor.residential/commercial` exist unrendered | Which they do | Chip + form field | Should |
| Brands serviced (Trane, Carrier, Rheem…) | HVAC and appliance buyers search by brand; Doggone and Bama Air list them | Brand list and permission | Text list (no logos) | Should (HVAC, appliance, garage door); Nice (others) |
| Coupons / first-time offers with expiry | 22/60 in blueprint; Reliant seasonal specials, Brothers $50 off, Bama Air 3 coupons | Offer, amount, expiry | `Offer` type exists with `expiresOn`, nothing renders it | Should |
| Utility rebates (TVA EnergyRight via Cullman EC) | Local HVAC lever: rebates require a Quality Contractor Network member ([EnergyRight](https://energyright.com/?p=28230)); Bama Air advertises up to $1,500 | Whether they are QCN members | A link-out line, owner-confirmed | Nice (HVAC only) |
| Same-day / no-overtime / upfront-pricing chips | [Len the Plumber](https://lentheplumber.com/faq/) pairs "no overtime charges" with a 24/7 line and same-day seven days a week; Doggone; Bama Air's top tier; 77% hate hidden costs | Which are true | Pre-written chip options to tick | Should |
| Free second opinion banner | Doggone, Air It Up, Logan Services | A yes | Toggle | Nice (HVAC, roofing, plumbing) |
| Senior / military / first-responder discount | Doggone 20% (seniors, veterans, non-profits); Penguin Air's veteran and public-servant discounts (per [ServiceTitan](https://www.servicetitan.com/blog/hvac-websites)); 11/60 in blueprint | Which groups, how much | Toggle + text | Nice |
| Payment methods row | Anderson Landscape lists cards, PayPal, cash, check; checks fell to 36% of payments (Visa) | What they take | Checkbox list | Nice |
| Technician name + photo before the visit | 58% like it | A photo | "Meet the crew" block (owner photos only) | Nice |
| Lead-safe (EPA RRP) badge for pre-1978 homes | Hedlund promotes it | Certification | Toggle | Nice (painting, remodel, drywall) |
| Permit / local-rules note | Steve's Tree links local permitting | Text | Owner text slot | Nice |

### 1E. Hooks that work, and trust elements

- **Offers**: first-visit code in a promo bar (Axcel), "$X off" directly under the hero (Brothers), service fee waived
  for residential in the area (Reliant), member discount on repairs (Air It Up 10%), free second opinion. Every
  offer needs an expiry; our `Offer.expiresOn` already forces one.
- **Urgency without lying**: "same-day or next-day" (Air It Up), "same-day estimates" (Cheap Cold Air), "we show up
  when we say" (several). Only with the owner's word; the copy brief already bans invented response times.
- **Seasonal**: HVAC tune-up pushes run March–April and August–September, 4–6 weeks before the heat or cold
  ([InvoiceASAP seasonal HVAC campaigns](https://blog.invoiceasap.com/seasonal-hvac-marketing-campaigns-that-drive-results/)),
  and the October furnace demand is decided in August ([CI Web Group](https://ciwebgroup.com/blog/why-august-critical-furnace-tune-up-email-list)); roofing "storm season" pages;
  "winter weather preparation" plumbing specials (Reliant).
- **Local pride**: "serving neighbors, not quotas" (Doggone), neighborhood cards describing typical local houses
  (Air It Up), "Best of Cullman Times 2025 and 2026" (Bama Air), chamber logos (Sweepers).
- **Plain-money promises**: "no overtime charges", "upfront written pricing", "no surprise change orders" (Hedlund),
  "what you see is what you pay" (Ivory Maids). 77% of homeowners name hidden costs as a frustration.
- **Trust order that recurs**: rating + count → licensed/insured (+ number) → years/family → warranty terms →
  manufacturer/program badges → "same tech every time" → local awards → payment and financing.

### 1F. Visual trends 2025–2026 for the trades, and what to avoid

- **Type**: large, heavy headlines that fill most of the first screen; variable fonts; a few expressive serifs
  (Kensington Mechanical's centered serif logo, Aeric's serif italics, per createtoday). Stay readable; kinetic text is
  for brands, not for a plumber ([TheeDigital](https://www.theedigital.com/blog/web-design-trends), [tinyfrog](https://tinyfrog.com/web-design-trends-2026/)).
- **Color**: for HVAC/plumbing, navy (7/16 palettes) and orange (6/16) dominate, white backgrounds on 7/16
  ([createtoday HVAC](https://createtoday.io/examples/best-hvac-websites)); the general 2026 advice is calmer, grounded
  palettes with one saturated accent on a dark or neutral section and 4.5:1 minimum contrast
  ([TheeDigital](https://www.theedigital.com/blog/web-design-trends), [tinyfrog](https://tinyfrog.com/web-design-trends-2026/)). Dark-mode heroes work for install brands
  (Cheap Cold Air) but not for emergency pages where the number must pop.
- **Imagery**: own trucks, crews and owners; illustrated houses and mascots as the alternative when there is no
  photographer (Doggone, Gray Duck, Maize, AirWorks); vertical 9:16 crops for phone heroes; WebP/AVIF.
- **Motion**: micro-interactions under ~300 ms, reduced-motion respected, no heavy parallax, no autoplay-with-sound
  video, no carousels (tinyfrog). Silent looping video only where the work is visual (trees, landscapes).
- **Rhythm**: hero → tight 3–4 chip proof row → services → promise band → process; bento-style grids for services on
  desktop that stack on phones; thumb-reach placement of call buttons (TheeDigital).
- **Avoid**: stock photos; animated counters (two first-hand pages rendered "0+"); mismatched phone numbers (Axcel's
  footer differs from its header; Reliant shows a Dallas area code on an Austin page); H1s that don't match the page
  (Allegiance's H1 says Christmas lights); placeholder text left live (Double Duty's alert banner); mega-menus; walls of
  text; "#1 rated" with no reviews shown (Cheap Cold Air); cookie banners covering the trust paragraph (Abacus, per
  Skillmammoth).

---

## 2. Landscaping and lawn care

### 2A. Standout independent sites

| # | Site | Type, size, place | First-screen hook |
|---|---|---|---|
| 1 | [Peek Lawn Care](https://peeklawncarellc.jobbersites.com/) | One-crew lawn care, Louisville KY, a free Jobber one-pager | A "5.0" with the Google logo *above* the headline "Your reliable partner for exceptional lawn care", one "Get an estimate" button, lawn photo. Then three specialties (aeration, fertilization, weed control), the services list, three Google reviews (one praising tornado clean-up), a crew photo, client login. The closest analogue to a Cullman one-truck business, and it shows how little is needed. |
| 2 | [Cory's Lawn Service](https://coryslawnservice.com/) | Lawn care since 2006, Reno NV | "Take your weekend back with expert lawn care in Reno, NV" (benefit + town); founder photo and team photo; call + Get a free quote. **Starting-at prices per service** (mowing $34, fertilization & weed control $42/$65, aeration $76, cleanup $278, sprinkler repair $145, snow $135 with three season-pass tiers paid in five installments), a 4-step process ending in "card charged automatically after service". Their "years" counters rendered 0 (same anti-pattern). |
| 3 | [Greenbeard Lawn Care](https://greenbeardlawncare.com/) | Lawn care + organic treatments, North Columbus OH | H1 is service + town; a "complete the form, receive a free estimate" lead form directly under the hero; mascot; four service cards with bullets (weekly or bi-weekly, all-electric, aeration, overseeding); nine Google reviews, one praising "photos after each visit"; family photo; ten named areas plus "other areas may cost extra"; an "Our pricing" page in the nav. |
| 4 | [ZEHR Property Maintenance](https://www.zehrpropertymaintenance.com/) | Landscape/hardscape, 20 years, Peoria IL | Header: Estimate + Call. Hero: name, eyebrow "Peoria area landscaping, hardscaping, and outdoor maintenance", three badges (20 years local, residential and commercial, Greater Peoria). An estimate form with a 12-service dropdown and property address/city. Galleries *by service* with filter tabs; ten towns plus 13 ZIP codes; Mon–Sat 7–5 in the footer. |
| 5 | [Sullivan's Landscaping](https://sullivanslandscapingservice.com/) | Design-build, since 2011, Austin | Eyebrow "Design • Installation • Maintenance"; "Austin's premier landscape design & installation since 2011"; phone + Book a consultation; a scrolling strip of service areas above the header; 4.6 on 160 reviews, "14+ years", licensed & insured under the hero; "Meet our owner" first, three focus areas, 5-step process, four project cards named by neighborhood. |
| 6 | Scissortail Landscaping (scissortailokc.com) | Design-build, since 2018, OKC | Drone video of a finished yard with the logo over it; "Call or Text" + "Book consultation" in the header; six project photos directly under the hero; five area pages (per [WebCitz](https://www.webcitz.com/blog/best-landscaping-websites/)). |
| 7 | Rosario Gambino & Son (rgslandscaping.com) | Design-build, Chicago suburbs | Header shows phone, *hours* (Mon–Fri 8–5) and a free-quote link on every page; gallery thumbnails labelled by suburb; reviews tagged by service with links to Google/Yelp; consultations include a firm quote and a rendering (per WebCitz). |
| 8 | Gardens of Babylon (gardensofbabylon.com) | Design-build, Nashville | "Book a consultation" in header and hero with phone and text beside it; nine service tiles with icons; a seven-step process that includes an investment guide with price ranges and "start within 48 hours of signing" (per WebCitz). |
| 9 | Anderson Landscape & Tree (andersonlandscapemain.com) | Landscape + tree, 20+ years, Portland | Live Google review feed, HomeAdvisor/Thumbtack badges; "before and during" project sequences; the quote form explains **two estimate paths** (drive-by estimate or scheduled walkthrough) and lists payment options incl. invoicing and a portal; 16 communities (per WebCitz). |
| 10 | Greenside Property Care (greensidepropertycare.com) | Lawn crew | "Take back your weekends. We'll handle your lawn." with a Google 5-star badge fixed in the header (per [createtoday](https://createtoday.io/examples/best-lawn-care-and-landscaping-websites)). |
| 11 | Stetty's Lawns (stettyslawns.com); Level Lawns (levellawns.com) | Lawn crews | Stetty's: large before/after photos, Google reviews, **20% off the first service**, free quote. Level: experience, client count, square footage serviced, a 100% satisfaction guarantee, FAQ (per [Jobber](https://www.getjobber.com/academy/lawn-care/lawn-care-website-design/)). |
| 12 | Nature's Elite (natureselitelandscape.com); Adam's Tree & Lawn Care (adamstreeandlawncare.com) | Lawn & landscape | Nature's Elite: an orange alert banner with the phone number, overlapping residential/commercial cards. Adam's: "Frederick's most professional & reliable landscape company", two-button CTA over a diagonal mowed-lawn hero (per createtoday). |

Local bar: [Bailey Lawn Care](https://baileylawncare.com/) (Cullman) opens with "Top-rated lawn care services in
Cullman", Contact us + phone, a 7-item service checklist, four differentiators including "full licensing and
insurance", six project photos, three testimonials and a 4-field form; no prices, plans, town list or map.
[4 Seasons Landscape](https://4seasonslandscapellc.com/) (Cullman) has "Get a free consultation", four service cards,
a FAQ and "Serving Cullman County", but no reviews, gallery, form or process. A preview with a town list, a gallery
slot, "ways to work with us" and a visible rating already beats both.

Anti-example: [Horse Creek Lawn Care](https://horsecreeklawncare.com/) (Springfield IL): good headline ("Get the best
lawn care service in Springfield, Illinois" with towns in the subhead), then three one-line sections, no reviews, no
photos described, no form, copyright 2019.

### 2B. Above the fold, ranked

createtoday's measured sample of 28 lawn/landscape sites: text over a full-width photo on 76% of heroes, photography in
89% of heroes, near-white backgrounds 71%, muted palettes 68%, green as the primary button color on 54% (vs 8% across
all industries), median 5 nav links ([createtoday](https://createtoday.io/examples/best-lawn-care-and-landscaping-websites)).

1. **Hero structure**: full-width yard or job photo with text over it (most), then split hero with a lead form right
   beside or directly under the headline (Greenbeard, ZEHR, Music City-style), then silent drone/job video (Scissortail,
   ZEHR, Green Groove per Jobber). Design-build sites put six project photos immediately under the hero.
2. **Headline**: benefit + town ("Take your weekend back with expert lawn care in Reno, NV"; "Take back your weekends";
   Cory's, Greenside, Yard Bot) and plain service + town ("North Columbus Lawn Care & Mowing Services", "Lawn Care
   Services in Spokane, WA", "Lake Minnetonka Lawn Care Services") are tied; design-build uses premium + town + since
   ("Austin's premier landscape design & installation since 2011"). Pure name headlines (ZEHR) are rare.
3. **Actions**: lawn crews: **Get a free quote/estimate** + Call (Spruce repeats the estimate button three times);
   design-build: **Book a consultation** + Call (3/9 in WebCitz's audit have it in the header), and "Call or Text".
4. **Proof**: Google rating badge (Peek, Greenside, Sullivan's 4.6/160), years ("since 2006", "20 years local"),
   licensed & insured, residential + commercial, "family/locally owned" (ZEHR's family portrait, Greenbeard's family photo).
5. **Imagery**: a yard they did > crew/owner/truck > drone video > mascot (Greenbeard, Horse Creek's illustrated house).
6. **Emergency banners**: only storm clean-up for tree work; none on lawn sites. **Financing**: a "We finance" nav link on
   design-build (Sullivan's); none on lawn crews.

### 2C. Section order and shapes

Lawn crew (Peek, Cory's, Greenbeard, Bailey): hero → lead form (or form link) → services with bullets (frequency,
what is included) → owner story → starting-at prices or "ways to work with us" → reviews → towns (+ "other areas
extra") → hours/contact. Design-build (Sullivan's, ZEHR, Scissortail, Gardens of Babylon): hero → project photos →
meet the owner → 3 focus areas → 4–7 step process → gallery by service → reviews → towns → consultation CTA.

Shapes: **One-pager with a rating** (Peek: eight blocks, no nav), **Weekend-back crew** (Cory's/Greenside: benefit
headline, founder photo, per-service starting prices, autopay process), **Lead-form first** (Greenbeard/ZEHR: form
under the hero, galleries by service, ZIP list), **Portfolio studio** (Sullivan's/Scissortail: video or six photos,
process, named projects, consultation).

### 2D. Features unique to lawn and landscape

| Feature | Why it sells | Owner must supply | Default or generate? | Priority |
|---|---|---|---|---|
| "Ways to work with us" / plans (one-time, seasonal cleanup, weekly, every 2 weeks, monthly) | Recurring service is the business model; 33/59 blueprint sites mention plans but only 3 show tiers | Which frequencies, any discount | Template three cards from the services list; prices optional "starting at" | Must |
| Starting-at prices per service | Cory's shows six; 93% say instant estimates influence the hire; Skillmammoth claims hiding prices costs 30–50% of inbound | Prices | `CardItem.price` already exists in `serviceList`; owner-filled, hidden otherwise | Should |
| Before/after pairs | 3/59 in the blueprint, yet the most persuasive format; Stetty's leads with it; sliders fit "seasonal comparison" | Paired photos | Two-photo block, click to toggle on phones | Must (when photos exist) |
| Gallery by service with captions/towns | ZEHR filter tabs, Rosario's suburb labels, Sullivan's named projects | Photos + tag | Add caption/service/town to gallery items | Should |
| Seasonal calendar (what we do each season) | A category signature; Alabama warm-season schedule is concrete: pre-emergent Feb–early March, mow from mid-March, fertilize late March–April when nights warm, final feed late May, fall pre-emergent mid-Sept–early Oct, final mow November ([Lawn Love schedule](https://lawnlove.com/blog/lawn-care-schedule-alabama/), [ACES ANR-3107](https://aces.edu/wp-content/uploads/2024/11/ANR-3107_SouthAlaGardening-GeneralMaintenanceSchedule_110724L-G.pdf)) | Which seasonal services they offer | Generate a 4-season band from the services (mowing, cleanups, pine straw, pre-emergent only if they hold the permit) | Should |
| Alabama ADAI permit line for fertilization / weed control | Applying fertilizer, herbicide or pesticide for pay needs an ADAI Horticulture Professional Services license with a certified operator; mowing/trimming/planting do not ([ACES](https://www.aces.edu/blog/topics/commercial-applicator/ornamental-and-turf-pest-control-commercial-applicator-permit-information-otps-otpc/), [startbusinessbystate](https://startbusinessbystate.com/alabama/landscaping/)) | Permit number, or drop those services | Required to-do when services include fertilization/weed/pest; show "ADAI permit #" chip when given | Must (compliance) |
| Two estimate paths (drive-by vs walkthrough) | Anderson explains it; crews quote from the curb for mowing but walk the yard for installs | Which they do | Template text toggle | Nice |
| "We text you a photo after each visit" | Greenbeard's reviewers mention it; 68% expect photo proof | A yes | Chip + FAQ answer | Should |
| Autopay / card-on-file note | Cory's process step; Jobber reports 50% of the payments it processes are now online ([Q3 2025 report coverage](https://www.landscapemanagement.net/jobber-releases-its-latest-home-service-economic-report-for-q3/)) | How they bill | Process step text option | Nice |
| Client hub / pay-online link | Jobber/Yardbook client portals on 12/59 blueprint sites | Portal URL | `portal` action exists | Nice |
| Instant quote tool link | Satellite-measured quotes (Service Autopilot + Deep Lawn, LawnVex, RealGreen) exist, but all are paid software | Their tool URL | Link-out button only | Nice |
| Snow / holiday lights / pressure washing add-ons | Regional add-ons; holiday lights on 7/59 blueprint sites, a season tier on Cory's | Which add-ons | Services list | Nice |
| Residential vs commercial (HOAs, churches, property managers) | ZEHR badge; Cutting Edge sorts by contract type | Which | Chip + form field | Should |
| Guarantee ("if something's missed we come back") | 18/59 blueprint; Level Lawns 100% | Owner wording | Text slot + FAQ | Should |
| "Other areas served for an extra charge" line | Greenbeard; honest about the radius | Radius | Service-area intro option | Nice |
| First-service discount / referral credit | Stetty's 20% off first service; Triangle Window's referral cash | Offer + expiry | `Offer` render | Nice |

### 2E. Hooks and trust

Hooks: "take your weekend back" (three sites), "one crew for the whole property" (ZEHR), 20% off the first mow,
"start within 48 hours of signing" (design-build), "photos after each visit", "no contracts / pause anytime" borrowed
from cleaning. Seasonal: spring cleanup + pre-emergent in February, pine straw before Easter, fall cleanup + leaf
removal in November, holiday lights in October. Local pride: ZIP codes and town lists (ZEHR's 13 ZIPs), "based in
Morton, IL" style footers, chamber or turfgrass-association logos. Trust order: real yard photos → rating+count →
owner face + year → licensed & insured (ADAI permit for chemicals) → named-town testimonials → guarantee.

### 2F. Visual trends and what to avoid

Green buttons on a near-white page are the category default (54%), so the 2026 advice is to pair green with a second
accent (amber/orange on 14%, lime on 11%) and use a distinct heading face (hand-lettered logos, serif italics, warm
cream + red-orange on Trim and Chopper, per createtoday). Heroes are photo-over-text; drone and walk-through video are
rising on design-build; illustrated houses and mascots on crews. Avoid: stock lawns, counters that show 0, "premier"
without proof, generic contact forms that don't ask frequency or address, galleries with no captions, 2019 copyright
lines.

---

## 3. Cleaning services

Covers house cleaning, commercial janitorial, and pressure/window washing (`cleaning` pack variants residential /
commercial / exterior).

### 3A. Standout independent sites

| # | Site | Type, size, place | First-screen hook |
|---|---|---|---|
| 1 | [Heaven Scent Cleaning Services](https://heavenscentcullman.com/) (local, Cullman, since 2021) | Residential + move-out, team of 3–4 | Eyebrow "Cullman County, Alabama"; "A fresh start for your home"; Call + **"See services & pricing"**; badges: 100% recommend, 34 five-star reviews, insured, est. 2021; towns named in the hero. Then four differentiators (insured, no contracts, supplies provided, same local team led by Shayla), team photo, a draggable before/after slider, and **prices**: Basic $100–$400, Deep and Move-out $85–$100/hour. This is the local bar for a house-cleaning preview. |
| 2 | [Ivory Maids](https://ivorymaids.com/) | Residential, Dallas | "Dallas home cleaning you can trust"; Call + Book now ("book in about a minute"); badges: 4.9 stars, 500+ homes, insured & background-checked, plant-based products, 7-day availability, happiness guarantee; branded vehicle + cleaners at work. Four service cards each with its own Book now; 200+ training hours; "report within 24 hours for a free return visit"; "what you see is what you pay". |
| 3 | [Simply Pure Home](https://simplypurehome.com/) | Eco residential, woman-owned since 2015, Franklin TN | "Eco-friendly house cleaning services in Franklin, TN & surrounding areas"; "get an instant quote"; trust labels Bonded & Insured / 100% Guarantee / 5-Star. Recurring plans (weekly, bi-weekly, monthly, "Essential") vs one-time (deep, initial, move-in, move-out); 24-hour re-clean; Cleaning For A Reason partner; gift cards; 14 named areas. |
| 4 | [Two Bettys](https://twobettysclean.com/) | Green residential + commercial, since 2007, Minneapolis | "Local. Ethical. Green." over "Reliable cleaning service near you!"; Cleaning services + **Instant quote**; bold geometric graphics instead of photos. The FAQ publishes **ballpark recurring prices by home size** (2/1 $110–175; 3/2 $175–228; 4/3 $228–300), a 48-hour change policy and starting pay of $21/h as a trust point. |
| 5 | [Karen's Green Cleaning](https://www.karensgreencleaning.com/) | Residential, since 2010, Minneapolis | "Flat rate cleaning services in Minneapolis MN"; "Book your deep cleaning today!" + phone; a "what is typically included" list *and* a "may cost extra" list (high shelves, inside appliances); a deposit-back guarantee for move-outs. Anti-pattern: celebrity net-worth blog posts on a cleaning site. |
| 6 | [Maid Marines](https://www.maidmarines.com/) | Residential, NYC (bigger, but the structure scales) | Four checkmarks under the headline (vetted & insured, supplies provided, flat-rate, guarantee); "Get your instant price" + "Book your cleaning now"; "booked in 60 seconds, no card required". Recurring discounts 20/15/10% (weekly/biweekly/monthly), an 85-point checklist, a comparison table vs franchises and vs small local companies, a "who we are NOT for" block, re-clean-then-refund guarantee. |
| 7 | MCS Cleaning Services (cleanmcs.com); Bell Cleaning (bellcleanstwincities.com) | Residential, SF / Twin Cities | MCS: four team members shown beside the offer, so the quote request feels less anonymous. Bell: cleaner at a kitchen counter, "Services" + "Free quote" (per [RoastMyPage, July 2026](https://www.roastmypage.com/best-house-cleaning-websites)). |
| 8 | [Allegiance Pressure Washing](https://allegiancepw.com/) | Pressure washing, Nashville | "Middle Tennessee's top rated pressure washing" with "Over 250+ five star reviews on Google & Facebook!" as the subhead and one "Get a fast quote" button; eight service tiles; 3-step process; 100% guarantee; three before/after pairs; ~20 FAQs; call/text/email buttons in the footer; exit popup "$25 off two or more services". (Its H1 still says Christmas lights, a lesson in checking the real H1.) |
| 9 | [Peachtree Power Wash](https://www.peachtreepowerwash.com/) | Pressure washing, Atlanta, since 2008 | Hero photo of a house being washed; "Book online" in header, hero and throughout; **flat rates by square footage** ($199 up to 1,500 sq ft, $229 to 2,500, $259 to 3,000; +$50 per 500 sq ft; +$99 for a daylight basement) with a struck "regular price" and a countdown timer; Angi/BBB/Google badges, 200+ reviews; hours including "Saturday: returning calls only"; 15 city pages. |
| 10 | [Water Works Pressure Cleaning](https://waterworkspressurecleaning.com/) | Pressure washing, Atlanta | Three contact actions in the hero: phone, **TEXT NOW**, GET A FREE QUOTE; benefits list (fast response, same-day results, 100% satisfaction); five Google reviews via a widget; a long form with service checkboxes and SMS opt-in; every service card repeats phone/text/quote. |
| 11 | [Music City Pressure Washing](https://washmusiccity.com/) | Pressure washing, family-owned, Nashville | Tagline "Local. Family Owned. Trusted." over H1 "Pressure washing Nashville, TN"; a hero quote form with an "I'd like info on: Residential / Commercial / Let's chat!" radio; founder named; reviews from Google, Facebook and Nextdoor. (Footer copyright names a different company: a template left-over.) |
| 12 | [Sweepers Office Cleaning](https://sweepersofficecleaning.com/) (Gadsden, AL) | Commercial janitorial | "Commercial cleaning services you won't have to think about"; a quote form in the hero (name, phone, work email); chamber-of-commerce logos; four service cards (regular cleaning, floor refinishing, carpet, sanitizing & supplies); testimonials named by town; ISSA/CIMS training, insured, background-checked; a "we don't miss" promise; 3 steps (free on-site visit → schedule → written scope); map; customer portal. The model for our `commercial` variant. |

Also (per reviewers): Clean Fellas (award at the top of every page, before/after + videos, hundreds of 5-star reviews),
Rinse Prince ("Get a quote" and "Schedule now" buttons in one color throughout, a pre-work checklist), Firehouse
Pressure Washing (firefighter-owned, hero video, financing), LCS (a map of past jobs on the home page), Triangle Window
(comparison chart vs competitors, referral cash) ([Jobber pressure washing](https://www.getjobber.com/academy/pressure-washing/pressure-washing-websites/));
HTX Power Washing (instant online quote in ~2 minutes + customer portal), Peachtree the only one of nine with prices,
Allegiance the only one with a review count in the hero ([NanoGlobals](https://nanoglobals.com/pressure-washing-websites/));
Maid2Match leads its trust row with vetting and police checks; We Leave Clean puts "15% off first booking" in a promo bar
with "1,000+ reviews" ([Zarla](https://www.zarla.com/inspiration/cleaner)). Anti-example: [Double Duty](https://doubledutyclean.com/)
(Decatur) shows a hiring alert with placeholder text and a video that doesn't load.

### 3B. Above the fold, ranked

1. **Hero structure**: headline + two buttons + a trust row of 3–6 labels (Ivory, Simply Pure, Maid Marines, Heaven
   Scent) is the dominant residential pattern; a quote form in the hero on pressure washing and commercial (Music City,
   Zap It Wash, Sweepers); photo of the team or a cleaner at work; graphic/illustrated heroes for values brands (Two
   Bettys). NanoGlobals: 5 of 9 pressure-washing sites show no people at all, which reads as a gap.
2. **Headline**: service + town ("Flat Rate Cleaning Services in Minneapolis MN", "Eco-Friendly House Cleaning
   Services in Franklin, TN", "Pressure Washing Nashville, TN") and trust + town ("Dallas Home Cleaning You Can
   Trust", "Middle Tennessee's Top Rated Pressure Washing") lead; benefit lines ("A fresh start for your home",
   "cleaning services you won't have to think about") come next; values taglines sit above the H1 ("Local. Ethical.
   Green."; "Local. Family Owned. Trusted.").
3. **Actions**: residential: **Book now / Instant quote** + Call (where a booking tool exists) or **Get a free quote** +
   Call/Text; pressure washing: **Get a fast quote** + Call + **Text**; commercial: **Get a quote / Get started** form.
   Heaven Scent's "See services & pricing" as the second button is unusual and smart.
4. **Proof**: insured (+ bonded), background-checked, guarantee, rating + count ("4.9", "34 five-star reviews",
   "250+"), years ("since 2021", "since 2007"), supplies provided, no contracts, plant-based/pet-safe, same team.
5. **Imagery**: team in branded shirts or a branded vehicle > cleaner at work > a finished calm room (C4, We Leave
   Clean) > before/after (Charlotte Power Washing leads with a deck pair) > graphics.
6. **Emergency banners**: none. **Financing**: only Firehouse (pressure washing) mentions it. **Offers**: a promo bar
   (15% off first booking) or exit popup ($25 off).

### 3C. Section order and shapes

Residential (Ivory, Simply Pure, Karen's, Heaven Scent): hero → why us (4 points) → services as cards with their own
Book/Quote (recurring vs one-time) → team/vetting → what's included (+ what costs extra) → 3 steps → guarantee with the
window → reviews → service area → FAQ (8) → closing CTA → hours. Pressure washing (Allegiance, Peachtree, Water
Works): hero → service tiles (8) → pricing or benefits → 3 steps → reviews → guarantee → before/after → FAQ (long) →
closing CTA with call/text/email. Commercial (Sweepers): hero form → chamber logos → 4 services → testimonials by
town → credentials → why us → map → 3 steps → FAQ → closing offer (walkthrough, line-item proposal, no long contract).

Shapes: **Trust stack** (Ivory/Simply Pure: badges first, guarantee terms, vetting and training), **Price-forward**
(Heaven Scent/Two Bettys/Peachtree: ranges or flat rates on the home page), **Fast-quote washer** (Allegiance/Water
Works: one button repeated, tiles, before/after, long FAQ), **Walkthrough B2B** (Sweepers/Office Pride: form first,
facility types, written scope).

### 3D. Features unique to cleaning

| Feature | Why it sells | Owner must supply | Default or generate? | Priority |
|---|---|---|---|---|
| What's-included checklist with a Standard vs Deep vs Move-out comparison | Answers "what does deep mean"; 20/60 blueprint sites; Maid Marines' 85 points; Karen's "typically included" + "costs extra" | Ticks on a master list, extras | Generate from a master task list per room; owner unticks | Must (residential) |
| Price ranges by home size, hourly rate, or flat rates by sq ft | Heaven Scent (local) and Two Bettys show ranges; Peachtree flat rates; 93% say instant estimates matter; only 10/60 blueprint pages show $ | Numbers | `CardItem.price` + a small table component; owner opt-in | Must (offer it); Should (owner decides) |
| Guarantee with a window and remedy ("tell us within 24 h, free re-clean") | 34/60 blueprint, concrete rule on 15/60; Ivory, Simply Pure, Maid Marines all state 24 h | Window + remedy | Structured field → chip + FAQ + footer line | Must |
| Recurring plan cards with frequency discounts | Maid Marines 20/15/10%; Simply Pure's weekly/bi-weekly/monthly; recurring is the business | Frequencies, discounts | Three cards; discounts optional | Must (residential) |
| Trust chips: insured, bonded, background-checked, supplies provided, no contracts, same team each visit, pet-safe, plant-based | Strangers in the home; Heaven Scent and Ivory stack 4–6 | Which are true | Existing `trust()` + add noContracts, sameTeam, suppliesIncluded already there | Must |
| Booking link (ZenMaid, BookingKoala, Housecall Pro, Jobber) | 80% factor online booking; ZenMaid gives a hosted URL or iframe ([ZenMaid doc](https://zenmaid.com/answers/en/articles/3380936-how-to-install-the-zenmaid-booking-form-on-your-website)) | URL | `links.booking` exists; label "Book a cleaning" | Should |
| Residential / Commercial / "Let's chat" selector in the form | Music City's radio; routes the lead | None | Add to `extra` fields | Should |
| Before/after pairs (pressure washing especially) | The category's native proof; Allegiance 3 pairs, Heaven Scent slider | Paired photos | Two-photo block | Must (exterior); Should (residential) |
| Flat-rate table by square footage (exterior) | Peachtree is the only priced site in NanoGlobals' nine, and it runs a booking flow | Tiers | Small table, owner-filled | Should (exterior) |
| Property-type pricing/forms (house, business, church or school) | Already in our exterior form; Peachtree separates decks/roofs | None | Keep | Must |
| Commercial: facility types, frequency (nightly/weekly), after-hours, floor care, supplies restocking, written scope, walkthrough CTA | Sweepers' whole page; B2B buyers check insurance and client types first | Types, frequencies | Variant template | Must (commercial) |
| Chamber / association logos (commercial) | Sweepers shows five chambers; ISSA/CIMS | Memberships | Text list or logos with permission | Nice |
| Gift cards | 17/60 blueprint; Simply Pure | Square/Stripe link | `links.giftCards` exists | Nice |
| First-booking discount / referral | We Leave Clean 15%, Allegiance $25 off 2+ services, Grossbusterz referral | Offer + expiry | `Offer` render | Nice |
| Charity partner (Cleaning For A Reason) | Simply Pure; 3 blueprint sites | A yes | Line + link | Nice |
| "Who we're not for" / comparison vs franchise | Maid Marines; sets expectations | Owner's words | Optional block | Nice |
| Team photo + "same crew led by <name>" | Heaven Scent; 58% like knowing who comes | Photo + name | Owner photo slot | Should |
| "Saturday: returning calls only" style honest hours | Peachtree; stops dead-end calls | Hours notes | Hours note field | Nice |
| Pre-work checklist page ("how to prepare") | Rinse Prince, Allegiance footer link | None | FAQ entries | Nice |

### 3E. Hooks and trust

Hooks: "book in 60 seconds, no card required", "see services & pricing" as a button, "flat rate, no surprises",
"no contracts, pause or skip anytime", first-clean % off in a promo bar, "$25 off two services", "deposit back"
for move-outs, "take your weekends back". Seasonal: spring house wash and deck season (pressure washing demand
"climbs in spring" per Jobber), move-out season (May–August leases), holiday deep cleans, post-construction. Local
pride: "Cullman County" eyebrow, team names, town-tagged testimonials, chamber logos. Trust order: insured/bonded →
background-checked → guarantee window → rating + count → years/local/woman-owned → supplies/pet-safe → same team.

### 3F. Visual trends and what to avoid

Calm, near-white pages with one saturated accent (teal, sky blue, coral) and generous whitespace; the best residential
sites photograph the *result* (a calm room) or the *team*, not a mop; values brands use flat geometric graphics (Two
Bettys) or sunflower-bright kitchens (Simply Pure); upscale brands go dark + gold (C4). Pressure washers lean bold:
heavy condensed headlines, blue/orange, before/after as the hero. Avoid: stock cleaner-with-spray-bottle photos,
"#1 maid service" without a count, ten H1s, template left-overs (Music City's footer), off-topic blog filler
(Karen's), instant-price claims with no tool behind them (a blueprint finding), and placeholder alerts (Double Duty).

---

## 4. Gaps against what we build, ordered by expected sales impact

What a caller shows on the Fold is the preview. The gaps below are the things an owner in Cullman will notice is
*missing* compared with Bama Air, Heaven Scent, or the sites above, ordered by how often they decide a sale.
File references are to the current packs (`src/generator/packs/contractor.ts`, `landscaping.ts`, `cleaning.ts`,
`components.ts`, `types.ts`, `actions.ts`, `app/public/app.js`).

1. **Prices and plans are nowhere on our pages.** Cleaning: no what's-included checklist, no price ranges, no
   recurring-plan cards (the pack only shows services as cards and a to-do asking "if you'd like starting prices
   shown"). Landscaping: no "ways to work with us", no starting-at prices (the quote form asks frequency; the page
   never offers plans). Contractors: no maintenance-plan cards, no pest plan prices. `CardItem.price` exists in
   `serviceList` but no pack sets it. The local benchmark (Heaven Scent) shows ranges; Bama Air shows three tiers.
2. **Financing and warranty fields exist in `ContractorExt` but nothing renders or edits them.** `financing
   {lender,url}` and `warrantyText` are in `types.ts`; `edits.ts` only handles `emergencyService` and `freeEstimates`;
   `app.js` has no inputs for them. For HVAC and roofing this is the module reviewers call out most, and the only
   module with measured lift (+12% close / +13% ticket).
3. **Emergency is a chip, not a path.** `emergencyService` adds "Emergency service" to the trust row and nothing else:
   no banner, no after-hours number, no terms, no separate "emergency? call now / not urgent? request service" split.
4. **License numbers are footer-only and may be mis-formatted for HVAC.** `components.ts:366` prints `label #number`
   in the footer. Alabama's HVAC rule wants the company name and "AL#"-prefixed number on the home page, and remodelers
   over $10k must show their HBLB number in all advertising. There is no required to-do for either.
5. **No guarantee field.** Cleaning's biggest trust element (34/60, concrete window on the best sites) is only a
   suggested to-do ("Tell us your trust details"); landscaping and contractors have no structured guarantee at all.
6. **Gallery has no captions, towns, service tags or before/after pairs.** `gallery()` renders bare `<img>`s. The
   standout trades label every photo by town and service; painters and washers lead with pairs.
7. **No Alabama ADAI permit check for lawn chemicals.** Landscaping seeds no chemical services, but owners add
   "weed control / fertilization" freely; the site should ask for the permit number before publishing those.
8. **The quote form never offers "text us a photo".** Forms can't upload; the `sms:` link can carry a photo. The form
   footer says "or text us" only when `smsEnabled`; it should say *what* to text (a photo of the leak/roof/yard).
9. **No residential/commercial split rendered** (`ContractorExt.residential/commercial` and `CleaningExt.commercial`
   exist; only the auto pack renders a commercial section). Commercial cleaning has no facility types, frequency,
   after-hours, walkthrough or written-scope steps; it reuses the residential form with a frequency field.
10. **No offers rendering.** `Offer` (title, detail, expiresOn) is typed and unused by every pack; the blueprints and
    the standouts all run a first-visit or seasonal offer with an expiry.
11. **No seasonal calendar** for lawn care, and nothing seasonal for HVAC (tune-up windows) or washing (spring).
12. **No brands-serviced, no manufacturer/program badges, no local-award line** (Bama Air shows Daikin, Mitsubishi,
    Google Guaranteed, "Best of Cullman Times"). A text-only `credentials` list would cover all three.
13. **Headline forms**: the DNA `headline` knob offers what+where / name / promise. The question form ("AC blowing
    warm air?") and the benefit form ("Take your weekend back") that lead the lawn and HVAC standouts are not options,
    and the copy brief doesn't ask for them.
14. **No numbers band** (years, jobs, towns). Low priority, and only ever static text: two first-hand sites showed
    "0+" counters.
15. **Service-area map**: towns are chips; the better sites add a map or "check your address". A static map image
    link is cheap.
16. **Reviews**: the hero shows the Google rating at ≥4.3/≥10; BrightLocal says 47% won't use a business under 20
    reviews, so for 10–19 reviews a "Read our reviews" link may serve better than the count. Owner-supplied
    testimonials have no town tag; the standouts tag them.

What we already do that the standouts confirm: service + town H1, two buttons, trust chips, 3–4 steps, FAQ, named
towns, phone bar with Text, Google rating in the hero, no Google review quotes, no invented claims (the copy briefs
are stricter than most agency sites), required to-dos before publish.

---

## 5. Top 10 build recommendations across the three categories

Effort: S = a component plus an Edit field, under a day; M = a module with data model, Edit card, lint and tests;
L = several modules or a variant rework.

1. **Plans & pricing module (all three packs)** — a `plans` array (name, price text, unit, 3–6 inclusions, badge) rendered
   as 1–3 cards: HVAC/pest/garage-door memberships, lawn "ways to work with us" (one-time / cleanup / weekly / every
   2 weeks), cleaning recurring tiers with frequency discounts, pressure-washing flat rates by sq ft. Prices optional
   ("starting at"); the card trio renders without prices for lawn/cleaning. Edit card + call-guide line. **M**
2. **What's-included checklist with tier comparison (cleaning residential)** — a master room-by-room task list,
   owner ticks per tier, rendered as a comparison table + "may cost extra" list. **M**
3. **Financing + warranty rendering (contractor)** — render `ext.contractor.financing` as a hero chip, a section with
   "Apply" (link-out, lender named in text) and a FAQ entry; render `warrantyText` as a band + FAQ; add both to
   `edits.ts` and the Edit screen; lint blocks copy that invents terms. **S–M**
4. **Emergency path (contractor)** — `afterHours {number?, note}`: a utility banner "Emergency? Call <number> — 24/7"
   plus a second "Not urgent? Request service" button; the form gets an "Is this an emergency?" field that puts
   🔴 in the Inbox notification. Required to-do to confirm the terms. **M**
5. **Guarantee field (all three)** — `guarantee {window, remedy, text}` → chip, section line, FAQ, footer; cleaning
   default suggestion "within 24 hours, free re-clean"; never on without owner input. **S**
6. **Gallery captions + before/after pairs** — `Image.caption`, `town`, `service`, `pairWith`; gallery renders
   captions and a click-to-toggle pair block; the Edit gallery lets the owner pair two photos and type a town. **M**
7. **Compliance to-dos: Alabama license display and ADAI permit** — HVAC: required to-do until a license number is
   entered, rendered as "AL# <number>" next to the name in the hero/strip and footer; remodel/general contractor:
   required HBLB number when the owner says jobs exceed $10k; lawn/landscape/pest: required "ADAI permit #" when any
   service matches fertiliz|weed|pest|spray|herbicide, with the chip rendered. **S**
8. **Commercial cleaning variant rework** — facility-type chips (offices, medical, churches, schools, retail,
   industrial), frequency (nightly/weekly/custom), after-hours, floor care & supplies as services, a "Request a
   walkthrough" primary action, 3-step onboarding (walkthrough → written scope → recurring schedule), testimonials
   by town, no residential tiers. **L**
9. **Offers + seasonal band** — render `Offer[]` (hidden after `expiresOn`) as a promo bar or card; a seasonal
   component: lawn 4-season calendar generated from services with Alabama timing; HVAC "tune-up season" line in
   March–April and August–September; washing "spring wash" line. Owner toggles. **M**
10. **Form upgrades across packs** — "Residential / Commercial / Not sure" selector, "Text us a photo of …" line
    under the form when `smsEnabled`, "Best way to reach you (call/text)", and a `requestSummary` that carries them
    into the notification. Plus the two missing headline forms (question, benefit) as `headline` knob values with
    copy-brief fields. **S–M**

Honorable mentions (cheap, lower impact): static map image in `serviceArea`; `credentials` text list (brands, programs,
local awards with year); testimonial town tags; a "meet the crew" photo block with first names; payment-methods row;
"Saturday: returning calls only"-style hours notes.

---

## Sources

Roundups and audits (vendor blogs unless noted): [Skillmammoth plumber sites, Sept 2026](https://skillmammoth.com/blog/plumber-website-design) ·
[CI Web Group HVAC guide](https://ciwebgroup.com/guides/best-hvac-website-design) · [ServiceTitan HVAC sites](https://www.servicetitan.com/blog/hvac-websites) ·
[Hook Agency roofing](https://hookagency.com/blog/best-roofing-websites/) · [Hook Agency 2026 contractor trends](https://hookagency.com/blog/contractor-website-design-trends-2026/) ·
[JobNimbus roofing 2026](https://www.jobnimbus.com/blog/what-a-high-converting-roofing-website-actually-looks-like-in-2026) ·
[WebCitz landscaping](https://www.webcitz.com/blog/best-landscaping-websites/) · [WebCitz painters](https://www.webcitz.com/blog/best-painters-websites/) ·
[createtoday lawn (stats)](https://createtoday.io/examples/best-lawn-care-and-landscaping-websites) · [createtoday HVAC](https://createtoday.io/examples/best-hvac-websites) ·
[Jobber lawn care, Mar 2025](https://www.getjobber.com/academy/lawn-care/lawn-care-website-design/) · [Jobber pressure washing, May 2025](https://www.getjobber.com/academy/pressure-washing/pressure-washing-websites/) ·
[Jobber arborists, Feb 2026](https://www.getjobber.com/academy/tree-service-arborist/best-arborist-websites-designs/) · [Jobber handymen](https://getjobber.com/academy/handyman/handyman-website-examples/) ·
[NanoGlobals pressure washing 2026](https://nanoglobals.com/pressure-washing-websites/) · [RoastMyPage house cleaning, Jul 2026](https://www.roastmypage.com/best-house-cleaning-websites) ·
[Zarla cleaning](https://www.zarla.com/inspiration/cleaner) · [GorillaDesk cleaning](https://gorilladesk.com/learn/top-cleaning-company-website-examples/) · [UENI cleaning (2026 data)](https://ueni.com/blog/cleaning-service-website/) ·
[Site Builder Report pest control](https://www.sitebuilderreport.com/inspiration/pest-control-websites) · [Colorlib tree service](https://colorlib.com/wp/tree-service-website-examples/).

Surveys and reports: [BrightLocal 2026](https://www.brightlocal.com/research/local-consumer-review-survey/) · [Housecall Pro homeowner survey 2025](https://www.housecallpro.com/resources/home-service-customer-service-report-trends-statistics/) ·
[ServiceTitan/Synchrony/Visa 2025 release](https://www.synchrony.com/contenthub/newsroom/majority-of-homeowners-expect-personalized-digital.html) · [Wisetack 4.5× report](https://www.wisetack.com/press/home-services-businesses-can-win-jobs-4-5-times-bigger-by-offering-financing-new-wisetack-report-shows) ·
[Housecall Pro after-hours figure](https://www.housecallpro.com/resources/ai-booking-dispatch-home-services/).

Tools and integrations: [Housecall Pro booking link](https://help.housecallpro.com/en/articles/11473210-getting-started-with-online-booking) · [Housecall Pro + Wisetack](https://help.housecallpro.com/en/articles/3836042-wisetack-consumer-financing-overview) ·
[Jobber financing](https://www.getjobber.com/features/consumer-financing/) · [Jobber online booking](https://www.getjobber.com/features/online-booking/) · [ZenMaid booking form install](https://zenmaid.com/answers/en/articles/3380936-how-to-install-the-zenmaid-booking-form-on-your-website) ·
[Service Autopilot + Deep Lawn](https://turfmagazine.com/service-autopilot-by-xplor-unites-with-deep-lawn-for-instant-lawn-care-quotes/).

Alabama rules: [HVAC 440-X-5-.07](https://regulations.justia.com/states/alabama/title-440/chapter-440-x-5/section-440-x-5-07) and [board FAQ](https://hacr.alabama.gov/faq/what-are-the-requirements-for-displaying-my-certification-number/) ·
[Home Builders Licensure Board, Act 2024-443](https://hblb.alabama.gov/changes-to-statutory-regulations-become-effective-march-17-2025/) · [Plumbers & Gas Fitters complete rules, Jan 2026 (no advertising rule)](https://pgfb.alabama.gov/wp-content/uploads/2023/08/Complete-Admin-Rules-Jan-26.pdf) ·
[Electrical Contractors rule changes, effective 14 Feb 2026](https://aecb.alabama.gov/wp-content/uploads/2025/12/Certified-Board-of-Electrical-Contractors-Rule-Changes-Full.pdf) ·
[ADAI horticulture professional services license (ACES)](https://www.aces.edu/blog/topics/commercial-applicator/ornamental-and-turf-pest-control-commercial-applicator-permit-information-otps-otpc/) · [TVA EnergyRight heat pump rebate](https://energyright.com/?p=28230).

Seasonal: [Lawn Love Alabama schedule](https://lawnlove.com/blog/lawn-care-schedule-alabama/) · [ACES ANR-3107 maintenance schedule](https://aces.edu/wp-content/uploads/2024/11/ANR-3107_SouthAlaGardening-GeneralMaintenanceSchedule_110724L-G.pdf) ·
[HVAC season timing (CI Web Group)](https://ciwebgroup.com/blog/why-august-critical-furnace-tune-up-email-list).

Design trends: [tinyfrog 2026](https://tinyfrog.com/web-design-trends-2026/) · [TheeDigital 2026](https://www.theedigital.com/blog/web-design-trends).

Live sites opened first-hand are linked in the tables above. Local: [Bama Air Systems](https://bamaairsystems.com/),
[Heaven Scent](https://heavenscentcullman.com/), [Bailey Lawn Care](https://baileylawncare.com/), [4 Seasons Landscape](https://4seasonslandscapellc.com/),
[Sweepers](https://sweepersofficecleaning.com/), [Double Duty](https://doubledutyclean.com/).
