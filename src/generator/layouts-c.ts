import { contrast } from "./color.ts";
import { INFLOW_MEDIA, PLAIN_HERO, SOLID_CREDIT, type LayoutDef } from "./layout-kit.ts";

/** More page layouts (see layouts.ts). CSS only, on the shared markup; layoutCss adds the layout marker comment. */

const MONO = `ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace`;

/** Drafting crop marks at the four corners of a box (as background layers). */
const ticks = (c: string, len = 12, w = 2) =>
  ["left top", "right top", "left bottom", "right bottom"]
    .flatMap((p) => [`linear-gradient(${c},${c}) ${p}/${len}px ${w}px no-repeat`, `linear-gradient(${c},${c}) ${p}/${w}px ${len}px no-repeat`])
    .join(",");

/** Grid paper: fine 24px squares with a stronger line every 120px (as background layers). */
const paper = (fine: string, major: string) =>
  `linear-gradient(${major} 1px,transparent 1px) 0 0/120px 120px,linear-gradient(90deg,${major} 1px,transparent 1px) 0 0/120px 120px,linear-gradient(${fine} 1px,transparent 1px) 0 0/24px 24px,linear-gradient(90deg,${fine} 1px,transparent 1px) 0 0/24px 24px`;

/** Ticket: a filled box with round notches cut from each corner. */
const notched = (bg: string, r = 11) =>
  [
    ["0 0", "0 0"],
    ["100% 0", "100% 0"],
    ["0 100%", "0 100%"],
    ["100% 100%", "100% 100%"],
  ]
    .map(([at, pos]) => `radial-gradient(circle at ${at},transparent ${r}px,${bg} ${r + 0.5}px) ${pos}/51% 51% no-repeat`)
    .join(",");

/** A 12-point starburst as a clip-path polygon. */
const STAR = `polygon(${Array.from({ length: 24 }, (_, i) => {
  const a = (Math.PI * 2 * i) / 24 - Math.PI / 2;
  const r = i % 2 ? 38 : 50;
  return `${(50 + r * Math.cos(a)).toFixed(1)}% ${(50 + r * Math.sin(a)).toFixed(1)}%`;
}).join(",")})`;

/** Ribbon with swallowtail ends. */
const RIBBON = `polygon(0 0,100% 0,calc(100% - 14px) 50%,100% 100%,0 100%,14px 50%)`;

/** Wavy top edge as a mask (period 4s, about 1.6s tall). */
const WAVE_S = 22;
const waveMask = (() => {
  const s = WAVE_S;
  const p = s / 2;
  const r = +(s * Math.sqrt(1.25)).toFixed(2);
  const m = `radial-gradient(${r}px at 50% ${s + p}px,#000 99%,#0000 101%) calc(50% - ${2 * s}px) 0/${4 * s}px 100%,radial-gradient(${r}px at 50% ${-p}px,#0000 99%,#000 101%) 50% ${s}px/${4 * s}px 100% repeat-x`;
  return `-webkit-mask:${m};mask:${m}`;
})();
const WAVE_H = Math.ceil(WAVE_S * 1.62);

/** Elements that get a wavy top edge over the one before them. */
const WAVY = `.hero+.strip,.hero~main>.section:first-child,main>*+.section,main>*+.cta,.ftr`;

const BLOB = "58% 42% 55% 45% / 46% 54% 46% 54%";
const BLOB2 = "42% 58% 37% 63% / 55% 40% 60% 45%";

