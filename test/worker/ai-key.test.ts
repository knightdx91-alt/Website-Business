import assert from "node:assert/strict";
import { test } from "node:test";
import { AI_KEY_RE, aiKeyStatus, clearAiKey, saveAiKey, testAiKey, withAiKey } from "../../src/worker/ai-key.ts";
import type { Env } from "../../src/worker/env.ts";

/** A settings table in memory, enough for getSetting / setSetting / the DELETE. */
function fakeEnv(workerKey = "sk-ant-worker"): Env {
  const rows = new Map<string, string>();
  const DB = {
    prepare(sql: string) {
      let args: unknown[] = [];
      const st = {
        bind(...a: unknown[]) { args = a; return st; },
        async first() { return rows.has(args[0] as string) ? { value: rows.get(args[0] as string) } : null; },
        async run() {
          if (/^INSERT/.test(sql)) rows.set(args[0] as string, args[1] as string);
          if (/^DELETE/.test(sql)) rows.delete(args[0] as string);
          return { meta: { changes: 1 } };
        },
      };
      return st;
    },
  };
  return { DB, APP_SECRET: "test-secret", ANTHROPIC_API_KEY: workerKey } as unknown as Env;
}

const reply = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

test("only sk-ant- keys are accepted", () => {
  assert.ok(AI_KEY_RE.test("sk-ant-api03-" + "a".repeat(40)));
  for (const bad of ["", "sk-abc", "hello", "sk-ant-short"]) assert.ok(!AI_KEY_RE.test(bad), bad);
});

test("the key check explains a bad key and an empty account", async () => {
  assert.deepEqual(await testAiKey("k", reply(200, {})), { ok: true });
  assert.deepEqual(await testAiKey("k", reply(429, {})), { ok: true });
  const bad = await testAiKey("k", reply(401, { error: { message: "invalid x-api-key" } }));
  assert.ok(!bad.ok && /isn't valid/.test(bad.error));
  const broke = await testAiKey("k", reply(400, { error: { message: "Your credit balance is too low to access the Anthropic API." } }));
  assert.ok(!broke.ok && /no credit/.test(broke.error));
});

test("a saved key wins over the Worker secret, is stored encrypted, and can be removed", async () => {
  const env = fakeEnv();
  assert.equal((await aiKeyStatus(env)).using, "worker");
  const key = "sk-ant-api03-" + "b".repeat(40) + "WXYZ";
  await saveAiKey(env, key, "Owner");
  const stored = (await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind("anthropic_key").first<{ value: string }>())!.value;
  assert.ok(!stored.includes(key.slice(10)), "the key is not stored in plain text");
  assert.equal((await withAiKey(env)).ANTHROPIC_API_KEY, key);
  const st = await aiKeyStatus(env);
  assert.equal(st.using, "app");
  assert.equal(st.last4, "WXYZ");
  assert.ok(!JSON.stringify(st).includes(key.slice(10)), "the status never carries the key");
  await clearAiKey(env);
  assert.equal((await withAiKey(env)).ANTHROPIC_API_KEY, "sk-ant-worker");
});

test("a key saved under another app secret falls back to the Worker secret", async () => {
  const env = fakeEnv();
  await saveAiKey(env, "sk-ant-api03-" + "c".repeat(40), "Owner");
  const other = { ...env, APP_SECRET: "rotated" } as Env;
  const st = await aiKeyStatus(other);
  assert.equal(st.unreadable, true);
  assert.equal(st.using, "worker");
  assert.equal((await withAiKey(other)).ANTHROPIC_API_KEY, "sk-ant-worker");
});
