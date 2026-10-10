/**
 * Google sign-in for the team (Oct 2026): the web app and the Android app send a Google ID token; we check it against
 * Google's signing keys and only accept verified Workspace accounts on the company domain (@undergroundassociates.com by
 * default, Settings → Team). Who gets in: the owner's address (Settings) → owner; a team member whose email is on file →
 * their role; any other address on the domain → a new caller row (the owner can promote or turn them off). Logins are
 * the same signed session as the password login, so everything else in the app is unchanged.
 */
import { getSettings } from "./db.ts";
import { HttpError, type Env } from "./env.ts";
import { notify } from "./notify.ts";
import type { Session } from "./auth.ts";

const JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);
export const DEFAULT_DOMAIN = "undergroundassociates.com";

interface Jwk {
  kid: string;
  kty: string;
  alg?: string;
  n: string;
  e: string;
}

let jwksCache: { keys: Jwk[]; until: number } | null = null;

async function googleKeys(): Promise<Jwk[]> {
  if (jwksCache && jwksCache.until > Date.now()) return jwksCache.keys;
  const res = await fetch(JWKS_URL, { cf: { cacheTtl: 3600 } } as RequestInit);
  if (!res.ok) throw new HttpError(502, "Couldn't reach Google to check the sign-in");
  const data = (await res.json()) as { keys: Jwk[] };
  const cc = res.headers.get("cache-control") ?? "";
  const maxAge = Number(/max-age=(\d+)/.exec(cc)?.[1] ?? 3600);
  jwksCache = { keys: data.keys, until: Date.now() + Math.min(maxAge, 6 * 3600) * 1000 };
  return data.keys;
}

function b64urlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export interface GoogleClaims {
  iss: string;
  aud: string;
  sub: string;
  exp: number;
  iat: number;
  email: string;
  email_verified: boolean;
  hd?: string;
  name?: string;
  given_name?: string;
  picture?: string;
  nonce?: string;
}

/**
 * Verifies a Google ID token (RS256, Google's published keys) for our OAuth client id and returns its claims. Throws a
 * 401 HttpError with a plain reason otherwise. `keys` can be injected for tests.
 */
export async function verifyGoogleIdToken(idToken: string, clientId: string, keys?: Jwk[], nowS = Math.floor(Date.now() / 1000)): Promise<GoogleClaims> {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new HttpError(401, "That Google sign-in token is malformed");
  const [h, p, s] = parts as [string, string, string];
  const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(h))) as { alg?: string; kid?: string };
  if (header.alg !== "RS256" || !header.kid) throw new HttpError(401, "Unexpected Google token format");
  const jwk = (keys ?? (await googleKeys())).find((k) => k.kid === header.kid);
  if (!jwk) throw new HttpError(401, "Google's signing key wasn't recognized; try signing in again");
  const key = await crypto.subtle.importKey("jwk", { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true }, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64urlToBytes(s), new TextEncoder().encode(`${h}.${p}`));
  if (!ok) throw new HttpError(401, "That Google sign-in couldn't be verified");
  const claims = JSON.parse(new TextDecoder().decode(b64urlToBytes(p))) as GoogleClaims;
  if (!ISSUERS.has(claims.iss)) throw new HttpError(401, "That token wasn't issued by Google");
  if (claims.aud !== clientId) throw new HttpError(401, "That Google sign-in is for a different app");
  if (typeof claims.exp !== "number" || claims.exp < nowS - 60) throw new HttpError(401, "That Google sign-in has expired; try again");
  if (!claims.email || claims.email_verified !== true) throw new HttpError(401, "Google hasn't verified that email address");
  return claims;
}

/** Only company Workspace accounts: the hosted-domain claim and the address must both be on the domain. */
export function onCompanyDomain(claims: Pick<GoogleClaims, "email" | "hd">, domain: string): boolean {
  const d = domain.toLowerCase();
  return claims.email.toLowerCase().endsWith(`@${d}`) && (claims.hd ?? "").toLowerCase() === d;
}

interface UserByEmail {
  id: string;
  name: string;
  disabled: number;
  admin: number;
}

/**
 * Turns verified Google claims into a session. The owner's address (Settings → Team) is the owner; a team member with
 * that email on file keeps their role; anyone else on the company domain becomes a new caller (and the owner is told).
 */
export async function googleSession(env: Env, claims: GoogleClaims): Promise<Session> {
  const s = await getSettings(env);
  const domain = (s.googleDomain || DEFAULT_DOMAIN).toLowerCase();
  if (!onCompanyDomain(claims, domain)) throw new HttpError(403, `Sign in with your @${domain} Google account`);
  const email = claims.email.toLowerCase();
  if (s.ownerEmail && s.ownerEmail.toLowerCase() === email) return { role: "owner", userId: "owner", name: "Owner" };
  const u = await env.DB.prepare("SELECT id, name, disabled, admin FROM users WHERE lower(email) = ?").bind(email).first<UserByEmail>();
  if (u) {
    if (u.disabled) throw new HttpError(403, "Your login is turned off. Ask the owner to turn it back on.");
    return { role: u.admin ? "owner" : "caller", userId: u.id, name: u.name };
  }
  // New person on the domain: a caller until the owner says otherwise. No password; Google is their login.
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const name = (claims.given_name || claims.name || email.split("@")[0] || "Teammate").replace(/[\u0000-\u001f"\\<>]/g, "").slice(0, 60);
  const unusable = `google.${crypto.randomUUID()}`;
  await env.DB.prepare("INSERT INTO users (id, name, password, disabled, admin, created_at, email) VALUES (?, ?, ?, 0, 0, ?, ?)").bind(id, name, unusable, Date.now(), email).run();
  await notify(env, { kind: "added", actorName: name, text: `👋 ${name} (${email}) signed in with Google for the first time and is a caller. Settings → Team to give full access or turn them off.` });
  return { role: "caller", userId: id, name };
}
