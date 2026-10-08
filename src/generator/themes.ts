import { bestText, contrast, luminance, repairBackground } from "./color.ts";
import { isLayout, type LayoutId } from "./layouts.ts";
import { MORE_LOOKS } from "./looks-more.ts";
import type { CategoryId } from "./types.ts";

export interface FontSpec {
  family: string;
  /** @fontsource package id, e.g. "zilla-slab". */
  pkg: string;
  weights: number[];
  fallback: string;
}

export interface Palette {
  bg: string;
  surface: string;
  band: string;
  text: string;
  muted: string;
  heading: string;
  link: string;
  primary: string;
  secondary: string;
  /** Decorative only (rules, stars, seals). Never carries text. */
  accent: string;
  heroBg: string;
  onHero: string;
  barBg: string;
  onBar: string;
  footerBg: string;
  onFooter: string;
  open: string;
  closed: string;
}

export interface Knobs {
  hero: "dark" | "light";
  divider: "none" | "rule" | "thick_rule";
  label: "none" | "uppercase" | "small_caps";
  card: "flat" | "shadow" | "bordered" | "ruled";
  badge: "stamp" | "seal" | "pill" | "plain" | "sticker";
  priceList: "leaders" | "cards";
  spacing: "airy" | "standard" | "dense";
}

export interface LookDef {
  id: string;
  name: string;
  category: CategoryId;
  palette: Palette;
  fonts: { heading: FontSpec; body: FontSpec };
  headingWeight: number;
  radius: number;
  button: "pill" | "rounded" | "square";
  knobs: Knobs;
  photoDirection: string;
  /** Page structure used when a site doesn't pick one. */
  layout?: LayoutId;
}

export interface Theme extends LookDef {
  layout: LayoutId;
  colors: Palette & { onPrimary: string; onSecondary: string; focus: string };
  contrastReport: Array<{ pair: string; ratio: number; min: number; ok: boolean }>;
}

const font = (family: string, pkg: string, weights: number[], fallback: string): FontSpec => ({ family, pkg, weights, fallback });
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";

