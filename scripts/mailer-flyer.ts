/**
 * The mail-out / leave-behind flyer (Oct 2026): one Letter page with a white box for the business's 5-digit flyer code
 * (handwritten), the address to type it at (undergroundassociates.com/code), a QR code to that page, and how to reach us.
 *   npx tsx scripts/mailer-flyer.ts [--example <slug>] [--phone 256-636-5886] [--from 49] [--out app/public/flyers] [--png <file>]
 * Writes <out>/mailer.pdf (served at /flyers/mailer.pdf, linked from Settings on web + Android).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import qrcode from "qrcode-generator";

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const phone = opt("phone", "256-636-5886");
const from = opt("from", "49");
const outDir = opt("out", "app/public/flyers");
const png = args.includes("--png") ? opt("png", "") : "";
const SITE = "undergroundassociates.com/code";

function qrSvg(text: string): string {
  const q = qrcode(0, "M");
  q.addData(text);
  q.make();
  const n = q.getModuleCount();
  let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 ${n + 4} ${n + 4}" shape-rendering="crispEdges"><rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" fill="#fff"/><path d="${d}" fill="${NAVY}"/></svg>`;
}

const font = async (pkg: string, w: number) => (await readFile(`node_modules/@fontsource/${pkg}/files/${pkg}-latin-${w}-normal.woff2`)).toString("base64");
// Print colors (Oct 2026): the brand navy #14213d printed as charcoal gray on an office printer, and the logo's thin gold
// ring nearly vanished. Paper gets a brighter navy that stays blue, a deeper gold, and a bolder ring on a larger logo.
const NAVY = opt("navy", "#1d3d8f");
const GOLD = opt("gold", "#f59e0b");
const logo = (await readFile("app/public/brand/logo.svg", "utf8"))
  .replace(/<\?xml[^>]*>/, "")
  .replaceAll("#14213d", NAVY)
  .replaceAll("#fca311", GOLD)
  .replace('stroke-width="8"', 'stroke-width="18"')
  .replace(/r="7" fill/g, 'r="12" fill')
  .replace('height="11" rx="5.5"', 'height="16" rx="8"');
const example = opt("example", "green-acre-lawn");
const shot = (await readFile(`app/public/examples/${example}.jpg`)).toString("base64");

const css = `
@font-face{font-family:B;font-weight:800;src:url(data:font/woff2;base64,${await font("bricolage-grotesque", 800)})}
@font-face{font-family:M;font-weight:700;src:url(data:font/woff2;base64,${await font("montserrat", 700)})}
@font-face{font-family:M;font-weight:800;src:url(data:font/woff2;base64,${await font("montserrat", 800)})}
@font-face{font-family:I;font-weight:400;src:url(data:font/woff2;base64,${await font("inter", 400)})}
@font-face{font-family:I;font-weight:600;src:url(data:font/woff2;base64,${await font("inter", 600)})}
@page{size:8.5in 11in;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:8.5in;height:11in}
body{font:400 13pt/1.4 I,sans-serif;color:${NAVY};background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{position:relative;width:8.5in;height:11in;overflow:hidden;display:flex;flex-direction:column}
.top{flex:none;background:${NAVY};color:#fff;padding:.32in .55in .32in;position:relative;overflow:hidden}
.top:after{display:none}
.brand{display:flex;align-items:center;gap:.14in;font:800 13pt/1 M,sans-serif;letter-spacing:.04em;text-transform:uppercase}
.brand svg{width:.85in;height:.85in;flex:none}
.brand small{display:block;font:600 9.5pt/1.3 I,sans-serif;letter-spacing:0;text-transform:none;opacity:.8;margin-top:3px}
h1{font:800 38pt/1.0 B,sans-serif;letter-spacing:-.02em;margin-top:.18in;max-width:5.1in;position:relative;z-index:1}
h1 em{font-style:normal;color:${GOLD}}
.sub{font:600 14pt/1.35 I,sans-serif;margin-top:.14in;max-width:4.9in;opacity:.92;position:relative;z-index:1}
.phone{position:absolute;right:.6in;top:.75in;width:1.7in;height:2.9in;border-radius:.32in;background:#0b1222;padding:.09in;box-shadow:0 .15in .35in rgba(0,0,0,.35);transform:rotate(4deg);z-index:2}
.phone img{width:100%;height:100%;object-fit:cover;object-position:top;border-radius:.24in;display:block}
.phone span{position:absolute;left:-.3in;right:-.3in;bottom:-.22in;text-align:center;font:600 8.5pt/1 I,sans-serif;color:#c3cbd9;transform:rotate(-4deg)}
.main{flex:1;padding:.26in .55in .12in;display:flex;flex-direction:column}
.cta{font:800 19pt/1.15 M,sans-serif;max-width:4.6in}
.steps{display:grid;grid-template-columns:1fr 1.55in;gap:.32in;margin-top:.16in;align-items:start}
.step{display:flex;gap:.16in;align-items:flex-start;margin-bottom:.14in}
.n{flex:none;width:.42in;height:.42in;border-radius:50%;background:${GOLD};color:${NAVY};font:800 15pt/.42in M,sans-serif;text-align:center}
.step p{font:600 13pt/1.3 I,sans-serif;padding-top:.06in}
.url{display:block;font:800 19pt/1.1 M,sans-serif;color:${NAVY};margin-top:.05in;letter-spacing:-.01em}
.codebox{margin-top:.08in;border:3.5pt solid ${NAVY};border-radius:.16in;background:#fff;height:1.2in;width:4.5in;display:flex;align-items:flex-end;justify-content:space-around;padding:0 .25in .26in;box-shadow:.08in .08in 0 ${GOLD}}
.codebox i{display:block;width:.62in;border-bottom:2.5pt solid #b9c1cf}
.qr{text-align:center;font:600 9pt/1.3 I,sans-serif;color:#41506b}
.qr svg{width:1.55in;height:1.55in;display:block;margin-bottom:.06in;border:2pt solid #e3e7ee;border-radius:.1in}
.get{margin-top:.26in;background:#f4f6fa;border-radius:.18in;padding:.2in .26in;display:grid;grid-template-columns:1fr 1fr;gap:.07in .3in}
.get h2{grid-column:1/-1;font:800 13pt/1.2 M,sans-serif;margin-bottom:.04in}
.get li{list-style:none;font:600 11pt/1.3 I,sans-serif;padding-left:.24in;position:relative}
.get li:before{content:"";position:absolute;left:0;top:.04in;width:.13in;height:.13in;border-radius:50%;background:${GOLD}}
.price{grid-column:1/-1;font:600 10.5pt/1.35 I,sans-serif;color:#41506b;margin-top:.06in}
.price b{color:${NAVY}}
.foot{flex:none;background:${GOLD};color:${NAVY};padding:.22in .55in;display:flex;justify-content:space-between;align-items:center;gap:.3in}
.foot strong{font:800 17pt/1.1 M,sans-serif;display:block}
.foot span{font:600 10.5pt/1.35 I,sans-serif}
.foot .r{text-align:right}
`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body><div class="page">
<section class="top">
  <div class="brand">${logo}<div>Underground Associates<small>Websites for Cullman County businesses</small></div></div>
  <h1>We already built your business a <em>website.</em></h1>
  <p class="sub">It's finished and waiting for you to look. Free to see, nothing to sign, no obligation.</p>
  <div class="phone"><img src="data:image/jpeg;base64,${shot}" alt=""><span>An example of our work</span></div>
</section>
<section class="main">
  <p class="cta">Check out your sample website by entering your code:</p>
  <div class="steps">
    <div>
      <div class="step"><div class="n">1</div><p>On your phone or computer, go to<span class="url">${SITE}</span></p></div>
      <div class="step"><div class="n">2</div><p>Type in your 5-digit code:</p></div>
      <div class="codebox" aria-label="Your code"><i></i><i></i><i></i><i></i><i></i></div>
    </div>
    <div class="qr">${qrSvg(`https://${SITE}`)}Or point your phone's camera here</div>
  </div>
  <ul class="get">
    <h2>What your website does for you</h2>
    <li>Looks great on phones</li>
    <li>Helps you show up on Google</li>
    <li>Tap to call and get directions</li>
    <li>Your hours, services and photos</li>
    <li>We make changes for you</li>
    <li>Local people, right here in Cullman</li>
    <p class="price">Like it? Plans start at <b>$${from} a month</b>, with no setup fee on a 6- or 12-month plan. You only pay if you want it.</p>
  </ul>
</section>
<footer class="foot">
  <div><strong>Like what you see? Call or text us.</strong><span>We'll make any changes before it goes live.</span></div>
  <div class="r"><strong>${phone}</strong><span>undergroundassociates.com</span></div>
</footer>
</div></body></html>`;

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" }).catch(() => chromium.launch());
const page = await browser.newPage({ viewport: { width: 816, height: 1056 }, deviceScaleFactor: 2 });
await page.setContent(html, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
const over = await page.evaluate(() => document.documentElement.scrollHeight);
if (over > 1057) console.log(`WARNING: content is ${over}px tall, more than one page`);
await writeFile(join(outDir, "mailer.pdf"), await page.pdf({ width: "8.5in", height: "11in", printBackground: true, preferCSSPageSize: true }));
if (png) await page.screenshot({ path: png, fullPage: false });
await browser.close();
console.log(`wrote ${join(outDir, "mailer.pdf")}${png ? ` and ${png}` : ""}`);
