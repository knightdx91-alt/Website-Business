import { action, type Action } from "./actions.ts";
import { button, cardGrid, faq, sectionHead, type Ctx, type NavItem } from "./components.ts";
import { hasAnyHours, weeklyRows } from "./hours.ts";
import { html, type Raw } from "./html.ts";
import type { SpanishCopy } from "./types.ts";

/** The Spanish page (/es/): the site's key facts and text in Spanish, with Spanish buttons and hours. */

const DIAS: Record<string, string> = {
  Sunday: "Domingo",
  Monday: "Lunes",
  Tuesday: "Martes",
  Wednesday: "Miércoles",
  Thursday: "Jueves",
  Friday: "Viernes",
  Saturday: "Sábado",
};

/** Default Spanish menu labels for every pack's nav; `copy.es.nav` (from the translator or the owner) overrides them. */
export const ES_NAV: Record<string, string> = {
  Services: "Servicios",
  Reviews: "Reseñas",
  About: "Nosotros",
  "Hours & location": "Horario y ubicación",
  Visit: "Horario y ubicación",
  "Find us": "Cómo llegar",
  Contact: "Contacto",
  Menu: "Menú",
  FAQ: "Preguntas",
  "How it works": "Cómo funciona",
  "Service area": "Zonas que atendemos",
  "Get a quote": "Pedir cotización",
  "Free quote": "Cotización gratis",
  Quote: "Cotización",
  Appointments: "Citas",
  Artwork: "Su diseño",
  "What to bring": "Qué traer",
  Disclosures: "Avisos legales",
  "What we carry": "Lo que vendemos",
  "What's new": "Novedades",
  "Service times": "Horario de servicios",
  "Mass times": "Horario de misas",
  "Plan a visit": "Planee su visita",
  Ministries: "Ministerios",
  Give: "Ofrendar",
  "Help out": "Cómo ayudar",
  "Get help": "Pedir ayuda",
  Meetings: "Reuniones",
  "Rent the hall": "Alquiler del salón",
  "What we do": "Qué hacemos",
  Photos: "Fotos",
  Jobs: "Empleos",
  Español: "English",
};

/** The site's menu for the /es/ page: Spanish labels, and the "Español" link becomes "English". */
export function spanishNav(items: NavItem[], es: SpanishCopy | undefined): NavItem[] {
  return items.map((n) => {
    if (n.label === "Español") return { label: "English", href: "/" };
    return { ...n, label: es?.nav?.[n.label] ?? ES_NAV[n.label] ?? n.label };
  });
}

function es(a: Action | null | undefined, label: string, short = label): Action | undefined {
  return a ? { ...a, label, short } : undefined;
}

export function spanishPage(ctx: Ctx): { title: string; description: string; body: Raw } | null {
  const s = ctx.copy.es;
  if (!s) return null;
  const r = ctx.r;
  const call = es(action(r, "call"), `Llamar ${r.phone.display}`, "Llamar")!;
  const text = r.smsEnabled ? es(action(r, "text"), "Mandar un texto", "Texto") : undefined;
  const dir = r.showStreetAddress ? es(action(r, "directions"), "Cómo llegar", "Llegar") : undefined;
  const acts = [call, text ?? dir].filter(Boolean) as Action[];
  const services = r.services.map((x) => s.services[x.id]).filter(Boolean) as string[];
  const where = r.showStreetAddress && r.address.street ? `${r.address.street}, ${r.address.city}, ${r.address.state}` : `${r.address.city}, ${r.address.state}`;
  const body = html`<main id="main" lang="es">
<section class="hero hero--${ctx.theme.knobs.hero}" aria-labelledby="es-title"><div class="hero__in">
<p class="hero__eyebrow">${where}</p>
<h1 id="es-title">${r.name}</h1>
<p class="hero__sub">${s.heroTagline}</p>
<div class="btns">${acts.map((a, i) => button(a, i === 0 ? "primary" : "ghost"))}</div>${r.smsEnabled && !acts.some((a) => a.id === "text") ? html`<p class="hero__alt">O envíenos un mensaje de texto: <a href="${action(r, "text")!.href}">${r.phone.display}</a></p>` : ""}
<p><a href="/" lang="en">English</a></p>
</div></section>
${services.length ? html`<section class="section" aria-labelledby="es-services"><div class="wrap"><span class="section__label">Servicios</span><h2 class="section__title" id="es-services">Lo que ofrecemos</h2><p class="lead">${s.heroSub}</p>${cardGrid(services.map((title) => ({ title, icon: "check" as const })))}</div></section>` : ""}
${hasAnyHours(r.hours) ? html`<section class="section section--band" aria-labelledby="es-hours"><div class="wrap narrow">${sectionHead("Horario", "Horario y ubicación", undefined, "es-hours")}<table class="hours"><caption class="sr">Horario</caption><tbody>${weeklyRows(r.hours!, { es: true }).map(
    (row) => html`<tr data-day="${row.day}"><th scope="row">${DIAS[row.label]}</th><td>${row.text}</td></tr>`,
  )}</tbody></table><p>${where}</p>${dir ? html`<div class="btns">${button(dir, "secondary")}</div>` : ""}</div></section>` : ""}
${s.about.length ? html`<section class="section" aria-labelledby="es-about"><div class="wrap narrow"><span class="section__label">Quiénes somos</span><h2 class="section__title" id="es-about">Sobre ${r.name}</h2>${s.about.map((p) => html`<p>${p}</p>`)}</div></section>` : ""}
${faq(s.faq, true, "Preguntas", "Preguntas frecuentes")}
<section class="cta cta--${ctx.theme.dna.cta}" aria-labelledby="es-cta"><div class="wrap${ctx.theme.dna.cta === "band" ? " narrow" : ""}"><h2 id="es-cta">${s.ctaTitle}</h2><p>${s.ctaLine}</p><div class="btns">${acts.map((a, i) => button(a, i === 0 ? "primary" : "ghost"))}</div></div></section>
</main>`;
  return { title: `${r.name} | En español`.slice(0, 60), description: s.metaDescription, body };
}
