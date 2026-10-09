# Category blueprint: Churches and community nonprofits

Researched October 2026 for the Cullman, AL starting market. One template covers small local congregations (Baptist,
Methodist, Church of Christ, Pentecostal / Church of God / Assembly of God, Nazarene, Presbyterian, Lutheran, Episcopal,
Catholic parishes, cowboy and non-denominational churches) plus community nonprofits and civic groups (VFW and American
Legion posts, Lions / Rotary / Ruritan / Civitan clubs, Masonic and Elks lodges, food pantries and clothes closets, and rural
community centers). Four variants (section 10) change the schedule block, the modules and the CTAs. Our sites stay static: **no
giving forms, no event registration, no member logins.** Giving, livestreams and calendars are links to services the church
already uses.

This category differs from every earlier one in one way that drives the whole design: **most of what a church site says is
the church's own testimony, not marketing.** Doctrine, affiliation, the pastor's story and even service times are things only
the congregation can say. The AI writes the welcome around them; it never writes them. See the **Sensitivities** block in
section 8 and the publish gate in section 9.

**Method.** Candidates came from Google Places (New) Text Search, the same API the app uses: "church", "baptist church",
"church of christ", "non-denominational church", "church of god", "methodist church" and similar terms around Cullman, plus
"church in {town}" for Hartselle, Arab, Oneonta, Jasper, Guntersville and Athens, and "food pantry", "community center",
"VFW post", "American Legion post", "Lions Club", "Masonic lodge", "nonprofit organization" (about 700 places in total). Every
`websiteUri` Google listed for a place of worship was downloaded with a phone user-agent (Galaxy Fold Chrome string), and I
scripted counts of `tel:` links, platform fingerprints, giving and video providers, social links, schema.org types, H1s, HTML
size, forms and keyword patterns in the visible text. I pulled heading sequences from about 60 pages and read the opening
~200 words of 13 (First Baptist Cullman, Daystar Cullman, West End Global Methodist, Cornerstone Assembly of God Jasper,
Northbrook Caring Center, The Crossing, Followers Feeding Families, Feeding Families of Alabama, The Caring Place, Committee on
Church Cooperation, VFW Post 2702, American Legion Post 237, Enterprise Lions Club). Four large churches (Church of the Highlands, Hunter Street, Briarwood, Asbury) were
read for ideas only. Vendor pricing pages were fetched for section 14.

**Bases for the numbers.**
- **N = 197** church home pages counted (all small-town north Alabama: Cullman area 45, Hartselle/Falkville 27, Arab 19,
  Oneonta 13, Jasper 29, Guntersville/Albertville 20, Athens/Madison 40, other 4). By family (from the name): Baptist 59,
  non-denominational/other 54, Church of Christ 26, Methodist/Wesleyan/Nazarene 20, Pentecostal/AoG/Church of God 16,
  Presbyterian/Lutheran/other mainline 11, Episcopal/Anglican 5, Catholic 4, cowboy 2. One of the 197 (Limestone County
  Churches Involved) is really a charity coalition that Google types as `church`, which is itself a detection lesson.
- **N = 69** of those have 300+ words of server-rendered text. Used for keyword counts ("text pages").
- **N = 20** nonprofit and civic home pages (13 charities / pantries, 7 posts and clubs) and **N = 4** large churches (ideas only).
- Keyword counts are pattern matches on home pages only: treat them as close estimates (roughly ±3). Per-family N is small
  for Catholic and Episcopal, so those rows show direction only.

**Market note (why this category matters for us).** In the Cullman-area Places results, **107 places are typed `church`: 46 have
no website at all, 4 list only Facebook or a free builder, and 57 list a site.** Of those 57, at least 5 are suspended,
hijacked, hacked or pointed at a spam directory, and one sends Cullman visitors to a Kentucky congregation's page (section
13). In the six nearby-town searches, 154 of 335 results (46%) had no site or only a social page. **Leads are plentiful but
small:** the no-site Cullman churches have a median of **5 Google reviews** (max 19), and 16 of the 46 list no phone. Civic
posts look similar: of 60 American Legion results across north Alabama, 16 have no site, 14 only Facebook, and **22 list the
state department's site `legional.org` as their website**, which is not theirs.

---

## 1. Summary

- **The schedule is the product.** Visitors come to answer "when is church, where do I go, what about my kids?" 135/197 home
  pages show service wording plus a clock time, so 62 don't. **Google hours are not service times**: of 47 Cullman church
  listings with hours, 22 are weekday office hours, 23 are service blocks and 2 say "Open 24 hours". A Catholic parish lists
  Sunday as Closed. Our template leads with a **confirmed weekly schedule** (Sunday school, worship, Sunday evening, Wednesday
  night) and a **"Next service" chip**, never an "Open now" chip. Service times are a **required, church-confirmed** field.
- **"Plan your visit" is the conversion, not "Call".** 97/197 pages use plan-a-visit / I'm new / first-time / visitor language
  and 32/197 say "what to expect". Strong small sites answer the same six questions: where to park and which door, what to
  wear, what happens with my kids, how long it lasts, what the music is like, can I just slip in. **Only the church can answer
  most of them** (dress and kids especially), so the module renders from owner fields with a gentle AI frame.
- **Watch and Give are links out.** YouTube appears on 111/197 pages (channel link 93, embed only 15), Vimeo 30, Subsplash 25,
  Facebook Live 9. "Give/giving/tithe" wording is on 141/197 but an actual giving-provider link on only 55/197 (Tithe.ly 16,
  Pushpay 9, Realm 7, Vanco 6, Planning Center 5, Givelify 3...). We render **Watch live** and **Give online** buttons only from
  the church's own URLs. **Church of Christ congregations rarely give online (1/26)**, so Give defaults off for them.
- **Ministries and the seasonal calendar make a small church look alive.** Kids 95/197, youth 92, missions 99, women 30,
  men 38, seniors 15, music 31, VBS 9, plus regional staples (Wednesday supper, homecoming, revival, gospel meeting, singings,
  Decoration Day at the church cemetery). We show **owner-ticked ministry cards** and **dated seasonal events that auto-hide**.
- **Sensitivities (section 8).** The AI never writes **doctrine, statements of faith, denomination or affiliation claims,
  theological positions, scripture choices or interpretations, sermon content, church history or the pastor's bio**. It writes
  only the welcome, general first-visit framing and neutral section intros. Service times, the tradition label, beliefs (if
  shown), pastor bio, giving link, kids info and any accessibility, Spanish, nursery, safety or tax-deductible claim come from
  the church and block publishing until confirmed. **No photos of children**, no political content, prayer requests go only to
  the church.
- **Nonprofits are a lighter version of the same pattern.** Food pantries need **when / where / who can come / what to bring**
  (owner text only; "no ID required" is a policy, not copy). Civic posts need **meeting time and place, how to join, hall
  rental and programs** (honor guard, scholarships, Boys State, eyeglass recycling). Tax-deductible and 501(c)(3) wording
  renders only when the organization confirms it, because posts, clubs and lodges are often *not* 501(c)(3).
- **Weak sites fail on the basics**: no or several H1s (114/197), `tel:` on only 71/197 (about 69 show a number as plain text),
  128/197 under 300 words, template residue ("Slide title" ×20), stale "© 2018" footers, suspended and hijacked domains, and
  injected casino spam (section 13). A clean, current, fast site beats most of this field.

---

## 2. Sample

All rows were downloaded directly and counted. Large churches are for ideas only.

