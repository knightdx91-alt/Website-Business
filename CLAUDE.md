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
- [ ] Packs for salons, auto, landscaping, cleaning

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
  CF_API_TOKEN, APP_SECRET (set with `wrangler secret`; never in files).
- Google data hygiene: photos are proxied live, never stored; the cron expires unsold leads
  (new after 30 days, shown after 60), keeping only the Place ID.
- Owner to-dos: `todo(ctx, …, required)` in components. Required ones block publishing;
  suggested ones only show in previews as talking points.
- Don't publish a real business for testing. Use a made-up record and delete the Pages
  project afterwards.
