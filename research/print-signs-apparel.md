# Category blueprint: Print, sign and custom apparel shops

Researched October 2026 for the Cullman, AL market. One template covers four kinds of small independent shop that often
overlap under one roof: **screen printing / custom apparel** (incl. DTG, DTF, heat press), **embroidery** (logo wear,
hats, monograms), **sign & banner shops** (banners, yard signs, vehicle/trailer lettering, window graphics, storefront
signs) and **print shops** (business cards, flyers, brochures, letterhead, forms, posters). The reference lead is Creative
Design & Screen Printing in Hanceville (flyers and brochures, letterhead and business cards, posters, banners, cargo
trailer lettering, commercial graphics, screen-printed shirts). Its listed website, cdsprinting.net, returns 404.

**Method.** I found candidates with organic searches ("screen printing <city>", "sign shop <city>", "print shop <city>",
"custom embroidery <city>"), Expertise.com city lists (Nashville, Atlanta, Austin, Memphis) and an Alabama screen-printer
ranking. I left out BBB, Yelp, Thumbtack and similar directories as results. Cities: Cullman, Huntsville, Birmingham, Mobile,
Montgomery, Boaz and Florence (AL); Nashville, Murfreesboro, Mt. Juliet, Lebanon, Franklin, Knoxville, Chattanooga,
Johnson City and Memphis (TN); Atlanta metro, Carrollton, Loganville, Conyers, Monroe and Athens (GA); Hattiesburg,
Pascagoula, Gulfport and Southaven (MS); Austin (TX); plus 3 regional and 5 chain sites, which I used for feature ideas only.
I downloaded each home page with a phone user agent and scripted counts of `tel:`/`sms:`/`mailto:` links, forms, file
inputs, H1s, schema types, scripts and keywords. For 62 sites I also downloaded the first "Quote/Estimate" (or Contact) page,
to check form fields and file uploads. I read 8 sites in detail (Hub City Signs First, Classic Printing & Signs,
Chattanooga T-Shirt quote form, Smiles and Signs, Ginny's, Goodgames, CSG/Cullman print shop, Chomp Shop headings).
I also ran 6 Places API text searches around Cullman, only to see which `types` and name patterns these shops get.

**Bases.** **N = 73** home pages analyzed (65 independent, 3 regional, 5 chains). Primary line: 29 screen printing,
8 embroidery, 18 signs, 18 print. **N = 60** have 300+ words of server-rendered text and are used for keyword counts. Group
counts overlap because 20 shops sell more than one line: apparel (screen print or embroidery) 31/60, signs 22/60, print
18/60. Counts cover home pages only unless stated, so they are lower bounds. Keyword counts are pattern matches (±2).

---

## 1. Summary

- **The conversion is a quote request, and the form is the product.** "Free quote / request a quote" appears on 37/60
  home pages, and 41/73 have a Quote or Estimate link. Prices are rare: a `$` amount appears on 14/60 home pages, and a
  "from $X" price on only 5/60. The primary CTA is **Get a quote**. Call is the secondary.
- **Artwork intake is the category's special problem.** 19/73 sites accept a file upload (on the home page or the quote
  page). The best form in the sample (Chattanooga T-Shirt) has upload slots for front art, back art and a size sheet. Our
  forms post to our own endpoint and **cannot take files**, so artwork goes by email or text.
  Only 1/73 offers an `sms:` link, and only 1 quote page says "email us your art". A **"Text us a photo"** button (logo,
  sign spot, truck, trailer) plus "Email your artwork to …" with a reference code is a real edge over these sites, and it
  works better on a phone than upload fields do.
- **Customers buy for a group or an event.** Schools, churches, teams, fundraisers and reunions appear on 35/60 pages.
  Business uniforms and workwear appear on 16/31 apparel pages. A "Who we work with" strip and a **"Needed by" date** field
  (deadline wording on 9/60 home pages and 11/62 quote pages) match how people actually buy.
- **Owners hide the numbers that matter most.** Turnaround is mentioned on 30/60 pages, but usually as "fast turnaround"
  with no time. Minimums are stated on only 7/60, "no minimums" on 5/60, and setup/screen/digitizing fees on 10/31 apparel
  pages. These are owner-only fields. **The AI never writes a turnaround, minimum, price or fee.**
- **The gallery sells the job.** A portfolio or "our work" section appears on 26/60 pages (14/22 sign shops) and named
  clients on 27/60. Sign shops show finished trucks and storefronts. Apparel shops show shirts on real people. Our template
  needs a strong owner-photo gallery, sorted by line, and must never use Google photos on published sites.
