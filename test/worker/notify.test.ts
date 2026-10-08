import assert from "node:assert/strict";
import { test } from "node:test";
import { allowedEndpoint, vapidAuth, vapidPublicKey } from "../../src/worker/notify.ts";
import type { Env } from "../../src/worker/env.ts";

test("push requests carry a valid VAPID signature for the push service", async () => {
  const pair = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])) as CryptoKeyPair;
  const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  const env = { VAPID_PRIVATE_JWK: JSON.stringify(jwk) } as Env;
  const pub = vapidPublicKey(env)!;
  const header = await vapidAuth(env, "https://fcm.googleapis.com/fcm/send/abc123");
  const m = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(header)!;
  assert.ok(m, header);
  assert.equal(m[4], pub);
  const dec = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
  const claims = JSON.parse(new TextDecoder().decode(dec(m[2]!)));
  assert.equal(claims.aud, "https://fcm.googleapis.com");
  assert.ok(claims.exp > Date.now() / 1000);
  const key = await crypto.subtle.importKey("raw", dec(pub), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, dec(m[3]!), new TextEncoder().encode(`${m[1]}.${m[2]}`));
  assert.ok(ok, "signature verifies with the public key phones subscribe with");
});

test("only real push services are accepted as subscription endpoints", () => {
  assert.ok(allowedEndpoint("https://fcm.googleapis.com/fcm/send/x"));
  assert.ok(!allowedEndpoint("https://evil.example.com/push"));
  assert.ok(!allowedEndpoint("http://fcm.googleapis.com/fcm/send/x"));
});