export const LAYOUTS_C = {
  blueprint: {
    name: "Blueprint",
    about: "Grid-paper background, outlined boxes with corner marks, numbered sections.",
    css: (t, k) => {
      const c = t.colors;
      const grid = paper(k.alpha(c.text, 0.045), k.alpha(c.text, 0.085));
      const marks = ticks("var(--text)");
      return `body{background:${grid},var(--bg)}
.hdr{background:var(--surface);border-bottom:2px solid var(--text)}
.brand{text-transform:uppercase;letter-spacing:.06em;font-size:1.12rem}
.hdr__call{border-radius:0}
.navbtn{border-radius:0}
.btn{border-radius:0;text-transform:uppercase;letter-spacing:.07em;font-size:.94rem}
.btn--primary:not(:focus-visible){outline:1px solid var(--primary);outline-offset:3px}
.btn--ghost{border-width:1px}
${PLAIN_HERO}
.hero{background:transparent;display:flex;flex-direction:column}
${INFLOW_MEDIA}
.hero__in{order:1;margin:22px 20px 18px;padding:30px 20px 26px;border:1px solid var(--text);background:${k.alpha(c.bg, 0.86)};max-width:none}
.hero__in::before{content:"";position:absolute;inset:-6px;pointer-events:none;background:${marks}}
.hero__eyebrow{font:700 .78rem/1.3 ${MONO};letter-spacing:.14em;text-transform:uppercase;font-variant-caps:normal}
.hero__eyebrow::before{content:"";display:inline-block;width:9px;height:9px;border:2px solid currentColor;margin-right:10px;vertical-align:0}
.hero__trust{font:600 .86rem/1.4 ${MONO};text-transform:uppercase;letter-spacing:.04em}
.hero__media{order:2}
.hero--photo .hero__media{margin:0 20px 22px;padding:8px 8px 0;border:1px solid var(--text);background:var(--surface)}
.hero--photo .hero__media img{aspect-ratio:4/3;height:auto}
.hero--photo .hero__media::after{display:block;content:"FIG. 01";position:static;background:none;color:var(--text);font:700 .72rem/1 ${MONO};letter-spacing:.16em;padding:8px 0}
.hero__credit{position:static;order:3;margin:-14px 20px 18px;color:var(--muted)}
@media (min-width:900px){
 .hero{display:grid;grid-template-columns:1.1fr 1fr;align-items:center;max-width:1160px;margin:0 auto;padding:44px 0 36px}
 .hero__in{margin:20px;padding:52px 44px 44px}
 .hero--photo .hero__media{margin:20px 20px 20px 8px}
 .hero__credit{grid-column:2;margin:-8px 20px 0 8px}
 .hero:not(.hero--photo){grid-template-columns:minmax(0,880px);padding:56px 0 48px}
}
.strip{background:var(--surface);border-top:1px solid var(--text);border-bottom:1px solid var(--text)}
.strip__more{color:var(--text)}
.chip{border-radius:0;background:transparent;border:1px solid ${k.alpha(c.text, 0.35)};font:600 .8rem/1.3 ${MONO};text-transform:uppercase;letter-spacing:.06em}
@media (min-width:900px){.strip__item{padding-left:16px;border-left:1px dashed ${k.alpha(c.text, 0.35)}}}
.section{border-top:1px solid ${k.line}}
.section--band{background:${grid},var(--band)}
.section--surface{background:transparent}
body{counter-reset:sheet}
.section__label{counter-increment:sheet;font:700 .78rem/1.4 ${MONO};letter-spacing:.14em;text-transform:uppercase;font-variant-caps:normal;color:var(--muted);margin-bottom:.7rem}
.section__label::before{content:"[" counter(sheet,decimal-leading-zero) "] ";color:var(--text)}
.card,.steps li,.quote,.faq details,.form{border-radius:0;box-shadow:none;border:1px solid ${k.alpha(c.text, 0.32)};background:var(--surface)}
.card,.steps li,.quote,.form{position:relative}
.card::before,.steps li::after,.quote::before,.form::before{content:"";position:absolute;inset:-5px;pointer-events:none;background:${marks}}
.cards{gap:22px}
.card h3,.steps h3{color:var(--text)}
.card .price{color:var(--text);font:700 .95rem/1.4 ${MONO}}
.steps{gap:22px}
.steps li::before{content:"STEP " counter(step,decimal-leading-zero);display:inline-block;font:700 .76rem/1 ${MONO};letter-spacing:.14em;color:var(--text);border:1px solid var(--text);padding:7px 9px;margin-bottom:16px}
.quote{border-left:4px solid var(--accent)}
.quote footer{color:var(--text);font:600 .82rem/1.4 ${MONO};text-transform:uppercase;letter-spacing:.06em}
.faq details{margin-bottom:12px}
.faq summary::after{display:grid;place-items:center;flex:none;width:30px;height:30px;border:1px solid var(--text);color:var(--text);font-size:1.15rem}
.hours{border:1px solid var(--text);border-radius:0}
.hours td{font-family:${MONO};font-size:.94rem}
.gallery img{border-radius:0;border:1px solid var(--text);padding:5px;background:var(--surface)}
.form input,.form select,.form textarea{border-radius:0}
.cta{background:${paper(k.alpha(c.onSecondary, 0.07), k.alpha(c.onSecondary, 0.13))},var(--secondary);text-align:left}
.cta .wrap{border:1px dashed ${k.alpha(c.onSecondary, 0.6)};padding:36px 24px;width:calc(100% - 40px);max-width:880px}
.cta .btns{justify-content:flex-start}
.cta .btn--primary:not(:focus-visible){outline-color:var(--on-secondary)}
.ftr__grid{gap:0;border:1px solid ${k.alpha(c.onFooter, 0.45)}}
.ftr__grid>div{padding:18px 20px;border-bottom:1px solid ${k.alpha(c.onFooter, 0.45)}}
.ftr__grid>div:last-child{border-bottom:0}
@media (min-width:900px){.ftr__grid>div{border-bottom:0;border-right:1px solid ${k.alpha(c.onFooter, 0.45)}}.ftr__grid>div:last-child{border-right:0}}
.ftr h2{font:700 .82rem/1.4 ${MONO};text-transform:uppercase;letter-spacing:.14em}
.menu-nav a{border-radius:0;border:1px solid ${k.alpha(c.text, 0.35)};font:700 .82rem/1.4 ${MONO};text-transform:uppercase;letter-spacing:.08em;display:inline-flex;align-items:center;min-height:44px}
.menu-item{border-bottom-style:solid}
.bar a{border-radius:0}
`;
    },
  },

  carousel: {
    name: "Swipe cards",
    about: "App-style page: swipeable rows of service and review cards, pill chips, a photo with a pull-up panel.",
    css: (t, k) => {
      const c = t.colors;
      return `.hdr{background:var(--bg);border-bottom:0;box-shadow:0 1px 0 ${k.line}}
.hdr__call,.btn{border-radius:999px}
.navbtn{border-radius:999px;background:var(--band);color:var(--text)}
.hero{display:flex;flex-direction:column}
.hero--photo{background:var(--bg)}
${INFLOW_MEDIA}
.hero--photo .hero__media{height:clamp(240px,64vw,520px)}
.hero--photo .hero__in{width:100%;margin:-30px 0 0;padding-top:38px;background:var(--bg);color:var(--text);border-radius:28px 28px 0 0}
.hero--photo h1{color:var(--heading)}
.hero--photo .hero__in::before{content:"";position:absolute;top:12px;left:50%;width:44px;height:5px;margin-left:-22px;border-radius:9px;background:${k.alpha(c.text, 0.28)}}
.hero:not(.hero--photo){border-radius:0 0 28px 28px}
${SOLID_CREDIT}
.hero__credit{top:8px;bottom:auto}
@media (min-width:900px){
 .hero--photo .hero__media{height:520px}
 .hero--photo .hero__in{max-width:680px;margin:-250px 0 0 max(20px,calc((100% - 1120px)/2 + 20px));padding:40px 48px 30px}
}
.status{border:1px solid ${k.line}}
.strip{background:var(--bg);border:0}
.strip__in{display:flex;gap:8px;overflow-x:auto;scroll-snap-type:x proximity;padding:12px 20px 14px;scrollbar-width:none}
.strip__in::-webkit-scrollbar{display:none}
.strip__item{flex:none;min-height:48px;padding:6px 18px 6px 14px;border-radius:999px;background:var(--surface);border:1px solid ${k.line};font-size:.95rem;scroll-snap-align:start}
.strip__item>span{display:flex;flex-direction:column;line-height:1.25}
.strip__more{color:var(--text)}
.chips{flex:none;flex-wrap:nowrap;margin:0;align-items:center}
.chip{min-height:48px;padding:6px 16px;border:1px solid ${k.line}}
@media (min-width:900px){.strip__in{flex-wrap:wrap;overflow:visible;padding:18px 20px}.chips{flex-wrap:wrap}}
.section{padding:calc(var(--space)*.8) 0}
.section__label{display:inline-flex;align-items:center;gap:8px;padding:5px 14px 5px 11px;border-radius:999px;border:1.5px solid ${k.alpha(c.text, 0.3)};font-size:.8rem;margin-bottom:.8rem}
.section__label::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--primary)}
.card{border-radius:22px;border:1px solid ${k.line};box-shadow:0 1px 2px ${k.alpha(c.text, 0.06)},0 8px 22px ${k.alpha(c.text, 0.07)};padding:20px;display:flex;flex-direction:column}
.card h3{flex-direction:column;align-items:flex-start;gap:12px;color:var(--text);font-size:1.15rem}
.card h3 .i{width:44px;height:44px;padding:11px;border-radius:14px;background:var(--primary);color:var(--on-primary)}
.card .price{align-self:flex-start;background:var(--band);color:var(--text);padding:3px 12px;border-radius:999px;font-size:.92rem;margin:0 0 .6rem}
.quotes li{display:flex}
.quote{flex:1;border:1px solid ${k.line};box-shadow:none;border-radius:22px 22px 22px 6px;padding:20px 20px 18px;display:flex;flex-direction:column;justify-content:space-between}
.quote footer{display:flex;align-items:center;gap:10px;color:var(--text)}
.quote footer::before{content:"";flex:none;width:30px;height:30px;border-radius:50%;background:var(--accent)}
@media (max-width:899px){
 .cards,.quotes,.gallery{grid-auto-flow:column;grid-template-columns:none;grid-auto-columns:min(80%,330px);overflow-x:auto;scroll-snap-type:x mandatory;margin-left:-20px;margin-right:-20px;padding:6px 20px 18px;scroll-padding-inline:20px;overscroll-behavior-x:contain;scrollbar-width:thin}
 .gallery{grid-auto-columns:min(70%,280px)}
 .cards>li,.quotes>li,.gallery>li{scroll-snap-align:start}
}
@media (min-width:900px){.cards,.cards--3{grid-template-columns:repeat(3,1fr)}}
.gallery img{border-radius:20px}
.steps{gap:0}
.steps li{position:relative;background:none;border:0;box-shadow:none;border-radius:0;padding:0 0 26px 62px}
.steps li::before{position:absolute;left:0;top:0;width:44px;height:44px;border-radius:50%;background:var(--primary);color:var(--on-primary);display:grid;place-items:center;font-size:1.15rem;margin:0}
.steps li::after{content:"";position:absolute;left:21px;top:52px;bottom:8px;width:2px;border-radius:2px;background:${k.alpha(c.text, 0.22)}}
.steps li:last-child::after{display:none}
.steps h3{padding-top:9px}
@media (min-width:900px){.steps{gap:24px}.steps li{padding:62px 0 0}.steps li::after{left:56px;right:-14px;top:21px;bottom:auto;width:auto;height:2px}}
.faq details{border-radius:18px;border:1px solid ${k.line};box-shadow:none}
.faq summary{align-items:center}
.faq summary::after{display:grid;place-items:center;flex:none;width:32px;height:32px;border-radius:50%;background:var(--band);color:var(--text);font-size:1.2rem}
.hours{border-radius:20px;box-shadow:0 0 0 1px ${k.line}}
.form{border-radius:24px}
.cta{text-align:left;border-radius:32px 32px 0 0;margin-top:12px}
.cta .btns{justify-content:flex-start}
@media (min-width:900px){
 .cta .wrap{display:grid;grid-template-columns:1.3fr 1fr;column-gap:48px;align-items:center;max-width:1120px}
 .cta h2,.cta p{grid-column:1}
 .cta .btns{grid-column:2;grid-row:1/span 2;justify-content:flex-end}
}
.menu-nav{padding:10px 0 12px}
.menu-nav a{display:inline-flex;align-items:center;min-height:44px;border:1px solid ${k.line}}
.bar{gap:6px;padding:6px 8px calc(6px + env(safe-area-inset-bottom));border-radius:20px 20px 0 0}
.bar a{flex-direction:column;gap:2px;min-height:52px;font-size:.8rem;border:0;border-radius:14px}
`;
    },
  },

  sticky: {
    name: "Side headings",
    about: "Two-column intro, then each section's heading stays put on the left while its content scrolls by.",
    css: (t, k) => {
      const c = t.colors;
      const W = `.section>.wrap:has(>.section__title)`;
      const labelH = `calc(21px + 4.75rem)`;
      return `.hdr{background:var(--bg);border-bottom:1px solid var(--text)}
.hero{display:flex;flex-direction:column}
${INFLOW_MEDIA}
.hero__in{order:1;padding:44px 20px 36px}
.hero__media{order:2}
.hero--photo .hero__media{aspect-ratio:4/3}
${SOLID_CREDIT}
.hero__eyebrow{display:inline-block;border-bottom:2px solid currentColor;padding-bottom:5px}
.hero h1{font-size:clamp(2.4rem,9.5vw,4.8rem);line-height:1.02;letter-spacing:-.02em}
@media (min-width:900px){
 .hero__in{display:flow-root;padding:88px 20px 76px}
 .hero__in>.badge,.hero__in>.hero__eyebrow,.hero__in>h1{float:left;clear:left;width:52%}
 .hero__in>h1{margin-bottom:0}
 .hero__in>:not(.badge):not(.hero__eyebrow):not(h1){margin-left:57%}
 .hero__in>.status{display:flex;width:fit-content}
 .hero__sub{margin-top:.4rem}
 .hero--photo .hero__media{aspect-ratio:auto;height:clamp(300px,36vw,500px)}
}
body{counter-reset:sec}
.section__label{counter-increment:sec;display:block;border-top:3px solid var(--text);padding-top:18px;font-size:.9rem;line-height:1.4rem;margin-bottom:.6rem;color:var(--muted)}
.section__label::before{content:counter(sec,decimal-leading-zero);display:block;font:${t.headingWeight} 3rem/1 var(--hf);letter-spacing:-.02em;color:var(--muted);margin-bottom:.35rem}
@media (min-width:900px){
 ${W}{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2.15fr);grid-template-rows:repeat(14,auto);column-gap:64px;align-items:start;max-width:1120px}
 ${W}>*{grid-column:2}
 ${W}>.section__label,${W}>.section__title{grid-column:1;grid-row:1/-1;align-self:start;position:sticky;top:92px;white-space:normal}
 ${W}>.section__label{margin:0 0 10rem;white-space:nowrap}
 ${W}>.section__label+.section__title{margin-top:calc(${labelH} + .9rem);top:calc(92px + ${labelH} + .9rem)}
 ${W}>.section__title+*{margin-top:0}
 ${W} .cards--3{grid-template-columns:repeat(2,1fr)}
 ${W} .steps{grid-template-columns:1fr 1fr}
 ${W} .quotes{grid-template-columns:1fr}
 ${W} .visit{grid-template-columns:1fr 1fr}
}
.card{border:0;box-shadow:none;border-left:4px solid var(--accent);border-radius:0 var(--radius) var(--radius) 0}
.card h3,.card .price{color:var(--text)}
.steps{gap:0}
.steps li{display:grid;grid-template-columns:3.4rem 1fr;column-gap:12px;background:none;border:0;box-shadow:none;border-radius:0;border-top:1px solid ${k.alpha(c.text, 0.3)};padding:18px 0}
.steps li::before{grid-row:1/span 2;font-size:2rem;color:var(--heading)}
.steps li>*{grid-column:2}
@media (min-width:900px){.steps{column-gap:32px}}
.quote{background:none;border:0;box-shadow:none;border-radius:0;padding:0 0 0 0;position:relative}
.quote::before{content:"";display:block;width:44px;height:6px;background:var(--accent);margin-bottom:14px}
.quote p{font:${t.headingWeight} 1.3rem/1.4 var(--hf);color:var(--text)}
.quotes{gap:32px}
.faq details{background:none;border:0;box-shadow:none;border-radius:0;border-bottom:1px solid ${k.alpha(c.text, 0.3)};margin:0}
.faq details:first-child{border-top:1px solid ${k.alpha(c.text, 0.3)}}
.faq summary{padding:18px 0}
.faq details p{padding:0 0 18px}
.cta{text-align:left}
.cta .btns{justify-content:flex-start}
@media (min-width:900px){
 .cta .wrap{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2.15fr);column-gap:64px;max-width:1120px;align-items:start}
 .cta h2{grid-row:1/span 2;margin:0}
 .cta p,.cta .btns{grid-column:2}
}
`;
    },
  },

  retro: {
    name: "Retro diner",
    about: "Vintage diner feel: ribbon labels, double-line headings, ticket-shaped cards, checkerboard trim.",
    css: (t, k) => {
      const c = t.colors;
      const checker = (a: string, b: string, sz = 16) => `repeating-conic-gradient(${a} 0 25%,${b} 0 50%) 0 0/${sz}px ${sz}px`;
      return `.hdr{background:var(--secondary);border-bottom:4px double ${k.alpha(c.onSecondary, 0.7)}}
.brand{color:var(--on-secondary);text-transform:uppercase;letter-spacing:.06em}
.navbtn,.nav a{color:var(--on-secondary)}
.js .nav{background:var(--secondary)}
.js .nav li{border-color:${k.alpha(c.onSecondary, 0.25)}}
.hdr__call{box-shadow:0 0 0 2px var(--on-secondary)}
.btn{text-transform:uppercase;letter-spacing:.08em;font-size:.95rem}
.btn--primary{box-shadow:inset 0 0 0 3px var(--primary),inset 0 0 0 5px var(--on-primary)}
.btn--ghost{border:4px double currentColor}
.hero{text-align:center}
.hero__in{margin:26px 14px;padding:34px 16px 30px;border:6px double currentColor;max-width:840px}
@media (min-width:900px){.hero__in{margin:72px auto;padding:56px 52px 48px}}
@media (min-width:880px) and (max-width:899px){.hero__in{margin:40px auto}}
.hero__eyebrow{display:inline-block;background:var(--primary);color:var(--on-primary);padding:6px 30px;clip-path:${RIBBON}}
.hero__sub{margin-left:auto;margin-right:auto}
.hero__trust,.hero .btns{justify-content:center}
${SOLID_CREDIT}
.strip{position:relative;padding-top:16px}
.strip::before,.ftr::before{content:"";position:absolute;left:0;right:0;top:0;height:16px;background:${checker("var(--text)", "var(--bg)")}}
.strip__more{color:var(--text)}
.chip{border:2px dashed ${k.alpha(c.text, 0.35)}}
.section__label{display:table;margin:0 auto .9rem;background:var(--primary);color:var(--on-primary);padding:7px 32px;clip-path:${RIBBON};text-transform:uppercase;font-variant-caps:normal;letter-spacing:.14em;font-size:.8rem}
.section__title{width:fit-content;max-width:100%;margin-left:auto;margin-right:auto;text-align:center;padding:.38em .3em;border-top:5px double var(--text);border-bottom:5px double var(--text)}
.section__title::before,.section__title::after{margin-left:auto;margin-right:auto}
.lead{margin-left:auto;margin-right:auto;text-align:center}
.section .btns{justify-content:center}
.card,.steps li{background:${notched("var(--surface)", 15)};border:0;box-shadow:none;border-radius:0;outline:2px dashed ${k.alpha(c.text, 0.38)};outline-offset:-12px;padding:28px 26px;text-align:center;filter:drop-shadow(0 2px 3px ${k.alpha(c.text, 0.16)})}
.card h3{justify-content:center;color:var(--text);text-transform:uppercase;letter-spacing:.03em}
.card .price,.steps h3{color:var(--text)}
.steps li::before{width:68px;height:68px;margin:0 auto 12px;display:grid;place-items:center;background:var(--primary);color:var(--on-primary);font-size:1.5rem;clip-path:${STAR}}
.quote{border:5px double ${k.alpha(c.text, 0.45)};box-shadow:none;text-align:center}
.quote footer{color:var(--text);text-transform:uppercase;letter-spacing:.08em;font-size:.86rem}
.faq details{border:0;box-shadow:none;border-radius:0;border-bottom:2px dashed ${k.alpha(c.text, 0.35)};margin:0}
.faq details:first-child{border-top:5px double ${k.alpha(c.text, 0.45)}}
.hours{border:5px double ${k.alpha(c.text, 0.45)};border-radius:0}
.hours th,.hours td{border-bottom:1px dashed ${k.alpha(c.text, 0.3)}}
.gallery img{border:7px solid var(--surface);border-radius:2px;box-shadow:0 3px 10px ${k.alpha(c.text, 0.2)}}
.form{border:5px double ${k.alpha(c.text, 0.45)};box-shadow:none}
.menu-nav a{display:inline-flex;align-items:center;min-height:44px;border:2px dashed ${k.alpha(c.text, 0.35)}}
.cta{position:relative;padding:calc(var(--space) + 14px) 0}
.cta::before,.cta::after{content:"";position:absolute;left:0;right:0;height:14px;background:repeating-linear-gradient(-45deg,var(--accent) 0 10px,transparent 10px 20px)}
.cta::before{top:0}.cta::after{bottom:0}
.cta .wrap{border:5px double ${k.alpha(c.onSecondary, 0.7)};padding:34px 20px;width:calc(100% - 32px)}
.cta .btn--primary{box-shadow:inset 0 0 0 3px var(--primary),inset 0 0 0 5px var(--on-primary)}
.ftr{position:relative;padding-top:68px}
.ftr::before{background:${checker("var(--on-footer)", "var(--footer-bg)")}}
.ftr__grid{text-align:center}
`;
    },
  },

  wave: {
    name: "Wavy blobs",
    about: "Soft wavy section edges, a blob-shaped photo and pill buttons for a relaxed, flowing feel.",
    css: (t, k) => {
      const c = t.colors;
      return `.hdr{border-bottom:0;border-radius:0 0 26px 26px;box-shadow:0 4px 18px ${k.alpha(c.text, 0.1)}}
.btn,.hdr__call,.bar a{border-radius:999px}
.hero{display:flex;flex-direction:column;padding-bottom:${WAVE_H}px}
${INFLOW_MEDIA}
.hero__in{order:1;padding:38px 20px 34px}
.hero__media{order:0}
.hero--photo .hero__media{width:min(80%,360px);aspect-ratio:1;margin:30px auto 0;z-index:0;border-radius:${BLOB}}
.hero--photo .hero__media img{border-radius:inherit}
.hero--photo .hero__media::after{display:block;content:"";position:absolute;inset:auto -18px -16px auto;width:58%;height:58%;background:var(--accent);border-radius:${BLOB2};z-index:-1}
${SOLID_CREDIT}
.hero__credit{bottom:${WAVE_H + 8}px}
@media (min-width:900px){
 .hero{display:grid;grid-template-columns:1.1fr 1fr;align-items:center;padding:0 max(0px,calc((100% - 1160px)/2)) ${WAVE_H + 10}px}
 .hero__in{padding:72px 20px 64px;margin:0}
 .hero--photo .hero__media{order:2;width:min(88%,470px);margin:52px auto}
 .hero:not(.hero--photo){display:block;padding-left:0;padding-right:0}
 .hero:not(.hero--photo) .hero__in{max-width:1120px;margin:0 auto;padding-right:42%}
 .hero:not(.hero--photo)::before{content:"";position:absolute;right:max(20px,calc((100% - 1120px)/2));top:50%;width:min(34vw,380px);aspect-ratio:1;transform:translateY(-50%);border-radius:${BLOB};background:var(--accent);opacity:.55}
 .hero:not(.hero--photo)::after{content:"";position:absolute;right:max(150px,calc((100% - 1120px)/2 + 220px));top:18%;width:min(14vw,150px);aspect-ratio:1;border-radius:${BLOB2};background:var(--secondary);opacity:.8}
}
${WAVY}{position:relative;margin-top:-${WAVE_H}px;${waveMask}}
.strip{border:0;padding-top:${WAVE_H}px}
main>.section:not(.section--band):not(.section--surface){background:var(--bg)}
.hero~main>.section:first-child,main>*+.section{padding-top:calc(var(--space) + ${WAVE_H - 14}px)}
.cta{padding-top:calc(var(--space) + ${WAVE_H - 10}px)}
.ftr{padding-top:${48 + WAVE_H}px}
.strip__more{color:var(--text)}
.section__label{display:inline-block;text-decoration:underline wavy var(--accent);text-decoration-thickness:2px;text-underline-offset:8px;margin-bottom:1rem}
.card{border:0;border-radius:32px 8px 32px 8px;box-shadow:0 10px 30px ${k.alpha(c.text, 0.09)}}
.cards>li:nth-child(even){border-radius:8px 32px 8px 32px}
.card h3{color:var(--text)}
.card .price{color:var(--text)}
.card h3 .i{width:44px;height:44px;padding:11px;border-radius:${BLOB};background:var(--band);color:var(--text)}
.steps li{border:0;box-shadow:none;border-radius:32px}
.steps h3{color:var(--text)}
.steps li::before{width:56px;height:56px;display:grid;place-items:center;border-radius:${BLOB};background:var(--secondary);color:var(--on-secondary);font-size:1.4rem;margin-bottom:14px}
.quote{border:0;box-shadow:none;border-radius:34px;position:relative;padding-top:34px;margin-top:20px}
.quote::before{content:"\\201C";position:absolute;top:-20px;left:22px;width:46px;height:46px;display:grid;place-items:center;padding-top:14px;background:var(--secondary);color:var(--on-secondary);font:700 2.4rem/1 var(--hf);border-radius:${BLOB2}}
.quote footer{color:var(--text)}
.faq details{border:0;box-shadow:none;border-radius:26px}
.faq summary{align-items:center}
.faq summary::after{display:grid;place-items:center;flex:none;width:34px;height:34px;border-radius:${BLOB};background:var(--band);color:var(--text)}
.hours{border-radius:26px}
.form{border:0;box-shadow:none;border-radius:32px}
.form input,.form select,.form textarea{border-radius:18px}
.gallery li:nth-child(odd) img{border-radius:40px 12px 40px 12px}
.gallery li:nth-child(even) img{border-radius:12px 40px 12px 40px}
.menu-nav a{display:inline-flex;align-items:center;min-height:44px}
.about img{border-radius:${BLOB}}
`;
    },
  },

  brutal: {
    name: "Bold blocks",
    about: "Thick outlines, hard drop shadows and flat bright color blocks; loud and no-nonsense.",
    css: (t, k) => {
      const c = t.colors;
      return `.hdr{background:var(--bg);border-bottom:4px solid var(--text)}
.brand{text-transform:uppercase;letter-spacing:-.01em}
.hdr__call{border:3px solid var(--text);border-radius:0;box-shadow:3px 3px 0 var(--text)}
.navbtn{border:3px solid var(--text);border-radius:0;margin-left:4px}
@media (max-width:899px){.js .nav{background:var(--bg);border-top:4px solid var(--text)}.js .nav li{border-bottom:3px solid var(--text)}}
.btn{border:3px solid var(--text);border-radius:0;box-shadow:4px 4px 0 var(--text);text-transform:uppercase;letter-spacing:.02em}
.btn:hover{transform:translate(-2px,-2px);box-shadow:6px 6px 0 var(--text);filter:none}
.btn:active{transform:translate(2px,2px);box-shadow:1px 1px 0 var(--text)}
.btn--ghost,.cta .btn--ghost{background:var(--bg);color:var(--text)}
.hero{background:var(--primary);color:var(--on-primary);border-bottom:4px solid var(--text);display:flex;flex-direction:column}
.hero h1,.hero h2{color:var(--on-primary)}
.hero h1{letter-spacing:-.03em;line-height:1}
${contrast(c.primary, c.secondary) >= 1.7 ? `.hero .btn--primary{background:var(--secondary);color:var(--on-secondary)}` : `.hero .btn--primary{background:var(--text);color:var(--bg)}`}
${INFLOW_MEDIA}
.hero__in{order:1}
.hero__media{order:2}
.hero--photo .hero__media{margin:0 26px 34px 20px;border:4px solid var(--text);box-shadow:8px 8px 0 var(--text);aspect-ratio:4/3}
.hero__eyebrow{display:inline-block;background:var(--text);color:var(--bg);padding:4px 10px}
.status{border:3px solid var(--text);border-radius:0}
${SOLID_CREDIT}
.hero__credit{right:30px;bottom:40px}
@media (min-width:900px){
 .hero{display:grid;grid-template-columns:1.1fr 1fr;align-items:center;padding:0 max(0px,calc((100% - 1160px)/2))}
 .hero--photo .hero__media{margin:56px 44px 56px 8px}
 .hero__credit{right:max(52px,calc((100% - 1160px)/2 + 52px));bottom:64px}
 .hero:not(.hero--photo){display:block;position:relative}
 .hero:not(.hero--photo) .hero__in{padding-right:44%}
 .hero:not(.hero--photo)::before{content:"";position:absolute;right:max(40px,calc((100% - 1120px)/2 + 20px));top:64px;bottom:64px;width:min(32%,360px);background:repeating-linear-gradient(-45deg,var(--secondary) 0 18px,var(--bg) 18px 36px);border:4px solid var(--text);box-shadow:10px 10px 0 var(--text)}
}
.strip{background:var(--bg);border-bottom:4px solid var(--text)}
.strip__in{gap:12px;padding:18px 20px 20px}
.strip__item{border:3px solid var(--text);background:var(--surface);padding:6px 14px;box-shadow:4px 4px 0 var(--text)}
.strip__more{color:var(--text)}
.chip{border-radius:0;border:2px solid var(--text);background:var(--bg)}
.section{border-bottom:4px solid var(--text)}
.section__label{display:inline-block;background:var(--text);color:var(--bg);padding:4px 10px;text-transform:uppercase;font-variant-caps:normal;letter-spacing:.06em;margin-bottom:.9rem}
.section__title{font-size:clamp(2rem,7.5vw,3.3rem);line-height:1.02;letter-spacing:-.025em}
.card,.steps li,.quote,.faq details,.form,.hours{border:3px solid var(--text);border-radius:0;box-shadow:6px 6px 0 var(--text)}
.cards,.steps,.quotes{gap:22px}
.card h3,.card .price,.steps h3{color:var(--text)}
.card h3 .i{color:currentColor;border:2px solid currentColor;padding:6px;width:38px;height:38px}
.cards>li:nth-child(4n+1){background:var(--primary)}
.cards>li:nth-child(4n+1),.cards>li:nth-child(4n+1) :is(h3,p,.price){color:var(--on-primary)}
.cards>li:nth-child(4n+3){background:var(--secondary)}
.cards>li:nth-child(4n+3),.cards>li:nth-child(4n+3) :is(h3,p,.price){color:var(--on-secondary)}
.steps li::before{display:inline-grid;place-items:center;min-width:52px;height:52px;padding:0 8px;background:var(--text);color:var(--bg);font-size:1.6rem;margin-bottom:14px}
.quote p{font-weight:700}
.quote footer{color:var(--text);text-transform:uppercase;font-size:.9rem}
.faq details{margin-bottom:16px}
.faq details[open] summary{border-bottom:3px solid var(--text)}
.faq summary{align-items:center}
.faq summary::after{display:grid;place-items:center;flex:none;width:34px;height:34px;background:var(--text);color:var(--surface)}
.faq details p{padding-top:14px}
.hours th,.hours td{border-bottom:2px solid var(--text)}
.form input,.form select,.form textarea{border:3px solid #111;border-radius:0}
.gallery img{border:3px solid var(--text);border-radius:0;box-shadow:5px 5px 0 var(--text)}
.menu-nav a{display:inline-flex;align-items:center;min-height:44px;border-radius:0;border:3px solid var(--text);background:var(--bg)}
.cta{text-align:left;border-bottom:4px solid var(--text)}
.cta .wrap{max-width:1120px}
.cta h2{font-size:clamp(2.2rem,8.5vw,3.9rem);line-height:1;letter-spacing:-.03em}
.cta .btns{justify-content:flex-start}
.ftr__grid{gap:18px}
.ftr__grid>div{border:3px solid ${k.alpha(c.onFooter, 0.85)};padding:18px 20px}
.bar{border-top:4px solid var(--text);box-shadow:none}
.bar a{border-radius:0;border:2px solid var(--on-bar)}
.bar a:first-child{border-color:var(--on-bar)}
`;
    },
  },
} as const satisfies Record<string, LayoutDef>;
