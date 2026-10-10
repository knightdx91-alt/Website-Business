# CLAUDE.md — Website Business

Guidance for Claude Code in this repo. Read this first: it holds every decision
made during planning, so a new session can continue without the original chat.

## The business

Find local businesses that have no website (or only a Facebook/Instagram page),
auto-build a website for each one, show the owner a preview in person, and sell
them the site plus monthly hosting/maintenance.

Starting market: **Cullman, AL area** (zips 35055, 35057, 35058 and surrounding).

## How the owner uses it

- Runs everything from a **Samsung Galaxy Z Fold 8** (Android). No laptop.
- The app is a web app installed to the phone's home screen (PWA).
- Picks one or more **business categories**, taps **Run**.
- The run happens in the cloud, so the phone can be locked mid-run.
- Results: a ranked list of lead cards (name, phone, address, category, rating,
  tap-to-call) each with a **private preview** of the site built for them.
- Owner reviews/edits a site in the app, shows it to the business owner on the
  Fold (desktop and phone view toggle), and if they buy, taps
  **Publish to Cloudflare Pages**. Also offer **Download as zip** as a backup.

## Pipeline (one tap of Run does steps 1–5 for every lead)

1. **Find**: Google Places API (New), Text/Nearby Search by category around Cullman.
2. **Qualify**: keep places with no `websiteUri`, or one pointing at
   facebook.com / instagram.com / linktr.ee etc. Drop chains and duplicates.
3. **Enrich**: phone, address, hours, category, rating/review count, photos.
4. **Rank**: likely buyers first (active, many reviews, busy FB-only page).
5. **Generate**: category template + Claude-written copy, for every lead in
   parallel (queue-based, with progress). Hundreds per run is expected.
6. **Review** (manual): preview, edit text/hours/services, upload owner photos.
7. **Publish** (manual): push the static site to Cloudflare Pages (`*.pages.dev`),
   attach the client's domain later. Status tracking: new, shown, sold, live.

## Decisions (settled)

- **Backend**: Cloudflare (Workers for the API/pipeline, plus whatever storage fits:
  D1 for leads, R2 or KV for generated sites, Queues for the batch).
- **Hosting for live client sites**: Cloudflare Pages. NOT GitHub Pages: GitHub's
  terms bar using Pages as commercial hosting, and one flagged account would take
  every client site down.
- **Previews are private**: behind the owner's login, `noindex`, never public until
  Publish is tapped.
- **AI copy**: Anthropic Claude API.
- **Run cap**: a setting like "stop at N leads" so a run can never run up a bill.
- **Category picker** at Run; one or several categories per run.

## Category templates

Before building templates, research ~50 top sites per category and write a
blueprint per category (pages, home-page section order, must-have features,
design direction, mobile behavior). Rules:
- Weight toward successful **independent** businesses, a few chains for ideas.
  Real traffic data isn't public, so judge by search rank, awards, reviews.
- Learn structure and features; **never copy** designs, code or text.
- 3–4 distinct looks per category so neighboring clients don't match.
- Booking/ordering features link or embed existing services (Square, Toast,
  DoorDash, Calendly, Booksy); sites stay static.
- Do this research once per category, refresh about yearly. Not per run.

First categories: restaurants and cafes; contractors (plumbing, HVAC, roofing,
electrical); hair salons and barbershops; auto repair; landscaping and lawn care;
cleaning services.

## Compliance rules

- **Google Places terms**: Place IDs may be stored indefinitely; other place data
  has caching limits, so refresh rather than keep forever. Google photos may be
  used in local previews but **not re-hosted on published sites**: the publish step
  must swap in owner-supplied, stock or AI images. Don't quote Google review text
  on sites; use it only as context for the AI copy.
- **Outreach stays manual**. The app produces call sheets and mail lists; it never
  auto-calls or auto-texts (TCPA).
- AI copy can be wrong about a real business: the owner reviews every site
  before it is shown or published.

## Secrets

Never commit keys. Never ask the owner to paste a key into chat.
They are set as environment variables in the Claude Code cloud environment:

| Variable | What |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token (wrangler reads this name) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID (wrangler reads this name) |
| `GOOGLE_PLACES_API_KEY` | Google key, restricted to Places API (New) |
| `PIPELINE_ANTHROPIC_API_KEY` | Claude key for site copy. Deliberately NOT named `ANTHROPIC_API_KEY`, which Claude Code itself would pick up and bill. |

At deploy time, copy the Google and Anthropic keys into the Worker as Cloudflare
secrets (`wrangler secret put`); never into source or `wrangler.toml`.

## Status

- [x] Plan settled
- [x] Owner: Google Places key, Anthropic key, Cloudflare account + token, all
      added as environment variables above and verified working (Places search,
      Anthropic models, Cloudflare Workers/KV/D1/Queues/Pages/R2)
- [x] Category research and blueprints: see `research/README.md`;
      `research/00-shared-baseline.md` is the template architecture and build order
- [x] Site generator core + restaurant and contractor packs (`src/generator`), Places
      search/qualify (`src/places`), Claude copy writer (`src/copy`). Tested on real
      Cullman leads: 19 restaurant and 16 contractor leads found.
- [x] Cloudflare app: live at https://website-business.knightdx91.workers.dev
      (Worker API + queue pipeline, D1/R2 storage, phone PWA, Pages publish, form inbox)
- [x] Packs for salons, auto, landscaping, cleaning (now 25 looks per category, all AA-checked).
      Real Cullman leads found: 14 salon, 20 auto, 11 landscaping, 6 cleaning.
- [x] Caller logins (limited access), call log with callbacks, Android app (TWA APK)
- [x] Growth batch: plans + client sign-up page + Stripe/Square payment links, visit counter +
      monthly report, review QR cards, preview flyers, custom domains, outdated-website leads,
      food trucks / nail salons / pet groomers, nearby towns, walk-in route, sales dashboard
- [x] Plans set from market research (Oct 2026): Basic $49, Plus $89, Pro $149. Ways to pay (`billingOptions` in db.ts):
      6-month or 12-month plan with NO setup fee (`shortMonths`, `minMonths`), month to month with a $299 setup fee
      (`flexSetup`, the only setup fee), or yearly up front = 12 months for the price of 10 (`annualMonthsFree` 2; not 14
      months). Extras $35 NFC card, $149 GBP setup. Pro email:
      free Cloudflare Email Routing forwarding, or a Google Workspace mailbox billed to the client by Google (no inbox add-on)
- [x] Google profile tools step 1 (AI-assisted checklist, posts, review replies)
- [x] Company website live at undergroundassociates.com (bought on Cloudflare)
- [ ] Owner to do: Stripe payment links; Google account for client profiles (Settings); apply for
      Google Business Profile API once a client's profile is managed (then build step 2). LLC is Underground Associates LLC
- [x] Plans & answers screen for callers; 7 page layouts; print/sign and retail packs; more search groups
- [x] Preview-opened alerts, policies, example sites, Stripe webhook, follow-up texts, change requests, review asks, and
      the extras batch (gallery, hiring, Spanish page, social posts, listings checklist, QR table tents/window sign)
- [x] Online checkout: sign-up links, website Buy now, Buy extras links (Stripe Checkout)
- [x] Stripe keys set as Worker secrets; live checkout + webhook verified with a $1 test
- [x] Email: MailerSend worked in a test, then turned the account down (Oct 2026). Switched to Resend (RESEND_API_KEY secret wins over MAILERSEND_API_KEY)
- [ ] Owner to do: our own Google Business Profile + review link
- [x] Tax & finance pack and churches & nonprofits pack (Oct 2026), 25 looks each. Hand-added businesses can have a typed-in phone
- [ ] Next ideas: email/text alerts for inbox items, daycare / tattoo / photographer packs (need their own research first)

## Code map

