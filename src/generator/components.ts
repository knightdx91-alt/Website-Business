import type { Action } from "./actions.ts";
import { action, reviewUrl } from "./actions.ts";
import { hasAnyHours, hoursSummary, weeklyRows } from "./hours.ts";
import { html, join, raw, type Html, type Raw } from "./html.ts";
import { icon, type IconName } from "./icons.ts";
import type { Dna } from "./dna.ts";
import type { Theme } from "./themes.ts";
import type { BuildMode, BusinessRecord, Copy, EventItem, Faq, Guarantee, Image, License, Offer, Plan, Site } from "./types.ts";

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
  /** Set by hero() when it shows the open/closed pill, so the info strip shows today's hours instead of repeating it. */
  statusShown?: boolean;
  /** Set once announcements() rendered, so render.ts doesn't add the section twice. */
  eventsShown?: boolean;
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
  const r = ctx.r;
  const call = action(r, "call")!;
  // "utility" top bar: a thin line of facts above the header (address, today's hours, Español, phone).
  const addr = r.showStreetAddress && r.address.street ? `${r.address.street}, ${r.address.city}` : `${r.address.city}, ${r.address.state}`;
  const util =
    ctx.theme.dna.nav === "utility"
      ? html`<div class="util"><div class="wrap util__in"><span>${icon("pin", 16)}${addr}</span>${hasAnyHours(r.hours) ? html`<span>${icon("clock", 16)}<span data-today-hours>Hours</span></span>` : ""}${
          ctx.copy.es ? html`<a href="/es/" lang="es">Español</a>` : ""
        }<a href="${call.href}">${icon("phone", 16)}${r.phone.display}</a></div></div>`
      : "";
  return html`<a class="skip" href="#main">Skip to content</a>${util}
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
  /** Shops: the street address in the first screen (research: shoppers need it before anything else). */
  address?: boolean;
}

/** Owner proof as trust-row lines: "Best of the Best 2024", "Cullman Chamber member", "40 dealers". Nothing invented. */
export function ownerProof(r: BusinessRecord): string[] {
  const p = r.proof;
  if (!p) return [];
  return [
    ...(p.awards ?? []).map((a) => (a.year ? `${a.name} ${a.year}` : a.name)),
    ...(p.memberships ?? []).map((m) => (/\b(member|association|chamber)\b/i.test(m) ? m : `${m} member`)),
    ...(p.stats ?? []).map((st) => `${st.value} ${st.label}`),
  ].filter(Boolean);
}

/** "Trusted by …": named clients the owner has permission to list, as a quiet line under the opening. */
function clientsLine(r: BusinessRecord): Raw {
  const c = (r.proof?.clients ?? []).filter(Boolean);
  if (!c.length) return raw("");
  return html`<div class="proof proof--clients"><div class="proof__in"><p class="proof__clients"><strong>Trusted by</strong> ${c.join(" · ")}</p></div></div>`;
}

export function hero(ctx: Ctx, o: HeroOpts): Raw {
  const r = ctx.r;
  const dna = ctx.theme.dna;
  const img = r.media.hero;
  const showImg = !!img && (ctx.mode === "preview" || img.source !== "google");
  // The DNA's opening; the photo-led kinds need a photo, so they fall back to a plain kind without one.
  let kind = dna.hero;
  if (kind === "cover" && !showImg) kind = "stack";
  if (kind === "card" && !showImg) kind = "banner";
  // Headline strategy: what + where (default), the business name, or the promise line from the copy.
  let h1Text = o.h1;
  let eyebrowText = o.eyebrow;
  let subText = o.sub;
  const promise = ctx.copy.heroTagline;
  if (kind === "billboard" || dna.headline === "name") {
    h1Text = r.name;
    eyebrowText = o.h1;
  } else if (dna.headline === "promise" && promise && promise.length <= 72) {
    h1Text = promise;
    eyebrowText = o.h1;
    subText = o.sub === promise ? ctx.copy.heroSub : o.sub;
  } else if ((dna.headline === "question" || dna.headline === "benefit") && headlineLine(ctx.copy, dna.headline)) {
    // A question ("Is your AC blowing warm air?") or a benefit ("Take your weekend back"); without the copy field it stays "what + where".
    h1Text = headlineLine(ctx.copy, dna.headline)!;
    eyebrowText = o.h1;
  }
  const backdrop = showImg && (kind === "stack" || kind === "cover");
  const cls = `hero hero--${ctx.theme.knobs.hero}${backdrop ? " hero--photo" : ""} hero--${kind}`;
  const imgAttrs = raw(`src="${img?.src ?? ""}" alt="" width="${img?.width ?? 1200}" height="${img?.height ?? 800}" decoding="async"`);
  const media = backdrop ? html`<div class="hero__media"><img ${imgAttrs} fetchpriority="high"></div>` : "";
  const photo = showImg && !backdrop ? html`<div class="ph"><img ${imgAttrs} fetchpriority="high"></div>` : "";
  const credit = showImg && img!.attribution ? html`<p class="hero__credit">Photo: ${img!.attribution.uri ? html`<a href="${img!.attribution.uri}" target="_blank" rel="noopener">${img!.attribution.name}</a>` : img!.attribution.name}</p>` : "";
  const badge = o.badge ? html`<p class="badge">${o.badge}</p>` : "";
  const eyebrow = eyebrowText ? html`<p class="hero__eyebrow">${eyebrowText}</p>` : "";
  const h1 = html`<h1 id="hero-title">${h1Text}</h1>`;
  const addrLine = o.address && r.showStreetAddress && r.address.street ? html`<p class="hero__addr">${icon("pin", 18)}<a href="${action(r, "directions")!.href}" target="_blank" rel="noopener">${r.address.street}, ${r.address.city}<span class="sr"> (opens directions in new tab)</span></a></p>` : "";
  const sub = html`${subText ? html`<p class="hero__sub">${subText}</p>` : ""}${addrLine}`;
  const status = o.showStatus ? html`<p class="status" data-open-status hidden></p>` : "";
  if (o.showStatus && hasAnyHours(r.hours)) ctx.statusShown = true;
  // Proof up top: the Google rating, when it's good and based on enough reviews (never for categories that can't show reviews).
  const rep = r.reputation;
  const proof = ctx.reviewsAllowed !== false && rep.rating && rep.count && rep.rating >= 4.3 && rep.count >= 10 && r.mapsUrl
    ? html`<li class="hero__proof"><a href="${r.mapsUrl}" target="_blank" rel="noopener">${icon("star", 18)}${rep.rating.toFixed(1)} on Google · ${rep.count} reviews<span class="sr"> (opens in new tab)</span></a></li>`
    : "";
  // Owner proof (awards, memberships, stats) joins the pack's trust lines; the pack's own lines come first.
  const trustItems = [...o.trust, ...ownerProof(r).filter((t) => !o.trust.includes(t))];
  // Proof either rides in the opening (trust row) or gets its own band right under it.
  const bandProof = dna.proof === "band" && !!(proof || trustItems.length);
  const trust = !bandProof && (trustItems.length || proof) ? html`<ul class="hero__trust">${proof}${trustItems.map((t) => html`<li>${icon("check", 18)}${t}</li>`)}</ul>` : "";
  const band = html`${
    bandProof
      ? html`<div class="proof"><div class="proof__in">${
          proof && rep.rating && rep.count
            ? html`<div class="proof__rating"><a href="${r.mapsUrl}" target="_blank" rel="noopener">${icon("star", 28)}<strong>${rep.rating.toFixed(1)}</strong><span>${rep.count} Google reviews<span class="sr"> (opens in new tab)</span></span></a></div>`
            : ""
        }${trustItems.length ? html`<ul class="proof__list">${trustItems.map((t) => html`<li>${icon("check", 18)}${t}</li>`)}</ul>` : ""}</div></div>`
      : ""
  }${clientsLine(r)}`;
  // Texting is how many people would rather reach a plumber or a barber: when the number takes texts and the
  // buttons don't already offer it, a quiet line under them does, without a third stacked button.
  const btns = html`<div class="btns" data-hero-actions>${o.actions.map((a, i) => button(a, i === 0 ? "primary" : "ghost"))}</div>${textLine(ctx, o.actions)}`;
  const body = heroBody(kind);
  return html`${body}${band}`;

  function heroBody(kind: Dna["hero"]): Raw {
  switch (kind) {
    case "card":
      // The photo first, full width; then a card with everything else floating up over its bottom edge.
      return html`<section class="${cls}" aria-labelledby="hero-title">
