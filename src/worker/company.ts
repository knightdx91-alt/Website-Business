import { notify } from "./notify.ts";
import { addonPrice, billingOptions, defaultTerms, getSettings, GO_LIVE_TEXT, lateFeeOf, payoffDiscountOf, type AppSettings } from "./db.ts";
import { dollars, pickerHtml, picksFromForm, priceSignup, type PricedOrder } from "./checkout.ts";
import { agreementPage, agreementPdf, manageBillingHtml, orderSummary, saveOrder } from "./signup.ts";
import { contractSectionsHtml, contractText } from "./contract.ts";
import { esignHtml, readSignature } from "./esign.ts";
import { extrasToken } from "./auth.ts";
import { mailReady, maskEmail, sendEmail } from "./mail.ts";
import { HttpError, newId, now, type Env } from "./env.ts";
import { escHtml as e } from "./page.ts";
import { SEARCH_GROUPS } from "../places/queries.ts";
import { EXAMPLES } from "../examples/examples.ts";
import { LAYOUTS } from "../generator/layouts.ts";
import { LOOKS, parseDesign } from "../generator/themes.ts";

/** Underground Associates' own website, served on the company domain from live Settings (prices, phone, email). */
export const COMPANY_HOSTS = ["undergroundassociates.com", "www.undergroundassociates.com"];
const ORIGIN = "https://undergroundassociates.com";
export const COMPANY_ORIGIN = ORIGIN;
/** Year Underground Associates LLC started, for the copyright line. */
const FOUNDED = 2021;

/** Shown on the Terms and Privacy pages; bump when either changes (last: minimum-term, renewal, late-payment and church-rate lines). */
const POLICIES_UPDATED = "October 10, 2026";

/** Contact form posts land in the app inbox under this pseudo lead id. */
export const COMPANY_LEAD_ID = "company";

/** Every kind of business the app searches for and builds sites for, so the list grows with new search groups. */
const CATEGORIES = SEARCH_GROUPS.map((g) => g.label);

/** The short list on the Get started form: one entry per template pack, in plain words. */
const BUSINESS_TYPES = [
  "Restaurant, cafe or food truck",
  "Contractor or home services",
  "Salon, barber or spa",
  "Auto repair, body shop or towing",
  "Landscaping or lawn care",
  "Cleaning or pressure washing",
  "Print, sign or shirt shop",
  "Shop or boutique",
  "Tax, accounting or insurance",
  "Church or nonprofit",
];

/** One line under the example sites, so nobody mistakes them for client work. */
const EXAMPLES_NOTE = "These are example sites we built to show the styles. Your preview will be built for your business, free.";

const INCLUDED: Array<[string, string]> = [
  ["Made for phones", "Most of your customers find you on a phone. Every page is built for a small screen first."],
  ["Tap to call and get directions", "Big buttons on every page, so customers reach you in one tap."],
  ["Your hours, open or closed", "Shows whether you're open right now, in Cullman time."],
  ["Found on Google", "Set up so Google understands what you do and where, with your Google listing linked up."],
  ["Requests while you work", "Quote and booking requests come to you even when you can't pick up the phone."],
  ["Hosting, security and updates", "Fast, secure hosting included. Need your hours or a photo changed? Just ask."],
];

function money(n: number): string {
  return `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
}

function telHref(phone: string): string {
  const d = phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return `tel:+1${d}`;
}

/** "6-month or 12-month" (the commitments that come with no setup fee). */
function commitText(s: AppSettings): string {
  const min = s.minMonths ?? 12;
  const short = s.shortMonths ?? 6;
  return short && short < min ? `${short}-month or ${min}-month` : `${min}-month`;
}

function faq(s: AppSettings): Array<[string, string]> {
  const min = s.minMonths ?? 12;
  return [
    ["Do I have to pay before I see it?", "No. We build a preview of your website first, for free. You look it over on your phone, and you only pay if you want it to go live."],
    ["What if I already have a Facebook page?", "Keep it. Your website links to it. A website gives customers who don't use Facebook a simple place to find your hours, number and services, and it helps you show up on Google."],
    [
      "Is there a contract?",
      min
        ? `Pick a ${commitText(s)} plan with no setup fee; after that, cancel any time with 30 days' notice.${s.flexSetup ? ` Rather not commit? Month to month is available with a one-time ${money(s.flexSetup)} setup fee.` : ""}${s.annualMonthsFree ? ` Paying for a year up front gets you ${s.annualMonthsFree} months free: 12 months for the price of ${12 - s.annualMonthsFree}.` : ""}`
        : "No. Cancel any time with 30 days' notice.",
    ],
    ["Who owns my content?", "You do. Your business name, logo, photos and text belong to you. If you have your own web address, it stays in your name."],
    ["Can you use my own photos?", "Yes, and we recommend it. Send us photos of your place, your work and your team and we'll put them in."],
    ["Can you help with my Google listing?", "Yes. Our Plus and Pro plans include a Google Business Profile tune-up, and Pro includes monthly posts and photo updates."],
    ["Can I get an email at my own web address?", "Yes, with Pro. You get an address like info@yourbusiness.com that forwards free to the email you already use. Want a full mailbox you can send from too? We set up Google's for you, and Google bills you directly. We don't mark it up."],
    ["Where are you?", "We're based in Cullman, Alabama, and we work with businesses across Cullman County and the towns around it. We're happy to stop by."],
  ];
}