- `src/generator/`: pure TypeScript, runs in Node and Workers. `render.ts#buildSite`
  turns a `BusinessRecord` + `Copy` into static files and runs the publish gate (`lint.ts`).
  Looks are design tokens in `themes.ts`, checked for WCAG AA contrast at build.
- `src/generator/packs/`: one file per category (section order, CTAs, schema type, copy brief).
- `src/places/`: Places API (New) search, lead qualification/ranking, Place → record.
- `src/copy/write.ts`: Claude copy with structured output and fact/phrase checks.
  Default model `claude-opus-5-5` (about $0.04/restaurant, $0.10/contractor site).
- `npm test` · `npm run typecheck` · `npm run demo -- --category restaurant --limit 3 --out <dir>`
  then `CHROMIUM_PATH=... npx tsx scripts/screenshot.ts <dir>/sites <dir>/shots`.
- Never write demo output (Google data, photos) into the repo; use a scratch dir.

## The app (Cloudflare)

- `src/worker/index.ts`: router. `/api/*` JSON API (owner login via signed cookie;
  mutating calls need header `x-wb: 1`), `/p/<leadId>/*` private previews from R2,
  `/f/<leadId>` lead-form posts from published sites, queue consumer, daily cron.
- `src/worker/pipeline.ts`: queue jobs. `search` (Places → qualify → leads, capped per run)
  then `build` (record → Claude copy → preview into R2 at `previews/<id>/`).
- `src/worker/publish.ts` + `pages.ts`: publish gate, then Cloudflare Pages Direct Upload
  over the REST API (same hashing as wrangler). Owner photos live at `owner/<id>/` in R2.
- `src/worker/edits.ts`: zod-validated owner edits. `migrations/`: D1 schema.
- `app/public/`: the phone PWA (vanilla JS, no build step). `npm run prepare:app` copies
  site fonts into `app/public/fonts/` (gitignored) and renders icons.
- Deploy: `npm run deploy`. Resources: D1 `website-business`, R2 `website-business-sites`,
  queue `website-business-jobs`. Worker secrets: GOOGLE_PLACES_API_KEY, ANTHROPIC_API_KEY,
  CF_API_TOKEN, APP_SECRET, VAPID_PRIVATE_JWK (set with `wrangler secret`; never in files).
- Google data hygiene: photos are proxied live, never stored; the cron expires unsold leads
  (new after 30 days, shown after 60), keeping only the Place ID.
- Owner to-dos: `todo(ctx, …, required)` in components. Required ones block publishing;
  suggested ones only show in previews as talking points.
- Call guide (`src/copy/pitch.ts`, `/api/leads/:id/pitch`): Claude-written talking points per lead
  for the caller, cached in `leads.pitch_json`, cleared when the lead is rebuilt/edited or sales
  settings (company, caller, prices) change. It describes the preview only from `previewFeatures`.
- Share links: `/s/<leadId>.<exp>.<hmac>/` serves a preview without login for 14 days, with a
  "Free preview" banner. "Text preview link" / "Copy preview link" (`shareButtonsHtml` + `bindShareButtons` in app.js)
  show on the lead page, the Preview screen and the call guide. Rotating APP_SECRET revokes all share links and logins.
- Roles: the owner (password in `settings.owner_password`) and team members (`users` table, managed in
  Settings → Team). A team member is a caller, or has `users.admin = 1` ("Full access"): their session gets
  role "owner" (everything the owner can do) but keeps their own id and name for notes, texts and sales credit. Login is password-only, so passwords are unique across everyone. The session
  cookie is `<userId>.<exp>.<hmac>` with the user's stored hash in the HMAC, so changing a password
  or turning a caller off signs them out. Callers may only use the routes in `callerSafe` /
  non-`ownerOnly()` (leads, previews, call guide, share link, status, call log); everything that costs
  money or changes a site is owner-only, enforced in `src/worker/index.ts`.
- Call log: `lead_notes` (outcome + note + author) and `leads.follow_up` (YYYY-MM-DD, Cullman time) via
  `POST /api/leads/:id/log`. "No answer" defaults the callback to tomorrow; Sold/Not interested clear it.
  Home shows "Call back today" (due + overdue). A future callback keeps a lead from expiring, capped at 90 days.
