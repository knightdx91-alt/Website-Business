import { notify } from "./notify.ts";
import { getLead, updateLead } from "./db.ts";
import { newId, now, type Env } from "./env.ts";

/**
 * Stripe webhook (Stripe → Developers → Webhooks → https://<app>/stripe/webhook). The signing secret lives in the
 * Worker secret STRIPE_WEBHOOK_SECRET. A finished checkout from a sign-up link carries client_reference_id = lead id,
 * so the lead's latest sign-up is marked paid. Cancellations are matched by subscription id (a plan sign-up or an
 * extras purchase); failed payments by customer. An event counts as handled only once its handler finished, so a
 * Stripe retry after an error is processed instead of dropped.
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

export interface StripeEvent {
  id: string;
  type: string;
  data: { object: Record<string, any> };
}

export async function stripeWebhook(env: Env, req: Request): Promise<Response> {
  if (!env.STRIPE_WEBHOOK_SECRET) return new Response("Stripe webhook isn't set up", { status: 503 });
  const body = await req.text();
  if (!(await verifyStripe(env.STRIPE_WEBHOOK_SECRET, req.headers.get("stripe-signature"), body))) return new Response("Bad signature", { status: 400 });
  const event = JSON.parse(body) as StripeEvent;
  // Claim the event first (two deliveries at once must not both run), but give the claim back if handling fails,
  // so Stripe's retry gets another go instead of being ignored.
  const fresh = await env.DB.prepare("INSERT OR IGNORE INTO stripe_events (id, created_at) VALUES (?, ?)").bind(event.id, now()).run();
  if (!fresh.meta.changes) return new Response("ok");
  try {
    await handleStripeEvent(env, event);
  } catch (err) {
    await env.DB.prepare("DELETE FROM stripe_events WHERE id = ?").bind(event.id).run();
    console.error("stripe webhook failed", event.id, event.type, err);
    return new Response("Handler failed; retry", { status: 500 });
  }
  return new Response("ok");
}

/** A client paid for their plan: the callback is done with, and the call log says so. */
async function planPaid(env: Env, leadId: string | null | undefined): Promise<void> {
  if (!leadId || leadId === "web") return;
  await updateLead(env, leadId, { follow_up: null });
  await env.DB.prepare("INSERT INTO lead_notes (id, lead_id, author, outcome, body, created_at) VALUES (?, ?, 'Stripe', NULL, 'Paid through Stripe', ?)").bind(newId(), leadId, now()).run();
}

function extrasNames(itemsJson: string | null | undefined): string[] {
  if (!itemsJson) return [];
  return (JSON.parse(itemsJson) as { extras: Array<{ name: string; qty: number }> }).extras.map((x) => (x.qty > 1 ? `${x.name} x${x.qty}` : x.name));
}

