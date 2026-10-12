import { action } from "./actions.ts";
import { button, imageTag, type Ctx, type NavItem } from "./components.ts";
import { html, raw } from "./html.ts";
import { sectionSlug } from "./packs/retail.ts";
import type { PageSpec } from "./packs/types.ts";
import { fitTitle } from "./packs/types.ts";
import type { BusinessRecord, ItemInfo, ListKind } from "./types.ts";

/**
 * The live price list for ANY business (`/prices/`): stored at `ext.retail.priceList` for every category (the name is
 * historical: it began as King Fish Aquatics' tank list). The `kind` sets the words (tank / bench / case / shelf), the
 * emoji, and which facts a care card carries. Every pack gets the page and the nav link through render.ts.
 */

export interface KindWords {
  /** "Fish & aquarium" */
  label: string;
  /** A section: "Tank", "Bench", "Case", "Shelf", "Enclosure". */
  section: string;
  /** One thing: "fish", "plant", "item"... */
  item: string;
  emoji: string;
  /** The product name the team and the shop use. */
  board: string;
  /** What a customer sees in an empty section. */
  empty: string;
  /** The page title when the shop hasn't typed one. */
  title: string;
  /** Care-card fields in order: [key, label, placeholder]. */
  fields: Array<[string, string, string]>;
}

export const KINDS: Record<ListKind, KindWords> = {
  fish: {
    label: "Fish & aquarium", title: "Prices", section: "Tank", item: "fish", emoji: "🐟", board: "Tank board", empty: "Sold out for now. Ask us what's coming.",
    fields: [["maxSize", "Adult size", "1.5 in"], ["diet", "Eats", "Flake, frozen brine shrimp"], ["temperament", "Temperament", "Peaceful, schooling (6+)"], ["minTank", "Minimum tank", "10 gal"], ["care", "Care level", "Beginner"], ["water", "Water", "Freshwater, 72–78 °F"], ["origin", "From", "South America"]],
  },
  plants: {
    label: "Plants & nursery", title: "Plants & prices", section: "Bench", item: "plant", emoji: "🌱", board: "Bench board", empty: "Sold out for now. New stock comes in weekly.",
    fields: [["maxSize", "Mature size", "3–4 ft"], ["light", "Light", "Full sun"], ["water", "Water", "Weekly; let it dry between"], ["zone", "Hardiness zone", "Zone 7–9"], ["bloom", "Blooms", "Spring, pink"], ["petSafe", "Pets", "Safe for cats and dogs"], ["origin", "Type", "Perennial"]],
  },
  pets: {
    label: "Pets & reptiles", title: "Available now", section: "Enclosure", item: "animal", emoji: "🦎", board: "Enclosure board", empty: "None right now. Ask us what's coming.",
    fields: [["maxSize", "Adult size", "18 in"], ["diet", "Eats", "Crickets, greens"], ["temperament", "Temperament", "Calm, handles well"], ["minTank", "Enclosure", "40 gal"], ["temp", "Temperature", "Basking 95 °F, cool side 75 °F"], ["lifespan", "Lifespan", "10–15 years"], ["care", "Care level", "Beginner"]],
  },
  food: {
    label: "Food & baked goods", title: "Today's case", section: "Case", item: "item", emoji: "🥐", board: "Case board", empty: "Sold out for today. Fresh again tomorrow.",
    fields: [["ingredients", "Made with", "Butter, flour, eggs, sugar"], ["allergens", "Allergens", "Wheat, dairy, egg"], ["serves", "Serves", "8–10"], ["made", "Made", "Baked this morning"], ["keeps", "Keeps", "3 days at room temp"], ["heating", "To serve", "Warm 10 min at 350 °F"]],
  },
  parts: {
    label: "Auto parts & tires", title: "In stock", section: "Bin", item: "part", emoji: "🔧", board: "Parts board", empty: "Out right now. We can order it; call us.",
    fields: [["partNumber", "Part # / size", "265/70R17 or 51515"], ["fits", "Fits", "2015–2020 F-150"], ["brand", "Brand", "Motorcraft"], ["condition", "Condition", "New / Remanufactured / Used"], ["warranty", "Warranty", "12 months"], ["location", "Where", "Rack B, shelf 3"]],
  },
  vehicles: {
    label: "Vehicles & equipment", title: "On the lot", section: "Row", item: "unit", emoji: "🚗", board: "Lot board", empty: "Nothing in this row right now. New units come in weekly.",
    fields: [["year", "Year / make / model", "2018 Ford F-150 XLT"], ["mileage", "Mileage / hours", "84,200 mi"], ["vin", "VIN / serial", "1FTEW1E…"], ["condition", "Condition", "Clean title, one owner"], ["drivetrain", "Drivetrain / engine", "4×4, 5.0 V8"], ["warranty", "Warranty", "30-day powertrain"], ["financing", "Financing", "Buy here pay here available"]],
  },
  goods: {
    label: "Other goods", title: "In stock", section: "Shelf", item: "item", emoji: "🏷️", board: "Stock board", empty: "Sold out for now. Ask us what's coming.",
    fields: [["brand", "Brand", "Carhartt"], ["condition", "Condition", "New / Like new / Used"], ["size", "Size", "32 × 24 in"], ["material", "Material", "Oak"], ["fits", "Fits / works with", "2015–2020 F-150"], ["details", "Details", "Made in USA"]],
  },
};

