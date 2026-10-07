# Shared baseline: what every generated site has, whatever the category

This file pulls together the six category blueprints in this folder (restaurants and cafes, contractors, salons and
barbershops, auto repair, landscaping and lawn care, cleaning services). It defines the **one core** that the template
system shares: page skeleton, components, accessibility, performance, local SEO, data model and theming. Each category
then plugs in a **category pack** on top.

It is a synthesis, not new fieldwork. Every rule here is either backed by at least four of the six blueprints or is a
gap that all six leave open (marked **[gap]**). Section 10 lists where categories differ for real and must stay out
of the core. Section 11 lists where the blueprints contradict each other, with a proposed resolution for each.

Combined sample behind the blueprints: **410 readable home pages** (restaurants 63, contractors 60, salons 79,
auto 80, landscaping 59, cleaning 69), all counted from home pages only.

---

## 1. Why one core works: the same failures in every category

The weak sites in all six samples fail on the same basic points. The core exists to get those right every time.

| Basic | Restaurants | Contractors | Salons | Auto | Landscaping | Cleaning |
|---|---|---|---|---|---|---|
| Has a `tel:` tap-to-call link | 20/63 | 57/60 | 49/79 | 77/80 | 48/59 | 59/69 |
| Uses a specific schema.org business type | 7/63 food type | 21/60 trade type | 5/79 | 21/80 `AutoRepair` | 22/59 any LocalBusiness | 22/69 `LocalBusiness` |
| No H1, or several H1s | not counted | 15/60 | 32/79 | 16/80 | "many" (one had 14) | 16/69 |
| JS-only or near-empty page seen | yes | yes | yes (8) | yes | not counted | yes (9) |
| Heavy HTML before images | not counted | 7/60 >1 MB | 15/79 >500 KB | 5/80 >500 KB | not counted | 9/69 >1 MB |
| Conflicting NAP, hours or claims within one site | yes | yes | yes | yes | yes | yes |
| Expired promos or stale signals left live | yes | yes | yes | yes | yes | yes |
| Template leftovers / placeholders live | yes | yes | yes | yes | yes | yes |

All six blueprints reach the same conclusion: a fast, correct, consistent static page beats most local competitors before
design even comes into it.

---

## 2. Architecture: core, category pack, variant, theme

```
core            one record schema, one component library, one build + linter, one schema.org/SEO generator
 └─ category    field extensions, section order, CTA matrix, service seed lists, copy prompts, schema type map, defaults
     └─ variant subtype toggles (e.g. BBQ vs coffee, HVAC vs roofing, salon vs barber, tire vs general,
                lawn crew vs design-build, residential vs commercial)
         └─ theme   one of the category's 3-4 looks, plus an accent variant: design tokens only, no markup
```

Rules that keep the layers clean:
- **Components never know the category.** A component takes typed props (for example a list of cards or an hours object)
  and theme tokens. Category packs map their data onto those props.
- **Section order is owned by the category and variant, never by the theme** (see contradiction C11).
- **Themes are tokens plus a short list of enumerated layout knobs** (section 9). A theme that needs new markup is a new
  component in the core, available to every category.
- **One record feeds everything.** Header, hero, info strip, visit/contact section, footer, schema and `tel:` links all
  render from the same fields. Every blueprint lists conflicting facts as an anti-pattern. This rule removes them by construction.

---

## 3. Shared page and section skeleton

### 3.1 Pages

| Page | Status | Notes |
|---|---|---|
| Home `/` | **Always** | One long page with anchored sections. It must work for a visitor who never clicks further. |
| Category "money page" | **Always, one per category** | Restaurants `/menu/`. Contractors `/contact/` (request service or estimate). Salons: none by default, everything is on Home; `/services/` when the menu runs past about 15 items. Auto `/services/` + `/contact/`. Landscaping `/quote/`. Cleaning `/services/` (tiers and checklist) + `/quote/` + `/about/`. |
| Privacy `/privacy/` | **When a form or analytics is on** | Generated boilerplate. All four form-led categories need it. |
| Thank-you `/thanks/` | **When a form is on** | Static page the form redirects to (no-JS path). Includes the call/text fallback. |
| `404.html` | **Always** | Branded, with call button and link home. Cloudflare Pages serves it automatically. **[gap]** |
| Optional subpages | **Only above a data threshold** | Generated only when the owner supplies enough unique content (service detail pages, team pages, gallery, catering, plans, careers...). Thresholds are set per category (section 10). |
| Never generated | | Blogs, per-town doorway pages, per-make pages, live feeds. All six blueprints reject these. |

Navigation: **at most 6 items**, all anchors on Home except the money page. One `<nav>` element that changes layout
with CSS. Never ship duplicate desktop and mobile nav or section markup (restaurants and auto both saw this).

### 3.2 Home page section slots

The core defines the slots. The category pack fills them, orders the middle, and switches optional ones off.

| # | Slot | Core component | In every category? |
|---|---|---|---|
| 1 | Header | `SiteHeader` | Yes |
| 2 | Hero | `Hero` | Yes |
| 3 | Quick info / trust strip | `InfoStrip` (hours, address, service chips) or `TrustStrip` (badges, chips) | Yes (category picks which) |
| 4 | What we offer | `CardGrid` (services) or category component (menu highlights, service menu with prices, tiers) | Yes |
| 5 | Category module(s) | category components (specials, trade module, plans, checklist, warranty band, tire quote...) | Category |
| 6 | How it works | `Steps` (3-4 numbered steps) | Service categories (contractors, auto, landscaping, cleaning). Optional for others |
| 7 | Proof: our work | `Gallery`, `BeforeAfter` | Optional everywhere, default on for landscaping, roofing, salons |
| 8 | People | `PeopleCards` | Salons (central); optional elsewhere |
| 9 | Reviews | `Reviews` | Yes |
| 10 | About / story | `About` | Yes (short version when owner facts are thin) |
| 11 | Where | `Visit` (storefront: hours table, address, directions, parking) or `ServiceArea` (towns, counties, radius) | Yes, one of the two, sometimes both |
| 12 | FAQ | `FAQ` | Yes when 4+ answers are backed by data, otherwise hidden |
| 13 | Final CTA band | `CTABand` | Yes |
| 14 | Footer | `SiteFooter` | Yes |

