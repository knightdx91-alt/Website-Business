import assert from "node:assert/strict";
import test from "node:test";
import { parseMenuText } from "../../src/generator/menu.ts";
import {
  detectColumns,
  exportCsv,
  importRows,
  parseTable,
  rowsFrom,
} from "../../src/worker/stock-import.ts";
import { runImport } from "../../src/worker/tankboard.ts";
import { categoryRecord } from "../fixtures.ts";

function partsStore() {
  const r = categoryRecord("auto");
  r.name = "Cullman Auto Parts";
  r.variant = "parts";
  (r.ext.retail ??= {}).priceList = {
    sections: parseMenuText(
      "# Aisle 1\nOil filter PH3614 | $6.99 | Fram\nWiper blade 22 in | $12",
    ),
    lastUpdated: "",
    public: true,
  };
  r.ext.retail.priceList.sections[0]!.items[0]!.barcode = "00025338041";
  r.ext.retail.priceList.sections[0]!.items[0]!.image = {
    src: "/assets/owner/g1.jpg",
    alt: "filter",
    source: "owner",
  };
  return r;
}

test("a paste from a spreadsheet is read as tabs; a CSV with quotes and a BOM reads too", () => {
  const tsv = parseTable(
    "Name\tPrice\tQty\nOil filter\t$6.99\t12\nBrake pads, front\t45\t3\n",
  );
  assert.equal(tsv.delimiter, "\t");
  assert.deepEqual(tsv.rows[2], ["Brake pads, front", "45", "3"]);
  const csv = parseTable(
    '﻿name,price,"on hand"\n"Pads, front ""ceramic""",45.5,3\n\n',
  );
  assert.equal(csv.delimiter, ",");
  assert.deepEqual(csv.rows, [
    ["name", "price", "on hand"],
    ['Pads, front "ceramic"', "45.5", "3"],
  ]);
});

test("columns are guessed from POS-style headings, and from the data when there are none", () => {
  const { columns, hasHeader } = detectColumns(
    parseTable(
      "Description,Retail,On Hand,UPC,Dept,Part #,Brand\nOil filter,6.99,12,000253380412,Filters,PH3614,Fram",
    ).rows,
    "parts",
  );
  assert.equal(hasHeader, true);
  assert.deepEqual(
    columns.map((c) => c.field),
    [
      "name",
      "price",
      "qty",
      "barcode",
      "section",
      "info:partNumber",
      "info:brand",
    ],
  );
  const bare = detectColumns(
    parseTable("Neon tetra\t2.99\t40\nGuppy\t3.49\t12").rows,
    "fish",
  );
  assert.equal(bare.hasHeader, false);
  assert.deepEqual(
    bare.columns.map((c) => c.field),
    ["name", "price", "qty"],
  );
});

test("merge updates by barcode then name and adds the rest; cards get the kind's facts; photos stay", () => {
  const r = partsStore();
  const rows = rowsFrom(
    parseTable(
      "UPC,Description,Retail,On Hand,Aisle,Part #,Brand\n00025338041,FRAM oil filter,$7.49,30,Aisle 1,PH3614,Fram\n,Wiper blade 22 in,,0,,,\n,Spark plug,3.99,100,Aisle 2,,NGK",
    ).rows,
    [
      "barcode",
      "name",
      "price",
      "qty",
      "section",
      "info:partNumber",
      "info:brand",
    ],
    true,
    "Aisle 1",
  );
  const out = importRows(r, rows, "merge");
  assert.deepEqual(out, {
    added: 1,
    updated: 2,
    sections: 2,
    items: 3,
    skipped: 0,
  });
  const pl = r.ext.retail!.priceList!;
  const filter = pl.sections[0]!.items[0]!;
  assert.equal(
    filter.name,
    "Oil filter PH3614",
    "matched by barcode, name kept",
  );
  assert.equal(filter.price, "$7.49");
  assert.equal(filter.qty, 30);
  assert.equal(filter.image?.src, "/assets/owner/g1.jpg");
  assert.deepEqual(filter.info?.facts, [
    { label: "Part # / size", value: "PH3614" },
    { label: "Brand", value: "Fram" },
  ]);
  const wiper = pl.sections[0]!.items[1]!;
  assert.equal(wiper.qty, 0);
  assert.equal(wiper.soldOut, true);
  assert.equal(pl.sections[1]!.name, "Aisle 2");
  assert.equal(pl.sections[1]!.items[0]!.info?.facts?.[0]?.value, "NGK");
  assert.ok(pl.lastUpdated);
});

