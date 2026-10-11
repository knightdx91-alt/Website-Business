# Company website: audit, 25-site study and blueprint (October 2026)

What undergroundassociates.com should be, decided from a look at 25 comparable sites (the big builders,
done-for-you subscription sellers and small local agencies) and the 2026 local-SEO playbook in
`seo-playbook-2026.md`. Source notes for every site are in the session scratchpad (`site-audit/research-batch1-3.md`);
this file keeps the conclusions.

## 1. Audit of the site as it was (Oct 11, 2026)

Rendered per request from Settings by `src/worker/company.ts`. Clean, fast, accessible, honest. Weak as a sales page:

- Hero is text only. Nothing shows the product (a finished site on a phone), which is our whole pitch.
- No proof within the first scroll: no badge row, no numbers, no face. The owner strip sits below the fold and the photo
  file (`app/public/owner.jpg`) was never added.
- "Our work" shows four example sites but does not say which trade each is for until you read the small print.
- Plans: the card only prints the no-setup-fee price; "ways to pay" is a separate grid three screens later. Visitors
  cannot see the month-to-month price and the setup fee side by side.
- Extras are 14 equal cards, which reads as a price list rather than an offer.
- One page carries everything (12 sections). No pricing page, no about page, no industry pages, so nothing can rank for
  "restaurant website Cullman" or "website design pricing".
- Sitemap lists 4 URLs. FAQ uses `<details>` with no schema (fine: Google removed FAQ rich results for all sites on
  7 May 2026). Structured data is a bare ProfessionalService without geo, priceRange or logo.
- Nothing fabricated, which is right: the app has 0 sold clients as of this date (104 new, 10 shown).

## 2. The 25 sites

Builders: Wix, Squarespace, GoDaddy (fetch blocked; secondhand), Web.com (captcha; secondhand), Durable, B12, Hibu, Thryv,
Townsquare Interactive, Webflow, Duda, Weebly, Jimdo, Hostinger, 10Web, Mixo, Umso.
Done-for-you monthly and local agencies: UENI, Redefine Web, Northwoods Web Designs, $99 Social, SiteWired, IG Webs,
Word of Host, Purple Tie Guys (plus Digital Shift as a footnote). Dead or DIY-only candidates dropped: weblium, webstarts,
pagecloud, sitey, sitesforsmallbusiness, websitesinaweekend, lemonadestand.co and five more.

## 3. What converts (patterns that held across all three batches)

1. Hero = one promise + one reassurance line + one button + a tiny risk-killer ("no credit card"). Nobody leads with proof
   in the headline; the price-in-headline sites ($79, $99/month) win at the low-ticket end.
2. **Nobody offers a finished site before payment.** Trials, crippled tiers, "24-hour mockup after sign-up" at best.
   "See it before you pay" is open ground and belongs in the H1, not a footnote.
3. Proof sits within one scroll on 7 of 8 strong pages: a 4-item badge row under the hero (years · sites · local team ·
   rating). Small agencies with few clients use named local clients, year counts, directory badges, the founder's face
   and "real humans" wording instead of Google stars. Only 2 of 8 local agencies show a Google review count.
4. Three tiers, second tier badged "Most popular" at 1.5–2.4× the entry price. Both prices on one card (Weebly) beats a
   monthly/annual toggle for honesty and skimmability.
5. Teaser pricing corrodes trust (Hostinger $2.99 = 48-month prepay renewing at $10.99; $3/month to remove a footer
   credit; $2,000 early-cancel buried in fine print). State the real monthly number and the early-cancel maths plainly.
6. Risk reversal next to the price: no setup fee, cancel after the term, you own your content, approval gate before
   go-live, reply-time promise. Guarantee badges printed directly under the price cards is the cleanest execution.
7. Show real work, labelled by trade (filterable galleries, desktop + phone pairs). Thin pages show none.
8. A 3-step process plus "what happens after you say yes" (first-week timeline, sign-off gates) is on every converting
   done-for-you page.
9. A comparison table (DIY builder vs freelancer/agency vs this) justifies the monthly fee.
10. Industry rows ("businesses like yours") on 5 of 7 builders; dedicated industry pages are also the #1 localized-organic
    ranking factor (Whitespark 2026).
11. FAQ before the closing CTA; 8–12 questions, not 44.
12. Shortest pages are clearest (B12: 5 sections). Target 7–8 home sections and move depth to its own pages.
13. Credibility leaks are everywhere (mismatched counts, "0+", blank "% OFF"). Every number on our site comes live from
    the app or is not shown.
14. Blunt, human voice ("No contracts. No BS.", "never AI slop") separates small agencies from template mills.
15. Fear-led AI headlines are the 2026 agency trend; builders stay upbeat. Stay upbeat and concrete.

## 4. Blueprint

### Page map (all rendered from Settings; added to the sitemap)

