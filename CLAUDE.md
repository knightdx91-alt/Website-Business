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
- [x] Packs for salons, auto, landscaping, cleaning (24 looks total, all AA-checked).
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
- [ ] Owner to do: our own Google Business Profile + review link
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
- Looks × layouts: a look (`themes.ts`, `looks-more.ts`, `looks-shops.ts`) is colors + fonts; a layout
  (`src/generator/layouts.ts`: classic, split, editorial, poster, soft, minimal, overlap) is page structure, CSS only on
  shared markup. A site's design id is `<look>~<layout>` (bare look = its default layout), stored in `leads.look`.
  `pickDesign` (`src/generator/design.ts`) gives each new site the least-used combination in its category and never a
  sold/live client's. Lead screen → "Try another design" (`POST /api/leads/:id/restyle`); Edit has both pickers.
  Previews from before layouts get restyled on first open if still New (`restyleOldPreview` in preview.ts).
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
  notify; unmatched ones go under `company`, flagged. The team then texts the client's own Buy extras link (where they
  sign and pay). Linked from the Get started page ("Already a client?"), the extras list and the footer.
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
