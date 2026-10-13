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
- One rule to check with a lawyer: Alabama's Telemarketing Act licenses phone selling. Booking the visit by phone and
  closing in person fits an exemption; closing on the phone with a texted checkout link does not. The license is $500 a
  year plus $50 a caller.
- A feature freeze on new surfaces until ten paying clients, plus a short cut list, would free the only developer time
  the business has for the above. The outside evidence is blunt about in-house tools: most features go unused, dashboards
  without a meeting go unread, and every feature here ships twice (web and Android).

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

Nearly all "speed-to-lead" research is about inbound leads, so it applies to this app's inbound moments: a preview
opened, a text back, a form post, a Buy-now. Those deserve minutes, not hours.

| Finding | Number | Source |
|---|---|---|
| Firms that never answered a web lead; answered within an hour | 23%; 37% (mean 42 h) | HBR audit of 2,241 US firms, 2011 |
| Odds of qualifying a lead answered within an hour vs an hour later; vs a day later | about 7×; over 60× | HBR 2011 |
| Same audit re-run in 2026 | over 99% not within 5 min; average phone reply 14.5 h, 3.5 h with a routing tool | Workato (vendor) |
| Call attempts that pay | optimal 6; only 8% of unresponsive leads ever got 5–7; two short voicemails on six calls +34% | Velocify (vendor) |
| Voicemail | later connects fall 28% after a voicemail; keep to two, 15–30 s, to prime the next text | Gong, 300M calls (vendor) |
| Texting | after a live contact +113% conversion; before any live contact −39% chance of ever reaching them; 3+ texts after contact best | Velocify (vendor, 2012) |
| Left to themselves, reps' cadences | most common: one email; median whole cadence under 5 days | InsideSales, 8,000 companies (vendor) |
| Connects by time | peak 11 AM–4 PM; about 13 dials per conversation | Allo 2026, 72k calls (observational) |
| Interrupted work | gets done, faster, with more stress and errors | Mark et al., CHI 2008 |
| E-sign completion | 43% within 15 min, 78% within a day; after that it joins the 22% that take longer | DocuSign (vendor) |
| Contracts read | 1–2 shoppers per 1,000 open the terms | Bakos 2009 |
| Annual prepay | about 30% better retention than monthly; whole-number offers ("two months free") beat percentages; best asked 2–9 months in | ProfitWell/SaaStr (vendor) |
| SMB retention by products sold | 1 product: 30% kept at 2 years; 4 products: 80%; not upsold by month 3: 62% churned; weekly engagement +26% | Vendasta, 100k+ accounts (vendor) |
| Reviews | 63% expect a reply within a week; an email ask prompts 40%, in person 27% | BrightLocal 2025 |
| Why owners have no site | "not relevant to my industry" 34%, cost 16% | Clutch 2025 (via Review42) |
| End-of-day reflection | 15 minutes of written reflection raised performance 22.8% in 11 days | Di Stefano et al., Wipro field experiment |
| Stand-ups | help when they share problems, hurt when they are status reports | Stray et al., 12 teams |
| Contests vs leaderboards | more than one winner; rank-ordered prizes add nothing; leaders coast, trailers quit; top ranks breed complacency | Lim/Ahearne/Ham; Casas-Arce; Na & Han 2023 |
| Training that sticks | practice testing and spaced practice high utility, rereading low | Dunlosky 2013 |
| Feature use | 80% of features rarely or never used; 12% carry 80% of use | Pendo, 615 products |
| Dashboards | about 25% of employees use BI, flat for seven years; a dashboard without a meeting is decoration | BARC |
| Alert fatigue | 80–99% of hospital alarms are false and staff respond slower to all of them | JMIR 2019 |

What the second pass judged over-built against this evidence: 625 designs per category plus structure knobs (buyers
object on relevance, not variety), the inventory stack built around one prospect, costs and usage screens for four
people, many guides and alert kinds, and a native app that duplicates every web feature. Under-built: a response-time
rule for inbound signals, an attempt counter with a give-up rule, assignment to stop cherry-picking the shared queue, a
weekly scorecard with a scheduled review, a dated 30/90-day client checklist with a month-3 add-on ask, an end-of-day
reflection prompt, spaced re-quizzes, and usage telemetry of the app itself.

## 5. Recommendations, in order

Each item: what, why (with the evidence from §3 and §4), and effort (S = an afternoon, M = a few days, L = a week or
more). The first six are about working the pipeline that already exists; nothing in §5 after them matters until they
happen.

### Work the leads you have

1. **A morning plan in every pocket, and an evening count for the owner (S).** At 7:45 AM Central each person gets one
   push: "Today: 3 callbacks, 2 visits, 5 fresh calls. Tap to start." At 6 PM the owner gets "Logged today: Owner 8,
   Fox 2, Brenda 3. Overdue: 6." The queue already computes it; the daily cron, Web Push and Firebase exist. Why: 8 of 13
   callbacks were overdue this morning; reps left to themselves under-touch (InsideSales) and a nudge is the cheapest
   fix in the literature.
