import { notify } from "./notify.ts";
import { addonPrice, billingOptions, defaultTerms, getSettings, type AppSettings } from "./db.ts";
import { newId, now, type Env } from "./env.ts";
import { escHtml as e } from "./page.ts";
import { SEARCH_GROUPS } from "../places/queries.ts";
import { EXAMPLES } from "../examples/examples.ts";

/** Underground Associates' own website, served on the company domain from live Settings (prices, phone, email). */
export const COMPANY_HOSTS = ["undergroundassociates.com", "www.undergroundassociates.com"];
const ORIGIN = "https://undergroundassociates.com";
export const COMPANY_ORIGIN = ORIGIN;
/** Year Underground Associates LLC started, for the copyright line. */
const FOUNDED = 2021;

/** Shown on the Terms and Privacy pages; bump when either changes. */
const POLICIES_UPDATED = "October 9, 2026";

/** Contact form posts land in the app inbox under this pseudo lead id. */
export const COMPANY_LEAD_ID = "company";

/** Every kind of business the app searches for and builds sites for, so the list grows with new search groups. */
const CATEGORIES = SEARCH_GROUPS.map((g) => g.label);

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
  if (path === "/robots.txt") return new Response(`User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`, { headers: { "content-type": "text/plain" } });
  if (path === "/sitemap.xml") {
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${ORIGIN}/</loc></url><url><loc>${ORIGIN}/terms</loc></url><url><loc>${ORIGIN}/privacy</loc></url></urlset>\n`, { headers: { "content-type": "application/xml" } });
  }
  // Fonts and icons come from the app's static assets.
  if (path.startsWith("/fonts/") || path.startsWith("/icons/") || path === "/og.png") return null;
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
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Request a change | ${e(name)}</title><meta name="robots" content="noindex"><meta name="theme-color" content="#14213d"><link rel="icon" href="/icons/icon-192.png" type="image/png"><style>${CSS}</style></head><body>
<header class="hdr"><div class="wrap hdr__in"><a class="brand" href="/">${e(name)}</a></div></header>
<main id="main" class="sec sec--dark"><div class="wrap narrow">${body}</div></main>
${footer(s.legalName || name)}</body></html>`;
  return new Response(html, { status: lead ? 200 : 404, headers: { ...HEADERS, "cache-control": "no-store" } });
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
    description,
  };
  const callBtn = phone ? `<a class="btn btn--ghost" href="${telHref(phone)}">Call ${e(phone)}</a>` : "";
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${e(title)}</title><meta name="description" content="${e(description)}"><link rel="canonical" href="${ORIGIN}/">
<meta property="og:type" content="website"><meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(description)}"><meta property="og:url" content="${ORIGIN}/">
<meta property="og:image" content="${ORIGIN}/og.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#14213d"><link rel="icon" href="/icons/icon-192.png" type="image/png">
<link rel="preload" href="/fonts/bricolage-grotesque-latin-800-normal.woff2" as="font" type="font/woff2" crossorigin>
<style>${CSS}</style><script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script></head><body>
<a class="skip" href="#main">Skip to content</a>
<header class="hdr"><div class="wrap hdr__in"><a class="brand" href="/">${e(name)}</a>${phone ? `<a class="hdr__call" href="${telHref(phone)}">Call</a>` : `<a class="hdr__call" href="#contact">Contact</a>`}</div></header>
<main id="main">
<section class="hero"><div class="wrap">
<p class="eyebrow">Websites for Cullman-area businesses</p>
<h1>See your new website <span class="hl">before you pay</span> a dime.</h1>
<p class="lead">We build your website first, free. If you like it, it goes live${lowest ? ` from ${money(lowest)} a month` : ""}, with hosting, updates and support included. No setup fee on ${commitText(s)} plans.</p>
<div class="btns"><a class="btn" href="#contact">Get my free preview</a>${callBtn}</div>
<p style="margin:18px 0 0"><a href="#examples" style="color:#fff">See example sites</a></p>
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

<section class="sec" id="examples"><div class="wrap">
<h2>See a few examples</h2>
<p class="lead">Every business gets its own look. These are made-up businesses so you can see the range. Tap one to try it.</p>
<ul class="examples">${EXAMPLES.map((x) => `<li><a href="/examples/${x.slug}/"><img src="/examples/${x.slug}.jpg" alt="Phone screenshot of an example ${e(x.kind.toLowerCase())} website" width="390" height="780" loading="lazy" decoding="async"><span><strong>${e(x.record.name)}</strong>${e(x.kind)}</span></a></li>`).join("")}</ul>
</div></section>

${plans.length ? `<section class="sec sec--alt" id="plans"><div class="wrap">
<h2>Simple monthly plans</h2>
<p class="lead">${(s.minMonths ?? 12) ? `<strong>No setup fee on ${commitText(s)} plans.</strong>${s.flexSetup ? ` Month to month has a one-time ${money(s.flexSetup)} setup fee.` : ""}` : "No setup fee. Cancel any time."}</p>
<div class="grid plans">${plans
        .map(
          (p) => `<div class="card plan${p.id === "plus" ? " plan--pick" : ""}">${p.id === "plus" ? `<p class="tag">Most popular</p>` : ""}<h3>${e(p.name)}</h3>
<p class="price">${money(p.monthly)}<span>/month</span></p>${p.setup ? `<p class="small">${money(p.setup)} setup</p>` : ""}
<ul>${p.includes.split(/\n/).map((x) => x.trim()).filter(Boolean).map((x) => `<li>${e(x)}</li>`).join("")}</ul></div>`,
        )
        .join("")}</div>
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
${s.addons.length ? `<h3 style="margin-top:28px">Extras</h3><p class="small muted">Add any of these to any plan.</p><div class="grid extras">${s.addons.map((a) => `<div class="card"><h3>${e(a.name)}</h3><p class="xprice">${e(addonPrice(a))}</p>${a.about ? `<p>${e(a.about)}</p>` : ""}</div>`).join("")}</div>` : ""}
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
${footer(legal, s.companyReviewUrl)}
${phone ? `<nav class="bar" aria-label="Quick actions"><a href="${telHref(phone)}">Call</a><a href="#contact">Free preview</a></nav>` : ""}
</body></html>`;
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; font-src 'self'; img-src 'self' data:; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    },
  });
}

