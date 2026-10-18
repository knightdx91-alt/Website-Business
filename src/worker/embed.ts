/**
 * The live stock list on a website someone else built (King Fish's friend is finishing theirs). Three ways in, all reading the
 * public feed `/l/<leadId>/prices.json`, so a change on the board or the tablet shows everywhere within a minute:
 *   - `/l/<id>/embed.js`: one line of code pasted into an "HTML / embed" block; draws the list in the site's own fonts and colors.
 *   - `/l/<id>/embed`: the same list as a page for an iframe (for builders that only allow iframes); tells the parent its height.
 *   - `/l/<id>/stock`: the same list as a full page of its own, for a plain link or button ("See what's in stock").
 * `/l/<id>/install` is the instruction sheet we text to their web person: the three snippets with Copy buttons and a live preview.
 * Nothing here is secret: it is the same list the shop's price page already shows. Options on the snippet: `data-tank="<slug>"`
 * (one tank only) and `data-accent="#hex"` (chip / badge color; default the site's link color).
 */
import { getLead } from "./db.ts";
import { recordOf } from "./tankboard.ts";
import type { Env } from "./env.ts";
import { escHtml as esc } from "./page.ts";
import { kindWords } from "../generator/pricelist.ts";

/** The renderer shared by the script and the pages: `UAS(host, data, opts)`. Plain ES5-ish JS, no backslashes, no template strings. */
export const RENDER = `
function uasEsc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function uasImg(u){return typeof u==="string"&&/^https?:[/][/]/.test(u)?u:"";}
function UAS(host,d,o){
  o=o||{};
  var W=d.words||{},secs=(d.sections||[]).filter(function(s){return !o.tank||s.slug===o.tank;});
  var total=0;secs.forEach(function(s){total+=s.items.length;});
  var h='<div class="uas"'+(o.accent?' style="--uas-accent:'+uasEsc(o.accent)+'"':'')+'>';
  h+='<div class="uas-top"><strong class="uas-title">'+uasEsc(o.tank&&secs[0]?secs[0].name:(d.title||"In stock"))+'</strong>';
  if(d.updatedAt)h+='<span class="uas-upd">Updated '+uasEsc(d.updatedAt)+'</span>';
  h+='</div>';
  if(!secs.length){h+='<p class="uas-empty">'+uasEsc(W.empty||"Nothing listed right now. Call us to ask what came in.")+'</p></div>';host.innerHTML=h;return;}
  if(secs.length>1&&!o.tank){h+='<div class="uas-chips">';secs.forEach(function(s){h+='<button type="button" class="uas-chip" data-uas-go="'+uasEsc(s.slug)+'">'+uasEsc(s.name)+'</button>';});h+='</div>';}
  if(total>=15)h+='<input class="uas-find" type="search" placeholder="Find a '+uasEsc((W.item||"item").toLowerCase())+'" aria-label="Find">';
  secs.forEach(function(s){
    h+='<section class="uas-sec" data-uas-sec="'+uasEsc(s.slug)+'">';
    if(!o.tank&&secs.length>1)h+='<h3 class="uas-h">'+uasEsc(s.name)+'</h3>';
    if(s.note)h+='<p class="uas-note">'+uasEsc(s.note)+'</p>';
    h+='<div class="uas-grid">';
    s.items.forEach(function(it){
      var img=uasImg(it.image),facts=it.facts||[];
      h+='<article class="uas-item" data-uas-name="'+uasEsc((it.name+" "+(it.note||"")).toLowerCase())+'">';
      h+=img?'<img class="uas-img" src="'+uasEsc(img)+'" alt="'+uasEsc(it.name)+'" loading="lazy">':'<div class="uas-img uas-ph" aria-hidden="true">'+uasEsc(it.emoji||W.emoji||"")+'</div>';
      h+='<div class="uas-body"><div class="uas-row"><span class="uas-name">'+uasEsc(it.name)+'</span>'+(it.price?'<span class="uas-price">'+uasEsc(it.price)+'</span>':'')+'</div>';
      if(it.qty!=null&&it.qty>0&&it.qty<=5)h+='<span class="uas-left">'+it.qty+' left</span>';
      if(it.sample)h+='<span class="uas-left">Sample</span>';
      if(it.note)h+='<p class="uas-desc">'+uasEsc(it.note)+'</p>';
      if(facts.length||(it.info&&it.info.notes)){
        h+='<details class="uas-more"><summary>About this one</summary><dl>';
        facts.forEach(function(f){h+='<dt>'+uasEsc(f[0])+'</dt><dd>'+uasEsc(f[1])+'</dd>';});
        h+='</dl>'+(it.info&&it.info.notes?'<p>'+uasEsc(it.info.notes)+'</p>':'')+'</details>';
      }
      h+='</div></article>';
    });
    h+='</div></section>';
  });
  h+='</div>';
  var keep=host.querySelector(".uas-find"),q=keep?keep.value:"";
  host.innerHTML=h;
  var f=host.querySelector(".uas-find");
  function filter(){var v=f.value.trim().toLowerCase();host.querySelectorAll(".uas-item").forEach(function(el){el.style.display=!v||el.getAttribute("data-uas-name").indexOf(v)>=0?"":"none";});host.querySelectorAll(".uas-sec").forEach(function(sec){var any=[].some.call(sec.querySelectorAll(".uas-item"),function(el){return el.style.display!=="none";});sec.style.display=any?"":"none";});if(o.resized)o.resized();}
  if(f){f.value=q;f.addEventListener("input",filter);if(q)filter();}
  host.querySelectorAll("[data-uas-go]").forEach(function(b){b.addEventListener("click",function(){var t=host.querySelector('[data-uas-sec="'+b.getAttribute("data-uas-go")+'"]');if(t)t.scrollIntoView({behavior:"smooth",block:"start"});});});
  if(o.resized)o.resized();
}
function uasLoad(feed,host,o){
  function go(){fetch(feed,{cache:"no-store"}).then(function(r){return r.ok?r.json():null;}).then(function(d){if(d&&d.sections)UAS(host,d,o);}).catch(function(){});}
  go();
  setInterval(function(){if(!document.hidden)go();},60000);
  document.addEventListener("visibilitychange",function(){if(!document.hidden)go();});
}
`;

