# Category blueprint: Tax, accounting, insurance and financial advice

Researched October 2026 for the Cullman, AL market. One template covers four kinds of small local office that sell
trust and paperwork help: **independent tax preparers** (seasonal storefront offices, often bilingual, often also doing
bookkeeping, notary or insurance), **bookkeepers, accountants and small CPA firms**, **independent insurance agencies**
(personal, business, farm and Medicare lines) and **independent financial advisors**. Four variants (section 10) change the
service list, one module, the CTAs and, most of all, **what the site and the AI copy are allowed to say** (section 5,
"Compliance"). Our sites stay static: portals, payments, booking and quoting are links to services the owner already uses.

**Method.** Candidates came from Google Places API (New) text searches ("tax preparation service", "bookkeeping service",
"independent insurance agency", "financial planner" and others) in Cullman, Hartselle, Arab, Jasper, Albertville, Boaz,
Athens, Florence, Decatur, Gadsden, Oneonta, Fort Payne (AL), Gallatin and Cookeville (TN), Dalton (GA) and Tupelo (MS).
Quality was judged by Google review count and rating (we kept mostly 4.5+ stars, highest review counts first), plus a few
low-review CPA and advisor firms because those categories collect few reviews. I downloaded each home page with a phone
user agent and scripted counts of `tel:`/`sms:`/`mailto:` links, forms and file inputs, H1s, JSON-LD types, HTML size, site
platforms, portal / booking / payment / quoting vendors, social links, and keyword patterns in the visible text (services,
insurance lines, credentials, disclosures, claims). I pulled heading sequences from 70 pages and read the opening ~170 words of
8 (Jireh Tax, Duarte & Co., Economy Tax & Insurance, GOYO Taxes, Beacon Accounting, Jean Deese Insurance, Balcazar Agency,
Dvorak Financial Planning). I also ran 13 Places searches around Cullman only to see which `primaryType`/`types` these
businesses get (section 10) and who has no website (market note). The compliance rules come from the primary sources linked
in section 5.

**Bases for the numbers.**
- **N = 96** home pages analyzed: **tax_prep 24, accounting 26, insurance 28, financial_advisor 14**, and 4 chain or captive pages
  (State Farm agent, Alfa agency, Northwestern Mutual advisor, Liberty Tax) for ideas only.
- **N = 73** of those have 300+ words of server-rendered text (18 / 18 / 23 / 12 / 2). Text counts use all 96 but are lower
  bounds for the 23 thin pages, which is itself a finding (anti-pattern 8).
- Per-variant N is small (advisors 14), so per-variant counts show direction, not precision. Keyword counts are pattern
  matches: treat them as close estimates (roughly ±2). Home pages only, so portal, fee and disclosure counts are lower bounds.

**Market note (why this category matters for us).** The 13 Cullman-area Places searches turned up **20 independents with no
website or only Facebook**: Redeemed Accounting, Cobbs Accounting Service, Carol Smith Accounting, Sandra's Tax Service
(Facebook only), Muscari Books & Payroll (Good Hope), Cindy C. Miller CPA and Pirkey Tax Service (Hanceville), Kasten Insurance
(58 reviews), Latinos Insurance and Services (42 reviews), Premier Insurance Agency, Crum & Young Insurance, Driskill-Morgan
Insurance and Safety Zone Insurance (Arab), C & L Tax Service (Hartselle, 23 reviews), Hogan Accounting & Tax, Warren Accounting
& Tax, James Tate Tax, Geremy G. Segars CPA, Segars & Co. (Hartselle) and Florette Income Tax (Somerville). One Cullman listing
with 270 reviews (Peterson & Grantham Insurance Brokers) points at a California broker's website, an "outdated website" lead.
Almost no local **advisor** lacks a site: of 20 "financial advisor" results in Cullman, 9 are Edward Jones, 6 more are Raymond
James (one under its old Morgan Keegan name), Regions, COUNTRY or Transamerica, all with corporate pages, and 2 are lenders. Tax preparers and small insurance agencies are the
real market; advisors are a small, high-friction one (section 5).

---

## 1. Summary

- **Two different selling seasons, two different conversions.** Tax and accounting offices sell an **appointment** (call or book,
  then bring or upload documents); insurance agencies sell a **quote conversation** ("get a quote" on 22/28 insurance pages vs
  1/24 tax pages). Advisors sell a **first meeting**. The CTA matrix follows that (section 5). A `tel:` link is missing on 15 of 24
  tax-prep pages, the worst of any category we have studied, so Call stays primary for tax prep.
- **Tax offices change hours by season, and almost none say so.** Only 3/24 tax-prep pages show office hours with times, while 7/24
  talk about "tax season". Our `Hours` component gets **two hour sets** (tax season and the rest of the year, which is often
  "by appointment") and switches by date, plus a "What to bring" checklist (7/24 have one) that people screenshot on a phone.
- **Documents never go through our forms.** Client portals appear on 22/50 tax and accounting pages (named vendors: SecureFilePro,
  TaxDome, SmartVault, Canopy, Liscio, ShareFile, NetClient CS, Onvio, Verifyle); 4/96 sites put a raw file upload on the home
  page. We link to the owner's portal ("Upload your documents"), and our contact form says plainly not to send Social Security
  numbers, tax forms or policy numbers. Tax preparers are covered by the FTC Safeguards Rule, so this protects them too.
- **Bilingual multiservice shops are a real segment.** 7/24 tax-prep pages are bilingual or Spanish-first, and several of the best
  reviewed (GOYO Taxes, Insurance y Más; Economy Tax & Insurance; Interamericana de Taxes; Horizonte) sell tax prep, auto insurance,
  notary and translation under one roof. Cullman's Latinos Insurance and Services is the same kind of shop with no site. The pack
  supports one primary variant plus `also_offers[]`, and the Spanish page extra is a natural upsell.
