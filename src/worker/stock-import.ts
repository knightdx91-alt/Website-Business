import type {
  BusinessRecord,
  ItemInfo,
  ListKind,
  MenuItem,
  MenuSection,
} from "../generator/types.ts";
import { KINDS, listKind } from "../generator/pricelist.ts";
import { autoMatchPhotos } from "../generator/packs/retail.ts";
import { normalizeCode } from "./tablet.ts";
import { priceList, stamp } from "./tankboard.ts";

/**
 * Bulk inventory import: a whole stock list at once, for any business (built so an auto parts store or a feed store can
 * put hundreds of items on the board without typing them). The shop pastes the cells from Excel / Google Sheets / their
 * POS export (tab-separated), or uploads a .csv. We detect the delimiter, read the header row and guess which column is
 * the name, price, count, barcode, section (category / aisle / bin) and note; the page shows the guess and lets them fix
 * it before anything changes. Extra columns that match the kind's info-card fields (part #, brand, fits, …) become facts
 * on the item's card. "Add / update" matches rows to what's on the board by barcode, then by name, and only touches those
 * (photos, cards and hand-typed notes stay); "Replace everything" rebuilds the sections from the sheet, keeping photos and
 * cards by name. Caps keep the record small enough for D1 and the page quick: 100 sections, 2,000 items.
 */

export const IMPORT_MAX_ITEMS = 2000;
export const IMPORT_MAX_SECTIONS = 100;

export type Field =
  | "name"
  | "price"
  | "qty"
  | "barcode"
  | "section"
  | "note"
  | "skip"
  | `info:${string}`;