/** Neutral styles that inherit the host site's font and text color; every rule is under `.uas`. */
const CSS = `
.uas{--uas-accent:currentColor;font:inherit;color:inherit;line-height:1.4;box-sizing:border-box}
.uas *,.uas *:before,.uas *:after{box-sizing:border-box}
.uas-top{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:4px 12px;margin:0 0 10px}
.uas-title{font-size:1.25em}
.uas-upd{font-size:.8em;opacity:.7}
.uas-chips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px}
.uas-chip{font:inherit;font-size:.85em;padding:6px 12px;border-radius:999px;border:1px solid var(--uas-accent);background:transparent;color:inherit;cursor:pointer}
.uas-find{font:inherit;width:100%;max-width:420px;padding:9px 12px;margin:0 0 14px;border:1px solid rgba(127,127,127,.5);border-radius:8px;background:transparent;color:inherit}
.uas-sec{margin:0 0 22px;scroll-margin-top:80px}
.uas-h{font-size:1.1em;margin:0 0 4px}
.uas-note{margin:0 0 10px;opacity:.8;font-size:.9em}
.uas-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px}
.uas-item{border:1px solid rgba(127,127,127,.3);border-radius:10px;overflow:hidden;display:flex;flex-direction:column}
.uas-img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;background:rgba(127,127,127,.12)}
.uas-ph{display:flex;align-items:center;justify-content:center;font-size:2.4em}
.uas-body{padding:10px 12px 12px;display:flex;flex-direction:column;gap:4px}
.uas-row{display:flex;justify-content:space-between;gap:8px;font-weight:600}
.uas-price{white-space:nowrap;font-variant-numeric:tabular-nums}
.uas-left{align-self:flex-start;font-size:.75em;font-weight:600;padding:2px 8px;border-radius:999px;border:1px solid var(--uas-accent)}
.uas-desc{margin:0;font-size:.9em;opacity:.85}
.uas-more{font-size:.85em}
.uas-more summary{cursor:pointer;font-weight:600}
.uas-more dl{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;margin:6px 0}
.uas-more dt{opacity:.7}.uas-more dd{margin:0}
.uas-more p{margin:4px 0 0}
.uas-empty{opacity:.8}
.uas{container-type:inline-size}
@container (max-width:520px){.uas-grid{grid-template-columns:1fr;gap:8px}.uas-item{flex-direction:row}.uas-img{width:96px;min-height:96px;aspect-ratio:auto;flex:none}.uas-ph{font-size:1.8em}.uas-body{padding:8px 10px;min-width:0}}
`;

