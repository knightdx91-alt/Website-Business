import { action, actions } from "../actions.ts";
import { about, contactForm, ctaBand, factList, faq, gallery, hero, infoStrip, reviews, sectionHead, steps, todo, visit, type Ctx, type FormField, serviceList } from "../components.ts";
import { hasAnyHours } from "../hours.ts";
import { html, raw, type Raw } from "../html.ts";
import type { BusinessRecord, PrintExt, Service } from "../types.ts";
import { fitTitle, type CategoryPack } from "./types.ts";

/** research/print-signs-apparel.md §13: the name decides first, because Google has no print or sign shop type. */
export function printVariant(primaryType: string | undefined, types: string[], name: string): string {
  const n = name.toLowerCase();
  const all = [primaryType ?? "", ...types];
  if (/embroider|monogram|stitch|thread|needle|\bsew/.test(n)) return "embroidery";
  if (/screen ?print|silk ?screen|t-?shirts?|\btees?\b|\bshirts?\b|apparel|merch|spirit ?wear|\bink\b/.test(n)) return "screen_printing";
  if (/\bsigns?\b|signage|banners?|\bwraps?\b|vinyl|decals?|lettering/.test(n)) return "signs";
  if (/print(ing|ers?)?\b|\bpress\b|\bcop(y|ies)\b|litho|business cards|graphics/.test(n)) return "print_shop";
  if (all.includes("clothing_store")) return "screen_printing";
  if (all.includes("gift_shop")) return "embroidery";
  return "print_shop";
}

const LABEL: Record<string, string> = {
  screen_printing: "Screen Printing & Custom Shirts",
  embroidery: "Custom Embroidery",
  signs: "Signs & Banners",
  print_shop: "Printing",
};

const SHORT: Record<string, string> = { screen_printing: "screen printing", embroidery: "embroidery", signs: "signs", print_shop: "printing" };

const SEEDS: Record<string, string[]> = {
  screen_printing: ["Custom T-shirts", "Hoodies & sweatshirts", "Team & school spirit wear", "Business & work shirts", "Event & fundraiser shirts", "Small full-color runs"],
  embroidery: ["Embroidered polos & work shirts", "Hats & caps", "Jackets & outerwear", "Team & school apparel", "Monograms & personalized gifts", "Logo digitizing"],
  signs: ["Vinyl banners", "Yard & real-estate signs", "Vehicle & trailer lettering", "Window lettering & decals", "Storefront & building signs", "Magnetic vehicle signs"],
  print_shop: ["Business cards", "Flyers & brochures", "Letterhead & envelopes", "Posters", "Postcards & mailers", "Carbonless forms & invoices"],
};

export function seedPrintServices(variant: string): Service[] {
  return (SEEDS[variant] ?? SEEDS.print_shop!).map((name) => ({ id: name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/-$/, ""), name, featured: true }));
}

const WHO: Record<string, string[]> = {
  screen_printing: ["Teams", "Schools", "Churches", "Businesses", "Family reunions", "Fundraisers"],
  embroidery: ["Businesses", "Work crews", "Teams", "Schools", "Churches", "Gifts"],
  signs: ["Businesses", "Contractors", "Real estate", "Churches", "Events", "Farms"],
  print_shop: ["Businesses", "Churches", "Schools", "Events", "Nonprofits", "Real estate"],
};

function steps3(r: BusinessRecord) {
  const proof = r.ext.print?.proofBeforePrint;
  const last = r.variant === "signs" ? (r.ext.print?.install ? "We make it and install it, or you pick it up." : "We make it and let you know when it's ready.") : "We print it and let you know when it's ready to pick up.";
  return [
    { title: "Tell us what you need", body: r.variant === "signs" ? "Size, where it goes, and a photo of the spot if you have one." : "What you want, how many, and when you need it." },
    { title: proof ? "Approve your proof" : "Get your price", body: proof ? "We send a proof and a price before anything is made." : "We look it over and give you a price." },
    { title: "We make it", body: last },
  ];
}