2. **Assign the week's leads (S–M).** Monday hands each caller 15–20 leads (round robin by score and category, or by the
   owner); "Up next" shows yours first; a claim lapses at midnight so nothing is hoarded; the owner sees what nobody took.
   Why: a shared queue showing everyone the same five best leads invites cherry-picking and leaves the rest cold
   (ActiveProspect); 109 of 114 New leads are untouched.
3. **Treat inbound signals as emergencies (S).** A preview opened, a text reply, a form post or a Buy-now puts the lead
   at the top of Up next with a five-minute countdown and a push to whoever owns it; log time-to-first-touch. Why: HBR
   found 7× the qualification odds within the hour and 60× against a day later, and nothing has changed since (Workato
   2026). The beacon exists; the urgency does not.
4. **Front-load the cadence and count attempts (S).** After a demo: a text within the hour, a call the next day, a second
   voicemail on day 3, then the existing day 5 / 10 / 21 steps; show "attempt 3 of 6, voicemails 1 of 2" on the lead and
   park the lead after six to eight touches in three weeks. Why: Velocify's optimum is six attempts and two short
   voicemails; most reps stop after one; the current cadence is thin where the data says to be thick.
5. **Build to capacity, not to the cap (S).** Default runs to 20 leads, run them when a list is empty, and move churches to
   a "slow lane" run the owner starts on purpose. Why: previews expire in 30 days and go stale sooner; 25 church leads with
   four required to-dos each and committee decisions sat untouched while restaurants, the best category by score and
   reviews, were the ones shown.
