import qrcode from "qrcode-generator";
import { escHtml, page } from "./page.ts";

/** QR code as an inline SVG (one path, crisp at any print size). */
export function qrSvg(text: string, label: string): string {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const m = 4;
  let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + m},${r + m}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n + 2 * m} ${n + 2 * m}" role="img" aria-label="${escHtml(label)}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}

const PRINT_BAR = `<div class="noprint bar"><button class="btn" type="button" onclick="window.print()">Print or save as PDF</button>
<p class="small muted">In the print screen, pick a printer or choose “Save as PDF” to send it to a print shop.</p></div>`;

const CARD_CSS = `@page{size:letter;margin:0.4in}
.bar{max-width:640px;margin:16px auto;padding:0 16px}
.sheet{display:grid;grid-template-columns:1fr 1fr;gap:0.3in;max-width:7.7in;margin:0 auto;padding:16px}
.rc{border:2px dashed #c9ced8;border-radius:12px;padding:0.25in;text-align:center;background:#fff;break-inside:avoid}
.rc h2{font-size:1.15rem;margin:0 0 4px}.rc p{margin:4px 0}.rc svg{width:1.8in;height:1.8in;display:block;margin:8px auto}
.stars{color:#e5a100;font-size:1.3rem;letter-spacing:2px}
.flyer{max-width:7.5in;margin:0 auto;padding:0.4in;background:#fff;text-align:center}
.flyer h1{font-size:2rem;margin:0 0 10px}.flyer .lead{font-size:1.2rem}.flyer svg{width:3.2in;height:3.2in;display:block;margin:18px auto}
.flyer ul{text-align:left;display:inline-block;font-size:1.05rem}
.tent{max-width:7.7in;margin:0 auto;padding:16px}
.panel{height:4.6in;border:2px dashed #c9ced8;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:#fff;break-inside:avoid}
.panel--flip{transform:rotate(180deg)}.fold{text-align:center;font-size:.8rem;color:#999;margin:2px 0}
.panel h2{font-size:1.6rem;margin:0 0 10px}.qrs{display:flex;gap:0.5in;justify-content:center}.qrs div{width:2in}.qrs svg{width:1.8in;height:1.8in;display:block;margin:0 auto 6px}
.qrs strong{display:block;font-size:1.05rem}
.window{max-width:7.5in;margin:0 auto;padding:0.5in;background:#fff;text-align:center}
.window h1{font-size:2.6rem;margin:0}.window .big{font-size:1.5rem;margin:6px 0 0}.window svg.main{width:4in;height:4in;display:block;margin:22px auto 10px}
.window .small-qr{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:22px}.window .small-qr svg{width:1.3in;height:1.3in}
@media print{.sheet,.tent{padding:0}.rc,.panel{border-color:#999}}`;

/** Four counter cards per sheet asking customers for a Google review. */
export function reviewCards(business: string, placeId: string): Response {
  const url = `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
  const svg = qrSvg(url, `QR code to review ${business} on Google`);
  const card = `<div class="rc"><div class="stars" aria-hidden="true">★★★★★</div><h2>Enjoyed ${escHtml(business)}?</h2>
<p>We'd love a quick Google review.</p>${svg}<p class="small muted">Point your phone camera here</p></div>`;
  return page(`Review cards: ${business}`, `${PRINT_BAR}<div class="sheet">${card.repeat(4)}</div>`, { brand: "", css: CARD_CSS });
}

/** Folded table tent (two panels, top one upside down so both sides read): website/menu QR and review QR. */
export function tableTents(o: { business: string; siteUrl: string; menu: boolean; placeId: string }): Response {
  const review = `https://search.google.com/local/writereview?placeid=${encodeURIComponent(o.placeId)}`;
  const site = qrSvg(o.siteUrl, `QR code to the ${o.business} website`);
  const rev = qrSvg(review, `QR code to review ${o.business} on Google`);
  const panel = (flip: boolean) => `<div class="panel${flip ? " panel--flip" : ""}"><h2>${escHtml(o.business)}</h2><div class="qrs">
<div>${site}<strong>${o.menu ? "See our menu" : "Visit our website"}</strong><span class="small muted">Hours, directions and more</span></div>
<div>${rev}<strong>Enjoyed your visit?</strong><span class="small muted">Leave us a Google review</span></div></div></div>`;
  return page(`Table tent: ${o.business}`, `${PRINT_BAR}<div class="tent">${panel(true)}<p class="fold">fold here</p>${panel(false)}</div>`, { brand: "", css: CARD_CSS });
}

