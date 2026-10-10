import { action, actions, type ActionId } from "../actions.ts";
import { about, ctaBand, factList, faq, gallery, hero, infoStrip, reviews, sectionHead, todayIso, todo, visit, type Ctx, serviceList } from "../components.ts";
import { hasAnyHours } from "../hours.ts";
import { html, raw, type Raw } from "../html.ts";
import type { BusinessRecord, Faq, SalonExt, Service } from "../types.ts";
import { fitTitle, type CategoryPack } from "./types.ts";

export function salonVariant(primaryType: string | undefined, types: string[], name: string): string {
  const all = [primaryType ?? "", ...types];
  const n = name.toLowerCase();
  if (all.includes("pet_care") || all.includes("pet_store") || /\b(groom\w*|pets?|paws?|dogs?|doggy|k-?9|canine|puppy|furry)\b/.test(n)) return "pet";
  if (all.includes("nail_salon") || /\bnails?\b/.test(n)) return "nails";
  if (/\b(massage|bodywork|reflexology)\b/.test(n)) return "massage";
  if ((all.includes("massage") || all.includes("spa") || all.includes("day_spa") || /\bspa\b/.test(n)) && !/\b(salon|hair|beauty|barber)/.test(n)) return "massage";
  const barber = all.includes("barber_shop") || /\bbarber/.test(n);
  const salon = all.includes("hair_salon") || all.includes("beauty_salon") || /\b(salon|hair|beauty|studio)\b/.test(n);
  if (barber && salon && /\b(salon|beauty)\b/.test(n)) return "both";
  return barber ? "barber" : "salon";
}

const LABEL: Record<string, string> = { barber: "Barbershop", salon: "Hair salon", both: "Barber & beauty", nails: "Nail salon", pet: "Pet grooming", massage: "Massage therapy" };

const SEEDS: Record<string, string[]> = {
  barber: ["Haircut", "Skin fade", "Beard trim", "Hot towel shave", "Kids cut", "Line-up"],
  salon: ["Women's cut & style", "Color", "Highlights & balayage", "Blowout", "Men's cut", "Hair treatments"],
  both: ["Haircut", "Fade", "Beard trim", "Women's cut & style", "Color", "Highlights"],
  nails: ["Manicure", "Pedicure", "Gel polish", "Acrylic full set", "Fill-in", "Nail art"],
  pet: ["Full groom", "Bath & brush", "Nail trim", "De-shedding", "Puppy's first groom", "Teeth brushing"],
  massage: ["Relaxation massage", "Deep tissue massage", "Hot stone massage", "Couples massage", "Chair massage", "Gift certificates"],
};

/** What "your work" looks like for each kind of shop, for owner to-dos. */
const WORK_PHOTOS: Record<string, string> = {
  barber: "cuts and fades you're proud of",
  salon: "cuts and color you're proud of",
  both: "cuts and color you're proud of",
  nails: "nail sets you're proud of",
  pet: "freshly groomed pets (with their owners' OK)",
  massage: "your treatment rooms and front desk",
};

export function seedSalonServices(variant: string): Service[] {
  return (SEEDS[variant] ?? SEEDS.salon!).map((name) => ({ id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, ""), name, featured: true }));
}

function priceText(s: Service): string | undefined {
  const p = s.price;
  if (!p || p.mode === "none") return undefined;
  if (p.mode === "exact" && p.amount !== undefined) return `$${p.amount}`;
  if (p.mode === "from" && p.amount !== undefined) return `From $${p.amount}`;
  if (p.mode === "range" && p.min !== undefined && p.max !== undefined) return `$${p.min}–$${p.max}`;
  if (p.mode === "quote") return "Price at consultation";
  return undefined;
}

const WALK_IN_TEXT = { welcome: "Walk-ins welcome", appointment_only: "By appointment", both: "Walk-ins & appointments" } as const;

function ext(r: BusinessRecord): SalonExt {
  return r.ext.salon ?? {};
}

/** "$35 · 45 min": price and duration side by side when both are known. */
function priceAndTime(s: Service): string | undefined {
  const p = priceText(s);
  const t = s.durationMin ? `${s.durationMin} min` : undefined;
  return [p, t].filter(Boolean).join(" · ") || undefined;
}

