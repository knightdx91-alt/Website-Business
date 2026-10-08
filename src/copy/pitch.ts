import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { hasAnyHours, hoursSummary } from "../generator/hours.ts";
import type { CategoryPack } from "../generator/packs/types.ts";
import type { BusinessRecord } from "../generator/types.ts";
import { DEFAULT_COPY_MODEL } from "./write.ts";

/** Why a site helps each kind of business, drawn from the category research in research/*.md. */
const ANGLES: Record<string, string[]> = {
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
    "a reviews section with a button to their Google reviews (we never copy reviews onto the site)",
    "an About section",
    "a search-friendly page title and listing details so Google understands what they do and where",
  ];
  if (hasAnyHours(r.hours)) f.push("their hours, with an open/closed status that updates on its own");
  if (r.category === "restaurant") f.push("a menu section and a separate menu page, ready for their menu to be typed in");
  else f.push(`a services list (${r.services.map((s) => s.name).join(", ")})`);
  if (r.serviceArea?.towns.length) f.push(`a service-area list of nearby towns (${r.serviceArea.towns.slice(0, 5).join(", ")}…)`);
  if (hasForm) f.push("a request form that sends customer requests to an inbox (once live)");
  f.push("an FAQ section");
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
  setupPrice?: number;
  monthlyPrice?: number;
  offerIncludes?: string;
}

const SYSTEM = `You coach a friendly salesperson who calls small local businesses in and around Cullman, Alabama. The company builds websites for businesses that don't have one, and has ALREADY built a free preview site for this business. The caller wants to get the owner to look at the preview and sign up.

Write talking points, not a word-for-word script. Plain, warm, Southern-friendly language without dialect. Short lines the caller can glance at mid-call.

Rules:
- Honest and low-pressure. No fake urgency, no "limited time", no guilt.
- Never promise rankings, a number of customers, traffic or revenue. Don't claim affiliation with Google or Facebook.
- Use only the facts given. Prices only if given; if prices are missing, the close should offer to send pricing after the call.
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
    caller_name: s.callerName ?? "(not set)",
    setup_price: s.setupPrice ? `$${s.setupPrice}` : "(not set)",
    monthly_price: s.monthlyPrice ? `$${s.monthlyPrice}/month` : "(not set)",
    whats_included: s.offerIncludes ?? "(not set)",
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