<div class="hero__photo">${photo}</div>
<div class="hero__in"><div class="hero__card">${badge}${eyebrow}${h1}${sub}${status}${trust}${btns}</div></div>
${credit}
</section>`;
    case "billboard":
      // The name as the sign: huge, then what they do and the facts in a row under it; the photo as a band below.
      return html`<section class="${cls}" aria-labelledby="hero-title"><div class="hero__in">${badge}${eyebrow}${h1}<div class="hero__bb">${sub}${status}${trust}${btns}</div></div></section>
${photo ? html`<div class="hero__band">${photo}${credit}</div>` : ""}`;
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
${hasAnyHours(r.hours) ? html`<a class="strip__item" href="#visit">${icon("clock")}<span>${ctx.statusShown ? html`<span data-today-hours>Hours</span>` : html`<span data-open-status hidden></span>`}<span class="strip__more"> See all hours</span></span></a>` : ""}
${chips.length ? html`<ul class="chips" aria-label="Services">${chips.map((c) => html`<li class="chip">${icon("check", 16)}${c}</li>`)}</ul>` : ""}
${closureNote(r)}
</div></div>`;
}

const DAY_MS = 86_400_000;
/** Closures that haven't passed, soonest first. */
export function upcomingClosures(r: BusinessRecord, today = todayIso(r.timezone)): Array<{ date: string; label: string }> {
  return (r.closures ?? []).filter((c) => /^\d{4}-\d{2}-\d{2}$/.test(c.date) && c.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8);
}