/** The intro offer, while it lasts (YYYY-MM-DD end date; the page hides it itself after). */
export function activeIntroOffer(r: BusinessRecord, today = todayIso(r.timezone)): { text: string; until?: string } | undefined {
  const o = ext(r).introOffer;
  if (!o?.text) return undefined;
  if (o.until && o.until < today) return undefined;
  return o;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function shortDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${MONTHS[(m ?? 1) - 1]} ${d}`;
}

/** "Meet the team": one card per person, with their own Book button when they have a link. Required to confirm before publish. */
function team(ctx: Ctx): Raw {
  const r = ctx.r;
  const members = (ext(r).team ?? []).filter((m) => m.name);
  if (!members.length) return raw("");
  const shopBook = r.links.booking;
  return html`<section class="section" id="team" aria-labelledby="team-title"><div class="wrap">
${sectionHead("Our team", "Meet the team", undefined, "team-title")}
<ul class="team">${members.map((m) => {
    const first = m.name.split(/\s+/)[0]!;
    const url = m.bookingUrl || shopBook;
    return html`<li><h3>${m.name}</h3>${m.role || m.days ? html`<p class="team__role">${[m.role, m.days].filter(Boolean).join(" · ")}</p>` : ""}${m.line ? html`<p>${m.line}</p>` : ""}${
      url ? html`<a class="btn btn--secondary" href="${url}" target="_blank" rel="noopener"><span>Book with ${first}</span><span class="sr"> (opens in new tab)</span></a>` : ""
    }</li>`;
  })}</ul>
${ext(r).teamConfirmed ? "" : todo(ctx, "Confirm the team list", "Check every name, title, days and booking link with the owner. People book people, so this has to be right before the site goes live.", true)}
</div></section>`;
}

/** Massage: the minutes × price table. */
function rates(ctx: Ctx): Raw {
  const rows = (ext(ctx.r).rates ?? []).filter((x) => x.minutes && x.price);
  if (ctx.r.variant !== "massage" || !rows.length) return raw("");
  return html`<section class="section section--band" id="rates" aria-labelledby="rates-title"><div class="wrap narrow">
${sectionHead("Rates", "Session rates", "Pick the length that fits. Call or book online to set a time.", "rates-title")}
<table class="rates"><caption class="sr">Massage rates by session length</caption><thead><tr><th scope="col">Length</th><th scope="col">Price</th></tr></thead><tbody>${rows.map((x) => html`<tr><td>${x.minutes} minutes</td><td>${x.price}</td></tr>`)}</tbody></table>
</div></section>`;
}

/** "Good to know": deposit, cancellations, running late, kids, in the shop's own words. */
function policies(ctx: Ctx): Raw {
  const p = ext(ctx.r).policies;
  const list = factList([
    { label: "Deposits", text: p?.deposit },
    { label: "Cancellations", text: p?.cancellation },
    { label: "Running late", text: p?.lateness },
    { label: "Kids", text: p?.kids },
  ]);
  if (!list.value) return raw("");
  return html`<section class="section" id="policies" aria-labelledby="policies-title"><div class="wrap narrow">
${sectionHead("Good to know", "Before you book", undefined, "policies-title")}
${list}
</div></section>`;
}

/** Pet groomers: vaccination rule, starting prices, matting note and what to bring, in the groomer's words. */
function petPrep(ctx: Ctx): Raw {
  const r = ctx.r;
  if (r.variant !== "pet") return raw("");
  const p = ext(r).pet;
  const list = factList([
    { label: "Vaccinations", text: p?.vaccinations },
    { label: "Pricing", text: p?.pricingFrom },
    { label: "Matting & de-shedding", text: p?.mattingNote },
    { label: "What to bring", text: p?.prep },
  ]);
  const ask = p?.vaccinations ? raw("") : todo(ctx, "What vaccinations do you require?", "Most groomers ask for proof of rabies (and often DHPP). Tell us your rule in your words and it goes in Before your appointment.");
  if (!list.value) return ask.value ? html`<div class="wrap">${ask}</div>` : raw("");
  return html`<section class="section section--band" id="prep" aria-labelledby="prep-title"><div class="wrap narrow">
${sectionHead("Before your appointment", "What to know before you come", undefined, "prep-title")}
${list}
${ask}
</div></section>`;
}

function primary(r: BusinessRecord): ActionId {
  return r.links.booking ? "book" : "call";
}

function dataFaq(r: BusinessRecord): Faq[] {
  const out: Faq[] = [];
  const w = r.ext.salon?.walkIns;
  if (w === "welcome") out.push({ q: "Do you take walk-ins?", a: "Yes, walk-ins are welcome. Call ahead if you'd like to check the wait." });
  if (w === "appointment_only") out.push({ q: "Do you take walk-ins?", a: r.links.booking ? "We work by appointment. Book online or give us a call." : `We work by appointment. Call ${r.phone.display} to set one up.` });
  if (w === "both") out.push({ q: "Do you take walk-ins?", a: "Yes. Walk-ins are welcome, and appointments get you in at a set time." });
  if (r.links.booking) out.push({ q: "How do I book?", a: "Tap Book online to pick a time that works for you, or call us." });
  if (hasAnyHours(r.hours)) out.push({ q: "When are you open?", a: "Our hours are listed below, with today highlighted." });
  if (r.smsEnabled) out.push({ q: "Can I text you?", a: `Yes. Text us at ${r.phone.display}.` });
  return out;
}

/** Health claims (massage), and offers, deposits or team mentions the owner didn't give. */
export function salonBannedPhrases(r: BusinessRecord): RegExp[] {
  const out: RegExp[] = [];
  if (r.variant === "massage") out.push(/\b(?:cures?|heals?|treats?|therapeutic for|relieves? (?:pain|anxiety|depression)|medical)\b/i);
  if (!activeIntroOffer(r)) out.push(/\b(?:new[- ]client|first[- ]time|intro(?:ductory)?) (?:special|offer|discount|deal)\b/i, /\$\d+ off\b/i);
  if (!ext(r).policies?.deposit) out.push(/\bdeposit\b/i);
  if (!ext(r).team?.length) out.push(/\b(?:our|the) (?:stylists|barbers|groomers|therapists|team of)\b/i);
  return out;
}

export const salonPack: CategoryPack = {
  id: "salon",
  label: "Hair salons and barbershops",
  titleMode: "name",
  locationModel: "storefront",
  hasForm: () => false,
  looks: ["salon.porch_light", "salon.night_shift", "salon.main_street", "salon.color_bar"],
  defaultLook: (r) =>
    ({ barber: "salon.night_shift", both: "salon.main_street", nails: "salon.color_bar", pet: "salon.main_street", massage: "salon.porch_light" } as Record<string, string>)[r.variant] ?? "salon.porch_light",
  variantLabel: (r) => LABEL[r.variant] ?? "Hair salon",
  schemaType: (r) => (r.variant === "nails" ? "NailSalon" : r.variant === "pet" ? "LocalBusiness" : r.variant === "massage" ? "DaySpa" : "HairSalon"),
  schemaExtras: () => ({}),
  homeTitle(r) {
    const l = LABEL[r.variant] ?? "Hair salon";
    return fitTitle([`${r.name} | ${l} in ${r.address.city}, ${r.address.state}`, `${r.name} | ${l} in ${r.address.city}`, `${r.name} | ${r.address.city}, ${r.address.state}`, r.name]);
  },
  nav: (ctx) => [
    { label: "Services", href: "/#services" },
    ...(ctx.r.variant === "massage" && ext(ctx.r).rates?.length ? [{ label: "Rates", href: "/#rates" }] : []),
    ...(ext(ctx.r).team?.length ? [{ label: "Team", href: "/#team" }] : []),
    { label: "Reviews", href: "/#reviews" },
    { label: "About", href: "/#about" },
    { label: "Hours & location", href: "/#visit" },
  ],
  actionBar: (ctx) => actions(ctx.r, [...(ctx.r.links.booking ? (["book"] as const) : []), "call", ...(ctx.r.smsEnabled ? (["text"] as const) : []), "directions"]),
  homeFaq: (ctx) => dataFaq(ctx.r),
  home(ctx: Ctx) {
    const r = ctx.r;
    const walk = r.ext.salon?.walkIns;
    const trust: string[] = [];
    if (walk) trust.push(WALK_IN_TEXT[walk]);
    const offer = activeIntroOffer(r);
    if (offer) trust.push(offer.until ? `${offer.text} (through ${shortDate(offer.until)})` : offer.text);
    const pay = (r.visit?.paymentMethods ?? []).filter(Boolean);
    if (pay.length) trust.push(`${pay.slice(0, 4).join(", ")} accepted`);
    if (r.foundedYear) trust.push(`Since ${r.foundedYear}`);
    if (r.ownershipTags.includes("family_owned")) trust.push("Family-owned");
    const prices = r.services.map(priceAndTime);
    const confirmed = r.confirmed.includes("services");
    const ctaActs = [...actions(r, [primary(r), primary(r) === "book" ? "call" : "directions"]), ...actions(r, ["giftcard"])];
    return html`${hero(ctx, {
      eyebrow: `${LABEL[r.variant] ?? "Hair salon"} · ${r.address.city}, ${r.address.state}`,
      h1: r.name,
      sub: ctx.copy.heroTagline,
      trust,
      showStatus: hasAnyHours(r.hours),
      actions: actions(r, [primary(r), primary(r) === "book" ? "call" : "directions"]),
      badge: r.foundedYear && ctx.theme.knobs.badge === "seal" ? `Since ${r.foundedYear}` : undefined,
    })}
${infoStrip(ctx, walk ? [WALK_IN_TEXT[walk]] : [])}
<main id="main">
<section class="section section--surface" id="services" aria-labelledby="services-title"><div class="wrap">
${sectionHead("Services", r.variant === "barber" ? "Cuts & prices" : "Services", undefined, "services-title")}
${ctx.copy.heroSub ? html`<p class="lead">${ctx.copy.heroSub}</p>` : ""}
${serviceList(ctx, r.services.map((s, i) => ({ title: s.name, body: ctx.copy.serviceBlurbs[s.id], price: prices[i] })))}
${confirmed ? "" : todo(ctx, "Send us your services and prices", "List what you offer and what you charge (or \"from $\" prices). We'll set it up so people can see it on their phones.", true)}
${walk ? "" : todo(ctx, "Walk-ins or appointments?", "Tell us whether you take walk-ins, appointments, or both. It's the first thing new customers want to know.", true)}
${r.variant === "massage" && !r.licenses.length ? todo(ctx, "Send us your Alabama license number", "Alabama asks massage businesses to show their license number in ads, so we'll put it at the bottom of every page.", true) : ""}
${r.links.booking ? "" : todo(ctx, "Add your booking link", "If you use Square, Booksy, Vagaro or similar, send us the link and the Book button will open it.")}
</div></section>
${rates(ctx)}
${team(ctx)}
${policies(ctx)}
${petPrep(ctx)}
${reviews(ctx, true)}
${about(ctx, `About ${r.name}`, "Our story")}
${gallery(ctx, "Add photos of your work", `A few photos of ${WORK_PHOTOS[r.variant] ?? WORK_PHOTOS.salon} make the biggest difference for a site like this.`)}
${visit(ctx)}
${faq(dataFaq(r), true)}
${ctaBand(ctx, ctaActs)}
</main>`;
  },
  pages: () => [],
  bannedPhrases: salonBannedPhrases,
  copyBrief: (r) => ({
    voice:
      r.variant === "barber"
        ? "Warm, plain and a bit casual, like a barber talking to a regular. Short sentences. Never invent prices, durations, licenses, awards or years."
        : r.variant === "massage"
          ? "Calm, warm and plain. Short sentences. Never make medical or health claims (no 'cures', 'treats', 'heals', 'relieves pain', no conditions), and never invent prices, durations, techniques offered, licenses or years."
        : r.variant === "pet"
          ? "Warm and friendly, talking to pet owners who want their dog or cat treated gently. Short sentences. Never invent prices, breeds served, certifications, awards or years."
          : "Warm, plain and a little polished. Short sentences. Never invent prices, durations, licenses, awards, products or years.",
    fields: {
      heroTagline: `6-12 words under the name saying what the shop does and for whom, naming the town. e.g. "${
        r.variant === "massage"
          ? `Relaxing massage in a quiet space in ${r.address.city}`
          : r.variant === "pet"
          ? `Gentle grooming for dogs and cats in ${r.address.city}`
          : r.variant === "nails"
            ? `Manicures, pedicures and nail art in ${r.address.city}`
            : `Classic cuts, fades and beard work in downtown ${r.address.city}`
      }" in your own words.`,
      heroSub: "One short sentence (10-20 words) introducing the services list.",
      serviceBlurbs: "For each service id, one line (8-18 words) describing what's typically included. No prices, no durations, no brand names.",
      about:
        "Two short paragraphs (70-120 words total). The owner's story is unknown: write a warm, true introduction to the shop and who it's for, without inventing history, staff, years or credentials.",
      cta: "ctaTitle: 3-6 words inviting them in. ctaLine: one sentence, at most 16 words.",
      metaDescription: "140-155 characters: shop type + town + one true fact + an action (book, call, stop by).",
    },
  }),
};