| Group | Organizations | N |
|---|---|---|
| Cullman area | Northbrook Baptist, Temple Baptist (Cullman + Fairview campuses), Desperation Church, First Baptist Cullman, The Refuge (Church of God), Daystar Cullman, Cornerstone Nazarene, Cullman First Nazarene, Sacred Heart of Jesus (Catholic), Trinity Baptist, Spirit Life Church of God, Cullman First United Methodist, Redeeming Grace, Cullman Church of Christ, St. John's Evangelical Protestant, Grace Episcopal, Crosshaven (Hanceville), East Side Baptist, St. Andrew's Global Methodist, St. Paul's Lutheran, Seventh St Baptist, Fourth Street Church of Christ, Northside Baptist, Christ Lutheran, Christ Covenant PCA, Life Church (Hanceville), Kingdom Life, Lake Catoma Baptist, Mission Community, East Point Cumberland Presbyterian, Victorious Faith, Highway 157 Church of Christ, Center Grove Baptist, Mount Olive, Redemption Assembly of God, Faith Baptist (Vinemont), Concord Baptist, Chance's Cross Roads Church of Christ, Beulah Church of Christ, Hanceville Church of Christ, Cornerstone Revival Center, Liberty Church, Welti Cumberland Presbyterian, Casa de Oración Cumberland Presbyterian (Spanish) | 45 |
| Hartselle / Falkville / Somerville | First Christian, Hartselle First Assembly of God, Christ Fellowship (CoG), First Baptist Hartselle, Sanctuary Community, East Highland Baptist, West Hartselle Baptist, Hartselle Church of Christ, First Methodist Hartselle, Hartselle Tabernacle, New Center Southern Baptist, Bethel Baptist, Mt. Zion Baptist, Westview Church of Christ, Oak Ridge Baptist, Forrest Chapel UMC, Victory Fellowship, The Deliverance Tabernacle, Rock Springs Baptist, Oak Ridge Methodist, The Church at Quail Creek, Tunsel Road Baptist, St. Barnabas Episcopal, Shiloh Church, West End Global Methodist, No Fences Cowboy Church, Fairview Church of God | 27 |
| Arab / Joppa | Community Church of Arab, Liberty Church, Arab Church of God, Destiny Church, Arab Church of Christ, Arab First UMC, Connect Church, Arab Wesleyan, Arab First Baptist, Lifespring Baptist, Gilliam Springs Baptist, Stay Free Ministries, Grace Covenant Baptist, Life Gate Baptist, Rocky Mount, Eddy Missionary Baptist, New Brashiers Chapel Methodist, Hebron Church of Christ, Brindlee Mt. Nazarene | 19 |
| Oneonta | First Baptist Oneonta, Anchors (Assemblies of God), Cornerstone Christian Fellowship, Redeemer Community, Union Hill Baptist, Oneonta Church of Christ, Corpus Christi Catholic, Mission Church, Park Avenue Baptist, Church United, Freedom Ministries, Lester Memorial Methodist, Evangel Presbyterian PCA | 13 |
| Jasper | Glory Fellowship Baptist, The Storehouse, Jasper's First Baptist, Trace Church, Redemption Baptist, Hope House, Living Light Church of God, Cornerstone Assembly of God, Northside Baptist, First Methodist Jasper, St. Mary's Episcopal, Mount Vernon Baptist, Westside Baptist, Blooming Grove Baptist, Covenant Nazarene, New Prospect Baptist, Farmstead Baptist, Boldo Community Christian, Sixth Avenue Church of Christ, Grace Family, Sanctuary Church of God, St. Cecilia Catholic, First Presbyterian PCA, Crossroads Church of Christ, Midway Church of Christ, North Jasper Church of Christ, Zion Rest Primitive Baptist, Harmony Baptist, Macedonia Church of Christ | 29 |
| Guntersville / Albertville | Real Church, Victory Baptist, Guntersville Church of Christ, River Church of God, Lake City Assembly of God, Christ Redeemer, Guntersville First Methodist, Lifepoint, Episcopal Church of the Epiphany, Creek Path Baptist, Point of Grace, Mountain Lakes Mennonite, Solitude Baptist, Henryville, Warrenton Methodist, Guntersville Seventh-day Adventist, Bakers Chapel Baptist, Greater Life Fellowship, Corinth Baptist, Alder Springs Church of Christ | 20 |
| Athens / Madison | Clements Baptist, Friendship Church, First Baptist Athens, Discovery Church, The Way, First Christian, Limestone County Churches Involved (charity), Central Church of Christ, Lindsay Lane Baptist, Summit Limestone, New Life Assembly of God, Madison Street Baptist, Seven Mile Post Road, Cultivate, First Church, Athens First Methodist, Legacy, Northside Church of Christ, Mt. Pisgah Baptist, Athens Worship Center, Cowboy Church of Limestone County, The Grove (Madison), Apostolic Christian, New Hope Baptist, St. Paul Catholic, St. Timothy's Episcopal, The Life Church, Berea Baptist, Westview Church of Christ, Round Island Baptist, Fairview Baptist, Jones Road Church of Christ, Pleasant Valley Church of Christ, Eastside Church of Christ, Blackburn Road Baptist, Market Street Church of Christ, Sardis Springs Baptist, CrossPointe (Madison), East Highland Baptist, Journey Church | 40 |
| Other north Alabama | Sweet Home Baptist, The Rock Family Worship Center (Huntsville), Beltline Church of Christ (Decatur), Central United Methodist (Decatur) | 4 |
| Charities / pantries | Unsheltered International, Curt's Closet, United Way of Cullman County, Cullman Caring for Kids, The Crossing, Northbrook Caring Center (Cullman); Committee on Church Cooperation, Neighborhood Christian Center, Followers Feeding Families (Decatur); Feeding Families of Alabama, The Caring Place (Hartselle); Hope Horses (Cullman) | 13 |
| Civic posts and clubs | American Legion Post 237 (Huntsville), Post 229 (Madison); VFW Post 2702 and Post 5162 (Huntsville); Guntersville, Montgomery and Enterprise Lions Clubs | 7 |
| Large churches (ideas only) | Church of the Highlands, Hunter Street Baptist, Briarwood Presbyterian (Birmingham area); Asbury Methodist (Madison) | 4 |

Not counted (no usable page): 404 or dead (cullmanfpc.com, awakeninglifechurch.com, graceworks.net, freshwindcf.org,
lzmbc.org, remnantchurchint.org), hosting "account suspended" (baldwinchurch.com, mpmchurch.com), provider error page
(therevivalcenter.com), JavaScript bot wall (cullmanorthodox.com), proxy/bot blocks or time-outs (southcullmanchurch.com,
stjamescullman.com, wpbaptist.church, joneschapelchurchofchrist.com, gvillefbc.org, stwilliamchurch.com, linkingcullman.org,
allegionpost15.com, cullmanrotary.org and about 10 more), elevationchurch.org and life.church (bot walls).
**Totals: 254 tried, 226 downloaded, 221 counted** (197 church-typed + 20 nonprofit/civic + 4 large).

---

## 3. Pages

Common nav labels on the sample: About / Our story, Plan a visit / I'm new, Ministries (Kids, Students, Adults), Sermons /
Watch, Events / Calendar, Give, Contact, Beliefs, Staff. Nonprofits: About, Get help / Services, Donate, Volunteer, Events.
Posts: About, Membership, Officers, Calendar, Hall rental, Auxiliary.

**Recommended page set**

- **Required:** **Home** (one long anchored page, section 4; it must work for a first-time visitor who never clicks further),
  plus the core's `404.html`, and `/privacy/` + `/thanks/` only when a form is on (prayer request or contact).
- **Optional, only when the owner supplies the content:**
  - *Plan your visit* (`/visit/`): when 4+ first-visit fields are filled (parking, entrance, dress, kids, length, music).
    Otherwise those answers live on Home.
  - *What we believe* (`/beliefs/`): **only the church's own text, verbatim**, or a link to its denomination's statement.
    Never generated.
  - *Ministries* (`/ministries/`): when more than 6 ministries have owner-supplied details.
  - *Weddings & facility use* (`/facility/`): the church's own policy text (members only or community, contact).
  - *Español* (`/es/`): via the existing Spanish page extra, only when Spanish services are confirmed.
  - Charity: *Get help* (`/help/`) when the assistance details run long. Civic: *Join* (`/join/`) and *Hall rental* (`/hall/`).
- **Never generated:** sermon pages, transcripts or summaries, devotionals or blogs, doctrine pages written by AI, staff
  directories beyond what the church supplies, photo galleries of children, member directories or "members only" areas,
  giving forms, event registration, per-town pages, prayer walls that publish requests.

---

## 4. Home page section order

Synthesized from heading sequences on ~60 pages and the opening reads. Order for the **church** variant; the other variants
are listed after.

1. **Header**: name/wordmark, call icon (`tel:`), **Give** button only if a giving URL exists, hamburger (≤ 6 items).
2. **Hero**: the name as H1, eyebrow "{Tradition label} church · {Town}" (label only when confirmed, else "Church · {Town}"),
   one AI welcome line, and a **Next service: Sunday 10:30 AM** chip computed from the confirmed schedule. Buttons: **Plan a
   visit** (primary) + **Directions**; third **Watch live** when a live URL exists. Photo: the building exterior or sanctuary,
   ≤ 55% of the viewport, **never people**.
3. **Service times** (the core of the page): the weekly schedule grouped by day (Sunday, Wednesday, others), each line
   `9:15 AM Sunday School · 10:30 AM Worship`, then the address (tap = directions). Monthly/seasonal items in a smaller list.
4. **Plan your visit / What to expect**: 4-6 answer cards (parking and entrance, what to wear, kids, how long, music, coffee or
   greeters). Each card renders only when its owner field is set; the AI writes a one-line intro.
