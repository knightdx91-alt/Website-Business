# Design quality 2026: what makes a local-business site look designed, convert, and sell

October 2026. The owner asked: "is there a way to make better websites? Not just colors: layouts, UI, anything that
makes a good-looking and functioning website that would make people want to buy it, and have the app make new designs
on the fly that implement this." This document is the answer. It folds together four research passes (2026 web design
trends; what makes a local-business site produce calls and makes the owner say "I want that"; a rulebook distilled from
the standard design books and guidelines; a structural audit of the best 2025–26 local-business sites and what the AI
builders ship), an audit of our own output, and the changes that shipped from it. Read §5 before touching the
generator again; §6 is the backlog.

Companion documents: `research/design-upgrade-2026.md` (the DNA system this builds on), `research/00-shared-baseline.md`
(template architecture), the category blueprints in `research/`.

## 1. What was wrong with our output (audit, before the changes)

Design sheets of eight designs per category at 390 px and 1280 px (`scripts/design-sheet.ts`):

- Phone first screens were decent: name, what + where, two buttons, an open/closed pill, a trust row.
- Desktop text-only openings left the right half of the screen empty. Big screens looked unfinished.
- Below the opening every category looked the same: a grid of identical cards with the same wrench icon, then
  reviews, then About. Nothing moved; nothing responded to hover; nothing was featured.
- The billboard opening broke words ("WILLO W & WREN BOUTI QUE") because the type scaled with the viewport, not with
  the longest word.
- The photo scrim was a flat dark wash that killed the photo; the snapshot ("tilt") photo treatment read as kitsch.
- Headlines ragged badly on phones; body text used the default `text-wrap`.
- Reviews were plain quotes with no visual weight; the author line had no anchor.

In the words of the builder audit, we shipped "a centered title, six identical icon cards, uniform fade-ins and a
template that forgot who it was for".

## 2. What the research says

### 2.1 How a page earns the sale in the first second

- Visual appeal is judged in 17–50 ms and the judgment is stable (Lindgaard 2006; Tuch/Google 2012). Simple and
  *prototypical* wins: the page must look like its category at a glance ("a plumber in Cullman", not "a template").
- "Design look" is the most-cited credibility cue (46% of 2,684 comments, Fogg/Stanford 2002). Attractive is assumed to
  work (aesthetic-usability effect) until one visible fault breaks it: a misspelling, wrong hours, a wrong phone number.
  In a demo a wrong fact costs more than a plain design.
- The first screenful gets 57% of viewing time, the first two 74% (NN/g eyetracking). The first screen is the page.
- A site makes a business feel real: without one 45% say it feels less real, 46% temporary; 70% prefer a business with
  one; people say they would spend $177 on a website vs $36 on a social shop (DreamHost 2026, n=1,201). 73% of Gen Z
  and 80% of millennials say a site makes a small business more credible (GoDaddy 2024). These are the pitch numbers.
- Personalization persuades through perceived relevance (meta-analysis of 53 experiments, Yeo/Chu/Li 2025); one's own
  name captures attention automatically. Their name, town, hours and photos beat any template polish.
- Touch creates ownership and raises willingness to pay (Peck & Shu 2009); people value what they helped make
  (Norton et al. 2011). Hand them the phone, let them tap Call, let them change one thing (hours, a photo) in the demo.

### 2.2 Above the fold on a phone, in order of evidence

1. Business name + what it is + where, as text, in the first two lines.
2. One primary action as a filled, high-contrast button ≥ 44 px tall. Ghost buttons cost 22% more time and 25% more
   fixations (NN/g); a ghost primary cut clicks 20% in a 10k-visit test.
3. Open-now / today's hours and the street or town. 66% of US consumers have found a business's online info wrong and
   87% pick the business with more complete, accurate info (Data Axle 2026, n=1,000).
4. One proof number: Google rating + count. Purchase likelihood peaks at 4.0–4.7 stars (Spiegel/Northwestern); show it
   from 4.3 with 10+ reviews; never quote review text (trust in reviews fell from 79% to 42%, BrightLocal 2025).
5. A real photo of the place, people or food, never stock, never so big it pushes 1–4 off-screen. Stock photos are
   skipped; portraits of real staff get 10% more viewing time than bios taking 316% more space (NN/g).
6. A visibly secondary second action (Directions / Text). Pages offering call + form convert 4.0% vs 2.6% median
   (Unbounce, 4,372 home-improvement pages).

