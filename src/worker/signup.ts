import { notify } from "./notify.ts";
import { shareToken } from "./auth.ts";
import { checkoutParams, createCheckout, dollars, INVOICE_BILLING, pickerHtml, picksFromForm, priceExtras, priceSignup, type Pick, type PricedOrder } from "./checkout.ts";
import { addonPrice, billingOptions, defaultTerms, getLead, getSettings, GO_LIVE_TEXT, updateLead, type BillingOption, type Plan } from "./db.ts";
import { HttpError, localDate, newId, now, type Env } from "./env.ts";
import { escHtml, page } from "./page.ts";
import { agreementToken, verifyAgreement } from "./auth.ts";
import { contractSectionsHtml, contractText, paymentAuthText } from "./contract.ts";
import { dataUrlBytes, pdfBytes, pdfResponse, pngToPdfImage } from "./pdf.ts";
import { esignHtml, readSignature } from "./esign.ts";
import { tapStatus } from "./tap.ts";

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
    signature: string;
    title?: string;
    email: string;
    sentBy?: string | null;
    source: "link" | "website";
    business?: string;
    phone?: string;
    successUrl: string;
    cancelUrl: string;
  },
): Promise<{ signupId: string; agreementUrl: string; checkoutUrl: string | null; error?: string }> {
  const { plan, option } = o.order;
  const invoice = !!o.order.invoice;
  const { payLink: _a, payLinkFlex: _b, payLinkAnnual: _c, payLinkShort: _d, ...rest } = plan!;
  const planSnapshot: SignedPlan = {
    ...rest,
    billing: option!.id,
    billingLabel: invoice ? `${option!.label}, invoiced` : option!.label,
    billingDetail: invoice ? `${option!.detail} · paid by check or bank transfer against our invoice` : option!.detail,
    monthlyEquivalent: option!.monthlyEquivalent,
  };
  const signupId = newId();
  await env.DB.prepare(
    `INSERT INTO signups (id, lead_id, plan_json, terms, signer_name, signer_title, signer_email, sent_by, ip, user_agent, created_at, extras_json, due_cents, source, business, phone, signature)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      signupId, o.leadId, JSON.stringify(planSnapshot), o.terms, o.name, o.title || null, o.email, o.sentBy ?? null,
      req.headers.get("cf-connecting-ip"), (req.headers.get("user-agent") ?? "").slice(0, 300), now(),
      JSON.stringify({ picks: o.picks, extras: o.order.extras, quotes: o.order.quotes, renews: o.order.renews, ...(invoice ? { billing: INVOICE_BILLING, invoice: true } : {}) }),
      o.order.dueToday, o.source, o.business ?? null, o.phone ?? null, o.signature,
    )
    .run();
  const agreementUrl = `${new URL(o.successUrl).origin}/agreement/${await agreementToken(env, "s", signupId)}`;
  // Invoice orders are billed by hand (the owner sends a Stripe invoice); nothing is charged online.
  if (!env.STRIPE_SECRET_KEY || invoice) return { signupId, agreementUrl, checkoutUrl: null };
  const success = new URL(o.successUrl);
  success.searchParams.set("a", agreementUrl.split("/agreement/")[1]!);
  try {
    const session = await createCheckout(
      env,
      checkoutParams({ order: o.order, successUrl: success.toString(), cancelUrl: o.cancelUrl, clientReferenceId: o.leadId === "web" ? undefined : o.leadId, email: o.email, metadata: { kind: "signup", signupId, leadId: o.leadId } }),
    );
    await env.DB.prepare("UPDATE signups SET stripe_session = ? WHERE id = ?").bind(session.id, signupId).run();
    return { signupId, agreementUrl, checkoutUrl: session.url };
  } catch (err) {
    console.error("checkout failed", err);
    return { signupId, agreementUrl, checkoutUrl: null, error: (err as Error).message };
  }
}

/** One line per order for notes and notifications, e.g. "Plus (12-month plan) + Photo shoot, Spanish page". */
export function orderSummary(order: PricedOrder): string {
  const extras = [...order.extras.map((x) => (x.qty > 1 ? `${x.name} x${x.qty}` : x.name)), ...order.quotes.map((q) => `${q} (quote)`)];
  return `${order.plan ? `${order.plan.name} (${order.option!.label})` : ""}${extras.length ? `${order.plan ? " + " : ""}${extras.join(", ")}` : ""}`;
}

function orderLinesHtml(order: PricedOrder): string {
  return `<ul>${order.lines.map((l) => `<li>${escHtml(l.name)}${l.qty > 1 ? ` x${l.qty}` : ""}: ${dollars(l.amount * l.qty)}${l.interval ? ` per ${l.interval}` : " one-time"}</li>`).join("")}${order.quotes.map((q) => `<li>${escHtml(q)}: we'll call with a price</li>`).join("")}</ul>
<p><strong>${order.invoice ? "On your first invoice" : "Due today"}: ${dollars(order.dueToday)}</strong>${order.renews ? `<br><span class="small muted">Then ${dollars(order.renews.amount)} per ${order.renews.interval}, ${order.invoice ? "invoiced" : "charged automatically"}.</span>` : ""}</p>`;
}

/** Shown on the paid page and the signed agreement, so clients know how to change their card or cancel. */
export function manageBillingHtml(settings: { companyPhone?: string }): string {
  return `<p class="small muted">To update your card or cancel, call us${settings.companyPhone ? ` at ${escHtml(settings.companyPhone)}` : ""} or use the billing link we send you.</p>`;
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
  const url = new URL(req.url);
  const here = `${origin}${url.pathname}`;
  // Pay by invoice: every client when Settings allows it (the default), always churches, or a link carrying ?invoice=1.
  const allowInvoice = settings.invoiceForAll !== false || lead.category === "church" || url.searchParams.get("invoice") === "1";
  const pricing = { category: lead.category, invoice: allowInvoice };

  if (req.method === "POST") {
    const form = await req.formData().catch(() => null);
    // Same honeypot as the website forms: a filled-in "website" field is a bot, dropped without a word.
    if (String(form?.get("website") ?? "").trim()) return page("Thank you", `<div class="wrap"><div class="card"><h1>Thank you</h1><p>We got it.</p></div></div>`, { brand });
    const signed = readSignature(form);
    const title = String(form?.get("title") ?? "").trim().slice(0, 60);
    const email = String(form?.get("email") ?? "").trim().slice(0, 120);
    if (!signed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return page("Sign up", `<div class="wrap"><div class="card"><p>Please add your email, then open the agreement and sign it with your full name and signature. <a href="">Go back</a></p></div></div>`, { brand, status: 400 });
    }
    const name = signed.name;
    const picks = picksFromForm(form, settings.addons);
    let order: PricedOrder;
    try {
      order = priceSignup(settings, String(form?.get("plan") ?? planId), String(form?.get("billing") ?? "standard"), picks, pricing);
    } catch (err) {
      if (!(err instanceof HttpError)) throw err;
      return page("Sign up", `<div class="wrap"><div class="card"><p>${escHtml(err.message)}. <a href="">Go back</a> and pick again${settings.companyPhone ? `, or call us at ${escHtml(settings.companyPhone)}` : ""}.</p></div></div>`, { brand, status: err.status });
    }
    const terms = contractText(settings, order, { business, kind: "signup" });
    const sent = await env.DB.prepare("SELECT author FROM lead_notes WHERE lead_id = ? AND outcome = 'signup_sent' ORDER BY created_at DESC LIMIT 1").bind(leadId).first<{ author: string }>();
    const saved = await saveOrder(env, req, { leadId, order, picks, terms, name, signature: signed.signature, title, email, sentBy: sent?.author, source: "link", successUrl: `${here}?paid=1`, cancelUrl: `${here}?canceled=1` });
    await env.DB.prepare("INSERT INTO lead_notes (id, lead_id, author, outcome, body, created_at) VALUES (?, ?, ?, 'signed', ?, ?)")
      .bind(newId(), leadId, name, `Signed up: ${orderSummary(order)}. ${order.invoice ? "On first invoice" : "Due today"} ${dollars(order.dueToday)}${title ? `. Signed as ${title}` : ""}. Email: ${email}`, now())
      .run();
    // The payment itself isn't done yet (Stripe confirms it through the webhook, which clears the callback and notes "Paid").
    await env.DB.prepare("INSERT INTO lead_notes (id, lead_id, author, outcome, body, created_at) VALUES (?, ?, 'Website', NULL, ?, ?)")
      .bind(newId(), leadId, order.invoice ? "Signed; wants an invoice (check or bank transfer)" : "Signed the agreement; payment not finished yet. If they don't pay today, call.", now())
      .run();
    await notify(env, { kind: "signed", actorName: name, leadId, text: `✍️ ${name} signed ${lead.name} up: ${orderSummary(order)}${order.invoice ? " (wants an invoice)" : ""}${sent?.author ? `, from ${sent.author}'s link` : ""}` });
    await updateLead(env, leadId, { sales_status: lead.sales_status === "live" ? "live" : "sold", follow_up: localDate(1), last_contact: now() });
    // Signed on the owner's Android phone with Tap to Pay set up (?tap=1 from the app): take the card right here instead
    // of sending them to Stripe's card form. The buttons call the owner's API with the owner's own login cookie.
    if (saved.checkoutUrl && !order.invoice && url.searchParams.get("tap") === "1" && (await tapStatus(env, settings)).ready) {
      return page(
        "Thank you",
        `<div class="wrap"><div class="card"><h1>Thank you, ${escHtml(name.split(" ")[0]!)}!</h1>
<p class="ok">You're signed up for ${escHtml(business)}.</p>${orderLinesHtml(order)}
<p>Last step: hand the phone back to <strong>${escHtml(settings.companyName || "us")}</strong> and tap your card on it. Due today: <strong>${escHtml(dollars(order.dueToday))}</strong>${order.renews ? `, then ${escHtml(dollars(order.renews.amount))} a ${order.renews.interval} on the same card` : ""}.</p>
<p id="tapdone" class="ok" hidden>✅ Paid. Your receipt goes to ${escHtml(email)}.</p>
<button class="btn" type="button" id="tapbtn">💳 Tap card now</button>
<p id="tapmsg" class="small muted" style="min-height:1.4em"></p>
<a class="btn btn--ghost" id="online" href="${escHtml(saved.checkoutUrl)}" rel="noopener">Pay online instead</a>
<p><a href="${escHtml(saved.agreementUrl)}" target="_blank" rel="noopener">📄 View or print your signed agreement</a></p>
<p><strong>${GO_LIVE_TEXT}</strong></p>
<script>(function(){var lead=${JSON.stringify(leadId)},signup=${JSON.stringify(saved.signupId)},b=document.getElementById("tapbtn"),msg=document.getElementById("tapmsg"),done=document.getElementById("tapdone"),timer=null,until=0;
function paid(){done.hidden=false;b.hidden=true;document.getElementById("online").hidden=true;msg.textContent="";clearInterval(timer);}
function check(){if(Date.now()>until){clearInterval(timer);return;}fetch("/api/leads/"+lead,{credentials:"same-origin"}).then(function(r){return r.ok?r.json():null;}).then(function(j){if(!j)return;var s=(j.signups||[]).filter(function(x){return x.id===signup;})[0];if(s&&s.paid)paid();}).catch(function(){});}
b.addEventListener("click",function(){b.disabled=true;msg.textContent="Opening Tap to Pay…";fetch("/api/leads/"+lead+"/tap",{method:"POST",headers:{"x-wb":"1","content-type":"application/json"},credentials:"same-origin",body:JSON.stringify({signupId:signup})}).then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error(j.error||"Couldn't start the payment");return j;});}).then(function(j){if(j.alreadyPaid){paid();return;}until=Date.now()+10*60*1000;clearInterval(timer);timer=setInterval(check,3000);msg.textContent="Tap the card on the back of the phone. This page updates when it's paid.";b.disabled=false;b.textContent="💳 Tap again";location.href=j.intentUrl;}).catch(function(e){msg.textContent=e.message+(/log in/i.test(e.message)?" (this button only works on the owner's phone)":"");b.disabled=false;});});
document.addEventListener("visibilitychange",function(){if(!document.hidden&&until)check();});})();</script></div></div>`,
        { brand },
      );
    }
    if (saved.checkoutUrl) return Response.redirect(saved.checkoutUrl, 303);
    const option = order.option!;
    return page(
      "Thank you",
      `<div class="wrap"><div class="card"><h1>Thank you, ${escHtml(name.split(" ")[0]!)}!</h1>
