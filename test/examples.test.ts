import assert from "node:assert/strict";
import { test } from "node:test";
import { EXAMPLES } from "../src/examples/examples.ts";
import { buildSite } from "../src/generator/render.ts";

test("every example site passes the publish gate", async () => {
  for (const ex of EXAMPLES) {
    const out = await buildSite({ record: ex.record, copy: ex.copy, site: { slug: ex.slug, look: ex.design, origin: "https://example.test" }, mode: "publish" });
    assert.ok(out.files.get("index.html"), ex.slug);
  }
});

test("live sites carry the credit and Request a change link; previews don't", async () => {
  const ex = EXAMPLES[1]!;
  const credit = { company: "Underground Associates", url: "https://undergroundassociates.com", changeUrl: "https://undergroundassociates.com/change?b=abc123" };
  const live = await buildSite({ record: ex.record, copy: ex.copy, site: { slug: ex.slug, look: ex.design, origin: "https://example.test" }, mode: "publish", credit });
  const home = String(live.files.get("index.html"));
  assert.match(home, /Website by <a href="https:\/\/undergroundassociates.com">Underground Associates<\/a>/);
  assert.match(home, /change\?b=abc123/);
  const preview = await buildSite({ record: ex.record, copy: ex.copy, site: { slug: ex.slug, look: ex.design }, mode: "preview", credit });
  assert.doesNotMatch(String(preview.files.get("index.html")), /Request a change/);
});

test("owner gallery photos and hiring show on the home page", async () => {
  const ex = EXAMPLES[3]!;
  const record = structuredClone(ex.record);
  record.media.gallery = [{ src: "/assets/owner/g1.jpg", alt: "Bay with a lifted truck", source: "owner", width: 1200, height: 900 }];
  record.hiring = { roles: ["Mechanic", "Service writer"], how: "Stop by with a resume or give us a call." };
  const out = await buildSite({ record, copy: ex.copy, site: { slug: ex.slug, look: ex.design, origin: "https://example.test" }, mode: "publish" });
  const home = String(out.files.get("index.html"));
  assert.match(home, /class="gallery"[\s\S]*Bay with a lifted truck/);
  assert.match(home, /id="jobs"[\s\S]*Service writer/);
  assert.ok(home.indexOf('id="photos"') < home.indexOf('id="reviews"'), "gallery sits before reviews");
  assert.ok(home.indexOf('id="jobs"') < home.indexOf('class="cta"'), "hiring sits before the closing call to action");
});
