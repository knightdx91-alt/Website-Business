import assert from "node:assert/strict";
import { test } from "node:test";
import { DNA_KNOB_IDS, DNA_KNOBS, encodeDna, LEGACY_DNA, parseDna, pickDna, scopeLayoutCss, type Dna } from "../src/generator/dna.ts";
import { LAYOUT_IDS } from "../src/generator/layouts.ts";
import { buildSite } from "../src/generator/render.ts";
import { designId, parseDesign } from "../src/generator/themes.ts";
import { categoryRecord, restaurantRecord, sampleCopy } from "./fixtures.ts";

const site = (look: string) => ({ slug: "d", look });

test("dna encodes and parses round-trip; bad codes are rejected", () => {
  for (let i = 0; i < 40; i++) {
    const d = pickDna(`seed-${i}`, (["restaurant", "contractor", "finance", "church"] as const)[i % 4]!);
    assert.deepEqual(parseDna(encodeDna(d)), d);
  }
  assert.equal(parseDna("h9n0b0s0v0c0f0a0p0"), undefined, "index out of range");
  assert.equal(parseDna("h0n0"), undefined, "too short");
  assert.equal(parseDna("h0n0b0s0v0c0f0a0p0x"), undefined, "trailing junk");
  assert.deepEqual(parseDna("h1n2b3s2v1c1f1a1p1"), { ...parseDna("h1n2b3s2v1c1f1a1p1t0r0k0d0o0m0q0g0e0u0w0") }, "an id from before the newer knobs still parses, with legacy values for them");
  assert.equal(parseDna("h0n0b0s0v0c0f0a0p0t5"), undefined, "a newer knob out of range is still rejected");
  assert.equal(encodeDna(LEGACY_DNA), "h0n0b0s0v0c0f0a0p0t0r0k0d0o0m0q0g0e0u0w0x0y0z0");
  assert.deepEqual(parseDna("h1n2b3s2v1c1f1a1p1t0r0k0d0o0m0q1"), { ...parseDna("h1n2b3s2v1c1f1a1p1t0r0k0d0o0m0q1g0e0u0w0") }, "an id from before the align knob still parses");
  assert.deepEqual(parseDna("h1n2b3s2v1c1f1a1p1t0r0k0d0o0m0q1g1"), { ...parseDna("h1n2b3s2v1c1f1a1p1t0r0k0d0o0m0q1g1e0u0w0") }, "an id from before the phone knobs still parses");
  const d = parseDesign("auto.motor_oil~classic~h1n2b3s2v1c1f1a1p1");
  assert.equal(d.layout, "classic");
  assert.equal(d.dna?.hero, "cover");
  assert.equal(designId("auto.motor_oil", "classic", LEGACY_DNA), "auto.motor_oil~classic", "legacy dna is left off the id");
  const legacyish = parseDesign("auto.motor_oil~classic~h0n0b0s0v0c0f0a0p0");
  assert.equal(encodeDna(legacyish.dna!), encodeDna(LEGACY_DNA));
});

test("picked dna is deterministic, category-aware and self-consistent", () => {
  const a = pickDna("lead-1", "finance");
  assert.deepEqual(pickDna("lead-1", "finance"), a);
  assert.notDeepEqual(pickDna("lead-2", "finance"), a);
  for (let i = 0; i < 60; i++) {
    const d = pickDna(`x${i}`, "finance");
    assert.notEqual(d.hero, "cover", "a CPA never gets a full-screen photo");
    assert.equal(d.bar, "bar");
    if (d.hero === "split") assert.equal(d.strip, "none");
    assert.notEqual(d.strip === "none" && d.hero !== "split", true, "the address never disappears");
  }
  const avoid = [pickDna("lead-1", "auto")];
  const next = pickDna("lead-1", "auto", { avoid });
  assert.notEqual(encodeDna(next), encodeDna(avoid[0]!));
  assert.ok(next.hero !== avoid[0]!.hero || next.services !== avoid[0]!.services || next.strip !== avoid[0]!.strip, "a reroll changes something people notice");
});

