import assert from "node:assert/strict";
import { test } from "node:test";
import { createProperty, gaAccount, gaServiceAccount, gaState, reportsUrl } from "../../src/worker/analytics.ts";
import { applyEdits } from "../../src/worker/edits.ts";
import type { Env } from "../../src/worker/env.ts";
import { buildSite } from "../../src/generator/render.ts";
import { EXAMPLES } from "../../src/examples/examples.ts";

async function serviceAccount() {
  const pair = (await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"])) as CryptoKeyPair;
  const pkcs8 = (await crypto.subtle.exportKey("pkcs8", pair.privateKey)) as ArrayBuffer;
  const b64 = btoa(String.fromCharCode(...new Uint8Array(pkcs8))).replace(/(.{64})/g, "$1\n");
  return { client_email: "ga@proj.iam.gserviceaccount.com", private_key: `-----BEGIN PRIVATE KEY-----\n${b64}\n-----END PRIVATE KEY-----\n`, project_id: "proj" };
}

test("setup state: the service account (its own or the Firebase one) and the account number", () => {
  const sa = JSON.stringify({ client_email: "a@b", private_key: "k", project_id: "p" });
  assert.equal(gaState({} as Env, {}), "off");
  assert.equal(gaState({ FCM_SERVICE_ACCOUNT: sa } as Env, {}), "account");
  assert.equal(gaState({} as Env, { gaAccountId: "123456789" }), "secret");
  assert.equal(gaState({ FCM_SERVICE_ACCOUNT: sa } as Env, { gaAccountId: "accounts/123456789" }), "on");
  assert.equal(gaServiceAccount({ GA_SERVICE_ACCOUNT: JSON.stringify({ client_email: "ga@x", private_key: "k", project_id: "p" }), FCM_SERVICE_ACCOUNT: sa } as Env)!.client_email, "ga@x");
  assert.equal(gaAccount({ gaAccountId: "12ab" }), null);
  assert.equal(reportsUrl("properties/4321"), "https://analytics.google.com/analytics/web/#/p4321/reports/intelligenthome");
});

test("a property and a web stream are created for the business, with Cullman time and the live address", async () => {
  const sa = await serviceAccount();
  const calls: Array<{ url: string; body: any }> = [];
  const fake = (async (url: string, init?: RequestInit) => {
    if (url.includes("oauth2")) return new Response(JSON.stringify({ access_token: "tok", expires_in: 3600 }));
    const body = JSON.parse(String(init!.body));
    calls.push({ url, body });
    assert.equal((init!.headers as Record<string, string>).authorization, "Bearer tok");
    if (url.endsWith("/v1beta/properties")) return new Response(JSON.stringify({ name: "properties/555" }));
    return new Response(JSON.stringify({ name: "properties/555/dataStreams/9", webStreamData: { measurementId: "G-ABC123XYZ" } }));
  }) as typeof fetch;
  const out = await createProperty(sa, "123456789", { name: "Reyes pizza", address: { city: "Hanceville", state: "AL" } as never }, "https://reyes-pizza.pages.dev", fake);
  assert.deepEqual(out, { property: "properties/555", stream: "properties/555/dataStreams/9", measurementId: "G-ABC123XYZ" });
  assert.deepEqual(calls[0]!.body, { parent: "accounts/123456789", displayName: "Reyes pizza (Hanceville, AL)", timeZone: "America/Chicago", currencyCode: "USD" });
  assert.equal(calls[1]!.url, "https://analyticsadmin.googleapis.com/v1beta/properties/555/dataStreams");
  assert.deepEqual(calls[1]!.body.webStreamData, { defaultUri: "https://reyes-pizza.pages.dev" });

  const denied = (async (url: string) =>
    url.includes("oauth2")
      ? new Response(JSON.stringify({ access_token: "tok", expires_in: 3600 }))
      : new Response(JSON.stringify({ error: { message: "The caller does not have permission" } }), { status: 403 })) as typeof fetch;
  await assert.rejects(createProperty(sa, "1234", { name: "X", address: {} as never }, "https://x", denied), /Administrator on the Google Analytics account/);
});

test("the Google tag goes on live pages only, and the privacy page says so", async () => {
  const ex = EXAMPLES.find((e) => e.record.category === "salon") ?? EXAMPLES[0]!;
  const record = { ...ex.record, seo: { gaId: "G-ABC123XYZ" } };
  const live = await buildSite({ record, copy: ex.copy, site: { slug: ex.slug, look: ex.design, origin: "https://x.pages.dev" }, mode: "publish", allowSamples: true, formEndpoint: "https://app/f/1" });
  const home = String(live.files.get("index.html"));
  assert.ok(home.includes("googletagmanager.com/gtag/js?id=G-ABC123XYZ") && home.includes('gtag("config","G-ABC123XYZ")'));
  const privacy = live.files.get("privacy/index.html");
  if (privacy) assert.match(String(privacy), /uses Google Analytics/);
  const preview = await buildSite({ record, copy: ex.copy, site: { slug: ex.slug, look: ex.design }, mode: "preview", allowSamples: true });
  assert.ok(!String(preview.files.get("index.html")).includes("googletagmanager"), "previews never carry the tag");
  const bad = await buildSite({ record: { ...ex.record, seo: { gaId: "G-1\"><script>" } }, copy: ex.copy, site: { slug: ex.slug, look: ex.design, origin: "https://x.pages.dev" }, mode: "publish", allowSamples: true, formEndpoint: "https://app/f/1" });
  assert.ok(!String(bad.files.get("index.html")).includes("googletagmanager"), "only a real G- ID is written");
});

test("saving the Search Console code never wipes the Google Analytics the app set up", () => {
  const ex = EXAMPLES[0]!;
  const record = structuredClone({ ...ex.record, seo: { gaId: "G-ABC123XYZ", ga: { property: "properties/1", stream: "s", measurementId: "G-ABC123XYZ" } } });
  const copy = structuredClone(ex.copy);
  const a = applyEdits(record, copy, { record: { seo: { googleSiteVerification: "abc" } } } as never).record;
  assert.equal(a.seo?.gaId, "G-ABC123XYZ");
  assert.equal(a.seo?.ga?.property, "properties/1");
  assert.equal(a.seo?.googleSiteVerification, "abc");
  const b = applyEdits(a, copy, { record: { seo: { googleSiteVerification: "abc", gaId: "" } } } as never).record;
  assert.equal(b.seo?.gaId, undefined, "blank = use the app's one on the next publish");
  assert.equal(b.seo?.ga?.property, "properties/1");
});
