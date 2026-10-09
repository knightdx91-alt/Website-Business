import { FONTS, type FontId } from "./fonts.ts";
import type { FontSpec } from "./themes.ts";

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";

/**
 * A font from the catalog (fonts.ts) at the given weights. Only installed fonts type-check, and a test checks each
 * weight file exists. Serif-style fonts fall back to Georgia, everything else to the system sans.
 */
export function f(id: FontId, weights: number[]): FontSpec {
  const meta = FONTS[id];
  return { family: meta.family, pkg: id, weights, fallback: meta.kind === "serif" ? SERIF : SANS };
}
