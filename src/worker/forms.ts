import { notify } from "./notify.ts";
import { getLead } from "./db.ts";
import { newId, now, type Env } from "./env.ts";

// Every FormField name the generator can render (src/generator/components.ts), plus the hidden topic a special form sets.
const FIELDS = ["topic", "name", "phone", "email", "service", "vehicle", "frequency", "home_size", "property", "quantity", "year", "make", "model", "part", "items", "address", "best_day", "town", "message", "reach", "urgent", "facility", "sq_ft"] as const;

/** True when the form's "Is this an emergency?" answer was yes. */
export function isUrgent(data: Record<string, string>): boolean {
  return /^y/i.test(data.urgent ?? "");
}

/**
 * One line for the notification: what they asked for (service, the part and vehicle, the pickup items, the building),
 * with 🔴 in front of an emergency and how they'd rather be reached at the end.
 */
export function requestSummary(data: Record<string, string>): string {
  const vehicle = [data.year, data.make, data.model].filter(Boolean).join(" ") || data.vehicle;
  const bits = [data.service, data.part, vehicle, data.items, data.facility, data.sq_ft ? `${data.sq_ft} sq ft` : "", data.home_size, data.frequency, data.property, data.address, data.best_day ? `best day ${data.best_day}` : "", data.town].filter(Boolean);
  if (data.reach) bits.push(`prefers ${data.reach.toLowerCase() === "text" ? "a text" : "a call"}`);
  const what = bits.join(" · ");
  const line = data.topic ? `${data.topic}${what ? `: ${what}` : ""}` : what;
  return isUrgent(data) ? `🔴 Emergency${line ? ` · ${line}` : ""}` : line;
}

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
  const what = requestSummary(data);
  await notify(env, { kind: "message", actorName: data.name, leadId, text: `${isUrgent(data) ? "🔴" : "💬"} New request from ${lead.name}'s website: ${data.name}${what ? `, ${what}` : ""}` });
  return back("/thanks/");
}