- Android app (`android/`): a Trusted Web Activity (androidbrowserhelper) that opens the live app
  full-screen; `/.well-known/assetlinks.json` (in `index.ts`) carries the signing cert fingerprint.
  `npm run android` builds it (needs ANDROID_HOME with platform 36) and uploads it to R2
  `_build/website-business.apk`, served behind login at `/api/android.apk` (Settings → Download).
  The app only needs rebuilding for shell changes (name, icon, package); features ship with `npm run deploy`.
  The signing key is deliberately NOT kept anywhere (owner's choice). If it's gone, `android/build.sh`
  makes a new one: add its fingerprint to `ASSET_LINKS` (keep the old ones so existing installs stay full-screen),
  redeploy, and phones uninstall + reinstall once to move to the new build. 1.2 (Oct 2026) was signed with a new key.
  Maven Central rate-limits builds here, so `settings.gradle.kts` lists Google's mirror first.
- Run picker = search groups (`src/places/queries.ts` SEARCH_GROUPS). Several groups share one
  template, and the variant comes from the Google type + business name: food trucks/bakeries/coffee →
  restaurant pack; nails, pet groomers, massage (`massage`, needs the AL license # before publish) → salon
  pack; painters/concrete/handymen/fencing/remodeling/appliance/tree/pest → contractor pack trades;
  body shops (`body`), detailing, towing, small engine → auto pack; pressure/window washing → cleaning
  `exterior`. "Nearby towns" runs every term of each group for Hartselle,
  Arab, Hanceville, Good Hope, Vinemont. "Outdated websites" checks up to 15 existing sites per search
  (`src/places/site-check.ts`) and keeps broken/insecure/not-phone-friendly/stale ones (presence `outdated`).
- Looks × layouts (Oct 2026: 25 looks per category × 25 layouts = 625 designs per category): a look is colors + fonts
  (first 4 per category in `themes.ts`, `looks-more.ts`, `looks-shops.ts`; the other 21 in `src/generator/looks/<category>.ts`);
  a layout is page structure, CSS only on shared markup (first 7 in `src/generator/layouts.ts`, the other 18 in
  `layouts-a/b/c.ts` as `LayoutDef`s, helpers in `layout-kit.ts`). Fonts only from `src/generator/fonts.ts` (102 installed
  @fontsource packages; `f(id, weights)` in `look-kit.ts`). Rules (enforced by `test/designs.test.ts`): 25 looks per category,
  unique names, a different heading font per look within a category, AA contrast via `resolveTheme`. Packs list their 4
  best-fit looks; `packs/index.ts` appends the rest. A site's design id is `<look>~<layout>` (bare look = its default
  layout), stored in `leads.look`. `pickDesign` (`src/generator/design.ts`) gives each new site the least-used
  combination in its category and never a sold/live client's (their look is also pushed back). Lead screen → "Try
  another design" (`POST /api/leads/:id/restyle`); Edit has both pickers. Previews from before layouts get restyled on
  first open if still New (`restyleOldPreview` in preview.ts). Checking designs by eye:
  `npx tsx scripts/design-sheet.ts <scratchDir> "<look>~<layout>,..." [--no-photo]` (phone + desktop sheets, flags
  overflow) and `npx tsx scripts/check-looks.ts <category>`.
- Design DNA (Oct 2026, `src/generator/dna.ts` + `dna-css.ts`): a third part of the design id, `<look>~<layout>~<dna>`
  (e.g. `h1n2b3s2v1c1f1a1p1`), that changes the page *structure*: opening (`hero`: stack / cover / split with an at-a-glance
  panel / banner + lede / statement with a photo band), top bar (`nav`), buttons, address bar (`strip`), services
  presentation (`services`: cards / list / tiles / accordion / columns via `serviceList()` in every pack), closing call
  (`cta`), footer, phone bar (`bar`: bottom bar or round call button) and in-flow photo treatment (`photo`). Every knob's
  first value is the pre-DNA page, so ids without a third part build exactly as before (test: byte-identical). The values
  live on `<html data-hero=… data-nav=…>`; `dnaCss()` styles the non-legacy values; `scopeLayoutCss()` prefixes a layout's
  rules for a part the DNA owns with `html[data-<part>="<legacy>"]`, so any DNA mixes with any of the 25 layouts (the
  layout keeps its character elsewhere). `pickDna(seed, category, {avoid})` is deterministic from the lead id with per-
  category preferences (`PREFS`: a CPA never gets a full-screen photo; churches/finance keep the bottom bar) and
  consistency rules (split opening ⇒ no strip, etc.); `pickDesign` appends it. The hero also shows the Google rating as
  proof when ≥4.3 with ≥10 reviews and the pack allows reviews (`ctx.reviewsAllowed`). App: Edit → Design → "Page
  structure" pickers + 🎲 Surprise me (`dnaCode()` encodes; `/api/leads/:id` carries `dna` + `dnaOrder`); "Try another
  design" rerolls everything. Design sheets accept the full id. Research behind it: `research/design-upgrade-2026.md`.
  Second round (Oct 2026): 16 knobs. New values: openings `card` (photo, then a floating card; falls back to banner
  without a photo) and `billboard` (the name huge, facts row under it); top bar `utility` (thin info line: address,
  today's hours, Español, phone) and `overlay` (see-through fixed header, solid once scrolled, `is-scrolled` from the client
  script); buttons `pill`, `shadow`; address bar `ticker` (primary-colored one-liner) and `factcard` (card pulled up over the
  opening); services `table` (dot-leader price list) and `scroller` (snap row on phones, grid on desktop); closing `inline`;
  footer `bigname`; photo `tilt`. New knobs (letters t r k d o m q; ids without them parse as legacy): `headline`
  (what+where / business name / the promise line = `copy.heroTagline` ≤72 chars, sub becomes `heroSub`), `rhythm` (bands /
  continuous / numbered chapters / boxed sections), `scale` (standard / dramatic / poster / tight; billboard keeps its own
  size), `density`, `tone` (light opening when no backdrop photo), `motif` (CSS textures on the opening, never over photos),
  `proof` (inline trust row or a `.proof` band under the opening with the Google rating + trust items). `settleDna()` holds the
  consistency rules (also used by the app's restyle); `RECIPES[category]` are named structures (Photo first, Menu board,
  Dispatch, Lookbook, Quiet office…) that set the big knobs; `pickDna` starts from one ~55% of the time. App: the lead screen
  has "Or pick a style (keeps the colors)" (`POST /restyle {recipe}` keeps look+layout) and Edit → Design has "Start from a
  style" (fills the pickers from `data-dna` on the option). `test/dna.test.ts` builds every recipe of every category.
- Text us + open status (Oct 2026): when `smsEnabled` is ticked (Edit → "This number takes texts"), a Text us button is in
  the phone call bar for contractors, salons and auto shops (cleaning/landscaping/print already had it; the bar takes up to
  4 buttons, `bar--4`), and an "Or text us: (256)…" line (`textLine()`, `.hero__alt`) sits under the hero buttons and in the
  closing section wherever no button already says Text (Spanish page too). Trades/salons/auto/cleaning/landscaping without
  it get the suggested to-do "Can customers text this number?" (under the closing section). The open/closed pill shows once:
  when the hero shows it (`ctx.statusShown`), the info strip's clock line shows today's hours instead (`data-today-hours`,
  filled by `todayText()` in the client script: "Today 11 AM – 8 PM" / "Closed today"). `test/text-open.test.ts`.
- Auto parts stores (auto pack, variant `parts`, Oct 2026): `autoVariant` picks it from the name ("auto parts", "parts & supply"…, not
  "parts & repair"/salvage) or Google's `auto_parts_store`; search group "Auto parts stores"; chains (O'Reilly, AutoZone, NAPA,
  Carquest…) are in the auto chain list. Label "Auto Parts Store", schema `AutoPartsStore`, no service area. The site sells the
  counter: hero "Call to check stock" + "Reserve a part" (#reserve), What we carry (= `services`, seeded brakes/batteries/filters…),
  "Can't find it? We'll order it" (`ext.auto.parts.turnaround`, suggested to-do), Services at the counter (`PARTS_COUNTER` toggles in
  `ext.auto.parts.counter`, battery/wiper-bulb/loaner tools on by default; `counterConfirmed` is a REQUIRED to-do), Commercial accounts &
  delivery (only with `commercial`), reviews, and a Reserve a part form (`contactForm` opts: id/topic/title; extra fields year, make,
  model, part). `program` shows as a trust chip; `orderUrl` adds "Order online for pickup" and lets the copy mention it. `partsBannedPhrases`
  blocks shipping/price/stock claims and common brands the owner didn't type. Edit → "Auto parts details" (`partsEditCard` in app.js).
- Auto shop modules (Oct 2026, research/trends-2026/auto-finance-church.md §1; `AutoExt` tail, Edit → "Auto shop details"
  `autoEditCard` in app.js): `amenities` (ids in `AUTO_AMENITIES`, a "Good to know" chip row under the opening), `programs`
  (text chips, never logos) + `financing {lender, url?}` + the warranty term in one `#warranty` band after services (no approval
  or credit-check wording; `autoBannedPhrases` also bans "EV certified" and 24/7 unless confirmed). Towing variant: `tow {phone,
  always, yardNote}` → "Need a tow?" strip after the opening (`towLine()`: the tow number when it normalizes, else the shop line;
  `extraPhones()` in phone.ts lets lint accept the second tel:), `sms:` "Text us your location" when `smsEnabled`, "24/7" only
  with `always`; REQUIRED to-do "Confirm 24/7 towing" whenever the copy, services or amenities say 24/7 and `always` is off.
  Tire variant: the #contact form becomes "Get a tire quote" (`tire_size`, year/make/model, `quantity`, `brand`; Inbox line
  "Tire quote: 265/70R17 ×4" from `requestSummary`), `tireBrands` chips + `storeUrl` "Shop tires online"; the quote action is
  "Get a tire quote". Body variant: `#claims` "What to do after a wreck" (3 steps), `body.insurers` / `certifications` chips,
  "You choose the shop." line only with `rightToChooseConfirmed` (suggested to-do), `estimateNote` as the intro, gallery to-do
  "Send 3 before/after pairs". `header()` utility bar adds "★ 4.8 · 386 reviews" (Google link) wherever `reviewsAllowed` and
  count ≥ 10; packs may replace its hours with `utilityLine(ctx)`. Edit → Links has a booking-link help line (Tekmetric /
  Shopmonkey / ShopGenie / AutoLeap). Copy facts carry all of it (`write.ts`); `previewFeatures` has one line per module.
- Finance modules (Oct 2026, research §2; `FinanceExt` tail, Edit → "Tax & finance details"): `people[]` (`Name | Title |
  Credentials | One line` textarea) → `#people` "Who you'll work with" cards after services, REQUIRED "Confirm names and
  credentials" until `peopleConfirmed`; `whoWeServe` → "Who we serve:" line under services and a hero-sub hint in the brief;
  `fees[] {service, price}` + `feesAsOf` → `#fees` price list (svc--table markup) with "Fees shown as of <month>; call to
  confirm" (suggested to-do when the month is missing); tax_prep `seasonHours {from, to (MM-DD, may wrap), summary}` → Visit
  shows "Tax season hours" first with a Now chip inside the window (`inSeason`), under "Rest of the year" otherwise, plus a
  strip chip; the open/closed pill stays on Google hours. Insurance: #contact is "Start a quote" with the coverage select first
  (`serviceFirst`/`serviceLabel`/`note` opts on `contactForm`; Medicare only with `medicare`) and the Google count beside it;
  `carriers` may be strings (old records) or `{name, payUrl?, claimsPhone?, claimsUrl?}` (`carrierItems()` normalizes; Edit
  line `Name | pay URL | claims phone | claims URL`) → "Pay a bill or report a claim" list (`.svcctr`, claims tel: allowed by
  `extraPhones`); `memberships` chips. Advisors: reviews stay off unless `advisorReviewsApproved {by, on}` (Alabama dropped
  its testimonial ban 4 Dec 2025), then the reviews section renders with "These reviews were given by clients; no compensation
  was paid. Conflicts of interest: none." under it; hero/util/footer rating stays off. TPMO to-do says "current (October 2026)
  CMS wording … SHIP reference was removed".
