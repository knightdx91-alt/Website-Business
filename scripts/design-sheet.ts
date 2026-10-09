/**
 * Builds the example business for each design and screenshots it, for checking new looks and layouts by eye.
 *   npx tsx scripts/design-sheet.ts <outDir> <design>[,<design>...] [--no-photo]
 * A design is "<look>" or "<look>~<layout>". Writes <outDir>/<design>--phone.png (full page, 390 wide),
 * <outDir>/<design>--desktop.png (1280x900, top of page) and <outDir>/sheet-phone.png / sheet-desktop.png
 * (all designs side by side, scaled down) so a whole batch can be reviewed in one image.
 */
import { createServer } from "node:http";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { chromium } from "playwright";
import { EXAMPLES } from "../src/examples/examples.ts";
import { buildSite } from "../src/generator/render.ts";
import { parseDesign, LOOKS } from "../src/generator/themes.ts";

const [outArg, list, ...flags] = process.argv.slice(2);
if (!outArg || !list) throw new Error("usage: design-sheet.ts <outDir> <design>[,<design>...] [--no-photo]");
const outDir: string = outArg;
const photo = !flags.includes("--no-photo");
const designs = list.split(",").map((d) => d.trim()).filter(Boolean);
const sites = join(outDir, "sites");
await rm(sites, { recursive: true, force: true });
await mkdir(sites, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" }).catch(() => chromium.launch());

// A made-up "photo": warm sky, hills and a building, so overlays and photo crops look realistic.
const art = await browser.newPage({ viewport: { width: 1600, height: 1067 } });
await art.setContent(`<body style="margin:0;width:1600px;height:1067px;overflow:hidden;background:linear-gradient(180deg,#f3c58b 0%,#e98f5a 38%,#6d5a7a 62%,#2f3b45 100%);position:relative">
<div style="position:absolute;left:-100px;right:-100px;bottom:-200px;height:620px;border-radius:50%;background:#3d5a3a"></div>
<div style="position:absolute;left:620px;bottom:180px;width:520px;height:330px;background:#c8b49a"></div>
<div style="position:absolute;left:580px;bottom:500px;width:600px;height:0;border-left:300px solid transparent;border-right:300px solid transparent;border-bottom:150px solid #7a3b2e"></div>
<div style="position:absolute;left:820px;bottom:180px;width:120px;height:190px;background:#4a3326"></div>
<div style="position:absolute;left:680px;bottom:330px;width:100px;height:90px;background:#f7e3a6"></div><div style="position:absolute;left:990px;bottom:330px;width:100px;height:90px;background:#f7e3a6"></div>
<div style="position:absolute;left:180px;bottom:220px;width:160px;height:300px;border-radius:50% 50% 10px 10px;background:#2c4a2b"></div></body>`);
const heroJpg = await art.screenshot({ type: "jpeg", quality: 70 });
await art.close();

const TYPES: Record<string, string> = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".jpg": "image/jpeg", ".png": "image/png" };
const server = createServer(async (req, res) => {
  let file = join(sites, normalize(decodeURIComponent((req.url ?? "/").split("?")[0]!)).replace(/^(\.\.[/\\])+/, ""));
  try {
    if ((await stat(file)).isDirectory()) file = join(file, "index.html");
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise<void>((r) => server.listen(0, r));
const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;

const shots: Array<{ design: string; phone: string; desktop: string }> = [];
for (const design of designs) {
  const look = LOOKS[parseDesign(design).look];
  if (!look) throw new Error(`Unknown look in ${design}`);
  const ex = EXAMPLES.find((e) => e.record.category === look.category)!;
  const record = structuredClone(ex.record);
  if (photo) record.media.hero = { src: "/assets/img/hero.jpg", alt: "The shop at sunset", source: "owner", width: 1600, height: 1067 };
  const slug = design.replace(/[^a-z0-9]+/gi, "-");
  const base = `/${slug}`;
  const out = await buildSite({
    record, copy: ex.copy, site: { slug, look: design, origin: `https://example.com${base}` }, mode: "publish", formEndpoint: "/form", basePath: base,
    loadFont: (pkg, file) => readFile(`node_modules/@fontsource/${pkg}/files/${file}`),
  });
  if (out.lint.errors.length) console.log(`LINT ${design}: ${JSON.stringify(out.lint.errors)}`);
  for (const [path, content] of out.files) {
    const file = join(sites, slug, path);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, content);
  }
  if (photo) {
    await mkdir(join(sites, slug, "assets/img"), { recursive: true });
    await writeFile(join(sites, slug, "assets/img/hero.jpg"), heroJpg);
  }
  const phone = join(outDir, `${slug}--phone.png`);
  const desktop = join(outDir, `${slug}--desktop.png`);
  const p = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await p.clock.setFixedTime(new Date("2026-10-06T15:30:00Z"));
  await p.goto(`${origin}${base}/`, { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  const h = await p.evaluate(() => document.documentElement.scrollHeight);
  const wide = async (w: number) => {
    const sw = await p.evaluate(() => document.documentElement.scrollWidth);
    if (sw > w) console.log(`OVERFLOW ${design}: page is ${sw}px wide at ${w}px`);
  };
  await wide(390);
  await p.screenshot({ path: phone, fullPage: true, clip: { x: 0, y: 0, width: 390, height: Math.min(h, 4200) } });
  await p.setViewportSize({ width: 1280, height: 900 });
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(150);
  await wide(1280);
  await p.screenshot({ path: desktop, fullPage: false });
  await p.close();
  shots.push({ design, phone, desktop });
  console.log(`shot ${design}`);
}

async function sheet(kind: "phone" | "desktop", width: number) {
  const imgs = await Promise.all(shots.map(async (s) => ({ design: s.design, data: (await readFile(s[kind])).toString("base64") })));
  const cols = kind === "phone" ? Math.min(imgs.length, 6) : Math.min(imgs.length, 3);
  const page = await browser.newPage({ viewport: { width: cols * (width + 16) + 16, height: 400 } });
  await page.setContent(`<body style="margin:0;padding:8px;background:#888;font:600 13px system-ui;display:grid;grid-template-columns:repeat(${cols},${width}px);gap:16px;align-items:start">${imgs
    .map((i) => `<figure style="margin:0"><figcaption style="color:#fff;padding:4px 0">${i.design}</figcaption><img style="width:${width}px;display:block" src="data:image/png;base64,${i.data}"></figure>`)
    .join("")}</body>`);
  await page.screenshot({ path: join(outDir, `sheet-${kind}.png`), fullPage: true });
  await page.close();
}
await sheet("phone", 260);
await sheet("desktop", 560);
await browser.close();
server.close();
console.log(`sheets in ${outDir}`);
