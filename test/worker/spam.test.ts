import assert from "node:assert/strict";
import { test } from "node:test";
import type { Env } from "../../src/worker/env.ts";
import {
  BLOCK_SCORE,
  blockedSummary,
  checkStamp,
  formShieldHtml,
  formStamp,
  pruneSpamCounters,
  screenForm,
  spamScore,
  turnstileCheck,
  turnstileState,
} from "../../src/worker/spam.ts";

/** A settings table in memory: getSetting / setSetting / the prune DELETE are all the module needs. */
function fakeEnv(o: { secret?: string } = {}) {
  const store = new Map<string, string>();
  const sql: string[] = [];
  const env = {
    APP_SECRET: "test-secret",
    TURNSTILE_SECRET_KEY: o.secret,
    DB: {
      prepare: (q: string) => {
        sql.push(q);
        return {
          bind: (...args: unknown[]) => ({
            first: async () => (q.startsWith("SELECT value") && store.has(String(args[0])) ? { value: store.get(String(args[0])) } : null),
            run: async () => {
              if (q.startsWith("INSERT INTO settings")) store.set(String(args[0]), String(args[1]));
              if (q.startsWith("DELETE FROM settings"))
                for (const [k, v] of [...store]) if (k.startsWith("spam_ip:") && (JSON.parse(v) as { since: number }).since < Number(args[0])) store.delete(k);
              return {};
            },
          }),
        };
      },
    },
  } as unknown as Env;
  return { env, store, sql };
}

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.append(k, v);
  return f;
};

// The three posts that reached the inbox in October 2026 (verbatim), and the owner's own test message.
const REAL_SPAM = [
  {
    name: "Odell Bunbury",
    phone: "7810644879",
    email: "domains@search-undergroundassociates.com",
    business: "Odell Bunbury",
    message: "Greetings\r\n\r\nSubmit undergroundassociates.com in Google's Search Index and have it show up in web search results!\r\n\r\nFeature undergroundassociates.com today: searchregister.pro",
  },
  {
    name: "SpeedyIndex Team",
    phone: "83542652153",
    email: "alex.speedyindex@gmail.com",
    business: "Apple",
    message:
      "Hi Team, \r\n \r\nWe checked the indexing status for undergroundassociates.com and noticed that some recent pages or backlinks might not be visible in Google yet. This usually slows down organic traffic growth. \r\n \r\nYou can speed this up using SpeedyIndex — a service that helps Google process your URLs faster. \r\n \r\nClaim your 200 free indexing credits today. And when you're ready to scale up, use promo code WELCOME15 to receive an extra 15% bonus tokens with your next top-up. \r\n \r\nGet started here: https://speedy-bonus.digital/ \r\n \r\nBest regards, \r\nThe SpeedyIndex Team",
  },
  {
    name: "Rank Flow AI",
    phone: "1201201200",
    email: "pageranktechnology@gmail.com",
    business: "Rank Flow AI",
    message:
      "Hi,\r\n\r\nIs your website getting the search visibility it deserves?\r\n\r\nWith RankFlow-AI, you can get a free SEO & AEO audit of your website and quickly identify what’s holding back your online visibility.\r\n\r\nRankFlow-AI helps you:undergroundassociates.com\r\n\r\nIdentify SEO & AEO issues\r\nTrack keyword performance\r\nMonitor your search visibility\r\nAutomate routine SEO tasks\r\n\r\nSpend just 5–10 minutes a day reviewing your progress while RankFlow-AI handles the ongoing work in the background.\r\n\r\nCreate your free account and run your audit today: http://www.RankFlow-AI.Com\r\n\r\nRankFlow-AI",
  },
];
const MORE_SPAM = [
  { name: "Priya", email: "priya.designs@gmail.com", message: "Hi, I'm a freelance web designer on Upwork. I noticed your website could use a redesign. Check my portfolio https://priyadesigns.in and WhatsApp me at +91 98765." },
  { name: "Domain Services", email: "notice@domain-notice.xyz", message: "Your domain undergroundassociates.com is about to expire. Renew now: https://domain-notice.xyz/renew" },
  { name: "Mark", email: "mark@gmail.com", message: "Nice site! Check https://casino-x.com" },
  { name: "Ava from Callwise", email: "ava@callwise.ai", message: "We build AI agents that answer your calls 24/7 so you never miss a lead. Book a demo: https://callwise.ai/demo" },
  { name: "Иван", email: "ivan@mail.ru", message: "Здравствуйте! Предлагаем рассылку по базам предприятий. Подробнее на сайте." },
];
const REAL_INQUIRIES = [
  { name: "Mike Jones", business: "Mike's Plumbing", phone: "256-555-0123", message: "Saw your flyer. Can you show me the preview?" },
  { name: "Sarah", email: "sarah@cullmanbbq.com", message: "Can you do SEO for my site www.cullmanbbq.com? We want more traffic and to show up on Google." },
  { name: "Pastor Dan", message: "Greetings, our church would like a website. Please call 256-555-0199 after 2." },
  { name: "Ana", phone: "256 555 0177", message: "Hola, tengo una taquería en Cullman y quiero una página web. Mi número es 256 555 0177." },
  { name: "Linda", email: "linda@gmail.com", message: "Please update our hours to 9-5 and add the new photo https://drive.google.com/file/d/abc" },
  { name: "Tom", business: "Tom's Auto", phone: "205-555-0101", email: "tom@tomsauto.com", message: "I got your text about the website preview. How much is it a month and do you do Google Business Profile too?" },
  { name: "Josh", email: "josh@gmail.com", message: "We run a small marketing agency in Birmingham and would love to partner with you on web design for our clients. Our site: joshmedia.com" },
  { name: "Post", phone: "256365886", email: "postpeleos@gmail.com", business: "Underground Associates LLC" },
  { name: "Frank Lin", email: "franklin@gmail.com", phone: "", message: "Do you build sites for pressure washing? I have about 40 reviews on Google." },
];

