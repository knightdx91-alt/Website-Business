import { action, actions } from "../actions.ts";
import { about, button, cardGrid, contactForm, ctaBand, faq, hero, infoStrip, reviews, sectionHead, serviceArea, serviceList, steps, todo, visit, type Ctx } from "../components.ts";
import { hasAnyHours } from "../hours.ts";
import { html, type Raw } from "../html.ts";
import type { IconName } from "../icons.ts";
import type { AutoPartsExt, BusinessRecord, PartsCounterService, Service } from "../types.ts";
import { fitTitle, type CategoryPack } from "./types.ts";

export function autoVariant(primaryType: string | undefined, types: string[], name: string): string {
  const all = [primaryType ?? "", ...types];
  const n = name.toLowerCase();
  // Parts stores first: "Smith Auto Parts & Repair" sells parts over a counter. Chains (O'Reilly, AutoZone, NAPA…) are dropped by the chain list.
  if (/\b(auto ?parts|parts (store|house|city|center|supply|warehouse|(&|and) (supply|service|accessories|more)))\b/.test(n) || /\bparts\b/.test(n) && !/\b(repair|salvage|junk|u-?pull|wrecking)\b/.test(n)) return "parts";
  if (primaryType === "auto_parts_store") return "parts";
  if (/\b(detail\w*|ceramic|car wash|auto spa)\b/.test(n)) return "detailing";
  if (/\b(small engine|mower|outdoor power|chainsaw)\b/.test(n)) return "small_engine";
  if (all.includes("car_wash")) return "detailing";
  if (/\b(auto ?glass|windshields?|glass)\b/.test(n)) return "glass";
  if (/\b(mufflers?|exhaust)\b/.test(n)) return "exhaust";
  if (/\b(body|collision|paint\s?(&|and)\s?body|dent)\b/.test(n)) return "body";
  if (/\b(towing|wrecker|tow)\b/.test(n)) return "towing";
  if (/\btransmission/.test(n)) return "transmission";
  if (/\bdiesel\b/.test(n)) return "diesel";
  if (all.includes("tire_shop") || /\btires?\b/.test(n)) return "tire";
  if (/\b(import|euro|european|bmw|volkswagen|vw|audi|mercedes)\b/.test(n)) return "european";
  return "general";
}

const LABEL: Record<string, string> = {
  general: "Auto Repair",
  tire: "Tires & Auto Repair",
  transmission: "Transmission Repair",
  diesel: "Diesel & Auto Repair",
  european: "Import Auto Repair",
  towing: "Towing & Auto Repair",
  body: "Auto Body & Collision Repair",
  detailing: "Auto Detailing",
  small_engine: "Small Engine Repair",
  glass: "Auto Glass",
  exhaust: "Muffler & Exhaust",
  parts: "Auto Parts Store",
};

const SEEDS: Record<string, string[]> = {
  general: ["Brakes", "Oil changes", "Check engine light & diagnostics", "Tires & alignment", "AC & heating", "Engine repair", "Suspension & steering", "Batteries & electrical"],
  tire: ["Tires", "Alignment", "Brakes", "Oil changes", "Check engine light & diagnostics", "Suspension & steering"],
  transmission: ["Transmission repair", "Transmission service", "Clutch repair", "Diagnostics", "Drivetrain repair", "Brakes"],
  diesel: ["Diesel repair", "Diagnostics", "Brakes", "Oil changes", "Engine repair", "Suspension & steering"],
  european: ["Diagnostics", "Brakes", "Oil changes", "Engine repair", "AC & heating", "Suspension & steering"],
  towing: ["Towing", "Diagnostics", "Brakes", "Engine repair", "Tires", "Batteries & electrical"],
  body: ["Collision repair", "Dent repair", "Auto painting", "Bumper repair", "Frame straightening", "Insurance claims help"],
  detailing: ["Interior detailing", "Exterior wash & wax", "Full detail", "Paint correction", "Ceramic coating", "Headlight restoration"],
  small_engine: ["Lawn mower repair", "Zero-turn & riding mowers", "Chainsaws & trimmers", "Tune-ups", "Blade sharpening", "Generators & pressure washers"],
  glass: ["Windshield replacement", "Rock chip repair", "Side & back glass", "Mobile service", "Insurance claims help", "Power window repair"],
  exhaust: ["Mufflers", "Exhaust repair", "Catalytic converters", "Custom exhaust", "Brakes", "Oil changes"],
  parts: ["Brakes", "Batteries", "Filters", "Belts & hoses", "Starters & alternators", "Fluids & chemicals", "Tools", "Accessories"],
};

