import type { Action } from "./actions.ts";
import { action, reviewUrl } from "./actions.ts";
import { hasAnyHours, hoursSummary, weeklyRows } from "./hours.ts";
import { html, join, raw, type Html, type Raw } from "./html.ts";
import { icon, type IconName } from "./icons.ts";
import type { Theme } from "./themes.ts";
import type { BuildMode, BusinessRecord, Copy, Faq, Image, Site } from "./types.ts";

export interface Ctx {
  r: BusinessRecord;
  copy: Copy;
  theme: Theme;
  mode: BuildMode;
  site: Site;
  /** Required owner to-dos. Rendered in previews; publish fails while any exist. */
  todos: string[];
  /** Suggested owner to-dos. Rendered in previews only; never block publishing. */
  suggestions: string[];
  formEndpoint?: string;
  /** Live sites only: where the cookie-free visit counter sends page views and taps. */
  statsEndpoint?: string;
  hasForm: boolean;
}

export interface NavItem {
  label: string;
  href: string;
}

export function button(a: Action, variant: "primary" | "secondary" | "ghost" = "primary"): Raw {
  return html`<a class="btn btn--${variant}" href="${a.href}"${a.external ? raw(' target="_blank" rel="noopener"') : ""}>${icon(a.icon)}<span>${a.label}</span>${
    a.external ? html`<span class="sr"> (opens in new tab)</span>` : ""
  }</a>`;
}

export function todo(ctx: Ctx, title: string, body: string, required = false): Raw {
  (required ? ctx.todos : ctx.suggestions).push(title);
  if (ctx.mode === "publish") return raw("");
  return html`<div class="todo" data-todo><strong>${title}</strong>${body}</div>`;
}

export function sectionHead(label: string | undefined, title: string, intro?: string): Raw {
  return html`${label ? html`<span class="section__label">${label}</span>` : ""}<h2 class="section__title">${title}</h2>${
    intro ? html`<p class="lead">${intro}</p>` : ""
  }`;
}

export function header(ctx: Ctx, nav: NavItem[]): Raw {
  const call = action(ctx.r, "call")!;
  return html`<a class="skip" href="#main">Skip to content</a>
<header class="hdr"><div class="wrap hdr__in">
<a class="brand" href="/">${ctx.r.name}</a>
<a class="hdr__call" href="${call.href}" aria-label="Call ${ctx.r.phone.display}">${icon("phone")}<span>${ctx.r.phone.display}</span></a>
<button class="navbtn" type="button" data-nav-toggle aria-expanded="false" aria-controls="site-nav">${icon("menu", 26)}<span class="sr">Menu</span></button>
<nav class="nav" id="site-nav" aria-label="Main"><ul>${nav.map((n) => html`<li><a href="${n.href}">${n.label}</a></li>`)}</ul></nav>
</div></header>`;
}

export interface HeroOpts {
  eyebrow?: string;
  h1: string;
  sub: string;
  trust: string[];
  showStatus: boolean;
  actions: Action[];
  badge?: string;
}

export function hero(ctx: Ctx, o: HeroOpts): Raw {
  const img = ctx.r.media.hero;
  const showImg = img && (ctx.mode === "preview" || img.source !== "google");
  const cls = `hero hero--${ctx.theme.knobs.hero}${showImg ? " hero--photo" : ""}`;
  return html`<section class="${cls}" aria-labelledby="hero-title">
${showImg ? html`<div class="hero__media"><img src="${img!.src}" alt="" width="${img!.width ?? 1200}" height="${img!.height ?? 800}" fetchpriority="high" decoding="async"></div>` : ""}
<div class="hero__in">
${o.badge ? html`<p class="badge">${o.badge}</p>` : ""}
${o.eyebrow ? html`<p class="hero__eyebrow">${o.eyebrow}</p>` : ""}
<h1 id="hero-title">${o.h1}</h1>
<p class="hero__sub">${o.sub}</p>
${o.showStatus ? html`<p class="status" data-open-status hidden></p>` : ""}
${o.trust.length ? html`<ul class="hero__trust">${o.trust.map((t) => html`<li>${icon("check", 18)}${t}</li>`)}</ul>` : ""}
<div class="btns" data-hero-actions>${o.actions.map((a, i) => button(a, i === 0 ? "primary" : "ghost"))}</div>
</div>
${showImg && img!.attribution ? html`<p class="hero__credit">Photo: ${img!.attribution.uri ? html`<a href="${img!.attribution.uri}" target="_blank" rel="noopener">${img!.attribution.name}</a>` : img!.attribution.name}</p>` : ""}
</section>`;
}

