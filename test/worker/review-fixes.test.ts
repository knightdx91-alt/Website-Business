import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { loginAllowed, recordLoginFailure } from "../../src/worker/auth.ts";
import { EditsSchema } from "../../src/worker/edits.ts";
import type { Env } from "../../src/worker/env.ts";
import { EXPIRE_SQL } from "../../src/worker/expire.ts";
import { cadenceFor, nextCadenceStep, tallyLostReasons } from "../../src/worker/sales.ts";
import { recordHit } from "../../src/worker/stats.ts";
import { stripeWebhook } from "../../src/worker/stripe.ts";

/* ---------- A D1 look-alike on node:sqlite with the real migrations applied ---------- */

type Row = Record<string, unknown>;

function fakeD1(opts: { failOnce?: (sql: string) => boolean } = {}) {
  const db = new DatabaseSync(":memory:");
  const dir = new URL("../../migrations/", import.meta.url).pathname;
  for (const f of readdirSync(dir).sort()) if (f.endsWith(".sql")) db.exec(readFileSync(dir + f, "utf8"));
  let failed = false;
  const stmt = (sql: string, args: unknown[]) => {
    const prep = () => {
      if (opts.failOnce && !failed && opts.failOnce(sql)) {
        failed = true;
        throw new Error("simulated D1 outage");
      }
      return db.prepare(sql);
    };
    const binds = args.map((a) => (a === undefined ? null : a)) as Array<string | number | null>;
    return {
      bind: (...a: unknown[]) => stmt(sql, a),
      run: async () => {
        const r = prep().run(...binds);
        return { meta: { changes: Number(r.changes) }, results: [] as Row[], success: true };
      },
      first: async () => (prep().get(...binds) as Row | undefined) ?? null,
      all: async () => ({ results: prep().all(...binds) as Row[], success: true, meta: {} }),
    };
  };
  const d1 = {
    prepare: (sql: string) => stmt(sql, []),
    batch: async (stmts: Array<{ run: () => Promise<unknown> }>) => Promise.all(stmts.map((s) => s.run())),
    exec: (sql: string) => db.exec(sql),
    raw: db,
  };
  return d1;
}

type FakeD1 = ReturnType<typeof fakeD1>;
const envWith = (DB: FakeD1, extra: Partial<Env> = {}) => ({ DB: DB as unknown as D1Database, APP_SECRET: "s", ...extra }) as Env;

function seedLead(db: FakeD1, id: string, fields: Row = {}) {
  const row: Row = { id, place_id: `place_${id}`, category: "restaurant", name: `Biz ${id}`, status: "ready", sales_status: "new", created_at: Date.now(), updated_at: Date.now(), ...fields };
  const keys = Object.keys(row);
  db.raw.prepare(`INSERT INTO leads (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`).run(...(Object.values(row) as Array<string | number | null>));
}

/* ---------- Stripe webhook ---------- */

const whsec = "whsec_review";
const signed = (body: string) => {
  const t = Math.floor(Date.now() / 1000);
  const sig = createHmac("sha256", whsec).update(`${t}.${body}`).digest("hex");
  return new Request("https://app.test/stripe/webhook", { method: "POST", body, headers: { "stripe-signature": `t=${t},v1=${sig}` } });
};
const checkoutEvent = (id: string) =>
  JSON.stringify({ id, type: "checkout.session.completed", data: { object: { id: "cs_1", customer: "cus_1", subscription: "sub_plan", amount_total: 8900, metadata: { kind: "signup", signupId: "s1" } } } });

