# Design upgrade 2026: from "25 layouts" to design DNA

Written Oct 2026 after a design review of what the generator ships today (the 10 example sites on
undergroundassociates.com/portfolio, the 8-layout side-by-side sheet of one auto shop, the generator source in
`src/generator/`), a read of 16 current design/conversion sources and a structural audit of 17 real,
well-regarded independent local-business sites. The owner's complaint is accurate: "the layouts are pretty much
the same: buttons, the way things are laid out, etc." This file says exactly why, what the good sites do
instead, and proposes a knob-based system that produces genuinely different pages from the same markup.

Scope: design and conversion only. Nothing here changes the compliance rules in CLAUDE.md (Google photos never
republished, no quoted Google reviews, advisor/church restrictions).

---

## 1. What a winning local business site does

Fifteen things that hold up across the sources and the real sites. Evidence is cited; where the evidence is only
vendor claims I say so.

1. **A tappable phone number in the first screen, repeated in a persistent place.** UENI's 2026 plumbing review
   reduces good trade sites to four traits, the first being a tappable number "in the first screen"; John the
   Plumber, Mammoth, Miller Auto and Level Lawns all repeat the number in header, hero and footer. Vendor case
   studies claim 30–50% more calls from sticky mobile CTAs; no controlled study exists, so treat the direction,
   not the number, as proven. (UENI, 10Web, Freshy Sites, ClicksGeek.)
2. **One obvious primary action, matched to the category.** Call for trades and auto; Book for barbers and salons
   (NanoGlobals: keep booking on-site via popup/embed, "redirects to Facebook lose them"); Order/Menu for
   restaurants (Upmenu); Plan a visit for churches (Ocean City Church, Meta Church); Schedule an appointment for
   accountants (Appletree). Winning sites do not show four equal buttons.
3. **Strong button signifiers.** NN/g's eyetracking of 71 users: pages with weak signifiers (flat/ghost buttons,
   text-styled links) took 22% longer and 25% more fixations; users "fixated on weak targets and then moved on".
   Ghost buttons are acceptable only on simple, high-contrast pages. Rounded vs square corners: a 2023 JCR study
   claimed +17–55% clicks for rounded; a 2026 high-powered replication (Kohavi et al.) found "minimal to no effect".
   Shape is a style choice; weight is a conversion choice.
4. **Visible navigation on phones when there are 4 or fewer links.** NN/g: hiding navigation cuts discoverability
   "almost in half" and raises task difficulty 21%. Our phone header always uses a hamburger for 5–6 items.
5. **Proof numbers above the fold, not adjectives.** Miller Auto ("386+ Reviews" in the hero), Mammoth ("4.9 from
   84 reviews" badges at the top), John the Plumber ("2,000+ 5-star reviews" as the first trust bullet), Level
   Lawns (stat row: 23+ years, 25k clients). BrightLocal 2025 (n=1,026 US adults): 96% read reviews, 74% check
   two or more sources, and the share saying star rating "doesn't affect" them rose only 4 points. We have the
   Google rating and count in the record and never show them in the hero.
6. **Licence, insurance and warranty stated plainly, early.** UENI calls a licence bar above the nav "the
   highest-value strip of pixels on a trade site". Miller Auto: NAPA 24/24 warranty badge; John the Plumber:
   2-year warranty + "$0 assessment fee" in the hero bullets.
7. **A real face, vehicle or room instead of stock.** NN/g photo eyetracking: users studied real team portraits
   (10% more time than the bios, which took 316% more space) and ignored "jazz up" stock ("jazzed-up = ignored").
   UENI: a photographed sign-written van lets the hero "double as your credentials". Vendor A/B claims of
   +35–105% for real photos over stock are unverified but all point the same way.
8. **Prices and durations shown, not hidden.** Every strong barbershop in the NanoGlobals and Zarla lists shows
   price and duration before the booking step (Heritage: price-first list; South Austin: price bookends each
   service). Level Lawns prints "starting around $15/sqft". Restaurants: menu on or one tap from the home page.
9. **Hours, address and "open now" are content, not chrome.** Prashad prints hours by day on the home page;
   Heritage puts Hours & Contact as section 2; Ocean City Church puts service times directly under the Plan a
   Visit button. Show them once, prominently, in the place that matches the business (storefront: high; service
   area: footer + visit).
10. **Named towns in indexable text.** UENI ("the cheapest local SEO move available"), Mammoth (15 cities), Miller
    (24 towns), Highlands (inline city links). We do this already (service area section); keep it.
11. **One idea carried through everything.** NanoGlobals' strongest observation: the best shops "define one
    concept" (Birds: "Haircuts for all y'all", Scotch Pine: "Barbering with Intention", Electrified Garage:
    "Repair, engineered for the real world") and carry it into service names, photos and copy. That is what reads
    as "designed"; it is not a layout feature.
