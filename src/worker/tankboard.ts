import { z } from "zod";
import { hmac, safeEqual } from "./auth.ts";
import { getLead, updateLead, type LeadRow } from "./db.ts";
import { HttpError, newId, type Env } from "./env.ts";
import { autoMatchPhotos, sectionSlug } from "../generator/packs/retail.ts";
import type { BusinessRecord, Copy, Image, MenuSection } from "../generator/types.ts";
import { escHtml } from "./page.ts";
import { renderPreview } from "./pipeline.ts";
import { publishLead } from "./publish.ts";

/**
 * Tank board: the client's own live editor for their price list (built for King Fish Aquatics, whose tanks change several
 * times a day). We text them `/c/<leadId>.<sig>`; no login, no password. The page lists their sections (tanks) and items
 * (name, price, how many, a note, a photo from the phone camera, sold out). Every change saves at once into the same
 * `ext.retail.priceList` the owner edits in the app, re-renders the preview, and the site's /prices/ page reads the live
 * feed `/l/<leadId>/prices.json`, so the QR label on a tank shows what's in it within about 30 seconds. Live sites are
 * republished by the minute cron (`republishDirty`) so the static copy and search engines catch up too.
 * The link is signed with a per-lead key (`leads.client_key`): "Text them their tank board link" makes one the first time;
 * a new key (future: a "revoke" button) kills old links.
 */

export const APP_ORIGIN = "https://website-business.knightdx91.workers.dev";

async function sign(env: Env, leadId: string, key: string): Promise<string> {
  return hmac(env.APP_SECRET, `client.${leadId}.${key}`);
}

/** The client's link, making their key on first use. */
export async function clientLink(env: Env, lead: LeadRow, origin: string): Promise<string> {
  let key = lead.client_key ?? null;
  if (!key) {
    key = newId();
    await updateLead(env, lead.id, { client_key: key });
  }
  return `${origin}/c/${lead.id}.${await sign(env, lead.id, key)}`;
}

async function leadFor(env: Env, leadId: string, sig: string): Promise<LeadRow> {
  const lead = await getLead(env, leadId);
  if (!lead || lead.status === "expired" || !lead.client_key || !safeEqual(sig, await sign(env, leadId, lead.client_key))) throw new HttpError(404, "This link isn't valid any more. Ask us for a new one.");
  return lead;
}

const recordOf = (lead: LeadRow): BusinessRecord | null => (lead.record_json ? (JSON.parse(lead.record_json) as BusinessRecord) : null);

function priceList(r: BusinessRecord) {
  return (r.ext.retail ??= {}).priceList ?? { sections: [] as MenuSection[], lastUpdated: "", public: true };
}

const stamp = () => new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" });

/** What the site and the board read: in-stock items only for the site; the board asks with `all=1`. */
export function pricesFeed(lead: LeadRow, record: BusinessRecord, origin: string, all = false) {
  const pl = priceList(record);
  const photo = (img?: Image) => (img && img.source !== "google" ? (img.src.startsWith("/assets/owner/") ? `${origin}/l/${lead.id}/photo/${img.src.slice("/assets/owner/".length)}` : img.src) : undefined);
  return {
    name: record.name,
    title: pl.title?.trim() || "Prices",
    public: pl.public !== false,
    updatedAt: pl.lastUpdated,
    siteUrl: lead.custom_domain ? `https://${lead.custom_domain}/prices/` : lead.live_url ? `${lead.live_url.replace(/\/$/, "")}/prices/` : null,
    sections: pl.sections
      .map((s) => ({
        name: s.name,
        slug: sectionSlug(s.name),
        note: s.note ?? "",
        items: s.items
          .filter((it) => all || (!it.soldOut && it.qty !== 0))
          .map((it) => ({ name: it.name, price: it.price ?? "", note: it.description ?? "", qty: it.qty ?? null, soldOut: !!it.soldOut, image: photo(it.image) ?? null, imageSrc: it.image?.src ?? null })),
      }))
      .filter((s) => all || s.items.length),
  };
}

