import assert from "node:assert/strict";
import { test } from "node:test";
import { previewFlyerPdf, qrGrid, reviewCardsPdf, tableTentsPdf, windowSignPdf } from "../../src/worker/cards.ts";
import { contractSections, parsePicks } from "../../src/worker/signup.ts";

const text = (b: Uint8Array) => new TextDecoder("latin1").decode(b);

test("QR grids are square, have finder patterns and encode something", () => {
  const g = qrGrid("https://example.test/s/abc.123.def/");
  assert.ok(g.length >= 21 && g.every((r) => r.length === g.length));
  assert.equal(g[0]!.slice(0, 7), "1111111", "top-left finder pattern");
  assert.equal(g[0]!.slice(-7), "1111111", "top-right finder pattern");
  assert.ok(g.some((r) => r.includes("0")));
});

test("every printable is a one-page PDF with the business name and QR rectangles", () => {
  const docs = {
    cards: reviewCardsPdf("Rusty's Diner", "ChIJtest"),
    tents: tableTentsPdf({ business: "Rusty's Diner", siteUrl: "https://rustys.pages.dev/menu/", menu: true, placeId: "ChIJtest" }),
    window: windowSignPdf({ business: "Rusty's Diner", siteUrl: "https://rustys.pages.dev/", phone: "(256) 555-0100", placeId: "ChIJtest", menu: false }),
    flyer: previewFlyerPdf({ business: "Rusty's Diner", previewUrl: "https://app.test/s/x.1.y/", company: "Underground Associates", phone: "(256) 555-0199", caller: "Post", days: 60 }),
  };
  for (const [name, bytes] of Object.entries(docs)) {
    const s = text(bytes);
    assert.ok(s.startsWith("%PDF-1.4"), name);
    assert.ok(s.includes("/Count 1"), `${name} has one page`);
    assert.ok(s.includes("Rusty's Diner"), `${name} names the business`);
    assert.ok((s.match(/ re f\n/g) || []).length > 100, `${name} draws QR modules`);
    assert.ok(s.trimEnd().endsWith("%%EOF"), name);
  }
  assert.ok(text(docs.tents).includes("-1 0 0 -1"), "the tent's top panel is rotated");
  assert.ok(text(docs.window).includes("\\(256\\) 555-0100"), "parentheses are escaped in PDF strings");
});

test("agreement text splits into sections at ALL-CAPS headings; picks parse safely", () => {
  const sections = contractSections("Website Service Agreement\nYOUR ORDER\n- Plus plan\n- Setup fee\n\nHOW YOU PAY\nMonthly by card.\nELECTRONIC SIGNATURE\nYou agree.");
  assert.deepEqual(sections.map((s) => s.heading), ["", "YOUR ORDER", "HOW YOU PAY", "ELECTRONIC SIGNATURE"]);
  assert.equal(sections[1]!.text, "- Plus plan\n- Setup fee");
  assert.deepEqual(parsePicks("0:1,3:2,3:9,x,40", 5), [{ index: 0, qty: 1 }, { index: 3, qty: 2 }]);
  assert.deepEqual(parsePicks("2:99", 5), [{ index: 2, qty: 20 }]);
  assert.deepEqual(parsePicks(undefined, 5), []);
});
