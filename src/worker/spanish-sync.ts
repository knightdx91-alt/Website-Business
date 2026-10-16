import Anthropic from "@anthropic-ai/sdk";
import { translateStrings } from "../copy/spanish.ts";
import { siteTexts } from "../generator/translate.ts";
import type { BusinessRecord, Copy } from "../generator/types.ts";
import { addUsage, MODEL_PRICES } from "./db.ts";
import type { Env } from "./env.ts";

/** Spanish lines per build at most (a huge price list waits for the next build for the rest). */
const MAX_NEW = 1500;
const MODEL = "claude-sonnet-5-5";

/** The English pages of a build (not the /es/ copies, not the 404). */
export function englishPages(files: Map<string, string | Uint8Array>): string[] {
  return [...files]
    .filter(([p, v]) => typeof v === "string" && p.endsWith(".html") && !p.startsWith("es/") && p !== "404.html")
    .map(([, v]) => v as string);
}

/** The lines of a build that have no Spanish yet. */
export function missingSpanish(record: BusinessRecord, copy: Copy, files: Map<string, string | Uint8Array>): string[] {
  const have = copy.es?.strings ?? {};
  return siteTexts(englishPages(files), [record.name]).filter((t) => !(t in have));
}

/**
 * A site with a Spanish page: translates every line of the just-built English pages that has no Spanish yet into
 * copy.es.strings (so the /es/ copy of every page is complete, and stays complete after edits, new sections, menu changes).
 * Returns true when it added lines (the caller builds again with them). Never throws: a failed translation leaves those
 * lines in English until the next build.
 */
export async function syncSpanish(env: Env, record: BusinessRecord, copy: Copy, files: Map<string, string | Uint8Array>): Promise<boolean> {
  if (!copy.es || !env.ANTHROPIC_API_KEY) return false;
  const current = siteTexts(englishPages(files), [record.name]);
  const have = copy.es.strings ?? {};
  const missing = current.filter((t) => !(t in have)).slice(0, MAX_NEW);
  if (!missing.length) return false;
  try {
    const { strings, usage } = await translateStrings(new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }), { record, lines: missing, model: MODEL });
    const price = MODEL_PRICES[MODEL] ?? MODEL_PRICES["claude-opus-5-5"]!;
    await addUsage(env, { aiIn: usage.input, aiOut: usage.output, costMicro: Math.round(usage.input * price.input + usage.output * price.output) });
    if (!Object.keys(strings).length) return false;
    let merged: Record<string, string> = { ...have, ...strings };
    // Old lines pile up as the text changes: once there are many, keep only what the site says now.
    if (Object.keys(merged).length > current.length + 300) {
      const now = new Set(current);
      merged = Object.fromEntries(Object.entries(merged).filter(([k]) => now.has(k)));
    }
    copy.es.strings = merged;
    return true;
  } catch (err) {
    console.error("Spanish translation failed", (err as Error).message);
    return false;
  }
}
