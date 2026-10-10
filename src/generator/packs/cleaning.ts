import { action, actions, type Action } from "../actions.ts";
import { about, contactForm, ctaBand, faq, gallery, guaranteeBand, guaranteeChip, guaranteeFaq, hero, offersSection, plans, promoBar, reviews, sectionHead, serviceArea, steps, todo, todoBlock, type Ctx, type FormField, serviceList } from "../components.ts";
import { html, raw, type Raw } from "../html.ts";
import { icon } from "../icons.ts";
import type { BusinessRecord, CleaningChecklist, Faq, Service } from "../types.ts";
import { fitTitle, type CategoryPack } from "./types.ts";

export function cleaningVariant(_primaryType: string | undefined, _types: string[], name: string): string {
  if (/\b(pressure|power|soft)\s?wash\w*|\bwindow\b|\bexterior\b/i.test(name)) return "exterior";
  return /\b(commercial|janitorial|office|building)\b/i.test(name) ? "commercial" : "residential";
}

const LABEL: Record<string, string> = { residential: "House Cleaning", commercial: "Commercial Cleaning", exterior: "Pressure Washing" };

const SEEDS: Record<string, string[]> = {
  residential: ["Standard & recurring cleaning", "Deep cleaning", "Move-in & move-out cleaning", "One-time cleaning"],
  commercial: ["Office cleaning", "Janitorial service", "Move-out cleaning", "Post-construction cleanup"],
  exterior: ["House washing", "Driveways & sidewalks", "Decks & fences", "Roof soft washing", "Gutter cleaning", "Window cleaning"],
};

export function seedCleaningServices(variant: string): Service[] {
  return (SEEDS[variant] ?? SEEDS.residential!).map((name) => ({ id: name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/-$/, ""), name, featured: true }));
}

const STEPS = [
  { title: "Ask for a quote", body: "Call, text or send the form. Tell us about your space." },
  { title: "We set a time", body: "We confirm the price and pick a day that works." },
  { title: "We clean", body: "You come home to a clean place." },
];
/** Commercial onboarding: walkthrough → written scope → recurring schedule (research §3C, Sweepers/Office Pride). */
const STEPS_COMMERCIAL = [
  { title: "Walkthrough", body: "We come see the building, after hours if that's easier, and listen to what matters to you." },
  { title: "Written scope", body: "You get a written scope and price: what gets done, how often, and who to call." },
  { title: "Recurring schedule", body: "We start on your schedule and check in so it stays right." },
];

/* ---------- Oct 2026 modules (research/trends-2026/trades-lawn-cleaning.md §3D, §5) ---------- */

/** Facility types a commercial cleaner can tick (fixed list; the chips never say more than the owner ticked). */
export const CLEANING_FACILITIES = ["Offices", "Medical & dental", "Churches", "Schools & daycares", "Retail stores", "Restaurants", "Banks", "Gyms", "Industrial & warehouses", "Apartment common areas", "Vacation rentals", "Post-construction"] as const;

/** Rooms the Edit screen offers for the what's-included checklist. */
export const CHECKLIST_ROOMS = ["Every room", "Kitchen", "Bathrooms", "Bedrooms", "Living areas"] as const;

/** "Dust ceiling fans @deep @move" → task "Dust ceiling fans", tiers ["deep", "move"]; untagged → every tier. */
export function parseTask(task: string): { task: string; tags: string[] } {
  const tags: string[] = [];
  const text = task.replace(/\s*@([a-z0-9-]+)/gi, (_, t: string) => {
    tags.push(t.toLowerCase());
    return "";
  }).trim();
  return { task: text, tags };
}

/** Does a tag like "deep" name the tier "Deep clean"? Prefix match on the first word, so "@move" hits "Move-out". */
export function tagMatches(tag: string, tier: string): boolean {
  const t = tier.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return t.startsWith(tag) || t.split(" ").some((w) => w.startsWith(tag));
}

export function checklistHasContent(c: CleaningChecklist | undefined): boolean {
  return !!c && c.rooms.some((r) => r.tasks.some((t) => parseTask(t).task));
}