- **Each line has its own vocabulary.** Sign shops talk about installation (12/22), vehicle wraps and lettering (16/22),
  window graphics (16/22) and channel letters or monument signs (9/22). Print shops talk about business cards (14/18),
  flyers and brochures (14/18) and letterhead (11/18). Apparel shops talk about embroidery (24/31), hats (21/31) and DTG/DTF
  (14/31). That is why we use **4 variants** with one template and a `lines[]` list for shops that sell several.
- **Weak sites fail on basics.** 27/73 have no `tel:` link. 19/73 have several H1s (up to 9), and 8/73 have none. 13/73 have
  under 300 words of text. 9/73 ship 500 KB+ of HTML, and 4 of them ship over 1 MB. One ranked screen-printer domain now
  serves slot-machine spam. The reference lead's own site is dead.

---

## 2. Sample

Var: **SP** screen printing/apparel, **EM** embroidery, **SG** signs, **PR** print shop (main line first). Type is Ind
unless noted. All 73 rows were downloaded directly.

| # | Business | City | URL | Var | Why it's useful |
|---|---|---|---|---|---|
| 1 | CSG Print Shop (Cullman Creative Marketing) | Cullman, AL | csgprintshop.com | PR+SG+SP | Local rival; one page per line; it also sells websites |
| 2 | Green Pea Press | Huntsville, AL | greenpeapress.com | SP | Community print shop, campaigns, live printing; 8 H1s |
| 3 | Elite Embroidery & Screenprint | Huntsville, AL | elitehsv.com | SP+EM | Clear services → testimonials → quote → FAQ order |
| 4 | Alabama Sign Co. | Huntsville, AL | alsignco.com | SG | Signs + apparel + engraving; 4-step process; FAQ |
| 5 | Blue Orbit Sign Studio | Huntsville, AL | huntsvillesignsandgraphics.com | SG | Very thorough; 700 KB page; FAQ schema |
| 6 | Classic Printing & Signs | Birmingham, AL | classicprintingandsigns.com | PR+SG | "From $" cards, turnaround by product, 3-step order, in-house vs partner |
| 8 | Dixie Designs | Boaz, AL | dixiedesigns.com | SP | Big team-wear shop; no tel link |
| 10 | JNJ Apparel | Northport, AL | jnjapparel.net | SP | Campus/Greek focus, Shopify |
| 11 | Print King | Mobile, AL | print-king.net | PR+SG | Copy/print/bind + signs; FAQ schema; no H1 |
| 12 | High 5 Printing | Mobile, AL | h5printing.com | SP+SG | Wide range; 1.8 MB page |
| 14 | Lewis Signs & Decals | Florence, AL | lewissigns.net | SG+PR | Family-owned; hours schema; 216 words |
| 15 | Presto Embroidery | Birmingham, AL | prestoembroidery.com | EM | Digitizing, rush, quote page |
| 16 | Art By Thread | Hoover, AL | artbythread.com | EM | "No minimum" embroidery + digitizing |
| 17 | Chomp Shop | Nashville, TN | chomp-shop.com | SP+EM | Owner story, "who we work with", how it works |
| 19 | Sportswear Promotions | Mt. Juliet, TN | sportswearpromotionsinc.com | SP+EM | Team stores, upload wording |
| 20 | Belle Mar Ink & Thread | Murfreesboro, TN | bellemar.com | EM+SP | Rush + turnaround, LocalBusiness schema |
| 21 | Wildfire Merch | Nashville, TN | wildfiremerch.com | SP | Water-based ink niche |
| 23 | Friendly Arctic | Nashville, TN | friendlyarctic.com | SP | Ink-technique menu, posters |
| 24 | Arena Imprints | Nashville, TN | arenaimprints.com | SP+PR | Rush, proofs, design, clients |
| 25 | Twine Graphics | Franklin, TN | twinegraphics.com | SP+EM | Upload on quote; 9 H1s; 1.3 MB |
| 26 | Advocate Marketing & Print | Nashville, TN | advocateprinting.net | PR | Cards/letterhead/install; no tel |
| 27 | Midtown Printing | Nashville, TN | midtownprinting.com | PR | Letterpress niche, upload form |
| 28 | The Printer's Press | Nashville, TN | printerspress.com | PR | "Neighborhood print shop", estimate page, policies |
| 29 | The Print Authority | Brentwood, TN | theprintauthority.com | PR | Upload on quote |
| 30 | Smiles and Signs | Murfreesboro, TN | smilesandsigns.com | SG | Woman-owned, rush-fee note, 12-item grid |
| 31 | 12 Point SignWorks | Murfreesboro, TN | 12pointsignworks.com | SG | Fleet wraps, quote with upload |
| 32 | Impact Banners & Signs | Nashville, TN | impactbannersandsigns.com | SG | Banner specialist |
| 33 | Oak & Twine | McDonald, TN | oakandtwine.com | EM+SP | Request-quote page with upload |
| 34 | Chattanooga T-Shirt Co. | Chattanooga, TN | chattanoogatshirt.com | SP | Best quote form; "nothing prints until you approve" |
| 35 | InView Graphics & Signs | Chattanooga, TN | inviewgraphics.com | SG+PR | Wraps + print; self-serving AggregateRating |
| 36 | Knoxville Custom T-Shirts | Knoxville, TN | knoxvillecustomtshirts.com | SP | Minimums stated; upload form |
| 37 | The Sign Factory | Johnson City, TN | thesignfactory.org | SG | "Since 1990" sign shop; no tel link |
| 38 | Paulsen Printing | Memphis, TN | paulsenprinting.com | PR | Mailing, web-to-print, upload quote |
| 39 | Ditto Graphics | Memphis, TN | dittographics.com | PR | Small, fast, quote form |
| 40 | LSI Graphics | Bartlett, TN | lsigraphics.com | SG | Fleet + install, FAQ |
| 41 | DocuMart | Collierville, TN | documart.biz | PR | Quote + upload wording |
| 44 | Danger Press | Atlanta, GA | dangerpress.com | SP | Process education, client features, stats |
| 45 | Go Print Plus | Carrollton, GA | goprintplus.com | PR+SP+EM | Mixed lines; 12-pc embroidery minimum stated |
| 46 | Custom Embroidery LLC | Conyers, GA | customembroideryllc.com | EM | Family-owned, garment categories |
| 47 | Ginny's Custom Embroidery | Monroe, GA | ginnyscustomembroidery.com | EM | Quantity tiers on form, 25 MB upload |
| 49 | Scotteez | Loganville, GA | scotteez.com | SP+EM | Two locations, spirit wear |
| 50 | The Sign Brothers | Athens, GA | thesignbros.com | SG | Install + portfolio; 6 H1s |
| 51 | Atlanta AdGraphics | Lawrenceville, GA | atlantaadgraphics.com | PR+SG | Upload form; 6 H1s |
| 52 | Hub City Signs First | Hattiesburg, MS | hubcitysignsfirst.com | SG | Talk → design → make; "what we need for an estimate" FAQ |
| 53 | Speedy Printing & Signs | Hattiesburg, MS | speedyprintingandsigns.com | PR+SG | Since 1972; no H1 |
| 54 | Munn Enterprises | Hattiesburg, MS | munnenterprises.com | SG | Fabricated signs/awnings |
| 55 | Goodgames | Pascagoula, MS | goodgames.com | PR | 13-question FAQ, political packages |
| 56 | Plan House Printing | Tupelo/Hattiesburg, MS | planhouseprinting.com | PR+SG (Reg) | Print + signs + blueprints |
| 59 | 1-Day Signs | Oxford, MS | 1daysigns.com | SG | Speed is the brand; "$" prices |
| 60 | ShieldCo Art | Huntsville-area (ships) | shieldcoart.com | SG | Metal signs; strong FAQ/process |
| 61 | Oh Boy! Print Shop | Austin, TX | ohboyprintshop.com | SP | Get-a-quote flow, upload |
| 62 | Rural Rooster | Austin, TX | ruralrooster.com | SP | Order page with upload |
| 65 | Huntsvillustrated | Huntsville, AL | huntsvillustrated.com | SP | Shopify quote page; the only `sms:` link |
| 66 | Dailey Grace | Nashville, TN | daileygrace.org | EM+SP | Free digitizing, pickup |
| 67 | Anthem Branding | Boulder, CO | anthembranding.com | SP (Reg) | 3.5k words; no tel |
| 68 | Culture Studio | Chicago, IL | culturestudio.net | SP (Reg) | 7 forms; enterprise quoting |
| 69-73 | Custom Ink, Big Frog, SpeedPro, Minuteman Press, AlphaGraphics | national | customink.com etc. | Chain | Ideas only: design tools, "no minimum", consult forms |

