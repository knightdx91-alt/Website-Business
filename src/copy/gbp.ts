import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { hasAnyHours, hoursSummary } from "../generator/hours.ts";
import { SUPERLATIVE } from "../generator/lint.ts";
import type { CategoryPack } from "../generator/packs/types.ts";
import type { BusinessRecord } from "../generator/types.ts";
import { DEFAULT_COPY_MODEL } from "./write.ts";

/**
 * Text for a client's Google Business Profile: the one-time tune-up kit, monthly posts and review replies.
 * Written to Google's content rules (no links, phone numbers, prices or hype in descriptions; no phone
 * numbers or links in post text), and always approved by the owner before it goes on the profile.
 */

type Usage = { input: number; output: number };

function facts(r: BusinessRecord, pack: CategoryPack, website?: string) {
  return {
    business: r.name,
    type: pack.variantLabel(r),
    town: `${r.address.city}, ${r.address.state}`,
    service_area: r.serviceArea?.towns ?? [],
    services: r.services.map((s) => s.name),
    hours: hasAnyHours(r.hours) ? hoursSummary(r.hours) : "not listed",
    founded_year: r.foundedYear ?? null,
    family_owned: r.ownershipTags.includes("family_owned"),
    insured: r.insured ?? null,
    website: website ?? null,
  };
}

const RULES = `Rules for all Google Business Profile text:
- Plain, warm, local. Write as the business ("we"). Short sentences.
- Use only the facts given. Never invent history, awards, years, staff, prices, certifications or guarantees.
- No phone numbers, no URLs or web addresses, no email addresses, no hashtags, no emoji, no ALL CAPS.
- No superlatives or hype ("best", "#1", "finest", "top-rated") and no keyword stuffing.`;

export async function ask<T>(client: Anthropic, model: string, system: string, prompt: string, schema: z.ZodType<T>, maxTokens = 4000): Promise<{ data: T; usage: Usage }> {
  const res = await client.beta.messages.parse({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: prompt }],
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(schema) },
  });
  if (res.stop_reason === "refusal") throw new Error("The request was declined");
  if (!res.parsed_output) throw new Error(`The answer didn't match the expected format (stop: ${res.stop_reason})`);
  return { data: res.parsed_output, usage: { input: res.usage.input_tokens, output: res.usage.output_tokens } };
}

const PHONE = /\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/;
const LINK = /\bhttps?:\/\/|\bwww\.|\b[a-z0-9-]+\.(com|net|org|biz|us|dev)\b/i;

/** Problems that would get text rejected by Google or break our rules. Empty when clean. */
export function profileTextProblems(text: string, maxChars: number): string[] {
  const out: string[] = [];
  if (text.length > maxChars) out.push(`over ${maxChars} characters`);
  if (PHONE.test(text)) out.push("has a phone number");
  if (LINK.test(text)) out.push("has a link");
  if (SUPERLATIVE.test(text)) out.push("has a superlative");
  return out;
}

const KitSchema = z.object({
  description: z.string().describe("Business description for the profile, 500-740 characters"),
  services: z.array(z.object({ name: z.string(), description: z.string().describe("One sentence, under 250 characters") })),
});
export type ProfileKit = z.infer<typeof KitSchema>;

export async function writeProfileKit(
  client: Anthropic,
  input: { record: BusinessRecord; pack: CategoryPack; website?: string; model?: string },
): Promise<{ kit: ProfileKit; usage: Usage }> {
  const model = input.model ?? DEFAULT_COPY_MODEL;
  const system = `You write Google Business Profile text for small local businesses in and around Cullman, Alabama.\n\n${RULES}\n- The description must be 500-740 characters (Google's limit is 750). Say what the business does, who it serves and where, and what customers can expect. Lead with the most useful information.\n- One service entry for each service given, in the same order, with a one-sentence description of what's typically included.`;
  const prompt = `<facts>\n${JSON.stringify(facts(input.record, input.pack, input.website), null, 2)}\n</facts>\n\nWrite the profile description and service descriptions.`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, usage } = await ask(client, model, system, attempt ? `${prompt}\n\nYour last description broke a rule. Follow every rule exactly.` : prompt, KitSchema);
    if (!profileTextProblems(data.description, 750).length || attempt === 1) return { kit: data, usage };
  }
  throw new Error("unreachable");
}

const PostsSchema = z.object({
  posts: z.array(
    z.object({
      topic: z.string().describe("2-5 word label, e.g. 'Fall hours', 'Spring cleanup'"),
      text: z.string().describe("The post, 300-900 characters"),
      button: z.enum(["Call now", "Learn more", "Book", "Order online", "Get quote"]),
    }),
  ),
});
export type GbpPost = z.infer<typeof PostsSchema>["posts"][number];

export async function writeMonthlyPosts(
  client: Anthropic,
  input: { record: BusinessRecord; pack: CategoryPack; month: string; count: number; recentTopics: string[]; ownerNotes?: string; model?: string },
): Promise<{ posts: GbpPost[]; usage: Usage }> {
  const model = input.model ?? DEFAULT_COPY_MODEL;
  const system = `You write short "What's new" posts for a local business's Google Business Profile, in and around Cullman, Alabama.\n\n${RULES}\n- Each post is 300-900 characters, useful to a customer this month: seasonal needs, what to book ahead for, reminders about services, holiday hours to check, a friendly invitation. No fake sales, discounts or events unless the owner's notes give them.\n- Don't put the phone number or a link in the text; the post's button handles that.\n- Make each post different from each other and from recent topics.`;
  const prompt = `<facts>\n${JSON.stringify(facts(input.record, input.pack), null, 2)}\n</facts>\n<month>${input.month}</month>\n<recent_topics>${input.recentTopics.join("; ") || "none"}</recent_topics>\n<owner_notes>${input.ownerNotes || "none"}</owner_notes>\n\nWrite ${input.count} posts for this month.`;
  const { data, usage } = await ask(client, model, system, prompt, PostsSchema);
  return { posts: data.posts.slice(0, input.count), usage };
}

export async function writeReviewReply(
  client: Anthropic,
  input: { record: BusinessRecord; review: string; stars: number; reviewer?: string; model?: string },
): Promise<{ reply: string; usage: Usage }> {
  const model = input.model ?? DEFAULT_COPY_MODEL;
  const system = `You write replies from a small local business to its Google reviews.\n- 1-4 short sentences, warm and specific to what the review says. Sign off as the business, not a person.\n- Use the reviewer's first name if given. Never repeat private details, never argue, never offer discounts or gifts for reviews.\n- For 1-3 stars: thank them, apologize for their experience without admitting fault for specifics, and invite them to call the business directly to make it right (say "give us a call" without a number).\n- No links, no phone numbers, no emoji.`;
  const prompt = `<business>${input.record.name} (${input.record.address.city}, ${input.record.address.state})</business>\n<stars>${input.stars}</stars>\n<reviewer>${input.reviewer || "unknown"}</reviewer>\n<review>\n${input.review.slice(0, 4000)}\n</review>\n\nWrite the reply.`;
  const { data, usage } = await ask(client, model, system, prompt, z.object({ reply: z.string() }), 1500);
  return { reply: data.reply, usage };
}