export const LIST_KINDS = Object.keys(KINDS) as ListKind[];

export function priceListOf(r: BusinessRecord) {
  return r.ext.retail?.priceList;
}

/** The kind the shop picked, else a guess from what they are. */
export function listKind(r: BusinessRecord): ListKind {
  const k = priceListOf(r)?.kind;
  if (k && KINDS[k]) return k;
  const text = `${r.name} ${r.typeLabel ?? ""}`;
  if (r.category === "retail" && r.variant === "pet") return "fish";
  if (r.category === "restaurant") return "food";
  if (/dealer|motors\b|auto sales|car sales|truck sales|used (cars|trucks)|pre-?owned|trailer|equipment|tractor|rv\b|boat|golf cart|powersports/i.test(text)) return "vehicles";
  if (r.category === "auto" || /parts|tire|wheel/i.test(text)) return "parts";
  if (r.category === "landscaping" || /nursery|garden|greenhouse|plant/i.test(`${r.name} ${r.typeLabel ?? ""}`)) return "plants";
  if (/aquar|fish|reptile|pet/i.test(`${r.name} ${r.typeLabel ?? ""}`)) return "fish";
  if (/bak|donut|cafe|deli|butcher|meat|produce|farm stand|market/i.test(`${r.name} ${r.typeLabel ?? ""}`)) return "food";
  return "goods";
}

export const kindWords = (r: BusinessRecord): KindWords => KINDS[listKind(r)];

/** Barcode scanning (an add-on): on when switched on in Edit, or, for shops set up before the switch, when any code is already stored. */
export function scanningOn(r: BusinessRecord): boolean {
  const pl = priceListOf(r);
  if (!pl) return false;
  if (pl.scanning !== undefined) return pl.scanning;
  return pl.sections.some((s) => s.items.some((it) => !!it.barcode)) || (pl.catalog ?? []).some((c) => !!c.barcode);
}

/** Rows a customer sees: the kind's named fields, then any free facts; `facts` is what non-fish kinds and the editor write. */
export function infoRows(info: ItemInfo | undefined, kind: ListKind = "fish"): Array<[string, string]> {
  if (!info) return [];
  const out: Array<[string, string]> = [];
  const used = new Set<string>();
  const usedKeys = new Set<string>();
  const take = (key: string, label: string) => {
    if (usedKeys.has(key)) return;
    const v = (info as unknown as Record<string, unknown>)[key];
    if (typeof v === "string" && v.trim()) { out.push([label, v.trim()]); used.add(label.toLowerCase()); usedKeys.add(key); }
  };
  for (const [key, label] of KINDS[kind].fields) take(key, label);
  // A card written under another kind (a fish card on a shop now set to "goods") still shows every field it has.
  for (const k of LIST_KINDS) if (k !== kind) for (const [key, label] of KINDS[k].fields) take(key, label);
  for (const f of info.facts ?? []) if (f.label && f.value && !used.has(f.label.toLowerCase())) out.push([f.label, f.value]);
  return out;
}

/** "About this one": the care card as a fold-out under the item (also rendered live by the client script). */
export function infoCard(info: ItemInfo | undefined, kind: ListKind): ReturnType<typeof html> {
  const rows = infoRows(info, kind);
  if (!rows.length && !info?.notes) return raw("");
  return html`<details class="menu-item__more"><summary>About this one</summary><dl>${rows.map(([k, v]) => html`<dt>${k}</dt><dd>${v}</dd>`)}</dl>${info?.notes ? html`<p>${info.notes}</p>` : ""}</details>`;
}