- Church modules (Oct 2026, research §3; `ChurchExt` tail, Edit → "Church & nonprofit details"): confirmed schedule rows with a
  parseable day + time (`parseScheduleRow`) give a times line under the H1 (`timesLine`, first two rows) with a "Next: Sunday
  10:30 AM" chip the client script fills from `data-next-service` (`hero()` `note` opt), and the utility top bar shows Sunday
  times (`sundayTimes`, pack `utilityLine`) instead of office hours; `reviewsAllowed` is false for the whole category. Schedule
  rows take `lang: "es"` (`Day | Time | What | es`) → "en español" badge. `planVisitUrl` makes the Plan a visit action an
  external link (actions.ts), `connectCardUrl` a button in Plan a visit; `kids {nursery, kids, students, checkIn}` → `#kids`
  cards + nav "Kids"; `liveNote` / `podcastUrl` extend `#watch`; `prayerUrl` (https, mailto: or sms:, `contactUrl` validator;
  never a form of ours), `bulletinUrl`, `appUrl` → `#connect` row. `announcements()` is called right after the opening for every
  church variant ("This season" / "Coming up"); charities get `volunteerUrl` ("Sign up to volunteer"); posts and centers get
  `hallDetails {capacity, kitchen, tables, how}` chips + "To book:" next to the `hall` paragraph (which stays a string).
- Thrift donations (retail pack, `ext.retail.donations`, Oct 2026): on by default for `thrift` (`donationsOn` in actions.ts), any shop can
  turn it on in Edit → "Donations" (`donationsEditCard`). Section #donations after What's new: intro `note`, "We gladly take" /
  "We can't take" chips (`accepts` / `doesNotAccept`), `dropOffHours`, nonprofit `receipts` line, and with `pickup` a "Request a furniture
  pickup" form (#pickup, fields items/address/best_day, `hasForm` becomes true). REQUIRED to-do until `accepts` and `dropOffHours` are
  filled (`donationsMissing`). Nav "Donations", hero "Donate items". The thrift brief says the site's jobs are "open / where" and
  donations and never states what's accepted unless given. Form posts: `FIELDS` in `src/worker/forms.ts` lists every generator form
  field (+ hidden `topic`); `requestSummary` puts the part + vehicle or pickup items in the notification, `requestLine` in the Inbox.
- Tax & finance (`packs/finance.ts`, research/tax-finance.md): variants tax_prep / accounting / insurance / financial_advisor
  from `financeVariant` (names decide; banks, lenders, pawn, payday, captive agents and franchise tax offices return null and are
  skipped in runs). Search groups "Tax preparers & bookkeepers", "Accountants & CPAs", "Insurance agencies"; advisors only by hand
  (ask first whether their firm allows their own site). Owner facts in `ext.finance` (Edit → Tax & finance details). Required
  to-dos (block publish): confirm the credentials line if given, PTIN (tax prep), Alabama CPA firm permit whenever "CPA" appears,
  agents licensed (insurance), CMS Medicare disclaimer pasted if they sell Medicare plans, and for advisors the firm's disclosure text
  (verbatim, footer of every page + /disclosures/), compliance approval (who + date) and BrokerCheck/Form CRS links. Advisors get no
  reviews anywhere (site, footer, review cards). `bannedPhrases` (pack hook) stops refund/rate/credential/guarantee/"free"/notario
  wording in AI copy (copy writer retries; publish lint errors). Tax prep gets /what-to-bring/ (template list, owner-editable).
- Churches & nonprofits (`packs/church.ts`, category `church`, research/churches-nonprofits.md): variants church / civic_post
  (VFW, Legion, Lions, Ruritan, lodges) / charity (pantries, closets) / community_center from `churchVariant` (names first;
  schools, daycares, cemeteries, funeral homes, other worship, Baptist associations, AA/NA, shelters, Church's Chicken and
  multi-site churches return null). The restaurant/store chain list is skipped for this category (it would drop "Goodwill
  Baptist"); parent-org pages (legion.org, vfw.org…) count as no website, churchcenter.com as a free builder. Google photos are
  never used for these (people/children). Everything is the organization's words (`ext.church`, Edit → Church & nonprofit
  details): service times (`schedule`, Day | Time | What), the tradition label ("Missionary Baptist church", suggested from the
  name by `suggestTradition`, never a convention), pastor, beliefs (verbatim), first-visit answers, give/watch links, help hours,
  meetings, hall rental, nonprofit status line. Required to-dos: confirm service times, the label, pastor (or turn it off); civic
  meetings; charity help details. Google hours show only as "Office hours" (no open/closed). No forms (no prayer requests stored),
  no reviews section. `bannedPhrases` stops doctrine, scripture refs, denominations, tax/eligibility, kids/access claims and
  politics in AI copy. Selling notes (who decides, deacons meetings, pricing landscape) in research §14.
- Review fixes (Oct 2026, migration 0012: `leads.contact`, `best_time`, `shown_at`, `purchases.stripe_subscription`):
  Stripe webhook records an event id only after handling it (a failure is retried); subscription cancels match by
  subscription id (an extras cancel never unmarks the plan); paying clears `follow_up` and notes "Paid through Stripe".
  Signing sets `follow_up` tomorrow + a "Signed; payment not finished" note (Home card "Signed, payment not finished",
  `unpaidSignup` in summaries); `?canceled=1` notes "Backed out at the card screen". Login lockout is per IP (10/15 min)
  plus a global cap (50). URL fields only accept http(s). Publishing uses the custom domain as the site origin and
  republishes when a domain is added/removed; `pages_project` is saved before the deploy; publish passes Google review
  texts to lint. `/retry` also unsticks queued/building leads older than 20 min. Daily cron also expires
  `not_interested` 30 days after last contact and prunes events (180 d) / stripe_events (90 d); a Sunday cron writes
  `_backup/<day>.json` to R2 (keeps 8) and `GET /api/backup` (owner, Settings → Team) downloads the same. Callers get a
  trimmed `/meta` (no commission, pay links, agreement) and no signer emails. `GET /flyer` is side-effect free; `POST
  /flyer` marks Shown. `PUT /api/leads/:id/contact` {contact, bestTime} ("Ask for: …" on cards, walk-in guide).
  Outcomes gained `reached` and `link_sent` (the app logs every preview link texted/copied). Log card: outcome is a
  required tap; Not interested asks a reason (`Reason: price|has_someone|no_need|timing|other.` note prefix, tallied in
  `/api/sales` `lostReasons`; `pipeline` = shown × Plus). Cadence from `shown_at` (`sales.ts` nextCadenceStep: day 2 call,
  5 text, 10 walk-in, 21 last text; `/log` books the next step for no_answer/reached on shown leads; `detail().cadence`).
  Home "Today" card (callbacks → opened previews → best untouched New; `settings.dailyCalls` goal). `settings.
  churchAnnualMonthsFree` (default 4): churches pay 12 months for the price of 8 on yearly (`billingOptions(plan, s,
  {category})`); church sign-up links (or `?invoice=1`) offer "Pay by check or bank transfer" which skips Stripe and
  notes it. Sign-up page: plan pre-picked (`showPlans:false`, "change plan"), 2 ways to pay + "Other ways", 5 featured
  extras + "More extras", no Stripe phone prompt; `GO_LIVE_TEXT` ("live within 3 business days") on buying pages and a
  TIMING section in the agreement; "Rush build" is now "Same-day build". `defaultTerms` adds early-cancel, late-payment,
  liability/Alabama law, policy-by-reference and yearly-renewal-reminder lines (`CORE_TERMS`, appended to custom terms).
  `portalSession()` + `GET /api/leads/:id/portal` (owner) → Stripe billing portal. App: render sequence guards stale
  loads; Edit refreshes single cards and keeps drafts in sessionStorage with a leave guard; log card moves under the
  header on phones; status tabs confirm; `phoneDigits()` helper; sw.js v35 (v34 only falls back to the shell for `/`; v35 adds the Settings "Send me a test email" button, `POST /api/mail/test`, owner-only, to the direct or business email).
  Generator: banned phrases checked on AI text only (whole words), `--hdr-h` keeps the open menu below tall headers,
  chain list per category with whole-name matching (`isChain(name, category)`), booking/ordering pages count as no
  website, 40 km cut + phone dedupe in `qualify` (pipeline passes `center`), 6 new search groups (septic/dirt work, doors/
  gutters/welding, floors/drywall, glass/muffler, seafood/hibachi/wings, hardware) with new contractor/auto/retail
  variants, hours only ever suggested (owner asked to make them required, then reversed: a site goes live without them), no empty visit/reviews sections, SVG favicon + og:image, assets
  `must-revalidate`, finance/church banned lists fixed for everyday phrases (`SCRIPTURE_REF` needs a book name),
  `copy.issues` + loose-number warnings in lint, `sectionHead(..., id)` for aria-labelledby, Spanish nav labels + a. m./
  p. m. hours, bot-challenge 503s aren't "down". `test/fixes.test.ts`, `test/worker/review-fixes.test.ts`.
