import { withAlpha } from "./color.ts";
import type { Theme } from "./themes.ts";

/** Shared pieces for layout CSS (layouts.ts and layouts-*.ts). */

/** Credit line for a hero photo that isn't under the overlay. */
export const SOLID_CREDIT = `.hero__credit{position:absolute;right:8px;bottom:6px;z-index:2;background:rgba(0,0,0,.62);color:#fff;padding:2px 8px;border-radius:4px}.hero__credit a{color:#fff}`;

/** In-flow hero image (not behind the text). */
export const INFLOW_MEDIA = `.hero--photo .hero__media{position:relative;inset:auto}.hero--photo .hero__media::after{display:none}`;

/** Hero text on the page background instead of the hero color. */
export const PLAIN_HERO = `.hero{background:var(--bg);color:var(--text)}.hero h1,.hero h2{color:var(--heading)}`;

/** A layout added beyond the first seven: its name and blurb for the app, and its CSS for a theme. */
export interface LayoutDef {
  name: string;
  about: string;
  css: (t: Theme, k: { line: string; alpha: (hex: string, a: number) => string }) => string;
}

export const kitFor = (t: Theme) => ({ line: withAlpha(t.colors.text, 0.18), alpha: withAlpha });
