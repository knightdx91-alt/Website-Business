import assert from "node:assert/strict";
import { test } from "node:test";
import type { Env } from "../../src/worker/env.ts";
import { maskEmail, sendEmail } from "../../src/worker/mail.ts";

test("emails go to Resend as the company address, with reply-to; nothing is sent without a key", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const real = globalThis.fetch;
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  try {
    assert.equal(await sendEmail({} as Env, { from: "info@x.com", fromName: "X", to: "a@b.com", subject: "s", text: "t" }), false);
    assert.equal(calls.length, 0);
    assert.equal(await sendEmail({ RESEND_API_KEY: "re_test" } as Env, { from: "info@x.com", fromName: "Underground Associates", to: "owner@shop.com", subject: "Hi", text: "Link", replyTo: "info@x.com" }), true);
    assert.equal(calls[0]!.url, "https://api.resend.com/emails");
    assert.equal((calls[0]!.init.headers as Record<string, string>).authorization, "Bearer re_test");
    const body = JSON.parse(String(calls[0]!.init.body));
    assert.deepEqual(body, { from: "Underground Associates <info@x.com>", to: ["owner@shop.com"], subject: "Hi", text: "Link", reply_to: "info@x.com" });
  } finally {
    globalThis.fetch = real;
  }
  assert.equal(maskEmail("pat@gmail.com"), "p•••@gmail.com");
});