/** `/l/<id>/embed.js`: finds `<div id="ua-stock">` (or `data-ua-stock`), else draws right where the script tag sits. */
export function embedScript(leadId: string, origin: string): string {
  return `/* Live stock list by Underground Associates. Paste: <div id="ua-stock"></div><script src="${origin}/l/${leadId}/embed.js" async></script> */
(function(){
var LEAD=${JSON.stringify(leadId)},FEED=${JSON.stringify(`${origin}/l/${leadId}/prices.json`)};
${RENDER}
var s=document.currentScript;
try{if(s&&s.src)FEED=new URL(s.src).origin+"/l/"+LEAD+"/prices.json";}catch(e){}
function start(){
  var host=document.querySelector('[data-ua-stock="'+LEAD+'"]')||document.getElementById("ua-stock")||document.querySelector("[data-ua-stock]");
  if(!host){host=document.createElement("div");if(s&&s.parentNode)s.parentNode.insertBefore(host,s);else document.body.appendChild(host);}
  if(host.getAttribute("data-uas-on"))return;host.setAttribute("data-uas-on","1");
  if(!document.getElementById("uas-style")){var st=document.createElement("style");st.id="uas-style";st.textContent=${JSON.stringify(CSS)};document.head.appendChild(st);}
  var pick=function(n){return host.getAttribute(n)||(s&&s.getAttribute(n))||"";};
  host.innerHTML='<p class="uas-empty">Loading what is in stock…</p>';
  uasLoad(FEED,host,{tank:pick("data-tank"),accent:pick("data-accent")});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
`;
}

/** The list as a page: `bare` for an iframe (transparent, reports its height to the parent), else a full page with the shop's name. */
export function stockPage(
  leadId: string,
  name: string,
  opts: { bare: boolean; tank?: string; accent?: string },
): string {
  const accent = /^#[0-9a-fA-F]{3,8}$/.test(opts.accent ?? "") ? opts.accent : "";
  const tank = /^[a-z0-9-]{1,60}$/.test(opts.tank ?? "") ? opts.tank : "";
  const page = opts.bare
    ? "html,body{margin:0;background:transparent}body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1f2933;padding:2px}"
    : "body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1f2933;background:#fff}main{max-width:1100px;margin:0 auto;padding:20px 16px 40px}h1{font-size:1.6rem;margin:0 0 14px}";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(name)}: in stock</title><style>${page}${CSS}</style></head><body>${opts.bare ? `<div id="uas"></div>` : `<main><h1>${esc(name)}</h1><div id="uas"></div></main>`}<script>
${RENDER}
(function(){var host=document.getElementById("uas");host.innerHTML='<p class="uas-empty">Loading what is in stock…</p>';
var bare=${opts.bare ? "true" : "false"};
function resized(){if(bare&&parent!==window)parent.postMessage({uaStock:${JSON.stringify(leadId)},h:Math.ceil(document.documentElement.scrollHeight)},"*");}
uasLoad("/l/${leadId}/prices.json",host,{tank:${JSON.stringify(tank)},accent:${JSON.stringify(accent)},resized:resized});
if(window.ResizeObserver)new ResizeObserver(resized).observe(document.body);addEventListener("load",resized);})();
</script></body></html>`;
}

/** The three snippets, exactly as the instruction page and the app show them. */
export function embedSnippets(leadId: string, origin: string) {
  const frameId = `ua-stock-${leadId}`;
  return {
    link: `${origin}/l/${leadId}/stock`,
    script: `<div id="ua-stock"></div>\n<script src="${origin}/l/${leadId}/embed.js" async></script>`,
    iframe: `<iframe id="${frameId}" src="${origin}/l/${leadId}/embed" title="What's in stock" style="width:100%;min-height:600px;border:0" loading="lazy"></iframe>\n<script>addEventListener("message",function(e){if(e.origin==="${origin}"&&e.data&&e.data.uaStock==="${leadId}"){document.getElementById("${frameId}").style.height=e.data.h+"px";}});</script>`,
    install: `${origin}/l/${leadId}/install`,
  };
}

/** `/l/<id>/install`: the page their web person gets. Plain words, three options, Copy buttons, and the live list under them. */
export function installPage(leadId: string, name: string, board: string, origin: string): string {
  const sn = embedSnippets(leadId, origin);
  const box = (id: string, code: string) =>
    `<div class="code"><pre id="${id}">${esc(code)}</pre><button type="button" data-copy="${id}">Copy</button></div>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Add ${esc(name)}'s live stock to the website</title><style>