test("replace rebuilds the sections from the sheet but keeps photos, cards and barcodes by name", () => {
  const r = partsStore();
  const rows = rowsFrom(
    parseTable(
      "Item,Price,Category\nOil filter PH3614,6.49,Filters\nAir filter CA10171,14.99,Filters\nOil filter PH3614,6.49,Filters",
    ).rows,
    ["name", "price", "section"],
    true,
    "Shelf",
  );
  const out = importRows(r, rows, "replace");
  assert.equal(out.sections, 1);
  assert.equal(out.items, 2, "the duplicate row folded into one");
  const pl = r.ext.retail!.priceList!;
  assert.equal(pl.sections[0]!.name, "Filters");
  assert.equal(pl.sections[0]!.items[0]!.barcode, "00025338041");
  assert.equal(pl.sections[0]!.items[0]!.image?.src, "/assets/owner/g1.jpg");
});

test("the cap holds the board at 2,000 items and reports what was skipped", () => {
  const r = partsStore();
  const rows = rowsFrom(
    Array.from({ length: 2100 }, (_, i) => [`Part ${i}`, "1"]),
    ["name", "price"],
    false,
    "Bin",
  );
  assert.equal(rows.length, 2000);
  const out = importRows(r, rows, "replace");
  assert.equal(out.items, 2000);
});

test("runImport: dry run, then the real thing", () => {
  const r = partsStore();
  const before = JSON.stringify(r.ext.retail!.priceList);
  const dry = runImport(r, {
    text: "Description,Retail,Bin\nBattery 24F,129.99,Batteries",
    mode: "merge",
    dryRun: true,
  });
  assert.equal(dry.preview.rows, 1);
  assert.equal(dry.preview.columns[0]!.field, "name");
  assert.equal(dry.preview.columns[2]!.field, "section");
  assert.ok(
    dry.preview.choices.some(([f]) => f === "info:partNumber"),
    "parts kind offers the part-number card field",
  );
  assert.equal(dry.result, undefined);
  assert.equal(
    JSON.stringify(r.ext.retail!.priceList),
    before,
    "nothing changed on a dry run",
  );
  assert.throws(
    () =>
      runImport(r, {
        text: "5,3\n6,4",
        mode: "merge",
        columns: ["price", "qty"],
        hasHeader: false,
      }),
    /which column is the name/,
  );
  const real = runImport(r, {
    text: "Description,Retail,Bin\nBattery 24F,129.99,Batteries",
    mode: "merge",
  });
  assert.equal(real.result?.added, 1);
  assert.equal(r.ext.retail!.priceList!.sections.at(-1)!.name, "Batteries");
});

test("the export is a spreadsheet the shop can fill in and bring back", () => {
  const r = partsStore();
  r.ext.retail!.priceList!.sections[0]!.items[0]!.info = {
    facts: [{ label: "Brand", value: "Fram" }],
  };
  const csv = exportCsv(r);
  assert.match(
    csv.split("\n")[0]!,
    /^Bin,Name,Price,How many,Barcode,Note,Sold out,Part # \/ size,Fits,Brand/,
  );
  assert.match(
    csv,
    /Aisle 1,Oil filter PH3614,\$6\.99,,00025338041,Fram,,,,Fram/,
  );
  const back = runImport(r, { text: csv, mode: "replace", dryRun: true });
  assert.equal(back.preview.rows, 2);
  assert.deepEqual(
    back.preview.columns.slice(0, 3).map((c) => c.field),
    ["section", "name", "price"],
  );
});
