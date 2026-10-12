import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * D1 caps a LIKE / GLOB pattern at 50 bytes ("LIKE or GLOB pattern too complex"). A pattern built from a business
 * name ("Owner updated Cullman First Congregational's website%") went past it, so every design change or edit on
 * that lead failed. Worker SQL may use LIKE only with a literal pattern; anything bound from data compares with
 * substr() / instr() instead.
 */
describe("worker SQL LIKE patterns", () => {
  const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "src", "worker");
  const files = readdirSync(dir).filter((f) => f.endsWith(".ts"));
  it("never binds a LIKE pattern", () => {
    const bad: string[] = [];
    for (const f of files) {
      const src = readFileSync(join(dir, f), "utf8");
      const lines = src.split("\n");
      lines.forEach((line, i) => {
        if (/\b(NOT\s+)?LIKE\s+\?/.test(line)) bad.push(`${f}:${i + 1}: ${line.trim()}`);
      });
    }
    assert.deepEqual(bad, []);
  });
  it("every literal LIKE pattern is under D1's 50-byte cap", () => {
    const long: string[] = [];
    for (const f of files) {
      const src = readFileSync(join(dir, f), "utf8");
      for (const m of src.matchAll(/\bLIKE\s+'((?:[^'\\]|\\.)*)'/g))
        if (Buffer.byteLength(m[1]) > 50) long.push(`${f}: ${m[1]}`);
    }
    assert.deepEqual(long, []);
  });
  it("the site-updated alert folds by prefix with substr", () => {
    const src = readFileSync(join(dir, "index.ts"), "utf8");
    assert.match(src, /substr\(text, 1, length\(\?1\)\) = \?1/);
  });
});