12. **Section order follows intent, not a template.** Birds: hero → 3 reasons → award → intro → services →
    reviews → locations. Heritage: hero → hours/contact → location → prices → barbers → reviews. Appletree: hero →
    logos → "wrong way / our way" → industries → services → stats → 25 testimonials. The order is a decision per
    business type; ours is fixed per pack and never varies by layout.
13. **Mobile first in fact, not just in CSS.** Global mobile share is ~62% (StatCounter via Statista, Q2 2025); US
    desktop is still 56–59% overall but local-intent searches are overwhelmingly phone. Google/SOASTA's bounce model:
    1 s → 3 s raises bounce probability 32%. Our sites are already fast; keep the hero image the only heavy asset.
14. **Trust concentrated near the CTA.** Mammoth and John the Plumber put badges beside the booking button;
    Highlands puts Google/Yelp badges under the mid-page estimate CTA. Our trust list sits above the buttons, which
    is fine; the problem is its content ("Family-owned" alone).
15. **Design-forward does not mean motion.** Studio Meyer's 2026 reality check: bento, dark mode and token systems
    shipped; kinetic type, glassmorphism, blobs and 3D "almost never ship on conversion-critical flows". Line25
    2026: oversized type "has replaced stock hero images for many design-forward brands"; brutalist/anti-template
    looks are a reaction to the "homogenized Figma template aesthetic". Variety should come from structure, type
    and colour application, not effects.

---

## 2. Where ours fall short

Read against the 10 example screenshots (`app/public/examples/*.jpg`) and the 8-layout sheet
(`sheet-phone.png`, `sheet-desktop.png`). The generator is technically excellent (AA contrast, lint, schema,
speed). The sameness is structural, and it is in the first two screens, which is where people judge.

### 2.1 The hero is one component with ten skins

Every example, every layout, every category renders the same vertical stack, in the same order, from
`hero()` in `components.ts`:

```
eyebrow (BUSINESS NAME or "TYPE · CULLMAN, AL")
H1 ("<Service> in Cullman, AL", or the name for storefronts)
one-sentence sub
[● Open now · closes 5 PM]  pill
✓ trust  ✓ trust  ✓ trust
[ Call (256) 555-0104 ]      filled, full width
[ Get a free estimate ]      outlined, full width
```

On the phone sheet, 8 "layouts" of Crossroads Auto Care show this exact block 8 times; the only differences are
left vs centre alignment, a frame (retro), a circle photo (wave) or a slanted edge. On desktop the `split`,
`classic`, `poster`, `minimal` and `overlap` columns put the identical block in the left ~55% of the viewport.
That is ornament variance, not structure variance.

Specific problems in that block:

- **H1 is the same sentence for every competitor.** Two auto shops in Cullman both get "Auto Repair in Cullman,
  AL"; the name is demoted to a 12px eyebrow. Storefronts get the name as H1, so the name appears twice within
  400px (header + H1: Magnolia Table Cafe, Willow & Wren, Cedar Creek).
- **Trust lists are thin or generic.** "Family-owned" alone (Magnolia, Willow & Wren); "Gathering since 1923 ·
  Watch online" (Cedar Creek). None of the ten shows the Google rating or review count, years in business, or a
  licence number, which the record often has.
- **The secondary action is a ghost button**, on dark photo heroes with a 1px border (Ridgeline, Ivy & Iron,
  Main Street Tees). NN/g's finding on weak signifiers applies directly. For contractors the ghost is "Get a free
  estimate", which is the action we most want.
- **Three stacked full-width buttons** on Spotless Cottage, Willow & Wren and Cedar Creek push the hero past one
  phone screen before any content.
- **The open-status pill appears twice in the first screen** (hero and info strip), and the phone number three
  times (header button, hero button, strip) with no hierarchy between them.

### 2.2 The second screen is identical on all ten sites

`infoStrip()` always renders: pin + address, phone + number, clock + "Open now · See all hours", then chips. Same
icons, same order, same 52px rows, same 20px gutter. On the sheet, the strip is the one element that does not
change across the 8 layouts (only its background does). A viewer scrolling two sites sees the same thing at the
same scroll position.

### 2.3 Buttons are one object

`.btn`: min-height 52px, 700 weight, leading icon, `flex:1 1 100%` on phones. Variants are only radius
(pill/rounded/square) and fill (primary/secondary/ghost). No size scale, no text-link variant, no inline pair, no
trailing-arrow variant, no block-with-shadow variant. Because the same component also builds the CTA band, the
visit section and the form submit, every page has 8–12 identical pills.

### 2.4 Section anatomy and rhythm never change

