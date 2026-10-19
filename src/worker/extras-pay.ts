/**
 * Extras added by the team in the app and paid on the spot (owner's ask, Oct 2026): pick extras on a client's lead
 * page, then "💳 Take payment by tap" or "⌨️ Type in the card numbers", like a sign-up. The client approves in
 * person (their name is stored with the extras agreement text); their signed service agreement's payment
 * authorization covers approved extras. A monthly extra starts its own subscription on the same card, one month out.
 *
 * Tap to Pay reuses the native screen and its /api/tap/* routes: the tap token carries "p<purchaseId>" where a
 * sign-up's carries its id (ids are hex, so a "p" can't clash).
 */
import { tapToken, verifyTap } from "./auth.ts";
import { checkoutParams, createCheckout, priceExtras, type Pick } from "./checkout.ts";
import { contractText } from "./contract.ts";
import { getLead, getSettings, isPayTest, type AppSettings } from "./db.ts";
import { HttpError, newId, now, type Env } from "./env.ts";
import { notify } from "./notify.ts";
import { orderSummary } from "./signup.ts";
import {
  MIN_CENTS,
  TAP_TOKEN_MINUTES,
  cardReady,
  longDate,
  money,
  nextPeriodStart,
  nonce,
  stripe,
  stripeGet,
  tapIntentUrl,
  tapStatus,
  terminalLocation,
  type PaymentIntentObj,
  type TapResult,
} from "./tap.ts";

export interface PurchaseRow {
  id: string;
  lead_id: string;
  items_json: string;
  due_cents: number;
  paid: number;
  stripe_customer: string | null;
  stripe_subscription: string | null;
  stripe_payment_intent: string | null;
  tap_nonce: string | null;
  signer_name: string | null;
  signer_email: string | null;
  created_at: number;
}

interface Items {
  picks?: Pick[];
  extras?: Array<{ name: string; qty: number; price: string }>;
  renews?: { amount: number; interval: "month" | "year" } | null;
}

async function purchaseRow(env: Env, id: string): Promise<PurchaseRow> {
  const row = await env.DB.prepare(
    "SELECT id, lead_id, items_json, due_cents, paid, stripe_customer, stripe_subscription, stripe_payment_intent, tap_nonce, signer_name, signer_email, created_at FROM purchases WHERE id = ?",
  )
    .bind(id)
    .first<PurchaseRow>();
  if (!row) throw new HttpError(404, "No such extras order");
  return row;
}

/** Settings as the purchase was priced: the practice lead only ever charges a $1 test item. */
function settingsFor(real: AppSettings, lead: { place_id?: string | null } | null): AppSettings {
  return isPayTest(lead)
    ? {
        ...real,
        addons: [
          { name: "Payment test (refund afterwards)", price: 1, unit: "one-time" as const, about: "Checks that payments reach the app." },
        ],
      }
    : real;
}

const names = (row: PurchaseRow): string[] => {
  try {
    return ((JSON.parse(row.items_json) as Items).extras ?? []).map((e) => (e.qty > 1 ? `${e.name} ×${e.qty}` : e.name));
  } catch {
    return [];
  }
};

