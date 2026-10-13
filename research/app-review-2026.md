# App review, October 2026: what it does, what the first week shows, what to change

Written 13 October 2026, five days into real use (the first leads were built on 8 October). Three inputs: the code and
CLAUDE.md (what the app does), read-only queries on the live database (what the team actually did with it), and two
outside research passes (how comparable companies sell and keep this kind of customer, and what the evidence says about
running a four-person sales operation). Numbers below are from the live database on the morning of 13 October.

## 0. The short version

- The app is far ahead of the business. It finds, builds, demos, signs, charges and publishes, with training, alerts,
  reports and inventory tools on top. In the first week the team touched 18 of 127 leads, showed 11, and sold none
  (the one "sold" row is the payment-test lead). 8 of the 13 callbacks it booked were overdue this morning. Nobody has
  finished a training lesson.
- So the constraint is not a missing feature. It is daily execution: calls and visits per person, follow-ups on the day
  they fall due, and one owner-level view of whether that happened. The highest-value changes are small ones that make the
  day's work unmissable and visible, not new screens.
- Three concrete leaks the data shows: texted preview links are not being opened (1 of 8), the "Ask for" name is captured
  on 1 lead in 127 although the notes are full of names, and the company contact form is mostly spam.
- Two things will bite as soon as a restaurant or salon signs: every restaurant preview needs the menu typed in before it
  can go live, and salons need services and prices. Reading those from a photo is the single biggest post-sale time saver
  available and the app has no photo reading yet.
- A feature freeze on new surfaces until ten paying clients, plus a short cut list, would free the only developer time
  the business has for the above.

## 1. What the app is today

One tap runs Google Places searches by category around Cullman, keeps businesses with no website or only a Facebook page,
ranks them, and builds every one a preview website (category pack + Claude copy + an AI-picked design) in the cloud. The
team gets a lead card with tap-to-call, a call guide, a preview link to text, an in-person walk-in guide and route, a
log card with outcomes and callbacks, and a per-lead "next step". A sale is an e-signed agreement plus payment on the
spot (Tap to Pay, card sheet, Stripe Checkout or invoice), then a publish checklist and one tap to Cloudflare Pages.
After the sale: custom domain, Google Business Profile tools, review asks, monthly stats text, change requests, extras
checkout, a live price list / inventory board for shops, referrals and founder bonuses. Around it: team logins with roles,
alerts and pushes, tasks, a sales dashboard with a funnel, costs and usage, problem reports, a glossary and a 14-lesson
course, all on web and a native Android app that stay in step.

Running cost is small: this month 28 Opus calls for copy (about $1.20), 52 Places searches, 15 detail fetches, 61 Brave
searches, 293 pushes. Fixed costs are the Workers plan, the domain and Workspace. Building a preview costs 5–12 cents, so
the 127 previews cost roughly $10. Money is not the issue anywhere in the pipeline.

Size, for the engineering point in §5: the Worker router alone is 4,100 lines, the web app 4,400, plus the generator,
packs, the Android app and 290 tests. Every lead-page feature exists twice (web and Kotlin).

## 2. The first week in numbers

| What | Number |
|---|---|
| Leads built (8–13 Oct) | 127 (103 from runs, 24 added by hand) |
| Untouched (no call, visit or text logged) | 109 of 114 "New" |
| Shown a preview | 11 (7 restaurants, 2 auto, 1 print, 1 retail) |
| Sold / live | 0 real (1 payment-test row) |
| Callbacks due today or earlier | 13, of which 8 overdue |
| Average days from lead created to first touch (14 touched) | 1.1 |
| Preview links texted → opened | 8 leads texted, 1 opened (2 leads opened in total, 5 opens) |
| "Ask for" contact name captured | 1 of 127 (the notes mention Kevin, Paige, "the lady", "an employee") |
| Log entries by person | Owner 53, Fox 6, Brenda 5, Katy 4 (Katy joined 12 Oct) |
| Hour of day the work happens (Central) | Peak 3 PM; almost nothing before 11 AM |
| Hand-added leads shown vs run-found leads shown | 4 of 24 (17%) vs 7 of 103 (7%) |
| Churches | 25 leads, average score 35, 3.9 required to-dos each, 0 shown |
| Restaurants | 34 leads, average score 67 and 370 reviews, 7 shown |
| Required to-dos across all previews | "Confirm your service area" 43, "Send us your menu" 34, church items 24 each, "Send us your services and prices" 15 |
| Training lessons completed | 0, by anyone |
| Tasks created | 0 |
| Inbox messages from the company site | 4, three of them SEO spam |
| Daily call goal in Settings | 5 per person |

