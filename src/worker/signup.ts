import { notify } from "./notify.ts";
import { shareToken } from "./auth.ts";
import { checkoutParams, createCheckout, dollars, pickerHtml, picksFromForm, priceExtras, priceSignup, type Pick, type PricedOrder } from "./checkout.ts";
import { addonPrice, defaultTerms, getLead, getSettings, updateLead, type BillingOption, type Plan } from "./db.ts";
import { newId, now, type Env } from "./env.ts";
import { escHtml, page } from "./page.ts";

interface SignupRow {
  id: string;
  lead_id: string;
  plan_json: string;
  terms: string;
  signer_name: string;
  signer_title: string | null;
  signer_email: string | null;
  sent_by: string | null;
  paid: number;
  created_at: number;
  extras_json: string | null;
  due_cents: number | null;
  source: string | null;
  business: string | null;
  phone: string | null;
}

interface OrderExtras {
  extras: Array<{ name: string; qty: number; price: string }>;
  quotes: string[];
}

/** What's stored with a signature: the plan as it was, plus the billing choice. */
export type SignedPlan = Omit<Plan, "payLink" | "payLinkFlex" | "payLinkAnnual" | "payLinkShort"> & { billing?: string; billingLabel?: string; billingDetail?: string; monthlyEquivalent?: number };

export async function signupsFor(env: Env, leadId: string) {
  const rows = await env.DB.prepare("SELECT * FROM signups WHERE lead_id = ? ORDER BY created_at DESC").bind(leadId).all<SignupRow>();
  return rows.results.map((r) => ({
    id: r.id,
    plan: JSON.parse(r.plan_json) as SignedPlan,
    signerName: r.signer_name,
    signerTitle: r.signer_title,
    signerEmail: r.signer_email,
    sentBy: r.sent_by,
    paid: !!r.paid,
    createdAt: r.created_at,
    extras: r.extras_json ? (JSON.parse(r.extras_json) as OrderExtras) : null,
    dueCents: r.due_cents,
  }));
}

/** Extras an existing client picked from a "Buy extras" link. */
export async function purchasesFor(env: Env, leadId: string) {
  const rows = await env.DB.prepare("SELECT id, items_json, due_cents, paid, created_at FROM purchases WHERE lead_id = ? ORDER BY created_at DESC LIMIT 20")
    .bind(leadId)
    .all<{ id: string; items_json: string; due_cents: number; paid: number; created_at: number }>();
  return rows.results.map((r) => ({ id: r.id, ...(JSON.parse(r.items_json) as OrderExtras), dueCents: r.due_cents, paid: !!r.paid, createdAt: r.created_at }));
}

/** Orders placed with "Buy now" on the company website (not tied to a lead yet). */
export async function websiteOrders(env: Env) {
  const rows = await env.DB.prepare("SELECT * FROM signups WHERE lead_id = 'web' ORDER BY created_at DESC LIMIT 30").all<SignupRow>();
  return rows.results.map((r) => {
    const plan = JSON.parse(r.plan_json) as SignedPlan;
    const x = r.extras_json ? (JSON.parse(r.extras_json) as OrderExtras) : null;
    return {
      id: r.id,
      business: r.business,
      name: r.signer_name,
      phone: r.phone,
      email: r.signer_email,
      plan: `${plan.name} (${plan.billingLabel ?? ""})`,
      extras: x ? [...x.extras.map((e) => e.name), ...x.quotes.map((q) => `${q} (quote)`)] : [],
      dueCents: r.due_cents,
      paid: !!r.paid,
      createdAt: r.created_at,
    };
  });
}

function money(n: number): string {
  return `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
}

function payUrl(option: BillingOption, leadId: string, email: string | null): string | null {
  if (!option.payLink) return null;
  const u = new URL(option.payLink);
  // Stripe Payment Links read these; Square ignores them.
  u.searchParams.set("client_reference_id", leadId);
  if (email) u.searchParams.set("prefilled_email", email);
  return u.toString();
}

function payBlock(option: BillingOption, leadId: string, email: string | null, settings: { companyName?: string; companyPhone?: string }): string {
  const url = payUrl(option, leadId, email);
  if (url) {
    return `<p>Last step: set up your payment. It's handled securely by our payment provider and charged automatically (${escHtml(option.detail)}).</p>
<a class="btn" href="${escHtml(url)}" rel="noopener">Set up payment</a>`;
  }
  return `<p>We'll send you an invoice shortly for ${escHtml(option.detail)}${settings.companyPhone ? `. Questions? Call ${escHtml(settings.companyPhone)}` : ""}.</p>`;
}

