import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_ADDONS, DEFAULT_LIST_PLAN, type AppSettings } from "../../src/worker/db.ts";
import { customerBoardPitch, displayGuide, guideById, priceTagsGuide, tankBoardGuide } from "../../src/worker/guides.ts";

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
  const tags = priceTagsGuide(settings());
  assert.equal(guideById("pricetags", settings())?.id, "pricetags");
  const tagTitles = tags.sections.map((x) => x.title.toLowerCase());
  for (const need of ["what a sheet is", "before you can print", "print the sheet", "print again", "sell", "after they pay", "trouble"]) assert.ok(tagTitles.some((t) => t.includes(need)), need);
  assert.match(JSON.stringify(tags), /\$49 each/);
  assert.match(JSON.stringify(tags), /8 labels per sheet/);
  const disp = displayGuide(settings());
  assert.equal(guideById("display", settings())?.id, "display");
  const dispTitles = disp.sections.map((x) => x.title.toLowerCase());
  for (const need of ["what it shows", "getting the address", "set up a tablet", "mounting", "shop needs to know", "selling", "trouble"]) assert.ok(dispTitles.some((t) => t.includes(need)), need);
  assert.match(JSON.stringify(disp), /\/d\/<lead>\/<tank-name>/);
  assert.match(JSON.stringify(disp), /App pinning/);
  const pitch = customerBoardPitch(settings(), { business: "King Fish Aquatics", live: false });
  assert.match(pitch.lead, /^King Fish Aquatics changes/);
  assert.deepEqual(pitch.sections.map((x) => x.title), ["How it works", "What you do", "What your customers get", "What Underground Associates does"]);
  assert.match(pitch.price[0]!, /Price list, \$29 a month\. No minimum/);
  assert.match(pitch.price[1]!, /from \$89 a month/);
  assert.match(pitch.fine, /isn't live yet/);
  assert.match(customerBoardPitch(settings(), { business: "X", live: true }).fine, /live now/);
  const noList = tankBoardGuide(settings({ plans: [{ id: "plus", name: "Plus", setup: 0, monthly: 89, includes: "" }] }));
  assert.match(JSON.stringify(noList), /turn it on in Settings/);
});
