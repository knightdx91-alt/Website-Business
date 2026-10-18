import assert from "node:assert/strict";
import test from "node:test";
import { embedScript, embedSnippets, installPage, RENDER, stockPage } from "../../src/worker/embed.ts";

const scripts = (html: string) => [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]!);

const FEED = {
  title: "In the tanks",
  updatedAt: "Oct 18, 3:10 PM",
  words: { item: "Fish", emoji: "🐠", empty: "Empty" },
  sections: [
    { name: "Tank 1", slug: "tank-1", note: "Freshwater", items: [
      { name: "Neon tetra", price: "$2.99", qty: 3, note: "Schooling", image: "https://app.example/l/x/photo/a.jpg", facts: [["Max size", "1.5 in"]], info: { notes: "Keep 6+" } },
      { name: "<b>Evil</b>", price: "$1", qty: 20, image: "javascript:alert(1)", facts: [] },
    ] },
    { name: "Tank 2", slug: "tank-2", note: "", items: [{ name: "Betta", price: "$12", qty: null, facts: [] }] },
  ],
};

function render(opts: Record<string, unknown> = {}, feed: unknown = FEED) {
  const host = { innerHTML: "", querySelector: () => null, querySelectorAll: () => [] };
  (new Function(`${RENDER}; return UAS;`)() as (h: unknown, d: unknown, o: unknown) => void)(host, feed, opts);
  return host.innerHTML;
}

test("the renderer draws sections, prices, low counts and care cards, and escapes everything", () => {
  const h = render();
  assert.match(h, /In the tanks/);
  assert.match(h, /data-uas-go="tank-1"/);
  assert.match(h, /Neon tetra.*\$2\.99/s);
  assert.match(h, /3 left/);
  assert.doesNotMatch(h, /20 left/);
  assert.match(h, /About this one.*Max size.*1\.5 in.*Keep 6\+/s);
  assert.match(h, /&lt;b&gt;Evil&lt;\/b&gt;/);
  assert.doesNotMatch(h, /javascript:/);
  assert.match(h, /src="https:\/\/app\.example\/l\/x\/photo\/a\.jpg"/);
});

test("one tank only, accent color and the empty list", () => {
  const h = render({ tank: "tank-2", accent: "#0a7d8c" });
  assert.match(h, /Betta/);
  assert.doesNotMatch(h, /Neon/);
  assert.doesNotMatch(h, /uas-chips/);
  assert.match(h, /--uas-accent:#0a7d8c/);
  assert.match(render({}, { ...FEED, sections: [] }), /Empty/);
});

test("the script, the frame page and the install page all parse", () => {
  new Function(embedScript("abc123", "https://app.example"));
  for (const bare of [true, false]) for (const s of scripts(stockPage("abc123", "King Fish", { bare, tank: "tank-1", accent: "#123" }))) new Function(s);
  const ip = installPage("abc123", "King Fish <Aquatics>", "Tank board", "https://app.example");
  for (const s of scripts(ip)) new Function(s);
  assert.match(ip, /King Fish &lt;Aquatics&gt;/);
  assert.match(ip, /https:\/\/app\.example\/l\/abc123\/embed\.js/);
  assert.match(ip, /https:\/\/app\.example\/l\/abc123\/stock/);
});

test("bad tank or accent values never reach the frame page", () => {
  const p = stockPage("abc123", "X", { bare: true, tank: '"><script>', accent: "red;}" });
  assert.doesNotMatch(p, /"><script>/);
  assert.doesNotMatch(p, /red;}/);
});

test("snippets point at the lead and check the frame's origin", () => {
  const s = embedSnippets("abc123", "https://app.example");
  assert.match(s.script, /<div id="ua-stock"><\/div>/);
  assert.match(s.iframe, /e\.origin==="https:\/\/app\.example"/);
  assert.equal(s.link, "https://app.example/l/abc123/stock");
});