/** A front-window or counter sign: big QR to the website, phone number, small review QR. */
export function windowSign(o: { business: string; siteUrl: string; phone?: string; placeId: string; menu: boolean }): Response {
  const review = `https://search.google.com/local/writereview?placeid=${encodeURIComponent(o.placeId)}`;
  const body = `${PRINT_BAR}<div class="window"><h1>${escHtml(o.business)}</h1>
<p class="big">${o.menu ? "Menu, hours &amp; directions" : "Hours, services &amp; directions"}</p>
${qrSvg(o.siteUrl, `QR code to the ${o.business} website`).replace("<svg ", '<svg class="main" ')}
<p><strong>Point your phone camera at the code</strong></p>
${o.phone ? `<p class="big">${escHtml(o.phone)}</p>` : ""}
<div class="small-qr">${qrSvg(review, `QR code to review ${o.business} on Google`)}<p style="text-align:left"><strong>Love it here?</strong><br>Leave us a Google review</p></div></div>`;
  return page(`Window sign: ${o.business}`, body, { brand: "", css: CARD_CSS });
}

/** A one-page leave-behind with a QR code to the business's free preview. */
export function previewFlyer(o: { business: string; previewUrl: string; company?: string; phone?: string; caller?: string; days: number }): Response {
  const svg = qrSvg(o.previewUrl, `QR code to the website preview for ${o.business}`);
  const from = [o.caller, o.company].filter(Boolean).join(", ");
  const body = `${PRINT_BAR}<div class="flyer">
<p class="muted">Made especially for</p><h1>${escHtml(o.business)}</h1>
<p class="lead">We built you a free website preview. Take a look on your phone:</p>
${svg}
<p><strong>Point your phone camera at the code.</strong></p>
<ul><li>Works great on phones, with tap-to-call and directions</li><li>Built from your Google listing; we'll swap in your own photos</li><li>Nothing goes live until you say so</li></ul>
${from || o.phone ? `<p class="lead" style="margin-top:20px">${from ? `Questions? ${escHtml(from)}` : "Questions?"}${o.phone ? `<br><strong>${escHtml(o.phone)}</strong>` : ""}</p>` : ""}
<p class="lead">undergroundassociates.com</p>
<p class="small muted">This preview link works for ${o.days} days.</p></div>`;
  return page(`Preview flyer: ${o.business}`, body, { brand: "", css: CARD_CSS });
}

// ---- PDF versions for the Android app (drawn with src/worker/pdf.ts; the HTML ones above stay for the web) ----

import { drawPdf, LETTER, type Draw } from "./pdf.ts";

/** QR modules as rows of "1"/"0" (error correction M). */
export function qrGrid(text: string): string[] {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const rows: string[] = [];
  for (let r = 0; r < n; r++) {
    let row = "";
    for (let c = 0; c < n; c++) row += qr.isDark(r, c) ? "1" : "0";
    rows.push(row);
  }
  return rows;
}