### 3.3 Above the fold on a phone (all categories)

Test at 344, 360, 390 and 412 px wide and about 640-750 px tall (section 6.5). The first screen must show:
1. Business name or logo.
2. One line that names what they do **and the town** (in the H1 or directly under it).
3. The **primary CTA** button, full width.
4. A **call control** (button or header icon), always a real `tel:` link.
5. **One trust line** built only from confirmed fields (for example founding year, licensed and insured, warranty term,
   walk-ins welcome).
6. For storefront categories (restaurants, salons, auto): **today's hours or open/closed status**.

Hero photo: no taller than about 55% of the viewport on phones. Use a scrim behind any text on a photo. No carousels,
no autoplay video, no popups or interstitials. All six blueprints list these as anti-patterns.

---

## 4. Shared components

Each component reads theme tokens only. Specs below are the core contract. Categories configure, they don't fork.

### 4.1 `SiteHeader`
- Logo, or a typeset wordmark from the theme when the owner has none.
- Call icon/button (`tel:`) on mobile, plus the primary CTA button on wide screens.
- Menu: hamburger opening a full-screen overlay of at most 6 anchor links. Smooth scroll with an offset for the header.
- Height ≤ 56 px on phones. **Not sticky.** It hides on scroll-down and reappears on scroll-up, because the bottom action bar
  carries the persistent actions (contradiction C6).
- Skip link ("Skip to content") as its first focusable element. **[gap]**
- Optional thin utility strip above it (emergency / 24/7 note, license number, tow line) when the category enables it.

### 4.2 `ActionBar` (sticky mobile call bar)
Every blueprint wants one. The settings below reconcile their variants:
- Shown below 768 px wide only. Fixed to the bottom, **2-3 buttons**, bar ≥ 56 px tall, every target ≥ 48 px.
- Respects `env(safe-area-inset-bottom)`. The page gets bottom padding equal to the bar height so the footer is never covered.
- Hidden while a form field has focus (the on-screen keyboard is up).
- Appears once the hero CTAs scroll out of view (IntersectionObserver). With no JavaScript it is always visible.
- Buttons come from the **action registry** (4.3). Each category sets the default set: restaurants Call | Order or Menu | Directions;
  contractors Call | Schedule or Estimate; salons Book | Call | Directions (walk-in shops: Call | Directions | Hours);
  auto Call | Book | Directions (Tow or Tire quote swapped in by variant); landscaping Quote | Call (or Call | Text);
  cleaning Call | Text | Quote.
- No chat bubbles or floating widgets anywhere, because they fight the bar for the bottom of the screen.

### 4.3 Action registry (one place that builds every CTA link)

| Action | Built from | Rules |
|---|---|---|
| `call` | `phone.e164` | Always `tel:+1XXXXXXXXXX`, generated from the normalized number, never from free text (restaurants and auto both found broken `tel:` strings). |
| `text` | `phone.e164` + `sms_enabled` | `sms:` link, optional prefilled body. Only when the owner confirms the number takes texts. |
| `directions` | `place_id` / `maps_url` | Google Maps URL from the Place ID. Optional Apple Maps link. |
| `book`, `order`, `reserve` | owner URL | Provider detected from the domain for the label and icon. Opens in a new tab. |
| `quote` / `request` | built-in form | `/quote/#form` or `#contact`. Replaced by `book` when the owner sets a booking URL and chooses it. |
| `review` | `place_id` | "Leave us a review" link to Google's write-review URL. |
| category actions | category data | `tow` (separate tow phone), `tire_quote`, `catering`, `consultation`... registered by category packs. |

One action is the **primary** per site, chosen by data (for example restaurants: order URL present → Order, else Call).
Every button label comes from a fixed list per action. The AI does not invent CTA wording.

### 4.4 `Hours` (one component, used everywhere hours appear)
- Data: per-day **list of intervals** (lunch and dinner splits), overnight intervals, `open_24_7`, `by_appointment`,
  holiday closures with dates, a seasonal note, a free-text note (kitchen vs bar, "daylight hours").
- Renders: the full weekly table (static HTML, the no-JS truth) plus a small script that shows "Open now · closes 8 PM" /
  "Closed · opens Tue 10:30 AM" and highlights today.
- **Open-now is computed in the business's time zone** (`America/Chicago` for the Cullman market), not the visitor's.
  None of the blueprints says this. A visitor in another zone would otherwise see the wrong status. **[gap]**
