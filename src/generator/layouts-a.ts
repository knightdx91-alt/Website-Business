import { INFLOW_MEDIA, SOLID_CREDIT, type LayoutDef } from "./layout-kit.ts";

/**
 * More page layouts (see layouts.ts). CSS only, on the shared markup; layoutCss adds the layout marker comment.
 * Text stays on checked pairs: muted helper text that the base puts on --surface is switched to --text here.
 */
const SAFE = `.quote footer,.form__alt,.strip__more{color:var(--text)}`;

/** Gutter that lines hero text up with the page's .wrap when the hero spans the full width. */
const EDGE = `max(20px,calc((100vw - 1120px)/2 + 20px))`;


export const LAYOUTS_A = {
  sidebar: {
    name: "Side menu",
    about: "Menu in a column down the left on computers, photo banner with the headline beside the details.",
    css: (t, k) => {
      const c = t.colors;
      return `${SAFE}
.hdr{background:var(--bar-bg);border-bottom:0}
.brand{color:var(--on-bar)}
.navbtn,.nav a{color:var(--on-bar)}
.js .nav{background:var(--bar-bg)}
.js .nav li{border-color:${k.alpha(c.onBar, 0.2)}}
.hdr :focus-visible{outline-color:var(--on-bar)}
@media (min-width:900px){
 body{padding-left:272px}
 html{scroll-padding-top:24px}
 .hdr{position:fixed;top:0;left:0;bottom:0;width:272px;overflow-y:auto;overscroll-behavior:contain}
 .hdr.is-hidden{transform:none}
 .hdr__in,.no-js .hdr__in{flex-direction:column;align-items:stretch;flex-wrap:nowrap;gap:0;min-height:100%;max-width:none;padding:36px 22px 28px}
 .brand{max-width:none;margin:0 0 26px;padding:0 0 22px;font-size:1.55rem;line-height:1.15;border-bottom:3px solid var(--accent)}
 .js .nav,.no-js .nav{order:2;margin-bottom:28px}
 .js .nav ul,.no-js .nav ul{flex-direction:column;gap:2px}
 .nav a,.no-js .nav a{display:flex;align-items:center;min-height:48px;padding:10px 14px;font-size:1.02rem;white-space:normal;border-radius:var(--radius);border-left:3px solid transparent}
 .nav a:hover{background:${k.alpha(c.onBar, 0.1)};border-left-color:var(--accent);text-decoration:none}
 .hdr__call{order:3;margin-top:auto;min-height:52px;padding:0 16px}
}
.hero{display:flex;flex-direction:column}
${INFLOW_MEDIA}
.hero--photo .hero__media{height:clamp(190px,52vw,300px)}
.hero__in{width:100%;max-width:none;margin:0;padding:34px 20px 40px}
.hero__in::before{content:"";display:block;width:56px;height:5px;background:var(--accent);margin-bottom:20px}
@media (min-width:900px){
 .hero--photo .hero__media{height:clamp(300px,34vw,440px)}
 .hero__in{padding:52px 48px 60px}
}
@media (min-width:1100px){
 .hero__in{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);grid-template-rows:repeat(7,auto) 1fr;column-gap:56px;align-items:start}
 .hero__in::before{grid-column:1/-1;grid-row:1}
 .hero__in>*{grid-column:2}
 .hero h1{grid-column:1;grid-row:2/-1;margin:0;font-size:clamp(2.6rem,4.2vw,4.1rem)}
 .hero__sub{font-size:1.2rem}
}
.strip__in{max-width:none}
@media (min-width:900px){.strip__in{padding:12px 48px}}
.section__label{border-left:4px solid var(--accent);padding-left:10px}
@media (min-width:900px){.section>.wrap{padding:0 48px;max-width:1120px;margin:0}}
.card{border:0;box-shadow:none;border-left:4px solid var(--accent);border-radius:0 var(--radius) var(--radius) 0;background:var(--surface)}
.section--surface .card{background:var(--band)}
.card h3,.card .price{color:var(--text)}
.steps li{border:0;box-shadow:none;border-top:1px solid ${k.line};border-radius:0;background:none;padding:20px 0 0}
.steps li::before{display:grid;place-items:center;width:46px;height:46px;border-radius:var(--radius);background:var(--secondary);color:var(--on-secondary);font-size:1.25rem;margin-bottom:14px}
.cta{text-align:left}.cta .btns{justify-content:flex-start}
@media (min-width:900px){.cta .wrap,.ftr .wrap{padding:0 48px;margin:0;max-width:1120px}}
`;
    },
  },

  framed: {
    name: "Picture frame",
    about: "The whole page sits in a colored frame, each section a separate panel with a thin inner line.",
    css: (t, k) => {
      const c = t.colors;
      return `${SAFE}
body{--frame:10px;--mat:-9px;background:var(--secondary);padding:var(--frame) var(--frame) var(--frame)}
@media (min-width:900px){body{--frame:22px;--mat:-12px}}
body::before{content:"";position:fixed;left:0;right:0;top:0;height:var(--frame);background:var(--secondary);z-index:45;pointer-events:none}
.hdr{top:var(--frame);margin-bottom:var(--frame);border-bottom:0}
.hdr.is-hidden{transform:translateY(calc(-100% - var(--frame)))}
.js .nav{inset:calc(56px + var(--frame)) var(--frame) var(--frame) var(--frame)}
.hero,.strip,.section,.cta{margin-bottom:var(--frame)}
.section{background:var(--bg)}
.section--band{background:var(--band)}
.section--surface{background:var(--surface)}
.todo{background:var(--surface)}
main>.wrap{background:var(--bg);margin-bottom:var(--frame);padding-top:1px;padding-bottom:1px;max-width:none}
.strip{border-bottom:0}
.section{outline:1px solid ${k.line};outline-offset:var(--mat)}
.hero{outline:1px solid ${k.alpha(c.onHero, 0.4)};outline-offset:var(--mat)}
.cta{outline:1px solid ${k.alpha(c.onSecondary, 0.4)};outline-offset:var(--mat)}
.ftr{outline:1px solid ${k.alpha(c.onFooter, 0.3)};outline-offset:var(--mat)}
.hero__in{text-align:center;padding:52px 26px 50px}
.hero__sub{margin-left:auto;margin-right:auto}
.hero__trust,.hero .btns{justify-content:center}
.hero__eyebrow{display:inline-block;border-top:1px solid currentColor;border-bottom:1px solid currentColor;padding:6px 2px}
@media (min-width:900px){
 .hero__in{min-height:min(72vh,600px);display:flex;flex-direction:column;justify-content:center;align-items:center;padding:80px 40px}
 .hero .status,.hero .badge{align-self:center}
}
.hero__credit{right:16px;bottom:14px}
.section__label{display:flex;align-items:center;gap:14px}
.section__label::after{content:"";flex:1;height:1px;background:currentColor;opacity:.45}
.cards{gap:0;border-top:1px solid ${k.line};border-left:1px solid ${k.line}}
.cards .card{background:none;border:0;border-right:1px solid ${k.line};border-bottom:1px solid ${k.line};border-radius:0;box-shadow:none;padding:24px 22px}
.card h3{flex-direction:column;align-items:flex-start;gap:12px}
.card h3 .i{width:44px;height:44px;padding:10px;border:1px solid currentColor;color:var(--text)}
.steps{gap:0;border-top:1px solid ${k.line};border-left:1px solid ${k.line}}
.steps li{background:none;border:0;border-right:1px solid ${k.line};border-bottom:1px solid ${k.line};border-radius:0;box-shadow:none}
.steps li::before{font-size:3rem;color:var(--heading)}
.quote{background:none;border:1px solid ${k.line};border-radius:0;box-shadow:none;position:relative;padding-top:38px}
.quote::before{content:"\\201C";position:absolute;top:6px;left:20px;font:${t.headingWeight} 3rem/1 var(--hf);color:var(--heading)}
.faq details{border-radius:0;box-shadow:none;border:1px solid ${k.line}}
.hours{border-radius:0;outline:1px solid ${k.line}}
.form{border-radius:0;box-shadow:none;border:1px solid ${k.line}}
.btn{border-radius:0}
.hdr__call{border-radius:0}
.cta .wrap{padding-top:8px;padding-bottom:8px}
.ftr{padding-top:56px}
.bar{left:var(--frame);right:var(--frame);bottom:var(--frame);border-radius:0}
.bar a{border-radius:0}
`;
    },
  },

  bento: {
    name: "Tile grid",
    about: "Everything in rounded tiles of different sizes, like a lunch box: big first service, colored blocks.",
    css: (t, k) => {
      const c = t.colors;
      const r = Math.max(18, Math.min(t.radius * 2, 26));
      return `${SAFE}
:root{--tile-r:${r}px}
.hero{background:var(--bg);color:var(--text);display:grid;gap:10px;padding:10px 10px 0;overflow:visible}
${INFLOW_MEDIA}
.hero__in{background:var(--hero-bg);color:var(--on-hero);border-radius:var(--tile-r);margin:0;max-width:none;padding:32px 22px 30px}
.hero--photo .hero__media{border-radius:var(--tile-r);overflow:hidden;aspect-ratio:16/10}
${SOLID_CREDIT}
.hero__credit{bottom:10px;right:18px}
@media (min-width:900px){
 .hero{grid-template-columns:repeat(12,minmax(0,1fr));gap:16px;max-width:1120px;margin:0 auto;padding:16px 20px 0}
 .hero__in{grid-column:6/-1;grid-row:1;padding:56px 44px;display:flex;flex-direction:column;justify-content:center;min-height:500px}
 .hero:not(.hero--photo) .hero__in{grid-column:1/-1;min-height:0}
 .hero--photo .hero__media{grid-column:1/6;grid-row:1;aspect-ratio:auto}
 .hero__credit{right:auto;left:30px;bottom:10px}
}
.strip{background:none;border:0}
.strip__in{grid-template-columns:1fr;gap:8px;padding:10px}
.strip__item{border-radius:var(--tile-r);padding:12px 16px;min-height:64px;background:var(--surface);border:1px solid ${k.line}}
.strip__item:first-child{background:var(--primary);color:var(--on-primary);border-color:transparent}
.strip__item:nth-child(2){background:var(--secondary);color:var(--on-secondary);border-color:transparent}
.strip__item:first-child .i,.strip__item:nth-child(2) .i{color:inherit}
.chips{grid-column:1/-1;margin:2px 0}
@media (min-width:900px){
 .strip__in{grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;max-width:1120px;padding:16px 20px}
 .strip__item{min-height:92px;padding:18px 22px;font-size:1.08rem}
}
.section{padding:calc(var(--space)*.85) 0}
.cards,.quotes,.steps{gap:10px}
.card,.steps li,.quote,.faq details,.form{border-radius:var(--tile-r);box-shadow:none;border:1px solid ${k.line};background:var(--surface)}
.section--surface .card,.section--surface .steps li,.section--surface .quote,.section--surface .faq details{background:var(--band)}
.card h3,.card .price{color:var(--text)}
.cards{grid-template-columns:1fr 1fr}
.card{padding:16px}
.card p{font-size:.95rem}
.card h3{font-size:1.08rem;flex-direction:column;align-items:flex-start;gap:8px}
.cards .card:nth-child(3n+1),.cards .card:last-child:nth-child(3n+2){grid-column:1/-1}
.cards .card:first-child{background:var(--primary);border-color:transparent;padding:24px 22px;min-height:150px;display:flex;flex-direction:column;justify-content:flex-end}
.cards .card:first-child,.cards .card:first-child h3,.cards .card:first-child p,.cards .card:first-child .price,.cards .card:first-child .i{color:var(--on-primary)}
.cards .card:first-child h3{font-size:1.5rem}
.cards .card:nth-child(5){background:var(--secondary);border-color:transparent}
.cards .card:nth-child(5),.cards .card:nth-child(5) h3,.cards .card:nth-child(5) p,.cards .card:nth-child(5) .price,.cards .card:nth-child(5) .i{color:var(--on-secondary)}
@media (min-width:600px){
 .cards,.cards--3{grid-template-columns:1fr 1fr;gap:14px}
 .cards .card:nth-child(3n+1),.cards .card:last-child:nth-child(3n+2){grid-column:auto}
 .cards .card:first-child,.cards .card:last-child:nth-child(even){grid-column:1/-1}
 .card{padding:22px}
 .card p{font-size:1rem}
}
@media (min-width:1000px){
 .cards,.cards--3{grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;grid-auto-flow:dense}
 .cards .card:last-child:nth-child(even){grid-column:auto}
 .cards .card:first-child{grid-column:span 2;grid-row:span 2;padding:36px 34px;min-height:300px}
 .cards .card:first-child h3{font-size:2rem}
 .cards .card:first-child p{font-size:1.12rem;max-width:30rem}
 .cards .card:last-child:nth-child(3n+1):not(:first-child){grid-column:1/-1}
 .cards .card:last-child:nth-child(3n+2):not(:nth-child(2)){grid-column:span 2}
}
.steps li{position:relative;padding:22px 22px 24px}
.steps li::before{font-size:3.4rem;line-height:.9;margin-bottom:.6rem}
.steps li:first-child{background:var(--secondary);border-color:transparent}
.steps li:first-child,.steps li:first-child h3,.steps li:first-child p,.steps li:first-child::before{color:var(--on-secondary)}
@media (min-width:600px) and (max-width:899px){.steps{grid-template-columns:1fr 1fr}}
@media (min-width:900px){.steps{gap:16px}}
.quotes li{display:flex}
.quote{flex:1;padding:22px}
.quotes li:first-child .quote{background:var(--secondary);border-color:transparent}
.quotes li:first-child .quote,.quotes li:first-child .quote footer{color:var(--on-secondary)}
.quotes li:first-child .quote p{font:${t.headingWeight} 1.35rem/1.35 var(--hf)}
@media (min-width:900px){
 .quotes{grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
 .quotes li:first-child{grid-column:span 2;grid-row:span 2}
 .quotes li:first-child:only-child{grid-column:1/-1}
 .quotes li:first-child .quote{padding:40px 38px;display:flex;flex-direction:column;justify-content:space-between}
 .quotes li:first-child .quote p{font-size:1.75rem}
}
.hours{border-radius:var(--tile-r)}
@media (min-width:900px){.visit>div:last-child{background:var(--surface);border:1px solid ${k.line};border-radius:var(--tile-r);padding:28px}}
.section--surface .visit>div:last-child{background:var(--band)}
.cta{width:calc(100% - 20px);max-width:1080px;margin:0 auto 10px;border-radius:calc(var(--tile-r) + 6px);text-align:left}
.cta .btns{justify-content:flex-start}
@media (min-width:900px){
 .cta{width:calc(100% - 40px);margin-bottom:20px}
 .cta .wrap{max-width:none;display:grid;grid-template-columns:1.2fr 1fr;column-gap:48px;align-items:center;padding:0 48px}
 .cta h2{grid-row:1/span 2;margin:0;font-size:clamp(2rem,3.4vw,3rem)}
}
.hdr__call{border-radius:calc(var(--tile-r) - 6px)}
.bar{box-shadow:0 -4px 16px ${k.alpha(c.text, 0.18)}}
`;
    },
  },

  ticker: {
    name: "Bold stripes",
    about: "Colored name bar, the headline in a full-width color band, photo strip and big info blocks.",
    css: (t, k) => {
      const c = t.colors;
      return `${SAFE}
.hdr{background:var(--primary);border-bottom:0}
.brand{color:var(--on-primary);text-transform:uppercase;letter-spacing:.04em;font-size:1.12rem}
.navbtn,.nav a{color:var(--on-primary)}
.js .nav{background:var(--primary)}
.js .nav li{border-color:${k.alpha(c.onPrimary, 0.25)}}
.hdr__call{background:var(--secondary);color:var(--on-secondary)}
.hdr :focus-visible{outline-color:var(--on-primary)}
@media (min-width:900px){.nav a{text-transform:uppercase;letter-spacing:.06em;font-size:.88rem}}
.hero{background:var(--secondary);color:var(--on-secondary);display:flex;flex-direction:column}
.hero h1,.hero h2{color:var(--on-secondary)}
${INFLOW_MEDIA}
.hero__in{order:1;width:100%;max-width:none;margin:0;padding:30px 20px 34px}
.hero__media{order:2}
.hero__credit{order:3}
.hero--photo .hero__media{height:clamp(150px,42vw,340px);border-top:8px solid var(--accent)}
${SOLID_CREDIT}
.hero h1{font-size:clamp(2.4rem,10vw,5.6rem);line-height:.98;letter-spacing:-.02em;border-top:3px solid ${k.alpha(c.onSecondary, 0.6)};border-bottom:3px solid ${k.alpha(c.onSecondary, 0.6)};padding:.22em 0 .26em;margin:.25em 0 .55em}
.hero__eyebrow{display:inline-block;background:var(--primary);color:var(--on-primary);padding:6px 12px;margin:0}
.hero__sub{max-width:44rem}
@media (min-width:900px){
 .hero__in{padding:56px ${EDGE} 52px}
 .hero__in>.hero__sub,.hero__in>.hero__trust,.hero__in>.btns,.hero__in>.status{margin-left:0}
}
.strip{border-bottom:4px solid var(--text)}
.strip__in{max-width:none;padding:0;gap:0}
.strip__item{min-height:84px;padding:14px 20px;font-size:1.12rem;border-bottom:2px solid ${k.line}}
.strip__item .i{width:46px;height:46px;padding:11px;background:var(--primary);color:var(--on-primary)}
.chips{padding:12px 20px}
@media (min-width:900px){
 .strip__in{grid-template-columns:repeat(3,minmax(0,1fr))}
 .strip__item{min-height:110px;padding:20px 28px;border-bottom:0;font-size:1.2rem}
 .strip__item+.strip__item{border-left:3px solid var(--text)}
 .chips{border-top:2px solid ${k.line};padding:14px 28px;margin:0}
}
.section{border-top:3px solid var(--text)}
.strip+main>.section:first-child{border-top:0}
.section__label{display:inline-block;background:var(--primary);color:var(--on-primary);padding:5px 26px 5px 12px;clip-path:polygon(0 0,calc(100% - 14px) 0,100% 50%,calc(100% - 14px) 100%,0 100%);margin-bottom:.9rem}
.section__title{font-size:clamp(2rem,6.4vw,3.3rem);line-height:1.02}
.cards{gap:14px}
.card{padding:0;overflow:hidden;border:2px solid var(--text);border-radius:0;box-shadow:none;background:var(--surface)}
.section--surface .card{background:var(--band)}
.card h3{background:var(--secondary);color:var(--on-secondary);padding:14px 18px;margin:0 0 14px;font-size:1.15rem}
.card h3:last-child{margin:0}
.card h3 .i{color:var(--on-secondary)}
.card>:not(h3){padding:0 18px}
.card>:last-child:not(h3){padding-bottom:18px}
.card .price{color:var(--text);margin-bottom:6px;font-size:1.15rem}
.steps{gap:0}
.steps li{background:none;border:0;box-shadow:none;border-radius:0;border-bottom:2px solid var(--text);padding:20px 0}
.steps li:last-child{border-bottom:0}
.steps li::before{display:inline-grid;place-items:center;min-width:58px;height:58px;padding:0 10px;background:var(--primary);color:var(--on-primary);font-size:1.7rem;margin-bottom:14px}
@media (min-width:900px){
 .steps li{border-bottom:0;border-left:3px solid var(--text);padding:6px 22px}
 .steps li:first-child{border-left:0;padding-left:0}
}
.quote{border:0;border-top:8px solid var(--primary);border-radius:0;box-shadow:none;background:var(--surface)}
.section--surface .quote{background:var(--band)}
.quote footer{display:inline-block;border-top:2px solid var(--text);padding-top:6px}
.faq details{border-radius:0;box-shadow:none;border:0;border-top:2px solid var(--text);margin:0}
.faq details:last-child{border-bottom:2px solid var(--text)}
.hours{border-radius:0;border-top:4px solid var(--text)}
.form{border-radius:0;box-shadow:none;border:2px solid var(--text)}
.cta{position:relative;padding:calc(var(--space) + 18px) 0}
.cta::before,.cta::after{content:"";position:absolute;left:0;right:0;height:14px;background:repeating-linear-gradient(-45deg,var(--accent) 0 14px,transparent 14px 28px)}
.cta::before{top:0}.cta::after{bottom:0}
.cta h2{font-size:clamp(2.2rem,8vw,3.8rem);line-height:1}
.ftr{border-top:8px solid var(--primary)}
`;
    },
  },

  diagonal: {
    name: "Slanted cut",
    about: "Headline and photo split on a slant, angled section edges and cut-corner cards.",
    css: (t, k) => {
      const c = t.colors;
      const tile = (bg: string) =>
        `linear-gradient(225deg,transparent 15px,var(--accent) 15px 20px,transparent 20px),linear-gradient(45deg,transparent 15px,var(--accent) 15px 20px,transparent 20px),${bg}`;
      return `${SAFE}
:root{--cut:clamp(22px,4vw,44px)}
.hero{display:flex;flex-direction:column}
${INFLOW_MEDIA}
.hero--photo .hero__media{height:clamp(220px,62vw,340px);clip-path:polygon(0 0,100% 0,100% 100%,0 calc(100% - var(--cut)))}
.hero__in{width:100%;padding:30px 20px calc(40px + var(--cut))}
.hero::after{content:"";position:absolute;left:0;right:0;bottom:0;height:var(--cut);background:var(--accent);clip-path:polygon(0 100%,100% 0,100% 100%)}
${SOLID_CREDIT}
.hero__credit{bottom:auto;top:8px}
.hero h1{position:relative}
.hero h1::after{content:"";display:block;width:84px;height:8px;margin-top:.28em;background:var(--accent);transform:skewX(-30deg);transform-origin:0 0}
@media (min-width:900px){
 .hero{min-height:560px;justify-content:center}
 .hero--photo .hero__media{position:absolute;inset:0 0 0 48%;height:auto;clip-path:polygon(0 0,100% 0,100% 100%,20% 100%)}
 .hero--photo::before{content:"";position:absolute;top:0;bottom:0;left:calc(48% - 16px);width:52%;background:var(--accent);clip-path:polygon(0 0,100% 0,100% 100%,20% 100%)}
 .hero--photo .hero__in{margin:0;max-width:none;width:46%;padding:80px 40px 92px ${EDGE}}
 .hero:not(.hero--photo) .hero__in{padding:96px 20px 110px}
 .hero:not(.hero--photo)::before{content:"";position:absolute;top:0;bottom:0;right:0;width:26%;background:${k.alpha(c.accent, 0.35)};clip-path:polygon(40% 0,100% 0,100% 100%,0 100%)}
 .hero--photo::after{display:none}
 .hero__credit{top:auto;bottom:8px}
}
.section__label::before{content:"";display:inline-block;width:22px;height:10px;background:var(--accent);transform:skewX(-30deg);margin-right:12px;vertical-align:.05em}
.section+.section--band,.section+.cta{position:relative;margin-top:calc(-1 * var(--cut));padding-top:calc(var(--space) + var(--cut))}
.section+.section--band{clip-path:polygon(0 var(--cut),100% 0,100% 100%,0 100%)}
.section+.cta{clip-path:polygon(0 0,100% var(--cut),100% 100%,0 100%)}
main+.ftr{position:relative;margin-top:calc(-1 * var(--cut));padding-top:calc(48px + var(--cut));clip-path:polygon(0 var(--cut),100% 0,100% 100%,0 100%)}
.card,.quote{background:${tile("var(--surface)")};border:0;border-radius:0;box-shadow:inset 0 0 0 1px ${k.line};clip-path:polygon(0 0,calc(100% - 22px) 0,100% 22px,100% 100%,22px 100%,0 calc(100% - 22px))}
.section--surface .card,.section--surface .quote{background:${tile("var(--band)")}}
.card h3,.card .price{color:var(--text)}
.card{padding:24px 26px}
.steps li{background:none;border:0;box-shadow:none;border-radius:0;padding:0}
.steps li::before{display:grid;place-items:center;width:62px;height:46px;background:var(--primary);color:var(--on-primary);clip-path:polygon(14px 0,100% 0,calc(100% - 14px) 100%,0 100%);font-size:1.4rem;margin-bottom:14px}
.faq details{border-radius:0;box-shadow:none;border:0;border-left:5px solid var(--accent)}
.hours{border-radius:0}
.form{border-radius:0;box-shadow:none;border:0;border-top:6px solid var(--accent)}
.cta h2{font-size:clamp(2rem,6.5vw,3.2rem)}
`;
    },
  },

  circle: {
    name: "Round & centered",
    about: "Round photo in the middle, centered headings, round icons and step numbers, soft curved edges.",
    css: (t, k) => {
      const c = t.colors;
      return `${SAFE}
:root{--ring:var(--bg)}
.section--band{--ring:var(--band)}
.section--surface{--ring:var(--surface)}
.hdr__call,.btn,.bar a{border-radius:999px}
@media (min-width:900px){.nav a{border-radius:999px}.nav a:hover{background:var(--band);color:var(--text);text-decoration:none}}
.hero{text-align:center;display:flex;flex-direction:column;align-items:center;border-radius:0 0 50% 50%/0 0 clamp(28px,6vw,80px) clamp(28px,6vw,80px)}
${INFLOW_MEDIA}
.hero--photo .hero__media{flex:none;width:min(64vw,280px);aspect-ratio:1;border-radius:50%;overflow:hidden;margin:34px auto 0;box-shadow:0 0 0 8px var(--hero-bg),0 0 0 11px var(--accent)}
.hero__in{width:100%;max-width:48rem;padding:28px 20px 60px}
.hero__sub{margin-left:auto;margin-right:auto}
.hero__trust,.hero .btns{justify-content:center}
.hero__credit{position:static;margin:-46px 0 40px}
.hero:not(.hero--photo) .hero__in::before{content:"";display:block;width:72px;height:72px;margin:0 auto 22px;border-radius:50%;border:2px solid var(--accent);box-shadow:inset 0 0 0 10px var(--hero-bg),inset 0 0 0 12px var(--accent),0 0 0 8px var(--hero-bg),0 0 0 9px var(--accent)}
@media (min-width:900px){
 .hero--photo .hero__media{width:300px;margin-top:52px}
 .hero__in{padding:32px 20px 96px}
 .hero:not(.hero--photo) .hero__in{padding-top:80px}
}
.strip{background:none;border:0}
.strip__in{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;padding:18px 20px}
.strip__item{flex:1 1 100%;background:var(--surface);border:1px solid ${k.line};border-radius:999px;padding:6px 20px 6px 6px}
.strip__item .i{width:42px;height:42px;padding:10px;border-radius:50%;background:var(--primary);color:var(--on-primary)}
.chips{flex:1 1 100%;justify-content:center}
@media (min-width:900px){.strip__item{flex:0 1 auto}}
.section__label,.section__title,.lead{text-align:center;margin-left:auto;margin-right:auto}
.section__title::before,.section__title::after{margin-left:auto;margin-right:auto}
.section__label::before{content:"";display:block;width:10px;height:10px;border-radius:50%;background:var(--accent);margin:0 auto 12px;box-shadow:-20px 0 0 ${k.alpha(c.accent, 0.55)},20px 0 0 ${k.alpha(c.accent, 0.55)}}
.section--band{border-radius:50% 50% 0 0/clamp(24px,5vw,64px) clamp(24px,5vw,64px) 0 0}
.section .btns,.towns{justify-content:center}
#area .wrap>p{text-align:center}
.visit .btns{justify-content:flex-start}
.cards{gap:44px 18px;margin-top:56px}
.card{text-align:center;border-radius:28px;padding:26px 22px 24px;background:var(--surface)}
.section--surface .card{background:var(--band)}
.card h3,.card .price{color:var(--text)}
.card h3{flex-direction:column;justify-content:center;gap:12px}
.card h3 .i{width:64px;height:64px;padding:17px;margin-top:-58px;border-radius:50%;background:var(--primary);color:var(--on-primary);box-shadow:0 0 0 6px var(--ring)}
.card .price{display:inline-block;margin:2px 0 10px;padding:4px 14px;border-radius:999px;background:var(--band)}
.section--surface .card .price{background:var(--surface)}
.steps{gap:28px}
.steps li{position:relative;text-align:center;background:none;border:0;box-shadow:none;padding:0}
.steps li::before{position:relative;z-index:1;display:grid;place-items:center;width:72px;height:72px;margin:0 auto 16px;border-radius:50%;background:var(--primary);color:var(--on-primary);font-size:1.8rem;box-shadow:0 0 0 6px var(--ring),0 0 0 8px var(--accent)}
@media (min-width:900px){.steps li:not(:last-child)::after{content:"";position:absolute;top:36px;left:calc(50% + 46px);width:calc(100% - 64px);border-top:2px dashed ${k.line}}}
.quotes{gap:52px 18px;margin-top:56px}
.quote{position:relative;text-align:center;border-radius:28px;padding:44px 22px 24px;background:var(--surface)}
.section--surface .quote{background:var(--band)}
.quote::before{content:"\\201C";position:absolute;top:-28px;left:50%;transform:translateX(-50%);width:56px;height:56px;border-radius:50%;background:var(--secondary);color:var(--on-secondary);font:700 2.6rem/1.5 Georgia,serif;box-shadow:0 0 0 6px var(--ring)}
.faq details{border-radius:24px}
.hours,.form{border-radius:24px}
.about img{border-radius:50%}
.cta{border-radius:50% 50% 0 0/clamp(24px,5vw,64px) clamp(24px,5vw,64px) 0 0;background:radial-gradient(circle at 8% 22%,transparent 0 70px,${k.alpha(c.onSecondary, 0.18)} 71px 73px,transparent 74px),radial-gradient(circle at 94% 80%,transparent 0 110px,${k.alpha(c.onSecondary, 0.18)} 111px 113px,transparent 114px),var(--secondary)}
.ftr__grid{text-align:center}
`;
    },
  },
} as const satisfies Record<string, LayoutDef>;
