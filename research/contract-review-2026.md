# Client agreement review (October 2026)

A contracts-research pass over the agreement every client signs, written for the owner to take to an Alabama
lawyer once. **This is research, not legal advice. Have a lawyer review before changing what clients sign.**
Where Alabama law could not be confirmed from a primary source, the text says so.

What was reviewed in the code:

- `src/worker/db.ts`: `defaultTerms()` (the 10-point service agreement), `CORE_TERMS` + `missingCoreTerms()` (the 5
  lines added to any custom agreement), `DEFAULT_ADDONS`, `billingOptions()`, `GO_LIVE_TEXT`.
- `src/worker/contract.ts`: `contractText()` assembles YOUR ORDER → YOUR PLAN → HOW YOU PAY (+ `INVOICE_TEXT`) → TIMING
  (`TIMING_TEXT`) → SERVICE AGREEMENT (+ ALSO PART OF THIS AGREEMENT) → EXTRA: … (`STANDARD_EXTRA_TERMS` /
  `GENERIC_EXTRA_TERMS`) → ELECTRONIC SIGNATURE (`esignClause`).
- `src/worker/company.ts`: `/terms` (`policyPage`: plans, signing up, cancellation & refund policy at `#refunds`, the
  service agreement, Limits, governing law) and `/privacy`.
- `src/worker/signup.ts`: the signing flow (typed name, drawn signature, consent; IP + user agent + time stored).

Business facts the agreement must fit: Basic $49 / Plus $89 / Pro $149 a month; 6- or 12-month plan with no setup fee;
month to month with a $299 setup fee; yearly up front = 12 for the price of 10 (churches 12 for 8); extras one-time,
per item, monthly or quoted; Stripe card/ACH, or invoice (check/bank transfer) for churches and anyone sent an
`?invoice=1` link; static sites on Cloudflare Pages; e-signature on a phone.

---

## 1. Gap analysis

Legend: **Present** = in the signed agreement today. **Partial** = said somewhere (often only on `/terms`, which is
*not* all pulled into the signed text: only the cancellation & refund policy is incorporated by reference) or said
without the detail that makes it work. **Missing** = nowhere.

