import { withAlpha } from "./color.ts";
import { INFLOW_MEDIA, kitFor, PLAIN_HERO, SOLID_CREDIT, type LayoutDef } from "./layout-kit.ts";
import { LAYOUTS_A } from "./layouts-a.ts";
import { LAYOUTS_B } from "./layouts-b.ts";
import { LAYOUTS_C } from "./layouts-c.ts";
import type { Theme } from "./themes.ts";

/**
 * Page layouts. A look sets colors and fonts; a layout sets the page's structure: header, hero,
 * how services, steps and reviews are laid out, section rhythm, call-to-action band and footer.
 * Any look works with any layout, so each category gets looks × layouts distinct designs.
 * Layouts are CSS only (the markup is shared), which keeps every layout accessible and lint-clean.
 * Text only ever sits on a background whose contrast resolveTheme checked.
 * The first seven are here; the rest live in layouts-a/b/c.ts.
 */
const EXTRA: Record<string, LayoutDef> = { ...LAYOUTS_A, ...LAYOUTS_B, ...LAYOUTS_C };
const about = <T extends Record<string, LayoutDef>>(m: T) =>
  Object.fromEntries(Object.entries(m).map(([id, d]) => [id, { name: d.name, about: d.about }])) as { [K in keyof T]: { name: string; about: string } };

export const LAYOUTS = {
  classic: { name: "Photo banner", about: "Big photo behind the headline, cards for services." },
  split: { name: "Side by side", about: "Headline and photo side by side, numbered service list." },
  editorial: { name: "Magazine", about: "Centered name and headings, photo under the headline, airy text columns." },
  poster: { name: "Bold poster", about: "Tall photo with a huge headline, color-block tiles, slanted bands." },
  soft: { name: "Rounded cards", about: "Floating rounded header, soft panels, swipeable reviews." },
  minimal: { name: "Clean & simple", about: "Big type, thin lines, services as a list, no clutter." },
  overlap: { name: "Floating card", about: "Full-width photo with the headline on a card over it, zigzag services." },
  ...about(LAYOUTS_A),
  ...about(LAYOUTS_B),
  ...about(LAYOUTS_C),
};

export type LayoutId = keyof typeof LAYOUTS;
export const LAYOUT_IDS = Object.keys(LAYOUTS) as LayoutId[];

export function isLayout(id: string | undefined): id is LayoutId {
  return !!id && id in LAYOUTS;
}

