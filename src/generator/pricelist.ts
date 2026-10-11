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
  if (/dealer|motors\b|auto sales|car sales|trailer|equipment|tractor|rv\b|boat|golf cart|powersports/i.test(text)) return "vehicles";
  if (r.category === "auto" || /parts|tire|wheel/i.test(text)) return "parts";
  if (r.category === "landscaping" || /nursery|garden|greenhouse|plant/i.test(`${r.name} ${r.typeLabel ?? ""}`)) return "plants";
  if (/aquar|fish|reptile|pet/i.test(`${r.name} ${r.typeLabel ?? ""}`)) return "fish";
  if (/bak|donut|cafe|deli|butcher|meat|produce|farm stand|market/i.test(`${r.name} ${r.typeLabel ?? ""}`)) return "food";
  return "goods";
}

export const kindWords = (r: BusinessRecord): KindWords => KINDS[listKind(r)];

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
  const body = html`<div id="prices-live"${ctx.liveData ? raw(` data-live="${ctx.liveData}"`) : ""}><nav class="menu-nav" aria-label="${title} sections">${shown.map((s) => html`<a href="#sec-${sectionSlug(s.name)}">${s.name}</a>`)}</nav>
${shown.map(
    (s) => html`<section class="menu-sec" id="sec-${sectionSlug(s.name)}" aria-labelledby="sec-${sectionSlug(s.name)}-t"><h2 id="sec-${sectionSlug(s.name)}-t">${s.name}</h2>${s.note ? html`<p class="muted">${s.note}</p>` : ""}
<ul class="menu-items">${s.items.map((it) => {
      const img = it.image && (ctx.mode === "preview" || it.image.source !== "google") ? it.image : undefined;
      const note = [it.description, qtyNote(it)].filter(Boolean).join(" · ");
      const card = infoCard(it.info, kind);
      const row = html`<div class="menu-item__row"><span>${it.name}</span><span class="dots" aria-hidden="true"></span>${it.price ? html`<span>${it.price}</span>` : ""}</div>${note ? html`<p>${note}</p>` : ""}${card}`;
      return img ? html`<li class="menu-item menu-item--photo">${imageTag(img, { cls: "menu-item__img" })}<div>${row}</div></li>` : html`<li class="menu-item">${row}</li>`;
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