<p class="ok">You're signed up for ${escHtml(business)}.</p>${orderLinesHtml(order)}
${
  order.invoice
    ? `<p>We'll email an invoice to <strong>${escHtml(email)}</strong>; nothing is charged online. Pay it by check or bank transfer${settings.companyPhone ? `. Questions? Call ${escHtml(settings.companyPhone)}` : ""}.</p>`
    : order.extras.length || order.quotes.length || saved.error
      ? `<p>We'll send you an invoice shortly${settings.companyPhone ? `. Questions? Call ${escHtml(settings.companyPhone)}` : ""}.</p>`
      : payBlock(option, leadId, email, settings)
}
<p><a href="${escHtml(saved.agreementUrl)}" target="_blank" rel="noopener">📄 View or print your signed agreement</a></p>
<p><strong>${GO_LIVE_TEXT}</strong></p>
<p class="small muted" style="margin-top:16px">Next, we'll go over your photos, hours and details with you before anything goes live.</p></div></div>`,
      { brand },
    );
  }

  const already = await env.DB.prepare("SELECT id, signer_name, paid, created_at FROM signups WHERE lead_id = ? ORDER BY created_at DESC LIMIT 1")
    .bind(leadId)
    .first<{ id: string; signer_name: string; paid: number; created_at: number }>();
  const paidNow = url.searchParams.get("paid") === "1";
  const canceled = url.searchParams.get("canceled") === "1";
  if (canceled && already && !already.paid) {
    // Stripe sent them back from the card screen without paying: note it once per sign-up so the caller follows up.
    const marker = `Backed out at the card screen (sign-up ${already.id})`;
    const noted = await env.DB.prepare("SELECT id FROM lead_notes WHERE lead_id = ? AND body = ? LIMIT 1").bind(leadId, marker).first<{ id: string }>();
    if (!noted) {
      await env.DB.prepare("INSERT INTO lead_notes (id, lead_id, author, outcome, body, created_at) VALUES (?, ?, 'Website', NULL, ?, ?)").bind(newId(), leadId, marker, now()).run();
    }
  }
  const preview = lead.status === "ready" ? `${origin}/s/${await shareToken(env, leadId, 30)}/` : null;
  const signedOn = already ? new Date(already.created_at).toLocaleDateString("en-US", { timeZone: "America/Chicago", month: "long", day: "numeric", year: "numeric" }) : "";
  const body = `<div class="wrap">
${paidNow ? `<div class="card"><h1>You're all set! 🎉</h1><p class="ok">Thanks for your payment. You'll get a receipt by email from our payment provider.</p>${/^[sp][a-z0-9]+\.[A-Za-z0-9_-]+$/.test(url.searchParams.get("a") ?? "") ? `<p><a href="${origin}/agreement/${escHtml(url.searchParams.get("a")!)}" target="_blank" rel="noopener">📄 View or print your signed agreement</a></p>` : ""}<p><strong>${GO_LIVE_TEXT}</strong></p><p>Next, we'll go over your photos, hours and details with you before anything goes live.</p>${manageBillingHtml(settings)}</div>` : ""}
${canceled ? `<div class="card"><p><strong>Your payment wasn't finished.</strong> Nothing was charged. You can pick again and continue below, or call us${settings.companyPhone ? ` at ${escHtml(settings.companyPhone)}` : ""}.</p></div>` : ""}
<div class="card"><p class="muted small" style="margin:0">Website plan for</p><h1>${escHtml(business)}</h1>
${preview ? `<a class="btn btn--ghost" href="${escHtml(preview)}" target="_blank" rel="noopener">See your website preview</a>` : ""}</div>
${already && !paidNow ? `<div class="card"><p class="ok">Signed by ${escHtml(already.signer_name)} on ${signedOn}${already.paid ? ", and paid. Thank you!" : "."}</p></div>` : ""}
${paidNow ? "" : `<form class="card" method="post"><h2>${already ? "Sign again" : "Sign up"}</h2>
${pickerHtml(settings, { planId, esc: escHtml, showPlans: false, category: lead.category, invoice: allowInvoice, billing: /^(short|standard|flex|annual|invoice)$/.test(new URL(req.url).searchParams.get("billing") ?? "") ? new URL(req.url).searchParams.get("billing")! : undefined })}
<label>Your title <span class="muted small" style="font-weight:400">(optional)</span><input type="text" name="title" placeholder="Owner" maxlength="60"></label>
<label>Email for receipts<input type="email" name="email" autocomplete="email" required maxlength="120"></label>
<div style="position:absolute;left:-9999px" aria-hidden="true"><label>Leave this empty<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
${esignHtml({ sectionsHtml: contractSectionsHtml(settings, { business, kind: "signup", esc: escHtml }), esc: escHtml, title: "Your agreement" })}
<p class="small muted">See also our <a href="https://undergroundassociates.com/terms#refunds" target="_blank" rel="noopener">cancellation &amp; refund policy</a> and <a href="https://undergroundassociates.com/privacy" target="_blank" rel="noopener">privacy policy</a>.</p>
<p><strong>${GO_LIVE_TEXT}</strong></p>
<button class="btn" type="submit" id="pk-go" data-pay="${env.STRIPE_SECRET_KEY ? "Sign and continue to payment" : "Accept and continue"}" data-invoice="Sign and request an invoice">${env.STRIPE_SECRET_KEY ? "Sign and continue to payment" : "Accept and continue"}</button>
${env.STRIPE_SECRET_KEY ? `<p class="small muted">Payment is handled securely by Stripe. We never see your card number.</p>` : ""}
<p class="small muted" style="margin-bottom:0">${escHtml(settings.legalName || settings.companyName || "")}${settings.companyPhone ? ` · ${escHtml(settings.companyPhone)}` : ""}${settings.companyEmail ? ` · ${escHtml(settings.companyEmail)}` : ""}</p>
</form>`}</div>`;
  return page(`Sign up: ${business}`, body, { brand });
}

/** "Buy extras" page for an existing client (from a link the team texts them). */
export async function serveExtras(env: Env, req: Request, leadId: string, origin: string): Promise<Response> {
  const lead = await getLead(env, leadId);
  const real = await getSettings(env);
  // The "paytest" lead (made by hand to check payments end to end) offers only a $1 test item.
  const settings = lead?.place_id === "paytest" ? { ...real, addons: [{ name: "Payment test (refund afterwards)", price: 1, unit: "one-time" as const, about: "Checks that online payments reach the app." }] } : real;
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
    const signed = readSignature(form);
    if (!signed) return page("Extras", `<div class="wrap"><div class="card"><p>Please open the agreement and sign it with your full name and signature. <a href="">Go back</a></p></div></div>`, { brand, status: 400 });
    const purchaseId = newId();
    const agreementUrl = `${origin}/agreement/${await agreementToken(env, "p", purchaseId)}`;
    const last = await env.DB.prepare("SELECT stripe_customer, signer_email FROM signups WHERE lead_id = ? ORDER BY paid DESC, created_at DESC LIMIT 1")
      .bind(leadId)
      .first<{ stripe_customer: string | null; signer_email: string | null }>();
    await env.DB.prepare("INSERT INTO purchases (id, lead_id, items_json, due_cents, created_at, terms, signer_name, signer_email, signature, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(
        purchaseId, leadId, JSON.stringify({ picks, extras: order.extras, quotes: order.quotes, renews: order.renews }), order.dueToday, now(),
        contractText(settings, order, { business: lead.name ?? "your business", kind: "extras" }), signed.name, last?.signer_email ?? null, signed.signature,
        req.headers.get("cf-connecting-ip"), (req.headers.get("user-agent") ?? "").slice(0, 300),
      )
      .run();
    await notify(env, { kind: "signed", actorName: lead.name ?? "A client", leadId, text: `🛒 ${lead.name} picked extras: ${orderSummary(order)}${order.dueToday ? ` (${dollars(order.dueToday)} due)` : ""}` });
    if (order.lines.length && env.STRIPE_SECRET_KEY) {
      try {
        const session = await createCheckout(
          env,
          checkoutParams({ order, successUrl: `${here}?paid=1&a=${agreementUrl.split("/agreement/")[1]}`, cancelUrl: `${here}?canceled=1`, clientReferenceId: leadId, customer: last?.stripe_customer, email: last?.signer_email ?? undefined, metadata: { kind: "extras", purchaseId, leadId } }),
        );
        await env.DB.prepare("UPDATE purchases SET stripe_session = ? WHERE id = ?").bind(session.id, purchaseId).run();
        return Response.redirect(session.url, 303);
      } catch (err) {
        console.error("extras checkout failed", err);
      }
    }
    return page("Thank you", `<div class="wrap"><div class="card"><h1>Thank you!</h1><p class="ok">We got your request for ${escHtml(lead.name ?? "your business")}.</p>${orderLinesHtml(order)}<p>We'll be in touch shortly${order.lines.length ? " with an invoice" : " with a price"}.</p><p><a href="${escHtml(agreementUrl)}" target="_blank" rel="noopener">📄 View or print your signed agreement</a></p></div></div>`, { brand });
  }
  // Extras the client already ticked on the website's request form (?pick=3,7).
  const picked = new Set((url.searchParams.get("pick") ?? "").split(",").map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n < settings.addons.length));
  const paidNow = url.searchParams.get("paid") === "1";
  const body = `<div class="wrap">
${paidNow ? `<div class="card"><h1>Thank you! 🎉</h1><p class="ok">Your payment went through. We'll get started and keep you posted.</p>${/^[sp][a-z0-9]+\.[A-Za-z0-9_-]+$/.test(url.searchParams.get("a") ?? "") ? `<p><a href="${origin}/agreement/${escHtml(url.searchParams.get("a")!)}" target="_blank" rel="noopener">📄 View or print your signed agreement</a></p>` : ""}</div>` : ""}
${url.searchParams.get("canceled") === "1" ? `<div class="card"><p><strong>Your payment wasn't finished.</strong> Nothing was charged.</p></div>` : ""}
${url.searchParams.get("none") === "1" ? `<div class="card"><p><strong>Tick at least one extra</strong> to continue.</p></div>` : ""}
<div class="card"><p class="muted small" style="margin:0">Extras for</p><h1>${escHtml(lead.name ?? "your website")}</h1><p>Pick what you'd like to add. Monthly extras are billed monthly; everything else is a one-time charge.</p></div>
${paidNow ? "" : `<form class="card" method="post">
<style>.opt{display:flex;gap:10px;align-items:flex-start;border:1px solid #d5d9e2;border-radius:12px;padding:12px;margin:0 0 8px}.opt input{margin-top:4px;width:20px;height:20px;flex:none}.opt small{display:block;color:#545b68}.qty{width:64px;margin-left:auto;flex:none}</style>
${buyable.map(({ a, i }) => `<label class="opt"><input type="checkbox" name="x_${i}"${picked.has(i) ? " checked" : ""}><span><strong>${escHtml(a.name)}</strong> · <span class="pk-price">${escHtml(addonPrice(a))}</span>${a.about ? `<small>${escHtml(a.about)}</small>` : ""}${a.unit === "quote" ? "<small>We'll call you with a price.</small>" : ""}</span>${a.unit === "each" ? `<input class="qty" type="number" name="q_${i}" min="1" max="20" value="1" aria-label="How many">` : ""}</label>`).join("")}
${esignHtml({ sectionsHtml: contractSectionsHtml(settings, { business: lead.name ?? "your business", kind: "extras", esc: escHtml }), esc: escHtml, title: "Extras agreement" })}
<button class="btn" type="submit">${env.STRIPE_SECRET_KEY ? "Continue to payment" : "Send my request"}</button>
${env.STRIPE_SECRET_KEY ? `<p class="small muted">Payment is handled securely by Stripe. Questions? ${settings.companyPhone ? `Call ${escHtml(settings.companyPhone)}.` : "Just ask."}</p>` : ""}
</form>`}</div>`;
  return page(`Extras: ${lead.name ?? ""}`, body, { brand });
}

/** A signed agreement (sign-up or extras), for the client from their link or for the team from the app. */
interface SignedRow {
  terms: string | null;
  signer_name: string | null;
  signer_title: string | null;
  signer_email: string | null;
  signature: string | null;
  ip: string | null;
  created_at: number;
  paid: number;
  business: string | null;
}

/** A signed agreement by its token or id, or null. */
async function loadAgreement(env: Env, token: string, byId?: { kind: "s" | "p"; id: string }): Promise<{ ref: { kind: "s" | "p"; id: string }; row: SignedRow } | null> {
  const ref = byId ?? (await verifyAgreement(env, token));
  if (!ref) return null;
  const row =
    ref.kind === "s"
      ? await env.DB.prepare("SELECT s.terms, s.signer_name, s.signer_title, s.signer_email, s.signature, s.ip, s.created_at, s.paid, COALESCE(l.name, s.business) AS business FROM signups s LEFT JOIN leads l ON l.id = s.lead_id WHERE s.id = ?")
          .bind(ref.id)
          .first<SignedRow>()
      : await env.DB.prepare("SELECT p.terms, p.signer_name, NULL AS signer_title, p.signer_email, p.signature, p.ip, p.created_at, p.paid, l.name AS business FROM purchases p LEFT JOIN leads l ON l.id = p.lead_id WHERE p.id = ?")
          .bind(ref.id)
          .first<SignedRow>();
  return row && row.terms ? { ref, row } : null;
}

const signedWhen = (row: SignedRow) => new Date(row.created_at).toLocaleString("en-US", { timeZone: "America/Chicago", dateStyle: "long", timeStyle: "short" });

export async function agreementPage(env: Env, token: string, byId?: { kind: "s" | "p"; id: string }): Promise<Response> {
  const settings = await getSettings(env);
  const brand = settings.companyName || "Agreement";
  const found = await loadAgreement(env, token, byId);
  if (!found) return page("Not found", `<div class="wrap"><div class="card"><h1>Agreement not found</h1><p>Please ask us for a copy${settings.companyPhone ? ` at ${escHtml(settings.companyPhone)}` : ""}.</p></div></div>`, { brand, status: 404 });
  const { ref, row } = found;
  const when = signedWhen(row);
  const signature = row.signature && /^data:image\/png;base64,/.test(row.signature) ? `<img src="${row.signature}" alt="Signature of ${escHtml(row.signer_name ?? "")}" style="max-width:320px;width:100%;border:1px solid #e1e4ea;border-radius:8px;background:#fff">` : "";
  const pdfHref = byId ? `/api/agreements/${ref.kind}/${ref.id}.pdf` : `/agreement/${token}.pdf`;
  const body = `<div class="noprint bar" style="max-width:640px;margin:16px auto;padding:0 16px;display:flex;gap:10px;flex-wrap:wrap"><a class="btn" style="width:auto" href="${pdfHref}">Download PDF</a><button class="btn btn--ghost" style="width:auto" type="button" onclick="window.print()">Print</button></div>