const FIX_TITLE: Record<string, string> = { detailing: "What we offer", small_engine: "What we work on", glass: "What we replace & repair", parts: "What we carry" };

/** Counter services a parts store can tick in Edit. The defaults are the usual trio; the owner confirms the set before publish. */
export const PARTS_COUNTER: Array<{ id: PartsCounterService; label: string; body: string; default: boolean }> = [
  { id: "battery", label: "Battery testing & charging", body: "Bring it in and we'll test it while you wait.", default: true },
  { id: "install", label: "Wiper & bulb install", body: "Buy them here and we'll put them on in the lot.", default: true },
  { id: "loaner", label: "Loaner tools", body: "Borrow the specialty tool for the job and bring it back.", default: true },
  { id: "hose", label: "Hydraulic hose assembly", body: "Hoses made up to length while you wait.", default: false },
  { id: "machine", label: "Machine shop", body: "Ask at the counter about machine shop work.", default: false },
  { id: "keys", label: "Key cutting", body: "Spare keys cut at the counter.", default: false },
  { id: "paint", label: "Paint mixing", body: "Automotive paint mixed to your color code.", default: false },
];

export function partsCounter(r: BusinessRecord): typeof PARTS_COUNTER {
  const on = r.ext.auto?.parts?.counter;
  return PARTS_COUNTER.filter((c) => (on && c.id in on ? on[c.id] : c.default));
}

const PARTS_ICONS: Record<PartsCounterService, IconName> = { battery: "check", install: "wrench", loaner: "wrench", hose: "wrench", machine: "wrench", keys: "check", paint: "check" };

export function seedAutoServices(variant: string): Service[] {
  return (SEEDS[variant] ?? SEEDS.general!).map((name) => ({ id: name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/-$/, ""), name, featured: true }));
}

const VARIANT_STEPS: Record<string, Array<{ title: string; body: string }>> = {
  detailing: [
    { title: "Call or request", body: "Tell us what you'd like done and when works for you." },
    { title: "Drop it off", body: "Bring your vehicle by at the time we set." },
    { title: "We get to work", body: "Inside, outside, or both: whatever you picked." },
    { title: "Pick it up", body: "We let you know when it's ready." },
  ],
  small_engine: [
    { title: "Call or request", body: "Tell us what your equipment is doing." },
    { title: "Bring it in", body: "Drop it off at the shop." },
    { title: "We find the problem", body: "We look it over and explain what we found." },
    { title: "Ready to work", body: "We fix it and let you know when to pick it up." },
  ],
};

const STEPS = [
  { title: "Call or request", body: "Tell us what your car is doing and when you can bring it in." },
  { title: "Bring it in", body: "Drop it off at the shop at a time that works for you." },
  { title: "We find the problem", body: "We look it over and explain what we found." },
  { title: "Back on the road", body: "We fix it and let you know when it's ready." },
];

function trustChips(r: BusinessRecord): string[] {
  const out: string[] = [];
  const a = r.ext.auto;
  if (a?.ase) out.push("ASE-certified");
  const w = a?.warranty;
  if (w?.months || w?.miles) {
    const parts = [w.months ? `${w.months}-month` : "", w.miles ? `${w.miles.toLocaleString("en-US")}-mile` : ""].filter(Boolean).join(" / ");
    out.push(`${parts} warranty${w.nationwide ? ", nationwide" : ""}`);
  }
  if (r.foundedYear) out.push(`Since ${r.foundedYear}`);
  if (r.ownershipTags.includes("family_owned")) out.push("Family-owned");
  return out;
}

