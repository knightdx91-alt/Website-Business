import { action, actions } from "../actions.ts";
import { about, button, cardGrid, chips, contactForm, ctaBand, faq, gallery, hero, infoStrip, reviews, sectionHead, serviceArea, serviceList, steps, todo, visit, type Ctx, type FormField } from "../components.ts";
import { hasAnyHours } from "../hours.ts";
import { html, raw, type Raw } from "../html.ts";
import { icon, type IconName } from "../icons.ts";
import { aiTextOf } from "../lint.ts";
import { normalizeUsPhone, smsHref, telHref } from "../phone.ts";
import type { AutoAmenity, AutoPartsExt, BusinessRecord, PartsCounterService, Service } from "../types.ts";
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

/** Amenities a shop can tick in Edit (research/trends-2026 §1D: the best sites lead with these; only 11/80 local shops mention any). */
export const AUTO_AMENITIES: Array<{ id: AutoAmenity; label: string }> = [
  { id: "loaner", label: "Loaner cars" },
  { id: "shuttle", label: "Shuttle service" },
  { id: "key_drop", label: "After-hours key drop" },
  { id: "wifi", label: "Waiting room with Wi-Fi" },
  { id: "digital_inspection", label: "Digital inspections texted to you" },
  { id: "second_opinion", label: "Free second opinions" },
  { id: "walk_ins", label: "Walk-ins welcome" },
  { id: "same_day", label: "Same-day service on most jobs" },
  { id: "towing", label: "Towing available" },
  { id: "spanish", label: "Spanish spoken" },
];
export const AUTO_AMENITY_IDS = AUTO_AMENITIES.map((a) => a.id);

/** Program names offered as ticks in Edit; the owner can type others. Text chips only (the logos are licensed). */
export const AUTO_PROGRAMS = ["NAPA AutoCare", "TechNet", "Jasper", "AAA Approved Auto Repair", "Bosch Service", "ASE Blue Seal", "RepairPal Certified", "BBB Accredited"];

export function autoAmenityLabels(r: BusinessRecord): string[] {
  const on = new Set(r.ext.auto?.amenities ?? []);
  return AUTO_AMENITIES.filter((a) => on.has(a.id)).map((a) => a.label);
}

/** "24/7", "24 hours", "around the clock": only a towing shop with a confirmed staffed line may say it. */
const ALWAYS_RE = /\b(24\s?\/\s?7|24 hours?|twenty-four hours?|around the clock|any time of night|day or night)\b/i;

