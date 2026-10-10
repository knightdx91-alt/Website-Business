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

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `${b64url(salt)}.${await pbkdf2(password, salt)}`;
}

async function matches(stored: string, password: string): Promise<boolean> {
  const [salt, hash] = stored.split(".");
  if (!salt || !hash) return false;
  return safeEqual(await pbkdf2(password, fromB64url(salt)), hash);
}

export async function setupOwner(env: Env, password: string): Promise<void> {
  if (await hasOwner(env)) throw new HttpError(409, "A password is already set");
  if (password.length < 8) throw new HttpError(400, "Use at least 8 characters");
  // Login is password-only, so the owner's password can't match a caller's.
  if (await passwordTaken(env, password)) throw new HttpError(409, "Pick a different password; that one is already in use");
  await setSetting(env, "owner_password", await hashPassword(password));
}

export interface Session {
  role: "owner" | "caller";
  /** Team member's user id; "owner" for the owner. Full-access team members also get role "owner". */
  userId: string;
  name: string;
}

interface UserRow {
  id: string;
  name: string;
  password: string;
  disabled: number;
  admin: number;
  created_at: number;
  email: string | null;
}

/** Login is password-only, so every password must be unique across the owner and callers. */
async function passwordTaken(env: Env, password: string, exceptUserId?: string): Promise<boolean> {
  const owner = await getSetting(env, "owner_password");
  if (owner && (await matches(owner, password))) return true;
  const users = await env.DB.prepare("SELECT * FROM users").all<UserRow>();
  for (const u of users.results) if (u.id !== exceptUserId && (await matches(u.password, password))) return true;
  return false;
}

/** Finds who a password belongs to: the owner first, then enabled callers. */
export async function checkPassword(env: Env, password: string): Promise<Session | null> {
  const owner = await getSetting(env, "owner_password");
  if (owner && (await matches(owner, password))) return { role: "owner", userId: "owner", name: "Owner" };
  const users = await env.DB.prepare("SELECT * FROM users WHERE disabled = 0").all<UserRow>();
  for (const u of users.results) if (await matches(u.password, password)) return { role: u.admin ? "owner" : "caller", userId: u.id, name: u.name };
  return null;
}

export async function listCallers(env: Env): Promise<{ id: string; name: string; disabled: boolean; admin: boolean; createdAt: number; email: string | null; googleOnly: boolean }[]> {
  const rows = await env.DB.prepare("SELECT * FROM users ORDER BY created_at").all<UserRow>();
  return rows.results.map((u) => ({ id: u.id, name: u.name, disabled: !!u.disabled, admin: !!u.admin, createdAt: u.created_at, email: u.email ?? null, googleOnly: u.password.startsWith("google.") }));
}

function checkNewPassword(password: string): void {
  if (password.length < 8) throw new HttpError(400, "Use at least 8 characters");
}

/**
 * A team member: a caller (limited) or, with admin, full access like the owner under their own name. With no password
 * they can only sign in with Google (their company address must be given).
 */
export async function addCaller(env: Env, name: string, password: string | null, admin = false, email?: string | null): Promise<string> {
  let stored: string;
  if (password) {
    checkNewPassword(password);
    if (await passwordTaken(env, password)) throw new HttpError(409, "Pick a different password; that one is already in use");
    stored = await hashPassword(password);
  } else {
    if (!email) throw new HttpError(400, "Give them a password, or their company Google address");
    stored = `google.${crypto.randomUUID()}`;
  }
  if (email && (await emailTaken(env, email))) throw new HttpError(409, "Someone on the team already has that email");
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  await env.DB.prepare("INSERT INTO users (id, name, password, disabled, admin, created_at, email) VALUES (?, ?, ?, 0, ?, ?, ?)").bind(id, name, stored, admin ? 1 : 0, Date.now(), email ? email.toLowerCase() : null).run();
  return id;
}

async function emailTaken(env: Env, email: string, exceptUserId?: string): Promise<boolean> {
  const row = await env.DB.prepare("SELECT id FROM users WHERE lower(email) = ?").bind(email.toLowerCase()).first<{ id: string }>();
  return !!row && row.id !== exceptUserId;
}

