import { action, actions, type ActionId } from "../actions.ts";
import { about, button, ctaBand, faq, hero, infoStrip, reviews, sectionHead, todo, visit, type Ctx } from "../components.ts";
import { hasAnyHours } from "../hours.ts";
import { html } from "../html.ts";
import type { BusinessRecord, Faq, RestaurantExt } from "../types.ts";
import { fitTitle, type CategoryPack } from "./types.ts";

export const RESTAURANT_VARIANTS = ["bbq", "southern", "diner", "breakfast", "mexican", "pizza", "coffee", "bakery", "cafe", "other"] as const;

const VARIANT_LABEL: Record<string, string> = {
  bbq: "BBQ",
  southern: "Southern cooking",
  diner: "Diner",
  breakfast: "Breakfast & brunch",
  mexican: "Mexican food",
  pizza: "Pizza",
  coffee: "Coffee",
  bakery: "Bakery",
  cafe: "Cafe",
  other: "Restaurant",
};

/** Maps Google Places types to our variant. Owner confirms. */
export function restaurantVariant(primaryType: string | undefined, types: string[], name: string): string {
  const all = [primaryType ?? "", ...types];
  const has = (t: string) => all.includes(t);
  const n = name.toLowerCase();
  if (has("barbecue_restaurant") || /\b(bbq|bar-b-q|barbecue|smokehouse)\b/.test(n)) return "bbq";
  if (has("mexican_restaurant") || /\b(taqueria|cantina|mexican|tacos?)\b/.test(n)) return "mexican";
  if (has("pizza_restaurant") || /\bpizz/.test(n)) return "pizza";
  if (has("coffee_shop") || /\b(coffee|espresso)\b/.test(n)) return "coffee";
  if (has("bakery") || has("donut_shop") || /\b(bakery|donuts?|kolache)\b/.test(n)) return "bakery";
  if (has("breakfast_restaurant") || has("brunch_restaurant") || /\b(pancake|biscuit|waffle)\b/.test(n)) return "breakfast";
  if (has("diner") || /\b(diner|grill)\b/.test(n)) return "diner";
  if (has("cafe") || has("tea_house")) return "cafe";
  if (has("american_restaurant") || has("seafood_restaurant") || has("steak_house") || /\b(kitchen|catfish|meat|country)\b/.test(n)) return "southern";
  return "other";
}

const LOOK_BY_VARIANT: Record<string, string> = {
  bbq: "restaurant.pit_plank",
  southern: "restaurant.pit_plank",
  diner: "restaurant.blue_plate",
  breakfast: "restaurant.blue_plate",
  coffee: "restaurant.garden_table",
  bakery: "restaurant.garden_table",
  cafe: "restaurant.garden_table",
  mexican: "restaurant.color_block",
  pizza: "restaurant.color_block",
  other: "restaurant.color_block",
};

function ext(r: BusinessRecord): RestaurantExt {
  return r.ext.restaurant ?? { serviceOptions: {} };
}

const CHIP_LABELS: Array<[keyof RestaurantExt["serviceOptions"], string]> = [
  ["dineIn", "Dine-in"],
  ["takeout", "Takeout"],
  ["delivery", "Delivery"],
  ["curbsidePickup", "Curbside pickup"],
  ["reservable", "Reservations"],
  ["outdoorSeating", "Outdoor seating"],
];

function chips(r: BusinessRecord): string[] {
  const so = ext(r).serviceOptions;
  return CHIP_LABELS.filter(([k]) => so[k] === true).map(([, l]) => l);
}

function meals(r: BusinessRecord): string[] {
  const so = ext(r).serviceOptions;
  const out: string[] = [];
  if (so.servesBreakfast) out.push("breakfast");
  if (so.servesBrunch) out.push("brunch");
  if (so.servesLunch) out.push("lunch");
  if (so.servesDinner) out.push("dinner");
  return out;
}

