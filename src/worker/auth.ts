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

async function hashPassword(password: string): Promise<string> {
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
  /** Caller's user id; "owner" for the owner. */
  userId: string;
  name: string;
}

interface UserRow {
  id: string;
  name: string;
  password: string;
  disabled: number;
  created_at: number;
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
  for (const u of users.results) if (await matches(u.password, password)) return { role: "caller", userId: u.id, name: u.name };
  return null;
}

export async function listCallers(env: Env): Promise<{ id: string; name: string; disabled: boolean; createdAt: number }[]> {
  const rows = await env.DB.prepare("SELECT * FROM users ORDER BY created_at").all<UserRow>();
  return rows.results.map((u) => ({ id: u.id, name: u.name, disabled: !!u.disabled, createdAt: u.created_at }));
}

function checkNewPassword(password: string): void {
  if (password.length < 8) throw new HttpError(400, "Use at least 8 characters");
}

export async function addCaller(env: Env, name: string, password: string): Promise<string> {
  checkNewPassword(password);
  if (await passwordTaken(env, password)) throw new HttpError(409, "Pick a different password; that one is already in use");
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  await env.DB.prepare("INSERT INTO users (id, name, password, disabled, created_at) VALUES (?, ?, ?, 0, ?)").bind(id, name, await hashPassword(password), Date.now()).run();
  return id;
}

/** Changing a caller's password or turning them off signs them out everywhere (the session is bound to the stored hash). */
export async function updateCaller(env: Env, id: string, change: { name?: string; password?: string; disabled?: boolean }): Promise<void> {
  const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<UserRow>();
  if (!user) throw new HttpError(404, "Caller not found");
  let password = user.password;
  if (change.password !== undefined) {
    checkNewPassword(change.password);
    if (await passwordTaken(env, change.password, id)) throw new HttpError(409, "Pick a different password; that one is already in use");
    password = await hashPassword(change.password);
  }
  await env.DB.prepare("UPDATE users SET name = ?, password = ?, disabled = ? WHERE id = ?")
    .bind(change.name ?? user.name, password, change.disabled === undefined ? user.disabled : change.disabled ? 1 : 0, id)
    .run();
}

export async function removeCaller(env: Env, id: string): Promise<void> {
  await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
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

async function sessionKey(env: Env, userId: string): Promise<string | null> {
  if (userId === "owner") return getSetting(env, "owner_password");
  const u = await env.DB.prepare("SELECT password, disabled FROM users WHERE id = ?").bind(userId).first<{ password: string; disabled: number }>();
  return u && !u.disabled ? u.password : null;
}

export async function sessionCookie(env: Env, s: Session): Promise<string> {
  const exp = Date.now() + SESSION_DAYS * 86_400_000;
  const key = await sessionKey(env, s.userId);
  const value = `${s.userId}.${exp}.${await hmac(env.APP_SECRET, `session.${s.userId}.${exp}.${key}`)}`;
  return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86_400}`;
}

export function clearCookie(): string {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function getSession(env: Env, req: Request): Promise<Session | null> {
  const cookie = req.headers.get("cookie") ?? "";
  const m = new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`).exec(cookie);
  if (!m) return null;
  const [userId, exp, sig] = m[1]!.split(".");
  if (!userId || !exp || !sig || !/^[a-z0-9]+$/.test(userId) || Number(exp) < Date.now()) return null;
  const key = await sessionKey(env, userId);
  if (!key || !safeEqual(sig, await hmac(env.APP_SECRET, `session.${userId}.${exp}.${key}`))) return null;
  if (userId === "owner") return { role: "owner", userId, name: "Owner" };
  const u = await env.DB.prepare("SELECT name FROM users WHERE id = ?").bind(userId).first<{ name: string }>();
  return u ? { role: "caller", userId, name: u.name } : null;
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
