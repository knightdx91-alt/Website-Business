# Category blueprint: Independent local retail shops

Researched October 2026 for the Cullman, AL starting market. One template covers small independent shops that people
visit in person: clothing boutiques, gift shops, antique stores and malls, thrift and consignment stores, florists, feed
and farm stores, and furniture / home decor shops. Seven variants (section 10) change the "what we carry" list, a few
modules and the CTAs. Our sites stay static, with **no cart**. Online selling is a link to a shop the owner already runs.

**Method.** Candidates came from the retail, home & garden and agriculture directories of the Cullman, Decatur-Morgan and
Eastern Shore (AL) and Gallatin and Cookeville (TN) chambers, plus web searches by kind and town across AL, TN, GA and MS
(Yelp, Facebook, wire-service catalogs and wedding directories excluded). I downloaded each home page with a phone
user-agent and scripted counts of `tel:`/`sms:` links, platform fingerprints, social links, schema.org types, H1s, HTML size,
widgets, and keyword patterns in the visible text. I also pulled heading sequences from 30 pages and read the opening
~150 words of 8 (Jasper Feed, Red Tulip, Village Furniture, Sozo Trading, GasLamp, Sumner Co-op, Wren + Revel, ReStore).

**Bases for the numbers.**
- **N = 78** home pages downloaded (73 independents or small regionals, 5 chains or large online-first brands).
- **N = 52** of those have 300+ words of server-rendered text. Used for text/keyword counts. The other 26 are product-grid
  or app-shell pages with little crawlable text, which is itself a finding (anti-pattern 3).
- Per-variant N is small (antique 6, thrift 8, farm/feed 8), so per-variant counts show direction, not precision.
  Keyword counts are pattern matches: treat them as close estimates (roughly ±2). Home pages only.

**Market note (why this category matters for us).** Of the 68 members in Cullman's retail directory, 16 independents list
**no website at all** (for example 278 Boutique, The Copper Cricket, S+C Luxury Co., Sweeter With Time Vintage Thrift, The
Even Now Boutique; Urban Pine in Home & Garden also has none), and several more list only a Facebook handle, an Etsy shop or
a bare `*.myshopify.com` address. Many of the rest are Shopify product catalogs with no hours or address on the home page.

---

## 1. Summary

- **Two kinds of retail site exist, and our clients need the second.** Boutiques and gift shops mostly run **Shopify
  catalogs** (21/78 overall, 12/17 boutiques): 20-40 product tiles, a cart drawer, a newsletter popup. Antique malls, thrift
  stores, feed stores and furniture stores mostly run **visit-us brochures**. Our clients sell in the store and on Facebook, so
  the template is a **storefront brochure**: why come in, what we carry (as categories), when we're open, where we are, and
  where to see new stock. An existing Shopify, Etsy or Facebook shop becomes one **Shop online** button, never a catalog.
- **The basics of a store visit are missing on most sites.** Only **28/78** home pages show hours as text and **21/78** show
  hours, address and phone together. 30/78 have a `tel:` link (boutiques 3/17); **19/78 show a phone number that isn't
  tappable**. Hours, open-now status, directions, parking/landmark and tap-to-call near the fold beat most competitors alone.
- **Social is the real "new arrivals" feed.** Facebook links on 65/78, Instagram 52/78, TikTok 18/78 (boutiques 7/17); "new
  arrivals / just in" on 24/78 (13/17 boutiques). A static site can't keep stock current, so the honest pattern is a **"See what
  just came in"** band linking to Facebook/Instagram, plus optional "drop day" or live-sale times. Only 1/52 text pages
  mentions live sales (Lavish), so this is a question to ask each boutique owner, not a default.
- **"What we carry" categories are the content core** (named on 45/52 text pages: collection tiles such as Tops, Dresses,
  Jewelry on Shopify; departments such as livestock, equine, chicken, pet, deer, seed at Jasper Feed). Our template shows
  **6 owner-ticked category cards**. **No product names, prices or brand lists unless the owner supplies them.**