/** POST /api/leads/:id/extras: a new extras order for a Sold / Live client, approved in person. */
export async function addExtrasInApp(
  env: Env,
  o: { leadId: string; picks: Pick[]; approvedBy: string; actorName: string },
): Promise<{ purchaseId: string; dueCents: number; renews: Items["renews"]; summary: string; quotes: string[] }> {
  const lead = await getLead(env, o.leadId);
  if (!lead) throw new HttpError(404, "No such lead");
  if (!["sold", "live"].includes(lead.sales_status) && !isPayTest(lead))
    throw new HttpError(409, "Sign them up first; extras go on a client's account.");
  const settings = settingsFor(await getSettings(env), lead);
  // The practice lead's only extra is the $1 test item, whatever was ticked.
  const picks = (isPayTest(lead) ? [{ index: 0, qty: 1 }] : o.picks).filter((p) => settings.addons[p.index]).map((p) => ({ index: p.index, qty: Math.min(20, Math.max(1, p.qty)) }));
  if (!picks.length) throw new HttpError(400, "Pick at least one extra");
  const order = priceExtras(settings, picks);
  const last = await env.DB.prepare(
    "SELECT stripe_customer, signer_email FROM signups WHERE lead_id = ? ORDER BY paid DESC, created_at DESC LIMIT 1",
  )
    .bind(o.leadId)
    .first<{ stripe_customer: string | null; signer_email: string | null }>();
  const id = newId();
  await env.DB.prepare(
    "INSERT INTO purchases (id, lead_id, items_json, due_cents, created_at, terms, signer_name, signer_email, signature, ip, user_agent, stripe_customer, added_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 'app', ?, ?)",
  )
    .bind(
      id,
      o.leadId,
      JSON.stringify({ picks, extras: order.extras, quotes: order.quotes, renews: order.renews }),
      order.dueToday,
      now(),
      contractText(settings, order, { business: lead.name ?? "your business", kind: "extras" }),
      `${o.approvedBy} (approved in person; added by ${o.actorName})`,
      last?.signer_email ?? null,
      last?.stripe_customer ?? null,
      o.actorName,
    )
    .run();
  const summary = orderSummary(order);
  await env.DB.prepare(
    "INSERT INTO lead_notes (id, lead_id, author, outcome, body, created_at) VALUES (?, ?, ?, NULL, ?, ?)",
  )
    .bind(newId(), o.leadId, o.actorName, `Added extras: ${summary}${order.dueToday ? ` (${money(order.dueToday)} due)` : ""}. Approved by ${o.approvedBy}.`, now())
    .run();
  await notify(env, {
    kind: "signed",
    actorName: o.actorName,
    leadId: o.leadId,
    text: `🛒 ${o.actorName} added extras for ${lead.name}: ${summary}${order.dueToday ? ` (${money(order.dueToday)} due)` : ""}`,
  });
  return { purchaseId: id, dueCents: order.dueToday, renews: order.renews, summary, quotes: order.quotes };
}

/** DELETE /api/leads/:id/extras/:pid: drops an unpaid extras order added by mistake. */
export async function removeExtras(env: Env, leadId: string, purchaseId: string): Promise<{ ok: true }> {
  const row = await purchaseRow(env, purchaseId);
  if (row.lead_id !== leadId) throw new HttpError(404, "No such extras order");
  if (row.paid) throw new HttpError(409, "It's paid; refund it in Stripe instead");
  if (row.stripe_payment_intent)
    await stripe(env, `payment_intents/${row.stripe_payment_intent}/cancel`, {}).catch(() => undefined);
  await env.DB.prepare("DELETE FROM purchases WHERE id = ?").bind(purchaseId).run();
  return { ok: true };
}

async function ensureCustomer(env: Env, row: PurchaseRow): Promise<string> {
  if (row.stripe_customer) return row.stripe_customer;
  const prev = await env.DB.prepare(
    "SELECT stripe_customer FROM signups WHERE lead_id = ? AND stripe_customer IS NOT NULL UNION ALL SELECT stripe_customer FROM purchases WHERE lead_id = ? AND stripe_customer IS NOT NULL LIMIT 1",
  )
    .bind(row.lead_id, row.lead_id)
    .first<{ stripe_customer: string }>();
  if (prev?.stripe_customer) return prev.stripe_customer;
  const lead = await getLead(env, row.lead_id);
  const c = await stripe<{ id: string }>(
    env,
    "customers",
    {
      name: lead?.name ?? "Client",
      ...(row.signer_email ? { email: row.signer_email } : {}),
      ...(lead?.phone ? { phone: lead.phone } : {}),
      metadata: { leadId: row.lead_id, purchaseId: row.id },
    },
    `cus:p${row.id}`,
  );
  return c.id;
}

async function payable(env: Env, leadId: string, purchaseId: string): Promise<PurchaseRow> {
  const row = await purchaseRow(env, purchaseId);
  if (row.lead_id !== leadId) throw new HttpError(404, "No such extras order");
  if (row.paid) throw new HttpError(409, "These extras are already paid");
  if (row.due_cents < MIN_CENTS) throw new HttpError(409, "Nothing is due today on these extras");
  return row;
}

