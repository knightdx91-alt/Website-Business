/**
 * Underground Associates logo system. Every mark is built from code, with all lettering converted to outlines,
 * so the SVGs look identical on any device. Usage:
 *   npx tsx scripts/logo.mts concepts <outDir>   review sheet of all directions
 *   npx tsx scripts/logo.mts package <outDir> <concept>   full file package for one direction
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import opentype from "opentype.js";

const NAVY = "#14213d";
const GOLD = "#fca311";
const WHITE = "#ffffff";
const BLACK = "#000000";

const font = (pkg: string, file: string) => opentype.loadSync(`node_modules/@fontsource/${pkg}/files/${file}`);
const BRICO = font("bricolage-grotesque", "bricolage-grotesque-latin-800-normal.woff");
const DM = font("dm-sans", "dm-sans-latin-700-normal.woff");

interface Run {
  d: string;
  width: number;
}

/** Outlined text. Tracking is in em; tracked text skips kerning (fine for spaced capitals). */
function text(f: opentype.Font, s: string, x: number, y: number, size: number, tracking = 0): Run {
  if (!tracking) {
    const p = f.getPath(s, x, y, size, { kerning: true });
    return { d: p.toPathData(2), width: f.getAdvanceWidth(s, size, { kerning: true }) };
  }
  let cx = x;
  let d = "";
  const glyphs = f.stringToGlyphs(s);
  glyphs.forEach((g, i) => {
    d += g.getPath(cx, y, size).toPathData(2);
    cx += ((g.advanceWidth ?? 0) / f.unitsPerEm) * size + (i < glyphs.length - 1 ? tracking * size : 0);
  });
  return { d, width: cx - x };
}

/** Text set around a circle, reading clockwise from the top, letters upright to the outside. */
function circleText(f: opentype.Font, s: string, cx: number, cy: number, r: number, size: number): string {
  const glyphs = f.stringToGlyphs(s);
  const adv = glyphs.map((g) => ((g.advanceWidth ?? 0) / f.unitsPerEm) * size);
  const total = adv.reduce((a, b) => a + b, 0);
  const extra = (2 * Math.PI * r - total) / glyphs.length;
  let arc = 0;
  let out = "";
  glyphs.forEach((g, i) => {
    const mid = arc + adv[i]! / 2;
    const deg = (mid / (2 * Math.PI * r)) * 360;
    const d = g.getPath(-adv[i]! / 2, 0, size).toPathData(2);
    if (d) out += `<path transform="translate(${cx} ${cy}) rotate(${deg.toFixed(2)}) translate(0 ${-r})" d="${d}"/>`;
    arc += adv[i]! + extra;
  });
  return out;
}

interface Colors {
  /** Background of a filled tile/badge. */
  tile: string;
  /** Main shape on the tile. */
  mark: string;
  accent: string;
  /** Wordmark text. */
  word: string;
  /** "ASSOCIATES" line. */
  sub: string;
}

const COLORWAYS: Record<string, Colors> = {
  primary: { tile: NAVY, mark: WHITE, accent: GOLD, word: NAVY, sub: NAVY },
  reverse: { tile: NAVY, mark: WHITE, accent: GOLD, word: WHITE, sub: GOLD },
  black: { tile: BLACK, mark: WHITE, accent: WHITE, word: BLACK, sub: BLACK },
  white: { tile: WHITE, mark: NAVY, accent: NAVY, word: WHITE, sub: WHITE },
};

/* ---------- symbols, each on a 100 x 100 tile ---------- */

/** 01 Strata: a gold ground line with layers below. Reads as soil layers and as a web page laid out in sections. */
function strata(c: Colors): string {
  return `<rect width="100" height="100" rx="22" fill="${c.tile}"/>
<rect x="18" y="26" width="64" height="10" rx="5" fill="${c.accent}"/>
<rect x="18" y="47" width="64" height="9" rx="4.5" fill="${c.mark}"/>
<rect x="18" y="62" width="46" height="9" rx="4.5" fill="${c.mark}"/>
<rect x="18" y="77" width="28" height="9" rx="4.5" fill="${c.mark}"/>`;
}

