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