Not above the fold: carousels (1% of visitors click; 89% of those on slide 1), a mood tagline without the business
type, ghost buttons, hamburger-only navigation (hidden nav roughly halves discoverability), pop-ups, stock people,
"Welcome to our website", more than two equal-weight buttons.

### 2.3 What separates "designed" from "template" (24 real sites + 9 template demos)

1. The headline is a sentence a local would say, with the place in it: "Laramie vehicles love us.", "BBQ Tacos in
   Portland, OR", "JOIN US SUNDAY @ 10:30". Templates lead with abstractions ("Experience the Art of Precision Grooming").
2. Facts sit directly under the opening: address, today's hours, phone, "call or text".
3. One verb, repeated three or four times down the page (Book / Order / Reserve / Request an estimate / Rent); the
   second action is always Call or Text. Never "Learn more".
4. Proof is specific and sourced: 4.7 (8,903) with technicians named; one badge beats a logo row; one big press quote.
5. Services are framed as the customer's problem ("Overheating?") or as a price list ($25 · Classic cut · 30 min, with
   a policy line). Nobody good uses six identical icon cards.
6. One repeatable motif gives the page texture: a glyph marquee (❉ · ★), a refrain that bookends the page, uppercase
   headings with rule lines, numbered chapters.
7. Type with a point of view (Agdasima, Archivo Black + Arbutus Slab, Averia Serif + Orpheus); the templates all run
   Inter and Montserrat.
8. Photos of the actual people, place and work; where photos are weak the good sites go text-first.
9. Short home pages that hand off: six to nine sections; depth lives on Menu/Services.
10. Operational-honesty lines: "11AM – Sold Out (2 or 3pm)", "walk-ins at the bar, bookings in the dining room",
    payment methods per barber. No template or AI draft contains these.

The AI-slop list (500 Show HN sites, April 2026): gradient titles 28%, untouched shadcn 23.5%, centered titles 23.5%,
always-dark with uppercase labels 20%, three or six identical icon cards 20%, frosted glass 17%, the same five display
fonts 16%, stat banners 12%, purple CTAs 11%, numbered 1-2-3 steps 9%. The praised builders did one of three things:
used real business data, tailored structure to the niche, or separated structure → style → copy with vetted components.

### 2.4 2026 trends worth keeping (and the ones to skip)

Keep: type-led openings with fluid headlines (`clamp()` on the viewport, never past the longest word); bento grids with
one dominant cell; dark opening over a light body; serif + sans pairs; once-only scroll reveals (fade + ≤ 30 px, ≤ 500 ms,
ease-out, 30–80 ms stagger, off under reduced motion); hover lift behind `(hover:hover)`; sticky bottom call bar;
pill or square buttons (8 px radius + hard drop shadow reads 2019); proof row under the opening; marquee strips for
restaurants and events (not finance or churches); glass only on the scrolled header; a floor-fade scrim from 50% down;
`text-wrap: balance` on headings and `pretty` on paragraphs; body 16–18 px at 1.5 line height, 60–75 characters.

Skip: autoplay carousels, parallax, infinite loops, heavy glass, purple-blue gradients, animated counters, stat banners,
logo rows, newsletter blocks, blog teasers, "the Figma template look".

### 2.5 The numbers that are not taste (rulebook, enforced where possible)

| Rule | Number | Source |
|---|---|---|
| Text contrast; large text; UI borders, icons, focus | 4.5:1; 3:1; 3:1 | WCAG 1.4.3 / 1.4.11 (checked at build by `resolveTheme`) |
| Tap targets | ≥ 44 × 44 px, ≥ 8 px apart | Apple HIG; WCAG 2.5.8 |
| Body size, line height, measure | 16–18 px; 1.5–1.6; 45–75 ch | Butterick; Bringhurst |
| Heading ratios | h1 2–2.25 × body (hero 2.8–3.6 ×); ≤ 3 levels; adjacent levels differ ≥ 1.2 × or a weight step | Material 3; Williams |
| Tracking | caps +5–12%; ≥ 40 px −0.01 to −0.02 em; never track lowercase body | Butterick; Material |
| Spacing | 8 px scale; between-group gap ≥ 2 × within-group | Material; Williams (proximity) |
| Radii, shadows, icon sets | ≤ 2 radii, ≤ 3 shadows, 1 icon set per site | Williams (repetition); Refactoring UI |
| Primary buttons | ≤ 1 filled per viewport (hero + sticky bar count as one) | Material; Refactoring UI |
| Motion | 100–400 ms UI, exits faster than entrances, nothing > 600 ms but ambient; reduced motion → fades ≤ 200 ms | NN/g; Material 3; WCAG 2.3.3 |
| Navigation | ≤ 7 items, important first and last, visible on desktop, ≤ 4 visible on mobile | NN/g; Krug |
| Forms | ≤ 6 fields, single column, labels above, no placeholder labels, success state with a next step | NN/g; Baymard |
| Reflow | no horizontal scroll at 320 px; survives 200% text | WCAG 1.4.10 / 1.4.4 (the design sheet flags overflow) |
| Dark mode | #121212 not black; text at 87/60/38% white; lighter, less saturated accents | Material dark theme |
| Credibility | address, phone, hours, license numbers, review link on every page; current year; no typos | Stanford guidelines; NN/g trust |

