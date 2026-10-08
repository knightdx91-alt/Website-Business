import { zipSync } from "fflate";
import { slugify } from "../generator/html.ts";
import { buildSite } from "../generator/render.ts";
import type { BusinessRecord, Copy } from "../generator/types.ts";
import { updateLead, type LeadRow } from "./db.ts";
import { HttpError, now, type Env } from "./env.ts";
import { deploy, ensureProject, projectName, type PagesAuth } from "./pages.ts";

async function loadFontFrom(env: Env, origin: string) {
  return async (_pkg: string, file: string): Promise<Uint8Array> => {
    const res = await env.ASSETS.fetch(new Request(new URL(`/fonts/${file}`, origin)));
    if (!res.ok) throw new Error(`Missing font ${file}`);
    return new Uint8Array(await res.arrayBuffer());
  };
}

async function ownerFiles(env: Env, leadId: string): Promise<Map<string, Uint8Array>> {
  const out = new Map<string, Uint8Array>();
  const list = await env.BUCKET.list({ prefix: `owner/${leadId}/` });
  for (const obj of list.objects) {
    const body = await env.BUCKET.get(obj.key);
    if (body) out.set(`assets/owner/${obj.key.slice(`owner/${leadId}/`.length)}`, new Uint8Array(await body.arrayBuffer()));
  }
  return out;
}

function parse(lead: LeadRow): { record: BusinessRecord; copy: Copy } {
  if (!lead.record_json || !lead.copy_json) throw new HttpError(409, "This site hasn't finished building yet");
  return { record: JSON.parse(lead.record_json), copy: JSON.parse(lead.copy_json) };
}

/** Builds the publishable site. Throws 409 with the list of blockers if the publish gate fails. */
async function buildForPublish(env: Env, lead: LeadRow, appOrigin: string, siteOrigin: string) {
  const { record, copy } = parse(lead);
  try {
    const out = await buildSite({
      record,
      copy,
      site: { slug: lead.pages_project ?? lead.id, look: lead.look ?? "", origin: siteOrigin },
      mode: "publish",
      formEndpoint: `${appOrigin}/f/${lead.id}`,
      loadFont: await loadFontFrom(env, appOrigin),
    });
    for (const [k, v] of await ownerFiles(env, lead.id)) out.files.set(k, v);
    return out;
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.startsWith("Publish blocked")) {
      throw new HttpError(409, "Not ready to publish yet", { blockers: msg.split("\n- ").slice(1) });
    }
    throw err;
  }
}

async function pickProjectName(env: Env, auth: PagesAuth, lead: LeadRow, base: string): Promise<string> {
  if (lead.pages_project) return lead.pages_project;
  for (let i = 0; i < 20; i++) {
    const name = projectName(i === 0 ? base : `${base}-${i + 1}`);
    const ours = await env.DB.prepare("SELECT id FROM leads WHERE pages_project = ?").bind(name).first<{ id: string }>();
    if (ours) continue;
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${auth.accountId}/pages/projects/${name}`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    if (res.status === 404) return name;
  }
  throw new HttpError(500, "Couldn't find a free project name");
}

export async function publishLead(env: Env, lead: LeadRow, appOrigin: string): Promise<{ url: string }> {
  // Dry run first so a blocked site never creates a Pages project.
  await buildForPublish(env, lead, appOrigin, "https://example.pages.dev");
  const auth = { accountId: env.CF_ACCOUNT_ID, token: env.CF_API_TOKEN };
  const { record } = parse(lead);
  const name = await pickProjectName(env, auth, lead, slugify(record.name));
  const project = await ensureProject(auth, name);
  const origin = `https://${project.subdomain}`;
  const built = await buildForPublish(env, { ...lead, pages_project: project.name }, appOrigin, origin);
  await deploy(auth, project.name, built.files);
  await updateLead(env, lead.id, { pages_project: project.name, live_url: origin, published_at: now(), sales_status: "live" });
  return { url: origin };
}

export async function zipLead(env: Env, lead: LeadRow, appOrigin: string): Promise<Uint8Array> {
  const built = await buildForPublish(env, lead, appOrigin, lead.live_url ?? "https://example.pages.dev");
  const entries: Record<string, Uint8Array> = {};
  for (const [path, content] of built.files) entries[path] = typeof content === "string" ? new TextEncoder().encode(content) : content;
  return zipSync(entries, { level: 6 });
}