test("legacy dna reproduces the old page byte for byte", async () => {
  const record = categoryRecord("auto");
  const plain = await buildSite({ record, copy: sampleCopy(), site: site("auto.motor_oil~split"), mode: "preview" });
  const legacy = await buildSite({ record, copy: sampleCopy(), site: site(`auto.motor_oil~split~${encodeDna(LEGACY_DNA)}`), mode: "preview" });
  assert.equal(String(legacy.files.get("index.html")), String(plain.files.get("index.html")));
  assert.equal(String(legacy.files.get("assets/site.css")), String(plain.files.get("assets/site.css")));
});

test("scopeLayoutCss only touches the parts the dna owns and keeps at-rules intact", () => {
  const css = `.hero h1{font-size:2rem}.cards{gap:0}.hero,.strip{margin:0}@media (min-width:900px){.hero__in{padding:0}.ftr{color:red}}@keyframes spin{from{opacity:0}to{opacity:1}}`;
  const dna: Dna = { ...LEGACY_DNA, hero: "cover" };
  const out = scopeLayoutCss(css, dna);
  assert.match(out, /^html\[data-hero="stack"\] \.hero h1\{font-size:2rem\}/);
  assert.match(out, /\.cards\{gap:0\}/);
  assert.match(out, /html\[data-hero="stack"\] \.hero,\.strip\{margin:0\}/);
  assert.match(out, /@media \(min-width:900px\)\{html\[data-hero="stack"\] \.hero__in\{padding:0\}\.ftr\{color:red\}\}/);
  assert.match(out, /@keyframes spin\{from\{opacity:0\}to\{opacity:1\}\}/);
  assert.equal(scopeLayoutCss(css, LEGACY_DNA), css);
});

test("every structure builds lint-clean on every layout, with and without a photo", async () => {
  const values = <K extends keyof Dna>(k: K) => DNA_KNOBS[k] as unknown as Array<Dna[K]>;
  let n = 0;
  for (const layout of LAYOUT_IDS) {
    for (let i = 0; i < 2; i++) {
      // Walk every value of every knob across the layouts so each value meets each layout at least once.
      const d = { ...LEGACY_DNA } as Dna;
      for (const k of DNA_KNOB_IDS) (d as Record<string, string>)[k] = values(k)[(n + i * 3) % values(k).length]!;
      if (d.hero === "split") d.strip = "none";
      const design = `salon.night_shift~${layout}~${encodeDna(d)}`;
      const withPhoto = await buildSite({ record: categoryRecord("salon"), copy: sampleCopy(), site: site(design), mode: "preview" });
      assert.deepEqual(withPhoto.lint.errors, [], design);
      const html = String(withPhoto.files.get("index.html"));
      assert.match(html, new RegExp(`data-hero="${d.hero}"`), design);
      const noPhoto = await buildSite({ record: categoryRecord("salon", { media: { hero: undefined, gallery: [] } }), copy: sampleCopy(), site: site(design), mode: "preview" });
      assert.deepEqual(noPhoto.lint.errors, [], `${design} (no photo)`);
      n++;
    }
  }
  // Every recipe of every category builds clean too, on a layout chosen by its position.
  const { RECIPES, settleDna } = await import("../src/generator/dna.ts");
  const { looksFor } = await import("../src/generator/themes.ts");
  let j = 0;
  for (const [category, recipes] of Object.entries(RECIPES)) {
    const look = looksFor(category as "auto")[0]!;
    for (const recipe of recipes) {
      const d = settleDna({ ...LEGACY_DNA, ...recipe.dna });
      const design = `${look}~${LAYOUT_IDS[j++ % LAYOUT_IDS.length]}~${encodeDna(d)}`;
      const rec = category === "restaurant" ? restaurantRecord() : categoryRecord(category as "auto", { smsEnabled: true });
      const out = await buildSite({ record: rec, copy: sampleCopy(), site: site(design), mode: "preview" });
      assert.deepEqual(out.lint.errors, [], `${category} recipe ${recipe.id}: ${design}`);
    }
  }
  const r = await buildSite({ record: restaurantRecord(), copy: sampleCopy(), site: site(`restaurant.pit_plank~classic~${encodeDna({ ...LEGACY_DNA, hero: "split", strip: "none", services: "tiles" })}`), mode: "preview" });
  assert.deepEqual(r.lint.errors, []);
});

