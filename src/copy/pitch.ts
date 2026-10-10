import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { hasAnyHours, hoursSummary } from "../generator/hours.ts";
import { donationsOn } from "../generator/actions.ts";
import { autoAmenityLabels } from "../generator/packs/auto.ts";
import { advisorReviewsOk, carrierItems } from "../generator/packs/finance.ts";
import type { CategoryPack } from "../generator/packs/types.ts";
import type { BusinessRecord } from "../generator/types.ts";
import { DEFAULT_COPY_MODEL } from "./write.ts";

/** Why a site helps each kind of business, drawn from the category research in research/*.md. */
const ANGLES: Record<string, string[]> = {
  church: [
    "Newcomers and young families look a church up on their phone before they visit: service times, where to park, what to expect, what's there for kids.",
    "Google's hours for churches are usually office hours (or wrong), so people show up at the wrong time. The site puts the real service times first.",
    "Facebook is great for members, but visitors who aren't on Facebook can't easily find times and directions there. The site links to their Facebook, livestream and giving page.",
    "We never write beliefs or doctrine: the church's own words go on the site exactly as they give them.",
  ],
  finance: [
    "People pick a tax office, accountant or insurance agent they can trust. A real website with the office, the people and the hours does that before they ever call.",
    "Most small offices' Facebook pages don't show hours, what to bring or how to get documents to them. The site answers those questions so the phone rings with ready clients.",
    "Tax offices get most of their year's clients from January to April: the site works for them before the rush, including a what-to-bring checklist.",
    "The site never makes refund, rate or savings claims and keeps their credentials exactly as they confirm them, so it stays on the right side of IRS and state advertising rules.",
  ],
  restaurant: [
    "People decide where to eat on their phone: they want hours, the menu and a phone number fast. Most local restaurant sites studied fumble this (only 20 of 63 had tap-to-call).",
    "A real text menu on its own page shows up when people search '<name> menu' and is easy to read on a phone. Photo and PDF menus don't.",
    "Facebook is great for daily specials, but people who don't use Facebook can't easily find hours or the menu there.",
    "Their site shows open/closed status right now, in Cullman time, plus directions in one tap.",
  ],
  contractor: [
    "Homeowners with a leak or a dead AC search on their phone and call the first business that looks legitimate.",
    "A site with the trade and town in the headline, tap-to-call everywhere and a simple request form turns searches into calls.",
    "License number and insured status (when the owner confirms them) are trust signals few local competitors show.",
    "The request form sends jobs to them even when they're on a job and can't answer.",
  ],
  salon: [
    "New clients look for three things: book, prices, where. A clean one-page site answers all three on a phone.",
    "A Book button that opens their existing booking tool (Square, Booksy, Vagaro) means more booked chairs without changing how they work.",
    "Showing walk-in policy and prices up front saves them repeat phone questions.",
  ],
  auto: [
    "Drivers with a warning light search 'auto repair near me' and want hours, phone and directions immediately.",
    "A stated warranty, ASE certification and years in business (when true) are what make drivers trust a shop they've never used.",
    "An appointment request form brings in jobs while they're under a car.",
  ],
  landscaping: [
    "Homeowners compare a few lawn services online before calling; a crew with a real site looks established.",
    "A quote form with services, how often and town gives them better-qualified leads than phone tag.",
    "The service-area town list tells people right away whether they cover their street.",
  ],
  cleaning: [
    "People letting someone into their home want to see that the business is real: insured, local, and clear about what they do.",
    "A quote form that asks home size and how often turns visitors into ready-to-price leads.",
    "Clear service options (standard, deep, move-out) answer the first questions before the call.",
  ],
};

