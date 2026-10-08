import { HttpError, type Env } from "./env.ts";
import { getSetting, setSetting } from "./db.ts";

const COOKIE = "wb_session";
const SESSION_DAYS = 60;
const ITERATIONS = 100_000;
const enc = new TextEncoder();

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function pbkdf2(password: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS }, key, 256);
  return b64url(bits);
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function hasOwner(env: Env): Promise<boolean> {
  return (await getSetting(env, "owner_password")) !== null;
}

export async function setupOwner(env: Env, password: string): Promise<void> {
  if (await hasOwner(env)) throw new HttpError(409, "A password is already set");
  if (password.length < 8) throw new HttpError(400, "Use at least 8 characters");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  await setSetting(env, "owner_password", `${b64url(salt)}.${await pbkdf2(password, salt)}`);
}

export async function checkPassword(env: Env, password: string): Promise<boolean> {
  const stored = await getSetting(env, "owner_password");
  if (!stored) return false;
  const [salt, hash] = stored.split(".");
  return safeEqual(await pbkdf2(password, fromB64url(salt!)), hash!);
}

/** Simple brute-force guard: 10 failures within 15 minutes locks login for the rest of the window. */
export async function loginAllowed(env: Env): Promise<boolean> {
  const raw = await getSetting(env, "login_failures");
  if (!raw) return true;
  const { count, since } = JSON.parse(raw) as { count: number; since: number };
  return Date.now() - since > 15 * 60_000 || count < 10;
}

export async function recordLoginFailure(env: Env): Promise<void> {
  const raw = await getSetting(env, "login_failures");
  const prev = raw ? (JSON.parse(raw) as { count: number; since: number }) : null;
  const fresh = !prev || Date.now() - prev.since > 15 * 60_000;
  await setSetting(env, "login_failures", JSON.stringify(fresh ? { count: 1, since: Date.now() } : { count: prev.count + 1, since: prev.since }));
}

export async function sessionCookie(env: Env): Promise<string> {
  const exp = Date.now() + SESSION_DAYS * 86_400_000;
  const value = `${exp}.${await hmac(env.APP_SECRET, `owner.${exp}`)}`;
  return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86_400}`;
}

export function clearCookie(): string {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function isLoggedIn(env: Env, req: Request): Promise<boolean> {
  const cookie = req.headers.get("cookie") ?? "";
  const m = new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`).exec(cookie);
  if (!m) return false;
  const [exp, sig] = m[1]!.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, await hmac(env.APP_SECRET, `owner.${exp}`));
}
