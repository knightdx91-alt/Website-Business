import { action, actions } from "../actions.ts";
import { about, button, contactForm, ctaBand, faq, guaranteeBand, guaranteeChip, guaranteeFaq, hero, offersSection, plans, promoBar, reviews, sectionHead, serviceArea, steps, todo, todoBlock, type Ctx, type FormField, serviceList } from "../components.ts";
import { html, raw, type Raw } from "../html.ts";
import { icon, type IconName } from "../icons.ts";
import { normalizeUsPhone } from "../phone.ts";
import type { BusinessRecord, Faq, License, Service } from "../types.ts";
import { fitTitle, type CategoryPack } from "./types.ts";

export const TRADES = ["plumbing", "hvac", "electrical", "roofing", "painting", "concrete", "remodeling", "handyman", "fencing", "tree", "pest", "appliance", "septic", "garage_door", "gutters", "welding", "flooring", "drywall", "multi"] as const;

const TRADE_LABEL: Record<string, string> = {
  plumbing: "Plumbing",
  hvac: "Heating & Air",
  electrical: "Electrical",
  roofing: "Roofing",
  painting: "Painting",
  concrete: "Concrete",
  remodeling: "Remodeling",
  handyman: "Handyman Services",
  fencing: "Fencing",
  tree: "Tree Service",
  pest: "Pest Control",
  appliance: "Appliance Repair",
  septic: "Septic & Excavation",
  garage_door: "Garage Doors",
  gutters: "Gutters",
  welding: "Welding & Fabrication",
  flooring: "Flooring",
  drywall: "Drywall",
  multi: "Home Services",
};

const TRADE_NOUN: Record<string, string> = {
  plumbing: "Plumber",
  hvac: "HVAC Company",
  electrical: "Electrician",
  roofing: "Roofer",
  painting: "Painter",
  concrete: "Concrete Contractor",
  remodeling: "Remodeler",
  handyman: "Handyman",
  fencing: "Fence Company",
  tree: "Tree Service",
  pest: "Pest Control Company",
  appliance: "Appliance Repair Tech",
  septic: "Septic & Excavation Contractor",
  garage_door: "Garage Door Company",
  gutters: "Gutter Company",
  welding: "Welder",
  flooring: "Flooring Contractor",
  drywall: "Drywall Contractor",
  multi: "Contractor",
};

export function contractorTrade(primaryType: string | undefined, types: string[], name: string): string {
  const all = [primaryType ?? "", ...types];
  const n = name.toLowerCase();
  if (/\b(heat(ing)?|air|cooling|hvac|a\/c|ac)\b/.test(n) || all.includes("hvac_contractor")) return "hvac";
  if (all.includes("plumber") || /\bplumb/.test(n)) return "plumbing";
  if (all.includes("electrician") || /\belectric/.test(n)) return "electrical";
  if (all.includes("roofing_contractor") || /\broof/.test(n)) return "roofing";
  if (all.includes("painter") || /\bpaint/.test(n)) return "painting";
  if (/\b(septic|excavat\w*|dirt work|grading|dozer|backhoe|land clearing|site prep\w*|demolition)\b/.test(n)) return "septic";
  if (/\bgarage doors?\b|\boverhead doors?\b/.test(n)) return "garage_door";
  if (/\bgutters?\b/.test(n)) return "gutters";
  if (/\b(weld\w*|fabricat\w*|metal works?|ironworks?)\b/.test(n)) return "welding";
  if (/\b(floor\w*|carpet|tile|hardwood)\b/.test(n)) return "flooring";
  if (/\b(drywall|sheetrock|plaster\w*)\b/.test(n)) return "drywall";
  if (/\b(concrete|cement|masonry|paving|driveways?)\b/.test(n)) return "concrete";
  if (/\b(fenc(e|es|ing))\b/.test(n)) return "fencing";
  if (/\b(tree|stump|arborist)\b/.test(n)) return "tree";
  if (/\b(pest|termite|exterminat\w*|bug)\b/.test(n)) return "pest";
  if (/\bappliance/.test(n)) return "appliance";
  if (/\bhandy\s?man\b/.test(n)) return "handyman";
  if (/\b(remodel\w*|renovation\w*|kitchen|bath|construction|builders?|carpentry)\b/.test(n) || all.includes("general_contractor")) return "remodeling";
  return "multi";
}