/** Exactly what the generated preview contains, so the guide never over-describes it. */
function previewFeatures(r: BusinessRecord, hasForm: boolean): string[] {
  const f = [
    "a mobile-friendly site with tap-to-call buttons on every screen and a call bar at the bottom on phones",
    "a one-tap directions button",
    "an About section",
    "a search-friendly page title and listing details so Google understands what they do and where",
  ];
  if (r.category !== "church" && !(r.category === "finance" && r.variant === "financial_advisor")) f.push("a reviews section with a button to their Google reviews (we never copy reviews onto the site)");
  if (hasAnyHours(r.hours)) f.push(r.category === "church" ? "their office hours (labeled as office hours, not service times)" : "their hours, with an open/closed status that updates on its own");
  if (r.category === "restaurant") f.push("a menu section and a separate menu page, ready for their menu to be typed in");
  else f.push(`a ${r.category === "church" ? "ministries / programs" : "services"} list (${r.services.map((s) => s.name).join(", ")})`);
  if (r.serviceArea?.towns.length) f.push(`a service-area list of nearby towns (${r.serviceArea.towns.slice(0, 5).join(", ")}…)`);
  if (r.events?.length) f.push(`a "Coming up" section with their dated events and specials (${r.events.slice(0, 2).map((e) => e.title).join(", ")}), which drop off on their own once they've passed`);
  if (r.smsEnabled) f.push("a Text us button (their number takes texts), in the hero, the call bar and the closing section");
  if (r.category === "print") f.push("a 'send us your design' section with buttons to email or text their artwork");
  if (r.category === "church") {
    const c = r.ext.church ?? {};
    f.push(r.variant === "church" ? "service times in the first screen (under the welcome and in the top bar, with a 'Next service' chip), a service-times section and a 'Plan a visit' section for first-time visitors" : "a section for their meetings, help hours or hall rental, filled in with their own details");
    if (c.planVisitUrl) f.push("a Plan a visit button that opens the church's own form");
    if (c.kids && Object.values(c.kids).some(Boolean)) f.push("a Kids & students section in their words");
    if (c.liveUrl || c.sermonsUrl || c.podcastUrl || c.liveNote) f.push(`a Watch section${c.liveNote ? ` ('${c.liveNote}')` : ""}${c.podcastUrl ? " with a podcast link" : ""}`);
    if (c.prayerUrl || c.connectCardUrl || c.bulletinUrl || c.appUrl) f.push("a Connect row (prayer request link, connect card, bulletin, app) that links out and stores nothing");
    if (c.schedule?.some((x) => x.lang === "es")) f.push("Spanish-language services marked 'en español' in the schedule");
    if (c.volunteerUrl) f.push("a 'Sign up to volunteer' button");
    if (c.hallDetails && Object.values(c.hallDetails).some(Boolean)) f.push("hall rental facts (capacity, kitchen, tables) and how to book");
  }
  if (r.category === "finance" && r.variant === "tax_prep") f.push("a printable 'what to bring' checklist page for tax appointments");
  if (r.category === "finance" && r.variant === "financial_advisor") f.push(advisorReviewsOk(r) ? "a disclosures page for the firm's required disclosure text, and a compliance-approved reviews section with the SEC disclosure line" : "a disclosures page for the firm's required disclosure text (no reviews unless their compliance department approves it in writing)");
  if (r.category === "finance") {
    const fi = r.ext.finance ?? {};
    if (fi.people?.length) f.push(`a 'Who you'll work with' section with ${fi.people.map((p) => p.name).slice(0, 3).join(", ")} (names and credentials exactly as they gave them)`);
    else f.push("a 'Who you'll work with' section ready for their names, titles and credentials");
    if (r.variant === "tax_prep") f.push(fi.seasonHours?.summary ? "tax season hours that switch with the regular hours by date" : "a place for tax season hours that switch with the regular hours by date");
    if (fi.whoWeServe) f.push(`a 'Who we serve' line (${fi.whoWeServe})`);
    if (fi.fees?.length) f.push(`a fee list with the as-of month (${fi.feesAsOf || "to be set"})`);
    if (r.variant === "insurance") {
      f.push(`a 'Start a quote' form that asks the coverage type first (auto, home, life, business${fi.medicare ? ", Medicare" : ""})`);
      const centre = carrierItems(fi).filter((c) => c.payUrl || c.claimsPhone || c.claimsUrl);
      if (centre.length) f.push(`a 'Pay a bill / Report a claim' list for ${centre.map((c) => c.name).slice(0, 4).join(", ")}`);
      if (fi.memberships?.length) f.push(`membership chips (${fi.memberships.join(", ")})`);
    }
  }
  if (r.category === "retail") f.push("a 'what's new' section that sends shoppers to their Facebook or Instagram for new arrivals");
  if (r.category === "retail" && donationsOn(r)) f.push("a Donations section (what they take and can't take, drop-off hours, and a furniture-pickup request form if they offer pickups), filled in with their own list");
  if (r.category === "auto" && r.variant === "parts") f.push("a 'what we carry' list, a 'can't find it? we'll order it' section, counter services (battery testing and the like), and a Reserve a part form that asks for year, make, model and the part");
  f.push(...fsrpFeatures(r));
  if (r.category === "auto" && r.variant !== "parts") {
    const a = r.ext.auto ?? {};
    if (autoAmenityLabels(r).length) f.push(`a 'Good to know' row under the opening with their amenities (${autoAmenityLabels(r).slice(0, 4).join(", ")})`);
    else f.push("room for a 'Good to know' row (loaner cars, shuttle, key drop, Wi-Fi, digital inspections) once they tick what they offer");
    if (a.warranty?.months || a.warranty?.miles || a.programs?.length || a.financing) f.push(`a warranty & programs band${a.programs?.length ? ` naming ${a.programs.join(", ")}` : ""}${a.financing ? ` with 'financing available through ${a.financing.lender}'` : ""}`);
    if (r.reputation.count && r.reputation.count >= 10 && r.reputation.rating) f.push(`their Google rating and review count (${r.reputation.rating} · ${r.reputation.count} reviews) linked at the top of the page`);
    if (r.variant === "towing") f.push(`a 'Need a tow?' strip under the opening with the tow number${a.tow?.always ? " and 24/7" : " (24/7 only once they confirm the line is staffed)"}${r.smsEnabled ? " and a 'text us your location' link" : ""}`);
    if (r.variant === "tire") f.push(`a tire quote form (tire size or year/make/model, how many, brand preference)${a.tireBrands?.length ? `, the brands they carry (${a.tireBrands.slice(0, 4).join(", ")})` : ""}${a.storeUrl ? " and a 'Shop tires online' button" : ""}`);
    if (r.variant === "body") f.push(`an 'After an accident' section (call us, we work with your insurance, we handle the rest)${a.body?.insurers?.length ? ` naming the insurers they work with` : ""}${a.body?.certifications?.length ? ", their certifications" : ""}, and a spot for before/after photos`);
  }
  if (hasForm) f.push("a request form that sends customer requests to an inbox (once live)");
  f.push(...tlcFeatures(r));
  f.push("an FAQ section");
  return f;
}