export async function serveCompany(env: Env, req: Request, url: URL): Promise<Response | null> {
  if (url.hostname === "www.undergroundassociates.com") return Response.redirect(`${ORIGIN}${url.pathname}${url.search}`, 301);
  const path = url.pathname;
  if (path === "/contact" && req.method === "POST") return contactPost(env, req);
  if (path === "/change") return changeRequest(env, req, url);
  if (path === "/start" && (req.method === "GET" || req.method === "POST")) return startOrder(env, req, url);
  if (path === "/start/thanks") return startThanks(env, url);
  if (path.startsWith("/agreement/") && req.method === "GET") {
    const tok = path.slice("/agreement/".length);
    return tok.endsWith(".pdf") ? agreementPdf(env, tok.slice(0, -4)) : agreementPage(env, tok);
  }
  if (path === "/portfolio" && req.method === "GET") return portfolio(env);
  if (path === "/extras" && (req.method === "GET" || req.method === "POST")) return extrasRequest(env, req, url);
  if (path === "/robots.txt") return new Response(`User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`, { headers: { "content-type": "text/plain" } });
  if (path === "/sitemap.xml") {
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${ORIGIN}/</loc></url><url><loc>${ORIGIN}/portfolio</loc></url><url><loc>${ORIGIN}/terms</loc></url><url><loc>${ORIGIN}/privacy</loc></url></urlset>\n`, { headers: { "content-type": "application/xml" } });
  }
  // Fonts and icons come from the app's static assets.
  if (path.startsWith("/fonts/") || path.startsWith("/icons/") || path.startsWith("/brand/") || path === "/og.png") return null;
  if (path === "/owner.jpg" && req.method === "GET") {
    // The owner's photo, when app/public/owner.jpg exists; the assets fallback page is not it.
    const res = await env.ASSETS.fetch(req);
    return res.ok && /^image\//.test(res.headers.get("content-type") ?? "") ? res : new Response("Not found", { status: 404 });
  }
  if (path === "/examples/form" && req.method === "POST") {
    return new Response(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Example site</title><body style="font:17px/1.5 system-ui;max-width:560px;margin:40px auto;padding:0 20px"><h1>This is an example site</h1><p>Forms on example sites don't send anywhere. On your real site, requests go straight to you.</p><p><a href="${ORIGIN}/#contact">Get a free preview of your own site</a></p>`, { headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex" } });
  }
  if (path.startsWith("/examples/") && req.method === "GET") {
    // Made-up businesses: viewable, never indexed.
    const res = await env.ASSETS.fetch(req);
    const headers = new Headers(res.headers);
    headers.set("x-robots-tag", "noindex");
    return new Response(res.body, { status: res.status, headers });
  }
  if (path === "/refunds" || path === "/refund-policy") return Response.redirect(`${ORIGIN}/terms#refunds`, 301);
  if ((path === "/terms" || path === "/privacy") && req.method === "GET") return policyPage(env, path === "/terms" ? "terms" : "privacy");
  if (path !== "/" || req.method !== "GET") return new Response(null, { status: 302, headers: { location: "/" } });
  return home(env, url);
}

/** "Request a change" from a client's live site footer: a short form that lands in the app inbox under that lead. */
async function changeRequest(env: Env, req: Request, url: URL): Promise<Response> {
  const leadId = /^[a-z0-9]{6,40}$/.test(url.searchParams.get("b") ?? "") ? url.searchParams.get("b")! : null;
  const lead = leadId ? await env.DB.prepare("SELECT id, name FROM leads WHERE id = ? AND sales_status IN ('sold', 'live')").bind(leadId).first<{ id: string; name: string | null }>() : null;
  const s = await getSettings(env);
  const name = s.companyName || "Underground Associates";
  let note = "";
  if (req.method === "POST" && lead) {
    const form = await req.formData().catch(() => null);
    const field = (k: string, max = 200) => String(form?.get(k) ?? "").trim().slice(0, max);
    const ip = req.headers.get("cf-connecting-ip") ?? "";
    const recent = await env.DB.prepare("SELECT COUNT(*) AS n FROM submissions WHERE lead_id = ? AND ip = ? AND created_at > ?").bind(lead.id, ip, now() - 3_600_000).first<{ n: number }>();
    const data = { name: field("name"), phone: field("phone"), message: field("message", 2000), service: "Change request for their website" };
    if (field("website") || (recent?.n ?? 0) >= 5) note = `<p class="note" role="status">Thanks! We got it and will take care of it.</p>`;
    else if (!data.name || !data.message) note = `<p class="note note--warn" role="alert">Please add your name and what you'd like changed.</p>`;
    else {
      await env.DB.prepare("INSERT INTO submissions (id, lead_id, created_at, data_json, ip, unverified) VALUES (?, ?, ?, ?, ?, 1)").bind(newId(), lead.id, now(), JSON.stringify(data), ip).run();
      await notify(env, { kind: "message", actorName: data.name, leadId: lead.id, text: `✏️ Change request for ${lead.name ?? "a client"}'s website from ${data.name}: "${data.message.slice(0, 160)}"` });
      note = `<p class="note" role="status">Thanks! We got your request and will take care of it, usually within a day or two.</p>`;
    }
  }
  const body = lead
    ? `<h1>Request a change</h1><p>Need something updated on the ${e(lead.name ?? "")} website? Hours, prices, photos, a new special? Tell us here and we'll handle it.</p>${note}
<form method="post" class="form"><label>Your name<input name="name" autocomplete="name" required maxlength="200"></label>
<label>Best phone number <span class="opt">(optional)</span><input name="phone" type="tel" autocomplete="tel" maxlength="40"></label>
<label>What should we change?<textarea name="message" rows="5" required maxlength="2000"></textarea></label>
<div class="hp" aria-hidden="true"><label>Leave this empty<input name="website" tabindex="-1" autocomplete="off"></label></div>
<button class="btn" type="submit">Send request</button></form>
${s.companyPhone ? `<p class="direct">Or text or call <a href="${telHref(s.companyPhone)}">${e(s.companyPhone)}</a>. Photos are easiest to text.</p>` : ""}`
    : `<h1>Request a change</h1><p>This link doesn't match one of our client websites. ${s.companyPhone ? `Call or text <a href="${telHref(s.companyPhone)}">${e(s.companyPhone)}</a>` : `<a href="/#contact">Contact us</a>`} and we'll help.</p>`;
  const n = nonce();
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Request a change | ${e(name)}</title><meta name="robots" content="noindex"><meta name="theme-color" content="#14213d"><link rel="icon" href="/brand/logo-192.png" type="image/png">${gaTag(s.gaMeasurementId, n)}<style>${CSS}</style></head><body>
${header(name, s.companyPhone)}
<main id="main" class="sec sec--dark"><div class="wrap narrow">${body}</div></main>
${footer(s.legalName || name)}</body></html>`;
  return new Response(html, { status: lead ? 200 : 404, headers: { ...HEADERS, "cache-control": "no-store", "content-security-policy": csp(n, { ga: !!s.gaMeasurementId }) } });
}

/** Website "Buy now": pick a plan, way to pay and extras, give business details, sign, and pay online. */
async function startOrder(env: Env, req: Request, url: URL): Promise<Response> {
  const s = await getSettings(env);
  const name = s.companyName || "Underground Associates";
  const legal = s.legalName || name;
  const planId = url.searchParams.get("plan") ?? "plus";
  let note = url.searchParams.get("canceled") === "1" ? `<p class="note note--warn" role="status">Your payment wasn't finished, so nothing was charged. You can try again below.</p>` : "";
  if (req.method === "POST") {
    const form = await req.formData().catch(() => null);
    const field = (k: string, max = 200) => String(form?.get(k) ?? "").trim().slice(0, max);
    const d = { business: field("business", 120), name: field("name", 100), title: field("title", 60), phone: field("phone", 40), email: field("email", 120), town: field("town", 80), kind: field("kind", 80), web: field("web", 300), notes: field("notes", 1500) };
    if (field("website")) return Response.redirect(`${ORIGIN}/start/thanks`, 303);
    const signed = readSignature(form);
    if (!d.business || !d.name || !d.phone || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email) || !signed) {
      note = `<p class="note note--warn" role="alert">Please fill in your business name, your name, phone and email, then open the agreement and sign it.</p>`;
    } else {
      const picks = picksFromForm(form, s.addons);
      let order: PricedOrder;
      try {
        order = priceSignup(s, field("plan", 20) || planId, field("billing", 20) || "standard", picks);
      } catch (err) {
        if (!(err instanceof HttpError)) throw err;
        return policyShell(name, legal, "Get started", `<h1>Get started</h1><p class="note note--warn" role="alert">${e(err.message)}. <a href="/start">Pick a plan again</a>.</p>`, { phone: s.companyPhone, ga: s.gaMeasurementId, status: err.status });
      }
      const saved = await saveOrder(env, req, {
        leadId: "web",
        order,
        picks,
        terms: contractText(s, order, { business: d.business, kind: "signup" }),
        name: signed.name,
        signature: signed.signature,
        title: d.title,
        email: d.email,
        source: "website",
        business: d.business,
        phone: d.phone,
        successUrl: `${ORIGIN}/start/thanks?paid=1`,
        cancelUrl: `${ORIGIN}/start?plan=${encodeURIComponent(order.plan!.id)}&canceled=1`,
      });
      const summary = orderSummary(order);
      const message = [`Order: ${summary}`, `Due today: ${dollars(order.dueToday)}${order.renews ? `, then ${dollars(order.renews.amount)}/${order.renews.interval}` : ""}`, d.kind && `Type: ${d.kind}`, d.town && `Town: ${d.town}`, d.web && `Current site/Facebook: ${d.web}`, d.notes && `Notes: ${d.notes}`]
        .filter(Boolean)
        .join("\n");
      await env.DB.prepare("INSERT INTO submissions (id, lead_id, created_at, data_json, ip, unverified) VALUES (?, ?, ?, ?, ?, 1)")
        .bind(newId(), COMPANY_LEAD_ID, now(), JSON.stringify({ name: d.name, phone: d.phone, email: d.email, service: `🛒 Website order: ${d.business}`, message }), req.headers.get("cf-connecting-ip") ?? "")
        .run();
      await notify(env, { kind: "signed", actorName: d.name, text: `🛒 New website order: ${d.business} (${d.name}) · ${summary} · ${dollars(order.dueToday)} due${saved.checkoutUrl ? ", paying now" : ""}` });
      return Response.redirect(saved.checkoutUrl ?? `${ORIGIN}/start/thanks?a=${saved.agreementUrl.split("/agreement/")[1]}`, 303);
    }
  }
  const body = `<p class="note" style="margin:0 0 18px">Already a client? You don't need to sign up again. <a href="/extras">Add extras to your website here</a>.</p>
<h1>Get started</h1>
<p class="lead">Pick your plan and we'll start building your site. You'll still look it over and approve every detail before it goes live.</p>
${note}
<form method="post" class="form light">
${pickerHtml(s, { planId, esc: e, showPlans: false })}
<h2 style="font-size:1.3rem;margin-top:8px">About your business</h2>
<label>Business name<input name="business" required maxlength="120" autocomplete="organization"></label>
<label>What kind of business?<select name="kind" style="min-height:50px;border-radius:10px;border:2px solid #3b4a6b;padding:10px;font:inherit"><option value="">Choose one</option>${BUSINESS_TYPES.map((t) => `<option>${e(t)}</option>`).join("")}<option>Something else</option></select></label>
<label>Town<input name="town" maxlength="80" placeholder="Cullman"></label>
<label>Your current website or Facebook page <span class="opt">(optional)</span><input name="web" maxlength="300"></label>
<label>Your name<input name="name" required maxlength="100" autocomplete="name"></label>
<label>Your title <span class="opt">(optional)</span><input name="title" maxlength="60" placeholder="Owner"></label>
<label>Phone<input name="phone" type="tel" required maxlength="40" autocomplete="tel"></label>
<label>Email for receipts<input name="email" type="email" required maxlength="120" autocomplete="email"></label>
<label>Anything we should know? <span class="opt">(optional)</span><textarea name="notes" rows="3" maxlength="1500"></textarea></label>
<div class="hp" aria-hidden="true"><label>Leave this empty<input name="website" tabindex="-1" autocomplete="off"></label></div>
${esignHtml({ sectionsHtml: contractSectionsHtml(s, { business: "your business", kind: "signup", esc: e }), esc: e, businessField: "business", title: "Your agreement" })}
<p class="small muted">See our <a href="/terms#refunds">cancellation &amp; refund policy</a> and <a href="/privacy">privacy policy</a>.</p>
<p><strong>${GO_LIVE_TEXT}</strong></p>
<button class="btn" type="submit">${env.STRIPE_SECRET_KEY ? "Sign and continue to payment" : "Sign and send my order"}</button>
${env.STRIPE_SECRET_KEY ? `<p class="small muted">Payment is handled securely by Stripe. We never see your card number.</p>` : `<p class="small muted">We'll send you an invoice by email.</p>`}
</form>
<p class="small muted" style="margin-top:20px">Rather see it before you pay? <a href="/#contact">Get a free preview</a> instead.</p>`;
  return policyShell(name, legal, "Get started", body, { script: true, phone: s.companyPhone, ga: s.gaMeasurementId });
}

async function startThanks(env: Env, url: URL): Promise<Response> {
  const s = await getSettings(env);
  const a = url.searchParams.get("a") ?? "";
  const copy = /^[sp][a-z0-9]+\.[A-Za-z0-9_-]+$/.test(a) ? `<p><a href="/agreement/${e(a)}" target="_blank" rel="noopener">📄 View or print your signed agreement</a></p>` : "";
  const name = s.companyName || "Underground Associates";
  // Conversion for Google Ads: a paid order is a purchase (with what was due today), an unpaid signed order a sign_up.
  const paid = url.searchParams.get("paid") === "1";
  const signupId = a.startsWith("s") ? a.slice(1).split(".")[0]! : "";
  const due = paid && signupId ? await env.DB.prepare("SELECT due_cents FROM signups WHERE id = ?").bind(signupId).first<{ due_cents: number | null }>() : null;
  const gaEvents: GaEvent[] = paid
    ? [["purchase", { transaction_id: signupId || `web-${Date.now()}`, currency: "USD", ...(due?.due_cents != null ? { value: Math.round(due.due_cents) / 100 } : {}) }]]
    : [["sign_up", { method: "website" }]];
  const body = `<h1>Thank you! 🎉</h1><p class="lead">We got your order. ${s.companyPhone ? `We'll call you within one business day from ${e(s.companyPhone)}` : "We'll be in touch within one business day"} to get your photos, hours and details.</p>
<p>If you paid online, a receipt is on its way from our payment provider. Nothing goes live until you've approved your site.</p>
<p><strong>${GO_LIVE_TEXT}</strong></p>${copy}
${manageBillingHtml(s)}
<p><a class="btn" href="/">Back to the home page</a></p>`;
  return policyShell(name, s.legalName || name, "Thank you", body, { phone: s.companyPhone, ga: s.gaMeasurementId, gaEvents });
}

const digits = (t: string) => t.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");

/** Finds the client an extras request is from: same phone number, else the same business name, among sold/live clients. */
async function findClient(env: Env, phone: string, business: string): Promise<{ id: string; name: string } | null> {
  const rows = await env.DB.prepare("SELECT id, name, phone FROM leads WHERE sales_status IN ('sold', 'live') AND status != 'expired'").all<{ id: string; name: string | null; phone: string | null }>();
  const p = digits(phone);
  const norm = (t: string) => t.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").replace(/\b(llc|inc|the|co)\b/g, "").trim();
  const byPhone = p.length === 10 ? rows.results.find((r) => r.phone && digits(r.phone) === p) : undefined;
  const byName = norm(business) ? rows.results.find((r) => r.name && norm(r.name) === norm(business)) : undefined;
  const hit = byPhone ?? byName;
  return hit ? { id: hit.id, name: hit.name ?? business } : null;
}

/** "Already a client? Add extras": a request form. The team texts the client their own Buy extras link. */
async function extrasRequest(env: Env, req: Request, url: URL): Promise<Response> {
  const s = await getSettings(env);
  const name = s.companyName || "Underground Associates";
  if (url.searchParams.get("sent") === "1") {
    const to = url.searchParams.get("to");
    const lead = to
      ? `<p class="lead">We just emailed your personal link to the email we have on file for your business (<strong>${e(to)}</strong>). Open it to review the agreement for your extras, sign it and pay. It can take a minute to arrive; check your spam folder if you don't see it.</p>`
      : `<p class="lead">We'll send you a link within one business day where you can review the agreement for your extras, sign it and pay.</p>`;
    return policyShell(name, s.legalName || name, "Request sent", `<h1>Got it, thank you!</h1>${lead}<p>${s.companyPhone ? `Questions? Call or text <a href="${telHref(s.companyPhone)}">${e(s.companyPhone)}</a>.` : ""}</p><p><a class="btn" href="/">Back to the home page</a></p>`, { phone: s.companyPhone, ga: s.gaMeasurementId, gaEvents: [["generate_lead", { method: "extras_request" }]] });
  }
  let note = "";
  if (req.method === "POST") {
    const form = await req.formData().catch(() => null);
    const field = (k: string, max = 200) => String(form?.get(k) ?? "").trim().slice(0, max);
    const d = { business: field("business", 120), name: field("name", 100), phone: field("phone", 40), email: field("email", 120), notes: field("notes", 1500) };
    const wanted = s.addons.filter((_, i) => form?.get(`x_${i}`) === "on").map((a) => a.name);
    if (field("website")) return Response.redirect(`${ORIGIN}/extras?sent=1`, 303);
    const ip = req.headers.get("cf-connecting-ip") ?? "";
    const recent = await env.DB.prepare("SELECT COUNT(*) AS n FROM submissions WHERE ip = ? AND created_at > ?").bind(ip, now() - 3_600_000).first<{ n: number }>();
    if ((recent?.n ?? 0) >= 8) return Response.redirect(`${ORIGIN}/extras?sent=1`, 303);
    if (!d.business || !d.name || digits(d.phone).length !== 10 || (!wanted.length && !d.notes)) {
      note = `<p class="note note--warn" role="alert">Please add your business name, your name and a 10-digit phone number, and pick at least one extra (or tell us what you need).</p>`;
    } else {
      const client = await findClient(env, d.phone, d.business);
      const picks = s.addons.map((_, i) => i).filter((i) => form?.get(`x_${i}`) === "on");
      // Matched client with an email on file (from their sign-up): email their own Buy extras link right away.
      // It only ever goes to the address on file, so a stranger filling in the form can't reach the account.
      let emailedTo: string | null = null;
      if (client && mailReady(env) && s.companyEmail) {
        const onFile = await env.DB.prepare("SELECT signer_email FROM signups WHERE lead_id = ? AND signer_email IS NOT NULL ORDER BY paid DESC, created_at DESC LIMIT 1")
          .bind(client.id)
          .first<{ signer_email: string }>();
        const sentToday = await env.DB.prepare("SELECT COUNT(*) AS n FROM lead_notes WHERE lead_id = ? AND body LIKE 'Buy extras link emailed%' AND created_at > ?")
          .bind(client.id, now() - 86_400_000)
          .first<{ n: number }>();
        if (onFile?.signer_email && (sentToday?.n ?? 0) < 3) {
          const link = `${ORIGIN}/x/${await extrasToken(env, client.id)}${picks.length ? `?pick=${picks.join(",")}` : ""}`;
          const ok = await sendEmail(env, {
            from: s.companyEmail,
            fromName: name,
            to: onFile.signer_email,
            replyTo: s.companyEmail,
            subject: `Your link to add extras to the ${client.name} website`,
            text: [
              `Hi ${d.name.split(" ")[0]},`,
              "",
              `Here's your personal link to add extras to the ${client.name} website${wanted.length ? ` (${wanted.join(", ")})` : ""}:`,
              "",
              link,
              "",
              "Open it to review the agreement for your extras, sign it and pay. The link works for 30 days.",
              "",
              "If you didn't ask for this, you can ignore this email; nothing changes unless you sign.",
              "",
              `${name}${s.companyPhone ? `\n${s.companyPhone}` : ""}`,
            ].join("\n"),
          });
          if (ok) {
            emailedTo = onFile.signer_email;
            await env.DB.prepare("INSERT INTO lead_notes (id, lead_id, author, outcome, body, created_at) VALUES (?, ?, ?, NULL, ?, ?)")
              .bind(newId(), client.id, "Website", `Buy extras link emailed to ${onFile.signer_email} (requested on the website by ${d.name}: ${wanted.join(", ") || "see notes"})`, now())
              .run();
          }
        }
      }
      const message = [wanted.length ? `Wants: ${wanted.join(", ")}` : "", d.notes && `Notes: ${d.notes}`, emailedTo ? `Buy extras link emailed automatically to ${emailedTo}.` : "", client ? "" : `Not matched to a client automatically. Business given: ${d.business}`].filter(Boolean).join("\n");
      await env.DB.prepare("INSERT INTO submissions (id, lead_id, created_at, data_json, ip, unverified) VALUES (?, ?, ?, ?, ?, 1)")
        .bind(newId(), client?.id ?? COMPANY_LEAD_ID, now(), JSON.stringify({ name: d.name, phone: d.phone, email: d.email || undefined, service: `🛒 Extras request${client ? "" : `: ${d.business}`}`, message }), ip)
        .run();
      await notify(env, {
        kind: "message",
        actorName: d.name,
        leadId: client?.id ?? null,
        text: client
          ? `🛒 Extras request from ${client.name}: ${wanted.join(", ") || "see notes"}. ${emailedTo ? `Their Buy extras link was emailed to ${emailedTo}.` : "Open the client and text them their Buy extras link."}`
          : `🛒 Extras request from ${d.business} (not matched to a client): ${wanted.join(", ") || "see notes"}. Find them in your clients, then text their Buy extras link.`,
      });
      return Response.redirect(`${ORIGIN}/extras?sent=1${emailedTo ? `&to=${encodeURIComponent(maskEmail(emailedTo))}` : ""}`, 303);
    }
  }
  const body = `<p class="eyebrow" style="color:var(--goldtext)">Already a client?</p>
<h1>Add extras to your website</h1>
<p class="lead">Tell us what you'd like to add. We'll send a link made just for your account to the email we have on file for your business, where you can read the agreement for your extras, sign it and pay. You won't be signed up for a new plan.</p>
${note}
<form method="post" class="form light">
<fieldset style="border:0;padding:0;margin:0 0 6px"><legend style="font-weight:700;margin-bottom:8px">What would you like to add?</legend>
${s.addons.map((a, i) => `<label class="xopt"><input type="checkbox" name="x_${i}"><span><strong>${e(a.name)}</strong> · ${e(addonPrice(a))}${a.about ? `<small>${e(a.about)}</small>` : ""}</span></label>`).join("")}
</fieldset>
<label>Business name<input name="business" required maxlength="120" autocomplete="organization"></label>
<label>Your name<input name="name" required maxlength="100" autocomplete="name"></label>
<label>Phone <span class="opt">(the one on your account, if you can)</span><input name="phone" type="tel" required maxlength="40" autocomplete="tel"></label>
<label>Email <span class="opt">(optional)</span><input name="email" type="email" maxlength="120" autocomplete="email"></label>
<label>Anything else? <span class="opt">(optional)</span><textarea name="notes" rows="3" maxlength="1500"></textarea></label>
<div class="hp" aria-hidden="true"><label>Leave this empty<input name="website" tabindex="-1" autocomplete="off"></label></div>
<button class="btn" type="submit">Send my request</button>
</form>
<p class="small muted" style="margin-top:20px">Not a client yet? <a href="/start">Get started</a> or <a href="/#contact">get a free preview</a>.</p>`;
  return policyShell(name, s.legalName || name, "Add extras", body, { phone: s.companyPhone, ga: s.gaMeasurementId });
}