const IN = 72;
const reviewUrl = (placeId: string) => `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;

/** Four tear-apart review cards on one page: "Love it? Leave us a Google review" + QR. */
export function reviewCardsPdf(business: string, placeId: string): Uint8Array {
  const grid = qrGrid(reviewUrl(placeId));
  const ops: Draw[] = [];
  const cw = LETTER.w / 2, ch = LETTER.h / 2;
  for (let i = 0; i < 4; i++) {
    const x0 = (i % 2) * cw, y0 = Math.floor(i / 2) * ch;
    ops.push({ t: "rect", x: x0 + 0.25 * IN, y: y0 + 0.25 * IN, w: cw - 0.5 * IN, h: ch - 0.5 * IN, gray: 0.75, stroke: true });
    ops.push({ t: "text", x: x0 + cw / 2, y: y0 + 0.9 * IN, size: 20, bold: true, text: business, align: "center", maxW: cw - 1 * IN });
    ops.push({ t: "text", x: x0 + cw / 2, y: y0 + 1.45 * IN, size: 13, text: "Love it here? Leave us a Google review.", align: "center" });
    ops.push({ t: "qr", x: x0 + cw / 2 - 0.9 * IN, y: y0 + 1.75 * IN, size: 1.8 * IN, grid });
    ops.push({ t: "text", x: x0 + cw / 2, y: y0 + 3.85 * IN, size: 11, text: "Point your camera at the code", align: "center", gray: 0.35 });
    ops.push({ t: "text", x: x0 + cw / 2, y: y0 + 4.1 * IN, size: 10, text: "Thank you!", align: "center", gray: 0.35 });
  }
  return drawPdf([ops], `Review cards: ${business}`);
}

/** Folded table tent: two panels (top one upside down) with the website/menu QR and the review QR. */
export function tableTentsPdf(o: { business: string; siteUrl: string; menu: boolean; placeId: string }): Uint8Array {
  const site = qrGrid(o.siteUrl), rev = qrGrid(reviewUrl(o.placeId));
  const panel = (): Draw[] => {
    const top = LETTER.h / 2;
    return [
      { t: "text", x: LETTER.w / 2, y: top + 0.8 * IN, size: 24, bold: true, text: o.business, align: "center", maxW: LETTER.w - 1.5 * IN },
      { t: "qr", x: LETTER.w / 2 - 2.3 * IN, y: top + 1.3 * IN, size: 1.8 * IN, grid: site },
      { t: "text", x: LETTER.w / 2 - 1.4 * IN, y: top + 3.35 * IN, size: 13, bold: true, text: o.menu ? "Our menu" : "Our website", align: "center" },
      { t: "qr", x: LETTER.w / 2 + 0.5 * IN, y: top + 1.3 * IN, size: 1.8 * IN, grid: rev },
      { t: "text", x: LETTER.w / 2 + 1.4 * IN, y: top + 3.35 * IN, size: 13, bold: true, text: "Leave a review", align: "center" },
      { t: "text", x: LETTER.w / 2, y: top + 3.7 * IN, size: 10, text: "Point your camera at a code", align: "center", gray: 0.35 },
    ];
  };
  const ops: Draw[] = [
    { t: "rect", x: 0.4 * IN, y: LETTER.h / 2, w: LETTER.w - 0.8 * IN, h: 0.6, gray: 0.6 },
    { t: "text", x: LETTER.w / 2, y: LETTER.h / 2 - 4, size: 7, text: "fold here", align: "center", gray: 0.5 },
    ...panel(),
    { t: "flip", ops: panel() },
  ];
  return drawPdf([ops], `Table tent: ${o.business}`);
}

/** A front-window or counter sign: big QR to the website, phone number, small review QR. */
export function windowSignPdf(o: { business: string; siteUrl: string; phone?: string; placeId: string; menu: boolean }): Uint8Array {
  const site = qrGrid(o.siteUrl), rev = qrGrid(reviewUrl(o.placeId));
  const ops: Draw[] = [
    { t: "rect", x: 0, y: 0, w: LETTER.w, h: 1.6 * IN, gray: 0.08 },
    { t: "text", x: LETTER.w / 2, y: 0.95 * IN, size: 30, bold: true, text: o.business, align: "center", gray: 1, maxW: LETTER.w - 1 * IN },
    { t: "text", x: LETTER.w / 2, y: 2.4 * IN, size: 18, bold: true, text: o.menu ? "Scan for our menu & hours" : "Scan for our website & hours", align: "center" },
    { t: "qr", x: LETTER.w / 2 - 2 * IN, y: 2.7 * IN, size: 4 * IN, grid: site },
    { t: "text", x: LETTER.w / 2, y: 7.05 * IN, size: 12, text: o.siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, ""), align: "center", gray: 0.35 },
    ...(o.phone ? [{ t: "text", x: LETTER.w / 2, y: 7.55 * IN, size: 20, bold: true, text: o.phone, align: "center" } as Draw] : []),
    { t: "qr", x: LETTER.w / 2 - 2.2 * IN, y: 8.4 * IN, size: 1.3 * IN, grid: rev },
    { t: "text", x: LETTER.w / 2 - 0.7 * IN, y: 8.85 * IN, size: 14, bold: true, text: "Love it here?" },
    { t: "text", x: LETTER.w / 2 - 0.7 * IN, y: 9.15 * IN, size: 12, text: "Leave us a Google review" },
  ];
  return drawPdf([ops], `Window sign: ${o.business}`);
}

/**
 * QR price tags: a Letter sheet of 8 labels (2 × 4, 3.75 × 2.5 in), one per price-list section, each QR opening that section of
 * /prices/ on the live site. More than 8 sections → more pages. Cut on the lines; tape to the tank, shelf or rack.
 */
export function priceTagsPdf(o: { business: string; siteUrl: string; title: string; sections: Array<{ name: string; slug: string }> }): Uint8Array {
  const base = o.siteUrl.replace(/\/$/, "");
  const cols = 2, rows = 4, cw = 3.75 * IN, ch = 2.5 * IN, x0 = (LETTER.w - cols * cw) / 2, y0 = (LETTER.h - rows * ch) / 2;
  const pages: Draw[][] = [];
  for (let i = 0; i < o.sections.length; i += cols * rows) {
    const ops: Draw[] = [];
    for (let c = 1; c < cols; c++) ops.push({ t: "rect", x: x0 + c * cw, y: y0, w: 0.5, h: rows * ch, gray: 0.75 });
    for (let r = 0; r <= rows; r++) ops.push({ t: "rect", x: x0, y: y0 + r * ch, w: cols * cw, h: 0.5, gray: 0.75 });
    o.sections.slice(i, i + cols * rows).forEach((sec, k) => {
      const lx = x0 + (k % cols) * cw, ly = y0 + Math.floor(k / cols) * ch;
      const grid = qrGrid(`${base}/prices/#sec-${sec.slug}`);
      ops.push(
        { t: "qr", x: lx + 0.25 * IN, y: ly + 0.35 * IN, size: 1.8 * IN, grid },
        { t: "text", x: lx + 2.25 * IN, y: ly + 0.75 * IN, size: 15, bold: true, text: sec.name, maxW: 1.35 * IN },
        { t: "text", x: lx + 2.25 * IN, y: ly + 1.25 * IN, size: 10, bold: true, text: "Scan for today's", maxW: 1.35 * IN },
        { t: "text", x: lx + 2.25 * IN, y: ly + 1.42 * IN, size: 10, bold: true, text: o.title.toLowerCase(), maxW: 1.35 * IN },
        { t: "text", x: lx + 2.25 * IN, y: ly + 1.95 * IN, size: 8, text: o.business, gray: 0.4, maxW: 1.35 * IN },
        { t: "text", x: lx + 2.25 * IN, y: ly + 2.12 * IN, size: 7, text: base.replace(/^https?:\/\//, ""), gray: 0.5, maxW: 1.35 * IN },
      );
    });
    pages.push(ops);
  }
  return drawPdf(pages, `QR price tags: ${o.business}`);
}