/**
 * Home-page teaser: up to six things in stock (photos first), with the way to the full page. Every category gets it when the
 * list has sections; sample items show a placeholder tile until the shop has photos.
 */
export function priceListTeaser(ctx: Ctx): ReturnType<typeof html> {
  const r = ctx.r;
  const pl = priceListOf(r);
  if (!pl?.sections.length || pl.public === false) return raw("");
  const kind = listKind(r);
  const W = KINDS[kind];
  const title = pl.title?.trim() || W.title;
  const items = pl.sections.flatMap((s) => s.items.filter((it) => !it.soldOut && it.qty !== 0).map((it) => ({ it, section: s.name })));
  if (!items.length) return raw("");
  const withPhoto = items.filter(({ it }) => it.image && (ctx.mode === "preview" || it.image.source !== "google"));
  const picks = [...withPhoto, ...items.filter((x) => !withPhoto.includes(x))].slice(0, 6);
  const sample = picks.some(({ it }) => it.sample);
  return html`<section class="section stock" id="stock" aria-labelledby="stock-title"><div class="wrap">
<span class="section__label">${title}</span><h2 id="stock-title">What's in right now</h2>
<p class="muted">Updated ${pl.lastUpdated}. The full list, by ${W.section.toLowerCase()}, is one tap away.${sample ? " These are sample items to show how it works." : ""}</p>
<ul class="tiles">${picks.map(({ it, section }) => {
    const img = it.image && (ctx.mode === "preview" || it.image.source !== "google") ? it.image : undefined;
    const left = it.qty !== undefined && it.qty > 0 && it.qty <= 5 ? `${it.qty} left` : "";
    return html`<li class="tile${img || it.sample ? "" : " tile--text"}">${img ? imageTag(img, { cls: "tile__img" }) : it.sample ? html`<div class="tile__img tile__img--ph" aria-hidden="true">${itemEmoji(it.name, kind)}</div>` : ""}<div class="tile__body"><h3>${it.name}</h3>${it.price ? html`<p class="tile__price">${it.price}</p>` : ""}<p class="tile__note">${[section, left].filter(Boolean).join(" · ")}</p></div></li>`;
  })}</ul>
<div class="btns" style="margin-top:20px"><a class="btn btn--primary" href="/prices/">See everything: ${title}</a></div>
</div></section>`;
}

