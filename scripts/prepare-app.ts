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

// The service worker's cache name follows the app shell's content, so every deploy that changes the shell makes phones
// drop the old cached copy (the app itself also watches /app.js's ETag and reloads; see checkForUpdate in app.js).
{
  const { createHash } = await import("node:crypto");
  const { readFile } = await import("node:fs/promises");
  const h = createHash("sha1");
  for (const f of ["app/public/index.html", "app/public/app.js", "app/public/app.css"]) h.update(await readFile(f));
  const version = `v-${h.digest("hex").slice(0, 10)}`;
  const sw = await readFile("app/public/sw.js", "utf8");
  const next = sw.replace(/^const VERSION = "[^"]*";/m, `const VERSION = "${version}";`);
  if (next !== sw) {
    await writeFile("app/public/sw.js", next);
    console.log(`service worker cache ${version}`);
  }
}