function trust(r: BusinessRecord): string[] {
  const out: string[] = [];
  if (r.foundedYear) out.push(`Since ${r.foundedYear}`);
  if (r.ownershipTags.includes("family_owned")) out.push("Family-owned");
  if (r.ext.print?.designHelp) out.push("Design help available");
  if (r.ext.print?.proofBeforePrint) out.push("Proof before we print");
  return out;
}

function ext(r: BusinessRecord): PrintExt {
  return r.ext.print ?? {};
}

/** "Send us your artwork": static sites can't take uploads, so it's the owner's file-request link, email or a text. */
function artwork(ctx: Ctx) {
  const r = ctx.r;
  const text = action(r, "text");
  const up = ext(r).uploadUrl;
  const subject = encodeURIComponent(`Artwork for a quote: ${r.name}`);
  const what = r.variant === "signs" ? "a photo of the wall, window, truck or trailer" : "your logo or a photo of your design";
  return html`<section class="section" id="artwork" aria-labelledby="art-title"><div class="wrap narrow">
${sectionHead("Artwork", "Send us your design", `Have a file? ${up ? "Upload it, or email it to us." : r.email ? "Email it to us." : "Send it our way."} Have a sketch, an old shirt or a photo? ${r.smsEnabled ? "Text us" : "Show us"} ${what}. No design yet? Call and tell us what you have in mind.`, "art-title")}
<div class="btns">${up ? html`<a class="btn btn--primary" href="${up}" target="_blank" rel="noopener"><span>Upload your artwork</span><span class="sr"> (opens in new tab)</span></a>` : ""}${r.email ? html`<a class="btn btn--${up ? "ghost" : "secondary"}" href="mailto:${r.email}?subject=${subject}"><span>Email your artwork</span></a>` : ""}${text ? html`<a class="btn btn--ghost" href="${text.href}"><span>Text us a photo</span></a>` : ""}<a class="btn btn--ghost" href="${action(r, "call")!.href}"><span>Call ${r.phone.display}</span></a></div>
${r.email ? "" : todo(ctx, "Add an email for artwork", "Customers will want to email you their logo or design files. Tell us which email to use.")}
${up ? "" : todo(ctx, "Add an upload link", "Make a free Dropbox or Google Drive \"file request\" link and send it to us: customers get an Upload your artwork button and the files land in your folder.")}
${r.smsEnabled ? "" : todo(ctx, "Can customers text this number?", "If your shop number takes texts, we'll add a Text us a photo button. Most folks find it easier than email.")}
</div></section>`;
}

/** "Good to know": turnaround and price breaks in the owner's words (the copy never states them). */
function details(ctx: Ctx): Raw {
  const x = ext(ctx.r);
  const tiers = (x.quantityTiers ?? []).filter((t) => t.from > 0).sort((a, b) => a.from - b.from);
  const breaks = tiers.length ? `Price breaks at ${tiers.map((t, i) => `${t.from}${i === tiers.length - 1 ? "+" : ""}${t.note ? ` (${t.note})` : ""}`).join(", ")}. Ask for a quote with your quantity.` : undefined;
  const list = factList([
    { label: "Typical turnaround", text: x.turnaround },
    { label: "Price breaks", text: breaks },
    { label: "Proofs", text: x.proofBeforePrint ? "You approve a proof before anything is made." : undefined },
    { label: "Design help", text: x.designHelp ? "Don't have artwork? We can help you design it." : undefined },
  ]);
  if (!list.value) return raw("");
  return html`<section class="section section--band" id="details" aria-labelledby="details-title"><div class="wrap narrow">
${sectionHead("Good to know", "Before you order", undefined, "details-title")}
${list}
</div></section>`;
}

