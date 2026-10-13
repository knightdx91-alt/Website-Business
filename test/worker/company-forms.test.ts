import assert from "node:assert/strict";
import { test } from "node:test";
import { serveCompany } from "../../src/worker/company.ts";
import type { Env } from "../../src/worker/env.ts";
import { formStamp, HUMAN_NOTE } from "../../src/worker/spam.ts";

/**
 * Enough of D1 for the change-request and contact handlers: the lead lookup, settings (app_settings + the spam module's
 * keys), the per-address submission count, and a record of every INSERT so a dropped post can be told from a kept one.
 */
function fakeEnv(o: { settings?: Record<string, unknown>; secret?: string } = {}) {
  const store = new Map<string, string>();
  if (o.settings) store.set("app_settings", JSON.stringify(o.settings));
  const inserted: string[] = [];
  const env = {
    APP_SECRET: "test-secret",
    TURNSTILE_SECRET_KEY: o.secret,
    DB: {
      prepare: (q: string) => ({
        bind: (...args: unknown[]) => ({
          first: async () => {
            if (q.startsWith("SELECT id, name FROM leads")) return args[0] === "kingfish1" ? { id: "kingfish1", name: "King Fish Aquatics" } : null;
            if (q.startsWith("SELECT value FROM settings")) return store.has(String(args[0])) ? { value: store.get(String(args[0])) } : null;
            if (q.startsWith("SELECT COUNT(*)")) return { n: 0 };
            return null;
          },
          run: async () => {
            if (q.startsWith("INSERT INTO settings")) store.set(String(args[0]), String(args[1]));
            else inserted.push(q.split(" (")[0]!);
            return {};
          },
          all: async () => ({ results: [] }),
        }),
        all: async () => ({ results: [] }),
        run: async () => ({}),
        first: async () => null,
      }),
    },
  } as unknown as Env;
  return { env, store, inserted };
}

const HOST = "https://undergroundassociates.com";
const post = (path: string, fields: Record<string, string>, ip = "203.0.113.9") =>
  new Request(`${HOST}${path}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", "cf-connecting-ip": ip },
    body: new URLSearchParams(fields).toString(),
  });
const serve = (env: Env, req: Request) => serveCompany(env, req, new URL(req.url));

test("the change-request page carries the render stamp, and the Turnstile widget + CSP only once the site key is saved", async () => {
  const plain = fakeEnv({ settings: { companyName: "Underground Associates" } });
  let res = (await serve(plain.env, new Request(`${HOST}/change?b=kingfish1`)))!;
  let html = await res.text();
  assert.equal(res.status, 200);
  assert.match(html, /<input type="hidden" name="_t" value="\d+\.[A-Za-z0-9_-]+">/);
  assert.doesNotMatch(html, /class="cf-turnstile"/, "the stylesheet names the class; no widget without a key");
  assert.doesNotMatch(res.headers.get("content-security-policy")!, /challenges\.cloudflare\.com/);
  const keyed = fakeEnv({ settings: { companyName: "Underground Associates", turnstileSiteKey: "0x4AAAAAAAtest" } });
  res = (await serve(keyed.env, new Request(`${HOST}/change?b=kingfish1`)))!;
  html = await res.text();
  assert.match(html, /<div class="cf-turnstile" data-sitekey="0x4AAAAAAAtest" data-theme="dark" data-size="flexible"><\/div><script src="https:\/\/challenges\.cloudflare\.com\/turnstile\/v0\/api\.js" async defer><\/script>/);
  const csp = res.headers.get("content-security-policy")!;
  assert.match(csp, /script-src [^;]*https:\/\/challenges\.cloudflare\.com/);
  assert.match(csp, /frame-src https:\/\/challenges\.cloudflare\.com/);
  assert.match(csp, /connect-src 'self' https:\/\/challenges\.cloudflare\.com/);
});

test("a change request posted without the stamp, or reading like spam, gets the thank-you and is logged, not kept", async () => {
  const { env, store, inserted } = fakeEnv({ settings: {} });
  // No stamp: the form was never loaded (a bot posting straight to the URL).
  let res = (await serve(env, post("/change?b=kingfish1", { name: "SEO Team", message: "We can get you backlinks" })))!;
  let html = await res.text();
  assert.match(html, /Thanks! We got it and will take care of it\./);
  assert.deepEqual(inserted, [], "nothing stored");
  let log = JSON.parse(store.get("spam_log")!) as { recent: Array<{ scope: string; reasons: string[]; who: string }> };
  assert.equal(log.recent[0]!.scope, "Change request for King Fish Aquatics");
  assert.deepEqual(log.recent[0]!.reasons, ["posted without loading the form"]);
  assert.equal(log.recent[0]!.who, "SEO Team");
  // A stamp from 20 seconds ago, but the words are a pitch.
  const stamp = await formStamp("test-secret", Date.now() - 20_000);
  res = (await serve(env, post("/change?b=kingfish1", { name: "SEO Team", message: "We noticed your website has no backlinks. Our team can fix that: https://seo-x.pro", _t: stamp })))!;
  html = await res.text();
  assert.match(html, /Thanks! We got it/);
  assert.deepEqual(inserted, []);
  log = JSON.parse(store.get("spam_log")!) as typeof log;
  assert.ok(log.recent[0]!.reasons.includes("link selling"), log.recent[0]!.reasons.join(", "));
  // A real request with the stamp but no name still gets the normal "please add" note (never a silent drop for people).
  res = (await serve(env, post("/change?b=kingfish1", { name: "", message: "Please change our Saturday hours to 9-3.", _t: stamp })))!;
  assert.match(await res.text(), /Please add your name and what you'd like changed/);
});

test("with Turnstile on, a real post without the widget's token is asked to try again, on /change and on the contact form", async () => {
  const { env, store, inserted } = fakeEnv({ settings: { turnstileSiteKey: "0x4AAAAAAAtest" }, secret: "sec" });
  const stamp = await formStamp("test-secret", Date.now() - 20_000);
  let res = (await serve(env, post("/change?b=kingfish1", { name: "Pat", message: "Please change our Saturday hours to 9-3.", _t: stamp })))!;
  assert.match(await res.text(), new RegExp(HUMAN_NOTE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/'/g, "'")));
  assert.deepEqual(inserted, []);
  assert.equal(store.has("spam_log"), false, "a person is never logged as spam");
  // The home page's contact form: back to the form with ?human=1.
  res = (await serve(env, post("/contact", { name: "Pat", phone: "256-555-0101", message: "Can I see my preview?", _t: stamp })))!;
  assert.equal(res.status, 303);
  assert.equal(res.headers.get("location"), `${HOST}/?human=1#contact`);
  // And a stampless contact post is the plain thank-you, logged.
  res = (await serve(env, post("/contact", { name: "Rank Flow AI", email: "pageranktechnology@gmail.com", message: "Is your website getting the search visibility it deserves? http://www.RankFlow-AI.Com" })))!;
  assert.equal(res.headers.get("location"), `${HOST}/?sent=1#contact`);
  const log = JSON.parse(store.get("spam_log")!) as { recent: Array<{ scope: string; who: string }> };
  assert.equal(log.recent[0]!.scope, "Website contact form");
  assert.equal(log.recent[0]!.who, "Rank Flow AI <pageranktechnology@gmail.com>");
  assert.deepEqual(inserted, []);
});
