import { notify } from "./notify.ts";
import { getLead } from "./db.ts";
import { newId, now, type Env } from "./env.ts";

// Every FormField name the generator can render (src/generator/components.ts), plus the hidden topic a special form sets.
const FIELDS = [
  "topic", "name", "phone", "email", "service", "vehicle", "frequency", "home_size", "property", "quantity", "year", "make", "model", "part", "items", "address", "best_day", "town", "message",
  // Oct 2026: catering / truck booking / florist inquiry / booth inquiry / print quote fields.
  "event_date", "guests", "needs", "location", "occasion", "budget_range", "needed_by", "placements", "artwork_status", "rush", "booth",
  // Oct 2026: trades / lawn / cleaning forms.
  "reach", "urgent", "facility", "sq_ft",
  // Oct 2026: tire quotes.
  "tire_size", "brand",
] as const;

/** True when the form's "Is this an emergency?" answer was yes. */
export function isUrgent(data: Record<string, string>): boolean {
  return /^y/i.test(data.urgent ?? "");
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-11-03" → "Nov 3"; anything else comes back as typed. */
function shortDate(s: string | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? "");
  return m ? `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}` : (s ?? "");
}

const ARTWORK: Array<[RegExp, string]> = [
  [/print-ready|have a file|have artwork/i, "has artwork"],
  [/sketch|photo/i, "has a sketch"],
  [/design help/i, "needs design help"],
  [/not sure/i, "artwork TBD"],
];

/**
 * One line for the notification and the Inbox: what they asked for. Examples:
 * "Quote: 48 Custom T-shirts · needed by Nov 3 · front, back · has artwork · RUSH",
 * "Catering: Nov 3 · 40 guests · drop-off", "Reserve a part: 2015 Ford F-150 · alternator".
 */
export function requestSummary(data: Record<string, string>): string {
  const vehicle = [data.year, data.make, data.model].filter(Boolean).join(" ") || data.vehicle;
  // "265/70R17 ×4" or "2014 Ford F-150 ×4": a tire quantity rides on the thing being quoted; otherwise "48 Custom T-shirts".
  const qty = data.quantity && /^\d+$/.test(data.quantity) ? ` ×${data.quantity}` : data.quantity ? ` (${data.quantity})` : "";
  const sized = data.tire_size ? `${data.tire_size}${qty}` : "";
  const what = sized ? data.service || "" : data.quantity && data.service ? `${data.quantity} ${data.service}` : data.service || (data.quantity && !vehicle ? `qty ${data.quantity}` : "");
  const vehicleBit = sized ? vehicle : vehicle && data.quantity && !data.service ? `${vehicle}${qty}` : vehicle;
  const art = data.artwork_status ? (ARTWORK.find(([re]) => re.test(data.artwork_status!))?.[1] ?? data.artwork_status) : "";
  const bits = [
    what,
    data.part,
    sized,
    vehicleBit,
    data.brand,
    data.items,
    data.facility,
    data.sq_ft ? `${data.sq_ft} sq ft` : "",
    data.home_size,
    data.frequency,
    data.property,
    data.booth,
    data.occasion,
    data.event_date ? shortDate(data.event_date) : "",
    data.guests ? `${data.guests} guests` : "",
    data.location,
    data.needs,
    data.budget_range ? `budget ${data.budget_range}` : "",
    data.needed_by ? `needed by ${shortDate(data.needed_by)}` : "",
    data.placements,
    art,
    data.rush && /^yes/i.test(data.rush) ? "RUSH" : "",
    data.address,
    data.best_day ? `best day ${data.best_day}` : "",
    data.town,
  ].filter(Boolean);
  if (data.reach) bits.push(`prefers ${data.reach.toLowerCase() === "text" ? "a text" : "a call"}`);
  const joined = bits.join(" · ");
  const line = data.topic ? `${data.topic}${joined ? `: ${joined}` : ""}` : joined;
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
