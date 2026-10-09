import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { BusinessRecord, Copy, SpanishCopy } from "../generator/types.ts";
import { ask } from "./gbp.ts";
import { DEFAULT_COPY_MODEL } from "./write.ts";

/** Translates a site's approved English text into the Spanish page (extra). The owner reviews it like the rest. */

const Schema = z.object({
  heroTagline: z.string(),
  heroSub: z.string(),
  about: z.array(z.string()),
  services: z.array(z.object({ id: z.string(), name: z.string() })),
  faq: z.array(z.object({ q: z.string(), a: z.string() })),
  ctaTitle: z.string(),
  ctaLine: z.string(),
  metaDescription: z.string().describe("140-155 characters"),
});

export async function translateToSpanish(
  client: Anthropic,
  input: { record: BusinessRecord; copy: Copy; model?: string },
): Promise<{ es: SpanishCopy; usage: { input: number; output: number } }> {
  const { record: r, copy: c } = input;
  const system = `You translate small local business websites in Cullman, Alabama into natural, friendly Spanish for local Spanish-speaking customers (Mexican and Central American Spanish, "usted" form).
- Translate meaning, not word for word. Keep it short and plain.
- Keep the business name, street names, town names and brand names exactly as written.
- Never add facts, prices, promises or claims that aren't in the English.
- Return one service entry per service given, with the same id.`;
  const english = {
    business: r.name,
    town: `${r.address.city}, ${r.address.state}`,
    heroTagline: c.heroTagline,
    heroSub: c.heroSub,
    about: c.about,
    services: r.services.map((s) => ({ id: s.id, name: s.name })),
    faq: c.faq.slice(0, 6),
    ctaTitle: c.ctaTitle,
    ctaLine: c.ctaLine,
    metaDescription: c.meta.description,
  };
  const { data, usage } = await ask(client, input.model ?? DEFAULT_COPY_MODEL, system, `<english>\n${JSON.stringify(english, null, 2)}\n</english>\n\nTranslate every field into Spanish.`, Schema, 6000);
  const known = new Set(r.services.map((s) => s.id));
  return {
    es: {
      heroTagline: data.heroTagline,
      heroSub: data.heroSub,
      about: data.about.slice(0, 4),
      services: Object.fromEntries(data.services.filter((s) => known.has(s.id)).map((s) => [s.id, s.name])),
      faq: data.faq.slice(0, 6),
      ctaTitle: data.ctaTitle,
      ctaLine: data.ctaLine,
      metaDescription: data.metaDescription,
    },
    usage,
  };
}
