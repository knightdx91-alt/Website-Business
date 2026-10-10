/**
 * A small PDF writer for agreements: Letter pages, Helvetica (a standard PDF font, nothing embedded), wrapped
 * paragraphs, ALL-CAPS lines as headings, "- " lines as bullets, page numbers, and an optional PNG (the drawn
 * signature) decoded here and embedded as a plain RGB image. No dependencies; runs in Workers and Node.
 */

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 54;
const BODY = 10.5;
const LEAD = 14.5;

// Helvetica advance widths (per 1000 em) for ASCII 32..126, from the standard AFM.
const W = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];

// Unicode → WinAnsi byte for the punctuation and accents we meet in agreements; everything else Latin-1 or "?".
const WINANSI: Record<string, number> = { "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "–": 0x96, "—": 0x97, "•": 0x95, "…": 0x85, "€": 0x80, "™": 0x99, " ": 0x20 };

function toWinAnsi(s: string): number[] {
  const out: number[] = [];
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c === 0x09) out.push(0x20);
    else if (c < 0x20) continue;
    else if (c < 0x7f) out.push(c);
    else if (WINANSI[ch] !== undefined) out.push(WINANSI[ch]!);
    else if (c >= 0xa0 && c <= 0xff) out.push(c);
    else out.push(0x3f);
  }
  return out;
}

function widthOf(bytes: number[], size: number, bold: boolean): number {
  let w = 0;
  for (const b of bytes) w += b >= 32 && b <= 126 ? W[b - 32]! : 556;
  return (w / 1000) * size * (bold ? 1.06 : 1);
}

function pdfString(bytes: number[]): string {
  let s = "(";
  for (const b of bytes) {
    if (b === 0x28 || b === 0x29 || b === 0x5c) s += "\\" + String.fromCharCode(b);
    else if (b < 0x20 || b > 0x7e) s += "\\" + b.toString(8).padStart(3, "0");
    else s += String.fromCharCode(b);
  }
  return s + ")";
}

/** Greedy word wrap on measured widths; very long words are split. */
function wrap(text: string, size: number, bold: boolean, maxW: number): number[][] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: number[][] = [];
  let cur: number[] = [];
  const space = toWinAnsi(" ");
  for (const word of words) {
    let wb = toWinAnsi(word);
    while (widthOf(wb, size, bold) > maxW) {
      // Split an over-long token so it never runs off the page.
      let n = wb.length;
      while (n > 1 && widthOf(wb.slice(0, n), size, bold) > maxW) n--;
      if (cur.length) lines.push(cur);
      lines.push(wb.slice(0, n));
      cur = [];
      wb = wb.slice(n);
    }
    const trial = cur.length ? [...cur, ...space, ...wb] : wb;
    if (cur.length && widthOf(trial, size, bold) > maxW) {
      lines.push(cur);
      cur = wb;
    } else cur = trial;
  }
  if (cur.length) lines.push(cur);
  return lines.length ? lines : [[]];
}

export interface PdfImage {
  width: number;
  height: number;
  /** zlib-compressed RGB bytes (FlateDecode). */
  data: Uint8Array;
}

export interface PdfDoc {
  title: string;
  /** Lines of the agreement as stored: blank lines separate paragraphs, ALL-CAPS lines are headings, "- " bullets. */
  text: string;
  /** Rendered after the text: a heading, the image, then lines of detail (signer, date, IP). */
  signature?: { heading: string; image?: PdfImage; lines: string[] };
  /** Page footer, left side (the company name). */
  footer?: string;
  /** A short notice printed under the title (e.g. "Preview, not signed"). */
  notice?: string;
}

/* ---------- PNG → raw RGB ---------- */

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate");
  const w = ds.writable.getWriter();
  void w.write(data);
  void w.close();
  return new Uint8Array(await new Response(ds.readable).arrayBuffer());
}

async function deflate(data: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream("deflate");
  const w = cs.writable.getWriter();
  void w.write(data);
  void w.close();
  return new Uint8Array(await new Response(cs.readable).arrayBuffer());
}