const SEEDS: Record<string, Array<[string, string, IconName]>> = {
  plumbing: [
    ["leak-repair", "Leak repair", "wrench"],
    ["drain-cleaning", "Drain cleaning", "wrench"],
    ["water-heaters", "Water heaters", "wrench"],
    ["toilets-fixtures", "Toilets & fixtures", "wrench"],
    ["sewer-water-lines", "Sewer & water lines", "wrench"],
    ["gas-lines", "Gas lines", "wrench"],
  ],
  hvac: [
    ["ac-repair", "AC repair", "wrench"],
    ["ac-replacement", "AC replacement", "wrench"],
    ["heating", "Heating & furnaces", "wrench"],
    ["heat-pumps", "Heat pumps", "wrench"],
    ["tune-ups", "Tune-ups & maintenance", "calendar"],
    ["ductless", "Ductless mini-splits", "wrench"],
  ],
  electrical: [
    ["repairs", "Troubleshooting & repairs", "wrench"],
    ["panel-upgrades", "Panel upgrades", "wrench"],
    ["lighting", "Indoor & outdoor lighting", "wrench"],
    ["outlets-switches", "Outlets & switches", "wrench"],
    ["generators", "Generators & transfer switches", "wrench"],
    ["ev-chargers", "EV chargers", "wrench"],
  ],
  roofing: [
    ["roof-replacement", "Roof replacement", "wrench"],
    ["roof-repair", "Roof repair & leaks", "wrench"],
    ["storm-damage", "Storm & hail damage", "wrench"],
    ["inspections", "Roof inspections", "clipboard"],
    ["metal-roofing", "Metal roofing", "wrench"],
    ["gutters", "Gutters", "wrench"],
  ],
  painting: [
    ["interior-painting", "Interior painting", "wrench"],
    ["exterior-painting", "Exterior painting", "wrench"],
    ["cabinet-painting", "Cabinet painting", "wrench"],
    ["deck-staining", "Deck & fence staining", "wrench"],
    ["drywall-repair", "Drywall repair", "wrench"],
    ["commercial-painting", "Commercial painting", "wrench"],
  ],
  concrete: [
    ["driveways", "Driveways", "wrench"],
    ["patios", "Patios", "wrench"],
    ["sidewalks", "Sidewalks", "wrench"],
    ["slabs", "Slabs & foundations", "wrench"],
    ["stamped-concrete", "Stamped concrete", "wrench"],
    ["concrete-repair", "Concrete repair", "wrench"],
  ],
  remodeling: [
    ["kitchen-remodeling", "Kitchen remodeling", "wrench"],
    ["bathroom-remodeling", "Bathroom remodeling", "wrench"],
    ["additions", "Room additions", "wrench"],
    ["decks-porches", "Decks & porches", "wrench"],
    ["flooring", "Flooring", "wrench"],
    ["repairs", "Home repairs", "wrench"],
  ],
  handyman: [
    ["home-repairs", "Home repairs", "wrench"],
    ["drywall", "Drywall patching", "wrench"],
    ["doors-windows", "Doors & windows", "wrench"],
    ["assembly-mounting", "Assembly & TV mounting", "wrench"],
    ["decks-fences", "Deck & fence repair", "wrench"],
    ["odd-jobs", "Odd jobs & to-do lists", "clipboard"],
  ],
  fencing: [
    ["wood-fences", "Wood fences", "wrench"],
    ["chain-link", "Chain link fences", "wrench"],
    ["vinyl-fences", "Vinyl fences", "wrench"],
    ["farm-fencing", "Farm & ranch fencing", "wrench"],
    ["gates", "Gates", "wrench"],
    ["fence-repair", "Fence repair", "wrench"],
  ],
  tree: [
    ["tree-removal", "Tree removal", "wrench"],
    ["tree-trimming", "Tree trimming", "wrench"],
    ["stump-grinding", "Stump grinding", "wrench"],
    ["storm-cleanup", "Storm cleanup", "wrench"],
    ["lot-clearing", "Lot clearing", "wrench"],
    ["firewood", "Firewood", "wrench"],
  ],
  pest: [
    ["general-pest", "General pest control", "wrench"],
    ["termites", "Termite treatment", "wrench"],
    ["mosquitoes", "Mosquito control", "wrench"],
    ["rodents", "Rodent control", "wrench"],
    ["bed-bugs", "Bed bugs", "wrench"],
    ["inspections", "Inspections", "clipboard"],
  ],
  appliance: [
    ["washer-dryer", "Washer & dryer repair", "wrench"],
    ["refrigerator", "Refrigerator repair", "wrench"],
    ["oven-range", "Oven & range repair", "wrench"],
    ["dishwasher", "Dishwasher repair", "wrench"],
    ["microwave", "Microwave repair", "wrench"],
    ["installation", "Appliance installation", "wrench"],
  ],
  septic: [
    ["septic-pumping", "Septic tank pumping", "wrench"],
    ["septic-install", "New septic systems", "wrench"],
    ["septic-repair", "Septic repairs & field lines", "wrench"],
    ["excavation", "Excavation & dirt work", "wrench"],
    ["grading", "Grading & drainage", "wrench"],
    ["land-clearing", "Land clearing & site prep", "wrench"],
  ],
  garage_door: [
    ["door-repair", "Garage door repair", "wrench"],
    ["springs-cables", "Springs & cables", "wrench"],
    ["openers", "Openers & remotes", "wrench"],
    ["new-doors", "New garage doors", "wrench"],
    ["commercial-doors", "Commercial & roll-up doors", "wrench"],
    ["tune-ups", "Tune-ups & safety checks", "calendar"],
  ],
  gutters: [
    ["seamless-gutters", "Seamless gutters", "wrench"],
    ["gutter-guards", "Gutter guards", "wrench"],
    ["gutter-repair", "Gutter repair", "wrench"],
    ["gutter-cleaning", "Gutter cleaning", "wrench"],
    ["downspouts", "Downspouts & drainage", "wrench"],
    ["fascia-soffit", "Fascia & soffit", "wrench"],
  ],
  welding: [
    ["welding-repair", "Welding repair", "wrench"],
    ["custom-fabrication", "Custom fabrication", "wrench"],
    ["trailer-repair", "Trailer repair & hitches", "wrench"],
    ["gates-railings", "Gates, railings & handrails", "wrench"],
    ["mobile-welding", "Mobile welding", "wrench"],
    ["aluminum-stainless", "Aluminum & stainless", "wrench"],
  ],
  flooring: [
    ["lvp-laminate", "Vinyl plank & laminate", "wrench"],
    ["hardwood", "Hardwood floors", "wrench"],
    ["tile", "Tile floors & showers", "wrench"],
    ["carpet", "Carpet", "wrench"],
    ["refinishing", "Sanding & refinishing", "wrench"],
    ["floor-repair", "Floor repair & subfloors", "wrench"],
  ],
  drywall: [
    ["drywall-install", "Drywall hanging & finishing", "wrench"],
    ["drywall-repair", "Drywall repair & patches", "wrench"],
    ["texture", "Texture & smooth finishes", "wrench"],
    ["ceilings", "Ceilings & popcorn removal", "wrench"],
    ["water-damage", "Water damage repair", "wrench"],
    ["paint-ready", "Prime & paint-ready walls", "wrench"],
  ],
  multi: [
    ["repairs", "Repairs", "wrench"],
    ["installations", "Installations", "wrench"],
    ["inspections", "Inspections", "clipboard"],
  ],
};