/** Owner proof, visit lines and the Oct 2026 restaurant / salon / retail / print features, named only when they really render. */
function fsrpFeatures(r: BusinessRecord): string[] {
  const f: string[] = [];
  const p = r.proof;
  if (p && (p.awards?.length || p.memberships?.length || p.stats?.length)) f.push("their awards, memberships and numbers in the opening's proof line (only what they gave us)");
  if (p?.clients?.length) f.push(`a "Trusted by" line naming clients (${p.clients.slice(0, 3).join(", ")})`);
  if (r.closures?.length) f.push("holiday closures under the hours, which show in the top strip the week before and drop off after");
  if (r.visit?.paymentMethods?.length || r.visit?.parking) f.push("how to pay and where to park, next to the address");
  if (r.links.giftCards) f.push("a Gift cards button");
  const re = r.ext.restaurant;
  if (r.category === "restaurant") {
    const items = re?.menu?.sections.flatMap((s) => s.items) ?? [];
    if (items.some((i) => i.image || i.tags?.includes("popular"))) f.push("photo tiles of their popular dishes on the home page (their own photos) and dietary tags on the menu");
    else if (re?.menu) f.push("room for photo tiles of their 3-4 best sellers (they send phone photos) and dietary tags on the menu");
    if (re?.catering) f.push("a Catering section with a request form (date, headcount, what they need)");
    if (r.variant === "food_truck") f.push(`a "Where to find us" block for this week's stops${re?.calendarUrl ? " with a Full schedule button" : ""}, plus a Book the truck form`);
    if (re?.deliveryLinks && Object.keys(re.deliveryLinks).length) f.push(`an "Order through" row (${Object.keys(re.deliveryLinks).join(", ")})`);
    if (r.links.reserve) f.push("Reserve a table as the main button, since they take reservations");
  }
  const sa = r.ext.salon;
  if (r.category === "salon") {
    if (sa?.team?.length) f.push(`Meet the team cards (${sa.team.slice(0, 3).map((m) => m.name).join(", ")}) with Book with <name> buttons where they have their own link`);
    else f.push("room for Meet the team cards, each with their own booking link (people book people)");
    if (r.services.some((s) => s.durationMin)) f.push("service durations next to the prices");
    if (r.variant === "massage") f.push(sa?.rates?.length ? "a 30/60/90 rates table" : "room for a 30/60/90 rates table");
    if (sa?.policies && Object.values(sa.policies).some(Boolean)) f.push("a Good to know block with their deposit, cancellation, late and kids policies");
    if (sa?.introOffer?.text) f.push(`their new-client offer in the opening (${sa.introOffer.text})`);
    if (r.variant === "pet") f.push("a Before your appointment section for vaccinations, pricing-from, matting and what to bring");
  }
  const rt = r.ext.retail;
  if (r.category === "retail") {
    if (r.variant === "florist") f.push("occasion tiles (sympathy, weddings, birthdays), their delivery rule once they give it, and a sympathy & weddings inquiry form");
    if (rt?.vendors?.boothsAvailable) f.push("a Vendors & booths section with a booth inquiry form");
    if (rt?.departments?.length || rt?.brands?.length) f.push("department and brand chips in What we carry");
    if (rt?.financing?.lender || rt?.deliveryNote) f.push("a Delivery & financing block in their words");
    if (rt?.dropDay) f.push(`their new-arrivals day in What's new (${rt.dropDay})`);
    if (rt?.holdNote) f.push("a call-to-hold line with a Call button");
    if (r.showStreetAddress && r.address.street) f.push("the street address right in the opening (shoppers look for it first)");
  }
  const pr = r.ext.print;
  if (r.category === "print") {
    f.push("a quote form that asks what, how many, needed-by date, print locations, artwork status and rush");
    if (pr?.uploadUrl) f.push("an Upload your artwork button (their Dropbox/Drive file-request link)");
    else f.push("room for an Upload your artwork button once they make a Dropbox or Drive file-request link");
    if (pr?.turnaround || pr?.quantityTiers?.length) f.push("a Good to know block with their turnaround and price breaks");
    if (pr?.storeUrl) f.push("a button to their online / team store");
  }

  return f;
}

