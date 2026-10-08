import { actions } from "../actions.ts";
import { about, cardGrid, contactForm, ctaBand, faq, hero, reviews, serviceArea, steps, todo, type Ctx } from "../components.ts";
import { html } from "../html.ts";
import type { BusinessRecord, Service } from "../types.ts";
import { fitTitle, type CategoryPack } from "./types.ts";

export function cleaningVariant(_primaryType: string | undefined, _types: string[], name: string): string {
  return /\b(commercial|janitorial|office|building)\b/i.test(name) ? "commercial" : "residential";
}

const LABEL: Record<string, string> = { residential: "House Cleaning", commercial: "Commercial Cleaning" };

const SEEDS: Record<string, string[]> = {
  residential: ["Standard & recurring cleaning", "Deep cleaning", "Move-in & move-out cleaning", "One-time cleaning"],
  commercial: ["Office cleaning", "Janitorial service", "Move-out cleaning", "Post-construction cleanup"],
};

export function seedCleaningServices(variant: string): Service[] {
  return (SEEDS[variant] ?? SEEDS.residential!).map((name) => ({ id: name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/-$/, ""), name, featured: true }));
}

const STEPS = [
  { title: "Ask for a quote", body: "Call, text or send the form. Tell us about your space." },
  { title: "We set a time", body: "We confirm the price and pick a day that works." },
  { title: "We clean", body: "You come home to a clean place." },
];

function trust(r: BusinessRecord): string[] {
  const c = r.ext.cleaning ?? {};
  const out: string[] = [];
  if (r.insured && r.bonded) out.push("Insured & bonded");
  else if (r.insured) out.push("Insured");
  if (c.backgroundChecked) out.push("Background-checked team");
  if (r.foundedYear) out.push(`Since ${r.foundedYear}`);
  if (c.suppliesIncluded) out.push("We bring supplies");
  if (c.petSafe) out.push("Pet-safe products");
  if (r.ownershipTags.includes("family_owned")) out.push("Family-owned");
  return out.slice(0, 4);
}