/** Simple light page in the company style (header, narrow column, footer). */
function policyShell(name: string, legal: string, title: string, body: string, o: { script?: boolean; wide?: boolean; phone?: string; description?: string; status?: number; from?: number | null; ga?: string; gaEvents?: GaEvent[] }): Response {
  const n = nonce();
  const meta = o.description
    ? `<meta name="description" content="${e(o.description)}"><link rel="canonical" href="${ORIGIN}/portfolio"><meta property="og:image" content="${ORIGIN}/og.png">`
    : `<meta name="robots" content="noindex">`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${e(title)} | ${e(name)}</title>${meta}<meta name="theme-color" content="#14213d"><link rel="icon" href="/brand/logo-192.png" type="image/png">${gaTag(o.ga, n, o.gaEvents)}<style>${CSS}</style></head><body>
${header(name, o.phone, o.from)}
<main id="main" class="sec"><div class="wrap${o.wide ? "" : " narrow"}">${body}</div></main>
${footer(legal)}</body></html>`;
  return new Response(html, { status: o.status ?? 200, headers: { ...HEADERS, "cache-control": "no-store", "content-security-policy": csp(n, { ga: !!o.ga, inlineScript: o.script, stripe: true }) } });
}

/** True when the owner has added app/public/owner.jpg (served as /owner.jpg); the About strip then shows it. */
async function ownerPhotoExists(env: Env): Promise<boolean> {
  try {
    // Missing files fall back to the app page (single-page-application handling), so the type must be an image.
    const res = await env.ASSETS.fetch(new Request(`${ORIGIN}/owner.jpg`, { method: "HEAD" }));
    return res.ok && /^image\//.test(res.headers.get("content-type") ?? "");
  } catch {
    return false;
  }
}

async function contactPost(env: Env, req: Request): Promise<Response> {
  const back = (q: string) => Response.redirect(`${ORIGIN}/?${q}#contact`, 303);
  const form = await req.formData().catch(() => null);
  if (!form || String(form.get("website") ?? "").trim()) return back("sent=1");
  const ip = req.headers.get("cf-connecting-ip") ?? "";
  const recent = await env.DB.prepare("SELECT COUNT(*) AS n FROM submissions WHERE lead_id = ? AND ip = ? AND created_at > ?")
    .bind(COMPANY_LEAD_ID, ip, now() - 3_600_000)
    .first<{ n: number }>();
  if ((recent?.n ?? 0) >= 5) return back("sent=1");
  const field = (k: string, max = 200) => String(form.get(k) ?? "").trim().slice(0, max);
  const data: Record<string, string> = { name: field("name"), phone: field("phone"), email: field("email"), service: field("business"), message: field("message", 2000) };
  for (const k of Object.keys(data)) if (!data[k]) delete data[k];
  if (!data.name || !(data.phone || data.email)) return back("missing=1");
  if (data.service) data.service = `Business: ${data.service}`;
  await env.DB.prepare("INSERT INTO submissions (id, lead_id, created_at, data_json, ip, unverified) VALUES (?, ?, ?, ?, ?, 1)")
    .bind(newId(), COMPANY_LEAD_ID, now(), JSON.stringify(data), ip)
    .run();
  await notify(env, { kind: "message", actorName: data.name, text: `💬 New message from your website (undergroundassociates.com): ${data.name}${data.service ? ` · ${data.service}` : ""}` });
  return back("sent=1");
}

