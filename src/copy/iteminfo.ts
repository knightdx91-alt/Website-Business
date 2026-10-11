import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { KINDS } from "../generator/pricelist.ts";
import type { ItemInfo, ListKind } from "../generator/types.ts";

/**
 * A short care card for something a shop sells (built for fish: max size, diet, temperament, tank size, care level, water).
 * Drafted when a new item is added on the tablet or the board; marked `aiDrafted` so the shop knows to check it. Short,
 * plain, no sales talk; "Not sure" is allowed and better than a guess.
 */

const Schema = z.object({
  kind: z.enum(["fish", "invertebrate", "plant", "reptile", "bird", "small_animal", "other"]).describe("What this item is."),
  maxSize: z.string().max(40).describe('Adult size, e.g. "1.5 in" or "Up to 12 in". Blank if not a living thing.'),
  diet: z.string().max(80).describe('e.g. "Flake, frozen brine shrimp". Blank if unknown.'),
  temperament: z.string().max(60).describe('e.g. "Peaceful, schooling (keep 6+)" or "Semi-aggressive". Blank if unknown.'),
  minTank: z.string().max(40).describe('Minimum tank or enclosure, e.g. "10 gal". Blank if unknown.'),
  care: z.enum(["Beginner", "Easy", "Moderate", "Advanced", ""]).describe("Care level."),
  water: z.string().max(80).describe('Water or habitat, e.g. "Freshwater, 72–78 °F, pH 6–7.5". Blank if unknown.'),
  origin: z.string().max(60).describe('Where it comes from in the wild, e.g. "South America". Blank if unknown.'),
  notes: z.string().max(220).describe("One or two plain sentences a customer standing at the tank would want: lifespan, tank mates, anything to know before buying. No sales talk."),
  sure: z.boolean().describe("False when the name is ambiguous or you are guessing."),
});

export const INFO_MODEL = "claude-sonnet-5-5";

const SYSTEM = `You write short care cards for a small pet and aquarium shop's price tags. Facts only, in plain words a customer reads standing at the tank. If the name could mean several species or you aren't sure, say so with sure=false and keep fields blank rather than guessing. Never mention prices, stock, the shop, or that you are an AI.`;

const FactsSchema = z.object({
  facts: z.array(z.object({ label: z.string().max(40), value: z.string().max(80) })).max(8).describe("One row per label from the list given, in that order; leave out any you don't know."),
  notes: z.string().max(220).describe("One or two plain sentences a customer standing at the shelf would want. No sales talk."),
  sure: z.boolean().describe("False when the name is ambiguous or you are guessing."),
});

/** Non-fish kinds: a card with the kind's own rows (plants: light, water, zone…; food: made with, allergens…; goods: brand, size…). */
async function draftFacts(client: Anthropic, name: string, kind: ListKind, context: { shop?: string; section?: string; note?: string }, model: string): Promise<ItemInfo> {
  const labels = KINDS[kind].fields.map(([, label, ex]) => `${label} (e.g. ${ex})`).join("; ");
  const res = await client.beta.messages.parse({
    model,
    max_tokens: 1000,
    system: `You write short info cards for a small shop's price tags (${KINDS[kind].label}). Facts only, in plain words a customer reads standing at the shelf. Use only these row labels, in this order, and leave out any you can't fill honestly: ${labels}. If the name could mean several things or you aren't sure, say so with sure=false and keep the rows few rather than guessing. Never mention prices, stock, the shop, or that you are an AI.`,
    messages: [{ role: "user", content: `Item: ${name}\nSection: ${context.section ?? "unknown"}\nShop: ${context.shop ?? "a local shop"}\nShop's note: ${context.note ?? "none"}` }],
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(FactsSchema) },
  });
  if (res.stop_reason === "refusal" || !res.parsed_output) throw new Error(`No info card for ${name}`);
  const o = res.parsed_output;
  const allowed = new Set(KINDS[kind].fields.map(([, label]) => label.toLowerCase()));
  const facts = o.facts.filter((f) => f.value.trim() && allowed.has(f.label.trim().toLowerCase())).map((f) => ({ label: f.label.trim(), value: f.value.trim() }));
  return { kind: kind === "plants" ? "plant" : kind === "pets" ? "reptile" : "other", facts, notes: o.notes.trim() || undefined, aiDrafted: true, unsure: !o.sure || undefined };
}

export async function draftItemInfo(client: Anthropic, name: string, context: { shop?: string; section?: string; note?: string; kind?: ListKind } = {}, model = INFO_MODEL): Promise<ItemInfo> {
  if (context.kind && context.kind !== "fish") return draftFacts(client, name, context.kind, context, model);
  const res = await client.beta.messages.parse({
    model,
    max_tokens: 1200,
    system: SYSTEM,
    messages: [{ role: "user", content: `Item: ${name}\nSection or tank: ${context.section ?? "unknown"}\nShop: ${context.shop ?? "a pet and aquarium shop"}\nShop's note: ${context.note ?? "none"}` }],
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(Schema) },
  });
  if (res.stop_reason === "refusal" || !res.parsed_output) throw new Error(`No info card for ${name}`);
  const o = res.parsed_output;
  const clean = (s: string) => s.trim() || undefined;
  return { kind: o.kind, maxSize: clean(o.maxSize), diet: clean(o.diet), temperament: clean(o.temperament), minTank: clean(o.minTank), care: clean(o.care), water: clean(o.water), origin: clean(o.origin), notes: clean(o.notes), aiDrafted: true, unsure: !o.sure || undefined };
}

export { infoRows } from "../generator/pricelist.ts";