Also analyzed (row numbers kept; mostly anti-pattern evidence): 7 bhamsigns.com, Irondale AL (Wix, 972 KB, 181 words);
9 goakd.com, Montgomery AL (922 KB, 197 words); 13 shortstop.biz, Brownsboro AL (3 H1s); 18 maryink.com, Nashville (121
words); 22 southeastimpressions.com, Lebanon TN (no tel, no H1); 42 shanersprinting.com, Memphis (54 words);
43 shirtshanty.com, Smyrna GA (916 KB, 8 H1s); 48 mariettaembroidery.com, GA; 57 signsandstuff.biz, Southaven MS and
58 allsignsgulfport.com, Gulfport MS (no tel link); 63 underpressuresp.com (159 words), 64 texastees.com (1.3 MB), Austin.

Excluded or unreachable: isscreenprinters.com (domain now spam), oxfordprinting.com (unrelated online printer), Branded
Imprints, Gable Sporting Goods (retail store); blocked by a bot check or failed to connect: Tiger Town Apparel, Hip Hues,
Real Thread, FastSigns, Signarama, Vivid Customs, Tee Town, Southern Threadworks, Screen Art, Bacon & Co., FastWrapz,
Trav-Ad, Dixie Signs.

---

## 3. Pages

Link labels on home pages (N = 73): Contact 58, About 55, Quote/Estimate 41, Services 36, Shop/Store 34 (mostly blank-garment
catalogs or team stores), Privacy/Terms 35, Promo products 26, Design 25, Embroidery 25, Screen printing 24, Blog 23,
Login/Account 23, Banners 22, Gallery/Portfolio 21, FAQ 20, Reviews 18, Artwork/upload/file guide 16, Vehicle/wraps 15,
Careers 12, Yard signs 10, Business cards 9, Pricing 6, Team store 4.