/** POST /api/leads/:id/extrastap/:pid: a card_present PaymentIntent (reused while open) and a token for the native screen. */
export async function startExtrasTap(
  env: Env,
  o: { leadId: string; purchaseId: string; origin: string },
): Promise<{ token: string; intentUrl: string; amountCents: number; business: string; alreadyPaid?: boolean }> {
  const status = await tapStatus(env);
  if (!status.ready) throw new HttpError(409, status.why ?? "Tap to Pay isn't set up");
  const row = await payable(env, o.leadId, o.purchaseId);
  const lead = await getLead(env, row.lead_id);
  const business = lead?.name ?? "the client";
  const customer = await ensureCustomer(env, row);
  let pi: PaymentIntentObj | null = null;
  if (row.stripe_payment_intent) {
    const existing = await stripeGet<PaymentIntentObj>(env, `payment_intents/${row.stripe_payment_intent}`).catch(() => null);
    if (existing?.status === "succeeded") {
      await completeExtrasTap(env, { purchaseId: row.id, paymentIntentId: existing.id, actorName: "Tap to Pay" });
      return { token: "", intentUrl: "", amountCents: row.due_cents, business, alreadyPaid: true };
    }
    if (existing && ["requires_payment_method", "requires_confirmation", "requires_action"].includes(existing.status) && existing.amount === row.due_cents)
      pi = existing;
    else if (existing && existing.status !== "canceled" && existing.status !== "processing")
      await stripe(env, `payment_intents/${existing.id}/cancel`, {}).catch(() => undefined);
  }
  pi ??= await stripe<PaymentIntentObj>(env, "payment_intents", {
    amount: row.due_cents,
    currency: "usd",
    customer,
    payment_method_types: ["card_present"],
    setup_future_usage: "off_session",
    capture_method: "automatic",
    ...(row.signer_email ? { receipt_email: row.signer_email } : {}),
    description: `Extras for ${business}: ${names(row).join(", ")}`.slice(0, 300),
    metadata: { kind: "extras_tap", purchaseId: row.id, leadId: row.lead_id },
  });
  const n = nonce();
  await env.DB.prepare("UPDATE purchases SET stripe_customer = ?, stripe_payment_intent = ?, tap_nonce = ? WHERE id = ?")
    .bind(customer, pi.id, n, row.id)
    .run();
  const token = await tapToken(env, `p${row.id}`, n, TAP_TOKEN_MINUTES);
  return { token, intentUrl: tapIntentUrl(token, o.origin), amountCents: row.due_cents, business };
}

/** The native screen's token for an extras order, or null when the token is a sign-up's (or not a tap token at all). */
export async function extrasTapAuth(env: Env, authorization: string | null): Promise<PurchaseRow | null> {
  const bearer = /^Bearer\s+(.+)$/i.exec(authorization ?? "")?.[1]?.trim();
  if (!bearer?.startsWith("p")) return null;
  const t = await verifyTap(env, bearer);
  if (!t) throw new HttpError(401, "This payment link has expired. Start the payment again from the app.");
  const row = await purchaseRow(env, t.signupId.slice(1));
  if (!row.tap_nonce || row.tap_nonce !== t.nonce)
    throw new HttpError(401, "This payment was restarted. Start it again from the app.");
  return row;
}

/** GET /api/tap/session for an extras order: the same shape the native screen reads for a sign-up. */
export async function extrasTapSession(env: Env, row: PurchaseRow): Promise<Record<string, unknown>> {
  const s = await getSettings(env);
  const lead = await getLead(env, row.lead_id);
  const locationId = await terminalLocation(env);
  if (!row.stripe_payment_intent || !locationId) throw new HttpError(409, "Start the payment again from the app");
  const pi = await stripeGet<PaymentIntentObj>(env, `payment_intents/${row.stripe_payment_intent}`);
  const items = JSON.parse(row.items_json) as Items;
  return {
    signupId: `p${row.id}`,
    paymentIntentId: pi.id,
    clientSecret: pi.client_secret,
    status: pi.status,
    amountCents: pi.amount,
    business: lead?.name ?? "",
    signer: row.signer_name ?? "",
    plan: `Extras: ${names(row).join(", ")}`,
    renews: items.renews ? { amountCents: items.renews.amount, interval: items.renews.interval } : null,
    locationId,
    merchant: s.companyName || "Underground Associates",
    receiptEmail: row.signer_email,
    paid: !!row.paid,
  };
}

/** After the tap (app, webhook or the start route finding it done): verify with Stripe, then the bookkeeping. */
export async function completeExtrasTap(
  env: Env,
  o: { purchaseId: string; paymentIntentId?: string | null; actorName: string },
): Promise<TapResult> {
  const row = await purchaseRow(env, o.purchaseId);
  if (row.paid) return already(row);
  const piId = o.paymentIntentId ?? row.stripe_payment_intent;
  if (!piId) throw new HttpError(409, "No payment was started for these extras");
  const pi = await stripeGet<PaymentIntentObj>(env, `payment_intents/${piId}`, { "expand[]": "latest_charge" });
  if (pi.metadata?.purchaseId !== row.id) throw new HttpError(409, "That payment doesn't belong to these extras");
  if (pi.status !== "succeeded")
    throw new HttpError(409, pi.status === "requires_payment_method" ? "The card wasn't charged. Try the tap again." : `The payment isn't finished yet (${pi.status}).`);
  const d = pi.latest_charge?.payment_method_details?.card_present;
  return activateExtras(env, row, {
    customer: pi.customer ?? row.stripe_customer,
    paymentMethod: d?.generated_card ?? null,
    paidCents: pi.amount,
    paidRef: pi.id,
    card: d?.brand ? `${d.brand.replace(/^\w/, (c) => c.toUpperCase())} ••${d.last4 ?? ""}` : null,
    how: "in person by tap",
    via: "tap",
    actorName: o.actorName,
  });
}