- Upcoming holiday closures show automatically in the 14 days before the date.
- "24/7" renders only from `open_24_7 = true`, which needs an explicit owner confirmation (contractors and auto both saw
  24/7 claims contradicted by the site's own hours).

### 4.5 `Visit` / location and directions
- Address text (tap → directions), directions button, parking or landmark line, highway exit when relevant.
- **No map image by default.** Several blueprints suggest a "static map image", but a Google Static Maps image would be
  Google content re-hosted on the site (or hot-linked with an exposed key). Use the directions button. An optional
  **click-to-load** Google Maps embed iframe is allowed on the Visit/Contact section for storefront businesses
  (contradiction C5).
- Service-area businesses (most contractors, landscapers and cleaners) use `ServiceArea` instead: a town list, counties,
  radius, and a "Not sure? Ask us" line. The street address shows only when `show_street_address` is true.

### 4.6 `ContactForm` (lead form)
Used by contractors, auto, landscaping and cleaning, and optionally by restaurants (catering) and salons (careers).
- Core fields: **name and phone required**. Email optional. Message optional. Categories add their own fields (vehicle,
  service checkboxes, frequency, home size, town dropdown) up to **6-8 visible fields**.
- `type="tel"`, `autocomplete` attributes, labels always visible (no placeholder-only labels), errors announced to screen readers.
- Posts to **one shared Cloudflare Worker endpoint** that emails and/or texts the owner. No per-site server code.
- Spam: honeypot field + Worker-side rate limiting + Cloudflare Turnstile when JS is on. A no-JS plain POST is still
  accepted, with stricter rate limits and an "unverified" flag in the notification (contradiction C8).
- Visible fallback next to the submit button: "Or call / text (256) 555-0123". Optional owner-set reply-time line.
- Thank-you state on `/thanks/`.

### 4.7 `Reviews`
- Owner-supplied testimonials only (with customer permission): quote, display name (first name or initial), town,
  service, optional date. Cap at 3-5 on Home.
- "See our reviews on Google" and "Leave a review" links built from the Place ID.
- **Never** Google review text, quoted or paraphrased. Never a live review widget. Never `AggregateRating` markup from Google data.
- Numeric Google rating: link-only by default. See contradiction C1 for the options.

### 4.8 `TrustStrip` and badges
- Chips render **only** from filled, owner-confirmed fields (founded year → "Since 1987", computed years, licensed and insured,
  license number, warranty term, family-owned...). An empty field produces no chip, never hedged text.
- "N years in business" is computed from `founded_year` at build time, never typed (contractors and auto saw the two disagree).
- Badge images only for marks we have permission to use. Text badges otherwise. Cap at 4-6 on phones, with horizontal scroll.

### 4.9 `Gallery` and `BeforeAfter`
- Owner, stock or AI images only on published sites. Every image carries `source`. **The publish step blocks while any
  `source: google` image is still in use** (landscaping's rule, made core).
- Grid of square or 4:3 thumbnails, lazy-loaded, simple lightbox with swipe and keyboard support, cap of 12 on Home.
- Before/after: same-size pair, drag handle that is also keyboard-operable (arrow keys), side-by-side fallback with no JS.
- Graceful at 0, 3 or 20 photos: below the category threshold the gallery becomes a strip on Home or hides.

### 4.10 `CardGrid`, `Steps`, `FAQ`, `PeopleCards`, `PlanCards`, `Offers`, `CTABand`
- `CardGrid`: services, features or categories. Icon or photo, title, one line, optional price chip, optional link. 1 → 2 → 3
  columns from folded phone to unfolded Fold to desktop.
- `Steps`: 3-4 numbered steps.
- `FAQ`: native `<details>`/`<summary>` accordion (works without JS, accessible by default).
- `PeopleCards`: photo, name, role, specialties, optional per-person booking button.
- `PlanCards`: tiers or plans with "starting at" price and unit. Used for landscaping plans, HVAC maintenance plans and
  cleaning recurring frequencies.
- `Offers`: coupons, specials and promos with `starts_on` / `expires_on`. **Expired offers are removed from the HTML by a
  scheduled rebuild** (6.4), with a client-side hide as a backstop. A client-side hide alone leaves expired offers visible
  to crawlers and link previews.
- `CTABand`: heading, one line, primary + call buttons, plus hours for storefronts.

### 4.11 `SiteFooter` (NAP block)
- Name, address (or "Serving {County} County, {ST}" when the street is hidden), phone as `tel:`, hours summary (from the
  same `Hours` data), service towns, social links **with text labels** (not icon-only), review link, gift card / jobs /
  portal links when set, privacy link, copyright year generated at build.
- No vendor admin links, no "powered by" badges.

---

## 5. Accessibility (WCAG 2.2 AA as the floor)

Built into the components, never bolted on. **No accessibility overlay widgets.** Contractors, salons and auto all
reject them, and auto found them on 33/80 sites.

- **Contrast:** 4.5:1 for body text, 3:1 for large text (≥ 24 px, or ≥ 18.66 px bold) and for UI component boundaries and focus
  indicators. **Checked at build time for every token pair a theme actually uses** (text on bg, text on surface, button
  label on button, bar text on bar, link on bg, footer text on footer). A theme that fails does not build. Section 11 lists
  palette pairs in the blueprints that already fail.
- **Structure:** exactly one H1 per page, logical H2/H3 order, no headings used for styling, landmarks (`header`, `nav`,
  `main`, `footer`), skip link, `lang="en"` (and `hreflang` when a Spanish page exists).
- **Targets:** every tap target ≥ 48 × 48 px with spacing. (WCAG 2.2 asks for 24 px. 48 px is the practical phone standard.)
- **Focus:** visible focus ring from a theme token, never removed. Menu overlay and lightbox trap focus while open and
  restore it on close. Esc closes them.
- **Text:** all real text in HTML. No hours, specials, menus or prices baked into images. No letter-spaced names that
  screen readers spell out. No script or cursive fonts for body text. Body ≥ 16 px. Line length ≤ about 75 characters.
- **Images:** meaningful alt text on every content image, empty `alt=""` on decorative ones. Alt text describes the
  actual photo ("skin fade with beard line-up", "mulch bed refresh in Cullman"), never "image1" or "slide 2".
- **Links and buttons:** links that open a new tab say so (visually-hidden "opens in new tab"). Social links have text
  labels. No `#` placeholder links. Every link is real (linter, 6.6).
- **Motion:** honor `prefers-reduced-motion` (smooth scroll, slider transitions). Nothing autoplays.
- **Forms:** visible labels, `autocomplete`, error messages tied to fields with `aria-describedby`, success announced.
- **Zoom and reflow:** usable at 200% zoom and at 320 px wide with no horizontal scroll.

---

## 6. Performance and static hosting on Cloudflare Pages

### 6.1 Output
- Every page is **pre-rendered static HTML with all copy in the markup.** JavaScript only enhances (open-now, menu
  overlay, lightbox, before/after, bar show/hide). The site must read and convert with JS off: `tel:`, `sms:` and the
  plain-POST form all work.
- **No third-party JavaScript on page load.** Booking, ordering and map embeds load only after a tap, in an iframe, on a
  dedicated page or section. No chat, review, feed, CRM or call-tracking scripts.

### 6.2 Budgets (per page, on a mid-range phone over 4G)

| Item | Budget |
|---|---|
| HTML + CSS + JS before images | ≤ 100 KB transferred (compressed). Auto's blueprint sets ~100 KB; the core adopts it for all |
| Our own JavaScript | ≤ 15 KB compressed, one file, `defer` |
| Hero image on mobile | ≤ 150 KB (cleaning sets 150, salons and landscaping 200; the core takes the stricter one) |
| Total first load (above the fold) | ≤ 500 KB |
| Whole Home page with lazy images | ≤ 1.5 MB |
| Web fonts | ≤ 2 families, ≤ 4 woff2 files, Latin subset, **self-hosted** in the bundle (no Google Fonts requests) |
| Core Web Vitals targets | LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms |

### 6.3 Images
- AVIF and WebP with a JPEG fallback, `srcset` at 2-3 widths, explicit `width`/`height` or `aspect-ratio`, `loading="lazy"`
  below the fold, `fetchpriority="high"` on the hero. Never inline base64 images (one salon shipped 1.27 MB of HTML that way).
- Image filenames describe the content and town (`deep-cleaned-kitchen-cullman-al.webp`).
- OG/share image: the hero (never a Google photo) or a generated card with name + town.

### 6.4 Build, deploy and scheduled rebuilds
- One Cloudflare Pages project per client site (or one project with per-client deployments, to be decided when building the app).
  Previews are served by the app (Worker + R2) **behind the owner's login** with `X-Robots-Tag: noindex, nofollow` and
  `<meta name="robots" content="noindex">`. They are never served from a public Pages URL.
- Published sites get `sitemap.xml`, `robots.txt`, canonical URLs, Open Graph and Twitter card tags.
- When a custom domain is attached: canonical tags switch to it, and the `*.pages.dev` host redirects to it (a Pages Function
  or Bulk Redirect), so search engines see one site.
- `_headers`: long cache on hashed assets, short cache on HTML, `Strict-Transport-Security` (custom domain),
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a `Permissions-Policy` that turns off
  unused features, and a Content-Security-Policy that allows only our own assets plus the form Worker and Turnstile.
  **[gap]**
- **Scheduled rebuild (a daily cron Worker).** The blueprints rely on several "auto" behaviors that a static site cannot do
  on its own: expired offers disappearing, the copyright year, upcoming holiday notices, and re-checking Places data.
  A daily job rebuilds any site whose output would change and redeploys it. **[gap]**
- Analytics, if wanted: Cloudflare Web Analytics (cookieless, first-party beacon). Off by default, and the privacy page
  mentions it when it's on. **[gap]**

### 6.5 Device test matrix
344 px (Fold cover screen, folded), 360, 390, 412, about 700-900 px (Fold unfolded), 1280 px desktop. The owner demos on a
Galaxy Z Fold, so both folded and unfolded widths must look finished. Cards go 1 → 2 → 3 columns across these widths.

### 6.6 Publish gate (build linter): consolidated from all six anti-pattern lists
The build **fails** on any of these:
- Placeholder or leftover text: `lorem`, `[City]`, `[Phone Number]`, `Your Business`, `Slide title`, `John Doe`, sample emails,
  instruction or meta-text from the generator, empty headings, empty required sections.
- Any link to `#`, any link whose domain is not on the allow list (own site, owner-supplied URLs, Google Maps, known providers),
  any vendor admin link.
- A phone anywhere that doesn't match `phone.e164`, or a malformed `tel:` link.
- Zero or more than one H1 on a page. Missing `<title>` or meta description. Title over 60 characters.
- Any image with `source: google`. Any image without alt text (or explicit decorative marking).
- Any claim chip or copy that references an empty or unconfirmed field (licensed, insured, 24/7, warranty, years, awards,
  prices, "family-owned", response time).
- A failing contrast pair in the active theme.
- A budget overrun from 6.2.
- Any visible Google review text (fuzzy match against the review text we hold as AI context).
- Superlatives ("best", "#1", "top-rated", "premier", "world-class") without a sourced award field.
- `business_status` from Places not `OPERATIONAL`.

---

## 7. Shared local SEO

### 7.1 Schema.org (JSON-LD)

One `LocalBusiness`-family node with a stable `@id` (`https://{domain}/#business`) on Home. Other pages carry `WebPage`
and `BreadcrumbList` nodes that reference it by `@id` rather than repeating it (contradiction C10). Home also gets a `WebSite` node.

**Type map (category pack supplies this; collected here so it stays consistent):**

| Category / variant | `@type` | Notes |
|---|---|---|
| Restaurant (BBQ, diner, Mexican, pizza, Southern) | `Restaurant` + `servesCuisine` | There is no `BarbecueRestaurant`. `FastFoodRestaurant` only if the owner accepts the label. Bars: `BarOrPub` |
| Coffee shop | `CafeOrCoffeeShop` | |
| Bakery | `Bakery` | |
| Plumbing / HVAC / electrical / roofing | `Plumber` / `HVACBusiness` / `Electrician` / `RoofingContractor` | Multi-trade: an array of types |
| Salon and barbershop | `HairSalon` | No `BarberShop` type exists. `BeautySalon` only for broader beauty businesses; add `DaySpa` for salon-spas |
| Auto repair | `AutoRepair` | Tire-led: `["AutoRepair","TireShop"]` |
| Landscaping / lawn care | `HomeAndConstructionBusiness` + `additionalType` (productontology Landscaping / Lawn) | No landscaping type exists |
| Cleaning | `LocalBusiness` | No cleaning type exists |

**Core properties on every business node:** `name`, `url`, `telephone`, `address` (`PostalAddress`; omit `streetAddress` when
hidden), `geo`, `openingHoursSpecification` (from the same `Hours` data the page shows; 00:00-23:59 only for confirmed 24/7),
`image`, `logo`, `sameAs` (Google Maps URL, Facebook, Instagram, other profiles), `priceRange` only when the owner gives prices,
`areaServed` (`City` and `AdministrativeArea` objects) for service-area businesses, `foundingDate` / `founder` only when the
owner confirms them, `hasOfferCatalog` mirroring the visible services, `paymentAccepted` when known, `potentialAction`
(`OrderAction` / `ReserveAction`) pointing at the owner's links when present.

**Never:** `AggregateRating` or `Review` built from Google reviews (all six agree). **Category add-ons:** `hasMenu` and
`Menu`/`MenuItem` (restaurants), `employee` (salon team pages), `FAQPage` mirroring the visible FAQ (see contradiction C2).

### 7.2 Titles, meta, headings
- Two title modes, chosen by the category pack (a real category difference, section 10):
  - **Name-led** (restaurants, salons): `{Name} | {Category} in {City}, {ST}`. H1 = the name, with "{category} in {City}, {ST}" in or right under it.
  - **Service-led** (contractors, auto, landscaping, cleaning): `{Primary service} in {City}, {ST} | {Name}`. H1 = service + town.
- ≤ 60 characters for titles, 140-155 for meta descriptions, built from confirmed facts (service + town + one trust fact + action).
  Never "Home | ...". Subpages: `{Page or service} | {Name}, {City} {ST}` style, per category pattern.
- One H1 per page, logical outline.

### 7.3 NAP and Google Business Profile
- Name, address and phone render from one record everywhere: header, hero, info strip, contact, footer, schema, `tel:`.
- They match the Google Business Profile **character for character**. At publish, the app shows the owner the Places values next
  to the site values and flags any difference.
- **No call-tracking number swaps** in the core (contradiction C4).
- Service-area businesses: hide the street, keep city/state/ZIP, show "Serving {County} County, {ST}" consistently in footer,
  contact and schema, and list towns in `areaServed` and in visible text.
- **Publish checklist for the owner** (all six blueprints): set the new URL as the GBP Website; set the booking or order link as
  the GBP Appointments / Order link; keep GBP categories matching; post the same project photos to GBP.

### 7.4 Content rules for SEO
- Name the town and nearby towns in plain words once each (service-area or visit section). No per-town pages.
- Service names use the phrases people search ("fall leaf removal", "skin fade", "brake repair", "move-out cleaning").
- Optional per-service or per-person pages only with unique, substantial content (category thresholds in section 10).

---

## 8. Data model: shared core vs category extensions

### 8.1 Field provenance (core)
Every field carries `source` (`places | owner | ai | system | stock`), `owner_confirmed` (bool) and, for Places data,
`fetched_at`. This replaces the per-blueprint R/O/P/W/A columns with one machine-readable rule set:
- **Publish requires** `owner_confirmed = true` on name, phone, address and hours, and on every claim field that renders.
  Owner-confirmed facts are the owner's data. Places values are then only used to *re-check* on a schedule, which keeps us inside
  the Places caching limits. (Check the exact current Places terms when building.)
- AI copy carries `review_status` (`draft | approved`). Publish requires `approved`.
- Images carry `source`. `google` blocks publish.

### 8.2 Core record

```yaml
business:
  place_id:            places   # store indefinitely (allowed)
  name:                places → owner confirms
  category:            system   # restaurant | contractor | salon | auto | landscaping | cleaning
  variant:             system → owner confirms   # category enum (see 8.3)
  variants_secondary[]: owner   # e.g. hvac + plumbing, salon + spa, tire + towing
  business_status:     places   # must be OPERATIONAL to generate
  phone: {e164, display}         # places → owner confirms; the only phone used anywhere
  sms_enabled:         owner     # default false
  email:               owner     # lead notifications; display optional
  address: {street, city, state, zip}   # places → owner confirms
  show_street_address: system default by category → owner   # see C7
  geo: {lat, lng}:     places
  timezone:            system   # e.g. America/Chicago; drives open-now
  maps_url:            places/system   # from place_id
  review_url:          system   # write-review link from place_id
  hours:
    weekly: [{day, intervals: [{open, close}]}]
    open_24_7, by_appointment, note, seasonal_note
    holiday_closures: [{date, closed | intervals, note}]
  service_area: {towns[], counties[], radius_miles, note}   # required for service-area businesses
  founded_year:        owner    # "since" and computed years
  ownership_tags[]:    owner    # family_owned | locally_owned | veteran_owned | woman_owned | owner_operated | multi_generation
  owner: {name, title, photo, story_notes}
  people[]: {name, role, photo, bio(ai), specialties[], booking_url, instagram}
  licenses[]: {label, number, state, board}
  insured, bonded:     owner booleans
  certifications[]: {name, logo_permission, proof_url}
  awards[]: {name, year, source_url}
  memberships[]: {name, url}
  languages[]:         owner    # en default; es optional
  payment_methods[]:   owner
  price_range:         owner/derived
services[]: {id, name, group, blurb(ai), detail(ai), featured, has_page,
             price: {mode: none|exact|from|range|quote, amount, min, max, unit, note}, duration_min, photo}
offers[]: {title, detail, starts_on, expires_on}          # removed from HTML after expiry by scheduled rebuild
testimonials[]: {quote, display_name, town, service_id, source, date, permission: true}
faq[]: {q, a, backing_fields[]}                           # an answer with no backing data is dropped
links:
  booking: {provider, url, embed_allowed}
  order_url, reserve_url, gift_cards_url, shop_url, portal_url
  financing[]: {provider, url}
  careers: {enabled, contact}
  social: {facebook, instagram, tiktok, youtube, nextdoor}
media:
  logo, hero, og_image
  gallery[]: {src, alt, caption, kind, service_id, town, source}
  before_after[]: {before, after, caption}
reputation:
  google_rating, google_review_count, fetched_at          # preview, ranking and AI context
  display_mode: link_only | owner_stated | live           # default link_only (C1)
  owner_stated_text                                        # e.g. "Rated 4.9 on Google", owner keeps it current
copy: {hero_h1[], hero_sub[], trust_chips[], about, why_us[], steps[], service_area_intro, cta_final,
       meta: {title, description} per page, alt per image}    # ai, review_status per item
site:
  look, accent_variant, pages_enabled[], slug, pages_project, custom_domain,
  status: new | shown | sold | live, generated_at, last_rebuilt_at
```

### 8.3 Category extensions (namespaced under `ext.<category>`)

| Category | Variant enum | Extension fields (not in core) |
|---|---|---|
| Restaurants | bbq, southern, diner, breakfast, mexican, pizza, coffee, bakery, cafe, other | `cuisine_label`, `menu {sections, items (price, dietary tags, photo), last_updated, pdf_url}`, `highlights[]`, `specials[] {days, time_window}`, `catering`, `events[]`, `private_events`, dining service booleans (dine-in, takeout, delivery, drive-through, reservable, meals and drinks served, outdoor seating...), `delivery_urls[]` |
| Contractors | plumbing, hvac, electrical, roofing, multi | `residential`, `commercial`, `emergency_service`, `after_hours_note`, `free_estimates`, `maintenance_plan {tiers}`, `warranty_text` (owner words only), `pricing_notes`, `storm_insurance_help`, `discounts[]`, `bbb_url` |
| Salons | salon, barber, both | `walk_in_policy`, `walk_in_cutoff_minutes`, `policies {cancellation, late, deposit, new_client}`, `brands_carried[]`, `early_late_slots`, `discounts[]` (kids, seniors, military); services always carry price + duration |
| Auto | general, tire, transmission, european, diesel, towing | `makes_serviced`, `specialties[]`, `warranty {months, miles, nationwide, provider}`, `amenities[]`, `towing {offered, open_24_7, phone}`, `tire_brands[]`, `tire_store_url`, `after_hours_drop` |
| Landscaping | lawn_crew, design_build | `plans[] {frequency, includes, starting_price, notes}`, `seasonal_calendar`, `guarantee_text`, `response_time_text`, `free_estimates`, `commercial_types[]` |
| Cleaning | residential, commercial, both | `price_mode`, `price_ranges[]`, `recurring_frequencies[]`, `add_ons[]`, `checklist {tier: {room: [tasks]}}`, trust booleans (`background_checked`, `same_team`, `no_contracts`, `supplies_included`, `eco_products`, `pet_safe`, `employees_not_contractors`, `licensed_note`), `guarantee {window_hours, remedy}`, `policies`, `facility_types[]` |

### 8.4 Name reconciliation (blueprint name → core name)

| Core | Restaurants | Contractors | Salons | Auto | Landscaping | Cleaning |
|---|---|---|---|---|---|---|
| `name` | name | name | name | name | name | business_name |
| `variant` | subtype | trade | kind | subtype | variant | business_mode |
| `phone {e164, display}` | phone_e164 / phone_display | phone_e164 / phone_display | phone | phone | phone_e164 / phone_display | phone |
| `sms_enabled` | (none) | sms_enabled | sms_enabled | text_phone | sms_enabled | phone_accepts_text |
| `show_street_address` | (always shown) | hide_street_address | (shown) | (shown) | hide_street_address | show_street_address |
| `founded_year` | founded_year | founded_year | founded_year | founded_year | founded_year | year_started |
| `people[]` | owner_names | owner | staff[] | team[] | owner | owner_name |
| `offers[]` | specials[] | offers[] | (discounts) | coupons[] | offer | promo |
| `maps_url` | maps_url | google_maps_url | maps_url | (review_link) | google_maps_url | google_maps_url |
| `reputation.*` | reviews.rating | rating, rating_count | reputation.google_rating | rating, review_count | rating, rating_count | google_rating |

---

## 9. Looks as themes: design tokens on one component set

### 9.1 Token schema
Each look is one token file. Each accent variant is a small override of the same file.

```yaml
color:        # roles, not names; every role used by a component must exist
  bg, surface, surface_alt(band), text, text_muted, heading, link,
  primary, on_primary, secondary, on_secondary, accent_decorative,
  focus_ring, status_open, status_closed, emergency,
  bar_bg, on_bar, footer_bg, on_footer, scrim
type:
  heading_family, body_family, heading_weight, body_weight,
  label_style: none | uppercase | small_caps, scale_ratio, numerals: tabular | proportional
shape:
  radius_sm, radius_md, radius_lg, button_shape: pill | rounded | square | offset_shadow,
  card_style: flat | shadow | bordered | ruled
layout_knobs:  # enumerated; a theme picks values, never writes markup
  hero_style: full_bleed_dark | full_bleed_light | split | boxed | centered
  divider: none | rule | thick_rule | stripe_band | angled_once | wave
  photo_mask: none | rounded | arch
  badge_style: seal | stamp | sticker | pill | plain
  price_list: leaders | cards | table
  section_spacing: airy | standard | dense
  icon_style: line | solid | none
photo_direction: free text used to pick stock/AI images and to brief owners (light, grade, subject)
```

What each blueprint's looks need maps onto these knobs. Examples: "rubber-stamp badge" = `badge_style: stamp`; "dot leaders"
= `price_list: leaders`; "one angled edge per page" = `divider: angled_once`; "arch-shaped masks" = `photo_mask: arch`; "menu-board
price list" = `price_list: leaders` + `card_style: ruled`. A new visual idea that doesn't fit becomes a new enumerated
value in the core, available to every category.

### 9.2 Rules
- Max two font families per look, self-hosted. One button color (`primary`) for all primary buttons.
- **Contrast is validated at build** for every role pair in 5. Decorative colors (`accent_decorative`) may never carry text.
- Owner logo colors can tint `accent_decorative` only, never the text or button roles, unless the tint passes contrast.
- Looks don't move sections. Section order belongs to category and variant (C11).
- A typeset wordmark (from `heading_family`) stands in when there is no logo.

### 9.3 Assignment and the neighbor rule (unified)
1. Default look from category + variant (each blueprint's default table).
2. **Same-category rule:** two clients in the same category within the category radius never share a look. Radii from the
   blueprints: salons ~5 mi, auto ~15 mi, cleaning ~25 mi, contractors (same trade) ~30 mi, landscaping ~30 mi,
   restaurants **not set**: propose ~10 mi. Storefront categories compete locally. Service-area categories compete across a county.
3. **Cross-category same-town rule** (contractors and landscaping state it; the core makes it global): two clients in the same town
   never share both a near-identical token set *and* accent. This matters because several looks are near-duplicates across
   categories (C12). Similarity is scored on palette roles + font pair + radius + hero style.
4. Then rotate accent variant, then the next look.
5. AI copy is also varied per client (seeded phrasing), because looks alone don't stop sites reading the same. Cleaning found
   one template reused verbatim by three unrelated companies.

---

## 10. Where categories genuinely differ (keep out of the core)

Forcing these into the core would make every category worse. The core gives a slot or a generic component. The category
pack owns the content and the rules.

| Area | How the categories differ | What the core provides |
|---|---|---|
| **Primary conversion** | Restaurants: order online, or call. Contractors: call, then schedule (trades) or free inspection (roofing). Salons: book a *person* through a third-party tool. Auto: call, then appointment request; tire quote. Landscaping: quote form (after a site visit), consultation for design-build. Cleaning: quote, text-first. | Action registry + primary selection hook |
| **The offer itself** | Restaurants: a structured **menu** (sections, prices, dietary tags, last-updated) on its own page. Salons: service menu with **price + duration**, per-person booking, "not sure what to book" helper. Cleaning: **tiers + room-by-room checklist comparison + price modes**. Landscaping: **plans** + seasonal calendar. Auto: services grouped by system, **makes serviced**, amenities, warranty band. Contractors: trade-specific services + one **trade module** (maintenance plans, storm/insurance, emergency, generator/EV). | `CardGrid`, `PlanCards`, `Steps`, plain table component; menu, checklist and helper are category components |
| **Location model** | Storefront (restaurants, salons, auto): address, hours, open-now and directions are core content and sit above the fold. Service-area (contractors, landscaping, cleaning): the street is often hidden, and the town list *is* the location. | `Visit` vs `ServiceArea`, `show_street_address`, schema `areaServed` |
| **Hours semantics** | Restaurants need split intervals and kitchen vs bar hours. Contractors and auto towing need explicit 24/7 / after-hours terms. Landscaping says "daylight". Salons need walk-in cutoffs and game-day closures. | `Hours` handles intervals, 24/7, notes and closures; category adds cutoffs or terms |
| **What counts as proof** | Restaurants: story, longevity, menu, press. Contractors: licenses (with board), insured, certifications, warranty. Auto: a concrete warranty term, ASE. Salons and landscaping: photos of work. Cleaning: safety and trust (insured, bonded, background-checked, specific re-clean guarantee). | `TrustStrip` reading a category-supplied ordered list of claim fields |
| **People** | Salons: central (clients book a person, per-stylist pages). Others: optional owner or crew photo. | `PeopleCards` |
| **Price display** | Restaurants: menu prices as given. Barbers: explicit prices. Salons: "from $X" or "priced at consultation". Cleaning: quote-only, starting-at, ranges or hourly. Landscaping: "starting at" + unit + scope. Contractors and auto: never AI prices; owner coupons only. | `price` object with modes; the category sets allowed modes |
| **Forms** | Restaurants: usually none (catering by call/email). Salons: none (booking tool). Contractors: service + town. Auto: vehicle year/make/model + service + preferred day. Landscaping: services + frequency + town. Cleaning: home size + service + frequency. | `ContactForm` with category field sets |
| **H1 and title mode** | Name-led for restaurants and salons (people search the name). Service-led for the four trades (people search the service + town). | `title_mode` setting |
| **Schema type** | See the 7.1 type map. | Type map |
| **Subpage thresholds** | Contractors gallery ≥ 6 photos; landscaping gallery ≥ 9; salons team pages at 4+ people each with a booking link; salon `/services/` past ~15 items; cleaning FAQ page at 8+ questions; service detail pages only with unique owner content. | `pages_enabled[]` computed from category thresholds |
| **Integrations** | Restaurants: Toast, Square, order.online, Resy, ezCater, Goldbelly. Contractors: ServiceTitan, Housecall Pro, lenders. Salons: 19 booking tools (Square, Squire, Vagaro, Booksy, GlossGenius...). Auto: Tekmetric, AutoOps, Kukui, tire storefronts, Synchrony. Landscaping: client portals (Jobber, CopilotCRM). Cleaning: ZenMaid, BookingKoala, Launch27. | Provider detection by domain (one registry, category-scoped lists), link-out by default, click-to-load embed |
| **Tone** | Barbers a bit casual, salons a bit polished; restaurants warm "friendly regular"; trades neighborly and plain. | Shared guardrails (below); category prompt sets voice |

**Shared AI copy guardrails (all six agree):** 6th-8th grade reading level, short sentences, US English, plain and local.
The AI writes no fact it was not given: no years, licenses, warranty terms, prices, response times, 24/7, awards,
"family-owned", or chemicals and products. An empty field means the copy is left out, not hedged. No superlatives without a
sourced award. No dialect caricature. Google review text is private context only. Each piece of copy is marked for owner review.
Shared banned-phrase list (the union of the blueprints): "nestled", "culinary journey", "mouthwatering", "elevate", "look no further",
"best", "#1", "unmatched", "premier", "world-class", "top-rated", "most trusted".

---

## 11. Contradictions between the blueprints

Ordered by impact. Each has a proposed resolution. **C1, C3 and C5 touch compliance and need a decision before building.**

**C1. Showing the Google star rating on published sites. (High: compliance and design.)**
- Restaurants: show rating and count as numbers from Places, refreshed, with an "as of" date. Salons: put the rating in the hero
  trust line, but section 11 of the same file says the safe default is a link with no number.
- Contractors: don't bake it in; refresh it via the Worker or let the owner state it. Landscaping: only if refreshed at publish,
  otherwise omit. Auto: **preview only**, never on published sites. Cleaning: not rendered unless the owner confirms the numbers.
- *Resolution:* the default is `link_only` ("See our reviews on Google"). Option `owner_stated`: the owner types their own line
  and keeps it current. Option `live`: a Worker-fetched number with Google attribution is deferred until the Places caching and
  attribution terms are checked, since it is both a cost per view and a caching question. The salons hero trust line and the restaurants
  reviews intro fall back to founding year, walk-in policy or another confirmed fact.

**C2. `FAQPage` markup.** Contractors recommend it. Cleaning and auto: fine, though no rich results. Landscaping: skip it.
*Resolution:* emit `FAQPage` only when it mirrors a visible FAQ exactly. It is cheap and valid. Never count on rich results.

**C3. Places editorial summary as About fallback.** Restaurants allow the Places editorial summary as a fallback source for the
About story. Landscaping (and the CLAUDE.md spirit) treat it as context only. *Resolution:* context only. Restaurants with no
owner story get the neutral 2-sentence version used by contractors and auto.

**C4. Call-tracking numbers.** Contractors support an optional call-tracking display number (schema keeps the main number).
Auto says skip call tracking because it breaks NAP. *Resolution:* not in the core. One phone everywhere. Revisit only as a paid
add-on with a clear NAP rule.

**C5. "Static map image."** Restaurants, salons, auto and cleaning suggest a static map image. A Google Static Maps image can't
be saved into the site (re-hosting) and hot-linking it exposes an API key on every page. *Resolution:* directions button by
default. Optional click-to-load Maps embed on the Visit/Contact section for storefronts. A non-Google map tile would need its own
terms check.

**C6. Sticky header.** Contractors: hide-on-scroll header. Auto: slim sticky top bar with Call, *plus* a bottom bar. Cleaning:
sticky header ≤ 56 px. Restaurants and salons: not sticky. *Resolution:* one header ≤ 56 px that hides on scroll-down and
shows on scroll-up. The bottom bar is the only always-on action surface.

**C7. Street-address default and field polarity.** Contractors `hide_street_address` (no default), landscaping
`hide_street_address` default **true**, cleaning `show_street_address` default **false**, storefront categories always show.
*Resolution:* one field, `show_street_address`. Default true for restaurants, salons and auto. For the three service categories,
default true only if Places returned a street address *and* the owner confirms a storefront, otherwise false.

**C8. Form spam protection vs no-JS.** Contractors and cleaning: Turnstile + honeypot. Auto and landscaping: honeypot + rate limit,
no CAPTCHA. Contractors also require the form to work with JS off, which Turnstile alone would break. *Resolution:* as in 4.6:
Turnstile when JS runs; no-JS posts accepted with stricter limits and flagged.

**C9. Text-us default.** Cleaning: `phone_accepts_text` defaults **true** for mobile numbers. Contractors, salons and
landscaping: default false, owner opt-in. Places doesn't say whether a number is a mobile, and a wrong `sms:` link is a broken
promise. *Resolution:* default false. The app asks the owner one yes/no question during review, and cleaning puts that
question first.

**C10. Where JSON-LD goes.** Restaurants, contractors and landscaping: "on every page". Salons and cleaning: home page only.
*Resolution:* full business node on Home with `@id`. Other pages reference it (7.1).

**C11. A theme moving sections.** Cleaning's "Front Porch" look moves About up to just after Services. Restaurants say every look
keeps the same section order. *Resolution:* order stays with category/variant. Add a data-driven `story_led` variant flag
(on when owner story + photo + founding year exist) that any category can use, regardless of look.

**C12. Near-duplicate looks across categories, and a name collision.**
- Contractors "Toolbox" (graphite `#1F2933`, amber `#F2A900`, Barlow Condensed, square corners) vs auto "Shop Floor" (graphite
  `#1E2328`, signal yellow `#F2B705`, Barlow Condensed, square corners): nearly identical.
- Contractors "Front Porch" (buttermilk `#FBF5E9`, brick `#9E3B2C`, Zilla Slab, round "since" seal) vs auto "Main Street Garage"
  (buttermilk `#FBF6EC`, brick `#A23B2A`, Zilla Slab, round "since" seal): nearly identical. Salons "Main Street" (Zilla Slab,
  navy/brick, "Since 19XX" seal) is close to both.
- The name **"Front Porch"** is used by contractors (Look B) and cleaning (Look C) for different token sets.
- Landscaping states its fonts don't overlap with the other blueprints, but Plus Jakarta Sans is also in cleaning "Clear Blue
  Professional". Font reuse elsewhere: Fraunces (3 categories), DM Sans (3), Nunito Sans (3), Source Sans 3 (3), Zilla Slab (3),
  Archivo/Archivo Black (2), Inter (2), DM Serif Display (2), Barlow Condensed (2).
- *Resolution:* font reuse alone is fine. Give every look a globally unique id (`contractors.front_porch`, `cleaning.front_porch`
  renamed, for example "Magnolia Porch"). Shift one of each near-duplicate pair: different hero style, radius and accent, and
  ideally a different heading font. Then the cross-category neighbor rule (9.3) catches what is left.

**C13. Palette pairs that fail WCAG AA (checked with the WCAG 2 formula).** Several blueprints state that "every combination
meets AA", but these pairs don't, at least for normal-size text:
- Contractors "Clear Air": teal `#1A9E8F` buttons with white text: **3.3:1** (blueprint says white text). Coral `#E8664D` with white: 3.3:1.
- Contractors "Ridgeline": copper `#B4652E` primary buttons: 4.3:1 with white, 3.5:1 with slate. Neither passes for body-size text.
- Contractors "Toolbox" safety-orange variant `#E8590C`: 3.6:1 with white, 4.1:1 with graphite.
- Restaurants: the button text color is never specified. Chili orange `#EF5B2B` fails with white (3.4:1) and with deep teal (3.5:1).
  It needs near-black text. Also failing with white: tomato `#D9483B` (4.25), terracotta `#C2654A` (4.0), sage `#6E8F72` (3.6),
  dusty blue `#6C88A3` (3.7), coral `#E86A50` (3.2).
- Auto "Clear Diagnostic" teal `#0E9F8A` on white: 3.3:1. Fine as the "open now" dot, not as status text.
- Cleaning says CTAs always use white text, but its own Look B CTA is amber with navy text (7.1:1, passes). This is a wording
  inconsistency only.
- *Resolution:* darken the failing shades or switch to dark label text, and rely on the build-time contrast check (5).

**C14. Small numeric disagreements, settled in the core:** tap targets 44 px (salons) vs 48 px (others) → 48 px. Hero budget
150 vs 200 KB → 150 KB. Nav 3-5 / 4-6 / ≤ 6 / 5-7 / 6-7 items → ≤ 6. Bottom bar always visible (most) vs after hero scroll
(landscaping) → after hero scroll with JS, always without. Viewports 360×740 / 390×750 / 360-412×640-740 → the 6.5 matrix.

**C15. "Auto-hide" of expiring content on a static site.** Contractors, auto, landscaping and cleaning say expired offers,
coupons and promos auto-hide, and restaurants and salons say the copyright year is generated at build. None says how that
stays true after publish. *Resolution:* the daily
scheduled rebuild in 6.4.

---

## 12. Build order this suggests

1. Core record + provenance + linter (the publish gate is what makes every site correct).
2. Core components with one neutral token set, tested at the 6.5 widths, plus the build-time contrast and budget checks.
3. Schema/SEO generator with the type map.
4. Category packs one at a time, starting with the pack whose leads are most common in the first runs.
5. Looks as token files, after C12 and C13 are fixed.
6. Scheduled rebuild Worker and the Places re-check.