Every section: `.section__label` (small caps) → `.section__title` → `.lead` → a 1-column grid of `.card`s →
`.btns`. Backgrounds alternate bg/band/surface. The sheet shows all 8 layouts with the same order (Services →
How it works → Reviews → About → Visit → FAQ → CTA → Footer) and the same copy headings ("What we fix", "No
surprises", "What customers say"), because the order and headings come from the pack, not the design. Layouts
restyle cards (rules, numbers, outlines) but a card grid is still a card grid.

### 2.5 Type scale is one scale

`h1 clamp(2.1rem,7vw,3.6rem)`, `h2 clamp(1.7rem,4.6vw,2.5rem)`, sub `clamp(1.1rem,3.2vw,1.35rem)`, measure 38rem.
Layouts nudge the H1 up (poster, minimal) or add uppercase, but the ratio between eyebrow, H1, sub and body is
fixed, so the hero always has the same "two-line headline, two-line sub" silhouette. Looks vary the font family
(102 families), which is real variety, but the owner is not wrong that the sites feel the same: family changes are
low salience next to structure.

### 2.6 Imagery is binary: photo-with-gradient or flat colour

`hero--photo` lays a gradient of `heroBg` at 0.74 → 0.92 over the picture, so the photo is mostly hidden; without
a photo the hero is a flat fill. There is no pattern, texture, illustration, map, monogram, duotone or framed
treatment. Since Google photos cannot ship, most published sites get the flat fill, and a flat fill plus the same
stack is the most templated outcome possible.

### 2.7 Header, footer, bottom bar: one each

Header: name left, phone button, hamburger. Footer: three columns (name/address, hours, links) + legal. Bottom
bar: three icons. All ten identical apart from the phone-button radius.

### 2.8 Conversion problems, beyond sameness

- Hamburger on phones with 5–6 links (NN/g: show up to 4).
- The record's rating and review count never shown; the strongest proof element is missing.
- Ghost secondary CTA (see 2.1).
- No price or duration on salon/barber previews (we have a price list component; it is below the fold and
  rendered as cards or leaders, never as the hero of the page as real shops do).
- No "Text us" as a first-class action on trades even when SMS is on; cleaning gets it as a third stacked button.
- Church sites get the same three-icon bottom bar and "Open now" semantics as a shop.

---

## 3. Design DNA: a knob-based system

The multi-brand design-system literature (Maersk, Infinum, master.dev) divides variation into three mechanisms:
**tokens** (values: colour, radius, spacing, type), **configuration** (predefined options, e.g. "banner at top or
bottom") and **composition** (which blocks, in what order). Our looks are tokens; our layouts are CSS-only
configuration over fixed composition. What's missing is the composition axis and a small set of high-salience
configuration knobs. Infinum's lesson applies: "The components themselves stayed the same, but the token values
changed across brands" was enough for one company's four brands; it is not enough for 300 unrelated businesses in
one county.

Proposal: replace the single `layout` id with a **DNA record** of 14 knobs. Each knob has 3–8 values. Five knobs are
*high salience* (they decide whether two sites look alike): hero structure, colour application, type scale/case,
service presentation, image treatment. The rest are *low salience* flavour. `pickDesign` picks a DNA, not a layout,
and must differ from every sold/live site in the same category within ~25 miles on at least 3 of the 5
high-salience knobs.

### 3.1 The knobs

**K1. Hero structure** (high salience; 8 values)

| id | structure | needs |
|---|---|---|
| `statement` | type only, giant H1 (2 words/line), one button, facts row; no image | nothing |
| `stage` | full-bleed photo, text pinned bottom-left, thin scrim only behind text | a good photo |
| `split` | text left / image right (or mirrored); image can be photo, pattern, map or illustration | any visual |
| `card` | photo top, card overlapping it with name + action | photo or pattern |
| `stacked` | centred text, then image full width below (editorial) | any visual |
| `billboard` | business name huge, service line small, info row under it; brand-first, for storefronts | nothing |
| `mapcard` | address card + static map/illustrated locality on one side, name and actions on the other | lat/lng |
| `listfirst` | hero *is* the price list / menu / service times with the name as masthead | prices/menu/times |

**K2. Hero content order and H1 strategy** (config; 4 × 4)

Order: `classic` (eyebrow, H1, sub, status, trust, buttons) · `proof-first` (rating row, H1, button, sub) ·
`action-first` (H1, buttons, trust; no sub) · `minimal` (H1, one button, one text link).
H1: `service+town` (current) · `name` · `promise` (from copy brief, e.g. "Fixed right the first time, in Cullman")
· `question` ("Need a plumber in Cullman tonight?"). The name must appear exactly once in the first screen.

**K3. Nav style** (5)
`hamburger` (current; only when > 4 links) · `visible` (3–4 text links + phone, no hamburger) · `centered`
(brand centred, links split) · `utility+bar` (thin bar above: licence #, hours, "Se habla español"; then header) ·
`transparent` (header over hero, solid on scroll).

**K4. Buttons** (shape 5 × weight 5 × arrangement 5)
Shape: pill · rounded · square · cut-corner · underline-link.
Weight: filled · outlined (only on light, quiet backgrounds) · text+arrow · block-shadow (hard offset shadow) ·
tonal (light tint of primary).
Arrangement: stacked full-width (current) · inline pair · primary + text link · single jumbo · primary + phone
number as plain large text.
Rule: the category's primary action is always `filled` or `block-shadow`; a second filled button is allowed when
the two actions are genuinely different channels (Call / Text, Call / Book).

**K5. Info strip** (6)
`rows` (current) · `ticker` (one line, dot-separated, address · phone · open now) · `factcard` (bordered card:
today's hours, address, map link, rating) · `inhero` (badges inside the hero; no strip) · `header-bar` (merged into
K3 utility bar) · `none` (details in Visit + footer only; for service-area businesses).
Rule: open-status is rendered once per page above the fold.

**K6. Section rhythm and dividers** (rhythm 5 × divider 7)
Rhythm: `bands` (alternating, current) · `continuous` (one background, rules between) · `chapters` (numbered
01–06 with big numerals) · `proofband` (all light except one dark proof section: reviews + numbers) · `sidebar`
(sticky headings left on desktop).
Divider: none · hairline · thick rule · slant · wave · ornament (restaurant/retail) · perforation/ticket (print).

**K7. Service presentation** (high salience; 8)
`cards` (current) · `list` (title + one line, rules) · `table` (price leaders, duration column) · `tiles` (big
colour/photo tiles, 2-up) · `accordion` (for 6+ services) · `ledger` (numbered, two-column) · `menuboard`
(sections with items and prices, restaurant) · `chips+detail` (chip cloud, tap expands).

**K8. Image treatment** (high salience; 8)
`fullbleed` · `framed` (mat + hairline) · `duotone` (two palette colours; rescues weak owner photos) · `cutout`
(circle/arch mask) · `tilt` (polaroid, retail/print only) · `pattern` (category SVG pattern tinted by palette) ·
`illustration` (owned spot illustrations per category, recoloured) · `none` (colour block + type).
Rule: food photos are never duotoned; people are never patterned over.

**K9. Type scale and case** (scale 4 × case 4 × pairing role 4)
Scale ratio: tight 1.2 · standard 1.33 · dramatic 1.6 · poster 2.0 (H1 up to 14vw on phones, clipped at edge is
allowed). H1 case: sentence · uppercase · lowercase · small caps. Pairing: display+grotesk · serif+serif ·
condensed uppercase + humanist · mono eyebrows + sans. Measure: 32 / 38 / 48rem.

**K10. Spacing / density** (4)
compact (gutter 16, section 40) · standard (20/64) · generous (24/96) · editorial (32/128, narrow measure).

**K11. Colour application** (high salience; 7)
`darkhero` (current A) · `alllight` · `alldark` · `split` (hero half dark/half light) · `accentband` (light page,
one loud brand-colour band mid-page) · `paper` (tinted bg everywhere, white cards) · `brandpage` (brand colour is
the page; white/black type; poster feel).

**K12. Footer** (5)
`columns` (current) · `bigname` (wordmark at 20vw, one line of details) · `oneline` · `map+hours` (map thumb,
hours table, address) · `contactcard` (one bordered card with call/text/directions).

**K13. CTA placement** (5)
`bottombar` (current, 3 icons) · `floatcall` (single round call/book button) · `scrollup-strip` (slim call strip
appears on scroll-up, NN/g-style) · `hero+band` (no sticky; hero, mid-page band, footer) · `inline` (a one-line
CTA after every second section).

**K14. Motif** (low salience; 10)
none · rules · stamp/seal · stripes · checker · grain · leaf/topo · halftone · ledger lines · arch/stained glass.
Motifs come from the category list (section 4), never cross categories.

Existing look tokens (palette, fonts, radius, `knobs.card/badge/label/divider/spacing`) stay as tokens under this.
The current 25 layouts become presets of K1/K5/K6/K7/K8/K11/K12/K13 so nothing sold changes until restyled.

### 3.2 Combinations to avoid

- `statement` or `billboard` hero + `none` strip + `oneline` footer: a storefront with no address above the fold.
- `outlined`/`text+arrow` for the primary action; any `outlined` button on `stage`/`fullbleed` photos.
- `poster` scale + `compact` density + serif body: unreadable on 360px.
- `alldark` or `brandpage` for finance, church, cleaning (trust reads light); `duotone` on food or on people.
- `wave`, `slant`, `blob`, `tilt`, stamps for tax/finance and advisors; `ticket`/`checker` outside restaurant,
  print, auto.
- `mapcard` when `showStreetAddress` is false (home-based businesses).
- `accordion` with fewer than 5 services; `table` without prices; `menuboard` without a menu; `listfirst` without
  prices/times.
- `bottombar` + `floatcall` together; `bottombar` on churches (use Plan a visit / Directions / Watch).
- `hamburger` when the nav has 4 or fewer items.
- Two sites in the same category within 25 miles sharing the same K1 *and* K11 (the two most visible knobs).

### 3.3 How many distinct results

High-salience space alone: K1 8 × K7 8 × K8 8 × K9 scale/case 16 × K11 7 ≈ 57,000 combinations; after the avoid
rules roughly a third survive, call it 18,000. Low-salience knobs multiply that by thousands. The useful number is
smaller: people perceive two pages as different when they differ on three or more of the five high-salience knobs.
With the "differ on ≥3 of 5" rule, a category can hold **well over 100 mutually distinct sites in one town**, and
Cullman has 6–20 leads per category. Practically: ship **8–12 curated recipes per category** (a recipe fixes the five
high-salience knobs and allows the rest to be drawn), times 25 looks, and no two Cullman clients in a category will
look related. That beats the current 625 "designs" because today all 625 share K1 content order, K5, K7 (card grid
in 20 of 25), K12 and K13.

### 3.4 Hero structures (phone, ~360px)

```
statement                  stage                      split (phone stacks)
+--------------------+     +--------------------+     +--------------------+
| Name        ☎ Menu |     | [photo full-bleed  |     | Name   Services ☎  |
|                    |     |                    |     |                    |
|  NEED A            |     |                    |     | Honest auto repair |
|  PLUMBER           |     |                    |     | in Cullman since   |
|  TONIGHT?          |     | ░░░░ scrim ░░░░░░░ |     | 1998.              |
|                    |     | Ridgeline Plumbing |     | ★ 4.8 · 212 reviews|
| ★4.9 · 86 · Lic #  |     | Same-day, Cullman  |     | [ Call ] [ Text ]  |
| [ Call (256)…    ] |     | [ Call ] Text us → |     | +----------------+ |
| Text us →          |     +--------------------+     | | photo/pattern  | |
+--------------------+                                | +----------------+ |
                                                      +--------------------+

card (overlap)             stacked (editorial)        billboard
+--------------------+     +--------------------+     +--------------------+
| +----------------+ |     |   SOUTHERN COOKING |     | MAGNOLIA           |
| |  photo         | |     |  Magnolia Table    |     | TABLE              |
| |        +-------+-+     |  Biscuits daily,   |     | CAFE               |
| +--------| Name  | |     |  plate lunch.      |     | ———————————————    |
|          | ★ 4.7 | |     |  [ View menu ]     |     | Southern cooking · |
|          | [Call]| |     |  Call · Directions |     | downtown Cullman   |
|          +-------+ |     | +----------------+ |     | Open till 2 · 210  |
| 210 Example St ·   |     | | photo / pattern| |     |   Example St       |
| open till 2 PM     |     | +----------------+ |     | [Menu]  [Call]     |
+--------------------+     +--------------------+     +--------------------+

mapcard                    listfirst (barber / menu / service times)
+--------------------+     +--------------------+
| Willow & Wren      |     | IVY & IRON  ☎ Book |
| +----------------+ |     |--------------------|
| |  ·  ·  map  ·  | |     | Haircut      $28   |
| |   ·   ●  ·     | |     | Skin fade    $32   |
| |  ·    ·    ·   | |     | Beard trim   $15   |
| +----------------+ |     | Hot towel    $30   |
| 120 Example Ave SE |     |--------------------|
| Open till 5:30     |     | Walk-ins welcome   |
| [Directions][Call] |     | [ Book online ]    |
+--------------------+     +--------------------+
```

### 3.5 Whole-page rhythms

```
A. bands (today)        B. chapters             C. proofband            D. continuous + sidebar (desktop)
hero (dark)             hero (statement)        hero (light, stage)     | hero split
strip                   01 — Services ledger    ticker strip            |-----------------------------
Services cards (light)  02 — How it works       Services tiles          | Services | list with rules
Steps (band)            03 — Reviews            ■ dark proof band:      |          |
Reviews (light)         04 — About              ★4.9 · 212 · lic · yrs  | How      | 4 steps inline
About (band)            05 — Visit + map        + 3 quotes              |          |
Visit (light)           06 — FAQ                About (light)           | Reviews  | one big quote
FAQ (band)              CTA = chapter 07        Visit map+hours footer  | Visit    | hours table + map
CTA band (dark)         bigname footer          (no CTA band)           |----------------------------
columns footer                                                          | oneline footer + float call
```

---

## 4. Category defaults

Each category gets allowed and default values; `pickDesign` draws within them. Column "never" overrides any look.

| Category | Hero (K1) | Service (K7) | Colour (K11) | Type (K9) | Image / fallback (K8) | CTA (K13) | Motif | Never |
|---|---|---|---|---|---|---|---|---|
| Restaurants & cafes | stage, billboard, listfirst (menu), card | menuboard, table | paper, darkhero, brandpage | display serif/slab, dramatic; small caps eyebrows | fullbleed true-colour; fallback gingham/tile pattern, big-type specials | hero+band, bottombar (Call/Menu/Directions) | ornament, checker (diners) | duotone food, corporate blue, stat counters, steps |
| Contractors (plumbing, HVAC, roofing, electrical…) | statement, split (van/owner), stage | tiles, list | accentband, darkhero, split | condensed uppercase + humanist, dramatic | owner/van photo; fallback blueprint grid, bold colour block | bottombar (Call/Text/Quote), scrollup-strip | stripes, rules | editorial serif, wave, pastel, outlined Call |
| Salons & barbers | listfirst (prices), stage (interior), card | table (price + duration), tiles | alldark, paper, alllight | tall condensed or elegant serif, poster | interior/chair photo; fallback barber stripe, halftone portrait cutout | floatcall (Book), bottombar (Book/Call/Directions) | stripes, rules | "How it works", stat counters, ghost Book |
| Auto repair | statement + proof-first, split | tiles, accordion (10+) | darkhero, accentband, split | heavy grotesk, uppercase | bay/vehicle photo; fallback tread/hex pattern, warranty badge block | bottombar (Call/Schedule/Directions) | stripes, checker, stamp (warranty) | serif editorial, wave, pastel |
| Landscaping & lawn | stage (big lawn), split, card | tiles with season tags, list | alllight, accentband (green) | rounded sans or condensed, standard | before/after pairs; fallback leaf/topo pattern, green colour blocks | bottombar (Call/Quote/Text) | leaf/topo | alldark, poster uppercase |
| Cleaning | split, stacked, statement | table (standard/deep/move-out checklist), cards | alllight, paper, accentband | geometric sans, standard, lowercase ok | team photo; fallback dots/bubbles pattern, soft colour blocks | bottombar (Call/Text/Quote) | dots, rules | darkhero, uppercase shouting, 3 stacked buttons |
| Print & sign shops | billboard, statement, stacked | tiles (work samples), ledger | brandpage, accentband, alldark | poster scale, display grotesk; type is the product | work photos; fallback halftone, registration marks, CMYK blocks | hero+band, floatcall | halftone, perforation | serif editorial, pastel |
| Retail (boutique, gift, antique, thrift, florist, feed, furniture) | mapcard, stage, stacked | tiles ("what we carry"), chips | paper, alllight, brandpage (boutique) | fashion serif or quirky display, dramatic | storefront/shelf photos; fallback tilt frames, ornament, map | bottombar (Directions/Call/Shop) | ornament, tilt | steps, forms, uppercase heavy |
| Tax & finance | split (calm), statement (quiet), stacked | list with rules, accordion, ledger | alllight, paper | serif + sans, tight/standard, sentence case | people photo (owner); fallback ledger lines, map, monogram | hero+band, scrollup-strip | ledger lines, hairline | alldark, poster, wave/slant/blob, stamps, bottombar, "Open now" pill (show office hours instead) |
| Churches & nonprofits | stage (building/people they supply), statement with service times, mapcard | list (ministries), accordion | alllight, paper, accentband (burgundy/forest) | warm serif, standard | fallback arch/stained-glass pattern, map; never Google photos | hero+band; bottombar only as Plan visit / Directions / Watch | arch, rules | call-first bar, stat counters, price tables, urgency, "Open now" |

Two cross-category rules: service-area businesses (contractors, landscaping, cleaning) default to K5 `none` or
`inhero` and never `mapcard`; storefronts (restaurant, salon, auto, retail, finance, church) must show address and
today's hours in the first two screens.

---

## 5. When photos are bad or missing

Most leads have only Google photos, which previews may show but published sites cannot. Today the published fallback
is a flat colour block behind the same stack. Concrete replacements, in order of preference:

1. **Statement / billboard hero.** Type is the image. Line25 2026: oversized type "has replaced stock hero images";
   the Electrified Garage hero is a headline, an eyebrow and a diagram, no photo. Needs K9 poster/dramatic scale and
   an H1 strategy that is not "Service in Town".
2. **Category pattern library** (owned SVG, tinted by the look's palette, 12–20 patterns): gingham, tile, diner
   checker (restaurants); blueprint grid, pipe/stripe (contractors); barber pole, halftone (salons); tread, hex,
   gauge (auto); leaf, topographic lines (landscaping); dots, bubbles (cleaning); halftone, registration marks
   (print); ornament, ticking stripe (retail); ledger lines, cross-hatch (finance); arch, stained glass, hymnal
   rules (church). Used as K8 `pattern` in `split`, `stacked`, `card` heroes and as section motifs.
3. **Map as image.** Storefronts have lat/lng. Options: Google Maps Embed API in the Visit section (free, allowed
   to display; key restricted by referrer), and for the hero a self-drawn locality card (pin, street name, "4 min
   from the courthouse", distance to a landmark) so nothing from Google is stored.
4. **Big numbers.** Rating, review count, years, number of services, "open 6 days", as a 2×2 stat block with giant
   numerals (Level Lawns, Electrified Garage). Only from facts in the record.
5. **Colour blocks and monogram.** `split` hero with a solid block carrying the initial or the SVG favicon monogram
   at 40vw, or `brandpage` with the name set in the look's display face.
6. **Spot illustrations.** One set per category (6–8 flat SVG illustrations: a wrench and gauge, a plate and fork,
   a mower, a comb and shears, a calculator and folder, a steeple), recoloured per palette. Made once; never
   stock, never AI-generated likenesses of people.
7. **Photo rescue for owner phone pictures.** Crop to subject, `duotone` or `framed` + grain so a mediocre picture
   looks intentional (not for food or faces: those stay true colour, framed).
8. **Preview-to-publish swap with a prompt.** Previews keep showing the Google photo; publish swaps in the
   recipe's fallback automatically and the Edit screen says "Send us one photo of your shop front and it goes here"
   (already a to-do; make it the first card, not a footnote).
9. **Curated stock as texture only.** If stock is ever used: per-category, cropped/blurred/duotoned behind type,
   never a smiling model as "the team".

---

## 6. Priority plan

Order by visible difference per day of work. Effort is a rough estimate for one developer with the existing
test harness (`test/designs.test.ts`, `scripts/design-sheet.ts`).

| # | Build | Why first | Effort |
|---|---|---|---|
| 1 | **K1 hero structures (8) + K2 content order and H1 strategy**, including name-once rule and rating/count/licence/years in the trust row | The first screen is 80% of "they look the same"; `hero()` is one function | 1–2 weeks |
| 2 | **K5 info strip variants + show open-status once**; `ticker`, `factcard`, `inhero`, `none` | The second screen is currently identical on every site | 3–4 days |
| 3 | **K4 button system**: weight + arrangement knobs; retire ghost for primary/photo contexts; Call + Text as a filled pair when SMS is on | Direct conversion fix (NN/g signifiers), visible everywhere | 2–3 days |
| 4 | **K7 service presentation** (list, table with duration, tiles, accordion, ledger, menuboard, chips) | Second-biggest structural block; salons/restaurants need table/menuboard to match real shops | 1 week |
| 5 | **K8 image treatments + pattern library + statement fallback** | Removes the flat-colour-block published look | 1–2 weeks (patterns are the long pole) |
| 6 | **K11 colour application** (alllight, alldark, split, accentband, paper, brandpage) through `resolveTheme` with AA checks | Changes the whole page's feel with existing tokens | 3–4 days |
| 7 | **K3 nav**: visible 3–4 links on phones, utility bar for trades (licence, hours) | NN/g discoverability; cheap | 2–3 days |
| 8 | **K9 type scale/case knob** (4 ratios × 4 cases) | Silhouette variety on top of the 102 families | 2 days |
| 9 | **K12 footer + K13 CTA placement** variants; church-specific bar | Last-screen sameness; church correctness | 2–3 days |
| 10 | **Recipes + distinctness rule in `pickDesign`** (≥3 of 5 high-salience knobs differ from any sold/live site in category within 25 miles); migrate the 25 layouts to presets; update `design-sheet.ts` to render DNA | Makes the variety systematic and protects sold clients | 3 days |
| 11 | **Per-pack heading variants** ("What we fix" / "Services" / "What we do for your car" / "The work"), 3–4 per section, picked by DNA | Cheapest change with real effect on sameness | 1 day |
| 12 | **Copy brief hook: one concept per site** (a 3–6 word idea the AI carries into H1, service intros and CTA) | What actually makes real sites feel designed (NanoGlobals) | 2 days, plus prompt tuning |

Items 1–3 alone (about two weeks) would make the ten portfolio examples read as ten different sites. Items 1–6 is
the full visual change; 7–12 lock it in.

Measure it: re-render the 8-layout sheet as an 8-recipe sheet for the same auto shop and a 10-recipe sheet across
categories; the test is whether someone who has not seen the code can tell they come from one generator.

---

## 7. Sources

Design and conversion guides (2024–2026):

- UENI, Plumbing Website Design: 20 Real Examples (2026): https://ueni.com/blog/plumber-websites/
- NanoGlobals, Barbershop Websites: 20 Design Examples (2026): https://nanoglobals.com/barbershop-websites/
- Zarla, 20 Fresh Barbershop Website Examples for 2025: https://www.zarla.com/guides/barbershop-website-examples
- 10Web, Plumbing website examples (2025): https://10web.io/blog/plumbing-website-examples/
- Freshy Sites, Top 25 auto repair websites of 2026: https://freshysites.com/blog/top-auto-repair-websites/
- Jobber Academy, Lawn care website design (2025): https://www.getjobber.com/academy/lawn-care/lawn-care-website-design/
- Upmenu, 25 Best Restaurant Websites (2025): https://www.upmenu.com/blog/best-restaurant-websites-design/
- ChurchTrac, The Best Church Websites of 2025: https://www.churchtrac.com/blog/the-best-church-websites
- Levitate, Make Your Small CPA Firm Website Stand Out in 2026: https://www.levitate.ai/blog-posts/make-your-small-cpa-firm-website-stand-out-in-2026
- Elegant Themes, How To Design A Hero Section (2025): https://www.elegantthemes.com/blog/design/how-to-design-a-hero-section
- Line25, Web Design Trends 2026: https://line25.com/articles/web-design-trends-2026/
- Studio Meyer, Web design trends 2026 reality check: https://studiomeyer.io/en/blog/webdesign-trends-2026-reality-check
- ClicksGeek, lead-generation site advice for service businesses: https://clicksgeek.com/landing-page-design-for-service-businesses/
- Synup, high-converting local business website: https://www.synup.com/en/how-to/create-high-converting-local-business-website

Research and measurement:

- NN/g, Flat UI Elements Attract Less Attention and Cause Uncertainty: https://www.nngroup.com/articles/flat-ui-less-attention-cause-uncertainty/
- NN/g, Hamburger Menus and Hidden Navigation Hurt UX Metrics: https://www.nngroup.com/articles/hamburger-menus/
- NN/g, Photos as Web Content: https://www.nngroup.com/articles/photos-as-web-content/
- NN/g, Sticky Headers: 5 Ways to Make Them Better: https://www.nngroup.com/articles/sticky-headers/
- BrightLocal, Local Consumer Review Survey 2025: https://www.brightlocal.com/research/local-consumer-review-survey-2025/
- Think with Google / SOASTA, mobile page speed benchmarks: https://thinkwithgoogle.com/data/page-load-time-statistics
- Biswas, Abell & Chacko (JCR 2023) via Science Says, rounded CTA buttons: https://app.sciencesays.com/p/make-cta-buttons-curvy ; replication critique (Kohavi et al., 2026 preprint): https://arxiv.org/pdf/2512.24521v2
- StatCounter via Statista, mobile share of web traffic: https://www.statista.com/statistics/241462/mobile-share-of-us-web-traffic ; https://gs.statcounter.com/platform-market-share/desktop-mobile/united-states-of-america

Design-system variety (tokens, configuration, composition):

- master.dev, Exploring Multi-Brand Systems with Tokens and Composability: https://blog.master.dev/exploring-multi-brand-systems-with-tokens-and-composability/
- Infinum, How Design Tokens Helped Us Build Four Different Brand Experiences From One Design System: https://infinum.com/blog/multibrand-design-system-tokens/
- Maersk Design System, Themes and tokens: https://designsystem.maersk.com/foundations/themes/

Real sites audited (home page structure read Oct 2026):

- Birds Barbershop, Austin: https://birdsbarbershop.com/ (type-led "Haircuts for all y'all", 3 reasons, award, photo service tiles, locations grid)
- Heritage Barbershop, Portland: https://www.heritagebarbershop.com/ (hours and contact as section 2, price-first list, per-barber Book)
- South Austin Barber Shop: https://www.southaustinbarbershop.com/ (booking per location at top, price-bookended services, 1,000+ reviews)
- Gould Barbers (UK): https://www.gouldbarbers.co.uk/ (photo banner, heading-rule-copy-link rhythm, alternating image/text)
- Blind Barber: https://blindbarber.com/ (retail-first, Book in header, press quotes)
- Gramercy Tavern: https://www.gramercytavern.com/ (two image panels as hero, reservations form, no hours on home)
- Prashad (UK): https://www.prashad.co.uk/ (welcome intro, three cards, hours by day on home, award badges)
- The Kebab Shop: https://thekebabshop.com/ (menu categories as the hero, Order Online in header)
- John the Plumber, Ottawa: https://www.johntheplumber.ca/ (text hero with 2,000+ reviews bullet, phone in header/hero/footer/bottom bar, badges)
- Mammoth Plumbing, Houston: https://www.mammothplumbing.com/ (text hero, badges top, mid-page form, review widget with owner replies)
- Electrified Garage: https://www.electrifiedgarage.com/ (numbered eyebrows, italic accent headline, cutaway diagram, stat strip, numbered service cards)
- Miller Auto Repair, Phoenix: https://www.millerautorepairshop.com/ (hours/address/phone top bar, "386+ Reviews" in hero, badges, 24 towns)
- Level Lawns, Atlanta: https://www.levellawns.com/ (photo hero, four-stat row, season-tagged service cards, work gallery toggle)
- Highlands Landscaping, Denver: https://www.highlandslandscaping.com/ (photo hero with "highest rated" eyebrow, italic-accent headings, photo service tiles, badges under CTA)
- Appletree Business Services, NH: https://www.appletreebusiness.com/ ("Stop Chasing Your Accountant", wrong way / our way, 25 testimonials with headshots)
- Meta Church, NYC: https://meta.church/ (text hero "Church for people like you", Plan Your Visit + Watch Online, times in Join section)
- Ocean City Church, FL: https://www.oceancitychurch.org/ (Plan a Visit with service times directly beneath, all-caps labels)
