import { billingOptions, getSettings, type AppSettings } from "./db.ts";
import { newId, now, type Env } from "./env.ts";
import { escHtml as e } from "./page.ts";

/** Underground Associates' own website, served on the company domain from live Settings (prices, phone, email). */
export const COMPANY_HOSTS = ["undergroundassociates.com", "www.undergroundassociates.com"];
const ORIGIN = "https://undergroundassociates.com";

/** Contact form posts land in the app inbox under this pseudo lead id. */
export const COMPANY_LEAD_ID = "company";

const CATEGORIES = ["Restaurants & cafes", "Food trucks", "Contractors", "Salons & barbers", "Nail salons", "Pet groomers", "Auto repair", "Landscaping & lawn care", "Cleaning services"];

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

function faq(s: AppSettings): Array<[string, string]> {
  const min = s.minMonths ?? 12;
  return [
    ["Do I have to pay before I see it?", "No. We build a preview of your website first, for free. You look it over on your phone, and you only pay if you want it to go live."],
    ["What if I already have a Facebook page?", "Keep it. Your website links to it. A website gives customers who don't use Facebook a simple place to find your hours, number and services, and it helps you show up on Google."],
    [
      "Is there a contract?",
      min
        ? `Our standard plan has a ${min}-month minimum, then you can cancel any time with 30 days' notice.${s.flexSetup ? ` Rather not commit? Month to month is available with a one-time ${money(s.flexSetup)} setup fee.` : ""}${s.annualMonthsFree ? ` Paying yearly gets you ${s.annualMonthsFree} months free.` : ""}`
        : "No. Cancel any time with 30 days' notice.",
    ],
    ["Who owns my content?", "You do. Your business name, logo, photos and text belong to you. If you have your own web address, it stays in your name."],
    ["Can you use my own photos?", "Yes, and we recommend it. Send us photos of your place, your work and your team and we'll put them in."],
    ["Can you help with my Google listing?", "Yes. Our Plus and Pro plans include a Google Business Profile tune-up, and Pro includes monthly posts and photo updates."],
    ["Where are you?", "We're based in Cullman, Alabama, and we work with businesses across Cullman County and the towns around it. We're happy to stop by."],
  ];
}

export async function serveCompany(env: Env, req: Request, url: URL): Promise<Response | null> {
  if (url.hostname === "www.undergroundassociates.com") return Response.redirect(`${ORIGIN}${url.pathname}${url.search}`, 301);
  const path = url.pathname;
  if (path === "/contact" && req.method === "POST") return contactPost(env, req);
  if (path === "/robots.txt") return new Response(`User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`, { headers: { "content-type": "text/plain" } });
  if (path === "/sitemap.xml") {
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${ORIGIN}/</loc></url></urlset>\n`, { headers: { "content-type": "application/xml" } });
  }
  // Fonts and icons come from the app's static assets.
  if (path.startsWith("/fonts/") || path.startsWith("/icons/")) return null;
  if (path !== "/" || req.method !== "GET") return new Response(null, { status: 302, headers: { location: "/" } });
  return home(env, url);
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
  const extras = plans[0] ? billingOptions(plans[0], s).filter((o) => o.id !== "standard") : [];
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
<meta name="theme-color" content="#14213d"><link rel="icon" href="/icons/icon-192.png" type="image/png">
<link rel="preload" href="/fonts/bricolage-grotesque-latin-800-normal.woff2" as="font" type="font/woff2" crossorigin>
<style>${CSS}</style><script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script></head><body>
<a class="skip" href="#main">Skip to content</a>
<header class="hdr"><div class="wrap hdr__in"><a class="brand" href="/">${e(name)}</a>${phone ? `<a class="hdr__call" href="${telHref(phone)}">Call</a>` : `<a class="hdr__call" href="#contact">Contact</a>`}</div></header>
<main id="main">
<section class="hero"><div class="wrap">
<p class="eyebrow">Websites for Cullman-area businesses</p>
<h1>See your new website <span class="hl">before you pay</span> a dime.</h1>
<p class="lead">We build your website first, free. If you like it, it goes live${lowest ? ` from ${money(lowest)} a month` : ""}, with hosting, updates and support included. No setup fee on our standard plan.</p>
<div class="btns"><a class="btn" href="#contact">Get my free preview</a>${callBtn}</div>
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

${plans.length ? `<section class="sec" id="plans"><div class="wrap">
<h2>Simple monthly plans</h2>
<p class="lead">${(s.minMonths ?? 12) ? `No setup fee with our standard ${s.minMonths ?? 12}-month plan.` : "No setup fee. Cancel any time."}${extras.length ? ` Also available: ${extras.map((o) => e(o.label.toLowerCase())).join(" or ")}.` : ""}</p>
<div class="grid plans">${plans
        .map(
          (p) => `<div class="card plan${p.id === "plus" ? " plan--pick" : ""}">${p.id === "plus" ? `<p class="tag">Most popular</p>` : ""}<h3>${e(p.name)}</h3>
<p class="price">${money(p.monthly)}<span>/month</span></p>${p.setup ? `<p class="small">${money(p.setup)} setup</p>` : ""}
<ul>${p.includes.split(/\n/).map((x) => x.trim()).filter(Boolean).map((x) => `<li>${e(x)}</li>`).join("")}</ul></div>`,
        )
        .join("")}</div>
${s.addons.length ? `<p class="small muted">Extras: ${s.addons.map((a) => `${e(a.name)} (${money(a.price)}${a.unit === "month" ? "/month" : a.unit === "each" ? " each" : ""})`).join(" · ")}</p>` : ""}
</div></section>` : ""}

<section class="sec sec--alt" id="who"><div class="wrap">
<h2>Who we work with</h2>
<p class="lead">Independent local businesses in Cullman, Hanceville, Good Hope, Vinemont, Hartselle, Arab and nearby, including:</p>
<ul class="chips">${CATEGORIES.map((c) => `<li>${e(c)}</li>`).join("")}</ul>
</div></section>

<section class="sec" id="faq"><div class="wrap narrow">
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
</div></section>
</main>
<footer class="ftr"><div class="wrap">© ${new Date().getFullYear()} ${e(legal)} · Cullman, Alabama</div></footer>
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
.ftr{background:#0d1629;color:#aeb7c8;padding:24px 0;font-size:.92rem}
.bar{position:fixed;left:0;right:0;bottom:0;display:flex;background:var(--navy);padding:8px 8px calc(8px + env(safe-area-inset-bottom));gap:8px;z-index:6}
.bar a{flex:1;text-align:center;min-height:48px;display:flex;align-items:center;justify-content:center;border-radius:10px;font-weight:700;text-decoration:none;background:var(--gold);color:var(--navy)}
.bar a+a{background:#fff}
@media (min-width:760px){.bar{display:none}}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}`;