<div class="wrap"><div class="card"><div class="terms" style="max-height:none;white-space:pre-line">${escHtml(row.terms)}</div>
<h2 style="margin-top:20px">Signed electronically</h2>
${signature}
<p><strong>${escHtml(row.signer_name ?? "")}</strong>${row.signer_title ? `, ${escHtml(row.signer_title)}` : ""}${row.business ? ` for ${escHtml(row.business)}` : ""}<br>
<span class="small muted">${when} Central${row.signer_email ? ` · ${escHtml(row.signer_email)}` : ""}${row.ip ? ` · IP ${escHtml(row.ip)}` : ""}</span></p>
<p class="small muted">Accepted for ${escHtml(settings.legalName || settings.companyName || "")}${row.paid ? " · Payment received" : ""}</p>
${ref.kind === "s" ? manageBillingHtml(settings) : ""}</div></div>`;
  return page(`Signed agreement${row.business ? `: ${row.business}` : ""}`, body, { brand, css: "@media print{.top{display:none}.card{border:0}}" });
}

/** The signed agreement as a PDF file (same access rules as the page). */
export async function agreementPdf(env: Env, token: string, byId?: { kind: "s" | "p"; id: string }): Promise<Response> {
  const found = await loadAgreement(env, token, byId);
  if (!found) return new Response("Agreement not found", { status: 404 });
  const settings = await getSettings(env);
  const { row } = found;
  const png = dataUrlBytes(row.signature);
  const image = png ? ((await pngToPdfImage(png).catch(() => null)) ?? undefined) : undefined;
  const lines = [
    `${row.signer_name ?? ""}${row.signer_title ? `, ${row.signer_title}` : ""}${row.business ? ` for ${row.business}` : ""}`,
    `Signed ${signedWhen(row)} Central${row.signer_email ? ` · ${row.signer_email}` : ""}${row.ip ? ` · IP ${row.ip}` : ""}`,
    `Accepted for ${settings.legalName || settings.companyName || ""}${row.paid ? " · Payment received" : ""}`,
  ];
  const doc = { title: row.terms!.split("\n")[0] || "Agreement", text: row.terms!.split("\n").slice(1).join("\n"), signature: { heading: "Signed electronically", image, lines }, footer: settings.companyName || "" };
  return pdfResponse(pdfBytes(doc, image), `agreement-${(row.business || "signed").toLowerCase().replace(/\s+/g, "-")}.pdf`);
}

/**
 * The agreement as it would read for a plan and way to pay, before anyone signs: for showing the business owner on
 * the phone ("here's what you'd be agreeing to"). Nothing is stored. Owner and callers (login cookie), any plan.
 */
interface PreviewQuery {
  leadId?: string;
  plan?: string;
  billing?: string;
}

async function previewData(env: Env, q: PreviewQuery) {
  const settings = await getSettings(env);
  const lead = q.leadId ? await getLead(env, q.leadId) : null;
  const record = lead?.record_json ? (JSON.parse(lead.record_json) as { name?: string }) : null;
  const business = record?.name || lead?.name || "your business";
  const plans = settings.plans.filter((p) => p.monthly);
  const plan = plans.find((p) => p.id === q.plan) ?? plans.find((p) => p.id === "plus") ?? plans[0];
  if (!plan) return { settings, business, plans, plan: undefined, options: [], option: undefined, terms: "" };
  const category = lead?.category ?? undefined;
  const options: Array<{ id: string; label: string }> = [...billingOptions(plan, settings, { category }), { id: INVOICE_BILLING, label: "Pay by invoice" }];
  const option = options.find((o) => o.id === q.billing) ?? options.find((o) => o.id === "standard") ?? options[0]!;
  const order = option.id === INVOICE_BILLING ? priceSignup(settings, plan.id, INVOICE_BILLING, [], { category, invoice: true }) : priceSignup(settings, plan.id, option.id, [], { category });
  const terms = contractText(settings, order, { business, kind: "signup" });
  return { settings, business, plans, plan, options, option, terms };
}

/**
 * The agreement as it would read for a plan and way to pay, before anyone signs: for showing the business owner on
 * the phone ("here's what you'd be agreeing to"). Nothing is stored. Owner and callers (login cookie), any plan.
 */
export async function contractPreviewPage(env: Env, q: PreviewQuery): Promise<Response> {
  const { settings, business, plans, plan, options, option, terms } = await previewData(env, q);
  const brand = settings.companyName || "Agreement";
  if (!plan || !option) return page("Agreement", `<div class="wrap"><div class="card"><h1>No plans set up yet</h1><p>Add plans in Settings first.</p></div></div>`, { brand, status: 404 });
  const qs = (planId: string, billing: string) => `${q.leadId ? `lead=${encodeURIComponent(q.leadId)}&` : ""}plan=${encodeURIComponent(planId)}&billing=${encodeURIComponent(billing)}`;
  const link = (planId: string, billing: string) => `/api/contract?${qs(planId, billing)}`;
  const pill = (href: string, label: string, on: boolean) =>
    `<a href="${href}" style="display:inline-block;width:auto;margin:0 8px 8px 0;padding:8px 14px;border-radius:999px;font-weight:700;font-size:.95rem;text-decoration:none;${
      on ? "background:#14213d;color:#fff;border:2px solid #14213d" : "background:#fff;color:#14213d;border:2px solid #c9d0dc"
    }"${on ? ' aria-current="true"' : ""}>${escHtml(label)}</a>`;
  const body = `<div class="wrap"><div class="card">
<p class="small" style="margin:0 0 12px;padding:10px 12px;border-radius:8px;background:#fff7e0;border:1px solid #f1d58a"><strong>Preview.</strong> This is the agreement ${escHtml(business)} would sign for the <strong>${escHtml(plan.name)}</strong> plan, paying <strong>${escHtml(option.label.toLowerCase())}</strong>. Nothing is signed or stored; extras are added at sign-up.</p>
<p class="small muted" style="margin:0 0 4px">Plan</p><p class="noprint">${plans.map((p) => pill(link(p.id, option.id), p.name, p.id === plan.id)).join("")}</p>
<p class="small muted" style="margin:0 0 4px">Way to pay</p><p class="noprint">${options.map((o) => pill(link(plan.id, o.id), o.label, o.id === option.id)).join("")}</p>
<div class="terms" style="max-height:none;white-space:pre-line">${escHtml(terms)}</div>
<p class="noprint" style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap">${
    q.leadId
      ? `<button class="btn" style="width:auto" type="button" id="signbtn">✍️ Sign this agreement</button>`
      : ""
  }<a class="btn btn--ghost" style="width:auto" href="/api/contract.pdf?${qs(plan.id, option.id)}">Download PDF</a><button class="btn btn--ghost" style="width:auto" type="button" onclick="window.print()">Print</button></p>
${
    q.leadId
      ? `<p class="small muted noprint">Sign opens ${escHtml(business)}'s own sign-up page: they confirm the plan and way to pay, read this agreement, sign with a finger and pay. The link is logged in their call log.</p>