**Recommended page set**

Required: **Home** (long, anchored); **Services** (one page with a section per line in `lines[]` and an anchor per service);
**Get a quote** (form + call + text + email-your-art box + what happens next); **Our work** (gallery, filter chips by
line); **About** (shop, owner, equipment in-house, years); **Privacy**.

Optional: **Artwork guide** (accepted files, "no art? we'll design it", how to send a photo; becomes a page when it runs
long); **FAQ** page at 8+ questions; **Team & fundraiser orders** (SP/EM) linking to an online store if the shop has one;
**Vehicle & trailer graphics** page (SG) when the owner has 4+ vehicle photos; **Policies** (proof approval, deposits,
customer-supplied garments) only from owner text.

One real page per line is fine. **No per-town or per-product doorway pages.** Several sign companies in the region run
dozens of thin town pages.

---

## 4. Home page section order

Median home page: about 920 words (N = 60). Default order (all variants):

1. **Header**: name/logo, tap-to-call, **Get a quote** button. On phones: hamburger + call icon.
2. **Hero**: what + town headline ("Screen printing & custom shirts in Hanceville" style, our own wording), a line naming
   the top 2-3 lines, buttons **Get a quote** / **Call**, and a text link **"Text us a photo of your logo"**.
3. **What we make**: 6 service cards from `services[]`, grouped by line when there are several lines.
4. **Our work**: 6-9 owner photos with captions (client name only with permission). This is the strongest proof here.
5. **How ordering works**: 3 steps (tell us / send art → proof and price → print, then pick up, ship or install).
   Seen on 13/60 pages, and on nearly every strong one.
6. **Who we work with**: chips for schools, churches, teams, businesses, contractors, real estate, events, reunions.
7. **Artwork help**: "Have a file? Email it. Have a napkin sketch or old shirt? Text a photo. No art? We design it" (the
   design part only if `design_help.offered`), plus accepted file types if the owner lists them.
8. **Reviews**: 2-3 owner-supplied testimonials + "Read our Google reviews".
9. **About the shop**: owner, years, in-house equipment, local roots.
10. **Visit / pickup / hours**: address (storefronts), hours, pickup, shipping and install area.
11. **FAQ**: 5-8 questions.
12. **Final CTA band** and **footer** (NAP, hours, lines, social links, review link, privacy).

**Variant tweaks.** *Signs*: Our work moves to slot 3, ahead of services. Add an "Install area" line to slot 10. The
text-a-photo prompt becomes "Text a photo of the wall, window, truck or trailer". *Print shop*: Visit/hours moves up to
slot 6 (walk-in counter), and service cards show sizes ("Business cards · 3.5×2") without prices unless the owner gives
them. *Embroidery*: add a short "Logo digitizing" explainer in slot 7, and lead with polos, hats and jackets. *Screen
printing*: "Who we work with" moves to slot 4. Add an online-store card in slot 6 if `online_store_url` is set.

**Above the fold on a phone (≈ 360×740):** name and call icon; headline with the town; one trust line (since YEAR · local ·
in-house); full-width **Get a quote**; then **Call** and **Text a photo** side by side. Use a small hero photo of real
work or none. On 32/73 sites the first `tel:` link comes before the H1. Copy that.

---

## 5. Features and calls to action

**CTA matrix**

