import assert from "node:assert/strict";
import { test } from "node:test";
import { siteOrigin } from "../../src/worker/publish.ts";

test("a client's domain is the site's address only once Cloudflare says it works", () => {
  const pages = "https://reyes-pizza.pages.dev";
  assert.equal(siteOrigin({ custom_domain: null, domain_active: 0 }, pages), pages);
  assert.equal(siteOrigin({ custom_domain: "www.reyespizza.com", domain_active: 0 }, pages), pages, "waiting on its DNS record");
  assert.equal(siteOrigin({ custom_domain: "www.reyespizza.com", domain_active: 1 }, pages), "https://www.reyespizza.com");
});