/** Changing a caller's password or turning them off signs them out everywhere (the session is bound to the stored hash). */
export async function updateCaller(env: Env, id: string, change: { name?: string; password?: string; disabled?: boolean; admin?: boolean; email?: string | null }): Promise<void> {
  const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<UserRow>();
  if (!user) throw new HttpError(404, "Caller not found");
  let password = user.password;
  if (change.password !== undefined) {
    checkNewPassword(change.password);
    if (await passwordTaken(env, change.password, id)) throw new HttpError(409, "Pick a different password; that one is already in use");
    password = await hashPassword(change.password);
  }
  if (change.email && (await emailTaken(env, change.email, id))) throw new HttpError(409, "Someone on the team already has that email");
  const email = change.email === undefined ? user.email : change.email ? change.email.toLowerCase() : null;
  await env.DB.prepare("UPDATE users SET name = ?, password = ?, disabled = ?, admin = ?, email = ? WHERE id = ?")
    .bind(change.name ?? user.name, password, change.disabled === undefined ? user.disabled : change.disabled ? 1 : 0, change.admin === undefined ? user.admin : change.admin ? 1 : 0, email, id)
    .run();
}

export async function removeCaller(env: Env, id: string): Promise<void> {
  await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
}

const LOCK_WINDOW_MS = 15 * 60_000;
/** Failures per address before login locks for the rest of the window, and a looser cap across everyone. */
const LOCK_PER_IP = 10;
const LOCK_GLOBAL = 50;

interface Failures {
  count: number;
  since: number;
}

function failureKeys(ip: string | null | undefined): string[] {
  return [`login_failures:${(ip ?? "").replace(/[^0-9a-f.:]/gi, "").slice(0, 45) || "unknown"}`, "login_failures"];
}

async function failures(env: Env, key: string): Promise<Failures | null> {
  const raw = await getSetting(env, key);
  if (!raw) return null;
  const f = JSON.parse(raw) as Failures;
  return Date.now() - f.since > LOCK_WINDOW_MS ? null : f;
}

/** Brute-force guard: 10 failures from one address (or 50 from everyone) within 15 minutes locks login for the rest of the window. */
export async function loginAllowed(env: Env, ip?: string | null): Promise<boolean> {
  const [perIp, global] = failureKeys(ip);
  const mine = await failures(env, perIp!);
  if (mine && mine.count >= LOCK_PER_IP) return false;
  const all = await failures(env, global!);
  return !all || all.count < LOCK_GLOBAL;
}

export async function recordLoginFailure(env: Env, ip?: string | null): Promise<void> {
  for (const key of failureKeys(ip)) {
    const prev = await failures(env, key);
    await setSetting(env, key, JSON.stringify(prev ? { count: prev.count + 1, since: prev.since } : { count: 1, since: Date.now() }));
  }
}

/** Drops per-address failure counters once their window has passed (daily cron). */
export async function pruneLoginFailures(env: Env): Promise<void> {
  await env.DB.prepare("DELETE FROM settings WHERE key LIKE 'login_failures:%' AND COALESCE(json_extract(value, '$.since'), 0) < ?").bind(Date.now() - LOCK_WINDOW_MS).run();
}

async function sessionKey(env: Env, userId: string): Promise<string | null> {
  if (userId === "owner") return getSetting(env, "owner_password");
  const u = await env.DB.prepare("SELECT password, disabled FROM users WHERE id = ?").bind(userId).first<{ password: string; disabled: number }>();
  return u && !u.disabled ? u.password : null;
}

/** The signed session value: the web app carries it in the wb_session cookie, the Android app as a Bearer token. */
export async function sessionToken(env: Env, s: Session): Promise<string> {
  const exp = Date.now() + SESSION_DAYS * 86_400_000;
  const key = await sessionKey(env, s.userId);
  return `${s.userId}.${exp}.${await hmac(env.APP_SECRET, `session.${s.userId}.${exp}.${key}`)}`;
}

export async function sessionCookie(env: Env, s: Session): Promise<string> {
  return `${COOKIE}=${await sessionToken(env, s)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86_400}`;
}

export const SESSION_COOKIE = COOKIE;

