import assert from "node:assert/strict";
import { test } from "node:test";
import { siteOrigin } from "../../src/worker/publish.ts";

test("a client's domain is the site's address only once Cloudflare says it works", () => {
  const pages = "https://reyes-pizza.pages.dev";
  assert.equal(siteOrigin({ custom_domain: null, domain_active: 0 }, pages), pages);
  assert.equal(siteOrigin({ custom_domain: "www.reyespizza.com", domain_active: 0 }, pages), pages, "waiting on its DNS record");
  assert.equal(siteOrigin({ custom_domain: "www.reyespizza.com", domain_active: 1 }, pages), "https://www.reyespizza.com");
});

import { bareDomain, domainAvailable, suggestDomains } from "../../src/worker/domains.ts";

test("domains are stored bare and name ideas come from the business name", () => {
  assert.equal(bareDomain("https://WWW.ReyesPizza.com/menu/"), "reyespizza.com");
  assert.deepEqual(suggestDomains("Reyes Pizza", "Hanceville"), ["reyespizza.com", "reyespizzahanceville.com", "reyespizzaal.com", "reyes-pizza.com", "reyespizza.net", "reyespizza.co"]);
  assert.equal(suggestDomains("Thrift & More, LLC")[0], "thriftandmore.com");
  assert.equal(suggestDomains("Joe's Tire Barn")[0], "joestirebarn.com");
  assert.deepEqual(suggestDomains("!!!"), []);
});

test("availability: RDAP 404 = free, 200 = taken, anything else = couldn't tell", async () => {
  const f = (status: number) => (async () => new Response("{}", { status })) as unknown as typeof fetch;
  assert.equal(await domainAvailable("x.com", f(404)), true);
  assert.equal(await domainAvailable("x.com", f(200)), false);
  assert.equal(await domainAvailable("x.com", f(503)), null);
  assert.equal(await domainAvailable("x.com", (async () => { throw new Error("down"); }) as unknown as typeof fetch), null);
});