export function seedServices(trade: string): Service[] {
  return (SEEDS[trade] ?? SEEDS.multi!).map(([id, name]) => ({ id, name, featured: true }));
}

function serviceIcon(trade: string, id: string): IconName {
  return (SEEDS[trade] ?? SEEDS.multi!).find(([sid]) => sid === id)?.[2] ?? "wrench";
}

const DEFAULT_STEPS: Record<string, Array<{ title: string; body: string }>> = {
  roofing: [
    { title: "Call or request", body: "Tell us what you're seeing: leaks, missing shingles or storm damage." },
    { title: "Inspection", body: "We look over the roof and show you what we find." },
    { title: "Clear quote", body: "You get a written quote before any work starts." },
    { title: "Done right", body: "We do the work, clean up, and walk the job with you." },
  ],
  default: [
    { title: "Call or request", body: "Tell us what's going on and when works for you." },
    { title: "We take a look", body: "We find the problem and explain your options." },
    { title: "Clear quote", body: "You know the price before we start." },
    { title: "Job done", body: "We fix it, clean up, and make sure you're happy." },
  ],
};

/* ---------- Oct 2026 modules (research/trends-2026/trades-lawn-cleaning.md §1D, §5) ---------- */

/** Plan card wording by trade: HVAC memberships, pest service plans, garage-door tune-ups, plumbing home care. */
const PLAN_WORDS: Record<string, { label: string; title: string }> = {
  hvac: { label: "Maintenance plans", title: "Keep your system running right" },
  pest: { label: "Service plans", title: "Year-round protection" },
  garage_door: { label: "Tune-up plans", title: "Keep the door running smooth" },
  plumbing: { label: "Home care plans", title: "Stay ahead of plumbing trouble" },
  electrical: { label: "Safety plans", title: "A yearly look at your panel and wiring" },
};