/** What's included: a table of tasks by room with a ✓ per tier, and a "may cost extra" list. Nothing without tasks. */
export function checklistTable(ctx: Ctx): Raw {
  const c = ctx.r.ext.cleaning?.checklist;
  if (!checklistHasContent(c)) return raw("");
  const tiers = c!.tiers.filter(Boolean);
  const cols = tiers.length ? tiers : ["Included"];
  const rooms = c!.rooms.map((r) => ({ room: r.room, tasks: r.tasks.map(parseTask).filter((t) => t.task) })).filter((r) => r.tasks.length);
  const mark = (t: { tags: string[] }, tier: string) => {
    const yes = !t.tags.length || !tiers.length || t.tags.some((tag) => tagMatches(tag, tier));
    return yes ? html`<td class="tiers__mark tiers__yes">${icon("check", 20)}<span class="sr">Included</span></td>` : html`<td class="tiers__mark tiers__no">–<span class="sr">Not included</span></td>`;
  };
  return html`<section class="section" id="included" aria-labelledby="included-title"><div class="wrap">
${sectionHead("What's included", tiers.length > 1 ? "Standard, deep or move-out: what each one covers" : "What's included in a clean", undefined, "included-title")}
<div class="tiers-wrap"><table class="tiers"><caption class="sr">What each cleaning includes</caption>
<thead><tr><th scope="col">Task</th>${cols.map((t) => html`<th scope="col" class="tiers__mark">${t}</th>`)}</tr></thead>
<tbody>${rooms.map(
    (r) => html`<tr class="tiers__room"><th scope="rowgroup" colspan="${cols.length + 1}">${r.room}</th></tr>${r.tasks.map((t) => html`<tr><th scope="row">${t.task}</th>${cols.map((tier) => mark(t, tier))}</tr>`)}`,
  )}</tbody></table></div>
${c!.extras.filter(Boolean).length ? html`<h3 class="tiers__extra">May cost extra</h3><ul class="chips" aria-label="May cost extra">${c!.extras.filter(Boolean).map((e) => html`<li class="chip">${e}</li>`)}</ul>` : ""}
</div></section>`;
}

/** Commercial: who they clean for, from the owner's ticks, plus the frequency line in their words. */
export function facilitiesSection(ctx: Ctx): Raw {
  const x = ctx.r.ext.cleaning;
  const list = (x?.facilities ?? []).filter(Boolean);
  if (!list.length && !x?.frequency?.trim()) return raw("");
  return html`<section class="section section--band" id="facilities" aria-labelledby="facilities-title"><div class="wrap">
${sectionHead("Who we clean for", list.length ? "Buildings we take care of" : "On your schedule", x?.frequency?.trim() || undefined, "facilities-title")}
${list.length ? html`<ul class="chips" aria-label="Facility types">${list.map((f) => html`<li class="chip">${icon("check", 16)}${f}</li>`)}</ul>` : ""}
${x?.afterHours ? html`<p class="muted">We can clean after hours, so your team never works around us.</p>` : ""}
</div></section>`;
}

/** Commercial cleaners ask for a walkthrough, not a quote; the form's topic follows. */
export function walkthroughAction(r: BusinessRecord): Action {
  return { ...action(r, "quote")!, label: "Request a walkthrough", short: "Walkthrough" };
}

export function cleaningFaq(ctx: Ctx): Faq[] {
  const out = [...ctx.copy.faq.slice(0, 6)];
  const g = guaranteeFaq(ctx.r);
  if (g) out.push(g);
  return out;
}