## 3. Per-category structure the research supports

| Category | Primary action | Looked for first | Proof | Opening |
|---|---|---|---|---|
| Restaurant / cafe | Menu, then Order / Call | menu + prices, food photos, hours (65% put off by missing menu items, MGH) | rating + real food photos | photo first; menu board / marquee |
| Trades | Call + short request form | reviews, a price signal, "serves my town / how fast" (70% more likely to call with transparent pricing) | on-site count, license line, job photos | left-aligned, condensed type, utility bar, problem-framed services, bottom bar |
| Salon / barber | Book, then Call | prices, location, photos of work (price is the top factor, 40%) | rating ≥ 4.5 + stylist photos; the price list is the conversion asset | book-first, serif display, centered allowed |
| Auto | Call (quote / appointment) | reviews, services + location, hours; 56% drive farther for a higher rating | rating + owner replies; warranty line | dark, condensed, symptom cards |
| Landscaping / cleaning | Get a quote + Call | prices or ranges, what's included, before/after (a user left in 35 s with no rates shown) | external reviews > on-site quotes | proof strip, photo service blocks, checklist |
| Church | Plan a visit | service times (43%), activities, map | real people; no stars | service time beside the headline; calm |
| Retail | Directions / Call + what's in stock | hours, location, what they carry (73.5% check online first) | rating + shelf photos; accurate hours | window display / billboard; bento "what we carry" |
| Party / event rental | Check my date + Call | availability, price, what's included | (no survey data) show prices and a date check | bright, rounded, real party photos |

## 4. What shipped (October 2026)

### 4.1 Generator polish (`src/generator/css.ts`, `client-script.ts`, `components.ts`)

- Type: `text-wrap: balance` on headings, `pretty` on paragraphs; h1 `clamp(2.1rem, 7vw, 3.6rem)` at 1.06 line height
  with −0.022 em tracking (condensed faces +0.01 em); hero sub-line 1.12–1.4 rem at 1.5; tabular numerals on hours,
  prices, plans, rates and menu rows; `--h1-adv` (an advance-width factor per face class) and `--h1-ch` (the longest
  word in the headline, set by `hero()`) size the billboard, statement and poster headlines so they never break mid-word.
- Buttons lift 2 px on hover with a soft shadow and press to 0.98 on active (one shared ease, 180 ms); the header gets a
  shadow once scrolled (`is-scrolled`).
- Photo scrim: a floor fade (66% → 90% from the top) on phones and a left-to-right 94% → 22% fade on desktop so the
  photo shows on the right half of a wide screen.
- Motion (once only, never under reduced motion, never without `IntersectionObserver`): `.motion .reveal` fades and
  rises ≤ 16 px with a 60 ms stagger capped at five; the opening's lines rise in sequence; a photo opening settles from
  1.04 scale; anything the observer misses is shown after 5 s. Gallery photos zoom 3% on hover; cards lift 2 px.
- Reviews carry a big quotation mark and a lettered avatar; the author line is a flex row.
- Service icons: 18 stroke icons (droplet, flame, snowflake, leaf, sparkles, car, truck, shield, scissors, heart,
  dollar, tag, tooth, paw, book, camera, calendar, bolt) and `serviceIcon(title, fallback)`, which reads the service
  name ("Drain cleaning" → droplet, "AC repair" → snowflake) so a grid never repeats one wrench.
- Screenshot scripts emulate reduced motion so full-page captures are complete.

### 4.2 New page structure (design DNA, `src/generator/dna.ts`, `dna-css.ts`)

- Knob `align` (letter `g`): left or centered opening text, centered only on one-column openings (stack, cover,
  statement, banner, billboard). Older design ids without the letter parse as left.
- `services: bento`: the first service is a featured tile on the brand color, the rest small; the last tile widens
  (`sp2m` on phones, `sp2d`/`sp3d` on desktop) so no row is ragged; fewer than four services fall back to cards.
