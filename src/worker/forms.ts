import { notify } from "./notify.ts";
import { getLead } from "./db.ts";
import { newId, now, type Env } from "./env.ts";

const FIELDS = ["name", "phone", "email", "service", "vehicle", "frequency", "home_size", "property", "quantity", "town", "message"] as const;

/** Lead form posts from published client sites. Works without JavaScript (plain POST + redirect). */
export async function handleFormPost(env: Env, req: Request, leadId: string): Promise<Response> {
  const lead = await getLead(env, leadId);
  if (!lead?.live_url) return new Response("Not found", { status: 404 });
  const back = (path: string) => Response.redirect(`${lead.live_url}${path}`, 303);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return back("/");
  }
  // Honeypot: real people never fill this hidden field.
  if (String(form.get("website") ?? "").trim()) return back("/thanks/");

  const ip = req.headers.get("cf-connecting-ip") ?? "";
  const recent = await env.DB.prepare("SELECT COUNT(*) AS n FROM submissions WHERE lead_id = ? AND ip = ? AND created_at > ?")
    .bind(leadId, ip, now() - 3_600_000)
    .first<{ n: number }>();
  if ((recent?.n ?? 0) >= 5) return back("/thanks/");

  const data: Record<string, string> = {};
  for (const f of FIELDS) {
    const v = String(form.get(f) ?? "").trim().slice(0, f === "message" ? 2000 : 200);
    if (v) data[f] = v;
  }
  if (!data.name || !data.phone) return back("/#contact");
  await env.DB.prepare("INSERT INTO submissions (id, lead_id, created_at, data_json, ip, unverified) VALUES (?, ?, ?, ?, ?, 1)")
    .bind(newId(), leadId, now(), JSON.stringify(data), ip)
    .run();
  await notify(env, { kind: "message", actorName: data.name, leadId, text: `💬 New request from ${lead.name}'s website: ${data.name}${data.service ? `, ${data.service}` : ""}` });
  return back("/thanks/");
}