body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1f2933;background:#f5f6f8;line-height:1.5}
main{max-width:860px;margin:0 auto;padding:20px 16px 48px}h1{font-size:1.5rem;margin:0 0 6px}h2{font-size:1.1rem;margin:26px 0 6px}
.card{background:#fff;border:1px solid #dde1e6;border-radius:12px;padding:16px;margin:12px 0}.tag{display:inline-block;font-size:.75rem;font-weight:700;background:#1d3d8f;color:#fff;border-radius:999px;padding:2px 10px;margin-left:6px;vertical-align:middle}
.code{position:relative;margin:8px 0}.code pre{background:#14213d;color:#e8edf5;padding:12px 70px 12px 12px;border-radius:8px;white-space:pre-wrap;word-break:break-all;font-size:.82rem;margin:0}
.code button{position:absolute;top:8px;right:8px;font:inherit;font-size:.8rem;padding:4px 10px;border-radius:6px;border:0;background:#f59e0b;color:#14213d;font-weight:700;cursor:pointer}
ol,ul{padding-left:20px}small{color:#5b6573}.preview{background:#fff;border:1px dashed #b8c0ca;border-radius:12px;padding:16px}
</style></head><body><main>
<h1>Put ${esc(name)}'s live stock on the website</h1>
<p>${esc(name)} keeps their stock up to date on their phone (the ${esc(board)}) and on the tablet in the store. The list below updates by itself within about a minute of every change: new arrivals, prices, sold out, photos. You only add it to the site once. Pick <b>one</b> of these three:</p>

<div class="card"><h2 style="margin-top:0">1. Show it inside a page <span class="tag">Best</span></h2>
<p>Add an <b>HTML / Embed / Custom code</b> block where the list should go (for example on a "Fish" or "In stock" page) and paste this. It uses the website's own fonts and colors.</p>
${box("s-script", sn.script)}
<small>Optional: add <code>data-accent="#0a7d8c"</code> to the div for your brand color, or <code>data-tank="tank-3"</code> to show one tank only.</small>
<p><small>Where the block is: <b>Wix</b> Add → Embed code → Embed HTML (use option 2 if Wix boxes it in). <b>Squarespace</b> Add block → Code. <b>WordPress</b> Add block → Custom HTML. <b>GoDaddy</b> Add section → HTML. <b>Shopify</b> Customize → Add section → Custom Liquid. <b>Weebly / Square Online</b> Embed code.</small></p></div>

<div class="card"><h2 style="margin-top:0">2. If the builder only allows a frame</h2>
<p>Some builders put pasted code in a box of its own. Paste this one instead. It grows to fit the list.</p>
${box("s-iframe", sn.iframe)}</div>

<div class="card"><h2 style="margin-top:0">3. Just a link or button</h2>
<p>Add a menu link or button such as <b>See what's in stock</b> that opens:</p>
${box("s-link", sn.link)}</div>

<h2>Questions</h2>
<ul><li><b>Does it slow the site down?</b> No. It loads after the page and is a few kilobytes.</li>
<li><b>Who changes the fish and prices?</b> The store, from their phone or the tablet. Nobody has to edit the website.</li>
<li><b>Stuck?</b> Text us and we'll walk you through it.</li></ul>

<h2>How it will look</h2><div class="preview"><div id="ua-stock"></div></div>
</main>
<script src="/l/${leadId}/embed.js" async></script>
<script>document.querySelectorAll("[data-copy]").forEach(function(b){b.addEventListener("click",function(){var t=document.getElementById(b.getAttribute("data-copy")).textContent;(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){b.textContent="Copied";setTimeout(function(){b.textContent="Copy";},1500);},function(){var r=document.createRange();r.selectNodeContents(document.getElementById(b.getAttribute("data-copy")));var s=getSelection();s.removeAllRanges();s.addRange(r);});});});</script>
</body></html>`;
}

/** Routes `/l/<id>/(embed.js|embed|stock|install)`. Public like the feed; 404 for unknown or expired leads. */
export async function serveEmbed(env: Env, leadId: string, what: string, url: URL, origin: string): Promise<Response> {
  const lead = await getLead(env, leadId);
  const record = lead && recordOf(lead);
  if (!lead || !record || lead.status === "expired") return new Response("Not found", { status: 404 });
  if (what === "embed.js")
    return new Response(embedScript(leadId, origin), {
      headers: {
        "content-type": "application/javascript; charset=utf-8",
        "cache-control": "public, max-age=300",
        "access-control-allow-origin": "*",
      },
    });
  const pageCsp = (frames: string) =>
    `default-src 'none'; style-src 'unsafe-inline'; img-src 'self' https: data:; script-src 'self' 'unsafe-inline'; connect-src 'self' ${origin}; base-uri 'none'; form-action 'none'; frame-ancestors ${frames}`;
  const headers = (frames: string) => ({
    "content-type": "text/html; charset=utf-8",
    "cache-control": "public, max-age=60",
    "x-robots-tag": "noindex",
    "content-security-policy": pageCsp(frames),
  });
  if (what === "install")
    return new Response(installPage(leadId, record.name, kindWords(record).board, origin), { headers: headers("'none'") });
  const bare = what === "embed";
  return new Response(
    stockPage(leadId, record.name, {
      bare,
      tank: url.searchParams.get("tank") ?? "",
      accent: url.searchParams.get("accent") ?? "",
    }),
    { headers: headers(bare ? "*" : "'none'") },
  );
}