export function closureText(c: { date: string; label: string }): string {
  const d = eventDate(c.date);
  return /^clos/i.test(c.label) ? `${c.label} ${d.mon} ${d.day}` : `Closed ${d.mon} ${d.day} for ${c.label}`;
}

/** The next closure, as one line in the info strip when it's within a week (the page shows/hides it by date too). */
function closureNote(r: BusinessRecord): Raw {
  const next = upcomingClosures(r)[0];
  if (!next) return raw("");
  const soon = Date.parse(next.date) - Date.parse(todayIso(r.timezone)) <= 7 * DAY_MS;
  return html`<p class="strip__note" data-soon="${next.date}"${soon ? "" : raw(" hidden")}>${icon("calendar", 16)}<span>${closureText(next)}</span></p>`;
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
    case "table":
      // A price list with dot leaders; without prices it reads as a tidy ruled index.
      return html`<ul class="svc svc--table">${items.map(
        (it) => html`<li><div class="svc__row"><h3>${it.title}</h3><span class="svc__dots" aria-hidden="true"></span>${it.price ? html`<span class="price">${it.price}</span>` : ""}</div>${body(it.body)}</li>`,
      )}</ul>`;
    case "scroller":
      return html`<div class="svc svc--scroll" tabindex="0" role="region" aria-label="Services, swipe to see more"><ul>${items.map(
        (it) => html`<li>${it.icon ? html`<span class="svc__i">${icon(it.icon, 30)}</span>` : ""}<h3>${it.title}${price(it.price)}</h3>${body(it.body)}</li>`,
      )}</ul></div>`;
    default:
      return cardGrid(items, cols);
  }
}