const ItemsBody = z.object({
  sections: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(60),
        note: z.string().trim().max(200).optional(),
        items: z
          .array(
            z.object({
              name: z.string().trim().min(1).max(120),
              price: z.string().trim().max(30).optional(),
              note: z.string().trim().max(200).optional(),
              qty: z.number().int().min(0).max(9999).nullable().optional(),
              soldOut: z.boolean().optional(),
              /** The gallery file the item's photo is (kept across edits); "" clears. */
              imageSrc: z.string().max(200).nullable().optional(),
            }),
          )
          .max(200),
      }),
    )
    .max(60),
});

/** Replaces the price list with what the board sent, keeping photos by file and matching new ones by caption. */
export function applyClientItems(record: BusinessRecord, body: z.infer<typeof ItemsBody>): void {
  const pl = priceList(record);
  const byFile = new Map<string, Image>();
  for (const g of record.media.gallery) byFile.set(g.src, g);
  for (const s of pl.sections) for (const it of s.items) if (it.image) byFile.set(it.image.src, it.image);
  const sections: MenuSection[] = body.sections.map((s) => ({
    name: s.name,
    note: s.note || undefined,
    items: s.items.map((it) => ({
      name: it.name,
      price: it.price || undefined,
      description: it.note || undefined,
      qty: it.qty === null || it.qty === undefined ? undefined : it.qty,
      soldOut: it.soldOut || undefined,
      image: it.imageSrc ? byFile.get(it.imageSrc) : undefined,
    })),
  }));
  autoMatchPhotos(sections, record.media.gallery);
  record.ext.retail!.priceList = { ...pl, sections, lastUpdated: stamp() };
}

async function saveAndRefresh(env: Env, lead: LeadRow, record: BusinessRecord): Promise<void> {
  const copy = lead.copy_json ? (JSON.parse(lead.copy_json) as Copy) : null;
  await updateLead(env, lead.id, { record_json: JSON.stringify(record), prices_dirty: lead.live_url ? 1 : 0, pitch_json: null });
  if (copy) await renderPreview(env, lead, record, copy, lead.look ?? "");
}

/** Minute cron: republish live sites whose price list changed, two a minute, so the static copy follows the board. */
export async function republishDirty(env: Env): Promise<number> {
  const rows = await env.DB.prepare("SELECT * FROM leads WHERE prices_dirty = 1 AND live_url IS NOT NULL AND status = 'ready' ORDER BY updated_at ASC LIMIT 2").all<LeadRow>();
  let n = 0;
  for (const lead of rows.results) {
    try {
      await publishLead(env, lead, APP_ORIGIN);
      await updateLead(env, lead.id, { prices_dirty: 0 });
      n++;
    } catch (err) {
      console.error("tank board republish failed", lead.id, err);
      await updateLead(env, lead.id, { prices_dirty: 0 });
    }
  }
  return n;
}

/** `/l/<leadId>/prices.json`: the live feed any copy of the site (preview, share, live) reads. Public, cached half a minute. */
export async function servePricesFeed(env: Env, leadId: string, origin: string): Promise<Response> {
  const lead = await getLead(env, leadId);
  const record = lead && recordOf(lead);
  if (!lead || !record || lead.status === "expired") return new Response("{}", { status: 404, headers: { "content-type": "application/json" } });
  return new Response(JSON.stringify(pricesFeed(lead, record, origin)), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=30", "access-control-allow-origin": "*" },
  });
}

/** `/l/<leadId>/photo/<file>`: an owner photo straight from storage, so a photo taken at the tank shows before the next publish. */
export async function servePhoto(env: Env, leadId: string, file: string): Promise<Response> {
  if (!/^[A-Za-z0-9_.-]{1,80}$/.test(file)) return new Response("Not found", { status: 404 });
  const obj = await env.BUCKET.get(`owner/${leadId}/${file}`);
  if (!obj) return new Response("Not found", { status: 404 });
  return new Response(obj.body, { headers: { "content-type": obj.httpMetadata?.contentType ?? "image/jpeg", "cache-control": "public, max-age=86400", "access-control-allow-origin": "*" } });
}