/** Trades, lawn and cleaning modules (Oct 2026): one line each, only for what the record really has. */
function tlcFeatures(r: BusinessRecord): string[] {
  const f: string[] = [];
  const tlc = r.category === "contractor" || r.category === "landscaping" || r.category === "cleaning";
  if (!tlc) return f;
  const c = r.ext.contractor;
  const k = r.ext.cleaning;
  const l = r.ext.landscaping;
  if (r.plans?.length) f.push(`a plans & pricing section with their ${r.plans.length} plan card${r.plans.length > 1 ? "s" : ""} (${r.plans.map((p) => p.name).join(", ")})${r.plans.some((p) => p.price) ? ", with their starting prices" : ", without prices until they give some"}`);
  else if (r.category === "landscaping" && r.variant === "lawn_crew") f.push("a 'ways to work with us' section (weekly, every 2 weeks, one-time) built from their services, with no prices until they add some");
  if (r.guarantee && (r.guarantee.text || r.guarantee.window || r.guarantee.remedy)) f.push("their guarantee, shown as a trust chip, a line under the services and an FAQ answer");
  if (r.offers?.length) f.push(`a promo bar with their current offer (${r.offers[0]!.title}), which hides itself when it expires`);
  if (r.media.gallery.some((p) => p.pairWith)) f.push("before-and-after photo pairs shown side by side");
  if (c?.financing?.lender) f.push(`a 'Financing available' chip and section naming ${c.financing.lender} with an Apply link`);
  if (c?.warrantyText) f.push("their warranty wording as a band under the services and an FAQ answer");
  if (c?.emergencyService) f.push("an emergency line under the header ('Emergency? Call …') with a 'Not urgent? Request service' link, and the form asks 'Is this an emergency?' so urgent requests are flagged red in the inbox");
  if (r.category === "contractor" && r.variant === "hvac" && r.licenses.length) f.push(`their license shown as 'AL# ${r.licenses[0]!.number}' next to the name and in the footer, as Alabama's HVAC board requires`);
  if (c?.serves) f.push(`a line saying they work with ${c.serves === "both" ? "homes and businesses" : c.serves === "commercial" ? "businesses" : "homeowners"}, and the form asks residential or commercial`);
  if (l?.seasonal) f.push("a 4-season 'what we do when' calendar built from their services with North Alabama timing");
  if (l?.adaiPermit) f.push("their ADAI permit number as a trust chip (needed for fertilizing and weed control)");
  if (l?.crew) f.push("a 'meet the crew' line in the About section");
  if (r.category === "cleaning" && r.variant === "residential") f.push(k?.checklist?.rooms.some((x) => x.tasks.length) ? "a what's-included table comparing their cleaning tiers room by room" : "room for a what's-included table once they send their checklist");
  if (r.category === "cleaning" && r.variant === "commercial") f.push(`a 'Request a walkthrough' button and form (building type, square feet, how often), a walkthrough → written scope → schedule section${k?.facilities?.length ? `, and the building types they clean (${k.facilities.slice(0, 4).join(", ")})` : ""}`);
  if (r.smsEnabled) f.push("a 'text us a photo' line under the request form");
  return f;
}

