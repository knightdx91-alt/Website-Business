/**
 * Quick check of one category's looks while writing them: count, duplicate names / heading fonts / colors,
 * missing font weights and contrast failures.   npx tsx scripts/check-looks.ts <category>
 */
import { existsSync } from "node:fs";
import { FONTS } from "../src/generator/fonts.ts";
import { LOOKS, looksFor, resolveTheme } from "../src/generator/themes.ts";
import type { CategoryId } from "../src/generator/types.ts";

const category = process.argv[2] as CategoryId;
const looks = looksFor(category).map((id) => LOOKS[id]!);
const problems: string[] = [];
const dup = (label: string, key: (l: (typeof looks)[number]) => string) => {
  const seen = new Map<string, string>();
  for (const l of looks) {
    const k = key(l);
    if (seen.has(k)) problems.push(`same ${label} (${k}): ${seen.get(k)} and ${l.id}`);
    else seen.set(k, l.id);
  }
};
dup("name", (l) => l.name);
dup("heading font", (l) => l.fonts.heading.pkg);
dup("bg+primary", (l) => `${l.palette.bg}|${l.palette.primary}`);
for (const l of looks) {
  try {
    resolveTheme(l.id);
  } catch (e) {
    problems.push((e as Error).message);
  }
  for (const font of [l.fonts.heading, l.fonts.body]) {
    if (!(font.pkg in FONTS)) problems.push(`${l.id}: unknown font ${font.pkg}`);
    for (const w of font.weights) if (!existsSync(`node_modules/@fontsource/${font.pkg}/files/${font.pkg}-latin-${w}-normal.woff2`)) problems.push(`${l.id}: ${font.pkg} has no weight ${w}`);
  }
  if (!l.fonts.heading.weights.includes(l.headingWeight)) problems.push(`${l.id}: headingWeight ${l.headingWeight} not loaded`);
}
console.log(`${category}: ${looks.length} looks (want 25)`);
console.log(problems.length ? problems.join("\n") : "no problems");