/** The quote form's extra fields: what, how many, when, where it goes, artwork status, rush. */
function quoteFields(r: BusinessRecord): FormField[] {
  const signs = r.variant === "signs";
  const emb = r.variant === "embroidery";
  return [
    { name: "quantity", label: signs ? "Size (about how big?)" : "How many?", autocomplete: "off", inputmode: signs ? undefined : "numeric" },
    { name: "needed_by", label: "Needed by", type: "date", autocomplete: "off" },
    { name: "placements", label: signs ? "Where will it go? (window, truck, yard, building)" : emb ? "Placement (left chest, back, hat front)" : "Print locations (front, back, sleeve)", autocomplete: "off" },
    { name: "artwork_status", label: "Artwork", options: ["I have a print-ready file", "I have a sketch or photo", "I need design help", "Not sure yet"] },
    { name: "rush", label: "Is this a rush?", options: ["No, normal timing is fine", "Yes, I need it fast"] },
  ];
}

/** Turnaround, rush and minimum claims the copy may not make unless the owner gave them. */
export function printBannedPhrases(r: BusinessRecord): RegExp[] {
  const x = ext(r);
  const out: RegExp[] = [];
  if (!x.turnaround) out.push(/\b\d+\s*(?:business |working )?days?\b/i, /\b(?:fast|quick|rush) turnaround\b/i, /\bsame[- ]day\b/i);
  if (!x.quantityTiers?.length) out.push(/\b(?:no|low) minimums?\b/i, /\bminimum (?:order|of)\b/i);
  if (!x.storeUrl) out.push(/\b(?:online|team|spirit[- ]wear) store\b/i);
  return out;
}