/** Decodes an 8-bit, non-interlaced PNG (gray, RGB, with or without alpha) into a PDF image; alpha is flattened onto white. */
export async function pngToPdfImage(png: Uint8Array): Promise<PdfImage | null> {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (png.length < 33 || sig.some((b, i) => png[i] !== b)) return null;
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  let pos = 8;
  let width = 0;
  let height = 0;
  let depth = 0;
  let colorType = 0;
  let interlace = 0;
  const idat: Uint8Array[] = [];
  while (pos + 8 <= png.length) {
    const len = view.getUint32(pos);
    const type = String.fromCharCode(png[pos + 4]!, png[pos + 5]!, png[pos + 6]!, png[pos + 7]!);
    const body = png.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = view.getUint32(pos + 8);
      height = view.getUint32(pos + 12);
      depth = png[pos + 16]!;
      colorType = png[pos + 17]!;
      interlace = png[pos + 20]!;
    } else if (type === "IDAT") idat.push(body);
    else if (type === "IEND") break;
    pos += 12 + len;
  }
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  if (!width || !height || depth !== 8 || !channels || interlace !== 0) return null;
  const total = idat.reduce((n, c) => n + c.length, 0);
  const z = new Uint8Array(total);
  let o = 0;
  for (const c of idat) {
    z.set(c, o);
    o += c.length;
  }
  const raw = await inflate(z);
  const stride = width * channels;
  if (raw.length < (stride + 1) * height) return null;
  // Undo the per-scanline filters (None, Sub, Up, Average, Paeth).
  const px = new Uint8Array(stride * height);
  let prev = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)]!;
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = new Uint8Array(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? cur[i - channels]! : 0;
      const b = prev[i]!;
      const c = i >= channels ? prev[i - channels]! : 0;
      let v = line[i]!;
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[i] = v & 0xff;
    }
    px.set(cur, y * stride);
    prev = cur;
  }
  // To RGB, alpha composited on white.
  const rgb = new Uint8Array(width * height * 3);
  for (let i = 0, j = 0; i < px.length; i += channels, j += 3) {
    let r: number;
    let g: number;
    let b: number;
    let a = 255;
    if (channels === 1) r = g = b = px[i]!;
    else if (channels === 2) {
      r = g = b = px[i]!;
      a = px[i + 1]!;
    } else {
      r = px[i]!;
      g = px[i + 1]!;
      b = px[i + 2]!;
      if (channels === 4) a = px[i + 3]!;
    }
    if (a < 255) {
      r = Math.round((r * a + 255 * (255 - a)) / 255);
      g = Math.round((g * a + 255 * (255 - a)) / 255);
      b = Math.round((b * a + 255 * (255 - a)) / 255);
    }
    rgb[j] = r;
    rgb[j + 1] = g;
    rgb[j + 2] = b;
  }
  return { width, height, data: await deflate(rgb) };
}