| URL | Job | Ranks for |
|---|---|---|
| `/` | Sell the free preview. 8 sections. | website design Cullman AL, brand |
| `/pricing` | Plans with both prices per card, ways to pay, extras grouped, comparison table, early-cancel maths, FAQ. | website pricing, monthly website Cullman |
| `/websites-for/<trade>` (one per template pack) | What the site for that trade includes, the example site, trade FAQ, plan hint. | restaurant website Cullman, plumber website Alabama … |
| `/about` | E-E-A-T: who, where, since when, how we work, policies, the LLC. | Underground Associates |
| `/cullman-county` | One service-area page (Cullman, Hanceville, Good Hope, Vinemont, Holly Pond, Hartselle, Arab…). No per-town clones (doorway-page policy). | website design <town> AL |
| `/portfolio` | Every example site with type and design name. | (exists) |
| `/terms`, `/privacy`, `/extras`, `/start` | (exist) | |

### Home page, in order

1. **Hero.** Eyebrow "Cullman, Alabama". H1 "Your website is already built. See it before you pay a dime." Lead: built
   free from the Google listing, look it over on a phone, live from $49/month with hosting and updates, no setup fee on
   6- or 12-month plans. Buttons: "See my free preview" (form) and "Call 256-636-5886". Visual: a phone frame showing an
   example site, caption "Built from a Google listing. Yours would look like you."
2. **Badge row** directly under the hero: Built before you pay · No setup fee · Hosting & updates included · Local, in
   person. When the app has 3+ live clients the first badge becomes "<n> Cullman-area businesses live" (live number, never
   typed). When testimonials exist (Settings → Website), one shows under the row.
3. **How it works** (3 steps) + **your first week** timeline (sign on the phone → photos and fixes → live within 3
   business days → monthly report and changes).
4. **Websites built for your trade**: example cards labelled by trade, each linking to its `/websites-for/` page.
5. **Plans** (compact): three cards, Plus badged, both prices on each card, guarantee badges under the cards, "see full
   pricing and extras" link. Extras as one row of chips with prices.
6. **Who you'll work with**: owner photo (add `app/public/owner.jpg`), name, "I build it, show it to you in person, and
   keep it running", phone, LLC and town. Bio text editable in Settings → Website.
7. **Questions** (9).
8. **Get your free preview** form + phone + direct email.

### Copy rules

- One number per claim, every number live from Settings/D1 or absent. Never a testimonial that is not typed into Settings
  by the owner from a real client.
- Price always as "$89/month" with "no setup fee on a 6- or 12-month plan" in the same breath; month to month shown as
  "$89/month + $299 setup, cancel any time".
- Early cancel stated: "Leave before the term ends and you owe the months left, less 15% if paid at once."
- Upbeat, plain, short sentences. No "AI", no fear, no jargon.

### Proof without clients (until the first five sales)

Owner's face and name, the LLC and the town, the free preview itself ("you've already seen it"), the example sites by
trade, the count of designs (625 per trade), the first-week timeline, the guarantee badges, the phone number everywhere.
Add real testimonials and the live-client count as they happen (Settings → Website; the count is automatic).

## 5. SEO

Full playbook with sources: `seo-playbook-2026.md`. What the code does now:

- Company site: ProfessionalService + LocalBusiness JSON-LD with address (city), geo, areaServed, priceRange, sameAs,
  logo, image; Organization node; per-page titles/descriptions/canonicals; sitemap with every page and lastmod;
  industry pages and a county page as above. No FAQPage schema (rich results gone), no aggregateRating (self-serving).
- Client sites already had: `<Business> | <Service> in <Town>, AL` titles, one H1, typed LocalBusiness subtype per
  variant, OfferCatalog from services, geo, hours, canonical, sitemap, robots, OG image, hreflang. Added: `x-default`
  hreflang, a per-client Google Search Console verification tag (Edit → Links → "Search Console code"), footer credit
  `rel="nofollow"` (brand-anchored, site-wide template links are named in Google's link-spam policy), and an SEO
  setup checklist on the Google & social tools screen (link the site in GBP, verify Search Console + submit the sitemap,
  Bing Places import, Apple Business Connect, review link QR to the Place page).
- Owner's own to-dos: set up our Google Business Profile as a service-area business (primary "Website designer",
  secondaries "Internet marketing service", "Web hosting company", services with prices), verify a Domain property in
  Search Console and submit `/sitemap.xml`, Chamber of Commerce listing, Bing Places, Apple Business Connect.
- Not built yet: Search Console / Business Profile Performance API pull into the monthly client report (needs the
  Google OAuth work planned for GBP step 2).

## 6. What updates from the app (no code change needed)

| Edited in the app | Shows on the website |
|---|---|
| Settings → Sales: plan names, prices, what's included, minimum months, setup fee, yearly months free | Home plans, `/pricing`, `/start`, sign-up pages, agreement |
| Settings → Extras: name, price, unit, about, contract terms | Extras on home and `/pricing`, `/extras`, checkout |
| Settings → Your business: company name, legal name, phone, email, Facebook, review link, Google tag | Header, footer, schema, contact, every page |
| Settings → Website (new): headline, lead line, owner bio, testimonials, towns served | Hero, about strip, proof row, county page |
| Example sites (`npm run examples`) | Portfolio and trade cards |
| Live clients (sales status Live) | The badge-row count once there are 3 |

The site is rendered per request with a 5-minute cache, so a change in Settings is live within five minutes.