test("the words: the real spam scores as spam, real inquiries don't", () => {
  for (const f of [...REAL_SPAM, ...MORE_SPAM]) {
    const { score, reasons } = spamScore(f);
    assert.ok(score >= BLOCK_SCORE, `${f.name}: ${score} (${reasons.join(", ")})`);
  }
  for (const f of REAL_INQUIRIES) {
    const { score, reasons } = spamScore(f);
    assert.ok(score < BLOCK_SCORE, `${f.name}: ${score} (${reasons.join(", ")})`);
  }
  const first = spamScore(REAL_SPAM[0]!);
  assert.ok(first.reasons.includes("domain or listing scam"), first.reasons.join(", "));
  assert.ok(first.reasons.includes("names our domain"));
  const second = spamScore(REAL_SPAM[1]!);
  assert.ok(second.reasons.includes("link selling"));
  assert.ok(second.reasons.includes("sender named like a vendor"));
  assert.ok(second.reasons.includes("vendor-like email address"));
  assert.ok(spamScore(REAL_INQUIRIES[0]!).reasons.includes("local phone number"));
  assert.ok(spamScore(MORE_SPAM[4]!).reasons.includes("not in English or Spanish"));
});

test("the render stamp: fresh, forged, another secret, stale", async () => {
  const t0 = 1_760_000_000_000;
  const stamp = await formStamp("s1", t0);
  assert.match(stamp, /^1760000000000\.[A-Za-z0-9_-]{40,}$/);
  assert.deepEqual(await checkStamp("s1", stamp, t0 + 8_000), { age: 8_000, stale: false });
  assert.equal(await checkStamp("s2", stamp, t0 + 8_000), null, "signed with another secret");
  assert.equal(await checkStamp("s1", `${t0 + 1}.${stamp.split(".")[1]}`, t0 + 8_000), null, "time changed");
  assert.equal(await checkStamp("s1", "", t0), null);
  assert.equal(await checkStamp("s1", "garbage", t0), null);
  assert.equal(await checkStamp("s1", stamp, t0 - 120_000), null, "from the future");
  assert.deepEqual(await checkStamp("s1", stamp, t0 + 25 * 3_600_000), { age: 25 * 3_600_000, stale: true });
});