/** 02 Split UA: the initials cut by a gold ground line, the lower half sunk below it. */
function splitUA(c: Colors): string {
  const size = 60;
  const run = text(BRICO, "UA", 0, 0, size);
  const x = 50 - run.width / 2;
  const glyphs = text(BRICO, "UA", x, 66, size).d;
  const line = 46;
  return `<rect width="100" height="100" rx="22" fill="${c.tile}"/>
<defs><clipPath id="up"><rect x="0" y="0" width="100" height="${line}"/></clipPath><clipPath id="dn"><rect x="0" y="${line}" width="100" height="60"/></clipPath></defs>
<path clip-path="url(#up)" d="${glyphs}" fill="${c.mark}"/>
<g transform="translate(0 9)"><path clip-path="url(#dn)" d="${glyphs}" fill="${c.mark}"/></g>
<rect x="12" y="${line + 2}" width="76" height="5" rx="2.5" fill="${c.accent}"/>`;
}

/** 03 Tunnel U: a heavy U (a tunnel, and the U of Underground) holding a gold map pin: local. */
function tunnelU(c: Colors, tile = true): string {
  const u = `M17 14 H37 V52 A13 13 0 0 0 63 52 V14 H83 V52 A33 33 0 0 1 17 52 Z`;
  const pin = `M50 66 C50 66 39.5 53.5 39.5 44 A10.5 10.5 0 1 1 60.5 44 C60.5 53.5 50 66 50 66 Z`;
  const shape = (fill: string) => `<path d="${u}" fill="${fill}"/>`;
  return `${tile ? `<rect width="100" height="100" rx="22" fill="${c.tile}"/>` : ""}
${shape(tile ? c.mark : c.word)}
<path d="${pin}" fill="${c.accent}"/><circle cx="50" cy="44" r="4" fill="${tile ? c.tile : "none"}"${tile ? "" : ` stroke="none"`}/>`;
}

/** 05 Seal: round badge with the name around the edge. */
function seal(c: Colors): string {
  const ring = circleText(DM, "UNDERGROUND ASSOCIATES • CULLMAN, ALABAMA • ", 50, 50, 39.5, 8.2);
  const ua = text(BRICO, "UA", 0, 0, 30);
  const est = text(DM, "EST. 2021", 0, 0, 6, 0.18);
  return `<circle cx="50" cy="50" r="50" fill="${c.tile}"/>
<circle cx="50" cy="50" r="31" fill="none" stroke="${c.accent}" stroke-width="2"/>
<g fill="${c.mark}">${ring}</g>
<path d="${text(BRICO, "UA", 50 - ua.width / 2, 56, 30).d}" fill="${c.mark}"/>
<rect x="36" y="60" width="28" height="2.6" rx="1.3" fill="${c.accent}"/>
<path d="${text(DM, "EST. 2021", 50 - est.width / 2, 71, 6, 0.18).d}" fill="${c.mark}"/>`;
}

/* ---------- lockups ---------- */

function svg(w: number, h: number, inner: string, title: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w.toFixed(1)} ${h}" width="${Math.round(w)}" height="${h}" role="img" aria-label="${title}"><title>${title}</title>${inner}</svg>`;
}

/** Symbol left, two-line wordmark right. */
function horizontal(symbol: string, c: Colors): string {
  const word = text(BRICO, "Underground", 124, 54, 54);
  const sub = text(DM, "ASSOCIATES", 126, 88, 20, 0.36);
  const w = 124 + Math.max(word.width, sub.width + 2) + 4;
  return svg(w, 100, `${symbol}<path d="${word.d}" fill="${c.word}"/><path d="${sub.d}" fill="${c.sub}"/>`, "Underground Associates");
}

/** Symbol on top, wordmark centered below (for square spaces). */
function stacked(symbol: string, c: Colors): string {
  const W = 300;
  const w1 = text(BRICO, "Underground", 0, 0, 44).width;
  const w2 = text(DM, "ASSOCIATES", 0, 0, 16, 0.36).width;
  const word = text(BRICO, "Underground", (W - w1) / 2, 166, 44);
  const sub = text(DM, "ASSOCIATES", (W - w2) / 2, 194, 16, 0.36);
  return svg(W, 206, `<g transform="translate(100 0)">${symbol}</g><path d="${word.d}" fill="${c.word}"/><path d="${sub.d}" fill="${c.sub}"/>`, "Underground Associates");
}

