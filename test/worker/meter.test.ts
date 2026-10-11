import assert from "node:assert/strict";
import test from "node:test";
import { anthropicUsage, classify, drainUsage, flushUsage, installMeter, recordUsage } from "../../src/worker/meter.ts";

test("classify: the hosts we pay for, by what the request does", () => {
  assert.equal(classify("https://places.googleapis.com/v1/places:searchText", "POST"), "places.search");
  assert.equal(classify("https://places.googleapis.com/v1/places/ChIJabc123"), "places.details");
  assert.equal(classify("https://places.googleapis.com/v1/places/ChIJabc/photos/xyz/media?maxWidthPx=1600&key=k"), "places.photo");
  assert.equal(classify("https://api.search.brave.com/res/v1/web/search?q=x"), "brave.search");
  assert.equal(classify("https://api.resend.com/emails", "POST"), "email.sent");
  assert.equal(classify("https://fcm.googleapis.com/v1/projects/p/messages:send", "POST"), "push.sent");
  assert.equal(classify("https://world.openfoodfacts.org/api/v2/product/1.json"), "openfoodfacts.lookup");
  assert.equal(classify("https://api.anthropic.com/v1/messages", "POST"), "anthropic");
  assert.equal(classify("https://api.stripe.com/v1/charges", "POST"), null); // fees are counted from our own records
  assert.equal(classify("https://api.cloudflare.com/client/v4/accounts/x/pages/projects", "POST"), null);
  assert.equal(classify("not a url"), null);
});

test("anthropicUsage: tokens per model from a Messages response", () => {
  assert.deepEqual(anthropicUsage({ model: "claude-opus-5-5", usage: { input_tokens: 1200, output_tokens: 300, cache_read_input_tokens: 0, cache_creation_input_tokens: 900 } }), {
    "anthropic.claude-opus-5-5.calls": 1,
    "anthropic.claude-opus-5-5.in": 1200,
    "anthropic.claude-opus-5-5.out": 300,
    "anthropic.claude-opus-5-5.cache_write": 900,
  });
  assert.equal(anthropicUsage({ error: "x" }), null);
});

test("the metered fetch counts calls and Anthropic tokens, and the flush adds them to usage_daily", async () => {
  const real = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    calls.push(url);
    if (url.includes("anthropic")) return new Response(JSON.stringify({ model: "claude-sonnet-5-5", usage: { input_tokens: 50, output_tokens: 20 } }), { headers: { "content-type": "application/json" } });
    return new Response("{}", { headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  try {
    installMeter();
    await drainUsage(); // start clean
    await fetch("https://places.googleapis.com/v1/places:searchText", { method: "POST" });
    await fetch("https://places.googleapis.com/v1/places:searchText", { method: "POST" });
    const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", body: "{}" });
    assert.equal(((await r.json()) as { model: string }).model, "claude-sonnet-5-5", "the caller still gets the body");
    await fetch("https://example.com/not-metered");
    recordUsage("brave.search");
    const bound: unknown[][] = [];
    const env = { DB: { prepare: () => ({ bind: (...a: unknown[]) => (bound.push(a), { bound: a }) }), batch: async (stmts: unknown[]) => stmts.map(() => ({})) } } as never;
    await flushUsage(env);
    const by = Object.fromEntries(bound.map((b) => [b[1], b[2]]));
    assert.equal(by["places.search"], 2);
    assert.equal(by["anthropic.claude-sonnet-5-5.calls"], 1);
    assert.equal(by["anthropic.claude-sonnet-5-5.in"], 50);
    assert.equal(by["anthropic.claude-sonnet-5-5.out"], 20);
    assert.equal(by["brave.search"], 1);
    assert.ok(!("example.com" in by));
    assert.match(String(bound[0]![0]), /^\d{4}-\d{2}-\d{2}$/);
    assert.equal((await drainUsage()).size, 0, "flushed counts are cleared");
  } finally {
    globalThis.fetch = real;
  }
});