const HEADERS: Array<[Field, RegExp]> = [
  [
    "barcode",
    /^(barcode|bar code|upc|ean|gtin|sku|item ?(#|no|number|code)|code)$/i,
  ],
  [
    "section",
    /^(section|category|categories|department|dept|aisle|tank|shelf|bin|row|case|bench|enclosure|group|location|loc|area|type)$/i,
  ],
  [
    "qty",
    /^(qty|quantity|on ?hand|onhand|stock|in ?stock|count|available|avail|inventory|units|how many|left)$/i,
  ],
  [
    "price",
    /^(price|retail|retail price|sell(ing)? price|unit price|msrp|list price|price each|each|\$)$/i,
  ],
  [
    "name",
    /^(name|item|item name|product|product name|title|description|desc|part name|part|what)$/i,
  ],
  ["note", /^(note|notes|details|size|comment|comments|remarks|memo|info)$/i],
];

function guessField(header: string, kind: ListKind): Field | null {
  const h = header
    .trim()
    .toLowerCase()
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ");
  if (!h) return null;
  for (const [f, re] of HEADERS) if (re.test(h)) return f;
  for (const [key, label] of KINDS[kind].fields)
    if (h === label.toLowerCase() || h === key.toLowerCase())
      return `info:${key}`;
  if (/part/.test(h) && /#|no|num/.test(h))
    return kind === "parts" ? "info:partNumber" : "barcode";
  if (/brand|make|mfr|manufacturer/.test(h)) return "info:brand";
  if (/fits|application|compat/.test(h)) return "info:fits";
  if (/condition|grade/.test(h)) return "info:condition";
  if (/warranty/.test(h)) return "info:warranty";
  if (/\bcost\b|wholesale/.test(h)) return "skip";
  return null;
}

/** Splits pasted text or a CSV into rows: tabs win (a paste from a spreadsheet), then commas, semicolons, pipes. */
export function parseTable(text: string): {
  rows: string[][];
  delimiter: string;
} {
  const t = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const head = t.split("\n").slice(0, 20).join("\n");
  const count = (ch: string) =>
    (head.match(new RegExp(ch === "|" ? "\\|" : ch, "g")) ?? []).length;
  const delimiter = count("\t")
    ? "\t"
    : count(",") >= count(";") && count(",") >= count("|")
      ? ","
      : count(";") >= count("|")
        ? ";"
        : "|";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i]!;
    if (quoted) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += c;
    } else if (c === '"' && cell === "") quoted = true;
    else if (c === delimiter) {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return {
    rows: rows
      .map((r) => r.map((x) => x.trim()))
      .filter((r) => r.some((x) => x !== "")),
    delimiter,
  };
}

export interface ColumnGuess {
  header: string;
  field: Field;
  sample: string;
}

const looksPrice = (v: string) =>
  /^\$?\s*\d{1,6}([.,]\d{1,2})?\s*(\/|each|ea\.?)?$/i.test(v.trim()) &&
  v.trim() !== "";
const looksInt = (v: string) => /^\d{1,4}$/.test(v.trim());
const looksCode = (v: string) => /^\d{8,14}$/.test(v.trim());

/** Reads the first row as headers when it has no numbers; otherwise guesses from the data (name = first text column, …). */
export function detectColumns(
  rows: string[][],
  kind: ListKind,
): { columns: ColumnGuess[]; hasHeader: boolean } {
  if (!rows.length) return { columns: [], hasHeader: false };
  const width = Math.max(...rows.map((r) => r.length));
  const first = rows[0]!;
  const hasHeader =
    first.every((v) => !looksPrice(v) && !looksCode(v) && !looksInt(v)) &&
    first.some((v) => guessField(v, kind) !== null);
  const data = hasHeader ? rows.slice(1) : rows;
  const columns: ColumnGuess[] = [];
  const used = new Set<Field>();
  for (let i = 0; i < width; i++) {
    const header = hasHeader ? (first[i] ?? "") : "";
    const values = data.map((r) => r[i] ?? "").filter(Boolean);
    const sample = values[0] ?? "";
    let field: Field | null = hasHeader ? guessField(header, kind) : null;
    if (!field) {
      const n = values.length || 1;
      const share = (f: (v: string) => boolean) => values.filter(f).length / n;
      if (values.length && share(looksCode) > 0.6) field = "barcode";
      else if (
        values.length &&
        share(looksPrice) > 0.6 &&
        (values.some((v) => /[$.]/.test(v)) || used.has("qty"))
      )
        field = "price";
      else if (values.length && share(looksInt) > 0.6)
        field = used.has("qty") ? "price" : "qty";
      else if (!used.has("name")) field = "name";
      else if (
        !used.has("section") &&
        values.length &&
        new Set(values.map((v) => v.toLowerCase())).size <=
          Math.max(2, values.length / 3)
      )
        field = "section";
      else if (!used.has("note")) field = "note";
      else field = "skip";
    }
    if (field !== "skip" && !field.startsWith("info:") && used.has(field))
      field = field === "name" ? "note" : "skip";
    used.add(field);
    columns.push({ header, field, sample });
  }
  if (!used.has("name")) {
    const i = columns.findIndex(
      (c) => c.field === "note" || c.field === "skip",
    );
    if (i >= 0) columns[i]!.field = "name";
  }
  return { columns, hasHeader };
}

export interface ImportRow {
  section: string;
  name: string;
  price?: string;
  qty?: number;
  barcode?: string;
  note?: string;
  facts: Array<{ key: string; value: string }>;
}

function cleanPrice(v: string): string | undefined {
  const t = v.trim();
  if (!t) return undefined;
  const m = t.match(
    /^\$?\s*(\d{1,6}(?:[.,]\d{1,2})?)\s*(?:\/\s*(\w+)|(each|ea\.?))?$/i,
  );
  if (!m) return t.slice(0, 30);
  const n = Number(m[1]!.replace(",", "."));
  const money = Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
  return m[2] ? `${money}/${m[2]}` : money;
}

/** Turns the table into rows under the chosen columns; blank names are skipped, sections default to `fallback`. */
export function rowsFrom(
  rows: string[][],
  columns: Field[],
  hasHeader: boolean,
  fallback: string,
): ImportRow[] {
  const out: ImportRow[] = [];
  const data = hasHeader ? rows.slice(1) : rows;
  const ix = (f: Field) => columns.indexOf(f);
  for (const r of data) {
    const cell = (f: Field) => (ix(f) >= 0 ? (r[ix(f)] ?? "").trim() : "");
    const name = cell("name").slice(0, 120);
    if (!name) continue;
    const qtyText = cell("qty").replace(/[^\d-]/g, "");
    const qty =
      qtyText === ""
        ? undefined
        : Math.max(0, Math.min(9999, parseInt(qtyText, 10) || 0));
    const facts: ImportRow["facts"] = [];
    columns.forEach((f, i) => {
      if (f.startsWith("info:") && (r[i] ?? "").trim())
        facts.push({
          key: f.slice(5),
          value: (r[i] ?? "").trim().slice(0, 120),
        });
    });
    out.push({
      section: (cell("section") || fallback).slice(0, 60),
      name,
      price: cleanPrice(cell("price")),
      qty,
      barcode: normalizeCode(cell("barcode")) || undefined,
      note: cell("note").slice(0, 200) || undefined,
      facts,
    });
    if (out.length >= IMPORT_MAX_ITEMS) break;
  }
  return out;
}

function withFacts(
  info: ItemInfo | undefined,
  facts: ImportRow["facts"],
  kind: ListKind,
): ItemInfo | undefined {
  if (!facts.length) return info;
  const labels = new Map(
    KINDS[kind].fields.map(([key, label]) => [key, label]),
  );
  const next: ItemInfo = { ...(info ?? {}), facts: [...(info?.facts ?? [])] };
  for (const f of facts) {
    const label = labels.get(f.key) ?? f.key;
    const i = next.facts!.findIndex(
      (x) => x.label.toLowerCase() === label.toLowerCase(),
    );
    if (i >= 0) next.facts![i] = { label, value: f.value };
    else next.facts!.push({ label, value: f.value });
  }
  return next;
}

export interface ImportResult {
  added: number;
  updated: number;
  sections: number;
  items: number;
  skipped: number;
}

/** Applies the rows. `merge` updates matching items (barcode, then name) and adds the rest; `replace` rebuilds the list. */
export function importRows(
  record: BusinessRecord,
  rows: ImportRow[],
  mode: "merge" | "replace",
): ImportResult {
  const pl = priceList(record);
  const kind = listKind(record);
  let added = 0;
  let updated = 0;
  let skipped = 0;
  const sections: MenuSection[] =
    mode === "replace"
      ? []
      : pl.sections.map((s) => ({ ...s, items: [...s.items] }));
  // Everything the shop ever had, by name and by barcode: photos and cards come back on a re-import.
  const byName = new Map<string, MenuItem>();
  const byCode = new Map<string, MenuItem>();
  for (const c of pl.catalog ?? []) {
    byName.set(c.name.toLowerCase(), {
      name: c.name,
      price: c.price,
      image: c.image,
      info: c.info,
      barcode: c.barcode,
    });
    if (c.barcode) byCode.set(c.barcode, byName.get(c.name.toLowerCase())!);
  }
  for (const s of pl.sections)
    for (const it of s.items) {
      byName.set(it.name.toLowerCase(), it);
      if (it.barcode) byCode.set(it.barcode, it);
    }
  const onBoard = (
    r: ImportRow,
  ): { sec: MenuSection; item: MenuItem } | null => {
    for (const sec of sections) {
      const item =
        (r.barcode && sec.items.find((it) => it.barcode === r.barcode)) ||
        sec.items.find((it) => it.name.toLowerCase() === r.name.toLowerCase());
      if (
        item &&
        (sec.name === r.section ||
          !rows.some((x) => x !== r && x.section === sec.name) ||
          mode === "merge")
      )
        return { sec, item };
    }
    return null;
  };
  for (const r of rows) {
    const total = sections.reduce((n, s) => n + s.items.length, 0);
    const hit = mode === "merge" ? onBoard(r) : null;
    if (hit) {
      const it = hit.item;
      if (r.price) it.price = r.price;
      if (r.qty !== undefined) {
        it.qty = r.qty;
        it.soldOut = r.qty === 0 ? true : undefined;
      }
      if (r.note) it.description = r.note;
      if (r.barcode) it.barcode = r.barcode;
      it.info = withFacts(it.info, r.facts, kind);
      updated++;
      continue;
    }
    if (total >= IMPORT_MAX_ITEMS) {
      skipped++;
      continue;
    }
    let sec = sections.find(
      (s) => s.name.toLowerCase() === r.section.toLowerCase(),
    );
    if (!sec) {
      if (sections.length >= IMPORT_MAX_SECTIONS) {
        skipped++;
        continue;
      }
      sec = { name: r.section, items: [] };
      sections.push(sec);
    }
    const known =
      (r.barcode && byCode.get(r.barcode)) || byName.get(r.name.toLowerCase());
    const dup = sec.items.find(
      (it) => it.name.toLowerCase() === r.name.toLowerCase(),
    );
    if (dup && mode === "replace") {
      // The same name twice in one section of the sheet: the later row's count adds up.
      if (r.qty !== undefined) dup.qty = Math.min(9999, (dup.qty ?? 0) + r.qty);
      if (r.price) dup.price = r.price;
      updated++;
      continue;
    }
    const item: MenuItem = {
      name: known?.name ?? r.name,
      price: r.price ?? known?.price,
      description: r.note ?? known?.description,
      qty: r.qty,
      soldOut: r.qty === 0 ? true : undefined,
      image: known?.image,
      info: withFacts(known?.info, r.facts, kind),
      barcode: r.barcode ?? known?.barcode,
    };
    sec.items.push(item);
    added++;
  }
  autoMatchPhotos(sections, record.media.gallery);
  record.ext.retail!.priceList = { ...pl, sections, lastUpdated: stamp() };
  return {
    added,
    updated,
    sections: sections.length,
    items: sections.reduce((n, s) => n + s.items.length, 0),
    skipped,
  };
}

/** The whole list as a spreadsheet (also the template a shop fills in): section, name, price, how many, barcode, note, sold out. */
export function exportCsv(record: BusinessRecord): string {
  const kind = listKind(record);
  const W = KINDS[kind];
  const extra = W.fields.map(([, label]) => label);
  const q = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    [
      W.section,
      "Name",
      "Price",
      "How many",
      "Barcode",
      "Note",
      "Sold out",
      ...extra,
    ]
      .map(q)
      .join(","),
  ];
  for (const s of priceList(record).sections)
    for (const it of s.items) {
      const facts = new Map(
        (it.info?.facts ?? []).map((f) => [f.label.toLowerCase(), f.value]),
      );
      const info = (it.info ?? {}) as unknown as Record<string, unknown>;
      const cells = W.fields.map(([key, label]) =>
        typeof info[key] === "string"
          ? (info[key] as string)
          : (facts.get(label.toLowerCase()) ?? ""),
      );
      lines.push(
        [
          s.name,
          it.name,
          it.price ?? "",
          it.qty ?? "",
          it.barcode ?? "",
          it.description ?? "",
          it.soldOut ? "yes" : "",
          ...cells,
        ]
          .map(q)
          .join(","),
      );
    }
  return lines.join("\n") + "\n";
}

/** The columns as the page shows them: what each field means, in the kind's words. */
export function fieldChoices(kind: ListKind): Array<[Field, string]> {
  const W = KINDS[kind];
  const out: Array<[Field, string]> = [
    ["name", "Name"],
    ["price", "Price"],
    ["qty", "How many"],
    ["barcode", "Barcode / SKU"],
    ["section", `${W.section} / section`],
    ["note", "Note"],
  ];
  for (const [key, label] of W.fields)
    out.push([`info:${key}`, `Card: ${label}`]);
  out.push(["skip", "Skip this column"]);
  return out;
}