/** What a sample item looks like, from its name (placeholder tiles): the closest emoji, else the kind's. Order matters. */
const ITEM_EMOJI: Array<[RegExp, string]> = [
  // auto parts, tires, fluids
  [/battery/i, "🔋"], [/bulb|headlight|lamp|light kit|heat lamp/i, "💡"], [/tire|all-season|all-terrain|mud-terrain|mount & balance|flat repair/i, "🛞"],
  [/alignment/i, "📐"], [/spark|alternator|electrical/i, "⚡"], [/oil filter|synthetic|motor oil|\boil\b/i, "🛢️"], [/air filter|cabin/i, "🌬️"],
  [/antifreeze|fluid|coolant/i, "🧴"], [/brake|rotor|pad/i, "⚙️"], [/wiper/i, "🌧️"],
  // vehicles & equipment
  [/f-150|silverado|tacoma|ram 1500|tundra|truck/i, "🛻"], [/cr-v|rav4|explorer|suv|tahoe/i, "🚙"], [/camry|altima|civic|accord|sedan|\bcar\b/i, "🚗"],
  [/trailer/i, "🚛"], [/mower|tractor|zero-turn/i, "🚜"], [/boat/i, "🚤"], [/golf cart|atv|side-by-side/i, "🛺"],
  // fish & aquarium
  [/clownfish|gramma|tang|saltwater/i, "🐠"], [/shrimp/i, "🦐"], [/snail/i, "🐌"], [/crab/i, "🦀"], [/anubias|java|fern|moss|plant/i, "🌿"],
  [/flake|pellet food|fish food/i, "🫙"], [/conditioner|test kit|medication/i, "🧪"], [/tetra|guppy|cory|pleco|lab|ram|angelfish|betta|molly|platy|barb|danio|cichlid|fish/i, "🐟"],
  // plants & nursery
  [/tomato/i, "🍅"], [/pepper|jalape/i, "🌶️"], [/strawberr/i, "🍓"], [/basil|rosemary|thyme|herb|hosta|fern/i, "🌿"], [/rose/i, "🌹"], [/azalea|hibiscus/i, "🌺"],
  [/coneflower|susan|daisy|daylily|zinnia|marigold/i, "🌼"], [/maple|crape|oak|tree|magnolia/i, "🌳"], [/sunflower/i, "🌻"], [/shrub|boxwood|holly/i, "🌲"],
  // pets
  [/gecko|dragon|lizard|skink|iguana/i, "🦎"], [/python|snake|boa/i, "🐍"], [/turtle|tortoise/i, "🐢"], [/guinea|hamster|gerbil|mouse|rat\b/i, "🐹"], [/rabbit|lop|bunny/i, "🐰"],
  [/parakeet|bird|finch|cockatiel/i, "🐦"], [/cricket|mealworm|dubia/i, "🦗"], [/hay/i, "🌾"], [/kitten|cat\b/i, "🐱"], [/puppy|dog\b/i, "🐶"],
  // bakery, produce, butcher
  [/croissant/i, "🥐"], [/muffin|cupcake/i, "🧁"], [/cookie/i, "🍪"], [/pie\b/i, "🥧"], [/cake/i, "🎂"], [/donut|doughnut/i, "🍩"], [/kolache|sausage|hot dog/i, "🌭"],
  [/pretzel/i, "🥨"], [/bagel/i, "🥯"], [/cinnamon roll|sweet roll|bun/i, "🥐"], [/sourdough|loaf|bread|rolls|baguette/i, "🍞"],
  [/corn\b|sweet corn/i, "🌽"], [/peach/i, "🍑"], [/apple/i, "🍎"], [/watermelon/i, "🍉"], [/okra|cucumber|pickle|squash|zucchini/i, "🥒"], [/honey/i, "🍯"],
  [/preserve|jam|jelly|salsa|sauce/i, "🫙"], [/egg/i, "🥚"], [/ribeye|steak|roast|brisket|beef|jerky|ground/i, "🥩"], [/bacon/i, "🥓"], [/pork|chop|ham\b/i, "🍖"],
  [/chicken|turkey/i, "🍗"], [/deer|venison|processing/i, "🦌"], [/fish fillet|catfish|shrimp/i, "🐟"],
  // hardware, feed, resale, boutique
  [/screw|bolt|nail|fastener|anchor/i, "🔩"], [/padlock|lock\b|key/i, "🔒"], [/pvc|pipe|fitting|faucet|hose bib/i, "🚰"], [/wax ring|toilet/i, "🚽"], [/water heater|element/i, "🔥"],
  [/mulch|potting|soil|compost/i, "🪴"], [/hose|sprinkler/i, "🚿"], [/pruner|shear|clipper/i, "✂️"], [/paint|primer|stain/i, "🎨"], [/roller|brush/i, "🖌️"],
  [/drill|saw|hammer|wrench|tool/i, "🔧"], [/tape|glue|caulk/i, "🧻"], [/feed|pellets|cracked corn|scratch/i, "🌾"], [/dog food|cat food|kibble/i, "🐕"],
  [/t-post|fence|gate|wire/i, "🪵"], [/seed|fescue|bermuda|rye/i, "🌱"], [/fertilizer|13-13-13|lime\b/i, "🧂"], [/pullet|chick|hen|rooster/i, "🐥"], [/waterer|feeder/i, "💧"],
  [/dresser|chest|cabinet|hutch/i, "🗄️"], [/table|desk/i, "🪵"], [/chair|rocker|stool|bench/i, "🪑"], [/sofa|couch|loveseat/i, "🛋️"], [/bookshelf|shelf/i, "📚"],
  [/skillet|pan|pot\b|dutch oven/i, "🍳"], [/bowl|pyrex|dish|plate/i, "🥣"], [/jar|mason/i, "🫙"], [/lamp/i, "🪔"], [/jacket|coat|denim/i, "🧥"], [/record|vinyl|album/i, "💿"],
  [/print|frame|art\b|picture|painting/i, "🖼️"], [/tee|t-shirt|shirt|blouse|top\b/i, "👕"], [/dress/i, "👗"], [/jean|pant|short/i, "👖"], [/boot|shoe|sandal|sneaker/i, "👟"],
  [/scarf/i, "🧣"], [/hat|cap\b|beanie/i, "🧢"], [/tote|bag|purse|wallet/i, "👜"], [/candle/i, "🕯️"], [/towel|blanket|throw|linen/i, "🧺"], [/mug|cup|tumbler/i, "☕"],
  [/soap|lotion|balm|bath/i, "🧼"], [/bracelet|necklace|earring|ring\b|jewel/i, "💍"], [/toy|game|puzzle/i, "🧸"], [/book/i, "📖"], [/card|stationery|notebook/i, "✉️"],
];
export function itemEmoji(name: string, kind: ListKind): string {
  for (const [re, em] of ITEM_EMOJI) if (re.test(name)) return em;
  return KINDS[kind].emoji;
}