/** 04 Wordmark only: the ground line drops into a trench under "ground". */
function wordmark(c: Colors): string {
  const size = 80;
  const word = text(BRICO, "Underground", 4, 72, size);
  const under = text(BRICO, "Under", 4, 72, size).width;
  const y = 92;
  const x0 = 6;
  const x1 = 4 + word.width - 2;
  const a = 4 + under + 4;
  const b = x1 - 18;
  const trench = `M${x0} ${y} H${a.toFixed(1)} V${y + 12} H${b.toFixed(1)} V${y} H${x1.toFixed(1)}`;
  const sub = text(DM, "ASSOCIATES", 6, 140, 24, 0.42);
  const w = Math.max(word.width, sub.width) + 10;
  return svg(w, 150, `<path d="${word.d}" fill="${c.word}"/><path d="${trench}" fill="none" stroke="${c.accent === GOLD ? GOLD : c.word}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="${sub.d}" fill="${c.sub}"/>`, "Underground Associates");
}

const tile = (inner: string) => svg(100, 100, inner, "Underground Associates");

interface Concept {
  id: string;
  name: string;
  says: string;
  avoids: string;
  icon: (c: Colors) => string;
  lockup: (c: Colors) => string;
}

const CONCEPTS: Concept[] = [
  {
    id: "01-strata",
    name: "01 · Strata",
    says: "A gold ground line with layers underneath: “underground,” and also a web page laid out in sections. Builds from the ground up.",
    avoids: "Cute or techy. Reads solid and practical, like a contractor's truck.",
    icon: (c) => tile(strata(c)),
    lockup: (c) => horizontal(strata(c), c),
  },
  {
    id: "02-split-ua",
    name: "02 · Split UA",
    says: "Your initials cut by a gold ground line, the bottom half sunk below it. A visual pun on the name that's easy to remember.",
    avoids: "A plain monogram. It has a little edge to it.",
    icon: (c) => tile(splitUA(c)),
    lockup: (c) => horizontal(splitUA(c), c),
  },
  {
    id: "03-tunnel-u",
    name: "03 · Tunnel U + pin",
    says: "A heavy U (a tunnel, and the U in Underground) holding a gold map pin: local businesses, found on the map.",
    avoids: "Generic web-design icons like code brackets or computer screens.",
    icon: (c) => tile(tunnelU(c)),
    lockup: (c) => horizontal(tunnelU(c), c),
  },
  {
    id: "04-wordmark",
    name: "04 · Wordmark",
    says: "Just the name, with the gold ground line dropping into a trench under “ground.” Clean and grown-up.",
    avoids: "A symbol. Needs the U monogram from 03 or the UA from 02 for the small square spots.",
    icon: (c) => tile(splitUA(c)),
    lockup: (c) => wordmark(c),
  },
  {
    id: "05-seal",
    name: "05 · Seal",
    says: "A round badge with the name, Cullman, Alabama and est. 2021. Hometown and established.",
    avoids: "Modern-minimal. Best as a second mark for stickers, shirts and the Google profile circle.",
    icon: (c) => svg(100, 100, seal(c), "Underground Associates"),
    lockup: (c) => horizontal(`<g>${seal(c)}</g>`, c),
  },
];

const dataUri = (s: string) => `data:image/svg+xml;base64,${Buffer.from(s).toString("base64")}`;

async function shoot(html: string, path: string, width: number, height?: number, transparent = false) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  const page = await browser.newPage({ viewport: { width, height: height ?? 800 }, deviceScaleFactor: 1 });
  await page.setContent(`<html><body style="margin:0;${transparent ? "background:transparent" : ""}">${html}</body></html>`);
  await page.screenshot({ path, fullPage: !height, omitBackground: transparent });
  await browser.close();
}

