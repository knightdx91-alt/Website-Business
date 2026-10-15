import type { BusinessRecord } from "../generator/types.ts";
import { kindWords, listKind } from "../generator/pricelist.ts";
import { homescreenHead, homescreenPrompt } from "./homescreen.ts";
import { escHtml } from "./page.ts";

/**
 * Stock lookup (Oct 2026, built for Tire Barn Plus: "if someone asks for a specific tire he can just type it in and know if they
 * have it"). One private page per shop at `/c/<token>/find/`: a search box over the board's list (the same `priceList` the board,
 * price page and tablet use) and an "Update the list" box that takes their QuickBooks export (.xlsx or .csv) and replaces the
 * list. Nothing on it is public; QuickBooks stays where counts change, this only reads a copy. Tire sizes match however they
 * are typed: 265/70R17, 265 70 17, 2657017, LT265/75-16, 33x12.50R20, or just the start of one (265/70).
 *
 * MATCH_SRC and XLSX_SRC are plain browser JS (the page ships them as-is); tests evaluate the same strings.
 */

/** Search: `sizeKeys(text)` → digit keys of every tire size in it; `matches(item, query)`; `rank(items, query)`. */
export const MATCH_SRC = String.raw`
var SIZE_RES = [
  /(\d{3})\s*[\/\- ]\s*(\d{2})\s*(?:[a-z]{1,3})?\s*[-\/ ]?\s*(\d{2}(?:\.\d)?)(?![\d])/g,
  /(\d{2})\s*x\s*(\d{1,2}(?:\.\d{1,2})?)\s*(?:[a-z]{1,3})?\s*[-\/ ]?\s*(\d{2})(?![\d])/g,
  /(?:^|[^\d])(1[3-9]\d|2\d\d|3[0-4]\d)(\d{2})(1[2-9]|2[0-6])(?![\d])/g
];
function squash(s) { return String(s == null ? "" : s).toLowerCase().replace(/[^a-z0-9]/g, ""); }
function sizeKeys(s) {
  var t = String(s == null ? "" : s).toLowerCase(), keys = [], m, i;
  for (i = 0; i < SIZE_RES.length; i++) {
    var re = new RegExp(SIZE_RES[i].source, "g");
    while ((m = re.exec(t))) keys.push((m[1] + m[2] + m[3]).replace(/\./g, ""));
  }
  return keys;
}
var STOP = { p: 1, lt: 1, st: 1, r: 1, zr: 1, x: 1, tire: 1, tires: 1, a: 1, the: 1 };
function parseQuery(q) {
  var t = String(q == null ? "" : q).toLowerCase(), sizes = sizeKeys(t), rest = t, i;
  for (i = 0; i < SIZE_RES.length; i++) rest = rest.replace(new RegExp(SIZE_RES[i].source, "g"), " ");
  var words = rest.split(/[\s,]+/).map(squash).filter(function (w) { return w && !STOP[w]; });
  return { sizes: sizes, words: words };
}
function indexItem(it) {
  if (it._ix) return it._ix;
  var facts = [];
  var inf = it.info || {};
  if (inf.facts) for (var i = 0; i < inf.facts.length; i++) facts.push(inf.facts[i].value);
  var text = [it.name, it.note, it.section, it.barcode, facts.join(" ")].join(" ");
  return (it._ix = { sq: squash(text), keys: sizeKeys(text) });
}
function matches(it, pq) {
  if (!pq.sizes.length && !pq.words.length) return false;
  var ix = indexItem(it), i, k;
  for (i = 0; i < pq.sizes.length; i++) {
    var ok = false;
    for (k = 0; k < ix.keys.length; k++) if (ix.keys[k] === pq.sizes[i]) ok = true;
    if (!ok) return false;
  }
  for (i = 0; i < pq.words.length; i++) {
    var w = pq.words[i], hit = ix.sq.indexOf(w) >= 0;
    if (!hit && /^\d+$/.test(w)) for (k = 0; k < ix.keys.length; k++) if (ix.keys[k].indexOf(w) === 0) hit = true;
    if (!hit) return false;
  }
  return true;
}
function inStock(it) { return !it.soldOut && it.qty !== 0; }
function rank(items, q) {
  var pq = parseQuery(q), out = [];
  for (var i = 0; i < items.length; i++) if (matches(items[i], pq)) out.push(items[i]);
  out.sort(function (a, b) {
    var sa = inStock(a) ? 0 : 1, sb = inStock(b) ? 0 : 1;
    if (sa !== sb) return sa - sb;
    var qa = a.qty == null ? -1 : a.qty, qb = b.qty == null ? -1 : b.qty;
    if (qa !== qb) return qb - qa;
    return String(a.name).localeCompare(String(b.name));
  });
  return out;
}
`;

