import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { verifyStripe } from "../../src/worker/stripe.ts";

const secret = "whsec_test123";
const body = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });
const sign = (t: number, b = body, s = secret) => createHmac("sha256", s).update(`${t}.${b}`).digest("hex");

test("Stripe signatures are checked against the raw body, secret and time", async () => {
  const t = 1_800_000_000;
  assert.ok(await verifyStripe(secret, `t=${t},v1=${sign(t)}`, body, t));
  assert.ok(await verifyStripe(secret, `t=${t},v1=deadbeef,v1=${sign(t)}`, body, t + 60), "any v1 may match");
  assert.ok(!(await verifyStripe(secret, `t=${t},v1=${sign(t)}`, body + " ", t)), "body changed");
  assert.ok(!(await verifyStripe(secret, `t=${t},v1=${sign(t, body, "whsec_other")}`, body, t)), "wrong secret");
  assert.ok(!(await verifyStripe(secret, `t=${t},v1=${sign(t)}`, body, t + 301)), "too old");
  assert.ok(!(await verifyStripe(secret, null, body, t)));
});
