import { addDomain, getDomain, type PagesAuth } from "./pages.ts";

/**
 * Client domains, streamlined (owner's rule, Oct 2026: every domain is bought on our Cloudflare account, in the client's name).
 * The app suggests names and checks which are free (public RDAP lookup), the owner buys one in Cloudflare with one tap
 * (Cloudflare has no API for buying), and from then on the app does the rest: it spots the domain in our account, connects
 * both the bare name and www to the site's Pages project, makes sure the DNS records exist (Cloudflare usually adds them
 * itself for a zone on the same account; the app adds them when the API token has Zone → DNS → Edit), and switches the site
 * over once Cloudflare says the domain works (domain_active, see checkDomains in index.ts).
 */

const API = "https://api.cloudflare.com/client/v4";

/** "https://www.Reyes-Pizza.com/menu" → "reyespizza.com"-style bare name: lowercased, no scheme, no path, no leading www. */
export function bareDomain(d: string): string {
  return d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/[/?#].*$/, "").replace(/^www\./, "").replace(/\.$/, "");
}

export const DOMAIN_RE = /^(?!-)([a-z0-9-]{1,63}\.)+[a-z]{2,63}$/;

/** Name ideas for a business: the name, name + town, name + "al", in .com first, then .net / .co. */
export function suggestDomains(name: string, town?: string): string[] {
  const words = name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/\b(llc|inc|co|company|the)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return [];
  const base = words.join("").slice(0, 40);
  const dashed = words.join("-").slice(0, 40);
  const t = (town ?? "").toLowerCase().replace(/[^a-z]/g, "");
  const out = [`${base}.com`, ...(t ? [`${base}${t}.com`] : []), `${base}al.com`, ...(dashed !== base ? [`${dashed}.com`] : []), `${base}.net`, `${base}.co`];
  return [...new Set(out)].filter((d) => DOMAIN_RE.test(d)).slice(0, 6);
}

/** Free to buy? Public RDAP: 404 = nobody holds it (true), 200 = registered (false), anything else = couldn't tell (null). */
export async function domainAvailable(domain: string, fetchFn: typeof fetch = fetch): Promise<boolean | null> {
  try {
    const res = await fetchFn(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
      headers: { accept: "application/rdap+json" },
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
    });
    if (res.status === 404) return true;
    if (res.ok) return false;
    return null;
  } catch {
    return null;
  }
}

/** Where to buy it: Cloudflare's own registration page in our account (the name is copied for pasting). */
export function buyUrl(accountId: string): string {
  return `https://dash.cloudflare.com/${accountId}/domains/register`;
}

async function cfGet<T>(auth: PagesAuth, path: string): Promise<{ ok: boolean; result: T | null; code?: number }> {
  const res = await fetch(`${API}${path}`, { headers: { authorization: `Bearer ${auth.token}` } });
  const body = (await res.json().catch(() => ({}))) as { success?: boolean; result?: T; errors?: Array<{ code: number }> };
  return { ok: !!body.success, result: body.result ?? null, code: body.errors?.[0]?.code };
}

/** The domain's zone in our Cloudflare account (bought there = Cloudflare made the zone), or null. */
export async function ourZone(auth: PagesAuth, domain: string): Promise<{ id: string; status: string } | null> {
  const r = await cfGet<Array<{ id: string; status: string; name: string }>>(auth, `/zones?name=${encodeURIComponent(bareDomain(domain))}&account.id=${auth.accountId}`);
  const z = r.result?.[0];
  return z ? { id: z.id, status: z.status } : null;
}

/** Makes sure the bare name and www point at the Pages site (proxied CNAMEs). "no-permission" when the token can't edit DNS. */
export async function ensureRecords(auth: PagesAuth, zoneId: string, domain: string, target: string): Promise<"ok" | "no-permission" | "error"> {
  const apex = bareDomain(domain);
  let result: "ok" | "no-permission" | "error" = "ok";
  for (const name of [apex, `www.${apex}`]) {
    const have = await cfGet<Array<{ type: string; content: string }>>(auth, `/zones/${zoneId}/dns_records?name=${encodeURIComponent(name)}`);
    if (!have.ok) return have.code === 10000 ? "no-permission" : "error";
    // Leave anything already there alone (Cloudflare's own Pages record, or the owner's).
    if ((have.result ?? []).some((r) => ["CNAME", "A", "AAAA"].includes(r.type))) continue;
    const res = await fetch(`${API}/zones/${zoneId}/dns_records`, {
      method: "POST",
      headers: { authorization: `Bearer ${auth.token}`, "content-type": "application/json" },
      body: JSON.stringify({ type: "CNAME", name, content: target, proxied: true, ttl: 1, comment: "Website (Underground Associates)" }),
    });
    const body = (await res.json().catch(() => ({}))) as { success?: boolean; errors?: Array<{ code: number }> };
    if (!body.success) result = body.errors?.[0]?.code === 10000 ? "no-permission" : "error";
  }
  return result;
}

export type DomainStage = "none" | "buy" | "publish" | "connecting" | "dns" | "working";

/**
 * Hooks a domain bought on our Cloudflare up to a published site: both names on the Pages project + the DNS records. Returns
 * where it stands: buy (not in our account yet), connecting (Cloudflare is still checking), dns (records missing and the
 * token can't add them), working.
 */
export async function wireDomain(
  auth: PagesAuth,
  project: string,
  domain: string,
): Promise<{ stage: DomainStage; ours: boolean; records?: string; error?: string | null }> {
  const apex = bareDomain(domain);
  const zone = await ourZone(auth, apex);
  if (!zone) {
    // Bought elsewhere (or not bought yet): still connect it, so a CNAME added there is picked up.
    const d = await addDomain(auth, project, domain).catch(() => null);
    return { stage: d?.status === "active" ? "working" : "buy", ours: false };
  }
  await addDomain(auth, project, apex);
  await addDomain(auth, project, `www.${apex}`).catch(() => null);
  const records = await ensureRecords(auth, zone.id, apex, `${project}.pages.dev`);
  const d = await getDomain(auth, project, apex);
  if (d?.status === "active") return { stage: "working", ours: true, records };
  return { stage: records === "no-permission" ? "dns" : "connecting", ours: true, records, error: d?.verification_data?.error_message ?? d?.validation_data?.error_message ?? null };
}