/** POST /api/leads/:id/extracard/:pid: a SetupIntent for the app's card sheet (the card is saved, then charged). */
export async function startExtrasCard(
  env: Env,
  o: { leadId: string; purchaseId: string },
): Promise<{ clientSecret: string; publishableKey: string; amountCents: number }> {
  const settings = await getSettings(env);
  if (!(await cardReady(env, settings)) || !settings.stripePublishableKey)
    throw new HttpError(409, "Add the Stripe publishable key in Settings → Your business first");
  const row = await payable(env, o.leadId, o.purchaseId);
  const customer = await ensureCustomer(env, row);
  const si = await stripe<{ id: string; client_secret: string }>(env, "setup_intents", {
    customer,
    payment_method_types: ["card"],
    usage: "off_session",
    metadata: { kind: "extras_card", purchaseId: row.id, leadId: row.lead_id },
  });
  await env.DB.prepare("UPDATE purchases SET stripe_customer = ? WHERE id = ?").bind(customer, row.id).run();
  return { clientSecret: si.client_secret, publishableKey: settings.stripePublishableKey, amountCents: row.due_cents };
}

/** POST /api/leads/:id/extrapaid/:pid {setupIntentId}: charges today's amount off the saved card, then the bookkeeping. */
export async function completeExtrasCard(
  env: Env,
  o: { leadId: string; purchaseId: string; setupIntentId: string; actorName: string },
): Promise<TapResult> {
  const row = await purchaseRow(env, o.purchaseId);
  if (row.lead_id !== o.leadId) throw new HttpError(404, "No such extras order");
  if (row.paid) return already(row);
  const si = await stripeGet<{ id: string; status: string; customer: string | null; payment_method: string | null; metadata?: Record<string, string> }>(
    env,
    `setup_intents/${o.setupIntentId}`,
  );
  if (si.metadata?.purchaseId !== row.id) throw new HttpError(409, "That card doesn't belong to these extras");
  if (si.status !== "succeeded" || !si.payment_method) throw new HttpError(409, `The card wasn't saved (${si.status}). Try again.`);
  const customer = si.customer ?? row.stripe_customer;
  if (!customer) throw new HttpError(409, "No Stripe customer for these extras");
  const pm = await stripeGet<{ card?: { brand?: string; last4?: string } }>(env, `payment_methods/${si.payment_method}`).catch(
    () => ({}) as { card?: { brand?: string; last4?: string } },
  );
  const lead = await getLead(env, row.lead_id);
  const pi = await stripe<PaymentIntentObj>(
    env,
    "payment_intents",
    {
      amount: row.due_cents,
      currency: "usd",
      customer,
      payment_method: si.payment_method,
      off_session: true,
      confirm: true,
      ...(row.signer_email ? { receipt_email: row.signer_email } : {}),
      description: `Extras for ${lead?.name ?? "client"}: ${names(row).join(", ")}`.slice(0, 300),
      metadata: { kind: "extras_card", purchaseId: row.id, leadId: row.lead_id },
    },
    `pi:xcard:${row.id}:${si.id}`,
  );
  if (pi.status !== "succeeded")
    throw new HttpError(402, pi.status === "requires_action" ? "The bank wants to verify this card. Send them the Buy extras link to finish on their own phone." : `The charge didn't go through (${pi.status}).`);
  return activateExtras(env, row, {
    customer,
    paymentMethod: si.payment_method,
    paidCents: row.due_cents,
    paidRef: pi.id,
    card: pm.card?.brand ? `${pm.card.brand.replace(/^\w/, (c) => c.toUpperCase())} ••${pm.card.last4 ?? ""}` : null,
    how: "by card entered on the phone",
    via: "card",
    actorName: o.actorName,
  });
}

