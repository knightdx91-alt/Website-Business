import assert from "node:assert/strict";
import test from "node:test";
import { deflateRawSync } from "node:zlib";
import { lookupPage, MATCH_SRC, XLSX_SRC } from "../../src/worker/lookup.ts";
import { runImport } from "../../src/worker/tankboard.ts";
import { categoryRecord } from "../fixtures.ts";

type Item = { name: string; qty?: number | null; soldOut?: boolean; note?: string; section?: string; barcode?: string; price?: string };
const M = new Function(`${MATCH_SRC}; return { sizeKeys, rank, parseQuery };`)() as {
  sizeKeys: (s: string) => string[];
  rank: (items: Item[], q: string) => Item[];
};

const TIRES: Item[] = [
  { name: "265/70R17 Goodyear Wrangler", qty: 4 },
  { name: "LT265/75R16 BFGoodrich KO2", qty: 2 },
  { name: "225/65R17 Michelin Defender", qty: 0 },
  { name: "33x12.50R20 Nitto Ridge Grappler", qty: 1 },
  { name: "P235/75R15 Cooper", qty: 6, section: "Used" },
  { name: "265/70R17 Firestone", qty: 0 },
  { name: "Tire rotation", qty: null },
];
const names = (q: string) => M.rank(TIRES, q).map((i) => i.name);

test("tire sizes match however they're typed", () => {
  for (const q of ["265/70R17", "265 70 17", "2657017", "26570r17", "265-70-17", "265/70 R17", "p265/70r17"])
    assert.deepEqual(names(q), ["265/70R17 Goodyear Wrangler", "265/70R17 Firestone"], q);
  // The start of a size, a brand, a size + brand, flotation sizes, LT sizes.
  assert.deepEqual(names("265/70"), ["265/70R17 Goodyear Wrangler", "265/70R17 Firestone"]);
  assert.deepEqual(names("265"), ["P235/75R15 Cooper".includes("265") ? "" : "265/70R17 Goodyear Wrangler", "LT265/75R16 BFGoodrich KO2", "265/70R17 Firestone"].filter(Boolean));
  assert.deepEqual(names("goodyear"), ["265/70R17 Goodyear Wrangler"]);
  assert.deepEqual(names("265/70r17 firestone"), ["265/70R17 Firestone"]);
  assert.deepEqual(names("33x12.50r20"), ["33x12.50R20 Nitto Ridge Grappler"]);
  assert.deepEqual(names("265/75 16"), ["LT265/75R16 BFGoodrich KO2"]);
  assert.deepEqual(names("235 75 15 used"), ["P235/75R15 Cooper"]);
  assert.deepEqual(names("999/99R99"), []);
  assert.deepEqual(names(""), []);
  // In stock first, then by how many.
  assert.deepEqual(names("17"), ["265/70R17 Goodyear Wrangler", "225/65R17 Michelin Defender", "265/70R17 Firestone"].sort((a, b) => (a.includes("Goodyear") ? -1 : b.includes("Goodyear") ? 1 : a.localeCompare(b))));
  assert.deepEqual(M.sizeKeys("Tire 265/70R17 and LT245/75-16"), ["2657017", "2457516"]);
});

/** A minimal .xlsx: stored central directory + deflated parts, like Excel writes. */
function zip(files: Record<string, string>): ArrayBuffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const data = deflateRawSync(Buffer.from(text));
    const n = Buffer.from(name);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(text.length, 22);
    local.writeUInt16LE(n.length, 26);
    locals.push(local, n, data);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(8, 10);
    c.writeUInt32LE(data.length, 20);
    c.writeUInt32LE(text.length, 24);
    c.writeUInt16LE(n.length, 28);
    c.writeUInt32LE(offset, 42);
    centrals.push(c, n);
    offset += 30 + n.length + data.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  const all = Buffer.concat([...locals, cd, end]);
  return all.buffer.slice(all.byteOffset, all.byteOffset + all.length) as ArrayBuffer;
}

