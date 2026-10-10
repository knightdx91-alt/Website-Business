import { actions } from "../actions.ts";
import { about, contactForm, ctaBand, faq, gallery, guaranteeBand, guaranteeChip, guaranteeFaq, hero, offersSection, plans, promoBar, reviews, sectionHead, serviceArea, steps, todo, type Ctx, type FormField, serviceList } from "../components.ts";
import { html, raw, type Raw } from "../html.ts";
import { icon } from "../icons.ts";
import type { BusinessRecord, Faq, Plan, Service } from "../types.ts";
import { fitTitle, type CategoryPack } from "./types.ts";

export function landscapingVariant(_primaryType: string | undefined, _types: string[], name: string): string {
  return /\b(design|hardscap|outdoor living|irrigation|lighting|patio|stone)\b/i.test(name) ? "design_build" : "lawn_crew";
}

const LABEL: Record<string, string> = { lawn_crew: "Lawn Care & Landscaping", design_build: "Landscaping & Hardscapes" };

const SEEDS: Record<string, string[]> = {
  lawn_crew: ["Mowing & edging", "Bed maintenance", "Mulch & pine straw", "Hedge & shrub trimming", "Seasonal cleanups", "Sod installation"],
  design_build: ["Landscape design", "Planting", "Patios & walkways", "Retaining walls", "Drainage", "Landscape lighting"],
};

export function seedLandscapingServices(variant: string): Service[] {
  return (SEEDS[variant] ?? SEEDS.lawn_crew!).map((name) => ({ id: name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/-$/, ""), name, featured: true }));
}

const STEPS: Record<string, Array<{ title: string; body: string }>> = {
  lawn_crew: [
    { title: "Ask for a quote", body: "Call, text or send the form with what you need." },
    { title: "We take a look", body: "We see the yard and give you a clear price." },
    { title: "You're on the schedule", body: "We show up and get to work." },
  ],
  design_build: [
    { title: "Consultation", body: "We walk the yard with you and talk through ideas." },
    { title: "Design", body: "We put together a plan and a clear price." },
    { title: "Build", body: "Our crew installs it and cleans up." },
    { title: "Enjoy", body: "You enjoy the space. We can help keep it looking good." },
  ],
};

function trust(r: BusinessRecord): string[] {
  const out: string[] = [];
  if (r.licenses.length && r.insured) out.push("Licensed & insured");
  else if (r.insured) out.push("Insured");
  else if (r.licenses.length) out.push("Licensed");
  const permit = r.ext.landscaping?.adaiPermit?.trim();
  if (permit) out.push(`ADAI permit #${permit}`);
  if (r.foundedYear) out.push(`Since ${r.foundedYear}`);
  if (r.ext.landscaping?.freeEstimates) out.push("Free estimates");
  const g = guaranteeChip(r.guarantee);
  if (g) out.push(g);
  if (r.ownershipTags.includes("family_owned")) out.push("Family-owned");
  return out.slice(0, 4);
}

/* ---------- Oct 2026 modules (research/trends-2026/trades-lawn-cleaning.md §2D, §5) ---------- */

/** Fertilizing, weed or pest work for pay needs an Alabama ADAI permit; mowing, trimming and planting don't. */
export const ADAI_SERVICE = /fertiliz|weed|pest|spray|herbicide|pre-?emergent/i;
export function needsAdaiPermit(r: BusinessRecord): boolean {
  return r.services.some((s) => ADAI_SERVICE.test(s.name));
}

