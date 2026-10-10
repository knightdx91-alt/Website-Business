import { action, actions, donationsOn, type ActionId } from "../actions.ts";
import { about, announcements, button, contactForm, ctaBand, factList, faq, gallery, hero, infoStrip, reviews, sectionHead, serviceList, todo, visit, type Ctx } from "../components.ts";
import { hasAnyHours } from "../hours.ts";
import { html, raw, type Raw } from "../html.ts";
import { icon } from "../icons.ts";
import type { BusinessRecord, Faq, RetailDonations, RetailExt, Service } from "../types.ts";
import { fitTitle, type CategoryPack } from "./types.ts";

/** research/retail-shops.md §10, checked in order; Google has no antique or feed-store type, so names decide those. */
export function retailVariant(primaryType: string | undefined, types: string[], name: string): string {
  const all = [primaryType ?? "", ...types];
  const n = name.toLowerCase();
  if (all.includes("florist") || /\b(flowers?|floral|florist|blooms?|bouquets?|petals?|stems)\b/.test(n)) return "florist";
  if (all.includes("thrift_store") || /\b(thrift|consign\w*|resale|second ?hand|restore|rags)\b/.test(n)) return "thrift";
  if (all.includes("flea_market") || /\b(antiques?|vintage|pickers?|flea|salvage|collectibles)\b/.test(n)) return "antique";
  if (all.includes("hardware_store") || /\b(hardware|lumber|building supply|home center)\b/.test(n)) return "hardware";
  if (/\b(feed|seed|co-?op|cooperative|farm supply|farm (&|and) home|mill|hay)\b/.test(n) || all.includes("garden_center")) return "farm_feed";
  if (all.includes("furniture_store") || /\b(furniture|mattress\w*|interiors|furnishings)\b/.test(n)) return "furniture";
  if (all.some((t) => /clothing_store|shoe_store/.test(t)) || /\b(boutique|apparel|clothing|threads|closet|outfitters|western wear|boots)\b/.test(n)) return "boutique";
  return "gift";
}

const LABEL: Record<string, string> = {
  boutique: "Boutique",
  gift: "Gift Shop",
  antique: "Antiques",
  thrift: "Thrift Store",
  florist: "Florist",
  farm_feed: "Feed & Farm Supply",
  furniture: "Furniture",
  hardware: "Hardware Store",
};

const CARRY: Record<string, string[]> = {
  boutique: ["Tops & blouses", "Dresses", "Jeans & bottoms", "Shoes & boots", "Jewelry & accessories", "Gifts"],
  gift: ["Candles & home fragrance", "Home decor", "Jewelry", "Baby & kids gifts", "Kitchen & drinkware", "Cards & party goods"],
  antique: ["Vintage furniture", "Glassware & china", "Primitives & farmhouse", "Signs & decor", "Collectibles", "Books, records & toys"],
  thrift: ["Clothing for the family", "Shoes & handbags", "Furniture", "Housewares & kitchen", "Home decor", "Books & toys"],
  florist: ["Everyday arrangements", "Sympathy & funeral flowers", "Wedding & event flowers", "Plants", "Seasonal & holiday flowers", "Gifts & balloons"],
  farm_feed: ["Livestock & horse feed", "Pet food", "Poultry feed & supplies", "Seed, fertilizer & garden", "Fencing & farm supplies", "Deer & wildlife feed"],
  furniture: ["Living room", "Bedroom", "Dining", "Mattresses", "Home decor & lighting", "Outdoor furniture"],
  hardware: ["Tools & hardware", "Paint & stain", "Plumbing & electrical parts", "Lawn & garden", "Keys, screens & small repairs", "Propane, grills & outdoor"],
};

export function seedRetailCarry(variant: string): Service[] {
  return (CARRY[variant] ?? CARRY.gift!).map((name) => ({ id: name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/-$/, ""), name, featured: true }));
}

function first(r: BusinessRecord): ActionId[] {
  if (r.variant === "florist" && r.ext.retail?.shopUrl) return ["shop", "call"];
  if (r.variant === "farm_feed" || r.variant === "hardware") return ["call", "directions"];
  return ["directions", "call"];
}

