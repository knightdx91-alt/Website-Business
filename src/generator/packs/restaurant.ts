import { action, actions, type Action, type ActionId } from "../actions.ts";
import { about, announcements, button, contactForm, ctaBand, faq, hero, imageTag, infoStrip, reviews, sectionHead, tiles, todo, visit, type Ctx } from "../components.ts";
import { hasAnyHours } from "../hours.ts";
import { html, raw, type Raw } from "../html.ts";
import { MENU_TAG_LABEL, type BusinessRecord, type Faq, type MenuItem, type RestaurantExt } from "../types.ts";
import { fitTitle, type CategoryPack } from "./types.ts";

export const RESTAURANT_VARIANTS = ["food_truck", "bbq", "southern", "diner", "breakfast", "mexican", "pizza", "coffee", "bakery", "cafe", "other"] as const;

const VARIANT_LABEL: Record<string, string> = {
  food_truck: "Food truck",
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
  if (has("food_truck") || /\b(food truck|truck|trailer|on wheels|street eats)\b/.test(n)) return "food_truck";
  if (has("barbecue_restaurant") || /\b(bbq|bar-b-q|barbecue|smokehouse)\b/.test(n)) return "bbq";
  if (has("mexican_restaurant") || /\b(taqueria|cantina|mexican|tacos?)\b/.test(n)) return "mexican";
  if (has("pizza_restaurant") || /\bpizz/.test(n)) return "pizza";
  if (has("coffee_shop") || /\b(coffee|espresso)\b/.test(n)) return "coffee";
  if (has("bakery") || has("donut_shop") || /\b(bakery|donuts?|kolache)\b/.test(n)) return "bakery";
  if (has("breakfast_restaurant") || has("brunch_restaurant") || /\b(pancake|biscuit|waffle)\b/.test(n)) return "breakfast";
  if (has("diner") || /\b(diner|grill)\b/.test(n)) return "diner";
  if (has("cafe") || has("tea_house")) return "cafe";
  if (has("american_restaurant") || has("seafood_restaurant") || has("steak_house") || /\b(kitchen|catfish|seafood|fish (house|camp)|meat|country)\b/.test(n)) return "southern";
  return "other";
}