export function infoStrip(ctx: Ctx, chips: string[]): Raw {
  const r = ctx.r;
  const call = action(r, "call")!;
  const dir = action(r, "directions")!;
  const addr = r.showStreetAddress && r.address.street ? `${r.address.street}, ${r.address.city}` : `${r.address.city}, ${r.address.state}`;
  return html`<div class="strip"><div class="strip__in">
<a class="strip__item" href="${dir.href}" target="_blank" rel="noopener">${icon("pin")}<span>${addr}<span class="sr"> (opens directions in new tab)</span></span></a>
<a class="strip__item" href="${call.href}">${icon("phone")}<span>${r.phone.display}</span></a>
${hasAnyHours(r.hours) ? html`<a class="strip__item" href="#visit">${icon("clock")}<span><span data-open-status hidden></span><span class="strip__more"> See all hours</span></span></a>` : ""}
${chips.length ? html`<ul class="chips" aria-label="Services">${chips.map((c) => html`<li class="chip">${icon("check", 16)}${c}</li>`)}</ul>` : ""}
</div></div>`;
}

export interface CardItem {
  title: string;
  body?: string;
  icon?: IconName;
  price?: string;
}

export function cardGrid(items: CardItem[], cols: 2 | 3 = 3): Raw {
  return html`<ul class="cards${cols === 3 ? " cards--3" : ""}">${items.map(
    (c) => html`<li class="card"><h3>${c.icon ? icon(c.icon) : ""}${c.title}</h3>${c.price ? html`<p class="price">${c.price}</p>` : ""}${
      c.body ? html`<p>${c.body}</p>` : ""
    }</li>`,
  )}</ul>`;
}

export function steps(items: Array<{ title: string; body: string }>): Raw {
  return html`<ol class="steps">${items.map((s) => html`<li><h3>${s.title}</h3><p>${s.body}</p></li>`)}</ol>`;
}

export function hoursTable(ctx: Ctx): Raw {
  const h = ctx.r.hours;
  if (!hasAnyHours(h)) return raw("");
  return html`<table class="hours"><caption class="sr">Opening hours</caption><tbody>${weeklyRows(h).map(
    (row) => html`<tr data-day="${row.day}"><th scope="row">${row.label}</th><td>${row.text}</td></tr>`,
  )}</tbody></table>${h.note ? html`<p class="muted">${h.note}</p>` : ""}`;
}

export function visit(ctx: Ctx, title = "Visit us"): Raw {
  const r = ctx.r;
  const dir = action(r, "directions")!;
  const call = action(r, "call")!;
  return html`<section class="section" id="visit" aria-labelledby="visit-title"><div class="wrap">
<span class="section__label">Hours &amp; location</span><h2 class="section__title" id="visit-title">${title}</h2>
<div class="visit"><div>${hoursTable(ctx)}${hasAnyHours(r.hours) ? "" : todo(ctx, "Add your hours", "Google doesn't list hours for you yet. Tell us your hours and we'll add them here.")}</div>
<div><address class="addr">${r.name}<br>${r.showStreetAddress && r.address.street ? html`${r.address.street}<br>` : ""}${r.address.city}, ${r.address.state} ${r.address.zip ?? ""}</address>
<p><a href="${call.href}">${r.phone.display}</a></p>
<div class="btns">${button(dir, "primary")}${button(call, "ghost")}</div></div></div>
</div></section>`;
}

