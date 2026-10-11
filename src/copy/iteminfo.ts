import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { ItemInfo } from "../generator/types.ts";

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

export async function draftItemInfo(client: Anthropic, name: string, context: { shop?: string; section?: string; note?: string } = {}, model = INFO_MODEL): Promise<ItemInfo> {
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

/** Rows a customer sees, in order, from whatever the card has. */
export function infoRows(info: ItemInfo | undefined): Array<[string, string]> {
  if (!info) return [];
  const rows: Array<[string, string | undefined]> = [["Adult size", info.maxSize], ["Eats", info.diet], ["Temperament", info.temperament], ["Minimum tank", info.minTank], ["Care level", info.care], ["Water", info.water], ["From", info.origin]];
  return rows.filter((r): r is [string, string] => !!r[1]);
}