export function cleaningBannedPhrases(r: BusinessRecord): RegExp[] {
  const own = [r.guarantee?.text, r.guarantee?.remedy, ...(r.plans ?? []).flatMap((p) => [p.name, p.note, ...p.includes]), ...(r.offers ?? []).flatMap((o) => [o.title, o.detail])].filter(Boolean).join(" \n ");
  const out: RegExp[] = [];
  if (!r.licenses.length) out.push(/\b(?:we are|we're|fully|state)[- ]licensed\b|\blicensed (?:and|&) insured\b/i);
  if (!r.guarantee) out.push(/\b(?:guaranteed?|guarantees|re-?clean)\b/i);
  return out.filter((re) => !re.test(own));
}

function trust(r: BusinessRecord): string[] {
  const c = r.ext.cleaning ?? {};
  const out: string[] = [];
  if (r.insured && r.bonded) out.push("Insured & bonded");
  else if (r.insured) out.push("Insured");
  if (c.backgroundChecked) out.push("Background-checked team");
  if (r.foundedYear) out.push(`Since ${r.foundedYear}`);
  if (c.suppliesIncluded) out.push("We bring supplies");
  if (c.petSafe) out.push("Pet-safe products");
  const g = guaranteeChip(r.guarantee);
  if (g) out.push(g);
  if (r.variant === "commercial" && c.afterHours) out.push("After-hours cleaning");
  if (r.ownershipTags.includes("family_owned")) out.push("Family-owned");
  return out.slice(0, 5);
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
  nav: (ctx) => [
    { label: "Services", href: "/#services" },
    ...(ctx.r.variant === "residential" && checklistHasContent(ctx.r.ext.cleaning?.checklist) ? [{ label: "What's included", href: "/#included" }] : []),
    ...(ctx.r.plans?.length ? [{ label: ctx.r.variant === "exterior" ? "Pricing" : "Plans", href: "/#plans" }] : []),
    { label: "How it works", href: "/#how" },
    { label: "Reviews", href: "/#reviews" },
    { label: "Service area", href: "/#area" },
    { label: "FAQ", href: "/#faq" },
    { label: ctx.r.variant === "commercial" ? "Request a walkthrough" : "Get a quote", href: "/#contact" },
  ],
  actionBar: (ctx) => (ctx.r.variant === "commercial" ? [walkthroughAction(ctx.r), ...actions(ctx.r, ctx.r.smsEnabled ? ["call", "text"] : ["call"])] : actions(ctx.r, ctx.r.smsEnabled ? ["quote", "call", "text"] : ["quote", "call"])),
  homeFaq: (ctx) => cleaningFaq(ctx),
  bannedPhrases: (r) => cleaningBannedPhrases(r),
  home(ctx: Ctx) {
    const r = ctx.r;
    const x = r.ext.cleaning ?? {};
    const t = LABEL[r.variant] ?? "House Cleaning";
    const commercial = r.variant === "commercial";
    const exterior = r.variant === "exterior";
    const residential = !commercial && !exterior;
    const primary: Action[] = commercial ? [walkthroughAction(r), action(r, "call")!] : actions(r, r.smsEnabled ? ["quote", "call", "text"] : ["quote", "call"]);
    const reach: FormField = { name: "reach", label: "Best way to reach you", options: ["Call", "Text"] };
    const fields: FormField[] = exterior
      ? [{ name: "property", label: "Property", options: ["House", "Business", "Church or school", "Other"] }, reach]
      : commercial
        ? [
            { name: "facility", label: "Type of building", options: [...CLEANING_FACILITIES, "Other"] },
            { name: "sq_ft", label: "About how many square feet?", inputmode: "numeric" },
            { name: "frequency", label: "How often?", options: ["Nightly", "Weekly", "Every 2 weeks", "Monthly", "One time", "Not sure"] },
            reach,
          ]
        : [
            { name: "home_size", label: "Home size", options: ["1-2 bedrooms", "3 bedrooms", "4 bedrooms", "5+ bedrooms"] },
            { name: "frequency", label: "How often?", options: ["One time", "Weekly", "Every 2 weeks", "Monthly", "Not sure"] },
            { name: "property", label: "Property", options: ["Residential", "Commercial", "Not sure"], value: "Residential" },
            reach,
          ];
    const formOpts = commercial
      ? { title: "Request a walkthrough", topic: "Walkthrough", button: "Request a walkthrough", details: "Anything we should know (floors, restrooms, supplies, access)" }
      : { photoHint: exterior ? "the area to wash" : "the rooms" };
    const formIntro = commercial ? "Tell us about the building and we'll set up a quick walkthrough, then send a written scope and price." : "Tell us about your space and we'll get back to you with a price.";
    return html`${hero(ctx, {
      eyebrow: r.name,
      h1: `${t} in ${r.address.city}, ${r.address.state}`,
      sub: ctx.copy.heroSub,
      trust: trust(r),
      showStatus: false,
      actions: primary,
      badge: r.foundedYear && ctx.theme.knobs.badge === "seal" ? `Since ${r.foundedYear}` : undefined,
    })}
${promoBar(ctx)}
<main id="main">
<section class="section" id="services" aria-labelledby="services-title"><div class="wrap">
<span class="section__label">Services</span><h2 class="section__title" id="services-title">${commercial ? "What we clean" : exterior ? "What we wash" : "Cleaning options"}</h2>
${ctx.copy.heroTagline ? html`<p class="lead">${ctx.copy.heroTagline}</p>` : ""}
${serviceList(ctx, r.services.map((s) => ({ title: s.name, body: ctx.copy.serviceBlurbs[s.id], icon: "check" as const })), 2)}
${guaranteeBand(ctx)}
${r.confirmed.includes("services") ? "" : todo(ctx, "Check the services list", "We guessed at what you offer. Tell us what to add or remove, and if you'd like starting prices shown.", true)}
${residential && !checklistHasContent(x.checklist) ? todo(ctx, "Send us your cleaning checklist", "What's in a standard clean, what's only in a deep or move-out clean, and what costs extra. It becomes a tick-box table people compare against.") : ""}
</div></section>
${residential ? checklistTable(ctx) : ""}
${commercial ? facilitiesSection(ctx) : ""}
${plans(ctx, exterior ? { label: "Pricing", title: "Simple flat-rate pricing", intro: "Most jobs fit one of these. We confirm the price before we start." } : commercial ? { label: "Plans", title: "Ways to work with us" } : { label: "Plans", title: "Recurring plans", intro: "Pick a rhythm and we keep the house on it." })}
${offersSection(ctx)}
<section class="section section--band" id="how" aria-labelledby="how-title"><div class="wrap">
<span class="section__label">How it works</span><h2 class="section__title" id="how-title">${commercial ? "How we start" : "Three easy steps"}</h2>
${steps(ctx.copy.steps?.length ? ctx.copy.steps : commercial ? STEPS_COMMERCIAL : STEPS)}
</div></section>
${trust(r).length ? "" : todoBlock(ctx, "Tell us your trust details", "Insured? Bonded? Background checks? Bring your own supplies? These help people feel good about letting you in their home.")}
${exterior ? gallery(ctx, "Add before-and-after photos", "Pressure washing sells on the pair: a driveway before and after. Send a few pairs and we'll show them side by side (pair them in Edit → Photo gallery).") : ""}
${reviews(ctx)}
${about(ctx, `About ${r.name}`)}
${serviceArea(ctx)}
${faq(cleaningFaq(ctx), true)}
${contactForm(ctx, r.services.map((s) => s.name), r.serviceArea?.towns ?? [], fields, formIntro, formOpts)}
${ctaBand(ctx, commercial ? [walkthroughAction(r), action(r, "call")!] : actions(r, ["quote", "call"]))}
</main>`;
  },
  pages: () => [],
  copyBrief: (r) => ({
    voice:
      "Warm, plain-spoken and confident, Southern-friendly without dialect. Short sentences, second person ('your home'). Never mention insurance, bonding, background checks, guarantees, supplies, products, prices or years unless given in the facts.",
    fields: {
      heroTagline: "One sentence (12-22 words) introducing the cleaning options for homes (or businesses) in and around the town.",
      heroSub: "One supporting line (15-25 words) under the headline: who it's for, built only from the facts. No superlatives.",
      heroQuestion: `A headline question the reader would nod at, at most 60 characters (e.g. ${r.variant === "exterior" ? "\"Is your driveway more green than gray?\"" : r.variant === "commercial" ? "\"Is your cleaning crew letting you down?\"" : "\"When did you last have a free Saturday?\""}). No claims, no town.`,
      heroBenefit: `A headline benefit line, at most 60 characters, plain and warm (e.g. ${r.variant === "exterior" ? "\"Like new, without the new\"" : r.variant === "commercial" ? "\"Walk in to a clean building\"" : "\"Come home to clean\""}). No superlatives, no numbers.`,
      serviceBlurbs: "For each service id, one line (12-25 words) on what it's best for. General and true; no prices, no promises.",
      faq: r.variant === "exterior"
        ? "5-6 general questions people ask before hiring a pressure washing company (soft washing vs pressure washing, is it safe for siding and roofs, how often to wash, plants and pets, do I need to be home) with helpful general answers (35-60 words). Never state this company's policies, prices, chemicals or guarantees. Invite them to ask for a quote where it depends."
        :
        "5-6 general questions people ask before hiring a cleaner (difference between standard and deep cleaning, how often to schedule, what to do before the cleaners arrive, etc.) with helpful general answers (35-60 words). Never state this company's policies, prices, guarantees or supplies. Invite them to ask for a quote where it depends.",
      serviceAreaIntro: "One or two sentences about cleaning in the town and nearby communities listed.",
      about:
        "Two short paragraphs (70-120 words total). The owner's story is unknown: write a neutral, true introduction (what they clean, who they serve, where). Do not invent history, team size, years or credentials.",
      cta: "ctaTitle: 3-7 words. ctaLine: one sentence, at most 18 words, inviting them to ask for a quote.",
      metaDescription: "140-155 characters: cleaning type + town + one true fact + an action.",
    },
  }),
};