export function serviceArea(ctx: Ctx): Raw {
  const sa = ctx.r.serviceArea;
  if (!sa || sa.towns.length === 0) return raw("");
  const county = sa.counties.length ? `${sa.counties.join(" & ")} ${sa.counties.length > 1 ? "counties" : "County"}` : undefined;
  return html`<section class="section section--band" id="area" aria-labelledby="area-title"><div class="wrap">
${sectionHead("Service area", county ? `Serving ${county}` : `Serving ${ctx.r.address.city} and nearby`, ctx.copy.serviceAreaIntro)}
<ul class="towns">${sa.towns.map((t) => html`<li class="chip">${icon("pin", 16)}${t}</li>`)}</ul>
<p>Not sure if we cover your area? <a href="${action(ctx.r, "call")!.href}">Call ${ctx.r.phone.display}</a> and ask.</p>
${ctx.r.confirmed.includes("service_area") ? "" : todo(ctx, "Confirm your service area", "We listed towns near you. Tell us which ones you actually cover.", true)}
</div></section>`;
}

export function reviews(ctx: Ctx, band = false): Raw {
  const r = ctx.r;
  const t = r.testimonials.slice(0, 3);
  const seeAll = r.mapsUrl;
  return html`<section class="section${band ? " section--band" : ""}" id="reviews" aria-labelledby="reviews-title"><div class="wrap">
${sectionHead("Reviews", "What customers say", r.reputation.displayMode === "owner_stated" && r.reputation.ownerStatedText ? r.reputation.ownerStatedText : undefined)}
${
  t.length
    ? html`<ul class="quotes">${t.map(
        (q) => html`<li><blockquote class="quote"><p>“${q.quote}”</p><footer>${q.displayName}${q.town ? `, ${q.town}` : ""}</footer></blockquote></li>`,
      )}</ul>`
    : todo(ctx, "Add 3 customer quotes", "Send us a few kind words from customers (with their OK) and we'll feature them here. We never copy Google reviews onto your site.")
}
<div class="btns"><a class="btn btn--secondary" href="${seeAll}" target="_blank" rel="noopener">${icon("star")}<span>See our reviews on Google</span><span class="sr"> (opens in new tab)</span></a>
<a class="btn btn--ghost" href="${reviewUrl(r)}" target="_blank" rel="noopener"><span>Leave us a review</span><span class="sr"> (opens in new tab)</span></a></div>
</div></section>`;
}

export function about(ctx: Ctx, title: string, label = "About us"): Raw {
  if (!ctx.copy.about.length) return raw("");
  return html`<section class="section" id="about" aria-labelledby="about-title"><div class="wrap narrow">
<span class="section__label">${label}</span><h2 class="section__title" id="about-title">${title}</h2>
${ctx.copy.about.map((p) => html`<p>${p}</p>`)}
${ctx.copy.approved ? "" : todo(ctx, "Tell us your story", "Who started it, when, and what you're proud of. We'll turn it into a short, warm About section.")}
</div></section>`;
}

export function faq(items: Faq[], band = false): Raw {
  if (items.length < 3) return raw("");
  return html`<section class="section${band ? " section--band" : ""}" id="faq" aria-labelledby="faq-title"><div class="wrap narrow">
<span class="section__label">FAQ</span><h2 class="section__title" id="faq-title">Questions we get a lot</h2>
<div class="faq">${items.map((f) => html`<details><summary>${f.q}</summary><p>${f.a}</p></details>`)}</div>
</div></section>`;
}

export interface FormField {
  name: "vehicle" | "frequency" | "home_size";
  label: string;
  options?: string[];
  autocomplete?: string;
}

export function contactForm(ctx: Ctx, services: string[], towns: string[], extra: FormField[] = [], intro = "Tell us what's going on and we'll call you back."): Raw {
  const r = ctx.r;
  const endpoint = ctx.formEndpoint ?? "/__preview/form";
  const q = action(r, "quote")!;
  return html`<section class="section section--band" id="contact" aria-labelledby="contact-title"><div class="wrap narrow">
${sectionHead("Contact", q.label, intro)}
<form class="form" method="post" action="${endpoint}">
<input type="hidden" name="place_id" value="${r.placeId}">
<label>Your name<input name="name" autocomplete="name" required></label>
<label>Phone<input name="phone" type="tel" autocomplete="tel" inputmode="tel" required></label>
<label>Email (optional)<input name="email" type="email" autocomplete="email"></label>
${services.length ? html`<label>What do you need?<select name="service"><option value="">Choose one</option>${services.map((s) => html`<option>${s}</option>`)}<option>Something else</option></select></label>` : ""}
${extra.map((f) =>
  f.options
    ? html`<label>${f.label}<select name="${f.name}"><option value="">Choose one</option>${f.options.map((o) => html`<option>${o}</option>`)}</select></label>`
    : html`<label>${f.label}<input name="${f.name}"${f.autocomplete ? raw(` autocomplete="${f.autocomplete}"`) : ""}></label>`,
)}
${towns.length ? html`<label>Town<select name="town"><option value="">Choose one</option>${towns.map((t) => html`<option>${t}</option>`)}<option>Other</option></select></label>` : ""}
<label>Details (optional)<textarea name="message"></textarea></label>
<label class="hp" aria-hidden="true">Leave this empty<input name="website" tabindex="-1" autocomplete="off"></label>
<button class="btn btn--primary" type="submit">Send request</button>
<p class="form__alt">Or call <a href="${action(r, "call")!.href}">${r.phone.display}</a>${r.smsEnabled ? html` or <a href="${action(r, "text")!.href}">text us</a>` : ""}.</p>
</form>
</div></section>`;
}

