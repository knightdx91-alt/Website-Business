import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { hasAnyHours, hoursSummary } from "../generator/hours.ts";
import { donationsOn } from "../generator/actions.ts";
import { partsCounter } from "../generator/packs/auto.ts";
import { BANNED_PHRASES, bannedPhraseIn, quotesReview, SUPERLATIVE, unsupportedNumbers } from "../generator/lint.ts";
import type { CategoryPack } from "../generator/packs/types.ts";
import type { BusinessRecord, Copy } from "../generator/types.ts";

export const DEFAULT_COPY_MODEL = "claude-opus-5-5";
/** Bump when the prompt changes so cached copy is regenerated. */
export const COPY_PROMPT_VERSION = 4;

const CopySchema = z.object({
  cuisineLabel: z.string().describe("Restaurants only; empty string otherwise"),
  heroTagline: z.string(),
  heroSub: z.string(),
  about: z.array(z.string()),
  serviceBlurbs: z.array(z.object({ id: z.string(), text: z.string() })),
  steps: z.array(z.object({ title: z.string(), body: z.string() })),
  faq: z.array(z.object({ q: z.string(), a: z.string() })),
  serviceAreaIntro: z.string(),
  ctaTitle: z.string(),
  ctaLine: z.string(),
  metaDescription: z.string(),
  heroQuestion: z.string().describe("Only when the brief asks: a headline question, at most 60 characters; empty string otherwise"),
  heroBenefit: z.string().describe("Only when the brief asks: a headline benefit line, at most 60 characters; empty string otherwise"),
});
type CopyOut = z.infer<typeof CopySchema>;

const SYSTEM = `You write website copy for small local businesses in and around Cullman, Alabama. Each site is shown to the owner as a preview, and the owner reviews every word before anything goes live.

Rules that matter more than style:
- Use only the facts in <facts>. Never invent years, history, family names, awards, licenses, certifications, warranties, prices, response times, "24/7", "emergency", "family-owned", menu items or specialties that aren't given. If a fact is missing, leave it out; don't hedge around it.
- Google review text in <review_context> is private background so you understand what customers value. Never quote it, paraphrase a specific review, or mention reviews, ratings or star counts.
- No superlatives or hype: no "best", "#1", "top", "premier", "finest", "unmatched", "world-class", "most trusted". Also avoid: ${BANNED_PHRASES.filter((p) => !["#1", "best in town"].includes(p)).join(", ")}.
- Write as the business itself, using "we" and "our" (never "they").
- US English, 6th-8th grade reading level, short sentences, active voice. Plain and local, never corporate. No dialect caricature.
- Don't restate hours, phone numbers, prices or the street address in prose. The page shows those from live data, and prose copies go stale.
- Don't recite a list of amenities or options; mention one or two only if they help the story.
- Write fresh wording for this specific business. Don't reuse generic template sentences.
- Fill fields the brief doesn't ask for with an empty string or empty array.`;

export interface WriteCopyInput {
  record: BusinessRecord;
  pack: CategoryPack;
  reviewContext: string[];
  editorialSummary?: string;
  primaryTypeLabel?: string;
  model?: string;
}

export interface WriteCopyResult {
  copy: Copy;
  usage: { input: number; output: number };
  issues: string[];
  model: string;
}