/**
 * An Excel .xlsx file (an ArrayBuffer) → rows of cell text, first worksheet only, no library: the zip's central directory,
 * DecompressionStream("deflate-raw") for each part, then sharedStrings + the sheet's cells by column letter.
 */
export const XLSX_SRC = String.raw`
function xmlText(s) {
  return String(s).replace(/&#(\d+);/g, function (_, n) { return String.fromCharCode(+n); }).replace(/&#x([0-9a-f]+);/gi, function (_, n) { return String.fromCharCode(parseInt(n, 16)); })
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}
function colIndex(letters) { var n = 0; for (var i = 0; i < letters.length; i++) n = n * 26 + (letters.charCodeAt(i) - 64); return n - 1; }
function runsText(xml) { var t = "", re = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g, m; while ((m = re.exec(xml))) t += m[1]; return xmlText(t); }
async function xlsxRows(buf) {
  var u = new Uint8Array(buf), dv = new DataView(buf), end = -1, i;
  for (i = u.length - 22; i >= Math.max(0, u.length - 65558); i--) if (dv.getUint32(i, true) === 0x06054b50) { end = i; break; }
  if (end < 0) throw new Error("That file isn't an Excel .xlsx file. In QuickBooks export to Excel, or save it as .csv.");
  var count = dv.getUint16(end + 10, true), off = dv.getUint32(end + 16, true), files = {}, dec = new TextDecoder();
  for (i = 0; i < count; i++) {
    if (dv.getUint32(off, true) !== 0x02014b50) break;
    var nlen = dv.getUint16(off + 28, true), xlen = dv.getUint16(off + 30, true), clen = dv.getUint16(off + 32, true);
    files[dec.decode(u.subarray(off + 46, off + 46 + nlen))] = { method: dv.getUint16(off + 10, true), size: dv.getUint32(off + 20, true), at: dv.getUint32(off + 42, true) };
    off += 46 + nlen + xlen + clen;
  }
  async function read(name) {
    var f = files[name];
    if (!f) return null;
    var start = f.at + 30 + dv.getUint16(f.at + 26, true) + dv.getUint16(f.at + 28, true), data = u.slice(start, start + f.size);
    if (f.method === 0) return dec.decode(data);
    var out = await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer();
    return dec.decode(out);
  }
  var shared = [], ss = await read("xl/sharedStrings.xml"), m;
  if (ss) { var sre = /<si>([\s\S]*?)<\/si>/g; while ((m = sre.exec(ss))) shared.push(runsText(m[1])); }
  var sheet = files["xl/worksheets/sheet1.xml"] ? "xl/worksheets/sheet1.xml" : Object.keys(files).filter(function (k) { return /^xl\/worksheets\/[^\/]+\.xml$/.test(k); }).sort()[0];
  var xml = sheet ? await read(sheet) : null;
  if (!xml) throw new Error("Couldn't find a sheet in that Excel file.");
  var rows = [], rre = /<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g, r;
  while ((r = rre.exec(xml))) {
    var row = [], cre = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g, c;
    while ((c = cre.exec(r[1] || ""))) {
      var attrs = c[1], body = c[2] || "", ref = /\br="([A-Z]+)\d+"/.exec(attrs), type = /\bt="([^"]+)"/.exec(attrs), v = /<v>([\s\S]*?)<\/v>/.exec(body);
      var col = ref ? colIndex(ref[1]) : row.length, val;
      if (type && type[1] === "s") val = v ? shared[+v[1]] || "" : "";
      else if (type && type[1] === "inlineStr") val = runsText(body);
      else val = v ? xmlText(v[1]) : "";
      while (row.length < col) row.push("");
      row[col] = val;
    }
    rows.push(row);
  }
  return rows;
}
/** Rows → tab-separated text for the board's import (which reads tabs as a spreadsheet paste). */
function rowsToTsv(rows) {
  return rows.map(function (r) { return r.map(function (c) { return String(c == null ? "" : c).replace(/[\t\r\n]+/g, " ").replace(/^"/, "“"); }).join("\t"); }).join("\n");
}
`;

