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

if (!existsSync("app/public/icons/icon-512.png") || process.argv.includes("--icons")) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  await mkdir("app/public/icons", { recursive: true });
  const svg = (pad: number) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
    <rect width="512" height="512" fill="#14213d"/>
    <g transform="translate(${pad} ${pad}) scale(${(512 - 2 * pad) / 512})">
      <rect x="96" y="120" width="320" height="250" rx="28" fill="#ffffff"/>
      <rect x="96" y="120" width="320" height="58" rx="28" fill="#fca311"/>
      <rect x="96" y="150" width="320" height="28" fill="#fca311"/>
      <circle cx="132" cy="149" r="10" fill="#14213d"/><circle cx="164" cy="149" r="10" fill="#14213d"/>
      <rect x="128" y="210" width="170" height="22" rx="11" fill="#14213d"/>
      <rect x="128" y="250" width="250" height="16" rx="8" fill="#9aa3b5"/>
      <rect x="128" y="280" width="210" height="16" rx="8" fill="#9aa3b5"/>
      <rect x="128" y="318" width="110" height="30" rx="15" fill="#1d4ed8"/>
    </g></svg>`;
  for (const [name, size, pad] of [["icon-192.png", 192, 0], ["icon-512.png", 512, 0], ["icon-maskable-512.png", 512, 60]] as const) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(`<html><body style="margin:0">${svg(pad).replace('width="512" height="512"', `width="${size}" height="${size}"`)}</body></html>`);
    await page.screenshot({ path: `app/public/icons/${name}` });
    await page.close();
  }
  await browser.close();
  await writeFile("app/public/icons/.gitkeep", "");
  console.log("rendered icons");
}
