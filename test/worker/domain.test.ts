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

import { addonPrice, DEFAULT_ADDONS, isDomainAddon, mergeSettings } from "../../src/worker/db.ts";
import { priceSignup } from "../../src/worker/checkout.ts";

test("the domain extra is $11 upfront, then $2 a month (free on a plan that includes a domain)", () => {
  const domain = DEFAULT_ADDONS.find(isDomainAddon)!;
  assert.equal(addonPrice(domain), "$11 upfront, then $2/month");
  const index = DEFAULT_ADDONS.indexOf(domain);
  const s = {
    addons: DEFAULT_ADDONS,
    plans: [
      { id: "basic", name: "Basic", setup: 0, monthly: 49, includes: "A website" },
      { id: "pro", name: "Pro", setup: 0, monthly: 149, includes: "Your own domain name, bought for you" },
    ],
  } as never;
  const basic = priceSignup(s, "basic", "standard", [{ index, qty: 1 }]);
  const plain = priceSignup(s, "basic", "standard", []);
  assert.equal(basic.dueToday - plain.dueToday, 1100 + 200, "upfront + first month today");
  assert.equal(basic.renews!.amount - plain.renews!.amount, 200, "then $2 a month");
  const pro = priceSignup(s, "pro", "standard", [{ index, qty: 1 }]);
  assert.equal(pro.dueToday, priceSignup(s, "pro", "standard", []).dueToday, "included with Pro, upfront too");
});

test("saving Settings from an app that doesn't know the upfront amount keeps it", () => {
  const base = { addons: [{ name: "Domain name, bought for you", price: 2, setup: 11, unit: "month" }] };
  const old = mergeSettings(base, { addons: [{ name: "Domain name, bought for you", price: 2, unit: "month" }] });
  assert.equal(old.addons[0]!.setup, 11);
  const cleared = mergeSettings(base, { addons: [{ name: "Domain name, bought for you", price: 2, setup: null, unit: "month" }] });
  assert.equal(cleared.addons[0]!.setup, undefined);
});
