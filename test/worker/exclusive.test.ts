import assert from "node:assert/strict";
import { test } from "node:test";
import { lockDesign, lookOwner, sameDesignFamily, soldDesigns, type SoldDesign } from "../../src/worker/exclusive.ts";
import type { Env } from "../../src/worker/env.ts";

/** A D1 + queue stand-in: every prepare() answers with the rows given, every JOBS.send is recorded. */
function fakeEnv(rows: SoldDesign[]) {
  const sent: unknown[] = [];
  const sql: string[] = [];
  const env = {
    DB: {
      prepare: (q: string) => {
        sql.push(q);
        return { bind: () => ({ all: async () => ({ results: rows }) }) };
      },
    },
    JOBS: { send: async (j: unknown) => void sent.push(j) },
  } as unknown as Env;
  return { env, sent, sql };
}

const client: SoldDesign = { id: "c1", name: "Crossroads Auto Care", look: "auto.motor_oil~classic~h1n0b0s2v7c0f0a0p0t0r0k0d0o0m0q1g0" };

test("lookOwner matches on the look (colors + fonts), whatever the layout or structure", () => {
  const sold = [client];
  assert.equal(lookOwner(sold, "auto.motor_oil")?.name, "Crossroads Auto Care");
  assert.equal(lookOwner(sold, "auto.motor_oil~poster~h4n0b0s2v1c0f0a0p0")?.name, "Crossroads Auto Care");
  assert.equal(lookOwner(sold, "auto.pit_lane~classic"), undefined);
  assert.deepEqual(sameDesignFamily("auto.motor_oil~classic", "auto.pit_lane~classic"), { look: false, layout: true });
  assert.deepEqual(sameDesignFamily("auto.motor_oil~poster", "auto.motor_oil~classic"), { look: true, layout: false });
});

test("soldDesigns reads sold and live clients of the category and leaves the lead itself out", async () => {
  const { env, sql } = fakeEnv([client, { id: "me", name: "Me", look: "auto.pit_lane~classic" }]);
  const sold = await soldDesigns(env, "auto", "me");
  assert.deepEqual(sold.map((s) => s.id), ["c1"]);
  assert.match(sql[0]!, /sales_status IN \('sold', 'live'\)/);
  assert.match(sql[0]!, /status != 'expired'/);
});

test("lockDesign queues a restyle for every open lead that shares the new client's look, and nothing else", async () => {
  const open: SoldDesign[] = [
    { id: "a", name: "A Auto", look: "auto.motor_oil~poster~h4n0b0s2v1c0f0a0p0" }, // same look, other layout → restyled
    { id: "b", name: "B Auto", look: "auto.pit_lane~classic" }, // other look → untouched
    { id: "c", name: "C Auto", look: "auto.motor_oil" }, // bare look id → restyled
  ];
  const { env, sent, sql } = fakeEnv(open);
  const queued = await lockDesign(env, { id: "c1", category: "auto", look: client.look, name: client.name });
  assert.deepEqual(queued, ["a", "c"]);
  assert.deepEqual(sent, [
    { type: "restyle", leadId: "a", because: "c1" },
    { type: "restyle", leadId: "c", because: "c1" },
  ]);
  assert.match(sql[0]!, /sales_status IN \('new', 'shown'\)/, "sold and live leads are never restyled");
  assert.match(sql[0]!, /id != \?/);
  // A lead with no design yet locks nothing.
  const none = fakeEnv(open);
  assert.deepEqual(await lockDesign(none.env, { id: "c2", category: "auto", look: null, name: "X" }), []);
  assert.equal(none.sent.length, 0);
});