/** Saves a signed order and, with online checkout set up, returns the Stripe URL to send them to. */
export async function saveOrder(
  env: Env,
  req: Request,
  o: {
    leadId: string;
    order: PricedOrder;
    picks: Pick[];
    terms: string;
    name: string;
    title?: string;
    email: string;
    sentBy?: string | null;
    source: "link" | "website";
    business?: string;
    phone?: string;
    successUrl: string;
    cancelUrl: string;
  },
): Promise<{ signupId: string; checkoutUrl: string | null; error?: string }> {
  const { plan, option } = o.order;
  const { payLink: _a, payLinkFlex: _b, payLinkAnnual: _c, payLinkShort: _d, ...rest } = plan!;
  const planSnapshot: SignedPlan = { ...rest, billing: option!.id, billingLabel: option!.label, billingDetail: option!.detail, monthlyEquivalent: option!.monthlyEquivalent };
  const signupId = newId();
  await env.DB.prepare(
    `INSERT INTO signups (id, lead_id, plan_json, terms, signer_name, signer_title, signer_email, sent_by, ip, user_agent, created_at, extras_json, due_cents, source, business, phone)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      signupId, o.leadId, JSON.stringify(planSnapshot), o.terms, o.name, o.title || null, o.email, o.sentBy ?? null,
      req.headers.get("cf-connecting-ip"), (req.headers.get("user-agent") ?? "").slice(0, 300), now(),
      JSON.stringify({ picks: o.picks, extras: o.order.extras, quotes: o.order.quotes, renews: o.order.renews }), o.order.dueToday, o.source, o.business ?? null, o.phone ?? null,
    )
    .run();
  if (!env.STRIPE_SECRET_KEY) return { signupId, checkoutUrl: null };
  try {
    const session = await createCheckout(
      env,
      checkoutParams({ order: o.order, successUrl: o.successUrl, cancelUrl: o.cancelUrl, clientReferenceId: o.leadId === "web" ? undefined : o.leadId, email: o.email, metadata: { kind: "signup", signupId, leadId: o.leadId } }),
    );
    await env.DB.prepare("UPDATE signups SET stripe_session = ? WHERE id = ?").bind(session.id, signupId).run();
    return { signupId, checkoutUrl: session.url };
  } catch (err) {
    console.error("checkout failed", err);
    return { signupId, checkoutUrl: null, error: (err as Error).message };
  }
}

/** One line per order for notes and notifications, e.g. "Plus (12-month plan) + Photo shoot, Spanish page". */
export function orderSummary(order: PricedOrder): string {
  const extras = [...order.extras.map((x) => (x.qty > 1 ? `${x.name} x${x.qty}` : x.name)), ...order.quotes.map((q) => `${q} (quote)`)];
  return `${order.plan ? `${order.plan.name} (${order.option!.label})` : ""}${extras.length ? `${order.plan ? " + " : ""}${extras.join(", ")}` : ""}`;
}

function orderLinesHtml(order: PricedOrder): string {
  return `<ul>${order.lines.map((l) => `<li>${escHtml(l.name)}${l.qty > 1 ? ` x${l.qty}` : ""}: ${dollars(l.amount * l.qty)}${l.interval ? ` per ${l.interval}` : " one-time"}</li>`).join("")}${order.quotes.map((q) => `<li>${escHtml(q)}: we'll call with a price</li>`).join("")}</ul>
<p><strong>Due today: ${dollars(order.dueToday)}</strong>${order.renews ? `<br><span class="small muted">Then ${dollars(order.renews.amount)} per ${order.renews.interval}, charged automatically.</span>` : ""}</p>`;
}

/** The page a business owner opens from a sign-up link: pick plan, way to pay and extras, sign, then pay. */
export async function serveSignup(env: Env, req: Request, leadId: string, planId: string, origin: string): Promise<Response> {
  const lead = await getLead(env, leadId);
  const settings = await getSettings(env);
  const brand = settings.companyName || "Website sign-up";
  const plan = settings.plans.find((p) => p.id === planId);
  if (!lead || lead.status === "expired" || !plan) {
    return page("Link not available", `<div class="wrap"><div class="card"><h1>This sign-up link isn't available</h1><p>Please ask us for a new one${settings.companyPhone ? ` at ${escHtml(settings.companyPhone)}` : ""}.</p></div></div>`, { brand, status: 410 });
  }
  const business = lead.name ?? "your business";
  const terms = settings.terms || defaultTerms(settings);
  const url = new URL(req.url);
  const here = `${origin}${url.pathname}`;

  if (req.method === "POST") {
    const form = await req.formData().catch(() => null);
    const name = String(form?.get("name") ?? "").trim().slice(0, 100);
    const title = String(form?.get("title") ?? "").trim().slice(0, 60);
    const email = String(form?.get("email") ?? "").trim().slice(0, 120);
    const agreed = form?.get("agree") === "yes";
    if (!name || !agreed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return page("Sign up", `<div class="wrap"><div class="card"><p>Please type your name and email and tick the box to agree. <a href="">Go back</a></p></div></div>`, { brand, status: 400 });
    }
    const picks = picksFromForm(form, settings.addons);
    const order = priceSignup(settings, String(form?.get("plan") ?? planId), String(form?.get("billing") ?? "standard"), picks);
    const sent = await env.DB.prepare("SELECT author FROM lead_notes WHERE lead_id = ? AND outcome = 'signup_sent' ORDER BY created_at DESC LIMIT 1").bind(leadId).first<{ author: string }>();
    const saved = await saveOrder(env, req, { leadId, order, picks, terms, name, title, email, sentBy: sent?.author, source: "link", successUrl: `${here}?paid=1`, cancelUrl: `${here}?canceled=1` });
    await env.DB.prepare("INSERT INTO lead_notes (id, lead_id, author, outcome, body, created_at) VALUES (?, ?, ?, 'signed', ?, ?)")
      .bind(newId(), leadId, name, `Signed up: ${orderSummary(order)}. Due today ${dollars(order.dueToday)}${title ? `. Signed as ${title}` : ""}. Email: ${email}`, now())
      .run();
    await notify(env, { kind: "signed", actorName: name, leadId, text: `✍️ ${name} signed ${lead.name} up: ${orderSummary(order)}${sent?.author ? `, from ${sent.author}'s link` : ""}` });
    await updateLead(env, leadId, { sales_status: lead.sales_status === "live" ? "live" : "sold", follow_up: null, last_contact: now() });
    if (saved.checkoutUrl) return Response.redirect(saved.checkoutUrl, 303);
    const option = order.option!;
    return page(
      "Thank you",
      `<div class="wrap"><div class="card"><h1>Thank you, ${escHtml(name.split(" ")[0]!)}!</h1>
<p class="ok">You're signed up for ${escHtml(business)}.</p>${orderLinesHtml(order)}
${order.extras.length || order.quotes.length || saved.error ? `<p>We'll send you an invoice shortly${settings.companyPhone ? `. Questions? Call ${escHtml(settings.companyPhone)}` : ""}.</p>` : payBlock(option, leadId, email, settings)}
<p class="small muted" style="margin-top:16px">Next, we'll go over your photos, hours and details with you before anything goes live.</p></div></div>`,
      { brand },
    );
  }

  const already = await env.DB.prepare("SELECT signer_name, paid, created_at FROM signups WHERE lead_id = ? ORDER BY created_at DESC LIMIT 1")
    .bind(leadId)
    .first<{ signer_name: string; paid: number; created_at: number }>();
  const paidNow = url.searchParams.get("paid") === "1";
  const canceled = url.searchParams.get("canceled") === "1";
  const preview = lead.status === "ready" ? `${origin}/s/${await shareToken(env, leadId, 30)}/` : null;
  const signedOn = already ? new Date(already.created_at).toLocaleDateString("en-US", { timeZone: "America/Chicago", month: "long", day: "numeric", year: "numeric" }) : "";
  const body = `<div class="wrap">
${paidNow ? `<div class="card"><h1>You're all set! 🎉</h1><p class="ok">Thanks for your payment. You'll get a receipt by email from our payment provider.</p><p>Next, we'll go over your photos, hours and details with you before anything goes live.</p></div>` : ""}
${canceled ? `<div class="card"><p><strong>Your payment wasn't finished.</strong> Nothing was charged. You can pick again and continue below, or call us${settings.companyPhone ? ` at ${escHtml(settings.companyPhone)}` : ""}.</p></div>` : ""}
<div class="card"><p class="muted small" style="margin:0">Website plan for</p><h1>${escHtml(business)}</h1>
${preview ? `<a class="btn btn--ghost" href="${escHtml(preview)}" target="_blank" rel="noopener">See your website preview</a>` : ""}</div>
${already && !paidNow ? `<div class="card"><p class="ok">Signed by ${escHtml(already.signer_name)} on ${signedOn}${already.paid ? ", and paid. Thank you!" : "."}</p></div>` : ""}
${paidNow ? "" : `<form class="card" method="post"><h2>${already ? "Sign again" : "Sign up"}</h2>
${pickerHtml(settings, { planId, esc: escHtml })}
<details><summary><strong>Read the agreement</strong></summary><div class="terms">${escHtml(terms)}</div></details>
<label>Your full name<input type="text" name="name" autocomplete="name" required maxlength="100"></label>
<label>Your title <span class="muted small" style="font-weight:400">(optional)</span><input type="text" name="title" placeholder="Owner" maxlength="60"></label>
<label>Email for receipts<input type="email" name="email" autocomplete="email" required maxlength="120"></label>
<label class="check"><input type="checkbox" name="agree" value="yes" required> I'm authorized to sign for ${escHtml(business)}, and I agree to the plan and agreement. Typing my name counts as my signature.</label>
<p class="small muted">See also our <a href="https://undergroundassociates.com/terms#refunds" target="_blank" rel="noopener">cancellation &amp; refund policy</a> and <a href="https://undergroundassociates.com/privacy" target="_blank" rel="noopener">privacy policy</a>.</p>
<button class="btn" type="submit">${env.STRIPE_SECRET_KEY ? "Sign and continue to payment" : "Accept and continue"}</button>
${env.STRIPE_SECRET_KEY ? `<p class="small muted">Payment is handled securely by Stripe. We never see your card number.</p>` : ""}
<p class="small muted" style="margin-bottom:0">${escHtml(settings.legalName || settings.companyName || "")}${settings.companyPhone ? ` · ${escHtml(settings.companyPhone)}` : ""}${settings.companyEmail ? ` · ${escHtml(settings.companyEmail)}` : ""}</p>
</form>`}</div>`;
  return page(`Sign up: ${business}`, body, { brand });
}

/** "Buy extras" page for an existing client (from a link the team texts them). */
export async function serveExtras(env: Env, req: Request, leadId: string, origin: string): Promise<Response> {
  const lead = await getLead(env, leadId);
  const settings = await getSettings(env);
  const brand = settings.companyName || "Extras";
  const buyable = settings.addons.map((a, i) => ({ a, i }));
  if (!lead || lead.status === "expired" || !["sold", "live"].includes(lead.sales_status)) {
    return page("Link not available", `<div class="wrap"><div class="card"><h1>This link isn't available</h1><p>Please ask us for a new one${settings.companyPhone ? ` at ${escHtml(settings.companyPhone)}` : ""}.</p></div></div>`, { brand, status: 410 });
  }
  const url = new URL(req.url);
  const here = `${origin}${url.pathname}`;
  if (req.method === "POST") {
    const form = await req.formData().catch(() => null);
    const picks = picksFromForm(form, settings.addons);
    const order = priceExtras(settings, picks);
    if (!picks.length) return Response.redirect(`${here}?none=1`, 303);
    const purchaseId = newId();
    const last = await env.DB.prepare("SELECT stripe_customer, signer_email FROM signups WHERE lead_id = ? ORDER BY paid DESC, created_at DESC LIMIT 1")
      .bind(leadId)
      .first<{ stripe_customer: string | null; signer_email: string | null }>();
    await env.DB.prepare("INSERT INTO purchases (id, lead_id, items_json, due_cents, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind(purchaseId, leadId, JSON.stringify({ picks, extras: order.extras, quotes: order.quotes, renews: order.renews }), order.dueToday, now())
      .run();
    await notify(env, { kind: "signed", actorName: lead.name ?? "A client", leadId, text: `🛒 ${lead.name} picked extras: ${orderSummary(order)}${order.dueToday ? ` (${dollars(order.dueToday)} due)` : ""}` });
    if (order.lines.length && env.STRIPE_SECRET_KEY) {
      try {
        const session = await createCheckout(
          env,
          checkoutParams({ order, successUrl: `${here}?paid=1`, cancelUrl: `${here}?canceled=1`, clientReferenceId: leadId, customer: last?.stripe_customer, email: last?.signer_email ?? undefined, metadata: { kind: "extras", purchaseId, leadId } }),
        );
        await env.DB.prepare("UPDATE purchases SET stripe_session = ? WHERE id = ?").bind(session.id, purchaseId).run();
        return Response.redirect(session.url, 303);
      } catch (err) {
        console.error("extras checkout failed", err);
      }
    }
    return page("Thank you", `<div class="wrap"><div class="card"><h1>Thank you!</h1><p class="ok">We got your request for ${escHtml(lead.name ?? "your business")}.</p>${orderLinesHtml(order)}<p>We'll be in touch shortly${order.lines.length ? " with an invoice" : " with a price"}.</p></div></div>`, { brand });
  }
  const paidNow = url.searchParams.get("paid") === "1";
  const body = `<div class="wrap">
${paidNow ? `<div class="card"><h1>Thank you! 🎉</h1><p class="ok">Your payment went through. We'll get started and keep you posted.</p></div>` : ""}
${url.searchParams.get("canceled") === "1" ? `<div class="card"><p><strong>Your payment wasn't finished.</strong> Nothing was charged.</p></div>` : ""}
${url.searchParams.get("none") === "1" ? `<div class="card"><p><strong>Tick at least one extra</strong> to continue.</p></div>` : ""}
<div class="card"><p class="muted small" style="margin:0">Extras for</p><h1>${escHtml(lead.name ?? "your website")}</h1><p>Pick what you'd like to add. Monthly extras are billed monthly; everything else is a one-time charge.</p></div>
${paidNow ? "" : `<form class="card" method="post">
<style>.opt{display:flex;gap:10px;align-items:flex-start;border:1px solid #d5d9e2;border-radius:12px;padding:12px;margin:0 0 8px}.opt input{margin-top:4px;width:20px;height:20px;flex:none}.opt small{display:block;color:#545b68}.qty{width:64px;margin-left:auto;flex:none}</style>
${buyable.map(({ a, i }) => `<label class="opt"><input type="checkbox" name="x_${i}"><span><strong>${escHtml(a.name)}</strong> · ${escHtml(addonPrice(a))}${a.about ? `<small>${escHtml(a.about)}</small>` : ""}${a.unit === "quote" ? "<small>We'll call you with a price.</small>" : ""}</span>${a.unit === "each" ? `<input class="qty" type="number" name="q_${i}" min="1" max="20" value="1" aria-label="How many">` : ""}</label>`).join("")}
<button class="btn" type="submit">${env.STRIPE_SECRET_KEY ? "Continue to payment" : "Send my request"}</button>
${env.STRIPE_SECRET_KEY ? `<p class="small muted">Payment is handled securely by Stripe. Questions? ${settings.companyPhone ? `Call ${escHtml(settings.companyPhone)}.` : "Just ask."}</p>` : ""}
</form>`}</div>`;
  return page(`Extras: ${lead.name ?? ""}`, body, { brand });
}