const ICONS: IconName[] = ["wrench", "wrench", "clipboard", "wrench", "wrench", "wrench", "wrench", "wrench"];

export const autoPack: CategoryPack = {
  id: "auto",
  label: "Auto repair",
  titleMode: "service",
  locationModel: "storefront",
  hasForm: () => true,
  looks: ["auto.shop_floor", "auto.main_street_garage", "auto.clear_diagnostic", "auto.night_road"],
  defaultLook(r) {
    if (r.variant === "towing" || r.variant === "tire" || r.variant === "diesel") return "auto.night_road";
    if (r.variant === "european" || r.variant === "detailing") return "auto.clear_diagnostic";
    if (r.ownershipTags.includes("family_owned") || (r.foundedYear && r.foundedYear < 2000)) return "auto.main_street_garage";
    return "auto.shop_floor";
  },
  variantLabel: (r) => LABEL[r.variant] ?? "Auto Repair",
  schemaType: (r) => (r.variant === "tire" ? ["AutoRepair", "TireShop"] : r.variant === "body" ? "AutoBodyShop" : r.variant === "detailing" ? "AutoWash" : r.variant === "small_engine" ? "LocalBusiness" : r.variant === "glass" ? ["AutoRepair", "AutoPartsStore"] : r.variant === "parts" ? "AutoPartsStore" : "AutoRepair"),
  schemaExtras: () => ({}),
  homeTitle(r) {
    const t = LABEL[r.variant] ?? "Auto Repair";
    return fitTitle([`${t} in ${r.address.city}, ${r.address.state} | ${r.name}`, `${t} in ${r.address.city} | ${r.name}`, `Auto Repair in ${r.address.city} | ${r.name}`, `${r.name} | ${r.address.city}, ${r.address.state}`, r.name]);
  },
  nav: (ctx) =>
    ctx.r.variant === "parts"
      ? [
          { label: "What we carry", href: "/#carry" },
          { label: "Services", href: "/#counter" },
          { label: "Reserve a part", href: "/#reserve" },
          { label: "Hours", href: "/#visit" },
          { label: "Reviews", href: "/#reviews" },
        ]
      : [
          { label: "Services", href: "/#services" },
          { label: "Reviews", href: "/#reviews" },
          { label: "About", href: "/#about" },
          { label: "Hours & location", href: "/#visit" },
          { label: "FAQ", href: "/#faq" },
          { label: "Appointments", href: "/#contact" },
        ],
  actionBar: (ctx) => actions(ctx.r, ["call", ...(ctx.r.smsEnabled ? (["text"] as const) : []), ctx.r.links.booking && ctx.r.variant !== "parts" ? "book" : "quote", "directions"]),
  homeFaq: (ctx) => ctx.copy.faq.slice(0, 6),
  home(ctx: Ctx) {
    const r = ctx.r;
    if (r.variant === "parts") return partsHome(ctx);
    const label = LABEL[r.variant] ?? "Auto Repair";
    const second = r.links.booking ? "book" : "quote";
    return html`${hero(ctx, {
      eyebrow: r.name,
      h1: `${label} in ${r.address.city}, ${r.address.state}`,
      sub: ctx.copy.heroSub,
      trust: trustChips(r),
      showStatus: hasAnyHours(r.hours),
      actions: actions(r, ["call", second]),
      badge: r.foundedYear && ctx.theme.knobs.badge === "seal" ? `Serving ${r.address.city} since ${r.foundedYear}` : undefined,
    })}
${infoStrip(ctx, [])}
<main id="main">
<section class="section" id="services" aria-labelledby="services-title"><div class="wrap">
<span class="section__label">Services</span><h2 class="section__title" id="services-title">${FIX_TITLE[r.variant] ?? "What we fix"}</h2>
${ctx.copy.heroTagline ? html`<p class="lead">${ctx.copy.heroTagline}</p>` : ""}
${serviceList(ctx, r.services.map((s, i) => ({ title: s.name, body: ctx.copy.serviceBlurbs[s.id], icon: ICONS[i % ICONS.length] })))}
</div></section>
<section class="section section--band" id="how" aria-labelledby="how-title"><div class="wrap">
<span class="section__label">How it works</span><h2 class="section__title" id="how-title">No surprises</h2>
${steps(ctx.copy.steps?.length ? ctx.copy.steps : (VARIANT_STEPS[r.variant] ?? STEPS))}
</div></section>
${reviews(ctx)}
${about(ctx, `About ${r.name}`)}
${visit(ctx)}
${serviceArea(ctx)}
${faq(ctx.copy.faq.slice(0, 6), true)}
${contactForm(ctx, r.services.map((s) => s.name), [], [{ name: "vehicle", label: r.variant === "small_engine" ? "Equipment (type, make, model)" : "Vehicle (year, make, model)", autocomplete: "off" }], r.variant === "small_engine" ? "Tell us what your equipment is doing and we'll call you back." : r.variant === "detailing" ? "Tell us about your vehicle and what you'd like done. We'll call you back." : "Tell us what your car is doing and when you'd like to bring it in. We'll call you back.")}
${ctaBand(ctx, actions(r, ["call", "directions"]))}
</main>`;
  },
  pages: () => [],
  bannedPhrases: (r) => (r.variant === "parts" ? partsBannedPhrases(r) : []),
  copyBrief: (r) => r.variant === "parts" ? partsBrief(r) : ({
    voice:
      "Plain, confident and neighborly, like a trusted mechanic explaining things. Short sentences. Never mention ASE, warranties, years, family-owned, towing hours, shuttles, loaners, prices or 'estimate before any work' unless given in the facts.",
    fields: {
      heroTagline: "One sentence (12-22 words) introducing the services list: what kinds of vehicles (or equipment, for a small engine shop) and work they handle around town.",
      heroSub: "One line (15-25 words) on what they fix, for drivers in the town. No superlatives, no claims beyond the facts.",
      serviceBlurbs: "For each service id, one plain line (10-20 words): what it covers and a warning sign to watch for. No prices, no numbers.",
      faq: r.variant === "detailing"
        ? "5-6 general questions people ask about car detailing (difference between a wash and a detail, how often to detail, what ceramic coating is, how long it takes) with helpful general answers (35-60 words). No prices, no durations promised, no claims about this shop's policies. Where specifics matter, invite them to call."
        : r.variant === "small_engine"
        ? "5-6 general questions about small engine care (why a mower won't start, winter storage, fuel, blade sharpening, when to tune up) with helpful general answers (35-60 words). No prices, no claims about this shop's policies. Where specifics matter, invite them to call."
        : r.variant === "body"
        ? "5-6 general questions people ask after a wreck (do I have to use the shop my insurance picks, what's paintless dent repair, how to get an estimate, what to do after an accident) with helpful general answers (35-60 words). No prices, no claims about this shop's policies, insurers or warranties. Where specifics matter, invite them to call."
        : "5-6 general car-care questions drivers ask (when to change oil, what a check-engine light means, signs of brake wear, etc.) with helpful general answers (35-60 words). No prices, no mileage numbers, no claims about this shop's policies. Where specifics matter, invite them to call.",
      serviceAreaIntro: "One or two sentences about serving drivers in the town and the nearby communities listed.",
      about:
        "Two short paragraphs (70-120 words total). The owner's story is unknown: write a neutral, true introduction (what kind of shop, who it serves, where). Do not invent history, people, years or credentials.",
      cta: "ctaTitle: 3-7 words. ctaLine: one sentence, at most 18 words, inviting them to call or stop by.",
      metaDescription: "140-155 characters: service + town + one true fact + an action.",
    },
  }),
};


