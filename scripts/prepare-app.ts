/** Copies every font the site looks use into the app's static assets, and renders the app icons. */
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { LOOKS } from "../src/generator/themes.ts";
import { fontFilesFor } from "../src/generator/render.ts";

const FONT_DIR = "app/public/fonts";
await mkdir(FONT_DIR, { recursive: true });
const files = new Map<string, string>();
for (const id of Object.keys(LOOKS)) for (const f of fontFilesFor(id)) files.set(f.file, f.pkg);
for (const [file, pkg] of files) await copyFile(`node_modules/@fontsource/${pkg}/files/${file}`, `${FONT_DIR}/${file}`);
console.log(`copied ${files.size} font files`);

// App icons and the badge PNGs are rendered by `npx tsx scripts/brand.ts` (from src/brand/logo.ts) and committed.