async function home(env: Env, url: URL): Promise<Response> {
  const s = await getSettings(env);
  const name = s.companyName || "Underground Associates";
  const legal = s.legalName || name;
  const phone = s.companyPhone;
  const email = s.companyEmail;
  const plans = s.plans;
  const lowest = plans.length ? Math.min(...plans.map((p) => p.monthly)) : null;
  const sent = url.searchParams.get("sent") === "1";
  const missing = url.searchParams.get("missing") === "1";
  const options = plans[0] ? billingOptions(plans[0], s) : [];
  const title = `${name} | Websites for Cullman, AL Businesses`;
  const description = `Local websites for Cullman-area businesses. We build your site first, free, so you can see it before you pay.${lowest ? ` Plans from ${money(lowest)}/month with hosting and updates included.` : ""}`;
  const ld = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name,
    legalName: legal,
    url: `${ORIGIN}/`,
    ...(phone ? { telephone: phone } : {}),
    ...(email ? { email } : {}),
    address: { "@type": "PostalAddress", addressLocality: "Cullman", addressRegion: "AL", addressCountry: "US" },
    areaServed: ["Cullman", "Hanceville", "Good Hope", "Vinemont", "Hartselle", "Arab"].map((n) => ({ "@type": "City", name: `${n}, AL` })),
    ...(s.companyFacebookUrl ? { sameAs: [s.companyFacebookUrl] } : {}),
    description,
  };
  const callBtn = phone ? `<a class="btn btn--ghost" href="${telHref(phone)}">Call ${e(phone)}</a>` : "";
  const owner = (s.callerName || "Post").split(" ")[0]!;
  const ownerPhoto = await ownerPhotoExists(env);
  const n = nonce();
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${e(title)}</title><meta name="description" content="${e(description)}"><link rel="canonical" href="${ORIGIN}/">
<meta property="og:type" content="website"><meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(description)}"><meta property="og:url" content="${ORIGIN}/">
<meta property="og:image" content="${ORIGIN}/og.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#14213d"><link rel="icon" href="/brand/logo-192.png" type="image/png">${gaTag(s.gaMeasurementId, n, sent ? [["generate_lead", { method: "contact_form" }]] : [])}
<link rel="preload" href="/fonts/bricolage-grotesque-latin-800-normal.woff2" as="font" type="font/woff2" crossorigin>
<style>${CSS}</style><script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script></head><body>
<a class="skip" href="#main">Skip to content</a>
${header(name, phone, lowest)}
<main id="main">
<section class="hero"><div class="wrap">
<p class="eyebrow">Websites for Cullman-area businesses</p>
<h1>See your new website <span class="hl">before you pay</span> a dime.</h1>
<p class="lead">We build your website first, free. If you like it, it goes live${lowest ? ` from ${money(lowest)} a month` : ""}, with hosting, updates and support included. No setup fee on ${commitText(s)} plans.</p>
<div class="btns"><a class="btn" href="#contact">Get my free preview</a>${callBtn}</div>
<p style="margin:18px 0 0"><a href="/portfolio" style="color:#fff">See our work</a></p>
</div></section>

