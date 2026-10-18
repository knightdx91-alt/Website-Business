/**
 * Stripe audit from the server (the Stripe key is a Worker secret, so the dev container can't call Stripe itself).
 * Settings key `stripe_audit_req` (any value) → the minute cron lists every subscription that can still charge
 * (active / trialing / past_due / unpaid) and the last 30 charges into `stripe_audit`, then clears the request.
 * Settings key `stripe_cancel_req` = JSON array of subscription ids → each is cancelled now (no proration, no refund),
 * results go in `stripe_cancel_log`. `stripe_refund_req` = JSON array of charge ids (`ch_…`) → each is refunded in full
 * (what's left of it), results in `stripe_refund_log`. Nothing here is reachable over HTTP; only someone with D1 access can ask.
 */
import type { Env } from "./env.ts";
import { getSetting, setSetting } from "./db.ts";
import { STRIPE_VERSION } from "./tap.ts";

const LIVE = ["active", "trialing", "past_due", "unpaid"];

async function call(env: Env, method: string, path: string, body?: URLSearchParams): Promise<any> {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "stripe-version": STRIPE_VERSION,
      ...(body ? { "content-type": "application/x-www-form-urlencoded" } : {}),
    },
    body,
  });
  const data = (await res.json()) as any;
  if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
  return data;
}

export async function runStripeAudit(env: Env): Promise<void> {
  if (!env.STRIPE_SECRET_KEY) return;
  const cancel = await getSetting(env, "stripe_cancel_req");
  if (cancel) {
    await env.DB.prepare("DELETE FROM settings WHERE key = 'stripe_cancel_req'").run();
    const ids: string[] = (() => { try { return JSON.parse(cancel); } catch { return []; } })();
    const log = [];
    for (const id of ids.filter((x) => /^sub_[A-Za-z0-9]+$/.test(x)).slice(0, 25)) {
      try {
        const s = await call(env, "DELETE", `subscriptions/${id}`);
        log.push({ id, status: s.status });
      } catch (e) {
        log.push({ id, error: (e as Error).message });
      }
    }
    await setSetting(env, "stripe_cancel_log", JSON.stringify({ at: Date.now(), log }));
  }
  const refund = await getSetting(env, "stripe_refund_req");
  if (refund) {
    await env.DB.prepare("DELETE FROM settings WHERE key = 'stripe_refund_req'").run();
    const ids: string[] = (() => { try { return JSON.parse(refund); } catch { return []; } })();
    const log = [];
    for (const id of ids.filter((x) => /^ch_[A-Za-z0-9]+$/.test(x)).slice(0, 25)) {
      try {
        const r = await call(env, "POST", "refunds", new URLSearchParams({ charge: id, reason: "requested_by_customer" }));
        log.push({ id, refund: r.id, amount: r.amount, status: r.status });
      } catch (e) {
        log.push({ id, error: (e as Error).message });
      }
    }
    await setSetting(env, "stripe_refund_log", JSON.stringify({ at: Date.now(), log }));
  }
  if (!(await getSetting(env, "stripe_audit_req"))) return;
  await env.DB.prepare("DELETE FROM settings WHERE key = 'stripe_audit_req'").run();
  try {
    const subs = [];
    for (const status of LIVE) {
      const list = await call(env, "GET", `subscriptions?status=${status}&limit=100&expand[]=data.customer`);
      for (const s of list.data) {
        subs.push({
          id: s.id,
          status: s.status,
          created: s.created,
          customer: s.customer?.id ?? s.customer,
          email: s.customer?.email ?? null,
          name: s.customer?.name ?? null,
          metadata: s.metadata,
          cancelAtPeriodEnd: s.cancel_at_period_end,
          nextCharge: s.items?.data?.[0]?.current_period_end ?? s.current_period_end ?? null,
          items: (s.items?.data ?? []).map((i: any) => ({
            amount: i.price?.unit_amount,
            interval: i.price?.recurring?.interval,
            qty: i.quantity,
            product: i.price?.product,
          })),
        });
      }
    }
    const ch = await call(env, "GET", "charges?limit=30");
    const charges = ch.data.map((c: any) => ({
      id: c.id,
      amount: c.amount,
      refunded: c.amount_refunded,
      status: c.status,
      created: c.created,
      customer: c.customer,
      description: c.description,
      metadata: c.metadata,
    }));
    await setSetting(env, "stripe_audit", JSON.stringify({ at: Date.now(), subs, charges }));
  } catch (e) {
    await setSetting(env, "stripe_audit", JSON.stringify({ at: Date.now(), error: (e as Error).message }));
  }
}