/** The parts-store home page: the counter sells it ("call and we'll tell you if it's on the shelf"), not a bay. */
function partsHome(ctx: Ctx): Raw {
  const r = ctx.r;
  const p: AutoPartsExt = r.ext.auto?.parts ?? {};
  const callStock = { ...action(r, "call")!, label: "Call to check stock" };
  const reserve = action(r, "quote")!;
  const order = p.orderUrl ? { id: "order" as const, label: "Order online for pickup", short: "Order", href: p.orderUrl, external: true, icon: "bag" as const } : null;
  const counter = partsCounter(r);
  const commercialText = p.commercialText || `Shops, fleets and farms: ask us about a commercial account and delivery to your shop. Call ${r.phone.display} and ask for the counter.`;
  return html`${hero(ctx, {
    eyebrow: r.name,
    h1: `Auto Parts Store in ${r.address.city}, ${r.address.state}`,
    sub: ctx.copy.heroSub,
    trust: [...trustChips(r), ...(p.program ? [p.program] : [])],
    showStatus: hasAnyHours(r.hours),
    actions: [callStock, reserve],
    badge: r.foundedYear && ctx.theme.knobs.badge === "seal" ? `Serving ${r.address.city} since ${r.foundedYear}` : undefined,
  })}
${infoStrip(ctx, [])}
<main id="main">
<section class="section" id="carry" aria-labelledby="carry-title"><div class="wrap">
${sectionHead("Parts & supplies", "What we carry", ctx.copy.heroTagline || undefined, "carry-title")}
${serviceList(ctx, r.services.map((s, i) => ({ title: s.name, body: ctx.copy.serviceBlurbs[s.id], icon: ICONS[i % ICONS.length] })))}
${order ? html`<div class="btns">${button(order, "secondary")}${button(callStock, "ghost")}</div>` : ""}
${r.confirmed.includes("services") ? "" : todo(ctx, "Tick what you carry", "We started with the usual aisles. Tell us what to keep, remove or add (and any brands or lines you want named).", true)}
</div></section>
<section class="section section--band" id="orders" aria-labelledby="orders-title"><div class="wrap narrow">
${sectionHead("Special orders", "Can't find it? We'll order it", p.turnaround ? `If it isn't on the shelf, we'll order it. ${p.turnaround}` : "If it isn't on the shelf, we can usually order it. Call with your year, make and model and we'll tell you when it can be here.", "orders-title")}
<div class="btns">${button(callStock, "primary")}${button(reserve, "ghost")}</div>
${p.turnaround ? "" : todo(ctx, "Confirm your special-order turnaround", "How fast do special orders usually come in (same day, next morning, 2 to 3 days)? We'll say exactly that, nothing more.")}
</div></section>
<section class="section" id="counter" aria-labelledby="counter-title"><div class="wrap">
${sectionHead("Services", "Services at the counter", counter.length ? "Things we do right here at the store." : undefined, "counter-title")}
${counter.length ? cardGrid(counter.map((c) => ({ title: c.label, body: c.body, icon: PARTS_ICONS[c.id] }))) : html`<p>Ask at the counter about battery testing and other services.</p>`}
${p.counterConfirmed ? "" : todo(ctx, "Confirm which counter services you offer", `We listed ${counter.length ? counter.map((c) => c.label.toLowerCase()).join(", ") : "none yet"}. Also possible: hydraulic hose assembly, machine shop, key cutting, paint mixing. Tell us which ones you really do.`, true)}
</div></section>
${p.commercial ? html`<section class="section section--band" id="commercial" aria-labelledby="commercial-title"><div class="wrap narrow">
${sectionHead("For shops & fleets", "Commercial accounts & delivery", commercialText, "commercial-title")}
<div class="btns">${button(action(r, "call")!, "primary")}</div>
</div></section>` : ""}
${reviews(ctx)}
${about(ctx, `About ${r.name}`)}
${visit(ctx)}
${faq(ctx.copy.faq.slice(0, 6), true)}
${contactForm(
  ctx,
  [],
  [],
  [
    { name: "year", label: "Year", inputmode: "numeric", autocomplete: "off" },
    { name: "make", label: "Make", autocomplete: "off" },
    { name: "model", label: "Model (and engine, if you know it)", autocomplete: "off" },
    { name: "part", label: "Part needed", required: true, autocomplete: "off" },
  ],
  "Tell us the vehicle and the part. We'll check the shelf, call you back, and hold it at the counter.",
  { id: "reserve", label: "Reserve a part", title: "Reserve a part", topic: "Reserve a part", button: "Reserve it", details: "Anything else" },
)}
${ctaBand(ctx, [callStock, action(r, "directions")!])}
</main>`;
}