function trust(r: BusinessRecord): string[] {
  const out: string[] = [];
  if (r.foundedYear) out.push(`Since ${r.foundedYear}`);
  if (r.ownershipTags.includes("family_owned")) out.push("Family-owned");
  else if (r.ownershipTags.includes("locally_owned")) out.push("Locally owned");
  if (r.ext.retail?.delivery) out.push("Delivery available");
  if (r.ext.retail?.giftCards) out.push("Gift cards");
  return out;
}

function dataFaq(r: BusinessRecord): Faq[] {
  const out: Faq[] = [];
  if (hasAnyHours(r.hours)) out.push({ q: "When are you open?", a: "Our hours are listed on this page, with today highlighted. Holiday hours can change, so give us a call if you're not sure." });
  out.push({ q: "Where are you?", a: `${r.showStreetAddress && r.address.street ? `${r.address.street}, ` : ""}${r.address.city}, ${r.address.state}. Tap Get directions for turn-by-turn directions.` });
  if (r.ext.retail?.shopUrl) out.push({ q: "Can I shop online?", a: r.variant === "florist" ? "Yes. Tap Order flowers to order online, or call us." : "Yes. Tap Shop online to see what we have, or stop by the store." });
  if (r.ext.retail?.giftCards) out.push({ q: "Do you sell gift cards?", a: "Yes. Ask at the counter or give us a call." });
  if (donationsOn(r)) {
    const d = donations(r);
    out.push({ q: "How do I donate?", a: `${d.dropOffHours ? `Drop-off hours are ${d.dropOffHours}. ` : "See the Donations section for what we take. "}${d.pickup ? "For furniture or a big load, ask us about a pickup. " : ""}Not sure about something? Call ${r.phone.display} first.` });
  }
  out.push({ q: "How do I see what's new?", a: Object.values(r.links.social).some(Boolean) ? "Follow us on social media. New things go up there first." : `Give us a call at ${r.phone.display} or stop by. Things change all the time.` });
  return out;
}