<section class="sec" id="how"><div class="wrap">
<h2>How it works</h2>
<ol class="steps">
<li><strong>We build a free preview.</strong> We use your public Google listing to put together a real website for your business, at no cost to you.</li>
<li><strong>You look it over.</strong> Check it on your phone. We swap in your own photos and fix any detail until it's right.</li>
<li><strong>Say yes and it goes live.</strong> We handle the hosting, security and updates. You get back to running your business.</li>
</ol></div></section>

<section class="sec sec--alt" id="included"><div class="wrap">
<h2>What every site includes</h2>
<div class="grid">${INCLUDED.map(([t, b]) => `<div class="card"><h3>${e(t)}</h3><p>${e(b)}</p></div>`).join("")}</div>
</div></section>

<section class="sec" id="work"><div class="wrap">
<h2>Our work</h2>
<p class="lead">Every business gets its own look. Here are a few examples, made-up businesses so you can see the range.</p>
<ul class="examples">${EXAMPLES.slice(0, 4).map((x) => exampleCard(x, false)).join("")}</ul>
<p class="small muted" style="margin-top:14px">${e(EXAMPLES_NOTE)}</p>
<p style="margin-top:14px"><a class="btn btn--line" href="/portfolio">See the full portfolio (${EXAMPLES.length} sites)</a></p>
</div></section>

<section class="sec about" id="about"><div class="wrap about__in">
<!-- Owner photo: add app/public/owner.jpg (a square headshot, about 400px) and it shows here automatically. -->
${ownerPhoto ? `<img class="about__photo" src="/owner.jpg" alt="${e(owner)}, owner of ${e(name)}" width="128" height="128" loading="lazy" decoding="async">` : ""}
<div><h2>Hi, I'm ${e(owner)}.</h2>
<p class="lead">${e(name)} is a Cullman company — I build the site, show it to you in person, and keep it running.${phone ? ` Call or text me: <a href="${telHref(phone)}">${e(phone)}</a>.` : ""}</p>
${legal !== name ? `<p class="small muted">${e(legal)} · Cullman, Alabama</p>` : `<p class="small muted">Cullman, Alabama</p>`}</div>
</div></section>

${plans.length ? `<section class="sec sec--alt" id="plans"><div class="wrap">
<h2>Simple monthly plans</h2>
<p class="lead">${(s.minMonths ?? 12) ? `<strong>No setup fee on ${commitText(s)} plans.</strong>${s.flexSetup ? ` Month to month has a one-time ${money(s.flexSetup)} setup fee.` : ""}` : "No setup fee. Cancel any time."} ${e(GO_LIVE_TEXT)}</p>
<div class="grid plans">${plans
        .map(
          (p) => `<div class="card plan${p.id === "plus" ? " plan--pick" : ""}">${p.id === "plus" ? `<p class="tag">Most popular</p>` : ""}<h3>${e(p.name)}</h3>
<p class="price">${money(p.monthly)}<span>/month</span></p>${p.setup ? `<p class="small">${money(p.setup)} setup</p>` : ""}
<ul>${p.includes.split(/\n/).map((x) => x.trim()).filter(Boolean).map((x) => `<li>${e(x)}</li>`).join("")}</ul>
<p style="margin-top:14px"><a class="btn btn--small" href="/start?plan=${p.id}">Buy ${e(p.name)}</a></p></div>`,
        )
        .join("")}</div>
<p class="small muted" style="margin-top:14px">Rather see your site first? <a href="#contact">Get a free preview</a> and pay only if you like it.</p>
${options.length ? `<h3 style="margin-top:28px">Ways to pay</h3><div class="grid">${options
        .map((o) => {
          const text =
            o.id === "flex"
              ? `No contract. A one-time ${money(s.flexSetup ?? 0)} setup fee, then cancel any time.`
              : o.id === "annual"
                ? `Pay for a year up front: 12 months for the price of ${12 - (s.annualMonthsFree ?? 0)}. No setup fee.`
                : `No setup fee. After ${o.id === "short" ? s.shortMonths : s.minMonths} months, cancel any time with 30 days' notice.`;
          return `<div class="card"><h3>${e(o.label)}</h3><p>${e(text)}</p></div>`;
        })
        .join("")}</div>` : ""}
${s.addons.length ? `<h3 style="margin-top:28px">Extras</h3><p class="small muted">Add any of these to any plan. Already a client? <a href="/extras">Add extras here</a>.</p><div class="grid extras">${s.addons.map((a) => `<div class="card"><h3>${e(a.name)}</h3><p class="xprice">${e(addonPrice(a))}</p>${a.about ? `<p>${e(a.about)}</p>` : ""}</div>`).join("")}</div>` : ""}
</div></section>` : ""}

<section class="sec" id="who"><div class="wrap">
<h2>Who we work with</h2>
<p class="lead">Independent local businesses in Cullman, Hanceville, Good Hope, Vinemont, Hartselle, Arab and nearby, including:</p>
<ul class="chips">${CATEGORIES.map((c) => `<li>${e(c)}</li>`).join("")}</ul>
<p class="small muted">Don't see yours? <a href="#contact">Ask us</a>. If you serve local customers, we can build for you.</p>
</div></section>

<section class="sec sec--alt" id="faq"><div class="wrap narrow">
<h2>Questions</h2>
${faq(s).map(([q, a]) => `<details><summary>${e(q)}</summary><p>${e(a)}</p></details>`).join("")}
</div></section>