const PitchSchema = z.object({
  opener: z.string().describe("1-2 sentences the caller can say right after introducing themselves"),
  whyItMatters: z.array(z.string()).describe("3-4 short points specific to this business"),
  whatWeBuilt: z.array(z.string()).describe("3-4 short points describing their preview site"),
  questionsToAsk: z.array(z.string()).describe("3-5 questions that also gather what the site still needs"),
  objections: z.array(z.object({ objection: z.string(), response: z.string() })).describe("4-5 likely objections with short honest answers"),
  close: z.string().describe("How to ask for the yes, 2-3 sentences"),
  avoid: z.array(z.string()).describe("3-4 things not to say or promise"),
});
export type Pitch = z.infer<typeof PitchSchema>;

export interface SalesSettings {
  companyName?: string;
  callerName?: string;
  plans: Array<{ name: string; setup: number; monthly: number; includes: string }>;
  minMonths?: number;
  shortMonths?: number;
  /** Ways to pay, e.g. "Pay yearly (2 months free): pay 12 months up front and get 2 free". */
  billing?: string[];
  addons?: string[];
}

const SYSTEM = `You coach a friendly salesperson who calls small local businesses in and around Cullman, Alabama. The company builds websites for businesses that don't have one (or whose current site is outdated or broken on phones), and has ALREADY built a free preview site for this business. The caller wants to get the owner to look at the preview and sign up.

Write talking points, not a word-for-word script. Plain, warm, Southern-friendly language without dialect. Short lines the caller can glance at mid-call.

Rules:
- Honest and low-pressure. No fake urgency, no "limited time", no guilt.
- Never promise rankings, a number of customers, traffic or revenue. Don't claim affiliation with Google or Facebook.
- Use only the facts given. Prices only if given; if no plans are given, the close should offer to send pricing after the call.
- If there are several plans, lead with the middle one and mention the others briefly. If the owner balks at a minimum term, mention the month-to-month option; if they like saving money, mention paying yearly. Mention optional extras only if they ask about email, reviews or Google. The caller can send a sign-up link by text, where the owner reads the plan, accepts and sets up automatic monthly payment.
- If why_they_are_a_lead says they already have a website, don't claim they have none: the angle is that their current site is outdated, down, or hard to use on a phone, and the preview is a modern rebuild.
- Describe the preview using only preview_features. Don't add features it doesn't have.
- Be upfront that the preview was built from their public Google listing, and that they'd swap in their own photos and check every detail before it goes live.
- If they're not interested, thank them, offer to delete the preview, and respect it.
- The caller may text the preview link only after the owner says it's OK.
- Customer reviews are background only: you may mention themes (e.g. people love the staff) but never quote them.`;