function facts(r: BusinessRecord, pack: CategoryPack, primaryTypeLabel?: string): Record<string, unknown> {
  const so = r.ext.restaurant?.serviceOptions;
  return {
    name: r.name,
    category: pack.label,
    type: pack.variantLabel(r),
    google_type: primaryTypeLabel,
    town: `${r.address.city}, ${r.address.state}`,
    county: r.address.county ? `${r.address.county} County` : undefined,
    hours: hasAnyHours(r.hours) ? hoursSummary(r.hours) : "unknown",
    services: r.services.length ? r.services.map((s) => ({ id: s.id, name: s.name })) : undefined,
    service_area_towns: r.serviceArea?.towns,
    restaurant_options: so && Object.keys(so).length ? so : undefined,
    founded_year: r.foundedYear,
    ownership: r.ownershipTags.length ? r.ownershipTags : undefined,
    licensed: r.licenses.length > 0 || undefined,
    insured: r.insured,
    bonded: r.bonded,
    free_estimates: r.ext.contractor?.freeEstimates || r.ext.auto?.freeEstimates || r.ext.landscaping?.freeEstimates || r.ext.cleaning?.freeEstimates || undefined,
    walk_ins: r.ext.salon?.walkIns,
    ase_certified: r.ext.auto?.ase,
    warranty: r.ext.auto?.warranty,
    ...(r.category === "auto" && r.variant === "parts"
      ? {
          counter_services: partsCounter(r).map((c) => c.label),
          special_order_turnaround: r.ext.auto?.parts?.turnaround ?? "unknown",
          commercial_accounts: r.ext.auto?.parts?.commercial || undefined,
          parts_program: r.ext.auto?.parts?.program,
          online_ordering_for_pickup: r.ext.auto?.parts?.orderUrl ? true : undefined,
        }
      : {}),
    ...(donationsOn(r)
      ? {
          donations: {
            accepts: r.ext.retail?.donations?.accepts ?? "unknown",
            does_not_accept: r.ext.retail?.donations?.doesNotAccept ?? "unknown",
            drop_off_hours: r.ext.retail?.donations?.dropOffHours ?? "unknown",
            furniture_pickup: r.ext.retail?.donations?.pickup ?? "unknown",
            nonprofit_receipts: r.ext.retail?.donations?.receipts ?? "unknown",
          },
        }
      : {}),
    background_checked: r.ext.cleaning?.backgroundChecked,
    brings_supplies: r.ext.cleaning?.suppliesIncluded,
    pet_safe_products: r.ext.cleaning?.petSafe,
    ...fsrpFacts(r),
    ...tlcFacts(r),
    owner_story: "unknown",
  };
}

/** Owner proof, visit lines and the Oct 2026 restaurant / salon / retail / print facts; only what the owner typed. */
function fsrpFacts(r: BusinessRecord): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const p = r.proof;
  if (p?.awards?.length) out.awards = p.awards.map((a) => (a.year ? `${a.name} (${a.year})` : a.name));
  if (p?.memberships?.length) out.memberships = p.memberships;
  if (p?.clients?.length) out.named_clients = p.clients;
  if (p?.stats?.length) out.stats = p.stats.map((s) => `${s.value} ${s.label}`);
  if (r.visit?.paymentMethods?.length) out.payment_methods = r.visit.paymentMethods;
  if (r.visit?.parking) out.parking = r.visit.parking;
  if (r.links.giftCards) out.gift_cards = true;
  const re = r.ext.restaurant;
  if (r.category === "restaurant") {
    out.catering = re?.catering ? re.cateringNote || true : false;
    if (r.variant === "food_truck") out.schedule_link = re?.calendarUrl ? true : "none (stops are typed in as events)";
    const d = Object.keys(re?.deliveryLinks ?? {});
    if (d.length) out.delivery_partners = d;
    if (re?.rewardsUrl) out.rewards_program = true;
    const items = re?.menu?.sections.flatMap((s) => s.items) ?? [];
    const pop = items.filter((i) => i.tags?.includes("popular") || i.tags?.includes("house_favorite")).map((i) => i.name);
    if (pop.length) out.popular_dishes = pop;
  }
  const sa = r.ext.salon;
  if (r.category === "salon") {
    if (sa?.team?.length) out.team = sa.team.map((m) => [m.name, m.role, m.days].filter(Boolean).join(", "));
    if (sa?.rates?.length) out.session_rates = sa.rates.map((x) => `${x.minutes} min ${x.price}`);
    if (sa?.policies && Object.values(sa.policies).some(Boolean)) out.policies = sa.policies;
    if (sa?.introOffer?.text) out.new_client_offer = sa.introOffer;
    if (sa?.pet && Object.values(sa.pet).some(Boolean)) out.grooming_rules = sa.pet;
    const durations = r.services.filter((s) => s.durationMin).map((s) => `${s.name}: ${s.durationMin} min`);
    if (durations.length) out.service_durations = durations;
  }
  const rt = r.ext.retail;
  if (r.category === "retail") {
    if (rt?.florist) out.florist = { occasions: rt.florist.occasions, delivery_area: rt.florist.deliveryArea ?? "unknown", same_day_cutoff: rt.florist.cutoff ?? "none given", delivery_fee: rt.florist.deliveryFee ?? "unknown", designers_choice: rt.florist.designersChoice ?? false };
    if (rt?.vendors) out.vendor_booths = rt.vendors;
    if (rt?.departments?.length) out.departments = rt.departments;
    if (rt?.brands?.length) out.brands_carried = rt.brands;
    if (rt?.financing?.lender) out.financing_through = rt.financing.lender;
    if (rt?.deliveryNote) out.delivery_rule = rt.deliveryNote;
    if (rt?.dropDay) out.new_arrivals_day = rt.dropDay;
    if (rt?.holdNote) out.hold_policy = rt.holdNote;
    if (rt?.occasions?.length) out.occasions = rt.occasions;
  }
  const pr = r.ext.print;
  if (r.category === "print") {
    if (pr?.turnaround) out.typical_turnaround = pr.turnaround;
    if (pr?.quantityTiers?.length) out.price_breaks_at = pr.quantityTiers.map((t) => t.from);
    if (pr?.uploadUrl) out.artwork_upload_link = true;
    if (pr?.storeUrl) out.online_store = true;
  }
  return out;
}

