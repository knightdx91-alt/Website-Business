import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeSettings } from "../../src/worker/db.ts";

test("settings saves merge: left out keeps, null clears, values replace, nested nulls are dropped", () => {
  const base = { companyName: "UA", stripePublishableKey: "pk_live_abc", lateFee: 15, plans: [{ id: "basic", monthly: 49 }], requireGoogle: true };
  // An app that doesn't know stripePublishableKey (Android before 2.59) can't wipe it.
  const out = mergeSettings(base, { companyName: "Underground Associates", turnstileSiteKey: "0x4A", requireGoogle: false });
  assert.deepEqual(out, { companyName: "Underground Associates", stripePublishableKey: "pk_live_abc", lateFee: 15, plans: [{ id: "basic", monthly: 49 }], requireGoogle: false, turnstileSiteKey: "0x4A" });
  // Blank fields are sent as null and clear the key; undefined is the same as left out.
  assert.deepEqual(mergeSettings(base, { stripePublishableKey: null, lateFee: undefined }), { companyName: "UA", lateFee: 15, plans: [{ id: "basic", monthly: 49 }], requireGoogle: true });
  // Arrays replace whole, and nulls inside them never land in the record.
  const plans = mergeSettings(base, { plans: [{ id: "plus", monthly: 89, payLink: null }], addons: [{ name: "Logo", about: null, founderPick: undefined }] });
  assert.deepEqual(plans.plans, [{ id: "plus", monthly: 89 }]);
  assert.deepEqual((plans as { addons?: unknown }).addons, [{ name: "Logo" }]);
  // The base is never changed in place.
  assert.equal(base.stripePublishableKey, "pk_live_abc");
});