| # | Clause | Status | Where today | Risk of leaving it as is |
|---|---|---|---|---|
| 1 | Parties, authority to sign | Present | Header + e-sign clause ("authorized to sign for the business") | Low. Add the signer's title to the stored record (already collected as `title`). |
| 2 | Scope: what's included | Partial | §1 "builds your website, hosts it … plus everything listed in your plan"; §8 "Updates listed in your plan are included" | Plans say "unlimited updates" style lines without limits on turnaround or volume. A client can argue any amount of work is included. Define "included updates" (text/hours/photos/menu/price changes; new pages quoted). |
| 3 | Approval / acceptance of the site | **Missing** | TIMING says live "within 3 business days after you approve the details" | Billing starts the day they sign, but nothing says what happens if they never approve. Add deemed approval after [7] days of silence, and that the site shown at signing is accepted as the starting point. |
| 4 | Payment, autopay authorization | Present | §2; Stripe mandate for ACH | Fine. Add "prices don't include tax" and "card on file may be charged for amounts you owe under this agreement" (late fees, early payoff, extras you approve). |
| 5 | Late payment: grace, fee, interest | Partial | §7 "if a payment fails and isn't fixed within 30 days we may take the site offline" | No fee or interest = no cost to paying late; no stated process = arguments. See §2 below for Alabama limits. |
| 6 | Suspension and takedown | Partial | §7 (offline after 30 days) | "May take offline" is fine; add that the plan keeps billing while suspended, when we may *end* the agreement (e.g., 60 days), and a reinstatement fee. |
| 7 | Early termination on committed plans | Present | §3 + CORE_TERMS "remaining months of the minimum are due" | Enforceable in principle but phrased as a consequence of breach, which invites the "penalty" argument. Reframe as finishing the term you chose (see §2). |
| 8 | Chargebacks / payment disputes | **Missing** | — | A chargeback pulls the money and a $15 fee at once. Nothing says it counts as non-payment or that they agreed to contact us first. |
| 9 | Collection costs, attorney's fees | **Missing** | — | Alabama follows the American rule: no fees unless a statute or the contract says so. Without the line, chasing $600 costs more than it recovers. |
| 10 | Client content ownership | Present | §4 | Good. |
| 11 | Our ownership of design/code, client license | **Missing** | — | Default copyright: we own the templates, code and layout; the client owns nothing but their text/photos. That's the right split, but it has to be said, along with what they may keep on exit. |
| 12 | Portfolio rights | Partial | Only in the logo extra | Say once for everything: we may show the site in our portfolio unless they ask us not to. |
| 13 | Domain: who owns, who pays, exit transfer | Partial | §5 | Good start. Missing: transfer timing, who pays renewals, the ICANN 60-day lock after a registrant change, that transfer happens after the balance is paid. |
| 14 | Data export on exit | Partial | §6 "copy of the site's files on request" | Add a window ([30] days after the end), format (static files), and what isn't included (our build system, fonts licensed to us, Google data). |
| 15 | Client responsibilities | Partial | §4 ("you confirm you have the right to use…") | Add: accurate business facts, licenses they claim (HVAC AL#, massage license, PTIN), timely approvals, keeping their own accounts (Google, Square, Facebook) in good standing, telling us about changes. |
| 16 | AI-written text | **Missing** | — | The copy is drafted by AI from Google data and the client's answers. Say that the client reviews and approves all text and is responsible for claims about their own business (prices, licenses, "24/7", guarantees). |
| 17 | Indemnification (client content, claims) | **Missing** | — | A photo they didn't own, a trademark in their logo, an untrue claim about their service: today we'd carry the claim. |
| 18 | No guarantee of rankings/results | Present | §9 | Good. Add "no guarantee of visitors, leads or sales" and "Google can change what it shows at any time" (already implied). |
| 19 | Uptime / warranty disclaimer | Partial | Only on `/terms` "Limits" (not in the signed text) | Move an honest version into the agreement: we aim for the site to be up all the time; we rely on Cloudflare; no promise it's never down or error-free. |
| 20 | Accessibility (ADA) | **Missing** | — | Website ADA suits are rising (3,117 federal web suits in 2025, most against small businesses). We build to WCAG AA contrast and keyboard-usable templates, but can't promise compliance of client-supplied content or third-party embeds. Say so. |
| 21 | Third-party services | Partial | Only inside extras | Cloudflare, Google, Stripe, Resend, Square/Toast/Calendly/Booksy: their outages, prices and policies aren't ours; a change on their side may need a paid change on ours. |
| 22 | Limitation of liability | Present | §10 (3 months of fees) + `/terms` "Limits" (no indirect damages) | Keep; put the indirect-damages exclusion in the signed text too. 12 months is the common cap; 3 months is more protective but looks one-sided. Either is enforceable in Alabama commercial contracts (see §4). |
| 23 | Price changes | Partial | `/terms`: "30 days' notice before any price change"; agreement silent | Put in the agreement: price fixed for the committed/prepaid term; after that, 30 days' notice, and they may cancel instead. |
| 24 | Auto-renewal | Present | Yearly: 30-day email notice; monthly simply continues | Good. Add text as well as email, and "how to cancel" in one line (reply to the text, email us, or use the billing link). |
| 25 | How to cancel / notice period | Partial | "30 days' notice" with no method | Say how (text, email, billing link) and from when (end of the current paid period). |
| 26 | Refunds | Partial (by reference) | `/terms#refunds` incorporated by reference | Good mechanism. Make sure the signed text summarizes the two rules people fight about: no partial-month refunds; yearly 30-day window. |
| 27 | Our breach: credits, exit without fee | **Missing** | "If we ever charge you by mistake, we refund it in full" only | Nothing says what the client gets if the site is down for days or we stop answering. A modest credit rule protects *us* too: it defines the remedy. |
| 28 | Response times | **Missing** | — | "Included updates" with no turnaround invites disputes. Promise business-day responses, not hours. |
| 29 | Force majeure | **Missing** | — | A Cloudflare or Google outage, a storm, an upstream price shock: without it, non-performance is breach. |
| 30 | Assignment | **Missing** | — | If the business is sold (common with restaurants/salons) or we sell the company, nothing says the agreement moves with it. |
| 31 | Entire agreement, amendment, severability, survival | **Missing** | — | A verbal promise by a caller ("sure, free logo") becomes part of the deal; a bad clause could take others down; ownership/payment terms may not survive termination. |
| 32 | Notices (text/email OK) | Partial | E-sign clause: "do business electronically" | Say notices go to the phone and email on the sign-up, and theirs to ours; a text counts. |
| 33 | Consent to texts/emails (TCPA) | Partial | Privacy page: "we contact you only about your inquiry… reply STOP" | Put a one-line consent in the agreement (account/service texts to the number given; STOP any time). |
| 34 | Governing law | Present | §10 "Alabama law applies" | Good. |
| 35 | Venue / dispute steps | **Missing** | — | Without it, a Hartselle or Arab client could file in their county; add Cullman County courts, a talk-first step, and keep small claims available. |
| 36 | Arbitration | Missing (recommend leaving out) | — | See §4: for $49–149/mo deals, small claims is cheaper than AAA arbitration. Alabama's statute disfavors predispute arbitration; the FAA usually preempts, but the cost makes it a bad fit anyway. |
| 37 | Electronic signature | Present | `esignClause` | Good. Add "you agree to receive notices and this agreement electronically" and keep the paper-copy offer. |
| 38 | Privacy / data | Partial | `/privacy` (not incorporated) | Incorporate by reference; state that form submissions from their site belong to them, we store them to deliver them, and they are responsible for how they use customers' data. |
| 39 | Confidentiality | **Missing** | — | Low risk for us; clients care (menu prices before launch, hiring plans). One mutual sentence. |
| 40 | Non-solicitation of our team | Missing (optional) | — | Alabama's statute only clearly allows business-to-business no-hire agreements for employees "uniquely essential" to the business. For callers, skip it or keep it to a 12-month "won't hire our people to do this work for you" line and expect a lawyer to trim it. |
| 41 | Taxes | **Missing** | — | Say prices exclude any sales/use tax that may apply. Alabama generally doesn't tax services, but software is taxable since 2019 and hosting is unsettled; ask a CPA (see §4). |
| 42 | Church / invoice variant | Partial | `INVOICE_TEXT` (due in 15 days) | Add what happens when an invoice goes unpaid without a card to charge, who at the church authorized the purchase, and that the ministry rate is for churches and nonprofits. |
| 43 | Extras | Present | `STANDARD_EXTRA_TERMS` | Mostly good; see §6 for specifics (photo no-show, ad spend/account ownership, GBP verification, Spanish accuracy). |

---

## 2. Breach by the client

### 2a. Non-payment: grace, late fee, interest (Alabama limits)

What the law says:

- **Ala. Code § 8-8-1**: the maximum interest "by written contract is not to exceed $8 upon $100 for one year" (8% a
  year); without a written rate, 6%. (Text confirmed on onecle mirror of the Code; verify on the Legislature's site.)
- **Ala. Code § 8-8-5**: for a "loan or forbearance of money or credit sales" with an original principal balance of
  **$2,000 or more**, the parties may agree to any rate; below $2,000 the section does not apply (subsection (d)).
  Subsection (c) defines "interest" broadly as all direct or indirect charges tied to the credit. Our unpaid balances are
  almost always under $2,000, so plan on the 8% cap applying to any *interest* we charge.
- **Ala. Code § 8-8-12** (secondary sources): charging over the cap on a loan under $2,000 forfeits all interest. That
  is the cost of getting it wrong: the interest, not the debt.
- **Late fees vs interest**: Alabama has no statute capping a commercial late fee. A flat late fee is judged as
  liquidated damages: enforceable if damages from the breach are hard to estimate, the parties intended an estimate not
  a penalty, and the sum is a reasonable pre-breach estimate (Camelot Music v. Marx Realty (Ala. 1987); Autauga Quality
  Cotton v. Crosby (11th Cir. 2018, applying Alabama law)). A fee layered on another charge for the same default, or one
  "grossly disproportionate," is a penalty (Milton Construction v. State Highway Dept. (Ala. 1990)).
- **Benchmark Alabama itself uses**: for *consumer* credit, § 5-19-4 allows a late charge after 10 days of the greater of
  $18 or 5% of the installment, capped at $100, once per missed payment. That is not our statute (we are
  business-to-business), but it is the clearest sign of what an Alabama court will see as reasonable.
- A **percentage late fee (e.g., 1.5%/month = 18%/yr)** is common on invoices nationally but is the risky choice here:
  it looks like interest above the 8% cap on a sub-$2,000 balance.

Recommendation (bracketed = business decision; ranges found reasonable):

- Grace: **[10] days** (range 5–15). Stripe retries cards automatically in this window anyway.
- Late fee: **flat $[15]** per missed payment, once (range $10–$25; stay under the greater of $18 / 5% for a $49 plan, so
  $15 fits even the Basic plan; a $25 fee on a $49 plan is 51% and harder to defend). Alternative: "$[15] or [5]% of the
  amount due, whichever is greater," capped at $[50].
- Interest: **[8]% a year** (the written-contract cap) on balances more than 30 days overdue, *or* no interest at all and
  rely on the late fee. Don't state 1.5%/month.
- Fees, interest and the reinstatement fee are charged to the card on file "as amounts you owe under this agreement".

Wording:

> **Late payments.** If a payment fails, we'll let you know by text or email and retry the card. If it's still unpaid
> after [10] days, we add a $[15] late fee, once per missed payment. Balances more than 30 days overdue earn interest at
> [8]% a year, the most Alabama allows by written contract. Your plan keeps running and billing while a payment is late.

### 2b. Suspension and takedown

Pattern used by agencies (reminders at 10–14 and 21 days, offline at 30, terminated at 60) matches our existing
30-day rule. Recommended:

> **If you don't pay.** 30 days after a missed payment we may take your site offline (visitors see a "temporarily
> unavailable" page) until it's caught up; the plan keeps billing while it's offline. 60 days after a missed payment we
> may end this agreement; the whole unpaid balance, including the rest of any minimum term, is then due. Putting a site
> back online after suspension costs $[49] (range $25–$99) plus what's owed.

Keep the right to suspend immediately (not after 30 days) for: a chargeback (funds already pulled), illegal or
infringing content, or a court/registrar/host order. One sentence covers it.

### 2c. Early termination on committed plans (acceleration vs early-termination fee)

Today: "If you cancel before the end of your plan's minimum term, the remaining months of the minimum are due." That is
acceleration of 100% of the remaining fees, triggered by the client's choice to cancel.

Enforceability in Alabama: the liquidated-damages test above. Points in our favor: the build was done up front with no
setup fee *in exchange for* the commitment (the month-to-month option costs $299 more for the same site), our monthly
cost of keeping a static site up is close to zero (so our loss from an early exit is close to the full remaining fees),
and the amount is easy to compute. Points against: a court leaning the "penalty" way when intent is unclear (Burr &
Forman note on Alabama real-estate liquidated damages), and consumer-style scrutiny of early-termination fees seen in
telecom/alarm cases in other states. Alabama's Deceptive Trade Practices Act defines "consumer" as a natural person buying
for personal, family or household use (§ 8-19-3(2)), so business clients are outside it, which helps.

Two ways to make it more defensible without losing the money:

1. **Reframe it as finishing the term, not a fee.** The client picked a 12-month plan; they can stop at any time but the
   term is the price. The site stays live until the term ends unless they ask us to take it down. That is simply
   payment for the contract, not damages, and it matches how the client experiences it.
2. **Offer an early-payoff discount.** "Pay the rest now, less [15]%" (range 10–25%) shows the number is an estimate of
   our loss, not a punishment, and gets cash in now rather than 11 monthly charges that may fail.

Wording:

> **Your minimum term.** A 6-month or 12-month plan has no setup fee because you're committing to those months. If you
> want to stop before the term ends, you can either keep paying monthly until the term ends (your site stays live unless
> you ask us to take it down), or pay the remaining months now, less [15]%, and we'll close your account at once. Month to
> month has no minimum. Yearly plans are paid in advance; see our refund policy for the 30-day window.

Also keep: the right to charge the card on file for the payoff if the client cancels through Stripe without choosing.
Ask the lawyer whether to add "You agree the remaining months are a fair estimate of our loss, since we built your site
at no charge in return for the term" (the intent language courts look for).

### 2d. Chargebacks and ACH disputes

Facts (Stripe docs, Oct 2026):

- Card networks let cardholders dispute within about **120 days** of a charge (longer in some cases). Stripe pulls the
  disputed amount plus a **$15 dispute fee** (not returned even if we win) and, since June 17 2025, a **$15 "countered"
  fee** that is returned on a win. We have 7–21 days to respond; the issuer takes 60–75 days to decide.
- **ACH Direct Debit** disputes: a personal account can dispute for **60 calendar days**, a **business account for 2
  business days**; ACH disputes are **final and uncontestable** through the network, the mandate is invalidated, and the
  fee is non-refundable. For recurring ACH, Nacha requires a mandate (Stripe Checkout collects it) and 7 days' notice
  before changing debit *timing*.
- Our evidence for a dispute is the signed agreement (text, typed name, drawn signature, IP, user agent, time), the
  preview-open log and the live site. Keep storing all of it.

Wording:

> **Payment disputes.** Please contact us before disputing a charge with your bank; we fix billing mistakes with a full
> refund. If you dispute a charge that was due under this agreement, we treat it as a missed payment: we may take the site
> offline right away, and you owe the amount, the bank's dispute fee ($15 today) and the reinstatement fee once it's
> resolved. Bank-account payments can only be disputed within your bank's window, and a dispute cancels your payment
> authorization, so we'll need a new one.

### 2e. Collection costs and attorney's fees

Alabama follows the American rule: each side pays its own lawyer unless a statute or **the contract** provides otherwise
(Jones v. Regions Bank, 25 So. 3d 427 (Ala. 2009); Blankenship v. City of Hoover). A written clause is enforced, with the
amount reviewed for reasonableness. Practical limits: small claims (district court, ≤ $6,000 exclusive of interest and
costs, Ala. Code § 12-12-31) is where these cases belong, and § 12-12-31(c) says **no attorney-fee award in small claims
unless the party is represented by a licensed attorney**. So the clause mainly matters for larger balances or if a
collection agency/lawyer gets involved. Make it mutual-looking ("the losing side pays") if the lawyer prefers; one-way
clauses are enforced too.

> **Collection.** If we have to send an unpaid balance to collections or to court, you also owe our reasonable collection
> costs, court costs and attorney's fees, as far as Alabama law allows.

Prejudgment interest on a liquidated contract debt runs from the due date at the contract rate (≤ 8%), else 6%
(§ 8-8-8); a contract judgment bears the contract rate, other judgments 7.5% (§ 8-8-10).

### 2f. Domain, content, site files and design on termination

Who owns what (recommended, matches how the system works):

- **Client owns**: their business name, logo, photos, text they wrote or approved about their business, their domain
  (whether they brought it or we registered it for them), their accounts (Google, Square, Facebook), and the messages
  sent through their site's forms.
- **We own**: the templates, layouts, design system, code, fonts licenses and build tooling; the AI-drafted copy as
  delivered is **assigned to the client on approval** (it's about their business; letting them keep it avoids a fight
  and costs us nothing; the templates are what matter).
- **While the plan is active**: the client has a license to use the site as we host it.
- **On exit**: within [30] days of a written request we hand over a static copy of the site (HTML, CSS, images they own,
  their text) which they may host anywhere for their own business; not included: our build system, fonts we license,
  Google photos (never on live sites anyway), and anything a third party owns. We may take the live site down at the end
  of the last paid period, keep using the templates and design for others, and show the site in our portfolio unless
  they opt out.
- **Domain registered by us**: registered in the client's name where the registrar allows, otherwise held for them. We
  pay renewals while the plan is active; on exit we transfer it (authorization code / registrar push) within [10]
  business days after the balance is paid, after which renewals are theirs. ICANN's transfer policy puts a **60-day
  inter-registrar transfer lock** after a change of registrant (ICANN approved recommendations to retire the lock in 2024
  and again June 2026, implementation still pending), so say "a registrar's 60-day lock may delay a move to another
  registrar; we'll point the DNS wherever you ask in the meantime".
- **Domain the client already owns**: stays theirs; they keep registrar access; we only need DNS changes; on exit we
  release the Cloudflare Pages custom-domain binding so they can point it elsewhere.

Wording:

> **What's yours and what's ours.** Your business name, logo, photos, the text about your business and your domain are
> yours. The templates, designs and code we build with are ours, and we use them for other businesses too. While your plan
> is active you may use the site as we host it. If you leave, ask within 30 days and we'll send you a copy of your site's
> pages and images to use anywhere for your business (not our build tools or licensed fonts). We may show your site in
> our portfolio unless you ask us not to.
>
> **Your domain.** If you already own your domain, it stays yours and we never need your registrar login, only DNS
> changes. If we register one for you, we put it in your name where the registrar allows, pay the renewals while your plan
> is active, and transfer it to you within 10 business days after your final balance is paid. Registrars lock a domain
> against moving to another registrar for 60 days after an ownership change; we'll point it wherever you ask in the
> meantime.

### 2g. Portfolio and credit line

Live sites already carry "Website by <company>". Add it to the agreement so a client can't later demand its removal
for free, and give an opt-out for the portfolio (not the footer credit, or make removal a paid extra).

---

## 3. Breach by us

What the client should get, written so it defines the remedy rather than leaving it open:

- **Site down because of us**: if the site is unreachable for more than **[24] hours** in a month for reasons within our
  control (not Cloudflare/Google/registrar/DNS they manage/their own content), they get **one month of the plan free**
  on request. Hosting-industry practice is 99.9% with tiered credits capped at the month's fee and "credits are the sole
  remedy" (Kinsta, Hostease SLAs). For a $49–149 plan, "a free month, up to the fee you paid for that month" is the
  honest equivalent of a service credit. Don't promise "99.9%": Cloudflare Pages' free/pro plans carry no SLA to us.
- **Repeated failure**: three credit months in any 12, or a failure we don't fix within 14 days of written notice, lets
  the client **cancel without the remaining-term payment** and get a **pro-rata refund of prepaid unused months** (yearly
  plans) and of any extra paid for but not delivered.
- **Response times**: reply within **1 business day**; included updates done within **[3] business days** of having
  everything we need; a site-down report is worked the same day we get it. State business hours (Mon–Fri, Cullman time).
- **Timing miss on launch**: GO_LIVE_TEXT promises 3 business days after approval. Add: if we miss it by more than
  [5] business days through our own fault, the first month is free. (Same-day build already refunds its fee.)
- **Mistaken charge**: full refund (already in policy).

Wording:

> **If we let you down.** We aim to keep your site up around the clock, answer you within one business day, and make
> included updates within [3] business days of having what we need. If your site is down for more than [24] hours in a
> month because of something within our control, tell us and that month's plan fee is free. If that happens three times in
> a year, or we don't fix a problem within 14 days of your written notice, you may cancel without owing the rest of your
> term, and we refund any prepaid months you haven't used. These are the remedies for downtime and delays.

---

## 4. Standard protective clauses (plain-English wording)

Each line is short enough for the phone pop-up. Alabama notes follow where relevant.

**Limitation of liability.** Alabama enforces limitation clauses between commercial parties ("commercial parties may
contract freely to limit the remedies available to them," Puckett, Taul & Underwood v. Schrieber (Ala. 1989); enforced in
service contracts in Saia Food Distributors v. SecurityLink (Ala. 2004) and Fox Alarm v. Wadsworth (Ala. 2005)). Limits
don't reach wantonness/intentional wrongdoing. Cap: "fees paid in the last 12 months" is the market standard and easy to
explain; the current 3 months is enforceable but reads harsh. Choose **[12 months]**.

> **Limits.** We're responsible to you only up to what you paid us in the 12 months before the problem. We aren't liable
> for lost profits, lost sales or other indirect losses. These limits don't apply to anything the law won't let us limit.

**Warranty disclaimer.**

> **No other promises.** We provide the site and services as described in this agreement and your plan, and we'll fix
> our mistakes. We don't promise the site will never be down or error-free, and we make no other warranties, express or
> implied.

(Ask the lawyer whether Alabama expects this in capitals or otherwise conspicuous; UCC § 7-2-316 does for goods; services
aren't the UCC, but conspicuous is safer.)

**Indemnification for client-supplied content and claims.** Alabama enforces indemnity clauses "expressed in clear and
unequivocal language" (JohnsonKreis Construction v. Howard Painting (Ala. 2025)).

> **Your content, your claims.** You're responsible for the photos, logo, text, prices, licenses and claims you give us
> or approve, and for your own products and services. If someone makes a claim against us because of them (for example a
> photo you didn't have rights to, or a statement about your business), you'll cover our costs, including reasonable
> attorney's fees.

**Client responsibilities.**

> **What we need from you.** Accurate business details; a yes or no on the site and on changes within 7 days (after that
> we treat it as approved); photos and text you have the right to use; valid licenses for anything you ask us to say
> you're licensed for; and keeping your own accounts (Google, Facebook, booking or ordering services, your domain) in good
> standing. Tell us when your hours, prices or services change.

**AI-drafted text.**

> **Website text.** We draft your site's text with software from your public listing and what you tell us, then you
> review it. Only you know your business, so check prices, hours, licenses and promises before approving. Once approved,
> the text is yours.

**Compliance disclaimers (accessibility, results).** No federal web-accessibility rule exists for private businesses
(DOJ's Title II rule covers governments); WCAG 2.1 AA is the de facto benchmark in suits and settlements; filings against
small businesses are rising. Our templates are built AA-contrast, keyboard and screen-reader friendly, but client images,
PDFs and embeds (menus, booking widgets) are outside our control.

> **Accessibility and results.** We build your site to current accessibility good practice (WCAG 2.1 AA for the pages we
> make) and will fix accessibility problems you or we find in our work. We can't promise full legal compliance,
> especially for images, documents and third-party tools you add. No one can guarantee search rankings, visitors, calls or
> sales, and Google can change what it shows at any time.

**Third-party services.**

> **Other companies' services.** Your site runs on Cloudflare, your payments go through Stripe, and features like
> ordering, booking, maps, reviews and email use Google, Square, Toast, Calendly, Booksy or others you choose. Their
> outages, prices, verification steps and rules are theirs, not ours. If one of them changes in a way that breaks a
> feature, we'll tell you and quote any work to fix it.

**Force majeure.**

> **Things beyond our control.** Neither of us is in breach for delays caused by events outside our reasonable control
> (storms, power or internet failures, outages at Cloudflare or Google, government orders). Payment for service already
> provided is still due.

**Assignment.**

> **If a business changes hands.** If you sell your business, the new owner can take over this agreement with our OK,
> which we won't withhold without a good reason; otherwise the agreement ends and the rest of any term is due. We may
> transfer this agreement to a company that buys ours; your price and terms stay the same.

**Entire agreement, amendment, severability, survival.**

> **The whole deal.** This agreement, your plan, our refund and privacy policies and any extras you sign for are the
> whole agreement; anything said in conversation isn't part of it. Changes must be in writing (a text or email from us
> that you accept counts). If a court strikes one part, the rest stands. Payment, ownership, limits and the sections
> about leaving survive after the agreement ends.

**Notices.**

> **How we reach each other.** Notices go to the phone number and email you gave when you signed and to ours on your
> agreement. A text or email counts as written notice. Keep your contact details current.

**Dispute resolution.** Alabama enforces forum-selection clauses unless unfair or unreasonable (Professional Ins. Corp.
v. Sutherland, 700 So. 2d 347 (Ala. 1997)); a Cullman County clause for Cullman-area clients is plainly reasonable.
**Arbitration**: Alabama Code § 8-1-41(3) makes predispute arbitration agreements unenforceable under state law; the FAA
preempts that for contracts involving interstate commerce (Allied-Bruce Terminix v. Dobson (U.S. 1995)), which an
internet-hosted site almost certainly does. But AAA filing fees exceed most balances, and small claims (≤ $6,000) with
a 14-day appeal to circuit court is cheaper and faster. **Recommendation: no arbitration; informal step + Cullman County
venue + small-claims carve-out.** Statute of limitations for a written contract is six years (§ 6-2-34).

> **If we disagree.** We'll talk first: either of us can ask for a call or meeting and we'll both try for 30 days to sort
> it out. After that, either of us may go to court. Alabama law applies, and any case is filed in the state courts in
> Cullman County, Alabama, including small claims court.

**Auto-renewal.** Alabama has **no general automatic-renewal statute** (Faegre Drinker's 50-state survey listed Alabama as
"no current law"; subscription-law trackers in 2026 still don't list it). **HB610 (2026 Regular Session)** would add
disclosure/notice/easy-cancel rules; it was introduced 11 March 2026 and no source showed it passing, so treat it as
pending and re-check. The **FTC "click-to-cancel" rule was vacated** by the Eighth Circuit on 8 July 2025; the FTC sent a
new advance notice of proposed rulemaking to OIRA on 30 January 2026 and law-firm alerts through May 2026 describe a
revival effort, not a rule in force. **ROSCA** (15 U.S.C. §§ 8401–8405) still applies to online sales with recurring
charges: clear disclosure of the recurring terms before billing details, express informed consent (no pre-checked box),
and a simple way to stop the charges. The sign-up page already shows the recurring amount and term before the Stripe
step and requires an active signature; add the one-line cancel method and keep the 30-day yearly reminder (send it by
text too; a 30–45-day window matches the strictest state laws for 12-month terms).

> **Renewal.** Monthly plans continue month to month after any minimum term until you cancel. Yearly plans renew for
> another year at the then-current price unless you cancel before the renewal date; we'll text and email you at least 30
> days before. To cancel, text or email us, or use your billing link; it takes effect at the end of your paid period
> (after any minimum term).

**Electronic signature.** Federal E-SIGN (15 U.S.C. § 7001(a)) and Alabama UETA (Ala. Code § 8-1A-7) give an
electronic signature and record the same effect as paper; § 8-1A-5 asks that the parties agreed to deal electronically
(context suffices; our clause says it outright); § 8-1A-9 attributes a signature to a person if it was their act, shown
"in any manner, including… any security procedure" — our stored typed name, drawn signature, IP, user agent and time
stamp are that showing (the PDF export at `/agreement/<token>.pdf`, which embeds the drawn signature, is the "copy" the
clause promises). E-SIGN's consumer-consent regime (§ 7001(c)) applies to "consumers" buying for personal,
family or household use (§ 7006(1)); business clients are outside it, but keeping the paper-copy offer and a
"you can receive and open the agreement on your device" line costs nothing. Add electronic *notices* to the clause.

> **Electronic signature and records.** By signing, you agree to do business with [LEGAL NAME] electronically: your typed
> name and drawn signature are your legal signature, this agreement and our notices may be sent electronically, and
> you're authorized to sign for the business. You confirm you can open and keep a copy on your device, and you can ask us
> for a paper copy at any time.

**Consent to texts/emails (TCPA-safe).** Service/account texts sent by hand from a phone are not autodialed, so the
TCPA's prior-express-consent rules are a light touch here; the FCC's 2024 revocation rule (effective 11 April 2025)
requires honoring "STOP"-style revocations within 10 business days, and a part about cross-channel revocation was
delayed to April 2026. Keep one clean line and honor STOP everywhere.

> **Texts and emails.** You agree we may text and email the number and address you gave us about your account, your site
> and payments. Message rates may apply. Reply STOP to any text to stop texts; we'll still email about billing.

**Privacy and data.** Alabama's Data Breach Notification Act (Ala. Code § 8-38) applies to any business holding
"sensitive personally identifying information" (SSNs, account numbers with access codes, medical info and the like; not
plain names/emails/phones) and requires reasonable security, 45-day notice of breaches and 10-day third-party-agent
notice. We mostly hold names, emails, phones, IPs and form messages, but a form can carry anything a visitor types.

> **Information.** We keep your contact details, your signed agreement, your site's content and the messages visitors
> send through your site's forms (to deliver them to you; they're your customers' messages). We don't sell personal
> information. Our privacy policy at undergroundassociates.com/privacy applies and is part of this agreement. You're
> responsible for how you use information customers send you.

**Confidentiality.**

> **Confidential information.** We keep what you tell us about your business private, and you keep our pricing offers and
> unreleased work private, except what's public or has to be disclosed by law.

**Non-solicitation of our team (optional).** Ala. Code § 8-1-190(b)(1) permits business-to-business no-hire agreements
only for employees in a position "uniquely essential to the management, organization, or service of the business"; a
blanket "don't hire our callers" line may not qualify. If wanted:

> **Our team.** For 12 months after this agreement ends, you won't hire or engage our team members to do the kind of work
> we did for you without our written OK.

**Taxes.** Alabama generally does not tax services; software (canned or custom) is taxable since Ex parte Russell County
Community Hospital (Ala. 2019), with separately stated services non-taxable; no ADOR guidance on website design/hosting
was found. Ask a CPA; meanwhile:

> **Taxes.** Prices don't include sales or use tax. If a tax applies to anything we sell you, we'll add it to your bill.

---

## 5. Church / nonprofit invoice variant

Current: `INVOICE_TEXT` ("due within 15 days"), ministry rate (12 months for the price of 8 yearly), no card on file.
Issues: no late/suspension path without a card; church signing authority varies (pastor, treasurer, trustees, board;
a treasurer has been held to lack unilateral authority in at least one state; apparent authority can still bind); some
churches pay monthly from a board-approved budget and need an invoice schedule.

Recommendations:

- **Due date**: Net **[15]** (current) is tight for a monthly board cycle; **Net [30]** for yearly invoices, Net 15 for
  monthly. Invoice sent by email to the billing contact named at sign-up (ask for a billing contact and a second contact).
- **Late path without a card**: reminder at due date + 10; late fee $[15] at due + 15; site offline at due + 45; agreement
  ends at due + 75 with the balance due (longer than card plans because checks move slowly and there's no autopay fail
  to signal trouble).
- **Pay-by-card fallback**: offer to move them to a card/ACH on file at any time; a Stripe hosted-invoice link lets them
  pay the invoice online and still "pay by invoice".
- **Ministry rate conditions**: "for churches, places of worship and nonprofits; we may ask for your EIN or nonprofit
  letter."
- **Authority block**: add to the signature step for churches: "Signed for [church] by [name], [title], authorized by
  [the pastor / the deacons / the board / the trustees] on [date]". Store it with the signature. Also state that the
  agreement is with the church (the entity), not the person signing.
- **Yearly up front** is the norm for churches: say the yearly invoice must be paid before the site goes live, or the
  first month's share is due before launch and the rest within 30 days.

Wording (replaces `INVOICE_TEXT` when `order.invoice`):

> **Paying by invoice.** We email an invoice to your billing contact; nothing is charged online. Monthly invoices are due
> within 15 days, yearly invoices within 30 days. If an invoice is 15 days overdue we add a $[15] late fee; at 45 days
> we may take the site offline until it's paid; at 75 days we may end this agreement and the balance is due. You can
> switch to a card or bank account on file at any time. The person signing confirms they're authorized by the church or
> organization to make this purchase.

---

## 6. Extras: are the standard per-extra terms adequate?

| Extra | Today | Missing / fix |
|---|---|---|
| Online ordering or booking hookup | Good: their account, their fees, not responsible for the service, switch quoted | Add: "You give us the access the service needs; if the service changes its embed or rules, a fix is quoted." |
| Get listed everywhere | Good: verification help, no guarantee | Add: "Listings belong to you; we use your email/phone so you keep control. Duplicate or suspended listings on a site are that site's decision; we'll appeal once." |
| Google Business Profile setup | Good: you stay owner, add us as manager, no guarantee | Google's third-party policy requires owner consent and that you're told of edits; verification (video, postcard, phone) is Google's and can take weeks or be refused; suspensions happen. Add: "Set-up depends on Google verifying your business, which we can't control or speed up; if Google refuses to verify, we refund half [range: half to all]. We reply to reviews only with your written OK (Google's rule). You stay the owner and can remove us at any time." |
| Photo shoot | 24 hours' notice, "a missed visit may be charged" | Make it definite: "Please give 24 hours' notice to reschedule (48 is better). A no-show or a reschedule with less than 24 hours' notice counts as the visit; a new visit is $[99] (range $50–full price). Weather and illness: we reschedule free. You get the permission of anyone in the photos (we'll bring a one-line release for staff). Photos are yours; we may use them in our portfolio unless you say no." Also: delivery within [7] business days; edited JPEGs; no raw files. |
| Spanish version | Good: AI translated, reviewed with you, you confirm | Add: "If a Spanish-speaking customer relies on a mistake you didn't catch, that's covered by the website-text section (you review and approve)." Offer a human-review upgrade by quote. |
| "We're hiring" section | Good: employment law is yours | Fine. |
| Same-day build | Good: refund if we miss | Add the cut-off: "Approval received by [noon] Central on a business day; later counts as the next business day." |
| Social media posts | Good: approval, 30 days' notice, no guarantee | Add: "You keep ownership of your Facebook/Instagram accounts and give us the access level you choose; we never post anything you haven't approved; Meta may remove or limit posts, which we don't control." Prorate on cancel: "billed monthly, no partial-month refunds." |
| QR table tents & window sign | Good: approval before print, non-refundable | Fine. Add reprint price for changes after printing. |
| Business cards, yard signs & door hangers | Good: quote + proof | Fine. |
| Logo refresh | Good: two rounds, ownership on payment, portfolio | Add: "We don't do trademark searches; check the name and mark before you use it widely. Fonts in the logo are licensed to us; you get the logo as final files, not the font files." |
| Tap-to-review card (NFC) | Good: non-returnable once programmed | Add: "Works with phones that support NFC (most made since 2017). Google decides which reviews show; we don't buy or write reviews." Replace a dead card free within [90] days. |
| Extra changes | Good: quote first | Add: "Quotes are good for 30 days; paid before or at delivery." |
| Ad management | Good: ad spend separate, no guarantee, 30 days' notice | Google's third-party policy expects transparency on costs and results. Add: "Ad accounts are opened in your name and stay yours; you pay Google/Meta directly and set the budget; our fee doesn't include ad spend; we report spend, clicks and results monthly; we need [30] days' notice and ads stop when the fee stops. Platforms may reject or suspend ads or accounts; we'll appeal once." Also a minimum term (e.g., 3 months) is common because month 1 is setup; optional. |
| Generic (`GENERIC_EXTRA_TERMS`) | "As described; monthly items cancel with 30 days' notice" | Add: "one-time items are paid before work starts; no refund once delivered unless we made the mistake." |

General extras line to add to the agreement: "Extras are described on our website and in the section for each extra;
one-time extras are billed when you sign up for them and aren't refundable once delivered unless we made the mistake;
monthly extras can be canceled with 30 days' notice; quoted work starts after you approve the quote."

---

## 7. Recommended full default agreement text

Drop-in for `defaultTerms()` (phone-readable: numbered, short sentences). `[LEGAL NAME]`, `[6-month or 12-month]`,
`[N]`, and the bracketed money/day defaults are to be filled by the function from Settings or decided by the owner. The
first line of each section is the "key" `missingCoreTerms` could match on (see the CORE_TERMS list after).

```
1. What you get. [LEGAL NAME] builds your website, hosts it and keeps it running, and does the updates listed in your
plan: changes to your text, hours, prices, services, menu and photos. New pages, new features and design changes beyond
your plan are quoted before we start.

2. Approving your site. You saw a preview before signing. We make the changes you ask for, you give us a yes, and the
site goes live within 3 business days of that yes. If we don't hear from you within 7 days of sending you a change, we
treat it as approved so your site isn't held up.

3. Payment. Your plan is charged automatically each month (or each year on a yearly plan), starting today. Month to
month has a one-time setup fee due today; the other plans have none. You authorize us to charge the card or bank
account on file for your plan, extras you approve and other amounts you owe under this agreement. Prices don't include
sales or use tax; if one applies, we add it. Your price is fixed for your minimum or prepaid term; after that we give 30
days' notice of any change and you may cancel instead.

4. Your term. With the [6-month or 12-month] plan, those first months are a minimum; you get them with no setup fee
because you're committing to them. After the minimum, cancel any time with 30 days' notice. If you want to stop before
the minimum term ends, you can keep paying monthly until it ends (your site stays live unless you ask us to take it
down), or pay the remaining months now, less [15]%, and we close your account at once. If you cancel before the end of
your plan's minimum term, the remaining months of the minimum are due in one of those two ways. Month to month has no
minimum: cancel any time with 30 days' notice. Yearly plans are paid up front for 12 months.

5. Renewal and how to cancel. Monthly plans continue after any minimum term until you cancel. Yearly plans renew each
year. We'll text and email you at least 30 days before a yearly renewal, and you can cancel before it renews. To cancel,
text or email us or use your billing link; it takes effect at the end of your paid period. Our cancellation and refund
policy at undergroundassociates.com/terms is part of this agreement as of the day you sign.

6. Late payments. If a payment fails we'll tell you and retry the card. If it's still unpaid after [10] days, we add a
$[15] late fee, once per missed payment. Balances more than 30 days overdue earn interest at [8]% a year. Your plan
keeps billing while a payment is late. If a payment fails and isn't fixed within 30 days, we may take the site offline
until it's caught up. 60 days after a missed payment we may end this agreement, and the whole balance, including the rest
of any minimum term, is due. Putting a site back online costs $[49]. If we send a balance to collections or court, you
also owe our reasonable collection costs and attorney's fees as far as Alabama law allows.

7. Payment disputes. Contact us before disputing a charge with your bank; we refund billing mistakes in full. A dispute
of a charge that was due under this agreement counts as a missed payment: we may take the site offline right away, and
you owe the amount, the bank's dispute fee ($15 today) and the reinstatement fee once it's resolved.

8. Your content stays yours. Your business name, logo, photos, the text about your business and your domain belong to
you. You confirm you have the right to use any photos, logo or text you send us, and that what you tell us about your
business, prices and licenses is true. The templates, designs and code we build with are ours, and we use them for other
businesses too. While your plan is active you may use the site as we host it. We may show your site in our portfolio and
keep a small "Website by" line in the footer unless you ask us not to.

9. Website text. We draft your site's text with software from your public listing and what you tell us, then you
review it. Check prices, hours, licenses and promises before you approve; once approved, the text is yours and you're
responsible for it.

10. Your domain and email. If you already own your domain it stays yours; we only need DNS changes. If we register one
for you, we put it in your name where the registrar allows, pay renewals while your plan is active, and transfer it to
you within 10 business days after your final balance is paid (registrars lock a domain against moving for 60 days after
an ownership change). Email forwarding to your own inbox is free with plans that include it. A Google mailbox is billed
to you by Google under Google's terms; we set it up but don't control Google's prices or service.

11. If you leave. The site comes down at the end of your last paid period. Ask within 30 days and we'll send you a copy
of your site's pages and images to use anywhere for your business (not our build tools or licensed fonts). Any
messages sent through your site's forms are yours and are delivered to you as they arrive.

12. What we need from you. Accurate business details; a yes or no on changes within 7 days; valid licenses for anything
you ask us to say you're licensed for; and keeping your own accounts (Google, Facebook, booking or ordering services,
your domain) in good standing. Tell us when your hours, prices or services change.

13. Other companies' services. Your site runs on Cloudflare, payments go through Stripe, and features like ordering,
booking, maps, reviews and email use Google, Square, Toast, Calendly, Booksy or others you choose. Their outages, prices,
verification steps and rules are theirs, not ours. If one of them changes in a way that breaks a feature, we'll tell you
and quote any work to fix it.

14. If we let you down. We aim to keep your site up around the clock, answer within one business day, and make included
updates within [3] business days of having what we need. If your site is down more than [24] hours in a month because of
something within our control, tell us and that month's plan fee is free. If that happens three times in a year, or we
don't fix a problem within 14 days of your written notice, you may cancel without owing the rest of your term and we
refund any prepaid months you haven't used. These are the remedies for downtime and delays.

15. No promises on results. Your site is built to be found on Google and to current accessibility good practice (WCAG
2.1 AA for the pages we make), and we fix accessibility problems found in our work. No one can guarantee search
rankings, visitors, calls or sales, full legal compliance of content and tools you add, or that a site is never down or
error-free. We make no other warranties, express or implied.

16. Limits. Our total liability to you is limited to what you paid us in the 12 months before the problem. We aren't
liable for lost profits, lost sales or other indirect losses. These limits don't apply where the law won't allow them.
If someone makes a claim against us because of content, claims or licenses you gave us or approved, or because of your
products or services, you'll cover our costs, including reasonable attorney's fees.

17. Things beyond our control. Neither of us is in breach for delays caused by events outside our reasonable control,
such as storms, power or internet failures, outages at Cloudflare or Google, or government orders. Payment for service
already provided is still due.

18. If a business changes hands. If you sell your business, the new owner can take over this agreement with our OK,
which we won't withhold without a good reason; otherwise the agreement ends and the rest of any term is due. We may
transfer this agreement to a company that buys ours; your price and terms stay the same.

19. Texts, emails and notices. You agree we may text and email the number and address you gave us about your account,
your site and payments; reply STOP to stop texts. Notices between us go to those contacts and to ours on this agreement;
a text or email counts as written notice. Keep your contact details current. Our privacy policy at
undergroundassociates.com/privacy applies and is part of this agreement.

20. Confidential information. We keep what you tell us about your business private, and you keep our pricing offers and
unreleased work private, except what's public or must be disclosed by law.

21. If we disagree. We'll talk first: either of us can ask for a call or meeting, and we'll both try for 30 days to sort
it out. After that either of us may go to court. Alabama law applies, and any case is filed in the state courts in
Cullman County, Alabama, including small claims court.

22. The whole deal. This agreement, your plan, our refund and privacy policies and any extras you sign for are the whole
agreement; anything said in conversation isn't part of it. Changes must be in writing (a text or email from us that you
accept counts). If a court strikes one part, the rest stands. Payment, ownership, limits and the sections about leaving
survive after this agreement ends.
```

Updated `esignClause`:

```
By signing, you agree to do business with [LEGAL NAME] electronically: your typed name and drawn signature are your legal
signature, this agreement and our notices may be sent to you electronically, and you're authorized to sign for the
business. You confirm you can open and keep a copy on your device, and you can ask us for a paper copy at any time.
```

Updated `TIMING_TEXT` stays as is; `INVOICE_TEXT` per §5 above.

### Recommended `CORE_TERMS` (must be present even if the owner rewrites the agreement)

Each entry: a regex key that matches the recommended text above, and the line appended when a custom agreement lacks it.

1. key `/remaining months of the minimum/i` → "If you cancel before the end of your plan's minimum term, the remaining
   months of the minimum are due (keep paying monthly until the term ends, or pay them now less [15]%)."
2. key `/isn't fixed within 30 days|not fixed within 30 days/i` → "If a payment fails and isn't fixed within 30 days, we
   may take the site offline until it's caught up; after 60 days we may end the agreement and the balance is due."
3. key `/late fee/i` → "A payment still unpaid [10] days after it fails carries a $[15] late fee, once per missed
   payment."
4. key `/dispute/i` → "Disputing a charge that was due under this agreement counts as a missed payment."
5. key `/total liability/i` → "Our total liability to you is limited to what you paid us in the 12 months before the
   problem, and we aren't liable for indirect losses such as lost profits. Alabama law applies."
6. key `/undergroundassociates\.com\/terms/i` → "Our cancellation and refund policy at undergroundassociates.com/terms is
   part of this agreement as of the day you sign."
7. key `/30 days before a yearly renewal/i` → "Yearly plans renew each year. We'll text and email you at least 30 days
   before a yearly renewal, and you can cancel before it renews."
8. key `/templates, designs and code/i` → "Your name, logo, photos, text and domain are yours; the templates, designs and
   code we build with are ours. If you leave, you may ask for a copy of your site's pages within 30 days."
9. key `/right to use any photos/i` → "You confirm you have the right to use any photos, logo or text you send us and
   that what you tell us about your business is true; claims arising from them are yours to cover."
10. key `/guarantee search rankings/i` → "No one can guarantee search rankings, visitors, calls or sales, or that a site
    is never down."
11. key `/Cullman County/i` → "Alabama law applies and any case is filed in the state courts in Cullman County, Alabama,
    after we've first tried for 30 days to work it out."
12. key `/electronically/i` (checked against the whole contract; the e-sign clause already supplies it) → keep as is.

### Matching update to the website cancellation & refund policy (`/terms#refunds`)

Replace the bullet list with:

- Previews are always free. You never pay anything unless you sign up.
- Plans with a minimum (6 or 12 months): after the minimum, cancel any time with 30 days' notice. If you cancel before
  the end of your plan's minimum term, the remaining months of the minimum are due: keep paying monthly until the term
  ends with your site live, or pay them now less [15]% and close the account at once.
- Month to month: cancel any time with 30 days' notice. The $299 setup fee is refunded in full if you cancel before your
  site goes live; after it goes live, it isn't refundable.
- Monthly charges are billed in advance and aren't refunded for part of a month.
- Yearly plans: cancel within 30 days of paying and we refund what you paid, minus the regular monthly price for each
  month started. After 30 days, yearly payments aren't refunded; your site stays up through the year you paid for and the
  plan won't renew. Yearly plans renew each year; we text and email you at least 30 days before, and you can cancel
  before it renews.
- Extras: one-time extras aren't refundable once delivered unless we made the mistake (printed and programmed items
  once printed/programmed). Monthly extras can be canceled with 30 days' notice. Same-day build is refunded if we miss
  the window through our own fault; Google Business Profile setup is refunded [half] if Google refuses to verify.
- Late payments: a $[15] late fee [10] days after a failed payment, [8]% a year on balances over 30 days overdue, the
  site offline after 30 days, the agreement may end after 60 days, $[49] to put a site back online.
- Payment disputes: please contact us first; a dispute of an amount that was due counts as a missed payment and adds the
  bank's $15 fee.
- If we fail you: a month free for more than [24] hours of downtime in a month that's our fault; three such months in a
  year, or a problem not fixed within 14 days of written notice, lets you cancel without the rest of your term and get
  unused prepaid months back.
- If we ever charge you by mistake, we refund it in full. Refunds go back to your original card or account, usually
  within 5 to 10 business days.
- To cancel or ask for a refund, text or email us or use your billing link. Cancellation takes effect at the end of your
  paid period (after any minimum term).
- This cancellation and refund policy is part of your signed agreement as of the day you sign.

Also move the `/terms` "Limits" paragraph wording to match §16 (12 months) and add a "How we settle disagreements"
section (Cullman County, talk first). Bump `POLICIES_UPDATED`.

### Business decisions to make (defaults used above)

| Decision | Default | Range found reasonable |
|---|---|---|
| Grace days before late fee | 10 | 5–15 |
| Late fee | $15 flat, once per missed payment | $10–$25 (or greater of $15 / 5%, cap $50) |
| Interest on overdue | 8%/yr after 30 days (or none) | 0–8% (never 1.5%/month on sub-$2,000 balances) |
| Suspension / termination | 30 / 60 days | 30–45 / 60–90 |
| Reinstatement fee | $49 | $25–$99 |
| Early payoff discount | 15% | 10–25% (or 0%: "finish your term") |
| Liability cap | 12 months of fees | 3–12 months |
| Downtime credit trigger | 24 h/month our fault → 1 month free | 12–48 h; credit capped at the month's fee |
| Update turnaround | 3 business days | 2–5 |
| Deemed approval | 7 days of silence | 5–14 |
| Church invoice due | Net 15 monthly / Net 30 yearly | Net 15–30 |
| Church late path | fee +15, offline +45, end +75 | +15–30 / +45–60 / +75–90 |
| Photo no-show | counts as the visit; new visit $99 | $50–full price |
| GBP verification refused | refund half | half–all |

---

## 8. Sources

Alabama statutes and cases (primary where fetched; mirror sites are marked):

- Ala. Code § 8-8-1 (6% / 8% written-contract cap): https://law.onecle.com/alabama/title-8/8-8-1.html (mirror; text
  confirmed) · https://law.justia.com/codes/alabama/title-8/chapter-8/ · summary
  https://www.findlaw.com/state/alabama-law/alabama-interest-rates-laws.html
- Ala. Code § 8-8-5 ($2,000+ any rate; (c) broad "interest"; (d) not under $2,000):
  https://law.onecle.com/alabama/title-8/8-8-5.html (mirror; text confirmed) · https://codes.lp.findlaw.com/alcode/8/8/8-8-5
- Ala. Code § 8-8-8 (interest from the due date on contracts): https://law.onecle.com/alabama/title-8/8-8-8.html ·
  prejudgment-interest summary https://ezel.ai/surveys/prejudgment-interest/alabama
- Ala. Code § 8-8-10 (post-judgment: contract rate, else 7.5%): https://law.onecle.com/alabama/title-8/8-8-10.html
- Ala. Code § 8-8-12 forfeiture of interest (secondary only): https://legaltemplates.net/form/promissory-note/alabama-al/
- Ala. Code § 5-19-4 (consumer late charge: greater of $18 or 5%, cap $100, after 10 days):
  https://law.justia.com/codes/alabama/title-5/chapter-19/section-5-19-4 ·
  https://infobytes.orrick.com/2011-06-09/alabama-modifies-late-fee-restrictions-under-consumer-credit-act/
- Liquidated damages vs penalty: Autauga Quality Cotton Ass'n v. Crosby, 893 F.3d 1276 (11th Cir. 2018) (Alabama law;
  cites Camelot Music v. Marx Realty (Ala. 1987)) https://cite.case.law/f3d/893/1276/ ; Milton Construction v. State
  Highway Dept. (Ala. 1990) brief https://www.lexplug.com/casebrief/milton_const_co_v_state_highway_dept__67ecaa29a41f47462a8c50a9 ;
  Burr & Forman on Alabama liquidated damages https://www.burr.com/newsroom/articles/liquidated-damages-in-alabama-real-property-purchase-and-sales ;
  IADC Alabama damages compendium https://www.iadclaw.org/assets/1/6/DCJ_Damages_Compendium_-_Alabama.pdf ;
  commercial late-fee overview (vendor) https://landager.com/en/property-compliance/usa/alabama/commercial-late-fees
- Attorney's fees (American rule; contract exception): Jones v. Regions Bank, 25 So. 3d 427 (Ala. 2009) as quoted in
  https://www.alsb.uscourts.gov/sites/alsb/files/opinions/fox.pdf
- Small claims: Ala. Code § 12-12-31 ($6,000; corporations may appear by officer/full-time employee; no fee award
  without a lawyer) https://www.womenslaw.org/laws/al/statutes/section-12-12-31-small-claims-actions-attorney-representation-attorney-fees ;
  district court $20,000 and procedure https://www.nolo.com/legal-encyclopedia/alabama-district-court-small-claims-actions-an-overview.html
- Limitation of liability enforceable (Puckett, Taul & Underwood (Ala. 1989); Saia Food v. SecurityLink (Ala. 2004);
  Fox Alarm v. Wadsworth (Ala. 2005); JohnsonKreis v. Howard Painting (Ala. 2025) on indemnity):
  https://50-state.watttieder.com/states/alabama/ · https://www.sdmmag.com/articles/83367-security-and-the-law-limitation-of-liability-upheld-in-state-supreme-court
- Forum selection: Professional Ins. Corp. v. Sutherland, 700 So. 2d 347 (Ala. 1997)
  https://www.pastpaperhero.com/resources/professional-ins-corp-v-sutherland-700-so-2d-347-ala-1997 ;
  https://caselaw.findlaw.com/al-supreme-court/1558222.html
- Arbitration: Ala. Code § 8-1-41(3) and FAA preemption, Allied-Bruce Terminix v. Dobson, 513 U.S. 265 (1995)
  https://law.onecle.com/ussc/513/513us294.html · https://caselaw.findlaw.com/al-supreme-court/1303117.html
- Restrictive covenants: Ala. Code § 8-1-190 (text) https://codes.findlaw.com/al/title-8-commercial-law-and-consumer-protection/al-code-sect-8-1-190/ ;
  Bradley summary https://www.bradley.com/-/media/files/insights/publications/2021/03/noncompete-agreements_alabama.pdf
- Statute of limitations (6 years written contract, § 6-2-34; 3 years open account, § 6-2-37):
  https://ezel.ai/surveys/statute-of-limitations-debt-collection/alabama
- Alabama Deceptive Trade Practices Act "consumer" definition § 8-19-3: https://law.justia.com/codes/alabama/2006/4653/8-19-3.html
- Alabama UETA: § 8-1A-7 https://law.onecle.com/alabama/title-8/8-1A-7.html ; § 8-1A-9 https://law.onecle.com/alabama/title-8/8-1A-9.html ;
  chapter https://law.justia.com/codes/alabama/title-8/chapter-1a/
- Alabama Data Breach Notification Act § 8-38: https://acua.alabama.gov/PDF/law/AlabamaDataBreachNotificationAct.pdf ;
  https://www.ballardspahr.com/insights/alerts-and-articles/2018/04/alabama-becomes-50th-state-to-enact-data-breach-notification-law
- Alabama sales tax on software/services: Ex parte Russell County Community Hospital (Ala. 2019)
  https://taxnews.ey.com/news/2019-1004-alabama-high-court-finds-all-software-is-tangible-personal-property-subject-to-sales-tax-nontaxable-services-should-be-separately-stated-invoiced ;
  https://www.avalara.com/us/en/blog/2019/06/custom-software-ruled-taxable-in-alabama.html (no ADOR guidance on web design/hosting found)
- Auto-renewal: Faegre Drinker 50-state survey (Alabama: no law) https://www.faegredrinker.com/en/insights/publications/2018/8/automatic-renewal-laws-in-all-50-states-an-updated-guide ;
  2026 tracker https://subtracker.io/best/us-automatic-renewal-laws-by-state ; Alabama HB610 (2026, introduced 3/11/26)
  https://app.azure.legiplex.com/al/legislature/2026/2026-r/bills/hb610 (status beyond introduction not confirmed)

Federal:

- E-SIGN Act 15 U.S.C. § 7001 (text) https://www.govinfo.gov/content/pkg/COMPS-940/pdf/COMPS-940.pdf ; § 7006 definitions
  https://www.law.cornell.edu/uscode/text/15/7006 ; consumer-consent overview https://consumercomplianceoutlook.org/2009/fourth-quarter/q4_02
- FTC click-to-cancel vacated (8th Cir., July 8 2025) https://www.steptoe.com/en/news-publications/ftcs-click-to-cancel-rule-vacated-by-eighth-circuit.html ;
  new rulemaking (ANPRM to OIRA Jan 30 2026) https://www.crowell.com/en/insights/client-alerts/clicking-all-the-right-boxes-ftc-moves-to-revive-click-to-cancel-rule-following-eighth-circuit-vacatur ;
  https://www.gibsondunn.com/ftc-restarts-negative-option-rulemaking-after-eighth-circuit-vacatur-enforcement-under-rosca-continues/ ;
  https://www.jonesday.com/en/insights/2026/05/ftc-revives-clicktocancel-rule-new-risks-for-subscription-businesses
- ROSCA requirements https://www.americanbar.org/groups/business_law/resources/business-law-today/2022-august/let-em-out-rosca/ ;
  https://www.cooley.com/news/insight/2024/2024-07-16-ftc-continues-aggressive-rosca-enforcement-agenda-against-negative-option-sellers
- TCPA revocation rule (effective April 11 2025; part delayed to April 2026) https://kleinmoynihan.com/fccs-tcpa-consent-revocation-rule-effective-april-11-2025/ ;
  https://www.mcguirewoods.com/client-resources/alerts/2025/1/delayed-one-to-one-consent-rule-gives-companies-reprieve-plus-other-tcpa-updates/
- ADA web accessibility (no Title III web rule; WCAG 2.1 AA benchmark; 2025 filing counts) https://blog.promise.legal/startup-central/ada-website-accessibility-compliance-2026/ ;
  https://testparty.ai/blog/ada-compliance-2026 ; https://www.audioeye.com/post/doj-website-accessibility-ada/

Payments:

- Stripe disputes (120-day window, 7–21 day response, fees) https://docs.stripe.com/disputes/how-disputes-work ;
  June 2025 dispute fees ($15 received, non-refundable; $15 countered, returned on win)
  https://support.stripe.com/questions/june-2025-pricing-updates-for-disputes
- Stripe ACH Direct Debit (60 days personal / 2 business days business; uncontestable; mandates; 7-day timing notice)
  https://docs.stripe.com/payments/ach-direct-debit
- Nacha 60-day rule explainer https://www.nacha.org/news/which-60-days-it-understanding-different-periods-regulation-e-and-nacha-rules ;
  R29 (2 banking days) https://moderntreasury.com/ach-return-codes/r29

Domains, Google, hosting, extras:

- ICANN change-of-registrant 60-day lock https://icann.org/resources/pages/ownership-2013-05-03-en ;
  https://support.dnsimple.com/articles/icann-60-day-lock-registrant-change/ ; status of its retirement
  https://domaindetails.com/kb/domain-management/domain-transfer-locks-60-day-rules
- Google Business Profile third-party policies (owner consent, inform of edits, explicit approval to answer reviews)
  https://support.google.com/business/answer/7353941 ; eligibility/ownership https://support.google.com/business/answer/13763036
- Google Ads third-party policy (transparency on costs/results; separate account per advertiser)
  https://support.google.com/adspolicy/answer/6086450 ; https://ppc.land/google-tightens-rules-for-ad-agencies-managing-client-accounts/
- Hosting SLA patterns (99.9%, tiered credits capped at the month's fee, sole remedy)
  https://kinsta.com/wp-content/uploads/2025/11/Kinsta-Service-Level-Agreement-September-11-2024-WEBSITE-ARCHIVE.pdf ;
  https://www.hostease.com/sla.html
- Web-design contract checklists (IP transfer on payment, domain in client's name, suspension for non-payment)
  https://adaptedijital.com/en/web-design/web-design-contract-checklist/ ; https://varenyaz.com/what-should-be-included-in-a-web-design-contract/ ;
  https://sprintlaw.com.au/articles/customer-terms-for-australian-web-design-agencies-selling-online/
- Photo-session cancellation norms (24–48 h; no-show forfeits/flat fee) https://www.missouristate.edu/CreativeServices/photography-cancellation-policy.htm ;
  https://cinematography.net/edited-pages/Cancellation_Fees.htm
- Church signing authority https://www.churchlawandtax.com/pastor-church-law/organization-and-administration/officers-directors-and-trustees-personal-liability/contract-liability-2/ ;
  https://communique.archatl.com/wp-content/uploads/Signed-Contracts-with-Outside-Vendors_101124.pdf

### Could not be confirmed (say so to the lawyer)

- Whether Alabama courts treat a flat late fee on a *service* invoice as "interest" under §§ 8-8-1/8-8-5 (the broad
  "interest" definition in § 8-8-5(c) is the worry) or purely as liquidated damages. Cantrell v. Walker Builders, 678 So.
  2d 169 (Ala. Civ. App. 1996) is cited by a secondary source for "late fees on $2,000+ loans limited only by
  unconscionability"; not read.
- Whether an Alabama LLC may appear in small claims through a member/manager (§ 12-12-31(b) says "corporation …
  officer or full-time employee").
- Alabama HB610 (2026) automatic-renewal bill: status after introduction.
- Any Alabama appellate decision on acceleration of remaining monthly fees in a hosting/subscription contract.
- ADOR position on sales/use tax for website design and hosting fees.
- Whether SCORE/SBA publish a current service-agreement template (none found; generic templates only).

### Five questions for the lawyer

1. **Early termination.** Is "keep paying monthly through the term, or pay the rest now less 15%" the strongest way to
   write the minimum-term commitment in Alabama, or should the remaining-months figure be discounted further / stated as
   an agreed estimate of loss? Should the site stay live during a paid-out term?
2. **Late fee and interest.** Is a flat $15 late fee plus 8% a year on balances over 30 days safe under §§ 8-8-1 and
   8-8-5 for balances under $2,000, or would you drop the interest and keep only the fee? Any conspicuousness or
   "once per payment" wording you want?
3. **Collections and venue.** Is the collection-costs/attorney's-fees clause as written enforceable for an LLC pursuing
   $300–$2,000 balances, how should we appear in Cullman County small claims (member vs lawyer), and do you agree
   arbitration is a bad fit?
4. **Limits, warranty disclaimer and indemnity.** Does the 12-month cap plus indirect-damages exclusion need capitals
   or other conspicuous form in Alabama? Is the client indemnity for AI-drafted, client-approved text and client-supplied
   photos clearly enough stated? Anything to add for wantonness carve-outs?
5. **E-signature, churches and renewals.** Is our phone signing record (typed name, drawn signature, consent, IP, user
   agent, time, stored text) enough under UETA § 8-1A-9 attribution, including for a pastor/treasurer signing for a
   church (authority line, entity named)? Do the yearly-renewal notice, the cancel-by-text method and our sign-up
   disclosures satisfy ROSCA today and HB610 if it passes? (Bonus for a CPA: is any part of the plan or extras subject
   to Alabama sales/use tax?)
