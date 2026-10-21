import assert from "node:assert/strict";
import { test } from "node:test";
import { EXAMPLES } from "../src/examples/examples.ts";
import { buildSite } from "../src/generator/render.ts";

test("every example site passes the publish gate", async () => {
  for (const ex of EXAMPLES) {
    const out = await buildSite({ record: ex.record, copy: ex.copy, site: { slug: ex.slug, look: ex.design, origin: "https://example.test" }, mode: "publish", allowSamples: true });
    assert.ok(out.files.get("index.html"), ex.slug);
  }
});

test("live sites carry the credit (no Request a change link); previews don't", async () => {
  const ex = EXAMPLES[1]!;
  const credit = { company: "Underground Associates", url: "https://undergroundassociates.com", changeUrl: "https://undergroundassociates.com/change?b=abc123" };
  const live = await buildSite({ record: ex.record, copy: ex.copy, site: { slug: ex.slug, look: ex.design, origin: "https://example.test" }, mode: "publish", allowSamples: true, credit });
  const home = String(live.files.get("index.html"));
  assert.match(home, /Website by <a href="https:\/\/undergroundassociates.com" rel="nofollow">Underground Associates<\/a>/);
  assert.doesNotMatch(home, /change\?b=abc123|Request a change/);
  const preview = await buildSite({ record: ex.record, copy: ex.copy, site: { slug: ex.slug, look: ex.design }, mode: "preview", credit });
  assert.doesNotMatch(String(preview.files.get("index.html")), /Website by/);
});

test("owner gallery photos and hiring show on the home page", async () => {
  const ex = EXAMPLES[3]!;
  const record = structuredClone(ex.record);
  record.media.gallery = [{ src: "/assets/owner/g1.jpg", alt: "Bay with a lifted truck", source: "owner", width: 1200, height: 900 }];
  record.hiring = { roles: ["Mechanic", "Service writer"], how: "Stop by with a resume or give us a call." };
  const out = await buildSite({ record, copy: ex.copy, site: { slug: ex.slug, look: ex.design, origin: "https://example.test" }, mode: "publish", allowSamples: true });
  const home = String(out.files.get("index.html"));
  assert.match(home, /class="gallery"[\s\S]*Bay with a lifted truck/);
  assert.match(home, /id="jobs"[\s\S]*Service writer/);
  assert.ok(home.indexOf('id="photos"') < home.indexOf('id="reviews"'), "gallery sits before reviews");
  assert.ok(home.indexOf('id="jobs"') < home.indexOf('class="cta '), "hiring sits before the closing call to action");
});

test("a Spanish page renders at /es/ with Spanish hours and a menu link", async () => {
  const ex = EXAMPLES[0]!;
  const copy = structuredClone(ex.copy);
  copy.es = {
    heroTagline: "Bisquets caseros y comida sureña.",
    heroSub: "Desayuno y almuerzo en el centro de Cullman.",
    about: ["Cocinamos como nuestras abuelas."],
    services: {},
    faq: [],
    ctaTitle: "Venga con hambre",
    ctaLine: "Pase a desayunar o llame para pedir para llevar.",
    metaDescription: "Comida sureña casera para desayuno y almuerzo en el centro de Cullman, AL. Bisquets, platos del día y cena los viernes. Llame para pedir.",
  };
  const out = await buildSite({ record: ex.record, copy, site: { slug: ex.slug, look: ex.design, origin: "https://example.test" }, mode: "publish", allowSamples: true });
  const es = String(out.files.get("es/index.html"));
  assert.match(es, /<html lang="es"/);
  assert.match(es, /Martes/);
  assert.match(es, /Llamar \(256\) 555-0101/);
  assert.match(String(out.files.get("index.html")), /href="\/es\/">Español/);
  assert.match(String(out.files.get("index.html")), /hreflang="es"/);
});

test("published pages ask for the stylesheet and script by version, so a client domain's browser cache can't keep old ones", async () => {
  const ex = EXAMPLES[0]!;
  const build = (record: typeof ex.record) => buildSite({ record, copy: ex.copy, site: { slug: ex.slug, look: ex.design, origin: "https://example.test" }, mode: "publish", allowSamples: true });
  const out = await build(ex.record);
  const home = String(out.files.get("index.html"));
  const v = home.match(/href="\/assets\/site\.css\?v=([0-9a-f]{8})"/)?.[1];
  assert.ok(v, "stylesheet carries a version");
  assert.match(home, /src="\/assets\/site\.js\?v=[0-9a-f]{8}"/);
  assert.ok(out.files.get("assets/site.css"), "the file itself keeps its plain name");
  const again = await build(ex.record);
  assert.equal(String(again.files.get("index.html")).match(/site\.css\?v=([0-9a-f]{8})/)?.[1], v, "same CSS, same version");
});