| Variant | Primary | Secondary | Third | Form extras (beyond name, phone, email, service, quantity, needed-by, details) |
|---|---|---|---|---|
| screen_printing | Get a shirt quote | Call | Text a photo of your design | Print spots (front/back/sleeve), "I have art / need help / not sure" |
| embroidery | Get a quote | Call | Text your logo | Placement (left chest / hat front / back), "your garments or ours" |
| signs | Get a free estimate | Call | Text a photo of the spot or vehicle | Approx. size W×H, indoor/outdoor, need install? |
| print_shop | Get a quote | Call | Email your file | Size/finish (optional), 1- or 2-sided |

**Artwork without uploads (static-site rule).** Forms post to our endpoint as text only. On submit, the page generates a
short reference (e.g. `Q-4827`, created in the browser and sent with the form) and shows: **"Email your artwork to
{email} with Q-4827 in the subject"** (a `mailto:` with subject prefilled) and **"Or text a photo to {phone}"** (an `sms:`
link with the body prefilled with the reference). The same two buttons sit next to the form before submit. If the shop has
no email, show only the text option. Never show a file input, and never promise a "file upload".

Must-have (default on):

| Feature | Frequency | Notes |
|---|---|---|
| Quote request | free-quote wording 37/60; quote link 41/73 | 6-8 fields; `needed_by` is a date input |
| Tap-to-call | 46/73 (3+ links on 17/73) | Header, hero, CTA band, footer, sticky bar |
| Text a photo (`sms:`) | 1/73 | Default on for mobile numbers |
| Email your art (`mailto:`) | 38/73 have mailto | With reference code |
| Services by line | all | 6 seeds per variant (section 13), owner edits |
| Gallery | 26/60 | Owner photos only; required owner to-do (blocks publish), at least 3 photos |
| How it works, 3 steps | 13/60 | Mentions the proof step only if `proof_before_print` |
| Who we work with | schools/churches/fundraisers 35/60 | From `markets[]` |
| Reviews + Google link | 31/60 | No widgets |
| Hours + address | 31/60 | Storefront shops show the street address |

Nice-to-have (toggles): **turnaround note** (owner text only, 30/60 mention it), **minimums** (owner only; 7/60 state
them), **rush available** (9/60; fee wording from the owner), **design help** (22/60), **digital proof before printing**
(16/60), **pickup / shipping / install area** (pickup 11/60, install 14/60, 12/22 for signs), **"since YEAR" / years**
(32/60), **clients served** (27/60, names only with permission), **online / team store link** (5/60), **eco or water-based
inks** (10/60), **bring your own garments** (EM), **reorders on file** ("we keep your logo/screens on file"), **woman-,
veteran- or family-owned** (about 7/60), **promo products** (27/60) as a single card, not a catalog.

**Trust signals, in order:** real work photos, years in business, named local clients (with permission), testimonials +
Google link, "made in our shop" (in-house equipment), proof before print, owner photo.

---

## 6. Integrations

Seen (N = 73 home pages + 62 quote pages): WordPress 32 (form plugins CF7 10, Gravity 8, WPForms 3 on quote pages), reCAPTCHA
36 home / 39 quote, Shopify 9 (garment catalogs, team stores), Squarespace 6, Wix 4, Jotform 5, HubSpot 4, review widgets
(Elfsight/Trustindex) 7, Google Maps embeds 7, online designer tools 9/60, InkSoft 1. Shop-management tools (Printavo,
DecoNetwork, ShopVOX) don't show on home pages. They sit behind quote, approval or store links. Facebook links 57,
Instagram 43: many shops keep their real portfolio on Instagram.

For our static template:
- **Quote form** → our Worker endpoint (owner notified by email and the app Inbox). Honeypot + Turnstile, no reCAPTCHA.
- **Optional link-outs** (URL fields, plain buttons): online/team store (InkSoft, OrderMyGear, Printavo store, Shopify,
  Square Online, Bonfire), a blank-garment catalog site, pay-an-invoice link. Never embed designers or store scripts.
- **Instagram/Facebook** as footer icons and a "See more on Instagram" link under the gallery. No live feed embed.
- **Map**: "Get directions" link, no embed. **Reviews**: owner testimonials + Google link, no carousel widgets.

---

## 7. Mobile behavior

- Sticky bottom bar on phones: **Call · Text · Quote** (Text opens `sms:` with "Hi, I'd like a quote for…" prefilled).
- One H1, slim sticky header (≤ 56px), a hamburger with 5-6 items, and the Quote button outside the menu.
- Gallery: 2-column grid on a folded Fold (~360-410px), 3 columns unfolded; lazy-loaded `srcset` images; tap opens a light
  lightbox with no extra library.
- Form: `type=tel`, `type=email`, `type=date` for needed-by, `inputmode=numeric` for quantity; extras behind "More details".
- Budget: 9/73 sample pages ship 500 KB+ HTML and 4 ship 1 MB+. Keep ours under the shared baseline budgets.

