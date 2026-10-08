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
@media print{.sheet{padding:0}.rc{border-color:#999}}`;

/** Four counter cards per sheet asking customers for a Google review. */
export function reviewCards(business: string, placeId: string): Response {
  const url = `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
  const svg = qrSvg(url, `QR code to review ${business} on Google`);
  const card = `<div class="rc"><div class="stars" aria-hidden="true">★★★★★</div><h2>Enjoyed ${escHtml(business)}?</h2>
<p>We'd love a quick Google review.</p>${svg}<p class="small muted">Point your phone camera here</p></div>`;
  return page(`Review cards: ${business}`, `${PRINT_BAR}<div class="sheet">${card.repeat(4)}</div>`, { brand: "", css: CARD_CSS });
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
