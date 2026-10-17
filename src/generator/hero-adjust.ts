import type { BusinessRecord } from "./types.ts";

/** The opening's fine positions (words, photo, tint), from the sliders or the older three-step settings. */
export interface HeroAdjust {
  /** px the words move down; negative moves them up. */
  move: number;
  /** % of the photo's own height it slides down; negative slides it up. */
  shift: number;
  /** The tint's strength, 10–100 (100 = as designed). */
  shade: number;
}

export const HERO_ADJUST_RANGE = { move: { min: -60, max: 400, step: 2 }, shift: { min: -40, max: 80, step: 1 }, shade: { min: 10, max: 100, step: 5 } } as const;

const LEGACY_MOVE = { up: -30, down: 140, down2: 260 } as const;
const LEGACY_SHIFT = { up: -18, down: 22, down2: 42 } as const;
const LEGACY_SHADE = { lighter: 60, lightest: 30 } as const;

const clamp = (n: number, k: keyof typeof HERO_ADJUST_RANGE) => Math.min(HERO_ADJUST_RANGE[k].max, Math.max(HERO_ADJUST_RANGE[k].min, Math.round(n)));

export function heroAdjustOf(r: Pick<BusinessRecord, "heroAdjust" | "heroMove" | "heroShift" | "heroShade">): HeroAdjust {
  const a = r.heroAdjust ?? {};
  return {
    move: clamp(a.move ?? (r.heroMove ? LEGACY_MOVE[r.heroMove] : 0), "move"),
    shift: clamp(a.shift ?? (r.heroShift ? LEGACY_SHIFT[r.heroShift] : 0), "shift"),
    shade: clamp(a.shade ?? (r.heroShade ? LEGACY_SHADE[r.heroShade] : 100), "shade"),
  };
}

/** `<html>` attributes for the page: CSS variables plus the flags the rules key on (also set live by the preview's sliders). */
export function heroAdjustAttrs(a: HeroAdjust): string {
  if (!a.move && !a.shift && a.shade === 100) return "";
  return ` data-hadj${a.shift > 0 ? ' data-hshift="down"' : ""}${a.shade < 100 ? ' data-hshade="1"' : ""} style="--hmove:${a.move}px;--hshift:${a.shift}%;--hshade:${a.shade / 100}"`;
}
