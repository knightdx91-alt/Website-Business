import assert from "node:assert/strict";
import test from "node:test";
import { EXAMPLES } from "../src/examples/examples.ts";
import { buildSite } from "../src/generator/render.ts";
import { applyTranslations, siteTexts, spanishDoc, textsOf, translatable } from "../src/generator/translate.ts";
import type { SpanishCopy } from "../src/generator/types.ts";

const ES_BASE: SpanishCopy = { heroTagline: "Hola", heroSub: "Hola", about: [], services: {}, faq: [], ctaTitle: "Venga", ctaLine: "Venga", metaDescription: "Hola" };
const sections = (h: string) => [...h.matchAll(/<section\b[^>]*>/g)].length;

test("texts: visible lines, attributes and the meta description; not scripts, links, phones, times or to-dos", () => {
  const html = `<html><head><title>Joe's Pizza | Pizza</title><meta name="description" content="Hot pizza &amp; wings"><script>var a = "Hello";</script><style>.x{}</style></head>
<body><h1>Joe's Pizza</h1><p>Call us at <a href="tel:1">(256) 555-0100</a>. Open 11 AM – 8 PM</p><img alt="A cheese pizza" src="/a.jpg"><div data-x="y" title="Menu">Menu</div>
<div class="todo" data-todo><strong>Add your hours</strong>So people know.</div><p>https://example.com</p><p>Cheese &amp; Pepperoni</p></body></html>`;
  assert.deepEqual(textsOf(html), ["Joe's Pizza | Pizza", "Hot pizza & wings", "Joe's Pizza", "Call us at", ". Open 11 AM – 8 PM", "A cheese pizza", "Menu", "Menu", "Cheese & Pepperoni"]);
  assert.equal(translatable("11 AM – 8 PM"), false);
  assert.equal(translatable("$12.99"), false);
  const out = applyTranslations(html, { "Call us at": "Llámenos al", "Cheese & Pepperoni": "Queso y pepperoni", "A cheese pizza": "Una pizza de queso", "Hot pizza & wings": "Pizza & alitas" });
  assert.ok(out.includes("<p>Llámenos al <a"));
  assert.ok(out.includes('alt="Una pizza de queso"'));
  assert.ok(out.includes("<p>Queso y pepperoni</p>"));
  assert.ok(out.includes('content="Pizza &amp; alitas"'));
  assert.ok(out.includes('var a = "Hello"'), "scripts untouched");
});

test("every page of every example site gets a full Spanish copy with the same sections", async () => {
  for (const ex of EXAMPLES) {
    const en = await buildSite({ record: ex.record, copy: { ...ex.copy, es: ES_BASE }, site: { slug: ex.slug, look: ex.design }, mode: "preview", allowSamples: true });
    const pages = [...en.files].filter(([p, v]) => typeof v === "string" && p.endsWith(".html") && !p.startsWith("es/") && p !== "404.html");
    const lines = siteTexts(pages.map(([, v]) => v as string), [ex.record.name]);
    const map = Object.fromEntries(lines.map((l) => [l, `ES ${l}`]));
    const out = await buildSite({ record: ex.record, copy: { ...ex.copy, es: { ...ES_BASE, strings: map } }, site: { slug: ex.slug, look: ex.design }, mode: "preview", allowSamples: true });
    for (const [path] of pages) {
      const enHtml = String(out.files.get(path));
      const esHtml = String(out.files.get(`es/${path}`) ?? "");
      assert.ok(esHtml, `${ex.slug}: es/${path} exists`);
      assert.equal(sections(esHtml), sections(enHtml), `${ex.slug} ${path}: same sections in Spanish`);
      assert.match(esHtml, /<html lang="es"/);
      const left = textsOf(esHtml).filter((t) => !t.startsWith("ES ") && t !== ex.record.name && t !== "English");
      assert.deepEqual(left, [], `${ex.slug} ${path}: every line translated`);
    }
    const home = String(out.files.get("es/index.html"));
    assert.ok(/href="\/es\/(#|menu\/|prices\/)?/.test(home), `${ex.slug}: links stay in Spanish`);
    assert.match(home, /lang="en">English<\/a>/);
  }
});

test("links between pages stay inside /es/; the language switch goes back to the same English page", () => {
  const html = `<html lang="en"><head><link rel="canonical" href="https://x.pages.dev/menu/"><meta property="og:url" content="https://x.pages.dev/menu/"></head><body>
<a href="/">Home</a><a href="/#visit">Visit</a><a href="/menu/">Menu</a><a href="/es/">Español</a><a href="/assets/a.pdf">PDF</a><a href="/other/">Other</a></body></html>`;
  const out = spanishDoc(html, { path: "/menu/", pagePaths: ["/", "/menu/"], origin: "https://x.pages.dev", map: { Home: "Inicio" } });
  assert.ok(out.includes('<a href="/es/">Inicio</a>'));
  assert.ok(out.includes('href="/es/#visit"'));
  assert.ok(out.includes('href="/es/menu/"'));
  assert.ok(out.includes('<a href="/menu/" lang="en" hreflang="en">English</a>'));
  assert.ok(out.includes('href="/assets/a.pdf"') && out.includes('href="/other/"'));
  assert.ok(out.includes('href="https://x.pages.dev/es/menu/"') && out.includes('content="https://x.pages.dev/es/menu/"'));
  assert.match(out, /<html lang="es"/);
});

test("language switch: header button on every page, a marker for the Spanish copy, English back without a clashing lang", async () => {
  const ex = EXAMPLES[0]!;
  const out = await buildSite({ record: ex.record, copy: { ...ex.copy, es: { ...ES_BASE, strings: { Menu: "Menú" } } }, site: { slug: ex.slug, look: ex.design }, mode: "preview", allowSamples: true });
  const home = String(out.files.get("index.html"));
  assert.match(home, /<a class="hdr__lang" href="\/es\/" lang="es" hreflang="es">Español<\/a>/);
  assert.match(home, /<link rel="ua-es" href="\/es\/">/);
  const esHome = String(out.files.get("es/index.html"));
  const sw = esHome.match(/<a class="hdr__lang"[^>]*>[^<]*<\/a>/)![0];
  assert.equal(sw, '<a class="hdr__lang" href="/" lang="en" hreflang="en">English</a>');
  assert.ok(!/<a[^>]*lang="es"[^>]*lang="en"/.test(esHome), "no link carries both languages");
  // Without full-site strings the one-page summary still switches back to English.
  const summary = await buildSite({ record: ex.record, copy: { ...ex.copy, es: ES_BASE }, site: { slug: ex.slug, look: ex.design }, mode: "preview", allowSamples: true });
  assert.match(String(summary.files.get("es/index.html")), /<a class="hdr__lang" href="\/" lang="en" hreflang="en">English<\/a>/);
  // No Spanish copy: no switch at all.
  const plain = await buildSite({ record: ex.record, copy: ex.copy, site: { slug: ex.slug, look: ex.design }, mode: "preview", allowSamples: true });
  assert.ok(!String(plain.files.get("index.html")).includes("hdr__lang"));
});