export const printPack: CategoryPack = {
  id: "print",
  label: "Print, sign & shirt shops",
  titleMode: "service",
  locationModel: "storefront",
  hasForm: () => true,
  looks: ["print.press_check", "print.fresh_ink", "print.main_street_enamel", "print.thread_needle"],
  defaultLook: (r) =>
    ({ print_shop: "print.press_check", screen_printing: "print.fresh_ink", signs: "print.main_street_enamel", embroidery: "print.thread_needle" } as Record<string, string>)[r.variant] ?? "print.press_check",
  variantLabel: (r) => LABEL[r.variant] ?? "Printing",
  schemaType: () => "LocalBusiness",
  schemaExtras: () => ({}),
  homeTitle(r) {
    const t = LABEL[r.variant] ?? "Printing";
    return fitTitle([`${t} in ${r.address.city}, ${r.address.state} | ${r.name}`, `${t} in ${r.address.city} | ${r.name}`, `${r.name} | ${r.address.city}, ${r.address.state}`, r.name]);
  },
  nav: () => [
    { label: "Services", href: "/#services" },
    { label: "How it works", href: "/#how" },
    { label: "Artwork", href: "/#artwork" },
    { label: "Reviews", href: "/#reviews" },
    { label: "Visit", href: "/#visit" },
    { label: "Quote", href: "/#contact" },
  ],
  actionBar: (ctx) => actions(ctx.r, ctx.r.smsEnabled ? ["quote", "call", "text"] : ["quote", "call", "directions"]),
  homeFaq: (ctx) => ctx.copy.faq.slice(0, 6),
  home(ctx: Ctx) {
    const r = ctx.r;
    const label = LABEL[r.variant] ?? "Printing";
    const services = html`<section class="section" id="services" aria-labelledby="services-title"><div class="wrap">
<span class="section__label">What we make</span><h2 class="section__title" id="services-title">${r.variant === "signs" ? "Signs for every job" : r.variant === "print_shop" ? "What we print" : "What we make"}</h2>
${ctx.copy.heroTagline ? html`<p class="lead">${ctx.copy.heroTagline}</p>` : ""}
${serviceList(ctx, r.services.map((s) => ({ title: s.name, body: ctx.copy.serviceBlurbs[s.id], icon: "check" as const })))}
${r.confirmed.includes("services") ? "" : todo(ctx, "Check what you make", "We guessed at your services from your Google listing. Tell us what to add or remove (shirts, signs, cards, embroidery…).", true)}
</div></section>`;
    const photos = gallery(ctx, "Send photos of your work", "Three to nine photos of shirts, signs or prints you've made. Real work is what sells a shop like yours. (We can't use Google's photos on the live site.)");
    const who = html`<section class="section section--band" id="who" aria-labelledby="who-title"><div class="wrap">
${sectionHead("Who we work with", "Made for local folks", undefined, "who-title")}
<ul class="towns">${(WHO[r.variant] ?? WHO.print_shop!).map((w) => html`<li class="chip">${w}</li>`)}</ul>
</div></section>`;
    const how = html`<section class="section" id="how" aria-labelledby="how-title"><div class="wrap">
<span class="section__label">How it works</span><h2 class="section__title" id="how-title">Ordering is easy</h2>
${steps(ctx.copy.steps?.length ? ctx.copy.steps : steps3(r))}
</div></section>`;
    return html`${hero(ctx, {
      eyebrow: r.name,
      h1: `${label} in ${r.address.city}, ${r.address.state}`,
      sub: ctx.copy.heroSub,
      trust: trust(r),
      showStatus: hasAnyHours(r.hours),
      actions: actions(r, ["quote", "call"]),
      badge: r.foundedYear && ctx.theme.knobs.badge === "seal" ? `Since ${r.foundedYear}` : undefined,
    })}
${infoStrip(ctx, [])}
<main id="main">
${r.variant === "signs" ? html`${photos}${services}` : html`${services}${photos}`}
${r.variant === "screen_printing" ? html`${who}${how}` : html`${how}${who}`}
${artwork(ctx)}
${details(ctx)}
${reviews(ctx)}
${about(ctx, `About ${r.name}`)}
${visit(ctx, r.variant === "print_shop" ? "Stop by the shop" : "Visit the shop")}
${faq(ctx.copy.faq.slice(0, 6), true)}
${contactForm(
  ctx,
  r.services.map((s) => s.name),
  [],
  quoteFields(r),
  "Tell us what you need, how many and when you need it. We'll get back to you with a price.",
  { topic: "Quote", details: "Colors, sizes, anything else" },
)}
${ctaBand(ctx, [...actions(r, ["quote", "call"]), ...actions(r, ["store"])])}
</main>`;
  },
  pages: () => [],
  bannedPhrases: printBannedPhrases,
  copyBrief: (r) => ({
    voice:
      "Practical, friendly, shop-floor confident. Short sentences, second person ('your shirts', 'your sign'). Never state or hint at turnaround or rush times, minimums, prices, setup or digitizing fees, years in business, equipment, in-house claims, ink types, named clients, licensed products, install areas or shipping. Where those matter, say to ask or to tell us your date.",
    fields: {
      heroTagline: `One sentence (12-22 words) introducing what the shop makes (${SHORT[r.variant] ?? "printing"}) and who it's for, in and around the town.`,
      heroSub: "One line (15-25 words) under the headline: the main things they make and for whom. No superlatives, no turnaround or price claims.",
      serviceBlurbs: "For each service id, one line (10-20 words) on what it's good for (e.g. 'for teams, reunions and staff shirts'). No prices, quantities, or turnaround times.",
      faq: "5-6 general questions people ask before ordering custom printing, embroidery or signs (what file types work, what if I don't have a logo, can I see it before it's made, how do I pick a size or color) with helpful general answers (30-60 words). Never state this shop's prices, minimums, turnaround, fees or policies; say to ask or call where it depends.",
      about:
        "Two short paragraphs (70-120 words total). The owner's story is unknown: write a neutral, true introduction (what the shop makes, who it serves, where). Do not invent history, people, years, equipment or clients.",
      cta: "ctaTitle: 3-7 words. ctaLine: one sentence, at most 18 words, inviting them to ask for a quote or call.",
      metaDescription: "140-155 characters: what they make + town + an action (get a quote, call).",
    },
  }),
};
