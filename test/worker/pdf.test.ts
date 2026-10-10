import assert from "node:assert/strict";
import { test } from "node:test";
import { deflateSync } from "node:zlib";
import { dataUrlBytes, pdfBytes, pngToPdfImage } from "../../src/worker/pdf.ts";
import { contractText } from "../../src/worker/contract.ts";
import { priceSignup } from "../../src/worker/checkout.ts";
import type { AppSettings } from "../../src/worker/db.ts";

const SETTINGS = {
  companyName: "Underground Associates",
  legalName: "Underground Associates LLC",
  plans: [{ id: "plus", name: "Plus", setup: 0, monthly: 89, includes: "Everything in Basic\nMonthly report" }],
  minMonths: 12,
  shortMonths: 6,
  flexSetup: 299,
  annualMonthsFree: 2,
  churchAnnualMonthsFree: 4,
  addons: [],
} as unknown as AppSettings;

/** A tiny valid PNG: 4×2 RGBA, filter byte 0 on each row, a crc32 per chunk. */
function makePng(): Uint8Array {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc32 = (b: Uint8Array) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 0xff]! ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type: string, data: Uint8Array) => {
    const t = new TextEncoder().encode(type);
    const out = new Uint8Array(12 + data.length);
    const dv = new DataView(out.buffer);
    dv.setUint32(0, data.length);
    out.set(t, 4);
    out.set(data, 8);
    dv.setUint32(8 + data.length, crc32(new Uint8Array([...t, ...data])));
    return out;
  };
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, 4);
  dv.setUint32(4, 2);
  ihdr.set([8, 6, 0, 0, 0], 8);
  // Row 0: black opaque, white opaque, red opaque, transparent. Row 1: all half-transparent black. Filter 2 (Up) on row 1.
  const row0 = [0, 0, 0, 0, 255, 255, 255, 255, 255, 255, 0, 0, 255, 0, 0, 0, 0];
  const row1 = [2, 0, 0, 0, 128 - 255 & 255, 0 - 255 & 255, 0 - 255 & 255, 0 - 255 & 255, 128 - 255 & 255, 0 - 255 & 255, 0, 0, 128 - 255 & 255, 0, 0, 0, 128];
  const raw = new Uint8Array([...row0, ...row1]);
  const idat = new Uint8Array(deflateSync(raw));
  return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...chunk("IHDR", ihdr), ...chunk("IDAT", idat), ...chunk("IEND", new Uint8Array(0))]);
}

test("a signature PNG becomes a flattened RGB image", async () => {
  const img = await pngToPdfImage(makePng());
  assert.ok(img);
  assert.equal(img!.width, 4);
  assert.equal(img!.height, 2);
  const { inflateSync } = await import("node:zlib");
  const rgb = new Uint8Array(inflateSync(img!.data));
  assert.deepEqual([...rgb.slice(0, 12)], [0, 0, 0, 255, 255, 255, 255, 0, 0, 255, 255, 255], "black, white, red, transparent→white");
  assert.deepEqual([...rgb.slice(12, 15)], [127, 127, 127], "half-transparent black over white is mid grey");
  assert.equal(await pngToPdfImage(new Uint8Array([1, 2, 3])), null);
  const b64 = Buffer.from(makePng()).toString("base64");
  assert.equal(dataUrlBytes(`data:image/png;base64,${b64}`)!.length, makePng().length);
  assert.equal(dataUrlBytes("data:image/jpeg;base64,AAAA"), null);
});

test("the agreement PDF is well formed: pages, fonts, image, xref offsets and the text itself", async () => {
  const order = priceSignup(SETTINGS, "plus", "standard", [], {});
  const terms = contractText(SETTINGS, order, { business: "Reyes’ Pizza & Grill (Cullman)", kind: "signup" });
  const image = await pngToPdfImage(makePng());
  const bytes = pdfBytes(
    { title: terms.split("\n")[0]!, text: terms.split("\n").slice(1).join("\n"), signature: { heading: "Signed electronically", image: image!, lines: ["Maria Reyes, Owner for Reyes’ Pizza", "Signed October 10, 2026 · IP 1.2.3.4"] }, footer: "Underground Associates" },
    image!,
  );
  const txt = new TextDecoder("latin1").decode(bytes);
  assert.match(txt, /^%PDF-1\.4\n/);
  assert.match(txt, /%%EOF\n$/);
  const count = Number(/\/Count (\d+)/.exec(txt)![1]);
  assert.ok(count >= 2, `an agreement spans pages (${count})`);
  assert.equal((txt.match(/\/Type \/Page\b/g) ?? []).length, count);
  assert.match(txt, /\/BaseFont \/Helvetica-Bold/);
  assert.match(txt, /\/Subtype \/Image \/Width 4 \/Height 2/);
  assert.match(txt, /\(WEBSITE SERVICES AGREEMENT\) Tj/);
  assert.match(txt, /Reyes\\222 Pizza & Grill \\\(Cullman\\\)/, "curly quote maps to WinAnsi and parens are escaped");
  assert.match(txt, /\(Page 1 of \d+\) Tj/);
  // Every xref offset points at "<n> 0 obj".
  const xrefAt = Number(/startxref\n(\d+)\n%%EOF/.exec(txt)![1]);
  assert.equal(txt.slice(xrefAt, xrefAt + 4), "xref");
  const entries = txt.slice(xrefAt).split("\n").slice(3).filter((l) => / 00000 n $/.test(l));
  entries.forEach((l, i) => assert.equal(txt.slice(Number(l.slice(0, 10)), Number(l.slice(0, 10)) + `${i + 1} 0 obj`.length), `${i + 1} 0 obj`));
  assert.ok(bytes.length < 60_000, `compact (${bytes.length} bytes)`);
});