/** One-page leave-behind with a QR code to the business's free preview. */
export function previewFlyerPdf(o: { business: string; previewUrl: string; company?: string; phone?: string; caller?: string; days: number }): Uint8Array {
  const grid = qrGrid(o.previewUrl);
  const ops: Draw[] = [
    { t: "rect", x: 0, y: 0, w: LETTER.w, h: 1.5 * IN, gray: 0.08 },
    { t: "text", x: LETTER.w / 2, y: 0.7 * IN, size: 16, text: `A free website preview for`, align: "center", gray: 1 },
    { t: "text", x: LETTER.w / 2, y: 1.15 * IN, size: 26, bold: true, text: o.business, align: "center", gray: 1, maxW: LETTER.w - 1 * IN },
    { t: "text", x: LETTER.w / 2, y: 2.3 * IN, size: 15, text: "We built a website for your business. Take a look:", align: "center" },
    { t: "qr", x: LETTER.w / 2 - 1.75 * IN, y: 2.7 * IN, size: 3.5 * IN, grid },
    { t: "text", x: LETTER.w / 2, y: 6.5 * IN, size: 11, text: "Point your phone's camera at the code, or type:", align: "center", gray: 0.35 },
    { t: "text", x: LETTER.w / 2, y: 6.8 * IN, size: 11, text: o.previewUrl, align: "center", gray: 0.2 },
    { t: "text", x: 0.9 * IN, y: 7.6 * IN, size: 13, text: "Nothing is published and nothing is owed. If you like it, we'll make it yours: your photos, your words, your domain.", maxW: LETTER.w - 1.8 * IN },
    { t: "text", x: 0.9 * IN, y: 8.3 * IN, size: 13, text: `This preview stays up for ${o.days} days.`, maxW: LETTER.w - 1.8 * IN },
    { t: "text", x: 0.9 * IN, y: 9.3 * IN, size: 15, bold: true, text: [o.caller, o.company].filter(Boolean).join(" · ") || "Underground Associates" },
    ...(o.phone ? [{ t: "text", x: 0.9 * IN, y: 9.6 * IN, size: 15, text: `Call or text ${o.phone}` } as Draw] : []),
  ];
  return drawPdf([ops], `Preview flyer: ${o.business}`);
}
