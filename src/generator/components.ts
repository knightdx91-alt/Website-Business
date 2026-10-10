import type { Action } from "./actions.ts";
import { action, reviewUrl } from "./actions.ts";
import { hasAnyHours, hoursSummary, weeklyRows } from "./hours.ts";
import { html, join, raw, type Html, type Raw } from "./html.ts";
import { icon, type IconName } from "./icons.ts";
import type { Dna } from "./dna.ts";
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
  /** Set once the photo gallery is on the page, so render.ts doesn't add it twice. */
  galleryShown?: boolean;
  credit?: { company: string; url: string; changeUrl: string };
  /** False for categories that may not show reviews anywhere (financial advisors, churches). */
  reviewsAllowed?: boolean;
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

/** Label, heading and intro of a section. Pass the id a section's aria-labelledby points at so the heading carries it. */
export function sectionHead(label: string | undefined, title: string, intro?: string, id?: string): Raw {
  return html`${label ? html`<span class="section__label">${label}</span>` : ""}<h2 class="section__title"${id ? raw(` id="${id}"`) : ""}>${title}</h2>${
    intro ? html`<p class="lead">${intro}</p>` : ""
  }`;
}

/** A to-do in its own `.wrap`, or nothing at all when it isn't rendered (published sites get no empty wrapper). */
export function todoBlock(ctx: Ctx, title: string, body: string, required = false): Raw {
  const t = todo(ctx, title, body, required);
  return t.value ? html`<div class="wrap">${t}</div>` : raw("");
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
  const r = ctx.r;
  const img = r.media.hero;
  const showImg = !!img && (ctx.mode === "preview" || img.source !== "google");
  // The DNA's opening; a full-screen photo needs a photo, so it falls back to the classic stack without one.
  let kind = ctx.theme.dna.hero;
  if (kind === "cover" && !showImg) kind = "stack";
  const backdrop = showImg && (kind === "stack" || kind === "cover");
  const cls = `hero hero--${ctx.theme.knobs.hero}${backdrop ? " hero--photo" : ""} hero--${kind}`;
  const imgAttrs = raw(`src="${img?.src ?? ""}" alt="" width="${img?.width ?? 1200}" height="${img?.height ?? 800}" decoding="async"`);
  const media = backdrop ? html`<div class="hero__media"><img ${imgAttrs} fetchpriority="high"></div>` : "";
  const photo = showImg && !backdrop ? html`<div class="ph"><img ${imgAttrs} fetchpriority="high"></div>` : "";
  const credit = showImg && img!.attribution ? html`<p class="hero__credit">Photo: ${img!.attribution.uri ? html`<a href="${img!.attribution.uri}" target="_blank" rel="noopener">${img!.attribution.name}</a>` : img!.attribution.name}</p>` : "";
  const badge = o.badge ? html`<p class="badge">${o.badge}</p>` : "";
  const eyebrow = o.eyebrow ? html`<p class="hero__eyebrow">${o.eyebrow}</p>` : "";
  const h1 = html`<h1 id="hero-title">${o.h1}</h1>`;
  const sub = html`<p class="hero__sub">${o.sub}</p>`;
  const status = o.showStatus ? html`<p class="status" data-open-status hidden></p>` : "";
  // Proof up top: the Google rating, when it's good and based on enough reviews (never for categories that can't show reviews).
  const rep = r.reputation;
  const proof = ctx.reviewsAllowed !== false && rep.rating && rep.count && rep.rating >= 4.3 && rep.count >= 10 && r.mapsUrl
    ? html`<li class="hero__proof"><a href="${r.mapsUrl}" target="_blank" rel="noopener">${icon("star", 18)}${rep.rating.toFixed(1)} on Google · ${rep.count} reviews<span class="sr"> (opens in new tab)</span></a></li>`
    : "";
  const trust = o.trust.length || proof ? html`<ul class="hero__trust">${proof}${o.trust.map((t) => html`<li>${icon("check", 18)}${t}</li>`)}</ul>` : "";
  const btns = html`<div class="btns" data-hero-actions>${o.actions.map((a, i) => button(a, i === 0 ? "primary" : "ghost"))}</div>`;
  switch (kind) {
    case "split": {
      // Headline on the left; an "at a glance" panel (photo, open/closed, hours, address, phone, buttons) on the right.
      const dir = action(r, "directions")!;
      const call = action(r, "call")!;
      const addr = r.showStreetAddress && r.address.street ? `${r.address.street}, ${r.address.city}` : `${r.address.city}, ${r.address.state}`;
      return html`<section class="${cls}" aria-labelledby="hero-title">
<div class="hero__in hero__grid"><div class="hero__text">${badge}${eyebrow}${h1}${sub}${trust}</div>
<aside class="hero__panel" aria-label="At a glance">${photo}${status}${hasAnyHours(r.hours) ? html`<p class="hero__row">${icon("clock")}<span>${hoursSummary(r.hours)}</span></p>` : ""}
<p class="hero__row">${icon("pin")}<a href="${dir.href}" target="_blank" rel="noopener">${addr}<span class="sr"> (opens directions in new tab)</span></a></p>
<p class="hero__row">${icon("phone")}<a href="${call.href}">${r.phone.display}</a></p>${btns}</aside></div>
</section>`;
    }
    case "banner":
      // A short color band with the name and headline, then the details (and the photo) on the page background.
      return html`<section class="${cls}" aria-labelledby="hero-title"><div class="hero__in">${badge}${eyebrow}${h1}</div></section>
<div class="lede"><div class="lede__in"><div>${sub}${status}${trust}${btns}</div>${photo ? html`<div>${photo}${credit}</div>` : ""}</div></div>`;
    case "statement":
      // Big words on the hero color, no photo behind them; the photo (if any) runs as a wide band underneath.
      return html`<section class="${cls}" aria-labelledby="hero-title"><div class="hero__in">${badge}${eyebrow}${h1}${sub}${status}${btns}${trust}</div></section>
${photo ? html`<div class="hero__band">${photo}${credit}</div>` : ""}`;
    default:
      return html`<section class="${cls}" aria-labelledby="hero-title">
${media}
<div class="hero__in">
${badge}${eyebrow}${h1}${sub}${status}${trust}${btns}
</div>
${credit}
</section>`;
  }
}

