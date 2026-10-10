/**
 * Renders every brand asset from src/brand/logo.ts:
 *   app/public/brand/logo-{192,512,1024}.png   the badge on a transparent background (website header, favicon, Facebook)
 *   app/public/icons/icon-*.png                 app icons (maskable one gets navy padding)
 *   <out>/…                                     marketing set: Google Ads logos (square + 4:1, white + navy), Facebook profile
 * Usage: npx tsx scripts/brand.ts [outDir] [--compare]   (--compare also writes a side-by-side with the original PNG)
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { lockupSvg, logoSvg, NAVY } from "../src/brand/logo.ts";

const out = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "app/public/brand";
const compare = process.argv.includes("--compare");
await mkdir(out, { recursive: true });
await mkdir("app/public/brand", { recursive: true });
await mkdir("app/public/icons", { recursive: true });

const font = async (f: string) => `data:font/woff2;base64,${(await readFile(`node_modules/@fontsource/montserrat/files/${f}`)).toString("base64")}`;
const FONT_CSS = `@font-face{font-family:Montserrat;font-weight:800;src:url(${await font("montserrat-latin-800-normal.woff2")})}
@font-face{font-family:Montserrat;font-weight:700;src:url(${await font("montserrat-latin-700-normal.woff2")})}`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
async function render(svg: string, w: number, h: number, file: string, transparent = false) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.setContent(`<html><head><style>${FONT_CSS} html,body{margin:0;background:${transparent ? "transparent" : "#fff"}} svg{display:block}</style></head><body>${svg}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(100);
  await page.screenshot({ path: file, omitBackground: transparent, type: file.endsWith(".jpg") ? "jpeg" : "png", ...(file.endsWith(".jpg") ? { quality: 92 } : {}) });
  await page.close();
}

// Site + app assets (committed).
for (const s of [192, 512, 1024]) await render(logoSvg({ bg: "disc", size: s }), s, s, `app/public/brand/logo-${s}.png`, true);
await writeFile("app/public/brand/logo.svg", logoSvg({ bg: "disc" }));
await render(logoSvg({ bg: "navy", size: 192, pad: 0 }), 192, 192, "app/public/icons/icon-192.png");
await render(logoSvg({ bg: "navy", size: 512, pad: 0 }), 512, 512, "app/public/icons/icon-512.png");
await render(logoSvg({ bg: "navy", size: 512, pad: 64 }), 512, 512, "app/public/icons/icon-maskable-512.png");

// Marketing set.
await render(logoSvg({ bg: "white", size: 1200, pad: 56 }), 1200, 1200, `${out}/google-logo-square-white.png`);
await render(logoSvg({ bg: "navy", size: 1200, pad: 56 }), 1200, 1200, `${out}/google-logo-square-navy.png`);
await render(lockupSvg({ bg: "white" }), 1200, 300, `${out}/google-logo-wide-white.png`);
await render(lockupSvg({ bg: "navy" }), 1200, 300, `${out}/google-logo-wide-navy.png`);
await render(logoSvg({ bg: "navy", size: 1024, pad: 40 }), 1024, 1024, `${out}/facebook-profile-1024.png`);

if (compare) {
  const orig = `data:image/png;base64,${(await readFile("app/public/brand/logo-original-512.png")).toString("base64")}`;
  await render(`<div style="display:flex;gap:24px;padding:24px;background:#777"><img src="${orig}" width="512" height="512">${logoSvg({ bg: "disc", size: 512 })}</div>`, 1096, 560, `${out}/compare.png`);
}
await browser.close();
console.log(`brand assets written to app/public/brand, app/public/icons and ${out}`);
