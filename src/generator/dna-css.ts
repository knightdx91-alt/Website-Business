import { withAlpha } from "./color.ts";
import type { Theme } from "./themes.ts";

/**
 * CSS for every non-legacy DNA value (see dna.ts). Each block is keyed off the data-* attributes on <html>,
 * so a value's rules only exist on pages that chose it. Legacy values need no CSS: the base stylesheet is theirs.
 * Text only ever sits on backgrounds resolveTheme checked (surface/band/bg/hero/footer/primary/secondary).
 */
export function dnaCss(t: Theme): string {
  const c = t.colors;
  const line = withAlpha(c.text, 0.18);
  const shadow = `0 1px 2px ${withAlpha(c.text, 0.08)}, 0 10px 30px ${withAlpha(c.text, 0.12)}`;
  const hw = t.headingWeight;
  return `/* dna */
/* opening: full-screen photo */
html[data-hero="cover"] .hero--photo .hero__in{min-height:min(86vh,760px);display:flex;flex-direction:column;justify-content:flex-end;padding-bottom:40px}
html[data-hero="cover"] .hero--photo .hero__media::after{background:linear-gradient(180deg,${withAlpha(c.heroBg, 0.1)} 0%,${withAlpha(c.heroBg, 0.45)} 45%,${withAlpha(c.heroBg, 0.97)} 100%)}
html[data-hero="cover"] .hero h1{font-size:clamp(2.4rem,9vw,5rem);line-height:1;max-width:16ch}
html[data-hero="cover"] .hero__sub{font-size:clamp(1.15rem,3.4vw,1.45rem)}
@media (min-width:900px){html[data-hero="cover"] .hero--photo .hero__in{padding-bottom:72px}}
/* opening: headline + info panel */
html[data-hero="split"] .hero--photo .hero__media{display:none}
html[data-hero="split"] .hero__grid{display:grid;gap:28px}
html[data-hero="split"] .hero__panel{background:var(--surface);color:var(--text);border-radius:var(--radius);padding:20px;box-shadow:${shadow};display:grid;gap:12px;align-self:start}
html[data-hero="split"] .hero__panel .ph{margin:-20px -20px 6px;border-radius:var(--radius) var(--radius) 0 0;overflow:hidden}
html[data-hero="split"] .hero__panel .ph img{width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:0}
html[data-hero="split"] .hero__panel .status{background:var(--band);margin:0;align-self:start;justify-self:start}
html[data-hero="split"] .hero__row{display:flex;gap:10px;align-items:flex-start;margin:0;font-weight:600;color:var(--text)}
html[data-hero="split"] .hero__row .i{color:var(--primary);flex:none;margin-top:.15em}
html[data-hero="split"] .hero__row a{color:var(--link)}
html[data-hero="split"] .hero__panel .btns{margin-top:6px}
html[data-hero="split"] .hero__panel .btn--ghost{color:var(--text)}
html[data-hero="split"] .hero h1{font-size:clamp(2.3rem,7.5vw,4.2rem)}
@media (min-width:900px){html[data-hero="split"] .hero__grid{grid-template-columns:1.15fr .85fr;gap:56px;align-items:center}html[data-hero="split"] .hero__in{padding:72px 20px 72px}}
/* opening: short band, then details */
html[data-hero="banner"] .hero__in{padding:36px 20px 36px}
html[data-hero="banner"] .hero h1{margin-bottom:0;font-size:clamp(2.2rem,7.5vw,4rem)}
html[data-hero="banner"] .hero--photo .hero__media{display:none}
html[data-hero="banner"] .lede{background:var(--bg);color:var(--text);border-bottom:1px solid ${line}}
html[data-hero="banner"] .lede__in{display:grid;gap:28px;padding:32px 20px 40px;max-width:1120px;margin:0 auto}
html[data-hero="banner"] .lede .hero__sub{font-size:clamp(1.2rem,3.6vw,1.5rem);color:var(--text);max-width:34rem}
html[data-hero="banner"] .lede .status{background:var(--band)}
html[data-hero="banner"] .lede .btn--ghost{color:var(--text)}
html[data-hero="banner"] .lede .ph img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:var(--radius)}
@media (min-width:900px){html[data-hero="banner"] .hero__in{padding:64px 20px 56px}html[data-hero="banner"] .lede__in{grid-template-columns:1.1fr .9fr;align-items:center;gap:56px;padding:48px 20px 56px}}
/* opening: big words, photo below */
html[data-hero="statement"] .hero--photo .hero__media{display:none}
html[data-hero="statement"] .hero__in{padding:56px 20px 44px}
html[data-hero="statement"] .hero h1{font-size:clamp(2.7rem,11vw,6rem);line-height:.98;letter-spacing:-.02em;max-width:13ch}
html[data-hero="statement"] .hero__sub{font-size:clamp(1.15rem,3.4vw,1.5rem);max-width:40rem}
html[data-hero="statement"] .hero__trust{border-top:1px solid ${withAlpha(c.onHero, 0.3)};padding-top:18px;margin-top:28px;margin-bottom:0}
html[data-hero="statement"] .hero__band .ph img{width:100%;height:clamp(220px,38vw,480px);object-fit:cover}
html[data-hero="statement"] .hero__band .hero__credit{position:static;text-align:right;color:var(--muted);padding:4px 20px}
@media (min-width:900px){html[data-hero="statement"] .hero__in{padding:96px 20px 72px}}
.lede .hero__credit,.hero__band .hero__credit{position:static;font-size:.72rem;color:var(--muted);margin:4px 0 0;text-align:right}
/* photo treatments (in-flow photos only) */
html[data-photo="frame"] .ph{padding:10px;background:var(--surface);box-shadow:${shadow};border-radius:var(--radius)}
html[data-photo="frame"] .ph img{border-radius:calc(var(--radius) - 4px)!important}
html[data-photo="arch"] .ph img{border-radius:999px 999px var(--radius) var(--radius)!important}
html[data-photo="duotone"] .ph{position:relative;overflow:hidden;border-radius:var(--radius)}
html[data-photo="duotone"] .ph img{filter:grayscale(1) contrast(1.05)}
html[data-photo="duotone"] .ph::after{content:"";position:absolute;inset:0;background:var(--accent);mix-blend-mode:multiply;opacity:.55;pointer-events:none}
html[data-photo="duotone"] .hero--photo .hero__media img{filter:grayscale(1) contrast(1.05)}
/* top bar: name centered */
html[data-nav="centered"] .hdr__in{display:grid;grid-template-columns:48px 1fr 48px;align-items:center}
html[data-nav="centered"] .brand{grid-column:2;grid-row:1;margin:0;text-align:center;max-width:none;font-size:1.25rem}
html[data-nav="centered"] .hdr__call{grid-column:1;grid-row:1;justify-self:start}
html[data-nav="centered"] .navbtn{grid-column:3;grid-row:1;justify-self:end}
@media (min-width:900px){
 html[data-nav="centered"] .hdr__in{grid-template-columns:1fr auto 1fr;padding-top:10px}
 html[data-nav="centered"] .brand{font-size:1.6rem}
 html[data-nav="centered"] .hdr__call{grid-column:3;justify-self:end}
 html[data-nav="centered"].js .nav,html[data-nav="centered"].no-js .nav{grid-column:1/-1;grid-row:2;justify-self:center;width:100%;border-top:1px solid ${line};margin-top:6px}
 html[data-nav="centered"].js .nav ul,html[data-nav="centered"].no-js .nav ul{justify-content:center}
}
/* top bar: name and call button only (menu stays behind the button on every screen) */
html[data-nav="slim"] .hdr__call span{display:inline}
@media (min-width:900px){
 html[data-nav="slim"] .navbtn{display:inline-flex}
 html[data-nav="slim"].js .nav{display:none;position:fixed;inset:var(--hdr-h,56px) 0 0 auto;width:min(380px,100%);padding:16px 24px 40px;background:var(--surface);overflow:auto;box-shadow:-10px 0 30px ${withAlpha(c.text, 0.15)}}
 html[data-nav="slim"].js .nav.is-open{display:block}
 html[data-nav="slim"].js .nav ul{display:block}
 html[data-nav="slim"].js .nav li{border-bottom:1px solid ${line}}
 html[data-nav="slim"] .nav a{padding:14px 4px;font-size:1.2rem}
}
/* address bar: three tiles */
html[data-strip="tiles"] .strip{background:var(--bg);border:0}
html[data-strip="tiles"] .strip__in{gap:12px;padding:16px 20px}
html[data-strip="tiles"] .strip__item{background:var(--surface);border:1px solid ${line};border-radius:var(--radius);padding:14px 18px;min-height:64px;box-shadow:${shadow}}
/* address bar: one centered line */
html[data-strip="inline"] .strip__in{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 28px;padding:10px 20px}
html[data-strip="inline"] .strip__item{min-height:40px}
html[data-strip="inline"] .chips{width:100%;justify-content:center;margin-top:0}
/* buttons */
html[data-btn="solid-link"] .btns .btn--ghost{background:none;border-color:transparent;padding-left:.3em;padding-right:.3em;text-decoration:underline;text-underline-offset:.28em;text-decoration-thickness:2px}
html[data-btn="solid-link"] .btns .btn--ghost>span:first-of-type::after{content:" →"}
html[data-btn="solid-solid"] .btns .btn--ghost{background:var(--secondary);color:var(--on-secondary);border-color:var(--secondary)}
html[data-btn="outline"] .btns .btn--primary{background:transparent;color:inherit;border-width:3px;border-color:currentColor;text-transform:uppercase;letter-spacing:.04em;font-size:.98rem}
html[data-btn="outline"] .btns .btn--primary:hover{background:var(--primary);color:var(--on-primary);border-color:var(--primary)}
html[data-btn="outline"] .btns .btn--ghost{border-width:3px}
html[data-btn="block"] .hero .btns .btn,html[data-btn="block"] .lede .btns .btn,html[data-btn="block"] .cta .btns .btn{flex:1 1 220px;min-height:62px;font-size:1.15rem}
/* services: ruled list */
.svc{list-style:none;margin:28px 0 0;padding:0}
.svc h3{margin:0 0 .25em}
.svc .price{margin-left:.5em;font-size:.95em}
.svc--list li{display:grid;grid-template-columns:auto 1fr;gap:16px;padding:18px 0;border-bottom:1px solid ${line}}
.svc--list li:first-child{border-top:2px solid var(--text)}
.svc--list .svc__i{color:var(--primary);width:28px;height:28px;margin-top:.2em}
.svc--list .svc__i:empty{display:none}
.svc--list p{margin:0;color:var(--text)}
@media (min-width:900px){.svc--list{display:grid;grid-template-columns:1fr 1fr;gap:0 56px}.svc--list li:nth-child(2){border-top:2px solid var(--text)}}
/* services: compact tiles */
.svc--tiles{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
.svc--tiles li{background:var(--band);border-radius:var(--radius);padding:18px 14px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:8px}
.svc--tiles .svc__i{color:var(--primary);width:34px;height:34px}
.svc--tiles .svc__i:empty{display:none}
.svc--tiles h3{font-size:1.05rem;line-height:1.2}
.svc--tiles p{margin:0;font-size:.92rem;color:var(--muted)}
@media (min-width:760px){.svc--tiles{grid-template-columns:repeat(4,1fr);gap:16px}.svc--tiles li{padding:24px 18px}}
/* services: tap to expand */
.svc--acc details{border-bottom:1px solid ${line}}
.svc--acc details:first-child{border-top:2px solid var(--text)}
.svc--acc summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:18px 0;min-height:48px}
.svc--acc summary::-webkit-details-marker{display:none}
.svc--acc summary::after{content:"+";font:${hw} 1.6rem/1 var(--hf);color:var(--primary);flex:none}
.svc--acc details[open] summary::after{content:"\\2212"}
.svc--acc summary h3{margin:0;display:flex;gap:.5em;align-items:center}
.svc--acc summary h3 .svc__i{color:var(--primary)}
.svc--acc p{margin:0;padding:0 0 18px;max-width:60ch}
/* services: text columns */
.svc--cols{display:grid;gap:22px 48px}
.svc--cols h3{padding-top:12px;border-top:3px solid var(--primary);display:inline-block}
.svc--cols p{margin:0}
@media (min-width:700px){.svc--cols{grid-template-columns:1fr 1fr}}
@media (min-width:1000px){.svc--cols{grid-template-columns:1fr 1fr 1fr}}
/* closing call: side by side */
html[data-cta="split"] .cta{text-align:left}
html[data-cta="split"] .cta .wrap{display:grid;gap:22px;max-width:1120px}
html[data-cta="split"] .cta p{margin:0}
html[data-cta="split"] .cta .btns{justify-content:flex-start}
@media (min-width:900px){html[data-cta="split"] .cta .wrap{grid-template-columns:1.2fr .8fr;align-items:center}html[data-cta="split"] .cta .btns{justify-content:flex-end}}
/* closing call: boxed */
html[data-cta="boxed"] .cta{background:var(--bg);color:var(--text)}
html[data-cta="boxed"] .cta .wrap{border:2px solid var(--text);border-radius:var(--radius);padding:40px 24px;max-width:760px}
html[data-cta="boxed"] .cta h2{color:var(--heading)}
html[data-cta="boxed"] .cta .btn--ghost{color:var(--text)}
/* footer: centered stack */
html[data-ftr="stack"] .ftr__grid{grid-template-columns:1fr!important;text-align:center;gap:22px;justify-items:center}
html[data-ftr="stack"] .ftr h2{font-size:1.5rem}
html[data-ftr="stack"] .ftr ul{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 20px}
html[data-ftr="stack"] .ftr__legal{text-align:center}
/* footer: big call button */
html[data-ftr="bigcta"] .ftr__cta{text-align:center;padding-bottom:32px;margin-bottom:36px;border-bottom:1px solid ${withAlpha(c.onFooter, 0.25)}}
html[data-ftr="bigcta"] .ftr__cta p{font:${hw} clamp(1.6rem,5vw,2.4rem)/1.1 var(--hf);color:var(--on-footer);margin:0 0 18px}
html[data-ftr="bigcta"] .ftr__cta .btn{min-height:60px;font-size:1.15rem;padding-left:2em;padding-right:2em}
/* phone bar: round call button */
html[data-bar="fab"] .bar{left:auto;right:16px;bottom:calc(16px + env(safe-area-inset-bottom));background:none;box-shadow:none;padding:0;display:block}
html[data-bar="fab"] .bar a{width:66px;height:66px;border-radius:50%;background:var(--primary);color:var(--on-primary);border:0;box-shadow:0 10px 26px ${withAlpha(c.text, 0.35)};flex-direction:column;gap:2px;font-size:.72rem;line-height:1}
html[data-bar="fab"] .bar a .i{width:26px;height:26px}
html[data-bar="fab"] .ftr{padding-bottom:calc(96px + env(safe-area-inset-bottom))}
@media (min-width:768px){html[data-bar="fab"] .ftr{padding-bottom:40px}}
`;
}
