import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { EXAMPLES } from "../src/examples/examples.ts";
import { buildSite } from "../src/generator/render.ts";
import { hasScenes, SCENES, scenesFor } from "../src/generator/scenes.ts";

const site = () => ({ slug: "t", look: "", origin: "https://example.test" });

test("every scene file exists, is landscape and has an alt", () => {
  for (const s of SCENES) {
    assert.ok(existsSync(`app/public/scenes/${s.file}`), s.file);
    assert.ok(s.w > s.h && s.alt.length > 3, s.file);
  }
});

test("scenes fit the trade: a plumber gets pipes, a roofer roofs, a VFW post no church", () => {
  const plumber = scenesFor({ category: "contractor", variant: "plumbing", typeLabel: "Plumber", name: "Ace Plumbing" }, "a");
  assert.match(plumber[0]!.src, /pipe|faucet|fitting|valve|wrench/);
  assert.ok(plumber.every((p) => !/roof|shingle/.test(p.src)));
  const roofer = scenesFor({ category: "contractor", variant: "roofing", typeLabel: "Roofing Contractor", name: "Top Roofing" }, "a");
  assert.match(roofer[0]!.src, /roof|shingle/);
  assert.equal(scenesFor({ category: "church", variant: "civic_post", typeLabel: "Veterans Organization", name: "VFW Post 2214" }, "a").length, 0);
  assert.ok(hasScenes({ category: "church", variant: "church", typeLabel: "Church", name: "Grace Baptist Church" }));
  assert.deepEqual(scenesFor({ category: "auto", variant: "general", name: "X" }, "s1"), scenesFor({ category: "auto", variant: "general", name: "X" }, "s1"), "stable per seed");
});

test("no own photo: a scene opens the page; publishing swaps a Google hero for one and ships the file", async () => {
  const ex = EXAMPLES.find((e) => e.record.category === "auto")!;
  const record = structuredClone(ex.record);
  record.media.hero = { src: "/assets/img/hero.jpg", alt: "", source: "google" };
  const preview = await buildSite({ record, copy: ex.copy, site: site(), mode: "preview" });
  assert.match(String(preview.files.get("index.html")), /assets\/img\/hero\.jpg/, "the Google photo shows in the preview");
  const loaded: string[] = [];
  const live = await buildSite({
    record: { ...record, confirmed: [...record.confirmed] },
    copy: { ...ex.copy, approved: true },
    site: site(),
    mode: "publish",
    allowSamples: true,
    loadScene: async (f) => (loaded.push(f), new Uint8Array([1])),
  }).catch((e: Error) => e);
  if (live instanceof Error) assert.doesNotMatch(live.message, /Google photos must be replaced/);
  else {
    const home = String(live.files.get("index.html"));
    assert.doesNotMatch(home, /assets\/img\/hero\.jpg/);
    assert.match(home, /assets\/scene\/auto-/);
    assert.ok(loaded.length && loaded.every((f) => live.files.has(`assets/scene/${f}`)));
  }
});