export async function handleStripeEvent(env: Env, event: StripeEvent): Promise<void> {
  const o = event.data.object;
  const meta = (o.metadata ?? {}) as Record<string, string>;
  if (event.type === "checkout.session.completed" && meta.kind === "signup" && meta.signupId) {
    // Checkout made by the app for a sign-up (from a sign-up link, or a Buy now order on the website).
    await env.DB.prepare("UPDATE signups SET paid = 1, stripe_customer = ?, stripe_subscription = ? WHERE id = ?").bind(o.customer ?? null, o.subscription ?? null, meta.signupId).run();
    const row = await env.DB.prepare("SELECT s.lead_id, s.business, s.signer_name, l.name FROM signups s LEFT JOIN leads l ON l.id = s.lead_id WHERE s.id = ?")
      .bind(meta.signupId)
      .first<{ lead_id: string; business: string | null; signer_name: string; name: string | null }>();
    await planPaid(env, row?.lead_id);
    const who = row?.name ?? row?.business ?? row?.signer_name ?? "A client";
    await notify(env, {
      kind: "paid",
      actorName: "Stripe",
      leadId: row && row.lead_id !== "web" ? row.lead_id : null,
      text: `💵 ${who} paid ${money(o.amount_total)}${row?.lead_id === "web" ? " (website order: add them with ➕ Add a business)" : ""}`,
    });
  } else if (event.type === "checkout.session.completed" && meta.kind === "extras" && meta.purchaseId) {
    await env.DB.prepare("UPDATE purchases SET paid = 1, stripe_customer = ?, stripe_subscription = ? WHERE id = ?").bind(o.customer ?? null, o.subscription ?? null, meta.purchaseId).run();
    const row = await env.DB.prepare("SELECT p.lead_id, p.items_json, l.name FROM purchases p LEFT JOIN leads l ON l.id = p.lead_id WHERE p.id = ?")
      .bind(meta.purchaseId)
      .first<{ lead_id: string; items_json: string; name: string | null }>();
    const items = extrasNames(row?.items_json);
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
      await planPaid(env, lead.id);
    }
    await notify(env, { kind: "paid", actorName: "Stripe", leadId: lead?.id ?? null, text: `💵 ${who} paid${o.amount_total ? ` ${money(o.amount_total)}` : ""} through Stripe${lead ? ". Payment is marked set up." : " (no matching lead; check Stripe)."}` });
  } else if (event.type === "customer.subscription.deleted") {
    const subscription = typeof o.id === "string" ? o.id : "";
    // The plan sign-up carrying this subscription, else an extras purchase (its own subscription), else only the customer.
    const plan = subscription
      ? await env.DB.prepare("SELECT s.id, s.lead_id, l.name FROM signups s LEFT JOIN leads l ON l.id = s.lead_id WHERE s.stripe_subscription = ? ORDER BY s.created_at DESC LIMIT 1")
          .bind(subscription)
          .first<{ id: string; lead_id: string; name: string | null }>()
      : null;
    if (plan) {
      await env.DB.prepare("UPDATE signups SET paid = 0 WHERE id = ?").bind(plan.id).run();
      await notify(env, { kind: "paid", actorName: "Stripe", leadId: plan.lead_id !== "web" ? plan.lead_id : null, text: `❌ ${plan.name ?? "A client"} canceled their subscription in Stripe.` });
      return;
    }
    const extras = subscription
      ? await env.DB.prepare("SELECT p.id, p.lead_id, p.items_json, l.name FROM purchases p LEFT JOIN leads l ON l.id = p.lead_id WHERE p.stripe_subscription = ? ORDER BY p.created_at DESC LIMIT 1")
          .bind(subscription)
          .first<{ id: string; lead_id: string; items_json: string; name: string | null }>()
      : null;
    if (extras) {
      await env.DB.prepare("UPDATE purchases SET paid = 0 WHERE id = ?").bind(extras.id).run();
      const items = extrasNames(extras.items_json);
      await notify(env, { kind: "paid", actorName: "Stripe", leadId: extras.lead_id, text: `❌ ${extras.name ?? "A client"} cancelled their ${items.join(", ") || "extras"} subscription in Stripe. Their website plan is unchanged.` });
      return;
    }
    const row = await byCustomer(env, o.customer as string | undefined);
    const who = row?.name ?? o.customer_name ?? o.customer_email ?? "A client";
    await notify(env, { kind: "paid", actorName: "Stripe", leadId: row?.lead_id ?? null, text: `❌ ${who} canceled a subscription in Stripe that isn't on file here. Check Stripe to see which.` });
  } else if (event.type === "invoice.payment_failed") {
    const row = await byCustomer(env, o.customer as string | undefined);
    const who = row?.name ?? o.customer_name ?? o.customer_email ?? "A client";
    await notify(env, {
      kind: "paid",
      actorName: "Stripe",
      leadId: row?.lead_id ?? null,
      text: `⚠️ ${who}'s payment${o.amount_due ? ` of ${money(o.amount_due)}` : ""} failed. Stripe will retry; give them a call.`,
    });
  }
}

async function byCustomer(env: Env, customer: string | undefined): Promise<{ lead_id: string; name: string | null } | null> {
  if (!customer) return null;
  return env.DB.prepare("SELECT s.lead_id, l.name FROM signups s LEFT JOIN leads l ON l.id = s.lead_id WHERE s.stripe_customer = ? AND s.lead_id != 'web' ORDER BY s.created_at DESC LIMIT 1")
    .bind(customer)
    .first<{ lead_id: string; name: string | null }>();
}