/** Today in the business's time zone as YYYY-MM-DD (Cullman: America/Chicago). */
export function todayIso(tz = "America/Chicago", now = new Date()): string {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${g("year")}-${g("month")}-${g("day")}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function eventDate(iso: string): { mon: string; day: string; wd: string } {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  return { mon: MONTHS[m! - 1] ?? "", day: String(d), wd: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dt.getUTCDay()]! };
}

/** Events that haven't ended yet, soonest first. */
export function upcomingEvents(r: BusinessRecord, today = todayIso()): EventItem[] {
  return (r.events ?? []).filter((e) => (e.endDate ?? e.date) >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8);
}

/**
 * "What's happening": dated events, specials, deadlines. Shows only what hasn't ended (the page also hides
 * items whose end date passes while it's live). Packs call it where it fits; render.ts adds it near the top
 * otherwise. Nothing renders without events.
 */
export function announcements(ctx: Ctx, o: { label?: string; title?: string; intro?: string } = {}): Raw {
  const items = upcomingEvents(ctx.r);
  if (!items.length) return raw("");
  ctx.eventsShown = true;
  return html`<section class="section section--band" id="events" aria-labelledby="events-title"><div class="wrap">
${sectionHead(o.label ?? "What's happening", o.title ?? "Coming up", o.intro, "events-title")}
<ul class="events">${items.map((e) => {
    const d = eventDate(e.date);
    const end = e.endDate && e.endDate !== e.date ? eventDate(e.endDate) : undefined;
    return html`<li class="event" data-event-end="${e.endDate ?? e.date}"><time class="event__date" datetime="${e.date}"><span class="event__mon">${d.mon}</span><span class="event__day">${d.day}</span><span class="event__wd">${end ? `to ${end.mon} ${end.day}` : d.wd}</span></time><div class="event__body"><h3>${e.url ? html`<a href="${e.url}" target="_blank" rel="noopener">${e.title}<span class="sr"> (opens in new tab)</span></a>` : e.title}</h3>${
      e.time ? html`<p class="event__time">${e.time}</p>` : ""
    }${e.detail ? html`<p>${e.detail}</p>` : ""}</div></li>`;
  })}</ul>
</div></section>`;
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
${visitExtras(ctx)}
<div class="btns">${button(dir, "primary")}${button(call, "ghost")}</div></div></div>
</div></section>`;
}

/** Closures, how to pay and where to park: owner-entered lines under the address. Nothing renders when empty. */
export function visitExtras(ctx: Ctx): Raw {
  const r = ctx.r;
  const closures = upcomingClosures(r);
  const pay = (r.visit?.paymentMethods ?? []).filter(Boolean);
  return html`${closures.length ? html`<ul class="closures" aria-label="Upcoming closures">${closures.map((c) => html`<li data-until="${c.date}">${icon("calendar", 16)}<span>${closureText(c)}</span></li>`)}</ul>` : ""}${
    pay.length ? html`<p class="visit__line"><strong>We take:</strong> ${pay.join(", ")}</p>` : ""
  }${r.visit?.parking ? html`<p class="visit__line"><strong>Parking:</strong> ${r.visit.parking}</p>` : ""}`;
}

/** A labeled list of owner-stated lines ("Deposit: …", "Cancellations: …"); rows with no text are skipped. */
export function factList(items: Array<{ label: string; text?: string }>): Raw {
  const rows = items.filter((i) => i.text);
  if (!rows.length) return raw("");
  return html`<dl class="facts">${rows.map((i) => html`<div><dt>${i.label}</dt><dd>${i.text}</dd></div>`)}</dl>`;
}

/** Photo tiles (menu favorites, team): an image when there is one, a colored block otherwise. */
export function tiles(items: Array<{ title: string; body?: string; price?: string; image?: Image; href?: string; tags?: string[] }>): Raw {
  return html`<ul class="tiles">${items.map(
    (t) => html`<li class="tile${t.image ? "" : " tile--text"}">${t.image ? imageTag(t.image, { cls: "tile__img" }) : ""}<div class="tile__body"><h3>${t.href ? html`<a href="${t.href}">${t.title}</a>` : t.title}${t.price ? html`<span class="price">${t.price}</span>` : ""}</h3>${
      t.tags?.length ? html`<p class="tags">${t.tags.map((g) => html`<span class="tag">${g}</span>`)}</p>` : ""
    }${t.body ? html`<p>${t.body}</p>` : ""}</div></li>`,
  )}</ul>`;
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

export function about(ctx: Ctx, title: string, label = "About us", extra?: Raw): Raw {
  if (!ctx.copy.about.length) return raw("");
  return html`<section class="section" id="about" aria-labelledby="about-title"><div class="wrap narrow">
<span class="section__label">${label}</span><h2 class="section__title" id="about-title">${title}</h2>
${ctx.copy.about.map((p) => html`<p>${p}</p>`)}
${extra ?? ""}
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
  name:
    | "vehicle"
    | "frequency"
    | "home_size"
    | "property"
    | "quantity"
    | "year"
    | "make"
    | "model"
    | "part"
    | "items"
    | "address"
    | "best_day"
    | "event_date"
    | "guests"
    | "needs"
    | "location"
    | "occasion"
    | "budget_range"
    | "needed_by"
    | "placements"
    | "artwork_status"
    | "rush"
    | "booth"
    | "reach"
    | "urgent"
    | "facility"
    | "sq_ft";
  label: string;
  options?: string[];
  /** Preselected option (selects only). */
  value?: string;
  /** Input type for text fields; "date" gives the phone's date picker. */
  type?: "date" | "text";
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
  /** With a texting number: "Faster: text us a photo of <this>" under the form, e.g. "the problem" or "your yard". */
  photoHint?: string;
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
    ? html`<label>${f.label}<select name="${f.name}"${f.required ? raw(" required") : ""}><option value="">Choose one</option>${f.options.map((o) => html`<option${o === f.value ? raw(" selected") : ""}>${o}</option>`)}</select></label>`
    : html`<label>${f.label}<input name="${f.name}"${f.type ? raw(` type="${f.type}"`) : ""}${f.autocomplete ? raw(` autocomplete="${f.autocomplete}"`) : ""}${f.inputmode ? raw(` inputmode="${f.inputmode}"`) : ""}${f.required ? raw(" required") : ""}></label>`,
)}
${towns.length ? html`<label>Town<select name="town"><option value="">Choose one</option>${towns.map((t) => html`<option>${t}</option>`)}<option>Other</option></select></label>` : ""}
<label>${opts.details ?? "Details"} (optional)<textarea name="message"></textarea></label>
<label class="hp" aria-hidden="true">Leave this empty<input name="website" tabindex="-1" autocomplete="off"></label>
<button class="btn btn--primary" type="submit">${opts.button ?? "Send request"}</button>
<p class="form__alt">Or call <a href="${action(r, "call")!.href}">${r.phone.display}</a>${r.smsEnabled ? html` or <a href="${action(r, "text")!.href}">text us</a>` : ""}.</p>
${opts.photoHint && r.smsEnabled ? html`<p class="form__alt">Faster: <a href="${action(r, "text")!.href}">text us a photo of ${opts.photoHint}</a> at ${r.phone.display}.</p>` : ""}
</form>
</div></section>`;
}

export function ctaBand(ctx: Ctx, acts: Action[]): Raw {
  return html`<section class="cta cta--${ctx.theme.dna.cta}" aria-labelledby="cta-title"><div class="wrap${ctx.theme.dna.cta === "band" ? " narrow" : ""}">