test("an Excel .xlsx becomes rows (shared strings, inline strings, numbers, gaps, empty rows)", async () => {
  const X = new Function(`${XLSX_SRC}; return { xlsxRows, rowsToTsv };`)() as {
    xlsxRows: (b: ArrayBuffer) => Promise<string[][]>;
    rowsToTsv: (r: string[][]) => string;
  };
  const buf = zip({
    "xl/sharedStrings.xml": `<sst><si><t>Product/Service Name</t></si><si><t>Quantity On Hand</t></si><si><r><t>265/70R17 </t></r><r><t xml:space="preserve">Goodyear &amp; Co</t></r></si></sst>`,
    "xl/worksheets/sheet1.xml": `<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="s"><v>1</v></c></row><row r="2"/><row r="3"><c r="A3" t="s"><v>2</v></c><c r="B3" t="inlineStr"><is><t>note</t></is></c><c r="C3"><v>4</v></c></row></sheetData></worksheet>`,
  });
  const rows = await X.xlsxRows(buf);
  assert.deepEqual(rows, [["Product/Service Name", "", "Quantity On Hand"], [], ["265/70R17 Goodyear & Co", "note", "4"]]);
  assert.equal(X.rowsToTsv(rows), "Product/Service Name\t\tQuantity On Hand\n\n265/70R17 Goodyear & Co\tnote\t4");
  await assert.rejects(X.xlsxRows(new ArrayBuffer(40)), /isn't an Excel/);
});

function tireShop() {
  const r = categoryRecord("auto");
  r.name = "Sample Tire Barn";
  r.variant = "tire";
  return r;
}
const items = (r: ReturnType<typeof tireShop>) =>
  r.ext.retail!.priceList!.sections.flatMap((s) => s.items.map((i) => ({ section: s.name, name: i.name, qty: i.qty, price: i.price })));

test("a QuickBooks Online product export: names, counts with decimals, prices, labour rows left out", () => {
  const r = tireShop();
  const csv = [
    "Product/Service Name,Sales Description,SKU,Type,Sales Price / Rate,Income Account,Purchase Cost,Quantity On Hand,Reorder Point",
    '265/70R17 Goodyear Wrangler,All-terrain,GY-2657017,Inventory,189.99,Sales,120,4.00,2',
    '"225/65R17 Michelin Defender",,MI-2256517,Inventory,"1,204.50",Sales,150,0.00,2',
    "Mount and balance,,,Service,25,Labor,,,",
  ].join("\n");
  const out = runImport(r, { text: csv, mode: "replace" });
  const got = items(r);
  assert.equal(got.length, 2, JSON.stringify(out.preview.columns));
  assert.deepEqual(got[0], { section: "Inventory", name: "265/70R17 Goodyear Wrangler", qty: 4, price: "$189.99" });
  assert.equal(got[1]!.qty, 0);
  assert.equal(got[1]!.price, "$1204.50");
});

test("a QuickBooks Desktop report: title lines, group rows and Total lines", () => {
  const r = tireShop();
  const text = [
    "Tire Barn Plus",
    "Inventory Valuation Summary",
    "As of October 15, 2026",
    "\tOn Hand\tAvg Cost\tAsset Value\tSales Price",
    "Tires",
    "265/70R17 Goodyear Wrangler\t4\t120.00\t480.00\t189.99",
    "LT265/75R16 BFGoodrich KO2\t2\t150.00\t300.00\t229.99",
    "Total Tires\t6\t\t780.00",
    "Wheels:Steel:16 in black steel wheel\t8\t40\t320\t69.99",
    "TOTAL\t14\t\t1100.00",
  ].join("\n");
  runImport(r, { text, mode: "replace" });
  assert.deepEqual(items(r), [
    { section: "Tires", name: "265/70R17 Goodyear Wrangler", qty: 4, price: "$189.99" },
    { section: "Tires", name: "LT265/75R16 BFGoodrich KO2", qty: 2, price: "$229.99" },
    { section: "Wheels · Steel", name: "16 in black steel wheel", qty: 8, price: "$69.99" },
  ]);
});

test("a plain list with blank counts keeps those rows as items (only report groups become sections)", () => {
  const r = tireShop();
  runImport(r, { text: "Name\tHow many\n205/55R16 Kumho\t3\n215/60R16 Hankook\t", mode: "replace" });
  assert.deepEqual(items(r).map((i) => i.name), ["205/55R16 Kumho", "215/60R16 Hankook"]);
});

test("the lookup page renders for a tire shop and its scripts parse", async () => {
  const res = lookupPage(tireShop(), "/c/abc.sig");
  const html = await res.text();
  assert.match(html, /Type a tire size, like 265\/70R17/);
  assert.match(html, /manifest" href="\/c\/abc\.sig\/find\/manifest\.webmanifest"/);
  assert.match(res.headers.get("x-robots-tag") ?? "", /noindex/);
  for (const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Function(m[1]!);
});