<section class="sec sec--dark" id="contact"><div class="wrap narrow">
<h2>Get your free preview</h2>
<p>Tell us about your business and we'll build a preview you can look at on your phone. No cost, no obligation.</p>
${sent ? `<p class="note" role="status">Thanks! We got your message and will be in touch soon.</p>` : ""}
${missing ? `<p class="note note--warn" role="alert">Please add your name and a phone number or email so we can reach you.</p>` : ""}
<form method="post" action="/contact" class="form">
<label>Your name<input name="name" autocomplete="name" required maxlength="200"></label>
<label>Business name<input name="business" autocomplete="organization" maxlength="200"></label>
<label>Phone<input name="phone" type="tel" autocomplete="tel" maxlength="40"></label>
<label>Email<input name="email" type="email" autocomplete="email" maxlength="200"></label>
<label>Anything we should know? <span class="opt">(optional)</span><textarea name="message" rows="3" maxlength="2000"></textarea></label>
<div class="hp" aria-hidden="true"><label>Leave this empty<input name="website" tabindex="-1" autocomplete="off"></label></div>
<button class="btn" type="submit">Send</button>
</form>
${phone || email ? `<p class="direct">Rather talk? ${phone ? `<a href="${telHref(phone)}">${e(phone)}</a>` : ""}${phone && email ? " · " : ""}${email ? `<a href="mailto:${e(email)}">${e(email)}</a>` : ""}</p>` : ""}
${s.directEmail && s.directEmail !== email ? `<p class="direct">Need ${s.callerName ? e(s.callerName.split(" ")[0]!) : "the owner"} directly? <a href="mailto:${e(s.directEmail)}">${e(s.directEmail)}</a></p>` : ""}
</div></section>
</main>
${footer(legal, s.companyReviewUrl, s.companyFacebookUrl)}
${phone ? `<nav class="bar" aria-label="Quick actions"><a href="${telHref(phone)}">Call</a><a href="#contact">Free preview</a></nav>` : ""}
</body></html>`;
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
      "content-security-policy": csp(n, { ga: !!s.gaMeasurementId }),
    },
  });
}

/** Site header: name, Our work, Plans (with the lowest monthly price), and a Call (or Contact) button. */
function header(name: string, phone?: string, from?: number | null): string {
  return `<header class="hdr"><div class="wrap hdr__in"><a class="brand" href="/"><img src="/brand/logo-192.png" alt="" width="40" height="40">${e(name)}</a><nav class="hdr__nav" aria-label="Main"><a href="/portfolio">Our work</a><a class="hdr__plans" href="/#plans">Plans${from ? ` <small>from ${money(from)}/mo</small>` : ""}</a>${
    phone ? `<a class="hdr__call" href="${telHref(phone)}">Call</a>` : `<a class="hdr__call" href="/#contact">Contact</a>`
  }</nav></div></header>`;
}

/** "Garden Table look · Split layout" for an example's design id. */
function designName(id: string): string {
  const d = parseDesign(id);
  const look = LOOKS[d.look]?.name;
  const layout = d.layout ? LAYOUTS[d.layout]?.name : undefined;
  return [look && `${look} look`, layout && `${layout} layout`].filter(Boolean).join(" · ");
}

function exampleCard(x: (typeof EXAMPLES)[number], withDesign: boolean): string {
  return `<li><a href="/examples/${x.slug}/"><img src="/examples/${x.slug}.jpg" alt="Phone screenshot of an example ${e(x.kind.toLowerCase())} website" width="390" height="780" loading="lazy" decoding="async"><span><strong>${e(x.record.name)}</strong>${e(x.kind)}${withDesign ? `<em>${e(designName(x.design))}</em>` : ""}<b>View the site →</b></span></a></li>`;
}

/** Portfolio: every example site, with its type and design. */
async function portfolio(env: Env): Promise<Response> {
  const s = await getSettings(env);
  const name = s.companyName || "Underground Associates";
  const body = `<p class="eyebrow" style="color:var(--goldtext)">Our work</p>
<h1>Portfolio</h1>
<p class="lead">Every business gets its own design: colors, fonts and page layout picked for what you do, built for phones first. Tap any one to try the full site.</p>
<p class="small muted">${e(EXAMPLES_NOTE)}</p>
<ul class="examples examples--full">${EXAMPLES.map((x) => exampleCard(x, true)).join("")}</ul>
<div class="card" style="margin-top:32px"><h2 style="font-size:1.4rem">Want to see yours?</h2><p>We'll build a free preview of your website first. You only pay if you like it.</p>
<div class="btns"><a class="btn" href="/#contact">Get my free preview</a><a class="btn btn--line" href="/#plans">See plans</a></div></div>`;
  const from = s.plans.length ? Math.min(...s.plans.map((p) => p.monthly)) : null;
  return policyShell(name, s.legalName || name, "Portfolio", body, { wide: true, phone: s.companyPhone, ga: s.gaMeasurementId, from, description: `Example websites by ${name} for Cullman-area businesses: restaurants, contractors, salons, auto shops, lawn care, cleaning, print shops and boutiques.` });
}

function footer(legal: string, reviewUrl?: string, facebookUrl?: string): string {
  return `<footer class="ftr"><div class="wrap">© ${FOUNDED}–${new Date().getFullYear()} ${e(legal)} · Cullman, Alabama · <a href="/extras">Clients: add extras</a> · <a href="/terms">Terms &amp; refunds</a> · <a href="/privacy">Privacy</a>${facebookUrl ? ` · <a href="${e(facebookUrl)}" rel="noopener">Facebook</a>` : ""}${reviewUrl ? ` · <a href="${e(reviewUrl)}" rel="noopener">Review us on Google</a>` : ""}</div></footer>`;
}

/** Per-response CSP nonce for the inline Google tag snippet. */
function nonce(): string {
  return crypto.randomUUID().replace(/-/g, "");
}
const GA_SCRIPT = "https://www.googletagmanager.com";
// Where gtag.js sends hits: Analytics (regional hosts), Ads signals (google.com, doubleclick), plus 'self' for Cloudflare's own beacons.
const GA_CONNECT = "'self' https://*.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://www.googletagmanager.com https://www.google.com https://stats.g.doubleclick.net";
type GaEvent = [name: string, params: Record<string, string | number>];
/**
 * Google tag (gtag.js) for the head of every company page; nothing when Settings has no ID.
 * `events` fire on load (sign_up, purchase, generate_lead on the pages that mean it); every page also reports
 * call_click / text_click when a tel: or sms: link is tapped, so Google Ads can count calls from the site.
 */
function gaTag(id: string | undefined, n: string, events: GaEvent[] = []): string {
  if (!id) return "";
  const fire = events.map(([name, params]) => `gtag("event",${JSON.stringify(name)},${JSON.stringify(params)});`).join("");
  const clicks = `document.addEventListener("click",function(ev){var a=ev.target&&ev.target.closest?ev.target.closest("a"):null;if(!a)return;var h=a.getAttribute("href")||"";if(h.indexOf("tel:")===0)gtag("event","call_click",{link_url:h});else if(h.indexOf("sms:")===0)gtag("event","text_click",{link_url:h});});`;
  return `<script async nonce="${n}" src="${GA_SCRIPT}/gtag/js?id=${e(id)}"></script><script nonce="${n}">window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config","${e(id)}");${fire}${clicks}</script>`;
}
/** The company site's CSP: no scripts at all unless a page has its own (inline) or the Google tag is on. */
function csp(n: string, o: { ga?: boolean; inlineScript?: boolean; stripe?: boolean } = {}): string {
  // A nonce makes browsers ignore 'unsafe-inline', so pages with their own inline scripts keep 'unsafe-inline' instead.
  const script = o.inlineScript ? `'unsafe-inline'${o.ga ? ` ${GA_SCRIPT}` : ""}` : o.ga ? `'nonce-${n}' ${GA_SCRIPT}` : "";
  return `default-src 'none'; style-src 'unsafe-inline'; font-src 'self'; img-src 'self' data:${o.ga ? ` ${GA_CONNECT}` : ""};${script ? ` script-src ${script};` : ""}${o.ga ? ` connect-src ${GA_CONNECT};` : ""} form-action 'self'${o.stripe ? " https://checkout.stripe.com" : ""}; base-uri 'none'; frame-ancestors 'none'`;
}

const HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "cache-control": "public, max-age=300",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; font-src 'self'; img-src 'self' data:; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
};