/** `/c/<leadId>.<sig>` and its little API. */
export async function serveTankBoard(env: Env, req: Request, leadId: string, sig: string, rest: string, origin: string): Promise<Response> {
  const lead = await leadFor(env, leadId, sig);
  const record = recordOf(lead);
  if (!record) throw new HttpError(409, "Your site isn't built yet. Try again in a few minutes.");
  const base = `/c/${leadId}.${sig}`;
  if (rest === "/data" && req.method === "GET") return Response.json(pricesFeed(lead, record, origin, true), { headers: { "cache-control": "no-store" } });
  if (rest === "/items" && req.method === "PUT") {
    const body = ItemsBody.parse(await req.json());
    applyClientItems(record, body);
    await saveAndRefresh(env, lead, record);
    return Response.json(pricesFeed(lead, record, origin, true), { headers: { "cache-control": "no-store" } });
  }
  if (rest === "/photo" && req.method === "POST") {
    const url = new URL(req.url);
    const type = req.headers.get("content-type") ?? "";
    const ext = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as Record<string, string>)[type];
    if (!ext) throw new HttpError(415, "Send a JPEG, PNG or WebP photo");
    const bytes = await req.arrayBuffer();
    if (bytes.byteLength > 8_000_000) throw new HttpError(413, "That photo is over 8 MB");
    const section = url.searchParams.get("section") ?? "";
    const item = url.searchParams.get("item") ?? "";
    const key = `c${newId().slice(0, 10)}`;
    await env.BUCKET.put(`owner/${leadId}/${key}.${ext}`, bytes, { httpMetadata: { contentType: type } });
    const img: Image = { src: `/assets/owner/${key}.${ext}`, alt: item || `Photo from ${record.name}`, source: "owner", width: Number(url.searchParams.get("w")) || undefined, height: Number(url.searchParams.get("h")) || undefined };
    if (record.media.gallery.length < 24) record.media.gallery.push(img);
    const pl = priceList(record);
    const target = pl.sections.find((s) => s.name === section)?.items.find((it) => it.name === item);
    if (target) target.image = img;
    record.ext.retail!.priceList = { ...pl, lastUpdated: stamp() };
    await saveAndRefresh(env, lead, record);
    return Response.json({ ok: true, imageSrc: img.src, image: `${origin}/l/${leadId}/photo/${key}.${ext}` });
  }
  if (rest && rest !== "/") return Response.redirect(`${origin}${base}/`, 302);
  if (!rest) return Response.redirect(`${origin}${base}/`, 301);
  return boardPage(record, base, leadId);
}