---

## 8. Content the AI writes

Tone: practical, friendly, shop-floor confident; short sentences; "your shirts", "your sign". No "#1", "best in Alabama",
"fastest" or "lowest prices" unless the owner gives an award or a policy.

| Section | Copy | Length |
|---|---|---|
| Hero headline + subline | Line + town; top lines + 1-2 trust facts | 4-9 / 15-25 words |
| Service cards | Name + one line on what it's for ("for teams, reunions and staff shirts") | 10-20 words |
| Services page per line | What we make, who it's for, how ordering works for that line | 80-140 words per line |
| How it works | 3 steps that match the owner's real process | 8-15 words each |
| Artwork help | How to send art (email/text), what to do with no art | 30-60 words |
| Who we work with | Chip labels + one sentence | 15-25 words |
| About | Owner, years, shop, equipment (owner notes required) | 120-200 words |
| Gallery captions | From owner notes: item + use ("Trailer lettering for a lawn crew") | 4-10 words |
| FAQ | 5-8 Q&As: file types, no art, proofs, pickup/shipping, bring own garments, install, reorders | 30-70 words each |
| Final CTA, meta title, description, alt text | Section 11 patterns | short |

**The AI must never invent:** turnaround or rush times, minimums, prices, "from" amounts, setup/screen/digitizing fees,
quantity breaks, deposits, years in business, equipment or "in-house" claims, number of colors or stitch counts, named
clients, licensed or collegiate products ("officially licensed"), eco/water-based ink claims, sign warranties, permit
handling, install area, shipping. With no owner value, the copy says "tell us your date and we'll tell you what's possible"
or "ask about minimums". **AI or stock images** show blank or generic items only: no real team, school or brand logos,
no copyrighted characters, no mascots.

**From Places:** name, Place ID, address, phone, hours, website/Facebook URL, rating and review count (ranking and AI context
only), photos (preview only, never on published sites). Review text is private AI context and is never quoted.
**From the owner:** lines and services, methods, minimums, turnaround, rush, fees, design help, proof policy, pickup,
shipping and install area, markets, clients they may name, photos of their work, testimonials, store URL, email for art.

---

## 9. Data model (`ext.print`)

| Field | Req | Source | Notes |
|---|---|---|---|
| `variant` | R | Sys (section 13) → Own | `screen_printing` · `embroidery` · `signs` · `print_shop` |
| `lines[]` | R | Sys → Own | Subset of `apparel`, `embroidery`, `signs`, `print`. The primary line comes from the variant; owner adds others |
| `services[]` | R | seed → Own | `{id, name, line, blurb, featured, price_display?}` (6 seeds per variant) |
| `products[]` | O | Own | Optional detail rows: `{service_id, label ("3.5×2 cards", "3×6 ft banner"), price_from?, unit?}` |
| `methods[]` | O | Own | `screen`, `dtg`, `dtf`, `heat_press`, `sublimation`, `embroidery`, `vinyl_cut`, `wide_format`, `digital`, `offset`, `letterpress`, `engraving`, `cnc` |
| `price_mode` | R | Own | `quote_only` (default) · `starting_at` |
| `minimums[]` | O | Own | `{method or service, qty, note}`; hidden if empty |
| `turnaround` | O | Own | `{standard_text, rush_available, rush_note}`; free text, never generated |
| `fees_note` | O | Own | Setup/screen/digitizing fee wording |
| `design_help` | O | Own | `{offered, fee_note}` |
| `proof_before_print` | O | Own | Bool; drives the step 2 wording |
| `art_intake` | R | Sys → Own | `{email, text_number, accepted_formats[], note}`; at least one of email or text |
| `fulfillment` | O | Own | `{pickup, shipping, delivery_radius_mi, install, install_area_towns[]}` |
| `walk_in` | O | Own | Storefront counter. Shows the street address and drives the Visit slot |
| `markets[]` | O | AI suggests → Own | schools, churches, teams, businesses, contractors, real_estate, restaurants, events, reunions, fundraisers |
| `clients[]` | O | Own | `{name, permission: true}` |
| `gallery[]` | O | Own | `{photo, caption, line, client_permission}`. Required before publish, at least 3 |
| `online_store_url`, `catalog_url`, `pay_url` | O | Own | Link-outs |
| `garments_policy` | O | Own | "Bring your own" allowed or not (EM/SP) |
| `trust` | O | Own | `{year_started, ownership_tags[], in_house_note}` |

Core fields (name, phone, hours, address, `show_street_address` default **true** for this category, testimonials, social,
FAQ, copy, look) follow the shared baseline.

---