test("a webhook that fails while handling is not remembered as done: Stripe's retry marks the sign-up paid", async () => {
  const db = fakeD1({ failOnce: (sql) => sql.startsWith("UPDATE signups SET paid = 1") });
  const env = envWith(db, { STRIPE_WEBHOOK_SECRET: whsec });
  seedLead(db, "lead1", { sales_status: "sold", follow_up: "2099-01-01" });
  db.exec("INSERT INTO signups (id, lead_id, plan_json, terms, signer_name, paid, created_at) VALUES ('s1', 'lead1', '{\"name\":\"Plus\"}', 't', 'Pat', 0, 1)");

  const first = await stripeWebhook(env, signed(checkoutEvent("evt_retry")));
  assert.equal(first.status, 500, "the handler error surfaces so Stripe retries");
  assert.equal(db.raw.prepare("SELECT COUNT(*) AS n FROM stripe_events").get()!.n, 0, "the event id is given back");
  assert.equal(db.raw.prepare("SELECT paid FROM signups WHERE id = 's1'").get()!.paid, 0);

  const retry = await stripeWebhook(env, signed(checkoutEvent("evt_retry")));
  assert.equal(retry.status, 200);
  const s = db.raw.prepare("SELECT paid, stripe_customer, stripe_subscription FROM signups WHERE id = 's1'").get()!;
  assert.equal(s.paid, 1);
  assert.equal(s.stripe_subscription, "sub_plan");
  assert.equal(db.raw.prepare("SELECT follow_up FROM leads WHERE id = 'lead1'").get()!.follow_up, null, "paying ends the callback");
  assert.equal(db.raw.prepare("SELECT COUNT(*) AS n FROM lead_notes WHERE lead_id = 'lead1' AND body = 'Paid through Stripe'").get()!.n, 1);

  const again = await stripeWebhook(env, signed(checkoutEvent("evt_retry")));
  assert.equal(again.status, 200);
  assert.equal(db.raw.prepare("SELECT COUNT(*) AS n FROM lead_notes WHERE lead_id = 'lead1'").get()!.n, 1, "a duplicate delivery does nothing");
});

test("cancelling an extras subscription unmarks that purchase, never the website plan", async () => {
  const db = fakeD1();
  const env = envWith(db, { STRIPE_WEBHOOK_SECRET: whsec });
  seedLead(db, "lead1", { sales_status: "live" });
  db.exec("INSERT INTO signups (id, lead_id, plan_json, terms, signer_name, paid, created_at, stripe_customer, stripe_subscription) VALUES ('s1', 'lead1', '{}', 't', 'Pat', 1, 1, 'cus_1', 'sub_plan')");
  db.exec(
    "INSERT INTO purchases (id, lead_id, items_json, due_cents, paid, created_at, stripe_customer, stripe_subscription) VALUES ('p1', 'lead1', '{\"extras\":[{\"name\":\"Social media posts\",\"qty\":1}],\"quotes\":[]}', 12900, 1, 2, 'cus_1', 'sub_extra')",
  );
  const cancel = (sub: string, id: string) => JSON.stringify({ id, type: "customer.subscription.deleted", data: { object: { id: sub, customer: "cus_1" } } });

  assert.equal((await stripeWebhook(env, signed(cancel("sub_extra", "evt_x1")))).status, 200);
  assert.equal(db.raw.prepare("SELECT paid FROM signups WHERE id = 's1'").get()!.paid, 1, "plan still paid");
  assert.equal(db.raw.prepare("SELECT paid FROM purchases WHERE id = 'p1'").get()!.paid, 0, "extras unpaid");
  const text = String(db.raw.prepare("SELECT text FROM events ORDER BY created_at DESC LIMIT 1").get()!.text);
  assert.match(text, /Social media posts/);
  assert.match(text, /plan is unchanged/);

  assert.equal((await stripeWebhook(env, signed(cancel("sub_plan", "evt_x2")))).status, 200);
  assert.equal(db.raw.prepare("SELECT paid FROM signups WHERE id = 's1'").get()!.paid, 0, "the plan's own subscription unmarks the plan");
});

/* ---------- Input validation ---------- */

test("javascript: links are refused on the edit screen; web links and blanks pass", () => {
  const parse = (facebook: string) => EditsSchema.safeParse({ record: { links: { order: "", reserve: "", booking: "", facebook, instagram: "", shop: "" } } });
  assert.ok(!parse("javascript:alert(1)").success);
  assert.ok(!parse("data:text/html,hi").success);
  assert.ok(parse("https://facebook.com/biz").success);
  assert.ok(parse("").success);
});