test("third round: centered openings, bento services, marquee strip, offset photo, headline fit and service icons", async () => {
  const { settleDna } = await import("../src/generator/dna.ts");
  const { serviceIcon } = await import("../src/generator/icons.ts");
  const { CLIENT_SCRIPT } = await import("../src/generator/client-script.ts");
  const services = [
    { id: "one", name: "Brake repair" },
    { id: "two", name: "Oil changes" },
    { id: "three", name: "AC repair" },
    { id: "four", name: "Check engine diagnostics" },
    { id: "five", name: "Tire rotation" },
    { id: "six", name: "Alignments" },
  ];
  // A storefront pack (auto) renders the address strip; service-area packs never had one.
  const record = categoryRecord("auto", { smsEnabled: true, services });
  const d = settleDna({ ...LEGACY_DNA, hero: "banner", align: "center", services: "bento", strip: "marquee", photo: "offset", scale: "poster" });
  assert.equal(d.align, "center");
  assert.equal(d.strip, "marquee");
  const design = `auto.motor_oil~classic~${encodeDna(d)}`;
  const out = await buildSite({ record, copy: sampleCopy(), site: site(design), mode: "preview" });
  assert.deepEqual(out.lint.errors, []);
  const html = String(out.files.get("index.html"));
  assert.match(html, /data-align="center"/);
  assert.match(html, /hero--banner[^>]*style="--h1-ch:\d+"/, "poster scale carries the longest word so the headline never breaks mid-word");
  assert.match(html, /<ul class="svc svc--bento"><li>/, "the first service is the featured tile (styled by position)");
  // Six services: one featured + five tiles. Phones (2 columns) need the last tile full-width; desktops (3 columns, the feature taking two) need it across the row.
  assert.match(html, /<li class="sp2m sp3d">(?:(?!<li).)*<\/ul>/, "the last tile widens so no row is ragged");
  assert.match(html, /<div class="strip strip--marquee"><div class="strip__in"><div class="marquee__track">/);
  const css = String(out.files.get("assets/site.css"));
  assert.match(css, /\.svc--bento/);
  assert.match(css, /html\[data-strip="marquee"\]/);
  assert.match(css, /html\[data-align="center"\]/);
  assert.match(css, /content:"\\2726"/, "the marquee separator is a real CSS escape");
  assert.match(css, /content:"\\201C"/, "the quote mark is a real CSS escape");
  assert.match(css, /@keyframes rise/);
  assert.match(css, /prefers-reduced-motion/);
  // The shipped client script is plain JS: its regexes carry single backslashes and it only turns motion on when the browser can observe.
  assert.match(CLIENT_SCRIPT, /\(\^\|\\s\)\(cards\|svc/);
  assert.doesNotMatch(CLIENT_SCRIPT, /\\\\s/);
  assert.match(CLIENT_SCRIPT, /IntersectionObserver/);
  assert.match(CLIENT_SCRIPT, /prefers-reduced-motion/);
  assert.match(CLIENT_SCRIPT, /marquee__track/);
  // Consistency: centered text only on openings that can carry it; a marquee never fights the utility bar or the proof band; a split opening keeps the photo plain.
  assert.equal(settleDna({ ...LEGACY_DNA, hero: "split", align: "center" }).align, "start");
  assert.equal(settleDna({ ...LEGACY_DNA, nav: "utility", strip: "marquee" }).strip, "inline");
  assert.equal(settleDna({ ...LEGACY_DNA, proof: "band", strip: "marquee" }).strip, "inline");
  assert.equal(settleDna({ ...LEGACY_DNA, hero: "cover", photo: "offset" }).photo, "plain");
  // Bento needs four services; fewer fall back to the card grid.
  const fewOut = await buildSite({ record: categoryRecord("auto", { smsEnabled: true }), copy: sampleCopy(), site: site(design), mode: "preview" });
  assert.doesNotMatch(String(fewOut.files.get("index.html")), /svc--bento/);
  assert.match(String(fewOut.files.get("index.html")), /class="cards/);
  // Billboard and statement openings carry the fit variable; a stack opening does not.
  for (const hero of ["billboard", "statement"] as const) {
    const h = await buildSite({ record, copy: sampleCopy(), site: site(`auto.motor_oil~classic~${encodeDna(settleDna({ ...LEGACY_DNA, hero }))}`), mode: "preview" });
    assert.match(String(h.files.get("index.html")), /--h1-ch:\d+/, hero);
  }
  const stack = await buildSite({ record, copy: sampleCopy(), site: site("auto.motor_oil~classic"), mode: "preview" });
  assert.doesNotMatch(String(stack.files.get("index.html")), /--h1-ch/);
  // Service icons follow the words in the title, with the pack's icon as the fallback.
  assert.equal(serviceIcon("Drain cleaning", "wrench"), "droplet");
  assert.equal(serviceIcon("AC repair", "wrench"), "snowflake");
  assert.equal(serviceIcon("Furnace tune-ups", "wrench"), "flame");
  assert.equal(serviceIcon("Panel upgrades", "wrench"), "bolt");
  assert.equal(serviceIcon("Men's haircuts", "wrench"), "scissors");
  assert.equal(serviceIcon("Something unusual", "wrench"), "wrench");
  const icons = html.match(/<svg class="i" [^>]*stroke="currentColor"/g) ?? [];
  assert.ok(icons.length >= 4, `service tiles carry stroke icons (${icons.length})`);
});

test("fourth round: the phone view has its own knobs (buttons, trust row, section headings) and a client's structure is never copied", async () => {
  const { settleDna, dnaSignature } = await import("../src/generator/dna.ts");
  const { pickDesign } = await import("../src/generator/design.ts");
  const record = categoryRecord("auto", { smsEnabled: true });
  const build = (d: Partial<Dna>) => buildSite({ record, copy: sampleCopy(), site: site(`auto.motor_oil~editorial~${encodeDna(settleDna({ ...LEGACY_DNA, ...d }))}`), mode: "preview" });
  const out = await build({ phone: "link", trust: "chips", heads: "rule" });
  assert.deepEqual(out.lint.errors, []);
  const html = String(out.files.get("index.html"));
  assert.match(html, /data-phone="link" data-trust="chips" data-heads="rule"/);
  const css = String(out.files.get("assets/site.css"));
  for (const sel of ['html[data-phone="natural"]', 'html[data-phone="link"]', 'html[data-phone="bar"]', 'html[data-trust="chips"]', 'html[data-trust="dots"]', 'html[data-trust="stack"]', 'html[data-heads="rule"]', 'html[data-heads="tag"]', 'html[data-heads="big"]']) assert.ok(css.includes(sel), sel);
  assert.match(css, /content:"\\2192"/, "the text-link arrow is a real CSS escape");
  assert.match(css, /content:"\\00B7"/, "the dot separator is a real CSS escape");
  // Phone rules live only under the phone media query; the trust and heading rules apply at every width.
  const phoneBlock = css.slice(css.indexOf('html[data-phone="natural"]') - 40, css.indexOf('html[data-phone="natural"]'));
  assert.match(phoneBlock, /@media \(max-width:599px\)\{/);
  // Layouts' own section-heading and trust-row rules step aside when the knob isn't legacy (scoped to the legacy value).
  assert.match(css, /html\[data-heads="label"\] [^{]*\.section__title/);
  // Consistency rules.
  assert.equal(settleDna({ ...LEGACY_DNA, phone: "bar", bar: "fab" }).phone, "stacked");
  assert.equal(settleDna({ ...LEGACY_DNA, phone: "bar", bar: "bar" }).phone, "bar");
  assert.equal(settleDna({ ...LEGACY_DNA, rhythm: "chapters", heads: "big" }).heads, "label");
  assert.equal(settleDna({ ...LEGACY_DNA, rhythm: "chapters", heads: "tag" }).heads, "tag");
  assert.equal(settleDna({ ...LEGACY_DNA, hero: "statement", align: "center", trust: "stack" }).trust, "chips");
  // The spread picks all four phone values over a run (no value is dead).
  const seen = new Set(Array.from({ length: 80 }, (_, i) => pickDna(`p${i}`, "contractor").phone));
  assert.equal(seen.size, 4, [...seen].join(","));
  // A sold client's design is exclusive: never its look, nor its layout or structure signature while others are free.
  const looks = ["auto.motor_oil", "auto.pit_lane", "auto.midnight_shine"];
  const sold = `auto.motor_oil~classic~${encodeDna(settleDna({ ...LEGACY_DNA, hero: "split", services: "list" }))}`;
  for (let i = 0; i < 30; i++) {
    const d = pickDesign({ leadId: `lead-${i}`, looks, used: [sold], taken: [sold] });
    assert.notEqual(parseDesign(d).look, "auto.motor_oil", d);
    assert.notEqual(parseDesign(d).layout, "classic", d);
    assert.notEqual(dnaSignature(parseDesign(d).dna!), dnaSignature(parseDesign(sold).dna!), d);
  }
  // Only when every look is a client's does the spread share one (and still not the exact combination).
  const all = looks.map((l, i) => `${l}~${LAYOUT_IDS[i]}`);
  const forced = pickDesign({ leadId: "lead-x", looks, used: all, taken: all });
  assert.ok(looks.includes(parseDesign(forced).look));
  assert.ok(!all.includes(`${parseDesign(forced).look}~${parseDesign(forced).layout}`), "never the exact sold combination");
  // A restyle lists the current design as taken, so "Try another design" always changes the colors.
  const again = pickDesign({ leadId: "lead-y", looks, used: [], taken: [`auto.pit_lane~classic`] });
  assert.notEqual(parseDesign(again).look, "auto.pit_lane");
});

test("fifth round: section edges, decoration and more photos", async () => {
  const { addLife, tradeIcons } = await import("../src/generator/life.ts");
  assert.deepEqual(parseDna("h1n2b3s2v1c1f1a1p1t0r0k0d0o0m0q1g1e0u0w0"), { ...parseDna("h1n2b3s2v1c1f1a1p1t0r0k0d0o0m0q1g1e0u0w0x0y0z0") }, "an id from before the life knobs still parses");
  // New picks lean lively: most get a shaped edge and decoration.
  let lively = 0;
  for (let i = 0; i < 40; i++) {
    const d = pickDna(`life-${i}`, "restaurant");
    if (d.edge !== "straight" || d.decor !== "none") lively++;
    if (d.rhythm === "continuous" || d.rhythm === "boxed") assert.equal(d.edge, "straight");
  }
  assert.ok(lively >= 30, `lively picks: ${lively}`);
  assert.deepEqual(tradeIcons({ category: "contractor", services: [{ id: "a", name: "Water heater repair" }, { id: "b", name: "AC tune-up" }] } as never).slice(0, 2), ["flame", "snowflake"]);
  const body = '<main><section class="hero hero--x" aria-labelledby="hero-title"><div class="hero__in"></div></section><section class="section section--band" id="s"><div class="wrap"></div></section><section class="cta cta--band"><div class="wrap"></div></section></main>';
  const ctx = (edge: string, decor: string) => ({ r: { category: "salon", services: [] }, theme: { dna: { ...LEGACY_DNA, edge, decor } } }) as never;
  assert.equal(addLife(ctx("straight", "none"), body), body, "legacy values add nothing");
  const out = addLife(ctx("wave", "icons"), body);
  assert.equal((out.match(/class="edg/g) ?? []).length, 3, "band top + bottom, cta top");
  assert.equal((out.match(/class="dec"/g) ?? []).length, 3, "hero, band, cta");
  assert.match(out, /aria-hidden="true"/);
});