export function clearCookie(): string {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function getSession(env: Env, req: Request): Promise<Session | null> {
  const cookie = req.headers.get("cookie") ?? "";
  const m = new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`).exec(cookie);
  let raw = m?.[1];
  if (!raw) {
    // The Android app: the same value as a Bearer token (three parts; Tap to Pay tokens have four and are handled elsewhere).
    const bearer = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") ?? "")?.[1]?.trim();
    if (bearer && bearer.split(".").length === 3) raw = bearer;
  }
  if (!raw) return null;
  const [userId, exp, sig] = raw.split(".");
  if (!userId || !exp || !sig || !/^[a-z0-9]+$/.test(userId) || Number(exp) < Date.now()) return null;
  const key = await sessionKey(env, userId);
  if (!key || !safeEqual(sig, await hmac(env.APP_SECRET, `session.${userId}.${exp}.${key}`))) return null;
  if (userId === "owner") return { role: "owner", userId, name: "Owner" };
  const u = await env.DB.prepare("SELECT name, admin FROM users WHERE id = ?").bind(userId).first<{ name: string; admin: number }>();
  return u ? { role: u.admin ? "owner" : "caller", userId, name: u.name } : null;
}

/** Private preview link for one business owner. Expires; rotating APP_SECRET revokes every link. */
export async function shareToken(env: Env, leadId: string, days = 14): Promise<string> {
  const exp = Date.now() + days * 86_400_000;
  return `${leadId}.${exp}.${await hmac(env.APP_SECRET, `share.${leadId}.${exp}`)}`;
}

export async function verifyShare(env: Env, leadId: string, exp: string, sig: string): Promise<boolean> {
  if (!/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  return safeEqual(sig, await hmac(env.APP_SECRET, `share.${leadId}.${exp}`));
}

/** Sign-up link for one business and plan. Expires; rotating APP_SECRET revokes every link. */
export async function signupToken(env: Env, leadId: string, planId: string, days = 30): Promise<string> {
  const exp = Date.now() + days * 86_400_000;
  return `${leadId}.${planId}.${exp}.${await hmac(env.APP_SECRET, `signup.${leadId}.${planId}.${exp}`)}`;
}

export async function verifySignup(env: Env, leadId: string, planId: string, exp: string, sig: string): Promise<boolean> {
  if (!/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  return safeEqual(sig, await hmac(env.APP_SECRET, `signup.${leadId}.${planId}.${exp}`));
}

/** "Buy extras" link for an existing client. Expires; rotating APP_SECRET revokes every link. */
export async function extrasToken(env: Env, leadId: string, days = 30): Promise<string> {
  const exp = Date.now() + days * 86_400_000;
  return `${leadId}.${exp}.${await hmac(env.APP_SECRET, `extras.${leadId}.${exp}`)}`;
}

export async function verifyExtras(env: Env, leadId: string, exp: string, sig: string): Promise<boolean> {
  if (!/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  return safeEqual(sig, await hmac(env.APP_SECRET, `extras.${leadId}.${exp}`));
}

/** Short-lived token the web app hands the Android Tap to Pay screen for one sign-up; the nonce makes it single-use. */
export async function tapToken(env: Env, signupId: string, nonce: string, minutes = 10): Promise<string> {
  const exp = Date.now() + minutes * 60_000;
  return `${signupId}.${nonce}.${exp}.${await hmac(env.APP_SECRET, `tap.${signupId}.${nonce}.${exp}`)}`;
}

export async function verifyTap(env: Env, token: string): Promise<{ signupId: string; nonce: string } | null> {
  const m = /^([a-z0-9]+)\.([a-f0-9]+)\.(\d+)\.([A-Za-z0-9_-]+)$/.exec(token);
  if (!m) return null;
  const [, signupId, nonce, exp, sig] = m as unknown as [string, string, string, string, string];
  if (Number(exp) < Date.now()) return null;
  return safeEqual(sig, await hmac(env.APP_SECRET, `tap.${signupId}.${nonce}.${exp}`)) ? { signupId, nonce } : null;
}

/** Permanent link to one signed agreement: "s" = sign-up, "p" = extras purchase. */
export async function agreementToken(env: Env, kind: "s" | "p", id: string): Promise<string> {
  return `${kind}${id}.${await hmac(env.APP_SECRET, `agreement.${kind}.${id}`)}`;
}

export async function verifyAgreement(env: Env, token: string): Promise<{ kind: "s" | "p"; id: string } | null> {
  const m = /^([sp])([a-z0-9]+)\.([A-Za-z0-9_-]+)$/.exec(token);
  if (!m) return null;
  const [, kind, id, sig] = m as unknown as [string, "s" | "p", string, string];
  return safeEqual(sig, await hmac(env.APP_SECRET, `agreement.${kind}.${id}`)) ? { kind, id } : null;
}