/** The nav link, when the list is public. */
export function priceListNav(ctx: Ctx): NavItem[] {
  const pl = priceListOf(ctx.r);
  return pl?.sections.length && pl.public !== false ? [{ label: pl.title?.trim() || KINDS[listKind(ctx.r)].title, href: "/prices/" }] : [];
}

/** The price list page, sections with anchors the QR labels point at. Private lists are noindex and unlinked. */
export function pricesPage(ctx: Ctx): PageSpec | null {
  const r = ctx.r;
  const pl = priceListOf(r);
  if (!pl?.sections.length) return null;
  const kind = listKind(r);
  const title = pl.title?.trim() || KINDS[kind].title;
  const call = action(r, "call")!;
  const shown = pl.sections.map((s) => ({ ...s, items: s.items.filter((it) => !it.soldOut && it.qty !== 0) })).filter((s) => s.items.length);
  const qtyNote = (it: { qty?: number }) => (it.qty !== undefined && it.qty > 0 && it.qty <= 5 ? `${it.qty} left` : "");
  const sample = pl.sections.some((s) => s.items.some((it) => it.sample));
  const sampleNote = sample && (ctx.mode === "preview" || ctx.allowSamples) ? html`<p class="note" data-sample-note><strong>Sample items.</strong> This is how your live ${title.toLowerCase()} page works: these are made-up items for a business like yours. Your real stock replaces them on your board, from your phone, and the page follows within a minute.</p>` : "";
  const body = html`${sampleNote}<div id="prices-live"${ctx.liveData ? raw(` data-live="${ctx.liveData}"`) : ""}><nav class="menu-nav" aria-label="${title} sections">${shown.map((s) => html`<a href="#sec-${sectionSlug(s.name)}">${s.name}</a>`)}</nav>
${shown.map(
    (s) => html`<section class="menu-sec" id="sec-${sectionSlug(s.name)}" aria-labelledby="sec-${sectionSlug(s.name)}-t"><h2 id="sec-${sectionSlug(s.name)}-t">${s.name}</h2>${s.note ? html`<p class="muted">${s.note}</p>` : ""}
<ul class="menu-items">${s.items.map((it) => {
      const img = it.image && (ctx.mode === "preview" || it.image.source !== "google") ? it.image : undefined;
      const note = [it.description, qtyNote(it)].filter(Boolean).join(" · ");
      const card = infoCard(it.info, kind);
      const row = html`<div class="menu-item__row"><span>${it.name}</span><span class="dots" aria-hidden="true"></span>${it.price ? html`<span>${it.price}</span>` : ""}</div>${note ? html`<p>${note}</p>` : ""}${card}`;
      if (img) return html`<li class="menu-item menu-item--photo">${imageTag(img, { cls: "menu-item__img" })}<div>${row}</div></li>`;
      // Sample items get a placeholder tile, so the photo layout shows before the shop has taken any.
      if (it.sample) return html`<li class="menu-item menu-item--photo"><div class="menu-item__img menu-item__img--ph" aria-hidden="true">${itemEmoji(it.name, kind)}</div><div>${row}</div></li>`;
      return html`<li class="menu-item">${row}</li>`;
    })}</ul></section>`,
  )}</div>
<p class="muted">Updated <span data-live-updated>${pl.lastUpdated}</span>. Stock and prices change with new arrivals; call to check before you drive over.</p>`;
  return {
    path: "/prices/",
    title: fitTitle([`${title} | ${r.name}, ${r.address.city} ${r.address.state}`, `${title} | ${r.name}`]),
    description: `${title} at ${r.name} in ${r.address.city}, ${r.address.state}: ${pl.sections.map((s) => s.name).slice(0, 4).join(", ")}. Call ${r.phone.display} to check stock.`,
    crumb: title,
    noindex: pl.public === false,
    body: html`<section class="section"><div class="wrap narrow">
<span class="section__label">${r.name}</span><h1>${title}</h1>
${body}
<div class="btns" style="margin-top:28px">${button(call, "primary")}</div>
</div></section>`,
  };
}
