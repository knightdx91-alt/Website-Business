import { test } from "node:test";
import assert from "node:assert/strict";
import { onCompanyDomain, verifyGoogleIdToken } from "../../src/worker/google.ts";

const CLIENT = "123-abc.apps.googleusercontent.com";

function b64url(bytes: Uint8Array | string): string {
  const arr = typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes;
  return Buffer.from(arr).toString("base64url");
}

async function makeKey() {
  const pair = (await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"])) as CryptoKeyPair;
  const jwk = (await crypto.subtle.exportKey("jwk", pair.publicKey)) as { n: string; e: string; kty: string };
  return { priv: pair.privateKey, jwk: { kid: "k1", kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256" } };
}

async function token(priv: CryptoKey, claims: Record<string, unknown>, kid = "k1") {
  const h = b64url(JSON.stringify({ alg: "RS256", kid, typ: "JWT" }));
  const p = b64url(JSON.stringify(claims));
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", priv, new TextEncoder().encode(`${h}.${p}`)));
  return `${h}.${p}.${b64url(sig)}`;
}

const now = Math.floor(Date.now() / 1000);
const good = { iss: "https://accounts.google.com", aud: CLIENT, sub: "1", iat: now - 10, exp: now + 3000, email: "Post@UndergroundAssociates.com", email_verified: true, hd: "undergroundassociates.com", given_name: "Post" };

test("a Google ID token signed by a known key for our client is accepted", async () => {
  const { priv, jwk } = await makeKey();
  const claims = await verifyGoogleIdToken(await token(priv, good), CLIENT, [jwk]);
  assert.equal(claims.email, good.email);
  assert.equal(claims.hd, "undergroundassociates.com");
});

test("wrong audience, issuer, expiry, signature, unverified email and unknown key are all refused", async () => {
  const { priv, jwk } = await makeKey();
  const other = await makeKey();
  const refuse = async (t: string, re: RegExp) => assert.rejects(verifyGoogleIdToken(t, CLIENT, [jwk]), re);
  await refuse(await token(priv, { ...good, aud: "someone-else" }), /different app/);
  await refuse(await token(priv, { ...good, iss: "https://evil.example" }), /issued by Google/);
  await refuse(await token(priv, { ...good, exp: now - 600 }), /expired/);
  await refuse(await token(priv, { ...good, email_verified: false }), /verified/);
  await refuse(await token(other.priv, good), /couldn't be verified/);
  await refuse(await token(priv, good, "k2"), /signing key/);
  await refuse("not.a.jwt.at.all", /malformed|format/);
});

test("only company Workspace accounts count: the address and the hosted domain must both match", () => {
  assert.equal(onCompanyDomain({ email: "post@undergroundassociates.com", hd: "undergroundassociates.com" }, "undergroundassociates.com"), true);
  assert.equal(onCompanyDomain({ email: "post@undergroundassociates.com", hd: "undergroundassociates.com" }, "UndergroundAssociates.com"), true);
  assert.equal(onCompanyDomain({ email: "someone@gmail.com" }, "undergroundassociates.com"), false);
  assert.equal(onCompanyDomain({ email: "x@undergroundassociates.com" }, "undergroundassociates.com"), false);
  assert.equal(onCompanyDomain({ email: "x@notundergroundassociates.com", hd: "notundergroundassociates.com" }, "undergroundassociates.com"), false);
});