## 10. Design looks

Neighbor radius: **25 mi** (people drive across a county for shirts and signs). All pairs below were checked for WCAG AA.
Fonts are free on Fontsource, and none duplicates an existing look's pair.

### A. "Press Check" (default: print_shop)
- **Mood:** crisp, precise, paper-and-ink. Registration marks and CMYK accents, used lightly.
- **Palette:** paper `#FBFAF7`, ink `#16181D` (17:1), process cyan `#00668A` (CTA, white text 6.4:1), magenta `#B0135A`
  (links 6.5:1), yellow `#FFD400` (chips behind ink text only), muted `#4B5260`. Variant 2: press green `#1F7A4D` CTA (5.3:1).
- **Type:** *Red Hat Display* 700 headings + *Red Hat Text* body.
- **Knobs:** `hero_style: split`, `card_style: ruled`, `divider: rule`, `badge_style: plain`, `price_list: table`,
  `button_shape: square`. Photos: overhead flat-lays of cards, envelopes and swatches, in daylight.

### B. "Fresh Ink" (default: screen_printing)
- **Mood:** loud, young, merch-table energy. Dark bands and big condensed caps.
- **Palette:** charcoal `#17161A` bands, off-white `#F4F1EA` (15.9:1 both ways), safety orange `#FF5A1F` CTA with charcoal
  text (5.8:1), teal `#2BB3A3` accents on dark (6.9:1), teal link on light `#0F6E64`. Variant 2: lime `#C6F432` CTA with
  charcoal text (14:1).
- **Type:** *Anton* (uppercase headings) + *Rubik* body.
- **Knobs:** `hero_style: full_bleed_dark`, `card_style: flat`, `divider: stripe_band`, `badge_style: sticker`,
  `button_shape: offset_shadow`, `section_spacing: dense`. Photos: shirts on real people, ink on the press, squeegee close-ups.

### C. "Main Street Enamel" (default: signs)
- **Mood:** classic hand-lettered sign shop on a town square: enamel, gold leaf, sturdy.
- **Palette:** midnight `#14233C`, enamel cream `#F5EEDD` (13.6:1), vermilion `#B23A1C` CTA (white 6.0:1), gold `#D8A93B`
  on navy (7.2:1), dark gold text on cream `#7A5A12` (5.5:1). Variant 2: forest `#1F3B30` + oxblood `#7E2A2A` CTA (9.3:1).
- **Type:** *Bungee* (headings, sparingly; drawn for signage) + *Hanken Grotesk* body.
- **Knobs:** `hero_style: boxed`, `card_style: bordered`, `divider: thick_rule`, `badge_style: seal`, `photo_mask: none`,
  `button_shape: rounded`. Photos: finished storefronts, lettered trucks and trailers, in straight-on daylight.

### D. "Thread & Needle" (default: embroidery)
- **Mood:** tailored, warm, boutique-meets-uniform. Works for monogram shops and corporate polos.
- **Palette:** oat `#F7F3EC`, thread navy `#1F2A44` (12.9:1), rosewood `#9E3B4E` CTA (white 6.6:1), stitch gold `#E3B95C`
  (chips with navy text 7.7:1), muted `#5A5F6B`. Variant 2: plum `#5B3A6B` CTA (9.3:1) with charcoal `#2A2A2E` text.
- **Type:** *Young Serif* headings + *Instrument Sans* body.
- **Knobs:** `hero_style: split`, `photo_mask: rounded`, `card_style: shadow`, `divider: none` (dashed "stitch" rule as a
  decorative border token), `badge_style: pill`, `section_spacing: airy`. Photos: macro stitch detail, folded polos, hats.

Assignment: default by variant, then the neighbor rule. A multi-line shop takes its primary variant's look.

---

## 11. Local SEO

- **Schema:** `LocalBusiness` (21/73 use it; schema.org has no print or sign subtype). Use `Store` when `walk_in` is true.
  Add `hasOfferCatalog` with `Service` items mirroring the cards, `areaServed` (towns), `openingHoursSpecification`, and
  `sameAs`. Use `FAQPage` only for visible FAQs. **No `AggregateRating`** (2 sample sites self-mark ratings).
- **Titles (≤ 60):** SP `Custom T-Shirts & Screen Printing in {City}, {ST} | {Name}`; EM `Custom Embroidery & Logo Hats in
  {City}, {ST} | {Name}`; SG `Signs, Banners & Vehicle Lettering in {City}, {ST} | {Name}`; PR `Printing, Business Cards &
  Flyers in {City}, {ST} | {Name}`. Multi-line: the top two lines.