/** POST /api/leads/:id/extracheckout/:pid (web app): Stripe's own card page for the order; the webhook marks it paid. */
export async function startExtrasCheckout(
  env: Env,
  o: { leadId: string; purchaseId: string; origin: string },
): Promise<{ url: string; amountCents: number }> {
  const row = await payable(env, o.leadId, o.purchaseId);
  const lead = await getLead(env, row.lead_id);
  if (isPayTest(lead)) throw new HttpError(409, "The practice lead takes cards on the phone app only (tap or type the card in).");
  const settings = settingsFor(await getSettings(env), lead);
  const order = priceExtras(settings, (JSON.parse(row.items_json) as Items).picks ?? []);
  const customer = await ensureCustomer(env, row);
  const back = `${o.origin}/#/lead/${row.lead_id}`;
  const session = await createCheckout(
    env,
    checkoutParams({ order, successUrl: back, cancelUrl: back, clientReferenceId: row.lead_id, customer, metadata: { kind: "extras", purchaseId: row.id, leadId: row.lead_id } }),
  );
  await env.DB.prepare("UPDATE purchases SET stripe_customer = ?, stripe_session = ? WHERE id = ?").bind(customer, session.id, row.id).run();
  return { url: session.url, amountCents: row.due_cents };
}

function already(row: PurchaseRow): TapResult {
  return { ok: true, already: true, amountCents: row.due_cents, card: null, cardSaved: true, subscription: row.stripe_subscription, renewsOn: null, message: "Already paid." };
}

/** Paid: monthly extras start their own subscription on the saved card one month out; the order is marked paid. */
async function activateExtras(
  env: Env,
  row: PurchaseRow,
  o: { customer: string | null; paymentMethod: string | null; paidCents: number; paidRef: string; card: string | null; how: string; via: string; actorName: string },
): Promise<TapResult> {
  const lead = await getLead(env, row.lead_id);
  const business = lead?.name ?? "the client";
  const settings = settingsFor(await getSettings(env), lead);
  const picks = (JSON.parse(row.items_json) as Items).picks ?? [];
  const recurring = isPayTest(lead) ? [] : priceExtras(settings, picks).lines.filter((l) => l.interval);
  let subscription = row.stripe_subscription;
  let renewsOn: string | null = null;
  if (o.paymentMethod && o.customer && recurring.length && !subscription) {
    const anchor = nextPeriodStart(new Date(), "month");
    const sub = await stripe<{ id: string }>(
      env,
      "subscriptions",
      {
        customer: o.customer,
        default_payment_method: o.paymentMethod,
        items: recurring.map((l) => ({
          quantity: l.qty,
          price_data: { currency: "usd", unit_amount: l.amount, product_data: { name: l.name }, recurring: { interval: "month" } },
        })),
        billing_cycle_anchor: anchor,
        proration_behavior: "none",
        off_session: true,
        collection_method: "charge_automatically",
        metadata: { kind: "extras", purchaseId: row.id, leadId: row.lead_id, paidInPerson: o.paidRef },
      },
      `sub:p${row.id}:${o.paidRef}`,
    );
    subscription = sub.id;
    renewsOn = longDate(anchor);
  }
  await env.DB.prepare(
    "UPDATE purchases SET paid = 1, stripe_customer = COALESCE(?, stripe_customer), stripe_subscription = COALESCE(?, stripe_subscription), stripe_payment_intent = COALESCE(?, stripe_payment_intent), paid_via = ?, tap_nonce = NULL WHERE id = ?",
  )
    .bind(o.customer, subscription, o.paidRef.startsWith("pi_") ? o.paidRef : null, o.via, row.id)
    .run();
  const renewText = subscription && recurring.length ? ` The monthly part renews on the same card from ${renewsOn ?? "next month"}.` : "";
  const cardText = !o.paymentMethod && recurring.length ? " The card couldn't be saved for the monthly part: open their Stripe billing portal to add one." : "";
  const note = `Paid ${money(o.paidCents)} for extras (${names(row).join(", ")}) ${o.how}${o.card ? ` (${o.card})` : ""}.${renewText}${cardText}${isPayTest(lead) ? " TEST payment: refund it in Stripe." : ""}`;
  if (lead) {
    await env.DB.prepare("INSERT INTO lead_notes (id, lead_id, author, outcome, body, created_at) VALUES (?, ?, ?, NULL, ?, ?)")
      .bind(newId(), row.lead_id, o.actorName, note, now())
      .run();
  }
  await notify(env, { kind: "paid", actorName: o.actorName, leadId: lead ? row.lead_id : null, text: `💳 ${business} paid ${money(o.paidCents)} for extras ${o.how}.${renewText}` });
  return { ok: true, amountCents: o.paidCents, card: o.card, cardSaved: !!o.paymentMethod, subscription, renewsOn, message: note };
}
