import assert from "node:assert/strict";
import { test } from "node:test";
import { nameTokens, pickPage, resolvePresence, townOf } from "../src/places/web-presence.ts";

const lunas = [
  { url: "https://www.facebook.com/lunasbbq/", title: "Luna's BBQ - Hanceville, AL - Facebook" },
  { url: "https://www.yelp.com/biz/lunas-bbq-hanceville", title: "LUNA'S BBQ - Updated October 2026 - Yelp" },
  { url: "https://www.stonebridgewedding.com/lunas-bbq", title: "Luna's BBQ | Best BBQ in Hanceville, AL", description: "Visit us at 105 Main St NW Hanceville, AL 35077" },
  { url: "https://www.cullmantimes.com/news/lunas-bbq-opens", title: "Luna's BBQ opens in Hanceville" },
];

test("a page on a parent company's site is found, directories, social and news are skipped", () => {
  const f = pickPage(lunas, "Luna's BBQ");
  assert.equal(f?.host, "stonebridgewedding.com");
  assert.equal(f?.own, false);
  assert.equal(pickPage(lunas.filter((r) => !r.url.includes("stonebridge")), "Luna's BBQ"), null, "a news story about them is not their page");
});

test("their own unlinked domain counts as their website", () => {
  const f = pickPage([{ url: "https://lunasbbqhanceville.com/", title: "Home" }], "Luna's BBQ");
  assert.equal(f?.own, true);
  const g = pickPage([{ url: "https://www.popscafe.net/menu", title: "Menu" }], "Pop's Cafe Hanceville");
  assert.equal(g?.own, true);
});

test("a name-bearing subdomain on a platform is a page elsewhere, not their website", () => {
  const f = pickPage([{ url: "https://pops-cafe-hanceville.res-pick.com/", title: "Pop's Cafe Hanceville - Order Online" }], "Pop's Cafe Hanceville");
  assert.equal(f?.own, false);
  assert.equal(f?.host, "res-pick.com");
  const g = pickPage([{ url: "https://lunasbbq.square.site/", title: "Luna's BBQ" }], "Luna's BBQ");
  assert.equal(g, null, "square.site is ignored outright");
});

test("a page that merely mentions the name in passing is not picked", () => {
  const r = [{ url: "https://www.hancevillechamber.org/members", title: "Our members: Luna's BBQ, Stone Bridge Farms and more" }];
  assert.equal(pickPage(r, "Luna's BBQ"), null);
  assert.equal(pickPage([{ url: "https://somevenue.com/vendors", title: "Vendors" }], "C & M Truck & Trailer Repair"), null);
});

test("name tokens and towns", () => {
  assert.deepEqual(nameTokens("C & M Truck & Trailer Repair LLC"), ["c", "m", "truck", "trailer", "repair"]);
  assert.equal(townOf("105 Main St NW, Hanceville, AL 35077, USA"), "Hanceville");
  assert.equal(townOf("Cullman, AL 35055, USA"), "Cullman");
  assert.equal(townOf(undefined), "Cullman");
});

test("resolvePresence: no key or a failed search leaves the lead alone; a parent page becomes elsewhere", async () => {
  const place = { displayName: { text: "Luna's BBQ" }, formattedAddress: "105 Main St NW, Hanceville, AL 35077, USA" };
  assert.equal(await resolvePresence(undefined, place), null);
  const failing = (async () => new Response("nope", { status: 500 })) as unknown as typeof fetch;
  assert.equal(await resolvePresence("k", place, failing), null);
  let q = "";
  const serve = (pageHtml: string) =>
    (async (u: URL | RequestInfo) => {
      const url = new URL(String(u));
      if (url.hostname !== "api.search.brave.com") return new Response(pageHtml, { status: 200, headers: { "content-type": "text/html" } });
      q = url.searchParams.get("q") ?? "";
      return new Response(JSON.stringify({ web: { results: lunas } }), { status: 200, headers: { "content-type": "application/json" } });
    }) as unknown as typeof fetch;
  const r = await resolvePresence("k", place, serve("<h1>Luna's BBQ</h1><p>Smoked daily in Hanceville.</p>"));
  assert.equal(q, `"Luna's BBQ" Hanceville AL`);
  assert.equal(r?.presence, "elsewhere");
  assert.equal(r?.label, "Page on stonebridgewedding.com, not linked from Google");
  // The same name on a page that never mentions their town, phone or Alabama is a namesake, not theirs.
  assert.equal(await resolvePresence("k", place, serve("<h1>Luna's BBQ</h1><p>Austin, TX 78701</p>")), null);
});

test("a namesake's page in another state is not theirs", async () => {
  const { mentionsPlace } = await import("../src/places/web-presence.ts");
  const colorado = "<title>Doug's Diner | Local. Fresh. Original.</title><p>Locations in Fort Collins, Loveland and Longmont, CO 80538. Call (970) 555-1234.</p>";
  assert.equal(mentionsPlace(colorado, { town: "Cullman", phone: "(256) 555-0147" }), false);
  assert.equal(mentionsPlace("<p>Visit us at 101 Example Ave, Cullman</p>", { town: "Cullman" }), true);
  assert.equal(mentionsPlace("<p>Call 256.555.0147 today</p>", { town: "Hanceville", phone: "+12565550147" }), true);
  assert.equal(mentionsPlace("<p>Serving Hartselle, AL 35640</p>", { town: "Arab" }), true);
  assert.equal(mentionsPlace("<p>Proudly serving north Alabama</p>", { town: "Arab" }), true);
});
