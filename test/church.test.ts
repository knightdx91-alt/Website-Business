import assert from "node:assert/strict";
import { test } from "node:test";
import { churchBannedPhrases, churchVariant, suggestTradition } from "../src/generator/packs/church.ts";
import { buildSite } from "../src/generator/render.ts";
import type { BusinessRecord } from "../src/generator/types.ts";
import { guessCategory, qualify, webPresence } from "../src/places/qualify.ts";
import { categoryRecord, sampleCopy } from "./fixtures.ts";

test("churches and community groups get the right kind; schools, lodges-as-churches and chicken places don't fool it", () => {
  assert.equal(churchVariant("church", ["place_of_worship"], "Cedar Creek Baptist Church"), "church");
  assert.equal(churchVariant("place_of_worship", [], "Cullman Masonic Lodge #421"), "civic_post");
  assert.equal(churchVariant("bar", [], "American Legion Post 4"), "civic_post");
  assert.equal(churchVariant("church", [], "Hope Food Pantry"), "charity");
  assert.equal(churchVariant("community_center", [], "Berlin Community Center"), "community_center");
  assert.equal(churchVariant("church", [], "Grace Christian Academy"), null);
  assert.equal(churchVariant("fast_food_restaurant", [], "Church's Chicken"), null);
  assert.equal(churchVariant("church", [], "West Cullman Baptist Association"), null);
  assert.equal(churchVariant("church", [], "Smyrna Missionary Baptist Church"), "church", "'missionary' is not 'mission'");
  assert.deepEqual(suggestTradition("Smyrna Missionary Baptist Church"), { tradition: "baptist", label: "Missionary Baptist church" });
  assert.equal(suggestTradition("First United Church of Christ").tradition, "nondenominational", "UCC is not Church of Christ");
  assert.equal(suggestTradition("Fairview Church of Christ").label, "Church of Christ");
  assert.equal(webPresence("https://www.legion.org/posts/4"), "none", "a parent org's page isn't their site");
  assert.equal(webPresence("https://cedarcreek.churchcenter.com/home"), "free_builder");
  const place = (name: string) => ({ id: name, displayName: { text: name }, businessStatus: "OPERATIONAL", nationalPhoneNumber: "(256) 555-0100", types: ["church"] }) as never;
  assert.equal(qualify([place("Goodwill Baptist Church")], { category: "church" }).length, 1, "the restaurant/store chain list doesn't drop churches");
  assert.equal(guessCategory({ id: "x", displayName: { text: "Liberty Hill Church" }, primaryType: "church", types: ["church"] } as never), "church");
});

const church = (ext: NonNullable<BusinessRecord["ext"]["church"]> = {}, variant = "church") => categoryRecord("church", { variant, ext: { church: ext }, showStreetAddress: true });

test("service times, the church's description and the pastor are required before publishing", async () => {
  const out = await buildSite({ record: church({ tradition: "baptist", traditionLabel: "Baptist church" }), copy: sampleCopy(), site: { slug: "c", look: "" }, mode: "preview" });
  assert.deepEqual(out.lint.errors, []);
  for (const t of [/service times/, /describe your church/, /pastor/]) assert.ok(out.todos.some((x) => t.test(x)), String(t));
  const home = String(out.files.get("index.html"));
  assert.ok(home.includes('id="times"') && home.includes("Sunday School"), "seeded schedule shows in the preview");
  assert.ok(!/id="reviews"/.test(home), "no reviews section for churches");
  assert.ok(!home.includes("Baptist church ·"), "the label isn't shown until confirmed");
  const ok = await buildSite({
    record: church({ tradition: "baptist", traditionLabel: "Missionary Baptist church", traditionConfirmed: true, schedule: [{ day: "Sunday", time: "11:00 AM", label: "Worship" }], scheduleConfirmed: true, pastorOff: true }),
    copy: sampleCopy(), site: { slug: "c", look: "" }, mode: "preview",
  });
  assert.ok(!ok.todos.some((x) => /service times|describe your church|pastor/.test(x)));
  assert.ok(String(ok.files.get("index.html")).includes("Missionary Baptist church ·"));
  const pantry = await buildSite({ record: church({}, "charity"), copy: sampleCopy(), site: { slug: "p", look: "" }, mode: "preview" });
  assert.ok(pantry.todos.some((x) => /get help/.test(x)));
});

test("AI text may not write doctrine, scripture, denominations or eligibility claims", () => {
  const bans = churchBannedPhrases(church());
  for (const bad of ["A Bible-believing church", "John 3:16", "Southern Baptist", "Gifts are tax-deductible", "Nursery for all ages", "Come as you are", "No ID needed"]) {
    assert.ok(bans.some((re) => re.test(bad)), bad);
  }
  for (const fine of ["A church family in Cullman. We'd love to meet you.", "There's a place here for every age."]) assert.ok(!bans.some((re) => re.test(fine)), fine);
});
