import assert from "node:assert/strict";
import { test } from "node:test";
import { menuToText, parseMenuText } from "../src/generator/menu.ts";

test("a menu section line can carry a note, and it survives a round trip", () => {
  const text = "# Wraps | $13 each, served with one side\nBBQ Chicken | $13 | Grilled chicken, bacon\n\n# Desserts\nBrownie | $3.25";
  const s = parseMenuText(text);
  assert.equal(s[0]!.name, "Wraps");
  assert.equal(s[0]!.note, "$13 each, served with one side");
  assert.equal(s[1]!.note, undefined);
  assert.equal(menuToText(s), text);
});
