import { contrast } from "./color.ts";
import { INFLOW_MEDIA, PLAIN_HERO, SOLID_CREDIT, type LayoutDef } from "./layout-kit.ts";

/** More page layouts (see layouts.ts). CSS only, on the shared markup; layoutCss adds the layout marker comment. */

/** Pieces with their own surface background: text inside them goes back to the look's own text colors. */
const ON_SURFACE = ".card,.form,.hours,.faq details,.todo,.chip";

export const LAYOUTS_B = {
  newspaper: {
    name: "Newspaper",
    about: "Big masthead name between rules, headline columns, pull quotes and text in columns.",
    css: (t, k) => {
      const w = t.headingWeight;
      return `.hdr{background:var(--bg);border-top:6px solid var(--text);border-bottom:1px solid var(--text)}
.hdr::after{content:"";display:block;height:3px;border-bottom:1px solid var(--text)}
.brand{font-size:1.35rem;letter-spacing:-.01em}
.js .nav{inset:var(--hdr-h,66px) 0 0 0;background:var(--bg)}
@media (min-width:900px){
 .hdr__in{display:grid;grid-template-columns:1fr auto;padding-top:12px}
 .brand{grid-column:1/-1;justify-self:stretch;text-align:center;max-width:none;margin:0;font-size:clamp(2.4rem,4.2vw,3.5rem);line-height:1.05;padding:4px 0 12px;border-bottom:1px solid var(--text)}
 .js .nav,.no-js .nav{grid-column:1;grid-row:2}
 .js .nav li+li,.no-js .nav li+li{border-left:1px solid ${k.line}}
 .nav a{text-transform:uppercase;letter-spacing:.08em;font-size:.85rem;padding:12px 14px}
 .hdr__call{grid-column:2;grid-row:2;margin:6px 0;min-height:44px}
}
@media (min-width:900px) and (max-width:1180px){.nav a{padding:12px 9px;font-size:.8rem}}
${PLAIN_HERO}
.hero{display:flex;flex-direction:column}
${INFLOW_MEDIA}
.hero__in{order:1;padding:30px 20px 26px}
.hero__media{order:2}
.hero--photo .hero__media{width:calc(100% - 40px);max-width:1080px;margin:0 auto 32px;aspect-ratio:3/2}
.hero__credit{position:static;order:3;width:calc(100% - 40px);max-width:1080px;margin:-24px auto 28px;color:var(--muted);font-style:italic}
.hero__eyebrow{border-bottom:1px solid var(--text);padding-bottom:8px;text-transform:uppercase;letter-spacing:.12em;font-size:.8rem}
.hero h1{font-size:clamp(2.4rem,9.5vw,4.9rem);line-height:1.02;letter-spacing:-.02em}
.hero__sub{font-family:var(--hf);font-style:italic}
@media (min-width:900px){
 .hero__in{display:grid;grid-template-columns:1.65fr 1fr;column-gap:36px;padding:44px 20px 40px}
 .hero__in>*{grid-column:2}
 .hero__in>.badge,.hero__in>.hero__eyebrow{grid-column:1/-1;justify-self:start}
 .hero__in>.hero__eyebrow{justify-self:stretch;margin-bottom:22px}
 .hero h1{grid-column:1;grid-row:span 5;margin:0;padding-right:36px;border-right:1px solid ${k.line}}
 .hero--photo .hero__media{aspect-ratio:21/8}
}
.strip{background:var(--bg);border-top:1px solid var(--text);border-bottom:1px solid var(--text)}
@media (min-width:900px){.strip__item+.strip__item{border-left:1px solid ${k.line};padding-left:18px}}
.section--surface{background:var(--bg)}
.section>.wrap::before{content:"";display:block;height:6px;border-top:3px solid var(--text);border-bottom:1px solid var(--text);margin-bottom:18px}
.section__label{display:inline-block;background:var(--text);color:var(--bg);padding:3px 10px;text-transform:uppercase;letter-spacing:.12em;font-variant-caps:normal;font-size:.75rem}
.section--band .section__label{color:var(--band)}
.section__title{font-size:clamp(2rem,6.4vw,3.3rem);letter-spacing:-.02em;padding-bottom:.3em;border-bottom:1px solid ${k.line}}
.section__title::before,.section__title::after{display:none}
.cards{gap:0;margin-top:8px}
.card{background:none;border:0;box-shadow:none;border-radius:0;padding:18px 0;border-bottom:1px solid ${k.line}}
.card h3{font-size:1.35rem}.card h3 .i{display:none}
.price{font-style:italic}
@media (min-width:600px){
 .cards .card{padding:18px 22px;border-left:1px solid ${k.line}}
 .cards li:nth-child(2n+1){border-left:0;padding-left:0}
}
@media (min-width:1000px){
 .cards--3 li:nth-child(2n+1){border-left:1px solid ${k.line};padding-left:22px}
 .cards--3 li:nth-child(3n+1){border-left:0;padding-left:0}
}
.steps{gap:0}
.steps li{background:none;border:0;box-shadow:none;border-radius:0;padding:16px 0;border-bottom:1px solid ${k.line}}
.steps li::before{content:"No. " counter(step);font:italic ${w} 1.5rem/1 var(--hf);color:var(--heading);margin-bottom:.5rem}
@media (min-width:900px){.steps li{padding:4px 22px;border-bottom:0;border-left:1px solid ${k.line}}.steps li:first-child{border-left:0;padding-left:0}}
.quotes{gap:20px}
.quote{background:none;border:0;box-shadow:none;border-radius:0;border-top:4px solid var(--text);border-bottom:1px solid var(--text);padding:18px 0 14px}
.quote p{font:italic ${w} 1.35rem/1.38 var(--hf);color:var(--heading)}
.quote footer{text-transform:uppercase;letter-spacing:.1em;font-size:.8rem}
@media (min-width:900px){.quotes{gap:0 36px}}
@media (min-width:900px){
 #about .wrap{max-width:1120px;column-count:2;column-gap:48px;column-rule:1px solid ${k.line}}
 #about .wrap::before,#about .section__label,#about .section__title,#about .todo,#about .btns{column-span:all}
 #about p{text-align:justify;hyphens:auto}
}
#about .section__title{margin-bottom:.8em}
#about p:first-of-type::first-line{font-variant:small-caps;letter-spacing:.04em}
.hours{background:none;border-top:2px solid var(--text);border-radius:0}
.faq details{background:none;border:0;box-shadow:none;border-radius:0;border-bottom:1px solid ${k.line};margin:0}
.faq summary{font-family:var(--hf);font-size:1.15rem}
.form{border:1px solid var(--text);box-shadow:none;border-radius:0}
.cta{text-align:left}
.cta .wrap{max-width:1120px}
.cta h2{font-size:clamp(2.2rem,7vw,3.8rem);line-height:1}
.cta .btns{justify-content:flex-start}
@media (min-width:900px){
 .cta .wrap{display:grid;grid-template-columns:1.4fr 1fr;column-gap:40px;align-items:center}
 .cta h2{grid-row:span 2;margin:0;padding-right:40px;border-right:1px solid ${k.alpha(t.colors.onSecondary, 0.45)}}
}
.ftr{border-top:6px solid var(--text)}
@media (min-width:900px){.ftr__grid>div+div{border-left:1px solid ${k.alpha(t.colors.onFooter, 0.25)};padding-left:28px}}
`;
    },
  },

  letter: {
    name: "Letter card",
    about: "One narrow centered column like a card on a tinted page, with a framed photo.",
    css: (t, k) => {
      const w = t.headingWeight;
      return `@media (min-width:760px){
 body{background:var(--band);padding-top:28px}
 .hdr,.hero,.strip,main,.ftr{max-width:720px;margin-left:auto;margin-right:auto;border-left:1px solid ${k.line};border-right:1px solid ${k.line}}
 .hdr{border-top:1px solid ${k.line}}
 .ftr{margin-bottom:28px}
}
.hdr{background:var(--bg)}
.hdr .wrap{padding:0 14px 0 20px}
.brand{font-size:1.2rem}
@media (min-width:900px){
 .hdr .wrap{padding:0 24px 0 40px}
 .navbtn{display:inline-flex}
 .js .nav{display:none;position:absolute;inset:100% -1px auto -1px;background:var(--bg);padding:6px 40px 18px;border:1px solid ${k.line};border-top:0;box-shadow:0 14px 30px ${k.alpha(t.colors.text, 0.14)};max-height:calc(100vh - 90px);overflow:auto}
 .js .nav.is-open{display:block}
 .js .nav ul{display:block}
 .js .nav li{border-bottom:1px solid ${k.line}}
 .js .nav a{padding:14px 4px;font-size:1.1rem}
}
.wrap{padding:0 24px}
@media (min-width:760px){.wrap{padding:0 56px}}
${PLAIN_HERO}
.hero{display:flex;flex-direction:column}
${INFLOW_MEDIA}
.hero--photo .hero__media{order:1;margin:24px 24px 0;padding:10px;background:var(--surface);border:1px solid ${k.line};box-shadow:0 8px 22px ${k.alpha(t.colors.text, 0.14)};aspect-ratio:4/3}
.hero__credit{position:static;order:2;text-align:center;color:var(--muted);margin:10px 24px 0}
.hero__in{order:3;text-align:center;padding:34px 24px 40px;max-width:none;margin:0}
@media (min-width:760px){.hero--photo .hero__media{margin:40px 56px 0;aspect-ratio:3/2}.hero__in{padding:44px 56px 52px}}
.hero h1{font-size:clamp(2.1rem,7.4vw,3.3rem)}
.hero__eyebrow{font-style:italic;font-weight:400;letter-spacing:.04em}
.hero__sub{margin-left:auto;margin-right:auto}
.hero__trust,.hero .btns{justify-content:center}
.hero__in::after{content:"";display:block;width:72px;height:2px;background:var(--accent);margin:34px auto 0}
.strip{background:var(--bg);border-top:1px solid ${k.line};border-bottom:1px solid ${k.line}}
.strip__in{padding:10px 24px;justify-items:center;text-align:center}
.strip__item{justify-content:center}
.chips{justify-content:center}
@media (min-width:900px){.strip__in{grid-template-columns:1fr;padding:12px 56px}}
main{background:var(--bg);font-size:1.1rem}
.section{padding:52px 0}
.section--band,.section--surface{background:var(--bg)}
main>.section+.section>.wrap::before{content:"";display:block;width:72px;height:2px;background:var(--accent);margin:-4px auto 46px}
.section__label,.section__title{text-align:center}
.section__label{font-style:italic;font-weight:400;letter-spacing:.06em}
.section__title::before,.section__title::after{margin-left:auto!important;margin-right:auto!important}
.lead{text-align:center;margin-left:auto;margin-right:auto}
.section .btns{justify-content:center}
.cards,.cards--3{grid-template-columns:1fr;gap:0;margin-top:20px}
.card{background:none;border:0;box-shadow:none;border-radius:0;padding:22px 0;border-top:1px solid ${k.line};text-align:center}
.card h3{justify-content:center;font-size:1.3rem}
.card h3 .i{color:var(--heading)}
.price{font-style:italic}
.steps,.quotes{grid-template-columns:1fr}
@media (min-width:900px){.steps{grid-template-columns:1fr 1fr;gap:28px}.quotes{grid-template-columns:1fr}}
.steps li{background:none;border:0;box-shadow:none;border-radius:0;padding:10px 0;text-align:center}
.steps li::before{content:counter(step,upper-roman);display:block;font:italic ${w} 1.7rem/1 var(--hf);color:var(--heading);margin-bottom:12px}
.quote{background:none;border:0;box-shadow:none;border-radius:0;text-align:center;padding:6px 0}
.quote p{font:italic ${w} 1.3rem/1.5 var(--hf);color:var(--heading)}
.quotes li+li .quote::before{content:"";display:block;width:40px;height:1px;background:currentColor;margin:0 auto 26px}
.visit{grid-template-columns:1fr!important}
.visit>div:last-child{text-align:center}
.hours{background:none;border-radius:0;border-top:1px solid ${k.line}}
.faq details{background:none;border:0;box-shadow:none;border-radius:0;border-bottom:1px solid ${k.line};margin:0}
.faq{border-top:1px solid ${k.line}}
.form{border:1px solid ${k.line};box-shadow:none}
.about,.gallery{margin-top:20px}
.gallery img{border:6px solid var(--surface);box-shadow:0 2px 8px ${k.alpha(t.colors.text, 0.14)}}
.cta{padding:56px 0}
.cta h2{font-style:italic}
.ftr{padding-top:40px}
.ftr .wrap{text-align:center}
@media (min-width:900px){.ftr__grid{grid-template-columns:1fr;gap:18px}}
`;
    },
  },

  timeline: {
    name: "Timeline",
    about: "A line runs down the page with dots, steps, services and reviews along it.",
    css: (t, k) => {
      const w = t.headingWeight;
      const c = t.colors;
      // The rail is decorative, but it is the whole idea of this layout: use the accent unless it's too faint on the page.
      const rail = contrast(c.accent, c.bg) >= 1.8 ? c.accent : contrast(c.primary, c.bg) >= contrast(c.link, c.bg) ? c.primary : c.link;
      return `:root{--rail:${rail}}
.brand::before{content:"";display:inline-block;width:12px;height:12px;border-radius:50%;border:3px solid var(--rail);margin-right:10px;vertical-align:.12em}
.hdr{border-bottom:3px solid var(--rail)}
.hero{display:flex;flex-direction:column}
${INFLOW_MEDIA}
.hero--photo .hero__media{aspect-ratio:3/2}
${SOLID_CREDIT}
.hero__credit{top:8px;bottom:auto}
.hero__in{width:100%}
.strip{background:var(--bg)}
.section--surface .card,.section--surface .quote{background:var(--bg)}
.card h3,.price{color:var(--text)}
.card h3 .i{color:var(--link)}
.quote footer{color:var(--text)}
.cards .card,.quote{background:var(--surface);border:1px solid ${k.line};box-shadow:none;border-radius:var(--radius)}
.cards>li,.steps>li,.quotes>li{position:relative}
.steps li{background:none;border:0;box-shadow:none;border-radius:0}
.steps li::before{display:grid;place-items:center;width:46px;height:46px;border-radius:50%;background:var(--primary);color:var(--on-primary);font-size:1.25rem;margin:0}
@media (max-width:899px){
 .hero__in{padding:36px 20px 40px 56px}
 .hero__in::before{content:"";position:absolute;left:21px;top:62px;bottom:0;width:3px;background:var(--rail)}
 .hero__in::after{content:"";position:absolute;left:12px;top:44px;width:21px;height:21px;border-radius:50%;border:4px solid var(--rail);background:var(--hero-bg)}
 .strip__in{position:relative;padding-left:56px}
 .strip__in::before,.section>.wrap::before{content:"";position:absolute;left:21px;top:0;bottom:0;width:3px;background:var(--rail)}
 .section>.wrap{position:relative;padding-left:56px}
 .section>.wrap::before{top:calc(-1 * var(--space));bottom:calc(-1 * var(--space))}
 .section__label::before{content:"";position:absolute;left:12px;width:21px;height:21px;margin-top:1px;border-radius:50%;border:4px solid var(--primary);background:var(--bg)}
 .section--band .section__label::before{background:var(--band)}
 .section--surface .section__label::before{background:var(--surface)}
 .cards{gap:14px}
 .cards>li::before,.quotes>li::before{content:"";position:absolute;left:-41px;top:26px;width:13px;height:13px;border-radius:50%;background:var(--rail)}
 .cards>li::after,.quotes>li::after{content:"";position:absolute;left:-29px;top:31px;width:29px;height:3px;background:var(--rail)}
 .steps{gap:26px}
 .steps li{padding:6px 0 0}
 .steps li::before{position:absolute;left:-56px;top:0}
 .steps h3{min-height:36px}
}
@media (min-width:900px){
 .hero__in{text-align:center;padding:72px 20px 132px;max-width:900px}
 .hero--photo{display:grid;grid-template-columns:1fr 1fr;column-gap:96px;align-items:center;padding:0 max(20px,calc((100% - 1080px) / 2))}
 .hero--photo::before{content:"";position:absolute;left:50%;top:0;bottom:0;width:3px;margin-left:-1.5px;background:var(--rail)}
 .hero--photo::after{content:"";position:absolute;left:50%;top:50%;width:23px;height:23px;margin:-11.5px 0 0 -11.5px;border-radius:50%;border:4px solid var(--rail);background:var(--hero-bg)}
 .hero--photo .hero__in{grid-column:1;grid-row:1;text-align:right;padding:80px 0;max-width:none}
 .hero--photo .hero__media{grid-column:2;grid-row:1;aspect-ratio:4/3;border-radius:var(--radius);overflow:hidden;margin:64px 0}
 .hero__sub{margin-left:auto;margin-right:auto}
 .hero__trust,.hero .btns{justify-content:center}
 .hero__in::before{content:"";position:absolute;left:50%;bottom:0;width:3px;height:84px;margin-left:-1.5px;background:var(--rail)}
 .hero__in::after{content:"";position:absolute;left:50%;bottom:84px;width:21px;height:21px;margin-left:-10.5px;border-radius:50%;border:4px solid var(--rail);background:var(--hero-bg)}
 .hero--photo .hero__in::before,.hero--photo .hero__in::after{display:none}
 .hero--photo .hero__sub{margin-right:0}
 .hero--photo .hero__trust,.hero--photo .btns{justify-content:flex-end}
 .section__label::before{content:"";display:block;width:21px;height:21px;margin:0 auto 12px;border-radius:50%;border:4px solid var(--primary)}
 .section__label,.section__title{text-align:center}
 .section__title::before,.section__title::after{margin-left:auto!important;margin-right:auto!important}
 .lead{text-align:center;margin-left:auto;margin-right:auto}
 .section>.wrap>.btns{justify-content:center}
 .cards,.cards--3,.steps,.quotes{display:block;position:relative;max-width:1000px;margin:44px auto 28px}
 .cards::before,.steps::before,.quotes::before{content:"";position:absolute;left:50%;top:0;bottom:0;width:3px;margin-left:-1.5px;background:var(--rail)}
 .cards>li,.steps>li,.quotes>li{width:calc(50% - 46px)}
 .cards>li+li,.quotes>li+li{margin-top:-28px}
 .steps>li+li{margin-top:-6px}
 .cards>li:nth-child(even),.steps>li:nth-child(even),.quotes>li:nth-child(even){margin-left:calc(50% + 46px)}
 .cards>li:nth-child(odd),.steps>li:nth-child(odd){text-align:right}
 .cards>li:nth-child(odd) h3{justify-content:flex-end}
 .cards>li::before,.quotes>li::before{content:"";position:absolute;top:28px;right:-53px;width:14px;height:14px;border-radius:50%;background:var(--rail)}
 .cards>li::after,.quotes>li::after{content:"";position:absolute;top:33px;right:-46px;width:40px;height:3px;background:var(--rail)}
 .cards>li:nth-child(even)::before,.quotes>li:nth-child(even)::before{right:auto;left:-53px}
 .cards>li:nth-child(even)::after,.quotes>li:nth-child(even)::after{right:auto;left:-46px}
 .steps li{padding:8px 0 24px}
 .steps li::before{position:absolute;top:0;right:-69px}
 .steps li:nth-child(even)::before{right:auto;left:-69px}
 .quote p{font:${w} 1.2rem/1.45 var(--hf)}
}
.cta .wrap::before{content:"";display:block;width:21px;height:21px;margin:0 auto 22px;border-radius:50%;border:4px solid var(--rail)}
`;
    },
  },

  bigtype: {
    name: "Big type",
    about: "Giant headline and huge numbered section titles, bold and plain.",
    css: (t, k) => {
      const w = t.headingWeight;
      return `.hdr{background:var(--bg);border-bottom:3px solid var(--text)}
.brand{font-size:1.45rem;letter-spacing:-.03em}
.hdr__call{border-radius:0}
.hero{display:flex;flex-direction:column}
${INFLOW_MEDIA}
.hero--photo .hero__media{height:clamp(170px,30vw,340px)}
${SOLID_CREDIT}
.hero__credit{top:8px;bottom:auto}
.hero__in{width:100%;padding:40px 20px 52px}
@media (min-width:900px){.hero__in{padding:72px 20px 88px}}
.hero h1{font-size:clamp(3rem,15vw,8.2rem);line-height:.9;letter-spacing:-.045em;margin-bottom:.32em;overflow-wrap:break-word;hyphens:auto;max-width:11em}
.hero__sub{font-size:clamp(1.2rem,3.8vw,1.75rem);max-width:34rem;line-height:1.35}
.hero__eyebrow{text-transform:uppercase;letter-spacing:.2em;font-variant-caps:normal;font-size:.85rem}
.btn{border-radius:0}
.strip{background:var(--bg);border-bottom:3px solid var(--text)}
.section--surface{background:var(--bg)}
main{counter-reset:bt}
main>.section[id] .section__label{counter-increment:bt}
.section__label{color:var(--text);text-transform:uppercase;letter-spacing:.2em;font-variant-caps:normal;font-size:.82rem}
main>.section[id] .section__label::before{content:counter(bt,decimal-leading-zero);content:counter(bt,decimal-leading-zero) / "";display:block;font:${w} clamp(5.4rem,28vw,11rem)/.82 var(--hf);color:transparent;-webkit-text-stroke:2px var(--heading);letter-spacing:-.05em;margin:0 0 .18em -.04em}
.section__title{font-size:clamp(2.5rem,11vw,5.8rem);line-height:.94;letter-spacing:-.04em;max-width:14em;overflow-wrap:break-word;hyphens:auto}
.section__title::before,.section__title::after{display:none}
.lead{font-size:clamp(1.15rem,3vw,1.4rem)}
.cards{gap:0 44px;margin-top:36px}
.card{background:none;border:0;box-shadow:none;border-radius:0;padding:20px 0 28px;border-top:4px solid var(--text)}
.card h3{font-size:clamp(1.5rem,5vw,2.15rem);letter-spacing:-.025em;line-height:1.05}
.card h3 .i{display:none}
.price{font-size:1.35rem}
.steps{gap:30px}
.steps li{background:none;border:0;box-shadow:none;border-radius:0;padding:0}
.steps li::before{font-size:clamp(5rem,17vw,7.5rem);line-height:.85;letter-spacing:-.06em;color:var(--heading);margin-bottom:.12em}
.steps h3{font-size:1.45rem}
.quotes{gap:40px;margin:36px 0}
@media (min-width:900px){.quotes{grid-template-columns:1fr}}
.quote{background:none;border:0;box-shadow:none;border-radius:0;padding:0}
.quote p{font:${w} clamp(1.55rem,5.4vw,2.7rem)/1.14 var(--hf);letter-spacing:-.025em;color:var(--heading);margin-bottom:.5em;max-width:24em}
.quote footer{color:var(--text);text-transform:uppercase;letter-spacing:.16em;font-size:.9rem}
.quote footer::before{content:"";display:inline-block;width:36px;height:3px;background:currentColor;vertical-align:middle;margin-right:12px}
.hours{background:none;border-radius:0;border-top:4px solid var(--text)}
.faq details{background:none;border:0;box-shadow:none;border-radius:0;border-bottom:2px solid var(--text);margin:0}
.faq summary{font:${w} 1.3rem/1.25 var(--hf);padding:20px 0}
.faq details p{padding:0 0 20px}
.faq summary::after{color:var(--heading);font-size:1.8rem}
.form{border:3px solid var(--text);box-shadow:none;border-radius:0}
.cta{background:var(--hero-bg);color:var(--on-hero);text-align:left;padding:calc(var(--space) + 16px) 0}
.cta .wrap{max-width:1120px}
.cta h2{color:var(--on-hero);font-size:clamp(3rem,13vw,7.4rem);line-height:.9;letter-spacing:-.045em;overflow-wrap:break-word}
.cta p{font-size:clamp(1.15rem,3vw,1.45rem)}
.cta .btns{justify-content:flex-start}
.cta .btn--ghost{color:var(--on-hero)}
.ftr h2{font-size:1.7rem;letter-spacing:-.02em}
`;
    },
  },

  billboard: {
    name: "Billboard",
    about: "Full-width bands of strong color in turn, centered text, framed photo and a big call button.",
    css: (t, k) => {
      const c = t.colors;
      const w = t.headingWeight;
      const band2 = "main>section.section:nth-of-type(3n+2)";
      const band3 = "main>section.section:nth-of-type(3n)";
      const rule = `10px solid ${c.text}`;
      return `.hdr{background:var(--hero-bg);border-bottom:0;--focus:var(--on-hero)}
.brand,.navbtn,.nav a{color:var(--on-hero)}
.js .nav{background:var(--hero-bg)}
.js .nav li{border-color:${k.alpha(c.onHero, 0.3)}}
.hero{display:flex;flex-direction:column;text-align:center}
${INFLOW_MEDIA}
.hero__in{order:1;width:100%;max-width:980px;padding:44px 20px 44px}
.hero--photo .hero__media{order:2;width:calc(100% - 40px);max-width:1080px;margin:0 auto 44px;aspect-ratio:4/3;border:6px solid var(--on-hero);border-radius:var(--radius);overflow:hidden}
.hero__credit{order:3;position:static;margin:-34px 20px 20px;text-align:center}
@media (min-width:900px){.hero__in{padding:84px 20px 64px}.hero--photo .hero__media{aspect-ratio:21/8;margin-bottom:64px}.hero__credit{margin-top:-54px}}
.hero h1{font-size:clamp(2.6rem,10vw,5.4rem);line-height:1}
.hero__sub{margin-left:auto;margin-right:auto}
.hero__trust,.hero .btns{justify-content:center}
.hero .btn{min-height:58px;padding:.9em 1.8em}
.strip{border-top:${rule};border-bottom:0}
.strip__in{justify-items:center;text-align:center}
.strip__item,.chips{justify-content:center}
.section--band,.section--surface,main>section.section{background:var(--bg)}
main>section.section{border-top:${rule}}
${band2}{background:var(--secondary);color:var(--on-secondary);--text:var(--on-secondary);--heading:var(--on-secondary);--muted:var(--on-secondary);--link:var(--on-secondary);--focus:var(--on-secondary)}
${band2} .btn--secondary{background:var(--on-secondary);color:var(--secondary)}
${band3}{background:var(--primary);color:var(--on-primary);--text:var(--on-primary);--heading:var(--on-primary);--muted:var(--on-primary);--link:var(--on-primary);--focus:var(--on-primary)}
${band3} .btn--primary{background:var(--on-primary);color:var(--primary)}
${ON_SURFACE}{--text:${c.text};--heading:${c.text};--muted:${c.text};--link:${c.link};--focus:${c.link};color:${c.text}}
main>.section>.wrap{text-align:center}
.section{padding:calc(var(--space) + 8px) 0}
.section__label{display:inline-block;border:3px solid currentColor;border-radius:999px;padding:4px 16px;margin-bottom:1rem}
.section__title{font-size:clamp(2.2rem,8.4vw,4.2rem);line-height:1.02}
.section__title::before{display:none}
.section__title::after{content:"";display:block;width:84px;max-width:none;height:8px;border-radius:4px;background:currentColor;margin:20px auto 0}
.lead{margin-left:auto;margin-right:auto;font-size:1.25rem}
.section .btns,.towns{justify-content:center}
.cards{gap:20px;margin-top:36px}
.card{border:4px solid ${c.text};box-shadow:none;padding:28px 22px;text-align:center}
.card h3{flex-direction:column;justify-content:center;gap:.35em;font-size:1.35rem}
.card h3 .i{width:34px;height:34px;color:var(--primary)}
.steps{gap:30px;margin-top:36px}
.steps li{background:none;border:0;box-shadow:none;text-align:center;padding:0}
.steps li::before{width:78px;height:78px;display:grid;place-items:center;margin:0 auto 16px;border:5px solid currentColor;border-radius:var(--radius);color:inherit;font-size:2.1rem}
.quotes{margin:36px 0}
.quote{background:none;border:0;box-shadow:none;text-align:center;padding:4px 10px}
.quote::before{content:"";display:block;width:44px;height:7px;border-radius:4px;background:currentColor;margin:0 auto 18px}
.quote p{font:${w} 1.35rem/1.35 var(--hf)}
.faq,.form,.menu-item{text-align:left}
.faq details{border:0;box-shadow:none}
.hours{max-width:560px;margin:0 auto;text-align:left}
.form{border:4px solid ${c.text};box-shadow:none}
.cta{background:var(--hero-bg);color:var(--on-hero);--focus:var(--on-hero);border-top:${rule};padding:calc(var(--space) + 24px) 0}
.cta h2{color:var(--on-hero);font-size:clamp(2.6rem,10vw,5.2rem);line-height:1}
.cta p{font-size:1.25rem}
.cta .btn{min-height:62px;font-size:1.2rem;padding:.9em 2em}
.cta .btn--ghost{color:var(--on-hero)}
.ftr__grid{text-align:center}
`;
    },
  },

  polaroid: {
    name: "Scrapbook",
    about: "Taped-on tilted photo, sticker labels and slightly turned cards with dashed edges.",
    css: (t, k) => {
      const c = t.colors;
      const tape = k.alpha(c.accent, 0.62);
      const dash = `2px dashed ${k.alpha(c.text, 0.38)}`;
      const paper = `0 6px 18px ${k.alpha(c.text, 0.12)}`;
      return `body{background-image:radial-gradient(${k.alpha(c.text, 0.07)} 1.2px,transparent 1.6px);background-size:22px 22px}
.hdr{border-bottom:${dash}}
.brand{display:inline-block;transform:rotate(-1.5deg)}
${PLAIN_HERO}
.hero{display:grid;background:none}
${INFLOW_MEDIA}
.hero__in{order:1;padding:38px 20px 18px;max-width:none}
.hero--photo .hero__media{order:2;position:relative;margin:30px 28px 44px;padding:12px 12px 52px;background:#fff;box-shadow:0 12px 28px rgba(0,0,0,.22);transform:rotate(-2.5deg)}
.hero--photo .hero__media img{height:auto;aspect-ratio:4/3}
.hero--photo .hero__media::before,.hero--photo .hero__media::after{content:"";display:block;position:absolute;inset:auto;top:-8px;width:104px;height:30px;background:${tape};box-shadow:0 1px 3px rgba(0,0,0,.12)}
.hero--photo .hero__media::before{left:-22px;transform:rotate(-38deg)}
.hero--photo .hero__media::after{right:-22px;transform:rotate(38deg)}
.hero__credit{order:3;position:static;text-align:center;color:var(--muted);margin:-28px 20px 18px}
.hero:not(.hero--photo) .hero__in{padding-bottom:44px}
.hero__eyebrow{display:inline-block;background:var(--primary);color:var(--on-primary);padding:5px 14px;border-radius:8px;transform:rotate(-2deg);box-shadow:2px 3px 0 ${k.alpha(c.text, 0.2)}}
.hero h1{font-size:clamp(2.3rem,8.5vw,4.2rem)}
@media (min-width:900px){
 .hero--photo{grid-template-columns:1.1fr .9fr;align-items:center;max-width:1120px;margin:0 auto}
 .hero--photo .hero__in{padding:80px 28px 80px 20px}
 .hero--photo .hero__media{margin:56px 44px 64px 28px;transform:rotate(3deg)}
 .hero--photo .hero__credit{grid-column:2;margin:-44px 0 24px}
 .hero__in{width:100%;padding:76px 20px 64px;max-width:1120px;margin:0 auto}
}
.strip{background:none;border:0;padding:6px 0 12px}
.strip__in{background:var(--surface);border:${dash};border-radius:12px;width:calc(100% - 28px);box-shadow:${paper}}
.section__label{display:inline-block;background:var(--secondary);color:var(--on-secondary);padding:5px 14px;border-radius:8px;transform:rotate(-2deg);box-shadow:2px 3px 0 ${k.alpha(c.text, 0.2)};margin-bottom:.9rem}
main>.section:nth-of-type(even) .section__label{transform:rotate(1.8deg)}
.card,.steps li,.quote{position:relative;background:var(--surface);color:var(--text);border:${dash};border-radius:6px;box-shadow:${paper}}
.card h3,.price,.steps h3{color:var(--text)}
.quote footer{color:var(--text)}
.cards{gap:26px;margin-top:34px}
.card{padding:28px 22px 22px;transform:rotate(-1deg)}
.cards li:nth-child(even){transform:rotate(1.2deg)}
.cards li:nth-child(3n){transform:rotate(-.4deg)}
.card::before,.quote::before{content:"";position:absolute;top:-13px;left:50%;width:88px;height:26px;margin-left:-44px;background:${tape};transform:rotate(-3deg)}
.cards li:nth-child(even)::before{transform:rotate(4deg)}
.steps{gap:22px}
.steps li{transform:rotate(.8deg)}
.steps li:nth-child(even){transform:rotate(-1deg)}
.steps li::before{width:56px;height:56px;display:grid;place-items:center;border:3px solid var(--text);border-radius:52% 48% 55% 45%/48% 55% 45% 52%;color:var(--text);font-size:1.5rem;margin-bottom:12px}
.quotes{gap:30px;margin:34px 0}
.quote{padding:30px 22px 20px;transform:rotate(1deg)}
.quotes li:nth-child(even) .quote{transform:rotate(-1.4deg)}
.quote::before{left:22px;margin:0;transform:rotate(-6deg)}
.faq details{border:${dash};box-shadow:none;border-radius:10px}
.form{border:${dash};box-shadow:${paper};border-radius:12px}
.hours{border:${dash};border-radius:0}
.gallery{gap:18px}
.gallery img,.about img{background:#fff;padding:8px 8px 28px;border-radius:2px;box-shadow:0 6px 16px rgba(0,0,0,.2);transform:rotate(-2deg)}
.gallery li:nth-child(even) img{transform:rotate(2deg)}
.chip{border:1px dashed ${k.alpha(c.text, 0.4)}}
.cta .wrap{border:3px dashed ${k.alpha(c.onSecondary, 0.6)};border-radius:18px;padding:40px 22px;width:calc(100% - 28px)}
.ftr{position:relative;margin-top:14px}
.ftr::before{content:"";position:absolute;left:0;right:0;top:-12px;height:12px;background:radial-gradient(circle at 12px 12px,var(--footer-bg) 11.5px,transparent 12px) 0 0/24px 12px repeat-x}
`;
    },
  },
} as const satisfies Record<string, LayoutDef>;
