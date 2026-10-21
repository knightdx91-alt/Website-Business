import assert from "node:assert/strict";
import { test } from "node:test";
import { finishSearchConsole, metaContent, prepareSearchConsole, siteId } from "../../src/worker/searchconsole.ts";
import { applyEdits } from "../../src/worker/edits.ts";
import type { Env } from "../../src/worker/env.ts";
import type { LeadRow } from "../../src/worker/db.ts";
import { buildSite } from "../../src/generator/render.ts";
import { EXAMPLES } from "../../src/examples/examples.ts";

async function serviceAccount() {
  const pair = (await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"])) as CryptoKeyPair;
  const pkcs8 = (await crypto.subtle.exportKey("pkcs8", pair.privateKey)) as ArrayBuffer;
  const b64 = btoa(String.fromCharCode(...new Uint8Array(pkcs8))).replace(/(.{64})/g, "$1\n");
  return JSON.stringify({ client_email: "sa@proj.iam.gserviceaccount.com", private_key: `-----BEGIN PRIVATE KEY-----\n${b64}\n-----END PRIVATE KEY-----\n`, project_id: "proj" });
}

/** Just enough D1 for searchconsole.ts: one lead row, settings, call-log notes. */
function fakeDb(lead: LeadRow, settings: Record<string, string> = {}) {
  const notes: string[] = [];
  const DB = {
    prepare(sql: string) {
      let args: unknown[] = [];
      const st = {
        bind(...a: unknown[]) { args = a; return st; },
        async first() {
          if (sql.includes("FROM settings")) return settings[args[0] as string] !== undefined ? { value: settings[args[0] as string] } : null;
          if (sql.includes("FROM leads")) return { ...lead };
          return null;
        },
        async run() {
          if (sql.startsWith("INSERT INTO settings")) settings[args[0] as string] = args[1] as string;
          else if (sql.startsWith("UPDATE leads SET")) {
            const cols = [...sql.matchAll(/(\w+) = \?/g)].map((m) => m[1]!);
            cols.forEach((c, i) => { if (c !== "id") (lead as any)[c] = args[i]; });
          } else if (sql.startsWith("INSERT INTO lead_notes")) notes.push(args[3] as string);
          return { meta: { changes: 1 } };
        },
        async all() { return { results: [] }; },
      };
      return st;
    },
  };
  return { DB, notes, settings, lead };
}

test("site id and the code inside Google's meta tag", () => {
  assert.equal(siteId("https://joes.pages.dev"), "https://joes.pages.dev/");
  assert.equal(siteId("https://joes.com/"), "https://joes.com/");
  assert.equal(metaContent('<meta name="google-site-verification" content="AbC_123-xyzXYZ" />'), "AbC_123-xyzXYZ");
  assert.equal(metaContent('<meta content="bad code!">'), null);
});

test("published pages carry the app's code beside the owner's own; previews carry neither", async () => {
  const ex = EXAMPLES[0]!;
  const record = { ...ex.record, seo: { googleSiteVerification: "OwnersOwnCode123", gsc: { site: "https://x.pages.dev/", token: "AppMadeCode456789" } } };
  const pub = await buildSite({ record, copy: ex.copy, site: { slug: ex.slug, look: ex.design, origin: "https://x.pages.dev" }, mode: "publish", allowSamples: true });
  const home = String(pub.files.get("index.html"));
  assert.match(home, /content="OwnersOwnCode123"/);
  assert.match(home, /content="AppMadeCode456789"/);
  const prev = await buildSite({ record, copy: ex.copy, site: { slug: ex.slug, look: ex.design }, mode: "preview", allowSamples: true });
  assert.doesNotMatch(String(prev.files.get("index.html")), /google-site-verification/);
});

test("saving the Search Console code in Edit keeps the app's setup", () => {
  const r = structuredClone(EXAMPLES[0]!.record);
  r.seo = { gsc: { site: "https://x.pages.dev/", token: "AppMadeCode456789", verified: 1 } };
  const out = applyEdits(r, EXAMPLES[0]!.copy, { record: { seo: { googleSiteVerification: "" } } } as never).record;
  assert.equal(out.seo?.gsc?.token, "AppMadeCode456789");
});

test("publish: code fetched for the live address, then verified, added, sitemap sent and our address made an owner", async () => {
  const lead = { id: "L1", place_id: "p1", record_json: JSON.stringify({ ...EXAMPLES[0]!.record, placeId: "p1" }) } as LeadRow;
  const db = fakeDb(lead, { app_settings: JSON.stringify({ ownerEmail: "post@undergroundassociates.com" }) });
  const env = { DB: db.DB, FCM_SERVICE_ACCOUNT: await serviceAccount() } as unknown as Env;
  const calls: string[] = [];
  let owners: string[] = ["sa@proj.iam.gserviceaccount.com"];
  const fake = (async (url: string, init?: RequestInit) => {
    const u = String(url);
    if (u.includes("oauth2")) return new Response(JSON.stringify({ access_token: "t", expires_in: 3600 }));
    calls.push(`${init?.method} ${u.replace("https://www.googleapis.com", "")}`);
    if (u.endsWith("/token")) return new Response(JSON.stringify({ method: "META", token: '<meta name="google-site-verification" content="AppMadeCode456789" />' }));
    if (u.includes("/webResource/") && init?.method === "GET") return new Response(JSON.stringify({ owners }));
    if (u.includes("/webResource/") && init?.method === "PUT") { owners = JSON.parse(String(init.body)).owners; return new Response("{}"); }
    return new Response("{}");
  }) as typeof fetch;
  const after = await prepareSearchConsole(env, lead, "https://joes.pages.dev", fake);
  assert.equal(JSON.parse(after.record_json!).seo.gsc.token, "AppMadeCode456789");
  assert.equal(await finishSearchConsole(env, "L1", fake), true);
  const site = encodeURIComponent("https://joes.pages.dev/");
  assert.ok(calls.includes("POST /siteVerification/v1/webResource?verificationMethod=META"));
  assert.ok(calls.includes(`PUT /webmasters/v3/sites/${site}`));
  assert.ok(calls.includes(`PUT /webmasters/v3/sites/${site}/sitemaps/${encodeURIComponent("https://joes.pages.dev/sitemap.xml")}`));
  assert.deepEqual(owners, ["sa@proj.iam.gserviceaccount.com", "post@undergroundassociates.com"]);
  const gsc = JSON.parse(db.lead.record_json!).seo.gsc;
  assert.ok(gsc.verified && gsc.sitemap);
  assert.match(db.notes[0]!, /Search Console set up/);
});

test("a site Google can't read yet stays pending with the reason, for the cron to retry", async () => {
  const rec = { ...EXAMPLES[0]!.record, seo: { gsc: { site: "https://joes.pages.dev/", token: "AppMadeCode456789" } } };
  const lead = { id: "L2", place_id: "p2", record_json: JSON.stringify(rec) } as LeadRow;
  const db = fakeDb(lead);
  const env = { DB: db.DB, FCM_SERVICE_ACCOUNT: await serviceAccount() } as unknown as Env;
  const fake = (async (url: string) =>
    String(url).includes("oauth2")
      ? new Response(JSON.stringify({ access_token: "t2", expires_in: 3600 }))
      : new Response(JSON.stringify({ error: { message: "The necessary verification token could not be found on your site." } }), { status: 400 })) as typeof fetch;
  assert.equal(await finishSearchConsole(env, "L2", fake), false);
  const gsc = JSON.parse(db.lead.record_json!).seo.gsc;
  assert.equal(gsc.tries, 1);
  assert.match(gsc.error, /verification token/);
  assert.equal(gsc.verified, undefined);
});