const PARTS_BRANDS = ["ac ?delco", "motorcraft", "mopar", "bosch", "wix", "fram", "interstate", "duralast", "die ?hard", "optima", "wagner", "moog", "gates", "dayco", "castrol", "mobil ?1", "pennzoil", "valvoline", "k&n", "monroe", "denso", "ngk"];

/** No shipping, prices, stock promises or brands the owner didn't give us. Brands the owner typed into the lines or the program name are allowed. */
export function partsBannedPhrases(r: BusinessRecord): RegExp[] {
  const given = [...r.services.map((s) => s.name), r.ext.auto?.parts?.program ?? ""].join(" ").toLowerCase();
  const brands = PARTS_BRANDS.filter((b) => !new RegExp(`\\b${b}\\b`, "i").test(given));
  const out = [
    /\b(free|fast|same[- ]day|nationwide) shipping\b/i,
    /\bwe (ship|deliver)\b/i,
    /\b(lowest|best|cheapest|competitive|unbeatable) prices?\b/i,
    /\bprice[- ]match\w*/i,
    /\b(always|guaranteed|everything) in stock\b/i,
    /\b(lifetime|limited) warrant(y|ies)\b/i,
  ];
  if (!r.ext.auto?.parts?.orderUrl) out.push(/\b(order|buy|shop) online\b/i, /\bonline (ordering|store|catalog)\b/i);
  if (brands.length) out.push(new RegExp(`\\b(${brands.join("|")})\\b`, "i"));
  return out;
}