- Shared owner facts (Oct 2026, research/trends-2026/food-salon-retail-print.md): `record.proof` {awards [{name, year}], memberships,
  clients, stats [{value, label}]} feeds the opening's trust row / proof band on every pack (`ownerProof()` in components.ts) and a
  "Trusted by …" line under it; `pickDna(seed, cat, { avoid, hints })` takes `hints.proof` (prefer the band) and `hints.noPhoto` (no owner
  hero photo: a statement / billboard / banner opening, light tone allowed) from `dnaHints(record)` in pipeline.ts via `pickDesign`.
  `record.closures` [{date, label}] show under the hours ("Closed Nov 26 for Thanksgiving", `data-until`, auto-expiring) and in the info
  strip the week before (`data-soon`, the page script shows/hides by date); `record.visit` {paymentMethods, parking} are lines under the
  address (`visitExtras()`); salons also put the pay list in the trust row. `links.giftCards` → `giftcard` action (restaurant order row,
  retail What's new, salon closing band). Edit: "Awards & proof" and "Closures, parking & payment" cards; Links → Gift cards link.
  Shared helpers: `factList()` (`.facts` dl), `tiles()` (`.tiles` photo tiles), `FormField.type: "date"`.
- Restaurants (Oct 2026): `MenuItem.image` (an owner gallery photo, picked per item in Edit → Menu → "Dish photos & tags"; kept when the
  menu is retyped; Google photos never) and `MenuItem.tags` (`MENU_TAGS`: popular/new/vegetarian/vegan/gluten_free/spicy) → ≥2 items with a
  photo or the popular tag become "Popular" photo tiles on the home page; tags + a legend on /menu/. `ext.restaurant.catering` (+
  `cateringNote`) → #catering band + "Request catering" form (event_date, guests, needs); food trucks get "Where to find us" (shared events
  as "This week", `calendarUrl` → Full schedule, else the Facebook link) and a "Book the truck" form (event_date, guests, location);
  `hasForm` is true for both. `deliveryLinks` {doordash, ubereats, grubhub} + gift cards + `rewardsUrl` → #order "Order through" row.
  Reserve is the hero primary (Order second) when `links.reserve` is set and dine-in. `restaurantBannedPhrases`: no catering / partner /
  rewards / gift-card wording unless given. Edit → "Restaurant details".
- Salons (Oct 2026): `ext.salon.team` [{name, role, days, bookingUrl, line}] → "Meet the team" cards with "Book with <first>" (own link,
  else the shop's); REQUIRED "Confirm the team list" until `teamConfirmed`. `Service.durationMin` ("Haircut | $25 | 45 min" in Edit) shows
  "$25 · 45 min". Massage `rates` [{minutes, price}] → #rates table. `policies` {deposit, cancellation, lateness, kids} → "Good to know";
  `introOffer` {text, until} → a trust-row line "(through Nov 30)" that expires; pet `pet` {vaccinations, pricingFrom, mattingNote, prep}
  → "Before your appointment" (vaccination line only suggested). `salonBannedPhrases`: massage health claims, offers / deposits / team
  mentions the owner didn't give. Edit → "Salon / Massage / Grooming details".
- Retail (Oct 2026): hero shows the street line (`HeroOpts.address`). Florists: `ext.retail.florist` {occasions (default
  `FLORIST_OCCASIONS`), deliveryArea, cutoff, deliveryFee, designersChoice} → occasion tiles (sympathy/weddings → #inquiry, else the order
  page or Call), `deliveryLine()` ("Same-day …" only with a cutoff), designer's-choice note, and a "Sympathy & weddings" form (occasion,
  event_date, budget_range; `hasForm`). `vendors` {boothsAvailable, note} → #vendors + booth form (`booth`, best_day); `departments` /
  `brands` chips in What we carry (feed, hardware, furniture; events show as "This season" there); `financing` {lender, url} +
  `deliveryNote` → #delivery "Getting it home"; `dropDay` (What's new intro), `occasions` (boutique/gift chips), `holdNote` ("Call to
  hold…" + Call). `retailBannedPhrases`: no same-day / free delivery / financing / booth wording unless given. Edit → "Shop details".