/** Trades, lawn and cleaning owner facts (Oct 2026 modules): the copy may mention them; nothing here is ever invented. */
function tlcFacts(r: BusinessRecord): Record<string, unknown> {
  if (r.category !== "contractor" && r.category !== "landscaping" && r.category !== "cleaning") return {};
  const c = r.ext.contractor;
  const l = r.ext.landscaping;
  const k = r.ext.cleaning;
  const out: Record<string, unknown> = {
    plans: r.plans?.length ? r.plans.map((p) => ({ name: p.name, price: p.price ? `${p.price}${p.unit ? ` per ${p.unit}` : ""}` : "not given", includes: p.includes })) : undefined,
    guarantee: r.guarantee?.text || r.guarantee?.remedy || r.guarantee?.window ? { window: r.guarantee.window, remedy: r.guarantee.remedy, text: r.guarantee.text } : undefined,
    current_offers: r.offers?.length ? r.offers.map((o) => o.title) : undefined,
  };
  if (r.category === "contractor") {
    out.financing_lender = c?.financing?.lender;
    out.financing_terms = c?.financing?.lender ? "unknown: never state rates, 0%, approval or credit terms" : undefined;
    out.warranty_text = c?.warrantyText || undefined;
    out.emergency_service = c?.emergencyService || undefined;
    out.emergency_terms = c?.emergencyService ? c.afterHours?.note || "unknown" : undefined;
    out.serves = c?.serves;
  }
  if (r.category === "landscaping") {
    out.seasonal_calendar_shown = l?.seasonal || undefined;
    out.adai_permit = l?.adaiPermit ? "yes (number on file)" : undefined;
    out.crew_line = l?.crew || undefined;
  }
  if (r.category === "cleaning") {
    out.cleaning_tiers = k?.checklist?.tiers?.length ? k.checklist.tiers : undefined;
    out.facility_types = k?.facilities?.length ? k.facilities : undefined;
    out.cleaning_frequency = k?.frequency || undefined;
    out.after_hours_cleaning = k?.afterHours || undefined;
  }
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined));
}

function brief(pack: CategoryPack, r: BusinessRecord): string {
  const b = pack.copyBrief(r);
  const lines = Object.entries(b.fields).map(([k, v]) => `- ${k}: ${v}`);
  return `Voice: ${b.voice}\n\nFields to write:\n${lines.join("\n")}`;
}