<script>(function(){var b=document.getElementById("signbtn");if(!b)return;b.addEventListener("click",function(){b.disabled=true;b.textContent="Opening the sign-up page…";fetch("/api/leads/"+${JSON.stringify(q.leadId)}+"/signup",{method:"POST",headers:{"x-wb":"1","content-type":"application/json"},credentials:"same-origin",body:JSON.stringify({plan:${JSON.stringify(plan.id)}})}).then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error(j.error||"Could not open the sign-up page");return j;});}).then(function(j){location.href=j.url+"?billing="+encodeURIComponent(${JSON.stringify(option.id)})+(/Android/i.test(navigator.userAgent)?"&tap=1":"");}).catch(function(e){alert(e.message);b.disabled=false;b.textContent="✍️ Sign this agreement";});});})();</script>`
      : `<p class="small muted noprint">To sign: open the business's lead page in the app, tap <strong>Show them the plans</strong> and choose a plan. That opens their sign-up page with this agreement, a signature pad and payment.</p>`
  }
</div></div>`;
  return page(`Agreement preview: ${plan.name}`, body, { brand, css: "@media print{.top{display:none}.card{border:0}}" });
}

/** The unsigned agreement for a plan and way to pay as a PDF file, marked as a preview. */
export async function contractPreviewPdf(env: Env, q: PreviewQuery): Promise<Response> {
  const { settings, business, plan, option, terms } = await previewData(env, q);
  if (!plan || !option) return new Response("No plans set up yet", { status: 404 });
  const first = terms.split("\n")[0] || "Agreement";
  const doc = {
    title: first,
    notice: `Unsigned preview for ${business}: ${plan.name} plan, ${option.label.toLowerCase()}. Nothing is signed; extras are added at sign-up.`,
    text: terms.split("\n").slice(1).join("\n"),
    footer: `${settings.companyName || ""} · Preview, not signed`,
  };
  return pdfResponse(pdfBytes(doc), `agreement-preview-${plan.id}.pdf`);
}

/**
 * A blank recurring-payment authorization form (ACH debit or card) as a PDF, for clients who pay by invoice today or
 * want a paper authorization on file: the same words as the agreement's PAYMENT AUTHORIZATION section, then blanks to fill
 * by hand and sign. The bank or card details go on the paper (kept locked up) and into Stripe, never into the app.
 */
export async function achFormPdf(env: Env, q: { leadId?: string }): Promise<Response> {
  const settings = await getSettings(env);
  const lead = q.leadId ? await getLead(env, q.leadId) : null;
  const record = lead?.record_json ? (JSON.parse(lead.record_json) as { name?: string }) : null;
  const business = record?.name || lead?.name || "";
  const legal = settings.legalName || settings.companyName || "Underground Associates LLC";
  const line = (label: string, width = 48) => `${label}: ${"_".repeat(Math.max(8, width - label.length))}`;
  const text = [
    `Between ${legal} ("we") and ${business || "_".repeat(40)} ("you").`,
    "",
    "WHAT YOU AUTHORIZE",
    paymentAuthText(settings),
    "",
    "PAYMENT METHOD (tick one)",
    "[  ] Bank account (ACH debit)        [  ] Debit or credit card",
    "",
    "BANK ACCOUNT",
    line("Bank name"),
    line("Routing number (9 digits)"),
    line("Account number"),
    "Account type:  [  ] Checking   [  ] Savings   [  ] Business checking",
    line("Name on the account"),
    "",
    "CARD",
    line("Name on the card"),
    line("Card number"),
    line("Expires (MM/YY)", 30) + "    " + line("Billing ZIP", 24),
    "",
    "WHAT WE CHARGE",
    line("Plan and monthly or yearly amount"),
    line("Billing day (e.g. the 1st, or the day you sign)"),
    "Plus extras you approve and amounts owed under your agreement (late, reinstatement, early cancellation, returned-payment fees).",
    "",
    "SIGNATURE",
    line("Signed (your signature)"),
    line("Printed name and title"),
    line("Phone and email for notices"),
    line("Date", 30),
    "",
    "Keep the signed paper copy in a locked place; enter card or bank details only into Stripe. Clients may revoke by text or email at least 3 business days before the next charge.",
  ].join("\n");
  const doc = { title: "Recurring Payment Authorization", notice: "ACH bank debit or debit/credit card. Not legal advice: have a lawyer review once.", text, footer: settings.companyName || legal };
  return pdfResponse(pdfBytes(doc), `payment-authorization${business ? `-${business.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : ""}.pdf`);
}
