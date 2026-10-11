# SEO playbook: Underground Associates + client sites (Oct 2026)

Survey weights cited below are expert opinion ([Whitespark 2026](https://whitespark.ca/local-search-ranking-factors/), 47 experts, 187 factors).

---

# PART A: undergroundassociates.com

## A1. Keyword set and how to tell what has volume

Cluster: `website design cullman al`, `web designer cullman`, `website for my business cullman`, `small business website alabama`, `cheap website for small business`, plus `[trade] website` (restaurant website, plumber website). Hanceville, Good Hope and Vinemont have no measurable volume (fold into one Cullman County page); Hartselle, Arab, Jasper and Decatur are separate small markets.

How to tell: Keyword Planner marks tiny towns "Low search volume" from 12 months of history, so zero there is not zero demand ([Google Ads](https://support.google.com/adwords/answer/2616014)). The reliable signal is your own Search Console impressions after 3 to 6 months. Rule: build a town page only when GSC shows impressions for it or you have a client there.

## A2. Page architecture

- **Home**: what + where in H1 ("Websites for Cullman small businesses, $49 to $149 a month"), portfolio tiles, plans, one form.
- **Service pages** (websites, hosting/maintenance, Google profile setup, Spanish page, domains/email): "dedicated page for each service" is the #1 localized-organic factor ([Whitespark](https://whitespark.ca/local-search-ranking-factors/)).
- **Industry pages** (`/websites-for-restaurants-cullman`, contractors, salons, auto, churches): the vertical's example site, features, price, 3 FAQs. Best growth pages: they match "restaurant website" intent and the packs really differ.
- **Location pages**: Google's doorway policy bans pages "created to rank for specific, similar search queries" that funnel users to one destination ([spam policies](https://developers.google.com/search/docs/essentials/spam-policies)). A Hartselle page is fine only with content you could not swap for Arab: clients there, the Hartselle Chamber, local photos. Rule: one page per town with a live client; otherwise one `/service-area` page.
- **About (E-E-A-T)**: owner name and photo, LLC name, Cullman address, years in business, Chamber membership, how sites are built (templates + reviewed AI copy, stated plainly).
- **Case studies**: before (Facebook only), after (screenshot), 90-day numbers from `site_stats` + GBP calls, a quote.

## A3. Technical

- **Titles**: unique, concise, brand at the end: `Website Design in Cullman, AL | Underground Associates`; service pages `Restaurant Websites in Cullman, AL from $49/mo | Underground Associates`. Google rewrites boilerplate or repeated titles, drawing on the H1 ([title links](https://developers.google.com/search/docs/appearance/title-link)). Description 140 to 160 chars with price and phone.
- **Canonical**: self-referencing, absolute, https, one per page; never canonicalize a Spanish page to English ([canonicalization](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)).
- **Sitemap**: hand-written is fine under a few dozen URLs; `lastmod` only when content really changed, `priority`/`changefreq` are ignored; list it in robots.txt `Sitemap:` and in Search Console ([sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)). Use `noindex`, not robots.txt, for /examples/, /a/, /x/, /agreement/.
- **Schema (one JSON-LD block, `@type: ["ProfessionalService","LocalBusiness"]`, arrays allowed, `additionalType` not supported)**. Required: `name`, `address` (full PostalAddress). Recommended by Google: `url`, `telephone`, `geo` (5+ decimals), `openingHoursSpecification` (hh:mm:ss), `priceRange` (<100 chars, e.g. `$49-$149/month`), `image`. `aggregateRating`/`review` are "only for sites that capture reviews of other local businesses" ([LocalBusiness](https://developers.google.com/search/docs/appearance/structured-data/local-business)); self-serving ratings (an entity rating itself, even via an embedded widget) are ineligible and ratings must not be aggregated from other sites ([review snippet](https://developers.google.com/search/docs/appearance/structured-data/review-snippet)). No star markup on your own site. Add `areaServed` (array of `City` names), `sameAs` (GBP Maps URL, Facebook, Chamber listing, BBB), `logo` (≥112×112, crawlable), `legalName`, `foundingDate`, `email`, `contactPoint` from the Organization list ([Organization](https://developers.google.com/search/docs/appearance/structured-data/organization)); Google says to use the most specific LocalBusiness subtype rather than plain Organization.
- **FAQPage**: dead in Google. Restricted to government/health sites in Sept 2023, removed for everyone on 7 May 2026 (Rich Results Test/report support gone June 2026, API field August 2026) ([Search Central changelog](https://developers.google.com/search/docs/appearance/structured-data/faqpage), [coverage](https://www.techwyse.com/news/ai-search/google-faq-rich-results-deprecated-2026)). Keep visible FAQ text (it feeds AI answers and Ask Maps); the markup buys nothing in Google.
- **Core Web Vitals** at the 75th percentile, mobile and desktop: LCP ≤2.5 s (poor >4.0 s), INP ≤200 ms (poor >500 ms), CLS ≤0.1 (poor >0.25) ([web.dev](https://web.dev/articles/vitals), [LCP](https://web.dev/articles/lcp)).

## A4. Google Business Profile for the agency

- You have no storefront: hide the address and set a service area, up to 20 cities/ZIPs, within about 2 hours' drive, no radius option ([GBP help](https://support.google.com/business/answer/9157481)). Set the eight towns and county ZIPs. "Address is showing" and "address in city of search" are top-10 pack factors, so a staffed Cullman office address would help.
- Categories exist in Google's list: primary **Website designer**; secondary **Internet marketing service**, **Web hosting company**, at most one more ([category list](https://daltonluka.com/blog/google-my-business-categories)). Primary category is the #1 pack factor; "keywords in GBP services" rose 75 places, so fill Services with names and prices ([Whitespark](https://whitespark.ca/local-search-ranking-factors/), [SearchLab summary](https://searchlabdigital.com/blog/2026-local-search-ranking-factors-whats-changed-since-last-time/)).
- Posts: no measurable ranking effect, useful for conversions and Ask Maps; stuffed posts are a new negative factor. **Q&A is gone** (API retired 3 Nov 2025), replaced by AI "Ask Maps", which answers from your profile, reviews and website ([BrightLocal](https://www.brightlocal.com/learn/google-q-and-a/)); your FAQ page now does that job.
- Reviews: recency matters; ask every client at go-live, reply to all, never incentivize or gate ([policy](https://support.google.com/contributionpolicy/answer/7400114)).
- Link: GBP Website field → `https://undergroundassociates.com/?utm_source=google&utm_medium=organic&utm_campaign=gbp`; the landing page's title tag keywords are a top-5 localized-organic factor. Search Console verification can unlock instant GBP verification ([GBP verification](https://support.google.com/business/answer/7107242)).

## A5. Search Console

Add a **Domain property** (`undergroundassociates.com`) via a DNS TXT record on Cloudflare; it covers www/apex/http/https ([add property](https://support.google.com/webmasters/answer/34592)). Submit `/sitemap.xml`. Watch monthly: town-name queries (new page candidates); impressions with CTR <2% (rewrite titles); Core Web Vitals; "Crawled, currently not indexed"; Links. AI Overviews/AI Mode clicks are inside "Web", not separate ([AI features](https://developers.google.com/search/docs/appearance/ai-features)); data keeps 16 months, export via the API to keep longer ([Search Central](https://developers.google.com/search/docs/monitor-debug/debugging-search-traffic-drops)).

## A6. Off-page for a tiny agency

- **Citations**: GBP, Apple Business Connect (free, phone-code verification; 58% of businesses never claim it, [BrightLocal](https://brightlocal.com/research/are-businesses-using-apple-business-connect/)), Bing Places (GBP import + scheduled sync, redesigned Oct 2025 ([PPC Land](https://ppc.land/bing-places-for-business-migrates-to-bing-com-domain-with-import-tools/))), Yelp, Facebook, BBB, Nextdoor, Cullman Area Chamber directory (a real editorial link). Citations keep slipping as a Google pack factor but are 3 of the top 5 AI-visibility factors ("mentions are the new link") ([Whitespark](https://whitespark.ca/local-search-ranking-factors/)).
- **Local links**: Cullman Times/Tribune business briefs, Chamber ribbon cutting, youth-team or Oktoberfest sponsorship, Wallace State workshops.
- **"Website by Underground Associates" footer links**: Google lists "widely distributed links in the footers or templates of various sites" as link spam, and keyword-rich anchors in distributed widgets are explicitly named ([spam policies](https://developers.google.com/search/docs/essentials/spam-policies)). Safe pattern: brand-only anchor ("Website by Underground Associates"), `rel="nofollow"` (or `sponsored`, since the client pays you ([qualify links](https://developers.google.com/search/docs/crawling-indexing/qualify-outbound-links))), disclosed in the agreement (it already is). They are a lead source and brand mention, not a PageRank play; never "Cullman web design" anchors.

## A7. AI search / AI Overviews

Google: no special markup or files; be indexed, snippet-eligible, text-based, with a current Business Profile ([AI features](https://developers.google.com/search/docs/appearance/ai-features)). AI Overviews show on ~68% of local-business queries (15% of pure local intent, 92% informational), and 60% of citations go to third-party sites, 40% to business sites ([Whitespark study](https://whitespark.ca/blog/case-study-the-prevalence-of-ai-overviews-in-local-search/)). Across 61k checks, GBP was 28.6% of AI citations, Yelp 9.5%, and 93% of cited domains were business websites ([BrightLocal](https://www.brightlocal.com/resources/ai-directory-sources/)). Actions: answer informational queries ("how much does a small business website cost in Alabama", "do I need a website if I have Facebook") with a one-sentence answer first; get on best-of lists (Chamber, local roundups, Clutch/UpCity); identical NAP everywhere. A 10-week test found LocalBusiness schema moved LLM recommendations, not rankings ([Whitespark Q2 2026](https://whitespark.ca/blog/23-local-developments-you-need-to-know-about-from-q2-2026/)).

---

# PART B: SEO at scale for client sites

## B1. On-page checklist per site

1. `<title>`: `<Business> | <Primary service> in <Town>, AL` (≤60 chars; menu page `Menu | <Business>, <Town> AL`; /es/ in Spanish). Unique per page, no stuffing.
2. One H1 = business name + what + where (the DNA `headline` knob already does this); first paragraph names the town and 2 to 3 services in prose.
3. NAP byte-identical to GBP (same suite and phone format, no added keywords in the name); address in every footer and in schema.
4. Embedded map: optional; a directions link avoids a third-party iframe. If embedded, lazy-load it.
5. Services as text matching the GBP Services names; a short paragraph each beats a bare list.
6. Image `alt` describing the subject + town once ("Brake repair bay at Smith Auto, Cullman"); file names likewise; never alt-stuff.
7. Internal links: nav + footer to /menu/ or /what-to-bring/, /es/ ↔ / with hreflang, service anchors (#services) from the hero.
8. Meta description with phone and town; OG image 1200×630.
9. Visible hours and a review link; complete profiles rank markedly better ([SEL 1.8M-profile study](https://searchengineland.com/google-business-profiles-local-seo-success-data-485727)), so mirror that completeness on the site.

## B2. Structured data per vertical

Required `name` + `address`; recommended `url`, `telephone`, `geo`, `openingHoursSpecification`, `priceRange`, `image`, `menu`, `servesCuisine`; types as an array, `additionalType` unsupported ([Google](https://developers.google.com/search/docs/appearance/structured-data/local-business)). `acceptsReservations`, `hasMenu`, `areaServed`, `paymentAccepted` are valid schema.org but undocumented by Google: include them for Bing/LLMs, expect no Google rich result.

| Vertical | `@type` (all exist on schema.org unless noted) | Extra properties |
|---|---|---|
| Restaurant / café / food truck | `Restaurant`, `CafeOrCoffeeShop`, `Bakery`, `BarOrPub`, `FastFoodRestaurant` | `servesCuisine`, `menu` (absolute URL to /menu/), `hasMenu` (`Menu` → `hasMenuSection` → `hasMenuItem` with `offers.price`), `acceptsReservations` (true/false or URL), `priceRange` |
| Salon / barber / nails / spa / massage / pet groomer | `HairSalon`, `BeautySalon`, `NailSalon`, `DaySpa`, `HealthAndBeautyBusiness`; groomer → `LocalBusiness` + `makesOffer` | `paymentAccepted`, `makesOffer` → `Offer{itemOffered: Service{name}, price}` |
| Auto repair / body / tires / parts / towing | `AutoRepair`, `AutoBodyShop`, `AutoPartsStore`, `AutomotiveBusiness` (towing: `AutomotiveBusiness` + Service "Towing") | `areaServed` for tow radius, `makesOffer` services |
| Plumbing / HVAC / roofing / electrical / general | `Plumber`, `HVACBusiness`, `RoofingContractor`, `Electrician`, `GeneralContractor`, `HousePainter`, `Locksmith` ([list](https://schema.org/HomeAndConstructionBusiness)) | `areaServed` (array of `City`/`AdministrativeArea`), `hasOfferCatalog`, emergency phone as `contactPoint{contactType:"emergency"}` |
| Landscaping / lawn | **No LandscapingBusiness type exists.** Use `HomeAndConstructionBusiness` (or `LocalBusiness`) + `makesOffer` Service `serviceType:"Landscaping"` | `areaServed` |
| Cleaning / pressure washing | **No HouseCleaning/CleaningService type exists** (only `DryCleaningOrLaundry`). schema.org's own example is `LocalBusiness` + `Service{serviceType:"Home cleaning"}` ([schema.org](https://schema.org/LocalBusiness)) | `areaServed` |
| Church / civic post / charity | `Church` is Place → CivicStructure → PlaceOfWorship, not a LocalBusiness ([schema.org](https://schema.org/Church)); pair with `Organization` (or `NGO` for charities) for `logo`/`sameAs`; VFW/Legion → `Organization` | `event` (`Event` per service time with `eventSchedule`), `openingHours` for office |
| Tax / accounting / insurance / advisor | `AccountingService`, `InsuranceAgency`, `FinancialService` | `areaServed`, no `aggregateRating` ever for advisors |
| Florist / boutique / feed / furniture / print | `Florist`, `Store` (`ClothingStore`, `FurnitureStore`, `HardwareStore`, `PetStore`), print shop → `LocalBusiness` | `paymentAccepted`, `hasOfferCatalog` |

`aggregateRating`: never Google's rating, and Google treats a business rating itself as ineligible anyway ([review snippet](https://developers.google.com/search/docs/appearance/structured-data/review-snippet)); omit it (the visible "★ 4.8 · 386 reviews" text with a Google link is fine).

## B3. Setup steps that turn a site into rankings

1. Put the live URL in the GBP **Website** field (menu and order/reserve links in theirs); the landing page's title keywords are a top-5 organic factor.
2. **Search Console per client**: create a URL-prefix property `https://<domain>/` and verify with the **HTML meta tag** baked into the generator's `<head>` at publish (no DNS access needed; DNS is required only for Domain properties ([verification](https://support.google.com/webmasters/answer/9008080))). One agency account holds up to 1,000 properties ([limit](https://support.google.com/webmasters/answer/34592)); add the client as a user on request. Store the token per lead and emit `<meta name="google-site-verification">` on every build.
3. Submit `/sitemap.xml` (home, subpages, /es/) and `Sitemap:` in robots.txt per site.
4. **Bing Places**: import from GBP with scheduled sync; Bing Webmaster Tools can import up to 100 verified sites at once from Search Console.
5. **Apple Business Connect** claim (phone code), same NAP, link the site.
6. Week one: URL Inspection → Request indexing on the home page.

## B4. Listings that matter in a small Alabama town

Tier 1 (every client): Google, Apple Business Connect, Bing Places, Facebook (NAP + website field), Yelp (claim, do not pay), Nextdoor. Tier 2: BBB (cited by AI engines), yp.com, Chamber directory, Angi for trades, Tripadvisor/OpenTable for restaurants (GBP + Yelp + Tripadvisor + OpenTable = ~80% of AI citations for restaurants ([BrightLocal](https://www.brightlocal.com/resources/ai-directory-sources/))), Booksy for salons. Aggregators (Data Axle, Foursquare, TransUnion/Neustar Localeze, YP Network, GPS Network) still seed the long tail of maps/apps ([BrightLocal](https://www.brightlocal.com/learn/local-citations/building-citations/data-aggregators/)): one ~$25-per-network submission at sign-up, not a monthly service. Consistency beats quantity.

## B5. Compliant review generation

Allowed: ask every customer equally with the review link or QR after the job; remind; reply to every review. Forbidden by Google: incentives (payment, discounts, free goods), discouraging negatives or selectively asking happy customers (gating), pressuring reviews on premises, staff quotas, review requests that name staff ([Google](https://support.google.com/contributionpolicy/answer/7400114), [Whitespark Q2 2026](https://whitespark.ca/blog/23-local-developments-you-need-to-know-about-from-q2-2026/)). The FTC Consumer Reviews Rule (16 CFR 465, Aug 2024) bans incentives tied to sentiment and suppressing negatives; penalties ~$53k per violation and warning letters began in 2026 ([Kelley Drye](https://www.kelleydrye.com/viewpoints/blogs/ad-law-access/ftc-finalizes-rule-on-fake-reviews), [JD Supra](https://www.jdsupra.com/legalnews/five-stars-zero-tolerance-ftc-turns-up-3594404/)). Send our QR cards and review texts to everyone and pace them (a spike can trigger Google's review pause); QR codes straight to the review form reportedly trigger filtering, so link to the Place ID page instead.

## B6. Monthly report for a $49 to $149 client

One page, texted as a link: (1) GBP calls, direction requests, website clicks, Maps vs Search impressions, top 5 keywords, reviews; (2) Search Console clicks, impressions, position, top 5 queries, month-over-month; (3) `site_stats` visits and taps; (4) one line on what changed and one ask. APIs: **Business Profile Performance API** `locations.fetchMultiDailyMetricsTimeSeries` with `CALL_CLICKS`, `WEBSITE_CLICKS`, `BUSINESS_DIRECTION_REQUESTS`, `BUSINESS_IMPRESSIONS_{DESKTOP,MOBILE}_{MAPS,SEARCH}`, `BUSINESS_BOOKINGS`, `BUSINESS_FOOD_MENU_CLICKS` plus `searchkeywords.impressions.monthly` ([DailyMetric](https://developers.google.com/my-business/reference/performance/rest/v1/DailyMetric)); needs the Business Profile API approval on the owner's list and Manager access per profile. **Search Console API** `searchanalytics.query` with dimensions query/page/device/date, metrics clicks/impressions/ctr/position, scope `webmasters.readonly` ([reference](https://developers.google.com/webmaster-tools/v1/searchanalytics/query)); works once each property is verified under the agency account.

## B7. Honest expectations (client-facing)

> Your website is the thing Google, Apple, Bing and AI assistants point people to once they have found you; it is not what makes them find you. For most Cullman searches ("plumber near me") the Map results decide, and those run on your Google Business Profile: your category, how close you are, your reviews and whether you're open. We build the site to do its half: load fast, say exactly what you do and where, match your Google listing, and give people a reason to call. Expect your own name within weeks and "your trade + Cullman" over 3 to 6 months if your profile is complete and reviews keep coming. We cannot promise a position, outrank a competitor with 400 reviews by changing words on a page, or make you appear in towns you don't serve. The $89 plan includes setup and a monthly report, not ads, link building or extra content.

## B8. Five quick technical wins for static sites

1. **`width`/`height` on every `<img>`/`<video>`** (or CSS `aspect-ratio`) and reserved `min-height` for maps/embeds ([optimize CLS](https://web.dev/articles/optimize-cls)).
2. **Hero image** in the initial HTML with `fetchpriority="high"`, never `loading="lazy"`; lazy-load everything below the fold; AVIF/WebP per breakpoint ([optimize LCP](https://web.dev/articles/optimize-lcp)).
3. **Fonts**: self-hosted WOFF2 subsets (already @fontsource), `font-display: swap` for headings, `optional` for body, `size-adjust` fallbacks, preload the one heading font ([font best practices](https://web.dev/articles/font-best-practices)).
4. **Preconnect** only to origins used before first paint; serve the hero image from the site's own origin.
5. **hreflang for /es/**: on both pages, `<link rel="alternate" hreflang="en|es|x-default">` with absolute URLs, each page listing itself and the other (non-reciprocal tags are ignored; `es-419` is invalid) ([localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions)). Canonical on /es/ points to /es/, never to /.