/** The tow line as the site shows it: the owner's separate number when it normalizes, else the shop's main line. */
export function towLine(r: BusinessRecord): { e164: string; display: string; separate: boolean } {
  const t = r.ext.auto?.tow?.phone ? normalizeUsPhone(r.ext.auto.tow.phone) : null;
  return t ? { ...t, separate: true } : { e164: r.phone.e164, display: r.phone.display, separate: false };
}

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
          ...(ctx.r.variant === "body" ? [{ label: "After an accident", href: "/#claims" }] : []),
          { label: "Reviews", href: "/#reviews" },
          { label: "About", href: "/#about" },
          { label: "Hours & location", href: "/#visit" },
          { label: "FAQ", href: "/#faq" },
          { label: ctx.r.variant === "tire" ? "Tire quote" : "Appointments", href: "/#contact" },
        ],
  actionBar: (ctx) => actions(ctx.r, ["call", ...(ctx.r.smsEnabled ? (["text"] as const) : []), ctx.r.links.booking && ctx.r.variant !== "parts" ? "book" : "quote", "directions"]),
  homeFaq: (ctx) => ctx.copy.faq.slice(0, 6),
  home(ctx: Ctx) {
    const r = ctx.r;
    if (r.variant === "parts") return partsHome(ctx);
    const label = LABEL[r.variant] ?? "Auto Repair";
    const second = r.links.booking ? "book" : "quote";
    const a = r.ext.auto ?? {};
    const amenities = autoAmenityLabels(r);
    return html`${hero(ctx, {
      eyebrow: r.name,
      h1: `${label} in ${r.address.city}, ${r.address.state}`,
      sub: ctx.copy.heroSub,
      trust: trustChips(r),
      showStatus: hasAnyHours(r.hours),
      actions: actions(r, ["call", second]),
      badge: r.foundedYear && ctx.theme.knobs.badge === "seal" ? `Serving ${r.address.city} since ${r.foundedYear}` : undefined,
    })}
${r.variant === "towing" ? towStrip(ctx) : ""}
${amenities.length ? html`<div class="amen" aria-label="Good to know"><div class="wrap"><span class="section__label">Good to know</span>${chips(amenities, "Good to know")}</div></div>` : ""}
${infoStrip(ctx, [])}
<main id="main">
<section class="section" id="services" aria-labelledby="services-title"><div class="wrap">
<span class="section__label">Services</span><h2 class="section__title" id="services-title">${FIX_TITLE[r.variant] ?? "What we fix"}</h2>
${ctx.copy.heroTagline ? html`<p class="lead">${ctx.copy.heroTagline}</p>` : ""}
${serviceList(ctx, r.services.map((s, i) => ({ title: s.name, body: ctx.copy.serviceBlurbs[s.id], icon: ICONS[i % ICONS.length] })))}
${r.variant === "tire" ? tireExtras(ctx) : ""}
</div></section>
${warrantyBand(ctx)}
<section class="section section--band" id="how" aria-labelledby="how-title"><div class="wrap">
<span class="section__label">How it works</span><h2 class="section__title" id="how-title">No surprises</h2>
${steps(ctx.copy.steps?.length ? ctx.copy.steps : (VARIANT_STEPS[r.variant] ?? STEPS))}
</div></section>
${r.variant === "body" ? claimsBlock(ctx) : ""}
${r.variant === "body" ? gallery(ctx, "Send 3 before/after pairs", "Body shops sell with photos: send three before-and-after pairs of recent jobs (no plates or faces) and we'll show them here.") : ""}
${reviews(ctx)}
${about(ctx, `About ${r.name}`)}
${visit(ctx)}
${serviceArea(ctx)}
${faq(ctx.copy.faq.slice(0, 6), true)}
${r.variant === "tire" ? tireQuoteForm(ctx) : contactForm(ctx, r.services.map((s) => s.name), [], [{ name: "vehicle", label: r.variant === "small_engine" ? "Equipment (type, make, model)" : "Vehicle (year, make, model)", autocomplete: "off" }], r.variant === "small_engine" ? "Tell us what your equipment is doing and we'll call you back." : r.variant === "detailing" ? "Tell us about your vehicle and what you'd like done. We'll call you back." : r.variant === "body" ? (a.body?.estimateNote || "Tell us what happened and what the damage looks like. We'll call you back to set up an estimate.") : "Tell us what your car is doing and when you'd like to bring it in. We'll call you back.")}
${ctaBand(ctx, actions(r, ["call", "directions"]))}
${r.variant === "towing" ? towTodos(ctx) : ""}
</main>`;
  },
  pages: () => [],
  bannedPhrases: (r) => (r.variant === "parts" ? partsBannedPhrases(r) : autoBannedPhrases(r)),
  copyBrief: (r) => r.variant === "parts" ? partsBrief(r) : ({
    voice:
      `Plain, confident and neighborly, like a trusted mechanic explaining things. Short sentences. Never mention ASE, warranties, programs, financing, years, family-owned, towing hours, shuttles, loaners, prices or 'estimate before any work' unless given in the facts. Never write "EV certified" or claim any hybrid or electric-vehicle credential; ${
        r.services.some((s) => /\b(hybrid|ev|electric)\b/i.test(s.name)) ? "the services list includes hybrids or EVs, so you may say at most that the shop works on hybrids and EVs." : "do not mention hybrids or EVs at all."
      }${r.variant === "towing" ? ` Towing: ${r.ext.auto?.tow?.always ? "the tow line is staffed 24/7 (that fact is given, you may say it once)." : "never say 24/7, 24 hours or around the clock; the tow hours are not confirmed."}` : ""}${
        r.ext.auto?.financing ? " Financing exists (say only that it's available through the lender named; never approval odds, credit checks or terms)." : ""
      }`,
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


/** Auto repair (non-parts) phrases the AI may never use. */
export function autoBannedPhrases(r: BusinessRecord): RegExp[] {
  const out: RegExp[] = [
    /\bev[- ]certified\b|\bcertified (ev|hybrid|electric)\b/i,
    /\b(no|without a) credit check\b|\b(instant|guaranteed|easy|quick) approval\b|\beveryone('s| is) approved\b/i,
  ];
  if (!(r.variant === "towing" && r.ext.auto?.tow?.always)) out.push(ALWAYS_RE);
  return out;
}

/** Warranty term, program names and financing in one band after the services; nothing renders when none is set. */
function warrantyBand(ctx: Ctx): Raw {
  const r = ctx.r;
  const a = r.ext.auto ?? {};
  const w = a.warranty;
  const term = w && (w.months || w.miles) ? [w.months ? `${w.months}-month` : "", w.miles ? `${w.miles.toLocaleString("en-US")}-mile` : ""].filter(Boolean).join(" / ") : "";
  const programs = a.programs ?? [];
  const fin = a.financing?.lender ? a.financing : undefined;
  if (!term && !programs.length && !fin) return raw("");
  const title = term ? `${term} warranty${w?.nationwide ? ", honored nationwide" : ""}` : programs.length ? "Programs we belong to" : "Financing available";
  const intro = term ? `Our work is backed by a ${term} warranty${w?.nationwide ? " that's honored at participating shops across the country" : ""}. Ask us for the details when you drop off.` : undefined;
  return html`<section class="section" id="warranty" aria-labelledby="warranty-title"><div class="wrap narrow">
${sectionHead("Warranty & programs", title, intro, "warranty-title")}
${programs.length ? html`${term ? html`<h3>Programs we belong to</h3>` : ""}${chips(programs, "Programs")}` : ""}
${fin ? html`<p class="lead"><strong>Financing available</strong> through ${fin.lender}. Ask at the counter, or ${fin.url ? html`<a href="${fin.url}" target="_blank" rel="noopener">apply with ${fin.lender}<span class="sr"> (opens in new tab)</span></a>` : "call us"} for the details.</p>` : ""}
</div></section>`;
}

/** Towing: "Need a tow?" under the opening with the tow line, 24/7 only when confirmed, and a text-us-your-location link. */
function towStrip(ctx: Ctx): Raw {
  const r = ctx.r;
  const t = r.ext.auto?.tow;
  const line = towLine(r);
  const always = !!t?.always;
  const text = r.smsEnabled ? smsHref(r.phone.e164) : "";
  return html`<section class="tow" aria-label="Towing"><div class="tow__in">
<p class="tow__lead">Need a tow?</p>
<a class="tow__num" href="${telHref(line.e164)}">${icon("phone", 18)}${line.display}</a>
${always ? html`<span>${icon("clock", 18)}24/7</span>` : ""}
${text ? html`<a href="${text}">${icon("message", 18)}Text us your location</a>` : ""}
${t?.yardNote ? html`<p class="tow__note">${t.yardNote}</p>` : ""}
</div></section>`;
}

/** Towing to-dos: the tow line and hours; 24/7 is a REQUIRED confirmation whenever the page claims it. */
function towTodos(ctx: Ctx): Raw {
  const r = ctx.r;
  const t = r.ext.auto?.tow;
  const claims = ALWAYS_RE.test(`${aiTextOf(ctx.copy)} ${r.services.map((s) => s.name).join(" ")} ${autoAmenityLabels(r).join(" ")}`);
  const out: Raw[] = [];
  if (!t?.always && claims) out.push(todo(ctx, "Confirm 24/7 towing", "The site text mentions 24/7 or around-the-clock towing. Confirm that a real person answers the tow line at any hour (tick \"Tow line is staffed 24/7\" in Edit), or we take the claim out.", true));
  if (!t?.phone) out.push(todo(ctx, "Is there a separate tow number?", `Right now the Need-a-tow strip calls ${r.phone.display}. If a different line is answered after hours, give us that number${t?.always ? "" : ", and tell us whether it's really staffed 24/7"}.`));
  if (!out.length) return raw("");
  return html`<section class="section" aria-label="Towing details to confirm"><div class="wrap narrow">${out}</div></section>`;
}

/** Tire shops: brands as chips and a storefront link under the services list. */
function tireExtras(ctx: Ctx): Raw {
  const a = ctx.r.ext.auto ?? {};
  const brands = a.tireBrands ?? [];
  const store = a.storeUrl ? { id: "shop" as const, label: "Shop tires online", short: "Shop", href: a.storeUrl, external: true, icon: "bag" as const } : null;
  const quote = action(ctx.r, "quote")!;
  return html`${brands.length ? html`<h3>Brands we carry</h3>${chips(brands, "Tire brands")}` : ""}
<div class="btns">${button(quote, "secondary")}${store ? button(store, "ghost") : ""}</div>
${brands.length ? "" : todo(ctx, "Which tire brands do you carry?", "List the brands you stock or order most (and any you'd rather not name). We show them as plain text, no logos.")}`;
}

/** Tire quote: by size or by vehicle, how many, and a brand preference. The Inbox line reads "Tire quote: 265/70R17 ×4". */
function tireQuoteForm(ctx: Ctx): Raw {
  const fields: FormField[] = [
    { name: "tire_size", label: "Tire size (on the sidewall)", placeholder: "265/70R17", autocomplete: "off" },
    { name: "year", label: "Or your vehicle: year", inputmode: "numeric", autocomplete: "off" },
    { name: "make", label: "Make", autocomplete: "off" },
    { name: "model", label: "Model", autocomplete: "off" },
    { name: "quantity", label: "How many tires?", options: ["1", "2", "4", "Not sure"] },
    { name: "brand", label: "Brand preference (optional)", autocomplete: "off" },
  ];
  return contactForm(ctx, [], [], fields, "Give us your tire size (it's printed on the sidewall) or your year, make and model, and we'll call you back with a quote.", {
    id: "contact",
    label: "Tires",
    title: "Get a tire quote",
    topic: "Tire quote",
    button: "Request a quote",
    details: "Anything else (alignment, a slow leak, when you need them)",
  });
}

/** Body shops: what to do after a wreck, insurers and certifications in the owner's words, the right-to-choose line only once confirmed. */
function claimsBlock(ctx: Ctx): Raw {
  const r = ctx.r;
  const b = r.ext.auto?.body;
  const call = action(r, "call")!;
  const text = action(r, "text");
  const stepsList = [
    { title: "Call us", body: `Once everyone's safe, call ${r.phone.display}${r.smsEnabled ? " or text us photos of the damage" : ""}. We'll tell you what to do next.` },
    { title: "We work with your insurance", body: "Bring us the claim number and we'll handle the estimate and the paperwork with your insurance company." },
    { title: "We handle the rest", body: "We keep you posted while the work is done and call you when it's ready." },
  ];
  return html`<section class="section" id="claims" aria-labelledby="claims-title"><div class="wrap">
${sectionHead("After an accident", "What to do after a wreck", b?.estimateNote || undefined, "claims-title")}
${steps(stepsList)}
${b?.rightToChooseConfirmed ? html`<p class="lead"><strong>You choose the shop.</strong> Your insurance company may suggest a repair shop, but where your vehicle is repaired is your decision.</p>` : ""}
${b?.insurers?.length ? html`<h3>Insurance companies we work with</h3>${chips(b.insurers, "Insurers")}` : ""}
${b?.certifications?.length ? html`<h3>Certifications</h3>${chips(b.certifications, "Certifications")}` : ""}
<div class="btns">${button(call, "primary")}${text ? button(text, "ghost") : ""}</div>
${b?.insurers?.length ? "" : todo(ctx, "Which insurance companies do you work with?", "List the insurers you regularly handle claims for. We name them as plain text and never call them partners.")}
${b?.rightToChooseConfirmed ? "" : todo(ctx, "Right-to-choose line (optional)", "Many body shops tell customers they may pick their own shop. If you want that line, confirm it in Edit and we show it in your words-safe form: \"You choose the shop.\"")}
</div></section>`;
}

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