- `strip: marquee`: the address, phone and today's hours as a scrolling line (the client script clones the track,
  `aria-hidden`, links unfocusable; pauses on hover and focus; wraps statically under reduced motion or without JS).
  Never together with a utility top bar or a proof band.
- `photo: offset`: a color block offset behind the in-flow photo.
- New recipes: general `bento`, restaurant `marquee`, contractor `bento-board`, salon `centered`, auto `parts-wall`,
  retail `window-display`. Category preferences updated (trades and auto stay left-aligned; print may use the marquee).
- Every structure still builds lint-clean on every layout; the legacy id still builds byte-identical to the pre-DNA page
  (`test/dna.test.ts`).

### 4.3 The art director (`src/copy/art-director.ts`)

Instead of rolling a design from the lead id, a Claude call picks the design from what is known about the business.
It reads the same catalog the app's pickers show (the category's 25 looks described by palette words, font kind,
button shape, label style and photo direction; the 25 layouts; the category's recipes; every knob with its values) and
the business (name, kind, town, storefront or service area, services, rating and count, photos and whether they can go
live, hours, booking links, owner proof, their current site's own words, Google's summary, what reviews praise), plus
what neighbors already use (prefer others) and what paying clients have (never). It answers with ids, two or three
alternates, a one-line concept ("Sunday dinner at grandma's, written on the menu"), a plain reason the salesperson can
say to the owner, and a note for the copywriter (tone, what the headline leads with, a length limit for poster type).

- Everything is validated (`settlePick`): unknown looks fall to the alternates, then the pack's best fit; unknown
  layouts to the look's own; unknown recipes and knobs are dropped; the facts win over taste (no owner photo → a
  type-led opening; owner proof → the proof band); asked-for values beat seeded ones in a conflict (a marquee strip
  moves a seeded utility bar out of the way rather than being demoted). The remaining knobs come from the seed, so
  two businesses with the same answer still differ.
- Runs for every new build before the copy is written (`designFor` in `pipeline.ts`), so the copywriter gets the
  direction (`<design_direction>` in `write.ts`, prompt version 5), and for "Try another design" on the lead page
  (`POST /restyle` without a recipe), where the current design is listed as taken. Without a Claude key or on any
  failure the deterministic spread (`chooseLook` → `pickDesign`) still decides and the site builds.
- The concept and reason are stored on the record (`record.designNotes`), shown on the lead page's Design card (web
  and Android 2.56) and handed to the call guide as the first preview feature, so a caller can say why the site looks
  the way it does. Hand-rolled structures (a recipe button, "Same colors, new structure") clear the notes.
- Model: the studio default, Opus 5.5 at low effort; the catalog block is cached, so a call is a few hundred fresh
  input tokens and ~400 out (about a cent). Six live picks took 4–12 s each.

## 5. Rules the generator now holds (keep them when adding things)

1. Every text/surface pair is contrast-checked at build; a failing look does not ship (`resolveTheme`).
2. One filled primary button in the opening; the second action is outlined or text; the phone bar repeats the primary.
3. Name, what + where, one action and one proof item in the first phone screen; the open/closed pill or today's hours
   is in the opening or the strip, never both.
4. No owner photo → a type-led opening (statement, billboard, banner). Google photos are preview-only.
5. Headlines never break mid-word: billboard, statement and poster sizes are capped by the longest word.
6. Motion is once-only, short, staggered, and off under reduced motion; nothing loops but the marquee, which pauses on
   hover and focus and wraps statically under reduced motion.
7. Centered text only on one-column openings; marquee never with a utility bar or a proof band; poster type never with
   a long promise line; a split opening carries the facts, so no strip under it.
8. Services never render as a grid of identical icons: the icon follows the service name, and bento features the first.
9. Reviews are never quoted from Google; the rating and count link out; owner-supplied quotes carry a name.
10. Prices are said per month, never per day, anywhere the company's own plans appear.
11. Web and Android show the same facts: anything added to `detail()` for one app is added to the other.

## 6. Backlog (researched, not built)

Ordered by expected effect on the demo and the sale:

1. **Facts block as section two, always.** The audit's strongest structural finding: address, today's hours, phone and
   "call or text" directly under the opening on every pack (service-area packs have no strip today); food trucks get
   this week's stops there; churches the service time in the top bar, opening and footer.
2. **Price-first service lists where prices exist** (barbers, rentals, menus): `$25 · Classic cut · 30 min` with a
   policy line ("kids and seniors −$5", "final price at the chair"); trades show "from $" only when typed by the owner.
