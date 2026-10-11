import assert from "node:assert/strict";
import { test } from "node:test";
import { fcmClientConfig, fcmJwt, serviceAccount } from "../../src/worker/fcm.ts";
import type { Env } from "../../src/worker/env.ts";
import type { AppSettings } from "../../src/worker/db.ts";

const dec = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

test("the OAuth assertion is an RS256 JWT Google can verify with the service account's public key", async () => {
  const pair = (await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"])) as CryptoKeyPair;
  const pkcs8 = (await crypto.subtle.exportKey("pkcs8", pair.privateKey)) as ArrayBuffer;
  const b64 = btoa(String.fromCharCode(...new Uint8Array(pkcs8))).replace(/(.{64})/g, "$1\n");
  const sa = { client_email: "push@proj.iam.gserviceaccount.com", private_key: `-----BEGIN PRIVATE KEY-----\n${b64}\n-----END PRIVATE KEY-----\n`, project_id: "proj" };
  const jwt = await fcmJwt(sa, 1_800_000_000);
  const [h, c, s] = jwt.split(".");
  assert.deepEqual(JSON.parse(new TextDecoder().decode(dec(h!))), { alg: "RS256", typ: "JWT" });
  const claims = JSON.parse(new TextDecoder().decode(dec(c!)));
  assert.equal(claims.iss, sa.client_email);
  assert.equal(claims.scope, "https://www.googleapis.com/auth/firebase.messaging");
  assert.equal(claims.exp - claims.iat, 3600);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", pair.publicKey, dec(s!), new TextEncoder().encode(`${h}.${c}`));
  assert.ok(ok, "signature verifies");
});

test("the secret must be complete JSON and the client config needs all four values", () => {
  assert.equal(serviceAccount({ FCM_SERVICE_ACCOUNT: "not json" } as Env), null);
  assert.equal(serviceAccount({ FCM_SERVICE_ACCOUNT: JSON.stringify({ client_email: "a" }) } as Env), null);
  assert.ok(serviceAccount({ FCM_SERVICE_ACCOUNT: JSON.stringify({ client_email: "a", private_key: "k", project_id: "p" }) } as Env));
  assert.equal(fcmClientConfig({ fcmAppId: "1:1:android:a" } as AppSettings), null);
  assert.deepEqual(fcmClientConfig({ fcmAppId: "1:1:android:a", fcmApiKey: "AIzax", fcmProjectId: "p", fcmSenderId: "1" } as AppSettings), { appId: "1:1:android:a", apiKey: "AIzax", projectId: "p", senderId: "1" });
});
