import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { packFor } from "../generator/packs/index.ts";
import { resolveTheme } from "../generator/themes.ts";
import type { Ctx } from "../generator/components.ts";
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
  nav: z.array(z.object({ en: z.string(), es: z.string() })).describe("One entry per menu label given, short (1-3 words)"),
});

/** The site's menu labels, so the translator can give each one its Spanish wording. */
function navLabels(r: BusinessRecord, c: Copy): string[] {
  const pack = packFor(r.category);
  const ctx = { r, copy: c, theme: resolveTheme(pack.defaultLook(r)), mode: "preview", site: { slug: "", look: "" }, todos: [], suggestions: [], hasForm: pack.hasForm(r) } as Ctx;
  try {
    return pack.nav(ctx).map((n) => n.label);
  } catch {
    return [];
  }
}

export async function translateToSpanish(
  client: Anthropic,
  input: { record: BusinessRecord; copy: Copy; model?: string },
): Promise<{ es: SpanishCopy; usage: { input: number; output: number } }> {
  const { record: r, copy: c } = input;
  const system = `You translate small local business websites in Cullman, Alabama into natural, friendly Spanish for local Spanish-speaking customers (Mexican and Central American Spanish, "usted" form).
- Translate meaning, not word for word. Keep it short and plain.
- Keep the business name, street names, town names and brand names exactly as written.
- Never add facts, prices, promises or claims that aren't in the English.
- Return one service entry per service given, with the same id, and one nav entry per menu label given (short, like a website menu: "Servicios", "Reseñas", "Horario y ubicación").${
    r.category === "finance"
      ? `\n- This is a tax, accounting, insurance or financial office. Never use "notario" or "notario público" (say "servicio de notaría" for notary), never mention immigration or legal services, and never add refund, rate, savings or credential claims ("reembolso máximo", "garantizado", "el más barato", "certificado").`
      : ""
  }`;
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
    menuLabels: navLabels(r, c),
  };
  const { data, usage } = await ask(client, input.model ?? DEFAULT_COPY_MODEL, system, `<english>\n${JSON.stringify(english, null, 2)}\n</english>\n\nTranslate every field into Spanish.`, Schema, 6000);
  if (r.category === "finance") {
    const text = JSON.stringify(data).toLowerCase();
    const bad = /\bnotario|inmigraci|abogad|reembolso (m[aá]ximo|garantizado|r[aá]pido)|garantiza|m[aá]s barat|certificad/.exec(text);
    if (bad) throw new Error(`The Spanish text used "${bad[0]}", which a tax or finance office can't say. Try writing the Spanish page again.`);
  }
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
      nav: Object.fromEntries(data.nav.filter((n) => english.menuLabels.includes(n.en) && n.es.trim()).map((n) => [n.en, n.es.trim()])),
    },
    usage,
  };
}

const StringsSchema = z.object({
  items: z.array(z.object({ i: z.number().int(), es: z.string() })).describe("One entry per English line, same i"),
});

/** Strings per request: big menus go in several calls so no answer runs out of room. */
const BATCH = 120;

/**
 * Full-site Spanish: translates every visible line of the built site (headings, menu items, reviews, FAQ, buttons, footer…)
 * into Spanish. Returns English → Spanish; lines the model skipped are left out (they stay English until the next try).
 */
export async function translateStrings(
  client: Anthropic,
  input: { record: BusinessRecord; lines: string[]; model?: string },
): Promise<{ strings: Record<string, string>; usage: { input: number; output: number } }> {
  const r = input.record;
  const system = `You translate the text of a small local business website in ${r.address.city}, ${r.address.state} into natural, friendly Spanish for local Spanish-speaking customers (Mexican and Central American Spanish, "usted" form). You get numbered lines; each is one piece of text from the page (a heading, a button, a menu item, a sentence, sometimes a fragment of a sentence that continues around a link).
- Translate meaning, not word for word. Keep each line about as short as the English; buttons and menu labels stay short.
- Keep the business name (${r.name}), people's names, street and town names, brand names, prices, phone numbers, times and dish or product names that are names (like "Margherita", "Supreme") exactly as written; translate plain descriptions ("Cheese pizza" → "Pizza de queso").
- Keep the punctuation and capitalization style of each line, and a fragment stays a fragment.
- Never add facts, prices, promises or claims that aren't in the English.
- Return one entry per line with the same i.${
    r.category === "finance"
      ? `\n- This is a tax, accounting, insurance or financial office. Never use "notario" or "notario público" (say "servicio de notaría" for notary), never mention immigration or legal services, and never add refund, rate, savings or credential claims.`
      : ""
  }`;
  const strings: Record<string, string> = {};
  const usage = { input: 0, output: 0 };
  const batches: string[][] = [];
  for (let start = 0; start < input.lines.length; start += BATCH) batches.push(input.lines.slice(start, start + BATCH));
  // A few at a time, so a long menu doesn't take minutes.
  for (let g = 0; g < batches.length; g += 4) {
    await Promise.all(
      batches.slice(g, g + 4).map(async (lines) => {
        const { data, usage: u } = await ask(
          client,
          input.model ?? "claude-sonnet-5-5",
          system,
          `<lines>\n${JSON.stringify(lines.map((en, i) => ({ i, en })), null, 1)}\n</lines>\n\nTranslate every line into Spanish.`,
          StringsSchema,
          Math.min(16000, 400 + lines.reduce((n, l) => n + Math.ceil(l.length / 2) + 20, 0)),
        );
        usage.input += u.input;
        usage.output += u.output;
        for (const it of data.items) {
          const en = lines[it.i];
          const es = it.es.trim();
          if (en && es) strings[en] = es;
        }
      }),
    );
  }
  if (r.category === "finance") {
    const bad = /\bnotario|inmigraci|abogad|reembolso (m[aá]ximo|garantizado|r[aá]pido)|garantiza|m[aá]s barat/i;
    for (const [en, es] of Object.entries(strings)) if (bad.test(es)) delete strings[en];
  }
  return { strings, usage };
}
