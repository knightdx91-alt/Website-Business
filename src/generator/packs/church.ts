import { action, actions, type ActionId } from "../actions.ts";
import { about, announcements, button, cardGrid, chips, ctaBand, faq, gallery, hero, hoursTable, sectionHead, todo, type Ctx, serviceList } from "../components.ts";
import { hasAnyHours } from "../hours.ts";
import { html, jsonForScript, raw, type Raw } from "../html.ts";
import { icon } from "../icons.ts";
import type { BusinessRecord, ChurchScheduleRow, Faq, Service } from "../types.ts";
import { fitTitle, type CategoryPack } from "./types.ts";

/**
 * Churches and community nonprofits (research/churches-nonprofits.md): church, civic_post (VFW, Legion, Lions, lodges…),
 * charity (food pantries, clothes closets…) and community_center. Service times, beliefs, the pastor, tradition label,
 * giving and help details always come from the organization; the AI only writes a welcome. Never doctrine.
 */

const EXCLUDE_TYPES = /^(school|primary_school|secondary_school|preschool|child_care_agency|cemetery|funeral_home|hospital|government_office|local_government_office|city_hall|tourist_attraction|mosque|synagogue|hindu_temple|buddhist_temple|shinto_shrine|restaurant|fast_food_restaurant)$/;
const EXCLUDE_NAME =
  /\b(abbey|monastery|convent|shrine|grotto|retreat center|family history center|kingdom hall|latter-day saints|school|academy|preschool|day ?care|child care|camp|association|diocese|conference|alcoholics anonymous|narcotics anonymous|al-anon|aa meeting|shelter|safe house|recovery residence|church's chicken)\b/;
/** Multi-site churches that already run good sites (§10). */
const MULTI_SITE = ["daystar", "temple baptist", "liberty church", "connect church", "church of the highlands", "highlands college", "friendship church"];

const CIVIC = /\b(vfw|veterans of foreign wars|american legion|legion post|amvets|dav|disabled american veterans|lions club|rotary|kiwanis|civitan|ruritan|optimist club|exchange club|jaycees|masonic|lodge (no\.?|#) ?\d+|f ?& ?a ?m|eastern star|elks|moose lodge|knights of columbus|shriners|woodmen)\b/;
const CHARITY = /\b(food pantry|food bank|food distribution|pantry|soup kitchen|cloth(es|ing) closet|closet|blessing box|feeding|meals|caring (center|place)|helping hands|benevolence|crisis center|rescue mission|outreach center|ministry center|churches involved|mission)\b/;
const CENTER = /\b(community (center|club|house)|civic center|fellowship hall)\b/;
const CHURCH = /\b(church|chapel|tabernacle|temple|assembly|fellowship|ministries|parish|cathedral|congregation|worship center|revival center|house of prayer|iglesia|ministerio|templo|casa de oraci[oó]n)\b/;

/** §10 assignment: names decide before types for civic and charity; types gate church. null = not ours. */
export function churchVariant(primaryType: string | undefined, types: string[], name: string): string | null {
  const all = [primaryType ?? "", ...types].filter(Boolean);
  const n = name.toLowerCase().replace(/[’‘]/g, "'");
  if (all.some((t) => EXCLUDE_TYPES.test(t)) && !CIVIC.test(n)) return null;
  if (EXCLUDE_NAME.test(n) && !/\bmissionary\b/.test(n)) return null;
  if (MULTI_SITE.some((m) => n.includes(m))) return null;
  if (CIVIC.test(n)) return "civic_post";
  if (CHARITY.test(n.replace(/\bmissionary\b/g, "")) || all.includes("non_profit_organization")) return "charity";
  if (all.includes("community_center") || CENTER.test(n)) return "community_center";
  if (all.includes("church") || ((all.includes("place_of_worship") || all.includes("association_or_organization")) && CHURCH.test(n)) || CHURCH.test(n)) return "church";
  return null;
}

/** A suggested label from the name only ("Missionary Baptist church"). The church confirms it; it never claims affiliation. */
export function suggestTradition(name: string): { tradition: string; label: string } {
  const n = name.toLowerCase();
  const m = (re: RegExp) => re.exec(name)?.[0];
  if (/\bbaptist\b/.test(n)) {
    const kind = m(/\b(missionary|free will|primitive|independent|freewill|southern|first) baptist/i);
    return { tradition: "baptist", label: kind && !/first|southern/i.test(kind) ? `${kind.replace(/^\w/, (c) => c.toUpperCase())} church` : "Baptist church" };
  }
  if (/\bmethodist\b|\bumc\b/.test(n)) return { tradition: "methodist", label: "Methodist church" };
  if (/\bchurch(es)? of christ\b/.test(n) && !/united church of christ/.test(n)) return { tradition: "church_of_christ", label: "Church of Christ" };
  if (/\bchurch of god\b/.test(n)) return { tradition: "pentecostal", label: "Church of God" };
  if (/\bassembl(y|ies) of god\b/.test(n)) return { tradition: "pentecostal", label: "Assembly of God" };
  if (/\b(pentecostal|apostolic|holiness|full gospel|foursquare|revival center)\b/.test(n)) return { tradition: "pentecostal", label: "Church" };
  if (/\bcatholic\b|\bour lady\b|\bsacred heart\b/.test(n)) return { tradition: "catholic", label: "Catholic church" };
  if (/\bepiscopal\b/.test(n)) return { tradition: "episcopal_anglican", label: "Episcopal church" };
  if (/\banglican\b/.test(n)) return { tradition: "episcopal_anglican", label: "Anglican church" };
  if (/\bpresbyterian\b/.test(n)) return { tradition: "presbyterian", label: "Presbyterian church" };
  if (/\blutheran\b/.test(n)) return { tradition: "lutheran", label: "Lutheran church" };
  if (/\bnazarene\b/.test(n)) return { tradition: "nazarene_wesleyan", label: "Church of the Nazarene" };
  if (/\bwesleyan\b/.test(n)) return { tradition: "nazarene_wesleyan", label: "Wesleyan church" };
  if (/\borthodox\b/.test(n)) return { tradition: "orthodox", label: "Orthodox church" };
  if (/\bcowboy church\b/.test(n)) return { tradition: "cowboy", label: "Cowboy church" };
  return { tradition: "nondenominational", label: "Church" };
}

/** What kind of civic group, from the name, for labels and program seeds. */
function civicKind(name: string): "veterans" | "lions" | "service_club" | "lodge" {
  const n = name.toLowerCase();
  if (/\b(vfw|veterans|legion|amvets|dav)\b/.test(n)) return "veterans";
  if (/\blions\b/.test(n)) return "lions";
  if (/\b(masonic|lodge|f ?& ?a ?m|eastern star|elks|moose|knights of columbus|shriners|woodmen)\b/.test(n)) return "lodge";
  return "service_club";
}

const SCHEDULE_SEEDS: Record<string, string[]> = {
  baptist: ["Sunday School", "Morning Worship", "Evening Worship", "Wednesday Prayer & Bible Study"],
  methodist: ["Sunday School", "Worship", "Wednesday Night"],
  church_of_christ: ["Bible Class", "Worship", "Sunday Evening Worship", "Wednesday Bible Class"],
  pentecostal: ["Sunday Worship", "Sunday Evening", "Wednesday Night Service"],
  catholic: ["Saturday Vigil Mass", "Sunday Mass", "Weekday Mass", "Confession"],
  default: ["Sunday Service", "Wednesday Night"],
};

const SEEDS: Record<string, string[]> = {
  church: ["Sunday School & Bible classes", "Kids", "Students", "Women", "Men", "Senior adults", "Music & choir", "Missions & outreach"],
  veterans: ["Honor guard & funeral honors", "Memorial Day & Veterans Day", "Flag retirement", "Scholarships", "Helping veterans & families", "Hall rental"],
  lions: ["Eyeglass recycling", "Vision screening", "Scholarships", "Community fundraisers"],
  service_club: ["Scholarships", "Community projects", "Youth programs", "Fundraisers"],
  lodge: ["Charity work", "Scholarships", "Community events", "Hall rental"],
  charity: ["Food", "Clothing", "Hygiene items", "Help finding other services"],
  community_center: ["Hall rental", "Community gatherings", "Reunions & parties", "Meetings"],
};

const slug = (name: string) => name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function seedChurchServices(variant: string, name: string): Service[] {
  const key = variant === "civic_post" ? civicKind(name) : variant;
  return (SEEDS[key] ?? SEEDS.church!).map((n) => ({ id: slug(n), name: n, featured: true }));
}

export function churchScheduleSeeds(tradition: string): string[] {
  return SCHEDULE_SEEDS[tradition] ?? SCHEDULE_SEEDS.default!;
}

const KIND_LABEL: Record<string, string> = { veterans: "Veterans' post", lions: "Lions Club", service_club: "Service club", lodge: "Lodge" };
function label(r: BusinessRecord): string {
  const c = r.ext.church ?? {};
  if (r.variant === "church") return c.traditionConfirmed && c.traditionLabel ? c.traditionLabel : "Church";
  if (r.variant === "civic_post") return KIND_LABEL[civicKind(r.name)]!;
  if (r.variant === "charity") return /pantry|food/i.test(r.name) ? "Food pantry" : /closet|cloth/i.test(r.name) ? "Clothes closet" : "Community ministry";
  return "Community center";
}

function first(r: BusinessRecord): ActionId[] {
  if (r.variant === "church") return r.ext.church?.liveUrl ? ["visit", "directions", "watch"] : ["visit", "directions"];
  if (r.variant === "civic_post") return ["join", "call"];
  if (r.variant === "charity") return ["help", "call"];
  return ["rent", "call"];
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** A schedule row as a weekday + minutes, when both can be read ("Sunday | 10:30 AM"); rows like "Weekdays" or "Time?" are skipped. */
export function parseScheduleRow(row: ChurchScheduleRow): { d: number; m: number } | null {
  const d = DAYS.findIndex((n) => new RegExp(`^${n.slice(0, 3)}`, "i").test(row.day.trim()));
  const t = /^(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?$/i.exec(row.time.trim());
  if (d < 0 || !t) return null;
  let h = Number(t[1]);
  const min = Number(t[2] ?? 0);
  const ap = t[3]?.toLowerCase().replace(/\./g, "");
  if (h > 23 || min > 59) return null;
  if (ap === "pm" && h < 12) h += 12;
  else if (ap === "am" && h === 12) h = 0;
  // No AM/PM given: church times from 1 to 7 are evenings (6:30 Wednesday), 8 to 12 are mornings.
  else if (!ap && h >= 1 && h <= 7) h += 12;
  return { d, m: h * 60 + min };
}

/** Confirmed rows with a time, in week order. */
function timedRows(r: BusinessRecord): ChurchScheduleRow[] {
  const c = r.ext.church ?? {};
  return c.scheduleConfirmed ? (c.schedule ?? []).filter((x) => x.time && parseScheduleRow(x)) : [];
}

/** "Sundays · 9:45 AM Sunday School · 11:00 AM Worship": the first two rows, for the opening. */
export function timesLine(r: BusinessRecord): string {
  const rows = timedRows(r).slice(0, 2);
  if (!rows.length) return "";
  const same = rows.length === 2 && rows[0]!.day === rows[1]!.day;
  if (same) return `${rows[0]!.day}s · ${rows.map((x) => `${x.time} ${x.label}`).join(" · ")}`;
  return rows.map((x) => `${x.day} ${x.time} ${x.label}`).join(" · ");
}

/** The "Next service" chip: a hidden span the client script fills from the parsed rows (data-next-service). */
function nextServiceChip(r: BusinessRecord): Raw {
  const rows = timedRows(r).map((x) => parseScheduleRow(x)!);
  if (!rows.length) return raw("");
  return html`<span class="chip" data-next-service="${jsonForScript(rows).value}" data-tz="${r.timezone}" hidden></span>`;
}

/** Sunday times for the utility top bar ("Sundays 9:45 AM · 11:00 AM"), never Google's office hours or an open/closed state. */
export function sundayTimes(r: BusinessRecord): string {
  const rows = timedRows(r);
  const sun = rows.filter((x) => /^sun/i.test(x.day));
  const use = sun.length ? sun : rows.slice(0, 2);
  if (!use.length) return "";
  const day = sun.length ? "Sundays" : use[0]!.day;
  return `${day} ${[...new Set(use.map((x) => x.time))].slice(0, 3).join(" · ")}`;
}

/** The weekly schedule, grouped by day. Before the church confirms it, the preview shows the usual names with times to fill in. */
function schedule(ctx: Ctx): Raw {
  const r = ctx.r;
  const c = r.ext.church ?? {};
  const lines: ChurchScheduleRow[] = c.schedule?.length ? c.schedule : churchScheduleSeeds(c.tradition ?? "default").map((label) => ({ day: label.startsWith("Wednesday") ? "Wednesday" : label.startsWith("Saturday") ? "Saturday" : label.startsWith("Weekday") ? "Weekdays" : "Sunday", time: "", label }));
  const days = [...new Set(lines.map((l) => l.day))].sort((a, b) => (DAYS.indexOf(a) + 7) % 7 - (DAYS.indexOf(b) + 7) % 7);
  const isCatholic = c.tradition === "catholic";
  return html`<section class="section section--band" id="times" aria-labelledby="times-title"><div class="wrap narrow">
${sectionHead(isCatholic ? "Mass times" : "Service times", "Join us", c.spanish ? "Servicios en español también. Pregúntenos." : undefined, "times-title")}
<div class="schedule">${days.map(
    (d) => html`<div class="schedule__day"><h3>${d}</h3><ul>${lines.filter((l) => l.day === d).map((l) => html`<li><span class="schedule__time">${l.time || "Time?"}</span><span${l.lang === "es" ? raw(' lang="es"') : ""}>${l.label}</span>${l.lang === "es" ? html`<span class="schedule__lang" lang="es">en español</span>` : ""}</li>`)}</ul></div>`,
  )}</div>
${c.scheduleConfirmed ? "" : todo(ctx, "Confirm your service times", "Google's hours are usually office hours, so we need your real schedule: each service, class and Wednesday night, with times.", true)}
<div class="btns">${button(action(r, "directions")!, "primary")}${c.liveUrl ? button(action(r, "watch")!, "ghost") : ""}</div>
</div></section>`;
}

/** "Plan a visit": each card shows only what the church told us (parking, dress, kids, length, music, access). */
function planVisit(ctx: Ctx): Raw {
  const c = ctx.r.ext.church ?? {};
  const v = c.firstVisit ?? {};
  const cards = (
    [
      ["Where to park", v.parking],
      ["What to wear", v.dress],
      ["Your kids", v.kids],
      ["How long it lasts", v.length],
      ["Music", v.music],
      ["Getting in", v.accessibility],
    ] as Array<[string, string | undefined]>
  ).filter(([, t]) => t);
  return html`<section class="section" id="plan" aria-labelledby="plan-title"><div class="wrap">
<span class="section__label">Plan a visit</span><h2 class="section__title" id="plan-title">Your first Sunday</h2>
<p class="lead">${ctx.copy.serviceAreaIntro || "It's normal to wonder what to expect. Here's what to know before you come."}</p>
${cards.length ? cardGrid(cards.map(([title, body]) => ({ title, body }))) : ""}
${c.planVisitUrl || c.connectCardUrl ? html`<div class="btns">${c.planVisitUrl ? button(action(ctx.r, "visit")!, "primary") : ""}${c.connectCardUrl ? html`<a class="btn btn--ghost" href="${c.connectCardUrl}" target="_blank" rel="noopener"><span>Fill out a connect card</span><span class="sr"> (opens in new tab)</span></a>` : ""}</div>` : ""}
${cards.length >= 3 ? "" : todo(ctx, "Help first-time visitors", "Tell us where to park and which door to use, what people usually wear, what's there for kids, and how long the service runs. We'll put your answers here, word for word.")}
</div></section>`;
}

/** Kids & students, in the church's words; its own section when anything is set. */
function kids(ctx: Ctx): Raw {
  const k = ctx.r.ext.church?.kids;
  const cards = ([["Nursery", k?.nursery], ["Kids", k?.kids], ["Students", k?.students], ["Check-in", k?.checkIn]] as Array<[string, string | undefined]>).filter(([, t]) => t);
  if (!cards.length) return raw("");
  return html`<section class="section" id="kids" aria-labelledby="kids-title"><div class="wrap">
${sectionHead("Kids & students", "For your family", undefined, "kids-title")}
${cardGrid(cards.map(([title, body]) => ({ title, body })), cards.length > 2 ? 3 : 2)}
</div></section>`;
}

/** Watch: live link, the owner's "Live Sundays at…" line, past services and a podcast. */
function watch(ctx: Ctx): Raw {
  const r = ctx.r;
  const c = r.ext.church ?? {};
  if (!c.liveUrl && !c.sermonsUrl && !c.podcastUrl && !c.liveNote) return raw("");
  const ext = (href: string, label: string) => html`<a class="btn btn--ghost" href="${href}" target="_blank" rel="noopener"><span>${label}</span><span class="sr"> (opens in new tab)</span></a>`;
  return html`<section class="section" id="watch" aria-labelledby="watch-title"><div class="wrap narrow">${sectionHead("Watch", "Join us online", c.liveNote || undefined, "watch-title")}<div class="btns">${c.liveUrl ? button(action(r, "watch")!, "primary") : ""}${c.sermonsUrl ? ext(c.sermonsUrl, "Past services") : ""}${c.podcastUrl ? ext(c.podcastUrl, "Podcast") : ""}</div></div></section>`;
}

/** Connect: prayer request (a link to the church's email, text line or form, never a form of ours), connect card, bulletin, app. */
function connect(ctx: Ctx): Raw {
  const c = ctx.r.ext.church ?? {};
  const items: Array<[string, string]> = [];
  if (c.prayerUrl) items.push([c.prayerUrl, "Send a prayer request"]);
  if (c.connectCardUrl) items.push([c.connectCardUrl, "Connect card"]);
  if (c.bulletinUrl) items.push([c.bulletinUrl, "This week's bulletin"]);
  if (c.appUrl) items.push([c.appUrl, "Get our app"]);
  if (!items.length) return raw("");
  const external = (href: string) => /^https?:/i.test(href);
  return html`<section class="section section--band" id="connect" aria-labelledby="connect-title"><div class="wrap narrow">${sectionHead("Connect", "Stay in touch", undefined, "connect-title")}<div class="btns">${items.map(
    ([href, label], i) => html`<a class="btn btn--${i === 0 ? "secondary" : "ghost"}" href="${href}"${external(href) ? raw(' target="_blank" rel="noopener"') : ""}><span>${label}</span>${external(href) ? html`<span class="sr"> (opens in new tab)</span>` : ""}</a>`,
  )}</div></div></section>`;
}

/** Hall rental facts as chips plus how to book (posts and community centers). */
function hallChips(ctx: Ctx): Raw {
  const h = ctx.r.ext.church?.hallDetails;
  if (!h || !(h.capacity || h.kitchen || h.tables || h.how)) return raw("");
  const list = [h.capacity ? `Seats ${h.capacity}` : "", h.kitchen ? "Kitchen" : "", h.tables ? `Tables & chairs: ${h.tables}` : ""].filter(Boolean);
  return html`${chips(list, "Hall")}${h.how ? html`<p><strong>To book:</strong> ${h.how}</p>` : ""}`;
}

function pastor(ctx: Ctx): Raw {
  const c = ctx.r.ext.church ?? {};
  if (c.pastorOff) return raw("");
  const p = c.pastor;
  return html`<section class="section" id="pastor" aria-labelledby="pastor-title"><div class="wrap narrow">
<span class="section__label">${p?.title || "Our pastor"}</span><h2 class="section__title" id="pastor-title">${p?.name || "Meet our pastor"}</h2>
${p?.bio ? p.bio.split(/\n+/).map((x) => html`<p>${x}</p>`) : ""}
${p?.name ? "" : todo(ctx, "Tell us about your pastor", "Their name and title in your words (Pastor, Bro., Father, Minister, Elder), a photo, and a few lines about them that you write or approve. Or tell us to leave this section off.", true)}
</div></section>`;
}

function beliefs(ctx: Ctx): Raw {
  const c = ctx.r.ext.church ?? {};
  if (!c.beliefs && !c.beliefsUrl) return ctx.mode === "preview" ? html`<section class="section" id="beliefs"><div class="wrap narrow">${todo(ctx, "What you believe (optional)", "If you'd like a beliefs section, send your church's own statement or a link to it. We never write beliefs for you.")}</div></section>` : raw("");
  return html`<section class="section" id="beliefs" aria-labelledby="beliefs-title"><div class="wrap narrow">
<span class="section__label">Beliefs</span><h2 class="section__title" id="beliefs-title">What we believe</h2>
${c.beliefs ? html`<div class="disclosure">${c.beliefs.split(/\n+/).map((x) => html`<p>${x}</p>`)}</div>` : ""}
${c.beliefsUrl ? html`<p><a href="${c.beliefsUrl}" target="_blank" rel="noopener">Read our full statement<span class="sr"> (opens in new tab)</span></a></p>` : ""}
</div></section>`;
}

function give(ctx: Ctx): Raw {
  const r = ctx.r;
  const c = r.ext.church ?? {};
  const url = r.variant === "church" ? c.givingUrl : c.donateUrl;
  if (!url && !c.needed && !c.volunteer && !c.volunteerUrl) {
    if (r.variant === "church" && c.tradition === "church_of_christ") return raw("");
    return ctx.mode === "preview" ? html`<section class="section"><div class="wrap narrow">${todo(ctx, r.variant === "church" ? "Online giving (optional)" : "How people can help (optional)", r.variant === "church" ? "If you take gifts online (Tithe.ly, Givelify, Pushpay, Planning Center or similar), send us the link for a Give button. The website never handles money itself." : "Send us your donate link, items you need, and how to volunteer.")}</div></section>` : raw("");
  }
  return html`<section class="section section--band" id="give" aria-labelledby="give-title"><div class="wrap narrow">
<span class="section__label">${r.variant === "church" ? "Give" : "Help out"}</span><h2 class="section__title" id="give-title">${r.variant === "church" ? "Giving" : "How you can help"}</h2>
${c.needed ? html`<p><strong>What we need:</strong> ${c.needed}</p>` : ""}
${c.volunteer ? html`<p><strong>Volunteer:</strong> ${c.volunteer}</p>` : ""}
${c.deductibleConfirmed && c.statusText ? html`<p class="muted">${c.statusText}</p>` : ""}
${url || c.volunteerUrl ? html`<div class="btns">${url ? button(action(r, r.variant === "church" ? "give" : "donate")!, "primary") : ""}${c.volunteerUrl ? html`<a class="btn btn--${url ? "ghost" : "primary"}" href="${c.volunteerUrl}" target="_blank" rel="noopener"><span>Sign up to volunteer</span><span class="sr"> (opens in new tab)</span></a>` : ""}</div>` : ""}
</div></section>`;
}

/** Charity "Get help", civic "Meetings & joining", community center "Rent the hall": owner text only. */
function variantBlock(ctx: Ctx): Raw {
  const r = ctx.r;
  const c = r.ext.church ?? {};
  if (r.variant === "charity")
    return html`<section class="section section--band" id="help" aria-labelledby="help-title"><div class="wrap narrow">
${sectionHead("Get help", "If you need help", undefined, "help-title")}
${c.help ? c.help.split(/\n+/).map((x) => html`<p>${x}</p>`) : todo(ctx, "When and how people can get help", "Your days and hours, where to come, who can come, what to bring and how often. We show your words exactly.", true)}
<div class="btns">${button(action(r, "call")!, "primary")}${button(action(r, "directions")!, "ghost")}</div>
</div></section>`;
  if (r.variant === "civic_post")
    return html`<section class="section section--band" id="join" aria-labelledby="join-title"><div class="wrap narrow">
${sectionHead("Meetings", "Come to a meeting", undefined, "join-title")}
${c.meetings ? html`<p class="big">${c.meetings}</p>` : todo(ctx, "When and where you meet", "For example “2nd Tuesday of the month, 6:30 PM, at the post home”. Guests welcome?", true)}
${c.joinText ? html`<p>${c.joinText}</p>` : todo(ctx, "Who can join", "Who's eligible and how to join, in your words (membership rules come from your charter, so we don't guess).")}
<div class="btns">${c.joinUrl ? button(action(r, "join")!, "primary") : ""}${button(action(r, "call")!, c.joinUrl ? "ghost" : "primary")}</div>
${c.hall || c.hallDetails ? html`<h3>Hall rental</h3>${c.hall ? html`<p>${c.hall}</p>` : ""}${hallChips(ctx)}` : ""}
</div></section>`;
  if (r.variant === "community_center")
    return html`<section class="section section--band" id="hall" aria-labelledby="hall-title"><div class="wrap narrow">
${sectionHead("Rent the hall", "Have your event here", undefined, "hall-title")}
${c.hall ? html`<p>${c.hall}</p>` : c.hallDetails ? "" : todo(ctx, "Tell people about renting the hall", "How many people it holds, the kitchen, tables and chairs, and how to book. Rates only if you want them shown; otherwise “call for rates”.")}
${hallChips(ctx)}
<div class="btns">${button(action(r, "call")!, "primary")}</div>
</div></section>`;
  return raw("");
}

function visitUs(ctx: Ctx): Raw {
  const r = ctx.r;
  const c = r.ext.church ?? {};
  return html`<section class="section" id="visit" aria-labelledby="visit-title"><div class="wrap">
<span class="section__label">Find us</span><h2 class="section__title" id="visit-title">${r.variant === "church" ? "Visit us" : "Where we are"}</h2>
${hasAnyHours(r.hours) ? "" : todo(ctx, "Add your office hours (optional)", "If someone's usually in the office, tell us the days and hours and we'll list them here.")}
<div class="visit${hasAnyHours(r.hours) || c.facility ? "" : " visit--solo"}">${hasAnyHours(r.hours) || c.facility ? html`<div>${hasAnyHours(r.hours) ? html`<h3>Office hours</h3>${hoursTable(ctx)}` : ""}${c.facility ? html`<h3>Weddings &amp; facility use</h3><p>${c.facility}</p>` : ""}</div>` : ""}
<div><address class="addr">${r.name}<br>${r.showStreetAddress && r.address.street ? html`${r.address.street}<br>` : ""}${r.address.city}, ${r.address.state} ${r.address.zip ?? ""}</address>
<p><a href="${action(r, "call")!.href}">${r.phone.display}</a>${r.email ? html`<br><a href="mailto:${r.email}">${r.email}</a>` : ""}</p>
<div class="btns">${button(action(r, "directions")!, "primary")}${button(action(r, "call")!, "ghost")}</div></div></div>
</div></section>`;
}

function dataFaq(ctx: Ctx): Faq[] {
  const r = ctx.r;
  const c = r.ext.church ?? {};
  const v = c.firstVisit ?? {};
  const out: Faq[] = [];
  if (r.variant === "church") {
    if (c.scheduleConfirmed && c.schedule?.length) out.push({ q: c.tradition === "catholic" ? "What are your Mass times?" : "What time are services?", a: c.schedule.map((s) => `${s.day} ${s.time}: ${s.label}`).join(". ") + "." });
    if (v.parking) out.push({ q: "Where do I park?", a: v.parking });
    if (v.dress) out.push({ q: "What should I wear?", a: v.dress });
    if (v.kids) out.push({ q: "What about my kids?", a: v.kids });
    if (c.liveUrl) out.push({ q: "Can I watch online?", a: "Yes. Tap Watch live to join us online." });
  }
  if (r.variant === "civic_post" && c.meetings) out.push({ q: "When do you meet?", a: c.meetings });
  if (c.facility || c.hall || c.hallDetails?.how) out.push({ q: "Can I rent the building?", a: c.hall || c.facility || c.hallDetails?.how || "" });
  return out;
}

export const churchPack: CategoryPack = {
  id: "church",
  label: "Churches & nonprofits",
  titleMode: "name",
  locationModel: "storefront",
  hasForm: () => false,
  looks: [],
  defaultLook: (r) => {
    const t = r.ext.church?.tradition;
    if (r.variant !== "church") return "church.meeting_hall";
    if (t && ["catholic", "episcopal_anglican", "lutheran", "presbyterian", "orthodox"].includes(t)) return "church.hymnal";
    if (t && ["pentecostal", "cowboy", "nondenominational"].includes(t)) return "church.open_doors";
    return "church.country_chapel";
  },
  variantLabel: (r) => label(r),
  schemaType: (r) => (r.variant === "church" ? (r.ext.church?.tradition === "catholic" && r.ext.church.traditionConfirmed ? "CatholicChurch" : "Church") : r.variant === "community_center" ? "EventVenue" : "NGO"),
  schemaExtras: () => ({}),
  homeTitle(r) {
    const l = label(r);
    return fitTitle([`${r.name} | ${l} in ${r.address.city}, ${r.address.state}`, `${r.name} | ${r.address.city}, ${r.address.state}`, r.name]);
  },
  nav: (ctx) => {
    const r = ctx.r;
    const c = r.ext.church ?? {};
    if (r.variant === "church")
      return [
        { label: c.tradition === "catholic" ? "Mass times" : "Service times", href: "/#times" },
        { label: "Plan a visit", href: "/#plan" },
        ...(c.kids && Object.values(c.kids).some(Boolean) ? [{ label: "Kids", href: "/#kids" }] : []),
        { label: "Ministries", href: "/#ministries" },
        ...(c.givingUrl ? [{ label: "Give", href: "/#give" }] : []),
        { label: "Find us", href: "/#visit" },
      ];
    return [
      { label: r.variant === "charity" ? "Get help" : r.variant === "civic_post" ? "Meetings" : "Rent the hall", href: r.variant === "charity" ? "/#help" : r.variant === "civic_post" ? "/#join" : "/#hall" },
      { label: "What we do", href: "/#ministries" },
      ...(c.donateUrl || c.needed || c.volunteer ? [{ label: "Help out", href: "/#give" }] : []),
      { label: "About", href: "/#about" },
      { label: "Find us", href: "/#visit" },
    ];
  },
  actionBar: (ctx) => actions(ctx.r, ctx.r.variant === "church" ? ["visit", "directions", "call"] : [...first(ctx.r), "directions"]).slice(0, 3),
  homeFaq: (ctx) => [...dataFaq(ctx), ...ctx.copy.faq].slice(0, 6),
  // No reviews or star counts anywhere for churches and nonprofits (research/trends-2026 §3D).
  reviewsAllowed: () => false,
  // The thin top bar carries the Sunday times, never Google's office hours as "open now".
  utilityLine: (ctx) => {
    const t = sundayTimes(ctx.r);
    const c = ctx.r.ext.church ?? {};
    const label = c.tradition === "catholic" ? "Mass times" : "Service times";
    return ctx.r.variant === "church" ? html`<a href="#times">${icon("clock", 16)}${t || label}</a>` : raw("");
  },
  bannedPhrases: (r) => churchBannedPhrases(r),
  footerNote: (ctx) => (hasAnyHours(ctx.r.hours) ? html`<p class="ftr__note">The hours listed are office hours. See service times above.</p>` : raw("")),
  home(ctx: Ctx) {
    const r = ctx.r;
    const c = r.ext.church ?? {};
    const trust: string[] = [];
    if (r.foundedYear) trust.push(r.variant === "church" ? `Gathering since ${r.foundedYear}` : `Since ${r.foundedYear}`);
    if (c.spanish) trust.push("Servicios en español");
    if (c.liveUrl) trust.push("Watch online");
    const times = r.variant === "church" ? timesLine(r) : "";
    return html`${hero(ctx, {
      eyebrow: `${label(r)} · ${r.address.city}, ${r.address.state}`,
      h1: r.name,
      sub: ctx.copy.heroSub,
      trust,
      showStatus: false,
      actions: actions(r, first(r)),
      badge: r.foundedYear && ctx.theme.knobs.badge === "seal" ? `Since ${r.foundedYear}` : undefined,
      note: times ? html`${nextServiceChip(r)}<span>${times}</span>` : undefined,
    })}
<div class="strip"><div class="strip__in">
<a class="strip__item" href="${action(r, "directions")!.href}" target="_blank" rel="noopener">${icon("pin")}<span>${r.showStreetAddress && r.address.street ? `${r.address.street}, ${r.address.city}` : `${r.address.city}, ${r.address.state}`}<span class="sr"> (opens directions in new tab)</span></span></a>
<a class="strip__item" href="${action(r, "call")!.href}">${icon("phone")}<span>${r.phone.display}</span></a>
${r.variant === "church" ? html`<a class="strip__item" href="#times">${icon("clock")}<span>${c.tradition === "catholic" ? "Mass times" : "Service times"}</span></a>` : ""}
</div></div>
<main id="main">
${announcements(ctx, { label: "This season", title: "Coming up" })}
${r.variant === "church" ? schedule(ctx) : variantBlock(ctx)}
${r.variant === "church" ? planVisit(ctx) : ""}
${r.variant === "church" ? kids(ctx) : ""}
<section class="section${r.variant === "church" ? " section--band" : ""}" id="ministries" aria-labelledby="ministries-title"><div class="wrap">
<span class="section__label">${r.variant === "church" ? "Ministries" : "What we do"}</span><h2 class="section__title" id="ministries-title">${r.variant === "church" ? "Something for everyone" : "How we serve"}</h2>
${ctx.copy.heroTagline ? html`<p class="lead">${ctx.copy.heroTagline}</p>` : ""}
${serviceList(ctx, r.services.map((s) => ({ title: s.name, body: ctx.copy.serviceBlurbs[s.id] })))}
${r.confirmed.includes("services") ? "" : todo(ctx, r.variant === "church" ? "Tick your ministries" : "Tick what you do", "We started with the usual list. Tell us what to keep, remove or add, and when groups meet.", true)}
</div></section>
${watch(ctx)}
${connect(ctx)}
${r.variant === "church" ? pastor(ctx) : ""}
${r.variant === "church" ? beliefs(ctx) : ""}
${give(ctx)}
${gallery(ctx, r.variant === "church" ? "Send photos of your building" : "Send photos", "A photo of the outside and one inside. Please no photos of children unless parents have given permission.")}
${about(ctx, `About ${r.name}`)}
${visitUs(ctx)}
${faq([...dataFaq(ctx), ...ctx.copy.faq].slice(0, 6), true)}
${ctaBand(ctx, actions(r, first(r)))}
${r.variant === "church" && !c.traditionConfirmed ? html`<section class="section"><div class="wrap narrow">${todo(ctx, "How should we describe your church?", `We guessed “${c.traditionLabel || "Church"}” from your name. Tell us the words you use (for example “Missionary Baptist church”), or just “Church”. We never claim a convention or denomination you didn't give us.`, true)}</div></section>` : ""}
</main>`;
  },
  pages: () => [],
  copyBrief: (r) => ({
    voice: `Warm, plain and hospitable, small-town Southern, like a friendly greeter at the door: not a preacher and not a marketer. ${
      { church: "Welcoming and unhurried.", civic_post: "Proud, neighborly and practical.", charity: "Dignified and kind; never pity, never 'the needy'.", community_center: "Friendly and practical." }[r.variant] ?? ""
    } Short sentences, name the town. Never write or claim: beliefs, doctrine, scripture or verse references, sermons, denomination or convention ties, 'Bible-believing', 'Spirit-filled', 'Christ-centered' or similar; the pastor's name, history, founding year or size; worship style, music style, service length or dress code ('come as you are', 'casual'); nursery, kids programs, safety or background checks; wheelchair access or Spanish services; 'tax-deductible', 501(c) or donation claims; who qualifies for help; membership rules; event dates; politics. Use no days or times (the schedule is shown separately). No superlatives, no comparisons with other churches, no growth claims.`,
    fields: {
      heroTagline: "One sentence (12-22 words) introducing the ministries or programs list in general terms: who it's for, never what's taught.",
      heroSub: `A short welcome (8-18 words) for ${r.variant === "church" ? "a church" : "this group"} in ${r.address.city}, e.g. that they'd love to meet you, in your own words. No doctrine words.`,
      serviceBlurbs: "For each id, one line (8-16 words) saying who it's for in general. No ages, days, times, places, teachings or claims.",
      serviceAreaIntro: r.variant === "church" ? "20-40 words reassuring a first-time visitor that it's normal to wonder what to expect; no claims about dress, kids, music or length." : "Leave empty.",
      faq: "2-3 general questions a newcomer might ask (who's welcome, how to get in touch) with short answers (25-50 words) that make no claims about times, kids, beliefs, eligibility or money. End by inviting a call.",
      about:
        "One or two short paragraphs (50-90 words). A warm introduction to who they are and where, without history, size, doctrine, people or claims. The organization will replace it with their own story.",
      cta: "ctaTitle: 3-6 words of welcome (e.g. an invitation to visit). ctaLine: one sentence, at most 16 words, no times.",
      metaDescription: "140-155 characters: name + kind + town + an invitation (visit, call, get directions). No beliefs or claims.",
    },
  }),
};

/** The 66 books and their usual abbreviations, so "John 3:16" is caught but "Sunday 11:00" and "Wednesday 6:30" never are. */
const BIBLE_BOOKS =
  "Genesis|Gen|Exodus|Exod|Ex|Leviticus|Lev|Numbers|Num|Deuteronomy|Deut|Dt|Joshua|Josh|Judges|Judg|Ruth|Samuel|Sam|Kings|Kgs|Chronicles|Chron|Chr|Ezra|Nehemiah|Neh|Esther|Esth|Job|Psalms|Psalm|Pss|Ps|Proverbs|Prov|Pr|Ecclesiastes|Eccles|Eccl|Song of Solomon|Song of Songs|Song|Isaiah|Isa|Jeremiah|Jer|Lamentations|Lam|Ezekiel|Ezek|Daniel|Dan|Hosea|Hos|Joel|Amos|Obadiah|Obad|Jonah|Jon|Micah|Mic|Nahum|Nah|Habakkuk|Hab|Zephaniah|Zeph|Haggai|Hag|Zechariah|Zech|Malachi|Mal|Matthew|Matt|Mt|Mark|Mk|Luke|Lk|John|Jn|Acts|Romans|Rom|Corinthians|Cor|Galatians|Gal|Ephesians|Eph|Philippians|Phil|Colossians|Col|Thessalonians|Thess|Timothy|Tim|Titus|Philemon|Phlm|Hebrews|Heb|James|Jas|Peter|Pet|Jude|Revelation|Rev";
/** A scripture reference like "John 3:16", "1 Cor. 13:4" or "Ps 23:1" (case-sensitive on the book name). */
export const SCRIPTURE_REF = new RegExp(`(?<![A-Za-z])(?:[1-3] ?)?(?:${BIBLE_BOOKS})\\.? ?\\d{1,3}:\\d{1,3}\\b`);

/** Faith, money and eligibility claims the AI may never make (§8). Owner fields render separately and aren't checked here. */
export function churchBannedPhrases(r: BusinessRecord): RegExp[] {
  const out = [
    SCRIPTURE_REF,
    /\b(bible[- ]believing|spirit[- ]filled|christ[- ]centered|gospel[- ]centered|reformed|kjv|full gospel|non-?denominational|independent|southern baptist|sbc|united methodist|global methodist|assembl(y|ies) of god|diocese|convention)\b/i,
    /\b(doctrine|salvation|saved|sin|scripture|verse|sermon|creed|baptism|communion|sacrament)\b/i,
    /\b(tax[- ]deductible|501\s?\(c\)|ein|100% of)\b/i,
    /\b(nursery|background[- ]check|check-in|wheelchair|handicap|accessible|spanish|español|casual|come as you are|dress code|hymns?|contemporary|traditional|praise band|a cappella)\b/i,
    /\b(no id|anyone can come|all are eligible|eligib\w*)\b/i,
    /\b(republican|democrat|vote|election|candidate|abortion)\b/i,
    /\b(fast-growing|vibrant|thriving|largest|biggest)\b/i,
  ];
  void r;
  return out;
}