3. **Problem-framed service cards** for auto, trades, lawn and cleaning: a symptom or situation as the title ("AC blowing
   warm?") with one sentence on what we do; the copywriter already gets `heroQuestion`; extend it to service titles.
4. **Operational-honesty fields** in Edit and the copy brief: sold-out time, walk-ins vs booking, texts accepted,
   payment methods, emergency hours, "we come to you". One such line per site is the cheapest authenticity signal found.
5. **Motif bank, one per site, tied to the design id** so neighbors differ: glyph marquee band, a refrain line that
   bookends the page, uppercase headings with rule lines, numbered chapters, a completing-sentence sequence.
6. **Headline bank per category with the place required** and the banned openers ("Experience", "Elevate", "Savor",
   "Premium", "Welcome to") in the copy lint, plus the trunk test: h1 = page name = nav label.
7. **Slop lint in the publish gate**: centered opening + identical card grid, counters, stat banners, more than two
   radii, a stock-looking hero when owner photos exist, uppercase runs over 40 characters, placeholder-looking quotes.
8. **Focal point per photo** (stored x/y → `object-position`) so crops keep the subject at every ratio; one ratio per set.
9. **Type pairs with character per category** audited against the trends report: condensed display + humanist body for
   auto and trades, black grotesque + slab for barbecue and food trucks, display serif + grotesque for dining, rounded
   sans for kids and rentals, Jost/Lato for churches; retire Inter/Montserrat/Poppins/Open Sans as headline faces.
10. **Short home pages**: cap at nine sections and drop any section with no fact from the record (no generic FAQ when
    nothing was answered, no empty gallery), depth on Menu/Services pages.
11. **Demo choreography in the walk-in guide**: finished phone view within five seconds, desktop second; hand them the
    phone; let them change one thing (hours or a photo) before the price comes up.
12. **Per-barber / per-stylist booking links** ("customers book people, not time slots") in the salon team cards: the
    data exists (`ext.salon.team[].bookingUrl`); make it the primary action on the card.

## 7. Sources

Conversion and credibility: NN/g (scrolling and attention; flat UI signifiers; hamburger menus; photos as web content;
touch target size; aesthetic-usability effect; trustworthy design; image-focused design; auto-forwarding carousels;
dark mode; animation duration; menu design; web form design; cards; bulleted lists); Google/SOASTA mobile speed
benchmarks; Google research on first impressions (Tuch 2012); Fogg/Stanford credibility study and guidelines;
Spiegel/Northwestern review research; BrightLocal Local Consumer Review Survey 2025; DreamHost Local Business Trust
Index 2026; Data Axle 2026; HostingAdvice 2024; GoDaddy 2024; Wix/Vistaprint 2025; Mantel homeowner report 2025;
ACHR News (Clear Seas 2024; pricing transparency Dec 2024); Tinuiti home services 2024; Invoca call report 2025; Phorest
2025; Zenoti 2025; SureCritic 2021; MGH restaurant study; Grey Matter church study; Unbounce Conversion Benchmark
Report 2024; Baymard button design; CXL ghost buttons and five-second tests; Online Dialogue sticky CTA tests; Venture
Harbour form length; Yeo, Chu & Li 2025 personalization meta-analysis; Peck & Shu 2009; Norton, Mochon & Ariely 2011.

Rulebook: Laws of UX; Butterick's Practical Typography; Bringhurst via webtypography.net; WCAG 2.2 Understanding
documents; Material 3 token sources and guidance; Apple Human Interface Guidelines; Refactoring UI; Williams, The
Non-Designer's Design Book; Krug, Don't Make Me Think; Müller-Brockmann, Grid Systems; Albers, Interaction of Color;
the 60-30-10 rule for web.

Sites and builders: Cutler & Co, Dhamaka, Ma'ono, Franklin Barbecue, Matt's BBQ Tacos, Where Ya At Matt, Kogi,
Genz-Ryan, Hamilton, Birds Barbershop, Heritage Barbershop, The Lane Salon, Good Vibes Garage, Curt's Auto Repair,
Altizer Lawn & Landscape, Carrington Lawn & Landscape, Tidy Casa, Naturalcare Cleaning, Transformation Church, Fusion
Christian Church, East Fork, Burrito Madre, Air Time Jumps, Rayfuze; Framer, Webflow, Squarespace, Relume, Durable,
10Web, Wix ADI, Jimdo, Booqable templates and reviews; the April 2026 "design slop" sample of 500 Show HN sites and
the designers' responses to it; 2026 trend roundups (Line25, TinyFrog and others).
