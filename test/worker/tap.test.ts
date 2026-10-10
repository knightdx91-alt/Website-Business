import { test } from "node:test";
import assert from "node:assert/strict";
import { tapToken, verifyTap } from "../../src/worker/auth.ts";
import { nextPeriodStart, tapIntentUrl, TAP_PACKAGE } from "../../src/worker/tap.ts";
import type { Env } from "../../src/worker/env.ts";

const env = { APP_SECRET: "test-secret" } as Env;

test("tap tokens round-trip, expire, and reject a changed nonce or signature", async () => {
  const t = await tapToken(env, "abc123", "0a1b2c", 10);
  assert.deepEqual(await verifyTap(env, t), { signupId: "abc123", nonce: "0a1b2c" });
  const expired = await tapToken(env, "abc123", "0a1b2c", -1);
  assert.equal(await verifyTap(env, expired), null);
  assert.equal(await verifyTap(env, t.replace(".0a1b2c.", ".0a1b2d.")), null);
  assert.equal(await verifyTap(env, t.slice(0, -2) + "zz"), null);
  assert.equal(await verifyTap({ APP_SECRET: "other" } as Env, t), null);
  assert.equal(await verifyTap(env, "garbage"), null);
});

test("the intent link names our package, carries the token and origin, and falls back to Settings", () => {
  const url = tapIntentUrl("sig.1.2.3", "https://app.example");
  assert.ok(url.startsWith("intent://tap?t=sig.1.2.3&o=https%3A%2F%2Fapp.example#Intent;scheme=wbpay;"));
  assert.ok(url.includes(`package=${TAP_PACKAGE};`));
  assert.ok(url.endsWith("S.browser_fallback_url=https%3A%2F%2Fapp.example%2F%23%2Fsettings;end"));
});

test("the subscription starts exactly one period after the in-person payment", () => {
  const d = (s: string) => new Date(s);
  const iso = (secs: number) => new Date(secs * 1000).toISOString();
  assert.equal(iso(nextPeriodStart(d("2026-10-10T15:04:05Z"), "month")), "2026-11-10T15:04:05.000Z");
  assert.equal(iso(nextPeriodStart(d("2026-01-31T12:00:00Z"), "month")), "2026-02-28T12:00:00.000Z");
  assert.equal(iso(nextPeriodStart(d("2028-01-31T12:00:00Z"), "month")), "2028-02-29T12:00:00.000Z");
  assert.equal(iso(nextPeriodStart(d("2026-12-15T00:00:00Z"), "month")), "2027-01-15T00:00:00.000Z");
  assert.equal(iso(nextPeriodStart(d("2026-10-10T15:04:05Z"), "year")), "2027-10-10T15:04:05.000Z");
  assert.equal(iso(nextPeriodStart(d("2028-02-29T09:00:00Z"), "year")), "2029-02-28T09:00:00.000Z");
});