- **Each variant has one extra job.** Florists sell occasions (wedding 7/9, sympathy 7/9, same-day 3/9 text pages) and need an
  **Order flowers** link to their own order page. Thrift stores also serve **donors** (Sozo and ReStore put "Schedule a pick-up"
  in the header). Antique malls recruit **vendors** (University Pickers' "Booth Biz"). Feed stores list **departments, brands and
  seasonal stock** (pets 5/6, chicks/poultry 5/6, brands 4/6, delivery 5/6). Furniture stores lead with **financing, delivery**
  (3/6 each) and decades of family history.
- **Weak sites fail on the same basics as every other category**: missing or multiple H1s (40/78), thin JavaScript-built pages,
  heavy HTML, stale seasonal sections, conflicting founding years, and five dead, parked or hijacked domains (section 13).

---

## 2. Sample

All rows were downloaded directly and are in N = 78. **Reg** = independent with a few stores; chains are for ideas only.

| Variant | Businesses (city) | N |
|---|---|---|
| Boutique | Lavish Boutique (Cullman/Jasper, Reg), Graced by Fashion, Platform, Palm + Jade Co., Blue Ridge & Co., If the Shoe Fits, Dixie Duds and Decor, Small Town Vibes Boutique, The Pink Cactus Western Co., Jack's Western & Outdoor Wear, Wren + Revel, Classy to Sassy (all Cullman); Honey + Suede (Gallatin TN); Mara Mae's (Cookeville TN); Dukes Clothier, Coastal Outfitters (Eastern Shore AL); Southern Charm Boutique (Southeast, town not checked) | 17 |
| Gift | Monograms Plus, The Lake Co., Snead's Farmhouse, Initial Impression, Nomadic Threads (Cullman area); The Light House, Hailo's (Decatur AL); The Fairhope Store, Christmas 'Round the Corner (Fairhope AL); The Red Tulip, The Ramblin' Bee, Crown and Iris, Earth First Plants & Vintage (Gallatin TN); The Mill Storehouse (Cookeville TN) | 14 |
| Antique | Southern Accents Architectural Antiques, Nethy Home and Antiques (Cullman); University Pickers (Huntsville); GasLamp Antiques (Nashville); Dirty Janes Antique Emporium (Chattanooga); TN Flea (Gallatin) | 6 |
| Thrift / consignment | Better Than Before Consignments (Cullman); The Foundry thrift (Bessemer/Cullman, Reg); Then Again Consignment (Hoover); Second Hand Rose (Vestavia Hills); d'Trespa, Sozo Trading Co. (Birmingham); Back On The Rack (Gulfport MS); Sumner County ReStore (Gallatin TN) | 8 |
| Florist | Will & Dee's (Florence AL); Bishop's Flowers (Huntsville); Norton's Florist, Dorothy McDaniel's Flower Market (Birmingham); The Flower Store, What N Carnation (Auburn AL); Blooming Fabulous (Eastern Shore AL); Apple and Dove, Black Tie Floral Design (Gallatin TN); Petal & Rake (Cookeville TN); Hall's Flower Shop (Stone Mountain GA) | 11 |
| Farm / feed | North Alabama Co-Op (Arab/Cullman/Hartselle, Reg); Jasper Feed and Seed (Jasper AL); Harvest Feed Mill (N. Alabama); Sumner Farmers Co-op (Gallatin TN); Rutherford Farmers Co-op (Murfreesboro TN); Oak Grove Farms & Market (Gallatin TN); Turner's Feed & Seed (Douglasville GA); Cherokee Feed & Seed (Ball Ground GA) | 8 |
| Furniture / decor | Village Furniture & Gifts, Cullman Furniture Market, White Willow (Cullman); Gibson Furniture & Patio (Gallatin TN); Mayberry's Furniture (Cookeville TN); Chavis Furniture (Mobile area AL); Jes & Gray Living, Hive Modern Home (Eastern Shore AL); Perch Home and Hospitality (Gallatin TN) | 9 |
| Chain (ideas only) | Riffraff (AR, multi-store), Pink Lily (TN, online-first), America's Thrift Stores, Tennessee Farmers Cooperative (federation), Miskelly Furniture (MS) | 5 |

Not counted (bot wall or no usable page): cullmanflorist.com, brownsflorist.net, crouchflorist.com, shopthemint.com,
marienicoleclothing.com, northfultonfeedandseed.com, russellfeedandsupply.com, valleyfls.com, broadstreetantiquemall.com
(~1.5 KB frame page). Dead or broken, though listed by a chamber or directory: highwaypickers.com (for sale),
gypsysoulantique.com (no site), suitsformen.com (parked), wernerstradingco.com (redirects to an unrelated company),
spkgifts.com (unfinished placeholder template). **Totals: 92 tried, 78 visited and counted** (73 Ind/Reg + 5 Chain).

---

## 3. Pages

Common nav labels: Shop / Shop online ("shop now/online" on 29/52 text pages), About / Our story (29/52), Visit / Directions
(18/52), Gift cards (20/78), Events (18/52), plus Donate (thrift), Vendors (antique), Weddings / Sympathy (florist),
Departments / Brands (feed), Financing / Design services (furniture).

**Recommended page set**

- **Required:** **Home** (one long anchored page, section 4; it must work for someone who never clicks further), plus the
  core's `404.html`, and `/privacy/` + `/thanks/` only when a form is on (consign, vendor or wedding inquiry).
- **Optional, only when the owner supplies the content:** *Weddings & events* (florist, 4+ photos of their own work);
  *Donate* (what we take / don't take, drop-off hours, pick-up link); *Consign with us* (owner-written terms only);
  *Become a vendor* (antique mall); *Design services* (decor shops that offer in-home design, e.g. White Willow, Jes & Gray);
  *Gallery* of the owner's own store photos (strong for antiques and decor).
- **Never generated:** product, collection, brand or per-town pages, or a blog. A static site can't keep stock, sizes or
  prices current, and a stale product grid is worse than none. Browsing belongs on the owner's own shop (link-out).

---

## 4. Home page section order

Synthesized from heading sequences on 30 pages and the 8 opening reads. The order serves foot traffic first:

1. **Header**: name/logo, call icon (`tel:`), **Shop online** button only if a shop link exists, hamburger (≤ 5 items).
2. **Hero**: what + where ("Women's boutique in downtown Cullman" pattern, our own wording), one line of personality, and
   **today's hours / Open now** chip. Buttons: **Get directions** (primary) + **Call**. Third button by variant
   (Shop online / Order flowers / Donate).
3. **Info strip**: hours today, address (tap = directions), parking/landmark and payment notes (owner text only).
4. **What we carry**: 6 category cards (photo + name + one line). The section answers "is it worth the trip?"
5. **Variant module** (one, section 10): New arrivals, Occasions, Departments + seasonal, Vendors, Donate & consign, or
   Financing & delivery.
6. **See what's new on social**: Facebook / Instagram / TikTok buttons with handle text, optional live-sale or drop-day
   schedule. No embedded feed.
7. **Store photos**: 3-6 owner photos of the shop floor and displays (Google photos only in previews).
8. **Reviews**: 2-3 owner-approved testimonials + "Read our Google reviews" link.
9. **About**: owner/family story, year opened, what makes the shop theirs (local makers, family farm, decades in town).
10. **Events** (optional): open houses, sidewalk sales, workshops, with dates; auto-hidden after the date.
11. **Visit us**: full hours table (with holiday-hours note), address, directions button, click-to-load map.
12. **FAQ** (optional, 4+ backed answers): parking, gift wrap, layaway, returns, delivery, donations.
13. **Final CTA band**: directions + call (+ shop online), repeat hours.
14. **Footer**: NAP, hours, social, review link, privacy.

**Above the fold on a phone (360×740):** name, the what+where line, **Open now / Opens at 10** chip, **Directions** (full width)
and **Call** buttons, and the address line. 17/78 sampled pages put a `tel:` link before the H1; ours always does via the header.
The hero photo is the storefront or the shop floor, ≤ 55% of the viewport, never a product carousel.

---

## 5. Features and calls to action

**CTA matrix by variant** (primary / secondary / third):

| Variant | Primary | Secondary | Third (only if link given) |
|---|---|---|---|
| boutique | Directions | Call | Shop online (Shopify / FB / IG shop) |
| gift | Directions | Call | Shop online |
| antique | Directions | Call | Become a vendor (form or call) |
| thrift | Directions | Call | Donate / Schedule pick-up |
| florist | **Order flowers** (owner's order page) or Call | Call / Directions | Wedding inquiry |
| farm_feed | Call | Directions | Text us (stock questions) |
| furniture | Directions | Call | Financing / Shop online |

Must-have (default on):

| Feature | Frequency in sample | Notes |
|---|---|---|
| Hours as text + today's status | 28/78 show hours | From Places, owner-confirmed. Holiday hours note. |
| Address + directions link | address text 44/78; Maps link 20/78 | Directions button from the Place ID. |
| Tap-to-call | 30/78 (19/78 show a dead number) | Every number is a `tel:` link. |
| What we carry (categories) | named on 45/52 | 6 cards, owner-ticked, from the variant default list. |
| Social links | FB 65/78, IG 52/78, TikTok 18/78 | Buttons with handles, not just icons. |
| About / story | 29/52 | Family and local angle is common. |
| Reviews link | widgets on 9/78 | Testimonials only with permission; Google link always. |

Nice-to-have (toggles):

| Feature | Frequency | Notes |
|---|---|---|
| Shop online link-out | Shopify 21/78; "shop online" wording 29/52 | One button, labeled by provider ("Shop our online store", "Shop on Facebook"). |
| New arrivals / drop-day band | 24/78 (boutiques 13/17) | Links to social; optional owner text "new stock every Tuesday". |
| Live sale schedule | 1/52 | Owner text only (day/time + platform link). |
| Gift cards | 20/78 | Link to Square/Shopify gift card page, or "available in store". |
| Email/text club | newsletter/subscribe on 56/78 (mostly Shopify footers) | Link to the owner's Mailchimp/Klaviyo/Square signup; no popup. |
| Events | 18/52 | Dated, auto-expire. |
| Local pickup / curbside | 3/52 | Only if the owner offers it with an online shop. |
| Delivery | florist 6/9, feed 5/6, furniture 3/6 | Area and fee from the owner only. |
| Financing | furniture 3/6 | Link to the provider page; no terms in our copy. |
| Gift wrap, monogramming, layaway, special orders, alterations | rare (layaway 0/52) | Owner-confirmed service chips. Skip buy-now-pay-later badges (12/78). |

**Trust signals that fit retail:** years in business ("since YEAR"; 7/52), family/locally owned (7/52), local or Alabama-made
goods (4/52), owner photo, real store photos, community ties (proceeds to a ministry for nonprofit thrift stores like Sozo,
The Foundry, ReStore). Awards ("Voted best florist") only with the owner's source.

---

## 6. Third-party integrations

| Tool | Seen | How we use it |
|---|---|---|
| Shopify store | 21/78 | `shop_links.online_store` button. Never embed Buy Buttons or product feeds. |
| Square Online / Weebly | ~8/78 (incl. Petal & Rake's Square shop) | Same link-out. |
| Facebook / Instagram shop, Etsy | Etsy listed by a Cullman maker instead of a site | Link-out buttons. |
| Florist platforms: Flower Shop Network (FSN) 2, Flower Manager 1, Wix/WordPress/Square others | florists 11 | `florist_order_url` button "Order flowers"; we never rebuild their catalog or show wire-service products or prices. |
| Financing, donation pick-up schedulers | furniture; thrift (Sozo, ReStore) | Link-out buttons only. |
| Google Maps embed | 5/78 | Click-to-load on the Visit section only. |
| **Skip:** Instagram feed widgets 16/78, review widgets 9/78, Klaviyo/signup popups (Klaviyo 9/78), chat bubbles 10/78, reCAPTCHA 42/78 (mostly Shopify defaults) | | Handle buttons, owner testimonials + Google link, a plain "Join our email list" link, Turnstile + honeypot on forms. |

---

## 7. Mobile behavior

- Viewport tag on 77/78; layouts are responsive, but the **Shopify phone experience is a catalog**: announcement bar,
  cart icon, 2-column product grid, popup. None of that helps someone deciding whether to drive downtown.
- **Action bar** (bottom, < 768 px): **Directions · Call · (Shop | Order | Donate)** by variant. Farm/feed: **Call · Directions · Text**.
- **Open-now chip** in the hero, computed at build and refreshed client-side from the hours data (no external call).
- **Category cards**: 2 columns at 344-412 px, 3 at the unfolded Fold width (~ 700-900 px), 6 on desktop.
- **Images**: one hero (≤ 150 KB on mobile), lazy-load the rest, fixed aspect ratios. No popups, no slideshows (several
  Shopify heroes rotate brand slides; Red Tulip repeats its slides in the markup).
- Social buttons ≥ 48 px with the handle as visible text, so they work as "follow us" even when screenshotted.

---

## 8. Content the AI writes

Tone: friendly, local, a little personality by variant (boutique: upbeat and stylish; gift: warm; antique/thrift: treasure-hunt;
florist: graceful and calm, extra gentle for sympathy; feed: plain-spoken and practical; furniture: established and helpful).
No superlatives ("best", "largest", "#1") unless the owner supplies an award or fact.

| Section | Copy | Length | Notes |
|---|---|---|---|
| Hero headline | What + where | 4-9 words | Two or three variants per site. |
| Hero subline | Personality + one confirmed fact | 12-22 words | e.g. family-owned, downtown, since YEAR. |
| Category cards | Name + one line each | 8-16 words | Describes the *kind* of goods, never specific items. |
| Variant module | Occasions / departments / donate / vendor / financing intro | 30-60 words | From enabled fields only. |
| Social band | Why follow (new stock goes up there first) | 12-25 words | Platform names from links present. |
| About | Owner/family story | 100-180 words | Needs owner input; placeholder until supplied. |
| Visit intro | Parking/landmark line | 10-25 words | Owner text only. |
| FAQ | 4-6 answers | 30-70 words | Only for backed topics. |
| Meta | Title ≤ 60, description ≤ 155 | | Section 12. |
| Alt text | Store photos | 5-12 words | |

**The AI must never invent:** brands carried (no "we carry Ariat", "Jellycat", "Purina", "La-Z-Boy" unless in `brands_carried`),
prices or price ranges, sales/discounts/promo codes, delivery areas, fees or same-day cutoffs, size ranges ("S-3X", "plus"),
product availability ("always in stock", "fresh chicks every spring"), consignment splits, booth rent, financing terms, return
policy, years in business, square footage, vendor/dealer counts, "locally made" or "handmade" claims, awards, nonprofit
beneficiaries. Each of these renders only from an owner field, and the copy checker rejects brand names that are not in the
record (reuse the fact/phrase check in `src/copy/write.ts`).

**Data from Google Places** (preview use, refresh rather than store, except Place ID): name, address, phone, hours (incl.
`currentOpeningHours` for holiday hours), primary type, website/Facebook URL, Maps URL, rating/review count (ranking and AI
context only), photos (**preview only, never on published sites**). Review text: private AI context only; it often names
brands or items, which must not leak into copy.

**Must come from the owner:** which categories they carry (tick the defaults, add their own), brands (optional), shop links,
social handles and posting rhythm, services (gift wrap, layaway, delivery…), store photos, story, parking note, policies
(returns, consign, donate), events, and for florists the order URL and whether they do weddings and same-day delivery.

---

## 9. Data model

Core fields as in `00-shared-baseline.md` §8.2 (name, phone, address, `show_street_address` = **true** for retail, hours,
social, reviews, people, offers, look). Category extension `ext.retail`:

| Field | Req | Source | Notes |
|---|---|---|---|
| `variant` | R | Sys → Own | `boutique · gift · antique · thrift · florist · farm_feed · furniture` (section 10). |
| `variants_secondary[]` | O | Own | e.g. boutique + gift, furniture + gift ("Village Furniture & Gifts"), thrift + antique. Adds cards, never a second module. |
| `carry[]` | R | Sys default → Own | `{id, label, blurb?, photo?, enabled}`; 4-8 shown, default 6 from the variant list. |
| `brands_carried[]` | O | Own | Rendered as a plain list only when present; the AI may mention only these. |
| `shop_links` | O | Own | `{online_store?, facebook_shop?, instagram_shop?, etsy?, other?: {label, url}}`; first present one drives the Shop button. |
| `florist_order_url` | O | Own | Florist's own order page (FSN, Flower Manager, Square, Shopify...). |
| `social_rhythm`, `live_sales` | O | Own | Free text ("New arrivals every Tuesday on Facebook"); live sales `{platform_url, schedule_text}`. |
| `services[]` | O | Own | Enum + custom: gift_wrap, monogramming, layaway, special_orders, alterations, local_pickup, delivery, design_services, custom_feed_mix, wedding_consults. |
| `delivery` | O | Own | `{offered, area_text, fee_text?, same_day_cutoff?}`; nothing rendered unless `offered`. |
| `occasions[]` | O | Own (florist) | everyday, sympathy, wedding, prom, holidays, corporate; each `{enabled, blurb?}`. |
| `departments[]` + `seasonal[]` | O | Own (feed) | Seasonal `{label, months, text}` (e.g. spring chicks, fall food-plot seed) auto-shown in season only. |
| `donations` | O | Own (thrift) | `{accepts, take_text, dont_take_text, dropoff_hours, pickup_url?, beneficiary_text?}`. |
| `consignment` | O | Own (thrift) | `{accepts, by_appointment, terms_text}`; no splits unless in `terms_text`. |
| `vendors` | O | Own (antique) | `{booths_available, inquiry_contact, vendor_count?, square_feet?}`. |
| `financing`, `gift_card_url`, `email_signup_url` | O | Own | Link-outs; financing `{provider, url}` (furniture). |
| `payment_notes`, `parking_text`, `landmark_text` | O | Own | Shown in the info strip and Visit. |
| `holiday_hours_note` | O | P/Own | Prefer Places special hours; owner text overrides. |
| `events[]` | O | Own | `{title, date, end_date?, text}`; hidden after `end_date`. |
| `store_photos[]` | O | Own | Never Google photos when published; stock/AI only as placeholders flagged for replacement. |

Publish gate additions: `carry[]` must be owner-confirmed (required todo), every claim field above must come from the owner,
and a `promo` or `event` past its date blocks nothing but is auto-hidden.

---

## 10. Variants

**Assignment from Google Places** (check in this order; first match wins). Places has no antique or feed type, so names decide those.

| Order | Variant | Places types (primary or any) | Name keywords (case-insensitive, word match) |
|---|---|---|---|
| 1 | florist | `florist` | flower(s), floral, florist, blooms, bouquet, petal(s), stems |
| 2 | thrift | `thrift_store` | thrift, consign(ment), resale, second hand/secondhand, restore, "upscale resale", rags |
| 3 | antique | `flea_market` | antique(s), vintage, pickers, flea, salvage, collectibles, "antique mall", emporium (with vintage/antique) |
| 4 | farm_feed | `garden_center`, `hardware_store` + name, `farm` | feed, seed, co-op/coop, cooperative, farm supply, farm & home, mill, hay, "feed & seed" |
| 5 | furniture | `furniture_store`; `home_goods_store` + name | furniture, mattress, interiors, home furnishings, design, decor, "home & gifts" |
| 6 | boutique | `clothing_store`, `womens_clothing_store`, `shoe_store` | boutique, apparel, clothing, threads, closet, outfitters, western wear, boots |
| 7 | gift | `gift_shop`, `toy_store`, `general_store`, `store`, `home_goods_store` (fallback) | gift(s), monogram, mercantile, general store, candle, christmas, souvenirs, "& co." |

Exclude from this pack (chains or other conventions): Walmart, Rural King, Tractor Supply, Southern States, Hobby Lobby,
TJ Maxx/HomeGoods, Kirkland's, Goodwill, Plato's Closet, Ashley, Rooms To Go, Bassett, Farmers Home Furniture, Petsense,
Hollywood Feed (add to `CHAINS`); `department_store`, `discount_store`, `supermarket`, `convenience_store`, `liquor_store`,
`cell_phone_store`, `jewelry_store`, `sporting_goods_store` and pawn shops (different selling model, not in scope).
A "boutique" in a salon's name stays in the salon pack when its Places type is a salon type.

**Default "what we carry" (6 per variant, owner unticks or adds):**

| Variant | Defaults |
|---|---|
| boutique | Tops & blouses · Dresses · Jeans & bottoms · Shoes & boots · Jewelry & accessories · Gifts |
| gift | Candles & home fragrance · Home decor · Jewelry · Baby & kids gifts · Kitchen & drinkware · Cards & party goods |
| antique | Vintage furniture · Glassware & china · Primitives & farmhouse · Signs & decor · Collectibles · Books, records & toys |
| thrift | Clothing for the family · Shoes & handbags · Furniture · Housewares & kitchen · Home decor · Books & toys |
| florist | Everyday arrangements · Sympathy & funeral flowers · Wedding & event flowers · Plants · Seasonal & holiday flowers · Gifts & balloons |
| farm_feed | Livestock & horse feed · Pet food · Poultry feed & supplies · Seed, fertilizer & garden · Fencing & farm supplies · Deer & wildlife feed |
| furniture | Living room · Bedroom · Dining · Mattresses · Home decor & lighting · Outdoor furniture |

Variant modules and defaults: boutique/gift → New arrivals band; antique → Vendors band (off until `vendors.booths_available`);
thrift → Donate & consign band; florist → Occasions grid + Order flowers; farm_feed → Departments + Seasonal; furniture →
Financing & delivery band. Default looks: boutique A, gift B (C alternate), antique D, thrift D (A for upscale consignment),
florist C, farm_feed B, furniture D (A for decor-led shops).

---

## 11. Design looks

Four looks distinct from the other categories' looks. All text/button pairs below were checked: body text ≥ 9.8:1 on
every background and band, CTA white text ≥ 5.8:1. Neighbor rule: no two retail clients within ~5 miles (downtown shops sit next door to each other) share a look
and accent.

### Look A: "Shop Window"
- **Mood:** editorial, airy, stylish. Boutiques, upscale consignment, decor-led furniture.
- **Palette:** porcelain `#FBF8F6` bg, ink `#1C1A1A` text, blush wash `#F4E1DC` bands, deep rose `#9E3D52` CTA (white text 6.5:1),
  champagne `#C9A96E` decorative lines only. Variant 2: denim `#3E4F6B` CTA with fog `#E7ECF2` bands.
- **Type and layout:** *Cormorant Garamond* (large, light headings) + *Jost* (body, small-caps labels). Tall portrait crops,
  borderless captioned category photos, thin rules, square buttons; `section_spacing: airy`, `hero_style: split`.

### Look B: "Mercantile"
- **Mood:** general store, wood floors and chalkboard signs. Gift shops, feed and farm stores, small-town mercantiles.
- **Palette:** cream `#F7F1E3`, kraft band `#EADBC0`, barn red `#8E2C1F` CTA (8.3:1), forest `#2E4A36` headings, mustard `#D8A23A`
  decorative, text `#2A2420`. Variant 2: river teal `#1F5A6B` CTA.
- **Type and layout:** *Rokkitt* (slab headings) + *Karla* (body). `badge_style: stamp` (price-tag category labels),
  `divider: thick_rule`, `card_style: bordered`, departments as a ruled icon list, seasonal callout as a CSS chalkboard sign.

### Look C: "Bloom"
- **Mood:** soft, botanical, graceful. Florists, plant and gift shops.
- **Palette:** petal white `#FFFBFA`, peony wash `#FBE3EA` bands, plum `#6B2D5C` CTA (9.7:1) and accents, leaf `#7FA36B` decorative,
  text `#2B2230`. Variant 2: deep fern `#2F5D46` CTA with mint-white bands.
- **Type and layout:** *Marcellus* (headings) + *Mulish* (body). `photo_mask: arch` on category and occasion cards,
  `divider: wave`, occasion grid as 2×3 arches, and a calm sympathy card that drops all decoration.

### Look D: "Salvage Yard"
- **Mood:** found objects, ledgers and booth tags. Antique malls, thrift stores, architectural salvage, traditional furniture.
- **Palette:** parchment `#F3EEE4` bg, iron `#2B2B28` text and header/footer, rust `#A44A1F` CTA (5.9:1), slate band `#DCD6CB`,
  brass `#B08D57` decorative on iron (large text only, 4.6:1). Variant 2: bottle green `#355E4A` CTA.
- **Type and layout:** *Old Standard TT* (headings) + *IBM Plex Sans* (body, tabular numerals for hours and booth numbers).
  Dark header/footer bands, `card_style: ruled`, hang-tag category cards, `badge_style: seal` for "since YEAR", dense photo masonry.

---

## 12. Local SEO

**Schema.org** (one business node per the baseline): `ClothingStore` (boutique; `ShoeStore` added for shoe-led),
`Store` (gift, antique, thrift; there is no antique or thrift type), `Florist`, `FurnitureStore` (`HomeGoodsStore` for decor-led),
`Store` for feed (add `GardenStore` when garden is carried, `PetStore` when pet food is a ticked category). Properties:
`openingHoursSpecification` plus `specialOpeningHoursSpecification` for holiday hours, `address` with street (retail shows it),
`geo`, `hasMap`, `sameAs` (Facebook, Instagram, TikTok, online store), `paymentAccepted` from the owner, `hasOfferCatalog` as
`OfferCatalog` of the carried categories (no `Offer` prices), `potentialAction: OrderAction` for the florist order URL.
Sampled sites: `LocalBusiness` 20/78; a specific store type only 4/78 (ClothingStore, Florist, FurnitureStore, Store). One
florist marks up an `AggregateRating` itself; never do that.

**Titles** (≤ 60 chars):
- boutique: `Women's Boutique in {City}, {ST} | {Business}` (wording from carried categories; "Western wear", "Kids' clothing")
- gift: `Gift Shop in Downtown {City}, {ST} | {Business}`
- antique: `Antiques & Vintage in {City}, {ST} | {Business}`
- thrift: `Thrift Store in {City}, {ST} | {Business}` (or Consignment)
- florist: `Florist in {City}, {ST} | Flowers & Delivery | {Business}` (Delivery only if offered)
- farm_feed: `Feed & Farm Supply in {City}, {ST} | {Business}`
- furniture: `Furniture Store in {City}, {ST} | {Business}`

**Meta description** (≤ 155): kind of shop + town + 2-3 carried categories + hours hook, e.g. pattern
`{Business} in downtown {City} carries {cat1}, {cat2} and {cat3}. Open {days}. Stop by or call {phone}.`

**Notes:** H1 = what + town, exactly one (24/78 have none, 16/78 several). Category names appear as visible text (they are the
phrases people search: "feed store near me", "flower shop Cullman", "antique mall"). NAP and hours must match the Google profile;
holiday hours are where most mismatches start, so the app should prompt the owner before Thanksgiving-Christmas. Encourage the
owner to post new stock on their Google Business Profile as well (step-1 GBP tools already draft posts).

---

## 13. Anti-patterns

1. **Catalog instead of storefront.** Shopify home pages that open with a cart drawer and 30 product tiles and never say when the
   shop is open or where it is (boutiques: hours on 5/12 text pages, `tel:` on 3/17).
2. **Dead phone numbers and missing hours:** a phone that isn't tappable on 19/78, no hours on the home page on 50/78.
3. **Near-empty pages and heading chaos:** 26/78 under 300 words, 7 under 20 (everything built with JavaScript); no H1 on
   24/78, several on 16/78, product names as H3s by the dozen.
4. **Heavy pages:** 16/78 over 500 KB of HTML, 10 over 1 MB; Instagram feed widgets (16/78), chat bubbles (10/78), popups,
   buy-now-pay-later scripts.
5. **Stale seasonal content:** "Summer Vibes" featured in October, old promo codes in announcement bars. Seasonal and event
   content carries dates and auto-hides.
6. **Listing items a static site can't keep current:** product names, sizes, prices and "in stock" claims go stale within days.
   Show categories; send shoppers to social or the owner's shop for stock.
7. **Conflicting facts across listings:** "since 1981" on the site vs "since 1984" in the chamber listing. One record feeds every
   surface, and the owner confirms the year.
8. **Dead, parked or hijacked domains:** 5 directory-listed shop domains are for sale, parked, empty, a placeholder template, or
   redirect to an unrelated company. We host on Cloudflare Pages and remind the owner before domain renewal.
9. **Same template for every florist:** the two Flower Shop Network sites share one structure and title formula
   ("Flower Shop {City} | Florist in {City}") around a catalog "product set". Our florist pages show the shop's own work and
   link to their order page.
10. **Self-made review stars and unbacked superlatives** (in search listings, two different malls each claim to be the region's
    largest antique mall).
11. **Popups and discount-code walls** pushing online orders when the shop's goal is foot traffic, and **social links as tiny
    unlabeled footer icons** when social is the shop's new-arrivals channel.
12. **Brand-name copy the shop doesn't carry** (an AI risk, not seen in the sample): brand names come only from `brands_carried`.