export async function writePitch(
  client: Anthropic,
  input: { record: BusinessRecord; pack: CategoryPack; reason: string; reviewContext: string[]; todos: string[]; suggestions: string[]; sales: SalesSettings; model?: string },
): Promise<{ pitch: Pitch; usage: { input: number; output: number }; model: string }> {
  const r = input.record;
  const s = input.sales;
  const facts = {
    business: r.name,
    type: input.pack.variantLabel(r),
    town: `${r.address.city}, ${r.address.state}`,
    why_they_are_a_lead: input.reason,
    has_facebook_page: !!r.links.social.facebook,
    google_rating: r.reputation.rating,
    google_review_count: r.reputation.count,
    hours: hasAnyHours(r.hours) ? hoursSummary(r.hours) : "not listed on Google",
    preview_features: previewFeatures(r, input.pack.hasForm(r)),
    still_needed_from_owner: input.todos,
    nice_to_have_from_owner: input.suggestions,
    our_company: s.companyName ?? "(not set)",
    our_website: "undergroundassociates.com (they can look us up there)",
    caller_name: s.callerName ?? "(not set)",
    plans: s.plans.length
      ? s.plans.map((p) => ({ name: p.name, setup_fee: p.setup ? `$${p.setup}` : "none", monthly: `$${p.monthly}/month`, includes: p.includes || "(not listed)" }))
      : "(not set)",
    minimum_term: s.plans.length
      ? s.minMonths
        ? `${s.shortMonths && s.shortMonths < s.minMonths ? `${s.shortMonths} or ${s.minMonths}` : s.minMonths} months with no setup fee, then cancel any time; month to month has a setup fee`
        : "none, cancel any time"
      : "(not set)",
    ways_to_pay: s.billing?.length ? s.billing : "(not set)",
    optional_extras: s.addons?.length ? s.addons : "(none)",
  };
  const prompt = `<facts>\n${JSON.stringify(facts, null, 2)}\n</facts>

<why_websites_help_this_kind_of_business>
${(ANGLES[r.category] ?? []).map((a) => `- ${a}`).join("\n")}
</why_websites_help_this_kind_of_business>

<review_themes_context>
${input.reviewContext.slice(0, 5).map((t) => `- ${t.slice(0, 400)}`).join("\n") || "none"}
</review_themes_context>

Write the call guide for this business.`;

  const model = input.model ?? DEFAULT_COPY_MODEL;
  const res = await client.beta.messages.parse({
    model,
    max_tokens: 8000,
    system: SYSTEM,
    messages: [{ role: "user", content: prompt }],
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(PitchSchema) },
  });
  if (res.stop_reason === "refusal") throw new Error("The call guide request was declined");
  if (!res.parsed_output) throw new Error(`Call guide didn't match the expected format (stop: ${res.stop_reason})`);
  return { pitch: res.parsed_output, usage: { input: res.usage.input_tokens, output: res.usage.output_tokens }, model };
}
