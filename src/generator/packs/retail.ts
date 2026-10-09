import { actions, type ActionId } from "../actions.ts";
import { about, cardGrid, ctaBand, faq, gallery, hero, infoStrip, reviews, sectionHead, todo, visit, type Ctx } from "../components.ts";
import { hasAnyHours } from "../hours.ts";
import { html } from "../html.ts";
import type { BusinessRecord, Faq, Service } from "../types.ts";
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
  out.push({ q: "How do I see what's new?", a: Object.values(r.links.social).some(Boolean) ? "Follow us on social media. New things go up there first." : `Give us a call at ${r.phone.display} or stop by. Things change all the time.` });
  return out;
}

const SOCIAL_LABEL: Record<string, string> = { facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", nextdoor: "Nextdoor" };

export const retailPack: CategoryPack = {
  id: "retail",
  label: "Shops & boutiques",
  titleMode: "name",
  locationModel: "storefront",
  hasForm: () => false,
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
  nav: () => [
    { label: "What we carry", href: "/#carry" },
    { label: "What's new", href: "/#new" },
    { label: "About", href: "/#about" },
    { label: "Hours & location", href: "/#visit" },
  ],
  actionBar: (ctx) => actions(ctx.r, ctx.r.ext.retail?.shopUrl ? [...first(ctx.r), "shop"] : first(ctx.r)).slice(0, 3),
  homeFaq: (ctx) => dataFaq(ctx.r),
  home(ctx: Ctx) {
    const r = ctx.r;
    const label = LABEL[r.variant] ?? "Shop";
    const social = Object.entries(r.links.social).filter(([, u]) => u) as Array<[string, string]>;
    const heroActs = actions(r, r.ext.retail?.shopUrl && r.variant !== "florist" ? [...first(r), "shop"] : first(r));
    return html`${hero(ctx, {
      eyebrow: `${label} · ${r.address.city}, ${r.address.state}`,
      h1: r.name,
      sub: ctx.copy.heroTagline,
      trust: trust(r),
      showStatus: hasAnyHours(r.hours),
      actions: heroActs,
      badge: r.foundedYear && ctx.theme.knobs.badge === "seal" ? `Since ${r.foundedYear}` : undefined,
    })}
${infoStrip(ctx, [])}
<main id="main">
<section class="section" id="carry" aria-labelledby="carry-title"><div class="wrap">
<span class="section__label">What we carry</span><h2 class="section__title" id="carry-title">${r.variant === "florist" ? "Flowers for every occasion" : r.variant === "farm_feed" || r.variant === "hardware" ? "What you'll find here" : "Come see what's in store"}</h2>
${ctx.copy.heroSub ? html`<p class="lead">${ctx.copy.heroSub}</p>` : ""}
${cardGrid(r.services.map((s) => ({ title: s.name, body: ctx.copy.serviceBlurbs[s.id] })))}
${r.confirmed.includes("services") ? "" : todo(ctx, "Tick what you carry", "We guessed at what you sell. Tell us which of these to keep, what to add, and any brands you'd like listed.", true)}
</div></section>
<section class="section section--band" id="new" aria-labelledby="new-title"><div class="wrap">
${sectionHead("What's new", r.variant === "florist" ? "See our latest arrangements" : r.variant === "farm_feed" || r.variant === "hardware" ? "In stock now" : "New things come in all the time", social.length ? "We post new arrivals on social media first. Follow along so you don't miss them." : `Stop by or give us a call at ${r.phone.display} to ask what just came in.`, "new-title")}
<div class="btns">${social.map(([k, u]) => html`<a class="btn btn--secondary" href="${u}" target="_blank" rel="noopener"><span>Follow us on ${SOCIAL_LABEL[k] ?? k}</span><span class="sr"> (opens in new tab)</span></a>`)}${actions(r, ["shop"]).map((a) => html`<a class="btn btn--ghost" href="${a.href}" target="_blank" rel="noopener"><span>${a.label}</span><span class="sr"> (opens in new tab)</span></a>`)}</div>
${social.length ? "" : todo(ctx, "Add your Facebook or Instagram", "Shops like yours sell new arrivals on social media. Send us your page links and we'll add Follow us buttons.")}
${r.ext.retail?.shopUrl ? "" : todo(ctx, "Do you sell online?", r.variant === "florist" ? "If you take flower orders online, send us the link and we'll add an Order flowers button." : "If you have a Shopify, Etsy or Facebook shop, send us the link and we'll add a Shop online button.")}
</div></section>
${gallery(ctx, "Send photos of your shop", "Three to six photos of your store, displays and front door. People want to see what it's like inside before they drive over.")}
${reviews(ctx)}
${about(ctx, `About ${r.name}`, "Our story")}
${visit(ctx, "Come see us")}
${faq(dataFaq(r), true)}
${ctaBand(ctx, actions(r, first(r)))}
</main>`;
  },
  pages: () => [],
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