- Print (Oct 2026): quote form (topic "Quote") asks quantity, needed_by (date), placements (per variant), artwork_status, rush;
  `ext.print.uploadUrl` (owner's Dropbox/Drive file-request link) → "Upload your artwork" primary button in Send us your design;
  `turnaround` + `quantityTiers` [{from, note}] (+ proof / design help) → #details "Good to know"; `storeUrl` → `store` action in the
  closing band. `printBannedPhrases`: no turnaround / rush / minimum / store wording unless given. Edit → "Print shop details".
  `FIELDS` in forms.ts carries the new names; `requestSummary` → "Quote: 48 Custom T-shirts · needed by Nov 3 · front · has artwork · RUSH".
  Tests: `test/fsrp-features.test.ts`, `test/worker/fsrp-features.test.ts`. Copy facts: `fsrpFacts()` in write.ts (COPY_PROMPT_VERSION 4);
  call guide lines: `fsrpFeatures()` in pitch.ts.
- Trades, lawn & cleaning shared modules (Oct 2026, research/trends-2026/trades-lawn-cleaning.md §5; `test/tlc-features.test.ts`,
  `test/worker/tlc-features.test.ts`): `record.plans` (1–3 cards: name, price text shown as "from $X"/unit, includes, badge, note;
  `plans(ctx, opts, items)` adds "Prices are starting points" only when a price is set), `record.guarantee` {window, remedy, text}
  (`guaranteeChip` "24-hour guarantee", `guaranteeBand` under the services, `guaranteeFaq`; nothing until typed), `record.offers`
  (existing `Offer` type: title/code/expiresOn optional/detail; `promoBar` under the opening = first active offer, `offersSection`
  (#offers) the rest, both `data-event-end` so the page hides them itself; Edit textarea `offer | code | expires | details`),
  gallery captions and before/after pairs (`Image.caption/town/pairWith` = file key of the "after"; `gallery()` renders `.pairs`
  first, captions as figcaptions; Edit → Photo gallery has caption/town and a "BEFORE of" select per photo, saved via
  `galleryMeta`), form upgrades (`FormField` names `reach`, `urgent`, `facility`, `sq_ft` + `value` preselect; `property`
  Residential/Commercial/Not sure; `contactForm` opt `photoHint` → "text us a photo of …" when `smsEnabled`; `requestSummary` puts
  🔴 Emergency first and "prefers a text" last), DNA `headline` values `question` / `benefit` (appended; `copy.heroQuestion` /
  `heroBenefit` ≤60 chars from the copy writer, editable in Edit → Text, fall back to what+where). Edit cards: Plans & pricing,
  Guarantee, Offers & coupons (all three packs). Lint accepts a contractor's after-hours number as a tel: link. Pack
  `bannedPhrases` for all three stop "licensed" without a license line and guarantee/warranty wording unless set.
- Contractor (`ContractorExt` + `packs/contractor.ts`): `financing` renders a "Financing available" chip, #financing section with
  "Apply with <lender>" and a FAQ entry (copy may never state rates/0%/no credit check: `contractorBannedPhrases`); `warrantyText`
  = band + FAQ; `afterHours` {phone, note, confirmed} + `emergencyService` → `.emerg` line under the header ("Emergency? Call <after-
  hours or main> · <note or 24/7>" + "Not urgent? Request service"), REQUIRED to-do "Confirm the emergency terms (hours, extra
  charges)" until confirmed; the form asks "Is this an emergency?". Alabama: HVAC shows "AL# <number>" in the eyebrow and footer
  (`alLicense`, `licenseText`) and has a REQUIRED to-do until a license is typed; remodeling gets a suggested HBLB to-do, REQUIRED
  with `jobsOver10k`; labels mentioning Alabama/HVAC print "AL#". `serves` residential|commercial|both → chip, services line and the
  form's property default. Plan card wording by trade (`PLAN_WORDS`). Edit → "Contractor details".
- Landscaping (`LandscapingExt` + `packs/landscaping.ts`): `seasonal` (owner toggle) → #seasons "What we do when", 4 cards built only
  from matching services with Alabama timing (`seasonBlocks`); `adaiPermit` → "ADAI permit #" chip, REQUIRED to-do when a service
  matches `ADAI_SERVICE` (fertiliz|weed|pest|spray|herbicide) and it's empty; `crew` line in About (`.crew`); lawn_crew without owner
  plans shows default "Ways to work with us" (Weekly / Every 2 weeks / One-time, from the services, no prices, suggested to-do).
  Edit → "Lawn & landscape details".
- Cleaning (`CleaningExt` + `packs/cleaning.ts`): residential `checklist` {rooms[{room,tasks}], tiers, extras} → #included comparison
  table (tasks tagged `@deep`/`@move` are only in those tiers, `parseTask`/`tagMatches`) + "May cost extra" chips, suggested to-do
  "Send us your cleaning checklist" when empty; commercial: `facilities` (from `CLEANING_FACILITIES`), `frequency`, `afterHours` →
  #facilities, "Request a walkthrough" primary/bar/form (topic Walkthrough, fields facility/sq_ft/frequency), walkthrough → written
  scope → schedule steps, no residential tiers; exterior: plans as "Simple flat-rate pricing" and a before/after gallery to-do.
  Edit → "What's included" / "Commercial cleaning details".
- Print & sign shops (`packs/print.ts`, variants screen_printing/embroidery/signs/print_shop, `ext.print.lines`) and
  retail (`packs/retail.ts`, boutique/gift/antique/thrift/florist/farm_feed/furniture, `ext.retail.shopUrl` → Shop online /
  Order flowers). Print sites have a "Send us your design" section (email/text; static sites can't take uploads).
- Notifications (`#/notifications`, 🔔 in the top bar with an unread count; everything for owner and full access, callers only preview opens):
  `notify()` in `src/worker/notify.ts` records an `events` row (actor, kind, lead, text) for call logs/notes, status
  changes, sign-up links sent, client sign-ups, paid, publish, leads added by hand, search runs, and website/company
  form messages. Each person sees everyone else's events; `notif_seen` holds when they last looked. Phone pushes use
  Web Push with VAPID (secret `VAPID_PRIVATE_JWK`, a P-256 JWK; public key derived from it) and carry no payload:
  the service worker's `push` handler fetches `/api/notifications/latest` with the login cookie and shows it.
  Subscriptions in `push_subs` (dead ones removed on 404/410). The Android app (1.3+) has POST_NOTIFICATIONS,
  NotificationPermissionRequestActivity and a bell SMALL_ICON so Chrome can delegate notifications to it.
- Preview opened (migration 0008, `leads.preview_opens` / `preview_opened_at`): share pages (`/s/…`) carry a tiny script that,
  after 3 s on a visible page and once per browser session, beacons `POST /s/<token>/opened`. Link-preview bots don't run it;
  logged-in team members don't count; at most one count per 30 min. Each count notifies everyone ("👀 X just opened their
  preview (2nd time)"), callers included: `CALLER_KINDS` in notify.ts is the only kind callers get (their 🔔 list, count
  and pushes are filtered to it). Home shows "Looked at their preview" (`/api/leads?opened=recent`, last 7 days, not yet sold), the lead
  screen shows the count. Home also asks once to turn on phone alerts (`pushAsk`, dismiss stored in localStorage).
- Example sites (`src/examples/examples.ts`): 8 made-up businesses (555-01xx numbers, "Example" streets), one per pack,
  each a different look~layout. `npm run prepare:app && npm run examples` builds them (publish mode, fonts pointed at
  /fonts/) into app/public/examples/<slug>/ with an "Example website" banner + noindex, screenshots each (clock frozen at
  a weekday morning) and renders app/public/og.png (company link preview). Shown on the company site's Portfolio page
  (`/portfolio`, linked as "Our work" in the header, with type + design names) and a 4-site "Our work" teaser on the home
  page; /examples/* is served with x-robots-tag noindex and their forms post to a harmless /examples/form page.
- Stripe webhook (`src/worker/stripe.ts`, migration 0009): POST /stripe/webhook, signature checked with Worker secret
  STRIPE_WEBHOOK_SECRET. checkout.session.completed (client_reference_id = lead id) marks the lead's latest sign-up paid
  and stores the Stripe customer/subscription; invoice.payment_failed and customer.subscription.deleted notify (and a
  cancel unmarks paid). Handled event ids go in stripe_events (Stripe retries). Without the secret it returns 503.
- Extras (`DEFAULT_ADDONS` in db.ts; Settings → Extras): name, price, unit (month / each / one-time / quote = "priced per
  job"), and a one-sentence `about`. `addonPrice()` formats prices everywhere (company site cards, Show plans, sign-up page,
  policies, call guide). Plans & answers adds "Offer to" hints (`OFFER_HINT` in app.js, matched on the extra's name).
  Tools behind them: photo gallery (Edit → Photo gallery, `POST/DELETE /api/leads/:id/gallery`, up to 12 owner photos at
  owner/<id>/g….jpg, rendered by `gallery()`; packs with a "send photos" to-do show it there, others get it before
  Reviews), "We're hiring" (`record.hiring`, Edit, `hiring()` before the closing CTA), Spanish page (`copy.es`, Edit →
  Write Spanish page → `POST /api/leads/:id/spanish`, `src/copy/spanish.ts`, rendered by `src/generator/spanish.ts` at
  /es/ with an Español nav link and hreflang; kept across English rewrites), social posts (Google/social tools screen,
  `POST /api/leads/:id/gbp/social`, `writeSocialPosts` in gbp.ts, drafts in `gbp_json.social`, "Text the drafts to the
  owner"), Get listed everywhere checklist (`LISTINGS` in app.js, checks stored as `listing_*` in gbp checks), printable
  QR table tents and window sign (`/api/leads/:id/tents` and `/window`, live sites only; restaurants with a menu point at
  /menu/). Ordering hookup, rush build, logo, extra changes and ad management are services done by hand.
- Follow-ups: marking a lead Shown (call log, status, flyer) books a callback 2 days out unless one is already coming
  (`autoCallback`). The share buttons include "Follow-up texts" (`FOLLOW_UPS` in app.js), each with a fresh preview link.
- Live sites carry "Website by <company> · Request a change" in the footer (`credit` in BuildInput, publish only). The
  link opens undergroundassociates.com/change?b=<lead> (sold/live leads only), which posts to the app Inbox and notifies.
- Review asks: Settings → "Our Google review link" (`companyReviewUrl`) adds "Ask for a review" (text) on sold/live
  leads and a "Review us on Google" link in the company site footer.
- Brand (Oct 2026): the owner's logo is the round "UA" badge (`app/public/brand/logo-original-512.png` is their file; `src/brand/logo.ts`
  rebuilds it as a vector, Montserrat 800/700, navy #14213d + orange #fca311). `npx tsx scripts/brand.ts [outDir]` renders
  `app/public/brand/logo-{192,512,1024}.png` + `logo.svg` (transparent disc; website header + favicon), the app icons in
  `app/public/icons/`, and a marketing set (Google Ads square/4:1 logos on white and navy, Facebook profile). `scripts/examples.ts
  --og-only` re-renders just og.png (badge + phones). Company host passes `/brand/*` through to assets.
- Tasks (`#/tasks`, `#/tasks/<leadId>` prefilled; owner and callers; migration 0013 `tasks`; `src/worker/tasks.ts`): a shared
  to-do list with title, notes, date, time, "For" (anyone / owner / a team member) and an optional lead. `GET/POST /api/tasks`,
  `PUT/DELETE /api/tasks/:id` (delete = owner or author). Home shows "Tasks: N for today" (yours or unassigned, due today or
  overdue); the lead screen has a 📝 Task button. Every add/finish notifies (kind `task`, callers included; `/meta` carries
  `team`). Calendar: tasks for the owner (or anyone) with a date are emailed to Settings → "Calendar email" (fallback direct
  email) as iCalendar invites through Resend (`taskIcs`, METHOD:REQUEST; edits bump SEQUENCE; finishing/deleting/reassigning
  sends CANCEL; `tasks.cal_uid/cal_seq`), so Google Calendar shows them without any Google login from the app. Times are
  Cullman time (`chicagoToUtc`); no time = all-day. `test/worker/tasks.test.ts`.
- Google tag: Settings → "Google tag ID" (`gaMeasurementId`, G-RPF4081813 since Oct 2026) puts gtag.js in the head of every
  undergroundassociates.com page (home, portfolio, start/thank-you/extras, change, terms, privacy) with a per-response CSP
  nonce (`nonce()`, `gaTag()`, `csp()` in company.ts); blank turns it off. Not on client sites, previews or the app. The
  privacy policy's wording switches with it. Events for Google Ads conversions: every page reports `call_click` / `text_click`
  (tel:/sms: taps); home `?sent=1` fires `generate_lead` (contact form), the extras "Request sent" page `generate_lead`
  (extras_request), `/start/thanks` fires `sign_up`, or `purchase` with the signup's due_cents when Stripe returns with
  `?paid=1&a=s<id>.<hmac>`. Mark them as key events in GA4 and import into Ads (owner's step).
- Facebook page: Settings → "Our Facebook page" (`companyFacebookUrl`, default facebook.com/undergroundassociates) is linked
  in the company site footer and as `sameAs` in its structured data. Client sites don't link it (their footer credit points
  at undergroundassociates.com, which carries it).
- Online checkout (`src/worker/checkout.ts`, migration 0010): with Worker secret STRIPE_SECRET_KEY, orders go to a Stripe
  Checkout Session built from Settings (`priceSignup` / `priceExtras`; the browser only sends picks, never prices):
  plan as a monthly subscription (yearly = 12 − annualMonthsFree months, interval year), the month-to-month setup fee and
  one-time/per-item extras on the first payment, monthly extras on the same subscription (×12 on a yearly plan), "priced
  per job" extras noted as quotes. `pickerHtml` (plan, way to pay, extras, live total) is shared by: the sign-up link page
  (`/a/…`, `saveOrder` → redirect to Stripe, back with ?paid=1), "Buy now" on the company site (`/start?plan=…`, saves a
  sign-up with lead_id 'web' + business/phone, adds an Inbox item and notifies; listed under Sales → Website orders), and
  the "Buy extras" link for sold/live clients (`/x/<lead>.<exp>.<hmac>`, 30 days, from the client screen; rows in
  `purchases`, monthly extras become their own subscription, reuses the Stripe customer). Checkout metadata kind
  signup/extras lets the webhook mark the exact sign-up or purchase paid. Without the key, everything still records the
  order and says "we'll send an invoice" (sign-up links fall back to the plan payment links). Pages that post to Stripe
  allow form-action https://checkout.stripe.com in their CSP. Payment test: insert a lead with place_id 'paytest' and
  sales_status 'sold'; its Buy extras page (open /api/leads/<id>/extraslink while logged in) offers only a $1 item.
  Verified end to end in Oct 2026 (checkout → webhook → purchase marked paid → notification); refund it in Stripe after.
- "Already a client? Add extras" (`/extras` on the company site, `extrasRequest` in company.ts): existing clients pick
  extras and leave business name, name and phone; `findClient` matches a sold/live lead by phone (10 digits) or
  normalized business name. Matched requests land in the Inbox under that client (with an "Open client" button) and
  notify; unmatched ones go under `company`, flagged. With Worker secret RESEND_API_KEY (or MAILERSEND_API_KEY;
  `src/worker/mail.ts`, sent as Settings → company email, whose domain must be verified with the provider; the owner
  first used MailerSend, which rejected the account in Oct 2026; Resend is the provider now, DNS connected through Cloudflare), a matched client gets their Buy extras
  link emailed at once, only ever to the signer email on file from their sign-up (max 3 a day; logged in their call log;
  the page shows the masked address). The link uses undergroundassociates.com/x/… (the company host passes /x/ through)
  with ?pick= pre-ticking what they asked for. Otherwise the team texts the link by hand. Linked from the Get started
  page ("Already a client?"), the extras list and the footer.
- Contracts + e-signature (`src/worker/contract.ts`, `src/worker/esign.ts`, migration 0011): every order is signed before
  it can go further. The agreement is built from what was picked: order summary, plan and what it includes, way to pay,
  the main service agreement (Settings → agreement), terms for each extra picked (Settings → Extras → "Contract terms
  for this extra", else `STANDARD_EXTRA_TERMS` by name) and an electronic-signature clause; extras-only agreements say they
  add to the existing service agreement. Ticking "I've read the agreement" opens a pop-up (`<dialog>`) showing only the
  picked sections; the customer types their full name, draws a signature and consents; the form won't submit until
  signed, and changing the order (or business name) clears the signature. Server re-checks with `readSignature` and
  rebuilds the text with `contractText`; stored in signups.terms/signature (+ ip, user agent, time) or purchases.
  Signed copies: `/agreement/<s|p><id>.<hmac>` (permanent link, both hosts; shown on thank-you/paid pages and passed in
  Stripe's success URL as ?a=) and `/api/agreements/<s|p>/<id>` from the app (sign-up card, extras list, website orders).
  Before signing: `GET /api/contract?lead=&plan=&billing=` (`contractPreviewPage` in signup.ts; owner and callers) renders the
  exact agreement a business would sign for that plan and way to pay, with plan / way-to-pay switch pills, a "Preview, nothing
  is signed" notice and Print; nothing is stored. Buttons: lead page sign-up card "📄 Show them the agreement", Show plans
  ("Read the agreement" under each plan), the walk-in guide and Plans & answers.
  PDF export (`src/worker/pdf.ts`, no dependencies: Letter pages, Helvetica, wrapped text, ALL-CAPS lines as headings, "- "
  bullets, page numbers, the drawn signature PNG decoded here and embedded as RGB): signed copies at `/agreement/<token>.pdf`
  (both hosts, public by token) and `/api/agreements/<s|p>/<id>.pdf` (app); the unsigned preview at `/api/contract.pdf?…` with a
  "Preview, not signed" notice and footer. "Download PDF" buttons on both pages, "⬇ PDF" next to every agreement link in the app
  and "⬇ Agreement PDF" on the sign-up card. `test/worker/pdf.test.ts` checks the PNG flattening and the PDF structure.
- Agreement rewrite (Oct 2026, research/contract-review-2026.md: 43-clause gap analysis, Alabama law on late fees / interest
  (§ 8-8-1 8%/yr cap), liquidated damages vs penalties, chargebacks, attorney's fees, E-SIGN/UETA, auto-renewal, 5 lawyer
  questions). `defaultTerms` is now 22 numbered sections: deemed approval after 7 days, card-on-file authorization + tax,
  an explicit EARLY CANCELLATION FEE (monthly price × remaining months of the minimum, "a fair estimate of our loss, not a
  penalty"; pay monthly with the site live, or now less 15%; chargeable to the card on file), renewal + how to cancel,
  late payments ($15 fee after 10 days, 8%/yr after 30 days overdue, offline at 30, may end at 60 with the whole balance
  due, $49 reinstatement, collection costs and attorney's fees), payment disputes (a chargeback = missed payment + the
  bank's $15 fee), content/ownership (their name/logo/photos/text/domain; our templates/code; portfolio + credit line),
  AI-drafted text is theirs once approved, domain transfer within 10 business days (60-day registrar lock), exit copy of
  the pages within 30 days, client duties, third-party services, "if we let you down" (free month for >24 h our-fault
  downtime; 3 strikes or 14 days unfixed → cancel without the term + pro-rata refund), WCAG 2.1 AA effort + no results
  promises + warranty disclaimer, 12-month liability cap + indemnity, force majeure, business sale/assignment, texts +
  emails + notices + privacy policy, confidentiality, talk-first then Cullman County courts, entire agreement/severability/
  survival. `CORE_TERMS` has 11 regex-keyed lines appended to any custom agreement that lacks them. `esignClause` adds
  electronic delivery + "you can keep a copy". `INVOICE_TEXT` (churches) has Net 15/30, late +15/+45/+75 and the authority
  line. `STANDARD_EXTRA_TERMS` gained the research's fixes (photo no-show = the visit, new visit $99; GBP refund half if
  Google won't verify; ad accounts in the client's name; logo has no trademark search; NFC dead-card swap 90 days; quotes
  good 30 days). `/terms` refunds list, Limits (12 months) and a "How we settle disagreements" section match. The numbers
  are business decisions (ranges in the research §7 table); the owner should have a lawyer review once.
- Company site policies: `/terms` (plans, ways to pay, cancellation & refund policy at `#refunds`, the service agreement,
  limits, Alabama law) and `/privacy`, both rendered from Settings (`policyPage` in company.ts; bump `POLICIES_UPDATED`
  when the wording changes). `/refunds` redirects to `/terms#refunds`. Linked from the footer and the sign-up page.
- Show plans (`#/plans` or `#/plans/<leadId>`, owner and callers): customer-facing, always light, app bar hidden.
  Plan cards from Settings (tagline per tier in `PLAN_TAGLINE`), every-plan list, ways to pay, add-ons, fine print.
  From a lead, "Choose <plan>" creates that lead's sign-up link and opens it on the same phone.
- Plans & answers (`#/playbook`, owner and callers): each plan from Settings with who it fits and selling
  points (`PLAN_PITCH` in app.js), ways to pay, extras, and ~18 common objections with answers
  (`playbookObjections`), searchable. Linked from home, lead screen and call guide.
- Coverage check (Oct 2026): a scan of ~70 business types found ~240 no-website businesses in types we
  didn't search, and ~290 in our existing types (mostly nearby towns and beyond run caps). Re-runs skip
  leads already in the app, so running the same groups again picks up the next batch.
- Sales: Settings holds 3 plans (name, setup, monthly, includes, optional Stripe/Square payment link),
  company + legal name, min months, agreement text (`defaultTerms` in db.ts), commission. Callers and the
  owner send `/a/<lead>.<plan>.<exp>.<hmac>` sign-up links (30 days): the client reads the plan and
  agreement, types their name (stored in `signups` with the agreement text), then goes to the payment
  link with `client_reference_id`. The owner ticks "Payment is set up" (no Stripe webhook yet).
  `/api/sales` credits a sale to whoever sent the link, else whoever logged Sold.
- Live sites send cookie-free beacons to `/t/<lead>` (views, call/directions/text taps), checked against the
  site's origin, stored per day in `site_stats`. Lead screen shows this/last month + "Text monthly report".
- Printables (worker-rendered HTML, `cards.ts`): `/api/leads/:id/reviewcard` (4 Google review QR cards) and
  `/api/leads/:id/flyer` (60-day preview link QR; marks a New lead Shown). Custom domains go through the
  Pages domains API (`addDomain` in pages.ts); the lead screen shows the CNAME to add.
- In-person guide (`#/walkin` general, `#/walkin/<leadId>` filled in; owner and callers; `viewWalkin` in app.js): a walk-in
  script with no AI cost: best time to visit by category (`WALKIN_TIMING`), the opener (built from `presence`), what to
  point at on the preview (only features it really has), questions, the middle-plan price line from Settings, asking for
  the yes (Show plans → they sign and pay on the phone), "not today" (text link + flyer + callback), short face-to-face
  objections (`walkinObjections`), plus the sign-up and log cards. Linked from home, the lead screen (open leads), each
  walk-in route stop and the call guide.
- Walk-in route (`#/route`): open leads sorted by distance (leads.lat/lng, cleared on expiry), up to 9 stops,
  nearest-next order, opens a Google Maps directions link.
- Google Business Profile, step 1 (`#/gbp/:id`, `src/copy/gbp.ts`, `leads.gbp_json`): owner-only tools for sold/live
  clients: text the owner the "add us as Manager" steps (Settings → `gbpEmail`), an 11-item tune-up checklist,
  Claude-written description (≤750) + service blurbs, 2 monthly post drafts, review reply drafts. All text is
  checked by `profileTextProblems` (no phone, links, superlatives; length) and pasted by hand into Google.
- Google Business Profile, step 2 (not built): Business Profile APIs, once the owner's Cloud project is approved.
  Requirements (Google prereqs page): a Google account that is Manager on a profile verified and active 60+ days
  with a website, an Organization account, Cloud project number, form at
  https://support.google.com/business/contact/api_default ("Application for Basic API Access"). Then: OAuth
  (scope business.manage) from Settings, sync info, publish approved posts, reply to reviews, and pull
  Performance API metrics (calls, directions, website clicks) into the monthly report.
- Add a business by hand (`#/add`, owner and callers): `/api/places/search?q=` runs one Places text search near
  Cullman (flags existing leads, chains, closed, no phone, website status, guesses the template via `guessCategory`);
  `POST /api/leads/add {placeId, category}` fetches Place Details, inserts the lead (or revives an expired one),
  logs "Added by hand" in the call log and queues the build. Businesses not on Google can't be added: the site
  needs Google's data, so they're pointed at the Google profile setup extra instead.
- Company website: https://undergroundassociates.com (domain on the same Cloudflare account, attached to this Worker
  as custom domains in wrangler.jsonc; www redirects to apex). `src/worker/company.ts` renders it per request from
  Settings (plans, phone, email), so price changes show immediately. Its contact form posts to `/contact` and lands
  in the app Inbox under lead id `company`. Assets use `run_worker_first: true`; the app stays on workers.dev.
- Local testing: `.dev.vars` (gitignored) + `npx wrangler d1 migrations apply website-business --local`
  + `npx wrangler dev --local`, then use http://localhost:8787 (cookies are Secure).
- Don't publish a real business for testing. Use a made-up record and delete the Pages
  project afterwards.