export function ctaBand(ctx: Ctx, acts: Action[]): Raw {
  return html`<section class="cta" aria-labelledby="cta-title"><div class="wrap narrow">
<h2 id="cta-title">${ctx.copy.ctaTitle}</h2><p>${ctx.copy.ctaLine}</p>
<div class="btns">${acts.map((a, i) => button(a, i === 0 ? "primary" : "ghost"))}</div>
</div></section>`;
}

export function footer(ctx: Ctx, nav: NavItem[]): Raw {
  const r = ctx.r;
  const social = Object.entries(r.links.social).filter(([, u]) => u) as Array<[string, string]>;
  const label: Record<string, string> = { facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", nextdoor: "Nextdoor" };
  const where =
    r.showStreetAddress && r.address.street
      ? html`${r.address.street}<br>${r.address.city}, ${r.address.state} ${r.address.zip ?? ""}`
      : html`${r.address.county ? `Serving ${r.address.county} County, ${r.address.state}` : `${r.address.city}, ${r.address.state}`}`;
  return html`<footer class="ftr"><div class="wrap">
<div class="ftr__grid">
<div><h2>${r.name}</h2><address style="font-style:normal">${where}</address><p><a href="${action(r, "call")!.href}">${r.phone.display}</a></p></div>
<div>${hasAnyHours(r.hours) ? html`<h2>Hours</h2><p>${hoursSummary(r.hours)}</p>` : ""}${
    r.licenses.length ? html`<p>${r.licenses.map((l) => `${l.label} #${l.number}`).join(" · ")}</p>` : ""
  }</div>
<div><h2>Links</h2><ul>${nav.map((n) => html`<li><a href="${n.href}">${n.label}</a></li>`)}${social.map(
    ([k, u]) => html`<li><a href="${u}" target="_blank" rel="noopener">${label[k] ?? k}<span class="sr"> (opens in new tab)</span></a></li>`,
  )}<li><a href="${r.mapsUrl}" target="_blank" rel="noopener">Google reviews<span class="sr"> (opens in new tab)</span></a></li></ul></div>
</div>
<p class="ftr__legal">© <span data-year>${new Date().getFullYear()}</span> ${r.name}${ctx.hasForm ? html` · <a href="/privacy/">Privacy</a>` : ""}</p>
</div></footer>`;
}

export function actionBar(acts: Action[]): Raw {
  return html`<nav class="bar" aria-label="Quick actions">${acts
    .slice(0, 3)
    .map(
      (a) =>
        html`<a href="${a.href}"${a.external ? raw(' target="_blank" rel="noopener"') : ""}>${icon(a.icon)}<span>${a.short}</span>${
          a.external ? html`<span class="sr"> (opens in new tab)</span>` : ""
        }</a>`,
    )}</nav>`;
}

export function imageTag(img: Image, opts: { lazy?: boolean; cls?: string } = {}): Html {
  return html`<img src="${img.src}" alt="${img.alt}"${img.width ? raw(` width="${img.width}" height="${img.height}"`) : ""}${
    opts.lazy === false ? "" : raw(' loading="lazy" decoding="async"')
  }${opts.cls ? raw(` class="${opts.cls}"`) : ""}>`;
}

export { join };