/** Terms of service (with the cancellation and refund policy) and the privacy policy, filled from live Settings. */
async function policyPage(env: Env, kind: "terms" | "privacy"): Promise<Response> {
  const s = await getSettings(env);
  const name = s.companyName || "Underground Associates";
  const legal = s.legalName || name;
  const phone = s.companyPhone;
  const email = s.companyEmail;
  const reach = [phone ? `call or text <a href="${telHref(phone)}">${e(phone)}</a>` : "", email ? `email <a href="mailto:${e(email)}">${e(email)}</a>` : ""].filter(Boolean).join(" or ") || "contact us";
  const sec = (h: string, body: string, id?: string) => `<section${id ? ` id="${id}"` : ""}><h2>${e(h)}</h2>${body}</section>`;
  const ul = (items: string[]) => `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
  let title: string;
  let body: string;
  if (kind === "terms") {
    title = "Terms of service and refund policy";
    const plan = s.plans[0];
    const ways = plan ? billingOptions(plan, s) : [];
    const short = s.shortMonths ?? 6;
    const min = s.minMonths ?? 12;
    const terms = s.terms?.trim() || defaultTerms(s);
    body = [
      sec("Who we are", `<p>${e(legal)} ("we", "us") builds, hosts and maintains websites for local businesses from Cullman, Alabama. Questions? ${reach}.</p>`),
      sec("Free previews", `<p>We may build a free preview website for your business from your public Google business listing. Looking at it costs nothing and you're under no obligation. Previews are private, hidden from search engines, and deleted if you don't sign up.</p>`),
      s.plans.length
        ? sec("Plans and prices", `${ul(s.plans.map((p) => `<strong>${e(p.name)}</strong>: ${money(p.monthly)} a month${p.setup ? ` plus ${money(p.setup)} setup` : ""}`))}
<p>Ways to pay:</p>${ul(ways.map((o) => `<strong>${e(o.label)}</strong>: ${e(
          o.id === "flex"
            ? `the monthly price plus a one-time ${money(s.flexSetup ?? 0)} setup fee. No minimum.`
            : o.id === "annual"
              ? `pay 12 months up front for the price of ${12 - (s.annualMonthsFree ?? 0)}. No setup fee. Renews each year unless you cancel.`
              : `the monthly price, no setup fee. ${o.id === "short" ? short : min}-month minimum, then cancel any time with 30 days' notice.`,
        )}`))}
${s.churchAnnualMonthsFree ? `<p>Churches and nonprofits: yearly plans are 12 months for the price of ${12 - s.churchAnnualMonthsFree}.</p>` : ""}
${s.addons.length ? `<p>Extras: ${s.addons.map((a) => `${e(a.name)} (${e(addonPrice(a))})`).join(", ")}.</p>` : ""}
<p>The prices in your signed agreement are the ones you pay. We'll give you at least 30 days' notice before any price change.</p>`)
        : "",
      sec("Signing up and paying", `<p>You sign up by reading and accepting your plan and our service agreement on your personal sign-up page. Payments are processed by Stripe and charged automatically to the card you choose; we never see or store your full card number. Churches, nonprofits and anyone who asks can pay by check or bank transfer against an invoice instead.</p>
<p>${e(GO_LIVE_TEXT)} A same-day build, if bought, goes live the same business day you approve it.</p>
<p>If a payment fails and isn't fixed within 30 days, we may take the site offline until it's caught up. To update your card or cancel, ${reach} or use the billing link we send you.</p>`),
      sec("Cancellation and refund policy", `${ul([
        "Previews are always free. You never pay anything unless you sign up.",
        min ? `Plans with a minimum (${short && short < min ? `${short} or ${min} months` : `${min} months`}): after the minimum, cancel any time with 30 days' notice. If you cancel before the end of your plan's minimum term, you owe an early cancellation fee equal to your monthly price times the months left in the minimum term: keep paying monthly until the term ends with your site live, or pay it now${payoffDiscountOf(s) ? ` less ${payoffDiscountOf(s)}%` : ""} and close the account at once.` : "",
        s.flexSetup ? `Month to month: cancel any time with 30 days' notice. The ${money(s.flexSetup)} setup fee is refunded in full if you cancel before your site goes live; after it goes live, it isn't refundable.` : "",
        "Monthly charges are billed in advance and aren't refunded for part of a month.",
        s.annualMonthsFree ? "Yearly plans: cancel within 30 days of paying and we refund what you paid, minus the regular monthly price for each month started. After 30 days, yearly payments aren't refunded; your site stays up through the year you paid for and the plan won't renew." : "",
        s.annualMonthsFree ? "Yearly plans renew each year. We'll text and email you at least 30 days before a yearly renewal, and you can cancel before it renews." : "",
        "Extras: one-time extras aren't refundable once delivered unless we made the mistake (printed and programmed items once printed or programmed). Monthly extras can be canceled with 30 days' notice. A same-day build is refunded if we miss the window through our own fault; Google Business Profile setup is refunded half if Google refuses to verify.",
        `Late payments: ${lateFeeOf(s) ? `a ${money(lateFeeOf(s))} late fee 10 days after a failed payment, ` : ""}8% a year on balances over 30 days overdue, the site may go offline after 30 days, the agreement may end after 60 days with the balance due, and $49 to put a site back online.`,
        "Payment disputes: please contact us first; we refund billing mistakes in full. Disputing a charge that was due counts as a missed payment and adds the bank's $15 fee.",
        "If we fail you: a month free for more than 24 hours of downtime in a month that's our fault. Three such months in a year, or a problem not fixed within 14 days of your written notice, lets you cancel without the rest of your term and get unused prepaid months back.",
        "If we ever charge you by mistake, we refund it in full. Refunds go back to your original card or account, usually within 5 to 10 business days.",
        `To cancel or ask for a refund, ${reach} or use your billing link. Cancellation takes effect at the end of your paid period (after any minimum term).`,
        "This cancellation and refund policy is part of your signed agreement as of the day you sign.",
      ].filter(Boolean))}`, "refunds"),
      sec("Service agreement", `<p>This is the agreement you accept when you sign up:</p><div class="terms">${e(terms)}</div>`),
      sec("Limits", `<p>We work to keep your site online and correct, but we can't promise it will never be down or error-free, and no one can guarantee search rankings, visitors or sales. To the extent the law allows, we aren't liable for lost profits or indirect damages, and our total liability to you is limited to what you paid us in the 12 months before the problem.</p>`),
      sec("How we settle disagreements", `<p>We talk first: either of us can ask for a call or meeting, and we both try for 30 days to sort it out. After that either of us may go to court. Alabama law applies, and any case is filed in the state courts in Cullman County, Alabama, including small claims court.</p>`),
      sec("The law that applies", `<p>These terms are governed by the laws of the State of Alabama.</p>`),
    ].join("");
  } else {
    title = "Privacy policy";
    body = [
      sec("Who we are", `<p>${e(legal)} builds and runs websites for local businesses. This policy covers undergroundassociates.com, our sign-up and preview pages, and the websites we host for our clients. Questions? ${reach}.</p>`),
      sec("What we collect", ul([
        "<strong>When you contact us:</strong> your name, business name, phone, email and message, plus your IP address to block spam.",
        "<strong>When you sign up:</strong> your name, title, email, the plan you chose, the agreement you accepted, and your IP address and browser type as a record of your signature.",
        "<strong>Payments:</strong> Stripe handles them. We see whether a payment went through, not your card number.",
        "<strong>Business information:</strong> to build previews we use public details from Google business listings (name, address, phone, hours, category and ratings). Google's photos are only shown in private previews and never on a live website.",
        "<strong>Preview links:</strong> when someone opens a preview link we sent, we note that it was opened and when, so we know when to follow up.",
        "<strong>Our clients' websites:</strong> we count page views and taps on buttons like Call and Directions, without cookies and without identifying visitors. Messages sent through a client's website form go to that business; we store them only to deliver them.",
      ])),
      sec("How we use it", `<p>To answer you, build and run your website, handle billing, and follow up about a preview we made for you. We don't sell or rent personal information.</p><p>${s.gaMeasurementId ? "This website uses Google Analytics to count visits and see which pages people read, so we can improve it. Google sets cookies for this and may link visits to Google Ads clicks. You can opt out with Google's browser add-on (tools.google.com/dlpage/gaoptout) or by blocking cookies." : "This website uses no advertising trackers or cookies."} The websites we build for clients use no cookies at all.</p>`),
      sec("Calls, texts and email", `<p>We contact you only about your inquiry, your preview or your service. Ask us to stop, or reply STOP to a text, and we will.</p>`),
      sec("Who we share it with", ul([
        "Service providers that run our business: Cloudflare (hosting), Google (email, business listings and website analytics), Stripe (payments), and an AI writing tool that helps draft website text from public business details (never your personal contact information).",
        "Anyone the law requires us to share with.",
      ])),
      sec("How long we keep it", `<p>Messages and sign-up records are kept as long as we need them for your service and our business records. Previews for businesses that don't sign up are deleted within 30 to 90 days; we keep only Google's listing ID so we don't contact the same business twice by mistake.</p>`),
      sec("Your choices", `<p>To see, correct or delete information we hold about you, ${reach}.</p>`),
      sec("Children", `<p>Our services are for businesses and aren't meant for children under 13.</p>`),
    ].join("");
  }
  const n = nonce();
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${e(title)} | ${e(name)}</title><meta name="description" content="${e(`${title} for ${legal}, Cullman, Alabama.`)}"><link rel="canonical" href="${ORIGIN}/${kind}">
<meta name="theme-color" content="#14213d"><link rel="icon" href="/brand/logo-192.png" type="image/png">${gaTag(s.gaMeasurementId, n)}<style>${CSS}</style></head><body>
<a class="skip" href="#main">Skip to content</a>
${header(name, phone)}
<main id="main" class="sec"><div class="wrap narrow legal"><h1>${e(title)}</h1><p class="small muted">Last updated ${POLICIES_UPDATED}</p>${body}</div></main>
${footer(legal)}
</body></html>`;
  return new Response(html, { headers: { ...HEADERS, "content-security-policy": csp(n, { ga: !!s.gaMeasurementId }) } });
}

const CSS = `@font-face{font-family:"Bricolage";src:url(/fonts/bricolage-grotesque-latin-800-normal.woff2) format("woff2");font-weight:800;font-display:swap}
@font-face{font-family:"DM Sans";src:url(/fonts/dm-sans-latin-400-normal.woff2) format("woff2");font-weight:400;font-display:swap}
@font-face{font-family:"DM Sans";src:url(/fonts/dm-sans-latin-700-normal.woff2) format("woff2");font-weight:700;font-display:swap}
:root{--navy:#14213d;--ink:#16181d;--muted:#545b68;--gold:#fca311;--goldtext:#8a5300;--bg:#ffffff;--alt:#f4f5f8;--line:#e1e4ea;--blue:#1d4ed8}
*{box-sizing:border-box}html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:400 17px/1.6 "DM Sans",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding-bottom:64px}
@media (min-width:760px){body{padding-bottom:0}}
a{color:var(--blue)}
h1,h2,h3{font-family:"Bricolage","DM Sans",system-ui,sans-serif;font-weight:800;line-height:1.1;letter-spacing:-.01em;margin:0 0 14px}
h1{font-size:clamp(2.2rem,7vw,3.8rem)}h2{font-size:clamp(1.6rem,4.5vw,2.4rem)}h3{font-size:1.15rem}
.wrap{max-width:1080px;margin:0 auto;padding:0 20px}.narrow{max-width:680px}
.skip{position:absolute;left:-9999px}.skip:focus{left:12px;top:12px;background:#fff;padding:8px 12px;z-index:9}
:focus-visible{outline:3px solid var(--gold);outline-offset:2px}
.hdr{position:sticky;top:0;z-index:5;background:var(--navy)}
.hdr__in{display:flex;align-items:center;justify-content:space-between;min-height:60px}
.brand{color:#fff;text-decoration:none;font-family:"Bricolage",system-ui,sans-serif;font-weight:800;font-size:1.15rem;display:inline-flex;align-items:center;gap:10px}.brand img{width:40px;height:40px;display:block}
.hdr__call{color:var(--navy)!important;background:var(--gold);text-decoration:none;font-weight:700;padding:10px 18px;border-radius:999px}
.hdr__nav{display:flex;align-items:center;gap:16px}.hdr__nav a{color:#fff;text-decoration:none;font-weight:700}.hdr__nav a:not(.hdr__call):hover{text-decoration:underline}
.hdr__nav a{white-space:nowrap}.hdr__plans small{font-weight:400;color:#dfe4ee;font-size:.82rem}
.about__in{display:flex;gap:22px;align-items:center}.about__photo{width:128px;height:128px;border-radius:50%;object-fit:cover;flex:none;border:3px solid var(--gold)}
.about h2{font-size:clamp(1.5rem,4.5vw,2.1rem)}.about .lead{margin-bottom:6px}@media (max-width:520px){.about__in{flex-direction:column;align-items:flex-start;gap:14px}.about__photo{width:96px;height:96px}}
@media (max-width:520px){.hdr__plans{display:none}.brand{font-size:.98rem;line-height:1.15}.hdr__nav{gap:12px}.hdr__call{padding:8px 14px}}
.btn--line{background:transparent;color:var(--navy);border:2px solid var(--navy)}
.examples span em{display:block;font-style:normal;font-size:.85rem;color:var(--muted);margin-top:2px}.examples span b{display:block;color:var(--blue);margin-top:4px;font-size:.92rem}
@media (min-width:760px){.examples--full{grid-template-columns:repeat(4,1fr)}}
.hero{background:var(--navy);color:#fff;padding:56px 0 72px}
.eyebrow{color:var(--gold);font-weight:700;text-transform:uppercase;letter-spacing:.08em;font-size:.85rem;margin:0 0 12px}
.hl{color:var(--gold)}
.lead{font-size:1.15rem;max-width:44em}.hero .lead{color:#dfe4ee}
.btns{display:flex;flex-wrap:wrap;gap:12px;margin-top:24px}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:52px;padding:12px 24px;border-radius:12px;border:0;background:var(--gold);color:var(--navy);font:700 1.05rem "DM Sans",system-ui,sans-serif;text-decoration:none;cursor:pointer}
.btn--ghost{background:transparent;color:#fff;border:2px solid rgba(255,255,255,.6)}
.sec{padding:64px 0}.sec--alt{background:var(--alt)}.sec--dark{background:var(--navy);color:#fff}.sec--dark a{color:var(--gold)}
.steps{counter-reset:s;list-style:none;padding:0;display:grid;gap:16px;margin:0}
.steps li{counter-increment:s;position:relative;padding:18px 18px 18px 72px;border:1px solid var(--line);border-radius:14px}
.steps li::before{content:counter(s);position:absolute;left:18px;top:16px;width:38px;height:38px;border-radius:50%;background:var(--gold);color:var(--navy);font:800 1.2rem "Bricolage",sans-serif;display:grid;place-items:center}
.grid{display:grid;gap:16px}@media (min-width:760px){.grid{grid-template-columns:repeat(3,1fr)}.steps{grid-template-columns:repeat(3,1fr)}}
.card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:20px}.card p{margin:0;color:var(--muted)}
.plan{position:relative}.plan--pick{border:3px solid var(--gold)}
.tag{position:absolute;top:-14px;left:18px;background:var(--gold);color:var(--navy)!important;font-weight:700;font-size:.8rem;padding:3px 10px;border-radius:999px}
.price{font:800 2.4rem "Bricolage",sans-serif;color:var(--ink)!important;margin:4px 0!important}.price span{font:400 1rem "DM Sans",sans-serif;color:var(--muted)}
.plan ul{padding-left:20px;margin:12px 0 0}.plan li{margin:6px 0}
.small{font-size:.92rem}.muted{color:var(--muted)}
.chips{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:10px}.chips li{background:#fff;border:1px solid var(--line);border-radius:999px;padding:8px 16px;font-weight:700}
details{border-bottom:1px solid var(--line);padding:6px 0}summary{cursor:pointer;font-weight:700;padding:12px 0;font-size:1.05rem}details p{margin:0 0 14px;color:var(--muted)}
.form{display:grid;gap:14px;margin-top:20px}.form label{display:grid;gap:6px;font-weight:700}
.form input,.form textarea{width:100%;min-height:50px;padding:12px;border-radius:10px;border:2px solid #3b4a6b;background:#fff;color:var(--ink);font:400 1rem "DM Sans",system-ui,sans-serif}
.opt{font-weight:400;color:#c9d1e0}.hp{position:absolute;left:-9999px}
.note{background:#e8f5ec;color:#0f5132;border-radius:10px;padding:12px 14px;font-weight:700}.note--warn{background:#fff4e0;color:var(--goldtext)}
.direct{margin-top:18px}
.btn--small{min-height:44px;padding:8px 18px;font-size:.98rem}
.light .form label{color:var(--ink)}
.xopt{display:flex!important;gap:10px;align-items:flex-start;border:1px solid var(--line);border-radius:12px;padding:12px;margin:0 0 8px;font-weight:400!important;background:#fff}
.xopt input{width:20px!important;height:20px;min-height:0!important;padding:0!important;margin-top:4px;flex:none}.xopt small{display:block;color:var(--muted)}
.xopt:has(input:checked){border:2px solid var(--gold);padding:11px}.light .opt{color:var(--ink)}.light details{margin:6px 0 10px}.light .terms{white-space:pre-line;background:var(--alt);border-radius:12px;padding:14px;font-size:.92rem}
.extras .card h3{margin-bottom:4px}.xprice{color:var(--goldtext)!important;font-weight:700;margin:0 0 8px!important}
.examples{list-style:none;padding:0;margin:24px 0 0;display:grid;grid-template-columns:repeat(2,1fr);gap:16px}@media (min-width:760px){.examples{grid-template-columns:repeat(4,1fr)}}
.examples a{display:block;text-decoration:none;color:var(--ink)}.examples img{display:block;width:100%;height:auto;aspect-ratio:1/2;object-fit:cover;object-position:top;border-radius:16px;border:1px solid var(--line);box-shadow:0 6px 18px rgba(20,33,61,.12)}
.examples span{display:block;margin-top:8px;font-size:.92rem;color:var(--muted)}.examples strong{display:block;color:var(--ink);font-size:1rem}
.ftr{background:#0d1629;color:#aeb7c8;padding:24px 0;font-size:.92rem}.ftr a{color:#dfe5ef}
.legal h1{font-size:clamp(1.9rem,6vw,2.8rem)}.legal h2{font-size:1.35rem;margin-top:32px}.legal li{margin-bottom:8px}
.legal .terms{white-space:pre-line;background:var(--alt);border-radius:12px;padding:16px 18px;font-size:.95rem}
.bar{position:fixed;left:0;right:0;bottom:0;display:flex;background:var(--navy);padding:8px 8px calc(8px + env(safe-area-inset-bottom));gap:8px;z-index:6}
.bar a{flex:1;text-align:center;min-height:48px;display:flex;align-items:center;justify-content:center;border-radius:10px;font-weight:700;text-decoration:none;background:var(--gold);color:var(--navy)}
.bar a+a{background:#fff}
@media (min-width:760px){.bar{display:none}}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}`;