export function layoutCss(t: Theme): string {
  const c = t.colors;
  const line = withAlpha(c.text, 0.18);
  const extra = EXTRA[t.layout];
  if (extra) return `/* layout: ${t.layout} */\n${extra.css(t, kitFor(t))}`;
  switch (t.layout) {
    case "classic":
      return "";

    case "split":
      return `/* layout: split */
.hdr{border-bottom:4px solid var(--accent)}
.brand{font-size:1.4rem}
.hero{display:grid;grid-template-columns:1fr}
${INFLOW_MEDIA}
.hero--photo .hero__media{aspect-ratio:4/3}
.hero__in{max-width:none;margin:0;padding:34px 20px 40px}
.hero__in::before{content:"";display:block;width:64px;height:6px;background:var(--accent);margin-bottom:22px}
.hero h1{font-size:clamp(2.3rem,8vw,4rem)}
${SOLID_CREDIT}
@media (min-width:900px){
 .hero{grid-template-columns:1.05fr 1fr;min-height:580px}
 .hero--photo .hero__media{order:2;aspect-ratio:auto;height:100%}
 .hero__in{order:1;display:flex;flex-direction:column;justify-content:center;padding:80px 56px 72px max(20px,calc((100vw - 1120px)/2 + 20px))}
}
.section__label::before{content:"";display:inline-block;width:28px;height:2px;background:currentColor;vertical-align:middle;margin-right:10px}
.cards{counter-reset:svc;gap:0 48px;border-top:2px solid var(--text)}
.cards .card{counter-increment:svc;display:grid;grid-template-columns:3.4rem 1fr;column-gap:14px;background:none;border:0;box-shadow:none;border-bottom:1px solid ${line};border-radius:0;padding:22px 0}
.cards .card::before{content:counter(svc,decimal-leading-zero);grid-row:1/span 3;font:${t.headingWeight} 1.7rem/1 var(--hf);color:var(--link)}
.cards .card>*{grid-column:2}
.card h3 .i{display:none}
@media (min-width:600px){.cards,.cards--3{grid-template-columns:1fr 1fr}}
.steps li{background:none;border:0;box-shadow:none;border-radius:0;border-top:4px solid var(--accent);padding:18px 0 0}
.quote{background:none;border:0;box-shadow:none;border-radius:0;border-left:5px solid var(--accent);padding:4px 0 4px 20px}
.quotes li:first-child .quote p{font:${t.headingWeight} 1.45rem/1.3 var(--hf)}
.faq details{background:none;border:0;box-shadow:none;border-radius:0;border-bottom:1px solid ${line};margin:0}
.cta{text-align:left}.cta .btns{justify-content:flex-start}
.cta h2{font-size:clamp(2rem,6vw,3rem)}
`;

    case "editorial":
      return `/* layout: editorial */
.hdr{border-bottom:3px double ${withAlpha(c.text, 0.35)}}
.hdr__in{display:grid;grid-template-columns:52px 1fr 52px;align-items:center}
.brand{grid-column:2;grid-row:1;margin:0;text-align:center;font-size:1.45rem;max-width:none}
.hdr__call{grid-column:1;grid-row:1;justify-self:start}
.navbtn{grid-column:3;grid-row:1;justify-self:end}
@media (min-width:900px){
 .hdr__in{grid-template-columns:1fr auto 1fr;padding-top:16px}
 .brand{font-size:2rem}
 .hdr__call{grid-column:3;justify-self:end}
 .js .nav,.no-js .nav{grid-column:1/-1;grid-row:2;justify-self:center;margin-top:8px;border-top:1px solid ${line};width:100%}
 .js .nav ul,.no-js .nav ul{justify-content:center}
}
${PLAIN_HERO}
.hero{display:flex;flex-direction:column}
${INFLOW_MEDIA}
.hero__in{order:1;text-align:center;padding:48px 20px 32px;max-width:900px}
.hero__media{order:2}
.hero--photo .hero__media{width:calc(100% - 40px);max-width:1080px;margin:0 auto 40px;aspect-ratio:4/3}
.hero--photo .hero__media img{border:1px solid ${line}}
@media (min-width:900px){.hero--photo .hero__media{aspect-ratio:21/9}.hero__in{padding:72px 20px 40px}}
.hero__eyebrow::before,.hero__eyebrow::after{content:"";display:inline-block;width:28px;height:1px;background:currentColor;vertical-align:middle;margin:0 12px}
.hero__sub{margin-left:auto;margin-right:auto}
.hero__trust,.hero .btns{justify-content:center}
.hero__credit{position:static;order:3;text-align:center;margin:-30px 0 30px;color:var(--muted)}
.section__label,.section__title{text-align:center}
.section__label::before,.section__label::after{content:"";display:inline-block;width:32px;height:1px;background:currentColor;vertical-align:middle;margin:0 10px}
.section__title::before,.section__title::after{margin-left:auto!important;margin-right:auto!important}
.lead{margin-left:auto;margin-right:auto;text-align:center}
.cards{gap:0 56px;border-top:1px solid ${line}}
.card{background:none;border:0;box-shadow:none;border-radius:0;border-bottom:1px solid ${line};padding:24px 4px}
.card h3{font-size:1.4rem}.card h3 .i{display:none}
.steps li{background:none;border:0;box-shadow:none;border-radius:0;text-align:center}
.steps li::before{font-size:3.2rem;font-style:italic}
@media (min-width:900px){.steps li+li{border-left:1px solid ${line}}}
.quote{background:none;border:0;box-shadow:none;text-align:center}
.quote p{font:italic ${t.headingWeight} 1.3rem/1.45 var(--hf)}
#reviews .btns,.cta .btns,#about .btns{justify-content:center}
#about p:first-of-type::first-letter{float:left;font:${t.headingWeight} 3.6em/.82 var(--hf);margin:.06em .12em 0 0;color:var(--heading)}
.faq details{background:none;border:0;box-shadow:none;border-radius:0;border-bottom:1px solid ${line};margin:0}
.cta{background:var(--bg);color:var(--text)}
.cta .wrap{border:1px solid var(--text);outline:1px solid var(--text);outline-offset:6px;padding:40px 24px;max-width:720px}
.cta h2{color:var(--heading)}.cta .btn--ghost{color:var(--text)}
.ftr__grid{text-align:center}
`;

    case "poster":
      return `/* layout: poster */
.hdr{background:var(--bar-bg);border:0}
.brand{color:var(--on-bar);text-transform:uppercase;letter-spacing:.05em}
.navbtn{color:var(--on-bar)}
.nav a{color:var(--on-bar)}
.js .nav{background:var(--bar-bg)}
.js .nav li{border-color:${withAlpha(c.onBar, 0.2)}}
.hero__in{min-height:min(84vh,680px);display:flex;flex-direction:column;justify-content:flex-end;padding-bottom:48px}
.hero--photo .hero__media::after{background:linear-gradient(180deg,${withAlpha(c.heroBg, 0.6)} 0%,${withAlpha(c.heroBg, 0.86)} 45%,${withAlpha(c.heroBg, 0.97)} 100%)}
.hero h1{font-size:clamp(2.8rem,12vw,6.2rem);text-transform:uppercase;line-height:.95;letter-spacing:-.015em}
.hero__sub{font-size:clamp(1.15rem,3.6vw,1.5rem)}
.section__title{text-transform:uppercase;font-size:clamp(2.1rem,8.5vw,3.8rem);line-height:1}
.section--band{clip-path:polygon(0 3vw,100% 0,100% calc(100% - 3vw),0 100%);padding:calc(var(--space) + 3vw) 0}
.cards{gap:14px}
.cards .card{border:0;box-shadow:none;padding:28px 24px;outline:3px solid var(--text);outline-offset:-3px;background:var(--surface)}
.cards li:nth-child(3n+1){background:var(--secondary);outline:0}
.cards li:nth-child(3n+1),.cards li:nth-child(3n+1) h3,.cards li:nth-child(3n+1) p,.cards li:nth-child(3n+1) .price{color:var(--on-secondary)}
.cards li:nth-child(3n+2){background:var(--bg)}
.card h3{text-transform:uppercase;font-size:1.3rem}
.card h3 .i{color:currentColor}
.steps li{background:none;border:0;box-shadow:none;border-left:6px solid var(--text);border-radius:0;padding:4px 0 4px 18px}
.steps li::before{font-size:4.2rem;color:transparent;-webkit-text-stroke:2px var(--heading)}
.quote{border:0;box-shadow:none;border-top:6px solid var(--text);border-radius:0}
.quote p{font:${t.headingWeight} 1.3rem/1.35 var(--hf)}
.cta{background:var(--primary);color:var(--on-primary);text-align:left}
.cta h2{color:var(--on-primary);text-transform:uppercase;font-size:clamp(2.3rem,10vw,4.4rem);line-height:.95}
.cta .btns{justify-content:flex-start}
.cta .btn--primary{background:var(--secondary);color:var(--on-secondary)}
.cta .btn--ghost{color:var(--on-primary)}
.ftr h2{text-transform:uppercase}
`;

    case "soft":
      return `/* layout: soft */
.hdr{top:10px;margin:10px 12px 0;border:0;border-radius:22px;box-shadow:0 6px 26px ${withAlpha(c.text, 0.14)}}
.hdr.is-hidden{transform:translateY(calc(-100% - 24px))}
.hdr__in{padding:0 8px 0 20px}
.hdr__call{border-radius:999px}
.js .nav{inset:calc(var(--hdr-h,66px) + 18px) 12px auto 12px;max-height:calc(100vh - 110px);border-radius:24px;box-shadow:0 12px 40px ${withAlpha(c.text, 0.2)}}
.hero{margin:14px 12px 0;border-radius:28px;display:grid}
${INFLOW_MEDIA}
.hero--photo .hero__media{margin:12px 12px 0;border-radius:20px;overflow:hidden;aspect-ratio:16/11}
.hero__in{padding:28px 22px 30px;max-width:none}
${SOLID_CREDIT}
@media (min-width:900px){
 .hero{grid-template-columns:1fr 1fr;max-width:1240px;margin:20px auto 0;align-items:center}
 .hero--photo .hero__media{order:2;margin:16px;aspect-ratio:4/5;max-height:560px}
 .hero__in{order:1;padding:56px 48px}
}
.btn{border-radius:999px}
.strip{background:none;border:0;padding-top:14px}
.strip__in{background:var(--surface);border-radius:22px;width:calc(100% - 24px);box-shadow:0 2px 12px ${withAlpha(c.text, 0.08)}}
body{background:var(--band)}
.section{padding:14px 0}
.section,.section--band,.section--surface{background:none}
.section>.wrap{background:var(--surface);border-radius:28px;padding:34px 22px;width:calc(100% - 24px)}
.section--band>.wrap{background:var(--bg);box-shadow:inset 0 0 0 2px ${withAlpha(c.text, 0.08)}}
.section>.wrap.narrow{max-width:900px}
@media (min-width:900px){.section>.wrap{padding:52px 48px}}
.card,.steps li,.quote,.faq details,.form{border:0;box-shadow:none;border-radius:20px;background:var(--band)}
.section--band .card,.section--band .steps li,.section--band .quote,.section--band .faq details,.section--band .form{background:var(--surface);box-shadow:0 2px 10px ${withAlpha(c.text, 0.08)}}
.card h3{flex-direction:column;align-items:flex-start}
.card h3 .i{width:46px;height:46px;padding:12px;border-radius:50%;background:var(--surface);color:var(--heading)}
.section--band .card h3 .i{background:var(--band)}
.steps li::before{width:46px;height:46px;border-radius:50%;background:var(--primary);color:var(--on-primary);display:grid;place-items:center;font-size:1.2rem;margin-bottom:12px}
.quotes{grid-auto-flow:column;grid-auto-columns:86%;grid-template-columns:none;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:8px}
.quotes li{scroll-snap-align:start}
@media (min-width:900px){.quotes{grid-auto-flow:row;grid-template-columns:repeat(3,1fr);overflow:visible}}
.cta{margin:14px 12px;border-radius:28px}
.ftr{border-radius:28px 28px 0 0;margin-top:14px}
.bar{left:10px;right:10px;bottom:calc(10px + env(safe-area-inset-bottom));padding:8px;border-radius:999px}
.bar a{border-radius:999px}
`;

    case "minimal":
      return `/* layout: minimal */
.hdr{background:var(--bg);border-bottom:1px solid var(--text)}
.brand{font-size:1.02rem;text-transform:uppercase;letter-spacing:.14em}
.hdr__call{background:none;color:var(--text);border:1px solid var(--text);border-radius:0}
.btn{border-radius:0}
${PLAIN_HERO}
.hero{display:flex;flex-direction:column}
${INFLOW_MEDIA}
.hero__in{order:1;padding:56px 20px 36px}
.hero h1{font-size:clamp(2.6rem,10.5vw,5.6rem);line-height:1;letter-spacing:-.03em;max-width:13em}
.hero__sub{color:var(--muted)}
.hero__media{order:2}
.hero--photo .hero__media{width:calc(100% - 40px);max-width:1080px;height:clamp(220px,42vw,480px);margin:0 auto}
.hero__credit{position:static;order:3;width:calc(100% - 40px);max-width:1080px;margin:6px auto 0;color:var(--muted)}
.section{border-top:1px solid ${withAlpha(c.text, 0.3)};margin-top:-1px}
.section--band,.section--surface{background:var(--bg)}
.section__label{text-transform:uppercase;letter-spacing:.14em;font-variant-caps:normal;font-size:.8rem}
@media (min-width:900px){
 .wrap>.section__label{float:left;width:22%;padding-top:.6rem}
 .wrap>.section__label~*{margin-left:26%}
 .wrap>.section__label~.section__title::before,.wrap>.section__label~.section__title::after{display:none}
}
.cards{gap:0 40px;border-top:1px solid var(--text)}
.cards .card{display:grid;grid-template-columns:1fr auto;column-gap:16px;background:none;border:0;box-shadow:none;border-bottom:1px solid ${line};border-radius:0;padding:18px 0}
.cards .card>*{grid-column:1}
.cards .card::after{content:"→";grid-column:2;grid-row:1;color:var(--muted);font-size:1.2rem}
.card h3 .i{display:none}
@media (min-width:600px){.cards,.cards--3{grid-template-columns:1fr 1fr}}
.steps li{background:none;border:0;box-shadow:none;border-radius:0;border-top:1px solid var(--text);padding:16px 0 0}
.steps li::before{content:"0" counter(step);font-size:1rem;color:var(--muted)}
.quote{background:none;border:0;box-shadow:none;border-radius:0;border-top:1px solid ${line};padding:18px 0 0}
.faq details{background:none;border:0;box-shadow:none;border-radius:0;border-bottom:1px solid ${line};margin:0}
.form{border:1px solid var(--text);box-shadow:none;border-radius:0}
.cta{background:var(--bg);color:var(--text);text-align:left;border-top:1px solid var(--text)}
.cta h2{color:var(--heading);font-size:clamp(2.2rem,8vw,4rem);letter-spacing:-.02em}
.cta .btns{justify-content:flex-start}.cta .btn--ghost{color:var(--text)}
.ftr h2{text-transform:uppercase;letter-spacing:.12em;font-size:.95rem}
`;

    case "overlap":
      return `/* layout: overlap */
${PLAIN_HERO}
${INFLOW_MEDIA}
.hero--photo .hero__media{height:clamp(280px,64vw,580px)}
.hero__in{background:var(--surface);border-radius:var(--radius);box-shadow:0 18px 50px ${withAlpha(c.text, 0.18)};margin:24px 14px 0;padding:28px 22px;max-width:880px}
.hero--photo .hero__in{margin-top:-90px}
.hero{padding-bottom:20px;overflow:visible}
${SOLID_CREDIT}
.hero__credit{top:8px;bottom:auto}
@media (min-width:900px){.hero__in{margin:32px auto 0;padding:48px 56px}.hero--photo .hero__in{margin-top:-170px}}
.section__label{display:inline-block;background:var(--band);color:var(--text);padding:4px 14px;border-radius:999px}
.section--band .section__label{background:var(--surface)}
.cards{counter-reset:svc;grid-template-columns:1fr;gap:18px;max-width:900px}
@media (min-width:600px){.cards,.cards--3{grid-template-columns:1fr}}
.cards .card{counter-increment:svc;display:grid;grid-template-columns:68px 1fr;gap:2px 18px;align-items:start}
.cards .card::before{content:counter(svc);grid-row:1/span 3;display:grid;place-items:center;width:68px;height:68px;border-radius:var(--radius);background:var(--secondary);color:var(--on-secondary);font:${t.headingWeight} 1.7rem/1 var(--hf)}
.cards .card>*{grid-column:2}
.card h3 .i{display:none}
@media (min-width:900px){
 .cards .card{width:82%}
 .cards li:nth-child(even){margin-left:18%;grid-template-columns:1fr 68px}
 .cards li:nth-child(even)::before{grid-column:2}
 .cards li:nth-child(even)>*{grid-column:1;text-align:right}
 .cards li:nth-child(even) h3{justify-content:flex-end}
}
.steps{border-left:4px solid var(--accent);padding-left:22px}
@media (min-width:900px){.steps{grid-template-columns:1fr 1fr}}
.steps li{box-shadow:none}
@media (min-width:900px){.quotes li:nth-child(2){transform:translateY(28px)}}
#about .wrap{border-left:6px solid var(--accent);padding-left:26px}
.cta{text-align:left}.cta .btns{justify-content:flex-start}
`;
  }
  return "";
}