/** The license shown as "AL# <number>" next to the name: any license for an HVAC company (the board requires it), else one whose label says Alabama. */
export function alLicense(r: BusinessRecord): License | undefined {
  if (r.variant === "hvac") return r.licenses[0];
  return r.licenses.find((l) => /\b(alabama|al)\b/i.test(l.label));
}

/** The number the emergency line dials: the after-hours number when the owner gave a valid one, else the main line. */
export function emergencyPhone(r: BusinessRecord): { e164: string; display: string } {
  const ah = r.ext.contractor?.afterHours?.phone;
  return (ah && normalizeUsPhone(ah)) || r.phone;
}

/** Thin line under the header: "Emergency? Call <number> · 24/7" with a "Not urgent? Request service" secondary. Only with emergencyService. */
export function emergencyBanner(ctx: Ctx): Raw {
  const r = ctx.r;
  const x = r.ext.contractor;
  if (!x?.emergencyService) return raw("");
  const p = emergencyPhone(r);
  const terms = x.afterHours?.note?.trim() || "24/7";
  return html`<div class="emerg"><div class="wrap emerg__in"><p>${icon("phone", 18)} Emergency? <a href="tel:${p.e164}">Call ${p.display}</a> · ${terms}</p><a class="emerg__alt" href="#contact">Not urgent? Request service</a></div></div>`;
}