/** Alabama timing per season, matched against the services the record actually has. Nothing matched, nothing rendered. */
const SEASONS: Array<{ name: string; when: string; rules: Array<[RegExp, string]> }> = [
  {
    name: "Spring",
    when: "March to May",
    rules: [
      [/clean.?up/i, "Beds cleaned out and edged before everything greens up"],
      [/pre-?emergent|weed|fertiliz/i, "Pre-emergent in February and early March, first feeding late March to April"],
      [/mow|edg/i, "Mowing starts mid-March as the grass wakes up"],
      [/mulch|pine straw/i, "Fresh mulch or pine straw before Easter"],
      [/\bsod\b|plant/i, "Sod and new plantings once the nights warm up"],
      [/irrigat|sprinkler/i, "Irrigation turned on and checked"],
    ],
  },
  {
    name: "Summer",
    when: "June to August",
    rules: [
      [/mow|edg/i, "Weekly mowing through the hottest months"],
      [/irrigat|sprinkler/i, "Irrigation checks and repairs when it's dry"],
      [/hedge|shrub|trim/i, "Hedges and shrubs trimmed after the spring flush"],
      [/\bbed/i, "Beds weeded and kept tidy"],
      [/weed|fertiliz/i, "Last feeding by late May, then weed control"],
    ],
  },
  {
    name: "Fall",
    when: "September to November",
    rules: [
      [/leaf|leaves|clean.?up/i, "Leaves and fall cleanup"],
      [/aerat|overseed|seed/i, "Aeration and overseeding as temperatures drop"],
      [/pre-?emergent|weed|fertiliz/i, "Fall pre-emergent mid-September to early October"],
      [/pine straw|mulch/i, "Pine straw refreshed for winter"],
      [/mow/i, "Final mows of the year in November"],
    ],
  },
  {
    name: "Winter",
    when: "December to February",
    rules: [
      [/prun|tree|shrub/i, "Dormant pruning of trees and shrubs"],
      [/patio|wall|walkway|hardscap|design|install|drainage|lighting|stone/i, "The best time to build: patios, walls, drainage and new landscapes"],
      [/clean.?up|debris|storm/i, "Storm and debris cleanup"],
      [/plant/i, "Dormant-season planting of trees and shrubs"],
    ],
  },
];

export interface SeasonBlock {
  name: string;
  when: string;
  items: Array<{ service: string; line: string }>;
}

/** The seasons that have at least one of this record's services in them. */
export function seasonBlocks(r: BusinessRecord): SeasonBlock[] {
  return SEASONS.map((s) => {
    const items: SeasonBlock["items"] = [];
    const seen = new Set<string>();
    for (const [re, line] of s.rules) {
      for (const svc of r.services) {
        if (seen.has(svc.id) || !re.test(svc.name)) continue;
        seen.add(svc.id);
        items.push({ service: svc.name, line });
      }
    }
    return { name: s.name, when: s.when, items };
  }).filter((s) => s.items.length);
}