## 3. What the numbers say

**Capacity, not features.** Four people logged 75 entries in five days, 20 of them "Added by hand" notes. At five real
touches a day per person the untouched 109 would clear in about five working days; at the actual pace (the owner does
most of it, the callers logged 10 entries between them) they will expire unseen: a New lead expires 30 days after it was
built, and the oldest untouched ones are already five days old. The app did its job in a day; the humans have a month.

**Follow-ups are booked and then missed.** The cadence (day 2 call, day 5 text, day 10 walk-in, day 21 last text) sets
`follow_up` dates; eight were overdue this morning. "Up next" shows them, but only when someone opens the app and looks.
Nothing arrives in anyone's pocket at 8 AM saying "you have 3 callbacks and 2 visits today".

**Nobody owns a lead.** Two callers and the owner work the same list; the queue orders by priority then score, so
everyone sees the same top five. Alerts have a "mine" mode (leads you touched) but there is no claim, no "this week's
twenty for Fox", and no way to see who dropped what.

**The texted preview is not landing.** One open from eight texts. The text goes to whatever number the listing shows,
which for a restaurant is the counter phone, not the owner's; the link is a bare preview; and nobody follows the text
with a visit the same day. Meanwhile walk-ins got the only real interest in the notes ("very interested, going to show
his wife", "wrote down info, supposed to call").

**Hand-added beats run-found.** Leads someone typed in after a visit or a tip were shown at twice the rate. That is the
normal "warm beats cold" effect, and an argument for letting the field drive the list (walk the strip, add what you see,
let the app build it) rather than building 100 at a time from a search.

**Churches were the wrong first category.** 25 of 127 leads, the lowest scores (10 reviews on average), four required
to-dos each before a site can go live (ministries, pastor, how to describe the church, service times), decisions made by
a committee, and the discounted church plan. None has been shown. They belong in a slow lane after there are paying
clients, not in the first run.

**Restaurants are the right first category, with a trap.** Highest scores, most reviews, most shown. But every
restaurant preview carries "Send us your menu" as a required to-do, and the promise on the site reads "snap a photo and
we'll type it in". The first restaurant that signs will hand over a menu photo and the team will spend an evening typing
it, with prices, into the editor. Salons have the same shape ("Send us your services and prices", 15 previews). This is
the next bottleneck, and it is one the app can remove.

**Instrumentation is there but not fed.** The lead has fields for who to ask for and when they are usually in; one lead
has them. The notes have the names. The log card does not ask "who did you talk to?" after a visit, so the next person
walks in blind.

**The inbox is spam.** Three of four submissions on the company site are SEO sellers. There is no Turnstile or honeypot
on the form, so the owner gets alerts for junk.

**Cost of the second front end.** Every lead-page change this week landed in app.js and in Kotlin, with an APK build each
time. The owner wanted native for cold-start speed and Tap to Pay, and that was the right call for the owner's phone; but
each new feature now costs about 1.6× what it would on one client. Worth knowing when deciding what to build next.

## 4. What the outside evidence says

### 4.1 The market (what the incumbents charge, how they sell, why customers leave them)

| Player | Price and term | How they sell | What customers complain about |
|---|---|---|---|
| Thryv | $99/mo self-serve starter; $399/mo signature; 6-month to 2-year terms reported | Phone "business advisors" plus outside reps | Trustpilot 2.6/5 (58% one-star): trials that became contracts, no cancel button, invoices after cancelling, promises not delivered |
| Hibu | Custom quotes, about $449/mo in listings; 6–12-month terms plus a setup fee | Territory field reps cold-calling and visiting ($54k base, ~$102k year-one target, 12 weeks of training) | 109 BBB complaints in three years: refused to end contracts, duplicate listings, broken links |
| Townsquare Interactive | About $300–400/mo on 6-month agreements | 120+ inside reps cold-calling nationwide | 45% one-star: balance owed on early exit, domain not under the client's control, slow changes, generic sites |
| GoDaddy / Web.com design services | $500 one-time build plus hosting; "$500 to $5,000" | Inbound | Renewal price jumps |
| "$0 down" subscription agencies | $99–199/mo, 6–12-month minimums, early exit = remaining months | Referrals and inbound; one such business for sale shows 38 clients at ~$269/mo, 76% margins, grown on referrals | Not researched |
| Freelancers / small agencies | $500–1,500 entry, $3,000–8,000 local agency, one-time | Inbound | |

Where Underground Associates sits: $49–149 a month with no setup fee on a six- or twelve-month term is a third to a
quarter of Thryv Signature and Townsquare, at parity with Thryv's $99 self-serve tier, and at the bottom of the "$0
down" agency band. The incumbents' complaint columns are the pitch: trial-to-contract surprises, cancellation friction,
slow changes and domain lock-in are exactly what the agreement already promises against (own domain and content, exit
copy, changes by request, cancel at the end of the term).

### 4.2 Benchmarks (each with its source and caveat)

| Metric | Number | Source |
|---|---|---|
| Cold-call live-answer rate per dial | 5.4% average, 13.3% top quartile | Gong, 300M+ B2B calls, 2024 (vendor) |
| Dials per live conversation | 19 average, 8 top quartile | Gong |
| Meeting booked per conversation | 4.6% average, 16.7% top quartile | Gong |
| Attempts to reach a prospect | about 8 (5 for top performers) | Cognism 2025, RAIN Group (secondary) |
| Call windows | 4–5 PM and 8–10 AM best, mid-day and Monday worst (Oldroyd); 10–11 AM Tuesday (Cognism). By trade: restaurants Tue–Thu 2–4:30 PM, trades 7–8 AM or 4:30–6 PM, salons Tue–Wed 9–10 AM (unattributed, treat as hypotheses) | Ooma/Oldroyd, Cognism, MapsLeads |
| Door-to-door close rate | 1–3% of doors, 5–8% for the best; 20–40 conversations per 100 doors | ecanvasser, no dataset cited |
| Local web design, proposal to close within 30 days | 8–35% across three resellers; cycles of 30–90 days | SEOReseller webinar (vendor) |
| Preview-first ("spec site") lift | No independent evidence; vendors assert it. Our own funnel is the best data there is | |

At Gong's averages a caller needs roughly 400 dials per booked meeting; at top-quartile rates about 45. The preview
and the opened-preview beacon are the lever most reps lack: the prospect sees the product before the meeting.

### 4.3 Retention

- Price band drives churn: median monthly customer churn is 6.1% under $25 of revenue per account and 2.2% above $500
  (ChartMogul). At $49–149 the natural rate is 3–5% a month unless the company behaves like a higher-priced vendor.
- GoDaddy keeps about 85% of customers a year and 90% of those past three years; Thryv says a second paid product cuts a
  customer's churn by as much as half; Townsquare's top cancellation reason is "the client went out of business".
- About a third of subscription churn is involuntary (failed cards), per Recurly's network data. Stripe's card updater
  and retry settings fix most of it for free.
- Agency clients' top exit reason is "dissatisfaction with delivery" (48%, Setup 2025). A small subscription-website
  agency for sale reports three-year average tenure, all referral-sourced.
- The arithmetic on the $89 plan: 5% monthly churn → 20 months → $1,780 per client; 3% → $2,970; 2% → $4,450;
  GoDaddy-like retention → about $6,600. The twelve-month minimum sets a $1,068 floor.

### 4.4 Outreach rules in plain words (get one lawyer read; this is research, not advice)

- Federal: business-to-business calls are exempt from the Do Not Call registry and most of the Telemarketing Sales Rule,
  but a cell phone an owner uses for both the shop and home can count as residential; honor "don't call again" on an
  internal list within ten business days and keep it five years; human-dialed calls need no consent, autodialed or
  prerecorded calls and texts to cells do.
- Alabama: the Alabama Telemarketing Act requires a license ($500 a year per seller plus $50 per salesperson); selling by
  phone without one is a felony. The business-to-business exemption is narrow and does not fit. The exemption that fits
  the current motion is "the call books a face-to-face meeting and the sale is completed in person": no pitch to a close
  on the phone, no payment collector sent. Closing on the phone and texting a checkout link sits outside it. The license
  is cheaper than the argument.
- Texting: anything sent by software from a 10-digit number needs A2P 10DLC registration; texts sent one at a time by a
  human from their own phone after the owner asked for the link (which is what the app does today) are the compliant
  pattern. Since April 2025 any reasonable "stop" must be honored within ten business days. There is no business
  exemption for texting; treat every cell number as a consumer number and keep one suppression list shared by calls and
  texts. Cadence texts to someone who never asked for them are the risk.

### 4.5 Channels others use with this buyer

- Cullman Area Chamber basic membership is $250; member-to-member discount programs and chamber-sponsored mini-site
  programs exist elsewhere.
- Free "website workday" events run by SBDCs (Wallace State's SBDC is in Hanceville) where owners bring logins and leave
  with a site. The app can build the site live in the room.
- Toast pays non-customer local partners $500 per referred restaurant; Clover and Square pay processing credits for
  merchant referrals. These are the opening to trade leads with their local reps.
- BNI reports $62k of closed business per US member a year (self-reported). Facebook groups work only as help-first.

### 4.6 What a four-person sales operation should run on

(From the second research pass; added below when it reports.)

## 5. Recommendations, in order

Each item: what, why (with the evidence), and effort (S = an afternoon, M = a few days, L = a week or more). The first
five are about getting the existing pipeline worked; nothing new is sold until they happen.

1. **A morning plan in every pocket (S).** At 7:45 AM Central each person gets one push: "Today: 3 callbacks, 2 visits,
   5 fresh calls. Tap to start." The queue already computes it; the daily cron exists; Web Push and Firebase are wired.
   Add an end-of-day push to the owner: "Logged today: Owner 8, Fox 2, Brenda 3. Overdue: 6." Overdue callbacks are the
   most expensive leak in any outbound process and the cheapest to fix with a nudge.
2. **Assign the week's leads (M).** A "This week" list per person: the owner (or the app, round-robin by score and
   category) hands each caller 15–20 leads on Monday; the queue shows yours first; the Sales page shows each person's
   touches, reached, shown, and overdue. No lead sits in two people's lists. Raise the daily goal from 5 to a real number
   for the hours worked (15 dials for a part-time caller is ordinary) and show it as a progress bar, not a setting.
3. **Build to capacity, not to the cap (S).** Default runs to 20 leads and run them when a list is empty, not before.
   Previews expire in 30 days and go stale (hours, photos) sooner; a lead built the week it is worked gets the freshest
   Google data and the best chance. Move churches out of the default run groups into a "slow lane" run the owner starts on
   purpose.
4. **Walk in first for the top of the list (S).** For restaurants with 100+ reviews the first touch should be a visit at
   2–4 PM with the preview on the phone, not a text to the counter line. The walk-in guide already knows the best time
   to visit by trade (`WALKIN_TIMING`); the route and the queue do not use it. Order the route by "likely in now", and
   make the log card ask "Who did you talk to? When are they usually in?" after a visit so `contact` and `best_time` fill
   themselves (today they are a separate button nobody taps). Then the second visit asks for Kevin by name.
5. **Fix the texted link (S).** Send it to the owner's own number (ask for it at the counter), make the text one line
   with the business name and "built for you, 20 seconds", and send it standing there so the open happens in front of
   you. Log which follow-up text was used so the open rate per text is visible. One open in eight is a message problem,
   not a product problem.
6. **Read menus and price boards from a photo (M).** The owner photographs the menu or the price list at the demo; Claude
   (vision) turns it into menu sections with prices or a services-and-prices list; the team reviews and saves. This turns
   the biggest required to-do into a two-minute step, lets "live within 3 business days" become "live today", and removes
   the one chore that would otherwise land on the office manager after every restaurant and salon sale. Same for a photo
   of the hours sign.
7. **Spam protection on the company form (S).** Cloudflare Turnstile (free, same account) plus a honeypot field, and
   drop submissions whose message links to an SEO domain. The inbox should only ever ring for a real prospect.
8. **Cut the first-call course to one card (S).** Fourteen lessons and zero completions means the course is the wrong
   shape for part-time callers. Keep the course for the office, but give callers a single "Your first call" card on Home:
   the five lines to say, the one button to tap after, and "Mark done". Measure whether it gets done.
9. **Make the sales page about the week (S).** Four numbers per person per week: touches, reached, shown, signed; plus
   time-to-first-touch and overdue count. The funnel across all time is fine, but nobody acts on it in week one.
10. **A feature freeze until ten paying clients, with a cut list (policy).** Nothing new on the lead page, no new packs,
    no new extras until the tenth client pays. Candidates to retire or hide if still unused at that point: Tasks (0
    created), the costs page for callers, the 17-extra menu at sign-up (show 3, keep the rest in "Buy extras"), the
    glossary button on Home. The time goes to items 1–7 and to the first clients' onboarding.
11. **The first 30 days for a client, as next steps (S).** The Live stage already says "ask for a review". Make it a
    four-week script: week 1 Google Business Profile website field + review link card; week 2 first stats text ("12
    people called from your site"); week 3 ask for the photo of the thing they are proudest of; week 4 the review ask.
    Retention for subscriptions is decided in the first month, and the app already has every piece.
12. **Decide the second front end on purpose (policy).** Keep Android for what only it can do (Tap to Pay, camera imports,
    the owner's phone speed) and stop mirroring admin screens into it; callers get the lead page, log card, sign-up and
    payment natively and everything else in the web app. Write that line into CLAUDE.md so each new feature is not built
    twice by default.

## 6. What not to change

- The core bet (preview first, show it in person, sign and pay on the spot) matches what the evidence and the first week
  both say: visits produced the only real interest. Keep the demo on the phone.
- The plan ladder ($49 / $89 / $149, six- or twelve-month terms, month to month with a setup fee, yearly at ten months)
  is in the market's range for done-for-you local sites and simpler than most. Do not add plans.
- The agreement, Tap to Pay, the publish gate and the sold-design exclusivity are the parts a competitor would envy. Leave
  them alone.
- The art director and the design system are now good enough that design is not why a prospect says no. Stop polishing
  the generator until a prospect says it is.

## 7. Sources

Market, benchmarks, churn, rules and channels (read in full unless marked snippet): Thryv pricing and Trustpilot; Thryv
Q1 and Q4 2025 earnings transcripts; Hibu websites and pricing pages, Trustpilot and BBB complaints, a Hibu outside-sales
job posting; Townsquare Interactive site, Trustpilot, Radio Ink and an investor write-up, an inside-sales job posting;
Network Solutions web design services; GoDaddy plan listings (snippet); Wix Studio partner program and revenue share;
Duda pricing; Squarespace Circle; a "$0 down" agency page and an Acquire.com listing of a 38-client subscription agency;
2026 website-cost roundups; Gong "300M calls" study; Cognism cold-calling and call-timing posts; Ooma on Oldroyd's call
timing study; MapsLeads trade windows (unattributed); RAIN Group prospecting research; ecanvasser door-to-door ratios;
Prospeo on sales cycles; an SEOReseller webinar on close rates; PitchSites and two "spec site" posts; ChartMogul churn
benchmarks and the 2023 retention report; Recurly churn benchmarks (July 2026); GoDaddy's 2025 10-K; the 2026 "agency
trust gap" survey; FTC Telemarketing Sales Rule guidance; 47 CFR 64.1200; National Law Review on business numbers and
the TCPA (Miholich); Kelley Drye on the April 2025 revocation rules, the vacated one-to-one consent rule and the Seventh
Circuit text ruling; Alabama Attorney General on the Alabama Telemarketing Act; Ala. Code § 8-19A-4 and § 8-19C-2;
Twilio's A2P 10DLC and SMS compliance guides; the Cullman Area Chamber membership tiers; chamber discount and mini-site
programs (Bonita Springs, Rose Hill); an SBA/SBDC "website workday" event; Clover and Square referral terms; Toast Local
Partner FAQ (snippet); BNI 2025 mid-year report; direct-mail response benchmarks (ANA via directmail.io).