test("Turnstile: enforced only with both keys; Cloudflare's answer; our own mistakes and outages never lock people out", async () => {
  assert.equal(turnstileState({ TURNSTILE_SECRET_KEY: "x" }, { turnstileSiteKey: "0x1" }), "on");
  assert.equal(turnstileState({ TURNSTILE_SECRET_KEY: undefined }, { turnstileSiteKey: "0x1" }), "key");
  assert.equal(turnstileState({ TURNSTILE_SECRET_KEY: "x" }, {}), "secret");
  assert.equal(turnstileState({}, {}), "off");
  const calls: Array<{ url: string; body: Record<string, string> }> = [];
  const fetcher = (answer: unknown, status = 200) =>
    (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), body: JSON.parse(String(init?.body)) as Record<string, string> });
      return new Response(JSON.stringify(answer), { status, headers: { "content-type": "application/json" } });
    }) as typeof fetch;
  const env = { TURNSTILE_SECRET_KEY: "sec" };
  assert.equal(await turnstileCheck({}, "0x1", "tok", "1.2.3.4", fetcher({ success: true })), "skip", "no secret");
  assert.equal(await turnstileCheck(env, undefined, "tok", "1.2.3.4", fetcher({ success: true })), "skip", "no site key");
  assert.equal(calls.length, 0, "nothing is asked when it isn't set up");
  assert.equal(await turnstileCheck(env, "0x1", "", "1.2.3.4", fetcher({ success: true })), "fail", "no token");
  assert.equal(await turnstileCheck(env, "0x1", "tok", "1.2.3.4", fetcher({ success: true })), "ok");
  assert.equal(calls[0]!.url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
  assert.deepEqual(calls[0]!.body, { secret: "sec", response: "tok", remoteip: "1.2.3.4" });
  assert.equal(await turnstileCheck(env, "0x1", "tok", "", fetcher({ success: false, "error-codes": ["invalid-input-response"] })), "fail");
  assert.equal(await turnstileCheck(env, "0x1", "tok", "", fetcher({ success: false, "error-codes": ["timeout-or-duplicate"] })), "fail");
  assert.equal(await turnstileCheck(env, "0x1", "tok", "", fetcher({ success: false, "error-codes": ["invalid-input-secret"] })), "skip", "our secret is wrong: don't punish visitors");
  assert.equal(await turnstileCheck(env, "0x1", "tok", "", fetcher({}, 503)), "skip", "Cloudflare down");
  assert.equal(await turnstileCheck(env, "0x1", "tok", "", (async () => { throw new Error("net"); }) as typeof fetch), "skip");
  assert.equal(calls.at(-1)!.body.remoteip, undefined, "no address, no remoteip");
});

test("screenForm: the hidden field, the stamp, the words, the repeat-sender cap, a clean post, and what gets logged", async () => {
  const { env, store } = fakeEnv();
  const t0 = 1_760_000_000_000;
  const stamp = await formStamp("test-secret", t0);
  const clean = { name: "Mike Jones", business: "Mike's Plumbing", phone: "256-555-0123", message: "Saw your flyer. Can you show me the preview?" };
  const opts = (fields: Record<string, string>, ip = "9.9.9.9") => ({ scope: "Website contact form", ip, fields, now: t0 + 30_000 });
  // Honeypot.
  let r = await screenForm(env, {}, fd({ ...clean, website: "http://x", [`_t`]: stamp }), opts(clean));
  assert.deepEqual([r.block, r.reasons], [true, ["filled the hidden field"]]);
  // No stamp: the form was never loaded.
  r = await screenForm(env, {}, fd(clean), opts(clean));
  assert.deepEqual([r.block, r.reasons], [true, ["posted without loading the form"]]);
  // Too fast.
  r = await screenForm(env, {}, fd({ ...clean, _t: stamp }), { ...opts(clean), now: t0 + 900 });
  assert.equal(r.block, true);
  assert.match(r.reasons[0]!, /^sent 0\.9 seconds after the page loaded$/);
  // The words.
  const spam = REAL_SPAM[1]!;
  r = await screenForm(env, {}, fd({ ...spam, _t: stamp }), opts(spam));
  assert.equal(r.block, true);
  assert.ok(r.score >= BLOCK_SCORE);
  // Everything so far was logged against 9.9.9.9 and in the month.
  assert.equal(JSON.parse(store.get("spam_ip:9.9.9.9")!).count, 4);
  let sum = await blockedSummary(env, t0);
  assert.equal(sum.month, 4);
  assert.equal(sum.recent.length, 4);
  assert.equal(sum.recent[0]!.who, "SpeedyIndex Team (Apple) <alex.speedyindex@gmail.com>");
  assert.match(sum.recent[0]!.snippet, /^Hi Team, We checked the indexing status/);
  assert.equal(sum.recent[0]!.scope, "Website contact form");
  assert.ok(sum.recent[0]!.reasons.includes("link selling"));
  // A clean post from that address still goes through at 4 blocks; the fifth block shuts the hour.
  r = await screenForm(env, {}, fd({ ...clean, _t: stamp }), opts(clean));
  assert.deepEqual([r.block, r.human], [false, "skip"]);
  await screenForm(env, {}, fd({ ...REAL_SPAM[2]!, _t: stamp }), opts(REAL_SPAM[2]!));
  r = await screenForm(env, {}, fd({ ...clean, _t: stamp }), opts(clean));
  assert.deepEqual([r.block, r.reasons], [true, ["blocked 5 times in the last hour"]]);
  // Another address is unaffected, and a stale stamp is a point, not a block.
  r = await screenForm(env, {}, fd({ ...clean, _t: stamp }), { ...opts(clean, "8.8.8.8"), now: t0 + 30 * 3_600_000 });
  assert.equal(r.block, false);
  assert.ok(r.reasons.includes("form left open for over a day"));
  // Client-site forms: no stamp expected, no Turnstile.
  r = await screenForm(env, {}, fd(clean), { ...opts(clean, "7.7.7.7"), scope: "Website of Mike's Plumbing", stamp: false, turnstile: false });
  assert.deepEqual([r.block, r.human], [false, "skip"]);
  r = await screenForm(env, {}, fd(REAL_SPAM[0]!), { ...opts(REAL_SPAM[0]!, "7.7.7.7"), scope: "Website of Mike's Plumbing", stamp: false, turnstile: false });
  assert.equal(r.block, true);
  assert.equal((await blockedSummary(env, t0)).recent[0]!.scope, "Website of Mike's Plumbing");
  // The log keeps 25.
  for (let i = 0; i < 30; i++) await screenForm(env, {}, fd(REAL_SPAM[0]!), { ...opts(REAL_SPAM[0]!, `6.6.6.${i}`), stamp: false });
  sum = await blockedSummary(env, t0);
  assert.equal(sum.recent.length, 25);
  assert.ok(sum.month > 30);
  // Prune: counters older than the hour go, fresh ones stay.
  await pruneSpamCounters(env, t0 + 30_000 + 3_600_001);
  assert.equal([...store.keys()].filter((k) => k.startsWith("spam_ip:")).length, 0);
  assert.ok(store.has("spam_log"));
});

