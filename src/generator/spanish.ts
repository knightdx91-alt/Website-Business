import { action, type Action } from "./actions.ts";
import { button, cardGrid, faq, sectionHead, type Ctx } from "./components.ts";
import { hasAnyHours, weeklyRows } from "./hours.ts";
import { html, type Raw } from "./html.ts";

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

const esHours = (t: string) => t.replace("Closed", "Cerrado").replace("Open 24 hours", "Abierto 24 horas");

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
<div class="btns">${acts.map((a, i) => button(a, i === 0 ? "primary" : "ghost"))}</div>
<p><a href="/" lang="en">English</a></p>
</div></section>
${services.length ? html`<section class="section" aria-labelledby="es-services"><div class="wrap"><span class="section__label">Servicios</span><h2 class="section__title" id="es-services">Lo que ofrecemos</h2><p class="lead">${s.heroSub}</p>${cardGrid(services.map((title) => ({ title, icon: "check" as const })))}</div></section>` : ""}
${hasAnyHours(r.hours) ? html`<section class="section section--band" aria-labelledby="es-hours"><div class="wrap narrow">${sectionHead("Horario", "Horario y ubicación")}<table class="hours"><caption class="sr">Horario</caption><tbody>${weeklyRows(r.hours!).map(
    (row) => html`<tr data-day="${row.day}"><th scope="row">${DIAS[row.label]}</th><td>${esHours(row.text)}</td></tr>`,
  )}</tbody></table><p>${where}</p>${dir ? html`<div class="btns">${button(dir, "secondary")}</div>` : ""}</div></section>` : ""}
${s.about.length ? html`<section class="section" aria-labelledby="es-about"><div class="wrap narrow"><span class="section__label">Quiénes somos</span><h2 class="section__title" id="es-about">Sobre ${r.name}</h2>${s.about.map((p) => html`<p>${p}</p>`)}</div></section>` : ""}
${faq(s.faq, true, "Preguntas", "Preguntas frecuentes")}
<section class="cta" aria-labelledby="es-cta"><div class="wrap narrow"><h2 id="es-cta">${s.ctaTitle}</h2><p>${s.ctaLine}</p><div class="btns">${acts.map((a, i) => button(a, i === 0 ? "primary" : "ghost"))}</div></div></section>
</main>`;
  return { title: `${r.name} | En español`.slice(0, 60), description: s.metaDescription, body };
}