<h2 id="cta-title">${ctx.copy.ctaTitle}</h2><p>${ctx.copy.ctaLine}</p>
<div class="btns">${acts.map((a, i) => button(a, i === 0 ? "primary" : "ghost"))}</div>${textLine(ctx, acts)}
</div></section>${TEXT_ASK.has(ctx.r.category) && !ctx.r.smsEnabled ? todoBlock(ctx, "Can customers text this number?", "Lots of people would rather text a photo of the problem than call. If this number takes texts, tick \"This number takes texts\" in Edit and the site gets a Text us button.") : ""}`;
}

/** Categories where a Text us button is worth asking the owner about (print asks in its own artwork section). */
const TEXT_ASK = new Set(["contractor", "salon", "auto", "cleaning", "landscaping"]);

/** "Or text us" under a button row, when the number takes texts and no button already says so. */
function textLine(ctx: Ctx, acts: Action[]): Raw {
  const text = action(ctx.r, "text");
  return text && !acts.some((a) => a.id === "text") ? html`<p class="hero__alt">Or text us: <a href="${text.href}">${ctx.r.phone.display}</a></p>` : raw("");
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
${ctx.theme.dna.footer === "bigcta" ? html`<div class="ftr__cta"><p>${ctx.copy.ctaTitle}</p>${button(action(r, "call")!, "primary")}</div>` : ""}${
    ctx.theme.dna.footer === "bigname" ? html`<p class="ftr__name" aria-hidden="true">${r.name}</p>` : ""
  }
<div class="ftr__grid">
<div><h2>${r.name}</h2><address style="font-style:normal">${where}</address><p><a href="${action(r, "call")!.href}">${r.phone.display}</a></p></div>
<div>${hasAnyHours(r.hours) ? html`<h2>Hours</h2><p>${hoursSummary(r.hours)}</p>` : ""}${
    r.licenses.length ? html`<p>${r.licenses.map((l) => licenseText(l, r)).join(" · ")}</p>` : ""
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
  const shown = acts.slice(0, 4);
  return html`<nav class="bar${shown.length > 3 ? " bar--4" : ""}" aria-label="Quick actions">${shown
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
  // Before/after pairs first (the "after" photo leaves the grid), then the rest with their captions.
  const pairs = photoPairs(photos);
  const inPair = new Set(pairs.flatMap((p) => [p.before, p.after]));
  const rest = photos.filter((p) => !inPair.has(p));
  const cap = (p: Image) => [p.caption, p.town].filter(Boolean).join(", ");
  return html`<section class="section" id="photos" aria-labelledby="photos-title"><div class="wrap">
${sectionHead("Photos", pairs.length ? "Before and after" : "Take a look", undefined, "photos-title")}
${pairs.length ? html`<ul class="pairs">${pairs.map(
    (p) => html`<li class="pair"><div class="pair__pics"><figure><img src="${p.before.src}" alt="${p.before.alt}"${p.before.width ? raw(` width="${p.before.width}" height="${p.before.height}"`) : ""} loading="lazy" decoding="async"><figcaption>Before</figcaption></figure><figure><img src="${p.after.src}" alt="${p.after.alt}"${p.after.width ? raw(` width="${p.after.width}" height="${p.after.height}"`) : ""} loading="lazy" decoding="async"><figcaption>After</figcaption></figure></div>${
      cap(p.before) || cap(p.after) ? html`<p class="pair__cap">${cap(p.before) || cap(p.after)}</p>` : ""
    }</li>`,
  )}</ul>` : ""}
${rest.length ? html`<ul class="gallery${pairs.length ? " gallery--more" : ""}">${rest.map((p) => html`<li>${cap(p) ? html`<figure>${imageTag(p)}<figcaption>${cap(p)}</figcaption></figure>` : imageTag(p)}</li>`)}</ul>` : ""}
</div></section>`;
}

