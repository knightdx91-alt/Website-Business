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

test("MailerSend is used when only its key is set", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const real = globalThis.fetch;
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(null, { status: 202 });
  }) as typeof fetch;
  try {
    assert.equal(await sendEmail({ MAILERSEND_API_KEY: "mlsn.test" } as Env, { from: "info@x.com", fromName: "UA", to: "owner@shop.com", subject: "Hi", text: "Link", replyTo: "info@x.com" }), true);
    assert.equal(calls[0]!.url, "https://api.mailersend.com/v1/email");
    assert.equal((calls[0]!.init.headers as Record<string, string>).authorization, "Bearer mlsn.test");
    assert.deepEqual(JSON.parse(String(calls[0]!.init.body)), { from: { email: "info@x.com", name: "UA" }, to: [{ email: "owner@shop.com" }], subject: "Hi", text: "Link", reply_to: { email: "info@x.com" } });
    // With both keys set, Resend is used.
    calls.length = 0;
    await sendEmail({ MAILERSEND_API_KEY: "mlsn.test", RESEND_API_KEY: "re_x" } as Env, { from: "info@x.com", fromName: "UA", to: "owner@shop.com", subject: "Hi", text: "Link" });
    assert.equal(calls[0]!.url, "https://api.resend.com/emails");
  } finally {
    globalThis.fetch = real;
  }
});