/** "What we do when": a 4-season block, only when the owner turned it on and only from their services. */
export function seasonalCalendar(ctx: Ctx): Raw {
  if (!ctx.r.ext.landscaping?.seasonal) return raw("");
  const blocks = seasonBlocks(ctx.r);
  if (!blocks.length) return raw("");
  return html`<section class="section section--band" id="seasons" aria-labelledby="seasons-title"><div class="wrap">
${sectionHead("Through the year", "What we do when", `North Alabama yards have a season for everything. Here's when each job happens around ${ctx.r.address.city}.`, "seasons-title")}
<ul class="seasons">${blocks.map((s) => html`<li class="season"><h3>${s.name}</h3><p class="season__when">${s.when}</p><ul>${s.items.map((i) => html`<li><strong>${i.service}</strong>${i.line}</li>`)}</ul></li>`)}</ul>
</div></section>`;
}

/**
 * "Ways to work with us" for a lawn crew without owner plans: weekly, every 2 weeks and one-time, each listing the
 * services from the record that fit (no prices). The quote form already offers these frequencies, so no new claim is made.
 */
export function lawnPlans(r: BusinessRecord): Plan[] | undefined {
  if (r.plans?.length) return r.plans;
  if (r.variant !== "lawn_crew") return undefined;
  const names = (re: RegExp) => r.services.filter((s) => re.test(s.name)).map((s) => s.name);
  const upkeep = names(/mow|edg|trim|blow|bed/i);
  const projects = names(/clean|mulch|pine|sod|aerat|leaf|hedge|shrub|seed|install/i);
  const out: Plan[] = [];
  if (upkeep.length) {
    out.push({ name: "Weekly", includes: upkeep, note: "The yard never gets ahead of you." });
    out.push({ name: "Every 2 weeks", includes: upkeep, badge: "Most popular", note: "Good for slower-growing yards and shady lots." });
  }
  if (projects.length) out.push({ name: "One-time or seasonal", includes: projects.slice(0, 5), note: "Cleanups, mulch and projects, priced per job." });
  return out.length >= 2 ? out : undefined;
}

export function landscapingFaq(ctx: Ctx): Faq[] {
  const out = [...ctx.copy.faq.slice(0, 6)];
  const g = guaranteeFaq(ctx.r);
  if (g) out.push(g);
  return out;
}

export function landscapingBannedPhrases(r: BusinessRecord): RegExp[] {
  const own = [r.guarantee?.text, r.guarantee?.remedy, ...(r.plans ?? []).flatMap((p) => [p.name, p.note, ...p.includes]), ...(r.offers ?? []).flatMap((o) => [o.title, o.detail])].filter(Boolean).join(" \n ");
  const out: RegExp[] = [];
  if (!r.licenses.length) out.push(/\b(?:we are|we're|fully|state)[- ]licensed\b|\blicensed (?:and|&) insured\b/i);
  if (!r.guarantee) out.push(/\b(?:guaranteed?|guarantees|warranty)\b/i);
  if (!r.ext.landscaping?.adaiPermit) out.push(/\b(?:licensed|certified) (?:applicator|pesticide)\b/i);
  return out.filter((re) => !re.test(own));
}

export const landscapingPack: CategoryPack = {
  id: "landscaping",
  label: "Landscaping and lawn care",
  titleMode: "service",
  locationModel: "service_area",
  hasForm: () => true,
  looks: ["landscaping.fresh_stripe", "landscaping.red_clay_pine", "landscaping.stone_garden", "landscaping.neighborhood_crew"],
  defaultLook(r) {
    if (r.variant === "design_build") return "landscaping.stone_garden";
    if (r.ownershipTags.includes("family_owned") || (r.foundedYear && r.foundedYear < 2010)) return "landscaping.red_clay_pine";
    return "landscaping.fresh_stripe";
  },
  variantLabel: (r) => LABEL[r.variant] ?? "Lawn Care & Landscaping",
  schemaType: () => "HomeAndConstructionBusiness",
  schemaExtras: (ctx) => ({
    additionalType: ctx.r.variant === "design_build" ? "https://www.productontology.org/id/Landscape_architecture" : "https://www.productontology.org/id/Lawn",
  }),
  homeTitle(r) {
    const t = LABEL[r.variant] ?? "Lawn Care & Landscaping";
    return fitTitle([`${t} in ${r.address.city}, ${r.address.state} | ${r.name}`, `${t} in ${r.address.city} | ${r.name}`, `Lawn Care in ${r.address.city}, ${r.address.state} | ${r.name}`, `${r.name} | ${r.address.city}, ${r.address.state}`, r.name]);
  },
  nav: (ctx) => [
    { label: "Services", href: "/#services" },
    ...(lawnPlans(ctx.r) ? [{ label: "Plans", href: "/#plans" }] : []),
    { label: "Service area", href: "/#area" },
    { label: "Reviews", href: "/#reviews" },
    { label: "About", href: "/#about" },
    { label: "FAQ", href: "/#faq" },
    { label: "Free quote", href: "/#contact" },
  ],
  actionBar: (ctx) => actions(ctx.r, ctx.r.smsEnabled ? ["quote", "call", "text"] : ["quote", "call"]),
  homeFaq: (ctx) => landscapingFaq(ctx),
  bannedPhrases: (r) => landscapingBannedPhrases(r),
  home(ctx: Ctx) {
    const r = ctx.r;
    const x = r.ext.landscaping;
    const t = LABEL[r.variant] ?? "Lawn Care & Landscaping";
    const adaiTodo = needsAdaiPermit(r) && !x?.adaiPermit?.trim() ? todo(ctx, "Add your ADAI permit number", "Fertilizing, weed control or pest treatments for pay need an Alabama Department of Agriculture & Industries permit. Type the number in Edit (it shows as a chip), or take those services off the list.", true) : raw("");
    const crew = x?.crew?.trim() ? html`<p class="crew">${icon("check", 22)}<span>${x.crew.trim()}</span></p>` : undefined;
    const planItems = lawnPlans(r);
    const fields: FormField[] = [
      { name: "frequency", label: "How often?", options: ["One time", "Weekly", "Every 2 weeks", "Monthly", "Not sure"] },
      { name: "property", label: "Property", options: ["Residential", "Commercial", "Not sure"] },
      { name: "reach", label: "Best way to reach you", options: ["Call", "Text"] },
    ];
    return html`${hero(ctx, {
      eyebrow: r.name,
      h1: `${t} in ${r.address.city}, ${r.address.state}`,
      sub: ctx.copy.heroSub,
      trust: trust(r),
      showStatus: false,
      actions: actions(r, ["quote", "call"]),
      badge: r.foundedYear && ctx.theme.knobs.badge === "seal" ? `Serving ${r.address.city} since ${r.foundedYear}` : undefined,
    })}
${promoBar(ctx)}
<main id="main">
<section class="section" id="services" aria-labelledby="services-title"><div class="wrap">
<span class="section__label">Services</span><h2 class="section__title" id="services-title">What we do</h2>
${ctx.copy.heroTagline ? html`<p class="lead">${ctx.copy.heroTagline}</p>` : ""}
${serviceList(ctx, r.services.map((s) => ({ title: s.name, body: ctx.copy.serviceBlurbs[s.id], icon: "check" as const })))}
${guaranteeBand(ctx)}
${r.confirmed.includes("services") ? "" : todo(ctx, "Check the services list", "We guessed at what you offer. Tell us what to add or remove.", true)}
${adaiTodo}
</div></section>
${plans(ctx, { label: "Ways to work with us", title: "Pick what fits your yard", intro: planItems && !r.plans?.length ? "Most yards fit one of these. Tell us which and we'll price it after a quick look." : undefined, todo: planItems && !r.plans?.length ? todo(ctx, "Check these ways to work with us", "We built these from your services list, with no prices. Add starting prices, rename them or turn them off in Edit → Plans & pricing.") : undefined }, planItems)}
${seasonalCalendar(ctx)}
${offersSection(ctx)}
<section class="section section--band" id="how" aria-labelledby="how-title"><div class="wrap">
<span class="section__label">How it works</span><h2 class="section__title" id="how-title">${r.variant === "design_build" ? "From idea to finished yard" : "Easy to get started"}</h2>
${steps(ctx.copy.steps?.length ? ctx.copy.steps : (STEPS[r.variant] ?? STEPS.lawn_crew!))}
</div></section>
${gallery(ctx, "Add photos of your work", "Before-and-after shots of yards you've done sell a landscaping site better than anything we can write. Pair a before with its after in Edit → Photo gallery.")}
${reviews(ctx)}
${serviceArea(ctx)}
${about(ctx, `About ${r.name}`, "About us", crew)}
${faq(landscapingFaq(ctx), true)}
${contactForm(ctx, r.services.map((s) => s.name), r.serviceArea?.towns ?? [], fields, "Tell us about your yard and what you need. We'll get back to you with a price.", { photoHint: "your yard" })}
${ctaBand(ctx, actions(r, ["quote", "call"]))}
</main>`;
  },
  pages: () => [],
  copyBrief: (r) => ({
    voice:
      "Friendly, plain-spoken, local and confident, like a crew owner talking to a neighbor. Never mention licensing, insurance, years, guarantees, response times, prices, chemicals or products unless given in the facts.",
    fields: {
      heroTagline: "One sentence (12-22 words) introducing the services list for yards in and around the town.",
      heroSub: "One supporting line (12-20 words) under the headline, built only from the facts. No superlatives.",
      heroQuestion: "A headline question a homeowner would nod at, at most 60 characters (e.g. \"Tired of spending Saturday on the mower?\"). No claims, no town.",
      heroBenefit: "A headline benefit line, at most 60 characters, plain and warm (e.g. \"Take your weekend back\"). No superlatives, no numbers.",
      serviceBlurbs: "For each service id, one benefit line (10-18 words). General and true; no chemicals, rates or timing claims.",
      faq:
        "5-6 general yard-care questions homeowners ask (how often to mow in the Southern growing season, when to do a fall cleanup, mulch vs pine straw, etc.) with helpful general answers (35-60 words). No prices, no contract or guarantee claims, no chemical advice. Invite them to ask for a quote where specifics matter.",
      serviceAreaIntro: "One or two sentences about working in the town and nearby communities listed.",
      about:
        "Two short paragraphs (70-120 words total). The owner's story is unknown: write a neutral, true introduction (what work they do, who they serve, where). Do not invent history, crew size, years or credentials.",
      cta: `ctaTitle: 3-7 words. ctaLine: one sentence, at most 18 words, inviting them to ask for a quote.`,
      metaDescription: `140-155 characters: ${LABEL[r.variant]?.toLowerCase() ?? "lawn care"} + town + one true fact + an action.`,
    },
  }),
};