function listJoin(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** FAQ built only from data we hold (Places booleans, owner links). No AI facts. */
function dataFaq(r: BusinessRecord): Faq[] {
  const so = ext(r).serviceOptions;
  const out: Faq[] = [];
  const m = meals(r);
  if (m.length) out.push({ q: "What meals do you serve?", a: `We serve ${listJoin(m)}. Check our hours below for today's times.` });
  if (so.reservable === true)
    out.push({ q: "Do you take reservations?", a: r.links.reserve ? "Yes. You can reserve a table online, or call us." : `Yes. Call us at ${r.phone.display} to reserve a table.` });
  if (so.reservable === false) out.push({ q: "Do you take reservations?", a: "No reservations needed. Just come on in." });
  if (so.takeout === true)
    out.push({ q: "Can I order takeout?", a: r.links.order ? "Yes. Order online or call ahead, and we'll have it ready." : `Yes. Call ahead at ${r.phone.display} and we'll have it ready.` });
  if (so.delivery === true) out.push({ q: "Do you deliver?", a: "Yes, we offer delivery. Call us or order online to check if we deliver to you." });
  if (so.delivery === false) out.push({ q: "Do you deliver?", a: "We don't offer delivery right now, but takeout is easy. Call ahead and swing by." });
  if (so.outdoorSeating === true) out.push({ q: "Do you have outdoor seating?", a: "Yes, we have outdoor seating when the weather's nice." });
  if (so.menuForChildren === true) out.push({ q: "Do you have a kids menu?", a: "Yes, we have a kids menu." });
  if (so.servesVegetarianFood === true) out.push({ q: "Do you have vegetarian options?", a: "Yes, we have vegetarian options on the menu." });
  if (so.wheelchairAccessibleEntrance === true) out.push({ q: "Is the restaurant wheelchair accessible?", a: "Yes, our entrance is wheelchair accessible." });
  if (so.allowsDogs === true) out.push({ q: "Are dogs allowed?", a: "Yes, well-behaved dogs are welcome." });
  return out.slice(0, 6);
}

function primaryAction(r: BusinessRecord): ActionId {
  return r.links.order ? "order" : "call";
}

function menuHighlights(ctx: Ctx): ReturnType<typeof html> {
  const menu = ext(ctx.r).menu;
  const menuBtn = action(ctx.r, "menu")!;
  if (!menu) {
    return html`<section class="section section--surface" id="menu" aria-labelledby="menu-title"><div class="wrap">
${sectionHead("On the menu", "What we're serving")}
${todo(ctx, "Send us your menu", "Snap a photo of your printed menu and we'll type it in, with prices, so people can read it on their phones and find it on Google.")}
<div class="btns">${button(menuBtn, "secondary")}${button(action(ctx.r, "call")!, "ghost")}</div>
</div></section>`;
  }
  const names = new Set(ext(ctx.r).highlights ?? []);
  const items = menu.sections.flatMap((s) => s.items).filter((i) => names.size === 0 || names.has(i.name)).slice(0, 6);
  return html`<section class="section section--surface" id="menu" aria-labelledby="menu-title"><div class="wrap">
${sectionHead("On the menu", "Customer favorites")}
<ul class="cards cards--3">${items.map(
    (i) => html`<li class="card"><h3>${i.name}</h3>${i.price ? html`<p class="price">${i.price}</p>` : ""}${i.description ? html`<p>${i.description}</p>` : ""}</li>`,
  )}</ul>
<div class="btns" style="margin-top:24px">${button(menuBtn, "secondary")}</div>
</div></section>`;
}

function menuPage(ctx: Ctx) {
  const menu = ext(ctx.r).menu;
  const call = action(ctx.r, "call")!;
  const order = action(ctx.r, "order");
  const body = menu
    ? html`<nav class="menu-nav" aria-label="Menu sections">${menu.sections.map((s, i) => html`<a href="#sec-${i}">${s.name}</a>`)}</nav>
${menu.sections.map(
  (s, i) => html`<section class="menu-sec" id="sec-${i}" aria-labelledby="sec-${i}-t"><h2 id="sec-${i}-t">${s.name}</h2>${s.note ? html`<p class="muted">${s.note}</p>` : ""}
<ul class="menu-items">${s.items.map(
    (it) => html`<li class="menu-item"><div class="menu-item__row"><span>${it.name}</span><span class="dots" aria-hidden="true"></span>${it.price ? html`<span>${it.price}</span>` : ""}</div>${
      it.description ? html`<p>${it.description}</p>` : ""
    }</li>`,
  )}</ul></section>`,
)}
<p class="muted">Menu updated ${menu.lastUpdated}. Prices and items can change.</p>`
    : html`${todo(ctx, "Send us your menu", "We'll type your full menu here, grouped by section with prices, so it's easy to read on a phone.")}
<p class="lead">Call us for today's menu and specials.</p>`;
  return {
    path: "/menu/",
    title: fitTitle([`Menu | ${ctx.r.name}, ${ctx.r.address.city} ${ctx.r.address.state}`, `Menu | ${ctx.r.name}`]),
    description: `The menu for ${ctx.r.name} in ${ctx.r.address.city}, ${ctx.r.address.state}, ${menu ? "with prices and today's options" : "plus today's specials"}. Call ${ctx.r.phone.display}${order ? " or order online for pickup" : " to order ahead for pickup"}.`,
    crumb: "Menu",
    body: html`<section class="section"><div class="wrap narrow">
<span class="section__label">${ctx.r.name}</span><h1>Menu</h1>
${body}
<div class="btns" style="margin-top:28px">${order ? button(order, "primary") : ""}${button(call, order ? "ghost" : "primary")}</div>
</div></section>`,
  };
}

export const restaurantPack: CategoryPack = {
  id: "restaurant",
  label: "Restaurants and cafes",
  titleMode: "name",
  locationModel: "storefront",
  hasForm: () => false,
  looks: ["restaurant.pit_plank", "restaurant.blue_plate", "restaurant.garden_table", "restaurant.color_block"],
  defaultLook: (r) => LOOK_BY_VARIANT[r.variant] ?? "restaurant.color_block",
  variantLabel: (r) => VARIANT_LABEL[r.variant] ?? "Restaurant",
  schemaType: (r) => (r.variant === "coffee" ? "CafeOrCoffeeShop" : r.variant === "bakery" ? "Bakery" : "Restaurant"),
  schemaExtras(ctx) {
    const e = ext(ctx.r);
    const out: Record<string, unknown> = { hasMenu: `${ctx.site.origin ?? `https://${ctx.site.slug}.pages.dev`}/menu/` };
    if (!["coffee", "bakery"].includes(ctx.r.variant)) out.servesCuisine = ctx.copy.cuisineLabel ?? VARIANT_LABEL[ctx.r.variant];
    if (e.serviceOptions.reservable !== undefined) out.acceptsReservations = e.serviceOptions.reservable;
    if (e.priceLevel) out.priceRange = "$".repeat(e.priceLevel);
    const pa: object[] = [];
    if (ctx.r.links.order) pa.push({ "@type": "OrderAction", target: ctx.r.links.order });
    if (ctx.r.links.reserve) pa.push({ "@type": "ReserveAction", target: ctx.r.links.reserve });
    if (pa.length) out.potentialAction = pa;
    return out;
  },
  homeTitle(r, cuisine) {
    const label = cuisine ?? VARIANT_LABEL[r.variant] ?? "Restaurant";
    return fitTitle([`${r.name} | ${label} in ${r.address.city}, ${r.address.state}`, `${r.name} | ${label} in ${r.address.city}`, `${r.name} | ${r.address.city}, ${r.address.state}`, r.name]);
  },
  nav: (ctx) => [
    { label: "Menu", href: "/menu/" },
    { label: "About", href: "/#about" },
    { label: "Reviews", href: "/#reviews" },
    { label: "Hours & location", href: "/#visit" },
    ...(dataFaq(ctx.r).length >= 3 ? [{ label: "FAQ", href: "/#faq" }] : []),
  ],
  actionBar: (ctx) => actions(ctx.r, ["call", ctx.r.links.order ? "order" : "menu", "directions"]),
  homeFaq: (ctx) => dataFaq(ctx.r),
  home(ctx) {
    const r = ctx.r;
    const cuisine = ctx.copy.cuisineLabel ?? VARIANT_LABEL[r.variant] ?? "Restaurant";
    const trust: string[] = [];
    if (r.foundedYear) trust.push(`Serving ${r.address.city} since ${r.foundedYear}`);
    if (r.ownershipTags.includes("family_owned")) trust.push("Family-owned");
    const heroActs = actions(r, [primaryAction(r), "menu"]);
    const ctaActs = actions(r, [primaryAction(r), "directions"]);
    return html`${hero(ctx, {
      eyebrow: `${cuisine} · ${r.address.city}, ${r.address.state}`,
      h1: r.name,
      sub: ctx.copy.heroTagline,
      trust,
      showStatus: hasAnyHours(r.hours),
      actions: heroActs,
      badge: r.foundedYear && ctx.theme.knobs.badge === "stamp" ? `Since ${r.foundedYear}` : undefined,
    })}
${infoStrip(ctx, chips(r))}
<main id="main">
${menuHighlights(ctx)}
${about(ctx, `About ${r.name}`, "Our story")}
${reviews(ctx, true)}
${visit(ctx)}
${faq(dataFaq(r), true)}
${ctaBand(ctx, ctaActs)}
</main>`;
  },
  pages: (ctx) => [menuPage(ctx)],
  copyBrief: (r) => ({
    voice:
      "Warm, plain, specific and local. Short sentences. Talk like a friendly regular, not an ad agency. 'Y'all' at most once, or not at all. Never invent dishes, prices, years, family names or awards.",
    fields: {
      cuisineLabel: `Short cuisine label for this place, 1-4 words, e.g. "Smokehouse BBQ", "Mexican restaurant", "Coffee shop & bakery". Base it on the Places type and name. Current guess: ${VARIANT_LABEL[r.variant]}.`,
      heroTagline: "A 4-8 word tagline that says what they're about. Not a slogan with superlatives.",
      heroSub: "One line, at most 15 words, naming what they serve and the town.",
      about:
        "Two short paragraphs (80-130 words total) introducing the place to a newcomer: what kind of food, the feel of the place, who it's for. Use only facts given. Don't list amenities or options (kids menu, wheelchair access, dogs, reservations, vegetarian choices); the FAQ covers those. Where the owner's story is unknown, stay general and true; do not invent history.",
      cta: "ctaTitle: 3-7 word invitation to come by or order. ctaLine: one sentence, at most 18 words.",
      metaDescription: "140-155 characters: cuisine + town + one true fact + an action (call, order, visit).",
    },
  }),
};

