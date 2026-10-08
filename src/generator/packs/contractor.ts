import { actions } from "../actions.ts";
import { about, cardGrid, contactForm, ctaBand, faq, hero, reviews, sectionHead, serviceArea, steps, type Ctx } from "../components.ts";
import { html } from "../html.ts";
import type { IconName } from "../icons.ts";
import type { BusinessRecord, Service } from "../types.ts";
import { fitTitle, type CategoryPack } from "./types.ts";

export const TRADES = ["plumbing", "hvac", "electrical", "roofing", "painting", "concrete", "remodeling", "handyman", "fencing", "tree", "pest", "appliance", "multi"] as const;

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
    ({ plumbing: "Plumber", hvac: "HVACBusiness", electrical: "Electrician", roofing: "RoofingContractor", painting: "HousePainter", remodeling: "GeneralContractor", pest: "LocalBusiness", appliance: "LocalBusiness", tree: "LocalBusiness" } as Record<string, string>)[r.variant] ?? "HomeAndConstructionBusiness",
  schemaExtras: () => ({}),
  homeTitle(r) {
    const t = TRADE_LABEL[r.variant] ?? "Home Services";
    return fitTitle([`${t} in ${r.address.city}, ${r.address.state} | ${r.name}`, `${t} in ${r.address.city} | ${r.name}`, `${r.name} | ${r.address.city}, ${r.address.state}`, r.name]);
  },
  nav: () => [
    { label: "Services", href: "/#services" },
    { label: "Service area", href: "/#area" },
    { label: "Reviews", href: "/#reviews" },
    { label: "About", href: "/#about" },
    { label: "FAQ", href: "/#faq" },
    { label: "Contact", href: "/#contact" },
  ],
  actionBar: (ctx) => actions(ctx.r, ["call", "quote"]),
  homeFaq: (ctx) => ctx.copy.faq.slice(0, 6),
  home(ctx: Ctx) {
    const r = ctx.r;
    const trade = TRADE_LABEL[r.variant] ?? "Home Services";
    const trust: string[] = [];
    if (r.licenses.length) trust.push("Licensed");
    if (r.insured) trust.push(r.licenses.length ? "Insured" : "Licensed & insured");
    if (r.foundedYear) trust.push(`Since ${r.foundedYear}`);
    if (r.ownershipTags.includes("family_owned")) trust.push("Family-owned");
    if (r.ext.contractor?.emergencyService) trust.push("Emergency service");
    const services = r.services.map((s) => ({
      title: s.name,
      body: ctx.copy.serviceBlurbs[s.id],
      icon: serviceIcon(r.variant, s.id),
    }));
    const towns = r.serviceArea?.towns ?? [];
    return html`${hero(ctx, {
      eyebrow: r.name,
      h1: `${trade} in ${r.address.city}, ${r.address.state}`,
      sub: ctx.copy.heroSub,
      trust,
      showStatus: false,
      actions: actions(r, ["call", "quote"]),
      badge: r.foundedYear && ctx.theme.knobs.badge === "seal" ? `Serving ${r.address.city} since ${r.foundedYear}` : undefined,
    })}
<main id="main">
<section class="section" id="services" aria-labelledby="services-title"><div class="wrap">
<span class="section__label">Services</span><h2 class="section__title" id="services-title">What we do</h2>
${ctx.copy.heroTagline ? html`<p class="lead">${ctx.copy.heroTagline}</p>` : ""}
${cardGrid(services)}
</div></section>
<section class="section section--band" id="how" aria-labelledby="how-title"><div class="wrap">
<span class="section__label">How it works</span><h2 class="section__title" id="how-title">Simple from the first call</h2>
${steps(ctx.copy.steps?.length ? ctx.copy.steps : (DEFAULT_STEPS[r.variant] ?? DEFAULT_STEPS.default!))}
</div></section>
${reviews(ctx)}
${serviceArea(ctx)}
${about(ctx, `About ${r.name}`)}
${faq(ctx.copy.faq.slice(0, 6), true)}
${contactForm(ctx, r.services.map((s) => s.name), towns)}
${ctaBand(ctx, actions(r, ["call", "quote"]))}
</main>`;
  },
  pages: () => [],
  copyBrief: (r) => ({
    voice:
      "Plain, neighborly and confident. 6th-8th grade reading level, short sentences, active voice. Name the town naturally. Write no numbers or claims you weren't given: no years, license numbers, warranty terms, prices, response times, review counts, '24/7' or 'emergency' unless provided.",
    fields: {
      heroTagline: `One sentence (12-22 words) introducing the services list, e.g. what kinds of ${TRADE_NOUN[r.variant]?.toLowerCase() ?? "contractor"} jobs they handle for homes around the town.`,
      heroSub: "One-line promise, 12-22 words, built only from the facts given. No superlatives.",
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
