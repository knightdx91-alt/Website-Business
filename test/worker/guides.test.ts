import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_ADDONS, DEFAULT_LIST_PLAN, type AppSettings } from "../../src/worker/db.ts";
import { guideById, tankBoardGuide } from "../../src/worker/guides.ts";

const settings = (over: Partial<AppSettings> = {}) => ({ plans: [{ id: "plus", name: "Plus", setup: 0, monthly: 89, includes: "" }, DEFAULT_LIST_PLAN], addons: DEFAULT_ADDONS, companyName: "Underground Associates", ...over }) as unknown as AppSettings;

test("the Tank board guide covers setup, the board, QR tags, the tablet and selling, with prices from Settings", () => {
  const g = tankBoardGuide(settings());
  assert.ok(g.sections.length >= 9);
  const titles = g.sections.map((s) => s.title.toLowerCase());
  for (const need of ["set a shop up", "tank board", "qr price tags", "tablet", "selling", "trouble"]) assert.ok(titles.some((t) => t.includes(need)), need);
  const text = JSON.stringify(g);
  assert.match(text, /Price list plan, \$29 a month, no minimum/);
  assert.match(text, /QR price tags & shelf labels: \$49 each/);
  assert.match(text, /\/d\/<lead>\/<tank>/);
  assert.equal(guideById("nope", settings()), null);
  const noList = tankBoardGuide(settings({ plans: [{ id: "plus", name: "Plus", setup: 0, monthly: 89, includes: "" }] }));
  assert.match(JSON.stringify(noList), /turn it on in Settings/);
});