async function concepts(out: string) {
  mkdirSync(out, { recursive: true });
  const cards = CONCEPTS.map((k) => {
    for (const [cw, c] of Object.entries(COLORWAYS)) {
      writeFileSync(join(out, `${k.id}-lockup-${cw}.svg`), k.lockup(c));
      writeFileSync(join(out, `${k.id}-icon-${cw}.svg`), k.icon(c));
    }
    const p = COLORWAYS.primary!;
    const r = COLORWAYS.reverse!;
    const b = COLORWAYS.black!;
    return `<section class="card"><h2>${k.name}</h2>
<div class="row"><div class="lt"><img src="${dataUri(k.lockup(p))}" style="height:70px"></div><div class="dk"><img src="${dataUri(k.lockup(r))}" style="height:70px"></div></div>
<div class="row small"><div class="cell"><img src="${dataUri(k.icon(p))}" width="96"><span>Google profile / app icon</span></div>
<div class="cell"><img src="${dataUri(k.icon(p))}" width="32"><img src="${dataUri(k.icon(p))}" width="16"><span>Browser tab, 32 & 16 px</span></div>
<div class="cell lt"><img src="${dataUri(k.lockup(b))}" style="height:34px"><span>One color (print)</span></div></div>
<p><strong>Says:</strong> ${k.says}</p><p><strong>Not:</strong> ${k.avoids}</p></section>`;
  }).join("");
  const html = `<style>body{font:15px/1.45 system-ui,sans-serif;color:#16181d;background:#eef1f6;padding:24px}h1{margin:0 0 16px;font-size:24px}
.card{background:#fff;border-radius:14px;padding:18px;margin-bottom:18px}h2{margin:0 0 12px;font-size:19px}
.row{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:10px}.lt,.dk{padding:16px;border-radius:10px;flex:1 1 300px;display:flex;align-items:center}
.lt{background:#fff;border:1px solid #e1e4ea}.dk{background:${NAVY}}.cell{display:flex;align-items:center;gap:10px;flex:1 1 200px}.cell span{color:#5b6270;font-size:13px}
.cell.lt{padding:10px}p{margin:6px 0}</style><h1>Underground Associates · logo directions</h1>${cards}`;
  await shoot(html, join(out, "review-sheet.png"), 900);
}

const SIZES = [64, 128, 256, 512, 1024, 2048];

async function pkg(out: string, id: string) {
  const k = CONCEPTS.find((x) => x.id === id);
  if (!k) throw new Error(`Unknown concept ${id}`);
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  const page = await browser.newPage();
  const png = async (svgText: string, path: string, width: number, bg?: string) => {
    const m = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svgText)!;
    const h = Math.round((width * Number(m[2])) / Number(m[1]));
    await page.setViewportSize({ width, height: h });
    await page.setContent(`<html><body style="margin:0;background:${bg ?? "transparent"}"><img src="${dataUri(svgText)}" style="display:block;width:${width}px;height:${h}px"></body></html>`);
    await page.screenshot({ path, omitBackground: !bg, clip: { x: 0, y: 0, width, height: h } });
  };
  const variants: Array<[string, string]> = [];
  for (const [cw, c] of Object.entries(COLORWAYS)) {
    variants.push([`horizontal-${cw}`, k.lockup(c)]);
    variants.push([`stacked-${cw}`, stacked(k.id === "05-seal" ? `<g>${seal(c)}</g>` : k.icon(c).replace(/^<svg[^>]*>|<title>.*?<\/title>|<\/svg>$/g, ""), c)]);
    variants.push([`icon-${cw}`, k.icon(c)]);
  }
  for (const [name, s] of variants) {
    const dir = join(out, name.split("-")[0]!);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `underground-associates-${name}.svg`), s);
    for (const w of name.startsWith("icon") ? SIZES : [512, 1024, 2048]) await png(s, join(dir, `underground-associates-${name}-${w}.png`), w);
  }
  // Ready-made files for specific places.
  const ready = join(out, "ready-to-use");
  mkdirSync(ready, { recursive: true });
  // Profile photos get cropped to a circle, so the symbol sits smaller on a full-bleed square.
  const inner = k.icon(COLORWAYS.primary!).replace(/^<svg[^>]*>|<title>.*?<\/title>|<\/svg>$/g, "");
  const profile = svg(100, 100, `<rect width="100" height="100" fill="${NAVY}"/><g transform="translate(12 12) scale(0.76)">${inner}</g>`, "Underground Associates");
  writeFileSync(join(ready, "profile-photo.svg"), profile);
  await png(profile, join(ready, "google-profile-logo-720.png"), 720);
  await png(profile, join(ready, "facebook-instagram-profile-720.png"), 720);
  await png(k.lockup(COLORWAYS.primary!), join(ready, "email-signature-600.png"), 600, WHITE);
  await png(k.lockup(COLORWAYS.primary!), join(ready, "letterhead-2048.png"), 2048, WHITE);
  for (const w of [16, 32, 48, 180, 192, 512]) await png(k.icon(COLORWAYS.primary!), join(ready, `favicon-${w}.png`), w);
  await browser.close();
}

const [cmd, out, id] = process.argv.slice(2);
if (cmd === "concepts") await concepts(out!);
else if (cmd === "package") await pkg(out!, id!);
else console.log("usage: concepts <outDir> | package <outDir> <conceptId>");