6. **Walk in first for the top of the list, and capture who you met (S).** Restaurants with 100+ reviews get a visit at
   2:30–4:30 PM with the preview on the phone, not a text to the counter line; the route orders stops by "likely in now"
   (the walk-in guide's `WALKIN_TIMING` already knows the windows); after a visit the log card asks "Who did you talk to?
   When are they usually in?" and fills `contact` and `best_time`. Why: the only real interest in week one came from
   visits; the notes name Kevin and Paige but the field is filled on 1 lead in 127; restaurant owners are at the counter
   between lunch and dinner (practitioner evidence).

### Stay on the right side of the rules

7. **Book by phone, close in person or by a link the owner asked for; file the Alabama license anyway (S, plus a lawyer
   read).** Alabama's Telemarketing Act exempts calls whose purpose is to book a face-to-face meeting with the sale made
   there; a phone close with a texted checkout link sits outside that exemption and the license is $500 a year plus $50
   per caller. Keep texts human-sent from the caller's own phone after the owner gave the number (what the app does), put
   the business name and "Reply STOP" in every template, keep one shared do-not-contact list for calls and texts, and
   never text a number that has not been reached live. Why: §4.4; also Velocify's −39% for texts before first contact,
   so the rule and the data agree. Hide "Text preview link" on never-reached leads; keep the flyer and QR.

### Make the first sales easier and the first clients stay

8. **Read menus, price boards and hours signs from a photo (M).** The owner photographs the menu or the price list at the
   demo; Claude turns it into menu sections with prices or a services-and-prices list; the team reviews and saves. Why:
   "Send us your menu" is a required to-do on all 34 restaurant previews and "services and prices" on 15 salons; the
   first signing turns into an evening of typing for the office manager, and "live within 3 business days" could be
   "live today". The app has no photo reading yet.
9. **Attach a second product at sign-up and ask again at month 3 (S).** Default the Google Business Profile setup or the
   review cards into the sign-up picker; put "add one thing" on the Live lead's next step at 90 days. Why: a second paid
   product halves churn (Thryv), one product kept 30% of SMBs at two years vs 80% with four, and clients not upsold by
   month 3 churned 62% (Vendasta). Show three extras at the counter, not seventeen.
10. **The first 30 and 90 days as dated next steps (M).** Week 1: Google profile linked and complete, review link card in
    hand; week 2: the first stats text ("12 people called from your site"); week 3: ask for the photo they are proudest
    of; week 4: the review ask; day 90: a results call with the report and the add-on ask. Turn on Stripe's card updater
    and retries. Why: the first month decides retention, "dissatisfaction with delivery" is the top exit reason, and
    about a third of churn is failed cards. Every piece exists; the dates do not.
11. **Say the agreement's five lines out loud and initial the cancellation line (S).** Why: one or two shoppers in a
    thousand read terms; the incumbents' one-star reviews are all about surprise terms; the "In short" block is the right
    design, so make it the ritual.
12. **Ask for the yearly upgrade at month 3, not at signing (S).** Why: annual prepay retains about 30% better, whole-number
    offers ("two months free", which is what twelve-for-ten is) beat percentages, and the best moment is 2–9 months in.

### Grow the list without a bigger phone bill

13. **Join the chamber ($250) and co-host a "Get Online Day" with the Wallace State SBDC or the library (M).** Build
    previews live in the room, sign on the spot. Why: SBDC "website workday" events already run elsewhere; the app's
    one-day build is a stage act nobody else can do.
14. **Trade leads with POS reps (M).** Register as a Toast local partner ($500 per referred restaurant) and meet the local
    Clover and Square reps; pitch "we build the site that links to your ordering". Why: program terms are published; the
    results are not, so start small.
15. **Turn the incumbents' complaints into written promises (S).** One page on the company site and in the walk-in guide:
    no auto-renew surprise, cancel by text after the term, you own the domain and the content, changes within two
    business days, and a price comparison against Thryv ($99–399), Townsquare (~$300–400) and Hibu (custom, 6–12-month
    terms). Why: §4.1; the complaint columns are the competitor's weak flank and the agreement already keeps these
    promises.

### Run the team on evidence, not on screens

16. **A weekly scorecard with a 15-minute Monday look (S).** Per person: dials and visits, quality conversations, demos,
    sign-ups, paid, time-to-first-touch on inbound signals, lead age at first contact. Why: dashboards without a meeting
    go unread (BARC); the funnel across all time is fine but nobody acts on it in week one.
17. **An end-of-day three-question log instead of a morning status round; two-week contests with two winners instead of a
    leaderboard; re-ask the quick-checks on days 1, 7 and 30 (S).** Why: written reflection raised performance 23% in
    eleven days; stand-ups help only when they solve problems; rank-ordered leaderboards make leaders coast and trailers
    quit; spaced retrieval is what makes training stick, and zero lessons have been completed.
18. **Cut the first-call training to one card (S).** A "Your first call" card on Home: the five lines to say, the one
    button to tap after, "Mark done". Keep the course for the office.

### Spend the developer's time where it pays

19. **A feature freeze on new surfaces until ten paying clients, plus a cut list (policy).** Nothing new on the lead page,
    no new packs, no new extras until the tenth client pays. Candidates to hide if still unused then: Tasks (0 created),
    the costs page for callers, the glossary button on Home, most alert kinds for callers (default them to "important";
    fold "site updated" alerts per day). Why: 80% of features go unused (Pendo) and alert fatigue slows response to the
    alerts that matter; the time goes to items 1–12.
20. **Spam protection on the company form (S).** Cloudflare Turnstile plus a honeypot; drop messages linking to SEO
    domains. Why: three of four inbox items were spam and each one rang the owner's phone.
21. **Decide the second front end on purpose (policy, then L).** Keep native Android for field tasks (queue, lead page,
    log, sign-up, Tap to Pay, camera imports, preview) and serve settings, sales, costs, guides and the editor to Android
    as web views. Why: almost every change this month shipped twice; Hotwire Native's "content is web, navigation is
    native" is the pattern for a four-user app whose screens change weekly. It is the only item that halves future
    effort, and the owner's reasons for going native (cold start, Tap to Pay) survive it.
22. **Count opens per screen (M).** Web and Android report which screens are opened; hide anything under about 5% monthly
    use at the quarterly review; apply Intercom's test (valuable, within our purview, used by everyone) before building.

## 6. What not to change

- The core bet (preview first, show it in person, sign and pay on the spot) matches what the evidence and the first week
  both say: visits produced the only real interest. Keep the demo on the phone.
- The plan ladder ($49 / $89 / $149, six- or twelve-month terms, month to month with a setup fee, yearly at ten months)
  is in the market's range for done-for-you local sites and simpler than most. Do not add plans.
- The agreement, Tap to Pay, the publish gate and the sold-design exclusivity are the parts a competitor would envy. Leave
  them alone.
- The art director and the design system are now good enough that design is not why a prospect says no (owners who
  skip a website say "not relevant to my industry" far more than anything about looks). Stop polishing the generator
  until a prospect says it is.
- The agreement's "In short" block, the e-signature, Tap to Pay and the texted follow-ups are all aligned with the
  evidence on completion and friction. Keep them.

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

Team operations (read in full unless noted): HBR "The Short Life of Online Sales Leads" (via SmartCompany); two critical
reviews of the InsideSales/Oldroyd five-minute study; Workato's 2026 lead-response study; Velocify call-attempt and
texting studies (via CustomerThink and a slide deck); Gong on voicemails; InsideSales 2017 sales cadence study; Allo
2026 cold-calling statistics; Kixie and the Bridge Group on SDR activity; ActiveProspect on lead distribution; BrightLocal
2025; Google's Business Profile help on complete profiles; Review42 on Clutch 2025; Upward on restaurant sales visits; a
Hacker News thread on selling to bars and restaurants; Temple University / USPS on print vs digital; Webdesignerdepot on
objections; DocuSign's e-signature datasheet; Bakos et al. on reading licenses; Obar & Oeldorf-Hirsch on terms of service;
Patrick Campbell on SaaStr (annual prepay); a hospital deposit study; Vendasta's client churn study; Databox on client
reporting; Stray et al. on daily stand-ups; Di Stefano, Gino, Pisano & Staats on reflection; Lim, Ahearne & Ham on
sales contests; Casas-Arce & Martínez-Jerez on tournaments; Na & Han 2023 on leaderboards; Dunlosky et al. 2013 on
learning techniques; Pendo's feature adoption report and Mountain Goat on the "64%" figure; BARC on BI adoption; JMIR
2019 on alarm fatigue; Mark et al. CHI 2008 on interruptions; Airbnb on leaving React Native; Hotwire Native; Intercom
on saying no; Basecamp's Shape Up on appetites and circuit breakers.