test("screenForm with Turnstile on: a missing or rejected token asks the person to try again; nothing is logged for it", async () => {
  const { env, store } = fakeEnv({ secret: "sec" });
  const t0 = 1_760_000_000_000;
  const stamp = await formStamp("test-secret", t0);
  const clean = { name: "Mike Jones", phone: "256-555-0123", message: "Saw your flyer." };
  const ok = (async () => new Response(JSON.stringify({ success: true }), { status: 200 })) as typeof fetch;
  const bad = (async () => new Response(JSON.stringify({ success: false, "error-codes": ["invalid-input-response"] }), { status: 200 })) as typeof fetch;
  const base = { scope: "Website contact form", ip: "1.1.1.1", fields: clean, now: t0 + 10_000 };
  let r = await screenForm(env, { turnstileSiteKey: "0x1" }, fd({ ...clean, _t: stamp }), { ...base, fetcher: ok });
  assert.deepEqual([r.block, r.human], [false, "fail"], "no token in the post");
  r = await screenForm(env, { turnstileSiteKey: "0x1" }, fd({ ...clean, _t: stamp, "cf-turnstile-response": "tok" }), { ...base, fetcher: bad });
  assert.deepEqual([r.block, r.human], [false, "fail"]);
  r = await screenForm(env, { turnstileSiteKey: "0x1" }, fd({ ...clean, _t: stamp, "cf-turnstile-response": "tok" }), { ...base, fetcher: ok });
  assert.deepEqual([r.block, r.human], [false, "ok"]);
  assert.equal(store.size, 0, "nothing logged for people");
  // Without the site key in Settings the secret alone enforces nothing.
  r = await screenForm(env, {}, fd({ ...clean, _t: stamp }), { ...base, fetcher: bad });
  assert.deepEqual([r.block, r.human], [false, "skip"]);
});

test("formShieldHtml: the stamp field always, the widget and script only with a site key", () => {
  const plain = formShieldHtml({ stamp: "123.abc" });
  assert.equal(plain, `<input type="hidden" name="_t" value="123.abc">`);
  const full = formShieldHtml({ stamp: "123.abc", siteKey: "0x4AAAAAAA<x>", theme: "dark" });
  assert.match(full, /<div class="cf-turnstile" data-sitekey="0x4AAAAAAA&lt;x&gt;" data-theme="dark" data-size="flexible"><\/div>/);
  assert.match(full, /<script src="https:\/\/challenges\.cloudflare\.com\/turnstile\/v0\/api\.js" async defer><\/script>/);
});