/** `/c/<token>/find/`: the search page. */
export function lookupPage(record: BusinessRecord, base: string): Response {
  const W = kindWords(record);
  const tires = record.category === "auto" && /tire/i.test(`${record.variant} ${record.name}`);
  const parts = listKind(record) === "parts";
  const name = escHtml(record.name);
  const hint = tires
    ? "Type a tire size, like 265/70R17, or a brand"
    : parts
      ? "Type a part, part number or size"
      : `Type what you're looking for`;
  const findBase = `${base}/find`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow"><meta name="theme-color" content="#14213d"><title>Stock lookup · ${name}</title>
<link rel="icon" href="${escHtml(base)}/icon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/brand/logo-192.png">${homescreenHead({ manifestUrl: `${findBase}/manifest.webmanifest`, title: `${record.name} lookup` })}
<style>
:root{--navy:#14213d;--gold:#fca311;--ink:#16181d;--muted:#5b6270;--line:#e1e4ea;--bg:#f4f5f8;--ok:#0f7b3b}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
header{background:var(--navy);color:#fff;padding:12px 16px 14px;position:sticky;top:0;z-index:3}
header h1{font-size:1.05rem;margin:0 0 8px;font-weight:700}
.q{display:flex;gap:8px}.q input{flex:1;min-width:0;font:600 1.2rem system-ui;padding:14px;border-radius:12px;border:0;outline:3px solid transparent}
.q input:focus{outline-color:var(--gold)}.q button{border:0;border-radius:12px;background:#ffffff22;color:#fff;font-size:1.1rem;padding:0 14px;cursor:pointer}
main{max-width:760px;margin:0 auto;padding:12px}
.st{color:#dfe4ee;font-size:.85rem;margin-top:6px}
.res{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.it{background:#fff;border:1px solid var(--line);border-radius:14px;padding:12px 14px;display:grid;grid-template-columns:1fr auto;gap:4px 12px;align-items:center}
.it.out{opacity:.6}.nm{font-weight:700;font-size:1.08rem;word-break:break-word}
.qty{grid-row:span 2;text-align:center;min-width:76px;border-radius:12px;padding:6px 8px;background:#e8f6ee;color:var(--ok);font-weight:800;line-height:1.1}
.qty b{display:block;font-size:1.7rem}.qty small{font-size:.75rem;font-weight:700}
.it.out .qty{background:#eef0f4;color:var(--muted)}
.meta{color:var(--muted);font-size:.9rem}.meta span+span:before{content:" · "}
.empty{padding:28px 12px;text-align:center;color:var(--muted)}
.more{text-align:center;color:var(--muted);font-size:.9rem;margin:12px 0}
details{background:#fff;border:1px solid var(--line);border-radius:14px;margin:18px 0 8px;padding:4px 14px}
summary{cursor:pointer;font-weight:700;padding:10px 0}
.small{font-size:.9rem}.muted{color:var(--muted)}ol{padding-left:20px;margin:6px 0}
.btn{border:0;border-radius:12px;background:var(--gold);color:var(--navy);font:700 1rem system-ui;padding:12px 16px;cursor:pointer}
.btn--line{background:#fff;border:2px solid var(--navy)}.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:10px 0}
.pick{display:inline-block;border:2px dashed #c7cdd8;border-radius:12px;padding:12px 14px;cursor:pointer;font-weight:700}
.ok{color:var(--ok);font-weight:700}.err{color:#a3281c;font-weight:700}
footer{text-align:center;color:var(--muted);font-size:.8rem;padding:10px 16px 90px}footer a{color:inherit}
</style></head><body>
<header><h1>${name} · Stock lookup</h1>
<form class="q" id="qf" role="search" onsubmit="return false"><input id="q" type="text" enterkeyhint="search" autocomplete="off" autofocus placeholder="${escHtml(hint)}" aria-label="Search the stock"><button type="button" id="clr" aria-label="Clear">✕</button></form>
<div class="st" id="st">Loading…</div></header>
<main>
<ul class="res" id="res" aria-live="polite"></ul>
<p class="empty" id="empty">${escHtml(tires ? "Type a size to see if it's on the shelf." : "Type to search everything in stock.")}</p>
<p class="more" id="more" hidden></p>
<details id="up"><summary>⬆️ Update the list from QuickBooks</summary>
<div class="small">
<p style="margin:4px 0 8px">Counts change in QuickBooks; this page shows the last list you sent it. To refresh it:</p>
<ol><li><b>QuickBooks Online:</b> Sales → Products and services → the Export button (Excel).</li>
<li><b>QuickBooks Desktop:</b> Lists → Item List → Excel → Export all items (or Reports → Inventory → Inventory Valuation Summary → Excel).</li>
<li>Pick that file below. Excel (.xlsx) and .csv both work.</li></ol>
<div class="row"><label class="pick">📄 Pick the file<input id="file" type="file" accept=".xlsx,.csv,.tsv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" style="display:none"></label></div>
<div id="upPrev"></div><p id="upMsg" class="muted"></p>
</div></details>
</main>
<footer>Private page for ${name}. <a href="${escHtml(base)}/">Open the full ${escHtml(W.board.toLowerCase())}</a></footer>
${homescreenPrompt({ appName: `${record.name} lookup`, key: base })}
<script>
(function(){
${MATCH_SRC}
${XLSX_SRC}
var BASE=${JSON.stringify(base)};
var q=document.getElementById("q"),res=document.getElementById("res"),empty=document.getElementById("empty"),more=document.getElementById("more"),st=document.getElementById("st");
var items=[],loaded=false,MAX=60;
function esc(t){return String(t==null?"":t).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function ago(iso){if(!iso)return"";var d=new Date(iso);if(isNaN(d))return"";var m=Math.round((Date.now()-d)/60000);if(m<2)return"just now";if(m<60)return m+" min ago";var h=Math.round(m/60);if(h<36)return h+" h ago";return d.toLocaleDateString(undefined,{month:"short",day:"numeric"})}
function load(){
  return fetch(BASE+"/data",{cache:"no-store"}).then(function(r){if(!r.ok)throw new Error("Couldn't load the list ("+r.status+")");return r.json()}).then(function(j){
    var all=[];(j.sections||[]).forEach(function(s){(s.items||[]).forEach(function(it){it.section=s.name;all.push(it)})});
    items=all;loaded=true;
    var inS=all.filter(inStock).length;
    st.textContent=all.length?(all.length+" items · "+inS+" in stock"+(j.updatedAt?" · list updated "+ago(j.updatedAt):"")):"No items yet. Open “Update the list” below to load your QuickBooks list.";
    if(!all.length)document.getElementById("up").open=true;
    show();
  }).catch(function(e){st.textContent=e.message});
}
function facts(it){var f=(it.info&&it.info.facts)||[];return f.slice(0,3).map(function(x){return"<span>"+esc(x.label)+": "+esc(x.value)+"</span>"}).join("")}
function show(){
  var t=q.value.trim();
  if(!t){res.innerHTML="";more.hidden=true;empty.hidden=false;empty.textContent=${JSON.stringify(tires ? "Type a size to see if it's on the shelf." : "Type to search everything in stock.")};return}
  if(!loaded)return;
  var hits=rank(items,t);
  empty.hidden=hits.length>0;
  if(!hits.length)empty.innerHTML="Nothing matches <b>"+esc(t)+"</b>."+(items.length?" Check the size, or try fewer words.":"");
  res.innerHTML=hits.slice(0,MAX).map(function(it){
    var ok=inStock(it),n=it.qty==null?"":it.qty;
    var badge=ok?(n===""?"<b>✓</b><small>in stock</small>":"<b>"+esc(n)+"</b><small>in stock</small>"):"<b>0</b><small>out</small>";
    return'<li class="it'+(ok?"":" out")+'"><div class="nm">'+esc(it.name)+'</div><div class="qty">'+badge+'</div><div class="meta">'+(it.price?"<span>"+esc(it.price)+"</span>":"")+(it.section?"<span>"+esc(it.section)+"</span>":"")+(it.note?"<span>"+esc(it.note)+"</span>":"")+facts(it)+(it.barcode?"<span>#"+esc(it.barcode)+"</span>":"")+"</div></li>";
  }).join("");
  more.hidden=hits.length<=MAX;more.textContent="Showing "+MAX+" of "+hits.length+". Type more to narrow it down.";
}
var timer;q.addEventListener("input",function(){clearTimeout(timer);timer=setTimeout(show,80)});
document.getElementById("clr").addEventListener("click",function(){q.value="";show();q.focus()});
document.addEventListener("visibilitychange",function(){if(!document.hidden)load()});
setInterval(function(){if(!document.hidden)load()},60000);
var file=document.getElementById("file"),upMsg=document.getElementById("upMsg"),upPrev=document.getElementById("upPrev"),pending=null;
function imp(body){return fetch(BASE+"/import",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}).then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error(j.error||"Import failed ("+r.status+")");return j})})}
file.addEventListener("change",function(){
  var f=file.files&&file.files[0];if(!f)return;upPrev.innerHTML="";upMsg.className="muted";upMsg.textContent="Reading "+f.name+"…";
  var isX=/\.xlsx$/i.test(f.name)||/spreadsheetml/.test(f.type);
  (isX?f.arrayBuffer().then(xlsxRows).then(rowsToTsv):f.text()).then(function(text){pending=text;return imp({text:text,mode:"replace",dryRun:true})}).then(function(j){
    var p=j.preview,cols=p.columns.filter(function(c){return c.field!=="skip"}).map(function(c){return(c.header||"(no heading)")+" → "+({name:"name",price:"price",qty:"how many",barcode:"part # / SKU",section:"group",note:"note"}[c.field]||c.field.replace("info:",""))});
    upMsg.textContent="";
    upPrev.innerHTML="<p><b>Found "+p.rows+" items.</b> Columns used: "+esc(cols.join(", "))+"</p><p class='muted'>First ones: "+esc(p.sample.slice(0,3).map(function(s){return s.name+(s.qty!=null?" ("+s.qty+")":"")}).join("; "))+"</p><div class='row'><button class='btn' id='upGo' type='button'>Replace the list with these "+p.rows+"</button><button class='btn btn--line' id='upNo' type='button'>Cancel</button></div>";
    document.getElementById("upNo").onclick=function(){upPrev.innerHTML="";pending=null;file.value=""};
    document.getElementById("upGo").onclick=function(){var b=this;b.disabled=true;upMsg.textContent="Saving…";imp({text:pending,mode:"replace"}).then(function(j2){upPrev.innerHTML="";file.value="";upMsg.className="ok";upMsg.textContent="Done: "+j2.result.items+" items on the list.";return load()}).catch(function(e){b.disabled=false;upMsg.className="err";upMsg.textContent=e.message})};
  }).catch(function(e){upMsg.className="err";upMsg.textContent=e.message});
});
load();
})();
</script></body></html>`;
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
      "referrer-policy": "no-referrer",
      "content-security-policy":
        "default-src 'self'; img-src 'self' data: https:; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'",
    },
  });
}
