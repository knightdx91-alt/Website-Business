/**
 * Builds the made-up example sites (src/examples/examples.ts) into app/public/examples/<slug>/, screenshots each at
 * phone size for the company website, and renders the company link preview image (app/public/og.png).
 *   npm run prepare:app && npm run examples
 * Fonts come from the app's /fonts/ (prepare:app), so examples don't carry their own copies.
 */
import { createServer } from "node:http";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { chromium } from "playwright";
import { EXAMPLES } from "../src/examples/examples.ts";
import { buildSite } from "../src/generator/render.ts";

const OUT = "app/public/examples";
const SKIP = new Set(["robots.txt", "sitemap.xml", "_headers"]);

const banner = `<div class="wb-example" style="position:relative;z-index:60;background:#14213d;color:#fff;font:600 14px/1.4 system-ui,sans-serif;padding:10px 16px;text-align:center">Example website by Underground Associates. Not a real business. <a href="https://undergroundassociates.com/#contact" style="color:#fca311">Get a free preview of yours</a></div>`;

await rm(OUT, { recursive: true, force: true });
for (const ex of EXAMPLES) {
  const base = `/examples/${ex.slug}`;
  const out = await buildSite({
    record: ex.record,
    copy: ex.copy,
    site: { slug: ex.slug, look: ex.design, origin: `https://undergroundassociates.com${base}` },
    mode: "publish",
    formEndpoint: "/examples/form",
    basePath: base,
  });
  for (const [path, content] of out.files) {
    if (SKIP.has(path) || typeof content !== "string") continue;
    let text = content.split(`${base}/assets/fonts/`).join("/fonts/");
    if (path.endsWith(".html")) text = text.replace("<head>", '<head><meta name="robots" content="noindex">').replace(/<body([^>]*)>/, `<body$1>${banner}`);
    const file = join(OUT, ex.slug, path);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, text);
  }
  console.log(`built ${ex.slug} (${ex.design})${out.lint.warnings.length ? `: ${out.lint.warnings.join("; ")}` : ""}`);
}

const TYPES: Record<string, string> = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".woff2": "font/woff2", ".png": "image/png", ".jpg": "image/jpeg" };
const server = createServer(async (req, res) => {
  let file = join("app/public", normalize(decodeURIComponent((req.url ?? "/").split("?")[0]!)).replace(/^(\.\.[/\\])+/, ""));
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

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" }).catch(() => chromium.launch());
for (const ex of EXAMPLES) {
  const page = await browser.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
  // A Tuesday at 10:30 AM in Cullman, so every example shows "Open now".
  await page.clock.setFixedTime(new Date("2026-10-06T15:30:00Z"));
  await page.goto(`${origin}/examples/${ex.slug}/`, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: ".wb-example{display:none!important}" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(OUT, `${ex.slug}.jpg`), type: "jpeg", quality: 72 });
  await page.close();
}

// Link preview for undergroundassociates.com (texts, Facebook): 1200x630.
const og = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await og.goto(`${origin}/examples/${EXAMPLES[0]!.slug}/`);
const shots = EXAMPLES.slice(0, 3).map((e) => `/examples/${e.slug}.jpg`);
await og.setContent(`<html><head><style>
@font-face{font-family:B;src:url(${origin}/fonts/bricolage-grotesque-latin-800-normal.woff2)}
body{margin:0;width:1200px;height:630px;background:#14213d;color:#fff;font-family:system-ui,sans-serif;display:flex;align-items:center;overflow:hidden}
.t{padding:0 0 0 70px;width:560px}.t p{color:#fca311;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin:0 0 18px}
.t h1{font:800 64px/1.02 B,system-ui;margin:0 0 22px}.t h1 span{color:#fca311}.t div{font-size:26px;color:#dfe4ee}
.s{display:flex;gap:18px;transform:rotate(-6deg);margin-left:10px}.s img{width:200px;border-radius:18px;border:6px solid #fff;box-shadow:0 20px 40px rgba(0,0,0,.4)}
.s img:nth-child(2){margin-top:60px}</style></head><body>
<div class="t"><p>Underground Associates</p><h1>See your new website <span>before you pay.</span></h1><div>Websites for Cullman-area businesses</div></div>
<div class="s">${shots.map((s) => `<img src="${origin}${s}">`).join("")}</div></body></html>`);
await og.waitForLoadState("networkidle");
await og.evaluate(() => document.fonts.ready);
await og.screenshot({ path: "app/public/og.png" });
await browser.close();
server.close();
console.log(`screenshots + og.png done`);