5. **Kids & students**: nursery (ages), kids church / children's classes, youth (grades), from owner fields. Icon cards, no photos
   of children. Safety lines ("background-checked volunteers", "secure check-in") only when confirmed.
6. **Watch & listen**: **Watch live** (YouTube `/live` or Facebook live URL) with the owner's "Live Sundays at 10:30" text,
   **Past sermons** link, podcast link. Click-to-load video only; no auto embed.
7. **Ministries & groups**: 4-8 owner-ticked cards (Sunday school classes, women, men, seniors, music/choir, missions,
   recovery, food pantry...) with meeting times when given.
8. **This season** (optional): dated events (VBS, homecoming, revival or gospel meeting, Trunk or Treat, Christmas program,
   Decoration Day) that auto-hide after their date, plus **See all events** (Facebook events, public Google Calendar or Church
   Center link).
9. **Our pastor** (or minister / elders / priest, in the church's words): owner photo and **owner-written bio only**;
   placeholder card until supplied.
10. **What we believe** (optional): the church's statement verbatim (collapsed after ~120 words) or a link; hidden otherwise.
11. **Give**: one quiet panel: **Give online** (link out, provider name), text-to-give line if given, "or give in person during
    worship" and mailing address only if the church supplies them.
12. **Prayer request** (optional): short form or email/text link; states who reads it.
13. **Weddings & facility use** (optional): owner text + contact.
14. **Visit us**: address, click-to-load map, parking and accessibility notes (confirmed only), **office hours** (labeled as office
    hours), phone, email.
15. **FAQ** (4+ backed answers) and **final CTA band**: "Join us this Sunday" + Plan a visit / Directions / Call, repeating the
    next service.
16. **Footer**: NAP, office hours, social, giving link, privacy, credit line.

**Above the fold on a phone (360×740):** name, the "church in {Town}" line, **Next service** chip, **Plan a visit** (full width)
and **Directions** buttons, and the first line of Sunday times. The call icon sits in the header. Large churches (Hunter Street:
"Sunday Service Times 9:30 and 11:00am", "Stream us live Sundays at 9:30am") and the best small ones (First Baptist Cullman,
Cultivate Athens, West End Methodist) all put the Sunday times in the first screen.

**Charity (food pantry / help) order:** Header · Hero (what we do + town; **Get help** primary, **Donate** / **Volunteer**) ·
**Get help** (days and hours, where, who can come, what to bring, how often, other help such as 211; all owner text) ·
**How you can help** (donate money link, items needed + drop-off hours, volunteer) · About / mission · Impact (owner numbers only)
· Events (food drives, giveaways; dated) · Visit / contact · FAQ · CTA · Footer.

**Civic post / club order:** Header · Hero (post or club name and number + "{Kind} in {Town}"; **Visit a meeting** or **Join**
primary, Call) · **Meetings** (when, where, who's welcome) · **What we do** (owner-ticked programs) · **Join** (owner eligibility
text + national join link) · **Hall rental** (optional) · Events (dated) · Officers (owner) · Support us (donate link) · Visit ·
CTA · Footer.

**Community center order:** Header · Hero (**Rent the hall** primary, Call) · Rent the hall (capacity, kitchen, tables, how to
book; rates only from owner) · Regular gatherings and events · About (board, history from owner) · Visit · FAQ · CTA · Footer.

---

## 5. Features and calls to action

**CTA matrix by variant** (primary / secondary / third):

| Variant | Primary | Secondary | Third (only if link given) |
|---|---|---|---|
| church | **Plan a visit** (anchor to visit section or `/visit/`) | Directions | Watch live (YouTube/Facebook) |
| church, sub-label catholic | **Mass times** (anchor) | Directions | Watch live / Bulletin |
| church, sub-label church_of_christ | **Plan a visit** | Directions | Watch live; **no Give button unless the church asks** |
| civic_post | **Visit a meeting** (or **Join**) | Call | Rent the hall / Donate |
| charity | **Get help** (anchor) | Call | Donate / Volunteer |
| community_center | **Rent the hall** (call/text/email) | Directions | Events (Facebook) |

Must-have (default on):

| Feature | Frequency in sample | Notes |
|---|---|---|
| Weekly schedule with clock times | service wording + a time on 135/197; Sunday school / groups 103; Wednesday 107; Sunday evening 50 | Required, church-confirmed. Grouped by day; language tag per line (Spanish services). |
| Address + directions | street address in text on 143/197; Maps embed 16/197 | Directions button from the Place ID; map click-to-load. |
| Tap-to-call | `tel:` 71/197 (about 69 show a dead number) | Header icon + Visit section. |
| Plan a visit / what to expect | 97/197 / 32/197 | Owner answers; AI frame only. |
| Kids / youth info | kids 95, youth 92, nursery only 14 | Nursery and ages from owner; no child photos. |
| Social links | Facebook 154/197, Instagram 75, YouTube channel 93, TikTok 3 | Buttons with handle text. Facebook is where small churches actually post. |
| Watch live / sermons | YouTube 111/197, Vimeo 30, Subsplash 25 | Link-out buttons. |
| Pastor / staff | staff wording 103/197 | Owner photo + bio. |
| Contact (email + phone) | `mailto:` 76/197; forms 43/197 | Contact via core form (optional) or mailto. |

Nice-to-have (toggles):

| Feature | Frequency | Notes |
|---|---|---|
| Give online | provider link 55/197 ("give" wording 141) | Link-out, provider-labeled. Off by default for Church of Christ. |
| Beliefs | 91/197 mention beliefs / what we believe | Owner text or link only. |
| Prayer request | 27/197 | Form to church email, or email/text link. |
| Events + calendar link | events 127/197; Google Calendar embed 5 | Dated items auto-hide; calendar as a link. |
| Newsletter / bulletin | 26/197 | Link to PDF bulletin or signup (Flocknote, Mailchimp, Church Center). |
| Church app | "get the app" 14/197 | App Store / Google Play links if they have one (Subsplash, Tithe.ly, Church Center). |
| Weddings / facility use | 10/197 | Owner policy only. |
| Spanish services | 9/197 | Schedule lines tagged `es` + Spanish page extra. |
| Missions / outreach | 99/197; food pantry / clothes closet 10/197 | Ministry cards; a church pantry can carry the charity "Get help" block. |
| Accessibility, parking | 5/197 and 2/197 | Big gap: render only from owner checkboxes. |
| Baptism, membership class | baptism 31/197 | Owner text only (practice differs by tradition). |

**Trust signals that fit churches:** "Gathering since {year}" (owner), the confirmed tradition label, the pastor's photo and name,
real photos of the building and sanctuary, livestream text ("Live every Sunday at 10:30"), community service (food pantry,
backpack program). **Nonprofits:** years serving, families served per month (owner numbers; Feeding Families shows "300+
families served per month"), parent organization ("American Legion Department of Alabama"), confirmed nonprofit status.
No review stars: churches rarely get reviews and asking for them is out of place; the Google link stays in the footer only.

---

## 6. Third-party integrations

| Tool | Seen (N = 197 churches unless noted) | How we use it |
|---|---|---|
| Giving: Tithe.ly 16, Pushpay 9, Realm/ACS 7, Vanco 6, Planning Center Giving 5, EasyTithe 3, Givelify 3, Subsplash 2, SecureGive 2, Breeze 2, CCB 1, Cash App/Venmo 1 | any provider link 55 | `giving.url` button "Give online" (label "Give with Givelify" etc. when known). Never embed giving widgets or forms. |
| Nonprofit giving: Donorbox / Givebutter / Kindful / Zeffy | 5/20 nonprofits; Cash App 1/20 | `donate_url` button. PayPal/Square links fine. Cash App handles only if the org supplies them. |
| Video: YouTube (any link 111, channel 93, embed 15), Vimeo 30, Subsplash 25, Facebook live/videos 9, Boxcast 4, Resi 3, Church Online 2, SermonAudio 2, podcasts 7 | | `watch.live_url` (YouTube `/@handle/live` or Facebook page live URL), `watch.sermons_url`, `watch.podcast_url`. Click-to-load embed optional. |
| Planning Center Church Center | 19 (3 use a `churchcenter.com/home` page as their whole site) | Links for events, groups, forms, giving. Treat a Church Center home page as "free builder" presence in qualify. |
| Calendars: Facebook events, public Google Calendar, Church Center events | Google Calendar embed 5 | `events.calendar_url` link; dated highlights on our page. |
| Builders seen: WordPress 45, Wix 25, Subsplash/SnapPages 25, Squarespace 20, Google Sites/Duda 11, Weebly 7, Clover 6, GoDaddy 6, FinalWeb 5, Nucleus 4, Ekklesia360 2, Sharefaith 2, Faithlife 2 | 43 no fingerprint | Competition and switching story (section 14). |
| Bulletins / newsletters: PDF, Flocknote, Mailchimp, Church Center | 26 | Link only. |
| Google Maps embed | 16 | Click-to-load in Visit only. |
| **Skip:** Facebook page plugin (2), reCAPTCHA (46, mostly builder defaults), chat widgets (2), cookie-consent walls, livestream auto-embeds, prayer walls that publish requests, member logins (Bethel Hartselle shows a login form on its home page) | | Social buttons, Turnstile + honeypot on our forms, links out. |

---

## 7. Mobile behavior

- Viewport tag on 193/197, but phone layouts are often long builder stacks: slider heroes (Temple Baptist's 20 empty slides), the
  schedule repeated three times (First Baptist Cullman), a 60-item mega menu (Legion Post 237).
- **Action bar** (bottom, < 768 px): church **Plan a visit · Directions · Call** (swap Call for **Watch** during the confirmed live
  window on Sunday, computed client-side from the schedule; no API call). Civic **Call · Directions · Join**. Charity **Call ·
  Directions · Donate** (or **Get help**). Community center **Call · Directions · Text**.
- **Next service chip** in the hero: computed at build from the schedule and refreshed client-side (timezone America/Chicago).
  During a service window it reads "Worship is happening now · Watch live" when a live URL exists. **No "Open now" anywhere**:
  office hours are labeled as office hours.
- **Schedule block:** one card per day, times in tabular numerals on the left, labels on the right, ≥ 16 px, never in an image
  (some sites post the week as a flyer graphic or PDF, e.g. Highway 157's "PDF FLYER" link).
- **Cards:** ministries 2 columns at 344-412 px, 3 on the unfolded Fold, 4 on desktop. First-visit answers as an accordion on
  phones.
- **Images:** one hero (≤ 150 KB on mobile), lazy-load the rest, fixed aspect ratios, no sliders, no autoplay video.
- Buttons ≥ 48 px; Watch/Give links open in a new tab with "(opens in new tab)" for screen readers.

---

## 8. Content the AI writes

**Voice:** warm, plain, hospitable small-town Southern; short sentences; invitational, never salesy. It sounds like a friendly
greeter at the door, not a preacher and not a marketer. Tone by variant: church (welcoming, unhurried; traditional churches a
little more formal), civic (proud, neighborly, practical), charity (dignified and kind; never pity, never "the needy"),
community center (friendly, practical). No superlatives, no comparisons with other churches ("not your typical church"), no
growth claims ("fast-growing", "vibrant family of 300").

| Section | Copy | Length | Notes |
|---|---|---|---|
| Hero welcome | Invitation + town | 6-14 words | e.g. pattern "A church family in {Town}. We'd love to meet you." in our own words. No doctrine words. |
| Hero subline | One neutral line | 12-22 words | From confirmed facts only (since {year}, the town, livestream). |
| Visit intro | Reassurance | 20-40 words | "It's normal to wonder what to expect..." framing; no dress, kids or style claims. |
| Visit card framing | One line per owner answer | 8-16 words | Rewords the owner's answer into a friendly sentence; adds nothing. |
| Ministry cards | Who it's for, in general | 8-16 words | Audience only ("for women of all ages to study and serve together" only if owner ticked women's ministry). No ages, days or times unless in the record. |
| Watch intro | Invitation to watch | 10-20 words | Only when a live/sermon URL exists. |
| Give intro | Neutral thank-you line | 10-20 words | No tax claims, no "100% goes to", no guilt. |
| About intro | Placeholder-safe introduction | 50-90 words | Who and where, without history, size, doctrine or people. Owner story replaces it. |
| Charity intro / civic intro | What the group does, generally | 30-60 words | From enabled fields only. |
| FAQ | 4-6 answers | 30-70 words | Only for backed fields (times, parking, kids, livestream, hall rental). |
| Meta | Title ≤ 60, description ≤ 155 | | Section 12. |
| Alt text | Building / sanctuary photos | 5-12 words | Never describe people. |

**The AI must never write or claim:**
- **Faith content:** doctrine, beliefs, statements of faith, theological positions, creeds, sacraments or ordinances, salvation or
  healing promises, prophecy, "Spirit-filled", "Bible-believing", "Christ-centered", "gospel-centered", "Reformed", "KJV only",
  "full gospel" or any self-description of that kind (these are doctrinal identities; they appear only in owner text).
- **Scripture:** no verses, references (`John 3:16` style), paraphrases or interpretations. A church may supply its own verse.
- **Sermons:** no sermon titles, series, summaries or quotes.
- **Identity and affiliation:** denomination, convention or association membership (Southern Baptist, SBC, Alabama Baptist,
  United Methodist, Global Methodist, Assemblies of God, Church of God (Cleveland, TN), PCA, Catholic diocese...),
  "non-denominational", "independent". The tradition label comes from a confirmed field only.
- **People and history:** the pastor's name, title, bio, education, family or calling; staff names; founding story or year;
  building history; attendance or size.
- **Worship practice:** style (traditional, contemporary, hymns, a cappella, praise band, liturgical), language/translation used,
  communion frequency, service length, dress code ("come as you are", "casual", "Sunday best").
- **Kids and safety:** nursery availability or ages, kids church, check-in, background checks, safety policies.
- **Access and language:** wheelchair access, elevators, hearing help, reserved parking, Spanish or ASL services.
- **Money:** "tax-deductible", 501(c)(3) or other status, EIN, "100% of gifts", stewardship or tithing teaching, prices for hall
  rental or facility use, dues.
- **Help eligibility (charities):** who qualifies, ID or proof requirements ("no ID needed"), service area, frequency limits,
  what's available ("fresh produce every week").
- **Civic specifics:** membership eligibility (VFW and Legion eligibility rules are set by charter), officers, dues, bingo, canteen
  or bar, alcohol, raffles.
- **Events:** dates, revivals, VBS themes, speakers, singers.
- **Politics and social issues:** candidates, parties, ballot measures, legislation, or stances on contested issues (one sampled
  home page leads with a political blog post; section 13).

The copy checker (`src/copy/write.ts` fact/phrase check) gets a church list: reject scripture-reference patterns
(`\b(?:[1-3] )?[A-Z][a-z]+\.? \d{1,3}:\d{1,3}\b`), the doctrinal self-descriptors above, denomination and convention names not in
`ext.church.tradition_label` / `affiliation_text`, "tax-deductible", "501(c)", "nursery", "background", "wheelchair",
"handicap", "Spanish"/"español", "casual", "come as you are", and any weekday or clock time not in the schedule.

**Data from Google Places** (preview use, refresh rather than store, except Place ID): name, address, phone, regular hours
(**treated as office hours, never as service times**), primary type and types, website/Facebook URL, Maps URL, rating/review
count (ranking context only), photos (**preview only, never published**; many church photos on Google are congregation snapshots
with children in them, so the preview hero should prefer an exterior photo or a neutral stock placeholder).

**Must come from the church / organization:** schedule, tradition label, first-visit answers, kids info, ministries (tick defaults,
add their own), pastor name/title/photo/bio, beliefs text or link, giving and watch URLs, calendar URL, prayer-request routing,
facility policy, photos, history, and for nonprofits the assistance details, needed items, volunteer info, meeting schedule,
membership text, programs and nonprofit status.

### Sensitivities (read before building)

| Topic | Rule | Blocks publish? |
|---|---|---|
| **Doctrine, beliefs, affiliation** | AI never writes them. `beliefs` renders only owner text (verbatim, marked "In our own words" internally) or a link. `tradition_label` and `affiliation_text` are owner-confirmed. Name-based detection may only seed a *suggested* label ("Baptist church") for the owner to confirm. | Required: tradition label confirmed (or set to plain "Church"). Beliefs optional (hidden if empty). |
| **Pastor / leaders** | Owner-supplied name, title in their words (Pastor, Bro., Father, Minister, Elder), photo, bio. AI may not draft a bio. | Required if the pastor card is on (it's on by default; owner can turn it off). |
| **Service times** | Google hours are often office hours (22/47) or wrong (Sunday "Closed" at a Catholic parish; services "until 12:00 AM"). Schedule must be confirmed by the church. | **Required.** |
| **Photos of children** | Never use Google photos, stock or AI images showing identifiable children. Owner photos with children only if the church confirms it has parents' permission (`photo_consent.children = true`); even then no names or captions identifying minors. Default kids imagery: icons/illustration or empty classrooms. Never AI-generate "congregation" photos presented as theirs. | Any image flagged `contains_children` without consent blocks. |
| **Kids safety claims** | "Background-checked", "secure check-in", "nursery staffed by..." only from owner checkboxes. Never publish safety procedure details beyond the church's own wording. | Claim fields require confirmation. |
| **Giving** | Link to the church's own platform only; never our form, never a third-party fundraiser page we choose. Text-to-give number/keyword from owner. Church of Christ: Give off unless asked. | Giving URL confirmed if Give is on. |
| **Tax status** | Churches are generally tax-exempt without applying, but other groups vary: VFW/Legion posts are usually 501(c)(19), Masonic lodges (c)(10), Lions/Rotary clubs often (c)(4) with a separate (c)(3) foundation. So "tax-deductible", "501(c)(3)" and the EIN render only from confirmed `nonprofit_status` fields. Optionally link the IRS Tax Exempt Organization Search entry the org gives us. | Confirmation required for each claim. |
| **Politics** | No candidate, party, ballot or legislation content, and no stance on contested social issues, in AI copy or default sections. Owner text is reviewed by our team before publish; we can decline to host campaign material (product rule, regardless of how IRS guidance for churches evolves). | Owner review. |
| **Accessibility, Spanish, parking** | Only from owner checkboxes / text (5/197 and 9/197 mention them today). | Claim fields require confirmation. |
| **Prayer requests** | Sensitive (health, family, faith). Form says who reads it, sends to the church's email, and **should not be stored in our Inbox body** (forward and keep only a stub, or purge after 30 days; see section 9). Never published on the site. | Prayer form needs a confirmed destination email. |
| **Help eligibility (charities)** | "What to bring", "who can come", "no ID required" and limits are policies; owner text only, with a "last confirmed" date shown internally. | Required for the Get help block. |
| **Confidential locations** | Domestic-violence shelters, safe houses and recovery residences are never targeted and never get an address on a site. AA/NA meeting halls are excluded (anonymity). | Excluded at qualify. |
| **Church vs nonprofit** | Church: schedule + tradition label + pastor (or off) are the required set; no tax claims needed. Charity: mission line, assistance details (if Get help on), donate URL (if Donate on), nonprofit status (if any tax wording). Civic: meeting schedule and place, membership text (owner), parent org name (owner). Community center: rental contact and owner-set rates (or "call for rates"). | As listed. |

---

## 9. Data model

Core fields as in `00-shared-baseline.md` §8.2 (name, phone, address, `show_street_address` = **true** for church, charity and
community center; civic clubs that meet at a restaurant show the meeting place, never a member's home). Core `hours` holds
**office hours** and is rendered with the label "Office hours". Category extension `ext.church`:

| Field | Req | Source | Notes |
|---|---|---|---|
| `variant` | R | Sys → Own | `church · civic_post · charity · community_center` (section 10). |
| `tradition` | R (church) | Sys suggest → Own | `baptist · methodist · church_of_christ · pentecostal · catholic · episcopal_anglican · presbyterian · lutheran · nazarene_wesleyan · orthodox · cowboy · nondenominational · other`. Drives seeds and CTA defaults only. |
| `tradition_label` | R (church) | Own | Display words, e.g. "Missionary Baptist church", "Global Methodist church", "Church of Christ", or blank for plain "Church". |
| `affiliation_text` | O | Own | Exact wording of convention/association ties; rendered only as given. |
| `schedule[]` | R | Own (P as hint) | `{id, label, day, start, end?, audience?, language: en\|es, frequency: weekly\|nth_weekday\|monthly\|seasonal, nth?, months?, location_note?, live?: bool}`. Seeds by tradition, all marked unconfirmed until the church confirms. |
| `first_visit` | O | Own | `{parking_text, entrance_text, dress_text, length_text, music_text, kids_text, greeter_text, coffee_text, accessibility}`; each card renders only when set. |
| `kids` | O | Own | `{nursery: {offered, ages_text}, kids_church: {offered, ages_text}, youth: {offered, grades_text}, safety: {background_checks, check_in}}`. |
| `ministries[]` | R | Sys default → Own | `{id, label, audience, blurb?, meets_text?, contact?, enabled}`; 4-8 shown. Owner-confirm todo like retail `carry[]`. |
| `leaders[]` | O | Own | `{name, title, photo, bio}`; bio owner-only. Pastor card on by default with a placeholder todo. |
| `beliefs` | O | Own | `{mode: none\|text\|link, text, url}`; text verbatim. |
| `giving` | O | Own | `{url, provider?, label?, text_to_give?: {number, keyword}, mail_text?, in_person_text?}`. |
| `watch` | O | Own | `{live_url, live_text, sermons_url, podcast_url, app_links?: {ios, android}}`. |
| `events` | O | Own | `{calendar_url, items[]: {title, date, end_date?, text}}`; hidden after `end_date`. Seed labels: VBS, homecoming, revival / gospel meeting, singing, Trunk or Treat, Christmas program, Decoration Day. |
| `prayer` | O | Own | `{mode: off\|form\|email\|text, email, note}`. Form posts are forwarded and not retained in full (see below). |
| `newsletter_url`, `bulletin_url` | O | Own | Links. |
| `facility_use` | O | Own | `{offered, who: members\|community, kinds[] (weddings, funerals, showers, reunions, fellowship hall), contact, policy_text}`. |
| `cemetery` | O | Own | `{has, contact, decoration_day_text}` (common at rural north Alabama churches). |
| `spanish` | O | Own | `{services: bool, ministry_name?}`; with `schedule` lines tagged `es` it enables the Spanish page extra. |
| `photo_consent` | R | Own | `{children: false default}`; images carry `contains_children` set by the owner on upload. |
| `nonprofit_status` | O | Own | `{kind: church_exempt\|501c3\|501c19\|501c10\|501c4\|501c7\|other\|unknown, ein?, show_ein: false, deductible_ok: false, parent_org?}`. |
| `mission_text` | O | Own | Verbatim; AI intro used until supplied. |
| `assistance` | O (charity) | Own | `{services[] (food, clothing, hygiene, diapers, utility, meals, showers), schedule[], area_text, bring_text, frequency_text, appointment_text, other_help_text, last_confirmed}`. |
| `donate` | O | Own | `{url, items_needed_text, dropoff_text}`. |
| `volunteer` | O | Own | `{text, contact, signup_url, min_age_text}`. |
| `membership` | O (civic) | Own | `{eligibility_text, join_url, dues_text?, auxiliaries[] (Auxiliary, Sons of the American Legion, Riders, Ladies)}`. |
| `meetings` | R (civic) | Own | `{schedule[] e.g. 2nd Tuesday 6:30 PM, venue_name, venue_address, guests_welcome}`. |
| `programs[]` | O (civic) | Sys default → Own | Seeds per org kind (section 10). |
| `hall_rental` | O | Own | `{offered, capacity_text, amenities_text, rates_text?, contact}`. |

**Publish gate additions** (on top of the core gate): `schedule[]` confirmed (church, and `meetings` for civic); `tradition_label`
confirmed or blank; every claim field in the Sensitivities table confirmed before it renders; no image with `contains_children`
unless `photo_consent.children`; no Google photos; the copy checker passes the church phrase list; dated events past their date
are auto-hidden (never block).

**App changes this implies** (for the build, not decided here): `webPresence()` should treat parent-org and locator domains as no
real site (`legional.org`, `legion.org`, `vfw.org`, `elks.org`, `lionsclubs.org`, `rotary.org`, `churchofgod.org` church locator,
`local.churchofjesuschrist.org`, `jw.org`) and free builders (`e-clubhouse.org`, `keeq.io`, `churchcenter.com` home pages,
`wixsite.com`); spam-directory hosts like `topusaview.top` count as none. `isChain()` must not run its restaurant list on this
pack: "church's" (Church's Chicken), "goodwill" and "denny" would drop real congregations (e.g. a Goodwill Baptist church). The
core form endpoint `/f/<leadId>` stores posts in the Inbox: for prayer requests, forward to the church email (Resend) and keep
only name/time, or purge after 30 days. `scorePlace()` leans on review counts, which barely exist for churches; for this pack
weight "has hours", "has photos", "Facebook link" and "has phone" instead. 16 of 46 no-site Cullman churches have no phone on
Google, so `qualify()` drops them; they could go to the walk-in route / mail list instead (owner decision).

---

## 10. Variants

**Place types (verified against the Places API (New) type tables, Oct 2026).** Table A (filterable): `church`, `hindu_temple`,
`mosque`, `synagogue` (original), `buddhist_temple`, `shinto_shrine` (added in the Feb 12, 2026 release), `community_center`,
`event_venue`, `banquet_hall`, `cemetery`, `funeral_home`, `child_care_agency`, plus the Feb 2026 additions
`association_or_organization`, `non_profit_organization` and `service`. **`place_of_worship` is Table B**: returned in responses,
not usable as `includedType`. In practice 106 of the 120 worship listings in the Cullman run carry exactly `church,
place_of_worship, association_or_organization`. Fairview Methodist is typed only `association_or_organization`; **Cullman Masonic Lodge #421 is
typed `place_of_worship`**; some Legion posts are typed `bar`; Limestone County Churches Involved (a charity) is typed `church`.
So **names decide before types** for civic and charity, and types gate church.

**Assignment** (check in this order; first match wins):

| Order | Variant | Places types (primary or any) | Name keywords (case-insensitive, word match) |
|---|---|---|---|
| 0 | **exclude** | `school`, `primary_school`, `secondary_school`, `preschool`, `child_care_agency`, `cemetery`, `funeral_home`, `hospital`, `government_office`, `local_government_office`, `city_hall`, `tourist_attraction`; any `mosque`, `synagogue`, `hindu_temple`, `buddhist_temple`, `shinto_shrine` (other_worship: out of scope in v1, none found within the Cullman search radius) | abbey, monastery, convent, shrine, grotto, retreat center, family history center, kingdom hall, latter-day saints, school, academy, preschool, daycare, child care, camp, association (Baptist associations), diocese, conference, AA / alcoholics anonymous / narcotics anonymous / al-anon, shelter (DV), "safe house", recovery residence, **Church's Chicken** and any non-worship business on "Church St" |
| 1 | civic_post | any (incl. `bar`, `place_of_worship`, `event_venue`) | vfw, veterans of foreign wars, american legion, legion post, amvets, dav, disabled american veterans, lions club, rotary, kiwanis, civitan, ruritan, optimist club, exchange club, jaycees, masonic, "lodge no./#", f&am, eastern star, elks, moose lodge, knights of columbus, shriners, woodmen |
| 2 | charity | `non_profit_organization`; `association_or_organization` + name; `church` + name | food pantry, food bank, food distribution, pantry, soup kitchen, clothes/clothing closet, closet, blessing box, feeding, meals, caring center/place, helping hands, benevolence, crisis center, rescue mission, outreach center, ministry center, churches involved, "mission" (not "missionary") |
| 3 | community_center | `community_center` (and not a government website: county, city or town domain) | community center, civic center, community club, community house, fellowship hall (not AA) |
| 4 | church | `church`; or `place_of_worship`/`association_or_organization` + name | church, chapel, tabernacle, temple (with a church word or worship type), assembly, fellowship, ministries, parish, cathedral, congregation, worship center, revival center, house of prayer, cowboy church, iglesia, ministerio, templo, casa de oración |

**Tradition sub-label (church only, from the name; a suggestion the church confirms):**

| `tradition` | Name pattern | Seed label | Watch out |
|---|---|---|---|
| baptist | `baptist` | Keep their own words: "Missionary Baptist", "Free Will Baptist", "Primitive Baptist", "Independent Baptist", else "Baptist church" | Never infer convention membership (SBC or not). |
| methodist | `methodist`, `umc` | "Methodist church" | Many north Alabama UMC churches disaffiliated in 2022-23 (several now Global Methodist, some kept old names). Never print "United Methodist" unless the church confirms. |
| church_of_christ | `church(es)? of christ`, `coc` but **not** "United Church of Christ" (a different denomination; one is in Cullman) | "Church of Christ" | Often no "pastor" (ministers and elders); Give off by default; "Bible class", "gospel meeting". |
| pentecostal | `assembl(y\|ies) of god`, `church of god`, `pentecostal`, `apostolic`, `holiness`, `full gospel`, `foursquare`, `revival center`, `tabernacle` | Their own words ("Church of God", "Assembly of God") | "Church of God" bodies differ (Cleveland TN, of Prophecy, in Christ); use the name only. |
| catholic | `catholic`, `our lady`, `sacred heart`, `parish` (with catholic cue) | "Catholic church" | "Mass times" labels; parish office; the Diocese of Birmingham may have web rules: ask the pastor. Low priority. |
| episcopal_anglican | `episcopal`, `anglican` | "Episcopal church" / "Anglican church" | Diocese of Alabama hosts parish sites at `*.dioala.org`; skip those that have one. |
| presbyterian | `presbyterian`, `pca`, `epc`, `cumberland presbyterian` | Their words | Elders/session decide. |
| lutheran | `lutheran` | "Lutheran church" | |
| nazarene_wesleyan | `nazarene`, `wesleyan` | Their words | |
| orthodox | `orthodox` | "Orthodox church" | |
| cowboy | `cowboy church` | "Cowboy church" | Often meet in arenas/barns; casual is likely but still owner-confirmed. |
| nondenominational | none of the above | Plain "Church" | Never print "non-denominational" unless confirmed. |

Spanish-primary names (`iglesia`, `ministerio`, `templo`, `casa de oración`) set `spanish.services` as a suggestion; a fully
Spanish-first site needs the copy writer to run in Spanish (not built: flag for manual build or v2).

**Per variant:**

| Variant | Label | schema.org | Hero eyebrow | Primary CTA | Seed sections / defaults |
|---|---|---|---|---|---|
| church | "{tradition_label}" or "Church" | `Church` (`CatholicChurch` for confirmed Catholic); `PlaceOfWorship` fallback | "{Label} · {Town}" | Plan a visit (Mass times for Catholic) | Schedule seeds below; ministries: Sunday school / Bible classes, Kids, Students, Women, Men, Senior adults, Music / choir, Missions & outreach |
| civic_post | "Veterans' post", "Lions Club", "Masonic lodge"... from name | `NGO` (or `Organization`) with `location` Place; `nonprofitStatus` only if confirmed | "{Kind} · {Town}" | Visit a meeting / Join | Programs by kind: **veterans** (honor guard, funeral honors, Memorial and Veterans Day, flag retirement, scholarships, Boys/Girls State, Buddy Poppies, hall rental); **Lions** (eyeglass recycling, vision screening, scholarships, fundraisers); **Rotary/Kiwanis/Civitan/Ruritan** (scholarships, community projects, youth); **lodges** (charity work, open installations; no ritual content) |
| charity | "Food pantry", "Clothes closet", "Community ministry" | `NGO`; `nonprofitStatus` if confirmed | "{Kind} · {Town}" | Get help | Get help, How you can help (donate, items needed, volunteer), About, Events |
| community_center | "Community center" | `EventVenue` (a `CivicStructure`); `NGO` as operator if a board runs it | "Community center · {Area}" | Rent the hall | Rent the hall, Regular gatherings (singings, fish fries, reunions), About |

**Schedule seeds by tradition** (placeholders shown with "?" and a required todo until confirmed):
baptist: Sunday School 9:45, Morning Worship 11:00, Evening Worship 6:00, Wednesday Prayer & Bible Study 6:30 ·
methodist: Sunday School, Worship (traditional/contemporary only if confirmed), Wednesday supper/study ·
church_of_christ: Bible Class, Worship, Sunday Evening Worship, Wednesday Bible Class ·
pentecostal: Sunday Worship, Sunday Evening, Wednesday Night Service, Youth ·
catholic: Saturday Vigil Mass, Sunday Mass, Weekday Mass, Confession ·
nondenominational / cowboy: Sunday Service, Kids, Groups, Wednesday Night.
(Sample check: Cullman listings with service-style hours mostly show Sunday 9:30-12:00 and Wednesday 6:00-7:30 PM blocks;
First Baptist Cullman runs 8:00 and 10:30 worship with 9:15 Sunday school and a 5:00 PM Wednesday supper.)

**FAQ ideas** (only with backing fields): church: What time are services? Where do I park / which door? What should I wear?
What about my kids? Is there a nursery? Do you livestream? How long is the service? Can I rent the fellowship hall? Do you have
services in Spanish? · civic: When and where do you meet? Who can join? Can I rent the hall? Do you do funeral honors? ·
charity: When is the pantry open? Who can come? What should I bring? How often can I come? How can I donate food? Can my group
volunteer? · community center: How do I rent the hall? How many people does it hold? Is there a kitchen?

**Google Places text-search terms** (each run as "{term} in {town}, AL"; Text Search caps at 60 results per query, and "church"
alone hit the cap in Cullman, Hartselle, Jasper, Guntersville and Athens, so run per town: Cullman, Hanceville, Vinemont, Good
Hope, Holly Pond, Fairview, Baileyton, Berlin, Eva, Joppa, Garden City, Dodge City, Crane Hill, Logan, Addison, plus the
existing nearby towns):
- church: `church`, `baptist church`, `church of christ`, `church of god`, `non-denominational church` (Cullman run: 60 / 40 /
  20 / 13 / 53 results; `methodist church` 6, `pentecostal church` 6, `catholic church` 1, so the narrow terms add little).
- civic_post: `VFW post`, `American Legion post`, `Lions Club`, `Masonic lodge`, `Ruritan club` (around Cullman only a handful
  exist: VFW, Legion Post 4, Hanceville Lions, two Masonic lodges, Elks 1609, Knights of Columbus).
- charity: `food pantry`, `food bank`, `clothes closet`, `ministry center`, `nonprofit organization` (Cullman: 12 pantry results;
  several are Google's auto-listings named "{Church} - Food Distribution Center": merge them into the parent church lead as a
  ministry instead of a separate lead).
- community_center: `community center`, `civic center`, `community club` (Cullman: 11 rural centers such as Berlin, Walter, Gold
  Ridge, Kelley, Simcoe; several are county-run, excluded when the website is a county or town domain).

**What not to target:** churches and multi-site congregations that already run good sites (Daystar, Temple Baptist, Liberty,
Connect, Friendship, Church of the Highlands; also skip them in the "outdated websites" scan with a `MULTI_SITE` list),
centrally managed sites (LDS meetinghouses, Kingdom Halls, Episcopal `dioala.org` parishes), monasteries, abbeys, shrines and
the Ave Maria Grotto, Baptist associations (they're referral partners, section 14), schools, preschools and daycares (different
conventions and child data), government senior centers, DHR and parks offices, United Way and regional agencies with sites
(Community Action Partnership), hospitals and clinics, AA/NA halls, shelters and any confidential-location service, cemeteries
and funeral homes, and other_worship (mosques, synagogues, temples) until researched separately.

**Default looks:** church traditional (Catholic, Episcopal, Lutheran, Presbyterian, downtown "First {X}" churches, founded before
1950) → A; rural Baptist, Methodist, Church of Christ, Church of God chapels → B; non-denominational, Pentecostal/AoG, cowboy and
newer congregations → C; civic_post, charity, community_center → D (pantry accent variant for charity).

---

## 11. Design looks

Four looks, distinct from the other categories' looks. All text/button pairs below were checked: body text ≥ 11.7:1 on every
background and band, CTA white text ≥ 6.3:1. **No clip-art crosses, doves, praying hands or flag graphics**; the sense of place
comes from type, color, the church's own building photo and quiet architectural motifs (an arched window mask, a rule like a
hymnal page). Neighbor rule: two churches within ~5 miles never share a look and accent (country churches sit a mile apart and
their members compare).

### Look A: "Hymnal"
- **Mood:** stately, traditional, quietly confident. Downtown brick churches, Catholic and mainline parishes, "First {X}" churches.
- **Palette:** limestone `#F5F2EA` bg, ink `#22252B` text (13.7:1), hymnal navy `#1E3A5C` headings and CTA (white text 11.6:1),
  sandstone band `#E8E0D2` (text 11.7:1), gold leaf `#B8964E` decorative rules only. Variant 2: oxblood `#7A2E2E` CTA (9.3:1).
- **Type and layout:** *Crimson Pro* (headings, generous size) + *Source Sans 3* (body; tabular numerals for times).
  `hero_style: split` with `photo_mask: arch` on the building photo, `divider: rule`, `badge_style: seal` for "Since 1884",
  `card_style: ruled`, `section_spacing: airy`. Schedule set like a printed order of worship.

### Look B: "Country Chapel"
- **Mood:** warm, homey, white clapboard and a red front door. Rural Baptist, Methodist, Church of Christ and Church of God chapels.
- **Palette:** warm white `#FFFDF8` bg, text `#2A2522` (14.9:1), chapel-door red `#8C2F39` CTA (8.1:1), pine `#2F4F3A` headings
  (9.0:1), cream band `#F3EADB` (text 12.7:1). Variant 2: lake blue `#2F5D7C` CTA (7.1:1).
- **Type and layout:** *Lora* (headings) + *Nunito Sans* (body). `hero_style: full_bleed_light` with the church photo under a light
  scrim, `card_style: bordered`, `divider: thick_rule`, `button_shape: rounded`, Wednesday supper and homecoming as a soft
  "bulletin board" card.

### Look C: "Open Doors"
- **Mood:** modern, young, energetic but not slick. Non-denominational, Pentecostal/AoG, cowboy churches and church plants.
- **Palette:** warm white `#FCFBF8` bg, near-black `#18181B` text (17.1:1), deep teal `#0E5C63` CTA (7.7:1), mist band `#EEF2F1`
  (15.7:1), night hero `#1E2430` with `#F5F3EE` text (14.0:1) and sunrise `#F2B544` accents on dark only (8.5:1). Variant 2: plum
  `#6D3B8C` CTA (7.9:1).
- **Type and layout:** *Plus Jakarta Sans* (bold headings) + *Inter* (body). `hero_style: full_bleed_dark`, `button_shape: pill`,
  `card_style: shadow`, `divider: none`, big "Next service" chip, Watch live as a prominent secondary button.

### Look D: "Meeting Hall"
- **Mood:** sturdy, civic, dependable. VFW/Legion posts, Lions and Ruritan clubs, food pantries, community centers.
- **Palette:** off-white `#F7F6F2` bg, slate text `#1F2933` (13.6:1), navy `#1D3557` header/footer and CTA (white 12.4:1),
  steel band `#E6E9EE` (12.1:1), brick `#E07A5F` decorative on navy only (large text 4.2:1). Pantry variant: harvest green `#2F6B3B`
  CTA (6.4:1) with wheat band `#F1E6CC` (11.9:1).
- **Type and layout:** *Zilla Slab* (headings) + *Public Sans* (body). `hero_style: boxed`, `card_style: ruled`, `badge_style: stamp`
  ("Post 1234", "Chartered 1946"), `divider: stripe_band`, `section_spacing: dense`, meeting schedule as a bold ruled table,
  "Get help" hours in a high-contrast box.

---

## 12. Local SEO

**Schema.org** (one primary node per the baseline): `Church` (a `PlaceOfWorship` → `CivicStructure` → `Place`) with `name`,
`address` (street shown), `geo`, `hasMap`, `telephone`, `url`, `sameAs` (Facebook, YouTube, Instagram), `openingHoursSpecification`
for **office hours only**, and service times as `event` items of type `Event` with `eventSchedule` (`Schedule`: `byDay`,
`startTime`, `endTime`, `repeatFrequency: P1W`, `scheduleTimezone: America/Chicago`) and `location` pointing back to the church.
`CatholicChurch` for confirmed Catholic parishes. Charity and civic: `NGO` with `address`, `areaServed` (owner text),
`nonprofitStatus` (`Nonprofit501c3`, `Nonprofit501c19`...) **only when confirmed**, `parentOrganization` (owner), meetings as
`Event` + `eventSchedule`. Community center: `EventVenue`. Never `AggregateRating`; never `Offer`. Sampled sites: `Church` 2/197,
one invalid `ReligiousOrganization`, otherwise generic `WebSite`/`LocalBusiness` (25/197) or nothing.

**Titles** (≤ 60 chars; drop the label when the name already says it):
- church: `{Name} | {Label} in {City}, {ST}` → e.g. `Mt. Zion Baptist Church | Cullman, AL | Sundays 11 AM` when the name
  contains "Church" (the main Sunday time is a strong click reason; rebuilt whenever the schedule changes)
- civic_post: `{Name} | {Kind} in {City}, {ST}` (e.g. "American Legion Post 4 | Veterans' Post in Cullman, AL")
- charity: `{Name} | Food Pantry in {City}, {ST}`
- community_center: `{Name} | Community Center & Hall Rental | {Area}, {ST}` (Hall rental only if offered)

**Meta description** (≤ 155): kind + town + the main times + one welcome hook, e.g. pattern
`{Name} in {City}: Sunday School 9:45, Worship 11:00, Wednesday 6:30 PM. Plan your first visit, find directions or watch online.`
Charity: `{Name} serves {area} with a food pantry open {days}. Find hours, what to bring, and how to donate or volunteer.`

**Notes:** exactly one H1 = the name (no H1 on 56/197, several on 58/197; Cultivate Athens has a dozen). Service names, "{Town}",
ministry names ("youth group", "kids church", "VBS", "Wednesday night supper") appear as visible text because those are the
phrases people search ("churches in Cullman AL", "baptist church near me", "church with nursery", "food pantry Cullman", "VFW
hall rental"). NAP must match the Google profile. **Google hours are where most church mismatches start**: the GBP tune-up
checklist should ask the church to decide whether its Google hours show office hours or service times and to label service times
in the profile description and posts (how Google's "more hours" options apply to churches should be checked when we build;
uncertain). Encourage weekly Google posts for events (the step-1 GBP tools draft them; keep them free of doctrine and politics).

---

## 13. Anti-patterns

1. **No clear service times.** 62/197 home pages have no service wording with a clock time. Others bury it: First Baptist Cullman
   repeats its schedule block three times and still shows a July event in October; others post the week as a flyer image or PDF.
2. **Trusting Google hours.** 22 of 47 Cullman church listings show office hours, 2 say "Open 24 hours", two end Sunday services at
   "12:00 AM", and a Catholic parish lists Sunday as Closed. Service times come from the church; Google hours are labeled office
   hours, and there is no open-now status.
3. **Dead, hijacked and hacked domains.** baldwinchurch.com and mpmchurch.com are suspended; mtolivebbf.com (Mount Olive, Cullman)
   now shows a design agency's page; Harvest Temple's Google listing points to a spam directory; Center Grove Baptist's page
   carries injected links to an offshore casino; six more Google-listed church domains return 404. Usually a domain registered by a
   former member or pastor that lapsed. We host on Cloudflare Pages, register the domain in the church's name and remind before renewal.
4. **Template residue.** Temple Baptist's two campus pages carry 20 "Slide title" headings; Tunsel Road shows "First Item / Second
   Item"; East Point Cumberland Presbyterian has "Create Your Own Website With Webador" as an H3.
5. **Thin or heavy pages.** 128/197 under 300 words, 13 under 50; 26/197 over 500 KB of HTML and 8 over 1 MB (mostly Wix).
6. **Heading chaos:** no H1 on 56/197, several on 58/197 ("Loving God / Loving Others / Serving Both" as three H1s).
7. **Dead phone numbers:** `tel:` on only 71/197; about 69 show a number as plain text. One pantry lists a 255 area code (north
   Alabama is 256): every phone renders from the one confirmed record.
8. **Abandonment signals:** "© 2018" (New Brashiers Chapel), "© 2019" (Life Gate), "© 2020" (Redeeming Grace), past events
   left up. Dated items auto-hide; the footer year comes from the build.
9. **Wrong congregation on the page.** Victorious Faith (Cullman) links to a site whose only address and directions are for its
   Kentucky location. A multi-location church's page must show the local schedule and address first.
10. **Doctrine boilerplate and generic copy.** One sampled site's home page opens with a long, generic creed-style "We believe..."
    block in a voice that reads machine-written. Beliefs are the church's words or nothing.
11. **Political content on the home page.** Athens Worship Center leads its "Latest posts" with a political opinion piece. We keep
    politics out of default sections and AI copy.
12. **"Give" without a way to give, or the wrong way.** "Give" wording on 141/197, an actual provider link on 55/197; a Church of
    Christ page pushing online giving would be out of step (1/26 have it). Link to the church's own platform or show nothing.
13. **Logins and mega menus on the front page.** Bethel Baptist shows a member login form; Legion Post 237 has 60+ menu items
    including officer duties and bylaws; VFW 2702 lists "WebMail" and "Site Admin". Members' business stays off the public site.
14. **Widgets and embeds:** reCAPTCHA (46), YouTube embeds (15), Google Calendar iframes (5), Facebook page plugins, cookie walls.
    Links and click-to-load instead.
15. **Children's photos and prayer requests in public** (an AI and template risk; not counted in the sample): no identifiable
    children without consent, and prayer requests never published or kept longer than needed.

---

## 14. Selling to churches

**Who decides.** Small churches rarely let one person spend monthly money. Baptist: the pastor recommends, deacons or a finance
committee review, and the church votes in a business meeting (often monthly or quarterly). Methodist (UMC or Global Methodist):
church council / administrative board. Church of Christ: the elders (the minister often has no budget authority). Presbyterian:
the session. Catholic: the pastor (priest) with the parish office manager, and possibly diocesan web rules. Pentecostal and
non-denominational: the pastor usually decides, sometimes with a board. Many small-church pastors are bi-vocational, so the real
day-to-day contact is the church secretary, a deacon or whoever runs the Facebook page. Civic posts: the commander or president
brings it to the monthly meeting for a vote; the treasurer pays. Pantries run by a church sell through the church.

**Best times to visit or call.** Weekday office hours, Tuesday to Thursday mornings (sample listings show offices closed Monday or
Friday, or Friday half-days). Never Sunday, never during a service, and avoid Wednesday afternoons (supper and service prep).
Many rural churches have no office: call the listed number, leave one message, and drop a printed preview flyer at the church
office or mail it to the pastor. Fall is budget season (October to December), so a proposal left now can land in next year's
budget. Leave a one-page printout the pastor can carry to the deacons' or business meeting (the preview flyer plus price).
Civic posts: the monthly meeting night, by calling the commander first.

**Objections specific to churches (and short answers).**
- *"We can't afford a monthly bill."* Compare to what they spend on bulletins or a Facebook boost; offer yearly prepay (fits an
  annual budget line) and show that updates are included, so nobody has to learn a builder.
- *"A member does our Facebook."* Keep doing it: the site links to Facebook for news, and the site holds what Facebook buries
  (times, directions, what to expect, kids). Visitors search Google, not Facebook.
- *"Our volunteer webmaster (or the pastor's nephew) built one."* Common, and the cause of section 13's suspended and hijacked
  domains. We keep it running when that person moves on, and the domain is in the church's name.
- *"We need to take it to the deacons / the church."* Expected: leave the printout and the preview link, book a callback after
  their meeting date.
- *"We already have an app / Church Center / Subsplash."* Fine: we link it. An app serves members; a site serves the first-time
  visitor who searches "church near me".
- *"Will you put our beliefs on it?"* Only their own words, exactly as they give them; we never write doctrine.
- *"Is this tax-deductible / do you give a church discount?"* Our fees aren't a donation; a ministry rate is the owner's call (below).
- *"People find us by word of mouth."* Newcomers to town and young families check online first; the site makes that first visit easier.

**Do small churches pay monthly?** Yes, the ones with sites mostly do, through builders or church platforms. Prices seen on vendor
pages in October 2026:

| Service | Price | Notes |
|---|---|---|
| Tithe.ly Sites | $19/mo website alone; $119/mo "All Access" (giving, app, ChMS, site) | DIY. Giving itself is free + 2.9% + $0.30 per card gift. |
| Nucleus | $65 / $99 / $199 per mo | DIY; giving and media in the top tier. |
| Ekklesia360 | $70 / $95 / $190 per mo + $500 theme setup | DIY with onboarding. |
| Church Plant Media | $59/mo + $499 setup (website); $53/mo + $449 in a bundle | Done-with-you. |
| ReachRight Studios | $97/mo, $2,000 setup waived with a 12-month commitment | Done-for-you; sells SEO ($297/mo) and Google Ad Grant management ($397/mo) on top. |
| Clover Sites (now Ministry Brands) | not published (demo only) | Uncertain. |
| Faithlife Sites | not confirmed; Faithlife exited its church-management suite (Equip) in 2022 | Uncertain whether Sites is still sold. |
| Squarespace / Wix | Squarespace $19-25/mo personal, $29-39/mo business | DIY; what volunteer-built sites usually run on. |
| Free options | Facebook, Google Sites (11/197), Planning Center Church Center pages (3/197 as the whole site), Subsplash Giving ($0/mo) | The real competitor for the smallest churches. |

So **done-for-you church sites run about $59-$199/mo with $449-$2,000 setup fees, and DIY platforms $19-$70/mo.** Our Basic $49
with no setup fee on a 6- or 12-month plan already undercuts every done-for-you option, and yearly prepay (12 months for the price
of 10, about $490) matches how church treasurers budget. The no-site churches here are small (median 5 Google reviews), so the
owner may want a **ministry rate** for churches and nonprofits (for example Basic at $39/mo on a yearly or 12-month plan), and
should expect **payment by check or invoice** from a treasurer more often than a card in Stripe Checkout, and a 2-6 week decision
cycle while it goes to a meeting. Plus ($89) fits churches that want weekly changes (events, sermon links). Pro features aimed at
businesses (review cards, table tents) mostly don't apply; the Spanish page and photo gallery extras do.

**Partners and leverage.** The East and West Cullman Baptist Associations (both on Google; East has a site, West has none) know
every member church; a referral arrangement or a sponsored "church directory" could open dozens of doors. Google Ad Grants ($10,000/mo in free
search ads for eligible nonprofits; vendors claim most churches qualify) could become a future extra, but eligibility for churches
should be checked against Google for Nonprofits rules before offering it (uncertain).
