import assert from "node:assert/strict";
import test from "node:test";
import { applySiteFacts, extractSiteFacts } from "../src/places/site-import.ts";

const HTML = `<!doctype html><html><head><title>King Fish Aquatics</title><meta name="description" content="Cullman's locally owned aquatics store"></head>
<body><script>var x = "Cullman's locally owned Aquatics store";</script><style>.a{}</style>
<h1>Cullman's locally owned Aquatics store Tropical, marine and cold water</h1>
<p>Cullman's locally owned Aquatics store Tropical, marine and cold water</p>
<p>Cullman's locally owned Aquatics store Tropical, marine and cold water</p>
<h2>About King Fish Aquatics</h2>
<div>We carry tanks, food, plants, tank accessories and many different unique wooden pieces, plus a wide selection of marine life. Special orders go through Boyd or Regina.</div>
<div>We are in the process of shutting down and moving to our new, more convenient location. Please be patient until we reopen in December.</div>
<p>Family owned since 2019 and proud of it, serving Cullman County.</p>
<h4>This website uses cookies.</h4><p>This website uses cookies to make your experience better. Accept</p>
<a href="https://www.facebook.com/groups/kingfishaquatics">f</a><a href="https://www.facebook.com/sharer/sharer.php?u=x">share</a>
<p>Call 256-636-5771 or email boyd@kingfishaquatics.co. Copyright © 2025 King Fish Aquatics llc</p>
</body></html>`;

test("their current website becomes facts: deduped paragraphs, no cookie or copyright filler, phone, email, social, year, notices", () => {
  const f = extractSiteFacts("https://kingfishaquatics.co/", HTML);
  assert.equal(f.title, "King Fish Aquatics");
  assert.equal(f.description, "Cullman's locally owned aquatics store");
  assert.ok(f.headings.includes("About King Fish Aquatics"));
  assert.ok(!f.headings.some((h) => /cookies/i.test(h)), "cookie heading dropped");
  assert.equal(f.paragraphs.filter((p) => p.startsWith("Cullman's locally owned")).length, 1, "repeated hero kept once");
  assert.ok(f.paragraphs.some((p) => /Boyd or Regina/.test(p)));
  assert.ok(!f.paragraphs.some((p) => /cookies|Copyright/i.test(p)), "filler dropped");
  assert.deepEqual(f.phones, ["256-636-5771"]);
  assert.deepEqual(f.emails, ["boyd@kingfishaquatics.co"]);
  assert.equal(f.social.facebook, "https://www.facebook.com/groups/kingfishaquatics");
  assert.equal(f.foundedYear, 2019);
  assert.equal(f.notices.length, 1);
  assert.match(f.notices[0]!, /reopen in December/);
});

test("site facts fill record gaps and never overwrite what's there", () => {
  const f = extractSiteFacts("https://kingfishaquatics.co/", HTML);
  const r = { email: undefined as string | undefined, foundedYear: undefined as number | undefined, links: { social: {} as Record<string, string | undefined> } };
  assert.deepEqual(applySiteFacts(r, f).sort(), ["email", "facebook", "founded year"]);
  assert.equal(r.email, "boyd@kingfishaquatics.co");
  assert.equal(r.foundedYear, 2019);
  const kept = { email: "owner@example.com", foundedYear: 2001, links: { social: { facebook: "https://facebook.com/other" } } };
  assert.deepEqual(applySiteFacts(kept, f), []);
  assert.equal(kept.email, "owner@example.com");
});