- **Insurance sites run on carrier-shopping language and rate claims.** 19/28 say "independent" or "we shop multiple companies";
  12/28 claim lowest or best rates or savings (one says "47% lower rates vs. Allstate", one "lowest Medicare supplement rates in the
  state"). Lines offered: auto 25/28, business 24, home 21, life 16, motorcycle 15, boat 14, renters 11, RV 9, farm 8, health 8,
  Medicare 4, SR-22 4. Service links (pay my bill 7/28, report a claim 10/28) are useful and rare.
- **Compliance decides the template more than design does** (section 5): Circular 230 and IRS e-file rules for tax preparers, Alabama
  CPA title and firm-permit law for accountants, Alabama insurance advertising rules and the CMS Medicare disclaimer for agents,
  and SEC/FINRA/Alabama Securities Commission rules for advisors. In short:
  - **tax_prep**: publish after the owner confirms credentials and PTINs. No refund-size, speed, "guarantee", "certified" or IRS-endorsement
    claims; refund products only with the owner's bank-product disclosure.
  - **accounting**: "CPA" anywhere requires the owner to confirm an Alabama firm permit; non-CPAs never get "CPA", "certified" or audit wording.
  - **insurance**: Alabama does not appear to require the license number on ads (we found no such rule; California does), so it is optional.
    Carrier names and logos need the owner's confirmation; no rate or savings claims; the CMS TPMO disclaimer is **required** whenever Medicare
    Advantage or Part D is offered.
  - **financial_advisor**: **the firm's compliance department must approve the site before it goes live**, the firm's disclosure text is
    pasted verbatim, BrokerCheck / Form CRS links are added as applicable, and there is **no reviews section at all** (Alabama bans
    testimonials for state-registered advisers).
- **Not targeted:** banks and credit unions, payday / title / installment lenders and check cashers, pawn shops, credit repair,
  mortgage brokers and loan officers, and captive agents of single carriers (section 13 and 10).

---

## 2. Sample

All rows were downloaded directly and are in N = 96. Chains and captive agents are for ideas only.

| Variant | Businesses (city) | N |
|---|---|---|
| tax_prep | Economy Tax & Insurance, Duarte & Co., Keen Tax Service, GOYO Taxes, Insurance y Más (Albertville AL); Boaz Tax Service (Boaz AL); Witt & Bradley / Robert Witt Tax, Tax Mart (Florence AL); Gold Rush Tax & Accounting, Horizonte Multiservices, Walker Fast Tax, Frazier Income Tax (Decatur AL); No Cap Taxes, Terri's Tax Service, XBA Tax Solutions (Jasper AL); Interamericana de Taxes, Elrod Tax Service (Gadsden AL); Dunn Right Taxes (Cullman); McAnnally, Lafoy & Associates (Gardendale AL; site for the Barnett Tax and Dunn Tax listings); Phillips Accounting & Tax (Hartselle AL); Jireh Tax MR, KZCY Income Tax, El Puente Bilingual Services (Dalton GA); Advanced Tax & Income Services (Gallatin TN); Maxx Tax (Cookeville TN) | 24 |
| accounting | Bearden Stroup & Associates CPAs, Connie J. Phillips CPA, Beacon Accounting Services, Gaylon W. Drake CPA, Fricke Sweatmon & Co., Strategic Tax & Accounting, Lindsay M. Rhodes CPA (Cullman); The Accounting Group (Hartselle AL); M.H. Young & Associates, Cooper Hill & LeCroix, Tucker Scott Bell & Marthaler (Decatur AL); Downs & Associates, Allen & Pilling (Jasper AL); Accounting Complete, Impact CPA, J&D Accounting and Tax (Gadsden AL); Pyron & Shirey (Fort Payne AL); Georgianne S. Graves CPA (Guntersville AL); Vance & Co., Divine Business Solutions (Tupelo MS); Angela Moss Gordy CPA (Dalton GA); EVA Business Solutions, The Reed Group (Gallatin TN); Alex Bookkeeping (Smyrna TN); Small Business Accounting (Sparta TN); Williams & Clark Bookkeeping & Tax (Cookeville TN) | 26 |
| insurance | Jean Deese, Akin & Associates, River Valley Insurance Group, Freedom Insurance, McPherson Insurance, Westside Advisors & Insurance, Virgil B. Fowler (Cullman); Craft Insurance, Holloway-Hunt, Karri Willis (Arab AL); Randy Jones & Associates, Balcazar Agency (Albertville AL); Woodall & Hoggle (Boaz/Guntersville AL); Jim Murphree (Oneonta AL); Kerry Wilson (Gadsden AL); Providence / Aldridge Insurance (Decatur AL); Guardian Insurance Group, Hicks & Associates (Florence AL); Goggans Insurance (Fort Payne AL); Insurance Navy Brokers, IndyRisk (Dalton GA); Johnson Family Insurance, Choice One, Lee Raines (Gallatin TN); Lafever Insurance, Valor Insurance (Cookeville TN); Ricky Credille, Jack Curtis (Tupelo MS) | 28 |
| financial_advisor | Dvorak Financial Planning, Next Phase Advisors (Cullman); Anthem Advisors, WG Financial Group (Huntsville AL); Riverfront Wealth Management (Decatur AL); Agape Insurance & Financial Group, LongView Planning Partners (Tupelo MS); Adcock Financial Group, FoundationWealth (Dalton GA); Fidelis Financial Strategies, RidgeBrooke Tax & Retirement, Cedar Row Fiduciary, Cravens & Company, Sherman & Associates (Cookeville TN) | 14 |
| Chain / captive (ideas only) | Libby Mays State Farm (Arab AL), Williams-Sims Alfa Agency (Cullman), Patterson Andrews / Northwestern Mutual (Gadsden AL), Liberty Tax (national) | 4 |

**What stood out** (read in detail or notable in the counts):

| Business (town) | Variant | What stood out |
|---|---|---|
| Jireh Tax MR (Dalton GA) | tax_prep | The best-ordered small tax site: services, "this tax season", **what to bring to your appointment**, secure portal, why trust us, FAQ, book. But "maximize your refund" in a service card. |
| Duarte & Co. (Albertville AL) | tax_prep | Owner-led ("Meet Vanessa"), bilingual, **flat fees by return type** on the home page. Also "ITIN & immigration assistance" (see 5.6). |
| Economy Tax & Insurance (Albertville AL) | tax_prep + insurance | Tax and insurance under one roof since 2005: File online, Schedule, Request a quote, Make a payment, Client portal. Spanish testimonials. |
| GOYO Taxes, Insurance y Más (Albertville AL) | tax_prep + insurance | Tax, insurance, notary, translation, three locations. Claims it helps you "avoid the risk of an audit" (anti-pattern 4). |
| Interamericana de Taxes (Gadsden AL) | tax_prep | All-Spanish site with published plans; a "Notario Público" heading (anti-pattern 6). |
| Beacon Accounting (Cullman) | accounting | Short, clear Wix site with **bookable 30-minute consultations** listed as services. |
| Vance & Co., Cooper Hill & LeCroix, Pyron & Shirey, Fricke Sweatmon | accounting | One CPA-site vendor's template: Schedule, Client portal, Services, newsletter, calculators. Two show a raw `${title}` placeholder as a heading. |
| Walker Fast Tax, Gold Rush, Phillips, The Accounting Group, Elrod | tax_prep / accounting | Five sites from one tax-office web vendor; four open with H1 "Welcome", then "Quick Contact / Helpful Links / Translate". Interchangeable. |
| Jean Deese Insurance (Cullman) | insurance | Family-owned since 1995, request a quote, home / auto / business cards, reviews. Strong local story. |
| Balcazar Agency (Albertville AL) | insurance | Short, independent, local: "choose local, choose independent", hours table, quote request, phone repeated. |
| McPherson Insurance (Cullman) | insurance | Call **or text** numbers right in the headings; carrier logo wall; five H1s. |
| River Valley Insurance Group (Cullman listing) | insurance | Comparative rate claims ("% lower rates vs." named carriers). |
| Jack Curtis, Ricky Credille, Guardian (MS/AL) | insurance (Medicare) | Education-led Medicare sites (webinars, "Are you turning 65?"). Only 1 of the 7 Medicare-selling pages in the sample shows the CMS disclaimer text. |
| Dvorak Financial Planning (Cullman) | financial_advisor | Who we serve, team, recognition, client login, **Form CRS link in the footer**. |
| Fidelis Financial Strategies (Cookeville TN) | financial_advisor | Full broker-dealer + RIA disclosure line, BrokerCheck link, CFP marks notice. |
| Libby Mays State Farm (Arab AL) | captive (ideas) | Corporate agent microsite: office-hours block, **Languages spoken** field, products offered list. |

Not counted: **25 sites** we could not reach through our network or that blocked the download (7 advisor sites and one tax
site behind the same Cloudflare challenge page, 3 that returned 403, and 14 unreachable, including Tax Xpress, Frontera Tax, Goode Tax, Marge's Tax, American Tax, Buddy Coffey CPA,
Companion CPA, Gerald Pentecost CPA, Attain, King, Kris Posey, Standridge, Tonya Williams, ABC, Bridgeway and others); one
"Coming soon" page (American Income Tax); and 3 excluded after download: libertyagencyins.com (an insurance agency's
domain that now serves an Indonesian gaming page), png-insurance.com (a California broker's site attached to a Cullman listing)
and a factoring company that a "financial planner" search returned. **Totals: 125 tried, 96 counted.**

---

## 3. Pages

Common nav labels: Services (most), About / Our team (54/96 mention a team), Contact, Client portal / Client login (29/96),
Pay online / Make a payment (18/96), Resources / Calculators (15/96, almost all template filler), Blog / News (44/96), Get a quote
(insurance), Medicare (insurance), Disclosures / Form CRS (advisors).

**Recommended page set**

- **Required:** **Home** (one long anchored page, section 4); `/privacy/` and `/thanks/` (every variant has the call-back form on);
  the core's `404.html`.
- **Per variant:**
  - tax_prep: **`/what-to-bring/`**, a printable, screenshot-friendly checklist (template text the owner edits, section 8). Also
    linked from the hero in season.
  - accounting: `/what-to-bring/` optional (on when the firm does individual returns); `/services/` only above 8 services.
  - insurance: **`/quote/`**, a call-back request (name, phone, best time, which coverage, ZIP; never date of birth, license, VIN
    or policy numbers) with a "what to have handy" list.
  - financial_advisor: **`/disclosures/`** (required): the firm's disclosure text verbatim, Form CRS and BrokerCheck / IAPD links,
    privacy notice link. Linked from every page footer.
- **Optional, only when the owner supplies the content:** *Team* page (4+ people with photos); *Medicare* page (insurance, owner's
  own wording reviewed, TPMO disclaimer at top); *Spanish page* `/es/` (existing extra; strongly suggested for bilingual offices).
- **Never generated:** blog, "tax tips", news, calculators, IRS deadline pages, rate tables, per-town pages, market commentary.
  Tax law, contribution limits and deadlines change every year; a stale tax article is worse than none and is advice we cannot
  stand behind (anti-pattern 11).

---

## 4. Home page section order

Synthesized from heading sequences on 70 pages and the 8 opening reads. All variants share one skeleton; slots 5-7 change.

1. **Header**: name/logo, call icon (`tel:`), one action button by variant (Book / Upload documents / Get a quote / Schedule),
   hamburger (≤ 6 items).
2. **Hero**: what + where ("Tax preparation in Cullman, AL", "Independent insurance agency in Arab", our own wording), one
   personality line, **status chip** (tax prep: "Tax season hours · open until 7" or "Off-season · by appointment"). Buttons by
   variant (section 5). Trust line only from confirmed fields: credential type, "Since YEAR", "Se habla español".
3. **Info strip**: this season's hours, address (tap = directions), languages, service-mode chips (Drop-off · In person · Virtual),
   insurance: "Pay a bill / Report a claim" link.
4. **What we do**: 6 service cards (variant seeds, owner-ticked). Insurance shows coverage cards with an icon each.
5. **Variant module** (section 10): tax_prep **How it works this season** (Steps + What to bring teaser + portal button);
   accounting **Monthly services** (bookkeeping, payroll, who we work with); insurance **Independent agent** band or **Medicare help**
   band (with the TPMO disclaimer beside it); advisor **Who we work with** + **How we work**.
6. **Announcement band** (optional, dated, auto-hidden after its end date): "Now booking for tax season", "Extensions welcome",
   "Medicare open enrollment: call to review your plan". Owner text only.
7. **Client tools** (when links exist): Upload documents (portal), Pay an invoice, Book online, Pay my bill / Report a claim
   (insurance, per company). Buttons, not embeds.
8. **People**: owner and staff with credentials rendered only from fields (EA, CPA, CFP®, licensed agent), languages, photo.
9. **Reviews**: 2-3 owner-approved testimonials + "Read our Google reviews" link. **Off for financial_advisor** (section 5).
10. **About**: story, year opened, community ties.
11. **Visit / Office**: full hours table for both seasons, address, directions, parking, "by appointment" note, click-to-load map.
12. **FAQ** (4+ backed answers, section 10).
13. **Final CTA band**: primary + call, repeat this season's hours.
14. **Footer**: NAP, hours, social, review link, privacy, **required disclosures** (section 5: credentials line, TPMO disclaimer,
    advisor disclosure text + BrokerCheck / Form CRS, "no documents through this form" note).

**Above the fold on a phone (360×740):** name, what+where line, the season-aware status chip, **Call** (full width; or Book when
a booking link is primary) and the second button, and the trust line. The hero photo is the office front or the owner at a desk,
≤ 55% of the viewport. Never stock photos of piles of cash, calculators on 1040s, or handshakes over contracts.

---

## 5. Features and calls to action

**CTA matrix by variant** (primary / secondary / third):

| Variant | Primary | Secondary | Third (only if link given) |
|---|---|---|---|
| tax_prep | **Call** (or **Book** when a booking URL exists) | Directions | Upload documents (portal) |
| accounting | Call (or Book a consultation) | Email | Client portal / Pay invoice |
| insurance | **Call** | **Get a quote** (`/quote/` or the owner's online rater) | Text us (if `sms_enabled`) / Pay my bill |
| financial_advisor | Call | Schedule a conversation (owner's Calendly etc.) | Directions |

Must-have (default on):

| Feature | Frequency in sample | Notes |
|---|---|---|
| Tap-to-call | 59/96 (tax_prep 9/24) | Header + action bar + hero. |
| Hours with seasons | times shown on 21/96 (tax 3/24); "tax season" wording on 15/50 tax+acct | Two hour sets + "by appointment" for the off-season; open-now chip in Central time. |
| Services as cards | nearly all | 6 seeds per variant, owner-ticked (section 10). |
| What to bring | 7/24 tax_prep | `/what-to-bring/` + home teaser. Template text, owner-edited. |
| Credentials line | EA 3/24, CPA 17/26, CFP 4/14, licensed agent 6/28 | Rendered only from `credentials[]`; wording rules in 5.2-5.5. |
| Languages | Spanish/bilingual 13/96 (tax 7/24) | "Se habla español" chip + Spanish page extra. |
| Contact form with a data warning | forms on 39/96 | Name, phone, email, message, best time. Never documents, SSNs, DOBs, policy or account numbers. |
| About / team | 54/96 | Owner photo and story are the trust core of this category. |
| Reviews link | widgets on 25/96 | Owner testimonials with written OK + Google link (not for advisors). |

Nice-to-have (toggles):

| Feature | Frequency | Notes |
|---|---|---|
| Client portal link | 29/96 mention a portal; 10 name a vendor | "Upload your documents" button; provider label from the domain. |
| Online booking | 21/96 wording; Calendly 6, Setmore 1 | Link-out; becomes primary CTA for tax_prep and advisors. |
| Pay online | 18/96 | CPACharge, LawPay, Square, PayPal, Stripe, QuickBooks / TaxDome invoice links. |
| Online quote / rater | 10/28 insurance | Link-out only (EZLynx consumer quoting, Bold Penguin and similar). |
| Pay my bill / Report a claim directory | pay 7/28, claims 10/28 | Per company the owner lists: `{company, pay_url, claims_phone, claims_url}`. Shown as a plain list. |
| Drop-off vs virtual | virtual 14/96, drop-off 1/96 | Service-mode chips; text from owner. |
| Prices | `$` amounts on 5/24 tax pages | Owner-entered only; Circular 230 fee rules apply (5.2). |
| Announcement band | n/a | Dated, auto-expires. |
| Spanish page | 7/24 tax pages bilingual | Existing extra. Same copy checker, plus the "notario" ban (5.6). |

**Trust signals that fit this category:** years in business (42/96 state "since" or a year count), family/locally owned (16/96),
named owner with photo, real office photo, credentials **as facts** (EA, CPA, CFP®, licensed agent), languages, memberships the
owner supplies (state society of CPAs, NAEA, NATP, Big I / Trusted Choice; badge images only with permission). Awards ("Forbes
Best-in-State", "Top rated") only with the owner's source and, for advisors, only with compliance approval (third-party ratings
are regulated, 5.5).

### 5.1 Compliance: what the site and the AI copy may say

This section is research, not legal advice. Each rule below is what we found in the cited source in October 2026. The
business owner (and, for advisors, their broker-dealer or RIA compliance department) is responsible for their own
advertising and must confirm anything marked **owner confirms**. The generator's job is to make the safe choice the default,
collect the facts and disclosures it needs, and block publishing until required items are confirmed.

**Publish gate summary** (required to-dos block publishing; suggested ones only show in previews):

| Variant | Required to publish | Suggested | Never generated |
|---|---|---|---|
| all | Owner reviewed every claim field; contact form shows the "no documents / SSNs" note; reviews are owner-supplied with the client's written OK | Office photo, owner photo | Google review text; self-made `AggregateRating`; claims from empty fields |
| tax_prep | `credentials[]` set (none / AFSP / EA / CPA / attorney) per person; owner confirms every paid preparer has a current PTIN; if refund products are mentioned, `refund_products` with the bank's name and the owner's disclosure text | "Authorized IRS e-file Provider" line (only if the owner confirms an EFIN); fees | "Certified" (unless CPA), "IRS-approved/endorsed/certified", IRS seals or eagle, guaranteed/maximum/fastest refund, "instant refund", audit-proof claims |
| accounting | If "CPA" is in the name, a credential or the copy: owner confirms the firm's **Alabama firm permit** (ASBPA) and the CPAs' licenses | Firm permit number in the footer | "CPA", "certified", "public accountant", audit / review / compilation services for non-CPA firms |
| insurance | Owner confirms each named agent holds an Alabama producer license for the lines shown; `agency_type` (independent / captive) set; carrier names and logos only from `carriers[]` with `logo_permission_confirmed`; if Medicare Advantage or Part D is offered, `tpmo_disclaimer` (current CMS wording with the owner's counts) | License numbers / NPN in the footer | Rate, savings or "lowest / cheapest / best rates" claims; competitor comparisons; "financial planner" for insurance-only agents |
| financial_advisor | `registration` set (state RIA / SEC RIA / broker-dealer rep / dual / insurance-only); **compliance approval confirmed** (who approved, date); `disclosure_text` pasted verbatim; BrokerCheck link (BD reps); Form CRS link (retail RIA or BD); `/disclosures/` page | IAPD link; ADV Part 2 link | Reviews, ratings, testimonials, performance, "fiduciary" / "fee-only" / "independent" unless in owner-approved text, predictions |

Every published version is kept so the owner can produce a copy if asked: Circular 230 §10.30(c) asks practitioners to keep
e-commerce advertising for 36 months, and IRS Pub 3112 asks e-file providers to keep internet ads until the end of the next
calendar year. Keep each published build's snapshot in R2 for **≥ 36 months** for tax and accounting clients (don't rely on Pages deployment
history alone).

### 5.2 Tax preparers (tax_prep, and the tax side of accounting)

- **Circular 230 §10.30** ([31 CFR 10.30](https://www.law.cornell.edu/cfr/text/31/10.30)) bars false, fraudulent, coercive,
  misleading or deceptive statements in any public communication. Enrolled agents **may not use the term "certified"** or imply an
  employment relationship with the IRS; acceptable descriptions include "enrolled to represent taxpayers before the Internal Revenue
  Service" and "enrolled to practice before the Internal Revenue Service". It also lets practitioners publish fixed fees, hourly
  rates, fee ranges and the initial consultation fee, but **published fees must be honored for at least 30 calendar days** after
  they were last published, and the practitioner must keep a copy of e-commerce communications for 36 months. → Our `fees[]` field
  stores `published_at`; a price can be lowered at once, but a price raise in Edit warns that the old price must still be honored for
  30 days.
- **Alabama rule 30-X-7-.05** ([Ala. Admin. Code](https://www.law.cornell.edu/regulations/alabama/Ala-Admin-Code-r-30-X-7-.05))
  lists as a violation putting "certified" (or similar) before "tax consultant" or similar words used by tax preparers. → "Certified
  tax preparer / consultant" is banned in copy and in owner text.
- **IRS e-file advertising standards** ([Pub 3112, Rev. 11-2025](https://www.irs.gov/pub/irs-pdf/p3112.pdf), "Advertising
  Standards"; [Pub 1345, Rev. 12-2025](https://www.irs.gov/pub/irs-pdf/p1345.pdf)): providers may not use "IRS" or "Internal Revenue
  Service" in their business name; once accepted they **may** say "Authorized IRS e-file Provider"; ads may not carry IRS or Treasury
  seals; the IRS e-file logo may not be combined with the eagle or "Federal" or used to imply a special relationship. Claims about
  faster refunds must match official IRS wording. **Refund anticipation loans and other refund-related products must be clearly
  described as a loan or financial product, not a refund**, in easy-to-read print. Providers may not advertise filing before receiving
  W-2s / 1099-Rs or imply pay stubs are enough. → No refund-speed or refund-size claims at all; "Authorized IRS e-file Provider" only
  as a text line when the owner confirms an EFIN; **no e-file logo** (we avoid its strict usage rules); refund products render only
  from `refund_products {offered, bank_name, product_name, disclosure_text}` and always say "a financial product from {bank}, not
  your refund".
- **PTIN**: every paid preparer must have a PTIN ([IRS PTIN requirements](https://www.irs.gov/tax-professionals/ptin-requirements-for-tax-return-preparers)).
  It does not need to be on the site; the owner confirms it as a publish to-do.
- **Annual Filing Season Program** participants receive a Record of Completion, not a credential, and agree to Circular 230
  subpart B, which includes §10.30 ([IRS AFSP](https://www.irs.gov/tax-professionals/annual-filing-season-program),
  [Pub 5227](https://www.eitc.irs.gov/pub/irs-pdf/p5227.pdf)). → The credential line may say "Annual Filing Season Program participant"
  (owner-confirmed). Never "certified" or "IRS-approved preparer".
- **Representation**: only attorneys, CPAs and enrolled agents have unlimited representation rights (AFSP holders have limited
  rights for returns they prepared). → "IRS letters, audits and representation" appears as a service only for EA / CPA / attorney
  credentials; non-credentialed offices may offer "Help understanding IRS letters" only if the owner ticks it.
- **Alabama does not license paid preparers.** We found no Alabama preparer licensing law; the states usually cited as regulating
  preparers are California, Oregon, Maryland and New York ([GAO-08-781](https://gao.justia.com/department-of-the-treasury/2008/8/tax-preparers-gao-08-781)).
  **Owner confirms** for offices that also serve clients in those states.
- **Client data**: tax preparers are "financial institutions" under the FTC Safeguards Rule and the IRS asks them to keep a written
  security plan ([IRS Pub 4557](https://www.irs.gov/pub/irs-pdf/p4557.pdf)). The §7216 regulations count a taxpayer's name as tax return
  information, so a testimonial naming a client should have the client's written consent (**owner confirms**). → Our forms collect no tax
  data; testimonials need the `written_ok` box.

### 5.3 Accountants, bookkeepers and CPA firms (accounting)

- **Who may say "CPA"**: in Alabama the title "certified public accountant" / "CPA" is limited to holders of a CPA certificate, and
  in public practice to those with a permit; a **firm** may use "CPAs" in connection with its name only if it is registered with the
  Alabama State Board of Public Accountancy and holds a firm permit ([Code of Ala. §34-1-16](https://law.justia.com/codes/alabama/title-34/chapter-1/section-34-1-16/),
  [§34-1-6](https://law.justia.com/codes/alabama/title-34/chapter-1/section-34-1-6/)); the Board says even sole practitioners must
  practice under a firm permit ([ASBPA top violations guide](https://asbpa.alabama.gov/wp-content/uploads/2025/04/2021-3-21-TOP-VIOLATIONS-QUICKGUIDE-BG.pdf)).
  Board rules also bar misleading firm names and false or misleading advertising ([Rule 30-X-6-.05](https://www.law.cornell.edu/regulations/alabama/Ala-Admin-Code-r-30-X-6-.05)).
  Note: Justia marks §34-1-6 as amended by Act 2026-16; **owner confirms** against the current text.
- → If the record or name contains "CPA" / "C.P.A." / "certified public accountant", a **required** to-do asks the owner to confirm
  the firm permit (optional `firm_permit_no` shown in the footer). Non-CPA bookkeepers and tax offices get no CPA wording, no
  "certified", no "public accountant", and **no attest services** (audits, reviews, compilations of financial statements) in seeds
  or copy. "Accounting", "bookkeeping", "payroll" and "tax preparation" are fine for anyone.
- QuickBooks "ProAdvisor" (1/96) and other vendor certifications render only as owner-supplied badges.

### 5.4 Insurance agencies (insurance)

- **Truthful, not misleading, including by implication**: Alabama's advertising rules for accident and sickness insurance
  ([Ala. Admin. Code ch. 482-1-013](https://admincode.legislature.state.al.us/api/chapter/482-1-013)) and life insurance and
  annuities ([ch. 482-1-132](https://admincode.legislature.state.al.us/api/chapter/482-1-132)) apply to producers as well as insurers.
  Ads must identify the insurer when they advertise an insurer's product (482-1-132-.07), may not look like a government program
  (.07(3)), may not say "free" unless true (.05(13)), and **an insurance producer may not use "financial planner", "investment
  adviser", "financial consultant" or "financial counseling" in a way that implies an advisory business unless that is true**
  (.05(14)). The accident and sickness rule's interpretation says insurers shall require producers to submit ads using the insurer's
  name for **insurer approval before use**.
- **License number on the website: not required in Alabama, as far as we found.** We read chapters 482-1-013, 482-1-132 and the
  producer-licensing chapter 482-1-147 and searched for a license-number advertising rule; none applies to agency websites. California,
  by contrast, requires it (Cal. Ins. Code §1725.5, [CDI bulletin 96-08](https://www.insurance.ca.gov/0250-insurers/0300-insurers/0200-bulletins/bulletin-notices-commiss-opinion/bulletin-96-08.cfm)).
  **Owner confirms**, especially for agencies licensed in other states. → `license_no` / NPN is an optional footer line; the publish
  to-do only asks the owner to confirm the named agents are licensed for the lines shown.
- **Carrier names and logos**: show only carriers the agency is appointed with, and logos only when the owner confirms permission
  (carrier brand rules and agency agreements govern logo use; **owner confirms**). Carriers change agencies often, so the list carries
  a "last confirmed" date and the app reminds the owner yearly. Default is a plain text list "Companies we work with", no logos.
- **Rate claims**: "lowest rates", "cheapest", "save X%", "best price" and competitor comparisons (12/28 in the sample) are claims the
  agency must be able to prove and that the Alabama rules treat as misleading if not. → The copy checker bans them; owner text with
  such phrases is flagged for removal before publish.
- **Medicare**: agencies that sell Medicare Advantage or Part D for more than one plan sponsor are third-party marketing organizations
  and must prominently display the CMS disclaimer on their websites ([42 CFR 422.2267(e)(41)](https://www.law.cornell.edu/cfr/text/42/422.2267)).
  The version we read: "We do not offer every plan available in your area. Currently we represent [number of organizations]
  organizations which offer [number of plans] products in your area. Please contact Medicare.gov or 1-800-MEDICARE to get information
  on all of your options." (Agencies that sell for every MA organization in the area use a shorter version; recent versions in use also
  name the local State Health Insurance Program.) CMS has changed this wording between plan years and the counts are the agency's,
  so the **owner pastes the current text from their carrier or FMO**; we never compose it. Only 1/7 Medicare-selling pages in our sample
  had it. Also: no "Medicare" names, logos or colors that suggest a government site, and no "free" unless true.
- **Captive agents** (State Farm, Allstate, Farmers, Alfa, COUNTRY, Shelter, Farm Bureau, Nationwide exclusive, Globe Life / Liberty
  National, and similar) get a corporate page and their carrier controls their marketing; nearly all already have a `websiteUri` to it.
  Exclude them (section 10).

### 5.5 Financial advisors (financial_advisor)

- **FINRA Rule 2210** ([rule text](https://www.finra.org/rules-guidance/rulebooks/finra-rules/2210)) covers registered reps of
  broker-dealers: a website is a retail communication, and **a registered principal of the member firm must approve it before first
  use** (2210(b)(1)(A)); it must prominently name the member firm (d)(3); every member website must carry a readily apparent
  **reference and hyperlink to BrokerCheck** on its initial retail page and on any page profiling registered persons (d)(8);
  testimonials need prominent disclosures (d)(6); no promissory, exaggerated or predictive claims (d)(1).
- **SEC Marketing Rule** ([17 CFR 275.206(4)-1](https://www.law.cornell.edu/cfr/text/17/275.206%284%29-1)) covers SEC-registered
  advisers: no untrue or unsubstantiated claims, benefits must be balanced with risks, testimonials and endorsements only with
  clear disclosures (client or not, paid or not, conflicts), oversight and a written agreement; third-party ratings only with
  date, period, rater and compensation disclosed. Displaying or linking to client reviews can make the adviser responsible for
  them.
- **Alabama state-registered advisers**: Alabama Securities Commission rule **830-X-3-.22(1)(a)** makes it a fraudulent practice for an
  investment adviser to publish any advertisement that "refers, directly or indirectly, to any testimonial of any kind"
  ([ch. 830-X-3](https://admincode.legislature.state.al.us/api/chapter/830-X-3)). Most small local RIAs are state-registered.
- **Form CRS**: retail RIAs and broker-dealers with a public website must post their current Form CRS prominently on it
  (Advisers Act Rule 204-5(b)(3), Exchange Act Rule 17a-14; [SEC Form CRS guide](https://www.sec.gov/info/smallbus/secg/form-crs-relationship-summary)).
  8/14 advisor pages in the sample link it; 6/14 link BrokerCheck.
- **Titles**: in the Regulation Best Interest adopting release, the SEC treats a stand-alone broker-dealer (or its rep who is not an
  investment adviser representative) using "adviser" or "advisor" in a name or title as presumptively violating the disclosure
  obligation ([SEC Reg BI page](https://www.sec.gov/regulation-best-interest); **owner's compliance confirms**). Alabama also limits
  insurance-only producers calling themselves financial planners (5.4).
- **What our generator must do**:
  1. Ask `registration` first; "insurance-only" advisors go to the insurance variant (with 482-1-132-.05(14) wording rules).
  2. **Required to-do: "Your firm's compliance department approved this website"** with approver name and date. Publishing stays
     blocked until it is ticked. In practice the owner sends the preview link (or a PDF from the browser) to their compliance team.
  3. `disclosure_text`: required, pasted verbatim from the firm ("Securities offered through …, Member FINRA/SIPC. Advisory services
     offered through …"), shown in the footer of every page and on `/disclosures/`. The AI never writes or edits it; it is excluded
     from the copy checker's rewrite and from the Spanish page translation (the Spanish page shows the English text unless the firm
     supplies a translation).
  4. BrokerCheck link (required for BD reps), IAPD link (adviserinfo.sec.gov, suggested for RIAs), Form CRS link (required for
     retail RIA / BD).
  5. **No reviews section, no star rating, no "Read our Google reviews" link, no review QR cards or "Ask for a review" texts** for
     this variant. Under the Alabama rule even a link to reviews is risky, and an SEC adviser would need disclosures we cannot verify.
  6. No performance, returns, market views, "guaranteed income", "protect your principal", "fiduciary", "fee-only" or "independent"
     unless the words come from owner text the firm approved.
  7. Most advisors affiliated with a broker-dealer must use a firm-approved web vendor. **Ask before building**: the walk-in guide
     should ask "Does your firm let you use your own website?" first. Default: no advisor search group in the Run picker; leads come
     only from "Add a business by hand".

### 5.6 Notary, translation and immigration wording (multiservice offices)

Several bilingual tax offices advertise notary service (8/96) and one "ITIN & immigration assistance". In Spanish, "notario
público" suggests a lawyer, and many states ban non-attorney notaries from using "notario" or "notario público" in ads and require
a "not an attorney" notice (for example [Nevada NRS 240.085](https://law.justia.com/codes/nevada/chapter-240/statute-240-085)).
We did not find an Alabama rule; **owner confirms**. → Our copy never uses "notario"; the service label is "Notary public" in
English and "Servicio de notaría (notary public)" on the Spanish page; "immigration" services are never generated (unauthorized
practice of immigration law risk). ITIN help renders as "ITIN applications (Form W-7)" and "Certifying Acceptance Agent" only
from an owner-confirmed field.

---

## 6. Third-party integrations

| Tool | Seen | How we use it |
|---|---|---|
| Client portals: SecureFilePro (Drake) 2, TaxDome 2, SmartVault, Canopy, Liscio, ShareFile, NetClient CS, Onvio, Verifyle (1 each) | 10/96 named; 29/96 mention a portal | `links.portal` button "Upload your documents" / "Client portal". Provider name from the domain. Never embed. |
| Booking: Calendly 6, Setmore 1, Wix Bookings (Beacon) | 7/96 named | `links.booking`; becomes the primary CTA for tax_prep and advisors. |
| Payments: CPACharge, LawPay, Square, PayPal, Stripe, QuickBooks / TaxDome invoices | 18/96 "pay online" | `links.pay` button "Pay an invoice". |
| Insurance online quoting: EZLynx consumer rater, Bold Penguin, similar | 10/28 | `links.quote_rater` → "Start an online quote" (secondary to the call-back form). |
| Carrier service links (pay a bill, report a claim) | 7/28 and 10/28 | `carriers[]` directory, plain list. |
| Site platforms seen | WordPress 44/96, Wix 9, GoDaddy 6, one CPA-site vendor 5, one tax-office template 5, insurance-agency vendors (ITC / Agency Revolution / EZLynx) 6, Weebly 3, Duda 3 | Template sites look identical across firms (anti-pattern 1). |
| Google Maps embed | rare | Click-to-load on the Visit section only. |
| **Skip:** review widgets (25/96), chat bubbles (6/96), calculators (15/96), newsletter boxes (20/96), reCAPTCHA (32/96), file-upload fields | | Testimonials + Google link; Turnstile + honeypot on our form; the owner's portal for files. |

---

## 7. Mobile behavior

- Viewport tag on 95/96; most layouts are responsive, but phone pages bury the basics: tax pages lead with "Welcome" and template
  sidebars ("Quick Contact", "Helpful Links", "Translate") before the phone number or hours.
- **Action bar** (bottom, < 768 px): tax_prep **Call · Book (or Directions) · Upload**; accounting **Call · Email · Portal**;
  insurance **Call · Quote · Text** (Text only when `sms_enabled`; McPherson's call-or-text pattern); advisor **Call · Schedule ·
  Directions**.
- **Season-aware status chip** in the hero, computed in `America/Chicago` from the right hour set ("Tax season hours · open until 7 PM",
  "Off-season · by appointment, call to schedule").
- `/what-to-bring/` is a single-column checklist with large tap targets and a **Print / Save** button (`window.print()` with a print
  stylesheet). Checkboxes are visual only (no storage needed).
- The insurance `/quote/` form uses `inputmode="tel"`, `autocomplete` hints, 5-6 fields max, and a "Prefer to talk? Call" button above it.
- Disclosure text in the footer uses the body size (never the 11 px gray "fine print" common in advisor sites), meeting contrast.
- Images: one hero (≤ 150 KB on mobile), lazy-load the rest; no carousels (several template heroes are "Slide title" sliders).

---

## 8. Content the AI writes

Tone by variant: **tax_prep** friendly, plain, reassuring ("we'll walk you through it"), bilingual-ready short sentences;
**accounting** steady and organized, small-business focused; **insurance** neighborly and practical, about protecting what people
have, never fear-based; **financial_advisor** calm, plain, educational, no promises. All: 6th-8th grade reading level, name the
town, no superlatives.

| Section | Copy | Length | Notes |
|---|---|---|---|
| Hero headline | What + where | 4-9 words | "Tax preparation in Cullman" pattern in our own words. |
| Hero subline | Who they help + one confirmed fact | 12-22 words | Fact from fields only (since YEAR, bilingual, family-owned). |
| Service cards | One line each | 8-16 words | Describe the service, never outcomes ("bigger refund", "save"). |
| How it works (Steps) | 3-4 steps | 8-14 words each | Template default, AI may smooth wording; no timing promises. |
| What to bring | Checklist | template | **Template text, not AI.** Owner edits. |
| Variant module intro | Independent agent / Medicare help / Monthly services / Who we work with | 30-60 words | From enabled fields only. |
| About | Owner story | 100-180 words | Placeholder until owner input; never invents history or credentials. |
| FAQ | 4-6 answers | 30-70 words | Only for backed topics (section 10). Answers are about the office, never about tax law. |
| Meta | Title ≤ 60, description ≤ 155 | | Section 12. |
| Alt text | Office and people photos | 5-12 words | |

**Default "What to bring" list** (tax_prep; owner unticks or adds): photo ID; Social Security cards or ITIN letters for everyone on the
return; all W-2s and 1099s (including 1099-NEC, -K, -INT, -DIV, -R, -G and SSA-1099); last year's return; Form 1095-A if you had
Marketplace coverage; 1098 mortgage interest and property tax records; 1098-T and education expenses; child care provider name,
address and tax ID; records of estimated tax payments; business income and expense records if self-employed; bank routing and account
number for direct deposit; your IRS Identity Protection PIN if you have one. No dollar limits, credits or deadlines.

**The AI must never claim or invent** (each renders only from an owner field, and the copy checker rejects the phrases):
- **Credentials and licenses**: CPA, EA, CFP®, ChFC, CLU, "licensed", "certified", "enrolled", "registered", "bonded", license or
  permit numbers, PTINs, "Authorized IRS e-file Provider", "Certifying Acceptance Agent", memberships, "IRS-approved" in any form.
- **Years and size**: years in business, founding year, number of clients, returns filed, carriers represented, locations.
- **Refunds and outcomes**: "maximum / biggest / guaranteed refund", "maximize your refund", "fast / faster / fastest / same-day / instant
  refund", "get your money today", "avoid an audit", "audit-proof", "no audit risk", "we'll find every deduction", any dollar or
  percentage savings.
- **Refund products**: refund advances, refund transfers, "no-cost advance", loans, unless `refund_products` is filled, and then only
  the owner's disclosure text.
- **Insurance rates and companies**: "lowest / cheapest / best / affordable rates", "save up to", "bundle and save X%", competitor
  comparisons, carrier names not in `carriers[]`, "A-rated", "we work for you, not the insurance company" unless `agency_type =
  independent`, Medicare plan names, "$0 premium", "free" benefits.
- **Advice**: any tax, insurance or investment advice or tax-law fact (deduction rules, limits, deadlines, rates, "you can write off",
  "Roth vs traditional"), predictions, performance, "protect your savings", "guaranteed income", market commentary.
- **Advisor terms**: "fiduciary", "fee-only", "independent", "unbiased", "conflict-free", "wealth management" unless in owner/firm text.
- **Superlatives**: best, #1, top-rated, leading, premier, trusted by thousands, award-winning (unless an owner-supplied award).
- **Notario / immigration / legal**: "notario", "abogado", "lawyer", "legal advice", "immigration services".

The checker (reuse the fact / phrase check in `src/copy/write.ts`) gets a category-specific banned-phrase list in English **and**
Spanish (e.g. "reembolso máximo", "reembolso garantizado", "el más barato", "notario"), and the Spanish page writer gets the same
brief.

**Data from Google Places** (preview use, refresh rather than store, except Place ID): name, address, phone, hours (current
season only, so the off-season set is always an owner question), primary type / types (variant detection), website / Facebook URL,
Maps URL, rating and review count (ranking and AI context only), photos (**preview only, never on published sites**). Review text:
private AI context only; never quote or paraphrase it, and never let it suggest outcomes ("got me a huge refund").

**Must come from the owner:** credentials per person, PTIN / EFIN / firm permit / license confirmations, both hour sets, services,
languages, service modes (drop-off, in person, virtual), portal / booking / pay / quote links, fees (optional), refund products
(optional), carriers and permissions, Medicare disclaimer text, advisor registration, disclosure text and compliance approval,
photos, story.

---

## 9. Data model

Core fields as in `00-shared-baseline.md` §8.2 (name, phone, `sms_enabled`, address, `show_street_address` = **true** by default;
false for home-based preparers who meet "by appointment", hours, social, reviews, people, offers, look). Category extension
`ext.finance`:

| Field | Req | Source | Notes |
|---|---|---|---|
| `variant` | R | Sys → Own | `tax_prep · accounting · insurance · financial_advisor` (section 10). |
| `also_offers[]` | O | Sys → Own | Secondary lines that add cards, never a second module: `tax_prep, bookkeeping, payroll, insurance, notary, translation, itin`. |
| `services[]` | R | Sys default → Own | 6 seeds per variant; `{id, label, blurb?, enabled, requires?}` where `requires` is a credential (e.g. `representation` needs EA / CPA / attorney, `attest` needs CPA firm). |
| `credentials[]` | R | Own | Per person: `{person_id, kind: none/afsp/ea/cpa/attorney/cfp/chfc/clu/licensed_agent/other, label_verbatim, confirmed}`. Drives the credentials line and blocks banned wording. |
| `ptin_confirmed`, `efin_confirmed` | R / O | Own | tax_prep: PTIN confirmation required; EFIN only unlocks the "Authorized IRS e-file Provider" line. |
| `firm_permit` | C | Own | Required when "CPA" appears anywhere: `{confirmed, number?}`. |
| `hours_seasons` | R (tax_prep) | P (current) + Own | `{season: {from: "MM-DD", to: "MM-DD", label, periods}, offseason: {periods | by_appointment: true, note}}`; `Hours` picks the set by date (Central time). |
| `service_modes[]` | O | Own | `drop_off, in_person, virtual, mail`. |
| `languages[]` | O | Own | e.g. `["en","es"]`; drives "Se habla español" and the Spanish page suggestion. |
| `links` | O | Own | `{portal?, booking?, pay?, quote_rater?, crs?, brokercheck?, iapd?, adv_part2?}`; provider detected from domain. |
| `fees[]` | O | Own | `{label, amount_text, published_at}`; price raises warn about the 30-day rule (5.2). |
| `refund_products` | O | Own | `{offered, bank_name, product_name, disclosure_text}`; nothing renders unless all are filled. |
| `insurance` | C | Own | `{agency_type: independent/captive/both, lines[] (auto, home, life, health, business, farm, renters, motorcycle, boat, rv, flood, umbrella, sr22, bonds, medicare, crop), medicare: {offered, tpmo_disclaimer}, license_lines_confirmed, license_no?, npn?}`. |
| `carriers[]` | O | Own | `{name, pay_url?, claims_phone?, claims_url?, logo_permission_confirmed, last_confirmed}`; text list by default, logos only with permission. |
| `advisor` | C | Own | `{registration: state_ria/sec_ria/bd_rep/dual/insurance_only, firm_name, bd_name?, ria_name?, disclosure_text, compliance_approved: {by, date}, audiences[]}`. |
| `what_to_bring[]` | O | Sys default → Own | Checklist items (section 8). |
| `announcements[]` | O | Own | `{text, start, end}`; hidden outside the window. |
| `testimonials[]` | O | Own | Core `reviews` plus `written_ok: true` required per item; disabled for financial_advisor. |
| `office_photos[]` | O | Own | Never Google photos when published. |

Publish gate additions: all required to-dos in the 5.1 table; any banned phrase (section 8) in AI or owner text blocks publishing
with a highlighted message; announcements and dated items past their end date are hidden, never published stale.

---

## 10. Variants

**What Places returns for these businesses** (13 Cullman searches + 48 searches in 12 other towns, ~800 results): tax, bookkeeping
and accounting results have `primaryType` **`consultant` (226/312)**, `finance` (51) or `accounting` (26), and nearly all carry
`accounting` in `types`. Insurance results are `insurance_agency` (251/263; 55 also get `health`). "Financial advisor/planner"
results are `consultant` + `finance` (161/229) with no `accounting`. Lenders are `finance` only (13/17). There is **no**
`tax_preparation_service`, `financial_planner` or `mortgage` type in Places API (New) Table A or B; the finance-related types are
`accounting`, `atm`, `bank` (Table A, "Finance"), `insurance_agency` (Table A, "Services") and `finance` (Table B)
([Place types](https://developers.google.com/maps/documentation/places/web-service/place-types)). So **names decide** tax vs
accounting vs advisor.

**Exclusions first** (not this pack):

| Rule | Why |
|---|---|
| `types` contains `bank`, `atm`, `local_government_office`, `government_office`, `lawyer`, `real_estate_agency` | Banks, revenue offices, attorneys, realtors. |
| Name matches `\b(bank|credit union|federal credit|savings|mortgage|home loans?|lending|lender|loans?|payday|cash (advance|express|master|solutions)|title (loans?|pawns?)|check cashing|pawn|credit)\b` | Lenders, check cashers, pawn, credit repair, mortgage (section 13). |
| `types` is only `finance` (no `accounting`, `consultant`, `insurance_agency`) and the name has "Finance" or "Financial Services" | Consumer-finance lenders (World, Republic, OneMain, Heights, Tower, Kinsmith…). |
| Chain / captive names (add to `CHAINS`): h&r block, jackson hewitt, liberty tax, state farm, allstate, farmers insurance, alfa insurance, country financial, nationwide, shelter insurance, farm bureau, american family, globe life, liberty national, transamerica, world financial group, primerica, edward jones, raymond james, ameriprise, northwestern mutual, new york life, massmutual, thrivent, modern woodmen, woodmenlife, kemper, direct auto, acceptance insurance, freeway insurance, geico, progressive, aflac, regions, wells fargo, merrill, morgan stanley, stifel, truist | Corporate pages and carrier/firm-controlled marketing. |

**Assignment** (check in this order; first match wins; regexes are case-insensitive word matches):

| Order | Variant | Places types | Name keywords |
|---|---|---|---|
| 1 | tax_prep | any of the above not excluded | `tax(es)?`, income tax, `impuestos`, `taxes y`, e-?file, refund — **unless** the name has `CPAs?` / `C\.P\.A` (then accounting) |
| 2 | accounting | `accounting` primary, or any with name match | `CPAs?`, `C\.P\.A`, certified public, accounting, accountants?, bookkeep\w*, books, payroll, ledger, "& Co., P.C." |
| 3 | insurance | `insurance_agency` (any) | insurance, insurors, seguros, medicare, benefits, underwriters, "agency" with an insurance type |
| 4 | financial_advisor | `consultant` + `finance` without `accounting` / `insurance_agency`, or name match | wealth, financial (planning / planners? / advisors? / group / strategies / partners), retirement, invest\w*, capital management, asset management, advis(ors?|ory), fiduciary |
| 5 | fallback | `accounting` in types | → tax_prep (most common small office); otherwise not this pack. |

`also_offers[]` from the name: insurance / seguros → `insurance`; notar → `notary`; translat / traduc → `translation`; bookkeep / books →
`bookkeeping`; payroll → `payroll`. So "Economy Tax & Insurance" = tax_prep + insurance, "Gold Rush Tax & Accounting" = tax_prep +
bookkeeping, "Agape Insurance and Financial Group" = insurance (advisor words become a question for the owner, not a module).
Medicare focus: name has medicare / senior / benefits, or the owner ticks Medicare → insurance with the Medicare band and the
required disclaimer.

**Per variant:**

| | tax_prep | accounting | insurance | financial_advisor |
|---|---|---|---|---|
| Label | Tax Preparation | Accounting & Bookkeeping | Insurance Agency | Financial Planning |
| schema.org type | `AccountingService` | `AccountingService` | `InsuranceAgency` | `FinancialService` |
| Seed services (6) | Individual tax returns · Self-employed & 1099 returns · Small business returns · Prior-year & amended returns · Bookkeeping · Payroll | Monthly bookkeeping · Payroll · Business tax returns · Individual tax returns · QuickBooks setup & help · Tax planning for businesses | Auto · Home · Life · Business · Farm & ranch · Boat, motorcycle & RV | Financial planning · Retirement planning · Retirement income · Investment management · Insurance & annuities (only if licensed) · Working with your estate attorney |
| Credential-gated seeds | IRS letters & representation (EA / CPA / attorney); ITIN applications | Financial statements: compilations, reviews, audits (CPA firm permit) | Medicare plans (disclaimer); Health (lines confirmed) | Investment management (RIA / BD) |
| Primary CTA | Call (Book if link) | Call (Book a consultation if link) | Call + Get a quote | Call (Schedule if link) |
| Hero eyebrow | `Tax preparation · {City}, {ST}` | `Accounting & bookkeeping · {City}, {ST}` | `Independent insurance agency · {City}, {ST}` (or `Insurance agency` if not independent) | `Financial planning · {City}, {ST}` |
| Module | How it works this season + What to bring | Monthly services + Who we work with (industries) | Independent agent band or Medicare help band + Pay a bill / claims directory | Who we work with + How we work |
| FAQ ideas | Do I need an appointment or can I drop off? What should I bring? Can I send documents without coming in? Are you open after April? Do you speak Spanish? How much does it cost? (owner fee text only) | Do you work with businesses like mine? Do you use QuickBooks? How do I send documents? Do you do payroll? Monthly pricing? (owner text) | Which companies do you work with? Can you review my current policy? What do I need for a quote? How do I pay my bill or file a claim? Do you insure farms / businesses? Do you help with Medicare? | Who do you work with? What happens at the first meeting? How are you paid? (firm-approved text only) Where can I check your background? (BrokerCheck / IAPD) |
| Seasonal notes | Peak January to mid-April; owner sets both hour sets; "Now booking" band from early January; extension and late-filer bands are owner text with end dates. The template **never prints tax deadlines** (the IRS moves them for weekends and disaster relief). | Payroll and 1099 work peaks in January; same two-season hours when the firm does individual returns. | Medicare Annual Enrollment (Oct 15 - Dec 7) and MA Open Enrollment (Jan 1 - Mar 31): owner-enabled announcement only. Spring storm season: no fear copy. | Year-round; no seasonal prompts. |
| Default look | D (A for CPA-led offices) | A | B | C |

**Google Places text-search terms around Cullman** (for `SEARCH_GROUPS`):

| Group | Variant | Terms |
|---|---|---|
| `tax` "Tax preparers & bookkeepers" | tax_prep / accounting | "tax preparation service", "income tax service", "tax preparer", "bookkeeping service", "taxes y seguros" |
| `accounting` "Accountants & CPAs" | accounting | "accountant", "CPA", "payroll service", "small business accountant" |
| `insurance` "Insurance agencies" | insurance | "insurance agency", "independent insurance agent", "auto insurance agency", "Medicare insurance agent", "seguros de auto" |
| `advisor` "Financial advisors (firm approval needed)" | financial_advisor | "financial advisor", "financial planner", "retirement planning", "investment advisor". **Off by default**; use Add-by-hand. |

In the Cullman searches, "tax preparation" and "accountant" returned the same 15-20 offices (tax and CPA firms overlap), "insurance
agency" returned 20 with 5 captive or direct-writer offices, and "financial advisor" returned 20 of which 15 were corporate. Run "Nearby towns" for tax and
insurance: Hartselle, Hanceville and Arab produced most of the no-website leads.

---

## 11. Design looks

Four looks distinct from the other categories' looks. Trustworthy and calm, but local and warm, not bank-navy. All pairs below
were checked: body text ≥ 11.7:1 on every background and band, CTA white text ≥ 6.3:1, CTA color on background ≥ 6.4:1.
Accents are decorative only (or carry dark text, ≥ 4.6:1). Neighbor rule: no two clients of the same variant within ~5 miles
share a look and accent (tax offices cluster on the same streets every season).

### Look A: "Ledger & Linen"
- **Mood:** orderly, warm paper and green ledger ink. CPA firms, bookkeepers, established tax offices.
- **Palette:** linen `#F8F5EE` bg, ink `#1F2A24` text, ledger green `#2F5D4A` CTA (white 7.5:1), sage wash `#E7EEE7` bands,
  deep green headings `#1F3A2E`, brass `#B8862B` rules and numerals only. Variant 2: oxblood `#7A3E2B` CTA (8.2:1).
- **Type and layout:** *Literata* (headings) + *Public Sans* (body, tabular numerals for hours and fees). Ruled section dividers like
  ledger lines, `card_style: ruled`, services as a two-column ledger list, credentials in small caps.

### Look B: "Main Street Agency"
- **Mood:** a friendly storefront agency on the square: porch light and painted trim. Insurance agencies, multiservice offices.
- **Palette:** warm white `#FBFAF7`, text `#1E2530`, harbor teal `#1C5C68` CTA (7.6:1), sky wash `#E2EFF0` bands, porch-light amber
  `#E3A33B` icons and underlines (dark text on it 7.0:1), headings `#163F48`. Variant 2: barn-brick `#9A3B26` CTA (6.9:1).
- **Type and layout:** *Bitter* (slab headings) + *Source Sans 3* (body). Coverage cards with line icons (car, house, barn, boat),
  rounded 10 px buttons, `badge_style: pill` for "Se habla español" and "Since YEAR", a striped awning divider under the hero.

### Look C: "Long View"
- **Mood:** calm, open, unhurried: a view across a lake on a still morning. Financial advisors and retirement-focused planners.
- **Palette:** stone `#F6F4EF` bg, charcoal `#26292B` text, terracotta `#8E4428` CTA (7.0:1), sand band `#ECE5DA`, slate headings
  `#2F3E46`, sage `#9DB0A3` decorative lines only. Variant 2: lake slate `#3E5A6E` CTA (7.3:1).
- **Type and layout:** *Newsreader* (headings, generous size) + *Figtree* (body). `section_spacing: airy`, narrow 680 px text column,
  numbered "How we work" steps with thin rules, full-size footer disclosure block styled as a readable panel, no badges or stars.

### Look D: "Bright Desk"
- **Mood:** busy, cheerful tax-season office: sunflower and cobalt, sign-in clipboard energy. Tax preparers, bilingual multiservice
  shops.
- **Palette:** white `#FFFFFF`, text `#1B1D2A`, cobalt `#2347B5` CTA (8.0:1), sunflower `#F2B705` highlights and the season chip
  background (dark text 9.2:1), butter band `#FFF3D1`. Variant 2: raspberry `#B02E4C` CTA (6.3:1).
- **Type and layout:** *Bricolage Grotesque* (headings) + *Atkinson Hyperlegible* (body; clear numerals and accents for Spanish).
  Big season chip in the hero, checklist styling for What to bring (CSS check marks), `card_style: bordered`, bold step numbers.

---

## 12. Local SEO

**Schema.org** (one business node per the baseline): `AccountingService` for tax_prep and accounting (it is a `FinancialService`
subtype), `InsuranceAgency` for insurance, `FinancialService` for financial_advisor. Properties: `openingHoursSpecification` with
`validFrom` / `validThrough` for the tax-season set and a second set for the off-season; `address` (street shown unless home-based),
`geo`, `hasMap`, `sameAs` (Facebook, LinkedIn, Instagram), `areaServed` (towns from the owner), `knowsLanguage` and
`contactPoint.availableLanguage` from `languages[]`, `hasOfferCatalog` of services (no prices unless `fees[]`), `employee` /
`founder` as `Person` with `hasCredential` only from confirmed credentials. **Never** `AggregateRating` or `Review` markup (3/96
self-mark it). Sample: any JSON-LD on 61/96, a business-type node on 30/96, a specific type (`AccountingService`, `InsuranceAgency`,
`FinancialService`) on 14/96, and only 1 uses `AccountingService`.

**Titles** (≤ 60 chars):
- tax_prep: `Tax Preparation in {City}, {ST} | {Business}` (or `Tax Preparation & Bookkeeping` when `also_offers` has bookkeeping)
- accounting: `Accounting & Bookkeeping in {City}, {ST} | {Business}` (`CPA Firm in {City}, {ST}` only with a confirmed firm permit)
- insurance: `Insurance Agency in {City}, {ST} | {Business}` (`Independent Insurance Agency` when confirmed; `Medicare Help` when Medicare-led)
- financial_advisor: `Financial Planning in {City}, {ST} | {Business}` (never "Financial Advisor" unless the registration allows the title, 5.5)

**Meta description** (≤ 155): kind of office + town + 2-3 services + a mode or language hook, e.g. pattern
`{Business} in {City} prepares individual and small business tax returns. In person or upload from home. Call {phone}.`
The Spanish page gets its own title and description (`Preparación de impuestos en {City}, AL | {Business}`).

**Notes:** H1 = what + town, exactly one (23/96 have none, 22/96 several; five template sites use "Welcome"). People search
"tax preparation near me", "taxes Cullman", "impuestos cerca de mí", "insurance agency Cullman", "Medicare agent near me": service and
language words must be visible text. NAP and **both hour sets** must match the Google Business Profile; the owner should set special
hours before and after tax season. Google often files these offices under `consultant`, so the GBP step-1 checklist should tell the
owner to set the primary GBP category ("Tax preparation service", "Accountant", "Bookkeeping service", "Insurance agency", "Financial
planner") and add Spanish as a language attribute. Advisors: skip GBP review asks entirely (5.5).

---

## 13. Anti-patterns

1. **Interchangeable template sites.** Five tax and accounting sites come from one tax-office web vendor (four open with H1
   "Welcome", then "Quick Contact / Helpful Links / Translate"); four CPA firms share another, two with a raw `${title}` placeholder as a heading; a tax site still shows three
   "Slide title" headings. Nothing tells a visitor whose office it is.
2. **No tap-to-call where calls are the business:** `tel:` on only 9/24 tax-prep pages (59/96 overall).
3. **Missing or season-blind hours:** hours with times on 21/96 and only 3/24 tax-prep pages, while the same offices change hours every
   April. Two hour sets are the fix.
4. **Unprovable outcome and rate claims:** "maximize your refund", "avoid the risk of an audit", "lowest Medicare supplement rates in
   the state", "% lower rates vs." named carriers, "best rates" (lowest / best-rate wording on 12/28 insurance pages). These break
   Circular 230 §10.30, IRS e-file advertising standards or Alabama insurance advertising rules.
5. **Missing required disclosures:** the CMS TPMO disclaimer on 1/7 Medicare-selling pages. (Advisors did better: Form CRS 8/14,
   BrokerCheck 6/14, because their firms' compliance teams review those sites.)
6. **"Notario Público" and immigration wording** on bilingual tax sites (see 5.6), and ITIN help described as if the office were an IRS
   agent.
7. **Dead, hijacked or wrong domains:** an insurance agency's domain now serves a gaming page; a Cullman listing with 270 reviews points
   to a California firm's site; a tax office's domain shows "Coming soon". We host on Cloudflare Pages and remind the owner before the
   domain renews.
8. **Thin and broken pages:** 23/96 under 300 words (one bilingual tax office renders 4 words without JavaScript); 45/96 without exactly
   one H1; 11/96 over 500 KB of HTML.
9. **Review widgets and self-made stars:** review widgets on 25/96 and `AggregateRating` self-markup on 3/96. For advisors, any
   testimonial or review link is a regulatory problem, not just a style one.
10. **Collecting sensitive data the wrong way:** file-upload fields on home pages (4/96) and "email us your documents". Tax data
    belongs in the owner's portal, never in a plain form or email.
11. **Stale template filler:** calculators (15/96, 9/24 tax pages), newsletter boxes (20/96), and tax-year blog posts that go out of date
    every January. We generate none of these.
12. **Carrier logo walls** (9/28 insurance pages show 3+ carrier logos) without permission and never updated as appointments change.
    Text list, owner-confirmed, with a yearly reminder.
13. **Insurance-only agents styled as "financial planners"** and broker-dealer reps titled "advisor" without the registration behind
    it (5.4, 5.5).

**Business types we do NOT target, and why:**
- **Banks and credit unions**: deposit-insurance signage and advertising-statement rules (FDIC 12 CFR part 328, whose digital-sign
  provisions now apply from April 1, 2027 per [FIL-3-2026](https://fdic.gov/news/financial-institution-letters/2026/notice-final-rulemaking-fdic-official-signs-advertisement);
  NCUA's equivalent for credit unions), Equal Housing Lender notices, online banking login pages, and all 7 Cullman credit unions
  already have sites.
- **Payday, title, installment lenders and check cashers**: predatory-lending concerns and heavy regulation (TILA advertising, state
  small-loan acts); Google has banned ads for loans due in 60 days or less and, in the US, at 36% APR or more since 2016
  ([NPR](https://www.npr.org/sections/thetwo-way/2016/05/11/477633475/google-announces-it-will-stop-allowing-ads-for-payday-lenders);
  current policy text not re-checked); and 18 of the 20 Cullman results already have sites, most of them chains.
- **Pawn shops**: licensed lenders with gun sales; already excluded from the retail pack, and the Cullman ones have sites.
- **Credit repair**: federal Credit Repair Organizations Act disclosure and advance-fee rules; high fraud reputation.
- **Mortgage brokers and loan officers: not recommended.** The SAFE Act gives every loan originator an NMLS unique identifier, and
  many states require it on all advertising, websites and business cards (Maryland, Vermont, Iowa and others); we did not find
  Alabama's rule, so **owner confirms** would be needed on every site. Add Truth in Lending advertising triggers, Equal Housing
  Opportunity notices and lender compliance approval, and the fact that every Cullman mortgage result (Maven, Guild, Stockton, First
  Federal) is a lender branch with a site. Revisit only if an independent broker asks, and then as a gated variant like advisors.
- **Captive agents and franchise tax offices** (State Farm, Alfa, Farmers, Allstate, COUNTRY, Edward Jones, H&R Block, Jackson Hewitt,
  Liberty Tax…): corporate pages and corporate-controlled marketing.
