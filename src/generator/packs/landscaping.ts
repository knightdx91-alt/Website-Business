import { actions } from "../actions.ts";
import { about, cardGrid, contactForm, ctaBand, faq, gallery, hero, reviews, serviceArea, steps, todo, type Ctx, serviceList } from "../components.ts";
import { html } from "../html.ts";
import type { BusinessRecord, Service } from "../types.ts";
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
  if (r.foundedYear) out.push(`Since ${r.foundedYear}`);
  if (r.ext.landscaping?.freeEstimates) out.push("Free estimates");
  if (r.ownershipTags.includes("family_owned")) out.push("Family-owned");
  return out.slice(0, 3);
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
  nav: () => [
    { label: "Services", href: "/#services" },
    { label: "Service area", href: "/#area" },
    { label: "Reviews", href: "/#reviews" },
    { label: "About", href: "/#about" },
    { label: "FAQ", href: "/#faq" },
    { label: "Free quote", href: "/#contact" },
  ],
  actionBar: (ctx) => actions(ctx.r, ctx.r.smsEnabled ? ["quote", "call", "text"] : ["quote", "call"]),
  homeFaq: (ctx) => ctx.copy.faq.slice(0, 6),
  home(ctx: Ctx) {
    const r = ctx.r;
    const t = LABEL[r.variant] ?? "Lawn Care & Landscaping";
    return html`${hero(ctx, {
      eyebrow: r.name,
      h1: `${t} in ${r.address.city}, ${r.address.state}`,
      sub: ctx.copy.heroSub,
      trust: trust(r),
      showStatus: false,
      actions: actions(r, ["quote", "call"]),
      badge: r.foundedYear && ctx.theme.knobs.badge === "seal" ? `Serving ${r.address.city} since ${r.foundedYear}` : undefined,
    })}
<main id="main">
<section class="section" id="services" aria-labelledby="services-title"><div class="wrap">
<span class="section__label">Services</span><h2 class="section__title" id="services-title">What we do</h2>
${ctx.copy.heroTagline ? html`<p class="lead">${ctx.copy.heroTagline}</p>` : ""}
${serviceList(ctx, r.services.map((s) => ({ title: s.name, body: ctx.copy.serviceBlurbs[s.id], icon: "check" as const })))}
${r.confirmed.includes("services") ? "" : todo(ctx, "Check the services list", "We guessed at what you offer. Tell us what to add or remove.", true)}
</div></section>
<section class="section section--band" id="how" aria-labelledby="how-title"><div class="wrap">
<span class="section__label">How it works</span><h2 class="section__title" id="how-title">${r.variant === "design_build" ? "From idea to finished yard" : "Easy to get started"}</h2>
${steps(ctx.copy.steps?.length ? ctx.copy.steps : (STEPS[r.variant] ?? STEPS.lawn_crew!))}
</div></section>
${gallery(ctx, "Add photos of your work", "Before-and-after shots of yards you've done sell a landscaping site better than anything we can write.")}
${reviews(ctx)}
${serviceArea(ctx)}
${about(ctx, `About ${r.name}`)}
${faq(ctx.copy.faq.slice(0, 6), true)}
${contactForm(
  ctx,
  r.services.map((s) => s.name),
  r.serviceArea?.towns ?? [],
  [{ name: "frequency", label: "How often?", options: ["One time", "Weekly", "Every 2 weeks", "Monthly", "Not sure"] }],
  "Tell us about your yard and what you need. We'll get back to you with a price.",
)}
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