function footer(legal: string, reviewUrl?: string): string {
  return `<footer class="ftr"><div class="wrap">© ${FOUNDED}–${new Date().getFullYear()} ${e(legal)} · Cullman, Alabama · <a href="/terms">Terms &amp; refunds</a> · <a href="/privacy">Privacy</a>${reviewUrl ? ` · <a href="${e(reviewUrl)}" rel="noopener">Review us on Google</a>` : ""}</div></footer>`;
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
${s.addons.length ? `<p>Extras: ${s.addons.map((a) => `${e(a.name)} (${e(addonPrice(a))})`).join(", ")}.</p>` : ""}
<p>The prices in your signed agreement are the ones you pay. We'll give you at least 30 days' notice before any price change.</p>`)
        : "",
      sec("Signing up and paying", `<p>You sign up by reading and accepting your plan and our service agreement on your personal sign-up page. Payments are processed by Stripe and charged automatically to the card you choose; we never see or store your full card number. If a payment fails, we'll reach out. A site may be taken offline if a payment is more than 30 days late.</p>`),
      sec("Cancellation and refund policy", `${ul([
        "Previews are always free. You never pay anything unless you sign up.",
        min ? `Plans with a minimum (${short && short < min ? `${short} or ${min} months` : `${min} months`}): after the minimum, cancel any time with 30 days' notice.` : "",
        s.flexSetup ? "Month to month: cancel any time with 30 days' notice." : "",
        "Monthly charges are billed in advance and aren't refunded for part of a month.",
        s.flexSetup ? `The month-to-month setup fee (${money(s.flexSetup)}) is refunded in full if you cancel before your site goes live. After it goes live, it isn't refundable.` : "",
        s.annualMonthsFree ? "Yearly plans: cancel within 30 days of paying and we refund what you paid, minus the regular monthly price for each month started. After 30 days, yearly payments aren't refunded; your site stays up through the year you paid for and the plan won't renew." : "",
        "If we ever charge you by mistake, we refund it in full.",
        `To cancel or ask for a refund, ${reach}. Refunds go back to your original card, usually within 5 to 10 business days.`,
      ].filter(Boolean))}`, "refunds"),
      sec("Service agreement", `<p>This is the agreement you accept when you sign up:</p><div class="terms">${e(terms)}</div>`),
      sec("Limits", `<p>We work to keep your site online and correct, but we can't promise it will never be down or error-free, and no one can guarantee search rankings, visitors or sales. To the extent the law allows, we aren't liable for lost profits or indirect damages, and our total liability is limited to what you paid us in the 3 months before the claim.</p>`),
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
      sec("How we use it", `<p>To answer you, build and run your website, handle billing, and follow up about a preview we made for you. We don't sell or rent personal information, and this website uses no advertising trackers or cookies.</p>`),
      sec("Calls, texts and email", `<p>We contact you only about your inquiry, your preview or your service. Ask us to stop, or reply STOP to a text, and we will.</p>`),
      sec("Who we share it with", ul([
        "Service providers that run our business: Cloudflare (hosting), Google (email and business listings), Stripe (payments), and an AI writing tool that helps draft website text from public business details (never your personal contact information).",
        "Anyone the law requires us to share with.",
      ])),
      sec("How long we keep it", `<p>Messages and sign-up records are kept as long as we need them for your service and our business records. Previews for businesses that don't sign up are deleted within 30 to 90 days; we keep only Google's listing ID so we don't contact the same business twice by mistake.</p>`),
      sec("Your choices", `<p>To see, correct or delete information we hold about you, ${reach}.</p>`),
      sec("Children", `<p>Our services are for businesses and aren't meant for children under 13.</p>`),
    ].join("");
  }
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${e(title)} | ${e(name)}</title><meta name="description" content="${e(`${title} for ${legal}, Cullman, Alabama.`)}"><link rel="canonical" href="${ORIGIN}/${kind}">
<meta name="theme-color" content="#14213d"><link rel="icon" href="/icons/icon-192.png" type="image/png"><style>${CSS}</style></head><body>
<a class="skip" href="#main">Skip to content</a>
<header class="hdr"><div class="wrap hdr__in"><a class="brand" href="/">${e(name)}</a>${phone ? `<a class="hdr__call" href="${telHref(phone)}">Call</a>` : `<a class="hdr__call" href="/#contact">Contact</a>`}</div></header>
<main id="main" class="sec"><div class="wrap narrow legal"><h1>${e(title)}</h1><p class="small muted">Last updated ${POLICIES_UPDATED}</p>${body}</div></main>
${footer(legal)}
</body></html>`;
  return new Response(html, { headers: HEADERS });
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
.brand{color:#fff;text-decoration:none;font-family:"Bricolage",system-ui,sans-serif;font-weight:800;font-size:1.15rem}
.hdr__call{color:var(--navy);background:var(--gold);text-decoration:none;font-weight:700;padding:10px 18px;border-radius:999px}
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