export function boardPage(record: BusinessRecord, base: string, leadId = ""): Response {
  const name = escHtml(record.name);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow"><meta name="theme-color" content="#14213d"><title>Tank board · ${name}</title>
<link rel="icon" href="/brand/logo-192.png"><link rel="apple-touch-icon" href="/brand/logo-192.png">
<style>
:root{--navy:#14213d;--gold:#fca311;--ink:#16181d;--muted:#5b6270;--line:#e1e4ea;--bg:#f4f5f8;--ok:#0f7b3b;--warn:#8a5300}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding-bottom:90px}
header{background:var(--navy);color:#fff;padding:14px 16px;position:sticky;top:0;z-index:3;display:flex;align-items:center;justify-content:space-between;gap:10px}
header h1{font-size:1.1rem;margin:0}header .st{font-size:.85rem;color:#dfe4ee}
main{max-width:720px;margin:0 auto;padding:12px}
.tank{background:#fff;border:1px solid var(--line);border-radius:14px;margin:0 0 12px;overflow:hidden}
.tank__h{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#fff7e6;border-bottom:1px solid var(--line)}
.tank__h input{flex:1;font:700 1.05rem system-ui;border:0;background:transparent;min-width:0}
.item{display:grid;grid-template-columns:56px 1fr;gap:10px;padding:10px 12px;border-bottom:1px solid var(--line)}
.item:last-child{border-bottom:0}.item.out{opacity:.55}
.ph{width:56px;height:56px;border-radius:10px;background:#eef1f6;display:grid;place-items:center;overflow:hidden;position:relative;border:1px dashed #c7cdd8;font-size:22px}
.ph img{width:100%;height:100%;object-fit:cover}.ph input{position:absolute;inset:0;opacity:0;width:100%;height:100%}
.row{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.row input{min-width:0;border:1px solid var(--line);border-radius:8px;padding:8px;font:inherit}
.nm{flex:3 1 140px}.pr{flex:1 1 72px;max-width:96px}.qt{flex:1 1 60px;max-width:72px}.nt{flex:1 1 100%}
.chip{border:1px solid var(--line);border-radius:999px;padding:6px 10px;font-size:.85rem;background:#fff;cursor:pointer}
.chip.on{background:#fde7d7;border-color:#f4b183;color:#8a2c0a}
.ic{border:0;background:transparent;font-size:1.1rem;cursor:pointer;padding:4px 6px;color:var(--muted)}
.add{display:block;width:100%;padding:12px;border:0;background:transparent;color:var(--navy);font-weight:700;cursor:pointer;text-align:left}
.bar{position:fixed;left:0;right:0;bottom:0;background:#fff;border-top:1px solid var(--line);padding:10px 12px calc(10px + env(safe-area-inset-bottom));display:flex;gap:8px;justify-content:space-between;align-items:center}
.btn{border:0;border-radius:12px;background:var(--gold);color:var(--navy);font:700 1rem system-ui;padding:12px 16px;cursor:pointer}
.btn--line{background:#fff;border:2px solid var(--navy)}
.muted{color:var(--muted)}.small{font-size:.86rem}
.saved{color:var(--ok);font-weight:700}.err{color:#a3281c;font-weight:700}
.empty{padding:24px 12px;text-align:center;color:var(--muted)}
footer{text-align:center;color:var(--muted);font-size:.8rem;padding:16px}
</style></head><body>
<header><div><h1>${name} · Tank board</h1><div class="st" id="st">Loading…</div></div><a id="open" class="small" style="color:#fff" hidden target="_blank" rel="noopener">Open price page ↗</a></header>
<main id="m"><p class="empty">Loading your tanks…</p></main>
<div class="bar"><button class="btn btn--line" id="addTank" type="button">+ Add a tank</button><span class="small muted">Changes save by themselves.</span></div>
<footer>📺 means "show this tank on a screen": open that link on a tablet by the tank and it shows what's in it, live. <a href="/d/${escHtml(leadId)}/" target="_blank" rel="noopener">All tanks, rotating</a>.<br>Tank board by Underground Associates · Anything odd? Text us.</footer>
<script>
(function(){
var BASE=${JSON.stringify(base)};var LEAD=${JSON.stringify(leadId)};var data=null;var timer=null;var st=document.getElementById("st");var m=document.getElementById("m");
function esc(t){return String(t==null?"":t).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function status(t,cls){st.textContent=t;st.className="st "+(cls||"")}
function render(){
  if(!data.sections.length){m.innerHTML='<p class="empty">No tanks yet. Tap <b>+ Add a tank</b> below, then add what\\'s in it.</p>';return}
  m.innerHTML=data.sections.map(function(s,si){return '<section class="tank" data-s="'+si+'"><div class="tank__h"><span>🐟</span><input value="'+esc(s.name)+'" data-f="sname" aria-label="Tank name"><button class="ic" data-a="up" title="Move up">▲</button><button class="ic" data-a="down" title="Move down">▼</button><button class="ic" data-a="deltank" title="Remove tank">🗑</button><a class="ic" href="/d/'+LEAD+'/'+esc(s.slug||'')+'" target="_blank" rel="noopener" title="Show this tank on a tablet or TV">📺</a></div>'+
    s.items.map(function(it,ii){return '<div class="item'+(it.soldOut?' out':'')+'" data-i="'+ii+'"><label class="ph" title="Take or pick a photo">'+(it.image?'<img src="'+esc(it.image)+'" alt="">':'📷')+'<input type="file" accept="image/*" capture="environment" data-a="photo"></label><div>'+
      '<div class="row"><input class="nm" value="'+esc(it.name)+'" data-f="name" placeholder="What is it?" aria-label="Name"><input class="pr" value="'+esc(it.price)+'" data-f="price" placeholder="$" inputmode="decimal" aria-label="Price"><input class="qt" value="'+(it.qty==null?"":it.qty)+'" data-f="qty" placeholder="how many" inputmode="numeric" aria-label="How many"></div>'+
      '<div class="row"><input class="nt" value="'+esc(it.note)+'" data-f="note" placeholder="Note (size, pairs only, feeding…)" aria-label="Note"></div>'+
      '<div class="row"><button class="chip'+(it.soldOut?' on':'')+'" data-a="sold" type="button">'+(it.soldOut?'Sold out · tap when back':'In stock · tap if sold out')+'</button><button class="ic" data-a="delitem" title="Remove">🗑</button></div></div></div>'}).join("")+
    '<button class="add" data-a="additem" type="button">+ Add to this tank</button></section>'}).join("");
}
function collect(){return{sections:data.sections.map(function(s){return{name:s.name,note:s.note||"",items:s.items.map(function(it){return{name:it.name,price:it.price||"",note:it.note||"",qty:(it.qty===""||it.qty==null)?null:Number(it.qty),soldOut:!!it.soldOut,imageSrc:it.imageSrc||""}})}})}}
function save(now){clearTimeout(timer);status("Saving…");timer=setTimeout(function(){
  var body=collect();body.sections=body.sections.filter(function(s){return s.name.trim()});body.sections.forEach(function(s){s.items=s.items.filter(function(i){return i.name.trim()})});
  fetch(BASE+"/items",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(body)}).then(function(r){if(!r.ok)throw new Error("Save failed ("+r.status+")");return r.json()}).then(function(j){
    var open=document.getElementById("open");if(j.siteUrl){open.href=j.siteUrl;open.hidden=false}
    status("Saved ✓ "+new Date().toLocaleTimeString([], {hour:"numeric",minute:"2-digit"}),"saved")}).catch(function(e){status(e.message||"Couldn't save. Check your signal and try again.","err")})},now?0:700)}
function load(){fetch(BASE+"/data",{cache:"no-store"}).then(function(r){return r.json()}).then(function(j){data=j;var open=document.getElementById("open");if(j.siteUrl){open.href=j.siteUrl;open.hidden=false}render();status(j.updatedAt?"Last change "+j.updatedAt:"Ready")}).catch(function(){status("Couldn't load. Check your signal.","err")})}
m.addEventListener("input",function(e){var t=e.target;var sec=t.closest("[data-s]");if(!sec)return;var s=data.sections[+sec.dataset.s];var f=t.dataset.f;if(!f)return;if(f==="sname"){s.name=t.value;save();return}var it=s.items[+t.closest("[data-i]").dataset.i];if(f==="qty"){it.qty=t.value.trim()===""?null:Math.max(0,parseInt(t.value,10)||0)}else it[f]=t.value;save()});
m.addEventListener("click",function(e){var b=e.target.closest("[data-a]");if(!b||b.tagName==="INPUT")return;var sec=b.closest("[data-s]");var si=+sec.dataset.s;var s=data.sections[si];var a=b.dataset.a;
  if(a==="additem"){s.items.push({name:"",price:"",note:"",qty:null,soldOut:false,image:null,imageSrc:null});render();var last=sec&&m.querySelector('[data-s="'+si+'"] .item:last-of-type .nm');if(last)last.focus();return}
  var row=b.closest("[data-i]");var it=row?s.items[+row.dataset.i]:null;
  if(a==="sold"&&it){it.soldOut=!it.soldOut;render();save(true)}
  if(a==="delitem"&&it&&confirm("Remove "+(it.name||"this item")+" from the board?")){s.items.splice(+row.dataset.i,1);render();save(true)}
  if(a==="deltank"&&confirm("Remove the whole tank "+s.name+" and everything in it?")){data.sections.splice(si,1);render();save(true)}
  if(a==="up"&&si>0){data.sections.splice(si-1,0,data.sections.splice(si,1)[0]);render();save(true)}
  if(a==="down"&&si<data.sections.length-1){data.sections.splice(si+1,0,data.sections.splice(si,1)[0]);render();save(true)}
});
m.addEventListener("change",function(e){var t=e.target;if(t.dataset.a!=="photo"||!t.files||!t.files[0])return;var sec=t.closest("[data-s]");var s=data.sections[+sec.dataset.s];var it=s.items[+t.closest("[data-i]").dataset.i];if(!it.name.trim()){alert("Give it a name first, then add the photo.");return}
  status("Sending photo…");var f=t.files[0];var img=new Image();var url=URL.createObjectURL(f);img.onload=function(){var max=1600,w=img.width,h=img.height,k=Math.min(1,max/Math.max(w,h));var c=document.createElement("canvas");c.width=Math.round(w*k);c.height=Math.round(h*k);c.getContext("2d").drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);
    c.toBlob(function(blob){fetch(BASE+"/photo?section="+encodeURIComponent(s.name)+"&item="+encodeURIComponent(it.name)+"&w="+c.width+"&h="+c.height,{method:"POST",headers:{"content-type":"image/jpeg"},body:blob}).then(function(r){if(!r.ok)throw new Error("Photo failed ("+r.status+")");return r.json()}).then(function(j){it.image=j.image;it.imageSrc=j.imageSrc;render();status("Photo saved ✓","saved")}).catch(function(e){status(e.message,"err")})},"image/jpeg",0.85)};img.src=url});
document.getElementById("addTank").addEventListener("click",function(){var n=prompt("Tank or section name (e.g. Tank 12, Saltwater, Plants)");if(!n||!n.trim())return;data.sections.push({name:n.trim(),slug:"",note:"",items:[]});render();save(true);window.scrollTo(0,document.body.scrollHeight)});
load();
})();
</script></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex", "referrer-policy": "no-referrer", "content-security-policy": "default-src 'self'; img-src 'self' blob: data: https:; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'" } });
}


/**
 * `/d/<leadId>/<tank-slug>`: a full-screen, always-on page for a cheap tablet or TV by the tank. Reads the live feed every
 * 30 s (same data as the QR price page), keeps the screen awake, and with no slug rotates through every tank. Public like
 * the feed (no prices beyond what the QR label shows), noindex.
 */
export async function serveDisplay(env: Env, leadId: string, slug: string, origin: string): Promise<Response> {
  const lead = await getLead(env, leadId);
  const record = lead && recordOf(lead);
  if (!lead || !record || lead.status === "expired") return new Response("Not found", { status: 404 });
  const feed = pricesFeed(lead, record, origin);
  const tank = slug ? feed.sections.find((x) => x.slug === slug) : null;
  const title = tank ? `${tank.name} · ${record.name}` : `${feed.title} · ${record.name}`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>${escHtml(title)}</title>
<style>
:root{--bg:#0b1324;--ink:#f6f7fb;--muted:#9aa6bf;--gold:#fca311;--card:#141f38}
*{box-sizing:border-box}html,body{height:100%}body{margin:0;background:var(--bg);color:var(--ink);font:clamp(18px,2.6vw,30px)/1.3 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;cursor:none;overflow:hidden}
header{display:flex;justify-content:space-between;align-items:baseline;padding:2vh 3vw 1vh;gap:2vw}
h1{margin:0;font-size:clamp(28px,5vw,64px);line-height:1.1}
.shop{color:var(--muted);font-size:.75em;white-space:nowrap}
main{padding:0 3vw 3vh;height:calc(100% - 12vh);overflow:hidden}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,22em),1fr));gap:1.2vmin}
.it{display:grid;grid-template-columns:auto 1fr auto;gap:1em;align-items:center;background:var(--card);border-radius:1em;padding:.7em 1em}
.ph{width:3.4em;height:3.4em;border-radius:.7em;object-fit:cover;background:#1e2b4b}
.ph--none{display:grid;place-items:center;font-size:1.6em;opacity:.5}
.nm{font-weight:700;font-size:1.15em}.nt{color:var(--muted);font-size:.8em}
.pr{font-weight:800;font-size:1.5em;color:var(--gold);white-space:nowrap;text-align:right}
.left{display:block;font-size:.55em;color:var(--muted);font-weight:600}
.empty{color:var(--muted);font-size:1.3em;padding:10vh 0;text-align:center}
footer{position:fixed;left:0;right:0;bottom:0;display:flex;justify-content:space-between;padding:1vh 3vw;color:var(--muted);font-size:.6em}
.dots{display:flex;gap:.5em}.dots i{width:.6em;height:.6em;border-radius:50%;background:#2b3a5e}.dots i.on{background:var(--gold)}
</style></head><body>
<header><h1 id="h">${escHtml(tank ? tank.name : feed.title)}</h1><span class="shop">${escHtml(record.name)}</span></header>
<main id="m"><p class="empty">Loading…</p></main>
<footer><span id="u"></span><span class="dots" id="dots"></span></footer>
<script>
(function(){
var FEED=${JSON.stringify(`/l/${leadId}/prices.json`)},SLUG=${JSON.stringify(slug)},data=null,i=0,ROTATE=10000;
function esc(t){return String(t==null?"":t).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function pick(){if(!data)return null;if(SLUG){for(var k=0;k<data.sections.length;k++)if(data.sections[k].slug===SLUG)return data.sections[k];return{name:"",items:[]}}return data.sections.length?data.sections[i%data.sections.length]:null}
function render(){var s=pick();var m=document.getElementById("m"),h=document.getElementById("h"),d=document.getElementById("dots");
  if(!s){m.innerHTML='<p class="empty">Nothing on the board yet.</p>';return}
  if(s.name)h.textContent=s.name;
  m.innerHTML=s.items.length?'<div class="grid">'+s.items.map(function(it){var left=it.qty!=null&&it.qty<=5?'<span class="left">'+it.qty+' left</span>':'';
    return '<div class="it">'+(it.image?'<img class="ph" src="'+esc(it.image)+'" alt="">':'<div class="ph ph--none">🐟</div>')+'<div><div class="nm">'+esc(it.name)+'</div>'+(it.note?'<div class="nt">'+esc(it.note)+'</div>':'')+'</div><div class="pr">'+esc(it.price||"Ask")+left+'</div></div>'}).join("")+'</div>':'<p class="empty">Sold out for now. Ask us what\'s coming.</p>';
  d.innerHTML=SLUG||data.sections.length<2?"":data.sections.map(function(_,k){return '<i'+(k===i%data.sections.length?' class="on"':'')+'></i>'}).join("");
  document.getElementById("u").textContent=data.updatedAt?"Updated "+data.updatedAt:"";}
function load(){fetch(FEED,{cache:"no-store"}).then(function(r){return r.json()}).then(function(j){data=j;render()}).catch(function(){})}
load();setInterval(load,30000);
if(!SLUG)setInterval(function(){i++;render()},ROTATE);
function wake(){if(navigator.wakeLock)navigator.wakeLock.request("screen").catch(function(){})}
wake();document.addEventListener("visibilitychange",function(){if(!document.hidden)wake()});
})();
</script></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex", "content-security-policy": "default-src 'self'; img-src 'self' https: data:; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'" } });
}