export const cleaningPack: CategoryPack = {
  id: "cleaning",
  label: "Cleaning services",
  titleMode: "service",
  locationModel: "service_area",
  hasForm: () => true,
  looks: ["cleaning.fresh_linen", "cleaning.clear_blue", "cleaning.magnolia_porch", "cleaning.bright_bold"],
  defaultLook(r) {
    if (r.variant === "commercial") return "cleaning.clear_blue";
    if (r.ownershipTags.includes("family_owned")) return "cleaning.magnolia_porch";
    return "cleaning.fresh_linen";
  },
  variantLabel: (r) => LABEL[r.variant] ?? "House Cleaning",
  schemaType: () => "LocalBusiness",
  schemaExtras: () => ({}),
  homeTitle(r) {
    const t = LABEL[r.variant] ?? "House Cleaning";
    return fitTitle([`${t} in ${r.address.city}, ${r.address.state} | ${r.name}`, `${t} in ${r.address.city} | ${r.name}`, `Cleaning in ${r.address.city}, ${r.address.state} | ${r.name}`, `${r.name} | ${r.address.city}, ${r.address.state}`, r.name]);
  },
  nav: () => [
    { label: "Services", href: "/#services" },
    { label: "How it works", href: "/#how" },
    { label: "Reviews", href: "/#reviews" },
    { label: "Service area", href: "/#area" },
    { label: "FAQ", href: "/#faq" },
    { label: "Get a quote", href: "/#contact" },
  ],
  actionBar: (ctx) => actions(ctx.r, ctx.r.smsEnabled ? ["quote", "call", "text"] : ["quote", "call"]),
  homeFaq: (ctx) => ctx.copy.faq.slice(0, 6),
  home(ctx: Ctx) {
    const r = ctx.r;
    const t = LABEL[r.variant] ?? "House Cleaning";
    return html`${hero(ctx, {
      eyebrow: r.name,
      h1: `${t} in ${r.address.city}, ${r.address.state}`,
      sub: ctx.copy.heroSub,
      trust: trust(r),
      showStatus: false,
      actions: actions(r, r.smsEnabled ? ["quote", "call", "text"] : ["quote", "call"]),
      badge: r.foundedYear && ctx.theme.knobs.badge === "seal" ? `Since ${r.foundedYear}` : undefined,
    })}
<main id="main">
<section class="section" id="services" aria-labelledby="services-title"><div class="wrap">
<span class="section__label">Services</span><h2 class="section__title" id="services-title">${r.variant === "commercial" ? "What we clean" : "Cleaning options"}</h2>
${ctx.copy.heroTagline ? html`<p class="lead">${ctx.copy.heroTagline}</p>` : ""}
${cardGrid(r.services.map((s) => ({ title: s.name, body: ctx.copy.serviceBlurbs[s.id], icon: "check" as const })), 2)}
${r.confirmed.includes("services") ? "" : todo(ctx, "Check the services list", "We guessed at what you offer. Tell us what to add or remove, and if you'd like starting prices shown.", true)}
</div></section>
<section class="section section--band" id="how" aria-labelledby="how-title"><div class="wrap">
<span class="section__label">How it works</span><h2 class="section__title" id="how-title">Three easy steps</h2>
${steps(ctx.copy.steps?.length ? ctx.copy.steps : STEPS)}
</div></section>
<div class="wrap">${trust(r).length ? "" : todo(ctx, "Tell us your trust details", "Insured? Bonded? Background checks? Bring your own supplies? These help people feel good about letting you in their home.")}</div>
${reviews(ctx)}
${about(ctx, `About ${r.name}`)}
${serviceArea(ctx)}
${faq(ctx.copy.faq.slice(0, 6), true)}
${contactForm(
  ctx,
  r.services.map((s) => s.name),
  r.serviceArea?.towns ?? [],
  r.variant === "commercial"
    ? [{ name: "frequency", label: "How often?", options: ["One time", "Daily", "Weekly", "Every 2 weeks", "Monthly"] }]
    : [
        { name: "home_size", label: "Home size", options: ["1-2 bedrooms", "3 bedrooms", "4 bedrooms", "5+ bedrooms"] },
        { name: "frequency", label: "How often?", options: ["One time", "Weekly", "Every 2 weeks", "Monthly", "Not sure"] },
      ],
  "Tell us about your space and we'll get back to you with a price.",
)}
${ctaBand(ctx, actions(r, ["quote", "call"]))}
</main>`;
  },
  pages: () => [],
  copyBrief: () => ({
    voice:
      "Warm, plain-spoken and confident, Southern-friendly without dialect. Short sentences, second person ('your home'). Never mention insurance, bonding, background checks, guarantees, supplies, products, prices or years unless given in the facts.",
    fields: {
      heroTagline: "One sentence (12-22 words) introducing the cleaning options for homes (or businesses) in and around the town.",
      heroSub: "One supporting line (15-25 words) under the headline: who it's for, built only from the facts. No superlatives.",
      serviceBlurbs: "For each service id, one line (12-25 words) on what it's best for. General and true; no prices, no promises.",
      faq:
        "5-6 general questions people ask before hiring a cleaner (difference between standard and deep cleaning, how often to schedule, what to do before the cleaners arrive, etc.) with helpful general answers (35-60 words). Never state this company's policies, prices, guarantees or supplies. Invite them to ask for a quote where it depends.",
      serviceAreaIntro: "One or two sentences about cleaning in the town and nearby communities listed.",
      about:
        "Two short paragraphs (70-120 words total). The owner's story is unknown: write a neutral, true introduction (what they clean, who they serve, where). Do not invent history, team size, years or credentials.",
      cta: "ctaTitle: 3-7 words. ctaLine: one sentence, at most 18 words, inviting them to ask for a quote.",
      metaDescription: "140-155 characters: cleaning type + town + one true fact + an action.",
    },
  }),
};