export const LOOKS: Record<string, LookDef> = {
  "restaurant.pit_plank": {
    id: "restaurant.pit_plank",
    layout: "poster",
    name: "Pit & Plank",
    category: "restaurant",
    palette: {
      bg: "#F2E8D5", surface: "#FFFBF3", band: "#E8DAC0", text: "#1F1B18", muted: "#574F49", heading: "#1F1B18",
      link: "#8E2A16", primary: "#B5381F", secondary: "#1F1B18", accent: "#D4972F", heroBg: "#1F1B18", onHero: "#F2E8D5",
      barBg: "#1F1B18", onBar: "#F2E8D5", footerBg: "#1F1B18", onFooter: "#E8DAC0", open: "#2F6B2F", closed: "#8E2A16",
    },
    fonts: { heading: font("Alfa Slab One", "alfa-slab-one", [400], SERIF), body: font("Source Sans 3", "source-sans-3", [400, 700], SANS) },
    headingWeight: 400,
    radius: 2,
    button: "square",
    knobs: { hero: "dark", divider: "thick_rule", label: "uppercase", card: "ruled", badge: "stamp", priceList: "leaders", spacing: "standard" },
    photoDirection: "Close, warm, low side light; bark, char, wood, steam. Hands and pits over posed people.",
  },
  "restaurant.blue_plate": {
    id: "restaurant.blue_plate",
    layout: "soft",
    name: "Blue Plate",
    category: "restaurant",
    palette: {
      bg: "#FFF8EC", surface: "#FFFFFF", band: "#FCEFD6", text: "#23272E", muted: "#525863", heading: "#1E4F8A",
      link: "#1E4F8A", primary: "#D9483B", secondary: "#1E4F8A", accent: "#F3C969", heroBg: "#FCEFD6", onHero: "#23272E",
      barBg: "#1E4F8A", onBar: "#FFFFFF", footerBg: "#23272E", onFooter: "#F4EEE3", open: "#1F6B3A", closed: "#A8322A",
    },
    fonts: { heading: font("Archivo Black", "archivo-black", [400], SANS), body: font("Archivo", "archivo", [400, 700], SANS) },
    headingWeight: 400,
    radius: 14,
    button: "pill",
    knobs: { hero: "light", divider: "none", label: "none", card: "shadow", badge: "pill", priceList: "cards", spacing: "standard" },
    photoDirection: "Daylight, top-down plates on the table, real portions, a counter or booth behind.",
  },
  "restaurant.garden_table": {
    id: "restaurant.garden_table",
    layout: "editorial",
    name: "Garden Table",
    category: "restaurant",
    palette: {
      bg: "#F6F2EA", surface: "#FFFFFF", band: "#ECE5D8", text: "#2E2723", muted: "#5B524C", heading: "#2E2723",
      link: "#8A4430", primary: "#C2654A", secondary: "#4A6650", accent: "#6E8F72", heroBg: "#ECE5D8", onHero: "#2E2723",
      barBg: "#2E2723", onBar: "#F6F2EA", footerBg: "#2E2723", onFooter: "#ECE5D8", open: "#3D6B44", closed: "#8A4430",
    },
    fonts: { heading: font("Fraunces", "fraunces", [600], SERIF), body: font("DM Sans", "dm-sans", [400, 700], SANS) },
    headingWeight: 600,
    radius: 18,
    button: "pill",
    knobs: { hero: "light", divider: "none", label: "small_caps", card: "flat", badge: "plain", priceList: "leaders", spacing: "airy" },
    photoDirection: "Soft window light, shallow depth of field, pastries on linen or wood, cups from above.",
  },
  "restaurant.color_block": {
    id: "restaurant.color_block",
    layout: "split",
    name: "Color Block",
    category: "restaurant",
    palette: {
      bg: "#FBF6EF", surface: "#FFFFFF", band: "#FDE7B0", text: "#16323A", muted: "#3F5960", heading: "#0F3C44",
      link: "#0F3C44", primary: "#EF5B2B", secondary: "#0F3C44", accent: "#E2557F", heroBg: "#0F3C44", onHero: "#FBF6EF",
      barBg: "#0F3C44", onBar: "#FBF6EF", footerBg: "#0F3C44", onFooter: "#FBF6EF", open: "#1E6B3C", closed: "#A3301A",
    },
    fonts: {
      heading: font("Bricolage Grotesque", "bricolage-grotesque", [800], SANS),
      body: font("Nunito Sans", "nunito-sans", [400, 700], SANS),
    },
    headingWeight: 800,
    radius: 10,
    button: "rounded",
    knobs: { hero: "dark", divider: "none", label: "uppercase", card: "flat", badge: "sticker", priceList: "cards", spacing: "standard" },
    photoDirection: "High saturation, direct light, tight crops on food, steam and color. No stereotyped motifs.",
  },
  "contractor.toolbox": {
    id: "contractor.toolbox",
    layout: "split",
    name: "Toolbox",
    category: "contractor",
    palette: {
      bg: "#FFFFFF", surface: "#FFFFFF", band: "#E9E7E2", text: "#1F2933", muted: "#4A5560", heading: "#1F2933",
      link: "#2F4C66", primary: "#F2A900", secondary: "#1F2933", accent: "#F2A900", heroBg: "#1F2933", onHero: "#FFFFFF",
      barBg: "#1F2933", onBar: "#FFFFFF", footerBg: "#1F2933", onFooter: "#E9E7E2", open: "#1F6B3A", closed: "#A8322A",
    },
    fonts: {
      heading: font("Barlow Condensed", "barlow-condensed", [700], SANS),
      body: font("Source Sans 3", "source-sans-3", [400, 700], SANS),
    },
    headingWeight: 700,
    radius: 2,
    button: "square",
    knobs: { hero: "dark", divider: "thick_rule", label: "uppercase", card: "bordered", badge: "plain", priceList: "cards", spacing: "dense" },
    photoDirection: "Crew and truck in daylight, hands on tools and fittings, tight crops, slight cool grade.",
  },
  "contractor.front_porch": {
    id: "contractor.front_porch",
    layout: "overlap",
    name: "Front Porch",
    category: "contractor",
    palette: {
      bg: "#FBF5E9", surface: "#FFFFFF", band: "#F3E9D6", text: "#2B2622", muted: "#5A5149", heading: "#2E4A3B",
      link: "#9E3B2C", primary: "#9E3B2C", secondary: "#2E4A3B", accent: "#D49A3A", heroBg: "#F3E9D6", onHero: "#2B2622",
      barBg: "#2E4A3B", onBar: "#FFFFFF", footerBg: "#2E4A3B", onFooter: "#F3E9D6", open: "#2E6B3A", closed: "#9E3B2C",
    },
    fonts: { heading: font("Zilla Slab", "zilla-slab", [700], SERIF), body: font("Nunito Sans", "nunito-sans", [400, 700], SANS) },
    headingWeight: 700,
    radius: 12,
    button: "rounded",
    knobs: { hero: "light", divider: "none", label: "none", card: "shadow", badge: "seal", priceList: "cards", spacing: "airy" },
    photoDirection: "Owner and team in front of the shop or truck, homes with porches, warm late-day light.",
  },
  "contractor.clear_air": {
    id: "contractor.clear_air",
    layout: "minimal",
    name: "Clear Air",
    category: "contractor",
    palette: {
      bg: "#FFFFFF", surface: "#FFFFFF", band: "#EEF4F8", text: "#1D2B36", muted: "#4B5B68", heading: "#123E63",
      link: "#0E5F86", primary: "#1A9E8F", secondary: "#123E63", accent: "#E8664D", heroBg: "#EEF4F8", onHero: "#123E63",
      barBg: "#123E63", onBar: "#FFFFFF", footerBg: "#123E63", onFooter: "#EEF4F8", open: "#18705F", closed: "#B03A22",
    },
    fonts: { heading: font("Manrope", "manrope", [800], SANS), body: font("Figtree", "figtree", [400, 700], SANS) },
    headingWeight: 800,
    radius: 16,
    button: "pill",
    knobs: { hero: "light", divider: "none", label: "uppercase", card: "shadow", badge: "pill", priceList: "cards", spacing: "airy" },
    photoDirection: "Bright interiors, technician at an outdoor unit or panel, clean close-ups, light grade.",
  },
  "contractor.ridgeline": {
    id: "contractor.ridgeline",
    layout: "poster",
    name: "Ridgeline",
    category: "contractor",
    palette: {
      bg: "#FFFFFF", surface: "#FFFFFF", band: "#F3F0EA", text: "#23272B", muted: "#4E555C", heading: "#23272B",
      link: "#2F5D7A", primary: "#B4652E", secondary: "#23272B", accent: "#8DAFC4", heroBg: "#23272B", onHero: "#FFFFFF",
      barBg: "#23272B", onBar: "#FFFFFF", footerBg: "#23272B", onFooter: "#F3F0EA", open: "#2E6B3A", closed: "#A8322A",
    },
    fonts: {
      heading: font("Big Shoulders Display", "big-shoulders-display", [800], SANS),
      body: font("Public Sans", "public-sans", [400, 700], SANS),
    },
    headingWeight: 800,
    radius: 4,
    button: "rounded",
    knobs: { hero: "dark", divider: "rule", label: "uppercase", card: "bordered", badge: "plain", priceList: "cards", spacing: "standard" },
    photoDirection: "Wide shots of finished roofs against the sky, crews on pitch with safety gear.",
  },  ...MORE_LOOKS,
};