const LOOK_BY_VARIANT: Record<string, string> = {
  food_truck: "restaurant.color_block",
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
  if (r.variant === "food_truck")
    out.push({ q: "Where will the truck be?", a: r.links.social.facebook ? "We post our stops on our Facebook page. Check there for this week's spots, or give us a call." : `Give us a call at ${r.phone.display} to find out where we'll be this week.` });
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

/** Dine-in places with a reservations link lead with Reserve; everyone else with Order online, then Call. */
function primaryAction(r: BusinessRecord): ActionId {
  if (reservesFirst(r)) return "reserve";
  return r.links.order ? "order" : "call";
}

function reservesFirst(r: BusinessRecord): boolean {
  return !!r.links.reserve && r.variant !== "food_truck" && ext(r).serviceOptions.dineIn !== false;
}

const bookTruck: Action = { id: "quote", label: "Book the truck", short: "Book", href: "#book", external: false, icon: "calendar" };
const cateringAct: Action = { id: "quote", label: "Request catering", short: "Catering", href: "#catering", external: false, icon: "clipboard" };

/** True when the menu holds something worth a photo tile: an owner photo or a "popular" tag. */
function popularItems(r: BusinessRecord, mode: Ctx["mode"]): MenuItem[] {
  const items = ext(r).menu?.sections.flatMap((s) => s.items) ?? [];
  const photo = (i: MenuItem) => !!i.image && (mode === "preview" || i.image.source !== "google");
  const pop = (i: MenuItem) => i.tags?.includes("popular") || i.tags?.includes("house_favorite");
  return [...items.filter((i) => photo(i) && pop(i)), ...items.filter((i) => photo(i) && !pop(i)), ...items.filter((i) => !photo(i) && pop(i))].slice(0, 4);
}

const tagLabels = (i: MenuItem) => (i.tags ?? []).map((t) => MENU_TAG_LABEL[t]).filter(Boolean);

/** "More ways to order": third-party partners, gift cards and rewards, only from links the owner gave. */
function orderRow(ctx: Ctx): Raw {
  const r = ctx.r;
  const d = ext(r).deliveryLinks ?? {};
  const partners = ([["doordash", "DoorDash"], ["ubereats", "Uber Eats"], ["grubhub", "Grubhub"]] as const).filter(([k]) => d[k]);
  const extras = actions(r, ["giftcard", "rewards"]);
  if (!partners.length && !extras.length) return raw("");
  return html`<section class="section section--band" id="order" aria-labelledby="order-title"><div class="wrap narrow">
${sectionHead("More ways to order", partners.length ? "Order through" : "Gift cards & rewards", undefined, "order-title")}
${partners.length ? html`<div class="btns">${partners.map(([k, name]) => html`<a class="btn btn--secondary" href="${d[k]}" target="_blank" rel="noopener">${name}<span class="sr"> (opens in new tab)</span></a>`)}</div>` : ""}
${extras.length ? html`<div class="btns"${partners.length ? raw(' style="margin-top:12px"') : ""}>${extras.map((a) => button(a, "ghost"))}</div>` : ""}
</div></section>`;
}

/** Catering: a short band and a request form, only when the owner said they cater. */
function catering(ctx: Ctx): Raw {
  const e = ext(ctx.r);
  if (!e.catering) return raw("");
  return html`<section class="section" id="catering" aria-labelledby="catering-title"><div class="wrap narrow">
${sectionHead("Catering", "We cater", e.cateringNote || "Feeding a crowd? Tell us the date, the headcount and what you have in mind, and we'll call you back with options.", "catering-title")}
<div class="btns">${button(cateringAct, "primary")}${button(action(ctx.r, "call")!, "ghost")}</div>
${e.cateringNote ? "" : todo(ctx, "What do you cater?", "One or two lines in your words: plates or pans, how many people, what kinds of events. We'll put it in the Catering section.")}
</div></section>
${contactForm(ctx, [], [], [
  { name: "event_date", label: "Event date", type: "date", autocomplete: "off" },
  { name: "guests", label: "About how many people?", inputmode: "numeric", autocomplete: "off" },
  { name: "needs", label: "What are you thinking? (drop-off, set up, serving)", autocomplete: "off" },
], "Tell us about the event and we'll call you back to work out the menu.", { id: "catering-form", label: "Catering", title: "Request catering", topic: "Catering", button: "Send request", details: "Anything else" })}`;
}

/** Food trucks: this week's stops (shared dated events), the full schedule link, and a "Book the truck" form. */
function truck(ctx: Ctx): Raw {
  const r = ctx.r;
  if (r.variant !== "food_truck") return raw("");
  const cal = ext(r).calendarUrl;
  const fb = r.links.social.facebook;
  const week = announcements(ctx, { label: "This week", title: "Where to find us", intro: cal || fb ? undefined : `Stops change week to week. Call ${r.phone.display} if you don't see yours.` });
  const links = html`<div class="btns">${cal ? html`<a class="btn btn--secondary" href="${cal}" target="_blank" rel="noopener">${html`<span>Full schedule</span>`}<span class="sr"> (opens in new tab)</span></a>` : fb ? html`<a class="btn btn--secondary" href="${fb}" target="_blank" rel="noopener"><span>This week's stops on Facebook</span><span class="sr"> (opens in new tab)</span></a>` : ""}${button(bookTruck, cal || fb ? "ghost" : "primary")}</div>`;
  const where = week.value
    ? week.value.replace("</div></section>", `${links.value}</div></section>`)
    : html`<section class="section section--band" id="events" aria-labelledby="events-title"><div class="wrap narrow">
${sectionHead("This week", "Where to find us", cal ? "Our stops are on the schedule, updated every week." : fb ? "We post this week's stops on Facebook." : `Call ${r.phone.display} to find out where we'll be this week.`, "events-title")}
${links}
${cal || fb ? "" : todo(ctx, "Where can people find you?", "Type this week's stops into Events & specials (day, time, place), or give us the link where you post them, and this section fills in.")}
</div></section>`.value;
  return html`${raw(where)}
${contactForm(ctx, [], [], [
  { name: "event_date", label: "Event date", type: "date", autocomplete: "off" },
  { name: "guests", label: "About how many people?", inputmode: "numeric", autocomplete: "off" },
  { name: "location", label: "Where is it?", autocomplete: "off" },
], "Want the truck at your event, business or party? Tell us when and where and we'll call you back.", { id: "book", label: "Private events", title: "Book the truck", topic: "Book the truck", button: "Send request", details: "Anything else" })}`;
}

function menuHighlights(ctx: Ctx): ReturnType<typeof html> {
  const menu = ext(ctx.r).menu;
  const menuBtn = action(ctx.r, "menu")!;
  if (!menu) {
    return html`<section class="section section--surface" id="menu" aria-labelledby="menu-title"><div class="wrap">
${sectionHead("On the menu", "What we're serving", undefined, "menu-title")}
${ctx.r.variant === "food_truck" ? todo(ctx, "Where can people find you?", "Tell us your regular stops and days (or the page where you post them), and we'll put a schedule section on the site.") : ""}
${todo(ctx, "Send us your menu", "Snap a photo of your printed menu and we'll type it in, with prices, so people can read it on their phones and find it on Google.", true)}
<div class="btns">${button(menuBtn, "secondary")}${button(action(ctx.r, "call")!, "ghost")}</div>
</div></section>`;
  }
  const popular = popularItems(ctx.r, ctx.mode);
  if (popular.length >= 2) {
    // Photo tiles: dish photos are the single biggest "wow" on a restaurant site (research/trends-2026 §1D).
    return html`<section class="section section--surface" id="menu" aria-labelledby="menu-title"><div class="wrap">
${sectionHead("On the menu", "Popular", undefined, "menu-title")}
${tiles(popular.map((i) => ({ title: i.name, price: i.price, body: i.description, image: i.image && (ctx.mode === "preview" || i.image.source !== "google") ? i.image : undefined, tags: tagLabels(i).filter((t) => t !== "Popular"), href: "/menu/" })))}
${popular.some((i) => i.image) ? "" : todo(ctx, "Send photos of your popular dishes", "A phone photo of each of your 3-4 best sellers. We'll put them on these tiles; photos of the food are what make people choose a place.")}
<div class="btns" style="margin-top:24px">${button(menuBtn, "secondary")}</div>
</div></section>`;
  }
  const names = new Set(ext(ctx.r).highlights ?? []);
  const items = menu.sections.flatMap((s) => s.items).filter((i) => names.size === 0 || names.has(i.name)).slice(0, 6);
  return html`<section class="section section--surface" id="menu" aria-labelledby="menu-title"><div class="wrap">
${sectionHead("On the menu", names.size ? "Customer favorites" : "From the menu", undefined, "menu-title")}
<ul class="cards cards--3">${items.map(
    (i) => html`<li class="card"><h3>${i.name}</h3>${i.price ? html`<p class="price">${i.price}</p>` : ""}${tagLabels(i).length ? html`<p class="tags">${tagLabels(i).map((t) => html`<span class="tag">${t}</span>`)}</p>` : ""}${i.description ? html`<p>${i.description}</p>` : ""}</li>`,
  )}</ul>
${todo(ctx, "Send photos of your popular dishes", "A phone photo of each of your 3-4 best sellers, and tell us which items are the favorites. The menu section turns into photo tiles.")}
<div class="btns" style="margin-top:24px">${button(menuBtn, "secondary")}</div>
</div></section>`;
}

function usedTags(items: MenuItem[]): string[] {
  return [...new Set(items.flatMap(tagLabels))];
}

function menuPage(ctx: Ctx) {
  const menu = ext(ctx.r).menu;
  const call = action(ctx.r, "call")!;
  const order = action(ctx.r, "order");
  const body = menu
    ? html`<nav class="menu-nav" aria-label="Menu sections">${menu.sections.map((s, i) => html`<a href="#sec-${i}">${s.name}</a>`)}</nav>
${menu.sections.map(
  (s, i) => html`<section class="menu-sec" id="sec-${i}" aria-labelledby="sec-${i}-t"><h2 id="sec-${i}-t">${s.name}</h2>${s.note ? html`<p class="muted">${s.note}</p>` : ""}
<ul class="menu-items">${s.items.map((it) => {
    const img = it.image && (ctx.mode === "preview" || it.image.source !== "google") ? it.image : undefined;
    const body = html`<div class="menu-item__row"><span>${it.name}</span><span class="dots" aria-hidden="true"></span>${it.price ? html`<span>${it.price}</span>` : ""}</div>${
      tagLabels(it).length ? html`<p class="tags">${tagLabels(it).map((t) => html`<span class="tag">${t}</span>`)}</p>` : ""
    }${it.description ? html`<p>${it.description}</p>` : ""}`;
    return img ? html`<li class="menu-item menu-item--photo">${imageTag(img, { cls: "menu-item__img" })}<div>${body}</div></li>` : html`<li class="menu-item">${body}</li>`;
  })}</ul></section>`,
)}
${usedTags(menu.sections.flatMap((x) => x.items)).length ? html`<p class="menu-legend" aria-label="Menu tags">${usedTags(menu.sections.flatMap((x) => x.items)).map((t) => html`<span class="tag">${t}</span>`)}</p>` : ""}
<p class="muted">Menu updated ${menu.lastUpdated}. Prices and items can change.</p>`
    : html`${todo(ctx, "Send us your menu", "We'll type your full menu here, grouped by section with prices, so it's easy to read on a phone.", true)}
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

/** Claims the copy may not make unless the owner's facts back them: catering, third-party delivery, rewards, gift cards. */
export function restaurantBannedPhrases(r: BusinessRecord): RegExp[] {
  const e = ext(r);
  const out: RegExp[] = [];
  if (!e.catering) out.push(/\bcater(?:ing|ed|s)?\b/i);
  const d = e.deliveryLinks ?? {};
  if (!d.doordash) out.push(/\bdoor ?dash\b/i);
  if (!d.ubereats) out.push(/\buber ?eats\b/i);
  if (!d.grubhub) out.push(/\bgrub ?hub\b/i);
  if (!e.rewardsUrl) out.push(/\b(?:rewards|loyalty) (?:program|club|app)\b/i);
  if (!r.links.giftCards) out.push(/\bgift cards?\b/i);
  return out;
}

export const restaurantPack: CategoryPack = {
  id: "restaurant",
  label: "Restaurants and cafes",
  titleMode: "name",
  locationModel: "storefront",
  hasForm: (r) => !!ext(r).catering || r.variant === "food_truck",
  looks: ["restaurant.pit_plank", "restaurant.blue_plate", "restaurant.garden_table", "restaurant.color_block"],
  defaultLook: (r) => LOOK_BY_VARIANT[r.variant] ?? "restaurant.color_block",
  variantLabel: (r) => VARIANT_LABEL[r.variant] ?? "Restaurant",
  schemaType: (r) => (r.variant === "coffee" ? "CafeOrCoffeeShop" : r.variant === "bakery" ? "Bakery" : r.variant === "food_truck" ? "FoodEstablishment" : "Restaurant"),
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
    ...(ctx.r.variant === "food_truck" ? [{ label: "Find us", href: "/#events" }, { label: "Book the truck", href: "/#book" }] : []),
    ...(ext(ctx.r).catering ? [{ label: "Catering", href: "/#catering" }] : []),
    { label: "About", href: "/#about" },
    { label: "Reviews", href: "/#reviews" },
    { label: "Hours & location", href: "/#visit" },
    ...(dataFaq(ctx.r).length >= 3 ? [{ label: "FAQ", href: "/#faq" }] : []),
  ],
  actionBar: (ctx) => actions(ctx.r, ["call", reservesFirst(ctx.r) ? "reserve" : ctx.r.links.order ? "order" : "menu", "directions"]),
  homeFaq: (ctx) => dataFaq(ctx.r),
  home(ctx) {
    const r = ctx.r;
    const cuisine = ctx.copy.cuisineLabel ?? VARIANT_LABEL[r.variant] ?? "Restaurant";
    const trust: string[] = [];
    if (r.foundedYear) trust.push(`Serving ${r.address.city} since ${r.foundedYear}`);
    if (r.ownershipTags.includes("family_owned")) trust.push("Family-owned");
    const prim = primaryAction(r);
    const heroActs = r.variant === "food_truck" ? [...actions(r, [prim]), bookTruck] : actions(r, [prim, prim === "reserve" && r.links.order ? "order" : "menu"]);
    const ctaActs = actions(r, [prim, "directions"]);
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
${r.variant === "food_truck" ? truck(ctx) : ""}
${menuHighlights(ctx)}
${orderRow(ctx)}
${catering(ctx)}
${about(ctx, `About ${r.name}`, "Our story")}
${reviews(ctx, true)}
${visit(ctx)}
${faq(dataFaq(r), true)}
${ctaBand(ctx, ctaActs)}
</main>`;
  },
  pages: (ctx) => [menuPage(ctx)],
  bannedPhrases: restaurantBannedPhrases,
  copyBrief: (r) => ({
    voice:
      "Warm, plain, specific and local. Short sentences. Talk like a friendly regular, not an ad agency. 'Y'all' at most once, or not at all. Never invent dishes, prices, years, family names or awards.",
    fields: {
      cuisineLabel: `Short cuisine label for this place, 1-4 words, e.g. "Smokehouse BBQ", "Mexican restaurant", "Coffee shop & bakery". Base it on the Places type and name. Current guess: ${VARIANT_LABEL[r.variant]}.`,
      heroTagline: "A 4-8 word tagline that says what they're about. Not a slogan with superlatives.",
      heroSub: "One line, at most 15 words, naming what they serve and the town.",
      about:
        `Two short paragraphs (80-130 words total) introducing the place to a newcomer: what kind of food, the feel of the place, who it's for. Use only facts given. Don't list amenities or options (kids menu, wheelchair access, dogs, reservations, vegetarian choices); the FAQ covers those. Where the owner's story is unknown, stay general and true; do not invent history.${
          ext(r).catering ? " They cater (catering fact given): one sentence may say so, with no prices, headcounts or menus beyond the catering note." : " Never mention catering."
        }${r.variant === "food_truck" ? " Never state stops, days or locations; the schedule section shows them." : ""}`,
      cta: "ctaTitle: 3-7 word invitation to come by or order. ctaLine: one sentence, at most 18 words.",
      metaDescription: "140-155 characters: cuisine + town + one true fact + an action (call, order, visit).",
    },
  }),
};

