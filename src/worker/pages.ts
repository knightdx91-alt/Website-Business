/**
 * Cloudflare Pages Direct Upload over the REST API (the same flow `wrangler pages deploy` uses),
 * so the Worker can publish client sites without the CLI.
 */
import { blake3 } from "@noble/hashes/blake3.js";
import { bytesToHex } from "@noble/hashes/utils.js";

const API = "https://api.cloudflare.com/client/v4";
const NOT_UPLOADED = new Set(["_headers", "_redirects", "_routes.json", "_worker.js"]);

const TYPES: Record<string, string> = {
  html: "text/html",
  css: "text/css",
  js: "application/javascript",
  json: "application/json",
  xml: "application/xml",
  txt: "text/plain",
  woff2: "font/woff2",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  svg: "image/svg+xml",
  ico: "image/x-icon",
};

export interface PagesAuth {
  accountId: string;
  token: string;
}

interface CfResponse<T> {
  success: boolean;
  result: T;
  errors?: Array<{ code: number; message: string }>;
}

async function cf<T>(path: string, init: RequestInit & { bearer: string }): Promise<{ status: number; body: CfResponse<T> }> {
  const { bearer, ...rest } = init;
  const res = await fetch(`${API}${path}`, { ...rest, headers: { ...(rest.headers ?? {}), Authorization: `Bearer ${bearer}` } });
  const body = (await res.json()) as CfResponse<T>;
  return { status: res.status, body };
}

function fail(what: string, body: CfResponse<unknown>): never {
  throw new Error(`${what} failed: ${(body.errors ?? []).map((e) => `${e.code} ${e.message}`).join("; ") || "unknown error"}`);
}

/** Pages project names: lowercase letters, digits and dashes, at most 58 chars. */
export function projectName(slug: string): string {
  return (
    slug
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 58)
      .replace(/-+$/, "") || "site"
  );
}

/** Creates the project if needed. Returns its *.pages.dev subdomain (Cloudflare may add a suffix). */
export async function ensureProject(auth: PagesAuth, name: string): Promise<{ name: string; subdomain: string }> {
  const got = await cf<{ name: string; subdomain: string }>(`/accounts/${auth.accountId}/pages/projects/${name}`, { bearer: auth.token });
  if (got.status === 200 && got.body.success) return got.body.result;
  const made = await cf<{ name: string; subdomain: string }>(`/accounts/${auth.accountId}/pages/projects`, {
    bearer: auth.token,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, production_branch: "main" }),
  });
  if (!made.body.success) fail("Creating Pages project", made.body);
  return made.body.result;
}

function toBytes(content: string | Uint8Array): Uint8Array {
  return typeof content === "string" ? new TextEncoder().encode(content) : content;
}

function base64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function ext(path: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(path);
  return m ? m[1]!.toLowerCase() : "";
}

/** Matches wrangler: blake3(base64(contents) + extension), first 32 hex chars. */
export function assetHash(path: string, b64: string): string {
  return bytesToHex(blake3(new TextEncoder().encode(b64 + ext(path)))).slice(0, 32);
}

export async function deploy(
  auth: PagesAuth,
  project: string,
  files: Map<string, string | Uint8Array>,
): Promise<{ id: string; url: string }> {
  const tok = await cf<{ jwt: string }>(`/accounts/${auth.accountId}/pages/projects/${project}/upload-token`, { bearer: auth.token });
  if (!tok.body.success) fail("Getting upload token", tok.body);
  const jwt = tok.body.result.jwt;

  const assets: Array<{ path: string; hash: string; b64: string; contentType: string }> = [];
  let headersFile: string | undefined;
  for (const [path, content] of files) {
    if (path === "_headers") headersFile = typeof content === "string" ? content : new TextDecoder().decode(content);
    if (NOT_UPLOADED.has(path)) continue;
    const b64 = base64(toBytes(content));
    assets.push({ path, hash: assetHash(path, b64), b64, contentType: TYPES[ext(path)] ?? "application/octet-stream" });
  }

  const hashes = [...new Set(assets.map((a) => a.hash))];
  const missing = await cf<string[]>(`/pages/assets/check-missing`, {
    bearer: jwt,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hashes }),
  });
  if (!missing.body.success) fail("Checking assets", missing.body);
  const need = new Set(missing.body.result);

  const toUpload = assets.filter((a) => need.has(a.hash));
  const seen = new Set<string>();
  let batch: typeof toUpload = [];
  let size = 0;
  const flush = async () => {
    if (!batch.length) return;
    const up = await cf<unknown>(`/pages/assets/upload`, {
      bearer: jwt,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batch.map((a) => ({ key: a.hash, value: a.b64, metadata: { contentType: a.contentType }, base64: true }))),
    });
    if (!up.body.success) fail("Uploading assets", up.body);
    batch = [];
    size = 0;
  };
  for (const a of toUpload) {
    if (seen.has(a.hash)) continue;
    seen.add(a.hash);
    if (size + a.b64.length > 20_000_000) await flush();
    batch.push(a);
    size += a.b64.length;
  }
  await flush();

  await cf<unknown>(`/pages/assets/upsert-hashes`, {
    bearer: jwt,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hashes }),
  });

  const form = new FormData();
  form.append("manifest", JSON.stringify(Object.fromEntries(assets.map((a) => [`/${a.path}`, a.hash]))));
  form.append("branch", "main");
  if (headersFile) form.append("_headers", new File([headersFile], "_headers"));
  const dep = await cf<{ id: string; url: string }>(`/accounts/${auth.accountId}/pages/projects/${project}/deployments`, {
    bearer: auth.token,
    method: "POST",
    body: form,
  });
  if (!dep.body.success) fail("Creating deployment", dep.body);
  return { id: dep.body.result.id, url: dep.body.result.url };
}

export async function deleteProject(auth: PagesAuth, name: string): Promise<void> {
  await cf<unknown>(`/accounts/${auth.accountId}/pages/projects/${name}`, { bearer: auth.token, method: "DELETE" });
}

export interface PagesDomain {
  name: string;
  status: string;
  verification_data?: { status?: string; error_message?: string };
  validation_data?: { status?: string; method?: string; error_message?: string; txt_name?: string; txt_value?: string };
}

/** Attaches a client's own domain to their Pages project. Cloudflare then checks DNS and issues HTTPS. */
export async function addDomain(auth: PagesAuth, project: string, domain: string): Promise<PagesDomain> {
  const { body } = await cf<PagesDomain>(`/accounts/${auth.accountId}/pages/projects/${project}/domains`, {
    method: "POST",
    bearer: auth.token,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: domain }),
  });
  // 8000018: already added to this project, which is fine.
  if (!body.success && !(body.errors ?? []).some((e) => e.code === 8000018)) fail("Adding the domain", body);
  return body.result ?? (await getDomain(auth, project, domain))!;
}

export async function getDomain(auth: PagesAuth, project: string, domain: string): Promise<PagesDomain | null> {
  const { status, body } = await cf<PagesDomain>(`/accounts/${auth.accountId}/pages/projects/${project}/domains/${domain}`, { bearer: auth.token });
  if (status === 404) return null;
  if (!body.success) fail("Checking the domain", body);
  return body.result;
}

export async function removeDomain(auth: PagesAuth, project: string, domain: string): Promise<void> {
  const { status, body } = await cf<unknown>(`/accounts/${auth.accountId}/pages/projects/${project}/domains/${domain}`, { method: "DELETE", bearer: auth.token });
  if (status !== 404 && !body.success) fail("Removing the domain", body);
}