/**
 * Resolves a look into a buildable theme: picks button label colors, repairs brand colors
 * that would fail WCAG AA, then checks every text/background pair the components use.
 */
export function resolveTheme(designId: string): Theme {
  const { look: lookId, layout } = parseDesign(designId);
  const look = LOOKS[lookId];
  if (!look) throw new Error(`Unknown look "${lookId}"`);
  const p = { ...look.palette };

  // Dark label candidate: the theme's text color on light themes, near-black on dark themes.
  const darkLabel = luminance(p.text) < 0.2 ? p.text : "#111111";
  const onPrimary = bestText(p.primary, darkLabel, "#FFFFFF");
  p.primary = repairBackground(p.primary, onPrimary);
  const onSecondary = bestText(p.secondary, darkLabel, "#FFFFFF");
  p.secondary = repairBackground(p.secondary, onSecondary);

  const colors = { ...p, onPrimary, onSecondary, focus: p.link };
  const pairs: Array<[string, string, string, number]> = [
    ["text on bg", colors.text, colors.bg, 4.5],
    ["text on surface", colors.text, colors.surface, 4.5],
    ["text on band", colors.text, colors.band, 4.5],
    ["muted on bg", colors.muted, colors.bg, 4.5],
    ["muted on band", colors.muted, colors.band, 4.5],
    ["heading on bg", colors.heading, colors.bg, 4.5],
    ["heading on band", colors.heading, colors.band, 4.5],
    ["link on bg", colors.link, colors.bg, 4.5],
    ["link on surface", colors.link, colors.surface, 4.5],
    ["button label on primary", colors.onPrimary, colors.primary, 4.5],
    ["button label on secondary", colors.onSecondary, colors.secondary, 4.5],
    ["text on hero", colors.onHero, colors.heroBg, 4.5],
    ["text on action bar", colors.onBar, colors.barBg, 4.5],
    ["text on footer", colors.onFooter, colors.footerBg, 4.5],
    ["open status on surface", colors.open, colors.surface, 4.5],
    ["closed status on surface", colors.closed, colors.surface, 4.5],
    ["focus ring on bg", colors.focus, colors.bg, 3],
    ["primary button on bg", colors.primary, colors.bg, 1],
  ];
  const contrastReport = pairs.map(([pair, fg, bg, min]) => {
    const ratio = Math.round(contrast(fg, bg) * 100) / 100;
    return { pair, ratio, min, ok: ratio >= min };
  });
  const failing = contrastReport.filter((r) => !r.ok);
  if (failing.length) {
    throw new Error(`Look ${lookId} fails contrast: ${failing.map((f) => `${f.pair} ${f.ratio}:1`).join(", ")}`);
  }
  return { ...look, layout: layout ?? look.layout ?? "classic", colors, contrastReport };
}

/** A site's design is "<look>" or "<look>~<layout>", e.g. "contractor.toolbox~editorial". */
export function parseDesign(designId: string): { look: string; layout?: LayoutId } {
  const [look, layout] = designId.split("~");
  return { look: look!, layout: isLayout(layout) ? layout : undefined };
}

export function designId(look: string, layout?: LayoutId): string {
  return layout ? `${look}~${layout}` : look;
}

export function looksFor(category: CategoryId): string[] {
  return Object.values(LOOKS)
    .filter((l) => l.category === category)
    .map((l) => l.id);
}