function check(out: CopyOut, factsText: string, reviews: string[], banned: RegExp[] = []): string[] {
  const issues: string[] = [];
  const all = [out.cuisineLabel, out.heroTagline, out.heroSub, ...out.about, ...out.serviceBlurbs.map((s) => s.text), ...out.steps.flatMap((s) => [s.title, s.body]), ...out.faq.flatMap((f) => [f.q, f.a]), out.serviceAreaIntro, out.ctaTitle, out.ctaLine, out.metaDescription, out.heroQuestion, out.heroBenefit].join(" \n ");
  const hype = bannedPhraseIn(all);
  if (hype) issues.push(`uses banned phrase "${hype}"`);
  if (out.heroQuestion.length > 60) issues.push("heroQuestion is longer than 60 characters");
  if (out.heroBenefit.length > 60) issues.push("heroBenefit is longer than 60 characters");
  if (SUPERLATIVE.test(all)) issues.push("uses a superlative");
  for (const re of banned) {
    const m = re.exec(all);
    if (m) issues.push(`uses "${m[0]}", which this kind of business may not claim or offer`);
  }
  for (const n of unsupportedNumbers(all, factsText)) issues.push(`mentions the number ${n}, which isn't in the facts`);
  for (const rv of reviews) if (quotesReview(all, rv)) issues.push("repeats wording from a Google review");
  return issues;
}

function toCopy(out: CopyOut, issues: string[] = []): Copy {
  return {
    heroTagline: out.heroTagline,
    heroSub: out.heroSub,
    about: out.about.filter(Boolean),
    serviceBlurbs: Object.fromEntries(out.serviceBlurbs.map((s) => [s.id, s.text])),
    steps: out.steps.length ? out.steps : undefined,
    faq: out.faq,
    serviceAreaIntro: out.serviceAreaIntro || undefined,
    ctaTitle: out.ctaTitle,
    ctaLine: out.ctaLine,
    cuisineLabel: out.cuisineLabel || undefined,
    meta: { title: "", description: out.metaDescription },
    approved: false,
    issues: issues.length ? issues : undefined,
    heroQuestion: out.heroQuestion?.trim() || undefined,
    heroBenefit: out.heroBenefit?.trim() || undefined,
  };
}

export async function writeCopy(client: Anthropic, input: WriteCopyInput): Promise<WriteCopyResult> {
  const model = input.model ?? DEFAULT_COPY_MODEL;
  const f = facts(input.record, input.pack, input.primaryTypeLabel);
  const factsText = JSON.stringify(f);
  const reviews = input.reviewContext.slice(0, 5).map((t) => t.slice(0, 600));
  const prompt = `<facts>\n${JSON.stringify(f, null, 2)}\n</facts>

<review_context>
${reviews.length ? reviews.map((r, i) => `[${i + 1}] ${r}`).join("\n") : "none"}
${input.editorialSummary ? `Google's own summary: ${input.editorialSummary}` : ""}
</review_context>

${brief(input.pack, input.record)}`;

  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: prompt }];
  const usage = { input: 0, output: 0 };
  let issues: string[] = [];
  let out: CopyOut | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await client.beta.messages.parse({
      model,
      max_tokens: 16000,
      system: SYSTEM,
      messages,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(CopySchema) },
    });
    usage.input += res.usage.input_tokens;
    usage.output += res.usage.output_tokens;
    if (res.stop_reason === "refusal") throw new Error(`Copy request for ${input.record.name} was declined`);
    if (!res.parsed_output) throw new Error(`Copy for ${input.record.name} didn't match the schema (stop: ${res.stop_reason})`);
    out = res.parsed_output;
    issues = check(out, factsText, input.reviewContext, input.pack.bannedPhrases?.(input.record));
    if (issues.length === 0) break;
    messages.push({ role: "assistant", content: res.content });
    messages.push({ role: "user", content: `Please fix these problems and return the full copy again:\n- ${issues.join("\n- ")}` });
  }
  return { copy: toCopy(out!, issues), usage, issues, model };
}