/** The file name a gallery photo is known by in Edit and in `Image.pairWith`: "/assets/owner/g3.jpg" → "g3". */
export function photoKey(src: string): string {
  return (src.split("/").pop() ?? src).split(".")[0] ?? src;
}

/** Before/after pairs among the photos: each "before" names its "after" by file key; dangling or self pairs are ignored. */
export function photoPairs(photos: Image[]): Array<{ before: Image; after: Image }> {
  const byKey = new Map(photos.map((p) => [photoKey(p.src), p]));
  const used = new Set<Image>();
  const out: Array<{ before: Image; after: Image }> = [];
  for (const p of photos) {
    if (!p.pairWith || used.has(p)) continue;
    const after = byKey.get(p.pairWith);
    if (!after || after === p || used.has(after)) continue;
    used.add(p);
    used.add(after);
    out.push({ before: p, after });
  }
  return out;
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

/* ---------- shared modules added Oct 2026 (research/trends-2026/trades-lawn-cleaning.md §5) ---------- */

/** The headline line a DNA headline form uses, when the copy has it and it's short enough to be a headline. */
export function headlineLine(copy: Copy, form: "question" | "benefit"): string | undefined {
  const t = (form === "question" ? copy.heroQuestion : copy.heroBenefit)?.trim();
  return t && t.length <= 72 ? t : undefined;
}

/** "AL Plumbing License #123", or "AL# 123" wording where Alabama's HVAC board wants it (and whenever the label says Alabama/HVAC). */
export function licenseText(l: License, r?: BusinessRecord): string {
  const al = /\b(alabama|al|hvac|heating|refrigeration)\b/i.test(l.label) || (r?.category === "contractor" && r.variant === "hvac");
  return al ? `${l.label} AL# ${l.number}` : `${l.label} #${l.number}`;
}

export interface PlansOpts {
  label?: string;
  title?: string;
  intro?: string;
  /** Section id (default "plans"). */
  id?: string;
  /** A to-do rendered under the cards, e.g. "check these ways to work with us". */
  todo?: Raw;
}

/** "from $49" for a bare amount, else the owner's own words ("Flat $150", "Call for pricing"). */
function planPrice(p: Plan): string | undefined {
  const t = p.price?.trim();
  if (!t) return undefined;
  return /^\$?\d/.test(t) ? `from ${t.startsWith("$") ? t : `$${t}`}` : t;
}

/**
 * Plans & pricing: 1–3 cards (memberships, recurring tiers, "ways to work with us"), each with an optional
 * starting price, an inclusion checklist and a badge. Prices show with a "starting points" line. Nothing without plans.
 */
export function plans(ctx: Ctx, o: PlansOpts = {}, items: Plan[] | undefined = ctx.r.plans): Raw {
  const list = (items ?? []).filter((p) => p.name).slice(0, 3);
  if (!list.length) return raw("");
  const id = o.id ?? "plans";
  const anyPrice = list.some((p) => planPrice(p));
  const quote = action(ctx.r, "quote")!;
  return html`<section class="section" id="${id}" aria-labelledby="${id}-title"><div class="wrap">
${sectionHead(o.label ?? "Plans & pricing", o.title ?? "Pick what fits", o.intro, `${id}-title`)}
<ul class="plans plans--${list.length}">${list.map((p) => {
    const price = planPrice(p);
    return html`<li class="plan${p.badge ? " plan--badged" : ""}">${p.badge ? html`<span class="plan__badge">${p.badge}</span>` : ""}<h3>${p.name}</h3>${
      price ? html`<p class="plan__price"><strong>${price}</strong>${p.unit ? html`<span>/${p.unit}</span>` : ""}</p>` : ""
    }${p.includes.length ? html`<ul class="plan__list">${p.includes.map((i) => html`<li>${icon("check", 18)}${i}</li>`)}</ul>` : ""}${p.note ? html`<p class="plan__note">${p.note}</p>` : ""}</li>`;
  })}</ul>
${anyPrice ? html`<p class="plans__note">Prices are starting points; we'll confirm after a quick look.</p>` : ""}
<div class="btns">${button(quote, "primary")}${button(action(ctx.r, "call")!, "ghost")}</div>
${o.todo ?? ""}
</div></section>`;
}

/** The guarantee as one sentence in the owner's words, or nothing when none is set. */
export function guaranteeLine(g: Guarantee | undefined): string | undefined {
  if (!g) return undefined;
  const text = g.text?.trim();
  if (text) return text;
  const w = g.window?.trim();
  const rem = g.remedy?.trim().replace(/\.$/, "");
  if (w && rem) return `Not happy? Tell us within ${w} and ${rem}.`;
  if (rem) return `Not happy? ${rem.charAt(0).toUpperCase()}${rem.slice(1)}.`;
  if (w) return `Not happy? Tell us within ${w} and we'll make it right.`;
  return undefined;
}

/** Short chip wording: "24-hour guarantee" from a window of "24 hours", else "Satisfaction guarantee". */
export function guaranteeChip(g: Guarantee | undefined): string | undefined {
  if (!guaranteeLine(g)) return undefined;
  const w = g!.window?.trim();
  if (!w) return "Satisfaction guarantee";
  const m = /^(\d+)\s*[- ]?\s*(hour|day|week)s?$/i.exec(w);
  return `${m ? `${m[1]}-${m[2]!.toLowerCase()}` : w} guarantee`;
}

/** One-line band for the services section. */
export function guaranteeBand(ctx: Ctx): Raw {
  const line = guaranteeLine(ctx.r.guarantee);
  return line ? html`<p class="guarantee">${icon("check", 22)}<span><strong>Our guarantee.</strong> ${line}</span></p>` : raw("");
}

export function guaranteeFaq(r: BusinessRecord): Faq | undefined {
  const line = guaranteeLine(r.guarantee);
  return line ? { q: "What if I'm not happy with the work?", a: line } : undefined;
}

/** Offers that haven't expired, in the order the owner listed them. */
export function activeOffers(r: BusinessRecord, today = todayIso()): Offer[] {
  return (r.offers ?? []).filter((o) => o.title && (!o.expiresOn || o.expiresOn >= today) && (!o.startsOn || o.startsOn <= today)).slice(0, 6);
}

function offerMeta(o: Offer): Raw {
  const bits: Raw[] = [];
  if (o.code) bits.push(html`<span class="offer__code">Code <strong>${o.code}</strong></span>`);
  if (o.expiresOn) {
    const d = eventDate(o.expiresOn);
    bits.push(html`<span>Through ${d.mon} ${d.day}</span>`);
  }
  return bits.length ? html`<span class="offer__meta">${join(bits, " · ")}</span>` : raw("");
}

/** A thin promo bar under the opening with the first active offer (the page hides it itself once it expires). */
export function promoBar(ctx: Ctx): Raw {
  const o = activeOffers(ctx.r)[0];
  if (!o) return raw("");
  return html`<div class="promo"${o.expiresOn ? raw(` data-event-end="${o.expiresOn}"`) : ""}><div class="wrap promo__in">${icon("star", 18)}<span><strong>${o.title}</strong>${o.detail ? html` · ${o.detail}` : ""}</span>${offerMeta(o)}<a href="${action(ctx.r, "quote")!.href}">Claim it</a></div></div>`;
}

/** The rest of the offers (after the one in the bar) as cards; with `all`, every active offer. Nothing without offers. */
export function offersSection(ctx: Ctx, o: { all?: boolean; label?: string; title?: string } = {}): Raw {
  const items = activeOffers(ctx.r).slice(o.all ? 0 : 1);
  if (!items.length) return raw("");
  return html`<section class="section section--band" id="offers" aria-labelledby="offers-title"><div class="wrap">
${sectionHead(o.label ?? "Specials", o.title ?? "Current offers", undefined, "offers-title")}
<ul class="offers">${items.map((x) => html`<li class="offer"${x.expiresOn ? raw(` data-event-end="${x.expiresOn}"`) : ""}><h3>${x.title}</h3>${x.detail ? html`<p>${x.detail}</p>` : ""}${offerMeta(x)}</li>`)}</ul>
<p class="muted">Mention the offer when you call or send a request.</p>
</div></section>`;
}

export { join };
