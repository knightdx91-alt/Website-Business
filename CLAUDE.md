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
- [x] Caller logins (limited access), call log with callbacks, Android app (TWA APK; native Compose app since 2.0, Oct 2026)
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
- [ ] Owner to do: our own Google Business Profile (service-area business, primary "Website designer", services with prices)
      + review link; verify undergroundassociates.com as a Domain property in Search Console and submit /sitemap.xml;
      Chamber of Commerce, Bing Places, Apple Business Connect listings; add `app/public/owner.jpg`
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
  or turning a caller off signs them out. **Callers work leads end to end (owner's rule, Oct 2026, Android 2.46):** edit,
  photos, design, rewrite, publish, domains, sign-ups, Tap to Pay / card sheet, mark paid, board links, Google profile tools,
  review asks, billing portal. Owner / full access only: Settings (plans, prices, extras, agreement, team, integrations),
  Find new leads runs, Sales, Inbox, Costs, backup, refunds, deleting a lead, revoking board links and the practice reset
  (`ownerOnlyAction` in the lead routes + the `ownerOnly()` calls in `src/worker/index.ts`; web `work` vs `owner` in
  `viewLead`, Android `canWork` vs `isOwner` in LeadScreen). `/meta.tap` is sent to everyone; callers' sign-up rows carry
  `dueCents` (not the signer email).
- Call log: `lead_notes` (outcome + note + author) and `leads.follow_up` (YYYY-MM-DD, Cullman time) via
  `POST /api/leads/:id/log`. "No answer" defaults the callback to tomorrow; Sold/Not interested clear it.
  Home shows "Call back today" (due + overdue). A future callback keeps a lead from expiring, capped at 90 days.
  In-person outcomes (Oct 2026, Android 2.33): the card is "Log a call or visit" with `not_in` (🚪 Owner not in: callback tomorrow,
  not counted as reached), `visited` (🚶 Talked in person: like Reached, incl. the cadence next step) and `flyer` (📄 Left a flyer:
  marks Shown + autoCallback, since the flyer carries the preview). `OUTCOMES` in index.ts, `CALL_OUTCOMES` in sales.ts (the
  sales table column is "Calls/visits"), `OUTCOME_LABEL` in app.js and Android Format.kt, the training lesson. The walk-in guide
  (`#/walkin/<id>`, Android WalkinScreen) is the in-person script and carries the same log card.
- Refunds from the app (2.3, Oct 2026): the lead screen's paid sign-up has "↩ Refund" (owner): `GET /api/signups/:id/refund`
  (`refundable` in tap.ts: the customer's succeeded charges with what's left to refund, the plan subscription) and `POST
  /api/signups/:id/refund {chargeId, amountCents, cancelPlan, reason}` (`refundSignup`: Stripe refund, optional subscription
  delete, sign-up unpaid on a full refund with the plan ended, call-log note, alert). The dialog restates the agreement's refund
  rules. Card-sheet payments now also store `stripe_payment_intent`.
- Instant pushes (Oct 2026, 2.15, `src/worker/fcm.ts`, `android/.../push/`): Firebase Cloud Messaging data messages to topic
  `team`. Worker secret `FCM_SERVICE_ACCOUNT` (the Firebase service-account JSON; `fcmJwt` signs RS256 → OAuth token, cached) +
  Settings → "Phone alerts (Firebase)" (`fcmAppId`, `fcmApiKey`, `fcmProjectId`, `fcmSenderId`, public; `/meta.fcm.client`, and
  `/meta.fcm.server` = secret present). Sends: `announceUpdate()` on the minute cron (`* * * * *`, compares R2
  `_build/website-business.json` versionCode with settings key `android_announced_code`) → {kind:"update"}; `notify()` → {kind:"alerts"}
  after Web Push. Android: `Push.init()` in App.onCreate initialises Firebase from Prefs (no google-services.json; `FirebaseOptions`),
  `Push.configure()` after `/meta` stores the values + subscribes to the topic, sign-out unsubscribes; `PushService`
  (FirebaseMessagingService, manifest) runs `Updater.notifyIfNewer` / `Alerts.deliver` (the AlertWorker body, now shared) and emits
  `Push.events` so an open app shows the update pop-up / refreshes the badge at once. Without the secret or the four values the
  15-minute AlertWorker polling still covers everything. Deps: firebase-bom 33.7.0 + firebase-messaging. `test/worker/fcm.test.ts`.
  Health: `GET /api/push/status` (public, read-only, no secrets): `server` (secret parses), `problem` (`serviceAccountProblem()`:
  not set / not JSON + length / missing fields, never content), `tick` (last minute-cron run, settings key `android_announce_tick`),
  `last` ({at, code, ok, error} of the last announcement, `android_announce_last`), `announced`. Oct 2026: the secret once came
  back as exactly 1,024 characters (pasted at an interactive `wrangler secret put` prompt, which keeps one line of ≤1,024); fix by
  pasting the whole file in the dashboard or `wrangler secret put FCM_SERVICE_ACCOUNT < file.json`. `wrangler tail` and the
  observability API are not reachable from the Claude Code container (proxy / token scope), hence the D1 breadcrumbs.
  Owner setup: console.firebase.google.com → Add project (Analytics off) → Add app → Android, package
  `com.knightdx91.websitebusiness` (skip google-services.json) → Project settings → General: App ID, Web API key, Project ID;
  Cloud Messaging: Sender ID → paste the four into Settings; Project settings → Service accounts → Generate new private key →
  the JSON file's content as Cloudflare Worker secret FCM_SERVICE_ACCOUNT.
- Android 2.19 (Oct 2026): the update download showed a full-looking bar and "Downloading…" for a minute: `/api/android.apk`
  streamed R2 without a content-length, so the phone had no total and reported nothing. The route now sends
  `content-length` (R2 `size`); `Updater.downloadAndInstall` downloads over `Api.http`, reports `(read, total)` every 256 KB,
  and the pop-up / Settings show "12.3 MB of 44.1 MB" (indeterminate bar until the total is known); a file under 1 MB is an
  error, and old APKs in the cache dir are deleted first.
- Android 2.17 (Oct 2026): cold starts took up to 30 s. `net/Api.kt` now uses one shared OkHttp client (`Api.http`, okhttp 5.1.0:
  pooled connections, HTTP/2, `fastFallback(true)` so a dead IPv6 route costs milliseconds instead of a 15-second connect wait
  per address, 10 s connect timeout); before, every call opened and closed its own HttpURLConnection. Home loads its four
  requests with `async` at once and no longer loads twice at start (the resume effect skips the first resume); AppRoot fetches
  /meta and the update check side by side. `bytes()` follows redirects; `uploadPhoto()` keeps 120 s timeouts. The one-off
  HttpURLConnection calls in `ApiSales.portal`, `TapApi` and the APK download in `Updater` are unchanged.
- Leads list speed (Oct 2026): `GET /api/leads` selects `LIST_COLS` (the card fields + `has_pitch`) instead of `leads.*`; the JSON
  blobs (place_json alone was 1.6 MB across 114 leads) were being read for every list, and Home loads 3–5 lists at once, which
  made the leads tab spin for seconds. `summary()` takes `has_pitch` when present. Keep new card fields in `LIST_COLS`.
- Android 2.14 (Oct 2026): updates announce themselves. `AlertWorker` (every 15 min in the background) calls
  `Updater.notifyIfNewer()`: one "Update available: X" notification per new versionCode (`Prefs.updateNotifiedCode`,
  id `UPDATE_NOTIFICATION_ID`), whose tap opens MainActivity with extra `update=true` (onCreate or `onNewIntent`, launchMode
  singleTask) → `AppRoot` shows the pop-up ignoring any snooze. While the app is open it also re-checks every 15 minutes
  (`IN_APP_CHECK_MS` loop in AppRoot) and on each resume (at most every 5 min); `clearNotification()` on launch removes a
  stale notification after installing.
- Android 2.13 (Oct 2026): loaders clear `loading` in `finally` (Home, Edit), so a cancelled request never leaves the spinner on
  (2.8's rethrow had skipped the reset after the try).
- Android 2.8 (Oct 2026): every `catch (e: Exception)` in the app is preceded by `catch (e: kotlinx.coroutines.CancellationException)
  { throw e }`. Leaving a screen (or switching a Home tab) while it loads cancels the coroutine; before this the cancellation was shown
  as the error "The coroutine scope left the composition". Keep the pair when adding new catch-alls.
- App name (Oct 2026, 2.7): the app is called **Underground Associates** everywhere (Android `appName`, login screen, web `<title>`,
  top bar "Underground Associates" / "UA", manifest name + short_name "Underground", push titles). Android alerts use the UA seal as
  the status-bar icon (`res/drawable/ic_notification.xml`: ring + UA + bar as a white silhouette, same paths as the launcher
  foreground from `scripts/logo.mts android-icon`), the colour launcher icon as the large icon and orange `#FCA311` as the accent.
- Android app 2.6 (Oct 2026): update pop-up at launch. After sign-in `AppRoot` calls `Updater.newerBuild()` (every open; compares
  `/api/android/version` with `BuildConfig.VERSION_CODE`) and shows `ui/UpdateDialog.kt` ("Update available", Download and install
  with progress → package installer; Later snoozes that version for a day, `Prefs.updateSnoozed*`). Settings → Android app still
  offers the download any time. 2.5 sorted categories A to Z. 2.4: Activity tab on Home; caller alerts cover every lead change
  (see Preview opened). 2.3 added refunds.
- Android app 2.2 (Oct 2026): fully native, no web views. `SignupScreen` (in-person sign-up: plan / way to pay / extras picker,
  agreement sections from `/api/contract.json`, Canvas signature pad → PNG data URL, `POST /api/leads/:id/signups`; then Tap to
  Pay, Stripe's payment sheet (`com.stripe:stripe-android` 22.8.1, SetupIntent via `/api/signups/:id/pay/start|complete`), or
  "Text them the payment link"), `PdfScreen` (any API PDF with PdfRenderer: agreements, contract preview, ACH form, review cards,
  tents, window sign, flyer; print via PrintManager, share via FileProvider), `LeadScreen` with every lead-page card (stats, domain,
  design, publish + zip to Downloads, extras / review texts, billing portal, rewrite, delete). `WebScreen` and `webRoute` are gone.
  The only web engine left is `PreviewScreen`, which renders the client's actual website. Layouts follow the window size
  (`ui/Adaptive.kt`: `LocalWindowInfo`, `LazyVerticalGrid(GridCells.Adaptive(…))` on Home and Edit; Fold closed = one column,
  open / tablet = two). Settings → "Stripe publishable key" enables the payment sheet.
- Android app 2.1 (Oct 2026): every web screen is native now. Added: `EditScreen` (from `/editform`), `PreviewScreen`
  (WebView of `/p/<id>/` in a native frame: phone/desktop toggle, text/copy link, Edit, Open in Chrome), `PlaybookScreen`,
  `ShowPlansScreen`, `WalkinScreen` (copy served by `GET /api/content` from `src/worker/content.ts`, which mirrors the app.js
  constants; `test/worker/content.test.ts` keeps them in step; ways to pay from `GET /api/plans/options?lead=` in
  `src/worker/plan-options.ts`), `InboxScreen`, `SalesScreen`, `AddBusinessScreen`, `RouteScreen`, `GbpScreen`, and the full
  `SettingsScreen` (every setting, team, extras, agreement, backup). API extension functions live in `net/Api<Feature>.kt`.
  The in-app WebView (`WebScreen`) remains only for pages a client reads or signs (sign-up `/a/…`, agreement and contract
  pages, printable flyer / review cards) and the web lead page's long tail ("⋯ More": publish, custom domain, delete).
- Android app (`android/`, 2.0, Oct 2026): a real native app (Kotlin + Jetpack Compose, Material 3), not a web wrapper any more.
  Package `com.knightdx91.websitebusiness`, `MainActivity` = one Compose activity with bottom tabs Leads / Tasks / Alerts / Settings
  (`ui/*Screen.kt`): home (Today card, status tabs, search, type filter, lead cards), lead detail (call/text/directions, call guide,
  preview, log a call with outcome chips + callback day, status, sign-ups + 💳 Take payment by tap, plan buttons → sign-up page,
  call log), native call guide (`PitchScreen`), alerts, tasks, Find new leads (owner). The long tail (site editor `#/edit/<id>`,
  preview `#/preview/<id>`, Show plans, in-person guide, inbox, sales, full settings, the sign-up / agreement pages) opens the web app
  inside the app's own `WebScreen` (WebView with the session as the `wb_session` cookie; tel/sms/geo/intent:// hand off, file
  chooser for photos, downloads). API client `net/Api.kt` (HttpURLConnection + org.json, `Authorization: Bearer <session>`; the
  Worker's `getSession` accepts the cookie value as a bearer token), models in `net/Models.kt`, session in `net/Prefs.kt`
  (app-private SharedPreferences). Alerts: no Chrome, so no Web Push; `alerts/AlertWorker` (WorkManager, every 15 min) fetches
  `/api/notifications` and posts the new ones (channel `team`); opening Alerts marks them seen. Updates: `update/Updater.kt` reads
  `GET /api/android/version` (R2 `_build/website-business.json`, written by `android/build.sh` beside the APK), Settings shows
  "Download and install" (downloads with the bearer token into cache, FileProvider `<pkg>.files`, package installer prompts;
  needs "install unknown apps" once). True silent auto-update needs a Google Play listing (internal testing track is enough;
  US$25 developer account; Play App Signing changes the cert, so add Google's SHA-256 to `ASSET_LINKS` and the Android OAuth client).
  Build: `npm run android` (needs ANDROID_HOME with platform 36 + build-tools 36; the SDK lives outside the repo, e.g. in the
  session scratchpad) → signed arm64 APK ≈44 MB, uploaded to R2 `_build/website-business.apk`, served behind login at
  `/api/android.apk` (also the web Settings card). Signing key: `$KEYDIR/website-business.jks` (default ~/.website-business-keys),
  deliberately NOT backed up (owner's choice); if lost, build.sh makes a new one → Google's Android OAuth client needs the new SHA-1
  and phones reinstall. Current cert SHA-1 `51:63:58:A2:3D:6B:62:36:AF:26:FD:66:B9:25:69:2D:8F:58:43:B3`, SHA-256
  `AB:07:5A:34:…:CE:A3:16` (second entry in `ASSET_LINKS`). Deps: Compose BOM 2025.10.00, navigation-compose 2.9.3, Credential
  Manager 1.5.0 + googleid 1.1.1, work 2.10.3, Stripe Terminal 6.0.0; Kotlin 2.3.21 (matches the Stripe SDK). The manifest forces
  `ACCESS_FINE_LOCATION` with `tools:node="replace"` (a library caps it at SDK 30, which would break Tap to Pay on Android 13+).
  Maven Central rate-limits builds here, so `settings.gradle.kts` lists Google's mirror first. `ASSET_LINKS` stays in index.ts.
- App-only endpoints for the fully native Android app (Oct 2026): printables as PDFs drawn with `drawPdf()` in pdf.ts
  (`GET /api/leads/:id/{reviewcard,tents,window,flyer}.pdf`, builders in cards.ts; `qrGrid()`); `GET /api/contract.json?lead&plan&
  billing&picks=i:q,…` (agreement sections for the native sign-up, `contractSections`/`parsePicks` in signup.ts); `POST
  /api/leads/:id/signups` (owner + callers; `appSignup`: the same checks and notes as the sign-up page's POST, signature as a PNG
  data URL from the native pad) → `{signupId, dueCents, renews, invoice, checkoutUrl, agreementPdf, tapReady, cardReady}`; native
  card entry with Stripe's payment sheet: `POST /api/signups/:id/pay/start` (SetupIntent, needs Settings → "Stripe publishable key"
  `stripePublishableKey`; `/meta.checkout.cardReady`) and `POST /api/signups/:id/pay/complete {setupIntentId}` (charges today's
  amount off-session, then `activatePlan()` in tap.ts, shared with Tap to Pay, starts the subscription one period ahead).
  The Android app shows PDFs with `PdfScreen` (PdfRenderer + print + share) and signs clients up in `SignupScreen`.
- Editor as data (Oct 2026, `src/worker/editform.ts`): `GET /api/leads/:id/editform` returns the Edit screen as cards and fields
  (types text/textarea/check/select/number/url/tel/email/date/heading/note/hidden; special card kinds photo / gallery / spanish /
  design carry the hero source, gallery thumbnails and whether a Spanish page exists) for the lead's category and variant, with the
  same field names as the web editor's form elements; `PUT /api/leads/:id/editform {values}` turns the values back into the same
  `/edits` payload (`editsFromForm`, a port of viewEdit's save handler and every `*EditValues` helper) and returns `warnings` for bad
  event/offer dates. The Android `EditScreen` renders it generically. When a card or field is added to the web editor, add it here too
  (`test/worker/editform.test.ts` round-trips every example business; the retail gift-card checkbox is `giftCardsSold` here because
  the web form reuses `giftCards` for the link).
- Google sign-in (Oct 2026, `src/worker/google.ts`, migration 0015 `users.email`): the team signs in with their company Google
  Workspace account. Web: the login page shows Google Identity Services' button when Settings → "Team sign-in (Google)" has a
  client ID (`googleClientId`; `index.html` loads accounts.google.com/gsi/client); Android: Credential Manager →
  `GetGoogleIdOption(serverClientId = the same web client ID)`. Both POST the ID token to `POST /api/auth/google`; the Worker
  verifies RS256 against Google's JWKS (`verifyGoogleIdToken`: iss, aud = client ID, exp, email_verified) and
  `onCompanyDomain` (address AND `hd` claim on `googleDomain`, default undergroundassociates.com), then `googleSession`:
  `ownerEmail` → owner; a `users` row with that email → their role (disabled rows refused); any other address on the domain →
  a new caller row (password `google.<uuid>`, unusable; the owner is notified) which Settings → Team shows with "Google sign-in
  only". The response sets the cookie and returns `token` (same value) for the app. `GET /api/auth/config` (public) carries the
  client ID, domain, `requireGoogle`. The app shell's CSP (`app/public/_headers`) must allow accounts.google.com/gsi/ in
  script-src, connect-src, frame-src and style-src, or the button never renders (it did not until Oct 2026; the login page
  now says so after ~9 s instead of staying blank). `requireGoogle` (Settings checkbox "Turn passwords off") makes `/auth/login` refuse
  passwords; the owner's password login keeps working until then (and `/auth/setup` always). Team rows take an email
  (`POST/PUT /api/callers` `email`; add form: email and/or password). Owner's one-time Google Cloud setup: OAuth consent
  screen (Internal, Workspace) → credentials: a **Web application** client (authorized JavaScript origin
  https://website-business.knightdx91.workers.dev; paste its ID into Settings) and an **Android** client (package
  `com.knightdx91.websitebusiness`, the signing SHA-1 above; no ID to paste). The owner's Google address goes in Settings →
  "Owner's Google address" (the owner session still needs `owner_password` set, which it is). `test/worker/google.test.ts`.
  Done Oct 2026 (Cloud project 322487745515): Web client `…-39uoftmq9b43htr4k6thsebt0k7pded6` is in Settings (`googleClientId`);
  Android client `…-aku343iill2rs8jjtodi8orsq5d7fs5k` exists and is used by nothing in code (Credential Manager only takes the
  Web ID). Which is which was checked by sending Google a custom-scheme redirect: only the Web client is refused.
- Settings sections fold (Oct 2026, 2.11): Android `CollapsibleCard` in `ui/Common.kt` (header tap opens/closes, chevron, state per
  title via rememberSaveable; Settings uses it for every section, "Signed in" open by default; form state is hoisted so folding never
  loses typed values) and web `collapsibleSections()` in app.js (after the Settings render: each `section.card > h2` folds its
  body, remembered per heading in localStorage `fold.<heading>`). Since Oct 2026 the web business form (`form#sf`) folds
  too: every direct `h2` of the form (Your business, Website, Team sign-in, Phone alerts, Plans & prices, Ways to pay, Extras,
  Team goals, Runs) gathers what follows it up to the next heading or the sticky Save into a hidden div (`fold.form.<heading>`,
  all closed by default, nodes moved not recreated so hidden fields still submit; a browser validation error on a folded field
  opens its section first). Other screens keep plain `SectionCard`.
- 📖 Guides (Oct 2026, `src/worker/guides.ts`; `GET /api/guides/<id>`, owner + callers; web `#/guide/<id>` `viewGuide`, Android
  `ui/GuideScreen.kt` 2.28, route `guide/{id}`): how-to guides with the exact buttons to tap, prices filled from Settings
  (`tankBoardGuide(s)`: the Price list plan line, the QR tag extra's price, `APP_ORIGIN` for the display address). Buttons in
  Settings → "📖 Guides" (web) / Settings → More (Android). First guide `tankboard`: the four pieces, what we sell it for, set a
  shop up, give them the board, how the shop uses it, how a change reaches the site, QR price tags, tablet display, selling it,
  trouble. Second guide `pricetags` (the QR price tags extra): what a sheet is (8 labels, 3.75 × 2.5 in, QR → `#sec-<slug>`),
  before you can print (live site, sections), printing (100%, sticker paper, laminate, scan-test, approve layout first), when to
  reprint (renamed/added sections, never for prices), how to sell it (sign-up extras, Buy extras link, quantity = sheets, who
  buys), after they pay, trouble. Third guide `display` (tablet display): what it shows, getting the `/d/` address from the
  board's 📺 links, setting a tablet up (home screen, screen timeout, plugged in, app pinning), mounting, what the shop needs to
  know, selling it (free with the plan; tablets are the shop's own), trouble. `test/worker/guides.test.ts`. Add a guide:
  a builder in guides.ts + `guideById` + a button.
- 🐠 Show them the Tank board (Oct 2026): a customer-facing page for a shop, like Show plans (light, app bar hidden): web
  `#/showboard/<leadId>` (`viewShowBoard`), Android `ui/ShowBoardScreen.kt` 2.31 (route `showboard/{lead}`), button next to
  "Show them the plans" on retail leads (owner + callers). `GET /api/leads/:id/showboard` = `customerBoardPitch(s, {business,
  live})` in guides.ts (How it works / What you do / What your customers get / What <company> does, price lines from Settings,
  a live-or-not closing line) + `displayUrl`. Buttons: "Try the board on this phone" (POST /clientlink → opens it), "See the
  tablet view" (`/d/<id>/`), "See the plans", and "💬 Text them this page" (also on the lead's Tank board card, Android 2.32):
  `POST /api/leads/:id/boardlink` (owner + callers) → `/b/<leadId>.<exp>.<hmac>` (`boardPitchToken` / `verifyBoardPitch` in
  auth.ts, 30 days, 410 after) = `customerPitchPage()`: the same words as a public, noindex page with "Open your Tank board"
  (their `clientLink`, made on first use), the tablet view, undergroundassociates.com/pricing#price-list and "Text us a question".
- 💵 Costs & usage (Oct 2026, `src/worker/costs.ts` + `meter.ts`, migration 0019 `usage_daily`; web `#/costs` `viewCosts`
  (owner + full access, route-gated like Sales), Android `ui/CostsScreen.kt` 2.36 (route `costs`, Settings → More), buttons in
  Settings; guide `costs` "What keeps the app running"): for whoever minds the bills (Brenda). `SERVICES` lists every outside
  service with what it does for us, kind (fixed / usage / fees / free), default price (Oct 2026: Cloudflare Workers Paid $5/mo,
  domain $10.44/yr, Workspace $8.40/user/mo, dev tools blank), billing URL, "if it stops", a tip, and usage `rates`
  (metric, cents each or per million tokens, free units a month: Places search 3.5¢ / details 2¢ / photo 0.7¢ with 1,000 free
  each; Opus 5.5 $4/$20 per M in/out, cache read $0.20, write $5; Sonnet 5.5 $2/$10/$0.20/$2.50; Haiku 5.5 $0.10/$0.50; Brave
  0.3¢ after 2,000 free; Resend free to 3,000; FCM / OFF free). The meter: `installMeter()` (index.ts module load) wraps global
  `fetch` once per isolate and classifies hosts (`classify`: places search/details/photo, brave, email, push, openfoodfacts,
  anthropic → the response is cloned and `usage` read per model: `.calls/.in/.out/.cache_read/.cache_write`); counts buffer in
  memory and `flushUsage(env)` upserts `usage_daily (day, metric, qty)` at the end of every request (`ctx.waitUntil`), queue
  batch and cron (the three handlers now delegate to `handle` / `handleQueue` / `handleScheduled`). Stripe fees are estimated
  from this month's paid sign-ups + purchases (2.9% + 30¢), revenue from `salesDashboard`. `costsReport()` → totals (fixed,
  usage, fees, out, revenue, signed), per-service `usage` lines (this month / last month / est after free tier / % of free
  used), `perMonthCents` (yearly ÷ 12), warnings (≥80% of a free tier, renewal within 30 days or past, blank price, over
  budget; default budget $150), unknown Anthropic models priced at the Opus rate with a note. Edits (`PUT /api/costs`
  {services:{id:{monthlyCents, renews YYYY-MM-DD, account, notes}}, rates:{metric:{unitCents, freeQty}}, budgetCents}) merge into
  settings key `costs_json`, so price changes never need code. Daily cron `costAlerts()`: one 💵 alert (kind `costs`, owner /
  full access only) per new warning per month (settings key `costs_alerted.<YYYY-MM>`). `test/worker/meter.test.ts`,
  `test/worker/costs.test.ts`. Not measured: Cloudflare's own usage (far inside the plan) and the dev subscription.
- 🎓 Training (Oct 2026, `src/worker/training.ts`, migration 0017 `training_done`; web `#/training` `viewTraining`, Android
  `ui/TrainingScreen.kt`, 2.10): an in-app course for owner and callers, Home → "🎓 Training" (also Settings). 12 lessons (what
  we sell, where leads come from, before you call, showing the preview, logging calls, signing up, taking payment, finish &
  publish [owner], their domain & email [owner], after the sale, the live price list [board, tags, tablet], barcode scanning on
  the tablet), each with the exact buttons to tap, a "Try it now" exercise
  (on the Payment test lead where money is involved), 1–2 quick-check questions and Mark done. `GET /api/training` returns the
  lessons with {company}/{plan} placeholders filled from Settings ({perDay} = the cheapest website plan as "under $2 a day",
  {listPlan} = the Price list plan with its price) plus this person's `done` ids; `PUT /api/training/progress
  {lesson, done}`. Progress is per `session.userId` ('owner' or users.id). When a button or screen is renamed, update the
  lesson text here. Reviewed Oct 2026 against the apps' real labels (👍 Interested not "Showed them", 💳 Tap card on this phone,
  Publish to Cloudflare / Republish changes, "Their own domain", Review cards, the 👀 opened-preview card line, the Tap to Pay
  phone rules); `test/worker/training.test.ts` checks placeholders, answer indexes and the button names the new lessons quote.
- Their current website as facts (Oct 2026, `src/places/site-import.ts`): when a lead has a site (`lead.found_url`, else the
  Google `websiteUri` unless it's social), `runBuild` fetches it (8 s, HTML only, 400 KB) once per 7 days or on a rewrite,
  `extractSiteFacts()` keeps title, description, h1–h3, deduped paragraphs ≥ 40 chars (cookie/copyright/newsletter filler
  dropped), phones, emails, social links, a "since YEAR", and `notices` (closing / moving / reopening lines), stored as
  `record.existingSite` (type `ExistingSite`). `applySiteFacts()` fills email, founded year and empty social links, never
  overwriting. The copy writer gets it as `<existing_site>` (`existingSiteText()`), the SYSTEM prompt says use the facts but
  write fresh and keep move/closure notices out of the copy; `check()` flags any copied sentence (`quotesReview` on the
  paragraphs) so the writer retries. Edit shows a read-only "Their current website" card (web + editform, collapsed). The
  container's proxy blocks many outside sites, so test the fetch from the Worker, not here. `test/site-import.test.ts`.
  Photos too: `extractImages()` keeps their own `<img>`s (src / data-src / largest srcset; GoDaddy `/:/rs=…` resize suffix
  dropped; logos, icons, pixels, and builder stock paths like `/isteam/stock/`, unsplash, pexels, shutterstock skipped; ≤ 12),
  `fetchSitePhotos()` downloads up to 12 (jpeg/png/webp, 25 KB–8 MB), `importSitePhotos()` in pipeline.ts stores them at
  `owner/<id>/s<n>.<ext>` with `source: "site"`: the first becomes the hero when the record only has a Google photo, the rest
  fill the gallery to 24; re-imported on rewrite or when none are left, owner uploads untouched, never for churches.
  Publishing needs `confirmed` **`site_photos`** ("Photos from their old website are theirs (not the site builder's stock)",
  Confirm card on web + editform) or the preview shows a REQUIRED to-do (render.ts `withExtras`).
  When the server can't read the site (King Fish Aquatics' GoDaddy host never answered within 15 s, and its photos are filled
  in by scripts anyway): `record.siteImport {url, triedAt, error}` is kept and shown (Edit card, Android lead header), and the
  Android app (2.22) has **"⬇️ Import their website (text + photos)"** on the lead header: `ui/SiteImportDialog.kt` loads the
  page in a WebView (scripts run), scrolls it so lazy photos load, collects `outerHTML` + every `<img>` / srcset / CSS
  background image ≥ 200 px, and POSTs to `POST /api/leads/:id/siteimport {url, html, images}` (owner): `extractSiteFacts` +
  `cleanImages`, `via: "app"`, `importSitePhotos`, auto-match, then `rewrite=1` + a build job. `runBuild` never refetches an
  `app` read while it's under 7 days old. `detail()` carries `website`, `siteImport`, `existingSite` {url, fetchedAt, via,
  images, paragraphs}. Web Push / browser can't do this (cross-origin), so it's Android-only.
- Directory pages are never "their website" (Oct 2026): RPS Tire Shop's "page elsewhere" was rps-tire-shop.localtireshops.net, a
  scraped directory whose text is machine-written from Google data and whose photos are Google Maps photos of the business AND
  its neighbours; the phone import copied six other tire shops' photos into the gallery. Now: `isDirectoryPage(url, title)`
  in site-import.ts (`DIRECTORY_HOST`: local<trade>s.net/com, loc8nearme.com, *near-me, *directory, *listings; `DIRECTORY_TITLE`:
  "| Local Tire Shops" / "directory" / "near me" title tails) is checked by `pickPage` (never a found page), `importSiteDetailed`
  (error "a directory's listing") and `POST /siteimport` (422). `GOOGLE_HOSTED` (googleusercontent, ggpht, maps.googleapis,
  gstatic, Street View) images are dropped everywhere like stock: Google photos are never re-hosted. Undo: Edit → "Their current
  website" → "✖ Not their website: remove this text and its photos" (web; Android 2.27 lead header; owner) = `DELETE
  /api/leads/:id/siteimport` → `forgetSiteImport()` in pipeline.ts: deletes R2 `owner/<id>/s*`, drops `source: "site"` gallery
  photos and price-list item photos, restores the Google hero (`heroFromPlace`), clears `existingSite` / `siteImport` /
  confirmed `site_photos`, sets `found_url` NULL (presence `elsewhere` → `none`, reason "No website …") so the next build
  doesn't read the page again, `rewrite = 1`, queues a build. The minute cron also runs `requeueStuck()` (builds "queued" for
  20+ min get their job sent again, 5 a minute). RPS Tire Shop and Otto Mechanic (loc8nearme.com) were reset this way by SQL.
  Second find on RPS: Google's own profile linked lomyu.me → bizsite.link/rps-tire-shop-511316-us ("RPS Tire Shop - Locations
  from All Over the World"), a spam site generator with generic AI pictures (the "restaurant photo"), so the rebuild re-imported
  it from `websiteUri`. `isDirectoryPage` also matches those hosts, that title and the `/<slug>-511316-us` path shape;
  `isJunkSite()` in qualify.ts makes `webPresence` return "none" for them (runs and hand-adds pitch them as no website), `runBuild`
  skips them as `siteUrl`, and `detail().website` hides them so there's no Import button.
- Pages elsewhere (Oct 2026, `src/places/web-presence.ts`, migration 0016 `leads.found_url`): Google only reports the website linked
  on the profile, so "No website" can be wrong (Luna's BBQ has a page on stonebridgewedding.com). With Worker secret
  `BRAVE_SEARCH_API_KEY` (Brave Search API, free 2,000 queries/month, ~$3/1,000 after; without it nothing changes) the app runs one
  web search, `"<name>" <town> AL`, for every "none"/"social" lead: in search runs (`MAX_WEB_CHECKS` 15 per job), when a lead is
  added by hand, and for the first 4 open results of the Add-a-business lookup (sequential: the free plan is 1 request/second).
  `pickPage()` skips directories / social / delivery / news / .gov hosts (`IGNORED_HOSTS`) and takes a *registrable* domain carrying
  the name (own; a name-bearing subdomain on a platform such as pops-cafe-hanceville.res-pick.com is a page elsewhere, host =
  the platform) or a page whose title starts with the name or carries the whole name in title + path (parent page). Own domain →
  `websiteProblem()`: broken = presence `outdated` "(site not linked from Google)", working = `has_site` (runs skip it, hand-adds
  keep it); parent page → new presence **`elsewhere`** ("Page on <host>, not linked from Google", +5 score). The URL is stored
  in `found_url` / `foundUrl` and shown on cards and lead screens ("🔗 Found page"); the walk-in opener and the call guide
  prompt have wording for it (the reason text carries it). `test/web-presence.test.ts`. "🔎 Re-check website" (owner, lead header
  on web and Android 2.12; `POST /api/leads/:id/webcheck`) runs the search for one lead on demand and updates presence / reason /
  found_url / score (409 when the secret is missing).
- General pack (Oct 2026, `packs/general.ts`, category `general`): the catch-all so any business gets a site without a code change.
  `guessCategory` never returns null now (unknown → `general`); Add a business offers "Something else" (web `PACKS`, Android
  `ADD_PACKS`), `/leads/add` accepts it. `record.typeLabel` (Google's `primaryTypeDisplayName`, set for every category in
  `placeToRecord`) is the label everywhere ("Gym", "Pet Store"); the variant is Google's raw primary type (`gym`), mapped to a
  schema.org subtype by `SCHEMA_BY_TYPE` (else LocalBusiness). Services start EMPTY with the REQUIRED to-do "List what you do";
  storefront (street shown) → hours, Visit, message form, Call + Directions (Book first when `links.booking`); no street →
  service area, three steps, quote form. Copy brief is written around the type; `generalBannedPhrases` blocks award/best/
  guarantee/certified/free/licensed claims. 25 looks in `looks/general.ts` (best fits town_square, clean_slate, warm_welcome,
  night_shift), DNA `PREFS.general` + 4 recipes, example "Iron Ridge Fitness" (gym), company-site page
  `/websites-for/other-businesses`. The generic Edit cards (text, hours, services, photos, links, design, proof) cover it;
  there is no category card. When a trade shows up often, write it a real pack; until then it builds here.
- Run picker = search groups (`src/places/queries.ts` SEARCH_GROUPS; `/meta.categories` serves them A to Z by label, Oct 2026). Several groups share one
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
- Kind of shop (Oct 2026): The Parts Store, LLC (Hanceville; Google type `auto_parts_store`) was built before the parts variant existed,
  so its record said `general` and the copy sold repairs. `setAutoVariant(record, kind)` in packs/auto.ts re-kinds a record (services
  still equal to the old kind's seed are reseeded, a parts store gets `ext.auto.parts` and no service area); `runBuild` calls it on a
  rewrite when an auto record is `general` but `autoVariant()` now says otherwise, and Edit → "Auto shop details" / "Auto parts
  details" has a "Kind of shop" select (web `autoKindField`, editform `autoKind` via `AUTO_KIND_OPTIONS`, `edits.record.autoKind`
  zod over `AUTO_VARIANTS`); the /edits and /editform routes queue a rewrite when the kind changed, so the words follow the sections.
  `test/auto-kind.test.ts`.
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
- Price list + QR price tags (retail pack, Oct 2026; built for Kingfish Aquatics' tank prices): `ext.retail.priceList`
  {sections (MenuSection[], same text form as a menu: `# Section`, `Name | $Price | Note`), lastUpdated, title (default
  "Prices"), public (default true)} → `/prices/` page (`pricesPage()` in retail.ts, menu-page markup, section anchors
  `#sec-<slug>` from `sectionSlug()`), nav link when public; `public: false` = `PageSpec.noindex` → `<meta name="robots"
  content="noindex">`, out of the sitemap and the nav (reachable only from the labels; for shops that don't want competitors
  reading prices). Edit → Shop details → "Price list & QR labels" (`rtPriceList` / `rtPriceTitle` / `rtPricesPublic`; edits
  `retail.priceListText|priceListTitle|pricesPublic`; the date bumps only when the text changes). Printable: `GET
  /api/leads/:id/pricetags.pdf` (owner, live sites) = `priceTagsPdf()` in cards.ts, Letter sheets of 8 labels (2 × 4,
  3.75 × 2.5 in), one per section, QR → that section. Buttons "QR price tags" on the Live card (web + Android, retail only).
  Extra "QR price tags & shelf labels" $49 each (DEFAULT_ADDONS + live Settings + `STANDARD_EXTRA_TERMS`); the page itself is
  included in every plan. Call guide mentions it (`pitch.ts`). `test/worker/price-list.test.ts`. Items carry a photo
  (`MenuItem.image`, a gallery file, rendered `menu-item--photo` on /prices/): `autoMatchPhotos()` pairs gallery captions
  with item names (after photos come over from their old site, and on every list save), retyping keeps photos by item name,
  and Edit → "Item photos" (`pi_name_i` / `pi_img_i`, edits `retail.priceItems`) overrides. Gallery cap is 24 (was 12).
- Example sites carry sample stock (Oct 2026): the pure sample-stock code lives in `src/generator/sample-stock.ts` (the worker's
  `sample-stock.ts` re-exports it) so `src/examples/examples.ts` can call `withSampleStock(record)` for Magnolia Table Cafe (a
  bakery case, "Today's case"), Crossroads Auto Care (parts, "In stock") and Willow & Wren Boutique (goods, "In stock"); the
  `sample` flags are stripped there because example sites build in publish mode. Their /prices/ pages are linked from /price-list
  (hero button + the three example links), the pricing strip ("See an example") and the portfolio cards ("See its live price
  list"). `npm run examples` rebuilds them (screenshots too).
- 🧪 Sample stock for previews (Oct 2026, `src/worker/sample-stock.ts`): when a prospect is interested in the inventory system,
  the lead page's board card has "🧪 Add sample items (preview only)" (owner / full access; web + Android 2.39) = `POST
  /api/leads/:id/samplestock` → `addSampleStock(record)`: believable made-up stock for their kind of business (`SETS`, picked by
  `listKind` then a name / `typeLabel` / variant regex: parts, tires, vehicles, fish, plants, pets, bakery case, produce stand,
  butcher, hardware, feed & seed, thrift / antique, boutique default), each item `MenuItem.sample: true`, appended after any real
  sections (a clashing name gets "(sample)"), kind set when blank, preview rebuilt via `saveAndRefresh`. "Remove sample items" =
  `DELETE` → `removeSampleStock` drops exactly the flagged items, empty sections and sample-only catalog names (a list left with
  nothing disappears). `detail().sampleStock`; the same toggle sits on the preview screen (web `viewPreview` → "🧪 Add / Remove sample items" next to Full screen, reloads the frame on /prices/ after ~3.5 s; Android 2.40 `PreviewScreen`); `applyPriceListEdit` keeps the flag through a retype; the board shows a 🧪 notice + chip and its saves keep the flag (`ItemsBody.sample`,
  `applyClientItems`); the feed carries `sample`; the preview's /prices/ page shows a "Sample items." note (preview mode only) and
  the home page gets a "What's in right now" teaser (`priceListTeaser` in pricelist.ts: up to six in-stock items, photos first, section + "n left", "See everything: <title>" → /prices/; every category; never for a private list; inserted before the closing CTA in `withExtras`); sample items without a photo get a placeholder tile with the kind's emoji (`.menu-item__img--ph` / `.tile__img--ph`, also in the client script's live render from `feed.words.emoji`), so the photo layout shows before the shop has taken any; `BuildInput.allowSamples` (example sites + the tests that publish them) skips the to-do; render.ts adds the REQUIRED to-do "Remove the sample items from the price list", so `buildSite` in publish mode throws
  "Publish blocked" while any remain; the call guide says "(filled with SAMPLE items …)". Guide "Selling it" + training lesson say
  to fill it before showing. `test/worker/sample-stock.test.ts`.
- Add to home screen with the shop's name (Oct 2026, `src/worker/homescreen.ts`): the board serves a per-shop web app manifest at
  `/c/<token>/manifest.webmanifest` (name "<Shop> · <Board name>", short_name the shop name when ≤14 chars, start_url/scope the
  signed board folder, standalone, navy theme) and `/c/<token>/icon.svg` (`appIconSvg`: navy rounded square, gold initial; the brand
  PNGs ride along for Chrome's 192/512 rule); the tablet display has the same at `/d/<id>/manifest.webmanifest[?tank=<slug>]` +
  `/d/<id>/icon.svg` (`serveDisplayMeta`, public, display fullscreen, one app per tank page). `homescreenHead()` adds the manifest
  link + iOS meta; `homescreenPrompt()` is the bar "Add <Shop> to your home screen" (Chrome's `beforeinstallprompt` → Add calls
  `prompt()`; iPhone shows Share → Add to Home Screen words after 1.5 s; never when already standalone; "Not now" snoozes 30 days in
  localStorage `a2hs.<key>`). The texted board link and the guides say to tap Add. Headless check: scratchpad `a2hs-check.mjs`.
- Hardware is never ours to supply (Oct 2026, owner's rule): the "Tablet display, supplied & set up" and "Barcode scanner, paired to
  the tablet" extras added earlier that day were removed from DEFAULT_ADDONS, live Settings and every page the same day. Tablets and
  handheld scanners are the shop's own purchase; we show them how (display guide). Don't add offerings that commit the business to
  buying, delivering or warranting anything without asking the owner first; the `/tablet/` and `/scanner/` STANDARD_EXTRA_TERMS stay
  only in case the owner adds such an extra deliberately.
- Inventory add-ons + Barcode scanning add-on (Oct 2026): `AddOn.group` ("general" | "inventory"; `addonGroup()` guesses from the
  name for older Settings via `INVENTORY_EXTRA`; `inventoryAddons()` / `generalAddons()`). Inventory add-ons are listed under their
  own heading everywhere: company /pricing (`extrasHtml` → "Inventory add-ons" block, `#inventory-addons`), /extras, /price-list
  "What it costs" (loops over the group), the sign-up / Buy extras picker (`pickerHtml`: first on the Price list plan, after the
  general extras otherwise), web Show plans + Plans & answers, Android 2.38 ShowPlans / Playbook / Signup; Settings → Extras has a
  group select (web) / chips (Android); `/api/plans/options` addons carry `group`. New default extra **"Barcode scanning" $15/month**
  (DEFAULT_ADDONS + live Settings + `STANDARD_EXTRA_TERMS` /scanning/ + OFFER_HINT): scanning is now a per-shop switch,
  `priceList.scanning` (`scanningOn(record)` in pricelist.ts: explicit value, else on when any barcode is already stored, so King
  Fish-era shops keep it). Edit → Live price list / Shop details → "Barcode scanning on" (web `plScan` / `rtPriceScan`, editform
  `plScan`, edits `priceList.scanning` / `retail.priceScanning`). Off: no Scan button on the board or the tablet, per-item ▦ hidden,
  `/l/<id>/staff/find` and the board's `GET /c/<token>/lookup?code=` return 403. On: the phone board has **"▦ Scan"** in its bottom
  bar (`scanHit` in boardPage: a known code shows name / section / count with − n + and Put in / Take out; an unknown code calls
  `/lookup` (`findByBarcode` → catalog → `lookupBarcode`) and asks name / price / section (or a new one), then "Scan the next one").
  The list plan's includes line no longer says "scan barcodes"; guides, training (lesson "Barcode scanning (the add-on)"), the
  customer pitch and the company pages call it an add-on and say how to switch it on. Headless check: scratchpad `board-scan.mjs`
  (fake BarcodeDetector + getUserMedia via addInitScript).
- Company site audit (Oct 2026): every plan card says the live price list is included (Basic includes line in live Settings +
  SUGGESTED_PLANS mirrors), the pricing page says it under the cards and in two FAQs, the home FAQ has "My prices or stock change
  all the time", `priceListHtml` shows on the shops, auto, other-businesses, restaurants and lawn-care trade pages, the auto /
  restaurants / lawn-care / other-businesses trade pages name their inventory use (parts counter, bakery case, nursery bench, car
  lot), /price-list prices the tablet / scanner / stock-list extras from Settings, /terms covers supplied hardware, /privacy lists
  Resend, Brave Search, Firebase pushes, the barcode lookup and the board. Live Settings: "Rush build" renamed "Same-day build".
- Naming (Oct 2026): the product is the **board**, generic name "Stock board"; each shop sees its kind's name (`KINDS[kind].board`:
  Tank board / Bench board / Enclosure board / Case board / Parts board / Lot board / Stock board) via `detail().boardName`,
  `kindWords(record).board` (texted links, the `/b/` customer page's `board` option, tablet unlock text) and the guide wording.
  "Tank board" now appears only as the fish kind's own name and in code comments; the guide id `tankboard` and `tankboard.ts`
  keep their historical names. Guide title "📋 Live inventory: the board, price page & QR tags" (web button + Android 2.37
  "📋 Live inventory guide").
- ⬆️ Whole-inventory import (Oct 2026, `src/worker/stock-import.ts`; built so an auto parts store can use the inventory system
  without typing): the board's "Put a whole list on at once" section (every kind; `POST /c/<token>/import {text, mode, section?,
  columns?, hasHeader?, dryRun?}` = `runImport` in tankboard.ts) takes a paste from Excel / Sheets (tabs) or a .csv (register /
  POS export; `parseTable` picks the delimiter, handles quotes + BOM), `detectColumns` guesses name / price / qty / barcode /
  section / note from POS-style headings (`HEADERS`) or from the data when there's no heading row, and maps columns matching the
  kind's info-card fields (Part #, Fits, Brand, …) to `info:<key>` → `ItemInfo.facts`; the page shows the guess with a drop-down
  per column ("Check it first"), a heading-row tick, the fallback section, and Add & update (`merge`: match by barcode then name,
  photos/cards stay) or Replace everything (`replace`: sections rebuilt, photos/cards/barcodes back by name; duplicate rows in one
  section add up). Caps `IMPORT_MAX_ITEMS` 2,000 / `IMPORT_MAX_SECTIONS` 100 (ItemsBody raised to 100 × 2,000). `GET
  /c/<token>/export.csv` (`exportCsv`: section, name, price, how many, barcode, note, sold out + the kind's card fields) is the
  backup and the template. The board shows a Find box at 15+ items (name / barcode / section) and kind-aware note hints. Extras
  added (DEFAULT_ADDONS + live Settings + STANDARD_EXTRA_TERMS + OFFER_HINT): "Tablet display, supplied & set up" $99 each,
  "Barcode scanner, paired to the tablet" $59 each, "Stock list loaded for you" $49 one-time. Plan copy updated for the inventory
  system everywhere (DEFAULT_LIST_PLAN / SUGGESTED_PLANS includes, PLAN_TAGLINE.list, EVERY_PLAN live-price-list line,
  PLAN_PITCH.list, LIST_PLAN_NOTE, call-guide lines in pitch.ts for any category with sections + retail / auto parts / vehicles
  without), the guide gained "Getting a whole inventory in" (title now "Live inventory: …"), /price-list FAQ ("How do I get my
  whole inventory in?", "Is it only for fish stores?"), the training lesson, the texted board link (kind words). Standalone use
  = the Price list plan on a hand-added lead (the business must be on Google). `test/worker/stock-import.test.ts`.
- 🐠 Tank board (Oct 2026, `src/worker/tankboard.ts`, migration 0018 `leads.client_key` / `prices_dirty`; built for King Fish Aquatics, whose
  tanks change several times a day): the client's own live editor for `ext.retail.priceList`, no login. The team taps "💬 Text them their
  tank board link" / "Open it here" on a ready retail lead (web lead page, Android `LeadScreen` 2.25; `POST /api/leads/:id/clientlink`,
  owner + callers) → `/c/<leadId>.<hmac(APP_SECRET, client.<id>.<client_key>)>/` (key made on first use; a new key would revoke old links).
  The page (`boardPage`, plain HTML/JS, phone-first) lists sections (tanks) and items: name, price, how many, note, a photo from the
  camera (resized to 1600 px in the browser, `POST …/photo?section&item&w&h` → R2 `owner/<id>/c….jpg`, gallery cap 24), "Sold out"
  chip, add/remove/move tanks; every change autosaves (`PUT …/items`, `ItemsBody` zod, `applyClientItems` keeps photos by file +
  `autoMatchPhotos`, `lastUpdated` stamped) and re-renders the preview. `MenuItem.qty` / `soldOut`: the /prices/ page hides sold-out
  and qty 0 items and shows "n left" at ≤5. Live feed `GET /l/<leadId>/prices.json` (public, CORS, 30 s cache; `pricesFeed`) and
  `GET /l/<leadId>/photo/<file>`; every built copy of the site gets `liveData` (`BuildInput.liveData` → `<div id="prices-live"
  data-live>`; previews point at `/l/…`, published sites at the app origin) and the client script refetches it on load, so the QR
  label on a tank shows the change within about a minute. Live sites get `prices_dirty = 1` and the minute cron republishes them
  (`republishDirty`, 2 a minute, after `announceUpdate`). `test/worker/tankboard.test.ts`. "Revoke old links" (owner; `DELETE
  /api/leads/:id/clientlink` = a new `client_key`, every link sent so far dies; web + Android 2.26). **Tablet display**
  `/d/<leadId>/<tank-slug>` (`serveDisplay`; no slug = every tank, rotating every 10 s): a full-screen dark page for a cheap
  tablet or TV by the tank (big name + price, photo, "n left", wake lock, re-reads the feed every 30 s; public like the feed,
  noindex). The board has a 📺 link per tank and an "All tanks, rotating" link in its footer.
- Tablet station (Oct 2026, `src/worker/tablet.ts`; the `/d/` page moved here from tankboard.ts): the tablet by the tank is also
  the shop's inventory station, built the way King Fish described it. Customer mode: tap a fish → care card overlay
  (`MenuItem.info`: `ItemInfo` kind/maxSize/diet/temperament/minTank/care/water/origin/notes, `aiDrafted`, `unsure`; the price
  page folds the same card under the item, `infoCard()` in retail.ts + the client script's live render, `.menu-item__more`).
  Staff mode ("Staff" button): unlock by PIN (`priceList.staffPin`, 4–8 digits, 8 wrong tries = 15 min lock in settings key
  `pinfail.<lead>`), a staff NFC tag (Web NFC `NDEFReader`, text `ua-staff:<nfcSecret>` = hmac(APP_SECRET, nfc.<id>.<client_key>)
  [:16], shown on the board; only NFC tablets), or a 6-digit code the tablet shows (`POST /l/<id>/unlock/start`, polled at
  `GET /l/<id>/unlock/<session>`; the board's `POST /c/…/unlock {code}` approves; pending codes in settings key `unlock.<lead>`,
  10 min). All three return a staff token `<exp>.<hmac(staff.<id>.<client_key>.<exp>)>` (12 h, header `x-staff`, kept in
  localStorage; "Revoke old links" ends it). Staff API `/l/<id>/staff/*`: `data` (feed with every item + `catalog`), `adjust`
  {section,item,delta} (`adjustQty`: clamp 0–9999, >0 clears Sold out, 0 hides on the page), `set` {qty|soldOut|price|info}
  (`setItem`), `add` {section,name,qty,price?} (`addToTank`: existing row += qty, a known catalog name brings its photo/price/
  card, else new; new section allowed), `photo?section&item` (camera, R2 `owner/<id>/t….jpg`, caption = name, sets every row
  of that name), `POST info {name}` (Claude care card, `src/copy/iteminfo.ts` `draftItemInfo` on claude-sonnet-5-5, `aiDrafted`),
  `PUT info {name, info}`. `priceList.catalog` (`CatalogEntry` name/price/image/info) = everything ever stocked, rebuilt by
  `catalogOf()` on each change so a fish removed from a tank comes back with its photo and card; `applyClientItems` keeps cards by
  name. Staff writes use `saveAndRefresh(…, {quick: true})` (no preview rebuild; feed + `prices_dirty` carry it). Page: staff
  rows get − / count / + and ⋯ (count, sold out, price, photo, care card read/redo/edit), tank chips + "+ New tank", "+ Add" with
  catalog search and a new-name path (count → photo prompt → AI card), locks after 3 idle minutes or "Done". Board: "Tablet &
  staff" section (Save PIN `PUT /c/…/staffpin`, approve code, NFC text; `/data` carries `staffPinSet`, `nfcText`).
  `test/worker/tablet.test.ts`. Guides and the customer pitch describe it.
  Barcodes (Oct 2026): `MenuItem.barcode` / `CatalogEntry.barcode` (`normalizeCode`: letters, digits, `-._`, ≤64). Staff bar
  "▦ Scan": the tablet camera via the browser's `BarcodeDetector` (Chrome on Android; headless/desktop Linux has none, so the
  sheet says to use a handheld USB/Bluetooth scanner, which types the code + Enter into `#scanIn`). `GET /l/<id>/staff/find?
  code&section` (`findByBarcode`: a row on the board, the staff's current section first, else a catalog entry, else
  `lookupBarcode()` = Open Food Facts v2 product name + brand + quantity for 8–14-digit codes, 4 s, best effort) → the sheet
  shows the item + an amount (− n + / Other) with "➕ Put in" (`/staff/add`) or "➖ Take out" (`/staff/adjust` −n); a catalog
  hit is put into the current section with its code; an unknown code asks for a name (prefilled from the lookup), price, amount →
  `/staff/add {barcode}` → photo prompt + AI card as for any new item; "Scan the next one" chains. ⋯ → "Barcode: … ▦ Scan it /
  Change / Clear" (`/staff/set {barcode}`; `setBarcodeEverywhere`: one code = one product, kept on the catalog after the last one
  sells; `addToTank(…, barcode)`). The phone board has a Barcode field per item + ▦ (camera scan when the browser can read
  barcodes, else focus the field); `ItemsBody.barcode`, `applyClientItems` carries codes by name when the board sends none;
  the feed items carry `barcode`. Both pages' CSP got `media-src 'self' blob: mediastream:` for the camera preview. Written up
  in the Tank board guide ("Barcode scanning (packaged goods)" section: camera, $25–40 keyboard-mode scanner, Put in / Take
  out, new codes, linking, trouble), the display guide, the customer pitch (How it works), and the company site: /price-list
  ("The pieces" card, step 2, What you do, FAQ "Can my staff scan barcodes?") and the shops trade page.
- Live price list for every business (Oct 2026, `src/generator/pricelist.ts`): the page, its nav link and the care card moved out
  of the retail pack; render.ts wraps every pack (`nav` + `pages`) with `priceListNav` / `pricesPage`, so any category builds
  `/prices/` when `ext.retail.priceList` has sections (the storage path kept its historical name). `priceList.kind`
  (`ListKind` fish / plants / pets / food / parts / vehicles / goods; `listKind(r)` guesses from category, variant, name and
  `typeLabel` when unset: category `auto` or parts/tire/wheel names → `parts`; dealer / motors / auto sales / trailer / equipment /
  tractor / RV / boat / golf cart / powersports → `vehicles`) → `KINDS[kind]` words (section "Tank" / "Bench" / "Enclosure" /
  "Case" / "Bin" / "Row" / "Shelf", item, emoji, board name "Tank board" / "Bench board" / … / "Parts board" / "Lot board" /
  "Stock board", a default page `title` per kind: "In stock" for parts, "On the lot" for vehicles, used wherever
  `priceList.title` is blank: page, nav, feed, QR tags; empty text) and info-card fields (parts: part # / size, fits, brand,
  condition, warranty, where; vehicles: year/make/model, mileage, VIN, condition, drivetrain, warranty, financing); `ItemInfo.facts` [{label, value}] carries non-fish rows,
  `infoRows(info, kind)` shows the kind's fields, then any other kind's named fields, then facts. `draftItemInfo(…, {kind})`
  uses a facts schema with the kind's labels for non-fish kinds. Feed carries `kind` + `words`; the board and tablet pages word
  themselves from them (+ New case, "Sold out for today. Fresh again tomorrow."). Edits: top-level `edits.priceList {text,
  title, public, kind}` for any category (`applyPriceListEdit`, keeps qty / soldOut / info / photos by name when the list is
  retyped), retail's fields gained `priceKind`; editform card `pricelist` ("Live price list & QR labels", every non-shop
  category, fields `plText/plTitle/plKind/plPublic`), web Edit `priceListEditCard`. The board, QR tags, Show-them-the-board
  and texted page buttons show on every ready lead; `detail().boardName` / `listKind` name them (Android 2.34 `LeadDetail.
  boardName`). `test/worker/pricelist-kinds.test.ts`.
- Price list plan (Oct 2026, `PlanId` "list" in db.ts; `DEFAULT_LIST_PLAN` $29/mo is appended to saved Settings that lack it,
  blank its monthly price to hide it): a live price page + Tank board + QR tags + display page, NOT a website, for shops whose
  stock changes daily. `billingOptions` gives it only Monthly (no minimum, no setup) and yearly; the agreement adds
  `LIST_PLAN_NOTE` under YOUR PLAN (not a website plan, no minimum, no early-cancel fee, "site" reads "price page"); checkout's
  billing labels say no minimum. `isListPlan()`. Company site: `sitePlans()` / `lowestOf()` keep the plan grids, "from $49",
  compare table and schema price range to website plans; `priceListHtml()` is a "Just need a live price list?" strip on /pricing
  and /websites-for/shops; /terms lists it with a note. App: `PLAN_IDS` has 4 (web Settings + Android `SettingsScreen`),
  `PLAN_TAGLINE.list` / `PLAN_PITCH.list` (app.js + content.ts), `cheapestOf` / "plans start at" / the ministry-rate list skip
  it; Show plans, sign-up links (`/a/<id>.list.…`), the sign-up page, Stripe Checkout and the native sign-up take it like any
  plan. Delivery is the normal publish (the whole site goes live; the plan only promises the price page).
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
  preview (2nd time)"), callers included. `CALLER_KINDS` in notify.ts (their 🔔 list, count and pushes are filtered to it)
  is, since Oct 2026, every lead kind (note, call, status, signup_sent, signed, paid, published, added, preview_open, task);
  only website messages and search runs stay owner/full access. Contact ("Ask for"), callback-day and note deletions
  notify too (kind status / note). Home tab **Activity** (`/leads?activity=1`, web `SALES` + Android `TABS`): leads
  somebody has worked (a call-log entry other than "Added by hand", a task, a sign-up, a typed contact or callback, or an
  opened preview), newest activity first; the summary carries `lastNote {outcome, author, body, at}`, `notes`,
  `lastActivity` only on that list and the card shows the newest entry. Site edits alert too: `siteUpdated()` in index.ts
  ("X updated Y's website (hours, services)", kind status) from /edits, /editform, /restyle, /photo, /gallery, /spanish,
  /rewrite; saves by the same person on the same site within 15 min fold into one alert (text merged, time moved up). Home shows "Looked at their preview" (`/api/leads?opened=recent`, last 7 days, not yet sold), the lead
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
  allow form-action https://checkout.stripe.com in their CSP. Payment test lead (place_id 'paytest', `isPayTest()` in db.ts; one exists in the live
  app as "Payment test (not a real business)", status ready / shown): every sign-up on it is $1 (`saveOrder` + both sign-up
  paths), no Stripe Checkout (tap or the card sheet only), `activatePlan` starts no subscription and the note says TEST; its
  Buy extras page (open /api/leads/<id>/extraslink while logged in) offers only a $1 item.
  Since Oct 2026 the test lead (id f043cb5ec556468e) has a real preview: a clone of the Willow & Wren example record + copy
  (name "Payment test (not a real business)", placeId paytest, phone 256-555-0100, sample stock + scanning on, approved copy,
  confirmed fields) built locally with `buildSite` the way `renderPreview` does (basePath `/p/<id>`, liveData) and uploaded to R2
  `previews/<id>/` with `wrangler r2 object put`; record_json / copy_json / look / lint_json set by D1 SQL (scratchpad
  `build-paytest.mts`). It is the **training aid** (Oct 2026, `src/worker/practice.ts`): `summary().payTest` marks it; the lead page shows a 🎓 Practice
  card (web + Android 2.41) with "🔁 Reset for the next run" (owner; `POST /api/leads/:id/practice/reset` = `resetPracticeLead`:
  refunds every paid sign-up's remaining charges through `refundable` / `refundSignup`, deletes the Pages project if published,
  deletes R2 `owner/<id>/`, deletes purchases / signups / lead_notes / tasks, resets the lead row to New with no callback, contact,
  live_url, pages_project, custom_domain, client_key, pitch or gbp, drops owner photos and the staff PIN, puts fresh sample stock
  back with scanning on, and re-renders the preview; 403 for any other lead). It never expires (`EXPIRE_SQL` skips `paytest`),
  never counts in Sales (`salesDashboard` sales list + shown count skip it) and never shows as a "New" suggestion on the web Today
  card. Training lesson 13 `full-run` is the nine-step run-through ending with the reset.
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
  are business decisions (ranges in the research §7 table); the owner should have a lawyer review once. Settings → Sales
  has "Late fee ($)" (`settings.lateFee`, default 15, 0 = none) and "Early payoff discount (%)" (`payoffDiscount`, default 15,
  0 = none): `lateFeeOf()` / `payoffDiscountOf()` in db.ts feed `defaultTerms`, `coreTerms(s)` / `missingCoreTerms(text, s)`,
  `invoiceText(s)` (contract.ts) and the `/terms` refunds list; changing them clears cached call guides like other sales settings.
  Also "Interest on overdue balances (% a year)" (`interestRate`, default 8, `interestRateOf()` caps at 8 = Ala. Code § 8-8-1),
  "Reinstatement fee ($)" (`reinstatementFee`, default 49) and "Returned payment / dispute fee ($)" (`returnedPaymentFee`, default
  15); 0 drops each sentence. Every sign-up and extras agreement carries a PAYMENT AUTHORIZATION section (`paymentAuthText(s)` in
  contract.ts: charge the card or ACH-debit the bank account on file through Stripe for the plan, approved extras and amounts owed;
  10 days' notice of a different amount; revoke by text/email 3 business days before the next charge; returned-payment fee; no
  card/bank numbers stored by us). `GET /api/ach.pdf?lead=` (`achFormPdf`, owner + callers) is a blank paper "Recurring Payment
  Authorization" form (same words + bank/card/billing blanks + signature) for invoice clients or a paper file; details go on the
  paper and into Stripe, never the app. Settings → "📄 Preview the agreement" (plan + way-to-pay pickers incl. invoice → Show /
  PDF, uses saved settings) and the blank form link; the lead page's sign-up card has "🏦 Payment authorization form".
  Signing: the preview opened from a lead has "✍️ Sign this agreement" (POSTs `/api/leads/:id/signup` for the shown plan, then
  opens the sign-up page `/a/<token>?billing=<id>`, which pre-picks that way to pay); the sign-up page is the only place a client
  signs (name + drawn signature + consent, then payment). Without a lead the preview explains the Show them the plans → Choose path.
- First live run-through fixes (Oct 2026, Android 2.42): (1) Stripe's `2026-09-30.endive` API version removed `payment_method_types`
  from PaymentIntents and SetupIntents, and the account's default moved to it, so Tap to Pay died with "The payment_method_types
  parameter is no longer supported". Terminal still needs a `card_present` intent (and the card sheet a `card` SetupIntent), so every
  call in tap.ts sends `Stripe-Version: 2026-08-26.dahlia` (`STRIPE_VERSION`; `stripe()`, `stripeGet()`, the subscription DELETE).
  Checkout sessions / the billing portal (checkout.ts) pass no payment method types and stay on the account default. If Stripe ever
  retires dahlia, Terminal's docs name the replacement. (2) The native sign-up screen lost its state when "View the signed agreement"
  (the `pdf` route) or Tap to Pay left it, so coming back showed the blank form and asked for a second signature: plan, billing, picks
  (`PICKS_SAVER`), the typed details, `signed` (`SIGNED_SAVER` over `SignupResult.raw`, the response JSON), paid text and `tapUntil`
  are `rememberSaveable` now, and the loader only fills the business name when it is blank. (3) Both signature pads lift the pen when the
  finger leaves the box (Compose: `clipToBounds()` + `inBox` in `SignaturePad`, strokes drawn past the edge used to show outside it; web
  esign.ts: points outside the canvas rect end the stroke, a return starts a new one). (4) The service agreement's section 2 now says
  "(see the Timing section above)": the TIMING section sits before SERVICE AGREEMENT and readers looked for it below.
- 🎁 Discount programs (Oct 2026, owner's rules; `src/worker/referrals.ts`, migration 0020 `leads.referred_by` + `referral_credits`;
  Android 2.47). **Referrals:** a client who sends us a business gets `referralMonths` (2) months of their own plan free once the
  referred business's first payment is in on a plan of ≥ `referralMinMonths` (6) months (standard / short / yearly; never month to
  month or the Price list plan: `referralQualifies`). At most `referralMaxPerYear` (2) credits count per referral year (365-day
  windows from the referrer's first paid sign-up, `creditYear`); the rest stay `banked` and the daily cron (`applyBankedReferrals`)
  applies them when a year with room starts. A credit is a Stripe customer-balance credit of months × the referrer's monthly price
  (`stripePost customers/<id>/balance_transactions`, idempotency `refcredit:<id>`), taken off their next invoices; a referrer with
  no Stripe customer gets a `by_hand` credit the owner applies on the invoice and marks applied (`POST /api/referrals/:id/applied`).
  Hooks: `onPlanPaid(env, leadId, signupId?)` from `activatePlan` (tap / card sheet), the webhook's `planPaid`, and the "Payment is
  set up" tick. Who referred a lead: `PUT /api/leads/:id/referrer {leadId|null}` (owner + callers; only a Sold / Live client,
  `setReferrer`), shown on the sign-up page ("Referred by X … they get 2 months free"), the native sign-up and the agreement.
  `detail().referral` (`referralSummary`: referredBy, credits, usedThisYear, nextYearAt, inviteText) feeds the lead page's "🤝
  Referrals" card (web `referralCardHtml`, Android `ReferralCard` + `ReferrerPicker`), with "💬 Text them about referrals"
  (`referralInvite`). **Founding customers:** the first `founderSlots` (5) paying clients pick one free extra from the ones ticked
  "🎁 Founder pick" in Settings → Extras (`AddOn.founderPick`, one-time / each only, `founderChoices`); `founderOffer()` counts
  paying clients (plus unpaid picks under 7 days) for `slotsLeft`; the sign-up page (`pickerHtml` founder radios, form field
  `founder`), the native sign-up (`FounderRow`, `createSignup(founder)`) and `/api/plans/options` (`founder`, `referredBy`) offer it
  while spots are open; `priceSignup({founder})` adds a $0 "Free: X (founding customer)" line (filtered out of Stripe line items),
  `PricedOrder.founder`, stored in `signups.extras_json.founder` (+ `referredBy`), shown on the Client card. Agreement: PROMOTIONS
  section (`promoTerms`: founder bonus + referral terms), /terms "Referrals and new-customer offers", Plans & answers objection "Do
  you have a referral program?". Settings → Sales → "🎁 Discounts" (web + Android): founderSlots, referralMonths, referralMaxPerYear,
  referralMinMonths (0 months = program off). `test/worker/referrals.test.ts`. Training lesson 13 `discounts` (vars
  {referralMonths} {referralMax} {referralMin} {founderSlots}) teaches both; the setup fee's rule ("no setup fee on the 6- or
  12-month plan or yearly; month to month adds the one-time fee, applied automatically in the sign-up") is on every plan card:
  Show plans + Plans & answers (web `feeNote`, Android ShowPlans / Playbook cards), the lead page's sign-up card, and the
  sign-up page's plan line (`pickerHtml`). Android 2.48.
- ✅ Client card (Oct 2026, Android 2.45): the first paid sign-up puts a green "✅ Client · <plan> plan" card at the top of the lead page
  (web `clientCardHtml` in app.js, `.card--client`; Android `ClientCard` in LeadScreen.kt): way to pay, "paid $X by tap, in person /
  by card on the phone / online / by invoice / marked paid by hand" (`signupsFor` now returns `paidVia` + `subscription` =
  stripe_subscription set), signed date, the renewal line ("Renews yearly at $490 on the card on file"; "automatic payment isn't set
  up yet" when no subscription; the practice lead says nothing renews) and the next step (Publish, or the live address). The Tap
  screen's "Renews on the same card from null" came from `JSONObject.optString` turning JSON null into "null"; it checks `isNull` now.
- Tap to Pay root cause (Oct 2026, Android 2.44): the breadcrumb read "Step: discover · UNEXPECTED_SDK_ERROR · NoClassDefFoundError:
  okhttp3.internal.Util". Stripe Terminal 6.0.0 declares and uses OkHttp **4.12.0** internals; 2.17's `okhttp:5.1.0` pin (for
  `fastFallback`) won the resolution and the reader never started. The app is back on `okhttp:4.12.0`; the dead-IPv6 cold-start fix
  is now `Ipv4First` (a `Dns` that sorts IPv4 ahead of IPv6) in `net/Api.kt`. Don't move OkHttp past what Stripe Terminal's POM
  names. Also fixed: the lead-action regex splits `/practice/reset` into action `/practice` + sub `reset`, so the reset route
  matched nothing ("Not found") until it checked `sub`.
- Tap failure breadcrumbs (Oct 2026, Android 2.43): after the version pin the phone showed Stripe's catch-all "Unexpected failure"
  (`TerminalErrorCode.UNEXPECTED_SDK_ERROR`, raised by the SDK's `TerminalSession.enqueueOperation` when an operation throws; the
  real reason is in `cause`). `TapToPayActivity` now tracks `step` (checks / order / init / support / discover / connect / retrieve /
  tap / report), `explain()` appends the error code to generic messages, `describe()` unrolls the TerminalException's api error +
  cause chain, the detail line shows "Step: connect. Stripe says: …", and `fail()` POSTs `{step, code, message, cause, device,
  android, app}` to `POST /api/tap/log` (bearer tap token like the other `/tap/*` routes; `tapLog` → settings key `tap_last_error`).
  `GET /api/tap/last` (public, read-only; `tapLastFailure`; `/api/tap/status` is the owner-only readiness check) returns it, so a failed tap can be diagnosed from here without
  `wrangler tail`. `activity_tap.xml` got `fitsSystemWindows` (the Cancel button sat under the gesture bar on the Fold). Stripe
  Terminal SDK 6.0.0 (7 Oct 2026, the latest) needs `MODIFY_AUDIO_SETTINGS` (present in the merged manifest) and compileSdk 35+.
- Tap to Pay (Oct 2026, research/android-tap-to-pay-2026.md; `src/worker/tap.ts`, migration 0014 `signups.stripe_payment_intent /
  paid_via / tap_nonce`): in-person card payments on the owner's phone with Stripe Terminal. Android app 2.0 keeps the TWA and adds one
  native Kotlin screen, `tap/TapToPayActivity` (Stripe Terminal SDK 6.0.0, `stripeterminal-taptopay` + `-core`, arm64 only, APK ≈40 MB;
  `App.kt` guards the `:stripetaptopay` process). The web app opens it with `intent://tap?t=<token>&o=<origin>#Intent;scheme=wbpay;
  package=com.knightdx91.websitebusiness;…;end` (`tapIntentUrl`). Flow: client signs on the sign-up page (`?tap=1`, added by `tapHref()` in
  app.js and the preview's Sign button on Android; honored only when `tapStatus` is ready) → "Tap card now" / the lead page's "💳 Take payment
  by tap" → `POST /api/leads/:id/tap {signupId}` (owner) = `startTap`: Stripe Customer (reused per lead) + `card_present` PaymentIntent with
  `setup_future_usage=off_session` for `due_cents` (reuses an open one; never two authorizations), a 10-minute single-use token
  (`tapToken`/`verifyTap` in auth.ts, nonce in `tap_nonce`). The native screen calls `GET /api/tap/session`, `POST /api/tap/connection_token`
  and `POST /api/tap/complete` with `Authorization: Bearer <token>` (no cookie; routes sit before the session check in index.ts).
  `completeTap` re-reads the PaymentIntent, takes `latest_charge.payment_method_details.card_present.generated_card`, creates the plan
  subscription (`priceSignup` recurring lines, `billing_cycle_anchor` = `nextPeriodStart()` one month/year ahead, `proration_behavior=none`,
  idempotency key `sub:<signup>:<pi>`), sets the customer's default card, marks the sign-up paid (`paid_via='tap'`), notes "Paid $X in person by
  tap (Visa ••1234)" and notifies; the webhook (`payment_intent.succeeded`, metadata kind `signup_tap`) and the daily cron (`reconcileTaps`:
  finish succeeded intents, cancel open ones after a day) do the same if the phone never reported. No `generated_card` (some wallets) = paid
  for this period, card not saved, warning in the note. One-time setup: Settings → business street/city/state/ZIP (`companyStreet…`), then
  Settings → "Set up Tap to Pay" (`POST /api/tap/setup` → Stripe Terminal Location, id in settings key `terminal_location`); `/meta.tap`
  carries ready/why. Phone rules the screen checks or explains: Android 13+, NFC on, Location on + permission, Developer options OFF, Play
  Store present, not rooted, release build only (debug builds use Stripe's simulated reader). Fees 2.7% + 5¢ + 10¢ per tap; renewals are
  online charges. The agreement's PAYMENT AUTHORIZATION says a tapped card is the card on file. `page()` now allows `connect-src 'self'`.
  Build as before: `npm run android` (versionCode 5, "2.0"). First live test: a $1 tap with the owner's own card, refunded in Stripe.
- Company site policies: `/terms` (plans, ways to pay, cancellation & refund policy at `#refunds`, the service agreement,
  limits, Alabama law) and `/privacy`, both rendered from Settings (`policyPage` in company.ts; bump `POLICIES_UPDATED`
  when the wording changes). `/refunds` redirects to `/terms#refunds`. Linked from the footer and the sign-up page.
- Prices are said per month, never per day (Oct 2026): a team member found "about a dollar a day" confusing, so the Show plans
  cards, Plans & answers cards (web + Android 2.35 `ShowPlansScreen` / `PlaybookScreen`), the "too expensive" objection answer
  (`playbookObjections` in app.js + content.ts) and the training pitch line ({fromMonthly}) all say "$49 a month" / "billed
  monthly". `/api/plans/options` still returns `perDay` for older app builds; nothing displays it. Don't reintroduce per-day math.
- The web app updates itself (Oct 2026): the owner saw an old screen because an installed web app stays loaded for days
  (the service worker is network-first, so a *reload* always got the new files, but nothing reloaded). Now `checkForUpdate()`
  in app.js HEADs `/app.js` with `cache: no-store` on start, every 5 minutes while visible and on every return to the
  foreground; a changed ETag shows a bottom bar "A new version of the app is ready · Reload now" and the next `go()` (screen
  change) reloads by itself unless an Edit has unsaved changes (`leaveGuard`). `npm run prepare:app` (part of deploy) also
  stamps `sw.js`'s `VERSION` with a hash of index.html + app.js + app.css, so the offline shell cache turns over on every
  deploy that changes the shell; never hand-edit that line. (Before this, the Settings guide buttons and Costs & usage were
  live on the server for hours while the phone showed the old app.)
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
  Rebuilt Oct 2026 after a 25-site study (`research/company-website-2026.md`; SEO: `research/seo-playbook-2026.md`):
  `marketingPage()` shell (per-page title/description/canonical, `pageLd()` = @graph of `businessLd()`
  [ProfessionalService + LocalBusiness: city, geo, areaServed from towns, priceRange, makesOffer per plan, logo],
  WebSite, WebPage + breadcrumb). Pages: `/` (hero with a phone mockup of the restaurant example, `proofRow()` 4 badges,
  3 steps + `firstWeekHtml()` timeline, `tradeCards()`, compact plans + `badgesHtml()` + extras chips, `ownerSection()`,
  FAQ, `contactSection()`), `/pricing` (`planCard(full)` with both prices, ways to pay, `earlyCancelText()` from the
  agreement numbers, extras grouped by unit, `compareHtml()` DIY/agency/us table, pricing FAQ), `/about`,
  `/websites-for/<slug>` (one per pack from `TRADES`: trade copy, includes, example, FAQ, Service schema), `/cullman-county`
  (one service-area page, never per-town clones), `/portfolio`. Sitemap lists them all with lastmod. Copy uses
  `MARKET_TOWN` ("Cullman"); the registered city (Settings → business address, Hanceville) is only in the schema address.
  Settings → **Website** (web + Android): `siteHeadline`, `siteLead`, `siteBio`, `siteTestimonials` (`Quote | Name,
  Business` per line; real clients only, nothing shows until typed), `siteTowns` (comma list → county page, footer,
  areaServed). `liveClients()` (sold + live) replaces the first badge from 3 up. No FAQPage schema (Google dropped FAQ
  rich results 7 May 2026), no aggregateRating. Owner photo: add `app/public/owner.jpg` (square); until then the UA badge.
- Company site, price list (Oct 2026): `/price-list` (`priceListPage` in company.ts; `/tank-board` and `/live-price-list` redirect):
  the live price list + Tank board + QR tags + tablet display for shops with daily-changing stock. Hero, 3 steps, the four
  pieces, what customers get / what you do / who it's for, What it costs (the Price list plan line, included with site plans,
  tag sheets, tablet; all from Settings), 6 FAQs, contact; Service schema with an Offer for the plan. Linked from the footer
  ("Live price list"), the home teaser `priceListTeaser()` (card before the owner section), the /pricing and shops strip
  (`priceListHtml` → "How it works"), and in the sitemap. The shops trade entry now names fish/pet stores and nurseries, lists the
  live price list in "What your site includes" and answers "My prices change every day". Home FAQ gained "I already have a
  website. Can you use what's on it?" (the site import, with the directory caveat).
- Client-site SEO (Oct 2026): titles were already `<Business> | <Service> in <Town>, AL`; added `x-default` hreflang,
  `record.seo.googleSiteVerification` (Edit → Links → "Search Console code"; `<meta name="google-site-verification">`
  on published pages only; `editform` field `gsc`), `rel="nofollow"` on the footer "Website by" credit, and two SEO
  rows at the top of the Get-listed checklist (GBP website field, Search Console verified + sitemap submitted; Bing
  Places row says import from GBP). Not built: Search Console / Business Profile Performance API in the monthly report.
- Local testing: `.dev.vars` (gitignored) + `npx wrangler d1 migrations apply website-business --local`
  + `npx wrangler dev --local`, then use http://localhost:8787 (cookies are Secure).
- Don't publish a real business for testing. Use a made-up record and delete the Pages
  project afterwards.
