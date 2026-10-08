/** WCAG 2.x relative luminance and contrast helpers. Colors are "#rrggbb". */

function channels(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`Bad color "${hex}"; expected #rrggbb`);
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(rgb: [number, number, number]): string {
  return "#" + rgb.map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, "0")).join("");
}

export function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Mix toward black (amount > 0) or white (amount < 0). */
export function shade(hex: string, amount: number): string {
  const target = amount > 0 ? 0 : 255;
  const t = Math.abs(amount);
  return toHex(channels(hex).map((c) => c + (target - c) * t) as [number, number, number]);
}

export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = channels(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** The better of two candidate text colors on a background. */
export function bestText(bg: string, dark = "#111111", light = "#ffffff"): string {
  return contrast(dark, bg) >= contrast(light, bg) ? dark : light;
}

/**
 * Returns a version of `bg` that `fg` reaches `min` contrast on, by shading bg away from fg.
 * Keeps the hue; used to repair brand colors that fail AA as button backgrounds.
 */
export function repairBackground(bg: string, fg: string, min = 4.5): string {
  if (contrast(fg, bg) >= min) return bg;
  const darken = luminance(fg) > luminance(bg);
  for (let step = 1; step <= 40; step++) {
    const candidate = shade(bg, (darken ? 1 : -1) * step * 0.025);
    if (contrast(fg, candidate) >= min) return candidate;
  }
  throw new Error(`Cannot reach ${min}:1 for ${fg} on ${bg}`);
}
