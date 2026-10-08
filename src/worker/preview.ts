import { fetchPhoto, type Place } from "../places/client.ts";
import { addUsage, getLead, updateLead } from "./db.ts";
import type { Env } from "./env.ts";
import { chooseLook, contentType, renderPreview } from "./pipeline.ts";
import type { BusinessRecord, Copy } from "../generator/types.ts";

const NOINDEX = { "x-robots-tag": "noindex, nofollow", "referrer-policy": "same-origin" };

/** Google photo names expire; refresh them from Place Details when a fetch fails. */
async function googleHero(env: Env, leadId: string, place: Place): Promise<Response> {
  const name = place.photos?.[0]?.name;
  const tryFetch = async (photoName: string) => {
    const { bytes, contentType: type } = await fetchPhoto(env.GOOGLE_PLACES_API_KEY, photoName);
    await addUsage(env, { photos: 1 });
    return new Response(bytes, { headers: { "content-type": type, "cache-control": "private, max-age=3600", ...NOINDEX } });
  };
  if (name) {
    try {
      return await tryFetch(name);
    } catch {
      /* fall through to refresh */
    }
  }
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(place.id)}`, {
    headers: { "X-Goog-Api-Key": env.GOOGLE_PLACES_API_KEY, "X-Goog-FieldMask": "photos" },
  });
  await addUsage(env, { places: 1 });
  if (!res.ok) return new Response("Photo unavailable", { status: 404 });
  const fresh = (await res.json()) as Pick<Place, "photos">;
  if (!fresh.photos?.length) return new Response("Photo unavailable", { status: 404 });
  await updateLead(env, leadId, { place_json: JSON.stringify({ ...place, photos: fresh.photos }) });
  return tryFetch(fresh.photos[0]!.name);
}

export async function servePreview(env: Env, req: Request, leadId: string, rest: string): Promise<Response> {
  let path = rest.replace(/^\/+/, "");
  if (req.method === "POST" && path === "__preview/form") {
    return new Response(
      `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Preview</title><body style="font:18px system-ui;padding:24px;max-width:36rem;margin:auto"><h1>Preview only</h1><p>On the live site, this form sends the request straight to the business owner's inbox in the app.</p><p><a href="/p/${leadId}/">Back to the site</a></p>`,
      { headers: { "content-type": "text/html; charset=utf-8", ...NOINDEX } },
    );
  }
  if (path === "" || path.endsWith("/")) path += "index.html";
  if (path.includes("..")) return new Response("Not found", { status: 404 });

  if (path.startsWith("assets/fonts/")) {
    const asset = await env.ASSETS.fetch(new Request(new URL(`/fonts/${path.slice("assets/fonts/".length)}`, req.url)));
    return new Response(asset.body, { status: asset.status, headers: { "content-type": "font/woff2", "cache-control": "public, max-age=604800" } });
  }

  if (path === "assets/img/hero.jpg") {
    const lead = await getLead(env, leadId);
    if (!lead?.place_json) return new Response("Not found", { status: 404 });
    return googleHero(env, leadId, JSON.parse(lead.place_json) as Place);
  }

  if (path.startsWith("assets/owner/")) {
    const obj = await env.BUCKET.get(`owner/${leadId}/${path.slice("assets/owner/".length)}`);
    if (!obj) return new Response("Not found", { status: 404 });
    return new Response(obj.body, { headers: { "content-type": obj.httpMetadata?.contentType ?? "image/jpeg", "cache-control": "private, max-age=3600", ...NOINDEX } });
  }

  if (path === "index.html") await restyleOldPreview(env, leadId);

  let obj = await env.BUCKET.get(`previews/${leadId}/${path}`);
  if (!obj && !path.endsWith(".html") && !/\.[a-z0-9]+$/i.test(path)) obj = await env.BUCKET.get(`previews/${leadId}/${path}/index.html`);
  if (!obj) {
    const nf = await env.BUCKET.get(`previews/${leadId}/404.html`);
    return new Response(nf?.body ?? "Not found", { status: 404, headers: { "content-type": "text/html; charset=utf-8", ...NOINDEX } });
  }
  return new Response(obj.body, {
    headers: { "content-type": obj.httpMetadata?.contentType ?? contentType(path), "cache-control": path.endsWith(".html") ? "no-store" : "private, max-age=300", ...NOINDEX },
  });
}

/**
 * Previews built before layouts existed all looked alike. A lead nobody has shown yet gets a fresh
 * look + layout the first time its preview opens (no AI cost: same copy, re-rendered).
 */
async function restyleOldPreview(env: Env, leadId: string): Promise<void> {
  const lead = await getLead(env, leadId);
  if (!lead || lead.status !== "ready" || lead.sales_status !== "new" || (lead.look ?? "").includes("~") || !lead.record_json || !lead.copy_json) return;
  try {
    const record = JSON.parse(lead.record_json) as BusinessRecord;
    const look = await chooseLook(env, record, lead.id);
    await renderPreview(env, lead, record, JSON.parse(lead.copy_json) as Copy, look);
  } catch {
    /* keep serving the old preview */
  }
}