export function infoStrip(ctx: Ctx, chips: string[]): Raw {
  const r = ctx.r;
  const kind = ctx.theme.dna.strip;
  if (kind === "none") return raw("");
  const call = action(r, "call")!;
  const dir = action(r, "directions")!;
  const addr = r.showStreetAddress && r.address.street ? `${r.address.street}, ${r.address.city}` : `${r.address.city}, ${r.address.state}`;
  return html`<div class="strip strip--${kind}"><div class="strip__in">
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

/**
 * The main services section in the shape the DNA chose: cards (classic), a ruled list, compact tiles,
 * tap-to-expand rows or text columns. Same items, same copy; only the structure changes.
 */
export function serviceList(ctx: Ctx, items: CardItem[], cols: 2 | 3 = 3): Raw {
  const price = (p?: string) => (p ? html`<span class="price">${p}</span>` : "");
  const body = (b?: string) => (b ? html`<p>${b}</p>` : "");
  switch (ctx.theme.dna.services) {
    case "list":
      return html`<ul class="svc svc--list">${items.map((it) => html`<li><span class="svc__i">${it.icon ? icon(it.icon, 28) : ""}</span><div><h3>${it.title}${price(it.price)}</h3>${body(it.body)}</div></li>`)}</ul>`;
    case "tiles":
      return html`<ul class="svc svc--tiles">${items.map((it) => html`<li>${it.icon ? html`<span class="svc__i">${icon(it.icon, 34)}</span>` : ""}<h3>${it.title}</h3>${price(it.price)}${body(it.body)}</li>`)}</ul>`;
    case "accordion":
      return html`<div class="svc svc--acc">${items.map(
        (it, i) => html`<details${i === 0 ? raw(" open") : ""}><summary><h3>${it.icon ? html`<span class="svc__i">${icon(it.icon, 22)}</span>` : ""}${it.title}${price(it.price)}</h3></summary>${body(it.body)}</details>`,
      )}</div>`;
    case "columns":
      return html`<div class="svc svc--cols">${items.map((it) => html`<div><h3>${it.title}${price(it.price)}</h3>${body(it.body)}</div>`)}</div>`;
    default:
      return cardGrid(items, cols);
  }
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

/**
 * Hours and address for storefront businesses. Google's hours are used when it has them; otherwise the owner is asked
 * for theirs (a suggestion, never a publish blocker) and the section is a single column so no empty box ships.
 */
export function visit(ctx: Ctx, title = "Visit us"): Raw {
  const r = ctx.r;
  const dir = action(r, "directions")!;
  const call = action(r, "call")!;
  const hasHours = hasAnyHours(r.hours);
  const hoursTodo = hasHours ? raw("") : todo(ctx, "Add your hours", "Google doesn't list hours for you yet. Tell us your hours and we'll add them here.");
  const left = hasHours ? hoursTable(ctx) : hoursTodo;
  return html`<section class="section" id="visit" aria-labelledby="visit-title"><div class="wrap">
<span class="section__label">Hours &amp; location</span><h2 class="section__title" id="visit-title">${title}</h2>
<div class="visit${left.value ? "" : " visit--solo"}">${left.value ? html`<div>${left}</div>` : ""}
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
${sectionHead("Service area", county ? `Serving ${county}` : `Serving ${ctx.r.address.city} and nearby`, ctx.copy.serviceAreaIntro, "area-title")}
<ul class="towns">${sa.towns.map((t) => html`<li class="chip">${icon("pin", 16)}${t}</li>`)}</ul>
<p>Not sure if we cover your area? <a href="${action(ctx.r, "call")!.href}">Call ${ctx.r.phone.display}</a> and ask.</p>
${ctx.r.confirmed.includes("service_area") ? "" : todo(ctx, "Confirm your service area", "We listed towns near you. Tell us which ones you actually cover.", true)}
${hasAnyHours(ctx.r.hours) ? "" : todo(ctx, "Add your hours", "Tell us the days and hours you take calls and we'll show them in the footer and on Google.")}
</div></section>`;
}

export function reviews(ctx: Ctx, band = false): Raw {
  const r = ctx.r;
  const t = r.testimonials.slice(0, 3);
  const seeAll = r.mapsUrl;
  const intro = r.reputation.displayMode === "owner_stated" && r.reputation.ownerStatedText ? r.reputation.ownerStatedText : undefined;
  const btns = html`<div class="btns"><a class="btn btn--secondary" href="${seeAll}" target="_blank" rel="noopener">${icon("star")}<span>See our reviews on Google</span><span class="sr"> (opens in new tab)</span></a>
<a class="btn btn--ghost" href="${reviewUrl(r)}" target="_blank" rel="noopener"><span>Leave us a review</span><span class="sr"> (opens in new tab)</span></a></div>`;
  if (!t.length && ctx.mode === "publish") {
    // No quotes yet on a live site: a short band that sends people to Google instead of an empty grid.
    return html`<section class="section${band ? " section--band" : ""}" id="reviews" aria-labelledby="reviews-title"><div class="wrap narrow">
${sectionHead("Reviews", "Read our reviews on Google", intro ?? "See what customers say about us, and tell us how we did.", "reviews-title")}
${btns}
</div></section>`;
  }
  return html`<section class="section${band ? " section--band" : ""}" id="reviews" aria-labelledby="reviews-title"><div class="wrap">
${sectionHead("Reviews", "What customers say", intro, "reviews-title")}
${
  t.length
    ? html`<ul class="quotes">${t.map(
        (q) => html`<li><blockquote class="quote"><p>“${q.quote}”</p><footer>${q.displayName}${q.town ? `, ${q.town}` : ""}</footer></blockquote></li>`,
      )}</ul>`
    : todo(ctx, "Add 3 customer quotes", "Send us a few kind words from customers (with their OK) and we'll feature them here. We never copy Google reviews onto your site.")
}
${btns}
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

export function faq(items: Faq[], band = false, label = "FAQ", title = "Questions we get a lot"): Raw {
  if (items.length < 3) return raw("");
  return html`<section class="section${band ? " section--band" : ""}" id="faq" aria-labelledby="faq-title"><div class="wrap narrow">
<span class="section__label">${label}</span><h2 class="section__title" id="faq-title">${title}</h2>
<div class="faq">${items.map((f) => html`<details><summary>${f.q}</summary><p>${f.a}</p></details>`)}</div>
</div></section>`;
}

export interface FormField {
  /** Every name here must also be in FIELDS in src/worker/forms.ts, or the live site drops it. */
  name: "vehicle" | "frequency" | "home_size" | "property" | "quantity" | "year" | "make" | "model" | "part" | "items" | "address" | "best_day";
  label: string;
  options?: string[];
  autocomplete?: string;
  required?: boolean;
  inputmode?: string;
}

export interface ContactFormOpts {
  /** Section id and the heading's aria id; the default form is #contact. */
  id?: string;
  label?: string;
  /** Heading; defaults to the record's quote action label ("Request an appointment", "Get a quote"…). */
  title?: string;
  /** Stored with the submission and shown in the Inbox, e.g. "Reserve a part". */
  topic?: string;
  button?: string;
  /** Label for the Details box; it is optional in every form. */
  details?: string;
}

export function contactForm(ctx: Ctx, services: string[], towns: string[], extra: FormField[] = [], intro = "Tell us what's going on and we'll call you back.", opts: ContactFormOpts = {}): Raw {
  const r = ctx.r;
  const endpoint = ctx.formEndpoint ?? "/__preview/form";
  const q = action(r, "quote")!;
  const id = opts.id ?? "contact";
  return html`<section class="section section--band" id="${id}" aria-labelledby="${id}-title"><div class="wrap narrow">
${sectionHead(opts.label ?? "Contact", opts.title ?? q.label, intro, `${id}-title`)}
<form class="form" method="post" action="${endpoint}">
<input type="hidden" name="place_id" value="${r.placeId}">
${opts.topic ? html`<input type="hidden" name="topic" value="${opts.topic}">` : ""}
<label>Your name<input name="name" autocomplete="name" required></label>
<label>Phone<input name="phone" type="tel" autocomplete="tel" inputmode="tel" required></label>
<label>Email (optional)<input name="email" type="email" autocomplete="email"></label>
${services.length ? html`<label>What do you need?<select name="service"><option value="">Choose one</option>${services.map((s) => html`<option>${s}</option>`)}<option>Something else</option></select></label>` : ""}
${extra.map((f) =>
  f.options
    ? html`<label>${f.label}<select name="${f.name}"${f.required ? raw(" required") : ""}><option value="">Choose one</option>${f.options.map((o) => html`<option>${o}</option>`)}</select></label>`
    : html`<label>${f.label}<input name="${f.name}"${f.autocomplete ? raw(` autocomplete="${f.autocomplete}"`) : ""}${f.inputmode ? raw(` inputmode="${f.inputmode}"`) : ""}${f.required ? raw(" required") : ""}></label>`,
)}
${towns.length ? html`<label>Town<select name="town"><option value="">Choose one</option>${towns.map((t) => html`<option>${t}</option>`)}<option>Other</option></select></label>` : ""}
<label>${opts.details ?? "Details"} (optional)<textarea name="message"></textarea></label>
<label class="hp" aria-hidden="true">Leave this empty<input name="website" tabindex="-1" autocomplete="off"></label>
<button class="btn btn--primary" type="submit">${opts.button ?? "Send request"}</button>
<p class="form__alt">Or call <a href="${action(r, "call")!.href}">${r.phone.display}</a>${r.smsEnabled ? html` or <a href="${action(r, "text")!.href}">text us</a>` : ""}.</p>
</form>
</div></section>`;
}

export function ctaBand(ctx: Ctx, acts: Action[]): Raw {
  return html`<section class="cta cta--${ctx.theme.dna.cta}" aria-labelledby="cta-title"><div class="wrap${ctx.theme.dna.cta === "band" ? " narrow" : ""}">
<h2 id="cta-title">${ctx.copy.ctaTitle}</h2><p>${ctx.copy.ctaLine}</p>
<div class="btns">${acts.map((a, i) => button(a, i === 0 ? "primary" : "ghost"))}</div>
</div></section>`;
}

export function footer(ctx: Ctx, nav: NavItem[], extra: { note?: Raw; reviews?: boolean } = {}): Raw {
  const r = ctx.r;
  const social = Object.entries(r.links.social).filter(([, u]) => u) as Array<[string, string]>;
  const label: Record<string, string> = { facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", nextdoor: "Nextdoor" };
  const where =
    r.showStreetAddress && r.address.street
      ? html`${r.address.street}<br>${r.address.city}, ${r.address.state} ${r.address.zip ?? ""}`
      : html`${r.address.county ? `Serving ${r.address.county} County, ${r.address.state}` : `${r.address.city}, ${r.address.state}`}`;
  return html`<footer class="ftr ftr--${ctx.theme.dna.footer}"><div class="wrap">
${ctx.theme.dna.footer === "bigcta" ? html`<div class="ftr__cta"><p>${ctx.copy.ctaTitle}</p>${button(action(r, "call")!, "primary")}</div>` : ""}
<div class="ftr__grid">
<div><h2>${r.name}</h2><address style="font-style:normal">${where}</address><p><a href="${action(r, "call")!.href}">${r.phone.display}</a></p></div>
<div>${hasAnyHours(r.hours) ? html`<h2>Hours</h2><p>${hoursSummary(r.hours)}</p>` : ""}${
    r.licenses.length ? html`<p>${r.licenses.map((l) => `${l.label} #${l.number}`).join(" · ")}</p>` : ""
  }</div>
<div><h2>Links</h2><ul>${nav.map((n) => html`<li><a href="${n.href}">${n.label}</a></li>`)}${social.map(
    ([k, u]) => html`<li><a href="${u}" target="_blank" rel="noopener">${label[k] ?? k}<span class="sr"> (opens in new tab)</span></a></li>`,
  )}${extra.reviews === false ? "" : html`<li><a href="${r.mapsUrl}" target="_blank" rel="noopener">Google reviews<span class="sr"> (opens in new tab)</span></a></li>`}</ul></div>
</div>
${extra.note ?? ""}
<p class="ftr__legal">© <span data-year>${new Date().getFullYear()}</span> ${r.name}${ctx.hasForm ? html` · <a href="/privacy/">Privacy</a>` : ""}${
    ctx.credit ? html` · Website by <a href="${ctx.credit.url}">${ctx.credit.company}</a> · <a href="${ctx.credit.changeUrl}" rel="nofollow">Request a change</a>` : ""
  }</p>
</div></footer>`;
}

export function actionBar(acts: Action[], dna?: Dna): Raw {
  if (dna?.bar === "fab") {
    const call = acts.find((a) => a.href.startsWith("tel:")) ?? acts[0];
    if (!call) return raw("");
    return html`<nav class="bar bar--fab" aria-label="Quick actions"><a href="${call.href}">${icon(call.icon)}<span>${call.short}</span></a></nav>`;
  }
  return html`<nav class="bar" aria-label="Quick actions">${acts
    .slice(0, 3)
    .map(
      (a) =>
        html`<a href="${a.href}"${a.external ? raw(' target="_blank" rel="noopener"') : ""}>${icon(a.icon)}<span>${a.short}</span>${
          a.external ? html`<span class="sr"> (opens in new tab)</span>` : ""
        }</a>`,
    )}</nav>`;
}

/** Owner photos in a grid, or (with none yet) the pack's "send us photos" to-do in its place. */
export function gallery(ctx: Ctx, todoTitle?: string, todoBody?: string): Raw {
  const photos = ctx.r.media.gallery.filter((p) => ctx.mode === "preview" || p.source !== "google");
  if (!photos.length) return todoTitle ? todoBlock(ctx, todoTitle, todoBody ?? "") : raw("");
  ctx.galleryShown = true;
  return html`<section class="section" id="photos" aria-labelledby="photos-title"><div class="wrap">
${sectionHead("Photos", "Take a look", undefined, "photos-title")}
<ul class="gallery">${photos.map((p) => html`<li>${imageTag(p)}</li>`)}</ul>
</div></section>`;
}

/** "We're hiring": the jobs the owner listed and how to apply (call, text or email). */
export function hiring(ctx: Ctx): Raw {
  const h = ctx.r.hiring;
  if (!h || !h.roles.length) return raw("");
  const r = ctx.r;
  const text = action(r, "text");
  return html`<section class="section section--band" id="jobs" aria-labelledby="jobs-title"><div class="wrap narrow">
${sectionHead("Jobs", "We're hiring", h.how || "Want to work with us? Get in touch.", "jobs-title")}
<ul class="towns">${h.roles.map((role) => html`<li class="chip">${icon("check", 16)}${role}</li>`)}</ul>
<div class="btns"><a class="btn btn--secondary" href="${action(r, "call")!.href}">${icon("phone")}<span>Call about a job</span></a>${
    text ? html`<a class="btn btn--ghost" href="${text.href}"><span>Text us</span></a>` : ""
  }${r.email ? html`<a class="btn btn--ghost" href="mailto:${r.email}?subject=${encodeURIComponent("Job application")}"><span>Email us</span></a>` : ""}</div>
</div></section>`;
}

export function imageTag(img: Image, opts: { lazy?: boolean; cls?: string } = {}): Html {
  return html`<img src="${img.src}" alt="${img.alt}"${img.width ? raw(` width="${img.width}" height="${img.height}"`) : ""}${
    opts.lazy === false ? "" : raw(' loading="lazy" decoding="async"')
  }${opts.cls ? raw(` class="${opts.cls}"`) : ""}>`;
}

export { join };
