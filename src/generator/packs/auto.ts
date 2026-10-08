import { actions } from "../actions.ts";
import { about, cardGrid, contactForm, ctaBand, faq, hero, infoStrip, reviews, serviceArea, steps, visit, type Ctx } from "../components.ts";
import { hasAnyHours } from "../hours.ts";
import { html } from "../html.ts";
import type { IconName } from "../icons.ts";
import type { BusinessRecord, Service } from "../types.ts";
import { fitTitle, type CategoryPack } from "./types.ts";

export function autoVariant(primaryType: string | undefined, types: string[], name: string): string {
  const all = [primaryType ?? "", ...types];
  const n = name.toLowerCase();
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
};

const SEEDS: Record<string, string[]> = {
  general: ["Brakes", "Oil changes", "Check engine light & diagnostics", "Tires & alignment", "AC & heating", "Engine repair", "Suspension & steering", "Batteries & electrical"],
  tire: ["Tires", "Alignment", "Brakes", "Oil changes", "Check engine light & diagnostics", "Suspension & steering"],
  transmission: ["Transmission repair", "Transmission service", "Clutch repair", "Diagnostics", "Drivetrain repair", "Brakes"],
  diesel: ["Diesel repair", "Diagnostics", "Brakes", "Oil changes", "Engine repair", "Suspension & steering"],
  european: ["Diagnostics", "Brakes", "Oil changes", "Engine repair", "AC & heating", "Suspension & steering"],
  towing: ["Towing", "Diagnostics", "Brakes", "Engine repair", "Tires", "Batteries & electrical"],
};

export function seedAutoServices(variant: string): Service[] {
  return (SEEDS[variant] ?? SEEDS.general!).map((name) => ({ id: name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/-$/, ""), name, featured: true }));
}

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
    if (r.variant === "european") return "auto.clear_diagnostic";
    if (r.ownershipTags.includes("family_owned") || (r.foundedYear && r.foundedYear < 2000)) return "auto.main_street_garage";
    return "auto.shop_floor";
  },
  variantLabel: (r) => LABEL[r.variant] ?? "Auto Repair",
  schemaType: (r) => (r.variant === "tire" ? ["AutoRepair", "TireShop"] : "AutoRepair"),
  schemaExtras: () => ({}),
  homeTitle(r) {
    const t = LABEL[r.variant] ?? "Auto Repair";
    return fitTitle([`${t} in ${r.address.city}, ${r.address.state} | ${r.name}`, `${t} in ${r.address.city} | ${r.name}`, `Auto Repair in ${r.address.city} | ${r.name}`, `${r.name} | ${r.address.city}, ${r.address.state}`, r.name]);
  },
  nav: () => [
    { label: "Services", href: "/#services" },
    { label: "Reviews", href: "/#reviews" },
    { label: "About", href: "/#about" },
    { label: "Hours & location", href: "/#visit" },
    { label: "FAQ", href: "/#faq" },
    { label: "Appointments", href: "/#contact" },
  ],
  actionBar: (ctx) => actions(ctx.r, ["call", ctx.r.links.booking ? "book" : "quote", "directions"]),
  homeFaq: (ctx) => ctx.copy.faq.slice(0, 6),
  home(ctx: Ctx) {
    const r = ctx.r;
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
<span class="section__label">Services</span><h2 class="section__title" id="services-title">What we fix</h2>
${ctx.copy.heroTagline ? html`<p class="lead">${ctx.copy.heroTagline}</p>` : ""}
${cardGrid(r.services.map((s, i) => ({ title: s.name, body: ctx.copy.serviceBlurbs[s.id], icon: ICONS[i % ICONS.length] })))}
</div></section>
<section class="section section--band" id="how" aria-labelledby="how-title"><div class="wrap">
<span class="section__label">How it works</span><h2 class="section__title" id="how-title">No surprises</h2>
${steps(ctx.copy.steps?.length ? ctx.copy.steps : STEPS)}
</div></section>
${reviews(ctx)}
${about(ctx, `About ${r.name}`)}
${visit(ctx)}
${serviceArea(ctx)}
${faq(ctx.copy.faq.slice(0, 6), true)}
${contactForm(ctx, r.services.map((s) => s.name), [], [{ name: "vehicle", label: "Vehicle (year, make, model)", autocomplete: "off" }], "Tell us what your car is doing and when you'd like to bring it in. We'll call you back.")}
${ctaBand(ctx, actions(r, ["call", "directions"]))}
</main>`;
  },
  pages: () => [],
  copyBrief: (r) => ({
    voice:
      "Plain, confident and neighborly, like a trusted mechanic explaining things. Short sentences. Never mention ASE, warranties, years, family-owned, towing hours, shuttles, loaners, prices or 'estimate before any work' unless given in the facts.",
    fields: {
      heroTagline: "One sentence (12-22 words) introducing the services list: what kinds of vehicles and problems they handle around town.",
      heroSub: "One line (15-25 words) on what they fix, for drivers in the town. No superlatives, no claims beyond the facts.",
      serviceBlurbs: "For each service id, one plain line (10-20 words): what it covers and a warning sign to watch for. No prices, no numbers.",
      faq: "5-6 general car-care questions drivers ask (when to change oil, what a check-engine light means, signs of brake wear, etc.) with helpful general answers (35-60 words). No prices, no mileage numbers, no claims about this shop's policies. Where specifics matter, invite them to call.",
      serviceAreaIntro: "One or two sentences about serving drivers in the town and the nearby communities listed.",
      about:
        "Two short paragraphs (70-120 words total). The owner's story is unknown: write a neutral, true introduction (what kind of shop, who it serves, where). Do not invent history, people, years or credentials.",
      cta: "ctaTitle: 3-7 words. ctaLine: one sentence, at most 18 words, inviting them to call or stop by.",
      metaDescription: "140-155 characters: service + town + one true fact + an action.",
    },
  }),
};