test("a stats beacon for an inherited property name is ignored, not a crash", async () => {
  const env = { DB: { prepare: () => assert.fail("the database must not be touched") } } as unknown as Env;
  for (const e of ["constructor", "__proto__", "toString", "hasOwnProperty", "bogus"]) {
    const res = await recordHit(env, new Request(`https://app.test/t/lead1?e=${e}`, { method: "POST", headers: { origin: "https://biz.pages.dev" } }), "lead1", e);
    assert.equal(res.status, 204, e);
  }
});

/* ---------- Login lockout per address ---------- */

test("ten wrong passwords lock one address, not everyone", async () => {
  const db = fakeD1();
  const env = envWith(db);
  for (let i = 0; i < 10; i++) await recordLoginFailure(env, "203.0.113.9");
  assert.equal(await loginAllowed(env, "203.0.113.9"), false);
  assert.equal(await loginAllowed(env, "198.51.100.4"), true);
  assert.equal(await loginAllowed(env, null), true);
  for (let i = 0; i < 40; i++) await recordLoginFailure(env, `198.51.100.${i}`);
  assert.equal(await loginAllowed(env, "192.0.2.1"), false, "50 failures from everyone trips the global cap");
});

/* ---------- Sales dashboard helpers ---------- */

test("lost reasons are tallied from 'Reason: <word>' notes", () => {
  const t = tallyLostReasons(["Reason: price · too much right now", "reason: PRICE", "Reason: has_someone", "Reason: nephew does it", "They were busy", "Reason: timing", "Reason: other"]);
  assert.deepEqual(t, { price: 2, has_someone: 1, no_need: 0, timing: 1, other: 1 });
});

test("follow-up cadence: day 2 call, day 5 text, day 10 walk-in, day 21 last text, then mark not interested", () => {
  assert.equal(nextCadenceStep(0)!.next, "call");
  assert.equal(nextCadenceStep(1)!.day, 2);
  assert.equal(nextCadenceStep(2)!.next, "text");
  assert.equal(nextCadenceStep(4)!.day, 5);
  assert.equal(nextCadenceStep(5)!.next, "walk_in");
  assert.equal(nextCadenceStep(9)!.day, 10);
  assert.equal(nextCadenceStep(10)!.next, "last_text");
  assert.equal(nextCadenceStep(20)!.day, 21);
  assert.equal(nextCadenceStep(21), null);
  assert.equal(nextCadenceStep(60), null);
  const day = 86_400_000;
  assert.deepEqual(cadenceFor(1_000 * day, 1_003 * day), { day: 3, next: "Text: any questions?" });
  assert.deepEqual(cadenceFor(1_000 * day, 1_030 * day), { day: 30, next: "Mark Not interested" });
  assert.equal(cadenceFor(null), null);
});

/* ---------- Daily expiry ---------- */

test("the daily expiry takes stale new, shown and not-interested leads, and never sold or live ones", async () => {
  const db = fakeD1();
  const day = 86_400_000;
  const t = Date.now();
  seedLead(db, "new_old", { created_at: t - 40 * day });
  seedLead(db, "new_fresh", { created_at: t - 5 * day });
  seedLead(db, "new_callback", { created_at: t - 40 * day, follow_up: "2099-01-01" });
  seedLead(db, "shown_old", { sales_status: "shown", created_at: t - 70 * day });
  seedLead(db, "shown_recent", { sales_status: "shown", created_at: t - 40 * day });
  seedLead(db, "lost_old", { sales_status: "not_interested", created_at: t - 100 * day, last_contact: t - 40 * day });
  seedLead(db, "lost_recent", { sales_status: "not_interested", created_at: t - 100 * day, last_contact: t - 5 * day });
  seedLead(db, "lost_no_contact", { sales_status: "not_interested", created_at: t - 100 * day, updated_at: t - 31 * day });
  seedLead(db, "sold", { sales_status: "sold", created_at: t - 400 * day, last_contact: t - 300 * day });
  seedLead(db, "live", { sales_status: "live", created_at: t - 400 * day });
  const rows = await db
    .prepare(EXPIRE_SQL)
    .bind(t - 30 * day, t - 60 * day, "2026-10-09", t - 90 * day)
    .all();
  const ids = rows.results.map((r) => r.id).sort();
  assert.deepEqual(ids, ["lost_no_contact", "lost_old", "new_old", "shown_old"]);
});
