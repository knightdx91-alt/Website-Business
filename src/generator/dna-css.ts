import { bestText, withAlpha } from "./color.ts";
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
html[data-hero="cover"] .hero--photo .hero__in{min-height:min(86vh,760px);min-height:min(86svh,760px);display:flex;flex-direction:column;justify-content:flex-end;padding-bottom:40px}
html[data-hero="cover"] .hero--photo .hero__media::after{background:linear-gradient(180deg,${withAlpha(c.heroBg, 0.12)} 0%,${withAlpha(c.heroBg, 0.4)} 28%,${withAlpha(c.heroBg, 0.86)} 52%,${withAlpha(c.heroBg, 0.97)} 100%)}
@media (min-width:900px){html[data-hero="cover"] .hero--photo .hero__media::after{background:linear-gradient(90deg,${withAlpha(c.heroBg, 0.96)} 0%,${withAlpha(c.heroBg, 0.9)} 45%,${withAlpha(c.heroBg, 0.55)} 70%,${withAlpha(c.heroBg, 0.2)} 100%)}}
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
html[data-hero="statement"] .hero h1{font-size:clamp(2.7rem,min(11vw,calc((100vw - 40px) / var(--h1-ch,10) / .6)),6rem);line-height:.98;letter-spacing:-.02em;max-width:13ch;overflow-wrap:normal}
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
html[data-nav="slim"] .hdr__call{flex:none}
html[data-nav="slim"] .brand{min-width:0}
@media (max-width:379px){html[data-nav="slim"] .hdr__call span{display:none}}
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
/* opening: photo, then a floating card */
html[data-hero="card"] .hero{background:var(--bg);color:var(--text);overflow:visible}
html[data-hero="card"] .hero__photo .ph{padding:0;background:none;box-shadow:none;transform:none;max-width:none;border-radius:0}
html[data-hero="card"] .hero__photo img{width:100%;height:clamp(240px,52vw,560px);object-fit:cover;border-radius:0!important}
html[data-hero="card"] .hero__in{padding:0 20px 36px;margin-top:-64px}
html[data-hero="card"] .hero__card{background:var(--surface);color:var(--text);border-radius:var(--radius);box-shadow:${shadow};padding:28px 22px;max-width:760px}
html[data-hero="card"] .hero h1{color:var(--heading);font-size:clamp(2rem,6.8vw,3.4rem)}
html[data-hero="card"] .hero__card .status{background:var(--band)}
html[data-hero="card"] .hero__card .btn--ghost{color:var(--text)}
html[data-hero="card"] .hero__credit{position:static;text-align:right;color:var(--muted);padding:0 20px 8px;font-size:.72rem}
@media (min-width:900px){html[data-hero="card"] .hero__in{margin-top:-128px;padding-bottom:56px}html[data-hero="card"] .hero__card{padding:44px 48px}}
html[data-htext="below"][data-hero="card"] .hero__in{margin-top:-12px}
@media (min-width:900px){html[data-htext="below"][data-hero="card"] .hero__in{margin-top:-24px}}
@media (max-width:899px){html[data-htext="bottom"][data-hero="cover"] .hero--photo .hero__in{padding-top:min(52vh,460px)}html[data-htext="bottom"][data-hero="cover"] .hero--photo .hero__media::after{background:linear-gradient(180deg,transparent 0%,transparent 26%,${withAlpha(c.heroBg, 0.7)} 36%,${withAlpha(c.heroBg, 0.94)} 44%,${withAlpha(c.heroBg, 0.98)} 100%)}}
/* opening: the business name huge */
html[data-hero="billboard"] .hero__in{padding:32px 20px 40px}
html[data-hero="billboard"] .hero h1{font-size:clamp(2.2rem,min(14vw,calc((100vw - 40px) / var(--h1-ch,8) / var(--h1-adv,.72))),9.5rem);line-height:.9;letter-spacing:-.03em;text-transform:uppercase;margin:0 0 .25em;overflow-wrap:normal;max-width:none}
html[data-hero="billboard"] .hero__eyebrow{font-size:1.05rem}
html[data-hero="billboard"] .hero__bb{display:grid;gap:14px;border-top:1px solid ${withAlpha(c.onHero, 0.3)};padding-top:22px}
html[data-hero="billboard"] .hero__bb .hero__sub{margin:0}
html[data-hero="billboard"] .hero__bb .status{margin:0;justify-self:start}
html[data-hero="billboard"] .hero__bb .hero__trust{margin:0}
html[data-hero="billboard"] .hero__band .ph img{width:100%;height:clamp(220px,38vw,480px);object-fit:cover}
html[data-hero="billboard"] .hero__band .hero__credit{position:static;text-align:right;color:var(--muted);padding:4px 20px}
@media (min-width:900px){html[data-hero="billboard"] .hero__in{padding:56px 20px 56px}html[data-hero="billboard"] .hero__bb{grid-template-columns:1fr auto;align-items:center;column-gap:48px}html[data-hero="billboard"] .hero__bb .btns{justify-self:end;grid-row:1;grid-column:2}html[data-hero="billboard"] .hero__bb .hero__trust{grid-column:1/-1}}
/* proof band under the opening */
.proof{background:var(--surface);border-bottom:1px solid ${line}}
.proof__in{max-width:1120px;margin:0 auto;padding:16px 20px;display:flex;flex-wrap:wrap;align-items:center;gap:12px 32px}
.proof__rating a{display:inline-flex;align-items:center;gap:.5em;color:var(--text);text-decoration:none}
.proof__rating strong{font:${hw} 2rem/1 var(--hf);color:var(--heading)}
.proof__rating .i{color:var(--accent);width:28px;height:28px}
.proof__rating span{font-weight:600;line-height:1.2;max-width:9rem}
.proof__list{display:flex;flex-wrap:wrap;gap:8px 22px;list-style:none;margin:0;padding:0;font-weight:700}
.proof__list li{display:inline-flex;align-items:center;gap:.4em}
.proof__list .i{color:var(--primary)}
@media (min-width:900px){.proof__in{padding:22px 20px}.proof__rating{padding-right:32px;border-right:1px solid ${line}}}
/* top bar: thin info line above the header */
.util{background:var(--text);color:var(--bg);font-size:.88rem;font-weight:600}
.util__in{display:flex;flex-wrap:wrap;gap:4px 22px;min-height:34px;align-items:center;justify-content:center;padding-top:4px;padding-bottom:4px}
.util__in>*{display:inline-flex;align-items:center;gap:.4em}
.util a{color:inherit}
.util .i{width:16px;height:16px}
@media (max-width:599px){.util__in>span:first-child{display:none}}
/* top bar: see-through over the opening, solid once scrolled */
html[data-nav="overlay"] .hdr{position:fixed;left:0;right:0;top:0;background:transparent;border-bottom:0;color:var(--on-hero);transition:transform .25s ease,background .2s ease}
html[data-nav="overlay"] .brand,html[data-nav="overlay"] .navbtn{color:inherit}
html[data-nav="overlay"].js .hdr.is-scrolled,html[data-nav="overlay"] .nav-open .hdr{background:var(--surface);color:var(--text);border-bottom:1px solid ${line}}
html[data-nav="overlay"] .hero__in{padding-top:104px}
html[data-nav="overlay"] .hero--cover .hero__in{padding-top:120px}
@media (min-width:900px){html[data-nav="overlay"] .nav a{color:inherit}html[data-nav="overlay"] .hero__in{padding-top:150px}}
/* buttons: pills, hard shadow */
html[data-btn="pill"] .btn,html[data-btn="pill"] .hdr__call,html[data-btn="pill"] .bar a{border-radius:999px}
html[data-btn="pill"] .btns .btn--ghost{background:${withAlpha(c.primary, 0.12)}}
html[data-btn="shadow"] .btn,html[data-btn="shadow"] .hdr__call{border-radius:4px;box-shadow:5px 5px 0 var(--accent)}
html[data-btn="shadow"] .btn:hover{transform:translate(2px,2px);box-shadow:3px 3px 0 var(--accent)}
/* address bar: colored one-liner */
html[data-strip="ticker"] .strip{background:var(--primary);color:var(--on-primary);border:0}
html[data-strip="ticker"] .strip__in{display:flex;flex-wrap:nowrap;overflow-x:auto;gap:0;padding:0 12px;scrollbar-width:none;max-width:none}
html[data-strip="ticker"] .strip__in::-webkit-scrollbar{display:none}
html[data-strip="ticker"] .strip__item{color:inherit;min-height:46px;padding:0 14px;white-space:nowrap;font-weight:700;font-size:.95rem;position:relative;gap:8px}
html[data-strip="ticker"] .strip__item+.strip__item::before{content:"\\00B7";position:absolute;left:-5px;opacity:.7}
html[data-strip="ticker"] .strip__item .i{color:inherit;width:18px;height:18px}
html[data-strip="ticker"] .strip__item [data-open-status],html[data-strip="ticker"] .strip__item [data-today-hours]{display:inline;color:inherit}
html[data-strip="ticker"] .strip__item [data-open-status].is-open,html[data-strip="ticker"] .strip__item [data-open-status].is-closed{color:inherit}
html[data-strip="ticker"] .strip__more{color:inherit;opacity:.85}
html[data-strip="ticker"].js .strip__item [data-open-status]:not([hidden])+.strip__more{display:inline;font-size:inherit}
html[data-strip="ticker"] .chips{display:none}
@media (min-width:900px){html[data-strip="ticker"] .strip__in{justify-content:center}}
/* address bar: a card pulled up over the opening */
html[data-strip="factcard"] .hero__in{padding-bottom:76px}
html[data-strip="factcard"] .strip{background:transparent;border:0;margin-top:-40px;position:relative;z-index:2}
html[data-strip="factcard"] .strip__in{background:var(--surface);border:1px solid ${line};border-radius:var(--radius);box-shadow:${shadow};padding:14px 20px;margin:0 20px;max-width:1080px}
html[data-strip="factcard"] .strip__item{min-height:48px}
@media (min-width:1140px){html[data-strip="factcard"] .strip__in{margin:0 auto}}
/* services: price list */
.svc--table li{padding:14px 0;border-bottom:1px solid ${line}}
.svc--table li:first-child{border-top:2px solid var(--text)}
.svc__row{display:flex;align-items:baseline;gap:10px}
.svc__row h3{margin:0;flex:none;max-width:72%}
.svc__dots{flex:1;border-bottom:2px dotted ${line};transform:translateY(-.35em)}
.svc--table .price{font:700 1.05rem var(--hf);color:var(--heading);margin:0;white-space:nowrap}
.svc--table p{margin:4px 0 0;color:var(--muted);font-size:.95rem;max-width:60ch}
@media (min-width:900px){.svc--table{display:grid;grid-template-columns:1fr 1fr;gap:0 56px}.svc--table li:nth-child(2){border-top:2px solid var(--text)}}
/* services: swipe row */
.svc--scroll{margin:28px -20px 0;padding:0 20px 4px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:thin}
.svc--scroll ul{list-style:none;margin:0;padding:0 0 8px;display:flex;gap:14px}
.svc--scroll li{flex:0 0 78%;scroll-snap-align:start;background:var(--surface);border:1px solid ${line};border-radius:var(--radius);padding:22px 18px;box-shadow:${shadow}}
.svc--scroll .svc__i{color:var(--primary);display:block;margin-bottom:10px}
.svc--scroll h3{font-size:1.15rem}
.svc--scroll p{margin:0;color:var(--text)}
@media (min-width:700px){.svc--scroll li{flex-basis:44%}}
@media (min-width:1000px){.svc--scroll{margin:28px 0 0;padding:0;overflow:visible}.svc--scroll ul{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.svc--scroll li{flex:none}}
/* closing call: one line */
html[data-cta="inline"] .cta{padding:28px 0}
html[data-cta="inline"] .cta .wrap{display:flex;flex-wrap:wrap;align-items:center;gap:14px 28px;max-width:1120px;text-align:left}
html[data-cta="inline"] .cta h2{margin:0;font-size:clamp(1.4rem,3.6vw,1.9rem);flex:1 1 260px}
html[data-cta="inline"] .cta p{display:none}
html[data-cta="inline"] .cta .btns{margin-left:auto}
html[data-cta="inline"] .cta .hero__alt{width:100%;text-align:left;margin:0}
/* footer: giant name */
html[data-ftr="bigname"] .ftr__name{font:${hw} clamp(2.6rem,13vw,9rem)/.95 var(--hf);color:var(--on-footer);margin:0 0 28px;letter-spacing:-.03em;overflow-wrap:anywhere}
html[data-ftr="bigname"] .ftr__grid{border-top:1px solid ${withAlpha(c.onFooter, 0.25)};padding-top:28px}
/* photo: snapshot */
html[data-photo="tilt"] .ph{padding:12px 12px 40px;background:#fff;box-shadow:${shadow};transform:rotate(-2deg);border-radius:4px;max-width:92%;margin:8px auto}
html[data-photo="tilt"] .ph img{border-radius:0!important}
html[data-photo="tilt"] .hero__panel .ph{transform:none;padding:0;background:none;box-shadow:none;max-width:none}
/* page rhythm */
html[data-rhythm="continuous"] .section--band{background:var(--bg)}
html[data-rhythm="continuous"] main>.section+.section,html[data-rhythm="continuous"] main>.section+div+.section{border-top:1px solid ${line}}
html[data-rhythm="chapters"] main{counter-reset:chapter}
html[data-rhythm="chapters"] .section--band{background:var(--bg)}
html[data-rhythm="chapters"] main>.section+.section{border-top:2px solid var(--text)}
html[data-rhythm="chapters"] .section__label{counter-increment:chapter;color:var(--heading)}
html[data-rhythm="chapters"] .section__label::before{content:counter(chapter,decimal-leading-zero) "\\2003";font:${hw} 1.4em/1 var(--hf);color:var(--primary)}
html[data-rhythm="boxed"] main>.section{padding:12px 0;background:var(--band)}
html[data-rhythm="boxed"] main>.section>.wrap{background:var(--surface);border-radius:var(--radius);padding:40px 20px;box-shadow:${shadow}}
html[data-rhythm="boxed"] main>.section:first-of-type{padding-top:24px}
html[data-rhythm="boxed"] main>.section:last-of-type{padding-bottom:24px}
@media (min-width:900px){html[data-rhythm="boxed"] main>.section>.wrap{padding:56px 48px}}
/* type size */
html[data-scale="dramatic"]:not([data-hero="billboard"]) .hero h1{font-size:clamp(2.6rem,9.5vw,5.4rem)!important;line-height:1.02}
html[data-scale="dramatic"] h2.section__title{font-size:clamp(2rem,5.6vw,3.1rem)}
html[data-scale="poster"]:not([data-hero="billboard"]) .hero h1{font-size:clamp(2.4rem,min(13vw,calc((100vw - 40px) / var(--h1-ch,9) / var(--h1-adv,.72))),7.5rem)!important;line-height:.92;text-transform:uppercase;letter-spacing:-.02em;overflow-wrap:normal}
html[data-scale="poster"] h2.section__title{font-size:clamp(2.1rem,6.5vw,3.6rem);text-transform:uppercase;line-height:.98}
html[data-scale="tight"]:not([data-hero="billboard"]) .hero h1{font-size:clamp(1.9rem,5.6vw,2.9rem)!important}
html[data-scale="tight"] h2.section__title{font-size:clamp(1.5rem,3.8vw,2rem)}
html[data-scale="tight"] .hero__sub{font-size:1.1rem}
/* spacing */
html[data-density="compact"] .section{padding-top:2.6rem!important;padding-bottom:2.6rem!important}
html[data-density="compact"] .wrap{padding-left:16px;padding-right:16px}
html[data-density="generous"] .section{padding-top:5.5rem!important;padding-bottom:5.5rem!important}
html[data-density="generous"] .narrow{max-width:700px}
@media (min-width:900px){html[data-density="generous"] .section{padding-top:7.5rem!important;padding-bottom:7.5rem!important}html[data-density="generous"] .wrap{padding-left:28px;padding-right:28px}}
/* opening tone: light */
html[data-tone="light"] .hero:not(.hero--photo){background:var(--bg);color:var(--text);border-bottom:1px solid ${line}}
html[data-tone="light"] .hero:not(.hero--photo) h1,html[data-tone="light"] .hero:not(.hero--photo) h2{color:var(--heading)}
html[data-tone="light"] .hero:not(.hero--photo) .status{background:var(--band)}
html[data-tone="light"] .hero:not(.hero--photo) .hero__eyebrow{color:var(--muted)}
html[data-tone="light"] .hero:not(.hero--photo) .hero__trust{border-color:${line}}
html[data-tone="light"] .hero:not(.hero--photo) .hero__proof a{text-decoration-color:${line}}
html[data-tone="light"] .hero:not(.hero--photo) .hero__bb{border-color:${line}}
html[data-tone="light"] .hero:not(.hero--photo) .btn--ghost{color:var(--text)}
/* services: bento grid (the first service featured big, the rest small; spans fill the last row) */
.svc--bento{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;grid-auto-flow:dense}
.svc--bento li{background:var(--surface);border:1px solid ${line};border-radius:var(--radius);padding:20px 18px;display:flex;flex-direction:column;gap:8px;min-height:120px}
.svc--bento li:nth-child(4n+3){background:var(--band)}
.svc--bento li:first-child{grid-column:1/-1;background:var(--primary);color:var(--on-primary);border-color:transparent;padding:28px 22px;min-height:200px;justify-content:flex-end}
.svc--bento li:first-child h3,.svc--bento li:first-child p,.svc--bento li:first-child .price,.svc--bento li:first-child .svc__i{color:inherit}
.svc--bento li:first-child h3{font-size:clamp(1.5rem,5vw,2.1rem);line-height:1.05}
.svc--bento li:first-child .svc__i{width:40px;height:40px;opacity:.9}
.svc--bento .svc__i{color:var(--primary);width:28px;height:28px}
.svc--bento .svc__i:empty{display:none}
.svc--bento h3{margin:0;font-size:1.08rem;line-height:1.2}
.svc--bento p{margin:0;font-size:.95rem;color:inherit}
.svc--bento .price{margin:0}
@media (max-width:759px){.svc--bento .sp2m{grid-column:1/-1}}
@media (min-width:760px){.svc--bento{grid-template-columns:repeat(3,1fr);gap:16px}.svc--bento li{padding:24px 22px}.svc--bento li:first-child{grid-column:span 2;min-height:260px;padding:36px 32px}.svc--bento .sp2d{grid-column:span 2}.svc--bento .sp3d{grid-column:1/-1;flex-direction:row;align-items:center;gap:18px;min-height:0}}
/* address bar: a scrolling line (address · phone · hours · services), paused on hover, static under reduced motion */
html[data-strip="marquee"] .strip{background:var(--text);color:var(--bg);border:0;overflow:hidden}
html[data-strip="marquee"] .strip__in{display:flex;padding:0;max-width:none;white-space:nowrap;overflow-x:auto;scrollbar-width:none}
html[data-strip="marquee"] .strip__in::-webkit-scrollbar{display:none}
html[data-strip="marquee"] .strip__in.is-dup{overflow:hidden}
html[data-strip="marquee"] .marquee__track{display:inline-flex;align-items:center;flex:none;padding:12px 0}
html[data-strip="marquee"] .is-dup .marquee__track{animation:marquee 32s linear infinite}
html[data-strip="marquee"] .strip:hover .marquee__track,html[data-strip="marquee"] .strip:focus-within .marquee__track{animation-play-state:paused}
html[data-strip="marquee"] .strip__item,html[data-strip="marquee"] .chip{display:inline-flex;align-items:center;gap:8px;color:inherit;background:none;border:0;min-height:0;padding:0 26px;font-weight:700;font-size:1rem;white-space:nowrap;position:relative;text-decoration:none}
html[data-strip="marquee"] .strip__item::before,html[data-strip="marquee"] .chip::before{content:"\\2726";position:absolute;left:-7px;opacity:.55;font-size:.8em}
html[data-strip="marquee"] .chips{display:contents}
html[data-strip="marquee"] .chip .i{display:none}
html[data-strip="marquee"] .strip__item .i{color:inherit;width:18px;height:18px}
html[data-strip="marquee"] .strip__more,html[data-strip="marquee"] .strip__note{display:none}
html[data-strip="marquee"] .strip__item [data-open-status],html[data-strip="marquee"] .strip__item [data-today-hours]{display:inline;color:inherit}
html[data-strip="marquee"] .strip__item [data-open-status].is-open,html[data-strip="marquee"] .strip__item [data-open-status].is-closed{color:inherit}
@media (prefers-reduced-motion:reduce){html[data-strip="marquee"] .strip__in{white-space:normal;overflow:visible}html[data-strip="marquee"] .marquee__track{flex:1 1 auto;min-width:0;width:100%;flex-wrap:wrap;justify-content:center;padding:8px 10px;gap:6px 0}html[data-strip="marquee"] .marquee__track[aria-hidden]{display:none}}
/* photo: a solid color block set behind and offset from the picture */
html[data-photo="offset"] .ph{position:relative;z-index:0;margin:0 14px 14px 0;border-radius:var(--radius)}
html[data-photo="offset"] .ph img{border-radius:var(--radius)!important}
html[data-photo="offset"] .ph::after{content:"";position:absolute;inset:14px -14px -14px 14px;background:var(--accent);border-radius:var(--radius);z-index:-1}
html[data-photo="offset"] .hero__panel .ph,html[data-photo="offset"] .hero__band .ph,html[data-photo="offset"] .hero__photo .ph{margin:0}
html[data-photo="offset"] .hero__panel .ph::after,html[data-photo="offset"] .hero__band .ph::after,html[data-photo="offset"] .hero__photo .ph::after{display:none}
@media (min-width:900px){html[data-photo="offset"] .ph{margin:0 22px 22px 0}html[data-photo="offset"] .ph::after{inset:22px -22px -22px 22px}}
/* opening text centered (one-column openings only; see settleDna) */
html[data-align="center"] .hero--stack .hero__in,html[data-align="center"] .hero--cover .hero__in,html[data-align="center"] .hero--statement .hero__in,html[data-align="center"] .hero--banner .hero__in,html[data-align="center"] .hero--billboard .hero__in{text-align:center;display:flex;flex-direction:column;align-items:center}
html[data-align="center"] .hero--stack .hero__in>*,html[data-align="center"] .hero--cover .hero__in>*,html[data-align="center"] .hero--statement .hero__in>*,html[data-align="center"] .hero--banner .hero__in>*,html[data-align="center"] .hero--billboard .hero__in>*{margin-left:auto;margin-right:auto}
html[data-align="center"] .hero--cover .hero__in{justify-content:flex-end}
html[data-align="center"] .hero h1{max-width:min(100%,18ch)}
html[data-align="center"] .hero--statement .hero h1,html[data-align="center"] .hero--statement h1{max-width:min(100%,16ch)}
html[data-align="center"] .hero__sub{max-width:40rem}
html[data-align="center"] .hero .btns,html[data-align="center"] .hero__trust,html[data-align="center"] .hero__note,html[data-align="center"] .hero__addr{justify-content:center;width:100%}
html[data-align="center"] .hero .status,html[data-align="center"] .hero .badge{align-self:center}
html[data-align="center"] .hero__bb{justify-items:center;text-align:center;width:100%}
html[data-align="center"] .hero__bb .status,html[data-align="center"] .hero__bb .btns{justify-self:center}
html[data-align="center"] .lede__in{text-align:center;justify-items:center}
html[data-align="center"] .lede .btns{justify-content:center}
html[data-align="center"] .lede .status{margin-left:auto;margin-right:auto}
@media (min-width:900px){html[data-align="center"] .hero__bb{grid-template-columns:1fr;row-gap:18px}html[data-align="center"] .hero__bb .btns{grid-row:auto;grid-column:auto}html[data-align="center"] .lede__in{grid-template-columns:1fr;max-width:760px}}
/* phone buttons: how the opening's actions show on small screens (the owner sees the phone view first) */
@media (max-width:599px){
html[data-phone="natural"] .hero .btns .btn,html[data-phone="natural"] .lede .btns .btn{flex:0 1 auto}
html[data-phone="link"] .hero .btns .btn--ghost,html[data-phone="link"] .lede .btns .btn--ghost{flex:1 1 100%;background:none;border:0;min-height:44px;padding:4px 0;justify-content:flex-start;color:inherit;text-decoration:underline;text-underline-offset:.22em;text-decoration-thickness:2px}
html[data-phone="link"] .hero .btns .btn--ghost::after,html[data-phone="link"] .lede .btns .btn--ghost::after{content:"\\2192";margin-left:.15em}
html[data-phone="link"][data-align="center"] .hero .btns .btn--ghost,html[data-phone="link"][data-align="center"] .lede .btns .btn--ghost{justify-content:center}
html[data-phone="bar"] .hero .btns,html[data-phone="bar"] .lede .btns,html[data-phone="bar"] .hero .hero__alt,html[data-phone="bar"] .lede .hero__alt{display:none}
html[data-phone="bar"] .hero__in{padding-bottom:30px}
}
/* trust row */
html[data-trust="chips"] .hero__trust{gap:8px}
html[data-trust="chips"] .hero__trust li{background:color-mix(in srgb,currentColor 12%,transparent);border:1px solid color-mix(in srgb,currentColor 24%,transparent);border-radius:999px;padding:5px 12px 5px 9px;font-size:.9rem;font-weight:600}
html[data-trust="chips"] .hero__trust li>.i{width:16px;height:16px}
html[data-trust="dots"] .hero__trust{display:block;font-weight:600;line-height:1.75}
html[data-trust="dots"] .hero__trust li{display:inline}
html[data-trust="dots"] .hero__trust li>.i{display:none}
html[data-trust="dots"] .hero__trust li+li::before{content:"\\00B7";margin:0 .55em;opacity:.6}
html[data-trust="stack"] .hero__trust{flex-direction:column;gap:8px;align-items:flex-start}
html[data-trust="stack"] .hero__trust li>.i{color:var(--accent)}
/* section headings */
html[data-heads="rule"] .section__label,html[data-heads="big"] .section__label{display:none}
html[data-heads="rule"] .section__title::before,html[data-heads="tag"] .section__title::before,html[data-heads="big"] .section__title::before{display:none}
html[data-heads="rule"] .section__title{position:relative;padding-bottom:.7rem;margin-bottom:1.1rem}
html[data-heads="rule"] .section__title::after{content:"";position:absolute;left:0;bottom:0;width:52px;height:4px;background:var(--accent);border-radius:2px}
html[data-heads="tag"] .section__label{display:inline-block;background:var(--primary);color:var(--on-primary);padding:4px 10px;border-radius:var(--btn-radius);font-size:.76rem;letter-spacing:.08em;text-transform:uppercase;font-variant-caps:normal;margin-bottom:.8rem}
html[data-heads="big"] .section__title{font-size:clamp(1.9rem,5.6vw,3.1rem);line-height:1.05;letter-spacing:-.02em;margin-bottom:1rem}
/* texture on the opening (not over photos) */
html[data-motif]:not([data-motif="none"]) .hero:not(.hero--photo)::before{content:"";position:absolute;inset:0;pointer-events:none}
html[data-motif="rules"] .hero:not(.hero--photo)::before{background:repeating-linear-gradient(0deg,transparent 0 31px,${withAlpha(c.onHero, 0.12)} 31px 32px)}
html[data-motif="stripes"] .hero:not(.hero--photo)::before{background:repeating-linear-gradient(135deg,transparent 0 18px,${withAlpha(c.onHero, 0.07)} 18px 36px)}
html[data-motif="dots"] .hero:not(.hero--photo)::before{background-image:radial-gradient(${withAlpha(c.onHero, 0.2)} 1.5px,transparent 1.6px);background-size:18px 18px}
html[data-motif="grain"] .hero:not(.hero--photo)::before{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");opacity:.16;mix-blend-mode:soft-light}
/* life: shaped section edges (an <i class="edg"> in the band's own color, sticking out over the neighbour) */
html:not([data-edge="straight"]) :is(.section--band,.cta,.ftr){position:relative}
.edg{display:none}
html[data-edge]:not([data-edge="straight"]) .edg{display:block;position:absolute;left:0;right:0;top:calc(1px - var(--edge-h));height:var(--edge-h);background:inherit;pointer-events:none;z-index:1;--edge-h:clamp(16px,3.6vw,46px);-webkit-mask:var(--edge-m) 0 0/100% 100% no-repeat;mask:var(--edge-m) 0 0/100% 100% no-repeat}
html[data-edge]:not([data-edge="straight"]) .edg--b{top:auto;bottom:calc(1px - var(--edge-h));transform:scaleY(-1)}
html[data-edge="wave"] .edg{--edge-m:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 40' preserveAspectRatio='none'%3E%3Cpath d='M0 40V22C150 2 300 2 450 20S750 40 900 22 1100 4 1200 16V40Z'/%3E%3C/svg%3E")}
html[data-edge="curve"] .edg{--edge-m:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 40' preserveAspectRatio='none'%3E%3Cpath d='M0 40Q600 -38 1200 40Z'/%3E%3C/svg%3E")}
html[data-edge="slant"] .edg{--edge-m:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 40' preserveAspectRatio='none'%3E%3Cpath d='M0 40L1200 0V40Z'/%3E%3C/svg%3E")}
html[data-edge="slant"] .edg--b{transform:scale(-1,-1)}
html[data-edge="zigzag"] .edg{--edge-h:14px;-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 28 14'%3E%3Cpath d='M0 14L14 0L28 14Z'/%3E%3C/svg%3E") 0 0/28px 14px repeat-x;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 28 14'%3E%3Cpath d='M0 14L14 0L28 14Z'/%3E%3C/svg%3E") 0 0/28px 14px repeat-x}
html[data-cta="boxed"] .cta>.edg,html[data-rhythm="chapters"] .section--band>.edg{display:none!important}
/* life: more photos (a wide photo band mid-page, or a photo behind the closing call under a strong scrim) */
.pband{display:grid;gap:0;margin:0;line-height:0}
.pband img{width:100%;height:clamp(200px,42vw,460px);object-fit:cover;display:block}
@media (min-width:900px){.pband--2{grid-template-columns:1.4fr 1fr}}
@media (max-width:899px){.pband--2 img+img{display:none}}
html[data-photo="duotone"] .pband img{filter:grayscale(1) contrast(1.05)}
.cta--photo{position:relative;isolation:isolate}
.cta--photo .cta__ph{position:absolute;inset:0;z-index:-1;overflow:hidden;background:inherit}
.cta--photo .cta__ph img{width:100%;height:100%;object-fit:cover;display:block}
/* the scrim is the section's own background (whatever the layout made it), so the text keeps its checked contrast */
.cta--photo .cta__ph::after{content:"";position:absolute;inset:0;background:inherit;opacity:.86}
.cta--photo{padding-top:calc(var(--space) * 1.35);padding-bottom:calc(var(--space) * 1.35)}
/* life: the "since" seal on the opening (wide screens; phones have no room beside the headline) */
.seal{display:none}
@media (min-width:760px){html[data-decor]:not([data-decor="none"]) .seal{display:grid;place-content:center;text-align:center;position:absolute;z-index:2;top:clamp(20px,4vw,48px);right:max(24px,calc(50% - 540px));width:118px;height:118px;border-radius:50%;background:var(--accent);color:${bestText(c.accent)};transform:rotate(-10deg);box-shadow:0 0 0 5px var(--accent),0 0 0 7px currentColor inset,0 10px 26px rgba(0,0,0,.22);font-style:normal;line-height:1.05}
.seal b{font:700 .66rem/1.3 var(--bf);letter-spacing:.14em;text-transform:uppercase;max-width:92px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.seal strong{font:${hw} 1.9rem/1 var(--hf)}
.hero--split .seal,.hero--card .seal{top:auto;bottom:24px}}
/* life: decoration behind the text (trade icons, soft shapes, confetti, line art) */
.dec{display:none}
html[data-decor]:not([data-decor="none"]) .dec{display:block;position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0}
html[data-decor]:not([data-decor="none"]) :is(.section--band,.cta){position:relative}
html[data-decor]:not([data-decor="none"]) .hero{position:relative}
html[data-decor]:not([data-decor="none"]) :is(.section--band,.cta)>.wrap,html[data-decor]:not([data-decor="none"]) .hero>.hero__in{position:relative;z-index:1}
.hero--photo>.dec,.hero--card>.dec{display:none!important}
.dec svg{position:absolute;display:block}
.dec__i{width:clamp(130px,30vw,300px);height:auto;aspect-ratio:1;color:var(--primary);opacity:.09}
.dec__i--m{width:clamp(90px,19vw,190px)}
.dec__i--s{width:clamp(48px,9vw,90px);opacity:.14}
.hero .dec__i{color:var(--on-hero);opacity:.1}
.cta .dec__i{color:var(--on-secondary);opacity:.12}
.dec__b{width:clamp(200px,44vw,460px);height:auto;aspect-ratio:1}
.dec__b--1{fill:var(--primary);opacity:.12}
.dec__b--2{fill:var(--accent);opacity:.16}
.hero .dec__b--1{fill:var(--on-hero);opacity:.08}.hero .dec__b--2{opacity:.22}
.cta .dec__b--1{fill:var(--on-secondary);opacity:.1}
.dec__c{height:auto;aspect-ratio:1;opacity:.6}
.dec__c.c0{fill:var(--accent);stroke:var(--accent)}.dec__c.c1{fill:var(--primary);stroke:var(--primary)}.dec__c.c2{fill:var(--heading);stroke:var(--heading);opacity:.35}
.hero .dec__c.c1,.hero .dec__c.c2{fill:var(--on-hero);stroke:var(--on-hero);opacity:.4}
.cta .dec__c.c1,.cta .dec__c.c2{fill:var(--on-secondary);stroke:var(--on-secondary);opacity:.4}
.dec__l{fill:none;stroke:var(--text);stroke-width:1.2;opacity:.14;width:clamp(150px,32vw,340px);height:auto;aspect-ratio:1}
.dec__l--d{fill:var(--text);stroke:none;width:clamp(90px,18vw,170px)}
.hero .dec__l{stroke:var(--on-hero);opacity:.2}.hero .dec__l--d{fill:var(--on-hero)}
.cta .dec__l{stroke:var(--on-secondary);opacity:.2}.cta .dec__l--d{fill:var(--on-secondary)}
`;
}