const SOCIAL_LABEL: Record<string, string> = { facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", nextdoor: "Nextdoor" };

export function donations(r: BusinessRecord): RetailDonations {
  return r.ext.retail?.donations ?? {};
}

/** True while the owner hasn't told us what they take and when: the required to-do that blocks publishing. */
export function donationsMissing(r: BusinessRecord): boolean {
  const d = donations(r);
  return donationsOn(r) && (!d.accepts?.length || !d.dropOffHours);
}

/** Donations: what they take, what they can't, drop-off hours, and (if they offer it) a pickup request form. Only the owner's own lists. */
function donationsSection(ctx: Ctx): Raw {
  const r = ctx.r;
  if (!donationsOn(r)) return raw("");
  const d = donations(r);
  const call = action(r, "call")!;
  const list = (items: string[], ok: boolean) => html`<ul class="towns">${items.map((t) => html`<li class="chip">${icon(ok ? "check" : "close", 16)}${t}</li>`)}</ul>`;
  const filled = !!(d.accepts?.length || d.doesNotAccept?.length);
  return html`<section class="section" id="donations" aria-labelledby="donations-title"><div class="wrap">
${sectionHead("Donations", "Donate to the store", d.note || "Your donations keep our shelves full. Thank you for thinking of us.", "donations-title")}
${filled ? html`<div class="cols">
<div><h3>We gladly take</h3>${d.accepts?.length ? list(d.accepts, true) : html`<p>Call us and ask.</p>`}</div>
<div><h3>We can't take</h3>${d.doesNotAccept?.length ? list(d.doesNotAccept, false) : html`<p>Not sure about something? Call ${r.phone.display} before you load it up.</p>`}</div>
</div>` : ""}
${d.dropOffHours ? html`<p><strong>Drop-off hours:</strong> ${d.dropOffHours}</p>` : ""}
${d.receipts ? html`<p>We're a nonprofit. Ask at the counter and we'll give you a receipt for your donation.</p>` : ""}
${d.pickup ? html`<p>${d.pickupNote || "Furniture or a big load? We may be able to pick it up."} <a href="#pickup">Request a pickup</a>.</p>` : ""}
<div class="btns">${button(call, "secondary")}${button(action(r, "directions")!, "ghost")}</div>
${donationsMissing(r) ? todo(ctx, "Tell us what you accept for donations and your drop-off hours", "List what you take, what you can't (mattresses, TVs, car seats…), when people can drop things off, and whether you pick up furniture. We only ever show your own list.", true) : ""}
</div></section>
${d.pickup ? contactForm(ctx, [], [], [
  { name: "items", label: "What you'd like picked up", required: true, autocomplete: "off" },
  { name: "address", label: "Address or town", autocomplete: "street-address" },
  { name: "best_day", label: "Best day", autocomplete: "off" },
], d.pickupNote || "Tell us what you have and where it is. We'll call to set up a time.", { id: "pickup", label: "Donations", title: "Request a furniture pickup", topic: "Furniture pickup", button: "Send request", details: "Anything else" }) : ""}`;
}

function ext(r: BusinessRecord): RetailExt {
  return r.ext.retail ?? {};
}

/** Florist occasions the owner didn't change: the usual four. */
export const FLORIST_OCCASIONS = ["Sympathy & funeral", "Weddings & events", "Birthdays & anniversaries", "Just because"];

function floristOccasions(r: BusinessRecord): string[] {
  const own = (ext(r).florist?.occasions ?? []).filter(Boolean);
  return own.length ? own : FLORIST_OCCASIONS;
}

/** Florists: occasion tiles, the delivery rule (same-day only with a cutoff), designer's choice, and the inquiry form. */
function floristSection(ctx: Ctx): Raw {
  const r = ctx.r;
  if (r.variant !== "florist") return raw("");
  const f = ext(r).florist ?? {};
  const shop = r.ext.retail?.shopUrl;
  const occ = floristOccasions(r);
  const inquiry = (o: string) => /sympath|funeral|wedding|event/i.test(o);
  const delivery = deliveryLine(f);
  return html`<section class="section" id="occasions" aria-labelledby="occasions-title"><div class="wrap">
${sectionHead("Occasions", "Flowers for the moment", undefined, "occasions-title")}
<ul class="tiles">${occ.map((o) => {
    const href = inquiry(o) ? "#inquiry" : shop ?? action(r, "call")!.href;
    return html`<li class="tile tile--text"><div class="tile__body"><h3><a href="${href}"${!inquiry(o) && shop ? raw(' target="_blank" rel="noopener"') : ""}>${o}</a></h3><p>${inquiry(o) ? "Tell us about the day and we'll call you." : shop ? "Order online or call us." : `Call ${r.phone.display} to order.`}</p></div></li>`;
  })}</ul>
${delivery ? html`<p class="lead" style="margin-top:24px"><strong>${delivery}</strong></p>` : ""}
${f.designersChoice ? html`<p>Designer's choice: tell us the occasion and a budget, and we'll make something beautiful from what's freshest that day.</p>` : ""}
${delivery ? "" : todo(ctx, "Your delivery rule", "Where you deliver, the same-day cutoff time and the fee, in your words. Until then the site never promises delivery.")}
</div></section>
${contactForm(ctx, [], [], [
  { name: "occasion", label: "Occasion", options: ["Sympathy or funeral", "Wedding", "Party or event", "Something else"], required: true },
  { name: "event_date", label: "Date", type: "date", autocomplete: "off" },
  { name: "budget_range", label: "Budget", options: ["Under $100", "$100 to $250", "$250 to $500", "$500 and up", "Not sure yet"] },
], "Sympathy pieces, weddings and events: tell us a little about the day and we'll call you back to plan it.", { id: "inquiry", label: "Sympathy & weddings", title: "Ask about flowers for an occasion", topic: "Sympathy & weddings", button: "Send request", details: "Colors, flowers you love, the venue" })}`;
}

/** "Same-day delivery in Cullman on orders by 1 PM, $10": only ever from the owner's own rule. */
export function deliveryLine(f: NonNullable<RetailExt["florist"]>): string | undefined {
  if (!f.deliveryArea && !f.cutoff && !f.deliveryFee) return undefined;
  const where = f.deliveryArea ? ` in ${f.deliveryArea}` : "";
  const fee = f.deliveryFee ? `, ${f.deliveryFee}` : "";
  return f.cutoff ? `Same-day delivery${where} on orders by ${f.cutoff}${fee}.` : `We deliver${where}${fee}.`;
}

/** Antique malls, thrift and vendor shops: booth rental, with an inquiry form when booths are open. */
function vendorsSection(ctx: Ctx): Raw {
  const r = ctx.r;
  const v = ext(r).vendors;
  if (!v || (!v.boothsAvailable && !v.note)) return raw("");
  return html`<section class="section section--band" id="vendors" aria-labelledby="vendors-title"><div class="wrap narrow">
${sectionHead("Vendors & booths", v.boothsAvailable ? "Booths available" : "Vendors & booths", v.note || "Interested in selling with us? Tell us what you'd bring and we'll call you back.", "vendors-title")}
<div class="btns">${v.boothsAvailable ? html`<a class="btn btn--primary" href="#booth">${html`<span>Ask about a booth</span>`}</a>` : ""}${button(action(r, "call")!, v.boothsAvailable ? "ghost" : "secondary")}</div>
</div></section>
${v.boothsAvailable ? contactForm(ctx, [], [], [
  { name: "booth", label: "What would you sell, and about how much space?", required: true, autocomplete: "off" },
  { name: "best_day", label: "Best day to call", autocomplete: "off" },
], "Tell us about your things and we'll call you back about space, rates and move-in.", { id: "booth", label: "Vendors", title: "Ask about a booth", topic: "Booth inquiry", button: "Send request", details: "Anything else" }) : ""}`;
}

/** Departments and brand names (text, never logos) for feed, hardware and furniture stores. */
function chipsBlock(title: string, items: string[]): Raw {
  if (!items.length) return raw("");
  return html`<h3 style="margin-top:28px">${title}</h3><ul class="towns">${items.map((t) => html`<li class="chip">${icon("check", 16)}${t}</li>`)}</ul>`;
}

/** Furniture and big-ticket shops: the delivery rule and the financing partner, both in the owner's words. */
function deliveryFinancing(ctx: Ctx): Raw {
  const x = ext(ctx.r);
  const fin = x.financing?.lender ? x.financing : undefined;
  const list = factList([
    { label: "Delivery", text: x.deliveryNote },
    { label: "Financing", text: fin ? `Financing available through ${fin.lender}. Ask in store or apply online.` : undefined },
  ]);
  if (!list.value) return raw("");
  return html`<section class="section" id="delivery" aria-labelledby="delivery-title"><div class="wrap narrow">
${sectionHead("Delivery & financing", "Getting it home", undefined, "delivery-title")}
${list}
${fin?.url ? html`<div class="btns"><a class="btn btn--secondary" href="${fin.url}" target="_blank" rel="noopener"><span>Apply for financing</span><span class="sr"> (opens in new tab)</span></a></div>` : ""}
</div></section>`;
}

/** Boutique and gift occasion tiles (homecoming, game day, prom…), only when the owner listed them. */
function occasionTiles(ctx: Ctx): Raw {
  const r = ctx.r;
  const occ = (ext(r).occasions ?? []).filter(Boolean);
  if (r.variant === "florist" || !occ.length) return raw("");
  return html`<section class="section" id="occasions" aria-labelledby="occasions-title"><div class="wrap">
${sectionHead("Shop by occasion", "What are you dressing for?", undefined, "occasions-title")}
<ul class="towns">${occ.map((o) => html`<li class="chip">${o}</li>`)}</ul>
</div></section>`;
}

/** Claims the copy may not make without the owner's rule: delivery promises, financing terms, booth rates. */
export function retailBannedPhrases(r: BusinessRecord): RegExp[] {
  const x = ext(r);
  const out: RegExp[] = [];
  if (!x.florist?.cutoff) out.push(/\bsame[- ]day\b/i);
  if (!x.deliveryNote && !x.florist?.deliveryArea) out.push(/\bfree delivery\b/i, /\bwe deliver\b/i);
  if (!x.financing?.lender) out.push(/\b(?:financing|0% (?:apr|interest)|no interest|layaway)\b/i);
  if (!x.vendors) out.push(/\bbooth (?:rent|rental|space)s?\b/i);
  return out;
}

export const retailPack: CategoryPack = {
  id: "retail",
  label: "Shops & boutiques",
  titleMode: "name",
  locationModel: "storefront",
  hasForm: (r) => (donationsOn(r) && !!donations(r).pickup) || r.variant === "florist" || !!ext(r).vendors?.boothsAvailable,
  looks: ["retail.shop_window", "retail.mercantile", "retail.bloom", "retail.salvage_yard"],
  defaultLook: (r) =>
    ({ boutique: "retail.shop_window", gift: "retail.mercantile", antique: "retail.salvage_yard", thrift: "retail.salvage_yard", florist: "retail.bloom", farm_feed: "retail.mercantile", furniture: "retail.salvage_yard" } as Record<string, string>)[r.variant] ?? "retail.mercantile",
  variantLabel: (r) => LABEL[r.variant] ?? "Shop",
  schemaType: (r) => ({ boutique: "ClothingStore", florist: "Florist", furniture: "FurnitureStore", farm_feed: "GardenStore", hardware: "HardwareStore", gift: "Store", antique: "Store", thrift: "Store" } as Record<string, string>)[r.variant] ?? "Store",
  schemaExtras: () => ({}),
  homeTitle(r) {
    const l = LABEL[r.variant] ?? "Shop";
    return fitTitle([`${r.name} | ${l} in ${r.address.city}, ${r.address.state}`, `${r.name} | ${l} in ${r.address.city}`, `${r.name} | ${r.address.city}, ${r.address.state}`, r.name]);
  },
  nav: (ctx) => [
    ...(ctx.r.variant === "florist" ? [{ label: "Occasions", href: "/#occasions" }] : []),
    { label: "What we carry", href: "/#carry" },
    { label: "What's new", href: "/#new" },
    ...(donationsOn(ctx.r) ? [{ label: "Donations", href: "/#donations" }] : []),
    ...(ext(ctx.r).vendors?.boothsAvailable || ext(ctx.r).vendors?.note ? [{ label: "Vendors", href: "/#vendors" }] : []),
    { label: "About", href: "/#about" },
    { label: "Hours & location", href: "/#visit" },
  ],
  actionBar: (ctx) => actions(ctx.r, ctx.r.ext.retail?.shopUrl ? [...first(ctx.r), "shop"] : first(ctx.r)).slice(0, 3),
  homeFaq: (ctx) => dataFaq(ctx.r),
  home(ctx: Ctx) {
    const r = ctx.r;
    const label = LABEL[r.variant] ?? "Shop";
    const social = Object.entries(r.links.social).filter(([, u]) => u) as Array<[string, string]>;
    const heroActs = actions(r, r.ext.retail?.shopUrl && r.variant !== "florist" ? [...first(r), "shop"] : donationsOn(r) ? [...first(r), "donate"] : first(r));
    return html`${hero(ctx, {
      eyebrow: `${label} · ${r.address.city}, ${r.address.state}`,
      h1: r.name,
      sub: ctx.copy.heroTagline,
      trust: trust(r),
      showStatus: hasAnyHours(r.hours),
      actions: heroActs,
      badge: r.foundedYear && ctx.theme.knobs.badge === "seal" ? `Since ${r.foundedYear}` : undefined,
      address: true,
    })}
${infoStrip(ctx, [])}
<main id="main">
${floristSection(ctx)}
<section class="section" id="carry" aria-labelledby="carry-title"><div class="wrap">
<span class="section__label">What we carry</span><h2 class="section__title" id="carry-title">${r.variant === "florist" ? "Flowers for every occasion" : r.variant === "farm_feed" || r.variant === "hardware" ? "What you'll find here" : "Come see what's in store"}</h2>
${ctx.copy.heroSub ? html`<p class="lead">${ctx.copy.heroSub}</p>` : ""}
${serviceList(ctx, r.services.map((s) => ({ title: s.name, body: ctx.copy.serviceBlurbs[s.id] })))}
${r.confirmed.includes("services") ? "" : todo(ctx, "Tick what you carry", "We guessed at what you sell. Tell us which of these to keep, what to add, and any brands you'd like listed.", true)}
${chipsBlock("Departments", (ext(r).departments ?? []).filter(Boolean))}
${chipsBlock("Brands we carry", (ext(r).brands ?? []).filter(Boolean))}
</div></section>
${r.variant === "farm_feed" || r.variant === "hardware" ? announcements(ctx, { label: "This season", title: "Coming up at the store" }) : ""}
${occasionTiles(ctx)}
<section class="section section--band" id="new" aria-labelledby="new-title"><div class="wrap">
${sectionHead("What's new", r.variant === "florist" ? "See our latest arrangements" : r.variant === "farm_feed" || r.variant === "hardware" ? "In stock now" : "New things come in all the time", ext(r).dropDay ? ext(r).dropDay : social.length ? "We post new arrivals on social media first. Follow along so you don't miss them." : `Stop by or give us a call at ${r.phone.display} to ask what just came in.`, "new-title")}
${ext(r).dropDay && social.length ? html`<p>We post new arrivals on social media first. Follow along so you don't miss them.</p>` : ""}
${ext(r).holdNote ? html`<p><strong>${ext(r).holdNote}</strong> <a href="${action(r, "call")!.href}">Call ${r.phone.display}</a>.</p>` : ""}
<div class="btns">${social.map(([k, u]) => html`<a class="btn btn--secondary" href="${u}" target="_blank" rel="noopener"><span>Follow us on ${SOCIAL_LABEL[k] ?? k}</span><span class="sr"> (opens in new tab)</span></a>`)}${actions(r, ["shop", "giftcard"]).map((a) => html`<a class="btn btn--ghost" href="${a.href}" target="_blank" rel="noopener"><span>${a.label}</span><span class="sr"> (opens in new tab)</span></a>`)}</div>
${social.length ? "" : todo(ctx, "Add your Facebook or Instagram", "Shops like yours sell new arrivals on social media. Send us your page links and we'll add Follow us buttons.")}
${r.ext.retail?.shopUrl ? "" : todo(ctx, "Do you sell online?", r.variant === "florist" ? "If you take flower orders online, send us the link and we'll add an Order flowers button." : "If you have a Shopify, Etsy or Facebook shop, send us the link and we'll add a Shop online button.")}
</div></section>
${donationsSection(ctx)}
${vendorsSection(ctx)}
${deliveryFinancing(ctx)}
${gallery(ctx, "Send photos of your shop", "Three to six photos of your store, displays and front door. People want to see what it's like inside before they drive over.")}
${reviews(ctx)}
${about(ctx, `About ${r.name}`, "Our story")}
${visit(ctx, "Come see us")}
${faq(dataFaq(r), true)}
${ctaBand(ctx, actions(r, first(r)))}
</main>`;
  },
  pages: () => [],
  bannedPhrases: retailBannedPhrases,
  copyBrief: (r) => ({
    voice: `Friendly and local, a little personality for a ${(LABEL[r.variant] ?? "shop").toLowerCase()} (${
      { boutique: "upbeat and stylish", gift: "warm", antique: "treasure-hunt fun", thrift: "treasure-hunt fun", florist: "graceful and calm", farm_feed: "plain-spoken and practical", furniture: "established and helpful" }[r.variant] ?? "warm"
    }). Short sentences. Never name brands, products, prices, sales, discounts, delivery areas or fees, sizes, stock claims, return policies, years, awards, 'handmade' or 'locally made' claims.`,
    fields: {
      heroTagline: `6-14 words under the shop name saying what kind of shop it is and where, e.g. "Gifts, home decor and little treasures in downtown ${r.address.city}" in your own words.`,
      heroSub: "One sentence (12-22 words) inviting people to come see what the shop carries. General, no specific items or brands.",
      serviceBlurbs: "For each category id, one line (8-16 words) describing the kind of goods in that category. Never specific items, brands, prices or sizes.",
      about:
        "Two short paragraphs (70-120 words total). The owner's story is unknown: write a warm, true introduction to the shop (what kind of shop, who it's for, where) without inventing history, people, years or claims.",
      cta: "ctaTitle: 3-6 words inviting them to stop by. ctaLine: one sentence, at most 16 words.",
      metaDescription: "140-155 characters: shop type + town + what they carry in general + an action (stop by, call).",
    },
  }),
};