function partsBrief(r: BusinessRecord): ReturnType<CategoryPack["copyBrief"]> {
  const p = r.ext.auto?.parts ?? {};
  return {
    voice:
      `Plain, helpful counter talk, like the person who's worked the parts counter for twenty years. Short sentences. The pitch is the counter: call and they'll tell you in thirty seconds whether it's on the shelf, special orders${p.turnaround ? ` (${p.turnaround})` : " come in quick (say that only this vaguely; the exact turnaround is unknown)"}, and people who know the part. Never claim ${p.orderUrl ? "" : "online ordering, "}shipping, delivery, prices, discounts, stock of any specific part, warranties, brands or product lines unless they are in the facts${p.orderUrl ? "; online ordering is for in-store pickup only" : ""}. Never mention ASE, years, family-owned or hours unless given.`,
    fields: {
      heroTagline: "One sentence (12-20 words) introducing the aisles list: the kinds of parts and supplies for cars, trucks and the farm that a local counter stocks. No brands.",
      heroSub: "One line (15-25 words) for drivers in the town: call and we'll tell you if it's on the shelf, and if not we can order it. No superlatives, no stock or price claims.",
      serviceBlurbs: "For each category id, one plain line (8-14 words) on what's in that aisle and when you'd need it. No brands, no prices, no numbers.",
      faq: "5-6 general questions people ask a parts counter (what to bring so we find the right part: year, make, model, engine size, VIN; can you test my battery; can you order a part you don't have; do you take used oil or old batteries; do you install what you sell) with helpful general answers (35-60 words). No prices, no turnaround promises, no claims about this store's policies. Where specifics matter, invite them to call.",
      about:
        "Two short paragraphs (70-120 words total). The owner's story is unknown: write a neutral, true introduction (a local parts counter, who it serves: drivers, farmers, shops; where). Do not invent history, people, years, brands or programs.",
      cta: "ctaTitle: 3-7 words. ctaLine: one sentence, at most 18 words, inviting them to call the counter or stop by.",
      metaDescription: "140-155 characters: auto parts + town + call to check stock + special orders.",
    },
  };
}