- **Meta (≤ 155):** lines + town + one trust fact + "Call or text {phone} for a quote."
- **Headings:** one H1 with the main line and town. H2s per line use the words people search ("banners", "yard signs",
  "business cards", "team shirts", "embroidered hats").
- **Gallery alt text and file names** describe item + town ("trailer-lettering-cullman-al.jpg"). It's the cheapest
  long-tail SEO in this category.
- **NAP** matches the Google profile exactly. Show the street address for storefronts. Link "Leave us a review" from the
  footer and the quote thank-you state.
- No town doorway pages. A single "Areas we serve" sentence lists the towns.

---

## 12. Anti-patterns (seen in the sample)

1. Dead or hijacked domains: the reference lead's site 404s, and a ranked Atlanta printer's domain now serves spam.
2. No `tel:` link on 27/73. Phone shown only as text, or only in the footer.
3. Several H1s on 19/73 (up to 9), none on 8/73.
4. Heavy pages: 4/73 over 1 MB of HTML, sliders, reCAPTCHA on 36/73.
5. Thin pages: 13/73 have under 300 words. Brand-only sites never say what they make or where.
6. Vague promises: "fast turnaround", "competitive pricing guaranteed", "same-day (rush fee)" with no fee or time. We
   render these only from owner fields.
7. Duplicated testimonials on one page. Self-serving rating schema.
8. Product sprawl: 20+ product tiles (laminating, posters, floor graphics…) burying the 3-4 things the shop is known for.
   Show 6 cards and put the rest in a text list.
9. Seasonal sections left up (a Halloween costume shop in October is fine, in March it is not). Use `promo.expires_on`.
10. Forms that demand a file before you can submit. People on phones give up. Our flow keeps art optional and sent later.
11. Hiding whether work is done in-house. One strong site states plainly what is made in the shop and what goes to
    partners. Ours shows `in_house_note` only when the owner gives it.
12. Logos and team marks the shop has no right to show (school or college marks in AI or stock images).

---

## 13. Variants

Places gives these shops only generic types. Around Cullman the primary types were `service`, `store`, `manufacturer`,
`clothing_store`, `gift_shop`, `home_goods_store` and `shipping_service`. There is no print-shop or sign-shop type, so
**variant comes from the name first**, then from the search term that found the lead, then from types.

| Order | Rule (name, lowercase) | Variant |
|---|---|---|
| 1 | `embroider|monogram|stitch|thread|needle|sew` | embroidery |
| 2 | `screen ?print|silk ?screen|t-?shirts?|tees?\b|shirts?|apparel|merch|spirit ?wear|\bink\b` | screen_printing |
| 3 | `\bsigns?\b|signage|banners?|wraps?|vinyl|decals?|lettering|graphics & signs` | signs |
| 4 | `print(ing|ers?)\b|press\b|copy|copies|litho|business cards|graphics` | print_shop |
| 5 | Search term: "screen printing"/"custom t-shirts" → screen_printing; "embroidery" → embroidery; "sign shop"/"banners" → signs; "print shop" → print_shop | |
| 6 | Types: `clothing_store` → screen_printing; `gift_shop` → embroidery; else print_shop | |

A name with two lines ("Signs & Shirts") gets the variant of the first one named, and the second goes into `lines[]`.
"Creative Design & Screen Printing" → screen_printing, and the owner adds `print` and `signs`.

**Search group:** "Print, sign & shirt shops", with terms screen printing, custom t-shirts, embroidery, sign shop, vinyl
banners decals, print shop. **Qualify out:** chains (The UPS Store, FedEx Office, Office Depot/OfficeMax, Staples, FastSigns,
Signarama, Minuteman Press, AlphaGraphics, PIP, Sir Speedy, SpeedPro, Big Frog, Hobby Lobby), packaging and newspaper/web-press
plants, and vinyl or blank supply stores. Six searches near Cullman returned many with no site or only Facebook (e.g. Cullman
Sign and Banner, GoTees, C&C Graphics, Modernistic Printers, Discount Printing, Sticky Stuph), so the market is real.

**Default services (6 each; the owner edits):**
- **screen_printing:** Custom T-shirts · Hoodies & sweatshirts · Team & school spirit wear · Business & work shirts · Event
  & fundraiser shirts · Small-run full-color prints
- **embroidery:** Embroidered polos & work shirts · Hats & caps · Jackets & outerwear · Team & school apparel · Monograms &
  personalized gifts · Logo digitizing
- **signs:** Vinyl banners · Yard & real-estate signs · Vehicle & trailer lettering · Window lettering & decals · Storefront
  & building signs · Magnetic vehicle signs
- **print_shop:** Business cards · Flyers & brochures · Letterhead & envelopes · Posters · Postcards & mailers · Carbonless
  forms & invoices