/** "Financing available": the lender named in text, an Apply link-out. Never invents terms. */
export function financingSection(ctx: Ctx): Raw {
  const f = ctx.r.ext.contractor?.financing;
  if (!f?.lender) return raw("");
  const apply = f.url ? html`<div class="btns"><a class="btn btn--primary" href="${f.url}" target="_blank" rel="noopener">${icon("arrow")}<span>Apply with ${f.lender}</span><span class="sr"> (opens in new tab)</span></a>${button(action(ctx.r, "call")!, "ghost")}</div>` : html`<div class="btns">${button(action(ctx.r, "call")!, "primary")}</div>`;
  return html`<section class="section section--band" id="financing" aria-labelledby="financing-title"><div class="wrap narrow">
${sectionHead("Financing", "Financing available", `Bigger jobs don't have to wait. We offer financing through ${f.lender}; ask us about it when you call, or ${f.url ? "apply online in a few minutes" : "we'll walk you through it"}.`, "financing-title")}
${apply}
<p class="muted">Financing is offered by ${f.lender}, subject to their approval and terms.</p>
</div></section>`;
}

/** The AI FAQ plus owner-fact entries: financing, warranty, guarantee. */
export function contractorFaq(ctx: Ctx): Faq[] {
  const r = ctx.r;
  const x = r.ext.contractor;
  const out = [...ctx.copy.faq.slice(0, 6)];
  if (x?.financing?.lender) out.push({ q: "Do you offer financing?", a: `Yes, through ${x.financing.lender}. Ask us about it when you call${x.financing.url ? ", or apply online from the Financing section of this page" : ""}.` });
  if (x?.warrantyText?.trim()) out.push({ q: "Do you offer a warranty?", a: x.warrantyText.trim() });
  const g = guaranteeFaq(r);
  if (g) out.push(g);
  return out;
}

/** A line under the services heading for who they work with, from the owner's residential/commercial pick. */
function servesLine(r: BusinessRecord): string | undefined {
  const s = r.ext.contractor?.serves;
  const where = `in and around ${r.address.city}`;
  if (s === "both") return `For homes and businesses ${where}.`;
  if (s === "commercial") return `For businesses, churches and property managers ${where}.`;
  if (s === "residential") return `For homeowners ${where}.`;
  return undefined;
}

/** What to text a photo of, by trade. */
const PHOTO_HINT: Record<string, string> = { roofing: "the damage", painting: "the room or wall", remodeling: "the space", tree: "the tree", concrete: "the area", fencing: "the fence line", gutters: "the gutters", flooring: "the floor", drywall: "the wall", welding: "the piece", septic: "the spot", garage_door: "the door" };

/** Owner-typed text where a phrase may legitimately appear, so the AI check doesn't flag the owner's own words. */
function ownerText(r: BusinessRecord): string {
  const x = r.ext.contractor;
  return [x?.warrantyText, x?.afterHours?.note, r.guarantee?.text, r.guarantee?.remedy, ...(r.plans ?? []).flatMap((p) => [p.name, p.note, ...p.includes]), ...(r.offers ?? []).flatMap((o) => [o.title, o.detail])].filter(Boolean).join(" \n ");
}

/** Claims the AI copy may not make for a contractor unless the owner's own facts back them. */
export function contractorBannedPhrases(r: BusinessRecord): RegExp[] {
  const x = r.ext.contractor;
  const own = ownerText(r);
  const out: RegExp[] = [];
  // Financing terms: the owner gives a lender and a link, never rates or approval promises.
  out.push(/\b\d+(?:\.\d+)?\s*%\s*(?:apr|interest|financing)\b|\b0%|\bno credit check\b|\bsame as cash\b|\bno interest\b|\bno money down\b|\$0 down\b|\bguaranteed approval\b/i);
  if (!x?.financing?.lender) out.push(/\bfinancing\b|\bpayment plans?\b/i);
  if (!r.licenses.length) out.push(/\b(?:we are|we're|fully|state)[- ]licensed\b|\blicensed (?:and|&) insured\b/i);
  if (!x?.warrantyText?.trim() && !r.guarantee) out.push(/\b(?:warranty|warranties|guaranteed?|guarantees)\b/i);
  if (!x?.emergencyService) out.push(/\b24\/7\b|\baround the clock\b|\b(?:emergency|after-hours|same-day) (?:service|calls?|repairs?|appointments?)\b/i);
  return out.filter((re) => !re.test(own));
}

export const contractorPack: CategoryPack = {
  id: "contractor",
  label: "Contractors",
  titleMode: "service",
  locationModel: "service_area",
  hasForm: () => true,
  looks: ["contractor.toolbox", "contractor.front_porch", "contractor.clear_air", "contractor.ridgeline"],
  defaultLook(r) {
    if (r.ownershipTags.includes("family_owned")) return "contractor.front_porch";
    return (
      ({ plumbing: "contractor.toolbox", electrical: "contractor.toolbox", hvac: "contractor.clear_air", roofing: "contractor.ridgeline", concrete: "contractor.ridgeline", fencing: "contractor.ridgeline", tree: "contractor.ridgeline", pest: "contractor.clear_air", appliance: "contractor.clear_air", painting: "contractor.front_porch", remodeling: "contractor.front_porch", handyman: "contractor.front_porch" } as Record<string, string>)[r.variant] ?? "contractor.toolbox"
    );
  },
  variantLabel: (r) => TRADE_LABEL[r.variant] ?? "Home Services",
  schemaType: (r) =>
    ({ plumbing: "Plumber", hvac: "HVACBusiness", electrical: "Electrician", roofing: "RoofingContractor", painting: "HousePainter", remodeling: "GeneralContractor", pest: "LocalBusiness", appliance: "LocalBusiness", tree: "LocalBusiness", welding: "LocalBusiness", septic: "LocalBusiness" } as Record<string, string>)[r.variant] ?? "HomeAndConstructionBusiness",
  schemaExtras: () => ({}),
  homeTitle(r) {
    const t = TRADE_LABEL[r.variant] ?? "Home Services";
    return fitTitle([`${t} in ${r.address.city}, ${r.address.state} | ${r.name}`, `${t} in ${r.address.city} | ${r.name}`, `${r.name} | ${r.address.city}, ${r.address.state}`, r.name]);
  },
  nav: (ctx) => [
    { label: "Services", href: "/#services" },
    ...(ctx.r.plans?.length ? [{ label: PLAN_WORDS[ctx.r.variant]?.label ?? "Plans", href: "/#plans" }] : []),
    { label: "Service area", href: "/#area" },
    { label: "Reviews", href: "/#reviews" },
    { label: "About", href: "/#about" },
    { label: "FAQ", href: "/#faq" },
    { label: "Contact", href: "/#contact" },
  ],
  actionBar: (ctx) => actions(ctx.r, ctx.r.smsEnabled ? ["call", "text", "quote"] : ["call", "quote"]),
  homeFaq: (ctx) => contractorFaq(ctx),
  bannedPhrases: (r) => contractorBannedPhrases(r),
  home(ctx: Ctx) {
    const r = ctx.r;
    const x = r.ext.contractor;
    const trade = TRADE_LABEL[r.variant] ?? "Home Services";
    const trust: string[] = [];
    if (r.licenses.length) trust.push("Licensed");
    if (r.insured) trust.push(r.licenses.length ? "Insured" : "Licensed & insured");
    if (r.foundedYear) trust.push(`Since ${r.foundedYear}`);
    if (r.ownershipTags.includes("family_owned")) trust.push("Family-owned");
    if (x?.emergencyService) trust.push("Emergency service");
    if (x?.financing?.lender) trust.push("Financing available");
    if (x?.serves === "both") trust.push("Residential & commercial");
    else if (x?.serves === "commercial") trust.push("Commercial");
    const gchip = guaranteeChip(r.guarantee);
    if (gchip) trust.push(gchip);
    const services = r.services.map((s) => ({
      title: s.name,
      body: ctx.copy.serviceBlurbs[s.id],
      icon: serviceIcon(r.variant, s.id),
    }));
    const towns = r.serviceArea?.towns ?? [];
    const al = alLicense(r);
    // Alabama compliance: HVAC companies must show "AL# <number>" on the home page; remodelers on jobs over $10k their HBLB number.
    const licenseTodo =
      r.variant === "hvac" && !r.licenses.length
        ? todo(ctx, "Add your Alabama HVAC certification number", "Alabama's HVAC board requires your company name and AL# number on your website's home page. Type it under License # in Edit and it shows next to your name.", true)
        : r.variant === "remodeling" && !r.licenses.length
          ? todo(ctx, x?.jobsOver10k ? "Add your HBLB license number" : "Jobs over $10,000? Add your HBLB license number", "Alabama home builders doing jobs over $10,000 must show their Home Builders Licensure Board number in all advertising, websites included (Act 2024-443).", !!x?.jobsOver10k)
          : raw("");
    const emergencyTodo = x?.emergencyService && !x.afterHours?.confirmed ? todoBlock(ctx, "Confirm the emergency terms (hours, extra charges)", "The site says you take emergency calls. Confirm the number to call, the hours, and any after-hours charge, in your own words, so nobody is surprised at 3 a.m.", true) : raw("");
    const property: FormField = { name: "property", label: "Property", options: ["Residential", "Commercial", "Not sure"], value: x?.serves === "commercial" ? "Commercial" : x?.serves === "residential" || x?.serves === "both" ? "Residential" : undefined };
    const fields: FormField[] = [property, { name: "urgent", label: "Is this an emergency?", options: ["No", "Yes"] }, { name: "reach", label: "Best way to reach you", options: ["Call", "Text"] }];
    const pw = PLAN_WORDS[r.variant] ?? { label: "Plans & pricing", title: "Pick what fits" };
    const serves = servesLine(r);
    return html`${emergencyBanner(ctx)}${hero(ctx, {
      eyebrow: al ? `${r.name} · AL# ${al.number}` : r.name,
      h1: `${trade} in ${r.address.city}, ${r.address.state}`,
      sub: ctx.copy.heroSub,
      trust,
      showStatus: false,
      actions: actions(r, ["call", "quote"]),
      badge: r.foundedYear && ctx.theme.knobs.badge === "seal" ? `Serving ${r.address.city} since ${r.foundedYear}` : undefined,
    })}
${promoBar(ctx)}
<main id="main">
${emergencyTodo}
<section class="section" id="services" aria-labelledby="services-title"><div class="wrap">
<span class="section__label">Services</span><h2 class="section__title" id="services-title">What we do</h2>
${ctx.copy.heroTagline ? html`<p class="lead">${ctx.copy.heroTagline}</p>` : ""}
${serves ? html`<p class="muted">${serves}</p>` : ""}
${serviceList(ctx, services)}
${x?.warrantyText?.trim() ? html`<p class="guarantee">${icon("check", 22)}<span><strong>Our warranty.</strong> ${x.warrantyText.trim()}</span></p>` : ""}
${guaranteeBand(ctx)}
${licenseTodo}
</div></section>
${plans(ctx, { label: pw.label, title: pw.title, intro: ctx.r.variant === "hvac" ? "A plan member gets a seasonal visit before the heat and the cold, and a crew that already knows the system." : undefined })}
${offersSection(ctx)}
<section class="section section--band" id="how" aria-labelledby="how-title"><div class="wrap">
<span class="section__label">How it works</span><h2 class="section__title" id="how-title">Simple from the first call</h2>
${steps(ctx.copy.steps?.length ? ctx.copy.steps : (DEFAULT_STEPS[r.variant] ?? DEFAULT_STEPS.default!))}
</div></section>
${financingSection(ctx)}
${reviews(ctx)}
${serviceArea(ctx)}
${about(ctx, `About ${r.name}`)}
${faq(contractorFaq(ctx), true)}
${contactForm(ctx, r.services.map((s) => s.name), towns, fields, "Tell us what's going on and we'll call you back.", { photoHint: PHOTO_HINT[r.variant] ?? "the problem" })}
${ctaBand(ctx, actions(r, ["call", "quote"]))}
</main>`;
  },
  pages: () => [],
  copyBrief: (r) => ({
    voice:
      "Plain, neighborly and confident. 6th-8th grade reading level, short sentences, active voice. Name the town naturally. Write no numbers or claims you weren't given: no years, license numbers, warranty terms, prices, response times, review counts, '24/7' or 'emergency' unless provided. Financing: name only the lender given, never rates, '0%', 'no credit check' or approval promises. Say 'licensed' only if a license is in the facts; mention a guarantee or warranty only in the words given.",
    fields: {
      heroTagline: `One sentence (12-22 words) introducing the services list, e.g. what kinds of ${TRADE_NOUN[r.variant]?.toLowerCase() ?? "contractor"} jobs they handle for homes around the town.`,
      heroSub: "One-line promise, 12-22 words, built only from the facts given. No superlatives.",
      heroQuestion: `A headline question a homeowner would say yes to, at most 60 characters, specific to ${TRADE_LABEL[r.variant]?.toLowerCase() ?? "home repairs"} (e.g. "Is your AC blowing warm air?"). No claims, no town.`,
      heroBenefit: "A headline benefit line, at most 60 characters, plain and specific (e.g. \"Hot water back by tonight\" only if same-day is a fact; otherwise a calm benefit like \"Fixed right, explained plainly\"). No superlatives, no numbers.",
      serviceBlurbs: "For each service id given, a 20-35 word blurb that's accurate for the trade. No prices, no guarantees.",
      steps: "Optional. Leave empty to use defaults.",
      faq: `5-6 common homeowner questions about ${TRADE_LABEL[r.variant]?.toLowerCase() ?? "home services"} with helpful, general answers (40-70 words each). Never state prices, timelines, warranties or legal/insurance guarantees. End answers that need specifics with an invitation to call.`,
      serviceAreaIntro: "50-80 words about serving the town and nearby communities listed. No promises about response times.",
      about:
        "Two short paragraphs (70-120 words total). The owner's story is unknown: write a neutral, true introduction (who they serve, what work they do, where). Do not invent history, family, years or credentials.",
      cta: "ctaTitle: 3-7 words inviting the reader to call. ctaLine: one sentence, at most 18 words.",
      metaDescription: "140-155 characters: service + town + one true fact + an action.",
    },
  }),
};
