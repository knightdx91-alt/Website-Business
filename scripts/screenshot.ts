/**
 * Serves each built site and screenshots it at the widths the owner will demo on (Galaxy Z Fold).
 *   tsx scripts/screenshot.ts <sitesDir> <shotsDir> [slug...]
 */
import { createServer } from "node:http";
import { mkdir, readdir, readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

const [sitesDir, shotsDir, ...only] = process.argv.slice(2);
if (!sitesDir || !shotsDir) throw new Error("usage: screenshot.ts <sitesDir> <shotsDir> [slug...]");

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".woff2": "font/woff2",
  ".jpg": "image/jpeg",
  ".png": "image/png",
};

async function serve(root: string) {
  const server = createServer(async (req, res) => {
    let path = normalize(decodeURIComponent((req.url ?? "/").split("?")[0]!)).replace(/^(\.\.[/\\])+/, "");
    let file = join(root, path);
    try {
      if ((await stat(file)).isDirectory()) file = join(file, "index.html");
      res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404).end("not found");
    }
  });
  await new Promise<void>((r) => server.listen(0, r));
  const port = (server.address() as { port: number }).port;
  return { url: `http://127.0.0.1:${port}`, close: () => server.close() };
}

const VIEWS = [
  { name: "fold-cover", width: 360, height: 780, full: true },
  { name: "fold-open", width: 884, height: 1000, full: false },
  { name: "desktop", width: 1280, height: 860, full: false },
];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
await mkdir(shotsDir, { recursive: true });
const slugs = only.length ? only : await readdir(sitesDir);
for (const slug of slugs) {
  const { url, close } = await serve(join(sitesDir, slug));
  for (const v of VIEWS) {
    const page = await browser.newPage({ viewport: { width: v.width, height: v.height }, deviceScaleFactor: 1 });
    await page.goto(`${url}/`, { waitUntil: "networkidle" });
    await page.screenshot({ path: join(shotsDir, `${slug}--${v.name}.png`), fullPage: v.full });
    await page.close();
  }
  const menuPage = await browser.newPage({ viewport: { width: 360, height: 780 } });
  const res = await menuPage.goto(`${url}/menu/`, { waitUntil: "networkidle" });
  if (res?.ok()) await menuPage.screenshot({ path: join(shotsDir, `${slug}--menu.png`), fullPage: true });
  await menuPage.close();
  close();
  console.log(`shot ${slug}`);
}
await browser.close();
