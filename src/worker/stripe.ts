import { notify } from "./notify.ts";
import { getLead } from "./db.ts";
import { now, type Env } from "./env.ts";

/**
 * Stripe webhook (Stripe → Developers → Webhooks → https://<app>/stripe/webhook). The signing secret lives in the
 * Worker secret STRIPE_WEBHOOK_SECRET. A finished checkout from a sign-up link carries client_reference_id = lead id,
 * so the lead's latest sign-up is marked paid; later failed payments and cancellations are matched by customer.
 */

const TOLERANCE_S = 300;

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Checks a Stripe-Signature header ("t=…,v1=…") against the raw body. */
export async function verifyStripe(secret: string, header: string | null, body: string, nowS = Math.floor(Date.now() / 1000)): Promise<boolean> {
  if (!header) return false;
  const parts = header.split(",").map((p) => p.split("=", 2) as [string, string]);
  const t = Number(parts.find(([k]) => k === "t")?.[1]);
  const sigs = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || !sigs.length || Math.abs(nowS - t) > TOLERANCE_S) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const want = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${body}`)));
  return sigs.some((s) => s.length === want.length && [...s].reduce((d, c, i) => d | (c.charCodeAt(0) ^ want.charCodeAt(i)), 0) === 0);
}

function money(cents: number | null | undefined): string {
  return typeof cents === "number" ? `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}` : "";
}

interface StripeEvent {
  id: string;
  type: string;
  data: { object: Record<string, any> };
}

export async function stripeWebhook(env: Env, req: Request): Promise<Response> {
  if (!env.STRIPE_WEBHOOK_SECRET) return new Response("Stripe webhook isn't set up", { status: 503 });
  const body = await req.text();
  if (!(await verifyStripe(env.STRIPE_WEBHOOK_SECRET, req.headers.get("stripe-signature"), body))) return new Response("Bad signature", { status: 400 });
  const event = JSON.parse(body) as StripeEvent;
  const fresh = await env.DB.prepare("INSERT OR IGNORE INTO stripe_events (id, created_at) VALUES (?, ?)").bind(event.id, now()).run();
  if (!fresh.meta.changes) return new Response("ok");
  const o = event.data.object;

  const meta = (o.metadata ?? {}) as Record<string, string>;
  if (event.type === "checkout.session.completed" && meta.kind === "signup" && meta.signupId) {
    // Checkout made by the app for a sign-up (from a sign-up link, or a Buy now order on the website).
    await env.DB.prepare("UPDATE signups SET paid = 1, stripe_customer = ?, stripe_subscription = ? WHERE id = ?").bind(o.customer ?? null, o.subscription ?? null, meta.signupId).run();
    const row = await env.DB.prepare("SELECT s.lead_id, s.business, s.signer_name, l.name FROM signups s LEFT JOIN leads l ON l.id = s.lead_id WHERE s.id = ?")
      .bind(meta.signupId)
      .first<{ lead_id: string; business: string | null; signer_name: string; name: string | null }>();
    const who = row?.name ?? row?.business ?? row?.signer_name ?? "A client";
    await notify(env, {
      kind: "paid",
      actorName: "Stripe",
      leadId: row && row.lead_id !== "web" ? row.lead_id : null,
      text: `💵 ${who} paid ${money(o.amount_total)}${row?.lead_id === "web" ? " (website order: add them with ➕ Add a business)" : ""}`,
    });
  } else if (event.type === "checkout.session.completed" && meta.kind === "extras" && meta.purchaseId) {
    await env.DB.prepare("UPDATE purchases SET paid = 1, stripe_customer = ? WHERE id = ?").bind(o.customer ?? null, meta.purchaseId).run();
    const row = await env.DB.prepare("SELECT p.lead_id, p.items_json, l.name FROM purchases p LEFT JOIN leads l ON l.id = p.lead_id WHERE p.id = ?")
      .bind(meta.purchaseId)
      .first<{ lead_id: string; items_json: string; name: string | null }>();
    const items = row ? (JSON.parse(row.items_json) as { extras: Array<{ name: string; qty: number }> }).extras.map((x) => (x.qty > 1 ? `${x.name} x${x.qty}` : x.name)) : [];
    await notify(env, { kind: "paid", actorName: "Stripe", leadId: row?.lead_id ?? null, text: `💵 ${row?.name ?? "A client"} bought extras: ${items.join(", ") || "see Stripe"} (${money(o.amount_total)})` });
  } else if (event.type === "checkout.session.completed") {
    const leadId = typeof o.client_reference_id === "string" && /^[a-z0-9]+$/.test(o.client_reference_id) ? o.client_reference_id : null;
    const lead = leadId ? await getLead(env, leadId) : null;
    const who = lead?.name ?? o.customer_details?.name ?? o.customer_details?.email ?? "A client";
    if (lead) {
      await env.DB.prepare(
        "UPDATE signups SET paid = 1, stripe_customer = ?, stripe_subscription = ? WHERE id = (SELECT id FROM signups WHERE lead_id = ? ORDER BY created_at DESC LIMIT 1)",
      )
        .bind(o.customer ?? null, o.subscription ?? null, lead.id)
        .run();
    }
    await notify(env, { kind: "paid", actorName: "Stripe", leadId: lead?.id ?? null, text: `💵 ${who} paid${o.amount_total ? ` ${money(o.amount_total)}` : ""} through Stripe${lead ? ". Payment is marked set up." : " (no matching lead; check Stripe)."}` });
  } else if (event.type === "invoice.payment_failed" || event.type === "customer.subscription.deleted") {
    const customer = o.customer as string | undefined;
    const row = customer
      ? await env.DB.prepare("SELECT s.lead_id, l.name FROM signups s LEFT JOIN leads l ON l.id = s.lead_id WHERE s.stripe_customer = ? ORDER BY s.created_at DESC LIMIT 1")
          .bind(customer)
          .first<{ lead_id: string; name: string | null }>()
      : null;
    const who = row?.name ?? o.customer_name ?? o.customer_email ?? "A client";
    if (event.type === "customer.subscription.deleted" && row) await env.DB.prepare("UPDATE signups SET paid = 0 WHERE lead_id = ? AND stripe_customer = ?").bind(row.lead_id, customer).run();
    await notify(env, {
      kind: "paid",
      actorName: "Stripe",
      leadId: row?.lead_id ?? null,
      text: event.type === "invoice.payment_failed" ? `⚠️ ${who}'s payment${o.amount_due ? ` of ${money(o.amount_due)}` : ""} failed. Stripe will retry; give them a call.` : `❌ ${who} canceled their subscription in Stripe.`,
    });
  }
  return new Response("ok");
}