/** `data:image/png;base64,…` → bytes, or null. */
export function dataUrlBytes(url: string | null | undefined): Uint8Array | null {
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(url ?? "");
  if (!m) return null;
  const bin = atob(m[1]!);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/* ---------- layout ---------- */

interface Op {
  kind: "text" | "image";
  x: number;
  y: number;
  size?: number;
  bold?: boolean;
  bytes?: number[];
  w?: number;
  h?: number;
}

function layout(doc: PdfDoc): Op[][] {
  const maxW = PAGE_W - MARGIN * 2;
  const pages: Op[][] = [[]];
  let y = PAGE_H - MARGIN;
  const bottom = MARGIN + 24;
  const put = (text: string, size: number, bold: boolean, indent = 0, gapAfter = 0) => {
    for (const bytes of wrap(text, size, bold, maxW - indent)) {
      if (y - size < bottom) {
        pages.push([]);
        y = PAGE_H - MARGIN;
      }
      y -= size * 1.15;
      pages[pages.length - 1]!.push({ kind: "text", x: MARGIN + indent, y, size, bold, bytes });
      y -= Math.max(0, LEAD - size * 1.15);
    }
    y -= gapAfter;
  };
  put(doc.title, 17, true, 0, 6);
  if (doc.notice) put(doc.notice, 9.5, false, 0, 10);
  const lines = doc.text.replace(/\r/g, "").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trimEnd();
    if (!line.trim()) {
      y -= 6;
      continue;
    }
    const isHeading = line.length <= 60 && /^[A-Z0-9][A-Z0-9 :&'’()/,.-]*$/.test(line) && /[A-Z]{3}/.test(line);
    if (isHeading) {
      y -= 6;
      put(line, 11.5, true, 0, 2);
    } else if (/^- /.test(line)) put(`•  ${line.slice(2)}`, BODY, false, 12);
    else put(line, BODY, false);
  }
  if (doc.signature) {
    y -= 10;
    put(doc.signature.heading, 11.5, true, 0, 4);
    const img = doc.signature.image;
    if (img) {
      const w = Math.min(260, maxW);
      const h = (img.height / img.width) * w;
      if (y - h < bottom) {
        pages.push([]);
        y = PAGE_H - MARGIN;
      }
      y -= h;
      pages[pages.length - 1]!.push({ kind: "image", x: MARGIN, y, w, h });
      y -= 8;
    }
    for (const l of doc.signature.lines) put(l, BODY, false);
  }
  return pages;
}

/** Builds the PDF bytes. */
export function pdfBytes(doc: PdfDoc, image?: PdfImage): Uint8Array {
  const pages = layout(doc);
  const objects: Array<string | Uint8Array> = [];
  const add = (o: string | Uint8Array) => objects.push(o) && objects.length;
  const catalog = add(""); // 1, filled last
  const pagesObj = add(""); // 2
  const f1 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const f2 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const imgObj = image ? add(concat(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${image.data.length} >>\nstream\n`, image.data, "\nendstream")) : 0;
  const footerBytes = toWinAnsi(doc.footer ?? "");
  const pageIds: number[] = [];
  pages.forEach((ops, i) => {
    let s = "";
    for (const op of ops) {
      if (op.kind === "text") s += `BT /${op.bold ? "F2" : "F1"} ${op.size} Tf ${op.x.toFixed(2)} ${op.y.toFixed(2)} Td ${pdfString(op.bytes!)} Tj ET\n`;
      else if (imgObj) s += `q ${op.w!.toFixed(2)} 0 0 ${op.h!.toFixed(2)} ${op.x.toFixed(2)} ${op.y.toFixed(2)} cm /Im1 Do Q\n`;
    }
    const pn = toWinAnsi(`Page ${i + 1} of ${pages.length}`);
    s += `BT /F1 8.5 Tf 0.4 g ${MARGIN} ${MARGIN - 18} Td ${pdfString(footerBytes)} Tj ET\n`;
    s += `BT /F1 8.5 Tf 0.4 g ${(PAGE_W - MARGIN - widthOf(pn, 8.5, false)).toFixed(2)} ${MARGIN - 18} Td ${pdfString(pn)} Tj ET\n`;
    const content = add(concat(`<< /Length ${utf8len(s)} >>\nstream\n`, s, "\nendstream"));
    const res = `<< /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >>${imgObj ? ` /XObject << /Im1 ${imgObj} 0 R >>` : ""} >>`;
    pageIds.push(add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources ${res} /Contents ${content} 0 R >>`));
  });
  objects[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
  objects[pagesObj - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  const info = add(`<< /Title ${pdfString(toWinAnsi(doc.title))} /Producer (Website Business) >>`);

  const parts: Uint8Array[] = [];
  const enc = new TextEncoder();
  let offset = 0;
  const push = (b: Uint8Array | string) => {
    const u = typeof b === "string" ? enc.encode(b) : b;
    parts.push(u);
    offset += u.length;
  };
  push("%PDF-1.4\n%âãÏÓ\n");
  const offsets: number[] = [];
  objects.forEach((o, i) => {
    offsets.push(offset);
    push(`${i + 1} 0 obj\n`);
    push(o);
    push("\nendobj\n");
  });
  const xref = offset;
  push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`);
  push(`trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const out = new Uint8Array(offset);
  let p = 0;
  for (const part of parts) {
    out.set(part, p);
    p += part.length;
  }
  return out;
}

function utf8len(s: string): number {
  return new TextEncoder().encode(s).length;
}

function concat(head: string, body: Uint8Array | string, tail: string): Uint8Array {
  const enc = new TextEncoder();
  const h = enc.encode(head);
  const b = typeof body === "string" ? enc.encode(body) : body;
  const t = enc.encode(tail);
  const out = new Uint8Array(h.length + b.length + t.length);
  out.set(h, 0);
  out.set(b, h.length);
  out.set(t, h.length + b.length);
  return out;
}

/** A PDF download response. */
export function pdfResponse(bytes: Uint8Array, filename: string): Response {
  return new Response(bytes, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${filename.replace(/[^A-Za-z0-9._-]+/g, "-")}"`,
      "cache-control": "private, no-store",
    },
  });
}
